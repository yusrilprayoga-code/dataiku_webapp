import os
from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd

from plotting_logic import (
    extract_markers_with_mean_depth,
    normalize_xover,
    plot_log_default,
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


# Jalankan server di port 5000 saat skrip ini dieksekusi
if __name__ == '__main__':
    app.run(debug=True, port=5000)
