import * as THREE from 'three';
import { CM, lightRooms } from './core.js';
import { DOWNLIGHTS, ROOMS, SOFFIT } from './data.js';
import { skyTexture } from './textures.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const TIMES = {
  day: { label: '白天', sun: new THREE.Vector3(-0.85, 0.50, -0.31).normalize(), sunColor: 0xfff1d6, sunI: 3.6, env: 0.55, hemi: 0.3, exposure: 0.95, bloom: 0.18, spot: 0.0, fog: 0xc9ddf0 },
  dusk: { label: '黃昏', sun: new THREE.Vector3(-0.93, 0.07, -0.36).normalize(), sunColor: 0xff9a52, sunI: 2.6, env: 0.3, hemi: 0.2, exposure: 0.95, bloom: 0.3, spot: 1.0, fog: 0xf0a77a },
  night: { label: '夜晚', sun: new THREE.Vector3(0.55, 0.60, 0.58).normalize(), sunColor: 0x7e95d8, sunI: 0.42, env: 0.12, hemi: 0.08, exposure: 1.0, bloom: 0.42, spot: 1.0, fog: 0x0b1020 },
};

/** Ceiling height (cm) at plan position, used to place the downlights. */
export function ceilingAt(x, y) {
  if (x >= SOFFIT.x0 && x <= SOFFIT.x1 && y >= SOFFIT.y0 && y <= SOFFIT.y1) return SOFFIT.h;
  for (const r of ROOMS) for (const q of r.rects) if (x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3]) return r.ceil;
  return 270;
}

export function createLighting({ scene, renderer, M, quality, ceilings }) {
  const L = { time: 'day', lightsOn: false, roomOn: Object.fromEntries(ROOMS.map((r) => [r.id, true])) };
  const root = new THREE.Group();
  root.name = 'lighting';
  scene.add(root);

  // --- sun / moon
  const sun = new THREE.DirectionalLight(0xfff1d6, 3.5);
  sun.castShadow = true;
  const sc = sun.shadow.camera;
  sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  sun.shadow.mapSize.set(quality.shadow, quality.shadow);
  const center = new THREE.Vector3(3.6, 1.4, 2.5);
  root.add(sun, sun.target);
  sun.target.position.copy(center);

  const hemi = new THREE.HemisphereLight(0xf3f5ff, 0xc7b69a, 0.3);
  root.add(hemi);

  // --- downlights (spot) : intensity in candela, linked to rooms (see core.linkRooms)
  const spots = [];
  const fixtures = new THREE.Group();
  fixtures.name = 'downlight-fixtures';
  const rimGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.012, 24);
  const discGeo = new THREE.CircleGeometry(0.042, 24); discGeo.rotateX(Math.PI / 2);
  DOWNLIGHTS.forEach((d, i) => {
    const h = ceilingAt(d.x, d.y) * CM;
    const s = new THREE.SpotLight(0xffe9cf, 0, 7.5, 1.12, 0.78, 2);
    s.position.set(d.x * CM, h - 0.02, d.y * CM);
    s.target.position.set(d.x * CM, 0, d.y * CM);
    s.userData.room = d.room;
    root.add(s, s.target);
    spots.push(s);
    lightRooms.value[i] = d.room;
    const rim = new THREE.Mesh(rimGeo, M.downlightRim);
    rim.position.set(d.x * CM, h - 0.006, d.y * CM);
    const disc = new THREE.Mesh(discGeo, M.downlight);
    disc.position.set(d.x * CM, h - 0.0135, d.y * CM);
    disc.userData.noRoom = true;
    fixtures.add(rim, disc);
  });
  (ceilings || scene).add(fixtures);
  fixtures.traverse((o) => { o.userData.keepStatic = false; });

  // --- sky + environment
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; // neutral interior light / reflections
  const skies = {};
  function skyFor(kind) {
    if (!skies[kind]) {
      const W = kind === 'day' ? quality.sky : Math.min(quality.sky, 2048);
      const tex = skyTexture(kind, TIMES[kind].sun, W);
      const env = pmrem.fromEquirectangular(tex).texture;
      skies[kind] = { tex, env };
    }
    return skies[kind];
  }

  const I_SPOT = 5.5; // candela per 9.5 W downlight (tuned for ACES + typical eye height)
  function refreshSpots() {
    const base = TIMES[L.time].spot;
    spots.forEach((s) => {
      const on = L.lightsOn && L.roomOn[s.userData.room];
      s.intensity = on ? I_SPOT * Math.max(0.55, base) : 0;
    });
    // emissive discs reflect the switch state
    M.downlight.color.setRGB(1, 0.95, 0.85).multiplyScalar(L.lightsOn ? 3.0 : 0.28);
    M.ledWarm.color.setRGB(1.0, 0.78, 0.5).multiplyScalar(L.lightsOn ? 2.2 : 0.18);
    M.ledNeutral.color.setRGB(1.0, 0.92, 0.8).multiplyScalar(L.lightsOn ? 2.6 : 0.2);
    L.onChange?.();
  }

  L.setTime = (kind, { keepLights = false } = {}) => {
    const t = TIMES[kind];
    L.time = kind;
    const sky = skyFor(kind);
    scene.background = sky.tex;
    scene.environment = roomEnv;
    scene.environmentIntensity = t.env;
    // glass shows the outdoor sky; everything else uses the neutral interior environment
    scene.traverse((o) => {
      if (!o.isMesh) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.userData?.sky) { m.envMap = sky.env; m.envMapIntensity = kind === 'day' ? 1.6 : 1.0; m.needsUpdate = true; } });
    });
    scene.backgroundIntensity = kind === 'day' ? 1.0 : 1.0;
    sun.color.set(t.sunColor);
    sun.intensity = t.sunI;
    sun.position.copy(center).addScaledVector(t.sun, 20);
    hemi.intensity = t.hemi;
    renderer.toneMappingExposure = t.exposure;
    L.bloom = t.bloom;
    if (!keepLights) L.lightsOn = kind !== 'day';
    refreshSpots();
  };
  L.setLights = (on) => { L.lightsOn = on; refreshSpots(); };
  L.setRoom = (id, on) => { L.roomOn[id] = on; refreshSpots(); };
  L.sun = sun;
  L.setShadowSize = (n) => { sun.shadow.mapSize.set(n, n); sun.shadow.map?.dispose(); sun.shadow.map = null; };
  L.spots = spots;
  return L;
}
