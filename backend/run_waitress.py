# run_waitress.py
from waitress import serve
from app import create_app
import os

app = create_app()

if __name__ == "__main__":
    # Get PORT from environment variables, default to 5000
    port = int(os.environ.get("PORT", 5000))
    serve(app, host="0.0.0.0", port=port)
