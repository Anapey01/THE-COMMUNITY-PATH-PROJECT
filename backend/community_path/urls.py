# backend/community_path/api/urls.py

from django.urls import path

# backend/community_path/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Correctly includes the API app's URLs
    path('api/', include('community_path.api.urls')),
]