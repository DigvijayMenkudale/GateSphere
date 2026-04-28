from visitors.models import Visitor

def dashboard_counts(request):
    """Provide badge counts for sidebar."""
    if request.user.is_authenticated and hasattr(request.user, 'userprofile'):
        role = request.user.userprofile.role
        
        if role == 'HOST':
            pending_count = Visitor.objects.filter(
                host=request.user,
                status='PENDING',
                is_active=True
            ).count()
            return {'pending_count': pending_count, 'approved_count': 0}
        
        elif role == 'SECURITY':
            approved_count = Visitor.objects.filter(
                status='APPROVED',
                is_active=True
            ).count()
            return {'pending_count': 0, 'approved_count': approved_count}

        elif role == 'ADMIN':
            pending_count = Visitor.objects.filter(
                status='PENDING',
                is_active=True
            ).count()
            approved_count = Visitor.objects.filter(
                status='APPROVED',
                is_active=True
            ).count()
            return {'pending_count': pending_count, 'approved_count': approved_count}
    
    return {'pending_count': 0, 'approved_count': 0}
