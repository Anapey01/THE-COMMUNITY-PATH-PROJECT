# backend/app.py
from flask import Flask, render_template
from models import db
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.chat_routes import chat_bp
from routes.results_routes import results_bp
from routes.match_routes import match_bp
from routes.university_routes import university_bp
import os

def create_app():
    app = Flask(
        __name__,
        template_folder="../frontend/html",   # HTML files
        static_folder="../frontend/static"    # CSS/JS/images
    )

    # --- Configuration ---
    app.config['SECRET_KEY'] = "dev_secret_key_change_later"
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # --- Initialize database ---
    db.init_app(app)

    # --- Register API Blueprints ---
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/user")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(results_bp, url_prefix="/api/results")
    app.register_blueprint(match_bp, url_prefix="/api/match")
    app.register_blueprint(university_bp, url_prefix="/api/universities")

    # --- Home route ---
    @app.route("/")
    def home():
        return render_template("index.html")  # Main page

    # --- Dynamic route for all other HTML pages ---
    @app.route("/<page>")
    def render_page(page):
        if not page.endswith(".html"):
            page += ".html"
        # Ensure template_folder is a concrete string (fallback to empty string if None)
        template_folder = app.template_folder or ""
        template_path = os.path.join(os.fspath(template_folder), page)
        if os.path.exists(template_path):
            return render_template(page)
        else:
            return f"❌ Page {page} not found", 404

    return app

# Run the app if executed directly
if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
