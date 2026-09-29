// Selected forecast flow, not physical parcel trajectories. No global patches.
export const WIND_LIMITS = Object.freeze({ fps: 24, pixels: 900000, dimension: 1600, particles: 600 });
const FRAME_MS = 1000 / WIND_LIMITS.fps;
const RAD = Math.PI / 180;
const mercator = lat => Math.log(Math.tan(Math.PI / 4 + lat * RAD / 2));
const latitude = y => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / RAD;

export function canvasBudget(width, height) {
  if (!(width > 0 && height > 0) || !Number.isFinite(width + height)) return { width: 0, height: 0, scale: 0 };
  // Cap DPR at one and downsample large screens, including Retina/4K displays.
  const scale = Math.min(1, Math.sqrt(WIND_LIMITS.pixels / (width * height)), WIND_LIMITS.dimension / width, WIND_LIMITS.dimension / height);
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), scale };
}

export function sampleWind(grid, lon, lat, out = [0, 0]) {
  const [west, south, east, north] = grid.bbox;
  if (!Number.isFinite(lon + lat) || lon < west || lon > east || lat < south || lat > north) return null;
  const x = (lon - west) / (east - west) * (grid.nx - 1);
  const y = (north - lat) / (north - south) * (grid.ny - 1);
  const col = Math.min(grid.nx - 2, Math.floor(x)), row = Math.min(grid.ny - 2, Math.floor(y));
  const fx = x - col, fy = y - row, i = row * grid.nx + col;
  // Bilinear interpolation with no per-particle array allocations.
  const a = (1 - fx) * (1 - fy), b = fx * (1 - fy), c = (1 - fx) * fy, d = fx * fy;
  const u = grid.u, v = grid.v, next = i + grid.nx;
  out[0] = a * u[i] + b * u[i + 1] + c * u[next] + d * u[next + 1];
  out[1] = a * v[i] + b * v[i + 1] + c * v[next] + d * v[next + 1];
  return Number.isFinite(out[0]) && Number.isFinite(out[1]) ? out : null;
}

function sampleView(view, x, y, out) {
  const lon = view.grid.bbox[0] + (x - view.left) / view.width * view.lonSpan;
  const lat = latitude(view.north - (y - view.top) / view.height * view.latSpan);
  return sampleWind(view.grid, lon, lat, out);
}

export function createWindRenderer(map, data, env = window) {
  const doc = env.document;
  const canvas = doc.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  canvas.className = 'aeromesh-wind-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', pointerEvents: 'none', top: '0', left: '0' });
  map.getPane('overlayPane').appendChild(canvas);
  const motion = env.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false, zooming = false, dirty = true, inView = true;
  let timer = null, raf = null, lastFrame = null, width = 0, height = 0;
  let views = [], particles = [];
  const vector = [0, 0];
  const random = () => env.Math?.random() ?? Math.random();

  function clear() { ctx.clearRect(0, 0, width, height); }
  function cancel() {
    if (timer !== null) env.clearTimeout(timer);
    if (raf !== null) env.cancelAnimationFrame(raf);
    timer = null; raf = null; lastFrame = null;
  }
  function active() { return !disposed && !doc.hidden && inView && !zooming; }

  function updateView() {
    const size = map.getSize();
    const resized = width !== size.x || height !== size.y;
    width = size.x; height = size.y;
    const budget = canvasBudget(width, height);
    if (resized || !canvas.width) {
      canvas.width = budget.width; canvas.height = budget.height;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(budget.scale, 0, 0, budget.scale, 0, 0);
    }
    const origin = map.containerPointToLayerPoint([0, 0]);
    canvas.style.transform = `translate(${origin.x}px, ${origin.y}px)`;
    const oldViews = new Map(views.map(view => [view.key, view]));
    views = [];
    // Project only regional bounds on map changes, never a screen-sized field.
    const center = map.getCenter().lng;
    for (const grid of data.grids) {
      const [west, south, east, north] = grid.bbox;
      const nearestWorld = Math.round((center - (west + east) / 2) / 360);
      for (let world = nearestWorld - 1; world <= nearestWorld + 1; world++) {
        const nw = map.latLngToContainerPoint([north, west + world * 360]);
        const se = map.latLngToContainerPoint([south, east + world * 360]);
        const left = Math.max(0, nw.x), right = Math.min(width, se.x);
        const top = Math.max(0, nw.y), bottom = Math.min(height, se.y);
        if (right <= left || bottom <= top) continue;
        views.push({ key: `${grid.id}:${world}`, grid, left: nw.x, top: nw.y,
          width: se.x - nw.x, height: se.y - nw.y, clip: { left, right, top, bottom },
          area: (right - left) * (bottom - top), north: mercator(north),
          latSpan: mercator(north) - mercator(south), lonSpan: east - west });
      }
    }
    const newViews = new Map(views.map(view => [view.key, view]));
    // Retain geographic particle positions through pans; zoom/resize reseeds.
    particles = resized ? [] : particles.filter(p => {
      const old = oldViews.get(p.view.key), next = newViews.get(p.view.key);
      if (!old || !next || Math.abs(old.width - next.width) > 0.01) return false;
      p.x += next.left - old.left; p.y += next.top - old.top; p.view = next;
      return p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;
    });
    const totalArea = views.reduce((sum, view) => sum + view.area, 0);
    const count = Math.min(WIND_LIMITS.particles, Math.ceil(totalArea / 1800));
    particles.length = Math.min(particles.length, count);
    while (particles.length < count) {
      let area = random() * totalArea;
      const view = views.find(candidate => (area -= candidate.area) <= 0) || views[views.length - 1];
      const { left, right, top, bottom } = view.clip;
      particles.push({ view, x: left + random() * (right - left), y: top + random() * (bottom - top), age: random() * 4 });
    }
    clear(); dirty = false;
  }

  function respawn(p) {
    const { left, right, top, bottom } = p.view.clip;
    p.x = left + random() * (right - left); p.y = top + random() * (bottom - top); p.age = 0;
  }

  function paint(dt, still) {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(225,242,255,0.85)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const p of particles) {
      p.age += dt;
      if (p.age > 4) respawn(p);
      if (!sampleView(p.view, p.x, p.y, vector)) { respawn(p); continue; }
      const speed = Math.hypot(vector[0], vector[1]);
      if (speed < 0.01) continue;
      // Mercator is locally conformal: east points right, north points up.
      // Pixel speed is illustrative (capped), never physical parcel travel.
      const scale = still ? 10 / speed : Math.min(2, 160 / speed) * dt;
      const x = p.x + vector[0] * scale, y = p.y - vector[1] * scale;
      // Both endpoints stay inside the SAME regional grid: no gap bridging.
      if (x < 0 || x > width || y < 0 || y > height || !sampleView(p.view, x, y, vector)) {
        if (!still) respawn(p);
        continue;
      }
      ctx.moveTo(p.x, p.y); ctx.lineTo(x, y);
      if (still) {
        const angle = Math.atan2(y - p.y, x - p.x);
        ctx.moveTo(x - 3 * Math.cos(angle - 0.5), y - 3 * Math.sin(angle - 0.5));
        ctx.lineTo(x, y); ctx.lineTo(x - 3 * Math.cos(angle + 0.5), y - 3 * Math.sin(angle + 0.5));
      } else { p.x = x; p.y = y; }
    }
    ctx.stroke();
  }

  function requestDraw() {
    if (!active() || raf !== null || timer !== null) return;
    const delay = lastFrame === null ? 0 : Math.max(0, FRAME_MS - (env.performance.now() - lastFrame));
    timer = env.setTimeout(() => {
      timer = null;
      if (active()) raf = env.requestAnimationFrame(draw);
    }, delay);
  }

  function draw(now) {
    raf = null;
    if (!active()) return;
    if (lastFrame !== null && now - lastFrame < FRAME_MS) { requestDraw(); return; }
    if (dirty) updateView();
    const dt = lastFrame === null ? 1 / WIND_LIMITS.fps : Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!particles.length) return;
    if (motion.matches) clear();
    paint(dt, motion.matches);
    if (!motion.matches) requestDraw();
  }

  function changed() { dirty = true; requestDraw(); }
  function visibilityChanged() { cancel(); clear(); dirty = true; requestDraw(); }
  function zoomStart() { zooming = true; canvas.style.visibility = 'hidden'; cancel(); }
  function zoomEnd() { zooming = false; canvas.style.visibility = ''; particles = []; changed(); }
  map.on('move resize', changed);
  map.on('zoomstart', zoomStart);
  map.on('zoomend', zoomEnd);
  doc.addEventListener('visibilitychange', visibilityChanged);
  motion.addEventListener('change', visibilityChanged);
  const observer = env.IntersectionObserver ? new env.IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting);
    visibilityChanged();
  }) : null;
  observer?.observe(map.getContainer());

  function dispose() {
    if (disposed) return;
    disposed = true; cancel(); observer?.disconnect();
    map.off('move resize', changed); map.off('zoomstart', zoomStart); map.off('zoomend', zoomEnd); map.off('unload', dispose);
    doc.removeEventListener('visibilitychange', visibilityChanged); motion.removeEventListener('change', visibilityChanged);
    particles = []; views = []; canvas.remove(); canvas.width = 0; canvas.height = 0;
  }
  map.on('unload', dispose);
  requestDraw();
  return dispose;
}
