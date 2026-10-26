import * as THREE from 'three';
import { CM } from './core.js';

// Dimension annotations (cm).
//   src 'dwg' = size marked on, or read directly from, the construction drawings / product spec (teal)
//   src 'der' = not marked: derived from the model coordinates, standard sizes or an assumption (amber)
// cat: room | open (doors, windows) | furn (furniture, cabinetry) | height
const L = (cat, src, a, b, text, z = 2) => ({ cat, src, a: [...a, z], b: [...b, z], text });
const V = (cat, src, x, y, z0, z1, text) => ({ cat, src, a: [x, y, z0], b: [x, y, z1], text, v: true });

export const CATS = { room: '房間', open: '門窗', furn: '家具櫃體', height: '高度' };
export const SRCS = { dwg: '圖面標示', der: '推導' };

export const DIMS = [
  // ---- rooms
  L('room', 'dwg', [-157, 18], [252, 18], '主臥 寬 409'), L('room', 'dwg', [-146, 0], [-146, 333], '主臥 深 333'),
  L('room', 'dwg', [262, 70], [598, 70], '客廳 寬 336'), L('room', 'dwg', [275, 0], [275, 585], '客廳 深 585'),
  L('room', 'dwg', [0, 455], [252, 455], '廚房 寬 252'), L('room', 'dwg', [14, 342], [14, 585], '廚房 深 243'),
  L('room', 'dwg', [610, 20], [862, 20], '書房 寬 252'), L('room', 'dwg', [622, 0], [622, 357], '書房 深 357'),
  L('room', 'der', [610, 440], [878, 440], '衛浴 寬 268'), L('room', 'der', [802, 540], [914, 540], '淋浴間 寬 112'),
  L('room', 'der', [830, 497], [830, 585], '淋浴間 深 88'), L('room', 'der', [-193, 500], [-16, 500], '陽台 寬 177'),
  L('room', 'der', [-176, 342], [-176, 585], '陽台 深 243'),
  L('room', 'der', [390, 520], [598, 520], '降落塵區 寬 208'), L('room', 'der', [585, 465], [585, 585], '降落塵區 深 120'),
  L('room', 'der', [262, 600], [598, 600], '客廳含玄關 外寬 336'),
  L('room', 'der', [252, 200], [262, 200], '牆厚 10', 1),
  // ---- openings
  L('open', 'dwg', [-152, 5], [122, 5], '主臥窗 274', 90), L('open', 'dwg', [272, 5], [588, 5], '客廳窗 316', 90),
  L('open', 'dwg', [715, 5], [858, 5], '書房窗 143', 90), L('open', 'dwg', [-150, 64], [-150, 190], '主臥側窗 126', 90),
  L('open', 'dwg', [462, 575], [574, 575], '玄關門 112', 90), L('open', 'dwg', [257, 5], [257, 95], '主臥門 90', 90),
  L('open', 'dwg', [270, 413], [270, 497], '廚房推拉門 84', 90), L('open', 'dwg', [604, 5], [604, 272], '書房摺疊門 267', 90),
  L('open', 'dwg', [604, 377], [604, 465], '衛浴門 88', 90), L('open', 'der', [-6, 414], [-6, 500], '陽台門 86', 90),
  V('open', 'der', 650, 5, 0, 223, '書房門高 223'), V('open', 'der', 262, 50, 0, 218, '主臥門高 218'),
  V('open', 'der', 590, 5, 4, 258, '客廳窗高 254'), V('open', 'der', 480, 580, 0, 222, '玄關門高 222'),
  // ---- furniture and cabinetry
  L('furn', 'dwg', [495, 85], [495, 315], '沙發 230 × 85', 50), L('furn', 'dwg', [262, 97], [262, 333], '電視櫃 236 × 45', 48),
  L('furn', 'dwg', [264, 560], [435, 560], '鞋櫃 171 × 45', 120), L('furn', 'dwg', [124, 352], [156, 352], '飲水機 32 × 48 × 52', 150),
  L('furn', 'dwg', [-135, 330], [-32, 330], '床 105（3.5 尺）', 55), L('furn', 'dwg', [-30, 330], [120, 330], '床 150（5 尺）', 55),
  L('furn', 'der', [-120, 139], [-120, 323], '床長 184', 55), L('furn', 'der', [190, 132], [190, 333], '衣櫃 深 60', 120),
  L('furn', 'der', [700, 330], [862, 330], '書架 162', 100), L('furn', 'der', [790, 80], [790, 252], '書桌 172 × 72', 80),
  L('furn', 'der', [262, 213], [262, 261], '電視 65 吋 144 × 83', 110),
  L('furn', 'der', [0, 372], [120, 372], '爐台流理台 120 × 60', 94), L('furn', 'der', [0, 560], [166, 560], '南側櫃 166 × 60', 94),
  L('furn', 'der', [93, 355], [252, 355], '吊櫃 159 × 38', 200), L('furn', 'der', [166, 548], [252, 548], '冰箱位 86 × 60', 190),
  L('furn', 'der', [714, 560], [800, 560], '浴櫃 86', 80), L('furn', 'der', [-170, 388], [-170, 486], '陽台洗衣槽位 42 × 98', 90),
  // ---- clear walking space (derived from the model)
  L('furn', 'der', [307, 175], [495, 175], '電視櫃到沙發淨距 188', 3), L('furn', 'der', [120, 250], [190, 250], '床到衣櫃淨距 70', 3),
  L('furn', 'der', [-32, 250], [-30, 250], '兩床間距 2', 3), L('furn', 'der', [702, 150], [790, 150], '書桌前淨距 88', 17),
  // ---- heights
  V('height', 'dwg', 300, 40, 0, 280, '客廳天花 280'), V('height', 'dwg', 300, 330, 0, 252, '降板 252'),
  V('height', 'dwg', 100, 360, 0, 240, '廚房天花 240'), V('height', 'dwg', -100, 40, 0, 270, '主臥天花 270'),
  V('height', 'dwg', 700, 200, 14, 270, '書房天花 270（架高 14）'),
  V('height', 'der', 20, 365, 0, 92, '檯面高 92'), V('height', 'der', 180, 375, 150, 240, '吊櫃 150–240'),
  V('height', 'der', -145, 330, 0, 105, '床頭板高 105'), V('height', 'der', 140, 290, 0, 48, '床墊頂 48'),
  V('height', 'der', 560, 200, 0, 42, '沙發座高 42'), V('height', 'der', 300, 200, 66, 152, '電視下緣 66'),
  V('height', 'der', 190, 300, 0, 268, '衣櫃高 268'), V('height', 'der', -185, 470, 0, 105, '陽台欄杆高 105'),
  V('height', 'der', 400, 560, 0, 248, '鞋櫃高 248'), V('height', 'der', 800, 330, 14, 244, '書架高 230'),
  V('height', 'der', -100, 450, 0, 240, '陽台天花 240'), V('height', 'der', 750, 440, 0, 240, '衛浴天花 240'),
];

export function buildDims(scene) {
  const root = new THREE.Group(); root.name = 'dimensions'; root.visible = false; root.userData.dynamic = true;
  const colors = { dwg: 0x1fd1e6, der: 0xffb02e };
  const buckets = {};
  const P3 = (p) => new THREE.Vector3(p[0] * CM, p[2] * CM, p[1] * CM);
  const labels = DIMS.map((d) => {
    const key = `${d.cat}:${d.src}`;
    const b = (buckets[key] ||= []);
    const a = P3(d.a), e = P3(d.b);
    b.push(a, e);
    const dir = new THREE.Vector3().subVectors(e, a).normalize();
    const side = d.v ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0).cross(dir).normalize();
    [a, e].forEach((p) => b.push(p.clone().addScaledVector(side, 0.05), p.clone().addScaledVector(side, -0.05)));
    return { cat: d.cat, src: d.src, pos: new THREE.Vector3().addVectors(a, e).multiplyScalar(0.5), text: d.text };
  });
  const groups = {};
  for (const [key, pts] of Object.entries(buckets)) {
    const src = key.split(':')[1];
    const m = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: colors[src], depthTest: false, transparent: true, opacity: 0.95 }));
    m.renderOrder = 20; m.frustumCulled = false; groups[key] = m; root.add(m);
  }
  scene.add(root);
  const state = { on: false, cat: { room: true, open: true, furn: true, height: true }, src: { dwg: true, der: true } };
  const shown = (o) => state.on && state.cat[o.cat] && state.src[o.src];
  const api = { group: root, labels, state, shown };
  api.apply = () => {
    root.visible = state.on;
    for (const [key, m] of Object.entries(groups)) { const [c, s] = key.split(':'); m.visible = state.cat[c] && state.src[s]; }
  };
  return api;
}
