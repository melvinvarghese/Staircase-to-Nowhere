import { SCENES, START_SCENE, doorPosition, getScene } from './world.js';

const PLAYER_RADIUS = 0.22;
const WALK_SPEED = 3.2;
const MAX_DT = 0.1;
const EYE_LEVEL = 1.62;
const TARGET_RANGE = 3.35;
const TARGET_CONE = 0.48;

const doorKey = (sceneId, id) => `${sceneId}:${id}`;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function createState() {
  const scene = SCENES[START_SCENE];
  return {
    sceneId: START_SCENE,
    player: { x: scene.spawn.x, z: scene.spawn.z, yaw: scene.spawn.yaw, pitch: 0 },
    visits: { [START_SCENE]: 1 },
    openDoors: {},
    clues: []
  };
}

function activeScene(state) {
  return getScene(state?.sceneId, state?.visits?.[state?.sceneId] ?? 1) ?? SCENES[START_SCENE];
}

function isSolidCollision(scene, x, z) {
  for (const object of scene.objects ?? []) {
    if (!object.solid) continue;
    const closestX = clamp(x, object.x - object.w / 2, object.x + object.w / 2);
    const closestZ = clamp(z, object.z - object.d / 2, object.z + object.d / 2);
    const dx = x - closestX, dz = z - closestZ;
    if (dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS - 1e-8) return true;
  }
  return false;
}

function rampElevation(scene, x, z) {
  const stairs = scene.stairs;
  if (!stairs || Math.abs(x - stairs.x) > stairs.width / 2 || z < stairs.z || z > stairs.z + stairs.length) return 0;
  return stairs.rise * clamp((z - stairs.z) / stairs.length, 0, 1);
}

function doorAtBoundary(scene, side, x, z) {
  const wall = side === 'x+' ? 'east' : side === 'x-' ? 'west' : side === 'z+' ? 'north' : 'south';
  const coordinate = wall === 'east' || wall === 'west' ? z : x;
  return scene.doors.find(d => d.wall === wall && Math.abs(coordinate - d.offset) <= d.width / 2 - PLAYER_RADIUS);
}

function enter(state, fromScene, door) {
  const next = SCENES[door.to];
  if (!next) return false;
  state.sceneId = next.id;
  state.visits[next.id] = (state.visits[next.id] ?? 0) + 1;
  const visitScene = getScene(next.id, state.visits[next.id]);
  state.player.x = visitScene.spawn.x;
  state.player.z = visitScene.spawn.z;
  state.player.yaw = visitScene.spawn.yaw;
  state.player.pitch = 0;
  return true;
}

function tryAxis(state, scene, axis, delta) {
  if (!delta) return false;
  const player = state.player;
  const x = player.x + (axis === 'x' ? delta : 0);
  const z = player.z + (axis === 'z' ? delta : 0);
  const stairs = scene.stairs;
  const stairTop = stairs ? stairs.z + stairs.length : Infinity;
  if (stairs?.to && axis === 'z' && delta > 0 && Math.abs(player.x - stairs.x) <= stairs.width / 2 && player.z < stairTop && z >= stairTop) {
    return enter(state, scene, { to: stairs.to });
  }
  if (Math.abs(rampElevation(scene, x, z) - rampElevation(scene, player.x, player.z)) > 0.25) return false;
  let side = null;
  if (x < PLAYER_RADIUS) side = 'x-';
  else if (x > scene.width - PLAYER_RADIUS) side = 'x+';
  else if (z < PLAYER_RADIUS) side = 'z-';
  else if (z > scene.depth - PLAYER_RADIUS) side = 'z+';

  if (side) {
    const exit = doorAtBoundary(scene, side, x, z);
    if (exit && state.openDoors[doorKey(scene.id, exit.id)]) return enter(state, scene, exit);
    return false;
  }
  if (isSolidCollision(scene, x, z)) return false;
  player.x = x;
  player.z = z;
  return true;
}

export function move(state, input = {}, dt = 0) {
  if (!state?.player) return false;
  const scene = activeScene(state);
  const safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, MAX_DT);
  const forward = clamp(Number.isFinite(input.forward) ? input.forward : 0, -1, 1);
  const strafe = clamp(Number.isFinite(input.strafe) ? input.strafe : 0, -1, 1);
  const turn = clamp(Number.isFinite(input.turn) ? input.turn : 0, -1, 1);
  const p = state.player;
  const original = { sceneId: state.sceneId, x: p.x, z: p.z, yaw: p.yaw };
  p.yaw += turn * 2.2 * safeDt;
  let vx = Math.sin(p.yaw) * forward + Math.cos(p.yaw) * strafe;
  let vz = Math.cos(p.yaw) * forward - Math.sin(p.yaw) * strafe;
  const magnitude = Math.hypot(vx, vz);
  if (magnitude > 1) { vx /= magnitude; vz /= magnitude; }
  const distance = WALK_SPEED * safeDt;
  const steps = Math.max(1, Math.ceil(distance / 0.035));
  const stepX = vx * distance / steps, stepZ = vz * distance / steps;
  let transitioned = false;
  for (let i = 0; i < steps; i++) {
    // Axis-separated resolution gives a reliable slide along walls and furniture corners.
    const changedX = tryAxis(state, scene, 'x', stepX);
    if (state.sceneId !== original.sceneId) { transitioned = true; break; }
    const changedZ = tryAxis(state, scene, 'z', stepZ);
    if (state.sceneId !== original.sceneId) { transitioned = true; break; }
    // If x was blocked, z can still advance, and vice versa.
    void changedX; void changedZ;
  }
  return transitioned || p.x !== original.x || p.z !== original.z || p.yaw !== original.yaw;
}

export function look(state, dx = 0, dy = 0) {
  if (!state?.player) return;
  state.player.yaw = (Number.isFinite(state.player.yaw) ? state.player.yaw : 0) + (Number.isFinite(dx) ? dx : 0) * 0.002;
  state.player.pitch = clamp((Number.isFinite(state.player.pitch) ? state.player.pitch : 0) - (Number.isFinite(dy) ? dy : 0) * 0.002, -1.2, 1.2);
}

function angleDifference(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

// Segment/AABB test used to let a solid furnishing hide things behind it.
function segmentHitsBox(ax, az, bx, bz, object, padding = 0.02) {
  const minX = object.x - object.w / 2 - padding, maxX = object.x + object.w / 2 + padding;
  const minZ = object.z - object.d / 2 - padding, maxZ = object.z + object.d / 2 + padding;
  const dx = bx - ax, dz = bz - az;
  let t0 = 0, t1 = 1;
  for (const [origin, delta, min, max] of [[ax, dx, minX, maxX], [az, dz, minZ, maxZ]]) {
    if (Math.abs(delta) < 1e-9) { if (origin < min || origin > max) return false; continue; }
    let near = (min - origin) / delta, far = (max - origin) / delta;
    if (near > far) [near, far] = [far, near];
    t0 = Math.max(t0, near); t1 = Math.min(t1, far);
    if (t0 > t1) return false;
  }
  return t1 >= 0 && t0 <= 1;
}

export function getTarget(state) {
  if (!state?.player) return null;
  const scene = activeScene(state), p = state.player;
  const eye = EYE_LEVEL + rampElevation(scene,p.x,p.z);
  const candidates = [];
  for (const d of scene.doors) {
    const point = doorPosition(scene, d);
    const dx = point.x - p.x, dz = point.z - p.z;
    const distance = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    if (distance > 0.05 && distance <= TARGET_RANGE && Math.abs(angleDifference(angle, p.yaw)) <= TARGET_CONE) {
      candidates.push({ kind: 'door', id: d.id, label: d.label, distance, x: point.x, z: point.z });
    }
  }
  for (const o of scene.objects) {
    const dx = o.x - p.x, dz = o.z - p.z;
    const distance = Math.hypot(dx, dz), angle = Math.atan2(dx, dz);
    const heightMatches = !Number.isFinite(o.y) || Math.abs(Math.atan2(o.y+o.h*.5-eye,distance)-(p.pitch||0)) <= .6;
    if (heightMatches && distance > 0.05 && distance <= TARGET_RANGE && Math.abs(angleDifference(angle, p.yaw)) <= TARGET_CONE) {
      candidates.push({ kind: 'object', id: o.id, label: o.title, distance, x: o.x, z: o.z });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  for (const candidate of candidates) {
    const occluded = scene.objects.some(o => o.solid && !(candidate.kind === 'object' && candidate.id === o.id) &&
      segmentHitsBox(p.x, p.z, candidate.x, candidate.z, o) && Math.hypot(o.x - p.x, o.z - p.z) < candidate.distance - 0.05);
    if (!occluded) {
      const { x, z, ...result } = candidate;
      return result;
    }
  }
  return null;
}

export function interact(state, target = getTarget(state)) {
  if (!state?.player || !target || typeof target !== 'object' || typeof target.id !== 'string') return { type: 'none' };
  const scene = activeScene(state);
  if (target.kind === 'door') {
    const d = activeScene(state).doors.find(item => item.id === target.id);
    if (!d || !SCENES[d.to]) return { type: 'none' };
    const key = doorKey(scene.id, d.id);
    if (!state.openDoors[key]) {
      state.openDoors[key] = true;
      return { type: 'door', title: d.label, text: 'The door opens without a sound.' };
    }
    const fromName = scene.name;
    if (!enter(state, scene, d)) return { type: 'none' };
    return { type: 'transition', title: activeScene(state).name, text: `You leave ${fromName}.` };
  }
  if (target.kind === 'object') {
    const object = activeScene(state).objects.find(item => item.id === target.id);
    if (!object) return { type: 'none' };
    if (object.clue && !state.clues.includes(object.clue)) state.clues.push(object.clue);
    return { type: 'inspect', title: object.title, text: object.text, ...(object.clue ? { clue: object.clue } : {}) };
  }
  return { type: 'none' };
}

export function closeDoor(state, id) {
  if (!state || typeof id !== 'string') return;
  state.openDoors[doorKey(state.sceneId, id)] = false;
}

export function restart(state) {
  if (!state || typeof state !== 'object') return createState();
  const fresh = createState();
  state.sceneId = fresh.sceneId;
  state.player = fresh.player;
  state.visits = fresh.visits;
  state.openDoors = fresh.openDoors;
  state.clues = fresh.clues;
  return state;
}

export function eyeHeight(state) {
  if (!state?.player) return EYE_LEVEL;
  const scene = activeScene(state), stairs = scene.stairs;
  if (!stairs) return EYE_LEVEL;
  return EYE_LEVEL + rampElevation(scene, state.player.x, state.player.z);
}
