/* ------------------------------------------------------------------
   Hero scene — a quiet geodesic lattice, two orbit rings and a
   dust field. Built with Three.js r170. Driven by GSAP ScrollTrigger
   for scroll parallax (see main.js) via window.__heroScene.
   ------------------------------------------------------------------ */
import * as THREE from "three";

const container = document.getElementById("scene");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0, 9);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);

/* ---- Colours follow the CSS theme ---- */
const inkColor = new THREE.Color(cssVar("--ink") || "#121417");
const accentColor = new THREE.Color(cssVar("--accent") || "#115E48");

/* ---- Group that holds the whole object ---- */
const group = new THREE.Group();
scene.add(group);

/* Lattice: edges of a detail-1 icosphere + points of a detail-3 icosphere */
const edges = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.1, 1));
const lattice = new THREE.LineSegments(
  edges,
  new THREE.LineBasicMaterial({ color: inkColor, transparent: true, opacity: 0.22 })
);
group.add(lattice);

const pointsGeo = new THREE.IcosahedronGeometry(2.1, 3);
const nodes = new THREE.Points(
  pointsGeo,
  new THREE.PointsMaterial({ color: inkColor, size: 0.035, transparent: true, opacity: 0.55, sizeAttenuation: true })
);
group.add(nodes);

/* Vertices of the coarse sphere get slightly larger accent nodes */
const vertexGeo = new THREE.IcosahedronGeometry(2.1, 1);
const vertexNodes = new THREE.Points(
  vertexGeo,
  new THREE.PointsMaterial({ color: accentColor, size: 0.09, transparent: true, opacity: 0.9, sizeAttenuation: true })
);
group.add(vertexNodes);

/* Core */
const core = new THREE.Mesh(
  new THREE.SphereGeometry(0.42, 48, 48),
  new THREE.MeshBasicMaterial({ color: accentColor })
);
group.add(core);

/* Orbit rings */
function makeRing(radius, tiltX, tiltZ, opacity) {
  const pts = [];
  const segments = 256;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const ring = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: inkColor, transparent: true, opacity }));
  ring.rotation.x = tiltX;
  ring.rotation.z = tiltZ;
  return ring;
}
const ringA = makeRing(3.1, Math.PI * 0.42, Math.PI * 0.12, 0.35);
const ringB = makeRing(3.55, Math.PI * 0.58, -Math.PI * 0.2, 0.18);
group.add(ringA, ringB);

/* Satellite on ring A */
const satellite = new THREE.Mesh(
  new THREE.SphereGeometry(0.07, 16, 16),
  new THREE.MeshBasicMaterial({ color: inkColor })
);
ringA.add(satellite);

/* Dust field */
const dustCount = 420;
const dustPositions = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  const r = 4 + Math.random() * 6;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  dustPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  dustPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
  dustPositions[i * 3 + 2] = r * Math.cos(phi) - 2;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({ color: inkColor, size: 0.02, transparent: true, opacity: 0.35, sizeAttenuation: true })
);
scene.add(dust);

/* ---- Layout: object sits right of centre on wide screens ---- */
function layout() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  const wide = w > 860;
  group.position.x = wide ? 2.6 : 0;
  group.position.y = wide ? 0.4 : 1.6;
  const s = wide ? Math.min(1, w / 1500) : Math.min(0.72, w / 900);
  group.scale.setScalar(s);
}
layout();
window.addEventListener("resize", layout);

/* ---- Pointer parallax ---- */
const target = { x: 0, y: 0 };
const current = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  target.x = (e.clientX / window.innerWidth - 0.5) * 2;
  target.y = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

/* ---- Scroll-driven state (written by main.js) ---- */
const scroll = { progress: 0 };

/* ---- Render loop, paused when hero is off-screen ---- */
let running = true;
const io = new IntersectionObserver(([entry]) => { running = entry.isIntersecting; }, { threshold: 0 });
io.observe(container);

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  if (!running) return;
  const t = clock.getElapsedTime();
  const speed = reduceMotion ? 0 : 1;

  current.x += (target.x - current.x) * 0.04;
  current.y += (target.y - current.y) * 0.04;

  group.rotation.y = t * 0.08 * speed + current.x * 0.25 + scroll.progress * 1.4;
  group.rotation.x = Math.sin(t * 0.15) * 0.08 * speed + current.y * 0.18 + scroll.progress * 0.5;

  ringA.rotation.y = t * 0.12 * speed;
  ringB.rotation.y = -t * 0.09 * speed;
  satellite.position.set(Math.cos(t * 0.5) * 3.1, Math.sin(t * 0.5) * 3.1, 0);

  core.scale.setScalar(1 + Math.sin(t * 1.6) * 0.035);
  dust.rotation.y = t * 0.015 * speed;

  renderer.render(scene, camera);
}
tick();

/* Expose a tiny API for GSAP */
window.__heroScene = {
  scroll,
  group,
  setOpacity(v) { renderer.domElement.style.opacity = v; }
};
