import * as THREE from 'three';
import * as T from './textures.js';

/** Builds the material library. `onProgress(label, ratio)` lets the loader show progress. */
export async function buildMaterials(onProgress = () => {}) {
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const steps = [];
  const M = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const step = (label, fn) => steps.push([label, fn]);

  // ---- floors ----------------------------------------------------------------------------
  step('地磚 120×120', () => {
    const t = T.tile120();
    M.floorTile = std({ map: t.map, bumpMap: t.bump, bumpScale: 1.2, roughness: 0.42, metalness: 0, envMapIntensity: 0.7 });
  });
  step('木地板', () => {
    const t = T.woodPlanks({});
    M.floorWood = std({ map: t.map, bumpMap: t.bump, bumpScale: 1.5, roughness: 0.55, metalness: 0, envMapIntensity: 0.5 });
  });
  step('六角磚', () => {
    const t = T.hexTile();
    M.floorHex = std({ map: t.map, bumpMap: t.bump, bumpScale: 1.4, roughness: 0.5, envMapIntensity: 0.5 });
  });
  step('水磨石', () => {
    const calm = [[188, 182, 172], [220, 215, 207], [198, 190, 178], [174, 168, 160], [210, 203, 192]];
    const f = T.terrazzo({ tileW: 0.6, tileH: 0.6, cols: 2, rows: 2, seed: 3, density: 3800, base: [207, 201, 192], chips: calm, chipScale: 0.8 });
    M.floorTerrazzo = std({ map: f.map, bumpMap: f.bump, bumpScale: 0.6, roughness: 0.4, envMapIntensity: 0.7 });
    const w = T.terrazzo({ tileW: 1.0, tileH: 0.35, cols: 1, rows: 2, seed: 6, density: 1700, base: [212, 206, 197], chips: calm, chipScale: 0.9 });
    M.wallTerrazzo = std({ map: w.map, bumpMap: w.bump, bumpScale: 0.5, roughness: 0.34, envMapIntensity: 0.7 });
    const a = T.terrazzo({
      tileW: 1.0, tileH: 0.35, cols: 1, rows: 2, seed: 12, density: 1500, base: [226, 218, 204], chipScale: 1.5,
      chips: [[196, 104, 74], [70, 128, 126], [214, 170, 72], [62, 62, 68], [222, 158, 148], [238, 232, 220]],
    });
    M.wallTerrazzoAccent = std({ map: a.map, bumpMap: a.bump, bumpScale: 0.6, roughness: 0.3, envMapIntensity: 0.7 });
  });
  step('balcony tile', () => {
    const t = T.terrazzo({ tileW: 0.3, tileH: 0.3, cols: 4, rows: 4, seed: 21, density: 1800, base: [118, 118, 120], chips: [[96, 96, 98], [140, 138, 134], [80, 80, 84]], grout: [90, 90, 92], chipScale: 0.8 });
    M.floorBalcony = std({ map: t.map, bumpMap: t.bump, bumpScale: 0.6, roughness: 0.75 });
  });

  // ---- walls -----------------------------------------------------------------------------
  step('司曼特塗料', () => {
    const t = T.plaster({});
    M.wallPlaster = std({ map: t.map, bumpMap: t.bump, bumpScale: 0.5, roughness: 0.9, envMapIntensity: 0.4 });
    const w = T.plaster({ base: [236, 233, 227], seed: 4, amp: 4, scale: 2.4 });
    M.wallWhite = std({ map: w.map, bumpMap: w.bump, bumpScale: 0.12, roughness: 0.95, envMapIntensity: 0.4 });
    M.ceilingWhite = std({ color: 0xf4f2ee, roughness: 0.95, envMapIntensity: 0.3 });
    M.slabConcrete = std({ color: 0x9a9b9c, roughness: 1 });
    const e = T.plaster({ base: [168, 168, 166], seed: 17, amp: 22, scale: 2.4 });
    M.exterior = std({ map: e.map, bumpMap: e.bump, bumpScale: 0.6, roughness: 0.95, envMapIntensity: 0.6 });
    M.concreteDark = std({ color: 0x8b8c8d, roughness: 0.98 });
  });
  step('廚房壁磚', () => {
    const t = T.wallTile({});
    M.wallKitchenTile = std({ map: t.map, bumpMap: t.bump, bumpScale: 0.5, roughness: 0.28, envMapIntensity: 0.8 });
  });

  // ---- wood, laminate, stone, metals ------------------------------------------------------
  step('木皮與櫃體', () => {
    const v = T.veneer({});
    M.oak = std({ map: v.map, roughness: 0.5, envMapIntensity: 0.5 });
    const v2 = T.veneer({ hue: 28, sat: 0.35, light: 0.52, seed: 14 });
    M.oakDark = std({ map: v2.map, roughness: 0.5, envMapIntensity: 0.5 });
    M.laminateWhite = std({ color: 0xf2f0ec, roughness: 0.5, envMapIntensity: 0.5 });
    M.laminateGrey = std({ color: 0xc9c7c2, roughness: 0.55 });
    M.laminateWarm = std({ color: 0xd9d2c6, roughness: 0.55 });
    M.cabinetInterior = std({ color: 0xe8e4dc, roughness: 0.7 });
    M.quartz = phys({ color: 0xe9e6e0, roughness: 0.28, clearcoat: 0.2, clearcoatRoughness: 0.3, envMapIntensity: 0.9 });
    M.blackMetal = std({ color: 0x161617, roughness: 0.42, metalness: 0.7, envMapIntensity: 1 });
    M.blackMatte = std({ color: 0x1b1b1c, roughness: 0.7, metalness: 0.2 });
    M.bronze = std({ color: 0x6b5a45, roughness: 0.35, metalness: 0.85, envMapIntensity: 1.1 });
    M.steel = std({ color: 0xc8cbcf, roughness: 0.28, metalness: 1, envMapIntensity: 1.2 });
    M.chrome = std({ color: 0xffffff, roughness: 0.06, metalness: 1, envMapIntensity: 1.4 });
    M.aluminumWhite = std({ color: 0xe8e8e6, roughness: 0.4, metalness: 0.3 });
    M.rubber = std({ color: 0x232324, roughness: 0.9 });
    M.plasticWhite = phys({ color: 0xf4f5f6, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.18, envMapIntensity: 1.1 });
    M.plasticGrey = std({ color: 0x8e9195, roughness: 0.5 });
    M.ceramic = phys({ color: 0xfbfbfa, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 });
  });
  step('織物', () => {
    const f = T.fabric({ base: [196, 188, 176] });
    M.sofa = phys({ map: f.map, bumpMap: f.bump, bumpScale: 1.2, color: 0xffffff, roughness: 0.95, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xd8d0c4) });
    const f2 = T.fabric({ base: [120, 124, 122], seed: 6 });
    M.fabricGrey = phys({ map: f2.map, bumpMap: f2.bump, bumpScale: 1.2, roughness: 0.95, sheen: 0.5, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xb0b4b0) });
    const f3 = T.fabric({ base: [208, 200, 188], seed: 8 });
    M.fabricCream = phys({ map: f3.map, bumpMap: f3.bump, bumpScale: 1.0, roughness: 0.95, sheen: 0.7, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xffffff) });
    M.linen = phys({ color: 0xf2efe9, roughness: 0.95, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff) });
    M.linenGrey = phys({ color: 0xb8b6b0, roughness: 0.95, sheen: 0.6, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xe8e6e0) });
    M.leather = std({ color: 0x2c2724, roughness: 0.55 });
  });

  // ---- glass / mirror / emissive -----------------------------------------------------------
  step('玻璃與燈具', () => {
    M.glass = phys({ color: 0xdfeef0, transparent: true, opacity: 0.16, roughness: 0.03, metalness: 0, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide, userData: { sky: true } });
    M.glassTint = phys({ color: 0xb8c6c2, transparent: true, opacity: 0.28, roughness: 0.04, envMapIntensity: 1.5, depthWrite: false, side: THREE.DoubleSide, userData: { sky: true } });
    M.ribbedNormal = T.flutedNormal();
    M.glassRibbed = phys({ color: 0xe4efee, transparent: true, opacity: 0.34, roughness: 0.18, normalMap: M.ribbedNormal, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 1.3, depthWrite: false, side: THREE.DoubleSide, userData: { sky: true } });
    M.mirrorGrey = std({ color: 0x8c8f90, roughness: 0.04, metalness: 1, envMapIntensity: 1.8 });
    M.mirror = std({ color: 0xdddddd, roughness: 0.02, metalness: 1, envMapIntensity: 1.9 });
    M.tvScreen = std({ color: 0x050506, roughness: 0.08, metalness: 0.4, envMapIntensity: 1.2 });
    M.ledWarm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.78, 0.5).multiplyScalar(2.2), toneMapped: false });
    M.ledNeutral = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.92, 0.8).multiplyScalar(2.6), toneMapped: false });
    M.downlight = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.95, 0.85).multiplyScalar(3.0), toneMapped: false });
    M.downlightRim = std({ color: 0xf2f1ee, roughness: 0.4 });
    M.lampShade = std({ color: 0xece7dc, roughness: 0.9, emissive: 0xffe2b0, emissiveIntensity: 0.0, side: THREE.DoubleSide });
    M.water = phys({ color: 0x7cc7f0, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0, envMapIntensity: 1.5, depthWrite: false, side: THREE.DoubleSide });
  });

  for (let i = 0; i < steps.length; i++) {
    onProgress(steps[i][0], i / steps.length);
    await tick();
    steps[i][1]();
  }
  onProgress('完成', 1);
  return M;
}
