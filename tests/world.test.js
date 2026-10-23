import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, getScene } from '../js/world.js';

const boxGap = (x, z, object) => Math.hypot(
  Math.max(Math.abs(x - object.x) - object.w / 2, 0),
  Math.max(Math.abs(z - object.z) - object.d / 2, 0)
);

test('the lobby is a vast, columned arrival space with reception beyond its centered spawn', () => {
  const lobby = SCENES.entrance;
  assert.deepEqual([lobby.width, lobby.depth, lobby.height], [18, 28, 8]);
  assert.deepEqual([lobby.spawn.x, lobby.spawn.z], [9, 4]);
  assert.ok(lobby.objects.filter(object => object.type === 'column' && object.solid).length >= 4);
  const desk = lobby.objects.find(object => object.id === 'reception-desk');
  assert.ok(desk && desk.z > lobby.spawn.z + 15, 'reception should sit in the distance');
  assert.equal(lobby.doors.find(item => item.id === 'north-stair').offset, lobby.spawn.x,
    'the stairs should be aligned with the straight-ahead route');
  assert.ok(lobby.objects.some(object => object.id === 'lobby-luggage'));
  assert.ok(lobby.objects.find(object => object.id === 'lobby-clock').y > 1,
    'the stopped clock should be mounted above eye level');
});

test('guest and service spaces have their deliberately stretched and compressed proportions', () => {
  assert.ok(SCENES['repeating-corridor'].depth >= 36);
  assert.ok(SCENES['repeating-corridor'].width <= 5.5);
  assert.ok(SCENES['room-214'].depth >= 22);
  assert.ok(SCENES['service-corridor'].height <= 2.8);
  assert.ok(SCENES['flooded-landing'].width >= 13);
  assert.notEqual(SCENES.entrance.colors.wall, SCENES['repeating-corridor'].colors.wall);
  assert.notEqual(SCENES['service-corridor'].colors.floor, SCENES['flooded-landing'].colors.floor);
});

test('solid furnishings leave every safe spawn a player-radius margin', () => {
  for (const scene of Object.values(SCENES)) {
    for (const object of scene.objects.filter(item => item.solid)) {
      assert.ok(boxGap(scene.spawn.x, scene.spawn.z, object) > 0.22,
        `${scene.id}/${object.id} crowds the spawn`);
    }
  }
});

test('returning to the lobby changes the visible door number and reveals the prepared guest card', () => {
  const first = getScene('entrance', 1);
  const returned = getScene('entrance', 2);
  assert.notEqual(returned.doors.find(item => item.id === 'front-entry').label,
    first.doors.find(item => item.id === 'front-entry').label);
  const card = returned.objects.find(item => item.id === 'registration-card');
  assert.ok(card);
  assert.match(card.title, /214/);
  assert.match(card.text, /2:14/);
  assert.notDeepEqual(
    [returned.objects.find(item => item.id === 'lobby-luggage').x, returned.objects.find(item => item.id === 'lobby-luggage').z],
    [first.objects.find(item => item.id === 'lobby-luggage').x, first.objects.find(item => item.id === 'lobby-luggage').z]
  );
  assert.equal(getScene('entrance', 1).objects.find(item => item.id === 'registration-card').title, 'Blank registration card');
});

test('revisited guest-room numbers change on the door itself, not only in inspection text', () => {
  const first = getScene('room-214', 1);
  const returned = getScene('room-214', 2);
  assert.notEqual(returned.doors.find(item => item.id === 'unlisted-connection').label,
    first.doors.find(item => item.id === 'unlisted-connection').label);
});

test('stairwell arrivals face the foot of the walkable climb',()=>{
 for(const id of ['first-stairwell','impossible-staircase']){
  const s=SCENES[id];
  assert.ok(Math.abs(s.spawn.x-s.stairs.x)<s.stairs.width/2,`${id}: arrival aligns with stair run`);
  assert.ok(s.spawn.z<s.stairs.z,`${id}: arrival remains below first tread`);
  assert.equal(s.spawn.yaw,0);
 }
});

test('inspecting reception itself reveals the returned registration card',()=>{
 const desk=getScene('entrance',2).objects.find(o=>o.id==='reception-desk');
 assert.match(desk.text,/Guest 214/);
 assert.match(desk.text,/2:14/);
});
