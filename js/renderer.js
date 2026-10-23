const NEAR = 0.16;
const LOW = { width: 900, area: 550000 };
const HIGH = { width: 1400, area: 1200000 };
const HOTEL = { cream: '#b3ad91', olive: '#5a6654', carpet: '#544939', shadow: '#161b18', brass: '#b19d6b', lamp: '#e0e8c7', skirting: '#493a2d' };

const point = (x, y, z) => ({ x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0 });
const poly = (out, points, color, extra = {}) => out.push({ points: points.map(p => point(p.x, p.y, p.z)), color, ...extra });
const quad = (out, a, b, c, d, color, extra) => poly(out, [a, b, c, d], color, extra);

export function projectCameraPoint(p, viewport) {
  const focal = viewport.focal ?? Math.min(viewport.width, viewport.height) * 0.92;
  return { x: viewport.width / 2 + p.x * focal / p.z, y: viewport.height / 2 - p.y * focal / p.z, z: p.z };
}

export function clipPolygonNearPlane(vertices, near = NEAR) {
  if (!vertices?.length) return [];
  const result = [];
  let previous = vertices[vertices.length - 1];
  let prevInside = previous.z >= near;
  for (const current of vertices) {
    const inside = current.z >= near;
    if (inside !== prevInside) {
      const t = (near - previous.z) / (current.z - previous.z);
      result.push({ x: previous.x + (current.x - previous.x) * t, y: previous.y + (current.y - previous.y) * t, z: near });
    }
    if (inside) result.push({ x: current.x, y: current.y, z: current.z });
    previous = current;
    prevInside = inside;
  }
  return result;
}

function safeDim(value, fallback) { return Number.isFinite(+value) && +value > 0 ? +value : fallback; }
function doorPosition(scene, door) {
  const w = safeDim(scene.width, 8), d = safeDim(scene.depth, 12), offset = Number(door.offset) || 0;
  if (door.wall === 'north') return { x: offset, z: d };
  if (door.wall === 'south') return { x: offset, z: 0 };
  if (door.wall === 'east') return { x: w, z: offset };
  return { x: 0, z: offset };
}
function wallPoint(wall, along, y, width, depth) {
  if (wall === 'north') return point(along, y, depth);
  if (wall === 'south') return point(along, y, 0);
  if (wall === 'east') return point(width, y, along);
  return point(0, y, along);
}
function addBox(out, x, y, z, w, h, d, color, extra = {}) {
  const x0 = x - w / 2, x1 = x + w / 2, y0 = y, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2;
  const p000 = point(x0, y0, z0), p100 = point(x1, y0, z0), p110 = point(x1, y1, z0), p010 = point(x0, y1, z0);
  const p001 = point(x0, y0, z1), p101 = point(x1, y0, z1), p111 = point(x1, y1, z1), p011 = point(x0, y1, z1);
  const faces = [[p000,p100,p110,p010], [p101,p001,p011,p111], [p001,p000,p010,p011], [p100,p101,p111,p110], [p010,p110,p111,p011], [p001,p101,p100,p000]];
  for (let i = 0; i < faces.length; i++) poly(out, [...faces[i]].reverse(), color, { ...extra, shade: [0.82, 0.68, 0.74, 0.62, 1.12, 0.48][i] });
}
function addBeam(out, a, b, width, depth, color, surface) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz) || 1;
  const ux = dx / len, uy = dy / len, uz = dz / len;
  let vx = -uz, vy = 0, vz = ux, vl = Math.hypot(vx, vz) || 1;
  vx /= vl; vz /= vl;
  const wx = uy * vz, wy = uz * vx - ux * vz, wz = -uy * vx;
  const corners = [];
  for (const along of [-len/2, len/2]) for (const side of [-width/2, width/2]) for (const up of [-depth/2, depth/2]) {
    corners.push(point((a.x+b.x)/2 + ux*along + vx*side + wx*up, (a.y+b.y)/2 + uy*along + vy*side + wy*up, (a.z+b.z)/2 + uz*along + vz*side + wz*up));
  }
  // Eight corners are indexed as along, side, height.
  const f = [[0,2,3,1],[4,5,7,6],[0,1,5,4],[2,6,7,3],[0,4,6,2],[1,3,7,5]];
  for (const face of f) poly(out, [...face].reverse().map(i => corners[i]), color, surface ? { surface } : {});
}

function addDoor(out, texts, scene, door, state, w, d, h) {
  const pos = doorPosition(scene, door), width = safeDim(door.width, 1.5), height = Math.min(2.28, h - 0.24);
  const elevator=door.style==='elevator'||String(door.label||'').toUpperCase()==='ELEVATOR';
  const alongX = door.wall === 'north' || door.wall === 'south';
  const towardInterior = door.wall === 'north' ? -1 : door.wall === 'south' ? 1 : door.wall === 'east' ? -1 : 1;
  const cx = pos.x, cz = pos.z, depth = 0.16, centerX = cx, centerZ = cz;
  const sideOffset = towardInterior * 0.13;
  const doorCenter = { x: cx + (alongX ? 0 : sideOffset), z: cz + (alongX ? sideOffset : 0) };
  const frameColor = elevator?'#555b55':'#594736';
  for (const sign of [-1, 1]) {
    const at = sign * (width / 2 + 0.09);
    if (alongX) addBox(out, centerX + at, 0, centerZ + sideOffset, 0.13, height + 0.12, depth, '#746047', { surface: elevator ? 'metal' : 'wood' });
    else addBox(out, centerX + sideOffset, 0, centerZ + at, depth, height + 0.12, 0.13, '#746047', { surface: elevator ? 'metal' : 'wood' });
  }
  if (alongX) addBox(out, centerX, height, centerZ + sideOffset, width + 0.31, 0.14, depth, '#746047', { surface: elevator ? 'metal' : 'wood' });
  else addBox(out, centerX + sideOffset, height, centerZ, depth, 0.14, width + 0.31, '#746047', { surface: elevator ? 'metal' : 'wood' });
  if (!elevator) {
    const radius=width*.52, archPlane=(alongX?centerZ+sideOffset:centerX+sideOffset)+towardInterior*.045;
    for(let i=0;i<6;i++) {
      const a=Math.PI-i*Math.PI/6,b=Math.PI-(i+1)*Math.PI/6;
      const pa=alongX?point(cx+Math.cos(a)*radius,height+Math.sin(a)*.22,archPlane):point(archPlane,height+Math.sin(a)*.22,cz+Math.cos(a)*radius);
      const pb=alongX?point(cx+Math.cos(b)*radius,height+Math.sin(b)*.22,archPlane):point(archPlane,height+Math.sin(b)*.22,cz+Math.cos(b)*radius);
      addBeam(out,pa,pb,.075,.075,'#92784e','wood');
    }
  }
  const open = !!state?.openDoors?.[`${scene.id}:${door.id}`];
  if(open&&elevator) {
    const portalDepth=towardInterior*.34;
    if(alongX) {
      quad(out,point(cx-width*.43,.04,cz+portalDepth),point(cx+width*.43,.04,cz+portalDepth),point(cx+width*.43,height-.04,cz+portalDepth),point(cx-width*.43,height-.04,cz+portalDepth),'#292e2a');
      for(const side of [-1,1]) addBox(out,cx+side*width*.43,.05,cz+sideOffset,width*.13,height-.1,.08,'#747568',{surface:'metal'});
    } else {
      quad(out,point(cx+portalDepth,.04,cz-width*.43),point(cx+portalDepth,.04,cz+width*.43),point(cx+portalDepth,height-.04,cz+width*.43),point(cx+portalDepth,height-.04,cz-width*.43),'#292e2a',{surface:'metal'});
      for(const side of [-1,1]) addBox(out,cx+sideOffset,.05,cz+side*width*.43,.08,height-.1,width*.13,'#747568',{surface:'metal'});
    }
  } else if (open) {
    const hingeX = doorCenter.x - (alongX ? width/2 : 0), hingeZ = doorCenter.z - (alongX ? 0 : width/2);
    const angle = (alongX ? -towardInterior : towardInterior) * Math.PI * 0.43;
    const end = { x: hingeX + (alongX ? Math.cos(angle) : Math.sin(angle)) * width, z: hingeZ + (alongX ? -Math.sin(angle) : Math.cos(angle)) * width };
    addBeam(out, point(hingeX, 0, hingeZ), point(end.x, 0, end.z), 0.1, 0.1, frameColor);
    addBeam(out, point(hingeX, height, hingeZ), point(end.x, height, end.z), 0.1, 0.1, frameColor);
    addBeam(out, point(end.x, 0, end.z), point(end.x, height, end.z), 0.1, 0.1, frameColor);
    const tx=(end.x-hingeX)/width, tz=(end.z-hingeZ)/width, nx=-tz, nz=tx;
    const leafFace=(offset,color)=>quad(out,
      point(hingeX+nx*offset,.04,hingeZ+nz*offset),point(end.x+nx*offset,.04,end.z+nz*offset),
      point(end.x+nx*offset,height-.04,end.z+nz*offset),point(hingeX+nx*offset,height-.04,hingeZ+nz*offset),color);
    leafFace(-.045,'#674d38'); leafFace(.045,'#795a3f');
    for(const edge of [0,1]) {
      const ex=edge?end.x:hingeX, ez=edge?end.z:hingeZ;
      quad(out,point(ex-nx*.045,0.04,ez-nz*.045),point(ex+nx*.045,0.04,ez+nz*.045),point(ex+nx*.045,height-.04,ez+nz*.045),point(ex-nx*.045,height-.04,ez-nz*.045),'#523e2e');
    }
    for(const py of [.42,1.12,1.64]) {
      const y1=py, y2=py+(py===.42?.5:.34), inset=.16;
      const a=point(hingeX+tx*inset+nx*.049,y1,hingeZ+tz*inset+nz*.049), b=point(end.x-tx*inset+nx*.049,y1,end.z-tz*inset+nz*.049);
      const c=point(b.x,y2,b.z), e=point(a.x,y2,a.z); quad(out,a,b,c,e,'#89664a');
    }
  } else if(elevator) {
    const metal='#727568', inset='#555a53', seam='#41463f';
    if(alongX) {
      for(const side of [-1,1]) {
        addBox(out,doorCenter.x+side*width*.247,.06,doorCenter.z,width*.49,height-.08,.08,metal,{surface:'metal'});
        addBox(out,doorCenter.x+side*width*.247,.16,doorCenter.z+towardInterior*.052,width*.39,height-.31,.025,inset,{surface:'metal'});
        addBox(out,doorCenter.x+side*width*.247,1.95,doorCenter.z+towardInterior*.052,width*.39,.035,.028,'#97917b');
      }
      addBox(out,doorCenter.x,.06,doorCenter.z+towardInterior*.05,.035,height-.08,.09,seam,{surface:'metal'});
      addBox(out,doorCenter.x+width*.5+.14,1.63,doorCenter.z+towardInterior*.09,.13,.38,.06,'#494b43',{surface:'metal'});
      addBox(out,doorCenter.x+width*.5+.14,1.72,doorCenter.z+towardInterior*.13,.055,.08,.025,'#d5dfa9',{emissive:.85});
    } else {
      for(const side of [-1,1]) {
        addBox(out,doorCenter.x,.06,doorCenter.z+side*width*.247,.08,height-.08,width*.49,metal,{surface:'metal'});
        addBox(out,doorCenter.x+towardInterior*.052,.16,doorCenter.z+side*width*.247,.025,height-.31,width*.39,inset,{surface:'metal'});
        addBox(out,doorCenter.x+towardInterior*.052,1.95,doorCenter.z+side*width*.247,.028,.035,width*.39,'#97917b',{surface:'metal'});
      }
      addBox(out,doorCenter.x+towardInterior*.05,.06,doorCenter.z,.09,height-.08,.035,seam,{surface:'metal'});
      addBox(out,doorCenter.x+towardInterior*.09,1.63,doorCenter.z+width*.5+.14,.06,.38,.13,'#494b43',{surface:'metal'});
      addBox(out,doorCenter.x+towardInterior*.13,1.72,doorCenter.z+width*.5+.14,.025,.08,.055,'#d5dfa9',{emissive:.85,surface:'metal'});
    }
  } else {
    if (alongX) addBox(out, doorCenter.x, 0.06, doorCenter.z, width, height - 0.08, 0.08, '#71543b', { surface: 'wood' });
    else addBox(out, doorCenter.x, 0.06, doorCenter.z, 0.08, height - 0.08, width, '#71543b', { surface: 'wood' });
    const panelOffset = towardInterior * 0.052;
    for (const py of [0.45, 1.15, 1.67]) {
      const ph = py === 0.45 ? 0.55 : 0.39;
      if (alongX) addBox(out, doorCenter.x, py, doorCenter.z + panelOffset, width * 0.7, ph, 0.025, '#805f41', { surface: 'wood' });
      else addBox(out, doorCenter.x + panelOffset, py, doorCenter.z, 0.025, ph, width * 0.7, '#805f41', { surface: 'wood' });
    }
    const knobX = doorCenter.x + (alongX ? width * 0.34 : towardInterior * 0.085);
    const knobZ = doorCenter.z + (alongX ? towardInterior * 0.085 : width * 0.34);
    addBox(out, knobX, 0.98, knobZ, 0.09, 0.09, 0.09, HOTEL.brass, { emissive: 0.1, surface: 'metal' });
    const plateX=doorCenter.x+(alongX?width*.34:towardInterior*.051), plateZ=doorCenter.z+(alongX?towardInterior*.051:width*.34);
    addBox(out,plateX,.98,plateZ,alongX?.11:.028,.20,alongX?.028:.11,HOTEL.brass,{surface:'metal'});
    if(alongX) addBeam(out,point(plateX,.99,plateZ),point(plateX-width*.035,.99,plateZ+towardInterior*.09),.026,.026,HOTEL.brass,'metal');
    else addBeam(out,point(plateX,.99,plateZ),point(plateX+towardInterior*.09,.99,plateZ-width*.035),.026,.026,HOTEL.brass,'metal');
    addBox(out,plateX,.78,plateZ,alongX?.025:.018,.055,alongX?.018:.025,'#30271c',{surface:'metal'});
  }
  // Raised brass number plate and modeled molding keep the doorway legible at a distance.
  if (alongX) addBox(out, cx, 2.03, cz + sideOffset + towardInterior*0.07, 0.66, 0.20, 0.035, HOTEL.brass, { emissive: 0.1, surface: 'metal' });
  else addBox(out, cx + sideOffset + towardInterior*0.07, 2.03, cz, 0.035, 0.20, 0.66, HOTEL.brass, { emissive: 0.1, surface: 'metal' });
  const label = String(door.label ?? door.id ?? '').trim().slice(0, 12);
  if (label) texts.push({ text: label, at: point(cx + (alongX ? 0 : sideOffset + towardInterior*0.1), 2.07, cz + (alongX ? sideOffset + towardInterior*0.1 : 0)), right: alongX ? {x:door.wall==='south'?-1:1,z:0} : {x:0,z:door.wall==='east'?-1:1}, color:'#29241b', size:0.16, width:.6 });
}

function addWall(out, wall, w, d, h, doors, color, low, bandBottom, bandTop, wallSurface='wallpaper', lowerSurface='wood') {
  const horizontal = wall === 'north' || wall === 'south', span = horizontal ? w : d;
  const inset = wall === 'north' ? -1 : wall === 'south' ? 1 : wall === 'east' ? -1 : 1;
  const relevant = doors.filter(door => door.wall === wall).map(door => ({
    start: Math.max(0, door.offset - safeDim(door.width, 1.5)/2 - 0.11),
    end: Math.min(span, door.offset + safeDim(door.width, 1.5)/2 + 0.11),
    top: Math.min(2.28, h - 0.24)
  })).sort((a,b)=>a.start-b.start);
  const face = (a,b,y0,y1,c,surface) => {
    if (b-a < 0.02 || y1-y0 < 0.02) return;
    quad(out,wallPoint(wall,a,y0,w,d),wallPoint(wall,b,y0,w,d),wallPoint(wall,b,y1,w,d),wallPoint(wall,a,y1,w,d),c,{surface});
  };
  const spans=[]; let cursor=0;
  for(const r of relevant) { if (r.start>cursor) spans.push([cursor,r.start]); cursor=Math.max(cursor,r.end); }
  if(cursor<span) spans.push([cursor,span]);
  for(const [a,b] of spans) {
    face(a,b,0,bandBottom,low,lowerSurface);
    face(a,b,bandTop,h,color,wallSurface);
    for(const y of [0.12,bandBottom,bandTop]) {
      const thick=y===0.12?.12:.055, centerY=y===bandBottom?y+.018:y===bandTop?y-.018:y;
      const along=(a+b)/2, length=b-a;
      if(horizontal) addBox(out,along,centerY,wall==='north'?d-.05:wall==='south'?.05:0,length,thick,.09,'#897553',{surface:'wood'});
      else addBox(out,wall==='east'?w-.05:.05,centerY,along,.09,thick,length,'#897553',{surface:'wood'});
    }
    // Recessed panel fields and raised stiles provide real depth without duplicate coplanar faces.
    const bays=Math.max(1,Math.floor((b-a)/1.25)), bay=(b-a)/bays;
    for(let i=0;i<bays;i++) {
      const center=a+(i+.5)*bay, bw=Math.max(.36,bay-.20), by=.20, bh=Math.max(.38,bandBottom-.32);
      const z=wall==='north'?d-.035:wall==='south'?.035:0, x=wall==='east'?w-.035:wall==='west'?.035:0;
      if(horizontal) {
        const plane=wall==='north'?d+inset*.01:inset*.01;
        quad(out,point(center-bw/2,by,plane),point(center+bw/2,by,plane),point(center+bw/2,by+bh,plane),point(center-bw/2,by+bh,plane),low,{surface:lowerSurface});
        for(const edge of [-1,1]) addBox(out,center+edge*bw/2,by,wall==='north'?d-.055:.055,.055,bh,.045,'#756347',{surface:'wood'});
        for(const yy of [by,by+bh]) addBox(out,center,yy,wall==='north'?d-.055:.055,bw,.055,.045,'#756347',{surface:'wood'});
      } else {
        const plane=wall==='east'?w-.035:.035;
        quad(out,point(plane,by,center-bw/2),point(plane,by,center+bw/2),point(plane,by+bh,center+bw/2),point(plane,by+bh,center-bw/2),low,{surface:lowerSurface});
        for(const edge of [-1,1]) addBox(out,wall==='east'?w-.055:.055,by,center+edge*bw/2,.045,bh,.055,'#756347',{surface:'wood'});
        for(const yy of [by,by+bh]) addBox(out,wall==='east'?w-.055:.055,yy,center,.045,.055,bw,'#756347',{surface:'wood'});
      }
    }
  }
  // Door lintels are the only wall faces across the opening; keep every reveal clear below.
  for(const r of relevant) face(r.start,r.end,r.top,h,color,wallSurface);
}

function addCarpet(out, w, d, flooded, scene) {
  const kind=String(scene?.kind||'').toLowerCase(), carpet=['corridor','guestroom','room','unlisted','lobby'].includes(kind), color=scene?.colors?.floor||HOTEL.carpet;
  const inset=kind==='lobby'?1.1:0.34, baseSurface='stone';
  quad(out,point(0,0.001,0),point(w,0.001,0),point(w,0.001,d),point(0,0.001,d),flooded?'#424b46':color,{surface:baseSurface});
  if(flooded){quad(out,point(inset,0.012,inset),point(w-inset,0.012,inset),point(w-inset,0.012,d-inset),point(inset,0.012,d-inset),'#58635e',{surface:'water'});return;}
  if(!carpet) {
    return;
  }
  const runner=kind==='corridor', left=runner?Math.max(inset,w*.19):inset,right=runner?Math.min(w-inset,w*.81):w-inset;
  quad(out,point(left,0.012,inset),point(right,0.012,inset),point(right,0.012,d-inset),point(left,0.012,d-inset),color,{surface:'carpet'});
  for (const [x,z,ww,dd,c] of [[inset, inset, w-2*inset,0.12,'#857552'],[inset,d-inset-0.12,w-2*inset,0.12,'#857552'],[inset,inset,0.12,d-2*inset,'#857552'],[w-inset-0.12,inset,0.12,d-2*inset,'#857552']]) {
    if(!runner) quad(out,point(x,0.025,z),point(x+ww,0.025,z),point(x+ww,0.025,z+dd),point(x,0.025,z+dd),c,{surface:'carpet'});
  }
  if(runner){
    for(const x of [left,left+.08,right-.08,right]) quad(out,point(x,0.025,inset),point(x+.025,0.025,inset),point(x+.025,0.025,d-inset),point(x,0.025,d-inset),'#917c52',{surface:'carpet'});
    return;
  }
  // The locally packaged woven texture supplies the pattern without floating decals.
}

function addLight(out, x, z, ceiling, warm=false, width=12) {
  const color=warm?'#d0bd8a':HOTEL.lamp, fixtureY=ceiling>5?4.15:ceiling-.12;
  if(ceiling>5) addBeam(out,point(x,ceiling-.08,z),point(x,fixtureY+.12,z),.035,.035,'#85795f','metal');
  quad(out,point(x-0.62,fixtureY-0.035,z-0.19),point(x+0.62,fixtureY-0.035,z-0.19),point(x+0.62,fixtureY-0.035,z+0.19),point(x-0.62,fixtureY-0.035,z+0.19),'#554f42',{surface:'metal'});
  quad(out,point(x-0.54,fixtureY-0.055,z-0.13),point(x+0.54,fixtureY-0.055,z-0.13),point(x+0.54,fixtureY-0.055,z+0.13),point(x-0.54,fixtureY-0.055,z+0.13),color,{surface:'metal',emissive:1.25,light:{x,y:fixtureY-0.055,z,power:4.8,radius:8}});
  // Pale, subtle pools of fluorescent spill on the nearest wall surfaces.
  for(const wall of ['east','west']) {
    const wallX=wall==='east'?width-.015:.015;
    quad(out,point(wallX,1.05,z-1.25),point(wallX,1.05,z+1.25),point(wallX,2.65,z+1.25),point(wallX,2.65,z-1.25),warm?'rgba(191,174,128,0.10)':'rgba(204,217,183,0.12)',{emissive:0.2});
  }
}

function addFurniture(out, texts, object, scene) {
  const x=Number(object.x)||0, z=Number(object.z)||0, w=safeDim(object.w,1), d=safeDim(object.d,0.7), h=safeDim(object.h,1), type=object.type||'cabinet';
  const wood='#604a36', darkwood='#42362a', brass=HOTEL.brass, cream='#9d9276';
  const baseY=Number(object.y)||0;
  const box=(ox,oy,oz,bw,bh,bd,c,e)=>addBox(out,x+ox,baseY+oy,z+oz,bw,bh,bd,c,{surface:type==='column'?'stone':(['elevator','pipe','rail'].includes(type)?'metal':'wood'),...(e||{})});
  if(type==='desk') {
    box(0,h*0.72,0,w,h*0.1,d,wood); box(-w*.37,0,-d*.34,w*.13,h*.72,d*.13,darkwood); box(w*.37,0,-d*.34,w*.13,h*.72,d*.13,darkwood);
    box(0,h*.39,-d*.44,w*.78,h*.36,.07,'#67513b'); box(0,h*.72,d*.22,w*.6,.03,.08,brass);
    box(-w*.23,h*.82,0,.3,.1,.22,'#ded4b4'); box(w*.16,h*.82,-d*.16,.13,.18,.12,'#aaa08a');
    box(0,h*.82,d*.38,.26,.05,.13,'#343631');
  } else if(type==='suitcase') {
    box(0,.18,0,w,.36,d,'#534537'); box(0,.39,0,w*.88,.07,d*.86,'#705a41');
    box(-w*.18,.47,0,w*.12,.12,.07,'#a18b5c'); box(w*.18,.47,0,w*.12,.12,.07,'#a18b5c');
    box(0,.53,-d*.18,w*.32,.045,.06,'#a18b5c');
  } else if(type==='column') {
    const radius=Math.min(w,d)*.44, cx=x, cz=z, sides=8;
    addBox(out,cx,.02,cz,w*1.18,.12,d*1.18,'#655440');
    for(let i=0;i<sides;i++) { const a=i*Math.PI*2/sides,b=(i+1)*Math.PI*2/sides;
      quad(out,point(cx+Math.cos(a)*radius,.12,cz+Math.sin(a)*radius),point(cx+Math.cos(a)*radius,h-.13,cz+Math.sin(a)*radius),point(cx+Math.cos(b)*radius,h-.13,cz+Math.sin(b)*radius),point(cx+Math.cos(b)*radius,.12,cz+Math.sin(b)*radius),i%2?'#81785f':'#a69a79',{surface:'stone'}); }
    addBox(out,cx,h-.16,cz,w*1.18,.13,d*1.18,'#756449'); addBox(out,cx,h-.025,cz,w*1.36,.14,d*1.36,'#9a885f');
  } else if(type==='bed') {
    box(0,.32,0,w*.94,.3,d*.92,'#c2b8a0',{surface:'fabric'}); box(0,.52,-d*.27,w*.9,.17,d*.19,wood); box(0,.5,d*.08,w*.88,.16,d*.58,'#9c9c86',{surface:'fabric'});
    box(-w*.25,.65,-d*.22,w*.27,.12,.24,'#d0c5aa',{surface:'fabric'}); box(w*.25,.65,-d*.22,w*.27,.12,.24,'#c0b49a',{surface:'fabric'});
    for(const sx of [-.4,.4]) for(const sz of [-.38,.38]) box(sx*w,.0,sz*d,.09,.32,.09,darkwood);
    box(0,.83,-d*.42,w*.92,.07,.1,wood);
    const duvet=(u,v)=>point(x+(u-.5)*w*.90,.665+Math.sin(u*Math.PI)*.065+Math.sin(v*13+u*3)*.008,z+d*(-.18+v*.56));
    for(let a=0;a<10;a++)for(let b=0;b<8;b++)quad(out,duvet(a/10,b/8),duvet(a/10,(b+1)/8),duvet((a+1)/10,(b+1)/8),duvet((a+1)/10,b/8),'#a4a18b',{surface:'fabric'});
  } else if(type==='chair') {
    box(0,.47,0,w*.78,.11,d*.72,wood); box(0,.58,-d*.28,w*.74,h*.43,.09,'#776046');
    for(const sx of [-.34,.34]) for(const sz of [-.28,.28]) box(sx*w,.02,sz*d,.08,.47,.08,darkwood);
    box(-w*.44,.65,0,.07,.38,d*.65,wood); box(w*.44,.65,0,.07,.38,d*.65,wood);
  } else if(type==='bench') {
    box(0,.52,0,w,.13,d,wood); box(0,.68,-d*.42,w*.92,.22,.1,'#74583f');
    for(const sx of [-.4,.4]) for(const sz of [-.35,.35]) box(sx*w,.05,sz*d,.09,.47,.09,darkwood);
    box(-w*.37,.42,0,.09,.19,d*.92,brass); box(w*.37,.42,0,.09,.19,d*.92,brass);
  } else if(type==='plant') {
    box(0,0,0,w*.52,.4,d*.52,'#805b42'); box(0,.4,0,w*.4,.05,d*.4,'#332d22');
    for(let i=0;i<7;i++) { const a=i*2.399, rr=(i%3)*.09; addBeam(out,point(x,0.42,z),point(x+Math.cos(a)*rr,.85+(i%4)*.12,z+Math.sin(a)*rr),.035,.035,'#42523c');
      const lx=x+Math.cos(a)*rr, lz=z+Math.sin(a)*rr; addBox(out,lx,.82+(i%4)*.12,lz,.22,.13,.08,'#617354'); }
  } else if(type==='telephone') {
    box(0,0,0,Math.max(w,.5)*.78,.78,Math.max(d,.4)*.78,darkwood);
    box(0,.78,0,.43,.13,.36,wood); box(0,.86,0,.28,.2,.25,'#292b28');
    box(-.27,.87,0,.1,.24,.1,brass); box(.27,.87,0,.1,.24,.1,brass);
    box(0,1.03,-.08,.44,.04,.33,'#d0c7ac');
  } else if(type==='clock' || type==='wall-clock') {
    const radius=Math.min(w,h)*.46,cy=baseY+h*.5,front=z-d*.5-.015;
    box(0,0,0,w,h,d,darkwood);
    const ring=[];for(let i=0;i<20;i++){const a=i*Math.PI/10;ring.push(point(x+Math.cos(a)*radius,cy+Math.sin(a)*radius,front));}
    poly(out,ring,'#c6bea4');
    const hand=(angle,length,thick)=>{const dx=Math.sin(angle)*length,dy=Math.cos(angle)*length,px=Math.cos(angle)*thick,py=-Math.sin(angle)*thick;
      quad(out,point(x-px,cy-py,front-.01),point(x+px,cy+py,front-.01),point(x+dx+px,cy+dy+py,front-.01),point(x+dx-px,cy+dy-py,front-.01),'#343c34');};
    const rotation=String(object.text||'').includes('upside down')?Math.PI:0;
    hand((2+14/60)*Math.PI/6+rotation,radius*.57,.012);hand(14*Math.PI/30+rotation,radius*.83,.009);
    texts.push({text:String(object.number||'2:14'),at:point(x,baseY+.015,front-.012),right:{x:1,z:0},color:'#d3c599',size:Math.min(.10,h*.18),width:w*.8});
  } else if(type==='card') {
    box(0,0,0,w,h,d,'#d4c8a4');
    texts.push({text:String(object.number||''),at:point(x,baseY+.012,z-d*.5-.016),right:{x:1,z:0},color:'#463b2b',size:Math.max(.05,h*.72),width:w*.86});
  } else if(type==='bell') {
    box(0,0,0,w,.035,d,brass);box(0,.035,0,w*.82,h*.58,d*.82,'#af975e');box(0,h*.58,0,w*.34,h*.2,d*.34,'#c3af74');
  } else if(type==='window') {
    const wh=Math.min(h,Math.max(.6,scene.height-baseY-.15));
    box(0,0,0,w,wh,d,'#675e4d');
    box(0,.10,-d*.55,w-.18,wh-.2,.025,'#8dafa9',{emissive:.38});
    for(const xx of [-w*.32,0,w*.32])box(xx,.08,-d*.75,.065,wh-.16,.07,'#b5aa8e');
    box(0,wh*.5,-d*.76,w-.1,.07,.075,'#a3987d');
  } else if(type==='mirror') {
    box(0,h*.55,0,w,h,.11,wood); box(0,h*.58,.065,w*.77,h*.78,.025,'#66685f',{emissive:.14});
    box(-w*.42,.06,.08,.08,.12,.06,brass); box(w*.42,.06,.08,.08,.12,.06,brass);
  } else if(type==='mark') {
    const sw=scene.width,sd=scene.depth,c='#879b91',lo=.16,hi=.18;
    for(const zz of [.025,sd-.025])quad(out,point(.025,lo,zz),point(sw-.025,lo,zz),point(sw-.025,hi,zz),point(.025,hi,zz),c);
    for(const xx of [.025,sw-.025])quad(out,point(xx,lo,.025),point(xx,lo,sd-.025),point(xx,hi,sd-.025),point(xx,hi,.025),c);
  } else if(type==='pipe') {
    for(let i=-1;i<=1;i++) { box(i*w*.3,0,0,.1,h,d*.14,'#777767'); box(i*w*.3,h*.8,0,.12,.07,d*.26,'#8b876d'); }
    box(0,h*.43,0,w,.08,d*.22,'#6b6b5c');
  } else if(type==='rail') {
    for(const sx of [-.42,.42]) box(sx*w,0,0,.07,h*.83,.07,'#655541');
    box(0,h*.8,0,w,.09,.12,'#746044'); box(0,h*.7,d*.35,w,.04,.06,'#907850');
  } else if(type==='sign') {
    box(0,0,0,.07,h*.65,.07,darkwood); box(0,h*.63,0,w,h*.37,.07,'#c4b99d');
    box(0,h*.82,.05,w*.78,.035,.02,brass);
    texts.push({text:String(object.number||object.text||'').split(/[.\n]/)[0].slice(0,12),at:point(x,baseY+h*.82,z-.055),right:{x:1,z:0},color:'#3c3529',size:.13,width:w*.84});
  } else if(type==='elevator') {
    box(0,0,0,w,h,d,'#77684f'); box(0,.04,d*.51,w*.84,h*.91,.06,'#4e5149',{surface:'metal'});
    box(-w*.22,.06,d*.55,w*.41,h*.87,.025,'#6f725f',{surface:'metal'}); box(w*.22,.06,d*.55,w*.41,h*.87,.025,'#625f4e',{surface:'metal'});
    box(w*.44,h*.52,d*.59,.055,.25,.045,brass); box(w*.47,h*.52,d*.61,.09,.07,.05,'#d5d5b8',{emissive:.6});
    texts.push({text:'LIFT',at:point(x, h*.96, z+d*.57),right:{x:1,z:0},color:'#d0c098',size:.16});
  } else if(type==='directory') {
    box(0,0,0,w*.8,1.84,d*.25,darkwood); box(0,.08,-d*.15,w*.69,1.68,.05,'#c2b89d');
    box(0,1.66,-d*.19,w*.54,.08,.03,brass);
    texts.push({text:String(object.title||'DIRECTORY').slice(0,24).toUpperCase(),at:point(x,1.68,z-d*.22),right:{x:1,z:0},color:'#3c3529',size:.17,width:w*.64});
    const lines=String(object.text||'').split('\n').slice(0,6);
    lines.forEach((line,i)=>texts.push({text:line.slice(0,24),at:point(x,1.35-i*.19,z-d*.22),right:{x:1,z:0},color:'#4c473b',size:.115,width:w*.62}));
  } else if(type==='note') {
    box(0,.025,0,w,.045,d,'#c8bd9f');
    // Small paper marks stay physical; readable prose is in the inspection dialog.
  } else {
    box(0,0,0,w,h,d,cream);
  }
}

function addStairs(out, stairs) {
  const width=safeDim(stairs.width,2), length=safeDim(stairs.length,5), rise=Number.isFinite(+stairs.rise)?+stairs.rise:2, x=Number(stairs.x)||0, z=Number(stairs.z)||0;
  const steps=Math.max(6,Math.min(20,Math.ceil(length*2.4))), dz=length/steps, dy=rise/steps;
  for(let i=0;i<steps;i++) {
    const y=i*dy, z0=z+i*dz, z1=z+(i+1)*dz;
    quad(out,point(x-width/2,y,z0),point(x+width/2,y,z0),point(x+width/2,y,z1),point(x-width/2,y,z1),i%2?'#625642':'#6e6048',{surface:'stone'});
    quad(out,point(x-width/2,y,z1),point(x+width/2,y,z1),point(x+width/2,y+dy,z1),point(x-width/2,y+dy,z1),'#493d30');
    // Narrow brass nosing catches the fluorescent spill and makes individual treads legible.
    quad(out,point(x-width/2,y+.012,z1-.035),point(x+width/2,y+.012,z1-.035),point(x+width/2,y+.012,z1),point(x-width/2,y+.012,z1),'#9a8458',{surface:'metal'});
  }
  for(const side of [-1,1]) {
    const railX=x+side*(width/2+.09);
    quad(out,point(railX-.035,0,z),point(railX+.035,0,z),point(railX+.035,rise,z+length),point(railX-.035,rise,z+length),'#4e493c');
    for(let i=0;i<=steps;i+=2) {
      const rz=z+i*dz, ry=i*dy;
      addBox(out,railX,ry,rz,.075,.96,.075,'#5c5140');
      addBox(out,railX,ry+.04,rz,.12,.045,.12,'#927b53');
    }
    addBeam(out,point(railX,.93,z),point(railX,rise+.93,z+length),.12,.12,'#705e42');
    addBeam(out,point(railX,.86,z),point(railX,rise+.86,z+length),.035,.035,'#b19d6b');
  }
}

export function buildSceneGeometry(scene, state = {}) {
  const out=[], texts=[];
  const w=safeDim(scene?.width,8), d=safeDim(scene?.depth,12), h=safeDim(scene?.height,3.2);
  const colors=scene?.colors||{}, wall=colors.wall||HOTEL.cream, lower=colors.lower||HOTEL.olive;
  const doors=Array.isArray(scene?.doors)?scene.doors:[], objects=Array.isArray(scene?.objects)?scene.objects:[];
  const kind=String(scene?.kind||'corridor').toLowerCase();
  const flooded=kind==='flooded'||/flood/i.test(String(scene?.floor||''));
  addCarpet(out,w,d,flooded,scene);
  quad(out,point(0,h,0),point(w,h,0),point(w,h,d),point(0,h,d),colors.ceiling||'#c8c3ad',{surface:'plaster'});
  const wallSurface=['service','service-corridor','flooded','stairwell','stairs','impossible-staircase'].includes(kind)?'plaster':'wallpaper';
  for(const side of ['south','north','west','east']) addWall(out,side,w,d,h,doors,wall,lower,0.96,1.04,wallSurface,wallSurface==='plaster'?'plaster':'wood');
  // Raised pilasters articulate the lobby perimeter while leaving door openings clear.
  for(const side of ['south','north','west','east']) {
    const alongX=side==='north'||side==='south', span=alongX?w:d, normal=side==='north'?-1:side==='south'?1:side==='east'?-1:1;
    for(let at=2.2;at<span-1;at+=4.2) {
      if(doors.some(q=>q.wall===side&&Math.abs(q.offset-at)<1.05)) continue;
      if(alongX) {
        const z=side==='north'?d-.065:.065;
        addBox(out,at,.15,z,.22,h-.3,.13,kind==='lobby'?'#756c56':'#73634c',{surface:kind==='lobby'?'stone':'wood'});
        for(const y of [.2,h-.2]) addBox(out,at,y,z,.34,.16,.13,'#8b7858',{surface:kind==='lobby'?'stone':'wood'});
      } else {
        const x=side==='east'?w-.065:.065;
        addBox(out,x,.15,at,.13,h-.3,.22,kind==='lobby'?'#756c56':'#73634c',{surface:kind==='lobby'?'stone':'wood'});
        for(const y of [.2,h-.2]) addBox(out,x,y,at,.13,.16,.34,'#8b7858',{surface:kind==='lobby'?'stone':'wood'});
      }
    }
  }
  // Crown and picture molding are continuous, thin geometry, not flat wall-color rectangles.
  for(const side of ['south','north','west','east']) {
    const horizontal=side==='north'||side==='south', span=horizontal?w:d;
    const a=wallPoint(side,0,h-.16,w,d),b=wallPoint(side,span,h-.16,w,d),c=wallPoint(side,span,h-.07,w,d),e=wallPoint(side,0,h-.07,w,d);
    quad(out,a,b,c,e,'#867b61',{surface:'wood'});
  }
  for(const door of doors) addDoor(out,texts,scene,door,state,w,d,h);
  if(['lobby','entrance'].includes(kind)) {
    // Deep coffer rhythm gives the reception volume an unmistakable civic scale.
    for(let x=1.5;x<w-0.5;x+=2.4) addBeam(out,point(x,h-.12,.25),point(x,h-.12,d-.25),.12,.16,'#82785f','wood');
    for(let z=2.1;z<d-.5;z+=2.8) addBeam(out,point(.25,h-.12,z),point(w-.25,h-.12,z),.12,.16,'#82785f','wood');
  }
  if(['service','service-corridor'].includes(kind)) {
    for(const x of [w*.28,w*.5,w*.72]) {
      addBeam(out,point(x,h-.28,.4),point(x,h-.28,d-.4),.075,.075,'#696a5e','metal');
      for(let z=1.5;z<d-1;z+=3.4) addBox(out,x,h-.39,z,.12,.1,.12,'#7d795f');
    }
  }
  // Fluorescent fixtures repeat along circulation axes; domestic rooms use warmer, smaller pools.
  const warm=['room','guestroom','lobby','service','service-corridor','guest-room'].includes(kind);
  const count=Math.max(1,Math.min(5,Math.floor(d/4.2)));
  for(let i=0;i<count;i++) addLight(out,w/2,(i+.5)*d/count,h-.12,warm&&i===0,w);
  const sconces=Math.max(1,Math.min(3,Math.floor(d/5)));
  for(let i=0;i<sconces;i++) {
    const z=(i+1)*d/(sconces+1), side=i%2?'west':'east', sx=side==='east'?w-.11:.11;
    addBox(out,sx,2.03,z,.14,.4,.22,'#786d55');
    const faceX=side==='east'?sx-.085:sx+.085;
    const lamp=side==='east'
      ? [point(faceX,1.84,z-.07),point(faceX,1.84,z+.07),point(faceX,2.22,z+.07),point(faceX,2.22,z-.07)]
      : [point(faceX,1.84,z+.07),point(faceX,1.84,z-.07),point(faceX,2.22,z-.07),point(faceX,2.22,z+.07)];
    poly(out,lamp,warm?'#d8c999':HOTEL.lamp,{emissive:.85,light:{x:sx,y:2.03,z,power:2.2,radius:5}});
  }
  if(scene?.stairs && Number.isFinite(+scene.stairs.length)) addStairs(out,scene.stairs);
  else if(kind==='stairs'||kind==='stairwell'||kind==='impossible-staircase')
    addStairs(out,{x:w*.54,z:d*.38,width:2,length:Math.min(6,d*.48),rise:1.8});
  for(const object of objects) addFurniture(out,texts,object,scene);
  // Sparse wall details lend scale and age without turning the room into a prop gallery.
  for(let z=3.6, n=0;z<d-.8;z+=5.8,n++) {
    const side=n%2?'west':'east', x=side==='east'?w-.035:.035;
    if(!doors.some(door=>(door.wall===side)&&Math.abs((Number(door.offset)||0)-z)<1.2)) {
      const sign=side==='east'?-1:1,faceX=x+sign*.047;
      addBox(out,x,1.46,z,.07,.76,1.15,'#574633',{surface:'wood'});
      const q=(u,y,layer=0)=>point(faceX+sign*layer,y,z+u);
      quad(out,q(-.51,1.51),q(.51,1.51),q(.51,2.17),q(-.51,2.17),'#8c9286');
      // Original moonlit landscape: separate picture layers sit in front of the mount.
      const moon=[];for(let i=0;i<20;i++){const a=i*Math.PI/10;moon.push(q(-.30+Math.cos(a)*.055,2.04+Math.sin(a)*.055,.002));}
      poly(out,moon,'#d4c7a5');
      poly(out,[q(-.51,1.74,.004),q(-.27,1.94,.004),q(-.04,1.78,.004),q(.19,1.97,.004),q(.51,1.80,.004),q(.51,1.51,.004),q(-.51,1.51,.004)],'#4a5b52');
      poly(out,[q(-.51,1.64,.006),q(-.27,1.77,.006),q(-.03,1.60,.006),q(.20,1.80,.006),q(.51,1.67,.006),q(.51,1.51,.006),q(-.51,1.51,.006)],'#677063');
      for(let tree=-.42;tree<.48;tree+=.11)poly(out,[q(tree-.045,1.53,.008),q(tree,1.72+Math.sin(tree*29)*.05,.008),q(tree+.045,1.53,.008)],'#34483e');
      for(const edge of [-1,1]) addBox(out,x+sign*.045,1.46,z+edge*.555,.022,.76,.045,'#947b51',{surface:'wood'});
      for(const yy of [1.46,2.185]) addBox(out,x+sign*.045,yy,z,.022,.035,1.15,'#947b51',{surface:'wood'});
    }
  }
  if(kind==='windowless'||kind==='impossible'||kind==='impossible-staircase'||kind==='unlisted') {
    // This detail intentionally reads like a sealed former window, not an exit.
    addBox(out,w*.5,1.58,d-.035,Math.min(1.25,w*.24),1.35,.055,'#766d57');
    addBox(out,w*.5,1.58,d-.004,Math.min(1.08,w*.21),1.15,.018,'#514f46');
    for(const yy of [1.08,2.08]) addBox(out,w*.5,yy,d-.001,Math.min(1.08,w*.21),.035,.025,'#83785d');
  }
  return { polygons: out, texts };
}

export function worldToCamera(world, camera) {
  const dx=world.x-camera.x, dy=world.y-camera.y, dz=world.z-camera.z;
  const cy=camera.cy??Math.cos(camera.yaw),sy=camera.sy??Math.sin(camera.yaw);
  const right=dx*cy-dz*sy;
  const forward=dx*sy+dz*cy;
  const cp=camera.cp??Math.cos(camera.pitch),sp=camera.sp??Math.sin(camera.pitch);
  return { x:right, y:dy*cp-forward*sp, z:dy*sp+forward*cp };
}
function colorRgb(color) {
  if(typeof color!=='string') return [130,125,108,1];
  const hex=color.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if(hex) {
    const s=hex[1].length===3?hex[1].split('').map(c=>c+c).join(''):hex[1];
    return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16),1];
  }
  const rgb=color.match(/rgba?\(([^)]+)\)/i);
  if(rgb) { const p=rgb[1].split(',').map(Number); return [p[0]||0,p[1]||0,p[2]||0,p.length>3?(Number.isFinite(p[3])?p[3]:1):1]; }
  return [130,125,108,1];
}
function illuminate(color, factor, fog, alpha=1) {
  const [r,g,b,a]=Array.isArray(color)?color:colorRgb(color), t=Math.min(.84,Math.max(0,fog));
  const fogColor=[23,28,25];
  const channel=(v,i)=>Math.round(Math.max(0,Math.min(255,v*factor*(1-t)+fogColor[i]*t)));
  return `rgba(${channel(r,0)},${channel(g,1)},${channel(b,2)},${Math.max(0,Math.min(1,a*alpha))})`;
}
function normalLight(points) {
  const a=points[0],b=points[1],c=points[2], ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz)||1;
  return .78 + .27*Math.max(0,(ny/len)*.75 + .42);
}
export function sceneEyeHeight(scene,state) {
  if(Number.isFinite(state?.eyeHeight)) return state.eyeHeight;
  const s=scene?.stairs,p=state?.player;
  return 1.62+(s&&p&&Number(s.length)>0&&Math.abs(p.x-(Number(s.x)||0))<=Number(s.width||2)/2&&p.z>=s.z&&p.z<=s.z+s.length ? Number(s.rise||0)*Math.max(0,Math.min(1,(p.z-s.z)/s.length)) : 0);
}

export class Renderer {
  constructor(canvas,{quality='low'}={}) {
    this.canvas=canvas;
    if(!canvas||typeof canvas.getContext!=='function') throw new Error('Renderer requires a canvas with a 2D context.');
    this.ctx=canvas.getContext('2d',{alpha:false});
    if(!this.ctx) throw new Error('Renderer could not acquire a 2D canvas context; graphics are unavailable.');
    this.quality=quality==='high'?'high':'low'; this.cacheKey=''; this.geometry=null; this.disposed=false;
    this.stats={lastRenderMs:0,polygons:0,frames:0};
    this.resize(this.quality);
  }
  resize(quality=this.quality) {
    if(this.disposed) return;
    this.quality=quality==='high'?'high':'low';
    const limit=this.quality==='high'?HIGH:LOW;
    const cssW=Math.max(1,this.canvas.clientWidth||this.canvas.width||640), cssH=Math.max(1,this.canvas.clientHeight||this.canvas.height||400);
    const scale=Math.min(1,limit.width/cssW,Math.sqrt(limit.area/(cssW*cssH)));
    const width=Math.max(1,Math.floor(cssW*scale)), height=Math.max(1,Math.floor(cssH*scale));
    if(this.canvas.width!==width) this.canvas.width=width;
    if(this.canvas.height!==height) this.canvas.height=height;
    this.width=width; this.height=height; this.focal=Math.min(width,height)*.94;
  }
  render(scene,state={},options={}) {
    if(this.disposed) return;
    const ctx=this.ctx, started=globalThis.performance?.now?.()??Date.now();
    const visit=(state.visits?.[scene?.id]||1), doors=state.openDoors||{};
    const doorBits=(scene?.doors||[]).map(d=>doors[`${scene.id}:${d.id}`]?1:0).join('');
    const key=`${scene?.id}|${visit}|${doorBits}|${scene?.kind}|${scene?.width}|${scene?.depth}|${scene?.height}`;
    if(key!==this.cacheKey) {
      this.geometry=buildSceneGeometry(scene,{...state,openDoors:doors});this.cacheKey=key;
      // Lamps and material response stay fixed until the room itself changes.
      const lights=this.geometry.polygons.filter(p=>p.light).map(p=>p.light);
      for(const p of this.geometry.polygons){
        const center=p.points.reduce((v,q)=>({x:v.x+q.x/p.points.length,y:v.y+q.y/p.points.length,z:v.z+q.z/p.points.length}),{x:0,y:0,z:0});
        let light=normalLight(p.points)*(p.emissive?1+p.emissive:1);
        for(const lamp of lights){const dist=Math.hypot(center.x-lamp.x,center.y-lamp.y,center.z-lamp.z);light+=lamp.power/(1+dist*dist)*.23;}
        p.lightFactor=Math.min(1.6,light);p.rgb=colorRgb(p.color);
      }
    }
    const geometry=this.geometry||{polygons:[],texts:[]};
    const player=state.player||{}, camera={x:Number(player.x)||0,y:sceneEyeHeight(scene,state),z:Number(player.z)||0,yaw:Number(player.yaw)||0,pitch:Number(player.pitch)||0};
    camera.cy=Math.cos(camera.yaw);camera.sy=Math.sin(camera.yaw);camera.cp=Math.cos(camera.pitch);camera.sp=Math.sin(camera.pitch);
    const draw=[];
    for(const p of geometry.polygons) {
      const cameraPoly=p.points.map(v=>worldToCamera(v,camera));
      const clipped=clipPolygonNearPlane(cameraPoly);
      if(clipped.length<3) continue;
      const projected=clipped.map(v=>projectCameraPoint(v,{width:this.width,height:this.height,focal:this.focal}));
      const depth=clipped.reduce((sum,v)=>sum+v.z,0)/clipped.length;
      const fog=Math.max(0,(depth-7)/(Math.max(10,scene?.depth||12)*.93));
      draw.push({projected,depth,fill:illuminate(p.rgb,p.lightFactor,fog),stroke:illuminate(p.rgb,.56,fog)});
    }
    draw.sort((a,b)=>b.depth-a.depth);
    const grad=ctx.createLinearGradient?.(0,0,0,this.height);
    if(grad) { grad.addColorStop(0,'#20251f'); grad.addColorStop(.58,'#49473b'); grad.addColorStop(1,'#2d3029'); ctx.fillStyle=grad; }
    else ctx.fillStyle='#282b25';
    ctx.fillRect(0,0,this.width,this.height);
    for(const item of draw) {
      const pts=item.projected; ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
      ctx.closePath(); ctx.fillStyle=item.fill; ctx.fill();
      // Fine inset seams catch light on upholstery, wood, stone and stair edges.
      ctx.strokeStyle=item.stroke; ctx.lineWidth=.65; ctx.stroke();
    }
    for(const label of geometry.texts) this.drawText(label,camera,options);
    this.stats.lastRenderMs=(globalThis.performance?.now?.()??Date.now())-started;
    this.stats.polygons=draw.length; this.stats.frames++;
  }
  drawText(label,camera,options) {
    const ctx=this.ctx, cp=worldToCamera(label.at,camera);
    if(cp.z<NEAR) return;
    const p=projectCameraPoint(cp,{width:this.width,height:this.height,focal:this.focal});
    if(p.x<-150||p.x>this.width+150||p.y<-100||p.y>this.height+100) return;
    const side=worldToCamera({x:label.at.x+(label.right?.x||1)*.35,y:label.at.y,z:label.at.z+(label.right?.z||0)*.35},camera);
    const pp=projectCameraPoint(side,{width:this.width,height:this.height,focal:this.focal});
    const angle=Math.atan2(pp.y-p.y,pp.x-p.x);
    const size=Math.max(5,Math.min(22,label.size*this.focal/cp.z));
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(angle); ctx.font=`600 ${size}px Georgia, serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=label.color; ctx.fillText(label.text,0,0,label.width?Math.max(4,label.width*this.focal/cp.z):Math.max(12,Math.min(this.width*.25,size*10))); ctx.restore();
  }

  dispose() { this.cacheKey=''; this.geometry=null; this.disposed=true; this.ctx=null; this.canvas=null; }
}

export { Renderer as CanvasRenderer };
