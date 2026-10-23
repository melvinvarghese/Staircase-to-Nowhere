import { buildSceneGeometry, sceneEyeHeight } from './renderer.js';
import { bakeLighting } from './lighting.js';
import { HOTEL_FRAGMENT_SHADER } from './hotel-shader.js';

const LOW = { width: 900, area: 550000 };
const HIGH = { width: 1400, area: 1200000 };
const SOFTWARE_LOW = { width: 400, area: 90000 };
const NEAR = 0.16, FAR = 90, STRIDE = 14;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const started = () => globalThis.performance?.now?.() ?? Date.now();

export function cameraFocal(width,height) {
  return Math.max(Math.min(width,height)*.94,height*.72);
}

export function backingSize(cssWidth, cssHeight, quality='low', software=false) {
  const limit=quality==='high'?HIGH:(software?SOFTWARE_LOW:LOW);
  const w=Math.max(1,Number(cssWidth)||640), h=Math.max(1,Number(cssHeight)||400);
  const scale=Math.min(1,limit.width/w,Math.sqrt(limit.area/(w*h)));
  return {width:Math.max(1,Math.floor(w*scale)),height:Math.max(1,Math.floor(h*scale))};
}

export function worldToCamera(world,camera) {
  const dx=world.x-camera.x,dy=world.y-camera.y,dz=world.z-camera.z;
  const cy=Math.cos(camera.yaw||0),sy=Math.sin(camera.yaw||0),cp=Math.cos(camera.pitch||0),sp=Math.sin(camera.pitch||0);
  const right=dx*cy-dz*sy, forward=dx*sy+dz*cy;
  return {x:right,y:dy*cp-forward*sp,z:dy*sp+forward*cp};
}

function rgb(color) {
  if(typeof color!=='string') return [0.48,0.46,0.40];
  let m=color.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if(m) { const s=m[1].length===3?m[1].split('').map(c=>c+c).join(''):m[1]; return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255); }
  m=color.match(/rgba?\(([^)]+)\)/i);
  if(m) { const v=m[1].split(',').map(Number),a=v.length>3?clamp(Number(v[3])||0,0,1):1,wall=[179/255,173/255,145/255];return v.slice(0,3).map((n,i)=>clamp(((n||0)/255)*a+wall[i]*(1-a),0,1)); }
  return [0.48,0.46,0.40];
}

function faceNormal(points) {
  const a=points[0],b=points[1],c=points[2];
  const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;
  let x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;
  const n=Math.hypot(x,y,z)||1; return [x/n,y/n,z/n];
}

export function packSceneGeometry(polygons=[]) {
  const values=[]; let vertexCount=0;
  for(const polygon of polygons) {
    const points=polygon.points||[]; if(points.length<3) continue;
    const normal=faceNormal(points), color=rgb(polygon.color), emissive=Number(polygon.emissive)||0;
    const surface=({water:1,atlas:2,wallpaper:3,carpet:4,wood:5,plaster:6,stone:7,metal:8,fabric:9})[polygon.surface]||0;
    const ao=Number.isFinite(polygon.ao)?clamp(polygon.ao,0,1):1;
    for(let i=1;i<points.length-1;i++) {
      const triangle=[points[0],points[i],points[i+1]],indices=[0,i,i+1];
      for(let j=0;j<3;j++) {
        const p=triangle[j],uv=polygon.uvs?.[indices[j]]||[0,0];
        values.push(Number(p.x)||0,Number(p.y)||0,Number(p.z)||0,...normal,...color,emissive,surface,polygon.irradiance?.[indices[j]]??ao,uv[0],uv[1]);
        vertexCount++;
      }
    }
  }
  return {data:new Float32Array(values),vertexCount,stride:STRIDE};
}

export function surfaceNoisePixels(){
  const data=new Uint8Array(64*64*4);let seed=214;
  for(let i=0;i<data.length;i+=4){for(let c=0;c<3;c++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i+c]=seed>>>24;}data[i+3]=255;}
  return data;
}

const VERTEX_SHADER = `
attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor;
attribute float aEmissive; attribute float aSurface; attribute float aAO; attribute vec2 aUV;
uniform mediump vec3 uEye; uniform vec2 uViewport; uniform float uFocal; uniform float uNear; uniform float uFar;
uniform float uYaw; uniform float uPitch; uniform mediump float uReflect;
varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor; varying float vEmissive;
varying float vSurface; varying float vAO; varying float vDepth; varying vec2 vUV;
void main(){
  vec3 world=aPosition; vec3 normal=aNormal; if(uReflect>0.5){world.y=-world.y;normal.y=-normal.y;}
  vec3 eye=uEye;
  vec3 d=world-eye; float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);
  float right=d.x*cy-d.z*sy, forward=d.x*sy+d.z*cy;
  float y=d.y*cp-forward*sp, z=d.y*sp+forward*cp;
  float fovy=2.0*atan(uViewport.y/(2.0*uFocal));
  float fy=1.0/tan(fovy*0.5), fx=fy*uViewport.y/uViewport.x;
  float zz=(uFar+uNear)/(uFar-uNear)*z-(2.0*uFar*uNear)/(uFar-uNear);
  gl_Position=vec4(right*fx,y*fy,zz,z);
  vWorld=world; vNormal=normal; vColor=aColor; vEmissive=aEmissive; vSurface=aSurface; vAO=aAO; vDepth=z; vUV=aUV;
}`;

const FRAGMENT_SHADER = HOTEL_FRAGMENT_SHADER;

function compile(gl,type,source) {
  const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) { const message=gl.getShaderInfoLog(shader)||'unknown shader error'; gl.deleteShader(shader); throw new Error(`WebGL shader compilation failed: ${message}`); }
  return shader;
}
function program(gl) {
  let vs=null,fs=null,p=null;
  try{
    const gradients=!!(gl.getExtension?.('OES_standard_derivatives')&&gl.getExtension?.('EXT_shader_texture_lod'));
    const prefix=gradients?'#extension GL_OES_standard_derivatives : enable\n#extension GL_EXT_shader_texture_lod : enable\n#define HOTEL_GRADIENTS\n':'';
    vs=compile(gl,gl.VERTEX_SHADER,VERTEX_SHADER);fs=compile(gl,gl.FRAGMENT_SHADER,prefix+FRAGMENT_SHADER);p=gl.createProgram();
    gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(`WebGL program link failed: ${gl.getProgramInfoLog(p)||'unknown link error'}`);
    const attributes={};for(const name of ['aPosition','aNormal','aColor','aEmissive','aSurface','aAO','aUV'])attributes[name]=gl.getAttribLocation(p,name);
    const uniforms={};for(const name of ['uEye','uViewport','uFocal','uNear','uFar','uYaw','uPitch','uReflect','uHaze','uGrade','uLights[0]','uLightCount','uAtlas','uReflection','uScreenSize','uGrain','uReflectionReady','uMaterials','uNormals','uMaterialsReady','uEconomy'])uniforms[name]=gl.getUniformLocation(p,name);
    return {handle:p,attributes,uniforms,gradients};
  }catch(error){if(p)gl.deleteProgram(p);throw error;}
  finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);}
}

const GRADES={ lobby:[1.08,1.01,0.88], room:[1.07,.98,.88], corridor:[1.04,.99,.91], service:[.88,1.02,.91], 'service-corridor':[.88,1.02,.91], flooded:[.87,1.01,1.02], 'impossible-staircase':[.91,.99,1.04] };

export class WebGLRenderer {
  constructor(canvas,{quality='low',onMaterialsReady=()=>{}}={}) {
    if(!canvas||typeof canvas.getContext!=='function') throw new Error('WebGLRenderer requires a canvas.');
    this.canvas=canvas; this.quality=quality==='high'?'high':'low'; this.disposed=false; this.geometry=null; this.cacheKey=''; this.buffer=null; this.vertexCount=0; this.atlas=null; this.texture=null; this.lights=[]; this.reflectionTexture=null; this.reflectionFramebuffer=null; this.reflectionDepth=null; this.reflectionSize=''; this.needsReflection=false;this.grainTexture=null;this.materialTexture=null;this.normalTexture=null;this.materialsReady=false;
    const attrs={alpha:false,antialias:true,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'};
    this.gl=canvas.getContext('webgl',attrs)||canvas.getContext('experimental-webgl',attrs);
    if(!this.gl||typeof this.gl.createShader!=='function') throw new Error('WebGL is unavailable; graphics could not be initialized.');
    this.softwareRendering=false;
    try{const ext=this.gl.getExtension('WEBGL_debug_renderer_info');if(ext)this.softwareRendering=/swiftshader|llvmpipe|softpipe|software/i.test(this.gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));}catch{/* Capability detection is optional. */}
    this.stats={frames:0,lastRenderMs:0,polygons:0,backend:'webgl',bufferBytes:0};
    try { this.program=program(this.gl); this.makeGrainTexture(); this.resize(this.quality); this.loadMaterials(onMaterialsReady); }
    catch(error) { this.dispose(); throw error; }
  }
  resize(quality=this.quality) {
    if(this.disposed)return; this.quality=quality==='high'?'high':'low';
    this.frameRateLimit=this.quality==='high'?45:(this.softwareRendering?12:30);
    const size=backingSize(this.canvas.clientWidth||this.canvas.width||640,this.canvas.clientHeight||this.canvas.height||400,this.quality,this.softwareRendering);
    if(this.canvas.width!==size.width)this.canvas.width=size.width;
    if(this.canvas.height!==size.height)this.canvas.height=size.height;
    this.width=size.width;this.height=size.height;this.focal=cameraFocal(this.width,this.height);
    this.gl.viewport(0,0,this.width,this.height);
  }
  makeGrainTexture(){
    const gl=this.gl;this.grainTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.grainTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,64,64,0,gl.RGBA,gl.UNSIGNED_BYTE,surfaceNoisePixels());
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  }
  loadMaterials(onReady) {
    const gl=this.gl;
    const make=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,128,255]));return t;};
    this.materialTexture=make();this.normalTexture=make();
    if(typeof Image==='undefined')return;
    const load=(url,texture)=>new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>{
        if(this.disposed){resolve();return;}
        gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,this.program.gradients?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);
        const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        resolve();
      };image.onerror=reject;image.src=new URL(url,import.meta.url).href;
    });
    Promise.all([load('../assets/materials/atlas.jpg',this.materialTexture),load('../assets/materials/atlas-normal.jpg',this.normalTexture)]).then(()=>{
      if(!this.disposed){this.materialsReady=true;onReady();}
    }).catch(()=>{if(!this.disposed)console.warn('Hotel materials could not load; the untextured view remains available.');});
  }
  clearSceneResources() {
    const gl=this.gl;
    if(this.buffer){gl.deleteBuffer(this.buffer);this.buffer=null;}
    if(this.texture){gl.deleteTexture(this.texture);this.texture=null;}
    if(this.reflectionDepth){gl.deleteRenderbuffer(this.reflectionDepth);this.reflectionDepth=null;}
    if(this.reflectionFramebuffer){gl.deleteFramebuffer(this.reflectionFramebuffer);this.reflectionFramebuffer=null;}
    if(this.reflectionTexture){gl.deleteTexture(this.reflectionTexture);this.reflectionTexture=null;}
    this.reflectionSize='';this.needsReflection=false;
    this.atlas=null;this.vertexCount=0;this.stats.bufferBytes=0;
  }
  ensureReflectionTarget() {
    const gl=this.gl,aspect=this.width/this.height,rh=this.softwareRendering&&this.quality==='low'?128:256,rw=Math.max(128,Math.min(512,Math.round(rh*aspect))),size=`${rw}x${rh}`;
    if(this.reflectionSize===size)return !!this.reflectionFramebuffer;
    if(this.reflectionDepth)gl.deleteRenderbuffer(this.reflectionDepth);
    if(this.reflectionFramebuffer)gl.deleteFramebuffer(this.reflectionFramebuffer);
    if(this.reflectionTexture)gl.deleteTexture(this.reflectionTexture);
    gl.activeTexture(gl.TEXTURE1);this.reflectionSize=size;this.reflectionTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.reflectionTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,rw,rh,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.reflectionFramebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.reflectionFramebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.reflectionTexture,0);
    this.reflectionDepth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,this.reflectionDepth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,rw,rh);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,this.reflectionDepth);
    const ready=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindRenderbuffer(gl.RENDERBUFFER,null);
    if(!ready){gl.deleteFramebuffer(this.reflectionFramebuffer);gl.deleteRenderbuffer(this.reflectionDepth);gl.deleteTexture(this.reflectionTexture);this.reflectionFramebuffer=null;this.reflectionDepth=null;this.reflectionTexture=null;}
    return ready;
  }
  makeAtlas(texts,polygons) {
    if(!texts.length||!globalThis.document?.createElement)return;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.clearRect(0,0,512,256);ctx.textAlign='center';ctx.textBaseline='middle';
    const entries=[]; const limit=Math.min(texts.length,32);
    for(let i=0;i<limit;i++){
      const label=texts[i],col=i%4,row=Math.floor(i/4),x=col*128,y=row*32;
      ctx.font='600 17px Georgia, serif';ctx.fillStyle=label.color||'#29241b';
      ctx.fillText(String(label.text||'').slice(0,24),x+64,y+16,118);
      const width=Math.max(.22,Number(label.width)||.64),height=Math.max(.09,Number(label.size)||.14);
      const rx=Number.isFinite(label.right?.x)?label.right.x:1,rz=Number.isFinite(label.right?.z)?label.right.z:0,len=Math.hypot(rx,rz)||1,ux=rx/len,uz=rz/len;
      const center=label.at, normal={x:uz,y:0,z:-ux};
      const c={x:center.x+normal.x*.012,y:center.y+height*.5,z:center.z+normal.z*.012};
      const a={x:c.x-ux*width/2,y:c.y-height/2,z:c.z-uz*width/2},b={x:c.x+ux*width/2,y:c.y-height/2,z:c.z+uz*width/2};
      const d={x:c.x-ux*width/2,y:c.y+height/2,z:c.z-uz*width/2},e={x:c.x+ux*width/2,y:c.y+height/2,z:c.z+uz*width/2};
      polygons.push({points:[a,b,e,d],color:'#a18b5c',emissive:0,surface:'atlas',uvs:[[x/512,(y+32)/256],[(x+128)/512,(y+32)/256],[(x+128)/512,y/256],[x/512,y/256]]});
      entries.push(label);
    }
    this.atlas=canvas;return entries;
  }
  uploadScene(scene,state) {
    this.clearSceneResources();
    this.geometry=buildSceneGeometry(scene,{...state,openDoors:state.openDoors||{}});
    const allPolys=this.geometry.polygons,polys=allPolys.filter(p=>!(typeof p.color==='string'&&p.color.startsWith('rgba(')));
    this.needsReflection=String(scene?.kind||'').toLowerCase().includes('flood')||/flood/i.test(String(scene?.floor||''));
    this.lights=allPolys.filter(p=>p.light).slice(0,8).map(p=>[p.light.x,p.light.y,p.light.z,(p.light.power||1)*0.22]);
    this.makeAtlas(this.geometry.texts,polys);
    const lamps=allPolys.filter(p=>p.light).slice(0,8).map(p=>p.light);
    const lit=bakeLighting(polys,scene,lamps,{spacing:this.quality==='low'?1.3:.8});
    const packed=packSceneGeometry(lit); this.vertexCount=packed.vertexCount; this.stats.polygons=packed.vertexCount/3;
    const gl=this.gl;this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,packed.data,gl.STATIC_DRAW);
    this.stats.bufferBytes=packed.data.byteLength;
    if(this.atlas){this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.atlas);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
  }
  render(scene,state={},options={}) {
    if(this.disposed||!this.gl)return;
    const start=started(),doors=state.openDoors||{}, doorBits=(scene?.doors||[]).map(d=>doors[`${scene.id}:${d.id}`]?1:0).join('');
    const key=`${this.quality}|${scene?.id}|${state.visits?.[scene?.id]||1}|${doorBits}|${scene?.kind}|${scene?.width}|${scene?.depth}|${scene?.height}`;
    if(key!==this.cacheKey){this.uploadScene(scene,state);this.cacheKey=key;}
    const gl=this.gl,u=this.program.uniforms,a=this.program.attributes,p=this.program.handle;
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(.105,.12,.11,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    const stride=STRIDE*4, layout={aPosition:[3,0],aNormal:[3,3],aColor:[3,6],aEmissive:[1,9],aSurface:[1,10],aAO:[1,11],aUV:[2,12]};
    for(const [name,[size,offset]] of Object.entries(layout)){const loc=a[name];if(loc>=0){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,offset*4);}}
    const player=state.player||{},eye={x:Number(player.x)||0,y:sceneEyeHeight(scene,state),z:Number(player.z)||0};
    const reflected=String(scene?.kind||'').toLowerCase().includes('flood');
    gl.uniform3f(u.uEye,eye.x,eye.y,eye.z);gl.uniform1f(u.uNear,NEAR);gl.uniform1f(u.uFar,FAR);gl.uniform1f(u.uYaw,Number(player.yaw)||0);gl.uniform1f(u.uPitch,Number(player.pitch)||0);
    const kind=String(scene?.kind||'').toLowerCase(),grade=GRADES[kind]|| (kind.includes('service')?[.88,1.02,.91]:kind.includes('flood')?[.87,1.01,1.02]:[1,1,1]), haze=kind.includes('service')?[.045,.064,.055]:kind.includes('flood')?[.055,.075,.075]:[.065,.064,.055];
    gl.uniform3fv(u.uGrade,grade);gl.uniform3fv(u.uHaze,haze);gl.uniform1i(u.uLightCount,this.lights.length);gl.uniform1i(u.uMaterials,3);gl.uniform1i(u.uNormals,4);gl.uniform1f(u.uMaterialsReady,this.materialsReady?1:0);gl.uniform1f(u.uEconomy,this.softwareRendering&&this.quality==='low'?1:0);gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.materialTexture);gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,this.normalTexture);gl.uniform1i(u.uAtlas,0);gl.uniform1i(u.uReflection,1);gl.uniform1i(u.uGrain,2);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.grainTexture);
    const flat=new Float32Array(32);this.lights.forEach((l,i)=>flat.set(l,i*4));gl.uniform4fv(u['uLights[0]'],flat);
    if(this.texture){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);}
    gl.uniform1f(u.uReflectionReady,0);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.texture||this.grainTexture);
    if(reflected&&this.ensureReflectionTarget()){
      // Never sample a texture while it is also the active render target.
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.texture);
      const [rw,rh]=this.reflectionSize.split('x').map(Number);gl.bindFramebuffer(gl.FRAMEBUFFER,this.reflectionFramebuffer);gl.viewport(0,0,rw,rh);gl.clearColor(.12,.14,.13,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(u.uViewport,rw,rh);gl.uniform1f(u.uFocal,rh*this.focal/this.height);gl.uniform1f(u.uReflect,1);gl.drawArrays(gl.TRIANGLES,0,this.vertexCount);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.width,this.height);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.reflectionTexture);gl.uniform1f(u.uReflectionReady,1);
    }else{gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.texture||this.grainTexture);}
    gl.uniform2f(u.uViewport,this.width,this.height);gl.uniform2f(u.uScreenSize,this.width,this.height);gl.uniform1f(u.uFocal,this.focal);gl.uniform1f(u.uReflect,0);
    gl.clearColor(.105,.12,.11,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,this.vertexCount);
    this.stats.lastRenderMs=started()-start;this.stats.frames++;
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    if(this.gl){this.clearSceneResources();if(this.grainTexture)this.gl.deleteTexture(this.grainTexture);this.grainTexture=null;if(this.materialTexture)this.gl.deleteTexture(this.materialTexture);if(this.normalTexture)this.gl.deleteTexture(this.normalTexture);this.materialTexture=null;this.normalTexture=null;if(this.program?.handle)this.gl.deleteProgram(this.program.handle);}
    this.program=null;this.gl=null;this.geometry=null;this.canvas=null;this.cacheKey='';
  }
}
