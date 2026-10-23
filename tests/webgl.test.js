import test from 'node:test';
import assert from 'node:assert/strict';
import { WebGLRenderer, packSceneGeometry, worldToCamera, backingSize, surfaceNoisePixels } from '../js/webgl-renderer.js';

test('packs polygon faces into finite triangle data with consistent two-sided normals', () => {
  const packed = packSceneGeometry([{ points: [
    {x:0,y:0,z:0}, {x:1,y:0,z:0}, {x:1,y:0,z:1}, {x:0,y:0,z:1}
  ], color:'#806040', emissive:0.2 }]);
  assert.equal(packed.vertexCount, 6);
  assert.equal(packed.data.length, 6 * packed.stride);
  assert.equal(packed.stride, 14);
  for (let i=0;i<packed.data.length;i+=packed.stride) {
    assert.ok(packed.data.subarray(i,i+3).every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...packed.data.subarray(i+3,i+6))-1)<1e-5);
    assert.ok(Math.abs(packed.data[i+9]-0.2)<1e-6);
  }
  const n = packed.data.subarray(3,6), n2=packed.data.subarray(packed.stride+3,packed.stride+6);
  assert.deepEqual([...n],[...n2]);
});

test('camera faces positive z at yaw zero and positive pitch raises the view direction', () => {
  assert.deepEqual(worldToCamera({x:0,y:0,z:4},{x:0,y:0,z:0,yaw:0,pitch:0}),{x:0,y:0,z:4});
  const raised = worldToCamera({x:0,y:0,z:4},{x:0,y:0,z:0,yaw:0,pitch:0.2});
  assert.ok(raised.y < 0, 'level objects fall lower in frame when looking up');
});

test('resolution limits hold for oversized low and high backing buffers', () => {
  const low=backingSize(2400,1600,'low'),high=backingSize(2400,1600,'high');
  assert.ok(low.width<=900&&low.width*low.height<=550000);
  assert.ok(high.width<=1400&&high.width*high.height<=1200000);
});

test('world-space atlas plaques retain their packed texture coordinates',()=>{
  const packed=packSceneGeometry([{points:[{x:0,y:0,z:0},{x:1,y:0,z:0},{x:1,y:1,z:0},{x:0,y:1,z:0}],color:'#a18b5c',surface:'atlas',uvs:[[0,.1],[.2,.1],[.2,0],[0,0]]}]);
  assert.equal(packed.data[10],2);
  assert.equal(packed.data[12],0);assert.ok(Math.abs(packed.data[13]-.1)<1e-6);
  assert.ok(Math.abs(packed.data[26]-.2)<1e-6);assert.ok(Math.abs(packed.data[27]-.1)<1e-6);
});

function canvas(width=1800,height=1100,gl={}) {
  return { clientWidth:width, clientHeight:height, width,height,getContext(type) { return type==='webgl' ? gl : null; } };
}

test('requires WebGL1 and gives a useful unavailable-graphics error', () => {
  assert.throws(() => new WebGLRenderer(canvas()), /WebGL.*unavailable/i);
});

test('side-wall plaques preserve a zero x direction and stay parallel to the wall',()=>{
 const original=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({clearRect(){},fillText(){}})})};
 try{
  const polys=[];
  WebGLRenderer.prototype.makeAtlas.call({},[{text:'LOBBY',at:{x:.2,y:2,z:4},right:{x:0,z:1},width:.6,size:.16}],polys);
  assert.equal(polys.length,1);
  assert.ok(polys[0].points.every(p=>Math.abs(p.x-.212)<1e-9));
  assert.ok(Math.abs(polys[0].points[1].z-polys[0].points[0].z-.6)<1e-9);
 }finally{globalThis.document=original;}
});

 test('surface texture noise is fixed, bounded and reusable across frames',()=>{
  const a=surfaceNoisePixels(),b=surfaceNoisePixels();
  assert.equal(a.length,64*64*4);assert.deepEqual(a,b);
  assert.ok(a.some((v,i)=>i%4!==3&&v<80));
  assert.ok(a.some((v,i)=>i%4!==3&&v>180));
  assert.ok(a.every((v,i)=>i%4!==3||v===255));
 });

test('software graphics use a smaller low-power backing buffer without reducing opt-in detail',()=>{
 const low=backingSize(1280,800,'low',true),high=backingSize(1280,800,'high',true);
 assert.ok(low.width<=480&&low.width*low.height<=140000);
 assert.ok(high.width>480);
});

test('a fragment compile failure also deletes the already compiled vertex shader',()=>{
 const deleted=[];
 const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,createShader:type=>({type}),shaderSource(){},compileShader(){},getShaderParameter:s=>s.type===1,getShaderInfoLog:()=> 'fragment failure',deleteShader:s=>deleted.push(s.type),getExtension:()=>null};
 assert.throws(()=>new WebGLRenderer(canvas(800,600,gl)),/fragment failure/);
 assert.deepEqual(deleted.sort(),[1,2]);
});

test('an incomplete reflection target never becomes cached as ready and is released',()=>{
 let created=0,deleted=0;
 const gl={FRAMEBUFFER_COMPLETE:1,createTexture:()=>({}),createFramebuffer:()=>{created++;return{};},createRenderbuffer:()=>({}),checkFramebufferStatus:()=>0,deleteTexture(){deleted++;},deleteFramebuffer(){deleted++;},deleteRenderbuffer(){deleted++;}};
 for(const name of ['activeTexture','bindTexture','texImage2D','texParameteri','bindFramebuffer','framebufferTexture2D','bindRenderbuffer','renderbufferStorage','framebufferRenderbuffer'])gl[name]=()=>{};
 const r={gl,width:800,height:600,quality:'low',softwareRendering:false,reflectionSize:''};
 assert.equal(WebGLRenderer.prototype.ensureReflectionTarget.call(r),false);
 assert.equal(WebGLRenderer.prototype.ensureReflectionTarget.call(r),false);
 assert.equal(created,1);assert.equal(deleted,3);
});
