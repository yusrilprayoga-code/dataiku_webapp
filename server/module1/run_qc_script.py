import sys
import os
import json
import lasio
import pandas as pd
import numpy as np
import tempfile
import zipfile
import time 

def check_extreme_values(df, column):
    """Checks for extreme values using the 3-sigma method."""
    if pd.api.types.is_numeric_dtype(df[column]) and not df[column].isna().all():
        mean = df[column].mean()
        std = df[column].std()
        if std == 0: return False
        extremes = df[(df[column] > mean + 3 * std) | (df[column] < mean - 3 * std)]
        return len(extremes) > 0
    return False

def add_markers_to_df(df, well_name, all_markers_df):
    print(f"      [Markers] Starting marker processing for {well_name}", file=sys.stderr)
    """Adds a 'MARKER' column to the LAS DataFrame based on matching well markers."""
    df['MARKER'] = None
    if all_markers_df.empty:
        return False

    well_markers = all_markers_df[all_markers_df['Well identifier'] == well_name]
    if well_markers.empty:
        # Fallback to check partial name match if no exact match found
        well_prefix = well_name.split('-')[0] if '-' in well_name else well_name
        well_markers = all_markers_df[all_markers_df['Well identifier'].str.contains(well_prefix, na=False)]

    if well_markers.empty:
        print(f"      [Markers] No matching markers found for {well_name}", file=sys.stderr)        
        return False

    well_markers = well_markers.copy()
    if well_markers['MD'].dtype == object:
        well_markers['MD'] = well_markers['MD'].str.replace(',', '.', regex=False).astype(float)
    
    well_markers = well_markers.sort_values(by='MD').reset_index(drop=True)

    min_depth, max_depth = df['DEPTH'].min(), df['DEPTH'].max()

    for i in range(len(well_markers)):
        current_marker = well_markers.iloc[i]
        start_depth = current_marker['MD']
        end_depth = well_markers.iloc[i + 1]['MD'] if i + 1 < len(well_markers) else np.inf
        
        mask = (df['DEPTH'] >= start_depth) & (df['DEPTH'] < end_depth)
        df.loc[mask, 'MARKER'] = current_marker['Surface']
        
    print(f"      [Markers] Finished marker processing for {well_name}", file=sys.stderr)
    return not df['MARKER'].isna().all()

def process_files(input_dir):
    """Main processing function."""
    qc_results = []
    output_files = {}
    required_logs = ['GR', 'NPHI', 'RT', 'RHOB']
    
    all_las_files = [f for f in os.listdir(input_dir) if f.lower().endswith('.las')]
    total_files = len(all_las_files)
    print(f"Found {total_files} LAS files to process in {input_dir}", file=sys.stderr)
    sys.stderr.flush()

    # --- Consolidate all marker data into one DataFrame first ---
    all_markers_df = pd.DataFrame()
    for item in os.listdir(input_dir):
        if item.lower().endswith('.csv'):
            try:
                df_marker = pd.read_csv(os.path.join(input_dir, item), sep='[;,]', engine='python', on_bad_lines='skip')
                if 'Well identifier' in df_marker.columns:
                    all_markers_df = pd.concat([all_markers_df, df_marker], ignore_index=True)
            except Exception:
                pass # Silently ignore failing marker files
    
    print(f"Consolidated {len(all_markers_df)} total rows from marker files.", file=sys.stderr)
    sys.stderr.flush()

    skip_files = ['ABB-032.LAS', 'ABB-033.LAS', 'ABB-059.las']
    # Convert to lowercase for case-insensitive comparison
    skip_files_lower = [f.lower() for f in skip_files]

    file_counter = 0
    # Use the all_las_files list you created earlier
    for filename in all_las_files:
        
        # VV ADD THIS CHECK AT THE BEGINNING OF THE LOOP VV
        if filename.lower() in skip_files_lower:
            print(f"\n--- SKIPPING: {filename} is in the skip list. ---", file=sys.stderr)
            sys.stderr.flush()
            continue # Move to the next file

        file_counter += 1
        start_time = time.time()
        print(f"\n--- [File {file_counter}/{total_files}] START: Processing {filename} ---", file=sys.stderr)
        sys.stderr.flush()

        well_name = os.path.splitext(filename)[0]
        file_path = os.path.join(input_dir, filename)
        
        status = "PASS"
        details = { 'missing_columns': [], 'null_columns': [], 'extreme_columns': [] }
        
        try:
            # Step A: Reading LAS file
            las = lasio.read(file_path)
            df = las.df().reset_index()
            print(f"    -> Read LAS file. Shape: {df.shape}. Time: {time.time() - start_time:.2f}s", file=sys.stderr)
            sys.stderr.flush()

            # Step B: Column Mapping
            df.rename(columns=lambda c: c.upper(), inplace=True)
            column_mapping = { 'DEPT': 'DEPTH', 'ILD': 'RT', 'LLD': 'RT', 'RESD': 'RT', 'RHOZ': 'RHOB', 'DENS': 'RHOB', 'TNPH': 'NPHI', 'GR_CAL': 'GR' }
            df.rename(columns=column_mapping, inplace=True)
            
            # 1. Check for missing logs
            details['missing_columns'] = [log for log in required_logs if log not in df.columns]
            if details['missing_columns']:
                status = "MISSING_LOGS"
                qc_results.append({'well_name': well_name, 'status': status, 'details': ', '.join(details['missing_columns'])})
                output_files[f"{well_name}_{status}.csv"] = df.to_csv(index=False)
                continue

            # Trim -999 values before further checks
            for col in required_logs:
                df[col] = df[col].replace(-999.0, np.nan)

            # Add markers to define the zone of interest
            has_markers = add_markers_to_df(df, well_name, all_markers_df)
            
            zone_df = df.dropna(subset=['MARKER']) if has_markers else df
            if zone_df.empty:
                zone_df = df # Fallback to all data if no markers are in range
            
            # 2. Check for nulls
            details['null_columns'] = [log for log in required_logs if zone_df[log].isna().any()]
            if details['null_columns']:
                status = "HAS_NULL"
                qc_results.append({'well_name': well_name, 'status': status, 'details': ', '.join(details['null_columns'])})
                output_files[f"{well_name}_{status}.csv"] = df.to_csv(index=False)
                continue

            # 3. Check for extreme values
            details['extreme_columns'] = [log for log in required_logs if check_extreme_values(zone_df, log)]
            if details['extreme_columns']:
                status = "EXTREME_VALUES"
                qc_results.append({'well_name': well_name, 'status': status, 'details': ', '.join(details['extreme_columns'])})
                output_files[f"{well_name}_{status}.csv"] = df.to_csv(index=False)
                continue
            
            # If all checks pass
            qc_results.append({'well_name': well_name, 'status': status, 'details': 'All checks passed'})
            output_files[f"{well_name}_{status}.csv"] = df.to_csv(index=False)

            # Step Z: Finishing up
            end_time = time.time()
            total_time = end_time - start_time
            print(f"--- [File {file_counter}/{total_files}] END: Finished {filename} in {total_time:.2f}s. Final Status: {status} ---", file=sys.stderr)
            sys.stderr.flush()

        except Exception as e:
            end_time = time.time()
            total_time = end_time - start_time
            print(f"--- [File {file_counter}/{total_files}] ERROR after {total_time:.2f}s for {filename}: {e} ---", file=sys.stderr)
            sys.stderr.flush()
            qc_results.append({'well_name': well_name, 'status': 'ERROR', 'details': str(e)})
            continue
            
    # --- Prepare final JSON output ---
    final_output = {
        'qc_summary': qc_results,
        'output_files': output_files
    }
    print(json.dumps(final_output))

if __name__ == "__main__":
    input_directory = sys.argv[1]
    process_files(input_directory)