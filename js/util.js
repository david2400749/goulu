/* GOULU — utilitaires : dates, PRNG, graine */
function formatDate(d){ return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'); }
function todayStr(){ return formatDate(new Date()); }
function yesterdayStr(){ const y=new Date(); y.setDate(y.getDate()-1); return formatDate(y); }
function dateFromStr(s){ return new Date(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8)); }
function humanDate(s){ return dateFromStr(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}); }
function nextMidnightIn(){
  const n=new Date();
  const t=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,0,0,0,0);
  const d=t-n;
  return String(Math.floor(d/3600000)).padStart(2,'0')+':'+String(Math.floor(d%3600000/60000)).padStart(2,'0')+':'+String(Math.floor(d%60000/1000)).padStart(2,'0');
}
function mulberry32(a){
  return function(){
    a|=0; a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
let rng = Math.random, cardRng = Math.random;
function hashSeed(s){
  if(/^\d+$/.test(s)) return parseInt(s,10);
  let h = 2166136261;
  for(const ch of s){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function setSeedFromDate(s){
  if(s){ const h = hashSeed(String(s)); rng = mulberry32(h); cardRng = mulberry32(h ^ 0x9e3779b9); }
  else { rng = Math.random; cardRng = Math.random; }
}
