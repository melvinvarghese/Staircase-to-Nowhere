import {SCENES, getScene, START_SCENE} from './world.js';
import {createState,move,look,getTarget,interact,closeDoor,restart} from './engine.js';
import {Renderer} from './renderer.js';
import {defaults,readPreferences,savePreferences} from './preferences.js';
import {Ambience} from './audio.js';

const $=id=>document.getElementById(id);
const canvas=$('scene'),pauseDialog=$('pause-dialog'),inspection=$('inspection-dialog');
const state=createState(),audio=new Ambience();
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let storage;try{storage=window.localStorage;}catch{/* Private browsing may block storage. */}
let preferences=readPreferences(storage,motionQuery.matches);
let entered=false,paused=true,renderer=null,raf=0,lastFrame=0,dirty=true,target=null;
let drag=null,joystickPointer=null,joystick={forward:0,strafe:0},hadPointerLock=false;
const keys=new Set();
let measuredFrames=0,totalRenderMs=0,maxRenderMs=0;
let toastTimer=0;
const titleState={...createState(),sceneId:'first-stairwell'};
if(SCENES['first-stairwell']) titleState.player={...SCENES['first-stairwell'].spawn,pitch:0};

function scene(){return getScene(state.sceneId,state.visits[state.sceneId]||1);}
function active(){return entered&&!paused&&!document.hidden;}
function syncPreferences(){
  document.documentElement.dataset.reducedMotion=String(preferences.reducedMotion);
  document.documentElement.dataset.flicker=String(preferences.flicker&&!preferences.reducedMotion);
  $('pref-audio').checked=preferences.audio;
  $('pref-motion').checked=preferences.reducedMotion;
  $('pref-flicker').checked=preferences.flicker;
  $('pref-flicker').disabled=preferences.reducedMotion;
  $('pref-quality').value=preferences.quality;
  $('sound-toggle').textContent=preferences.audio?'Sound on':'Sound off';
  $('sound-toggle').setAttribute('aria-label',preferences.audio?'Sound on':'Sound off');
  $('sound-toggle').setAttribute('aria-pressed',String(preferences.audio));
  savePreferences(storage,preferences);
}
function announce(message){
  clearTimeout(toastTimer);$('toast').textContent=message;
  toastTimer=setTimeout(()=>{$('toast').textContent='';},4500);
}
async function syncAudio(){
  await audio.set(preferences.audio,active());
  if(preferences.audio&&!audio.available){preferences.audio=false;syncPreferences();announce('Sound is unavailable here. The building is still open.');}
}
function clearInput(){keys.clear();drag=null;joystickPointer=null;joystick={forward:0,strafe:0};$('joystick-knob').style.transform='';}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;clearInput();document.documentElement.dataset.paused='true';syncAudio();}
function draw(){
  if(!renderer)return;
  const s=entered?state:titleState;
  const room=entered?scene():getScene(titleState.sceneId,1);
  renderer.render(room,s,{title:!entered,flicker:false,time:0});
  measuredFrames++;const ms=renderer.stats.lastRenderMs||0;totalRenderMs+=ms;maxRenderMs=Math.max(maxRenderMs,ms);
}
function requestFrame(){dirty=true;if(active()&&!raf){lastFrame=performance.now();raf=requestAnimationFrame(tick);}}
function input(){return {forward:(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)+joystick.forward,strafe:(keys.has('d')?1:0)-(keys.has('a')?1:0)+joystick.strafe,turn:(keys.has('arrowright')?1:0)-(keys.has('arrowleft')?1:0)};}
function tick(now){
  raf=0;if(!active())return;
  const dt=(now-lastFrame)/1000,interval=1/(preferences.quality==='low'?30:45);
  if(dt<interval){raf=requestAnimationFrame(tick);return;}
  lastFrame=now;
  const controls=input(),moving=!!(controls.forward||controls.strafe||controls.turn);
  if(moving){const old=state.sceneId;const changed=move(state,controls,Math.min(.1,dt));if(old!==state.sceneId)updateLocation();if(changed)dirty=true;}
  if(dirty){draw();updateTarget();dirty=false;}
  if(moving)raf=requestAnimationFrame(tick);
}
function updateLocation(){
  const room=scene();$('floor-label').textContent=room.floor;$('location-label').textContent=room.name;
  canvas.setAttribute('aria-label',`${room.name}. ${room.description} Use W A S D to walk, left and right arrows to turn, E to interact, or Escape for exploration without aiming.`);
}
function updateTarget(){
  target=getTarget(state);
  $('interact').hidden=!target;
  $('crosshair').dataset.active=String(!!target);
  const verb=target?.kind==='door'?(state.openDoors[state.sceneId+':'+target.id]?'Step through':'Open'):'Inspect';
  const label=target?`${verb} ${target.label}`:'';if($('interaction-label').textContent!==label)$('interaction-label').textContent=label;
}
function releaseMouse(){if(document.pointerLockElement===canvas)document.exitPointerLock?.();}
function openPause(){
  if(inspection.open)return;
  paused=true;stop();releaseMouse();
  $('resume').textContent=entered?'Continue wandering':'Return to the entrance';
  $('restart').hidden=!entered;$('explore-mode').hidden=!entered;$('mouse-capture').hidden=!entered||!canvas.requestPointerLock||matchMedia('(pointer: coarse)').matches;
  $('accessible-exploration').hidden=true;
  if(!pauseDialog.open)pauseDialog.showModal();
}
function resume(){
  pauseDialog.close();inspection.close();paused=!entered;
  document.documentElement.dataset.paused=String(paused);
  if(entered){canvas.focus({preventScroll:true});syncAudio();requestFrame();}
  else $('enter').focus({preventScroll:true});
}
function showInspection(result){
  if(pauseDialog.open)pauseDialog.close();
  paused=true;stop();releaseMouse();
  $('inspection-title').textContent=result.title||'A small detail';
  $('inspection-text').textContent=result.text||'';
  if(!inspection.open)inspection.showModal();
}
function respond(result){
  if(result.type==='inspect'){showInspection(result);return;}
  if(result.type==='transition'){updateLocation();announce('');}
  else if(result.type==='door')announce('The door is open. Interact again to step through. C closes it.');
  updateTarget();requestFrame();
}
function doInteract(){if(active())respond(interact(state));}
function listSurroundings(){
  const room=scene();$('accessible-exploration').hidden=false;
  $('room-description').textContent=room.description;
  $('explore-title').textContent=room.name;
  $('route-list').replaceChildren();$('object-list').replaceChildren();
  for(const door of room.doors){
    const button=document.createElement('button');button.textContent=`Go through ${door.label}`;
    button.addEventListener('click',()=>{
      let result=interact(state,{kind:'door',id:door.id});
      if(result.type==='door')result=interact(state,{kind:'door',id:door.id});
      resume();respond(result);
    });$('route-list').append(button);
    if(state.openDoors[room.id+':'+door.id]){
      const close=document.createElement('button');close.textContent=`Close ${door.label}`;
      close.addEventListener('click',()=>{closeDoor(state,door.id);draw();listSurroundings();});$('route-list').append(close);
    }
  }
  for(const object of room.objects.filter(o=>o.text)){
    const button=document.createElement('button');button.textContent=`Inspect ${object.title||object.type}`;
    button.addEventListener('click',()=>respond(interact(state,{kind:'object',id:object.id})));$('object-list').append(button);
  }
  $('explore-title').focus({preventScroll:true});
}
$('enter').addEventListener('click',()=>{
  entered=true;paused=false;$('title-screen').hidden=true;$('hud').hidden=false;
  document.documentElement.dataset.paused='false';updateLocation();canvas.focus();
  if(!renderer){$('fallback').hidden=false;$('crosshair').hidden=true;$('touch-controls').hidden=true;}
  syncAudio();requestFrame();
});
$('title-settings').addEventListener('click',openPause);$('pause-button').addEventListener('click',openPause);
$('close-pause').addEventListener('click',resume);$('resume').addEventListener('click',resume);
pauseDialog.addEventListener('cancel',event=>{event.preventDefault();resume();});
$('close-inspection').addEventListener('click',resume);inspection.addEventListener('cancel',event=>{event.preventDefault();resume();});
for(const dialog of [pauseDialog,inspection])dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const controls=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[href],[tabindex="0"]')].filter(element=>element.getClientRects().length);
  const first=controls[0],last=controls.at(-1),current=document.activeElement;
  if(event.shiftKey&&(current===first||!dialog.contains(current))){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&(current===last||!dialog.contains(current))){event.preventDefault();first?.focus();}
});
$('interact').addEventListener('click',doInteract);
$('explore-mode').addEventListener('click',listSurroundings);
$('fallback-explore').addEventListener('click',()=>{openPause();listSurroundings();});
$('restart').addEventListener('click',()=>{restart(state);resume();updateLocation();updateTarget();announce('Back at reception.');requestFrame();});
$('reset-preferences').addEventListener('click',()=>{preferences=defaults(motionQuery.matches);syncPreferences();renderer?.resize(preferences.quality);syncAudio();draw();});
for(const [id,key] of [['pref-audio','audio'],['pref-motion','reducedMotion'],['pref-flicker','flicker']])$(id).addEventListener('change',()=>{preferences[key]=$(id).checked;syncPreferences();syncAudio();});
$('pref-quality').addEventListener('change',()=>{preferences.quality=$('pref-quality').value;syncPreferences();renderer?.resize(preferences.quality);draw();});
$('sound-toggle').addEventListener('click',()=>{preferences.audio=!preferences.audio;syncPreferences();syncAudio();});
$('mouse-capture').addEventListener('click',async()=>{
  resume();
  try{await canvas.requestPointerLock();}catch{announce('Mouse capture is unavailable. Drag the view or use the arrow keys.');}
});
document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===canvas;
  if(hadPointerLock&&!locked&&active())openPause();
  hadPointerLock=locked;
});
document.addEventListener('pointerlockerror',()=>announce('Mouse capture is unavailable. Drag the view or use the arrow keys.'));
document.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();
  if(key==='escape'&&entered&&!pauseDialog.open&&!inspection.open){event.preventDefault();openPause();return;}
  if(!active())return;
  if(event.target.matches('input,select,textarea,button,summary'))return;
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){
    event.preventDefault();if(!keys.has(key)){keys.add(key);requestFrame();}
  }else if(key==='e'&&!event.repeat){event.preventDefault();doInteract();}
  else if(key==='c'&&!event.repeat&&target?.kind==='door'){closeDoor(state,target.id);announce('The door is closed.');updateTarget();requestFrame();}
});
document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
canvas.addEventListener('pointerdown',event=>{
  if(!active()||event.button>0||drag)return;
  canvas.focus({preventScroll:true});drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};
  try{canvas.setPointerCapture(event.pointerId);}catch{/* Synthetic or cancelled pointer. */}
});
canvas.addEventListener('pointermove',event=>{
  if(!active())return;
  if(document.pointerLockElement===canvas){look(state,event.movementX,event.movementY);requestFrame();return;}
  if(!drag||drag.id!==event.pointerId)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>6)drag.moved=true;
  look(state,dx*(event.pointerType==='touch'?.8:1),dy*(event.pointerType==='touch'?.8:1));
  drag.x=event.clientX;drag.y=event.clientY;requestFrame();
});
canvas.addEventListener('pointerup',event=>{
  if(drag?.id!==event.pointerId)return;
  const clicked=!drag.moved;drag=null;
  if(clicked&&event.pointerType!=='touch'&&document.pointerLockElement!==canvas)doInteract();
});
canvas.addEventListener('pointercancel',event=>{if(drag?.id===event.pointerId)drag=null;});
canvas.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId)drag=null;});
canvas.addEventListener('click',()=>{if(document.pointerLockElement===canvas)doInteract();});
const stick=$('joystick');
function updateStick(event){
  const bounds=stick.getBoundingClientRect();const ring=stick.querySelector('.joystick-ring').getBoundingClientRect();
  let x=event.clientX-(ring.left+ring.width/2),y=event.clientY-(ring.top+ring.height/2);
  const limit=ring.width*.32,length=Math.hypot(x,y);if(length>limit){x=x/length*limit;y=y/length*limit;}
  joystick={forward:-y/limit,strafe:x/limit};$('joystick-knob').style.transform=`translate(${x}px,${y}px)`;requestFrame();
}
stick.addEventListener('pointerdown',event=>{
  if(!active()||joystickPointer!==null)return;event.preventDefault();joystickPointer=event.pointerId;
  try{stick.setPointerCapture(event.pointerId);}catch{/* Pointer may have been cancelled. */}updateStick(event);
});
stick.addEventListener('pointermove',event=>{if(event.pointerId===joystickPointer){event.preventDefault();updateStick(event);}});
function releaseStick(event){if(event.pointerId!==joystickPointer)return;joystickPointer=null;joystick={forward:0,strafe:0};$('joystick-knob').style.transform='';}
stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);stick.addEventListener('lostpointercapture',releaseStick);
window.addEventListener('blur',()=>{if(active())openPause();else clearInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(entered&&!paused)openPause();else stop();}});
window.addEventListener('resize',()=>{renderer?.resize(preferences.quality);if(!document.hidden)draw();});
motionQuery.addEventListener?.('change',event=>{preferences.reducedMotion=event.matches;syncPreferences();});
window.addEventListener('pagehide',()=>{stop();audio.dispose();});

// Read-only diagnostics help future maintenance; they never transmit visitor data.
window.staircase=Object.freeze({
  snapshot:()=>structuredClone(state),
  metrics:()=>({frames:measuredFrames,meanRenderMs:measuredFrames?+(totalRenderMs/measuredFrames).toFixed(2):0,maxRenderMs:+maxRenderMs.toFixed(2),lastRenderMs:renderer?.stats.lastRenderMs||0,polygons:renderer?.stats.polygons||0,canvasWidth:canvas.width,canvasHeight:canvas.height,quality:preferences.quality,paused,rafPending:!!raf,audioState:audio.context?.state||'not-started',heapBytes:performance.memory?.usedJSHeapSize||null})
});
syncPreferences();
try{renderer=new Renderer(canvas,{quality:preferences.quality});renderer.resize(preferences.quality);draw();}
catch(error){console.warn('The visual view is unavailable; text exploration remains available.',error.message);renderer=null;}
document.documentElement.dataset.paused='true';
$('loading-message').hidden=true;
$('enter').focus({preventScroll:true});
