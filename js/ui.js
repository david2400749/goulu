/* GOULU — menus, partage, options, boutons */
function drawSpark(){
  if(!sparkCanvas) return;
  const rect = sparkCanvas.getBoundingClientRect();
  if(!rect.width) return;
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  const w = rect.width, h = 70;
  sparkCanvas.width = Math.floor(w*dpr); sparkCanvas.height = Math.floor(h*dpr);
  const cctx = sparkCanvas.getContext('2d');
  cctx.setTransform(dpr,0,0,dpr,0,0);
  cctx.clearRect(0,0,w,h);
  const hist = (profile.history||[]).slice(-30);
  if(hist.length < 2){
    cctx.fillStyle='rgba(255,255,255,0.15)';
    cctx.font='11px Inter, sans-serif'; cctx.textAlign='center'; cctx.textBaseline='middle';
    cctx.fillText('Joue au moins 2 parties', w/2, h/2);
    return;
  }
  const scores = hist.map(r=>r.score);
  const max = Math.max(...scores, 10);
  const pad = 6; const innerW = w - pad*2; const innerH = h - pad*2;
  const pts = scores.map((s,i)=>({
    x: pad + (i/(scores.length-1))*innerW,
    y: pad + innerH - (s/max)*innerH
  }));
  cctx.beginPath();
  pts.forEach((p,i)=> i===0 ? cctx.moveTo(p.x,p.y) : cctx.lineTo(p.x,p.y));
  cctx.strokeStyle='#a06eff'; cctx.lineWidth=2; cctx.lineJoin='round'; cctx.stroke();
  const bestIdx = scores.indexOf(max);
  pts.forEach((p,i)=>{
    cctx.beginPath(); cctx.arc(p.x, p.y, i===bestIdx ? 3.5 : 2, 0, Math.PI*2);
    cctx.fillStyle = i===bestIdx ? '#ffcb4d' : 'rgba(200,180,255,0.7)';
    cctx.fill();
  });
  const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  if($('sparkMin')) $('sparkMin').textContent = Math.min(...scores);
  if($('sparkMax')) $('sparkMax').textContent = max;
  if($('sparkAvg')) $('sparkAvg').textContent = avg;
}
function refreshMenuBadges(){
  if(badgeBestEl) badgeBestEl.textContent = profile.best;
  if(badgeStreakEl){
    const b = badgeStreakEl.querySelector('b');
    if(b) b.textContent = profile.streak.current;
    if(profile.streak.current>=2) badgeStreakEl.classList.add('active');
    else badgeStreakEl.classList.remove('active');
  }
  if(badgeShardsEl) badgeShardsEl.textContent = profile.shards;
  if(bestHudEl) bestHudEl.textContent = profile.best;
  if(badgeCampaignEl){
    const n = Object.keys(profile.campaign.completed||{}).length;
    const b = badgeCampaignEl.querySelector('b');
    if(b) b.textContent = n;
  }
}
function refreshDaily(){
  const today=todayStr();
  if(profile.daily.date!==today){ profile.daily={date:today, score:0, attempts:0}; saveP(); }
  if(dailyDateEl) dailyDateEl.textContent = humanDate(today);
  if(dailyRuleEl){ const r = dailyRuleFor(today); dailyRuleEl.textContent = '⚙ ' + r.name + ' · ' + r.desc; }
  if(dailyScoreEl) dailyScoreEl.textContent = profile.daily.score;
  if(dailyBestEl) dailyBestEl.textContent = profile.daily.score;
  if(dailyAttemptsEl) dailyAttemptsEl.textContent = profile.daily.attempts;
  if(dailyRecordEl) dailyRecordEl.textContent = profile.best;
}
function renderModeGrid(){
  if(!modeGridEl) return;
  modeGridEl.innerHTML='';
  for(const id in MODES){
    const m = MODES[id];
    const unlocked = profile.unlockedModes.includes(id);
    const selected = profile.selectedMode === id;
    const rec = profile.modeRecords[id] || 0;
    const el = document.createElement('div');
    el.className = 'mode-card' + (selected?' selected':'') + (unlocked?'':' locked');
    el.innerHTML =
      (unlocked ? '' : '<span class="mode-lock-badge">🔒 '+m.unlockLabel+'</span>')
      + '<div class="mode-head"><div class="mode-icon">'+m.icon+'</div><div class="mode-name">'+m.name+'</div></div>'
      + '<div class="mode-desc">'+m.desc+'</div>'
      + '<div class="mode-record'+(rec>0?'':' empty')+'">'+(rec>0 ? ('★ '+rec) : 'Pas encore joué')+'</div>';
    if(unlocked){
      a11y(el);
      el.addEventListener('click', ()=>{
        profile.selectedMode = id; saveP();
        renderModeGrid(); blip(660,0.1,'sine',0.08);
      });
    }
    modeGridEl.appendChild(el);
  }
}
function renderCampaign(){
  if(!campaignGridEl) return;
  campaignGridEl.innerHTML = '';
  for(const lvl of CAMPAIGN_LEVELS){
    const completed = !!profile.campaign.completed[lvl.n];
    const unlocked = lvl.n <= profile.campaign.unlocked;
    const el = document.createElement('div');
    el.className = 'camp-level' + (completed?' completed':'') + (!unlocked?' locked':'');
    el.innerHTML =
      '<div class="camp-num">'+lvl.n+'</div>'
      + '<div class="camp-body">'
      + '<div class="camp-name">'+lvl.name+'</div>'
      + '<div class="camp-desc">'+lvl.desc+'</div>'
      + '<div class="camp-status">'+(completed?('✓ Complété'+(profile.campaign.best[lvl.n]?' · '+profile.campaign.best[lvl.n]+' pts':'')):(unlocked?'Prêt':'Verrouillé'))+'</div>'
      + '</div>'
      + (completed?'<div class="camp-check">✓</div>':'');
    if(unlocked){
      a11y(el);
      el.addEventListener('click', ()=>{ initAudio(); blip(660,0.1,'sine',0.08); startCampaignLevel(lvl.n); });
    }
    campaignGridEl.appendChild(el);
  }
}
function renderJournal(){
  if(!journalListEl) return;
  journalListEl.innerHTML = '';
  for(const frag of LORE){
    const unlocked = !!profile.lore[frag.n];
    const el = document.createElement('div');
    el.className = 'frag' + (unlocked?'':' locked');
    el.innerHTML =
      '<div class="frag-num">Fragment ' + String(frag.n).padStart(2,'0') + ' · ' + frag.name + '</div>'
      + '<div class="frag-text">' + (unlocked ? frag.text : 'Fragment non découvert — termine le niveau ' + frag.n) + '</div>';
    journalListEl.appendChild(el);
  }
}
function renderEvolution(){
  if(!evoBranchesEl) return;
  const spent = Object.keys(profile.upgrades).length;
  if(shardsEvoCountEl) shardsEvoCountEl.textContent = profile.shards;
  if(shardsSpentEl) shardsSpentEl.textContent = spent;
  evoBranchesEl.innerHTML = '';
  const branches = [
    { id:'appetit', icon:'💰', name:'Appétit' },
    { id:'defense', icon:'🛡️', name:'Défense' },
    { id:'connaissance', icon:'👁️', name:'Connaissance' },
  ];
  for(const branch of branches){
    const col = document.createElement('div');
    col.className = 'evo-branch';
    col.innerHTML = '<div class="evo-branch-head"><span class="ic">'+branch.icon+'</span>'+branch.name+'</div>';
    const ups = UPGRADES.filter(u => u.branch === branch.id);
    for(const u of ups){
      const owned = !!profile.upgrades[u.id];
      const canBuy = !owned && profile.shards >= u.cost;
      const el = document.createElement('div');
      el.className = 'evo-upg ' + (owned?'owned':(canBuy?'':'locked'));
      el.innerHTML =
        '<div class="ic">'+u.icon+'</div>'
        + '<div class="nm">'+u.name+'</div>'
        + '<div class="ds">'+u.desc+'</div>'
        + '<div class="cost">'+(owned?'✓ Acheté':'💎 '+u.cost)+'</div>';
      if(canBuy){
        a11y(el);
        el.addEventListener('click', ()=>{
          if(profile.shards < u.cost) return;
          profile.shards -= u.cost;
          profile.upgrades[u.id] = true;
          saveP();
          renderEvolution();
          refreshMenuBadges();
          blip(880,0.2,'sine',0.15,1320);
          showUnlockToast(u.icon, u.name + ' activé !');
        });
      }
      col.appendChild(el);
    }
    evoBranchesEl.appendChild(col);
  }
}
function renderAch(){
  if(!achGridEl) return;
  const unlockedCount = ACH.filter(a=>profile.ach[a.id]).length;
  if(achCountEl) achCountEl.textContent = unlockedCount;
  if(achTotalEl) achTotalEl.textContent = ACH.length;
  achGridEl.innerHTML = '';
  for(const a of ACH){
    const isUnlocked = !!profile.ach[a.id];
    const el = document.createElement('div');
    el.className = 'ach ' + (isUnlocked?'unlocked':'locked');
    let inner = '<div class="ach-icon">'+(isUnlocked?a.icon:'🔒')+'</div>'
              + '<div class="ach-name">'+a.name+'</div>'
              + '<div class="ach-desc">'+a.desc+'</div>';
    el.innerHTML = inner;
    achGridEl.appendChild(el);
  }
}
function renderSkins(){
  if(!skinGridEl) return;
  skinCountEl.textContent = profile.skinsUnlocked.length;
  skinGridEl.innerHTML='';
  for(const id in SKINS){
    const s=SKINS[id];
    const unlocked = profile.skinsUnlocked.includes(id);
    const equipped = profile.skin === id;
    const el=document.createElement('div');
    el.className = 'skin ' + (unlocked?'':'locked') + (equipped?' equipped':'');
    el.innerHTML =
      '<div class="skin-preview" style="border-color:'+s.preview+';box-shadow:0 0 20px -2px '+s.preview+'">'
      + '<div style="width:20px;height:20px;border-radius:50%;background:#000;border:2px solid '+s.preview+'"></div>'
      + '</div>'
      + '<div class="skin-name">'+s.name+'</div>'
      + '<div class="skin-lock">'+(equipped?'✓ Équipé':(unlocked?s.desc:'🔒 '+s.desc))+'</div>';
    if(unlocked){
      a11y(el);
      el.addEventListener('click', ()=>{ profile.skin=id; saveP(); renderSkins(); blip(660,0.12,'sine',0.1,990); });
    }
    skinGridEl.appendChild(el);
  }
}
/* Applique le mode de commandes : classe CSS (boutons tactiles) et textes d'aide */
function applyControls(){
  document.body.classList.toggle('ctrl-dual', dualControls());
  for(const [id, key] of [['howtoHold','howtoHold'],['howtoWave','howtoWave'],['howtoBeat','howtoBeat'],['howtoBoss','howtoBoss']]){
    const el = $(id); if(el) el.innerHTML = ctl(key);
  }
  if(hintEl) hintEl.textContent = ctl('hint');
  if(bossHintEl) bossHintEl.textContent = ctl('bossHint');
}
function renderTechniques(){
  const grid = $('techGrid'); if(!grid) return;
  grid.innerHTML = '';
  let n = 0;
  for(const t of TECHNIQUES){
    const on = !!profile.techniques[t.id]; if(on) n++;
    const el = document.createElement('div');
    el.className = 'ach ' + (on ? 'unlocked' : 'locked');
    el.innerHTML = '<div class="ach-icon">' + (on ? t.icon : '🔒') + '</div>'
      + '<div class="ach-name">' + t.name + '</div>'
      + '<div class="ach-desc">' + t.desc + '</div>'
      + '<div class="ach-fx">' + t.effect + '</div>';
    grid.appendChild(el);
  }
  if($('techCount')) $('techCount').textContent = n;
}
function renderQuests(){
  try{ initDailyQuests(); }catch(e){}
  const q = profile.quests; if(!q) return;
  if(shardsCountEl) shardsCountEl.textContent = profile.shards;
  if(shardsGoalEl) shardsGoalEl.textContent = Math.min(profile.shards, 15) + ' / 15';
  if(questsTimerEl) questsTimerEl.textContent = nextMidnightIn();
  if(!questListEl) return;
  questListEl.innerHTML = '';
  for(const id of q.picked){
    const def = QUEST_POOL.find(x=>x.id===id); if(!def) continue;
    const v = q[def.field] || 0;
    const done = !!q.claimed[id];
    const pct = Math.min(1, v/def.target);
    const el = document.createElement('div');
    el.className = 'quest-card' + (done?' done':'');
    el.innerHTML =
      '<div class="quest-top"><div class="quest-label">'+def.label+'</div>'
      + '<div class="quest-reward">'+(done?'✓ +1 SHARD':'💎 1')+'</div></div>'
      + '<div class="quest-prog-text">'+(done?'Complétée !':def.fmt(v))+'</div>'
      + '<div class="quest-bar"><div class="quest-fill" style="transform:scaleX('+pct+')"></div></div>';
    questListEl.appendChild(el);
  }
}
function renderStats(){
  const plays = profile.cum.plays || 0;
  let totalSec = 0;
  for(const r of profile.history) totalSec += r.time || 0;
  if(statsPlaysEl) statsPlaysEl.textContent = plays;
  if(statsTimeEl) statsTimeEl.textContent = totalSec < 60 ? (totalSec+'s') : Math.round(totalSec/60)+'m';
  if(statsParryEl) statsParryEl.textContent = profile.cum.parry;
  if(statsBossEl) statsBossEl.textContent = profile.bossesKilled || 0;
  if(statsBestEl) statsBestEl.textContent = profile.best;
  const hist = profile.history.slice(-30);
  const avg = hist.length ? Math.round(hist.reduce((a,b)=>a+b.score,0)/hist.length) : 0;
  if(statsAvgEl) statsAvgEl.textContent = avg;
  if(statsWaveEl) statsWaveEl.textContent = profile.bestWave || 0;
  if(statsElemEl) statsElemEl.textContent = profile.elemChains || 0;
  renderTechniques();
  try{ drawSpark(); }catch(e){}
}

/* Tabs */
document.querySelectorAll('.mtab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const tab=btn.dataset.tab;
    document.querySelectorAll('.mtab').forEach(b=>b.classList.toggle('active', b===btn));
    document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active', p.dataset.panel===tab));
    try{
      if(tab==='daily') refreshDaily();
      if(tab==='ach') renderAch();
      if(tab==='skins') renderSkins();
      if(tab==='quests') renderQuests();
      if(tab==='stats'){ renderStats(); renderAch(); }
      if(tab==='play') renderModeGrid();
      if(tab==='campaign'){ renderCampaign(); renderJournal(); }
      if(tab==='journal') renderJournal();
      if(tab==='evolution') renderEvolution();
    }catch(e){}
  });
});

/* Share */
function buildSummary(){
  const bits = [];
  if(runResonances > 0) bits.push('Résonance ×' + runResonances);
  if(runPulses > 0) bits.push(runPulses + ' pulses');
  if(runPerfects > 0) bits.push('Perfect Chain ×' + runPerfects);
  if(runBossesKilled > 0) bits.push(runBossesKilled + ' boss');
  bits.push(runHits === 0 ? 'sans dégât' : runHits + ' dégât' + (runHits > 1 ? 's' : ''));
  if(parryCount > 0) bits.push(parryCount + ' parry');
  return bits.join(' · ');
}
function shareLabel(){
  if(lastGameWasDaily) return 'DÉFI DU ' + humanDate(todayStr()).toUpperCase();
  if(currentCampaignLevel) return 'NIVEAU ' + currentCampaignLevel.n + ' · ' + currentCampaignLevel.name;
  return currentMode.label;
}
function shareUrl(){
  const base = location.href.split('#')[0];
  const q = ['s=' + score];
  if(lastGameWasDaily) q.push('d=' + todayStr());
  if(currentCampaignLevel) q.push('c=' + currentCampaignLevel.n); else q.push('m=' + currentMode.id);
  return base + '#' + q.join('&');
}
function buildShareText(){
  const header = '🕳️ GOULU · ' + shareLabel();
  const parts = [header, score + ' pts', buildSummary()];
  if(profile.streak.current >= 2) parts.push('🔥 ' + profile.streak.current + ' jours');
  parts.push('Bats-moi : ' + shareUrl());
  return parts.join('\n');
}
function buildShareImage(){
  return new Promise(resolve => {
    try{
      const c = document.createElement('canvas'); c.width = c.height = 1080;
      const g = c.getContext('2d'), sk = SKINS[profile.skin];
      const bg = g.createRadialGradient(540,430,40,540,540,820);
      bg.addColorStop(0,'#1a0e3a'); bg.addColorStop(1,'#04040a');
      g.fillStyle = bg; g.fillRect(0,0,1080,1080);
      const gl = g.createRadialGradient(540,380,40,540,380,300);
      gl.addColorStop(0,sk.glow[0]); gl.addColorStop(1,sk.glow[2]);
      g.fillStyle = gl; g.beginPath(); g.arc(540,380,300,0,Math.PI*2); g.fill();
      g.lineCap = 'round'; g.lineWidth = 9;
      for(let i=0;i<3;i++){ g.beginPath(); g.arc(540,380,128+i*14,i*2.1,i*2.1+1.55); g.strokeStyle = sk.ring[i]; g.stroke(); }
      g.beginPath(); g.arc(540,380,110,0,Math.PI*2); g.fillStyle = '#000'; g.fill();
      g.strokeStyle = sk.stroke; g.lineWidth = 5; g.stroke();
      g.textAlign = 'center';
      g.fillStyle = '#fff'; g.font = '900 160px system-ui, sans-serif'; g.fillText(String(score), 540, 710);
      g.fillStyle = '#a9aecb'; g.font = '700 38px system-ui, sans-serif'; g.fillText(shareLabel(), 540, 780);
      g.fillStyle = '#ffcb4d'; g.font = '800 40px system-ui, sans-serif'; g.fillText(buildSummary(), 540, 870);
      g.fillStyle = '#fff'; g.font = '900 70px system-ui, sans-serif'; g.fillText('GOULU', 540, 990);
      c.toBlob(b => resolve(b), 'image/png');
    }catch(e){ resolve(null); }
  });
}
function parseChallenge(){
  try{
    const h = location.hash.replace(/^#/, '');
    if(!h) return null;
    const q = new URLSearchParams(h);
    const s = parseInt(q.get('s')||'0', 10);
    if(!s) return null;
    return { score:s, daily:q.get('d'), mode:q.get('m'), camp:q.get('c') };
  }catch(e){ return null; }
}
async function doShare(){
  const text = buildShareText();
  let done = false;
  try{
    if(navigator.share){
      const blob = await buildShareImage();
      let data = { text };
      if(blob){
        const file = new File([blob], 'goulu.png', { type:'image/png' });
        if(navigator.canShare && navigator.canShare({ files:[file] })) data = { text, files:[file] };
      }
      await navigator.share(data); done = true;
    }
  }catch(e){ if(e && e.name === 'AbortError') return; }
  let ok = done;
  if(!ok){
    try{ if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); ok = true; } }catch(e){}
  }
  if(!ok){
    try{
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    }catch(e){}
  }
  if(ok){
    btnShare.classList.add('copied');
    btnShare.textContent = done ? '✓ Partagé !' : '✓ Copié !';
    vibrate(20);
    setTimeout(()=>{ btnShare.classList.remove('copied'); btnShare.textContent = 'Partager mon résultat'; }, 2000);
  } else {
    btnShare.textContent = '⚠️ Copie impossible';
    setTimeout(()=>{ btnShare.textContent = 'Partager mon résultat'; }, 2000);
  }
}

/* Options */
function syncOptionsUI(){
  const o=profile.options;
  $('optSfx').value=o.sfx; $('optSfxVal').textContent=o.sfx+'%';
  $('optMusic').value=o.music; $('optMusicVal').textContent=o.music+'%';
  $('optShake').classList.toggle('on', !!o.shake);
  $('optColorblind').classList.toggle('on', !!o.colorblind);
  $('optReduce').classList.toggle('on', !!o.reduceFx);
  $('optVibrate').classList.toggle('on', o.vibrate !== false);
  $('optBig').classList.toggle('on', !!o.bigText);
  $('optAssist').classList.toggle('on', !!o.assist);
  $('optSingle').classList.toggle('on', o.controls === 'single');
  $('optBeat').value = o.beatOffset || 0; $('optBeatVal').textContent = (o.beatOffset || 0) + ' ms';
}
$('optSfx').addEventListener('input', e=>{
  profile.options.sfx = +e.target.value; $('optSfxVal').textContent = profile.options.sfx+'%';
  if(masterSfxGain && actx && !audioMuted) masterSfxGain.gain.value = (profile.options.sfx/100)*0.6;
  saveP();
});
$('optMusic').addEventListener('input', e=>{
  profile.options.music = +e.target.value; $('optMusicVal').textContent = profile.options.music+'%';
  if(music.playing && musicMasterGain && actx){
    const t=(profile.options.music/100)*MUSIC_GAIN;
    musicMasterGain.gain.cancelScheduledValues(actx.currentTime);
    musicMasterGain.gain.linearRampToValueAtTime(t, actx.currentTime+0.1);
  }
  saveP();
});
$('optShake').addEventListener('click', e=>{
  profile.options.shake = !profile.options.shake;
  e.target.classList.toggle('on', profile.options.shake);
  saveP();
});
$('optColorblind').addEventListener('click', e=>{
  profile.options.colorblind = !profile.options.colorblind;
  e.target.classList.toggle('on', profile.options.colorblind);
  saveP();
});
$('optSingle').addEventListener('click', e=>{
  profile.options.controls = profile.options.controls === 'single' ? 'dual' : 'single';
  e.currentTarget.classList.toggle('on', profile.options.controls === 'single');
  attract = false; holdTouches.clear();
  applyControls(); saveP();
});
$('optBeat').addEventListener('input', e=>{ profile.options.beatOffset = +e.target.value; $('optBeatVal').textContent = profile.options.beatOffset + ' ms'; saveP(); });
[['optReduce','reduceFx'],['optVibrate','vibrate'],['optBig','bigText'],['optAssist','assist']].forEach(([id,key])=>{
  $(id).addEventListener('click', e=>{
    profile.options[key] = !profile.options[key];
    e.currentTarget.classList.toggle('on', !!profile.options[key]);
    if(key === 'bigText') document.body.classList.toggle('big-text', !!profile.options.bigText);
    saveP();
  });
});

/* Buttons */
$('btnPlay').addEventListener('click', e=>{
  e.stopPropagation();
  try{ initAudio(); updateStreakOnPlay(); }catch(err){}
  lastGameWasDaily = false;
  currentCampaignLevel = null;
  if(!profile.tutorialDone){ startTutorial(); }
  else { startGame(profile.selectedMode || 'classic', false); }
});
$('btnDaily').addEventListener('click', e=>{
  e.stopPropagation();
  try{ initAudio(); updateStreakOnPlay(); }catch(err){}
  lastGameWasDaily = true; currentCampaignLevel = null;
  startGame('classic', true);
});
$('btnReplay').addEventListener('click', e=>{
  e.stopPropagation(); initAudio();
  if(currentCampaignLevel) startCampaignLevel(overReplayMode === 'next' ? currentCampaignLevel.n + 1 : currentCampaignLevel.n);
  else startGame(currentMode.id, lastGameWasDaily);
});
$('btnMenu').addEventListener('click', e=>{ e.stopPropagation(); backToMenu(); });
btnShare.addEventListener('click', e=>{ e.stopPropagation(); doShare(); });
if(btnDownloadClip) btnDownloadClip.addEventListener('click', e=>{ e.stopPropagation(); downloadClip(); });
if(clipBtn) clipBtn.addEventListener('click', e=>{
  e.stopPropagation();
  if(clipRecorderActive) stopClipRecording();
  else startClipRecording();
});
soundBtn.addEventListener('click', e=>{
  e.stopPropagation(); initAudio();
  audioMuted = !audioMuted; profile.muted = audioMuted; saveP();
  soundBtn.classList.toggle('muted', audioMuted);
  if(music.playing && musicMasterGain && actx){
    const t = audioMuted ? 0 : (profile.options.music/100)*MUSIC_GAIN;
    musicMasterGain.gain.cancelScheduledValues(actx.currentTime);
    musicMasterGain.gain.linearRampToValueAtTime(t, actx.currentTime+0.2);
  }
});
pauseBtn.addEventListener('click', e=>{ e.stopPropagation(); if(state==='play') togglePause(); });
$('btnResume').addEventListener('click', ()=>{ togglePause(); });
$('btnOptions').addEventListener('click', ()=>{ syncOptionsUI(); optionsScreen.classList.remove('hidden'); });
$('btnCloseOptions').addEventListener('click', ()=>{ optionsScreen.classList.add('hidden'); });
$('btnMenuOptions').addEventListener('click', e=>{ e.stopPropagation(); initAudio(); syncOptionsUI(); optionsScreen.classList.remove('hidden'); $('btnCloseOptions').focus(); });
let quitArm = 0;
$('btnQuit').addEventListener('click', ()=>{
  const b = $('btnQuit');
  if(quitArm && performance.now() - quitArm < 3000){ quitArm = 0; b.textContent = 'QUITTER'; backToMenu(); }
  else {
    quitArm = performance.now(); b.textContent = 'CONFIRMER ?';
    setTimeout(()=>{ if(quitArm && performance.now() - quitArm >= 2900){ quitArm = 0; b.textContent = 'QUITTER'; } }, 3000);
  }
});
$('btnSkipTut').addEventListener('click', e=>{ e.stopPropagation(); if(tutorialActive) endTutorial(); });
if($('btnVictoryMenu')) $('btnVictoryMenu').addEventListener('click', ()=>{ backToMenu(); });

function updateStreakOnPlay(){
  const today=todayStr();
  if(profile.streak.lastDate===today) return;
  if(profile.streak.lastDate===yesterdayStr()) profile.streak.current++;
  else profile.streak.current=1;
  profile.streak.lastDate=today;
  if(profile.streak.current>profile.streak.best) profile.streak.best=profile.streak.current;
  saveP();
  refreshMenuBadges();
}
