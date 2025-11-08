# backend/routes/chat_routes.py
from flask import Blueprint, request, jsonify, session

chat_bp = Blueprint('chat_bp', __name__)

@chat_bp.route("/send", methods=["POST"])
def send_message():
    data = request.get_json()
    return jsonify({"message": "Message sent"})

@chat_bp.route("/receive", methods=["GET"])
def receive_messages():
    return jsonify({"messages": []})
