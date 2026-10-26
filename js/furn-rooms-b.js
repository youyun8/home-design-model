import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CM, box, cbox } from './core.js';
import { rbox, bx, led, curtain, plant, rng, hangingClothes, books } from './furn-common.js';
import { acUnit } from './furn-rooms-a.js';

const S = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };
const tube = (pts, radius, mat, seg = 40) => {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0] * CM, p[2] * CM, p[1] * CM)));
  return S(new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius * CM, 10, false), mat));
};

// =================================================================================================
// 廚房 (x 0..252, y 342..585, ceiling 240). The north counter x 120..252 (sink, filter cabinet,
// water dispenser) is built in dispenser-scene.js so the plumbing can be shown there.
// =================================================================================================
export const COUNTER_TOP = 92.4;

export function buildKitchen(M, ctx) {
  const g = new THREE.Group();
  g.name = 'kitchen-furniture';

  // ---- north counter, west part (stove) x 0..120
  g.add(bx(0, 343, 120, 402, 10, 89.9, { all: M.laminateWarm }));
  g.add(bx(4, 346, 120, 402, 0, 10, { all: M.shadowGap }, { cast: false }));
  g.add(bx(0, 342, 120, 402.4, 89.9, COUNTER_TOP, { all: M.quartz }));
  // fronts: 3 drawers under the hob, door pair next to it
  for (let i = 0; i < 3; i++) {
    g.add(bx(0.6, 402, 59.4, 404, 11 + i * 26.3, 11 + (i + 1) * 26.3 - 0.8, { all: i === 1 ? M.laminateWarm : M.laminateWarm }));
    g.add(bx(14, 404, 46, 405, 11 + (i + 1) * 26.3 - 5, 11 + (i + 1) * 26.3 - 3.8, { all: M.blackMetal }, { cast: false }));
  }
  g.add(bx(60.6, 402, 119.4, 404, 11, 89, { all: M.laminateWarm }));
  g.add(bx(110, 404, 111.2, 405.2, 54, 82, { all: M.blackMetal }, { cast: false }));
  // gas hob 76 x 46
  g.add(bx(14, 350, 90, 396, COUNTER_TOP, COUNTER_TOP + 0.6, { all: M.hobGlass }));
  [[34, 366], [70, 366]].forEach(([x, y]) => {
    const burner = S(new THREE.Mesh(new THREE.CylinderGeometry(5.5 * CM, 6.5 * CM, 1.2 * CM, 28), M.gasGrate));
    burner.position.set(x * CM, (COUNTER_TOP + 1.2) * CM, y * CM); g.add(burner);
    const ring = S(new THREE.Mesh(new THREE.TorusGeometry(10 * CM, 0.5 * CM, 6, 36), M.gasGrate));
    ring.rotation.x = Math.PI / 2; ring.position.set(x * CM, (COUNTER_TOP + 1.6) * CM, y * CM); g.add(ring);
    for (let k = 0; k < 4; k++) {
      const arm = S(new THREE.Mesh(new THREE.BoxGeometry(24 * CM, 0.9 * CM, 1.0 * CM), M.gasGrate));
      arm.position.set(x * CM, (COUNTER_TOP + 2.4) * CM, y * CM); arm.rotation.y = (k * Math.PI) / 4; g.add(arm);
    }
  });
  for (let i = 0; i < 2; i++) { // knobs on the front edge
    const kn = S(new THREE.Mesh(new THREE.CylinderGeometry(1.6 * CM, 1.6 * CM, 1.4 * CM, 14), M.blackMetal));
    kn.rotation.x = Math.PI / 2; kn.position.set((30 + i * 36) * CM, (COUNTER_TOP - 1.2) * CM, 403.5 * CM); g.add(kn);
  }
  // cutting board + knife block
  g.add(S(rbox(105, 372, 34, 22, COUNTER_TOP, COUNTER_TOP + 2, M.oak, 1.2, 2)));
  g.add(S(rbox(106, 350, 8, 12, COUNTER_TOP, COUNTER_TOP + 20, M.oakDark, 1, 2)));
  // tile backsplash lip + outlet
  g.add(bx(60, 342.2, 66, 343, 100, 112, { all: M.plasticWhite }, { cast: false }));
  ctx.colliders.push([0, 342, 120, 402]);

  // ---- south wall: lower cabinets x 6..166 (50/50/60 + 3 filler), hanging cabinets with LED
  g.add(bx(0, 525, 166, 585, 10, 89.9, { all: M.laminateWarm }));
  g.add(bx(4, 528, 166, 585, 0, 10, { all: M.shadowGap }, { cast: false }));
  g.add(bx(0, 524.6, 166, 585, 89.9, COUNTER_TOP, { all: M.quartz }));
  const lower = [[3, 56, 'drawers'], [56, 106, 'door'], [106, 166, 'door']];
  lower.forEach(([a, b, kind]) => {
    if (kind === 'drawers') {
      g.add(bx(a, 523.2, b - 0.6, 525, 11, 40, { all: M.laminateWarm })); g.add(bx(a, 523.2, b - 0.6, 525, 40.8, 89, { all: M.laminateWarm }));
      g.add(bx(a + 10, 522.4, b - 10, 523.2, 36, 37.2, { all: M.blackMetal }, { cast: false })); g.add(bx(a + 10, 522.4, b - 10, 523.2, 85, 86.2, { all: M.blackMetal }, { cast: false }));
    } else {
      g.add(bx(a + 0.3, 523.2, b - 0.3, 525, 11, 89, { all: M.laminateWarm }));
      g.add(bx(b - 7, 522.4, b - 5.8, 523.2, 58, 84, { all: M.blackMetal }, { cast: false }));
    }
  });
  // backsplash laminate + hanging cabinets 37 deep
  g.add(bx(0, 583, 166, 585, COUNTER_TOP, 166.4, { all: M.laminateWarm }));
  g.add(bx(3, 548, 166, 585, 166.4, 240, { all: M.laminateWhite }));
  [[3, 56], [56, 106], [106, 166]].forEach(([a, b]) => {
    g.add(bx(a + 0.3, 546.4, b - 0.3, 548, 167.2, 239.4, { all: M.laminateWhite }));
    g.add(bx(b - 6, 545.8, b - 4.8, 546.4, 168, 188, { all: M.blackMetal }, { cast: false }));
  });
  g.add(led(M, 5, 549.4, 164, 549.4, 165.4, 1.2));
  ctx.colliders.push([0, 523, 166, 585]);

  // ---- fridge (REF 75x75) and the D60 cabinet above
  g.add(bx(166, 525, 252, 585, 201.6, 240, { all: M.laminateWhite }));
  g.add(bx(167, 523.4, 251, 525, 202.2, 239.4, { all: M.laminateWhite }));
  g.add(bx(228, 522.8, 229.2, 523.4, 205, 222, { all: M.blackMetal }, { cast: false }));
  g.add(bx(166, 520, 168, 585, 0, 201.6, { all: M.laminateWhite }));
  g.add(fridge(M, 208, 548));
  g.add(bx(166, 524.4, 252, 585, 178.6, 201.6, { all: M.shadowGap }, { cast: false }));
  ctx.colliders.push([168, 510, 252, 585]);
  return g;
}

function fridge(M, cx, cy) {
  const g = new THREE.Group();
  g.add(S(rbox(cx, cy, 72, 68, 4, 178, M.fridge, 1.2, 3)));
  g.add(bx(cx - 36, cy - 34.2, cx + 36, cy - 33.6, 59, 60.2, { all: M.shadowGap }, { cast: false }));
  g.add(bx(cx - 32, cy - 36, cx - 30.4, cy - 34, 70, 120, { all: M.stainless }));
  g.add(bx(cx - 32, cy - 36, cx - 30.4, cy - 34, 118, 150, { all: M.stainless }));
  g.add(bx(cx - 32, cy - 36, cx - 30.4, cy - 34, 140, 172, { all: M.stainless }));
  const upper = rbox(cx, cy - 34.1, 70, 0.8, 61, 176, M.fridge, 0.3, 2); upper.material = M.fridge; g.add(S(upper));
  [[0, 3], [-34.3, 0]].forEach(() => {});
  g.add(bx(cx - 33, cy - 37, cx - 31.2, cy - 34, 120, 160, { all: M.stainless }));
  g.add(bx(cx - 33, cy - 37, cx - 31.2, cy - 34, 22, 52, { all: M.stainless }));
  return g;
}

// =================================================================================================
// 書房 (x 610..862, y 0..357, raised floor +14, ceiling 270)
// =================================================================================================
export function buildStudy(M, ctx) {
  const g = new THREE.Group();
  g.name = 'study-furniture';
  const F = 14; // raised floor
  // ---- desk 190 x 70, top at 75 (relative to the raised floor)
  const dx0 = 661, dx1 = 851, dy0 = 151, dy1 = 221;
  g.add(bx(dx0, dy0, dx1, dy1, F + 71, F + 75, { all: M.oak }));
  [dx0 + 6, dx1 - 8].forEach((x) => {
    g.add(bx(x, dy0 + 4, x + 2.4, dy1 - 4, F, F + 71, { all: M.blackMetal }));
    g.add(bx(x - 8, dy0 + 2, x + 10, dy0 + 4, F, F + 2, { all: M.blackMetal }, { cast: false }));
  });
  g.add(bx(dx0 + 8, dy1 - 10, dx1 - 10, dy1 - 8, F + 60, F + 62, { all: M.blackMetal }));
  // laptop, tablet, notebooks, mug
  const lap = new THREE.Group();
  lap.add(S(rbox(0, 0, 32, 22, 0, 1.6, M.steel, 0.6, 2)));
  const scr = S(rbox(0, -10.5, 32, 0.9, 1.4, 21.8, M.blackMetal, 0.4, 2));
  scr.rotation.x = -0.28; scr.position.y = 0.5 * CM; lap.add(scr);
  lap.position.set(708 * CM, (F + 75) * CM, 188 * CM); lap.rotation.y = Math.PI; g.add(lap);
  g.add(S(rbox(760, 200, 21, 29, F + 75, F + 76.4, M.paper, 0.3, 2)));
  g.add(S(rbox(782, 196, 16, 22, F + 75, F + 77.2, M.leather, 0.5, 2)));
  const mug = S(new THREE.Mesh(new THREE.CylinderGeometry(3.6 * CM, 3.2 * CM, 9 * CM, 18), M.ceramic));
  mug.position.set(738 * CM, (F + 79.5) * CM, 208 * CM); g.add(mug);
  // desk lamp (arm lamp, plan shows round shade)
  g.add(deskLamp(M, 668, 185, F + 75, ctx));
  // chair facing the desk (north)
  g.add(officeChair(M, 745, 252, F));
  ctx.colliders.push([660, 150, 852, 222], [720, 228, 772, 276]);

  // ---- bookcase / wardrobe along the south wall (A4)
  const BY0 = 297, BY1 = 357, top = F + 244 - 14;
  g.add(bx(611, 355, 862, 357, F, F + 230, { all: M.laminateWhite }));
  g.add(bx(611, BY0, 613, 357, F, F + 230, { all: M.laminateWhite }));
  g.add(bx(860, BY0, 862, 357, F, F + 230, { all: M.laminateWhite }));
  g.add(bx(611, BY0 + 2, 862, 357, F, F + 2.5, { all: M.shadowGap }, { cast: false }));
  // open shelving section x 700..862
  const shelfZ = [75, 120, 159, 198, 229].map((z) => z + F);
  shelfZ.forEach((z, i) => {
    g.add(bx(700, BY0, 861, 357, z, z + 2.2, { all: M.laminateWhite }));
    g.add(bx(700, BY0 - 1.2, 861, BY0, z, z + 3.2, { all: M.aluminumWhite }));     // 前緣 3CM 嵌鋁條
    if (i < 4) g.add(led(M, 702, BY0 + 1.5, 859, BY0 + 1.5, z - 1.5, 1.2));
  });
  [700, 748.5, 802, 860.4].forEach((x) => g.add(bx(x, BY0 + 6, x + 1.8, 357, F, F + 231, { all: M.laminateWhite })));
  // books / objects
  const bookRows = [[shelfZ[0], 28, 3], [shelfZ[1], 31, 4], [shelfZ[2], 32, 5], [shelfZ[3], 24, 6]];
  bookRows.forEach(([z, h, seed], i) => {
    g.add(books(M, i % 2 ? 752 : 706, i % 2 ? 858 : 800, 330, z + 2.2, h, seed));
  });
  g.add(S(rbox(830, 330, 10, 10, shelfZ[3] + 2.2, shelfZ[3] + 18, M.ceramic, 2, 3)));
  g.add(S(rbox(718, 330, 18, 16, shelfZ[4] + 2.2, shelfZ[4] + 4.2, M.oak, 1, 2)));
  // lower doors (x 700..862)
  [[701.8, 748], [750.3, 801.6], [803.8, 860]].forEach(([a, b]) => {
    g.add(bx(a, BY0 - 1.6, b, BY0, F + 2.7, F + 74.4, { all: M.laminateWarm }));
    g.add(bx(b - 7, BY0 - 2.4, b - 5.8, BY0 - 1.6, F + 52, F + 70, { all: M.blackMetal }, { cast: false }));
  });
  // wardrobe section x 611..700 (hanging area + 3 drawers)
  g.add(bx(611, 350, 700, 357, F + 214, F + 216, { all: M.laminateWhite }));
  g.add(bx(612, 335, 698, 336.6, F + 211, F + 212.6, { all: M.chrome }, { cast: false }));
  g.add(hangingClothes(M, 614, 696, 333, F + 211, 13, 'x'));
  for (let i = 0; i < 3; i++) g.add(bx(613, BY0 - 1.8, 699, BY0, F + 2.7 + i * 25.4, F + 2.7 + (i + 1) * 25.4 - 0.8, { all: M.oak }));
  [[613, 655.5], [656.5, 699]].forEach(([a, b], i) => g.add(bx(a, BY0 - 1.8, b, BY0, F + 78, F + 232, { all: M.oak })));
  [[653, 654.2], [657.4, 658.6]].forEach(([a, b]) => g.add(bx(a, BY0 - 2.6, b, BY0 - 1.8, F + 130, F + 160, { all: M.blackMetal }, { cast: false })));
  ctx.colliders.push([611, 296, 862, 357]);

  // ---- climate + soft furnishing
  g.add(acUnit(M, 768, 14, 85, F + 208, false));
  g.add(curtain(M, { axis: 'x', a: 715, b: 858, c: 6, zTop: F + 232, zBottom: F + 2, panelW: 52 }));
  g.add(plant(M, 628, 250, { h: 125, pot: 16, seed: 71 }));
  ctx.colliders.push([612, 236, 646, 268]);
  // folding-door LED slot
  g.add(led(M, 641, 8, 641, 270, 228, 1.4));
  return g;
}

function deskLamp(M, x, y, z, ctx) {
  const g = new THREE.Group();
  const base = S(new THREE.Mesh(new THREE.CylinderGeometry(7 * CM, 7.4 * CM, 1.6 * CM, 28), M.blackMetal));
  base.position.set(x * CM, (z + 0.8) * CM, y * CM); g.add(base);
  g.add(tube([[x, y, z + 1.6], [x + 1, y, z + 24], [x + 14, y - 2, z + 40], [x + 40, y + 2, z + 44], [x + 66, y + 4, z + 38]], 0.55, M.blackMetal, 30));
  const shade = S(new THREE.Mesh(new THREE.SphereGeometry(9.5 * CM, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M.lampShade.clone()));
  shade.material.emissive = new THREE.Color(0xffe2b0); shade.material.emissiveIntensity = 0; shade.userData.lamp = true;
  shade.position.set((x + 70) * CM, (z + 40) * CM, (y + 4) * CM); shade.rotation.z = Math.PI + 0.12; g.add(shade);
  ctx.lamps.push(shade);
  return g;
}

function officeChair(M, x, y, z) {
  const g = new THREE.Group();
  const rot = new THREE.Group();
  const seat = S(rbox(0, 0, 48, 47, 44, 52, M.fabricGrey, 5, 4));
  rot.add(seat);
  const back = S(rbox(0, 22, 44, 7, 52, 98, M.fabricGrey, 4, 4)); back.rotation.x = -0.12; rot.add(back);
  const post = S(new THREE.Mesh(new THREE.CylinderGeometry(2.4 * CM, 2.4 * CM, 28 * CM, 12), M.blackMetal));
  post.position.y = 30 * CM; rot.add(post);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = S(new THREE.Mesh(new THREE.BoxGeometry(3 * CM, 2.4 * CM, 28 * CM), M.blackMetal));
    arm.position.set(Math.sin(a) * 14 * CM, 16 * CM, Math.cos(a) * 14 * CM); arm.rotation.y = a; rot.add(arm);
    const w = S(new THREE.Mesh(new THREE.SphereGeometry(2.6 * CM, 10, 8), M.rubber));
    w.position.set(Math.sin(a) * 27 * CM, 3 * CM, Math.cos(a) * 27 * CM); rot.add(w);
  }
  rot.rotation.y = Math.PI + 0.18;
  g.add(rot);
  g.position.set(x * CM, z * CM, y * CM);
  return g;
}

// =================================================================================================
// 衛浴 (shower with angled door, WC against the shaft, vanity on the south wall)
// =================================================================================================
export function buildBath(M, ctx) {
  const g = new THREE.Group();
  g.name = 'bath-furniture';
  // ---- toilet (faces west, tank next to the shaft)
  {
    const t = new THREE.Group();
    const bowl = S(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), M.ceramic));
    bowl.scale.set(23 * CM, 19 * CM, 18 * CM); bowl.position.set(0, 25 * CM, 0); t.add(bowl);
    const pedestal = S(rbox(8, 0, 30, 28, 0, 30, M.ceramic, 6, 4)); t.add(pedestal);
    const tank = S(rbox(15, 0, 24, 38, 30, 72, M.ceramic, 3, 4)); tank.position.x += 12 * CM; t.add(tank);
    const seat = S(new THREE.Mesh(new THREE.TorusGeometry(1, 0.075, 8, 36), M.plasticWhite));
    seat.scale.set(21 * CM, 17 * CM, 1); seat.rotation.x = Math.PI / 2; seat.position.set(-2 * CM, 42 * CM, 0); t.add(seat);
    const lid = S(new THREE.Mesh(new THREE.CylinderGeometry(21 * CM, 21 * CM, 1.2 * CM, 32), M.plasticWhite));
    lid.scale.z = 17 / 21; lid.position.set(-2 * CM, 43.6 * CM, 0); t.add(lid);
    const btn = S(new THREE.Mesh(new THREE.CylinderGeometry(3.4 * CM, 3.4 * CM, 1 * CM, 20), M.chrome));
    btn.position.set(14 * CM, 72.4 * CM, 0); t.add(btn);
    t.position.set(843 * CM, 0, 405 * CM);
    g.add(t);
    // bidet remote panel on the wall
    g.add(bx(877, 392, 878, 408, 90, 112, { all: M.plasticWhite }, { cast: false }));
  }
  ctx.colliders.push([806, 378, 878, 432]);

  // ---- vanity (wall hung, 85.7 wide) + quartz top + basin + faucet + mirror
  g.add(bx(714.5, 535, 800, 584, 38, 74, { all: M.laminateWarm }));
  g.add(bx(714.5, 533.6, 800, 535, 40, 72, { all: M.laminateWhite }));
  g.add(bx(714.5, 533, 800.4, 585, 74, 77, { all: M.quartz }));
  const basin = S(rbox(757, 560, 56, 40, 77, 86, M.ceramic, 6, 4));
  const bowlIn = S(new THREE.Mesh(new THREE.CylinderGeometry(21 * CM, 17 * CM, 3 * CM, 36), M.ceramic)); bowlIn.scale.z = 0.7;
  bowlIn.position.set(757 * CM, 85.2 * CM, 560 * CM);
  g.add(basin); g.add(bowlIn);
  const drain = S(new THREE.Mesh(new THREE.CylinderGeometry(2 * CM, 2 * CM, 0.4 * CM, 16), M.chrome)); drain.position.set(757 * CM, 86.8 * CM, 560 * CM); g.add(drain);
  g.add(tube([[757, 581, 86], [757, 579, 112], [757, 570, 118], [757, 565, 112]], 1.0, M.chrome, 18));
  g.add(bx(756, 580, 758, 584, 112, 118, { all: M.chrome }));
  // shaped hanging mirror (capsule)
  const mirror = new THREE.Mesh(new THREE.CapsuleGeometry(24 * CM, 28 * CM, 6, 24), M.mirror);
  mirror.scale.set(1, 1, 0.04); mirror.position.set(757 * CM, 138 * CM, 584.6 * CM); g.add(mirror);
  g.add(bx(740, 584, 774, 585, 168, 169, { all: M.blackMetal }, { cast: false }));
  ctx.colliders.push([714, 530, 802, 585]);

  // ---- shower: fixed glass + angled swing door, rain head, valve, hand-shower bar
  g.add(bx(800.4, 497, 802, 584, 0, 200, { all: M.glass }, { cast: false }));
  g.add(bx(800, 497, 802.4, 584, 0, 2, { all: M.blackMetal }, { cast: false }));
  g.add(bx(800, 497, 802.4, 499, 0, 200, { all: M.blackMetal }, { cast: false }));
  g.add(bx(800, 497, 802.4, 584, 198.6, 200.6, { all: M.blackMetal }, { cast: false }));
  const head = S(new THREE.Mesh(new THREE.CylinderGeometry(11 * CM, 11 * CM, 1.4 * CM, 32), M.chrome));
  head.position.set(906 * CM, 205 * CM, 520 * CM); g.add(head);
  g.add(bx(906, 519, 914, 521, 203, 207, { all: M.chrome }));
  g.add(bx(912, 530, 914, 532, 40, 170, { all: M.chrome }));        // hand shower slide bar
  g.add(bx(910, 540, 914, 552, 108, 112, { all: M.chrome }));        // mixer
  const drain2 = S(new THREE.Mesh(new THREE.BoxGeometry(60 * CM, 0.5 * CM, 3 * CM), M.chrome));
  drain2.position.set(850 * CM, 0.2 * CM, 578 * CM); g.add(drain2);
  // wall niche shelf / towel bar
  g.add(bx(878, 380, 879, 382, 0, 0.1, { all: M.chrome }, { cast: false }));
  g.add(bx(612, 392, 614, 422, 100, 102, { all: M.chrome }));
  g.add(bx(612, 394, 616, 396, 98, 102, { all: M.chrome })); g.add(bx(612, 418, 616, 420, 98, 102, { all: M.chrome }));
  g.add(bx(700, 377, 728, 378.4, 135, 136.6, { all: M.chrome }));
  // coloured accent band (跳彩色水磨石 100x35) behind the vanity and in the shower
  g.add(bx(714.2, 584.4, 800.4, 585, 75, 110, { all: M.wallTerrazzoAccent }, { cast: false }));
  g.add(bx(913.4, 506, 914, 584, 105, 140, { all: M.wallTerrazzoAccent }, { cast: false }));
  g.add(bx(609.6, 380, 610.2, 460, 105, 140, { all: M.wallTerrazzoAccent }, { cast: false }));
  // threshold + exhaust
  g.add(bx(609, 377, 616, 465, 0, 0.6, { all: M.aluminumWhite }, { cast: false }));
  g.add(bx(738, 440, 770, 464, 238.6, 240, { all: M.laminateWhite }, { cast: false }));
  return g;
}

// =================================================================================================
// 後陽台
// =================================================================================================
export function buildBalcony(M, ctx) {
  const g = new THREE.Group();
  g.name = 'balcony-furniture';
  // laundry tub with two bowls (洗衣槽)
  g.add(bx(-170, 388, -128, 486, 0, 82, { all: M.laminateWhite }));
  g.add(bx(-171, 387, -127, 487, 82, 85, { all: M.ceramic }));
  [[-149, 413], [-149, 462]].forEach(([x, y]) => {
    const bowl = S(new THREE.Mesh(new THREE.CylinderGeometry(15 * CM, 12 * CM, 3.2 * CM, 28), M.stainless));
    bowl.position.set(x * CM, 85.2 * CM, y * CM); bowl.scale.z = 1.25; g.add(bowl);
    const dr = S(new THREE.Mesh(new THREE.CylinderGeometry(2 * CM, 2 * CM, 0.4 * CM, 14), M.chrome)); dr.position.set(x * CM, 86.9 * CM, y * CM); g.add(dr);
  });
  g.add(tube([[-170, 437, 85], [-170, 437, 110], [-160, 437, 118], [-152, 437, 112]], 0.9, M.chrome, 16));
  // washing machine 60 x 62
  g.add(S(rbox(-150, 548, 64, 66, 0, 86, M.plasticWhite, 3, 3)));
  const door = S(new THREE.Mesh(new THREE.CylinderGeometry(19 * CM, 19 * CM, 2 * CM, 36), M.glassTint));
  door.rotation.z = Math.PI / 2; door.position.set(-117.5 * CM, 45 * CM, 548 * CM); g.add(door);
  const ring = S(new THREE.Mesh(new THREE.TorusGeometry(20 * CM, 1.4 * CM, 8, 36), M.steel));
  ring.rotation.y = Math.PI / 2; ring.position.set(-117.2 * CM, 45 * CM, 548 * CM); g.add(ring);
  g.add(bx(-117.2, 520, -116.4, 532, 74, 80, { all: M.blackMatte }, { cast: false }));
  // gas water heater hung on the north wall (熱水器)
  g.add(S(rbox(-52, 354, 46, 20, 118, 196, M.plasticWhite, 3, 3)));
  g.add(bx(-70, 352, -34, 354, 154, 172, { all: M.blackMatte }, { cast: false }));
  for (let i = 0; i < 3; i++) g.add(bx(-62 + i * 12, 344, -60.4 + i * 12, 346, 100, 118, { all: M.steel }));
  // shelf + baskets
  g.add(bx(-193, 390, -178, 470, 138, 140, { all: M.oak }));
  g.add(S(rbox(-186, 408, 12, 28, 140, 156, M.fabricCream, 2, 3)));
  g.add(S(rbox(-186, 446, 12, 24, 140, 150, M.sage, 2, 3)));
  g.add(curtain(M, { axis: 'y', a: 372, b: 560, c: -176, zTop: 218, zBottom: 4, panelW: 38 }));
  g.add(plant(M, -30, 566, { h: 80, pot: 11, seed: 91 }));
  ctx.colliders.push([-171, 387, -127, 487], [-184, 515, -118, 583], [-76, 344, -28, 376]);
  return g;
}
