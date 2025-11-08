# backend/routes/results_routes.py
from flask import Blueprint, request, jsonify, session

results_bp = Blueprint('results_bp', __name__)

@results_bp.route("/input", methods=["POST"])
def input_results():
    data = request.get_json()
    return jsonify({"message": "Results input endpoint"})

@results_bp.route("/view", methods=["GET"])
def view_results():
    return jsonify({"results": []})
