/* =========================================================
   GOULU — épilogue « Le long sommeil » (0.25)
   ---------------------------------------------------------
   La fin de la vie du trou noir, calculée pour la masse réelle de la
   dernière partie (10 M☉ par défaut) : le fond cosmologique refroidit
   jusqu'à devenir plus froid que lui, les étoiles s'éteignent, les galaxies
   se défont, l'ère des trous noirs, l'évaporation de Hawking, la dernière
   seconde, puis la question ouverte. Échelle de temps logarithmique ;
   maintenir aspire les dernières miettes tant qu'il en reste.
   Débloqué au palier 5, ou en tombant dans Sagittarius A*.
   ========================================================= */
const EPI = { on:false, t:0, step:-1, m:10, hole:1, disc:1, stars:1, flash:0, parts:[], clock:'', eaten:0, steps:null };
const T_NOW = 1.38e10, H_LAMBDA_YR = 1.74e10;   // âge actuel ; 1/H de l'expansion accélérée (Ωλ ≈ 0,69, H₀ ≈ 68 km/s/Mpc)

/* Le fond cosmologique (2,725 K aujourd'hui) refroidit comme e^(−t/τ) : quand devient-il plus froid que le trou ? */
function coldYear(m){ const th = PHY.hawkingK(m); return th >= 2.725 ? T_NOW : T_NOW + Math.log(2.725 / th) * H_LAMBDA_YR; }
function epilogueSteps(m){
  const th = PHY.hawkingK(m), life = PHY.lifeYears(m), tc = coldYear(m);
  const ml = PHY.msun(m);
  return [
    { d:6, y:[T_NOW, T_NOW], title:'AUJOURD\'HUI', tag:'OBSERVÉ',
      text:'L\'univers a 13,8 milliards d\'années. Tu pèses ' + ml + '. Autour de toi, des étoiles brillent encore, et il reste un peu de matière à avaler.' },
    { d:6, y:[T_NOW, tc], title:'LE FROID', tag:'THÉORIE ÉTABLIE · expansion accélérée (1998)',
      text:'L\'expansion refroidit le fond cosmologique. Vers ' + PHY.sci(tc, 1) + ' ans, il devient plus froid que toi (' + PHY.sci(th) + ' K) : pour la première fois, tu rayonnes plus que tu ne reçois.' },
    { d:6, y:[tc, 1e14], title:'LES DERNIÈRES ÉTOILES', tag:'THÉORIE ÉTABLIE · Adams & Laughlin (1997)',
      text:'Les naines rouges, les plus économes, s\'éteignent vers 10¹⁴ ans. Plus aucune lumière nouvelle. Ton disque n\'a plus rien à manger.' },
    { d:6, y:[1e14, 1e20], title:'LES GALAXIES SE DÉFONT', tag:'THÉORIE ÉTABLIE',
      text:'Les étoiles mortes se croisent : la plupart sont éjectées dans le vide, les autres tombent dans les trous noirs. Vers 10²⁰ ans, il ne reste presque rien autour de toi.' },
    { d:6, y:[1e20, 1e40], title:'LES PROTONS ?', tag:'HYPOTHÈSE · jamais observé',
      text:'Si le proton se désintègre (sa durée de vie dépasse 10³⁴ ans, si elle est finie), la matière ordinaire s\'efface. Vers 10⁴⁰ ans commence l\'ère des trous noirs : il ne reste presque que vous.' },
    { d:7, y:[1e40, life * 0.999], title:'L\'ÉVAPORATION', tag:'HYPOTHÈSE · rayonnement de Hawking (1974)',
      text:'Tu rayonnes à T = 6,2×10⁻⁸ K × (M☉/M). En rétrécissant tu chauffes, en chauffant tu rétrécis plus vite. Durée totale : ' + PHY.sci(life, 1) + ' ans.' },
    { d:5, y:[life * 0.999, life], title:'LA DERNIÈRE SECONDE', tag:'HYPOTHÈSE',
      text:'Il reste environ 230 tonnes, à des milliers de milliards de degrés. Elles partent d\'un coup : ≈ 2×10²² joules, un éclair de rayons gamma.' },
    { d:7, y:[life, life], title:'ET APRÈS ?', tag:'QUESTION OUVERTE · paradoxe de l\'information (1976)',
      text:'Personne ne sait. L\'information de tout ce que tu as avalé est-elle perdue ? Reste-t-il quelque chose ? C\'est la frontière actuelle de la physique.' }
  ];
}
const EPI_T = () => EPI.steps.reduce((s, x) => s + x.d, 0);
function epiStart(i){ let s = 0; for(let k = 0; k < i; k++) s += EPI.steps[k].d; return s; }

function startEpilogue(m){
  /* masse du dernier trou noir (stellaire ou plus) ; un trou primordial s'évapore avant même la fin des étoiles */
  m = m || (profile.lastBH && profile.lastBH.m >= 1 ? profile.lastBH.m : 10);
  Object.assign(EPI, { on:true, t:0, step:-1, m, hole:1, disc:1, stars:1, flash:0, parts:[], clock:'', eaten:0, steps:epilogueSteps(m) });
  state = 'epilogue'; cam.menuTarget = 0; attract = false;
  entities.length = 0; particles.length = 0; shockwaves.length = 0; toasts.length = 0; gwRipples.length = 0; boss = null;
  bh.r = bh.rTarget = 20;
  menuEl.classList.add('hidden'); overEl.classList.add('hidden'); hudEl.classList.remove('active');
  $('birthScreen').classList.remove('hidden');
  musicStop();
  if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if(actx && !audioMuted){ blip(41, 6, 'sine', 0.07); blip(61.7, 6, 'sine', 0.035); }
}
function finishEpilogue(){
  if(!EPI.on) return;
  EPI.on = false; EPI.hole = 1; EPI.disc = 1; EPI.stars = 1; EPI.parts = [];
  profile.epilogueSeen = true; saveP();
  for(const id of ['hawking', 'future', 'info']) unlockArchive(id);
  $('birthScreen').classList.add('hidden');
  attract = false; shake = 0;
  backToMenu();
}
function epiEnter(i){
  const s = EPI.steps[i];
  $('bsStep').textContent = (i + 1) + ' / ' + EPI.steps.length;
  $('bsTitle').textContent = s.title; $('bsText').textContent = s.text; $('bsTag').textContent = s.tag;
  if(!actx || audioMuted) return;
  if(i === 5) blip(110, 6.5, 'sine', 0.05, 880);
  else if(i === 6){ blip(1800, 0.9, 'triangle', 0.1, 4000, 4); blip(50, 1.5, 'sine', 0.2, 25, 4.1); }
  else if(i === 7) blip(220, 6, 'sine', 0.025, 196);
  else blip(82.4 / (1 + i * 0.1), 5.5, 'sine', 0.04);
}
function epilogueTick(dt){
  if(!EPI.on) return;
  EPI.t += dt;
  if(EPI.t >= EPI_T()){ finishEpilogue(); return; }
  let i = 0; while(i < EPI.steps.length - 1 && EPI.t >= epiStart(i + 1)) i++;
  if(i !== EPI.step){ EPI.step = i; epiEnter(i); }
  const s = EPI.steps[i], u = clamp01((EPI.t - epiStart(i)) / s.d);
  const yr = Math.pow(10, Math.log10(s.y[0]) + (Math.log10(s.y[1]) - Math.log10(s.y[0])) * u);
  const ck = i === 7 ? 'L\'univers a ' + PHY.sci(yr, 1) + ' ans · plus de trou noir' : 'L\'univers a ' + (yr < 1e12 ? PHY.age(yr) : PHY.sci(yr, 1) + ' ans');
  if(ck !== EPI.clock){ EPI.clock = ck; $('bsClock').textContent = ck; }
  /* lumière des étoiles, matière du disque, taille de l'horizon */
  EPI.stars = i < 2 ? 1 : i === 2 ? 1 - 0.75 * u : i === 3 ? 0.25 * (1 - u) + 0.04 : 0.04 * (i < 7 ? 1 : 1 - u);
  EPI.disc = i < 2 ? 1 - 0.3 * i * u : i === 2 ? 0.7 * (1 - u) : 0;
  /* évaporation : M ∝ (1 − t/t_vie)^⅓ ; à l'écran, le trou fond pendant l'étape 6, puis disparaît */
  EPI.hole = i < 5 ? 1 : i === 5 ? Math.max(0.15, Math.cbrt(1 - u * 0.997)) : i === 6 ? Math.max(0.0001, 0.15 * Math.cbrt(Math.max(0, 1 - u / 0.8))) : 0.0001;
  if(i === 6 && u >= 0.8 && EPI.flash === 0){ EPI.flash = 1; shake = 22; }
  EPI.flash = Math.max(0, EPI.flash - dt * 0.7);
  shake = Math.max(0, shake - dt * 30);
  /* dernières miettes : de moins en moins nombreuses ; maintenir les aspire */
  const supply = i < 2 ? 1 : i < 4 ? 0.35 : 0;
  if(Math.random() < dt * supply * (attract ? 16 : 5)){
    const a = Math.random() * Math.PI * 2, R = Math.hypot(W, H) * 0.5;
    EPI.parts.push({ k:'crumb', x:Math.cos(a) * R, y:Math.sin(a) * R, vx:0, vy:0, life:9 });
  }
  /* rayonnement de Hawking : de plus en plus chaud, de plus en plus intense */
  if(i === 5 || (i === 6 && u < 0.8)){
    const k = i === 5 ? u : 1;
    if(Math.random() < dt * (6 + 70 * k)){
      const a = Math.random() * Math.PI * 2, sp = 120 + 400 * k;
      EPI.parts.push({ k:'hawk', x:Math.cos(a) * bh.r * EPI.hole, y:Math.sin(a) * bh.r * EPI.hole, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, life:1.2 });
    }
  }
  for(let n = EPI.parts.length - 1; n >= 0; n--){
    const p = EPI.parts[n];
    p.life -= dt;
    if(p.k === 'crumb'){
      const d = Math.hypot(p.x, p.y) || 1, g = (attract ? 60000 : 22000) / Math.max(d, 30);
      p.vx += (-p.x / d * g - p.y / d * 30) * dt * 0.01 * 60; p.vy += (-p.y / d * g + p.x / d * 30) * dt * 0.01 * 60;
      if(d < bh.r * EPI.hole){ p.life = 0; EPI.eaten++; }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if(p.life <= 0) EPI.parts.splice(n, 1);
  }
}
function drawEpilogueScene(t){
  const c = sctx, x = bh.x, y = bh.y;
  if(EPI.disc > 0.3) drawInfall(attract ? 1 : 0);
  c.save(); c.globalCompositeOperation = 'lighter';
  for(const p of EPI.parts){
    if(p.k === 'crumb'){ c.fillStyle = 'rgba(255,214,150,' + Math.min(0.9, p.life).toFixed(3) + ')'; c.beginPath(); c.arc(x + p.x, y + p.y, 1.6, 0, Math.PI * 2); c.fill(); }
    else { c.fillStyle = 'rgba(200,225,255,' + Math.min(1, p.life).toFixed(3) + ')'; c.beginPath(); c.arc(x + p.x, y + p.y, 1.3, 0, Math.PI * 2); c.fill(); }
  }
  /* lueur de Hawking : un trou minuscule et brûlant */
  if(EPI.step === 5 || EPI.step === 6){
    const k = EPI.step === 6 ? 1 : clamp01((EPI.t - epiStart(5)) / EPI.steps[5].d), R = bh.r * (1.5 + 2 * k);
    const g = c.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, 'rgba(230,240,255,' + (0.15 + 0.7 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(150,190,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  if(EPI.flash > 0){ c.fillStyle = 'rgba(235,245,255,' + (0.9 * EPI.flash * EPI.flash).toFixed(3) + ')'; c.fillRect(-cam.dx, -cam.dy, W, H); }
}
