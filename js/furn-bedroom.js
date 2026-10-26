import * as THREE from 'three';
import { CM } from './core.js';
import { rbox, bx, led } from './furn-common.js';
import { acUnit } from './furn-rooms-a.js';
import { nightstand, woodArmchair, sideTableRound } from './decor.js';
import { softMesh } from './soft.js';

const S = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };

// =================================================================================================
// 主臥 (x -157..252, y 0..333, ceiling 270): oak headboard panel with LED, two low floating platform beds,
// full-height oak wardrobe, wood armchair at the floor-length window; curtains are added by curtains.js
// =================================================================================================
export function buildBedroom(M, ctx) {
  const g = new THREE.Group();
  g.name = 'bedroom-furniture';

  // ---- headboard panel (horizontal grain) + LED wash on the wall above
  g.add(bx(-157, 324, 192, 333, 0, 105, { all: M.oak, n: M.oakH }));
  g.add(bx(-157, 321, 192, 324, 103.6, 105, { all: M.oak }));
  g.add(led(M, -156, 324, 191, 324, 105, 1.4));

  // ---- beds (recommended): low floating oak platform frames, 22 cm pocket-spring mattress, cotton-linen
  // sheet, oat duvet folded back at the head end, one pillow per 75 cm of width. 3.5 ft + 5 ft.
  const bed = (x0, x1, pillows) => {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    g.add(S(rbox(cx, 231, w - 2, 184, 13, 26, M.oak, 1.6, 3)));                            // platform slab
    g.add(bx(x0 + 12, 152, x1 - 12, 312, 3, 13, { all: M.shadowGap }, { cast: false }));   // recessed base: the frame floats
    g.add(softMesh({ w: w - 5, h: 22, d: 180, r: 6, fold: 0.15 }, M.bedSheet, cx, 232, 37));               // mattress, top at 48
    g.add(softMesh({ w: w + 3, h: 25, d: 126, r: 9, fold: 0.7, crown: 1.2, seed: x0 }, M.bedDuvet, cx, 204, 43.5)); // duvet, hangs 12 cm down both sides
    g.add(softMesh({ w: w + 1.5, h: 10, d: 28, r: 5, fold: 0.6, seed: x1 }, M.bedDuvet, cx, 262, 56));    // folded-back head end
    const pw = (w - 8) / pillows;
    for (let i = 0; i < pillows; i++) {
      g.add(softMesh({ w: Math.min(pw - 4, 62), h: 14, d: 38, r: 6, fold: 0.5, pinch: 0.5, crown: 2, seed: i + x0 }, M.bedPillow, x0 + 4 + pw * (i + 0.5), 304, 56, { x: -0.16 }));
    }
  };
  bed(-135, -32, 1);
  bed(-30, 120, 2);
  g.add(nightstand(M, 146, 302));
  ctx.colliders.push([-137, 140, 122, 333], [126, 284, 168, 324]);

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

  // ---- window corner: wood armchair, round table (curtains come from curtains.js)
  g.add(woodArmchair(M, -112, 84, -Math.PI / 2));
  g.add(sideTableRound(M, -58, 62));
  ctx.colliders.push([-144, 54, -80, 114], [-90, 40, -26, 86]);
  return g;
}
