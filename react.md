# Porting this site to React

Notes only. No code changed.

## 1. Verdict

- Easy to moderate. Mostly mechanical.
- Estimate: 1.5 to 3 days focused work.
- Site is static content, no backend, almost no state. React has little to "manage" here.
- CSS carries over untouched.
- Hard bits: loader (rAF + DOM measuring), GSAP lifecycle inside React, keeping Lighthouse 100 and SEO (needs prerendered HTML, not a plain client-side SPA).

Current size, for scale:

| File | Lines |
|---|---|
| index.html | 921 |
| css/style.css | 1058 |
| css/bento.css | 306 |
| js/main.js | 231 |
| js/loader.js | 211 |
| projects/*.html (3) | 130 to 171 each |

## 2. Recommended stack

- Vite + React + TypeScript.
- React Router v7 with static prerender (every route built to real HTML).
- GSAP from npm + `@gsap/react` (`useGSAP` hook).
- Deploy: GitHub Actions builds, pushes `dist/` to GitHub Pages.
- Why: TS + React already on the CV, prerender keeps fast first paint and crawlable content.
- Alternatives: Astro with React islands if raw performance matters most. Next.js static export if Next on the CV matters more than simplicity.

## 3. What moves over as is

- `css/style.css` and `css/bento.css`: import once in `main.tsx`. No CSS modules needed. Class names stay.
- `assets/`: into `public/` or imported.
- Google Fonts links, meta tags, favicon: stay in root `index.html`.
- Scroll-to-top-on-refresh inline script: stays in `index.html` head. Must run before React loads.
- GSAP + ScrollTrigger: npm instead of cdnjs.
- All copy: unchanged, just moves into JSX or data files.

## 4. HTML to JSX checklist

- `class` to `className`, `for` to `htmlFor`.
- `tabindex` to `tabIndex`, `autocomplete` to `autoComplete`, `focusable` stays string.
- SVG attrs camelCase: `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `fill-rule`, `text-anchor`, `stop-color`, `stop-opacity`, `clip-path`, `font-family`, `font-weight`, `font-size`, `letter-spacing`, `vector-effect`.
- `pathLength`, `viewBox` already fine.
- Void tags self-close: `<input />`, `<br />`.
- `<!-- -->` to `{/* */}`.
- `aria-*`, `data-*` unchanged.
- `style="..."` strings to objects (few, if any, here).
- Helmet SVG (~140 lines) and loader car: better as SVGR components (`vite-plugin-svgr`) than pasted JSX. Helmet gradient/filter ids (`clip`, `visor`, `chrome` etc.) must stay unique on the page; fine while helmet renders once.
- Car sprite (`<symbol id="car-silhouette">`): render once in layout, `<use href="#car-silhouette" />` keeps working.
- Tip: an HTML-to-JSX converter handles 90% of this in one pass.

## 5. Component tree

```
App
└─ Layout
   ├─ CarSprite
   ├─ Nav
   ├─ <Outlet />
   │  ├─ Home
   │  │  ├─ Loader
   │  │  ├─ Hero (HeroText, HelmetArt)
   │  │  ├─ StatTiles
   │  │  ├─ Section (SectionBanner + children)
   │  │  │  ├─ About
   │  │  │  ├─ Experience
   │  │  │  ├─ Projects
   │  │  │  └─ Contact (ContactLinks, ContactForm)
   │  └─ ProjectPage (one template, all 3 projects)
   └─ Footer
Shared: Tile (glow built in), Chip, Button, Pill
```

- `Tile` props: `span`, `md`, `sm`, `as`, `className`. Outputs the same `tile span-N md-N sm-N` classes, so bento.css still works.

## 6. Pull content into data

`src/data/`:

- `projects.ts`: slug, title, index, summary, tags, repo, note, plus page sections (headings, paragraphs, arch cards, facts, commands, next steps).
- `experience.ts`: date, title, org, bullets.
- `stats.ts`: value, suffix, label.
- `skills.ts`: string array.
- `values.ts`: the three About cards.

Result: project cards, timeline, chips, stats and all three project pages become `.map()` over data. Three near-identical project HTML files collapse into one `ProjectPage` + route `/projects/:slug`. Biggest maintainability win of the whole port.

## 7. Porting each behaviour

| Now (vanilla) | React version | Effort |
|---|---|---|
| Nav `is-scrolled` after 40px | `useEffect` scroll listener, `useState` boolean | small |
| Mobile menu toggle | `useState`, close on link click | small |
| Nav highlight section in view | `useActiveSection` hook with `IntersectionObserver` | small |
| Tile cursor glow | `onPointerMove/Enter/Leave` on `Tile`, write `--gx/--gy` via ref, not state (no re-render per move) | small |
| Stat count-up | `useGSAP` in `StatTiles`, start on loader done | small |
| Scroll reveals (`data-reveal`) | `useGSAP` + ScrollTrigger scoped to each section ref, auto cleanup | medium |
| Helmet fade + parallax | `useGSAP` in `HelmetArt` | small |
| Loader | see below | medium to large |
| Contact form (Formspree fetch) | `onSubmit` + `fetch`, status in `useState`, keep native `action` as fallback | small |
| Footer year | inline `{new Date().getFullYear()}` | trivial |
| Reduced motion checks | `usePrefersReducedMotion` hook via `matchMedia` | small |

Loader details:

- `useLayoutEffect` + refs for car, car body, wheels, letters.
- Letters rendered from the name string in JSX (no DOM splitting).
- Measure after `document.fonts.ready` (same 150ms cap as now).
- rAF loop in a ref, cancel on unmount.
- `onDone` callback prop replaces the `loader:done` event; `Home` holds `loaderDone` state.
- Unmount via state instead of `loader.remove()`.
- `body.is-loading` toggled in the effect.
- Timings stay as constants at top of the file.

## 8. Gotchas that bite

- **StrictMode double effects** (dev only): loader would start twice, GSAP tweens double. Use `useGSAP` (handles cleanup) and a cancel/ref guard in the loader effect.
- **LCP trick**: today hero is painted under the loader overlay (`has-loader`), so Lighthouse sees content instantly. Plain client SPA = blank first paint until JS runs = perf score drop. Prerender fixes it.
- **SEO**: same cause. Without prerender, crawlers get an empty `<div id="root">`.
- **ScrollTrigger positions**: call `ScrollTrigger.refresh()` after fonts load and after route changes.
- **Scroll on navigation**: SPA route change keeps scroll position. Add `<ScrollRestoration />`. Anchor links (`#about`) need a small hash-scroll effect after route render.
- **GitHub Pages paths**: set Vite `base` to `/<repo-name>/` unless using a custom domain or `<user>.github.io` repo. Deep links (`/projects/fpl`) need prerendered HTML per route, or a `404.html` redirect hack.
- **Bundle**: React + ReactDOM ~45 KB gzip, router extra. Current site ships ~0 KB framework JS.
- **Duplicate ids**: form field ids (`name`, `email`, `message`) and SVG ids fine once per page; watch if components get reused.
- **`key` props** needed on every mapped list.

## 9. Effort breakdown

| Step | Hours |
|---|---|
| Scaffold Vite + TS + router, deploy pipeline | 2 to 3 |
| CSS, fonts, assets, head tags | 1 |
| HTML to JSX for Home | 2 to 3 |
| Split into components | 2 to 4 |
| Data files + mapping | 2 to 3 |
| ProjectPage template + 3 project data entries | 2 to 3 |
| Nav, glow, form, hooks | 2 to 3 |
| GSAP reveals, count-up, helmet | 2 to 4 |
| Loader | 3 to 5 |
| Prerender, Lighthouse, visual diff vs current site | 2 to 4 |
| **Total** | **20 to 33 (about 1.5 to 3 days)** |

## 10. Order to do it in

1. Scaffold, deploy an empty page to Pages first. Base path problems show up early.
2. Import both CSS files, paste Home as one big component. Should look identical, no JS.
3. Split into components.
4. Move content into data files.
5. Add the project route + template.
6. Nav, tile glow, form.
7. GSAP reveals, count-up, helmet.
8. Loader last (most fiddly, least structural).
9. Prerender, Lighthouse, compare side by side with current site.

## 11. Leave behind / take care

- Don't port `legacy/`.
- `cv.pdf` contains a phone number. Keep it out of `public/` (anything there is public).
- Formspree form id is still a placeholder.
- Current repo isn't under git. Init git before starting.

## 12. Worth it?

Pros:
- CV signal: a real, maintained React + TS project.
- Content in data files, one project template.
- Components make future sections cheap.

Cons:
- Build step, dependencies, deploy pipeline to maintain.
- More JS shipped for what is a mostly static page.
- Loader and GSAP get fiddlier inside React lifecycles.
- Keeping current 100 Lighthouse scores needs prerender set up properly.

Bottom line: doable in a long weekend. Worth it mainly for the learning and CV value, not because the site needs React.
