// ============================================================
// config.js — Global state, constants, levels, colors, images
// ============================================================

var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
var W = 0, H = 0, S = 1;
var L = {};
var beltPath = [];
var stock = [], sortCols = [], particles = [], physMarbles = [], jumpers = [];
var obstacles = [];
var score = 0, won = false, tick = 0, hoverIdx = -1;
var audioCtx = null;

// === LEVEL SYSTEM ===
var currentLevel = 0;
var LEVELS = [
  { name: 'Getting Started',  colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'Learn the basics', obstacles: [], bg: 1 },
  { name: 'Double Trouble',   colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'Avoid the cup!', obstacles: [{ type: 'cup', speed: 0.6, yPct: 0.45 }], lockButtons: 1, bg: 2 },
  { name: 'Color Cascade',    colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'Mind the gate!', obstacles: [{ type: 'gate', triggerCount: 3, yPct: 0.2 }], bg: 3 },
  { name: 'Trap Drop',        colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'Watch the timing!', obstacles: [{ type: 'trapdoor', yPct: 0.4, interval: 1000 }], bg: 4 },
  { name: 'Marble Madness',   colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'Stay focused', obstacles: [], bg: 1 },
  { name: 'Sorted Chaos',     colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'Organized mess', obstacles: [], bg: 2 },
  { name: 'Belt Runner',      colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'Keep it moving', obstacles: [], bg: 3 },
  { name: 'Gravity Drop',     colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'Let them fall', obstacles: [], bg: 4 },
  { name: 'Precision',        colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'Every marble counts', obstacles: [], bg: 1 },
  { name: 'Grand Finale',     colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'The ultimate test', obstacles: [], bg: 2 },
  { name: 'Encore',           colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'One more round', obstacles: [], bg: 3 },
  { name: 'Masterclass',      colors: ['pink','blue','green','yellow'], stockPerClr: 6, mrbPerBox: 9, sortCap: 3, desc: 'Prove yourself', obstacles: [], bg: 4 }
];
var levelStars = [];
for (var li = 0; li < LEVELS.length; li++) levelStars.push(0);
var unlockedLevels = 4;
var gameActive = false;

var LEVEL_COLORS = [
  { bg: 'linear-gradient(135deg,#FF9A9E,#E8706E)', shadow: 'rgba(232,112,110,0.5)' },
  { bg: 'linear-gradient(135deg,#89CFF0,#5BA3D9)', shadow: 'rgba(91,163,217,0.5)' },
  { bg: 'linear-gradient(135deg,#77DD77,#4EBF5E)', shadow: 'rgba(78,191,94,0.5)' },
  { bg: 'linear-gradient(135deg,#FFD966,#E8B84C)', shadow: 'rgba(232,184,76,0.5)' },
  { bg: 'linear-gradient(135deg,#C89CF2,#A66DD4)', shadow: 'rgba(166,109,212,0.5)' },
  { bg: 'linear-gradient(135deg,#FFB07C,#E88A5A)', shadow: 'rgba(232,138,90,0.5)' },
  { bg: 'linear-gradient(135deg,#87CEEB,#5EAED4)', shadow: 'rgba(94,174,212,0.5)' },
  { bg: 'linear-gradient(135deg,#F4A4C0,#D87EA0)', shadow: 'rgba(216,126,160,0.5)' },
  { bg: 'linear-gradient(135deg,#98D8A0,#6EBF7A)', shadow: 'rgba(110,191,122,0.5)' },
  { bg: 'linear-gradient(135deg,#F7C873,#D4A84C)', shadow: 'rgba(212,168,76,0.5)' },
  { bg: 'linear-gradient(135deg,#B8A9E2,#9080C4)', shadow: 'rgba(144,128,196,0.5)' },
  { bg: 'linear-gradient(135deg,#E8A4A4,#C87878)', shadow: 'rgba(200,120,120,0.5)' }
];

// === PHYSICS CONSTANTS ===
var PHYS_GRAVITY = 0.67, PHYS_DAMPING = 0.997, PHYS_BOUNCE = 0.45, PHYS_FRICTION = 0.995;
var MARBLE_R_BASE = 7;
var funnelWalls = [];
var BELT_SLOTS = 30, beltSlots = [], beltOffset = 0, BELT_SPEED = 0.0031;
var LIP_PCT = 0.28;
var MRB_GAP_FACTOR = 0.75;

// === GAME CONSTANTS ===
var CLR_NAMES = ['pink', 'blue', 'green', 'yellow'];
var COLORS = [
  { fill: '#FF4E8C', light: '#FF85B5', dark: '#C73068', glow: 'rgba(255,78,140,0.5)' },
  { fill: '#4A9FFF', light: '#80C0FF', dark: '#2B6FCC', glow: 'rgba(74,159,255,0.5)' },
  { fill: '#4EE68C', light: '#82F0B2', dark: '#2DB866', glow: 'rgba(78,230,140,0.5)' },
  { fill: '#FFB545', light: '#FFD080', dark: '#CC8A1F', glow: 'rgba(255,181,69,0.5)' }
];
var MRB_PER_BOX = 9, SORT_CAP = 3, STOCK_PER_CLR = 6;
var SORT_PER_CLR = (MRB_PER_BOX * STOCK_PER_CLR) / SORT_CAP;
var SORT_VISIBLE_ROWS = 4;

// Snake order for 3x3 grid
var SNAKE_ORDER = [
  { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 },
  { r: 1, c: 2 }, { r: 1, c: 1 }, { r: 1, c: 0 },
  { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }
];

// === CALIBRATION ===
var cal = {
  stock:  { dx: -1, dy: 199, s: 0.89 },
  funnel: { dx: 0, dy: 40, sw: 1.03, sh: 0.65 },
  belt:   { dx: 0, dy: 24, sw: 0.80, sh: 1.33 },
  sort:   { dx: 0, dy: -7, s: 0.96 },
  marble: { s: 1.37 },
  back:   { dx: -23, dy: 85, s: 1.0 }
};

// === IMAGES ===
var imgs = {};
var imgSrcs = {
  box_blue: "box_blue.png",
  box_pink: "box_pink.png",
  box_yellow: "box_yellow.png",
  box_green: "box_green.png",
  box_empty: "box_empty.png",
  box_locked: "box_locked.png",
  marble_pink: "marble_pink.png",
  marble_blue: "marble_blue.png",
  marble_green: "marble_green.png",
  marble_orange: "marble_orange.png",
  sort_pink: "sort_pink.png",
  sort_blue: "sort_blue.png",
  sort_green: "sort_green.png",
  sort_yellow: "sort_yellow.png",
  belt_slot_empty: "belt_slot_empty.png",
  level_select_button: "level_select_button.png",
  concept_bg_1: 'concept_bg_1.png',
  concept_bg_2: 'concept_bg_2.png',
  concept_bg_3: 'concept_bg_3.png',
  concept_bg_4: 'concept_bg_4.png'
};
var imgsLoaded = 0, imgTotal = 0;

function loadImages(cb) {
  var keys = Object.keys(imgSrcs);
  imgTotal = keys.length;
  keys.forEach(function (k) {
    var img = new Image();
    img.onload = function () { imgsLoaded++; if (imgsLoaded >= imgTotal) cb(); };
    img.onerror = function () { console.warn('Failed to load:', k); imgsLoaded++; if (imgsLoaded >= imgTotal) cb(); };
    img.src = imgSrcs[k];
    imgs[k] = img;
  });
}

function boxImg(ci) { return imgs['box_' + CLR_NAMES[ci]]; }
function marbleImg(ci) { return imgs['marble_' + ['pink', 'blue', 'green', 'orange'][ci]]; }
function sortImg(ci) { return imgs['sort_' + CLR_NAMES[ci]]; }
function getMR() { return MARBLE_R_BASE * S * cal.marble.s; }
function shuffle(arr) { for (var i = arr.length - 1; i > 0; i--) { var j = ~~(Math.random() * (i + 1)); var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; } }
