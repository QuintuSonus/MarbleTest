// ============================================================
// obstacles.js — Obstacle types, walls, trapping, updates
// ============================================================

function updateObstacleLayout() {
  for (var i = 0; i < obstacles.length; i++) {
    var ob = obstacles[i];
    if (ob.type === 'cup') {
      ob.w = 72 * S; ob.h = 50 * S; ob.wallThick = 4 * S;
      var lvlDef = LEVELS[currentLevel].obstacles[i];
      var trackY = L.funnelTop + (L.funnelBendY - L.funnelTop) * (lvlDef.yPct || 0.45);
      ob.y = trackY;
      var fLeft = L.funnelLeft + ob.w * 0.1;
      var fRight = L.funnelRight - ob.w * 0.1;
      ob.trackCx = (fLeft + fRight) / 2;
      ob.trackHalfW = (fRight - fLeft - ob.w) / 2;
    }
    if (ob.type === 'gate') {
      var gyPct = ob.yPct;
      var gateY = L.funnelBendY + (L.funnelBot - L.funnelBendY) * gyPct;
      ob.pivotX = L.funnelCx; ob.pivotY = gateY;
      ob.barLen = (L.funnelBot - gateY) * 1.12;
    }
    if (ob.type === 'trapdoor') {
      var tdYPct = ob.yPct;
      var tdY = L.funnelTop + (L.funnelBendY - L.funnelTop) * tdYPct;
      var fW = L.funnelRight - L.funnelLeft;
      var cupW = fW * 0.34;
      var cupH = 55 * S;
      var leftX = L.funnelLeft + cupW / 2 + 6 * S;
      var rightX = L.funnelRight - cupW / 2 - 6 * S;
      for (var ci = 0; ci < ob.cups.length; ci++) {
        var cup = ob.cups[ci];
        cup.y = tdY; cup.w = cupW; cup.h = cupH; cup.wallThick = 4 * S;
        cup.x = (cup.side === 'left') ? leftX : rightX;
      }
    }
  }
}

function getCupWalls(ob) {
  var hw = ob.w / 2; var left = ob.x - hw; var right = ob.x + hw; var top = ob.y; var bot = ob.y + ob.h;
  var walls = [
    { x1: left, y1: top, x2: left, y2: bot },
    { x1: right, y1: top, x2: right, y2: bot }
  ];
  if (!ob.released) {
    walls.push({ x1: left, y1: bot, x2: right, y2: bot });
  }
  return walls;
}

function updateObstacles() {
  for (var i = 0; i < obstacles.length; i++) {
    var ob = obstacles[i];
    if (ob.type === 'cup') {
      if (ob.released) continue;
      ob.phase += ob.speed * 0.012 * S;
      var t = Math.sin(ob.phase);
      var prevX = ob.x;
      ob.x = ob.trackCx + t * ob.trackHalfW;
      var dx = ob.x - prevX;
      for (var j = 0; j < ob.trapped.length; j++) {
        ob.trapped[j].x += dx;
      }
    }
    if (ob.type === 'gate') {
      var adiff = ob.targetAngle - ob.angle;
      if (Math.abs(adiff) > 0.002) {
        ob.angle += adiff * 0.08;
      } else {
        ob.angle = ob.targetAngle;
      }
      if (ob.switchT > 0) ob.switchT = Math.max(0, ob.switchT - 0.025);
    }
    if (ob.type === 'trapdoor') {
      ob.timer++;
      var half = ob.interval / 2;
      var leftOpen = (ob.timer % ob.interval) >= half;
      if (leftOpen !== ob.prevLeftOpen) {
        ob.prevLeftOpen = leftOpen;
        ob.switchT = 1.0;
        sfx.pop();
        for (var ci = 0; ci < ob.cups.length; ci++) {
          var cup = ob.cups[ci];
          var shouldOpen = (cup.side === 'left') ? leftOpen : !leftOpen;
          if (shouldOpen && !cup.open) {
            cup.open = true;
            for (var mj = 0; mj < cup.trapped.length; mj++) {
              var m = cup.trapped[mj];
              m.inCup = false;
              m.vy = 1 * S + Math.random() * 2 * S;
              m.vx = (Math.random() - 0.5) * 2 * S;
              spawnBurst(m.x, m.y, COLORS[m.ci].fill, 4);
            }
            cup.trapped = [];
          } else if (!shouldOpen && cup.open) {
            cup.open = false;
          }
        }
      }
      for (var ci = 0; ci < ob.cups.length; ci++) {
        var cup = ob.cups[ci];
        var target = cup.open ? 1 : 0;
        cup.openT += (target - cup.openT) * 0.15;
        if (Math.abs(cup.openT - target) < 0.01) cup.openT = target;
      }
      if (ob.switchT > 0) ob.switchT = Math.max(0, ob.switchT - 0.02);
    }
  }
}

function getObstacleWalls() {
  var walls = [];
  for (var i = 0; i < obstacles.length; i++) {
    var ob = obstacles[i];
    if (ob.type === 'cup' && !ob.released) {
      var cw = getCupWalls(ob);
      for (var j = 0; j < cw.length; j++) walls.push(cw[j]);
    }
    if (ob.type === 'gate') {
      var endX = ob.pivotX + Math.sin(ob.angle) * ob.barLen;
      var endY = ob.pivotY + Math.cos(ob.angle) * ob.barLen;
      walls.push({ x1: ob.pivotX, y1: ob.pivotY, x2: endX, y2: endY });
    }
    if (ob.type === 'trapdoor') {
      for (var ci = 0; ci < ob.cups.length; ci++) {
        var cup = ob.cups[ci];
        var hw = cup.w / 2; var left = cup.x - hw; var right = cup.x + hw;
        var top2 = cup.y; var bot2 = cup.y + cup.h;
        walls.push({ x1: left, y1: top2, x2: left, y2: bot2 });
        walls.push({ x1: right, y1: top2, x2: right, y2: bot2 });
        if (cup.openT < 0.5) {
          var split = cup.openT * 2 * hw * 0.6;
          var midX = cup.x;
          walls.push({ x1: left, y1: bot2, x2: midX - split, y2: bot2 });
          walls.push({ x1: midX + split, y1: bot2, x2: right, y2: bot2 });
        }
      }
    }
  }
  return walls;
}

function checkCupTrapping() {
  for (var oi = 0; oi < obstacles.length; oi++) {
    var ob = obstacles[oi];
    if (ob.type === 'cup') {
      if (ob.released) continue;
      var hw = ob.w / 2; var left = ob.x - hw; var right = ob.x + hw; var top = ob.y; var bot = ob.y + ob.h;
      for (var mi = 0; mi < physMarbles.length; mi++) {
        var m = physMarbles[mi];
        if (m.inCup) continue;
        if (m.x > left + m.r * 0.5 && m.x < right - m.r * 0.5 && m.y > top + m.r && m.y < bot) {
          m.inCup = true;
          if (ob.trapped.indexOf(m) < 0) ob.trapped.push(m);
        }
      }
    }
    if (ob.type === 'trapdoor') {
      for (var ci = 0; ci < ob.cups.length; ci++) {
        var cup = ob.cups[ci];
        if (cup.open) continue;
        var hw2 = cup.w / 2; var left2 = cup.x - hw2; var right2 = cup.x + hw2; var top2 = cup.y; var bot2 = cup.y + cup.h;
        for (var mi = 0; mi < physMarbles.length; mi++) {
          var m = physMarbles[mi];
          if (m.inCup) continue;
          if (m.x > left2 + m.r * 0.5 && m.x < right2 - m.r * 0.5 && m.y > top2 + m.r && m.y < bot2) {
            m.inCup = true;
            if (cup.trapped.indexOf(m) < 0) cup.trapped.push(m);
          }
        }
      }
    }
  }
}

function releaseCupMarbles() {
  for (var oi = 0; oi < obstacles.length; oi++) {
    var ob = obstacles[oi];
    if (ob.type !== 'cup') continue;
    ob.released = true;
    ob.releaseT = 1.0;
    for (var j = 0; j < ob.trapped.length; j++) {
      var m = ob.trapped[j];
      m.inCup = false;
      m.vy = 1 * S + Math.random() * 2 * S;
      m.vx = (Math.random() - 0.5) * 2 * S;
      spawnBurst(m.x, m.y, COLORS[m.ci].fill, 4);
    }
    ob.trapped = [];
    sfx.pop();
  }
}
