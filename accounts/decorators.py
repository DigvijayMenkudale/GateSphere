from functools import wraps
from django.http import HttpResponseForbidden
from django.shortcuts import redirect


def role_required(required_roles):
    """
    Decorator to restrict access based on UserProfile role.
    Usage:
        @role_required(['ADMIN'])
        @role_required(['SECURITY'])
        @role_required(['HOST'])
        @role_required(['ADMIN', 'SECURITY'])
    """

    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):

            # User must be logged in
            if not request.user.is_authenticated:
                return redirect('login')

            # Superuser always allowed
            if request.user.is_superuser:
                return view_func(request, *args, **kwargs)

            # Check if user has profile
            if not hasattr(request.user, 'userprofile'):
                return HttpResponseForbidden("User profile not found.")

            user_role = request.user.userprofile.role

            if user_role in required_roles:
                return view_func(request, *args, **kwargs)

            return HttpResponseForbidden("You do not have permission to access this page.")

        return wrapper
    return decorator