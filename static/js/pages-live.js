(function () {
    function slugify(text) {
        return String(text || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    function buildToc() {
        var body = document.querySelector('[data-page-body]');
        var toc = document.querySelector('[data-page-toc]');
        if (!body || !toc) {
            return;
        }

        var headings = Array.prototype.slice.call(body.querySelectorAll('h2, h3'));
        if (!headings.length) {
            return;
        }

        headings.forEach(function (heading, index) {
            if (!heading.id) {
                heading.id = slugify(heading.textContent) || ('section-' + index);
            }

            var link = document.createElement('a');
            link.href = '#' + heading.id;
            link.className = 'gs-doc-toc-link';
            link.textContent = heading.textContent.trim();
            link.dataset.targetId = heading.id;
            toc.appendChild(link);
        });

        var tocLinks = Array.prototype.slice.call(toc.querySelectorAll('.gs-doc-toc-link'));
        function setActive(id) {
            tocLinks.forEach(function (link) {
                link.classList.toggle('is-active', link.dataset.targetId === id || (id === 'page-content' && !link.dataset.targetId));
            });
        }

        document.addEventListener('scroll', function () {
            var activeHeading = headings[0];
            headings.forEach(function (heading) {
                var rect = heading.getBoundingClientRect();
                if (rect.top <= 120) {
                    activeHeading = heading;
                }
            });
            if (activeHeading && activeHeading.id) {
                setActive(activeHeading.id);
            }
        }, { passive: true });
    }

    function initReveal() {
        var items = document.querySelectorAll('.gs-doc-reveal');
        if (!items.length) {
            return;
        }

        if (!('IntersectionObserver' in window)) {
            items.forEach(function (item) {
                item.classList.add('is-visible');
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.14
        });

        items.forEach(function (item) {
            observer.observe(item);
        });
    }

    function animateCount(element) {
        var finalValue = parseInt(element.getAttribute('data-countup'), 10);
        if (Number.isNaN(finalValue)) {
            return;
        }

        var suffix = element.textContent.indexOf('min') !== -1 ? ' min' : '';
        var start = 0;
        var duration = 800;
        var startTime = null;

        function step(timestamp) {
            if (!startTime) {
                startTime = timestamp;
            }
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var value = Math.round(finalValue * progress);
            element.textContent = value + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        }

        window.requestAnimationFrame(step);
    }

    function initCountups() {
        document.querySelectorAll('[data-countup]').forEach(animateCount);
    }

    document.addEventListener('DOMContentLoaded', function () {
        initReveal();
        buildToc();
        initCountups();
    });
})();
