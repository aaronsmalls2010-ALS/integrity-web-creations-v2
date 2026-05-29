# IWC Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Integrity Web Creations v2 marketing site — Astro + Tailwind CSS, spider web hero animation, all 8 homepage sections, 5 additional pages, security headers, SEO.

**Architecture:** Static Astro site. All sections are isolated `.astro` components composed in `index.astro`. The spider web animation is a standalone `SpiderWebHero.astro` component with vanilla canvas JS. Tailwind v4 via `@tailwindcss/vite` Vite plugin. No frameworks, no state management — just HTML, CSS, and minimal vanilla JS.

**Tech Stack:** Astro 6, Tailwind CSS v4 (`@tailwindcss/vite`), Font Awesome 6.5.1 (CDN), Google Fonts (Inter), Web3Forms, Umami Analytics, Vercel.

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `astro.config.mjs` | Modify | Add Tailwind vite plugin, sitemap, site URL |
| `src/styles/global.css` | Create | Tailwind import, custom keyframes, theme variables |
| `src/layouts/BaseLayout.astro` | Create | HTML shell, SEO meta, fonts, JSON-LD, Umami |
| `src/components/Nav.astro` | Create | Fixed nav, hamburger mobile menu |
| `src/components/Footer.astro` | Create | Dark footer, 3-column layout |
| `src/components/SpiderWebHero.astro` | Create | Canvas animation + mouse SVG |
| `src/components/sections/Hero.astro` | Create | Section 01: badge, headline, CTAs |
| `src/components/sections/TrustStats.astro` | Create | Section 02: animated counters |
| `src/components/sections/Services.astro` | Create | Section 03: 6 service cards, hover reveal |
| `src/components/sections/FeaturedWork.astro` | Create | Section 04: 4 portfolio cards |
| `src/components/sections/HowItWorks.astro` | Create | Section 05: 6-step timeline |
| `src/components/sections/About.astro` | Create | Section 06: founder story + values |
| `src/components/sections/Testimonials.astro` | Create | Section 07: 4 testimonial cards |
| `src/components/sections/BottomCTA.astro` | Create | Section 08: dark gradient CTA band |
| `src/pages/index.astro` | Rewrite | Homepage: compose all 8 sections |
| `src/pages/about.astro` | Create | About page |
| `src/pages/contact.astro` | Create | Contact form + FAQ accordion |
| `src/pages/why-we-matter.astro` | Create | Stats + bad vs good comparison |
| `src/pages/clients.astro` | Create | All testimonials + stats bar |
| `src/pages/404.astro` | Create | Minimal not-found page |
| `vercel.json` | Create | Security headers |
| `public/robots.txt` | Create | Sitemap pointer |
| `public/images/` | Create | Placeholder images directory |

---

## Task 1: Install Tailwind CSS v4 and configure Astro

**Files:**
- Modify: `astro.config.mjs`
- Create: `src/styles/global.css`

- [ ] **Step 1: Install Tailwind v4 and sitemap packages**

```bash
cd "C:\Users\Aaron and Janay\Desktop\Integrity Web Creations\Claude\Web Projects\integrity-web-creations-v2"
npm install tailwindcss @tailwindcss/vite @astrojs/sitemap
```

Expected: No errors, packages added to `node_modules`.

- [ ] **Step 2: Update `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.integritywebcreations.com',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 3: Create `src/styles/global.css`**

```css
@import "tailwindcss";

/* ── Theme: Inter font ── */
@theme {
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ── Hero content fade-up animation ── */
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-up {
  animation-name: fade-up;
  animation-duration: 0.7s;
  animation-timing-function: ease;
  animation-fill-mode: both;
}

/* ── Smooth scroll ── */
html {
  scroll-behavior: smooth;
}
```

- [ ] **Step 4: Verify Tailwind loads — start dev server**

```bash
npm run dev
```

Expected: Dev server starts at `http://localhost:4321`. No build errors. Page loads (still shows default Astro content — that's fine).

- [ ] **Step 5: Commit**

```bash
git add astro.config.mjs src/styles/global.css package.json package-lock.json
git commit -m "feat: install Tailwind v4 + sitemap, configure Vite plugin"
```

---

## Task 2: Create `BaseLayout.astro`

**Files:**
- Create: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Create the layouts directory and file**

```bash
mkdir -p "src/layouts"
```

- [ ] **Step 2: Write `src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/global.css';

interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
}

const {
  title = 'Integrity Web Creations — Beaufort, SC',
  description = 'Custom websites built exclusively for your business. Handled, maintained, and grown by a local partner in Beaufort, SC since 2010.',
  ogImage = '/og-image.png',
} = Astro.props;

const canonical = Astro.url.href;
const siteUrl = 'https://www.integritywebcreations.com';

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "name": "Integrity Web Creations",
      "description": "Custom web design, brand identity, SEO, e-commerce, monthly maintenance, and digital marketing for small businesses.",
      "url": siteUrl,
      "telephone": "+18432630072",
      "email": "asmalls@integritywebcreations.com",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Beaufort",
        "addressRegion": "SC",
        "addressCountry": "US"
      },
      "founder": { "@type": "Person", "name": "A. Smalls" },
      "foundingDate": "2010",
      "priceRange": "$$",
      "areaServed": ["Beaufort, SC", "Savannah, GA", "Atlanta, GA"]
    },
    {
      "@type": "WebSite",
      "url": siteUrl,
      "name": "Integrity Web Creations"
    }
  ]
};
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="generator" content={Astro.generator} />

    <!-- SEO Primary -->
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <meta name="robots" content="index, follow" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonical} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={`${siteUrl}${ogImage}`} />
    <meta property="og:site_name" content="Integrity Web Creations" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={`${siteUrl}${ogImage}`} />

    <!-- Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap"
      rel="stylesheet"
    />

    <!-- Font Awesome 6.5.1 — verify SRI hash at: https://cdnjs.com/libraries/font-awesome -->
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
    />

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />

    <!-- Umami Analytics (deferred — replace WEBSITE_ID after deploy) -->
    <script
      defer
      src="https://analytics.integritywebcreations.com/script.js"
      data-website-id="REPLACE_WITH_WEBSITE_ID"
    ></script>
  </head>
  <body class="font-sans antialiased bg-white text-[#0f172a]">
    <slot />
  </body>
</html>
```

- [ ] **Step 3: Update `src/pages/index.astro` to use the layout (smoke test)**

Replace the full contents of `src/pages/index.astro` with:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="IWC — Test">
  <h1 class="text-4xl font-extrabold text-[#2563eb] p-8">Tailwind + Layout working</h1>
</BaseLayout>
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:4321`. Should see:
- Large bold blue heading "Tailwind + Layout working"
- Inter font loaded
- Page title "IWC — Test" in browser tab
- No console errors

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro src/pages/index.astro
git commit -m "feat: add BaseLayout with SEO, fonts, JSON-LD, Umami"
```

---

## Task 3: Create `Nav.astro`

**Files:**
- Create: `src/components/Nav.astro`

- [ ] **Step 1: Create the components directory**

```bash
mkdir -p "src/components"
```

- [ ] **Step 2: Write `src/components/Nav.astro`**

```astro
---
const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/why-we-matter', label: 'Why We Matter' },
  { href: '/clients', label: 'Clients' },
  { href: '/contact', label: 'Contact' },
];

const pathname = Astro.url.pathname;
---

<header class="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#e2e8f0]">
  <nav class="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">

    <!-- Logo -->
    <a href="/" class="flex items-center gap-1 no-underline" aria-label="Integrity Web Creations home">
      <span class="text-[#0f172a] font-light text-sm tracking-widest">integrity</span>
      <span class="text-[#0f172a] font-extrabold text-sm tracking-widest">WEB CREATIONS</span>
    </a>

    <!-- Desktop links -->
    <ul class="hidden md:flex items-center gap-8 list-none m-0 p-0">
      {links.map(l => (
        <li>
          <a
            href={l.href}
            class={`text-sm font-medium transition-colors no-underline ${
              pathname === l.href
                ? 'text-[#2563eb]'
                : 'text-[#374151] hover:text-[#2563eb]'
            }`}
          >
            {l.label}
          </a>
        </li>
      ))}
    </ul>

    <!-- Desktop CTA -->
    <a
      href="/contact"
      class="hidden md:inline-flex items-center bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors no-underline"
    >
      Start a Project
    </a>

    <!-- Hamburger button -->
    <button
      id="nav-toggle"
      class="md:hidden flex flex-col justify-center gap-1.5 p-2 cursor-pointer bg-transparent border-none w-10 h-10"
      aria-label="Open navigation menu"
      aria-expanded="false"
      aria-controls="mobile-menu"
    >
      <span class="block w-6 h-0.5 bg-[#0f172a] transition-all duration-300 origin-center" id="bar1"></span>
      <span class="block w-6 h-0.5 bg-[#0f172a] transition-all duration-300" id="bar2"></span>
      <span class="block w-6 h-0.5 bg-[#0f172a] transition-all duration-300 origin-center" id="bar3"></span>
    </button>
  </nav>
</header>

<!-- Mobile overlay -->
<div
  id="mobile-menu"
  role="dialog"
  aria-label="Navigation menu"
  aria-modal="true"
  class="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300"
>
  <ul class="flex flex-col items-center gap-8 list-none m-0 p-0">
    {links.map(l => (
      <li>
        <a
          href={l.href}
          class="nav-mobile-link text-[#0f172a] text-2xl font-bold no-underline hover:text-[#2563eb] transition-colors"
        >
          {l.label}
        </a>
      </li>
    ))}
    <li class="mt-4">
      <a
        href="/contact"
        class="nav-mobile-link inline-flex bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-lg font-semibold px-8 py-3 rounded-full no-underline transition-colors"
      >
        Start a Project
      </a>
    </li>
  </ul>
</div>

<script>
  const toggle = document.getElementById('nav-toggle') as HTMLButtonElement;
  const menu   = document.getElementById('mobile-menu') as HTMLElement;
  const bar1   = document.getElementById('bar1') as HTMLElement;
  const bar2   = document.getElementById('bar2') as HTMLElement;
  const bar3   = document.getElementById('bar3') as HTMLElement;
  let isOpen   = false;

  function openMenu() {
    isOpen = true;
    menu.classList.remove('opacity-0', 'pointer-events-none');
    menu.classList.add('opacity-100');
    document.body.style.overflow = 'hidden';
    toggle.setAttribute('aria-expanded', 'true');
    bar1.style.transform = 'translateY(8px) rotate(45deg)';
    bar2.style.opacity   = '0';
    bar3.style.transform = 'translateY(-8px) rotate(-45deg)';
  }

  function closeMenu() {
    isOpen = false;
    menu.classList.add('opacity-0', 'pointer-events-none');
    menu.classList.remove('opacity-100');
    document.body.style.overflow = '';
    toggle.setAttribute('aria-expanded', 'false');
    bar1.style.transform = '';
    bar2.style.opacity   = '';
    bar3.style.transform = '';
  }

  toggle.addEventListener('click', () => (isOpen ? closeMenu() : openMenu()));

  document.querySelectorAll('.nav-mobile-link').forEach(link =>
    link.addEventListener('click', closeMenu)
  );

  window.addEventListener('scroll', () => { if (isOpen) closeMenu(); }, { passive: true });
</script>
```

- [ ] **Step 3: Add Nav to index.astro smoke test**

Update `src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
---
<BaseLayout title="IWC — Test">
  <Nav />
  <main class="pt-20 p-8">
    <h1 class="text-4xl font-extrabold text-[#2563eb]">Nav + Layout working</h1>
  </main>
</BaseLayout>
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:4321`. Should see:
- Fixed nav at top with logo and links
- "Start a Project" blue pill on desktop
- Hamburger icon on mobile (resize window < 768px)
- Hamburger animates to X on click, overlay slides in
- Overlay closes when scrolling or clicking a link

- [ ] **Step 5: Commit**

```bash
git add src/components/Nav.astro src/pages/index.astro
git commit -m "feat: add Nav with hamburger mobile menu + scroll-lock"
```

---

## Task 4: Create `Footer.astro`

**Files:**
- Create: `src/components/Footer.astro`

- [ ] **Step 1: Write `src/components/Footer.astro`**

```astro
---
const navLinks = [
  ['/', 'Home'],
  ['/about', 'About'],
  ['/why-we-matter', 'Why We Matter'],
  ['/clients', 'Clients'],
  ['/contact', 'Contact'],
];
---
<footer class="bg-[#0f172a] text-white">
  <div class="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">

    <!-- Col 1: Logo + tagline -->
    <div>
      <a href="/" class="inline-flex items-center gap-1 mb-4 no-underline" aria-label="Integrity Web Creations">
        <span class="font-light text-sm tracking-widest text-white/70">integrity</span>
        <span class="font-extrabold text-sm tracking-widest text-white">WEB CREATIONS</span>
      </a>
      <p class="text-[#94a3b8] text-sm leading-relaxed">
        Built with Integrity. Engineered to Perform.
      </p>
    </div>

    <!-- Col 2: Navigation -->
    <div>
      <h3 class="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-5">Navigation</h3>
      <ul class="flex flex-col gap-2.5 list-none m-0 p-0">
        {navLinks.map(([href, label]) => (
          <li>
            <a href={href} class="text-[#94a3b8] text-sm hover:text-white transition-colors no-underline">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>

    <!-- Col 3: Contact -->
    <div>
      <h3 class="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-5">Contact</h3>
      <ul class="flex flex-col gap-4 list-none m-0 p-0">
        <li class="flex items-center gap-3">
          <i class="fa-solid fa-phone text-[#2563eb] w-4 text-sm"></i>
          <a href="tel:+18432630072" class="text-[#94a3b8] text-sm hover:text-white transition-colors no-underline">
            (843) 263-0072
          </a>
        </li>
        <li class="flex items-start gap-3">
          <i class="fa-solid fa-envelope text-[#2563eb] w-4 text-sm mt-0.5"></i>
          <a href="mailto:asmalls@integritywebcreations.com" class="text-[#94a3b8] text-sm hover:text-white transition-colors no-underline break-all">
            asmalls@integritywebcreations.com
          </a>
        </li>
        <li class="flex items-center gap-3">
          <i class="fa-solid fa-location-dot text-[#2563eb] w-4 text-sm"></i>
          <span class="text-[#94a3b8] text-sm">Beaufort, South Carolina</span>
        </li>
      </ul>
    </div>
  </div>

  <!-- Bottom bar -->
  <div class="border-t border-white/10">
    <div class="max-w-7xl mx-auto px-6 py-6">
      <p class="text-center text-[#475569] text-xs">
        © 2026 Integrity Web Creations · Founded 2010
      </p>
    </div>
  </div>
</footer>
```

- [ ] **Step 2: Add Footer to smoke test**

Update `src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
---
<BaseLayout title="IWC — Test">
  <Nav />
  <main class="pt-20 p-8 min-h-screen">
    <h1 class="text-4xl font-extrabold text-[#2563eb]">Components working</h1>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 3: Verify in browser**

Scroll to bottom — footer shows dark `#0f172a` background with 3 columns: logo/tagline, nav links, contact info. Phone and email links are tappable. Copyright bar at very bottom.

- [ ] **Step 4: Commit**

```bash
git add src/components/Footer.astro src/pages/index.astro
git commit -m "feat: add Footer with 3-column layout"
```

---

## Task 5: Create `SpiderWebHero.astro`

**Files:**
- Create: `src/components/SpiderWebHero.astro`

This is the canvas spider web animation — the hero's signature element. It renders full-viewport, pointer-events none, behind all other content.

- [ ] **Step 1: Write `src/components/SpiderWebHero.astro`**

```astro
---
// No server-side props — pure client-side canvas animation
---

<!-- Canvas: fixed, full viewport, behind all content -->
<canvas
  id="spider-canvas"
  style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;"
></canvas>

<!-- Mouse SVG: slides in from top-right corner on load -->
<div id="mouse-slider" aria-hidden="true">
  <div id="mouse-wrap">
    <svg id="mouse-svg" viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="42" cy="64" rx="31" ry="47" fill="rgba(0,0,0,0.18)" transform="translate(2,4)"/>
      <path d="M14,52 Q12,16 40,6 Q68,16 66,52 Q66,96 40,112 Q14,96 14,52Z" fill="#5c6a7a"/>
      <path id="left-btn" d="M14,52 L14,27 Q14,6 40,6 L40,55 L14,55Z" fill="#4a5869"/>
      <path d="M66,52 L66,27 Q66,6 40,6 L40,55 L66,55Z" fill="#526070"/>
      <line x1="40" y1="6" x2="40" y2="55" stroke="#28343f" stroke-width="1.6"/>
      <path d="M14,55 Q20,59 40,59 Q60,59 66,55" stroke="#28343f" stroke-width="1.2" fill="none"/>
      <rect x="32" y="16" width="16" height="27" rx="8" fill="#243040"/>
      <rect x="34" y="18" width="12" height="23" rx="6" fill="#1a2530"/>
      <rect x="34" y="22" width="12" height="2.2" rx="1.1" fill="#3d5168"/>
      <rect x="34" y="26.5" width="12" height="2.2" rx="1.1" fill="#3d5168"/>
      <rect x="34" y="31" width="12" height="2.2" rx="1.1" fill="#3d5168"/>
      <rect x="34" y="35.5" width="12" height="2.2" rx="1.1" fill="#3d5168"/>
      <rect x="34" y="47" width="12" height="7" rx="3.5" fill="#243040"/>
      <rect x="36" y="48.5" width="8" height="4" rx="2" fill="#1a2530"/>
      <path d="M21,32 Q23,15 40,9 Q54,15 56,28" stroke="rgba(255,255,255,0.16)" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    </svg>
  </div>
</div>

<style is:global>
  /* ── Slider: position + slide-in transition ── */
  #mouse-slider {
    position: fixed;
    top: -28px;
    right: -28px;
    z-index: 20;
    transform: translate(240px, -240px); /* off-screen start */
    transition: transform 0.62s cubic-bezier(0.34, 1.44, 0.64, 1);
  }
  #mouse-slider.in-position {
    transform: translate(0, 0);
  }

  /* ── Inner wrap: constant 225deg = 7:30, buttons point lower-left ── */
  #mouse-wrap {
    width: 92px;
    height: 138px;
    transform: rotate(225deg);
    transform-origin: center center;
    filter: drop-shadow(-5px 5px 20px rgba(0, 0, 0, 0.45));
  }
  #mouse-svg {
    width: 92px;
    height: 138px;
    display: block;
  }
  #left-btn {
    transition: fill 0.08s, filter 0.08s;
  }
  #mouse-slider.clicking #left-btn {
    fill: #82bdf5;
    filter: drop-shadow(0 0 10px rgba(59, 130, 246, 1));
  }
</style>

<script>
  const canvas = document.getElementById('spider-canvas') as HTMLCanvasElement;
  const ctx    = canvas.getContext('2d')!;
  const slider = document.getElementById('mouse-slider') as HTMLElement;

  let W = 0, H = 0;
  let origin      = { x: 0, y: 0 };
  let spokeAngles: number[] = [];
  let ringDists:   number[] = [];
  let animStart:   number | null = null;
  let cursor       = { x: -9999, y: -9999 };

  // Fixed 28 action lines — identical every replay
  const ACTION_LINES = Array.from({ length: 28 }, (_, i) => ({
    angle: (i / 28) * Math.PI * 2,
    len:   60 + (i * 19) % 100,
    w:     0.7 + (i * 0.13) % 1.2,
  }));

  // ── Timeline (seconds) ──────────────────────────────────────
  const T = {
    MOUSE_ARRIVE: 0.15,   // slider starts moving
    BTN_GLOW:     0.85,   // left button glows blue
    CLICK:        1.05,   // CLICK moment — web grows from here
    WEB_DONE:     3.60,   // web fully covers screen
  };

  function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

  // ── Canvas resize ────────────────────────────────────────────
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildWebGeometry();
  }

  // ── Web geometry — 22 spokes from 88° to 200°, 16 log-spaced rings ──
  function buildWebGeometry() {
    const NS = 22;
    const A0 = Math.PI * 0.489; // 88°
    const A1 = Math.PI * 1.112; // 200°
    spokeAngles = [];
    for (let i = 0; i < NS; i++) {
      const t = i / (NS - 1);
      spokeAngles.push(A0 + (A1 - A0) * t + Math.sin(i * 6.7 + 2.3) * 0.006);
    }

    const NR    = 16;
    const MAX_R = Math.hypot(W, H) * 1.08;
    ringDists = [];
    for (let r = 0; r < NR; r++) {
      const t = (r + 1) / NR;
      ringDists.push(MAX_R * Math.log(1 + t * (Math.E - 1)) * (1 + Math.sin(r * 3.7) * 0.01));
    }
  }

  function pt(angle: number, dist: number) {
    return { x: origin.x + Math.cos(angle) * dist, y: origin.y + Math.sin(angle) * dist };
  }

  // ── Bezier strand with mouse attraction + gravity sag ────────
  function strand(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    rgba: string,
    weight: number,
    sag: number
  ) {
    const mx = (p1.x + p2.x) * 0.5, my = (p1.y + p2.y) * 0.5;
    const dx = cursor.x - mx,        dy = cursor.y - my;
    const pull = Math.max(0, 1 - Math.hypot(dx, dy) / 150) * 24;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(
      mx + dx * pull * 0.04,
      my + dy * pull * 0.04 + (sag || 0),
      p2.x, p2.y
    );
    ctx.strokeStyle = rgba;
    ctx.lineWidth   = weight;
    ctx.lineCap     = 'round';
    ctx.stroke();
  }

  // ── Screen flash (white burst at CLICK moment) ───────────────
  function drawScreenFlash(t: number) {
    if (t <= 0 || t >= 1) return;
    const a = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
    ctx.save();
    ctx.globalAlpha = a * 0.48;
    ctx.fillStyle   = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── 28 radial action lines burst from origin ─────────────────
  function drawActionLines(t: number) {
    if (t <= 0 || t >= 1) return;
    const fade   = Math.max(0, 1 - t / 0.55);
    const extend = Math.min(t / 0.14, 1);
    ACTION_LINES.forEach(l => {
      const r1 = 50 * extend, r2 = (50 + l.len) * extend;
      // Glow layer
      ctx.beginPath();
      ctx.moveTo(origin.x + Math.cos(l.angle) * r1, origin.y + Math.sin(l.angle) * r1);
      ctx.lineTo(origin.x + Math.cos(l.angle) * r2, origin.y + Math.sin(l.angle) * r2);
      ctx.strokeStyle = `rgba(147,197,253,${fade * 0.48})`;
      ctx.lineWidth   = l.w + 2;
      ctx.lineCap     = 'round';
      ctx.stroke();
      // Core layer
      ctx.beginPath();
      ctx.moveTo(origin.x + Math.cos(l.angle) * r1, origin.y + Math.sin(l.angle) * r1);
      ctx.lineTo(origin.x + Math.cos(l.angle) * r2, origin.y + Math.sin(l.angle) * r2);
      ctx.strokeStyle = `rgba(37,99,235,${fade * 0.80})`;
      ctx.lineWidth   = l.w;
      ctx.stroke();
    });
  }

  // ── Comic book 12-point starburst with "CLICK!" ──────────────
  function drawStarburst(t: number) {
    if (t <= 0) return;
    const scale =
      t < 0.22 ? (t / 0.22) * 1.30 :
      t < 0.52 ? 1.30 - (t - 0.22) / 0.30 * 0.30 :
      t < 0.80 ? 1.0 :
                 1 - (t - 0.80) / 0.20;
    if (scale <= 0) return;
    const alpha = t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28;
    if (alpha <= 0) return;

    const cx = origin.x - 88, cy = origin.y + 82;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(-0.18);
    ctx.scale(scale, scale);

    // 12-point star (24 vertices alternating outer/inner)
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const r = i % 2 === 0 ? 64 : 33;
      const a = (i * Math.PI / 12) - Math.PI / 2;
      i === 0
        ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle   = '#FFE000';
    ctx.strokeStyle = '#111';
    ctx.lineWidth   = 2.6;
    ctx.fill();
    ctx.stroke();

    // Halftone dot texture inside star
    ctx.save();
    ctx.clip();
    for (let dx = -64; dx < 64; dx += 10) {
      for (let dy = -64; dy < 64; dy += 10) {
        ctx.beginPath();
        ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fill();
      }
    }
    ctx.restore();

    // "CLICK!" text
    ctx.font          = '900 21px Impact,Arial Black,sans-serif';
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.strokeStyle   = 'rgba(255,220,0,0.5)';
    ctx.lineWidth     = 3.5;
    ctx.strokeText('CLICK!', 0, 1);
    ctx.fillStyle = '#111';
    ctx.fillText('CLICK!', 0, 1);
    ctx.restore();
  }

  // ── Origin glow + shockwave rings ────────────────────────────
  function drawOriginGlow(t: number) {
    if (t <= 0) return;

    // Three expanding shockwave rings
    [0, 0.13, 0.26].forEach(off => {
      const p = clamp01((t - off) / 0.54);
      if (p <= 0) return;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 100 * p, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(37,99,235,${(1 - p) * 0.60})`;
      ctx.lineWidth   = (1 - p) * 5;
      ctx.stroke();
    });

    // Radial glow bloom at origin
    const op = Math.min(1, t * 3) * 0.88;
    const g  = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, 36);
    g.addColorStop(0,   `rgba(147,197,253,${op * 0.85})`);
    g.addColorStop(0.4, `rgba(37,99,235,${op * 0.40})`);
    g.addColorStop(1,   'rgba(37,99,235,0)');
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 36, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // Origin dot
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(37,99,235,${op})`;
    ctx.fill();
  }

  // ── Web: uniform radial frontier growth ──────────────────────
  // All spokes and rings grow simultaneously from origin outward.
  // frontierR = how far the web has reached at time t.
  function drawWeb(t: number) {
    const ease      = 1 - Math.pow(1 - t, 2.2);
    const maxR      = ringDists[ringDists.length - 1];
    const frontierR = maxR * ease;
    if (frontierR < 2) return;

    const SOFT = maxR * 0.06; // fade-in band just behind frontier

    // ── Spokes (truncated at frontierR) ──────────────────────
    spokeAngles.forEach(angle => {
      const visR = Math.min(frontierR, maxR);
      if (visR < 2) return;
      const endPt = pt(angle, visR);
      strand(origin, endPt, 'rgba(147,197,253,0.16)', 3.8, 0); // glow halo
      strand(origin, endPt, 'rgba(37,99,235,0.44)',   1.7, 0); // core
    });

    // ── Frontier glow dots at each spoke tip ─────────────────
    if (frontierR < maxR * 0.99) {
      spokeAngles.forEach(angle => {
        const tip = pt(angle, Math.min(frontierR, maxR));
        const tg  = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 10);
        tg.addColorStop(0, 'rgba(147,197,253,0.70)');
        tg.addColorStop(1, 'rgba(37,99,235,0)');
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = tg;
        ctx.fill();
      });
    }

    // ── Rings (fade in as frontier crosses each ring's distance) ─
    ringDists.forEach((dist, ri) => {
      if (dist > frontierR) return;
      const fadeIn = clamp01((frontierR - dist) / SOFT);
      if (fadeIn <= 0) return;

      const df  = 1 - ri / ringDists.length; // inner rings more opaque
      const opG = (0.08 + df * 0.13) * fadeIn;
      const opC = (0.18 + df * 0.30) * fadeIn;
      const wG  = 3.0 - df * 0.6;
      const wC  = 1.25 - df * 0.15;

      for (let s = 0; s < spokeAngles.length - 1; s++) {
        const p1  = pt(spokeAngles[s],     dist);
        const p2  = pt(spokeAngles[s + 1], dist);
        const sag = Math.abs(p2.x - p1.x) * 0.038 + Math.abs(p2.y - p1.y) * 0.010;
        strand(p1, p2, `rgba(147,197,253,${opG})`, wG, sag * 1.4);
        strand(p1, p2, `rgba(37,99,235,${opC})`,   wC, sag);
      }

      // Intersection dewdrop nodes
      if (fadeIn > 0.55) {
        spokeAngles.forEach(angle => {
          const n = pt(angle, dist);
          if (n.x < -30 || n.x > W + 30 || n.y < -30 || n.y > H + 30) return;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 1.9, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(37,99,235,${0.42 * df * fadeIn})`;
          ctx.fill();
        });
      }
    });
  }

  // ── Master render loop ────────────────────────────────────────
  function render(ts: number) {
    if (!animStart) animStart = ts;
    const e = (ts - animStart) / 1000; // seconds elapsed

    ctx.clearRect(0, 0, W, H);

    drawScreenFlash(clamp01((e - T.CLICK) / 0.40));
    drawOriginGlow( clamp01((e - T.CLICK) / 0.85));
    drawActionLines(clamp01((e - T.CLICK) / 0.56));
    drawStarburst(  clamp01((e - T.CLICK) / 1.00));

    const webT = clamp01((e - T.CLICK) / (T.WEB_DONE - T.CLICK));
    if (webT > 0) drawWeb(webT);

    // Button glow window
    const glowing = e >= T.BTN_GLOW && e < T.CLICK + 0.22;
    slider.classList.toggle('clicking', glowing);

    requestAnimationFrame(render);
  }

  // ── Slide mouse in, then lock origin to its actual center ────
  function startMouseSlideIn() {
    setTimeout(() => {
      slider.classList.add('in-position');
      slider.addEventListener('transitionend', () => {
        const r = document.getElementById('mouse-wrap')!.getBoundingClientRect();
        origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        buildWebGeometry();
      }, { once: true });
    }, T.MOUSE_ARRIVE * 1000);
  }

  window.addEventListener('mousemove', e => { cursor.x = e.clientX; cursor.y = e.clientY; });
  window.addEventListener('resize',    () => resize(), { passive: true });

  // Boot
  resize();
  origin = { x: W - 18, y: 41 }; // initial estimate before mouse settles
  buildWebGeometry();
  startMouseSlideIn();
  requestAnimationFrame(render);
</script>
```

- [ ] **Step 2: Verify SpiderWebHero in isolation — add it to index.astro**

Update `src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import SpiderWebHero from '../components/SpiderWebHero.astro';
import Footer from '../components/Footer.astro';
---
<BaseLayout title="IWC — Spider Web Test">
  <Nav />
  <SpiderWebHero />
  <main class="relative z-10 pt-16 min-h-screen flex items-center px-8">
    <h1 class="text-4xl font-extrabold text-[#0f172a]">Spider web behind me</h1>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 3: Verify animation in browser**

Open `http://localhost:4321`. Should see:
1. Mouse SVG slides in from top-right (0.15s after load)
2. Left mouse button glows blue (~0.85s)
3. White screen flash + CLICK! starburst + 28 action lines burst (~1.05s)
4. Web grows radially from mouse center across full screen (1.05s → 3.60s)
5. Moving cursor over web strands warps them toward cursor
6. Canvas is behind the heading text (no blocking clicks)

- [ ] **Step 4: Commit**

```bash
git add src/components/SpiderWebHero.astro src/pages/index.astro
git commit -m "feat: add SpiderWebHero canvas animation (radial frontier + cursor interaction)"
```

---

## Task 6: Create `Hero.astro` (Section 01)

**Files:**
- Create: `src/components/sections/Hero.astro`

- [ ] **Step 1: Create the sections directory**

```bash
mkdir -p "src/components/sections"
```

- [ ] **Step 2: Write `src/components/sections/Hero.astro`**

```astro
---
import SpiderWebHero from '../SpiderWebHero.astro';
---
<section class="relative min-h-screen bg-[#f0f4ff] flex items-center overflow-hidden">

  <!-- Spider web animation fills entire section -->
  <SpiderWebHero />

  <!-- Hero content: left portion, above canvas (z-index 10 > canvas z-index 1) -->
  <div class="relative z-10 max-w-7xl mx-auto px-6 w-full py-28 mt-16">
    <div class="max-w-[500px]">

      <!-- Location badge -->
      <div
        class="inline-flex items-center bg-[#dbeafe] text-[#1d4ed8] text-[11px] font-semibold tracking-[2px] uppercase px-4 py-1.5 rounded-full mb-5 opacity-0 animate-fade-up"
        style="animation-delay:2.5s;"
      >
        Beaufort, SC — Your Local Web Partner Since 2010
      </div>

      <!-- Headline -->
      <h1
        class="font-extrabold text-[#0f172a] leading-[1.1] mb-5 opacity-0 animate-fade-up"
        style="font-size:clamp(26px,4.2vw,52px);letter-spacing:-1px;animation-delay:2.7s;"
      >
        Your Business.<br />Every Screen.<br />Every Home.
      </h1>

      <!-- Subheadline -->
      <p
        class="text-[#64748b] text-base leading-relaxed max-w-[400px] mb-8 opacity-0 animate-fade-up"
        style="animation-delay:2.9s;"
      >
        A custom website, built exclusively for your business — handled, maintained, and grown by a local partner who knows your name, not just your account number.
      </p>

      <!-- CTA buttons -->
      <div
        class="flex flex-wrap gap-3 opacity-0 animate-fade-up"
        style="animation-delay:3.1s;"
      >
        <a
          href="/contact"
          class="inline-flex items-center bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold px-7 py-3.5 rounded-md transition-all shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 no-underline text-sm"
        >
          Let's Talk &rarr;
        </a>
        <a
          href="/why-we-matter"
          class="inline-flex items-center border border-[#cbd5e1] text-[#374151] hover:border-[#2563eb] hover:text-[#2563eb] font-semibold px-7 py-3.5 rounded-md transition-colors no-underline text-sm"
        >
          Why You Need This
        </a>
      </div>

    </div>
  </div>

</section>
```

- [ ] **Step 3: Update `index.astro` to use Hero section**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import Hero from '../components/sections/Hero.astro';
import Footer from '../components/Footer.astro';
---
<BaseLayout title="IWC — Test Hero">
  <Nav />
  <main>
    <Hero />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 4: Verify in browser**

Should see:
- Light blue `#f0f4ff` hero section, full viewport height
- Spider web animation fires and grows across the page
- Badge, headline, subheadline, two CTA buttons fade in after ~2.5s
- Hero text is on the left; web covers the right side
- "Let's Talk" button is blue and clickable
- Nav is above everything (z-50)

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Hero.astro src/pages/index.astro
git commit -m "feat: add Hero section with badge, headline, CTAs + SpiderWebHero"
```

---

## Task 7: Create `TrustStats.astro` and `Services.astro`

**Files:**
- Create: `src/components/sections/TrustStats.astro`
- Create: `src/components/sections/Services.astro`

- [ ] **Step 1: Write `src/components/sections/TrustStats.astro`**

```astro
---
const stats = [
  { value: 15,  suffix: '+',  label: 'Years of Experience' },
  { value: 1,   suffix: 'M+', label: 'Views Generated Across Client Sites' },
  { value: 100, suffix: '%',  label: 'Client Satisfaction' },
];
---
<section class="bg-white py-20">
  <div class="max-w-4xl mx-auto px-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
      {stats.map(stat => (
        <div class="flex flex-col items-center gap-2">
          <div class="flex items-baseline">
            <span
              class="text-5xl font-extrabold text-[#2563eb] tabular-nums stat-counter"
              data-target={stat.value}
              data-suffix={stat.suffix}
            >0</span>
          </div>
          <p class="text-[#64748b] text-sm font-medium max-w-[160px]">{stat.label}</p>
        </div>
      ))}
    </div>
  </div>
</section>

<script>
  const counters = document.querySelectorAll<HTMLElement>('.stat-counter');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);

      const el       = entry.target as HTMLElement;
      const target   = parseInt(el.dataset.target ?? '0');
      const suffix   = el.dataset.suffix ?? '';
      const duration = 1800;
      const start    = performance.now();

      function update(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(update);
      }

      requestAnimationFrame(update);
    });
  }, { threshold: 0.4 });

  counters.forEach(c => observer.observe(c));
</script>
```

- [ ] **Step 2: Write `src/components/sections/Services.astro`**

```astro
---
const services = [
  {
    icon: 'fa-palette',
    name: 'Custom Web Design',
    teaser: 'A site built from scratch, tailored to your exact business.',
    full: 'A site built from scratch, tailored to your exact business — no templates, no shortcuts. Every pixel designed around your brand, your customers, and your goals.',
  },
  {
    icon: 'fa-pen-ruler',
    name: 'Brand Identity',
    teaser: 'Logos, colors, and brand systems that tell your story.',
    full: 'Logos, colors, typography, and brand systems that tell your story and make you instantly recognizable — whether online, in print, or on a sign.',
  },
  {
    icon: 'fa-magnifying-glass-chart',
    name: 'Search Visibility (SEO)',
    teaser: 'We make sure your customers find you first.',
    full: 'Local SEO, technical optimization, and content strategy that moves you up in Google where your customers are actively searching for your services.',
  },
  {
    icon: 'fa-cart-shopping',
    name: 'E-Commerce',
    teaser: 'Sell your products and services online around the clock.',
    full: 'Full e-commerce solutions — product pages, secure checkout, inventory management — built for your business to sell online around the clock.',
  },
  {
    icon: 'fa-screwdriver-wrench',
    name: 'Monthly Maintenance',
    teaser: 'Your site stays fast, secure, and current — always.',
    full: 'Updates, backups, security monitoring, and improvements handled every single month. Your site stays fast, secure, and current while you focus on running your business.',
  },
  {
    icon: 'fa-chart-line',
    name: 'Digital Marketing',
    teaser: 'Targeted campaigns that reach your specific customers.',
    full: 'Targeted campaigns that reach your specific customers in Beaufort and beyond — social media, Google Ads, and email marketing that drives real traffic to your site.',
  },
];
---
<section class="bg-[#f8fafc] py-24">
  <div class="max-w-7xl mx-auto px-6">

    <div class="text-center mb-14">
      <h2 class="font-extrabold text-[#0f172a] mb-4" style="font-size:clamp(22px,3vw,40px);">
        What We Build For You
      </h2>
      <p class="text-[#64748b] text-base max-w-xl mx-auto leading-relaxed">
        Full-service web solutions — everything your business needs to succeed online, delivered by one person who's invested in your success.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      {services.map(s => (
        <div class="group bg-white border border-[#e2e8f0] rounded-xl p-7 hover:border-[#2563eb] hover:shadow-lg transition-all cursor-default">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-[#eff6ff] rounded-lg flex items-center justify-center group-hover:bg-[#2563eb] transition-colors">
              <i class={`fa-solid ${s.icon} text-[#2563eb] group-hover:text-white transition-colors`}></i>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-[#0f172a] text-base mb-1.5">{s.name}</h3>
              <p class="text-[#64748b] text-sm leading-relaxed group-hover:hidden">{s.teaser}</p>
              <p class="text-[#64748b] text-sm leading-relaxed hidden group-hover:block">{s.full}</p>
            </div>
          </div>
        </div>
      ))}
    </div>

  </div>
</section>
```

- [ ] **Step 3: Add both to index.astro**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import Hero from '../components/sections/Hero.astro';
import TrustStats from '../components/sections/TrustStats.astro';
import Services from '../components/sections/Services.astro';
import Footer from '../components/Footer.astro';
---
<BaseLayout title="IWC — Test">
  <Nav />
  <main>
    <Hero />
    <TrustStats />
    <Services />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 4: Verify in browser**

Scroll past hero:
- TrustStats: 3 counters animate from 0 when scrolled into view (15+, 1M+, 100%)
- Services: 6 cards in 2-col grid; hover reveals full description, icon turns white on blue bg

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/TrustStats.astro src/components/sections/Services.astro src/pages/index.astro
git commit -m "feat: add TrustStats (animated counters) and Services (6 hover cards)"
```

---

## Task 8: Create `FeaturedWork.astro` and `HowItWorks.astro`

**Files:**
- Create: `src/components/sections/FeaturedWork.astro`
- Create: `src/components/sections/HowItWorks.astro`
- Create: `public/images/` (directory + placeholder note)

- [ ] **Step 1: Create the images directory with a placeholder README**

```bash
mkdir -p "public/images"
```

Create `public/images/README.txt`:
```
REQUIRED IMAGES:
- work-friendship-baptist.jpg  — screenshot of thefriendshipbaptist.com (desktop viewport)
- work-aflpu.jpg               — screenshot of aflpu.org (desktop viewport)

Recommended size: 1200x800px, JPEG quality 80.
Take screenshots at 1280px viewport width.
```

- [ ] **Step 2: Write `src/components/sections/FeaturedWork.astro`**

```astro
---
const work = [
  {
    name: 'The Friendship Baptist Church',
    url: 'https://thefriendshipbaptist.com',
    category: 'Church',
    location: 'Beaufort, SC',
    image: '/images/work-friendship-baptist.jpg',
    hasImage: true,
    accent: 'from-[#1e1b4b] to-[#312e81]',
  },
  {
    name: 'Arena Football Players Union',
    url: 'https://aflpu.org',
    category: 'Professional Sports Union',
    location: 'Atlanta, GA',
    image: '/images/work-aflpu.jpg',
    hasImage: true,
    accent: 'from-[#0c1a3a] to-[#1e3a8a]',
  },
  {
    name: 'Epps Medical',
    url: null,
    category: 'Medical Practice',
    location: 'Savannah, GA',
    image: null,
    hasImage: false,
    accent: 'from-[#f0fdf4] to-[#dcfce7]',
  },
  {
    name: 'The Beaufort Marina',
    url: null,
    category: 'Marina',
    location: 'Beaufort, SC',
    image: null,
    hasImage: false,
    accent: 'from-[#eff6ff] to-[#dbeafe]',
  },
];
---
<section class="bg-white py-24">
  <div class="max-w-7xl mx-auto px-6">

    <div class="text-center mb-14">
      <h2 class="font-extrabold text-[#0f172a] mb-4" style="font-size:clamp(22px,3vw,40px);">
        Built for Real Businesses
      </h2>
      <p class="text-[#64748b] text-base max-w-xl mx-auto leading-relaxed">
        From local churches to professional sports unions — real sites, real results, real businesses you can visit.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {work.map(item => (
        <div class="group relative rounded-2xl overflow-hidden border border-[#e2e8f0] aspect-video bg-[#f8fafc]">
          {item.hasImage ? (
            <img
              src={item.image!}
              alt={`${item.name} website`}
              class="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div class={`w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br ${item.accent}`}>
              <div class="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <i class="fa-solid fa-globe text-white/80 text-2xl"></i>
              </div>
              <div class="text-center">
                <p class="text-white/90 font-semibold text-sm">{item.name}</p>
                <p class="text-white/60 text-xs mt-0.5">Screenshot coming soon</p>
              </div>
            </div>
          )}

          <!-- Hover overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
            <span class="text-[#93c5fd] text-xs font-semibold uppercase tracking-wider">
              {item.category} &middot; {item.location}
            </span>
            <h3 class="text-white font-bold text-lg mt-1">{item.name}</h3>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-[#93c5fd] text-sm mt-2 no-underline hover:text-white transition-colors"
              >
                {item.url.replace('https://', '')}
                <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
              </a>
            )}
          </div>
        </div>
      ))}
    </div>

  </div>
</section>
```

- [ ] **Step 3: Write `src/components/sections/HowItWorks.astro`**

```astro
---
const steps = [
  {
    number: '01',
    title: 'Conversation',
    description: 'No forms, no automated quotes. Just you and A. Smalls having a real conversation about what your business needs online.',
  },
  {
    number: '02',
    title: 'Strategy',
    description: 'A custom plan built around your business, your customers, your budget, and your goals — nothing cookie-cutter.',
  },
  {
    number: '03',
    title: 'Design',
    description: 'Your site is designed uniquely for your brand. You review and approve every element before a single line of code is written.',
  },
  {
    number: '04',
    title: 'Build',
    description: 'Every line of your site is hand-crafted for your specific needs — not a template, not a page builder, not a compromise.',
  },
  {
    number: '05',
    title: 'Launch',
    description: "We go live together. You're walked through everything — what you own, how it works, and how to reach us when you need us.",
  },
  {
    number: '06',
    title: 'Ongoing Partnership',
    description: 'Your monthly plan covers everything — updates, security, performance, and a real person you can call with questions.',
  },
];
---
<section class="bg-[#f8fafc] py-24 overflow-x-hidden">
  <div class="max-w-7xl mx-auto px-6">

    <div class="text-center mb-16">
      <h2 class="font-extrabold text-[#0f172a] mb-4" style="font-size:clamp(22px,3vw,40px);">
        Your Journey With Us
      </h2>
      <p class="text-[#64748b] text-base max-w-xl mx-auto leading-relaxed">
        A clear, collaborative process that keeps you in control — from first call to launch day and beyond.
      </p>
    </div>

    <!-- Desktop: horizontal 6-step timeline -->
    <div class="hidden md:block relative">
      <!-- Connecting line behind steps -->
      <div
        class="absolute h-0.5 bg-[#e2e8f0]"
        style="top:2.5rem;left:calc(100%/12);right:calc(100%/12);"
        aria-hidden="true"
      ></div>

      <div class="grid grid-cols-6 gap-2 relative">
        {steps.map(step => (
          <div class="flex flex-col items-center text-center px-2">
            <div class="w-20 h-20 rounded-full bg-white border-2 border-[#e2e8f0] hover:border-[#2563eb] flex flex-col items-center justify-center mb-4 transition-colors shadow-sm z-10 relative cursor-default">
              <span class="text-[#2563eb] text-xs font-extrabold">{step.number}</span>
            </div>
            <h3 class="font-bold text-[#0f172a] text-sm mb-2">{step.title}</h3>
            <p class="text-[#64748b] text-xs leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </div>

    <!-- Mobile: vertical stacked timeline -->
    <div class="md:hidden relative">
      <!-- Vertical connector line -->
      <div class="absolute left-5 top-5 bottom-5 w-0.5 bg-[#e2e8f0]" aria-hidden="true"></div>

      <div class="flex flex-col gap-8">
        {steps.map(step => (
          <div class="flex items-start gap-5 pl-2">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-[#e2e8f0] flex items-center justify-center z-10 relative shadow-sm">
              <span class="text-[#2563eb] text-xs font-extrabold">{step.number}</span>
            </div>
            <div class="pt-1.5 flex-1">
              <h3 class="font-bold text-[#0f172a] text-sm mb-1">{step.title}</h3>
              <p class="text-[#64748b] text-sm leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

  </div>
</section>
```

- [ ] **Step 4: Add both to index.astro**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import Hero from '../components/sections/Hero.astro';
import TrustStats from '../components/sections/TrustStats.astro';
import Services from '../components/sections/Services.astro';
import FeaturedWork from '../components/sections/FeaturedWork.astro';
import HowItWorks from '../components/sections/HowItWorks.astro';
import Footer from '../components/Footer.astro';
---
<BaseLayout title="IWC — Test">
  <Nav />
  <main>
    <Hero />
    <TrustStats />
    <Services />
    <FeaturedWork />
    <HowItWorks />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 5: Verify in browser**

- FeaturedWork: 2×2 grid. Friendship Baptist and AFLPU show styled placeholder cards (images not added yet). Epps Medical and Beaufort Marina show gradient placeholder cards. Hover shows dark overlay with name and link.
- HowItWorks: 6-step horizontal timeline on desktop with circles and connecting line. Vertical stack on mobile.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/FeaturedWork.astro src/components/sections/HowItWorks.astro public/images/README.txt src/pages/index.astro
git commit -m "feat: add FeaturedWork portfolio grid and HowItWorks 6-step timeline"
```

---

## Task 9: Create `About.astro`, `Testimonials.astro`, and `BottomCTA.astro`

**Files:**
- Create: `src/components/sections/About.astro`
- Create: `src/components/sections/Testimonials.astro`
- Create: `src/components/sections/BottomCTA.astro`

- [ ] **Step 1: Write `src/components/sections/About.astro`**

```astro
---
const values = [
  {
    icon: 'fa-handshake',
    name: 'Integrity',
    desc: 'We do what we say, say what we mean, and always put your business first.',
  },
  {
    icon: 'fa-user-tie',
    name: 'Personal Service',
    desc: 'One person, fully invested. Not a ticket number — a real relationship.',
  },
  {
    icon: 'fa-dollar-sign',
    name: 'Accessibility',
    desc: 'Professional web presence should be within reach of every small business.',
  },
  {
    icon: 'fa-arrows-rotate',
    name: 'Partnership',
    desc: 'We grow with you. Your success is our success — month after month.',
  },
];
---
<section class="bg-white py-24">
  <div class="max-w-7xl mx-auto px-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

      <!-- Photo (left) -->
      <div class="relative">
        <div class="aspect-[4/5] bg-gradient-to-br from-[#f0f4ff] to-[#dbeafe] rounded-2xl overflow-hidden flex items-center justify-center max-w-sm mx-auto lg:mx-0">
          <div class="text-center px-8">
            <div class="w-20 h-20 rounded-full bg-[#dbeafe] flex items-center justify-center mx-auto mb-4">
              <i class="fa-solid fa-user text-[#2563eb] text-2xl"></i>
            </div>
            <p class="text-[#94a3b8] text-sm">A. Smalls</p>
            <p class="text-[#cbd5e1] text-xs mt-1">Photo coming soon</p>
          </div>
        </div>
        <!-- Floating "Est. 2010" badge -->
        <div class="absolute bottom-4 right-4 lg:right-4 bg-[#2563eb] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg">
          Est. 2010
        </div>
      </div>

      <!-- Story (right) -->
      <div>
        <h2 class="font-extrabold text-[#0f172a] mb-6" style="font-size:clamp(22px,3vw,40px);">
          One Person. Your Full Attention.
        </h2>

        <div class="space-y-4 text-[#64748b] text-base leading-relaxed mb-10">
          <p>
            I'm A. Smalls — founder of Integrity Web Creations, USC Computer Engineering graduate (Class of 2010), and a Beaufort, SC native. After graduating, I came home with one goal: make the same quality of web presence that big companies pay agencies tens of thousands for accessible to the small businesses that make our community what it is.
          </p>
          <p>
            When you work with IWC, you're not dealing with an account manager, a sales team, or a rotating roster of developers. You get me — directly — for every conversation, every design decision, and every line of code.
          </p>
          <p>
            I stay small on purpose. That's the point. Bigger doesn't mean better — it means busier. I'd rather serve fewer clients exceptionally well than many clients adequately.
          </p>
        </div>

        <!-- Core values 2×2 grid -->
        <div class="grid grid-cols-2 gap-5">
          {values.map(v => (
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-9 h-9 rounded-lg bg-[#eff6ff] flex items-center justify-center mt-0.5">
                <i class={`fa-solid ${v.icon} text-[#2563eb] text-sm`}></i>
              </div>
              <div>
                <h4 class="font-bold text-[#0f172a] text-sm">{v.name}</h4>
                <p class="text-[#64748b] text-xs leading-relaxed mt-0.5">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  </div>
</section>
```

- [ ] **Step 2: Write `src/components/sections/Testimonials.astro`**

```astro
---
const testimonials = [
  {
    name: 'Dr. Willie Epps',
    business: 'Epps Medical',
    location: 'Savannah, GA',
    quote: 'A. Smalls delivered exactly what I needed — a professional, modern site that represents my practice the right way. The personal attention and care he put into understanding my vision was unlike anything I\'ve experienced working with other developers.',
    initials: 'WE',
    stars: 5,
  },
  {
    name: 'James Baron',
    business: 'Arena Football Players Union',
    location: 'Atlanta, GA',
    quote: 'Integrity Web Creations built a site that truly represents our organization with the professionalism it deserves. A. Smalls was responsive, detailed, and genuinely invested in getting it right. We couldn\'t be happier.',
    initials: 'JB',
    stars: 5,
  },
  {
    name: 'Pastor Isiah Smalls',
    business: 'The Friendship Baptist Church',
    location: 'Beaufort, SC',
    quote: 'The website A. Smalls created for our church has been a blessing. Visitors find us easily online now, and the site captures the spirit of our congregation. He understood what we needed and delivered beyond our expectations.',
    initials: 'IS',
    stars: 5,
  },
  {
    name: 'Rick & Mandy',
    business: 'The Beaufort Marina',
    location: 'Beaufort, SC',
    quote: 'Finally a web developer who actually listens. A. Smalls took the time to understand our marina, our customers, and what we needed to say online. The result is a site we\'re proud to send people to.',
    initials: 'RM',
    stars: 5,
  },
];
---
<section class="bg-[#f8fafc] py-24">
  <div class="max-w-7xl mx-auto px-6">

    <div class="text-center mb-14">
      <h2 class="font-extrabold text-[#0f172a] mb-4" style="font-size:clamp(22px,3vw,40px);">
        What Our Clients Say
      </h2>
      <p class="text-[#64748b] text-base max-w-xl mx-auto">
        Real words from real business owners who trusted us with their online presence.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {testimonials.map(t => (
        <div class="bg-white rounded-2xl border border-[#e2e8f0] p-8 hover:shadow-lg hover:border-[#bfdbfe] transition-all">
          <!-- Stars -->
          <div class="flex gap-0.5 mb-5" aria-label={`${t.stars} out of 5 stars`}>
            {Array.from({ length: t.stars }).map(() => (
              <i class="fa-solid fa-star text-[#f59e0b] text-sm" aria-hidden="true"></i>
            ))}
          </div>
          <!-- Quote -->
          <blockquote class="text-[#374151] text-sm leading-relaxed mb-6 italic">
            &ldquo;{t.quote}&rdquo;
          </blockquote>
          <!-- Attribution -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
              <span class="text-[#2563eb] font-bold text-sm">{t.initials}</span>
            </div>
            <div>
              <p class="font-semibold text-[#0f172a] text-sm">{t.name}</p>
              <p class="text-[#64748b] text-xs">{t.business} &middot; {t.location}</p>
            </div>
          </div>
        </div>
      ))}
    </div>

  </div>
</section>
```

- [ ] **Step 3: Write `src/components/sections/BottomCTA.astro`**

```astro
---
---
<section
  class="py-24"
  style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);"
>
  <div class="max-w-4xl mx-auto px-6 text-center">
    <h2 class="font-extrabold text-white mb-5" style="font-size:clamp(22px,3vw,40px);">
      Ready for a Website That Works For You?
    </h2>
    <p class="text-blue-200 text-base leading-relaxed mb-10 max-w-2xl mx-auto">
      Custom-built. Fully managed. Built around your budget. Let's have a real conversation about what your business deserves online.
    </p>
    <a
      href="/contact"
      class="inline-flex items-center bg-white text-[#1e3a8a] font-bold px-10 py-4 rounded-md text-base hover:bg-blue-50 transition-colors shadow-xl no-underline"
    >
      Let's Talk &rarr;
    </a>
  </div>
</section>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/About.astro src/components/sections/Testimonials.astro src/components/sections/BottomCTA.astro
git commit -m "feat: add About, Testimonials, and BottomCTA sections"
```

---

## Task 10: Compose `index.astro` homepage

**Files:**
- Rewrite: `src/pages/index.astro`

- [ ] **Step 1: Write the final `src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import Hero from '../components/sections/Hero.astro';
import TrustStats from '../components/sections/TrustStats.astro';
import Services from '../components/sections/Services.astro';
import FeaturedWork from '../components/sections/FeaturedWork.astro';
import HowItWorks from '../components/sections/HowItWorks.astro';
import About from '../components/sections/About.astro';
import Testimonials from '../components/sections/Testimonials.astro';
import BottomCTA from '../components/sections/BottomCTA.astro';
import Footer from '../components/Footer.astro';
---
<BaseLayout
  title="Integrity Web Creations — Beaufort, SC Web Design"
  description="Custom websites built exclusively for your business. Handled, maintained, and grown by a local partner in Beaufort, SC since 2010."
>
  <Nav />
  <main>
    <Hero />
    <TrustStats />
    <Services />
    <FeaturedWork />
    <HowItWorks />
    <About />
    <Testimonials />
    <BottomCTA />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 2: Verify complete homepage in browser**

Full scroll-through checklist:
- [ ] Hero: `#f0f4ff` bg, spider web fires, content fades in at ~2.5s
- [ ] TrustStats: white bg, 3 counters animate on scroll
- [ ] Services: `#f8fafc` bg, 6 cards hover correctly
- [ ] FeaturedWork: white bg, 4 cards, hover overlay shows name/location/link
- [ ] HowItWorks: `#f8fafc` bg, 6-step timeline (horizontal desktop, vertical mobile)
- [ ] About: white bg, photo placeholder left, story + 4 values right
- [ ] Testimonials: `#f8fafc` bg, 4 cards with stars and quotes
- [ ] BottomCTA: dark blue gradient, white button
- [ ] Footer: `#0f172a` bg, 3 columns, copyright

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: compose full homepage with all 8 sections"
```

---

## Task 11: Create additional pages — `about.astro`, `why-we-matter.astro`, `clients.astro`, `404.astro`

**Files:**
- Create: `src/pages/about.astro`
- Create: `src/pages/why-we-matter.astro`
- Create: `src/pages/clients.astro`
- Create: `src/pages/404.astro`

- [ ] **Step 1: Write `src/pages/about.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import About from '../components/sections/About.astro';
import BottomCTA from '../components/sections/BottomCTA.astro';
---
<BaseLayout
  title="About A. Smalls | Integrity Web Creations — Beaufort, SC"
  description="Meet A. Smalls — USC Computer Engineering grad (2010) and founder of Integrity Web Creations. Building professional web presence for small businesses since 2010."
>
  <Nav />
  <main class="pt-16">

    <!-- Page hero -->
    <section class="bg-[#f0f4ff] py-24">
      <div class="max-w-4xl mx-auto px-6 text-center">
        <h1 class="font-extrabold text-[#0f172a] mb-5" style="font-size:clamp(26px,4.2vw,52px);">
          About Integrity Web Creations
        </h1>
        <p class="text-[#64748b] text-lg leading-relaxed max-w-2xl mx-auto">
          Built on a simple belief: every small business in America deserves a professional web presence — not just the ones who can afford an agency.
        </p>
      </div>
    </section>

    <!-- About section (reused from homepage) -->
    <About />

    <!-- Timeline -->
    <section class="bg-[#f8fafc] py-24">
      <div class="max-w-4xl mx-auto px-6">
        <h2 class="font-extrabold text-[#0f172a] mb-12 text-center" style="font-size:clamp(22px,3vw,40px);">
          The IWC Story
        </h2>
        <div class="space-y-8">
          {[
            {
              year: '2010',
              event: 'Founded IWC after graduating from USC with a Computer Engineering degree. Returned to Beaufort, SC with a mission: make the same quality web presence big companies pay for accessible to small local businesses.',
            },
            {
              year: '2010–2018',
              event: 'Grew IWC while serving clients across Beaufort, Savannah, and the Southeast. Built websites for churches, professional organizations, medical practices, marinas, and local businesses.',
            },
            {
              year: '2018–2025',
              event: 'A chapter of family — stepping back from public-facing work to be fully present at home. IWC\'s existing clients remained supported throughout this period.',
            },
            {
              year: '2026',
              event: 'Returning with renewed focus, modern skills (Astro, Tailwind, TypeScript), and the same commitment to integrity that has defined this business since day one.',
            },
          ].map(item => (
            <div class="flex gap-6 items-start">
              <div class="flex-shrink-0 text-[#2563eb] font-extrabold text-sm w-24 pt-0.5 text-right">
                {item.year}
              </div>
              <div class="flex-1 pb-8 border-b border-[#e2e8f0] last:border-0">
                <p class="text-[#374151] text-sm leading-relaxed">{item.event}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <BottomCTA />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 2: Write `src/pages/why-we-matter.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import BottomCTA from '../components/sections/BottomCTA.astro';
---
<BaseLayout
  title="Why You Need a Great Website | Integrity Web Creations"
  description="75% of consumers judge business credibility by website design. Learn why your web presence directly impacts your revenue — and what to do about it."
>
  <Nav />
  <main class="pt-16">

    <section class="bg-[#f0f4ff] py-24">
      <div class="max-w-4xl mx-auto px-6 text-center">
        <h1 class="font-extrabold text-[#0f172a] mb-5" style="font-size:clamp(26px,4.2vw,52px);">
          Why Your Website Matters More Than You Think
        </h1>
        <p class="text-[#64748b] text-lg leading-relaxed max-w-2xl mx-auto">
          For most potential customers, your website is your first impression — and first impressions form in under 0.05 seconds.
        </p>
      </div>
    </section>

    <!-- Stats -->
    <section class="bg-white py-20">
      <div class="max-w-5xl mx-auto px-6">
        <h2 class="font-extrabold text-[#0f172a] text-center mb-12" style="font-size:clamp(22px,3vw,40px);">
          What the Data Shows
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mb-20">
          {[
            {
              stat: '75%',
              label: 'of consumers judge business credibility based on website design',
              source: 'Stanford Web Credibility Research',
            },
            {
              stat: '0.05s',
              label: 'is all it takes for users to form an opinion about your website',
              source: 'Behaviour & Information Technology',
            },
            {
              stat: '88%',
              label: 'of online consumers are less likely to return after a bad user experience',
              source: 'Gomez Reports',
            },
          ].map(item => (
            <div class="p-8 border border-[#e2e8f0] rounded-2xl hover:border-[#2563eb] hover:shadow-lg transition-all">
              <div class="text-4xl font-extrabold text-[#2563eb] mb-3">{item.stat}</div>
              <p class="text-[#374151] text-sm leading-relaxed mb-3">{item.label}</p>
              <p class="text-[#94a3b8] text-xs italic">{item.source}</p>
            </div>
          ))}
        </div>

        <!-- Bad vs Good comparison -->
        <h2 class="font-extrabold text-[#0f172a] text-center mb-10" style="font-size:clamp(22px,3vw,40px);">
          The Real Cost of a Bad Website
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-[#fef2f2] border border-[#fecaca] rounded-2xl p-8">
            <div class="flex items-center gap-2 mb-5">
              <i class="fa-solid fa-circle-xmark text-[#ef4444] text-lg"></i>
              <h3 class="font-bold text-[#0f172a]">A Bad Website Costs You</h3>
            </div>
            <ul class="space-y-3">
              {[
                'Customers who leave before they ever call',
                "Credibility you can't get back",
                "Google rankings you can't compete for",
                'Revenue going to competitors with better sites',
                'The appearance that you\'re not serious about your business',
              ].map(item => (
                <li class="flex items-start gap-2 text-sm text-[#374151]">
                  <i class="fa-solid fa-xmark text-[#ef4444] mt-0.5 flex-shrink-0"></i>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div class="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-8">
            <div class="flex items-center gap-2 mb-5">
              <i class="fa-solid fa-circle-check text-[#22c55e] text-lg"></i>
              <h3 class="font-bold text-[#0f172a]">A Great Website Earns You</h3>
            </div>
            <ul class="space-y-3">
              {[
                'Instant credibility that converts visitors to customers',
                'Google visibility that brings customers to you',
                'A 24/7 salesperson working while you sleep',
                'A competitive advantage over local businesses',
                'The confidence that comes from being proud of your presence',
              ].map(item => (
                <li class="flex items-start gap-2 text-sm text-[#374151]">
                  <i class="fa-solid fa-check text-[#22c55e] mt-0.5 flex-shrink-0"></i>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>

    <BottomCTA />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 3: Write `src/pages/clients.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import TrustStats from '../components/sections/TrustStats.astro';
import Testimonials from '../components/sections/Testimonials.astro';
import FeaturedWork from '../components/sections/FeaturedWork.astro';
import BottomCTA from '../components/sections/BottomCTA.astro';
---
<BaseLayout
  title="Our Clients | Integrity Web Creations — Beaufort, SC"
  description="From churches to sports unions to medical practices — real testimonials from real businesses across the Southeast served by Integrity Web Creations."
>
  <Nav />
  <main class="pt-16">
    <section class="bg-[#f0f4ff] py-20">
      <div class="max-w-4xl mx-auto px-6 text-center">
        <h1 class="font-extrabold text-[#0f172a] mb-4" style="font-size:clamp(26px,4.2vw,52px);">
          Our Clients
        </h1>
        <p class="text-[#64748b] text-lg leading-relaxed max-w-xl mx-auto">
          From churches to professional sports unions, from medical practices to marinas — we serve businesses that serve people.
        </p>
      </div>
    </section>
    <TrustStats />
    <Testimonials />
    <FeaturedWork />
    <BottomCTA />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 4: Write `src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
---
<BaseLayout
  title="Page Not Found | Integrity Web Creations"
  description="The page you're looking for doesn't exist. Navigate back to the Integrity Web Creations homepage."
>
  <Nav />
  <main class="pt-16 min-h-screen flex items-center bg-[#f0f4ff]">
    <div class="max-w-2xl mx-auto px-6 py-24 text-center w-full">
      <div class="text-8xl font-extrabold text-[#e2e8f0] mb-6 select-none">404</div>
      <h1 class="font-extrabold text-[#0f172a] text-3xl mb-4">Page Not Found</h1>
      <p class="text-[#64748b] text-base mb-10">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a
        href="/"
        class="inline-flex items-center bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold px-8 py-3.5 rounded-md transition-colors no-underline"
      >
        &larr; Back to Home
      </a>
    </div>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 5: Verify pages in browser**

- `http://localhost:4321/about` — page hero + About section + timeline + BottomCTA
- `http://localhost:4321/why-we-matter` — page hero + 3 stat cards + bad vs good comparison
- `http://localhost:4321/clients` — stats + testimonials + portfolio + BottomCTA
- `http://localhost:4321/404` — large grey "404", heading, back button

- [ ] **Step 6: Commit**

```bash
git add src/pages/about.astro src/pages/why-we-matter.astro src/pages/clients.astro src/pages/404.astro
git commit -m "feat: add about, why-we-matter, clients, and 404 pages"
```

---

## Task 12: Create `contact.astro`

**Files:**
- Create: `src/pages/contact.astro`

- [ ] **Step 1: Write `src/pages/contact.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';

const faqs = [
  {
    q: 'How much does a website cost?',
    a: "Every project is different, so I don't publish generic pricing. I work with every client to find a solution that fits their actual budget. Let's talk — there's no pressure and no obligation.",
  },
  {
    q: 'How long does it take to build a website?',
    a: "A typical small business site takes 3–6 weeks from our first conversation to launch. Larger or more complex projects may take longer. I'll give you a realistic timeline in our first call.",
  },
  {
    q: 'Do I need to have my content ready?',
    a: "Not at all. I help clients develop their messaging, gather their content, and write copy that actually works on the web. You don't need to have anything prepared before we talk.",
  },
  {
    q: 'What happens after my site launches?',
    a: "I offer monthly maintenance plans that cover updates, security, backups, performance, and improvements. You'll also have my direct contact for any questions.",
  },
  {
    q: 'Do you only work with businesses in Beaufort?',
    a: "I'm based in Beaufort but work with clients across South Carolina, Georgia, and beyond. Geography has never been a barrier — we can handle everything remotely.",
  },
];

// JSON-LD for FAQ page
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(f => ({
    "@type": "Question",
    "name": f.q,
    "acceptedAnswer": { "@type": "Answer", "text": f.a }
  }))
};
---
<BaseLayout
  title="Contact | Integrity Web Creations — Beaufort, SC"
  description="Ready to talk about your website? Reach out to A. Smalls at Integrity Web Creations. Real responses, no automated replies."
>
  <script type="application/ld+json" set:html={JSON.stringify(faqJsonLd)} slot="head" />
  <Nav />
  <main class="pt-16">

    <!-- Hero -->
    <section class="bg-[#f0f4ff] py-20">
      <div class="max-w-4xl mx-auto px-6 text-center">
        <h1 class="font-extrabold text-[#0f172a] mb-4" style="font-size:clamp(26px,4.2vw,52px);">
          Let's Talk
        </h1>
        <p class="text-[#64748b] text-lg leading-relaxed max-w-xl mx-auto">
          No automated responses. No sales pitch. Just a real conversation about what your business needs.
        </p>
      </div>
    </section>

    <!-- Form + Contact Info -->
    <section class="bg-white py-20">
      <div class="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">

        <!-- Form -->
        <div>
          <h2 class="font-bold text-[#0f172a] text-2xl mb-2">Send a Message</h2>
          <p class="text-[#64748b] text-sm mb-8">I respond within 1 business day — usually same day.</p>

          <div id="form-success" class="hidden bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-6 py-5 mb-6">
            <p class="text-[#166534] font-semibold text-sm">
              ✓ Message sent! I'll be in touch within 1 business day.
            </p>
          </div>

          <form
            id="contact-form"
            action="https://api.web3forms.com/submit"
            method="POST"
            class="space-y-5"
          >
            <input type="hidden" name="access_key" value="REPLACE_WITH_WEB3FORMS_KEY" />
            <input type="hidden" name="subject" value="New Contact from IWC Website" />
            <input type="checkbox" name="botcheck" class="hidden" aria-hidden="true" />

            <div>
              <label for="name" class="block text-sm font-semibold text-[#374151] mb-1.5">
                Your Name <span class="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="John Smith"
                class="w-full border border-[#e2e8f0] rounded-lg px-4 py-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label for="email" class="block text-sm font-semibold text-[#374151] mb-1.5">
                Email Address <span class="text-[#ef4444]">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="john@yourbusiness.com"
                class="w-full border border-[#e2e8f0] rounded-lg px-4 py-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label for="business" class="block text-sm font-semibold text-[#374151] mb-1.5">
                Business Name
              </label>
              <input
                type="text"
                id="business"
                name="business"
                placeholder="Your Business Name"
                class="w-full border border-[#e2e8f0] rounded-lg px-4 py-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label for="message" class="block text-sm font-semibold text-[#374151] mb-1.5">
                How Can I Help? <span class="text-[#ef4444]">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                placeholder="Tell me about your business and what you're looking for..."
                class="w-full border border-[#e2e8f0] rounded-lg px-4 py-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              class="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold py-3.5 rounded-lg text-sm transition-colors shadow-lg shadow-blue-500/25"
            >
              Send Message &rarr;
            </button>
          </form>
        </div>

        <!-- Contact info -->
        <div class="lg:pt-12">
          <div class="space-y-8">
            {[
              {
                icon: 'fa-phone',
                label: 'Phone',
                value: '(843) 263-0072',
                href: 'tel:+18432630072',
              },
              {
                icon: 'fa-envelope',
                label: 'Email',
                value: 'asmalls@integritywebcreations.com',
                href: 'mailto:asmalls@integritywebcreations.com',
              },
            ].map(c => (
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                  <i class={`fa-solid ${c.icon} text-[#2563eb]`}></i>
                </div>
                <div>
                  <p class="font-semibold text-[#0f172a] text-sm mb-0.5">{c.label}</p>
                  <a href={c.href} class="text-[#2563eb] text-sm no-underline hover:underline">
                    {c.value}
                  </a>
                </div>
              </div>
            ))}

            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-lg bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-location-dot text-[#2563eb]"></i>
              </div>
              <div>
                <p class="font-semibold text-[#0f172a] text-sm mb-0.5">Location</p>
                <p class="text-[#64748b] text-sm">Beaufort, South Carolina</p>
                <p class="text-[#94a3b8] text-xs mt-0.5">Serving clients nationwide</p>
              </div>
            </div>

            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-lg bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-clock text-[#2563eb]"></i>
              </div>
              <div>
                <p class="font-semibold text-[#0f172a] text-sm mb-0.5">Response Time</p>
                <p class="text-[#64748b] text-sm">Within 1 business day</p>
                <p class="text-[#94a3b8] text-xs mt-0.5">Usually same day</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="bg-[#f8fafc] py-20">
      <div class="max-w-3xl mx-auto px-6">
        <h2 class="font-extrabold text-[#0f172a] mb-10 text-center" style="font-size:clamp(22px,3vw,40px);">
          Frequently Asked Questions
        </h2>
        <div class="space-y-3">
          {faqs.map((faq, i) => (
            <div class="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
              <button
                class="faq-btn w-full text-left px-6 py-4 flex items-center justify-between font-semibold text-[#0f172a] text-sm hover:text-[#2563eb] transition-colors"
                data-index={i}
                aria-expanded="false"
              >
                {faq.q}
                <i class="fa-solid fa-chevron-down text-xs text-[#94a3b8] transition-transform duration-200 faq-icon flex-shrink-0 ml-3"></i>
              </button>
              <div class="faq-answer hidden px-6 pb-5">
                <p class="text-[#64748b] text-sm leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

  </main>
  <Footer />
</BaseLayout>

<script>
  // Show success message if redirected back with ?success=true
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true') {
    document.getElementById('form-success')?.classList.remove('hidden');
    document.getElementById('contact-form')?.classList.add('hidden');
  }

  // FAQ accordion
  document.querySelectorAll<HTMLButtonElement>('.faq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const answer = btn.nextElementSibling as HTMLElement;
      const icon   = btn.querySelector<HTMLElement>('.faq-icon')!;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      // Close all
      document.querySelectorAll<HTMLButtonElement>('.faq-btn').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        (b.nextElementSibling as HTMLElement).classList.add('hidden');
        const ic = b.querySelector<HTMLElement>('.faq-icon')!;
        ic.style.transform = '';
      });

      // If was closed, open it
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        answer.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
      }
    });
  });
</script>
```

> **Note:** Replace `REPLACE_WITH_WEB3FORMS_KEY` with your actual Web3Forms access key from https://web3forms.com

- [ ] **Step 2: Verify in browser**

- `http://localhost:4321/contact`:
  - Form renders with name, email, business, message fields
  - FAQ accordion: clicking expands/collapses, chevron rotates
  - Contact info shows phone, email, location

- [ ] **Step 3: Commit**

```bash
git add src/pages/contact.astro
git commit -m "feat: add contact page with Web3Forms, FAQ accordion, contact info"
```

---

## Task 13: Create `vercel.json` and `public/robots.txt`

**Files:**
- Create: `vercel.json`
- Create: `public/robots.txt`

- [ ] **Step 1: Write `vercel.json`**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://analytics.integritywebcreations.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self' https://analytics.integritywebcreations.com https://api.web3forms.com; frame-ancestors 'none';"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Write `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://www.integritywebcreations.com/sitemap-index.xml
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json public/robots.txt
git commit -m "feat: add vercel.json security headers and robots.txt"
```

---

## Task 14: Final build verification and cleanup

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: Build completes with no errors. Output in `dist/`. All 6 pages present.

- [ ] **Step 2: Preview production build**

```bash
npm run preview
```

Open `http://localhost:4321` — verify full site in production mode.

- [ ] **Step 3: Check for broken links**

Visit each page and verify all nav links work:
- [ ] `/` — homepage
- [ ] `/about` — about page
- [ ] `/why-we-matter` — why page
- [ ] `/clients` — clients page
- [ ] `/contact` — contact page
- [ ] Navigate to `/nonexistent` — 404 page shows

- [ ] **Step 4: Mobile check**

Resize browser to 375px. Check:
- [ ] Nav hamburger works, overlay opens/closes
- [ ] Hero text is readable (doesn't overlap mouse SVG)
- [ ] Services cards stack to 1 column
- [ ] HowItWorks shows vertical timeline
- [ ] Portfolio cards stack vertically
- [ ] Footer stacks to 1 column

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete IWC v2 homepage redesign — all pages, spider web hero, Tailwind v4"
```

---

## Post-Deploy Checklist (Do after Vercel deploy)

These items require the live URL and cannot be done locally:

1. **Umami Analytics**: In `BaseLayout.astro`, replace `REPLACE_WITH_WEBSITE_ID` with the actual Umami website ID from your analytics dashboard.

2. **Web3Forms**: In `contact.astro`, replace `REPLACE_WITH_WEB3FORMS_KEY` with your actual access key from https://web3forms.com.

3. **Portfolio screenshots**: Take desktop screenshots (1280px viewport) of:
   - `thefriendshipbaptist.com` → save as `public/images/work-friendship-baptist.jpg`
   - `aflpu.org` → save as `public/images/work-aflpu.jpg`
   Then redeploy.

4. **Google Search Console**: Add verification meta tag to `BaseLayout.astro` head once you have it.

5. **Font Awesome SRI hash**: Verify the integrity hash in `BaseLayout.astro` against the actual file at `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css`. Run:
   ```bash
   curl -s https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css | openssl dgst -sha512 -binary | openssl base64 -A
   ```
   And prepend `sha512-` to the result.

6. **Founder photo**: Replace the photo placeholder in `About.astro` with an actual image once provided.
