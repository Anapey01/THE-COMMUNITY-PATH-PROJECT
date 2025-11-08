**The Community Path Project**

Helping Ghanaian SHS graduates align their purpose with viable academic paths through a structured, data-driven framework.

**Problem statement**
Every year, thousands of SHS graduates in Ghana make life-defining university choices based on social pressure, leading to academic disengagement, program switching, and financial strain. 
This is compounded by limited access to structured career counseling, particularly in rural and peri-urban areas. 
Graduates are often misaligned with their aspirations and disconnected from solving real community challenges.

**Core hypothesis and logic**
By forcing students first to identify a specific community problem (Step 1 Framework)
and then filtering their program options based on academic viability (Step 3), 
We can generate a Tier 1 (Ideal) or Tier 2 (Complementary) Match that results in a more relevant and actionable educational path, 
directly leading to higher satisfaction.Logic: Purpose (Step 1/2 Frameworks) + Reality (Step 3/4) = Viable Match + Support.

🎯 Mission
To bridge the gap between personal curiosity and academic choices by linking every student’s interest to a community problem and an SDG-based learning path.

## Stack
- Frontend: HTML, CSS, JS
- Backend: Python (Flask)
- Database: SQLite (initial)
- Deployment: Local testing, then web host

## Running
- `cd backend`
- `python app.py`
- Visit `http://127.0.0.1:5000`

⚙️ System Logic
Purpose (Steps 1–2) + Reality (Steps 3–4) → Viable Match + Support

🧩 Core Flow
Step 1 – Identify Community Problem:
Students describe a real challenge in their local area.

Step 2 – SDG & Curiosity Match:
The platform maps the problem to relevant SDGs.

Step 3 – Academic Reality Check:
The student’s grades and interests filter viable programs.

Step 4 – Tiered Match Generation:
System outputs a Tier 1 (Ideal) or Tier 2 (Complementary) pathway.

Result – Purpose-Driven Learning Path:
Student sees recommended programs and related opportunities

.

🚨 High Priority (Core Foundation – must come first)

app.py (Flask backend setup)

Serves all your HTML pages correctly (home, about, signup, login, main).

Connects frontend → backend (routes working).

Handles signup/login sessions.

Confirms your folder structure works properly.

Frontend structure connection (HTML & JS basics)

index.html = home

login.html & signup.html = forms that send data to backend

main.html = shows dashboard after login

These must load from Flask without “404 Not Found”.

Database + models (models.py)

Store users, problems, and paths — the minimum for your logic to function.

Start simple: SQLite + SQLAlchemy.

⚙️ Medium Priority (comes next)

Core logic engine (logic/)

Implements your matching hypothesis: problem → program → match.

Can use mock data first.

Frontend enhancement (style.css + JS)

Improve user experience and visual consistency.

🌍 Low Priority (after MVP testing)

User feedback & analytics integration

Collect data on how users interact with each step.

Video assets, animations, branding

To make it more appealing after the logic works

community-path/
│
├── README.md
│
├── backend/
│   ├── app.py                      # Flask backend app (Python server)
│   ├── db.sqlite                   # SQLite database (stores user data, matches, chat, results)
│   ├── models.py                   # Database models (Users, Mentors, Results, Matches, ChatMessages)
│   ├── logic/
│   │   ├── match_engine.py         # Core logic: generates Tier 1 & Tier 2 matches
│   │   ├── sdg_mapper.py           # Maps community problems to SDGs
│   │   └── validation.py           # Input validation and consistency checks
│   ├── routes/
│   │   ├── auth_routes.py          # Handles sign up / login / logout
│   │   ├── user_routes.py          # Manages user profile and result input
│   │   ├── chat_routes.py          # Mentor-student chat endpoints
│   │   ├── results_routes.py       # Input and retrieval of student results
│   │   ├── match_routes.py         # Fetches & displays program/course matches
│   │   └── university_routes.py    # University mapping APIs
│   └── utils/
│       ├── helpers.py              # Utility functions (e.g., data formatting, validation helpers)
│       └── db_init.py              # Sets up initial database schema
│
├── frontend/
│   ├── html/
│   │   ├── index.html              # Homepage (introduction & CTA)
│   │   ├── about.html              # About the project + mission
│   │   ├── signup.html             # New user registration
│   │   ├── login.html              # Returning user login
│   │   ├── main.html               # Dashboard after login
│   │   ├── onboarding_step1.html   # Step 1: Identify community problem
│   │   ├── onboarding_step2.html   # Step 2: Align with SDG & personal curiosity
│   │   ├── onboarding_step3.html   # Step 3: Check academic reality
│   │   ├── onboarding_step4.html   # Step 4: Generate final match
│   │   ├── match_result.html       # Displays Tier 1 / Tier 2 match results
│   │   └── chat.html               # Mentor-student chat interface
│   │
│   └── static/
│       ├── css/
│       │   ├── style.css           # Global styles
│       │   ├── forms.css           # Sign up, login, and onboarding styling
│       │   ├── dashboard.css       # Dashboard and match result styling
│       │   └── chat.css            # Mentor-student chat styling
│       ├── js/
│       │   ├── main.js             # Main logic (navigation + global UI)
│       │   ├── onboarding.js       # Handles multi-step onboarding flow
│       │   ├── match.js            # Fetches and displays match results
│       │   ├── auth.js             # Handles sign in / sign up
│       │   ├── api.js              # Communicates with Flask backend
│       │   └── chat.js             # Handles mentor-student chat functionality
│       ├── images/
│       │   ├── logo.png
│       │   ├── banner.jpg
│       │   └── sdg-icons/          # SDG icons (1–17)
│       └── assets/
│           ├── videos/
│           │   └── intro_sdgs.mp4  # SDG awareness video
│           └── fonts/
│               └── inter/          # Web fonts
│
├── .env.example                    # Example environment variables
├── requirements.txt                # Python dependencies (Flask, SQLAlchemy, etc.)
└── .gitignore                      # Ignore pycache, db files, envs

