/* Version du jeu, affichée dans le menu : 0.x.y tant que le jeu est en
   développement (suffixe « -dev »), 1.0.0 pour la première version officielle.
   package.json doit porter la même valeur (vérifié par les tests). */
const GAME_VERSION = '0.19.0-dev';

/* GOULU — données du jeu : campagne, évolutions, modes, vagues, poussières, anomalies, boss, quêtes, succès, skins */
/* =========================================================
   NOUVEAU V9 : Campagne narrative
   ========================================================= */
const CAMPAIGN_LEVELS = [
  { n:1, name:'ÉVEIL', desc:'Les premières antimatières',
    duration:30, dustRate:0.75, antiRate:3.2, weights:{gold:1,blue:0,red:0,white:0},
    bosses:[], lore:"Je ne me souviens pas d'avoir eu faim. Juste d'avoir commencé à manger.",
    constraint:null
  },
  { n:2, name:'FAIM', desc:'Premières antimatières',
    duration:45, dustRate:0.70, antiRate:2.0, weights:{gold:0.85,blue:0.15,red:0,white:0},
    bosses:['consumer'], lore:"Les étoiles étaient si proches. Si brillantes. Si fragiles.",
    constraint:null
  },
  { n:3, name:'ESSAIM', desc:'Nuées fragmentées',
    duration:50, dustRate:0.65, antiRate:1.2, weights:{gold:0.70,blue:0.15,red:0.10,white:0.05},
    bosses:['swarm'], lore:"Chaque fragment que je dévore devient une partie de moi. Je deviens… multiple.",
    constraint:null
  },
  { n:4, name:'SILENCE', desc:'Aucune anomalie, aucun boss',
    duration:40, dustRate:0.55, antiRate:2.5, weights:{gold:0.70,blue:0.15,red:0.10,white:0.05},
    bosses:[], lore:"Le vide était là avant moi. Il sera là après.",
    constraint:'noAnomaly'
  },
  { n:5, name:'CHAOS', desc:'Deux boss en séquence',
    duration:60, dustRate:0.70, antiRate:1.5, weights:{gold:0.55,blue:0.20,red:0.20,white:0.05},
    bosses:['swarm','consumer'], lore:"J'ai voulu tout avaler. L'univers a répondu par le chaos.",
    constraint:null
  },
  { n:6, name:'VIDE', desc:'Pas de poussière blanche',
    duration:55, dustRate:0.65, antiRate:1.8, weights:{gold:0.75,blue:0.15,red:0.10,white:0},
    bosses:['eye'], lore:"L'Œil me regarde. Il ne cligne pas. Il n'a pas d'yeux.",
    constraint:null
  },
  { n:7, name:'MURMURES', desc:'Sans onde de choc (Parry uniquement)',
    duration:50, dustRate:0.70, antiRate:1.2, weights:{gold:0.70,blue:0.15,red:0.10,white:0.05},
    bosses:['consumer','consumer'], lore:"Ils chuchotent des choses que je ne comprends pas. Mais je sens qu'ils ont raison.",
    constraint:'noShock'
  },
  { n:8, name:'ÉCHO', desc:'Stats réduites, pas d\'anomalies',
    duration:55, dustRate:0.70, antiRate:1.5, weights:{gold:0.60,blue:0.20,red:0.15,white:0.05},
    bosses:['swarm'], lore:"J'entends mes propres cris, répétés à l'infini. Je ne sais plus lequel est l'original.",
    constraint:'reducedStats'
  },
  { n:9, name:'FUREUR', desc:'Les 3 boss en 90s',
    duration:90, dustRate:0.75, antiRate:1.0, weights:{gold:0.50,blue:0.20,red:0.25,white:0.05},
    bosses:['consumer','swarm','eye'], lore:"Il n'y a plus de temps. Il n'y a plus que la faim.",
    constraint:null
  },
  { n:10, name:'SINGULARITÉ', desc:'Le Mangeur d\'Étoiles',
    duration:120, dustRate:0.70, antiRate:1.2, weights:{gold:0.55,blue:0.20,red:0.20,white:0.05},
    bosses:['consumer','swarm','eye','consumer','pulsar'],
    lore:"Je me souviens maintenant. J'ai commencé à manger parce que j'avais peur du vide. Le vide, c'était moi.",
    constraint:'final'
  },
];

/* =========================================================
   NOUVEAU V9 : Arbre d'évolution
   ========================================================= */
const UPGRADES = [
  // APPÉTIT
  { id:'app1', branch:'appetit', name:'Appétit I',    icon:'💰', desc:'+5% pts dust',       cost:3,  apply:(m)=>{ m.dustValue *= 1.05; } },
  { id:'app2', branch:'appetit', name:'Appétit II',   icon:'💰', desc:'+10% pts dust',      cost:6,  apply:(m)=>{ m.dustValue *= 1.10; } },
  { id:'app3', branch:'appetit', name:'Appétit III',  icon:'💰', desc:'+15% pts dust',      cost:9,  apply:(m)=>{ m.dustValue *= 1.15; } },
  { id:'app4', branch:'appetit', name:'Combo Long',   icon:'🔥', desc:'+0.6s fenêtre combo', cost:5,  apply:(m)=>{ m.comboBonus += 0.6; } },
  // DÉFENSE
  { id:'def1', branch:'defense', name:'Robustesse I', icon:'🛡️', desc:'+1 vie max',         cost:6,  apply:(m)=>{ m.bonusLives += 1; } },
  { id:'def2', branch:'defense', name:'Robustesse II',icon:'🛡️', desc:'+2 vies max',        cost:12, apply:(m)=>{ m.bonusLives += 2; } },
  { id:'def3', branch:'defense', name:'Instinct',     icon:'👁️', desc:'+20% zone parry',    cost:7,  apply:(m)=>{ m.parryRangeMult *= 1.2; } },
  { id:'def4', branch:'defense', name:'Bouclier',     icon:'💎', desc:'Invincibilité +0.5s',cost:5,  apply:(m)=>{ m.invincBonus += 0.5; } },
  // CONNAISSANCE
  { id:'cog1', branch:'connaissance', name:'Rendement I',  icon:'⚙️', desc:'1 charge pour 3 dust', cost:4,  apply:(m)=>{ m.dustPerCharge = Math.max(2, m.dustPerCharge - 1); } },
  { id:'cog2', branch:'connaissance', name:'Capital',      icon:'📈', desc:'+1 charge max',        cost:5,  apply:(m)=>{ m.maxCharges += 1; } },
  { id:'cog3', branch:'connaissance', name:'Chaîne+',      icon:'⛓️', desc:'Chaîne de parry max ×8',cost:8,  apply:(m)=>{ m.chainCap = Math.max(m.chainCap, 8); } },
  { id:'cog4', branch:'connaissance', name:'Deuxième Vue', icon:'🌟', desc:'+1 anomalie au départ', cost:10, apply:(m)=>{ m.startAnomalies += 1; } },
];

const TECHNIQUES = [
  { id:'dashparry', icon:'⚡', name:'Dash-Parry', desc:'3 parry en moins d\'1 s', effect:'Fenêtre de chaîne +0,5 s' },
  { id:'echochain', icon:'🔊', name:'Echo-Chain', desc:'Parry pendant un Écho', effect:'Un écho tous les 3 parry' },
  { id:'momentum',  icon:'💥', name:'Momentum Kill', desc:'Détruis une antimatière lancée à pleine vitesse', effect:'+10 pts × multiplicateur par élimination rapide' },
];

const LORE = CAMPAIGN_LEVELS.map((l,i)=>({ n:i+1, name:l.name, text:l.lore }));

const DAILY_RULES = [
  { id:'fragile', name:'FRAGILE', desc:'1 seule vie, score ×2', apply:(m)=>{ m.scoreMult *= 2; } },
  { id:'rafale',  name:'RAFALE',  desc:'+40% d\'antimatière, score ×1.3', apply:(m)=>{ m.antiSpawnMult *= 1.4; m.scoreMult *= 1.3; } },
  { id:'boss',    name:'DÉPART EN BOSS', desc:'Le premier boss arrive tout de suite', startWave:3, apply:(m)=>{} },
  { id:'sobre',   name:'SOBRIÉTÉ', desc:'2 charges max, 3 poussières par charge', apply:(m)=>{ m.maxCharges = 2; m.dustPerCharge = 3; } },
  { id:'echo',    name:'ÉCHO',    desc:'Chaque parry crée une 2e onde', apply:(m)=>{ m.echo = true; } },
  { id:'pulsar',  name:'NUIT DU PULSAR', desc:'Le Pulsar surgit à 20 s', pulsarAt:20, apply:(m)=>{} },
];
function dailyRuleFor(dateStr){
  const n = (parseInt(dateStr.slice(4,6),10)*31 + parseInt(dateStr.slice(6,8),10)) % DAILY_RULES.length;
  return DAILY_RULES[n];
}

/* Data tables (identiques V8.2 — on garde les mêmes structures) */
const MODES = {
  classic: { id:'classic', name:'Classique', icon:'🕳️', desc:'Vagues scénarisées + boss',
    unlock:null, unlockLabel:'', duration:0, anomalyInterval:20, bossInterval:60, noShock:false, label:'CLASSIQUE', useWaves:true },
  pacifist: { id:'pacifist', name:'Pacifiste', icon:'🕊️', desc:'Pas d\'onde : parry au contact',
    unlock:'boss_1', unlockLabel:'Tue 1 boss', duration:0, anomalyInterval:20, bossInterval:60, noShock:true, label:'PACIFISTE', useWaves:false },
  blitz: { id:'blitz', name:'Blitz', icon:'⚡', desc:'30 secondes chrono',
    unlock:'plays_30', unlockLabel:'30 parties', duration:30, anomalyInterval:10, bossInterval:25, noShock:false, label:'BLITZ', useWaves:false },
  chaos: { id:'chaos', name:'Chaos', icon:'🌀', desc:'Anomalies, boss et antis en rafale · score sans plafond',
    unlock:'perfect_1', unlockLabel:'1 PERFECT CHAIN', duration:0, anomalyInterval:10, bossInterval:30, noShock:false, label:'CHAOS', useWaves:false },
  metronome: { id:'metronome', name:'Métronome', icon:'🎵', desc:'L\'onde ne frappe fort que sur le tempo',
    unlock:'pulse_20', unlockLabel:'20 pulses', duration:0, anomalyInterval:20, bossInterval:60, noShock:false, label:'MÉTRONOME', useWaves:true, beatOnly:true }
};
const WAVES = [
  { name:'ÉVEIL',        duration:8, dustRate:0.85, antiRate:3.4,    weights:{gold:1,blue:0,red:0,white:0},             boss:false },
  { name:'PREMIER SANG', duration:20, dustRate:0.75, antiRate:2.8,  weights:{gold:0.85,blue:0.15,red:0,white:0},        boss:false },
  { name:'ESCALADE',     duration:20, dustRate:0.65, antiRate:2.0,  weights:{gold:0.60,blue:0.20,red:0.15,white:0.05},  boss:false },
  { name:'BOSS I',       duration:20, dustRate:0.70, antiRate:4.5,    weights:{gold:0.70,blue:0.15,red:0.10,white:0.05},  boss:true  },
  { name:'RÉPIT',        duration:20, dustRate:0.55, antiRate:2.6,  weights:{gold:0.80,blue:0.15,red:0.05,white:0},     boss:false },
  { name:'TEMPÊTE',      duration:20, dustRate:0.85, antiRate:1.6,  weights:{gold:0.50,blue:0.20,red:0.25,white:0.05},  boss:false },
  { name:'BOSS II',      duration:20, dustRate:0.70, antiRate:4.0,    weights:{gold:0.60,blue:0.20,red:0.15,white:0.05},  boss:true  },
  { name:'CHAOS',        duration:20, dustRate:0.60, antiRate:1.3,  weights:{gold:0.50,blue:0.20,red:0.25,white:0.05},  boss:false },
  { name:'BOSS III',     duration:20, dustRate:0.70, antiRate:3.5,    weights:{gold:0.60,blue:0.20,red:0.15,white:0.05},  boss:true  },
  { name:'ENDLESS',      duration:99999, dustRate:0.65, antiRate:1.2,weights:{gold:0.60,blue:0.20,red:0.15,white:0.05}, boss:false }
];
const DUST_TYPES = {
  gold:  { id:'gold',  color:'#ffcb4d', glow:'rgba(255,203,77,',  label:'dorée',   pts:3 },
  blue:  { id:'blue',  color:'#7ee7ff', glow:'rgba(126,231,255,', label:'bleue',   pts:8 },
  red:   { id:'red',   color:'#ff5c2d', glow:'rgba(255,92,45,',   label:'rouge',   pts:5 },
  white: { id:'white', color:'#ffffff', glow:'rgba(255,255,255,', label:'blanche', pts:3 }
};
const ELEM_CHAIN_REQ = 3;
const ELEM_CHAIN_WINDOW = 3.5;
const SPECIALIZATIONS = {
  devoreur:   { icon:'🌀', name:'DÉVOREUR',   color:'#a06eff' },
  architecte: { icon:'⚙️', name:'ARCHITECTE', color:'#7ee7ff' },
  fantome:    { icon:'👻', name:'FANTÔME',    color:'#4ade80' },
  danseur:    { icon:'💃', name:'DANSEUR',    color:'#ffcb4d' },
  kamikaze:   { icon:'💀', name:'KAMIKAZE',   color:'#ff2d6f' }
};
const SPEC_CATEGORIES = { force:'devoreur', eco:'architecte', def:'fantome', mob:'danseur', risk:'kamikaze' };
const SPEC_THRESHOLD = 5;

const QUEST_POOL = [
  { id:'q_plays',    label:'Joue 3 parties',           target:3,   field:'plays',     fmt:(v)=>v+'/3' },
  { id:'q_bestParry',label:'5 parry dans une partie',  target:5,   field:'bestParry', fmt:(v)=>v+'/5' },
  { id:'q_bestScore',label:'Atteins 1200 pts',         target:1200, field:'bestScore', fmt:(v)=>v+'/1200' },
  { id:'q_dust',     label:'Collecte 30 poussières',   target:30,  field:'dust',      fmt:(v)=>v+'/30' },
  { id:'q_bosses',   label:'Tue 1 boss',               target:1,   field:'bosses',    fmt:(v)=>v+'/1' },
  { id:'q_bestTime', label:'Survis 45s en une partie', target:45,  field:'bestTime',  fmt:(v)=>v+'s/45s' },
  { id:'q_parry',    label:'15 parry cumulés',         target:15,  field:'parry',     fmt:(v)=>v+'/15' },
  { id:'q_anomalies',label:'3 anomalies en une partie',target:3,   field:'anomalies', fmt:(v)=>v+'/3' },
  { id:'q_perfect',  label:'Réalise un PERFECT CHAIN', target:1,   field:'perfect',   fmt:(v)=>v+'/1' },
  { id:'q_scoreSum', label:'4000 pts cumulés',         target:4000, field:'scoreSum',  fmt:(v)=>v+'/4000' },
  { id:'q_daily',    label:'Termine un défi du jour',  target:1,   field:'dailyDone', fmt:(v)=>v+'/1' },
  { id:'q_bosses3',  label:'3 boss dans la journée',   target:3,   field:'bosses',    fmt:(v)=>v+'/3' },
  { id:'q_elem',     label:'3 chaînes élémentaires',   target:3,   field:'elemChains',fmt:(v)=>v+'/3' },
  { id:'q_wave5',    label:'Atteins la vague 5',       target:5,   field:'bestWave',  fmt:(v)=>v+'/5' },
];

const ACH = [
  { id:'first',      icon:'🌟', name:'Premier Pas', desc:'Joue ta 1ère partie',       check:(r,p)=>p.cum.plays>=1 },
  { id:'plays_20',   icon:'🎮', name:'Habitué',    desc:'20 parties jouées',           check:(r,p)=>p.cum.plays>=20 },
  { id:'dust_100',   icon:'✨', name:'Glouton',     desc:'100 poussières cumulées',     check:(r,p)=>p.cum.dust>=100 },
  { id:'dust_2000',  icon:'💫', name:'Gourmand',   desc:'2000 poussières cumulées',    check:(r,p)=>p.cum.dust>=2000 },
  { id:'parry_10',   icon:'⚡', name:'Riposte',    desc:'10 parry cumulés',            check:(r,p)=>p.cum.parry>=10 },
  { id:'parry_50',   icon:'🗡️', name:'Parry God',  desc:'50 parry cumulés',            check:(r,p)=>p.cum.parry>=50 },
  { id:'combo_9',    icon:'🔥', name:'Combo Max',  desc:'Atteindre ×9',                check:(r,p)=>r.maxCombo>=9 || p.bestRun.maxCombo>=9 },
  { id:'survive_60', icon:'⏱️', name:'Endurant',   desc:'Survivre 60 secondes',        check:(r,p)=>(r.engaged && r.time>=60) || p.cum.bestSurvival>=60 },
  { id:'survive_90', icon:'🕰️', name:'Immortel',   desc:'Survivre 90 secondes',        check:(r,p)=>(r.engaged && r.time>=90) || p.cum.bestSurvival>=90 },
  { id:'score_500',  icon:'🎯', name:'Tireur',     desc:'Atteindre 15000 pts',         check:(r,p)=>r.score>=15000 || p.best>=15000 },
  { id:'score_1000', icon:'👑', name:'Légende',    desc:'Atteindre 60000 pts',         check:(r,p)=>r.score>=60000 || p.best>=60000 },
  { id:'streak_7',   icon:'📅', name:'Fidèle',     desc:'7 jours d\'affilée',          check:(r,p)=>p.streak.current>=7 || p.streak.best>=7 },
  { id:'elem_1',     icon:'🥇', name:'Alchimiste', desc:'1 chaîne élémentaire',        check:(r,p)=>p.elemChains>=1 },
  { id:'elem_10',    icon:'🧪', name:'Élémentaliste', desc:'10 chaînes élémentaires',  check:(r,p)=>p.elemChains>=10 },
  { id:'wave_3',     icon:'🌊', name:'Navigateur', desc:'Atteindre la vague 3',        check:(r,p)=>(r.engaged && r.wave>=3) || p.bestWave>=3 },
  { id:'wave_5',     icon:'⚔️', name:'Vétéran',    desc:'Atteindre la vague 5',        check:(r,p)=>(r.engaged && r.wave>=5) || p.bestWave>=5 },
  { id:'wave_7',     icon:'🏆', name:'Maître',     desc:'Atteindre la vague 7',        check:(r,p)=>(r.engaged && r.wave>=7) || p.bestWave>=7 },
  { id:'wave_9',     icon:'🌟', name:'Inarrêtable',desc:'Atteindre la vague 9',        check:(r,p)=>(r.engaged && r.wave>=9) || p.bestWave>=9 },
  { id:'spec_1',     icon:'🎯', name:'Spécialiste',desc:'1 spécialisation',            check:(r,p)=>Object.keys(p.specUnlocked||{}).length>=1 },
  { id:'spec_all',   icon:'🌌', name:'Omniscient', desc:'5 spécialisations',           check:(r,p)=>Object.keys(p.specUnlocked||{}).length>=5 },
  { id:'boss_5',     icon:'💀', name:'Bourreau',   desc:'5 boss tués',                 check:(r,p)=>p.bossesKilled>=5 },
  { id:'boss_20',    icon:'🩸', name:'Fléau',      desc:'20 boss tués',                check:(r,p)=>p.bossesKilled>=20 },
  { id:'daily_3',    icon:'🔥', name:'Rituel',     desc:'3 jours de streak',           check:(r,p)=>p.streak.current>=3 || p.streak.best>=3 },
  { id:'camp_1',     icon:'📖', name:'Chapitre I', desc:'Termine le niveau 3',         check:(r,p)=>Object.keys(p.campaign.completed||{}).length>=3 },
  { id:'camp_5',     icon:'📚', name:'Chapitre II',desc:'Termine le niveau 5',         check:(r,p)=>Object.keys(p.campaign.completed||{}).length>=5 },
  { id:'camp_final', icon:'🌑', name:'Singularité',desc:'Termine la campagne',         check:(r,p)=>p.campaign.completed && p.campaign.completed[10] },
  { id:'pulse_10',   icon:'🎵', name:'Métronome',  desc:'10 pulses sur le tempo',     check:(r,p)=>(p.pulses||0)>=10 },
  { id:'reso_1',     icon:'🎼', name:'Résonance',  desc:'Déclenche une Résonance',    check:(r,p)=>(p.resonances||0)>=1 },
  { id:'pulsar_1',   icon:'✴️', name:'Phare éteint', desc:'Vaincs le Pulsar',          check:(r,p)=>(p.pulsarsKilled||0)>=1 },
];

const SKINS = {
  classic:{name:'Gargantua',desc:'Classique',unlock:null,ring:['hsla(30,100%,70%,.85)','hsla(24,100%,62%,.63)','hsla(18,100%,56%,.41)'],stroke:'rgba(255,214,170,.92)',glow:['rgba(255,150,70,.5)','rgba(200,90,30,.2)','rgba(60,20,0,0)'],preview:'#ffb56e',disk:['rgba(255,170,90,.85)','rgba(255,220,170,.35)','rgba(150,70,20,0)']},
  red:    {name:'Cramoisi',desc:'50 parry',unlock:'parry_50',ring:['hsla(350,100%,66%,.85)','hsla(10,100%,60%,.63)','hsla(30,100%,55%,.41)'],stroke:'rgba(255,140,160,.92)',glow:['rgba(255,80,120,.5)','rgba(180,30,60,.2)','rgba(60,0,10,0)'],preview:'#ff3b5c',disk:['rgba(255,60,90,.85)','rgba(255,160,180,.35)','rgba(120,20,40,0)']},
  gold:   {name:'Doré',desc:'2000 poussières',unlock:'dust_2000',ring:['hsla(45,100%,66%,.85)','hsla(35,100%,60%,.63)','hsla(25,100%,55%,.41)'],stroke:'rgba(255,220,130,.92)',glow:['rgba(255,200,80,.5)','rgba(180,120,20,.2)','rgba(60,40,0,0)'],preview:'#ffcb4d',disk:['rgba(255,200,70,.85)','rgba(255,240,150,.35)','rgba(150,90,10,0)']},
  cyan:   {name:'Cyan',desc:'Survivre 60s',unlock:'survive_60',ring:['hsla(190,100%,70%,.85)','hsla(200,100%,65%,.63)','hsla(210,100%,60%,.41)'],stroke:'rgba(140,230,255,.92)',glow:['rgba(100,220,255,.5)','rgba(30,140,180,.2)','rgba(0,30,60,0)'],preview:'#7ee7ff',disk:['rgba(120,220,255,.85)','rgba(180,240,255,.35)','rgba(20,90,140,0)']},
  emerald:{name:'Émeraude',desc:'×9 combo',unlock:'combo_9',ring:['hsla(150,90%,60%,.85)','hsla(160,90%,55%,.63)','hsla(170,90%,50%,.41)'],stroke:'rgba(120,240,180,.92)',glow:['rgba(80,220,140,.5)','rgba(20,140,80,.2)','rgba(0,40,20,0)'],preview:'#4ade80',disk:['rgba(80,220,140,.85)','rgba(180,255,210,.35)','rgba(20,120,60,0)']},
  void:   {name:'Void',desc:'Tous succès',unlock:'all',ring:['rgba(255,255,255,.9)','rgba(200,200,200,.5)','rgba(150,150,150,.3)'],stroke:'rgba(255,255,255,.9)',glow:['rgba(255,255,255,.35)','rgba(120,120,120,.15)','rgba(0,0,0,0)'],preview:'#f4f4f4',disk:['rgba(240,240,240,.85)','rgba(255,255,255,.5)','rgba(80,80,80,0)']},
  prism:  {name:'Prismatique',desc:'15 shards',unlock:'shards_15',ring:['hsla(0,100%,70%,.9)','hsla(120,100%,70%,.7)','hsla(240,100%,70%,.5)'],stroke:'rgba(255,255,255,.95)',glow:['rgba(255,100,200,.5)','rgba(100,200,255,.25)','rgba(0,0,0,0)'],preview:'#ff6bd6',disk:['rgba(255,100,200,.85)','rgba(100,200,255,.45)','rgba(60,20,120,0)']},
  singular:{name:'Singularité',desc:'Finir campagne',unlock:'camp_final',ring:['hsla(45,100%,70%,.95)','hsla(0,100%,65%,.7)','hsla(280,100%,70%,.5)'],stroke:'rgba(255,240,180,.95)',glow:['rgba(255,200,100,.55)','rgba(255,80,180,.3)','rgba(40,0,80,0)'],preview:'#ffe9a3',disk:['rgba(255,220,120,.9)','rgba(255,120,200,.5)','rgba(80,20,120,0)']},
  echo:{name:'Résonance',desc:'1 Résonance',unlock:'reso_1',ring:['hsla(300,100%,72%,.9)','hsla(48,100%,65%,.75)','hsla(190,100%,70%,.5)'],stroke:'rgba(255,230,255,.95)',glow:['rgba(255,150,240,.5)','rgba(255,210,100,.25)','rgba(0,0,0,0)'],preview:'#ff9cf0',disk:['rgba(255,150,240,.85)','rgba(255,215,110,.45)','rgba(60,20,120,0)']},
  pulsar:{name:'Pulsar',desc:'Vaincre le Pulsar',unlock:'pulsar_1',ring:['hsla(205,100%,85%,.95)','hsla(210,100%,70%,.7)','hsla(220,100%,60%,.45)'],stroke:'rgba(225,245,255,.95)',glow:['rgba(160,215,255,.55)','rgba(80,140,255,.25)','rgba(0,10,40,0)'],preview:'#bfe6ff',disk:['rgba(200,235,255,.9)','rgba(140,200,255,.45)','rgba(30,60,140,0)']}
};

const ANOMALIES = [
  { id:'force', name:'Force Brute', icon:'🌀', cat:'force', rarity:'common', desc:'<b>+40%</b> force d\'attraction', max:3, apply:(m)=>{ m.attractMult *= 1.4; } },
  { id:'onde', name:'Onde Large', icon:'💠', cat:'force', rarity:'rare', desc:'Rayon onde <b>+35%</b>', max:2, apply:(m)=>{ m.shockRadiusMult *= 1.35; } },
  { id:'souffle', name:'Souffle', icon:'🌬️', cat:'force', rarity:'common', desc:'Répulsion <b>+60%</b>', max:2, apply:(m)=>{ m.repelMult *= 1.6; } },
  { id:'mine', name:'Mine d\'Or', icon:'💰', cat:'eco', rarity:'common', desc:'Chaque poussière vaut <b>+1 pt</b>', max:3, apply:(m)=>{ m.dustValue += 1; } },
  { id:'rendement', name:'Rendement', icon:'⚙️', cat:'eco', rarity:'rare', desc:'<b>-1</b> poussière par charge', max:1, apply:(m)=>{ m.dustPerCharge = Math.max(2, m.dustPerCharge - 1); } },
  { id:'capital', name:'Capital', icon:'📈', cat:'eco', rarity:'rare', desc:'<b>+1</b> charge max', max:2, apply:(m)=>{ m.maxCharges += 1; } },
  { id:'carapace', name:'Carapace', icon:'🛡️', cat:'def', rarity:'rare', desc:'<b>+1</b> vie', max:2, apply:(m)=>{ m.bonusLives += 1; } },
  { id:'vampire', name:'Vampire', icon:'🩸', cat:'def', rarity:'legendary', desc:'Chaque <b>3e parry</b> rend 1 vie', max:1, apply:(m)=>{ m.vampire = true; } },
  { id:'instinct', name:'Instinct', icon:'👁️', cat:'mob', rarity:'common', desc:'Zone parry <b>+60%</b>', max:2, apply:(m)=>{ m.parryRangeMult *= 1.6; } },
  { id:'chaine', name:'Chaîne Libre', icon:'⛓️', cat:'mob', rarity:'rare', desc:'Chaîne de parry max <b>×12</b>', max:1, apply:(m)=>{ m.chainCap = Math.max(m.chainCap, 12); } },
  { id:'reflexe', name:'Réflexe', icon:'⚡', cat:'mob', rarity:'common', desc:'Fenêtre de chaîne <b>+1s</b>', max:2, apply:(m)=>{ m.chainWindow += 1; } },
  { id:'fureur', name:'Fureur', icon:'😤', cat:'risk', rarity:'legendary', desc:'5s sans relâcher = <b>×2 score</b>', max:1, apply:(m)=>{ m.fureur = true; } },
  { id:'faim', name:'Faim', icon:'🍖', cat:'risk', rarity:'rare', desc:'Anti <b>+50%</b> mais <b>+80% pts</b>', max:1, apply:(m)=>{ m.antiSpawnMult *= 1.5; m.anomScore *= 1.8; } },
  { id:'pacte', name:'Pacte Noir', icon:'🖤', cat:'risk', rarity:'legendary', desc:'<b>+150% pts</b> mais <b>-1 vie</b>', max:1, apply:(m)=>{ m.anomScore *= 2.5; m.bonusLives -= 1; } },
  { id:'echo', name:'Écho', icon:'🔊', cat:'special', rarity:'legendary', desc:'Chaque parry crée une <b>2e onde</b>', max:1, apply:(m)=>{ m.echo = true; } },
];
/* PV +1 en 0.12.2 pour compenser Écho et Vampire désormais actifs sur les boss.
   La Nuée a autant d'éclats que de PV. */
const BOSS_TYPES = [
  { id:'consumer', name:'Le Consommateur', icon:'👁️', hp:4, color:'#ff2d6f', pts:600 },
  { id:'swarm', name:'La Nuée', icon:'💠', hp:6, color:'#a06eff', pts:800 },
  { id:'eye', name:'L\'Œil', icon:'🌀', hp:5, color:'#7ee7ff', pts:1000 },
  /* 0.15 : boss de rythme, ne se frappe qu'en renvoyant son faisceau (js/pulsar.js) */
  { id:'pulsar', name:'Le Pulsar', icon:'✴️', hp:5, color:'#a9dcff', pts:1200 },
];
