from django.urls import path
from . import views

app_name = 'pages'

urlpatterns = [
    path('documentation/', views.documentation, name='documentation'),
    path('api-reference/', views.api_reference, name='api_reference'),
    path('guides/', views.guides, name='guides'),
    path('blog/', views.blog, name='blog'),
    path('help-center/', views.help_center, name='help_center'),
    path('contact/', views.contact, name='contact'),
    path('status/', views.status, name='status'),
    path('terms/', views.terms, name='terms'),
    path('live/<slug:slug>/', views.page_live_data, name='page_live_data'),
]
