import os
import sys
from waitress import serve

# Ensure backend directory is in Python path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app

app = create_app()

port = int(os.environ.get("PORT", 5000))

if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=port)
