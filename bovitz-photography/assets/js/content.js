/* =========================================================================
   BOVITZ PHOTOGRAPHY: CONTENT LAYER
   Everything on the site renders from this file. In production, this file
   is generated from the CMS / Instagram ingestion pipeline (see ARCHITECTURE.md).
   Values marked SAMPLE are placeholders to confirm with the photographer.
   ========================================================================= */
window.BZ = window.BZ || {};

BZ.CONFIG = {
  brand: "Bovitz",
  name: "Bovitz Photography",
  tagline: "Honest light. Unhurried moments. Photographs that feel like you.",
  instagram: "bovitzphotography",
  instagramUrl: "https://www.instagram.com/bovitzphotography/",
  dmUrl: "https://ig.me/m/bovitzphotography",
  email: "",                   // SAMPLE: e.g. "hello@bovitzphotography.com" (enables mailto booking)
  phone: "",                   // SAMPLE
  serviceArea: "Available for sessions locally & for travel",   // SAMPLE
  booking: {
    endpoint: "",              // e.g. Formspree / Netlify Forms / your API. Blank = email or DM fallback
    leadDays: 7,               // earliest bookable date from today
    monthsAhead: 6,
    blockedWeekdays: [],       // 0=Sun … 6=Sat
    blockedDates: [],          // "2026-11-26"
    slots: ["Sunrise", "Morning", "Afternoon", "Golden hour"],
  },
  pricingIsSample: true,       // shows a "Sample pricing" badge until set to false
};

BZ.CATEGORIES = ["Portraits", "Couples", "Weddings", "Seniors", "Family", "Landscape"];

/* Portfolio. `src` takes a real image path. Without it, an art-directed placeholder
   is painted from `mood` + `subject` so the layout always looks finished. */
BZ.PORTFOLIO = [
  {id:"p01", title:"Last Light on the Ridge", cat:"Couples",   mood:"golden", subject:"couple", ratio:"3/2", exif:"f/1.8 · 1/500 · ISO 100 · 85mm"},
  {id:"p02", title:"Quiet Before the Vows",   cat:"Weddings",  mood:"dusk",   subject:"couple", ratio:"2/3", exif:"f/2.0 · 1/250 · ISO 200 · 50mm"},
  {id:"p03", title:"Blue Hour, Class of '27", cat:"Seniors",   mood:"blue",   subject:"person", ratio:"4/5", exif:"f/1.4 · 1/200 · ISO 400 · 85mm"},
  {id:"p04", title:"Fog Lifts Slowly",        cat:"Landscape", mood:"mono",   subject:"tree",   ratio:"3/2", exif:"f/8 · 1/125 · ISO 100 · 35mm"},
  {id:"p05", title:"Sunday, Somewhere Green", cat:"Family",    mood:"forest", subject:"family", ratio:"3/2", exif:"f/2.8 · 1/640 · ISO 160 · 35mm"},
  {id:"p06", title:"Self, Uncomposed",        cat:"Portraits", mood:"mono",   subject:"person", ratio:"2/3", exif:"f/1.8 · 1/320 · ISO 100 · 85mm"},
  {id:"p07", title:"First Dance Under Stars", cat:"Weddings",  mood:"night",  subject:"couple", ratio:"3/2", exif:"f/1.4 · 1/160 · ISO 1600 · 35mm"},
  {id:"p08", title:"Wildflower Hours",        cat:"Seniors",   mood:"golden", subject:"person", ratio:"4/5", exif:"f/2.0 · 1/800 · ISO 100 · 105mm"},
  {id:"p09", title:"Where the Water Ends",    cat:"Landscape", mood:"blue",   subject:"none",   ratio:"16/9", exif:"f/11 · 2s · ISO 64 · 24mm"},
  {id:"p10", title:"Hold On a Little Longer", cat:"Couples",   mood:"dusk",   subject:"couple", ratio:"4/5", exif:"f/1.8 · 1/400 · ISO 200 · 50mm"},
  {id:"p11", title:"Four of Us",              cat:"Family",    mood:"golden", subject:"family", ratio:"3/2", exif:"f/2.8 · 1/500 · ISO 200 · 50mm"},
  {id:"p12", title:"The Long Exhale",         cat:"Portraits", mood:"forest", subject:"person", ratio:"2/3", exif:"f/1.4 · 1/1000 · ISO 100 · 85mm"},
];

/* Featured stories (horizontal scroller) */
BZ.STORIES = [
  {title:"An October Elopement", kicker:"Weddings", mood:"dusk",   subject:"couple", frames:42},
  {title:"Senior Sessions '27",  kicker:"Seniors",  mood:"golden", subject:"person", frames:28},
  {title:"The Lakehouse Family", kicker:"Family",   mood:"blue",   subject:"family", frames:36},
  {title:"Winter, in Monochrome",kicker:"Landscape",mood:"mono",   subject:"tree",   frames:19},
];

/* Services & collections. SAMPLE pricing */
BZ.PACKAGES = {
  "Portraits": [
    {name:"Mini",      price:225,  hrs:"30 min", items:["1 location","15+ edited images","Online gallery"]},
    {name:"Signature", price:425,  hrs:"1 hour", items:["2 locations","40+ edited images","Outfit change","Print release"], featured:true},
  ],
  "Seniors": [
    {name:"Classic",   price:325,  hrs:"1 hour",  items:["1–2 locations","35+ edited images","2 outfits"]},
    {name:"Legacy",    price:550,  hrs:"2 hours", items:["3 locations","75+ edited images","Unlimited outfits","Announcement design"], featured:true},
  ],
  "Couples": [
    {name:"Golden Hour", price:375, hrs:"1 hour", items:["Engagement or anniversary","40+ edited images","Location scouting"], featured:true},
  ],
  "Family": [
    {name:"Everyday",  price:350,  hrs:"1 hour",  items:["Up to 6 people","40+ edited images","Lifestyle or posed"], featured:true},
    {name:"Extended",  price:495,  hrs:"90 min",  items:["Up to 15 people","60+ edited images","Group & sub-groups"]},
  ],
  "Weddings": [
    {name:"Elopement", price:1400, hrs:"Up to 3 hrs", items:["Ceremony + portraits","200+ images","Sneak peek in 48 hrs"]},
    {name:"Full Day",  price:3200, hrs:"8 hours", items:["Prep to send-off","600+ images","Second shooter","Heirloom album"], featured:true},
  ],
};

BZ.PROCESS = [
  {n:"01", t:"Inquire", d:"Pick a session type and date below. You'll hear back within 48 hours."},
  {n:"02", t:"Plan",    d:"We talk locations, wardrobe and light, and I'll send a style guide."},
  {n:"03", t:"Shoot",   d:"Relaxed, guided and genuinely fun. No stiff poses, just real moments."},
  {n:"04", t:"Deliver", d:"Your private online gallery arrives in about two weeks, ready to favorite, download and share."},
];

BZ.FAQ = [
  ["How far in advance should I book?", "Golden-hour weekends go first. For portraits, book 2–4 weeks out. For weddings, book 6–12 months out."],
  ["What should we wear?", "After booking you'll get a wardrobe guide. In short: textures, complementary tones, and nothing with big logos."],
  ["Do I get the full-resolution files?", "Yes. Every collection includes high-resolution downloads and a print release from your private gallery."],
  ["What if the weather turns?", "We'll watch the forecast together and reschedule free of charge if the light (or rain) won't cooperate."],
];

/* Client galleries (DEMO). Real galleries must be authenticated server-side. */
BZ.CLIENT_GALLERIES = [
  {code:"DEMO", name:"The Example Session", date:"October 2026", mood:"golden", subject:"couple", count:24, expires:"90 days"},
];
