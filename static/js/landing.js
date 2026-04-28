/**
 * GateSphere - Landing Page JavaScript
 * Premium Visitor Management System
 */

(function () {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function () {
        initNavbar();
        initMobileMenu();
        initScrollAnimations();
        initCounterAnimation();
        initSmoothScroll();
    });

    /**
     * Navbar scroll effect
     */
    function initNavbar() {
        const navbar = document.querySelector('.lp-navbar');
        if (!navbar) return;

        let lastScroll = 0;

        window.addEventListener('scroll', function () {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        }, { passive: true });
    }

    /**
     * Mobile menu toggle
     */
    function initMobileMenu() {
        const toggle = document.querySelector('.lp-mobile-toggle');
        const mobileMenu = document.querySelector('.lp-mobile-menu');
        const closeBtn = document.querySelector('.lp-mobile-menu .close-btn');
        const mobileLinks = document.querySelectorAll('.lp-mobile-menu a');

        if (!toggle || !mobileMenu) return;

        // Open menu
        toggle.addEventListener('click', function () {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        // Close menu
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        // Close on link click
        mobileLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });

        // Close on escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    /**
     * Scroll animations using Intersection Observer
     */
    function initScrollAnimations() {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('lp-visible');

                    // Add staggered animation for grid items
                    if (entry.target.closest('.lp-features-grid') ||
                        entry.target.closest('.lp-steps-grid') ||
                        entry.target.closest('.lp-showcase-grid')) {
                        const items = entry.target.querySelectorAll('.lp-feature-card, .lp-step-item, .lp-showcase-card');
                        items.forEach(function (item, index) {
                            item.style.transitionDelay = (index * 0.1) + 's';
                        });
                    }
                }
            });
        }, observerOptions);

        // Observe all animated elements
        document.querySelectorAll('.lp-animate-on-scroll').forEach(function (el) {
            observer.observe(el);
        });
    }

    /**
     * Animated counter for statistics
     */
    function initCounterAnimation() {
        const counters = document.querySelectorAll('.lp-stat-number');

        if (counters.length === 0) return;

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5
        };

        const counterObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.getAttribute('data-target'));
                    const duration = 2000; // 2 seconds
                    const start = 0;
                    const startTime = performance.now();

                    function updateCounter(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);

                        // Easing function (ease-out)
                        const easeOut = 1 - Math.pow(1 - progress, 3);
                        const current = Math.floor(start + (target - start) * easeOut);

                        counter.textContent = formatNumber(current);

                        if (progress < 1) {
                            requestAnimationFrame(updateCounter);
                        } else {
                            counter.textContent = formatNumber(target);
                        }
                    }

                    requestAnimationFrame(updateCounter);
                    counterObserver.unobserve(counter);
                }
            });
        }, observerOptions);

        counters.forEach(function (counter) {
            counterObserver.observe(counter);
        });
    }

    /**
     * Format numbers with K/M suffix
     */
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M+';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(0) + 'K+';
        }
        return num.toString() + '+';
    }

    /**
     * Smooth scroll for anchor links
     */
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');

                if (targetId === '#') return;

                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    e.preventDefault();

                    const navbarHeight = document.querySelector('.lp-navbar').offsetHeight;
                    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    /**
     * Add ripple effect to buttons
     */
    function initButtonRipple() {
        document.querySelectorAll('.btn-hero-primary, .btn-signup, .btn-cta-primary').forEach(function (button) {
            button.addEventListener('click', function (e) {
                const rect = button.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const ripple = document.createElement('span');
                ripple.style.cssText = `
                    position: absolute;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    pointer-events: none;
                    width: 100px;
                    height: 100px;
                    left: ${x - 50}px;
                    top: ${y - 50}px;
                    transform: scale(0);
                    animation: rippleEffect 0.6s ease-out;
                `;

                button.style.position = 'relative';
                button.style.overflow = 'hidden';
                button.appendChild(ripple);

                setTimeout(function () {
                    ripple.remove();
                }, 600);
            });
        });

        // Add ripple keyframes dynamically
        if (!document.querySelector('#ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                @keyframes rippleEffect {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Initialize button ripple
    initButtonRipple();

    /**
     * Parallax effect for hero section (subtle)
     */
    function initParallax() {
        const hero = document.querySelector('.lp-hero');
        if (!hero) return;

        window.addEventListener('scroll', function () {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;

            if (hero.querySelector('.lp-hero-grid')) {
                hero.querySelector('.lp-hero-grid').style.transform =
                    'translateY(' + rate + 'px)';
            }
        }, { passive: true });
    }

    // Initialize parallax
    initParallax();

    /**
     * Navbar active state based on scroll position
     */
    function initActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.lp-nav-menu a');

        if (sections.length === 0 || navLinks.length === 0) return;

        window.addEventListener('scroll', function () {
            let current = '';

            sections.forEach(function (section) {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;

                if (window.pageYOffset >= sectionTop - 200) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(function (link) {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        }, { passive: true });
    }

    initActiveNavLink();

    /**
     * Handle window resize
     */
    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            // Recalculate anything needed on resize
            initScrollAnimations();
        }, 250);
    });

})();

