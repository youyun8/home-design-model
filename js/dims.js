import * as THREE from 'three';
import { CM } from './core.js';

// Dimension annotations (cm). Values are the plan dimensions used to build the model, read from the
// construction drawings (inner clear sizes). Each item: a, b = end points in plan cm, text, z = height of the
// line above the floor, h = true for a height (vertical) dimension, then a = [x, y, z0], b = [x, y, z1].

const L = (a, b, text, z = 2) => ({ a: [...a, z], b: [...b, z], text });
const V = (x, y, z0, z1, text) => ({ a: [x, y, z0], b: [x, y, z1], text, v: true });

export const DIMS = [
  // ---- rooms (clear width x depth)
  L([-157, 18], [252, 18], '主臥 寬 409'), L([-146, 0], [-146, 333], '主臥 深 333'),
  L([262, 70], [598, 70], '客廳 寬 336'), L([275, 0], [275, 585], '客廳 深 585'),
  L([0, 455], [252, 455], '廚房 寬 252'), L([14, 342], [14, 585], '廚房 深 243'),
  L([610, 20], [862, 20], '書房 寬 252'), L([622, 0], [622, 357], '書房 深 357'),
  L([610, 440], [878, 440], '衛浴 寬 268'), L([-193, 500], [-16, 500], '陽台 寬 177'), L([-176, 342], [-176, 585], '陽台 深 243'),
  // ---- openings (clear width)
  L([-152, 5], [122, 5], '主臥窗 274', 90), L([272, 5], [588, 5], '客廳窗 316', 90), L([715, 5], [858, 5], '書房窗 143', 90),
  L([-150, 64], [-150, 190], '主臥側窗 126', 90),
  L([462, 575], [574, 575], '玄關門 112', 90), L([257, 5], [257, 95], '主臥門 90', 90),
  L([270, 413], [270, 497], '廚房推拉門 84', 90), L([604, 5], [604, 272], '書房摺疊門 267', 90), L([604, 377], [604, 465], '衛浴門 88', 90),
  // ---- furniture and cabinetry
  L([495, 85], [495, 315], '沙發 230 × 85', 50), L([262, 97], [262, 333], '電視櫃 236', 48),
  L([264, 560], [435, 560], '鞋櫃 171 × 45', 120),
  L([-135, 330], [-32, 330], '床 105', 55), L([-30, 330], [120, 330], '床 150', 55),
  L([190, 132], [190, 333], '衣櫃 深 60', 120),
  L([700, 330], [862, 330], '書架 162', 100), L([790, 80], [790, 252], '書桌 172 × 72', 80),
  L([124, 352], [156, 352], '飲水機 32 × 48 × 52', 150),
  // ---- heights
  V(300, 40, 0, 280, '客廳天花 280'), V(300, 330, 0, 252, '降板 252'), V(100, 360, 0, 240, '廚房天花 240'),
  V(-100, 40, 0, 270, '主臥天花 270'), V(700, 200, 14, 270, '書房天花 270（地板架高 14）'),
  V(20, 365, 0, 92, '檯面高 92'), V(180, 375, 150, 240, '吊櫃 150–240'),
];

export function buildDims(scene) {
  const g = new THREE.Group(); g.name = 'dimensions'; g.visible = false; g.userData.dynamic = true;
  const mat = new THREE.LineBasicMaterial({ color: 0x1fd1e6, depthTest: false, transparent: true, opacity: 0.95 });
  const pts = [];
  const P3 = (p) => new THREE.Vector3(p[0] * CM, p[2] * CM, p[1] * CM);
  const labels = DIMS.map((d) => {
    const a = P3(d.a), b = P3(d.b);
    pts.push(a, b);
    const dir = new THREE.Vector3().subVectors(b, a).normalize();
    const side = d.v ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0).cross(dir).normalize();
    [a, b].forEach((e) => { pts.push(e.clone().addScaledVector(side, 0.05), e.clone().addScaledVector(side, -0.05)); });
    return { pos: new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), text: d.text, v: d.v };
  });
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const lines = new THREE.LineSegments(geo, mat); lines.renderOrder = 20; lines.frustumCulled = false;
  g.add(lines); scene.add(g);
  return { group: g, labels };
}
