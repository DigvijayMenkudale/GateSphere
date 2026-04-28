from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from .models import UserActivityLog
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.db import IntegrityError
from django.utils import timezone
from visitors.models import Visitor
from visits.models import VisitLog
from accounts.models import UserProfile
from departments.models import Department
from django.conf import settings
import re


def user_login(request):
    """Handle user login."""
    if request.user.is_authenticated:
        return redirect_to_role_based_dashboard(request.user)

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()
        remember_me = request.POST.get('remember_me')

        # SERVER-SIDE VALIDATION: Empty fields check (backup for JS bypass)
        if not username or not password:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill both username and password fields.'
                })
            messages.error(request, 'Please fill both username and password fields.')
            return render(request, 'auth/login.html')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            if not remember_me:
                request.session.set_expiry(0)
            login(request, user)
            
            # Log user login activity
            UserActivityLog.objects.create(user=user, action="User Logged In")
            
            # Return JSON for AJAX login (if we want to add that later)
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'redirect': get_redirect_url(user)
                })
            
            return redirect_to_role_based_dashboard(user)
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid credentials'
                })
            else:
                messages.error(request, 'Invalid username or password.')
                return render(request, 'auth/login.html')

    return render(request, 'auth/login.html')


def redirect_to_role_based_dashboard(user):
    """Redirect user to their role-based dashboard."""
    if hasattr(user, 'userprofile'):
        role = user.userprofile.role
        if role == 'ADMIN':
            return redirect('admin_dashboard')
        elif role == 'SECURITY':
            return redirect('security_dashboard')
        elif role == 'HOST':
            return redirect('host_dashboard')
    
    # Default fallback
    return redirect('admin_dashboard')


def get_redirect_url(user):
    """Get the redirect URL based on user role."""
    if hasattr(user, 'userprofile'):
        role = user.userprofile.role
        if role == 'ADMIN':
            return '/dashboard/admin-dashboard/'
        elif role == 'SECURITY':
            return '/dashboard/security-dashboard/'
        elif role == 'HOST':
            return '/dashboard/host-dashboard/'
    
    return '/dashboard/admin-dashboard/'



def user_logout(request):
    """Handle user logout."""
    user = request.user
    logout(request)
    
    # Log user logout activity (user still available before logout)
    UserActivityLog.objects.create(user=user, action="User Logged Out")
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'redirect': '/'
        })
    
    messages.info(request, 'You have been logged out successfully.')
    return redirect('home')


def landing_page(request):
    """Show landing page for unauthenticated users, redirect authenticated users to dashboard."""
    if request.user.is_authenticated:
        return redirect_to_role_based_dashboard(request.user)
    
    return render(request, 'landing/home.html')


def home_redirect(request):
    """Redirect authenticated users to their dashboard."""
    return redirect_to_role_based_dashboard(request.user)


@login_required
def user_profile(request):
    """User profile page with profile management."""
    user = request.user
    profile = getattr(user, 'userprofile', None)
    
    # Get activity stats
    visitors_handled = 0
    approvals_done = 0
    checkins_processed = 0
    
    if profile:
        if profile.role == 'HOST':
            visitors_handled = Visitor.objects.filter(host=user).count()
            approvals_done = Visitor.objects.filter(host=user, status__in=['APPROVED', 'REJECTED']).count()
        elif profile.role == 'SECURITY':
            checkins_processed = Visitor.objects.filter(status='CHECKED_IN').count()
        elif profile.role == 'ADMIN':
            visitors_handled = Visitor.objects.count()
    
    context = {
        'user': user,
        'profile': profile,
        'departments': Department.objects.filter(is_active=True),
        'visitors_handled': visitors_handled,
        'approvals_done': approvals_done,
        'checkins_processed': checkins_processed,
    }
    
    return render(request, 'accounts/profile.html', context)


@login_required
@require_POST
def update_profile(request):
    """AJAX endpoint to update user profile."""
    user = request.user
    profile = getattr(user, 'userprofile', None)
    first_name = request.POST.get('first_name', '').strip()
    last_name = request.POST.get('last_name', '').strip()
    phone_number = request.POST.get('phone_number', '').strip()
    dept_id = request.POST.get('department', '').strip()

    errors = {}
    if not first_name:
        errors['first_name'] = 'Please fill First Name.'
    if not last_name:
        errors['last_name'] = 'Please fill Last Name.'
    if not phone_number:
        errors['phone_number'] = 'Please fill Phone Number.'

    department = None
    if dept_id:
        try:
            department = Department.objects.get(id=dept_id, is_active=True)
        except Department.DoesNotExist:
            errors['department'] = 'Please choose a valid department.'

    if errors:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'errors': errors,
                'message': 'Please fill the required fields.'
            }, status=400)
        for error in errors.values():
            messages.error(request, error)
        return redirect('profile')

    user.first_name = first_name
    user.last_name = last_name
    user.save()
    
    # Update profile fields
    if profile:
        profile.phone_number = phone_number
        if department:
            profile.department = department
        profile.save()
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': 'Profile updated successfully.',
            'profile': {
                'full_name': user.get_full_name(),
                'phone': profile.phone_number if profile else phone_number,
                'department': profile.department.name if profile and profile.department else 'Unassigned',
            }
        })
    
    messages.success(request, 'Profile updated successfully!')
    return redirect('profile')


@login_required
def profile_data_api(request):
    """API for realtime profile data."""
    user = request.user
    profile = getattr(user, 'userprofile', None)
    
    data = {
        'last_login': (user.last_login.strftime('%B %d, %Y %I:%M %p') if user.last_login else 'Never'),
        'phone': profile.phone_number or 'Not set',
        'role': profile.get_role_display() if profile else 'User',
        'department': profile.department.name if profile and profile.department else 'Unassigned',
        'full_name': user.get_full_name(),
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'photo_url': profile.photo.url if profile and profile.photo else None,
    }
    
    # Add stats
    if profile:
        if profile.role == 'HOST':
            data['visitors_handled'] = Visitor.objects.filter(host=user).count()
            data['approvals_done'] = Visitor.objects.filter(host=user, status__in=['APPROVED', 'REJECTED']).count()
        elif profile.role == 'SECURITY':
            data['checkins_processed'] = VisitLog.objects.filter(check_in_by=user).count()
            data['checkouts_processed'] = VisitLog.objects.filter(check_out_by=user).count()
        elif profile.role == 'ADMIN':
            data['total_visitors'] = Visitor.objects.count()
            data['pending_visitors'] = Visitor.objects.filter(status='PENDING', is_active=True).count()
            data['checked_in_visitors'] = Visitor.objects.filter(status='CHECKED_IN', is_active=True).count()
    
    return JsonResponse(data)

def _build_notifications_data(user):
    """Build realtime notification payload for navbar and full page."""
    profile = getattr(user, 'userprofile', None)
    today = timezone.localdate()

    categories = []
    recent_items = []
    total_count = 0

    if profile:
        if profile.role == 'HOST':
            pending = Visitor.objects.filter(host=user, status='PENDING', is_active=True)
            approved = Visitor.objects.filter(host=user, status='APPROVED', is_active=True)
            checked_in = Visitor.objects.filter(host=user, status='CHECKED_IN', is_active=True)
            rejected = Visitor.objects.filter(host=user, status='REJECTED', is_active=True)
            completed = Visitor.objects.filter(host=user, status='CHECKED_OUT')

            categories = [
                {'label': 'My Approvals', 'count': pending.count(), 'icon': 'bi-hourglass-split', 'tone': 'warning', 'detail': 'Visitors waiting for your decision'},
                {'label': 'Approved', 'count': approved.count(), 'icon': 'bi-check-circle', 'tone': 'success', 'detail': 'Cleared for security check-in'},
                {'label': 'Checked In', 'count': checked_in.count(), 'icon': 'bi-person-check', 'tone': 'info', 'detail': 'Your visitors currently onsite'},
                {'label': 'Rejected', 'count': rejected.count(), 'icon': 'bi-x-circle', 'tone': 'danger', 'detail': 'Requests declined by you'},
                {'label': 'Completed', 'count': completed.count(), 'icon': 'bi-box-arrow-right', 'tone': 'secondary', 'detail': 'Visits already checked out'},
            ]
            total_count = pending.count() + approved.count() + checked_in.count()

            for visitor in Visitor.objects.filter(host=user).select_related('host').order_by('-updated_at')[:6]:
                recent_items.append({
                    'title': visitor.full_name,
                    'meta': f"{visitor.get_status_display()} • {visitor.host.username}",
                    'detail': visitor.purpose[:48],
                    'time': timezone.localtime(visitor.updated_at).strftime('%b %d, %I:%M %p'),
                    'icon': 'bi-person-badge',
                    'tone': 'info',
                })

        elif profile.role == 'SECURITY':
            approved = Visitor.objects.filter(status='APPROVED', is_active=True)
            checked_in = Visitor.objects.filter(status='CHECKED_IN', is_active=True)
            checked_out_today = VisitLog.objects.filter(check_out_time__date=today)
            my_checkins = VisitLog.objects.filter(check_in_by=user)
            my_checkouts = VisitLog.objects.filter(check_out_by=user)

            categories = [
                {'label': 'Ready Queue', 'count': approved.count(), 'icon': 'bi-box-arrow-in-right', 'tone': 'success', 'detail': 'Approved visitors ready at the desk'},
                {'label': 'Live Occupancy', 'count': checked_in.count(), 'icon': 'bi-person-check', 'tone': 'info', 'detail': 'Visitors currently inside'},
                {'label': 'Checked Out Today', 'count': checked_out_today.count(), 'icon': 'bi-box-arrow-right', 'tone': 'secondary', 'detail': 'Departures completed today'},
                {'label': 'My Check-Ins', 'count': my_checkins.count(), 'icon': 'bi-shield-check', 'tone': 'primary', 'detail': 'Visitors checked in by you'},
                {'label': 'My Check-Outs', 'count': my_checkouts.count(), 'icon': 'bi-door-open', 'tone': 'warning', 'detail': 'Visitors checked out by you'},
            ]
            total_count = approved.count() + checked_in.count()

            for log in VisitLog.objects.select_related('visitor', 'visitor__host').order_by('-updated_at')[:6]:
                status = 'Checked Out' if log.check_out_time else 'Checked In' if log.check_in_time else 'Pending'
                time_value = log.check_out_time or log.check_in_time or log.updated_at
                recent_items.append({
                    'title': log.visitor.full_name,
                    'meta': f"{status} • {log.visitor.host.username}",
                    'detail': log.visitor.purpose[:48],
                    'time': timezone.localtime(time_value).strftime('%b %d, %I:%M %p'),
                    'icon': 'bi-upc-scan',
                    'tone': 'primary',
                })

        elif profile.role == 'ADMIN':
            pending = Visitor.objects.filter(status='PENDING', is_active=True)
            approved = Visitor.objects.filter(status='APPROVED', is_active=True)
            checked_in = Visitor.objects.filter(status='CHECKED_IN', is_active=True)
            checked_out_today = VisitLog.objects.filter(check_out_time__date=today)
            total_visitors = Visitor.objects.filter(is_active=True)

            categories = [
                {'label': 'Pending Approvals', 'count': pending.count(), 'icon': 'bi-hourglass-split', 'tone': 'warning', 'detail': 'Requests waiting on hosts'},
                {'label': 'Approved Queue', 'count': approved.count(), 'icon': 'bi-check-circle', 'tone': 'success', 'detail': 'Visitors ready for check-in'},
                {'label': 'Checked In', 'count': checked_in.count(), 'icon': 'bi-person-check', 'tone': 'info', 'detail': 'Visitors currently onsite'},
                {'label': 'Checked Out Today', 'count': checked_out_today.count(), 'icon': 'bi-box-arrow-right', 'tone': 'secondary', 'detail': 'Completed departures today'},
                {'label': 'Total Visitors', 'count': total_visitors.count(), 'icon': 'bi-people-fill', 'tone': 'primary', 'detail': 'All active visitor records'},
            ]
            total_count = pending.count() + approved.count() + checked_in.count()

            for visitor in Visitor.objects.select_related('host').order_by('-updated_at')[:6]:
                recent_items.append({
                    'title': visitor.full_name,
                    'meta': f"{visitor.get_status_display()} • {visitor.host.username}",
                    'detail': visitor.purpose[:48],
                    'time': timezone.localtime(visitor.updated_at).strftime('%b %d, %I:%M %p'),
                    'icon': 'bi-bar-chart',
                    'tone': 'primary',
                })

    return {
        'total_count': total_count,
        'categories': categories,
        'recent_items': recent_items,
    }


@login_required
def notifications_page(request):
    """Full notifications page."""
    payload = _build_notifications_data(request.user)
    context = {
        'notification_total': payload['total_count'],
        'notification_categories': payload['categories'],
        'notification_recent_items': payload['recent_items'],
    }
    return render(request, 'accounts/notifications.html', context)


@login_required
def notifications_api(request):
    """Realtime notification payload for the navbar tray."""
    return JsonResponse(_build_notifications_data(request.user))


@login_required
@require_POST
def upload_profile_photo(request):
    """AJAX photo upload."""
    user = request.user
    profile = getattr(user, 'userprofile', None)
    
    if 'photo' in request.FILES:
        photo = request.FILES['photo']
        # Basic validation
        if photo.size > 5 * 1024 * 1024:  # 5MB
            return JsonResponse({'success': False, 'error': 'File too large (max 5MB)'}, status=400)
        if not photo.content_type.startswith('image/'):
            return JsonResponse({'success': False, 'error': 'Invalid image type'}, status=400)
        
        # Save
        if profile:
            profile.photo = photo
            profile.save()
        
        return JsonResponse({
            'success': True,
            'photo_url': profile.photo.url if profile.photo else None,
            'message': 'Photo updated'
        })
    
    # Remove photo
    if request.POST.get('action') == 'remove':
        if profile and profile.photo:
            profile.photo.delete()
            profile.photo = None
            profile.save()
        return JsonResponse({'success': True, 'message': 'Photo removed'})
    
    return JsonResponse({'success': False, 'error': 'No photo provided'}, status=400)


@login_required
@require_POST
def change_password(request):
    """AJAX endpoint to change user password."""
    from django.contrib.auth import update_session_auth_hash
    from django.contrib.auth.forms import PasswordChangeForm
    
    user = request.user
    old_password = request.POST.get('old_password', '').strip()
    new_password1 = request.POST.get('new_password1', '').strip()
    new_password2 = request.POST.get('new_password2', '').strip()

    field_errors = {}
    if not old_password:
        field_errors['old_password'] = 'Please fill Current Password.'
    if not new_password1:
        field_errors['new_password1'] = 'Please fill New Password.'
    if not new_password2:
        field_errors['new_password2'] = 'Please fill Confirm Password.'

    if field_errors:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'errors': field_errors,
                'error': 'Please fill the required password fields.'
            }, status=400)
        for error in field_errors.values():
            messages.error(request, error)
        return redirect('profile')
    
    # Validate passwords
    if not user.check_password(old_password):
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'errors': {'old_password': 'Current password is incorrect'},
                'error': 'Current password is incorrect'
            }, status=400)
        messages.error(request, 'Current password is incorrect.')
        return redirect('profile')
    
    if new_password1 != new_password2:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'errors': {'new_password2': 'New passwords do not match'},
                'error': 'New passwords do not match'
            }, status=400)
        messages.error(request, 'New passwords do not match.')
        return redirect('profile')
    
    if len(new_password1) < 8:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'errors': {'new_password1': 'Password must be at least 8 characters'},
                'error': 'Password must be at least 8 characters'
            }, status=400)
        messages.error(request, 'Password must be at least 8 characters.')
        return redirect('profile')
    
    # Set new password
    user.set_password(new_password1)
    user.save()
    update_session_auth_hash(request, user)
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': 'Password updated successfully.'
        })
    
    messages.success(request, 'Password changed successfully!')
    return redirect('profile')


def user_signup(request):
    """Handle user registration (signup) with AJAX support and role selection."""
    if request.user.is_authenticated:
        return redirect_to_role_based_dashboard(request.user)

    if request.method == 'POST':
        # Get form data
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        email = request.POST.get('email', '').strip().lower()
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        confirm_password = request.POST.get('confirm_password', '')
        phone = request.POST.get('phone', '').strip()
        department_id = request.POST.get('department', '')
        role = request.POST.get('role', 'HOST')  # Get selected role
        security_code = request.POST.get('security_code', '').strip() if role in ['SECURITY', 'ADMIN'] else ''

# Dynamic field-specific validation
        field_errors = {}

        # Required fields validation
        if not first_name:
            field_errors['first_name'] = 'First name is required'
        if not last_name:
            field_errors['last_name'] = 'Last name is required'
        if not email:
            field_errors['email'] = 'Email is required'
        if not username:
            field_errors['username'] = 'Username is required'
        if not password:
            field_errors['password'] = 'Password is required'
        if not confirm_password:
            field_errors['confirm_password'] = 'Please confirm your password'

        # Email format validation
        if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            field_errors['email'] = 'Please enter a valid email address'

        # Password match validation
        if password and confirm_password and password != confirm_password:
            field_errors['confirm_password'] = 'Passwords do not match'

        # Password length validation
        if password and len(password) < 8:
            field_errors['password'] = 'Password must be at least 8 characters'

        # Role validation
        if role not in ['HOST', 'SECURITY', 'ADMIN']:
            field_errors['role'] = 'Please select a valid role'

        # Security code validation for SECURITY and ADMIN roles
        if role == 'SECURITY':
            if not security_code:
                field_errors['security_code'] = 'Security code is required for Security role'
            elif security_code != getattr(settings, 'SECURITY_REGISTRATION_CODE', ''):
                field_errors['security_code'] = 'Invalid security code for Security role'
        elif role == 'ADMIN':
            if not security_code:
                field_errors['security_code'] = 'Security code is required for Admin role'
            elif security_code != getattr(settings, 'ADMIN_REGISTRATION_CODE', ''):
                field_errors['security_code'] = 'Invalid security code for Admin role'

        # Username uniqueness check
        if username and User.objects.filter(username__iexact=username).exists():
            field_errors['username'] = 'Username already exists. Please choose another.'

        # Email uniqueness check (earlier return for better UX)
        if email and User.objects.filter(email__iexact=email).exists():
            return JsonResponse({
                'success': False, 
                'errors': {'email': 'Account already exists with this email. Please sign in.'}
            }, status=400)
        
        if email:
            if User.objects.filter(email=email).exists():
                return JsonResponse({
                    'success': False,
                    'error': 'Account already exists. Please sign in.',
                    'redirect': '/login/'
                }, status=400)

# Return field-specific errors for dynamic frontend validation
        if field_errors:
            return JsonResponse({
                'success': False,
                'errors': field_errors
            }, status=400)

        # Create user
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )

            # Create or get user profile and set role based on selection
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.role = role  # Set role based on selection (HOST, SECURITY, or ADMIN)
            
            # Set department if provided
            if department_id:
                try:
                    dept = Department.objects.get(id=department_id)
                    profile.department = dept
                except Department.DoesNotExist:
                    pass
            
            # Set phone if provided
            if phone:
                profile.phone_number = phone
            
            profile.save()

            # Return success response
            return JsonResponse({
                'success': True,
                'message': 'Account created successfully! Please sign in.',
                'redirect': '/login/'
            })

        except IntegrityError:
            return JsonResponse({
                'success': False,
                'errors': {'username': 'Username already exists. Please choose a different username.'}
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': 'An error occurred during registration. Please try again.'
            }, status=400)


    departments = Department.objects.all()
    return render(request, 'auth/signup.html', {'departments': departments})

def forgot_password(request):
    """Handle forgot password form."""
    if request.method == 'POST':
        email = request.POST.get('email')
        if email:
            if User.objects.filter(email__iexact=email).exists():
                messages.success(request, 'Password reset instructions sent to your email.')
            else:
                messages.info(request, 'If an account with that email exists, instructions have been sent.')
        return redirect('accounts:password_reset_sent')
    return render(request, 'auth/forgot_password.html')

def password_reset_sent(request):
    """Password reset sent confirmation page."""
    return render(request, 'auth/password_reset_sent.html')

