# backend/community_path/settings.py
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent

# 1. SECURITY SETTINGS
SECRET_KEY = 'your-very-secret-key-change-this-now'
DEBUG = True
ALLOWED_HOSTS = ['*'] 

# 2. APPLICATION DEFINITION (FIXES FAILS 4, 5, 6)
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',            
    'rest_framework',         
    'community_path.api',     
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # MUST be first
    'django.middleware.security.SecurityMiddleware',
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
# ... (rest of standard Django settings)
STATIC_URL = 'static/'
TIME_ZONE = 'Africa/Accra' 
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
