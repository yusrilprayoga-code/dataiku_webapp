# api/app/routes/qc_routes.py
from flask import Blueprint, request, jsonify
from ..services import qc_service # Impor service yang relevan

# Buat Blueprint. 'qc' adalah nama blueprint.
qc_bp = Blueprint('qc', __name__)

@qc_bp.route('/run', methods=['POST'])
def run_qc_endpoint():
    data = request.get_json()
    files_to_process = data.get('files')

    if not files_to_process:
        return jsonify({"error": "No files provided"}), 400

    # Panggil fungsi dari service untuk melakukan pekerjaan berat
    results = qc_service.run_full_qc_pipeline(files_to_process)

    return jsonify(results), 200