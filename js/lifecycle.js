/* GOULU — cycle de vie d'une partie */
function startGame(modeId, isDaily){
  if(modeId === 'campaign'){
    currentMode = Object.assign({}, MODES.classic);
  } else {
    currentMode = Object.assign({}, MODES[modeId] || MODES.classic);
    currentCampaignLevel = null;
  }
  if(modeId !== 'campaign'){ profile.selectedMode = currentMode.id; saveP(); }
  state='play'; cam.menuTarget = 0;
  /* le bouton du menu cliqué (« Jouer »…) garde le focus une fois caché : ESPACE serait ignorée */
  if(document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
  entities.length=0; particles.length=0; shockwaves.length=0; toasts.length=0;
  damageNumbers.length=0;
  score=0; scoreFrac=0; combo=0; comboTimer=0; multiplier=1;
  lives=3;
  maxCombo=1; parryCount=0; runDust=0; surgeFired=false;
  elapsed=0; dustTimer=0.85; antiTimer=3.2;
  shake=0; flash=0; parryFlash=0; danger=0;
  attract=false; overCd=0;
  shockCharges=0; dustSinceCharge=0;
  timeScale=1; slowmoT=0;
  bh.r=20; bh.rTarget=20;
  lastDeathContext=null;
  parryChain=0; parryChainTimer=0; perfectChainFired=false;
  hitstop=0; invincibleT=0; hurtT=0; finaleT=0;
  currentPace=[]; lastPaceRecorded=-1; lastGhostKey='';
  runHits=0; runPerfects=0; vampireCount=0; echoParryCount=0;
  pulseStreak=0; resonanceT=0; runPulses=0; runResonances=0; beatBpm=80; beatOrigin=performance.now()/1000; lastPulseTxt='';
  thoughtSeen=new Set(); lastThoughtAt=-99;
  anomalyWaveGiven=-1; campaignAnomDone=false; overReplayMode='retry';
  btnReplay.textContent='REJOUER';
  activeAnomalies=[]; pendingEchoes=[];
  anomalyScreenOpen=false;
  anomalyNextAt = currentMode.anomalyInterval;
  bossNextAt = currentMode.bossInterval;
  boss=null; bossesKilled=0;
  runBossesKilled=0; runHasPerfect=false;
  timeSinceRelease=0;
  waveIndex=0; waveTimer=0; waveBannerTimer=0;
  elemChain = { type:null, count:0, timer:0 };
  elemTypesCollected = new Set();
  runElemChains = 0;
  specialization = null;
  kamikazeTimer = 0; fantomeTimer = 0; architecteDust = 0;
  overkillFreeze = 0;
  campaignBossQueue = [];
  campaignBossTimer = 0;
  campaignNoAnomaly = !!(currentCampaignLevel && (currentCampaignLevel.constraint === 'noAnomaly' || currentCampaignLevel.constraint === 'reducedStats'));
  campaignReducedStats = !!(currentCampaignLevel && currentCampaignLevel.constraint === 'reducedStats');
  runTechniques = { dashparry: false, echochain: false, momentum: false };
  pulsarDailyDone = false; endlessBossAt = 30; resumeT = 0; $('resumeScreen').classList.add('hidden');
  aliveReset(); cosmosReset();
  reviveUsed = false; runRevives = 0; rerollsLeft = RUN_REROLLS; lastXp = null;
  $('reviveScreen').classList.add('hidden');
  parryTimes = [];
  if(clipBlobUrl){ try{ URL.revokeObjectURL(clipBlobUrl); }catch(e){} clipBlobUrl = null; clipBlob = null; }
  if(btnDownloadClip) btnDownloadClip.style.display = 'none';

  /* graine d'abord : les cartes de départ en dépendent */
  if(isDaily){
    const today=todayStr();
    if(profile.daily.date!==today){ profile.daily={date:today,score:0,attempts:0}; }
    profile.daily.attempts++; saveP();
    setSeedFromDate(today);
  } else if(currentCampaignLevel){
    setSeedFromDate('campaign' + currentCampaignLevel.n);
  } else {
    setSeedFromDate(null);
  }

  mods=newMods(!!isDaily);
  if(mods.bonusLives > 0){ lives = 3 + mods.bonusLives; mods.bonusLives = 0; }
  maxLivesRun = lives;
  activeDailyRule = null;
  if(isDaily){
    activeDailyRule = dailyRuleFor(todayStr());
    activeDailyRule.apply(mods);
    if(activeDailyRule.id === 'fragile'){ lives = 1; maxLivesRun = 1; }
  }
  if(currentMode.id === 'chaos') mods.antiSpawnMult *= 1.4;
  if(currentMode.beatOnly) mods.scoreMult *= 1.25;
  if(profile.options.assist && !isDaily){ lives += 2; maxLivesRun += 2; }

  birthSetup(isDaily);                   // naissance (graine posée : la même pour tous au défi du jour)
  baseMods = Object.assign({}, mods);   // réglages du départ, pour pouvoir oublier une mutation
  hudEl.classList.toggle('sim', !!currentMode.simulation);
  if(mods.startAnomalies > 0 && !campaignNoAnomaly && !currentMode.simulation){
    for(let i=0;i<mods.startAnomalies;i++){
      const c = pickAnomalyCard();
      if(c) addAnomaly(c);
    }
  }

  renderBuildBar();
  buildPips();
  buildHearts();
  bossBarEl.classList.remove('on');
  if(bossHintEl) bossHintEl.classList.add('hidden');
  waveBannerEl.classList.remove('on');
  blitzTimerEl.classList.remove('on','warn');

  if(currentCampaignLevel){
    waveNumEl.textContent = 'NIVEAU ' + currentCampaignLevel.n;
    waveNameEl.textContent = currentCampaignLevel.name;
    if(waveLoreEl) waveLoreEl.textContent = currentCampaignLevel.lore;
    waveBannerEl.classList.add('on');
    waveBannerTimer = 5.5;
  } else if(currentMode.useWaves){
    applyWave(activeDailyRule && activeDailyRule.startWave !== undefined ? activeDailyRule.startWave : 0);
    waveBannerTimer = 3.5;
  }

  lastScore=-1; lastLives=-1; lastCharges=-1; lastMult=-1; lastProg=-1;
  menuEl.classList.add('hidden');
  overEl.classList.add('hidden');
  victoryEl.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  optionsScreen.classList.add('hidden');
  anomalyScreen.classList.add('hidden');
  tutScreen.classList.add('hidden');
  hudEl.classList.add('active');
  hintEl.classList.add('on');
  setTimeout(()=>hintEl.classList.remove('on'), 4500);
  if(actx){
    if(currentCampaignLevel && currentCampaignLevel.n === 4) musicStop();   // niveau SILENCE : la nappe du menu se tait aussi
    else musicStart('game');
    musicSetBpm(80);
  }
  spawnTutorialRing();
  if(activeDailyRule) addToast(activeDailyRule.name + ' · ' + activeDailyRule.desc, '#7ee7ff');
  setTimeout(()=>{ if(state==='play') thoughtOnce('start', pick(persona().start)); }, 1400);

  const ghost = getBestGhostPace();
  ghostLineEl.classList.toggle('on', !!(ghost && ghost.length >= 3));
  try{ drawGhostCanvas(); }catch(e){}
}

function gameOver(){
  state='over';
  overCd=1.0;
  attract=false;
  shake = reduceFx() ? 12 : 30;
  burst(bh.x, bh.y, SKINS[profile.skin].preview, 70, 620);
  vibrate(180);
  musicStop();
  try{ stopClipRecording(); }catch(e){}
  btnReplay.textContent = 'REJOUER';
  overReplayMode = 'retry';

  const run = runSummaryObj();
  bookkeepRun(run);

  if(currentCampaignLevel){
    updateQuestsProgress(run); checkQuestRewards(); checkAchievements(run);
    saveP(); refreshMenuBadges();
    const cause = analyzeDeath(lastDeathContext);
    setOverBase('AVALÉ', 'NIVEAU ' + currentCampaignLevel.n + ' · ' + currentCampaignLevel.name,
      'Réessaie ce niveau', false, cause.title, cause.text, 'Chapitre ' + currentCampaignLevel.n + ' / 10');
    deathSound();
    return;
  }

  const timeUp = currentMode.duration > 0 && elapsed >= currentMode.duration && lives > 0;

  if(!profile.replays) profile.replays = {};
  const prevReplay = profile.replays[currentMode.id];
  const isNewBest = !prevReplay || score > prevReplay.score;
  if(isNewBest){
    profile.replays[currentMode.id] = { score, ts:Date.now(), pacing: currentPace.slice() };
  }

  if(!profile.modeRecords) profile.modeRecords = {};
  const prevModeRec = profile.modeRecords[currentMode.id] || 0;
  let isNewRecord = false;
  if(score > prevModeRec){
    profile.modeRecords[currentMode.id] = score;
    if(currentMode.id === 'classic'){
      if(score > profile.best){
        profile.best = score;
        profile.bestRun = {...run};
        profile.bestRunPace = currentPace.slice();
        isNewRecord = true;
      }
    } else {
      isNewRecord = true;
    }
  }
  if(lastGameWasDaily && score > profile.daily.score) profile.daily.score = score;
  if(lastGameWasDaily) afterDailyRun(score); else if($('lbRank')) $('lbRank').textContent = '';

  profile.history.push({ score, mode:currentMode.id, ts:Date.now(), parry:parryCount, time:run.time });
  if(profile.history.length > 60) profile.history = profile.history.slice(-60);

  saveP();
  checkAchievements(run);
  updateQuestsProgress(run);
  checkQuestRewards();

  finalScoreEl.textContent = fmtScore(score);
  overModeEl.textContent = lastGameWasDaily ? 'DÉFI DU JOUR' : currentMode.label;
  const eg = endgameOver();
  overTitleEl.textContent = eg ? eg.title : (timeUp ? 'TEMPS ÉCOULÉ' : 'AVALÉ');
  const ref = Math.max(prevModeRec, currentMode.id==='classic' ? (profile.bestRun?profile.bestRun.score:0) : prevModeRec);
  if(!isNewRecord && ref > score){
    const delta = ref - score;
    nearMissEl.classList.remove('close');
    nearMissEl.innerHTML = 'Il te manquait <b>'+delta+' pts</b> pour le record ' + currentMode.name.toLowerCase();
    if(delta < Math.max(200, ref*0.1)) nearMissEl.classList.add('close');
  } else if(!isNewRecord) nearMissEl.innerHTML = '';
  else { nearMissEl.innerHTML = '★ Nouveau meilleur score !'; nearMissEl.classList.add('close'); }
  if(challenge && challenge.score && ((challenge.mode && challenge.mode === currentMode.id) || (challenge.daily && lastGameWasDaily))){
    nearMissEl.innerHTML += (nearMissEl.innerHTML ? '<br>' : '') + (score >= challenge.score ? '🏁 Défi ami relevé (' + challenge.score + ')' : '🎯 Défi ami : encore ' + (challenge.score - score) + ' pts');
  }

  const cause = eg ? { title:eg.causeTitle, text:eg.cause } : (timeUp
    ? { title:'CHRONO', text:'Tu as tenu <b>' + currentMode.duration + ' secondes</b>. Bien joué.' }
    : analyzeDeath(lastDeathContext));
  causeTitleEl.textContent = cause.title;
  causeTextEl.innerHTML = cause.text;
  statParryEl.textContent = parryCount;
  statMaxEl.textContent = '×'+maxCombo;
  statTimeEl.textContent = run.time+'s';
  function setDelta(el, cur, best){
    if(best===0){ el.textContent=''; return; }
    const d=cur-best;
    if(d>0){ el.textContent='+'+d; el.classList.remove('neg'); }
    else if(d<0){ el.textContent=d; el.classList.add('neg'); }
    else { el.textContent='='; el.classList.remove('neg'); }
  }
  setDelta(deltaParryEl, run.parry, profile.bestRun.parry);
  setDelta(deltaMaxEl, run.maxCombo, profile.bestRun.maxCombo);
  setDelta(deltaTimeEl, run.time, profile.bestRun.time);

  if(isNewRecord){
    finalRecordEl.textContent = '★ NOUVEAU RECORD ★';
    finalRecordEl.classList.add('gold');
  } else {
    finalRecordEl.textContent = 'Record ' + (profile.modeRecords[currentMode.id]||0) + ' ('+currentMode.name+')';
    finalRecordEl.classList.remove('gold');
  }
  btnShare.textContent = 'Partager mon résultat';
  btnShare.classList.remove('copied');
  if(btnDownloadClip) btnDownloadClip.style.display = 'none';
  hudEl.classList.remove('active');
  ghostLineEl.classList.remove('on');
  bossBarEl.classList.remove('on');
  overEl.classList.remove('hidden');
  showXpResult(lastXp); showNextGoal(); showStage(); showPhysOver();
  $('btnEpilogue').classList.toggle('hidden', !runWon);   // tombé dans Sgr A* : la suite de sa vie
  deathSound();
  refreshMenuBadges();
  checkModeUnlocks();
  renderSkins();
}

function backToMenu(){
  state='menu'; cam.menuTarget = 1;
  attract=false;
  musicStop();
  entities.length=0; particles.length=0; shockwaves.length=0; toasts.length=0;
  damageNumbers.length=0;
  boss=null;
  currentCampaignLevel = null;
  try{ stopClipRecording(); }catch(e){}
  hudEl.classList.remove('active');
  overEl.classList.add('hidden');
  victoryEl.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  optionsScreen.classList.add('hidden');
  anomalyScreen.classList.add('hidden');
  tutScreen.classList.add('hidden');
  bossBarEl.classList.remove('on');
  waveBannerEl.classList.remove('on');
  ghostLineEl.classList.remove('on');
  menuEl.classList.remove('hidden');
  refreshMenuBadges(); refreshDaily(); renderAch(); renderSkins();
  renderModeGrid(); renderQuests(); renderStats();
  renderCampaign(); renderJournal(); renderEvolution();
  renderGreeting(); maybeAskName();
  if(document.querySelector('.mtab.active[data-tab="daily"]')) renderDailyBoard();
}
