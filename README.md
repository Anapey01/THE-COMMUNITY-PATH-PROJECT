
# **Community Path Project — API & Client Documentation**

> **A purpose-driven guidance platform that connects community problems to academic pathways using SDGs, GCGO, and grade-based programme matching.**

![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Django REST Framework](https://img.shields.io/badge/DRF-API-red)
![React](https://img.shields.io/badge/React-Vite-61DAFB)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

A decoupled platform built with **Django REST Framework** and **React + Vite** that helps Ghanaian SHS graduates align purpose, community problems, and academic programmes through structured, data-driven matching.

---

# 📋 Table of Contents

* [Overview](#overview)
* [Quick Start](#quick-start)
* [Problem Statement](#problem-statement)
* [Solution](#solution)
* [Features](#features)
* [System Architecture](#system-architecture)
* [Tech Stack](#tech-stack)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Environment Variables](#environment-variables)
* [Project Structure](#project-structure)
* [API Endpoints](#api-endpoints)
* [Authentication](#authentication)
* [Database Models](#database-models)
* [Security Features](#security-features)
* [Known Limitations](#known-limitations)
* [Roadmap](#roadmap)
* [Contributing](#contributing)
* [License](#license)
* [Author](#author)

---

# 🎯 Overview

The **Community Path Project** is an educational guidance platform that helps students identify community problems, map them to **SDGs** and **GCGO (Global Challenges & Global Opportunities)**, and match them with relevant tertiary programmes using grade-based filters and programme cutoffs.

The platform includes:

* A secure authentication system
* A multi-step onboarding wizard
* An intelligent matching engine
* A React-based user dashboard

---

# ⚡ Quick Start

```bash
# Clone repository
git clone <repository-url>
cd community-path

# Backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd ../frontend
npm install
npm run dev
```

Backend → [http://127.0.0.1:8000/api](http://127.0.0.1:8000/api)
Frontend → [http://localhost:5173](http://localhost:5173)

---

# ⚠️ Problem Statement

Many Ghanaian SHS graduates enter tertiary institutions without clarity on the problems their communities face or how academic programmes align with solving them. This leads to mismatched course selection, low academic motivation, and weak alignment between education and local development needs.

Rural and peri-urban students experience this gap more severely due to limited access to structured career guidance systems that link **personal purpose**, **local challenges**, and **academic pathways**.

---

# 💡 Solution

The Community Path Project provides a structured platform that:

* Helps students identify meaningful community problems
* Automatically maps them to **SDGs** & **GCGO global frameworks**
* Filters academic programmes using WASSCE grades and aggregates
* Generates purpose-driven matches
* Provides insights to help students make informed pathway decisions

**Core Logic**
Purpose (Problem Identification) + Reality (Grades) = **Viable Academic Match + Clear Pathway**

---

# ✨ Features

### 🔐 Authentication & Onboarding

* Token-based authentication (Knox)
* Multi-step onboarding wizard (React)
* Real-time grade validation

### 🎯 Matching Engine

* **Tier 1:** Direct programme–problem alignment
* **Tier 2:** Broader interdisciplinary matches
* SDG & GCGO automatic tagging
* Aggregate-based programme filtering

### 💻 React SPA Interface

* Fully responsive
* Real-time feedback
* Saves user matches
* Optimized for low-bandwidth regions

### 🛠 Developer-Friendly Backend

* DRF-based modular API
* Clean serializer + view architecture
* Logic separated into dedicated matching engine folder

---

# 🧩 System Architecture

```
+-------------------+         +------------------------------+
| React Frontend    | <-----> | Django REST API (DRF)        |
| Vite SPA          |         | Authentication, Matching      |
+-------------------+         +------------------------------+
                                      |
                                      |
                              +-----------------+
                              | PostgreSQL/SQLite|
                              +-----------------+
```

---

# 🛠 Tech Stack

**Backend:** Python, Django, DRF, Knox, SQLite/PostgreSQL
**Frontend:** React, Vite, TailwindCSS, Axios
**Security:** Argon2, CORS, DRF throttling
**DevOps:** Gunicorn, Whitenoise, Nginx (Production)

---

# 📦 Prerequisites

* Python 3.9+
* Node.js 18+
* npm
* Git

---

# 🚀 Installation

## Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# 🔐 Environment Variables

## Backend (`backend/.env`)

```
DEBUG=True
SECRET_KEY=your-secret-key
CORS_ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=sqlite:///db.sqlite3
```

## Frontend (`frontend/.env`)

```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

---

# 📁 Project Structure

```
backend/
│   manage.py
│   community_path/
│   api/
│       models.py
│       serializers.py
│       views.py
│       logic/
frontend/
│   src/
│       api/
│       pages/
│       components/
│       context/
```

---

# 🔌 API Endpoints

## 🔑 Authentication

### Register

```
POST /auth/register/
```

### Login

```
POST /auth/login/
```

**Headers:**

```
Authorization: Token <token>
```

---

## 📝 Onboarding

### Step 1 — Submit Problem

```
POST /onboard/step1/
```

Example Request:

```json
{
  "problem_description": "River contamination in my community"
}
```

Example Response:

```json
{
  "detected_sdg": "SDG 6: Clean Water",
  "detected_gcgo": "Urbanization"
}
```

### Step 2 — Submit Grades

```
POST /onboard/step2/
```

### Generate Match

```
GET /match/generate/
```

Example Response:

```json
{
  "tier_1": [
    {
      "programme": "BSc Environmental Science",
      "reason": "Direct match to SDG 6"
    }
  ],
  "tier_2": [...]
}
```

---

# 💾 Database Models

## User

| Field     | Type    | Description          |
| --------- | ------- | -------------------- |
| email     | String  | Unique student email |
| full_name | String  | Student’s name       |
| is_active | Boolean | Account status       |

## CommunityProblem

| Field         | Type   | Description             |
| ------------- | ------ | ----------------------- |
| description   | Text   | Student’s problem story |
| detected_sdg  | String | Auto-mapped SDG         |
| detected_gcgo | String | Auto-mapped GCGO        |

## AcademicProfile

| Field     | Type    | Description      |
| --------- | ------- | ---------------- |
| grades    | JSON    | Subject → Grade  |
| aggregate | Integer | Calculated score |

---

# 🛡 Security Features

* Argon2 password hashing
* Rate limiting for authentication
* CORS strict whitelisting
* Validation at serializer level
* HTTPS-ready for production

---

# ⚠️ Known Limitations

* SDG/GCGO tagging is rule-based; ML version planned
* Programme list currently optimized for Ghanaian universities
* Offline mode not yet implemented

---

# 🗺 Roadmap

* [ ] Machine-learning tagging engine
* [ ] Mentor marketplace
* [ ] Offline mobile web app
* [ ] University integration API
* [ ] Multi-language support

---

# 🤝 Contributing

Contributions are welcome.
Please open an issue before submitting PRs.

---

# 📄 License

Licensed under the **MIT License**.

---

# 👥 Author

**The Community Path Team**
*Helping students find purpose — one match at a time.*

---
