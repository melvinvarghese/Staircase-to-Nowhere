import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer, projectCameraPoint, clipPolygonNearPlane, buildSceneGeometry } from '../js/renderer.js';

test('camera projection uses perspective and maps the camera center to screen center', () => {
  const center = projectCameraPoint({ x: 0, y: 0, z: 2 }, { width: 800, height: 600, focal: 400 });
  const farther = projectCameraPoint({ x: 1, y: 0, z: 4 }, { width: 800, height: 600, focal: 400 });
  assert.deepEqual(center, { x: 400, y: 300, z: 2 });
  assert.equal(farther.x, 500);
});

test('near-plane clipping keeps the visible portion and rejects a polygon wholly behind camera', () => {
  const clipped = clipPolygonNearPlane([
    { x: -1, y: 0, z: 0.1 }, { x: 1, y: 0, z: 2 }, { x: 0, y: 1, z: 2 }
  ], 0.5);
  assert.equal(clipped.length, 4);
  assert.ok(clipped.every(p => p.z >= 0.5 && Number.isFinite(p.x + p.y + p.z)));
  assert.deepEqual(clipPolygonNearPlane([{ x: 0, y: 0, z: 0.1 }], 0.5), []);
});

test('scene geometry remains finite and bounded for room, door, furniture and stairs', () => {
  const scene = {
    id: 'test', kind: 'corridor', width: 8, depth: 16, height: 3.2,
    colors: { wall: '#b3ad91', lower: '#5a6654', floor: '#544939', ceiling: '#d1cbb1' },
    doors: [{ id: 'north', wall: 'north', offset: 3, width: 1.5, label: 'North' }],
    objects: [{ id: 'desk', type: 'desk', x: 4, z: 6, w: 2, d: 0.8, h: 1.1, title: 'Desk' }],
    stairs: { x: 3, z: 7, width: 2, length: 5, rise: 2 }
  };
  const built = buildSceneGeometry(scene, { openDoors: {} });
  const geometry = built.polygons;
  assert.deepEqual(built.texts.map(item => item.text), ['North']);
  assert.ok(geometry.length > 80);
  assert.ok(geometry.length < 1000);
  for (const polygon of geometry) {
    assert.ok(polygon.points.length >= 3);
    assert.ok(polygon.points.every(p => Number.isFinite(p.x + p.y + p.z)));
  }
});

function fakeCanvas(width = 1800, height = 1100, context = {}) {
  const ctx = {
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {},
    save() {}, restore() {}, translate() {}, rotate() {}, fillText() {},
    createLinearGradient() { return { addColorStop() {} }; }, ...context
  };
  return { clientWidth: width, clientHeight: height, width, height, getContext: () => ctx };
}

test('renderer caps low/high backing resolution, caches geometry, and renders on demand', () => {
  const canvas = fakeCanvas(), renderer = new Renderer(canvas);
  assert.ok(canvas.width <= 900 && canvas.width * canvas.height <= 550000);
  const scene = { id: 'room', name: 'Room', kind: 'room', width: 8, depth: 12, height: 3.2, doors: [{ id: 'lift', wall: 'north', offset: 4, width: 1.5, label: 'ELEVATOR', style: 'elevator' }], objects: [] };
  const state = { player: { x: 4, z: 2, yaw: 0, pitch: 0 }, visits: { room: 1 }, openDoors: {} };
  renderer.render(scene, state);
  const cached = renderer.geometry;
  renderer.render(scene, state);
  assert.equal(renderer.stats.frames, 2);
  assert.ok(renderer.stats.polygons > 0);
  assert.equal(renderer.geometry, cached);
  state.visits.room = 2;
  renderer.render(scene, state);
  assert.notEqual(renderer.geometry, cached);
  const visitedGeometry = renderer.geometry;
  state.openDoors['room:lift'] = true;
  renderer.render(scene, state);
  assert.notEqual(renderer.geometry, visitedGeometry);
  renderer.resize('high');
  assert.ok(canvas.width <= 1400 && canvas.width * canvas.height <= 1200000);
  renderer.dispose();
});

test('renderer reports a useful error when a 2D context is unavailable', () => {
  assert.throws(() => new Renderer({ getContext: () => null }), /2D canvas context/);
});

test('light spill stays on physical walls and the directory rests on the floor',()=>{
  const scene={id:'grounding',kind:'lobby',width:12,depth:12,height:3.4,doors:[],objects:[{id:'directory',type:'directory',x:9,z:8,w:.7,d:.5,h:2,title:'Directory',text:'Ground'}]};
  const geometry=buildSceneGeometry(scene);
  const spills=geometry.polygons.filter(p=>p.color==='rgba(204,217,183,0.12)'||p.color==='rgba(191,174,128,0.10)');
  assert.ok(spills.length>0);
  assert.ok(spills.every(p=>p.points.every(v=>v.x<.1||v.x>11.9)),'light must not be a translucent panel floating in the room');
  const frame=geometry.polygons.filter(p=>p.color==='#42362a');
  assert.equal(Math.min(...frame.flatMap(p=>p.points.map(v=>v.y))),0);
});

test('small notes do not become floating text billboards',()=>{
  const scene={id:'note',kind:'room',width:8,depth:12,height:3.4,doors:[],objects:[{id:'note',type:'note',x:3,z:6,w:.25,d:.06,h:.3,title:'Folded note',text:'A quiet clue.'}]};
  assert.equal(buildSceneGeometry(scene).texts.length,0);
});
