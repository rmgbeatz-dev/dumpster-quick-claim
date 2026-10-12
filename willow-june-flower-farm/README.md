# Willow June Flower Farm: website

A single-file static site (`index.html`) with no build step. Open it in a browser or drop it on any static host.

## Edit everything in one place
Near the bottom of `index.html` is a `<script>` block marked **EDIT ME**:
- `CONFIG`: name, Facebook and Messenger links, location, phone, email, hours, season months
- `OFFERINGS`: the four headline services
- `CATALOG`: the full product and service catalogue (19 items across 6 categories). `price: "TBD"` shows "Ask · pricing coming soon", and `""` shows "Ask".
- `STEMS`: flowers and colors in the bouquet builder
- `BLOOMS`: the month-by-month bloom calendar
- `FAQ`

## Moving parts
- Hero garden: an animated canvas of flowers that grow, bloom and sway, with falling petals that react to the cursor
- Hanging willow strands that sway and part when the mouse sweeps past
- Manifesto paragraph that lights up word by word as you scroll
- **Bouquet Bar**: build a bouquet stem by stem. Stems fan out live, blooms pop open, and tapping a bloom removes it. The finished design goes into the request list.
- Pinned horizontal bloom calendar that highlights the current month
- **Live Facebook feed** (Facebook Page Plugin) inside a phone frame, showing the farm's real posts and photos
- Request list: one message to the farm via Messenger (copied to the clipboard)
- Card tilt, a petal trail behind the cursor, a scroll progress bar, and full motion off for visitors who prefer reduced motion

## Real photos
Drop files into `images/` and they fade in over the illustrations (`.jpg`, `.jpeg`, `.png` or `.webp`):
- `images/scenes/` bouquets · subscription · upick · events
- `images/flowers/` uses each catalogue item's `id`, e.g. `market.jpg`, `share4.jpg`, `upick.jpg`, `bride.jpg`, `dahliaStems.jpg`, `tubers.jpg`

## Placeholders to confirm with the farm
No public info beyond the Facebook page could be verified, so these are **assumed defaults**:
- Location, phone, email and hours (blank or generic in `CONFIG`)
- Which services they actually offer (shares, U-pick, events, workshops, tubers and dried flowers are typical flower-farm offerings)
- All prices (set to "Ask")
- Bloom calendar timing (a typical northern-US cut-flower season, May–Oct)
- Manifesto copy, which was written in the farm's voice as a placeholder
- The Messenger link `m.me/61591456326555` (test that it opens their inbox)
