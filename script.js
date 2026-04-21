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

function setupAboutVideoTapAudio() {
  document.querySelectorAll("video[data-tap-audio]").forEach((video) => {
    const wrap = video.closest(".about-photo-video");
    if (!wrap) return;

    video.muted = true;

    const syncUi = () => {
      const soundOn = !video.muted;
      wrap.classList.toggle("is-audio-on", soundOn);
      video.setAttribute(
        "aria-label",
        soundOn ? "Intro video - tap to mute" : "Intro video - tap to turn sound on",
      );
    };

    syncUi();

    const toggle = (e) => {
      e.preventDefault();
      video.muted = !video.muted;
      if (!video.muted) {
        video.play().catch(() => {});
      }
      syncUi();
    };

    video.addEventListener("click", toggle);
    video.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        toggle(e);
      }
    });
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

  // Palette - green / blue / teal / soft-white only
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
  // Creative flair: click shockwaves + rare shooting-star meteors
  let shockwaves = [];          // { x, y, age, maxAge, maxR, col }
  let meteors = [];             // { x, y, vx, vy, life, maxLife, col, trail }
  let nextMeteorAt = 600;       // spawn first meteor ~10s in (t is frame-count, ~60fps)

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
      // Diamond - hollow with bright fill
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
      ? null // not standard - do it with arc instead
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

    // Click anywhere in the hero (not on an interactive element) -> shockwave
    heroEl.addEventListener("pointerdown", (e) => {
      // Don't fire when clicking buttons, links, the profile photo area, etc.
      if (e.target && e.target.closest && e.target.closest("a,button,input,textarea,video,[data-scroll],[data-youtube]")) return;
      const r = canvas.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      // Ignore clicks outside the visible canvas bounds
      if (sx < 0 || sy < 0 || sx > W || sy > H) return;
      const palette = [C.green, C.blue, C.teal];
      shockwaves.push({
        x: sx,
        y: sy,
        age: 0,
        maxAge: 70,               // ~1.2s at 60fps
        maxR: Math.max(W, H) * 0.55,
        col: palette[Math.floor(Math.random() * palette.length)],
      });
      if (shockwaves.length > 4) shockwaves.shift(); // cap for perf
    }, { passive: true });
  }

  // ── meteor helpers ───────────────────────────────────────────────────────────

  function spawnMeteor() {
    // Diagonal streak from off-screen (top or sides) going down-right or down-left
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -60 : W + 60;
    const startY = rand(-40, H * 0.45);
    const speed  = rand(7, 11);
    const ang    = fromLeft ? rand(0.22, 0.42) : Math.PI - rand(0.22, 0.42); // mostly downward-inward
    const palette = [C.green, C.blue, C.teal, C.white];
    meteors.push({
      x: startX,
      y: startY,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: 0,
      maxLife: 110,
      col: palette[Math.floor(Math.random() * palette.length)],
      trail: [],                  // recent positions
    });
  }

  function updateMeteors() {
    if (t >= nextMeteorAt) {
      spawnMeteor();
      // Next meteor in ~8-15s (at ~60fps)
      nextMeteorAt = t + Math.floor(rand(480, 900));
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > 14) m.trail.shift();
      m.x += m.vx;
      m.y += m.vy;
      m.life++;
      // Kill if off-screen or dead
      if (m.life > m.maxLife || m.x < -120 || m.x > W + 120 || m.y > H + 120) {
        meteors.splice(i, 1);
      }
    }
  }

  function drawMeteors() {
    for (const m of meteors) {
      const lifeFade = 1 - m.life / m.maxLife;
      // Trail
      for (let i = 0; i < m.trail.length - 1; i++) {
        const p0 = m.trail[i];
        const p1 = m.trail[i + 1];
        const a  = (i / m.trail.length) * 0.9 * lifeFade;
        ctx.strokeStyle = colStr(m.col, a);
        ctx.lineWidth = 1 + (i / m.trail.length) * 2.2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      // Head glow + core
      drawGlow(m.x, m.y, 22, m.col, 0.55 * lifeFade);
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = colStr(C.white, 0.95 * lifeFade);
      ctx.fill();
    }
  }

  // ── shockwave helpers ────────────────────────────────────────────────────────

  function updateShockwaves() {
    // Light up nodes as the ring passes through them
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      const prevProg = sw.age / sw.maxAge;
      sw.age++;
      const prog = sw.age / sw.maxAge;
      const rNow  = prog * sw.maxR;
      const rPrev = prevProg * sw.maxR;
      const band  = Math.max(14, (rNow - rPrev) * 1.5 + 18);
      // Spike lit on nodes inside the wave ring this frame
      for (const n of nodes) {
        const dx = n.x - sw.x;
        const dy = n.y - sw.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > rPrev - band * 0.5 && d < rNow + band * 0.5) {
          const spike = 1.4 * (1 - prog);
          n.lit = Math.max(n.lit ?? 1, 1 + spike);
        }
      }
      if (sw.age >= sw.maxAge) shockwaves.splice(i, 1);
    }
  }

  function drawShockwaves() {
    for (const sw of shockwaves) {
      const prog = sw.age / sw.maxAge;
      const r = prog * sw.maxR;
      const alpha = (1 - prog) * 0.55;
      // Main thin ring
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = colStr(sw.col, alpha * 0.85);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      // Soft inner band
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, r * 0.96, 0, Math.PI * 2);
      ctx.strokeStyle = colStr(sw.col, alpha * 0.35);
      ctx.lineWidth = 4;
      ctx.stroke();
      // Origin flash (first ~15 frames)
      if (sw.age < 15) {
        drawGlow(sw.x, sw.y, 40, sw.col, 0.5 * (1 - sw.age / 15));
      }
    }
  }

  // ── main loop ───────────────────────────────────────────────────────────────

  function draw() {
    t++;
    ctx.clearRect(0, 0, W, H);

    updateShockwaves();
    updateMeteors();

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

      // Helper: draw a short data-packet streak along the edge ending at parametric t_
      const drawStreak = (t_, headCol, tailLen, intensity) => {
        const hx = na.x + dx * t_, hy = na.y + dy * t_;
        // Clamp tail length to edge bounds so streaks don't overshoot the endpoints
        const tailT = Math.max(0, t_ - tailLen);
        const tx = na.x + dx * tailT, ty = na.y + dy * tailT;
        const streak = ctx.createLinearGradient(tx, ty, hx, hy);
        streak.addColorStop(0, colStr(headCol, 0));
        streak.addColorStop(1, colStr(headCol, intensity * 0.9 * edgeDim));
        ctx.strokeStyle = streak;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        // Bright head
        drawGlow(hx, hy, 9, headCol, intensity * 0.55 * edgeDim);
        ctx.beginPath();
        ctx.arc(hx, hy, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = colStr(headCol, intensity * 0.95 * edgeDim);
        ctx.fill();
      };

      // Pulse 1 - bright data packet with streak tail
      drawStreak(e.p1, ca, 0.22, fade);
      // Pulse 2 - dimmer, shorter tail, traveling the other way visually via color
      drawStreak(e.p2, cb, 0.14, fade * 0.7);
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

    // Creative flair layer (above nodes for visibility)
    drawShockwaves();
    drawMeteors();

    requestAnimationFrame(draw);
  }

  draw();
}

/**
 * Experience section only: soft aurora ribbons + staggered dot lattice that bend toward the pointer.
 * Intentionally 2D / non-graph (unlike hero Three.js + node network).
 */
function initExperienceAurora() {
  const section = document.getElementById("experience");
  const canvas = document.getElementById("experience-canvas");
  if (!section || !canvas || state.reduceMotion) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let W = 0;
  let H = 0;
  let tx = 0.5;
  let ty = 0.28;
  let mx = 0.5;
  let my = 0.28;
  let pointerInside = false;
  let targetFx = 1;
  let fx = 1;
  let t = 0;
  let raf = 0;
  let visible = false;

  const UI_DIM_SEL = ".section-head, .tl-card, .reach-globe";

  const LINE_COUNT = 8;
  const SEGS = 36;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, section.clientWidth);
    H = Math.max(1, section.clientHeight);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(section);
  resize();

  window.addEventListener(
    "pointermove",
    (e) => {
      const r = section.getBoundingClientRect();
      const w = r.width || W;
      const h = r.height || H;
      pointerInside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (pointerInside && w > 0 && h > 0) {
        tx = (e.clientX - r.left) / w;
        ty = (e.clientY - r.top) / h;
      }
      if (!pointerInside) {
        targetFx = 1;
      } else {
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        const overUi =
          hit &&
          section.contains(hit) &&
          hit.closest(UI_DIM_SEL);
        targetFx = overUi ? 0.12 : 1;
      }
    },
    { passive: true }
  );

  function scheduleTick() {
    if (raf) return;
    raf = requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver(
    (entries) => {
      const v = entries.some((en) => en.isIntersecting);
      visible = v;
      if (v) scheduleTick();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    { threshold: 0.02, rootMargin: "120px" }
  );
  io.observe(section);

  queueMicrotask(() => {
    const r = section.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight + 160) {
      visible = true;
      scheduleTick();
    }
  });

  function drawHexField(mxx, myy) {
    const gapX = 38;
    const gapY = gapX * 0.86;
    let row = 0;
    for (let py = gapY * 0.5; py < H; py += gapY) {
      const offset = (row % 2) * (gapX * 0.5);
      for (let px = offset + gapX * 0.35; px < W; px += gapX) {
        const d = Math.hypot(px - mxx, py - myy);
        const wobble = 0.02 + 0.015 * Math.sin(t * 0.9 + px * 0.03 + py * 0.02);
        const near = Math.max(0, 1 - d / 240);
        const a = wobble + near * 0.15;
        ctx.fillStyle = `rgba(0, 240, 190, ${Math.min(0.24, a)})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.1 + near * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      row++;
    }
  }

  function drawRibbons(mxx, myy) {
    for (let L = 0; L < LINE_COUNT; L++) {
      const bias = L * 0.31;
      const baseY = H * (0.08 + L * 0.108) + Math.sin(t * 0.35 + bias) * 10;
      ctx.beginPath();
      for (let i = 0; i <= SEGS; i++) {
        const x = (i / SEGS) * W;
        const dx = x - mxx;
        const dy = baseY - myy;
        const dist = Math.sqrt(dx * dx + dy * dy) + 100;
        const attract = (340 / dist) * 42;
        const wave =
          Math.sin(x * 0.011 + t * 1.15 + bias) * (16 + attract * 0.45) +
          Math.cos(x * 0.019 - t * 0.7 + L) * 6;
        const shear = ((mxx - x) / Math.max(W, 1)) * 28 * Math.sin(t * 0.5 + L * 0.4);
        const y = baseY + wave + shear;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(0, baseY - 50, W, baseY + 50);
      g.addColorStop(0, "rgba(0,255,140,0)");
      g.addColorStop(0.32, `rgba(0,255,170,${0.05 + L * 0.012})`);
      g.addColorStop(0.55, `rgba(0,200,255,${0.04 + L * 0.01})`);
      g.addColorStop(1, "rgba(0,100,255,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.15;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(0,255,180,0.42)";
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function tick() {
    raf = 0;
    if (!visible || W < 2) return;
    raf = requestAnimationFrame(tick);

    if (!pointerInside) {
      tx = 0.5;
      ty = 0.26 + Math.sin(t * 0.015) * 0.045;
    }
    mx += (tx - mx) * 0.07;
    my += (ty - my) * 0.07;
    fx += (targetFx - fx) * 0.14;

    const mxx = mx * W;
    const myy = my * H;

    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = fx;
    drawHexField(mxx, myy);
    drawRibbons(mxx, myy);

    const bloomR = Math.min(W, H) * 0.48;
    const bloom = ctx.createRadialGradient(mxx, myy, 0, mxx, myy, bloomR);
    bloom.addColorStop(0, "rgba(0,255,200,0.058)");
    bloom.addColorStop(0.45, "rgba(0,140,255,0.028)");
    bloom.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    t += 0.018;
  }
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
    if (btn.classList.contains("btn-hero-cta")) return;
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
  /** Ring follow: subtle trail without feeling glued (0.11 laggy, 0.42 glued). */
  const RING_FOLLOW = 0.26;
  const RING_SCALE_SMOOTH = 0.18;
  function tick() {
    // Dot snaps to cursor immediately
    dot.style.transform  = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    // Ring follows with light smoothing — stays near the dot, not half a second behind
    rx += (mx - rx) * RING_FOLLOW;
    ry += (my - ry) * RING_FOLLOW;
    ringScale += (scale - ringScale) * RING_SCALE_SMOOTH;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%) scale(${ringScale})`;
    requestAnimationFrame(tick);
  }
  tick();
}

const PROJECT_OVERLAYS = {
  rocket: {
    title: "Rocket Flight Computer PCB",
    desc: "Custom flight-computer PCB designed from scratch for the Arbalest Rocketry Team at York University - avionics, sensor integration (IMU, barometer, GPS), and control systems for competitive rocketry.",
    images: [
      { src: "./images/rocket-pcb-1.png", alt: "Rocket PCB schematic" },
      { src: "./images/rocket-pcb-3d.png", alt: "3D render of rocket flight computer PCB" },
      { src: "./images/rocket-pcb-board-photo.png", alt: "Flight computer PCB - assembled board photo" },
      { src: "./images/rocket-pcb-2.png", alt: "Reviewing rocket PCB schematic" },
      { src: "./images/rocket-pcb-layout.png", alt: "Rocket PCB layout" },
    ],
    takeaways: [
      "Coordinated design reviews with the electrical hardware team to validate schematics and layouts",
      "Designed for high-vibration, low-noise environments - stable power regulation under flight conditions",
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
    desc: "Desktop robot that tracks distraction using Python, a YOLO model for phone detection, and OpenCV - with an Arduino Uno coordinating servos and LED matrix feedback.",
    images: [
      {
        src: "./images/ai-desk-robot-hero.png",
        alt: "Red 3D-printed arm with LED matrix head, servos and harness wiring, annotated A2 and A3",
      },
    ],
    slideshow: false,
    buildVideos: [
      { label: "Prototype 1", url: "https://www.youtube.com/shorts/2TMexDI5K8g" },
      { label: "Prototype 2", url: "https://www.youtube.com/shorts/93z08uypJ_4" },
      { label: "Final Build", url: "https://www.youtube.com/shorts/93z08uypJ_4" },
    ],
    takeaways: [
      "YOLO-based phone detection in Python paired with OpenCV for the vision pipeline",
      "Arduino Uno for servo control and hardware integration with the arm and LED matrix",
      "End-to-end edge-style setup: CV in software, motion and feedback on the microcontroller",
    ],
    tags: ["Arduino Uno", "YOLO", "OpenCV", "Python"],
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
  "battery-packs": {
    title: "Battery Pack Creation & Power Management",
    desc: "Hands-on experience building safe lithium-ion packs - BMS integration, insulation, mechanical retention, and verified connections - plus DC-DC converters to deliver stable rails for embedded and robotics projects.",
    images: [
      {
        src: "./images/battery-pack-1.png",
        alt: "2s2p 18650 pack feeding an XL6009 DC-DC converter module",
      },
      { src: "./images/battery-pack-2.png", alt: "Soldering and assembling 18650 cells into a taped pack" },
      { src: "./images/battery-pack-3.png", alt: "2s2p pack with BMS board and heavy-gauge power wiring" },
      { src: "./images/battery-pack-4.png", alt: "18650 cells beside a high-current DC-DC step-down converter" },
    ],
    takeaways: [
      "Prioritized safety: appropriate BMS, insulation, strain relief, and checks before load",
      "Built multiple packs; centerpiece build is a compact 2s2p 18650 configuration",
      "Routinely used DC-DC step-down converters to match voltage and current needs per project",
      "Sharpened system-level thinking for supply design and component selection",
    ],
    tags: ["BMS", "18650", "DC-DC", "Power Systems"],
  },
  jetech: {
    title: "JETech Labs",
    desc: "Founded a robotics STEAM education startup - built the full product, curriculum, and subscription model from scratch to deliver hands-on electronics kits to youth learners.",
    images: [
      { src: "./images/jetech-jetbox.png", alt: "JetBox Gen 1 kits at JETech Labs" },
      { src: "./images/jetech-1.png", alt: "Building the JetBox robotic arm kit" },
    ],
    slideshow: false,
    externalSite: {
      url: "https://jetechlabs.vercel.app/",
      label: "Take a look - JetBox site",
    },
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
  const siteWrap = document.getElementById("project-overlay-site-wrap");
  const siteLink = document.getElementById("project-overlay-site-link");

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
    if (siteWrap && siteLink) {
      const ext = data.externalSite;
      const url = ext?.url?.trim();
      if (url) {
        siteWrap.hidden = false;
        siteLink.href = url;
        siteLink.textContent = ext.label || "Visit website";
        siteLink.setAttribute("aria-label", `${ext.label || "Visit website"} (opens in new tab)`);
      } else {
        siteWrap.hidden = true;
        siteLink.removeAttribute("href");
        siteLink.textContent = "";
        siteLink.removeAttribute("aria-label");
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

/**
 * Primary card CTAs: brighter styling (CSS) + subtle canvas particle drift.
 * `data-project-overlay` (View Project) or `data-cta-glow` (e.g. Gestura View Demo).
 */
function setupCardViewProjectEnhancements() {
  const anchors = document.querySelectorAll(
    "a.btn.btn-small[data-project-overlay], a.btn.btn-small[data-cta-glow]"
  );
  if (!anchors.length) return;

  if (state.reduceMotion) {
    anchors.forEach((a) => {
      if (a.dataset.ctaEnhanced === "1") return;
      a.dataset.ctaEnhanced = "1";
      a.classList.add("btn-view-project");
      const wrap = document.createElement("span");
      wrap.className = "card-cta-wrap";
      a.parentNode.insertBefore(wrap, a);
      wrap.appendChild(a);
    });
    return;
  }

  const instances = [];

  anchors.forEach((a) => {
    if (a.dataset.ctaEnhanced === "1") return;
    a.dataset.ctaEnhanced = "1";
    a.classList.add("btn-view-project");

    const wrap = document.createElement("span");
    wrap.className = "card-cta-wrap";
    const canvas = document.createElement("canvas");
    canvas.className = "card-cta-canvas";
    canvas.setAttribute("aria-hidden", "true");
    a.parentNode.insertBefore(wrap, a);
    wrap.appendChild(canvas);
    wrap.appendChild(a);

    const inst = {
      wrap,
      canvas,
      lw: 0,
      lh: 0,
      ctx: null,
      cardHover: false,
      particles: Array.from({ length: 14 }, () => ({
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 0.52,
        vy: (Math.random() - 0.5) * 0.52,
        r: 0.65 + Math.random() * 1.25,
        phase: Math.random() * Math.PI * 2,
      })),
    };

    const card = a.closest(".card");
    if (card) {
      card.addEventListener("mouseenter", () => {
        inst.cardHover = true;
      });
      card.addEventListener("mouseleave", () => {
        inst.cardHover = false;
      });
    }

    function syncCanvasSize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = inst.wrap.clientWidth + 36;
      const h = inst.wrap.clientHeight + 24;
      inst.lw = w;
      inst.lh = h;
      inst.canvas.width = Math.round(w * dpr);
      inst.canvas.height = Math.round(h * dpr);
      inst.canvas.style.width = `${w}px`;
      inst.canvas.style.height = `${h}px`;
      const ctx = inst.canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      inst.ctx = ctx;
      for (const p of inst.particles) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
      }
    }

    syncCanvasSize();
    const ro = new ResizeObserver(syncCanvasSize);
    ro.observe(wrap);

    instances.push(inst);
  });

  function tick() {
    requestAnimationFrame(tick);
    for (const inst of instances) {
      const { ctx, lw, lh, particles, cardHover } = inst;
      if (!ctx || lw < 8 || lh < 8) continue;
      const speed = cardHover ? 1 : 0.36;
      const baseA = cardHover ? 0.5 : 0.19;
      ctx.clearRect(0, 0, lw, lh);
      for (const p of particles) {
        p.x += p.vx * speed;
        p.y += p.vy * speed;
        p.phase += 0.034 * speed;
        if (p.x < -4 || p.x > lw + 4 || p.y < -4 || p.y > lh + 4) {
          p.x = Math.random() * lw;
          p.y = Math.random() * lh;
          p.vx = (Math.random() - 0.5) * 0.55;
          p.vy = (Math.random() - 0.5) * 0.55;
        }
        const alpha = baseA * (0.52 + 0.48 * Math.sin(p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 175, ${Math.min(0.82, alpha)})`;
        ctx.fill();
      }
    }
  }

  requestAnimationFrame(tick);
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

    function applySlideState() {
      slides.forEach((slide, i) => {
        slide.classList.remove("active", "slide-before", "slide-after");
        if (i === idx) slide.classList.add("active");
        else if (i < idx) slide.classList.add("slide-before");
        else slide.classList.add("slide-after");
      });
      dots.forEach((dot, i) => dot.classList.toggle("active", i === idx));
    }

    function goTo(n) {
      idx = (n + slides.length) % slides.length;
      applySlideState();
    }

    applySlideState();

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

/**
 * Experience - interactive "reach globe". Wireframe globe, orbital HUD rings,
 * soft star field, surface dots, arcs from Toronto to major cities, stat pins,
 * idle rotation, and drag-to-spin.
 */
function initReachGlobe() {
  const root = document.querySelector("[data-reach-globe]");
  const canvas = document.querySelector("[data-reach-globe-canvas]");
  if (!root || !(canvas instanceof HTMLCanvasElement)) return;
  if (typeof THREE === "undefined") return;

  if (state.reduceMotion) {
    root.classList.add("reach-globe-static");
    return;
  }

  const GREEN = 0x00ff88;
  const BLUE = 0x58b6ff;
  const WHITE = 0xffffff;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 5.2);

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const keyLight = new THREE.PointLight(GREEN, 1.6, 18, 1.7);
  keyLight.position.set(3, 2.5, 3);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(BLUE, 1.0, 20, 1.8);
  rimLight.position.set(-3, -1.5, 2);
  scene.add(rimLight);

  const globe = new THREE.Group();
  scene.add(globe);
  // Initial yaw so the first paint shows stats more evenly (still spins freely).
  globe.rotation.y = 0.42;

  const R = 1.35;

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.992, 48, 32),
    new THREE.MeshStandardMaterial({
      color: 0x04100a,
      metalness: 0.6,
      roughness: 0.35,
      emissive: GREEN,
      emissiveIntensity: 0.18,
    }),
  );
  globe.add(core);

  const latLines = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.SphereGeometry(R, 32, 14)),
    new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.22 }),
  );
  globe.add(latLines);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.12, 48, 32),
    new THREE.MeshBasicMaterial({
      color: GREEN,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  globe.add(atmosphere);

  const latLonToVec3 = (lat, lon, r) => {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    );
  };

  const surface = R * 1.004;
  const dotCount = 220;
  const dotPositions = new Float32Array(dotCount * 3);
  const dotColors = new Float32Array(dotCount * 3);
  const gCol = new THREE.Color(GREEN);
  const bCol = new THREE.Color(BLUE);
  for (let i = 0; i < dotCount; i++) {
    const lat = Math.acos(2 * Math.random() - 1) * (180 / Math.PI) - 90;
    const lon = Math.random() * 360 - 180;
    const v = latLonToVec3(lat, lon, surface);
    dotPositions[i * 3] = v.x;
    dotPositions[i * 3 + 1] = v.y;
    dotPositions[i * 3 + 2] = v.z;
    const c = Math.random() < 0.7 ? gCol : bCol;
    dotColors[i * 3] = c.r;
    dotColors[i * 3 + 1] = c.g;
    dotColors[i * 3 + 2] = c.b;
  }
  const dotsGeo = new THREE.BufferGeometry();
  dotsGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
  dotsGeo.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));
  const dots = new THREE.Points(
    dotsGeo,
    new THREE.PointsMaterial({
      size: 0.022,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  globe.add(dots);

  // Orbital HUD rings - tilted ellipses around the globe; spin separately
  // from the planet for a mission-control read.
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);
  const makeOrbitRing = (inner, outer, opacity) => {
    const geo = new THREE.RingGeometry(inner, outer, 96);
    const mat = new THREE.MeshBasicMaterial({
      color: GREEN,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Mesh(geo, mat);
  };
  const or1 = makeOrbitRing(1.38, 1.435, 0.12);
  or1.rotation.x = Math.PI / 2;
  orbitGroup.add(or1);
  const or2 = makeOrbitRing(1.52, 1.565, 0.09);
  or2.rotation.set(Math.PI / 2.4, 0, Math.PI / 6);
  orbitGroup.add(or2);
  const or3 = makeOrbitRing(1.66, 1.718, 0.07);
  or3.rotation.set(Math.PI / 1.9, Math.PI / 4, -Math.PI / 8);
  orbitGroup.add(or3);

  // Soft star specks behind the globe for depth (parallax follows scene tilt).
  const starCount = 100;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const rad = 9 + Math.random() * 7;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    starPos[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = rad * Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starField = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xc8fff0,
      size: 0.045,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  scene.add(starField);

  const origin = { lat: 43.7, lon: -79.4, label: "Toronto" };
  const destinations = [
    { lat: 28.6, lon: 77.2 },
    { lat: 35.7, lon: 139.7 },
    { lat: 51.5, lon: -0.1 },
    { lat: -33.9, lon: 151.2 },
    { lat: -23.5, lon: -46.6 },
    { lat: 34.0, lon: -118.2 },
    { lat: 52.5, lon: 13.4 },
    { lat: 1.35, lon: 103.8 },
  ];

  const originMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 16, 16),
    new THREE.MeshBasicMaterial({ color: WHITE }),
  );
  originMarker.position.copy(latLonToVec3(origin.lat, origin.lon, surface));
  globe.add(originMarker);

  const arcs = [];
  const arcOrigin = latLonToVec3(origin.lat, origin.lon, R);
  destinations.forEach((dest, i) => {
    const a = arcOrigin.clone();
    const b = latLonToVec3(dest.lat, dest.lon, R);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const arcHeight = 0.45 + a.distanceTo(b) * 0.38;
    mid.normalize().multiplyScalar(R + arcHeight);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);

    const points = curve.getPoints(48);
    const arcGeo = new THREE.BufferGeometry().setFromPoints(points);
    const arcMat = new THREE.LineBasicMaterial({
      color: GREEN,
      transparent: true,
      opacity: 0.35,
    });
    const arcLine = new THREE.Line(arcGeo, arcMat);
    globe.add(arcLine);

    const traveler = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshBasicMaterial({ color: GREEN }),
    );
    globe.add(traveler);

    const destMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 16, 16),
      new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.9 }),
    );
    destMarker.position.copy(b);
    globe.add(destMarker);

    arcs.push({ curve, traveler, destMarker, phase: i * 0.22, arcMat });
  });

  const pulseSeeds = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 14; i++) {
    const y = 1 - (i / 13) * 2;
    const r0 = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * r0 * surface;
    const yy = y * surface;
    const z = Math.sin(theta) * r0 * surface;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 14, 14),
      new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.95 }),
    );
    mesh.position.set(x, yy, z);
    globe.add(mesh);
    pulseSeeds.push({ mesh, phase: (i * 0.7) % (Math.PI * 2) });
  }

  // Pin definitions - channel stats pinned to real lat/lon points on the
  // globe. HTML elements are created below (once `stage` is available)
  // and their screen position & visibility are updated each frame so each
  // stat stays glued to its surface location as the globe rotates.
  // Stat pins spaced around the sphere (staggered lat + ~60° lon steps) so
  // labels are not all bunched on one face as the globe spins.
  const pinDefs = [
    { lat: 43.7, lon: -79.4, value: "360k+", label: "Views", home: true },
    { lat: 52, lon: 38, value: "124+", label: "Videos" },
    { lat: -14, lon: -62, value: "80+", label: "Projects / robots" },
    { lat: 24, lon: 82, value: "4+", label: "Years · content created" },
    { lat: -34, lon: 152, value: "2", label: "Sponsors" },
    { lat: 6, lon: -168, value: "40+", label: "Countries" },
  ];
  const pins = [];
  const tmpVec = new THREE.Vector3();

  const sizeFor = () => {
    const r = canvas.getBoundingClientRect();
    return { w: Math.max(120, Math.floor(r.width)), h: Math.max(120, Math.floor(r.height)) };
  };
  const resize = () => {
    const { w, h } = sizeFor();
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let baseSpinY = 0.0022;
  let baseSpinX = 0.0;
  let velY = baseSpinY;
  let velX = baseSpinX;
  let targetTiltX = 0;
  let currentTiltX = 0;
  let targetTiltY = 0;
  let currentTiltY = 0;

  let isDragging = false;
  let dragMomentumX = 0;
  let dragMomentumY = 0;
  let lastPx = 0;
  let lastPy = 0;
  let pointerId = null;
  let touchedOnce = false;

  const onPointerDown = (e) => {
    isDragging = true;
    pointerId = e.pointerId;
    canvas.setPointerCapture(pointerId);
    lastPx = e.clientX;
    lastPy = e.clientY;
    dragMomentumX = 0;
    dragMomentumY = 0;
    root.classList.add("is-dragging");
    if (!touchedOnce) {
      touchedOnce = true;
      root.classList.add("is-touched");
    }
  };
  const onPointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPx;
    const dy = e.clientY - lastPy;
    lastPx = e.clientX;
    lastPy = e.clientY;
    velY = dx * 0.010;
    velX = dy * 0.010;
    dragMomentumX = velX;
    dragMomentumY = velY;
  };
  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    if (pointerId !== null) {
      try {
        canvas.releasePointerCapture(pointerId);
      } catch (_) {}
      pointerId = null;
    }
    root.classList.remove("is-dragging");
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerUp);

  const stage = canvas.parentElement;
  if (stage) {
    stage.addEventListener("mousemove", (e) => {
      const rect = stage.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetTiltY = nx * 0.55;
      targetTiltX = -ny * 0.35;
    });
    stage.addEventListener("mouseleave", () => {
      targetTiltX = 0;
      targetTiltY = 0;
    });

    pinDefs.forEach((def) => {
      const el = document.createElement("div");
      el.className = "reach-globe-pin reach-globe-pin--stat";
      el.setAttribute("aria-hidden", "true");
      const dot = document.createElement("span");
      dot.className = "reach-globe-pin-dot" + (def.home ? " is-home" : "");
      const text = document.createElement("span");
      text.className = "reach-globe-pin-text";
      if (def.value) {
        const val = document.createElement("b");
        val.className = "reach-globe-pin-value";
        val.textContent = def.value;
        const lbl = document.createElement("span");
        lbl.className = "reach-globe-pin-label";
        lbl.textContent = def.label;
        text.appendChild(val);
        text.appendChild(lbl);
      } else {
        text.textContent = def.label;
      }
      el.appendChild(dot);
      el.appendChild(text);
      stage.appendChild(el);
      // Local-space point on the globe surface (slightly above so the pin
      // sits on top of the sphere instead of clipping through it).
      const local = latLonToVec3(def.lat, def.lon, R * 1.02);
      pins.push({ el, local });
    });
  }

  root.addEventListener("mouseenter", () => root.classList.add("is-hover"));
  root.addEventListener("mouseleave", () => root.classList.remove("is-hover"));

  let frameHandle = 0;
  const tick = (now) => {
    const t = (now || 0) * 0.001;

    if (!isDragging) {
      const easeBack = 0.055;
      velY += (baseSpinY - velY) * easeBack;
      velX += (baseSpinX - velX) * easeBack;
      dragMomentumY *= 0.94;
      dragMomentumX *= 0.94;
      velY += dragMomentumY * 0.035;
      velX += dragMomentumX * 0.035;
    }

    globe.rotation.y += velY;
    globe.rotation.x += velX;

    currentTiltX += (targetTiltX - currentTiltX) * 0.06;
    currentTiltY += (targetTiltY - currentTiltY) * 0.06;

    scene.rotation.x = currentTiltX;
    scene.rotation.y = currentTiltY;

    orbitGroup.rotation.y += 0.00045;
    orbitGroup.rotation.x = Math.sin(t * 0.2) * 0.055;
    orbitGroup.rotation.z = Math.cos(t * 0.15) * 0.03;
    starField.rotation.y += 0.00006;
    starField.material.opacity = 0.36 + Math.sin(t * 0.35) * 0.07;

    atmosphere.material.opacity = 0.04 + Math.sin(t * 1.1) * 0.012;

    arcs.forEach((arc, idx) => {
      const travel = (t * 0.35 + arc.phase) % 1;
      const p = arc.curve.getPoint(travel);
      arc.traveler.position.copy(p);
      const scale = 1 + Math.sin(t * 2.6 + idx) * 0.35;
      arc.traveler.scale.setScalar(scale);
      arc.arcMat.opacity = 0.28 + Math.sin(t * 0.9 + idx * 0.7) * 0.08;
    });

    pulseSeeds.forEach((p, i) => {
      const s = 1 + (Math.sin(t * 1.9 + p.phase) + 1) * 0.55;
      p.mesh.scale.setScalar(s);
      p.mesh.material.opacity = 0.55 + Math.sin(t * 1.9 + p.phase + i) * 0.35;
    });

    dots.material.opacity = 0.72 + Math.sin(t * 0.8) * 0.08;

    renderer.render(scene, camera);

    // Project each tracked pin's 3D point to 2D screen space so the pin
    // stays glued to its lat/lon location as the globe spins. Pins on the
    // far side fade out so they read as "on" the sphere.
    if (pins.length && stage) {
      globe.updateMatrixWorld(true);
      const sw = renderer.domElement.clientWidth;
      const sh = renderer.domElement.clientHeight;
      for (let i = 0; i < pins.length; i++) {
        const pin = pins[i];
        tmpVec.copy(pin.local).applyMatrix4(globe.matrixWorld);
        // Surface-normal test: point faces camera when dot(normal,toCam) > 0.
        const nx = tmpVec.x, ny = tmpVec.y, nz = tmpVec.z;
        const cx = camera.position.x - nx;
        const cy = camera.position.y - ny;
        const cz = camera.position.z - nz;
        const nlen = Math.hypot(nx, ny, nz) || 1;
        const clen = Math.hypot(cx, cy, cz) || 1;
        const facing = (nx * cx + ny * cy + nz * cz) / (nlen * clen);
        tmpVec.project(camera);
        const px = (tmpVec.x * 0.5 + 0.5) * sw;
        const py = (-tmpVec.y * 0.5 + 0.5) * sh;
        pin.el.style.transform =
          "translate3d(" + px.toFixed(1) + "px," + py.toFixed(1) + "px,0) translate(-50%,-50%)";
        const op = facing > 0.08 ? Math.min(1, (facing - 0.08) / 0.22) : 0;
        pin.el.style.opacity = op.toFixed(2);
      }
    }
    frameHandle = requestAnimationFrame(tick);
  };
  frameHandle = requestAnimationFrame(tick);
}

function main() {
  setupNavbar();
  setupReveal();
  setupHeroButton();
  setFooterYear();
  setupLoopVideos();
  setupAboutVideoTapAudio();
  setYouTubeLink();
  initThreeBackground();
  initNodeNetwork();
  initExperienceAurora();
  setupCardTilt();
  setupMagneticButtons();
  setupHeroTextParallax();
  setupCustomCursor();
  setupProjectOverlays();
  setupCardViewProjectEnhancements();
  setupCardSlideshows();
  initReachGlobe();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}

