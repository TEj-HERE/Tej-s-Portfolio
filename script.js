/* global THREE */

const state = {
  renderer: null,
  scene: null,
  camera: null,
  points: null,
  lines: null,
  nodes: [],
  lineGeom: null,
  linePos: null,
  lineCol: null,
  raf: 0,
  reduceMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
};

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function smoothScrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;

  const nav = document.querySelector(".nav-wrap");
  const navH = nav ? nav.getBoundingClientRect().height : 0;
  const top = window.scrollY + el.getBoundingClientRect().top - navH - 16;
  window.scrollTo({ top, behavior: state.reduceMotion ? "auto" : "smooth" });
}

function setupNavbar() {
  const navEl = document.querySelector(".nav");
  const wrap = document.querySelector(".nav-wrap");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.getElementById("nav-links");

  const setScrolled = () => {
    const scrolled = window.scrollY > 16;
    navEl?.classList.toggle("scrolled", scrolled);
  };
  setScrolled();
  window.addEventListener("scroll", setScrolled, { passive: true });

  const closeMenu = () => {
    if (!links || !toggle) return;
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle?.addEventListener("click", () => {
    if (!links || !toggle) return;
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links?.addEventListener("click", (e) => {
    const a = e.target?.closest?.("a");
    if (!a) return;
    closeMenu();
  });

  // Close on outside click / resize
  window.addEventListener(
    "click",
    (e) => {
      if (!links || !toggle || !wrap) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (links.classList.contains("open") && !wrap.contains(t)) closeMenu();
    },
    { passive: true }
  );
  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth > 680) closeMenu();
    },
    { passive: true }
  );

  // Smooth scrolling for all in-page anchors
  document.addEventListener("click", (e) => {
    const a = e.target?.closest?.("a[href^='#']");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href === "#") return;
    const id = href.slice(1);
    if (!document.getElementById(id)) return;
    e.preventDefault();
    smoothScrollToId(id);
  });
}

function setupReveal() {
  const els = Array.from(document.querySelectorAll(".reveal"));
  if (!("IntersectionObserver" in window) || state.reduceMotion) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  for (const el of els) io.observe(el);
}

function setFooterYear() {
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
}

function setYouTubeLink() {
  // Placeholder requested: “Too Young To Learn All” (channel name). Using a YouTube search URL by default.
  const a = document.querySelector("[data-youtube]");
  if (!a) return;
  a.setAttribute(
    "href",
    "https://www.youtube.com/results?search_query=Too%20Young%20To%20Learn%20All"
  );
}

function initThreeBackground() {
  const canvas = document.getElementById("bg-canvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  if (typeof THREE === "undefined") return;
  if (state.reduceMotion) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  // Nodes
  const NODE_COUNT = window.innerWidth < 680 ? 70 : 110;
  const BOUNDS = { x: 8.5, y: 5.5, z: 6.5 };
  const CONNECT_DIST = window.innerWidth < 680 ? 1.8 : 2.2;

  state.nodes = [];
  const positions = new Float32Array(NODE_COUNT * 3);
  const colors = new Float32Array(NODE_COUNT * 3);

  const colorA = new THREE.Color("#00ff88");
  const colorB = new THREE.Color("#0088ff");

  for (let i = 0; i < NODE_COUNT; i++) {
    const x = (Math.random() * 2 - 1) * BOUNDS.x;
    const y = (Math.random() * 2 - 1) * BOUNDS.y;
    const z = (Math.random() * 2 - 1) * BOUNDS.z;

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const t = i / (NODE_COUNT - 1);
    const c = colorA.clone().lerp(colorB, t);
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    state.nodes.push({
      v: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(
        (Math.random() * 2 - 1) * 0.003,
        (Math.random() * 2 - 1) * 0.003,
        (Math.random() * 2 - 1) * 0.003
      ),
    });
  }

  const ptsGeom = new THREE.BufferGeometry();
  ptsGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  ptsGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const ptsMat = new THREE.PointsMaterial({
    size: window.innerWidth < 680 ? 0.045 : 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const points = new THREE.Points(ptsGeom, ptsMat);
  scene.add(points);

  // Lines (dynamic)
  const MAX_EDGES = NODE_COUNT * 6;
  const linePos = new Float32Array(MAX_EDGES * 2 * 3);
  const lineCol = new Float32Array(MAX_EDGES * 2 * 3);

  const lineGeom = new THREE.BufferGeometry();
  lineGeom.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  lineGeom.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));
  lineGeom.setDrawRange(0, 0);

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(lineGeom, lineMat);
  scene.add(lines);

  // Subtle fog-ish depth via dark ambient
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  state.renderer = renderer;
  state.scene = scene;
  state.camera = camera;
  state.points = points;
  state.lines = lines;
  state.lineGeom = lineGeom;
  state.linePos = linePos;
  state.lineCol = lineCol;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const clock = new THREE.Clock();
  const cursor = { x: 0, y: 0 };
  const attractorNdc = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z = 0 plane
  const attractorWorld = new THREE.Vector3(0, 0, 0);
  let hasPointer = false;

  // Cursor attraction tuning (subtle, premium feel)
  const ATTRACT_RADIUS = window.innerWidth < 680 ? 2.1 : 2.6;
  const ATTRACT_STRENGTH = window.innerWidth < 680 ? 0.0016 : 0.0019;
  const DRAG = 0.985;
  const MAX_SPEED = 0.018;

  window.addEventListener(
    "pointermove",
    (e) => {
      hasPointer = true;
      cursor.x = (e.clientX / window.innerWidth) * 2 - 1;
      cursor.y = (e.clientY / window.innerHeight) * 2 - 1;
      attractorNdc.set(cursor.x, cursor.y);
    },
    { passive: true }
  );

  function tick() {
    const dt = clamp(clock.getDelta(), 0.0, 0.05);

    // Camera drift (gentle parallax)
    camera.position.x += (cursor.x * 0.6 - camera.position.x) * 0.03;
    camera.position.y += (-cursor.y * 0.35 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    // Find world-space point under cursor on z=0 plane
    if (hasPointer) {
      raycaster.setFromCamera(attractorNdc, camera);
      raycaster.ray.intersectPlane(planeZ, attractorWorld);
    }

    // Update node positions with wrap/bounce
    const posAttr = points.geometry.getAttribute("position");
    for (let i = 0; i < state.nodes.length; i++) {
      const n = state.nodes[i];

      // Apply subtle cursor attraction (falloff within radius)
      if (hasPointer) {
        const dx = attractorWorld.x - n.v.x;
        const dy = attractorWorld.y - n.v.y;
        const d2 = dx * dx + dy * dy;
        const r2 = ATTRACT_RADIUS * ATTRACT_RADIUS;
        if (d2 < r2) {
          const d = Math.sqrt(d2) + 1e-6;
          const t = 1 - d / ATTRACT_RADIUS; // 0..1
          const force = ATTRACT_STRENGTH * t * t; // ease-in
          n.vel.x += (dx / d) * force;
          n.vel.y += (dy / d) * force;
        }
      }

      // Mild drag so motion settles nicely
      n.vel.multiplyScalar(DRAG);
      const speed = n.vel.length();
      if (speed > MAX_SPEED) n.vel.multiplyScalar(MAX_SPEED / speed);

      n.v.addScaledVector(n.vel, dt * 60);

      if (n.v.x > BOUNDS.x || n.v.x < -BOUNDS.x) n.vel.x *= -1;
      if (n.v.y > BOUNDS.y || n.v.y < -BOUNDS.y) n.vel.y *= -1;
      if (n.v.z > BOUNDS.z || n.v.z < -BOUNDS.z) n.vel.z *= -1;

      posAttr.setXYZ(i, n.v.x, n.v.y, n.v.z);
    }
    posAttr.needsUpdate = true;

    // Rebuild edges (O(n^2) but small N; keep it tight)
    let edgeCount = 0;
    const colAttr = points.geometry.getAttribute("color");

    for (let i = 0; i < state.nodes.length; i++) {
      const a = state.nodes[i].v;
      const ar = colAttr.getX(i);
      const ag = colAttr.getY(i);
      const ab = colAttr.getZ(i);

      for (let j = i + 1; j < state.nodes.length; j++) {
        const b = state.nodes[j].v;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        const max2 = CONNECT_DIST * CONNECT_DIST;

        if (d2 < max2) {
          const t = 1 - Math.sqrt(d2) / CONNECT_DIST;
          const alpha = clamp(t * 0.85, 0.05, 0.85);

          const idx = edgeCount * 2 * 3;
          state.linePos[idx + 0] = a.x;
          state.linePos[idx + 1] = a.y;
          state.linePos[idx + 2] = a.z;
          state.linePos[idx + 3] = b.x;
          state.linePos[idx + 4] = b.y;
          state.linePos[idx + 5] = b.z;

          // Color blend between endpoints, scaled by alpha (stored in RGB intensity)
          const br = colAttr.getX(j);
          const bg = colAttr.getY(j);
          const bb = colAttr.getZ(j);

          const r1 = (ar * 0.7 + br * 0.3) * alpha;
          const g1 = (ag * 0.7 + bg * 0.3) * alpha;
          const b1 = (ab * 0.7 + bb * 0.3) * alpha;
          const r2 = (ar * 0.3 + br * 0.7) * alpha;
          const g2 = (ag * 0.3 + bg * 0.7) * alpha;
          const b2 = (ab * 0.3 + bb * 0.7) * alpha;

          state.lineCol[idx + 0] = r1;
          state.lineCol[idx + 1] = g1;
          state.lineCol[idx + 2] = b1;
          state.lineCol[idx + 3] = r2;
          state.lineCol[idx + 4] = g2;
          state.lineCol[idx + 5] = b2;

          edgeCount++;
          if (edgeCount >= MAX_EDGES) break;
        }
      }
      if (edgeCount >= MAX_EDGES) break;
    }

    state.lineGeom.setDrawRange(0, edgeCount * 2);
    state.lineGeom.getAttribute("position").needsUpdate = true;
    state.lineGeom.getAttribute("color").needsUpdate = true;

    renderer.render(scene, camera);
    state.raf = requestAnimationFrame(tick);
  }

  state.raf = requestAnimationFrame(tick);
}

function setupHeroButton() {
  const btn = document.querySelector("[data-scroll='projects']");
  btn?.addEventListener("click", (e) => {
    // Anchor click already handled globally, but keep this for robustness if attributes change.
    e.preventDefault();
    smoothScrollToId("projects");
  });
}

function main() {
  setupNavbar();
  setupReveal();
  setupHeroButton();
  setFooterYear();
  setYouTubeLink();
  initThreeBackground();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}

