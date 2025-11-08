# backend/app.py
from flask import Flask, render_template, redirect, url_for
from models import db
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.chat_routes import chat_bp
from routes.results_routes import results_bp
from routes.match_routes import match_bp
from routes.university_routes import university_bp
import os

def create_app():
    # --- Absolute paths for frontend ---
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    FRONTEND_DIR = os.path.join(BASE_DIR, "../frontend")

    app = Flask(
        __name__,
        template_folder=os.path.join(FRONTEND_DIR, "html"),   # Absolute path
        static_folder=os.path.join(FRONTEND_DIR, "static")    # Absolute path
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

    # --- Home route (redirect to login) ---
    @app.route("/")
    def home():
        return redirect(url_for("render_page", page="login"))  # Redirect to login.html

    # --- Dynamic route for all HTML pages ---
    @app.route("/<page>")
    def render_page(page):
        if not page.endswith(".html"):
            page += ".html"

        template_folder = app.template_folder or ""
        template_path = os.path.join(os.fspath(template_folder), page)

        if os.path.exists(template_path):
            return render_template(page)
        else:
            return f"❌ Page {page} not found", 404

    return app


# --- Local run ---
if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
