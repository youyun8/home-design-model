import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { CM } from './core.js';

// Soft furnishing geometry: rounded boxes with smooth, organic fold displacement.
// Sizes in centimetres, width = x, height = y (up), depth = z (plan y).

const wave = (x, y, z) => Math.sin(x * 1.7 + y * 2.3 + z * 1.1) * 0.5 + Math.sin(x * 3.1 - y * 1.3 + z * 2.7) * 0.3 + Math.sin(x * 5.3 + y * 4.1 - z * 3.3) * 0.2;

/**
 * @param w,h,d  size (cm); r corner radius (cm); fold = amplitude of lumpy folds (cm);
 *   crown = extra bulge of the top face (cm); pinch = 0..1 corners drop (pillows); seed offsets the noise
 */
export function softBox({ w, h, d, r = 5, fold = 0.5, crown = 0, pinch = 0, freq = 0.11, seg = 12, seed = 0 }) {
  const rr = Math.min(r, w / 2 - 0.05, h / 2 - 0.05, d / 2 - 0.05);
  let g = new RoundedBoxGeometry(w * CM, h * CM, d * CM, seg, rr * CM);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-6);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i) / CM, y = pos.getY(i) / CM, z = pos.getZ(i) / CM;
    const u = x / (w / 2), v = z / (d / 2), t = y / (h / 2);          // -1..1 per axis
    if (pinch) { const c = Math.pow(Math.max(0, Math.abs(u) * Math.abs(v)), 1.4); y *= 1 - pinch * c; }
    if (crown && t > 0) y += crown * Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v) * t;
    // lumpy folds, stronger on the open (large) faces
    const n = wave(x * freq + seed, y * freq, z * freq - seed);
    const up = Math.max(0, t), side = Math.abs(u) > Math.abs(v) ? Math.abs(u) : Math.abs(v);
    const amp = fold * (0.35 + 0.65 * Math.max(up, side * side));
    x += (u / Math.max(1e-3, Math.hypot(u, v, t))) * n * amp * 0.6;
    y += (t / Math.max(1e-3, Math.hypot(u, v, t))) * n * amp;
    z += (v / Math.max(1e-3, Math.hypot(u, v, t))) * n * amp * 0.6;
    pos.setXYZ(i, x * CM, y * CM, z * CM);
  }
  g.computeVertexNormals();
  // box-projected UVs (1 uv unit = 25 cm of fabric)
  const nor = g.attributes.normal, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    const x = pos.getX(i) / CM, y = pos.getY(i) / CM, z = pos.getZ(i) / CM;
    if (ay >= ax && ay >= az) { uv[i * 2] = x / 25; uv[i * 2 + 1] = z / 25; }
    else if (ax >= az) { uv[i * 2] = z / 25; uv[i * 2 + 1] = y / 25; }
    else { uv[i * 2] = x / 25; uv[i * 2 + 1] = y / 25; }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Soft mesh at plan (x, y), vertical centre zc (all cm). */
export function softMesh(opts, mat, x, y, zc, rot = {}) {
  const m = new THREE.Mesh(softBox(opts), mat);
  m.position.set(x * CM, zc * CM, y * CM);
  if (rot.x) m.rotation.x = rot.x; if (rot.y) m.rotation.y = rot.y; if (rot.z) m.rotation.z = rot.z;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
