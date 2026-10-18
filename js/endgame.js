/* =========================================================
   GOULU — fin de partie et renouvellement (0.21)
   ---------------------------------------------------------
   Une partie de 3,6 puis 32 millions de points avait montré le problème : le
   joueur devenait intouchable, il n'y avait plus de choix ni de but, et la partie
   ne finissait jamais. Ce module apporte :
   • compression des multiplicateurs de score (mulK) et affichage compact ;
   • une fin : au palier 10, Sagittarius A* (trou noir supermassif) spirale vers
     toi (r ∝ (t_c − t)^¼, comme une vraie coalescence) ; survivre = FUSION ;
   • encaisser ou continuer à chaque palier (banque d'éclats, moitié si tu meurs) ;
   • un événement cosmique par palier, un secteur de l'espace tous les 2 paliers
     (nébuleuse, astéroïdes, amas d'étoiles, magnétar) ;
   • contrats de partie choisis au menu.
   Les 8 emplacements de mutation et l'oubli d'une mutation sont dans progression.js.
   ========================================================= */
const SGR_TIER = 10, SGR_DUR = 75;
let baseMods = null;
let runBank = 0, runCashed = false, runWon = false, runComets = 0, pendingBank = 0;
let cosmicEvent = null, eventT = 0, sector = null, sectorIdx = -1, rockTimer = 0, gwRipples = [];
let sgr = null, mergeT = 0, eddWarned = false;
let contract = null, contractDone = false, contractT = 0;

function endgameReset(){
  runBank = 0; runCashed = false; runWon = false; runComets = 0; pendingBank = 0;
  cosmicEvent = null; eventT = 0; sector = null; sectorIdx = -1; rockTimer = 0; gwRipples = [];
  sgr = null; mergeT = 0; eddWarned = false;
  contract = (!currentCampaignLevel) ? pickedContract() : null; contractDone = false; contractT = 0;
  const b = $('bankScreen'); if(b) b.classList.add('hidden');
}

/* ---------- score ---------- */
/* Au-delà de ×8, les multiplicateurs (combo, chaîne, mutations, palier, masse, pulse) ne
   s'additionnent plus pleinement : ×1000 ne vaut plus que ×34 environ. */
function mulK(x){ return x <= 8 ? x : 8 * Math.pow(x / 8, 0.3); }
function fmtScore(n){
  n = Math.round(n || 0);
  if(n < 100000) return String(n);
  if(n < 1e6) return (n / 1000).toFixed(1).replace('.', ',') + ' k';
  return (n / 1e6).toFixed(n < 1e7 ? 2 : 1).replace('.', ',') + ' M';
}

/* ---------- portée : plafonds et effets d'environnement ---------- */
function parryEnvK(){ return cosmicEvent && cosmicEvent.id === 'magnetic' ? 0.7 : 1; }
function shockEnvK(){ return sector && sector.id === 'magnetar' ? 0.8 : 1; }
function darkK(){ return cosmicEvent && cosmicEvent.id === 'dark' && state !== 'menu' && state !== 'over' ? 1 : 0; }
function starEvery(){ return sector && sector.id === 'cluster' ? 12 : STAR_EVERY; }
function dustEnvK(){ return (sector && sector.id === 'nebula' ? 0.7 : 1) * phaseDustK(); }   // < 1 : poussière plus fréquente
function heavyEvent(){ return !!cosmicEvent && cosmicEvent.id === 'heavy'; }
function swarmEvent(){ return !!cosmicEvent && cosmicEvent.id === 'swarm'; }

/* ---------- paliers : événement, secteur, banque, Sagittarius A* ---------- */
function endgameTier(n){
  if(n >= 1){
    const si = Math.floor((n - 1) / 2) % SECTORS.length;
    if(si !== sectorIdx){
      sectorIdx = si; sector = SECTORS[si];
      setTimeout(() => { if(state === 'play') addToast('SECTEUR · ' + sector.name, '#9fd4ff', H/2 + 110); }, 1200);
    }
  }
  if(n === SGR_TIER){ cosmicEvent = null; startSgr(); return; }
  if(n >= 2 && !sgr){
    cosmicEvent = COSMIC_EVENTS[Math.floor(rng() * COSMIC_EVENTS.length)];
    eventT = 0;
    if(waveLoreEl) waveLoreEl.textContent = (PHASES[n] ? PHASES[n].lore + '\n' : '') + cosmicEvent.name + ' · ' + cosmicEvent.desc;
    runBank += Math.ceil((n - 1) / 2);
    if(n < SGR_TIER) pendingBank = n;
  }
}
/* appelé par update() juste après cosmosTick : ouvre l'écran « encaisser ou continuer » */
function endgamePending(){
  if(!pendingBank || state !== 'play' || anomalyScreenOpen) return false;
  openBank(pendingBank); pendingBank = 0; return true;
}
function openBank(n){
  state = 'bank'; attract = false;
  $('bankTitle').textContent = 'PALIER ' + n;
  $('bankSub').textContent = tierName(n);
  $('bankPot').textContent = runBank;
  $('bankHalf').textContent = Math.floor(runBank / 2);
  $('bankEvent').textContent = cosmicEvent ? '⚠ ' + cosmicEvent.name + ' : ' + cosmicEvent.desc : '';
  $('bankNext').textContent = n + 1 >= SGR_TIER ? 'Au palier 10 : Sagittarius A*. Survis jusqu\'à la fusion.' : 'Prochain palier : antimatière plus rapide, points ×' + (1 + 0.1 * n).toFixed(1).replace('.', ',');
  $('bankScreen').classList.remove('hidden');
  if(actx && !audioMuted) [523.25, 659.25, 783.99].forEach((f, i) => blip(f, 0.25, 'triangle', 0.09, undefined, i * 0.06));
}
function continueRun(){
  if(state !== 'bank') return;
  $('bankScreen').classList.add('hidden');
  startResume({ icon:'▶', name:'On continue · palier ' + tier });
}
function cashOut(){
  if(state !== 'bank') return;
  $('bankScreen').classList.add('hidden');
  runCashed = true; state = 'play';
  gameOver();
}

/* ---------- Sagittarius A* ---------- */
function startSgr(){
  const R0 = Math.hypot(W, H) * 0.48;
  sgr = { t:0, a:rng() * Math.PI * 2, R0, R:R0, x:0, y:0, r:44 * Math.max(0.7, PHYS), gwT:0, spawnT:2 };
  sgrPlace();
  waveNumEl.textContent = 'PALIER ' + SGR_TIER;
  waveNameEl.textContent = 'SAGITTARIUS A*';
  if(waveLoreEl) waveLoreEl.textContent = 'Un trou noir supermassif. Survis ' + SGR_DUR + ' s jusqu\'à la fusion.';
  waveBannerEl.classList.add('on'); waveBannerTimer = 4.5;
  bossNameEl.textContent = 'SAGITTARIUS A* · fusion dans ' + SGR_DUR + ' s';
  bossFillEl.style.transform = 'scaleX(1)';
  bossBarEl.classList.add('on');
  if(bossHintEl){ bossHintEl.textContent = 'Survis : il attire tout, même ta poussière'; bossHintEl.classList.remove('hidden'); }
  thoughtOnce('sgr', 'Il est immense. Il m\'appelle.');
  shake = Math.max(shake, 30); vibrate([60, 40, 90]);
  if(actx && !audioMuted){ blip(40, 2.2, 'sawtooth', 0.22, 28); blip(80, 1.6, 'sine', 0.16, 40); }
}
function sgrPlace(){
  const f = Math.max(0, 1 - sgr.t / SGR_DUR);
  sgr.R = Math.max(0, sgr.R0 * Math.pow(f, 0.25));            // coalescence : r ∝ (t_c − t)^¼
  sgr.x = bh.x + Math.cos(sgr.a) * sgr.R;
  sgr.y = bh.y + Math.sin(sgr.a) * sgr.R * 0.7;
}
function updateSgr(gdt){
  sgr.t += gdt;
  const om = Math.min(7, 0.22 * Math.pow(sgr.R0 / Math.max(sgr.R, 25), 1.5));   // la fréquence monte : « chirp »
  sgr.a += om * gdt;
  sgrPlace();
  const left = Math.max(0, SGR_DUR - sgr.t);
  const txt = 'SAGITTARIUS A* · fusion dans ' + Math.ceil(left) + ' s';
  if(bossNameEl.textContent !== txt) bossNameEl.textContent = txt;
  bossFillEl.style.transform = 'scaleX(' + (left / SGR_DUR).toFixed(3) + ')';
  /* sa gravité tire tout vers lui ; ce qui franchit son horizon disparaît */
  for(const e of entities){
    if(e.dead || e.bossPart || e.orbit) continue;
    const dx = sgr.x - e.x, dy = sgr.y - e.y, d = Math.hypot(dx, dy) || 1;
    if(d < sgr.r){ e.dead = true; burst(e.x, e.y, '#c9a6ff', 8, 240); continue; }
    const f = 60000 * PHYS * PHYS / Math.max(d, 110);
    e.vx += dx / d * f * gdt; e.vy += dy / d * f * gdt;
  }
  /* ondes gravitationnelles : à deux fois la fréquence orbitale */
  sgr.gwT -= gdt * om / Math.PI;
  if(sgr.gwT <= 0){ sgr.gwT = 1; gwRipples.push({ x:(bh.x + sgr.x) / 2, y:(bh.y + sgr.y) / 2, r:0, a:1 }); shake = Math.max(shake, 3 + 14 * (1 - left / SGR_DUR)); }
  sgr.spawnT -= gdt;
  if(sgr.spawnT <= 0){ sgr.spawnT = 2.2; if(entities.length < ENTITY_CAP) spawnAnti(); }
  if(left <= 0) mergeSgr();
}
function mergeSgr(){
  runWon = true; sgr = null;
  const pts = Math.round(25000 + 5000 * lives);
  addScore(pts);
  profile.sgrWins = (profile.sgrWins || 0) + 1; saveP();
  for(const e of entities) if(e.type === 'anti') e.dead = true;
  bossBarEl.classList.remove('on'); if(bossHintEl) bossHintEl.classList.add('hidden');
  burst(bh.x, bh.y, '#ffffff', 120, 1100); burst(bh.x, bh.y, '#c9a6ff', 90, 900);
  parryFlash = 1.2; shake = 40; aliveJet(1); vibrate([80, 40, 120, 40, 160]);
  addToast('✦ FUSION · +' + fmtScore(pts), '#ffffff', H/2 - 120);
  thought('Nous ne sommes plus qu\'un.');
  if(actx && !audioMuted){ blip(60, 0.9, 'sine', 0.25, 1600); blip(120, 1.4, 'triangle', 0.14, 2400, 0.2); }
  state = 'merge'; mergeT = 0;
}
function tickMerge(dt){
  mergeT += dt;
  bh.rTarget = 20 + mergeT * 14;
  if(mergeT > 2.4) gameOver();
}

/* ---------- astéroïdes (secteur ceinture) ---------- */
function spawnRock(){
  const p = edgePoint();
  const a = Math.atan2(bh.y - p.y, bh.x - p.x) + (rng() - 0.5) * 0.7, sp = (55 + rng() * 35) * PHYS;
  const r = 12 + rng() * 10, n = 7, shape = [];
  for(let k = 0; k < n; k++) shape.push(0.72 + rng() * 0.38);
  entities.push({ x:p.x, y:p.y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, r, type:'rock', shape, spin:(rng() - 0.5) * 2, rot:0, phase:0, trail:[] });
}
/* Rocher : dérive, la gravité du joueur l'attire un peu ; l'onde le repousse sans le détruire. */
function updateRock(e, gdt, d, ux, uy){
  if(attract){ const f = ATTRACT_F * PHYS * PHYS * mods.attractMult / Math.max(d, MIN_D * PHYS) * 0.3; e.vx += ux * f * gdt; e.vy += uy * f * gdt; }
  e.rot += e.spin * gdt;
  e.x += e.vx * gdt; e.y += e.vy * gdt;
  for(const sw of shockwaves){
    if(sw.hit.has(e) || d > sw.r + e.r) continue;
    sw.hit.add(e);
    e.vx = -ux * 300 * PHYS; e.vy = -uy * 300 * PHYS;
    burst(e.x, e.y, '#b9a993', 10, 260);
    if(actx && !audioMuted) blip(140, 0.12, 'square', 0.07, 90);
  }
}

/* ---------- contrats ---------- */
function contractOffer(){
  const r = mulberry32(((profile.contractRoll || 0) + 1) * 7919);
  const pool = CONTRACTS.slice(), out = [];
  for(let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
function pickedContract(){
  const i = profile.contractPick;
  if(typeof i !== 'number' || i < 0) return null;
  return contractOffer()[i] || null;
}
function renderContracts(){
  const box = $('contractOpts'); if(!box) return;
  const offer = contractOffer();
  box.innerHTML = '';
  offer.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'contract-opt' + (profile.contractPick === i ? ' on' : '');
    b.innerHTML = c.name + ' <b>+' + c.reward + ' ◆</b>';
    b.addEventListener('click', ev => { ev.stopPropagation(); profile.contractPick = profile.contractPick === i ? -1 : i; saveP(); renderContracts(); });
    box.appendChild(b);
  });
}
function contractTick(gdt){
  if(!contract || contractDone) return;
  contractT -= gdt; if(contractT > 0) return; contractT = 0.25;
  if(!contract.test()) return;
  contractDone = true;
  profile.shards += contract.reward; saveP();
  addToast('◇ CONTRAT RÉUSSI · +' + contract.reward + ' ◆', '#7ee7ff', H/2 + 80);
  if(actx && !audioMuted) [660, 880, 1320].forEach((f, i) => blip(f, 0.2, 'sine', 0.11, undefined, i * 0.07));
}

/* ---------- une image de jeu (appelé par cosmosTick) ---------- */
function endgameTick(gdt){
  contractTick(gdt);
  if(sgr) updateSgr(gdt);
  for(let i = gwRipples.length - 1; i >= 0; i--){ const g = gwRipples[i]; g.r += 520 * gdt; g.a -= gdt * 0.7; if(g.a <= 0) gwRipples.splice(i, 1); }
  if(cosmicEvent){
    eventT += gdt;
    if(cosmicEvent.id === 'comets' && eventT >= 2.6){ eventT = 0; if(entities.length < ENTITY_CAP) spawnComet(); }
    else if(cosmicEvent.id === 'gwaves' && eventT >= 5){
      eventT = 0;
      const sgn = rng() < 0.5 ? 1 : -1;
      for(const e of entities){
        if(e.dead || e.bossPart || e.orbit) continue;
        const dx = e.x - bh.x, dy = e.y - bh.y, d = Math.hypot(dx, dy) || 1;
        e.vx += -dy / d * 170 * PHYS * sgn; e.vy += dx / d * 170 * PHYS * sgn;
      }
      gwRipples.push({ x:bh.x, y:bh.y, r:0, a:1 });
      shake = Math.max(shake, 10);
      if(actx && !audioMuted) blip(55, 0.8, 'sine', 0.16, 30);
    }
  }
  if(sector && sector.id === 'belt'){
    rockTimer -= gdt;
    if(rockTimer <= 0){ rockTimer = 3.5 + rng() * 1.5; if(entities.length < ENTITY_CAP) spawnRock(); }
  }
  /* magnétar : la force de Lorentz courbe la course de l'antimatière */
  if(sector && sector.id === 'magnetar'){
    const k = 0.9 * gdt;
    for(const e of entities){
      if(e.dead || e.type !== 'anti' || e.kind === 'comet') continue;
      const vx = e.vx; e.vx -= e.vy * k; e.vy += vx * k;
    }
  }
}

/* ---------- écran de fin ---------- */
function endgameOver(){
  if(runWon) return { title:'FUSION', causeTitle:'SAGITTARIUS A*', cause:'Tu as fusionné avec un trou noir supermassif. Les ondes gravitationnelles de ta victoire traversent l\'univers.' };
  if(runCashed) return { title:'ENCAISSÉ', causeTitle:'SAGESSE', cause:'Tu t\'es arrêté au palier <b>' + tier + '</b> avec toute ta banque.' };
  return null;
}
function endgameBookkeep(){
  let got = 0;
  if(runBank > 0) got = (runCashed || runWon) ? runBank : Math.floor(runBank / 2);
  if(got > 0) profile.shards += got;
  profile.contractRoll = (profile.contractRoll || 0) + 1;
  profile.contractPick = -1;
  const lines = [];
  if(tier > 0) lines.push('Palier ' + tier + ' · record ' + (profile.bestTier || tier));
  if(runBank > 0) lines.push(got + ' ◆ ' + ((runCashed || runWon) ? 'encaissés' : 'gardés sur ' + runBank + ' (moitié)'));
  if(contract) lines.push(contractDone ? '◇ Contrat réussi : ' + contract.name : '◇ Contrat manqué : ' + contract.name);
  const el = $('overExtra'); if(el) el.textContent = lines.join(' · ');
  renderContracts();
}

/* ---------- écran « encaisser ou continuer » ---------- */
(function(){
  const c = $('btnContinue'), o = $('btnCashOut');
  if(c) c.addEventListener('click', ev => { ev.stopPropagation(); continueRun(); });
  if(o) o.addEventListener('click', ev => { ev.stopPropagation(); cashOut(); });
})();
