(function () {
    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function slugify(text) {
        return String(text || "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    }

    function formatRelativeTime(value) {
        if (!value) {
            return "No recent activity";
        }

        var date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "Updated just now";
        }

        var diffMs = Date.now() - date.getTime();
        var diffMinutes = Math.max(0, Math.round(diffMs / 60000));
        if (diffMinutes < 1) {
            return "just now";
        }
        if (diffMinutes < 60) {
            return diffMinutes + " min ago";
        }
        var diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) {
            return diffHours + " hr ago";
        }
        var diffDays = Math.round(diffHours / 24);
        return diffDays + " day" + (diffDays === 1 ? "" : "s") + " ago";
    }

    function updateText(selector, text) {
        document.querySelectorAll(selector).forEach(function (node) {
            node.textContent = text;
        });
    }

    function initHelpSearch() {
        var input = document.querySelector("[data-help-search]");
        var resultCount = document.querySelector("[data-help-result-count]");
        var emptyState = document.querySelector("[data-help-empty]");
        var topics = Array.prototype.slice.call(document.querySelectorAll("[data-help-topic]"));

        if (!input || !topics.length) {
            return;
        }

        function applyFilter() {
            var query = input.value.toLowerCase().trim();
            var visibleCount = 0;

            topics.forEach(function (topic) {
                var haystack = topic.getAttribute("data-topic-search") || "";
                var matches = !query || haystack.indexOf(query) !== -1;
                topic.hidden = !matches;
                if (matches) {
                    visibleCount += 1;
                }
            });

            if (resultCount) {
                resultCount.textContent = visibleCount + " topic" + (visibleCount === 1 ? "" : "s");
            }
            if (emptyState) {
                emptyState.hidden = visibleCount !== 0;
            }
        }

        input.addEventListener("input", applyFilter);
        applyFilter();
    }

    function initMessageCounter() {
        var textarea = document.getElementById("id_message");
        var counter = document.querySelector("[data-message-count]");
        if (!textarea || !counter) {
            return;
        }

        function syncCount() {
            counter.textContent = String(textarea.value.length);
        }

        textarea.addEventListener("input", syncCount);
        syncCount();
    }

    function initContactFormState() {
        var form = document.querySelector("[data-contact-form]");
        if (!form) {
            return;
        }

        form.addEventListener("submit", function () {
            var button = form.querySelector('button[type="submit"]');
            if (!button) {
                return;
            }

            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
        });
    }

    function renderStatusServices(services) {
        var container = document.querySelector("[data-status-services]");
        if (!container || !Array.isArray(services)) {
            return;
        }

        container.innerHTML = services.map(function (service) {
            return [
                '<div class="gs-special-service">',
                '<div class="gs-special-service-copy">',
                "<strong>" + escapeHtml(service.name) + "</strong>",
                "<small>" + escapeHtml(service.detail) + "</small>",
                "</div>",
                '<span class="gs-special-pill gs-special-tone-' + escapeHtml(service.tone) + '">' + escapeHtml(service.status) + "</span>",
                "</div>"
            ].join("");
        }).join("");
    }

    function renderStatusIncidents(incidents) {
        var container = document.querySelector("[data-status-incidents]");
        if (!container || !Array.isArray(incidents)) {
            return;
        }

        container.innerHTML = incidents.map(function (incident) {
            return [
                '<article class="gs-special-timeline-item">',
                '<span class="gs-special-timeline-icon gs-special-tone-' + escapeHtml(incident.tone) + '"><i class="bi bi-pulse"></i></span>',
                '<div class="gs-special-timeline-copy">',
                "<strong>" + escapeHtml(incident.title) + "</strong>",
                '<span class="gs-special-muted">' + escapeHtml(incident.detail) + "</span>",
                "<small>" + formatRelativeTime(incident.time) + "</small>",
                "</div>",
                '<span class="gs-special-pill gs-special-tone-' + escapeHtml(incident.tone) + '">' + escapeHtml(incident.status) + "</span>",
                "</article>"
            ].join("");
        }).join("");
    }

    function renderMetaList(selector, rows) {
        var container = document.querySelector(selector);
        if (!container || !Array.isArray(rows)) {
            return;
        }

        container.innerHTML = rows.map(function (row) {
            return [
                '<div class="gs-special-meta-row">',
                "<span>" + escapeHtml(row.label) + "</span>",
                "<strong>" + escapeHtml(row.value) + "</strong>",
                "</div>"
            ].join("");
        }).join("");
    }

    function applyLiveData(pageName, payload) {
        if (payload.hero_stats) {
            payload.hero_stats.forEach(function (item) {
                var key = slugify(item.label);
                updateText('[data-live-stat="' + key + '"]', item.value);
                updateText('[data-status-hero="' + key + '"]', item.value);
                updateText('[data-terms-hero="' + key + '"]', item.value);
                updateText('[data-contact-metric="' + key + '"]', item.value);
                updateText('[data-contact-side-metric="' + key + '"]', item.value);
            });
        }

        if (pageName === "help_center" && payload.support_summary) {
            updateText("[data-live-open-requests]", payload.support_summary.open_requests);
            updateText("[data-live-messages-today]", payload.support_summary.messages_today);
            updateText("[data-live-last-message]", formatRelativeTime(payload.support_summary.last_message_at));
        }

        if (pageName === "contact") {
            updateText("[data-contact-last-message]", formatRelativeTime(payload.last_message_at));
        }

        if (pageName === "status") {
            updateText("[data-overall-status]", payload.overall_status);
            renderMetaList("[data-status-metrics]", payload.status_metrics);
            renderStatusServices(payload.services);
            renderStatusIncidents(payload.incidents);
        }

        if (pageName === "terms") {
            renderMetaList("[data-terms-meta]", payload.terms_meta);
        }
    }

    function initLiveRefresh() {
        var root = document.querySelector("[data-live-page][data-live-url]");
        if (!root) {
            return;
        }

        var pageName = root.getAttribute("data-live-page");
        var url = root.getAttribute("data-live-url");

        function refresh() {
            fetch(url, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Request failed");
                    }
                    return response.json();
                })
                .then(function (payload) {
                    applyLiveData(pageName, payload);
                })
                .catch(function () {
                    return null;
                });
        }

        refresh();
        window.setInterval(refresh, 30000);
    }

    document.addEventListener("DOMContentLoaded", function () {
        initHelpSearch();
        initMessageCounter();
        initContactFormState();
        initLiveRefresh();
    });
})();
