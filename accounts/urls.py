from django.urls import path
from . import views
from django.contrib.auth import views as auth_views
from django.urls import reverse_lazy

app_name = 'accounts'

urlpatterns = [
    path('login/', views.user_login, name='login'),
    path('profile/', views.user_profile, name='profile'),
    path('notifications/', views.notifications_page, name='notifications'),
    path('update/', views.update_profile, name='update_profile'),
    path('password/', views.change_password, name='change_password'),
    path(
        'forgot-password/',
        auth_views.PasswordResetView.as_view(
            template_name='auth/forgot_password.html',
            email_template_name='auth/password_reset_email.txt',
            subject_template_name='auth/password_reset_subject.txt',
            success_url=reverse_lazy('accounts:password_reset_sent'),
        ),
        name='forgot_password',
    ),
    path(
        'password-reset-sent/',
        auth_views.PasswordResetDoneView.as_view(
            template_name='auth/password_reset_sent.html',
        ),
        name='password_reset_sent',
    ),
    path(
        'reset/<uidb64>/<token>/',
        auth_views.PasswordResetConfirmView.as_view(
            template_name='auth/password_reset_confirm.html',
            success_url=reverse_lazy('accounts:password_reset_complete'),
        ),
        name='password_reset_confirm',
    ),
    path(
        'reset-complete/',
        auth_views.PasswordResetCompleteView.as_view(
            template_name='auth/password_reset_complete.html',
        ),
        name='password_reset_complete',
    ),
    # New API
    path('api/profile-data/', views.profile_data_api, name='profile_data_api'),
    path('api/notifications/', views.notifications_api, name='notifications_api'),
    path('api/upload-photo/', views.upload_profile_photo, name='upload_profile_photo'),
]

