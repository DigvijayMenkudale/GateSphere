from django.contrib import admin
from .models import VisitLog


@admin.register(VisitLog)
class VisitLogAdmin(admin.ModelAdmin):
    list_display = ('visitor', 'check_in_time', 'check_out_time')
    search_fields = ('visitor__full_name',)