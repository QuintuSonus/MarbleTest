// ============================================================
// game.js — Game init, update loop, input, level select
// ============================================================

// === LEVEL SELECT UI ===
function buildLevelGrid() {
  var grid = document.getElementById('ls-grid');
  grid.innerHTML = '';
  for (var i = 0; i < LEVELS.length; i++) {
    var btn = document.createElement('button');
    btn.className = 'level-btn' + (i >= unlockedLevels ? ' locked' : '');
    btn.style.animationDelay = (i * 0.06) + 's';
    var clr = LEVEL_COLORS[i % LEVEL_COLORS.length];
    btn.style.background = clr.bg;
    btn.style.boxShadow = '0 5px 18px ' + clr.shadow;
    if (i < unlockedLevels) {
      var stars = '';
      var s = levelStars[i];
      for (var j = 0; j < 3; j++) stars += (j < s ? '★' : '☆');
      btn.innerHTML = '<span class="lb-num">' + (i + 1) + '</span><span class="lb-stars">' + stars + '</span>';
      (function (idx) { btn.addEventListener('click', function () { startLevel(idx); }); })(i);
    } else {
      btn.innerHTML = '<span class="lb-lock">🔒</span><span class="lb-num" style="font-size:16px;opacity:0.6">' + (i + 1) + '</span>';
    }
    grid.appendChild(btn);
  }
}

function showLevelSelect() {
  gameActive = false;
  document.getElementById('win-screen').classList.remove('show');
  document.getElementById('level-screen').classList.remove('hidden');
  document.getElementById('cal-toggle').style.display = 'none';
  document.getElementById('music-toggle').style.display = 'none';
  buildLevelGrid();
}

function startLevel(idx) {
  currentLevel = idx;
  gameActive = true;
  document.getElementById('level-screen').classList.add('hidden');
  document.getElementById('cal-toggle').style.display = '';
  document.getElementById('music-toggle').style.display = '';
  tryAutoStartMusic();
  initGame();
}

function goNextLevel() {
  if (currentLevel + 1 < LEVELS.length) {
    startLevel(currentLevel + 1);
  } else {
    showLevelSelect();
  }
}

// === GAME INIT ===
function initGame() {
  won = false; score = 0; particles = []; physMarbles = []; jumpers = []; tick = 0; hoverIdx = -1;
  document.getElementById('win-screen').classList.remove('show');
  computeLayout(); initBeltSlots();

  var cl = [];
  for (var c = 0; c < 4; c++) for (var n = 0; n < STOCK_PER_CLR; n++) cl.push(c);
  shuffle(cl);
  stock = [];
  for (var r = 0; r < L.rows; r++) for (var c = 0; c < L.cols; c++) {
    var isBottomRow = (r === L.rows - 1);
    stock.push({
      ci: cl[r * L.cols + c], used: false, remaining: MRB_PER_BOX, spawning: false, spawnIdx: 0,
      revealed: isBottomRow,
      x: L.sx + c * (L.bw + L.bg), y: L.sy + r * (L.bh + L.bg),
      shakeT: 0, hoverT: 0, popT: 0, revealT: 0, emptyT: 0, idlePhase: Math.random() * Math.PI * 2
    });
  }

  var allBoxes = [];
  for (var c = 0; c < 4; c++) for (var r = 0; r < SORT_PER_CLR; r++)
    allBoxes.push({ ci: c, filled: 0, popT: 0, vis: true, shineT: 0, squishT: 0 });
  shuffle(allBoxes);
  sortCols = [];
  for (var c = 0; c < 4; c++) {
    var col2 = [];
    for (var r = 0; r < SORT_PER_CLR; r++) col2.push(allBoxes[c * SORT_PER_CLR + r]);
    sortCols.push(col2);
  }

  // Lock buttons
  var lvl = LEVELS[currentLevel];
  var numLocks = lvl.lockButtons || 0;
  for (var li2 = 0; li2 < numLocks; li2++) {
    var lockCol = Math.floor(Math.random() * 4);
    var lockRow = 2 + Math.floor(Math.random() * 4);
    lockRow = Math.min(lockRow, sortCols[lockCol].length);
    sortCols[lockCol].splice(lockRow, 0, { type: 'lock', ci: -1, filled: 0, popT: 0, vis: true, shineT: 0, squishT: 0, triggerT: 0, triggered: false });
  }

  // Init obstacles
  obstacles = [];
  if (lvl.obstacles) {
    for (var oi = 0; oi < lvl.obstacles.length; oi++) {
      var def = lvl.obstacles[oi];
      if (def.type === 'cup') {
        var cupW = 72 * S; var cupH = 50 * S; var cupWall = 4 * S;
        var trackY = L.funnelTop + (L.funnelBendY - L.funnelTop) * def.yPct;
        var fLeft = L.funnelLeft + cupW * 0.1;
        var fRight = L.funnelRight - cupW * 0.1;
        var trackCx = (fLeft + fRight) / 2;
        var trackHalfW = (fRight - fLeft - cupW) / 2;
        obstacles.push({
          type: 'cup', x: trackCx, y: trackY,
          w: cupW, h: cupH, wallThick: cupWall,
          trackCx: trackCx, trackHalfW: trackHalfW,
          speed: def.speed || 0.5,
          phase: 0, dir: 1,
          trapped: [], released: false, releaseT: 0
        });
      }
      if (def.type === 'gate') {
        var gyPct = def.yPct || 0.2;
        var gateY = L.funnelBendY + (L.funnelBot - L.funnelBendY) * gyPct;
        var barLen = (L.funnelBot - gateY) * 1.12;
        var angleLeft = -0.85;
        var angleRight = 0.85;
        obstacles.push({
          type: 'gate', pivotX: L.funnelCx, pivotY: gateY,
          barLen: barLen, angle: angleLeft, targetAngle: angleLeft,
          angleLeft: angleLeft, angleRight: angleRight, side: -1,
          triggerCount: def.triggerCount || 3, counter: 0, switchT: 0, yPct: gyPct
        });
      }
      if (def.type === 'trapdoor') {
        var tdYPct = def.yPct || 0.4;
        var tdY = L.funnelTop + (L.funnelBendY - L.funnelTop) * tdYPct;
        var fW = L.funnelRight - L.funnelLeft;
        var cupW2 = fW * 0.34;
        var cupH2 = 55 * S;
        var leftX = L.funnelLeft + cupW2 / 2 + 6 * S;
        var rightX = L.funnelRight - cupW2 / 2 - 6 * S;
        obstacles.push({
          type: 'trapdoor', yPct: tdYPct,
          interval: def.interval || 240, timer: 0, prevLeftOpen: false, switchT: 0,
          cups: [
            { side: 'left', x: leftX, y: tdY, w: cupW2, h: cupH2, wallThick: 4 * S, open: false, openT: 0, trapped: [] },
            { side: 'right', x: rightX, y: tdY, w: cupW2, h: cupH2, wallThick: 4 * S, open: true, openT: 1, trapped: [] }
          ]
        });
      }
    }
  }
}

function isBoxTappable(idx) {
  var col = idx % L.cols; var bottomIdx = -1;
  for (var r = L.rows - 1; r >= 0; r--) {
    var bi = r * L.cols + col;
    if (!stock[bi].used) { bottomIdx = bi; break; }
  }
  if (idx !== bottomIdx) return false;
  if (stock[idx].spawning) return false;
  if (stock[idx].revealT > 0) return false;
  return true;
}

function getSortBoxY(ci, vi) { return L.sTop + vi * (L.sBh + L.sGap); }

// === INPUT ===
function handleTap(px, py) {
  if (won || !gameActive) return;
  ensureAudio();
  if (px >= L.bkX && px <= L.bkX + L.bkSize && py >= L.bkY && py <= L.bkY + L.bkSize) {
    showLevelSelect(); return;
  }
  for (var i = 0; i < stock.length; i++) {
    var b = stock[i];
    if (b.used || b.spawning || b.revealT > 0) continue;
    if (px >= b.x && px <= b.x + L.bw && py >= b.y && py <= b.y + L.bh) {
      if (!isBoxTappable(i)) { b.shakeT = 0.5; return; }
      b.popT = 1;
      sfx.pop();
      spawnBurst(b.x + L.bw / 2, b.y + L.bh / 2, COLORS[b.ci].fill, 18);
      spawnPhysMarbles(b);
      return;
    }
  }
}
canvas.addEventListener('click', function (e) { handleTap(e.clientX, e.clientY); });
canvas.addEventListener('touchstart', function (e) { e.preventDefault(); handleTap(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
document.getElementById('cal-panel').addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: false });
canvas.addEventListener('mousemove', function (e) {
  hoverIdx = -1;
  if (!gameActive) return;
  if (e.clientX >= L.bkX && e.clientX <= L.bkX + L.bkSize && e.clientY >= L.bkY && e.clientY <= L.bkY + L.bkSize) {
    canvas.style.cursor = 'pointer'; return;
  }
  for (var i = 0; i < stock.length; i++) {
    var b = stock[i];
    if (b.used || b.spawning || b.revealT > 0) continue;
    if (!isBoxTappable(i)) continue;
    if (e.clientX >= b.x && e.clientX <= b.x + L.bw && e.clientY >= b.y && e.clientY <= b.y + L.bh) { hoverIdx = i; break; }
  }
  canvas.style.cursor = hoverIdx >= 0 ? 'pointer' : 'default';
});

// === UPDATE ===
function update() {
  if (!gameActive) return;
  tick++;
  updateObstacles();
  physicsStep();
  checkCupTrapping();

  beltOffset = (beltOffset + BELT_SPEED * S) % 1;
  for (var i = 0; i < BELT_SLOTS; i++) {
    if (beltSlots[i].arriveAnim > 0) beltSlots[i].arriveAnim = Math.max(0, beltSlots[i].arriveAnim - 0.025);
  }

  // Belt→sort matching
  for (var si = 0; si < BELT_SLOTS; si++) {
    var slot = beltSlots[si]; if (slot.marble < 0) continue;
    var slotT = getSlotT(si);
    for (var c = 0; c < 4; c++) {
      var col = sortCols[c]; var tv = -1;
      for (var r = 0; r < col.length; r++) { if (col[r].vis) { tv = r; break; } }
      if (tv < 0 || col[tv].ci !== slot.marble) continue;
      var inFlight = 0;
      for (var j = 0; j < jumpers.length; j++) { if (jumpers[j].targetCol === c) inFlight++; }
      if (col[tv].filled + inFlight >= SORT_CAP) continue;
      var bt = L.sortBeltT[c]; var diff = Math.abs(slotT - bt); var wdiff = Math.min(diff, 1 - diff);
      if (wdiff < 0.015) {
        var aj = false;
        for (var j = 0; j < jumpers.length; j++) { if (jumpers[j].slotIdx === si) { aj = true; break; } }
        if (aj) continue;
        var pos = getSlotPos(si);
        var tSlot = col[tv].filled + inFlight;
        jumpers.push({ ci: slot.marble, slotIdx: si, startX: pos.x, startY: pos.y, targetCol: c, targetSlot: tSlot, t: 0 });
        slot.marble = -1; break;
      }
    }
  }

  // Jumper animation
  for (var i = jumpers.length - 1; i >= 0; i--) {
    var j = jumpers[i]; j.t += 0.04;
    if (j.t >= 1) {
      var col = sortCols[j.targetCol]; var tv = -1;
      for (var r = 0; r < col.length; r++) { if (col[r].vis) { tv = r; break; } }
      if (tv >= 0 && col[tv].ci === j.ci && col[tv].filled < SORT_CAP) {
        col[tv].filled++; col[tv].shineT = 1; col[tv].squishT = 1; score += 10;
        var sx2 = L.sSx + j.targetCol * (L.sBw + L.sColGap) + L.sBw / 2 + (j.targetSlot - 1) * (L.sBw / 4);
        var sy2 = getSortBoxY(j.targetCol, 0) + L.sBh / 2;
        spawnBurst(sx2, sy2, COLORS[j.ci].fill, 8); sfx.sort();
        if (col[tv].filled >= SORT_CAP) {
          var cx2 = L.sSx + j.targetCol * (L.sBw + L.sColGap) + L.sBw / 2;
          col[tv].popT = 1; score += 50; sfx.complete();
          spawnBurst(cx2, sy2, COLORS[j.ci].fill, 28);
          spawnConfetti(cx2, sy2, 20);
          for (var p = 0; p < 12; p++) {
            var a = Math.PI * 2 * p / 12; var sp = 5 + Math.random() * 3;
            particles.push({ x: cx2, y: sy2, vx: Math.cos(a) * sp * S, vy: Math.sin(a) * sp * S,
              r: (1 + Math.random() * 2) * S, color: '#fff', life: 1, decay: 0.04, grav: false });
          }
          (function (rc, rt) { setTimeout(function () { rc[rt].vis = false; checkWin(); }, 400); })(col, tv);
        }
      }
      jumpers.splice(i, 1); continue;
    }
  }

  // Stock box animations
  for (var i = 0; i < stock.length; i++) {
    var b = stock[i];
    if (b.shakeT > 0) b.shakeT = Math.max(0, b.shakeT - 0.04);
    if (b.popT > 0) b.popT = Math.max(0, b.popT - 0.025);
    if (b.revealT > 0) b.revealT = Math.max(0, b.revealT - 0.03);
    if (b.emptyT > 0) b.emptyT = Math.max(0, b.emptyT - 0.025);
    // Auto-reveal
    if (!b.used && !b.revealed && !b.spawning && b.revealT <= 0) {
      var col = i % L.cols; var isBottom = true;
      for (var r2 = Math.floor(i / L.cols) + 1; r2 < L.rows; r2++) {
        if (!stock[r2 * L.cols + col].used) { isBottom = false; break; }
      }
      if (isBottom) {
        b.revealed = true; b.revealT = 1.0;
        var bx2 = b.x + L.bw / 2, by2 = b.y + L.bh / 2;
        for (var p = 0; p < 16; p++) {
          var a2 = Math.PI * 2 * p / 16 + Math.random() * 0.3;
          var sp2 = 3 + Math.random() * 5;
          var clr2 = ['#FFE4B5', '#FFF8DC', '#FAEBD7', '#DEB887', '#F5DEB3'][~~(Math.random() * 5)];
          particles.push({ x: bx2, y: by2, vx: Math.cos(a2) * sp2 * S, vy: Math.sin(a2) * sp2 * S,
            r: (3 + Math.random() * 5) * S, color: clr2, life: 1, decay: 0.015 + Math.random() * 0.015, grav: false });
        }
        sfx.pop();
      }
    }
    var th = (i === hoverIdx && !b.used && isBoxTappable(i)) ? 1 : 0;
    b.hoverT += (th - b.hoverT) * 0.12;
  }

  // Phys marble spawn bounce
  for (var i = 0; i < physMarbles.length; i++) {
    if (physMarbles[i].spawnT > 0) physMarbles[i].spawnT = Math.max(0, physMarbles[i].spawnT - 0.05);
  }

  // Sort box animations
  for (var c = 0; c < sortCols.length; c++) {
    var col = sortCols[c];
    for (var r = 0; r < col.length; r++) {
      if (col[r].popT > 0) col[r].popT = Math.max(0, col[r].popT - 0.018);
      if (col[r].shineT > 0) col[r].shineT = Math.max(0, col[r].shineT - 0.025);
      if (col[r].squishT > 0) col[r].squishT = Math.max(0, col[r].squishT - 0.06);
    }
  }

  // Lock button trigger check
  for (var c = 0; c < sortCols.length; c++) {
    var col = sortCols[c]; var topVis = -1;
    for (var r = 0; r < col.length; r++) { if (col[r].vis) { topVis = r; break; } }
    if (topVis < 0) continue;
    var box = col[topVis];
    if (box.type === 'lock' && !box.triggered) {
      box.triggered = true; box.triggerT = 1.0; box.shineT = 1;
      sfx.complete();
      var bx = L.sSx + c * (L.sBw + L.sColGap) + L.sBw / 2;
      var by = getSortBoxY(c, 0) + L.sBh / 2;
      spawnBurst(bx, by, '#FFD700', 20);
      spawnConfetti(bx, by, 15);
      (function (boxRef, colRef, rowRef) {
        setTimeout(function () { releaseCupMarbles(); boxRef.popT = 1; }, 300);
        setTimeout(function () { boxRef.vis = false; checkWin(); }, 700);
      })(box, col, topVis);
    }
    if (box.type === 'lock' && box.triggerT > 0) {
      box.triggerT = Math.max(0, box.triggerT - 0.03);
    }
  }

  tickParticles();
  updateRollingSound();
}

function checkWin() {
  for (var c = 0; c < sortCols.length; c++)
    for (var r = 0; r < sortCols[c].length; r++)
      if (sortCols[c][r].vis) return;
  if (!won) {
    won = true; sfx.win();
    levelStars[currentLevel] = 3;
    if (currentLevel + 1 < LEVELS.length && unlockedLevels <= currentLevel + 1) {
      unlockedLevels = currentLevel + 2;
    }
    document.getElementById('win-msg').textContent = 'Level ' + (currentLevel + 1) + ' complete!';
    spawnConfetti(W / 2, H / 3, 60);
    setTimeout(function () { spawnConfetti(W * 0.3, H / 2, 40); }, 200);
    setTimeout(function () { spawnConfetti(W * 0.7, H / 2, 40); }, 400);
    setTimeout(function () { spawnConfetti(W / 2, H / 4, 50); }, 600);
    setTimeout(function () { spawnConfetti(W / 2, H / 2, 80); }, 800);
    setTimeout(function () { document.getElementById('win-screen').classList.add('show'); }, 2000);
  }
}

// === MAIN LOOP ===
function frame() {
  if (gameActive) {
    update();
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawStock();
    drawPhysMarbles();
    drawFunnelOverlay();
    drawObstacles();
    drawBelt();
    drawJumpers();
    drawSortArea();
    drawBackButton();
    drawParticles();
    drawDebugWalls();
  }
  requestAnimationFrame(frame);
}

function restartGame() { initGame(); }

// === BOOT ===
loadImages(function () {
  resize();
  showLevelSelect();
  frame();
});
