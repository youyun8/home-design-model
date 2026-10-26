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
  M.sofaGreen = phys({ color: 0x445238, roughness: 0.92, sheen: 1.0, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x8fa070) });
  M.tealCushion = phys({ color: 0x5f7f72, roughness: 0.95, sheen: 0.6, sheenColor: new THREE.Color(0xa8c4b8) });
  M.acBody = phys({ color: 0xf0ead9, roughness: 0.35, clearcoat: 0.5 });
  M.terracottaGloss = std({ color: 0xc2673d, roughness: 0.45 });
  M.pillowGrey = phys({ color: 0xa79f94, roughness: 0.95, sheen: 0.5, sheenColor: new THREE.Color(0xd8d2c8) });
  M.kettleDark = std({ color: 0x2a2b2e, roughness: 0.3, metalness: 0.9, envMapIntensity: 1.3 });
  M.bearBrown = std({ color: 0x8a5a3a, roughness: 0.95 });
  const f = fabric({ base: [222, 204, 176], seed: 12 });
  M.boucle = phys({ map: f.map, bumpMap: f.bump, bumpScale: 1.6, roughness: 0.96, sheen: 0.7, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xf0e4cf) });
  const stripe = canvasTex(labelCanvas(64, 256, (g, w, h) => {
    g.fillStyle = '#efece4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5b7a62';
    for (let i = 0; i < 4; i++) g.fillRect(0, 12 + i * 64, w, 30);
  }), { repeatWrap: false });
  M.throwStripe = phys({ map: stripe, roughness: 0.95, sheen: 0.6, sheenColor: new THREE.Color(0xffffff) });
  // light oak with the grain turned 90 degrees (horizontal panels, e.g. headboard)
  const t = M.oak.map.clone(); t.rotation = Math.PI / 2; t.center.set(0.5, 0.5); t.needsUpdate = true;
  M.oakH = std({ map: t, roughness: 0.5, envMapIntensity: 0.5 });
  return M;
}

// ---------------------------------------------------------------------------------------------
// roller / zebra blinds (alpha stripes) and slim venetian slats
// ---------------------------------------------------------------------------------------------
function blindMat(M, kind) {
  M._blind = M._blind || {};
  if (M._blind[kind]) return M._blind[kind];
  const slat = kind === 'slat';
  const c = labelCanvas(8, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    if (slat) { g.fillStyle = 'rgba(224,216,202,0.97)'; g.fillRect(0, 0, w, 46); g.fillStyle = 'rgba(236,232,224,0.20)'; g.fillRect(0, 46, w, 18); }
    else { g.fillStyle = 'rgba(232,224,210,0.97)'; g.fillRect(0, 0, w, 32); g.fillStyle = 'rgba(240,236,228,0.22)'; g.fillRect(0, 32, w, 32); }
  });
  const tex = wrapRepeat(canvasTex(c, { repeatWrap: false }));
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, roughness: 0.95, depthWrite: false, opacity: 0.89 });
  M._blind[kind] = m;
  return m;
}

export function blind(M, { axis = 'x', a, b, c, zTop, zBottom, kind = 'zebra' }) {
  const g = new THREE.Group();
  const w = (b - a) * CM, h = (zTop - zBottom) * CM;
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv, period = kind === 'slat' ? 3.4 : 11;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (zTop - zBottom) / period);
  const m = new THREE.Mesh(geo, blindMat(M, kind));
  const zc = ((zTop + zBottom) / 2) * CM;
  if (axis === 'x') m.position.set(((a + b) / 2) * CM, zc, c * CM);
  else { m.position.set(c * CM, zc, ((a + b) / 2) * CM); m.rotation.y = Math.PI / 2; }
  m.renderOrder = 4;
  g.add(m);
  // head box and bottom bar
  const rail = axis === 'x' ? cbox(b - a + 2, 5, 5, M.aluminumWhite) : cbox(5, b - a + 2, 5, M.aluminumWhite);
  rail.position.copy(m.position); rail.position.y = (zTop + 2.4) * CM; if (axis === 'x') rail.position.z += 2 * CM; else rail.position.x += 2 * CM;
  const bar = axis === 'x' ? cbox(b - a, 1.6, 1.6, M.aluminumWhite) : cbox(1.6, b - a, 1.6, M.aluminumWhite);
  bar.position.copy(m.position); bar.position.y = zBottom * CM;
  g.add(rail, bar);
  return g;
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

// ---------------------------------------------------------------------------------------------
// abstract framed print
// ---------------------------------------------------------------------------------------------
export function framedArt(M, x, y, z, w, h, seed = 1, facing = 'S') {
  const r = rng(seed), g = new THREE.Group();
  const tex = canvasTex(labelCanvas(240, 320, (c, W, H) => {
    c.fillStyle = '#f5f1e9'; c.fillRect(0, 0, W, H);
    const cols = ['#e25a2c', '#1f7a52', '#e8ac1e', '#17171a', '#e58aa0', '#3b3fb8', '#f08a4b'];
    for (let i = 0; i < 6; i++) {
      c.fillStyle = cols[(r() * cols.length) | 0];
      const px = 30 + r() * 130, py = 30 + r() * 200, s = 40 + r() * 70, k = (r() * 4) | 0;
      c.beginPath();
      if (k === 0) c.rect(px, py, s * 0.7, s * 1.4);
      else if (k === 1) c.arc(px + s / 2, py + s / 2, s / 2, 0, 7);
      else if (k === 2) c.arc(px + s / 2, py + s / 2, s / 2, Math.PI, 0);
      else c.roundRect(px, py, s * 0.55, s * 1.6, s * 0.27);
      c.fill();
    }
  }), { repeatWrap: false });
  g.add(S(cbox(w + 3, 2, h + 3, M.laminateWhite)));
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w * CM, h * CM), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  pic.position.z = 1.05 * CM; g.add(pic);
  g.position.set(x * CM, z * CM, y * CM);
  g.rotation.y = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 }[facing];
  return g;
}

// ---------------------------------------------------------------------------------------------
// small objects
// ---------------------------------------------------------------------------------------------
export function mushroomLamp(M, x, y, z, ctx) {
  const pts = [[0, 0], [4.5, 0], [4.5, 0.8], [1.6, 1.2], [1.4, 8], [7.2, 8.6], [7.4, 10.5], [6.2, 12.6], [3.6, 13.8], [0, 14.2]].map(([r, h]) => new THREE.Vector2(r * CM, h * CM));
  const mat = phys({ color: 0xc8322a, roughness: 0.3, clearcoat: 0.6, emissive: 0xff4a2a, emissiveIntensity: 0 });
  const m = S(new THREE.Mesh(new THREE.LatheGeometry(pts, 36), mat));
  m.position.set(x * CM, z * CM, y * CM); m.userData.lamp = true; ctx.lamps.push(m);
  return m;
}

export function teddy(M, x, y, z) {
  const g = new THREE.Group();
  const sph = (r, px, py, pz, sx = 1, sy = 1, sz = 1, mat = M.bearBrown) => { const m = S(new THREE.Mesh(new THREE.SphereGeometry(r * CM, 16, 12), mat)); m.position.set(px * CM, py * CM, pz * CM); m.scale.set(sx, sy, sz); g.add(m); return m; };
  sph(6.2, 0, 8, 0, 1, 1.15, 0.9); sph(4.6, 0, 18.5, 0); sph(1.8, -3.6, 22.4, 0); sph(1.8, 3.6, 22.4, 0);
  sph(2.1, 0, 17.4, 3.4, 1, 0.8, 0.8, M.oakDark); sph(1.8, -6.2, 11, 1.5); sph(1.8, 6.2, 11, 1.5); sph(2.2, -3, 1.4, 2); sph(2.2, 3, 1.4, 2);
  const scarf = S(new THREE.Mesh(new THREE.TorusGeometry(4.3 * CM, 0.9 * CM, 8, 20), phys({ color: 0xc8322a, roughness: 0.9 })));
  scarf.rotation.x = Math.PI / 2; scarf.position.set(0, 14.6 * CM, 0); g.add(scarf);
  g.position.set(x * CM, z * CM, y * CM); g.rotation.y = Math.PI / 2 + 0.2;
  return g;
}

export function kettleSet(M, x, y, z) {
  const g = new THREE.Group();
  const tray = S(new THREE.Mesh(new THREE.CylinderGeometry(17 * CM, 17 * CM, 1.4 * CM, 40), M.blackCabinet));
  tray.position.y = 0.7 * CM; g.add(tray);
  const pts = [[0, 0], [7.6, 0], [8.6, 4], [7.8, 13], [5, 16.5], [0, 17]].map(([r, h]) => new THREE.Vector2(r * CM, h * CM));
  const kettle = S(new THREE.Mesh(new THREE.LatheGeometry(pts, 32), M.kettleDark));
  kettle.position.set(-5 * CM, 1.4 * CM, -2 * CM); g.add(kettle);
  const spout = S(new THREE.Mesh(new THREE.CylinderGeometry(0.8 * CM, 1.6 * CM, 9 * CM, 10), M.kettleDark));
  spout.position.set(-5 * CM, 14 * CM, 7 * CM); spout.rotation.x = -0.9; g.add(spout);
  const handle = S(new THREE.Mesh(new THREE.TorusGeometry(6 * CM, 0.7 * CM, 8, 24, Math.PI), M.kettleDark));
  handle.position.set(-5 * CM, 11 * CM, -8 * CM); handle.rotation.y = Math.PI / 2; g.add(handle);
  [[6, 8], [11, 2], [8, -5]].forEach(([gx, gz]) => {
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(3.4 * CM, 3 * CM, 9 * CM, 20, 1, true), M.glassTint);
    gl.position.set(gx * CM, 5.9 * CM, gz * CM); gl.renderOrder = 5; g.add(gl);
  });
  g.position.set(x * CM, z * CM, y * CM);
  return g;
}

export function airPurifier(M, x, y) {
  const g = new THREE.Group();
  const tex = wrapRepeat(canvasTex(labelCanvas(16, 8, (c, w, h) => { c.fillStyle = '#f2efe8'; c.fillRect(0, 0, w, h); c.fillStyle = '#b9b4aa'; c.fillRect(0, 0, 3, h); }), { repeatWrap: false }));
  tex.repeat.set(26, 1);
  const body = phys({ map: tex, roughness: 0.55 });
  const lo = S(new THREE.Mesh(new THREE.CylinderGeometry(17 * CM, 18 * CM, 42 * CM, 64), body)); lo.position.y = 21 * CM; g.add(lo);
  const ring = S(new THREE.Mesh(new THREE.CylinderGeometry(18 * CM, 18 * CM, 3 * CM, 64), M.plasticGrey)); ring.position.y = 43.5 * CM; g.add(ring);
  const up = S(new THREE.Mesh(new THREE.CylinderGeometry(16 * CM, 17 * CM, 40 * CM, 64), body)); up.position.y = 65 * CM; g.add(up);
  const head = S(new THREE.Mesh(new THREE.CylinderGeometry(17.5 * CM, 17.5 * CM, 8 * CM, 64), M.plasticWhite)); head.position.y = 89 * CM; g.add(head);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(14 * CM, 14 * CM, 1 * CM, 48), M.mirrorDark); disc.position.set(0, 93.6 * CM, 0); disc.rotation.x = -0.28; g.add(disc);
  g.position.set(x * CM, 0, y * CM);
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
  // glass bud vase with dried lavender
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(2.6 * CM, 2.2 * CM, 9 * CM, 14), M.glassTint); vase.position.set((x + 6) * CM, 49.5 * CM, (y - 6) * CM); vase.renderOrder = 5; g.add(vase);
  const r = rng(4);
  for (let i = 0; i < 9; i++) {
    const st = S(new THREE.Mesh(new THREE.CylinderGeometry(0.18 * CM, 0.18 * CM, 20 * CM, 4), M.stem));
    const a = r() * 6.28, tilt = 0.08 + r() * 0.3;
    st.position.set((x + 6 + Math.cos(a) * tilt * 8) * CM, 58 * CM, (y - 6 + Math.sin(a) * tilt * 8) * CM);
    st.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt); g.add(st);
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.9 * CM, 6, 5), M.pillowGrey); bud.position.set((x + 6 + Math.cos(a) * tilt * 20) * CM, 67 * CM, (y - 6 + Math.sin(a) * tilt * 20) * CM); bud.scale.y = 2.2; g.add(bud);
  }
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
  const glassV = new THREE.Mesh(new THREE.CylinderGeometry(3.4 * CM, 3 * CM, 12 * CM, 18), M.glassTint); glassV.position.set(-8 * CM, 56 * CM, 2 * CM); glassV.renderOrder = 5; g.add(glassV);
  g.add(S(rbox(8, -4, 14, 20, 50, 51.4, M.paper, 0.3, 2)));
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

export function imac(M, x, y, z, yaw = 0) {
  const g = new THREE.Group();
  g.add(S(rbox(0, 0, 54, 1.2, 14, 46, M.plasticWhite, 0.5, 2)));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(52 * CM, 30 * CM), M.screenOff); scr.position.set(0, 30 * CM, 0.65 * CM); g.add(scr);
  g.add(S(rbox(0, -3, 8, 2.4, 1, 24, M.steel, 0.5, 2)));
  g.add(S(rbox(0, -2, 20, 16, 0, 1, M.steel, 0.5, 2)));
  const kb = S(rbox(0, 22, 42, 12, 0, 1.1, M.plasticWhite, 0.4, 2)); g.add(kb);
  g.add(S(rbox(30, 22, 6, 10, 0, 2.2, M.plasticWhite, 2.5, 3)));
  g.position.set(x * CM, z * CM, y * CM); g.rotation.y = yaw;
  return g;
}

export function headphoneStand(M, x, y, z) {
  const g = new THREE.Group();
  g.add(S(new THREE.Mesh(new THREE.CylinderGeometry(8 * CM, 8 * CM, 1.2 * CM, 28), M.plasticGrey)));
  const post = S(new THREE.Mesh(new THREE.CylinderGeometry(0.9 * CM, 0.9 * CM, 24 * CM, 10), M.plasticGrey)); post.position.y = 12 * CM; g.add(post);
  const band = S(new THREE.Mesh(new THREE.TorusGeometry(8.5 * CM, 1.4 * CM, 10, 28, Math.PI), M.plasticGrey)); band.position.y = 25 * CM; g.add(band);
  [-1, 1].forEach((s) => { const cup = S(new THREE.Mesh(new THREE.CylinderGeometry(5.2 * CM, 5.2 * CM, 3.4 * CM, 24), M.plasticGrey)); cup.rotation.z = Math.PI / 2; cup.position.set(s * 8.8 * CM, 24.4 * CM, 0); g.add(cup); });
  g.position.set(x * CM, z * CM, y * CM);
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
  // small shelf with a trailing plant, a white frame and a clip lamp
  const sh = S(cbox(10, 22, 1.6, M.oak)); sh.position.set((x - 7) * CM, (z0 + 22) * CM, (y0 + 45) * CM); g.add(sh);
  const pot = S(new THREE.Mesh(new THREE.CylinderGeometry(4.6 * CM, 3.4 * CM, 7 * CM, 18), M.ceramic)); pot.position.set((x - 7) * CM, (z0 + 26) * CM, (y0 + 45) * CM); g.add(pot);
  for (let i = 0; i < 9; i++) { const lf = S(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), i % 2 ? M.leafA : M.leafB)); lf.scale.set(3.4 * CM, 1.2 * CM, 2.4 * CM); lf.position.set((x - 7 + Math.cos(i * 1.3) * 5) * CM, (z0 + 31 - (i > 5 ? i - 5 : 0) * 1.6) * CM, (y0 + 45 + Math.sin(i * 1.3) * 7) * CM); lf.rotation.set(i * 0.7, i * 0.9, 0.3); g.add(lf); }
  const fr = S(cbox(2.4, 34, 44, M.laminateWhite)); fr.position.set((x - 3.4) * CM, (z0 + 24) * CM, (y0 + 118) * CM); g.add(fr);
  const pp = new THREE.Mesh(new THREE.PlaneGeometry(30 * CM, 40 * CM), M.paper); pp.rotation.y = -Math.PI / 2; pp.position.set((x - 4.7) * CM, (z0 + 24) * CM, (y0 + 118) * CM); g.add(pp);
  return g;
}

export function booksAlongY(M, x, y0, y1, z, maxH = 24, seed = 3, depth = 24) {
  const r = rng(seed), g = new THREE.Group();
  let p = y0 + 1;
  while (p < y1 - 3) {
    const w = 2 + r() * 3, hgt = maxH * (0.65 + r() * 0.35);
    const m = S(new THREE.Mesh(new THREE.BoxGeometry(depth * 0.8 * CM, hgt * CM, w * CM), M._bookMats[(r() * M._bookMats.length) | 0]));
    m.position.set(x * CM, (z + hgt / 2) * CM, (p + w / 2) * CM); g.add(m);
    p += w + 0.15; if (r() < 0.12) p += 6 + r() * 10;
  }
  return g;
}

/** Paw-print holes (cat paw, 貓掌孔) cut through a cabinet door facing north (toward -y). */
export function pawHoles(M, x, y, z) {
  const g = new THREE.Group();
  const dot = (dx, dz, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r * CM, 24), M.shadowGap); m.position.set((x + dx) * CM, (z + dz) * CM, y * CM - 0.0005); m.rotation.y = Math.PI; g.add(m); };
  dot(0, 0, 4.2); dot(-5, 7.2, 2.2); dot(0, 9.6, 2.4); dot(5.4, 7, 2); dot(-8.4, 13, 1.1); dot(6.8, 12.4, 1.2);
  return g;
}
