"""Capture actual UI routes for review; never fabricate or replace the rendered view."""
from collections import deque
from pathlib import Path
import os,sys,json
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4180/Staircase-to-Nowhere/'
QUALITY=sys.argv[2] if len(sys.argv)>2 else 'low'
assert QUALITY in ('low','high')
OUT=Path('.test-artifacts/visual-detail' if QUALITY=='high' else '.test-artifacts/visual');OUT.mkdir(parents=True,exist_ok=True)
errors=[]
def choose_quality(page):
 if QUALITY=='high':
  page.get_by_role('button',name='Controls & accessibility',exact=True).click()
  page.locator('#pref-quality').select_option('high')
  page.get_by_role('button',name='Close controls',exact=True).click()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader'])
 ctx=b.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce');page=ctx.new_page()
 page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.wait_for_timeout(150);choose_quality(page)
 page.screenshot(path=str(OUT/'00-desktop-invitation.png'))
 page.get_by_role('button',name='Enter the building',exact=True).click()
 graph=page.evaluate("async()=>{const {SCENES}=await import('./js/world.js');return Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.doors.map(d=>({to:d.to,label:d.label}))]))}")
 def route(start,target):
  q=deque([(start,[])]);seen={start}
  while q:
   at,path=q.popleft()
   if at==target:return path
   for d in graph[at]:
    if d['to'] not in seen:seen.add(d['to']);q.append((d['to'],path+[d]))
  raise AssertionError('unreachable '+target)
 def goto(target):
  at=page.evaluate('window.staircase.snapshot().sceneId')
  if at==target:return
  for step in route(at,target):
   page.get_by_role('button',name='Pause / controls',exact=True).click()
   page.get_by_role('button',name='Explore without aiming',exact=True).click()
   page.get_by_role('button',name='Go through '+step['label'],exact=True).click()
 for i,id in enumerate(graph,1):
  goto(id);page.wait_for_timeout(100);page.screenshot(path=str(OUT/f'{i:02d}-{id}.png'))
  assert page.evaluate('window.staircase.metrics().backend')=='webgl'
  error=page.evaluate('document.getElementById("scene").getContext("webgl").getError()')
  assert error==0,f'{id}: WebGL error {error}'
 for name,size in [('mobile-portrait',{'width':390,'height':844}),('mobile-landscape',{'width':844,'height':390}),('narrow-320',{'width':320,'height':720})]:
  c=b.new_context(viewport=size,is_mobile=True,has_touch=True,device_scale_factor=2,reduced_motion='reduce');m=c.new_page();m.goto(BASE);m.wait_for_timeout(100);choose_quality(m)
  m.screenshot(path=str(OUT/f'{name}-invitation.png'));m.get_by_role('button',name='Enter the building',exact=True).click();m.wait_for_timeout(100);m.screenshot(path=str(OUT/f'{name}-lobby.png'))
  assert m.evaluate('document.documentElement.scrollWidth<=innerWidth and document.documentElement.scrollHeight<=innerHeight'.replace(' and ',' && '))
  c.close()
 b.close()
assert not errors,errors
print(json.dumps({'quality':QUALITY,'screenshots':len(list(OUT.glob('*.png'))),'errors':errors,'folder':str(OUT.resolve())},indent=2))
