/*
 * Vanilla JS Auth - Enterprise Real-time Login/Signup
 * No blinking, dynamic validation, production ready
 */

document.addEventListener('DOMContentLoaded', function () {
    initAuth();
});

function initAuth() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) initLogin(loginForm);
    if (signupForm) initSignup(signupForm);
}

function initLogin(form) {
    // ULTRA-CRITICAL: Reset ALL validation state on page load
    form.reset();
    form.querySelectorAll('.is-invalid, .is-valid').forEach(el => {
        el.classList.remove('is-invalid', 'is-valid');
    });
    form.querySelectorAll('.invalid-feedback').forEach(fb => {
        fb.textContent = '';
        fb.style.display = 'none';
    });
    form.classList.remove('was-validated', 'needs-validation');
    hideLoginAlert();

    // Focus first field to trigger proper label animation
    const firstField = form.querySelector('input[name="username"]');
    if (firstField) firstField.focus();

    form.addEventListener('submit', handleLoginSubmit);

    // Password toggle
    const pwToggles = form.querySelectorAll('.password-toggle');
    pwToggles.forEach(toggle => toggle.addEventListener('click', () => togglePasswordVisibility(toggle)));

    // Real-time clear on input
    form.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            clearFieldError(input);
            hideLoginAlert();
        });
    });
}

function initSignup(form) {
    const roleSelect = document.getElementById('id_role');
    const securityContainer = document.getElementById('securityCodeContainer');
    const firstField = document.getElementById('id_first_name');

    form.querySelectorAll('.is-invalid, .is-valid').forEach(el => {
        el.classList.remove('is-invalid', 'is-valid');
    });
    form.querySelectorAll('.invalid-feedback').forEach(fb => {
        fb.textContent = '';
        fb.style.display = 'none';
    });

    if (firstField) firstField.focus();

    form.addEventListener('submit', handleSignupSubmit);

    if (roleSelect) {
        roleSelect.addEventListener('change', () => toggleSecurityField(roleSelect.value, securityContainer));
        toggleSecurityField(roleSelect.value, securityContainer);
    }

    const pwToggles = form.querySelectorAll('.password-toggle');
    pwToggles.forEach(toggle => toggle.addEventListener('click', () => togglePasswordVisibility(toggle)));

    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => realTimeValidation(input));
    });

    const pwInput = document.getElementById('id_password');
    if (pwInput) pwInput.addEventListener('input', () => updatePasswordStrength(pwInput.value));

    const confirmInput = document.getElementById('id_confirm_password');
    if (confirmInput) {
        confirmInput.addEventListener('input', () => updatePasswordStrength(pwInput ? pwInput.value : ''));
    }
}

function togglePasswordVisibility(toggle) {
    const input = toggle.closest('.form-floating, .position-relative').querySelector('input');
    if (input.type === 'password') {
        input.type = 'text';
        toggle.classList.add('bi-eye-slash');
        toggle.classList.remove('bi-eye');
    } else {
        input.type = 'password';
        toggle.classList.add('bi-eye');
        toggle.classList.remove('bi-eye-slash');
    }
}

function toggleSecurityField(role, container) {
    if (!container) return;
    const input = container.querySelector('input');
    const help = document.getElementById('roleHelpText');
    const roleContent = {
        HOST: {
            title: 'Host access',
            text: 'Create and manage your own visitor requests and approvals.'
        },
        SECURITY: {
            title: 'Security access',
            text: 'Process check-ins and check-outs with secure registration code verification.'
        },
        ADMIN: {
            title: 'Admin access',
            text: 'Manage organization-wide visitor records, settings, and protected workflows.'
        }
    };

    if (help && roleContent[role]) {
        help.classList.add('is-active');
        help.innerHTML = `<strong>${roleContent[role].title}</strong>${roleContent[role].text}`;
    }

    if (role === 'SECURITY' || role === 'ADMIN') {
        container.classList.add('is-visible');
        input.required = true;
    } else {
        container.classList.remove('is-visible');
        input.required = false;
        input.value = '';
        clearFieldError(input);
    }
}

function realTimeValidation(input) {
    clearFieldError(input);

    if (input.checkValidity()) {
        input.classList.add('is-valid');
        input.classList.remove('is-invalid');
        return;
    }

    const fieldName = input.name;
    if (fieldName === 'confirm_password') {
        const pw = document.getElementById('id_password')?.value || '';
        if (pw && input.value !== pw) {
            showFieldError(input, 'Passwords do not match');
            return;
        }
    }

    if (fieldName === 'phone') {
        const phoneRegex = /^[+\d\s\-()]{10,15}$/;
        if (input.value.trim() && !phoneRegex.test(input.value)) {
            showFieldError(input, 'Invalid phone number');
            return;
        }
    }

    if (fieldName === 'email' && input.value.trim()) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(input.value.trim())) {
            showFieldError(input, 'Please enter a valid email address');
            return;
        }
    }
}

function validateField(input) {
    if (!input.checkValidity()) {
        showFieldError(input, input.validationMessage || 'Invalid input');
    }
}

function showFieldError(input, message) {
    input.classList.remove('is-valid');
    input.classList.add('is-invalid');

    const field = input.closest('.signup-field') || input.closest('.login-field') || input.parentNode;
    let feedback = field.querySelector('.invalid-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        field.appendChild(feedback);
    }
    feedback.textContent = message;
    feedback.style.display = 'block';

    input.classList.add('shake-error');
    setTimeout(() => input.classList.remove('shake-error'), 500);

    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearFieldError(input) {
    input.classList.remove('is-invalid', 'is-valid', 'shake-error');
    const field = input.closest('.signup-field') || input.closest('.login-field') || input.parentNode;
    const feedback = field.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = '';
        feedback.style.display = 'none';
    }
}

function handleLoginSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const username = form.querySelector('input[name="username"]');
    const password = form.querySelector('input[name="password"]');

    // Trigger Bootstrap validation ONLY on submit
    form.classList.add('was-validated');

    hideLoginAlert();
    [username, password].forEach(clearFieldError);

    let hasErrors = false;
    if (username && !username.value.trim()) {
        showFieldError(username, 'Username is required.');
        hasErrors = true;
    }
    if (password && !password.value.trim()) {
        showFieldError(password, 'Password is required.');
        hasErrors = true;
    }

    if (hasErrors || !form.checkValidity()) {
        showLoginAlert('Please fill both username and password fields.');
        return;
    }

    const formData = new FormData(form);
    const btn = form.querySelector('button[type="submit"]') || form.querySelector('.login-btn');

    showLoading(btn, '<i class="bi bi-box-arrow-in-right me-2"></i>Login');

    fetch('/login/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        }
    })
        .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showToast('Login successful!', 'success');
                setTimeout(() => window.location.href = data.redirect || '/dashboard/', 1000);
            } else {
                showLoginAlert(data.error || 'Invalid username or password.');
                showToast(data.error || 'Invalid credentials', 'error');
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            showLoginAlert('Login failed. Try again.');
            showToast('Login failed. Try again.', 'error');
        })
        .finally(() => {
            resetButton(btn);
        });
}

function showLoginAlert(message) {
    const alertBox = document.getElementById('loginInlineAlert');
    if (!alertBox) {
        return;
    }
    alertBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i><span>' + message + '</span>';
    alertBox.classList.add('show');
}

function hideLoginAlert() {
    const alertBox = document.getElementById('loginInlineAlert');
    if (!alertBox) {
        return;
    }
    alertBox.innerHTML = '';
    alertBox.classList.remove('show');
}

function handleSignupSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const alertBox = document.getElementById('signupAlert');
    const btn = document.getElementById('signupBtn');
    const requiredFields = form.querySelectorAll('[required]');
    let hasErrors = false;

    if (alertBox) {
        alertBox.classList.remove('show');
        alertBox.innerHTML = '';
    }

    form.querySelectorAll('input, select').forEach(clearFieldError);

    requiredFields.forEach(function (field) {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            hasErrors = true;
        }
    });

    const password = document.getElementById('id_password');
    const confirmPassword = document.getElementById('id_confirm_password');
    const phone = document.getElementById('id_phone');
    const email = document.getElementById('id_email');

    if (email && email.value.trim()) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email.value.trim())) {
            showFieldError(email, 'Please enter a valid email address');
            hasErrors = true;
        }
    }

    if (password && password.value && password.value.length < 8) {
        showFieldError(password, 'Password must be at least 8 characters');
        hasErrors = true;
    }

    if (password && confirmPassword && password.value !== confirmPassword.value) {
        showFieldError(confirmPassword, 'Passwords do not match');
        hasErrors = true;
    }

    if (phone && phone.value.trim()) {
        const phoneRegex = /^[+\d\s\-()]{10,15}$/;
        if (!phoneRegex.test(phone.value.trim())) {
            showFieldError(phone, 'Please enter a valid phone number');
            hasErrors = true;
        }
    }

    if (hasErrors) {
        if (alertBox) {
            alertBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i><span>Please fix the highlighted fields and try again.</span>';
            alertBox.classList.add('show');
        }
        return;
    }

    showLoading(btn, '<i class="bi bi-person-plus me-2"></i>Create Account');

    fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        }
    })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) {
                throw data;
            }
            return data;
        })
        .then(data => {
            showToast(data.message || 'Account created successfully!', 'success');
            setTimeout(() => {
                window.location.href = data.redirect || '/login/';
            }, 900);
        })
        .catch(error => {
            if (error && error.errors) {
                Object.keys(error.errors).forEach(function (fieldName) {
                    const field = document.getElementById('id_' + fieldName);
                    if (field) {
                        showFieldError(field, error.errors[fieldName]);
                    }
                });
                if (alertBox) {
                    alertBox.innerHTML = '<i class="bi bi-exclamation-octagon-fill"></i><span>Please correct the form errors before continuing.</span>';
                    alertBox.classList.add('show');
                }
            } else {
                const message = (error && error.error) ? error.error : 'Registration failed. Please try again.';
                if (alertBox) {
                    alertBox.innerHTML = `<i class="bi bi-exclamation-octagon-fill"></i><span>${message}</span>`;
                    alertBox.classList.add('show');
                }
                showToast(message, 'error');
            }
        })
        .finally(() => {
            resetButton(btn);
        });
}

/* Legacy signup validation - now handled by initSignup() */

function showLoading(btn, originalHTML) {
    btn.dataset.originalHTML = originalHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Processing...';
}

function resetButton(btn) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalHTML || btn.innerHTML;
}



function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toastId = 'toast-' + Date.now();
    const iconMap = {
        success: 'bi-check-circle-fill',
        error: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi ${iconMap[type]} me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    setTimeout(() => {
        const element = document.getElementById(toastId);
        if (element) element.remove();
    }, duration);
}

function showForgotPasswordToast() {
    showToast('Opening forgot password...', 'info');
    setTimeout(() => {
        window.location.href = '/accounts/forgot-password/';
    }, 1000);
}

function updatePasswordStrength(password) {
    const bar = document.getElementById('passwordStrengthBar');
    const label = document.getElementById('passwordStrengthLabel');
    const confirmPassword = document.getElementById('id_confirm_password');
    if (!bar || !label) {
        return;
    }

    const checks = {
        length: password.length >= 8,
        letter: /[A-Za-z]/.test(password),
        number: /\d/.test(password),
        match: confirmPassword ? !!password && password === confirmPassword.value : false
    };

    Object.keys(checks).forEach(function (key) {
        const item = document.querySelector('[data-password-check="' + key + '"]');
        if (item) {
            item.classList.toggle('is-valid', checks[key]);
        }
    });

    let score = 0;
    if (checks.length) score += 35;
    if (checks.letter) score += 20;
    if (checks.number) score += 20;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    if (password.length >= 12) score += 10;

    const width = password ? Math.min(score, 100) : 0;
    bar.style.width = width + '%';

    if (!password) {
        label.textContent = 'Waiting for input';
        return;
    }

    if (width < 40) {
        label.textContent = 'Weak';
    } else if (width < 75) {
        label.textContent = 'Good';
    } else {
        label.textContent = 'Strong';
    }
}

