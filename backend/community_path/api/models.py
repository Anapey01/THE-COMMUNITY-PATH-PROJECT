# backend/community_path/api/models.py (New Django ORM Syntax)
from django.db import models
from django.contrib.auth.models import User 

# -------------------
# Mentor Model
# -------------------
class Mentor(models.Model):
    name = models.CharField(max_length=120)
    expertise = models.CharField(max_length=200, blank=True, null=True)
    email = models.EmailField(max_length=120, unique=True, blank=True, null=True)
    is_ai = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# -------------------
# Onboarding Results
# -------------------
class OnboardingResult(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    community_problem = models.CharField(max_length=500, blank=True, null=True)
    sdg_alignment = models.CharField(max_length=100, blank=True, null=True)
    curiosity_score = models.IntegerField(blank=True, null=True)
    academic_realism_score = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

# -------------------
# Matches
# -------------------
class Match(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    tier1_match = models.CharField(max_length=200, blank=True, null=True)
    tier2_match = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

# -------------------
# Chat Messages
# -------------------
class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages_sent_by_user')
    receiver_mentor = models.ForeignKey(Mentor, on_delete=models.CASCADE, related_name='messages_received', blank=True, null=True)
    receiver_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages_received_by_user', blank=True, null=True)

    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)


# -------------------
# University Mapping
# -------------------
class University(models.Model):
    name = models.CharField(max_length=200)
    programs = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name