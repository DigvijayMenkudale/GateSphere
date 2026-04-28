from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from accounts.decorators import role_required
from visitors.models import Visitor
from visits.models import VisitLog
from django.utils import timezone
from django.db.models import Count, Q
from django.contrib.auth.models import User
from departments.models import Department
from django.http import HttpResponse, JsonResponse
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models.functions import TruncDate, TruncMonth
import csv
import json
from datetime import timedelta, datetime


def _serialize_visitor(v):
    return {
        'id': v.id,
        'full_name': v.full_name,
        'contact_number': v.contact_number,
        'purpose': (v.purpose[:60] + '...') if v.purpose and len(v.purpose) > 60 else (v.purpose or ''),
        'host': v.host.username if v.host else '',
        'status': v.status,
        'approval_time': getattr(v, 'approval_time', None),
        'created_at': getattr(v, 'created_at', None),
        'expected_date': getattr(v, 'expected_date', None),
        'expected_time': getattr(v, 'expected_time', None),
        'id_proof_type': getattr(v, 'id_proof_type', ''),
        'id_proof_number': getattr(v, 'id_proof_number', ''),
        'check_in_time': getattr(getattr(v, 'visit_log', None), 'check_in_time', None),
        'check_out_time': getattr(getattr(v, 'visit_log', None), 'check_out_time', None),
    }


def _department_code(name):
    parts = [part for part in name.split() if part]
    if len(parts) >= 2:
        return ''.join(part[0] for part in parts[:3]).upper()
    return name[:3].upper()


def _shift_month(value, months):
    month_index = (value.month - 1) + months
    year = value.year + (month_index // 12)
    month = (month_index % 12) + 1
    return value.replace(year=year, month=month, day=1)


def _build_admin_analytics():
    today = timezone.localdate()
    active_visitors = Visitor.objects.filter(is_active=True)

    month_end = today.replace(day=1)
    month_start = _shift_month(month_end, -5)
    day_start = today - timedelta(days=6)

    monthly_lookup = {
        item['period'].date(): item['count']
        for item in (
            active_visitors
            .filter(created_at__date__gte=month_start)
            .annotate(period=TruncMonth('created_at'))
            .values('period')
            .annotate(count=Count('id'))
            .order_by('period')
        )
    }
    monthly_points = []
    cursor = month_start
    while cursor <= month_end:
        monthly_points.append({
            'label': cursor.strftime('%b %Y'),
            'count': monthly_lookup.get(cursor, 0),
        })
        cursor = _shift_month(cursor, 1)

    daily_lookup = {
        item['period']: item['count']
        for item in (
            active_visitors
            .filter(created_at__date__gte=day_start)
            .annotate(period=TruncDate('created_at'))
            .values('period')
            .annotate(count=Count('id'))
            .order_by('period')
        )
    }
    daily_points = []
    for offset in range(7):
        day = day_start + timedelta(days=offset)
        daily_points.append({
            'label': day.strftime('%d %b'),
            'count': daily_lookup.get(day, 0),
        })

    current_month_start = month_end
    previous_month_start = _shift_month(month_end, -1)

    return {
        'monthly_visitors': monthly_points,
        'daily_visitors': daily_points,
        'current_month_total': monthly_lookup.get(current_month_start, 0),
        'previous_month_total': monthly_lookup.get(previous_month_start, 0),
        'last_7_days_total': sum(item['count'] for item in daily_points),
    }


@login_required
def dashboard_index(request):
    """Redirect to role-based dashboard."""
    user = request.user
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


@login_required
@role_required(['ADMIN'])
def admin_dashboard(request):
    """Admin dashboard with overview statistics and check-in sections."""
    today = timezone.now().date()
    
    # restrict stats to active visitors unless otherwise noted
    active_visitors = Visitor.objects.filter(is_active=True)
    total_visitors = active_visitors.count()
    pending_visitors = active_visitors.filter(status='PENDING').count()
    approved_visitors_count = active_visitors.filter(status='APPROVED').count()
    checked_in = active_visitors.filter(status='CHECKED_IN').count()
    checked_out = Visitor.objects.filter(status='CHECKED_OUT').count()  # checked out may or may not be active
    today_visitors = active_visitors.filter(created_at__date=today).count()
    
    # Get visitors ready for check-in and currently checked in (for the new sections)
    approved_visitors = active_visitors.filter(status='APPROVED').select_related('host')
    checked_in_visitors = active_visitors.filter(status='CHECKED_IN').select_related('host', 'visit_log')
    checked_out_today = VisitLog.objects.filter(check_out_time__date=today).count()
    
    context = {
        'total_visitors': total_visitors,
        'pending_visitors': pending_visitors,
        'approved_visitors': approved_visitors_count,
        'checked_in': checked_in,
        'checked_out': checked_out,
        'today_visitors': today_visitors,
        'approved_visitors_list': approved_visitors,
        'checked_in_visitors_list': checked_in_visitors,
        'checked_out_today': checked_out_today,
    }
    return render(request, 'dashboard/admin_dashboard.html', context)


@login_required
@role_required(['SECURITY'])
def security_dashboard(request):
    """Security dashboard with check-in panel."""
    today = timezone.now().date()
    
    # active visitors queryset to reuse
    active_visitors = Visitor.objects.filter(is_active=True)

    # Get approved visitors ready for check-in
    approved_visitors = active_visitors.filter(status='APPROVED').select_related('host')
    # Get currently checked in visitors
    checked_in_visitors = active_visitors.filter(status='CHECKED_IN').select_related('host', 'visit_log')
    # Get counts (call .count() once and send to template)
    approved_count = approved_visitors.count()
    checked_in_count = checked_in_visitors.count()

    # Get checked out today (visit logs store check_out_time)
    checked_out_today = VisitLog.objects.filter(check_out_time__date=today).count()
    # Get today's visitors (created today and active)
    today_visitors = active_visitors.filter(created_at__date=today).count()

    context = {
        'approved_visitors': approved_visitors,
        'approved_count': approved_count,
        'checked_in_visitors': checked_in_visitors,
        'checked_in_count': checked_in_count,
        'checked_out_today': checked_out_today,
        'today_visitors': today_visitors,
    }
    return render(request, 'dashboard/security_dashboard.html', context)


@login_required
@role_required(['HOST'])
def host_dashboard(request):
    """Host dashboard with pending approvals."""
    today = timezone.now().date()
    tomorrow = today + timedelta(days=1)
    
    # Get pending visitors for this host
    pending_visitors = Visitor.objects.filter(
        host=request.user,
        status='PENDING',
        is_active=True
    ).select_related('host')
    
    # Get all active visitors for this host (limit preview)
    all_visitors = Visitor.objects.filter(host=request.user, is_active=True).select_related('host', 'visit_log').order_by('-created_at')[:10]
    
    # Get counts
    total_visitors = Visitor.objects.filter(host=request.user, is_active=True).count()
    approved_count = Visitor.objects.filter(host=request.user, status='APPROVED', is_active=True).count()
    completed_count = Visitor.objects.filter(host=request.user, status='CHECKED_OUT').count()
    pending_count = pending_visitors.count()
    
    # ===== NEW: Visitor Status Overview =====
    status_pending = Visitor.objects.filter(host=request.user, status='PENDING', is_active=True).count()
    status_approved = Visitor.objects.filter(host=request.user, status='APPROVED', is_active=True).count()
    status_checked_in = Visitor.objects.filter(host=request.user, status='CHECKED_IN', is_active=True).count()
    status_checked_out = Visitor.objects.filter(host=request.user, status='CHECKED_OUT').count()
    status_rejected = Visitor.objects.filter(host=request.user, status='REJECTED', is_active=True).count()
    
    # ===== NEW: Upcoming Visitors (today and tomorrow) =====
    upcoming_visitors = Visitor.objects.filter(
        host=request.user,
        is_active=True
    ).filter(
        Q(expected_date__gte=today, expected_date__lte=tomorrow) |
        Q(expected_date__isnull=True, created_at__date__gte=today, created_at__date__lte=tomorrow)
    ).exclude(status='CHECKED_OUT').select_related('host').order_by('expected_date', 'expected_time', 'created_at')[:10]
    
    # ===== NEW: Visitor Timeline Summary (recent 5) =====
    recent_visit_logs = VisitLog.objects.filter(
        visitor__host=request.user
    ).select_related('visitor', 'check_in_by', 'check_out_by').order_by('-created_at')[:5]

    context = {
        'pending_visitors': pending_visitors,
        'pending_count': pending_count,
        'all_visitors': all_visitors,
        'total_visitors': total_visitors,
        'approved_count': approved_count,
        'completed_count': completed_count,
        # New context data
        'status_pending': status_pending,
        'status_approved': status_approved,
        'status_checked_in': status_checked_in,
        'status_checked_out': status_checked_out,
        'status_rejected': status_rejected,
        'upcoming_visitors': upcoming_visitors,
        'recent_visit_logs': recent_visit_logs,
        'export_date': '',
    }
    return render(request, 'dashboard/host_dashboard.html', context)


@login_required
@role_required(['ADMIN'])
def admin_panel(request):
    """Admin Panel with user management, department management, analytics, role management, activity logs."""
    users = User.objects.select_related('userprofile', 'userprofile__department').all()
    departments = Department.objects.annotate(user_count=Count('userprofile'))
    department_rows = [
        {
            'name': department.name,
            'code': _department_code(department.name),
            'user_count': department.user_count,
        }
        for department in departments
    ]
    today = timezone.now().date()
    total_visitors = Visitor.objects.filter(is_active=True).count()
    today_visitors = Visitor.objects.filter(created_at__date=today, is_active=True).count()
    pending_visitors = Visitor.objects.filter(status='PENDING', is_active=True).count()
    approved_visitors = Visitor.objects.filter(status='APPROVED', is_active=True).count()
    checked_in = Visitor.objects.filter(status='CHECKED_IN', is_active=True).count()
    checked_out = Visitor.objects.filter(status='CHECKED_OUT').count()
    admin_count = User.objects.filter(userprofile__role='ADMIN').count()
    security_count = User.objects.filter(userprofile__role='SECURITY').count()
    host_count = User.objects.filter(userprofile__role='HOST').count()
    recent_logs = VisitLog.objects.select_related('visitor', 'visitor__host', 'check_in_by', 'check_out_by').order_by('-created_at')[:20]
    analytics = _build_admin_analytics()
    context = {
        'users': users,
        'departments': departments,
        'department_rows': department_rows,
        'total_visitors': total_visitors,
        'today_visitors': today_visitors,
        'pending_visitors': pending_visitors,
        'approved_visitors': approved_visitors,
        'checked_in': checked_in,
        'checked_out': checked_out,
        'admin_count': admin_count,
        'security_count': security_count,
        'host_count': host_count,
        'recent_logs': recent_logs,
        'analytics_current_month_total': analytics['current_month_total'],
        'analytics_previous_month_total': analytics['previous_month_total'],
        'analytics_last_7_days_total': analytics['last_7_days_total'],
        'analytics_chart_data': analytics,
    }
    return render(request, 'dashboard/admin_panel.html', context)


@login_required
@role_required(['ADMIN'])
def admin_stats_api(request):
    """AJAX endpoint for real-time admin dashboard stats."""
    today = timezone.now().date()
    active_visitors = Visitor.objects.filter(is_active=True)
    analytics = _build_admin_analytics()
    data = {
        'total_visitors': active_visitors.count(),
        'pending_visitors': active_visitors.filter(status='PENDING').count(),
        'approved_visitors': active_visitors.filter(status='APPROVED').count(),
        'checked_in': active_visitors.filter(status='CHECKED_IN').count(),
        'checked_out': Visitor.objects.filter(status='CHECKED_OUT').count(),
        'today_visitors': active_visitors.filter(created_at__date=today).count(),
        'checked_out_today': VisitLog.objects.filter(check_out_time__date=today).count(),
        'analytics': analytics,
    }
    return JsonResponse(data)


@login_required
@role_required(['ADMIN'])
def admin_checkin_list_api(request):
    """AJAX endpoint returning approved and checked-in visitor lists as JSON."""
    active_visitors = Visitor.objects.filter(is_active=True)
    approved = active_visitors.filter(status='APPROVED').select_related('host')[:50]
    checked_in = active_visitors.filter(status='CHECKED_IN').select_related('host', 'visit_log')[:50]

    data = {
        'approved': [_serialize_visitor(v) for v in approved],
        'checked_in': [_serialize_visitor(v) for v in checked_in],
        'approved_count': approved.count(),
        'checked_in_count': checked_in.count(),
    }
    return JsonResponse(data)


@login_required
@role_required(['ADMIN'])
def admin_checkin_panel(request):
    """Admin Check-In Panel with advanced functionality."""
    today = timezone.now().date()
    active_visitors = Visitor.objects.filter(is_active=True)
    approved_visitors = active_visitors.filter(status='APPROVED').select_related('host')
    checked_in_visitors = active_visitors.filter(status='CHECKED_IN').select_related('host', 'visit_log')
    approved_count = approved_visitors.count()
    checked_in_count = checked_in_visitors.count()
    checked_out_today = VisitLog.objects.filter(check_out_time__date=today).count()
    today_visitors = active_visitors.filter(created_at__date=today).count()
    context = {
        'approved_visitors': approved_visitors,
        'approved_count': approved_count,
        'checked_in_visitors': checked_in_visitors,
        'checked_in_count': checked_in_count,
        'checked_out_today': checked_out_today,
        'today_visitors': today_visitors,
    }
    return render(request, 'dashboard/admin_checkin_panel.html', context)


@login_required
@role_required(['HOST'])
def host_dashboard_api(request):
    today = timezone.now().date()
    tomorrow = today + timedelta(days=1)
    host_visitors = Visitor.objects.filter(host=request.user)
    active_visitors = host_visitors.filter(is_active=True)
    pending_visitors = active_visitors.filter(status='PENDING').select_related('host').order_by('expected_date', 'expected_time', '-created_at')[:20]
    recent_visitors = active_visitors.select_related('host', 'visit_log').order_by('-created_at')[:10]
    upcoming_visitors = active_visitors.filter(
        Q(expected_date__gte=today, expected_date__lte=tomorrow) |
        Q(expected_date__isnull=True, created_at__date__gte=today, created_at__date__lte=tomorrow)
    ).exclude(status='CHECKED_OUT').select_related('host').order_by('expected_date', 'expected_time', 'created_at')[:10]
    recent_visit_logs = VisitLog.objects.filter(
        visitor__host=request.user
    ).select_related('visitor', 'check_in_by', 'check_out_by').order_by('-created_at')[:5]

    data = {
        'total_visitors': active_visitors.count(),
        'pending_count': pending_visitors.count(),
        'approved_count': active_visitors.filter(status='APPROVED').count(),
        'completed_count': host_visitors.filter(status='CHECKED_OUT').count(),
        'status_pending': active_visitors.filter(status='PENDING').count(),
        'status_approved': active_visitors.filter(status='APPROVED').count(),
        'status_checked_in': active_visitors.filter(status='CHECKED_IN').count(),
        'status_checked_out': host_visitors.filter(status='CHECKED_OUT').count(),
        'status_rejected': active_visitors.filter(status='REJECTED').count(),
        'pending_visitors': [_serialize_visitor(v) for v in pending_visitors],
        'recent_visitors': [_serialize_visitor(v) for v in recent_visitors],
        'upcoming_visitors': [_serialize_visitor(v) for v in upcoming_visitors],
        'recent_logs': [{
            'visitor': log.visitor.full_name,
            'check_in_time': log.check_in_time,
            'check_out_time': log.check_out_time,
        } for log in recent_visit_logs],
    }
    return JsonResponse(data)


@login_required
@role_required(['SECURITY'])
def security_dashboard_api(request):
    today = timezone.now().date()
    active_visitors = Visitor.objects.filter(is_active=True)
    approved_visitors = active_visitors.filter(status='APPROVED').select_related('host').order_by('-approval_time', '-created_at')[:25]
    checked_in_visitors = active_visitors.filter(status='CHECKED_IN').select_related('host', 'visit_log')[:25]
    data = {
        'approved_count': active_visitors.filter(status='APPROVED').count(),
        'checked_in_count': active_visitors.filter(status='CHECKED_IN').count(),
        'checked_out_today': VisitLog.objects.filter(check_out_time__date=today).count(),
        'today_visitors': active_visitors.filter(created_at__date=today).count(),
        'approved_visitors': [_serialize_visitor(v) for v in approved_visitors],
        'checked_in_visitors': [_serialize_visitor(v) for v in checked_in_visitors],
    }
    return JsonResponse(data)


@login_required
@role_required(['HOST'])
def export_visitors_csv(request):
    """Export visitors data as CSV for host dashboard."""
    export_date = request.GET.get('date')
    visitors = Visitor.objects.filter(host=request.user).select_related('host').order_by('-created_at')

    if export_date:
        try:
            parsed_date = datetime.strptime(export_date, '%Y-%m-%d').date()
            visitors = visitors.filter(
                Q(created_at__date=parsed_date) | Q(expected_date=parsed_date)
            )
        except ValueError:
            export_date = None
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    if export_date:
        filename_suffix = export_date.replace('-', '')
    else:
        filename_suffix = timezone.now().strftime('%Y%m%d_%H%M%S')
    response['Content-Disposition'] = 'attachment; filename="visitors_export_{}.csv"'.format(filename_suffix)
    
    writer = csv.writer(response)
    # Write header row
    writer.writerow([
        'Visitor Name', 'Contact', 'Email', 'Purpose',
        'Status', 'Created At', 'ID Proof Type', 'ID Proof Number'
    ])
    
    # Write data rows
    for visitor in visitors:
        writer.writerow([
            visitor.full_name,
            visitor.contact_number,
            visitor.email or '',
            visitor.purpose,
            visitor.get_status_display(),
            visitor.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            visitor.id_proof_type or '',
            visitor.id_proof_number or ''
        ])
    
    return response
