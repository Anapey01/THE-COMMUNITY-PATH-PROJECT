# backend/community_path/api/serializers.py

from rest_framework import serializers
from django.contrib.auth.models import User
# CRITICAL FIX: Import the model used in the new serializer
from .models import OnboardingResult 
# Removed: Match import

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new User object (Signup).
    Only exposes the ID and username after creation.
    """
    class Meta:
        model = User
        fields = ('id', 'username', 'password')
        extra_kwargs = {'password': {'write_only': True}} # Password should only be writable (input)

    def create(self, validated_data):
        # Use Django's built-in method to hash the password securely
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user

class LoginSerializer(serializers.Serializer):
    """
    Serializer for authenticating a user (login).
    """
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(style={'input_type': 'password'}, trim_whitespace=False)


class OnboardingSerializer(serializers.ModelSerializer):
    """
    Serializer for the student's submitted onboarding data (Steps 1-3).
    """
    class Meta:
        model = OnboardingResult
        # Fields the API expects to receive from the frontend POST request
        fields = (
            'community_problem', 
            'sdg_alignment', 
            'curiosity_score', 
            'academic_realism_score'
        )

# Removed: MatchSerializer class