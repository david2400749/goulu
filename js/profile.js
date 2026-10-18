/* GOULU — profil joueur et sauvegarde locale */
/* =========================================================
   Storage V9
   ========================================================= */
const K = { profile:'goulu_profile_v10', v9:'goulu_profile_v9', legacy:'goulu_profile_v8' };
function freshQuests(date){
  return { date, picked: [], claimed: {}, plays:0, dust:0, parry:0, scoreSum:0,
    bestParry:0, bestScore:0, bestTime:0, bosses:0, anomalies:0, perfect:0, dailyDone:0,
    elemChains:0, bestWave:0 };
}
function loadP(){
  try{
    for(const key of [K.profile, K.v9, K.legacy]){
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      try{ return migrate(JSON.parse(raw)); }
      catch(err){
        try{ localStorage.setItem('goulu_corrupt_backup_'+key, raw); }catch(e2){}
        console.warn('GOULU: profil illisible, sauvegarde brute conservée', key, err);
      }
    }
  }catch(e){ console.warn('GOULU: stockage indisponible', e); }
  let legacyBest = 0;
  try{ legacyBest = parseInt(localStorage.getItem('goulu_best')||'0',10)||0; }catch(e){}
  return migrate({ best: legacyBest, bestRun: { score: legacyBest, parry:0, maxCombo:1, time:0 }, cum:{dust:0,parry:0,plays:0,bestSurvival:0} });
}
function migrate(p){
  p.best = p.best || 0;
  p.bestRun = p.bestRun || { score:p.best, parry:0, maxCombo:1, time:0 };
  p.bestRunPace = p.bestRunPace || null;
  p.cum = p.cum || { dust:0, parry:0, plays:0, bestSurvival:0 };
  p.ach = p.ach || {};
  p.streak = p.streak || { current:0, lastDate:'', best:0 };
  p.daily = p.daily || { date:'', score:0, attempts:0 };
  p.skin = p.skin || 'classic';
  p.skinsUnlocked = p.skinsUnlocked || ['classic'];
  p.muted = !!p.muted;
  p.bossesKilled = p.bossesKilled || 0;
  /* réglages manquants (profil partiel ou ancien) : valeurs par défaut, sinon le volume vaut NaN */
  p.options = Object.assign({ sfx:80, music:70, shake:true, colorblind:false }, p.options || {});
  if(p.options.vibrate === undefined) p.options.vibrate = true;
  if(p.options.reduceFx === undefined) p.options.reduceFx = false;
  if(p.options.bigText === undefined) p.options.bigText = false;
  if(p.options.assist === undefined) p.options.assist = false;
  if(p.options.beatOffset === undefined) p.options.beatOffset = 0;
  if(p.options.controls !== 'single') p.options.controls = 'dual';   // 0.13 : 2 commandes séparées par défaut
  p.schema = 10;
  p.shards = p.shards || 0;
  p.history = p.history || [];
  p.modeRecords = p.modeRecords || { classic: p.best, pacifist:0, blitz:0, chaos:0 };
  p.unlockedModes = p.unlockedModes || ['classic'];
  p.selectedMode = (p.selectedMode && p.selectedMode !== 'campaign') ? p.selectedMode : 'classic';
  p.perfectChains = p.perfectChains || 0;
  p.pulses = p.pulses || 0;
  p.resonances = p.resonances || 0;
  p.elemChains = p.elemChains || 0;
  p.bestWave = p.bestWave || 0;
  /* 0.14 : niveau du trou noir */
  p.level = Math.max(1, p.level || 1);
  p.xp = p.xp || 0;
  p.xpBonusDate = p.xpBonusDate || '';
  p.pulsarsKilled = p.pulsarsKilled || 0;
  p.specUnlocked = p.specUnlocked || {};
  p.tutorialDone = p.tutorialDone || false;
  p.bossTutorialDone = p.bossTutorialDone || false;
  /* V9 */
  p.campaign = p.campaign || { unlocked: 1, completed: {} };
  if(!p.campaign.best) p.campaign.best = {};
  p.lore = p.lore || {};
  p.upgrades = p.upgrades || {};
  p.techniques = p.techniques || {};
  p.replays = p.replays || {};
  if (!p.quests || p.quests.date !== todayStr()) p.quests = freshQuests(todayStr());
  if (!p.quests.elemChains) p.quests.elemChains = 0;
  if (!p.quests.bestWave) p.quests.bestWave = 0;
  /* 0.12.1 : les anciennes versions pouvaient enregistrer des scores décimaux */
  const ri = v => (typeof v === 'number' && isFinite(v)) ? Math.round(v) : v;
  p.best = ri(p.best);
  if(p.bestRun) p.bestRun.score = ri(p.bestRun.score);
  if(p.daily) p.daily.score = ri(p.daily.score);
  for(const k in p.modeRecords) p.modeRecords[k] = ri(p.modeRecords[k]);
  for(const k in p.campaign.best) p.campaign.best[k] = ri(p.campaign.best[k]);
  for(const h of p.history) if(h) h.score = ri(h.score);
  for(const k in p.replays){ const r = p.replays[k]; if(r){ r.score = ri(r.score); if(Array.isArray(r.pacing)) r.pacing = r.pacing.map(ri); } }
  if(Array.isArray(p.bestRunPace)) p.bestRunPace = p.bestRunPace.map(ri);
  ['bestScore','scoreSum'].forEach(k => { p.quests[k] = ri(p.quests[k]); });
  return p;
}
function saveP(){ try{ localStorage.setItem(K.profile, JSON.stringify(profile)); }catch(e){ console.warn('GOULU: sauvegarde impossible', e); } }
let profile = loadP();

