import * as THREE from 'three';
import { CM, box } from './core.js';
import { rbox, bx, led } from './furn-common.js';
import { softMesh } from './soft.js';
import { acUnit } from './furn-rooms-a.js';
import { discLamp, smartPanel, roundedPanel, pawHoles } from './decor.js';

const S = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };

// =================================================================================================
// 客廳 + 玄關: TV wall, sofa, oak partition on the study side, shoe cabinet, curtains
// =================================================================================================
export function buildLiving(M, ctx) {
  const g = new THREE.Group();
  g.name = 'living-furniture';
  const blk = M.blackCabinet;

  // ---- TV console (black carcass, oak drawer fronts) x 262..307, y 97..333
  const CX0 = 262, CX1 = 307, Y0 = 97, Y1 = 333, mod = (Y1 - Y0) / 3;
  g.add(bx(CX0 + 3, Y0 + 2, CX1 - 3, Y1 - 2, 0, 8, { all: M.shadowGap }, { cast: false }));
  g.add(bx(CX0, Y0, CX1, Y1, 8, 10.5, { all: blk }));
  g.add(bx(CX0, Y0, CX1, Y1, 40.5, 44, { all: blk }));
  g.add(bx(CX0, Y0, CX0 + 2, Y1, 10.5, 40.5, { all: blk }));
  for (let i = 0; i <= 3; i++) g.add(bx(CX0, Y0 + i * mod - 0.9, CX1, Y0 + i * mod + 0.9, 10.5, 40.5, { all: blk }));
  for (let i = 1; i < 3; i++) {
    g.add(bx(CX0, Y0 + i * mod, CX1, Y0 + (i + 1) * mod, 24.4, 26, { all: blk }));
    g.add(bx(CX1 - 0.4, Y0 + i * mod + 1.2, CX1 + 1.8, Y0 + (i + 1) * mod - 1.2, 26.6, 40, { all: M.oak }));
    g.add(bx(CX1 + 1.8, Y0 + i * mod + 12, CX1 + 2.6, Y0 + (i + 1) * mod - 12, 37.4, 38.6, { all: blk }, { cast: false }));
  }

  // ---- tall black cabinet with two arched oak doors(y 333..413)
  g.add(bx(CX0, 333, CX1, 413, 0, 94, { all: blk }));
  g.add(bx(CX1 - 0.4, 334, CX1 + 0.4, 412, 6, 27, { all: M.shadowGap }, { cast: false }));
  for (let i = 0; i < 2; i++) {
    const d = roundedPanel({ w: 38.6, h: 65, rBot: 14, thick: 1.8, face: 'E', mat: M.oak });
    d.position.set(CX1 * CM, 28.6 * CM, (334.4 + i * 39.4) * CM);
    g.add(d);
  }

  // ---- 65" TV and black floating shelves
  const tv = new THREE.Group();
  tv.add(S(rbox(266.4, 212, 3.4, 148, 66, 152.5, M.blackMatte, 0.6, 2)));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(143 * CM, 81 * CM), M.screenOff);
  scr.rotation.y = Math.PI / 2; scr.position.set(268.2 * CM, 109.8 * CM, 212 * CM);
  scr.userData.tv = true; scr.userData.dynamic = true; tv.add(scr);
  tv.add(bx(262, 205, 264.8, 218, 100, 112, { all: M.blackMetal }));
  g.add(tv); ctx.tv = scr;
  g.add(bx(262, 262, 284, 372, 175, 178, { all: blk }));
  g.add(bx(262, 310, 282, 366, 133, 136, { all: blk }));
  g.add(led(M, 264, 100, 264, 330, 262, 1.4));
  ctx.colliders.push([262, 95, 309, 413]);

  // ---- sofa: olive velvet body, bouclé cushions
  g.add(sofa(M, 537, 200));
  ctx.colliders.push([495, 84, 582, 316]);

  // ---- sofa wall (x = 598, rose white): oak wall panel, ribbed-glass slit, mirror, round wall light, smart panel
  const WX = 598;
  g.add(bx(WX - 2.2, 297, WX, 357, 0, 225, { all: M.oak }));
  g.add(bx(WX - 3, 272, WX - 0.2, 297, 0, 225, { all: M.wallWhite }));
  g.add(bx(WX - 3.4, 272, WX - 2.2, 274.4, 0, 225, { all: M.blackMetal }));
  g.add(bx(WX - 3.4, 294.6, WX - 2.2, 297, 0, 225, { all: M.blackMetal }));
  g.add(bx(WX - 3.4, 272, WX - 2.2, 297, 222.6, 225, { all: M.blackMetal }));
  g.add(bx(WX - 3.4, 272, WX - 2.2, 297, 0, 2.4, { all: M.blackMetal }));
  g.add(bx(WX - 2.6, 274.4, WX - 2.1, 294.6, 2.4, 222.6, { all: M.glassRibbed }, { cast: false }));
  g.add(bx(WX - 1, 357, WX, 377, 0, 215, { all: M.mirrorDark }, { cast: false }));
  g.add(discLamp(M, WX - 2.2, 327, 176, ctx));
  g.add(smartPanel(M, WX - 2.2, 327, 128));
  // arched dark mirror on the entry wall
  { const m = roundedPanel({ w: 40, h: 112, rTop: 20, thick: 1.2, face: 'W', mat: M.mirrorDark }); m.position.set(597.85 * CM, 70 * CM, 505 * CM); g.add(m); }

  // ---- windows: curtains come from curtains.js; A/C unit above the window
    g.add(acUnit(M, 426, 14, 84, 218, false));

  // ---- shoe cabinet (4 oak doors, cat-paw cut-outs), floor to ceiling
  {
    const XA = 264, XB = 435, Y0s = 540, Y1s = 585, H = 248, dw = (XB - XA) / 4;
    g.add(bx(XA, Y0s, XB, Y1s, 0, H, { all: M.laminateWhite }));
    g.add(bx(XA, Y0s - 0.2, XB, Y0s + 0.2, 0, H, { all: M.charcoal }, { cast: false }));   // dark reveals between the doors
    g.add(bx(XA, Y0s - 1, XB, Y0s, 0, 13, { all: M.shadowGap }, { cast: false }));
    for (let i = 0; i < 4; i++) g.add(bx(XA + i * dw + 0.5, Y0s - 1.8, XA + (i + 1) * dw - 0.5, Y0s, 14, H - 3, { all: M.oak }));
    g.add(pawHoles(M, XA + 1.5 * dw, Y0s - 1.85, 112));
    g.add(bx(XA + 3 * dw - 2.4, Y0s - 3.2, XA + 3 * dw - 1.2, Y0s - 1.8, 30, 190, { all: M.blackMetal }, { cast: false }));
    ctx.colliders.push([264, 538, 435, 585]);
  }
  return g;
}

/**
 * Recommended sofa: 3-seat "slim track arm" sofa, 230 x 85 cm (fits the drawing), seat height 42 cm,
 * 14 cm tapered oak legs (a robot vacuum fits underneath), tech fabric that resists cat claws and wipes clean.
 * The fabric colour is switchable through M.sofaFabric.color.
 */
export function sofa(M, cx, cy) {
  const g = new THREE.Group();
  const Y0 = cy - 115, Y1 = cy + 115, F = M.sofaFabric;
  const add = (opts, x, y, zc, rot) => g.add(softMesh(opts, F, x, y, zc, rot));
  // tapered oak legs, slightly splayed
  [[cx - 32, Y0 + 12], [cx - 32, Y1 - 12], [cx + 32, Y0 + 12], [cx + 32, Y1 - 12]].forEach(([x, y]) => {
    const l = S(new THREE.Mesh(new THREE.CylinderGeometry(2.6 * CM, 1.5 * CM, 14.5 * CM, 14), M.sofaLeg));
    l.position.set(x * CM, 7.2 * CM, y * CM);
    l.rotation.set(((y > cy ? 1 : -1) * 0.07), 0, ((x > cx ? -1 : 1) * 0.07)); g.add(l);
  });
  add({ w: 82, h: 18, d: 226, r: 4, fold: 0.15 }, cx, cy, 23);                                // base rail
  add({ w: 84, h: 52, d: 13, r: 6, fold: 0.25 }, cx, Y0 + 6.5, 40);                           // arms
  add({ w: 84, h: 52, d: 13, r: 6, fold: 0.25, seed: 3 }, cx, Y1 - 6.5, 40);
  add({ w: 20, h: 56, d: 204, r: 7, fold: 0.3 }, cx + 31, cy, 56);                            // back frame
  const span = 204, n = 3, sw = span / n;
  for (let i = 0; i < n; i++) {
    const y = Y0 + 13 + sw * (i + 0.5);
    add({ w: 62, h: 15, d: sw - 1.2, r: 5.5, fold: 0.35, crown: 1.6, seed: i * 2 }, cx - 8, y, 37.5);   // seat cushions
    add({ w: 19, h: 42, d: sw - 1.2, r: 8, fold: 0.5, crown: 1.2, seed: i * 2 + 1 }, cx + 13.5, y, 67, { z: -0.2 }); // back cushions, relaxed recline
  }
  return g;
}
