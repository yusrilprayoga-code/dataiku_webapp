# /api/app.py
from flask import Flask, request, jsonify, Response
from modules.qc_logic import run_quality_control
from modules.data_utils import handle_null_values
import logging

app = Flask(__name__)

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
        app.logger.error(f"An unexpected error occurred in /api/run-qc: {e}", exc_info=True)
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
        app.logger.error(f"An unexpected error occurred in /api/handle-nulls: {e}", exc_info=True)
        return jsonify({"error": "Failed to process CSV data."}), 500

# This is for local development testing, Vercel will use its own server
if __name__ == '__main__':
    app.run(debug=True, port=5001)