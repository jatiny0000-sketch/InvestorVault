/* ===========================================================
   DataVault — interactions
   =========================================================== */

/* >>> SET THIS after deploying the Google Apps Script (see README) <<< */
const ENDPOINT_URL = ""; // e.g. "https://script.google.com/macros/s/AKfy.../exec"

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---- animated stat counters ---- */
  const counters = document.querySelectorAll(".stat__num");
  const animate = (el) => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || "";
    const dur = 1400;
    const start = performance.now();
    const fmt = (n) => {
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

  /* ---- scroll reveal + counter trigger ---- */
  const revealEls = document.querySelectorAll(
    ".section__head, .card, .step, .trust__copy, .trust__cardstack, .hero__panel, .faq details, .form"
  );
  revealEls.forEach((el) => el.classList.add("reveal"));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          if (e.target.classList.contains("hero__panel")) {
            counters.forEach(animate);
          }
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => io.observe(el));

  // ensure hero counters fire even if panel already visible
  if (counters.length) {
    const panel = document.querySelector(".hero__panel");
    if (panel) io.observe(panel);
  }

  /* ---- catalog card → prefill form category + scroll ---- */
  const categorySelect = document.getElementById("category");
  document.querySelectorAll(".card__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.closest(".card").dataset.cat
        .replace(/&amp;/g, "&");
      if (categorySelect) {
        [...categorySelect.options].forEach((o) => {
          if (o.text.replace(/&amp;/g, "&") === cat) categorySelect.value = o.value;
        });
      }
      document.getElementById("request").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => document.getElementById("name").focus(), 600);
    });
  });

  /* ---- form validation + submit ---- */
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

  // clear invalid state on input
  form.querySelectorAll("input,select,textarea").forEach((el) => {
    el.addEventListener("input", () => {
      const f = el.closest(".field") || el.closest(".consent");
      if (f && f.classList) f.classList.remove("invalid");
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setNote("");

    // honeypot — silent drop for bots
    if (form.company_website.value) return;

    if (!validate()) {
      setNote("Please complete the highlighted fields.", "err");
      return;
    }

    const data = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      occupation: form.occupation.value.trim(),
      category: form.category.value,
      quantity: form.quantity.value.trim(),
      region: form.region.value.trim(),
      budget: form.budget.value.trim(),
      requirement: form.requirement.value.trim(),
      page: location.href,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try {
      if (!ENDPOINT_URL) {
        // Demo mode — no backend wired yet
        await new Promise((r) => setTimeout(r, 900));
        console.log("[DataVault demo] request payload:", data);
        form.reset();
        setNote("Demo mode: request captured locally. Wire ENDPOINT_URL to go live.", "ok");
      } else {
        await fetch(ENDPOINT_URL, {
          method: "POST",
          mode: "no-cors", // Apps Script web app
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(data),
        });
        form.reset();
        setNote("Thank you! Your request is in — we'll reply within one business day.", "ok");
      }
    } catch (err) {
      console.error(err);
      setNote("Something went wrong. Please email kanishkamps11c@gmail.com directly.", "err");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send my request";
    }
  });
});
