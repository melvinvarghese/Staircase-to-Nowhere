import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSceneGeometry} from '../js/renderer.js';
import {SCENES} from '../js/world.js';
test('guest bedding has a fabric finish rather than walnut',()=>{
 const mesh=buildSceneGeometry(SCENES['room-214'],{openDoors:{}});
 assert.ok(mesh.polygons.some(p=>p.surface==='fabric'));
});
test('corridors have no leftover generic blank plaques',()=>{
 const mesh=buildSceneGeometry(SCENES['repeating-corridor'],{openDoors:{}});
 assert.ok(!mesh.polygons.some(p=>p.color==='#83775d'));
});
