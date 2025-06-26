# Nama file: gsa_service.py
# Deskripsi: Modul terpusat untuk kalkulasi dan plotting GSA (RGSA, NGSA, DGSA).

import lasio
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from scipy.interpolate import interp1d
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os


def _normalize(series):
    """(Internal) Menormalkan data. Mencegah pembagian dengan nol."""
    std_dev = np.std(series)
    if std_dev == 0:
        return np.zeros_like(series)
    return (series - np.mean(series)) / std_dev


def _interpolate_coeffs(depth, coeff_df):
    """(Internal) Melakukan interpolasi linear pada koefisien regresi."""
    if coeff_df.empty:
        return np.array([np.nan, np.nan, np.nan, np.nan])

    if depth <= coeff_df['depth'].min():
        return coeff_df.iloc[0][['b0', 'b1', 'b2', 'b3']].values
    if depth >= coeff_df['depth'].max():
        return coeff_df.iloc[-1][['b0', 'b1', 'b2', 'b3']].values

    lower = coeff_df[coeff_df['depth'] <= depth].iloc[-1]
    upper = coeff_df[coeff_df['depth'] > depth].iloc[0]
    weight = (depth - lower['depth']) / (upper['depth'] - lower['depth'])
    row = lower + weight * (upper - lower)
    return row[['b0', 'b1', 'b2', 'b3']].values


def calculate_gsa_log(df_input: pd.DataFrame,
                      ref_log: str,
                      target_log: str,
                      output_log_name: str,
                      filters: dict,
                      window_size: int = 106,
                      step: int = 20,
                      min_points_in_window: int = 30) -> pd.DataFrame:
    """
    Fungsi generik untuk menghitung baseline log (GSA) menggunakan sliding window regression.

    Args:
        df_input (pd.DataFrame): DataFrame yang berisi kolom 'Depth', ref_log, dan target_log.
        ref_log (str): Nama kolom log referensi (misalnya, 'GR').
        target_log (str): Nama kolom log target yang akan diregresi (misalnya, 'ILD', 'NPHI').
        output_log_name (str): Nama kolom baru untuk menyimpan hasil (misalnya, 'RGSA', 'NGSA').
        filters (dict): Kamus berisi filter untuk setiap log, contoh: {'GR': (5, 180), 'ILD': (0.2, 2000)}.
        window_size (int): Ukuran jendela geser.
        step (int): Langkah pergeseran jendela.
        min_points_in_window (int): Jumlah minimum titik data valid dalam jendela.

    Returns:
        pd.DataFrame: DataFrame asli dengan tambahan kolom hasil GSA.
    """
    df_gsa = df_input[['Depth', ref_log, target_log]].dropna().copy()
    coeffs = []

    print(f"Memulai kalkulasi {output_log_name}...")
    for start in range(0, len(df_gsa) - window_size, step):
        window = df_gsa.iloc[start:start+window_size]

        # Terapkan filter dinamis
        mask = pd.Series(True, index=window.index)
        for log, (min_val, max_val) in filters.items():
            mask &= (window[log] > min_val) & (window[log] < max_val)

        window_filtered = window[mask]

        if len(window_filtered) < min_points_in_window:
            continue

        ref_vals = window_filtered[ref_log].values
        target_vals = window_filtered[target_log].values

        ref_scaled = 0.01 * ref_vals
        X = np.vstack([ref_scaled, ref_scaled**2, ref_scaled**3]).T
        y = np.log10(target_vals) if output_log_name == 'RGSA' else target_vals

        model = LinearRegression().fit(X, y)

        coeffs.append({
            'depth': window['Depth'].mean(),
            'b0': model.intercept_, 'b1': model.coef_[0],
            'b2': model.coef_[1], 'b3': model.coef_[2]
        })

    if not coeffs:
        print(
            f"Peringatan: Tidak ada koefisien yang bisa dihitung untuk {output_log_name}. Mengembalikan DataFrame tanpa perubahan.")
        df_input[output_log_name] = np.nan
        return df_input

    coeff_df = pd.DataFrame(coeffs)

    gsa_list = []
    for _, row in df_gsa.iterrows():
        depth, ref_val = row['Depth'], row[ref_log]

        if not (filters[ref_log][0] < ref_val < filters[ref_log][1]):
            gsa_list.append(np.nan)
            continue

        b0, b1, b2, b3 = _interpolate_coeffs(depth, coeff_df)
        grfix = 0.01 * ref_val
        log_gsa_val = b0 + b1*grfix + b2*grfix**2 + b3*grfix**3

        gsa_val = 10**log_gsa_val if output_log_name == 'RGSA' else log_gsa_val
        gsa_list.append(gsa_val)

    df_gsa[output_log_name] = gsa_list

    return pd.merge(df_input, df_gsa[['Depth', output_log_name]], on='Depth', how='left')


def plot_gsa_results(df: pd.DataFrame, ref_log: str, target_log: str, gsa_log: str):
    """
    Membuat plot multi-panel untuk memvisualisasikan hasil GSA.
    """
    fig = make_subplots(
        rows=1, cols=3, shared_yaxes=True,
        subplot_titles=(f"1. {ref_log}",
                        f"2. {target_log} vs {gsa_log}", "3. Anomaly")
    )

    # Panel 1: Log Referensi (GR)
    fig.add_trace(go.Scattergl(
        x=df[ref_log], y=df['Depth'], name=ref_log, line=dict(color='green')
    ), row=1, col=1)

    # Panel 2: Log Target vs. Hasil GSA
    fig.add_trace(go.Scattergl(
        x=df[target_log], y=df['Depth'], name=target_log, line=dict(
            color='blue')
    ), row=1, col=2)
    fig.add_trace(go.Scattergl(
        x=df[gsa_log], y=df['Depth'], name=gsa_log, line=dict(
            color='red', dash='dash')
    ), row=1, col=2)

    # Arsiran untuk anomali
    is_resistive_or_gas = (df[target_log] > df[gsa_log]) if gsa_log == 'RGSA' else (
        df[target_log] < df[gsa_log])
    fill_color = 'rgba(255,165,0,0.3)' if gsa_log == 'RGSA' else 'rgba(0,255,255,0.3)'

    fig.add_trace(go.Scattergl(
        x=df[target_log], y=df['Depth'], showlegend=False, line=dict(width=0),
        hoverinfo='none'
    ), row=1, col=2)
    fig.add_trace(go.Scattergl(
        x=df[gsa_log], y=df['Depth'], fill='tonextx', fillcolor=fill_color,
        showlegend=False, line=dict(width=0), hoverinfo='none',
        # Terapkan arsiran hanya jika ada anomali
        customdata=is_resistive_or_gas,
        # TODO: Logika 'where' yang lebih canggih mungkin memerlukan pemrosesan data lebih lanjut
    ), row=1, col=2)

    # Panel 3: Anomali (Perbedaan)
    anomaly_col = f"{gsa_log}_{target_log}_DIFF"
    df[anomaly_col] = df[gsa_log] - df[target_log]
    fig.add_trace(go.Scattergl(
        x=df[anomaly_col], y=df['Depth'], name='Anomaly', line=dict(color='purple')
    ), row=1, col=3)
    fig.add_trace(go.Scattergl(
        x=[0] * len(df), y=df['Depth'], mode='lines', line=dict(color='black', dash='dot', width=1),
        showlegend=False
    ), row=1, col=3)

    # Update Layout
    fig.update_layout(
        title_text=f"Analysis for {gsa_log}",
        yaxis=dict(autorange='reversed', title_text="Depth"),
        template="plotly_white",
        showlegend=True
    )
    return fig


def run_full_gsa_analysis(las_path: str):
    """
    Menjalankan seluruh alur kerja GSA (RGSA, NGSA, DGSA) pada satu file LAS.
    """
    las = lasio.read(las_path)
    df_full = las.df().reset_index()
    df_full.rename(columns={"DEPTH": "Depth", "GR_CAL": "GR",
                   "DGRCC": "LWD_GR", "DENS": "RHOB"}, inplace=True, errors='ignore')

    # Proses RGSA
    df_processed = calculate_gsa_log(
        df_input=df_full, ref_log='GR', target_log='ILD', output_log_name='RGSA',
        filters={'GR': (5, 180), 'ILD': (0.2, 2000)}
    )

    # Proses NGSA
    df_processed = calculate_gsa_log(
        df_input=df_processed, ref_log='GR', target_log='NPHI', output_log_name='NGSA',
        filters={'GR': (5, 180), 'NPHI': (0.05, 0.6)}
    )

    # Proses DGSA
    df_processed = calculate_gsa_log(
        df_input=df_processed, ref_log='GR', target_log='RHOB', output_log_name='DGSA',
        filters={'GR': (5, 180), 'RHOB': (1.5, 3.0)}
    )

    # Anda bisa menyimpan atau mengembalikan DataFrame final ini
    # df_processed.to_csv("gsa_complete_results.csv", index=False)

    return df_processed


# Contoh pemanggilan jika file ini dijalankan secara langsung
if __name__ == "__main__":
    las_file = "ABB-036.las"
    if os.path.exists(las_file):
        # Jalankan semua perhitungan
        final_df = run_full_gsa_analysis(las_file)
        print("Kalkulasi GSA Selesai. Hasil DataFrame:")
        print(final_df[['Depth', 'GR', 'ILD', 'RGSA',
              'NPHI', 'NGSA', 'RHOB', 'DGSA']].head())

        # Buat dan tampilkan salah satu plot
        fig_rgsa = plot_gsa_results(final_df, 'GR', 'ILD', 'RGSA')
        fig_rgsa.show()
    else:
        print(f"File {las_file} tidak ditemukan untuk testing.")
