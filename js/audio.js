/* GOULU — audio synthétisé (SFX + musique) */
/* =========================================================
   Audio
   ========================================================= */
let actx=null;
let audioMuted = !!profile.muted;
let masterSfxGain=null, audioBus=null, reverbIn=null, droneNodes=null, droneFilter=null;
let musicMasterGain=null;
function makeImpulse(sec){
  const len=Math.floor(actx.sampleRate*sec), buf=actx.createBuffer(2,len,actx.sampleRate);
  for(let c=0;c<2;c++){ const d=buf.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6); }
  return buf;
}
function initAudio(){
  if(!actx){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return;
    actx=new AC();
    audioBus=actx.createDynamicsCompressor();
    audioBus.threshold.value=-16; audioBus.knee.value=12; audioBus.ratio.value=4;
    audioBus.attack.value=0.004; audioBus.release.value=0.2;
    audioBus.connect(actx.destination);
    reverbIn=actx.createGain(); reverbIn.gain.value=0.22;
    const conv=actx.createConvolver(); conv.buffer=makeImpulse(1.1);
    const wet=actx.createGain(); wet.gain.value=0.6;
    reverbIn.connect(conv); conv.connect(wet); wet.connect(audioBus);
    masterSfxGain=actx.createGain();
    masterSfxGain.gain.value=(profile.options.sfx/100)*0.6;
    masterSfxGain.connect(audioBus); masterSfxGain.connect(reverbIn);
  }
  if(actx.state==='suspended') actx.resume();
  if(masterSfxGain) masterSfxGain.gain.value = audioMuted ? 0 : (profile.options.sfx/100)*0.6;
}
function blip(freq,dur,type,vol,freqEnd,delay){
  if(!actx||audioMuted||!masterSfxGain) return;
  const t0=actx.currentTime+(delay||0);
  const o=actx.createOscillator(), g=actx.createGain();
  o.type=type||'sine';
  o.frequency.setValueAtTime(freq,t0);
  if(freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd,t0+dur);
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.linearRampToValueAtTime(vol||0.1,t0+0.006);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g); g.connect(masterSfxGain);
  o.start(t0); o.stop(t0+dur+0.03);
}
function thud(){
  if(!actx||audioMuted||!masterSfxGain) return;
  const t0=actx.currentTime;
  const o=actx.createOscillator(), g=actx.createGain();
  o.type='sawtooth';
  o.frequency.setValueAtTime(240,t0);
  o.frequency.exponentialRampToValueAtTime(42,t0+0.42);
  g.gain.setValueAtTime(0.24,t0);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+0.46);
  o.connect(g); g.connect(masterSfxGain);
  o.start(t0); o.stop(t0+0.5);
}
function deathSound(){ if(!actx||audioMuted) return; [660,440,260,130].forEach((f,i)=>blip(f,0.26,'sawtooth',0.11,undefined,0.3+i*0.105)); }
function achSound(){ if(!actx||audioMuted) return; [880,1320,1760].forEach((f,i)=>blip(f,0.18,'sine',0.09,undefined,i*0.09)); }
function vibrate(ms){ if(navigator.vibrate && profile.options.vibrate !== false){ try{navigator.vibrate(ms);}catch(e){} } }

/* Music (simplifié V9, réutilise V8.2) */
let noiseBuffer=null;
function getNoiseBuf(){
  if(!actx) return null;
  if(noiseBuffer) return noiseBuffer;
  const size=Math.floor(actx.sampleRate*0.04);
  noiseBuffer=actx.createBuffer(1,size,actx.sampleRate);
  const d=noiseBuffer.getChannelData(0);
  for(let i=0;i<size;i++) d[i]=Math.random()*2-1;
  return noiseBuffer;
}
const music={playing:false,bpm:70,targetBpm:70,nextNote:0,step:0};
function musicInit(){ if(!actx||musicMasterGain) return; musicMasterGain=actx.createGain(); musicMasterGain.gain.value=0; musicMasterGain.connect(audioBus||actx.destination); if(reverbIn) musicMasterGain.connect(reverbIn); }
function musicStart(){
  if(!actx||audioMuted) return;
  musicInit();
  music.playing=true; music.nextNote=actx.currentTime+0.1; music.step=0; kickTimes.length=0;
  const target=(profile.options.music/100)*MUSIC_GAIN;
  musicMasterGain.gain.cancelScheduledValues(actx.currentTime);
  musicMasterGain.gain.setValueAtTime(0,actx.currentTime);
  musicMasterGain.gain.linearRampToValueAtTime(target,actx.currentTime+1.5);
  startDrone(); rumbleStart();
}
function musicStop(){
  if(!musicMasterGain||!actx) return;
  musicMasterGain.gain.cancelScheduledValues(actx.currentTime);
  musicMasterGain.gain.setValueAtTime(musicMasterGain.gain.value,actx.currentTime);
  musicMasterGain.gain.linearRampToValueAtTime(0,actx.currentTime+0.6);
  music.playing=false;
  stopDrone(); rumbleStop();
}
function startDrone(){
  if(droneNodes||!actx||!musicMasterGain) return;
  const g=actx.createGain(); g.gain.setValueAtTime(0.0001,actx.currentTime); g.gain.linearRampToValueAtTime(0.25,actx.currentTime+2);
  droneFilter=actx.createBiquadFilter(); droneFilter.type='lowpass'; droneFilter.frequency.value=180;
  const a=actx.createOscillator(), b=actx.createOscillator();
  a.type='sawtooth'; b.type='sawtooth'; a.frequency.value=55; b.frequency.value=55.7;
  a.connect(droneFilter); b.connect(droneFilter); droneFilter.connect(g); g.connect(musicMasterGain);
  a.start(); b.start(); droneNodes={a,b,g};
}
function stopDrone(){
  if(!droneNodes||!actx) return;
  const d=droneNodes; droneNodes=null; droneFilter=null;
  d.g.gain.cancelScheduledValues(actx.currentTime);
  d.g.gain.setValueAtTime(d.g.gain.value,actx.currentTime);
  d.g.gain.linearRampToValueAtTime(0,actx.currentTime+0.6);
  try{ d.a.stop(actx.currentTime+0.7); d.b.stop(actx.currentTime+0.7); }catch(e){}
}
/* Grondement gravitationnel : bruit brun filtré, qui gonfle quand on aspire et quand le danger approche */
let rumble=null;
function rumbleStart(){
  if(!actx||rumble||!musicMasterGain) return;
  const sr=actx.sampleRate, buf=actx.createBuffer(1,sr*3,sr), d=buf.getChannelData(0);
  let last=0;
  for(let i=0;i<d.length;i++){ last=(last+0.02*(Math.random()*2-1))/1.02; d[i]=last*3.2; }
  const src=actx.createBufferSource(); src.buffer=buf; src.loop=true;
  const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=100; lp.Q.value=0.8;
  const g=actx.createGain(); g.gain.value=0.0001;
  src.connect(lp); lp.connect(g); g.connect(musicMasterGain); src.start();
  rumble={src,lp,g};
}
function rumbleStop(){
  if(!rumble||!actx) return;
  const r=rumble; rumble=null;
  r.g.gain.cancelScheduledValues(actx.currentTime);
  r.g.gain.setTargetAtTime(0.0001,actx.currentTime,0.2);
  try{ r.src.stop(actx.currentTime+1.2); }catch(e){}
}
function rumbleTick(){
  if(!rumble||!actx) return;
  const t=actx.currentTime, a=(attract&&state==='play')?1:0;
  rumble.g.gain.setTargetAtTime(0.35+a*0.9+danger*0.6, t, 0.12);
  rumble.lp.frequency.setTargetAtTime(90+a*170+danger*220, t, 0.15);
}
function musicSetBpm(bpm){ music.targetBpm=bpm; }
function musicTick(dt){
  if(!music.playing||!actx||!musicMasterGain) return;
  music.bpm += (music.targetBpm-music.bpm)*(1-Math.exp(-(dt||0.016)*3));
  if(droneFilter) droneFilter.frequency.setTargetAtTime(160+danger*1400, actx.currentTime, 0.15);
  rumbleTick();
  const now=actx.currentTime;
  const stepDur=60/music.bpm/4;
  while(music.nextNote<now+0.15){
    musicPlayStep(music.nextNote,music.step);
    music.nextNote+=stepDur;
    music.step=(music.step+1)%16;
  }
}
const RESO_NOTES=[220,261.63,329.63,392,440,523.25];
function musicPlayStep(time,s){
  if(resonanceT>0 && s%2===0){
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='triangle'; o.frequency.value=RESO_NOTES[((s>>1)+Math.floor(time*2))%RESO_NOTES.length]*(s%8===0?2:1);
    g.gain.setValueAtTime(0.0001,time); g.gain.linearRampToValueAtTime(0.16,time+0.01); g.gain.exponentialRampToValueAtTime(0.0001,time+0.28);
    o.connect(g); g.connect(musicMasterGain); o.start(time); o.stop(time+0.3);
  }
  if(s%4===0){
    kickTimes.push(time); if(kickTimes.length>8) kickTimes.shift();
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='sine';
    o.frequency.setValueAtTime(170,time);
    o.frequency.exponentialRampToValueAtTime(58,time+0.1);
    g.gain.setValueAtTime(0.55,time);
    g.gain.exponentialRampToValueAtTime(0.001,time+0.22);
    o.connect(g); g.connect(musicMasterGain);
    o.start(time); o.stop(time+0.25);
  }
  if(s===0||s===8){
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='triangle';
    o.frequency.value=s===0?110:146.8;
    g.gain.setValueAtTime(0.0001,time);
    g.gain.linearRampToValueAtTime(0.18,time+0.04);
    g.gain.exponentialRampToValueAtTime(0.0001,time+0.5);
    o.connect(g); g.connect(musicMasterGain);
    o.start(time); o.stop(time+0.55);
  }
  if(s%2===1){
    const buf=getNoiseBuf(); if(!buf) return;
    const src=actx.createBufferSource(); src.buffer=buf;
    const filter=actx.createBiquadFilter();
    filter.type='highpass'; filter.frequency.value=7000;
    const g=actx.createGain();
    g.gain.setValueAtTime(0.22,time);
    g.gain.exponentialRampToValueAtTime(0.001,time+0.04);
    src.connect(filter); filter.connect(g); g.connect(musicMasterGain);
    src.start(time); src.stop(time+0.05);
  }
}
