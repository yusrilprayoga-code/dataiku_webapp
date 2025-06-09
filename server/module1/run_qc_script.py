# run_qc_script.py
import sys
import os
import json
import re
import lasio
import pandas as pd
import numpy as np
import traceback

def add_markers_to_df(df, well_name, all_markers_df):
    """
    [FINAL VERSION] Adds markers by matching cleaned well names and using robust interval logic.
    """
    df['Marker'] = None
    
    # Clean the incoming well name from the LAS file by stripping whitespace
    well_name_cleaned = well_name.strip()
    
    print(f"\n[Markers] 🕵️  Starting marker search for Well: '{well_name_cleaned}'", file=sys.stderr)

    if all_markers_df.empty:
        print(f"  [Markers] ⚠️ Warning: The marker data is empty.", file=sys.stderr)
        return False
        
    try:
        # Perform a case-insensitive match on the CLEANED well names
        well_markers = all_markers_df[all_markers_df['Well identifier_cleaned'] == well_name_cleaned.upper()].copy()

        if well_markers.empty:
            print(f"  [Markers] ❌ No markers found for well '{well_name_cleaned}'.", file=sys.stderr)
            return False

        print(f"  [Markers] ✅ Found {len(well_markers)} marker entries for '{well_name_cleaned}'.", file=sys.stderr)

        # The 'MD' and 'Surface' columns should already be cleaned from the main function
        well_markers.sort_values(by='MD', inplace=True)
        
        # --- Simplified and Corrected Interval Logic ---
        last_depth = 0.0
        for i, marker_row in well_markers.iterrows():
            current_depth = marker_row['MD']
            surface_name = str(marker_row['Surface'])
            
            mask = (df['DEPTH'] >= last_depth) & (df['DEPTH'] < current_depth)
            df.loc[mask, 'Marker'] = surface_name
            last_depth = current_depth # Update for the next interval

        # Apply the last marker to all remaining depths
        if not well_markers.empty:
            last_marker = well_markers.iloc[-1]
            df.loc[df['DEPTH'] >= last_marker['MD'], 'Marker'] = str(last_marker['Surface'])

        print(f"  [Markers] ✅ Marker assignment complete.", file=sys.stderr)
        return True

    except Exception as e:
        print(f"  [Markers] ❌ An unexpected error occurred: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return False

def check_extreme_values(df, column):
    if pd.api.types.is_numeric_dtype(df[column]) and not df[column].isna().all():
        mean, std = df[column].mean(), df[column].std()
        if std == 0: return False
        return len(df[(df[column] > mean + 3 * std) | (df[column] < mean - 3 * std)]) > 0
    return False

def process_files(input_dir):
    qc_results = []
    output_files = {}
    required_logs = ['GR', 'NPHI', 'RT', 'RHOB']
    skip_files = ['ABB-032.LAS', 'ABB-033.LAS', 'ABB-059.las']
    skip_files_lower = [f.lower() for f in skip_files]

    # --- Marker File Loading and **CLEANING** ---
    all_markers_df = pd.DataFrame()
    for item in os.listdir(input_dir):
        if item.lower().endswith('.csv') and 'marker' in item.lower():
            try:
                df_marker = pd.read_csv(os.path.join(input_dir, item), sep='[;,]', engine='python', on_bad_lines='skip')
                if all(col in df_marker.columns for col in ['Well identifier', 'MD', 'Surface']):
                    all_markers_df = pd.concat([all_markers_df, df_marker], ignore_index=True)
            except Exception as e:
                print(f"  [Markers] ⚠️ Warning: Could not read marker file '{item}'. Error: {e}", file=sys.stderr)

    # --- CRUCIAL DATA CLEANING STEP ---
    if not all_markers_df.empty:
        print("  [Markers] Cleaning and preparing marker data...", file=sys.stderr)
        # 1. Create a new, clean column for matching by stripping whitespace and converting to uppercase
        all_markers_df['Well identifier_cleaned'] = all_markers_df['Well identifier'].str.strip().str.upper()
        # 2. Clean the MD and Surface columns once
        if all_markers_df['MD'].dtype == object:
            all_markers_df['MD'] = pd.to_numeric(all_markers_df['MD'].str.replace(',', '.', regex=False), errors='coerce')
        all_markers_df.dropna(subset=['MD', 'Well identifier_cleaned'], inplace=True)
        all_markers_df['Surface'] = all_markers_df['Surface'].astype(str)
        print(f"  [Markers] ✅ Marker data cleaned. {len(all_markers_df)} valid rows loaded.", file=sys.stderr)
    
    # --- Corrected Debugging Overview ---
    print("\n" + "="*50, file=sys.stderr)
    print("--- DEBUGGING: DATA OVERVIEW ---", file=sys.stderr)
    if not all_markers_df.empty:
        marker_well_names = all_markers_df['Well identifier_cleaned'].dropna().unique().tolist()
        print(f"Found {len(marker_well_names)} unique, cleaned well identifiers in Marker files:", file=sys.stderr)
        print(sorted(marker_well_names), file=sys.stderr)
    else:
        print("No marker data was loaded.", file=sys.stderr)
    all_las_files = [f for f in os.listdir(input_dir) if f.lower().endswith('.las')]
    las_well_names = [os.path.splitext(f)[0] for f in all_las_files]
    print(f"\nFound {len(las_well_names)} LAS files to process:", file=sys.stderr)
    print(sorted(las_well_names), file=sys.stderr)
    print("--- END OF DATA OVERVIEW ---", file=sys.stderr)
    print("="*50 + "\n", file=sys.stderr)
    sys.stderr.flush()

    for filename in all_las_files:
        if filename.lower() in skip_files_lower:
            print(f"\n--- SKIPPING: {filename} ---", file=sys.stderr)
            continue
            
        well_name = os.path.splitext(filename)[0]
        file_path = os.path.join(input_dir, filename)
        status = "PASS"
        details = {}
        try:
            print(f"\n--- [Processing] START: {filename} ---", file=sys.stderr)
            las = lasio.read(file_path)
            df = las.df().reset_index()
            df.rename(columns=lambda c: c.upper(), inplace=True)
            column_mapping = { 'DEPT': 'DEPTH', 'ILD': 'RT', 'LLD': 'RT', 'RESD': 'RT', 'RHOZ': 'RHOB', 'DENS': 'RHOB', 'TNPH': 'NPHI', 'GR_CAL': 'GR' }
            df.rename(columns=column_mapping, inplace=True)
            
            if 'DEPTH' not in df.columns: raise ValueError("DEPTH column not found after mapping.")
            df['DEPTH'] = pd.to_numeric(df['DEPTH'], errors='coerce')
            df.dropna(subset=['DEPTH'], inplace=True)

            details['missing_columns'] = [log for log in required_logs if log not in df.columns]
            if details['missing_columns']:
                status = "MISSING_LOGS"
                qc_results.append({'well_name': well_name, 'status': status, 'details': ', '.join(details['missing_columns'])})
                output_files[f"{well_name}_{status}.csv"] = df.to_csv(index=False)
                continue

            for col in required_logs: df[col] = df[col].replace(-999.0, np.nan)
            
            # Call the marker function, which now uses the cleaned data
            has_markers = add_markers_to_df(df, well_name, all_markers_df)
            
            zone_df = df.dropna(subset=['MARKER']) if has_markers and not df['MARKER'].isna().all() else df
            if zone_df.empty: zone_df = df
            
            details['null_columns'] = [log for log in required_logs if zone_df[log].isna().any()]
            if details['null_columns']:
                status = "HAS_NULL"
                qc_results.append({'well_name': well_name, 'status': status, 'details': ', '.join(details['null_columns'])})
                output_files[f"{well_name}_{status}.csv"] = df.to_csv(index=False)
                continue

            details['extreme_columns'] = [log for log in required_logs if check_extreme_values(zone_df, log)]
            if details['extreme_columns']:
                status = "EXTREME_VALUES"
                qc_results.append({'well_name': well_name, 'status': status, 'details': ', '.join(details['extreme_columns'])})
                output_files[f"{well_name}_{status}.csv"] = df.to_csv(index=False)
                continue
            
            qc_results.append({'well_name': well_name, 'status': status, 'details': 'All checks passed'})
            output_files[f"{well_name}_{status}.csv"] = df.to_csv(index=False)

        except Exception as e:
            qc_results.append({'well_name': well_name, 'status': 'ERROR', 'details': str(e)})

    final_output = {'qc_summary': qc_results, 'output_files': output_files}
    print(json.dumps(final_output))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_directory = sys.argv[1]
        process_files(input_directory)
    else:
        print("Error: Please provide a directory path as an argument.", file=sys.stderr)
        sys.exit(1)