// ============================================================
// audio.js — Sound effects, background music, rolling sounds
// ============================================================

function ensureAudio() {
  if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
}

function tone(freq, dur, type, vol, ramp) {
  ensureAudio();
  var t = audioCtx.currentTime;
  var o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (ramp) o.frequency.exponentialRampToValueAtTime(ramp, t + dur);
  g.gain.setValueAtTime(vol || 0.1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur);
}

var sfx = {
  pop: function () { tone(800, 0.12, 'sine', 0.13, 300); },
  drop: function () { tone(400, 0.08, 'sine', 0.04, 200); },
  sort: function () { tone(600, 0.1, 'triangle', 0.1); setTimeout(function () { tone(900, 0.1, 'triangle', 0.1); }, 80); },
  complete: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tone(f, 0.2, 'sine', 0.1); }, i * 90); }); },
  win: function () { [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { setTimeout(function () { tone(f, 0.25, 'sine', 0.12); }, i * 100); }); }
};

// === BACKGROUND MUSIC ===
var bgMusic = document.getElementById('bg-music');
var musicBtn = document.getElementById('music-toggle');
var musicPlaying = false;
var musicStarted = false;
bgMusic.volume = 0.35;

function toggleMusic() {
  if (!musicStarted) {
    bgMusic.play().then(function () {
      musicPlaying = true; musicStarted = true;
      musicBtn.textContent = '\u266B';
      musicBtn.classList.remove('muted');
    }).catch(function () {});
    return;
  }
  if (musicPlaying) {
    bgMusic.pause();
    musicPlaying = false;
    musicBtn.textContent = '\u266B';
    musicBtn.classList.add('muted');
  } else {
    bgMusic.play();
    musicPlaying = true;
    musicBtn.textContent = '\u266B';
    musicBtn.classList.remove('muted');
  }
}
musicBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMusic(); });

function tryAutoStartMusic() {
  if (!musicStarted) {
    bgMusic.play().then(function () {
      musicPlaying = true; musicStarted = true;
      musicBtn.classList.remove('muted');
    }).catch(function () {});
  }
}

// === ROLLING MARBLE SOUNDS ===
var rollActive = false;

function spawnMarbleClick(intensity, speedFactor) {
  if (!audioCtx) return;
  var t = audioCtx.currentTime;

  var o = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  var baseFreq = 800 + Math.random() * 1200;
  o.type = 'sine';
  o.frequency.setValueAtTime(baseFreq, t);
  o.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t + 0.12);

  var vol = 0.015 + intensity * 0.025 * (0.4 + Math.random() * 0.6);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.003);
  g.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15 + Math.random() * 0.1);

  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + 0.3);

  // Crystalline harmonic overtone
  if (Math.random() < 0.5) {
    var o2 = audioCtx.createOscillator();
    var g2 = audioCtx.createGain();
    var harmFreq = baseFreq * 2.2 + Math.random() * 800;
    o2.type = 'sine';
    o2.frequency.setValueAtTime(harmFreq, t + 0.002);
    o2.frequency.exponentialRampToValueAtTime(harmFreq * 0.7, t + 0.18);
    var vol2 = vol * 0.25;
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(vol2, t + 0.005);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.2 + Math.random() * 0.12);
    o2.connect(g2); g2.connect(audioCtx.destination);
    o2.start(t); o2.stop(t + 0.4);
  }

  // Subtle low thud
  if (Math.random() < 0.3) {
    var o3 = audioCtx.createOscillator();
    var g3 = audioCtx.createGain();
    o3.type = 'sine';
    o3.frequency.setValueAtTime(120 + Math.random() * 80, t);
    o3.frequency.exponentialRampToValueAtTime(50, t + 0.08);
    var vol3 = vol * 0.5;
    g3.gain.setValueAtTime(vol3, t);
    g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o3.connect(g3); g3.connect(audioCtx.destination);
    o3.start(t); o3.stop(t + 0.1);
  }

  // Rare sparkle
  if (Math.random() < 0.15) {
    var delay = 0.03 + Math.random() * 0.06;
    var o4 = audioCtx.createOscillator();
    var g4 = audioCtx.createGain();
    o4.type = 'sine';
    var sparkleFreq = 3500 + Math.random() * 3000;
    o4.frequency.setValueAtTime(sparkleFreq, t + delay);
    o4.frequency.exponentialRampToValueAtTime(sparkleFreq * 0.5, t + delay + 0.2);
    var vol4 = vol * 0.12;
    g4.gain.setValueAtTime(0, t + delay);
    g4.gain.linearRampToValueAtTime(vol4, t + delay + 0.005);
    g4.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.25);
    o4.connect(g4); g4.connect(audioCtx.destination);
    o4.start(t + delay); o4.stop(t + delay + 0.35);
  }
}

function updateRollingSound() {
  if (!audioCtx) return;
  var count = physMarbles.length;
  if (count === 0) { rollActive = false; return; }

  var avgSpeed = 0;
  for (var i = 0; i < count; i++) {
    var m = physMarbles[i];
    avgSpeed += Math.sqrt(m.vx * m.vx + m.vy * m.vy);
  }
  avgSpeed /= count;

  var speedFactor = Math.min(avgSpeed / (5 * S), 1.0);
  var countFactor = Math.min(count / 8, 1.0);
  if (speedFactor < 0.05) return;

  var clickInterval = Math.max(2, Math.round(10 - 8 * countFactor * speedFactor));
  if (tick % clickInterval === 0) {
    spawnMarbleClick(countFactor * speedFactor, speedFactor);
  }
  if (count > 3 && speedFactor > 0.2 && Math.random() < countFactor * speedFactor * 0.15) {
    spawnMarbleClick(countFactor * speedFactor * 0.5, speedFactor);
  }
}
