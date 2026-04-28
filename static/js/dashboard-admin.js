// Dashboard-specific JS (runs after main.js)

$(document).ready(function () {
    // Use shared initCountUp if available
    if (typeof initCountUp === 'function') {
        initCountUp();
    } else {
        // fallback: animate elements directly
        $('.count-up').each(function () {
            const target = parseInt($(this).data('target'), 10) || 0;
            let start = 0;
            const duration = 1500;
            const startTime = performance.now();
            const el = this;

            function update(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 4);
                const current = Math.floor(start + (target - start) * ease);
                el.textContent = current;
                if (progress < 1) requestAnimationFrame(update);
                else el.textContent = target;
            }
            requestAnimationFrame(update);
        });
    }

    // Auto-refresh
    setInterval(function () {
        if (!document.hidden) location.reload();
    }, 30000);

    // Stagger stat-card entrance to match screenshot animation
    (function staggerStatCards() {
        const cards = $('.stat-card');
        cards.each(function (i) {
            const el = $(this);
            setTimeout(function () {
                el.addClass('visible');
            }, 120 * i);
        });
    })();

    // Initialize bootstrap tooltips if available
    try {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    } catch (e) { /* ignore if bootstrap not loaded yet */ }

    // Check-in handler using shared ajaxRequest helper
    $(document).on('click', '.btn-checkin', function (e) {
        e.preventDefault();
        const $btn = $(this);
        const id = $btn.data('id');
        if (!id) return;
        if (!confirm('Check in this visitor?')) return;

        const original = $btn.html();
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>');

        if (typeof ajaxRequest === 'function') {
            ajaxRequest('/visitors/check-in/' + id + '/', 'POST', {}, function (res) {
                showSuccessToast('Visitor checked in successfully!');
                fadeOutRow('visitor-row-checkin-' + id, function () { setTimeout(function () { location.reload(); }, 800); });
            }, function (xhr) {
                const msg = xhr.responseText || 'Error checking in';
                showErrorToast(msg);
                $btn.prop('disabled', false).html(original);
            });
        } else {
            // fallback to fetch with csrftoken from cookie
            fetch('/visitors/check-in/' + id + '/', {
                method: 'POST',
                headers: { 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' }
            }).then(function (r) {
                if (!r.ok) throw r;
                return r.json().catch(function () { return {}; });
            }).then(function () {
                showSuccessToast('Visitor checked in successfully!');
                fadeOutRow('visitor-row-checkin-' + id, function () { setTimeout(function () { location.reload(); }, 800); });
            }).catch(function (err) {
                showErrorToast('Error checking in');
                $btn.prop('disabled', false).html(original);
            });
        }
    });

    // Check-out handler
    $(document).on('click', '.btn-checkout', function (e) {
        e.preventDefault();
        const $btn = $(this);
        const id = $btn.data('id');
        if (!id) return;
        if (!confirm('Check out this visitor?')) return;

        const original = $btn.html();
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>');

        if (typeof ajaxRequest === 'function') {
            ajaxRequest('/visitors/check-out/' + id + '/', 'POST', {}, function (res) {
                showSuccessToast('Visitor checked out successfully!');
                fadeOutRow('visitor-row-checkout-' + id, function () { setTimeout(function () { location.reload(); }, 800); });
            }, function (xhr) {
                const msg = xhr.responseText || 'Error checking out';
                showErrorToast(msg);
                $btn.prop('disabled', false).html(original);
            });
        } else {
            fetch('/visitors/check-out/' + id + '/', {
                method: 'POST',
                headers: { 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' }
            }).then(function (r) {
                if (!r.ok) throw r;
                return r.json().catch(function () { return {}; });
            }).then(function () {
                showSuccessToast('Visitor checked out successfully!');
                fadeOutRow('visitor-row-checkout-' + id, function () { setTimeout(function () { location.reload(); }, 800); });
            }).catch(function (err) {
                showErrorToast('Error checking out');
                $btn.prop('disabled', false).html(original);
            });
        }
    });

    // Periodically fetch stats and lists and update DOM (every 10s)
    function fetchAndUpdate() {
        // Fetch stats
        fetch('/dashboard/api/stats/')
            .then(function (r) { if (!r.ok) throw r; return r.json(); })
            .then(function (data) {
                // Update counts with animation if available
                var mapping = [
                    { id: 'stat-total-visitors', key: 'total_visitors' },
                    { id: 'stat-pending-visitors', key: 'pending_visitors' },
                    { id: 'stat-checked-in', key: 'checked_in' },
                    { id: 'stat-checked-out', key: 'checked_out' }
                ];
                mapping.forEach(function (m) {
                    var el = document.getElementById(m.id);
                    if (!el || data[m.key] === undefined) return;
                    el.setAttribute('data-target', data[m.key]);
                    if (typeof animateCountUp === 'function') {
                        animateCountUp(el, data[m.key]);
                    } else {
                        el.textContent = data[m.key];
                    }
                });

                // update small badges
                if (data.approved_visitors !== undefined) {
                    var b = document.getElementById('badge-approved-count'); if (b) b.textContent = data.approved_visitors;
                }
                if (data.checked_in !== undefined) {
                    var b2 = document.getElementById('badge-checked-in-count'); if (b2) b2.textContent = data.checked_in;
                }
            }).catch(function (err) { /* ignore network errors */ });

        // Fetch approved and checked in lists
        fetch('/dashboard/api/checkin-list/')
            .then(function (r) { if (!r.ok) throw r; return r.json(); })
            .then(function (data) {
                // Approved list
                if (data.approved) {
                    var tbody = document.getElementById('table-approved-body');
                    if (tbody) {
                        tbody.innerHTML = '';
                        data.approved.forEach(function (v) {
                            var tr = document.createElement('tr');
                            tr.id = 'visitor-row-checkin-' + v.id;
                            tr.innerHTML = '<td class="fw-medium">' + escapeHtml(v.full_name) + '</td>' +
                                '<td>' + escapeHtml(v.contact_number) + '</td>' +
                                '<td>' + escapeHtml(v.purpose) + '</td>' +
                                '<td>' + escapeHtml(v.host) + '</td>' +
                                '<td><span class="badge bg-success">Approved</span></td>' +
                                '<td><button class="btn btn-sm btn-success btn-checkin" data-id="' + v.id + '"><i class="bi bi-box-arrow-in-right me-1"></i>Check In</button></td>';
                            tbody.appendChild(tr);
                        });
                    }
                }

                // Checked-in list
                if (data.checked_in) {
                    var tbody2 = document.getElementById('table-checkedin-body');
                    if (tbody2) {
                        tbody2.innerHTML = '';
                        data.checked_in.forEach(function (v) {
                            var tr = document.createElement('tr');
                            tr.id = 'visitor-row-checkout-' + v.id;
                            var checkinDisplay = v.check_in_time ? new Date(v.check_in_time).toLocaleString() : '-';
                            tr.innerHTML = '<td class="fw-medium">' + escapeHtml(v.full_name) + '</td>' +
                                '<td>' + escapeHtml(v.contact_number) + '</td>' +
                                '<td>' + escapeHtml(v.purpose) + '</td>' +
                                '<td>' + escapeHtml(v.host) + '</td>' +
                                '<td>' + checkinDisplay + '</td>' +
                                '<td><button class="btn btn-sm btn-warning btn-checkout" data-id="' + v.id + '"><i class="bi bi-box-arrow-left me-1"></i>Check Out</button></td>';
                            tbody2.appendChild(tr);
                        });
                    }
                }
            }).catch(function (err) { /* ignore */ });
    }

    // escape helper
    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str).replace(/[&<>"']/g, function (s) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]); });
    }

    // initial fetch and interval
    fetchAndUpdate();
    setInterval(fetchAndUpdate, 10000);
});
