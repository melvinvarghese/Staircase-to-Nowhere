import test from 'node:test';
import assert from 'node:assert/strict';
import { packSceneGeometry } from '../js/webgl-renderer.js';
import * as lighting from '../js/lighting.js';
const quad = {points:[{x:0,y:0,z:0},{x:4,y:0,z:0},{x:4,y:0,z:4},{x:0,y:0,z:4}],color:'#ffffff',surface:'carpet'};
test('architectural materials retain distinct atlas identifiers',()=>{
 for(const [surface,id] of Object.entries({wallpaper:3,carpet:4,wood:5,plaster:6,stone:7,metal:8})){
  assert.equal(packSceneGeometry([{...quad,surface}]).data[10],id);
 }
});
test('baked surfaces subdivide, stay finite, and preserve physical material tags',()=>{
 assert.equal(typeof lighting.bakeLighting,'function');
 const out=lighting.bakeLighting([quad],{width:4,depth:4,height:3,objects:[]},[{x:2,y:2.8,z:2,power:4}]);
 assert.ok(out.length>4 && out.length<300);
 assert.ok(out.every(p=>p.surface==='carpet' && p.irradiance.length===4 && p.irradiance.every(v=>Number.isFinite(v)&&v>=0&&v<=2)));
 assert.equal(out.reduce((max,p)=>Math.max(max,...p.points.map(v=>v.x)),0),4);
});
test('real solid geometry casts a shadow between light and surface, not behind it',()=>{
 assert.equal(typeof lighting.visibility,'function');
 const box={min:[1,0,1],max:[2,2,2]};
 assert.equal(lighting.visibility({x:1.5,y:.01,z:2.5},{x:1.5,y:3,z:.5},[box]),0);
 assert.equal(lighting.visibility({x:3,y:.01,z:2.5},{x:3,y:3,z:.5},[box]),1);
 assert.equal(lighting.visibility({x:1.5,y:3.5,z:1.5},{x:1.5,y:3,z:1.5},[box]),1);
});
test('per-vertex irradiance reaches the GPU instead of a uniform ambient value',()=>{
 const packed=packSceneGeometry([{...quad,irradiance:[.2,.4,.6,.8]}]);
 assert.ok(Math.abs(packed.data[11]-.2)<1e-6);
 assert.ok(Math.abs(packed.data[packed.stride+11]-.4)<1e-6);
});

test('low-power bake density reduces room-change work while preserving illumination',()=>{
 const scene={width:4,depth:4,height:3,objects:[]},lights=[{x:2,y:2.8,z:2,power:4}];
 const detail=lighting.bakeLighting([quad],scene,lights,{spacing:.8});
 const low=lighting.bakeLighting([quad],scene,lights,{spacing:1.3});
 assert.ok(low.length<detail.length*.75);
 assert.ok(low.every(p=>p.irradiance.every(Number.isFinite)));
});
