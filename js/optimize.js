import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = ['position', 'normal', 'uv', 'aRoom'];

function slice(geo, start, count) {
  const g = new THREE.BufferGeometry();
  for (const k of KEEP) {
    const a = geo.attributes[k];
    if (!a) continue;
    const arr = a.array.slice(start * a.itemSize, (start + count) * a.itemSize);
    g.setAttribute(k, new THREE.BufferAttribute(arr, a.itemSize));
  }
  return g;
}

/** Splits a mesh into [{ material, geometry }] in world space (non-indexed, KEEP attributes only). */
function worldParts(mesh) {
  let geo = mesh.geometry;
  if (geo.index) geo = geo.toNonIndexed();
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  if (!geo.attributes.aRoom) geo.setAttribute('aRoom', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count), 1));
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const groups = Array.isArray(mesh.material) && geo.groups.length
    ? geo.groups
    : [{ start: 0, count: geo.attributes.position.count, materialIndex: 0 }];
  const out = [];
  for (const gr of groups) {
    const mat = mats[gr.materialIndex];
    if (!mat) continue;
    const part = slice(geo, gr.start, gr.count);
    part.applyMatrix4(mesh.matrixWorld);
    out.push({ material: mat, geometry: part });
  }
  return out;
}

/**
 * Merges all static meshes below `group` into one mesh per (material, shadow flags).
 * Meshes under an object with userData.dynamic, or flagged userData.keep, stay untouched.
 * `group` must sit at the origin with an identity transform.
 */
export function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  const remove = [];
  const isDynamic = (o) => { for (let p = o; p && p !== group.parent; p = p.parent) if (p.userData.dynamic || p.userData.keep) return true; return false; };
  group.traverse((o) => {
    if (!o.isMesh || isDynamic(o)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m.isShaderMaterial)) return;
    for (const part of worldParts(o)) {
      const key = `${part.material.uuid}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}|${o.renderOrder}`;
      if (!buckets.has(key)) buckets.set(key, { material: part.material, geos: [], cast: o.castShadow, receive: o.receiveShadow, order: o.renderOrder });
      buckets.get(key).geos.push(part.geometry);
    }
    remove.push(o);
  });
  remove.forEach((o) => {
    o.geometry.dispose?.();
    o.parent.remove(o);
  });
  // drop empty groups left behind
  for (const [, b] of buckets) {
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.receive; mesh.renderOrder = b.order;
    mesh.matrixAutoUpdate = false;
    mesh.userData.merged = true;
    group.add(mesh);
  }
  return group;
}
