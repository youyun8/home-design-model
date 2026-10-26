import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CM, box } from './core.js';
import { rbox, bx } from './furn-common.js';
import { labelCanvas, canvasTex } from './textures.js';
import { COUNTER_TOP } from './furn-rooms-b.js';

// ================================================================================================
// 賀眾牌 桌上型冰溫熱飲水機 (UW-672AW-1) / 溫熱 (UR-672BW-1)  — W 32 x D 48 x H 52 cm
// hot 3.5 L (750 W), warm 2.0 L, cold 1.1 L (130 W)
// Plumbing: wall angle valve -> tee (-> faucet) -> UP-206 twin filter (UF-1 -> UF-556) -> unit inlet.
// The unit sits on the north kitchen counter between hob and sink, directly above the filter cabinet.
// ================================================================================================
export const SPEC = {
  W: 0.32, D: 0.48, H: 0.52,
  tanks: { hot: { cap: 3.5, name: '熱水', target: 98 }, warm: { cap: 2.0, name: '溫水', target: 45 }, cold: { cap: 1.1, name: '冰水', target: 8 } },
  fillRate: 0.1,        // L/s (demo speed; real supply ~0.03 L/s)
  dispenseRate: 0.14,   // L/s
  inletTemp: 22,
  accel: 10,            // heating / cooling time compression
};

const S = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };
const V = (p) => new THREE.Vector3(p[0] * CM, p[2] * CM, p[1] * CM);

function flowTexture() {
  const c = labelCanvas(128, 8, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#f4f7f8'); gr.addColorStop(0.4, '#f4f7f8'); gr.addColorStop(0.55, '#7fc6ee'); gr.addColorStop(0.75, '#3b9be0'); gr.addColorStop(0.95, '#f4f7f8'); gr.addColorStop(1, '#f4f7f8');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const t = canvasTex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Builds counter (x 120..252), sink, dispenser, filters, plumbing. `helpers` come from buildArchitecture().
 * Returns { staticGroup, dynGroup, api }.
 */
export function buildDispenserSystem(M, ctx, helpers) {
  const statics = new THREE.Group(); statics.name = 'north-counter';
  const dyn = new THREE.Group(); dyn.name = 'dispenser-system'; dyn.userData.dynamic = true;
  const api = { labels: [], doors: [], hover: null };

  // ------------------------------------------------------------------ counter carcass + top
  const X0 = 120, X1 = 252, Y0 = 342, Y1 = 402;
  statics.add(bx(X0, Y0 + 0.2, X1, Y0 + 2, 10, 89.9, { all: M.cabinetInterior }));        // back panel
  statics.add(bx(X0, Y0, X1, Y1, 10, 12, { all: M.cabinetInterior }));                      // bottom
  statics.add(bx(X0, Y0, X0 + 1.6, Y1, 10, 89.9, { all: M.cabinetInterior }));              // west side
  statics.add(bx(179.2, Y0, 180.8, Y1, 10, 89.9, { all: M.cabinetInterior }));              // divider (with pipe hole drawn below)
  statics.add(bx(X1 - 1.6, Y0, X1, Y1, 10, 89.9, { all: M.cabinetInterior }));              // east side
  statics.add(bx(X0 + 4, Y0 + 4, X1, Y1, 0, 10, { all: M.shadowGap }, { cast: false }));    // plinth
  // top rails (front)
  statics.add(bx(X0, Y1 - 4, X1, Y1, 86, 89.9, { all: M.laminateWarm }));
  // countertop with sink cut-out (x 181..237, y 354..394)
  const SK = { x0: 181, x1: 237, y0: 354, y1: 394 };
  const q = (a, b, c, d) => statics.add(bx(a, b, c, d, 89.9, COUNTER_TOP, { all: M.quartz }));
  q(X0, Y0, SK.x0, Y1 + 0.4); q(SK.x1, Y0, X1, Y1 + 0.4); q(SK.x0, Y0, SK.x1, SK.y0); q(SK.x0, SK.y1, SK.x1, Y1 + 0.4);
  // sink bowl (stainless)
  const w = 0.5;
  statics.add(bx(SK.x0, SK.y0, SK.x1, SK.y0 + w, 72, COUNTER_TOP, { all: M.stainless }));
  statics.add(bx(SK.x0, SK.y1 - w, SK.x1, SK.y1, 72, COUNTER_TOP, { all: M.stainless }));
  statics.add(bx(SK.x0, SK.y0, SK.x0 + w, SK.y1, 72, COUNTER_TOP, { all: M.stainless }));
  statics.add(bx(SK.x1 - w, SK.y0, SK.x1, SK.y1, 72, COUNTER_TOP, { all: M.stainless }));
  statics.add(bx(SK.x0, SK.y0, SK.x1, SK.y1, 71.4, 72, { all: M.stainless }));
  statics.add(bx(SK.x0 - 0.6, SK.y0 - 0.6, SK.x1 + 0.6, SK.y0, COUNTER_TOP, COUNTER_TOP + 0.4, { all: M.stainless }, { cast: false }));
  statics.add(bx(SK.x0 - 0.6, SK.y1, SK.x1 + 0.6, SK.y1 + 0.6, COUNTER_TOP, COUNTER_TOP + 0.4, { all: M.stainless }, { cast: false }));
  const drainRing = S(new THREE.Mesh(new THREE.CylinderGeometry(4 * CM, 4 * CM, 0.5 * CM, 24), M.chrome));
  drainRing.position.set(209 * CM, 72.4 * CM, 374 * CM); statics.add(drainRing);
  // faucet (gooseneck)
  const faucetPts = [[209, 348, COUNTER_TOP], [209, 348, COUNTER_TOP + 20], [209, 351, COUNTER_TOP + 32], [209, 360, COUNTER_TOP + 36], [209, 367, COUNTER_TOP + 30], [209, 368, COUNTER_TOP + 24]];
  statics.add(tube(faucetPts, 1.3, M.chrome, 40));
  statics.add(S(new THREE.Mesh(new THREE.CylinderGeometry(3 * CM, 3.4 * CM, 2.2 * CM, 24), M.chrome), true, true)).children.slice(-1)[0].position.set(209 * CM, (COUNTER_TOP + 1.1) * CM, 348 * CM);
  statics.add(bx(215, 346, 219, 349, COUNTER_TOP, COUNTER_TOP + 12, { all: M.chrome }));   // lever
  // grommet where the filtered line comes up through the counter
  const grom = S(new THREE.Mesh(new THREE.TorusGeometry(1.5 * CM, 0.5 * CM, 8, 18), M.blackMatte));
  grom.rotation.x = Math.PI / 2; grom.position.set(153 * CM, (COUNTER_TOP + 0.5) * CM, 349 * CM); statics.add(grom);
  // filter bracket plate (magenta header with label)
  const bracketTex = canvasTex(labelCanvas(256, 200, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#d62f8a'); gr.addColorStop(1, '#9a1d9e');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = 'bold 54px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('UP-206', w / 2, 82);
    g.font = '28px system-ui, "Noto Sans TC", sans-serif'; g.fillText('雙道淨水 UF-1 + UF-556', w / 2, 132);
  }));
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(32 * CM, 26 * CM, 1.6 * CM), [M.blackMatte, M.blackMatte, M.blackMatte, M.blackMatte, new THREE.MeshStandardMaterial({ map: bracketTex, roughness: 0.4 }), M.blackMatte]);
  bracket.position.set(146 * CM, 70 * CM, 345.4 * CM); S(bracket); statics.add(bracket);
  // angle valve on the wall + tee + wall socket
  const valve = new THREE.Group();
  valve.add(S(new THREE.Mesh(new THREE.CylinderGeometry(1.5 * CM, 1.5 * CM, 6 * CM, 16), M.chrome)));
  valve.children[0].rotation.x = Math.PI / 2;
  const wheel = S(new THREE.Mesh(new THREE.CylinderGeometry(2.4 * CM, 2.4 * CM, 0.9 * CM, 20), M.blueCap));
  wheel.rotation.x = Math.PI / 2; wheel.position.z = 3.4 * CM; valve.add(wheel);
  valve.position.set(203 * CM, 40 * CM, 345.4 * CM); statics.add(valve);
  const tee = S(rbox(193, 347, 4, 4, 38, 43, M.blueCap, 0.8, 2)); statics.add(tee);
  const outlet = new THREE.Group();
  outlet.add(bx(158, 341.6, 168, 343, 100, 110, { all: M.bronze }));
  outlet.add(bx(159, 341, 167, 341.6, 101, 109, { all: M.blackMatte }));
  [162, 164.4].forEach((x) => outlet.add(bx(x - 0.3, 340.7, x + 0.3, 341, 104, 107, { all: M.steel }, { cast: false })));
  statics.add(outlet);

  // ------------------------------------------------------------------ openable doors (filter + sink cabinet)
  const mkDoor = (id, name, hinge, width, closed, open, rightHinge) => {
    const d = helpers.swingDoor({
      id, name, hinge, width, height: 77, thick: 1.8, closed, open, group: dyn,
      build: (leaf, o) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(o.width * CM, o.height * CM, o.thick * CM), M.laminateWarm);
        m.position.set((o.width / 2) * CM, (o.height / 2 + 11) * CM, 0); S(m); leaf.add(m);
        const pull = new THREE.Mesh(new THREE.BoxGeometry(1.2 * CM, 24 * CM, 1.4 * CM), M.blackMetal);
        pull.position.set((o.width - 6) * CM, (o.height - 16) * CM, (o.thick / 2 + 0.8) * CM);
        leaf.add(pull);
      },
    });
    d.cabinet = true; api.doors.push(d);
    return d;
  };
  mkDoor('door-filter', '濾心櫃門', [120.8, 403], 59, 0, 100, false);
  mkDoor('door-sink', '水槽櫃門', [251.6, 403], 70.6, 180, 80, true);

  // ------------------------------------------------------------------ UP-206 twin filter cartridges
  const filters = new THREE.Group();
  const cart = (x, label, colA, colB) => {
    const tex = canvasTex(labelCanvas(256, 512, (g, w, h) => {
      g.fillStyle = '#f6f6f7'; g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 40, 0, h - 60); gr.addColorStop(0, colA); gr.addColorStop(1, colB);
      g.fillStyle = gr; g.fillRect(70, 60, 116, 360);
      g.fillStyle = '#fff'; g.font = 'bold 54px system-ui, sans-serif'; g.save(); g.translate(w / 2, 240); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText(label, 0, 18); g.restore();
      g.fillStyle = '#7a7d82'; g.font = '22px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('WATER FILTER', w / 2, 450);
    }), { repeatWrap: false });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(4.4 * CM, 4.4 * CM, 32 * CM, 36), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
    body.rotation.y = Math.PI; body.position.set(x * CM, 56 * CM, 355 * CM); S(body); filters.add(body);
    const head = S(new THREE.Mesh(new THREE.CylinderGeometry(4.7 * CM, 4.7 * CM, 7 * CM, 36), M.plasticWhite));
    head.position.set(x * CM, 75.5 * CM, 355 * CM); filters.add(head);
    const cap = S(new THREE.Mesh(new THREE.CylinderGeometry(2.4 * CM, 2.4 * CM, 3 * CM, 20), M.blueCap));
    cap.position.set(x * CM, 80.5 * CM, 355 * CM); filters.add(cap);
    const arm = bx(x - 2, 346, x + 2, 351, 74, 78, { all: M.plasticWhite });
    filters.add(arm);
  };
  cart(139, 'UF-1', '#2d8be0', '#a23cc6');
  cart(153, 'UF-556', '#8b3cc6', '#e0344a');
  statics.add(filters);

  // ------------------------------------------------------------------ water line (animated)
  const flowTex = flowTexture();
  M.pipe = new THREE.MeshStandardMaterial({ color: 0xffffff, map: flowTex, emissive: 0x4aa8ec, emissiveMap: flowTex, emissiveIntensity: 0.0, roughness: 0.35 });
  const pipes = new THREE.Group(); pipes.name = 'water-line';
  const addPipe = (pts, r, mat = M.pipe, seg = 50) => {
    const t = tube(pts.map((p) => p.slice()), r, mat, seg);
    const len = pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]) : 0), 0);
    const uv = t.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 8);
    pipes.add(t); return t;
  };
  addPipe([[203, 345.4, 40], [199, 347, 40], [195, 347, 40]], 0.7);                                                        // valve -> tee
  addPipe([[193, 347, 41], [193, 348, 55], [199, 349, 72], [206, 349, 84], [209, 350, 90]], 0.7, M.steel);                 // tee -> faucet (braided hose)
  addPipe([[191, 347, 40], [186, 347, 45], [180, 347, 60], [160, 347, 60], [139, 347, 60], [139, 347, 76], [139, 351, 77]], 0.62); // tee -> UF-1 (through divider hole)
  addPipe([[143.6, 355, 78], [146, 355, 84], [148.4, 355, 78]], 0.62);                                                         // UF-1 -> UF-556 jumper
  addPipe([[153, 355, 84], [153, 352, 90], [153, 349, 96], [153, 347, 98], [153, 344.6, 100], [140, 344.4, 101], [134.4, 345.4, 100.6], [134.4, 347.6, 100]], 0.62); // UF-556 -> dispenser inlet
  // hole in divider
  const hole = S(new THREE.Mesh(new THREE.TorusGeometry(1.1 * CM, 0.35 * CM, 6, 16), M.blackMatte)); hole.rotation.y = Math.PI / 2; hole.position.set(180 * CM, 60 * CM, 347 * CM); pipes.add(hole);
  // power cord to the outlet
  const cord = tube([[144, 346, 96], [146, 344.4, 96], [152, 343.6, 98], [160, 343.2, 100], [163.6, 342.4, 104.6]].map((p) => p), 0.34, M.blackMatte, 24);
  pipes.add(cord);
  dyn.add(pipes);

  // ------------------------------------------------------------------ the dispenser
  const D = buildUnit(M, api);
  D.group.position.set(140 * CM, COUNTER_TOP * CM, 346.6 * CM);
  dyn.add(D.group);

  // labels anchored in 3D (shown in "水線" mode)
  api.labels = [
    { text: '冷水角閥（止水）', pos: [203, 346, 46], dy: -6 },
    { text: '三通（分水至龍頭）', pos: [193, 347, 40], dy: 46 },
    { text: 'UP-206 雙道濾芯 UF-1 → UF-556', pos: [146, 355, 56] },
    { text: '飲水機進水口 3/8" PE 管', pos: [134.4, 346.6, 101] },
    { text: '專用插座（110V）', pos: [163, 341.4, 107] },
    { text: '接水盤（定期倒水）', pos: [140, 392, 95] },
  ];

  const cabLight = new THREE.PointLight(0xfff0dc, 0, 1.6, 1.6);
  cabLight.position.set(185 * CM, 84 * CM, 395 * CM); dyn.add(cabLight); api.cabLight = cabLight;
  api.build = { unit: D, pipes, filters, outlet };
  api.flowTex = flowTex;
  attachLogic(api, D, M, pipes, dyn);
  return { staticGroup: statics, dynGroup: dyn, api };
}

function tube(pts, radius, mat, seg = 40) {
  const curve = new THREE.CatmullRomCurve3(pts.map(V), false, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, seg, radius * CM, 10, false);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ================================================================================================
// the unit
// ================================================================================================
function buildUnit(M, api) {
  const { W, D, H } = SPEC;
  const group = new THREE.Group(); group.name = 'water-dispenser';
  const bodyMat = M.dispWhite = new THREE.MeshPhysicalMaterial({ color: 0xf6f7f8, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 1.1 });
  const mkExtrude = (pts, bevel = 0.006) => {
    const sh = new THREE.Shape(); pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: W - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
    g.rotateY(-Math.PI / 2);          // extrusion axis z -> x (mirrored), depth stays on z
    g.translate(W / 2 - bevel, 0, 0); // centre on x = 0
    return g;
  };
  // profile (depth z, height y): head overhang + recessed lower body
  const head = mkExtrude([[0.004, 0.274], [0.396, 0.274], [0.396, 0.335], [0.331, 0.516], [0.004, 0.516]], 0.006);
  const lower = mkExtrude([[0.004, 0.044], [0.296, 0.044], [0.296, 0.27], [0.004, 0.27]], 0.006);
  const bodyHead = S(new THREE.Mesh(head, bodyMat)); const bodyLower = S(new THREE.Mesh(lower, bodyMat));
  [bodyHead, bodyLower].forEach((m) => { m.position.x = 0; });
  group.add(bodyHead, bodyLower);
  api.bodyMeshes = [bodyHead, bodyLower];
  // seam line between head and lower body and subtle front panel
  const seam = new THREE.Mesh(new THREE.BoxGeometry((W - 0.006), 0.003, 0.002), M.shadowGap); seam.position.set(0, 0.268, 0.401); group.add(seam);

  // drip tray (dark, 3 segments)
  const tray = new THREE.Group();
  tray.add(S(rbox(0, 0.395 * 100, 30.4, 18, 0.5, 4.2, M.blackMatte, 0.6, 2).translateX(0)));
  tray.children[0].position.set(0, 0.021, 0.395);
  for (let i = -1; i <= 1; i++) {
    const seg = S(new THREE.Mesh(new RoundedBoxGeometry(0.088, 0.006, 0.14, 2, 0.002), M.rubber));
    seg.position.set(i * 0.1, 0.044, 0.4); tray.add(seg);
  }
  const lip = S(new THREE.Mesh(new THREE.BoxGeometry(0.304, 0.02, 0.008), M.blackMatte)); lip.position.set(0, 0.03, 0.484); tray.add(lip);
  group.add(tray);
  api.cupPos = new THREE.Vector3(0, 0.046, 0.385);

  // control face (tilted)
  const face = new THREE.Group();
  face.position.set(0, 0.4316, 0.3707); face.rotation.x = -0.372; group.add(face);
  // brand label
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.012), new THREE.MeshBasicMaterial({ map: canvasTex(labelCanvas(256, 64, (g, w, h) => { g.fillStyle = '#6c7076'; g.font = 'bold 40px system-ui, "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.fillText('賀眾牌', w / 2, 46); }), { repeatWrap: false }), transparent: true, toneMapped: false }));
  logo.position.set(-0.07, 0.074, 0.0015); face.add(logo);
  // round display
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.004, 40), M.plasticGrey); dial.rotation.x = Math.PI / 2; dial.position.set(-0.07, 0.0, 0.002); face.add(dial);
  const dialRing = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.002, 8, 48), M.plasticWhite); dialRing.position.set(-0.07, 0, 0.004); face.add(dialRing);
  const dispCanvas = labelCanvas(256, 128, () => {});
  const dispTex = canvasTex(dispCanvas, { repeatWrap: false });
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.056, 0.028), new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false }));
  disp.position.set(-0.07, 0.0, 0.0045); face.add(disp);
  api.display = { canvas: dispCanvas, tex: dispTex };
  // button label strip
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.152, 0.036), new THREE.MeshBasicMaterial({ map: canvasTex(labelCanvas(608, 144, (g, w, h) => {
    g.fillStyle = '#f2f3f4'; g.fillRect(0, 0, w, h);
    const items = [['ICE COLD', '冰水', '#2f7fd6'], ['WARM', '溫水', '#f0a038'], ['HOT', '熱水', '#e0302c']];
    items.forEach(([en, zh, col], i) => {
      const cx = w * (0.17 + i * 0.33);
      g.fillStyle = '#4a4e54'; g.font = 'bold 30px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(en, cx, 40);
      g.font = '28px system-ui, "Noto Sans TC", sans-serif'; g.fillText(zh, cx, 76);
      g.fillStyle = col; g.fillRect(cx - 62, 98, 124, 10);
    });
  }), { repeatWrap: false }), toneMapped: false }));
  strip.position.set(0.075, 0.034, 0.0012); face.add(strip);
  // three buttons (interactive)
  api.buttons = {};
  [['cold', -0.0475, M.btnBlue], ['warm', 0.0, M.btnAmber], ['hot', 0.0475, M.btnRed]].forEach(([k, dx, mat]) => {
    const b = S(new THREE.Mesh(new RoundedBoxGeometry(0.044, 0.026, 0.008, 2, 0.003), M.dispButton));
    b.position.set(0.075 + dx, -0.003, 0.004); b.userData.btn = k; b.userData.hover = { cold: '冰水（按住出水）', warm: '溫水（按住出水）', hot: '熱水（按住出水）' }[k];
    face.add(b); api.buttons[k] = b;
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.0032, 14), mat); led.position.set(0.075 + dx, 0.0095, 0.0085); face.add(led);
    api.buttons[k].userData.led = led;
  });
  // nozzle
  const nozzle = S(new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.02, 16), M.plasticWhite)); nozzle.position.set(0, 0.263, 0.372); group.add(nozzle);
  const nozzleTip = S(new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.01, 14), M.chrome)); nozzleTip.position.set(0, 0.249, 0.372); group.add(nozzleTip);
  api.nozzle = new THREE.Vector3(0, 0.244, 0.372);
  // back details: inlet stub + cord grommet
  const inlet = S(new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.016, 12), M.blueCap)); inlet.rotation.x = Math.PI / 2; inlet.position.set(-0.056, 0.0076 + 0.0, -0.006); inlet.position.y = 0.076; group.add(inlet);
  // vents (rear/top)
  for (let i = 0; i < 6; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.002, 0.006), M.shadowGap); v.position.set(0, 0.5205, 0.08 + i * 0.016); group.add(v); }

  // ------------- cut-away internals (hidden by default)
  const internals = new THREE.Group(); internals.visible = false; group.add(internals);
  const shellMat = new THREE.MeshPhysicalMaterial({ color: 0xe8f1f6, transparent: true, opacity: 0.22, roughness: 0.1, depthWrite: false });
  const tanks = {};
  const mkTank = (key, x, y0, z, r, h, tint, label) => {
    const g = new THREE.Group(); g.position.set(x, y0, z);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32, 1, true), shellMat); g.add(shell);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.004, 32), shellMat); cap.position.y = h; g.add(cap);
    const wm = new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, opacity: 0.78, roughness: 0.05, depthWrite: false });
    const water = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.96, h, 32), wm); water.position.y = h / 2; g.add(water);
    const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 32), new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); top.rotation.x = -Math.PI / 2; g.add(top);
    internals.add(g);
    tanks[key] = { g, water, top, h, wm };
  };
  mkTank('hot', -0.065, 0.305, 0.13, 0.08, 0.17, 0xff9a7a);
  mkTank('warm', 0.08, 0.305, 0.13, 0.06, 0.175, 0xffd29a);
  mkTank('cold', 0.0, 0.07, 0.13, 0.045, 0.17, 0x8ad0ff);
  // heater coil, compressor, inlet solenoid valve
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.004, 8, 40), new THREE.MeshStandardMaterial({ color: 0xff5a30, emissive: 0xff3010, emissiveIntensity: 0.0 })); coil.rotation.x = Math.PI / 2; coil.position.set(-0.065, 0.32, 0.13); internals.add(coil);
  api.coil = coil;
  const comp = S(rbox(0, 0.0, 8, 8, 0, 6, M.blackMatte, 1, 2)); comp.position.set(0.09, 0.05, 0.12); comp.scale.setScalar(1.8); internals.add(comp);
  const valve = S(new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.034, 0.03, 2, 0.003), new THREE.MeshStandardMaterial({ color: 0x2f7fd6, roughness: 0.4, emissive: 0x2f7fd6, emissiveIntensity: 0.0 })));
  valve.position.set(-0.056, 0.14, 0.03); internals.add(valve); api.valve = valve;
  // internal plumbing (inlet -> valve -> tanks)
  const ip = [[-0.056, 0.076, 0.0], [-0.056, 0.14, 0.03]];
  const inTube = (pts, r = 0.0035) => { const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 24, r, 8), M.pipe); internals.add(m); return m; };
  inTube([[-0.056, 0.076, 0.0], [-0.056, 0.076, 0.03], [-0.056, 0.123, 0.03]]);
  inTube([[-0.056, 0.157, 0.03], [-0.056, 0.2, 0.06], [-0.01, 0.2, 0.13], [0.0, 0.2, 0.13], [0.0, 0.24, 0.13]]);
  inTube([[0.0, 0.24, 0.13], [-0.065, 0.28, 0.13], [-0.065, 0.305, 0.13]]);
  inTube([[0.0, 0.24, 0.13], [0.08, 0.28, 0.13], [0.08, 0.305, 0.13]]);
  api.tanks = tanks; api.internals = internals; api.shellMat = shellMat;

  // stream + cup + steam
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 1, 10), new THREE.MeshPhysicalMaterial({ color: 0xe4f4ff, transparent: true, opacity: 0.85, roughness: 0.05, depthWrite: false, envMapIntensity: 1.6 })); stream.visible = false; group.add(stream); api.stream = stream;
  const cup = new THREE.Group(); cup.visible = false; group.add(cup);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.031, 0.105, 28, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.38, roughness: 0.03, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.8 }));
  glass.position.y = 0.0525; cup.add(glass);
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.006, 28), new THREE.MeshPhysicalMaterial({ color: 0xdfeff7, transparent: true, opacity: 0.5, roughness: 0.05, depthWrite: false })); bottom.position.y = 0.003; cup.add(bottom);
  const cupWater = new THREE.Mesh(new THREE.CylinderGeometry(0.0355, 0.0305, 1, 28), new THREE.MeshPhysicalMaterial({ color: 0x9fd4f2, transparent: true, opacity: 0.86, roughness: 0.04, depthWrite: false, envMapIntensity: 1.5 }));
  cup.add(cupWater);
  const cupRim = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.0016, 8, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })); cupRim.rotation.x = Math.PI / 2; cupRim.position.y = 0.105; cup.add(cupRim);
  cup.position.copy(api.cupPos); api.cup = { g: cup, water: cupWater, mat: cupWater.material };
  // steam sprites
  const steamTex = canvasTex(labelCanvas(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), { repeatWrap: false });
  api.steam = [];
  for (let i = 0; i < 14; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    sp.visible = false; group.add(sp); api.steam.push({ sp, life: Math.random(), speed: 0.5 + Math.random() * 0.4, ox: (Math.random() - 0.5) * 0.03 });
  }
  group.traverse((o) => { o.userData.dispenser = true; });
  return { group, api };
}

// ================================================================================================
// behaviour
// ================================================================================================
function attachLogic(api, D, M, pipes, dyn) {
  const st = api.state = {
    model: 'AW',                 // AW = 冰溫熱, BW = 溫熱
    tanks: {
      hot: { level: 3.5, temp: 98 },
      warm: { level: 2.0, temp: 45 },
      cold: { level: 1.1, temp: 8 },
    },
    valveOpen: false,            // inlet solenoid
    dispensing: null,            // 'hot' | 'warm' | 'cold'
    cupVol: 0, cupKey: null, cupTimer: 0,
    totalUsed: 0, lastDispense: 0,
    xray: false, cutaway: false,
    heating: false, cooling: false,
    flow: 0,                     // 0..1 for the water-line animation
    message: '待機中，水位正常',
  };
  const target = { hot: 98, warm: 45, cold: 8 };
  const caps = { hot: 3.5, warm: 2.0, cold: 1.1 };
  const listeners = new Set();
  api.onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  const emit = () => listeners.forEach((f) => f(st));

  api.setModel = (m) => {
    st.model = m;
    if (m === 'BW' && st.dispensing === 'cold') api.stop();
    api.buttons.cold.visible = true;
    api.buttons.cold.material = m === 'BW' ? M.dispButtonOff : M.dispButton;
    api.buttons.cold.userData.disabled = m === 'BW';
    api.buttons.cold.userData.led.visible = m !== 'BW';
    D.group.userData.model = m;
    api.tanks.cold.g.visible = m !== 'BW';
    emit();
  };

  api.start = (key) => {
    if (key === 'cold' && st.model === 'BW') return false;
    const t = st.tanks[key];
    if (t.level < 0.04) { st.message = `${{ hot: '熱水', warm: '溫水', cold: '冰水' }[key]}水箱暫無水，等待進水`; emit(); return false; }
    if (st.dispensing) return false;
    st.dispensing = key; st.cupKey = key; st.cupVol = key === st.cupKey && st.cupTimer > 0 ? st.cupVol : 0; st.cupTimer = 0;
    st.cupVol = 0;
    api.cup.g.visible = true; api.cup.dropT = 0;
    emit();
    return true;
  };
  api.stop = () => {
    if (!st.dispensing) return;
    st.lastDispense = st.cupVol; st.dispensing = null; st.cupTimer = 6;
    emit();
  };
  api.dispenseOnce = (key, ml = 250) => { if (api.start(key)) st.autoStopAt = ml / 1000; };
  api.takeCup = () => { st.cupTimer = 0; api.cup.g.visible = false; st.cupVol = 0; emit(); };
  api.setXray = (on) => {
    st.xray = on;
    api.doors.forEach((d) => { if (d.open !== on) d.toggle(); });
    M.pipe.emissiveIntensity = on ? 0.7 : 0.0;
    api.cabLight.intensity = on ? 1.3 : 0;
    emit();
  };
  api.setCutaway = (on) => {
    st.cutaway = on;
    api.internals.visible = on;
    api.bodyMeshes.forEach((m) => {
      m.material = on ? (api.cutMat || (api.cutMat = new THREE.MeshPhysicalMaterial({ color: 0xf6f7f8, transparent: true, opacity: 0.16, roughness: 0.2, depthWrite: false }))) : M.dispWhite;
    });
    emit();
  };

  const drawDisplay = (temp, active) => {
    const { canvas, tex } = api.display, g = canvas.getContext('2d');
    g.fillStyle = '#120405'; g.fillRect(0, 0, 256, 128);
    const txt = String(Math.round(temp)).padStart(3, ' ');
    g.font = 'bold 96px "Courier New", ui-monospace, monospace'; g.textAlign = 'center';
    g.shadowColor = '#ff2a1a'; g.shadowBlur = 16; g.fillStyle = '#ff3b2a';
    g.fillText(txt.trim(), 128, 100);
    g.shadowBlur = 0;
    g.fillStyle = active ? '#ff9a30' : '#4a1210'; g.beginPath(); g.arc(28, 28, 8, 0, 6.3); g.fill();
    tex.needsUpdate = true;
  };
  drawDisplay(98, false);
  let dispTimer = 0;

  api.update = (dt) => {
    // ---- dispensing
    let flowing = 0;
    if (st.dispensing) {
      const key = st.dispensing, t = st.tanks[key];
      const dv = Math.min(SPEC.dispenseRate * dt, t.level);
      t.level -= dv; st.cupVol += dv; st.totalUsed += dv; flowing = 1;
      if (t.level <= 0.001 || st.cupVol >= 0.5 || (st.autoStopAt && st.cupVol >= st.autoStopAt)) { st.autoStopAt = 0; api.stop(); }
    }
    // ---- auto fill (float switch with hysteresis)
    const lows = Object.keys(st.tanks).filter((k) => (k !== 'cold' || st.model === 'AW') && st.tanks[k].level < caps[k] * 0.94);
    const full = Object.keys(st.tanks).every((k) => (k === 'cold' && st.model === 'BW') || st.tanks[k].level > caps[k] * 0.995);
    if (!st.valveOpen && lows.length) { st.valveOpen = true; emit(); }
    if (st.valveOpen && full) { st.valveOpen = false; emit(); }
    if (st.valveOpen) {
      // fill the emptiest tank (relative)
      let best = null, bestR = 2;
      for (const k of Object.keys(st.tanks)) {
        if (k === 'cold' && st.model === 'BW') continue;
        const r = st.tanks[k].level / caps[k];
        if (r < 0.995 && r < bestR) { best = k; bestR = r; }
      }
      if (best) {
        const t = st.tanks[best], dv = Math.min(SPEC.fillRate * dt, caps[best] - t.level);
        const mixTemp = best === 'warm' ? 45 : SPEC.inletTemp;
        t.temp = (t.temp * t.level + mixTemp * dv) / Math.max(1e-6, t.level + dv);
        t.level += dv; flowing = Math.max(flowing, 0.8);
        api.fillingTank = best;
      }
    } else api.fillingTank = null;
    st.flow += (flowing - st.flow) * Math.min(1, dt * 6);
    // ---- heating / cooling (time compressed)
    const hot = st.tanks.hot, cold = st.tanks.cold;
    if (!st.heating && hot.temp < target.hot - 1.0) st.heating = true;
    if (st.heating) {
      hot.temp += 0.052 * (3.5 / Math.max(hot.level, 0.5)) * SPEC.accel * dt;
      if (hot.temp >= target.hot - 0.05) { hot.temp = target.hot; st.heating = false; }
    }
    if (st.model === 'AW') {
      if (!st.cooling && cold.temp > target.cold + 1.5) st.cooling = true;
      if (st.cooling) { cold.temp -= 0.03 * SPEC.accel * dt; if (cold.temp <= target.cold + 0.05) { cold.temp = target.cold; st.cooling = false; } }
    } else st.cooling = false;
    st.tanks.warm.temp += (45 - st.tanks.warm.temp) * Math.min(1, dt * 0.5);

    // ---- status line
    const msg = st.dispensing ? `出${{ hot: '熱', warm: '溫', cold: '冰' }[st.dispensing]}水中…`
      : st.cupTimer > 0 ? `已取水 ${Math.round(st.lastDispense * 1000)} ml`
      : st.valveOpen ? '水位下降，進水閥開啟，自動進水中…'
      : st.heating ? '加熱回溫中（示意加速）' : '待機中，水位正常';
    if (msg !== st.message) { st.message = msg; emit(); }

    // ---- visuals
    for (const k of Object.keys(api.tanks)) {
      const T = api.tanks[k], lv = Math.max(0.0001, st.tanks[k].level / caps[k]);
      T.water.scale.y = lv; T.water.position.y = (T.h * lv) / 2; T.top.position.y = T.h * lv;
    }
    api.coil.material.emissiveIntensity = st.heating ? 1.6 + Math.sin(performance.now() / 160) * 0.4 : 0;
    api.valve.material.emissiveIntensity = st.valveOpen ? 1.0 : 0;
    // buttons leds + stream + cup
    for (const k of Object.keys(api.buttons)) api.buttons[k].userData.led.scale.setScalar(st.dispensing === k ? 1.8 : 1);
    if (st.dispensing) {
      const key = st.dispensing;
      const cupTop = api.cupPos.y + 0.003 + Math.min(0.1, st.cupVol / 0.33 * 0.1);
      const len = api.nozzle.y - cupTop;
      api.stream.visible = true; api.stream.scale.set(1, Math.max(0.01, len), 1);
      api.stream.position.set(api.nozzle.x, cupTop + len / 2, api.nozzle.z);
      api.stream.material.color.set({ hot: 0xe8f4fb, warm: 0xcfe9f8, cold: 0xb8e0f8 }[key]);
    } else api.stream.visible = false;
    if (api.cup.g.visible) {
      const h = Math.max(0.0005, Math.min(0.1, st.cupVol / 0.33 * 0.1));
      api.cup.water.scale.set(1, h, 1); api.cup.water.position.y = 0.006 + h / 2;
      if (api.cup.dropT < 1) { api.cup.dropT = Math.min(1, api.cup.dropT + dt * 3); api.cup.g.position.y = api.cupPos.y + (1 - api.cup.dropT) * 0.06; }
      if (!st.dispensing && st.cupTimer > 0) { st.cupTimer -= dt; if (st.cupTimer <= 0) { api.cup.g.visible = false; st.cupVol = 0; emit(); } }
    }
    // steam above hot water
    const hotCup = api.cup.g.visible && st.cupKey === 'hot' && st.cupVol > 0.03;
    for (const s of api.steam) {
      if (!hotCup) { s.sp.visible = false; continue; }
      s.life += dt * s.speed * 0.6; if (s.life > 1) s.life = 0;
      s.sp.visible = true;
      const h = Math.min(0.1, st.cupVol / 0.33 * 0.1);
      s.sp.position.set(api.cupPos.x + s.ox + Math.sin(s.life * 6 + s.ox * 90) * 0.01, api.cupPos.y + 0.012 + h + s.life * 0.16, api.cupPos.z);
      const sc = 0.03 + s.life * 0.07; s.sp.scale.set(sc, sc, sc);
      s.sp.material.opacity = Math.sin(s.life * Math.PI) * 0.5;
    }
    // pipe flow animation
    api.flowTex.offset.x -= dt * (0.15 + st.flow * 1.6);
    // display refresh
    dispTimer -= dt;
    if (dispTimer <= 0) { dispTimer = 0.25; drawDisplay(hot.temp, st.heating); emit(); }
  };
  api.setModel('AW');
  return api;
}
