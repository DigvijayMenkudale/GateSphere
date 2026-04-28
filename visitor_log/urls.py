
"""
URL configuration for visitor_log project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from accounts import views as account_views
from pages import views as page_views
from django.http import HttpResponse
from django.views.generic import RedirectView

urlpatterns = [
    path('favicon.ico', lambda request: HttpResponse(status=204)),
    path('admin/', admin.site.urls),
    path('admin-dashboard/', RedirectView.as_view(pattern_name='admin_dashboard', permanent=False)),
    path('admin-panel/', RedirectView.as_view(pattern_name='admin_panel', permanent=False)),
    path('admin-checkin-panel/', RedirectView.as_view(pattern_name='admin_checkin_panel', permanent=False)),
    path('security-dashboard/', RedirectView.as_view(pattern_name='security_dashboard', permanent=False)),
    path('host-dashboard/', RedirectView.as_view(pattern_name='host_dashboard', permanent=False)),
    path('dashboard/', include('dashboard.urls')),
    path('visitors/', include('visitors.urls')),
    path('', account_views.landing_page, name='home'),
    path('login/', account_views.user_login, name='login'),
    path('signup/', account_views.user_signup, name='signup'),
    path('logout/', account_views.user_logout, name='logout'),
    path('profile/', account_views.user_profile, name='profile'),
    path('profile/update/', account_views.update_profile, name='update_profile'),
    path('profile/change-password/', account_views.change_password, name='change_password'),
    path('accounts/', include('accounts.urls')),
    path('pages/', include('pages.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

