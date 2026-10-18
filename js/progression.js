/* GOULU — vagues, spécialisations, chaînes élémentaires, succès, quêtes, anomalies */
function applyWave(idx){
  waveIndex = Math.min(idx, WAVES.length-1);
  const w = WAVES[waveIndex];
  waveTimer = 0;
  waveNumEl.textContent = 'VAGUE ' + (waveIndex+1);
  waveNameEl.textContent = w.name;
  waveBannerEl.classList.add('on');
  waveBannerTimer = 2.2;
  if(waveLoreEl) waveLoreEl.textContent = '';
  if(waveIndex === WAVES.length-1){ anomalyNextAt = elapsed + 25; endlessBurstAt = 18; }
  if(w.boss && !boss) spawnBoss();
}
function updateWaves(dt){
  if(!currentMode.useWaves) return;
  waveTimer += dt;
  const w = WAVES[waveIndex];
  if(!w) return;
  if(waveTimer >= w.duration) applyWave(waveIndex + 1);
}

/* Specialization */
function checkSpecialization(){
  if(specialization) return;
  if(activeAnomalies.length < SPEC_THRESHOLD) return;
  const cats = {};
  for(const a of activeAnomalies){
    const def = ANOMALIES.find(x=>x.id===a.id); if(!def) continue;
    cats[def.cat] = (cats[def.cat]||0) + a.stacks;
  }
  let bestCat = null, bestCount = 0;
  for(const c in cats){ if(cats[c] > bestCount){ bestCount = cats[c]; bestCat = c; } }
  if(!bestCat) return;
  const specId = SPEC_CATEGORIES[bestCat]; if(!specId) return;
  const spec = SPECIALIZATIONS[specId];
  specialization = specId;
  profile.specUnlocked[specId] = (profile.specUnlocked[specId]||0) + 1;
  saveP();
  if(specId === 'danseur') mods.parryRangeMult *= 1.3;
  showSpecialization(spec);
  checkAchievements({maxCombo,time:Math.floor(elapsed),score,wave:(currentMode.useWaves&&!currentCampaignLevel)?waveIndex+1:0,elemTypes:elemTypesCollected.size,engaged:isEngaged()});
}
function showSpecialization(spec){
  specIcon.textContent = spec.icon;
  specIcon.style.color = spec.color;
  specName.textContent = spec.name;
  specName.style.color = spec.color;
  specBanner.classList.add('on');
  vibrate([60,40,60,40,60]);
  if(actx && !audioMuted){ [523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>blip(f,0.3,'sine',0.13),i*80)); }
  shake = Math.max(shake, 24);
  setTimeout(()=>specBanner.classList.remove('on'), 2600);
}

/* Elemental chains */
function triggerElementalChain(type){
  const d = DUST_TYPES[type];
  runElemChains++; profile.elemChains++; saveP();
  let msg = '', color = d.color;
  switch(type){
    case 'gold': addScore(5 * multiplier * mods.scoreMult); msg = '★ TRIO DORÉ'; burst(bh.x, bh.y, '#ffcb4d', 30, 400); break;
    case 'blue': overkillFreeze = 2.0; msg = '❄️ FREEZE GLOBAL'; burst(bh.x, bh.y, '#7ee7ff', 40, 500); break;
    case 'red': chainExplosion(); msg = '🔥 EXPLOSION EN CHAÎNE'; burst(bh.x, bh.y, '#ff5c2d', 50, 600); break;
    case 'white': shockCharges = Math.min(getMaxCharges()*2, shockCharges + getMaxCharges()); msg = '⚪ OVERCHARGE'; burst(bh.x, bh.y, '#ffffff', 40, 500); break;
  }
  addToast(msg, color, H/2 - 100);
  flash = Math.max(flash, 0.6);
  shake = Math.max(shake, 20);
  vibrate([40,30,40]);
  if(actx && !audioMuted){ [660,880,1100,1320].forEach((f,i)=>setTimeout(()=>blip(f,0.15,'sine',0.11),i*50)); }
}
function chainExplosion(){
  const toKill = new Set();
  for(let i=0;i<entities.length;i++){
    const a = entities[i]; if(a.type!=='anti' || a.dead) continue;
    for(let j=0;j<entities.length;j++){
      const b = entities[j]; if(b===a || b.type!=='anti' || b.dead) continue;
      const dx=a.x-b.x, dy=a.y-b.y;
      if(dx*dx+dy*dy < 150*150){ toKill.add(a); toKill.add(b); }
    }
  }
  for(const e of toKill){
    burst(e.x, e.y, '#ff5c2d', 15, 400);
    addScore(10 * multiplier * mods.scoreMult); combo++; if(combo>maxCombo) maxCombo=combo;
    e.dead = true;
  }
}

function drawGhostCanvas(){
  if(!ghostCanvas) return;
  const rect = ghostCanvas.getBoundingClientRect();
  if(!rect.width) return;
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  ghostCanvas.width = Math.floor(rect.width*dpr);
  ghostCanvas.height = Math.floor(rect.height*dpr);
  const gc = ghostCanvas.getContext('2d');
  gc.setTransform(dpr,0,0,dpr,0,0);
  gc.clearRect(0,0,rect.width,rect.height);
  const ghost = getBestGhostPace();
  if(!ghost || ghost.length < 3){
    gc.fillStyle = 'rgba(255,255,255,0.15)';
    gc.font = '8px Inter, sans-serif'; gc.textAlign = 'center'; gc.textBaseline = 'middle';
    gc.fillText('PAS DE GHOST', rect.width/2, rect.height/2);
    return;
  }
  const max = Math.max(...ghost.filter(v=>v!==undefined), score, 10);
  const pad = 2;
  const w = rect.width - pad*2;
  const h = rect.height - pad*2;
  const len = ghost.length;
  // Draw current score up to elapsed
  const currentIdx = Math.min(Math.floor(elapsed), len-1);
  // Full ghost line
  gc.beginPath();
  for(let i=0;i<=currentIdx && i<len;i++){
    const v = ghost[i]; if(v===undefined) continue;
    const x = pad + (i/(len-1))*w;
    const y = pad + h - (v/max)*h;
    if(i===0) gc.moveTo(x,y); else gc.lineTo(x,y);
  }
  gc.strokeStyle = 'rgba(126,231,255,0.7)';
  gc.lineWidth = 1.2;
  gc.stroke();
  // Current score point
  const cy = pad + h - (score/max)*h;
  const cx = pad + (currentIdx/(len-1))*w;
  gc.beginPath(); gc.arc(cx, cy, 2.5, 0, Math.PI*2);
  gc.fillStyle = '#ffcb4d'; gc.fill();
}
function pickClipMime(){
  for(const m of ['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']){
    try{ if(MediaRecorder.isTypeSupported(m)) return m; }catch(e){}
  }
  return '';
}
function startClipRecording(){
  if(clipRecorderActive || typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return;
  try{
    clipCanvas = clipCanvas || document.createElement('canvas');
    clipCanvas.width = Math.min(1280, W); clipCanvas.height = Math.round(clipCanvas.width * H / W);
    clipCtx = clipCanvas.getContext('2d');
    clipStream = clipCanvas.captureStream(30);
    const mt = pickClipMime();
    mediaRecorder = mt ? new MediaRecorder(clipStream, { mimeType: mt, videoBitsPerSecond: 1500000 }) : new MediaRecorder(clipStream);
    clipExt = /mp4/.test(mediaRecorder.mimeType || mt) ? 'mp4' : 'webm';
    recordedChunks = [];
    mediaRecorder.ondataavailable = e => { if(e.data && e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.start(1000);
    clipRecorderActive = true;
    recIndicatorEl.classList.add('on');
    clipBtn.classList.add('active');
  }catch(e){ console.warn('Clip recording failed', e); clipRecorderActive = false; }
}
function stopClipRecording(){
  if(!clipRecorderActive || !mediaRecorder) return;
  const mr = mediaRecorder, chunks = recordedChunks;
  clipRecorderActive = false;
  recIndicatorEl.classList.remove('on');
  clipBtn.classList.remove('active');
  mr.onstop = () => {
    clipBlob = new Blob(chunks, { type: mr.mimeType || 'video/webm' });
    if(clipBlobUrl) URL.revokeObjectURL(clipBlobUrl);
    clipBlobUrl = URL.createObjectURL(clipBlob);
    if(btnDownloadClip) btnDownloadClip.style.display = 'block';
    if(clipStream){ clipStream.getTracks().forEach(t=>t.stop()); clipStream = null; }
  };
  try{ mr.stop(); }catch(e){}
}
async function downloadClip(){
  if(!clipBlobUrl || !clipBlob) return;
  try{
    const f = new File([clipBlob], 'goulu.'+clipExt, { type: clipBlob.type });
    if(navigator.canShare && navigator.canShare({ files:[f] })){ await navigator.share({ files:[f] }); return; }
  }catch(e){ if(e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = clipBlobUrl; a.download = 'goulu-' + Date.now() + '.' + clipExt;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function checkModeUnlocks(){
  if(!profile.unlockedModes.includes('pacifist') && profile.bossesKilled >= 1){
    profile.unlockedModes.push('pacifist'); showUnlockToast('🕊️', 'Mode Pacifiste débloqué');
  }
  if(!profile.unlockedModes.includes('blitz') && profile.cum.plays >= 30){
    profile.unlockedModes.push('blitz'); showUnlockToast('⚡', 'Mode Blitz débloqué');
  }
  if(!profile.unlockedModes.includes('chaos') && profile.perfectChains >= 1){
    profile.unlockedModes.push('chaos'); showUnlockToast('🌀', 'Mode Chaos débloqué');
  }
  if(!profile.unlockedModes.includes('metronome') && (profile.pulses||0) >= 20){
    profile.unlockedModes.push('metronome'); showUnlockToast('🎵', 'Mode Métronome débloqué');
  }
  if(!profile.skinsUnlocked.includes('prism') && profile.shards >= 15){
    profile.skinsUnlocked.push('prism'); showUnlockToast('💎', 'Skin Prismatique débloqué');
  }
  saveP();
}
function showUnlockToast(icon, name){
  if(achToastEl) achToastEl.remove();
  const el=document.createElement('div');
  el.className='ach-toast';
  el.innerHTML='<div class="ti">'+icon+'</div><div class="tt"><div class="tn">Débloqué</div><div class="tname">'+name+'</div></div>';
  document.body.appendChild(el);
  achToastEl=el;
  achSound(); vibrate([30,40,30]);
  setTimeout(()=>{ el.style.transition='opacity .4s'; el.style.opacity='0'; }, 2400);
  setTimeout(()=>{ if(el.parentNode) el.remove(); if(achToastEl===el) achToastEl=null; }, 3000);
}

/* =========================================================
   Quests
   ========================================================= */
function initDailyQuests(){
  const today=todayStr();
  if(!profile.quests || profile.quests.date !== today){ profile.quests = freshQuests(today); saveP(); }
  if(!profile.quests.picked || profile.quests.picked.length === 0){
    const dayRng = mulberry32(parseInt(today,10)||0);
    const pool = QUEST_POOL.slice(); const picked = [];
    for(let i=0;i<3 && pool.length>0;i++){
      const idx = Math.floor(dayRng()*pool.length);
      picked.push(pool[idx].id); pool.splice(idx,1);
    }
    profile.quests.picked = picked; saveP();
  }
}
function updateQuestsProgress(run){
  const q = profile.quests;
  q.plays++; q.dust += run.dust; q.parry += run.parry; q.scoreSum += run.score; q.bosses += run.bosses;
  q.elemChains = (q.elemChains||0) + (run.elemChains||0);
  if(run.parry > q.bestParry) q.bestParry = run.parry;
  if(run.score > q.bestScore) q.bestScore = run.score;
  if(run.time > q.bestTime) q.bestTime = run.time;
  if(run.anomalies > q.anomalies) q.anomalies = run.anomalies;
  if(run.wave > (q.bestWave||0)) q.bestWave = run.wave;
  if(run.perfect) q.perfect += 1;
  if(run.wasDaily) q.dailyDone += 1;
  saveP();
}
function checkQuestRewards(){
  const q = profile.quests;
  if(!q || !q.picked) return;
  for(const id of q.picked){
    if(q.claimed[id]) continue;
    const def = QUEST_POOL.find(x=>x.id===id); if(!def) continue;
    const v = q[def.field] || 0;
    if(v >= def.target){
      q.claimed[id] = true; profile.shards++; saveP();
      setTimeout(()=>{ showUnlockToast('💎', '+1 Shard Prismatique'); }, 400);
    }
  }
  checkModeUnlocks();
}

/* =========================================================
   Achievements
   ========================================================= */
function checkAchievements(runData){
  const newly=[];
  for(const a of ACH){
    if(profile.ach[a.id]) continue;
    let ok=false;
    try{ ok=a.check(runData,profile); }catch(e){}
    if(ok){ profile.ach[a.id]=Date.now(); newly.push(a); }
  }
  if(newly.length){
    saveP();
    for(let i=0;i<newly.length;i++) setTimeout(()=>showAchToast(newly[i]), i*650);
    const allUnlocked=ACH.every(a=>profile.ach[a.id]);
    if(allUnlocked && !profile.skinsUnlocked.includes('void')){
      profile.skinsUnlocked.push('void'); saveP();
      setTimeout(()=>showAchToast({icon:'🌑',name:'Skin Void débloqué'}), newly.length*650+300);
    }
    for(const sId in SKINS){
      const s=SKINS[sId];
      if(s.unlock && s.unlock!=='all' && s.unlock!=='shards_15' && s.unlock!=='camp_final'
        && profile.ach[s.unlock] && !profile.skinsUnlocked.includes(sId)){
        profile.skinsUnlocked.push(sId);
      }
    }
    saveP(); renderAch(); renderSkins();
  }
}
function showAchToast(a){
  if(achToastEl) achToastEl.remove();
  const el=document.createElement('div');
  el.className='ach-toast';
  el.innerHTML='<div class="ti">'+a.icon+'</div><div class="tt"><div class="tn">Succès débloqué</div><div class="tname">'+a.name+'</div></div>';
  document.body.appendChild(el);
  achToastEl=el;
  achSound(); vibrate([30,40,30]);
  setTimeout(()=>{ el.style.transition='opacity .4s'; el.style.opacity='0'; }, 2200);
  setTimeout(()=>{ if(el.parentNode) el.remove(); if(achToastEl===el) achToastEl=null; }, 2800);
}

/* =========================================================
   Anomaly
   ========================================================= */
function applyAnomalyEffect(card){
  card.apply(mods);
  if(mods.bonusLives !== 0){
    const delta = mods.bonusLives;
    mods.bonusLives = 0;
    maxLivesRun = Math.max(1, maxLivesRun + delta);
    lives = Math.max(1, Math.min(maxLivesRun, lives + delta));
  }
  buildPips();
  if(actx && !audioMuted) blip(660,0.2,'sine',0.14,990);
}
function pickAnomalyCard(){
  const owned={};
  for(const a of activeAnomalies) owned[a.id]=a.stacks;
  const available = ANOMALIES.filter(c => (owned[c.id]||0) < c.max);
  if(available.length===0) return null;
  const weights = { common:1, rare:0.55, legendary:0.25 };
  const pool=[];
  for(const c of available){
    const w = Math.max(1, Math.round(weights[c.rarity]*10));
    for(let i=0;i<w;i++) pool.push(c);
  }
  return pool[Math.floor(cardRng()*pool.length)];
}
function drawAnomalyCards(){
  anomCards.innerHTML='';
  const seen=new Set(); const chosen=[];
  for(let i=0;i<3;i++){
    let c=pickAnomalyCard(); if(!c) break;
    let guard=0;
    while(seen.has(c.id) && guard<20){ c=pickAnomalyCard(); guard++; }
    if(seen.has(c.id)) continue;
    seen.add(c.id); chosen.push(c);
  }
  for(const c of chosen){
    const el=document.createElement('div');
    el.className='card c-'+c.rarity;
    const stacks=(activeAnomalies.find(a=>a.id===c.id)||{stacks:0}).stacks;
    el.innerHTML = (stacks>0 ? '<span class="card-stack">×'+(stacks+1)+'</span>' : '')
      + '<div class="card-head"><div class="card-icon">'+c.icon+'</div>'
      + '<div><div class="card-name">'+c.name+'</div><div class="card-rarity">'+c.rarity+'</div></div></div>'
      + '<div class="card-desc">'+c.desc+'</div>';
    a11y(el); el.addEventListener('click', () => chooseAnomaly(c));
    anomCards.appendChild(el);
  }
}
function chooseAnomaly(card){
  addAnomaly(card);
  renderBuildBar();
  const rareSound = card.rarity === 'legendary' ? 1320 : card.rarity === 'rare' ? 990 : 660;
  if(actx && !audioMuted) [rareSound, rareSound*1.5, rareSound*2].forEach((f,i)=>setTimeout(()=>blip(f,0.15,'sine',0.1),i*60));
  flash = Math.max(flash, card.rarity === 'legendary' ? 0.7 : 0.35);
  shake = Math.max(shake, card.rarity === 'legendary' ? 18 : 8);
  vibrate(card.rarity === 'legendary' ? [40,30,50] : 30);
  anomalyScreen.classList.add('hidden');
  anomalyScreenOpen=false;
  state='play';
  checkSpecialization();
}
function openAnomalyScreen(){
  state='anomaly'; anomalyScreenOpen=true; attract=false;
  drawAnomalyCards();
  anomalyScreen.classList.remove('hidden');
}

/* =========================================================
   Cause de mort
   ========================================================= */
function analyzeDeath(c){
  if(!c) return {title:'FATALITÉ',text:"L'antimatière t'a eu."};
  if(c.wasAttracting && c.hadCharges && c.distance<c.parryRange*1.5)
    return {title:'TIMING RATÉ',text:ctl('deathTiming')};
  if(c.wasAttracting && !c.hadCharges)
    return {title:'SANS DÉFENSE',text:"Plus de charge. Collecte plus de <b>poussière dorée</b>."};
  if(c.wasAttracting)
    return {title:'TROP GOURMAND',text:"Tu as aspiré l'antimatière avec la poussière."};
  return {title:'DISTRAIT',text:"L'antimatière t'a atteint sans réaction."};
}
