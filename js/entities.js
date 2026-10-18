/* GOULU — entités, boss, particules, pensées */
function edgePoint(){
  const a=rng()*Math.PI*2;
  const hw=W/2+55, hh=H/2+55;
  const c=Math.cos(a), s=Math.sin(a);
  const k=1/Math.max(Math.abs(c)/hw,Math.abs(s)/hh);
  return {x:bh.x+c*k, y:bh.y+s*k};
}
function spawnEntity(type, fx, fy, dustType){
  let x,y;
  if(fx!==undefined){ x=fx; y=fy; } else { const p=edgePoint(); x=p.x; y=p.y; }
  if(type==='anti'){
    let ok=true;
    for(let i=0;i<entities.length;i++){
      const o=entities[i]; if(o.type!=='dust') continue;
      const dx=o.x-x, dy=o.y-y;
      if(dx*dx+dy*dy<120*120){ ok=false; break; }
    }
    if(!ok){ const p=edgePoint(); x=p.x; y=p.y; }
  }
  const base=type==='dust'?24:34;
  const ang=Math.atan2(bh.y-y,bh.x-x)+(rng()-0.5)*0.9;
  const spd=(base+rng()*26)*PHYS;
  entities.push({
    x, y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd,
    r:type==='dust'?R_DUST:R_ANTI, type,
    dustType: type==='dust' ? (dustType || pickDustType()) : null,
    phase:rng()*Math.PI*2, trail:[]
  });
}
function spawnTutorialRing(){
  const R=Math.min(W,H)*0.28;
  for(let i=0;i<4;i++){
    const a=(i/4)*Math.PI*2-Math.PI/2;
    spawnEntity('dust', bh.x+Math.cos(a)*R, bh.y+Math.sin(a)*R, 'gold');
  }
}

/* =========================================================
   BOSS
   ========================================================= */
function spawnBossByName(bossId){
  const type = BOSS_TYPES.find(b => b.id === bossId) || BOSS_TYPES[0];
  const bossHp = (!currentCampaignLevel && bossesKilled === 0 && type.id === 'consumer') ? type.hp - 1 : type.hp;
  boss = { type, hp:bossHp, maxHp:bossHp, parts:[], hitFlash:0 };
  if(type.id==='consumer'){
    const p=edgePoint();
    const ang=Math.atan2(bh.y-p.y, bh.x-p.x);
    const e={ x:p.x, y:p.y, vx:Math.cos(ang)*30*PHYS, vy:Math.sin(ang)*30*PHYS, r:38, type:'boss', bossPart:true, phase:rng()*Math.PI*2, isMain:true, trail:[] };
    entities.push(e); boss.parts.push(e);
  } else if(type.id==='swarm'){
    const R=Math.min(200, Math.min(W,H)*0.42);
    const baseAng=rng()*Math.PI*2;
    for(let i=0;i<bossHp;i++){          // un éclat par PV : détruire tous les éclats tue la Nuée
      const a=baseAng+(i/bossHp)*Math.PI*2;
      const e={ x:bh.x+Math.cos(a)*R, y:bh.y+Math.sin(a)*R, vx:0, vy:0, r:12, type:'boss', bossPart:true, phase:rng()*Math.PI*2, swarmAngle:a, swarmR:R, swarmR0:R, isMain:false, trail:[] };
      entities.push(e); boss.parts.push(e);
    }
  } else if(type.id==='eye'){
    const a=rng()*Math.PI*2;
    const R=Math.min(220, Math.min(W,H)*0.4);
    const e={ x:bh.x+Math.cos(a)*R, y:bh.y+Math.sin(a)*R, vx:0, vy:0, r:30, type:'boss', bossPart:true, phase:0, isMain:true, shootTimer:1.5, eyeAngle:a, eyeR:R, eyeR0:R, trail:[] };
    entities.push(e); boss.parts.push(e);
  }
  bossNameEl.textContent = type.name + ' · ' + bossHp + ' / ' + bossHp;
  bossFillEl.style.transform = 'scaleX(1)';
  bossBarEl.classList.add('on');
  if(bossHintEl) bossHintEl.classList.remove('hidden');
  if(actx && !audioMuted){ blip(120,0.6,'sawtooth',0.15,60); blip(180,0.5,'triangle',0.1); }
  vibrate([50,30,50]);
  shake = Math.max(shake, 28);
  addToast('⚠️ ' + type.name.toUpperCase(), type.color, H/2-130);
  thoughtOnce('boss_'+type.id, BOSS_THOUGHTS[type.id] || 'Quelque chose d\'immense a faim aussi.');
  if(!profile.bossTutorialDone){
    profile.bossTutorialDone = true; saveP();
    setTimeout(() => {
      addToast(ctl('bossToast1'), '#7ee7ff', H/2 - 60);
      setTimeout(() => { addToast(ctl('bossToast2'), '#ffcb4d', H/2 - 60); }, 2200);
    }, 800);
  }
}
function spawnBoss(){ spawnBossByName(BOSS_TYPES[bossesKilled % BOSS_TYPES.length].id); }

function damageBoss(amount, x, y){
  if(!boss) return;
  boss.hp -= amount;
  boss.hitFlash = 0.18;
  const ratio = Math.max(0, boss.hp/boss.maxHp);
  bossFillEl.style.transform = 'scaleX('+ratio+')';
  bossNameEl.textContent = boss.type.name + ' · ' + Math.max(0,boss.hp) + ' / ' + boss.maxHp;
  spawnDamageNumber(x, y - 20, '-' + amount);
  burst(x, y, '#ffffff', 30, 700);
  burst(x, y, boss.type.color, 20, 500);
  shake = Math.max(shake, 22);
  hitstop = HITSTOP_BOSS;
  vibrate(35);
  if(actx && !audioMuted) blip(220, 0.14, 'sawtooth', 0.15, 60);
  if(boss.hp <= 0) killBoss();
  else if(!boss.enraged && boss.hp <= boss.maxHp / 2) enrageBoss();
}
/* Deuxième phase à mi-vie : le boss accélère et frappe plus fort, le combat change de rythme. */
function enrageBoss(){
  boss.enraged = true;
  addToast('⚠ ' + boss.type.name.toUpperCase() + ' ENRAGÉ', '#ff5c5c', H/2 - 150);
  shake = Math.max(shake, 26); flash = Math.max(flash, reduceFx() ? 0.2 : 0.5);
  for(const p of boss.parts) burst(p.x, p.y, '#ff3b3b', 24, 520);
  if(actx && !audioMuted){ blip(90, 0.7, 'sawtooth', 0.16, 45); blip(140, 0.5, 'square', 0.08, 70, 0.1); }
  vibrate([60, 30, 60]);
  thoughtOnce('enrage', 'Il a peur. Moi aussi.');
}
function killBoss(){
  if(!boss) return;
  bossesKilled++; runBossesKilled++;
  profile.bossesKilled = (profile.bossesKilled||0) + 1;
  for(const en of entities) if(en.bossPart) en.dead = true;
  const bonus = boss.type.pts;
  addScore(bonus);
  shockCharges = getMaxCharges();
  if(currentCampaignLevel) heal(1);
  const card = pickAnomalyCard();
  if(card && !campaignNoAnomaly) addAnomaly(card);
  burst(W/2, H/2, '#ffffff', 80, 800);
  burst(W/2, H/2, boss.type.color, 60, 650);
  flash = 1.2; shake = 34;
  vibrate([60,40,80]);
  addToast('💀 ' + boss.type.name + ' VAINCU +'+bonus, '#ffdd44', H/2-120);
  thoughtOnce('bossdead', 'Plus rien. Encore faim.');
  if(actx && !audioMuted){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>blip(f,0.3,'sine',0.14),i*90)); }
  boss = null;
  bossBarEl.classList.remove('on');
  if(bossHintEl) bossHintEl.classList.add('hidden');
  renderBuildBar();
  checkSpecialization();
  // Campaign: spawn next boss in queue
  if(currentCampaignLevel && campaignBossQueue.length > 0){
    campaignBossTimer = 1.5;
  }
}

function spawnDamageNumber(x, y, text){ damageNumbers.push({ x, y, text, life:0.85, maxLife:0.85, vy:-90 }); }
function updateDamageNumbers(dt){
  for(let i=damageNumbers.length-1;i>=0;i--){
    const d = damageNumbers[i]; d.life -= dt; d.y += d.vy * dt;
    if(d.life <= 0) damageNumbers.splice(i,1);
  }
}
function burst(x,y,color,n,spd){
  if(particles.length>600) return;
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2;
    const s=spd*(0.25+Math.random()*0.85);
    const life=0.32+Math.random()*0.55;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,maxLife:life,r:1.4+Math.random()*3.2,color});
  }
}
function addToast(text,color,y){
  let slot = 0; for(const t of toasts) if(t.life > 0.2) slot++;
  toasts.push({text,color:color||'#fff',life:1.4,maxLife:1.4,x:W/2,y:H*0.2+Math.min(slot,4)*34,vy:-12});
}
function reduceFx(){ return !!profile.options.reduceFx; }
function fm(){ let m = 1; if(mods && mods.fureur && timeSinceRelease > 5) m *= 2; if(kamikazeTimer > 0) m *= 2; return m; }
function isEngaged(){ return parryCount > 0 || runDust >= 10; }
function vampireTick(){ vampireCount++; if(vampireCount >= 3){ vampireCount = 0; heal(1); } }
function knockBoss(e, ux, uy, hitR){
  e.x = bh.x - ux*(hitR+110); e.y = bh.y - uy*(hitR+110); e.vx = 0; e.vy = 0;
  if(e.eyeR0 !== undefined) e.eyeR = Math.min(e.eyeR0, bh.r+140);
}
function addAnomaly(card){
  const ex = activeAnomalies.find(a=>a.id===card.id);
  if(ex) ex.stacks++; else activeAnomalies.push({id:card.id, stacks:1});
  applyAnomalyEffect(card);
}
function parryR(){ return PARRY_RANGE * (mods ? mods.parryRangeMult : 1) * (resonanceT > 0 ? 1.4 : 1); }
function beatInfo(){
  const len = 60/Math.max(60, beatBpm);
  const off = (profile.options.beatOffset||0)/1000;
  if(actx && music.playing && kickTimes.length){
    const now = actx.currentTime - off;
    let best = 1e9, prev = -1e9;
    for(const t of kickTimes){ const d = Math.abs(now-t); if(d < best) best = d; if(t <= now && t > prev) prev = t; }
    return { dist:best, len, phase: prev > -1e8 ? Math.min(1,(now-prev)/len) : 0 };
  }
  const t = performance.now()/1000 - beatOrigin - off;
  const ph = ((t/len)%1 + 1)%1;
  return { dist:Math.min(ph, 1-ph)*len, len, phase:ph };
}
function beatWindow(len){ return Math.min(0.09, len*0.14) * (currentMode.beatOnly ? 1.35 : 1); }
function isOnBeat(){ const b = beatInfo(); return b.dist <= beatWindow(b.len); }
function registerPulse(){
  runPulses++; profile.pulses = (profile.pulses||0) + 1; pulseStreak++;
  addToast(pulseStreak > 1 ? 'PULSE ×' + pulseStreak : 'SUR LE TEMPO', '#ffd36b');
  if(actx && !audioMuted){
    const k = Math.min(pulseStreak, 8);
    blip(660 + k*90, 0.22, 'triangle', 0.15);
    blip(990 + k*120, 0.3, 'sine', 0.08, undefined, 0.05);
  }
  vibrate(25);
  if(pulseStreak === 1) thoughtOnce('pulse1', 'Le vide a un rythme.');
  if(pulseStreak >= 4 && resonanceT <= 0) startResonance();
}
function startResonance(){
  resonanceT = 7; pulseStreak = 0; runResonances++;
  profile.resonances = (profile.resonances||0) + 1; saveP();
  addToast('♪ RÉSONANCE ♪', '#ffe9a3');
  parryFlash = Math.max(parryFlash, reduceFx() ? 0.25 : 0.8);
  shake = Math.max(shake, 14);
  burst(bh.x, bh.y, '#ffd36b', 60, 600); burst(bh.x, bh.y, '#ff9cf0', 40, 450);
  if(actx && !audioMuted){ [440,523.25,659.25,880,1318.5].forEach((f,i)=>blip(f,0.4,'triangle',0.12,undefined,i*0.07)); }
  vibrate([30,30,60]);
  thoughtOnce('reso', 'Je suis le battement.');
}
function thought(text, key){
  const now = performance.now();
  if(now - lastThoughtAt < 6500 || state !== 'play' || !thoughtEl) return;
  lastThoughtAt = now; if(key) thoughtSeen.add(key);
  thoughtEl.textContent = text;
  thoughtEl.classList.remove('on'); void thoughtEl.offsetWidth; thoughtEl.classList.add('on');
}
function thoughtOnce(key, text){ if(!thoughtSeen.has(key)) thought(text, key); }
function thoughtHit(){
  if(lives > 0 && lives <= 1) thoughtOnce('low', 'Pas encore.');
  else thought(['Ça brûle.','Je ne veux pas disparaître.','Encore un peu.'][Math.floor(Math.random()*3)]);
}
const BOSS_THOUGHTS = { consumer:'Il mange comme moi. Je n\'aime pas ça.', swarm:'Tant de petites faims.', eye:'L\'Œil me regarde. Il ne cligne pas.' };
function a11y(el){
  el.tabIndex = 0; el.setAttribute('role','button');
  el.addEventListener('keydown', ev=>{ if(ev.code==='Space'||ev.code==='Enter'){ ev.preventDefault(); ev.stopPropagation(); el.click(); } });
}
