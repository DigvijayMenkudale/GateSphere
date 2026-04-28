/**
 * GateSphere - Main JavaScript
 * Professional Visitor Management System - Enterprise Edition
 * Enhanced with Toast System, Animations, and Micro-interactions
 */

$(document).ready(function () {
    // Initialize dashboard count-up FIRST for immediate visual feedback
    initCountUp();

    // Initialize all components
    initTooltips();
    initSearch();
    initProfileDropdown();
    initRippleEffects();
    initPageAnimations();
    initAutoRefresh();
    initNotificationBell();

    // Auto-dismiss alerts (legacy support)
    initAlertAutoDismiss();

    // Setup toast container
    setupToastContainer();

    // Initialize page-specific enhancements
    initLoginEnhancements();
    initSignupEnhancements();
    initSidebar();
});

/**
 * Toast Notification System
 */
function setupToastContainer() {
    // Remove existing toast container if any
    $('#toast-container').remove();

    // Create toast container
    const toastContainer = '<div id="toast-container" class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100;"></div>';
    $('body').append(toastContainer);
}

function showToast(message, type = 'info', duration = 5000) {
    const toastId = 'toast-' + Date.now();
    const iconMap = {
        'success': 'bi-check-circle-fill',
        'error': 'bi-x-circle-fill',
        'warning': 'bi-exclamation-triangle-fill',
        'info': 'bi-info-circle-fill'
    };

    const toastHtml = '<div id="' + toastId + '" class="toast show" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="' + duration + '">' +
        '<div class="toast-header bg-' + type + ' text-white">' +
        '<i class="bi ' + iconMap[type] + ' me-2"></i>' +
        '<strong class="me-auto">' + type.charAt(0).toUpperCase() + type.slice(1) + '</strong>' +
        '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>' +
        '</div>' +
        '<div class="toast-body">' + message + '</div>' +
        '</div>';

    $('#toast-container').append(toastHtml);

    // Initialize Bootstrap toast
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();

    // Remove after hide
    toastEl.addEventListener('hidden.bs.toast', function () {
        $(this).remove();
    });

    // Auto remove after duration
    setTimeout(() => {
        if ($('#' + toastId).length) {
            toast.hide();
        }
    }, duration);
}

// Convenience methods
function showSuccessToast(message, duration) {
    showToast(message, 'success', duration);
}

function showErrorToast(message, duration) {
    showToast(message, 'error', duration);
}

function showWarningToast(message, duration) {
    showToast(message, 'warning', duration);
}

function showInfoToast(message, duration) {
    showToast(message, 'info', duration);
}

/**
 * Initialize Bootstrap tooltips
 */
function initTooltips() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialize enhanced search functionality with debounce
 */
function initSearch() {
    let debounceTimer;

    $('.search-input').on('keyup', function () {
        const $input = $(this);
        const value = $input.val().toLowerCase();
        const table = $input.data('table');
        const $table = $('#' + table);
        const $tbody = $table.find('tbody');

        // Clear previous timer
        clearTimeout(debounceTimer);

        // Add loading indicator
        $tbody.addClass('search-loading');

        // Debounce search
        debounceTimer = setTimeout(function () {
            $tbody.find('tr').filter(function () {
                const matches = $(this).text().toLowerCase().indexOf(value) > -1;
                $(this).toggle(matches);

                // Highlight matched text if search has value
                if (value && matches) {
                    highlightMatch($(this), value);
                } else {
                    removeHighlight($(this));
                }
            });

            $tbody.removeClass('search-loading');

            // Show "no results" message if needed
            const visibleRows = $tbody.find('tr:visible').length;
            const noResultsMsg = $table.find('.no-results-message');

            if (visibleRows === 0) {
                if (noResultsMsg.length === 0) {
                    $tbody.after('<tr class="no-results-message"><td colspan="100" class="text-center py-4 text-muted">No matching records found</td></tr>');
                }
            } else {
                noResultsMsg.remove();
            }
        }, 300);
    });

    // Clear filter button
    $('.clear-search').on('click', function () {
        const $input = $(this).siblings('.search-input');
        $input.val('').trigger('keyup');
    });
}

function highlightMatch($row, searchText) {
    // Remove existing highlights
    removeHighlight($row);

    // Skip if no search text
    if (!searchText) return;

    // Get text content and highlight matches
    $row.find('td').each(function () {
        const $cell = $(this);
        const text = $cell.text();
        const regex = new RegExp('(' + searchText + ')', 'gi');

        if (text.toLowerCase().indexOf(searchText.toLowerCase()) > -1) {
            const highlighted = text.replace(regex, '<mark class="search-highlight bg-warning">$1</mark>');
            // Only replace if we find a match
            if (highlighted !== text) {
                $cell.html(highlighted);
            }
        }
    });
}

function removeHighlight($row) {
    $row.find('.search-highlight').each(function () {
        $(this).replaceWith($(this).text());
    });
}

/**
 * Profile Dropdown
 */
function initProfileDropdown() {
    const $profileTrigger = $('.profile-trigger');
    const $profileDropdown = $('.profile-dropdown');

    if ($profileTrigger.length === 0) return;

    // Toggle dropdown
    $profileTrigger.on('click', function (e) {
        e.stopPropagation();
        $profileDropdown.toggleClass('show');
        updateDropdownPosition();
    });

    // Close on outside click
    $(document).on('click', function (e) {
        if (!$(e.target).closest('.profile-container').length) {
            $profileDropdown.removeClass('show');
        }
    });

    // Close on escape
    $(document).on('keydown', function (e) {
        if (e.key === 'Escape') {
            $profileDropdown.removeClass('show');
        }
    });

    // AJAX Logout (delegated) - supports bootstrap dropdown or static markup
    $(document).on('click', '.ajax-logout', function (e) {
        e.preventDefault();

        const $btn = $(this);
        const originalHtml = $btn.html();
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Logging out...');

        $.ajax({
            url: $btn.attr('href'),
            type: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            },
            success: function (response) {
                showSuccessToast('Logged out successfully!', 2000);
                setTimeout(function () {
                    window.location.href = response.redirect || '/login/';
                }, 800);
            },
            error: function (xhr) {
                showErrorToast('Logout failed. Please try again.', 4000);
                $btn.prop('disabled', false).html(originalHtml);
            }
        });
    });
}

function updateDropdownPosition() {
    const $dropdown = $('.profile-dropdown');
    const $trigger = $('.profile-trigger');

    if ($dropdown.hasClass('show')) {
        const triggerRect = $trigger[0].getBoundingClientRect();
        const dropdownWidth = $dropdown.outerWidth();

        // Right align
        let rightPos = window.innerWidth - triggerRect.right;

        // Adjust if too close to left edge
        if (rightPos < 10) {
            rightPos = 10;
        }

        $dropdown.css({
            'right': rightPos + 'px',
            'top': (triggerRect.bottom + 5) + 'px'
        });
    }
}

/**
 * Ripple Effects on Buttons
 */
function initRippleEffects() {
    $(document).on('click', '.btn', function (e) {
        // Skip if button is disabled
        if ($(this).prop('disabled')) return;

        // Skip if already has ripple
        if ($(this).find('.ripple').length) return;

        const $btn = $(this);
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.cssText = 'position: absolute;background: rgba(255, 255, 255, 0.3);border-radius: 50%;pointer-events: none;width: 20px;height: 20px;left: ' + (x - 10) + 'px;top: ' + (y - 10) + 'px;transform: scale(0);animation: ripple-effect 0.6s ease-out;';

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
}

/**
 * Page Load Animations
 */
function initPageAnimations() {
    // Fade in content area
    $('.content-area').addClass('fade-in');

    // Stagger animation for stat cards
    $('.stat-card').each(function (index) {
        $(this).css('animation-delay', (index * 0.1) + 's');
    });
}

/**
 * Auto-refresh for dashboard stats
 */
function initAutoRefresh() {
    if (!window.location.pathname.includes('dashboard')) return;

    // Auto-refresh every 30 seconds
    setInterval(function () {
        // Check if page is visible
        if (!document.hidden) {
            refreshDashboardStats();
        }
    }, 30000);
}

function refreshDashboardStats() {
    const $statsContainer = $('.stat-card');
    if ($statsContainer.length === 0) return;

    // Add refresh indicator
    $('.stat-card').addClass('refreshing');

    // Simulate refresh (in production, this would be an actual AJAX call)
    setTimeout(function () {
        $('.stat-card').removeClass('refreshing');
    }, 500);
}

/**
 * Notification Bell
 */
function initNotificationBell() {
    const $bell = $('.notification-bell');
    const $panel = $('.notification-panel');

    if ($bell.length === 0) return;

    $bell.on('click', function (e) {
        e.stopPropagation();
        $panel.toggleClass('show');
    });

    $(document).on('click', function (e) {
        if (!$(e.target).closest('.notification-container').length) {
            $panel.removeClass('show');
        }
    });
}

/**
 * Auto-dismiss alerts after 5 seconds
 */
function initAlertAutoDismiss() {
    window.setTimeout(function () {
        $(".alert").fadeTo(500, 0).slideUp(500, function () {
            $(this).remove();
        });
    }, 5000);
}

/**
 * Show alert message (legacy support - now uses toasts)
 */
function showAlert(message, type) {
    showToast(message, type);
}

/**
 * Count-up animation for numbers
 */
function animateCountUp(element, target, duration = 1500) {
    const $el = $(element);
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out quart
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (target - start) * easeProgress);

        $el.text(formatNumber(current));

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            $el.text(target);
        }
    }

    requestAnimationFrame(update);
}

/**
 * Format number with thousand separators
 */
function formatNumber(n) {
    if (n === null || typeof n === 'undefined') return '';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Initialize count-up on visible elements
 */
function initCountUp() {
    $('.count-up').each(function () {
        const target = parseInt($(this).data('target'), 10);
        if (!isNaN(target)) {
            animateCountUp(this, target);
        }
    });
}

/**
 * Initialize sidebar active link highlighting and mobile toggle
 */
function initSidebar() {
    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    var $body = $('body');
    var $sidebarLinks = $('.app-sidebar .sidebar-link, .sidebar .nav-link');
    var $overlay = $('.sidebar-overlay');

    $sidebarLinks.each(function () {
        var href = ($(this).attr('href') || '').replace(/\/+$/, '') || '/';
        var isActive = href !== '/' ? path === href || path.startsWith(href + '/') : path === href;
        $(this).toggleClass('active', isActive);
    });

    $(document).on('click', '[data-toggle-sidebar]', function (e) {
        e.preventDefault();
        $body.toggleClass('sidebar-open');
        $overlay.toggleClass('show', $body.hasClass('sidebar-open'));
    });

    $(document).on('click', '.sidebar-overlay, .app-sidebar .sidebar-link', function () {
        if (window.innerWidth < 992) {
            $body.removeClass('sidebar-open');
            $overlay.removeClass('show');
        }
    });

    $(window).on('resize', function () {
        if (window.innerWidth >= 992) {
            $body.removeClass('sidebar-open');
            $overlay.removeClass('show');
        }
    });
}

/**
 * AJAX request helper with CSRF token
 */
function ajaxRequest(url, method, data, successCallback, errorCallback) {
    $.ajax({
        url: url,
        type: method,
        data: data,
        headers: {
            'X-CSRFToken': getCsrfToken()
        },
        success: function (response) {
            if (successCallback) successCallback(response);
        },
        error: function (xhr) {
            if (errorCallback) {
                errorCallback(xhr);
            } else {
                showErrorToast('An error occurred: ' + xhr.responseText, 5000);
            }
        }
    });
}

/**
 * Get CSRF token from cookie
 */
function getCsrfToken() {
    var name = 'csrftoken';
    var cookieValue = null;

    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    var date = new Date(dateString);
    var options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format time for display
 */
function formatTime(dateString) {
    var date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format datetime for display
 */
function formatDateTime(dateString) {
    return formatDate(dateString) + ' ' + formatTime(dateString);
}

/**
 * Confirm action dialog
 */
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

/**
 * Loading spinner show/hide
 */
function showLoading() {
    var spinner = '<div class="spinner-overlay">' +
        '<div class="spinner-border text-primary" role="status">' +
        '<up span class="visually-hidden">Loading...</span>' +
        '</div>' +
        '</div>';
    $('body').append(spinner);
}

function hideLoading() {
    $('.spinner-overlay').fadeOut(function () {
        $(this).remove();
    });
}

/**
 * Table row fade out animation
 */
function fadeOutRow(rowId, callback) {
    $('#' + rowId).fadeOut(500, function () {
        $(this).remove();
        if (callback) callback();
    });
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Generate avatar initials
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/**
 * Password visibility toggle
 */
function initPasswordToggles() {
    $('.password-toggle').on('click', function () {
        const $input = $(this).siblings('input');
        const type = $input.attr('type') === 'password' ? 'text' : 'password';
        $input.attr('type', type);

        $(this).toggleClass('bi-eye-slash bi-eye');
    });
}

/**
 * Login form enhancements
 */
function showForgotPasswordToast() {
    showInfoToast('Password reset instructions sent to your email. Please check your inbox (and spam folder).', 5000);
}

// Password toggle initialization
function initPasswordToggles() {
    $(document).on('click', '.password-toggle', function () {
        const $input = $(this).closest('.form-floating').find('input');
        const type = $input.attr('type') === 'password' ? 'text' : 'password';
        $input.attr('type', type);
        $(this).toggleClass('bi-eye bi-eye-slash');
    });
}

function initLoginEnhancements() {
    if (!$('#loginForm').length) return;


    // Initialize login enhancements when DOM ready

    // Login-specific success handler
    $('#loginForm').on('submit', function (e) {
        e.preventDefault();

        const $form = $(this);
        const $btn = $('#loginBtn');
        const $loginBody = $('.login-body');
        const $successDiv = $('#loginSuccess');

        // Clear errors
        $form.find('.alert').remove();

        if (!$form[0].checkValidity()) {
            $form.addClass('was-validated');
            return;
        }

        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span> Signing In...');

        $.ajax({
            url: '/login/',
            type: 'POST',
            data: $form.serialize(),
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
            success: function (data) {
                $loginBody.fadeOut(400, function () {
                    $successDiv.fadeIn().addClass('show');
                    showSuccessToast('Login Successful! Redirecting...', 2000);

                    setTimeout(() => window.location.href = data.redirect || '/dashboard/', 2000);
                });
            },
            error: function (xhr) {
                const msg = xhr.responseJSON ? xhr.responseJSON.error : 'Invalid credentials';
                $form.prepend('<div class=\"alert alert-danger alert-dismissible fade show mb-3\" role=\"alert\"><i class=\"bi bi-x-circle me-2\"></i>' + msg + '<button class=\"btn-close\" type=\"button\" data-bs-dismiss=\"alert\"></button></div>');
                showErrorToast(msg);

                $btn.prop('disabled', false).html('<i class="bi bi-box-arrow-in-right me-2"></i>Login');
            }
        });
    });
}

function clearFieldErrors() {
    $('.form-control.is-invalid').removeClass('is-invalid').addClass('is-valid');
    $('.invalid-feedback').text('').hide();
}

function showFieldError(fieldName, message) {
    const $input = $(`#id_${fieldName}`);
    const $feedback = $input.siblings('.invalid-feedback');

    // Clear previous errors for this field
    $input.removeClass('is-valid');

    // Show error
    $input.addClass('is-invalid');
    $feedback.text(message).show();

    // Shake animation
    $input.addClass('shake-error');
    setTimeout(() => $input.removeClass('shake-error'), 500);

    // Scroll to field
    $('html, body').animate({
        scrollTop: $input.offset().top - 100
    }, 500);
}

function initSignupEnhancements() {
    if (!$('#signupForm').length) return;

    const $form = $('#signupForm');

    // Dynamic security code toggle
    $('#id_role').on('change', function () {
        const role = $(this).val();
        const $container = $('#securityCodeContainer');

        if (role === 'SECURITY' || role === 'ADMIN') {
            $container.slideDown(300);
            $('#id_security_code').prop('required', true);
        } else {
            $container.slideUp(300);
            $('#id_security_code').prop('required', false);
        }
    });

    // Real-time field validation
    $form.find('input, select').on('blur input', function () {
        const $input = $(this);
        const fieldName = $input.attr('name');
        clearFieldErrors(); // Clear others, validate current

        // Basic HTML5 validation + custom rules
        if ($input[0].checkValidity()) {
            $input.removeClass('is-invalid').addClass('is-valid');
        }

        // Password match validation
        if (fieldName === 'confirm_password') {
            const password = $('#id_password').val();
            const confirm = $input.val();
            if (password && confirm !== password) {
                showFieldError('confirm_password', 'Passwords do not match');
            }
        }

        // Phone validation regex
        if (fieldName === 'phone') {
            const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
            const phoneValue = $input.val().trim();
            if (phoneValue && !phoneRegex.test(phoneValue)) {
                showFieldError('phone', 'Please enter a valid phone number (10-15 digits)');
            }
        }

        // Password strength meter (real-time)
        if (fieldName === 'password') {
            updatePasswordStrength($input.val());
        }
    });


    // Check for completely empty form first (user requirement)
    const isEmptyForm = !$form.find('input[required], select[required]').not(':placeholder-shown').length;
    if (isEmptyForm) {
        showWarningToast('Please fill in the required fields to create your account.', 4000);
        return false;
    }

    // Enhanced form submission
    $form.on('submit', function (e) {
        e.preventDefault();

        clearFieldErrors();

        if (!$form[0].checkValidity()) {
            $form.addClass('was-validated');
            return false;
        }


        const $btn = $('#signupBtn');
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span> Creating Account...');

        $.ajax({
            url: '{% url "signup" %}',
            type: 'POST',
            data: $form.serialize(),
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
            success: function (data) {
                if (data.success) {
                    // Direct redirect - NO success animation
                    window.location.href = data.redirect || '/login/';
                } else if (data.errors) {
                    // Dynamic field-specific errors
                    Object.keys(data.errors).forEach(field => {
                        showFieldError(field, data.errors[field]);
                    });
                    $btn.prop('disabled', false).html('<i class="bi bi-person-plus me-2"></i>Create Account');
                } else {
                    showErrorToast(data.error || 'Registration failed');
                    $btn.prop('disabled', false).html('<i class="bi bi-person-plus me-2"></i>Create Account');
                }
            },
            error: function (xhr) {
                // Bulletproof JSON parsing - handles raw JSON text
                let response;
                try {
                    response = typeof xhr.responseText === 'string' ? JSON.parse(xhr.responseText) : xhr.responseJSON;
                } catch (e) {
                    console.log('JSON parse error:', xhr.responseText);
                    showErrorToast('Please fill all required fields.', 5000);
                    $btn.prop('disabled', false).html('<i class="bi bi-person-plus me-2"></i>Create Account');
                    return;
                }

                if (response && response.errors) {
                    Object.keys(response.errors).forEach(field => {
                        showFieldError(field, response.errors[field]);
                    });
                    showErrorToast('Please fix the errors above.', 4000);
                } else {
                    showErrorToast(response?.error || 'Registration failed. Please try again.', 5000);
                }
                $btn.prop('disabled', false).html('<i class="bi bi-person-plus me-2"></i>Create Account');
            }
        });
        return false;
    });

    // Password toggle
    // Password strength functions
    function updatePasswordStrength(password) {
        const strength = calculatePasswordStrength(password);
        const $meter = $('#passwordStrengthMeter');
        const $label = $('#passwordStrengthLabel');

        if (!$meter.length) return;

        $meter.attr('data-strength', strength);
        const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
        const colors = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#047857'];

        $meter.find('.strength-bar').css('width', (strength * 25) + '%').css('background-color', colors[strength]);
        $label.text(labels[strength]).removeClass('text-weak text-fair text-good text-strong text-excellent')
            .addClass('text-' + ['weak', 'fair', 'good', 'strong', 'excellent'][strength]);
    }

    function calculatePasswordStrength(password) {
        let score = 0;
        if (!password) return 0;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return Math.min(score, 4);
    }

    $('.password-toggle').on('click', function () {
        const $input = $(this).siblings('input');
        const type = $input.attr('type') === 'password' ? 'text' : 'password';
        $input.attr('type', type);
        $(this).toggleClass('bi-eye bi-eye-slash');
    });
}
$(document).ready(initLoginEnhancements);


/**
 * Update dropdown position on window resize
 */
$(window).on('resize', function () {
    updateDropdownPosition();
});
