# backend/app.py
from flask import Flask
from models import db
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.chat_routes import chat_bp
from routes.results_routes import results_bp
from routes.match_routes import match_bp
from routes.university_routes import university_bp

def create_app():
    app = Flask(__name__)

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

    return app

# --- Only for local testing ---
if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
// frontend/js/auth.js

const backendURL = "https://the-community-path-project.onrender.com"; // Render backend

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            try {
                const response = await fetch(`${backendURL}/api/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Login successful!");
                    // Redirect or save token if using JWT
                    window.location.href = "index.html";
                } else {
                    alert(data.message || "Login failed!");
                }
            } catch (err) {
                console.error(err);
                alert("Something went wrong. Check console.");
            }
        });
    }
});
