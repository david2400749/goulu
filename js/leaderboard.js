/* =========================================================
   GOULU — classement mondial du défi du jour (Supabase)
   ---------------------------------------------------------
   La base n'expose que deux fonctions (voir supabase/daily_leaderboard.sql) :
   - submit_daily_score : garde le meilleur score du joueur pour le jour, renvoie son rang
   - daily_leaderboard  : les meilleurs noms et scores du jour
   La clé ci-dessous est la clé PUBLIQUE du projet (faite pour être dans le navigateur) ;
   elle ne donne accès qu'à ces deux fonctions, jamais à la table.
   Le classement n'est actif que sur le site publié (github.io) ou avec ?lb dans l'adresse,
   pour que les tests et le développement local n'écrivent jamais dans la vraie base.
   ========================================================= */
const LB = {
  url: 'https://rlnoaxrmimrdyistuuww.supabase.co',
  key: 'sb_publishable_r2gH12CvFhMPX3v89JKLOA_YugerPbV',
  timeout: 8000
};
let lbLast = null;          // dernier résultat d'envoi : { rank, total, day }

function lbEnabled(){ return /(^|\.)github\.io$/.test(location.hostname) || /[?&]lb(\b|=)/.test(location.search); }
function lbUuid(){
  try{ if(crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(e){}
  const h = '0123456789abcdef'; let s = '';
  for(let i = 0; i < 32; i++) s += h[Math.floor(Math.random() * 16)];
  return s.slice(0, 8) + '-' + s.slice(8, 12) + '-4' + s.slice(13, 16) + '-a' + s.slice(17, 20) + '-' + s.slice(20, 32);
}
function playerId(){
  if(!profile.playerId){ profile.playerId = lbUuid(); saveP(); }
  return profile.playerId;
}
function lbName(){ return bhName() || ('Trou noir ' + playerId().slice(0, 4).toUpperCase()); }

async function lbCall(fn, body){
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), LB.timeout) : 0;
  try{
    const r = await fetch(LB.url + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'apikey': LB.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined
    });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { if(timer) clearTimeout(timer); }
}

/* Envoi du score d'un défi du jour. Ne lève jamais d'erreur : hors ligne, on continue sans classement. */
async function submitDailyScore(score){
  if(!lbEnabled() || !(score > 0)) return null;
  const day = todayStr();
  try{
    const rows = await lbCall('submit_daily_score', { p_day: day, p_player: playerId(), p_name: lbName(), p_score: Math.round(score) });
    const r = rows && rows[0];
    if(!r) return null;
    lbLast = { rank: r.rank, total: r.total, day };
    return lbLast;
  }catch(e){ console.warn('GOULU classement : envoi impossible', e && e.message); return null; }
}
async function fetchDailyBoard(limit){
  if(!lbEnabled()) return null;
  try{ return await lbCall('daily_leaderboard', { p_day: todayStr(), p_limit: limit || 10 }); }
  catch(e){ console.warn('GOULU classement : lecture impossible', e && e.message); return null; }
}

/* ---------- affichage ---------- */
function rankLabel(n){ return n === 1 ? '1er' : n + 'e'; }
async function renderDailyBoard(){
  const box = $('dailyBoard'), list = $('dailyBoardList'), foot = $('dailyBoardFoot');
  if(!box) return;
  if(!lbEnabled()){ box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  list.innerHTML = '<div class="lb-empty">Chargement…</div>';
  const rows = await fetchDailyBoard(10);
  list.innerHTML = '';
  if(rows === null){ list.innerHTML = '<div class="lb-empty">Classement indisponible (hors ligne ?)</div>'; foot.textContent = ''; return; }
  if(!rows.length){ list.innerHTML = '<div class="lb-empty">Personne encore aujourd\'hui. Sois le premier.</div>'; foot.textContent = ''; return; }
  const me = lbName();
  for(const r of rows){
    const el = document.createElement('div');
    el.className = 'lb-row' + (r.name === me && profile.daily.score === r.score ? ' me' : '');
    const rk = document.createElement('span'); rk.className = 'lb-rank'; rk.textContent = rankLabel(r.rank);
    const nm = document.createElement('span'); nm.className = 'lb-name'; nm.textContent = r.name;   // textContent : jamais de HTML venu de la base
    const sc = document.createElement('span'); sc.className = 'lb-score'; sc.textContent = r.score;
    el.append(rk, nm, sc);
    list.appendChild(el);
  }
  const total = rows[0].total;
  foot.textContent = (lbLast && lbLast.day === todayStr())
    ? 'Ton rang : ' + rankLabel(lbLast.rank) + ' sur ' + lbLast.total
    : total + ' joueur' + (total > 1 ? 's' : '') + ' aujourd\'hui';
}

/* Après un défi du jour : envoi, puis le rang s'affiche sur l'écran de fin. */
async function afterDailyRun(score){
  const el = $('lbRank'); if(!el) return;
  el.textContent = '';
  if(!lbEnabled() || !(score > 0)) return;
  el.textContent = '🌍 Envoi au classement…';
  const r = await submitDailyScore(score);
  el.textContent = r ? '🌍 Classement du jour : ' + rankLabel(r.rank) + ' sur ' + r.total : '🌍 Classement indisponible';
}
