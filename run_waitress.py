# run_waitress.py
import os
from waitress import serve
from app import create_app

# Create your Flask app
app = create_app()

# Get port from environment variable (Render sets this automatically)
port = int(os.environ.get("PORT", 5000))

# Serve with Waitress
serve(app, host="0.0.0.0", port=port)
