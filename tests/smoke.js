/* =========================================================
   GOULU — tests de fumée (navigateur Chromium sans écran)
   ---------------------------------------------------------
   Lance un petit serveur statique sur le dépôt, ouvre le jeu et vérifie :
   chargement sans erreur, mise en page mobile, parcours de jeu, régressions
   corrigées (score entier, techniques, perte de contexte WebGL…) et une
   simulation accélérée de chaque mode pour attraper les erreurs d'exécution.
   Usage : npm test    (code de sortie ≠ 0 si un test échoue)
   ========================================================= */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };

function serve(){
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split(/[?#]/)[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, rel);
    if(!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

const results = [];
let browser, base;

/* Les polices Google peuvent être injoignables en CI : on ne les compte pas comme des erreurs du jeu. */
const external = s => /fonts\.(googleapis|gstatic)\.com/.test(s);

async function open(url, { viewport = { width: 1366, height: 768 }, profile, touch = false } = {}){
  const ctx = await browser.newContext({ viewport, hasTouch: touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('exception : ' + e.message));
  page.on('console', m => { if(m.type() === 'error' && !external(m.text()) && !external((m.location() || {}).url || '')) errors.push('console : ' + m.text()); });
  page.on('response', r => { if(r.status() >= 400 && !external(r.url())) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
  if(profile) await page.addInitScript(p => localStorage.setItem('goulu_profile_v10', p), JSON.stringify(profile));
  await page.goto(base + url);
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof profile !== 'undefined');
  await page.waitForTimeout(500);
  return { page, ctx, errors };
}

function assert(cond, msg){ if(!cond) throw new Error(msg); }

async function test(name, fn){
  const t0 = Date.now();
  try{
    const note = await fn();
    results.push({ name, ok: true, note });
    console.log('  ✓ ' + name + (note ? '  (' + note + ')' : '') + '  ' + (Date.now() - t0) + ' ms');
  }catch(e){
    results.push({ name, ok: false });
    console.log('  ✗ ' + name + '\n      ' + String(e.message || e).split('\n').join('\n      '));
  }
}

const PLAYER = { tutorialDone: true };
const inView = (page, id) => page.evaluate(id => {
  const r = document.getElementById(id).getBoundingClientRect();
  return r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
}, id);

(async () => {
  const srv = await serve();
  base = 'http://127.0.0.1:' + srv.address().port + '/';
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  console.log('GOULU — tests de fumée sur ' + base);

  await test('Chargement sans erreur (WebGL ou repli automatique)', async () => {
    const { page, ctx, errors } = await open('index.html');
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => ({ state, useGL }));
    await ctx.close();
    assert(s.state === 'menu', 'état initial : ' + s.state);
    assert(!errors.length, errors.join('\n'));
    return s.useGL ? 'rendu WebGL2' : 'WebGL2 indisponible, repli 2D';
  });

  await test('Version affichée dans le menu, identique à package.json', async () => {
    const want = require(path.join(ROOT, 'package.json')).version;
    const { page, ctx } = await open('index.html?nogl');
    const r = await page.evaluate(() => ({ v: GAME_VERSION, label: document.getElementById('menuVersion').textContent }));
    await ctx.close();
    assert(r.v === want, 'GAME_VERSION ' + r.v + ' ≠ package.json ' + want);
    assert(r.label.includes(want), 'libellé du menu : « ' + r.label + ' »');
    return r.label;
  });

  await test('Chargement sans erreur (rendu 2D forcé ?nogl)', async () => {
    const { page, ctx, errors } = await open('index.html?nogl');
    const s = await page.evaluate(() => ({ state, useGL }));
    await ctx.close();
    assert(s.state === 'menu' && s.useGL === false, JSON.stringify(s));
    assert(!errors.length, errors.join('\n'));
  });

  for(const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1366, height: 768 }]){
    await test('Bouton « Jouer » visible sans défiler (' + vp.width + '×' + vp.height + ')', async () => {
      const { page, ctx } = await open('index.html?nogl', { viewport: vp, profile: PLAYER });
      const ok = await inView(page, 'btnPlay');
      await ctx.close();
      assert(ok, 'le bouton Jouer est hors de l\'écran');
    });
  }

  for(const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }]){
    await test('HUD entièrement dans l\'écran sur mobile (' + vp.width + ' px)', async () => {
      const { page, ctx, errors } = await open('index.html?nogl', { viewport: vp, profile: PLAYER, touch: true });
      await page.click('#btnPlay');
      await page.waitForTimeout(400);
      const out = [];
      for(const id of ['soundBtn', 'clipBtn', 'pauseBtn', 'bestHud', 'scoreHud', 'hearts', 'btnHold', 'btnWave']) if(!(await inView(page, id))) out.push(id);
      await ctx.close();
      assert(!out.length, 'hors écran : ' + out.join(', '));
      assert(!errors.length, errors.join('\n'));
    });
  }

  await test('Premier lancement : tutoriel puis partie', async () => {
    const { page, ctx, errors } = await open('index.html?nogl');
    await page.click('#btnPlay');
    const s1 = await page.evaluate(() => state);
    await page.click('#btnSkipTut');
    await page.waitForTimeout(700);
    const s2 = await page.evaluate(() => ({ state, done: profile.tutorialDone }));
    await ctx.close();
    assert(s1 === 'tutorial', 'attendu tutorial, obtenu ' + s1);
    assert(s2.state === 'play' && s2.done, JSON.stringify(s2));
    assert(!errors.length, errors.join('\n'));
  });

  await test('Score toujours entier avec multiplicateurs (Appétit I)', async () => {
    const { page, ctx } = await open('index.html?nogl', { profile: { tutorialDone: true, upgrades: { app1: true } } });
    await page.click('#btnPlay');
    const r = await page.evaluate(() => {
      entities.length = 0; score = 0; scoreFrac = 0; elemChain = { type: null, count: 0, timer: 0 };
      for(let i = 0; i < 3; i++) collectDust({ dustType: 'gold', x: bh.x, y: bh.y });
      syncHUD();
      return { score, hud: scoreHudEl.textContent };
    });
    await ctx.close();
    assert(Number.isInteger(r.score) && r.hud === String(r.score), JSON.stringify(r));
    assert(r.score === 14, '3 × 3,15 + 5 (trio doré) = 14,45 → 14 attendu, obtenu ' + r.score);
  });

  await test('Anciens records décimaux arrondis au chargement', async () => {
    const { page, ctx } = await open('index.html?nogl', { profile: { tutorialDone: true, best: 14.450000000000001, modeRecords: { classic: 99.9 }, history: [{ score: 3.15 }] } });
    const r = await page.evaluate(() => [profile.best, profile.modeRecords.classic, profile.history[0].score]);
    await ctx.close();
    assert(JSON.stringify(r) === '[14,100,3]', JSON.stringify(r));
  });

  await test('Fin de partie, puis toucher le panneau ne relance pas', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { viewport: { width: 390, height: 844 }, profile: PLAYER, touch: true });
    await page.click('#btnPlay');
    await page.evaluate(() => { lives = 1; invincibleT = 0; hurtT = 0; hitAnti({ x: bh.x + 5, y: bh.y }); });
    const s = await page.evaluate(() => ({ state, final: document.getElementById('finalScore').textContent, shown: !overEl.classList.contains('hidden') }));
    await page.waitForTimeout(1200);
    const box = await page.evaluate(() => { const b = document.querySelector('.over-panel').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 30 }; });
    await page.touchscreen.tap(box.x, box.y);
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => state);
    await ctx.close();
    assert(s.state === 'over' && s.shown && /^\d+$/.test(s.final), JSON.stringify(s));
    assert(after === 'over', 'la partie a été relancée par un toucher sur le panneau');
    assert(!errors.length, errors.join('\n'));
  });

  await test('Options ouvertes depuis le menu, fermées par Échap', async () => {
    const { page, ctx } = await open('index.html?nogl', { profile: PLAYER });
    await page.click('#btnMenuOptions');
    const opened = await page.evaluate(() => !optionsScreen.classList.contains('hidden'));
    await page.focus('#optSfx'); await page.keyboard.press('Space');
    const st = await page.evaluate(() => state);
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => optionsScreen.classList.contains('hidden'));
    await ctx.close();
    assert(opened && closed, JSON.stringify({ opened, closed }));
    assert(st === 'menu', 'ESPACE a lancé une partie derrière les options');
  });

  await test('Techniques listées et Momentum Kill déblocable', async () => {
    const { page, ctx } = await open('index.html?nogl', { profile: PLAYER });
    const cards = await page.evaluate(() => document.querySelectorAll('#techGrid .ach').length);
    await page.click('#btnPlay');
    const unlocked = await page.evaluate(() => {
      entities.length = 0; hitstop = 0;
      entities.push({ x: bh.x + 60, y: bh.y, vx: -1000, vy: 0, r: R_ANTI, type: 'anti', phase: 0, trail: [] });
      shockwaves.push({ r: 200, maxR: 240, life: 0.05, maxLife: 0.55, hit: new Set(), isEcho: false, pulse: false, weak: false, counted: false });
      update(0.001);
      return !!profile.techniques.momentum;
    });
    await ctx.close();
    assert(cards === 3, cards + ' techniques affichées');
    assert(unlocked, 'Momentum Kill non débloqué');
  });

  await test('main.html redirige vers index.html en gardant le lien de défi', async () => {
    const { page, ctx } = await open('main.html?nogl#s=1234&m=classic');
    const r = { url: page.url(), score: await page.evaluate(() => challenge && challenge.score) };
    await ctx.close();
    assert(/index\.html\?nogl#s=1234&m=classic$/.test(r.url) && r.score === 1234, JSON.stringify(r));
  });

  await test('Manifeste, icônes et image d\'aperçu présents', async () => {
    const { page, ctx, errors } = await open('index.html?nogl');
    const r = await page.evaluate(async () => {
      const m = await (await fetch(document.querySelector('link[rel=manifest]').href)).json();
      const og = new URL(document.querySelector('meta[property="og:image"]').content).pathname.replace(/^\/goulu\//, '');
      const urls = [...document.querySelectorAll('link[rel~=icon],link[rel=apple-touch-icon]')].map(l => l.href)
        .concat(m.icons.map(i => new URL(i.src, location.href).href), new URL(og, location.href).href);
      return Promise.all(urls.map(async u => (await fetch(u)).status + ' ' + u.split('/').pop()));
    });
    await ctx.close();
    const bad = r.filter(x => !x.startsWith('200'));
    assert(!bad.length, bad.join(', '));
    assert(!errors.length, errors.join('\n'));
  });

  await test('Perte puis restauration du contexte WebGL', async () => {
    const { page, ctx, errors } = await open('index.html');
    if(!(await page.evaluate(() => useGL))){ await ctx.close(); return 'ignoré : pas de WebGL2 sur cette machine'; }
    await page.evaluate(() => { window.__lc = document.getElementById('gl').getContext('webgl2').getExtension('WEBGL_lose_context'); __lc.loseContext(); });
    await page.waitForFunction(() => useGL === false, null, { timeout: 10000 });
    await page.evaluate(() => __lc.restoreContext());
    await page.waitForFunction(() => useGL === true && SpaceGL.ok, null, { timeout: 30000 });
    await ctx.close();
    assert(!errors.length, errors.join('\n'));
  });

  /* Règles du parry figées : onde sur antimatière, onde sur boss, contact (Pacifiste).
     Valeurs relevées avant le regroupement des trois copies du code (lot 5), puis
     Écho et Vampire étendus aux boss (0.12.2). */
  await test('Parry : mêmes règles pour l\'onde, le boss et le contact', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { profile: { tutorialDone: true, techniques: { dashparry: true, echochain: true } } });
    const r = await page.evaluate(() => {
      window.isOnBeat = () => false;   // le bonus de tempo dépend de l'horloge réelle
      const fresh = (mode, echo) => {
        Math.random = mulberry32(42); startGame(mode, false); entities.length = 0; hitstop = 0;
        mods.vampire = true; mods.echo = !!echo; lives = 1; maxLivesRun = 5; multiplier = 1;
      };
      const wave = () => { shockwaves.length = 0; shockwaves.push({ r: 200, maxR: 240, life: 0.05, maxLife: 0.55, hit: new Set(), isEcho: false, pulse: false, weak: false, counted: false }); hitstop = 0; update(0.001); };
      const anti = x => entities.push({ x: bh.x + x, y: bh.y, vx: 0, vy: 0, r: R_ANTI, type: 'anti', phase: 0, trail: [] });
      const out = {};
      fresh('classic', true); out.shock = [];
      for(let k = 0; k < 5; k++){ anti(60); wave(); out.shock.push(score); }
      Object.assign(out, { shockCombo: combo, shockLives: lives, shockEchoes: pendingEchoes.length, shockPerfect: runPerfects, shockInv: invincibleT > 1.9 });
      fresh('classic', true); spawnBossByName('consumer'); boss.hp = boss.maxHp = 99; out.boss = [];
      for(let k = 0; k < 4; k++){ const p = boss.parts[0]; p.x = bh.x + 70; p.y = bh.y; p.vx = p.vy = 0; wave(); out.boss.push(score); }
      Object.assign(out, { bossCombo: combo, bossLives: lives, bossEchoes: pendingEchoes.length, bossPerfect: runPerfects, bossHp: boss.hp });
      fresh('pacifist'); out.contact = [];
      for(let k = 0; k < 2; k++){ anti(50); anti(-50); fireWave(); out.contact.push(score); }
      Object.assign(out, { contactCombo: combo, contactLives: lives, contactPerfect: runPerfects, contactCount: parryCount });
      return out;
    });
    await ctx.close();
    const want = { shock: [20, 60, 140, 220, 300], shockCombo: 5, shockLives: 2, shockEchoes: 5, shockPerfect: 1, shockInv: true,
      boss: [20, 60, 140, 220], bossCombo: 0, bossLives: 2, bossEchoes: 4, bossPerfect: 1, bossHp: 95,
      contact: [60, 220], contactCombo: 4, contactLives: 2, contactPerfect: 1, contactCount: 4 };
    const diff = Object.keys(want).filter(k => JSON.stringify(want[k]) !== JSON.stringify(r[k])).map(k => k + ' : attendu ' + JSON.stringify(want[k]) + ', obtenu ' + JSON.stringify(r[k]));
    assert(!diff.length, diff.join('\n'));
    assert(!errors.length, errors.join('\n'));
  });

  await test('Écho sur un boss : pas de boucle d\'échos (l\'Œil)', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { profile: PLAYER });
    const r = await page.evaluate(() => {
      Math.random = mulberry32(7); startGame('classic', false); entities.length = 0;
      mods.echo = true; lives = 99; spawnBossByName('eye'); boss.hp = boss.maxHp = 50;
      const eye = boss.parts[0]; eye.eyeR = eye.eyeR0 = 85;          // l'Œil reste dans la zone de parry
      shockCharges = 1; attract = true; fireWave();                  // une seule onde, puis on maintient
      const hp0 = boss.hp;
      for(let i = 0; i < 360; i++){ hitstop = 0; antiTimer = 99; dustTimer = 99; update(1 / 60); if(!boss) break; }
      return { lost: hp0 - (boss ? boss.hp : 0), parry: parryCount };
    });
    await ctx.close();
    assert(r.lost === 2, 'un relâché doit coûter 2 PV (onde + écho), pas plus : ' + JSON.stringify(r));
    assert(!errors.length, errors.join('\n'));
  });

  await test('PV des boss (+1 en 0.12.2) et Nuée : un éclat par PV', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { profile: PLAYER });
    const r = await page.evaluate(() => {
      startGame('classic', false); entities.length = 0;
      const hp = {};
      bossesKilled = 1;                                   // hors premier boss (le tout premier a 1 PV de moins)
      for(const id of ['consumer', 'swarm', 'eye']){ boss = null; entities.length = 0; spawnBossByName(id); hp[id] = boss.maxHp; }
      boss = null; entities.length = 0; spawnBossByName('swarm');
      const shards = boss.parts.length;
      for(const p of boss.parts.slice()){                 // détruit chaque éclat comme le fait une onde
        damageBoss(1, p.x, p.y); if(!boss) break;
        boss.parts = boss.parts.filter(q => q !== p); if(boss.parts.length === 0) killBoss();
      }
      const swarmDead = boss === null;
      boss = null; entities.length = 0; bossesKilled = 0; spawnBossByName('consumer');
      return { hp, shards, swarmDead, firstConsumer: boss.maxHp };
    });
    await ctx.close();
    assert(JSON.stringify(r.hp) === JSON.stringify({ consumer: 4, swarm: 6, eye: 5 }), 'PV : ' + JSON.stringify(r.hp));
    assert(r.shards === 6 && r.swarmDead, 'Nuée : ' + r.shards + ' éclats, morte : ' + r.swarmDead);
    assert(r.firstConsumer === 3, 'premier Consommateur du mode classique : ' + r.firstConsumer + ' PV');
    assert(!errors.length, errors.join('\n'));
  });

  /* Téléphone : une antimatière lancée depuis le bord le plus proche doit laisser autant
     de temps qu'au plus proche bord d'un ordinateur (axe vertical en 1366×768). */
  const impactTime = async (vp, axis) => {
    const { page, ctx, errors } = await open('index.html?nogl', { viewport: vp, profile: PLAYER });
    const t = await page.evaluate(axis => {
      startGame('classic', false); entities.length = 0; lives = 99; maxLivesRun = 99;
      const x = axis === 'x' ? bh.x + W / 2 + 55 : bh.x, y = axis === 'y' ? bh.y - H / 2 - 55 : bh.y;
      const ux = Math.sign(bh.x - x), uy = Math.sign(bh.y - y);
      entities.push({ x, y, vx: ux * 37 * PHYS, vy: uy * 37 * PHYS, r: R_ANTI, type: 'anti', phase: 0, trail: [] });
      attract = true;                                     // le cas le plus dur : on aspire
      let t = 0;
      while(runHits === 0 && t < 20){ antiTimer = 99; dustTimer = 99; hitstop = 0; update(1 / 60); t += 1 / 60; }
      return t;
    }, axis);
    await ctx.close();
    assert(!errors.length, errors.join('\n'));
    return t;
  };
  await test('Téléphone : même temps de réaction que sur ordinateur', async () => {
    const desk = await impactTime({ width: 1366, height: 768 }, 'y');
    const phone = await impactTime({ width: 390, height: 844 }, 'x');
    const small = await impactTime({ width: 360, height: 640 }, 'x');
    const r = 'ordinateur ' + desk.toFixed(2) + ' s, téléphone ' + phone.toFixed(2) + ' s, petit tél. ' + small.toFixed(2) + ' s';
    assert(phone >= desk * 0.85 && small >= desk * 0.85, 'réaction trop courte sur téléphone : ' + r);
    return r;
  });

  await test('2 commandes au toucher : un doigt aspire, le bouton ONDE tire sans l\'interrompre', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { viewport: { width: 390, height: 844 }, profile: PLAYER, touch: true });
    await page.click('#btnPlay');
    const r = await page.evaluate(() => {
      const wave = document.getElementById('btnWave'), field = document.getElementById('c');
      const t = (id, el) => new Touch({ identifier: id, target: el, clientX: 100, clientY: 400 });
      const send = (type, el, changed, remaining) => el.dispatchEvent(new TouchEvent(type, { touches: remaining, changedTouches: [changed], bubbles: true, cancelable: true }));
      entities.length = 0; shockCharges = 3; shockwaves.length = 0;
      const f1 = t(1, field), f2 = t(2, wave), out = {};
      send('touchstart', field, f1, [f1]);                 out.hold = attract;
      send('touchstart', wave, f2, [f1, f2]);              out.afterWave = { waves: shockwaves.length, attract, charges: shockCharges };
      send('touchend', wave, f2, [f1]);                    out.afterWaveUp = { waves: shockwaves.length, attract };
      send('touchend', field, f1, []);                     out.afterHoldUp = { waves: shockwaves.length, attract };
      syncHUD(); out.label = document.getElementById('waveSub').textContent;
      return out;
    });
    await ctx.close();
    assert(r.hold, 'le doigt posé n\'aspire pas : ' + JSON.stringify(r));
    assert(r.afterWave.waves === 1 && r.afterWave.attract && r.afterWave.charges === 2, 'bouton ONDE : ' + JSON.stringify(r));
    assert(r.afterWaveUp.waves === 1 && r.afterWaveUp.attract, 'lever le doigt de ONDE a coupé l\'aspiration : ' + JSON.stringify(r));
    assert(r.afterHoldUp.waves === 1 && !r.afterHoldUp.attract, 'relâcher l\'aspiration ne doit plus tirer d\'onde : ' + JSON.stringify(r));
    assert(r.label === '2 charges', 'charges affichées : ' + r.label);
    assert(!errors.length, errors.join('\n'));
  });

  await test('2 commandes au clavier et à la souris (ESPACE / F, clic gauche / clic droit)', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { profile: PLAYER });
    await page.click('#btnPlay');
    await page.evaluate(() => { entities.length = 0; shockCharges = 3; shockwaves.length = 0; });
    const st = () => page.evaluate(() => ({ attract, waves: shockwaves.length }));
    const r = {};
    await page.keyboard.down('Space'); r.spaceDown = await st();
    await page.keyboard.press('KeyF'); r.f = await st();
    await page.keyboard.up('Space'); r.spaceUp = await st();
    await page.mouse.move(300, 300);
    await page.mouse.down(); r.leftDown = await st();
    await page.mouse.down({ button: 'right' }); await page.mouse.up({ button: 'right' }); r.right = await st();
    await page.mouse.up(); r.leftUp = await st();
    await ctx.close();
    const want = { spaceDown: { attract: true, waves: 0 }, f: { attract: true, waves: 1 }, spaceUp: { attract: false, waves: 1 },
      leftDown: { attract: true, waves: 1 }, right: { attract: true, waves: 2 }, leftUp: { attract: false, waves: 2 } };
    const diff = Object.keys(want).filter(k => JSON.stringify(want[k]) !== JSON.stringify(r[k])).map(k => k + ' : attendu ' + JSON.stringify(want[k]) + ', obtenu ' + JSON.stringify(r[k]));
    assert(!diff.length, diff.join('\n'));
    assert(!errors.length, errors.join('\n'));
  });

  await test('Option « 1 seul bouton » : ancien mode, textes et boutons adaptés', async () => {
    const { page, ctx } = await open('index.html?nogl', { viewport: { width: 390, height: 844 }, profile: PLAYER, touch: true });
    const before = await page.evaluate(() => ({ dual: document.body.classList.contains('ctrl-dual'), hint: hintEl.textContent, controls: profile.options.controls }));
    await page.click('#btnMenuOptions'); await page.click('#optSingle');
    const after = await page.evaluate(() => ({ dual: document.body.classList.contains('ctrl-dual'), hint: hintEl.textContent, controls: profile.options.controls,
      saved: JSON.parse(localStorage.getItem('goulu_profile_v10')).options.controls }));
    await page.keyboard.press('Escape'); await page.click('#btnPlay');
    const btnShown = await page.evaluate(() => document.getElementById('btnWave').getBoundingClientRect().width > 0);
    await ctx.close();
    assert(before.dual && before.controls === 'dual' && /onde/i.test(before.hint), 'par défaut : ' + JSON.stringify(before));
    assert(!after.dual && after.controls === 'single' && after.saved === 'single' && /Relâche/.test(after.hint), 'après option : ' + JSON.stringify(after));
    assert(!btnShown, 'le bouton ONDE reste affiché en mode 1 bouton');
  });

  await test('1 bouton (ancien mode) au toucher : l\'onde ne part qu\'au lever du dernier doigt', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { viewport: { width: 390, height: 844 }, profile: { tutorialDone: true, options: { controls: 'single' } }, touch: true });
    await page.click('#btnPlay');
    const r = await page.evaluate(() => {
      const touch = id => new Touch({ identifier: id, target: document.body, clientX: 100, clientY: 700 });
      const fire = (type, remaining) => window.dispatchEvent(new TouchEvent(type, { touches: remaining.map(touch), changedTouches: [touch(9)], cancelable: true }));
      entities.length = 0; shockCharges = 3; shockwaves.length = 0; attract = true;
      fire('touchend', [1]);                              // un 2e doigt se lève, le 1er maintient encore
      const afterSecond = { waves: shockwaves.length, attract };
      fire('touchend', []);                               // le dernier doigt se lève : onde
      const afterLast = shockwaves.length;
      attract = true; fire('touchcancel', []);            // interruption système : pas d'onde
      return { afterSecond, afterLast, afterCancel: shockwaves.length, attractAfterCancel: attract };
    });
    await ctx.close();
    assert(r.afterSecond.waves === 0 && r.afterSecond.attract, 'onde tirée par un 2e doigt : ' + JSON.stringify(r));
    assert(r.afterLast === 1, 'pas d\'onde au lever du dernier doigt : ' + JSON.stringify(r));
    assert(r.afterCancel === 1 && !r.attractAfterCancel, 'touchcancel mal géré : ' + JSON.stringify(r));
    assert(!errors.length, errors.join('\n'));
  });

  await test('Petit écran : entités dessinées plus grandes, boutons de 44 px au toucher', async () => {
    const { page, ctx } = await open('index.html?nogl', { viewport: { width: 390, height: 844 }, profile: PLAYER, touch: true });
    await page.click('#btnPlay');
    const r = await page.evaluate(() => ({ vis: VIS_SCALE, phys: PHYS, touch: document.body.classList.contains('touch'),
      btn: Math.round(document.getElementById('pauseBtn').getBoundingClientRect().width) }));
    await ctx.close();
    const d = await open('index.html?nogl', { profile: PLAYER });
    const desk = await d.page.evaluate(() => ({ vis: VIS_SCALE, phys: PHYS }));
    await d.ctx.close();
    assert(r.vis > 1.2 && r.phys < 0.6 && r.touch && r.btn === 44, 'téléphone : ' + JSON.stringify(r));
    assert(desk.vis === 1 && desk.phys === 1, 'ordinateur modifié : ' + JSON.stringify(desk));
    return 'téléphone : dessin ×' + r.vis.toFixed(2) + ', vitesses ×' + r.phys.toFixed(2);
  });

  /* ---------- 0.14 : progression de compte, seconde chance, relance, boss enragé ---------- */
  await test('Combo Long : la fenêtre de combo s\'allonge vraiment', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { profile: { tutorialDone: true, upgrades: { app4: true } } });
    await page.click('#btnPlay');
    const r = await page.evaluate(() => { entities.length = 0; collectDust({ dustType: 'gold', x: bh.x, y: bh.y }); return { t: comboTimer, base: PARRY_CHAIN_WINDOW * 1.2 }; });
    await ctx.close();
    assert(Math.abs(r.t - (r.base + 0.6)) < 1e-9, 'fenêtre ' + r.t + ' au lieu de ' + (r.base + 0.6));
    assert(!errors.length, errors.join('\n'));
  });

  const die = page => page.evaluate(() => { lives = 1; invincibleT = 0; hurtT = 0; hitAnti({ x: bh.x + 5, y: bh.y }); return state; });

  await test('XP à chaque partie, niveau → shard, bonus du jour une seule fois', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { profile: PLAYER });
    const run = () => page.evaluate(() => {
      profile.quests.picked = ['__aucune'];               // les quêtes du jour donnent aussi des shards : on les écarte
      startGame('classic', false); entities.length = 0; reviveUsed = true;
      elapsed = 60; runDust = 20; parryCount = 5; score = 3000;
      lives = 1; invincibleT = 0; hurtT = 0; hitAnti({ x: bh.x + 5, y: bh.y });
      return { state, gained: lastXp.gained, bonus: lastXp.bonus, level: profile.level, xp: profile.xp, shards: lastXp.shards,
        box: !document.getElementById('xpBox').classList.contains('hidden'), next: document.getElementById('xpNext').textContent };
    });
    const a = await run(), b = await run();
    await ctx.close();
    /* 60 (survie) + 10 (poussières) + 15 (parry) + 30 (masse) = 115, doublé la 1re fois */
    assert(a.state === 'over' && a.gained === 230 && a.bonus && a.level === 2 && a.xp === 130 && a.shards === 1, '1re partie : ' + JSON.stringify(a));
    assert(b.gained === 115 && !b.bonus && b.level === 3 && b.xp === 110 && b.shards === 1, '2e partie : ' + JSON.stringify(b));
    assert(a.box && a.next.length > 0, 'bloc XP / prochain objectif absent : ' + JSON.stringify(a));
    assert(!errors.length, errors.join('\n'));
    return 'niveau ' + b.level + ' après 2 parties';
  });

  await test('Seconde chance : une fois par partie, contre un shard, jamais au défi', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { profile: { tutorialDone: true, shards: 3 } });
    await page.click('#btnPlay');
    await page.evaluate(() => { profile.quests.picked = ['__aucune']; });
    const early = await page.evaluate(() => { elapsed = 5; lives = 1; invincibleT = 0; hurtT = 0; hitAnti({ x: bh.x + 5, y: bh.y }); return state; });
    await page.evaluate(() => { startGame('classic', false); elapsed = 20; });
    const s1 = await die(page);
    await page.click('#btnRevive');
    const after = await page.evaluate(() => ({ state, lives, shards: profile.shards, inv: invincibleT > 2, charges: shockCharges === getMaxCharges() }));
    const s2 = await die(page);
    await page.evaluate(() => { startGame('classic', false); elapsed = 20; });
    const s3 = await die(page);
    const declined = await page.evaluate(() => { const before = profile.shards; tickRevive(REVIVE_TIME + 0.1); return { state, spent: before + lastXp.shards - profile.shards }; });
    const daily = await page.evaluate(() => { lastGameWasDaily = true; startGame('classic', true); elapsed = 20; lives = 1; invincibleT = 0; hurtT = 0; hitAnti({ x: bh.x + 5, y: bh.y }); return state; });
    await ctx.close();
    assert(early === 'over', 'proposée avant ' + 15 + ' s : ' + early);
    assert(s1 === 'revive', 'pas de seconde chance proposée : ' + s1);
    assert(after.state === 'play' && after.lives === 2 && after.shards === 2 && after.inv && after.charges, 'après renaissance : ' + JSON.stringify(after));
    assert(s2 === 'over', 'deuxième seconde chance dans la même partie : ' + s2);
    assert(s3 === 'revive' && declined.state === 'over' && declined.spent === 0, 'refus / délai : ' + JSON.stringify({ s3, declined }));
    assert(daily === 'over', 'seconde chance au défi du jour : ' + daily);
    assert(!errors.length, errors.join('\n'));
  });

  await test('Anomalies : une relance de cartes par partie', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { profile: PLAYER });
    await page.click('#btnPlay');
    await page.evaluate(() => openAnomalyScreen());
    await page.click('#btnReroll');
    const r = await page.evaluate(() => ({ state, left: rerollsLeft, cards: document.querySelectorAll('#anomCards .card').length, disabled: document.getElementById('btnReroll').disabled }));
    await page.evaluate(() => rerollAnomalies());
    const again = await page.evaluate(() => rerollsLeft);
    await page.click('#anomCards .card');
    const st = await page.evaluate(() => ({ state, n: activeAnomalies.length }));
    await page.evaluate(() => { startGame('classic', false); });
    const reset = await page.evaluate(() => rerollsLeft);
    await ctx.close();
    assert(r.state === 'anomaly' && r.left === 0 && r.cards >= 1 && r.disabled, JSON.stringify(r));
    assert(again === 0 && st.state === 'play' && st.n === 1 && reset === 1, JSON.stringify({ again, st, reset }));
    assert(!errors.length, errors.join('\n'));
  });

  await test('Boss enragé à mi-vie (l\'Œil tire 3 projectiles)', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { profile: PLAYER });
    const r = await page.evaluate(() => {
      startGame('classic', false); entities.length = 0; bossesKilled = 1; lives = 99;
      spawnBossByName('consumer');
      damageBoss(1, 0, 0); const at3 = boss.enraged;
      damageBoss(1, 0, 0); const at2 = boss.enraged;
      boss = null; entities.length = 0; spawnBossByName('eye'); boss.enraged = true;
      boss.parts[0].shootTimer = 0; hitstop = 0; antiTimer = 99; dustTimer = 99; update(1 / 60);
      return { at3: !!at3, at2: !!at2, shots: entities.filter(e => e.isProjectile).length };
    });
    await ctx.close();
    assert(!r.at3 && r.at2, 'Consommateur 4 PV : enragé à 2 PV attendu : ' + JSON.stringify(r));
    assert(r.shots === 3, 'tirs de l\'Œil enragé : ' + r.shots);
    assert(!errors.length, errors.join('\n'));
  });

  await test('Série de jours : 3e jour récompensé d\'un shard', async () => {
    const { page, ctx, errors } = await open('index.html?nogl', { profile: PLAYER });
    const r = await page.evaluate(() => {
      profile.streak = { current: 2, lastDate: yesterdayStr(), best: 2 }; profile.shards = 0;
      updateStreakOnPlay(); const a = { streak: profile.streak.current, shards: profile.shards };
      updateStreakOnPlay(); return { a, again: profile.shards };   // 2e partie du même jour : rien de plus
    });
    await ctx.close();
    assert(r.a.streak === 3 && r.a.shards === 1 && r.again === 1, JSON.stringify(r));
    assert(!errors.length, errors.join('\n'));
  });

  /* Simulation accélérée : aspiration / relâche en boucle, choix automatique des anomalies,
     vies remises à flot pour couvrir vagues, boss et fin de niveau sans dépendre du rendu. */
  const SIMS = [
    ['classic', 150], ['chaos', 90], ['pacifist', 90], ['metronome', 90], ['blitz', 40], ['campagne 9', 95], ['défi du jour', 60]
  ];
  for(const [mode, seconds] of SIMS){
    await test('Simulation ' + seconds + ' s : ' + mode, async () => {
      const { page, ctx, errors } = await open('index.html?nogl', { profile: { tutorialDone: true, campaign: { unlocked: 10, completed: {} } } });
      const r = await page.evaluate(({ mode, seconds }) => {
        Math.random = mulberry32(hashSeed('smoke-' + mode));   // hasard fixé (seul le calage rythmique dépend de l'horloge)
        if(mode === 'campagne 9') startCampaignLevel(9);
        else if(mode === 'défi du jour'){ lastGameWasDaily = true; startGame('classic', true); }
        else startGame(mode, false);
        const seen = new Set();
        /* le temps de jeu ralentit pendant les parry / gels : on simule jusqu'au temps visé */
        const maxSteps = Math.round(seconds * 60 * 4);
        for(let i = 0; i < maxSteps && elapsed < seconds; i++){
          if(state === 'anomaly'){ const c = document.querySelector('#anomCards .card'); if(c) c.click(); }
          if(state !== 'play') break;
          const holding = (i % 80) < 50;
          if(holding && !attract) attract = true;
          if(!holding && attract){ attract = false; fireWave(); }
          if(lives < 2){ lives = 3; hurtT = 0; }
          update(1 / 60);
          if(boss) seen.add(boss.type.id);
          if(!Number.isInteger(score)) return { err: 'score non entier : ' + score };
        }
        syncHUD();
        return { state, score, elapsed: Math.round(elapsed), wave: waveIndex + 1, bosses: [...seen].join('+') || '—', anomalies: activeAnomalies.length };
      }, { mode, seconds });
      await ctx.close();
      assert(!r.err, r.err);
      assert(!errors.length, errors.join('\n'));
      if(mode === 'campagne 9') assert(r.state === 'campdone', 'niveau 9 non terminé : ' + JSON.stringify(r));
      if(mode === 'blitz') assert(r.state === 'over', 'le chrono Blitz ne termine pas la partie : ' + r.state);
      return r.state + ', ' + r.elapsed + ' s, score ' + r.score + ', vague ' + r.wave + ', boss ' + r.bosses + ', anomalies ' + r.anomalies;
    });
  }

  await browser.close();
  srv.close();
  const failed = results.filter(r => !r.ok).length;
  console.log('\n' + (results.length - failed) + ' / ' + results.length + ' tests réussis');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
