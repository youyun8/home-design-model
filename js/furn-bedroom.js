import * as THREE from 'three';
import { CM } from './core.js';
import { rbox, bx, led } from './furn-common.js';
import { acUnit } from './furn-rooms-a.js';
import { blind, nightstand, woodArmchair, sideTableRound } from './decor.js';

const S = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };

// =================================================================================================
// 主臥 (x -157..252, y 0..333, ceiling 270): oak headboard panel with LED, two low platform beds,
// full-height oak wardrobe, wood armchair at the floor-length window, zebra blinds
// =================================================================================================
export function buildBedroom(M, ctx) {
  const g = new THREE.Group();
  g.name = 'bedroom-furniture';

  // ---- headboard panel (horizontal grain) + LED wash on the wall above
  g.add(bx(-157, 324, 192, 333, 0, 105, { all: M.oak, n: M.oakH }));
  g.add(bx(-157, 321, 192, 324, 103.6, 105, { all: M.oak }));
  g.add(led(M, -156, 324, 191, 324, 105, 1.4));

  // ---- beds: 3.5 ft + 5 ft, low oak platform frames
  const bed = (x0, x1, pillows, throwLen) => {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    g.add(bx(x0 + 1, 140, x1 - 1, 322, 14, 27, { all: M.oak }));
    g.add(bx(x0 + 4, 143, x1 - 4, 319, 4, 14, { all: M.shadowGap }, { cast: false }));
    g.add(S(rbox(cx, 231, w - 4, 182, 27, 41, M.linen, 3, 4)));
    g.add(S(rbox(cx, 205, w - 1.5, 150, 38, 48, M.boucle, 5, 4)));
    g.add(S(rbox(cx, 134 + 24, w + 0.5, 16, 33, 49, M.boucle, 4, 4)));
    if (throwLen) g.add(S(rbox(cx, 168, w - 6, throwLen, 47, 51, M.throwStripe, 2, 3)));
    const pw = (w - 8) / pillows.length;
    pillows.forEach((mat, i) => {
      const p = rbox(x0 + 4 + pw * (i + 0.5), 306 - (i % 2) * 3, pw - 3, 34, 41, 57, mat, 6, 5);
      p.rotation.set(-0.14, (i % 2 ? 0.08 : -0.06), 0); g.add(S(p));
    });
  };
  bed(-155, -52, [M.linen, M.pillowGrey], 34);
  bed(-50, 100, [M.pillowGrey, M.linen, M.linen], 40);
  g.add(nightstand(M, 126, 302));
  ctx.colliders.push([-157, 140, 100, 333], [104, 284, 148, 324]);

  // ---- wardrobe along the east wall (x 190..250): oak doors with thin black reveals
  {
    const X0 = 190, X1 = 250, white = { all: M.laminateWhite };
    g.add(bx(248, 132, 250, 333, 0, 268, white));
    g.add(bx(X0, 330.5, X1, 333, 0, 268, white));
    g.add(bx(X0, 130, X1, 132.5, 12, 268, white));
    g.add(bx(192, 130, 250, 333, 0, 12, { all: M.shadowGap }, { cast: false }));
    g.add(bx(189, 130, 250, 333, 208, 210.5, white));
    g.add(bx(189, 130, 250, 333, 266, 268, white));
    [40, 80, 120, 160, 200].forEach((z) => g.add(bx(192, 132, 248, 172, z, z + 2, { all: M.oak })));
    g.add(bx(192, 171, 248, 172.5, 12, 208, white));
    g.add(bx(191, 172, 192.6, 333, 12, 266, { all: M.blackMatte }, { cast: false }));     // dark reveal behind doors
    const door = (y0, y1, z0, z1) => g.add(bx(189, y0 + 0.35, 191, y1 - 0.35, z0 + 0.35, z1 - 0.35, { all: M.oak }));
    door(172, 252, 89, 208);
    for (let i = 0; i < 3; i++) door(172, 252, 12 + i * 25.6, 12 + (i + 1) * 25.6);
    door(252, 332, 108, 208); door(252, 332, 12, 108);
    door(132, 172, 210.5, 266); door(172, 252, 210.5, 266); door(252, 332, 210.5, 266);
    for (let i = 0; i < 3; i++) g.add(bx(188.5, 190, 189.5, 234, 12 + i * 25.6 + 21.4, 12 + i * 25.6 + 22.4, { all: M.blackMetal }, { cast: false }));
    ctx.colliders.push([188, 130, 252, 333]);
  }
  g.add(acUnit(M, 241, 54, 90, 226));

  // ---- window corner: wood armchair, round table, zebra blinds
  g.add(woodArmchair(M, -126, 118, -Math.PI / 2));
  g.add(sideTableRound(M, -94, 176));
  ctx.colliders.push([-158, 88, -100, 150], [-124, 150, -62, 202]);
  g.add(blind(M, { axis: 'x', a: -152, b: 122, c: 4, zTop: 236, zBottom: 118 }));
  g.add(blind(M, { axis: 'y', a: 64, b: 190, c: -155, zTop: 236, zBottom: 112 }));
  return g;
}
