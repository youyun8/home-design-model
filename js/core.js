import * as THREE from 'three';
import { ROOMS } from './data.js';

export const CM = 0.01;

/** plan (x, y) + height z, all in centimetres -> three.js world vector (metres, y up, +z = south). */
export const P = (x, y, z = 0) => new THREE.Vector3(x * CM, z * CM, y * CM);

// ---------------------------------------------------------------------------------------------
// Box helper with world-aligned UVs (1 uv unit = 1 metre) so tiles line up across separate boxes.
// Face order of BoxGeometry: +x(east), -x(west), +y(top), -y(bottom), +z(south), -z(north)
// ---------------------------------------------------------------------------------------------
const FACE_KEYS = ['e', 'w', 't', 'b', 's', 'n'];

export function applyWorldUV(geo, cx, cy, cz) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx, y = pos.getY(i) + cy, z = pos.getZ(i) + cz;
    const ax = Math.abs(nor.getX(i)), az = Math.abs(nor.getZ(i));
    if (ax > 0.5) uv.setXY(i, z, y);
    else if (az > 0.5) uv.setXY(i, x, y);
    else uv.setXY(i, x, z);
  }
  uv.needsUpdate = true;
}

function faceMaterials(mats) {
  if (Array.isArray(mats)) return mats;
  if (!mats || mats.isMaterial) return mats;
  const base = mats.all || mats.a;
  return FACE_KEYS.map((k) => mats[k] || base);
}

/** Axis aligned box from plan rectangle [x0,y0]-[x1,y1] and elevation range z0..z1 (cm). */
export function box(x0, y0, x1, y1, z0, z1, mats, opts = {}) {
  const w = Math.abs(x1 - x0) * CM, d = Math.abs(y1 - y0) * CM, h = Math.abs(z1 - z0) * CM;
  const cx = (x0 + x1) / 2 * CM, cy = (z0 + z1) / 2 * CM, cz = (y0 + y1) / 2 * CM;
  const geo = new THREE.BoxGeometry(w, h, d);
  if (opts.uv !== false) applyWorldUV(geo, cx, cy, cz);
  const mesh = new THREE.Mesh(geo, faceMaterials(mats));
  mesh.position.set(cx, cy, cz);
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  if (opts.name) mesh.name = opts.name;
  return mesh;
}

/** Box defined by centre / size in plan cm, local to a parent group (no world UV by default). */
export function cbox(w, d, h, mats, opts = {}) {
  const geo = new THREE.BoxGeometry(w * CM, h * CM, d * CM);
  const mesh = new THREE.Mesh(geo, faceMaterials(mats));
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  return mesh;
}

export function setPos(obj, x, y, z) {
  obj.position.set(x * CM, z * CM, y * CM);
  return obj;
}

export function cyl(rTop, rBot, h, mat, seg = 24, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop * CM, rBot * CM, h * CM, seg, 1, opts.open), mat);
  m.castShadow = opts.cast !== false; m.receiveShadow = opts.receive !== false;
  return m;
}

export function add(parent, ...children) { children.forEach((c) => parent.add(c)); return parent; }

// ---------------------------------------------------------------------------------------------
// Rooms: lookup for per-room light linking
// ---------------------------------------------------------------------------------------------
function rectDist(x, y, r) {
  const dx = Math.max(r[0] - x, 0, x - r[2]);
  const dy = Math.max(r[1] - y, 0, y - r[3]);
  return Math.hypot(dx, dy);
}

export function roomAt(x, y, tol = 22) {
  let best = 0, bestD = Infinity;
  for (const room of ROOMS) {
    for (const r of room.rects) {
      const d = rectDist(x, y, r);
      if (d === 0) return room.id;
      if (d < bestD) { bestD = d; best = room.id; }
    }
  }
  return bestD <= tol ? best : 0;
}

/**
 * Adds a per-vertex `aRoom` attribute to every mesh under `root`.
 * A vertex belongs to the room that contains the point 3 cm in front of it (along its normal);
 * vertices buried in wall thickness fall back to the nearest room.
 */
export function tagRooms(root) {
  root.updateMatrixWorld(true);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || o.userData.noRoom) return;
    const g = o.geometry;
    if (g.attributes.aRoom) return;
    const pos = g.attributes.position, nor = g.attributes.normal;
    const arr = new Float32Array(pos.count);
    nm.getNormalMatrix(o.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      let px = v.x / CM, py = v.z / CM;
      if (nor) {
        n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
        const tight = roomAt(px + n.x * 3, py + n.z * 3, 0.0001);
        if (tight) { arr[i] = tight; continue; }
      }
      arr[i] = roomAt(px, py);
    }
    g.setAttribute('aRoom', new THREE.BufferAttribute(arr, 1));
  });
}

// Shared uniform: the room id of each spot light, in renderer order (see lighting.js)
export const lightRooms = { value: new Float32Array(64).fill(-1) };

/**
 * Patches a lit three.js material so each spot light only affects surfaces of its own room
 * (vertex attribute aRoom). Rooms are never lit through walls — no shadow maps required.
 */
export function linkRooms(mat) {
  if (!mat || mat.userData._linked) return mat;
  mat.userData._linked = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    shader.uniforms.uSpotRooms = lightRooms;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aRoom;\nvarying float vRoom;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoom = aRoom;');
    const chunk = THREE.ShaderChunk.lights_fragment_begin.replace(
      'getSpotLightInfo( spotLight, geometryPosition, directLight );',
      'getSpotLightInfo( spotLight, geometryPosition, directLight );\n' +
      '\t\tdirectLight.color *= (uSpotRooms[ i ] < -0.5 || abs(vRoom - uSpotRooms[ i ]) < 0.5) ? 1.0 : 0.0;'
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vRoom;\n#if NUM_SPOT_LIGHTS > 0\nuniform float uSpotRooms[ NUM_SPOT_LIGHTS ];\n#endif')
      .replace('#include <lights_fragment_begin>', chunk);
  };
  const key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => key() + '|rooms';
  return mat;
}

/** Makes sure every lit mesh has an aRoom attribute and the linking patch. */
export function finalizeScene(root) {
  tagRooms(root);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) linkRooms(m);
    });
    if (!o.geometry.attributes.aRoom) {
      o.geometry.setAttribute('aRoom', new THREE.BufferAttribute(new Float32Array(o.geometry.attributes.position.count), 1));
    }
  });
}
