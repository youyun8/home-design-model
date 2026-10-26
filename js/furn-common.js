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






export function addExtraMaterials(M) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
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
