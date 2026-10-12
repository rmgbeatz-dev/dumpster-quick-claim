# Bovitz Photography: Site Architecture

A dark, editorial portfolio and booking site. It ships today as dependency-free static files and is designed to graduate into the Instagram-synced, multi-platform stack in [`CONTENT-SYNC-STRATEGY.md`](CONTENT-SYNC-STRATEGY.md) without a redesign.

## 1. Site map & conversion paths

```
/ (index.html)
├── Hero: viewfinder slideshow (HUD: exposure, frame counter, AF box)  → "Check availability"
├── Portfolio: filterable masonry + lightbox                           → browse → book
├── Stories: pinned horizontal case studies (full sessions)
├── About: positioning + delivery promises
├── Services: tabbed collections, "Most booked" anchor                  → "Book <collection>" pre-fills wizard
├── Booking: 5-step wizard (Session → Date+Light → Collection → Details → Review)
├── Instagram: synced grid from feed.js (MediaItem schema)
├── FAQ
└── Footer CTA
/client.html (noindex): access-code gate → proofing gallery
    ├── favorites (♥, persisted per gallery), favorites-only view
    ├── lightbox with F-key favorite, slideshow
    └── "Send my favorites" → email/DM, "Download all" → signed ZIP (prod)
```

**Every primary CTA ends in the booking wizard.** Package buttons pre-select session and collection and jump to the first incomplete step. On mobile, a sticky Portfolio / Book bar appears after the hero and hides while the wizard is on screen.

## 2. Code layout

```
bovitz-photography/
├── index.html            semantic shell + JSON-LD (ProfessionalService)
├── client.html           client gallery shell (noindex, no-store)
├── assets/css/site.css   design system: tokens, components, responsive rules
├── assets/js/content.js  CONTENT LAYER: config, portfolio, packages, galleries (edit me)
├── assets/data/feed.js   GENERATED: normalized Instagram MediaItems
├── assets/js/core.js     placeholder-photo engine, lazy painter, lightbox, helpers
├── assets/js/app.js      home page renderer + booking wizard
├── assets/js/client.js   proofing gallery
├── netlify.toml · robots.txt · sitemap.xml · site.webmanifest
└── images/portfolio/     real photos (referenced via `src` in content.js)
```

Classic scripts on a `window.BZ` namespace (not ES modules), so the site also runs from `file://` for client previews. Content and presentation are fully separated: swapping placeholder art for real work is a data change, not a code change.

## 3. Design system

| Token | Value | Role |
|---|---|---|
| `--ink` | `#0d0d0c` | Gallery-black canvas: photos carry the color |
| `--bone` | `#ece6dc` | Text, primary buttons |
| `--accent` | `#e4a25b` | Golden-hour amber, used sparingly (kickers, focus, selection) |
| Display | Bodoni Moda (optical sizes) | Editorial, fashion-magazine contrast |
| Text | Hanken Grotesk | Neutral, legible UI |
| Data | JetBrains Mono | Camera HUD, EXIF, step labels |

Motion: aperture loader, Ken Burns crossfades, AF-confirm pulse, view-transition filtering, pinned horizontal stories, focus-bracket cursor, shutter flash on submit. All of it is disabled under `prefers-reduced-motion`.

## 4. Data model (shared with the sync pipeline)

`feed.js` holds the strategy doc's canonical **MediaItem** (`id, media_type, permalink, caption, timestamp, media_url, thumbnail_url, children…`). The ingestion worker writes it, and the site renders `media_url` (or `thumbnail_url` for video). The sample file carries `mood/subject` only to paint placeholders. Portfolio items take the same shape plus editorial fields (`title, cat, ratio, exif`). In production these come from the CMS, where Instagram posts are promoted into the portfolio by an editor flag.

## 5. Performance

- Real images use native lazy loading. Placeholder art is painted **only near the viewport, one image per frame**, so the main thread never stalls. Initial script time dropped from about 2.1 s to about 0.3 s when this was added.
- Only the first hero frame is painted up front. The remaining frames paint after `load`.
- Targets: LCP < 2.0 s, CLS < 0.05 (masonry tiles reserve space via `aspect-ratio`), INP < 200 ms.
- Production: serve AVIF/WebP via an image CDN with `srcset`, blurhash/LQIP backgrounds, and immutable caching on `/assets/*` (see `netlify.toml`).

## 6. Booking integration

`BZ.CONFIG.booking.endpoint` set → POST JSON (Formspree, Netlify Forms, or a `/api/inquiries` route). Otherwise it falls back to `mailto:` (if `email` is set), then to copying the inquiry and opening an Instagram DM. Availability comes from `leadDays`, `monthsAhead`, `blockedWeekdays` and `blockedDates`. **Production:** replace those static rules with a free/busy read from the photographer's calendar (Google Calendar API or a scheduler such as Cal.com) and add a deposit step (Stripe Checkout).

## 7. Client galleries: production requirements

The included gate is a **front-end demo**. For real client work:
1. Verify access codes server-side (hashed, rate-limited) and issue a short-lived session cookie.
2. Serve images through signed, expiring URLs from private object storage. Never put full-resolution originals in a public path.
3. Store favorites server-side so the photographer sees selections in an admin view.
4. Generate "Download all" ZIPs asynchronously and deliver them via a signed link. Watermark previews if desired.
5. Expire galleries automatically (the `expires` field) and log access.

## 8. Path to production

| Phase | Scope |
|---|---|
| **Now** | Static site: swap in real photos and bio, set email or endpoint, deploy to Netlify / Cloudflare Pages |
| **v1** | Astro build reading the same content shape from Supabase/Sanity, with Instagram OAuth ingest writing MediaItems (see strategy §3) |
| **v2** | Real client galleries (§7), calendar-backed availability, deposits |
| **v3** | Hub-and-spoke publishing (Pinterest, Facebook, Google Business Profile) from the CMS, with analytics on booking-funnel drop-off per step |

## 9. Placeholders to confirm with the photographer

The owner of @bovitzphotography could not be verified (see the strategy doc). Everything marked **SAMPLE** in `content.js` needs confirming: genres and categories, package names and prices (the "Sample pricing" badge shows until `pricingIsSample: false`), contact email, service area, the about quote, delivery times, and the canonical domain in `index.html` / `robots.txt` / `sitemap.xml`.
