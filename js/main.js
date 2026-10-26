import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LuminosityHighPassShader } from 'three/addons/shaders/LuminosityHighPassShader.js';

import { buildMaterials } from './materials.js';
import { buildArchitecture } from './architecture.js';
import { createLighting } from './lighting.js';
import { finalizeScene, CM } from './core.js';
import { mergeStatic } from './optimize.js';
import { VIEWS } from './data.js';
import addExtras from './scene-extra.js';
import { Navigator } from './navigator.js';
import { setupUI } from './ui.js';
import { setupInteraction } from './interaction.js';

// Tame HDR specular spikes before they reach the bloom blur (e.g. a spot light on glossy black glass).
LuminosityHighPassShader.fragmentShader = LuminosityHighPassShader.fragmentShader.replace(
  'vec4 texel = texture2D( tDiffuse, vUv );', 'vec4 texel = texture2D( tDiffuse, vUv ); texel.rgb = min(texel.rgb, vec3(4.0));');

export const QUALITY = {
  high: { dpr: 2, shadow: 4096, sky: 4096, ao: true, bloom: true, msaa: 4 },
  medium: { dpr: 1.5, shadow: 2048, sky: 2048, ao: false, bloom: true, msaa: 4 },
  low: { dpr: 1, shadow: 1024, sky: 2048, ao: false, bloom: false, msaa: 0 },
};

const params = new URLSearchParams(location.search);
const loaderText = document.getElementById('loader-text');
const loaderFill = document.getElementById('loader-fill');
const progress = (label, r) => { loaderText.textContent = `建立中：${label}`; loaderFill.style.width = `${Math.round(r * 100)}%`; };

async function boot() {
  const canvas = document.getElementById('view');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const explicitQ = !!QUALITY[params.get('q')];
  const qKey = explicitQ ? params.get('q') : (coarse ? 'low' : (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 'medium' : 'high'));
  const quality = { ...QUALITY[qKey] };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
  } catch (e) {
    loaderText.textContent = '此瀏覽器無法啟用 WebGL，請改用較新的 Chrome / Edge / Safari / Firefox。';
    throw e;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.dpr));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.05, 300);

  progress('材質', 0.02);
  const M = await buildMaterials(progress);
  progress('建築', 0.9);
  const arch = buildArchitecture(M);
  scene.add(arch.root);

  const app = { THREE, renderer, scene, camera, canvas, M, arch, quality, qKey, params, mode: 'orbit', showCeiling: params.get('ceil') === '1' };
  window.__app = app;

  const lighting = createLighting({ scene, renderer, M, quality, ceilings: arch.groups.ceilings });
  app.lighting = lighting;
  await addExtras(app, progress);
  lighting.setTime(['day', 'dusk', 'night'].includes(params.get('time')) ? params.get('time') : 'day');
  if (params.has('lights')) lighting.setLights(params.get('lights') === '1');

  app.curtains.onProgress = (k) => lighting.setCurtainK(k);
  if (params.get('curtains') === '1') { app.curtains.setClosed(true); app.curtains.t = 1; app.curtains.update(0.001); app.curtains.items.forEach((i) => i.anim.forEach((f) => f(1))); lighting.setCurtainK(1); }

  // lit lamps follow the light switch
  app.refreshLamps = () => (app.lamps || []).forEach((m) => { m.material.emissiveIntensity = lighting.lightsOn ? 1.3 : 0; });
  app.refreshLamps();

  progress('最佳化', 0.99);
  finalizeScene(scene);
  Object.values(arch.groups).forEach((g) => mergeStatic(g));
  Object.values(app.furniture.rooms).forEach((g) => mergeStatic(g));

  // ---- post processing -------------------------------------------------------------------
  let composer = null, bloom = null, gtao = null;
  const glassMeshes = [];
  scene.traverse((o) => {
    const m = o.isMesh && !Array.isArray(o.material) ? o.material : null;
    if (m && m.transparent && m.depthWrite === false && m.opacity < 0.9) glassMeshes.push(o);
  });
  const buildComposer = () => {
    const w = innerWidth, h = innerHeight, dpr = renderer.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(w * dpr, h * dpr, { type: THREE.HalfFloatType, samples: quality.msaa });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(dpr); composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    if (quality.ao) {
      gtao = new GTAOPass(scene, camera, w, h);
      gtao.output = GTAOPass.OUTPUT.Default;
      gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12, distanceFallOff: 1.0, screenSpaceRadius: false });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1, rings: 2, samples: 12 });
      gtao.blendIntensity = 0.9;
      // glass / curtains must not occlude in the AO pass (they would darken the sky seen through windows)
      const aoRender = gtao.render.bind(gtao);
      gtao.render = (...a) => {
        const vis = glassMeshes.map((m) => m.visible);
        glassMeshes.forEach((m) => { m.visible = false; });
        aoRender(...a);
        glassMeshes.forEach((m, i) => { m.visible = vis[i]; });
      };
      composer.addPass(gtao);
    }
    if (quality.bloom) {
      bloom = new UnrealBloomPass(new THREE.Vector2(w, h), lighting.bloom ?? 0.25, 0.55, 1.05);
      composer.addPass(bloom);
    }
    composer.addPass(new OutputPass());
  };
  if (quality.ao || quality.bloom) buildComposer();
  app.composer = composer;

  // runtime quality switch (also used by the automatic frame-rate guard)
  const toast = (msg) => {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 4200);
  };
  app.applyQuality = (key, { silent } = {}) => {
    const q = QUALITY[key]; if (!q) return;
    Object.assign(quality, q); app.qKey = key;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.dpr));
    renderer.setSize(innerWidth, innerHeight, false);
    lighting.setShadowSize(q.shadow);
    if (composer) { composer.dispose(); composer = null; bloom = null; gtao = null; }
    if (q.ao || q.bloom) buildComposer();
    app.composer = composer;
    const sel = document.getElementById('sel-quality'); if (sel) sel.value = key;
    if (!silent) toast(`畫質：${{ high: '高', medium: '中', low: '省電' }[key]}`);
  };

  // ---- navigation, UI, interaction ----------------------------------------------------------
  const nav = new Navigator({ camera, canvas, app });
  app.nav = nav;
  nav.bindJoystick(document.getElementById('joystick'));
  nav.baseFov = 48; nav.applyFov();
  const ui = setupUI(app, nav);
  app.ui = ui;
  setupInteraction(app, nav, ui);

  const startView = VIEWS.find((v) => v.key === params.get('view')) || VIEWS[0];
  if (params.get('mode') === 'tour') { nav.goTo(VIEWS.find((v) => v.key === 'entry'), { instant: true }); nav.startTour(); }
  else nav.goTo(startView, { instant: true });
  if (params.has('cam')) {
    const c = params.get('cam').split(',').map(Number);
    nav.goTo({ key: 'custom', name: '測試視角', text: '', mode: params.get('cammode') === 'orbit' ? 'orbit' : 'walk', pos: [c[0], c[1], c[2]], target: [c[3], c[4], c[5]] }, { instant: true });
  }
  // test / deep-link switches
  if (params.get('panel') === '1') ui.panel.open();
  if (params.get('xray') === '1') ui.setXray(true);
  if (params.get('cut') === '1') document.getElementById('dp-cut').click();
  if (params.get('tv') === '1') app.setTV?.(true);
  if (params.get('doors') === '1') arch.doors.forEach((d) => { if (!d.cabinet) { d.open = true; d.target = d.t = 1; d.apply(1); } });
  if (params.get('dispense')) { app.dispenser.start(params.get('dispense')); app.dispenser.state.autoStopAt = 0.3; }
  if (params.get('drain')) { const t = app.dispenser.state.tanks; t.hot.level = 2.2; t.warm.level = 1.2; t.cold.level = 0.6; }
  if (params.get('model') === 'BW') document.querySelector('#dp-model [data-model="BW"]').click();

  // ---- visibility rules for orbit (dollhouse) view ------------------------------------------
  const B = { x0: -193, x1: 930, y0: -15, y1: 600 };
  const updateVisibility = () => {
    const cx = camera.position.x / CM, cz = camera.position.z / CM, orbit = nav.mode === 'orbit', g = arch.groups;
    g.ceilings.visible = !orbit || app.showCeiling;
    g.N.visible = !(orbit && cz < B.y0); g.S.visible = !(orbit && cz > B.y1);
    g.W.visible = !(orbit && cx < B.x0); g.E.visible = !(orbit && cx > B.x1);
  };

  // test helper: jump all door animations to their end state
  app.settle = () => arch.doors.forEach((d) => { d.t = d.target; d.apply(d.target); });

  // ---- loop --------------------------------------------------------------------------------
  let last = performance.now();
  app.frame = 0;
  const guard = { t: 0, n: 0, sum: 0, warm: 0 };
  const loop = (now) => {
    const raw = now - last;
    const dt = Math.min(0.05, raw / 1000); last = now;
    if (!explicitQ && !app.paused && raw < 400 && app.qKey !== 'low') {
      guard.warm += raw;
      if (guard.warm > 3000) {
        guard.n++; guard.sum += raw;
        if (guard.n >= 70) {
          if (guard.sum / guard.n > 42) { app.applyQuality(app.qKey === 'high' ? 'medium' : 'low', { silent: true }); toast('偵測到畫面較卡，已自動調降畫質（可在右上角調整）'); }
          guard.n = 0; guard.sum = 0; guard.warm = 1500;
        }
      }
    }
    nav.update(dt);
    arch.doors.forEach((d) => d.update(dt));
    app.curtains.update(dt);
    app.dispenser.update(dt);
    app.updateTV?.(dt);
    ui.update(dt);
    updateVisibility();
    if (bloom) bloom.strength = lighting.bloom ?? bloom.strength;
    if (!app.paused) { if (composer) composer.render(); else renderer.render(scene, camera); app.frame++; }
    requestAnimationFrame(loop);
  };
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; app.nav.applyFov();
    renderer.setSize(innerWidth, innerHeight, false);
    if (composer) composer.setSize(innerWidth, innerHeight);
  });

  document.getElementById('loader').classList.add('done');
  app.ready = true;
  requestAnimationFrame(loop);
}

boot().catch((e) => { console.error(e); loaderText.textContent = '載入失敗：' + e.message; window.__err = e.message; });
