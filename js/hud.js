/* GOULU — helpers de jeu, modificateurs, HUD */
/* =========================================================
   Utils
   ========================================================= */
/* Le score reste entier ; les fractions issues des multiplicateurs (×1,05, ×1,5…)
   sont cumulées à part, pour qu'aucun bonus ne soit perdu à l'arrondi. */
function addScore(v){
  if(!(v > 0)) return;
  scoreFrac += v;
  const whole = Math.floor(scoreFrac + 1e-9);
  score += whole; scoreFrac -= whole;
}
/* Commandes : par défaut 2 commandes séparées (ASPIRER maintenu, ONDE à la demande).
   L'ancien mode « 1 seul bouton » (relâcher = onde) reste disponible dans les options. */
function dualControls(){ return !profile.options || profile.options.controls !== 'single'; }
function touchUI(){ return document.body.classList.contains('touch'); }
const CONTROL_TEXT = {
  //           2 boutons, ordinateur | 2 boutons, tactile | 1 bouton
  howtoHold: ['<b>Maintiens</b> ESPACE, la flèche <b>←</b> ou le clic gauche : tu aspires tout.',
              '<b>Maintiens</b> ton doigt sur l\'écran (repère ASPIRER en bas à gauche) : tu aspires tout.',
              '<b>Maintiens</b> le clic / ESPACE (ou ton doigt, en bas de l\'écran) : tu aspires tout.'],
  howtoWave: ['<b>F</b>, la flèche <b>→</b>, Entrée ou <b>clic droit</b> : onde de choc qui détruit l\'antimatière.',
              'Bouton <b>ONDE</b> en bas à droite : onde de choc qui détruit l\'antimatière.',
              '<b>Relâche</b> : onde de choc qui détruit l\'antimatière.'],
  howtoBeat: ['<b>Onde sur le kick</b> : <span style="color:var(--gold)">PULSE</span>, onde +20 %, points ×1,5. 4 pulses = <b>résonance</b>.',
              '<b>Onde sur le kick</b> : <span style="color:var(--gold)">PULSE</span>, onde +20 %, points ×1,5. 4 pulses = <b>résonance</b>.',
              '<b>Relâche sur le kick</b> : <span style="color:var(--gold)">PULSE</span>, onde +20 %, points ×1,5. 4 pulses = <b>résonance</b>.'],
  howtoBoss: ['Boss : <b>aspire-le</b>, puis lance l\'<b>onde</b> quand il est proche pour le frapper.',
              'Boss : <b>aspire-le</b>, puis lance l\'<b>onde</b> quand il est proche pour le frapper.',
              'Boss : <b>maintiens</b> pour l\'aspirer, <b>relâche</b> près de lui pour frapper.'],
  hint:      ['ESPACE / ← / clic gauche : aspirer · F / → / clic droit : onde · Sur le kick = pulse',
              'Doigt posé : aspirer · Bouton ONDE : onde',
              'Maintiens pour aspirer · Relâche pour l\'onde · Sur le kick = pulse'],
  bossHint:  ['ASPIRE le boss · ONDE près de lui pour frapper',
              'ASPIRE le boss · ONDE près de lui pour frapper',
              'MAINTIENS pour aspirer · RELÂCHE pour frapper'],
  tut0:      ['Maintiens <b>ESPACE</b>, la flèche <b>←</b> ou le <b>clic gauche</b> pour <b>attirer</b> la poussière dorée.',
              'Maintiens ton doigt sur l\'écran (repère <b>ASPIRER</b>) pour <b>attirer</b> la poussière dorée.',
              'Maintiens le clic, <b>ESPACE</b> ou ton doigt (en bas de l\'écran) pour <b>attirer</b> la poussière dorée.'],
  tut1:      ['Appuie sur <b>F</b>, la flèche <b>→</b> (ou clic droit) pour déclencher une <b>ONDE DE CHOC</b>.',
              'Appuie sur le bouton <b>ONDE</b> (en bas à droite) pour déclencher une <b>ONDE DE CHOC</b>.',
              'Relâche pour déclencher une <b>ONDE DE CHOC</b>.'],
  tut2:      ['Lance l\'onde quand l\'antimatière entre dans le <b>cercle</b> pointillé.',
              'Appuie sur <b>ONDE</b> quand l\'antimatière entre dans le <b>cercle</b> pointillé.',
              'Relâche quand l\'antimatière entre dans le <b>cercle</b> pointillé.'],
  bossToast1:['👇 ASPIRE le boss', '👇 ASPIRE le boss', '👇 MAINTIENS pour ASPIRER le boss'],
  bossToast2:['👆 ONDE pour le FRAPPER !', '👆 ONDE pour le FRAPPER !', '👆 RELÂCHE pour FRAPPER !'],
  deathTiming:['Tu avais une charge ! Lance l\'onde plus tôt pour le <b>PARRY</b>.',
               'Tu avais une charge ! Appuie sur <b>ONDE</b> plus tôt pour le <b>PARRY</b>.',
               'Tu avais une charge ! Relâche plus tôt pour le <b>PARRY</b>.'],
  pulsarHint:['ONDE quand le faisceau te touche · ASPIRE-le : renvois ×2',
              'ONDE quand le faisceau te touche · ASPIRE-le : renvois ×2',
              'RELÂCHE quand le faisceau te touche · MAINTIENS : renvois ×2'],
  pulsarToast:['⚡ ONDE quand le FAISCEAU te touche !', '⚡ ONDE quand le FAISCEAU te touche !', '⚡ RELÂCHE quand le FAISCEAU te touche !'],
  deathPulsar:['Le faisceau du Pulsar t\'a traversé. Lance l\'<b>onde</b> au moment où il te touche, sur le battement.',
               'Le faisceau du Pulsar t\'a traversé. Appuie sur <b>ONDE</b> au moment où il te touche, sur le battement.',
               'Le faisceau du Pulsar t\'a traversé. <b>Relâche</b> au moment où il te touche, sur le battement.'],
  beatHint:  ['Essaie de lancer l\'onde pile sur le battement.', 'Essaie de lancer l\'onde pile sur le battement.',
              'Essaie de relâcher pile sur le battement.']
};
function ctl(key){ const t = CONTROL_TEXT[key]; return t[dualControls() ? (touchUI() ? 1 : 0) : 2]; }
function getMaxCharges(){ return BASE_MAX_CHARGES + (mods ? (mods.maxCharges - BASE_MAX_CHARGES) : 0); }
/* Multiplicateur de score. scoreMult : règles du mode et du défi (Métronome, Fragile…).
   anomScore × fm() : mutations (Faim, Pacte Noir, Fureur, Kamikaze), plafonnées à ×4
   hors mode Chaos (×6 avec la fusion Singularité nue), pour qu'un tirage chanceux ne fasse
   pas ×10 sur une partie normale. Puis palier de la partie infinie et masse du trou. */
const ANOM_SCORE_CAP = 4;
function scoreK(withFm){
  if(!mods) return 1;
  let a = (mods.anomScore || 1) * (withFm ? fm() : 1);
  if(currentMode.id !== 'chaos') a = Math.min(mods.scoreCap || ANOM_SCORE_CAP, a);
  return mods.scoreMult * a * tierScore() * (cosmosOn() ? cosmosScore() : 1);   // paliers, disque et masse : hors plafond
}
/* Fenêtre du combo : liée à la fenêtre de chaîne (Réflexe), plus le bonus permanent Combo Long. */
function comboWindow(){ return mods ? mods.chainWindow*1.2 + (mods.comboBonus||0) : COMBO_MAX; }
function getDustPerCharge(){ return mods ? mods.dustPerCharge : BASE_DUST_PER_CHG; }
function pickDustType(){
  if(currentCampaignLevel){
    const w = currentCampaignLevel.weights || {gold:1,blue:0,red:0,white:0};
    const r = rng();
    let acc = 0;
    acc += w.gold; if(r<acc) return 'gold';
    acc += w.blue; if(r<acc) return 'blue';
    acc += w.red;  if(r<acc) return 'red';
    return 'white';
  }
  const w = currentMode.useWaves && WAVES[waveIndex] ? WAVES[waveIndex].weights : {gold:0.7,blue:0.15,red:0.1,white:0.05};
  const r = rng();
  let acc = 0;
  acc += w.gold; if(r<acc) return 'gold';
  acc += w.blue; if(r<acc) return 'blue';
  acc += w.red;  if(r<acc) return 'red';
  return 'white';
}

/* =========================================================
   Permanent upgrades (V9)
   ========================================================= */
function applyPermanentUpgrades(m){
  for(const u of UPGRADES){
    if(profile.upgrades[u.id]){
      try{ u.apply(m); }catch(e){}
    }
  }
  if(profile.techniques.dashparry) m.dashparryEnabled = true;
  if(profile.techniques.echochain) m.echochainEnabled = true;
  if(profile.techniques.momentum) m.momentumEnabled = true;
}

/* =========================================================
   Core: modifiers
   ========================================================= */
function newMods(noPerm){
  const m = {
    attractMult:1, shockRadiusMult:1, repelMult:1, dustValue:1,
    dustPerCharge:BASE_DUST_PER_CHG, maxCharges:BASE_MAX_CHARGES,
    bonusLives:0, parryRangeMult:1, chainCap:4,
    chainWindow:PARRY_CHAIN_WINDOW, comboBonus:0, scoreMult:1, anomScore:1, antiSpawnMult:1,
    invincBonus:0, startAnomalies:0,
    echo:false, fureur:false, vampire:false,
    dashparryEnabled:false, echochainEnabled:false, momentumEnabled:false
  };
  if(!noPerm) applyPermanentUpgrades(m);
  return m;
}

/* =========================================================
   Hearts & pips
   ========================================================= */
function buildHearts(){
  heartsEl.innerHTML='';
  for(let i=0;i<maxLivesRun;i++){
    const seg=document.createElement('div');
    seg.className='heart'+(i>=lives?' lost':'');
    seg.dataset.i=i;
    heartsEl.appendChild(seg);
  }
}
function buildPips(){
  chargesEl.innerHTML='';
  const max=getMaxCharges();
  for(let i=0;i<max;i++){ const p=document.createElement('div'); p.className='pip'; chargesEl.appendChild(p); }
}

/* =========================================================
   HUD sync
   ========================================================= */
let lastScore=-1,lastLives=-1,lastCharges=-1,lastMult=-1,lastProg=-1;
function syncHUD(){
  if(heartsEl.children.length !== maxLivesRun){ buildHearts(); lastLives = -1; }
  if(score!==lastScore){
    scoreHudEl.textContent=fmtScore(score); lastScore=score;
    scoreHudEl.classList.remove('bump'); void scoreHudEl.offsetWidth;
    scoreHudEl.classList.add('bump');
    setTimeout(()=>scoreHudEl.classList.remove('bump'),130);
  }
  if(lives!==lastLives){
    const hearts=heartsEl.querySelectorAll('.heart');
    hearts.forEach((h,i)=>{
      const isLost=i>=lives;
      if(isLost && !h.classList.contains('lost')){
        h.classList.add('losing');
        setTimeout(()=>{h.classList.remove('losing');h.classList.add('lost');},420);
      } else if(!isLost) h.classList.remove('lost');
    });
    lastLives=lives;
  }
  if(multiplier!==lastMult){
    if(multiplier>1){ multChip.textContent='×'+multiplier; multChip.classList.add('on'); }
    else multChip.classList.remove('on');
    lastMult=multiplier;
  }
  const pTxt = resonanceT > 0 ? '🎵 RÉSONANCE ' + Math.ceil(resonanceT) + 's' : (pulseStreak > 0 ? '🎵 PULSE ×' + pulseStreak : '');
  if(pTxt !== lastPulseTxt){
    pulseChip.textContent = pTxt; pulseChip.classList.toggle('on', !!pTxt);
    pulseChip.classList.toggle('reso', resonanceT > 0); lastPulseTxt = pTxt;
  }
  if(combo>0){
    comboTrack.classList.add('on');
    comboFill.style.transform='scaleX('+Math.max(0,Math.min(1,comboTimer/comboWindow()))+')';
  } else {
    comboTrack.classList.remove('on');
    comboFill.style.transform='scaleX(0)';
  }
  if(elemChain.type && elemChain.count > 0){
    elemTrack.classList.add('on');
    elemFill.style.background = DUST_TYPES[elemChain.type].color;
    elemFill.style.transform = 'scaleX('+(elemChain.count/ELEM_CHAIN_REQ)+')';
  } else {
    elemTrack.classList.remove('on');
    elemFill.style.transform = 'scaleX(0)';
  }
  if(shockCharges!==lastCharges){
    const pips=chargesEl.querySelectorAll('.pip');
    pips.forEach((p,i)=>{
      const isOn=i<shockCharges;
      p.classList.toggle('on',isOn);
      p.classList.toggle('max',isOn && shockCharges>=getMaxCharges());
    });
    lastCharges=shockCharges;
  }
  const prog = shockCharges>=getMaxCharges() ? 100 : Math.floor((dustSinceCharge/getDustPerCharge())*100);
  if(prog!==lastProg){ pipFillEl.textContent=prog+'%'; lastProg=prog; }
  let duration = currentMode.duration;
  if(currentCampaignLevel) duration = currentCampaignLevel.duration;
  if(duration>0){
    blitzTimerEl.classList.add('on');
    const rem = Math.max(0, duration - elapsed);
    const tTxt = rem.toFixed(1)+'s';
    if(blitzTimerEl.textContent !== tTxt) blitzTimerEl.textContent = tTxt;
    if(rem <= 5) blitzTimerEl.classList.add('warn');
    else blitzTimerEl.classList.remove('warn');
  } else {
    blitzTimerEl.classList.remove('on','warn');
  }
  syncCosmosHUD();
  syncTouchControls();
  updateGhostPace();
}
/* Masse réelle du trou noir, disque d'accrétion (λ = Ṁ / Ṁ_Edd) et palier de la partie infinie */
let lastMassTxt = '', lastTierTxt = '', lastContractTxt = '', lastPhysTxt = '';
function syncCosmosHUD(){
  const on = cosmosOn() && state !== 'tutorial';
  const mm = $('massMeter'); if(!mm) return;
  mm.classList.toggle('on', on);
  if(on){
    const lam = eddRatio();
    const txt = PHY.num(realMass(), 1) + ' M☉|' + Math.round(Math.min(lam, 1.5) * 20);
    if(txt !== lastMassTxt){
      lastMassTxt = txt;
      $('massVal').textContent = txt.split('|')[0];
      $('massFill').style.transform = 'scaleX(' + Math.min(1, lam / 1.5).toFixed(3) + ')';   // repère à 2/3 : λ = 1
      mm.classList.toggle('low', lam < 0.12 && elapsed > 10);
      mm.classList.toggle('high', lam > 1);
      $('massEdd').classList.toggle('on', lam > 1);
    }
  }
  const pt = on ? physLine() : '';
  if(pt !== lastPhysTxt){ lastPhysTxt = pt; const c = $('physChip'); c.textContent = pt; c.classList.toggle('on', !!pt); }
  const ct = contract ? (contractDone ? '◇ ✓ ' : '◇ ') + contract.name : '';
  if(ct !== lastContractTxt){ lastContractTxt = ct; const c = $('contractChip'); c.textContent = ct; c.classList.toggle('on', !!ct); c.classList.toggle('done', contractDone); }
  const tt = tier > 0 ? 'PALIER ' + tier + ' · ' + tierName(tier) + (sector ? ' · ' + sector.name : '') : '';
  if(tt !== lastTierTxt){ lastTierTxt = tt; const c = $('tierChip'); c.textContent = tt; c.classList.toggle('on', !!tt); }
}
/* Boutons tactiles : aspiration en cours, charges restantes sur le bouton ONDE */
let lastTcKey = '';
function syncTouchControls(){
  if(!touchUI() || !dualControls()) return;
  const noShock = !!currentMode.noShock, tut = state === 'tutorial';   // au tutoriel, l'onde est gratuite
  const key = (attract ? 1 : 0) + ':' + shockCharges + ':' + (noShock ? 1 : 0) + ':' + (tut ? 1 : 0);
  if(key === lastTcKey) return; lastTcKey = key;
  $('btnHold').classList.toggle('on', attract);
  $('waveLabel').textContent = noShock ? 'Parry' : 'Onde';
  $('waveSub').textContent = tut ? 'appuie' : noShock ? 'au contact' : shockCharges + (shockCharges > 1 ? ' charges' : ' charge');
  $('btnWave').classList.toggle('empty', !tut && !noShock && shockCharges <= 0);
}
function updateGhostPace(){
  const gk = Math.floor(elapsed)+':'+score; if(gk === lastGhostKey) return; lastGhostKey = gk;
  if(!currentPace.length){ ghostPaceEl.classList.remove('on','ahead','behind'); return; }
  const ghost = getBestGhostPace();
  if(!ghost || ghost.length < 2){ ghostPaceEl.classList.remove('on','ahead','behind'); return; }
  const sec = Math.floor(elapsed);
  const ghostScore = ghost[sec];
  if(ghostScore === undefined){ ghostPaceEl.classList.remove('on','ahead','behind'); return; }
  const delta = score - ghostScore;
  if(delta>=0){ ghostPaceEl.textContent='★ +'+delta; ghostPaceEl.classList.add('ahead'); ghostPaceEl.classList.remove('behind'); }
  else { ghostPaceEl.textContent='▼ '+delta; ghostPaceEl.classList.add('behind'); ghostPaceEl.classList.remove('ahead'); }
  ghostPaceEl.classList.add('on');
}
function getBestGhostPace(){
  if(currentCampaignLevel){
    const r = profile.replays['c'+currentCampaignLevel.n];
    return r && r.pacing ? r.pacing : null;
  }
  const r = profile.replays[currentMode.id];
  return r && r.pacing ? r.pacing : (currentMode.id==='classic' ? profile.bestRunPace : null);
}
function renderBuildBar(){
  buildBarEl.innerHTML='';
  for(const a of activeAnomalies){
    const data = anomDef(a.id);
    if(!data) continue;
    const el=document.createElement('div');
    el.className='build-slot';
    el.innerHTML = data.icon + (a.stacks>1 ? '<span class="stk">'+a.stacks+'</span>' : '');
    buildBarEl.appendChild(el);
  }
}
