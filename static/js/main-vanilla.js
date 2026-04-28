/**
 * Main Vanilla JS - Non-Auth Components
 * Toast, Animations, etc. (jQuery-free for dashboard)
 */

// Toast already in auth.js, skip

// Init AOS if available
if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 800, once: true });
}

// Ripple effect vanilla
document.addEventListener('click', function (e) {
    if (e.target.matches('.btn') && !e.target.disabled && !e.target.querySelector('.ripple')) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = e.target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        e.target.style.position = 'relative';
        e.target.style.overflow = 'hidden';
        e.target.appendChild(ripple);

        ripple.animate([
            { transform: 'scale(0)', opacity: 1 },
            { transform: 'scale(4)', opacity: 0 }
        ], { duration: 600 }).onfinish = () => ripple.remove();
    }
});

// Search vanilla (simplified for dashboard)
document.querySelectorAll('.search-input').forEach(input => {
    let timeout;
    input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const tableId = input.dataset.table;
            const table = document.getElementById(tableId);
            const rows = table.tBodies[0].rows;
            const term = input.value.toLowerCase();

            Array.from(rows).forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        }, 300);
    });
});

// Other dashboard logic can be added here...

