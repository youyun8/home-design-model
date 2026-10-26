import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CM, box, cbox, setPos } from './core.js';
import { rbox, bx, led, curtain, plant, rng } from './furn-common.js';

const S = (m, castShadow = true, receiveShadow = true) => { m.castShadow = castShadow; m.receiveShadow = receiveShadow; return m; };

// =================================================================================================
// 主臥 (x -157..252, y 0..333, ceiling 270)
// =================================================================================================
export function buildBedroom(M, ctx) {
  const g = new THREE.Group();
  g.name = 'bedroom-furniture';
  const r = rng(11);

  // ---- 系統床頭板 (wall panel behind the beds) with LED strip on top, height 105
  g.add(bx(-157, 324, 192, 333, 0, 105, { all: M.oak, t: M.oak }));
  for (let x = -150; x < 190; x += 12) g.add(bx(x, 323.4, x + 0.5, 324, 8, 100, { all: M.oakDark }, { cast: false }));
  g.add(led(M, -156, 324, 191, 324, 105, 1.4));
  g.add(bx(-157, 321, 192, 324, 103.6, 105, { all: M.oak }));
  // skirting shadow gap
  g.add(bx(-157, 323.5, 192, 324, 0, 7, { all: M.shadowGap }, { cast: false }));

  // ---- beds: 3.5 ft (105) + 5 ft (150), length 6.2 ft (188)
  const bed = (x0, x1, pillows, duvet, throwMat) => {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    g.add(bx(x0 + 1, 144, x1 - 1, 322, 6, 24, { all: M.laminateWhite }));          // platform frame
    g.add(bx(x0 + 3, 146, x1 - 3, 320, 0, 6, { all: M.shadowGap }, { cast: false })); // recessed plinth
    g.add(S(rbox(cx, 233, w - 4, 182, 24, 44, M.linen, 4, 4)));                     // mattress
    g.add(S(rbox(cx, 215, w - 1, 148, 40, 49, duvet, 4.5, 4)));                     // duvet
    g.add(S(rbox(cx, 144 + 6, w + 0.5, 14, 36, 50, duvet, 4, 4)));                  // folded duvet edge at foot
    if (throwMat) g.add(S(rbox(cx, 190, w - 8, 38, 46, 53, throwMat, 3, 4)));
    const pw = (w - 10) / pillows;
    for (let i = 0; i < pillows; i++) {
      const p = rbox(x0 + 5 + pw * (i + 0.5), 308, pw - 4, 34, 43, 58, M.linen, 6, 5);
      p.rotation.x = -0.12; g.add(S(p));
    }
  };
  bed(-155, -52, 1, M.linenGrey, null);
  bed(-50, 100, 2, M.fabricCream, M.sage);
  // bedside floating cabinet + wall lamp
  g.add(bx(104, 296, 148, 333, 36, 60, { all: M.laminateWhite }));
  g.add(bx(105, 295, 147, 296, 38, 58, { all: M.oak }));
  g.add(bx(114, 294.6, 138, 295, 54, 55, { all: M.blackMetal }));
  g.add(rbox(126, 315, 14, 12, 60, 64, M.ceramic, 2, 2));
  g.add(crescentLamp(M, 126, 321, 98, Math.PI / 2, ctx));
  ctx.colliders.push([-157, 142, 100, 333], [104, 296, 148, 333]);

  // ---- wardrobe (D1 主臥衣櫃): x 192..250, y 132..332
  {
    const X0 = 190, X1 = 250;
    g.add(bx(248, 132, 250, 333, 0, 268, { all: M.laminateWhite }));                 // back
    g.add(bx(X0, 330.5, X1, 333, 0, 268, { all: M.laminateWhite }));                 // south side
    g.add(bx(X0, 130, X1, 132.5, 12, 268, { all: M.laminateWhite }));                // north side
    g.add(bx(192, 130, 250, 333, 0, 12, { all: M.shadowGap }, { cast: false }));     // kick (recessed)
    g.add(bx(189, 130, 250, 333, 208, 210.5, { all: M.laminateWhite }));              // mid shelf
    g.add(bx(189, 130, 250, 333, 266, 268, { all: M.laminateWhite }));
    // open shelving (y 132..172): shelves + a few objects
    const sh = [40, 80, 120, 160, 200];
    sh.forEach((z) => g.add(bx(192, 132, 248, 172, z, z + 2, { all: M.oak })));
    g.add(bx(192, 171, 248, 172.5, 12, 208, { all: M.laminateWhite }));
    // doors
    const door = (y0, y1, z0, z1, mat) => {
      g.add(bx(189, y0 + 0.3, 191, y1 - 0.3, z0 + 0.3, z1 - 0.3, { all: mat }));
      const hy = (y0 + y1) / 2;
    };
    // north hanging section (y 172..252): hanging door above, 3 drawers below
    door(172, 252, 89, 208, M.oak);
    for (let i = 0; i < 3; i++) door(172, 252, 12 + i * 25.6, 12 + (i + 1) * 25.6, M.oak);
    // south section: two stacked doors
    door(252, 332, 108, 208, M.oak); door(252, 332, 12, 108, M.oak);
    // upper cabinets (吊櫃)
    door(132, 172, 210.5, 266, M.oak); door(172, 252, 210.5, 266, M.oak); door(252, 332, 210.5, 266, M.oak);
    // recessed pulls
    const pull = (y, z, len = 18) => g.add(bx(188.4, y, 189.4, y + 1.2, z, z + len, { all: M.blackMetal }, { cast: false }));
    pull(250, 100); pull(254, 160); pull(172.8, 160); pull(330, 140); pull(251, 232 - 14, 14);
    for (let i = 0; i < 3; i++) g.add(bx(188.4, 190, 189.4, 232, 12 + i * 25.6 + 20, 12 + i * 25.6 + 21.2, { all: M.blackMetal }, { cast: false }));
    ctx.colliders.push([188, 130, 252, 333]);
  }
  // air-conditioner above the bedroom door
  g.add(acUnit(M, 241, 54, 90, 226));

  // ---- armchair (round lounge chair)
  g.add(loungeChair(M, -95, 66, 0.9, M.sage));
  ctx.colliders.push([-130, 32, -60, 100]);

  // ---- curtains
  g.add(curtain(M, { axis: 'x', a: -152, b: 122, c: 6, zTop: 245, zBottom: 3, panelW: 62 }));
  g.add(curtain(M, { axis: 'y', a: 64, b: 190, c: -155, zTop: 245, zBottom: 3, panelW: 36 }));
  g.add(plant(M, 214, 118, { h: 110, pot: 15, seed: 7 }));
  ctx.colliders.push([200, 108, 228, 130]);
  return g;
}

/** Wall light "Crescent 新月": a vertical half cylinder; `rotY` points the open side away from the wall. */
export function crescentLamp(M, x, y, z, rotY, ctx) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(7 * CM, 7 * CM, 26 * CM, 28, 1, false, 0, Math.PI), M.lampShade.clone());
  m.material.emissive = new THREE.Color(0xffe2b0); m.material.emissiveIntensity = 0;
  m.rotation.y = rotY; m.position.set(x * CM, z * CM, y * CM); m.userData.lamp = true;
  ctx.lamps.push(m);
  return m;
}

export function acUnit(M, cx, cy, len, z, alongY = true) {
  const g = new THREE.Group();
  const w = alongY ? 20 : len, d = alongY ? len : 20;
  g.add(S(rbox(cx, cy, w, d, z, z + 27, M.plasticWhite, 3, 3)));
  g.add(S(rbox(cx + (alongY ? -3 : 0), cy + (alongY ? 0 : 3), alongY ? 6 : len - 4, alongY ? len - 4 : 6, z + 2, z + 5, M.plasticGrey, 1, 2), false, false));
  return g;
}

export function loungeChair(M, x, y, scale = 1, fabric = M.sage) {
  const g = new THREE.Group();
  const s = scale;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = S(new THREE.Mesh(new THREE.CylinderGeometry(1.3 * CM * s, 1.1 * CM * s, 34 * CM * s, 10), M.oakDark));
    leg.position.set(Math.cos(a) * 20 * CM * s, 17 * CM * s, Math.sin(a) * 20 * CM * s);
    leg.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18);
    g.add(leg);
  }
  const seat = S(new THREE.Mesh(new THREE.CylinderGeometry(33 * CM * s, 31 * CM * s, 12 * CM * s, 40), fabric));
  seat.position.y = 38 * CM * s; g.add(seat);
  const cushion = S(new THREE.Mesh(new THREE.CylinderGeometry(29 * CM * s, 29 * CM * s, 8 * CM * s, 40), M.fabricCream));
  cushion.position.y = 47 * CM * s; g.add(cushion);
  const back = S(new THREE.Mesh(new THREE.CylinderGeometry(33 * CM * s, 32 * CM * s, 40 * CM * s, 40, 1, true, -Math.PI * 0.55, Math.PI * 1.1), fabric));
  back.material = fabric.clone(); back.material.side = THREE.DoubleSide;
  back.position.y = 62 * CM * s; back.rotation.y = Math.PI / 2 + 0.6; g.add(back);
  g.position.set(x * CM, 0, y * CM);
  return g;
}

// =================================================================================================
// 客廳 + 玄關
// =================================================================================================
export function buildLiving(M, ctx) {
  const g = new THREE.Group();
  g.name = 'living-furniture';

  // ---- TV wall (A2): TV console 236 x 45, TV 65", floating shelves, 80 cm cabinet
  const CX0 = 262, CX1 = 307;
  g.add(bx(CX0 + 3, 99, CX1 - 3, 331, 0, 10, { all: M.shadowGap }, { cast: false }));
  g.add(bx(CX0, 97, CX1, 333, 10, 44, { all: M.laminateWarm }));
  g.add(bx(CX0, 97, CX1 + 0.4, 333, 44, 47.5, { all: M.oak }));
  for (let i = 0; i < 3; i++) {
    const y0 = 97 + i * 78.7;
    g.add(bx(CX1, y0 + 0.6, CX1 + 1.2, y0 + 77.5, 12, 43, { all: M.laminateWhite }));
    g.add(bx(CX1 + 1.2, y0 + 10, CX1 + 1.8, y0 + 68, 40.8, 41.8, { all: M.blackMetal }, { cast: false })); // slot pull
    if (i === 1) g.add(bx(CX1 + 1.2, y0 + 3, CX1 + 1.8, y0 + 75, 27.6, 28.2, { all: M.shadowGap }, { cast: false }));
  }
  // media items on the console
  g.add(S(rbox(285, 150, 24, 18, 47.5, 56, M.ceramic, 3, 3)));
  g.add(S(rbox(280, 285, 16, 16, 47.5, 71, M.oakDark, 2, 3)));
  g.add(plant(M, 284, 118, { h: 55, pot: 8, seed: 21, kind: 'small' }));
  // 65" TV (144 x 83 cm) wall mounted, centred on the console
  {
    const tv = new THREE.Group();
    tv.add(S(rbox(266.4, 212, 3.4, 148, 66, 152.5, M.blackMatte, 0.6, 2)));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(143 * CM, 81 * CM), M.screenOff);
    scr.rotation.y = Math.PI / 2; scr.position.set(268.2 * CM, 109.8 * CM, 212 * CM);
    scr.userData.tv = true; scr.userData.dynamic = true; tv.add(scr);
    tv.add(bx(262, 205, 264.8, 218, 100, 112, { all: M.blackMetal }));
    g.add(tv); ctx.tv = scr;
  }
  // floating shelves
  g.add(bx(262, 286, 282, 372, 175, 178, { all: M.oak }));
  g.add(bx(262, 306, 282, 366, 133, 136, { all: M.oak }));
  g.add(S(rbox(272, 330, 14, 12, 136, 152, M.ceramic, 3, 3)));
  g.add(S(rbox(272, 350, 16, 10, 178, 200, M.laminateWarm, 1.5, 2)));
  g.add(S(rbox(272, 315, 10, 36, 178, 186, M.fabricGrey, 1, 2)));
  // 80 cm tall cabinet (R15 corner) south of the console
  g.add(bx(262, 333, 307, 413, 0, 94, { all: M.laminateWhite }));
  g.add(bx(307, 334, 308.2, 412, 3, 55, { all: M.laminateWarm }));
  g.add(bx(307, 334, 308.2, 412, 56, 92, { all: M.laminateWarm }));
  g.add(bx(308.2, 340, 308.9, 405, 54, 55, { all: M.blackMetal }, { cast: false }));
  // cove LED along the TV wall head
  g.add(led(M, 264, 100, 264, 330, 262, 1.4));
  ctx.colliders.push([262, 95, 309, 413]);

  // ---- sofa 230 x 85 facing the TV (west)
  g.add(sofa(M, 537, 200));
  ctx.colliders.push([495, 84, 582, 316]);

  // ---- sofa back wall (A3): wood partition panel + wall light + intercom, grey mirror strip
  g.add(bx(595.5, 297, 598, 357, 0, 236.5, { all: M.laminateGrey }));
  for (let z = 15; z < 230; z += 30) g.add(bx(595, 297, 595.6, 357, z, z + 0.4, { all: M.shadowGap }, { cast: false }));
  g.add(bx(595.5, 357, 598, 377, 0, 236.5, { all: M.mirrorGrey }, { cast: false }));
  g.add(bx(594.8, 322, 595.6, 332, 140, 152, { all: M.plasticWhite }, { cast: false }));          // intercom
  g.add(bx(594.8, 354, 595.6, 360, 69, 75, { all: M.plasticWhite }, { cast: false }));
  g.add(crescentLamp(M, 595.4, 327, 180, Math.PI, ctx));

  // ---- living windows: curtains / plant / AC
  g.add(curtain(M, { axis: 'x', a: 272, b: 588, c: 6, zTop: 260, zBottom: 3, panelW: 78 }));
  g.add(acUnit(M, 426, 14, 84, 218, false));
  g.add(plant(M, 288, 42, { h: 130, pot: 17, seed: 31 }));
  ctx.colliders.push([272, 28, 304, 58]);

  // ---- 玄關鞋櫃 (A1): 171 x 45, full height, 2 doors with perforated panels, vent slots
  {
    const Y0 = 540, Y1 = 585;
    g.add(bx(264, Y0, 435, Y1, 0, 222, { all: M.laminateWhite }));
    g.add(bx(264, Y0 - 2, 435, Y0, 0, 20.8, { all: M.shadowGap }, { cast: false }));
    for (let i = 0; i < 2; i++) {
      const x0 = 264 + 1 + i * 85.2, x1 = x0 + 84;
      g.add(bx(x0, Y0 - 2, x1, Y0, 21.2, 221, { all: i === 0 ? M.oak : M.laminateWarm }));
      g.add(bx(x1 - 4, Y0 - 3.4, x1 - 2.6, Y0 - 2, 90, 150, { all: M.blackMetal }, { cast: false }));
      for (let k = 0; k < 7; k++) g.add(bx(x0 + 8 + k * 10, Y0 - 2.5, x0 + 9 + k * 10, Y0 - 1.8, 8, 17, { all: M.blackMatte }, { cast: false }));
    }
    // perforated shape on the left door
    g.add(bx(274, Y0 - 2.6, 313, Y0 - 2, 110, 168, { all: M.blackMatte }, { cast: false }));
    g.add(bx(276, Y0 - 3.0, 311, Y0 - 2.6, 112, 138, { all: M.glassTint }, { cast: false }));
    g.add(bx(276, Y0 - 3.0, 311, Y0 - 2.6, 142, 166, { all: M.glassTint }, { cast: false }));
    ctx.colliders.push([264, 538, 435, 585]);
  }
  g.add(plant(M, 568, 540, { h: 95, pot: 15, seed: 51 }));
  ctx.colliders.push([552, 524, 584, 556]);
  return g;
}

export function sofa(M, cx, cy) {
  const g = new THREE.Group();
  const X0 = cx - 42, Y0 = cy - 115;
  // legs
  [[X0 + 8, Y0 + 8], [X0 + 8, Y0 + 222], [X0 + 76, Y0 + 8], [X0 + 76, Y0 + 222]].forEach(([x, y]) => {
    const l = S(new THREE.Mesh(new THREE.CylinderGeometry(2 * CM, 1.6 * CM, 10 * CM, 12), M.blackMetal));
    l.position.set(x * CM, 5 * CM, y * CM); g.add(l);
  });
  g.add(S(rbox(cx, cy, 84, 230, 9, 30, M.sofa, 4, 4)));                 // base
  // arms (north / south)
  g.add(S(rbox(cx, Y0 + 9, 84, 18, 9, 62, M.sofa, 6, 5)));
  g.add(S(rbox(cx, Y0 + 221, 84, 18, 9, 62, M.sofa, 6, 5)));
  // seat cushions
  const sw = (230 - 36) / 3;
  for (let i = 0; i < 3; i++) g.add(S(rbox(cx - 8, Y0 + 18 + sw * (i + 0.5), 58, sw - 1, 30, 46, M.sofa, 5, 5)));
  // back cushions (reclined)
  for (let i = 0; i < 3; i++) {
    const b = rbox(cx + 28, Y0 + 18 + sw * (i + 0.5), 20, sw - 1, 46, 86, M.sofa, 6, 5);
    b.rotation.z = 0.2; b.position.x += 3 * CM; g.add(S(b));
  }
  g.add(S(rbox(cx + 36, cy, 12, 194, 30, 66, M.sofa, 4, 4)));            // back frame
  // throw pillows
  const p1 = rbox(cx - 6, Y0 + 28, 44, 12, 46, 88, M.sage, 6, 5); p1.rotation.set(0.15, 0.5, 0.1); p1.position.y = 66 * CM; g.add(S(p1));
  const p2 = rbox(cx - 6, Y0 + 202, 44, 12, 46, 88, M.terracotta, 6, 5); p2.rotation.set(-0.15, -0.5, 0.1); p2.position.y = 66 * CM; g.add(S(p2));
  return g;
}
