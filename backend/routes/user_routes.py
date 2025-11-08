# backend/routes/user_routes.py
from flask import Blueprint, request, jsonify, session

user_bp = Blueprint('user_bp', __name__)

@user_bp.route("/profile", methods=["GET"])
def profile():
    return jsonify({"message": "User profile endpoint"})

@user_bp.route("/onboarding", methods=["POST"])
def onboarding():
    data = request.get_json()
    return jsonify({"message": "Onboarding endpoint"})
