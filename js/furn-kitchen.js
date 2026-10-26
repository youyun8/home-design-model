import * as THREE from 'three';
import { CM } from './core.js';
import { rbox, bx, led } from './furn-common.js';

const S = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };

// =================================================================================================
// 廚房 (x 0..252, y 342..585, ceiling 240).
// Style taken from the site photo: white flat handleless fronts with a black grip slot, black recessed
// plinth, a black reveal line under the white counter, dark grey glass backsplash, slim chimney hood.
// The north counter x 120..252 (sink, filter cabinet, water dispenser) is built in dispenser.js.
// =================================================================================================
export const COUNTER_TOP = 92.4;

export function buildKitchen(M, ctx) {
  const g = new THREE.Group();
  g.name = 'kitchen-furniture';
  const W = { all: M.cabinetWhite }, K = { all: M.blackMatte };

  // grip slot (black) on the face of a front. dir 'S' = front faces south (+y), 'N' = faces north (-y)
  const slot = (x0, x1, yFace, z, dir, top = true) => {
    const z0 = top ? z - 2.6 : z + 0.2, z1 = top ? z - 0.2 : z + 2.6;
    return dir === 'S'
      ? bx(x0 + 0.8, yFace, x1 - 0.8, yFace + 0.18, z0, z1, K, { cast: false })
      : bx(x0 + 0.8, yFace - 0.18, x1 - 0.8, yFace, z0, z1, K, { cast: false });
  };

  // ---------------------------------------------------------------- north run, west part (hob) x 0..120
  g.add(bx(0, 343, 120, 402, 10, 88.6, W));
  g.add(bx(4, 346, 120, 399, 0, 10, K, { cast: false }));                      // recessed black plinth
  g.add(bx(0, 342, 120, 402.4, 89.9, COUNTER_TOP, { all: M.quartz }));
  g.add(bx(0, 342, 120, 404, 88.6, 89.9, K, { cast: false }));                  // black reveal under the counter
  [[11, 37.2], [37.8, 62.8], [63.4, 88.4]].forEach(([z0, z1]) => {
    g.add(bx(0.6, 402, 59.4, 404, z0, z1, W));
    g.add(slot(0.6, 59.4, 404, z1, 'S'));
  });
  g.add(bx(60.6, 402, 119.4, 404, 11, 88.4, W));
  g.add(slot(60.6, 119.4, 404, 88.4, 'S'));
  ctx.colliders.push([0, 342, 120, 404]);

  // gas hob 76 x 46, two burners
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

  // slim chimney hood over the hob
  g.add(S(rbox(52, 362, 76, 40, 156, 165, M.hoodWhite, 1.5, 2)));
  g.add(bx(18, 345, 86, 381, 155.6, 156.2, K, { cast: false }));                // filter grille
  g.add(bx(37, 342, 67, 362, 165, 240, { all: M.hoodWhite }));                   // chimney to the ceiling
  g.add(bx(37.4, 361.8, 66.6, 362.2, 190, 192, K, { cast: false }));

  // ---------------------------------------------------------------- north wall: dark grey glass backsplash
  g.add(bx(0, 342, 252, 342.6, COUNTER_TOP, 150, { all: M.glassBacksplash }, { cast: false }));
  g.add(bx(0, 342, 252, 342.8, 150, 150.8, { all: M.steel }, { cast: false }));  // metal top trim

  // ---------------------------------------------------------------- south run (x 0..166): lowers, glass, uppers
  g.add(bx(0, 525, 166, 585, 10, 88.6, W));
  g.add(bx(4, 528, 166, 581, 0, 10, K, { cast: false }));
  g.add(bx(0, 524.6, 166, 585, 89.9, COUNTER_TOP, { all: M.quartz }));
  g.add(bx(0, 523.2, 166, 585, 88.6, 89.9, K, { cast: false }));
  [[3, 56, 'drawers'], [56, 106, 'door'], [106, 166, 'door']].forEach(([a, b, kind]) => {
    if (kind === 'drawers') {
      [[11, 37.2], [37.8, 62.8], [63.4, 88.4]].forEach(([z0, z1]) => {
        g.add(bx(a, 523.2, b - 0.6, 525, z0, z1, W)); g.add(slot(a, b - 0.6, 523.2, z1, 'N'));
      });
    } else {
      g.add(bx(a + 0.3, 523.2, b - 0.3, 525, 11, 88.4, W)); g.add(slot(a + 0.3, b - 0.3, 523.2, 88.4, 'N'));
    }
  });
  g.add(bx(0, 584.4, 166, 585, COUNTER_TOP, 166.4, { all: M.glassBacksplash }, { cast: false }));
  g.add(bx(3, 548, 166, 585, 166.4, 240, W));
  [[3, 56], [56, 106], [106, 166]].forEach(([a, b]) => {
    g.add(bx(a + 0.3, 546.4, b - 0.3, 548, 167.2, 239.4, W));
    g.add(slot(a + 0.3, b - 0.3, 546.4, 167.2, 'N', false));                        // finger grip along the bottom edge
  });
  g.add(led(M, 5, 549.4, 164, 549.4, 165.4, 1.2));
  ctx.colliders.push([0, 523, 166, 585]);

  // ---------------------------------------------------------------- fridge column and the cabinet above it
  g.add(bx(166, 525, 252, 585, 201.6, 240, W));
  g.add(bx(167, 523.4, 251, 525, 202.2, 239.4, W));
  g.add(slot(167, 251, 523.4, 202.2, 'N', false));
  g.add(bx(166, 520, 168, 585, 0, 201.6, W));
  g.add(fridge(M, 208, 548));
  g.add(bx(166, 524.4, 252, 585, 178.6, 201.6, { all: M.shadowGap }, { cast: false }));
  ctx.colliders.push([168, 510, 252, 585]);
  return g;
}

function fridge(M, cx, cy) {
  const g = new THREE.Group();
  g.add(S(rbox(cx, cy, 72, 68, 4, 178, M.fridge, 1.2, 3)));
  g.add(bx(cx - 36, cy - 34.2, cx + 36, cy - 33.6, 59, 60.2, { all: M.shadowGap }, { cast: false }));
  g.add(bx(cx - 33, cy - 37, cx - 31.2, cy - 34, 120, 160, { all: M.stainless }));
  g.add(bx(cx - 33, cy - 37, cx - 31.2, cy - 34, 22, 52, { all: M.stainless }));
  return g;
}
