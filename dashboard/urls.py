from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard_index, name='dashboard'),
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('api/stats/', views.admin_stats_api, name='admin_stats_api'),
    path('api/checkin-list/', views.admin_checkin_list_api, name='admin_checkin_list_api'),
    path('api/host-dashboard/', views.host_dashboard_api, name='host_dashboard_api'),
    path('api/security-dashboard/', views.security_dashboard_api, name='security_dashboard_api'),
    path('admin-panel/', views.admin_panel, name='admin_panel'),
    path('admin-checkin-panel/', views.admin_checkin_panel, name='admin_checkin_panel'),
    path('security-dashboard/', views.security_dashboard, name='security_dashboard'),
    path('host-dashboard/', views.host_dashboard, name='host_dashboard'),
    path('export-visitors/', views.export_visitors_csv, name='export_visitors'),
]
