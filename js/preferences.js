const KEY = 'staircase.preferences.v1';
export const defaults = (reducedMotion = false) => ({audio:false,reducedMotion:!!reducedMotion,flicker:false,quality:'low'});
export function readPreferences(storage,reducedMotion=false){
  let stored;
  try { stored=JSON.parse(storage?.getItem(KEY)||'{}'); } catch { stored={}; }
  const result=defaults(reducedMotion);
  if(!stored||typeof stored!=='object') return result;
  for(const key of ['audio','reducedMotion','flicker']) if(typeof stored[key]==='boolean') result[key]=stored[key];
  result.reducedMotion=!!reducedMotion||result.reducedMotion;
  if(stored.quality==='high') result.quality='high';
  return result;
}
export function savePreferences(storage,preferences){
  try { storage?.setItem(KEY,JSON.stringify({audio:preferences.audio,reducedMotion:preferences.reducedMotion,flicker:preferences.flicker,quality:preferences.quality})); return !!storage; } catch {return false;}
}
