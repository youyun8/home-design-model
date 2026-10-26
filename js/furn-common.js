import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CM, box, cbox, setPos } from './core.js';

/** Small seeded RNG so furniture details (books, clothes…) are stable between loads. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounded box centred at (cx,cy) plan, spanning z0..z1. Sizes in cm, radius in cm. */
export function rbox(cx, cy, w, d, z0, z1, mat, r = 1.5, seg = 3, opts = {}) {
  const geo = new RoundedBoxGeometry(w * CM, (z1 - z0) * CM, d * CM, seg, Math.min(r, w / 2 - 0.01, d / 2 - 0.01, (z1 - z0) / 2 - 0.01) * CM);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(cx * CM, ((z0 + z1) / 2) * CM, cy * CM);
  m.castShadow = opts.cast !== false; m.receiveShadow = opts.receive !== false;
  return m;
}

/** Plain colored box helper: x0,y0,x1,y1 (plan), z0,z1. */
export const bx = (x0, y0, x1, y1, z0, z1, mat, opts) => box(x0, y0, x1, y1, z0, z1, mat, opts);

/** LED strip (emissive) along an axis-aligned segment. */
export function led(M, x0, y0, x1, y1, z, t = 1.2, mat = null) {
  const m = box(Math.min(x0, x1) - (x0 === x1 ? t / 2 : 0), Math.min(y0, y1) - (y0 === y1 ? t / 2 : 0), Math.max(x0, x1) + (x0 === x1 ? t / 2 : 0), Math.max(y0, y1) + (y0 === y1 ? t / 2 : 0), z, z + t, { all: mat || M.ledWarm }, { cast: false, receive: false, uv: false });
  m.userData.noRoom = true;
  return m;
}

/** Vertical handle bar (black). Orientation: face normal along +x/-x/+y/-y. */
export function bar(M, x, y, z, len, dir = 'v', face = 's', mat = null) {
  const g = new THREE.Group();
  const w = 1.4, d = 1.6;
  const dims = { v: [w, d, len], h: [len, d, w] }[dir];
  let sx = dims[0], sy = dims[1];
  if (face === 'e' || face === 'w') { sx = dims[1]; sy = dims[0]; }
  const m = cbox(sx, sy, dims[2], mat || M.blackMetal);
  setPos(m, x, y, z + len / 2 * (dir === 'v' ? 1 : 0) + (dir === 'h' ? w / 2 : 0));
  g.add(m);
  return g;
}

/** A 3-D sheer curtain (two panels pulled to the sides) with sine folds. */
export function curtain(M, { axis = 'x', a, b, c, zTop, zBottom, panelW = 55, seed = 1, mat = null }) {
  const g = new THREE.Group();
  const h = (zTop - zBottom) * CM;
  const make = (len) => {
    const geo = new THREE.PlaneGeometry(len * CM, h, 36, 2);
    const pos = geo.attributes.position;
    const folds = Math.max(4, Math.round(len / 7));
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (len * CM) + 0.5;
      pos.setZ(i, Math.sin(x * Math.PI * 2 * folds) * 0.018);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat || M.curtain);
    m.castShadow = false; m.receiveShadow = true;
    return m;
  };
  const p1 = make(panelW), p2 = make(panelW);
  const zc = ((zTop + zBottom) / 2) * CM;
  if (axis === 'x') {
    p1.position.set((a + panelW / 2) * CM, zc, c * CM); p2.position.set((b - panelW / 2) * CM, zc, c * CM);
  } else {
    p1.position.set(c * CM, zc, (a + panelW / 2) * CM); p2.position.set(c * CM, zc, (b - panelW / 2) * CM);
    p1.rotation.y = p2.rotation.y = Math.PI / 2;
  }
  g.add(p1, p2);
  // curtain track
  const track = axis === 'x'
    ? box(a - 2, c - 1, b + 2, c + 1, zTop, zTop + 1.8, { all: M.aluminumWhite }, { cast: false })
    : box(c - 1, a - 2, c + 1, b + 2, zTop, zTop + 1.8, { all: M.aluminumWhite }, { cast: false });
  g.add(track);
  return g;
}

/** Potted plant with a curved trunk, side branches and glossy elongated leaves. */
export function plant(M, x, y, { h = 90, pot = 14, seed = 3, kind = 'rubber' } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const potH = pot * 1.5;
  const potM = new THREE.Mesh(new THREE.CylinderGeometry(pot * 0.95 * CM, pot * 0.72 * CM, potH * CM, 28), M.potCeramic);
  potM.position.y = potH / 2 * CM; potM.castShadow = potM.receiveShadow = true; g.add(potM);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(pot * 0.95 * CM, 0.5 * CM, 8, 28), M.potCeramic);
  rim.rotation.x = Math.PI / 2; rim.position.y = potH * CM; g.add(rim);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(pot * 0.9 * CM, pot * 0.9 * CM, 1 * CM, 20), M.soil);
  soil.position.y = (potH - 1) * CM; g.add(soil);
  const lean = (r() - 0.5) * 6;
  const trunkPts = [0, 0.3, 0.6, 1].map((t) => new THREE.Vector3((lean * t * t + Math.sin(t * 3) * 1.2) * CM, (potH + h * t) * CM, 0));
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trunkPts), 16, 0.7 * CM, 8), M.stem);
  trunk.castShadow = true; g.add(trunk);
  const leafGeo = new THREE.SphereGeometry(1, 12, 8);
  const X = new THREE.Vector3(1, 0, 0), q = new THREE.Quaternion(), qr = new THREE.Quaternion();
  const addLeaf = (tip, dir, len, wid) => {
    const m = new THREE.Mesh(leafGeo, r() < 0.5 ? M.leafA : M.leafB);
    m.scale.set(len / 2 * CM, 0.5 * CM, wid / 2 * CM);
    q.setFromUnitVectors(X, dir); qr.setFromAxisAngle(dir, (r() - 0.5) * 1.2); q.premultiply(qr);
    m.quaternion.copy(q);
    m.position.copy(tip).addScaledVector(dir, len / 2 * CM);
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  };
  const nB = kind === 'rubber' ? 9 : 5, leafL = kind === 'rubber' ? 16 : 7, leafW = kind === 'rubber' ? 8 : 3.2;
  const curve = new THREE.CatmullRomCurve3(trunkPts);
  for (let i = 0; i < nB; i++) {
    const t = 0.38 + (i / nB) * 0.62, base = curve.getPoint(t);
    const ang = i * 2.4 + r() * 0.8, blen = (kind === 'rubber' ? 7 : 3) + r() * (kind === 'rubber' ? 10 : 4);
    const out = new THREE.Vector3(Math.cos(ang), 0.5 + r() * 0.5, Math.sin(ang)).normalize();
    const tip = base.clone().addScaledVector(out, blen * CM);
    const br = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base, base.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, 0.8 * CM, 0)), tip]), 8, 0.28 * CM, 6), M.stem);
    g.add(br);
    const n = 4 + ((r() * 3) | 0);
    for (let k = 0; k < n; k++) {
      const a2 = ang + (k - n / 2) * 0.55 + r() * 0.3;
      const d = new THREE.Vector3(Math.cos(a2), 0.25 + r() * 0.55, Math.sin(a2)).normalize();
      addLeaf(tip, d, leafL * (0.75 + r() * 0.5), leafW * (0.8 + r() * 0.4));
    }
  }
  // crown
  const top = curve.getPoint(1);
  for (let k = 0; k < 5; k++) addLeaf(top, new THREE.Vector3(Math.cos(k * 1.26), 0.9 + r() * 0.5, Math.sin(k * 1.26)).normalize(), leafL * 0.8, leafW * 0.8);
  g.position.set(x * CM, 0, y * CM);
  return g;
}

/** Hanging garments for wardrobes: x range along `axis`, hung at plan (cx, cy). */
export function hangingClothes(M, x0, x1, y, zTop, seed = 1, axis = 'x') {
  const r = rng(seed), g = new THREE.Group();
  const cols = [0xe9e4da, 0x9aa6a8, 0x3f4a52, 0xc8b8a0, 0x6b5a4a, 0xdad6cf, 0x8a9a8c, 0x2c2f33];
  for (let p = x0 + 3; p < x1 - 3; p += 3.4 + r() * 2.2) {
    const mat = new THREE.MeshStandardMaterial({ color: cols[(r() * cols.length) | 0], roughness: 0.95 });
    const hgt = 70 + r() * 30;
    const w = 1.8 + r() * 1.4, dd = 38 + r() * 6;
    const m = new THREE.Mesh(new RoundedBoxGeometry((axis === 'x' ? w : dd) * CM, hgt * CM, (axis === 'x' ? dd : w) * CM, 2, 0.6 * CM), mat);
    m.position.set(axis === 'x' ? p * CM : y * CM, (zTop - hgt / 2 - 3) * CM, axis === 'x' ? y * CM : p * CM);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

/** Books of random colours on a shelf: row from (x0,y) .. x1 at shelf top z. */
export function books(M, x0, x1, y, z, maxH = 28, seed = 2, depth = 22) {
  const r = rng(seed), g = new THREE.Group();
  const cols = [0xcfc7b8, 0x2f3b45, 0xa65c3d, 0x6b7f6a, 0xe3d9c4, 0x9aa7b0, 0x4a4338, 0xb59b6a, 0xf0ece4, 0x7c8a97];
  let p = x0 + 1;
  while (p < x1 - 3) {
    const w = 2 + r() * 2.8, hgt = maxH * (0.6 + r() * 0.4), tilt = r() < 0.07;
    const mat = M._bookMats[(r() * M._bookMats.length) | 0];
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * CM, hgt * CM, depth * 0.8 * CM), mat);
    m.position.set((p + w / 2) * CM, (z + hgt / 2) * CM, y * CM);
    if (tilt) { m.rotation.z = 0.2; m.position.x += 1 * CM; }
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    p += w + 0.15;
    if (r() < 0.08) p += 6 + r() * 12; // gap
  }
  return g;
}

export function labelPlane(canvasTex, w, h, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * CM, h * CM), new THREE.MeshBasicMaterial({ map: canvasTex, transparent: true, toneMapped: false, ...opts }));
  return m;
}

export function addExtraMaterials(M) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M.curtain = new THREE.MeshStandardMaterial({ color: 0xf3efe7, transparent: true, opacity: 0.62, roughness: 0.95, side: THREE.DoubleSide, depthWrite: false });
  M.curtainGrey = new THREE.MeshStandardMaterial({ color: 0xb4b3b0, transparent: true, opacity: 0.58, roughness: 0.95, side: THREE.DoubleSide, depthWrite: false });
  M.potCeramic = std({ color: 0xd9d3c8, roughness: 0.6 });
  M.soil = std({ color: 0x3b2f27, roughness: 1 });
  M.stem = std({ color: 0x6a5a45, roughness: 0.9 });
  M.leafA = std({ color: 0x486f40, roughness: 0.42, side: THREE.DoubleSide });
  M.leafB = std({ color: 0x38603a, roughness: 0.42, side: THREE.DoubleSide });
  M.sage = new THREE.MeshPhysicalMaterial({ color: 0x8b9a82, roughness: 0.95, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xc8d2c0) });
  M.terracotta = new THREE.MeshPhysicalMaterial({ color: 0xb4694a, roughness: 0.95, sheen: 0.5, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xe8b49c) });
  M.paper = std({ color: 0xf4f2ee, roughness: 0.9 });
  M._bookMats = [0xcfc7b8, 0x2f3b45, 0xa65c3d, 0x6b7f6a, 0xe3d9c4, 0x9aa7b0, 0x4a4338, 0xb59b6a, 0xf0ece4, 0x7c8a97].map((c) => std({ color: c, roughness: 0.8 }));
  M.screenOff = std({ color: 0x080809, roughness: 0.12, metalness: 0.5, envMapIntensity: 1.1 });
  M.stainless = std({ color: 0xcfd2d6, roughness: 0.32, metalness: 1, envMapIntensity: 1.2 });
  M.fridge = std({ color: 0xdfe1e3, roughness: 0.35, metalness: 0.55, envMapIntensity: 1.1 });
  M.gasGrate = std({ color: 0x151516, roughness: 0.5, metalness: 0.8 });
  M.hobGlass = std({ color: 0x0f0f10, roughness: 0.3, metalness: 0.3, envMapIntensity: 1.0 });
  M.shadowGap = std({ color: 0x0a0a0a, roughness: 1 });
  M.blueCap = std({ color: 0x2f7fd6, roughness: 0.4 });
  M.dispButton = new THREE.MeshPhysicalMaterial({ color: 0xe9ebed, roughness: 0.35, clearcoat: 0.5 });
  M.dispButtonOff = new THREE.MeshPhysicalMaterial({ color: 0xc4c7ca, roughness: 0.6 });
  M.btnBlue = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.55, 1.0).multiplyScalar(2.2), toneMapped: false });
  M.btnAmber = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.65, 0.15).multiplyScalar(2.0), toneMapped: false });
  M.btnRed = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.18, 0.12).multiplyScalar(2.2), toneMapped: false });
  return M;
}
