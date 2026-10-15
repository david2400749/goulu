/* =========================================================
   GOULU — canvas, caméra et dimensions
   ---------------------------------------------------------
   #gl  : WebGL2 (ciel, trou noir, lentille, post-traitement)
   #c   : overlay 2D transparent (repères en monde, non déformés)
   sceneCanvas : couche hors-écran (entités) déformée par la lentille
   ========================================================= */
const glCanvas = document.getElementById('gl');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const sceneCanvas = document.createElement('canvas');
const sctx = sceneCanvas.getContext('2d');
let W = 0, H = 0, DPR = 1, sceneScale = 1, glScale = 1;
let glQuality = 1;                       // 1 = plein ; réduit si la machine peine
let useGL = false;

/* Trou noir : coordonnées logiques (collisions) */
const bh = { x:0, y:0, r:20, rTarget:20, ringT:0, diskT:0 };

/* Caméra cinématique : décalage et zoom visuels (menu → partie) */
const cam = { menu:1, menuTarget:1, dx:0, dy:0, zoom:1 };
function menuLayout(){
  const wide = W > H * 1.1;
  const zoom = Math.max(1.45, Math.min(2.7, Math.min(W, H) * 0.0046));
  return wide
    ? { dx: W * 0.17, dy: 0, zoom }
    : { dx: 0, dy: -H * 0.215, zoom: Math.max(1.3, Math.min(zoom, W * 0.0052)) };
}
function updateCamera(dt){
  cam.menu += (cam.menuTarget - cam.menu) * Math.min(1, dt * 2.6);
  if(Math.abs(cam.menuTarget - cam.menu) < 0.0008) cam.menu = cam.menuTarget;
  const m = menuLayout(), e = cam.menu;
  cam.dx = m.dx * e; cam.dy = m.dy * e;
  cam.zoom = 1 + (m.zoom - 1) * e;
}

function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  sceneScale = Math.min(DPR, 1.25);
  sceneCanvas.width = Math.max(2, Math.floor(W * sceneScale));
  sceneCanvas.height = Math.max(2, Math.floor(H * sceneScale));
  glScale = Math.min(DPR, 1.25) * glQuality;
  glCanvas.width = Math.max(2, Math.floor(W * glScale));
  glCanvas.height = Math.max(2, Math.floor(H * glScale));
  glCanvas.style.width = W + 'px'; glCanvas.style.height = H + 'px';
  bh.x = W / 2; bh.y = H / 2;
  if(typeof makeFallbackBg === 'function') makeFallbackBg();
  try{ drawSpark(); drawGhostCanvas(); }catch(e){}
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

/* Qualité adaptative : on règle la résolution GL sur le temps GPU réellement mesuré
   (requête de timing quand disponible, sinon cadence des images en dernier recours). */
const perf = { acc:0, n:0, cool:2 };
function perfSample(dt){
  if(!useGL) return;
  if(perf.cool > 0){ perf.cool -= dt; return; }
  if(SpaceGL.hasTimer){
    const ms = SpaceGL.gpuMs;
    if(!ms) return;
    if(ms > 11 && glQuality > 0.5){ glQuality = Math.max(0.5, +(glQuality - 0.1).toFixed(2)); perf.cool = 1.2; resize(); }
    else if(glQuality < 1){
      const up = Math.min(1, glQuality + 0.1);
      if(ms * (up * up) / (glQuality * glQuality) < 8.5){ glQuality = +up.toFixed(2); perf.cool = 4; resize(); }
    }
    return;
  }
  perf.acc += dt; perf.n++;
  if(perf.n >= 60){
    const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
    if(avg > 0.04 && glQuality > 0.5){ glQuality = Math.max(0.5, +(glQuality - 0.1).toFixed(2)); perf.cool = 2; resize(); }
  }
}
