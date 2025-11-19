# backend/community_path/api/views.py

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated 
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token 

from django.contrib.auth import authenticate
from django.contrib.auth.models import User

# Imports adjusted: Removed Match
from .models import OnboardingResult 
# Imports adjusted: Removed MatchSerializer and matching logic
from .serializers import UserSerializer, LoginSerializer, OnboardingSerializer 
# Removed: from .logic.match_engine import generate_tiered_match 


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
        
# Removed: MatchGenerateView class