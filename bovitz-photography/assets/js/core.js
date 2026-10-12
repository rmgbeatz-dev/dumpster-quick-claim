/* =========================================================================
   CORE: shared by every page
   - BZ.scene(): paints art-directed placeholder "photographs" (layered ridgelines,
     atmospheric haze, sun glow, silhouettes, film grain, vignette) so the site
     looks finished before real images exist. Real `src` always wins.
   - BZ.img(): resolves an item to a URL (real src → painted placeholder), cached.
   - BZ.lightbox: keyboard/swipe lightbox with EXIF caption + optional favorite.
   ========================================================================= */
window.BZ = window.BZ || {};
(() => {
  const rng = seed => { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const MOODS = {
    golden:{sky:["#f9d9a6","#f0a66a","#c8664a"], sun:"#fff1c9", far:"#d58a6a", near:"#2a1712", fog:"rgba(255,214,170,.35)"},
    dusk:  {sky:["#f6b49a","#b26f8f","#3e2f55"], sun:"#ffd9c2", far:"#8a5f84", near:"#1a1324", fog:"rgba(232,170,180,.28)"},
    blue:  {sky:["#c9d8e6","#7d97b3","#2c3e57"], sun:"#eef4fb", far:"#5f7894", near:"#101823", fog:"rgba(205,222,240,.35)"},
    forest:{sky:["#e6ecd8","#a9b993","#4c5e45"], sun:"#fbfbe9", far:"#71856a", near:"#141c13", fog:"rgba(225,235,210,.4)"},
    night: {sky:["#3b4a78","#1d2546","#0a0d1c"], sun:"#cfd8ff", far:"#26305a", near:"#05070f", fog:"rgba(120,140,220,.18)", stars:true},
    mono:  {sky:["#e9e7e3","#a9a6a1","#4b4946"], sun:"#ffffff", far:"#8a8783", near:"#141414", fog:"rgba(235,235,235,.45)", mono:true},
  };
  const mix = (a, b, t) => { const p = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16)); const A = p(a), B = p(b);
    return `rgb(${A.map((v,i) => Math.round(v + (B[i]-v)*t)).join(",")})`; };

  let grainTile;
  const grain = () => { if (grainTile) return grainTile; const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d"), d = x.createImageData(128,128);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random()*255; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=26; }
    x.putImageData(d,0,0); return grainTile = c; };

  const ridge = (r, w, y0, amp, rough) => { // midpoint displacement
    let pts = [[0, y0 + (r()-.5)*amp], [w, y0 + (r()-.5)*amp]], disp = amp;
    for (let k = 0; k < 7; k++) { const next = [];
      for (let i = 0; i < pts.length - 1; i++) { const [x1,y1] = pts[i], [x2,y2] = pts[i+1];
        next.push(pts[i], [(x1+x2)/2, (y1+y2)/2 + (r()-.5)*disp]); }
      next.push(pts[pts.length-1]); pts = next; disp *= rough; }
    return pts; };

  const figure = (x, ctx, gy, s, kind) => { // simple silhouettes standing on ground line gy
    ctx.save(); ctx.translate(x, gy);
    const person = (dx, h, dress) => { // head, shoulders, tapered torso, legs or a flared dress
      ctx.beginPath(); ctx.ellipse(dx, -h*.915, h*.058, h*.07, 0, 0, 6.283); ctx.fill();
      ctx.fillRect(dx - h*.022, -h*.86, h*.044, h*.05);
      ctx.beginPath(); ctx.moveTo(dx - h*.025, -h*.82);
      ctx.quadraticCurveTo(dx - h*.12, -h*.81, dx - h*.125, -h*.74);
      if (dress) { ctx.quadraticCurveTo(dx - h*.08, -h*.55, dx - h*.075, -h*.5); ctx.quadraticCurveTo(dx - h*.17, -h*.2, dx - h*.2, 0); ctx.lineTo(dx + h*.2, 0); ctx.quadraticCurveTo(dx + h*.17, -h*.2, dx + h*.075, -h*.5); ctx.quadraticCurveTo(dx + h*.08, -h*.55, dx + h*.125, -h*.74); }
      else { ctx.lineTo(dx - h*.105, -h*.46); ctx.lineTo(dx - h*.085, 0); ctx.lineTo(dx - h*.015, 0); ctx.lineTo(dx, -h*.4); ctx.lineTo(dx + h*.015, 0); ctx.lineTo(dx + h*.085, 0); ctx.lineTo(dx + h*.105, -h*.46); ctx.lineTo(dx + h*.125, -h*.74); }
      ctx.quadraticCurveTo(dx + h*.12, -h*.81, dx + h*.025, -h*.82); ctx.closePath(); ctx.fill(); };
    if (kind === "person") person(0, s, false);
    if (kind === "couple") { person(-s*.1, s*.94, true); person(s*.11, s, false); }
    if (kind === "family") { person(-s*.36, s, false); person(-s*.12, s*.93, true); person(s*.1, s*.58, false); person(s*.3, s*.5, true); }
    if (kind === "tree") { ctx.fillRect(-s*.03, -s*.9, s*.06, s*.9); for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((Math.sin(i*2.3))*s*.22, -s*.9 - Math.cos(i*1.7)*s*.18 - s*.05, s*(.14 + (i%3)*.03), 0, 6.283); ctx.fill(); } }
    ctx.restore(); };

  BZ.scene = (w, h, mood = "golden", subject = "none", seed = "x") => {
    const m = MOODS[mood] || MOODS.golden, r = rng(seed + mood + subject), c = document.createElement("canvas");
    c.width = w; c.height = h; const x = c.getContext("2d");
    // sky
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, m.sky[2]); g.addColorStop(.5, m.sky[1]); g.addColorStop(.78, m.sky[0]); x.fillStyle = g; x.fillRect(0,0,w,h);
    if (m.stars) for (let i = 0; i < w*h/1800; i++) { x.fillStyle = `rgba(255,255,255,${r()*.8})`; x.fillRect(r()*w, r()*h*.6, r()*1.6, r()*1.6); }
    // sun / moon glow
    const sx = w*(.25 + r()*.5), sy = h*(.38 + r()*.18), sr = Math.min(w,h)*(.5 + r()*.3);
    const sg = x.createRadialGradient(sx, sy, 0, sx, sy, sr); sg.addColorStop(0, m.sun); sg.addColorStop(.08, m.sun); sg.addColorStop(.1, m.sun + "cc"); sg.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = sg; x.fillRect(0,0,w,h);
    // ridgelines with atmospheric perspective
    const layers = 4 + Math.floor(r()*2); let groundY = h;
    for (let i = 0; i < layers; i++) {
      const t = i/(layers-1), y0 = h*(.52 + t*.3), pts = ridge(r, w, y0, h*(.22 - t*.1), .52 + r()*.06);
      x.fillStyle = mix(m.far.length === 7 ? m.far : "#888888", m.near, Math.pow(t, 1.3));
      x.beginPath(); x.moveTo(0, h); pts.forEach(([px,py]) => x.lineTo(px, py)); x.lineTo(w, h); x.closePath(); x.fill();
      if (i < layers-1) { const fg = x.createLinearGradient(0, y0 - h*.06, 0, y0 + h*.1); fg.addColorStop(0, "rgba(0,0,0,0)"); fg.addColorStop(.5, m.fog); fg.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = fg; x.fillRect(0, y0 - h*.06, w, h*.16); }
      if (i === layers-1) { const mid = pts[Math.floor(pts.length*(.35 + r()*.3))]; groundY = mid; }
    }
    // subject silhouette on the nearest ridge
    if (subject !== "none" && groundY && groundY.length) { x.fillStyle = m.near; figure(groundY[0], x, groundY[1] + 2, Math.min(h, w*1.3)*(subject === "tree" ? .3 : .17), subject); }
    // light bloom + vignette + grain
    x.globalCompositeOperation = "screen"; const bl = x.createRadialGradient(sx, sy, 0, sx, sy, sr*.6); bl.addColorStop(0, "rgba(255,240,220,.35)"); bl.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = bl; x.fillRect(0,0,w,h);
    x.globalCompositeOperation = "source-over";
    const v = x.createRadialGradient(w/2, h/2, Math.min(w,h)*.35, w/2, h/2, Math.max(w,h)*.75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.55)"); x.fillStyle = v; x.fillRect(0,0,w,h);
    x.fillStyle = x.createPattern(grain(), "repeat"); x.fillRect(0,0,w,h);
    if (m.mono) { const o = document.createElement("canvas"); o.width = w; o.height = h; const ox = o.getContext("2d"); ox.filter = "grayscale(1) contrast(1.08)"; ox.drawImage(c, 0, 0); return o; }
    return c;
  };

  const cache = new Map();
  const ratioNum = r => { const [a,b] = String(r || "3/2").split("/").map(Number); return a/(b||1); };
  BZ.ratio = ratioNum;
  BZ.img = (item, longEdge = 1000) => {
    if (item.src) return item.src;
    const k = `${item.id || item.title}|${item.mood}|${item.subject}|${item.ratio}|${longEdge}`;
    if (cache.has(k)) return cache.get(k);
    const rt = ratioNum(item.ratio), w = rt >= 1 ? longEdge : Math.round(longEdge*rt), h = rt >= 1 ? Math.round(longEdge/rt) : longEdge;
    const url = BZ.scene(w, h, item.mood, item.subject, item.id || item.title).toDataURL("image/jpeg", .86);
    cache.set(k, url); return url;
  };

  /* ---------------- lightbox ---------------- */
  BZ.lightbox = (() => {
    let list = [], i = 0, opts = {}, el, startX = 0;
    const build = () => {
      el = document.createElement("div"); el.className = "lb"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Image viewer");
      el.innerHTML = `<button class="lb-x" aria-label="Close">✕</button><button class="lb-nav lb-prev" aria-label="Previous">←</button><button class="lb-nav lb-next" aria-label="Next">→</button>
        <figure><img alt=""><figcaption><span class="lb-t"></span><span class="lb-m"></span><span class="lb-n"></span><button class="lb-fav" hidden aria-label="Favorite">♡</button></figcaption></figure>`;
      document.body.appendChild(el);
      el.querySelector(".lb-x").onclick = close; el.querySelector(".lb-prev").onclick = () => go(-1); el.querySelector(".lb-next").onclick = () => go(1);
      el.addEventListener("click", e => { if (e.target === el) close(); });
      el.querySelector(".lb-fav").onclick = () => { opts.onFav && opts.onFav(list[i]); paint(); };
      el.addEventListener("touchstart", e => startX = e.touches[0].clientX, {passive:true});
      el.addEventListener("touchend", e => { const dx = e.changedTouches[0].clientX - startX; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
      addEventListener("keydown", e => { if (!el.classList.contains("on")) return; if (e.key === "Escape") close(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); if (e.key.toLowerCase() === "f" && opts.onFav) el.querySelector(".lb-fav").click(); });
    };
    const paint = () => { const it = list[i], img = el.querySelector("img");
      img.classList.remove("in"); img.src = BZ.img(it, 1800); img.alt = it.title || ""; requestAnimationFrame(() => img.classList.add("in"));
      el.querySelector(".lb-t").textContent = it.title || ""; el.querySelector(".lb-m").textContent = it.exif || it.cat || "";
      el.querySelector(".lb-n").textContent = `${String(i+1).padStart(2,"0")} / ${String(list.length).padStart(2,"0")}`;
      const f = el.querySelector(".lb-fav"); f.hidden = !opts.onFav; if (opts.isFav) { const on = opts.isFav(list[i]); f.textContent = on ? "♥" : "♡"; f.classList.toggle("on", on); } };
    const go = d => { i = (i + d + list.length) % list.length; paint(); };
    const open = (items, idx = 0, o = {}) => { if (!el) build(); list = items; i = idx; opts = o; paint(); el.classList.add("on"); document.documentElement.style.overflow = "hidden"; el.querySelector(".lb-x").focus(); };
    const close = () => { el.classList.remove("on"); document.documentElement.style.overflow = ""; opts.onClose && opts.onClose(); };
    return { open, close };
  })();

  /* ---------------- lazy painting ----------------
     Real images use native lazy loading. Painted placeholders are generated only
     when they approach the viewport, one per frame, so the main thread never stalls. */
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  BZ.lazy = (item, edge = 900) => item.src ? `src="${item.src}" loading="lazy" decoding="async"`
    : `src="${BLANK}" data-bz="${encodeURIComponent(JSON.stringify({...item, _e: edge}))}"`;
  const queue = []; let pumping = false;
  const pump = () => { const el = queue.shift(); if (!el) { pumping = false; return; }
    const it = JSON.parse(decodeURIComponent(el.dataset.bz)); el.src = BZ.img(it, it._e); el.removeAttribute("data-bz"); el.classList.add("painted"); requestAnimationFrame(pump); };
  const lio = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; lio.unobserve(e.target); queue.push(e.target); if (!pumping) { pumping = true; requestAnimationFrame(pump); } }), {rootMargin: "600px 400px"});
  BZ.hydrate = (root = document) => root.querySelectorAll("img[data-bz]").forEach(el => lio.observe(el));

  /* ---------------- tiny shared helpers ---------------- */
  BZ.$ = s => document.querySelector(s); BZ.$$ = s => [...document.querySelectorAll(s)];
  BZ.calm = matchMedia("(prefers-reduced-motion:reduce)").matches;
  BZ.fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
  BZ.toast = msg => { let t = BZ.$(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role","status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3000); };
  BZ.reveal = () => { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), {threshold:.12, rootMargin:"0px 0px -40px"});
    BZ.$$(".rv").forEach(n => io.observe(n)); };
  BZ.cursor = () => { if (!BZ.fine || BZ.calm) return; const c = document.createElement("div"); c.className = "focus-cursor"; c.innerHTML = "<i></i><i></i><i></i><i></i>"; document.body.appendChild(c);
    let x = innerWidth/2, y = innerHeight/2, cx = x, cy = y;
    addEventListener("pointermove", e => { x = e.clientX; y = e.clientY; c.classList.add("vis"); }, {passive:true});
    document.addEventListener("pointerover", e => c.classList.toggle("lock", !!e.target.closest("a,button,[data-lb],input,select,textarea,label")));
    (function f(){ cx += (x-cx)*.22; cy += (y-cy)*.22; c.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(f); })(); };
})();
