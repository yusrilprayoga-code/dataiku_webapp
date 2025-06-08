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
    """
    [Your custom logic] Menambahkan kolom marker ke DataFrame berdasarkan file marker yang sesuai.
    """
    # Inisialisasi kolom marker dengan None
    df['Marker'] = None
    print(f"\n[Markers] 🕵️  Starting custom marker search for Well: '{well_name}'", file=sys.stderr)

    if all_markers_df.empty:
        print(f"  [Markers] ⚠️ Warning: The main marker DataFrame is empty. Cannot apply any markers.", file=sys.stderr)
        return False
        
    try:
        # Filter marker hanya untuk sumur yang sedang diproses (case-insensitive)
        well_markers = all_markers_df[all_markers_df['Well identifier'].str.upper() == well_name.upper()]

        if well_markers.empty:
            print(f"  [Markers] No exact name match for '{well_name}'. Trying partial prefix match...", file=sys.stderr)
            well_prefix = well_name.split('-')[0].upper() if '-' in well_name else well_name.upper()
            well_markers = all_markers_df[all_markers_df['Well identifier'].str.upper().str.contains(well_prefix, na=False)]

        if not well_markers.empty:
            print(f"  [Markers] ✅ Ditemukan {len(well_markers)} marker untuk sumur {well_name}", file=sys.stderr)
            well_markers = well_markers.copy()

            # Handle jika format angka pakai koma decimal
            if well_markers['MD'].dtype == object:
                well_markers['MD'] = pd.to_numeric(well_markers['MD'].str.replace(',', '.', regex=False), errors='coerce')
            
            well_markers.dropna(subset=['MD'], inplace=True)
            well_markers = well_markers.sort_values(by='MD').reset_index(drop=True)
            
            if well_markers.empty:
                print(f"  [Markers] ❌ No valid numeric markers remain for '{well_name}' after cleaning.", file=sys.stderr)
                return False

            min_depth = df['DEPTH'].min()
            max_depth = df['DEPTH'].max()
            print(f"  [Markers] 🔍 Debug - Data depth range: {min_depth:.2f} - {max_depth:.2f}", file=sys.stderr)
            
            markers_in_range = well_markers[(well_markers['MD'] >= min_depth) & (well_markers['MD'] <= max_depth)].copy()
            markers_before_data = well_markers[well_markers['MD'] < min_depth]
            relevant_markers = pd.DataFrame()

            if len(markers_in_range) == 0 and len(markers_before_data) > 0:
                relevant_markers = markers_before_data.iloc[-1:].copy()
                print(f"  [Markers] 🔍 No markers in data range, using last marker before data starts.", file=sys.stderr)
            elif len(markers_before_data) > 0:
                last_marker_before = markers_before_data.iloc[-1:].copy()
                relevant_markers = pd.concat([last_marker_before, markers_in_range]).reset_index(drop=True)
                print(f"  [Markers] 🔍 Using last marker before data + markers in range.", file=sys.stderr)
            else:
                relevant_markers = markers_in_range
                print(f"  [Markers] 🔍 Using only markers within data range.", file=sys.stderr)

            if len(relevant_markers) == 0:
                print(f"  [Markers] ⚠️ Tidak ada marker yang berada dalam range depth data LAS ({min_depth} - {max_depth})", file=sys.stderr)
                return False

            print(f"  [Markers] 🔍 Debug - Relevant markers: {len(relevant_markers)}", file=sys.stderr)

            first_marker_before_data = not relevant_markers.empty and relevant_markers.iloc[0]['MD'] < min_depth

            for i in range(len(relevant_markers)):
                current_marker_surface = relevant_markers.iloc[i]['Surface']
                current_depth = relevant_markers.iloc[i]['MD']

                if i == 0 and first_marker_before_data:
                    next_depth = relevant_markers.iloc[i+1]['MD'] if len(relevant_markers) > 1 else np.inf
                    mask = (df['DEPTH'] >= min_depth) & (df['DEPTH'] < next_depth)
                else:
                    next_depth = relevant_markers.iloc[i+1]['MD'] if i + 1 < len(relevant_markers) else np.inf
                    mask = (df['DEPTH'] >= current_depth) & (df['DEPTH'] < next_depth)
                
                df.loc[mask, 'Marker'] = current_marker_surface
                print(f"    -> Assigned '{current_marker_surface}' to {mask.sum()} rows.", file=sys.stderr)

            unique_markers = df['Marker'].dropna().unique()
            print(f"  [Markers] ✅ Marker assignment complete. Unique markers in data: {list(unique_markers)}", file=sys.stderr)
            return True

    except Exception as e:
        print(f"  [Markers] ❌ Error saat menambahkan marker: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)

    print(f"  [Markers] ⚠️ Tidak ada data marker yang sesuai untuk sumur {well_name}", file=sys.stderr)
    return False

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