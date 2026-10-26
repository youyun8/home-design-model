import * as THREE from 'three';
import { CM, box } from './core.js';
import { rbox, bx, led, curtain } from './furn-common.js';
import { acUnit } from './furn-rooms-a.js';
import { discLamp, smartPanel, mushroomLamp, teddy, kettleSet, airPurifier, booksAlongY, roundedPanel, pawHoles } from './decor.js';

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
  g.add(booksAlongY(M, 283, Y0 + mod + 3, Y0 + 2 * mod - 3, 10.5, 12.5, 4, 22));
  g.add(booksAlongY(M, 283, Y0 + 2 * mod + 3, Y0 + 3 * mod - 3, 10.5, 12.5, 5, 22));
  g.add(teddy(M, 284, 130, 44));
  g.add(mushroomLamp(M, 284, 292, 44, ctx));

  // ---- tall black cabinet with two arched oak doors, tray + kettle on top (y 333..413)
  g.add(bx(CX0, 333, CX1, 413, 0, 94, { all: blk }));
  g.add(bx(CX1 - 0.4, 334, CX1 + 0.4, 412, 6, 27, { all: M.shadowGap }, { cast: false }));
  for (let i = 0; i < 2; i++) {
    const d = roundedPanel({ w: 38.6, h: 65, rBot: 14, thick: 1.8, face: 'E', mat: M.oak });
    d.position.set(CX1 * CM, 28.6 * CM, (334.4 + i * 39.4) * CM);
    g.add(d);
  }
  g.add(kettleSet(M, 285, 373, 94));

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
  g.add(S(rbox(272, 345, 14, 12, 136, 152, M.ceramic, 3, 3)));
  g.add(S(rbox(272, 330, 12, 8, 178, 192, M.oakDark, 2, 3)));
  g.add(S(rbox(272, 300, 6, 30, 178, 186, M.fabricGrey, 1, 2)));
  g.add(led(M, 264, 100, 264, 330, 262, 1.4));
  ctx.colliders.push([262, 95, 309, 413]);

  // ---- sofa: olive velvet body, bouclé cushions
  g.add(sofa(M, 537, 200));
  ctx.colliders.push([495, 84, 582, 316]);

  // ---- study side partition (x = 598): oak wall panel, ribbed-glass slit, mirror, round wall light, smart panel
  const WX = 598;
  g.add(bx(WX - 0.5, 0, WX, 297, 223, 280, { all: M.paintSage }));        // olive beam above the study opening
  g.add(bx(WX - 0.5, 297, WX, 357, 225, 280, { all: M.paintSage }));
  g.add(bx(WX - 0.5, 357, WX, 465, 215, 252, { all: M.paintSage }));
  g.add(bx(WX - 2.2, 297, WX, 357, 0, 225, { all: M.oak }));
  g.add(bx(WX - 3, 272, WX - 0.2, 297, 0, 225, { all: M.charcoal }));
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

  // ---- windows: floor length grey sheer curtains, A/C, air purifier
  g.add(curtain(M, { axis: 'x', a: 272, b: 588, c: 6, zTop: 258, zBottom: 1, panelW: 163, mat: M.curtainGrey }));
  g.add(acUnit(M, 426, 14, 84, 218, false));
  g.add(airPurifier(M, 500, 52));
  ctx.colliders.push([480, 32, 520, 72]);

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

export function sofa(M, cx, cy) {
  const g = new THREE.Group();
  const X0 = cx - 42, Y0 = cy - 115;
  [[X0 + 9, Y0 + 10], [X0 + 9, Y0 + 220], [X0 + 75, Y0 + 10], [X0 + 75, Y0 + 220]].forEach(([x, y]) => {
    const l = S(new THREE.Mesh(new THREE.CylinderGeometry(2.2 * CM, 1.1 * CM, 14 * CM, 10), M.blackMetal));
    l.position.set(x * CM, 7 * CM, y * CM); g.add(l);
  });
  g.add(S(rbox(cx, cy, 84, 230, 13, 34, M.sofaGreen, 3, 4)));
  g.add(S(rbox(cx, Y0 + 9, 84, 18, 13, 62, M.sofaGreen, 3, 4)));
  g.add(S(rbox(cx, Y0 + 221, 84, 18, 13, 62, M.sofaGreen, 3, 4)));
  g.add(S(rbox(cx + 36, cy, 12, 212, 34, 80, M.sofaGreen, 3, 4)));
  const sw = (230 - 36) / 2;
  for (let i = 0; i < 2; i++) g.add(S(rbox(cx - 7, Y0 + 18 + sw * (i + 0.5), 60, sw - 1, 34, 49, M.boucle, 6, 5)));
  const bw = (230 - 36) / 3;
  for (let i = 0; i < 3; i++) {
    const b = rbox(cx + 25, Y0 + 18 + bw * (i + 0.5), 22, bw - 1.5, 49, 90, M.boucle, 8, 5);
    b.rotation.z = 0.2; b.position.x += 4 * CM; g.add(S(b));
  }
  const p = rbox(cx + 6, Y0 + 40, 13, 42, 49, 90, M.tealCushion, 6, 5); p.rotation.set(0.08, 0.1, 0.22); g.add(S(p));
  return g;
}
