/* =========================================================================
   HOME PAGE: renders every section from BZ content + feed
   ========================================================================= */
(() => {
  const { $, $$, CONFIG: C } = BZ, clamp = (v,a=0,b=1) => Math.min(b, Math.max(a, v));
  const PF = BZ.PORTFOLIO;

  /* ---------- static bindings ---------- */
  $("#tagline").textContent = C.tagline;
  $("#yr").textContent = new Date().getFullYear();
  $("#area").textContent = C.serviceArea;
  [$("#igFollow"), $("#fIg")].forEach(a => a.href = C.instagramUrl);
  $("#igHandle").textContent = C.instagram;

  /* ---------- loader → ready ---------- */
  const ready = () => { $("#loader").classList.add("done"); document.body.classList.add("ready"); };
  addEventListener("load", () => setTimeout(ready, BZ.calm ? 0 : 900));
  setTimeout(ready, 3500);

  /* ---------- hero slideshow + viewfinder HUD ---------- */
  const heroSet = PF.filter(p => BZ.ratio(p.ratio) >= 1).slice(0, 5);
  const big = Math.min(2200, Math.max(1400, innerWidth * (devicePixelRatio > 1 ? 1.4 : 1)));
  const heroItem = p => ({...p, ratio: innerWidth/innerHeight > 1 ? "16/9" : "9/16"});
  $("#slides").innerHTML = heroSet.map((p,i) => `<div class="slide${i ? "" : " on"}"><img alt="${p.title}" ${i ? `data-hero="${i}"` : `src="${BZ.img(heroItem(p), big)}"`}></div>`).join("");
  addEventListener("load", () => $$("img[data-hero]").forEach((im, k) => setTimeout(() => { im.src = BZ.img(heroItem(heroSet[+im.dataset.hero]), big); }, 300 + k*250)));
  let si = 0; const slides = $$(".slide");
  const showSlide = n => {
    slides[si].classList.remove("on"); si = (n + slides.length) % slides.length; slides[si].classList.add("on");
    const p = heroSet[si]; $("#frameNo").textContent = `${String(si+1).padStart(2,"0")} / ${String(slides.length).padStart(2,"0")}`;
    $("#hudExif").textContent = p.exif.split(" · ").slice(0,3).join(" · "); $("#hudCat").textContent = p.cat;
    $("#heroCap").innerHTML = `Now showing<b>${p.title}</b>`;
    const af = $("#af"); af.classList.remove("ok"); setTimeout(() => af.classList.add("ok"), 500);
  };
  showSlide(0);
  if (!BZ.calm) setInterval(() => !document.hidden && showSlide(si + 1), 6000);

  /* ---------- ticker ---------- */
  const words = [...BZ.CATEGORIES, "Golden hour", "Elopements", "Natural light"];
  $("#ticker").innerHTML = [...words, ...words].map(w => `<span>${w}</span>`).join("");

  /* ---------- portfolio: filters + masonry + lightbox ---------- */
  const cats = ["All", ...BZ.CATEGORIES.filter(c => PF.some(p => p.cat === c))];
  $("#filters").innerHTML = cats.map(c => `<button class="fbtn" data-c="${c}" aria-pressed="${c === "All"}">${c}<sup>${c === "All" ? PF.length : PF.filter(p => p.cat === c).length}</sup></button>`).join("");
  $("#grid").innerHTML = PF.map((p,i) => `
    <button class="tile rv" data-i="${i}" data-c="${p.cat}" aria-label="Open ${p.title}">
      <img alt="${p.title}" ${BZ.lazy(p, 900)} style="aspect-ratio:${p.ratio}">
      <span class="meta"><span><span class="mono">${p.cat}</span><b>${p.title}</b></span><span class="mono">${p.exif.split(" · ")[0]}</span></span>
    </button>`).join("");
  let visible = PF;
  $("#filters").addEventListener("click", e => {
    const b = e.target.closest(".fbtn"); if (!b) return;
    $$(".fbtn").forEach(x => x.setAttribute("aria-pressed", x === b));
    const c = b.dataset.c, tiles = $$(".tile");
    const apply = () => { tiles.forEach(t => t.classList.toggle("hide", c !== "All" && t.dataset.c !== c)); visible = PF.filter(p => c === "All" || p.cat === c); };
    document.startViewTransition && !BZ.calm ? document.startViewTransition(apply) : apply();
  });
  $("#grid").addEventListener("click", e => { const t = e.target.closest(".tile"); if (!t) return; const p = PF[+t.dataset.i]; BZ.lightbox.open(visible, visible.indexOf(p)); });

  /* ---------- stories: pinned horizontal ---------- */
  $("#stTrack").innerHTML = BZ.STORIES.map((s,i) => `
    <article class="story"><img alt="${s.title}" ${BZ.lazy({id:"st"+i, ...s, ratio:"16/10"}, 1400)}>
      <div class="cap"><div><span class="mono">${s.kicker}</span><h3>${s.title}</h3></div><span class="mono">${s.frames} frames →</span></div></article>`).join("");
  $("#stTot").textContent = String(BZ.STORIES.length).padStart(2,"0");
  const stories = $("#stories"), track = $("#stTrack"), wide = () => innerWidth > 760;
  const sizeStories = () => { stories.style.height = wide() ? `${track.scrollWidth - innerWidth + innerHeight}px` : ""; };
  sizeStories(); addEventListener("resize", sizeStories);

  /* ---------- about image ---------- */
  $("#aboutImg").outerHTML = `<img id="aboutImg" alt="Behind the camera" ${BZ.lazy({id:"about", mood:"mono", subject:"person", ratio:"4/5"}, 1100)}>`;

  /* ---------- services ---------- */
  const types = Object.keys(BZ.PACKAGES);
  const money = n => "$" + n.toLocaleString();
  const renderPkgs = t => {
    $("#svcTabs").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === t));
    $("#pkgs").innerHTML = BZ.PACKAGES[t].map((p,i) => `
      <article class="pkg${p.featured ? " feat" : ""}" style="animation-delay:${i*.08}s">
        ${p.featured ? `<span class="badge">Most booked</span>` : ""}
        <div><span class="mono" style="opacity:.6">${t}</span><h3>${p.name}</h3></div>
        <div class="price">${money(p.price)}<small>${p.hrs}</small></div>
        <ul>${p.items.map(x => `<li>${x}</li>`).join("")}</ul>
        <a class="btn ${p.featured ? "btn-a" : ""}" href="#book" data-pick="${t}|${p.name}">Book ${p.name}</a>
      </article>`).join("");
  };
  $("#svcTabs").innerHTML = types.map(t => `<button data-t="${t}">${t}</button>`).join("") + (C.pricingIsSample ? `<span class="sample-badge">● Sample pricing</span>` : "");
  $("#svcTabs").addEventListener("click", e => { const b = e.target.closest("button[data-t]"); if (b) renderPkgs(b.dataset.t); });
  renderPkgs(types[0]);
  $("#process").innerHTML = BZ.PROCESS.map(s => `<div class="rv"><b>${s.n}</b><h4>${s.t}</h4><p>${s.d}</p></div>`).join("");

  /* ---------- booking wizard ---------- */
  const STEPS = ["Session", "Date", "Collection", "Details", "Review"];
  const st = { step: 0, type: null, date: null, slot: null, pkg: null, view: null };
  const today = new Date(); today.setHours(0,0,0,0);
  const first = new Date(today); first.setDate(first.getDate() + C.booking.leadDays);
  const last = new Date(today); last.setMonth(last.getMonth() + C.booking.monthsAhead);
  st.view = new Date(first.getFullYear(), first.getMonth(), 1);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const nice = d => d.toLocaleDateString(undefined, { weekday:"long", month:"long", day:"numeric", year:"numeric" });

  $("#steps").innerHTML = STEPS.map((s,i) => `<button data-s="${i}" disabled><span>${String(i+1).padStart(2,"0")} · </span>${s}</button>`).join("");
  $("#types").innerHTML = types.map(t => { const p = PF.find(x => x.cat === t) || PF[0];
    return `<button class="type" data-t="${t}" aria-pressed="false"><img alt="" ${BZ.lazy({...p, id:"ty"+t, ratio:"3/4"}, 600)}><span>${t}</span></button>`; }).join("");

  const renderCal = () => {
    const v = st.view, y = v.getFullYear(), m = v.getMonth(), days = new Date(y, m+1, 0).getDate(), lead = new Date(y, m, 1).getDay();
    $("#calMonth").textContent = v.toLocaleDateString(undefined, { month:"long", year:"numeric" });
    $("#calPrev").disabled = v <= new Date(first.getFullYear(), first.getMonth(), 1);
    $("#calNext").disabled = new Date(y, m+1, 1) > last;
    let h = ["S","M","T","W","T","F","S"].map(d => `<span class="dow">${d}</span>`).join("") + "<span></span>".repeat(lead);
    for (let d = 1; d <= days; d++) {
      const dt = new Date(y, m, d), k = iso(dt), wd = dt.getDay();
      const off = dt < first || dt > last || C.booking.blockedWeekdays.includes(wd) || C.booking.blockedDates.includes(k);
      h += `<button data-d="${k}" ${off ? "disabled" : ""} class="${wd === 0 || wd === 6 ? "gh" : ""}" aria-pressed="${st.date && iso(st.date) === k}" aria-label="${nice(dt)}">${d}</button>`;
    }
    $("#cal").innerHTML = h;
    $("#slots").innerHTML = st.date ? C.booking.slots.map(s => `<button data-s="${s}" aria-pressed="${st.slot === s}">${s}</button>`).join("") : "";
  };
  const renderPlist = () => { const list = BZ.PACKAGES[st.type] || [];
    $("#plist").innerHTML = list.map(p => `<button class="popt" data-p="${p.name}" aria-pressed="${st.pkg && st.pkg.name === p.name}"><span class="rad"></span>
      <span><b>${p.name}${p.featured ? ` <span class="mono" style="color:var(--accent);font-size:.6rem;vertical-align:middle">· Most booked</span>` : ""}</b><small>${p.hrs} · ${p.items.slice(0,3).join(" · ")}</small></span><span class="pp">${money(p.price)}</span></button>`).join(""); };
  const val = id => $(id).value.trim();
  const renderSummary = () => {
    const rows = [["Session", st.type || "—"], ["Date", st.date ? st.date.toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"}) : "—"], ["Light", st.slot || "—"], ["Collection", st.pkg ? st.pkg.name : "—"]];
    $("#summary").innerHTML = rows.map(([k,v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("") +
      `<div class="tot"><dt>Estimate</dt><dd>${st.pkg ? money(st.pkg.price) : "—"}</dd></div>` + (C.pricingIsSample ? `<div><dt class="mono" style="font-size:.6rem">Sample pricing shown</dt></div>` : "");
  };
  const canNext = () => [() => !!st.type, () => !!(st.date && st.slot), () => !!st.pkg,
    () => val("#fName") && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val("#fEmail")), () => true][st.step]();
  const go = n => {
    st.step = n;
    $$(".pane").forEach(p => p.classList.toggle("on", +p.dataset.step === n));
    $$("#steps button").forEach((b,i) => { b.classList.toggle("on", i === n); b.classList.toggle("done", i < n); b.disabled = i > n || n === 5; });
    $("#back").style.visibility = n === 0 || n === 5 ? "hidden" : "visible";
    $("#next").textContent = n === 4 ? "Send inquiry" : "Continue";
    $(".wiz-foot").style.display = n === 5 ? "none" : "";
    $("#stepLbl").textContent = `Step ${Math.min(n+1, 5)} of 5`;
    if (n === 1) renderCal(); if (n === 2) renderPlist();
    if (n === 4) $("#review").innerHTML = [["Session", st.type], ["Date", `${nice(st.date)} · ${st.slot}`], ["Collection", `${st.pkg.name} · ${money(st.pkg.price)}${C.pricingIsSample ? " (sample)" : ""}`],
      ["Name", val("#fName")], ["Email", val("#fEmail")], ["Phone", val("#fPhone") || "—"], ["Location", val("#fLoc") || "—"], ["Notes", val("#fNote") || "—"]]
      .map(([k,v]) => `<div><dt>${k}</dt><dd>${String(v).replace(/</g, "&lt;")}</dd></div>`).join("");
    $("#next").disabled = false; renderSummary();
  };
  $("#steps").addEventListener("click", e => { const b = e.target.closest("button"); if (b && !b.disabled) go(+b.dataset.s); });
  $("#types").addEventListener("click", e => { const b = e.target.closest(".type"); if (!b) return; st.type = b.dataset.t; st.pkg = null;
    $$(".type").forEach(x => x.setAttribute("aria-pressed", x === b)); renderSummary(); setTimeout(() => go(1), 280); });
  $("#cal").addEventListener("click", e => { const b = e.target.closest("button[data-d]"); if (!b) return; const [y,m,d] = b.dataset.d.split("-").map(Number); st.date = new Date(y, m-1, d); renderCal(); renderSummary(); });
  $("#slots").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; st.slot = b.dataset.s; renderCal(); renderSummary(); });
  $("#calPrev").onclick = () => { st.view = new Date(st.view.getFullYear(), st.view.getMonth()-1, 1); renderCal(); };
  $("#calNext").onclick = () => { st.view = new Date(st.view.getFullYear(), st.view.getMonth()+1, 1); renderCal(); };
  $("#plist").addEventListener("click", e => { const b = e.target.closest(".popt"); if (!b) return; st.pkg = BZ.PACKAGES[st.type].find(p => p.name === b.dataset.p); renderPlist(); renderSummary(); });
  $("#back").onclick = () => go(Math.max(0, st.step - 1));
  const hint = ["Pick a session type", "Pick a date and a time of day", "Choose a collection", "Add your name and a valid email", ""];
  $("#next").onclick = async () => {
    if (!canNext()) { BZ.toast(hint[st.step]); if (st.step === 3) ["#fName","#fEmail"].forEach(id => $(id).closest(".field").classList.toggle("err", id === "#fName" ? !val(id) : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val(id)))); return; }
    if (st.step < 4) return go(st.step + 1);
    // submit
    const payload = { type: st.type, date: iso(st.date), slot: st.slot, collection: st.pkg.name, estimate: st.pkg.price,
      name: val("#fName"), email: val("#fEmail"), phone: val("#fPhone"), location: val("#fLoc"), notes: val("#fNote"), source: "website" };
    const text = `New session inquiry\n\n${Object.entries(payload).map(([k,v]) => `${k}: ${v || "—"}`).join("\n")}`;
    let via = "sent";
    $("#next").disabled = true; $("#next").textContent = "Sending…";
    try {
      if (C.booking.endpoint) { const r = await fetch(C.booking.endpoint, { method:"POST", headers:{ "Content-Type":"application/json", Accept:"application/json" }, body: JSON.stringify(payload) }); if (!r.ok) throw 0; }
      else if (C.email) { location.href = `mailto:${C.email}?subject=${encodeURIComponent("Session inquiry: " + st.type)}&body=${encodeURIComponent(text)}`; via = "email"; }
      else { try { await navigator.clipboard.writeText(text); } catch (e) {} window.open(C.dmUrl, "_blank", "noopener"); via = "dm"; }
    } catch (e) { BZ.toast("Couldn't send. Please try again or message on Instagram."); $("#next").disabled = false; $("#next").textContent = "Send inquiry"; return; }
    const f = $("#flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
    $("#success").innerHTML = `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="#e4a25b" stroke-width="2"/><path d="M24 41 l11 11 l22 -24" fill="none" stroke="#ece6dc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h3>${via === "dm" ? "Almost there!" : "Inquiry sent."}</h3><p style="color:var(--mute);max-width:42ch;margin:0 auto">${via === "dm" ? "Your details are copied. Paste them into the Instagram message that just opened and hit send." : via === "email" ? "Your email app opened with everything filled in. Just hit send." : "You'll hear back within 48 hours to confirm your date."}</p>`;
    go(5);
  };
  document.addEventListener("click", e => { const a = e.target.closest("[data-pick]"); if (!a) return; const [t, n] = a.dataset.pick.split("|");
    st.type = t; st.pkg = BZ.PACKAGES[t].find(p => p.name === n); $$(".type").forEach(x => x.setAttribute("aria-pressed", x.dataset.t === t)); go(st.date && st.slot ? 3 : 1); });
  go(0);

  /* ---------- instagram feed ---------- */
  const F = BZ.FEED || { items: [] };
  const icon = t => t === "VIDEO" ? `<svg class="ty" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>` : t === "CAROUSEL_ALBUM" ? `<svg class="ty" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 011-1h11"/></svg>` : "";
  $("#ig").innerHTML = F.items.slice(0, 12).map(it => `<a class="ig" href="${it.permalink}" target="_blank" rel="noopener" aria-label="${(it.caption || "Instagram post").replace(/"/g, "")}">
    <img alt="" ${BZ.lazy({ id: it.id, src: it.media_type === "VIDEO" ? it.thumbnail_url : it.media_url, mood: it.mood, subject: it.subject, ratio: "1/1" }, 500)}>${icon(it.media_type)}<span class="cap">${(it.caption || "").slice(0, 90)}</span></a>`).join("");
  $("#igSync").textContent = F.sample ? "Sample feed · connect the account to sync live posts" : `Synced ${new Date(F.syncedAt).toLocaleString()}`;

  /* ---------- faq ---------- */
  $("#faq").innerHTML = BZ.FAQ.map(([q,a]) => `<details class="rv"><summary>${q}<i>+</i></summary><p>${a}</p></details>`).join("");

  /* ---------- nav, menu, scroll engine ---------- */
  const nav = $("#nav"), prog = $("#prog"), cta = $("#stickyCta"), book = $("#book");
  $("#burger").onclick = () => { const o = document.body.classList.toggle("m-open"); $("#burger").setAttribute("aria-expanded", o); $("#mmenu").inert = !o; };
  $$("#mmenu a").forEach(a => a.addEventListener("click", () => { document.body.classList.remove("m-open"); $("#mmenu").inert = true; $("#burger").setAttribute("aria-expanded", false); }));
  let ticking = false;
  const onScroll = () => {
    ticking = false; const y = scrollY;
    nav.classList.toggle("solid", y > 60);
    prog.style.transform = `scaleX(${y / (document.documentElement.scrollHeight - innerHeight)})`;
    const br = book.getBoundingClientRect(); cta.classList.toggle("show", y > innerHeight * .8 && (br.top > innerHeight || br.bottom < 0));
    if (wide()) { const r = stories.getBoundingClientRect(), p = clamp(-r.top / (stories.offsetHeight - innerHeight));
      track.style.transform = `translateX(${-p * (track.scrollWidth - innerWidth)}px)`;
      $("#stNow").textContent = String(Math.min(BZ.STORIES.length, Math.floor(p * BZ.STORIES.length) + 1)).padStart(2, "0"); }
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll(); BZ.reveal(); BZ.cursor(); BZ.hydrate();
})();
