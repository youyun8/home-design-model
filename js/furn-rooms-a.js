import * as THREE from 'three';
import { CM } from './core.js';
import { rbox } from './furn-common.js';

/** Wall mounted split A/C unit (cream body, black louvre). `len` runs along the wall. */
export function acUnit(M, cx, cy, len, z, alongY = true) {
  const g = new THREE.Group();
  const w = alongY ? 20 : len, d = alongY ? len : 20;
  const body = rbox(cx, cy, w, d, z, z + 27, M.acBody || M.plasticWhite, 3, 3);
  body.castShadow = body.receiveShadow = true;
  const louvre = rbox(cx + (alongY ? 4 : 0), cy + (alongY ? 0 : 4), alongY ? 10 : len - 8, alongY ? len - 8 : 10, z + 3, z + 7, M.blackMatte, 1, 2);
  g.add(body, louvre);
  return g;
}
