# Trimming data
valid_index = {}
for col in required_columns:
    valid_index[col] = df[(df[col] != -999.0) & (~df[col].isna())].index

# Trim data sesuai semua log yang valid
start_idx = min(idx.min() for idx in valid_index.values())
end_idx = max(idx.max() for idx in valid_index.values())
trimmed_df = df.loc[start_idx:end_idx].copy()
