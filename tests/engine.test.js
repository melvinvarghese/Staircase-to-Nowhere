import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, START_SCENE, doorPosition, getScene } from '../js/world.js';
import { createState, move, look, getTarget, interact, closeDoor, restart, eyeHeight } from '../js/engine.js';

const REQUIRED = ['entrance', 'first-stairwell', 'repeating-corridor', 'room-214', 'service-corridor', 'elevator-hall', 'flooded-landing', 'windowless-floor', 'impossible-staircase', 'unlisted-floor'];
const key = (scene, id) => `${scene}:${id}`;
const door = (scene, id) => SCENES[scene].doors.find(d => d.id === id);
const faceDoor = (state, sceneId, d) => {
  const scene = SCENES[sceneId];
  const { x, z } = doorPosition(scene, d);
  state.player.x = d.wall === 'north' || d.wall === 'south' ? x : d.wall === 'east' ? scene.width - 2 : 2;
  state.player.z = d.wall === 'north' ? scene.depth - 2 : d.wall === 'south' ? 2 : z;
  const dx = x - state.player.x, dz = z - state.player.z;
  state.player.yaw = Math.atan2(dx, dz);
};

test('the ten named hotel locations form a connected, reciprocal, gate-free graph', () => {
  assert.deepEqual(Object.keys(SCENES).sort(), [...REQUIRED].sort());
  const reached = new Set([START_SCENE]);
  const queue = [START_SCENE];
  for (let i = 0; i < queue.length; i++) {
    for (const d of SCENES[queue[i]].doors) {
      assert.ok(SCENES[d.to], `${queue[i]} door ${d.id} points to missing ${d.to}`);
      if (!reached.has(d.to)) { reached.add(d.to); queue.push(d.to); }
      assert.ok(SCENES[d.to].doors.some(back => back.to === queue[i]), `${queue[i]} -> ${d.to} has no return route`);
    }
  }
  assert.equal(reached.size, 10);
  assert.ok(SCENES.entrance.doors.length >= 2, 'the remembered lobby should lead onward by more than one route');
});

test('each door has a safe, in-bounds center and every scene has coherent geometry', () => {
  for (const scene of Object.values(SCENES)) {
    assert.ok(scene.width >= 5 && scene.depth >= 8 && scene.height >= 2.5);
    assert.ok(scene.spawn.x > 0.2 && scene.spawn.x < scene.width - 0.2);
    assert.ok(scene.spawn.z > 0.2 && scene.spawn.z < scene.depth - 0.2);
    for (const d of scene.doors) {
      const p = doorPosition(scene, d);
      assert.ok(d.offset > d.width / 2 && (d.wall === 'north' || d.wall === 'south' ? d.offset < scene.width - d.width / 2 : d.offset < scene.depth - d.width / 2));
      assert.ok(d.wall === 'north' ? p.z === scene.depth : d.wall === 'south' ? p.z === 0 : d.wall === 'east' ? p.x === scene.width : d.wall === 'west' ? p.x === 0 : false);
      assert.equal(d.width, 1.5);
    }
    for (const o of scene.objects) for (const n of ['x', 'z', 'w', 'd', 'h']) assert.ok(Number.isFinite(o[n]) && o[n] > 0, `${scene.id}/${o.id}.${n}`);
  }
});

test('walking stays inside walls and solid furniture, including with a very large time delta', () => {
  const state = createState();
  state.player.x = 6; state.player.z = 10; state.player.yaw = 0;
  move(state, { forward: 1 }, 0.1);
  assert.ok(state.player.z < 11.6, 'closed doorway/wall must stop the player');
  state.player.x = 6; state.player.z = 6; state.player.yaw = 0;
  move(state, { forward: 1 }, 1e6);
  assert.ok(state.player.z < 9, 'large dt must be capped rather than tunneling through room');
  const room = SCENES.entrance;
  const solid = room.objects.find(o => o.solid);
  assert.ok(solid, 'room provides a physical furnishing');
  state.player.x = solid.x; state.player.z = solid.z - solid.d / 2 - 0.26; state.player.yaw = 0;
  move(state, { forward: 1 }, 0.1);
  assert.ok(state.player.z <= solid.z - solid.d / 2 - 0.19, 'solid furnishing blocks the player');
});

test('movement honors orientation, strafing, and continuous bounded motion', () => {
  const state = createState();
  const before = { ...state.player };
  move(state, { forward: 1 }, 0.1);
  assert.ok(state.player.z > before.z && Math.abs(state.player.x - before.x) < 0.001);
  state.player.yaw = Math.PI / 2;
  const x = state.player.x;
  move(state, { forward: 1 }, 0.1);
  assert.ok(state.player.x > x);
  const z = state.player.z;
  move(state, { strafe: 1 }, 0.1);
  assert.ok(state.player.z < z);
  look(state, 2, 1000);
  assert.ok(state.player.pitch <= 1.2 && state.player.pitch >= -1.2);
});

test('aiming selects nearby targets but rejects objects outside angle, range, or behind solid occlusion', () => {
  const state = createState();
  const d = SCENES.entrance.doors[0];
  faceDoor(state, 'entrance', d);
  assert.equal(getTarget(state)?.kind, 'door');
  state.player.yaw += Math.PI;
  assert.equal(getTarget(state), null);
  state.player.yaw -= Math.PI;
  state.player.x = -100;
  assert.equal(getTarget(state), null);
  const objState = createState();
  const obj = SCENES.entrance.objects.find(o => o.id === 'lobby-clock');
  objState.player.x = obj.x; objState.player.z = obj.z - 1; objState.player.yaw = 0; objState.player.pitch=1.2;
  const target = getTarget(objState);
  assert.equal(target?.kind, 'object');
  assert.equal(target?.id, 'lobby-clock');
  assert.ok(target.distance <= 3.25);
  const blocked = createState();
  const desk = SCENES.entrance.objects.find(o => o.id === 'reception-desk');
  const bell = SCENES.entrance.objects.find(o => o.id === 'reception-bell');
  blocked.player.x = desk.x; blocked.player.z = desk.z - 1.8; blocked.player.yaw = 0;
  assert.notEqual(getTarget(blocked)?.id, bell.id, 'the reception desk hides the bell on its far side');
});

test('doors open first, close explicitly, then transition on second interaction to safe spawn', () => {
  const state = createState();
  const d = SCENES.entrance.doors[0];
  const k = key('entrance', d.id);
  assert.equal(interact(state, { kind: 'door', id: d.id }).type, 'door');
  assert.equal(state.openDoors[k], true);
  closeDoor(state, d.id);
  assert.equal(state.openDoors[k], false);
  assert.equal(interact(state, { kind: 'door', id: d.id }).type, 'door');
  const result = interact(state, { kind: 'door', id: d.id });
  assert.equal(result.type, 'transition');
  assert.equal(state.sceneId, d.to);
  assert.equal(state.visits[d.to], 1);
  const target = SCENES[d.to];
  assert.deepEqual([state.player.x, state.player.z], [target.spawn.x, target.spawn.z]);
});

test('explicit exit navigation lets a visitor traverse every return route and increments revisits', () => {
  const state = createState();
  const first = SCENES.entrance.doors[0];
  interact(state, { kind: 'door', id: first.id });
  interact(state, { kind: 'door', id: first.id });
  const back = SCENES[first.to].doors.find(d => d.to === 'entrance');
  assert.ok(back);
  interact(state, { kind: 'door', id: back.id });
  interact(state, { kind: 'door', id: back.id });
  assert.equal(state.sceneId, 'entrance');
  assert.equal(state.visits.entrance, 2);
  assert.notEqual(getScene('room-214', 1).objects.find(o => o.id === 'chair-214').x,
    getScene('room-214', 2).objects.find(o => o.id === 'chair-214').x);
  assert.equal(getScene('entrance', 2).doors.find(d => d.id === 'front-entry').to, 'unlisted-floor');
});

test('room variations do not mutate base scenes and clues can be collected once', () => {
  const base = structuredClone(SCENES['room-214']);
  const first = getScene('room-214', 1), later = getScene('room-214', 2);
  assert.notDeepEqual(first.objects, later.objects);
  assert.deepEqual(SCENES['room-214'], base);
  const state = createState();
  const clueObj = SCENES.entrance.objects.find(o => o.clue);
  assert.ok(clueObj, 'the lobby has an optional remembered-place clue');
  const result = interact(state, { kind: 'object', id: clueObj.id });
  assert.equal(result.type, 'inspect');
  assert.ok(result.clue);
  interact(state, { kind: 'object', id: clueObj.id });
  assert.equal(state.clues.filter(c => c === result.clue).length, 1);
});

test('the impossible stair ramp changes eye height along its run', () => {
  const state = createState();
  state.sceneId = 'impossible-staircase';
  state.player.x = 9; state.player.z = 2;
  const low = eyeHeight(state);
  state.player.z = 8;
  const high = eyeHeight(state);
  assert.ok(high > low + 0.8);
  assert.ok(high < 4.5);
});

test('walking to a stair top transitions to its landing and the down door returns safely', () => {
  const state = createState();
  state.sceneId = 'first-stairwell';
  state.player = { x: 9, z: 8.4, yaw: 0, pitch: 0 };
  move(state, { forward: 1 }, 0.1);
  assert.equal(state.sceneId, 'impossible-staircase');
  assert.equal(state.visits['impossible-staircase'], 1);
  const down = SCENES['impossible-staircase'].doors.find(d => d.id === 'back-first');
  assert.ok(down);
  interact(state, { kind: 'door', id: down.id });
  assert.equal(interact(state, { kind: 'door', id: down.id }).type, 'transition');
  assert.equal(state.sceneId, 'first-stairwell');
  assert.deepEqual([state.player.x, state.player.z], [SCENES['first-stairwell'].spawn.x, SCENES['first-stairwell'].spawn.z]);
});

test('every authored door can transition to a valid spawn and has a usable return route', () => {
  for (const scene of Object.values(SCENES)) for (const exit of scene.doors) {
    const state = createState();
    state.sceneId = scene.id;
    state.visits[scene.id] = 1;
    state.player = { ...scene.spawn, pitch: 0 };
    interact(state, { kind: 'door', id: exit.id });
    assert.equal(interact(state, { kind: 'door', id: exit.id }).type, 'transition', `${scene.id}/${exit.id}`);
    assert.equal(state.sceneId, exit.to);
    const destination = SCENES[exit.to];
    assert.ok(state.player.x > 0.2 && state.player.x < destination.width - 0.2);
    assert.ok(state.player.z > 0.2 && state.player.z < destination.depth - 0.2);
    const returnDoor = destination.doors.find(d => d.to === scene.id);
    assert.ok(returnDoor, `${scene.id}/${exit.id} must be returnable from ${destination.id}`);
    interact(state, { kind: 'door', id: returnDoor.id });
    assert.equal(interact(state, { kind: 'door', id: returnDoor.id }).type, 'transition');
    assert.equal(state.sceneId, scene.id);
  }
});

test('restart clears exploration state and malformed targets return none without throwing', () => {
  const state = createState();
  state.visits['room-214'] = 9; state.openDoors['entrance:to-first'] = true; state.clues.push('x');
  restart(state);
  assert.equal(state.sceneId, START_SCENE);
  assert.equal(state.visits['room-214'], undefined);
  assert.deepEqual(state.openDoors, {});
  assert.deepEqual(state.clues, []);
  for (const target of [null, undefined, {}, { kind: 'door' }, { kind: 'object', id: '__bad__' }, 'nonsense', 42]) {
    assert.doesNotThrow(() => interact(state, target));
  }
  assert.equal(interact(state, { kind: 'object', id: '__bad__' }).type, 'none');
});

test('a mounted clock requires upward aim and does not steal the level doorway target',()=>{
 const state=createState(),d=SCENES.entrance.doors.find(d=>d.id==='north-stair');
 faceDoor(state,'entrance',d);
 assert.equal(getTarget(state)?.kind,'door');
 state.player.pitch=1.2;
 assert.equal(getTarget(state)?.id,'lobby-clock');
});
