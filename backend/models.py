from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy
db = SQLAlchemy()


# -------------------
# User Model
# -------------------
class User(db.Model):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    # Relationships
    onboarding = db.relationship("OnboardingResult", backref="user", lazy=True)
    matches = db.relationship("Match", backref="user", lazy=True)


# -------------------
# Mentor Model
# -------------------
class Mentor(db.Model):
    __tablename__ = "mentors"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    expertise = db.Column(db.String(200))
    email = db.Column(db.String(120), unique=True, nullable=True)
    is_ai = db.Column(db.Boolean, default=False)  # True for Gemini AI
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    messages_received = db.relationship(
        "Message", backref="receiver_mentor", lazy=True, foreign_keys="Message.receiver_mentor_id"
    )


# -------------------
# Onboarding Results
# -------------------
class OnboardingResult(db.Model):
    __tablename__ = "onboarding_results"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    community_problem = db.Column(db.String(500))
    sdg_alignment = db.Column(db.String(100))
    curiosity_score = db.Column(db.Integer)
    academic_realism_score = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, server_default=db.func.now())


# -------------------
# Matches
# -------------------
class Match(db.Model):
    __tablename__ = "matches"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    tier1_match = db.Column(db.String(200))
    tier2_match = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, server_default=db.func.now())


# -------------------
# Chat Messages
# -------------------
class Message(db.Model):
    __tablename__ = "messages"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    receiver_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    receiver_mentor_id = db.Column(db.Integer, db.ForeignKey("mentors.id"), nullable=True)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())

    # Relationships
    sender_user = db.relationship("User", foreign_keys=[sender_id], backref="messages_sent")
    receiver_user = db.relationship("User", foreign_keys=[receiver_user_id], backref="messages_received")


# -------------------
# University Mapping
# -------------------
class University(db.Model):
    __tablename__ = "universities"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    programs = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
