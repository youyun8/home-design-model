import * as THREE from 'three';
import { VIEWS, ROOMS } from './data.js';
import { CM, P } from './core.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function setupUI(app, nav) {
  const { lighting, dispenser: disp } = app;
  const ui = { showCeiling: false };

  // ------------------------------------------------------------------------- mode switch
  const modeSeg = $('#mode-seg');
  const setSeg = (seg, attr, val) => $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset[attr] === val));
  modeSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const m = b.dataset.mode;
    if (m === 'orbit') { if (nav.tour.on) nav.stopTour(); nav.goTo(VIEWS[0]); }
    else if (m === 'walk') { if (nav.tour.on) nav.stopTour(); else if (nav.mode === 'orbit') nav.goTo(VIEWS.find((v) => v.key === 'entry')); }
    else if (m === 'tour') { nav.startTour(); }
  });
  const hints = {
    orbit: '拖曳旋轉・滾輪縮放・右鍵平移　|　點擊門片可開關　|　點小地圖傳送',
    walk: 'W A S D 移動・拖曳轉向・Shift 加速・滾輪前後　|　點擊門片與飲水機互動',
    tour: '自動導覽中　|　任何操作可接手　|　點擊「漫遊」自由走動',
  };
  const syncMode = () => {
    const m = nav.tour.on ? 'tour' : nav.mode;
    setSeg(modeSeg, 'mode', m);
    $('#hint-text').textContent = hints[m];
    $('#joystick').hidden = !(matchMedia('(pointer: coarse)').matches);
    $('#btn-ceiling').disabled = m !== 'orbit';
    $('#btn-ceiling').style.opacity = m === 'orbit' ? 1 : .4;
  };
  nav.addEventListener('mode', syncMode); nav.addEventListener('tour', syncMode);
  nav.addEventListener('wantwalk', () => { if (nav.mode === 'orbit') nav.goTo(VIEWS.find((v) => v.key === 'entry')); });

  // ------------------------------------------------------------------------- time / lights / ceiling / quality
  const timeSeg = $('#time-seg'), lightsBtn = $('#btn-lights');
  const syncLights = () => lightsBtn.setAttribute('aria-pressed', String(lighting.lightsOn));
  timeSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    lighting.setTime(b.dataset.time); setSeg(timeSeg, 'time', b.dataset.time); syncLights();
  });
  lightsBtn.addEventListener('click', () => { lighting.setLights(!lighting.lightsOn); syncLights(); });
  const dimsBtn = $('#btn-dims'), dimsEl = $('#dims');
  const dimLabels = app.dims.labels.map((l) => { const d = document.createElement('div'); d.className = 'dim'; d.textContent = l.text; dimsEl.appendChild(d); return { d, ...l }; });
  dimsEl.style.display = 'none';
  dimsBtn.addEventListener('click', () => {
    const on = dimsBtn.getAttribute('aria-pressed') !== 'true';
    dimsBtn.setAttribute('aria-pressed', String(on)); app.dims.group.visible = on; dimsEl.style.display = on ? '' : 'none';
  });
  const curtainBtn = $('#btn-curtain');
  curtainBtn.addEventListener('click', () => app.curtains.toggle());
  app.curtains.onChange = (closed) => { curtainBtn.setAttribute('aria-pressed', String(closed)); curtainBtn.textContent = closed ? '窗簾（已拉上）' : '窗簾'; };
  $('#btn-ceiling').addEventListener('click', (e) => {
    ui.showCeiling = !ui.showCeiling; e.currentTarget.setAttribute('aria-pressed', String(ui.showCeiling)); app.showCeiling = ui.showCeiling;
  });
  const sel = $('#sel-quality'); sel.value = app.qKey;
  sel.addEventListener('change', () => app.applyQuality(sel.value));
  $('#btn-help').addEventListener('click', () => $('#help').showModal());
  setSeg(timeSeg, 'time', lighting.time); syncLights();
  lighting.onChange = () => { syncLights(); app.refreshLamps?.(); };

  // ------------------------------------------------------------------------- view list
  const list = $('#view-list');
  VIEWS.forEach((v) => {
    const li = document.createElement('li'); if (v.key === 'dispenser' || v.key === 'plumbing') li.className = 'feature';
    li.innerHTML = `<button data-key="${v.key}"><span class="ic">${v.icon}</span><span>${v.name}</span></button>`;
    list.appendChild(li);
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (nav.tour.on) nav.stopTour();
    nav.goTo(VIEWS.find((v) => v.key === b.dataset.key));
  });
  const caption = $('#caption');
  nav.addEventListener('view', (e) => {
    const v = e.detail;
    $$('button', list).forEach((b) => b.classList.toggle('on', b.dataset.key === v.key));
    $('#caption-title').textContent = v.name; $('#caption-text').textContent = v.text; caption.hidden = false;
    $('#room-name').textContent = '';
    if (v.key === 'plumbing') { setXray(true); panel.open(); ui.autoXray = true; }
    else {
      if (ui.autoXray && disp.state.xray) setXray(false);
      ui.autoXray = false;
      if (v.key === 'dispenser') panel.open(); else if (panel.el.hidden === false && !panel.pinned) panel.close();
    }
  });
  // recommended sofa colour options
  const sofaColors = { oat: 0xcdbfa8, olive: 0x56613f, charcoal: 0x4f5054 };
  $('#sofa-colors').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    app.M.sofaFabric.color.setHex(sofaColors[b.dataset.c]);
    $$('#sofa-colors button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });
  // per-room light switches
  const rl = $('#room-lights');
  ROOMS.forEach((r) => {
    const l = document.createElement('label');
    l.innerHTML = `<input type="checkbox" checked data-room="${r.id}"> ${r.name}`; rl.appendChild(l);
  });
  rl.addEventListener('change', (e) => { const c = e.target; lighting.setRoom(+c.dataset.room, c.checked); });

  // ------------------------------------------------------------------------- dispenser panel
  const el = $('#dispenser-panel');
  const panel = ui.panel = {
    el, pinned: false,
    open() { el.hidden = false; document.body.classList.add('panel-open'); },
    close() { el.hidden = true; panel.pinned = false; document.body.classList.remove('panel-open'); },
  };
  if (matchMedia('(max-width: 900px)').matches) el.classList.add('folded');
  $('#dp-fold').addEventListener('click', () => el.classList.toggle('folded'));
  $('#dp-close').addEventListener('click', () => panel.close());
  const btns = $('#dp-buttons');
  let hold = null;
  const release = () => {
    if (!hold) return;
    const quick = performance.now() - hold.t < 320;
    if (quick) { disp.state.autoStopAt = Math.max(0.25, disp.state.cupVol + 0.02); } else disp.stop();
    $$('button', btns).forEach((b) => b.classList.remove('active'));
    hold = null;
  };
  ui.pressDispense = (k) => { if (disp.start(k)) { hold = { t: performance.now(), k }; $(`[data-k="${k}"]`, btns).classList.add('active'); return true; } return false; };
  ui.releaseDispense = release;
  btns.addEventListener('pointerdown', (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return; e.preventDefault(); b.setPointerCapture(e.pointerId); ui.pressDispense(b.dataset.k); });
  btns.addEventListener('pointerup', release); btns.addEventListener('pointercancel', release);
  btns.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { const b = e.target.closest('button'); if (b) { disp.dispenseOnce(b.dataset.k); e.preventDefault(); } } });
  $('#dp-model').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    disp.setModel(b.dataset.model); setSeg($('#dp-model'), 'model', b.dataset.model);
    $('#dp-model-name').textContent = b.dataset.model === 'AW' ? '賀眾牌 UW-672AW-1 桌上冰溫熱' : '賀眾牌 UR-672BW-1 桌上溫熱';
    $('#dp-power').textContent = b.dataset.model === 'AW' ? '880 W・110 V' : '750 W・110 V';
    $('#dp-cold-spec').style.display = b.dataset.model === 'AW' ? '' : 'none';
  });
  const xrayBtn = $('#dp-xray'), cutBtn = $('#dp-cut');
  const setXray = (on) => { disp.setXray(on); xrayBtn.setAttribute('aria-pressed', String(on)); labelsEl.style.display = on ? '' : 'none'; if (on) panel.open(); };
  xrayBtn.addEventListener('click', () => setXray(!disp.state.xray));
  cutBtn.addEventListener('click', () => { disp.setCutaway(!disp.state.cutaway); cutBtn.setAttribute('aria-pressed', String(disp.state.cutaway)); });
  ui.setXray = setXray;

  const liters = (v, cap) => `${v.toFixed(2)} / ${cap.toFixed(1)} L`;
  disp.onChange((st) => {
    $('#t-hot-temp').textContent = `${Math.round(st.tanks.hot.temp)}°C`; $('#t-warm-temp').textContent = `${Math.round(st.tanks.warm.temp)}°C`; $('#t-cold-temp').textContent = `${Math.round(st.tanks.cold.temp)}°C`;
    $('#t-hot-l').textContent = liters(st.tanks.hot.level, 3.5); $('#t-warm-l').textContent = liters(st.tanks.warm.level, 2.0); $('#t-cold-l').textContent = liters(st.tanks.cold.level, 1.1);
    for (const k of ['hot', 'warm', 'cold']) { const cap = { hot: 3.5, warm: 2, cold: 1.1 }[k]; $(`.tank[data-t="${k}"] .bar i`).style.width = `${Math.max(0, Math.min(100, st.tanks[k].level / cap * 100))}%`; }
    $('.tank[data-t="hot"]').classList.toggle('heating', st.heating);
    $('#tank-cold').classList.toggle('off', st.model === 'BW');
    $('.b-cold').disabled = st.model === 'BW';
    $('#dp-valve').classList.toggle('open', st.valveOpen);
    $('#dp-valve-text').textContent = st.valveOpen ? '進水閥：自動進水中' : '進水閥：關閉（水位正常）';
    $('#dp-msg').textContent = st.message;
  });

  // ------------------------------------------------------------------------- 3D anchored labels (水線)
  const labelsEl = $('#labels'); labelsEl.style.display = 'none';
  const lbls = disp.labels.map((l) => { const d = document.createElement('div'); d.className = 'lbl'; d.textContent = l.text; labelsEl.appendChild(d); return { d, v: P(...l.pos), dy: l.dy || 0 }; });
  const tmp = new THREE.Vector3();

  // ------------------------------------------------------------------------- minimap
  const mm = $('#minimap'), mctx = mm.getContext('2d');
  const X0 = -215, X1 = 945, Y0 = -105, Y1 = 615, S = mm.width / (X1 - X0);
  mm.height = Math.round((Y1 - Y0) * S);
  const base = document.createElement('canvas'); base.width = mm.width; base.height = mm.height;
  (() => {
    const g = base.getContext('2d');
    const tx = (x) => (x - X0) * S, ty = (y) => (y - Y0) * S;
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, base.width, base.height);
    ROOMS.forEach((r) => { g.fillStyle = r.key === 'balcony' ? 'rgba(160,190,200,.28)' : 'rgba(232,238,240,.82)'; r.rects.forEach(([a, b, c, d]) => g.fillRect(tx(a), ty(b), (c - a) * S, (d - b) * S)); });
    g.fillStyle = '#3a4a52'; app.arch.wallRects.forEach(([a, b, c, d]) => g.fillRect(tx(a), ty(b), Math.max(1, (c - a) * S), Math.max(1, (d - b) * S)));
    g.fillStyle = '#5a6a72'; g.font = '600 12px system-ui, "Noto Sans TC", sans-serif'; g.textAlign = 'center';
    const lab = { bedroom: [47, 240], living: [450, 190], kitchen: [125, 470], study: [735, 95], bath: [760, 440], balcony: [-105, 460] };
    ROOMS.forEach((r) => { const p = lab[r.key]; if (p) g.fillText(r.name.split('・')[0], tx(p[0]), ty(p[1])); });
    // dispenser marker
    g.fillStyle = '#2f87e0'; g.beginPath(); g.arc(tx(140), ty(372), 4, 0, 7); g.fill();
  })();
  let mmT = 0;
  ui.updateMinimap = (dt) => {
    mmT -= dt; if (mmT > 0) return; mmT = 0.05;
    mctx.clearRect(0, 0, mm.width, mm.height); mctx.drawImage(base, 0, 0);
    const cam = app.camera;
    const x = cam.position.x / CM, y = cam.position.z / CM;
    const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
    const yaw = Math.atan2(dir.z, dir.x), fov = THREE.MathUtils.degToRad(cam.fov * Math.min(1.7, cam.aspect));
    const px = (x - X0) * S, py = (y - Y0) * S;
    mctx.fillStyle = 'rgba(84,182,196,.32)'; mctx.beginPath(); mctx.moveTo(px, py); mctx.arc(px, py, 46, yaw - fov / 2, yaw + fov / 2); mctx.closePath(); mctx.fill();
    mctx.fillStyle = '#e0482c'; mctx.beginPath(); mctx.arc(px, py, 5, 0, 7); mctx.fill(); mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5; mctx.stroke();
  };
  mm.addEventListener('pointerdown', (e) => {
    const r = mm.getBoundingClientRect();
    const x = X0 + ((e.clientX - r.left) / r.width) * (X1 - X0), y = Y0 + ((e.clientY - r.top) / r.height) * (Y1 - Y0);
    const yaw = nav.walk.yaw;
    nav.goTo({ key: 'custom', name: '自選位置', text: '', mode: 'walk', pos: [x, y, 160], target: [x + Math.cos(yaw) * 100, y + Math.sin(yaw) * 100, 140] }, { fly: false });
  });

  // ------------------------------------------------------------------------- per-frame
  const dtmp = new THREE.Vector3();
  ui.update = (dt) => {
    ui.updateMinimap(dt);
    if (app.dims.group.visible) {
      const w = innerWidth, h = innerHeight;
      dimLabels.forEach((l) => {
        dtmp.copy(l.pos).project(app.camera);
        const dist = app.camera.position.distanceTo(l.pos);
        const ok = dtmp.z < 1 && Math.abs(dtmp.x) < 1.05 && Math.abs(dtmp.y) < 1.05 && (app.nav.mode === 'orbit' || dist < 7);
        l.d.style.display = ok ? '' : 'none';
        l.d.style.left = `${(dtmp.x * 0.5 + 0.5) * w}px`; l.d.style.top = `${(-dtmp.y * 0.5 + 0.5) * h}px`;
      });
    }
    if (disp.state.xray) {
      const w = innerWidth, h = innerHeight;
      lbls.forEach((l) => {
        tmp.copy(l.v).project(app.camera);
        const ok = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
        l.d.style.display = ok ? '' : 'none';
        l.d.style.left = `${(tmp.x * 0.5 + 0.5) * w}px`; l.d.style.top = `${(-tmp.y * 0.5 + 0.5) * h + l.dy}px`;
      });
    }
    if (nav.mode !== 'orbit') { const n = nav.roomName(); if (n && $('#room-name').textContent !== n) $('#room-name').textContent = n; }
  };

  syncMode();
  return ui;
}
