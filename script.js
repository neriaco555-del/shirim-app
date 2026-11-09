(() => {
  "use strict";

  const doc = document.documentElement;
  const body = document.body;
  const nav = document.getElementById("nav");
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");
  const progressBar = document.getElementById("progressBar");
  const cursorGlow = document.querySelector(".cursor-glow");
  const phoneWrap = document.getElementById("phoneWrap");
  const toast = document.getElementById("toast");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- scroll progress + nav state ---------- */

  let scrollQueued = false;

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      const max = doc.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (progressBar) progressBar.style.width = `${progress * 100}%`;
      if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 24);
      scrollQueued = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */

  function closeMenu() {
    if (!navLinks || !menuBtn) return;
    navLinks.classList.remove("is-open");
    menuBtn.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
  }

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
      const open = navLinks.classList.toggle("is-open");
      menuBtn.classList.toggle("is-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (event) => {
      if (!navLinks.classList.contains("is-open")) return;
      if (navLinks.contains(event.target) || menuBtn.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  /* ---------- reveal on scroll ---------- */

  const revealItems = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* ---------- cursor glow ---------- */

  if (cursorGlow && finePointer && !reduceMotion) {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let active = false;

    window.addEventListener(
      "pointermove",
      (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        if (!active) {
          active = true;
          cursorGlow.style.opacity = "1";
        }
      },
      { passive: true }
    );

    window.addEventListener("pointerleave", () => {
      active = false;
      cursorGlow.style.opacity = "0";
    });

    const render = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      cursorGlow.style.left = `${currentX}px`;
      cursorGlow.style.top = `${currentY}px`;
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }

  /* ---------- hero phone parallax ---------- */

  if (phoneWrap && finePointer && !reduceMotion && window.innerWidth > 900) {
    const visual = phoneWrap.closest(".hero-visual") || phoneWrap;

    visual.addEventListener("pointermove", (event) => {
      const rect = visual.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      phoneWrap.style.setProperty("--ry", `${nx * 14}deg`);
      phoneWrap.style.setProperty("--rx", `${-ny * 10}deg`);
    });

    visual.addEventListener("pointerleave", () => {
      phoneWrap.style.setProperty("--ry", "0deg");
      phoneWrap.style.setProperty("--rx", "0deg");
    });
  }

  /* ---------- card pointer glow ---------- */

  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });
    });
  }

  /* ---------- live download counter ---------- */

  const downloadCounts = document.querySelectorAll("[data-downloads]");
  const repo = "neriaco555-del/shirim-app";

  const formatCount = (value) =>
    new Intl.NumberFormat("he-IL").format(Math.max(0, Math.round(value)));

  function renderDownloads(value) {
    const final = formatCount(value);
    downloadCounts.forEach((el) => {
      el.textContent = final;
    });
  }

  function animateDownloads(value) {
    if (reduceMotion) {
      renderDownloads(value);
      return;
    }

    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = formatCount(value * eased);
      downloadCounts.forEach((el) => {
        el.textContent = current;
      });
      if (progress < 1) requestAnimationFrame(tick);
      else renderDownloads(value);
    };

    requestAnimationFrame(tick);
  }

  async function loadDownloadCount() {
    if (!downloadCounts.length) return;

    const endpoints = [
      {
        url: `https://img.shields.io/github/downloads/${repo}/total.json`,
        pick: (data) => Number(data && data.value),
      },
      {
        url: `https://api.github.com/repos/${repo}/releases`,
        pick: (data) =>
          Array.isArray(data)
            ? data.reduce(
                (total, release) =>
                  total +
                  (release.assets || []).reduce(
                    (sum, asset) => sum + (asset.download_count || 0),
                    0
                  ),
                0
              )
            : NaN,
      },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) continue;
        const value = endpoint.pick(await response.json());
        if (Number.isFinite(value)) {
          animateDownloads(value);
          return;
        }
      } catch (_) {
        /* try the next source */
      }
    }
  }

  loadDownloadCount();

  /* ---------- download toast ---------- */

  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    if (message) toast.lastChild.textContent = ` ${message}`;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3600);
  }

  document.querySelectorAll('a[download][href$=".apk"]').forEach((link) => {
    link.addEventListener("click", () => {
      showToast("ההורדה מתחילה… שיהיה לכם בכיף");
    });
  });

  /* ---------- faq: single open ---------- */

  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ---------- keep menu closed on resize ---------- */

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 900) closeMenu();
    }, 120);
  });

  /* ---------- mark page ready ---------- */

  body.classList.add("is-ready");
})();
