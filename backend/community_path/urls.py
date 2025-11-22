from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Correctly includes the API app's URLs
    # This points to backend/community_path/api/urls.py
    path('api/', include('community_path.api.urls')),
]