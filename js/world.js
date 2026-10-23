const palette = {
  wall: '#b3ad91', lower: '#5a6654', floor: '#544939', ceiling: '#777365'
};

const door = (id, wall, offset, to, label, style) => ({ id, wall, offset, width: 1.5, label, to, ...(style ? { style } : {}) });
const item = (id, type, x, z, w, d, h, title, text, { solid = false, clue } = {}) => ({ id, type, x, z, w, d, h, title, text, ...(clue ? { clue } : {}), solid });

function room(id, name, floor, kind, spawn, doors, objects, description, extra = {}) {
  const { width = 12, depth = 12, height = 3.4, ...attributes } = extra;
  return {
    id, name, floor, kind, width, depth, height,
    spawn, colors: { ...palette }, doors, objects, description, ...attributes
  };
}

export const START_SCENE = 'entrance';

export const SCENES = {
  entrance: room('entrance', 'The Remembered Lobby', 'GROUND', 'lobby', { x: 6, z: 2.5, yaw: 0 }, [
    door('north-stair', 'north', 6, 'first-stairwell', 'STAIRS'),
    door('east-corridor', 'east', 6, 'repeating-corridor', 'ROOMS'),
    door('front-entry', 'south', 6, 'repeating-corridor', 'ENTRY')
  ], [
    item('reception-desk', 'desk', 3, 5, 2.4, 1.0, 1.2, 'Reception desk', 'A brass bell has been polished clean around its silence.', { solid: true }),
    item('lobby-directory', 'directory', 9, 8, 0.7, 0.5, 2.0, 'Directory', 'The ground-floor listing is rubbed blank. A pencilled arrow points down.', { solid: true, clue: 'The lobby is remembered differently each time.' }),
    item('lobby-clock', 'clock', 3.2, 10.3, 0.5, 0.15, 0.6, 'Stopped clock', 'Its hands meet at 2:14. The minute hand trembles, but does not move.', { clue: '2:14 appears to be a remembered time, not a working one.' }),
    item('silent-lift', 'elevator', 8.8, 3.2, 1.5, 0.3, 2.5, 'Silent elevator', 'The call button is unlit. A soft glow waits behind the closed doors.', { solid: true })
  ], 'The lobby has the proportions of a place remembered from a doorway: reception, a directory, and a light that seems to be waiting for you.'),

  'first-stairwell': room('first-stairwell', 'First Stairwell', '01', 'stairwell', { x: 6, z: 3, yaw: 0 }, [
    door('back-lobby', 'south', 6, 'entrance', 'LOBBY'),
    door('east-rooms', 'east', 6, 'repeating-corridor', 'ROOMS'),
    door('upper-stair', 'north', 6, 'impossible-staircase', 'UP')
  ], [
    item('stair-rail', 'rail', 2.2, 7, 0.15, 5.8, 1.0, 'Painted handrail', 'The green paint is worn smooth at the height of a familiar hand.', { solid: true }),
    item('stair-notice', 'note', 9.7, 8.6, 0.35, 0.1, 0.4, 'Inspection notice', 'The stair inspection is scheduled for yesterday.', { clue: 'The building keeps dates without keeping a calendar.' })
  ], 'A narrow stairwell rises out of sight. The landing is broad enough for two people who do not recognize one another.', {
    stairs: { x: 9, z: 2, width: 1.8, length: 6.5, rise: 1.2, to: 'impossible-staircase' }, height: 4.4
  }),

  'repeating-corridor': room('repeating-corridor', 'Repeating Corridor', '02', 'corridor', { x: 4, z: 11, yaw: 0 }, [
    door('west-lobby', 'west', 8, 'entrance', 'LOBBY'),
    door('west-stairwell', 'west', 14, 'first-stairwell', 'STAIRS'),
    door('room-214', 'north', 4, 'room-214', '214'),
    door('east-service', 'east', 11, 'service-corridor', 'SERVICE')
  ], [
    item('corridor-bench', 'bench', 2.1, 11, 1.8, 0.55, 0.55, 'Bench', 'A small dry crescent marks the seat, as if someone stood moments ago.', { solid: true }),
    item('corridor-mirror', 'mirror', 6.1, 18.5, 0.8, 0.12, 1.7, 'Narrow mirror', 'The corridor in the glass seems a little longer than the corridor behind you.', { clue: 'The same passage may be a reconstruction, not a route.' }),
    item('room-number', 'sign', 4, 20.7, 0.5, 0.1, 0.25, 'Enamel number', '214. The last digit has been replaced more than once.')
  ], 'A long carpeted passage repeats its doors at patient intervals. The pattern almost, but not quite, predicts the next one.', { width: 8, depth: 22 }),

  'room-214': room('room-214', 'Room 214', '02', 'guestroom', { x: 6, z: 2.6, yaw: 0 }, [
    door('back-corridor', 'south', 6, 'repeating-corridor', 'CORRIDOR'),
    door('unlisted-connection', 'west', 6, 'unlisted-floor', '214½')
  ], [
    item('bed-214', 'bed', 8.6, 7.2, 2.6, 2.2, 0.75, 'Unmade bed', 'One side is carefully turned down. The other side has never been slept in.', { solid: true, clue: 'The room has been prepared for someone who remembers it.' }),
    item('chair-214', 'chair', 5.1, 7.0, 0.75, 0.75, 0.9, 'Chair', 'The chair faces the wall, although the room has a window.', { solid: true }),
    item('desk-214', 'desk', 3.1, 5.9, 1.8, 0.8, 1.05, 'Writing desk', 'The drawer is empty except for a clean rectangle where a key rested.', { solid: true }),
    item('telephone-214', 'telephone', 3.1, 7.2, 0.45, 0.4, 0.7, 'Quiet telephone', 'No ringing, no dial tone. The receiver is warm when lifted.', { solid: true, clue: 'The room waits for a call that may belong to the past.' }),
    item('room-note', 'note', 3.1, 9.3, 0.25, 0.06, 0.3, 'Folded note', 'If you find the lobby, do not assume it is the first one.', { clue: 'A note links the remembered lobby to the rooms beyond it.' }),
    item('room-clock', 'clock', 6, 10.8, 0.45, 0.12, 0.35, 'Bedside clock', '2:14, without a.m. or p.m.')
  ], 'The room is tidy in the way of a place prepared for inspection. A familiar number appears in several unrelated places.'),

  'service-corridor': room('service-corridor', 'Service Corridor', 'B1', 'service', { x: 2.7, z: 8, yaw: Math.PI / 2 }, [
    door('public-corridor', 'west', 8, 'repeating-corridor', 'ROOMS'),
    door('lift-hall', 'north', 4, 'elevator-hall', 'LIFT'),
    door('water-landing', 'east', 8, 'flooded-landing', 'DRAINAGE')
  ], [
    item('service-pipes', 'pipe', 6.5, 8, 0.5, 4.8, 2.7, 'Warm pipes', 'A slow knock travels through them, pausing at a rhythm like footsteps.', { solid: true }),
    item('service-telephone', 'telephone', 2.5, 12.4, 0.55, 0.45, 0.8, 'Service telephone', 'The receiver smells faintly of rain. No cord reaches the wall.', { solid: true, clue: 'A disconnected line still carries the building’s memory.' }),
    item('service-label', 'note', 4, 2.2, 0.45, 0.08, 0.25, 'Pipe label', 'RETURN TO BASEMENT. The arrow points toward the ceiling.')
  ], 'The service passage is warmer than the rooms above. Pipes cross the low ceiling and vanish through walls at impossible angles.', { width: 8, depth: 16 }),

  'elevator-hall': room('elevator-hall', 'Elevator Hall', 'B1', 'elevator', { x: 6, z: 3, yaw: 0 }, [
    door('back-service', 'south', 6, 'service-corridor', 'SERVICE'),
    door('unlit-floor', 'north', 6, 'windowless-floor', '—'),
    door('unlisted-lift', 'east', 6, 'unlisted-floor', 'LIFT · —', 'elevator')
  ], [
    item('elevator', 'elevator', 3, 7, 2.2, 0.35, 2.6, 'Elevator doors', 'The brass doors reflect a corridor with one extra doorway.', { solid: true, clue: 'The elevator offers a floor that the directory omits.' }),
    item('lift-panel', 'directory', 8.8, 7, 0.3, 0.12, 1.3, 'Floor panel', 'The button below B1 is worn smooth, but never lights.', { solid: true }),
    item('lift-bench', 'bench', 8.3, 3, 1.6, 0.55, 0.55, 'Waiting bench', 'Dust gathers on the ends, leaving the middle oddly clear.', { solid: true })
  ], 'The elevator doors are shut, though the call button glows softly. Its unmarked button opens onto the unlisted floor.'),

  'flooded-landing': room('flooded-landing', 'Flooded Landing', 'B1½', 'flooded', { x: 2.7, z: 6, yaw: Math.PI / 2 }, [
    door('back-service', 'west', 6, 'service-corridor', 'SERVICE'),
    door('stair-above-water', 'north', 6, 'impossible-staircase', 'UP')
  ], [
    item('waterline', 'mark', 6, 6, 10.5, 0.08, 0.02, 'Waterline', 'A clean band around the plaster sits just above ankle height.', { clue: 'Someone has measured the water against a familiar body.' }),
    item('flooded-chair', 'chair', 9, 3.5, 0.9, 0.9, 0.85, 'Floating chair', 'The chair is dry. A slow ripple passes beneath it.', { solid: true }),
    item('drain', 'pipe', 3, 9, 0.7, 0.7, 0.15, 'Floor drain', 'The water circles the drain without entering it.')
  ], 'A shallow sheet of water mirrors the ceiling. The landing is quiet except for a ripple that arrives without a sound.'),

  'windowless-floor': room('windowless-floor', 'Windowless Floor', '03', 'windowless', { x: 4, z: 3, yaw: 0 }, [
    door('back-elevator', 'south', 4, 'elevator-hall', 'LIFT'),
    door('unlisted-door', 'east', 10, 'unlisted-floor', '—')
  ], [
    item('windowless-desk', 'desk', 2.3, 12, 2, 0.9, 1.1, 'Writing desk', 'A rectangle of dust is missing where a photograph once stood.', { solid: true, clue: 'The missing photograph left a place-shaped absence.' }),
    item('windowless-mirror', 'mirror', 6.2, 15.4, 0.75, 0.12, 1.8, 'Black mirror', 'No reflection appears, but the glass is warm.', { solid: true }),
    item('floor-sign', 'sign', 4, 18.7, 0.55, 0.12, 0.25, 'Floor sign', '03. The enamel below it says GROUND.')
  ], 'There are no windows, and no convincing substitute for them. A faint daylight color remains on the walls.', { width: 8, depth: 20 }),

  'impossible-staircase': room('impossible-staircase', 'Impossible Staircase', '04', 'stairwell', { x: 6, z: 3, yaw: 0 }, [
    door('back-first', 'south', 6, 'first-stairwell', 'DOWN'),
    door('water-stair', 'south', 9, 'flooded-landing', 'WATER'),
    door('stair-unlisted', 'east', 6, 'unlisted-floor', 'UP')
  ], [
    item('stair-clock', 'clock', 3, 9.7, 0.45, 0.12, 0.5, 'Stairwell clock', 'The hands point to 2:14. The clock is mounted upside down.', { clue: '2:14 recurs where the building changes direction.' }),
    item('stair-landing-chair', 'chair', 9.7, 10, 0.8, 0.8, 0.85, 'Landing chair', 'A chair waits at the top, turned toward the stairs.', { solid: true })
  ], 'The stair climbs at a steady pitch, but each landing seems level with where it began.', {
    stairs: { x: 9, z: 2, width: 2, length: 7, rise: 2.2, to: 'unlisted-floor' }, height: 4.4
  }),

  'unlisted-floor': room('unlisted-floor', 'Unlisted Floor', '—', 'unlisted', { x: 6, z: 3, yaw: 0 }, [
    door('back-lift', 'west', 6, 'elevator-hall', 'LIFT'),
    door('back-windowless', 'south', 6, 'windowless-floor', '03'),
    door('back-room214', 'north', 6, 'room-214', '214'),
    door('back-stairs', 'west', 9, 'impossible-staircase', 'STAIRS')
  ], [
    item('unlisted-directory', 'directory', 9, 8, 0.7, 0.5, 2.0, 'Directory', 'The ground-floor listing is rubbed blank. A pencilled arrow points down.', { solid: true, clue: 'The lobby is remembered differently each time.' }),
    item('unlisted-desk', 'desk', 3, 5, 2.4, 1.0, 1.2, 'Reception desk', 'The brass bell is polished clean around its silence.', { solid: true }),
    item('unlisted-lift', 'elevator', 8.8, 3.2, 1.5, 0.3, 2.5, 'Silent elevator', 'The call button is unlit. A soft glow waits behind the closed doors.', { solid: true }),
    item('unlisted-bench', 'bench', 8.8, 5.3, 1.7, 0.55, 0.55, 'Waiting bench', 'The center cushion is slightly warm.', { solid: true }),
    item('unlisted-note', 'note', 6, 10.2, 0.25, 0.06, 0.3, 'Loose card', '2:14 — the time the doors were meant to open.')
  ], 'The floor is not dark, only unregistered. Its doors lead to places that have already been visited, but from a different side.')
};

export function doorPosition(scene, value) {
  if (!scene || !value) return { x: NaN, z: NaN };
  const offset = Number(value.offset);
  switch (value.wall) {
    case 'north': return { x: offset, z: scene.depth };
    case 'south': return { x: offset, z: 0 };
    case 'east': return { x: scene.width, z: offset };
    case 'west': return { x: 0, z: offset };
    default: return { x: NaN, z: NaN };
  }
}

export function getScene(id, visits = 1) {
  const original = SCENES[id];
  if (!original) return null;
  const scene = { ...original, colors: { ...original.colors }, spawn: { ...original.spawn }, doors: original.doors.map(d => ({ ...d })), objects: original.objects.map(o => ({ ...o })) };
  if (id === 'entrance' && visits > 1) {
    const entry = scene.doors.find(d => d.id === 'front-entry');
    if (entry) { entry.to = 'unlisted-floor'; entry.label = '—'; }
    const directory = scene.objects.find(o => o.id === 'lobby-directory');
    if (directory) directory.text = 'The directory now lists a floor that was not there before.';
    scene.floor = visits % 2 === 0 ? 'GROUND?' : 'GROUND';
  }
  if (id === 'room-214' && visits > 1) {
    const chair = scene.objects.find(o => o.id === 'chair-214');
    if (chair) { chair.x = visits % 2 === 0 ? 5.8 : 4.4; chair.z = visits % 2 === 0 ? 6.4 : 7.8; }
    const clock = scene.objects.find(o => o.id === 'room-clock');
    if (clock) clock.title = visits % 2 === 0 ? 'Clock with reversed hands' : 'Bedside clock';
  }
  if (visits > 1) {
    const sign = scene.objects.find(o => o.id === 'room-number' || o.id === 'floor-sign');
    if (sign) sign.text = visits % 2 === 0 ? `${sign.text.split('.')[0]}. The enamel is still warm.` : `${sign.text.split('.')[0]}. The last digit has been replaced more than once.`;
  }
  return scene;
}
