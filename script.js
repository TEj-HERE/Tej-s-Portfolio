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

function setupLoopVideos() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("video[data-loop-video]").forEach((v) => {
    if (reduced) {
      v.pause();
      v.removeAttribute("autoplay");
      return;
    }
    v.play().catch(() => {});
  });
}

function setYouTubeLink() {
  // Placeholder requested: “Too Young To Learn All” (channel name). Using a YouTube search URL by default.
  const url = "https://www.youtube.com/channel/UCZCSh99yfUspORSF058BZBQ";
  document.querySelectorAll("[data-youtube]").forEach(a => {
    a.setAttribute("href", url);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noreferrer");
  });
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

function initNodeNetwork() {
  const canvas = document.getElementById("node-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Palette — green / blue / teal / soft-white only
  const C = {
    green: { r: 0,   g: 255, b: 136 },
    blue:  { r: 0,   g: 136, b: 255 },
    teal:  { r: 0,   g: 210, b: 200 },
    white: { r: 210, g: 230, b: 255 },
  };
  const COLS = [C.green, C.blue, C.teal, C.white];

  const PHOTO_R    = 115;
  const NODE_COUNT = 62;   // 12 orbit + 35 right-cluster + 15 left-ambient
  const LINK_DIST  = 200;
  const PULSE_SPD  = 0.009;

  let W = 0, H = 0, pCX = 0, pCY = 0, t = 0;
  let mouse = { x: null, y: null };
  let nodes = [], edges = [];

  // Load profile photo
  let photoImg = null;
  const photo = new Image();
  photo.onload = () => { photoImg = photo; };
  photo.src = "./profile.png";

  const colStr = (c, a) => `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const rand   = (lo, hi) => lo + Math.random() * (hi - lo);

  // ── node shape drawers ──────────────────────────────────────────────────────

  function pathDiamond(x, y, s, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.65, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.65, 0);
    ctx.closePath();
    ctx.restore();
  }

  function pathHex(x, y, s) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function pathCross(x, y, s, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, -s);
    ctx.lineTo(s * 0.22, -s);
    ctx.lineTo(s * 0.22, -s * 0.22);
    ctx.lineTo(s, -s * 0.22);
    ctx.lineTo(s, s * 0.22);
    ctx.lineTo(s * 0.22, s * 0.22);
    ctx.lineTo(s * 0.22, s);
    ctx.lineTo(-s * 0.22, s);
    ctx.lineTo(-s * 0.22, s * 0.22);
    ctx.lineTo(-s, s * 0.22);
    ctx.lineTo(-s, -s * 0.22);
    ctx.lineTo(-s * 0.22, -s * 0.22);
    ctx.closePath();
    ctx.restore();
  }

  function drawGlow(x, y, radius, col, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, colStr(col, alpha));
    g.addColorStop(1, colStr(col, 0));
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // ── node renderer ───────────────────────────────────────────────────────────

  function drawNode(n) {
    const col   = COLS[n.colorIdx];
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.028 + n.pphs);
    const lit   = (n.baseLit ?? 1) * (n.lit ?? 1);
    const s     = n.size * (0.9 + 0.1 * pulse) * Math.min(lit, 1.6);

    // Soft glow behind
    drawGlow(n.x, n.y, s * 7, col, 0.22 * pulse * lit);

    ctx.save();
    if (n.shape === 0) {
      // Diamond — hollow with bright fill
      pathDiamond(n.x, n.y, s * 1.3, n.angle);
      ctx.strokeStyle = colStr(col, 0.9 * lit);
      ctx.lineWidth   = 1.4;
      ctx.stroke();
      pathDiamond(n.x, n.y, s * 0.55, n.angle + Math.PI / 4);
      ctx.fillStyle = colStr(col, 0.6 * lit);
      ctx.fill();
    } else if (n.shape === 1) {
      // Hexagon outline + inner dot
      pathHex(n.x, n.y, s * 1.4);
      ctx.strokeStyle = colStr(col, 0.8 * lit);
      ctx.lineWidth   = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(n.x, n.y, s * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = colStr(col, 0.95 * lit);
      ctx.fill();
    } else if (n.shape === 2) {
      // Plus/cross shape
      pathCross(n.x, n.y, s * 1.1, n.angle);
      ctx.fillStyle = colStr(col, 0.75 * lit);
      ctx.fill();
    } else {
      // Simple bright circle (small nodes)
      ctx.beginPath();
      ctx.arc(n.x, n.y, s, 0, Math.PI * 2);
      ctx.fillStyle = colStr(col, 0.9 * lit);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── photo renderer ──────────────────────────────────────────────────────────

  function drawPhoto() {
    const x = pCX, y = pCY, r = PHOTO_R;

    // Deep ambient pool
    drawGlow(x, y, r * 3.2, C.green, 0.055 + 0.025 * Math.sin(t * 0.022));
    drawGlow(x, y, r * 2.0, C.blue,  0.04  + 0.02  * Math.sin(t * 0.018 + 1));

    // Radar sweep arc
    const sweep = (t * 0.014) % (Math.PI * 2);
    const sweepLen = Math.PI * 0.65;
    const sweepGrad = ctx.createConicalGradient
      ? null // not standard — do it with arc instead
      : null;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r + 55, sweep, sweep + sweepLen);
    ctx.closePath();
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, r + 55);
    rg.addColorStop(0, "rgba(0,255,136,0)");
    rg.addColorStop(0.6, "rgba(0,255,136,0.07)");
    rg.addColorStop(1, "rgba(0,255,136,0)");
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.restore();

    // Outer thin ring (green, dashed, slow CW)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.006);
    ctx.beginPath();
    ctx.arc(0, 0, r + 50, 0, Math.PI * 2);
    ctx.strokeStyle = colStr(C.green, 0.22 + 0.1 * Math.sin(t * 0.035));
    ctx.lineWidth = 1;
    ctx.setLineDash([12, 20]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Mid ring (blue, dashed, CCW)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-t * 0.010);
    ctx.beginPath();
    ctx.arc(0, 0, r + 28, 0, Math.PI * 2);
    ctx.strokeStyle = colStr(C.blue, 0.3 + 0.12 * Math.sin(t * 0.03 + 1.5));
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 24]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 4 diamond corner accents at cardinal points
    const accentR = r + 60;
    for (let i = 0; i < 4; i++) {
      const a   = (i * Math.PI) / 2 + t * 0.006;
      const ax  = x + Math.cos(a) * accentR;
      const ay  = y + Math.sin(a) * accentR;
      const col = i % 2 === 0 ? C.green : C.blue;
      drawGlow(ax, ay, 10, col, 0.5);
      pathDiamond(ax, ay, 5, a + Math.PI / 4);
      ctx.fillStyle = colStr(col, 0.9);
      ctx.fill();
    }

    // Inner solid glow border
    const borderGlow = ctx.createRadialGradient(x, y, r - 4, x, y, r + 8);
    borderGlow.addColorStop(0, "rgba(0,255,136,0.8)");
    borderGlow.addColorStop(0.5, "rgba(0,255,136,0.4)");
    borderGlow.addColorStop(1, "rgba(0,255,136,0)");
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = borderGlow;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r + 1, 0, Math.PI * 2);
    ctx.strokeStyle = colStr(C.green, 0.85);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Clip and draw photo
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    if (photoImg && photoImg.complete && photoImg.naturalWidth > 0) {
      ctx.drawImage(photoImg, x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = `rgba(0,80,200,${0.07 + 0.03 * Math.sin(t * 0.04)})`;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      for (let sy = -r; sy < r; sy += 5) {
        ctx.fillStyle = `rgba(0,0,0,${0.06 + 0.03 * Math.sin(sy * 0.12 + t * 0.012)})`;
        ctx.fillRect(x - r, y + sy, r * 2, 2);
      }
    } else {
      const pg = ctx.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y, r);
      pg.addColorStop(0, "rgba(40,80,160,0.55)");
      pg.addColorStop(1, "rgba(0,20,50,0.8)");
      ctx.fillStyle = pg;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  // ── build nodes ─────────────────────────────────────────────────────────────

  function buildNodes() {
    nodes = Array.from({ length: NODE_COUNT }, (_, i) => {
      const orbiting  = i < 12;
      const leftSide  = i >= 47;           // last 15 nodes = faint left-side ambient
      const angle     = rand(0, Math.PI * 2);
      const orbitDist = PHOTO_R * rand(1.7, 2.8);

      let bx, by;
      if (orbiting) {
        bx = pCX + Math.cos(angle) * orbitDist;
        by = pCY + Math.sin(angle) * orbitDist;
      } else if (leftSide) {
        // Spread across left ~40% of canvas
        bx = rand(30, W * 0.40);
        by = rand(30, H - 30);
      } else {
        // Right-side cluster around photo (original behaviour)
        const dist = PHOTO_R * rand(2.8, 5.4);
        bx = pCX + Math.cos(angle) * dist;
        by = pCY + Math.sin(angle) * dist;
      }

      const shape = orbiting
        ? (i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 3)
        : (i % 4);

      return {
        bx, by,
        x: 0, y: 0,
        phase:      rand(0, Math.PI * 2),
        orbitAngle: angle,
        orbitR:     orbitDist,
        orbitSpd:   rand(0.0015, 0.004) * (Math.random() < 0.5 ? 1 : -1),
        orbiting,
        leftSide,
        // Left-side nodes are smaller and inherently dimmer
        size:       orbiting ? rand(5, 9) : leftSide ? rand(2, 4) : rand(3.5, 7),
        baseLit:    leftSide ? 0.28 : 1,   // permanent dim factor for left nodes
        shape,
        colorIdx:   i % 4,
        angle:      rand(0, Math.PI * 2),
        rotSpd:     rand(0.005, 0.02) * (Math.random() < 0.5 ? 1 : -1),
        pphs:       rand(0, Math.PI * 2),
        lit:        1,
      };
    });
    edges = [];
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        edges.push({ a: i, b: j, p1: Math.random(), p2: (Math.random() + 0.5) % 1 });
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.offsetWidth  || window.innerWidth * 0.58;
    H = canvas.offsetHeight || window.innerHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pCX = W * 0.72;
    pCY = H * 0.46;
    buildNodes();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const heroEl = document.querySelector(".hero");
  if (heroEl) {
    heroEl.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }, { passive: true });
    heroEl.addEventListener("pointerleave", () => { mouse.x = null; mouse.y = null; }, { passive: true });
  }

  // ── main loop ───────────────────────────────────────────────────────────────

  function draw() {
    t++;
    ctx.clearRect(0, 0, W, H);

    // Move nodes
    for (const n of nodes) {
      n.angle += n.rotSpd;
      if (n.orbiting) {
        n.orbitAngle += n.orbitSpd;
        n.x = pCX + Math.cos(n.orbitAngle) * n.orbitR + Math.cos(t * 0.0006 + n.phase) * 7;
        n.y = pCY + Math.sin(n.orbitAngle) * n.orbitR + Math.sin(t * 0.0008 + n.phase) * 7;
      } else {
        const ft = t * 0.00035;
        n.x = n.bx + Math.cos(ft + n.phase) * 30;
        n.y = n.by + Math.sin(ft * 0.69 + n.phase) * 22;
      }

      // Mouse glow-up
      n.lit = 1;
      if (mouse.x !== null) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 150 && d > 0) {
          const f = (1 - d / 150) * 18;
          n.x += dx / d * f;
          n.y += dy / d * f;
          n.lit = 1 + (1 - d / 150) * 0.7;
        }
      }

      // Repel from photo
      const pdx = n.x - pCX, pdy = n.y - pCY;
      const pd  = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pd < PHOTO_R + 20 && pd > 0) {
        const push = (PHOTO_R + 20 - pd) * 0.2;
        n.x += pdx / pd * push;
        n.y += pdy / pd * push;
      }
    }

    // Draw gradient edges with 2 simultaneous pulses
    for (const e of edges) {
      const na = nodes[e.a], nb = nodes[e.b];
      const dx = nb.x - na.x, dy = nb.y - na.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > LINK_DIST) continue;

      e.p1 = (e.p1 + PULSE_SPD) % 1;
      e.p2 = (e.p2 + PULSE_SPD) % 1;
      const fade   = (1 - dist / LINK_DIST);
      const edgeDim = Math.min(na.baseLit ?? 1, nb.baseLit ?? 1);
      const ca     = COLS[na.colorIdx], cb = COLS[nb.colorIdx];

      // Gradient edge line
      const lg = ctx.createLinearGradient(na.x, na.y, nb.x, nb.y);
      lg.addColorStop(0, colStr(ca, fade * 0.22 * edgeDim));
      lg.addColorStop(1, colStr(cb, fade * 0.22 * edgeDim));
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = lg;
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Pulse 1 — bright dot
      const p1x = na.x + dx * e.p1, p1y = na.y + dy * e.p1;
      drawGlow(p1x, p1y, 8, ca, fade * 0.55 * edgeDim);
      ctx.beginPath();
      ctx.arc(p1x, p1y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = colStr(ca, fade * 0.95 * edgeDim);
      ctx.fill();

      // Pulse 2 — dimmer
      const p2x = na.x + dx * e.p2, p2y = na.y + dy * e.p2;
      ctx.beginPath();
      ctx.arc(p2x, p2y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = colStr(cb, fade * 0.65 * edgeDim);
      ctx.fill();
    }

    // Thin spoke lines from nearby nodes to photo
    for (const n of nodes) {
      const dx = pCX - n.x, dy = pCY - n.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d > PHOTO_R * 3) continue;
      const fade = 1 - d / (PHOTO_R * 3);
      const col  = COLS[n.colorIdx];
      const ex = pCX - (dx / d) * (PHOTO_R + 2);
      const ey = pCY - (dy / d) * (PHOTO_R + 2);
      const sg = ctx.createLinearGradient(n.x, n.y, ex, ey);
      sg.addColorStop(0, colStr(col, fade * 0.12));
      sg.addColorStop(1, colStr(C.green, fade * 0.4));
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = sg;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    drawPhoto();

    for (const n of nodes) drawNode(n);

    requestAnimationFrame(draw);
  }

  draw();
}

function setupCardTilt() {
  if (state.reduceMotion) return;

  document.querySelectorAll(".card").forEach((card) => {
    let raf = 0;
    let tx = 0, ty = 0;
    let cx = 0, cy = 0;
    let mx = 50, my = 50;
    let inside = false;

    function frame() {
      if (card.classList.contains("card-fly-out")) {
        raf = requestAnimationFrame(frame);
        return;
      }
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      card.style.transform = `perspective(700px) rotateX(${cy}deg) rotateY(${cx}deg) translateY(${inside ? -7 : 0}px)`;
      card.style.setProperty("--card-mx", `${mx}%`);
      card.style.setProperty("--card-my", `${my}%`);
      if (Math.abs(cx) > 0.05 || Math.abs(cy) > 0.05 || inside) {
        raf = requestAnimationFrame(frame);
      } else {
        card.style.transform = "";
        raf = 0;
      }
    }

    card.addEventListener("mouseenter", () => {
      inside = true;
      if (!raf) raf = requestAnimationFrame(frame);
    }, { passive: true });

    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tx = x * 14;
      ty = -y * 10;
      mx = ((e.clientX - r.left) / r.width) * 100;
      my = ((e.clientY - r.top) / r.height) * 100;
    }, { passive: true });

    card.addEventListener("mouseleave", () => {
      inside = false;
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    }, { passive: true });
  });
}

function setupMagneticButtons() {
  if (state.reduceMotion) return;

  document.querySelectorAll(".btn-primary").forEach((btn) => {
    let raf = 0;
    let tx = 0, ty = 0;
    let cx = 0, cy = 0;
    let active = false;
    const RADIUS = 90;

    function frame() {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      btn.style.transform = `translate(${cx}px, ${cy}px)`;
      if (Math.abs(cx - tx) > 0.05 || Math.abs(cy - ty) > 0.05 || active) {
        raf = requestAnimationFrame(frame);
      } else {
        btn.style.transform = "";
        raf = 0;
      }
    }

    window.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const bx = r.left + r.width / 2;
      const by = r.top + r.height / 2;
      const dx = e.clientX - bx;
      const dy = e.clientY - by;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RADIUS) {
        active = true;
        const strength = (1 - dist / RADIUS) * 0.38;
        tx = dx * strength;
        ty = dy * strength;
        if (!raf) raf = requestAnimationFrame(frame);
      } else if (active) {
        active = false;
        tx = 0;
        ty = 0;
        if (!raf) raf = requestAnimationFrame(frame);
      }
    }, { passive: true });
  });
}

function setupHeroTextParallax() {
  if (state.reduceMotion) return;

  const hero = document.querySelector(".hero");
  if (!hero) return;

  const layers = [
    { sel: ".hero-kicker",   xf: 0.010, yf: 0.007 },
    { sel: ".hero-title",    xf: 0.024, yf: 0.015 },
    { sel: ".hero-subtitle", xf: 0.020, yf: 0.013 },
    { sel: ".hero-cta",      xf: 0.016, yf: 0.011 },
  ].map((l) => ({ ...l, el: document.querySelector(l.sel), cx: 0, cy: 0 }))
   .filter((l) => l.el);

  let mx = 0, my = 0;

  hero.addEventListener("mousemove", (e) => {
    const r = hero.getBoundingClientRect();
    mx = e.clientX - r.left - r.width / 2;
    my = e.clientY - r.top - r.height / 2;
  }, { passive: true });

  hero.addEventListener("mouseleave", () => {
    mx = 0;
    my = 0;
  }, { passive: true });

  function tick() {
    for (const l of layers) {
      l.cx += (mx * l.xf - l.cx) * 0.09;
      l.cy += (my * l.yf - l.cy) * 0.09;
      l.el.style.transform = `translate3d(${l.cx}px, ${l.cy}px, 0)`;
    }
    requestAnimationFrame(tick);
  }

  tick();
}

function setupCustomCursor() {
  // Only on pointer-fine (mouse) devices
  if (!window.matchMedia("(pointer: fine)").matches) return;

  const dot  = document.createElement("div");
  dot.className = "cur-dot";
  const ring = document.createElement("div");
  ring.className = "cur-ring";
  document.body.append(dot, ring);

  let mx = -200, my = -200;
  let rx = -200, ry = -200;
  let scale = 1;

  window.addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });

  // Hover state: expand ring on interactive elements
  document.addEventListener("pointerover", (e) => {
    if (e.target.closest("a, button, .btn, .card, [role='button']")) {
      scale = 1.35;
      ring.classList.add("is-hover");
      dot.classList.add("is-hover");
    }
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest("a, button, .btn, .card, [role='button']")) {
      scale = 1;
      ring.classList.remove("is-hover");
      dot.classList.remove("is-hover");
    }
  });

  let ringScale = 1;
  function tick() {
    // Dot snaps to cursor immediately
    dot.style.transform  = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    // Ring lags behind with lerp
    rx += (mx - rx) * 0.11;
    ry += (my - ry) * 0.11;
    ringScale += (scale - ringScale) * 0.13;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%) scale(${ringScale})`;
    requestAnimationFrame(tick);
  }
  tick();
}

const PROJECT_OVERLAYS = {
  rocket: {
    title: "Rocket Flight Computer PCB",
    desc: "Custom flight-computer PCB designed from scratch for the Arbalest Rocketry Team at York University — avionics, sensor integration (IMU, barometer, GPS), and control systems for competitive rocketry.",
    images: [
      { src: "./images/rocket-pcb-1.png", alt: "Rocket PCB schematic" },
      { src: "./images/rocket-pcb-3d.png", alt: "3D render of rocket flight computer PCB" },
      { src: "./images/rocket-pcb-2.png", alt: "Reviewing rocket PCB schematic" },
      { src: "./images/rocket-pcb-layout.png", alt: "Rocket PCB layout" },
    ],
    takeaways: [
      "Coordinated design reviews with the electrical hardware team to validate schematics and layouts",
      "Designed for high-vibration, low-noise environments — stable power regulation under flight conditions",
      "Drove cross-subteam integration (avionics, propulsion, software) for system-level compatibility and safety compliance",
      "Expanded skills independently: learned SolidWorks and 3D printing for functional components",
    ],
    tags: ["Altium", "KiCad", "Embedded C", "Soldering"],
  },
  "solar-car": {
    title: "Solar Car Electrical Systems",
    desc: "BMS, motor test rigs, and power distribution for two solar race vehicles (Elyse & Hades) competing at the Formula Sun Grand Prix at the University of Calgary.",
    images: [{ src: "./images/solar-car-1.png", alt: "Solar car team" }],
    slideshow: false,
    takeaways: [
      "Contributed to electrical system design and verification for solar-powered race vehicles",
      "Conducted rigorous performance testing and data analysis to optimize vehicle efficiency",
      "Collaborated within a multidisciplinary engineering team to meet stringent technical and safety standards",
    ],
    tags: ["BMS", "Motor Control", "Power Systems"],
  },
  "ai-desk-robot": {
    title: "AI Desk Robot",
    desc: "PyTorch-powered robot arm that passively detects user distraction and inactivity using computer vision and ML inference on edge hardware.",
    images: [
      {
        src: "./images/ai-desk-robot-prototype-1.png",
        alt: "First prototype: red 3D-printed base, cardboard arm, and blue LED matrix face",
      },
    ],
    slideshow: false,
    buildVideos: [
      { label: "Prototype 1", url: "https://www.youtube.com/shorts/2TMexDI5K8g" },
      { label: "Prototype 2", url: "" },
      { label: "Final Build", url: "" },
    ],
    takeaways: [
      "Applied PyTorch and OpenCV for real-time computer vision on Raspberry Pi",
      "Edge ML inference for low-latency distraction detection",
    ],
    tags: ["PyTorch", "OpenCV", "Raspberry Pi"],
  },
  "dc-dc-servo": {
    title: "DC-DC Servo Power Board",
    desc: "Custom PCB delivering stable, low-noise voltage regulation to servo actuators under high-vibration rocket flight conditions for the Arbalest Rocketry Team.",
    images: [{ src: "./images/rocket-pcb-2.png", alt: "DC-DC servo power board schematic" }],
    takeaways: [
      "Engineered power regulation for harsh flight environments",
      "Designed for low-noise output critical for servo control",
    ],
    tags: ["PCB Design", "Power Electronics", "Altium", "Soldering"],
  },
  jetech: {
    title: "JETech Labs",
    desc: "Founded a robotics STEAM education startup — built the full product, curriculum, and subscription model from scratch to deliver hands-on electronics kits to youth learners.",
    images: [
      { src: "./images/jetech-jetbox.png", alt: "JetBox Gen 1 kits at JETech Labs" },
      { src: "./images/jetech-1.png", alt: "Building the JetBox robotic arm kit" },
    ],
    slideshow: false,
    takeaways: [
      "End-to-end operations: product design, component sourcing, video curriculum, digital marketing",
      "Produced step-by-step video tutorials reaching thousands of learners globally",
      "Mentored beginner engineers through structured, project-based learning",
    ],
    tags: ["Startup", "Arduino", "Curriculum Design"],
  },
  "6dof-arm": {
    title: "6-DOF Robotic Arm",
    desc: "3D-printed 6-degree-of-freedom robotic arm integrated with OpenCV for real-time computer vision and autonomous object detection and manipulation.",
    images: null,
    takeaways: [
      "Full mechanical design and 3D printing of articulated arm",
      "OpenCV integration for real-time vision and object manipulation",
    ],
    tags: ["Python", "OpenCV", "3D Printing"],
  },
};

function setupProjectOverlays() {
  const overlay = document.getElementById("project-overlay");
  const closeBtn = overlay?.querySelector(".project-overlay-close");
  const backdrop = overlay?.querySelector(".project-overlay-backdrop");
  const slidesContainer = document.getElementById("project-overlay-slides");
  const titleEl = document.getElementById("project-overlay-title");
  const descEl = document.getElementById("project-overlay-desc");
  const takeawaysEl = document.getElementById("project-overlay-takeaways");
  const highlightsEl = document.getElementById("project-overlay-highlights");
  const tagsEl = document.getElementById("project-overlay-tags");
  const contentEl = overlay?.querySelector(".project-overlay-content");
  const videoLinksWrap = document.getElementById("project-overlay-video-links-wrap");
  const videoLinksEl = document.getElementById("project-overlay-video-links");

  if (!overlay || !titleEl || !slidesContainer) return;

  let overlaySlideTimer = null;

  const populateOverlay = (id) => {
    const data = PROJECT_OVERLAYS[id];
    if (!data) return;
    titleEl.textContent = data.title;
    titleEl.id = "project-overlay-title";
    descEl.textContent = data.desc;
    const images = data.images;
    if (images?.length) {
      contentEl?.classList.remove("has-no-image");
      slidesContainer.innerHTML = "";
      images.forEach((img, i) => {
        const slide = document.createElement("div");
        slide.className = "project-overlay-slide" + (i === 0 ? " active" : "");
        const imgEl = document.createElement("img");
        imgEl.src = img.src;
        imgEl.alt = img.alt || data.title;
        slide.appendChild(imgEl);
        slidesContainer.appendChild(slide);
      });
    } else {
      contentEl?.classList.add("has-no-image");
      slidesContainer.innerHTML = "";
    }
    highlightsEl.innerHTML = "";
    if (data.takeaways?.length) {
      data.takeaways.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        highlightsEl.appendChild(li);
      });
      takeawaysEl.style.display = "";
    } else {
      takeawaysEl.style.display = "none";
    }
    tagsEl.innerHTML = "";
    (data.tags || []).forEach((tag) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = tag;
      tagsEl.appendChild(span);
    });
    if (videoLinksWrap && videoLinksEl) {
      if (data.buildVideos?.length) {
        videoLinksWrap.hidden = false;
        videoLinksEl.innerHTML = "";
        data.buildVideos.forEach(({ label, url }) => {
          const u = (url || "").trim();
          if (u) {
            const a = document.createElement("a");
            a.className = "btn btn-small project-overlay-video-btn";
            a.href = u;
            a.target = "_blank";
            a.rel = "noreferrer";
            a.textContent = label;
            videoLinksEl.appendChild(a);
          } else {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn btn-small project-overlay-video-btn project-overlay-video-btn-pending";
            btn.disabled = true;
            btn.textContent = label;
            btn.title = "YouTube link coming soon";
            videoLinksEl.appendChild(btn);
          }
        });
      } else {
        videoLinksWrap.hidden = true;
        videoLinksEl.innerHTML = "";
      }
    }
  };

  let lastOpenedBtn = null;
  let overlaySlideIdx = 0;

  const advanceOverlaySlide = () => {
    const slides = slidesContainer.querySelectorAll(".project-overlay-slide");
    if (slides.length < 2) return;
    slides[overlaySlideIdx].classList.remove("active");
    overlaySlideIdx = (overlaySlideIdx + 1) % slides.length;
    slides[overlaySlideIdx].classList.add("active");
  };

  const startOverlaySlideshow = (id) => {
    const data = PROJECT_OVERLAYS[id];
    if (data?.slideshow === false) return;
    const slides = slidesContainer.querySelectorAll(".project-overlay-slide");
    if (slides.length < 2) return;
    overlaySlideIdx = 0;
    slides.forEach((s, i) => s.classList.toggle("active", i === 0));
    overlaySlideTimer = setInterval(advanceOverlaySlide, 2800);
  };

  const stopOverlaySlideshow = () => {
    if (overlaySlideTimer) {
      clearInterval(overlaySlideTimer);
      overlaySlideTimer = null;
    }
  };

  const closeOverlay = () => {
    stopOverlaySlideshow();
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    overlay.setAttribute("aria-hidden", "true");
    lastOpenedBtn?.focus({ preventScroll: true });
  };

  document.querySelectorAll("[data-project-overlay]").forEach((btn) => {
    const id = btn.getAttribute("data-project-overlay");
    if (!id || !PROJECT_OVERLAYS[id]) return;
    const card = btn.closest("[data-overlay-card]");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      lastOpenedBtn = btn;
      populateOverlay(id);
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      if (state.reduceMotion) {
        overlay.classList.add("is-open");
        startOverlaySlideshow(id);
        requestAnimationFrame(() => closeBtn?.focus({ preventScroll: true }));
        return;
      }

      if (card) card.classList.add("card-fly-out");
      const onFlyOutDone = () => {
        if (card) card.classList.remove("card-fly-out");
        overlay.classList.add("is-open");
        card?.removeEventListener("animationend", onFlyOutDone);
        startOverlaySlideshow(id);
        closeBtn?.focus({ preventScroll: true });
      };
      card?.addEventListener("animationend", onFlyOutDone);
    });
  });

  closeBtn?.addEventListener("click", closeOverlay);
  backdrop?.addEventListener("click", closeOverlay);

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) {
      closeOverlay();
    }
  });
}

function setupCardSlideshows() {
  document.querySelectorAll('.card-slideshow').forEach(media => {
    const card = media.closest('.card');
    const slides  = media.querySelectorAll('.slide');
    const dots    = media.querySelectorAll('.slide-dot');
    const btnPrev = media.querySelector('.slide-arrow-prev');
    const btnNext = media.querySelector('.slide-arrow-next');
    if (slides.length < 2) return;

    let idx          = 0;
    let timer        = null;
    let userActed    = false;

    function goTo(n) {
      slides[idx].classList.remove('active');
      dots[idx] && dots[idx].classList.remove('active');
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add('active');
      dots[idx] && dots[idx].classList.add('active');
    }

    function startAuto() {
      if (timer) return;
      timer = setInterval(() => goTo(idx + 1), 2200);
    }

    function stopAuto() {
      clearInterval(timer);
      timer = null;
    }

    const hoverTarget = card || media;
    hoverTarget.addEventListener('mouseenter', () => {
      if (!userActed) startAuto();
    });

    hoverTarget.addEventListener('mouseleave', () => {
      stopAuto();
      userActed = false;
      goTo(0);
    });

    if (btnPrev) {
      btnPrev.addEventListener('click', e => {
        e.stopPropagation();
        stopAuto();
        userActed = true;
        goTo(idx - 1);
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', e => {
        e.stopPropagation();
        stopAuto();
        userActed = true;
        goTo(idx + 1);
      });
    }
  });
}

function main() {
  setupNavbar();
  setupReveal();
  setupHeroButton();
  setFooterYear();
  setupLoopVideos();
  setYouTubeLink();
  initThreeBackground();
  initNodeNetwork();
  setupCardTilt();
  setupMagneticButtons();
  setupHeroTextParallax();
  setupCustomCursor();
  setupProjectOverlays();
  setupCardSlideshows();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}

