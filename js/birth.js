/* =========================================================
   GOULU — naissance du trou noir (0.22)
   ---------------------------------------------------------
   • Trois naissances réelles, tirées au sort à chaque partie (identiques
     pour tous au défi du jour) ; chacune fixe la masse, le spin et le départ.
   • Version courte au début de chaque partie : implosion, ondes
     gravitationnelles, l'horizon qui « sonne » (ringdown), une légende.
   • Cinématique complète (≈ 34 s, passable) : étoile de 25 M☉, pelure
     d'oignon, cœur de fer, effondrement, neutrinos, horizon. Jouée une fois
     avant la première partie, puis depuis le menu (« Revoir la naissance »).
   • Grandeurs réelles de la partie : masse en M☉, spin, âge, panneau d'instruments.
   Les lois sont vraies, seul le temps est accéléré.
   ========================================================= */
const BIRTHS = [
  { id:'fallback', name:'SUPERNOVA AVEC RETOMBÉE', tag:'THÉORIE ÉTABLIE', msun:8, start:1, a:0.5,
    line:'L\'explosion a échoué en partie : la matière retombe sur toi.', perk:'Débris abondants au début.',
    cine:'L\'onde de choc cale : une partie de l\'étoile est expulsée, le reste retombe sur le cœur.' },
  { id:'direct', name:'SUPERNOVA RATÉE', tag:'OBSERVÉ · candidats débattus (N6946-BH1, M31-2014-DS1)', msun:15, start:1.15, a:0.2,
    line:'L\'étoile a disparu sans exploser : effondrement direct.', perk:'Plus massif, départ calme.',
    cine:'L\'onde de choc échoue : l\'étoile entière s\'effondre sans exploser et s\'éteint dans le ciel.' },
  { id:'collapsar', name:'COLLAPSAR', tag:'THÉORIE ÉTABLIE · sursauts gamma longs observés', msun:10, start:1, a:0.85,
    line:'L\'étoile tournait vite : deux jets l\'ont transpercée (sursaut gamma).', perk:'Jets : charges d\'onde pleines.',
    cine:'L\'étoile tournait vite : la matière forme un disque et deux jets percent l\'étoile. Vu de la Terre : un sursaut gamma long.' }
];
let birth = null, pendingBirth = null, fallbackAcc = 0;

/* ---------- grandeurs réelles de la partie ---------- */
function birthStart(){ return birth ? birth.start : 1; }
function realMass(){ return (birth ? birth.msun * bhMass / birth.start : 10 * bhMass) * (typeof massK === 'number' ? massK : 1); }
function realSpin(){ return Math.abs(bhSpin); }
/* Âge réel du trou noir, en années : la phase en cours (une par minute) est parcourue en échelle logarithmique. */
function realAge(){
  const tc = tierClock(), clk = tc >= 0 ? tc : elapsed;
  const last = PHASES.length - 1, n = Math.floor(clk / 60);
  if(n >= last) return phaseAge(last, sgr ? sgr.t / SGR_DUR : (state === 'merge' || runWon ? 1 : 0));
  return phaseAge(n, (clk - n * 60) / 60);
}
function physLine(){
  const m = realMass();
  return 'Rs ' + PHY.num(PHY.rsKm(m), 0) + ' km · a* ' + PHY.num(realSpin(), 2) + (spinRel() < -0.05 ? ' rétro' : '') + ' · η ' + PHY.num(etaNow() * 100, 1) + ' % · ' + PHY.age(realAge());
}
/* Panneau « Instruments » (pause) : uniquement des nombres calculés, aucun texte saisi. */
function physPanelHTML(){
  const m = realMass(), a = realSpin(), ar = spinRel(), rs = PHY.rsKm(m), lam = eddRatio(), th = PHY.hawkingK(m);
  const sense = Math.abs(discJ) < 0.25 ? 'désordonné (accrétion chaotique)' : ar >= 0 ? 'prograde' : 'rétrograde';
  const rows = [
    ['Naissance', birth ? birth.name.toLowerCase() : '—'],
    ['Masse', PHY.msun(m)],
    ['Spin a* (Kerr)', PHY.num(a, 3)],
    ['Sens du disque', sense],
    ['Horizon r₊', PHY.num(PHY.horizonRg(a) * rs / 2, 0) + ' km (Rs = ' + PHY.num(rs, 0) + ' km)'],
    ['Ombre (≈ 3√3/2 Rs)', PHY.num(PHY.shadowKm(m), 0) + ' km'],
    ['Dernière orbite stable', PHY.num(PHY.iscoRg(ar) * rs / 2, 0) + ' km'],
    ['Efficacité du disque η', PHY.num(PHY.eta(ar) * 100, 1) + ' %'],
    ['Masse irréductible', PHY.num(m * PHY.irrK(a), 2) + ' M☉'],
    ['Énergie de rotation', PHY.num(PHY.rotFrac(a) * 100, 1) + ' % de la masse'],
    ['Puissance des jets (∝ a*²)', PHY.num(a * a * 100, 0) + ' % du maximum'],
    ['Accrétion', PHY.num(lam, 2) + ' × Eddington'],
    ['Bord interne du disque', '≈ ' + PHY.sci(PHY.discK(m, Math.max(lam, 0.01))) + ' K'],
    ['Température de Hawking', PHY.sci(th) + ' K'],
    ['Évaporation', th < 2.725 ? 'non : plus froid que le fond cosmologique (2,7 K)' : 'oui'],
    ['Durée de vie (Hawking)', PHY.sci(PHY.lifeYears(m)) + ' ans'],
    ['Entropie (∝ aire, ne baisse jamais)', PHY.sci(PHY.entropyKerr(m, a)) + ' k_B'],
    ['Âge', PHY.age(realAge())]
  ].concat(absorbedRows().map(r => ['Absorbé · ' + r[0], r[1]]));
  return '<div class="pp-head">Instruments · lois réelles, temps compressé</div>' +
    rows.map(r => '<div class="pp-row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('');
}
/* Fin de partie : origine, état final et entropie atteinte (record de compte : elle ne peut que croître). */
function showPhysOver(){
  const el = $('overPhys'); if(!el) return;
  if(!(cosmosOn() && birth)){ el.textContent = ''; return; }
  const S = Math.max(runEntropy, entropyNow()), rec = S > (profile.bestEntropy || 0);
  if(rec){ profile.bestEntropy = S; saveP(); }
  el.textContent = 'Né d\'une ' + birth.name.toLowerCase() + ' · ' + PHY.msun(realMass()) + ' · a* ' + PHY.num(realSpin(), 2) + ' · âge ' + PHY.age(realAge())
    + '\nEntropie ' + PHY.sci(S) + ' k_B' + (rec ? ' · ★ record' : '');
}

/* ---------- naissance d'une partie ---------- */
/* Appelé par startGame, graine déjà posée : au défi du jour, la même naissance pour tous. */
function birthSetup(isDaily){
  fallbackAcc = 0;
  const cap = $('birthCap'); if(cap) cap.classList.remove('on');
  if(currentCampaignLevel){ birth = null; pendingBirth = null; return; }
  const r = rng();
  birth = (!isDaily && pendingBirth) ? pendingBirth : BIRTHS[Math.floor(r * BIRTHS.length)];
  pendingBirth = null;
  bhMass = birth.start;
  bhSpin = birth.a; discJ = 0.6;                                    // le disque hérité de l'étoile tourne avec elle
  if(birth.id === 'direct') antiTimer += 2.5;                       // l'étoile s'est éteinte sans bruit : départ calme
  else if(birth.id === 'collapsar'){ shockCharges = getMaxCharges(); aliveJet(1); }
  /* implosion : la matière tombe vers le centre, une bouffée d'ondes gravitationnelles */
  const R = Math.min(W, H) * 0.36;
  for(let i = 0; i < 36; i++){
    const a = i / 36 * Math.PI * 2, life = 1.6;
    particles.push({ x:bh.x + Math.cos(a) * R, y:bh.y + Math.sin(a) * R, vx:-Math.sin(a) * 40, vy:Math.cos(a) * 40, life, maxLife:life, r:1.6, color:i % 2 ? '#cfe3ff' : '#ffe9c4', sink:true });
  }
  gwRipples.push({ x:bh.x, y:bh.y, r:0, a:1 });
  burst(bh.x, bh.y, '#ffffff', 30, 520);
  if(cap){
    cap.innerHTML = '';
    const m = realMass();
    for(const [cls, txt] of [
      ['bc-k', 'NAISSANCE · ' + birth.name],
      ['bc-v', PHY.num(m, 1) + ' M☉ · a* = ' + PHY.num(birth.a, 2) + ' · Rs = ' + PHY.num(PHY.rsKm(m), 0) + ' km'],
      ['bc-l', birth.line + ' ' + birth.perk],
      ['bc-t', birth.tag]
    ]){ const d = document.createElement('div'); d.className = cls; d.textContent = txt; cap.appendChild(d); }
    cap.classList.add('on');
  }
  if(actx && !audioMuted){ blip(70, 0.9, 'sine', 0.14, 35); blip(80, 0.7, 'sine', 0.06, 640, 0.15); }
}
/* Retombée : les débris arrivent en surplus, débit ∝ (1 + t/t₀)^−5/3. */
function birthTick(gdt){
  if(!birth) return;
  if(elapsed > 5.5){ const cap = $('birthCap'); if(cap && cap.classList.contains('on')) cap.classList.remove('on'); }
  if(birth.id === 'fallback' && elapsed < 40){
    fallbackAcc += 2.2 * Math.pow(1 + elapsed / 4, -5 / 3) * gdt;
    while(fallbackAcc >= 1){ fallbackAcc--; if(entities.length < ENTITY_CAP) spawnEntity('dust'); }
  }
}

/* ---------- facteurs visuels (rendu GL et 2D) ; la zone de collision bh.r ne change jamais ---------- */
function holeK(){
  if(state === 'birth') return CINE.hole;
  if(birth && state === 'play' && elapsed < 1.6) return Math.max(0.05, 1 - Math.exp(-elapsed / 0.3) * Math.cos(elapsed * 11));   // ringdown
  return 1;
}
function discGlowK(){
  if(state === 'birth') return CINE.disc;
  if(birth && state === 'play' && elapsed < 1.2) return 0.3 + 0.7 * elapsed / 1.2;
  return 1;
}

/* =========================================================
   Cinématique complète
   ========================================================= */
const CINE = { on:false, t:0, step:-1, b:null, done:null, hole:1, disc:1, flash:0, parts:[], clock:'' };
const CINE_SHELLS = [   // de l'extérieur vers le centre
  { el:'H',  name:'hydrogène', f:0.92, col:'158,200,255' },
  { el:'He', name:'hélium',    f:0.74, col:'255,233,168' },
  { el:'C',  name:'carbone',   f:0.58, col:'255,176,112' },
  { el:'Ne', name:'néon',      f:0.45, col:'255,143,176' },
  { el:'O',  name:'oxygène',   f:0.34, col:'201,160,255' },
  { el:'Si', name:'silicium',  f:0.24, col:'159,232,208' },
  { el:'Fe', name:'fer',       f:0.14, col:'118,122,134' }
];
const CINE_STEPS = [
  { d:4.5, title:'UNE ÉTOILE MASSIVE', tag:'THÉORIE ÉTABLIE',
    text:() => 'Une supergéante bleue de 25 masses solaires. Dans son cœur, l\'hydrogène fusionne en hélium pendant environ 7 millions d\'années.',
    clock:u => 'Âge de l\'étoile : ' + PHY.age(7e6 * Math.max(u, 0.01)) },
  { d:6, title:'LA PELURE D\'OIGNON', tag:'THÉORIE ÉTABLIE · Woosley, Heger & Weaver (2002)',
    text:() => 'Chaque combustible épuisé laisse place au suivant, de plus en plus vite : hélium ≈ 800 000 ans · carbone ≈ 500 ans · néon ≈ 1 an · oxygène ≈ 5 mois · silicium ≈ 1 jour.',
    clock:u => 'Âge de l\'étoile : ' + PHY.age(7e6 + 0.8e6 * u) },
  { d:4, title:'UN CŒUR DE FER', tag:'THÉORIE ÉTABLIE',
    text:() => 'Au centre, un noyau de fer d\'environ 1,5 masse solaire, à peu près gros comme la Terre. La fusion du fer consomme de l\'énergie au lieu d\'en produire : plus rien ne soutient le cœur.',
    clock:() => 'Âge de l\'étoile : ' + PHY.age(7.8e6) },
  { d:3, title:'EFFONDREMENT', tag:'THÉORIE ÉTABLIE',
    text:() => 'En moins d\'une seconde, le cœur s\'effondre à près de 70 000 km/s (0,23 c). Les noyaux de fer se brisent (photodésintégration), les électrons s\'unissent aux protons (capture électronique).',
    clock:u => 'Effondrement : t = ' + PHY.num(0.25 * u, 2) + ' s' },
  { d:4, title:'REBOND ET NEUTRINOS', tag:'OBSERVÉ · SN 1987A (1987)',
    text:() => 'La matière rebondit sur une proto-étoile à neutrons. 10⁵⁸ neutrinos emportent 99 % de l\'énergie libérée, environ 3×10⁴⁶ joules.',
    clock:u => 'Effondrement : t = ' + PHY.num(0.25 + 0.75 * u, 2) + ' s' },
  { d:4, title:b => b.name, tag:b => b.tag,
    text:b => b.cine + ' Au-delà d\'environ 2,2 à 2,5 masses solaires (limite TOV), aucune pression ne résiste.',
    clock:u => 'Effondrement : t = ' + PHY.num(1 + 9 * u, 1) + ' s' },
  { d:4, title:'L\'HORIZON', tag:'THÉORIE ÉTABLIE · ombre de M87* photographiée par l\'EHT (2019)',
    text:b => 'Un horizon des événements se forme : Rs = 2GM/c² = ' + PHY.num(PHY.rsKm(b.msun), 0) + ' km pour ' + PHY.num(b.msun, 0) + ' masses solaires. Rien de ce qui le franchit ne ressort. Une bouffée d\'ondes gravitationnelles s\'échappe.',
    clock:u => 'Âge du trou noir : ' + PHY.num(u * 10, 1) + ' ms' },
  { d:4.5, title:'IL N\'A PLUS DE CHEVEUX', tag:'THÉORIE ÉTABLIE · théorème de calvitie',
    text:b => 'L\'horizon vibre quelques millisecondes puis se fige (ringdown). De l\'étoile, il ne reste que trois nombres : masse ' + PHY.num(b.msun, 0) + ' M☉, spin a* = ' + PHY.num(b.a, 2) + ', charge ≈ 0. Tu es né. Tu as faim.',
    clock:() => 'Âge du trou noir : 10 ms' }
];
const CINE_T = CINE_STEPS.reduce((s, x) => s + x.d, 0);
function cineStart(i){ let s = 0; for(let k = 0; k < i; k++) s += CINE_STEPS[k].d; return s; }
const callOr = (v, b) => typeof v === 'function' ? v(b) : v;

function startBirthCinema(branchId, done){
  const b = BIRTHS.find(x => x.id === branchId) || BIRTHS[Math.floor(Math.random() * BIRTHS.length)];
  Object.assign(CINE, { on:true, t:0, step:-1, b, done, hole:0.0001, disc:0, flash:0, parts:[], clock:'' });
  state = 'birth'; cam.menuTarget = 0; attract = false;
  entities.length = 0; particles.length = 0; shockwaves.length = 0; toasts.length = 0; gwRipples.length = 0; boss = null;
  bh.r = bh.rTarget = 20;
  menuEl.classList.add('hidden'); overEl.classList.add('hidden'); hudEl.classList.remove('active');
  $('birthScreen').classList.remove('hidden');
  musicStop();
  if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
function finishBirth(){
  if(!CINE.on) return;
  CINE.on = false; CINE.hole = 1; CINE.disc = 1; CINE.parts = [];
  if(!profile.seen) profile.seen = {};
  profile.seen.birthFull = true; saveP();
  $('birthScreen').classList.add('hidden');
  gwRipples.length = 0; shake = 0;
  state = 'menu';
  const done = CINE.done; CINE.done = null;
  if(done) done(CINE.b);
}
function cineSound(i){
  if(!actx || audioMuted) return;
  const b = CINE.b;
  if(i === 0){ blip(55, 4.4, 'sine', 0.08); blip(82.4, 4.4, 'sine', 0.04); }
  else if(i === 1) CINE_SHELLS.forEach((s, k) => blip(330 * (1 + k * 0.12), 0.6, 'triangle', 0.045, undefined, k * 0.8));
  else if(i === 2) blip(98, 3.8, 'sawtooth', 0.025, 92);
  else if(i === 3){ blip(300, 2.9, 'sawtooth', 0.05, 40); blip(150, 2.9, 'sine', 0.08, 30); }
  else if(i === 4){ blip(50, 1.6, 'sine', 0.24, 25); blip(2400, 0.8, 'triangle', 0.05, 600); }
  else if(i === 5){
    if(b.id === 'collapsar') blip(880, 1.4, 'sawtooth', 0.04, 1760);
    else if(b.id === 'fallback') blip(140, 2.2, 'triangle', 0.05, 70);
    else blip(70, 3, 'sine', 0.04, 40);
  }
  else if(i === 6){ blip(60, 1.1, 'sine', 0.12, 700); blip(700, 1.4, 'sine', 0.07, 520, 1.1); }
  else if(i === 7) [262, 330, 392].forEach((f, k) => blip(f, 2.4, 'sine', 0.04, undefined, k * 0.12));
}
function cineEnter(i){
  const s = CINE_STEPS[i], b = CINE.b;
  $('bsStep').textContent = (i + 1) + ' / ' + CINE_STEPS.length;
  $('bsTitle').textContent = callOr(s.title, b);
  $('bsText').textContent = s.text(b);
  $('bsTag').textContent = callOr(s.tag, b);
  cineSound(i);
  const R0 = Math.min(W, H) * 0.17;
  if(i === 4){   // rebond : éclair, neutrinos
    CINE.flash = 1; shake = 18;
    for(let k = 0; k < 90; k++){
      const a = Math.random() * Math.PI * 2, sp = 700 + Math.random() * 900;
      CINE.parts.push({ k:'nu', x:0, y:0, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, life:1.4 });
    }
  } else if(i === 5 && b.id === 'fallback'){   // éjecta : une partie retombe
    for(let k = 0; k < 140; k++){
      const a = Math.random() * Math.PI * 2, sp = 90 + Math.random() * 260;
      CINE.parts.push({ k:'ej', x:Math.cos(a) * R0 * 0.3, y:Math.sin(a) * R0 * 0.3, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, life:4 });
    }
  } else if(i === 6){ gwRipples.push({ x:bh.x, y:bh.y, r:0, a:1 }); shake = 10; }
}
function birthCinemaTick(dt){
  if(!CINE.on) return;
  CINE.t += dt;
  if(CINE.t >= CINE_T){ finishBirth(); return; }
  let i = 0; while(i < CINE_STEPS.length - 1 && CINE.t >= cineStart(i + 1)) i++;
  if(i !== CINE.step){ CINE.step = i; cineEnter(i); }
  const el = CINE.t - cineStart(i), u = el / CINE_STEPS[i].d;
  const ck = CINE_STEPS[i].clock(u);
  if(ck !== CINE.clock){ CINE.clock = ck; $('bsClock').textContent = ck; }
  /* l'horizon apparaît à l'étape 6 et sonne avant de se figer ; le disque s'allume à l'étape 7 */
  CINE.hole = i < 6 ? 0.0001 : i === 6 ? Math.max(0.0001, 1 - Math.exp(-el / 0.45) * Math.cos(el * 7)) : 1;
  CINE.disc = i < 7 ? 0 : Math.min(1, el / 2.5);
  CINE.flash = Math.max(0, CINE.flash - dt * 1.6);
  if(i === 3) shake = Math.max(shake, 10 * u * u);
  shake = Math.max(0, shake - dt * 30);
  if(i === 3 && Math.random() < dt * 60){   // chute de matière vers le cœur
    const a = Math.random() * Math.PI * 2, R = Math.min(W, H) * 0.3;
    CINE.parts.push({ k:'in', x:Math.cos(a) * R, y:Math.sin(a) * R, vx:-Math.cos(a) * 260, vy:-Math.sin(a) * 260, life:0.9 });
  }
  for(let k = CINE.parts.length - 1; k >= 0; k--){
    const p = CINE.parts[k];
    p.life -= dt;
    if(p.k === 'ej'){   // gravité du cœur : les plus lents retombent
      const d = Math.hypot(p.x, p.y) || 1, g = 52000 / Math.max(d, 30);
      p.vx -= p.x / d * g * dt; p.vy -= p.y / d * g * dt;
      if(d < 8) p.life = 0;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if(p.life <= 0) CINE.parts.splice(k, 1);
  }
  for(let k = gwRipples.length - 1; k >= 0; k--){ const g = gwRipples[k]; g.r += 520 * dt; g.a -= dt * 0.7; if(g.a <= 0) gwRipples.splice(k, 1); }
}

/* ---------- dessin (couche scène, déformée par la lentille dès que l'horizon existe) ---------- */
function cineStar(c, x, y, r, alpha, hot){
  c.save(); c.globalCompositeOperation = 'lighter';
  const h = c.createRadialGradient(x, y, r * 0.6, x, y, r * 2.4);
  h.addColorStop(0, 'rgba(' + hot + ',' + (0.35 * alpha).toFixed(3) + ')'); h.addColorStop(1, 'rgba(' + hot + ',0)');
  c.fillStyle = h; c.beginPath(); c.arc(x, y, r * 2.4, 0, Math.PI * 2); c.fill();
  c.restore();
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,' + alpha.toFixed(3) + ')');
  g.addColorStop(0.55, 'rgba(' + hot + ',' + (0.95 * alpha).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(' + hot + ',' + (0.55 * alpha).toFixed(3) + ')');   // assombrissement centre-bord
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.save(); c.globalCompositeOperation = 'lighter';   // cœur éblouissant
  const k = c.createRadialGradient(x, y, 0, x, y, r * 0.75);
  k.addColorStop(0, 'rgba(255,255,255,' + (0.6 * alpha).toFixed(3) + ')'); k.addColorStop(1, 'rgba(' + hot + ',0)');
  c.fillStyle = k; c.beginPath(); c.arc(x, y, r * 0.75, 0, Math.PI * 2); c.fill();
  c.restore();
}
function drawBirthScene(t){
  const c = sctx, x = bh.x, y = bh.y, R0 = Math.min(W, H) * 0.17, i = CINE.step;
  if(i < 0) return;
  const el = CINE.t - cineStart(i), u = clamp01(el / CINE_STEPS[i].d), b = CINE.b;
  const ease = v => v * v * (3 - 2 * v);
  if(i === 0) cineStar(c, x, y, R0 * (1 + 0.015 * Math.sin(t * 2.1)), Math.min(1, CINE.t / 1.2), '110,165,255');
  else if(i === 1 || i === 2){
    const z = i === 2 ? 1 + 4 * ease(u) : 1, sw = i === 1 ? 1 + 0.12 * u : 1.12;
    if(i === 1) cineStar(c, x, y, R0 * sw, 1 - 0.55 * u, '110,165,255');
    CINE_SHELLS.forEach((s, k) => {
      const on = i === 2 ? 1 : clamp01((u * 7 - k) * 1.5);
      const fade = i === 2 && k < CINE_SHELLS.length - 1 ? 0.8 * (1 - u) * (1 - u) : 1;
      if(on <= 0 || fade <= 0) return;
      const r = R0 * sw * s.f * z;
      const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
      const isFe = k === CINE_SHELLS.length - 1;
      g.addColorStop(0, 'rgba(' + s.col + ',' + ((isFe ? 0.95 : 0.35) * on * fade).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + s.col + ',' + ((isFe ? 0.8 : 0.6) * on * fade).toFixed(3) + ')');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      if(isFe && i === 2){ c.strokeStyle = 'rgba(210,215,230,0.7)'; c.lineWidth = 1.5; c.stroke(); }
    });
  } else if(i === 3){
    const rc = R0 * 0.7 * (1 - 0.93 * u * u * u), hot = Math.round(150 + 105 * u);
    cineStar(c, x, y, rc, 1, hot + ',' + hot + ',' + Math.round(168 + 87 * u));
  } else if(i === 4 || i === 5){
    const ring = i === 4 ? R0 * 0.1 + ease(u) * Math.max(W, H) * 0.55 : 0;
    if(i === 4){
      c.save(); c.globalCompositeOperation = 'lighter';
      c.strokeStyle = 'rgba(220,235,255,' + (0.7 * (1 - u)).toFixed(3) + ')'; c.lineWidth = 6 * (1 - u) + 1;
      c.beginPath(); c.arc(x, y, ring, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    if(i === 5 && b.id === 'direct') cineStar(c, x, y, R0 * 1.1, 0.5 * (1 - u), '255,190,150');   // l'étoile s'éteint sans exploser
    if(i === 5 && b.id === 'collapsar'){
      c.save(); c.globalCompositeOperation = 'lighter';
      cineStar(c, x, y, R0 * 1.05, 0.35 * (1 - u * 0.6), '170,205,255');
      const L = ease(Math.min(1, u * 1.6)) * H * 0.6;
      for(const dir of [-1, 1]){
        const g = c.createLinearGradient(x, y, x, y + dir * L);
        g.addColorStop(0, 'rgba(230,240,255,0.95)'); g.addColorStop(1, 'rgba(120,160,255,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x - 14, y + dir * L); c.lineTo(x + 14, y + dir * L); c.lineTo(x + 4, y); c.closePath(); c.fill();
      }
      c.restore();
    }
    /* proto-étoile à neutrons : brillante, puis elle s'assombrit en s'effondrant */
    const k = i === 5 ? u : 0, ns = R0 * (0.06 - 0.03 * k);
    cineStar(c, x, y, ns, 1 - 0.9 * k, Math.round(220 - 120 * k) + ',' + Math.round(235 - 190 * k) + ',' + Math.round(255 - 215 * k));
  }
  if(i >= 6) drawInfall(0);
  /* particules : neutrinos (traits), éjecta, chute */
  c.save(); c.globalCompositeOperation = 'lighter';
  for(const p of CINE.parts){
    if(p.k === 'nu'){
      c.strokeStyle = 'rgba(200,230,255,' + Math.min(0.8, p.life).toFixed(3) + ')'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x + p.x, y + p.y); c.lineTo(x + p.x - p.vx * 0.03, y + p.y - p.vy * 0.03); c.stroke();
    } else {
      c.fillStyle = p.k === 'ej' ? 'rgba(255,200,140,' + Math.min(0.9, p.life).toFixed(3) + ')' : 'rgba(255,240,210,0.8)';
      c.beginPath(); c.arc(x + p.x, y + p.y, p.k === 'ej' ? 1.8 : 1.4, 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
  if(CINE.flash > 0){ c.fillStyle = 'rgba(255,255,255,' + (0.85 * CINE.flash * CINE.flash).toFixed(3) + ')'; c.fillRect(-cam.dx, -cam.dy, W, H); }
}
/* Étiquettes des couches (couche 2D nette, sans lentille) */
function drawBirthOverlay(){
  const i = CINE.step; if(i !== 1 && i !== 2) return;
  const u = clamp01((CINE.t - cineStart(i)) / CINE_STEPS[i].d), R0 = Math.min(W, H) * 0.17;
  const c = ctx, x = bh.x + cam.dx, y = bh.y + cam.dy, small = W < 520;
  c.save();
  c.font = (small ? 10 : 11) + 'px "JetBrains Mono", ui-monospace, monospace'; c.textBaseline = 'middle';
  CINE_SHELLS.forEach((s, k) => {
    const isFe = k === CINE_SHELLS.length - 1;
    const on = i === 1 ? clamp01((u * 7 - k) * 1.5) : (isFe ? 1 : (1 - u) * (1 - u));
    if(on <= 0) return;
    const sw = i === 1 ? 1 + 0.12 * u : 1.12, z = i === 2 ? 1 + 4 * u * u * (3 - 2 * u) : 1;
    const r = R0 * sw * s.f * z, a = -0.5 + k * 0.17;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.9;
    const lx = x + R0 * (small ? 1.12 : 1.4), ly = y - R0 * 0.95 + k * (small ? 15 : 18);
    c.globalAlpha = on;
    c.strokeStyle = 'rgba(' + s.col + ',0.7)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(px, py); c.lineTo(lx - 4, ly); c.stroke();
    c.fillStyle = 'rgb(' + s.col + ')';
    c.fillText(s.el + (small ? '' : ' · ' + s.name) + (isFe && i === 2 ? ' · ≈ 1,5 M☉' : ''), lx, ly);
  });
  c.restore();
}
