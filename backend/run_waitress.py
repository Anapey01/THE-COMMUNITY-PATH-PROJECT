# backend/run_waitress.py
import sys
import os
from waitress import serve

# Ensure the backend directory is in sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app  # Import from backend/app.py

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    serve(app, host="0.0.0.0", port=port)
