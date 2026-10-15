/* GOULU — démarrage */
[
  ['resize', resize], ['hearts', buildHearts], ['pips', buildPips],
  ['sound', ()=>{ soundBtn.classList.toggle('muted', audioMuted); }],
  ['badges', refreshMenuBadges], ['daily', refreshDaily], ['ach', renderAch], ['skins', renderSkins],
  ['options', syncOptionsUI], ['dailyQuests', initDailyQuests], ['modes', renderModeGrid], ['quests', renderQuests],
  ['stats', renderStats], ['campaign', renderCampaign], ['journal', renderJournal], ['evolution', renderEvolution],
  ['a11y', ()=>{
    document.body.classList.toggle('big-text', !!profile.options.bigText);
    document.querySelectorAll('.icon-btn').forEach(b=>b.setAttribute('aria-label', b.title || 'bouton'));
    document.querySelectorAll('.opt-toggle').forEach(el=>{
      el.setAttribute('role','switch'); el.tabIndex = 0; el.setAttribute('aria-checked', el.classList.contains('on'));
      el.addEventListener('keydown', ev=>{ if(ev.code==='Space'||ev.code==='Enter'){ ev.preventDefault(); ev.stopPropagation(); el.click(); } });
      new MutationObserver(()=>el.setAttribute('aria-checked', el.classList.contains('on'))).observe(el, { attributes:true, attributeFilter:['class'] });
    });
  }],
  ['touch', ()=>{
    if(!IS_TOUCH) return;
    document.body.classList.add('touch');
    hintEl.textContent = 'Pouce en bas de l\'écran · Maintiens pour aspirer · Relâche pour l\'onde';
    $('howtoHold').innerHTML = '<b>Maintiens</b> ton doigt n\'importe où, idéalement <b>en bas de l\'écran</b> pour garder la vue dégagée : tu aspires tout.';
  }],
  ['version', ()=>{
    const dev = /-dev$/.test(GAME_VERSION);
    $('menuVersion').textContent = 'v' + GAME_VERSION + (dev ? ' · version de développement' : '');
  }],
  ['challenge', ()=>{
    challenge = parseChallenge();
    const cb = $('challengeBadge');
    if(challenge && cb){ cb.style.display = ''; cb.innerHTML = '🎯 Défi ami : bats <b>' + challenge.score + '</b>'; }
  }]
].forEach(([name, fn])=>{ try{ fn(); }catch(e){ console.warn('GOULU boot:', name, e); } });

setInterval(()=>{
  if(state==='menu'){
    if(dailyTimerEl) dailyTimerEl.textContent = nextMidnightIn();
    if(questsTimerEl) questsTimerEl.textContent = nextMidnightIn();
  }
}, 1000);
if(dailyTimerEl) dailyTimerEl.textContent = nextMidnightIn();
if(questsTimerEl) questsTimerEl.textContent = nextMidnightIn();

setInterval(()=>{
  if(state==='menu' && todayStr()!==profile.daily.date){
    try{ refreshDaily(); renderAch(); }catch(e){ console.warn(e); }
    profile.quests = freshQuests(todayStr()); saveP();
    try{ renderQuests(); }catch(e){ console.warn(e); }
  }
}, 60000);
