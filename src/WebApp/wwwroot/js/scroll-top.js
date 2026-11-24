// Drives the big blue "back to top" button (Components/Layout/ScrollToTopButton.razor).
//
// Click: scrolls the window back to the top, smoothly unless the shopper prefers reduced
// motion. When the button is activated from the keyboard, focus also moves to the brand
// link in the header so the next Tab continues from the top of the page.
//
// Position: like the chatbot launcher (see chat-fab.js) the button FLOATS at its corner
// while the page scrolls and DOCKS onto the content/footer divider as the footer rises
// into view, so it never covers the footer links. We only write the CSS custom property
// --fab-bottom (transform is reserved for hover/press states), so it tracks scrolling
// 1:1. When the footer is taller than the screen (phones) the button keeps floating in
// the corner instead, and the footer gets an empty strip at its end for the button.
// With no JS the CSS default simply floats the button at the corner gap.
(function () {
    const button = () => document.querySelector('[data-scroll-top]');
    const footer = () => document.querySelector('.eshop-footer');

    let raf = 0;

    // Comfortable corner gap, mirroring chat-fab.js.
    function gapPx() {
        return Math.min(32, Math.max(20, window.innerWidth * 0.04));
    }

    function measure() {
        raf = 0;
        const b = button();
        if (!b) return;

        const gap = gapPx();
        const h = b.offsetHeight || 64;
        let bottom = gap;
        let reserve = 0;
        const ft = footer();
        if (ft) {
            const rect = ft.getBoundingClientRect();
            // Height of the footer without the strip we may have reserved earlier.
            const ownHeight = rect.height - (parseFloat(ft.style.paddingBottom) || 0);
            if (ownHeight + h / 2 + gap <= window.innerHeight) {
                // The whole footer fits on screen (tablet, desktop): lift the button so
                // its centre rides the footer's top edge once the footer is high enough;
                // below that it settles back to the corner.
                const docked = window.innerHeight - rect.top - h / 2;
                if (docked > bottom) bottom = docked;
            } else {
                // The footer is taller than the screen (phones). Docking would carry the
                // button off the top of the screen at the end of the page, exactly where
                // a back-to-top button is needed, so it keeps floating in the corner and
                // the footer gets an empty strip at its end for the button to sit on.
                reserve = h + 2 * gap;
            }
        }
        b.style.setProperty('--fab-bottom', Math.round(bottom) + 'px');
        if (ft) {
            const pad = reserve ? Math.round(reserve) + 'px' : '';
            if (ft.style.paddingBottom !== pad) ft.style.paddingBottom = pad;
        }
    }

    function schedule() { if (!raf) raf = requestAnimationFrame(measure); }

    function scrollToTop(event) {
        const b = event.target instanceof Element ? event.target.closest('[data-scroll-top]') : null;
        if (!b) return;
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'auto' : 'smooth' });
        // detail is 0 for a click synthesised from Enter/Space on a focused button.
        if (event.detail === 0) {
            const start = document.querySelector('.eshop-brand');
            if (start) start.focus({ preventScroll: true });
        }
    }

    // Delegated, so it keeps working after enhanced navigation swaps the layout markup.
    document.addEventListener('click', scrollToTop);

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('load', schedule);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', schedule, { passive: true });
        window.visualViewport.addEventListener('scroll', schedule, { passive: true });
    }
    // Page height changes (images loading, route content swapping) move the footer.
    if (window.ResizeObserver) {
        try { new ResizeObserver(schedule).observe(document.body); } catch { /* ignore */ }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', measure);
    } else {
        measure();
    }

    // Enhanced navigation morphs the DOM back to server markup, stripping the inline
    // --fab-bottom; recompute after each enhanced load once the new content settles.
    (function hookEnhancedNav() {
        if (window.Blazor && typeof window.Blazor.addEventListener === 'function') {
            window.Blazor.addEventListener('enhancedload', () => { schedule(); setTimeout(measure, 60); });
        } else {
            setTimeout(hookEnhancedNav, 150);
        }
    })();
})();
