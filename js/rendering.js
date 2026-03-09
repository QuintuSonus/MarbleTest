// ============================================================
// rendering.js — All draw functions
// ============================================================

function rRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawMarble(x, y, r, ci, es) {
  var rs = r * (es || 1) * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = rs * 0.4;
  ctx.shadowOffsetX = rs * 0.08;
  ctx.shadowOffsetY = rs * 0.15;
  ctx.drawImage(marbleImg(ci), x - rs / 2, y - rs / 2, rs, rs);
  ctx.restore();
}

function drawBackground() {
  ctx.fillStyle = '#EDE5D8';
  ctx.fillRect(0, 0, W, H);
  var lvl = LEVELS[currentLevel];
  var bgKey = 'concept_bg_' + (lvl && lvl.bg ? lvl.bg : 1);
  var bgImg = imgs[bgKey];
  if (!bgImg || !bgImg.naturalWidth) return;
  var imgW = bgImg.naturalWidth;
  var imgH = bgImg.naturalHeight;
  var sc = H / imgH;
  var dw = imgW * sc;
  var dh = H;
  var dx = (W - dw) / 2;
  L.bgScale = sc; L.bgX = dx; L.bgY = 0; L.bgW = dw; L.bgH = dh;
  ctx.drawImage(bgImg, dx, 0, dw, dh);
}

function drawStock() {
  for (var i = 0; i < stock.length; i++) {
    var b = stock[i], c = COLORS[b.ci]; var ox = 0;
    if (b.shakeT > 0) ox = Math.sin(b.shakeT * 28) * 5 * S * b.shakeT;
    var breathe = 0;
    if (!b.used && !b.spawning && b.revealT <= 0 && isBoxTappable(i)) {
      breathe = Math.sin(tick * 0.04 + b.idlePhase) * 0.02;
    }
    var ps = 1 + b.popT * 0.15 + breathe;
    var hs = 1 + b.hoverT * 0.05;
    var ts = ps * hs;

    if (b.used && b.emptyT > 0) {
      ts *= 0.7 + 0.3 * (1 - b.emptyT);
      ctx.save(); ctx.globalAlpha = 1 - b.emptyT * 0.3;
      ctx.translate(b.x + L.bw / 2 + ox, b.y + L.bh / 2); ctx.scale(ts, ts);
      ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 4 * S; ctx.shadowOffsetX = 1 * S; ctx.shadowOffsetY = 2 * S;
      ctx.drawImage(imgs.box_empty, -L.bw / 2, -L.bh / 2, L.bw, L.bh);
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.translate(b.x + L.bw / 2 + ox, b.y + L.bh / 2); ctx.scale(ts, ts);
    ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 6 * S; ctx.shadowOffsetX = 2 * S; ctx.shadowOffsetY = 3 * S;

    if (b.used) {
      ctx.drawImage(imgs.box_empty, -L.bw / 2, -L.bh / 2, L.bw, L.bh);
    } else if (b.revealT > 0) {
      var rt = b.revealT;
      var phase = 1 - rt;
      if (phase < 0.5) {
        var wobble = Math.sin(phase * Math.PI * 8) * (1 - phase * 2) * 6 * S;
        var squash = 1 + Math.sin(phase * Math.PI * 4) * 0.08;
        ctx.save();
        ctx.rotate(wobble * 0.02);
        ctx.scale(squash, 2 - squash);
        ctx.drawImage(imgs.box_locked, -L.bw / 2, -L.bh / 2, L.bw, L.bh);
        ctx.restore();
      } else {
        var t2 = (phase - 0.5) * 2;
        var popScale = 1 + Math.sin(t2 * Math.PI) * 0.15;
        ctx.save();
        ctx.scale(popScale, popScale);
        if (t2 < 0.4) {
          ctx.globalAlpha = 1 - t2 * 2.5;
          ctx.drawImage(imgs.box_locked, -L.bw / 2, -L.bh / 2, L.bw, L.bh);
          ctx.globalAlpha = t2 * 2.5;
        }
        ctx.drawImage(boxImg(b.ci), -L.bw / 2, -L.bh / 2, L.bw, L.bh);
        ctx.globalAlpha = 1;
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        if (b.remaining > 0 && t2 > 0.3) {
          var mAlpha = Math.min(1, (t2 - 0.3) / 0.4);
          ctx.globalAlpha = mAlpha;
          var mr = Math.min(7 * S, L.bw / 8.5); var mg = Math.min(14 * S, L.bw / 4.2); var mgY = mg * MRB_GAP_FACTOR;
          for (var row = 0; row < 3; row++) for (var col2 = 0; col2 < 3; col2++) {
            drawMarble((col2 - 1) * mg, (row - 1) * mgY - 2 * S, mr, b.ci);
          }
          ctx.globalAlpha = 1;
          ctx.save();
          var lipH2 = L.bh * LIP_PCT;
          ctx.beginPath();
          ctx.rect(-L.bw / 2, L.bh / 2 - lipH2, L.bw, lipH2);
          ctx.clip();
          ctx.drawImage(boxImg(b.ci), -L.bw / 2, -L.bh / 2, L.bw, L.bh);
          ctx.restore();
        }
        ctx.restore();
      }
    } else {
      if (!b.revealed) {
        var idleWobble = Math.sin(tick * 0.02 + b.idlePhase) * 0.008;
        ctx.rotate(idleWobble);
        ctx.drawImage(imgs.box_locked, -L.bw / 2, -L.bh / 2, L.bw, L.bh);
      } else {
        var tappable = isBoxTappable(i);
        if (tappable && b.hoverT > 0.01) { ctx.shadowColor = c.glow; ctx.shadowBlur = 20 * S * b.hoverT; }
        ctx.drawImage(boxImg(b.ci), -L.bw / 2, -L.bh / 2, L.bw, L.bh);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        if (b.remaining > 0) {
          var mr = Math.min(7 * S, L.bw / 8.5); var mg = Math.min(14 * S, L.bw / 4.2); var mgY = mg * MRB_GAP_FACTOR;
          var gone = MRB_PER_BOX - b.remaining;
          var mrbsToDraw = [];
          for (var si2 = gone; si2 < MRB_PER_BOX; si2++) {
            mrbsToDraw.push(SNAKE_ORDER[si2]);
          }
          mrbsToDraw.sort(function (a, b2) { return a.r - b2.r; });
          for (var si2 = 0; si2 < mrbsToDraw.length; si2++) {
            var sp = mrbsToDraw[si2];
            drawMarble((sp.c - 1) * mg, (sp.r - 1) * mgY - 2 * S, mr, b.ci);
          }
          ctx.save();
          var lipH = L.bh * LIP_PCT;
          ctx.beginPath();
          ctx.rect(-L.bw / 2, L.bh / 2 - lipH, L.bw, lipH);
          ctx.clip();
          ctx.drawImage(boxImg(b.ci), -L.bw / 2, -L.bh / 2, L.bw, L.bh);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }
}

function drawFunnelOverlay() {
  if (!imgs.funnel || !imgs.funnel.naturalWidth) return;
  var pad = 12 * S;
  ctx.drawImage(imgs.funnel, L.funnelLeft - pad, L.funnelTop - pad, (L.funnelRight - L.funnelLeft) + pad * 2, L.funnelH + pad * 2);
}

function drawPhysMarbles() {
  for (var i = 0; i < physMarbles.length; i++) {
    var m = physMarbles[i];
    if (m.inCup) continue;
    var bounce = m.spawnT > 0 ? (1 + Math.sin(m.spawnT * Math.PI) * 0.4) : 1;
    drawMarble(m.x, m.y, m.r, m.ci, bounce);
  }
}

function drawBelt() {
  var slotR = 8 * S; var slotD = slotR * 2.4;
  for (var i = 0; i < BELT_SLOTS; i++) {
    var pos = getSlotPos(i); var slot = beltSlots[i];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 4 * S; ctx.shadowOffsetX = 1 * S; ctx.shadowOffsetY = 2 * S;
    ctx.drawImage(imgs.belt_slot_empty, pos.x - slotD / 2, pos.y - slotD / 2, slotD, slotD);
    ctx.restore();
    if (slot.marble >= 0) {
      var bs = 1;
      if (slot.arriveAnim > 0) {
        var t2 = 1 - slot.arriveAnim;
        bs = 1 + Math.sin(t2 * Math.PI * 3) * 0.3 * slot.arriveAnim;
      }
      drawMarble(pos.x, pos.y, slotR * 0.8 * cal.marble.s, slot.marble, bs);
    }
  }
}

function drawJumpers() {
  var slotR = 8 * S;
  for (var i = 0; i < jumpers.length; i++) {
    var j = jumpers[i]; var t = j.t;
    var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    var tx = L.sSx + j.targetCol * (L.sBw + L.sColGap) + L.sBw / 2 + (j.targetSlot - 1) * (L.sBw / 4);
    var ty = getSortBoxY(j.targetCol, 0) + L.sBh / 2;
    var x = j.startX + (tx - j.startX) * e;
    var y = j.startY + (ty - j.startY) * e - Math.sin(t * Math.PI) * 50 * S;
    var arcScale = 1 + Math.sin(t * Math.PI) * 0.25;
    if (tick % 3 === 0) {
      particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 0.5 * S, vy: 0.5 * S,
        r: (2 + Math.random() * 2) * S, color: COLORS[j.ci].light, life: 0.6, decay: 0.04, grav: false });
    }
    drawMarble(x, y, slotR * 0.8 * cal.marble.s, j.ci, arcScale);
  }
}

function drawSortArea() {
  for (var c = 0; c < 4; c++) {
    var col = sortCols[c]; var x = L.sSx + c * (L.sBw + L.sColGap);
    var visibleBoxes = [];
    for (var r = 0; r < col.length; r++) { if (col[r].vis) visibleBoxes.push({ idx: r, box: col[r] }); }
    var showCount = Math.min(visibleBoxes.length, SORT_VISIBLE_ROWS);
    var hiddenCount = visibleBoxes.length - showCount;
    for (var vi = 0; vi < showCount; vi++) {
      var b = visibleBoxes[vi].box; var byy = getSortBoxY(c, vi);
      var ps = 1 + b.popT * 0.25; var al = b.popT > 0.6 ? (1 - b.popT) * 2.5 : 1;
      var sqX = 1, sqY = 1;
      if (b.squishT > 0) {
        var sq = Math.sin(b.squishT * Math.PI);
        sqX = 1 + sq * 0.12; sqY = 1 - sq * 0.08;
      }
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, al));
      ctx.translate(x + L.sBw / 2, byy + L.sBh / 2); ctx.scale(ps * sqX, ps * sqY);

      if (b.type === 'lock') {
        var isTop = (vi === 0);
        var pulse = isTop ? 1 + Math.sin(tick * 0.08) * 0.03 : 1;
        ctx.scale(pulse, pulse);
        ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 5 * S;
        ctx.shadowOffsetX = 1 * S; ctx.shadowOffsetY = 3 * S;
        var grad = ctx.createLinearGradient(0, -L.sBh / 2, 0, L.sBh / 2);
        if (b.triggered) {
          grad.addColorStop(0, '#7BC67B'); grad.addColorStop(1, '#4AA04A');
        } else if (isTop) {
          grad.addColorStop(0, '#FFD966'); grad.addColorStop(1, '#E8A84C');
        } else {
          grad.addColorStop(0, '#B8A898'); grad.addColorStop(1, '#9A8A78');
        }
        ctx.fillStyle = grad;
        rRect(-L.sBw / 2, -L.sBh / 2, L.sBw, L.sBh, 8 * S); ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        if (b.shineT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + b.shineT * 0.5 + ')'; rRect(-L.sBw / 2, -L.sBh / 2, L.sBw, L.sBh, 8 * S); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1 * S;
        rRect(-L.sBw / 2 + 2 * S, -L.sBh / 2 + 2 * S, L.sBw - 4 * S, L.sBh - 4 * S, 6 * S); ctx.stroke();
        var iconS = Math.min(L.sBh * 0.35, L.sBw * 0.15);
        var lockX = 0; var lockY = 0;
        if (!b.triggered) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          rRect(lockX - iconS * 0.6, lockY - iconS * 0.2, iconS * 1.2, iconS * 0.9, 2 * S); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2 * S; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(lockX, lockY - iconS * 0.2, iconS * 0.4, -Math.PI, 0);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath(); ctx.arc(lockX, lockY + iconS * 0.12, iconS * 0.13, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3 * S; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(-iconS * 0.5, 0);
          ctx.lineTo(-iconS * 0.1, iconS * 0.4);
          ctx.lineTo(iconS * 0.5, -iconS * 0.3);
          ctx.stroke();
        }
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.shadowBlur = 5 * S; ctx.shadowOffsetX = 1 * S; ctx.shadowOffsetY = 3 * S;
        ctx.drawImage(sortImg(b.ci), -L.sBw / 2, -L.sBh / 2, L.sBw, L.sBh);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        if (b.shineT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + b.shineT * 0.35 + ')'; rRect(-L.sBw / 2, -L.sBh / 2, L.sBw, L.sBh, 8 * S); ctx.fill(); }
        var sp = L.sBw / 4, mrr = 6 * S * cal.sort.s * cal.marble.s;
        for (var j2 = 0; j2 < b.filled; j2++) drawMarble((j2 - 1) * sp, 0, mrr, b.ci);
        for (var j2 = b.filled; j2 < SORT_CAP; j2++) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.arc((j2 - 1) * sp, 0, mrr * 0.55, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    }
    if (hiddenCount > 0) {
      ctx.fillStyle = 'rgba(120,100,80,0.5)'; ctx.font = 9 * S + 'px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+' + hiddenCount + ' more', x + L.sBw / 2, L.sTop + showCount * (L.sBh + L.sGap) + 6 * S);
    }
    if (visibleBoxes.length > 0) {
      var topBox = visibleBoxes[0].box;
      if (topBox.type === 'lock') {
        ctx.fillStyle = 'rgba(200,170,80,0.5)';
      } else {
        var ac = COLORS[topBox.ci]; ctx.fillStyle = ac.fill + '60';
      }
      var ax = x + L.sBw / 2, ay = L.sTop - 4 * S;
      ctx.beginPath(); ctx.moveTo(ax - 5 * S, ay - 4 * S); ctx.lineTo(ax + 5 * S, ay - 4 * S); ctx.lineTo(ax, ay + 3 * S); ctx.closePath(); ctx.fill();
    }
  }
}

function drawObstacles() {
  for (var i = 0; i < obstacles.length; i++) {
    var ob = obstacles[i];
    if (ob.type === 'cup') {
      if (ob.released) continue;
      var hw = ob.w / 2;
      var left = ob.x - hw; var right = ob.x + hw;
      var top = ob.y; var bot = ob.y + ob.h;
      var wt = ob.wallThick;
      var cornerR = 5 * S;
      var taper = 4 * S;
      ctx.save();
      var trackLeft = ob.trackCx - ob.trackHalfW - hw;
      var trackRight = ob.trackCx + ob.trackHalfW + hw;
      ctx.strokeStyle = 'rgba(120,90,60,0.25)';
      ctx.lineWidth = 3 * S;
      ctx.setLineDash([4 * S, 4 * S]);
      ctx.beginPath();
      ctx.moveTo(trackLeft, top + ob.h * 0.5);
      ctx.lineTo(trackRight, top + ob.h * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8 * S; ctx.shadowOffsetX = 2 * S; ctx.shadowOffsetY = 4 * S;
      ctx.fillStyle = '#C4724E';
      ctx.beginPath();
      ctx.moveTo(left - taper, top);
      ctx.lineTo(left, bot - cornerR);
      ctx.quadraticCurveTo(left, bot, left + cornerR, bot);
      ctx.lineTo(right - cornerR, bot);
      ctx.quadraticCurveTo(right, bot, right, bot - cornerR);
      ctx.lineTo(right + taper, top);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      var inset = wt;
      ctx.fillStyle = 'rgba(80,40,20,0.35)';
      ctx.beginPath();
      ctx.moveTo(left + inset - taper * 0.6, top);
      ctx.lineTo(left + inset, bot - cornerR);
      ctx.quadraticCurveTo(left + inset, bot - inset + 2 * S, left + inset + cornerR, bot - inset + 2 * S);
      ctx.lineTo(right - inset - cornerR, bot - inset + 2 * S);
      ctx.quadraticCurveTo(right - inset, bot - inset + 2 * S, right - inset, bot - cornerR);
      ctx.lineTo(right - inset + taper * 0.6, top);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,150,0.5)'; ctx.lineWidth = 2 * S;
      ctx.beginPath(); ctx.moveTo(left - taper, top); ctx.lineTo(right + taper, top); ctx.stroke();
      var bandY = top + (bot - top) * 0.35;
      ctx.strokeStyle = 'rgba(180,100,60,0.4)'; ctx.lineWidth = 2 * S;
      ctx.beginPath();
      var bandLeftX = left + (bandY - top) / (bot - top) * taper * 0.5;
      var bandRightX = right - (bandY - top) / (bot - top) * taper * 0.5 + taper;
      ctx.moveTo(bandLeftX, bandY); ctx.lineTo(bandRightX, bandY); ctx.stroke();
      for (var j = 0; j < ob.trapped.length; j++) {
        var m = ob.trapped[j];
        drawMarble(m.x, m.y, m.r, m.ci);
      }
      ctx.restore();
    }
    if (ob.type === 'gate') {
      ctx.save();
      var px = ob.pivotX, py = ob.pivotY;
      var endX = px + Math.sin(ob.angle) * ob.barLen;
      var endY = py + Math.cos(ob.angle) * ob.barLen;
      var barW = 6 * S;
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 6 * S; ctx.shadowOffsetX = 1 * S; ctx.shadowOffsetY = 3 * S;
      ctx.strokeStyle = '#A08060'; ctx.lineWidth = barW; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(endX, endY); ctx.stroke();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2 * S;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(endX, endY); ctx.stroke();
      var hubR = 10 * S;
      ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 4 * S; ctx.shadowOffsetY = 2 * S;
      ctx.fillStyle = '#8B7355';
      ctx.beginPath(); ctx.arc(px, py, hubR, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#A08060';
      ctx.beginPath(); ctx.arc(px, py, hubR * 0.65, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(px - hubR * 0.15, py - hubR * 0.2, hubR * 0.3, 0, Math.PI * 2); ctx.fill();
      var dotR = 3.5 * S;
      var dotSpacing = 10 * S;
      var dotsStartX = px - ((ob.triggerCount - 1) * dotSpacing) / 2;
      var dotsY = py - hubR - 12 * S;
      if (ob.switchT > 0) {
        var ringAlpha = ob.switchT * 0.6;
        var ringR = hubR + 20 * S * (1 - ob.switchT);
        ctx.strokeStyle = 'rgba(255,215,0,' + ringAlpha + ')';
        ctx.lineWidth = 3 * S * ob.switchT;
        ctx.beginPath(); ctx.arc(px, py, ringR, 0, Math.PI * 2); ctx.stroke();
      }
      for (var d = 0; d < ob.triggerCount; d++) {
        var dx2 = dotsStartX + d * dotSpacing;
        var isFilled = (d < ob.counter);
        if (isFilled) {
          ctx.fillStyle = '#FFD966';
          ctx.shadowColor = 'rgba(255,217,102,0.4)'; ctx.shadowBlur = 4 * S;
          ctx.beginPath(); ctx.arc(dx2, dotsY, dotR, 0, Math.PI * 2); ctx.fill();
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath(); ctx.arc(dx2 - dotR * 0.2, dotsY - dotR * 0.25, dotR * 0.35, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(120,100,80,0.2)';
          ctx.beginPath(); ctx.arc(dx2, dotsY, dotR, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(120,100,80,0.35)'; ctx.lineWidth = 1.5 * S;
          ctx.beginPath(); ctx.arc(dx2, dotsY, dotR, 0, Math.PI * 2); ctx.stroke();
        }
      }
      var arrowX = px + (ob.side < 0 ? -1 : 1) * (((ob.triggerCount - 1) * dotSpacing) / 2 + 16 * S);
      var arrowY = dotsY;
      var arrowDir = ob.side < 0 ? 1 : -1;
      ctx.fillStyle = 'rgba(120,100,80,0.3)';
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY - 4 * S);
      ctx.lineTo(arrowX + arrowDir * 6 * S, arrowY);
      ctx.lineTo(arrowX, arrowY + 4 * S);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (ob.type === 'trapdoor') {
      for (var ci = 0; ci < ob.cups.length; ci++) {
        var cup = ob.cups[ci];
        var hw = cup.w / 2;
        var left = cup.x - hw; var right = cup.x + hw;
        var top2 = cup.y; var bot2 = cup.y + cup.h;
        var wt = cup.wallThick;
        var cornerR = 5 * S;
        var taper = 4 * S;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8 * S; ctx.shadowOffsetX = 2 * S; ctx.shadowOffsetY = 4 * S;
        var bodyColor = cup.open ? '#8B6B50' : '#C4724E';
        var rimColor = cup.open ? 'rgba(180,150,120,0.3)' : 'rgba(255,200,150,0.5)';
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(left - taper, top2);
        ctx.lineTo(left, bot2 - cornerR);
        ctx.quadraticCurveTo(left, bot2, left + cornerR, bot2);
        var split = cup.openT * hw * 0.8;
        if (cup.openT < 0.05) {
          ctx.lineTo(right - cornerR, bot2);
        } else {
          ctx.lineTo(cup.x - split, bot2);
          ctx.moveTo(cup.x + split, bot2);
          ctx.lineTo(right - cornerR, bot2);
        }
        ctx.quadraticCurveTo(right, bot2, right, bot2 - cornerR);
        ctx.lineTo(right + taper, top2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        var inset = wt;
        ctx.fillStyle = 'rgba(80,40,20,0.35)';
        ctx.beginPath();
        ctx.moveTo(left + inset - taper * 0.6, top2);
        ctx.lineTo(left + inset, bot2 - cornerR);
        ctx.quadraticCurveTo(left + inset, bot2 - inset + 2 * S, left + inset + cornerR, bot2 - inset + 2 * S);
        ctx.lineTo(right - inset - cornerR, bot2 - inset + 2 * S);
        ctx.quadraticCurveTo(right - inset, bot2 - inset + 2 * S, right - inset, bot2 - cornerR);
        ctx.lineTo(right - inset + taper * 0.6, top2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rimColor; ctx.lineWidth = 2 * S;
        ctx.beginPath(); ctx.moveTo(left - taper, top2); ctx.lineTo(right + taper, top2); ctx.stroke();
        var bandY = top2 + (bot2 - top2) * 0.35;
        ctx.strokeStyle = 'rgba(180,100,60,0.4)'; ctx.lineWidth = 2 * S;
        ctx.beginPath();
        var bandLeftX = left + (bandY - top2) / (bot2 - top2) * taper * 0.5;
        var bandRightX = right - (bandY - top2) / (bot2 - top2) * taper * 0.5 + taper;
        ctx.moveTo(bandLeftX, bandY); ctx.lineTo(bandRightX, bandY); ctx.stroke();
        var iconY = top2 - 12 * S;
        var iconX = cup.x;
        if (cup.open) {
          ctx.fillStyle = 'rgba(100,200,100,0.7)';
          ctx.beginPath();
          ctx.moveTo(iconX - 6 * S, iconY - 3 * S);
          ctx.lineTo(iconX + 6 * S, iconY - 3 * S);
          ctx.lineTo(iconX, iconY + 5 * S);
          ctx.closePath(); ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(200,100,80,0.7)';
          rRect(iconX - 8 * S, iconY - 2 * S, 16 * S, 4 * S, 2 * S);
          ctx.fill();
        }
        var cupProgress;
        if (cup.side === 'left') {
          cupProgress = cup.open ? 0 : (1 - (ob.timer % Math.floor(ob.interval / 2)) / (ob.interval / 2));
        } else {
          cupProgress = cup.open ? 0 : (1 - (ob.timer % Math.floor(ob.interval / 2)) / (ob.interval / 2));
        }
        var arcR = 5 * S;
        var arcX = iconX;
        var arcY = iconY - 10 * S;
        ctx.strokeStyle = 'rgba(120,100,80,0.2)'; ctx.lineWidth = 2.5 * S;
        ctx.beginPath(); ctx.arc(arcX, arcY, arcR, 0, Math.PI * 2); ctx.stroke();
        if (!cup.open) {
          ctx.strokeStyle = 'rgba(232,168,76,0.8)'; ctx.lineWidth = 2.5 * S;
          ctx.beginPath();
          ctx.arc(arcX, arcY, arcR, -Math.PI / 2, -Math.PI / 2 + cupProgress * Math.PI * 2);
          ctx.stroke();
        }
        for (var mj = 0; mj < cup.trapped.length; mj++) {
          var m = cup.trapped[mj];
          drawMarble(m.x, m.y, m.r, m.ci);
        }
        ctx.restore();
      }
    }
  }
}

function drawBackButton() {
  if (!imgs.level_select_button || !imgs.level_select_button.naturalWidth) return;
  var bx = L.bkX, by = L.bkY, bs = L.bkSize;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 6 * S; ctx.shadowOffsetX = 1 * S; ctx.shadowOffsetY = 3 * S;
  ctx.drawImage(imgs.level_select_button, bx, by, bs, bs);
  ctx.restore();
}

function drawDebugWalls() {
  if (!calVisible) return;
  ctx.strokeStyle = 'rgba(255,0,0,0.4)'; ctx.lineWidth = 2;
  for (var w = 0; w < funnelWalls.length; w++) {
    var wall = funnelWalls[w];
    ctx.beginPath(); ctx.moveTo(wall.x1, wall.y1); ctx.lineTo(wall.x2, wall.y2); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,100,255,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (var i = 0; i < beltPath.length; i++) {
    if (i === 0) ctx.moveTo(beltPath[i].x, beltPath[i].y); else ctx.lineTo(beltPath[i].x, beltPath[i].y);
  }
  ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,180,0,0.3)'; ctx.lineWidth = 1;
  for (var c = 0; c < 4; c++) {
    var x = L.sSx + c * (L.sBw + L.sColGap);
    ctx.strokeRect(x, L.sTop, L.sBw, SORT_VISIBLE_ROWS * (L.sBh + L.sGap));
  }
  var obWalls = getObstacleWalls();
  ctx.strokeStyle = 'rgba(200,100,0,0.5)'; ctx.lineWidth = 2;
  for (var w = 0; w < obWalls.length; w++) {
    var wall = obWalls[w];
    ctx.beginPath(); ctx.moveTo(wall.x1, wall.y1); ctx.lineTo(wall.x2, wall.y2); ctx.stroke();
  }
}
