/* =========================================================
   Spectra landing — calm ambient motion + scroll choreography
   All motion gated behind prefers-reduced-motion.
   ========================================================= */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     CONFIG — edit these when the listing goes live
     --------------------------------------------------------- */
  const CONFIG = {
    // Chrome Web Store listing. Live once the review is approved.
    storeUrl: "https://chromewebstore.google.com/detail/edkadnjfnonjncinjjeohgfloagdlnba",
  };

  // current year in footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------------------------------------------------
     0a. Route every "Add to Chrome" button through one URL
     --------------------------------------------------------- */
  const installLinks = document.querySelectorAll("[data-install]");
  installLinks.forEach((a) => {
    if (CONFIG.storeUrl) {
      a.setAttribute("href", CONFIG.storeUrl);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    }
    // when no store URL yet, keep the in-page anchor (#cta / #top) as-is
  });

  /* ---------------------------------------------------------
     1. Nav background once scrolled off the hero
     --------------------------------------------------------- */
  const nav = document.getElementById("nav");
  const onNav = () => {
    if (!nav) return;
    nav.classList.toggle("is-stuck", window.scrollY > 40);
  };
  onNav();

  /* ---------------------------------------------------------
     2. Depth rail fill = scroll progress through the page
     --------------------------------------------------------- */
  const depthFill = document.getElementById("depthFill");
  const updateDepth = () => {
    if (!depthFill) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    depthFill.style.height = (p * 100).toFixed(2) + "%";
  };

  /* ---------------------------------------------------------
     3. Reveal-on-scroll
     --------------------------------------------------------- */
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------
     4. Lightweight scroll loop (rAF-throttled) — nav + depth
        + subtle parallax on the panel and starfield drift
     --------------------------------------------------------- */
  const panel = document.getElementById("panelMock");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onNav();
      updateDepth();
      if (panel && !reduceMotion) {
        const y = Math.min(60, window.scrollY * 0.06);
        panel.style.transform = `translateY(${y}px)`;
      }
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateDepth, { passive: true });
  updateDepth();

  // Stop here if the visitor prefers reduced motion — no canvas, no spawns.
  if (reduceMotion) return;

  /* ---------------------------------------------------------
     5. Starfield (hero / space) — cheap canvas particle field
     --------------------------------------------------------- */
  const canvas = document.getElementById("starfield");
  const heroSection = document.getElementById("hero");
  if (canvas && heroSection && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    let stars = [];
    let raf = 0;
    let running = true;

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = heroSection.offsetWidth;
      const h = heroSection.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 9000);
      stars = Array.from({ length: Math.min(count, 220) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        base: Math.random() * 0.5 + 0.3,
        tw: Math.random() * 0.02 + 0.004,
        ph: Math.random() * Math.PI * 2,
      }));
    };

    let t = 0;
    const draw = () => {
      if (!running) return;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);
      t += 1;
      for (const s of stars) {
        const a = s.base + Math.sin(t * s.tw + s.ph) * 0.25;
        ctx.globalAlpha = Math.max(0, Math.min(1, a));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    sizeCanvas();
    draw();
    window.addEventListener("resize", sizeCanvas, { passive: true });

    // pause the canvas when the hero is off-screen
    if ("IntersectionObserver" in window) {
      const vis = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            running = e.isIntersecting;
            if (running && !raf) draw();
            if (!running) {
              cancelAnimationFrame(raf);
              raf = 0;
            }
          }
        },
        { threshold: 0 }
      );
      vis.observe(heroSection);
    }

    // occasional shooting star
    const shoot = document.querySelector(".shooting-star");
    if (shoot) {
      const fire = () => {
        shoot.animate(
          [
            { opacity: 0, transform: "translate(0,0) rotate(18deg)" },
            { opacity: 1, offset: 0.1 },
            { opacity: 0, transform: "translate(70vw, 22vh) rotate(18deg)" },
          ],
          { duration: 1100, easing: "ease-out" }
        );
        setTimeout(fire, 7000 + Math.random() * 9000);
      };
      setTimeout(fire, 3500);
    }
  }

  /* ---------------------------------------------------------
     6. Falling leaves (land layer) — spawned only while visible
     --------------------------------------------------------- */
  const leavesBox = document.querySelector(".leaves");
  if (leavesBox) {
    const palette = ["#cda14a", "#b98a3c", "#8aa84e", "#c97b3a", "#9e7b35"];
    let leafTimer = 0;
    let leavesActive = false;

    const spawnLeaf = () => {
      if (!leavesActive) return;
      const leaf = document.createElement("span");
      leaf.className = "leaf";
      const size = 8 + Math.random() * 10;
      leaf.style.width = size + "px";
      leaf.style.height = size + "px";
      leaf.style.left = Math.random() * 100 + "%";
      leaf.style.background = palette[(Math.random() * palette.length) | 0];
      leaf.style.opacity = String(0.55 + Math.random() * 0.35);
      const dur = 6000 + Math.random() * 6000;
      const drift = (Math.random() - 0.5) * 160;
      const spin = (Math.random() - 0.5) * 720;
      const box = leavesBox.getBoundingClientRect();
      leaf.animate(
        [
          { transform: "translate(0,0) rotate(0deg)" },
          { transform: `translate(${drift}px, ${box.height + 40}px) rotate(${spin}deg)` },
        ],
        { duration: dur, easing: "cubic-bezier(0.45,0,0.55,1)" }
      ).onfinish = () => leaf.remove();
      leavesBox.appendChild(leaf);
    };

    const landSection = document.getElementById("how");
    if (landSection && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            leavesActive = e.isIntersecting;
            if (leavesActive && !leafTimer) {
              leafTimer = window.setInterval(spawnLeaf, 900);
            } else if (!leavesActive && leafTimer) {
              clearInterval(leafTimer);
              leafTimer = 0;
            }
          }
        },
        { threshold: 0.05 }
      );
      io.observe(landSection);
    }
  }

  /* ---------------------------------------------------------
     7. Grass sway — gentle, staggered, CSS-driven via WAAPI
     --------------------------------------------------------- */
  document.querySelectorAll(".grass span").forEach((blade, i) => {
    blade.animate(
      [
        { transform: "rotate(-2.5deg)" },
        { transform: "rotate(2.5deg)" },
        { transform: "rotate(-2.5deg)" },
      ],
      { duration: 4200 + (i % 5) * 500, iterations: Infinity, easing: "ease-in-out", delay: i * 160 }
    );
  });

  /* ---------------------------------------------------------
     8. Embers rising from the core — spawned only while visible
     --------------------------------------------------------- */
  const embersBox = document.querySelector(".embers");
  if (embersBox) {
    let emberTimer = 0;
    let active = false;
    const spawnEmber = () => {
      if (!active) return;
      const e = document.createElement("span");
      e.className = "ember";
      e.style.left = Math.random() * 100 + "%";
      const size = 2 + Math.random() * 4;
      e.style.width = size + "px";
      e.style.height = size + "px";
      const rise = 220 + Math.random() * 260;
      const drift = (Math.random() - 0.5) * 90;
      const dur = 3500 + Math.random() * 3500;
      e.animate(
        [
          { transform: "translate(0,0)", opacity: 0 },
          { opacity: 0.9, offset: 0.2 },
          { transform: `translate(${drift}px, ${-rise}px)`, opacity: 0 },
        ],
        { duration: dur, easing: "ease-out" }
      ).onfinish = () => e.remove();
      embersBox.appendChild(e);
    };
    const coreSection = document.getElementById("cta");
    if (coreSection && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            active = e.isIntersecting;
            if (active && !emberTimer) {
              emberTimer = window.setInterval(spawnEmber, 420);
            } else if (!active && emberTimer) {
              clearInterval(emberTimer);
              emberTimer = 0;
            }
          }
        },
        { threshold: 0.05 }
      );
      io.observe(coreSection);
    }
  }
})();
