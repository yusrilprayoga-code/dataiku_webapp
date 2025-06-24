# /api/app.py
from flask import Flask, request, jsonify, Response
from app.services.qc_service import run_quality_control
from app.services.data_processing import handle_null_values, min_max_normalize
import logging
import os
from flask_cors import CORS
import pandas as pd
import numpy as np
from app.services.plotting_service import (
    extract_markers_with_mean_depth,
    normalize_xover,
    plot_log_default,
    plot_normalization
)

app = Flask(__name__)

# Izinkan permintaan dari semua sumber (penting untuk development)
CORS(app)

# Configure basic logging
logging.basicConfig(level=logging.INFO)


@app.route('/')
def home():
    # A simple route to confirm the API is running
    return "Flask backend is running!"


@app.route('/api/run-qc', methods=['POST'])
def qc_route():
    """
    Receives a list of files, runs the QC process, and returns the results.
    """
    app.logger.info("Received request for /api/run-qc")
    try:
        # The frontend will send a JSON object with a 'files' key
        # files is a list of {'name': '...', 'content': '...'}
        data = request.get_json()
        files_data = data.get('files')

        if not files_data or not isinstance(files_data, list):
            return jsonify({"error": "Invalid input: 'files' key with a list of file objects is required."}), 400

        # Call the refactored logic, passing the app's logger
        results = run_quality_control(files_data, app.logger)

        return jsonify(results)

    except Exception as e:
        app.logger.error(
            f"An unexpected error occurred in /api/run-qc: {e}", exc_info=True)
        return jsonify({"error": "An internal server error occurred."}), 500


@app.route('/api/handle-nulls', methods=['POST'])
def handle_nulls_route():
    """
    Receives CSV content as plain text, processes it, and returns the cleaned CSV.
    """
    app.logger.info("Received request for /api/handle-nulls")
    try:
        # Get the raw text content from the request body
        csv_content = request.get_data(as_text=True)

        if not csv_content:
            return jsonify({"error": "Request body cannot be empty."}), 400

        # Call the refactored utility function
        cleaned_csv = handle_null_values(csv_content)

        # Return the result as a downloadable CSV file
        return Response(
            cleaned_csv,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=cleaned_data.csv"}
        )

    except Exception as e:
        app.logger.error(
            f"An unexpected error occurred in /api/handle-nulls: {e}", exc_info=True)
        return jsonify({"error": "Failed to process CSV data."}), 500


# Tentukan path ke file data secara andal
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, 'sample_data', 'pass_qc.csv')
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
WELLS_DIR = os.path.join(PROJECT_ROOT, 'sample_data', 'wells')
print(f"INFO: Flask akan mencari file sumur di direktori: {WELLS_DIR}")


@app.route('/api/get-plot', methods=['POST'])
def get_plot():
    try:
        # 1. Terima daftar nama sumur dari frontend
        request_data = request.get_json()
        selected_wells = request_data.get('selected_wells')

        if not selected_wells or len(selected_wells) == 0:
            return jsonify({"error": "Tidak ada sumur yang dipilih"}), 400

        print(f"Menerima permintaan untuk memproses sumur: {selected_wells}")

        list_of_dataframes = []
        for well_name in selected_wells:
            file_path = os.path.join(WELLS_DIR, f"{well_name}.csv")
            if os.path.exists(file_path):
                list_of_dataframes.append(pd.read_csv(file_path))

        if not list_of_dataframes:
            return jsonify({"error": "Tidak ada data yang valid untuk sumur yang dipilih"}), 404

        # Gabungkan semua dataframe menjadi satu dataframe besar
        df = pd.concat(list_of_dataframes, ignore_index=True)

        # 3. PROSES DATA (seperti sebelumnya, tapi pada dataframe gabungan)
        df_marker = extract_markers_with_mean_depth(df)
        df = normalize_xover(df, 'NPHI', 'RHOB')
        df = normalize_xover(df, 'RT', 'RHOB')

        # 4. GENERATE PLOT
        fig = plot_log_default(
            df=df,
            df_marker=df_marker,
            df_well_marker=df
        )

        # 5. KIRIM HASIL
        return jsonify(fig.to_json())

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# Di dalam file backend/app.py

@app.route('/api/get-normalization-plot', methods=['POST', 'OPTIONS'])
def get_normalization_plot():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    if request.method == 'POST':
        try:
            request_data = request.get_json()
            selected_wells = request_data.get('selected_wells', [])

            if not selected_wells:
                return jsonify({"error": "Tidak ada sumur yang dipilih"}), 400

            # Baca dan gabungkan HANYA data dari sumur yang dipilih
            df_list = []
            for well_name in selected_wells:
                file_path = os.path.join(
                    WELLS_DIR, f"{well_name}.csv")
                if os.path.exists(file_path):
                    df_list.append(pd.read_csv(file_path))

            if not df_list:
                return jsonify({"error": "Data untuk sumur yang dipilih tidak ditemukan."}), 404

            df = pd.concat(df_list, ignore_index=True)

            log_in_col = 'GR'
            log_out_col = 'GR_NORM'

            # Validasi kolom hasil normalisasi
            if log_out_col not in df.columns or df[log_out_col].isnull().all():
                return jsonify({"error": f"Tidak ada data normalisasi yang valid untuk sumur yang dipilih. Jalankan proses pada interval yang benar."}), 400

            # Siapkan data marker dari DataFrame gabungan
            df_marker_info = extract_markers_with_mean_depth(df)

            # ==========================================================
            # FIX: Panggil `plot_normalization` dengan argumen yang benar
            # ==========================================================
            fig_result = plot_normalization(
                df=df,                 # DataFrame lengkap dengan semua data log
                df_marker=df_marker_info,      # DataFrame khusus untuk teks marker
                df_well_marker=df      # DataFrame lengkap untuk plot latar belakang marker
            )

            return jsonify(fig_result.to_json())

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500


@app.route('/api/list-wells', methods=['GET'])
def list_wells():
    try:
        if not os.path.exists(WELLS_DIR):
            return jsonify({"error": "Folder 'wells' tidak ditemukan."}), 404

        # Ambil semua file .csv, hapus ekstensinya
        well_files = [f.replace('.csv', '') for f in os.listdir(
            WELLS_DIR) if f.endswith('.csv')]
        well_files.sort()  # Urutkan nama sumur

        return jsonify(well_files)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/run-interval-normalization', methods=['POST', 'OPTIONS'])
def run_interval_normalization():

    if request.method == 'OPTIONS':
        # Respons ini sudah cukup untuk memberitahu browser bahwa permintaan POST diizinkan
        return jsonify({'status': 'ok'}), 200

    try:
        # 1. Terima semua data dari frontend: params, sumur, dan interval
        payload = request.get_json()
        params = payload.get('params', {})
        selected_wells = payload.get('selected_wells', [])
        selected_intervals = payload.get('selected_intervals', [])

        if not selected_wells or not selected_intervals:
            return jsonify({"error": "Sumur dan Interval harus dipilih."}), 400

        print(
            f"Memulai normalisasi untuk {len(selected_wells)} sumur pada {len(selected_intervals)} interval...")

        # Ekstrak parameter normalisasi dari payload
        log_in_col = params.get('LOG_IN', 'GR')
        log_out_col = params.get('LOG_OUT', 'GR_NORM')
        calib_min = float(params.get('CALIB_MIN', 40))
        calib_max = float(params.get('CALIB_MAX', 140))
        pct_min = int(params.get('PCT_MIN', 3))
        pct_max = int(params.get('PCT_MAX', 97))
        cutoff_min = float(params.get('CUTOFF_MIN', 0.0))
        cutoff_max = float(params.get('CUTOFF_MAX', 250.0))

        processed_dfs = []

        # 2. LOOPING PERTAMA: Iterasi untuk setiap sumur yang dipilih
        for well_name in selected_wells:
            file_path = os.path.join(WELLS_DIR, f"{well_name}.csv")
            if not os.path.exists(file_path):
                print(
                    f"Peringatan: Melewatkan sumur {well_name}, file tidak ditemukan.")
                continue

            df_well = pd.read_csv(file_path)
            # Buat kolom output baru berisi NaN (Not a Number)
            df_well[log_out_col] = np.nan

            # 3. LOOPING KEDUA: Iterasi untuk setiap interval di dalam sumur saat ini
            for interval in selected_intervals:
                # Filter dataframe untuk mendapatkan baris yang sesuai dengan interval ini
                interval_mask = df_well['MARKER'] == interval

                # Jika tidak ada data untuk interval ini di sumur saat ini, lewati
                if interval_mask.sum() == 0:
                    continue

                # Ambil data log HANYA dari subset interval ini
                log_to_normalize = df_well.loc[interval_mask, log_in_col].dropna(
                ).values

                if len(log_to_normalize) == 0:
                    continue

                # 4. JALANKAN NORMALISASI pada data subset
                normalized_values = min_max_normalize(
                    log_in=log_to_normalize,
                    calib_min=calib_min,
                    calib_max=calib_max,
                    pct_min=pct_min,
                    pct_max=pct_max,
                    cutoff_min=cutoff_min,
                    cutoff_max=cutoff_max
                )

                # 5. SIMPAN HASIL kembali ke dataframe utama pada baris yang benar
                df_well.loc[interval_mask, log_out_col] = normalized_values

            processed_dfs.append(df_well)
            df_well.to_csv(file_path, index=False)
            print(
                f"Hasil normalisasi untuk sumur '{well_name}' telah disimpan ke {file_path}")

        # 6. Gabungkan semua dataframe yang sudah diproses
        if not processed_dfs:
            return jsonify({"error": "Tidak ada data yang berhasil diproses."}), 400

        final_df = pd.concat(processed_dfs, ignore_index=True)

        # 7. Kembalikan data yang sudah dinormalisasi sebagai JSON
        # Format 'records' mudah dibaca oleh JavaScript
        result_json = final_df.to_json(orient='records')

        return jsonify({
            "message": f"Normalisasi selesai untuk {len(processed_dfs)} sumur.",
            "data": result_json
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# This is for local development testing, Vercel will use its own server
if __name__ == '__main__':
    app.run(debug=True, port=5001)
