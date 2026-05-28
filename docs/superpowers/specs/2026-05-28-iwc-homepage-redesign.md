# IWC Homepage Redesign — Design Spec
**Date:** 2026-05-28  
**Project:** Integrity Web Creations v2  
**Stack:** Astro + Tailwind CSS  
**Deployment:** Vercel (same as current)

---

## Overview

A complete redesign of the Integrity Web Creations marketing website. The new site replaces the existing static HTML/CSS/JS site while preserving all content. Key differentiator: a Spiderman-inspired interactive spider web animation in the hero — built as a canvas-based animation that shoots from a mouse icon in the top-right corner and expands radially across the screen. Clean modern aesthetic with light background and blue accents.

---

## Design Direction

**Style:** Clean Modern  
**Palette:**
- Background: `#f0f4ff` (hero), `#ffffff` (sections), `#f8fafc` (alternating)
- Primary: `#2563eb` (blue)
- Dark: `#0f172a`
- Text secondary: `#64748b`
- Border: `#e2e8f0`
- CTA dark: `#1e3a8a` → `#2563eb` gradient

**Typography:**
- Font: `Inter` (Google Fonts) — 800 for headings, 600 for subheadings, 400 for body
- Hero headline: `clamp(26px, 4.2vw, 52px)`, weight 800, letter-spacing -1px
- Section headings: `clamp(22px, 3vw, 40px)`, weight 800

**Responsiveness:** Mobile-first, Tailwind breakpoints. Hamburger nav on mobile with scroll-lock and smooth fade transition.

---

## Tech Stack

- **Framework:** Astro (static output, zero client JS by default)
- **Styling:** Tailwind CSS v4
- **Animation:** Vanilla canvas JS (spider web hero only — isolated from rest of page)
- **Analytics:** Umami (self-hosted at analytics.integritywebcreations.com)
- **Forms:** Web3Forms (carry over from existing site)
- **Deployment:** Vercel with existing security headers from `vercel.json`
- **SEO:** Astro SEO component, JSON-LD structured data, sitemap, robots.txt

---

## File Structure

```
integrity-web-creations-v2/
├── src/
│   ├── components/
│   │   ├── Nav.astro
│   │   ├── Footer.astro
│   │   ├── SpiderWebHero.astro      ← canvas animation component
│   │   ├── sections/
│   │   │   ├── Hero.astro
│   │   │   ├── TrustStats.astro
│   │   │   ├── Services.astro
│   │   │   ├── FeaturedWork.astro
│   │   │   ├── HowItWorks.astro
│   │   │   ├── About.astro
│   │   │   ├── Testimonials.astro
│   │   │   └── BottomCTA.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   ├── why-we-matter.astro
│   │   ├── clients.astro
│   │   └── 404.astro
│   └── styles/
│       └── global.css
├── public/
│   ├── favicon.svg
│   ├── og-image.png
│   └── images/
│       ├── work-friendship-baptist.jpg
│       └── work-aflpu.jpg
├── astro.config.mjs
├── tailwind.config.mjs
├── vercel.json
└── package.json
```

---

## Page Sections — Homepage (`index.astro`)

### Navigation
- Fixed top bar, white background with `backdrop-blur`
- Logo: "integrity WEB CREATIONS" (lowercase `integrity`, uppercase rest)
- Links: Home · About · Why We Matter · Clients · Contact
- CTA button: "Start a Project" (blue, pill shape)
- Mobile: hamburger, full-screen overlay, closes on scroll and link click

---

### Section 01 — Hero
**Background:** `#f0f4ff`  
**Layout:** Full viewport height, hero text left-aligned (left 40% of screen), spider web fills right side

**Spider Web Animation (`SpiderWebHero.astro`):**
- Canvas element, full viewport, `pointer-events: none`, `z-index: 1`
- Mouse SVG element (92×138px, `rotate(225deg)` = 7:30 position) fixed at `top: -28px; right: -28px`
- Mouse slides in from upper-right using CSS transition on `.in-position` class
- Web origin: dynamically computed from `mouse-wrap.getBoundingClientRect()` center after settle
- 22 spokes fanning from 88° → 200° (full screen coverage from top-right)
- 16 rings, log-spaced, max radius = `Math.hypot(W, H) * 1.08`
- Animation sequence:
  1. Mouse slides in (0.15s delay, 0.62s transition)
  2. Left button glows blue (0.85s)
  3. CLICK moment (1.05s): white screen flash + 12-pt yellow starburst "CLICK!" + 28 action lines burst
  4. Web grows radially from mouse center (1.05s → 3.60s), uniform frontier expansion
  5. Spoke tips glow as they extend; rings fade in as frontier crosses their distance
  6. Mouse cursor attracts nearby web strands
- Strands: dual layer (blue glow halo + core), intersection dewdrop nodes
- Colors: `rgba(147,197,253,*)` glow, `rgba(37,99,235,*)` core

**Hero Content:**
- Badge: "Beaufort, SC — Your Local Web Partner Since 2010" (blue pill)
- Headline: "Your Business. Every Screen. Every Home."
- Subheadline: "A custom website, built exclusively for your business — handled, maintained, and grown by a local partner who knows your name, not just your account number."
- CTA 1: "Let's Talk →" (blue button)
- CTA 2: "Why You Need This" (outline button → `/why-we-matter`)
- Content fades in after web animation settles (~2.5s)

---

### Section 02 — Trust Signals
**Background:** `#ffffff`  
**Layout:** 3-column stat grid, centered, generous padding

**Stats (animated counters on scroll-into-view):**
- `15+` — Years of Experience
- `1M+` — Views Generated Across Client Sites
- `100%` — Client Satisfaction

---

### Section 03 — Services
**Background:** `#f8fafc`  
**Layout:** 2-column grid (desktop), 1-column (mobile)  
**Heading:** "What We Build For You"

**6 Service Cards** (icon + name + 1-line teaser, hover reveals full description):
1. Custom Web Design — fa-palette — "A site built from scratch, tailored to your exact business..."
2. Brand Identity — fa-pen-ruler — "Logos, colors, and brand systems that tell your story..."
3. Search Visibility (SEO) — fa-magnifying-glass-chart — "We make sure your customers find you..."
4. E-Commerce — fa-cart-shopping — "Sell your products and services online around the clock..."
5. Monthly Maintenance — fa-screwdriver-wrench — "Your site stays fast, secure, and current — always..."
6. Digital Marketing — fa-chart-line — "Targeted campaigns that reach your specific customers..."

---

### Section 04 — Featured Work
**Background:** `#ffffff`  
**Layout:** 2×2 grid of portfolio cards  
**Heading:** "Built for Real Businesses"

**Portfolio Cards** (screenshot + overlay on hover):
1. **The Friendship Baptist Church** — thefriendshipbaptist.com — Church · Beaufort, SC
   - Screenshot: dark sophisticated design, cross hero, Pastor Isiah Smalls
2. **Arena Football Players Union** — aflpu.org — Professional Sports Union · Atlanta, GA
   - Screenshot: clean white/minimalist, professional union branding
3. **Epps Medical** — Placeholder card (no URL provided) — Medical Practice · Savannah, GA
4. **The Beaufort Marina** — Placeholder card (no URL provided) — Marina · Beaufort, SC

> **Note:** Screenshots for items 3 and 4 (Epps Medical, Beaufort Marina) to be provided by client. Use styled placeholder cards in the interim.

---

### Section 05 — How It Works
**Background:** `#f8fafc`  
**Layout:** Horizontal 6-step timeline (desktop), vertical stacked (mobile)  
**Heading:** "Your Journey With Us"

**6 Steps:**
1. Conversation — "No forms, no automated quotes. Just you and A. Smalls..."
2. Strategy — "A custom plan built around your business..."
3. Design — "Your site is designed uniquely for your brand. You review and approve..."
4. Build — "Every line of your site is hand-crafted for your specific needs..."
5. Launch — "We go live together. You're walked through everything..."
6. Ongoing Partnership — "Your monthly plan covers everything..."

---

### Section 06 — About A. Smalls
**Background:** `#ffffff`  
**Layout:** Split — photo placeholder left, story right (desktop); stacked (mobile)  
**Heading:** "One Person. Your Full Attention."

**Content:**
- Founder: A. Smalls · USC Computer Engineering, Class of 2010 · Beaufort, SC Native
- Core story: returned home to make professional web presence accessible to small businesses
- The "staying small by design" positioning
- The 2018–2025 family chapter and 2026 return
- 4 Core Values grid below story: Integrity · Personal Service · Accessibility · Partnership

---

### Section 07 — Testimonials
**Background:** `#f8fafc`  
**Layout:** 2×2 card grid  
**Heading:** "What Our Clients Say"

**4 Real Client Testimonials (5-star rating + quote + name + business):**
1. Dr. Willie Epps — Epps Medical — Savannah, GA
2. James Baron — Arena Football Players Union — Atlanta, GA
3. Pastor Isiah Smalls — The Friendship Baptist Church — Beaufort, SC
4. Rick & Mandy — The Beaufort Marina — Beaufort, SC

---

### Section 08 — Bottom CTA
**Background:** Dark gradient `#1e3a8a → #2563eb`  
**Layout:** Centered, full-width band  
**Heading:** "Ready for a Website That Works For You?"  
**Body:** "Custom-built. Fully managed. Built around your budget. Let's have a real conversation about what your business deserves online."  
**Button:** "Let's Talk →" (white button, dark text)

---

### Footer
**Background:** `#0f172a`  
**Columns:** Logo + tagline · Nav links · Contact info  
**Content:**
- Logo: "integrity WEB CREATIONS"
- Tagline: "Built with Integrity. Engineered to Perform."
- Links: Home · About · Why We Matter · Clients · Contact
- Phone: (843) 263-0072
- Email: asmalls@integritywebcreations.com
- Location: Beaufort, South Carolina
- Copyright: "© 2026 Integrity Web Creations · Founded 2010"

---

## Additional Pages

Each page uses `BaseLayout.astro` (Nav + Footer + SEO meta).

| Page | Content Source |
|------|---------------|
| `about.astro` | Full founder story, timeline, core values, process |
| `contact.astro` | Web3Forms contact form, FAQ accordion, contact info |
| `why-we-matter.astro` | Statistics page with sourced data, bad vs good site comparison |
| `clients.astro` | All 4 testimonials expanded, stats bar |
| `404.astro` | Minimal, back-to-home CTA |

---

## SEO

- Title pattern: `{Page} | Integrity Web Creations — Beaufort, SC`
- Meta description per page
- OG image: `og-image.png`
- JSON-LD: `ProfessionalService`, `WebSite`, `FAQPage` (contact page)
- Canonical URLs
- Google Search Console verification tag
- `sitemap.xml` (Astro sitemap integration)
- `robots.txt`

---

## Analytics

Umami tracking on every page (self-hosted at analytics.integritywebcreations.com). Script deferred, loaded after page paint. Website ID to be configured post-deploy.

---

## Security (vercel.json)

Carry over all headers from existing site:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security`
- `Referrer-Policy`
- `Permissions-Policy`

---

## Out of Scope (This Implementation)

- Blog / news section
- Client portal / login
- Online payment processing
- CMS integration
- Dark mode toggle
