/* =========================================================
   GOULU — boucle principale
   ========================================================= */
useGL = !/[?&]nogl/.test(location.search) && SpaceGL.init(glCanvas);
if(!useGL){ glCanvas.style.display = 'none'; canvas.style.background = '#010103'; }
resize();

function compositeClipFrame(){
  if(!clipRecorderActive || !clipCtx) return;
  clipCtx.clearRect(0, 0, clipCanvas.width, clipCanvas.height);
  if(useGL) clipCtx.drawImage(glCanvas, 0, 0, clipCanvas.width, clipCanvas.height);
  clipCtx.drawImage(canvas, 0, 0, clipCanvas.width, clipCanvas.height);
}

let lastT = performance.now();
function loop(now){
  let dt = (now - lastT) / 1000; lastT = now;
  if(dt > 0.05) dt = 0.05;
  updateCamera(dt);
  perfSample(dt);
  if(state === 'anomaly' || state === 'paused'){
    /* jeu gelé : le décor continue de vivre */
  } else if(state === 'tutorial'){
    updateTutorial(dt);
  } else {
    musicTick(dt);
    update(dt);
    if(state === 'play' || state === 'over' || state === 'finale'){
      syncHUD();
      if(state === 'play' && (frameN++ % 30 === 0)) drawGhostCanvas();
    }
  }
  renderFrame(dt);
  compositeClipFrame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
