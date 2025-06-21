# /api/modules/qc_logic.py
import os
import json
import lasio
import pandas as pd
import numpy as np
import io 

def add_markers_to_df(df, well_name, all_markers_df, logger):
    """Adds markers to the DataFrame, logging progress."""
    df['Marker'] = None
    well_name_cleaned = well_name.strip()
    logger.info(f"[Markers] 🕵️ Starting marker search for Well: '{well_name_cleaned}'")

    if all_markers_df.empty:
        logger.warning("[Markers] ⚠️ The marker data is empty.")
        return False
        
    try:
        well_markers = all_markers_df[all_markers_df['Well identifier_cleaned'] == well_name_cleaned.upper()].copy()

        if well_markers.empty:
            logger.warning(f"  [Markers] ❌ No markers found for well '{well_name_cleaned}'.")
            return False

        logger.info(f"  [Markers] ✅ Found {len(well_markers)} marker entries for '{well_name_cleaned}'.")
        well_markers.sort_values(by='MD', inplace=True)
        
        last_depth = 0.0
        for _, marker_row in well_markers.iterrows():
            current_depth = marker_row['MD']
            surface_name = str(marker_row['Surface'])
            mask = (df['DEPTH'] >= last_depth) & (df['DEPTH'] < current_depth)
            df.loc[mask, 'Marker'] = surface_name
            last_depth = current_depth

        if not well_markers.empty:
            last_marker = well_markers.iloc[-1]
            df.loc[df['DEPTH'] >= last_marker['MD'], 'Marker'] = str(last_marker['Surface'])

        logger.info(f"  [Markers] ✅ Marker assignment complete.")
        return True
    except Exception as e:
        logger.error(f"  [Markers] ❌ An unexpected error occurred: {e}", exc_info=True)
        return False

def check_extreme_values(df, column):
    if pd.api.types.is_numeric_dtype(df[column]) and not df[column].isna().all():
        mean, std = df[column].mean(), df[column].std()
        if std == 0: return False
        # Using a mask to check for extreme values is more efficient
        mask = (df[column] > mean + 3 * std) | (df[column] < mean - 3 * std)
        return mask.any()
    return False

# This is the main refactored function
def run_quality_control(files_data: list, logger):
    """
    Processes a list of in-memory files (LAS and CSV) and returns QC results.
    
    Args:
        files_data (list): A list of dictionaries, e.g., [{'name': 'file.las', 'content': '...'}].
        logger: A logger instance for logging progress and errors.
    """
    qc_results = []
    output_files = {}
    required_logs = ['GR', 'NPHI', 'RT', 'RHOB']
    skip_files_lower = ['abb-032.las', 'abb-033.las', 'abb-059.las']

    # --- Marker File Loading and Cleaning from memory ---
    all_markers_df = pd.DataFrame()
    for file_info in files_data:
        if file_info['name'].lower().endswith('.csv') and 'marker' in file_info['name'].lower():
            try:
                # Use io.StringIO to read the file content string as a file
                marker_content = io.StringIO(file_info['content'])
                df_marker = pd.read_csv(marker_content, sep='[;,]', engine='python', on_bad_lines='skip')
                if all(col in df_marker.columns for col in ['Well identifier', 'MD', 'Surface']):
                    all_markers_df = pd.concat([all_markers_df, df_marker], ignore_index=True)
            except Exception as e:
                logger.warning(f"Could not read marker file '{file_info['name']}'. Error: {e}")
    
    if not all_markers_df.empty:
        logger.info("[Markers] Cleaning and preparing marker data...")
        all_markers_df['Well identifier_cleaned'] = all_markers_df['Well identifier'].str.strip().str.upper()
        if all_markers_df['MD'].dtype == object:
            all_markers_df['MD'] = pd.to_numeric(all_markers_df['MD'].str.replace(',', '.', regex=False), errors='coerce')
        all_markers_df.dropna(subset=['MD', 'Well identifier_cleaned'], inplace=True)
        all_markers_df['Surface'] = all_markers_df['Surface'].astype(str)
        logger.info(f"[Markers] Marker data cleaned. {len(all_markers_df)} valid rows loaded.")

    # --- LAS File Processing from memory ---
    las_files = [f for f in files_data if f['name'].lower().endswith('.las')]
    for file_info in las_files:
        filename = file_info['name']
        if filename.lower() in skip_files_lower:
            logger.info(f"--- SKIPPING: {filename} ---")
            continue
            
        well_name = os.path.splitext(filename)[0]
        status = "PASS"
        details = {}
        try:
            logger.info(f"--- [Processing] START: {filename} ---")
            # Use io.StringIO to read the file content string as a file
            las_content = io.StringIO(file_info['content'])
            las = lasio.read(las_content)
            df = las.df().reset_index()
            df.rename(columns=lambda c: c.upper(), inplace=True)
            column_mapping = { 'DEPT': 'DEPTH', 'ILD': 'RT', 'LLD': 'RT', 'RESD': 'RT', 'RHOZ': 'RHOB', 'DENS': 'RHOB', 'TNPH': 'NPHI', 'GR_CAL': 'GR' }
            df.rename(columns=column_mapping, inplace=True)
            
            if 'DEPTH' not in df.columns: raise ValueError("DEPTH column not found after mapping.")
            df['DEPTH'] = pd.to_numeric(df['DEPTH'], errors='coerce')
            df.dropna(subset=['DEPTH'], inplace=True)

            # --- The rest of the QC logic is largely the same ---
            details['missing_columns'] = [log for log in required_logs if log not in df.columns]
            if details['missing_columns']:
                status = "MISSING_LOGS"
                qc_results.append({'well_name': well_name, 'status': status, 'details': ', '.join(details['missing_columns'])})
                output_files[f"{well_name}_{status}.csv"] = df.to_csv(index=False)
                continue

            for col in required_logs: df[col] = df[col].replace([-999.0, -999.25], np.nan)
            
            has_markers = add_markers_to_df(df, well_name, all_markers_df, logger)
            
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
            logger.error(f"Error processing {filename}: {e}", exc_info=True)
            qc_results.append({'well_name': well_name, 'status': 'ERROR', 'details': str(e)})

    # Return a dictionary, which will be converted to JSON by Flask
    return {'qc_summary': qc_results, 'output_files': output_files}