
# **The Community Path Project**

Helping Ghanaian SHS graduates align their purpose with viable academic paths through a structured, data-driven framework. **One student at a time.**

## Project Core

**Problem statement**
Every year, thousands of SHS graduates in Ghana make life-defining university choices based on social pressure, leading to academic disengagement, program switching, and financial strain. This is compounded by limited access to structured career counseling, particularly in rural and peri-urban areas. Graduates are often misaligned with their aspirations and disconnected from solving real community challenges.

**Core hypothesis and logic**
By forcing students first to identify a specific community problem (Step 1 Framework) and then filtering their program options based on academic viability (Step 3), we can generate a Tier 1 (Ideal) or Tier 2 (Complementary) Match that results in a more relevant and actionable educational path, directly leading to higher satisfaction.

**Logic:** Purpose (Step 1/2 Frameworks) + Reality (Step 3/4) = **Viable Match + Support.**

🎯 **Mission**
To bridge the gap between personal curiosity and academic choices by linking every student’s interest to a community problem and an SDG-based learning path.

-----

## Technology Stack (Decoupled Architecture)

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | **Python (Django, DRF)** | Handles complex matching logic, data storage, and serves **JSON API** endpoints. |
| **Database** | **SQLite3** (initial) | Django's default, ready for easy transition to PostgreSQL in production. |
| **Frontend** | **HTML, CSS, JavaScript** | Purely static, decoupled files that consume the Django API. |
| **Deployment** | **Split Hosting** | Backend hosted on a service like Heroku/Railway; Frontend hosted statically on Netlify/Vercel. |

## Running the Project Locally

The project is now a decoupled API (backend) and a static frontend.

### 1\. Backend API Server (Django)

This starts the Django Rest Framework API.

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Ensure dependencies are installed and migrations are applied:
    ```bash
    pip install -r ../requirements.txt
    python manage.py makemigrations api # Only needed if models change
    python manage.py migrate
    ```
3.  Start the Django development server:
    ```bash
    python manage.py runserver
    ```
    The API will be running at `http://127.0.0.1:8000/api/`.

### 2\. Frontend Access (Static)

The frontend must be served statically for local testing.

  * Open the project root in your browser (e.g., `file:///path/to/project/frontend/html/index.html`).
  * **Alternatively,** use a small static server utility (like Node's `http-server`) to test CORS functionality correctly.

-----

## 🚨 High Priority (Current Focus)

The current priority is establishing robust API communication now that the structural groundwork is complete.

  * **User Authentication (Auth Tokens):** Implement **serializers** and **views** to handle user signup/login and return an **Authentication Token** upon success.
  * **Core Data Endpoints:** Implement API views for submitting student data for Steps 1-3 (Onboarding).
  * **Frontend API Integration:** Update `frontend/static/js/auth.js` to send/receive JSON data and handle token storage on successful login.

-----

## 🧩 System Logic & Core Flow

This defines the student journey within the application.

  * **System Logic:** Purpose (Steps 1–2) + Reality (Steps 3–4) → **Viable Match + Support**
  * **Step 1 – Identify Community Problem:** Students describe a real challenge in their local area.
  * **Step 2 – SDG & Curiosity Match:** The platform maps the problem to relevant SDGs.
  * **Step 3 – Academic Reality Check:** The student’s grades and interests filter viable programs.
  * **Step 4 – Tiered Match Generation:** System outputs a Tier 1 (Ideal) or Tier 2 (Complementary) pathway.
  * **Result – Purpose-Driven Learning Path:** Student sees recommended programs and related opportunities.

-----

## 📁 Project Directory Structure (Final Django Stack)

This diagram reflects the result of the migration and purge process.

```
.
├── README.md
├── requirements.txt
├── .gitignore
│
├── backend/
│   ├── manage.py                   # Django management script
│   ├── db.sqlite3                  # SQLite database (new location)
│   └── community_path/             # Django Project Configuration
│       ├── settings.py             # Global settings (CORS, DRF, Apps)
│       ├── urls.py                 # Main URL dispatcher (routes to /api/)
│       ├── wsgi.py
│       │
│       └── api/                    # Django Application (Your Core Logic)
│           ├── models.py           # Converted Django ORM models
│           ├── serializers.py      # DRF serializers (JSON <-> Python objects)
│           ├── views.py            # API endpoint logic (replaces Flask routes)
│           ├── urls.py             # App-level URL routes (e.g., auth/signup, match/tier1)
│           ├── logic/              # Core matching functions (match_engine.py, sdg_mapper.py, validation.py)
│           └── migrations/         # Database migration files
│
└── frontend/                       # Static Content Host (Vercel/Netlify)
    ├── html/                       # All static HTML pages
    │   ├── index.html
    │   ├── signup.html
    │   ├── main.html
    │   └── match_result.html
    │   └── ... (other HTML files)
    │
    └── static/                     # CSS, JS, Images, Assets
        ├── css/
        │   ├── style.css
        │   └── ... (forms.css, dashboard.css)
        ├── js/
        │   ├── auth.js             # Handles token-based login/signup
        │   └── onboarding.js       # Handles multi-step form data submission
        └── images/
            └── ... (logo.png, sdg-icons/)

```
