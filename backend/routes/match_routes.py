# backend/routes/match_routes.py
from flask import Blueprint, request, jsonify, session

match_bp = Blueprint('match_bp', __name__)

@match_bp.route("/tier1", methods=["GET"])
def tier1_match():
    return jsonify({"matches": []})

@match_bp.route("/tier2", methods=["GET"])
def tier2_match():
    return jsonify({"matches": []})
