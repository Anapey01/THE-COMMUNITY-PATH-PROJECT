import os
from waitress import serve
from app import create_app

app = create_app()
port = int(os.environ.get("PORT", 5000))
print(f"Starting app on port {port}...")
serve(app, host="0.0.0.0", port=port)
