/* =========================================================
   GOULU — absorptions et fusions (0.24)
   ---------------------------------------------------------
   Ce que le trou noir avale change sa masse, son spin et sa lumière :
   • Étoile à neutrons (matière) : elle spirale en émettant des ondes
     gravitationnelles. Selon la masse et le spin du trou (ajustement de
     Foucart et al. 2018), elle est déchirée avant l'ISCO (kilonova : or,
     platine, débris à avaler) ou avalée d'un coup, sans lumière.
   • Le Compagnon (boss) : un autre trou noir. Les ondes de choc resserrent
     l'orbite (durcissement de la binaire) ; à la fusion, la masse finale est
     inférieure à la somme (énergie rayonnée en ondes), le spin final vient
     du moment cinétique orbital, l'aire de l'horizon augmente (théorème de
     Hawking), le trou recule.
   • Entropie (∝ aire, ne diminue jamais) : record de partie et de compte.
   • Bilan de ce qui a été absorbé (instruments, fin de partie).
   ========================================================= */
let nsTimer = 75, absorbed = null, runEntropy = 0, massK = 1, runKilonova = 0, runMergers = 0, lastMerger = null;

function mergerReset(){
  nsTimer = 75; massK = 1; runEntropy = 0; runKilonova = 0; runMergers = 0; lastMerger = null;
  absorbed = { gas:0, stars:0, nsWhole:0, kilonova:0, bh:0, anti:0 };
}
/* Ajoute dmSun masses solaires. Au-delà du plafond de jeu (MASS_MAX), le reste est compté dans massK :
   la masse réelle affichée reste juste, la zone de collision ne grossit plus (licence de jeu). */
function addRealMass(dmSun){
  const m0 = realMass(), target = m0 + dmSun;
  bhMass = Math.max(MASS_MIN, Math.min(MASS_MAX, bhMass * target / m0));
  massK *= target / realMass();
}
function entropyNow(){ return PHY.entropyKerr(realMass(), Math.abs(bhSpin)); }

/* ---------- étoile à neutrons ---------- */
/* Spin minimal (aligné) pour la déchirer, ou null si le trou est trop massif. */
function nsSpinNeeded(m){ for(let a = 0; a <= 0.998; a += 0.02) if(PHY.nsRemnant(m, a) > 0.01) return a; return null; }
function spawnNS(){
  const R0 = Math.min(W, H) * 0.44;
  const e = { type:'nstar', x:0, y:0, vx:0, vy:0, r:8, ang:rng() * Math.PI * 2, R0, R:R0, t:0, T:13, gwT:0.5, phase:0, trail:[] };
  nsPlace(e); entities.push(e); unlockArchive('gw');
  const m = realMass(), need = nsSpinNeeded(m);
  const txt = PHY.nsRemnant(m, bhSpin) > 0.01 ? 'ton spin va la déchirer : kilonova'
    : need !== null ? 'spin ≥ ' + PHY.num(need, 2) + ' : kilonova, sinon avalée sans lumière'
    : 'trop massif : tu l\'avaleras d\'un coup';
  addToast('◉ ÉTOILE À NEUTRONS · ' + txt, '#cfe3ff', H/2 + 110);
}
/* Spirale par ondes gravitationnelles : r ∝ (t_c − t)^¼, fréquence qui monte (chirp). */
function nsPlace(e){
  e.R = e.R0 * Math.pow(Math.max(0, 1 - e.t / e.T), 0.25);
  e.x = bh.x + Math.cos(e.ang) * e.R; e.y = bh.y + Math.sin(e.ang) * e.R;
}
function updateNS(e, gdt){
  e.t += gdt;
  const om = Math.min(9, 0.45 * Math.pow(e.R0 / Math.max(e.R, 20), 1.5));
  e.ang -= om * gdt;                       // sens des orbites : un spin a* > 0 est prograde pour elle
  nsPlace(e);
  e.gwT -= gdt * om / Math.PI;             // ondes à deux fois la fréquence orbitale
  if(e.gwT <= 0){
    e.gwT = 1;
    gwRipples.push({ x:(bh.x + e.x) / 2, y:(bh.y + e.y) / 2, r:0, a:0.6 });
    if(actx && !audioMuted) blip(220 + 900 * (1 - e.R / e.R0), 0.07, 'sine', 0.04);
  }
  return e.R <= bh.r * 1.6 || e.t >= e.T;
}
function nsPlunge(e){
  e.dead = true;
  const m = realMass(), f = PHY.nsRemnant(m, bhSpin), out = 1.4 * f, inn = 1.4 - out;
  addRealMass(inn); spinAccrete(inn / m, { orbit:true }); unlockArchive('nsbh');
  gwRipples.push({ x:bh.x, y:bh.y, r:0, a:1 });
  if(f > 0.01){   // déchirée avant l'ISCO : disque, éjecta riches en neutrons, kilonova
    absorbed.kilonova++; runKilonova++;
    profile.kilonovas = (profile.kilonovas || 0) + 1; saveP();
    let n = 0;
    for(const o of entities){
      if(o.dead || o.type !== 'anti' || Math.hypot(o.x - e.x, o.y - e.y) > 260 * PHYS) continue;
      o.dead = true; n++; burst(o.x, o.y, '#ffd27a', 10, 300);
    }
    const k = clamp(Math.round(f * 70), 4, 14);
    for(let i = 0; i < k && entities.length < ENTITY_CAP; i++){
      const a = i / k * Math.PI * 2, x = e.x + Math.cos(a) * 36, y = e.y + Math.sin(a) * 36;
      entities.push({ x, y, vx:-Math.sin(a) * 70 * PHYS, vy:Math.cos(a) * 70 * PHYS, r:R_DUST, type:'dust', dustType:'gold', phase:rng() * Math.PI * 2, trail:[] });
    }
    addScore(Math.round((250 + 30 * n + 20 * k) * mulK(multiplier * scoreK(false))));
    burst(e.x, e.y, '#ffffff', 60, 800); burst(e.x, e.y, '#ffb347', 70, 650); burst(e.x, e.y, '#ff5c8a', 40, 500);
    parryFlash = Math.max(parryFlash, reduceFx() ? 0.4 : 1); shake = Math.max(shake, 26); aliveJet(0.8); vibrate([40, 30, 70]);
    addToast('✷ KILONOVA · déchirée avant l\'ISCO, ' + PHY.num(out, 2) + ' M☉ éjectés (or, platine)', '#ffd27a', H/2 - 120);
    thoughtOnce('kilonova', 'Elle a éclaté avant de m\'atteindre. De l\'or partout.');
    if(actx && !audioMuted){ blip(90, 1, 'sawtooth', 0.16, 40); [659.25, 830.6, 987.8, 1318.5].forEach((fq, i) => blip(fq, 0.5, 'triangle', 0.08, undefined, 0.08 + i * 0.07)); }
  } else {        // trop massif ou trop lent : elle franchit l'horizon entière, sans un éclat
    absorbed.nsWhole++;
    addScore(Math.round(120 * mulK(multiplier * scoreK(false))));
    shake = Math.max(shake, 10);
    addToast('◉ AVALÉE D\'UN COUP · +1,4 M☉, aucune lumière (comme GW200105)', '#cfe3ff', H/2 - 120);
    thoughtOnce('nswhole', 'Pas un éclat. Juste un frisson de l\'espace.');
    if(actx && !audioMuted) blip(55, 0.8, 'sine', 0.18, 30);
  }
}
function drawNStar(e, t){
  const c = sctx, x = e.x, y = e.y;
  c.save(); c.globalCompositeOperation = 'lighter';
  const rot = t * 9 + e.phase;   // faisceaux de pulsar
  for(const s of [0, Math.PI]){
    const a = rot + s, L = 46;
    const g = c.createLinearGradient(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L);
    g.addColorStop(0, 'rgba(200,225,255,.55)'); g.addColorStop(1, 'rgba(200,225,255,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x, y);
    c.lineTo(x + Math.cos(a - 0.12) * L, y + Math.sin(a - 0.12) * L); c.lineTo(x + Math.cos(a + 0.12) * L, y + Math.sin(a + 0.12) * L);
    c.closePath(); c.fill();
  }
  c.drawImage(glowSprite('nstar', [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(190,220,255,.8)'], [0.6, 'rgba(120,170,255,.15)'], [1, 'rgba(120,170,255,0)']], 28), x - 28, y - 28, 56, 56);
  c.restore();
}

/* ---------- le Compagnon : binaire de trous noirs ---------- */
const COMPANION_HINT = 'Tes ondes resserrent son orbite · à la fusion, il devient toi';
function spawnCompanion(){
  const R0 = Math.min(250, Math.min(W, H) * 0.4);
  const e = { x:0, y:0, vx:0, vy:0, r:24, type:'boss', bossPart:true, isMain:true, companion:true,
    ang:rng() * Math.PI * 2, R:R0, R0, q:0.45 + rng() * 0.45, gwT:0.5, phase:0, trail:[] };
  unlockArchive('gw');
  compPlace(e);
  return e;
}
function compMinR(e){ return bh.r + e.r + 26 * PHYS; }
function compPlace(e){ e.x = bh.x + Math.cos(e.ang) * e.R; e.y = bh.y + Math.sin(e.ang) * e.R; }
function updateCompanion(e, gdt){
  const om = Math.min(4, 0.5 * Math.pow(e.R0 / Math.max(e.R, 40), 1.5)) * (boss.enraged ? 1.25 : 1);
  e.ang -= om * gdt;
  /* rayonnement gravitationnel : dR/dt ∝ −1/R³ (Peters) ; aspirer le freine (friction) et le rapproche */
  e.R = Math.max(compMinR(e), e.R - gdt * (0.9 + (attract ? 3 : 0)) * PHYS * Math.pow(e.R0 / e.R, 3));
  compPlace(e);
  /* sa gravité vole la poussière proche et courbe l'antimatière */
  for(const o of entities){
    if(o.dead || o === e || o.bossPart || o.orbit || (o.type !== 'dust' && o.type !== 'anti')) continue;
    const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || 1;
    if(o.type === 'dust' && d < e.r + 6){ o.dead = true; e.ate = (e.ate || 0) + 1; burst(o.x, o.y, '#ffb56e', 6, 200); continue; }
    if(d < 230 * PHYS){ const f = 26000 * PHYS * PHYS / Math.max(d, 60); o.vx += dx / d * f * gdt; o.vy += dy / d * f * gdt; }
  }
  e.gwT -= gdt * om / Math.PI;
  if(e.gwT <= 0){
    e.gwT = 1;
    gwRipples.push({ x:(bh.x + e.x) / 2, y:(bh.y + e.y) / 2, r:0, a:0.7 });
    if(actx && !audioMuted) blip(90 + 500 * (1 - e.R / e.R0), 0.12, 'sine', 0.05);
  }
  if(e.R <= compMinR(e) + 0.5) damageBoss(boss.hp, e.x, e.y);   // les ondes seules finissent par les fusionner
}
/* Durcissement de la binaire : une onde de choc lui retire de l'énergie orbitale, seulement s'il est
   assez proche (sinon le gaz entre vous est trop dilué). Renvoie true si l'orbite s'est resserrée. */
const COMP_REACH = 190;
function companionHit(e){
  if(e.R > COMP_REACH * PHYS){
    if(seenOnce('compfar')) addToast('TROP LOIN · aspire pour le rapprocher, puis frappe', '#ffb56e', H/2 - 60);
    return false;
  }
  e.R = Math.max(compMinR(e), e.R * 0.9);
  return true;
}
function companionMerge(e){
  const m1 = realMass(), m2 = m1 * (e && e.q ? e.q : 0.7), a1 = Math.abs(bhSpin);
  const r = PHY.merger(m1, m2, a1);
  addRealMass(r.mf - m1);
  bhSpin = r.af; discJ = Math.max(discJ, 0.3);   // le moment cinétique orbital devient le spin (sens des orbites)
  absorbed.bh++; runMergers++; unlockArchive('bbh'); lastMerger = Object.assign({ m1, m2 }, r);
  profile.bbhMergers = (profile.bbhMergers || 0) + 1; saveP();
  for(let k = 0; k < 3; k++) gwRipples.push({ x:bh.x, y:bh.y, r:-k * 60, a:1 });
  shake = Math.max(shake, 18 + Math.min(24, r.kick / 8)); aliveJet(1);
  addToast('⚫ FUSION · ' + PHY.num(m1, 1) + ' + ' + PHY.num(m2, 1) + ' → ' + PHY.num(r.mf, 1) + ' M☉', '#ffb56e', H/2 - 160);
  setTimeout(() => { if(state === 'play') addToast('ONDES GRAVITATIONNELLES · ' + PHY.num(r.eradMsun, 2) + ' M☉ rayonnés (' + PHY.num(r.erad * 100, 1) + ' %)', '#c9a6ff', H/2 - 125); }, 900);
  setTimeout(() => { if(state === 'play') addToast('SPIN ' + PHY.num(r.af, 2) + ' · RECUL ' + Math.round(r.kick) + ' km/s · AIRE +' + Math.round(r.areaGain * 100) + ' % (Hawking)', '#9fd4ff', H/2 - 90); }, 1800);
  thought('Nous ne faisons plus qu\'un. J\'ai perdu un peu de moi en ondes.');
  if(actx && !audioMuted){ blip(50, 1.2, 'sine', 0.2, 900); blip(900, 1.6, 'sine', 0.08, 640, 1.2); }
}
function drawCompanion(e, t){
  const c = sctx, x = e.x, y = e.y, r = e.r;
  c.save(); c.globalCompositeOperation = 'lighter';
  c.translate(x, y); c.rotate(-0.25); c.scale(1, 0.32);
  const g = c.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 2.6);
  g.addColorStop(0, 'rgba(255,214,150,.75)'); g.addColorStop(0.5, 'rgba(255,150,70,.3)'); g.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 2.6, 0, Math.PI * 2); c.fill();
  c.restore();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill();
  c.strokeStyle = 'rgba(255,236,200,' + (boss && boss.hitFlash > 0 ? 1 : 0.8) + ')'; c.lineWidth = 1.6; c.stroke();
}

/* ---------- une image de jeu ---------- */
function mergerTick(gdt){
  runEntropy = Math.max(runEntropy, entropyNow());
  if(boss || sgr || !cosmosOn() || (birth && birth.id === 'primordial')) return;   // un trou de 5×10¹¹ kg ne croise pas d'étoile à neutrons
  nsTimer -= gdt;
  if(nsTimer <= 0){
    nsTimer = 85 + rng() * 25;
    if(!entities.some(e => e.type === 'nstar')) spawnNS();
  }
}

/* ---------- bilan ---------- */
function absorbedRows(){
  if(!absorbed) return [];
  const a = absorbed, rows = [['Gaz et poussière', PHY.num(a.gas, 2) + ' M☉']];
  if(a.stars) rows.push(['Étoiles déchirées', String(a.stars)]);
  if(a.nsWhole || a.kilonova) rows.push(['Étoiles à neutrons', a.nsWhole + ' avalée' + (a.nsWhole > 1 ? 's' : '') + ' entière' + (a.nsWhole > 1 ? 's' : '') + ' · ' + a.kilonova + ' kilonova' + (a.kilonova > 1 ? 's' : '')]);
  if(a.bh) rows.push(['Trous noirs (fusions)', String(a.bh)]);
  if(a.anti) rows.push(['Antimatière (disque soufflé)', String(a.anti)]);
  if(lastMerger) rows.push(['Dernière fusion', PHY.num(lastMerger.m1, 1) + ' + ' + PHY.num(lastMerger.m2, 1) + ' → ' + PHY.num(lastMerger.mf, 1) + ' M☉ · recul ' + Math.round(lastMerger.kick) + ' km/s']);
  return rows;
}
