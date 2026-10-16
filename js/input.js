/* GOULU — entrées clavier / souris / tactile, pause */
function onDown(e){
  if(e && e.target && e.target.closest && e.target.closest('button')) return;
  if(state==='anomaly' || state==='paused' || state==='revive') return;
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
function onUp(){
  if(state==='tutorial'){
    if((tutorialStep === 1 || tutorialStep === 2) && attract){
      shockwaves.push({r:bh.r, maxR:SHOCK_MAX_R, life:SHOCK_LIFE, maxLife:SHOCK_LIFE, hit:new Set(), isEcho:false});
      if(actx && !audioMuted) blip(180,0.22,'sawtooth',0.13,90);
    }
    attract = false;
    return;
  }
  if(state!=='play') return;
  if(attract){
    if(currentMode.noShock){
      const range = parryR();
      let hitAny = false;
      const pu = isOnBeat(), pm = pu ? 1.5 : 1;
      for(let i=entities.length-1;i>=0;i--){
        const e=entities[i];
        if(!e || e.dead || (e.type!=='anti' && !e.bossPart)) continue;
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
    } else {
      if(shockCharges > 0){
        shockCharges--;
        const pu = isOnBeat();
        spawnShockwave(false, pu);
        if(resonanceT > 0) pendingEchoes.push({time:0.35});
        if(!pu && currentMode.beatOnly) addToast('HORS TEMPO', '#9aa0c8');
      }
    }
  }
  attract=false;
}
window.addEventListener('mousedown',onDown);
window.addEventListener('mouseup',onUp);
window.addEventListener('touchstart',onDown,{passive:false});
/* Plusieurs doigts : l'onde ne part qu'au lever du dernier doigt (un deuxième doigt
   qui touche puis se lève ne doit pas déclencher d'onde pendant qu'on maintient). */
window.addEventListener('touchend', e => { if(e.touches && e.touches.length > 0) return; onUp(); });
/* Interruption par le système (notification, geste) : on relâche sans tirer d'onde. */
window.addEventListener('touchcancel', e => { if(e.touches && e.touches.length > 0) return; attract = false; });
/* iOS Safari : pas de zoom au pincement pendant le jeu. */
document.addEventListener('gesturestart', e => e.preventDefault());
window.addEventListener('blur',()=>{ attract=false; if(state==='play') togglePause(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ attract=false; if(state==='play') togglePause(); } });
window.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{
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
  if(e.code==='Space'||e.code==='ArrowUp'||e.code==='Enter'){
    const ae = document.activeElement;
    if(ae && (ae.tagName==='BUTTON' || ae.getAttribute('role')==='button' || ae.getAttribute('role')==='switch')) return;
    e.preventDefault();
    if(state==='menu'){ if(!e.repeat && e.code!=='ArrowUp') $('btnPlay').click(); return; }
    if(!e.repeat) onDown(e);
  }
  if(e.code==='KeyR' && state==='play'){ // shortcut clip
    if(clipRecorderActive) stopClipRecording();
    else startClipRecording();
  }
});
window.addEventListener('keyup',e=>{
  if(e.code==='Space'||e.code==='ArrowUp'||e.code==='Enter') onUp();
});

/* =========================================================
   Pause
   ========================================================= */
function togglePause(){
  if(state==='play'){
    state='paused'; attract=false;
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
