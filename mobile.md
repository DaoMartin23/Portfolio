# Mobile audit

Audited 2026-09-15. Chrome mobile emulation (iPhone UA, touch, DPR 2) at 375×812, 320×568, 414×896, 812×375 landscape. Pages: `index.html`, `projects/f1-strategy-sim.html`, `projects/fpl.html`, `projects/project-3.html`. Lighthouse mobile on index + f1 page. No code changed during audit.

## Rules for the AI doing the fixes

- Each issue has checkboxes. **Only implement items marked `[x]`.** Skip every `[ ]` item, even inside an issue that has other items checked.
- Issue with nothing checked → don't touch it.
- Items marked "don't check both" are alternatives. If both are checked anyway, do the first one and say so.
- Don't fix anything not listed. Minimal changes, match surrounding code style and comment density.
- `css/style.css` is shared by index, project pages and `legacy/`. `css/bento.css` is index only. Index-only fixes → bento.css. Shared fixes → style.css, then re-check project pages.
- The loader running on every page load is the owner's deliberate choice. Don't remove it or gate it per session. Only change it via checked M11 items.
- Line numbers are as of the audit. If they've drifted, search for the selector.
- After fixing: screenshot touched areas at 375 and 320, confirm no horizontal page scroll, Lighthouse mobile accessibility still 100, no console errors.

## Summary

| ID  | Sev  | Issue                                                                | Where         |
| --- | ---- | -------------------------------------------------------------------- | ------------- |
| M1  | High | Mobile menu taps open the wrong section                              | all pages     |
| M2  | High | Hero text + helmet squeezed side by side on phones                   | index         |
| M3  | Med  | Stat tiles uneven, labels 9.6px                                      | index         |
| M4  | Med  | Form inputs <16px → iOS zooms on focus                               | index         |
| M5  | Med  | Mobile menu won't close on Escape / outside tap, page scrolls behind | all pages     |
| M6  | Med  | Small tap targets (back link, logo, landscape nav)                   | all pages     |
| M7  | Low  | Hover styles stick after tap                                         | all pages     |
| M8  | Low  | Labels at 11.2px                                                     | all pages     |
| M9  | Low  | Contact form cramped at 320px                                        | index         |
| M10 | Low  | Code blocks cut off mid-word, no scroll cue                          | project pages |
| M11 | Low  | Loader blocks page ~4.6s every load                                  | index         |
| M12 | Low  | Large empty gaps between sections on phones                          | index         |

---

### M1 · High · Mobile menu taps open the wrong section

**Where:** `style.css:297` (`@media (max-width: 719px) .nav__links a`). Affects index + all project pages.
**Evidence:** Menu `<a>` elements are inline, with `padding: 0.75rem 0`. Each hit box is 41px tall but rows are only ~20px apart, so boxes overlap and the next link sits on top. `elementFromPoint` at link centre:

| Tapped     | Actually opens |
| ---------- | -------------- |
| About      | #experience    |
| Experience | #projects      |
| Projects   | #contact       |

Only the top ~8px of each link works. Same on `projects/fpl.html`. A JS `.click()` lands correctly, so the hrefs are fine and it's purely hit area. Divider lines not visible in the open-menu screenshot either.

- [x] Make mobile menu links full-width block rows (`display: block` or flex) so each row is ≥44px and taps hit the right link
- [x] After that, check divider lines show as full-width separators, no border under the last row on project pages (index already removes it in `bento.css:199`)

### M2 · High · Hero headline + helmet squeezed side by side on phones

**Where:** `bento.css:229` `.hero__stage { grid-template-columns: repeat(12, 1fr) }` comes after the tablet override at `bento.css:61` (`repeat(6, 1fr)`), so the 12-col rule wins at every width.
**Evidence:** At 375: `.hero__text` and `.hero__visual` each `span 6` of 12 → two 163px columns. Intro paragraph runs to 8–10 lines in the narrow column, H1 wraps to 3 lines ("Python & / AI / developer"), "Open to placements" pill wraps to 2 lines, caption wraps. Same at 320 and 414. Landscape is fine.

- [x] Fix the cascade so ≤999px the hero stage is 6 columns (text full width, helmet below)
- [x] Phones (≤639px): smaller centred helmet under the text (e.g. ~200px tall) so stat tiles don't drop far below the first screen
- [x] Phones: hide `.hero__caption` ("LAP 01 · SECTOR 2 · #034694"). Decorative, wraps awkwardly, 11.2px

### M3 · Med · Stat tiles uneven + labels 9.6px

**Where:** `bento.css:266-269` (phone stat rules), `bento.css:211` (`.hero { align-items: center }`).
**Evidence:** `.stat__label` is `0.6rem` = 9.6px on ≤639px. At 375 the third tile ("1 F1 obsession", label on one line) is 83px tall vs 98px for the others, and it's vertically centred, so it sits 7px lower and shorter. Aligned at 320 only because every label wraps there.

- [x] Make the three stat tiles equal height and top-aligned (stretch)
- [x] Raise `.stat__label` on phones to ≥11px (0.7rem). Confirm three still fit across at 320

### M4 · Med · Contact inputs trigger iOS zoom on focus

**Where:** `style.css:717` (`.form input, .form textarea` → `font-size: 0.95rem`). Not overridden in `bento.css:538`.
**Evidence:** Name, email and message compute to 15.2px. iOS Safari zooms the page when a field under 16px is focused and doesn't zoom back out.

- [x] Set contact inputs + textarea to `font-size: 16px` (1rem)
- [x] Add `enterkeyhint="next"` to the name and email inputs (keyboard shows Next)

### M5 · Med · Mobile menu doesn't close / page scrolls behind it

**Where:** `js/main.js:26-43` (toggle only closes on button tap or link tap).
**Evidence:** Tested on index + project pages. Escape doesn't close. A tap outside the nav doesn't close. The page scrolls underneath while the menu stays open.

- [x] Close menu on tap/click outside the nav
- [x] Close menu on Escape, move focus back to the toggle button
- [x] Close menu when the user scrolls the page (don't check both with the next item)
- [x] Lock page scroll while the menu is open (don't check both with the previous item)

### M6 · Med · Small tap targets

**Where / evidence:**

- **Back link:** `.back-link` "← All projects", 118×19px, `style.css:788`. At the top of every project page.
- **Logo:** `.nav__logo` "Martin Dao", 106×26px, `style.css:216`. All pages.
- **Landscape nav:** desktop nav links are 26px tall (`style.css:247`). Landscape phones (812px wide) are above the 719px breakpoint, so they get the desktop nav.
- **Not an issue:** project card title links (23–29px) are covered by a card-wide link overlay (`style.css:656`), so the whole card is tappable.

- [x] Back link: ≥44px tall hit area (padding/min-height), same visual look
- [x] Nav logo: ≥44px tall hit area
- [x] Desktop nav links: taller hit area (padding-block) so landscape phones get ≥44px (don't check both with the next item)
- [x] Use the hamburger menu up to ~900px wide instead of 719px, covering landscape phones (don't check both with the previous item)

### M7 · Low · Hover styles stick after tap on touch

**Where:** No `@media (hover: hover)` guards anywhere. Examples:

- project card glow: `bento.css:118`
- contact badge glow + blue value: `bento.css:508-513`
- send button brighten: `bento.css:568`
- nav link underline: `style.css:253`
- project pager: `style.css:935`
- `.card:hover`: `style.css:549-551`

**Evidence:** Standard touch behaviour (not measured). After tapping, `:hover` stays applied until the user taps elsewhere, e.g. a card keeps its glow after coming back to the page.

- [x] Wrap decorative `:hover` rules in `@media (hover: hover)`. Leave `:focus-visible` styles unchanged

### M8 · Low · Labels at 11.2px

**Where:** `0.7rem` = 11.2px:

- `.hero__caption`: `style.css:437`
- `.card__idx` "P-01": `style.css:558`
- `.fact__label` (project page facts): `style.css:909`
- `.project-pager .label` "← PREVIOUS": `style.css:937`

Many mono uppercase labels sit at 12px (chips, dates, section tags, "READ MORE"). Borderline, left alone.

- [x] Raise the 11.2px labels above to ≥12px on phones

### M9 · Low · Contact form cramped at 320px

**Where:** `bento.css:590-594` (phone contact rules).
**Evidence:** Page gutter + panel padding (1.25rem) + card padding (1.25rem) nest three insets, leaving inputs ~203px wide at 320px.

- [x] Phones: remove the inner form card's box (no bg/border, zero padding) so fields use the panel width (don't check both with the next item)
- [x] Phones: halve panel and card padding instead (don't check both with the previous item)

### M10 · Low · Code blocks cut off without a cue

**Where:** `style.css:864` (`.project-section pre`).
**Evidence:** At 375 the blocks scroll sideways: f1 page 386px content in 334px, fpl page 639px in 334px. Text is cut mid-word ("# Success: no issues f") and nothing signals there's more.

- [x] Wrap code on phones (`white-space: pre-wrap`) (don't check both with the next item)
- [x] Keep scrolling, add a right-edge fade hint on phones (don't check both with the previous item)

### M11 · Low · Loader blocks the page ~4.6s on every load

**Where:** `js/loader.js:26-30` (timings), `:47` (`body.is-loading` → `overflow: hidden`).
**Evidence:** ~4.6s from navigation to usable page at 320/375/414. Scroll is locked the whole time. Owner wants the loader on every load, so these items only change its length or add a skip.

- [x] Tap anywhere on the loader to skip straight to the reveal (loader still shows on every load)
- [x] Phones (≤639px): shorter drive, e.g. `DRIVE_MS` 2600 → 1800. Keep `HOLD_MS` 1200

### M12 · Low · Large empty gaps between sections on phones

**Where:** `bento.css:16` (`--group-gap: clamp(5rem, 12vw, 10rem)`).
**Evidence:** ~110px of empty space between the end of one section and the next banner at 375. Home page is 6,400px tall at 375.

- [x] Phones: reduce group gap (e.g. 3.5rem)

---

## Checked, no action needed

- No horizontal page scroll on any of the 4 pages at 320 / 375 / 414 / landscape
- Viewport meta correct; hero uses `100svh`; `-webkit-text-size-adjust: 100%` set
- Lighthouse mobile:

    | Page    | Perf | A11y | Best practices | SEO | LCP  | CLS   |
    | ------- | ---- | ---- | -------------- | --- | ---- | ----- |
    | index   | 100  | 100  | 100            | 100 | 1.5s | 0.024 |
    | f1 page | 100  | 100  | 100            | 100 | 1.8s | 0     |

    Only flags are unminified CSS/JS and cache headers. Hosting-level, skip.

- Section offset after a nav jump is correct: the heading lands below the floating nav (verified with JS click)
- Hamburger toggle is 44×44 and updates `aria-expanded`
- Hero buttons, contact rows and project cards have ≥44px hit areas
- Scroll progress on phones is the 3px top bar and doesn't cover the nav
- No console errors on any page
