/* Guías para familias: barra de lectura, índice activo, checklist y panel de accesibilidad */
(function(){
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;

  /* ---- barra de lectura + botón flotante ---- */
  const bar = $("#readbar"), fab = $("#fab"), body = $(".art-body");
  function onScroll(){
    if (bar) {
      const el = body || document.body, r = el.getBoundingClientRect();
      const total = r.height - innerHeight * .6, done = Math.min(1, Math.max(0, -r.top / (total || 1)));
      bar.style.transform = `scaleX(${done})`;
    }
    if (fab) fab.classList.toggle("show", scrollY > innerHeight * .6);
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---- índice: abierto en compu, cerrado en celular; marca la sección actual ---- */
  const toc = $(".toc details");
  if (toc && matchMedia("(max-width: 1000px)").matches) toc.open = false;
  const links = $$(".toc a"), heads = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  function markToc(){
    let cur = null;
    for (const h of heads) { if (h.getBoundingClientRect().top < innerHeight * .35) cur = h.id; }
    links.forEach(a => a.classList.toggle("on", a.hash === "#" + cur));
  }
  if (heads.length) { addEventListener("scroll", markToc, { passive: true }); markToc(); }
  links.forEach(a => a.addEventListener("click", () => { if (toc && matchMedia("(max-width: 1000px)").matches) toc.open = false; }));

  /* ---- apariciones al bajar (salvo que la persona haya pedido detener las animaciones) ---- */
  if (!root.classList.contains("a11y-still") && "IntersectionObserver" in window) {
    const els = $$(".resumen, .art-body > h2, ol.steps > li, ul.ticks > li, .callout, blockquote.ley, .ck-item, .art-faq details, .card");
    els.forEach(el => el.classList.add("pre"));
    const io = new IntersectionObserver(es => {
      es.filter(e => e.isIntersecting).forEach((e, i) => {
        const el = e.target; io.unobserve(el);
        el.style.transitionDelay = Math.min(i, 5) * 70 + "ms"; el.classList.add("in");
        setTimeout(() => { el.classList.remove("pre", "in"); el.style.transitionDelay = ""; }, 1200);
      });
    }, { threshold: .08, rootMargin: "0px 0px -6% 0px" });
    els.forEach(el => io.observe(el));
  }

  /* ---- checklist de papeles (se guarda en el dispositivo) ---- */
  $$(".ck").forEach(ck => {
    const key = "ta-ck-" + (ck.dataset.ck || "x"), items = $$(".ck-item", ck), txt = $(".ck-txt", ck), fill = $(".ck-bar i", ck);
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(key) || "[]") || []; } catch (e) {}
    items.forEach((b, i) => { if (saved.includes(i)) b.setAttribute("aria-pressed", "true"); });
    function upd(){
      const on = items.map((b, i) => b.getAttribute("aria-pressed") === "true" ? i : -1).filter(i => i >= 0);
      if (txt) txt.textContent = on.length === items.length ? "¡Tenés todo!" : `${on.length} de ${items.length}`;
      if (fill) fill.style.width = (on.length / items.length * 100) + "%";
      try { localStorage.setItem(key, JSON.stringify(on)); } catch (e) {}
    }
    items.forEach(b => b.addEventListener("click", e => {
      if (e.target.closest("a")) return;  // los links de adentro navegan, no tildan
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); upd();
    }));
    upd();
  });

  /* ---- panel de accesibilidad (mismas preferencias que la página principal) ---- */
  const aBtn = $("#a11yBtn"), aPanel = $("#a11yPanel");
  if (!aBtn || !aPanel) return;
  let pref = {};
  try { pref = JSON.parse(localStorage.getItem("ta-a11y") || "{}") || {}; } catch (e) {}
  const save = () => { try { localStorage.setItem("ta-a11y", JSON.stringify(pref)); } catch (e) {} };
  function readFont(){ if ($("#fontRead")) return; const l = document.createElement("link"); l.id = "fontRead"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap"; document.head.appendChild(l); }
  function sync(){
    $$(".a11y-size button", aPanel).forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.fs === (+pref.fs || 0))));
    $$(".a11y-tg", aPanel).forEach(b => b.setAttribute("aria-pressed", String(!!pref[b.dataset.opt])));
    aBtn.classList.toggle("on", ["fs", "hc", "read", "links", "still"].some(k => pref[k]));
  }
  function open(o){
    aPanel.hidden = !o; aBtn.setAttribute("aria-expanded", String(o));
    if (o) { aPanel.style.top = Math.round($(".top").getBoundingClientRect().bottom + 8) + "px"; sync(); const f = $(".a11y-size button[aria-pressed=true]", aPanel); f && f.focus(); }
  }
  aBtn.addEventListener("click", () => open(aPanel.hidden));
  $("#a11yX").addEventListener("click", () => { open(false); aBtn.focus(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !aPanel.hidden) { open(false); aBtn.focus(); } });
  document.addEventListener("click", e => { if (!aPanel.hidden && !aPanel.contains(e.target) && !aBtn.contains(e.target)) open(false); });
  $$(".a11y-size button", aPanel).forEach(b => b.addEventListener("click", () => {
    const v = +b.dataset.fs;
    if (v) { pref.fs = v; root.setAttribute("data-fs", v); } else { delete pref.fs; root.removeAttribute("data-fs"); }
    save(); sync();
  }));
  $$(".a11y-tg", aPanel).forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.opt;
    if (pref[k]) delete pref[k]; else pref[k] = true;
    root.classList.toggle("a11y-" + k, !!pref[k]);
    if (k === "read" && pref[k]) readFont();
    save(); sync();
  }));
  $("#a11yReset").addEventListener("click", () => {
    const keepStill = pref.still; pref = keepStill ? { still: true } : {};
    ["hc", "read", "links"].forEach(k => root.classList.remove("a11y-" + k)); root.removeAttribute("data-fs");
    save(); sync();
  });
  sync();
})();
