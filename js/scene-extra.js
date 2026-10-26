import * as THREE from 'three';
import { addExtraMaterials } from './furn-common.js';
import { buildBedroom } from './furn-bedroom.js';
import { buildLiving } from './furn-living.js';
import { buildStudy } from './furn-study.js';
import { buildKitchen, buildBath, buildBalcony } from './furn-rooms-b.js';
import { addDecorMaterials } from './decor.js';
import { buildDispenserSystem } from './dispenser.js';

/** Adds furniture, cabinetry and the water dispenser system to the scene. */
export default async function addExtras(app, progress) {
  const { M, scene, arch } = app;
  addExtraMaterials(M);
  addDecorMaterials(M);
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const ctx = { colliders: arch.colliders, lamps: [], tv: null };
  const furniture = new THREE.Group();
  furniture.name = 'furniture';
  scene.add(furniture);
  const rooms = {};
  const list = [
    ['主臥', 'bedroom', buildBedroom], ['客廳與玄關', 'living', buildLiving], ['廚房', 'kitchen', buildKitchen],
    ['書房', 'study', buildStudy], ['衛浴', 'bath', buildBath], ['後陽台', 'balcony', buildBalcony],
  ];
  for (let i = 0; i < list.length; i++) {
    const [label, key, fn] = list[i];
    progress(label, 0.9 + (i / list.length) * 0.08);
    await tick();
    rooms[key] = fn(M, ctx);
    furniture.add(rooms[key]);
  }
  progress('飲水機與水線', 0.98);
  await tick();
  const disp = buildDispenserSystem(M, ctx, arch.helpers);
  rooms.kitchen.add(disp.staticGroup);
  scene.add(disp.dynGroup);
  app.furniture = { root: furniture, rooms };
  app.dispenser = disp.api;
  app.lamps = ctx.lamps;
  app.tv = ctx.tv;
}
