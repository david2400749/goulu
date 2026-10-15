/* GOULU — collecte, dégâts, onde de choc, boucle de mise à jour */
function collectDust(e){
  const dt = DUST_TYPES[e.dustType] || DUST_TYPES.gold;
  const gain = dt.pts * mods.dustValue;
  score += multiplier * gain * mods.scoreMult * fm();
  combo++; comboTimer=mods.chainWindow*1.2; runDust++;
  if(combo>maxCombo) maxCombo=combo;
  dustSinceCharge++;
  if(dustSinceCharge>=getDustPerCharge() && shockCharges<getMaxCharges()){
    dustSinceCharge=0; shockCharges++;
    blip(1200,0.09,'sine',0.07);
  } else if(shockCharges>=getMaxCharges()) dustSinceCharge=0;
  if(specialization === 'architecte'){
    architecteDust++;
    if(architecteDust >= 5 && shockCharges < getMaxCharges() + 1){
      architecteDust = 0; shockCharges++;
      addToast('⚙️ +1 CHARGE', '#7ee7ff', H/2 + 40);
    }
  }
  if(e.dustType === 'blue'){ slowmoT = 1.0; timeScale = 0.4; flash = Math.max(flash, 0.25); }
  else if(e.dustType === 'red'){
    for(let i=entities.length-1;i>=0;i--){
      const o = entities[i]; if(o.type !== 'anti' || o.dead) continue;
      const dx=o.x-e.x, dy=o.y-e.y;
      if(dx*dx+dy*dy < 80*80){ burst(o.x,o.y,'#ff5c2d',12,300); score += 5 * multiplier * mods.scoreMult; o.dead = true; }
    }
  } else if(e.dustType === 'white'){ if(shockCharges < getMaxCharges()) shockCharges++; }
  elemTypesCollected.add(e.dustType);
  if(elemChain.type === e.dustType){
    elemChain.count++; elemChain.timer = ELEM_CHAIN_WINDOW;
    if(elemChain.count >= ELEM_CHAIN_REQ){ triggerElementalChain(e.dustType); elemChain = { type:null, count:0, timer:0 }; }
  } else { elemChain = { type: e.dustType, count: 1, timer: ELEM_CHAIN_WINDOW }; }
  burst(e.x, e.y, dt.color, 8, 220);
  blip(420+Math.min(combo,42)*17, 0.07, 'triangle', 0.07);
}
function heal(amount){
  const maxL = maxLivesRun;
  if(lives < maxL){
    const prev=lives;
    lives=Math.min(maxL, lives+amount);
    if(lives>prev){ burst(bh.x,bh.y,'#4ade80',12,240); blip(880,0.15,'sine',0.1,1320); }
  }
}
function hitAnti(e){
  if(invincibleT > 0 || hurtT > 0){
    if(invincibleT > 0) score += 5 * multiplier;
    burst(e.x,e.y,'#ffffff',20,420);
    blip(660,0.1,'sine',0.1,990);
    return;
  }
  const dx=bh.x-e.x, dy=bh.y-e.y;
  const d=Math.sqrt(dx*dx+dy*dy);
  lastDeathContext = { wasAttracting:attract, hadCharges:shockCharges>0, distance:d, parryRange:parryR() };
  lives--; runHits++; hurtT = (currentMode.useWaves && !currentCampaignLevel && waveIndex >= 5) ? 2.0 : 1.5; pulseStreak = 0; thoughtHit();
  combo=0; comboTimer=0; multiplier=1;
  parryChain=0; parryChainTimer=0; perfectChainFired=false;
  elemChain = { type:null, count:0, timer:0 };
  shake=20; flash=reduceFx()?0.4:1;
  burst(e.x,e.y,'#ff2d6f',26,400);
  thud(); vibrate(80);
  if(specialization === 'kamikaze') kamikazeTimer = 20;
  if(lives<=0) gameOver();
}
function spawnShockwave(isEcho, pulse){
  const weak = !!(currentMode.beatOnly && !pulse && !isEcho);
  shockwaves.push({
    r:bh.r,
    maxR:SHOCK_MAX_R * mods.shockRadiusMult * (currentMode.noShock ? 0.5 : 1) * (pulse ? 1.2 : 1) * (weak ? 0.45 : 1),
    life:SHOCK_LIFE, maxLife:SHOCK_LIFE,
    hit:new Set(), isEcho:!!isEcho, pulse:!!pulse, weak, counted:false
  });
  shake=Math.max(shake,6);
  if(!isEcho) blip(180,0.22,'sawtooth',0.13,90);
  else blip(280,0.18,'sine',0.09,180);
}

/* =========================================================
   Update (condensed but complete)
   ========================================================= */
function update(dt){
  if(hitstop > 0){ hitstop=Math.max(0,hitstop-dt); if(shake>0) shake=Math.max(0,shake-dt*68); return; }
  updateDamageNumbers(dt);
  if(slowmoT>0) slowmoT-=dt;
  else timeScale += (1-timeScale)*Math.min(1,dt*5);
  let gdt=dt*timeScale;
  if(overkillFreeze > 0){ overkillFreeze -= dt; gdt *= 0.2; }

  if(shake>0) shake=Math.max(0,shake-dt*68);
  if(flash>0) flash=Math.max(0,flash-dt*2.6);
  if(parryFlash>0) parryFlash=Math.max(0,parryFlash-dt*2.2);
  if(boss && boss.hitFlash>0) boss.hitFlash=Math.max(0,boss.hitFlash-dt);
  if(waveBannerTimer>0){ waveBannerTimer-=dt; if(waveBannerTimer<=0) waveBannerEl.classList.remove('on'); }
  if(state==='over') overCd=Math.max(0,overCd-dt);
  if(parryChain > 0){ parryChainTimer -= gdt; if(parryChainTimer<=0){ parryChain=0; perfectChainFired=false; } }
  if(invincibleT > 0) invincibleT = Math.max(0, invincibleT - gdt);
  if(hurtT > 0) hurtT = Math.max(0, hurtT - gdt);
  if(kamikazeTimer > 0) kamikazeTimer = Math.max(0, kamikazeTimer - gdt);
  if(elemChain.timer > 0){ elemChain.timer -= gdt; if(elemChain.timer <= 0) elemChain = { type:null, count:0, timer:0 }; }
  if(state==='play'){ if(attract) timeSinceRelease += gdt; else timeSinceRelease=0; }

  bh.r += (bh.rTarget-bh.r)*Math.min(1,dt*9);
  bh.ringT = (bh.ringT+dt/0.8)%1;
  bh.diskT = (bh.diskT + dt*0.35) % 1;

  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; p.life-=dt;
    if(p.life<=0){ particles.splice(i,1); continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    const dr=Math.pow(0.16,dt); p.vx*=dr; p.vy*=dr;
  }
  for(let i=toasts.length-1;i>=0;i--){ const t=toasts[i]; t.life-=dt; t.y+=t.vy*dt; if(t.life<=0) toasts.splice(i,1); }
  for(let i=shockwaves.length-1;i>=0;i--){
    const sw=shockwaves[i]; sw.life-=gdt;
    if(sw.life<=0){ shockwaves.splice(i,1); continue; }
    const p=1-sw.life/sw.maxLife;
    sw.r = sw.maxR*(1-Math.pow(1-p,2));
  }
  for(let i=pendingEchoes.length-1;i>=0;i--){
    pendingEchoes[i].time -= gdt;
    if(pendingEchoes[i].time <= 0){ spawnShockwave(true); pendingEchoes.splice(i,1); }
  }

  if(state==='finale'){
    finaleT += dt;
    bh.rTarget = Math.max(5, 20 - finaleT*5);
    if(finaleT > 3.6){ state='victory'; showVictory(currentCampaignLevel); }
    danger = 0; return;
  }
  if(state!=='play'){ danger=0; return; }
  elapsed+=gdt;

  if(specialization === 'fantome'){
    fantomeTimer += gdt;
    if(fantomeTimer >= 30){ fantomeTimer = 0; heal(1); }
  }

  // Campaign win check
  if(currentCampaignLevel && elapsed >= currentCampaignLevel.duration){
    completeCampaignLevel(currentCampaignLevel);
    return;
  }
  if(!currentCampaignLevel && currentMode.duration > 0 && elapsed >= currentMode.duration){
    gameOver();
    return;
  }

  const currentSec = Math.floor(elapsed);
  if(currentSec > lastPaceRecorded){ lastPaceRecorded=currentSec; currentPace[currentSec]=score; }

  // Campaign boss logic
  if(currentCampaignLevel) updateCampaign(gdt);
  else if(currentMode.useWaves) updateWaves(gdt);

  // Choix d'anomalie
  if(!campaignNoAnomaly){
    if(currentCampaignLevel){
      if(!campaignAnomDone && !boss && currentCampaignLevel.duration >= 45 && elapsed >= currentCampaignLevel.duration*0.4){
        campaignAnomDone = true; openAnomalyScreen(); return;
      }
    } else if(!currentMode.useWaves){
      if(elapsed >= anomalyNextAt && !anomalyScreenOpen){
        anomalyNextAt = elapsed + currentMode.anomalyInterval;
        openAnomalyScreen(); return;
      }
    } else if(!boss && waveIndex > 1 && !WAVES[waveIndex].boss){
      if(waveIndex < WAVES.length-1){
        if(anomalyWaveGiven !== waveIndex && waveTimer >= 1.5){ anomalyWaveGiven = waveIndex; openAnomalyScreen(); return; }
      } else if(elapsed >= anomalyNextAt){
        anomalyNextAt = elapsed + 25; openAnomalyScreen(); return;
      }
    }
  }

  // Boss spawn for non-campaign non-wave mode
  if(!currentCampaignLevel && !currentMode.useWaves && elapsed >= bossNextAt && !boss){
    bossNextAt = elapsed + currentMode.bossInterval;
    spawnBoss();
  }

  if(combo>0){ comboTimer-=gdt; if(comboTimer<=0){ combo=0; comboTimer=0; } }
  multiplier = Math.min(MAX_MULT, 1+Math.floor(combo/6));
  bh.rTarget = 20+(multiplier-1)*2.3;
  musicSetBpm(70 + multiplier*10);
  beatBpm += (70 + multiplier*10 - beatBpm) * (1 - Math.exp(-dt*3));
  if(resonanceT > 0) resonanceT = Math.max(0, resonanceT - gdt);
  if(profile.pulses === 0 && elapsed > 10) thoughtOnce('beathint', 'Essaie de relâcher pile sur le battement.');

  const currentWave = (!currentCampaignLevel && currentMode.useWaves) ? WAVES[waveIndex] : null;
  const campaignDust = currentCampaignLevel ? currentCampaignLevel.dustRate : null;
  const campaignAnti = currentCampaignLevel ? currentCampaignLevel.antiRate : null;

  dustTimer-=gdt;
  const dustBase = currentCampaignLevel ? campaignDust : (currentWave ? currentWave.dustRate : Math.max(0.20, 0.85-elapsed*0.009));
  if(dustTimer<=0 && entities.length<ENTITY_CAP){
    dustTimer = dustBase * (boss ? 0.6 : 1);
    spawnEntity('dust');
    if(elapsed>25 && entities.length<ENTITY_CAP && rng()<0.35) spawnEntity('dust');
  }
  if(elapsed>3.4){
    const antiRate = currentCampaignLevel ? campaignAnti : (currentWave ? (waveIndex===WAVES.length-1 ? Math.max(0.6, 1.2-waveTimer*0.015) : currentWave.antiRate) : Math.max(0.62, 2.5-elapsed*0.021));
    if(antiRate > 0){
      antiTimer-=gdt;
      if(currentWave && waveIndex===WAVES.length-1 && waveTimer >= endlessBurstAt){
        endlessBurstAt = waveTimer + 25;
        const n = Math.min(5, 3 + Math.floor(waveTimer / 60));
        for(let i=0;i<n && entities.length<ENTITY_CAP;i++) spawnEntity('anti');
        addToast('SALVE', '#ff8aa0');
      }
      if(antiTimer<=0 && entities.length<ENTITY_CAP){
        antiTimer = antiRate / (mods.antiSpawnMult||1) * ((boss && !currentWave) ? 2.2 : 1);
        spawnEntity('anti');
      }
    }
  }

  let nearDanger=1e9;

  for(let i=entities.length-1;i>=0;i--){
    const e=entities[i];
    if(!e) continue;
    if(e.dead){ entities.splice(i,1); continue; }
    const dx=bh.x-e.x, dy=bh.y-e.y;
    let d=Math.sqrt(dx*dx+dy*dy);
    if(d<0.001) d=0.001;
    const ux=dx/d, uy=dy/d;

    if(e.bossPart && boss){
      if(boss.type.id==='swarm'){
        e.swarmAngle += gdt * 0.8;
        if(attract) e.swarmR = Math.max(bh.r + 12, e.swarmR - gdt * 70);
        else e.swarmR = Math.min(e.swarmR0, e.swarmR + gdt * 30);
        e.x = bh.x + Math.cos(e.swarmAngle) * e.swarmR;
        e.y = bh.y + Math.sin(e.swarmAngle) * e.swarmR;
      } else if(boss.type.id==='eye' && e.isMain){
        e.shootTimer -= gdt;
        if(e.shootTimer <= 0){
          e.shootTimer = 2.6;
          const a = Math.atan2(bh.y-e.y, bh.x-e.x);
          for(let k=-1;k<=1;k+=2){
            const ang=a+k*0.2; const spd=160;
            entities.push({ x:e.x, y:e.y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, r:9, type:'anti', isProjectile:true, phase:rng()*Math.PI*2, trail:[] });
          }
          blip(220,0.2,'sawtooth',0.1,110);
        }
      }
    }

    if(e.bossPart && boss && boss.type.id==='eye'){
      e.eyeAngle += gdt*0.35;
      if(attract) e.eyeR = Math.max(bh.r + 62, e.eyeR - gdt*45);
      else e.eyeR = Math.min(e.eyeR0, e.eyeR + gdt*30);
      e.x = bh.x + Math.cos(e.eyeAngle)*e.eyeR; e.y = bh.y + Math.sin(e.eyeAngle)*e.eyeR;
    } else if(!e.bossPart || (boss && boss.type.id !== 'swarm')){
      let effectiveAttract = ATTRACT_F*mods.attractMult;
      if(specialization === 'devoreur' && e.type === 'anti') effectiveAttract *= 0.6;
      const hostileE = (e.type==='anti' || e.bossPart);
      if(attract){
        const f=effectiveAttract/(d>MIN_D?d:MIN_D);
        e.vx+=ux*f*gdt; e.vy+=uy*f*gdt;
      } else {
        const rf = hostileE ? 0.35 : 1;
        e.vx-=ux*REPEL_F*mods.repelMult*rf*gdt;
        e.vy-=uy*REPEL_F*mods.repelMult*rf*gdt;
      }
      if(hostileE && !e.isProjectile){
        const seek = (e.bossPart ? 60 : 120) * (profile.options.assist ? 0.55 : 1);
        e.vx+=ux*seek*gdt; e.vy+=uy*seek*gdt;
      }
      if(!e.isProjectile){ const dr=Math.pow(DRAG,gdt); e.vx*=dr; e.vy*=dr; }
      const sp2=e.vx*e.vx+e.vy*e.vy;
      if(sp2>MAX_SPEED_SQ){ const sp=Math.sqrt(sp2); e.vx=e.vx/sp*MAX_SPEED; e.vy=e.vy/sp*MAX_SPEED; }
      e.x+=e.vx*gdt; e.y+=e.vy*gdt;
    }

    if(!e.trail) e.trail = [];
    const sp2t = e.vx*e.vx+e.vy*e.vy;
    if(sp2t > 25000){
      if(e.trail.length === 0 || Math.abs(e.trail[e.trail.length-1].x - e.x) > 3){
        e.trail.push({x:e.x, y:e.y, life:0.28});
        if(e.trail.length > 6) e.trail.shift();
      }
    }
    for(let k=e.trail.length-1;k>=0;k--){
      e.trail[k].life -= gdt;
      if(e.trail[k].life <= 0) e.trail.splice(k,1);
    }

    let killedByShock=false;
    const isHostile = (e.type==='anti' || e.bossPart);
    if(isHostile){
      for(let s=0;s<shockwaves.length;s++){
        const sw=shockwaves[s];
        if(!sw.hit.has(e) && d<sw.r+e.r*0.6){
          sw.hit.add(e); killedByShock=true;
          const pm = sw.pulse ? 1.5 : 1;
          if(sw.pulse && !sw.counted){ sw.counted = true; registerPulse(); }
          const isParry = !sw.weak && d < parryR();
          if(e.bossPart){
            damageBoss(1, e.x, e.y);
            if(boss && boss.type.id === 'consumer'){ e.vx = -ux*420; e.vy = -uy*420; }
            if(boss && boss.type.id === 'swarm'){
              boss.parts = boss.parts.filter(p => p !== e);
              if(boss.parts.length === 0) killBoss();
            }
            if(isParry){
              parryChain++;
              parryChainTimer = mods.chainWindow + (mods.dashparryEnabled ? 0.5 : 0);
              const chainMult = Math.min(mods.chainCap, Math.pow(2, Math.min(parryChain-1, 5)));
              score += 20 * multiplier * chainMult * mods.scoreMult * fm() * pm;
              hitstop = PARRY_HITSTOP;
              parryCount++; parryTimes.push(performance.now());
              if(parryTimes.length > 5) parryTimes.shift();
              parryFlash=reduceFx()?0.25:0.6; slowmoT=0.18; timeScale=0.4;
              vibrate(45); shake=Math.max(shake,10);
              burst(e.x,e.y,'#ffdd44',32,520);
              checkTechniques();
              if(parryChain >= CHAIN_THRESHOLD && !perfectChainFired){
                perfectChainFired = true; runHasPerfect = true; runPerfects++; thoughtOnce('perfect','Plus rien ne peut me toucher.');
                invincibleT = INVINCIBLE_DURATION + (mods.invincBonus||0);
                slowmoT = reduceFx()?0.5:0.9; timeScale = 0.25;
                addToast('★ PERFECT CHAIN ★', '#ffffff', H/2 - 130);
                burst(e.x, e.y, '#ffffff', 48, 780);
                blip(880, 0.3, 'sine', 0.18, 2200);
                vibrate([30, 40, 60, 40, 30]);
                shake = Math.max(shake, 32);
              } else if(parryChain > 1){
                addToast('CHAIN ×' + chainMult, '#ffdd44', H/2 - 100);
              } else {
                addToast('★ PARRY ! ★','#ffdd44',H/2-70);
              }
            }
          } else {
            let gain, chainMult=1;
            if(isParry){
              parryChain++;
              parryChainTimer = mods.chainWindow + (mods.dashparryEnabled ? 0.5 : 0);
              chainMult = Math.min(mods.chainCap, Math.pow(2, Math.min(parryChain-1, 5)));
              gain = 20 * multiplier * chainMult;
            } else { gain = 8 * multiplier; }
            score += gain * mods.scoreMult * fm() * pm;
            combo++; comboTimer=mods.chainWindow*1.2;
            if(combo>maxCombo) maxCombo=combo;
            if(isParry){
              hitstop = PARRY_HITSTOP;
              parryCount++; parryTimes.push(performance.now());
              if(parryTimes.length > 5) parryTimes.shift();
              parryFlash=reduceFx()?0.25:0.6; slowmoT=0.18; timeScale=0.4;
              vibrate(45); shake=Math.max(shake,10);
              burst(e.x,e.y,'#ffdd44',32,520);
              burst(e.x,e.y,'#ffffff',12,380);
              if(mods.echo) pendingEchoes.push({time:0.4});
              else if(mods.echochainEnabled && (++echoParryCount % 3 === 0)) pendingEchoes.push({time:0.4});
              checkTechniques();
              if(parryChain >= CHAIN_THRESHOLD && !perfectChainFired){
                perfectChainFired = true; runHasPerfect = true; runPerfects++; thoughtOnce('perfect','Plus rien ne peut me toucher.');
                invincibleT = INVINCIBLE_DURATION + (mods.invincBonus||0);
                slowmoT = reduceFx()?0.5:0.9; timeScale = 0.25;
                addToast('★ PERFECT CHAIN ★', '#ffffff', H/2 - 130);
                burst(e.x, e.y, '#ffffff', 48, 780);
                blip(880, 0.3, 'sine', 0.18, 2200);
                blip(1320, 0.4, 'triangle', 0.12, 3000);
                vibrate([30, 40, 60, 40, 30]);
                shake = Math.max(shake, 32);
              } else if(parryChain > 1){
                addToast('CHAIN ×' + chainMult, '#ffdd44', H/2 - 100);
                blip(880*chainMult,0.18,'sine',0.14,1400);
              } else {
                addToast('★ PARRY ! ★','#ffdd44',H/2-70);
                blip(880,0.18,'sine',0.16,1400);
              }
            } else {
              burst(e.x,e.y,'#ff2d6f',16,340);
              blip(520,0.1,'square',0.09);
            }
            if(mods.vampire && isParry) vampireTick();
            // Momentum Kill check
            if(mods.momentumEnabled){
              const sp = Math.sqrt(e.vx*e.vx + e.vy*e.vy);
              if(sp > 800){
                score += 10 * multiplier;
                if(!runTechniques.momentum) runTechniques.momentum = true;
              }
            }
          }
          break;
        }
      }
    }
    if(killedByShock){
      if(!e.bossPart) entities.splice(i,1);
      else if(boss && boss.type.id==='swarm') entities.splice(i,1);
      continue;
    }

    const hitR = e.type==='dust' ? bh.r+e.r*1.6 : bh.r+e.r*1.25;
    if(d<hitR){
      if(e.type==='dust'){ collectDust(e); entities.splice(i,1); }
      else if(e.bossPart){
        const isSwarm = !!boss && boss.type.id==='swarm';
        if(invincibleT > 0){
          damageBoss(1, e.x, e.y);
          if(isSwarm){
            entities.splice(i,1);
            if(boss){ boss.parts = boss.parts.filter(p => p !== e); if(boss.parts.length === 0) killBoss(); }
          } else if(boss) knockBoss(e, ux, uy, hitR);
        } else if(hurtT > 0){
          if(!isSwarm && boss) knockBoss(e, ux, uy, hitR);
        } else {
          hitAnti(e);
          if(isSwarm){
            entities.splice(i,1);
            if(boss){ boss.parts = boss.parts.filter(p => p !== e); if(boss.parts.length === 0) killBoss(); }
          } else if(boss && state==='play') knockBoss(e, ux, uy, hitR);
        }
      } else {
        hitAnti(e);
        entities.splice(i,1);
      }
      if(state!=='play') break;
      continue;
    }
    if(Math.abs(e.x-bh.x)>W/2+260 || Math.abs(e.y-bh.y)>H/2+260){
      if(!e.bossPart) entities.splice(i,1);
      continue;
    }
    if((e.type==='anti' || e.bossPart) && d<nearDanger) nearDanger=d;
  }
  danger=Math.max(0,Math.min(1,1-nearDanger/145));
}

function checkTechniques(){
  thoughtOnce('parry1', 'Là. Exactement là.');
  // Dash-Parry : 3 parry en <1s
  if(!profile.techniques.dashparry && parryTimes.length >= 3){
    const now = performance.now();
    if(now - parryTimes[parryTimes.length-3] < 1000){
      profile.techniques.dashparry = true;
      saveP();
      showUnlockToast('⚡', 'Technique : Dash-Parry !');
    }
  }
  // Echo-Chain : parry pendant echo
  if(!profile.techniques.echochain && mods.echo && pendingEchoes.length > 0){
    profile.techniques.echochain = true;
    saveP();
    showUnlockToast('🔊', 'Technique : Echo-Chain !');
  }
}
