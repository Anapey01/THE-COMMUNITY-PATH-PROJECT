# backend/scripts/init_db.py
import sys
import os

# Add the parent folder (backend/) to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db, User, Mentor, University, Message

app = create_app()

with app.app_context():
    # Drop all tables and recreate them (development only)
    db.drop_all()
    db.create_all()
    print("✅ Database tables created successfully.")

    # --- Seed users ---
    u1 = User(username="kofi", password="1234", email="kofi@example.com")
    u2 = User(username="ama", password="mypassword", email="ama@example.com")
    db.session.add_all([u1, u2])

    # --- Seed mentors ---
    gemini_ai = Mentor(name="Gemini AI", expertise="All areas", email="gemini@ai.com", is_ai=True)
    m2 = Mentor(name="Prof. Adjoa", expertise="Education & SDGs", email="adjoa@example.com")
    db.session.add_all([gemini_ai, m2])

    # Commit users and mentors to generate IDs
    db.session.commit()

    # --- Seed universities ---
    uni1 = University(name="University of Ghana", programs="Computer Science, Environmental Science, Education")
    uni2 = University(name="Kwame Nkrumah University", programs="Engineering, Public Health, Economics")
    db.session.add_all([uni1, uni2])

    # --- Seed example messages ---
    msg1 = Message(sender_id=u1.id, receiver_mentor_id=gemini_ai.id, content="Hello Gemini AI, I need guidance on community projects.")
    msg2 = Message(sender_id=u2.id, receiver_mentor_id=gemini_ai.id, content="Hi Gemini AI, can you help me with SDG alignment?")
    msg3 = Message(sender_id=u1.id, receiver_mentor_id=m2.id, content="Hello Prof. Adjoa, I would like your advice on education programs.")
    db.session.add_all([msg1, msg2, msg3])

    # Commit all changes
    db.session.commit()
    print("✅ Seed data added: users, Gemini AI mentor, universities, messages")
