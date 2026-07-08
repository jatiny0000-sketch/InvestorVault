/* ===========================================================
   InvestorVault — interactions
   =========================================================== */

/* Admin password to manage reviews (click the footer logo). */
const ADMIN_PASSWORD = "Fundo@987654";

/* ---------------------------------------------------------------
   SHARED BACKEND — paste your deployed Google Apps Script "/exec"
   Web app URL here. Once set, every admin change is saved to the
   Google Sheet and goes LIVE for ALL visitors on ALL devices.
   Leave it as "" to keep the old per-device (localStorage) mode.
   --------------------------------------------------------------- */
const CONFIG_ENDPOINT = "https://script.google.com/macros/s/AKfycby9vAtH4Vc1dOKCosRIttuE2RfhR1GEBgx8ksZ-p3Jqyum9GTvUp9UbtdXUycaAlx-7vA/exec";

const REVIEWS_KEY = "iv_reviews";
const THEME_KEY = "iv_theme";
const CONTACT_KEY = "iv_contact";

/* Default contact details — admin can change these from the dashboard. */
const DEFAULT_CONTACT = { whatsapp: "918527738977", email: "hello@investorvault.in" };

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  /* Set true after a correct admin password — only then do theme
     swatch clicks publish to everyone (visitors stay local-only). */
  let isAdmin = false;

  /* =========================================================
     CONTACT SETTINGS (WhatsApp + email) — editable in admin
     ========================================================= */
  const loadContact = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(CONTACT_KEY) || "{}");
      return { ...DEFAULT_CONTACT, ...saved };
    } catch (e) {
      return { ...DEFAULT_CONTACT };
    }
  };
  let contact = loadContact();

  const waLink = (text) =>
    "https://wa.me/" + contact.whatsapp + "?text=" + encodeURIComponent(text);
  const phoneDisplay = () => "+" + contact.whatsapp;

  /* One-tap "I'm interested" message used by the hero + nav WhatsApp CTAs. */
  const INTEREST_MSG =
    "Hi InvestorVault, I'm interested in your verified database. " +
    "Please share the available records, a sample and pricing.";
  const openWhatsApp = (text) =>
    window.open(waLink(text || INTEREST_MSG), "_blank", "noopener");

  const applyContact = () => {
    const fab = document.getElementById("waFab");
    if (fab) fab.href = waLink("Hi InvestorVault, I'd like to request a dataset.");
    const mail = document.getElementById("subMailDisplay");
    if (mail) mail.textContent = contact.email;
  };
  applyContact();

  /* =========================================================
     CATALOG CARDS — fully configurable from the admin panel:
     show/hide each card, edit its heading, and choose whether
     it displays a record count or a price. Saved per device.
     ========================================================= */
  const COUNTS_KEY  = "iv_card_counts";   // legacy store: { cat: "160k+ records" }
  const CARDCFG_KEY = "iv_card_config";   // { cat: {visible,title,mode,count,price} }
  const catalogCards = document.querySelectorAll(".catalog .card");
  const cardKey = (card) => card.dataset.cat || "";
  const cardTitleEl = (card) => card.querySelector("h3");
  const cardCountEl = (card) => card.querySelector(".card__count");
  const cardDescEl = (card) => card.querySelector("p");

  const loadCardConfig = () => {
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem(CARDCFG_KEY) || "{}"); }
    catch (e) { cfg = {}; }

    // One-time migration from the older counts-only store.
    let legacy = {};
    try { legacy = JSON.parse(localStorage.getItem(COUNTS_KEY) || "{}"); }
    catch (e) { legacy = {}; }

    catalogCards.forEach((card) => {
      const key = cardKey(card);
      const saved = cfg[key] || {};
      if (saved.count == null && legacy[key] != null) saved.count = legacy[key];
      cfg[key] = Object.assign({
        visible: true,
        title: (cardTitleEl(card) || {}).textContent || key,
        desc: (cardDescEl(card) || {}).textContent || "",
        mode: "count",                                  // "count" | "price"
        count: (cardCountEl(card) || {}).textContent || "",
        price: "",
      }, saved);
    });
    return cfg;
  };
  let cardConfig = loadCardConfig();
  const saveCardConfig = () =>
    localStorage.setItem(CARDCFG_KEY, JSON.stringify(cardConfig));

  const applyCardConfig = (force) => {
    catalogCards.forEach((card) => {
      const cfg = cardConfig[cardKey(card)];
      if (!cfg) return;
      card.classList.toggle("is-off", cfg.visible === false);
      // When toggled on from the admin panel after load, a card may still be
      // at the pre-reveal opacity:0 — force it visible so it doesn't vanish.
      if (force && cfg.visible !== false) card.classList.add("in");
      const titleEl = cardTitleEl(card);
      if (titleEl && cfg.title) titleEl.textContent = cfg.title;
      const descEl = cardDescEl(card);
      if (descEl && cfg.desc != null && cfg.desc !== "") descEl.textContent = cfg.desc;
      const countEl = cardCountEl(card);
      if (countEl) {
        const val = cfg.mode === "price" ? cfg.price : cfg.count;
        if (val != null && val !== "") countEl.textContent = val;
        countEl.classList.toggle("card__count--price", cfg.mode === "price");
      }
    });
  };
  applyCardConfig();

  /* =========================================================
     THEME TOGGLE (cycles through palettes)
     ========================================================= */
  const themeSwatches = document.querySelectorAll(".theme-pick");
  const applyTheme = (id) => {
    if (id) document.documentElement.setAttribute("data-theme", id);
    else document.documentElement.removeAttribute("data-theme");
    themeSwatches.forEach((b) =>
      b.classList.toggle("is-active", (b.dataset.theme || "") === id)
    );
  };
  applyTheme(localStorage.getItem(THEME_KEY) || "");
  themeSwatches.forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.theme || "";
      applyTheme(id);
      localStorage.setItem(THEME_KEY, id);
      // Only an admin changes the theme for everyone; visitors stay local.
      if (isAdmin) markDirty();
    });
  });

  /* =========================================================
     ANIMATED STAT COUNTERS
     ========================================================= */
  const counters = document.querySelectorAll(".stat__num[data-count]");
  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const dur = 1400;
    const start = performance.now();
    const fmt = (n) => {
      if (decimals > 0) return n.toFixed(decimals);
      if (target >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
      if (target >= 1000) return Math.round(n / 1000) + "k";
      return Math.round(n).toString();
    };
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased) + (p === 1 ? suffix : "");
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* =========================================================
     SCROLL REVEAL + COUNTER TRIGGER
     ========================================================= */
  const revealEls = document.querySelectorAll(
    ".section__head, .step, .trust__copy, .trust__cardstack, .hero__panel, .faq details, .reviews"
  );
  revealEls.forEach((el) => el.classList.add("reveal"));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          if (e.target.classList.contains("hero__panel")) counters.forEach(animate);
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => io.observe(el));
  if (counters.length) {
    const panel = document.querySelector(".hero__panel");
    if (panel) io.observe(panel);
  }

  /* =========================================================
     CATALOG CARD → WHATSAPP (or request popup for "custom")
     A normal card opens WhatsApp with a ready-made message
     ("I want HNI data"). Only the "Something else?" card opens
     the full request form, since it needs a custom brief.
     ========================================================= */
  const categorySelect = document.getElementById("category");
  document.querySelectorAll(".card__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".card");
      const cat = card.dataset.cat.replace(/&amp;/g, "&");

      if (card.classList.contains("card--ask")) {
        openRequest(cat);
        return;
      }

      const name = (cardTitleEl(card) || {}).textContent.trim() || cat;
      const msg = "Hi InvestorVault, I want the " + name +
        " database. Please share the available records, sample and pricing.";
      window.open(waLink(msg), "_blank", "noopener");
    });
  });

  /* =========================================================
     CATALOG — horizontal scroller (arrows + drag-to-scroll)
     ========================================================= */
  const catalogTrack = document.getElementById("catalogTrack");
  const catalogScroll = document.querySelector(".catalog-scroll");
  if (catalogTrack) {
    const stepBy = () => {
      const card = catalogTrack.querySelector(".card:not(.is-off)");
      const gap = parseFloat(getComputedStyle(catalogTrack).columnGap || "16") || 16;
      return card ? card.getBoundingClientRect().width + gap : 320;
    };

    const arrows = document.querySelectorAll(".catalog__arrow");
    const syncArrows = () => {
      const max = catalogTrack.scrollWidth - catalogTrack.clientWidth - 2;
      const atStart = catalogTrack.scrollLeft <= 2;
      const atEnd = catalogTrack.scrollLeft >= max;
      const scrollable = catalogTrack.scrollWidth > catalogTrack.clientWidth + 4;
      arrows.forEach((a) => {
        a.hidden = !scrollable;
        const dir = a.dataset.dir;
        a.disabled = (dir === "prev" && atStart) || (dir === "next" && atEnd);
      });
      if (catalogScroll) catalogScroll.classList.toggle("has-more", scrollable && !atEnd);
    };

    arrows.forEach((a) =>
      a.addEventListener("click", () => {
        catalogTrack.scrollBy({ left: (a.dataset.dir === "next" ? 1 : -1) * stepBy(), behavior: "smooth" });
      })
    );
    catalogTrack.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows);

    /* drag / swipe to scroll */
    let down = false, startX = 0, startLeft = 0, moved = false;
    catalogTrack.addEventListener("pointerdown", (e) => {
      down = true; moved = false;
      startX = e.clientX; startLeft = catalogTrack.scrollLeft;
      catalogTrack.classList.add("is-grabbing");
    });
    catalogTrack.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      catalogTrack.scrollLeft = startLeft - dx;
    });
    const endDrag = () => { down = false; catalogTrack.classList.remove("is-grabbing"); };
    catalogTrack.addEventListener("pointerup", endDrag);
    catalogTrack.addEventListener("pointerleave", endDrag);
    /* swallow the click that ends a drag so it doesn't fire a card button */
    catalogTrack.addEventListener("click", (e) => {
      if (moved) { e.stopPropagation(); e.preventDefault(); }
    }, true);

    syncArrows();
    setTimeout(syncArrows, 400); // after reveal/layout settles

    /* staggered entrance for the visible cards (independent of horizontal
       position, so peeking / off-screen cards still animate in cleanly) */
    const catIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        catalogTrack.querySelectorAll(".card:not(.is-off)").forEach((c, i) =>
          c.style.setProperty("--i", i)
        );
        catalogTrack.classList.add("is-in");
        catIO.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    catIO.observe(catalogTrack);
  }

  /* =========================================================
     REQUEST FORM → WHATSAPP
     ========================================================= */
  const form = document.getElementById("dataRequestForm");
  const note = document.getElementById("formNote");
  const submitBtn = document.getElementById("submitBtn");

  const setNote = (msg, type) => {
    note.textContent = msg;
    note.className = "form__note" + (type ? " is-" + type : "");
  };

  const validate = () => {
    let ok = true;
    form.querySelectorAll("[required]").forEach((el) => {
      const field = el.closest(".field") || el.closest(".consent");
      const valid = el.type === "checkbox" ? el.checked : el.value.trim() !== "";
      if (field && field.classList) field.classList.toggle("invalid", !valid);
      if (!valid) ok = false;
    });
    const email = form.email.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form.email.closest(".field").classList.add("invalid");
      ok = false;
    }
    return ok;
  };

  form.querySelectorAll("input,select,textarea").forEach((el) => {
    el.addEventListener("input", () => {
      const f = el.closest(".field") || el.closest(".consent");
      if (f && f.classList) f.classList.remove("invalid");
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setNote("");

    // honeypot — silent drop for bots
    if (form.company_website.value) return;

    if (!validate()) {
      setNote("Please complete the highlighted fields.", "err");
      return;
    }

    const v = (n) => form[n].value.trim();
    const lines = [
      "*New data request — InvestorVault*",
      "",
      `*Name:* ${v("name")}`,
      `*WhatsApp:* ${v("phone")}`,
      `*Email:* ${v("email")}`,
      `*Occupation/Company:* ${v("occupation")}`,
      `*Category:* ${form.category.value}`,
      v("quantity") && `*Quantity:* ${v("quantity")}`,
      v("region") && `*Region:* ${v("region")}`,
      v("budget") && `*Budget:* ${v("budget")}`,
      "",
      `*Requirement:*`,
      v("requirement"),
    ].filter(Boolean);

    const url = waLink(lines.join("\n"));

    window.open(url, "_blank", "noopener");
    setNote("Opening WhatsApp… if nothing happens, message us at " + phoneDisplay() + ".", "ok");
    setTimeout(() => { if (requestSheet) closeSheet(requestSheet); }, 1700);
  });

  /* =========================================================
     REVIEWS — storage helpers
     ========================================================= */
  const DEFAULT_REVIEWS = [
    { id: "seed-1", name: "Rohan Mehta", role: "Founder, Bright Realty", rating: 5, approved: true,
      text: "The HNI dataset was clean and the numbers actually connected. Same-day delivery as promised — this is the only data vendor we've kept." },
    { id: "seed-2", name: "Priya Nair", role: "Wealth Manager, Mumbai", rating: 5, approved: true,
      text: "Verified emails and phones, no junk rows. My team's outreach reply rate jumped noticeably. Worth every rupee." },
    { id: "seed-3", name: "Arjun S.", role: "Sales Lead, B2B SaaS", rating: 4, approved: true,
      text: "Great quality and honest about counts before we paid. Custom IT-buyer filters were spot on for our campaign." },
  ];

  const loadReviews = () => {
    try {
      const raw = localStorage.getItem(REVIEWS_KEY);
      if (!raw) {
        localStorage.setItem(REVIEWS_KEY, JSON.stringify(DEFAULT_REVIEWS));
        return [...DEFAULT_REVIEWS];
      }
      return JSON.parse(raw);
    } catch (e) {
      return [...DEFAULT_REVIEWS];
    }
  };
  const saveReviews = (list) => localStorage.setItem(REVIEWS_KEY, JSON.stringify(list));
  let reviews = loadReviews();

  const starString = (n) => {
    let s = "";
    for (let i = 1; i <= 5; i++) s += i <= n ? "★" : "☆";
    return s;
  };
  const starHTML = (n) => {
    let s = "";
    for (let i = 1; i <= 5; i++) s += i <= n ? "★" : '<span class="off">★</span>';
    return s;
  };

  /* =========================================================
     GENERIC CAROUSEL  (used by reviews + screenshots)
     ========================================================= */
  function makeSlider({ track, dots, prev, next, perView, slideSelector, autoMs }) {
    let idx = 0;
    let timer = null;
    const slideCount = () => track.querySelectorAll(slideSelector).length;
    const maxIdx = () => Math.max(0, slideCount() - perView());

    const restart = () => {
      if (!autoMs) return;
      clearInterval(timer);
      timer = setInterval(() => go(idx + 1 > maxIdx() ? 0 : idx + 1), autoMs);
    };

    const paintDots = () =>
      dots.querySelectorAll("button").forEach((d, di) => d.classList.toggle("is-active", di === idx));

    const go = (i) => {
      const max = maxIdx();
      idx = Math.min(Math.max(i, 0), max);
      const step = 100 / perView();
      track.style.transform = `translateX(-${idx * step}%)`;
      paintDots();
      restart();
    };

    const buildDots = () => {
      dots.innerHTML = "";
      const pages = maxIdx() + 1;
      if (slideCount() <= 1) return;
      for (let i = 0; i < pages; i++) {
        const b = document.createElement("button");
        b.type = "button";
        b.addEventListener("click", () => go(i));
        dots.appendChild(b);
      }
    };

    if (prev) prev.addEventListener("click", () => go(idx - 1 < 0 ? maxIdx() : idx - 1));
    if (next) next.addEventListener("click", () => go(idx + 1 > maxIdx() ? 0 : idx + 1));
    window.addEventListener("resize", () => { buildDots(); go(Math.min(idx, maxIdx())); });

    return {
      refresh() { if (idx > maxIdx()) idx = 0; buildDots(); go(idx); },
    };
  }

  /* =========================================================
     REVIEWS SLIDER
     ========================================================= */
  const track = document.getElementById("reviewsTrack");
  const dotsWrap = document.getElementById("reviewsDots");

  const reviewSlider = makeSlider({
    track,
    dots: dotsWrap,
    prev: document.getElementById("revPrev"),
    next: document.getElementById("revNext"),
    perView: () => 1,
    slideSelector: ".review-slide",
    autoMs: 5500,
  });

  const renderSlider = () => {
    const approved = reviews.filter((r) => r.approved);
    track.innerHTML = "";
    if (!approved.length) {
      track.innerHTML =
        '<div class="reviews__empty">No reviews yet — be the first to share your experience.</div>';
      dotsWrap.innerHTML = "";
      return;
    }
    approved.forEach((r) => {
      const slide = document.createElement("div");
      slide.className = "review-slide";
      slide.innerHTML = `
        <div class="review-card">
          <div class="review-card__stars" aria-label="${r.rating} out of 5">${starHTML(r.rating)}</div>
          <p class="review-card__text">${escapeHTML(r.text)}</p>
          <div class="review-card__who">
            <span class="review-card__name">${escapeHTML(r.name)}</span>
            ${r.role ? `<span class="review-card__role">${escapeHTML(r.role)}</span>` : ""}
          </div>
        </div>`;
      track.appendChild(slide);
    });
    reviewSlider.refresh();
  };
  renderSlider();

  /* =========================================================
     WHATSAPP SCREENSHOTS  (storage + slider)
     ========================================================= */
  const SHOTS_KEY = "iv_wa_shots";
  const shotsTrack = document.getElementById("shotsTrack");
  const shotsDots = document.getElementById("shotsDots");

  const shotsPerView = () =>
    window.innerWidth <= 560 ? 1 : window.innerWidth <= 920 ? 2 : 3;

  const shotSlider = makeSlider({
    track: shotsTrack,
    dots: shotsDots,
    prev: document.getElementById("shotPrev"),
    next: document.getElementById("shotNext"),
    perView: shotsPerView,
    slideSelector: ".shot-slide",
    autoMs: 6000,
  });

  const loadShots = () => {
    try { return JSON.parse(localStorage.getItem(SHOTS_KEY) || "[]"); }
    catch (e) { return []; }
  };
  const saveShots = (list) => localStorage.setItem(SHOTS_KEY, JSON.stringify(list));
  let shots = loadShots();

  // also pull any images listed in whatsapp-screenshots/manifest.json (optional)
  let manifestShots = [];
  fetch("whatsapp-screenshots/manifest.json")
    .then((r) => (r.ok ? r.json() : { shots: [] }))
    .then((d) => {
      manifestShots = (d.shots || []).map((s, i) => ({
        id: "m-" + i, src: s.src, caption: s.caption || "", fromFolder: true,
      }));
      renderShots();
    })
    .catch(() => {});

  const allShots = () => [...manifestShots, ...shots];

  const renderShots = () => {
    shotsTrack.innerHTML = "";
    const list = allShots();
    if (!list.length) {
      shotsTrack.innerHTML =
        '<div class="reviews__empty">No screenshots yet — the admin can upload WhatsApp proof from the dashboard.</div>';
      shotsDots.innerHTML = "";
      return;
    }
    list.forEach((s) => {
      const slide = document.createElement("div");
      slide.className = "shot-slide";
      slide.innerHTML = `
        <figure class="shot-card">
          <div class="shot-card__imgwrap"><img src="${s.src}" alt="WhatsApp proof screenshot" loading="lazy" /></div>
          ${s.caption ? `<figcaption class="shot-card__cap">${escapeHTML(s.caption)}</figcaption>` : ""}
        </figure>`;
      shotsTrack.appendChild(slide);
    });
    shotSlider.refresh();
  };
  renderShots();

  /* ---- tabs: reviews / whatsapp proof ---- */
  document.querySelectorAll(".rev-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      document.querySelectorAll(".rev-tab").forEach((t) => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll(".rev-panel").forEach((p) =>
        p.classList.toggle("is-hidden", p.dataset.panel !== target)
      );
      if (target === "reviews") reviewSlider.refresh();
      else shotSlider.refresh();
    });
  });

  /* =========================================================
     GENERIC SHEET (modal) OPEN/CLOSE
     ========================================================= */
  const openSheet = (el) => {
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };
  const closeSheet = (el) => {
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  document.querySelectorAll(".sheet").forEach((sheet) => {
    sheet.querySelectorAll("[data-close]").forEach((b) =>
      b.addEventListener("click", () => closeSheet(sheet))
    );
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      document.querySelectorAll(".sheet.is-open").forEach(closeSheet);
  });

  /* =========================================================
     REQUEST DATA POPUP — open (+ optional prefilled category)
     ========================================================= */
  const requestSheet = document.getElementById("requestSheet");
  function openRequest(cat) {
    if (cat && categorySelect) {
      [...categorySelect.options].forEach((o) => {
        if (o.text.replace(/&amp;/g, "&") === cat) categorySelect.value = o.value;
      });
    }
    if (note) { note.textContent = ""; note.className = "form__note"; }
    openSheet(requestSheet);
    setTimeout(() => { const n = document.getElementById("name"); if (n) n.focus(); }, 360);
  }
  /* Hero + nav WhatsApp CTAs: one click straight to WhatsApp with a
     ready-made "I'm interested" message (no form in the way). The full
     request form is still reachable from the "Something else?" card. */
  ["heroRequestBtn", "navRequestBtn"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", () => openWhatsApp(INTEREST_MSG));
  });

  /* =========================================================
     REVIEW FEEDBACK SHEET
     ========================================================= */
  const reviewSheet = document.getElementById("reviewSheet");
  const reviewForm = document.getElementById("reviewForm");
  const reviewNote = document.getElementById("reviewNote");
  const ratingInput = document.getElementById("rvRating");
  const starBtns = document.querySelectorAll("#starInput .star");

  const paintStars = (val) =>
    starBtns.forEach((b) => b.classList.toggle("is-on", +b.dataset.val <= val));

  starBtns.forEach((b) => {
    b.addEventListener("mouseenter", () => paintStars(+b.dataset.val));
    b.addEventListener("click", () => {
      ratingInput.value = b.dataset.val;
      paintStars(+b.dataset.val);
    });
  });
  document.getElementById("starInput").addEventListener("mouseleave", () =>
    paintStars(+ratingInput.value)
  );

  const openReview = () => {
    reviewForm.reset();
    ratingInput.value = "0";
    paintStars(0);
    reviewNote.textContent = "";
    reviewNote.className = "form__note";
    openSheet(reviewSheet);
  };
  document.getElementById("reviewsBtn").addEventListener("click", openReview);
  document.getElementById("leaveReviewBtn").addEventListener("click", openReview);

  reviewForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("rvName");
    const text = document.getElementById("rvText");
    const rating = +ratingInput.value;
    let ok = true;
    [name, text].forEach((el) => {
      const f = el.closest(".field");
      const valid = el.value.trim() !== "";
      f.classList.toggle("invalid", !valid);
      if (!valid) ok = false;
    });
    if (!rating) ok = false;

    if (!ok) {
      reviewNote.textContent = rating ? "Please fill the highlighted fields." : "Please pick a star rating.";
      reviewNote.className = "form__note is-err";
      return;
    }

    const newReview = {
      id: "r-" + Date.now(),
      name: name.value.trim(),
      role: document.getElementById("rvRole").value.trim(),
      rating,
      text: text.value.trim(),
      approved: false, // awaits admin approval
    };
    reviews.push(newReview);
    saveReviews(reviews);
    // Send to the shared backend so the admin sees it on any device.
    submitReviewRemote(newReview);

    reviewNote.textContent = "Thank you! Your review was submitted and will appear after a quick check.";
    reviewNote.className = "form__note is-ok";
    setTimeout(() => closeSheet(reviewSheet), 1800);
  });

  /* =========================================================
     ADMIN — login + manage reviews
     ========================================================= */
  const adminSheet = document.getElementById("adminSheet");
  const adminList = document.getElementById("adminList");

  const openAdmin = (e) => {
    if (e) e.preventDefault();
    const pw = window.prompt("Admin access — enter password:");
    if (pw === null) return; // cancelled
    if (pw !== ADMIN_PASSWORD) {
      alert("Incorrect password.");
      return;
    }
    isAdmin = true;
    // Pull the latest shared settings first, so the admin edits the
    // current live data (incl. any reviews visitors just submitted).
    fetchRemoteConfig();
    renderAdmin();
    renderAdminShots();
    renderAdminCounts();
    openSheet(adminSheet);
    dirty = false;
    setPublish(
      CONFIG_ENDPOINT ? "clean" : "warn",
      CONFIG_ENDPOINT
        ? "All changes published."
        : "Backend not connected — changes stay on this device only."
    );
  };

  // Footer logo is the admin entry point
  const footerBrand = document.getElementById("footerBrand");
  if (footerBrand) footerBrand.addEventListener("click", openAdmin);

  const renderAdmin = () => {
    adminList.innerHTML = "";
    if (!reviews.length) {
      adminList.innerHTML = '<p class="sheet__sub">No reviews yet.</p>';
      return;
    }
    // newest first
    [...reviews].reverse().forEach((r) => {
      const item = document.createElement("div");
      item.className = "admin-item" + (r.approved ? "" : " is-hidden");
      item.innerHTML = `
        <div class="admin-item__body">
          <div class="admin-item__top">
            <span class="admin-item__name">${escapeHTML(r.name)}</span>
            <span class="admin-item__stars">${starString(r.rating)}</span>
          </div>
          ${r.role ? `<div class="admin-item__role">${escapeHTML(r.role)}</div>` : ""}
          <div class="admin-item__text">${escapeHTML(r.text)}</div>
        </div>
        <div class="admin-item__actions">
          <label class="admin-toggle">
            <input type="checkbox" data-act="toggle" ${r.approved ? "checked" : ""} />
            In slider
          </label>
          <button class="admin-del" type="button" data-act="del">Delete</button>
        </div>`;
      item.querySelector('[data-act="toggle"]').addEventListener("change", (ev) => {
        r.approved = ev.target.checked;
        saveReviews(reviews);
        markDirty();
        item.classList.toggle("is-hidden", !r.approved);
        renderSlider();
      });
      item.querySelector('[data-act="del"]').addEventListener("click", () => {
        reviews = reviews.filter((x) => x.id !== r.id);
        saveReviews(reviews);
        markDirty();
        renderAdmin();
        renderSlider();
      });
      adminList.appendChild(item);
    });
  };

  document.getElementById("adminAddForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("adName");
    const text = document.getElementById("adText");
    if (!name.value.trim() || !text.value.trim()) return;
    reviews.push({
      id: "r-" + Date.now(),
      name: name.value.trim(),
      role: document.getElementById("adRole").value.trim(),
      rating: +document.getElementById("adRating").value,
      text: text.value.trim(),
      approved: true, // admin-added shows immediately
    });
    saveReviews(reviews);
    markDirty();
    e.target.reset();
    renderAdmin();
    renderSlider();
  });

  /* =========================================================
     ADMIN — contact details (WhatsApp number + email)
     ========================================================= */
  const contactForm = document.getElementById("contactForm");
  const ctWhatsapp = document.getElementById("ctWhatsapp");
  const ctEmail = document.getElementById("ctEmail");
  const contactNote = document.getElementById("contactNote");

  const fillContactInputs = () => {
    if (ctWhatsapp) ctWhatsapp.value = contact.whatsapp;
    if (ctEmail) ctEmail.value = contact.email;
  };
  fillContactInputs();

  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const wa = (ctWhatsapp.value || "").replace(/\D/g, "");
      const em = (ctEmail.value || "").trim();

      if (wa.length < 8) {
        contactNote.textContent = "Enter a valid WhatsApp number with country code (digits only).";
        contactNote.className = "form__note is-err";
        return;
      }
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        contactNote.textContent = "Enter a valid email address.";
        contactNote.className = "form__note is-err";
        return;
      }

      contact = { whatsapp: wa, email: em || DEFAULT_CONTACT.email };
      localStorage.setItem(CONTACT_KEY, JSON.stringify(contact));
      applyContact();
      fillContactInputs();
      markDirty();

      contactNote.textContent = "Applied — click “Save changes” at the bottom to publish to everyone.";
      contactNote.className = "form__note is-ok";
    });
  }

  /* =========================================================
     ADMIN — catalog cards (show/hide, heading, count vs price)
     ========================================================= */
  const adminCounts = document.getElementById("adminCounts");

  const renderAdminCounts = () => {
    if (!adminCounts) return;
    adminCounts.innerHTML = "";
    catalogCards.forEach((card) => {
      const key = cardKey(card);
      const cfg = cardConfig[key];
      if (!cfg) return;

      const row = document.createElement("div");
      row.className = "admin-card" + (cfg.visible === false ? " is-off" : "");
      row.innerHTML = `
        <div class="admin-card__head">
          <label class="admin-toggle">
            <input type="checkbox" data-f="visible" ${cfg.visible === false ? "" : "checked"} />
            Show card
          </label>
          <span class="admin-card__key">${escapeHTML(key.replace(/&amp;/g, "&"))}</span>
        </div>
        <label class="admin-card__field">
          <span>Heading</span>
          <input type="text" data-f="title" value="${escapeHTML(cfg.title || "")}" placeholder="Card title" />
        </label>
        <label class="admin-card__field">
          <span>Description <small>(the text shown on the card)</small></span>
          <textarea data-f="desc" rows="2" placeholder="Short description of this database">${escapeHTML(cfg.desc || "")}</textarea>
        </label>
        <label class="admin-card__field">
          <span>Show on card</span>
          <select data-f="mode">
            <option value="count">Number of records</option>
            <option value="price">Price</option>
          </select>
        </label>
        <label class="admin-card__field" data-field="count">
          <span>Record count</span>
          <input type="text" data-f="count" value="${escapeHTML(cfg.count || "")}" placeholder="e.g. 160k+ records" />
        </label>
        <label class="admin-card__field" data-field="price">
          <span>Price</span>
          <input type="text" data-f="price" value="${escapeHTML(cfg.price || "")}" placeholder="e.g. From ₹4,999" />
        </label>`;

      const modeSel = row.querySelector('[data-f="mode"]');
      modeSel.value = cfg.mode === "price" ? "price" : "count";
      const countField = row.querySelector('[data-field="count"]');
      const priceField = row.querySelector('[data-field="price"]');
      const syncMode = () => {
        const isPrice = modeSel.value === "price";
        countField.hidden = isPrice;
        priceField.hidden = !isPrice;
      };
      syncMode();

      const commit = (changedMode) => {
        cfg.visible = row.querySelector('[data-f="visible"]').checked;
        cfg.title   = row.querySelector('[data-f="title"]').value;
        cfg.desc    = row.querySelector('[data-f="desc"]').value;
        cfg.mode    = modeSel.value;
        cfg.count   = row.querySelector('[data-f="count"]').value;
        cfg.price   = row.querySelector('[data-f="price"]').value;
        row.classList.toggle("is-off", !cfg.visible);
        saveCardConfig();
        markDirty();
        applyCardConfig(true);
        if (changedMode) syncMode();
      };

      row.querySelectorAll("input, select, textarea").forEach((el) => {
        const evt = (el.tagName === "SELECT" || el.type === "checkbox") ? "change" : "input";
        el.addEventListener(evt, () => commit(el === modeSel));
      });

      adminCounts.appendChild(row);
    });
  };

  /* =========================================================
     ADMIN — WhatsApp screenshot uploads
     ========================================================= */
  const adminShotsWrap = document.getElementById("adminShots");
  const shotUpload = document.getElementById("shotUpload");

  const renderAdminShots = () => {
    adminShotsWrap.innerHTML = "";
    if (!shots.length && !manifestShots.length) {
      adminShotsWrap.innerHTML =
        '<p class="admin-shots__empty">No screenshots uploaded yet.</p>';
      return;
    }
    // folder images (read-only, can't delete from here)
    manifestShots.forEach((s) => {
      const cell = document.createElement("div");
      cell.className = "admin-shot";
      cell.innerHTML = `<img src="${s.src}" alt="folder screenshot" /><span class="admin-shot__del" title="From folder — edit manifest.json to remove" style="cursor:default;background:rgba(0,0,0,.45)">📁</span>`;
      adminShotsWrap.appendChild(cell);
    });
    // uploaded images (deletable)
    [...shots].reverse().forEach((s) => {
      const cell = document.createElement("div");
      cell.className = "admin-shot";
      cell.innerHTML = `<img src="${s.src}" alt="uploaded screenshot" />
        <button class="admin-shot__del" type="button" title="Delete">×</button>`;
      cell.querySelector("button").addEventListener("click", () => {
        shots = shots.filter((x) => x.id !== s.id);
        saveShots(shots);
        markDirty();
        renderAdminShots();
        renderShots();
      });
      adminShotsWrap.appendChild(cell);
    });
  };

  // read + downscale to keep localStorage small (WhatsApp screenshots are big)
  const readFile = (file) =>
    new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX = 820; // max longest edge
          let { width, height } = img;
          const scale = Math.min(1, MAX / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          const cv = document.createElement("canvas");
          cv.width = width;
          cv.height = height;
          cv.getContext("2d").drawImage(img, 0, 0, width, height);
          try {
            resolve(cv.toDataURL("image/jpeg", 0.78));
          } catch (e) {
            resolve(fr.result); // fallback to original
          }
        };
        img.onerror = () => resolve(fr.result);
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });

  if (shotUpload) {
    shotUpload.addEventListener("change", async (e) => {
      const files = [...e.target.files].filter((f) => f.type.startsWith("image/"));
      for (const file of files) {
        const src = await readFile(file);
        shots.push({ id: "s-" + Date.now() + "-" + Math.round(performance.now()), src, caption: "" });
      }
      try {
        saveShots(shots);
      } catch (err) {
        alert("Couldn't save — the browser storage may be full. Try fewer or smaller images.");
      }
      markDirty();
      e.target.value = "";
      renderAdminShots();
      renderShots();
    });
  }

  /* =========================================================
     OFFER BANNER + LIVE COUNTDOWN — editable in admin
     ========================================================= */
  const OFFER_KEY = "iv_offer";
  const DEFAULT_OFFER = { enabled: false, title: "", subtitle: "", expiry: "", image: "" };

  const loadOffer = () => {
    try { return { ...DEFAULT_OFFER, ...JSON.parse(localStorage.getItem(OFFER_KEY) || "{}") }; }
    catch (e) { return { ...DEFAULT_OFFER }; }
  };
  let offer = loadOffer();

  const offerBanner = document.getElementById("offerBanner");
  const offerImg = document.getElementById("offerImg");
  const offerTitleEl = document.getElementById("offerTitle");
  const offerSubEl = document.getElementById("offerSub");
  const offerCountdown = document.getElementById("offerCountdown");
  const offerDaysGroup = offerCountdown && offerCountdown.querySelector('[data-group="days"]');
  const offerUnitEls = {
    days: offerCountdown && offerCountdown.querySelector('[data-unit="days"]'),
    hours: offerCountdown && offerCountdown.querySelector('[data-unit="hours"]'),
    mins: offerCountdown && offerCountdown.querySelector('[data-unit="mins"]'),
    secs: offerCountdown && offerCountdown.querySelector('[data-unit="secs"]'),
  };
  let offerTimer = null;

  const pad2 = (n) => String(n).padStart(2, "0");

  const setUnit = (el, val) => {
    if (!el) return;
    const next = pad2(val);
    if (el.textContent === next) return;
    el.textContent = next;
    el.classList.remove("is-tick");
    void el.offsetWidth; // restart the tick animation
    el.classList.add("is-tick");
  };

  const stopOfferTimer = () => { if (offerTimer) { clearInterval(offerTimer); offerTimer = null; } };

  const hideOfferBanner = () => {
    stopOfferTimer();
    if (offerBanner) offerBanner.hidden = true;
  };

  const tickOffer = () => {
    if (!offerBanner || !offer.expiry) return hideOfferBanner();
    const end = new Date(offer.expiry).getTime();
    if (isNaN(end)) return hideOfferBanner();
    let diff = Math.floor((end - Date.now()) / 1000);
    if (diff <= 0) return hideOfferBanner(); // offer has expired
    const days = Math.floor(diff / 86400); diff -= days * 86400;
    const hours = Math.floor(diff / 3600); diff -= hours * 3600;
    const mins = Math.floor(diff / 60);
    const secs = diff - mins * 60;
    if (offerDaysGroup) offerDaysGroup.hidden = days <= 0;
    setUnit(offerUnitEls.days, days);
    setUnit(offerUnitEls.hours, hours);
    setUnit(offerUnitEls.mins, mins);
    setUnit(offerUnitEls.secs, secs);
  };

  const applyOffer = () => {
    if (!offerBanner) return;
    stopOfferTimer();
    const end = offer.expiry ? new Date(offer.expiry).getTime() : NaN;
    const live = offer.enabled && !isNaN(end) && end > Date.now();
    if (!live) { offerBanner.hidden = true; return; }

    if (offer.image) { offerImg.src = offer.image; offerImg.style.display = ""; }
    else { offerImg.removeAttribute("src"); offerImg.style.display = "none"; }

    offerTitleEl.textContent = offer.title || "Limited-time offer";
    if (offer.subtitle) { offerSubEl.textContent = offer.subtitle; offerSubEl.style.display = ""; }
    else { offerSubEl.textContent = ""; offerSubEl.style.display = "none"; }

    offerBanner.hidden = false;
    tickOffer();
    offerTimer = setInterval(tickOffer, 1000);
  };
  applyOffer();

  /* ---- admin: offer banner form ---- */
  const offerForm = document.getElementById("offerForm");
  const ofEnabled = document.getElementById("ofEnabled");
  const ofTitle = document.getElementById("ofTitle");
  const ofSub = document.getElementById("ofSub");
  const ofExpiry = document.getElementById("ofExpiry");
  const ofImage = document.getElementById("ofImage");
  const ofPreview = document.getElementById("ofPreview");
  const ofPreviewImg = document.getElementById("ofPreviewImg");
  const ofImageDel = document.getElementById("ofImageDel");
  const offerNote = document.getElementById("offerNote");
  let ofPendingImage = offer.image || "";

  // datetime-local needs a local "YYYY-MM-DDTHH:mm" value; convert from stored ISO
  const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const paintOfferPreview = () => {
    if (!ofPreview) return;
    if (ofPendingImage) { ofPreviewImg.src = ofPendingImage; ofPreview.hidden = false; }
    else { ofPreviewImg.removeAttribute("src"); ofPreview.hidden = true; }
  };

  const fillOfferInputs = () => {
    if (ofEnabled) ofEnabled.checked = !!offer.enabled;
    if (ofTitle) ofTitle.value = offer.title || "";
    if (ofSub) ofSub.value = offer.subtitle || "";
    if (ofExpiry) ofExpiry.value = toLocalInput(offer.expiry);
    ofPendingImage = offer.image || "";
    paintOfferPreview();
  };
  fillOfferInputs();

  if (ofImage) {
    ofImage.addEventListener("change", async (e) => {
      const file = [...e.target.files].find((f) => f.type.startsWith("image/"));
      e.target.value = "";
      if (!file) return;
      ofPendingImage = await readFile(file);
      paintOfferPreview();
    });
  }
  if (ofImageDel) {
    ofImageDel.addEventListener("click", () => { ofPendingImage = ""; paintOfferPreview(); });
  }

  if (offerForm) {
    offerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const expISO = ofExpiry.value ? new Date(ofExpiry.value).toISOString() : "";
      if (ofEnabled.checked) {
        if (!expISO) {
          offerNote.textContent = "Please choose when the offer expires.";
          offerNote.className = "form__note is-err"; return;
        }
        if (new Date(expISO).getTime() <= Date.now()) {
          offerNote.textContent = "The expiry time must be in the future.";
          offerNote.className = "form__note is-err"; return;
        }
      }
      offer = {
        enabled: ofEnabled.checked,
        title: ofTitle.value.trim(),
        subtitle: ofSub.value.trim(),
        expiry: expISO,
        image: ofPendingImage || "",
      };
      try {
        localStorage.setItem(OFFER_KEY, JSON.stringify(offer));
      } catch (err) {
        offerNote.textContent = "Couldn't save — the image may be too large. Try a smaller one.";
        offerNote.className = "form__note is-err"; return;
      }
      markDirty();
      applyOffer();
      offerNote.textContent = offer.enabled
        ? "Applied — click “Save changes” at the bottom to publish to everyone."
        : "Applied — click “Save changes” to publish (banner hidden).";
      offerNote.className = "form__note is-ok";
    });
  }

  /* =========================================================
     SUBSCRIBE FORM → EMAIL (hello@investorvault.in)
     ========================================================= */
  const subForm = document.getElementById("subscribeForm");
  if (subForm) {
    const subNote = document.getElementById("subNote");
    subForm.addEventListener("submit", (e) => {
      e.preventDefault();
      subNote.textContent = "";
      subNote.className = "form__note";

      // honeypot
      if (subForm.sub_company_site.value) return;

      let ok = true;
      subForm.querySelectorAll("[required]").forEach((el) => {
        const valid = el.value.trim() !== "";
        el.closest(".field").classList.toggle("invalid", !valid);
        if (!valid) ok = false;
      });
      const email = subForm.subEmail.value.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        subForm.subEmail.closest(".field").classList.add("invalid");
        ok = false;
      }
      if (!ok) {
        subNote.textContent = "Please complete the highlighted fields.";
        subNote.className = "form__note is-err";
        return;
      }

      const body = [
        "I'd like to subscribe to InvestorVault Weekly.",
        "",
        "Name: " + subForm.subName.value.trim(),
        "Email: " + email,
        "Data category: " + subForm.subCategory.value,
        "Records per week: " + (subForm.subVolume.value.trim() || "—"),
      ].join("\n");

      const mailto =
        "mailto:" + contact.email +
        "?subject=" + encodeURIComponent("InvestorVault Weekly — Subscription request") +
        "&body=" + encodeURIComponent(body);

      window.location.href = mailto;
      subNote.textContent = "Opening your email app… send the message to confirm your subscription.";
      subNote.className = "form__note is-ok";
    });

    subForm.querySelectorAll("input,select").forEach((el) =>
      el.addEventListener("input", () => el.closest(".field").classList.remove("invalid"))
    );
  }

  /* =========================================================
     SHARED CONFIG SYNC  (the part that makes admin changes go
     live for EVERYONE, not just the admin's own browser)
     ---------------------------------------------------------
     - On load we read localStorage instantly (no flicker), then
       fetch the shared config and re-render from it.
     - Admin edits only PREVIEW on this browser and call markDirty().
       Nothing reaches other visitors until the admin clicks the
       "Save changes" button, which runs publishToLive() and writes
       the whole settings blob to the Google Sheet.
     ========================================================= */

  // Collect the current settings into one object to publish.
  const gatherConfig = () => ({
    contact,
    cardConfig,
    theme: localStorage.getItem(THEME_KEY) || "",
    reviews,
    shots,
    offer,
  });

  // Apply a config object fetched from the backend to the live page.
  const hydrateFromRemote = (cfg) => {
    if (!cfg || typeof cfg !== "object") return;

    if (cfg.contact && typeof cfg.contact === "object") {
      contact = { ...DEFAULT_CONTACT, ...cfg.contact };
      localStorage.setItem(CONTACT_KEY, JSON.stringify(contact));
      applyContact();
      fillContactInputs();
    }
    if (cfg.cardConfig && typeof cfg.cardConfig === "object") {
      Object.keys(cfg.cardConfig).forEach((k) => {
        cardConfig[k] = Object.assign({}, cardConfig[k] || {}, cfg.cardConfig[k]);
      });
      saveCardConfig();
      applyCardConfig(true);
      renderAdminCounts();
    }
    if (typeof cfg.theme === "string") {
      localStorage.setItem(THEME_KEY, cfg.theme);
      applyTheme(cfg.theme);
    }
    if (Array.isArray(cfg.reviews)) {
      reviews = cfg.reviews;
      saveReviews(reviews);
      renderSlider();
      renderAdmin();
    }
    if (Array.isArray(cfg.shots)) {
      shots = cfg.shots;
      saveShots(shots);
      renderShots();
      renderAdminShots();
    }
    if (cfg.offer && typeof cfg.offer === "object") {
      offer = { ...DEFAULT_OFFER, ...cfg.offer };
      localStorage.setItem(OFFER_KEY, JSON.stringify(offer));
      fillOfferInputs();
      applyOffer();
    }
  };

  /* ---- the "Save changes" button + unsaved-changes flag ---- */
  let dirty = false;
  const publishBtn = document.getElementById("publishBtn");
  const publishStatus = document.getElementById("publishStatus");

  const setPublish = (state, msg) => {
    if (publishStatus) {
      publishStatus.textContent = msg || "";
      publishStatus.className = "admin-publish__status is-" + state;
    }
    if (publishBtn) publishBtn.disabled = state === "saving";
  };

  // Called by every admin edit — just flags there are unsaved changes.
  const markDirty = () => {
    dirty = true;
    if (!CONFIG_ENDPOINT) {
      setPublish("warn", "Backend not connected — changes stay on this device only.");
      return;
    }
    setPublish("dirty", "Unsaved changes — click “Save changes” to publish to everyone.");
  };

  // The real publish: pushes ALL current settings live for every visitor.
  const publishToLive = () => {
    if (!CONFIG_ENDPOINT) {
      setPublish("warn", "Set CONFIG_ENDPOINT in script.js first, then re-deploy the Apps Script.");
      return;
    }
    setPublish("saving", "Publishing to the live website…");
    fetch(CONFIG_ENDPOINT, {
      method: "POST",
      // text/plain keeps it a "simple" request (no CORS preflight).
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveConfig",
        password: ADMIN_PASSWORD,
        config: gatherConfig(),
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res && res.ok) {
          dirty = false;
          setPublish("ok", "✓ Saved — your changes are now live for everyone.");
        } else {
          setPublish("err", "Couldn't save: " + ((res && res.error) || "unknown error") + ".");
        }
      })
      .catch(() =>
        setPublish("err", "Couldn't reach the server. Check your connection and try again.")
      );
  };

  if (publishBtn) publishBtn.addEventListener("click", publishToLive);

  // Public, append-only: a visitor's pending review.
  const submitReviewRemote = (review) => {
    if (!CONFIG_ENDPOINT) return;
    fetch(CONFIG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "addReview", review }),
    }).catch(() => {});
  };

  // Pull the shared settings and apply them.
  const fetchRemoteConfig = () => {
    if (!CONFIG_ENDPOINT) return;
    fetch(CONFIG_ENDPOINT + "?action=config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.ok && data.config) hydrateFromRemote(data.config);
      })
      .catch(() => {});
  };
  fetchRemoteConfig();

  /* small HTML escaper for user-supplied review text */
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
});

/* ===========================================================
   HERO SPOTLIGHT — a warm light + grid highlight that follows the
   cursor, and drifts on its own when the mouse is idle. Drives the
   --mx/--my CSS variables read by .hero__spot. Pauses off-screen
   / on hidden tab / reduced-motion.
   =========================================================== */
(function heroSpotlight() {
  const hero = document.querySelector(".hero");
  const bg = document.getElementById("heroBg"); // .hero__bg
  if (!hero || !bg) return;

  let w = 0, h = 0;
  const size = () => { const r = bg.getBoundingClientRect(); w = r.width; h = r.height; };
  size();

  const cur = { x: w * 0.7, y: h * 0.28 };
  const tgt = { x: cur.x, y: cur.y };
  const apply = () => {
    bg.style.setProperty("--mx", cur.x + "px");
    bg.style.setProperty("--my", cur.y + "px");
  };
  apply();

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return; // leave the light parked, no animation

  let raf = null, t = Math.random() * 10, usingMouse = false, lastMove = 0;

  const loop = () => {
    t += 0.006;
    // when the cursor is idle (or absent), let the light drift on a slow path
    if (!usingMouse || performance.now() - lastMove > 2600) {
      usingMouse = false;
      tgt.x = w * (0.5 + 0.34 * Math.cos(t));
      tgt.y = h * (0.42 + 0.26 * Math.sin(t * 1.3));
    }
    cur.x += (tgt.x - cur.x) * 0.06;
    cur.y += (tgt.y - cur.y) * 0.06;
    apply();
    raf = requestAnimationFrame(loop);
  };

  const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };

  hero.addEventListener("pointermove", (e) => {
    const r = bg.getBoundingClientRect();
    tgt.x = e.clientX - r.left; tgt.y = e.clientY - r.top;
    usingMouse = true; lastMove = performance.now();
  });
  window.addEventListener("resize", size);
  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
    { threshold: 0 }
  );
  io.observe(hero);
})();

/* ===========================================================
   HERO 3D GEM — a faceted brass crystal (three.js) that slowly
   rotates, floats, and parallaxes toward the cursor, ringed by
   orbiting "data point" dots. Falls back to a CSS gem if three.js
   can't load. Pauses off-screen / on hidden tab / reduced-motion.
   =========================================================== */
(function hero3D() {
  const mount = document.getElementById("hero3d");
  if (!mount) return;
  const THREE = window.THREE;
  if (!THREE) { mount.classList.add("hero__3d--fallback"); return; }

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = mount.clientWidth || 420, h = mount.clientHeight || 400;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 0, 6);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (e) { mount.classList.add("hero__3d--fallback"); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  mount.appendChild(renderer.domElement);

  const color = (name, fb) => {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v ? new THREE.Color(v) : new THREE.Color(fb);
    } catch (e) { return new THREE.Color(fb); }
  };
  const gold = color("--brass", "#b3893f");
  const goldSoft = color("--brass-soft", "#d8b877");

  const group = new THREE.Group();
  scene.add(group);

  // --- data globe: navy sphere + gold grid, glowing location points and
  //     light-arcs connecting them (a live data network) ---
  const RG = 1.85;
  const globe = new THREE.Group();
  globe.rotation.z = 0.38;               // tilt the axis
  group.add(globe);

  // solid inner sphere so back-facing points are hidden → reads as a real globe
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(RG * 0.99, 48, 48),
    new THREE.MeshPhongMaterial({ color: 0x0f1a2e, specular: 0x2b3d5e, shininess: 28, emissive: 0x0a1223, emissiveIntensity: 0.5 })
  ));
  // gold lat/long grid
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(RG * 1.004, 36, 24),
    new THREE.MeshBasicMaterial({ color: goldSoft, wireframe: true, transparent: true, opacity: 0.15 })
  ));

  const onSphere = (lat, lon, r) => new THREE.Vector3(
    r * Math.cos(lat) * Math.cos(lon),
    r * Math.sin(lat),
    r * Math.cos(lat) * Math.sin(lon)
  );

  // glowing location markers
  const markers = [], pts = [];
  const markerGeo = new THREE.SphereGeometry(0.05, 10, 10);
  const markerMat = new THREE.MeshBasicMaterial({ color: gold });
  for (let i = 0; i < 32; i++) {
    const lat = Math.asin(2 * Math.random() - 1);
    const lon = Math.random() * Math.PI * 2;
    const p = onSphere(lat, lon, RG);
    pts.push(p);
    const m = new THREE.Mesh(markerGeo, markerMat);
    m.position.copy(p);
    m.userData.ph = Math.random() * Math.PI * 2;
    globe.add(m);
    markers.push(m);
  }

  // light-arcs between markers, each with a travelling glow bead
  const beads = [];
  const beadMat = new THREE.MeshBasicMaterial({ color: 0xfff2d6 });
  const beadGeo = new THREE.SphereGeometry(0.045, 8, 8);
  for (let i = 0; i < 10; i++) {
    const a = pts[(Math.random() * pts.length) | 0];
    const b = pts[(Math.random() * pts.length) | 0];
    if (a === b) continue;
    const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(RG * (1.26 + Math.random() * 0.2));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    globe.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(44)),
      new THREE.LineBasicMaterial({ color: gold, transparent: true, opacity: 0.32 })
    ));
    const bead = new THREE.Mesh(beadGeo, beadMat);
    globe.add(bead);
    beads.push({ curve, mesh: bead, off: Math.random(), spd: 0.14 + Math.random() * 0.16 });
  }

  const updateGlobe = (dt, tt) => {
    for (const m of markers) m.scale.setScalar(0.85 + (Math.sin(tt * 2 + m.userData.ph) * 0.5 + 0.5) * 0.9);
    for (const b of beads) { b.off = (b.off + dt * b.spd) % 1; b.mesh.position.copy(b.curve.getPoint(b.off)); }
  };

  // lights — warm hemisphere fill + a moving-highlight key + cool rim
  scene.add(new THREE.HemisphereLight(0xfff2d6, 0x2a1c08, 0.6));
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const key = new THREE.DirectionalLight(0xfff4df, 0.85); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.PointLight(goldSoft, 0.95, 30); rim.position.set(-4, -2, 2); scene.add(rim);
  const cool = new THREE.PointLight(0x9db8ff, 0.45, 30); cool.position.set(2, -3, -3); scene.add(cool);

  const mouse = { x: 0, y: 0 };
  mount.addEventListener("pointermove", (e) => {
    const r = mount.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width - 0.5;
    mouse.y = (e.clientY - r.top) / r.height - 0.5;
  });

  const render = () => renderer.render(scene, camera);
  let raf = null, t = 0, last = performance.now();
  const loop = () => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    t += 0.01;
    globe.rotation.y += 0.0038;
    group.rotation.x = Math.sin(t * 0.4) * 0.08;
    group.position.y = Math.sin(t) * 0.1;
    updateGlobe(dt, t);
    camera.position.x += (mouse.x * 0.9 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 0.7 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
    render();
    raf = requestAnimationFrame(loop);
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };

  const resize = () => {
    w = mount.clientWidth || w; h = mount.clientHeight || h;
    if (!w || !h) return;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h); render();
  };
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
    { threshold: 0 }
  );
  io.observe(mount);

  resize();
  if (reduce) { updateGlobe(0, 0.5); render(); } else start();
})();
