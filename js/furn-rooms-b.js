import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CM, box, cbox } from './core.js';
import { rbox, bx } from './furn-common.js';

const S = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };
const tube = (pts, radius, mat, seg = 40) => {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0] * CM, p[2] * CM, p[1] * CM)));
  return S(new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius * CM, 10, false), mat));
};

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
  }
  ctx.colliders.push([806, 378, 878, 432]);

  // ---- vanity (wall hung, 85.7 wide) + quartz top + basin + faucet + mirror
  g.add(bx(714.5, 535, 800, 584, 38, 74, { all: M.cabinetWhite }));
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
  // towel bar
  g.add(bx(612, 392, 614, 422, 100, 102, { all: M.chrome }));
  g.add(bx(612, 394, 616, 396, 98, 102, { all: M.chrome })); g.add(bx(612, 418, 616, 420, 98, 102, { all: M.chrome }));
  g.add(bx(700, 377, 728, 378.4, 135, 136.6, { all: M.chrome }));
  // tall colourful terrazzo accent strip (跳色水磨石) on the shower side only: the far (east) wall seen from the door.
  // The toilet side stays plain beige-white tile.
  g.add(bx(913.4, 512, 914, 572, 0, 232, { all: M.wallTerrazzoAccent }, { cast: false }));
  g.add(bx(913.2, 511.6, 914, 572.4, 232, 233.2, { all: M.chrome }, { cast: false }));            // metal cap trim
  // threshold + exhaust
  g.add(bx(609, 377, 616, 465, 0, 0.6, { all: M.aluminumWhite }, { cast: false }));
  g.add(bx(738, 440, 770, 464, 238.6, 240, { all: M.laminateWhite }, { cast: false }));
  return g;
}

// =================================================================================================
// 後陽台 — no furniture or appliances. Only what is part of the building: the vertical aluminium louvre
// screen, the two ceiling drying rods and the metal railing (walls, ceiling, floor, door: architecture.js).
// =================================================================================================
export function buildBalcony(M, ctx) {
  const g = new THREE.Group();
  g.name = 'balcony-furniture';
  // vertical aluminium louvre screen in front of the heater
  {
    const x0 = -92, x1 = -22, y = 374, pitch = 7.8, n = Math.floor((x1 - x0) / pitch);
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * pitch;
      g.add(bx(x, y, x + 5.4, y + 1.8, 2, 234, { all: M.louvre }));
    }
    g.add(bx(x0 - 2, y - 1, x1 + 3, y + 3, 0, 2.4, { all: M.louvre }));
    g.add(bx(x0 - 2, y - 1, x1 + 3, y + 3, 232, 236, { all: M.louvre }));
    g.add(bx(x0 - 3, y - 1, x0 - 1, y + 3, 0, 236, { all: M.louvre }));
    g.add(bx(x1 + 1, y - 1, x1 + 3, y + 3, 0, 236, { all: M.louvre }));
    ctx.colliders.push([x0 - 4, y - 2, x1 + 4, y + 4]);
  }

  // ceiling-hung drying rods (two) with cords and a cleat on the dark wall
  [-128, -102].forEach((x) => {
    const rod = S(new THREE.Mesh(new THREE.CylinderGeometry(1.4 * CM, 1.4 * CM, 150 * CM, 14), M.aluminumWhite));
    rod.rotation.x = Math.PI / 2; rod.position.set(x * CM, 226 * CM, 440 * CM); g.add(rod);
    [372, 508].forEach((y) => {
      const pul = S(new THREE.Mesh(new THREE.CylinderGeometry(3.4 * CM, 3.4 * CM, 1.6 * CM, 20), M.chrome));
      pul.position.set(x * CM, 235 * CM, y * CM); g.add(pul);
      g.add(bx(x - 0.15, y - 0.15, x + 0.15, y + 0.15, 226, 235, { all: M.steel }, { cast: false }));
    });
    g.add(bx(x - 0.15, 342.4, x + 0.15, 342.8, 134, 234, { all: M.steel }, { cast: false }));
  });
  { const cl = S(new THREE.Mesh(new THREE.CylinderGeometry(3.6 * CM, 3.6 * CM, 1.2 * CM, 24), M.chrome)); cl.scale.z = 0.6; cl.rotation.x = Math.PI / 2; cl.position.set(-115 * CM, 130 * CM, 343 * CM); g.add(cl); }

  const x = -185.5, ya = 372, yb = 560, h = 105;
  g.add(bx(x - 1.8, ya, x + 1.8, yb, h - 3.4, h, { all: M.railing }));
  g.add(bx(x - 1.8, ya, x + 1.8, yb, 3, 6.6, { all: M.railing }));
  for (let y = ya + 2; y <= yb - 1; y += 11) g.add(bx(x - 0.9, y, x + 0.9, y + 1.8, 6.6, h - 3.4, { all: M.railing }));
  [ya, yb - 3.6].forEach((y) => g.add(bx(x - 2, y, x + 2, y + 3.6, 3, h, { all: M.railing })));
  ctx.colliders.push([-192, ya - 1, -179, yb + 1]);
  return g;
}
