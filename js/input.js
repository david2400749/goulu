/* GOULU — entrées clavier / souris / tactile, pause
   ---------------------------------------------------------
   2 commandes séparées (par défaut) :
     ASPIRER  maintenir : ESPACE / clic gauche / doigt posé n'importe où
     ONDE     appui     : F / Entrée / clic droit / bouton ONDE à l'écran
   Mode « 1 seul bouton » (option) : relâcher l'aspiration déclenche l'onde. */
const HOLD_KEYS = ['Space', 'ArrowUp'];
const WAVE_KEYS = ['KeyF', 'KeyJ', 'Enter'];
const isHoldKey = c => HOLD_KEYS.includes(c) || (!dualControls() && c === 'Enter');
const isWaveKey = c => dualControls() && WAVE_KEYS.includes(c);
const inGame = () => state === 'play' || state === 'tutorial' || state === 'resume';

function onDown(e){
  if(e && e.target && e.target.closest && e.target.closest('button')) return;
  if(state==='anomaly' || state==='paused' || state==='revive') return;
  if(state==='resume'){ attract = true; return; }   // on peut déjà maintenir pendant le décompte
  if(state==='menu'){ initAudio(); return; }
  if(state==='campdone' || state==='victory' || state==='finale') return;
  if(e && e.cancelable) e.preventDefault();
  initAudio();
  if(state==='tutorial'){ attract = true; return; }
  if(state==='over'){
    if(e && e.target && e.target.closest && e.target.closest('.over-panel')) return;
    if(overCd<=0){
      if(currentCampaignLevel) startCampaignLevel(currentCampaignLevel.n);
      else startGame(currentMode.id, lastGameWasDaily);
      attract=true;
    }
    return;
  }
  if(state==='play') attract=true;
}

/* Fin de l'aspiration. En mode 1 bouton, c'est aussi le déclencheur de l'onde. */
function onUp(){
  if(state==='tutorial'){
    if(attract && !dualControls()) fireWave();
    attract = false;
    return;
  }
  if(state==='resume'){ attract = false; return; }
  if(state!=='play') return;
  if(attract && !dualControls()) fireWave();
  attract=false;
}

/* ONDE : onde de choc (ou parry au contact dans les modes sans onde). */
function fireWave(){
  if(state==='tutorial'){
    if(tutorialStep === 1 || tutorialStep === 2){
      shockwaves.push({r:bh.r, maxR:SHOCK_MAX_R, life:SHOCK_LIFE, maxLife:SHOCK_LIFE, hit:new Set(), isEcho:false});
      if(actx && !audioMuted) blip(180,0.22,'sawtooth',0.13,90);
      pressWaveBtn();
    }
    return;
  }
  if(state!=='play') return;
  pressWaveBtn();
  if(pulsarTryReflect()) return;   // renvoi du faisceau du Pulsar : gratuit, sans onde
  if(currentMode.noShock){
    const range = parryR();
    let hitAny = false;
    const pu = isOnBeat(), pm = pu ? 1.5 : 1;
    for(let i=entities.length-1;i>=0;i--){
      const e=entities[i];
      if(!e || e.dead || e.pulsar || (e.type!=='anti' && !e.bossPart)) continue;
      const dx=bh.x-e.x, dy=bh.y-e.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d >= range) continue;
      hitAny = true;
      doParry(e, pm, 'contact');
      combo++; comboTimer=comboWindow();
      if(combo>maxCombo) maxCombo=combo;
      if(e.bossPart){
        damageBoss(1, e.x, e.y);
        if(boss && boss.type.id==='swarm'){ boss.parts = boss.parts.filter(p=>p!==e); entities.splice(i,1); }
        else if(boss) knockBoss(e, dx/(d||1), dy/(d||1), 40);
        if(!boss) break;
      } else entities.splice(i,1);
    }
    if(hitAny && pu) registerPulse();
    if(!hitAny) blip(180,0.12,'sine',0.05,90);
  } else if(shockCharges > 0){
    shockCharges--;
    const pu = isOnBeat();
    spawnShockwave(false, pu);
    if(resonanceT > 0) pendingEchoes.push({time:0.35});
    if(!pu && currentMode.beatOnly) addToast('HORS TEMPO', '#9aa0c8');
  } else {
    noChargeFeedback();
  }
}
/* ONDE sans charge : en début de partie on n'en a aucune. On le dit clairement au lieu d'un
   simple petit son, sinon le joueur croit que la commande ne marche pas. */
let lastNoChargeAt = -99;
function noChargeFeedback(){
  blip(150,0.1,'sine',0.05,110);
  const b = $('btnWave');
  if(b){ b.classList.remove('deny', 'press'); void b.offsetWidth; b.classList.add('deny'); }
  vibrate(15);
  const now = performance.now() / 1000;
  if(now - lastNoChargeAt < 2.5) return;
  lastNoChargeAt = now;
  const n = Math.max(1, getDustPerCharge() - dustSinceCharge);
  addToast('PAS DE CHARGE · avale ' + n + ' poussière' + (n > 1 ? 's' : ''), '#ffcb4d', H/2 + 70);
}
function pressWaveBtn(){
  const b = $('btnWave'); if(!b) return;
  b.classList.remove('press', 'deny'); void b.offsetWidth; b.classList.add('press');
}

/* ---------- souris ---------- */
window.addEventListener('mousedown', e => {
  if(state === 'menu' && e.button === 0 && menuTapTarget(e.target)) menuTap(e.clientX, e.clientY);
  const onWaveBtn = e.target && e.target.closest && e.target.closest('#btnWave');
  if(e.button === 2 || onWaveBtn){
    if(dualControls() && inGame()){ initAudio(); fireWave(); }
    else if(!dualControls() && onWaveBtn) onDown(e);
    return;
  }
  if(e.button === 0) onDown(e);
});
window.addEventListener('mouseup', e => { if(e.button === 0) onUp(); });

/* ---------- tactile ----------
   2 commandes : chaque doigt posé hors du bouton ONDE fait aspirer ; l'aspiration
   cesse quand plus aucun de ces doigts n'est posé. Un appui sur ONDE tire l'onde
   sans interrompre l'aspiration de l'autre doigt. */
const holdTouches = new Set();
/* Zone tactile du bouton ONDE plus large que le cercle dessiné : un pouce qui tombe juste à côté tire quand même. */
function waveHitZone(){
  const b = $('btnWave'); if(!b) return null;
  const r = b.getBoundingClientRect(); if(!r.width) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 * 1.45 };
}
function enableTouchUI(){ if(!touchUI()){ document.body.classList.add('touch'); applyControls(); } }
function dropTouches(e){
  for(const t of e.changedTouches) holdTouches.delete(t.identifier);
  const live = new Set(Array.from(e.touches || [], t => t.identifier));
  for(const id of Array.from(holdTouches)) if(!live.has(id)) holdTouches.delete(id);
}
window.addEventListener('touchstart', e => {
  if(state === 'menu' && e.touches && e.touches[0] && menuTapTarget(e.target)) menuTap(e.touches[0].clientX, e.touches[0].clientY);
  enableTouchUI();
  if(!dualControls() || !inGame()){ onDown(e); return; }
  if(e.target && e.target.closest && e.target.closest('button')) return;   // pause, son…
  if(e.cancelable) e.preventDefault();
  initAudio();
  const wr = waveHitZone();
  for(const t of e.changedTouches){
    const onWave = (t.target && t.target.closest && t.target.closest('#btnWave'))
      || (wr && Math.hypot(t.clientX - wr.x, t.clientY - wr.y) <= wr.r);
    if(onWave) fireWave();
    else holdTouches.add(t.identifier);
  }
  attract = holdTouches.size > 0;
}, {passive:false});
window.addEventListener('touchend', e => {
  if(dualControls()){
    dropTouches(e);
    if(attract && holdTouches.size === 0) onUp();
    return;
  }
  holdTouches.clear();
  /* 1 bouton : l'onde ne part qu'au lever du dernier doigt */
  if(e.touches && e.touches.length > 0) return;
  onUp();
});
/* Interruption par le système (notification, geste) : on relâche sans tirer d'onde. */
window.addEventListener('touchcancel', e => {
  dropTouches(e);
  if(dualControls() ? holdTouches.size === 0 : !(e.touches && e.touches.length > 0)) attract = false;
});
/* iOS Safari : pas de zoom au pincement pendant le jeu. */
document.addEventListener('gesturestart', e => e.preventDefault());
window.addEventListener('blur',()=>{ attract=false; holdTouches.clear(); if(state==='play') togglePause(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ attract=false; holdTouches.clear(); if(state==='play') togglePause(); } });
window.addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- clavier ---------- */
window.addEventListener('keydown',e=>{
  if(document.activeElement && document.activeElement.id === 'nameInput'){   // saisie du nom : on laisse taper
    if(e.code === 'Escape') closeNameModal();
    return;
  }
  if(!$('resetModal').classList.contains('hidden')){       // confirmation d'effacement : Échap annule, le reste est géré par le bouton
    if(e.code==='Escape') closeResetModal();
    return;
  }
  if(!optionsScreen.classList.contains('hidden')){
    if(e.code==='Escape') optionsScreen.classList.add('hidden');
    return;
  }
  if(state==='revive'){ if(e.code==='Escape') declineRevive(); return; }
  if(e.code==='Escape'){
    if(state==='play') togglePause();
    else if(state==='paused') togglePause();
    return;
  }
  if(isHoldKey(e.code) || isWaveKey(e.code)){
    const ae = document.activeElement;
    let fromHudButton = false;
    if(ae && (ae.tagName==='BUTTON' || ae.getAttribute('role')==='button' || ae.getAttribute('role')==='switch')){
      /* En partie, un bouton du HUD resté sélectionné après un clic (son, pause, clip) ne doit
         pas avaler ESPACE / F : on lui retire le focus et la touche pilote le jeu. */
      if(inGame() && ae.closest && ae.closest('#hud')){ ae.blur(); fromHudButton = true; }
      else return;
    }
    e.preventDefault();
    if(state==='menu'){ if(!e.repeat && (e.code==='Space' || e.code==='Enter')) $('btnPlay').click(); return; }
    if(e.repeat) return;
    if(isWaveKey(e.code)){
      if(inGame()){ initAudio(); fireWave(); }
      else if(state==='over') onDown(e);
      return;
    }
    onDown(fromHudButton ? null : e);   // l'événement vise encore le bouton : onDown l'ignorerait
  }
  if(e.code==='KeyR' && state==='play'){ // shortcut clip
    if(clipRecorderActive) stopClipRecording();
    else startClipRecording();
  }
});
window.addEventListener('keyup',e=>{
  if(isHoldKey(e.code)) onUp();
});

/* =========================================================
   Pause
   ========================================================= */
function togglePause(){
  if(state==='play'){
    state='paused'; attract=false;
    disarmRestart(); disarmQuit();
    pauseScoreEl.textContent = score;
    pauseAnomEl.textContent = activeAnomalies.length;
    pauseBossEl.textContent = bossesKilled;
    pauseWaveEl.textContent = currentCampaignLevel ? 'NIVEAU '+currentCampaignLevel.n : (currentMode.useWaves && WAVES[waveIndex] ? 'VAGUE '+(waveIndex+1) : currentMode.label);
    pauseScreen.classList.remove('hidden');
    if(musicMasterGain && actx){
      musicMasterGain.gain.cancelScheduledValues(actx.currentTime);
      musicMasterGain.gain.linearRampToValueAtTime(0, actx.currentTime+0.2);
    }
  } else if(state==='paused'){
    state='play';
    pauseScreen.classList.add('hidden');
    optionsScreen.classList.add('hidden');
    if(music.playing && musicMasterGain && actx){
      const target = (profile.options.music/100)*MUSIC_GAIN;
      musicMasterGain.gain.cancelScheduledValues(actx.currentTime);
      musicMasterGain.gain.linearRampToValueAtTime(target, actx.currentTime+0.3);
    }
  }
}
