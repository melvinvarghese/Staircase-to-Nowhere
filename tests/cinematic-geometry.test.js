import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSceneGeometry } from '../js/renderer.js';
import { SCENES } from '../js/world.js';

const entrance = () => buildSceneGeometry(SCENES.entrance).polygons;

function samePlaneBounds(a, b) {
  const axis = ['x', 'y', 'z'].find(k => a.points.every(p => p[k] === a.points[0][k]) && b.points.every(p => p[k] === b.points[0][k]) && a.points[0][k] === b.points[0][k]);
  if (!axis) return false;
  const other = ['x', 'y', 'z'].filter(k => k !== axis);
  const bounds = p => other.map(k => [Math.min(...p.points.map(v => v[k])), Math.max(...p.points.map(v => v[k]))]);
  const A = bounds(a), B = bounds(b);
  return A.every((r, i) => Math.min(r[1], B[i][1]) - Math.max(r[0], B[i][0]) > 1e-5);
}

test('hotel architecture exposes atlas material tags for walls, ceiling, carpet, doors, and metal details', () => {
  const polygons = entrance();
  const surfaces = new Set(polygons.map(p => p.surface));
  for (const required of ['wallpaper', 'wood', 'plaster', 'carpet', 'stone', 'metal']) assert.ok(surfaces.has(required), `missing ${required} material surface`);
});

test('hotel surfaces stay inside the scene envelope and produce distinct lobby and corridor architecture', () => {
  const lobby = buildSceneGeometry(SCENES.entrance).polygons;
  const corridor = buildSceneGeometry(SCENES['repeating-corridor']).polygons;
  for (const p of [...lobby, ...corridor]) for (const v of p.points) {
    assert.ok(v.x >= -0.01 && v.x <= 18.01, `x out of bounds: ${v.x}`);
    assert.ok(v.y >= -0.01 && v.y <= 8.01, `y out of bounds: ${v.y}`);
    assert.ok(v.z >= -0.2 && v.z <= 36.2, `z out of bounds: ${v.z}`);
  }
  assert.ok(lobby.filter(p => p.surface === 'stone').length > corridor.filter(p => p.surface === 'stone').length);
  assert.ok(lobby.filter(p => p.surface === 'carpet').length > 1, 'lobby should have a patterned carpet treatment');
  for (const scene of Object.values(SCENES)) {
    const tris=buildSceneGeometry(scene).polygons.reduce((sum,p)=>sum+p.points.length-2,0);
    assert.ok(tris < 25000, `${scene.id} exceeds the pre-bake 25k triangle budget: ${tris}`);
  }
});

test('wallpaper panel faces do not overlap coplanarly', () => {
  const walls = buildSceneGeometry(SCENES['repeating-corridor']).polygons.filter(p => p.surface === 'wallpaper' && p.points.length === 4);
  for (let i = 0; i < walls.length; i++) for (let j = i + 1; j < walls.length; j++) assert.equal(samePlaneBounds(walls[i], walls[j]), false, `overlapping wall quads ${i} and ${j}`);
});


test('box props expose outward-facing geometric normals for static shadow baking', () => {
  const scene={id:'normal-check',kind:'room',width:8,depth:12,height:3.2,doors:[],objects:[{type:'cabinet',x:4,z:6,w:1,d:1,h:1}]};
  const faces=buildSceneGeometry(scene).polygons.filter(p=>p.color==='#9d9276');
  assert.equal(faces.length,6);
  const center={x:4,y:.5,z:6};
  for(const p of faces) {
    const [a,b,c]=p.points, u=[b.x-a.x,b.y-a.y,b.z-a.z], v=[c.x-a.x,c.y-a.y,c.z-a.z];
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const midpoint=p.points.reduce((m,q)=>({x:m.x+q.x/p.points.length,y:m.y+q.y/p.points.length,z:m.z+q.z/p.points.length}),{x:0,y:0,z:0});
    assert.ok(n[0]*(midpoint.x-center.x)+n[1]*(midpoint.y-center.y)+n[2]*(midpoint.z-center.z)>0,'face normal points outward');
  }
});


test('guest walls remain wallpaper while service and stair walls become plaster with stone floors', () => {
  const guest=buildSceneGeometry(SCENES['repeating-corridor']).polygons;
  const service=buildSceneGeometry(SCENES['service-corridor']).polygons;
  const stair=buildSceneGeometry(SCENES['first-stairwell']).polygons;
  assert.ok(guest.some(p=>p.surface==='wallpaper'));
  for(const polygons of [service,stair]) {
    assert.ok(polygons.some(p=>p.surface==='plaster'));
    assert.ok(polygons.some(p=>p.surface==='stone'));
    assert.equal(polygons.some(p=>p.surface==='wallpaper'),false);
  }
  const lobby=buildSceneGeometry(SCENES.entrance).polygons;
  assert.ok(lobby.some(p=>p.surface==='stone'));
  assert.ok(lobby.some(p=>p.surface==='carpet'));
});
