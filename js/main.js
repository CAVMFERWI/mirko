/* ==========================================================================
   MIRKO — HEROÍNA COELHO — SCRIPT COMPARTILHADO
   Scroll reveal: IntersectionObserver nativo, sem AOS.js — o navegador já
   resolve o efeito e evitamos uma dependência externa.
   Scroll: um único listener, agrupado em requestAnimationFrame, alimenta
   navbar, barra de progresso da página e trilho da timeline.
   ========================================================================== */

// marca que o JS rodou: o CSS só esconde .reveal quando esta classe existe
document.documentElement.classList.add("js");

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- Navbar: menu mobile ---------------------------------------------------- */
function initMenu() {
  const toggle = $(".navbar__toggle");
  const links = $(".navbar__links");
  if (!toggle || !links) return;

  const setOpen = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => setOpen(!links.classList.contains("is-open")));
  links.addEventListener("click", (e) => e.target.closest("a") && setOpen(false));
  document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
}

/* ---- Scroll: navbar com blur, barra de progresso, trilho da timeline ------------ */
function initScroll() {
  const navbar = $(".navbar");
  const bar = $(".scroll-progress");
  const track = $(".timeline__track");
  const fill = $(".timeline__fill");
  let queued = false;

  const update = () => {
    queued = false;
    const y = window.scrollY;
    navbar?.classList.toggle("scrolled", y > 40);

    if (bar) {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
    if (track && fill) {
      const rect = track.getBoundingClientRect();
      const seen = clamp(innerHeight * 0.55 - rect.top, 0, rect.height);
      fill.style.height = `${(seen / rect.height) * 100}%`;
    }
  };

  const schedule = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };

  update();
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
}

/* ---- Scroll reveal ------------------------------------------------------------ */
function initScrollReveal() {
  const targets = $$(".reveal");
  if (!targets.length) return;

  // depois que a entrada termina, tira a classe: senão a transition do reveal
  // sobrescreve as transitions de hover do mesmo elemento (cards, por ex.)
  const release = (el) => {
    const onEnd = (e) => {
      if (e.propertyName !== "transform") return;
      el.classList.remove("reveal", "is-visible");
      el.removeEventListener("transitionend", onEnd);
    };
    el.addEventListener("transitionend", onEnd);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        release(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ---- Contadores animados ------------------------------------------------------- */
function initCounters() {
  const counters = $$("[data-counter]");
  if (!counters.length) return;

  const animate = (el) => {
    const target = Number(el.dataset.counter);
    const duration = 1600;
    const start = performance.now();

    const tick = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))); // easeOutCubic
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reduceMotion ? (entry.target.textContent = entry.target.dataset.counter) : animate(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

/* ---- Partículas de fundo (faíscas em canvas 2D) ------------------------------------ */
function initParticles() {
  const canvas = $("#particles-canvas");
  if (!canvas || reduceMotion) return;
  const ctx = canvas.getContext("2d");
  let particles = [];
  let rafId = 0;

  const resize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const count = Math.min(70, Math.floor((canvas.width * canvas.height) / 22000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.9 + 0.4,
      speed: Math.random() * 0.4 + 0.08,
      sway: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.5 + 0.15,
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.y -= p.speed;
      p.sway += 0.01;
      p.x += Math.sin(p.sway) * 0.25;
      if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 150, 60, ${p.alpha})`;
      ctx.fill();
    }
    rafId = requestAnimationFrame(draw);
  };

  resize();
  draw();
  addEventListener("resize", resize);
  // aba em segundo plano não precisa gastar CPU
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(rafId);
    if (!document.hidden) draw();
  });
}

/* ---- Tilt 3D em elementos [data-tilt] (só com mouse) ---------------------------------- */
function initTilt() {
  if (reduceMotion || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  $$("[data-tilt]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", `${x * 12}deg`);
      el.style.setProperty("--rx", `${-y * 12}deg`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
    });
  });
}

/* ---- Timeline (treino.html): passo ativo + brasas decorativas -------------------------- */
function initTimeline() {
  const track = $(".timeline__track");
  if (!track) return;

  // o ponto do trilho acende quando o passo cruza o meio da tela
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle("is-active", e.isIntersecting)),
    { rootMargin: "-45% 0px -45% 0px" }
  );
  $$(".step", track).forEach((step) => observer.observe(step));

  if (reduceMotion) return;
  for (let i = 0; i < 18; i++) {
    const ember = document.createElement("span");
    ember.className = "ember";
    ember.setAttribute("aria-hidden", "true");
    ember.style.setProperty("--x", `${Math.random() * 100}%`);
    ember.style.setProperty("--y", `${Math.random() * 95}%`);
    ember.style.setProperty("--s", `${Math.random() * 7 + 3}px`);
    ember.style.setProperty("--t", `${Math.random() * 5 + 5}s`);
    ember.style.setProperty("--dl", `${Math.random() * -8}s`);
    ember.style.setProperty("--dx", `${(Math.random() - 0.5) * 60}px`);
    track.appendChild(ember);
  }
}

/* ---- Lightbox (galeria.html) --------------------------------------------------------------- */
function initLightbox() {
  const items = $$(".gallery-item");
  const box = $(".lightbox");
  if (!items.length || !box) return;

  const img = $(".lightbox__img", box);
  const caption = $(".lightbox__caption", box);
  const count = $(".lightbox__count", box);
  const controls = $$("button", box);
  const slides = items.map((btn) => {
    const i = $("img", btn);
    return { src: i.currentSrc || i.src, alt: i.alt };
  });
  let index = 0;
  let opener = null;

  const render = () => {
    img.src = slides[index].src;
    img.alt = slides[index].alt;
    caption.textContent = slides[index].alt;
    count.textContent = `${index + 1} / ${slides.length}`;
  };
  const open = (i) => {
    opener = document.activeElement;
    index = i;
    render();
    box.classList.add("is-open");
    document.body.style.overflow = "hidden";
    $(".lightbox__close", box).focus();
  };
  const close = () => {
    box.classList.remove("is-open");
    document.body.style.overflow = "";
    opener?.focus();
  };
  const show = (delta) => {
    index = (index + delta + slides.length) % slides.length;
    render();
  };

  items.forEach((btn, i) => btn.addEventListener("click", () => open(i)));
  $(".lightbox__close", box).addEventListener("click", close);
  $(".lightbox__nav--prev", box).addEventListener("click", () => show(-1));
  $(".lightbox__nav--next", box).addEventListener("click", () => show(1));
  box.addEventListener("click", (e) => e.target === box && close());

  document.addEventListener("keydown", (e) => {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(-1);
    if (e.key === "ArrowRight") show(1);
    if (e.key === "Tab") {
      // mantém o foco preso nos 3 botões enquanto aberto
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  let startX = 0;
  box.addEventListener("touchstart", (e) => (startX = e.changedTouches[0].clientX), { passive: true });
  box.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(dx > 0 ? -1 : 1);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initScroll();
  initScrollReveal();
  initCounters();
  initParticles();
  initTilt();
  initTimeline();
  initLightbox();
});
