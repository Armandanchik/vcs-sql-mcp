# Lukas Kelevisius — Compliance Specialist landing page

Minimal, editorial single-page site with a Three.js hero scene and GSAP scroll choreography.
No build step. Open `index.html` through any static server (the Three.js module needs HTTP, not `file://`).

```bash
cd website && python3 -m http.server 8080   # then open http://localhost:8080
```

## Stack
- Three.js r170 (`vendor/three.module.min.js`, loaded via import map)
- GSAP 3.13 + ScrollTrigger (`vendor/`)
- Fonts: Instrument Serif, Manrope, JetBrains Mono (Google Fonts, with system fallbacks)

## Structure
- `index.html` — content and sections (hero, marquee, statement, services, approach, numbers, regulatory radar, about, contact)
- `css/style.css` — design tokens in `:root`, light and dark themes, responsive layout
- `js/scene.js` — hero geodesic lattice, orbit rings, dust field, pointer parallax
- `js/main.js` — preloader, hero reveal, scroll triggers, pinned horizontal "How it works", counters, magnetic buttons, custom cursor

## Before going live — edit these placeholders
- Email in the contact section (`hello@lukaskelevisius.com`) and the LinkedIn URL.
- The four numbers in the "Numbers" section (years, audits, jurisdictions, on-time rate) are placeholders.
- Credentials line in About (`CAMS · CIPP/E`) and the bio paragraphs.
- Portrait: drop a photo at `assets/lukas.jpg` and swap the placeholder block in the About section (see the HTML comment).
- Regulatory radar dates reflect public timetables as of 2026; verify against primary sources before publishing.
