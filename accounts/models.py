from django.db import models
from django.contrib.auth.models import User
from departments.models import Department
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):

    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('SECURITY', 'Security'),
        ('HOST', 'Host'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='HOST')
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"{self.user.username} - {self.role}"


class UserActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "User Activity Log"
        verbose_name_plural = "User Activity Logs"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.action}"


# 🔹 Automatically create UserProfile when a new User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


# 🔹 Save UserProfile when User is saved
@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'userprofile'):
        instance.userprofile.save()
