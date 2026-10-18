/* GOULU — audio synthétisé (SFX + musique) */
/* =========================================================
   Audio
   ========================================================= */
let actx=null;
let audioMuted = !!profile.muted;
let masterSfxGain=null, audioBus=null, reverbIn=null;
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

/* =========================================================
   Musique générative « espace profond »
   ---------------------------------------------------------
   Synthwave spatiale en la mineur, entièrement synthétisée et calée sur le
   tempo du jeu (16 doubles-croches par mesure, phrases de 4 mesures).
   Les couches entrent avec l'intensité (0 au menu → 3 en boss / gros multiplicateur) :
     0  nappe d'accords désaccordée, basse ronde, arpège lent, cloches cristallines
     1  + kick (le battement du parry / pulse), basse roulante, charleston
     2  + arpège en écho ping-pong, clap sur 2 et 4, roulement + montée en fin de phrase,
          mélodie une phrase sur deux
     3  + mélodie à chaque phrase, charleston ouvert, crash en tête de phrase
   Boss : grille plus sombre (la – ré – si♭ – mi). Nappe, basse et arpège sont
   « pompés » par le kick (sidechain), comme dans une vraie production.
   ========================================================= */
let noiseBuffer=null, longNoise=null;
function getNoiseBuf(){
  if(!actx) return null;
  if(noiseBuffer) return noiseBuffer;
  const size=Math.floor(actx.sampleRate*0.04);
  noiseBuffer=actx.createBuffer(1,size,actx.sampleRate);
  const d=noiseBuffer.getChannelData(0);
  for(let i=0;i<size;i++) d[i]=Math.random()*2-1;
  return noiseBuffer;
}
function getLongNoise(){
  if(!actx) return null;
  if(longNoise) return longNoise;
  const size=Math.floor(actx.sampleRate*2);
  longNoise=actx.createBuffer(1,size,actx.sampleRate);
  const d=longNoise.getChannelData(0);
  for(let i=0;i<size;i++) d[i]=Math.random()*2-1;
  return longNoise;
}
const music={playing:false,mode:'game',bpm:70,targetBpm:70,nextNote:0,step:0,bar:0,level:0,dark:false,stoppedAt:-99,dropStart:-1,dropEnd:-1};
const mtof = m => 440*Math.pow(2,(m-69)/12);
/* hasard propre à la musique : ne consomme pas Math.random (parties rejouables, tests) */
let mSeed = 0x2f6b1d;
function mRand(){ mSeed = (mSeed*1664525 + 1013904223) >>> 0; return mSeed/4294967296; }

/* Grilles : basse (MIDI) + voicing serré de la nappe, enchaînements sans saut */
const PROG_CALM = [
  { root:45, pad:[57,60,64,71] },   // la m9
  { root:41, pad:[57,60,64,69] },   // fa maj7
  { root:48, pad:[55,60,64,74] },   // do add9
  { root:40, pad:[55,59,62,67] }    // mi m7
];
const PROG_DARK = [
  { root:45, pad:[57,60,64,69] },   // la m
  { root:38, pad:[57,62,65,69] },   // ré m
  { root:46, pad:[57,62,65,70] },   // si♭ maj7
  { root:40, pad:[56,59,64,68] }    // mi (sensible sol♯)
];
/* Mélodies : par mesure, [pas, note MIDI, durée en pas] */
const LEAD_A = [
  [[0,76,4],[6,81,2],[8,79,2],[10,76,6]],
  [[0,72,4],[4,76,2],[6,77,2],[8,76,8]],
  [[0,79,4],[4,76,2],[6,74,2],[8,72,4],[12,74,4]],
  [[0,76,6],[6,79,2],[8,71,4],[12,74,4]]
];
const LEAD_B = [
  [[0,81,3],[3,84,3],[6,83,2],[8,81,4],[12,76,4]],
  [[0,81,6],[6,79,2],[8,77,4],[12,76,4]],
  [[0,76,3],[3,79,3],[6,84,2],[8,83,4],[12,79,4]],
  [[0,83,8],[8,79,4],[12,76,4]]
];
const LEAD_DARK = [
  [[0,76,3],[3,77,3],[6,76,2],[8,72,4],[12,69,4]],
  [[0,74,3],[3,77,3],[6,81,2],[8,77,4],[12,74,4]],
  [[0,77,3],[3,74,3],[6,70,2],[8,74,4],[12,77,4]],
  [[0,76,4],[4,80,4],[8,83,4],[12,80,4]]
];
const ARP_PAT = [0,2,4,6,7,5,3,1, 0,3,5,7,6,4,2,4];
const BELL_NOTES = [81,84,86,88,91,93];
const BASS_PAT = [0,null,0,null,0,null,12,null,0,null,0,null,0,null,12,7];

/* ---------- bus de la musique ---------- */
let mDuck=null, mVerbIn=null, mDelayIn=null, mDelayL=null, mDelayR=null;
function mPan(v){
  if(actx.createStereoPanner){ const p=actx.createStereoPanner(); p.pan.value=v; return p; }
  return actx.createGain();
}
function musicInit(){
  if(!actx||musicMasterGain) return;
  musicMasterGain=actx.createGain(); musicMasterGain.gain.value=0;
  musicMasterGain.connect(audioBus||actx.destination);
  /* sidechain : tout ce qui passe par mDuck s'efface brièvement sous le kick */
  mDuck=actx.createGain(); mDuck.connect(musicMasterGain);
  /* grande réverbération spatiale (queue de 3,2 s, plus douce que celle des bruitages) */
  mVerbIn=actx.createGain(); mVerbIn.gain.value=1;
  const conv=actx.createConvolver();
  const len=Math.floor(actx.sampleRate*3.2), buf=actx.createBuffer(2,len,actx.sampleRate);
  for(let c=0;c<2;c++){ const d=buf.getChannelData(c); let lp=0; for(let i=0;i<len;i++){ lp=lp*0.55+(Math.random()*2-1)*0.45; d[i]=lp*Math.pow(1-i/len,3.2); } }
  conv.buffer=buf;
  const verbOut=actx.createGain(); verbOut.gain.value=0.55;
  mVerbIn.connect(conv); conv.connect(verbOut); verbOut.connect(musicMasterGain);
  /* écho ping-pong à la croche pointée, assombri à chaque rebond */
  mDelayIn=actx.createGain();
  mDelayL=actx.createDelay(2); mDelayR=actx.createDelay(2);
  const fbA=actx.createGain(), fbB=actx.createGain(); fbA.gain.value=0.5; fbB.gain.value=0.5;
  const tone=actx.createBiquadFilter(); tone.type='lowpass'; tone.frequency.value=2800;
  mDelayIn.connect(mDelayL); mDelayL.connect(fbA); fbA.connect(mDelayR); mDelayR.connect(fbB); fbB.connect(tone); tone.connect(mDelayL);
  const pl=mPan(-0.75), pr=mPan(0.75), dOut=actx.createGain(); dOut.gain.value=0.55;
  mDelayL.connect(pl); mDelayR.connect(pr); pl.connect(dOut); pr.connect(dOut);
  dOut.connect(musicMasterGain); dOut.connect(mVerbIn);
}
/* relie une voix au mixage : sidechain ou non, envois réverbe / écho */
function mRoute(node, duck, verb, delay){
  node.connect(duck ? mDuck : musicMasterGain);
  if(verb){ const s=actx.createGain(); s.gain.value=verb; node.connect(s); s.connect(mVerbIn); }
  if(delay){ const s=actx.createGain(); s.gain.value=delay; node.connect(s); s.connect(mDelayIn); }
}
function mEnv(g, t0, peak, atk, hold, rel){
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.linearRampToValueAtTime(peak,t0+atk);
  if(hold>atk) g.gain.setValueAtTime(peak,t0+hold);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+Math.max(hold,atk)+rel);
}

/* ---------- instruments ---------- */
function mPad(time, notes, dur, level){
  const f=actx.createBiquadFilter(); f.type='lowpass'; f.Q.value=0.9;
  const base=650+level*380;
  f.frequency.setValueAtTime(base*0.45,time);
  f.frequency.linearRampToValueAtTime(base*1.7,time+dur*0.55);
  f.frequency.linearRampToValueAtTime(base,time+dur+0.4);
  const g=actx.createGain();
  mEnv(g,time,0.07,Math.min(0.9,dur*0.3),dur,1.6);
  f.connect(g); mRoute(g,true,0.8,0);
  const end=time+dur+1.7;
  notes.forEach((n,i)=>{
    for(const det of [-8,8]){
      const o=actx.createOscillator(); o.type='sawtooth';
      o.frequency.value=mtof(n); o.detune.value=det+(i%2?3:-3);
      const p=mPan(det<0?-0.5:0.5);
      o.connect(p); p.connect(f); o.start(time); o.stop(end);
    }
  });
}
function mBass(time, midi, dur, level, vel){
  const fr=mtof(midi);
  const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=5;
  lp.frequency.setValueAtTime(160,time);
  lp.frequency.linearRampToValueAtTime(340+level*320,time+0.012);
  lp.frequency.exponentialRampToValueAtTime(150,time+Math.max(0.05,dur));
  const g=actx.createGain(); mEnv(g,time,0.17*vel,0.008,dur*0.7,dur*0.5+0.05);
  const s=actx.createOscillator(); s.type='sawtooth'; s.frequency.value=fr;
  const sub=actx.createOscillator(); sub.type='sine'; sub.frequency.value=fr/2;
  const sg=actx.createGain(); sg.gain.value=0.6;
  s.connect(lp); lp.connect(g); sub.connect(sg); sg.connect(g);
  mRoute(g,true,0,0);
  const end=time+dur*1.2+0.12; s.start(time); sub.start(time); s.stop(end); sub.stop(end);
}
function mKick(time, vol, stepDur, duckDepth){
  const o=actx.createOscillator(), g=actx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(160,time); o.frequency.exponentialRampToValueAtTime(46,time+0.11);
  g.gain.setValueAtTime(vol,time); g.gain.exponentialRampToValueAtTime(0.001,time+0.34);
  o.connect(g); g.connect(musicMasterGain); o.start(time); o.stop(time+0.36);
  const nb=getNoiseBuf();
  if(nb){
    const n=actx.createBufferSource(); n.buffer=nb;
    const hp=actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2500;
    const ng=actx.createGain(); ng.gain.setValueAtTime(vol*0.22,time); ng.gain.exponentialRampToValueAtTime(0.001,time+0.014);
    n.connect(hp); hp.connect(ng); ng.connect(musicMasterGain); n.start(time); n.stop(time+0.02);
  }
  if(duckDepth>0){
    mDuck.gain.setValueAtTime(1,time);
    mDuck.gain.linearRampToValueAtTime(1-duckDepth,time+0.012);
    mDuck.gain.linearRampToValueAtTime(1,time+stepDur*3);
  }
}
function mNoiseHit(time, type, freq, q, vol, dur, verb, pan){
  const src=actx.createBufferSource(); src.buffer=getLongNoise();
  const f=actx.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q;
  const g=actx.createGain(); g.gain.setValueAtTime(vol,time); g.gain.exponentialRampToValueAtTime(0.001,time+dur);
  const p=mPan(pan||0);
  src.connect(f); f.connect(g); g.connect(p); mRoute(p,false,verb,0);
  src.start(time, mRand()*1.5); src.stop(time+dur+0.02);
  return g;
}
function mClap(time, vol){
  const src=actx.createBufferSource(); src.buffer=getLongNoise();
  const f=actx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1500; f.Q.value=0.9;
  const g=actx.createGain();
  g.gain.setValueAtTime(0.0001,time);
  for(let k=0;k<3;k++){ const t=time+k*0.011; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(vol*0.18,t+0.009); }
  g.gain.setValueAtTime(vol*0.8,time+0.034); g.gain.exponentialRampToValueAtTime(0.001,time+0.22);
  src.connect(f); f.connect(g); mRoute(g,false,0.35,0);
  src.start(time, mRand()*1.5); src.stop(time+0.25);
  const o=actx.createOscillator(), og=actx.createGain();   // corps du snare
  o.type='triangle'; o.frequency.setValueAtTime(200,time); o.frequency.exponentialRampToValueAtTime(150,time+0.08);
  og.gain.setValueAtTime(vol*0.5,time); og.gain.exponentialRampToValueAtTime(0.001,time+0.1);
  o.connect(og); og.connect(musicMasterGain); o.start(time); o.stop(time+0.12);
}
function mHat(time, vol, open){
  mNoiseHit(time,'highpass',open?6500:8200,0.7,vol,open?0.2:0.035,open?0.15:0,(mRand()-0.5)*0.5);
}
function mRiser(time, dur){
  const src=actx.createBufferSource(); src.buffer=getLongNoise(); src.loop=true;
  const f=actx.createBiquadFilter(); f.type='bandpass'; f.Q.value=2.5;
  f.frequency.setValueAtTime(350,time); f.frequency.exponentialRampToValueAtTime(7000,time+dur);
  const g=actx.createGain(); g.gain.setValueAtTime(0.0001,time); g.gain.exponentialRampToValueAtTime(0.09,time+dur*0.95); g.gain.linearRampToValueAtTime(0.0001,time+dur+0.02);
  src.connect(f); f.connect(g); mRoute(g,false,0.4,0);
  src.start(time); src.stop(time+dur+0.05);
}
function mPluck(time, freq, vol, bright, delay){
  const o=actx.createOscillator(); o.type='sawtooth'; o.frequency.value=freq;
  const o2=actx.createOscillator(); o2.type='square'; o2.frequency.value=freq; o2.detune.value=7;
  const f=actx.createBiquadFilter(); f.type='lowpass'; f.Q.value=4;
  f.frequency.setValueAtTime(500+bright,time); f.frequency.exponentialRampToValueAtTime(380,time+0.22);
  const g=actx.createGain(); mEnv(g,time,vol,0.004,0.004,0.26);
  const m=actx.createGain(); m.gain.value=0.5;
  o.connect(f); o2.connect(m); m.connect(f); f.connect(g); mRoute(g,true,0.18,delay);
  o.start(time); o2.start(time); o.stop(time+0.32); o2.stop(time+0.32);
}
function mLead(time, midi, dur, vol){
  const fr=mtof(midi);
  const f=actx.createBiquadFilter(); f.type='lowpass'; f.Q.value=1.2;
  f.frequency.setValueAtTime(1200,time); f.frequency.linearRampToValueAtTime(3200,time+0.08); f.frequency.exponentialRampToValueAtTime(1800,time+dur+0.3);
  const g=actx.createGain(); mEnv(g,time,vol,0.025,dur,0.45);
  const lfo=actx.createOscillator(); lfo.frequency.value=5.3;
  const lg=actx.createGain(); lg.gain.setValueAtTime(0,time); lg.gain.linearRampToValueAtTime(14,time+Math.min(0.35,dur));
  lfo.connect(lg);
  const end=time+dur+0.5;
  for(const [type,det,amt] of [['sawtooth',-6,0.55],['triangle',6,0.9],['sine',-1200,0.35]]){
    const o=actx.createOscillator(); o.type=type; o.frequency.value=fr; o.detune.value=det;
    lg.connect(o.detune);
    const og=actx.createGain(); og.gain.value=amt;
    o.connect(og); og.connect(f); o.start(time); o.stop(end);
  }
  f.connect(g); mRoute(g,false,0.45,0.32);
  lfo.start(time); lfo.stop(end);
}
function mBell(time, midi, vol){
  const fr=mtof(midi);
  const c=actx.createOscillator(); c.type='sine'; c.frequency.value=fr;
  const m=actx.createOscillator(); m.type='sine'; m.frequency.value=fr*3.5;
  const mg=actx.createGain(); mg.gain.setValueAtTime(fr*2.2,time); mg.gain.exponentialRampToValueAtTime(fr*0.02,time+1.3);
  m.connect(mg); mg.connect(c.frequency);
  const g=actx.createGain(); mEnv(g,time,vol,0.004,0.004,1.8);
  const p=mPan((mRand()-0.5)*1.4);
  c.connect(g); g.connect(p); mRoute(p,false,0.9,0.45);
  c.start(time); m.start(time); c.stop(time+1.9); m.stop(time+1.9);
}

/* intensité voulue (0 → 3), appliquée en début de mesure */
function musicWantedLevel(){
  if(state==='menu') return 0;
  if(state==='tutorial') return 1;
  if(boss || sgr) return 3;
  if(multiplier>=6 || resonanceT>0 || tier>=3) return 3;
  if(multiplier>=3 || danger>0.45 || elapsed>40 || tier>=1) return 2;
  return 1;
}
/* Drop : première mesure d'une phrase, après la montée, à partir de l'intensité 2. */
function musicDropActive(){ return !!actx && music.playing && actx.currentTime>=music.dropStart && actx.currentTime<music.dropEnd; }
function musicStart(mode){
  if(!actx||audioMuted) return;
  musicInit();
  const was=music.playing;
  music.mode=mode||'game';
  music.playing=true; music.nextNote=actx.currentTime+0.1; music.step=0; music.bar=0; kickTimes.length=0;
  music.level=musicWantedLevel(); music.dark=false; music.dropStart=music.dropEnd=-1;
  if(music.mode==='menu'){ music.bpm=music.targetBpm=84; }
  const target=(profile.options.music/100)*MUSIC_GAIN;
  musicMasterGain.gain.cancelScheduledValues(actx.currentTime);
  musicMasterGain.gain.setValueAtTime(was?musicMasterGain.gain.value:0,actx.currentTime);
  musicMasterGain.gain.linearRampToValueAtTime(target,actx.currentTime+(was?0.4:1.5));
  rumbleStart();
}
function musicStop(){
  if(!musicMasterGain||!actx) return;
  musicMasterGain.gain.cancelScheduledValues(actx.currentTime);
  musicMasterGain.gain.setValueAtTime(musicMasterGain.gain.value,actx.currentTime);
  musicMasterGain.gain.linearRampToValueAtTime(0,actx.currentTime+0.6);
  if(music.playing) music.stoppedAt=actx.currentTime;
  music.playing=false;
  rumbleStop();
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
  rumble.g.gain.setTargetAtTime(0.12+a*0.75+danger*0.5, t, 0.12);
  rumble.lp.frequency.setTargetAtTime(80+a*170+danger*220, t, 0.15);
}
function musicSetBpm(bpm){ music.targetBpm=bpm; }
function musicTick(dt){
  if(!actx) return;
  if(!music.playing){
    /* au menu, une nappe calme reprend d'elle-même dès que l'audio est débloqué */
    if(state==='menu' && !audioMuted && actx.state==='running' && actx.currentTime-music.stoppedAt>1.2) musicStart('menu');
    return;
  }
  if(!musicMasterGain) return;
  const k=1-Math.exp(-Math.min(0.1,Math.max(0,dt||0.016))*3);
  music.bpm=Math.min(200,Math.max(60,music.bpm+(music.targetBpm-music.bpm)*k));
  rumbleTick();
  const now=actx.currentTime;
  const stepDur=60/music.bpm/4;
  if(mDelayL){ mDelayL.delayTime.setTargetAtTime(stepDur*3,now,0.2); mDelayR.delayTime.setTargetAtTime(stepDur*3,now,0.2); }
  if(music.nextNote<now-0.1) music.nextNote=now+0.05;   // retour de pause : on ne rattrape pas les notes manquées
  while(music.nextNote<now+0.15){
    musicPlayStep(music.nextNote,music.step,stepDur);
    music.nextNote+=stepDur;
    music.step=(music.step+1)%16;
    if(music.step===0) music.bar++;
  }
}
const RESO_NOTES=[220,261.63,329.63,392,440,523.25];
function musicPlayStep(time,s,stepDur){
  const ci=music.bar%4, phrase=Math.floor(music.bar/4);
  if(s===0){
    const lv=musicWantedLevel();
    if(lv>music.level && lv>=3 && ci!==0) mNoiseHit(time,'highpass',4000,0.5,0.12,1.6,0.5,0);   // montée en puissance : crash
    music.level=lv;
    if(ci===0) music.dark=!!boss || !!sgr;
  }
  const L=music.level, prog=music.dark?PROG_DARK:PROG_CALM, ch=prog[ci];
  const barDur=stepDur*16;
  if(s===0 && ci===0 && L>=2 && music.bar>0){ music.dropStart=time; music.dropEnd=time+barDur; }

  /* nappe */
  if(s===0) mPad(time,ch.pad,barDur,L);

  /* basse */
  if(L===0){ if(s===0||s===8) mBass(time,ch.root-12,stepDur*7,0,0.75); }
  else { const o=BASS_PAT[s]; if(o!==null) mBass(time,ch.root-12+o,stepDur*1.6,L,s%4===0?1:0.8); }

  /* batterie */
  if(s%4===0){
    kickTimes.push(time); if(kickTimes.length>8) kickTimes.shift();
    if(L>=1) mKick(time,0.85,stepDur,L>=2?0.62:0.45);
  }
  if(L>=1){
    if(s%4===2) mHat(time,L>=3?0.2:0.17,L>=3);
    else if(L>=2 || s%2===0) mHat(time,s%2===0?0.08:0.045,false);
  }
  if(L>=2){
    if(s===4||s===12) mClap(time,0.6);
    if(ci===3){
      if(s===0) mRiser(time,barDur);
      if(s>=13) mClap(time,0.14+0.09*(s-13));
    }
  }
  if(L>=3 && ci===0 && s===0) mNoiseHit(time,'highpass',4000,0.5,0.12,1.6,0.5,0);

  /* arpège */
  const tones=ch.pad.concat(ch.pad.map(n=>n+12));
  if(L===0){ if(s%4===0) mPluck(time,mtof(tones[ARP_PAT[s]]),0.06,700,0.5); }
  else if(L>=2) mPluck(time,mtof(tones[ARP_PAT[s]]),s%4===0?0.11:0.08,900+L*500+(s%4===0?600:0),0.4);
  else if(s%2===0) mPluck(time,mtof(tones[ARP_PAT[s]]),0.07,800,0.35);

  /* mélodie */
  if(L>=3 || (L===2 && phrase%2===1)){
    const bank=music.dark?LEAD_DARK:((L>=3 && phrase%2===1)?LEAD_B:LEAD_A);
    for(const [st,n,len] of bank[ci]) if(st===s) mLead(time,n,len*stepDur,L>=3?0.085:0.065);
  }

  /* cloches cristallines (étoiles) */
  if(s%2===0 && mRand()<(L===0?0.2:0.08)) mBell(time,BELL_NOTES[Math.floor(mRand()*BELL_NOTES.length)],L===0?0.05:0.035);

  /* résonance : arpège doré en plus */
  if(resonanceT>0 && s%2===0) mPluck(time,RESO_NOTES[((s>>1)+Math.floor(time*2))%RESO_NOTES.length]*(s%8===0?2:1),0.08,2600,0.5);
}
