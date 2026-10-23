const palette = {
  wall: '#b3ad91', lower: '#5a6654', floor: '#544939', ceiling: '#777365'
};

const door = (id, wall, offset, to, label, style) => ({ id, wall, offset, width: 1.5, label, to, ...(style ? { style } : {}) });
const item = (id, type, x, z, w, d, h, title, text, { solid = false, clue, ...metadata } = {}) => ({ id, type, x, z, w, d, h, title, text, ...(clue ? { clue } : {}), solid, ...metadata });

function room(id, name, floor, kind, spawn, doors, objects, description, extra = {}) {
  const { width = 12, depth = 12, height = 3.4, ...attributes } = extra;
  return {
    id, name, floor, kind, width, depth, height,
    spawn, colors: { ...palette }, doors, objects, description, ...attributes
  };
}

export const START_SCENE = 'entrance';

export const SCENES = {
  entrance: room('entrance', 'The Remembered Lobby', 'GROUND', 'lobby', { x: 9, z: 4, yaw: 0 }, [
    door('north-stair', 'north', 9, 'first-stairwell', 'STAIRS'),
    door('east-corridor', 'east', 18, 'repeating-corridor', 'ROOMS'),
    door('front-entry', 'south', 9, 'repeating-corridor', 'ENTRY')
  ], [
    item('reception-desk', 'desk', 13.1, 23.2, 3.4, 1.2, 1.3, 'Reception desk', 'The brass bell is polished clean around its silence. A card waits beside it.', { solid: true }),
    item('reception-bell', 'bell', 13.1, 23.5, 0.16, 0.16, 0.2, 'Brass bell', 'The bell has been polished clean around its silence.', { y: 1.38 }),
    item('registration-card', 'card', 13.1, 23.2, 0.55, 0.04, 0.08, 'Blank registration card', 'A fresh card lies beneath a brass paperweight.', { y: 1.34, number: '' }),
    item('lobby-directory', 'directory', 4.2, 24.7, 0.8, 0.55, 2.1, 'Directory', 'The ground-floor listing is rubbed blank. A pencilled arrow points down.', { solid: true, clue: 'The lobby is remembered differently each time.' }),
    item('lobby-clock', 'clock', 9, 27.76, 0.55, 0.15, 0.65, 'Stopped clock', 'Its hands meet at 2:14. The minute hand trembles, but does not move.', { y: 6.5, number: '2:14', clue: '2:14 appears to be a remembered time, not a working one.' }),
    item('silent-lift', 'elevator', 3.1, 4.2, 1.7, 0.35, 2.7, 'Silent elevator', 'The call button is unlit. A soft glow waits behind the closed doors.', { solid: true }),
    item('lobby-pier-1', 'column', 3.2, 8.1, 0.9, 0.9, 7.4, 'Stone pier', 'A dark seam runs up the worn stone to the coffered ceiling.', { solid: true }),
    item('lobby-pier-2', 'column', 14.8, 8.1, 0.9, 0.9, 7.4, 'Stone pier', 'The stone has been polished at shoulder height by passing coats.', { solid: true }),
    item('lobby-pier-3', 'column', 3.2, 18.1, 0.9, 0.9, 7.4, 'Stone pier', 'A narrow amber pool settles at its foot.', { solid: true }),
    item('lobby-pier-4', 'column', 14.8, 18.1, 0.9, 0.9, 7.4, 'Stone pier', 'The upper edge disappears into the high ceiling.', { solid: true }),
    item('lobby-seating', 'bench', 5.7, 21.4, 2.1, 0.65, 0.62, 'Lobby settee', 'One cushion is indented; the others are dustless.', { solid: true }),
    item('lobby-luggage', 'suitcase', 11, 12, 0.8, 0.55, 0.7, 'Unclaimed suitcase', 'A paper tag is turned inward. Its handle is still warm.', { solid: true, clue: 'Someone expected a guest before the building remembered you.' })
  ], 'A cavernous lobby opens around you. Repeated stone piers rise to a coffered ceiling; distant reception waits beneath a stopped clock.', {
    width: 18, depth: 28, height: 8,
    colors: { wall: '#b9ad88', lower: '#685b42', floor: '#51483a', ceiling: '#827c6c', accent: '#a18b5c' }
  }),

  'first-stairwell': room('first-stairwell', 'First Stairwell', '01', 'stairwell', { x: 9, z: 0.8, yaw: 0 }, [
    door('back-lobby', 'south', 6, 'entrance', 'LOBBY'),
    door('east-rooms', 'east', 6, 'repeating-corridor', 'ROOMS'),
    door('upper-stair', 'north', 6, 'impossible-staircase', 'UP')
  ], [
    item('stair-rail', 'rail', 2.2, 7, 0.15, 5.8, 1.0, 'Painted handrail', 'The green paint is worn smooth at the height of a familiar hand.', { solid: true }),
    item('stair-notice', 'note', 9.7, 8.6, 0.35, 0.1, 0.4, 'Inspection notice', 'The stair inspection is scheduled for yesterday.', { clue: 'The building keeps dates without keeping a calendar.' })
  ], 'A narrow stairwell rises out of sight. The landing is broad enough for two people who do not recognize one another.', {
    stairs: { x: 9, z: 2, width: 1.8, length: 6.5, rise: 1.2, to: 'impossible-staircase' }, height: 4.4
  }),

  'repeating-corridor': room('repeating-corridor', 'Repeating Corridor', '02', 'corridor', { x: 2.5, z: 3.5, yaw: 0 }, [
    door('west-lobby', 'west', 8, 'entrance', 'LOBBY'),
    door('west-stairwell', 'west', 15, 'first-stairwell', 'STAIRS'),
    door('room-214', 'north', 2.5, 'room-214', '214'),
    door('east-service', 'east', 27, 'service-corridor', 'SERVICE')
  ], [
    item('corridor-bench', 'bench', 1.15, 11.2, 1.3, 0.55, 0.58, 'Bench', 'A small dry crescent marks the seat, as if someone stood moments ago.', { solid: true }),
    item('corridor-mirror', 'mirror', 4.1, 24.8, 0.12, 1.1, 1.8, 'Narrow mirror', 'The corridor in the glass seems a little longer than the corridor behind you.', { clue: 'The same passage may be a reconstruction, not a route.' }),
    item('room-number', 'sign', 2.5, 34.1, 0.55, 0.1, 0.3, 'Enamel number', '214. The last digit has been replaced more than once.', { y: 1.8, number: '214' })
  ], 'An oxblood runner pulls a compressed corridor into the distance. Repeated doors interrupt its long, dim rhythm.', {
    width: 5, depth: 36, height: 3.1,
    colors: { wall: '#69413e', lower: '#35282a', floor: '#432b2b', ceiling: '#756c65', accent: '#8b655b' }
  }),

  'room-214': room('room-214', 'Room 214', '02', 'guestroom', { x: 6, z: 2.6, yaw: 0 }, [
    door('back-corridor', 'south', 6, 'repeating-corridor', 'CORRIDOR'),
    door('unlisted-connection', 'west', 6, 'unlisted-floor', '214½')
  ], [
    item('bed-214', 'bed', 8.4, 12, 3, 2.5, 0.8, 'Unmade bed', 'One side is carefully turned down. The other side has never been slept in.', { solid: true, clue: 'The room has been prepared for someone who remembers it.' }),
    item('chair-214', 'chair', 4.3, 11.7, 0.8, 0.8, 0.95, 'Chair', 'The chair faces the wall, although the room has a window.', { solid: true }),
    item('desk-214', 'desk', 3.3, 6.5, 1.8, 0.8, 1.05, 'Writing desk', 'The drawer is empty except for a clean rectangle where a key rested.', { solid: true }),
    item('telephone-214', 'telephone', 3.3, 8.3, 0.45, 0.4, 0.7, 'Quiet telephone', 'No ringing, no dial tone. The receiver is warm when lifted.', { solid: true, clue: 'The room waits for a call that may belong to the past.' }),
    item('room-note', 'note', 9, 20.1, 0.25, 0.06, 0.3, 'Folded note', 'If you find the lobby, do not assume it is the first one.', { clue: 'A note links the remembered lobby to the rooms beyond it.' }),
    item('room-clock', 'clock', 9.7, 24.76, 0.45, 0.12, 0.35, 'Bedside clock', '2:14, without a.m. or p.m.', { y: 2.1, number: '2:14' }),
    item('room-window', 'window', 6, 24.78, 4.2, 0.12, 2.1, 'Tall window', 'Beyond the glass, a lit room seems to face this one.', { y: 1.2 })
  ], 'Room 214 is prepared and improbably long. The far window holds a light at the height of another guest’s room.', {
    width: 12, depth: 25, height: 3.5,
    colors: { wall: '#b4a58c', lower: '#674b43', floor: '#59423b', ceiling: '#83796c', accent: '#a78c68' }
  }),

  'service-corridor': room('service-corridor', 'Service Corridor', 'B1', 'service', { x: 3, z: 2.7, yaw: 0 }, [
    door('public-corridor', 'west', 8, 'repeating-corridor', 'ROOMS'),
    door('lift-hall', 'north', 3, 'elevator-hall', 'LIFT'),
    door('water-landing', 'east', 16, 'flooded-landing', 'DRAINAGE')
  ], [
    item('service-pipes', 'pipe', 3, 16, 5, 0.55, 0.32, 'Warm pipes', 'A slow knock travels through them, pausing at a rhythm like footsteps.', { y: 2.18 }),
    item('service-telephone', 'telephone', 4.6, 5.2, 0.55, 0.45, 0.8, 'Service telephone', 'The receiver smells faintly of rain. No cord reaches the wall.', { solid: true, clue: 'A disconnected line still carries the building’s memory.' }),
    item('service-label', 'note', 3, 20.5, 0.45, 0.08, 0.25, 'Pipe label', 'RETURN TO BASEMENT. The arrow points toward the ceiling.')
  ], 'The low service passage is painted institutional green. Warm pipes press beneath its ceiling, leaving little room to forget them.', {
    width: 6, depth: 22, height: 2.65,
    colors: { wall: '#667266', lower: '#35473f', floor: '#39443c', ceiling: '#5a6257', accent: '#8b9a7e' }
  }),

  'elevator-hall': room('elevator-hall', 'Elevator Hall', 'B1', 'elevator', { x: 6, z: 3, yaw: 0 }, [
    door('back-service', 'south', 6, 'service-corridor', 'SERVICE'),
    door('unlit-floor', 'north', 6, 'windowless-floor', '—'),
    door('unlisted-lift', 'east', 6, 'unlisted-floor', 'LIFT · —', 'elevator')
  ], [
    item('elevator', 'elevator', 3, 7, 2.2, 0.35, 2.6, 'Elevator doors', 'The brass doors reflect a corridor with one extra doorway.', { solid: true, clue: 'The elevator offers a floor that the directory omits.' }),
    item('lift-panel', 'directory', 8.8, 7, 0.3, 0.12, 1.3, 'Floor panel', 'The button below B1 is worn smooth, but never lights.', { solid: true }),
    item('lift-bench', 'bench', 8.3, 3, 1.6, 0.55, 0.55, 'Waiting bench', 'Dust gathers on the ends, leaving the middle oddly clear.', { solid: true })
  ], 'The elevator doors are shut, though the call button glows softly. Its unmarked button opens onto the unlisted floor.'),

  'flooded-landing': room('flooded-landing', 'Flooded Landing', 'B1½', 'flooded', { x: 2.7, z: 8, yaw: Math.PI / 2 }, [
    door('back-service', 'west', 8, 'service-corridor', 'SERVICE'),
    door('stair-above-water', 'north', 7, 'impossible-staircase', 'UP')
  ], [
    item('waterline', 'mark', 7, 8, 13, 0.08, 0.02, 'Waterline', 'A clean band around the plaster sits just above ankle height.', { clue: 'Someone has measured the water against a familiar body.' }),
    item('flooded-chair', 'chair', 10.5, 4, 0.9, 0.9, 0.85, 'Floating chair', 'The chair is dry. A slow ripple passes beneath it.', { solid: true }),
    item('drain', 'pipe', 3.2, 12, 0.7, 0.7, 0.15, 'Floor drain', 'The water circles the drain without entering it.')
  ], 'Cold water spreads across a broad landing, holding a still reflection of the ceiling until a ripple crosses it.', {
    width: 14, depth: 16, height: 3.4,
    colors: { wall: '#82918b', lower: '#556966', floor: '#71847e', ceiling: '#8c9a96', accent: '#b8cbc0' }
  }),

  'windowless-floor': room('windowless-floor', 'Windowless Floor', '03', 'windowless', { x: 4, z: 3, yaw: 0 }, [
    door('back-elevator', 'south', 4, 'elevator-hall', 'LIFT'),
    door('unlisted-door', 'east', 10, 'unlisted-floor', '—')
  ], [
    item('windowless-desk', 'desk', 2.3, 12, 2, 0.9, 1.1, 'Writing desk', 'A rectangle of dust is missing where a photograph once stood.', { solid: true, clue: 'The missing photograph left a place-shaped absence.' }),
    item('windowless-mirror', 'mirror', 6.2, 15.4, 0.75, 0.12, 1.8, 'Black mirror', 'No reflection appears, but the glass is warm.', { solid: true }),
    item('floor-sign', 'sign', 4, 18.7, 0.55, 0.12, 0.25, 'Floor sign', '03. The enamel below it says GROUND.')
  ], 'There are no windows, and no convincing substitute for them. A faint daylight color remains on the walls.', { width: 8, depth: 20 }),

  'impossible-staircase': room('impossible-staircase', 'Impossible Staircase', '04', 'stairwell', { x: 9, z: 0.8, yaw: 0 }, [
    door('back-first', 'south', 6, 'first-stairwell', 'DOWN'),
    door('water-stair', 'south', 9, 'flooded-landing', 'WATER'),
    door('stair-unlisted', 'east', 6, 'unlisted-floor', 'UP')
  ], [
    item('stair-clock', 'clock', 3, 11.76, 0.45, 0.12, 0.5, 'Stairwell clock', 'The hands point to 2:14. The clock is mounted upside down.', { y: 3.3, number: '2:14', clue: '2:14 recurs where the building changes direction.' }),
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
    if (entry) { entry.to = 'unlisted-floor'; entry.label = '214'; }
    const directory = scene.objects.find(o => o.id === 'lobby-directory');
    if (directory) directory.text = 'The directory now lists a floor that was not there before.';
    const luggage = scene.objects.find(o => o.id === 'lobby-luggage');
    if (luggage) { luggage.x = 5.2; luggage.z = 15.8; }
    const desk = scene.objects.find(o => o.id === 'reception-desk');
    if (desk) desk.text = 'A card now waits beneath the bell. Guest 214. Arrival: 2:14. The room is ready.';
    const card = scene.objects.find(o => o.id === 'registration-card');
    if (card) {
      card.title = 'Registration card · 214';
      card.text = 'Guest 214. Arrival: 2:14. The room is ready.';
      card.number = '214';
    }
    scene.floor = visits % 2 === 0 ? 'GROUND?' : 'GROUND';
  }
  if (id === 'room-214' && visits > 1) {
    const chair = scene.objects.find(o => o.id === 'chair-214');
    if (chair) { chair.x = visits % 2 === 0 ? 5.8 : 4.4; chair.z = visits % 2 === 0 ? 6.4 : 7.8; }
    const clock = scene.objects.find(o => o.id === 'room-clock');
    if (clock) clock.title = visits % 2 === 0 ? 'Clock with reversed hands' : 'Bedside clock';
    const numberedDoor = scene.doors.find(d => d.id === 'unlisted-connection');
    if (numberedDoor) numberedDoor.label = visits % 2 === 0 ? '213' : '214½';
    const sign = scene.objects.find(o => o.id === 'room-number');
    if (sign) {
      sign.number = visits % 2 === 0 ? '213' : '214';
      sign.title = `Enamel number · ${sign.number}`;
    }
  }
  if (visits > 1) {
    const sign = scene.objects.find(o => o.id === 'room-number' || o.id === 'floor-sign');
    if (sign) sign.text = visits % 2 === 0 ? `${sign.text.split('.')[0]}. The enamel is still warm.` : `${sign.text.split('.')[0]}. The last digit has been replaced more than once.`;
  }
  return scene;
}
