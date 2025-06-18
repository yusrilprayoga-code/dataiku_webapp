# handle_nulls_script.py
import sys
import pandas as pd
import io
import traceback # Import traceback for detailed error logging

def handle_null_values(csv_content):
    """
    Reads CSV content, fills nulls using linear interpolation, and returns the cleaned CSV content.
    """
    try:
        # Use io.StringIO to read the string content as if it were a file
        csv_file_like_object = io.StringIO(csv_content)
        
        # This is often where errors happen if the CSV format is unexpected
        df = pd.read_csv(csv_file_like_object)
        
        # Identify numeric columns to interpolate
        numeric_cols = df.select_dtypes(include='number').columns
        
        if not numeric_cols.empty:
            # For each numeric column, fill nulls using linear interpolation
            # This method fills based on the trend of the data around the null value.
            df[numeric_cols] = df[numeric_cols].interpolate(method='linear', limit_direction='both', axis=0)
        
        # After interpolation, you might still have nulls in non-numeric columns
        # or at the very start/end if there's no data to interpolate from.
        # We can fill these with a placeholder.
        df.fillna('NA', inplace=True)
            
        # Convert the cleaned DataFrame back to a CSV string
        cleaned_csv_content = df.to_csv(index=False)
        
        return cleaned_csv_content

    except Exception as e:
        # If any error occurs, print a detailed traceback to stderr
        # This will be sent back to the Next.js server terminal for debugging
        print(f"Error in handle_nulls_script.py: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        # Exit with a non-zero code to indicate failure
        sys.exit(1)


if __name__ == "__main__":
    input_csv = sys.stdin.read()
    cleaned_data = handle_null_values(input_csv)
    # If successful, print the final cleaned data to standard output
    print(cleaned_data)