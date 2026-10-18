/* =========================================================
   GOULU — le Pulsar : boss de rythme
   ---------------------------------------------------------
   Une étoile à neutrons orbite autour du trou noir et balaie l'espace d'un
   faisceau, comme un phare. Le faisceau passe sur le trou noir pile sur un
   battement de la musique (tous les 4 battements, 2 quand il est aspiré près).
   - ONDE pendant le passage : le faisceau est renvoyé, le Pulsar perd 1 PV
     (2 s'il est aspiré près de toi). Le renvoi ne coûte pas de charge.
   - Rien pendant le passage : le faisceau te traverse, tu perds une vie.
   - Les ondes de choc ordinaires ne lui font rien : seul le renvoi compte.
   - Enragé (mi-vie) : deux faisceaux opposés, rotation inversée.
   ========================================================= */
const PULSAR_WINDOW = 0.17;          // s de part et d'autre du passage du faisceau
const PULSAR_CLOSE = 0.6;            // fraction d'aspiration à partir de laquelle il est « près »

function isPulsar(){ return !!boss && boss.type.id === 'pulsar'; }
function frac(v){ return ((v % 1) + 1) % 1; }
function pulsarMinR(){ return bh.r + 95 * Math.max(0.75, PHYS); }
function pulsarOffsets(){ return boss && boss.enraged ? [0, 0.5] : [0]; }
function pulsarCloseness(e){ return clamp01((e.orbitR0 - e.orbitR) / Math.max(1, e.orbitR0 - pulsarMinR())); }
function pulsarIsClose(e){ return pulsarCloseness(e) >= PULSAR_CLOSE; }
function pulsarBeats(e){ return pulsarIsClose(e) ? 2 : 4; }
function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }

function makePulsar(){
  const a = rng() * Math.PI * 2;
  const R = Math.min(250, Math.min(W, H) * 0.42);
  return { x:bh.x + Math.cos(a) * R, y:bh.y + Math.sin(a) * R, vx:0, vy:0, r:20, type:'boss', bossPart:true, isMain:true,
    pulsar:true, phase:0, orbitA:a, orbitR:R, orbitR0:R, beamPhase:0.55, cyc:2.4,
    beams:[{ armed:false, reflected:false }, { armed:false, reflected:false }], reflectFlash:0, trail:[] };
}

/* Angle absolu d'un faisceau : à frac = 0 il pointe exactement sur le trou noir. */
function pulsarBeamAngle(e, off){
  const toBh = Math.atan2(bh.y - e.y, bh.x - e.x);
  return toBh + (boss && boss.enraged ? -1 : 1) * Math.PI * 2 * frac(e.beamPhase + off);
}
function pulsarInWindow(e, off){
  const f = frac(e.beamPhase + off), w = PULSAR_WINDOW / e.cyc;
  return f < w || f > 1 - w;
}

function updatePulsar(e, gdt){
  e.orbitA += gdt * 0.22 * (boss.enraged ? -1.4 : 1);
  if(attract) e.orbitR = Math.max(pulsarMinR(), e.orbitR - gdt * 55 * PHYS);
  else e.orbitR = Math.min(e.orbitR0, e.orbitR + gdt * 25 * PHYS);
  e.x = bh.x + Math.cos(e.orbitA) * e.orbitR;
  e.y = bh.y + Math.sin(e.orbitA) * e.orbitR;
  if(e.reflectFlash > 0) e.reflectFlash = Math.max(0, e.reflectFlash - gdt);

  /* Phase du faisceau calée en douceur sur le battement : un passage = un battement. */
  const bi = beatInfo(), N = pulsarBeats(e);
  e.cyc = N * bi.len;
  let ph = e.beamPhase + gdt / e.cyc;
  const slot = Math.floor(ph * N);
  let d = (slot + bi.phase) / N - ph;
  if(d > 0.5 / N) d -= 1 / N; else if(d < -0.5 / N) d += 1 / N;
  ph += d * Math.min(1, gdt * 3);
  e.beamPhase = frac(ph);

  const offs = pulsarOffsets();
  for(let k = 0; k < offs.length; k++){
    const st = e.beams[k];
    if(pulsarInWindow(e, offs[k])) st.armed = true;
    else if(st.armed){
      const missed = !st.reflected;
      st.armed = false; st.reflected = false;
      if(missed){ pulsarStrike(e); if(state !== 'play' || !boss) return; }
    }
  }
}

/* Le faisceau traverse le trou noir. */
function pulsarStrike(e){
  const a = Math.atan2(e.y - bh.y, e.x - bh.x);
  burst(bh.x + Math.cos(a) * bh.r, bh.y + Math.sin(a) * bh.r, '#bfe6ff', 24, 520);
  hitAnti({ x:bh.x + Math.cos(a) * bh.r, y:bh.y + Math.sin(a) * bh.r, pulsarBeam:true });
}

/* Appelé par l'ONDE : renvoie chaque faisceau en train de passer. */
function pulsarTryReflect(){
  if(!isPulsar()) return false;
  const e = boss.parts[0]; if(!e) return false;
  const offs = pulsarOffsets();
  let hit = 0;
  for(let k = 0; k < offs.length; k++){
    const st = e.beams[k];
    if(st.reflected || !pulsarInWindow(e, offs[k])) continue;
    st.reflected = true; st.armed = true; hit++;
  }
  if(!hit) return false;
  const dmg = (pulsarIsClose(e) ? 2 : 1) * hit;
  e.reflectFlash = 0.35;
  combo++; comboTimer = comboWindow(); if(combo > maxCombo) maxCombo = combo;
  doParry(e, 1.5, 'boss', false);
  registerPulse();
  addToast(dmg > 1 ? 'RENVOI ×' + dmg + ' !' : 'RENVOYÉ !', '#bfe6ff', H/2 - 40);
  if(actx && !audioMuted){ blip(1320, 0.25, 'sine', 0.14, 2640); blip(660, 0.3, 'triangle', 0.1, undefined, 0.05); }
  damageBoss(dmg, e.x, e.y);
  return true;
}

/* ---------- rendu ---------- */
function drawPulsar(e, t){
  const offs = pulsarOffsets();
  const L = Math.hypot(W, H) * 1.2;
  sctx.save();
  sctx.globalCompositeOperation = 'lighter';
  for(const off of offs){
    const a = pulsarBeamAngle(e, off);
    sctx.save(); sctx.translate(e.x, e.y); sctx.rotate(a);
    const g = sctx.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, 'rgba(225,245,255,.85)'); g.addColorStop(0.35, 'rgba(160,215,255,.35)'); g.addColorStop(1, 'rgba(120,190,255,0)');
    sctx.fillStyle = g;
    sctx.beginPath(); sctx.moveTo(0, -4); sctx.lineTo(L, -26); sctx.lineTo(L, 26); sctx.lineTo(0, 4); sctx.closePath(); sctx.fill();
    sctx.fillStyle = 'rgba(255,255,255,.7)';
    sctx.beginPath(); sctx.moveTo(0, -1.2); sctx.lineTo(L * 0.6, -3); sctx.lineTo(L * 0.6, 3); sctx.lineTo(0, 1.2); sctx.closePath(); sctx.fill();
    sctx.restore();
  }
  if(e.reflectFlash > 0){
    const k = e.reflectFlash / 0.35;
    sctx.strokeStyle = 'rgba(255,220,140,' + k.toFixed(2) + ')'; sctx.lineWidth = 10 * k + 2;
    sctx.beginPath(); sctx.moveTo(bh.x, bh.y); sctx.lineTo(e.x, e.y); sctx.stroke();
  }
  const R3 = e.r * 4;
  sctx.drawImage(glowSprite('pulsar', [[0, 'rgba(240,250,255,1)'], [0.2, 'rgba(150,210,255,.8)'], [1, 'rgba(60,120,255,0)']], R3), e.x - R3, e.y - R3, R3 * 2, R3 * 2);
  sctx.globalCompositeOperation = 'source-over';
  sctx.translate(e.x, e.y);
  const flash = boss && boss.hitFlash > 0 ? boss.hitFlash / 0.18 : 0;
  sctx.beginPath(); sctx.arc(0, 0, e.r * 0.62, 0, Math.PI * 2);
  sctx.fillStyle = flash > 0 ? '#ffffff' : '#e8f6ff'; sctx.fill();
  sctx.rotate(t * 7);
  sctx.strokeStyle = 'rgba(200,235,255,.9)'; sctx.lineWidth = 2;
  sctx.beginPath(); sctx.moveTo(-e.r * 1.4, 0); sctx.lineTo(e.r * 1.4, 0); sctx.stroke();
  if(boss && boss.enraged){
    sctx.lineWidth = 3; sctx.strokeStyle = 'rgba(255,60,60,' + (0.45 + 0.4 * Math.sin(t * 12)).toFixed(2) + ')';
    sctx.beginPath(); sctx.arc(0, 0, e.r * 1.25, 0, Math.PI * 2); sctx.stroke();
  }
  sctx.restore();
}

/* Repère non déformé : le passage du faisceau est annoncé un battement à l'avance. */
function drawPulsarWarnings(t){
  if(!isPulsar() || state !== 'play') return;
  const e = boss.parts[0]; if(!e) return;
  const offs = pulsarOffsets();
  let soon = 0, now = false;
  for(const off of offs){
    const f = frac(e.beamPhase + off), tt = (f > 0.5 ? 1 - f : -f) * e.cyc;   // s avant le passage
    if(pulsarInWindow(e, off)) now = true;
    else if(tt > 0 && tt < e.cyc / pulsarBeats(e) * 1.1) soon = Math.max(soon, 1 - tt / (e.cyc / pulsarBeats(e) * 1.1));
  }
  if(!soon && !now) return;
  ctx.save();
  const a = now ? 0.95 : 0.25 + 0.55 * soon;
  ctx.setLineDash(now ? [] : [6, 6]);
  ctx.strokeStyle = 'rgba(190,230,255,' + a.toFixed(2) + ')'; ctx.lineWidth = now ? 2.5 : 1.4;
  ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(bh.x, bh.y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = now ? 'rgba(255,226,140,.95)' : 'rgba(190,230,255,' + (0.6 * soon).toFixed(2) + ')';
  ctx.lineWidth = now ? 3 : 1.6;
  ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.r + 20 + (now ? Math.sin(t * 30) * 2 : (1 - soon) * 30), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
