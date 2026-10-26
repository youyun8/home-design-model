import * as THREE from 'three';
import { CM, box, cbox, setPos, applyWorldUV } from './core.js';
import { SLAB, SOFFIT, FLOOR_RAISE_STUDY } from './data.js';

/**
 * Builds walls, floors, ceilings, windows and doors from the drawing data.
 * Returns the scene graph root plus the groups / door objects the viewer needs.
 */
export function buildArchitecture(M) {
  const root = new THREE.Group();
  root.name = 'architecture';
  const groups = {
    walls: new THREE.Group(), floors: new THREE.Group(), ceilings: new THREE.Group(),
    N: new THREE.Group(), S: new THREE.Group(), E: new THREE.Group(), W: new THREE.Group(),
  };
  Object.values(groups).forEach((g) => root.add(g));
  const colliders = [];
  const wallRects = [];
  const doors = [];

  // -------------------------------------------------------------------------------------------
  // walls with openings
  // -------------------------------------------------------------------------------------------
  /**
   * wall(rect, finish, openings, opts)
   *  finish: {n,s,e,w}  materials of the four vertical faces; jamb material = finish.jamb
   *  openings: [{ a, b, sill, head }] along the long axis (cm)
   */
  function wall([x0, y0, x1, y1], finish, openings = [], opts = {}) {
    const alongX = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
    const z0 = opts.z0 ?? 0, z1 = opts.z1 ?? SLAB;
    const target = opts.group || groups.walls;
    const jamb = finish.jamb || M.wallWhite;
    const faces = (end0, end1) => ({
      n: finish.n, s: finish.s, e: finish.e, w: finish.w,
      t: M.slabConcrete, b: M.slabConcrete,
      ...(alongX ? { w: end0 ? jamb : finish.w, e: end1 ? jamb : finish.e } : { n: end0 ? jamb : finish.n, s: end1 ? jamb : finish.s }),
    });
    const lo = alongX ? x0 : y0, hi = alongX ? x1 : y1;
    const ops = [...openings].sort((p, q) => p.a - q.a);
    const piece = (a, b, zA, zB, e0, e1, collide) => {
      if (b - a < 0.2 || zB - zA < 0.2) return;
      const r = alongX ? [a, y0, b, y1] : [x0, a, x1, b];
      const m = box(r[0], r[1], r[2], r[3], zA, zB, faces(e0, e1));
      m.userData.wall = true;
      target.add(m);
      if (collide) {
        const rc = [Math.min(r[0], r[2]), Math.min(r[1], r[3]), Math.max(r[0], r[2]), Math.max(r[1], r[3])];
        colliders.push(rc); wallRects.push(rc);
      }
    };
    let cur = lo, firstEnd = false;
    for (const o of ops) {
      piece(cur, o.a, z0, z1, firstEnd, true, true);
      if (o.sill > z0) piece(o.a, o.b, z0, o.sill, true, true, o.sill > 40);
      if (o.head < z1) piece(o.a, o.b, o.head, z1, true, true, false);
      if (o.win && o.sill <= 40) colliders.push(alongX ? [o.a, y0, o.b, y1] : [x0, o.a, x1, o.b]);
      cur = o.b; firstEnd = true;
    }
    piece(cur, hi, z0, z1, firstEnd, false, true);
  }

  const Wh = M.wallWhite, Pl = M.wallPlaster, Ex = M.exterior, Tz = M.wallTerrazzo, Kt = M.wallKitchenTile;

  // --- north façade (group N) with three window openings
  wall([-172, -15, 876, 0], { n: Ex, s: Wh, e: Ex, w: Ex, jamb: Wh }, [
    { a: -152, b: 122, sill: 4, head: 238, win: true },
    { a: 272, b: 588, sill: 4, head: 258, win: true },
    { a: 715, b: 858, sill: 14, head: 228, win: true },
  ], { group: groups.N });
  // exterior structural blocks / AC window box on the north side
  const blocks = [
    [-200, -100, -160, -15], [125, -100, 157, -15], [598, -100, 712, -15],
  ];
  blocks.forEach((b) => groups.N.add(box(b[0], b[1], b[2], b[3], 0, SLAB + 20, { all: M.concreteDark })));
  // AC window box (空調窗盒) with louvre front
  const acx0 = 157, acx1 = 245, acy0 = -85;
  groups.N.add(box(acx0, acy0, acx0 + 6, -15, 0, SLAB + 20, { all: M.concreteDark }));
  groups.N.add(box(acx1 - 6, acy0, acx1, -15, 0, SLAB + 20, { all: M.concreteDark }));
  groups.N.add(box(acx0, acy0, acx1, acy0 + 6, 0, SLAB + 20, { all: M.concreteDark }));
  for (let z = 120; z < 250; z += 11) groups.N.add(box(acx0 + 6, acy0 + 6, acx1 - 6, acy0 + 8, z, z + 5, { all: M.aluminumWhite }));
  groups.N.add(box(245, -15, 262, 0, 0, SLAB, { all: M.exterior }));
  colliders.push([-172, -15, 876, 0]);

  // --- west façade (group W)
  wall([-172, 0, -157, 342], { n: Ex, s: Ex, e: Wh, w: Ex, jamb: Wh }, [{ a: 64, b: 190, sill: 4, head: 238, win: true }], { group: groups.W });
  wall([-193, 342, -178, 600], { n: Ex, s: Ex, e: M.laminateWhite, w: Ex, jamb: M.laminateWhite }, [{ a: 372, b: 560, sill: 90, head: 222 }], { group: groups.W });
  groups.W.add(box(-200, -100, -160, 0, 0, SLAB + 20, { all: M.concreteDark }));
  groups.W.add(box(-200, 500, -178, 600, 0, SLAB + 20, { all: M.concreteDark }));

  // --- south façade (group S)
  wall([-193, 585, -16, 600], { n: M.laminateWhite, s: Ex, e: Ex, w: Ex }, [], { group: groups.S });
  wall([-16, 585, 262, 600], { n: Wh, s: Ex, e: Ex, w: Ex }, [], { group: groups.S });
  wall([262, 585, 598, 600], { n: Pl, s: Ex, e: Ex, w: Ex, jamb: Wh }, [{ a: 462, b: 574, sill: 0, head: 222 }], { group: groups.S });
  wall([598, 585, 930, 600], { n: Tz, s: Ex, e: Ex, w: Ex }, [], { group: groups.S });

  // --- east façade (group E)
  wall([862, -67, 876, 376], { n: Ex, s: Ex, e: Ex, w: Wh }, [], { group: groups.E });
  wall([914, 376, 928, 600], { n: Ex, s: Ex, e: Ex, w: Tz }, [], { group: groups.E });
  groups.E.add(box(862, 352, 928, 376, 0, SLAB + 20, { all: M.concreteDark }));
  // pipe shaft behind the toilet
  groups.walls.add(box(878, 376, 914, 448, 0, SLAB, { w: Tz, s: Tz, n: Tz, e: M.concreteDark, t: M.slabConcrete, b: M.slabConcrete }));
  colliders.push([862, -67, 876, 376], [914, 376, 928, 600], [878, 376, 914, 448]);

  // --- interior walls
  // bedroom | kitchen divider (also balcony north wall)
  wall([-193, 333, 0, 342], { n: Wh, s: Ex, e: Wh, w: Wh });
  wall([0, 333, 252, 342], { n: Wh, s: Kt, e: Wh, w: Wh });
  // kitchen west wall with balcony door
  wall([-16, 342, 0, 585], { n: Wh, s: Wh, e: Kt, w: M.laminateWhite, jamb: M.laminateWhite }, [{ a: 414, b: 500, sill: 0, head: 215 }]);
  // TV wall / kitchen east wall (x 252..262)
  wall([252, 0, 262, 342], { n: Wh, s: Wh, e: Pl, w: Wh, jamb: M.blackMatte }, [{ a: 5, b: 95, sill: 0, head: 218 }]);
  wall([252, 342, 262, 585], { n: Wh, s: Wh, e: Pl, w: Kt, jamb: M.blackMatte }, [{ a: 413, b: 497, sill: 0, head: 215 }]);
  // living east wall (x 598..610): study opening (folding glass door), bath door
  wall([598, 0, 610, 376], { n: Wh, s: Wh, e: Wh, w: Wh, jamb: M.blackMatte }, [{ a: 5, b: 272, sill: 0, head: 223 }]);
  wall([598, 376, 610, 585], { n: Wh, s: Wh, e: Tz, w: Wh, jamb: M.blackMatte }, [{ a: 377, b: 465, sill: 0, head: 215 }]);
  // study | bath divider
  wall([610, 357, 878, 376], { n: Wh, s: Tz, e: Wh, w: Wh });
  // bath structural column (SW) and alcove walls
  groups.walls.add(box(598, 500, 714, 585, 0, SLAB, { n: Tz, e: Tz, s: Wh, w: Wh, t: M.slabConcrete, b: M.slabConcrete }));
  colliders.push([598, 500, 714, 585]);

  // -------------------------------------------------------------------------------------------
  // floors (top surface at z=0)
  // -------------------------------------------------------------------------------------------
  const floorBox = (r, mat, z0 = -12, z1 = 0, side = M.concreteDark) =>
    groups.floors.add(box(r[0], r[1], r[2], r[3], z0, z1, { t: mat, all: side, b: side }, { cast: false }));
  floorBox([-157, 0, 252, 342], M.floorWood);                 // bedroom (pergo)
  floorBox([262, 0, 598, 585], M.floorTile);                  // living, 120x120 tile
  floorBox([0, 342, 252, 585], M.floorTile);                  // kitchen
  floorBox([-193, 342, -16, 585], M.floorBalcony);            // balcony
  floorBox([610, 376, 878, 500], M.floorTerrazzo);            // bath
  floorBox([878, 448, 914, 585], M.floorTerrazzo);
  floorBox([714, 500, 878, 585], M.floorTerrazzo);
  // study: raised platform (地板架高 +14)
  groups.floors.add(box(610, 0, 862, 357, 0, FLOOR_RAISE_STUDY, { t: M.floorWood, all: M.laminateWhite, e: M.laminateWhite }, { cast: false }));
  // floor under walls so no gaps show
  groups.floors.add(box(-200, -100, 930, 600, -30, -12, { all: M.concreteDark }, { cast: false }));
  // hex tile 降落塵區 laid on the entry (slightly proud of the tile floor)
  const hexShape = new THREE.Shape([[390, 465], [598, 465], [598, 585], [350, 585], [350, 516]].map(([x, y]) => new THREE.Vector2(x * CM, y * CM)));
  const hexGeo = new THREE.ShapeGeometry(hexShape);
  hexGeo.rotateX(Math.PI / 2); // shape is in (x, y=z) -> lay it on the xz plane facing up
  {
    // ShapeGeometry after rotateX(+90deg): (x, y, 0) -> (x, 0, y)  but normal flips to -y. flip winding.
    const idx = hexGeo.index ? Array.from(hexGeo.index.array) : null;
    if (idx) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } hexGeo.setIndex(idx); }
    const pos = hexGeo.attributes.position, uv = hexGeo.attributes.uv, nor = hexGeo.attributes.normal;
    for (let i = 0; i < pos.count; i++) { uv.setXY(i, pos.getX(i), pos.getZ(i)); nor.setXYZ(i, 0, 1, 0); }
  }
  const hexMesh = new THREE.Mesh(hexGeo, M.floorHex);
  hexMesh.position.y = 0.0015; hexMesh.receiveShadow = true;
  groups.floors.add(hexMesh);
  // threshold edge between hex area and tile (thin aluminium strip)
  groups.floors.add(box(390, 464.4, 598, 465, 0, 0.4, { all: M.aluminumWhite }, { cast: false }));

  // -------------------------------------------------------------------------------------------
  // ceilings (+ drops, LED coves)
  // -------------------------------------------------------------------------------------------
  const ceil = (r, z, th = 4) => groups.ceilings.add(box(r[0], r[1], r[2], r[3], z, z + th, { b: M.ceilingWhite, all: M.ceilingWhite }, { cast: false }));
  ceil([-157, 0, 252, 342], 270);
  ceil([262, 0, 598, SOFFIT.y0], 280);
  ceil([SOFFIT.x0, SOFFIT.y0, SOFFIT.x1, SOFFIT.y1], SOFFIT.h);
  ceil([610, 0, 862, 357], 270);
  ceil([0, 342, 252, 585], 240);
  ceil([-193, 342, -16, 585], 240);
  ceil([610, 376, 878, 500], 240); ceil([878, 448, 914, 585], 240); ceil([714, 500, 878, 585], 240);
  // curtain boxes along the north windows (實內 25cm)
  const drop = (r, zBottom, zTop, mat = M.ceilingWhite) => groups.ceilings.add(box(r[0], r[1], r[2], r[3], zBottom, zTop, { all: mat }, { cast: false }));
  drop([262, 0, 598, 25], 262, 280);
  // soffit step face at y = 325 (ducted A/C zone) with LED cove
  drop([262, SOFFIT.y0 - 4, 598, SOFFIT.y0], SOFFIT.h, 280);
  groups.ceilings.add(box(262, SOFFIT.y0 - 3.5, 598, SOFFIT.y0 - 3, SOFFIT.h + 1, SOFFIT.h + 2.5, { all: M.ledWarm }, { cast: false, receive: false }));
  // maintenance hatches in the A/C soffit (70 x 110, 維修孔)
  [[331, 395], [399, 466], [470, 537]].forEach(([a, b]) => {
    groups.ceilings.add(box(a, 340, b, 445, SOFFIT.h - 0.6, SOFFIT.h, { all: M.laminateWhite }, { cast: false }));
    groups.ceilings.add(box(a, 340, b, 341, SOFFIT.h - 0.7, SOFFIT.h, { all: M.blackMatte }, { cast: false }));
    groups.ceilings.add(box(a, 444, b, 445, SOFFIT.h - 0.7, SOFFIT.h, { all: M.blackMatte }, { cast: false }));
    groups.ceilings.add(box(a, 340, a + 0.8, 445, SOFFIT.h - 0.7, SOFFIT.h, { all: M.blackMatte }, { cast: false }));
  });
  // study: sliding door rail soffit (CH+229) and bookcase soffit (CH+244)
  drop([610, 0, 640, 357], 229, 270, M.paintSage);
  drop([610, 296, 862, 357], 244, 270);
  // bedroom: wardrobe-side drop (立板 CH+247)
  drop([160, 0, 252, 10], 247, 270);
  // ceiling panel reveals (天花板分割線) in the living room
  [[330, 25, 330.5, 325], [560, 25, 560.5, 325]].forEach((r) => groups.ceilings.add(box(r[0], r[1], r[2], r[3], 279.4, 280, { all: M.blackMatte }, { cast: false })));
  groups.ceilings.add(box(330.5, 175, 560, 175.5, 279.4, 280, { all: M.blackMatte }, { cast: false }));
  // slab
  const slab = box(-200, -100, 930, 600, SLAB, SLAB + 22, { all: M.slabConcrete, b: M.slabConcrete }, { cast: true });
  groups.ceilings.add(slab);

  // -------------------------------------------------------------------------------------------
  // windows
  // -------------------------------------------------------------------------------------------
  function windowUnit({ axis, a, b, c, depth = 15, sill, head, panels = 3, group, frameMat = M.blackMetal }) {
    const len = b - a, h = head - sill, g = new THREE.Group();
    const fb = 4.2, fd = 8;
    const add = (w, d, hh, x, z, y, mat) => { const m = cbox(w, d, hh, mat); m.position.set(x * CM, y * CM, z * CM); g.add(m); return m; };
    // outer frame (local X along window, Z through wall)
    add(len, fd, fb, 0, 0, h - fb / 2, frameMat); add(len, fd, fb, 0, 0, fb / 2, frameMat);
    add(fb, fd, h, -len / 2 + fb / 2, 0, h / 2, frameMat); add(fb, fd, h, len / 2 - fb / 2, 0, h / 2, frameMat);
    const pw = (len - 2 * fb) / panels + 3;
    for (let i = 0; i < panels; i++) {
      const x = -len / 2 + fb + (pw - 3) * i + pw / 2 - 1.5 + (i === 0 ? 0 : 0);
      const z = (i % 2 ? 1 : -1) * 1.8;
      const sw = 3.0, sh = h - 2 * fb;
      add(pw, 2.4, sw, x, z, fb + sw / 2, frameMat); add(pw, 2.4, sw, x, z, fb + sh - sw / 2, frameMat);
      add(sw, 2.4, sh, x - pw / 2 + sw / 2, z, fb + sh / 2, frameMat); add(sw, 2.4, sh, x + pw / 2 - sw / 2, z, fb + sh / 2, frameMat);
      const glass = cbox(pw - 2 * sw, 0.5, sh - 2 * sw, M.glass, { cast: false });
      glass.position.set(x * CM, (fb + sh / 2) * CM, z * CM);
      glass.renderOrder = 5;
      g.add(glass);
      // crescent lock
      add(1.2, 1.6, 6, x + (i % 2 ? -1 : 1) * (pw / 2 - sw - 1.2), z + (i % 2 ? 1.6 : -1.6), fb + sh * 0.55, M.blackMetal);
    }
    // sill / stool
    if (sill > 20) add(len + 4, depth + 3, 2.2, 0, 0, -1.1, M.laminateWhite);
    g.position.set((axis === 'x' ? (a + b) / 2 : c) * CM, sill * CM, (axis === 'x' ? c : (a + b) / 2) * CM);
    if (axis === 'y') g.rotation.y = -Math.PI / 2;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = o.material !== M.glass; o.receiveShadow = true; } });
    group.add(g);
    return g;
  }
  windowUnit({ axis: 'x', a: -152, b: 122, c: -7.5, sill: 4, head: 238, panels: 3, group: groups.N });
  windowUnit({ axis: 'x', a: 272, b: 588, c: -7.5, sill: 4, head: 258, panels: 4, group: groups.N });
  windowUnit({ axis: 'x', a: 715, b: 858, c: -7.5, sill: 14, head: 228, panels: 2, group: groups.N });
  windowUnit({ axis: 'y', a: 64, b: 190, c: -164.5, sill: 4, head: 238, panels: 2, group: groups.W });
  windowUnit({ axis: 'y', a: 372, b: 560, c: -185.5, sill: 90, head: 222, panels: 2, group: groups.W, frameMat: M.aluminumWhite });

  // -------------------------------------------------------------------------------------------
  // doors
  // -------------------------------------------------------------------------------------------
  const ease = (t) => t * t * (3 - 2 * t);
  const phi = (d) => (d * Math.PI) / 180;

  function makeDoor(def) {
    const d = { open: false, t: 0, target: 0, ...def };
    d.toggle = () => { d.open = !d.open; d.target = d.open ? 1 : 0; };
    d.update = (dt) => {
      if (Math.abs(d.t - d.target) < 1e-4) return false;
      const dir = Math.sign(d.target - d.t);
      d.t = THREE.MathUtils.clamp(d.t + dir * dt / (d.duration || 0.9), 0, 1);
      if (dir > 0 ? d.t > d.target : d.t < d.target) d.t = d.target;
      d.apply(ease(d.t));
      return true;
    };
    d.blocked = () => d.t < 0.5 && !!d.collider;
    doors.push(d);
    return d;
  }

  // door groups stay separate meshes (animated + clickable); everything else is merged for speed
  const tag = (obj, door) => { obj.userData.dynamic = true; obj.traverse((o) => { o.userData.door = door; }); return obj; };

  /** Swing door. hinge in plan cm, width, closed/open plan angle in degrees (0 = +x east, 90 = +y south). */
  function swingDoor({ id, name, hinge, width, height = 215, thick = 3.6, closed, open, build, collider, group = groups.walls }) {
    const g = new THREE.Group();
    g.position.set(hinge[0] * CM, 0, hinge[1] * CM);
    const leaf = new THREE.Group();
    g.add(leaf);
    build(leaf, { width, height, thick });
    group.add(g);
    const door = makeDoor({
      id, name, group: g, collider, kind: 'swing',
      apply: (k) => { g.rotation.y = -phi(closed + (open - closed) * k); },
    });
    door.apply(0);
    tag(g, door);
    return door;
  }

  const leafBox = (leaf, w, h, th, mat, x = 0, y = 0, z = 0) => {
    const m = cbox(w, th, h, mat);
    m.position.set((x + w / 2) * CM, (y + h / 2) * CM, z * CM);
    leaf.add(m); return m;
  };

  // bedroom door: oak leaf with a black handle (matches the dark TV wall)
  swingDoor({
    id: 'door-bedroom', name: '主臥門', hinge: [257, 5], width: 90, closed: 90, open: 180, collider: [252, 5, 262, 95],
    build(leaf, { width, height, thick }) {
      leafBox(leaf, width, height, thick, M.oak);
      const h = cbox(2, 12, 2, M.blackMetal); h.position.set((width - 7) * CM, 100 * CM, (thick / 2 + 1) * CM); leaf.add(h);
      const h2 = h.clone(); h2.position.z = -h.position.z; leaf.add(h2);
    },
  });

  // bath door: black frame, oak panels and a ribbed-glass strip, black bar handle
  swingDoor({
    id: 'door-bath', name: '衛浴門', hinge: [604, 377], width: 87.6, closed: 90, open: 0, collider: [598, 377, 610, 465],
    build(leaf, { width, height, thick }) {
      leafBox(leaf, width, height, thick, M.oak);
      leafBox(leaf, 3.2, height, thick + 0.6, M.blackMetal, 0);
      leafBox(leaf, 3.2, height, thick + 0.6, M.blackMetal, width - 3.2);
      leafBox(leaf, width, 3.2, thick + 0.6, M.blackMetal, 0, height - 3.2);
      leafBox(leaf, width, 3.2, thick + 0.6, M.blackMetal, 0, 0);
      leafBox(leaf, 2.6, height - 6, thick + 0.4, M.blackMetal, width * 0.43);
      leafBox(leaf, 2.6, height - 6, thick + 0.4, M.blackMetal, width * 0.43 + 17);
      leafBox(leaf, 14.4, height - 8, thick + 0.2, M.glassRibbed, width * 0.43 + 2.6, 4);
      const hd = cbox(30, 2.4, 2.4, M.blackMetal); hd.position.set((width - 12) * CM, 100 * CM, (thick + 3) * CM / 2 + 1.5 * CM); leaf.add(hd);
      const hd2 = hd.clone(); hd2.position.z = -hd.position.z; leaf.add(hd2);
    },
  });

  // entry door: deep plum panel with a recessed grid, smart lock
  swingDoor({
    id: 'door-entry', name: '玄關大門', hinge: [574, 592], width: 108, height: 218, thick: 5, closed: 180, open: 255, collider: [462, 585, 574, 600],
    build(leaf, { width, height, thick }) {
      leafBox(leaf, width, height, thick, M.plum);
      for (let z = 20; z < height - 10; z += 20) leafBox(leaf, width - 6, 0.7, thick + 0.5, M.plumLine, 3, z);
      for (let x = 20; x < width - 6; x += 20) leafBox(leaf, 0.7, height - 8, thick + 0.5, M.plumLine, x, 4);
      leafBox(leaf, 6, 64, thick + 3, M.blackMetal, width - 14, 92);
      leafBox(leaf, 8, 26, thick + 1.6, M.blackMetal, width - 13, 120);
      const hd = cbox(2.4, 2.4, 70, M.chrome); hd.position.set((width - 11) * CM, 96 * CM, (thick / 2 + 4.2) * CM); leaf.add(hd);
    },
  });

  // sliding doors ------------------------------------------------------------------------------
  function slideDoor({ id, name, pos, along, dist, build, collider, width, height, group = groups.walls }) {
    const g = new THREE.Group();
    g.position.set(pos[0] * CM, 0, pos[1] * CM);
    build(g, { width, height });
    group.add(g);
    const door = makeDoor({
      id, name, group: g, collider, kind: 'slide', duration: 1.3,
      apply: (k) => { g.position.set((pos[0] + along[0] * dist * k) * CM, 0, (pos[1] + along[1] * dist * k) * CM); },
    });
    tag(g, door);
    return door;
  }

  // kitchen: black aluminium frame + ribbed glass (長虹玻), suspended single track, on the living side
  slideDoor({
    id: 'door-kitchen', name: '廚房玻璃推拉門', pos: [264.6, 413], along: [0, -1], dist: 86, width: 84, height: 214,
    collider: [252, 413, 262, 497],
    build(g, { width, height }) {
      const m = (w, d, h, mat, x, y, z) => { const o = cbox(w, d, h, mat); o.position.set(x * CM, y * CM, z * CM); g.add(o); return o; };
      const bar = 4;
      // frame along +y (plan) : x thickness 2.6
      m(2.6, bar, height, M.blackMetal, 0, height / 2, bar / 2);
      m(2.6, bar, height, M.blackMetal, 0, height / 2, width - bar / 2);
      m(2.6, width, bar, M.blackMetal, 0, height - bar / 2, width / 2);
      m(2.6, width, bar * 1.3, M.blackMetal, 0, bar * 0.65, width / 2);
      const glass = cbox(0.8, width - 2 * bar, height - 2 * bar - 2, M.glassRibbed, { cast: false });
      glass.position.set(0, (height / 2) * CM, (width / 2) * CM); glass.renderOrder = 6;
      glass.material = M.glassRibbed.clone();
      glass.material.normalMap = M.ribbedNormal.clone(); glass.material.normalMap.needsUpdate = true;
      glass.material.normalMap.repeat.set((width - 8) / 12, 1);
      g.add(glass);
      m(2.4, 2.4, 60, M.blackMetal, 2.2, 100, width - 9);
      // top track
      m(5, width + 4, 4, M.blackMetal, 0, height + 2, width / 2);
    },
  });

  // balcony door: white aluminium frame with clear glass, slides north on the kitchen side
  slideDoor({
    id: 'door-balcony', name: '後陽台鋁門', pos: [-6, 414], along: [0, -1], dist: 84, width: 86, height: 214,
    collider: [-16, 414, 0, 500],
    build(g, { width, height }) {
      const m = (w, d, h, mat, x, y, z) => { const o = cbox(w, d, h, mat); o.position.set(x * CM, y * CM, z * CM); g.add(o); return o; };
      const bar = 4.6;
      m(3, bar, height, M.aluminumWhite, 0, height / 2, bar / 2);
      m(3, bar, height, M.aluminumWhite, 0, height / 2, width - bar / 2);
      m(3, width, bar, M.aluminumWhite, 0, height - bar / 2, width / 2);
      m(3, width, bar * 2.2, M.aluminumWhite, 0, bar * 1.1, width / 2);
      const glass = cbox(0.6, width - 2 * bar, height - 3.3 * bar, M.glass, { cast: false });
      glass.position.set(0, (height / 2 + 4) * CM, (width / 2) * CM); glass.renderOrder = 6; g.add(glass);
    },
  });

  // study: accordion (連動鋁框摺疊門) — 4 black aluminium + clear-glass panels
  {
    const n = 4, pw = 267.4 / n, h = 222.5 - FLOOR_RAISE_STUDY + 14;
    const g = new THREE.Group();
    g.position.set(604 * CM, FLOOR_RAISE_STUDY * CM, 5 * CM);
    const panels = [];
    for (let i = 0; i < n; i++) {
      const p = new THREE.Group();
      const m = (w, d, hh, mat, x, y) => { const o = cbox(w, d, hh, mat); o.position.set((x + w / 2) * CM, y * CM, 0); p.add(o); return o; };
      const bar = 3.6, th = 3.2;
      m(bar, th, h, M.blackMetal, 0, h / 2);
      m(bar, th, h, M.blackMetal, pw - bar, h / 2);
      m(pw, th, bar, M.blackMetal, 0, h - bar / 2);
      m(pw, th, 20, M.blackMetal, 0, 10);        // 下方鋁肚板
      m(pw, th, bar, M.blackMetal, 0, 20 + bar / 2);
      const glass = cbox(pw - 2 * bar, 0.6, h - 20 - 2 * bar - 2, M.glass, { cast: false });
      glass.position.set((pw / 2) * CM, ((h + 20) / 2) * CM, 0); glass.renderOrder = 6; p.add(glass);
      g.add(p); panels.push(p);
    }
    groups.walls.add(g);
    const door = makeDoor({
      id: 'door-study', name: '書房摺疊門', group: g, collider: [598, 5, 610, 272], kind: 'fold', duration: 1.4,
      apply: (k) => {
        const theta = k * phi(78);
        let along = 0, lat = 0;
        panels.forEach((p, i) => {
          const a = (i % 2 ? -1 : 1) * theta;
          p.position.set(lat * CM, 0, along * CM);
          p.rotation.y = a - Math.PI / 2;
          along += pw * Math.cos(a); lat += pw * Math.sin(a);
        });
      },
    });
    door.apply(0);
    tag(g, door);
  }

  // door frames (casings) -------------------------------------------------------------------
  const casing = (x0, y0, x1, y1, z1, mat, group = groups.walls) => group.add(box(x0, y0, x1, y1, 0, z1, { all: mat }, { cast: false }));
  // bedroom door frame on living side, bath door frame (black), entry frame
  casing(261.4, 3, 262.6, 5, 219, M.blackMatte); casing(261.4, 95, 262.6, 97, 219, M.blackMatte);
  casing(603.6, 375, 612, 377, 216, M.blackMetal); casing(603.6, 465, 612, 467, 216, M.blackMetal); groups.walls.add(box(603.6, 375, 612, 467, 215, 217, { all: M.blackMetal }, { cast: false }));
  // entry door frame: two jambs and a head (the opening itself stays clear for the door leaf)
  casing(460, 585, 463, 588, 223, M.blackMatte); casing(571.5, 585, 574.5, 588, 223, M.blackMatte);
  groups.walls.add(box(460, 585, 574.5, 588, 219.8, 223, { all: M.blackMatte }, { cast: false }));

  return { root, groups, colliders, wallRects, doors, helpers: { swingDoor, slideDoor, makeDoor, leafBox, tag } };
}
