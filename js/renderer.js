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
  for (let i = 0; i < faces.length; i++) poly(out, faces[i], color, { ...extra, shade: [0.82, 0.68, 0.74, 0.62, 1.12, 0.48][i] });
}
function addBeam(out, a, b, width, depth, color) {
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
  for (const face of f) poly(out, face.map(i => corners[i]), color);
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
    if (alongX) addBox(out, centerX + at, 0, centerZ + sideOffset, 0.13, height + 0.12, depth, '#746047');
    else addBox(out, centerX + sideOffset, 0, centerZ + at, depth, height + 0.12, 0.13, '#746047');
  }
  if (alongX) addBox(out, centerX, height, centerZ + sideOffset, width + 0.31, 0.14, depth, '#746047');
  else addBox(out, centerX + sideOffset, height, centerZ, depth, 0.14, width + 0.31, '#746047');
  const open = !!state?.openDoors?.[`${scene.id}:${door.id}`];
  if(open&&elevator) {
    const portalDepth=towardInterior*.34;
    if(alongX) {
      quad(out,point(cx-width*.43,.04,cz+portalDepth),point(cx+width*.43,.04,cz+portalDepth),point(cx+width*.43,height-.04,cz+portalDepth),point(cx-width*.43,height-.04,cz+portalDepth),'#292e2a');
      for(const side of [-1,1]) addBox(out,cx+side*width*.43,.05,cz+sideOffset,width*.13,height-.1,.08,'#747568');
    } else {
      quad(out,point(cx+portalDepth,.04,cz-width*.43),point(cx+portalDepth,.04,cz+width*.43),point(cx+portalDepth,height-.04,cz+width*.43),point(cx+portalDepth,height-.04,cz-width*.43),'#292e2a');
      for(const side of [-1,1]) addBox(out,cx+sideOffset,.05,cz+side*width*.43,.08,height-.1,width*.13,'#747568');
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
        addBox(out,doorCenter.x+side*width*.247,.06,doorCenter.z,width*.49,height-.08,.08,metal);
        addBox(out,doorCenter.x+side*width*.247,.16,doorCenter.z+towardInterior*.052,width*.39,height-.31,.025,inset);
        addBox(out,doorCenter.x+side*width*.247,1.95,doorCenter.z+towardInterior*.052,width*.39,.035,.028,'#97917b');
      }
      addBox(out,doorCenter.x,.06,doorCenter.z+towardInterior*.05,.035,height-.08,.09,seam);
      addBox(out,doorCenter.x+width*.5+.14,1.63,doorCenter.z+towardInterior*.09,.13,.38,.06,'#494b43');
      addBox(out,doorCenter.x+width*.5+.14,1.72,doorCenter.z+towardInterior*.13,.055,.08,.025,'#d5dfa9',{emissive:.85});
    } else {
      for(const side of [-1,1]) {
        addBox(out,doorCenter.x,.06,doorCenter.z+side*width*.247,.08,height-.08,width*.49,metal);
        addBox(out,doorCenter.x+towardInterior*.052,.16,doorCenter.z+side*width*.247,.025,height-.31,width*.39,inset);
        addBox(out,doorCenter.x+towardInterior*.052,1.95,doorCenter.z+side*width*.247,.028,.035,width*.39,'#97917b');
      }
      addBox(out,doorCenter.x+towardInterior*.05,.06,doorCenter.z,.09,height-.08,.035,seam);
      addBox(out,doorCenter.x+towardInterior*.09,1.63,doorCenter.z+width*.5+.14,.06,.38,.13,'#494b43');
      addBox(out,doorCenter.x+towardInterior*.13,1.72,doorCenter.z+width*.5+.14,.025,.08,.055,'#d5dfa9',{emissive:.85});
    }
  } else {
    if (alongX) addBox(out, doorCenter.x, 0.06, doorCenter.z, width, height - 0.08, 0.08, '#71543b');
    else addBox(out, doorCenter.x, 0.06, doorCenter.z, 0.08, height - 0.08, width, '#71543b');
    const panelOffset = towardInterior * 0.052;
    for (const py of [0.45, 1.15, 1.67]) {
      const ph = py === 0.45 ? 0.55 : 0.39;
      if (alongX) addBox(out, doorCenter.x, py, doorCenter.z + panelOffset, width * 0.7, ph, 0.025, '#805f41');
      else addBox(out, doorCenter.x + panelOffset, py, doorCenter.z, 0.025, ph, width * 0.7, '#805f41');
    }
    const knobX = doorCenter.x + (alongX ? width * 0.34 : towardInterior * 0.085);
    const knobZ = doorCenter.z + (alongX ? towardInterior * 0.085 : width * 0.34);
    addBox(out, knobX, 0.98, knobZ, 0.09, 0.09, 0.09, HOTEL.brass, { emissive: 0.1 });
  }
  // Raised brass number plate and modeled molding keep the doorway legible at a distance.
  if (alongX) addBox(out, cx, 2.03, cz + sideOffset + towardInterior*0.07, 0.66, 0.20, 0.035, HOTEL.brass, { emissive: 0.1 });
  else addBox(out, cx + sideOffset + towardInterior*0.07, 2.03, cz, 0.035, 0.20, 0.66, HOTEL.brass, { emissive: 0.1 });
  const label = String(door.label ?? door.id ?? '').trim().slice(0, 12);
  if (label) texts.push({ text: label, at: point(cx + (alongX ? 0 : sideOffset + towardInterior*0.1), 2.07, cz + (alongX ? sideOffset + towardInterior*0.1 : 0)), right: alongX ? {x:1,z:0} : {x:0,z:1}, color:'#29241b', size:0.16, width:.6 });
}

function addWall(out, wall, w, d, h, doors, color, low, bandBottom, bandTop) {
  const horizontal = wall === 'north' || wall === 'south', span = horizontal ? w : d;
  const relevant = doors.filter(door => door.wall === wall).map(door => ({
    start: Math.max(0, door.offset - safeDim(door.width, 1.5)/2 - 0.07),
    end: Math.min(span, door.offset + safeDim(door.width, 1.5)/2 + 0.07),
    top: Math.min(2.28, h - 0.24)
  })).sort((a,b)=>a.start-b.start);
  const face = (a,b,y0,y1,c) => {
    if (b-a < 0.02 || y1-y0 < 0.02) return;
    quad(out,wallPoint(wall,a,y0,w,d),wallPoint(wall,b,y0,w,d),wallPoint(wall,b,y1,w,d),wallPoint(wall,a,y1,w,d),c);
  };
  // Wainscot continues behind each door leaf; upper plaster is cut only to door-head height.
  face(0,span,0,bandBottom,low);
  face(0,span,bandBottom+0.07,bandTop,color);
  const cutHeight = Math.min(2.28,h-0.24);
  let cursor=0;
  for(const r of relevant) {
    face(cursor,r.start,bandTop+0.07,cutHeight,color);
    cursor=Math.max(cursor,r.end);
  }
  face(cursor,span,bandTop+0.07,cutHeight,color);
  face(0,span,cutHeight,h,color);
  // Architectural baseboard and chair rail terminate at the door opening rather than crossing it.
  for (const [y,thick,c] of [[0.13,0.15,HOTEL.skirting],[0.97,0.075,'#8e7c5b'],[bandBottom+0.055,0.045,'#897553']]) {
    let at=0;
    const ranges = relevant.length && y < cutHeight ? relevant : [];
    for(const r of ranges) {
      if(r.start>at) face(at,r.start,y,y+thick,c);
      at=Math.max(at,r.end);
    }
    face(at,span,y,y+thick,c);
  }
}

function addCarpet(out, w, d, flooded) {
  const inset = 0.34;
  const base = flooded ? '#3d4540' : HOTEL.carpet;
  quad(out,point(inset,0.012,inset),point(w-inset,0.012,inset),point(w-inset,0.012,d-inset),point(inset,0.012,d-inset),base);
  if (flooded) {
    for (let i=0;i<16;i++) {
      const z=inset+0.25+i*(d-2*inset)/16, x0=inset+0.4+(i%3)*0.22, x1=w-inset-0.4;
      quad(out,point(x0,0.025+(i%2)*0.002,z),point(x1,0.025+(i%2)*0.002,z+0.05),point(x1,0.025+(i%2)*0.002,z+0.075),point(x0,0.025+(i%2)*0.002,z+0.025),'rgba(174,190,175,0.11)',{emissive:0.08});
    }
    return;
  }
  for (const [x,z,ww,dd,c] of [[inset, inset, w-2*inset,0.12,'#857552'],[inset,d-inset-0.12,w-2*inset,0.12,'#857552'],[inset,inset,0.12,d-2*inset,'#857552'],[w-inset-0.12,inset,0.12,d-2*inset,'#857552']]) {
    quad(out,point(x,0.025,z),point(x+ww,0.025,z),point(x+ww,0.025,z+dd),point(x,0.025,z+dd),c);
  }
  // A restrained, repeating woven medallion motif (dozens of pieces, never thousands).
  const cols = Math.min(7, Math.max(2, Math.floor(w/1.25))), rows = Math.min(13, Math.max(4, Math.floor(d/1.2)));
  for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) {
    const cx=inset+0.38+(col+0.5)*(w-2*inset-0.76)/cols, cz=inset+0.34+(row+0.5)*(d-2*inset-0.68)/rows;
    const r=Math.min(0.21,(w-2*inset)/cols*0.23,(d-2*inset)/rows*0.24);
    const motif=(row+col)%2?'#796b4e':'#8a7858';
    poly(out,[point(cx,0.028,cz-r),point(cx+r*0.72,0.028,cz),point(cx,0.028,cz+r),point(cx-r*0.72,0.028,cz)],motif);
    const inner=r*0.35;
    poly(out,[point(cx,0.03,cz-inner),point(cx+inner,0.03,cz),point(cx,0.03,cz+inner),point(cx-inner,0.03,cz)],'#b09a6a');
    if(col%2===0) for(const sx of [-1,1]) for(const sz of [-1,1]) {
      const ax=cx+sx*r*1.25, az=cz+sz*r*1.25;
      poly(out,[point(ax,0.029,az-0.04),point(ax+0.04,0.029,az),point(ax,0.029,az+0.04),point(ax-0.04,0.029,az)],'#786948');
    }
  }
}

function addLight(out, x, z, ceiling, warm=false, width=12) {
  const color=warm?'#d0bd8a':HOTEL.lamp;
  quad(out,point(x-0.62,ceiling-0.035,z-0.19),point(x+0.62,ceiling-0.035,z-0.19),point(x+0.62,ceiling-0.035,z+0.19),point(x-0.62,ceiling-0.035,z+0.19),'#554f42');
  quad(out,point(x-0.54,ceiling-0.02,z-0.13),point(x+0.54,ceiling-0.02,z-0.13),point(x+0.54,ceiling-0.02,z+0.13),point(x-0.54,ceiling-0.02,z+0.13),color,{emissive:1.25,light:{x,y:ceiling-0.04,z,power:4.8,radius:8}});
  // Pale, subtle pools of fluorescent spill on the nearest wall surfaces.
  for(const wall of ['east','west']) {
    const wallX=wall==='east'?width-.015:.015;
    quad(out,point(wallX,1.05,z-1.25),point(wallX,1.05,z+1.25),point(wallX,2.65,z+1.25),point(wallX,2.65,z-1.25),warm?'rgba(191,174,128,0.10)':'rgba(204,217,183,0.12)',{emissive:0.2});
  }
}

function addFurniture(out, texts, object, scene) {
  const x=Number(object.x)||0, z=Number(object.z)||0, w=safeDim(object.w,1), d=safeDim(object.d,0.7), h=safeDim(object.h,1), type=object.type||'cabinet';
  const wood='#604a36', darkwood='#42362a', brass=HOTEL.brass, cream='#9d9276';
  const box=(ox,oy,oz,bw,bh,bd,c,e)=>addBox(out,x+ox,oy,z+oz,bw,bh,bd,c,e);
  if(type==='desk') {
    box(0,h*0.72,0,w,h*0.1,d,wood); box(-w*.37,0,-d*.34,w*.13,h*.72,d*.13,darkwood); box(w*.37,0,-d*.34,w*.13,h*.72,d*.13,darkwood);
    box(0,h*.39,-d*.44,w*.78,h*.36,.07,'#67513b'); box(0,h*.72,d*.22,w*.6,.03,.08,brass);
    box(-w*.23,h*.82,0,.3,.1,.22,'#ded4b4'); box(w*.16,h*.82,-d*.16,.13,.18,.12,'#aaa08a');
    box(0,h*.82,d*.38,.26,.05,.13,'#343631');
  } else if(type==='bed') {
    box(0,.32,0,w*.94,.3,d*.92,'#8b8068'); box(0,.52,-d*.27,w*.9,.17,d*.19,wood); box(0,.5,d*.08,w*.88,.16,d*.58,'#b6ad95');
    box(-w*.25,.65,-d*.22,w*.27,.12,.24,'#d0c5aa'); box(w*.25,.65,-d*.22,w*.27,.12,.24,'#c0b49a');
    for(const sx of [-.4,.4]) for(const sz of [-.38,.38]) box(sx*w,.0,sz*d,.09,.32,.09,darkwood);
    box(0,.83,-d*.42,w*.92,.07,.1,wood);
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
    box(0,.78,0,.43,.13,.36,wood); box(0,.86,0,.28,.2,.25,'#292b28');
    box(-.27,.87,0,.1,.24,.1,brass); box(.27,.87,0,.1,.24,.1,brass);
    box(0,1.03,-.08,.44,.04,.33,'#d0c7ac');
  } else if(type==='clock') {
    box(0,h*.68,0,w*.45,h*.55,.16,darkwood); box(0,h*.68,.095,w*.35,h*.43,.025,'#c4b99b');
    box(-w*.22,h*.68,.13,.055,h*.15,.025,brass); box(w*.17,h*.68,.13,.04,h*.19,.025,brass);
    box(0,h*.27,0,w*.24,.07,.17,wood);
  } else if(type==='mirror') {
    box(0,h*.55,0,w,h,.11,wood); box(0,h*.58,.065,w*.77,h*.78,.025,'#66685f',{emissive:.14});
    box(-w*.42,.06,.08,.08,.12,.06,brass); box(w*.42,.06,.08,.08,.12,.06,brass);
  } else if(type==='pipe') {
    for(let i=-1;i<=1;i++) { box(i*w*.3,0,0,.1,h,d*.14,'#777767'); box(i*w*.3,h*.8,0,.12,.07,d*.26,'#8b876d'); }
    box(0,h*.43,0,w,.08,d*.22,'#6b6b5c');
  } else if(type==='rail') {
    for(const sx of [-.42,.42]) box(sx*w,0,0,.07,h*.83,.07,'#655541');
    box(0,h*.8,0,w,.09,.12,'#746044'); box(0,h*.7,d*.35,w,.04,.06,'#907850');
  } else if(type==='sign') {
    box(0,0,0,.07,h*.65,.07,darkwood); box(0,h*.63,0,w,h*.37,.07,'#c4b99d');
    box(0,h*.82,.05,w*.78,.035,.02,brass);
    texts.push({text:String(object.text||'').split(/[.\n]/)[0].slice(0,12),at:point(x,h*.82,z-.055),right:{x:1,z:0},color:'#3c3529',size:.13,width:w*.84});
  } else if(type==='elevator') {
    box(0,0,0,w,h,d,'#77684f'); box(0,.04,d*.51,w*.84,h*.91,.06,'#4e5149');
    box(-w*.22,.06,d*.55,w*.41,h*.87,.025,'#6f725f'); box(w*.22,.06,d*.55,w*.41,h*.87,.025,'#625f4e');
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
    quad(out,point(x-width/2,y,z0),point(x+width/2,y,z0),point(x+width/2,y,z1),point(x-width/2,y,z1),i%2?'#625642':'#6e6048');
    quad(out,point(x-width/2,y,z1),point(x+width/2,y,z1),point(x+width/2,y+dy,z1),point(x-width/2,y+dy,z1),'#493d30');
    // Narrow brass nosing catches the fluorescent spill and makes individual treads legible.
    quad(out,point(x-width/2,y+.012,z1-.035),point(x+width/2,y+.012,z1-.035),point(x+width/2,y+.012,z1),point(x-width/2,y+.012,z1),'#9a8458');
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
  addCarpet(out,w,d,flooded);
  quad(out,point(0,h,0),point(w,h,0),point(w,h,d),point(0,h,d),colors.ceiling||'#c8c3ad');
  for(const side of ['south','north','west','east']) addWall(out,side,w,d,h,doors,wall,lower,0.96,1.04);
  // Crown and picture molding are continuous, thin geometry, not flat wall-color rectangles.
  for(const side of ['south','north','west','east']) {
    const horizontal=side==='north'||side==='south', span=horizontal?w:d;
    const a=wallPoint(side,0,h-.16,w,d),b=wallPoint(side,span,h-.16,w,d),c=wallPoint(side,span,h-.07,w,d),e=wallPoint(side,0,h-.07,w,d);
    quad(out,a,b,c,e,'#867b61');
  }
  for(const door of doors) addDoor(out,texts,scene,door,state,w,d,h);
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
      addBox(out,x,1.3,z,.08,.46,.65,n%2?'#6d624d':'#74674f');
      addBox(out,x+(side==='east'?.05:-.05),1.34,z,.02,.3,.48,'#999076');
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

function cameraPoint(world, camera) {
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
function sceneEyeHeight(scene,state) {
  if(Number.isFinite(state?.eyeHeight)) return state.eyeHeight;
  let elevation=1.62;
  const s=scene?.stairs,p=state?.player;
  if(s&&p&&Number(s.length)>0&&Math.abs(p.x-(Number(s.x)||0))<=Number(s.width||2)/2&&p.z>=s.z&&p.z<=s.z+s.length)
    elevation+=Number(s.rise||0)*Math.max(0,Math.min(1,(p.z-s.z)/s.length));
  return elevation;
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
      const cameraPoly=p.points.map(v=>cameraPoint(v,camera));
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
    const ctx=this.ctx, cp=cameraPoint(label.at,camera);
    if(cp.z<NEAR) return;
    const p=projectCameraPoint(cp,{width:this.width,height:this.height,focal:this.focal});
    if(p.x<-150||p.x>this.width+150||p.y<-100||p.y>this.height+100) return;
    const side=cameraPoint({x:label.at.x+(label.right?.x||1)*.35,y:label.at.y,z:label.at.z+(label.right?.z||0)*.35},camera);
    const pp=projectCameraPoint(side,{width:this.width,height:this.height,focal:this.focal});
    const angle=Math.atan2(pp.y-p.y,pp.x-p.x);
    const size=Math.max(5,Math.min(22,label.size*this.focal/cp.z));
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(angle); ctx.font=`600 ${size}px Georgia, serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=label.color; ctx.fillText(label.text,0,0,label.width?Math.max(4,label.width*this.focal/cp.z):Math.max(12,Math.min(this.width*.25,size*10))); ctx.restore();
  }

  dispose() { this.cacheKey=''; this.geometry=null; this.disposed=true; this.ctx=null; this.canvas=null; }
}
