import * as THREE from 'three';
import { CM, cbox } from './core.js';
import * as T from './textures.js';

// ---------------------------------------------------------------------------------------------
// Window treatments (all blackout capable)
//   Floor-length sliding windows (bedroom, living): wave-fold (蛇形) double curtain on a double track.
//     room side: 100% blackout drape (opaque), window side: sheer. The track sits just above the
//     window head and the drape overlaps the opening by 10-15 cm per side, so no light leaks.
//   Study window (143 cm): cordless blackout honeycomb (蜂巢簾) in side channels, raised or lowered.
// `closed` = 0 → blackout drawn to the sides / honeycomb raised, 1 → fully closed.
// ---------------------------------------------------------------------------------------------

const ease = (t) => t * t * (3 - 2 * t);

/** Plane in local XY (x along the curtain, y up), waves in local Z. anchor 'L' → x in 0..w, 'R' → x in -w..0. */
function wavePlane({ w, h, amp, pitch, anchor, uvCm = 25 }) {
  const segX = Math.max(8, Math.ceil(w / (pitch / 7)));
  const geo = new THREE.PlaneGeometry(w * CM, h * CM, segX, 1);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const xl = pos.getX(i) / CM + w / 2;                       // 0..w from the anchor end (L) / free end (R)
    const xs = anchor === 'L' ? xl : xl - w;
    const yl = pos.getY(i) / CM + h / 2;
    pos.setXYZ(i, xs * CM, yl * CM, Math.sin((xl / pitch) * Math.PI * 2) * amp * CM);
    uv.setXY(i, xl / uvCm, yl / uvCm);
  }
  geo.computeVertexNormals();
  return geo;
}

function drapeMaterials(M) {
  if (M.drapeBlackout) return;
  const tex = (base, seed) => { const f = T.fabric({ base, seed }); f.map.repeat.set(1, 1); f.bump.repeat.set(1, 1); return f; };
  const b = tex([176, 164, 150], 3);
  M.drapeBlackout = new THREE.MeshStandardMaterial({ map: b.map, bumpMap: b.bump, bumpScale: 1.4, color: 0xffffff, roughness: 0.96, side: THREE.DoubleSide, envMapIntensity: 0.5 });
  const s = tex([236, 232, 224], 6);
  M.drapeSheer = new THREE.MeshStandardMaterial({ map: s.map, color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.95, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.6 });
  const h = tex([226, 220, 208], 9);
  M.honeycomb = new THREE.MeshStandardMaterial({ map: h.map, color: 0xffffff, roughness: 0.92, side: THREE.DoubleSide, envMapIntensity: 0.4 });
  M.trackWhite = new THREE.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.4, metalness: 0.2 });
}

/**
 * @param spec { id, name, axis:'x'|'y', range:[lo,hi] (curtain coverage along the wall), c (distance of the
 *   wall face on the other axis), zTop, zBottom, kind:'wave'|'honeycomb', sheer:boolean }
 */
function buildOne(M, spec) {
  const g = new THREE.Group();
  g.name = `curtain-${spec.id}`;
  g.userData.dynamic = true;
  const { axis, range: [lo, hi], c, zTop, zBottom, kind } = spec;
  const R = hi - lo;
  const place = (obj, u, z, off) => {
    if (axis === 'x') obj.position.set(u * CM, z * CM, (c + off) * CM);
    else { obj.position.set((c + off) * CM, z * CM, u * CM); obj.rotation.y = -Math.PI / 2; }
  };
  const clickable = [];
  const anim = [];

  if (kind === 'wave') {
    const h = zTop - zBottom;
    // track (double) just above the fabric
    const track = axis === 'x' ? cbox(R + 4, 11, 3.2, M.trackWhite) : cbox(11, R + 4, 3.2, M.trackWhite);
    track.position.set(axis === 'x' ? ((lo + hi) / 2) * CM : (c + 5.5) * CM, (zTop + 1.6) * CM, axis === 'x' ? (c + 5.5) * CM : ((lo + hi) / 2) * CM);
    track.castShadow = false; g.add(track);

    // sheer: full width, always drawn (window side)
    if (spec.sheer !== false) {
      const geoS = wavePlane({ w: R, h, amp: 1.6, pitch: 10, anchor: 'L' });
      const sh = new THREE.Mesh(geoS, M.drapeSheer);
      place(sh, lo, zBottom, 3.2); sh.castShadow = false; sh.receiveShadow = true; sh.renderOrder = 6;
      g.add(sh);
    }
    // blackout drape: two panels, each anchored at its wall end
    const half = R / 2 + 7, stack = Math.min(70, Math.max(36, R * 0.2));
    const left = new THREE.Mesh(wavePlane({ w: half, h, amp: 3, pitch: 14, anchor: 'L' }), M.drapeBlackout);
    const right = new THREE.Mesh(wavePlane({ w: half, h, amp: 3, pitch: 14, anchor: 'R' }), M.drapeBlackout);
    [left, right].forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.userData.curtain = true; g.add(m); clickable.push(m); });
    place(left, lo, zBottom, 9.2); place(right, hi, zBottom, 9.2);
    const s0 = stack / half;
    anim.push((k) => { const sx = THREE.MathUtils.lerp(s0, 1, k); left.scale.x = sx; right.scale.x = sx; });
    anim.forEach((f) => f(0));
  } else {
    // honeycomb shade: head rail on top, shade hangs from it; raised = compressed under the rail
    const h = zTop - zBottom, w = R;
    const geo = new THREE.PlaneGeometry(w * CM, h * CM, 2, Math.ceil(h / 1.3));
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const yl = pos.getY(i) / CM;                                // -h/2..h/2
      const cell = (yl + h / 2) / 2.6;
      const tri = Math.abs((cell % 1) - 0.5) * 2;                  // 0..1 triangle wave (cell height 26 mm)
      pos.setXYZ(i, pos.getX(i), (yl - h / 2) * CM, tri * 0.45 * CM);   // y from -h..0, hangs below the rail
      uv.setXY(i, (pos.getX(i) / CM + w / 2) / 25, (yl + h / 2) / 25);
    }
    geo.computeVertexNormals();
    const shade = new THREE.Mesh(geo, M.honeycomb);
    shade.castShadow = true; shade.receiveShadow = true; shade.userData.curtain = true;
    place(shade, (lo + hi) / 2, zTop, 1.6);
    g.add(shade); clickable.push(shade);
    const rail = axis === 'x' ? cbox(w + 1, 5.4, 5, M.trackWhite) : cbox(5.4, w + 1, 5, M.trackWhite);
    rail.position.set(axis === 'x' ? ((lo + hi) / 2) * CM : (c + 2.7) * CM, (zTop + 2.5) * CM, axis === 'x' ? (c + 2.7) * CM : ((lo + hi) / 2) * CM);
    rail.castShadow = true; g.add(rail);
    // built along local x; place() rotates it onto side walls (axis 'y') together with the shade itself
    const bottom = cbox(w - 0.6, 2.6, 1.8, M.trackWhite);
    place(bottom, (lo + hi) / 2, zTop, 1.8); g.add(bottom);
    // two thin side channels
    [lo - 0.2, hi - 1.0].forEach((u) => {
      const ch = axis === 'x' ? cbox(1.2, 2.6, h, M.trackWhite) : cbox(2.6, 1.2, h, M.trackWhite);
      ch.position.set(axis === 'x' ? (u + 0.6) * CM : (c + 1.6) * CM, ((zTop + zBottom) / 2) * CM, axis === 'x' ? (c + 1.6) * CM : (u + 0.6) * CM);
      g.add(ch);
    });
    const raised = 0.045;
    anim.push((k) => { const sy = THREE.MathUtils.lerp(raised, 1, k); shade.scale.y = sy; bottom.position.y = (zTop - h * sy) * CM - 0.9 * CM; });
    anim.forEach((f) => f(0));
  }
  return { group: g, clickable, anim, spec };
}

export const CURTAIN_SPECS = [
  // bedroom north window 274 cm, floor length
  { id: 'bed-n', name: '主臥・落地窗', axis: 'x', range: [-156, 137], c: 0, zTop: 242, zBottom: 1.5, kind: 'wave', parent: 'N' },
  // bedroom west window 126 cm: slim blackout honeycomb (5 cm deep) so the bed can sit close to it
  { id: 'bed-w', name: '主臥・側窗', axis: 'y', range: [60, 194], c: -157, zTop: 241, zBottom: 2, kind: 'honeycomb', parent: 'W' },
  // living north window 316 cm, below the A/C unit
  { id: 'liv-n', name: '客廳・落地窗', axis: 'x', range: [262.5, 597], c: 0, zTop: 214, zBottom: 1.5, kind: 'wave', parent: 'N' },
  // study north window 143 cm
  { id: 'study-n', name: '書房・窗', axis: 'x', range: [711, 861], c: 0, zTop: 231, zBottom: 15, kind: 'honeycomb', parent: 'N' },
];

export function buildCurtains(M, arch) {
  drapeMaterials(M);
  const items = CURTAIN_SPECS.map((spec) => {
    const s = { ...spec };
    // the west window curtain hangs in front of the west wall (interior face at x = -157, room to the east)
    if (spec.axis === 'y') s.c = spec.c + 0;
    const it = buildOne(M, s);
    (arch.groups[spec.parent] || arch.root).add(it.group);
    return it;
  });
  const api = {
    items, closed: false, t: 0, target: 0,
    clickable: items.flatMap((i) => i.clickable),
    setClosed(on) { api.closed = !!on; api.target = on ? 1 : 0; api.onChange?.(api.closed); },
    toggle() { api.setClosed(!api.closed); },
    update(dt) {
      if (Math.abs(api.t - api.target) < 1e-4) return;
      const dir = Math.sign(api.target - api.t);
      api.t = THREE.MathUtils.clamp(api.t + dir * dt / 1.8, 0, 1);
      if ((dir > 0 && api.t > api.target) || (dir < 0 && api.t < api.target)) api.t = api.target;
      const k = ease(api.t);
      items.forEach((i) => i.anim.forEach((f) => f(k)));
      api.onProgress?.(k);
    },
  };
  return api;
}
