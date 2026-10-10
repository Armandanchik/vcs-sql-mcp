/* ------------------------------------------------------------------
   Motion — GSAP 3.13 + ScrollTrigger
   Preloader → hero reveal → scroll choreography → micro-interactions
   ------------------------------------------------------------------ */
gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Split statement into words ---------- */
const statement = document.getElementById("statementText");
if (statement) {
  const words = statement.textContent.trim().split(/\s+/);
  statement.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
}

/* ---------- Intro timeline ---------- */
function heroReveal() {
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

  tl.fromTo("#nav", { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 0)
    .to("#heroTitle .line__inner", { y: 0, duration: 1.4, stagger: 0.09 }, 0.05)
    .to(".hero .reveal-up", { y: 0, opacity: 1, duration: 1.1, stagger: 0.08 }, 0.35)
    .fromTo("#scene", { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 1.8, ease: "power3.out" }, 0);

  return tl;
}

function runLoader() {
  const loader = document.getElementById("loader");
  const count = document.getElementById("loaderCount");
  const bar = document.getElementById("loaderBar");

  if (reduceMotion) {
    loader.remove();
    document.body.classList.remove("is-loading");
    gsap.set("#heroTitle .line__inner", { y: 0 });
    gsap.set(".hero .reveal-up", { y: 0, opacity: 1 });
    gsap.set("#nav", { opacity: 1 });
    return;
  }

  document.body.classList.add("is-loading");
  const state = { n: 0 };
  const tl = gsap.timeline({
    onComplete() {
      loader.remove();
      document.body.classList.remove("is-loading");
      ScrollTrigger.refresh();
    }
  });

  tl.to(state, {
    n: 100, duration: 1.1, ease: "power2.inOut",
    onUpdate() { count.textContent = String(Math.round(state.n)).padStart(2, "0"); }
  }, 0)
    .to(bar, { width: "100%", duration: 1.1, ease: "power2.inOut" }, 0)
    .to(".loader__inner", { y: -24, opacity: 0, duration: 0.5, ease: "power2.in" }, 1.05)
    .to(loader, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, 1.2)
    .add(heroReveal(), 1.45);
}
runLoader();

/* ---------- Hero scroll choreography ---------- */
gsap.to(".hero__content", {
  y: -80, opacity: 0.2, ease: "none",
  scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
});
ScrollTrigger.create({
  trigger: "#hero", start: "top top", end: "bottom top", scrub: true,
  onUpdate(self) {
    if (window.__heroScene) {
      window.__heroScene.scroll.progress = self.progress;
      window.__heroScene.group.position.y = gsap.utils.interpolate(0.4, -1.4, self.progress);
    }
  }
});

/* ---------- Statement: words brighten on scroll ---------- */
gsap.to("#statementText .w", {
  opacity: 1, stagger: 0.04, ease: "none",
  scrollTrigger: { trigger: "#statement", start: "top 75%", end: "bottom 55%", scrub: true }
});

/* ---------- Section heads & list rows ---------- */
gsap.utils.toArray(".section-head, .approach__head").forEach((el) => {
  gsap.from(el.children, {
    y: 30, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.08,
    scrollTrigger: { trigger: el, start: "top 85%" }
  });
});

gsap.utils.toArray(".service").forEach((row, i) => {
  gsap.from(row, {
    y: 36, opacity: 0, duration: 1, ease: "expo.out", delay: (i % 5) * 0.05,
    scrollTrigger: { trigger: row, start: "top 90%" }
  });
});

gsap.utils.toArray(".radar__item").forEach((row) => {
  gsap.from(row.children, {
    y: 24, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.06,
    scrollTrigger: { trigger: row, start: "top 88%" }
  });
  const state = { sx: 0 };
  gsap.to(state, {
    sx: 1, duration: 1.4, ease: "expo.out",
    scrollTrigger: { trigger: row, start: "top 80%" },
    onUpdate() { row.style.setProperty("--sx", state.sx.toFixed(3)); }
  });
});

/* ---------- About ---------- */
gsap.from(".about__body > *", {
  y: 30, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.07,
  scrollTrigger: { trigger: ".about__body", start: "top 80%" }
});
gsap.from(".about__frame", {
  clipPath: "inset(12% 8% 12% 8% round 18px)", scale: 1.06, duration: 1.6, ease: "expo.out",
  scrollTrigger: { trigger: ".about__media", start: "top 80%" }
});

/* Parallax helpers */
gsap.utils.toArray(".parallax").forEach((el) => {
  const speed = parseFloat(el.dataset.speed || "0.1");
  gsap.to(el, {
    yPercent: -speed * 100, ease: "none",
    scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true }
  });
});

/* ---------- Approach: pinned horizontal scroll (desktop) ---------- */
const mm = gsap.matchMedia();
mm.add("(min-width: 861px) and (prefers-reduced-motion: no-preference)", () => {
  const track = document.getElementById("approachTrack");
  const pin = document.querySelector(".approach__pin");
  const bar = document.getElementById("approachBar");

  const getDistance = () => track.scrollWidth - pin.clientWidth + parseFloat(getComputedStyle(pin).paddingLeft) * 2;

  const tween = gsap.to(track, {
    x: () => -getDistance(),
    ease: "none",
    scrollTrigger: {
      trigger: ".approach",
      start: "top top",
      end: () => "+=" + (getDistance() + window.innerHeight * 0.4),
      pin: pin,
      scrub: 0.6,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      onUpdate(self) { bar.style.width = (self.progress * 100).toFixed(2) + "%"; }
    }
  });

  gsap.utils.toArray(".step").forEach((step) => {
    gsap.from(step, {
      y: 60, opacity: 0, duration: 1, ease: "expo.out",
      scrollTrigger: { trigger: step, containerAnimation: tween, start: "left 90%" }
    });
  });

  return () => tween.scrollTrigger && tween.scrollTrigger.kill();
});
mm.add("(max-width: 860px)", () => {
  gsap.utils.toArray(".step").forEach((step) => {
    gsap.from(step, {
      y: 40, opacity: 0, duration: 1, ease: "expo.out",
      scrollTrigger: { trigger: step, start: "top 88%" }
    });
  });
});

/* ---------- Counters ---------- */
gsap.utils.toArray(".count").forEach((el) => {
  const to = parseFloat(el.dataset.count);
  const obj = { v: 0 };
  gsap.to(obj, {
    v: to, duration: 1.8, ease: "expo.out",
    scrollTrigger: { trigger: el, start: "top 85%", once: true },
    onUpdate() { el.textContent = Math.round(obj.v); }
  });
});
gsap.from(".stat", {
  y: 30, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.1,
  scrollTrigger: { trigger: ".numbers", start: "top 80%" }
});

/* ---------- Contact ---------- */
gsap.to("#contactTitle .line__inner", {
  y: 0, duration: 1.4, ease: "expo.out", stagger: 0.1,
  scrollTrigger: { trigger: "#contact", start: "top 70%" }
});
gsap.from(".contact__lead, .contact__actions, .contact__index", {
  y: 24, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.1,
  scrollTrigger: { trigger: "#contact", start: "top 65%" }
});

/* ---------- Nav background on scroll ---------- */
ScrollTrigger.create({
  start: 80,
  onToggle(self) { document.getElementById("nav").classList.toggle("is-scrolled", self.isActive); }
});

/* ---------- Magnetic buttons ---------- */
if (!isTouch && !reduceMotion) {
  document.querySelectorAll(".magnetic").forEach((btn) => {
    const strength = 0.35;
    const xTo = gsap.quickTo(btn, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(btn, "y", { duration: 0.6, ease: "power3.out" });
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    btn.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
  });
}

/* ---------- Custom cursor ---------- */
if (!isTouch) {
  const cursor = document.getElementById("cursor");
  const dot = cursor.querySelector(".cursor__dot");
  const ring = cursor.querySelector(".cursor__ring");
  const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3.out" });
  const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3.out" });
  const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
  const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });

  gsap.set(cursor, { opacity: 0 });
  window.addEventListener("pointermove", (e) => {
    dotX(e.clientX); dotY(e.clientY); ringX(e.clientX); ringY(e.clientY);
    gsap.to(cursor, { opacity: 1, duration: 0.3 });
  }, { passive: true });
  document.addEventListener("pointerleave", () => gsap.to(cursor, { opacity: 0, duration: 0.3 }));

  document.querySelectorAll("[data-cursor]").forEach((el) => {
    const mode = el.dataset.cursor;
    el.addEventListener("pointerenter", () => cursor.classList.add("is-" + mode));
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-" + mode));
  });
}

/* ---------- Smooth anchor scrolling with offset ---------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
});

/* Fonts can load after layout; keep triggers accurate */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
window.addEventListener("load", () => ScrollTrigger.refresh());
