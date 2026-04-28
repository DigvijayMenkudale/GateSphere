from django.urls import path
from . import views

urlpatterns = [
    # Action URLs
    path('approve/<int:visitor_id>/', views.approve_visitor, name='approve_visitor'),
    path('reject/<int:visitor_id>/', views.reject_visitor, name='reject_visitor'),
    path('check-in/<int:visitor_id>/', views.check_in_visitor, name='check_in_visitor'),
    path('check-out/<int:visitor_id>/', views.check_out_visitor, name='check_out_visitor'),

    # Live API URLs
    path('api/host/pending/', views.host_pending_visitors_api, name='host_pending_visitors_api'),
    path('api/host/all/', views.host_all_visitors_api, name='host_all_visitors_api'),
    path('api/security/all/', views.security_visitors_api, name='security_visitors_api'),
    
    # HOST URLs
    path('host/pending/', views.host_pending_visitors, name='host_pending_visitors'),
    path('host/all/', views.host_all_visitors, name='host_all_visitors'),
    path('create/', views.create_visitor, name='create_visitor'),
    
    # SECURITY URLs
    path('security/checkin/', views.security_checkin, name='security_checkin'),
    path('security/all/', views.security_visitors, name='security_visitors'),
]
