// Irradiance and occlusion are baked on room changes, never on animation frames.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function visibility(p,light,boxes){
 const dx=light.x-p.x,dy=light.y-p.y,dz=light.z-p.z;
 for(const box of boxes){
  let lo=.004,hi=.995;
  for(let axis=0;axis<3;axis++){
   const start=axis===0?p.x:axis===1?p.y:p.z,delta=axis===0?dx:axis===1?dy:dz;
   if(Math.abs(delta)<1e-7){if(start<box.min[axis]||start>box.max[axis]){hi=-1;break;}}
   else {let a=(box.min[axis]-start)/delta,b=(box.max[axis]-start)/delta;if(a>b){const swap=a;a=b;b=swap;}lo=Math.max(lo,a);hi=Math.min(hi,b);}
   if(hi<lo)break;
  }
  if(hi>=lo)return 0;
 }
 return 1;
}
function occluders(scene){
 const boxes=[];
 for(const o of scene.objects||[]){
  if(!o.solid)continue;
  const w=o.w||.6,d=o.d||.6,h=o.h||1,y=o.y||0;
  if(o.type==='column'||o.type==='elevator'||o.type==='suitcase'||o.type==='bed')
   boxes.push({min:[o.x-w*.46,y+.02,o.z-d*.46],max:[o.x+w*.46,y+h,o.z+d*.46]});
  else if(o.type==='desk')boxes.push({min:[o.x-w*.5,y+h*.72,o.z-d*.5],max:[o.x+w*.5,y+h*.82,o.z+d*.5]});
  else if(o.type==='bench'||o.type==='chair')boxes.push({min:[o.x-w*.45,y+.44,o.z-d*.44],max:[o.x+w*.45,y+.65,o.z+d*.44]});
 }
 return boxes;
}
function normal(points){
 const a=points[0],b=points[1],c=points[2],u=[b.x-a.x,b.y-a.y,b.z-a.z],v=[c.x-a.x,c.y-a.y,c.z-a.z];
 const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n)||1;
 return n.map(x=>x/length);
}
function illumination(p,n,scene,lights,boxes){
 // All closed-room surfaces are two sided. Orient toward the interior before tracing.
 if((p.x<.1&&n[0]<0)||(p.x>scene.width-.1&&n[0]>0)||(p.z<.1&&n[2]<0)||(p.z>scene.depth-.1&&n[2]>0)||(p.y<.1&&n[1]<0)||(p.y>scene.height-.2&&n[1]>0))n=n.map(x=>-x);
 const q={x:p.x+n[0]*.025,y:p.y+n[1]*.025,z:p.z+n[2]*.025};
 const edge=Math.min(p.x,scene.width-p.x,p.z,scene.depth-p.z);
 let value=.19*(.58+.42*clamp(edge/.6,0,1));
 if(Math.abs(n[1])<.5)value*=.65+.35*clamp(p.y/.6,0,1);
 for(const light of lights){
  const dx=light.x-q.x,dy=light.y-q.y,dz=light.z-q.z,d2=dx*dx+dy*dy+dz*dz,len=Math.sqrt(d2)||1;
  const diffuse=Math.max(0,(n[0]*dx+n[1]*dy+n[2]*dz)/len);
  if(diffuse<.001)continue;
  let vis=0;
  for(const point of light.samples)vis+=visibility(q,point,boxes);
  value+=(light.power||4)*.45*diffuse/(1+d2*.17)*(vis/3);
 }
 return clamp(value,.07,1.8);
}
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export function bakeLighting(polygons,scene,lights,{spacing=.8}={}){
 const out=[],boxes=occluders(scene),caches=Array.from({length:6},()=>new Map());
 spacing=clamp(Number(spacing)||.8,.65,2);
 const emitters=lights.map(light=>({...light,samples:[-.24,0,.24].map(offset=>({x:light.x+offset,y:light.y,z:light.z+offset*.5}))}));
 const sample=(p,n)=>{
  const axis=Math.abs(n[0])>.999?0:Math.abs(n[1])>.999?1:Math.abs(n[2])>.999?2:-1;
  if(axis<0)return illumination(p,n,scene,emitters,boxes);
  const cache=caches[axis*2+(n[axis]<0?1:0)];
  // Integer millimetres avoid allocating strings on every shared mesh vertex.
  const key=(Math.round(p.x*1000)+1000)*1e10+(Math.round(p.y*1000)+1000)*1e5+Math.round(p.z*1000)+1000;
  if(!cache.has(key))cache.set(key,illumination(p,n,scene,emitters,boxes));
  return cache.get(key);
 };
 for(const face of polygons){
  const p=face.points,n=normal(p);
  const tiled=['wallpaper','carpet','wood','plaster','stone','floor'].includes(face.surface)&&p.length===4&&!face.emissive;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
  const nx=tiled?Math.min(64,Math.max(1,Math.ceil(distance(p[0],p[1])/spacing))):1;
  const ny=tiled?Math.min(64,Math.max(1,Math.ceil(distance(p[0],p[3])/spacing))):1;
  if(nx*ny===1){out.push({...face,irradiance:p.map(v=>sample(v,n))});continue;}
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
   const at=(u,v)=>lerp(lerp(p[0],p[1],u),lerp(p[3],p[2],u),v);
   const points=[at(x/nx,y/ny),at((x+1)/nx,y/ny),at((x+1)/nx,(y+1)/ny),at(x/nx,(y+1)/ny)];
   out.push({...face,points,irradiance:points.map(v=>sample(v,n))});
  }
 }
 return out;
}
