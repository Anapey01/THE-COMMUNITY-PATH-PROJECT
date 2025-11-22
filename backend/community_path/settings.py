from pathlib import Path
import os # Import OS module

BASE_DIR = Path(__file__).resolve().parent.parent

# 1. SECURITY SETTINGS
SECRET_KEY = 'your-very-secret-key-change-this-now'
# In production on Render, DEBUG should be False
DEBUG = True 
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'your-render-app-name.onrender.com'] # <--- UPDATED: Include Render Domain

# 2. APPLICATION DEFINITION 
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework', 
    'rest_framework.authtoken', 
    'community_path.api', 
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', 
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # <--- ADDED: For production static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'community_path.urls'
WSGI_APPLICATION = 'community_path.wsgi.application'

TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'DIRS': [], 'APP_DIRS': True, 'OPTIONS': {'context_processors': ['django.template.context_processors.debug', 'django.template.context_processors.request', 'django.contrib.auth.context_processors.auth', 'django.contrib.messages.context_processors.messages',],},},]

# 3. DATABASE
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3',}}

# 4. CORS CONFIGURATION
CORS_ALLOW_ALL_ORIGINS = True 

# 5. REST FRAMEWORK CONFIGURATION
REST_FRAMEWORK = {'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.TokenAuthentication', 'rest_framework.authentication.SessionAuthentication',],}

# 6. STATIC FILES (REQUIRED FOR RENDER/PRODUCTION)
# The URL to serve static files (CSS, JS, etc.)
STATIC_URL = 'static/'
# The directory where static files will be collected for deployment
STATIC_ROOT = BASE_DIR / 'staticfiles'
# Use WhiteNoise to compress and cache static files
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# TIMEZONE AND GENERAL
TIME_ZONE = 'Africa/Accra' 
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# GEMINI API KEY (Keep this secret in production using environment variables)
GEMINI_API_KEY = 'AIzaSyAKpsPDtMTjbdkoyLLBf9y-J3rOS5mkyEc'