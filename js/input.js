/* GOULU — entrées clavier / souris / tactile, pause */
function onDown(e){
  if(e && e.target && e.target.closest && e.target.closest('button')) return;
  if(state==='anomaly' || state==='paused') return;
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
        parryChain++;
        parryChainTimer = mods.chainWindow + (mods.dashparryEnabled ? 0.5 : 0);
        const chainMult = Math.min(mods.chainCap, Math.pow(2, Math.min(parryChain-1, 5)));
        addScore(20 * multiplier * chainMult * mods.scoreMult * fm() * pm);
        combo++; comboTimer=mods.chainWindow*1.2;
        if(combo>maxCombo) maxCombo=combo;
        hitstop = PARRY_HITSTOP;
        parryCount++; parryTimes.push(performance.now());
        if(parryTimes.length > 5) parryTimes.shift();
        parryFlash=reduceFx()?0.25:0.6; slowmoT=0.18; timeScale=0.4;
        vibrate(45); shake=Math.max(shake,10);
        burst(e.x,e.y,'#ffdd44',32,520);
        if(mods.vampire) vampireTick();
        checkTechniques();
        if(parryChain >= CHAIN_THRESHOLD && !perfectChainFired){
          perfectChainFired = true; runHasPerfect = true; runPerfects++; thoughtOnce('perfect','Plus rien ne peut me toucher.');
          invincibleT = INVINCIBLE_DURATION + (mods.invincBonus||0);
          slowmoT = reduceFx()?0.5:0.9; timeScale = 0.25;
          addToast('★ PERFECT CHAIN ★', '#ffffff');
          burst(e.x, e.y, '#ffffff', 48, 780);
          blip(880, 0.3, 'sine', 0.18, 2200);
        }
        if(e.bossPart){
          damageBoss(1, e.x, e.y);
          if(boss && boss.type.id==='swarm'){ boss.parts = boss.parts.filter(p=>p!==e); entities.splice(i,1); }
          else if(boss) knockBoss(e, dx/(d||1), dy/(d||1), 40);
          if(!boss) break;
        } else entities.splice(i,1);
      }
      if(hitAny && pu) registerPulse();
      if(hitAny) blip(880,0.18,'sine',0.16,1400);
      else blip(180,0.12,'sine',0.05,90);
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
window.addEventListener('touchend',onUp);
window.addEventListener('touchcancel',onUp);
window.addEventListener('blur',()=>{ attract=false; if(state==='play') togglePause(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ attract=false; if(state==='play') togglePause(); } });
window.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{
  if(!optionsScreen.classList.contains('hidden')){
    if(e.code==='Escape') optionsScreen.classList.add('hidden');
    return;
  }
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
