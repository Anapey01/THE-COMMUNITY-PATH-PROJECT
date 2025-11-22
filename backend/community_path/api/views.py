# backend/community_path/api/views.py

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated 
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token 

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings  # <--- NEW: Needed for API Key

# --- NEW IMPORTS FOR AI ---
import google.generativeai as genai
import random
# --------------------------

# Imports adjusted: Removed Match
from .models import OnboardingResult 
# Imports adjusted: Removed MatchSerializer and matching logic
from .serializers import UserSerializer, LoginSerializer, OnboardingSerializer 


# --- Signup View: POST /api/auth/signup/ ---
class SignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token, created = Token.objects.get_or_create(user=user)

        return Response({
            'user': UserSerializer(user, context=self.get_serializer_context()).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)

# --- Login View: POST /api/auth/login/ ---
class LoginView(APIView):
    
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        user = authenticate(username=username, password=password)

        if user:
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'user_id': user.pk,
                'username': user.username,
                'token': token.key
            })
        else:
            return Response(
                {'error': 'Invalid Credentials. Please check username and password.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
            
# --- Onboarding Submission View: POST /api/onboarding/submit/ ---
class OnboardingSubmitView(generics.CreateAPIView):
    queryset = OnboardingResult.objects.all() 
    serializer_class = OnboardingSerializer
    permission_classes = [IsAuthenticated] 

    def perform_create(self, serializer):
        # Automatically set the user field to the currently authenticated user
        instance = serializer.save(user=self.request.user)
        return instance 
    
    def create(self, request, *args, **kwargs):
        # Override create to use the custom success response 
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        self.perform_create(serializer) 
        
        # Return the custom response
        return Response({
            'message': 'Onboarding data saved successfully!',
            'user_id': self.request.user.id
        }, status=status.HTTP_201_CREATED)


# ==========================================================
# NEW: AI WELCOME MESSAGE VIEW
# ==========================================================
class GenerateWelcomeMessage(APIView):
    """
    GET /api/generate-welcome/?username=Name
    Generates a unique, innovative welcome message using Gemini AI.
    """
    def get(self, request):
        # Get username from query params (e.g., ?username=Ama)
        username = request.query_params.get('username', 'Friend')
        
        try:
            # 1. Configure Gemini
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-pro')

            # 2. Randomize Theme (To prevent repetition)
            themes = ["Curiosity", "Action", "Community", "Impact", "Roots", "Boldness", "Future"]
            random_theme = random.choice(themes)

            # 3. The Prompt
            prompt = f"""
            You are a wise, innovative mentor for a student in Ghana named {username}.
            Theme: {random_theme}.
            
            Task: Write a ONE sentence welcome message (max 15 words).
            Tone: Innovative, simple, uplifting, African-futurist.
            
            Do NOT use generic clichés. Make it feel personal.
            Output ONLY the sentence.
            """

            # 4. Call AI with High Creativity
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=1.1 
                )
            )

            return Response({"message": response.text.strip()}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Gemini Error: {e}")
            # Fallback if AI fails
            return Response(
                {"message": "Every great journey begins with a single step of curiosity."}, 
                status=status.HTTP_200_OK
            )