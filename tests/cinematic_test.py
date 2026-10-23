"""Cinematic material acceptance: actual WebGL, local assets, idle and restoration."""
import json, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4190/'
OUT=Path('.test-artifacts/cinematic');OUT.mkdir(parents=True,exist_ok=True)
r={'checks':[],'errors':[],'badResponses':[]}
def check(name,value):
 r['checks'].append({'name':name,'passed':bool(value)});assert value,name
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce')
 page=c.new_page();page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('response',lambda res:r['badResponses'].append(res.url) if res.status>=400 else None)
 page.goto(BASE);page.wait_for_function('window.staircase?.metrics().materialsReady')
 check('atlas and normal maps upload successfully',page.evaluate('window.staircase.metrics().materialsReady'))
 page.get_by_role('button',name='Controls & accessibility',exact=True).click();page.locator('#pref-quality').select_option('high');page.get_by_role('button',name='Close controls',exact=True).click()
 page.screenshot(path=str(OUT/'opening-desktop.png'))
 page.get_by_role('button',name='Enter the building',exact=True).click();page.wait_for_function('!window.staircase.metrics().rafPending')
 check('material shader links on WebGL 1',page.evaluate('window.staircase.metrics().backend')=='webgl')
 check('driver reports no graphics error',page.evaluate('document.getElementById("scene").getContext("webgl").getError()')==0)
 page.screenshot(path=str(OUT/'lobby-desktop.png'))
 page.locator('#scene').focus();before=page.evaluate('window.staircase.snapshot().player')
 page.keyboard.down('w');page.wait_for_timeout(500);page.keyboard.up('w');page.wait_for_function('!window.staircase.metrics().rafPending')
 check('walking works with detailed materials',before!=page.evaluate('window.staircase.snapshot().player'))
 frames=page.evaluate('window.staircase.metrics().frames');page.wait_for_timeout(600)
 check('loaded materials do not create idle animation',page.evaluate('window.staircase.metrics().frames')==frames)
 # Context restoration must load/upload maps again, not retain invalid GPU handles.
 page.evaluate('window.loss=document.getElementById("scene").getContext("webgl").getExtension("WEBGL_lose_context");window.loss.loseContext()');page.wait_for_function('window.staircase.metrics().backend==="text"')
 page.wait_for_timeout(250);page.evaluate('window.loss.restoreContext()');page.wait_for_function('window.staircase.metrics().materialsReady')
 check('maps reupload after graphics restoration',page.evaluate('window.staircase.metrics().backend')=='webgl')
 check('restoration stays paused',page.locator('#pause-dialog').is_visible())
 page.get_by_role('button',name='Continue wandering',exact=True).click();page.wait_for_function('!window.staircase.metrics().rafPending')
 check('restored graphics are error free',page.evaluate('document.getElementById("scene").getContext("webgl").getError()')==0)
 r['metrics']=page.evaluate('window.staircase.metrics()')
 check('all requested assets are local',all(e.startswith(BASE) for e in page.evaluate('performance.getEntriesByType("resource").map(r=>r.name)')))
 check('no failed HTTP responses',not r['badResponses']);check('no JavaScript exceptions',not r['errors'])
 c.close()
 fallback=b.new_context(viewport={'width':800,'height':600})
 fallback.add_init_script("const original=WebGLRenderingContext.prototype.getExtension;WebGLRenderingContext.prototype.getExtension=function(name){return name==='EXT_shader_texture_lod'?null:original.call(this,name)}")
 fp=fallback.new_page();fp.goto(BASE);fp.wait_for_function('window.staircase?.metrics().materialsReady')
 check('WebGL 1 without gradient extension remains usable',fp.evaluate('window.staircase.metrics().backend')=='webgl')
 check('compatible atlas sampling produces no graphics error',fp.evaluate('document.getElementById("scene").getContext("webgl").getError()')==0)
 fallback.close();b.close()
(OUT/'results.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
