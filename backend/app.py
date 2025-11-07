from flask import Flask, render_template, request, redirect, url_for, flash, session
import json # 1. Import the JSON library
import os # 2. Import OS to build the file path

from models import users  # ✅ import our in-memory user store

app = Flask(
    __name__,
    template_folder="../frontend/html",
    static_folder="../frontend/static"
)
app.secret_key = "dev_secret_key_change_later"

# --- 3. Load Onboarding Content ---
# Get the absolute path to the directory this file is in
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONTENT_FILE = os.path.join(BASE_DIR, 'onboarding_content.json')

# Load the content from the JSON file into a variable
try:
    with open(CONTENT_FILE, 'r') as f:
        onboarding_content = json.load(f)
except FileNotFoundError:
    print(f"ERROR: Could not find {CONTENT_FILE}")
    onboarding_content = []

# ✅ ROUTES
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # --- Validation ---
        if not username or not password:
            flash("Please fill in all fields.")
            return redirect(url_for('signup'))

        if username in users:
            flash("Username already exists. Please log in.")
            return redirect(url_for('login'))

        # --- Store user ---
        # NOTE: This is great for dev, but remember to hash passwords later!
        users[username] = password
        flash("Signup successful! You can now log in.")
        print(f"🟢 New signup: {username}")

        return redirect(url_for('login'))

    return render_template('signup.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # --- Check user ---
        if username in users and users[username] == password:
            # Store username in session
            session['username'] = username
            flash(f"Welcome back, {username}!")
            print(f"🟠 Login successful: {username}")
            return redirect(url_for('main'))
        else:
            flash("Invalid username or password.")
            print(f"🔴 Failed login attempt: {username}")
            return redirect(url_for('login'))

    return render_template('login.html')

@app.route('/logout')
def logout():
    # Clear the session
    session.pop('username', None')
    return redirect(url_for('home'))

@app.route('/main')
def main():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('main.html', username=session['username'])

# --- 4. REFACTORED ONBOARDING FLOW (Single Page App) ---
@app.route('/onboarding_step1')
def onboarding_step1():
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session.get('username')

    # Get a deep copy of the content
    content_data = [slide.copy() for slide in onboarding_content]
    
    # Inject the username into the first slide's title
    if content_data:
        content_data[0]['title'] = content_data[0]['title'].format(username=username)

    # Pass the entire list of slides to the template
    # We use json.dumps to safely pass it to JavaScript
    return render_template('onboarding_step1.html', 
                           slides_json=json.dumps(content_data), 
                           dashboard_url=url_for('main'))


# --- Run App ---
if __name__ == '__main__':
    app.run(debug=True)