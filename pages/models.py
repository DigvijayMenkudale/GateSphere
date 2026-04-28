from django.db import models
from django.utils import timezone


class Page(models.Model):
    PAGE_TYPES = [
        ('documentation', 'Documentation'),
        ('api_reference', 'API Reference'),
        ('guides', 'Guides'),
        ('blog', 'Blog'),
        ('help_center', 'Help Center'),
        ('contact', 'Contact'),
        ('status', 'Status'),
        ('terms', 'Terms'),
    ]
    
    slug = models.SlugField(max_length=100, unique=True, choices=PAGE_TYPES)
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Page'
        verbose_name_plural = 'Pages'
    
    def __str__(self):
        return self.title


class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Contact Message'
        verbose_name_plural = 'Contact Messages'
    
    def __str__(self):
        return f"{self.name} - {self.subject}"

