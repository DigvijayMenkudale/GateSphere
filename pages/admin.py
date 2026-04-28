from django.contrib import admin
from .models import Page, ContactMessage


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'is_active', 'updated_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('title', 'content')
    prepopulated_fields = {'slug': ('title',)}

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'created_at', 'is_read')
    list_filter = ('is_read', 'created_at')
    search_fields = ('name', 'email', 'subject', 'message')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at',)
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated} message(s) marked as read.')
    mark_as_read.short_description = 'Mark selected as read'
    
    actions = ['mark_as_read']
