from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.urls import reverse
from accounts.decorators import role_required
from accounts.models import UserActivityLog
from .models import Visitor
from visits.models import VisitLog
from django.utils import timezone


def _ajax_response(request, message, ok=True, status=200):
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': ok, 'message': message}, status=status)
    return HttpResponse(message, status=status)


def _serialize_visitor(visitor):
    visit_log = getattr(visitor, 'visit_log', None)
    return {
        'id': visitor.id,
        'full_name': visitor.full_name,
        'contact_number': visitor.contact_number,
        'email': visitor.email or '',
        'company_name': visitor.company_name or '',
        'visitor_type': visitor.visitor_type or '',
        'purpose': visitor.purpose or '',
        'id_proof_type': visitor.id_proof_type or '',
        'id_proof_number': visitor.id_proof_number or '',
        'host': visitor.host.username if visitor.host else '',
        'status': visitor.status,
        'status_display': visitor.get_status_display(),
        'expected_date': visitor.expected_date,
        'expected_time': visitor.expected_time,
        'created_at': visitor.created_at,
        'updated_at': visitor.updated_at,
        'approval_time': visitor.approval_time,
        'check_in_time': getattr(visit_log, 'check_in_time', None),
        'check_out_time': getattr(visit_log, 'check_out_time', None),
    }


# 🔹 HOST - Approve Visitor
@login_required
@role_required(['HOST'])
@require_POST
def approve_visitor(request, visitor_id):
    visitor = get_object_or_404(Visitor, id=visitor_id, host=request.user)

    if visitor.status != 'PENDING':
        return _ajax_response(request, "Visitor is not in pending state.", ok=False, status=400)

    visitor.approve(request.user)
    return _ajax_response(request, "Visitor approved successfully.")


# 🔹 HOST - Reject Visitor
@login_required
@role_required(['HOST'])
@require_POST
def reject_visitor(request, visitor_id):
    visitor = get_object_or_404(Visitor, id=visitor_id, host=request.user)

    if visitor.status != 'PENDING':
        return _ajax_response(request, "Visitor is not in pending state.", ok=False, status=400)

    visitor.reject(request.user)
    return _ajax_response(request, "Visitor rejected successfully.")


@login_required
@role_required(['ADMIN', 'SECURITY'])
@require_POST
def check_in_visitor(request, visitor_id):
    visitor = get_object_or_404(Visitor, id=visitor_id)

    if visitor.status != 'APPROVED':
        return _ajax_response(request, "Visitor must be approved before check-in.", ok=False, status=400)

    visit_log, created = VisitLog.objects.get_or_create(visitor=visitor)

    try:
        visit_log.check_in(request.user)
        UserActivityLog.objects.create(user=request.user, action="Visitor Checked In")
    except ValueError as e:
        return _ajax_response(request, str(e), ok=False, status=400)

    return _ajax_response(request, "Visitor checked in successfully.")


@login_required
@role_required(['ADMIN', 'SECURITY'])
@require_POST
def check_out_visitor(request, visitor_id):
    visitor = get_object_or_404(Visitor, id=visitor_id)

    visit_log = get_object_or_404(VisitLog, visitor=visitor)

    try:
        visit_log.check_out(request.user)
        UserActivityLog.objects.create(user=request.user, action="Visitor Checked Out")
    except ValueError as e:
        return _ajax_response(request, str(e), ok=False, status=400)

    return _ajax_response(request, "Visitor checked out successfully.")


# 🔹 HOST - View Pending Visitors
@login_required
@role_required(['HOST'])
def host_pending_visitors(request):
    """Display pending visitors for the host to approve/reject."""
    today = timezone.now().date()
    visitors = Visitor.objects.filter(
        host=request.user,
        status='PENDING',
        is_active=True
    ).select_related('host').order_by('expected_date', 'expected_time', '-created_at')
    context = {
        'visitors': visitors,
        'pending_count': visitors.count(),
        'today_pending_count': visitors.filter(created_at__date=today).count(),
        'scheduled_today_count': visitors.filter(expected_date=today).count(),
        'overdue_count': visitors.filter(expected_date__lt=today).count(),
    }
    return render(request, 'visitors/pending_list.html', context)


# 🔹 HOST - View All Visitors
@login_required
@role_required(['HOST'])
def host_all_visitors(request):
    """Display all visitors for the host."""
    visitors = Visitor.objects.filter(host=request.user).select_related('host', 'visit_log')
    active_visitors = visitors.filter(is_active=True)
    context = {
        'visitors': visitors,
        'total_count': visitors.count(),
        'pending_count': active_visitors.filter(status='PENDING').count(),
        'approved_count': active_visitors.filter(status='APPROVED').count(),
        'checked_in_count': active_visitors.filter(status='CHECKED_IN').count(),
        'checked_out_count': visitors.filter(status='CHECKED_OUT').count(),
        'rejected_count': active_visitors.filter(status='REJECTED').count(),
    }
    return render(request, 'visitors/host_list.html', context)


# 🔹 SECURITY - Check-In Panel
@login_required
@role_required(['SECURITY'])
def security_checkin(request):
    """Display approved visitors ready for check-in."""
    visitors = Visitor.objects.filter(status='APPROVED', is_active=True).select_related('host')
    return render(request, 'visitors/checkin_panel.html', {'visitors': visitors})


# 🔹 SECURITY - All Visitors
@login_required
@role_required(['SECURITY'])
def security_visitors(request):
    """Display all visitors for security."""
    today = timezone.now().date()
    visitors = Visitor.objects.filter(is_active=True).select_related('host', 'visit_log')
    context = {
        'visitors': visitors,
        'total_count': visitors.count(),
        'approved_count': visitors.filter(status='APPROVED').count(),
        'checked_in_count': visitors.filter(status='CHECKED_IN').count(),
        'checked_out_today': VisitLog.objects.filter(check_out_time__date=today).count(),
        'pending_count': visitors.filter(status='PENDING').count(),
    }
    return render(request, 'visitors/security_list.html', context)


@login_required
@role_required(['HOST'])
def host_pending_visitors_api(request):
    """Return live data for the host pending approvals page."""
    today = timezone.now().date()
    visitors = Visitor.objects.filter(
        host=request.user,
        status='PENDING',
        is_active=True
    ).select_related('host').order_by('expected_date', 'expected_time', '-created_at')

    data = {
        'pending_count': visitors.count(),
        'today_pending_count': visitors.filter(created_at__date=today).count(),
        'scheduled_today_count': visitors.filter(expected_date=today).count(),
        'overdue_count': visitors.filter(expected_date__lt=today).count(),
        'visitors': [_serialize_visitor(visitor) for visitor in visitors[:50]],
    }
    return JsonResponse(data)


@login_required
@role_required(['HOST'])
def host_all_visitors_api(request):
    """Return live data for the host all visitors page."""
    visitors = Visitor.objects.filter(host=request.user).select_related('host', 'visit_log')
    active_visitors = visitors.filter(is_active=True)

    data = {
        'total_count': visitors.count(),
        'pending_count': active_visitors.filter(status='PENDING').count(),
        'approved_count': active_visitors.filter(status='APPROVED').count(),
        'checked_in_count': active_visitors.filter(status='CHECKED_IN').count(),
        'checked_out_count': visitors.filter(status='CHECKED_OUT').count(),
        'rejected_count': active_visitors.filter(status='REJECTED').count(),
        'visitors': [_serialize_visitor(visitor) for visitor in visitors.order_by('-created_at')[:100]],
    }
    return JsonResponse(data)


@login_required
@role_required(['SECURITY'])
def security_visitors_api(request):
    """Return live data for the security all visitors page."""
    today = timezone.now().date()
    visitors = Visitor.objects.filter(is_active=True).select_related('host', 'visit_log')

    data = {
        'total_count': visitors.count(),
        'approved_count': visitors.filter(status='APPROVED').count(),
        'checked_in_count': visitors.filter(status='CHECKED_IN').count(),
        'checked_out_today': VisitLog.objects.filter(check_out_time__date=today).count(),
        'pending_count': visitors.filter(status='PENDING').count(),
        'visitors': [_serialize_visitor(visitor) for visitor in visitors.order_by('-created_at')[:100]],
    }
    return JsonResponse(data)


# 🔹 HOST - Create Visitor
@login_required
@role_required(['HOST'])
def create_visitor(request):
    """Create a new visitor by host."""
    from django.contrib import messages
    from datetime import datetime
    form_data = {
        'full_name': '',
        'contact_number': '',
        'email': '',
        'company_name': '',
        'visitor_type': '',
        'purpose': '',
        'id_proof_type': '',
        'id_proof_number': '',
        'expected_date': '',
        'expected_time': '',
    }

    if request.method == 'POST':
        form_data = {
            key: (request.POST.get(key) or '').strip()
            for key in form_data
        }
        errors = {}

        full_name = form_data['full_name']
        contact_number = form_data['contact_number']
        email = form_data['email']
        company_name = form_data['company_name']
        visitor_type = form_data['visitor_type']
        purpose = form_data['purpose']
        id_proof_type = form_data['id_proof_type']
        id_proof_number = form_data['id_proof_number']
        expected_date = form_data['expected_date']
        expected_time = form_data['expected_time']

        required_fields = {
            'full_name': 'Full name is required.',
            'contact_number': 'Phone number is required.',
            'company_name': 'Company name is required.',
            'visitor_type': 'Visitor type is required.',
            'purpose': 'Purpose is required.',
            'id_proof_type': 'ID proof type is required.',
            'id_proof_number': 'ID proof number is required.',
            'expected_date': 'Expected date is required.',
            'expected_time': 'Expected time is required.',
        }

        for field, message in required_fields.items():
            if not form_data[field]:
                errors[field] = message

        if contact_number and (not contact_number.isdigit() or len(contact_number) < 10):
            errors['contact_number'] = 'Enter a valid phone number with at least 10 digits.'

        if email and '@' not in email:
            errors['email'] = 'Enter a valid email address.'

        # Parse expected date
        expected_date_obj = None
        if expected_date:
            try:
                expected_date_obj = datetime.strptime(expected_date, '%Y-%m-%d').date()
            except ValueError:
                errors['expected_date'] = 'Enter a valid expected date.'

        # Parse expected time
        expected_time_obj = None
        if expected_time:
            try:
                expected_time_obj = datetime.strptime(expected_time, '%H:%M').time()
            except ValueError:
                errors['expected_time'] = 'Enter a valid expected time.'

        if errors:
            messages.error(request, 'Please correct the highlighted fields and try again.')
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Please correct the highlighted fields and try again.',
                    'errors': errors,
                }, status=400)
            return render(request, 'visitors/create_visitor.html', {'errors': errors, 'form_data': form_data})

        visitor = Visitor.objects.create(
            full_name=full_name,
            contact_number=contact_number,
            email=email,
            company_name=company_name,
            visitor_type=visitor_type,
            purpose=purpose,
            id_proof_type=id_proof_type,
            id_proof_number=id_proof_number,
            expected_date=expected_date_obj,
            expected_time=expected_time_obj,
            host=request.user,
            status='PENDING'
        )

        messages.success(request, 'Visitor registered successfully!')
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': 'Visitor registered successfully!',
                'visitor': _serialize_visitor(visitor),
                'redirect_url': reverse('host_all_visitors'),
            })
        return redirect('host_all_visitors')

    return render(request, 'visitors/create_visitor.html', {'errors': {}, 'form_data': form_data})
