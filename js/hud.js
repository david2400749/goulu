/* GOULU — helpers de jeu, modificateurs, HUD */
/* =========================================================
   Utils
   ========================================================= */
function getMaxCharges(){ return BASE_MAX_CHARGES + (mods ? (mods.maxCharges - BASE_MAX_CHARGES) : 0); }
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
    chainWindow:PARRY_CHAIN_WINDOW, scoreMult:1, antiSpawnMult:1,
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
    scoreHudEl.textContent=score; lastScore=score;
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
    comboFill.style.transform='scaleX('+Math.max(0,Math.min(1,comboTimer/(mods?mods.chainWindow*1.2:COMBO_MAX)))+')';
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
  updateGhostPace();
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
    const data = ANOMALIES.find(x=>x.id===a.id);
    if(!data) continue;
    const el=document.createElement('div');
    el.className='build-slot';
    el.innerHTML = data.icon + (a.stacks>1 ? '<span class="stk">'+a.stacks+'</span>' : '');
    buildBarEl.appendChild(el);
  }
}
