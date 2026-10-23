"""A lost WebGL context must invalidate pending material callbacks."""
import sys,json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4190/'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page();pending=[]
 page.route('**/assets/materials/*.jpg',lambda route:pending.append(route))
 page.goto(BASE,wait_until='domcontentloaded');page.wait_for_function('window.staircase?.metrics().backend==="webgl"')
 page.wait_for_timeout(100);assert len(pending)==2,len(pending)
 page.evaluate('window.loss=document.getElementById("scene").getContext("webgl").getExtension("WEBGL_lose_context");window.loss.loseContext()')
 page.wait_for_function('window.staircase.metrics().backend==="text"');page.wait_for_timeout(250);page.evaluate('window.loss.restoreContext()')
 page.wait_for_function('window.staircase.metrics().backend==="webgl"');page.wait_for_timeout(100)
 # Chromium can coalesce the old and new Image requests; deliver all pending responses.
 for route in pending:route.fulfill(path=str(Path('assets/materials')/route.request.url.split('/')[-1]),content_type='image/jpeg')
 page.wait_for_function('window.staircase.metrics().materialsReady');page.wait_for_timeout(150)
 error=page.evaluate('document.getElementById("scene").getContext("webgl").getError()')
 assert error==0,f'late material callback used invalid texture: GL {error}'
 print(json.dumps({'passed':True,'lateCallbacks':2,'graphicsError':error}))
 b.close()
