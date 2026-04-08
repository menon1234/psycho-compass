// ══════════════════════════════════════════════════════
//  DATA: Questions, Colors, Shapes, Clusters
// ══════════════════════════════════════════════════════

const CATEGORIES = [
  { id: 'color', label: 'COLOR INSTINCT', type: 'color' },
  { id: 'shape', label: 'SHAPE PREFERENCE', type: 'shape' },
  { id: 'frame', label: 'FRAME SELECTION', type: 'frame' },
  { id: 'word', label: 'WORD RESONANCE', type: 'choice' },
  { id: 'scene', label: 'SCENE PERCEPTION', type: 'choice' },
  { id: 'sound', label: 'SOUND TEXTURE', type: 'choice' },
  { id: 'number', label: 'NUMBER FEELING', type: 'choice' },
  { id: 'time', label: 'TIME SENSE', type: 'choice' },
  { id: 'space', label: 'SPATIAL BIAS', type: 'choice' },
  { id: 'motion', label: 'MOTION QUALITY', type: 'choice' },
];

const COLORS = [
  { label: 'Obsidian Black', hex: '#1a1a1a', dim: 0 },
  { label: 'Cobalt Storm', hex: '#1a5fcc', dim: 1 },
  { label: 'Raw Umber', hex: '#8b5e3c', dim: 0 },
  { label: 'Acid Green', hex: '#a8e63d', dim: 2 },
  { label: 'Deep Crimson', hex: '#8b1a1a', dim: 0 },
  { label: 'Ghost White', hex: '#e8e8e8', dim: 3 },
  { label: 'Bruised Violet', hex: '#5c1a8b', dim: 1 },
  { label: 'Desert Sand', hex: '#c4a882', dim: 3 },
  { label: 'Rust Orange', hex: '#cc5500', dim: 2 },
  { label: 'Teal Abyss', hex: '#0d5c5c', dim: 1 },
  { label: 'Blush Rose', hex: '#e8a0b4', dim: 3 },
  { label: 'Electric Yellow', hex: '#ffd700', dim: 2 },
];

const SHAPES = [
  { label: 'Circle', icon: '◉', desc: 'continuous, whole', dim: 3 },
  { label: 'Triangle', icon: '△', desc: 'directed, sharp', dim: 2 },
  { label: 'Square', icon: '□', desc: 'stable, contained', dim: 0 },
  { label: 'Spiral', icon: '◌', desc: 'recursive, evolving', dim: 1 },
  { label: 'Cross', icon: '✛', desc: 'intersecting, divided', dim: 0 },
  { label: 'Wave', icon: '〜', desc: 'fluid, rhythmic', dim: 1 },
  { label: 'Hexagon', icon: '⬡', desc: 'efficient, structural', dim: 0 },
  { label: 'Arrow', icon: '→', desc: 'purposeful, forward', dim: 2 },
];

const FRAME_TYPES = [
  { label: 'Minimal Line', style: 'border: 1px solid #aaa', desc: 'clean edge' },
  { label: 'Heavy Border', style: 'border: 4px solid #fff', desc: 'contained' },
  { label: 'Broken Edge', style: 'border: 2px dashed #888', desc: 'open, loose' },
  { label: 'No Frame', style: 'border: none', desc: 'unbounded' },
  { label: 'Double Line', style: 'outline: 2px solid #aaa; border: 2px solid #555', desc: 'layered' },
  { label: 'Soft Glow', style: 'box-shadow: 0 0 12px rgba(200,245,62,0.4)', desc: 'radiant' },
];

const WORD_SETS = [
  { q: 'Which word feels heavier?', opts: [['STONE','tactile, grounded'],['ECHO','resonant, delayed'],['SHARD','broken, sharp'],['VEIL','hidden, soft']] },
  { q: 'What do you want more of right now?', opts: [['SILENCE','absence of noise'],['TEXTURE','something to feel'],['MOMENTUM','forward motion'],['DISTANCE','space from things']] },
  { q: 'Pick the word that makes you inhale.', opts: [['DEPTH','vertical pull'],['SURFACE','what is visible'],['HORIZON','where things meet'],['ROOT','what holds']] },
  { q: 'Which word feels most like you?', opts: [['STRUCTURE','organized, planned'],['IMPULSE','reactive, immediate'],['PATTERN','recurring, reliable'],['DRIFT','unanchored, free']] },
  { q: 'Which word creates unease?', opts: [['INFINITE','no boundaries'],['FINITE','everything ends'],['REPEAT','loop, no escape'],['ALONE','disconnected']] },
  { q: 'Choose a word for Saturday morning.', opts: [['QUIET','stillness, empty calendar'],['RITUAL','structured start'],['WANDER','no plan, move'],['MAKE','create something']] },
  { q: 'Which word feels most physical?', opts: [['PRESSURE','weight, force'],['WARMTH','heat, comfort'],['COLD','crisp, detached'],['EDGE','boundary, sharpness']] },
  { q: 'Which word would you carve into stone?', opts: [['REMEMBER','past matters'],['BUILD','action, future'],['TRUTH','absolute, unchanging'],['NOW','only the present']] },
  { q: 'Pick the word that feels like home.', opts: [['RETURN','familiar, coming back'],['ARRIVE','new, fresh start'],['STAY','stable, settled'],['MOVE','always in motion']] },
  { q: 'Which word scares you least?', opts: [['CHAOS','unpredictable, wild'],['ORDER','rigid, controlled'],['VOID','empty, formless'],['CROWD','too many, loud']] },
];

const SCENE_SETS = [
  { q: 'You are standing somewhere. Where?', opts: [['Desert at noon','vast, harsh, bright'],['Forest at dusk','layered, dimming, alive'],['Ocean edge','boundary, constant motion'],['City rooftop','above, contained chaos']] },
  { q: 'Which view would you sit with for an hour?', opts: [['Mountains in fog','hidden, patient'],['Flat open plains','exposed, infinite'],['Dense jungle floor','close, textured'],['Empty room with window','simple, waiting']] },
  { q: 'What kind of light are you drawn to?', opts: [['Hard direct sun','clarity, no hiding'],['Diffused grey sky','even, muted, calm'],['Golden dusk','short, precious, warm'],['Single lamp in dark','focused, intimate']] },
  { q: 'Which place do you trust most?', opts: [['Underground','protected, hidden'],['Elevated, high up','perspective, removed'],['At water level','grounded, flowing'],['In motion, no fixed point','free, transient']] },
];

const SOUND_SETS = [
  { q: 'Which sound texture do you prefer?', opts: [['White noise','constant, undifferentiated'],['Single tone, long','pure, sustained'],['Polyrhythm','complex, layered beats'],['Total silence','absence as sound']] },
  { q: 'Which sound feels most honest?', opts: [['Cracking wood','structural, irreversible'],['Distant thunder','approaching, inevitable'],['Running water','continuous, neutral'],['Breath','intimate, close']] },
  { q: 'What music would your instincts write?', opts: [['Minimalist drone','unchanging, meditative'],['Complex orchestral','building, multi-layered'],['Stripped acoustic','raw, personal'],['Electronic pulse','mechanical, driving']] },
  { q: 'You need to focus. What plays?', opts: [['Nothing','silence is structure'],['Ambient hum','texture without distraction'],['Familiar music','memory as anchor'],['Nature sounds','biological, grounding']] },
];

const MOTION_SETS = [
  { q: 'How do you prefer to move through a city?', opts: [['Directly, fastest path','efficiency, goal'],['Wandering, no route','discovery, open'],['Familiar streets only','safe, known'],['Elevated, elevated view','removed observer']] },
  { q: 'Which motion best describes your thinking?', opts: [['Drilling down','deep, singular focus'],['Expanding outward','broad, associative'],['Oscillating back/forth','comparative, uncertain'],['Spiraling inward','recursive, self-referential']] },
  { q: 'Pick the motion that relaxes you.', opts: [['Rocking, regular rhythm','soothing, predictable'],['Falling, letting go','surrender, free fall'],['Still, no movement','quiet, stable'],['Pacing, controlled loop','processing, releasing']] },
];

const BOT_NAMES = [
  'Arav','Bilha','Cassia','Dion','Elara','Finn','Gaia','Hiro','Isla','Juno',
  'Kael','Lyra','Miro','Nola','Oryn','Peta','Quill','Reva','Seren','Tao',
  'Uma','Vael','Wren','Xio','Yola','Zel','Asha','Brix','Cleo','Dara',
  'Elio','Fae','Gus','Hera','Indy','Jett','Kira','Lev','Mira','Neo',
  'Ona','Pip','Rex','Sky','Tev','Ula','Van','Wix','Xen','Yara',
  'Zeph','Ace','Bay','Cal','Dawn','Echo','Flux','Gray','Hope','Ilex',
  'Jade','Knox','Luna','Mars','Nyx','Oak','Pax','Quay','Rune','Sol',
  'Tess','Uri','Vera','Ward','Xara','York','Zola','Aden','Beau','Cira',
  'Dex','Elan','Faye','Glen','Haze','Iris','Jax','Kova','Lore','Mael',
  'Nevi','Orin','Paen','Qara','Riel','Sael','Tova','Ulan','Vex','Wael',
  'Xael','Yule','Zira','Abra','Bora','Cael','Dael','Eara','Faen','Gael',
  'Hael','Iael','Jael','Koa','Lael','Mael','Nael','Oael','Pael','Qael',
  'Rael','Soa','Tael','Uael','Vael','Woa','Xael2','Yael','Zoa','Abis',
  'Bisa','Cisa','Disa','Eisa','Fisa','Gisa','Hisa','Iisa','Jisa','Kisa',
  'Lisa','Misa','Nisa','Oisa','Pisa','Qisa','Risa','Sisa','Tisa','Uisa',
  'Visa','Wisa','Xisa','Yisa','Zisa','Abo','Bova','Cova','Dova','Eova',
  'Fova','Gova','Hova','Iova','Jova','Kova2','Lova','Mova','Nova','Oova',
  'Pova','Qova','Rova','Sova','Tova2','Uova','Vova','Wova','Xova','Yova',
  'Zova','Axe','Byte','Core','Dive','Else','Fold','Gate','Hash','Iter',
  'Jump','Link','Mesh','Node','Open','Port','Quit','Read','Sort','Tree'
];

const CLUSTER_PROFILES = [
  {
    id: 0, name: 'INTUITIVE DEPTH',
    color: '#1a8cff',
    desc: 'Drawn to complexity, abstraction, and inner landscapes. Prefers immersive, layered experiences.',
    keywords: ['depth', 'complexity', 'introspection', 'pattern'],
    bias: [0.1, 0.5, 0.2, 0.2],
  },
  {
    id: 1, name: 'KINETIC EDGE',
    color: '#ff3d6e',
    desc: 'Energetic, action-oriented, reactive. Drawn to movement, contrast, and immediacy.',
    keywords: ['motion', 'edge', 'contrast', 'impulse'],
    bias: [0.15, 0.15, 0.55, 0.15],
  },
  {
    id: 2, name: 'GROUNDED STRUCTURE',
    color: '#c8f53e',
    desc: 'Values stability, clarity, and defined boundaries. Prefers known patterns and reliable frameworks.',
    keywords: ['structure', 'stability', 'clarity', 'root'],
    bias: [0.5, 0.2, 0.15, 0.15],
  },
  {
    id: 3, name: 'AMBIENT FLOW',
    color: '#ff6b35',
    desc: 'Soft, receptive, open to ambiguity. Drawn to warmth, comfort, and subtle textures.',
    keywords: ['warmth', 'flow', 'softness', 'drift'],
    bias: [0.15, 0.15, 0.15, 0.55],
  },
];
