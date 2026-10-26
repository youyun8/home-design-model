import * as THREE from 'three';
import { canvasTex, labelCanvas } from './textures.js';

/** Pointer picking: doors (click), dispenser buttons (press & hold), dispenser body, TV. */
export function setupInteraction(app, nav, ui) {
  const { camera, canvas, arch, dispenser: disp } = app;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tip = document.getElementById('tooltip');
  const targets = [...arch.doors.map((d) => d.group), disp.build.unit.group];
  if (app.tv) targets.push(app.tv);
  targets.push(...app.curtains.clickable);

  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    ray.far = nav.mode === 'orbit' ? 60 : 7;
    const hits = ray.intersectObjects(targets, true).filter((h) => h.object.visible && !(h.object.material && h.object.material.transparent && h.object.material.opacity < 0.5 && !h.object.userData.door));
    for (const h of hits) {
      let o = h.object;
      while (o) {
        if (o.userData.btn) return { type: 'btn', key: o.userData.btn, obj: o };
        if (o.userData.door) return { type: 'door', door: o.userData.door };
        if (o.userData.tv) return { type: 'tv' };
        if (o.userData.curtain) return { type: 'curtain' };
        if (o.userData.dispenser) return { type: 'dispenser' };
        o = o.parent;
      }
    }
    return null;
  };

  // --- TV: animated "screen" when switched on
  let tvOn = false, tvCanvas = null, tvTex = null, tvT = 0;
  if (app.tv) {
    tvCanvas = labelCanvas(256, 144, () => {});
    tvTex = canvasTex(tvCanvas, { repeatWrap: false });
    app.tvMat = new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false });
  }
  const setTV = (on) => {
    tvOn = on; if (app.tv) app.tv.material = on ? app.tvMat : app.M.screenOff;
    app.lighting?.refreshTV?.(on);
  };
  const drawTV = (t) => {
    const g = tvCanvas.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 144);
    gr.addColorStop(0, `hsl(${(t * 14) % 360}, 55%, 28%)`); gr.addColorStop(1, `hsl(${(t * 14 + 80) % 360}, 60%, 44%)`);
    g.fillStyle = gr; g.fillRect(0, 0, 256, 144);
    g.fillStyle = 'rgba(255,255,255,.14)';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(128 + Math.sin(t * 0.7 + i) * 90, 72 + Math.cos(t * 0.5 + i * 1.7) * 40, 26 + i * 8, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 18px system-ui, sans-serif'; g.fillText('8C 住宅', 14, 126);
    tvTex.needsUpdate = true;
  };
  app.updateTV = (dt) => { if (!tvOn) return; tvT += dt; if (((tvT * 12) | 0) !== (((tvT - dt) * 12) | 0)) drawTV(tvT); };
  app.setTV = setTV;

  // --- pointer handling
  let down = null, hoverT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    const hit = pick(e);
    down = { x: e.clientX, y: e.clientY, t: performance.now(), hit };
    if (hit && hit.type === 'btn') {
      if (hit.obj.userData.disabled) return;
      ui.panel.open();
      if (ui.pressDispense(hit.key)) { app.pressedButton = true; e.stopPropagation(); }
    }
  }, true);
  const up = (e) => {
    if (app.pressedButton) { app.pressedButton = false; ui.releaseDispense(); down = null; return; }
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
    const d = down; down = null;
    if (moved > 6 || dt > 600 || e.target !== canvas) return;
    const hit = pick(e) || d.hit;
    if (!hit) return;
    if (hit.type === 'door') hit.door.toggle();
    else if (hit.type === 'tv') setTV(!tvOn);
    else if (hit.type === 'curtain') app.curtains.toggle();
    else if (hit.type === 'dispenser') { ui.panel.open(); ui.panel.pinned = true; }
  };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', () => { if (app.pressedButton) { app.pressedButton = false; ui.releaseDispense(); } });

  canvas.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - hoverT < 70 || e.buttons) { if (e.buttons) tip.hidden = true; return; }
    hoverT = now;
    const hit = pick(e);
    let text = '';
    if (hit) {
      if (hit.type === 'btn') text = hit.obj.userData.hover;
      else if (hit.type === 'door') text = `${hit.door.name}（點擊${hit.door.open ? '關閉' : '開啟'}）`;
      else if (hit.type === 'curtain') text = `遮光窗簾（點擊${app.curtains.closed ? '拉開' : '拉上'}）`;
      else if (hit.type === 'tv') text = `65 吋電視（點擊${tvOn ? '關閉' : '開啟'}）`;
      else if (hit.type === 'dispenser') text = '賀眾牌飲水機（點擊開啟控制面板）';
    }
    canvas.style.cursor = text ? 'pointer' : (nav.mode === 'orbit' ? 'grab' : 'crosshair');
    if (text) { tip.textContent = text; tip.hidden = false; tip.style.left = `${e.clientX}px`; tip.style.top = `${e.clientY}px`; } else tip.hidden = true;
  });
  canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
}
