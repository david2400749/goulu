/* =========================================================
   GOULU — rendu d'une image
   ---------------------------------------------------------
   1. drawSceneLayer : entités / particules sur le canvas hors-écran
      (cette couche sera déformée par la lentille gravitationnelle)
   2. drawOverlay    : repères en monde (portée de parry, charges,
      ondes de choc, avertissements, toasts) — jamais déformés
   3. SpaceGL.render : ciel, trou noir, lentille, bloom, étalonnage
   ========================================================= */

/* Réglages graphiques par skin : température du disque (K), rotation de teinte, saturation */
const SKIN_GFX = {
  classic:  { temp:5600, hue:0,     sat:1.00, glow:1.00 },
  red:      { temp:3300, hue:-0.30, sat:1.20, glow:1.05 },
  gold:     { temp:4500, hue:0.22,  sat:1.25, glow:1.10 },
  cyan:     { temp:10500,hue:0,     sat:1.05, glow:0.95 },
  emerald:  { temp:5000, hue:2.05,  sat:1.15, glow:1.00 },
  void:     { temp:7500, hue:0,     sat:0.00, glow:1.05 },
  prism:    { temp:6200, hue:-1,    sat:1.45, glow:1.05 },   // hue -1 : cycle continu
  singular: { temp:7200, hue:0.35,  sat:1.30, glow:1.30 },
  echo:     { temp:5400, hue:5.0,   sat:1.20, glow:1.10 }
};

const VIS = { attract:0, spin:0, glow:1, fade:0, tilt:1.29, hurt:0, danger:0, ripple:[] };
const SK_NEUTRAL = '#dce4ff';
const WAVE_TINTS = [[.9,1,1.3],[1.3,.8,1],[1,.9,1.4],[1.4,.8,.8],[.8,1.1,1.4],[1.3,1,.8],[1.4,.8,1],[.8,1.3,1],[1.5,.8,.8],[1.2,1.2,1.2]];
const VTINT = [1, 1, 1];

function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }

/* ---------- sprites lumineux (mis en cache) ---------- */
const spriteCache = {};
function glowSprite(key, stops, radius){
  const k = key + '|' + radius + '|' + sceneScale;
  let c = spriteCache[k]; if(c) return c;
  const s = Math.max(2, Math.ceil(radius * 2 * sceneScale));
  c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'); g.setTransform(sceneScale, 0, 0, sceneScale, 0, 0);
  const gr = g.createRadialGradient(radius, radius, 0, radius, radius, radius);
  for(const st of stops) gr.addColorStop(st[0], st[1]);
  g.fillStyle = gr; g.fillRect(0, 0, radius * 2, radius * 2);
  spriteCache[k] = c; return c;
}
function diamondPath(c, x, y, r){ c.beginPath(); c.moveTo(x, y-r); c.lineTo(x+r, y); c.lineTo(x, y+r); c.lineTo(x-r, y); c.closePath(); }

/* ---------- COUCHE SCÈNE ---------- */
function drawSceneLayer(t){
  const s = sceneScale;
  sctx.setTransform(s, 0, 0, s, 0, 0);
  sctx.globalCompositeOperation = 'source-over';
  sctx.globalAlpha = 1;
  sctx.clearRect(0, 0, W, H);
  if(state === 'menu') return;
  sctx.save();
  sctx.translate(cam.dx, cam.dy);
  const cb = profile.options.colorblind;
  for(let i = 0; i < entities.length; i++){ const e = entities[i]; if(!e.dead) drawEntity(e, t, cb); }
  sctx.globalCompositeOperation = 'lighter';
  for(let i = 0; i < particles.length; i++){
    const p = particles[i];
    const a = Math.max(0, p.life / p.maxLife);
    sctx.globalAlpha = a * 0.95;
    sctx.fillStyle = p.color;
    sctx.beginPath(); sctx.arc(p.x, p.y, p.r * a + 0.5, 0, Math.PI * 2); sctx.fill();
  }
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = 'source-over';
  sctx.restore();
}

function drawTrail(e, rgb){
  if(!e.trail || e.trail.length < 2) return;
  sctx.globalCompositeOperation = 'lighter';
  for(let k = 0; k < e.trail.length; k++){
    const tr = e.trail[k];
    const f = tr.life / 0.28;
    sctx.fillStyle = 'rgba(' + rgb + ',' + (f * 0.32).toFixed(3) + ')';
    sctx.beginPath(); sctx.arc(tr.x, tr.y, e.r * 0.55 * f + 0.6, 0, Math.PI * 2); sctx.fill();
  }
  sctx.globalCompositeOperation = 'source-over';
}

const DUST_RGB = { gold:'255,203,90', blue:'126,200,255', red:'255,100,60', white:'235,240,255' };

function drawEntity(e, t, cb){
  if(e.type === 'dust') drawDust(e, t);
  else if(e.bossPart) drawBossPart(e, t);
  else if(e.isProjectile) drawBolt(e, t);
  else drawAnti(e, t, cb);
}

/* Poussière stellaire : grain incandescent, étiré (spaghettification) près du trou */
function drawDust(e, t){
  const d = DUST_TYPES[e.dustType] || DUST_TYPES.gold;
  drawTrail(e, DUST_RGB[d.id] || DUST_RGB.gold);
  const dx = bh.x - e.x, dy = bh.y - e.y;
  const dist = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  const near = clamp(1 - (dist - bh.r) / 300, 0, 1);
  const stretch = 1 + near * near * 3.2;
  const flick = 0.8 + 0.2 * Math.sin(t * 9 + e.phase * 3);
  const R3 = e.r * 3.6;
  sctx.save();
  sctx.translate(e.x, e.y); sctx.rotate(ang);
  sctx.scale(stretch, 1 / Math.sqrt(stretch));
  sctx.globalCompositeOperation = 'lighter';
  sctx.globalAlpha = flick;
  sctx.drawImage(glowSprite('dust_' + d.id, [[0, d.glow + '0.95)'], [0.22, d.glow + '0.55)'], [0.6, d.glow + '0.12)'], [1, d.glow + '0)']], R3), -R3, -R3, R3 * 2, R3 * 2);
  sctx.globalAlpha = 1;
  if(d.id === 'red'){
    diamondPath(sctx, 0, 0, e.r * 0.95);
    sctx.fillStyle = 'rgba(255,230,210,.95)'; sctx.fill();
    diamondPath(sctx, 0, 0, e.r * 1.35);
    sctx.strokeStyle = 'rgba(255,110,60,.85)'; sctx.lineWidth = 1.3; sctx.stroke();
  } else {
    sctx.beginPath(); sctx.arc(0, 0, e.r * (d.id === 'blue' ? 0.5 : 0.58), 0, Math.PI * 2);
    sctx.fillStyle = 'rgba(255,255,255,' + (0.7 + 0.3 * flick).toFixed(2) + ')'; sctx.fill();
    if(d.id === 'blue'){
      sctx.beginPath(); sctx.arc(0, 0, e.r * 1.2, 0, Math.PI * 2);
      sctx.strokeStyle = 'rgba(150,215,255,.8)'; sctx.lineWidth = 1.2; sctx.stroke();
    } else {
      const L = e.r * (d.id === 'white' ? 3.2 : 2.4);
      sctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * flick).toFixed(2) + ')'; sctx.lineWidth = 1;
      sctx.beginPath(); sctx.moveTo(-L, 0); sctx.lineTo(L, 0); sctx.moveTo(0, -L); sctx.lineTo(0, L); sctx.stroke();
    }
  }
  sctx.restore();
  sctx.globalCompositeOperation = 'source-over';
}

/* Antimatière : sphère de vide cernée d'une couronne d'annihilation */
function drawAnti(e, t, cb){
  const rgb = cb ? '90,170,255' : '255,60,110';
  drawTrail(e, rgb);
  const pulse = 1 + Math.sin(t * 5 + e.phase) * 0.1;
  const R3 = e.r * 3.8 * pulse;
  sctx.globalCompositeOperation = 'lighter';
  sctx.drawImage(glowSprite(cb ? 'anti_cb' : 'anti', [[0, 'rgba(' + rgb + ',0)'], [0.34, 'rgba(' + rgb + ',0.55)'], [0.5, 'rgba(' + rgb + ',0.2)'], [1, 'rgba(' + rgb + ',0)']], R3 / pulse), e.x - R3, e.y - R3, R3 * 2, R3 * 2);
  sctx.globalCompositeOperation = 'source-over';
  sctx.save(); sctx.translate(e.x, e.y);
  sctx.beginPath();
  if(cb) sctx.rect(-e.r, -e.r, e.r * 2, e.r * 2); else sctx.arc(0, 0, e.r, 0, Math.PI * 2);
  sctx.fillStyle = '#02000a'; sctx.fill();
  sctx.globalCompositeOperation = 'lighter';
  sctx.lineWidth = 2.2;
  sctx.strokeStyle = 'rgba(' + rgb + ',.95)'; sctx.stroke();
  sctx.lineWidth = 0.9; sctx.strokeStyle = 'rgba(255,230,235,.75)';
  sctx.beginPath(); if(cb) sctx.rect(-e.r*0.82, -e.r*0.82, e.r*1.64, e.r*1.64); else sctx.arc(0, 0, e.r * 0.8, 0, Math.PI * 2); sctx.stroke();
  /* arcs d'annihilation en rotation */
  const rot = t * 1.9 + e.phase;
  sctx.lineWidth = 1.5; sctx.lineCap = 'round';
  for(let i = 0; i < 3; i++){
    const a0 = rot + i * 2.094;
    sctx.strokeStyle = 'rgba(' + rgb + ',' + (0.55 - i * 0.12).toFixed(2) + ')';
    sctx.beginPath(); sctx.arc(0, 0, e.r * (1.55 + i * 0.22), a0, a0 + 0.9); sctx.stroke();
  }
  sctx.restore();
  sctx.globalCompositeOperation = 'source-over';
}

function drawBolt(e, t){
  drawTrail(e, '255,120,70');
  const R = e.r * 3.2;
  sctx.globalCompositeOperation = 'lighter';
  sctx.drawImage(glowSprite('bolt', [[0, 'rgba(255,240,220,1)'], [0.25, 'rgba(255,120,60,.8)'], [1, 'rgba(255,60,20,0)']], R), e.x - R, e.y - R, R * 2, R * 2);
  sctx.globalCompositeOperation = 'source-over';
}

function drawBossPart(e, t){
  const color = boss ? boss.type.color : '#ff2d6f';
  const bid = boss ? boss.type.id : 'consumer';
  const flashAmt = boss && boss.hitFlash > 0 ? boss.hitFlash / 0.18 : 0;
  const ang = Math.atan2(bh.y - e.y, bh.x - e.x);
  if(e.isMain){
    const R3 = e.r * 3.6;
    sctx.globalCompositeOperation = 'lighter';
    sctx.drawImage(glowSprite('boss' + color, [[0, color], [0.3, color], [0.62, 'rgba(0,0,0,0)']], R3), e.x - R3, e.y - R3, R3 * 2, R3 * 2);
    sctx.globalCompositeOperation = 'source-over';
    const rr = e.r * (1 + Math.sin(t * 8) * 0.05);
    sctx.save(); sctx.translate(e.x, e.y);
    if(bid === 'eye'){
      sctx.beginPath(); sctx.arc(0, 0, rr, 0, Math.PI * 2);
      const gi = sctx.createRadialGradient(Math.cos(ang) * rr * 0.2, Math.sin(ang) * rr * 0.2, rr * 0.1, 0, 0, rr);
      gi.addColorStop(0, '#0b1d33'); gi.addColorStop(0.55, '#154a73'); gi.addColorStop(0.85, '#5fd0ff'); gi.addColorStop(1, '#d8f6ff');
      sctx.fillStyle = gi; sctx.fill();
      sctx.save(); sctx.rotate(ang);
      sctx.beginPath(); sctx.ellipse(rr * 0.16, 0, rr * 0.2, rr * 0.5, 0, 0, Math.PI * 2);
      sctx.fillStyle = '#000'; sctx.fill();
      sctx.restore();
      sctx.beginPath(); sctx.arc(-rr * 0.28, -rr * 0.32, rr * 0.11, 0, Math.PI * 2);
      sctx.fillStyle = 'rgba(255,255,255,.85)'; sctx.fill();
    } else {
      sctx.beginPath(); sctx.arc(0, 0, rr, 0, Math.PI * 2);
      const gc = sctx.createRadialGradient(0, 0, rr * 0.2, 0, 0, rr);
      gc.addColorStop(0, '#05000a'); gc.addColorStop(0.75, '#14000f'); gc.addColorStop(1, '#5a0a2a');
      sctx.fillStyle = gc; sctx.fill();
      /* gueule tournée vers le trou, bordée de dents */
      const open = 0.38 + 0.26 * Math.sin(t * 4);
      sctx.save(); sctx.rotate(ang);
      sctx.beginPath(); sctx.moveTo(0, 0); sctx.arc(0, 0, rr * 0.96, -open, open); sctx.closePath();
      const gm = sctx.createRadialGradient(0, 0, 0, 0, 0, rr);
      gm.addColorStop(0, '#fff'); gm.addColorStop(0.35, '#ff7a9c'); gm.addColorStop(1, '#a0123c');
      sctx.fillStyle = gm; sctx.fill();
      sctx.fillStyle = '#05000a';
      for(let i = -3; i <= 3; i++){
        const a = (i / 3) * open * 0.92;
        sctx.beginPath();
        sctx.moveTo(Math.cos(a - 0.07) * rr, Math.sin(a - 0.07) * rr);
        sctx.lineTo(Math.cos(a) * rr * 0.68, Math.sin(a) * rr * 0.68);
        sctx.lineTo(Math.cos(a + 0.07) * rr, Math.sin(a + 0.07) * rr);
        sctx.fill();
      }
      sctx.restore();
    }
    sctx.globalCompositeOperation = 'lighter';
    sctx.lineWidth = 2; sctx.strokeStyle = color;
    sctx.beginPath(); sctx.arc(0, 0, rr, 0, Math.PI * 2); sctx.stroke();
    if(flashAmt > 0){ sctx.fillStyle = 'rgba(255,255,255,' + (flashAmt * 0.8).toFixed(2) + ')'; sctx.beginPath(); sctx.arc(0, 0, rr, 0, Math.PI * 2); sctx.fill(); }
    sctx.restore();
    sctx.globalCompositeOperation = 'source-over';
  } else {
    const R3 = e.r * 3.2;
    sctx.globalCompositeOperation = 'lighter';
    sctx.drawImage(glowSprite('shard' + color, [[0, color], [0.4, 'rgba(160,110,255,.35)'], [1, 'rgba(0,0,0,0)']], R3), e.x - R3, e.y - R3, R3 * 2, R3 * 2);
    sctx.globalCompositeOperation = 'source-over';
    sctx.save(); sctx.translate(e.x, e.y); sctx.rotate(t * 2 + e.phase);
    diamondPath(sctx, 0, 0, e.r * 1.5);
    const gs = sctx.createLinearGradient(-e.r, -e.r, e.r, e.r);
    gs.addColorStop(0, '#d9c4ff'); gs.addColorStop(0.5, color); gs.addColorStop(1, '#2a0f60');
    sctx.fillStyle = gs; sctx.fill();
    sctx.strokeStyle = 'rgba(255,255,255,.8)'; sctx.lineWidth = 1; sctx.stroke();
    diamondPath(sctx, 0, 0, e.r * 0.5); sctx.fillStyle = 'rgba(255,255,255,.9)'; sctx.fill();
    if(flashAmt > 0){ diamondPath(sctx, 0, 0, e.r * 1.5); sctx.fillStyle = 'rgba(255,255,255,' + flashAmt.toFixed(2) + ')'; sctx.fill(); }
    sctx.restore();
  }
}

/* ---------- OVERLAY (repères en monde, non déformés) ---------- */
const TICK_N = 96;
function nearestThreat(pr){
  let best = null, bd = 1e9;
  for(let i = 0; i < entities.length; i++){
    const e = entities[i];
    if(e.dead || (e.type !== 'anti' && !e.bossPart)) continue;
    const d = Math.hypot(bh.x - e.x, bh.y - e.y);
    if(d < pr && d < bd){ bd = d; best = e; }
  }
  return best;
}
function drawPlayerHud(t){
  const pr = parryR();
  const bi = beatInfo(), win = beatWindow(bi.len);
  const kick = Math.max(0, 1 - bi.phase * 4);
  const inWin = bi.dist <= win;
  const reso = resonanceT > 0;
  const threat = nearestThreat(pr);
  const armed = !!threat && attract && shockCharges > 0;

  ctx.save();
  ctx.translate(bh.x, bh.y);
  /* anneau de portée : graduations de cadran */
  let col;
  if(reso) col = '255,211,107';
  else if(armed || (attract && inWin)) col = '255,226,140';
  else col = '160,205,255';
  const baseA = (attract ? 0.42 : 0.2) + kick * 0.3 + (armed ? 0.35 : 0);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(' + col + ',' + (baseA * 0.55).toFixed(3) + ')';
  ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.stroke();
  const rot = t * 0.04;
  ctx.beginPath();
  for(let i = 0; i < TICK_N; i++){
    const a = rot + i / TICK_N * Math.PI * 2;
    const long = i % 8 === 0, mid = i % 4 === 0;
    const l = long ? 9 : (mid ? 5 : 2.6);
    const c = Math.cos(a), s = Math.sin(a);
    ctx.moveTo(c * (pr - l), s * (pr - l)); ctx.lineTo(c * pr, s * pr);
  }
  ctx.strokeStyle = 'rgba(' + col + ',' + baseA.toFixed(3) + ')';
  ctx.lineWidth = 1.2; ctx.stroke();
  if(kick > 0.02 && !reduceFx()){
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,225,150,' + (kick * 0.3).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(0, 0, bh.r + 10 + (1 - kick) * pr * 0.9, 0, Math.PI * 2); ctx.stroke();
  }

  /* charges d'onde de choc : arcs segmentés */
  const max = getMaxCharges(), n = shockCharges, r0 = bh.r + 30;
  const seg = (Math.PI * 2) / max, gap = Math.min(0.22, seg * 0.28);
  ctx.lineCap = 'butt'; ctx.lineWidth = 2.6;
  for(let i = 0; i < max; i++){
    ctx.beginPath(); ctx.arc(0, 0, r0, -Math.PI / 2 + i * seg + gap / 2, -Math.PI / 2 + (i + 1) * seg - gap / 2);
    ctx.strokeStyle = i < n ? 'rgba(190,235,255,.95)' : 'rgba(150,200,255,.14)';
    ctx.stroke();
  }
  if(n < max){
    const prog = Math.min(1, dustSinceCharge / getDustPerCharge());
    if(prog > 0){
      const a0 = -Math.PI / 2 + n * seg + gap / 2;
      ctx.beginPath(); ctx.arc(0, 0, r0, a0, a0 + (seg - gap) * prog);
      ctx.strokeStyle = 'rgba(255,205,110,.95)'; ctx.stroke();
    }
  }
  ctx.restore();

  /* réticule de verrouillage sur la menace dans la zone de parry */
  if(threat){
    const s = threat.r * (threat.isMain ? 1.5 : 2.5) + 6, L = s * 0.55;
    const ra = armed ? 0.95 : 0.5;
    ctx.save();
    ctx.translate(threat.x, threat.y); ctx.rotate(t * (armed ? 1.4 : 0.4));
    ctx.strokeStyle = 'rgba(255,226,140,' + ra + ')'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for(let q = 0; q < 4; q++){
      ctx.rotate(Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(s, s - L); ctx.lineTo(s, s); ctx.lineTo(s - L, s); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawShockRings(){
  for(let i = 0; i < shockwaves.length; i++){
    const sw = shockwaves[i];
    const p = 1 - sw.life / sw.maxLife;
    const a = (1 - p) * 0.95;
    const col = sw.pulse ? '255,215,120' : (sw.weak ? '130,140,180' : (sw.isEcho ? '200,180,255' : '170,225,255'));
    ctx.beginPath(); ctx.arc(bh.x, bh.y, sw.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(' + col + ',' + (a * 0.25).toFixed(3) + ')';
    ctx.lineWidth = (sw.pulse ? 16 : 11) * (1 - p) + 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
    ctx.lineWidth = (sw.pulse ? 3.2 : 2) * (1 - p) + 0.8; ctx.stroke();
  }
}

function drawOffscreenWarnings(){
  const margin = 30;
  for(let i = 0; i < entities.length; i++){
    const e = entities[i];
    if(e.dead || (e.type !== 'anti' && !e.bossPart)) continue;
    if(e.bossPart && boss && boss.type.id === 'consumer') continue;
    if(e.x > -20 && e.x < W + 20 && e.y > -20 && e.y < H + 20) continue;
    const cx = W / 2, cy = H / 2;
    const dx = e.x - cx, dy = e.y - cy;
    const s = Math.min((W / 2 - margin) / Math.abs(dx || 1), (H / 2 - margin) / Math.abs(dy || 1));
    const px = cx + dx * s, py = cy + dy * s;
    const ang = Math.atan2(dy, dx);
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 160);
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-7, -7); ctx.lineTo(-3, 0); ctx.lineTo(-7, 7); ctx.closePath();
    ctx.fillStyle = 'rgba(255,70,110,' + (0.8 * pulse).toFixed(3) + ')'; ctx.fill(); ctx.restore();
  }
}

function drawToasts(){
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = Math.round(Math.min(17, Math.max(12, W * 0.034)));
  ctx.font = '600 ' + fs + 'px Inter, system-ui, sans-serif';
  try{ ctx.letterSpacing = '0.2em'; }catch(e){}
  for(let i = 0; i < toasts.length; i++){
    const tt = toasts[i];
    const a = Math.min(1, tt.life / 0.4);
    ctx.globalAlpha = a;
    ctx.shadowColor = tt.color; ctx.shadowBlur = 12;
    ctx.fillStyle = tt.color; ctx.fillText(tt.text, tt.x, tt.y);
    ctx.shadowBlur = 0;
    const w = Math.min(120, ctx.measureText(tt.text).width * 0.5 + 18);
    ctx.fillStyle = tt.color; ctx.globalAlpha = a * 0.5;
    ctx.fillRect(tt.x - w, tt.y + fs * 0.85, w * 2, 1);
  }
  ctx.globalAlpha = 1;
  try{ ctx.letterSpacing = '0px'; }catch(e){}
}
function drawDamageNumbers(){
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 ' + Math.round(Math.min(28, Math.max(18, W * 0.06))) + 'px Inter, system-ui, sans-serif';
  for(const d of damageNumbers){
    ctx.globalAlpha = Math.max(0, d.life / d.maxLife);
    ctx.shadowColor = '#ff4a7a'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff'; ctx.fillText(d.text, d.x, d.y);
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawOverlay(t, shk){
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if(!useGL) drawFallbackWorld(t, shk);
  if(state !== 'menu'){
    ctx.save();
    ctx.translate(cam.dx + shk.x, cam.dy + shk.y);
    drawShockRings();
    if(invincibleT > 0){
      const alpha = Math.min(1, invincibleT / INVINCIBLE_DURATION);
      ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.r + 16 + Math.sin(t * 22) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * alpha).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
    }
    if(hurtT > 0 && state === 'play'){
      const ha = (0.25 + 0.35 * Math.abs(Math.sin(t * 10))) * Math.min(1, hurtT * 2);
      ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.r + 12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,92,138,' + ha.toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
    }
    if(state === 'play' || (state === 'tutorial' && tutorialStep >= 1)) drawPlayerHud(t);
    ctx.restore();
    if(state === 'play') drawOffscreenWarnings();
    drawToasts();
    drawDamageNumbers();
  }
}

/* ---------- RENDU DE SECOURS (sans WebGL2) ---------- */
let fbBg = null;
function makeFallbackBg(){
  if(useGL || !W) return;
  fbBg = document.createElement('canvas'); fbBg.width = W; fbBg.height = H;
  const g = fbBg.getContext('2d');
  const bgr = g.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.8);
  bgr.addColorStop(0, '#0a0a18'); bgr.addColorStop(1, '#010103');
  g.fillStyle = bgr; g.fillRect(0, 0, W, H);
  for(let i = 0; i < Math.min(500, W * H / 3500); i++){
    g.globalAlpha = 0.2 + Math.random() * 0.7;
    g.fillStyle = Math.random() < 0.15 ? '#ffd9b0' : '#dce4ff';
    g.fillRect(Math.random() * W, Math.random() * H, Math.random() < 0.9 ? 1 : 2, 1);
  }
}
function drawFallbackWorld(t, shk){
  if(fbBg) ctx.drawImage(fbBg, 0, 0, W, H);
  const cx = bh.x + cam.dx + shk.x, cy = bh.y + cam.dy + shk.y;
  const R = bh.r * cam.zoom;
  const gl = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 6);
  gl.addColorStop(0, 'rgba(255,170,80,.35)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, R * 6, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.13); ctx.scale(1, 0.3);
  for(let i = 0; i < 4; i++){
    ctx.beginPath(); ctx.arc(0, 0, R * (2.2 + i * 0.85), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,' + (190 - i * 30) + ',' + (110 - i * 20) + ',' + (0.55 - i * 0.12) + ')';
    ctx.lineWidth = 9 - i * 2; ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,160,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
  if(state !== 'menu') ctx.drawImage(sceneCanvas, 0, 0, W, H);
}

/* ---------- IMAGE COMPLÈTE ---------- */
function renderFrame(dt){
  const t = performance.now() / 1000;
  const playing = state === 'play' || state === 'tutorial' || state === 'finale';

  /* état visuel lissé */
  VIS.attract += (((attract && playing) ? 1 : 0) - VIS.attract) * (1 - Math.exp(-dt * 6));
  VIS.fade = Math.min(1, VIS.fade + dt * 0.9);
  const spinSpeed = (state === 'menu' ? 0.7 : 1) * (1 + 1.3 * VIS.attract + (multiplier - 1) * 0.08);
  VIS.spin += dt * spinSpeed * (timeScale < 1 ? Math.max(0.35, timeScale) : 1);
  const bi = (state === 'play' && music.playing) ? beatInfo() : null;
  const kick = bi ? Math.max(0, 1 - bi.phase * 4) : 0;
  VIS.hurt += ((hurtT > 0 ? 1 : 0) - VIS.hurt) * (1 - Math.exp(-dt * 8));
  VIS.danger += (danger - VIS.danger) * (1 - Math.exp(-dt * 10));

  let shk = { x: 0, y: 0 };
  if(shake > 0 && profile.options.shake && !reduceFx() && state !== 'menu'){
    const k = Math.min(1, Math.min(W, H) / 700);
    shk.x = (Math.random() - 0.5) * shake * k; shk.y = (Math.random() - 0.5) * shake * k;
  }

  drawSceneLayer(t);
  drawOverlay(t, shk);
  if(!useGL) return;

  const sk = SKIN_GFX[profile.skin] || SKIN_GFX.classic;
  const hue = sk.hue === -1 ? (t * 0.45) % 6.2832 : sk.hue;
  const dilate = playing ? clamp((1 - timeScale) / 0.75, 0, 1) : 0;
  const radius = bh.r * cam.zoom;
  const tint = WAVE_TINTS[waveIndex % WAVE_TINTS.length];
  const wantTint = (state === 'play' && currentMode.useWaves && !currentCampaignLevel) ? tint : [1, 1, 1];
  for(let i = 0; i < 3; i++) VTINT[i] += (wantTint[i] - VTINT[i]) * Math.min(1, dt * 1.5);

  const ripples = [];
  for(let i = shockwaves.length - 1; i >= 0 && ripples.length < 4; i--){
    const sw = shockwaves[i], p = 1 - sw.life / sw.maxLife;
    ripples.push({ r: sw.r, w: 14 + sw.r * 0.08, s: (sw.pulse ? 34 : 24) * (1 - p) * (sw.weak ? 0.4 : 1), a: 1 });
  }
  const glow = (state === 'menu' ? 0.95 : 1.0) * sk.glow * (1 + 0.26 * VIS.attract + 0.03 * (multiplier - 1) + 0.28 * kick + 0.5 * VIS.hurt + (resonanceT > 0 ? 0.25 : 0)) * (state === 'finale' ? 1 + finaleT * 0.4 : 1);

  const fbW = glCanvas.width, fbH = glCanvas.height;
  SpaceGL.render({
    fbW, fbH, cssW: W, cssH: H,
    cx: bh.x + cam.dx, cy: bh.y + cam.dy,
    shakeX: shk.x, shakeY: shk.y,
    k: radius / 2.598, focal: H * 0.95,
    time: t, spin: VIS.spin, drift: [Math.sin(t * 0.043) * 14, Math.cos(t * 0.037) * 9],
    tilt: 1.285 + 0.03 * Math.sin(t * 0.21), roll: -0.13 + 0.02 * Math.sin(t * 0.17),
    glow, temp: sk.temp * (1 + 0.16 * VIS.attract), beam: 2.35,
    hue, sat: sk.sat,
    lens: 20 * (1 + 0.55 * VIS.attract), sceneLens: 1.15 * (1 + 0.4 * VIS.attract),
    sceneOn: state !== 'menu', sceneCanvas, sceneGain: 1.18,
    starGain: 1.0, quality: 1, tint: VTINT, ripples,
    bloomThr: 1.0, bloom: 0.8, exposure: 1.15, vignette: 0.5, grain: 0.028,
    aberr: 0.0012 + Math.min(1, shake / 32) * 0.004 + parryFlash * 0.004 + flash * 0.006 + dilate * 0.003,
    flashHurt: reduceFx() ? flash * 0.4 : flash,
    flashGold: parryFlash * (reduceFx() ? 0.4 : 1),
    freeze: overkillFreeze > 0 ? Math.min(1, overkillFreeze * 0.6) : 0,
    danger: state === 'play' ? VIS.danger * (reduceFx() ? 0.5 : (0.75 + 0.25 * Math.sin(t * 8))) : 0,
    dilate, fade: VIS.fade
  });
}
