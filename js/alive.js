/* =========================================================
   GOULU — un trou noir vivant
   ---------------------------------------------------------
   Humeurs (faim, satiété, douleur, transe, peur), respiration, regard,
   sursaut, jets polaires, stades de croissance, voix intérieure selon le
   niveau du compte, nom, accueil selon l'absence, réaction dans le menu.
   Rien ici ne change les règles : la zone noire (bh.r) reste la zone de
   collision, seul le ressenti change.
   ========================================================= */
const ALIVE = { satiety:0, lastEat:0, flinch:0, jet:0, look:[0, 0], stage:0, eatTimes:[], nextIdle:20, colors:{}, menuPull:0 };

/* Stades : la « masse » vient de ce que le joueur fait, pas du score (gonflable). */
const STAGES = [
  { id:'graine',   name:'GRAINE',   at:0,   line:'' },
  { id:'avaleur',  name:'AVALEUR',  at:40,  line:'Je prends de la place.' },
  { id:'devoreur', name:'DÉVOREUR', at:120, line:'Plus rien n\'a de forme autour de moi.' },
  { id:'quasar',   name:'QUASAR',   at:260, line:'Je brille. Moi qui avalais la lumière.' }
];
function runMass(){ return runDust + parryCount * 3 + runBossesKilled * 20; }

function aliveReset(){
  ALIVE.satiety = 0; ALIVE.lastEat = 0; ALIVE.flinch = 0; ALIVE.jet = 0;
  ALIVE.look = [0, 0]; ALIVE.stage = 0; ALIVE.eatTimes = []; ALIVE.colors = {};
  ALIVE.nextIdle = 18 + Math.random() * 10;
}

/* ---------- humeurs ---------- */
function aliveMood(){
  const playing = state === 'play';
  return {
    hungry: playing ? clamp01((elapsed - ALIVE.lastEat - 4) / 6) : 0,
    sated: ALIVE.satiety,
    hurt: VIS.hurt,
    trance: resonanceT > 0 ? 1 : 0,
    fear: playing ? VIS.danger : 0
  };
}
function aliveEat(dustType){
  ALIVE.lastEat = elapsed;
  ALIVE.satiety = Math.min(1, ALIVE.satiety + 0.07);
  const now = elapsed;
  ALIVE.eatTimes.push(now);
  while(ALIVE.eatTimes.length && now - ALIVE.eatTimes[0] > 0.35) ALIVE.eatTimes.shift();
  if(ALIVE.eatTimes.length >= 3){                       // grosse bouchée : déglutition
    ALIVE.eatTimes.length = 0;
    if(actx && !audioMuted) blip(150 - ALIVE.stage * 22, 0.18, 'sine', 0.12, 70 - ALIVE.stage * 10);
  }
  if(!ALIVE.colors[dustType]){
    ALIVE.colors[dustType] = true;
    const l = { blue:'Froid. Délicieux.', red:'Ça pique. J\'aime ça.', white:'Pur. Comme au début.' }[dustType];
    if(l) thoughtOnce('dust_' + dustType, l);
  }
}
function aliveHurt(){ ALIVE.satiety *= 0.4; }
function aliveGraze(){
  ALIVE.flinch = 1;
  if(!reduceFx()) shake = Math.max(shake, 5);
  if(actx && !audioMuted) blip(320, 0.09, 'triangle', 0.06, 180);
  thought(['Trop près.', 'Raté. De peu.', 'Je l\'ai senti passer.'][Math.floor(Math.random() * 3)], 'graze');
}
function aliveJet(k){ ALIVE.jet = Math.max(ALIVE.jet, k); }

/* Une fois par image de jeu (state === 'play'). */
function aliveTick(dt){
  ALIVE.satiety = Math.max(0, ALIVE.satiety - dt * 0.09);
  ALIVE.flinch = Math.max(0, ALIVE.flinch - dt * 2.5);
  ALIVE.jet = Math.max(0, ALIVE.jet - dt * 0.6);
  if(multiplier >= MAX_MULT && ALIVE.jet < 0.5) aliveJet(0.7);
  /* stades */
  const m = runMass();
  while(ALIVE.stage < STAGES.length - 1 && m >= STAGES[ALIVE.stage + 1].at){
    ALIVE.stage++;
    const st = STAGES[ALIVE.stage];
    addToast('◉ STADE : ' + st.name, '#ffe9a3', H/2 - 160);
    burst(bh.x, bh.y, '#ffe9a3', 50, 560);
    shake = Math.max(shake, reduceFx() ? 4 : 14);
    aliveJet(1);
    if(actx && !audioMuted) [262, 330, 392, 523].forEach((f, i) => blip(f, 0.4, 'triangle', 0.1, undefined, i * 0.09));
    vibrate([30, 30, 60]);
    thought(st.line, 'stage' + ALIVE.stage);
  }
  /* faim prolongée */
  if(aliveMood().hungry > 0.95) thoughtOnce('hungry', ['J\'ai faim.', 'Où est passée la lumière ?'][Math.floor(Math.random() * 2)]);
  /* pensées au calme, selon la personnalité */
  if(elapsed >= ALIVE.nextIdle){
    ALIVE.nextIdle = elapsed + 22 + Math.random() * 14;
    if(danger < 0.3 && !boss) thought(pick(persona().idle));
  }
}

/* ---------- regard : le disque se penche vers la menace la plus proche ---------- */
function aliveLook(dt){
  let tx = 0, ty = 0;
  if(state === 'play'){
    let best = null, bd = 320;
    for(const e of entities){
      if(e.dead || (e.type !== 'anti' && !e.bossPart)) continue;
      const d = Math.hypot(e.x - bh.x, e.y - bh.y);
      if(d < bd){ bd = d; best = e; }
    }
    if(best){ const w = 1 - bd / 320; tx = (best.x - bh.x) / (bd || 1) * w; ty = (best.y - bh.y) / (bd || 1) * w; }
  }
  const k = 1 - Math.exp(-dt * 4);
  ALIVE.look[0] += (tx - ALIVE.look[0]) * k;
  ALIVE.look[1] += (ty - ALIVE.look[1]) * k;
}

/* Paramètres visuels finaux, appliqués par renderFrame. */
function aliveVisual(t){
  const md = aliveMood(), rf = reduceFx() ? 0.4 : 1;
  const stageK = ALIVE.stage / (STAGES.length - 1);
  const breathRate = 1.25 + md.fear * 5.5;                          // calme → cœur qui bat
  const breath = md.fear > 0.35 ? Math.pow(Math.max(0, Math.sin(t * breathRate)), 6) : (Math.sin(t * breathRate) * 0.5 + 0.5);
  const hurtFlicker = md.hurt > 0.05 ? 1 - md.hurt * 0.3 * rf * (0.5 + 0.5 * Math.sin(t * 37) * Math.sin(t * 23)) : 1;
  return {
    glow: (1 + 0.3 * md.sated - 0.32 * md.hungry + 0.22 * stageK + 0.07 * breath * rf + 0.25 * ALIVE.jet) * hurtFlicker * (1 - 0.15 * ALIVE.flinch),
    temp: 1 + 0.22 * md.sated - 0.28 * md.hungry - 0.12 * md.hurt + 0.15 * stageK,
    spin: 1 + 0.55 * md.sated - 0.45 * md.hungry + 0.25 * stageK + ALIVE.menuPull * 1.5,
    lens: 1 + 0.03 * breath * rf + ALIVE.menuPull * 0.35,
    tilt: ALIVE.look[1] * 0.10 * rf + Math.sin(t * 61) * ALIVE.flinch * 0.03 * rf,
    roll: ALIVE.look[0] * 0.14 * rf + Math.sin(t * 53) * ALIVE.flinch * 0.05 * rf,
    tint: [1 + 0.35 * md.hurt, 1 - 0.18 * md.hurt - 0.1 * md.hungry, 1 - 0.22 * md.hurt + 0.12 * md.hungry],
    trance: md.trance
  };
}

/* ---------- jets polaires (couche scène, déformée par la lentille) ---------- */
function drawJets(t){
  const k = Math.max(ALIVE.jet, ALIVE.stage >= STAGES.length - 1 ? 0.35 : 0) * (reduceFx() ? 0.5 : 1);
  if(k < 0.02 || state === 'menu') return;
  const L = Math.min(W, H) * (0.32 + 0.18 * k), w0 = bh.r * 0.35, w1 = bh.r * (0.9 + 0.8 * k);
  const ang = -Math.PI / 2 + (-0.13 + ALIVE.look[0] * 0.14);
  sctx.save();
  sctx.globalCompositeOperation = 'lighter';
  sctx.translate(bh.x, bh.y); sctx.rotate(ang);
  for(const dir of [1, -1]){
    const g = sctx.createLinearGradient(0, 0, L * dir, 0);
    g.addColorStop(0, 'rgba(210,235,255,' + (0.9 * k).toFixed(3) + ')');
    g.addColorStop(0.4, 'rgba(140,190,255,' + (0.45 * k).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(90,120,255,0)');
    sctx.fillStyle = g;
    const flick = 1 + 0.08 * Math.sin(t * 40 + dir);
    sctx.beginPath();
    sctx.moveTo(bh.r * 1.05 * dir, -w0); sctx.lineTo(L * dir, -w1 * flick); sctx.lineTo(L * dir, w1 * flick); sctx.lineTo(bh.r * 1.05 * dir, w0);
    sctx.closePath(); sctx.fill();
  }
  sctx.restore();
}

/* ---------- personnalité : évolue avec le niveau du compte ---------- */
const PERSONAS = [
  { min:1,  start:['J\'ai faim… je crois.', 'Qu\'est-ce que je suis ?', 'Tout m\'attire.'],
            idle:['Pourquoi tout vient vers moi ?', 'Je grandis. Je crois.', 'Le noir est doux.'],
            hit:['Ça brûle.', 'Je ne comprends pas.', 'Pourquoi ça fait mal ?'] },
  { min:5,  start:['Encore.', 'Approchez.', 'J\'ai faim. Comme toujours.'],
            idle:['Rien ne m\'échappe.', 'Encore. Toujours plus.', 'Ils tournent tous autour de moi.'],
            hit:['Insolent.', 'Tu oses ?', 'Ça ne m\'arrêtera pas.'] },
  { min:15, start:['Le silence a un goût.', 'Je me souviens du vide.', 'Encore une fois, alors.'],
            idle:['Tout finit en moi.', 'Même la lumière renonce.', 'J\'ai avalé des soleils. J\'ai encore faim.'],
            hit:['Pas encore.', 'Je ne veux pas disparaître.', 'Encore un peu.'] }
];
function persona(){ let p = PERSONAS[0]; for(const q of PERSONAS) if((profile.level || 1) >= q.min) p = q; return p; }
function pick(a){ return a[Math.floor(Math.random() * a.length)]; }

/* ---------- nom et accueil ---------- */
const BH_NAMES = ['Gargantua', 'Nox', 'Abysse', 'Glouton', 'Sagittarius', 'Erèbe', 'Vortex', 'Néant'];
function bhName(){ return (profile.bhName || '').trim(); }
function cleanName(s){ return String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16); }
function greetingFor(lastSeen, now){
  if(!lastSeen) return 'Je ne me souviens pas d\'avoir eu faim. Juste d\'avoir commencé.';
  const days = Math.floor((now - lastSeen) / 86400000);
  if(days >= 7) return 'J\'ai cru que tu m\'avais oublié.';
  if(days >= 2) return days + ' jours. Le vide était long.';
  if(days >= 1) return 'Tu es revenu. J\'avais faim.';
  return 'Encore toi. Tant mieux.';
}
function renderGreeting(){
  const el = $('menuGreet'); if(!el) return;
  const n = bhName();
  el.innerHTML = '';
  const who = document.createElement('b'); who.textContent = n || 'Ton trou noir';
  el.appendChild(who);
  el.appendChild(document.createTextNode(' · « ' + (window.__greet || '') + ' »'));
}
function bootGreeting(){
  window.__greet = greetingFor(profile.lastSeen, Date.now());
  profile.lastSeen = Date.now(); saveP();
  renderGreeting();
}

function openNameModal(){
  const m = $('nameModal'); if(!m) return;
  $('nameInput').value = bhName();
  const sug = $('nameSuggest'); sug.innerHTML = '';
  for(const s of BH_NAMES){
    const b = document.createElement('button'); b.className = 'mbadge'; b.type = 'button'; b.textContent = s;
    b.addEventListener('click', ev => { ev.stopPropagation(); $('nameInput').value = s; });
    sug.appendChild(b);
  }
  m.classList.remove('hidden');
  profile.namePromptSeen = true; saveP();
  setTimeout(() => { try{ $('nameInput').focus(); }catch(e){} }, 50);
}
function saveName(){
  const n = cleanName($('nameInput').value);
  if(n){ profile.bhName = n; saveP(); }
  $('nameModal').classList.add('hidden');
  renderGreeting();
  if(n) showUnlockToast('🕳️', n + ' a faim.');
}
function closeNameModal(){ $('nameModal').classList.add('hidden'); }
/* Proposé au retour au menu après la première partie, une seule fois. */
function maybeAskName(){ if(!bhName() && !profile.namePromptSeen && profile.cum.plays >= 1) openNameModal(); }

/* ---------- menu : le trou noir avale le geste ---------- */
function menuTap(clientX, clientY){
  const sx = bh.x + cam.dx, sy = bh.y + cam.dy, R = bh.r * cam.zoom;
  const d = Math.hypot(clientX - sx, clientY - sy);
  if(d > R * 9) return false;
  ALIVE.menuPull = 1;
  const wx = clientX - cam.dx, wy = clientY - cam.dy;
  for(let i = 0; i < 16; i++){
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 90, life = 1.4 + Math.random() * 0.6;
    particles.push({ x:wx, y:wy, vx:Math.cos(a) * s, vy:Math.sin(a) * s, life, maxLife:life, r:1.4 + Math.random() * 2.4, color:Math.random() < 0.5 ? '#ffcb4d' : '#ffe9c4', sink:true });
  }
  if(actx && !audioMuted) blip(220, 0.25, 'sine', 0.08, 90);
  return true;
}
/* Particules « sink » : aspirées vers le centre, disparaissent dans l'ombre. */
function sinkParticle(p, dt){
  const dx = bh.x - p.x, dy = bh.y - p.y, d = Math.hypot(dx, dy) || 1;
  const f = 260000 / Math.max(d, 30);
  p.vx += dx / d * f * dt * 0.01; p.vy += dy / d * f * dt * 0.01;
  p.vx += -dy / d * 60 * dt; p.vy += dx / d * 60 * dt;          // un peu de rotation, comme un disque
  if(d < bh.r * Math.max(1, cam.zoom) * 0.9) p.life = 0;
}
