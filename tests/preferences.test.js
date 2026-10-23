import test from 'node:test';
import assert from 'node:assert/strict';
import {readPreferences,savePreferences,defaults} from '../js/preferences.js';
test('blocked or corrupt storage never prevents safe defaults',()=>{
 assert.equal(readPreferences({getItem(){throw Error('blocked')}},true).reducedMotion,true);
 assert.equal(readPreferences({getItem(){return '{broken'}},false).quality,'low');
 assert.equal(readPreferences({getItem(){return 'null'}},false).audio,false);
});
test('untrusted stored fields cannot increase graphics or enable invalid flags',()=>{
 const p=readPreferences({getItem(){return JSON.stringify({quality:'ultra',audio:'yes',reducedMotion:false,flicker:true,tracking:'bad'})}},true);
 assert.deepEqual(p,{audio:false,reducedMotion:false,flicker:true,quality:'low'});
});
test('valid choices round trip locally without extra data',()=>{
 let value; const storage={getItem(){return value},setItem(k,v){value=v}};
 const p={...defaults(false),audio:true,quality:'high'};
 assert.equal(savePreferences(storage,p),true);
 assert.deepEqual(readPreferences(storage,false),p);
 assert.equal(savePreferences({setItem(){throw Error('quota')}},p),false);
});
