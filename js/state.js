/* GOULU — constantes et état global de la partie */
const ATTRACT_F=140000, MIN_D=150, REPEL_F=320, DRAG=0.5;
const PARRY_HITSTOP=0.04, HITSTOP_BOSS=0.075, MUSIC_GAIN=0.16;
const MAX_SPEED=1250;
const COMBO_MAX=2.4, R_DUST=7, R_ANTI=13, MAX_MULT=9, ENTITY_CAP=150;
const BASE_MAX_CHARGES=3, BASE_DUST_PER_CHG=4, PARRY_RANGE=100;
const SHOCK_MAX_R=240, SHOCK_LIFE=0.55;
const PARRY_CHAIN_WINDOW=2.0, HITSTOP_DURATION=0.075;
const INVINCIBLE_DURATION=2.0, CHAIN_THRESHOLD=4;

let state='menu';
let currentMode = MODES.classic;
let currentCampaignLevel = null;
let entities=[], particles=[], shockwaves=[], toasts=[];
let damageNumbers = [];
let score=0, scoreFrac=0, combo=0, comboTimer=0, multiplier=1, lives=3;
let maxCombo=1, elapsed=0, dustTimer=0, antiTimer=0;
let shake=0, flash=0, parryFlash=0, danger=0;
let attract=false, overCd=0;
let shockCharges=0, dustSinceCharge=0;
let timeScale=1, slowmoT=0;
let parryCount=0, runDust=0, surgeFired=false;
let lastDeathContext=null;
let achToastEl=null;
let parryChain=0, parryChainTimer=0, perfectChainFired=false;
let hitstop=0;
let invincibleT=0;
let currentPace=[];
let lastPaceRecorded=-1;
let mods=null, activeAnomalies=[], pendingEchoes=[];
let anomalyScreenOpen=false, anomalyNextAt=0, bossNextAt=0;
let boss=null, bossesKilled=0;
let timeSinceRelease=0;
let runHasPerfect=false;
let runBossesKilled=0;
let lastGameWasDaily=false;

let endlessBurstAt=18, endlessBossAt=30, pulsarDailyDone=false, resumeT=0;
let waveIndex=0, waveTimer=0, waveBannerTimer=0;
let elemChain = { type:null, count:0, timer:0 };
let elemTypesCollected = new Set();
let runElemChains = 0;
let specialization = null;
let kamikazeTimer = 0;
let fantomeTimer = 0;
let architecteDust = 0;
let overkillFreeze = 0;
let tutorialStep = 0;
let tutorialActive = false;
let tutorialCompleteTimer = 0;
let tutorialSafetyTimer = 0;

/* V9 new runtime state */
let campaignBossQueue = [];
let campaignBossTimer = 0;
let campaignNoAnomaly = false;
let campaignReducedStats = false;
let runTechniques = { dashparry: false, echochain: false, momentum: false };
let parryTimes = [];
let hurtT = 0, maxLivesRun = 3, finaleT = 0, anomalyWaveGiven = -1, campaignAnomDone = false;
let runHits = 0, runPerfects = 0, vampireCount = 0, echoParryCount = 0, frameN = 0;
let activeDailyRule = null, challenge = null, overReplayMode = 'retry', lastGhostKey = '';
let kickTimes = [], beatBpm = 80, beatOrigin = 0, pulseStreak = 0, resonanceT = 0, runPulses = 0, runResonances = 0;
let lastPulseTxt = '', thoughtSeen = new Set(), lastThoughtAt = -99;

/* Clip recording */
let mediaRecorder = null;
let recordedChunks = [];
let clipRecorderActive = false;
let clipBlobUrl = null;
let clipBlob = null, clipStream = null, clipExt = 'webm';
let clipCanvas = null, clipCtx = null;
