"""All-room integration, bounded resource use, and subpath checks (development only)."""
import json, os, sys, time
from pathlib import Path
from collections import deque
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4173/'
OUT=Path('.test-artifacts');OUT.mkdir(exist_ok=True)
results={'base':BASE,'locations':[],'checks':[]}
def check(name, value):
    results['checks'].append({'name':name,'passed':bool(value)})
    assert value,name

def path_to(graph,start,end):
    q=deque([(start,[])])
    seen={start}
    while q:
        here,route=q.popleft()
        if here==end:return route
        for d in graph[here]['doors']:
            if d['to'] not in seen:
                seen.add(d['to']);q.append((d['to'],route+[d]))
    raise AssertionError(f'No route from {start} to {end}')

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader','--enable-precise-memory-info'])
        ctx=browser.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce')
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        begin=time.perf_counter();page.goto(BASE,wait_until='networkidle')
        results['initialLoadMs']=round((time.perf_counter()-begin)*1000,2)
        page.get_by_role('button',name='Enter the building',exact=True).click();page.wait_for_timeout(100)
        check('real WebGL renderer active',page.evaluate('window.staircase.metrics().backend')=='webgl')
        results['graphicsDriver']=page.evaluate('(()=>{const g=document.getElementById("scene").getContext("webgl"),e=g.getExtension("WEBGL_debug_renderer_info");return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):"unreported"})()')
        graph=page.evaluate("async()=>{const m=await import('./js/world.js');return m.SCENES}")
        cdp=ctx.new_cdp_session(page);cdp.send('HeapProfiler.collectGarbage')
        baseline=cdp.send('Runtime.getHeapUsage');results['heapBeforeBytes']=baseline['usedSize']
        def travel(dest):
            current=page.evaluate('window.staircase.snapshot().sceneId')
            for d in path_to(graph,current,dest):
                page.get_by_role('button',name='Pause / controls',exact=True).click()
                page.get_by_role('button',name='Explore without aiming',exact=True).click()
                page.locator('#route-list').get_by_role('button',name='Go through '+d['label'],exact=True).click()
                page.wait_for_timeout(50)
                check('transition '+current+' -> '+d['to'],page.evaluate('window.staircase.snapshot().sceneId')==d['to'])
                current=d['to']
        for location in graph:
            travel(location);results['locations'].append(location)
            check('no WebGL errors in '+location,page.evaluate('document.getElementById("scene").getContext("webgl").getError()')==0)
            page.screenshot(path=str(OUT/('scene-'+location+'.png')))
            page.locator('#scene').focus();page.keyboard.down('ArrowRight');page.wait_for_timeout(700);page.keyboard.up('ArrowRight');page.wait_for_timeout(100)
        check('all ten locations visited in browser',len(set(results['locations']))>=10)
        for i in range(4):
            for location in graph:travel(location)
        page.wait_for_function('!window.staircase.metrics().rafPending',timeout=2000)
        cdp.send('HeapProfiler.collectGarbage')
        final=cdp.send('Runtime.getHeapUsage');results['heapAfterBytes']=final['usedSize'];results['heapGrowthBytes']=final['usedSize']-baseline['usedSize']
        results['metrics']=page.evaluate('window.staircase.metrics()')
        frames=results['metrics']['frames'];page.wait_for_timeout(2000)
        check('zero idle canvas frames over two seconds',page.evaluate('window.staircase.metrics().frames')==frames)
        cdp.send('Performance.enable')
        def cpu_metric():
            return {m['name']:m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
        t0=cpu_metric();page.wait_for_timeout(2000);t1=cpu_metric()
        results['idleMainThreadTaskMsOver2s']=round((t1['TaskDuration']-t0['TaskDuration'])*1000,2)
        page.locator('#scene').focus();frames=page.evaluate('window.staircase.metrics().frames');t0=cpu_metric()
        page.keyboard.down('ArrowRight');page.wait_for_timeout(3000);page.keyboard.up('ArrowRight');t1=cpu_metric()
        results['movingMainThreadTaskMsOver3s']=round((t1['TaskDuration']-t0['TaskDuration'])*1000,2)
        results['movingSampleWallMs']=round((t1['Timestamp']-t0['Timestamp'])*1000,2)
        results['movingFramesOver3s']=page.evaluate('window.staircase.metrics().frames')-frames
        check('low power frame cap respected',results['movingFramesOver3s']<=results['metrics']['frameRateLimit']*3+3)
        if results['metrics']['softwareRendering']:
            check('software fallback leaves processor headroom',results['movingMainThreadTaskMsOver3s']<1000)
        page.get_by_role('button',name='Pause / controls',exact=True).click()
        frames=page.evaluate('window.staircase.metrics().frames');page.wait_for_timeout(500)
        check('zero paused canvas frames',page.evaluate('window.staircase.metrics().frames')==frames)
        check('bounded canvas backing pixels',page.evaluate('document.querySelector("canvas").width*document.querySelector("canvas").height')<=550000)
        results['resourceBytes']=page.evaluate('performance.getEntriesByType("resource").reduce((a,r)=>a+r.transferSize,0)+performance.getEntriesByType("navigation")[0].transferSize')
        results['requests']=page.evaluate('performance.getEntriesByType("resource").map(r=>r.name)')
        check('no external asset requests',all(x.startswith(BASE) for x in results['requests']))
        check('no script errors during repeated visits',not errors)
        check('heap growth after repeated visits under 5 MB',results['heapGrowthBytes']<5*1024*1024)
        results['errors']=errors
        browser.close()
finally:
    (OUT/'performance-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
