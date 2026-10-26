import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CM, box, cbox } from './core.js';
import { rbox, rng } from './furn-common.js';
import { labelCanvas, canvasTex, fabric } from './textures.js';

// Props and finishes taken from the design renders (sofa, blinds, wall light, pegboard, small objects).

const S = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };
const std = (o) => new THREE.MeshStandardMaterial(o);
const phys = (o) => new THREE.MeshPhysicalMaterial(o);
const wrapRepeat = (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t; };

export function addDecorMaterials(M) {
  M.taupe = phys({ color: 0xa79a8b, roughness: 0.85, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xd8cdbd) });
  M.acBody = phys({ color: 0xf0ead9, roughness: 0.35, clearcoat: 0.5 });
  M.terracottaGloss = std({ color: 0xc2673d, roughness: 0.45 });
  // light oak with the grain turned 90 degrees (horizontal panels, e.g. headboard)
  const t = M.oak.map.clone(); t.rotation = Math.PI / 2; t.center.set(0.5, 0.5); t.needsUpdate = true;
  M.oakH = std({ map: t, roughness: 0.5, envMapIntensity: 0.5 });
  // recommended soft furnishing -------------------------------------------------------------
  // sofa: tech fabric (scratch resistant, wipe-clean); colour is switchable at runtime (M.sofaFabric.color)
  const sf = fabric({ base: [236, 236, 234], seed: 12 });
  sf.map.repeat.set(1, 1); sf.bump.repeat.set(1, 1);
  M.sofaFabric = phys({ map: sf.map, bumpMap: sf.bump, bumpScale: 1.1, color: 0xcdbfa8, roughness: 0.93, sheen: 0.55, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xf2ead8), envMapIntensity: 0.6 });
  // bed: cotton-linen sheet, oat duvet, white pillow cases
  const sh = fabric({ base: [240, 238, 232], seed: 21 });
  sh.map.repeat.set(1, 1); sh.bump.repeat.set(1, 1);
  M.bedSheet = phys({ map: sh.map, bumpMap: sh.bump, bumpScale: 0.5, color: 0xf3f0ea, roughness: 0.92, sheen: 0.5, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 0.5 });
  const dv = fabric({ base: [232, 226, 214], seed: 27 });
  dv.map.repeat.set(1, 1); dv.bump.repeat.set(1, 1);
  M.bedDuvet = phys({ map: dv.map, bumpMap: dv.bump, bumpScale: 0.9, color: 0xe4dbc9, roughness: 0.95, sheen: 0.6, sheenColor: new THREE.Color(0xfff6e6), envMapIntensity: 0.5 });
  M.bedPillow = phys({ map: sh.map, bumpMap: sh.bump, bumpScale: 0.5, color: 0xf6f4ef, roughness: 0.92, sheen: 0.55, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 0.5 });
  M.sofaLeg = std({ color: 0x7a5a3e, roughness: 0.5 });
  return M;
}

// ---------------------------------------------------------------------------------------------
// rounded / arched panel facing east (+x) or west (-x). Origin = lower corner on the wall surface.
// ---------------------------------------------------------------------------------------------
export function roundedPanel({ w, h, rTop = 0, rBot = 0, thick = 1.8, face = 'E', mat }) {
  const sh = new THREE.Shape();
  const W = w * CM, H = h * CM, rt = rTop * CM, rb = rBot * CM;
  sh.moveTo(rb, 0); sh.lineTo(W - rb, 0);
  if (rb) sh.absarc(W - rb, rb, rb, -Math.PI / 2, 0, false); else sh.lineTo(W, 0);
  sh.lineTo(W, H - rt);
  if (rt) sh.absarc(W - rt, H - rt, rt, 0, Math.PI / 2, false); else sh.lineTo(W, H);
  sh.lineTo(rt, H);
  if (rt) sh.absarc(rt, H - rt, rt, Math.PI / 2, Math.PI, false); else sh.lineTo(0, H);
  sh.lineTo(0, rb);
  if (rb) sh.absarc(rb, rb, rb, Math.PI, Math.PI * 1.5, false);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: thick * CM, bevelEnabled: false, curveSegments: 14 });
  if (face === 'W') geo.rotateY(-Math.PI / 2); else { geo.rotateY(Math.PI / 2); geo.translate(0, 0, W); }
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------------------------------------
// wall light (white halo ring + terracotta disc), facing west from a wall at x
// ---------------------------------------------------------------------------------------------
export function discLamp(M, x, y, z, ctx) {
  const g = new THREE.Group();
  const ring = phys({ color: 0xf4efe6, roughness: 0.5, emissive: 0xfff0d8, emissiveIntensity: 0 });
  const back = S(new THREE.Mesh(new THREE.CylinderGeometry(13 * CM, 13 * CM, 3 * CM, 44), ring), false, false);
  back.rotation.z = Math.PI / 2; back.position.set((x - 1.5) * CM, z * CM, y * CM); back.userData.lamp = true;
  const front = S(new THREE.Mesh(new THREE.CylinderGeometry(10.6 * CM, 10.6 * CM, 1.2 * CM, 44), M.terracottaGloss));
  front.rotation.z = Math.PI / 2; front.position.set((x - 3.6) * CM, (z - 1.4) * CM, (y - 1.0) * CM);
  g.add(back, front); ctx.lamps.push(back);
  return g;
}

export function smartPanel(M, x, y, z) {
  const g = new THREE.Group();
  g.add(S(rbox(x - 0.9, y, 1.8, 24, z - 8, z + 8, M.blackMetal, 0.6, 2)));
  const tex = canvasTex(labelCanvas(256, 160, (c, w, h) => {
    c.fillStyle = '#0c1620'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e9f1f7'; c.font = 'bold 18px system-ui, sans-serif'; c.fillText('19:36', 12, 24);
    const cols = ['#3aa0ff', '#5fd0a0', '#ffb347', '#ff6b6b', '#8f7bff', '#2fc4d6', '#ffd23f', '#6c8cff'];
    for (let r = 0; r < 2; r++) for (let q = 0; q < 4; q++) {
      c.fillStyle = cols[r * 4 + q]; c.beginPath(); c.roundRect(12 + q * 60, 42 + r * 52, 52, 44, 8); c.fill();
    }
  }), { repeatWrap: false });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(21 * CM, 13 * CM), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scr.rotation.y = -Math.PI / 2; scr.position.set((x - 1.85) * CM, z * CM, y * CM);
  g.add(scr);
  return g;
}






export function nightstand(M, x, y) {
  const g = new THREE.Group();
  g.add(S(rbox(x, y, 40, 36, 7, 45, M.taupe, 7, 5)));
  g.add(S(rbox(x - 20.2, y, 1.4, 34, 25.5, 43, M.taupe, 3, 3)));
  g.add(S(rbox(x - 20.2, y, 1.4, 34, 9, 24, M.taupe, 3, 3)));
  [[x - 13, y - 12], [x - 13, y + 12], [x + 13, y - 12], [x + 13, y + 12]].forEach(([fx, fy]) => {
    const f = S(new THREE.Mesh(new THREE.SphereGeometry(3.4 * CM, 12, 10), M.taupe)); f.position.set(fx * CM, 3.4 * CM, fy * CM); g.add(f);
  });
  return g;
}

export function woodArmchair(M, x, y, yaw = 0) {
  const g = new THREE.Group();
  const add = (w, d, h, px, py, pz, mat = M.oak) => { const m = S(cbox(w, d, h, mat)); m.position.set(px * CM, py * CM, pz * CM); g.add(m); return m; };
  [[-26, -24], [26, -24], [-26, 22], [26, 22]].forEach(([lx, lz]) => add(3.6, 3.6, 40, lx, 20, lz));
  add(3.6, 52, 3.6, -26, 40, -1); add(3.6, 52, 3.6, 26, 40, -1);          // side rails
  add(3.2, 3.2, 22, -26, 52, -22); add(3.2, 3.2, 22, 26, 52, -22);         // arm posts
  add(5, 46, 3.2, -26, 64, -4); add(5, 46, 3.2, 26, 64, -4);                // arms
  add(56, 3.2, 3.2, 0, 40, -24); add(56, 3.2, 3.2, 0, 40, 22);
  add(3.2, 4, 44, -24, 58, 24); add(3.2, 4, 44, 24, 58, 24);                // back posts
  add(52, 3.2, 3.6, 0, 80, 25);
  const seat = S(rbox(0, 0, 50, 48, 0, 11, M.fabricCream, 4, 4)); seat.position.y = 41 * CM; g.add(seat);
  const back = S(rbox(0, 0, 50, 10, 0, 44, M.fabricCream, 4, 4)); back.position.set(0, 52 * CM, 22 * CM); back.rotation.x = -0.12; g.add(back);
  const pil = S(rbox(0, 0, 36, 10, 0, 34, M.linen, 5, 4)); pil.position.set(10 * CM, 54 * CM, 12 * CM); pil.rotation.set(-0.3, 0, 0.18); g.add(pil);
  g.position.set(x * CM, 0, y * CM); g.rotation.y = yaw;
  return g;
}

export function sideTableRound(M, x, y) {
  const g = new THREE.Group();
  const top = S(new THREE.Mesh(new THREE.CylinderGeometry(30 * CM, 30 * CM, 3 * CM, 48), M.taupe)); top.scale.z = 0.78; top.position.y = 48.5 * CM; g.add(top);
  const post = S(new THREE.Mesh(new THREE.CylinderGeometry(8 * CM, 11 * CM, 47 * CM, 24), M.taupe)); post.position.y = 23.5 * CM; g.add(post);
  const b = S(new THREE.Mesh(new THREE.CylinderGeometry(18 * CM, 18 * CM, 1.5 * CM, 40), M.taupe)); b.position.y = 0.8 * CM; g.add(b);
  g.position.set(x * CM, 0, y * CM);
  return g;
}

export function kidsChair(M, x, y, yaw = 0) {
  const g = new THREE.Group();
  const add = (w, d, h, px, py, pz, mat = M.laminateWhite) => { const m = S(cbox(w, d, h, mat)); m.position.set(px * CM, py * CM, pz * CM); g.add(m); };
  [[-12, -12], [12, -12], [-12, 12], [12, 12]].forEach(([lx, lz]) => add(2.4, 2.4, 28, lx, 14, lz));
  add(30, 30, 2.6, 0, 29, 0);
  add(2.4, 2.4, 26, -11, 43, 13); add(2.4, 2.4, 26, 11, 43, 13);
  add(2.8, 2.4, 14, -6, 62, 13); add(2.8, 2.4, 14, 6, 62, 13);   // bunny ears
  add(26, 2.4, 6, 0, 52, 13);
  g.position.set(x * CM, 0, y * CM); g.rotation.y = yaw;
  return g;
}



/** Light pine board with a grid of holes (洞洞板). Faces west from a wall at x. */
export function pegboard(M, x, y0, y1, z0, z1) {
  const lenCm = y1 - y0, hCm = z1 - z0;
  const tex = canvasTex(labelCanvas(Math.round(lenCm * 5), Math.round(hCm * 5), (c, w, h) => {
    c.fillStyle = '#e6c791'; c.fillRect(0, 0, w, h);
    const r = rng(8);
    for (let i = 0; i < 90; i++) { c.strokeStyle = `rgba(150,100,50,${0.04 + r() * 0.08})`; c.lineWidth = 0.6 + r() * 1.6; const yy = r() * h; c.beginPath(); c.moveTo(0, yy); c.bezierCurveTo(w * 0.3, yy + r() * 8 - 4, w * 0.6, yy + r() * 8 - 4, w, yy + r() * 6 - 3); c.stroke(); }
    c.fillStyle = '#2b2118';
    const pitch = 5 * 7.2; // 7.2 cm
    for (let yy = pitch * 0.5; yy < h - 6; yy += pitch) for (let xx = pitch * 0.5 + ((Math.round(yy / pitch) % 2) ? pitch / 2 : 0); xx < w - 6; xx += pitch) { c.beginPath(); c.arc(xx, yy, 5, 0, 7); c.fill(); }
  }), { repeatWrap: false });
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(lenCm * CM, hCm * CM), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  m.rotation.y = -Math.PI / 2; m.position.set((x - 2.2) * CM, ((z0 + z1) / 2) * CM, ((y0 + y1) / 2) * CM); m.receiveShadow = true;
  const edge = S(cbox(2.2, lenCm, hCm, M.oak)); edge.position.set((x - 1.1) * CM, ((z0 + z1) / 2) * CM, ((y0 + y1) / 2) * CM);
  g.add(edge, m);
  return g;
}


/** Paw-print holes (cat paw, 貓掌孔) cut through a cabinet door facing north (toward -y). */
export function pawHoles(M, x, y, z) {
  const g = new THREE.Group();
  const dot = (dx, dz, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r * CM, 24), M.shadowGap); m.position.set((x + dx) * CM, (z + dz) * CM, y * CM - 0.0005); m.rotation.y = Math.PI; g.add(m); };
  dot(0, 0, 4.2); dot(-5, 7.2, 2.2); dot(0, 9.6, 2.4); dot(5.4, 7, 2); dot(-8.4, 13, 1.1); dot(6.8, 12.4, 1.2);
  return g;
}
