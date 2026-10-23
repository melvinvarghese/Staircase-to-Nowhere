import test from 'node:test';
import assert from 'node:assert/strict';
import * as renderer from '../js/webgl-renderer.js';
test('portrait perspective caps vertical field of view instead of stretching the hotel',()=>{
 assert.equal(typeof renderer.cameraFocal,'function');
 const f=renderer.cameraFocal(390,844);
 const verticalFov=2*Math.atan(844/(2*f))*180/Math.PI;
 assert.ok(verticalFov<=70 && verticalFov>=50);
 assert.equal(renderer.cameraFocal(1280,800),800*.94);
});
