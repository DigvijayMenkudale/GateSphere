from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Visitor(models.Model):

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CHECKED_IN', 'Checked-In'),
        ('CHECKED_OUT', 'Checked-Out'),
    ]

    VISITOR_TYPE_CHOICES = [
        ('CLIENT', 'Client'),
        ('VENDOR', 'Vendor'),
        ('INTERVIEW', 'Interview'),
        ('DELIVERY', 'Delivery'),
    ]

    full_name = models.CharField(max_length=150)
    contact_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True, null=True)
    company_name = models.CharField(max_length=200, blank=True, null=True)
    
    visitor_type = models.CharField(
        max_length=20,
        choices=VISITOR_TYPE_CHOICES,
        blank=True,
        null=True
    )

    id_proof_type = models.CharField(max_length=50)
    id_proof_number = models.CharField(max_length=100)

    purpose = models.TextField()
    photo = models.ImageField(upload_to='visitor_photos/', blank=True, null=True)
    
    expected_date = models.DateField(blank=True, null=True)
    expected_time = models.TimeField(blank=True, null=True)

    host = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='hosted_visitors'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )

    approval_time = models.DateTimeField(blank=True, null=True)

    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_visitors'
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Visitor"
        verbose_name_plural = "Visitors"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} - {self.status}"

    # 🔹 Business Logic Methods
    def approve(self, approved_user):
        self.status = 'APPROVED'
        self.approval_time = timezone.now()
        self.approved_by = approved_user
        self.save()

    def reject(self, approved_user):
        self.status = 'REJECTED'
        self.approval_time = timezone.now()
        self.approved_by = approved_user
        self.save()