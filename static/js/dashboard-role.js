(function () {
    var adminAnalyticsChart = null;

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function getCsrf() {
        if (typeof getCsrfToken === 'function') {
            return getCsrfToken();
        }
        var name = 'csrftoken=';
        var parts = document.cookie ? document.cookie.split(';') : [];
        for (var i = 0; i < parts.length; i += 1) {
            var cookie = parts[i].trim();
            if (cookie.indexOf(name) === 0) {
                return decodeURIComponent(cookie.substring(name.length));
            }
        }
        return '';
    }

    function showMessage(message, type) {
        if (typeof showToast === 'function') {
            showToast(message, type || 'info');
            return;
        }
        if (message) {
            window.console.log((type || 'info') + ': ' + message);
        }
    }

    function formatDateTime(value) {
        if (!value) {
            return 'Pending sync';
        }
        try {
            return new Date(value).toLocaleString();
        } catch (e) {
            return value;
        }
    }

    function formatDateOnly(value) {
        if (!value) {
            return 'Not scheduled';
        }
        try {
            return new Date(value).toLocaleDateString();
        } catch (e) {
            return value;
        }
    }

    function formatTimeOnly(value) {
        if (!value) {
            return 'Any time';
        }
        if (typeof value === 'string' && value.length >= 5) {
            return value.slice(0, 5);
        }
        return value;
    }

    function animateCards() {
        document.querySelectorAll('.metric-card, .stat-card').forEach(function (card, index) {
            window.setTimeout(function () {
                card.classList.add('visible');
            }, index * 90);
        });
    }

    function initSortableTables() {
        document.querySelectorAll('.table').forEach(function (table) {
            var headers = table.querySelectorAll('thead th');
            headers.forEach(function (header, index) {
                header.setAttribute('data-sortable', 'true');
                header.addEventListener('click', function () {
                    var tbody = table.querySelector('tbody');
                    if (!tbody) return;
                    var rows = Array.from(tbody.querySelectorAll('tr'));
                    var nextDir = header.dataset.sortDir === 'asc' ? 'desc' : 'asc';
                    headers.forEach(function (h) { h.dataset.sortDir = ''; });
                    header.dataset.sortDir = nextDir;
                    rows.sort(function (a, b) {
                        var aText = (a.children[index] ? a.children[index].innerText : '').trim().toLowerCase();
                        var bText = (b.children[index] ? b.children[index].innerText : '').trim().toLowerCase();
                        return nextDir === 'asc' ? aText.localeCompare(bText, undefined, { numeric: true }) : bText.localeCompare(aText, undefined, { numeric: true });
                    });
                    rows.forEach(function (row) { tbody.appendChild(row); });
                });
            });
        });
    }

    function initTableFilters() {
        document.querySelectorAll('.dashboard-search').forEach(function (input) {
            input.addEventListener('input', function () {
                applyTableFilterSet(input.dataset.target);
            });
        });

        document.querySelectorAll('.filter-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var parent = btn.closest('.filter-pills');
                parent.querySelectorAll('.filter-pill').forEach(function (pill) {
                    pill.classList.remove('active');
                });
                btn.classList.add('active');
                applyTableFilterSet(btn.dataset.target);
            });
        });
    }

    function applyTableFilterSet(target) {
        if (!target) {
            return;
        }
        var search = document.querySelector('.dashboard-search[data-target="' + target + '"]');
        var activeFilter = document.querySelector('.filter-pill.active[data-target="' + target + '"]');
        var query = search ? search.value.trim().toLowerCase() : '';
        var filter = activeFilter ? activeFilter.dataset.filter || 'all' : 'all';

        document.querySelectorAll(target + ' tbody tr[data-search]').forEach(function (row) {
            var searchMatch = row.dataset.search.indexOf(query) !== -1;
            var filterMatch = filter === 'all' || row.dataset.status === filter;
            row.style.display = searchMatch && filterMatch ? '' : 'none';
        });
    }

    function sendVisitorAction(action, visitorId, button) {
        var endpoints = {
            approve: '/visitors/approve/' + visitorId + '/',
            reject: '/visitors/reject/' + visitorId + '/',
            checkin: '/visitors/check-in/' + visitorId + '/',
            checkout: '/visitors/check-out/' + visitorId + '/'
        };
        var messages = {
            approve: 'Visitor approved successfully.',
            reject: 'Visitor rejected successfully.',
            checkin: 'Visitor checked in successfully.',
            checkout: 'Visitor checked out successfully.'
        };
        var confirms = {
            approve: 'Approve this visitor?',
            reject: 'Reject this visitor?',
            checkin: 'Check in this visitor?',
            checkout: 'Check out this visitor?'
        };

        if (!endpoints[action]) {
            return;
        }
        if (!window.confirm(confirms[action])) {
            return;
        }

        var original = button.innerHTML;
        showMessage('Processing request...', 'info');
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        fetch(endpoints[action], {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrf(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then(function (response) {
            if (!response.ok) {
                return response.json().catch(function () {
                    return { message: 'Request failed.' };
                }).then(function (data) {
                    throw new Error(data.message || 'Request failed.');
                });
            }
            return response.json();
        }).then(function (data) {
            showMessage(data.message || messages[action], 'success');
            var row = button.closest('tr');
            if (row && typeof fadeOutRow === 'function') {
                if (row.id) {
                    fadeOutRow(row.id);
                } else {
                    row.remove();
                }
            } else if (row) {
                row.remove();
            }

            window.setTimeout(function () {
                refreshCurrentViews();
            }, 250);
        }).catch(function (error) {
            showMessage(error.message || 'Something went wrong.', 'error');
            button.disabled = false;
            button.innerHTML = original;
        });
    }

    function initVisitorActions() {
        document.addEventListener('click', function (event) {
            var button = event.target.closest('[data-visitor-action]');
            if (!button) {
                return;
            }
            event.preventDefault();
            sendVisitorAction(button.dataset.visitorAction, button.dataset.id, button);
        });
    }

    function refreshAdminDashboard() {
        var hasAdminStats = document.getElementById('stat-total-visitors');
        var hasAdminTables = document.getElementById('table-approved-body') || document.getElementById('table-checkedin-body');
        var hasAdminAnalytics = document.getElementById('admin-analytics-chart');
        if (!hasAdminStats && !hasAdminTables && !hasAdminAnalytics) {
            return;
        }

        if (hasAdminStats) {
            fetch('/dashboard/api/stats/', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (data) {
                if (!data) return;
                [
                    ['stat-total-visitors', data.total_visitors],
                    ['stat-pending-visitors', data.pending_visitors],
                    ['stat-checked-in', data.checked_in],
                    ['stat-checked-out', data.checked_out],
                    ['stat-checked-out-today', data.checked_out_today],
                    ['stat-approved-visitors', data.approved_visitors],
                    ['stat-today-visitors', data.today_visitors]
                ].forEach(function (pair) {
                    var element = document.getElementById(pair[0]);
                    if (element && typeof pair[1] !== 'undefined') {
                        if (typeof animateCountUp === 'function') {
                            animateCountUp(element, pair[1], 700);
                        } else {
                            element.textContent = pair[1];
                        }
                    }
                });
                var approvedBadge = document.getElementById('badge-approved-count');
                var checkedInBadge = document.getElementById('badge-checked-in-count');
                if (approvedBadge) approvedBadge.textContent = data.approved_visitors;
                if (checkedInBadge) checkedInBadge.textContent = data.checked_in;

                [
                    ['analytics-total-visitors', data.total_visitors],
                    ['analytics-pending-visitors', data.pending_visitors],
                    ['analytics-approved-visitors', data.approved_visitors],
                    ['analytics-checked-out', data.checked_out]
                ].forEach(function (pair) {
                    updateCount(pair[0], pair[1]);
                });

                if (data.analytics) {
                    updateCount('analytics-current-month', data.analytics.current_month_total);
                    updateCount('analytics-previous-month', data.analytics.previous_month_total);
                    updateCount('analytics-last-7-days', data.analytics.last_7_days_total);
                    updateAdminAnalyticsChart(data.analytics);
                }
            })
            .catch(function () {});
        }

        fetch('/dashboard/api/checkin-list/', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (data) {
                if (!data) return;
                hydrateAdminTable('table-approved-body', data.approved || [], 'approved');
                hydrateAdminTable('table-checkedin-body', data.checked_in || [], 'checkedin');
            })
            .catch(function () {});
    }

    function getAdminAnalyticsPayload() {
        var script = document.getElementById('admin-analytics-data');
        if (!script) {
            return null;
        }
        try {
            return JSON.parse(script.textContent);
        } catch (error) {
            return null;
        }
    }

    function buildChartGradient(context) {
        var chart = context.chart;
        var area = chart.chartArea;
        if (!area) {
            return 'rgba(59, 130, 246, 0.18)';
        }
        var gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.02)');
        return gradient;
    }

    function createAdminAnalyticsChart(data) {
        var canvas = document.getElementById('admin-analytics-chart');
        if (!canvas || typeof Chart === 'undefined' || !data) {
            return;
        }
        var daily = data.daily_visitors || [];
        adminAnalyticsChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: daily.map(function (item) { return item.label; }),
                datasets: [{
                    label: 'Visitors',
                    data: daily.map(function (item) { return item.count; }),
                    borderColor: '#2563eb',
                    backgroundColor: buildChartGradient,
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 900,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        titleColor: '#ffffff',
                        bodyColor: '#dbeafe',
                        padding: 12,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            color: '#64748b'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.18)'
                        }
                    }
                }
            }
        });
    }

    function renderAdminMonthlyStats(data) {
        var container = document.getElementById('analytics-monthly-strip');
        if (!container || !data) {
            return;
        }
        var monthly = data.monthly_visitors || [];
        container.innerHTML = monthly.map(function (item) {
            return '<div class="analytics-month-pill table-row-flash">' +
                '<span class="analytics-month-label">' + escapeHtml(item.label) + '</span>' +
                '<strong class="analytics-month-count">' + escapeHtml(item.count) + '</strong>' +
                '</div>';
        }).join('');
    }

    function updateAdminAnalyticsChart(data) {
        if (!data) {
            return;
        }
        renderAdminMonthlyStats(data);
        if (typeof Chart === 'undefined') {
            return;
        }
        if (!adminAnalyticsChart) {
            createAdminAnalyticsChart(data);
            return;
        }
        var daily = data.daily_visitors || [];
        adminAnalyticsChart.data.labels = daily.map(function (item) { return item.label; });
        adminAnalyticsChart.data.datasets[0].data = daily.map(function (item) { return item.count; });
        adminAnalyticsChart.update();
    }

    function refreshHostDashboard() {
        if (!document.querySelector('[data-dashboard-role="host"]')) {
            return;
        }
        fetch('/dashboard/api/host-dashboard/', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (data) {
                if (!data) return;
                updateCount('host-stat-total', data.total_visitors);
                updateCount('host-stat-pending', data.pending_count);
                updateCount('host-stat-approved', data.approved_count);
                updateCount('host-stat-completed', data.completed_count);
                updateText('host-hero-pending', data.pending_count);
                updateText('host-hero-completed', data.completed_count);
                updateText('host-pending-badge', data.pending_count);
                updateText('host-status-pending', data.status_pending);
                updateText('host-status-approved', data.status_approved);
                updateText('host-status-checkedin', data.status_checked_in);
                updateText('host-status-checkedout', data.status_checked_out);
                updateText('host-status-rejected', data.status_rejected);
                hydrateHostPending(data.pending_visitors || []);
                hydrateHostRecent(data.recent_visitors || []);
                hydrateHostUpcoming(data.upcoming_visitors || []);
                hydrateHostLogs(data.recent_logs || []);
                applyDashboardFilters();
            })
            .catch(function () {});
    }

    function refreshSecurityDashboard() {
        if (!document.querySelector('[data-dashboard-role="security"]')) {
            return;
        }
        fetch('/dashboard/api/security-dashboard/', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (data) {
                if (!data) return;
                updateCount('security-stat-approved', data.approved_count);
                updateCount('security-stat-checkedin', data.checked_in_count);
                updateCount('security-stat-checkedout', data.checked_out_today);
                updateCount('security-stat-today', data.today_visitors);
                updateText('security-hero-approved', data.approved_count);
                updateText('security-hero-checkedout', data.checked_out_today);
                updateText('security-approved-badge', data.approved_count);
                updateText('security-checkedin-badge', data.checked_in_count);
                hydrateSecurityApproved(data.approved_visitors || []);
                hydrateSecurityLive(data.checked_in_visitors || []);
                applyDashboardFilters();
            })
            .catch(function () {});
    }

    function refreshHostPendingPage() {
        if (!document.querySelector('[data-page="host-pending"]')) {
            return;
        }
        fetch('/visitors/api/host/pending/', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (data) {
                if (!data) return;
                updateCount('host-pending-stat-total', data.pending_count);
                updateCount('host-pending-stat-today', data.today_pending_count);
                updateCount('host-pending-stat-scheduled', data.scheduled_today_count);
                updateCount('host-pending-stat-overdue', data.overdue_count);
                updateText('host-pending-badge', data.pending_count);
                hydrateHostPendingPage(data.visitors || []);
                applyDashboardFilters();
            })
            .catch(function () {});
    }

    function refreshHostAllPage() {
        if (!document.querySelector('[data-page="host-all"]')) {
            return;
        }
        fetch('/visitors/api/host/all/', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (data) {
                if (!data) return;
                updateCount('host-all-stat-total', data.total_count);
                updateCount('host-all-stat-pending', data.pending_count);
                updateCount('host-all-stat-approved', data.approved_count);
                updateCount('host-all-stat-live', data.checked_in_count);
                updateCount('host-all-stat-closed', data.checked_out_count);
                updateText('host-all-badge', data.total_count);
                hydrateHostAllPage(data.visitors || []);
                applyDashboardFilters();
            })
            .catch(function () {});
    }

    function refreshSecurityVisitorsPage() {
        if (!document.querySelector('[data-page="security-all"]')) {
            return;
        }
        fetch('/visitors/api/security/all/', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (data) {
                if (!data) return;
                updateCount('security-all-stat-total', data.total_count);
                updateCount('security-all-stat-approved', data.approved_count);
                updateCount('security-all-stat-live', data.checked_in_count);
                updateCount('security-all-stat-out', data.checked_out_today);
                updateCount('security-all-stat-pending', data.pending_count);
                updateText('security-all-badge', data.total_count);
                hydrateSecurityVisitorsPage(data.visitors || []);
                applyDashboardFilters();
            })
            .catch(function () {});
    }

    function hydrateAdminTable(id, rows, type) {
        var tbody = document.getElementById(id);
        if (!tbody) {
            return;
        }
        if (!rows.length) {
            tbody.innerHTML = '';
            return;
        }
        tbody.innerHTML = rows.map(function (row) {
            var time = row.check_in_time ? new Date(row.check_in_time).toLocaleString() : '<span class="text-muted">Pending</span>';
            var action = type === 'approved'
                ? '<button class="btn btn-sm btn-success" data-visitor-action="checkin" data-id="' + row.id + '"><i class="bi bi-box-arrow-in-right me-1"></i>Check In</button>'
                : '<button class="btn btn-sm btn-warning" data-visitor-action="checkout" data-id="' + row.id + '"><i class="bi bi-box-arrow-left me-1"></i>Check Out</button>';
            var status = type === 'approved'
                ? '<span class="gs-status-pill gs-status-approved">Approved</span>'
                : '<span class="gs-status-pill gs-status-security">Checked In</span>';
            return '<tr id="visitor-row-' + type + '-' + row.id + '" data-search="' + [
                row.full_name,
                row.contact_number,
                row.purpose,
                row.host
            ].join(' ').toLowerCase() + '">' +
                '<td>' + escapeHtml(row.full_name) + '</td>' +
                '<td>' + escapeHtml(row.contact_number) + '</td>' +
                '<td>' + escapeHtml(row.purpose) + '</td>' +
                '<td>' + escapeHtml(row.host) + '</td>' +
                '<td>' + (type === 'approved' ? status : time) + '</td>' +
                '<td class="text-end">' + action + '</td>' +
                '</tr>';
        }).join('');
        flashRows(tbody);
    }

    function hydrateHostPending(rows) {
        var tbody = document.getElementById('host-pending-body');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = renderEmptyRow(6, 'No pending visitors are waiting for approval right now.');
            return;
        }
        tbody.innerHTML = rows.map(function (row) {
            return '<tr id="visitor-row-' + row.id + '" data-status="PENDING" data-search="' + [row.full_name, row.contact_number, row.purpose, row.id_proof_number].join(' ').toLowerCase() + '">' +
                '<td><div class="table-meta"><span class="table-avatar bg-warning-subtle text-warning">' + escapeHtml((row.full_name || '?').charAt(0).toUpperCase()) + '</span><div class="table-meta-copy"><strong>' + escapeHtml(row.full_name) + '</strong><small>' + escapeHtml(row.email || 'Awaiting host review') + '</small></div></div></td>' +
                '<td>' + escapeHtml(row.contact_number) + '</td>' +
                '<td>' + escapeHtml(row.purpose) + '</td>' +
                '<td>' + escapeHtml(row.id_proof_type) + ' / ' + escapeHtml(row.id_proof_number) + '</td>' +
                '<td><strong>' + formatDateOnly(row.expected_date) + '</strong><small class="d-block text-muted">' + escapeHtml(formatTimeOnly(row.expected_time)) + '</small></td>' +
                '<td class="text-end host-action-cell"><button class="host-action-btn host-action-approve" data-visitor-action="approve" data-id="' + row.id + '"><i class="bi bi-check-lg"></i><span>Approve</span></button> <button class="host-action-btn host-action-reject" data-visitor-action="reject" data-id="' + row.id + '"><i class="bi bi-x-lg"></i><span>Reject</span></button></td>' +
                '</tr>';
        }).join('');
        flashRows(tbody);
    }

    function hydrateHostRecent(rows) {
        var tbody = document.getElementById('host-recent-body');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = renderEmptyRow(6, 'No visitor records found for this host.');
            return;
        }
        tbody.innerHTML = rows.map(function (row) {
            return '<tr data-status="' + escapeHtml(row.status) + '" data-search="' + [row.full_name, row.contact_number, row.purpose, row.status].join(' ').toLowerCase() + '">' +
                '<td><div class="table-meta"><span class="table-avatar bg-primary-subtle text-primary">' + escapeHtml((row.full_name || '?').charAt(0).toUpperCase()) + '</span><div class="table-meta-copy"><strong>' + escapeHtml(row.full_name) + '</strong><small>' + escapeHtml(row.email || row.status_display || '') + '</small></div></div></td>' +
                '<td>' + escapeHtml(row.contact_number) + '</td>' +
                '<td>' + escapeHtml(row.purpose) + '</td>' +
                '<td>' + renderStatusPill(row.status, row.status_display) + '</td>' +
                '<td>' + formatDateTime(row.check_in_time || row.approval_time || row.created_at) + '</td>' +
                '<td class="text-end">' + renderHostRegisterState(row) + '</td>' +
                '</tr>';
        }).join('');
        flashRows(tbody);
    }

    function hydrateHostUpcoming(rows) {
        var list = document.getElementById('host-upcoming-list');
        if (!list) return;
        if (!rows.length) {
            list.innerHTML = '<div class="gs-empty-state compact"><i class="bi bi-calendar2-week"></i><p>No upcoming visits scheduled.</p></div>';
            return;
        }
        list.innerHTML = rows.map(function (row) {
            return '<div class="timeline-item table-row-flash"><span class="timeline-icon"><i class="bi bi-calendar2-week"></i></span><div><strong>' + escapeHtml(row.full_name) + '</strong><small>' + escapeHtml(row.purpose) + '</small></div><small>' + (row.expected_date ? new Date(row.expected_date).toLocaleDateString() : 'TBD') + (row.expected_time ? ' ' + row.expected_time : '') + '</small></div>';
        }).join('');
    }

    function hydrateHostLogs(rows) {
        var list = document.getElementById('host-recent-logs');
        if (!list) return;
        if (!rows.length) {
            list.innerHTML = '<div class="gs-empty-state compact"><i class="bi bi-clock-history"></i><p>No recent activity logs found.</p></div>';
            return;
        }
        list.innerHTML = rows.map(function (row) {
            var label = row.check_out_time ? 'Closed' : 'Live';
            var cls = row.check_out_time ? 'status-checkedout' : 'status-checkedin';
            var text = row.check_out_time ? 'Checked out on ' + formatDateTime(row.check_out_time) : row.check_in_time ? 'Checked in on ' + formatDateTime(row.check_in_time) : 'Visit record created';
            return '<div class="timeline-item table-row-flash"><span class="timeline-icon"><i class="bi bi-clock-history"></i></span><div><strong>' + escapeHtml(row.visitor) + '</strong><small>' + escapeHtml(text) + '</small></div><span class="status-chip ' + cls + '">' + label + '</span></div>';
        }).join('');
    }

    function hydrateSecurityApproved(rows) {
        var tbody = document.getElementById('security-approved-body');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = renderEmptyRow(6, 'No visitors waiting for check-in.');
            return;
        }
        tbody.innerHTML = rows.map(function (row) {
            return '<tr id="visitor-row-' + row.id + '" data-status="APPROVED" data-search="' + [row.full_name, row.host, row.purpose, row.contact_number].join(' ').toLowerCase() + '">' +
                '<td><div class="table-meta"><span class="table-avatar bg-success-subtle text-success">' + escapeHtml((row.full_name || '?').charAt(0).toUpperCase()) + '</span><div class="table-meta-copy"><strong>' + escapeHtml(row.full_name) + '</strong><small>Ready at gate</small></div></div></td>' +
                '<td>' + escapeHtml(row.contact_number) + '</td>' +
                '<td>' + escapeHtml(row.purpose) + '</td>' +
                '<td>' + escapeHtml(row.host) + '</td>' +
                '<td><span class="gs-status-pill gs-status-approved">Approved</span></td>' +
                '<td class="text-end"><button class="security-action-btn security-action-checkin" data-visitor-action="checkin" data-id="' + row.id + '"><i class="bi bi-box-arrow-in-right"></i><span>Check In</span></button></td>' +
                '</tr>';
        }).join('');
        flashRows(tbody);
    }

    function hydrateSecurityLive(rows) {
        var tbody = document.getElementById('security-live-body');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = renderEmptyRow(6, 'No visitors currently checked in.');
            return;
        }
        tbody.innerHTML = rows.map(function (row) {
            return '<tr id="visitor-row-checkout-' + row.id + '" data-status="CHECKED_IN" data-search="' + [row.full_name, row.host, row.purpose, row.contact_number].join(' ').toLowerCase() + '">' +
                '<td><div class="table-meta"><span class="table-avatar bg-info-subtle text-info">' + escapeHtml((row.full_name || '?').charAt(0).toUpperCase()) + '</span><div class="table-meta-copy"><strong>' + escapeHtml(row.full_name) + '</strong><small>On site now</small></div></div></td>' +
                '<td>' + escapeHtml(row.contact_number) + '</td>' +
                '<td>' + escapeHtml(row.purpose) + '</td>' +
                '<td>' + escapeHtml(row.host) + '</td>' +
                '<td>' + formatDateTime(row.check_in_time) + '</td>' +
                '<td class="text-end"><button class="security-action-btn security-action-checkout" data-visitor-action="checkout" data-id="' + row.id + '"><i class="bi bi-box-arrow-left"></i><span>Check Out</span></button></td>' +
                '</tr>';
        }).join('');
        flashRows(tbody);
    }

    function renderHostRegisterState(row) {
        if (row.status === 'PENDING') {
            return '<span class="status-chip status-pending"><i class="bi bi-hourglass"></i>Needs Approval</span>';
        }
        if (row.status === 'APPROVED') {
            return '<span class="status-chip status-approved"><i class="bi bi-check-circle"></i>Ready</span>';
        }
        if (row.status === 'CHECKED_IN') {
            return '<span class="status-chip status-checkedin"><i class="bi bi-person-check"></i>On Site</span>';
        }
        if (row.status === 'CHECKED_OUT') {
            return '<span class="status-chip status-checkedout"><i class="bi bi-box-arrow-right"></i>Closed</span>';
        }
        return '<span class="status-chip status-rejected"><i class="bi bi-x-circle"></i>Rejected</span>';
    }

    function hydrateHostPendingPage(rows) {
        var tbody = document.getElementById('host-pending-page-body');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = renderEmptyRow(6, 'No pending visitors are waiting for approval right now.');
            return;
        }
        tbody.innerHTML = rows.map(function (row) {
            return '<tr id="host-pending-row-' + row.id + '" data-status="' + escapeHtml(row.status) + '" data-search="' +
                [row.full_name, row.contact_number, row.email, row.purpose, row.id_proof_number, row.company_name].join(' ').toLowerCase() + '">' +
                '<td><div class="table-meta"><span class="table-avatar bg-warning-subtle text-warning">' + escapeHtml((row.full_name || '?').charAt(0).toUpperCase()) + '</span><div class="table-meta-copy"><strong>' + escapeHtml(row.full_name) + '</strong><small>' + escapeHtml(row.email || row.contact_number) + '</small></div></div></td>' +
                '<td>' + escapeHtml(row.contact_number) + '</td>' +
                '<td>' + escapeHtml(row.purpose) + '</td>' +
                '<td>' + escapeHtml(row.id_proof_type) + ' / ' + escapeHtml(row.id_proof_number) + '</td>' +
                '<td><strong>' + formatDateOnly(row.expected_date) + '</strong><small class="d-block text-muted">' + escapeHtml(formatTimeOnly(row.expected_time)) + '</small></td>' +
                '<td class="text-end">' + renderHostActionButtons(row) + '</td>' +
                '</tr>';
        }).join('');
        flashRows(tbody);
    }

    function hydrateHostAllPage(rows) {
        var tbody = document.getElementById('host-all-body');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = renderEmptyRow(7, 'No visitor records found for this host.');
            return;
        }
        tbody.innerHTML = rows.map(function (row) {
            return '<tr id="host-all-row-' + row.id + '" data-status="' + escapeHtml(row.status) + '" data-search="' +
                [row.full_name, row.contact_number, row.email, row.purpose, row.status, row.company_name, row.host].join(' ').toLowerCase() + '">' +
                '<td><div class="table-meta"><span class="table-avatar bg-primary-subtle text-primary">' + escapeHtml((row.full_name || '?').charAt(0).toUpperCase()) + '</span><div class="table-meta-copy"><strong>' + escapeHtml(row.full_name) + '</strong><small>' + escapeHtml(row.email || 'No email provided') + '</small></div></div></td>' +
                '<td>' + escapeHtml(row.contact_number) + '</td>' +
                '<td>' + escapeHtml(row.purpose) + '</td>' +
                '<td>' + renderStatusPill(row.status, row.status_display) + '</td>' +
                '<td><strong>' + formatDateOnly(row.expected_date) + '</strong><small class="d-block text-muted">' + escapeHtml(formatTimeOnly(row.expected_time)) + '</small></td>' +
                '<td>' + formatDateTime(row.check_in_time || row.approval_time || row.created_at) + '</td>' +
                '<td class="text-end">' + renderHostActionButtons(row) + '</td>' +
                '</tr>';
        }).join('');
        flashRows(tbody);
    }

    function hydrateSecurityVisitorsPage(rows) {
        var tbody = document.getElementById('security-all-body');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = renderEmptyRow(8, 'No active visitor records are available.');
            return;
        }
        tbody.innerHTML = rows.map(function (row) {
            return '<tr id="security-all-row-' + row.id + '" data-status="' + escapeHtml(row.status) + '" data-search="' +
                [row.full_name, row.contact_number, row.host, row.purpose, row.status, row.company_name].join(' ').toLowerCase() + '">' +
                '<td><div class="table-meta"><span class="table-avatar bg-primary-subtle text-primary">' + escapeHtml((row.full_name || '?').charAt(0).toUpperCase()) + '</span><div class="table-meta-copy"><strong>' + escapeHtml(row.full_name) + '</strong><small>' + escapeHtml(row.company_name || row.email || 'Walk-in visitor') + '</small></div></div></td>' +
                '<td>' + escapeHtml(row.contact_number) + '</td>' +
                '<td>' + escapeHtml(row.host) + '</td>' +
                '<td>' + escapeHtml(row.purpose) + '</td>' +
                '<td>' + renderStatusPill(row.status, row.status_display) + '</td>' +
                '<td>' + formatDateTime(row.check_in_time || row.approval_time || row.created_at) + '</td>' +
                '<td>' + formatDateTime(row.check_out_time) + '</td>' +
                '<td class="text-end">' + renderSecurityActionButtons(row) + '</td>' +
                '</tr>';
        }).join('');
        flashRows(tbody);
    }

    function renderHostActionButtons(row) {
        if (row.status === 'PENDING') {
            return '<button class="host-action-btn host-action-approve" data-visitor-action="approve" data-id="' + row.id + '"><i class="bi bi-check-lg"></i><span>Approve</span></button> ' +
                '<button class="host-action-btn host-action-reject" data-visitor-action="reject" data-id="' + row.id + '"><i class="bi bi-x-lg"></i><span>Reject</span></button>';
        }
        if (row.status === 'APPROVED') {
            return '<span class="status-chip status-approved"><i class="bi bi-check-circle"></i>Approved</span>';
        }
        if (row.status === 'CHECKED_IN') {
            return '<span class="status-chip status-checkedin"><i class="bi bi-person-check"></i>Checked In</span>';
        }
        if (row.status === 'CHECKED_OUT') {
            return '<span class="status-chip status-checkedout"><i class="bi bi-box-arrow-right"></i>Checked Out</span>';
        }
        return '<span class="status-chip status-rejected"><i class="bi bi-x-circle"></i>Rejected</span>';
    }

    function renderSecurityActionButtons(row) {
        if (row.status === 'APPROVED') {
            return '<button class="btn btn-sm btn-success" data-visitor-action="checkin" data-id="' + row.id + '"><i class="bi bi-box-arrow-in-right me-1"></i>Check In</button>';
        }
        if (row.status === 'CHECKED_IN') {
            return '<button class="btn btn-sm btn-warning" data-visitor-action="checkout" data-id="' + row.id + '"><i class="bi bi-box-arrow-left me-1"></i>Check Out</button>';
        }
        return '<span class="text-muted">No action</span>';
    }

    function renderStatusPill(status, label) {
        var cls = {
            PENDING: 'gs-status-pending',
            APPROVED: 'gs-status-approved',
            REJECTED: 'gs-status-rejected',
            CHECKED_IN: 'gs-status-security',
            CHECKED_OUT: 'gs-status-host'
        }[status] || 'gs-status-host';
        return '<span class="gs-status-pill ' + cls + '">' + escapeHtml(label || status) + '</span>';
    }

    function renderEmptyRow(colspan, message) {
        return '<tr><td colspan="' + colspan + '" class="text-center py-5 text-muted"><i class="bi bi-inbox fs-3 d-block mb-2"></i>' + escapeHtml(message) + '</td></tr>';
    }

    function applyDashboardFilters() {
        document.querySelectorAll('.dashboard-search').forEach(function (input) {
            applyTableFilterSet(input.dataset.target);
        });
        document.querySelectorAll('.filter-pill.active').forEach(function (button) {
            if (!document.querySelector('.dashboard-search[data-target="' + button.dataset.target + '"]')) {
                applyTableFilterSet(button.dataset.target);
            }
        });
    }

    function refreshCurrentViews() {
        refreshAdminDashboard();
        refreshHostDashboard();
        refreshSecurityDashboard();
        refreshHostPendingPage();
        refreshHostAllPage();
        refreshSecurityVisitorsPage();
    }

    function flashRows(container) {
        Array.from(container.querySelectorAll('tr')).slice(0, 3).forEach(function (row) {
            row.classList.add('table-row-flash');
            window.setTimeout(function () { row.classList.remove('table-row-flash'); }, 1400);
        });
    }

    function updateCount(id, value) {
        var element = document.getElementById(id);
        if (!element || typeof value === 'undefined') return;
        if (typeof animateCountUp === 'function') {
            animateCountUp(element, value, 700);
        } else {
            element.textContent = value;
        }
    }

    function updateText(id, value) {
        var element = document.getElementById(id);
        if (element && typeof value !== 'undefined') {
            element.textContent = value;
        }
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, function (s) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s];
        });
    }

    onReady(function () {
        var initialAdminAnalytics = getAdminAnalyticsPayload();
        renderAdminMonthlyStats(initialAdminAnalytics);
        createAdminAnalyticsChart(initialAdminAnalytics);
        animateCards();
        initTableFilters();
        initSortableTables();
        initVisitorActions();
        refreshAdminDashboard();
        refreshHostDashboard();
        refreshSecurityDashboard();

        if (document.getElementById('stat-total-visitors')) {
            window.setInterval(function () {
                if (!document.hidden) {
                    refreshAdminDashboard();
                }
            }, 15000);
        } else if (document.getElementById('table-approved-body') || document.getElementById('table-checkedin-body')) {
            window.setInterval(function () {
                if (!document.hidden) {
                    refreshAdminDashboard();
                }
            }, 15000);
        }

        if (document.querySelector('[data-dashboard-role="host"]')) {
            window.setInterval(function () {
                if (!document.hidden) {
                    refreshHostDashboard();
                }
            }, 15000);
        }

        if (document.querySelector('[data-dashboard-role="security"]')) {
            window.setInterval(function () {
                if (!document.hidden) {
                    refreshSecurityDashboard();
                }
            }, 15000);
        }

        if (document.querySelector('[data-page="host-pending"]')) {
            window.setInterval(function () {
                if (!document.hidden) {
                    refreshHostPendingPage();
                }
            }, 15000);
        }

        if (document.querySelector('[data-page="host-all"]')) {
            window.setInterval(function () {
                if (!document.hidden) {
                    refreshHostAllPage();
                }
            }, 15000);
        }

        if (document.querySelector('[data-page="security-all"]')) {
            window.setInterval(function () {
                if (!document.hidden) {
                    refreshSecurityVisitorsPage();
                }
            }, 15000);
        }
    });
})();
