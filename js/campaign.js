/* GOULU — tutoriel et campagne */
function startTutorial(){
  tutorialActive = true; tutorialStep = 0; tutorialSafetyTimer = 0;
  state = 'tutorial'; cam.menuTarget = 0;
  if(document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
  entities.length=0; particles.length=0; shockwaves.length=0; toasts.length=0;
  damageNumbers.length=0;
  score=0; scoreFrac=0; combo=0; comboTimer=0; multiplier=1; lives=3; maxLivesRun=3; hurtT=0;
  mods=newMods(); activeAnomalies=[]; boss=null; bossesKilled=0;
  shockCharges=0; dustSinceCharge=0;
  attract=false; elapsed=0;
  bh.r=20; bh.rTarget=20;
  tutorialCompleteTimer = 0;
  waveIndex = 0; waveTimer = 0;
  menuEl.classList.add('hidden');
  overEl.classList.add('hidden');
  hudEl.classList.add('active');
  tutScreen.classList.remove('hidden');
  showTutStep(0);
}
function showTutStep(step){
  tutorialStep = step; tutorialSafetyTimer = 0;
  const scenes = [
    { title:'Aspire la poussière', desc: ctl('tut0'),
      ready:()=>{
        spawnEntity('dust', bh.x + 120, bh.y - 80, 'gold');
        spawnEntity('dust', bh.x - 130, bh.y + 70, 'gold');
        spawnEntity('dust', bh.x + 80, bh.y + 130, 'gold');
      }
    },
    { title:'Détruis l\'antimatière', desc: ctl('tut1'),
      ready:()=>{
        entities.push({ x: bh.x + 180, y: bh.y, vx: -60, vy: 0, r: R_ANTI, type:'anti', phase: 0, trail:[] });
        spawnEntity('dust', bh.x - 100, bh.y + 60, 'gold');
        spawnEntity('dust', bh.x - 100, bh.y - 60, 'gold');
        spawnEntity('dust', bh.x - 60, bh.y + 100, 'gold');
        spawnEntity('dust', bh.x - 60, bh.y - 100, 'gold');
      }
    },
    { title:'Réalise un PARRY', desc: ctl('tut2'),
      ready:()=>{
        entities.push({ x: bh.x + 150, y: bh.y, vx: -70, vy: 0, r: R_ANTI, type:'anti', phase: 0, trail:[] });
        shockCharges = 1;
      }
    }
  ];
  const s = scenes[step];
  if(!s){ endTutorial(); return; }
  tutStep.textContent = 'ÉTAPE ' + (step+1) + ' / 3';
  tutTitle.textContent = s.title;
  tutDesc.innerHTML = s.desc;
  tutDots.forEach((d,i)=>{
    d.className = 'tut-dot';
    if(i < step) d.classList.add('done');
    else if(i === step) d.classList.add('on');
  });
  s.ready();
}
function updateTutorial(dt){
  tutorialSafetyTimer += dt;
  for(let i=entities.length-1;i>=0;i--){
    const e=entities[i];
    let dx=bh.x-e.x, dy=bh.y-e.y;
    let d=Math.sqrt(dx*dx+dy*dy)||0.001;
    const ux=dx/d, uy=dy/d;
    if(attract && (e.type==='dust' || tutorialStep === 2)){
      const f=ATTRACT_F/(d>MIN_D?d:MIN_D);
      e.vx += ux*f*dt*0.5; e.vy += uy*f*dt*0.5;
    }
    e.x += e.vx*dt; e.y += e.vy*dt;
    dx=bh.x-e.x; dy=bh.y-e.y;
    d=Math.sqrt(dx*dx+dy*dy);
    const hitR = bh.r + e.r*1.5;
    if(d < hitR){
      if(e.type === 'dust'){ score++; burst(e.x, e.y, '#ffcb4d', 8, 200); if(actx && !audioMuted) blip(520, 0.08, 'triangle', 0.08); entities.splice(i, 1); }
      else if(e.type === 'anti'){
        if(tutorialStep === 2){
          shake = 12; burst(e.x, e.y, '#ff2d6f', 12, 300);
          entities.splice(i, 1);
          entities.push({ x: bh.x + 150, y: bh.y, vx: -70, vy: 0, r: R_ANTI, type:'anti', phase: 0, trail:[] });
        } else { lives--; if(lives <= 0) lives = 3; shake = 12; entities.splice(i, 1); }
      }
    }
  }
  for(let s=0;s<shockwaves.length;s++){
    const sw = shockwaves[s];
    for(let i=entities.length-1;i>=0;i--){
      const e = entities[i];
      if(e.type !== 'anti') continue;
      const dx=bh.x-e.x, dy=bh.y-e.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(!sw.hit.has(e) && d < sw.r + e.r*0.6){
        sw.hit.add(e);
        if(tutorialStep === 2){
          if(d < PARRY_RANGE){ parryCount++; burst(e.x, e.y, '#ffdd44', 30, 500); vibrate(40); }
          else { addToast('Trop tôt ! Attends le cercle', '#ffcb4d'); entities.push({ x: bh.x + 170, y: bh.y, vx: -70, vy: 0, r: R_ANTI, type:'anti', phase: 0, trail:[] }); }
        }
        else { burst(e.x, e.y, '#ffdd44', 20, 400); }
        if(actx && !audioMuted) blip(660, 0.15, 'sine', 0.1, 990);
        entities.splice(i, 1);
      }
    }
  }
  if(shake > 0) shake = Math.max(0, shake - dt*68);
  bh.r += (bh.rTarget - bh.r) * Math.min(1, dt*9);
  bh.ringT = (bh.ringT + dt/0.8) % 1;
  bh.diskT = (bh.diskT + dt*0.35) % 1;
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; p.life -= dt;
    if(p.life <= 0){ particles.splice(i,1); continue; }
    p.x += p.vx*dt; p.y += p.vy*dt;
    const dr = Math.pow(0.16, dt); p.vx *= dr; p.vy *= dr;
  }
  for(let i=shockwaves.length-1;i>=0;i--){
    const sw=shockwaves[i]; sw.life -= dt;
    if(sw.life <= 0){ shockwaves.splice(i,1); continue; }
    const p = 1 - sw.life/sw.maxLife;
    sw.r = sw.maxR * (1 - Math.pow(1-p, 2));
  }
  if(tutorialStep === 0 && score >= 2){ nextTutStep(); tutorialSafetyTimer = 0; }
  else if(tutorialStep === 1 && !entities.some(e => e.type === 'anti')){ nextTutStep(); tutorialSafetyTimer = 0; }
  else if(tutorialStep === 2 && parryCount >= 1){ nextTutStep(); tutorialSafetyTimer = 0; }
  if(tutorialSafetyTimer > 20){ tutorialSafetyTimer = 0; nextTutStep(); }
}
function nextTutStep(){
  if(tutorialCompleteTimer > 0) return;
  tutorialCompleteTimer = 0.8;
  setTimeout(()=>{
    tutorialCompleteTimer = 0;
    if(tutorialStep >= 2) endTutorial();
    else {
      entities.length = 0; particles.length = 0; shockwaves.length = 0;
      shockCharges = 0; dustSinceCharge = 0; parryCount = 0; score = 0;
      tutorialSafetyTimer = 0;
      showTutStep(tutorialStep + 1);
    }
  }, 700);
}
function endTutorial(){
  tutorialActive = false;
  tutScreen.classList.add('hidden');
  profile.tutorialDone = true; saveP();
  setTimeout(() => { startGame(profile.selectedMode || 'classic', false); }, 250);
}

/* =========================================================
   V9 : Campaign
   ========================================================= */
function startCampaignLevel(n){
  const level = CAMPAIGN_LEVELS.find(l => l.n === n);
  if(!level) return;
  if(n > profile.campaign.unlocked) return;
  currentCampaignLevel = level;
  lastGameWasDaily = false;
  startGame('campaign', false);
  lives += 1; maxLivesRun += 1; lastLives = -1;
  if(level.constraint === 'final'){ lives += 1; maxLivesRun += 1; }
  if(level.constraint === 'noShock') currentMode.noShock = true;
  if(campaignReducedStats){ mods.dustValue *= 0.5; mods.scoreMult *= 0.7; }
  campaignBossQueue = level.bosses.slice();
  campaignBossTimer = campaignBossQueue.length > 0 ? 6 : 0;
  entities.length = 0;
  spawnTutorialRing();
}
function updateCampaign(dt){
  if(!currentCampaignLevel) return;
  // Boss queue
  if(campaignBossTimer > 0){
    campaignBossTimer -= dt;
    if(campaignBossTimer <= 0 && campaignBossQueue.length > 0 && !boss){
      const nextBoss = campaignBossQueue.shift();
      spawnBossByName(nextBoss);
    }
  }
  // If no boss and queue has more, wait 2s between bosses
  if(!boss && campaignBossQueue.length > 0 && campaignBossTimer <= 0){
    campaignBossTimer = 2;
  }
}
function checkCampaignWin(){
  if(!currentCampaignLevel) return;
  const level = currentCampaignLevel;
  // Win: survive duration
  if(elapsed >= level.duration){
    completeCampaignLevel(level);
  }
}
function setOverBase(title, modeTxt, nearHtml, nearClose, causeT, causeH, recTxt){
  finalScoreEl.textContent = score;
  overModeEl.textContent = modeTxt;
  overTitleEl.textContent = title;
  nearMissEl.innerHTML = nearHtml;
  if($('lbRank')) $('lbRank').textContent = '';
  nearMissEl.classList.toggle('close', !!nearClose);
  causeTitleEl.textContent = causeT;
  causeTextEl.innerHTML = causeH;
  statParryEl.textContent = parryCount;
  statMaxEl.textContent = '×'+maxCombo;
  statTimeEl.textContent = Math.floor(elapsed)+'s';
  finalRecordEl.textContent = recTxt;
  finalRecordEl.classList.remove('gold');
  deltaParryEl.textContent = ''; deltaMaxEl.textContent = ''; deltaTimeEl.textContent = '';
  if(btnDownloadClip) btnDownloadClip.style.display = 'none';
  bossBarEl.classList.remove('on');
  hudEl.classList.remove('active');
  ghostLineEl.classList.remove('on');
  overEl.classList.remove('hidden');
  showXpResult(lastXp); showNextGoal(); showStage();
}
function runSummaryObj(){
  return {
    score, parry:parryCount, maxCombo, time:Math.floor(elapsed), dust:runDust,
    bosses:runBossesKilled, anomalies:activeAnomalies.length, perfect:runHasPerfect,
    wasDaily:lastGameWasDaily,
    wave:(currentMode.useWaves && !currentCampaignLevel) ? waveIndex+1 : 0,
    elemChains:runElemChains, elemTypes:elemTypesCollected.size, engaged:isEngaged(),
    perfects:runPerfects, revived:runRevives > 0, stage:STAGES[ALIVE.stage].name
  };
}
function bookkeepRun(run){
  profile.cum.dust += run.dust; profile.cum.parry += run.parry; profile.cum.plays++;
  if(run.engaged && run.time > profile.cum.bestSurvival) profile.cum.bestSurvival = run.time;
  if(run.perfect) profile.perfectChains++;
  if(run.engaged && run.wave > profile.bestWave) profile.bestWave = run.wave;
  profile.elemChains = (profile.elemChains||0) + run.elemChains;
  lastXp = grantXp(run);
}
function completeCampaignLevel(level){
  if(state !== 'play') return;
  const first = !profile.campaign.completed[level.n];
  if(first) profile.campaign.completed[level.n] = Date.now();
  if(level.n < 10) profile.campaign.unlocked = Math.max(profile.campaign.unlocked, level.n + 1);
  profile.lore[level.n] = true;
  const prevBest = profile.campaign.best[level.n] || 0;
  const newBest = score > prevBest;
  if(newBest) profile.campaign.best[level.n] = score;
  if(first) profile.shards += 2;
  if(level.n === 10 && !profile.skinsUnlocked.includes('singular')) profile.skinsUnlocked.push('singular');
  attract = false;
  musicStop(); try{ stopClipRecording(); }catch(e){}
  const run = runSummaryObj(); run.cleared = true;
  bookkeepRun(run); updateQuestsProgress(run); checkQuestRewards();
  saveP();
  refreshMenuBadges();
  if(level.n === 10){
    state = 'finale'; finaleT = 0;
    burst(bh.x, bh.y, '#ffe9a3', 60, 500);
    entities.length = 0; boss = null; bossBarEl.classList.remove('on');
    hudEl.classList.remove('active'); ghostLineEl.classList.remove('on');
    return;
  }
  state = 'campdone';
  overReplayMode = 'next';
  btnReplay.textContent = 'NIVEAU SUIVANT';
  setOverBase('TERMINÉ', 'NIVEAU ' + level.n + ' · ' + level.name,
    first ? '★ Niveau complété ! <b>+2 shards</b>' : ('Niveau rejoué' + (newBest ? ' · <b>meilleur score !</b>' : '')), true,
    'LORE DÉBLOQUÉ', '<i style="color:var(--gold)">' + level.lore + '</i>',
    'Chapitre ' + level.n + ' / 10');
  if(actx && !audioMuted){ [523,659,784,1047].forEach((f,i)=>blip(f,0.3,'sine',0.14,undefined,i*0.09)); }
  checkAchievements(run);
}
function showVictory(level){
  victoryScoreEl.textContent = score;
  victoryLoreEl.textContent = '"' + level.lore + '"';
  hudEl.classList.remove('active');
  overEl.classList.add('hidden');
  victoryEl.classList.remove('hidden');
  if(actx && !audioMuted){ [523,659,784,1047,1319,1568].forEach((f,i)=>blip(f,0.5,'sine',0.16,undefined,i*0.12)); }
  vibrate([100,60,100,60,200]);
  if(lastXp && lastXp.levels.length){
    const top = lastXp.levels[lastXp.levels.length-1].level;
    setTimeout(()=>showUnlockToast('💎', 'Niveau ' + top + ' · +' + lastXp.shards + ' shard' + (lastXp.shards > 1 ? 's' : '')), 900);
  }
  checkAchievements({score, time:Math.floor(elapsed), maxCombo, wave:0, elemTypes:0, campaign:true, engaged:true});
}
