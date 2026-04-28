import re

from django.contrib import messages
from django.contrib.auth.models import User
from django.db.models import Max
from django.http import Http404, JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.html import escape
from django.utils.html import strip_tags
from django.utils.safestring import mark_safe
from django.views.decorators.http import require_GET, require_http_methods

from accounts.models import UserActivityLog
from visits.models import VisitLog
from visitors.models import Visitor

from .forms import ContactForm
from .models import ContactMessage, Page


PAGE_DETAILS = {
    "documentation": {
        "icon": "bi-book-half",
        "accent": "primary",
        "subtitle": "Product documentation, setup notes, and operational details for GateSphere.",
        "eyebrow": "Knowledge Base",
    },
    "api_reference": {
        "icon": "bi-code-slash",
        "accent": "info",
        "subtitle": "Endpoints, payload expectations, and integration notes for platform workflows.",
        "eyebrow": "Developer Docs",
    },
    "guides": {
        "icon": "bi-journal-richtext",
        "accent": "success",
        "subtitle": "Step-by-step walkthroughs for teams using GateSphere in day-to-day operations.",
        "eyebrow": "Guided Learning",
    },
    "blog": {
        "icon": "bi-rss",
        "accent": "warning",
        "subtitle": "Platform updates, product thinking, and operational best practices from the GateSphere team.",
        "eyebrow": "Latest Updates",
    },
    "help_center": {
        "icon": "bi-life-preserver",
        "accent": "info",
        "subtitle": "Search support answers, discover common workflows, and jump straight into the right next step.",
        "eyebrow": "Support Hub",
    },
    "status": {
        "icon": "bi-activity",
        "accent": "success",
        "subtitle": "Realtime platform health, live visitor operations, and the latest workflow activity across GateSphere.",
        "eyebrow": "System Health",
    },
    "terms": {
        "icon": "bi-file-earmark-text",
        "accent": "warning",
        "subtitle": "A clearer, responsive summary of the platform terms with live ownership and document metadata.",
        "eyebrow": "Legal",
    },
}


HELP_TOPICS = [
    {
        "title": "Register a visitor",
        "category": "Hosts",
        "summary": "Create visitors with purpose, ID proof, visit date, company, and expected arrival time.",
        "keywords": ["register", "create", "visitor", "host", "schedule", "new"],
        "icon": "bi-person-plus",
        "accent": "primary",
        "href": "/visitors/create/",
    },
    {
        "title": "Approve or reject requests",
        "category": "Approvals",
        "summary": "Hosts can review pending requests and make a decision directly from the dashboard.",
        "keywords": ["approve", "reject", "pending", "request", "host", "workflow"],
        "icon": "bi-check2-square",
        "accent": "success",
        "href": "/visitors/host/pending/",
    },
    {
        "title": "Check visitors in",
        "category": "Security",
        "summary": "Security staff can verify approved visitors and complete live check-in at the gate.",
        "keywords": ["security", "check in", "gate", "approved", "arrival", "entry"],
        "icon": "bi-box-arrow-in-right",
        "accent": "info",
        "href": "/visitors/security/",
    },
    {
        "title": "Check visitors out",
        "category": "Security",
        "summary": "Track who is still onsite and complete check-out to close the visit cleanly.",
        "keywords": ["check out", "onsite", "exit", "close", "visit", "security"],
        "icon": "bi-box-arrow-right",
        "accent": "warning",
        "href": "/dashboard/security/",
    },
    {
        "title": "Fix login and account issues",
        "category": "Accounts",
        "summary": "Reset passwords, verify account access, and keep your profile details current.",
        "keywords": ["login", "password", "account", "profile", "access", "signin"],
        "icon": "bi-person-lock",
        "accent": "danger",
        "href": "/profile/",
    },
    {
        "title": "Review visitor history",
        "category": "Reporting",
        "summary": "Search all visitors by status, host, company, or visit progress from responsive tables.",
        "keywords": ["history", "all visitors", "reporting", "search", "status", "records"],
        "icon": "bi-clock-history",
        "accent": "secondary",
        "href": "/visitors/host/all/",
    },
]


def _badge_tone(status):
    mapping = {
        "operational": "success",
        "healthy": "success",
        "active": "success",
        "degraded": "warning",
        "investigating": "warning",
        "delayed": "warning",
        "offline": "danger",
    }
    return mapping.get(str(status).lower(), "secondary")


def _render_inline_markdown(text):
    escaped = escape(text or "")
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"\*(.+?)\*", r"<em>\1</em>", escaped)
    escaped = re.sub(r"`(.+?)`", r"<code>\1</code>", escaped)
    return escaped


def _render_page_content(raw_content):
    content = (raw_content or "").replace("\\r\\n", "\n").replace("\\n", "\n").strip()
    if not content:
        return ""

    if re.search(r"<[a-zA-Z][^>]*>", content):
        return mark_safe(content)

    html_parts = []
    list_items = []

    def flush_list():
        nonlocal list_items
        if list_items:
            html_parts.append("<ul>" + "".join(list_items) + "</ul>")
            list_items = []

    for line in content.splitlines():
        stripped = line.strip()
        if not stripped:
            flush_list()
            continue

        heading_match = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if heading_match:
            flush_list()
            level = len(heading_match.group(1))
            html_parts.append(f"<h{level}>{_render_inline_markdown(heading_match.group(2))}</h{level}>")
            continue

        if stripped.startswith("- "):
            list_items.append(f"<li>{_render_inline_markdown(stripped[2:].strip())}</li>")
            continue

        flush_list()
        html_parts.append(f"<p>{_render_inline_markdown(stripped)}</p>")

    flush_list()
    return mark_safe("".join(html_parts))


def _build_page_metrics(page):
    clean_content = strip_tags(page.content or "")
    words = [word for word in clean_content.split() if word.strip()]
    word_count = len(words)
    read_time = max(1, round(word_count / 180)) if word_count else 1
    return word_count, read_time


def _related_pages(page):
    related = Page.objects.filter(
        slug__in=["documentation", "api_reference", "guides", "blog"],
        is_active=True,
    ).exclude(pk=page.pk).order_by("title")
    return [
        {
            "title": related_page.title,
            "updated_at": related_page.updated_at,
            "url": reverse(f"pages:{related_page.slug}"),
        }
        for related_page in related
    ]


def _support_stats():
    now = timezone.localtime()
    today = now.date()
    total_visitors = Visitor.objects.count()
    active_visitors = Visitor.objects.filter(is_active=True)
    total_messages = ContactMessage.objects.count()
    open_messages = ContactMessage.objects.filter(is_read=False).count()
    last_message = ContactMessage.objects.aggregate(last=Max("created_at"))["last"]

    return {
        "now": now,
        "total_visitors": total_visitors,
        "active_visitors": active_visitors.count(),
        "pending_visitors": active_visitors.filter(status="PENDING").count(),
        "checked_in_visitors": active_visitors.filter(status="CHECKED_IN").count(),
        "checked_out_today": VisitLog.objects.filter(check_out_time__date=today).count(),
        "support_messages": total_messages,
        "support_open_messages": open_messages,
        "support_closed_messages": max(total_messages - open_messages, 0),
        "support_messages_today": ContactMessage.objects.filter(created_at__date=today).count(),
        "last_message_at": last_message,
        "team_members": User.objects.count(),
    }


def _help_center_context():
    stats = _support_stats()
    category_counts = {}
    for topic in HELP_TOPICS:
        category_counts[topic["category"]] = category_counts.get(topic["category"], 0) + 1

    highlighted = sorted(
        HELP_TOPICS,
        key=lambda item: (category_counts[item["category"]] * -1, item["title"]),
    )[:4]

    return {
        "hero_stats": [
            {
                "label": "Help Articles",
                "value": len(HELP_TOPICS),
                "help": "Live support topics available",
            },
            {
                "label": "Pending Requests",
                "value": stats["support_open_messages"],
                "help": "Unresolved contact submissions",
            },
            {
                "label": "Visitors On Site",
                "value": stats["checked_in_visitors"],
                "help": "Realtime checked-in visitors",
            },
        ],
        "help_topics": [
            {
                **topic,
                "tone": topic["accent"],
                "keyword_blob": " ".join(topic["keywords"]),
            }
            for topic in HELP_TOPICS
        ],
        "topic_categories": [
            {"name": name, "count": count}
            for name, count in sorted(category_counts.items(), key=lambda item: item[0])
        ],
        "highlighted_topics": highlighted,
        "support_summary": {
            "response_time": "within 24 hours",
            "messages_today": stats["support_messages_today"],
            "open_requests": stats["support_open_messages"],
            "last_message_at": stats["last_message_at"],
        },
    }


def _status_context():
    stats = _support_stats()
    now = stats["now"]
    total_visitors = max(stats["active_visitors"], 1)
    onsite_pct = round((stats["checked_in_visitors"] / total_visitors) * 100)
    services = [
        {
            "name": "Visitor Registry",
            "status": "Operational",
            "detail": f"{stats['active_visitors']} active records available",
        },
        {
            "name": "Approval Workflow",
            "status": "Operational" if stats["pending_visitors"] < 25 else "Degraded",
            "detail": f"{stats['pending_visitors']} approvals waiting",
        },
        {
            "name": "Check-In Engine",
            "status": "Operational",
            "detail": f"{stats['checked_in_visitors']} visitors currently onsite",
        },
        {
            "name": "Support Inbox",
            "status": "Operational" if stats["support_open_messages"] < 20 else "Delayed",
            "detail": f"{stats['support_open_messages']} open support requests",
        },
    ]
    incidents = [
        {
            "title": "Live visitor activity refreshed",
            "status": "Healthy",
            "time": now,
            "detail": f"{stats['checked_in_visitors']} visitors are currently checked in.",
        },
        {
            "title": "Support queue sync completed",
            "status": "Healthy",
            "time": stats["last_message_at"] or now,
            "detail": f"{stats['support_messages_today']} support messages received today.",
        },
    ]

    recent_actions = list(UserActivityLog.objects.select_related("user")[:4])
    for action in recent_actions:
        incidents.append(
            {
                "title": action.action,
                "status": "Active",
                "time": action.timestamp,
                "detail": action.user.get_full_name() or action.user.username,
            }
        )

    incidents.sort(key=lambda item: item["time"], reverse=True)

    return {
        "hero_stats": [
            {
                "label": "Services",
                "value": len(services),
                "help": "Monitored system areas",
            },
            {
                "label": "Visitors On Site",
                "value": stats["checked_in_visitors"],
                "help": "Realtime check-in count",
            },
            {
                "label": "Open Requests",
                "value": stats["support_open_messages"],
                "help": "Support items in queue",
            },
        ],
        "overall_status": "Operational",
        "services": [
            {**service, "tone": _badge_tone(service["status"])}
            for service in services
        ],
        "status_metrics": [
            {"label": "Live Visitors", "value": stats["checked_in_visitors"]},
            {"label": "Pending Approvals", "value": stats["pending_visitors"]},
            {"label": "Closed Today", "value": stats["checked_out_today"]},
            {"label": "Onsite Ratio", "value": f"{onsite_pct}%"},
        ],
        "incidents": [
            {**incident, "tone": _badge_tone(incident["status"])}
            for incident in incidents[:6]
        ],
    }


def _terms_context(page):
    stats = _support_stats()
    word_count, read_time = _build_page_metrics(page)
    return {
        "hero_stats": [
            {
                "label": "Version",
                "value": page.updated_at.strftime("%Y.%m"),
                "help": "Derived from latest page update",
            },
            {
                "label": "Read Time",
                "value": read_time,
                "help": "Estimated from current terms content",
            },
            {
                "label": "Support Coverage",
                "value": "24/7",
                "help": "For operational issues and escalations",
            },
        ],
        "terms_highlights": [
            {
                "title": "Visitor privacy",
                "detail": "Personal details, ID proofs, and visit history should only be used for authorized gate operations.",
            },
            {
                "title": "Responsible access",
                "detail": "Accounts must be used only by the assigned team member and must not be shared across roles.",
            },
            {
                "title": "Operational integrity",
                "detail": "Check-in, approval, and status changes should reflect real visitor movement and real approvals.",
            },
            {
                "title": "Issue reporting",
                "detail": "Problems affecting visitor safety, data, or access should be reported immediately through support channels.",
            },
        ],
        "terms_meta": [
            {"label": "Last Updated", "value": timezone.localtime(page.updated_at).strftime("%b %d, %Y %I:%M %p")},
            {"label": "Current Word Count", "value": word_count},
            {"label": "Active Team Members", "value": stats["team_members"]},
            {"label": "Support Requests Logged", "value": stats["support_messages"]},
        ],
    }


def _contact_context(form, success_message=None):
    stats = _support_stats()
    return {
        "form": form,
        "success_message": success_message,
        "contact_cards": [
            {
                "title": "Support Email",
                "value": "support@gatesphere.com",
                "href": "mailto:support@gatesphere.com",
                "detail": "Best for product questions and workflow issues.",
                "icon": "bi-envelope-paper",
                "tone": "primary",
            },
            {
                "title": "Urgent Line",
                "value": "+1 (555) 123-4567",
                "href": "tel:+15551234567",
                "detail": "Use for critical access or check-in blockers.",
                "icon": "bi-telephone-forward",
                "tone": "danger",
            },
            {
                "title": "Enterprise Sales",
                "value": "sales@gatesphere.com",
                "href": "mailto:sales@gatesphere.com",
                "detail": "For onboarding, rollout planning, and account expansion.",
                "icon": "bi-briefcase",
                "tone": "success",
            },
        ],
        "contact_metrics": [
            {"label": "Messages Today", "value": stats["support_messages_today"]},
            {"label": "Open Requests", "value": stats["support_open_messages"]},
            {"label": "Resolved Messages", "value": stats["support_closed_messages"]},
            {"label": "Visitors On Site", "value": stats["checked_in_visitors"]},
        ],
        "last_message_at": stats["last_message_at"],
    }


def _special_page_context(page, slug, extra=None):
    word_count, read_time = _build_page_metrics(page)
    context = {
        "page": page,
        "page_meta": PAGE_DETAILS.get(slug, {}),
        "rendered_page_content": _render_page_content(page.content),
        "related_pages": _related_pages(page),
        "word_count": word_count,
        "read_time": read_time,
        "page_slug": slug,
    }
    if extra:
        context.update(extra)
    return context


def get_page(request, slug):
    try:
        page = Page.objects.get(slug=slug, is_active=True)
    except Page.DoesNotExist as exc:
        raise Http404("Page not found") from exc

    context = _special_page_context(page, slug)
    return render(request, f"pages/{slug}.html", context)


def documentation(request):
    return get_page(request, "documentation")


def api_reference(request):
    return get_page(request, "api_reference")


def guides(request):
    return get_page(request, "guides")


def blog(request):
    return get_page(request, "blog")


def help_center(request):
    try:
        page = Page.objects.get(slug="help_center", is_active=True)
    except Page.DoesNotExist as exc:
        raise Http404("Page not found") from exc
    return render(
        request,
        "pages/help_center.html",
        _special_page_context(page, "help_center", _help_center_context()),
    )


@require_http_methods(["GET", "POST"])
def contact(request):
    success_message = None
    initial = {}

    if request.user.is_authenticated:
        initial = {
            "name": request.user.get_full_name() or request.user.username,
            "email": request.user.email,
        }

    if request.method == "POST":
        form = ContactForm(request.POST)
        if form.is_valid():
            ContactMessage.objects.create(
                name=form.cleaned_data["name"],
                email=form.cleaned_data["email"],
                subject=form.cleaned_data["subject"],
                message=form.cleaned_data["message"],
            )
            success_message = "Thank you for your message! We will get back to you within 24 hours."
            messages.success(request, success_message)
            return redirect("pages:contact")
        messages.error(request, "Please correct the errors below.")
    else:
        form = ContactForm(initial=initial)

    return render(
        request,
        "pages/contact.html",
        _contact_context(form, success_message=success_message),
    )


def status(request):
    try:
        page = Page.objects.get(slug="status", is_active=True)
    except Page.DoesNotExist as exc:
        raise Http404("Page not found") from exc
    return render(
        request,
        "pages/status.html",
        _special_page_context(page, "status", _status_context()),
    )


def terms(request):
    try:
        page = Page.objects.get(slug="terms", is_active=True)
    except Page.DoesNotExist as exc:
        raise Http404("Page not found") from exc
    return render(
        request,
        "pages/terms.html",
        _special_page_context(page, "terms", _terms_context(page)),
    )


@require_GET
def page_live_data(request, slug):
    if slug not in {"help_center", "contact", "status", "terms"}:
        raise Http404("Live data is not available for this page")

    if slug in {"help_center", "status", "terms"}:
        try:
            page = Page.objects.get(slug=slug, is_active=True)
        except Page.DoesNotExist as exc:
            raise Http404("Page not found") from exc

    now = timezone.localtime()

    if slug == "help_center":
        data = _help_center_context()
        return JsonResponse(
            {
                "generated_at": now.isoformat(),
                "hero_stats": data["hero_stats"],
                "support_summary": {
                    **data["support_summary"],
                    "last_message_at": data["support_summary"]["last_message_at"].isoformat()
                    if data["support_summary"]["last_message_at"]
                    else None,
                },
            }
        )

    if slug == "contact":
        data = _contact_context(ContactForm())
        return JsonResponse(
            {
                "generated_at": now.isoformat(),
                "contact_metrics": data["contact_metrics"],
                "last_message_at": data["last_message_at"].isoformat() if data["last_message_at"] else None,
            }
        )

    if slug == "status":
        data = _status_context()
        return JsonResponse(
            {
                "generated_at": now.isoformat(),
                "overall_status": data["overall_status"],
                "hero_stats": data["hero_stats"],
                "status_metrics": data["status_metrics"],
                "services": data["services"],
                "incidents": [
                    {
                        **incident,
                        "time": timezone.localtime(incident["time"]).isoformat(),
                    }
                    for incident in data["incidents"]
                ],
            }
        )

    word_count, read_time = _build_page_metrics(page)
    terms_data = _terms_context(page)
    return JsonResponse(
        {
            "generated_at": now.isoformat(),
            "hero_stats": terms_data["hero_stats"],
            "terms_meta": terms_data["terms_meta"],
            "word_count": word_count,
            "read_time": read_time,
        }
    )
