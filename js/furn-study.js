import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CM, cbox } from './core.js';
import { rbox, bx, led } from './furn-common.js';
import { acUnit } from './furn-rooms-a.js';
import { pegboard, kidsChair } from './decor.js';

const S = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };

function officeChair(M, x, y, z, yaw) {
  const g = new THREE.Group(), rot = new THREE.Group();
  rot.add(S(rbox(0, 0, 50, 47, 44, 52, M.fabricGrey, 5, 4)));
  const back = S(rbox(0, 22, 46, 8, 52, 106, M.blackMetal, 4, 4)); back.rotation.x = -0.1; rot.add(back);
  const rest = S(rbox(0, 23, 28, 8, 98, 114, M.blackMetal, 4, 3)); rest.rotation.x = -0.1; rot.add(rest);
  [-1, 1].forEach((s) => rot.add(S(rbox(s * 27, 0, 4, 32, 60, 63, M.blackMetal, 1.5, 2))));
  const post = S(new THREE.Mesh(new THREE.CylinderGeometry(2.4 * CM, 2.4 * CM, 28 * CM, 12), M.blackMetal)); post.position.y = 30 * CM; rot.add(post);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = S(new THREE.Mesh(new THREE.BoxGeometry(3 * CM, 2.4 * CM, 28 * CM), M.blackMetal));
    arm.position.set(Math.sin(a) * 14 * CM, 16 * CM, Math.cos(a) * 14 * CM); arm.rotation.y = a; rot.add(arm);
    const w = S(new THREE.Mesh(new THREE.SphereGeometry(2.6 * CM, 10, 8), M.rubber)); w.position.set(Math.sin(a) * 27 * CM, 3 * CM, Math.cos(a) * 27 * CM); rot.add(w);
  }
  rot.rotation.y = yaw; g.add(rot);
  g.position.set(x * CM, z * CM, y * CM);
  return g;
}

// =================================================================================================
// 書房 (x 610..862, y 0..357, raised floor +14, ceiling 270): open shelving (dark back panel) with LED on rose-white walls, oak wardrobe
// units on the south wall, desk and pegboard on the east wall. No decorative objects.
// =================================================================================================
export function buildStudy(M, ctx) {
  const g = new THREE.Group();
  g.name = 'study-furniture';
  const F = 14, BY0 = 297;

  // ---- south wall: shelving (x 700..862) with a dark back panel in front of the rose-white wall, oak boards, LED under each board
  g.add(bx(700, 355, 862, 357, F, F + 230, { all: M.charcoal }));
  g.add(bx(611, BY0, 613, 357, F, F + 230, { all: M.laminateWhite }));
  g.add(bx(860, BY0, 862, 357, F, F + 230, { all: M.charcoal }));
  g.add(bx(611, BY0 + 2, 862, 357, F, F + 2.5, { all: M.shadowGap }, { cast: false }));
  const shelfZ = [75, 120, 159, 198, 229].map((z) => z + F);
  shelfZ.forEach((z, i) => {
    g.add(bx(700, BY0, 861, 357, z, z + 2.2, { all: i === 0 ? M.blackCabinet : M.oak }));
    if (i < 4) g.add(led(M, 702, BY0 + 1.5, 859, BY0 + 1.5, z - 1.5, 1.2));
  });
  [700, 748.5, 802, 858.4].forEach((x) => g.add(bx(x, BY0 + 6, x + 1.8, 357, F + 77, F + 231, { all: M.charcoal })));
  // lower oak doors
  [[701.8, 748], [750.3, 801.6], [803.8, 860]].forEach(([a, b]) => {
    g.add(bx(a, BY0 - 1.6, b, BY0, F + 2.7, F + 73.4, { all: M.oak }));
  });
  // tall wardrobe units next to the opening (x 611..700)
  g.add(bx(611, 350, 700, 357, F + 214, F + 216, { all: M.laminateWhite }));
  for (let i = 0; i < 3; i++) g.add(bx(613, BY0 - 1.8, 699, BY0, F + 2.7 + i * 25.4, F + 2.7 + (i + 1) * 25.4 - 0.8, { all: M.oak }));
  [[613, 655.5], [656.5, 699]].forEach(([a, b]) => g.add(bx(a, BY0 - 1.8, b, BY0, F + 78, F + 232, { all: M.oak })));
  g.add(bx(611, BY0 - 0.2, 700, BY0 + 0.4, F + 2, F + 232, { all: M.blackMatte }, { cast: false }));
  ctx.colliders.push([611, 296, 862, 357]);

  // ---- desk along the east wall (x 790..862), cabinet with white drawers at the south end
  const dz = F + 75;
  g.add(bx(790, 80, 862, 252, F + 71, dz, { all: M.oak }));
  g.add(bx(792, 80, 862, 82.4, F, F + 71, { all: M.oak }));
  g.add(bx(796, 196, 860, 252, F, F + 71, { all: M.oakDark }));
  for (let i = 0; i < 3; i++) {
    g.add(bx(794.2, 198 + 0.4, 796, 250.6, F + 2 + i * 22.6, F + 2 + (i + 1) * 22.6 - 0.8, { all: M.laminateWhite }));
    g.add(bx(793.4, 214, 794.4, 234, F + 2 + (i + 1) * 22.6 - 6, F + 2 + (i + 1) * 22.6 - 4.6, { all: M.steel }, { cast: false }));
  }
  g.add(pegboard(M, 862, 70, 260, F + 105, F + 150));
  g.add(officeChair(M, 752, 160, F, -Math.PI / 2));
  ctx.colliders.push([788, 78, 862, 254], [722, 134, 780, 188]);

  // ---- window corner: kids' table and chairs, A/C (curtains are added by curtains.js)
  g.add(S(rbox(700, 78, 62, 36, F + 44, F + 46.6, M.laminateWhite, 1, 2)));
  [[672, 64], [728, 64], [672, 92], [728, 92]].forEach(([x, y]) => { const l = S(cbox(2, 2, 44, M.steel)); l.position.set(x * CM, (F + 22) * CM, y * CM); g.add(l); });
  g.add(kidsChair(M, 686, 112, Math.PI));
  g.add(kidsChair(M, 716, 112, Math.PI));
  ctx.colliders.push([666, 58, 736, 128]);
  g.add(acUnit(M, 786, 14, 85, 240, false));
  g.add(led(M, 641, 8, 641, 270, 228, 1.4));
  return g;
}

