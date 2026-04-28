from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from visitors.models import Visitor


class VisitLog(models.Model):

    visitor = models.OneToOneField(
        Visitor,
        on_delete=models.CASCADE,
        related_name='visit_log'
    )

    check_in_time = models.DateTimeField(blank=True, null=True)
    check_out_time = models.DateTimeField(blank=True, null=True)

    check_in_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checkins'
    )

    check_out_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checkouts'
    )

    remarks = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Visit Log"
        verbose_name_plural = "Visit Logs"
        ordering = ['-created_at']

    def __str__(self):
        return f"VisitLog - {self.visitor.full_name}"

    # 🔹 Business Logic Methods

    def check_in(self, user):
        if self.visitor.status != 'APPROVED':
            raise ValueError("Visitor must be approved before check-in.")

        if self.check_in_time is not None:
            raise ValueError("Visitor already checked in.")

        self.check_in_time = timezone.now()
        self.check_in_by = user
        self.visitor.status = 'CHECKED_IN'
        self.visitor.save()
        self.save()

    def check_out(self, user):
        if self.check_in_time is None:
            raise ValueError("Visitor has not checked in yet.")

        if self.check_out_time is not None:
            raise ValueError("Visitor already checked out.")

        self.check_out_time = timezone.now()
        self.check_out_by = user
        self.visitor.status = 'CHECKED_OUT'
        self.visitor.save()
        self.save()