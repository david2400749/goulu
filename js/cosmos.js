/* =========================================================
   GOULU — gameplay « cosmos » (0.20)
   ---------------------------------------------------------
   • Masse et évaporation de Hawking : le trou grossit en mangeant et maigrit
     sinon, d'autant plus vite qu'il est petit (dM/dt ∝ -1/M²). Gros = attire plus
     fort et rapporte plus, mais se fait toucher plus facilement.
   • Orbites : relâcher près du trou met la poussière en orbite ; l'anneau rapporte
     en continu, protège (une antimatière qui le touche est annihilée) et, avalé
     d'un coup, donne un gros bonus.
   • Étoile déchirée : une étoile passe ; aspirée assez longtemps, les forces de
     marée la disloquent et l'éclair pulvérise l'antimatière.
   • Nouvelles menaces : comète (annoncée par une ligne), étoile à neutrons (deux
     ondes), fronde (elle se sert de ta gravité pour accélérer).
   • Paliers de la partie infinie : un toutes les 60 s, plus dur et plus payant.
   • Fusions de mutations (effets appliqués ici et dans update.js).
   • Le Trou Blanc (boss) et le « drop » de la musique (pulses comptés double).
   ========================================================= */
const MASS_MIN = 0.6, MASS_MAX = 1.8, MASS_DECAY = 0.0065;
const ORBIT_MAX = 8;
const STAR_FIRST = 38, STAR_EVERY = 45;
const QUASAR_HOLD = 4;
const TIDAL_TIME = 2.2;
let bhMass = 1, tier = 0, starTimer = STAR_FIRST, quasarHold = 0, orbiters = [];
let ringEatN = 0, ringEatT = 0, evapWarned = false, dropShown = 0, dropOn = false, hawkT = 0;
let runTde = 0, runOrbitEaten = 0;

function cosmosReset(){
  bhMass = 1; tier = 0; starTimer = STAR_FIRST; quasarHold = 0; orbiters = [];
  ringEatN = 0; ringEatT = 0; evapWarned = false; dropShown = 0; dropOn = false; hawkT = 0;
  runTde = 0; runOrbitEaten = 0;
}
function cosmosOn(){ return !currentCampaignLevel; }
function seenOnce(key){
  if(!profile.seen) profile.seen = {};
  if(profile.seen[key]) return false;
  profile.seen[key] = true; saveP(); return true;
}

/* ---------- masse ---------- */
function massR(){ return Math.pow(bhMass, 0.35); }            // rayon de jeu ∝ M^0,35 (jouable), pas ∝ M
function massPull(){ return bhMass > 1 ? Math.pow(bhMass, 0.5) : 1; }   // maigrir n'affaiblit pas l'attraction : pas de spirale perdante
function massScore(){ return 0.6 + 0.4 * Math.round(bhMass * 10) / 10; }   // par paliers de 0,1 : lisible, stable
function massGain(dustType){
  if(!cosmosOn()) return;
  const g = { gold:0.008, blue:0.014, red:0.01, white:0.01 }[dustType] || 0.008;
  bhMass = Math.min(MASS_MAX, bhMass + g);
}
function massHit(){ if(cosmosOn()) bhMass = Math.max(MASS_MIN, bhMass - 0.12); }

/* ---------- paliers ---------- */
function tierClock(){
  if(currentCampaignLevel || currentMode.duration > 0) return -1;
  if(currentMode.useWaves) return waveIndex === WAVES.length - 1 ? waveTimer + 60 : -1;
  return elapsed;
}
function tierName(n){ return n <= TIER_NAMES.length ? TIER_NAMES[n - 1] : TIER_NAMES[TIER_NAMES.length - 1] + ' +' + (n - TIER_NAMES.length); }
function tierSpeed(){ return tier > 1 ? 1 + 0.07 * (tier - 1) : 1; }
function tierSpawn(){ return tier > 1 ? 1 + 0.1 * (tier - 1) : 1; }
function tierScore(){ return tier > 1 ? 1 + 0.2 * (tier - 1) : 1; }
function tierUp(n){
  tier = n;
  if(n > (profile.bestTier || 0)){ profile.bestTier = n; saveP(); }
  waveNumEl.textContent = 'PALIER ' + n;
  waveNameEl.textContent = tierName(n);
  if(waveLoreEl) waveLoreEl.textContent = n > 1 ? 'Antimatière +' + Math.round((tierSpeed() - 1) * 100) + ' % · points ×' + tierScore().toFixed(1).replace('.', ',') : 'Chaque minute, un palier : plus dur, plus payant.';
  waveBannerEl.classList.add('on'); waveBannerTimer = 3;
  addToast('PALIER ' + n + ' · ' + tierName(n), '#ffd36b', H/2 - 150);
  shake = Math.max(shake, 12);
  if(actx && !audioMuted) [392, 523.25, 659.25, 784].forEach((f, i) => blip(f, 0.3, 'triangle', 0.1, undefined, i * 0.08));
}

/* ---------- nouvelles menaces ---------- */
function pickAntiKind(){
  if(currentCampaignLevel) return null;
  const r = rng();
  if(elapsed > 35 && r < 0.10) return 'comet';
  if(elapsed > 50 && r < 0.18) return 'neutron';
  if(elapsed > 22 && r < 0.28) return 'sling';
  return null;
}
const KIND_INTRO = {
  comet:   ['☄ COMÈTE · une ligne l\'annonce', '#9fe8ff'],
  neutron: ['◉ ÉTOILE À NEUTRONS · deux ondes', '#cfe3ff'],
  sling:   ['↺ FRONDE · elle se sert de ta gravité', '#c99cff']
};
function spawnAnti(){
  const kind = pickAntiKind();
  if(kind === 'comet'){ spawnComet(); }
  else {
    spawnEntity('anti');
    const e = entities[entities.length - 1];
    if(kind === 'neutron'){ e.kind = 'neutron'; e.hp = 2; e.r = 11; }
    else if(kind === 'sling'){
      e.kind = 'sling';
      const a = Math.atan2(bh.y - e.y, bh.x - e.x) + (rng() < 0.5 ? 1 : -1) * 1.15;
      const sp = 115 * PHYS; e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp;
    }
  }
  if(kind && seenOnce('kind_' + kind)) addToast(KIND_INTRO[kind][0], KIND_INTRO[kind][1], H/2 + 110);
}
function spawnComet(){
  const p = edgePoint();
  entities.push({ x:p.x, y:p.y, vx:0, vy:0, r:10, type:'anti', kind:'comet', warnT:1.1, phase:rng() * Math.PI * 2, trail:[] });
}
/* Comète : immobile pendant l'avertissement, puis fonce en ligne droite (la gravité la courbe quand on aspire). */
function updateComet(e, gdt){
  if(e.warnT > 0){
    e.warnT -= gdt;
    if(e.warnT <= 0){
      const a = Math.atan2(bh.y - e.y, bh.x - e.x), sp = 430 * PHYS * tierSpeed();
      e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp;
      if(actx && !audioMuted) blip(1400, 0.25, 'sawtooth', 0.05, 300);
    }
    return;
  }
  if(attract){
    const dx = bh.x - e.x, dy = bh.y - e.y, d = Math.max(Math.hypot(dx, dy), MIN_D * PHYS);
    const f = ATTRACT_F * PHYS * PHYS * mods.attractMult * massPull() / d;
    e.vx += dx / d * f * gdt * 0.5; e.vy += dy / d * f * gdt * 0.5;
  }
  e.x += e.vx * gdt; e.y += e.vy * gdt;
}
/* Étoile à neutrons touchée par une onde alors qu'il lui reste plus d'1 PV : repoussée, pas détruite. */
function neutronAbsorb(e, ux, uy){
  if(e.kind !== 'neutron' || !(e.hp > 1)) return false;
  e.hp--;
  e.vx = -ux * 320 * PHYS; e.vy = -uy * 320 * PHYS;
  e.hitFlash = 0.25;
  burst(e.x, e.y, '#cfe3ff', 18, 380);
  shake = Math.max(shake, 8);
  if(actx && !audioMuted) blip(300, 0.15, 'square', 0.08, 600);
  return true;
}

/* ---------- étoile déchirée par effet de marée ---------- */
function spawnStar(){
  const p = edgePoint();
  const toC = Math.atan2(bh.y - p.y, bh.x - p.x);
  const side = rng() < 0.5 ? 1 : -1, off = Math.min(W, H) * 0.3;
  const tx = bh.x + Math.cos(toC + Math.PI / 2) * off * side, ty = bh.y + Math.sin(toC + Math.PI / 2) * off * side;
  const a = Math.atan2(ty - p.y, tx - p.x), sp = 42 * PHYS;
  entities.push({ x:p.x, y:p.y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, r:15, type:'star', tidal:0, phase:rng() * Math.PI * 2, trail:[] });
  if(seenOnce('star')) addToast('★ UNE ÉTOILE · aspire-la longtemps pour la déchirer', '#fff1b8', H/2 + 110);
  else addToast('★ ÉTOILE EN APPROCHE', '#fff1b8', H/2 + 110);
}
function updateStar(e, gdt, d, ux, uy){
  if(attract){
    const f = ATTRACT_F * PHYS * PHYS * mods.attractMult * massPull() / Math.max(d, MIN_D * PHYS) * 0.22;
    e.vx += ux * f * gdt; e.vy += uy * f * gdt;
  }
  e.x += e.vx * gdt; e.y += e.vy * gdt;
  const range = 270 * PHYS;
  if(attract && d < range) e.tidal = Math.min(1, e.tidal + gdt / TIDAL_TIME * (0.6 + 0.8 * (1 - d / range)));
  else e.tidal = Math.max(0, e.tidal - gdt * 0.3);
  if(e.tidal > 0.25 && Math.random() < gdt * 40 * e.tidal){   // filet de gaz arraché vers le trou
    particles.push({ x:e.x, y:e.y, vx:ux * 90 - uy * 40, vy:uy * 90 + ux * 40, life:1.2, maxLife:1.2, r:1.6 + Math.random() * 2, color:'#ffe9a3', sink:true });
  }
  return e.tidal >= 1 || d < bh.r + e.r;
}
function tidalDisruption(e){
  e.dead = true; runTde++;
  profile.tde = (profile.tde || 0) + 1; saveP();
  let n = 0;
  for(const o of entities){
    if(o.dead || o.type !== 'anti') continue;
    o.dead = true; n++;
    burst(o.x, o.y, '#ffe9a3', 10, 300);
  }
  if(boss && !isPulsar()) damageBoss(1, boss.parts[0] ? boss.parts[0].x : bh.x, boss.parts[0] ? boss.parts[0].y : bh.y);
  combo += n; comboTimer = comboWindow(); if(combo > maxCombo) maxCombo = combo;
  const pts = Math.round((300 + 25 * n) * multiplier * scoreK(false));
  addScore(pts);
  bhMass = Math.min(MASS_MAX, bhMass + 0.2);
  shockCharges = Math.max(shockCharges, getMaxCharges());
  for(let k = 0; k < 6 && entities.length < ENTITY_CAP; k++){
    const a = k / 6 * Math.PI * 2;
    spawnEntity('dust', e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, 'gold');
  }
  burst(e.x, e.y, '#ffffff', 70, 900); burst(e.x, e.y, '#ffcb4d', 60, 700); burst(bh.x, bh.y, '#ffe9a3', 40, 600);
  parryFlash = Math.max(parryFlash, reduceFx() ? 0.4 : 1); shake = Math.max(shake, 30);
  aliveJet(1); vibrate([50, 30, 80]);
  addToast('☄ ÉTOILE DÉCHIRÉE · +' + pts, '#fff1b8', H/2 - 120);
  thoughtOnce('tde', 'Une étoile entière. Elle criait.');
  if(actx && !audioMuted){ blip(70, 1.2, 'sawtooth', 0.2, 30); [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => blip(f, 0.5, 'triangle', 0.1, undefined, 0.1 + i * 0.07)); }
}

/* ---------- orbites ---------- */
function tryCapture(e, d){
  if(attract || e.orbit || orbiters.length >= ORBIT_MAX) return false;
  const lo = bh.r + 30 * PHYS, hi = bh.r + 105 * PHYS;
  if(d < lo || d > hi) return false;
  e.orbit = true;
  e.orbitR = Math.max(bh.r + 40 * PHYS, Math.min(bh.r + 95 * PHYS, d));
  e.orbitA = Math.atan2(e.y - bh.y, e.x - bh.x);
  orbiters.push(e);
  if(seenOnce('orbit')) addToast('◌ EN ORBITE · avale l\'anneau d\'un coup = bonus', '#ffcb4d', H/2 + 110);
  return true;
}
function updateOrbit(e, gdt){
  const om = 1.5 * Math.pow((bh.r + 60 * PHYS) / e.orbitR, 1.5);
  e.orbitA -= om * gdt;
  if(attract) e.orbitR -= 75 * PHYS * gdt;
  else e.orbitR = Math.max(e.orbitR, bh.r + 34 * PHYS);
  const nx = bh.x + Math.cos(e.orbitA) * e.orbitR, ny = bh.y + Math.sin(e.orbitA) * e.orbitR;
  e.vx = (nx - e.x) / Math.max(gdt, 1e-4); e.vy = (ny - e.y) / Math.max(gdt, 1e-4);
  e.x = nx; e.y = ny;
}
function orbitEaten(){
  runOrbitEaten++;
  if(ringEatT <= 0) ringEatN = 0;
  ringEatN++; ringEatT = 0.9;
  if(ringEatN >= 4){
    const pts = Math.round(20 * ringEatN * multiplier * scoreK(true));
    addScore(pts);
    if(ringEatN === 4 || ringEatN === ORBIT_MAX) addToast('◎ ANNEAU AVALÉ ×' + ringEatN + ' · +' + pts, '#ffcb4d', H/2 - 70);
  }
}
/* Une antimatière qui touche la poussière en orbite s'annihile avec elle. */
function orbitShield(e){
  for(const o of orbiters){
    if(o.dead) continue;
    const dx = o.x - e.x, dy = o.y - e.y, rr = e.r + o.r + 6;
    if(dx * dx + dy * dy < rr * rr){
      o.dead = true; e.dead = true;
      burst(e.x, e.y, '#ffcb4d', 16, 360); burst(e.x, e.y, '#ff2d6f', 12, 300);
      addScore(10 * multiplier * scoreK(false));
      combo++; comboTimer = comboWindow(); if(combo > maxCombo) maxCombo = combo;
      if(actx && !audioMuted) blip(760, 0.12, 'triangle', 0.08, 380);
      return true;
    }
  }
  return false;
}

/* ---------- fusions ---------- */
function fireQuasar(){
  aliveJet(1);
  const ang = -Math.PI / 2 + (-0.13 + ALIVE.look[0] * 0.14);
  const ax = Math.cos(ang), ay = Math.sin(ang);
  let n = 0;
  for(const e of entities){
    if(e.dead) continue;
    const dx = e.x - bh.x, dy = e.y - bh.y;
    if(Math.abs(dx * ay - dy * ax) > 42 * VIS_SCALE + e.r) continue;   // distance à l'axe des jets
    if(e.type === 'anti'){ e.dead = true; n++; burst(e.x, e.y, '#bfe6ff', 14, 360); addScore(15 * multiplier * scoreK(false)); }
    else if(e.bossPart && boss && !isPulsar() && e.isMain){ damageBoss(1, e.x, e.y); }
  }
  shake = Math.max(shake, 16);
  addToast(n ? '🔆 QUASAR ×' + n : '🔆 QUASAR', '#bfe6ff', H/2 - 90);
  if(actx && !audioMuted){ blip(220, 0.5, 'sawtooth', 0.12, 1760); blip(110, 0.6, 'sine', 0.14, 55); }
}
function reactionBlast(){
  const R = 260 * PHYS;
  for(const e of entities){
    if(e.dead || e.type !== 'anti') continue;
    if(Math.hypot(e.x - bh.x, e.y - bh.y) > R) continue;
    e.dead = true; burst(e.x, e.y, '#ff5c2d', 14, 380); addScore(12 * multiplier * scoreK(false));
  }
  burst(bh.x, bh.y, '#ff5c2d', 50, 650);
  addToast('☢️ RÉACTION EN CHAÎNE', '#ff8a5c', H/2 - 160);
}

/* ---------- Trou Blanc ---------- */
function spawnWhiteHole(){
  const a = rng() * Math.PI * 2, R = Math.min(240, Math.min(W, H) * 0.42);
  return { x:bh.x + Math.cos(a) * R, y:bh.y + Math.sin(a) * R, vx:0, vy:0, r:30, type:'boss', bossPart:true, isMain:true, whitehole:true,
    phase:0, shootTimer:2.2, eyeAngle:a, eyeR:R, eyeR0:R, trail:[] };
}
function updateWhiteHole(e, gdt){
  e.eyeAngle += gdt * 0.28 * (boss.enraged ? -1.3 : 1);
  if(attract) e.eyeR = Math.max(bh.r + 75 * PHYS, e.eyeR - gdt * 32 * PHYS);   // résiste plus que l'Œil
  else e.eyeR = Math.min(e.eyeR0, e.eyeR + gdt * 40 * PHYS);                  // et fuit plus vite
  e.x = bh.x + Math.cos(e.eyeAngle) * e.eyeR; e.y = bh.y + Math.sin(e.eyeAngle) * e.eyeR;
  e.shootTimer -= gdt;
  if(e.shootTimer <= 0){
    e.shootTimer = boss.enraged ? 1.5 : 2.3;
    const a = Math.atan2(bh.y - e.y, bh.x - e.x), n = boss.enraged ? 5 : 3;
    for(let k = 0; k < n && entities.length < ENTITY_CAP; k++){
      const ang = a + (k - (n - 1) / 2) * 0.32, sp = 125 * PHYS;
      entities.push({ x:e.x + Math.cos(ang) * 34, y:e.y + Math.sin(ang) * 34, vx:Math.cos(ang) * sp, vy:Math.sin(ang) * sp, r:10, type:'anti', phase:rng() * Math.PI * 2, trail:[] });
    }
    burst(e.x, e.y, '#ffffff', 16, 320);
    if(actx && !audioMuted) blip(900, 0.25, 'sine', 0.08, 300);
  }
}
/* La poussière ne peut pas entrer dans un trou blanc : elle est repoussée. */
function whiteHolePush(e, gdt){
  const w = boss.parts[0]; if(!w) return;
  const dx = e.x - w.x, dy = e.y - w.y, d = Math.hypot(dx, dy) || 1, R = 190 * PHYS;
  if(d > R) return;
  const f = 560 * PHYS * (1 - d / R);
  e.vx += dx / d * f * gdt; e.vy += dy / d * f * gdt;
}

/* ---------- drop de la musique ---------- */
function dropActive(){ return state === 'play' && musicDropActive(); }

/* ---------- une image de jeu ---------- */
function cosmosTick(gdt){
  orbiters = entities.filter(e => e.orbit && !e.dead);
  if(ringEatT > 0) ringEatT -= gdt;

  /* masse : évaporation de Hawking, plus rapide pour un petit trou */
  if(cosmosOn()){
    bhMass = Math.max(MASS_MIN, bhMass - MASS_DECAY / (bhMass * bhMass) * gdt);
    if(bhMass < 0.75){
      hawkT -= gdt;
      if(hawkT <= 0){
        hawkT = 0.05 + bhMass * 0.1;
        const a = Math.random() * Math.PI * 2;
        particles.push({ x:bh.x + Math.cos(a) * bh.r, y:bh.y + Math.sin(a) * bh.r, vx:Math.cos(a) * 120, vy:Math.sin(a) * 120, life:0.7, maxLife:0.7, r:1.4, color:'#bfe6ff' });
      }
      if(!evapWarned){ evapWarned = true; addToast('ÉVAPORATION DE HAWKING · mange !', '#bfe6ff', H/2 + 70); thoughtOnce('evap', 'Je fonds. Il me faut de la matière.'); }
    } else if(bhMass > 0.9) evapWarned = false;
    /* l'anneau rapporte en continu */
    if(orbiters.length) addScore(orbiters.length * 0.6 * multiplier * scoreK(true) * gdt);
  }

  /* paliers */
  const clk = tierClock();
  if(clk >= 0){ const n = Math.floor(clk / 60); if(n > tier) tierUp(n); }

  /* étoile de passage */
  if(cosmosOn() && !boss){
    starTimer -= gdt;
    if(starTimer <= 0){
      starTimer = STAR_EVERY + rng() * 15;
      if(!entities.some(e => e.type === 'star')) spawnStar();
    }
  }

  /* fusion Quasar */
  if(mods.quasar){
    if(attract){ quasarHold += gdt; if(quasarHold >= QUASAR_HOLD){ quasarHold = 0; fireQuasar(); } }
    else quasarHold = 0;
  }

  /* drop : annoncé deux fois par partie, ensuite seul l'anneau du kick change de couleur */
  const d = dropActive();
  if(d && !dropOn && dropShown < 2){ dropShown++; addToast('♪ DROP · pulses ×2', '#ff9cf0', H/2 + 40); }
  dropOn = d;
}
