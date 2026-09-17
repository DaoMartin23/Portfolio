/* ==========================================================================
   main.js — nav, scroll reveals (GSAP + ScrollTrigger), stat count-up,
   speed-line draw, contact form. Shared by index.html and /projects/*.html.
   Everything degrades: no GSAP → content is simply visible.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';

  /* ---- Nav: transparent at top, solid after 40px ------------------------ */
  var nav = document.querySelector('.nav');
  if (nav) {
    var ticking = false;
    function updateNav() {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(updateNav); ticking = true; }
    }, { passive: true });
    updateNav();

    // Mobile toggle
    var toggle = nav.querySelector('.nav__toggle');
    var links = nav.querySelector('.nav__links');
    if (toggle && links) {
      function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }
      function setMenu(open) {
        toggle.setAttribute('aria-expanded', String(open));
        links.classList.toggle('is-open', open);
        nav.classList.toggle('is-open', open);
      }
      toggle.addEventListener('click', function () { setMenu(!isOpen()); });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') setMenu(false);
      });
      // Close on a tap outside the nav, on Escape (focus back to the toggle)
      // and when the page scrolls.
      document.addEventListener('click', function (e) {
        if (isOpen() && !nav.contains(e.target)) setMenu(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen()) { setMenu(false); toggle.focus(); }
      });
      window.addEventListener('scroll', function () {
        if (isOpen()) setMenu(false);
      }, { passive: true });
    }

    // Highlight the section in view (index only)
    var sections = document.querySelectorAll('main section[id]');
    var navAnchors = nav.querySelectorAll('.nav__links a[href^="#"]');
    if (sections.length && navAnchors.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navAnchors.forEach(function (a) {
            var match = a.getAttribute('href') === '#' + entry.target.id;
            if (match) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      sections.forEach(function (s) { io.observe(s); });
    }
  }

  /* ---- Scroll progress (index.html) -------------------------------------- */
  // Desktop: the car sprite drives down a line on the right edge with a %
  // readout and S1-S3 ticks at About / Experience / Projects. Mobile: a 3px
  // top bar. Which variant shows is CSS (css/bento.css); this only writes
  // --p, the car's translateY and each sector's --at. Kept above the
  // reduced-motion return so it always runs.
  var progress = document.querySelector('.scroll-progress');
  if (progress) {
    var progressCar = progress.querySelector('.scroll-progress__car');
    var progressReadout = progress.querySelector('.scroll-progress__readout');
    var progressStatus = document.querySelector('[data-scroll-status]');
    var sectors = [];
    progress.querySelectorAll('[data-sector]').forEach(function (el) {
      var section = document.getElementById(el.dataset.sector);
      if (section) sectors.push({ el: el, section: section, stop: 0 });
    });
    var maxScroll = 1, trackH = 0, lastSector = -2, progressTicking = false;

    function measureProgress() {
      maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
      trackH = window.innerHeight;
      sectors.forEach(function (s) {
        // Where the nav link for this section lands: its top minus scroll-margin.
        var top = s.section.getBoundingClientRect().top + window.scrollY -
          (parseFloat(getComputedStyle(s.section).scrollMarginTop) || 0);
        s.stop = Math.min(Math.max(0, top), maxScroll);
        s.el.style.setProperty('--at', (s.stop / maxScroll * trackH) + 'px');
      });
    }

    function renderProgress() {
      var y = window.scrollY;
      var p = Math.min(1, Math.max(0, y / maxScroll));
      progress.style.setProperty('--p', p);
      progressCar.style.transform = 'translateY(' + (p * trackH) + 'px)';
      progressReadout.textContent = Math.round(p * 100) + '%';
      var current = -1;
      sectors.forEach(function (s, i) {
        var passed = y + 1 >= s.stop; // 1px slack for sub-pixel section tops
        s.el.classList.toggle('is-passed', passed);
        if (passed) current = i;
      });
      if (current !== lastSector) {
        // -2 only on the first render, so a restored scroll position stays quiet.
        if (current >= 0 && lastSector !== -2 && progressStatus) {
          progressStatus.textContent = sectors[current].el.dataset.label;
        }
        lastSector = current;
      }
      progress.classList.toggle('is-visible', y > 0);
      progressTicking = false;
    }

    function refreshProgress() { measureProgress(); renderProgress(); }
    window.addEventListener('scroll', function () {
      if (!progressTicking) { requestAnimationFrame(renderProgress); progressTicking = true; }
    }, { passive: true });
    window.addEventListener('resize', refreshProgress);
    if ('ResizeObserver' in window) new ResizeObserver(refreshProgress).observe(document.body);
    refreshProgress();
  }

  /* ---- Cursor glow on bento tiles (index.html) ---------------------------- */
  // Every .tile inside a [data-glow] container gets a blue glow that follows
  // the cursor (drawn by the tile's ::after in css/bento.css). Pointer moves
  // write the position as CSS variables on the tile; is-hover fades the glow
  // in and out. Only for devices that can hover.
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('[data-glow] .tile').forEach(function (tile) {
      tile.addEventListener('pointermove', function (e) {
        var r = tile.getBoundingClientRect();
        tile.style.setProperty('--gx', (e.clientX - r.left) + 'px');
        tile.style.setProperty('--gy', (e.clientY - r.top) + 'px');
      });
      tile.addEventListener('pointerenter', function () { tile.classList.add('is-hover'); });
      tile.addEventListener('pointerleave', function () { tile.classList.remove('is-hover'); });
    });
  }

  /* ---- Footer year ------------------------------------------------------ */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---- Stat count-up helper -------------------------------------------- */
  function countUp(el, duration) {
    var target = parseInt(el.dataset.count, 10) || 0;
    if (!hasGsap || reduced) { el.textContent = String(target); return; }
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: duration || 0.8,
      ease: 'power2.out',
      onUpdate: function () { el.textContent = String(Math.round(obj.v)); }
    });
  }

  /* ---- No GSAP or reduced motion: make everything visible and stop ------ */
  if (!hasGsap || reduced) {
    root.classList.remove('js');
    document.querySelectorAll('[data-count]').forEach(function (el) { countUp(el); });
    initForm();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---- Hero: runs once the loader is done (or immediately if it never ran) */
  // With the loader: the hero is already painted beneath the overlay (see
  // .has-loader in style.css) so the curtain lift is the reveal; we only run
  // the stat count-up once it's visible. Without the loader (repeat visit in
  // the same session, project pages): fade-up the hero items.
  var heroCounts = document.querySelectorAll('[data-hero] [data-count]');
  function heroCountUp() {
    heroCounts.forEach(function (el) {
      gsap.delayedCall(0.3, function () { countUp(el, 0.8); });
    });
  }

  // Hero visual (home pages only). index.html: the helmet (.hero__art) fades
  // in and slides 24px from the left. legacy/index.html: the telemetry trace
  // draws in over 1.2s first, then the car (.hero__car) does the same. Either
  // way the artwork then lags the page by 20px on scroll (scrubbed parallax).
  // Wheels stay still here.
  function heroVisualIn() {
    var trace = document.querySelector('.hero__trace');
    var car = document.querySelector('.hero__car, .hero__art');
    if (!car) return;
    // GSAP moves SVG children in viewBox units, so convert px → units.
    var svg = car.ownerSVGElement;
    var k = svg.viewBox.baseVal.width / Math.max(1, svg.getBoundingClientRect().width);
    var tl = gsap.timeline();
    if (trace) tl.to(trace, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' });
    tl.fromTo(car, { opacity: 0, x: -24 * k }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' });
    gsap.to(car, {
      y: 20 * k, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  function heroReveal() { heroCountUp(); heroVisualIn(); }
  function heroIn() {
    var items = document.querySelectorAll('[data-hero] [data-reveal]');
    if (items.length) {
      gsap.set(items, { y: 24 });
      gsap.to(items, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' });
    }
    heroReveal();
  }
  if (root.classList.contains('has-loader') && root.dataset.loader !== 'done') {
    document.addEventListener('loader:done', heroReveal, { once: true });
  } else if (root.classList.contains('has-loader')) {
    heroReveal();
  } else {
    heroIn();
  }

  /* ---- Scroll reveals: fade-up y:24, 0.6s, stagger 0.08, once ----------- */
  document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
    var items = group.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    gsap.set(items, { y: 24 });
    gsap.to(items, {
      opacity: 1, y: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: group, start: 'top 85%', once: true }
    });
  });

  // Standalone reveals not inside a group or the hero
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    if (el.closest('[data-reveal-group]') || el.closest('[data-hero]')) return;
    gsap.set(el, { y: 24 });
    gsap.to(el, {
      opacity: 1, y: 0,
      duration: 0.6,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  /* ---- Speed lines: draw in via stroke-dashoffset ----------------------- */
  document.querySelectorAll('.speed-lines').forEach(function (svg) {
    var lines = svg.querySelectorAll('line');
    gsap.to(lines, {
      strokeDashoffset: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.out',
      scrollTrigger: { trigger: svg.parentElement, start: 'top 85%', once: true }
    });
  });

  /* ---- Count-ups outside the hero --------------------------------------- */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    if (el.closest('[data-hero]')) return;
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: function () { countUp(el, 0.8); }
    });
  });

  initForm();

  /* ---- Contact form: progressive enhancement over a normal POST --------- */
  function initForm() {
    var form = document.querySelector('.form[data-enhance]');
    if (!form || !window.fetch) return;
    var status = form.querySelector('.form__status');
    var button = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) { status.textContent = 'Sending…'; status.className = 'form__status'; }
      if (button) button.disabled = true;
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        form.reset();
        if (status) { status.textContent = 'Sent. Box box. I’ll reply soon.'; status.classList.add('is-ok'); }
      }).catch(function () {
        if (status) { status.textContent = 'Something went wrong. Email me directly instead.'; status.classList.add('is-error'); }
      }).finally(function () {
        if (button) button.disabled = false;
      });
    });
  }
})();
