# The Polk-Around Farm: website redesign

A single-file static site (`index.html`) for The Polk-Around Farm, a family honey, maple syrup and U-pick blueberry farm in Ortonville, MI. It has no build step. Open the file in a browser, or drop it on any static host (Netlify, Vercel, GitHub Pages, Squarespace code block).

## What's in it
- Hero section, a honey marquee with drips, and three crop cards (Honey / Maple / Blueberries)
- Live seasonal calendar that highlights the current month and changes the hero status pill
- Pantry "order builder": customers add items and it writes an SMS to Monica, with a pickup or shipping choice. There's no payment processor.
- U-pick booking section with tap-to-text/call, the family story, a map with directions, FAQ and schema.org `Farm` data for local SEO
- Mobile menu, reduced-motion support, and a cursor bee on desktop

## v2: moving parts
- Pollen particles and three flying bees on a hero canvas. The pollen scatters away from the cursor.
- Pinned product scroller: scrolling down slides six featured products sideways. It becomes a swipe carousel on phones.
- Sap-to-syrup scroll story: drops count up to 40 gallons, then boil down into a jar that fills and darkens to amber, with steam.
- Parallax hero, top scroll-progress bar, number counters, a marquee that speeds up with scroll velocity, and 3D tilt on cards, buttons that lean toward the cursor, and berries that dodge the mouse (desktop only)

## Real photos
Put photos in `images/` using the names listed in `images/README.md`. They replace the illustrations automatically.

## Verify before launch
- **Address:** public listings show both 1200 and 1280 Bald Eagle Lake Rd. The site uses 1200.
- **Prices:** only publicly listed prices are shown (honey from $8, syrup from $8, bourbon maple $12/$24). Everything else reads "Ask".
- **Story quote:** written as a placeholder in the family's voice. Replace it with their real words.
- **Photos:** the site uses illustrations for now. Swap in real farm photos (hives, sugarhouse, berry patch) for the biggest upgrade.
