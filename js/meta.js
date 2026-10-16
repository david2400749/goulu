/* GOULU — progression de compte : chaque partie fait avancer quelque chose, même ratée.
   - Niveau du trou noir : XP gagnée à chaque partie, shards à chaque niveau.
   - Bonus du jour : la première partie de la journée rapporte double XP.
   - Seconde chance : une fois par partie, contre un shard (jamais dans le défi du jour).
   - Prochain objectif : le déblocage le plus proche, affiché en fin de partie. */
const XP_DAILY_MULT = 2;
const REVIVE_COST = 1, REVIVE_TIME = 6, REVIVE_MIN_TIME = 15;

function xpForLevel(lv){ return 100 + 35 * (lv - 1); }        // XP pour passer du niveau lv au suivant
function levelReward(lv){ return lv % 5 === 0 ? 3 : 1; }      // shards reçus en atteignant le niveau lv

/* XP d'une partie : surtout ce que le joueur a fait (survie, parry, boss), le score
   compte mais plafonné, pour qu'un multiplicateur énorme ne fasse pas sauter dix niveaux. */
function computeRunXp(run){
  const lines = [];
  const add = (label, v) => { v = Math.round(v); if(v > 0) lines.push({ label, v }); };
  add('Survie', run.time);
  add('Poussières', run.dust * 0.5);
  add('Parry', run.parry * 3);
  add('Boss vaincus', run.bosses * 40);
  add('Perfect Chain', (run.perfects || 0) * 15);
  add('Masse absorbée', Math.min(250, run.score / 100));
  if(run.cleared) add('Chapitre terminé', 60);
  return lines;
}
function grantXp(run){
  const lines = computeRunXp(run);
  let gained = lines.reduce((a, l) => a + l.v, 0);
  const today = todayStr();
  const bonus = gained > 0 && profile.xpBonusDate !== today;
  if(bonus){ gained *= XP_DAILY_MULT; profile.xpBonusDate = today; }
  const res = { gained, lines, bonus, fromLevel: profile.level, fromXp: profile.xp, levels: [], shards: 0 };
  profile.xp += gained;
  while(profile.xp >= xpForLevel(profile.level)){
    profile.xp -= xpForLevel(profile.level);
    profile.level++;
    const r = levelReward(profile.level);
    profile.shards += r; res.shards += r; res.levels.push({ level: profile.level, shards: r });
  }
  res.toLevel = profile.level; res.toXp = profile.xp;
  saveP();
  return res;
}
function dailyXpBonusAvailable(){ return profile.xpBonusDate !== todayStr(); }

/* Barre d'XP de l'écran de fin : remplit niveau par niveau, puis annonce les récompenses. */
let xpAnimToken = 0;
function showXpResult(res){
  const box = $('xpBox'); if(!box) return;
  if(!res){ box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  $('xpGain').textContent = '+' + res.gained + ' XP' + (res.bonus ? ' · bonus du jour ×' + XP_DAILY_MULT : '');
  $('xpLines').innerHTML = res.lines.map(l => '<span>' + l.label + ' <b>+' + l.v + '</b></span>').join('');
  const fill = $('xpFill'), lvl = $('xpLvl'), need = $('xpNeed');
  const token = ++xpAnimToken;
  const set = (level, xp, animate) => {
    fill.style.transition = animate ? 'transform .7s cubic-bezier(.2,.7,.2,1)' : 'none';
    fill.style.transform = 'scaleX(' + Math.min(1, xp / xpForLevel(level)) + ')';
    lvl.textContent = 'NIV. ' + level;
    need.textContent = Math.floor(xp) + ' / ' + xpForLevel(level);
    if(!animate) void fill.offsetWidth;   // fige la position de départ avant la transition suivante
  };
  set(res.fromLevel, res.fromXp, false);
  box.classList.remove('lvlup');
  const steps = [];
  for(const l of res.levels) steps.push({ level: l.level - 1, xp: xpForLevel(l.level - 1), up: l });
  steps.push({ level: res.toLevel, xp: res.toXp });
  let i = 0;
  const next = () => {
    if(token !== xpAnimToken || i >= steps.length) return;
    const s = steps[i++];
    if(s.up === undefined && i > 1) set(s.level, 0, false);
    requestAnimationFrame(() => {
      if(token !== xpAnimToken) return;
      set(s.level, s.xp, true);
      setTimeout(() => {
        if(token !== xpAnimToken) return;
        if(s.up){
          set(s.up.level, 0, false);
          box.classList.remove('lvlup'); void box.offsetWidth; box.classList.add('lvlup');
          showUnlockToast('💎', 'Niveau ' + s.up.level + ' · +' + s.up.shards + ' shard' + (s.up.shards > 1 ? 's' : ''));
          if(actx && !audioMuted) [660, 880, 1320].forEach((f, k) => blip(f, 0.18, 'sine', 0.12, undefined, k * 0.07));
          refreshMenuBadges();
        }
        next();
      }, 760);
    });
  };
  setTimeout(next, 350);
}

/* =========================================================
   Prochain objectif : le déblocage le plus avancé, pour donner une raison de relancer.
   ========================================================= */
function nextGoal(){
  const p = profile, goals = [];
  const add = (label, cur, target, unit) => { if(cur < target) goals.push({ label, cur: Math.floor(cur), target, unit, ratio: cur / target }); };
  const has = id => p.unlockedModes.includes(id), skin = id => p.skinsUnlocked.includes(id);
  if(!has('pacifist')) add('Mode Pacifiste', p.bossesKilled || 0, 1, 'boss');
  if(!has('blitz')) add('Mode Blitz', p.cum.plays, 30, 'parties');
  if(!has('chaos')) add('Mode Chaos', p.perfectChains, 1, 'Perfect Chain');
  if(!has('metronome')) add('Mode Métronome', p.pulses || 0, 20, 'pulses');
  if(!skin('red')) add('Skin Cramoisi', p.cum.parry, 50, 'parry');
  if(!skin('gold')) add('Skin Doré', p.cum.dust, 2000, 'poussières');
  if(!skin('cyan')) add('Skin Cyan', p.cum.bestSurvival, 60, 's de survie');
  if(!skin('prism')) add('Skin Prismatique', p.shards, 15, 'shards');
  const nextUp = UPGRADES.filter(u => !p.upgrades[u.id]).sort((a, b) => a.cost - b.cost)[0];
  if(nextUp) add('Évolution ' + nextUp.name, p.shards, nextUp.cost, 'shards');
  goals.sort((a, b) => b.ratio - a.ratio);
  return goals[0] || null;
}
function canBuyUpgrade(){ return UPGRADES.some(u => !profile.upgrades[u.id] && profile.shards >= u.cost); }
function showNextGoal(){
  const el = $('xpNext'); if(!el) return;
  if(canBuyUpgrade()){ el.innerHTML = '◆ Tu as de quoi acheter une <b>évolution</b> (menu → Évolution)'; return; }
  const g = nextGoal();
  el.innerHTML = g ? 'Prochain : <b>' + g.label + '</b> · ' + g.cur + ' / ' + g.target + ' ' + g.unit : '';
}

/* =========================================================
   Seconde chance
   ========================================================= */
let reviveUsed = false, reviveT = 0, runRevives = 0;
function canRevive(){
  return !reviveUsed && !lastGameWasDaily && state === 'play' && elapsed >= REVIVE_MIN_TIME && profile.shards >= REVIVE_COST;
}
/* Appelé quand la dernière vie tombe. */
function loseRun(){ if(canRevive()) openRevive(); else gameOver(); }
function openRevive(){
  state = 'revive'; attract = false; reviveT = REVIVE_TIME;
  $('reviveScore').textContent = score;
  $('reviveCost').textContent = REVIVE_COST;
  $('reviveOwned').textContent = profile.shards;
  $('reviveCount').textContent = REVIVE_TIME;
  $('reviveScreen').classList.remove('hidden');
  if(musicMasterGain && actx){ musicMasterGain.gain.cancelScheduledValues(actx.currentTime); musicMasterGain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.3); }
}
function tickRevive(dt){
  reviveT -= dt;
  const n = Math.max(0, Math.ceil(reviveT));
  const c = $('reviveCount'); if(c.textContent !== String(n)) c.textContent = n;
  $('reviveRing').style.transform = 'scaleX(' + Math.max(0, reviveT / REVIVE_TIME) + ')';
  if(reviveT <= 0) declineRevive();
}
function acceptRevive(){
  if(state !== 'revive' || profile.shards < REVIVE_COST) return;
  profile.shards -= REVIVE_COST; saveP(); refreshMenuBadges();
  reviveUsed = true; runRevives++;
  $('reviveScreen').classList.add('hidden');
  state = 'play';
  if(music.playing && musicMasterGain && actx && !audioMuted){
    musicMasterGain.gain.cancelScheduledValues(actx.currentTime);
    musicMasterGain.gain.linearRampToValueAtTime((profile.options.music/100)*MUSIC_GAIN, actx.currentTime + 0.3);
  }
  lives = Math.min(maxLivesRun, 2); hurtT = 0;
  invincibleT = 3; shockCharges = getMaxCharges();
  /* l'antimatière proche est soufflée, le boss repoussé : on repart sur une table propre */
  for(const e of entities){
    if(e.type === 'anti' && !e.dead){ burst(e.x, e.y, '#ffffff', 10, 300); e.dead = true; }
    else if(e.bossPart && boss && boss.type.id !== 'swarm'){
      const dx = bh.x - e.x, dy = bh.y - e.y, d = Math.sqrt(dx*dx + dy*dy) || 1;
      knockBoss(e, dx/d, dy/d, bh.r + 120);
    }
  }
  shockwaves.push({ r:bh.r, maxR:SHOCK_MAX_R*1.6, life:SHOCK_LIFE*1.4, maxLife:SHOCK_LIFE*1.4, hit:new Set(), isEcho:true, pulse:false, weak:false, counted:true });
  flash = reduceFx() ? 0.4 : 1; shake = Math.max(shake, 24);
  burst(bh.x, bh.y, '#ffffff', 60, 700); burst(bh.x, bh.y, '#ffd36b', 40, 520);
  addToast('✦ RENAISSANCE ✦', '#ffe9a3', H/2 - 120);
  if(actx && !audioMuted) [392, 523.25, 784, 1046.5].forEach((f, i) => blip(f, 0.35, 'triangle', 0.13, undefined, i * 0.08));
  vibrate([40, 30, 80]);
  thought('Pas encore. Pas comme ça.');
}
function declineRevive(){
  if(state !== 'revive') return;
  $('reviveScreen').classList.add('hidden');
  gameOver();
}

/* Série de jours : récompenses aux paliers, pour que revenir chaque jour paie. */
function streakReward(n){ return n % 7 === 0 ? 3 : (n === 3 ? 1 : 0); }

/* Badge de niveau du menu */
function renderLevelBadge(){
  const b = $('badgeLevel'); if(!b) return;
  b.querySelector('b').textContent = profile.level;
  b.querySelector('i').style.transform = 'scaleX(' + Math.min(1, profile.xp / xpForLevel(profile.level)) + ')';
  const bonus = $('dailyXpBonus');
  if(bonus) bonus.classList.toggle('hidden', !dailyXpBonusAvailable());
  const evoTab = document.querySelector('.mtab[data-tab="evolution"]');
  if(evoTab) evoTab.classList.toggle('notify', canBuyUpgrade());
}

const RUN_REROLLS = 1;
let rerollsLeft = RUN_REROLLS, lastXp = null;
