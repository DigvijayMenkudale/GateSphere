class ProfileRealtime {
    constructor() {
        this.apiUrl = '/accounts/api/profile-data/';
        this.dropdown = document.querySelector('.gs-profile-dropdown');
        this.init();
    }

    init() {
        if (document.querySelector('.realtime-profile')) {
            this.startMainPageRealtime();
        }

        if (this.dropdown) {
            this.startDropdownRealtime();
        }

        this.initPhoneFormat();
    }

    startMainPageRealtime() {
        this.fetchAndUpdate();
        setInterval(() => this.fetchAndUpdate(), 10000);
    }

    startDropdownRealtime() {
        const trigger = document.querySelector('.gs-user-menu .dropdown-toggle');
        if (trigger) {
            trigger.addEventListener('click', () => {
                setTimeout(() => this.updateDropdown(), 50);
            });
        }

        this.updateDropdown();
        setInterval(() => this.updateDropdown(), 15000);
    }

    async fetchProfileData() {
        const response = await fetch(this.apiUrl, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) {
            throw new Error('Profile request failed');
        }
        return response.json();
    }

    async fetchAndUpdate() {
        try {
            const data = await this.fetchProfileData();

            document.querySelectorAll('.realtime-value').forEach((el) => {
                const key = el.dataset.key;
                if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== null) {
                    const nextValue = String(data[key]);
                    if (el.textContent !== nextValue) {
                        el.textContent = nextValue;
                        const card = el.closest('.realtime-card');
                        if (card) {
                            card.classList.add('updated');
                            setTimeout(() => card.classList.remove('updated'), 800);
                        }
                    }
                }
            });

            const indicator = document.querySelector('.live-indicator');
            if (indicator) {
                indicator.textContent = 'Live • Updated now';
            }
        } catch (err) {
            console.error('Profile realtime fetch failed:', err);
        }
    }

    async updateDropdown() {
        if (!this.dropdown) {
            return;
        }

        try {
            const data = await this.fetchProfileData();

            this.dropdown.querySelectorAll('[data-profile-field]').forEach((el) => {
                const key = el.dataset.profileField;
                if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== null) {
                    el.textContent = data[key];
                }
            });

            const photo = this.dropdown.querySelector('[data-profile-photo]');
            const fallback = this.dropdown.querySelector('[data-profile-photo-fallback]');
            if (photo && data.photo_url) {
                photo.src = data.photo_url;
            } else if (photo && !data.photo_url) {
                photo.style.display = 'none';
                if (fallback) {
                    fallback.style.display = 'inline-flex';
                }
            }
        } catch (err) {
            console.error('Profile dropdown fetch failed:', err);
        }
    }

    initPhoneFormat() {
        document.querySelectorAll('.phone-format').forEach((input) => {
            input.addEventListener('input', (e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val.length >= 10) {
                    val = val.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
                } else if (val.length >= 7) {
                    val = val.replace(/(\d{3})(\d{4})/, '($1) $2');
                } else if (val.length >= 4) {
                    val = val.replace(/(\d{3})/, '($1)');
                }
                e.target.value = val;
            });
        });
    }
}

class NotificationRealtime {
    constructor() {
        this.apiUrl = '/accounts/api/notifications/';
        this.count = document.querySelector('[data-notification-count]');
        this.summary = document.querySelector('[data-notification-summary]');
        this.viewAll = document.querySelector('[data-notification-viewall]');
        this.categories = document.querySelector('[data-notification-categories]');
        this.recent = document.querySelector('[data-notification-recent]');
        this.empty = document.querySelector('[data-notification-empty]');
        this.pageSummary = document.querySelector('[data-notifications-page-summary]');
        this.pageCategories = document.querySelector('[data-notifications-page-categories]');
        this.pageRecent = document.querySelector('[data-notifications-page-recent]');
        this.init();
    }

    init() {
        if (!this.count && !this.pageCategories && !this.pageRecent) {
            return;
        }

        this.fetchAndRender();
        document.addEventListener('gs:notifications-open', () => this.fetchAndRender());
        setInterval(() => {
            if (!document.hidden) {
                this.fetchAndRender();
            }
        }, 15000);
    }

    async fetchAndRender() {
        try {
            const response = await fetch(this.apiUrl, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (!response.ok) {
                throw new Error('Notification request failed');
            }
            const data = await response.json();
            this.render(data);
        } catch (error) {
            console.error('Notification fetch failed:', error);
        }
    }

    render(data) {
        const totalCount = Number(data.total_count || 0);
        const categories = Array.isArray(data.categories) ? data.categories : [];
        const recentItems = Array.isArray(data.recent_items) ? data.recent_items : [];

        if (this.count) {
            this.count.textContent = totalCount;
            this.count.style.display = 'inline-flex';
        }

        if (this.summary) {
            this.summary.textContent = totalCount > 0
                ? `${totalCount} active alerts across your workspace`
                : 'Realtime system activity';
        }

        if (this.viewAll) {
            this.viewAll.textContent = `View All (${categories.length + recentItems.length})`;
        }

        if (this.categories) {
            this.categories.innerHTML = categories.length
                ? categories.map((item) => this.categoryTemplate(item)).join('')
                : '';
        }

        if (this.recent) {
            this.recent.innerHTML = recentItems.length
                ? recentItems.map((item) => this.recentTemplate(item)).join('')
                : '';
        }

        if (this.empty) {
            this.empty.style.display = categories.length || recentItems.length ? 'none' : 'block';
        }

        if (this.pageSummary) {
            this.pageSummary.textContent = totalCount > 0
                ? `${totalCount} active alerts`
                : '0 active alerts';
        }

        if (this.pageCategories) {
            this.pageCategories.innerHTML = categories.length
                ? categories.map((item) => this.categoryTemplate(item)).join('')
                : '<div class="gs-empty-state" style="min-height:180px;"><i class="bi bi-bell-slash"></i><p>No notification categories available</p></div>';
        }

        if (this.pageRecent) {
            this.pageRecent.innerHTML = recentItems.length
                ? recentItems.map((item) => this.recentTemplate(item)).join('')
                : '<div class="gs-empty-state" style="min-height:180px;"><i class="bi bi-clock"></i><p>No recent activity right now</p></div>';
        }
    }

    categoryTemplate(item) {
        return `
            <div class="gs-notification-item">
                <span class="gs-notification-item-icon gs-tone-${this.escape(item.tone || 'primary')}">
                    <i class="bi ${this.escape(item.icon || 'bi-bell')}"></i>
                </span>
                <div class="gs-notification-item-copy">
                    <div class="gs-notification-item-top">
                        <span class="gs-notification-item-title">${this.escape(item.label || 'Update')}</span>
                        <span class="gs-notification-item-count">${Number(item.count || 0)}</span>
                    </div>
                    <div class="gs-notification-item-detail">${this.escape(item.detail || '')}</div>
                </div>
            </div>
        `;
    }

    recentTemplate(item) {
        return `
            <div class="gs-notification-item">
                <span class="gs-notification-item-icon gs-tone-${this.escape(item.tone || 'secondary')}">
                    <i class="bi ${this.escape(item.icon || 'bi-bell')}"></i>
                </span>
                <div class="gs-notification-item-copy">
                    <div class="gs-notification-item-top">
                        <span class="gs-notification-item-title">${this.escape(item.title || 'Activity')}</span>
                        <span class="gs-notification-item-time">${this.escape(item.time || '')}</span>
                    </div>
                    <div class="gs-notification-item-meta">${this.escape(item.meta || '')}</div>
                    <div class="gs-notification-item-detail">${this.escape(item.detail || '')}</div>
                </div>
            </div>
        `;
    }

    escape(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ProfileRealtime();
        new NotificationRealtime();
    });
} else {
    new ProfileRealtime();
    new NotificationRealtime();
}
