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
  scene.fog = new THREE.FogExp2(0x05070a, 0.06);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
  camera.position.set(0, 0.4, 12);

  const colorA = new THREE.Color("#00ff88");
  const colorB = new THREE.Color("#0088ff");

  // Lighting: soft base + cursor-follow accent
  const hemi = new THREE.HemisphereLight(0x9ecbff, 0x0a0a0a, 0.65);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 0.55);
  key.position.set(6, 7, 10);
  scene.add(key);
  const cursorLight = new THREE.PointLight(0x00ff88, 1.2, 25, 1.8);
  cursorLight.position.set(0, 0, 6);
  scene.add(cursorLight);

  // Materials
  const metal = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.7,
    roughness: 0.25,
  });
  const plastic = new THREE.MeshStandardMaterial({
    color: 0xe8eef7,
    metalness: 0.1,
    roughness: 0.45,
  });
  const visor = new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    metalness: 0.3,
    roughness: 0.18,
    emissive: 0x001b22,
    emissiveIntensity: 0.9,
  });
  const neonGreen = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 1.0,
    metalness: 0.15,
    roughness: 0.35,
  });
  const neonBlue = new THREE.MeshStandardMaterial({
    color: 0x0088ff,
    emissive: 0x0088ff,
    emissiveIntensity: 0.9,
    metalness: 0.15,
    roughness: 0.35,
  });

  const bgGroup = new THREE.Group();
  scene.add(bgGroup);

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function createRobot() {
    const g = new THREE.Group();

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 1.2, 6, 10), plastic);
    body.position.y = 0.1;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 14), plastic);
    head.position.y = 1.55;
    g.add(head);

    const visorMesh = new THREE.Mesh(new THREE.SphereGeometry(0.58, 18, 14), visor);
    visorMesh.scale.set(1.25, 0.75, 0.95);
    visorMesh.position.set(0, 1.55, 0.46);
    g.add(visorMesh);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), neonGreen);
    eye.position.set(-0.18, 1.56, 0.93);
    const eye2 = eye.clone();
    eye2.position.x = 0.18;
    g.add(eye, eye2);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.65, 10), metal);
    antenna.position.set(0, 2.25, -0.05);
    g.add(antenna);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), neonBlue);
    tip.position.set(0, 2.6, -0.05);
    g.add(tip);

    g.userData.base = {
      pos: new THREE.Vector3(),
      rot: new THREE.Euler(),
      seed: rand(0, 1000),
    };
    return g;
  }

  function createCoil() {
    const g = new THREE.Group();
    const coil = new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.12, 70, 10, 2, 3), metal);
    coil.material = metal.clone();
    coil.material.emissive = colorB.clone();
    coil.material.emissiveIntensity = 0.25;
    g.add(coil);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 10, 48), neonBlue);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    g.userData.base = { pos: new THREE.Vector3(), rot: new THREE.Euler(), seed: rand(0, 1000) };
    return g;
  }

  function createPCB() {
    const g = new THREE.Group();
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x06121a,
      metalness: 0.15,
      roughness: 0.55,
      emissive: 0x001010,
      emissiveIntensity: 0.35,
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 3.1), boardMat);
    board.rotation.y = -0.35;
    g.add(board);

    // Glowing "traces" as thin boxes
    const traceCount = 18;
    for (let i = 0; i < traceCount; i++) {
      const w = rand(0.7, 2.2);
      const h = 0.025;
      const d = rand(0.02, 0.06);
      const trace = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), i % 2 ? neonGreen : neonBlue);
      trace.position.set(rand(-1.9, 1.9), 0.11, rand(-1.1, 1.1));
      trace.rotation.y = rand(-0.6, 0.6);
      g.add(trace);
    }

    // Components (instanced cubes)
    const compMat = new THREE.MeshStandardMaterial({
      color: 0x101828,
      metalness: 0.25,
      roughness: 0.55,
      emissive: 0x05070a,
      emissiveIntensity: 0.4,
    });
    const compGeom = new THREE.BoxGeometry(0.18, 0.12, 0.22);
    const compCount = window.innerWidth < 680 ? 40 : 70;
    const inst = new THREE.InstancedMesh(compGeom, compMat, compCount);
    const m = new THREE.Matrix4();
    for (let i = 0; i < compCount; i++) {
      const px = rand(-2.1, 2.1);
      const pz = rand(-1.25, 1.25);
      const py = 0.13;
      const s = rand(0.9, 2.0);
      m.compose(
        new THREE.Vector3(px, py, pz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand(0, Math.PI), 0)),
        new THREE.Vector3(s, rand(0.9, 1.6), s)
      );
      inst.setMatrixAt(i, m);
    }
    g.add(inst);

    g.userData.base = { pos: new THREE.Vector3(), rot: new THREE.Euler(), seed: rand(0, 1000) };
    return g;
  }

  // Populate scene
  const objects = [];
  const robotA = createRobot();
  robotA.position.set(-3.0, -0.3, -1.0);
  robotA.rotation.y = 0.35;
  bgGroup.add(robotA);
  objects.push(robotA);

  const robotB = createRobot();
  robotB.scale.setScalar(0.72);
  robotB.position.set(3.4, -0.6, -2.2);
  robotB.rotation.y = -0.55;
  bgGroup.add(robotB);
  objects.push(robotB);

  const pcb = createPCB();
  pcb.position.set(0.6, -1.65, -4.0);
  pcb.rotation.x = 0.18;
  bgGroup.add(pcb);
  objects.push(pcb);

  for (let i = 0; i < (window.innerWidth < 680 ? 3 : 5); i++) {
    const coil = createCoil();
    coil.scale.setScalar(rand(0.6, 1.05));
    coil.position.set(rand(-4.3, 4.3), rand(-0.4, 2.0), rand(-6.0, -1.5));
    coil.rotation.set(rand(-0.7, 0.7), rand(-0.8, 0.8), rand(-0.7, 0.7));
    bgGroup.add(coil);
    objects.push(coil);
  }

  // A few floating "spark" spheres
  const sparkGeom = new THREE.SphereGeometry(0.04, 10, 10);
  for (let i = 0; i < (window.innerWidth < 680 ? 18 : 28); i++) {
    const mat = i % 2 ? neonGreen : neonBlue;
    const s = new THREE.Mesh(sparkGeom, mat);
    s.position.set(rand(-5.2, 5.2), rand(-1.2, 2.8), rand(-7.5, 0.5));
    s.userData.base = { pos: s.position.clone(), seed: rand(0, 1000) };
    bgGroup.add(s);
    objects.push(s);
  }

  state.renderer = renderer;
  state.scene = scene;
  state.camera = camera;
  state.points = null;
  state.lines = null;
  state.lineGeom = null;
  state.linePos = null;
  state.lineCol = null;

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

  const cursorWorldSmoothed = new THREE.Vector3(0, 0, 0);

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
    const t = clock.elapsedTime;

    // Camera drift (gentle parallax)
    camera.position.x += (cursor.x * 0.85 - camera.position.x) * 0.03;
    camera.position.y += (-cursor.y * 0.55 + 0.2 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    // Find world-space point under cursor on z=0 plane
    if (hasPointer) {
      raycaster.setFromCamera(attractorNdc, camera);
      raycaster.ray.intersectPlane(planeZ, attractorWorld);
    }

    // Smooth the cursor world point so lighting/forces feel buttery
    if (hasPointer) {
      cursorWorldSmoothed.lerp(attractorWorld, 0.14);
    }

    // Cursor-follow light (adds "interactive" feel immediately)
    cursorLight.position.x += (cursorWorldSmoothed.x - cursorLight.position.x) * 0.12;
    cursorLight.position.y += (cursorWorldSmoothed.y - cursorLight.position.y) * 0.12;
    cursorLight.position.z += (5.0 - cursorLight.position.z) * 0.08;

    // Animate objects: float + subtle cursor-driven rotation/bend
    for (const obj of objects) {
      const base = obj.userData.base;
      if (!base) continue;

      // Save base once
      if (!base._inited) {
        base._inited = true;
        base.pos.copy(obj.position);
        base.rot.copy(obj.rotation);
      }

      const s = base.seed ?? 0;
      const floatY = Math.sin(t * 0.9 + s) * 0.12;
      const floatX = Math.cos(t * 0.6 + s * 1.3) * 0.07;
      const wobble = Math.sin(t * 0.7 + s * 0.9) * 0.08;

      obj.position.x = base.pos.x + floatX;
      obj.position.y = base.pos.y + floatY;

      // Cursor influence (falloff by distance in XY)
      if (hasPointer) {
        const dx = cursorWorldSmoothed.x - obj.position.x;
        const dy = cursorWorldSmoothed.y - obj.position.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const influence = clamp(1 - d / 4.2, 0, 1);
        obj.rotation.y = base.rot.y + wobble + cursor.x * 0.25 * influence;
        obj.rotation.x = base.rot.x + (-cursor.y * 0.18) * influence;
      } else {
        obj.rotation.y = base.rot.y + wobble;
        obj.rotation.x = base.rot.x;
      }
    }

    // Gentle scene drift toward cursor
    bgGroup.position.x += ((cursor.x * 0.55) - bgGroup.position.x) * 0.03;
    bgGroup.position.y += ((-cursor.y * 0.35) - bgGroup.position.y) * 0.03;

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

