# backend/community_path/api/urls.py
from django.urls import path
from . import views # <-- Correctly imports views from the current directory (api)

urlpatterns = [
    # Auth Endpoints
    path('auth/signup/', views.SignupView.as_view(), name='signup'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    
    # ... Other API endpoints will go here later
]