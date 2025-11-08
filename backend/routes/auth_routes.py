# backend/routes/auth_routes.py
from flask import Blueprint, request, jsonify, session

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    return jsonify({"message": "Signup endpoint"})

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    return jsonify({"message": "Login endpoint"})

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.pop('username', None)
    return jsonify({"message": "Logout endpoint"})
