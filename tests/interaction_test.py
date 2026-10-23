"""Focused interaction and lifecycle regressions; local development only."""
import json, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4173/'
OUT=Path('.test-artifacts');OUT.mkdir(exist_ok=True)
report={'checks':[],'errors':[]}
def check(name,ok):
    report['checks'].append({'name':name,'passed':bool(ok)})
    assert ok,name
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1280,'height':800})
        page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.goto(BASE);page.keyboard.press('Enter');page.wait_for_timeout(100)
        check('keyboard-only title entry',page.locator('#hud').is_visible())
        prevented=page.evaluate('()=>{const e=new KeyboardEvent("keydown",{key:"w",ctrlKey:true,bubbles:true,cancelable:true});document.getElementById("scene").dispatchEvent(e);document.dispatchEvent(new KeyboardEvent("keyup",{key:"w",bubbles:true}));return e.defaultPrevented}')
        check('browser shortcuts are not captured as movement',not prevented)
        page.keyboard.press('Escape')
        # Native modal must keep Tab navigation within itself.
        for _ in range(22):
            page.keyboard.press('Tab')
            check('pause traps focus',page.evaluate('document.getElementById("pause-dialog").contains(document.activeElement)'))
        page.keyboard.press('Escape')
        check('Escape restores scene focus',page.evaluate('document.activeElement.id')=='scene')
        page.get_by_role('button',name='Pause / controls',exact=True).click()
        page.get_by_role('button',name='Explore without aiming',exact=True).click()
        page.locator('#object-list button').first.click()
        check('inspection opens',page.locator('#inspection-dialog').is_visible())
        page.keyboard.press('Escape')
        check('inspection closes and restores movement',not page.locator('#inspection-dialog').is_visible() and page.evaluate('document.activeElement.id')=='scene')
        page.get_by_role('button',name='Pause / controls',exact=True).click()
        page.get_by_role('button',name='Enable mouse capture',exact=True).click();page.wait_for_timeout(200)
        locked=page.evaluate('document.pointerLockElement?.id')=='scene'
        report['pointerLockAcquired']=locked
        if locked:
            before=page.evaluate('window.staircase.snapshot().player.yaw');page.mouse.move(700,350);page.mouse.move(850,400);page.wait_for_timeout(100)
            check('captured mouse movement changes view',before!=page.evaluate('window.staircase.snapshot().player.yaw'))
            # Browser-level Escape support varies in headless mode; release through the standard API.
            page.evaluate('document.exitPointerLock()');page.wait_for_timeout(100)
            check('pointer-lock release opens pause',page.locator('#pause-dialog').is_visible())
        else:
            check('pointer lock fallback preserves controls',page.get_by_role('button',name='Pause / controls',exact=True).is_visible())
            page.get_by_role('button',name='Pause / controls',exact=True).click()
        page.get_by_label('Graphics',exact=False).select_option('high')
        check('detail pixels bounded',page.evaluate('document.querySelector("canvas").width*document.querySelector("canvas").height')<=1200000)
        page.get_by_role('button',name='Continue wandering',exact=True).click()
        # Losing the active window clears held movement and pauses audio/rendering.
        page.keyboard.down('w');page.wait_for_timeout(100)
        page.evaluate('window.dispatchEvent(new Event("blur"))');page.keyboard.up('w')
        check('window blur pauses',page.locator('#pause-dialog').is_visible())
        frozen=page.evaluate('window.staircase.snapshot().player');frames=page.evaluate('window.staircase.metrics().frames');page.wait_for_timeout(300)
        check('blur clears held input and rendering',frozen==page.evaluate('window.staircase.snapshot().player') and frames==page.evaluate('window.staircase.metrics().frames'))
        click_context=browser.new_context(viewport={'width':1280,'height':800})
        c=click_context.new_page();c.goto(BASE);c.get_by_role('button',name='ENTER THE BUILDING',exact=True).click();c.locator('#scene').focus()
        c.keyboard.down('w');c.wait_for_timeout(4000);c.keyboard.up('w');c.wait_for_timeout(100)
        check('a door can be aimed after walking to it',c.locator('#interaction-label').inner_text().startswith('Open '))
        wall_frames=c.evaluate('window.staircase.metrics().frames');c.keyboard.down('w');c.wait_for_timeout(500);c.keyboard.up('w');c.wait_for_timeout(100)
        check('walking against a solid wall does not keep redrawing',c.evaluate('window.staircase.metrics().frames')-wall_frames<=1)
        c.get_by_role('button',name='Pause / controls',exact=True).click();c.get_by_role('button',name='Enable mouse capture',exact=True).click();c.wait_for_timeout(100)
        if c.evaluate('document.pointerLockElement?.id')=='scene':
            c.locator('#scene').dispatch_event('pointerdown',{'pointerId':1,'pointerType':'mouse','clientX':640,'clientY':400,'button':0,'bubbles':True})
            c.locator('#scene').dispatch_event('pointerup',{'pointerId':1,'pointerType':'mouse','clientX':640,'clientY':400,'button':0,'bubbles':True})
            c.locator('#scene').dispatch_event('click',{'button':0,'bubbles':True})
            c.wait_for_timeout(100)
            check('one captured click opens but does not enter a door',c.evaluate('window.staircase.snapshot().sceneId')=='entrance')
        click_context.close()
        # A denied lock is an expected browser restriction, never a dead end.
        denied=browser.new_context();denied.add_init_script('HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.reject(new Error("Denied"))')
        d=denied.new_page();d.goto(BASE);d.get_by_role('button',name='ENTER THE BUILDING',exact=True).click();d.get_by_role('button',name='Pause / controls',exact=True).click();d.get_by_role('button',name='Enable mouse capture',exact=True).click()
        check('denied capture explains fallback',d.locator('#toast').inner_text().startswith('Mouse capture is unavailable'))
        d.locator('#scene').focus();before=d.evaluate('window.staircase.snapshot().player.yaw');d.keyboard.down('ArrowRight');d.wait_for_timeout(120);d.keyboard.up('ArrowRight')
        check('denied capture still allows keyboard look',d.evaluate('window.staircase.snapshot().player.yaw')!=before)
        denied.close()
        # Title and object dialogs also receive the automated accessibility audit.
        page.goto(BASE)
        axe_path=Path(os.environ.get('AXE_PATH','node_modules/axe-core/axe.min.js'))
        if not axe_path.exists():axe_path=Path('.test-artifacts/axe.min.js')
        if axe_path.exists():
            page.add_script_tag(path=str(axe_path))
            r=page.evaluate('async()=>await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})')
            report['axeTitle']=[v['id'] for v in r['violations']];check('axe title has no violations',not report['axeTitle'])
        else:report['axeTitleSkipped']='Install development-only axe-core or set AXE_PATH to run this audit.'
        check('no uncaught errors',not report['errors'])
        browser.close()
finally:
    (OUT/'interaction-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
