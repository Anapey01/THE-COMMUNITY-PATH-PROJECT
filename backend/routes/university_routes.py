# backend/routes/university_routes.py
from flask import Blueprint, request, jsonify

university_bp = Blueprint('university_bp', __name__)

@university_bp.route("/map", methods=["POST"])
def map_university():
    data = request.get_json()
    return jsonify({"message": "University mapping endpoint"})

@university_bp.route("/list", methods=["GET"])
def list_universities():
    return jsonify({"universities": []})
