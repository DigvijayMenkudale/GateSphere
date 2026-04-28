from django.contrib import admin
from .models import UserProfile, UserActivityLog


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'department', 'created_at')
    list_filter = ('role', 'department')
    search_fields = ('user__username',)


@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'timestamp')
    list_filter = ('action', 'user__userprofile__role')
    search_fields = ('user__username', 'action')
    readonly_fields = ('timestamp',)
    ordering = ['-timestamp']
    date_hierarchy = 'timestamp'
