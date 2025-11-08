from flask import Flask, render_template, request, redirect, url_for, flash, session
# import json # 1. Import the JSON library -- REMOVED

from models import users  # ✅ import our in-memory user store

app = Flask(
    __name__,
    template_folder="../frontend/html",
    static_folder="../frontend/static"
)
app.secret_key = "dev_secret_key_change_later"

# --- 3. Hard-coded Onboarding Content -- REMOVED ---
# All onboarding content and routes have been removed.
# We will work on this tomorrow.


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
    # FIX: Re-confirming the fix.
    # This removes any stray apostrophes after None.
    session.pop('username', None)
    return redirect(url_for('home'))

@app.route('/main')
def main():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('main.html', username=session['username'])

# --- 4. REFACTORED ONBOARDING FLOW -- REMOVED ---
# @app.route('/onboarding_step1')
# ... all onboarding logic removed ...


# --- Run App ---
if __name__ == '__main__':
    app.run(debug=True)