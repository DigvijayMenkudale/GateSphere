// Universal Dashboard Real-Time Engine - All Roles
// Polls role-specific APIs every 15s, updates stats/tables, loading states, row flashes
// Production SaaS feel: smooth, reliable, no page reloads

(function ($) {
    'use strict';

    $(document).ready(function () {
        const $body = $('body');
        const role = $body.find('[data-dashboard-role]').data('dashboard-role') || 'admin';
        const isDashboard = $body.hasClass('dashboard-layout');

        if (!isDashboard) return;

        let isFetching = false;
        let refreshInterval;

        // Real-time mapping by role
        const API_ENDPOINTS = {
            admin: '/dashboard/api/stats/',
            host: '/dashboard/api/host-dashboard/',
            security: '/dashboard/api/security-dashboard/'
        };

        const apiUrl = API_ENDPOINTS[role] || API_ENDPOINTS.admin;

        // Update single stat element
        function updateStat($el, newValue) {
            if (!$el.length) return;
            $el.attr('data-target', newValue);
            if (typeof animateCountUp === 'function') {
                animateCountUp($el[0], newValue);
            } else {
                $el.text(newValue).addClass('count-up');
            }
        }

        // Update table rows from data
        function updateTable(tableId, dataArray, rowTemplate) {
            const $tbody = $(`#${tableId}-body`);
            if (!$tbody.length) return;

            $tbody.addClass('loading-fade');
            const rowsHtml = dataArray.map(item => rowTemplate(item)).join('');
            $tbody.html(rowsHtml).removeClass('loading-fade').addClass('updated');

            // Flash effect
            setTimeout(() => $tbody.removeClass('updated'), 1500);
        }

        // Show loading overlay
        function showLoading() {
            $('.dashboard-card').append('<div class="loading-overlay"><div class="spinner-border text-primary" role="status"></div></div>');
        }

        // Hide loading
        function hideLoading() {
            $('.loading-overlay').fadeOut(200, function () { $(this).remove(); });
        }

        // Main fetch function
        function fetchRealtimeData() {
            if (isFetching) return;
            isFetching = true;

            showLoading();

            $.ajax({
                url: apiUrl,
                method: 'GET',
                dataType: 'json',
                timeout: 10000,
                success: function (data) {
                    // Role-specific updates
                    switch (role) {
                        case 'admin':
                            updateStat($('#stat-total-visitors'), data.total_visitors);
                            updateStat($('#stat-pending-visitors'), data.pending_visitors);
                            updateStat($('#stat-approved-visitors'), data.approved_visitors);
                            updateStat($('#stat-checked-in'), data.checked_in);
                            // Update badges
                            $('#badge-approved-count').text(data.approved_visitors || 0);
                            $('#badge-checked-in-count').text(data.checked_in || 0);
                            break;

                        case 'host':
                            updateStat($('#host-stat-total'), data.total_visitors);
                            updateStat($('#host-stat-pending'), data.pending_count);
                            updateStat($('#host-stat-approved'), data.approved_count);
                            updateStat($('#host-stat-completed'), data.completed_count);
                            $('#host-pending-badge').text(data.pending_count || 0);
                            $('#host-hero-pending').text(data.pending_count || 0);
                            break;

                        case 'security':
                            updateStat($('#security-stat-approved'), data.approved_count);
                            updateStat($('#security-stat-checkedin'), data.checked_in_count);
                            updateStat($('#security-stat-checkedout'), data.checked_out_today);
                            updateStat($('#security-stat-today'), data.today_visitors);
                            $('#security-approved-badge').text(data.approved_count || 0);
                            break;
                    }

                    // Enhanced table updates for full real-time
                    // Approved queue tables (admin/security)
                    if (data.approved && data.approved.length) {
                        updateTable('table-approved-body', data.approved, function (v) {
                            return `
                                <tr id="row-${v.id}" data-search="${v.full_name.toLowerCase()} ${v.purpose.toLowerCase()}">
                                    <td><div class="table-meta">
                                        <span class="table-avatar bg-success-subtle text-success">${v.full_name.charAt(0).toUpperCase()}</span>
                                        <div><strong>${escapeHtml(v.full_name)}</strong><small>${escapeHtml(v.contact_number)}</small></div>
                                    </div></td>
                                    <td>${escapeHtml(v.purpose)}</td>
                                    <td>${escapeHtml(v.host)}</td>
                                    <td><span class="status-chip status-approved">Approved</span></td>
                                    <td><button class="btn btn-sm btn-success" data-action="checkin" data-id="${v.id}">Check In</button></td>
                                </tr>`;
                        });
                    }

                    // Checked-in tables
                    if (data.checked_in && data.checked_in.length) {
                        updateTable('table-checkedin-body', data.checked_in, function (v) {
                            return `
                                <tr id="row-checkout-${v.id}">
                                    <td><div class="table-meta">
                                        <span class="table-avatar bg-info-subtle text-info">${v.full_name.charAt(0).toUpperCase()}</span>
                                        <div><strong>${escapeHtml(v.full_name)}</strong><small>${escapeHtml(v.contact_number)}</small></div>
                                    </div></td>
                                    <td>${escapeHtml(v.purpose)}</td>
                                    <td>${escapeHtml(v.host)}</td>
                                    <td>${v.check_in_time ? new Date(v.check_in_time).toLocaleString() : 'Pending'}</td>
                                    <td><button class="btn btn-sm btn-warning" data-action="checkout" data-id="${v.id}">Check Out</button></td>
                                </tr>`;
                        });
                    }

                    hideLoading();
                    isFetching = false;
                },
                error: function () {
                    hideLoading();
                    isFetching = false;
                }
            });
        }

        // Escape HTML helper
        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // Initialize
        fetchRealtimeData();

        // Poll every 15 seconds
        refreshInterval = setInterval(fetchRealtimeData, 15000);

        // Pause on hidden tab, resume on visible
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                clearInterval(refreshInterval);
            } else {
                fetchRealtimeData();
                refreshInterval = setInterval(fetchRealtimeData, 15000);
            }
        });

        // Add loading styles
        const style = document.createElement('style');
        style.textContent = `
            .loading-fade { opacity: 0.6; }
            .loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                backdrop-filter: blur(2px);
            }
            tbody.updated tr { animation: rowFlash 1.2s ease-out; }
            @keyframes rowFlash { 0% { background: rgba(34,197,94,0.15); } 100% { background: transparent; } }
        `;
        document.head.appendChild(style);
    });
})(jQuery);
