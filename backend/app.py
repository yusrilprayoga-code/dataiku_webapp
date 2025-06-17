import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd

from plotting_logic import (
    extract_markers_with_mean_depth,
    normalize_xover,
    plot_log_default,
    min_max_normalize,
    plot_normalization
)

# Inisialisasi aplikasi Flask
app = Flask(__name__)
# Izinkan permintaan dari semua sumber (penting untuk development)
CORS(app)

# Tentukan path ke file data secara andal
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, 'data', 'pass_qc.csv')

# Endpoint untuk mendapatkan plot


@app.route('/api/get-plot', methods=['GET'])
def get_plot():
    try:
        # 1. BACA DATA CSV DENGAN PANDAS
        df = pd.read_csv(DATA_PATH)

        # 2. PROSES DATA (jika ada, sama seperti di notebook Anda)
        df_marker = extract_markers_with_mean_depth(df)
        df = normalize_xover(df, 'NPHI', 'RHOB')
        df = normalize_xover(df, 'RT', 'RHOB')

        # 3. GENERATE PLOT DENGAN LOGIKA PLOTLY
        # Fungsi ini menghasilkan objek 'figure' dari Plotly
        fig = plot_log_default(
            df=df,
            df_marker=df_marker,
            df_well_marker=df
        )

        # 4. KONVERSI PLOT KE JSON
        plot_json = fig.to_json()

        # 5. KIRIM JSON SEBAGAI RESPONS
        return jsonify(plot_json)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/get-normalization-plot', methods=['POST'])
def get_normalization_plot():
    """
    Menerima parameter normalisasi, menjalankan kalkulasi,
    membuat plot visualisasi hasilnya, dan mengembalikan plot sebagai JSON.
    """
    try:
        # 1. Terima parameter dari frontend dalam format JSON
        params = request.get_json()
        print(f"Menerima {len(params)} parameter untuk normalisasi...")

        # 2. Baca data CSV mentah
        df = pd.read_csv(DATA_PATH)
        df_original_for_marker = df.copy()  # Simpan untuk info marker

        # 3. Helper untuk mengekstrak nilai parameter dengan aman
        def get_param_value(name, default):
            for p in params:
                if p.get('name') == name:
                    # Konversi ke tipe data yang benar jika perlu
                    value = p.get('value', default)
                    try:
                        if isinstance(default, int):
                            return int(value)
                        if isinstance(default, float):
                            return float(value)
                    except (ValueError, TypeError):
                        return default
                    return value
            return default

        # Ekstrak semua parameter yang dibutuhkan oleh min_max_normalize
        log_in_col = get_param_value('LOG_IN', 'GR')
        log_out_col = get_param_value('LOG_OUT', 'GR_NORM')
        calib_min = get_param_value('CALIB_MIN', 40)
        calib_max = get_param_value('CALIB_MAX', 140)
        pct_min = get_param_value('PCT_MIN', 3)
        pct_max = get_param_value('PCT_MAX', 97)
        cutoff_min = get_param_value('CUTOFF_MIN', 0)
        cutoff_max = get_param_value('CUTOFF_MAX', 250)

        if log_in_col not in df.columns:
            return jsonify({"error": f"Kolom log '{log_in_col}' tidak ditemukan."}), 400

        # Ambil data log yang akan dinormalisasi, hapus nilai null
        log_in_data = df[[log_in_col, 'DEPTH']].dropna()

        # 4. Jalankan fungsi kalkulasi normalisasi
        normalized_values = min_max_normalize(
            log_in=log_in_data[log_in_col].values,
            calib_min=calib_min,
            calib_max=calib_max,
            pct_min=pct_min,
            pct_max=pct_max,
            cutoff_min=cutoff_min,
            cutoff_max=cutoff_max
        )

        # 5. Tambahkan kolom hasil normalisasi ke dataframe
        # DataFrame ini sekarang memiliki kolom baru, mis. 'GR_NORM'
        df_normalized = log_in_data.copy()
        df_normalized[log_out_col] = normalized_values

        # 6. Buat plot visualisasi hasil dengan fungsi plot_normalization
        df_marker_info = extract_markers_with_mean_depth(
            df_original_for_marker)

        fig_result = plot_normalization(
            df=df_normalized,
            df_marker=df_marker_info,
            df_well_marker=df_original_for_marker
        )

        # 7. Kirim plot yang sudah jadi sebagai JSON
        return jsonify(fig_result.to_json())

    except Exception as e:
        # Tangkap dan laporkan error jika terjadi
        print(f"Error di /api/get-normalization-plot: {e}")
        return jsonify({"error": str(e)}), 500


# Jalankan server di port 5000 saat skrip ini dieksekusi
if __name__ == '__main__':
    app.run(debug=True, port=5000)
