# /api/modules/data_utils.py
import pandas as pd
import io

def handle_null_values(csv_content: str) -> str:
    """
    Reads CSV content, fills nulls using linear interpolation,
    and returns the cleaned CSV content.
    Raises an exception if an error occurs.
    """
    # Use io.StringIO to read the string content as if it were a file
    csv_file_like_object = io.StringIO(csv_content)
    
    df = pd.read_csv(csv_file_like_object)
    
    # Identify numeric columns to interpolate
    numeric_cols = df.select_dtypes(include='number').columns
    
    if not numeric_cols.empty:
        # Fill nulls using linear interpolation
        df[numeric_cols] = df[numeric_cols].interpolate(method='linear', limit_direction='both', axis=0)
    
    # Fill any remaining nulls (e.g., in non-numeric columns) with a placeholder
    df.fillna('NA', inplace=True)
        
    # Convert the cleaned DataFrame back to a CSV string
    cleaned_csv_content = df.to_csv(index=False)
    
    return cleaned_csv_content