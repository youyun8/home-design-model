import * as THREE from 'three';

// Procedural, fully offline textures (no image downloads). Sizes are chosen so that
// 1 uv unit = 1 metre (see core.js box()) and `repeat` = 1 / real tile size in metres.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- periodic value noise -------------------------------------------------------------------
function makeNoise(seed, period = 64) {
  const r = mulberry32(seed);
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = sm(x - xi), fy = sm(y - yi);
    const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
    const a = g[y0 * period + x0], b = g[y0 * period + x1];
    const c = g[y1 * period + x0], d = g[y1 * period + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

function fbm(noise, x, y, oct = 4, lac = 2, gain = 0.5) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += amp * noise(x * f, y * f); norm += amp; amp *= gain; f *= lac; }
  return s / norm;
}

// Seamless (period = 1 in u/v) fractal noise: octave k has 2^k * base lattice cells.
function tileNoise(seed, freq) {
  const r = mulberry32(seed), g = new Float32Array(freq * freq);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const sm = (t) => t * t * (3 - 2 * t);
  return (u, v) => {
    const x = u * freq, y = v * freq, xi = Math.floor(x), yi = Math.floor(y);
    const fx = sm(x - xi), fy = sm(y - yi);
    const x0 = ((xi % freq) + freq) % freq, y0 = ((yi % freq) + freq) % freq, x1 = (x0 + 1) % freq, y1 = (y0 + 1) % freq;
    const a = g[y0 * freq + x0], b = g[y0 * freq + x1], c = g[y1 * freq + x0], d = g[y1 * freq + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}
function tileFbm(seed, base, oct) {
  const ns = [];
  for (let k = 0; k < oct; k++) ns.push(tileNoise(seed + k * 17, base * (1 << k)));
  return (u, v) => { let s = 0, a = 0.5, n = 0; for (let k = 0; k < oct; k++) { s += a * ns[k](u, v); n += a; a *= 0.5; } return s / n; };
}

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTex(canvas, { srgb = true, repeat = [1, 1], aniso = 8, repeatWrap = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeatWrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

// ---------------------------------------------------------------------------------------------
// 120 x 120 cm porcelain tile. Canvas = 2 x 2 tiles = 2.4 m
// ---------------------------------------------------------------------------------------------
export function tile120() {
  const S = 1024, cvs = mk(S, S), bmp = mk(S, S);
  const ctx = cvs.getContext('2d'), bctx = bmp.getContext('2d');
  const img = ctx.createImageData(S, S), bimg = bctx.createImageData(S, S);
  const n1 = makeNoise(11, 64), n2 = makeNoise(23, 64);
  const half = S / 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const tx = x < half ? 0 : 1, ty = y < half ? 0 : 1;
      const off = (tx * 7 + ty * 13) * 3.1;
      const m = fbm(n1, (x / S) * 5 + off, (y / S) * 5 + off, 4);
      const v = fbm(n2, (x / S) * 22 + off, (y / S) * 22 - off, 2);
      // concrete-look: cloudy mottling + fine speckle
      const cloud = (m - 0.5) * 15;
      const speck = (v - 0.5) * 6;
      let r = 218 + cloud + speck, g = 210 + cloud + speck, b = 195 + cloud * 0.9 + speck;
      let bump = 128 + cloud * 0.5 + speck;
      // grout lines (2.5 mm)
      const lx = x % half, ly = y % half;
      const dEdge = Math.min(lx, half - lx, ly, half - ly);
      if (dEdge < 1.6 || lx < 1.2 || ly < 1.2) { r = 206; g = 200; b = 190; bump = 40; }
      else if (dEdge < 3) { const k = (dEdge - 1.6) / 1.4; r -= (1 - k) * 9; g -= (1 - k) * 9; b -= (1 - k) * 9; bump -= (1 - k) * 30; }
      const i = (y * S + x) * 4;
      img.data[i] = clamp255(r); img.data[i + 1] = clamp255(g); img.data[i + 2] = clamp255(b); img.data[i + 3] = 255;
      const bb = clamp255(bump);
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bb; bimg.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0); bctx.putImageData(bimg, 0, 0);
  return { map: toTex(cvs, { repeat: [1 / 2.4, 1 / 2.4] }), bump: toTex(bmp, { srgb: false, repeat: [1 / 2.4, 1 / 2.4] }) };
}

// ---------------------------------------------------------------------------------------------
// Engineered oak planks (Pergo style): 10 planks of 18.4 cm  => canvas 1.84 m x 1.84 m
// grainAlong 'v' = planks run top-bottom in uv space (north-south on floors).
// ---------------------------------------------------------------------------------------------
export function woodPlanks({ hue = 32, sat = 0.42, light = 0.64, seed = 5, planks = 10, plankLen = 1.2, size = 1.84 } = {}) {
  const S = 1024, cvs = mk(S, S), bmp = mk(S, S);
  const c = cvs.getContext('2d'), b = bmp.getContext('2d');
  const r = mulberry32(seed);
  const n = makeNoise(seed + 1, 64);
  b.fillStyle = '#808080'; b.fillRect(0, 0, S, S);
  const pw = S / planks;
  const plankPx = (plankLen / size) * S;
  for (let p = 0; p < planks; p++) {
    let y = -r() * plankPx;
    while (y < S) {
      const len = plankPx * (0.92 + r() * 0.12);
      const hh = hue + (r() - 0.5) * 5, ss = sat + (r() - 0.5) * 0.1, ll = light + (r() - 0.5) * 0.09;
      const x0 = p * pw, y0 = y;
      c.fillStyle = `hsl(${hh},${ss * 100}%,${ll * 100}%)`;
      c.fillRect(x0, y0, pw, len);
      // grain: wavy long strokes
      for (let k = 0; k < 90; k++) {
        const gx = x0 + r() * pw, wob = (r() - 0.5) * 6, ph = r() * 6;
        const dark = r() < 0.55;
        c.strokeStyle = dark ? `rgba(95,62,32,${0.04 + r() * 0.1})` : `rgba(255,236,205,${0.04 + r() * 0.08})`;
        c.lineWidth = 0.6 + r() * 1.8;
        c.beginPath();
        for (let t = 0; t <= len; t += 16) {
          const xx = gx + Math.sin(t * 0.012 + ph) * wob + (n(gx * 0.05, (y0 + t) * 0.004) - 0.5) * 10;
          if (t === 0) c.moveTo(xx, y0 + t); else c.lineTo(xx, y0 + t);
        }
        c.stroke();
      }
      // occasional cathedral / knot
      if (r() < 0.3) {
        const kx = x0 + pw * (0.25 + r() * 0.5), ky = y0 + len * (0.2 + r() * 0.6);
        for (let e = 0; e < 5; e++) {
          c.strokeStyle = `rgba(110,72,40,${0.10 - e * 0.015})`; c.lineWidth = 1.2;
          c.beginPath(); c.ellipse(kx, ky, pw * (0.07 + e * 0.05), 30 + e * 28, 0, 0, Math.PI * 2); c.stroke();
        }
      }
      // edge grooves (V-groove)
      c.fillStyle = 'rgba(60,38,20,0.55)'; c.fillRect(x0, y0, 1.6, len); c.fillRect(x0 + pw - 1.2, y0, 1.2, len);
      c.fillStyle = 'rgba(60,38,20,0.5)'; c.fillRect(x0, y0, pw, 1.6);
      b.fillStyle = '#202020'; b.fillRect(x0, y0, 2, len); b.fillRect(x0 + pw - 1.5, y0, 1.5, len); b.fillRect(x0, y0, pw, 2);
      y += len;
    }
  }
  // wrap overdraw for the first plank row at y<0 handled by fillRect clip (canvas clips automatically)
  const rep = 1 / size;
  return { map: toTex(cvs, { repeat: [rep, rep] }), bump: toTex(bmp, { srgb: false, repeat: [rep, rep] }) };
}

// continuous veneer (cabinet faces): vertical grain, 1.2 m
export function veneer({ hue = 33, sat = 0.40, light = 0.66, seed = 9 } = {}) {
  const S = 512, cvs = mk(S, S);
  const c = cvs.getContext('2d');
  const r = mulberry32(seed), n = makeNoise(seed + 3, 64);
  c.fillStyle = `hsl(${hue},${sat * 100}%,${light * 100}%)`; c.fillRect(0, 0, S, S);
  for (let k = 0; k < 260; k++) {
    const gx = r() * S, wob = (r() - 0.5) * 9, ph = r() * 6;
    c.strokeStyle = r() < 0.55 ? `rgba(100,66,36,${0.03 + r() * 0.08})` : `rgba(255,238,210,${0.03 + r() * 0.07})`;
    c.lineWidth = 0.5 + r() * 1.6;
    c.beginPath();
    for (let t = 0; t <= S; t += 16) {
      const xx = gx + Math.sin(t * 0.02 + ph) * wob + (n(gx * 0.05, t * 0.01) - 0.5) * 8;
      if (t === 0) c.moveTo(xx, t); else c.lineTo(xx, t);
    }
    c.stroke();
  }
  return { map: toTex(cvs, { repeat: [1 / 1.2, 1 / 1.2] }) };
}

// ---------------------------------------------------------------------------------------------
// Hexagon tile 17.6 x 21 cm (降落塵區). Pointy-top hexagons, flat-to-flat 17.6 cm.
// One texture period = 6 x 8 hexagons with random colour mix (1.056 x 1.219 m)
// ---------------------------------------------------------------------------------------------
export function hexTile() {
  const W = 0.176, R = W / Math.sqrt(3), COLS = 6, ROWS = 8;
  const sizeW = COLS * W, sizeH = ROWS * 1.5 * R;
  const PPM = 1100;
  const cw = Math.round(sizeW * PPM), ch = Math.round(sizeH * PPM);
  const cvs = mk(cw, ch), c = cvs.getContext('2d');
  const bmp = mk(cw, ch), b = bmp.getContext('2d');
  const r = mulberry32(77), n = makeNoise(31, 32);
  const pal = [[150, 150, 144, 0.20], [108, 118, 112, 0.20], [92, 102, 112, 0.18], [124, 112, 98, 0.12], [86, 92, 90, 0.14], [168, 166, 158, 0.10], [96, 82, 74, 0.06]];
  const pick = () => { let t = r(), a = 0; for (const p of pal) { a += p[3]; if (t <= a) return p; } return pal[0]; };
  const colors = [];
  for (let i = 0; i < ROWS * COLS; i++) colors.push(pick());
  c.fillStyle = '#2f3130'; c.fillRect(0, 0, cw, ch);
  b.fillStyle = '#202020'; b.fillRect(0, 0, cw, ch);
  const rad = R * PPM - 2.6; // minus half grout
  const path = (ctx, cx, cy) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + rad * Math.cos(a), y = cy + rad * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  for (let row = -1; row <= ROWS; row++) {
    for (let col = -1; col <= COLS; col++) {
      const cx = (col + (((row % 2) + 2) % 2 ? 0.5 : 0)) * W * PPM;
      const cy = row * 1.5 * R * PPM;
      const p = colors[(((row % ROWS) + ROWS) % ROWS) * COLS + (((col % COLS) + COLS) % COLS)];
      const v = (n(cx * 0.03, cy * 0.03) - 0.5) * 22;
      c.fillStyle = `rgb(${clamp255(p[0] + v)},${clamp255(p[1] + v)},${clamp255(p[2] + v)})`;
      path(c, cx, cy); c.fill();
      b.fillStyle = '#b4b4b4'; path(b, cx, cy); b.fill();
    }
  }
  return {
    map: toTex(cvs, { repeat: [1 / sizeW, 1 / sizeH] }),
    bump: toTex(bmp, { srgb: false, repeat: [1 / sizeW, 1 / sizeH] }),
  };
}

// ---------------------------------------------------------------------------------------------
// Terrazzo
// ---------------------------------------------------------------------------------------------
export function terrazzo({ base = [205, 198, 188], chips, tileW = 0.6, tileH = 0.6, cols = 2, rows = 2, seed = 3, density = 2600, grout = [176, 170, 162], chipScale = 1 } = {}) {
  const sizeW = tileW * cols, sizeH = tileH * rows;
  const S = 1024, W = S, H = Math.round(S * sizeH / sizeW);
  const cvs = mk(W, H), c = cvs.getContext('2d');
  const bmp = mk(W, H), b = bmp.getContext('2d');
  const r = mulberry32(seed), n = makeNoise(seed + 1, 64);
  const colors = chips || [[168, 160, 150], [233, 229, 221], [190, 178, 160], [140, 132, 124]];
  // base with cloud
  const img = c.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = (fbm(n, x / W * 6, y / H * 6, 3) - 0.5) * 18;
    const i = (y * W + x) * 4;
    img.data[i] = clamp255(base[0] + v); img.data[i + 1] = clamp255(base[1] + v); img.data[i + 2] = clamp255(base[2] + v); img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  b.fillStyle = '#808080'; b.fillRect(0, 0, W, H);
  const pxm = W / sizeW; // px per metre
  for (let i = 0; i < density; i++) {
    const x = r() * W, y = r() * H;
    const big = r() < 0.06;
    const rad = (big ? 7 + r() * 9 : 1.6 + r() * 5.4) * chipScale * (pxm / 850);
    const col = colors[(r() * colors.length) | 0];
    const k = (r() - 0.5) * 22;
    c.fillStyle = `rgb(${clamp255(col[0] + k)},${clamp255(col[1] + k)},${clamp255(col[2] + k)})`;
    const nv = 5 + ((r() * 3) | 0), rot = r() * 6.28;
    c.beginPath();
    for (let j = 0; j < nv; j++) {
      const a = rot + (j / nv) * Math.PI * 2, rr = rad * (0.6 + r() * 0.6);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8;
      if (j === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath(); c.fill();
  }
  // grout
  const gw = Math.max(2, 0.003 * pxm);
  c.fillStyle = `rgb(${grout.join(',')})`; b.fillStyle = '#303030';
  for (let i = 0; i <= cols; i++) { const x = (i / cols) * W - gw / 2; c.fillRect(x, 0, gw, H); b.fillRect(x, 0, gw, H); }
  for (let j = 0; j <= rows; j++) { const y = (j / rows) * H - gw / 2; c.fillRect(0, y, W, gw); b.fillRect(0, y, W, gw); }
  return {
    map: toTex(cvs, { repeat: [1 / sizeW, 1 / sizeH] }),
    bump: toTex(bmp, { srgb: false, repeat: [1 / sizeW, 1 / sizeH] }),
  };
}

// ---------------------------------------------------------------------------------------------
// 司曼特 cement-like paint (very subtle clouds)
// ---------------------------------------------------------------------------------------------
export function plaster({ base = [214, 209, 201], seed = 8, amp = 16, scale = 2.0 } = {}) {
  const S = 1024, cvs = mk(S, S), bmp = mk(S, S);
  const c = cvs.getContext('2d'), b = bmp.getContext('2d');
  const img = c.createImageData(S, S), bimg = b.createImageData(S, S);
  const cloud = tileFbm(seed, 4, 5), grain = tileFbm(seed + 5, 64, 2);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const m = cloud(x / S, y / S) - 0.5;
    const t = grain(x / S, y / S) - 0.5;
    const v = m * amp * 2 + t * 6;
    const i = (y * S + x) * 4;
    img.data[i] = clamp255(base[0] + v); img.data[i + 1] = clamp255(base[1] + v); img.data[i + 2] = clamp255(base[2] + v * 0.95); img.data[i + 3] = 255;
    const bb = clamp255(128 + t * 90 + m * 40);
    bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bb; bimg.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0); b.putImageData(bimg, 0, 0);
  return { map: toTex(cvs, { repeat: [1 / scale, 1 / scale] }), bump: toTex(bmp, { srgb: false, repeat: [1 / scale, 1 / scale] }) };
}

// ---------------------------------------------------------------------------------------------
// Kitchen wall tile 30 x 60 cm, running bond. Canvas 0.6 x 0.6 m
// ---------------------------------------------------------------------------------------------
export function wallTile({ base = [232, 229, 221], w = 0.6, h = 0.3, seed = 4, grout = [196, 192, 184] } = {}) {
  const S = 512, cvs = mk(S, S), c = cvs.getContext('2d');
  const bmp = mk(S, S), b = bmp.getContext('2d');
  const r = mulberry32(seed);
  const sizeW = w, sizeH = h * 2;
  const W = S, H = Math.round(S * sizeH / sizeW);
  cvs.height = H; bmp.height = H;
  const ph = H / 2;
  c.fillStyle = `rgb(${grout.join(',')})`; c.fillRect(0, 0, W, H);
  b.fillStyle = '#202020'; b.fillRect(0, 0, W, H);
  for (let row = 0; row < 2; row++) {
    const off = row ? W / 2 : 0;
    for (let k = -1; k <= 1; k++) {
      const x0 = off + k * W, v = (r() - 0.5) * 8;
      c.fillStyle = `rgb(${clamp255(base[0] + v)},${clamp255(base[1] + v)},${clamp255(base[2] + v)})`;
      c.fillRect(x0 + 2, row * ph + 2, W - 4, ph - 4);
      b.fillStyle = '#c0c0c0'; b.fillRect(x0 + 2, row * ph + 2, W - 4, ph - 4);
    }
  }
  return {
    map: toTex(cvs, { repeat: [1 / sizeW, 1 / sizeH] }),
    bump: toTex(bmp, { srgb: false, repeat: [1 / sizeW, 1 / sizeH] }),
  };
}

// ---------------------------------------------------------------------------------------------
// Fabric weave bump (0.3 m cell)
// ---------------------------------------------------------------------------------------------
export function fabric({ base = [186, 178, 166], seed = 2 } = {}) {
  const S = 256, cvs = mk(S, S), c = cvs.getContext('2d');
  const bmp = mk(S, S), b = bmp.getContext('2d');
  const n = makeNoise(seed, 32);
  const img = c.createImageData(S, S), bimg = b.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const wx = Math.sin(x * 1.57), wy = Math.sin(y * 1.57);
    const wv = (wx * wy) * 0.5 + 0.5;
    const nn = fbm(n, x / 8, y / 8, 3) - 0.5;
    const v = (wv - 0.5) * 22 + nn * 28;
    const i = (y * S + x) * 4;
    img.data[i] = clamp255(base[0] + v); img.data[i + 1] = clamp255(base[1] + v); img.data[i + 2] = clamp255(base[2] + v); img.data[i + 3] = 255;
    const bb = clamp255(128 + wv * 90 - 45 + nn * 40);
    bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bb; bimg.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0); b.putImageData(bimg, 0, 0);
  return { map: toTex(cvs, { repeat: [3, 3] }), bump: toTex(bmp, { srgb: false, repeat: [3, 3] }) };
}

// vertical flutes (長虹玻) normal map. One tile = 8 flutes.
export function flutedNormal() {
  const W = 256, H = 4, cvs = mk(W, H), c = cvs.getContext('2d');
  const img = c.createImageData(W, H);
  const ribs = 8;
  for (let x = 0; x < W; x++) {
    const t = (x / W) * ribs;
    const f = t - Math.floor(t);
    // cylindrical flute: slope varies linearly across the rib
    const nx = (f - 0.5) * 1.5;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      img.data[i] = clamp255((nx * 0.5 + 0.5) * 255); img.data[i + 1] = 128; img.data[i + 2] = clamp255((nz * 0.5 + 0.5) * 255); img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  const t = toTex(cvs, { srgb: false, repeat: [1, 1] });
  t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------------------------
// Tiles taken from the site photos
// ---------------------------------------------------------------------------------------------
/** Glossy white large-format wall tile with fine grey flecks (bathroom walls). One canvas = 2 x 1 tiles of 60 x 120 cm laid vertically. */
export function bathWallTile({ seed = 31 } = {}) {
  const W = 1024, H = 1024, sizeW = 1.2, sizeH = 1.2;
  const cvs = mk(W, H), c = cvs.getContext('2d'), r = mulberry32(seed);
  c.fillStyle = '#f1f1ef'; c.fillRect(0, 0, W, H);
  const n = tileFbm(seed, 3, 4);
  const img = c.getImageData(0, 0, W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = (n(x / W, y / H) - 0.5) * 9, i = (y * W + x) * 4;
    img.data[i] = clamp255(241 + v); img.data[i + 1] = clamp255(241 + v); img.data[i + 2] = clamp255(239 + v);
  }
  c.putImageData(img, 0, 0);
  for (let i = 0; i < 2600; i++) {
    const x = r() * W, y = r() * H, rad = 0.8 + r() * r() * 3.4;
    c.fillStyle = r() < 0.7 ? `rgba(196,198,200,${0.25 + r() * 0.4})` : `rgba(220,214,206,${0.25 + r() * 0.35})`;
    c.beginPath(); c.ellipse(x, y, rad, rad * (0.6 + r() * 0.5), r() * 6.28, 0, 6.28); c.fill();
  }
  // joints: two 60 cm columns, one 120 cm row
  c.fillStyle = 'rgba(176,178,178,0.9)';
  for (let k = 0; k <= 2; k++) c.fillRect(k * W / 2 - 1, 0, 2, H);
  c.fillRect(0, H - 1, W, 2); c.fillRect(0, 0, W, 1);
  return { map: toTex(cvs, { repeat: [1 / sizeW, 1 / sizeH] }) };
}

/** Terrazzo accent (white body, orange-brown / navy / grey chips, faint 10 cm grid). */
export function terrazzoAccent({ seed = 12 } = {}) {
  const W = 800, H = 1200, sizeW = 0.8, sizeH = 1.2, pxm = W / sizeW;
  const cvs = mk(W, H), c = cvs.getContext('2d'), r = mulberry32(seed);
  c.fillStyle = '#efeeea'; c.fillRect(0, 0, W, H);
  const pal = [[176, 112, 58], [196, 134, 72], [150, 92, 52], [54, 62, 80], [78, 86, 104], [108, 110, 116], [188, 188, 190], [218, 214, 206]];
  const wts = [0.16, 0.12, 0.08, 0.18, 0.1, 0.14, 0.12, 0.1];
  const pick = () => { let t = r(), a = 0; for (let i = 0; i < pal.length; i++) { a += wts[i]; if (t <= a) return pal[i]; } return pal[0]; };
  for (let i = 0; i < 1500; i++) {
    const x = r() * W, y = r() * H, rad = (0.35 + r() * r() * 1.0 + (r() < 0.06 ? 0.55 : 0)) * 0.01 * pxm; // 0.35 .. 1.9 cm
    const col = pick(), k = (r() - 0.5) * 20;
    c.fillStyle = `rgb(${clamp255(col[0] + k)},${clamp255(col[1] + k)},${clamp255(col[2] + k)})`;
    const nv = 5 + ((r() * 3) | 0), rot = r() * 6.28;
    c.beginPath();
    for (let j = 0; j < nv; j++) { const a = rot + (j / nv) * 6.28, rr = rad * (0.6 + r() * 0.55); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8; if (j === 0) c.moveTo(px, py); else c.lineTo(px, py); }
    c.closePath(); c.fill();
  }
  c.strokeStyle = 'rgba(190,190,188,0.35)'; c.lineWidth = 1;
  for (let x = 0; x <= W; x += 0.1 * pxm) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y <= H; y += 0.1 * pxm) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  return { map: toTex(cvs, { repeat: [1 / sizeW, 1 / sizeH] }) };
}

/** Porcelain with fine pale speckles and thin dark joints (bathroom floor 60 x 60). */
export function speckleTile({ tw = 0.6, th = 0.6, cols = 2, rows = 2, base = [218, 216, 210], speck = [[236, 234, 229], [196, 193, 186], [208, 205, 197]], grout = [58, 58, 60], gw = 0.003, density = 7000, seed = 21 } = {}) {
  const sizeW = tw * cols, sizeH = th * rows, W = 1024, H = Math.round(W * sizeH / sizeW), pxm = W / sizeW;
  const cvs = mk(W, H), c = cvs.getContext('2d'), r = mulberry32(seed);
  const n = tileFbm(seed, 4, 4);
  const img = c.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = (n(x / W, y / H) - 0.5) * 12, i = (y * W + x) * 4;
    img.data[i] = clamp255(base[0] + v); img.data[i + 1] = clamp255(base[1] + v); img.data[i + 2] = clamp255(base[2] + v); img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  for (let i = 0; i < density; i++) {
    const x = r() * W, y = r() * H, rad = (0.15 + r() * r() * 1.1) * 0.01 * pxm, col = speck[(r() * speck.length) | 0];
    c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.5 + r() * 0.5})`;
    c.beginPath(); c.ellipse(x, y, rad, rad * (0.55 + r() * 0.5), r() * 6.28, 0, 6.28); c.fill();
  }
  const g = Math.max(2, gw * pxm);
  c.fillStyle = `rgb(${grout.join(',')})`;
  for (let i = 0; i <= cols; i++) c.fillRect((i / cols) * W - g / 2, 0, g, H);
  for (let j = 0; j <= rows; j++) c.fillRect(0, (j / rows) * H - g / 2, W, g);
  const bmp = mk(W, H), b = bmp.getContext('2d'); b.fillStyle = '#9a9a9a'; b.fillRect(0, 0, W, H); b.fillStyle = '#202020';
  for (let i = 0; i <= cols; i++) b.fillRect((i / cols) * W - g / 2, 0, g, H);
  for (let j = 0; j <= rows; j++) b.fillRect(0, (j / rows) * H - g / 2, W, g);
  return { map: toTex(cvs, { repeat: [1 / sizeW, 1 / sizeH] }), bump: toTex(bmp, { srgb: false, repeat: [1 / sizeW, 1 / sizeH] }) };
}

/** Narrow "stick" brick tile, running bond (balcony walls). rowH / len in metres. */
export function stickBrick({ base = [78, 76, 76], grout = [58, 58, 58], rowH = 0.046, len = 0.24, var_ = 16, ridged = true, seed = 5 } = {}) {
  const rows = 6, sizeW = len * 2, sizeH = rowH * rows, ppm = 1800;
  const W = Math.round(sizeW * ppm), H = Math.round(sizeH * ppm), ph = H / rows;
  const cvs = mk(W, H), c = cvs.getContext('2d'), bmp = mk(W, H), b = bmp.getContext('2d'), r = mulberry32(seed);
  c.fillStyle = `rgb(${grout.join(',')})`; c.fillRect(0, 0, W, H);
  b.fillStyle = '#303030'; b.fillRect(0, 0, W, H);
  const g = 0.003 * ppm;
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * (len * ppm) / 2;
    for (let k = -1; k <= 2; k++) {
      const x0 = off + k * len * ppm, v = (r() - 0.5) * var_ * 2;
      c.fillStyle = `rgb(${clamp255(base[0] + v)},${clamp255(base[1] + v)},${clamp255(base[2] + v)})`;
      c.fillRect(x0 + g / 2, row * ph + g / 2, len * ppm - g, ph - g);
      b.fillStyle = '#c8c8c8'; b.fillRect(x0 + g / 2, row * ph + g / 2, len * ppm - g, ph - g);
      if (ridged) { // horizontal ridges across each tile
        for (let q = 1; q < 4; q++) { c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(x0 + g / 2, row * ph + q * ph / 4, len * ppm - g, 1.2); b.fillStyle = '#707070'; b.fillRect(x0 + g / 2, row * ph + q * ph / 4, len * ppm - g, 1.6); }
      }
    }
  }
  return { map: toTex(cvs, { repeat: [1 / sizeW, 1 / sizeH] }), bump: toTex(bmp, { srgb: false, repeat: [1 / sizeW, 1 / sizeH] }) };
}

/** Linear aluminium slat ceiling, 10 cm panels. */
export function slatCeiling() {
  const size = 0.4, W = 512, cvs = mk(W, W), c = cvs.getContext('2d');
  const pw = W / 4;
  for (let i = 0; i < 4; i++) {
    const gr = c.createLinearGradient(i * pw, 0, (i + 1) * pw, 0);
    gr.addColorStop(0, '#c9ccce'); gr.addColorStop(0.5, '#d4d7d9'); gr.addColorStop(1, '#c4c7c9');
    c.fillStyle = gr; c.fillRect(i * pw, 0, pw, W);
    c.fillStyle = '#8f9396'; c.fillRect(i * pw, 0, 3, W);
  }
  return { map: toTex(cvs, { repeat: [1 / size, 1 / size] }) };
}

// ---------------------------------------------------------------------------------------------
// Sky (equirectangular) — day / dusk / night, doubles as environment lighting.
// `sun` is the world direction towards the sun (+x east, +z south, +y up).
// ---------------------------------------------------------------------------------------------
export function skyTexture(kind, sun, W = 2048) {
  const H = W / 2, cvs = mk(W, H), c = cvs.getContext('2d');
  const img = c.createImageData(W, H);
  const pal = {
    day: { zen: [74, 134, 212], hor: [196, 222, 246], glow: [255, 244, 214], ground: [150, 156, 160], bld: [132, 146, 164] },
    dusk: { zen: [44, 62, 118], hor: [248, 160, 112], glow: [255, 190, 120], ground: [60, 56, 70], bld: [64, 58, 80] },
    night: { zen: [5, 9, 24], hor: [26, 36, 64], glow: [150, 168, 220], ground: [14, 16, 24], bld: [10, 12, 20] },
  }[kind];
  const n = makeNoise(41, 64);
  const r = mulberry32(99);
  const sky = new Float32Array(W);
  let x = 0;
  while (x < W) {
    const bw = (18 + r() * 60) * (W / 2048), bh = 0.012 + r() * r() * 0.13 + fbm(n, x / W * 6, 0.3, 3) * 0.05;
    for (let k = 0; k < bw && x + k < W; k++) sky[x + k] = bh;
    x += bw;
  }
  const sd = [sun.x, sun.y, sun.z];
  const rnd = mulberry32(5);
  for (let y = 0; y < H; y++) {
    const el = (0.5 - y / H) * Math.PI;
    const ce = Math.cos(el), dy = Math.sin(el);
    for (let xx = 0; xx < W; xx++) {
      const u = xx / W, az = (u - 0.5) * Math.PI * 2;
      const dx = ce * Math.cos(az), dz = ce * Math.sin(az);
      let rr, gg, bb;
      if (dy >= 0) {
        const t = Math.pow(dy, 0.55);
        rr = pal.hor[0] + (pal.zen[0] - pal.hor[0]) * t; gg = pal.hor[1] + (pal.zen[1] - pal.hor[1]) * t; bb = pal.hor[2] + (pal.zen[2] - pal.hor[2]) * t;
        const dot = dx * sd[0] + dy * sd[1] + dz * sd[2];
        const gl = kind === 'night'
          ? Math.pow(Math.max(0, dot), 1500) * 3 + Math.pow(Math.max(0, dot), 40) * 0.05
          : Math.pow(Math.max(0, dot), 22) * 0.38 + Math.pow(Math.max(0, dot), 700) * 4;
        rr += pal.glow[0] * gl; gg += pal.glow[1] * gl; bb += pal.glow[2] * gl;
        if (kind !== 'night') {
          const cl = fbm(n, u * 18, dy * 24 + 3, 5);
          const cm = Math.max(0, cl - 0.53) * 3.4 * (1 - dy * 0.6) * (kind === 'dusk' ? 0.7 : 1);
          rr += ((kind === 'dusk' ? 255 : 255) - rr) * cm * 0.8; gg += ((kind === 'dusk' ? 190 : 255) - gg) * cm * 0.8; bb += ((kind === 'dusk' ? 170 : 255) - bb) * cm * 0.85;
        } else if (rnd() < 0.0008 * (0.3 + dy)) { rr += 140; gg += 140; bb += 160; }
        const hh = sky[xx];
        if (dy < hh) {
          const fade = 1 - (dy / hh) * 0.25;
          rr = pal.bld[0] * fade + (pal.hor[0] - pal.bld[0]) * 0.32; gg = pal.bld[1] * fade + (pal.hor[1] - pal.bld[1]) * 0.32; bb = pal.bld[2] * fade + (pal.hor[2] - pal.bld[2]) * 0.32;
          if (kind !== 'day' && ((xx * 7 + y * 13) % (kind === 'night' ? 11 : 19) === 0)) { rr = 255; gg = 214; bb = 140; }
        }
      } else {
        const t = Math.min(1, -dy * 4);
        rr = pal.hor[0] * (1 - t) + pal.ground[0] * t; gg = pal.hor[1] * (1 - t) + pal.ground[1] * t; bb = pal.hor[2] * (1 - t) + pal.ground[2] * t;
      }
      const i = (y * W + xx) * 4;
      img.data[i] = clamp255(rr); img.data[i + 1] = clamp255(gg); img.data[i + 2] = clamp255(bb); img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

// small canvas label textures (buttons, displays, product labels)
export function labelCanvas(w, h, draw) {
  const c = mk(w, h), ctx = c.getContext('2d');
  draw(ctx, w, h);
  return c;
}
export function canvasTex(c, opts = {}) { return toTex(c, { repeatWrap: false, aniso: 8, ...opts }); }
