/* ==========================================================================
   Loader — an F1 car silhouette drives across the screen and "reveals" the name.
   It runs on every page load (no session memory).

   How it works, top to bottom:
     1. Bail out early if the overlay isn't on this page.
     2. Split the name into per-letter <span>s and measure where each letter
        sits on the x-axis. Measured once, before the car starts moving.
     3. Drive the car with requestAnimationFrame. Every frame we compute the
        car's translateX from an ease-out curve, apply it, and compare the
        car's REAR edge to each letter's x. When the rear passes a letter,
        that letter gets the `.is-in` class. So the reveal is keyed to the
        car's position, not a fixed timer: resize the window and it still
        reads as "the car uncovered the letters".
     4. Wheels rotate by distance travelled (circumference maths) so they look
        like they're rolling rather than spinning.
     5. After the car exits and the last letter has landed, hold, then slide
        the overlay up and dispatch `loader:done` so main.js can start the
        hero animation.

   Timings (ms) — edit these:
   ========================================================================== */
(function () {
  'use strict';

  // car travel time, left edge to right edge; shorter on phones (≤639px)
  var DRIVE_MS = window.matchMedia('(max-width: 639px)').matches ? 1800 : 2600;
  var LETTER_MS = 350;        // matches the CSS transition on .loader__letter
  var HOLD_MS = 1200;         // pause on the full name after the last letter lands
  var SLIDE_MS = 500;         // matches .loader.is-leaving transition
  var REDUCED_HOLD_MS = 600;  // reduced-motion: how long the name is shown
  var WHEEL_RADIUS_UNITS = 121; // tyre radius in SVG viewBox units

  var loader = document.getElementById('loader');
  var root = document.documentElement;

  /* Tell main.js the loader is finished (or never ran). Called exactly once. */
  function finish() {
    if (root.dataset.loader === 'done') return;
    root.dataset.loader = 'done';
    document.body.classList.remove('is-loading');
    document.dispatchEvent(new CustomEvent('loader:done'));
  }

  /* ---- 1. Early exits --------------------------------------------------- */
  if (!loader) { finish(); return; }

  document.body.classList.add('is-loading');

  var textEl = loader.querySelector('.loader__text');
  var rows = loader.querySelectorAll('[data-name]'); // .loader__name, .loader__role
  var car = loader.querySelector('.loader__car');
  var carBody = car ? car.querySelector('.car-body') : null;
  var wheels = car ? car.querySelectorAll('.wheel') : [];

  /* ---- 2. Split each row into letters ----------------------------------- */
  // Markup is <p class="loader__name" data-name="MARTIN DAO"></p> plus
  // <p class="loader__role" data-name="SOFTWARE ENGINEER"></p>. Each word
  // becomes .loader__word so rows can wrap onto multiple lines on narrow
  // screens. Both rows are revealed by the same car pass (triggers are
  // x-only), so a letter in the role row lands together with the name letter
  // above it.
  var letters = [];
  Array.prototype.forEach.call(rows, function (rowEl) {
    var text = rowEl.dataset.name || '';
    rowEl.setAttribute('aria-label', text);
    rowEl.textContent = '';
    text.split(' ').forEach(function (word) {
      var w = document.createElement('span');
      w.className = 'loader__word';
      w.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch) {
        var s = document.createElement('span');
        s.className = 'loader__letter';
        s.textContent = ch;
        w.appendChild(s);
        letters.push(s);
      });
      rowEl.appendChild(w);
    });
  });

  /* Size the car so it is exactly as tall as the two rows of text combined.
     Width follows from the SVG's viewBox aspect ratio. */
  function sizeCar() {
    if (!car || !textEl) return;
    var h = textEl.getBoundingClientRect().height;
    if (h > 0) car.style.height = h + 'px';
  }
  sizeCar();

  /* ---- Reduced motion: show the name, hold, fade ------------------------ */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !car || !carBody) {
    letters.forEach(function (l) { l.classList.add('is-in'); });
    setTimeout(function () {
      loader.classList.add('is-fading');
      setTimeout(function () {
        loader.remove();
        finish();
      }, 450);
    }, REDUCED_HOLD_MS);
    return;
  }

  /* ---- 3. Measure ------------------------------------------------------- */
  // Letter trigger points: the horizontal centre of each letter, in viewport px.
  var triggers = letters.map(function (l) {
    var r = l.getBoundingClientRect();
    return { el: l, x: r.left + r.width / 2, done: false };
  });

  var vw = window.innerWidth;
  var carRect, bodyRect, carW, rearOffset, unit, wheelCircumference;
  var startX, endX, distance;
  function measureCar() {
    carRect = car.getBoundingClientRect();     // the SVG incl. its trail
    bodyRect = carBody.getBoundingClientRect(); // just the car
    carW = carRect.width;
    // The trail sits to the left of the car, so the rear of the CAR is offset
    // from the SVG's left edge. Measured while translateX = -100% (off screen),
    // so subtract the SVG's own left to get the offset.
    rearOffset = bodyRect.left - carRect.left;
    // Pixel length of one SVG unit, for the wheel roll maths.
    unit = carW / car.viewBox.baseVal.width;
    wheelCircumference = 2 * Math.PI * WHEEL_RADIUS_UNITS * unit;
    startX = -carW;  // fully off the left edge
    endX = vw;       // fully off the right edge
    distance = endX - startX;
  }
  measureCar();
  /* ---- 4. Drive --------------------------------------------------------- */
  // Quadratic ease-out: brisk but not so front-loaded that the reveal is over
  // before you see it. Swap for Math.pow(1 - t, 3) if you want it snappier.
  function easeOut(t) { return 1 - Math.pow(1 - t, 2); }

  var t0 = null;
  var lastLetterAt = 0;

  function frame(now) {
    if (leaving) return; // skipped by a tap
    if (t0 === null) t0 = now;
    var p = Math.min((now - t0) / DRIVE_MS, 1);
    var x = startX + distance * easeOut(p);

    // Apply the car's translateX (keeping the vertical centring).
    car.style.transform = 'translate3d(' + x + 'px, -50%, 0)';

    // Wheels: rotate by how far we've rolled since the start.
    var travelled = x - startX;
    var deg = (travelled / wheelCircumference) * 360;
    for (var i = 0; i < wheels.length; i++) {
      wheels[i].style.transform = 'rotate(' + deg + 'deg)';
    }

    // Reveal: the rear of the car is at x + rearOffset. Any letter whose
    // centre is now behind the rear gets revealed.
    var rearX = x + rearOffset;
    for (var j = 0; j < triggers.length; j++) {
      var tr = triggers[j];
      if (!tr.done && rearX >= tr.x) {
        tr.done = true;
        tr.el.classList.add('is-in');
        lastLetterAt = now;
      }
    }

    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      // Safety net: if any letter never triggered (e.g. weird resize), show it.
      triggers.forEach(function (tr) {
        if (!tr.done) { tr.el.classList.add('is-in'); lastLetterAt = now; }
      });
      car.style.visibility = 'hidden';
      // Wait for the last letter's transition to complete, then hold.
      var wait = Math.max(0, lastLetterAt + LETTER_MS - now) + HOLD_MS;
      setTimeout(leave, wait);
    }
  }

  /* ---- 5. Leave --------------------------------------------------------- */
  var leaving = false;
  function leave() {
    if (leaving) return;
    leaving = true;
    loader.classList.add('is-leaving');
    // Let the page start animating while the curtain lifts.
    finish();
    setTimeout(function () { loader.remove(); }, SLIDE_MS + 50);
  }

  // Tap anywhere on the loader to skip straight to the reveal.
  loader.addEventListener('click', function () {
    letters.forEach(function (l) { l.classList.add('is-in'); });
    car.style.visibility = 'hidden';
    leave();
  });

  // Fonts affect letter positions; wait for them if the API exists, but never
  // longer than ~150ms so the loader stays snappy.
  var started = false;
  function start() {
    if (started) return;
    started = true;
    // Re-measure in case fonts swapped in after the initial measurement:
    // letter positions, the text block height (which sets the car's size)
    // and therefore the car's own geometry.
    triggers.forEach(function (tr) {
      var r = tr.el.getBoundingClientRect();
      tr.x = r.left + r.width / 2;
    });
    sizeCar();
    measureCar();
    requestAnimationFrame(frame);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
    setTimeout(start, 150);
  } else {
    start();
  }
})();
