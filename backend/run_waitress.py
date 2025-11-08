import os
import sys
from waitress import serve

# Ensure backend directory is in Python path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app  # Now Python can find backend/app.py

# Create Flask app
app = create_app()

# Render automatically provides PORT as an environment variable
port = int(os.environ.get("PORT", 5000))

# Serve with Waitress
if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=port)
