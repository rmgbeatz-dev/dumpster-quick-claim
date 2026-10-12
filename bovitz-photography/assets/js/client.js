/* =========================================================================
   CLIENT GALLERY (proofing): DEMO
   This front end shows the experience only. A real deployment must verify the
   access code server-side and serve images through signed, expiring URLs
   (see ARCHITECTURE.md → Client galleries). Never ship real client codes here.
   ========================================================================= */
(() => {
  const { $, $$, CONFIG: C } = BZ;
  const moods = ["golden","dusk","blue","forest","mono"], subjects = ["couple","couple","person","none","couple","tree"], ratios = ["3/2","2/3","3/2","4/5","3/2","1/1"];
  $("#gateImg").src = BZ.img({ id:"gate", mood:"dusk", subject:"couple", ratio: innerWidth > 860 ? "4/5" : "3/2" }, 1400);

  const open = g => {
    const key = `bz-fav-${g.code}`;
    let favs = new Set(); try { favs = new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch (e) {}
    const save = () => { try { localStorage.setItem(key, JSON.stringify([...favs])); } catch (e) {} };
    const items = Array.from({ length: g.count }, (_, i) => ({ id: `${g.code}-${i+1}`, no: i+1, title: `Frame ${String(i+1).padStart(3,"0")}`,
      mood: i % 4 ? g.mood : moods[i % moods.length], subject: subjects[i % subjects.length], ratio: ratios[i % ratios.length], exif: g.name }));
    $("#gateView").hidden = true; $("#galView").hidden = false; scrollTo(0, 0);
    $("#gHeroImg").src = BZ.img({ id: g.code + "hero", mood: g.mood, subject: g.subject, ratio: innerWidth > 760 ? "16/9" : "4/5" }, 2000);
    $("#gName").innerHTML = g.name.replace(/(\w+)$/, "<em>$1</em>");
    $("#gMeta").textContent = `${g.date} · ${g.count} images · available ${g.expires}`;
    $("#nAll").textContent = g.count;
    $("#gGrid").innerHTML = items.map((it, i) => `<div class="g-item rv" style="--ar:${it.ratio === "2/3" || it.ratio === "4/5" ? "4/5" : "3/2"}" data-i="${i}">
      <img alt="${it.title}" ${BZ.lazy(it, 900)}><button class="heart" data-h="${it.id}" aria-label="Favorite ${it.title}">♡</button><span class="no">${String(it.no).padStart(3,"0")}</span></div>`).join("");
    let onlyFav = false;
    const paint = () => {
      $$(".heart").forEach(h => { const on = favs.has(h.dataset.h); h.classList.toggle("on", on); h.textContent = on ? "♥" : "♡"; h.setAttribute("aria-pressed", on); });
      $("#nFav").textContent = favs.size;
      $$(".g-item").forEach(el => el.classList.toggle("hide", onlyFav && !favs.has(items[+el.dataset.i].id)));
    };
    const toggle = (id, x, y) => { favs.has(id) ? favs.delete(id) : favs.add(id); save(); paint();
      if (favs.has(id) && x != null && !BZ.calm) for (let k = 0; k < 6; k++) { const b = document.createElement("span"); b.className = "burst"; b.textContent = "♥"; document.body.appendChild(b);
        const a = Math.random() * 6.28, d = 30 + Math.random() * 30; b.animate([{ transform: `translate(${x}px,${y}px) scale(.6)`, opacity: 1 }, { transform: `translate(${x + Math.cos(a)*d}px,${y + Math.sin(a)*d - 20}px) scale(1.2)`, opacity: 0 }], { duration: 700, easing: "ease-out" }).onfinish = () => b.remove(); } };
    const shown = () => items.filter(it => !onlyFav || favs.has(it.id));
    $("#gGrid").addEventListener("click", e => {
      const h = e.target.closest(".heart"); if (h) { const r = h.getBoundingClientRect(); toggle(h.dataset.h, r.left + r.width/2, r.top); return; }
      const t = e.target.closest(".g-item"); if (!t) return; const list = shown();
      BZ.lightbox.open(list, list.indexOf(items[+t.dataset.i]), { onFav: it => toggle(it.id), isFav: it => favs.has(it.id), onClose: paint });
    });
    $("#vAll").onclick = () => { onlyFav = false; $("#vAll").setAttribute("aria-pressed", true); $("#vFav").setAttribute("aria-pressed", false); paint(); };
    $("#vFav").onclick = () => { if (!favs.size) return BZ.toast("Tap ♡ on any photo to add it to your favorites"); onlyFav = true; $("#vFav").setAttribute("aria-pressed", true); $("#vAll").setAttribute("aria-pressed", false); paint(); };
    let timer;
    $("#play").onclick = () => { const list = shown(); let i = 0; BZ.lightbox.open(list, 0, { onFav: it => toggle(it.id), isFav: it => favs.has(it.id), onClose: () => { clearInterval(timer); paint(); } });
      clearInterval(timer); timer = setInterval(() => document.querySelector(".lb-next").click(), 3500); };
    $("#dl").onclick = () => BZ.toast("Demo gallery: in production this downloads a signed ZIP of full-resolution files");
    $("#send").onclick = async () => {
      if (!favs.size) return BZ.toast("Favorite a few photos first ♡");
      const nums = items.filter(it => favs.has(it.id)).map(it => String(it.no).padStart(3,"0"));
      const text = `Favorites from "${g.name}" (${nums.length}): ${nums.join(", ")}`;
      try { await navigator.clipboard.writeText(text); } catch (e) {}
      if (C.email) location.href = `mailto:${C.email}?subject=${encodeURIComponent("Gallery favorites: " + g.name)}&body=${encodeURIComponent(text)}`;
      else { BZ.toast("Favorites copied. Paste them in the Instagram message."); window.open(C.dmUrl, "_blank", "noopener"); }
    };
    paint(); BZ.reveal(); BZ.hydrate();
  };

  $("#codeForm").addEventListener("submit", e => {
    e.preventDefault(); const code = $("#code").value.trim().toUpperCase();
    const g = BZ.CLIENT_GALLERIES.find(x => x.code.toUpperCase() === code);
    if (!g) { const f = $("#codeForm"); f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); BZ.toast("That code didn't match. Check your delivery email."); return; }
    try { sessionStorage.setItem("bz-gal", g.code); } catch (e) {}
    open(g);
  });
  try { const s = sessionStorage.getItem("bz-gal"); const g = s && BZ.CLIENT_GALLERIES.find(x => x.code === s); if (g) open(g); } catch (e) {}
  BZ.cursor();
})();
