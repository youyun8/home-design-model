import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CM, P, roomAt } from './core.js';
import { VIEWS, ROOMS } from './data.js';

const TAU = Math.PI * 2;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrapAngle = (a) => { a = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a; };
const EYE = 160, RADIUS = 17;
const BOUNDS = { x0: -188, x1: 910, y0: 8, y1: 580 };

/**
 * Camera rig with three modes:
 *   orbit — dollhouse / free orbit around the apartment
 *   walk  — first-person walk-through (WASD / drag / touch joystick) with wall collision
 *   tour  — scripted camera path through all preset views
 */
export class Navigator extends EventTarget {
  constructor({ camera, canvas, app }) {
    super();
    this.camera = camera; this.canvas = canvas; this.app = app;
    this.mode = 'orbit';
    this.walk = { x: 520, y: 575, eye: EYE, yaw: -Math.PI / 2, pitch: 0, floor: 0 };
    this.keys = new Set();
    this.joy = { x: 0, y: 0 };
    this.tween = null;
    this.tour = { on: false, i: 0, t: 0, phase: 'hold' };
    this.currentView = VIEWS[0];
    this.fade = document.getElementById('fade');

    const c = this.controls = new OrbitControls(camera, canvas);
    c.enableDamping = true; c.dampingFactor = 0.08;
    c.minDistance = 1.2; c.maxDistance = 24;
    c.maxPolarAngle = Math.PI * 0.495;
    c.minPolarAngle = 0.05;
    c.screenSpacePanning = false;
    c.zoomToCursor = true;
    c.addEventListener('start', () => { if (this.tour.on) this.stopTour(); });

    this._bindInput();
  }

  // ---------------------------------------------------------------------------------- helpers
  get pos() { return new THREE.Vector2(this.walk.x, this.walk.y); }

  blocked(x, y, r = RADIUS) {
    const rects = this.app.arch.colliders;
    for (const q of rects) {
      if (x > q[0] - r && x < q[2] + r && y > q[1] - r && y < q[3] + r) {
        const cx = Math.max(q[0], Math.min(x, q[2])), cy = Math.max(q[1], Math.min(y, q[3]));
        if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
      }
    }
    for (const d of this.app.arch.doors) {
      if (d.collider && d.t < 0.55) {
        const q = d.collider;
        if (x > q[0] - r && x < q[2] + r && y > q[1] - r && y < q[3] + r) {
          const cx = Math.max(q[0], Math.min(x, q[2])), cy = Math.max(q[1], Math.min(y, q[3]));
          if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
        }
      }
    }
    return false;
  }

  /** Slides the position along walls. */
  moveTo(nx, ny) {
    const w = this.walk;
    nx = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, nx)); ny = Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, ny));
    if (!this.blocked(nx, ny)) { w.x = nx; w.y = ny; return; }
    if (!this.blocked(nx, w.y)) { w.x = nx; return; }
    if (!this.blocked(w.x, ny)) { w.y = ny; }
  }

  floorAt(x, y) { return x > 612 && x < 862 && y < 357 ? 14 : 0; }

  pathClear(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (this.blocked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 11)) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------------- modes
  setMode(mode, { silent = false } = {}) {
    if (this.mode === mode) return;
    const prev = this.mode;
    this.mode = mode;
    this.app.mode = mode === 'tour' ? 'walk' : mode;
    this.controls.enabled = mode === 'orbit';
    this.baseFov = mode === 'orbit' ? 48 : 68;
    this.applyFov();
    if (mode !== 'orbit' && prev === 'orbit') this.camera.up.set(0, 1, 0);
    if (!silent) this.dispatchEvent(new CustomEvent('mode', { detail: mode }));
  }

  /** Portrait screens get a wider vertical field of view so the room is not cropped. */
  applyFov() {
    const a = this.camera.aspect, base = this.baseFov || 48;
    this.camera.fov = a < 1 ? Math.min(base + (1 - a) * 62, 96) : base;
    this.camera.updateProjectionMatrix();
  }

  _fadeCut(fn) {
    if (!this.fade) { fn(); return; }
    this.fade.classList.add('on');
    setTimeout(() => { fn(); requestAnimationFrame(() => setTimeout(() => this.fade.classList.remove('on'), 60)); }, 260);
  }

  /** Jump to a preset view (sidebar / tour / URL). */
  goTo(view, { instant = false, fly = true } = {}) {
    this.currentView = view;
    this.dispatchEvent(new CustomEvent('view', { detail: view }));
    if (view.mode === 'orbit') {
      const apply = () => {
        this.setMode('orbit');
        this.camera.position.copy(P(...view.pos));
        this.controls.target.copy(P(...view.target));
        this.controls.update();
      };
      if (instant) apply(); else if (this.mode === 'orbit') this._tweenOrbit(view); else this._fadeCut(apply);
      return;
    }
    const goal = this._viewToWalk(view);
    if (this.mode === 'orbit' || instant) {
      const apply = () => { this.setMode('walk'); Object.assign(this.walk, goal); this.walk.floor = this.floorAt(goal.x, goal.y); this.applyWalk(); };
      if (instant) apply(); else this._fadeCut(apply);
      return;
    }
    if (this.mode === 'tour') this.setMode('walk', { silent: true });
    if (fly && this.pathClear(this.walk, goal)) this._tweenWalk(goal, 1.8);
    else this._fadeCut(() => { Object.assign(this.walk, goal); this.walk.floor = this.floorAt(goal.x, goal.y); this.applyWalk(); });
  }

  _viewToWalk(view) {
    const [x, y, z] = view.pos, [tx, ty, tz] = view.target;
    const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
    return { x, y, eye: z, yaw: Math.atan2(dy, dx), pitch: Math.atan2(tz - z, d) };
  }

  _tweenWalk(goal, dur = 1.6, done) {
    const w = this.walk, from = { ...w };
    this.tween = { t: 0, dur, update: (k) => {
      w.x = from.x + (goal.x - from.x) * k; w.y = from.y + (goal.y - from.y) * k;
      w.eye = from.eye + (goal.eye - from.eye) * k;
      w.yaw = from.yaw + wrapAngle(goal.yaw - from.yaw) * k;
      w.pitch = from.pitch + (goal.pitch - from.pitch) * k;
    }, done };
  }

  _tweenOrbit(view) {
    const c = this.camera, ct = this.controls;
    const p0 = c.position.clone(), t0 = ct.target.clone(), p1 = P(...view.pos), t1 = P(...view.target);
    this.tween = { t: 0, dur: 1.6, update: (k) => { c.position.lerpVectors(p0, p1, k); ct.target.lerpVectors(t0, t1, k); ct.update(); } };
  }

  applyWalk() {
    const w = this.walk, c = this.camera;
    const target = this.floorAt(w.x, w.y);
    w.floor += (target - w.floor) * 0.2;
    c.position.set(w.x * CM, (w.floor + w.eye) * CM, w.y * CM);
    const cp = Math.cos(w.pitch);
    c.lookAt(c.position.x + Math.cos(w.yaw) * cp, c.position.y + Math.sin(w.pitch), c.position.z + Math.sin(w.yaw) * cp);
  }

  // ---------------------------------------------------------------------------------- tour
  startTour() {
    this.setMode('tour');
    this.tour = { on: true, i: -1, t: 0, phase: 'hold' };
    this.tourViews = VIEWS.filter((v) => v.mode === 'walk');
    this._nextTourStop();
    this.dispatchEvent(new CustomEvent('tour', { detail: true }));
  }

  stopTour() {
    if (!this.tour.on) return;
    this.tour.on = false;
    this.setMode('walk');
    this.dispatchEvent(new CustomEvent('tour', { detail: false }));
  }

  _nextTourStop() {
    const list = this.tourViews;
    this.tour.i = (this.tour.i + 1) % list.length;
    const v = list[this.tour.i];
    this.currentView = v;
    this.dispatchEvent(new CustomEvent('view', { detail: v }));
    const goal = this._viewToWalk(v);
    this.tour.phase = 'move'; this.tour.t = 0;
    if (this.tour.i === 0 || !this.pathClear(this.walk, goal)) {
      this._fadeCut(() => { Object.assign(this.walk, goal); this.walk.floor = this.floorAt(goal.x, goal.y); this.tour.phase = 'hold'; this.tour.t = 0; this.tour.base = { ...goal }; });
    } else {
      this._tweenWalk(goal, 2.6, () => { this.tour.phase = 'hold'; this.tour.t = 0; this.tour.base = { ...goal }; });
    }
  }

  // ---------------------------------------------------------------------------------- update
  update(dt) {
    if (this.tween) {
      const tw = this.tween; tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.update(ease(k));
      if (k >= 1) { const d = tw.done; this.tween = null; d && d(); }
    }
    if (this.mode === 'orbit') {
      if (!this.tween) this.controls.update();
      return;
    }
    const w = this.walk;
    if (this.mode === 'tour' && this.tour.on) {
      if (this.tour.phase === 'hold' && this.tour.base && !this.tween) {
        this.tour.t += dt;
        const b = this.tour.base, s = Math.sin(this.tour.t * 0.45);
        w.yaw = b.yaw + s * 0.16; w.pitch = b.pitch + Math.sin(this.tour.t * 0.3) * 0.02;
        // slow dolly forward
        const fx = Math.cos(b.yaw), fy = Math.sin(b.yaw), k = Math.min(1, this.tour.t / 6) * 26;
        const nx = b.x + fx * k, ny = b.y + fy * k;
        if (!this.blocked(nx, ny, 14)) { w.x = nx; w.y = ny; }
        if (this.tour.t > 6.2) this._nextTourStop();
      }
      this.applyWalk();
      return;
    }
    // manual walking
    const k = this.keys, run = k.has('shift') ? 2.1 : 1;
    let f = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0) - this.joy.y;
    let s = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0) + this.joy.x;
    const turn = (k.has('arrowright') ? 1 : 0) - (k.has('arrowleft') ? 1 : 0) + (k.has('e') ? 1 : 0) - (k.has('q') ? 1 : 0);
    if (turn) w.yaw += turn * dt * 1.6;
    if ((f || s) && !this.tween) {
      const sp = 150 * run * dt, len = Math.hypot(f, s) || 1;
      f /= len; s /= len;
      this.moveTo(w.x + (Math.cos(w.yaw) * f - Math.sin(w.yaw) * s) * sp, w.y + (Math.sin(w.yaw) * f + Math.cos(w.yaw) * s) * sp);
    }
    this.applyWalk();
  }

  // ---------------------------------------------------------------------------------- input
  _bindInput() {
    const cv = this.canvas;
    addEventListener('keydown', (e) => {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        this.keys.add(key);
        if (this.mode === 'orbit' && ['w', 'a', 's', 'd'].includes(key)) this.dispatchEvent(new CustomEvent('wantwalk'));
        if (this.tour.on && key !== 'shift') this.stopTour();
        if (key.startsWith('arrow')) e.preventDefault();
      }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());

    // drag to look (walk / tour)
    let drag = null;
    cv.addEventListener('pointerdown', (e) => {
      if (this.mode === 'orbit' || (e.pointerType === 'touch' && this._joyActive(e))) return;
      if (this.app.pressedButton) return;
      drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 4 && this.tour.on) this.stopTour();
      if (this.tween && drag.moved > 4) this.tween = null;
      const w = this.walk;
      w.yaw += dx * 0.0042; w.pitch = Math.max(-1.25, Math.min(1.25, w.pitch - dy * 0.0036));
    });
    const end = (e) => { if (drag && e.pointerId === drag.id) { this.lastDragMoved = drag.moved; drag = null; } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', (e) => {
      if (this.mode === 'orbit') return;
      e.preventDefault();
      if (this.tour.on) this.stopTour();
      const w = this.walk, d = -Math.sign(e.deltaY) * 28;
      this.moveTo(w.x + Math.cos(w.yaw) * d, w.y + Math.sin(w.yaw) * d);
    }, { passive: false });
  }

  _joyActive() { return this.joyTouchId != null; }

  /** Virtual joystick (touch). `el` is the pad element. */
  bindJoystick(el) {
    const knob = el.querySelector('i');
    const set = (x, y) => { this.joy.x = x; this.joy.y = y; knob.style.transform = `translate(${x * 34}px, ${y * 34}px)`; };
    const calc = (e) => {
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let x = (e.clientX - cx) / (r.width / 2), y = (e.clientY - cy) / (r.height / 2);
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      set(x, y);
    };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); this.joyTouchId = e.pointerId; if (this.mode === 'orbit') this.dispatchEvent(new CustomEvent('wantwalk')); calc(e); });
    el.addEventListener('pointermove', (e) => { if (this.joyTouchId === e.pointerId) calc(e); });
    const up = (e) => { if (this.joyTouchId === e.pointerId) { this.joyTouchId = null; set(0, 0); } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }

  roomName() {
    const id = roomAt(this.walk.x, this.walk.y, 8);
    return (ROOMS.find((r) => r.id === id) || {}).name || '';
  }
}
