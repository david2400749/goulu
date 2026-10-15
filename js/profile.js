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
  p.options = p.options || { sfx:80, music:70, shake:true, colorblind:false };
  if(p.options.vibrate === undefined) p.options.vibrate = true;
  if(p.options.reduceFx === undefined) p.options.reduceFx = false;
  if(p.options.bigText === undefined) p.options.bigText = false;
  if(p.options.assist === undefined) p.options.assist = false;
  if(p.options.beatOffset === undefined) p.options.beatOffset = 0;
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
  return p;
}
function saveP(){ try{ localStorage.setItem(K.profile, JSON.stringify(profile)); }catch(e){ console.warn('GOULU: sauvegarde impossible', e); } }
let profile = loadP();

