/* =========================================================
   GOULU — gameplay « cosmos » (0.20)
   ---------------------------------------------------------
   • Masse et disque d'accrétion (0.22) : tout ce qui tombe ajoute de la masse,
     antimatière comprise ; un trou noir stellaire ne maigrit jamais (son
     évaporation de Hawking prendrait ~10⁷⁰ ans). Jeûner éteint le disque.
     Limite d'Eddington sur le débit d'accrétion, pas sur la masse.
   • Spin de Kerr (0.23) : l'accrétion fait tourner le trou (Bardeen), dans le sens
     du disque ; l'efficacité η(a*) fixe les points ; l'onde est un jet de
     Blandford-Znajek qui puise dans l'énergie de rotation ; la fronde qui
     traverse l'ergosphère vole de l'énergie (processus de Penrose).
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
const MASS_MIN = 0.6, MASS_MAX = 1.8;
const ORBIT_MAX = 8;
const STAR_FIRST = 38, STAR_EVERY = 45;
const QUASAR_HOLD = 4;
const TIDAL_TIME = 2.2;
let bhMass = 1, tier = 0, starTimer = STAR_FIRST, quasarHold = 0, orbiters = [];
let ringEatN = 0, ringEatT = 0, discWarned = false, dropShown = 0, dropOn = false;
let runTde = 0, runOrbitEaten = 0, accRate = 0, xrbT = 0, xrbA = 0, mqT = 0, bbhT = 0;
let bhSpin = 0, discJ = 0, spinWarned = 0, runJetE = 0, runPenrose = 0;

function cosmosReset(){
  bhMass = 1; tier = 0; starTimer = STAR_FIRST; endgameReset(); quasarHold = 0; orbiters = [];
  ringEatN = 0; ringEatT = 0; discWarned = false; dropShown = 0; dropOn = false;
  runTde = 0; runOrbitEaten = 0; accRate = 0; xrbT = 0; xrbA = 0; mqT = 0; bbhT = 0;
  bhSpin = 0; discJ = 0; spinWarned = 0; runJetE = 0; runPenrose = 0;
}
function cosmosOn(){ return !currentCampaignLevel; }
function seenOnce(key){
  if(!profile.seen) profile.seen = {};
  if(profile.seen[key]) return false;
  profile.seen[key] = true; saveP(); return true;
}

/* ---------- masse et disque d'accrétion ---------- */
/* bhMass : masse relative au départ de la partie (masse réelle en M☉ : realMass(), birth.js). */
function massR(){ return Math.pow(bhMass, 0.35); }            // rayon de jeu ∝ M^0,35 (licence de jeu : le vrai Rs ∝ M, affiché en km)
function massPull(){ return bhMass > 1 ? Math.pow(bhMass, 0.5) : 1; }
/* Débit d'accrétion Ṁ : poussières avalées par seconde, lissé sur le temps visqueux du disque.
   Limite d'Eddington : Ṁ_Edd ∝ M (L_Edd = 1,26×10³¹ W par M☉). λ = Ṁ / Ṁ_Edd. */
const ACC_TAU = 3, EDD_RATE = 2.4;
function eddRatio(){ return accRate / (EDD_RATE * Math.max(bhMass, MASS_MIN)); }
/* Au-delà de λ = 1, la pression de radiation souffle la matière (0 → 1 entre λ = 1 et 2). */
function eddK(){ return clamp(eddRatio() - 1, 0, 1); }
/* Points : un disque brillant près de la limite d'Eddington (L = η Ṁ c²) rapporte jusqu'à +10 %,
   rien de plus au-delà ; la croissance depuis la naissance aussi (Bondi : Ṁ ∝ M²).
   Un disque éteint ne rapporte pas de bonus. Par paliers de 0,1 (lisible, stable). */
function cosmosScore(){
  const l = Math.round(Math.min(eddRatio(), 1) * 10) / 10, m = Math.round(bhMass / birthStart() * 10) / 10;
  return (1 + 0.2 * Math.max(0, l - 0.5)) * (1 + 0.15 * (m - 1)) * etaK();
}
/* ---------- spin de Kerr ---------- */
/* bhSpin : a* signé, + dans le sens des orbites (antihoraire à l'écran). discJ ∈ [−1, 1] : moment
   cinétique moyen de la matière qui arrive (cohérence et sens du disque). */
const SPIN_MAX = 0.998;                     // limite de Thorne : le disque capture des photons qui freinent le trou
const ETA0 = 0.0572, ETA_MAX = 0.321;       // η(0) et η(0,998)
function discSense(){ return discJ >= 0 ? 1 : -1; }
function spinRel(){ return bhSpin * discSense(); }        // > 0 : disque prograde, < 0 : rétrograde
function etaNow(){ return PHY.eta(spinRel()); }
/* Points ∝ efficacité radiative : ×1 sans rotation, ×1,6 à la limite de Thorne (licence de jeu : ×5,6 en vrai),
   un peu moins en rétrograde. Par paliers de 0,05. */
function etaK(){ return Math.round(Math.max(0.9, 1 + 0.6 * (etaNow() - ETA0) / (ETA_MAX - ETA0)) * 20) / 20; }
/* Puissance des jets de Blandford-Znajek ∝ a*² : portée de l'onde ×0,92 → ×1,22 (le disque lance aussi des vents). */
function jetK(){ return cosmosOn() ? 0.92 + 0.3 * bhSpin * bhSpin : 1; }
/* Sens de la matière avalée : + si elle tourne dans le sens des orbites (l'anneau en orbite : 1). */
function infallJ(e){
  if(!e) return 0;
  if(e.orbit) return 1;
  const dx = e.x - bh.x, dy = e.y - bh.y, n = Math.hypot(dx, dy) * Math.hypot(e.vx || 0, e.vy || 0);
  return n > 1e-6 ? clamp(-(dx * (e.vy || 0) - dy * (e.vx || 0)) / n, -1, 1) : 0;
}
/* La matière qui tombe apporte son moment cinétique (Bardeen) : dln M → da*. */
function spinAccrete(dlnM, e){
  discJ += (infallJ(e) - discJ) * 0.12;
  const a = clamp(bhSpin + PHY.spinRate(bhSpin, discJ) * dlnM, -SPIN_MAX, SPIN_MAX);
  if(spinWarned < 1 && spinRel() < -0.2 && Math.abs(discJ) > 0.3){ spinWarned = 1; addToast('DISQUE RÉTROGRADE · il tourne à contre-sens, ton spin ralentit', '#c99cff', H/2 + 70); }
  if(Math.abs(a) >= 0.9 && Math.abs(bhSpin) < 0.9 && spinWarned < 2){ spinWarned = 2; addToast('SPIN 0,9 · efficacité ' + PHY.num(PHY.eta(0.9) * 100, 0) + ' % · jets puissants', '#9fd4ff', H/2 + 70); thoughtOnce('spin', 'Je tourne si vite que l\'espace tourne avec moi.'); }
  bhSpin = a;
}
/* Extraction d'énergie de rotation (jet, Penrose) : la masse irréductible ne bouge pas, M et a* baissent. */
function extractRot(frac){
  const a = Math.abs(bhSpin); if(a < 0.02) return 0;
  const mIrr = bhMass * PHY.irrK(a), m = Math.max(mIrr, bhMass * (1 - frac));
  const a2 = PHY.spinAfter(mIrr, m), dm = bhMass - m;
  bhMass = m; bhSpin = Math.sign(bhSpin) * a2;
  return dm;
}
/* Une onde = un jet : énergie ∝ a*² (≈ 1,6 % de l'énergie de rotation par onde, a* baisse d'environ 0,8 %). */
function jetFired(){
  if(!cosmosOn()) return;
  const a2 = bhSpin * bhSpin;
  runJetE += extractRot(0.002 * a2);
  if(a2 > 0.3) aliveJet(0.5 * a2);
  if(a2 > 0.25 && seenOnce('jetbz')) addToast('JET · ton onde puise dans ta rotation (Blandford-Znajek)', '#9fd4ff', H/2 + 70);
}
/* Ergosphère : entre l'horizon (r₊) et 2 GM/c² à l'équateur. Ici l'horizon est bh.r. */
function ergoR(){ return bh.r * 2 / PHY.horizonRg(Math.abs(bhSpin)); }
/* Processus de Penrose : la fronde qui frôle l'ergosphère repart plus vite, le trou perd de la rotation. */
function penroseCheck(e, d){
  if(e.kind !== 'sling' || e.penrose || !cosmosOn() || Math.abs(bhSpin) < 0.3) return;
  if(d - e.r > ergoR() || d < bh.r + e.r * 0.5) return;
  e.penrose = true; runPenrose++;
  e.vx *= 1.4; e.vy *= 1.4;
  extractRot(0.004);
  burst(e.x, e.y, '#c99cff', 12, 300);
  if(seenOnce('penrose')) addToast('PROCESSUS DE PENROSE · la fronde vole ton énergie de rotation', '#c99cff', H/2 + 110);
}
function massGain(dustType, e){
  if(!cosmosOn()) return;
  accRate += 1 / ACC_TAU;
  const g = { gold:0.0035, blue:0.006, red:0.0045, white:0.0045 }[dustType] || 0.0035;
  /* la masse gagnée est l'énergie qui reste (1 − η) : un trou qui tourne vite rayonne plus et grossit moins */
  const dm = g / Math.max(1, eddRatio()) * (1 - etaNow()) / (1 - ETA0);
  spinAccrete(dm / bhMass, e);                       // le spin suit la matière, même au plafond de masse (licence de jeu)
  bhMass = Math.min(MASS_MAX, bhMass + dm);
}
/* L'antimatière s'annihile avec la matière du disque : l'éclair gamma le souffle (vie perdue).
   Ce qui tombe dans le trou, lui, a une masse positive (ALPHA-g, CERN, 2023) : la masse monte un peu. */
function massHit(){
  if(!cosmosOn()) return;
  accRate = 0;
  bhMass = Math.min(MASS_MAX, bhMass + 0.003);
  if(seenOnce('annihil')) addToast('ANNIHILATION · ton disque est soufflé (ta masse, elle, monte)', '#ff8aa0', H/2 + 70);
}

/* ---------- paliers ---------- */
function tierClock(){
  if(currentCampaignLevel || currentMode.duration > 0) return -1;
  if(currentMode.useWaves) return waveIndex === WAVES.length - 1 ? waveTimer + 60 : -1;
  return elapsed;
}
function tierName(n){ return n <= TIER_NAMES.length ? TIER_NAMES[n - 1] : TIER_NAMES[TIER_NAMES.length - 1] + ' +' + (n - TIER_NAMES.length); }
function tierSpeed(){ return tier > 1 ? 1 + 0.07 * (tier - 1) : 1; }
function tierSpawn(){ return tier > 1 ? 1 + 0.1 * (tier - 1) : 1; }
function tierScore(){ return tier > 1 ? 1 + 0.1 * (tier - 1) : 1; }
function tierUp(n){
  if(sgr || state === 'merge') return;   // pendant Sagittarius A*, on reste au palier 10
  tier = n;
  if(n > (profile.bestTier || 0)){ profile.bestTier = n; saveP(); }
  if(n === SGR_TIER){ endgameTier(n); return; }
  waveNumEl.textContent = 'PALIER ' + n + ' · ' + PHY.age(phaseAge(n, 0));
  waveNameEl.textContent = tierName(n);
  const ph = PHASES[n];
  if(waveLoreEl) waveLoreEl.textContent = (ph ? ph.lore + '\n' : '') + (n > 1 ? 'Antimatière +' + Math.round((tierSpeed() - 1) * 100) + ' % · points ×' + tierScore().toFixed(1).replace('.', ',') : 'Chaque minute, une nouvelle phase : plus dure, plus payante.');
  phaseEnter(n);
  waveBannerEl.classList.add('on'); waveBannerTimer = 3;
  addToast('PALIER ' + n + ' · ' + tierName(n), '#ffd36b', H/2 - 150);
  shake = Math.max(shake, 12);
  if(actx && !audioMuted) [392, 523.25, 659.25, 784].forEach((f, i) => blip(f, 0.3, 'triangle', 0.1, undefined, i * 0.08));
  endgameTier(n);
}

/* ---------- phases de la vie du trou noir (PHASES, data.js) ---------- */
/* Âge réel au début (k = 0) ou à la fin (k = 1) de la phase n, en années (échelle logarithmique). */
function phaseAge(n, k){
  const p = PHASES[Math.min(Math.max(n, 0), PHASES.length - 1)];
  return Math.pow(10, Math.log10(p.age[0]) + (Math.log10(p.age[1]) - Math.log10(p.age[0])) * clamp(k, 0, 1));
}
function phaseId(){ return cosmosOn() && tier > 0 && tier < PHASES.length ? PHASES[tier].id : null; }
/* < 1 : poussière plus fréquente. Retombée : dense puis de moins en moins (∝ t^−5/3) ; vagabond : milieu clairsemé. */
function phaseDustK(){
  const p = phaseId();
  if(p === 'fallback') return 0.6 + 0.4 * clamp((tierClock() - 60) / 60, 0, 1);
  if(p === 'rogue') return 1.25;
  return 1;
}
function phaseEnter(n){
  const p = PHASES[n] ? PHASES[n].id : null;
  if(p === 'xrb'){ xrbA = rng() * Math.PI * 2; xrbT = 1.5; }
  else if(p === 'tde') starTimer = Math.min(starTimer, 3);
  else if(p === 'microquasar') mqT = 0;
  else if(p === 'bbh') bbhT = 1;
}
/* Point d'où la compagne de la binaire X déverse sa matière (bord de l'écran). */
function xrbPoint(){
  const R = Math.hypot(W, H) * 0.5 + 10;
  return { x:clamp(bh.x + Math.cos(xrbA) * R, -10, W + 10), y:clamp(bh.y + Math.sin(xrbA) * R, -10, H + 10) };
}
function phaseTick(gdt){
  const p = phaseId();
  if(p === 'xrb'){   // débordement du lobe de Roche : un flux continu, qui arrive de biais (moment cinétique)
    xrbT -= gdt;
    if(xrbT <= 0 && entities.length < ENTITY_CAP){
      xrbT = 0.75;
      const q = xrbPoint(), a = Math.atan2(bh.y - q.y, bh.x - q.x) + 0.35, sp = 60 * PHYS;
      entities.push({ x:q.x, y:q.y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, r:R_DUST, type:'dust', dustType:'gold', phase:rng() * Math.PI * 2, trail:[] });
    }
  } else if(p === 'microquasar'){   // état dur (jets) 6 s, état mou 6 s
    mqT += gdt;
    if(mqT % 12 < 6) aliveJet(0.45);
  } else if(p === 'bbh'){   // le compagnon invisible émet des ondes gravitationnelles
    bbhT -= gdt;
    if(bbhT <= 0){
      bbhT = 4.5;
      const a = elapsed * 0.8, R = Math.min(W, H) * 0.42;
      gwRipples.push({ x:bh.x + Math.cos(a) * R * 0.5, y:bh.y + Math.sin(a) * R * 0.5, r:0, a:0.8 });
    }
  }
}

/* ---------- nouvelles menaces ---------- */
function pickAntiKind(){
  if(currentCampaignLevel) return null;
  const r = rng();
  if(heavyEvent() && r < 0.3) return 'neutron';
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
  if(swarmEvent() && kind !== 'comet'){   // essaim : deux de plus, juste à côté
    const e = entities[entities.length - 1];
    for(let k = 0; k < 2 && entities.length < ENTITY_CAP; k++) spawnEntity('anti', e.x + (k ? 28 : -28), e.y + (k ? -22 : 22));
  }
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
  const pts = Math.round((300 + 25 * n) * mulK(multiplier * scoreK(false)));
  addScore(pts);
  bhMass = Math.min(MASS_MAX, bhMass + 0.06); accRate += 4;   // la moitié de l'étoile reste liée ; éclair au-delà d'Eddington
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
  if(ringEatN >= 4){   // bonus à partir de la 4e poussière avalée d'affilée, plus fort pour l'anneau complet
    const pts = Math.round((ringEatN === ORBIT_MAX ? 120 : 30) * mulK(multiplier * scoreK(true)));
    addScore(pts);
    if(ringEatN === 4 || ringEatN === ORBIT_MAX) addToast('◎ ANNEAU AVALÉ ×' + ringEatN + ' · +' + pts, '#ffcb4d', H/2 - 70, 'ring');
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
      addScore(10 * mulK(multiplier * scoreK(false)));
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
    if(e.type === 'anti'){ e.dead = true; n++; burst(e.x, e.y, '#bfe6ff', 14, 360); addScore(15 * mulK(multiplier * scoreK(false))); }
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
    e.dead = true; burst(e.x, e.y, '#ff5c2d', 14, 380); addScore(12 * mulK(multiplier * scoreK(false)));
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

  /* disque d'accrétion : sans matière, il se vide en quelques temps visqueux et s'éteint */
  if(cosmosOn()){
    accRate *= Math.exp(-gdt / ACC_TAU);
    const lam = eddRatio();
    if(lam < 0.12 && elapsed > 10){
      if(!discWarned){ discWarned = true; addToast('DISQUE ÉTEINT · mange pour le rallumer', '#9fd4ff', H/2 + 70); thoughtOnce('disc', 'Mon disque s\'éteint. Il me faut de la matière.'); }
    } else if(lam > 0.5) discWarned = false;
    birthTick(gdt);
    phaseTick(gdt);
    /* l'anneau rapporte en continu */
    if(orbiters.length) addScore(orbiters.length * 0.6 * mulK(multiplier * scoreK(true)) * gdt);
    /* au-delà d'Eddington : la pression de radiation repousse la poussière proche */
    const ek = eddK();
    if(ek > 0.1){
      if(!eddWarned){ eddWarned = true; addToast('LIMITE D\'EDDINGTON · tu avales trop vite, ta lumière souffle la matière', '#ffcb4d', H/2 + 70); }
      for(const e of entities){
        if(e.type !== 'dust' || e.orbit || e.dead) continue;
        const dx = e.x - bh.x, dy = e.y - bh.y, d = Math.hypot(dx, dy) || 1;
        if(d < 220 * PHYS){ const f = 260 * PHYS * ek * gdt; e.vx += dx / d * f; e.vy += dy / d * f; }
      }
    } else if(eddRatio() < 0.8) eddWarned = false;
  }

  /* paliers */
  const clk = tierClock();
  if(clk >= 0){ const n = Math.floor(clk / 60); if(n > tier) tierUp(n); }

  /* étoile de passage */
  if(cosmosOn() && !boss && !sgr){
    starTimer -= gdt;
    if(starTimer <= 0){
      starTimer = starEvery() + rng() * 15;
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
  endgameTick(gdt);
}
