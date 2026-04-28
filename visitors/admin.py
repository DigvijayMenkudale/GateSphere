from django.contrib import admin
from .models import Visitor


@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'host', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('full_name', 'contact_number')