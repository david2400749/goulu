/* =========================================================
   GOULU — Rendu spatial WebGL2
   ---------------------------------------------------------
   • Ciel profond : nébuleuse + Voie lactée cuites une fois en texture,
     étoiles procédurales (3 couches) évaluées par pixel.
   • Trou noir de Schwarzschild : chaque pixel proche du trou intègre la
     géodésique lumineuse  u'' + u = 3/2 u²  (u = Rs/r) dans son plan orbital.
       - ombre (horizon capturé, b < 3√3/2 Rs) et anneau de photons
       - disque d'accrétion mince traversé jusqu'à 3 fois (images primaire,
         secondaire et tertiaire = l'arche au-dessus et sous l'ombre)
       - décalage Doppler + redshift gravitationnel, couleur corps noir
     Loin du trou : déflexion analytique (série en 1/b).
       - zone de plongée sous l'ISCO (3 Rs) : le gaz quitte le disque et
         tombe en spirale, de plus en plus rougi et éteint vers l'horizon
       - point chaud en orbite près de l'ISCO (comme les sursauts de Sgr A*)
       - entraînement du référentiel (Lense-Thirring) : le ciel lentillé est
         tordu autour du trou, d'autant plus qu'on aspire
       - accrétion de Bondi : gaz interstellaire qui spirale vers le trou,
         chauffé (T ∝ r^-3/4) puis rougi par le redshift gravitationnel
   • La couche 2D du jeu (poussières, antimatière, boss) est déformée par
     la même lentille puis composée.
   • Post-traitement : bloom 2 niveaux, aberration chromatique, tone
     mapping filmique, vignette, grain.
   ========================================================= */
const SpaceGL = (() => {
  let gl = null, ok = false, hdr = false;
  let fbW = 0, fbH = 0;
  let quadBuf = null, vao = null;
  const P = {};               // programmes
  let texSky = null, texScene = null;
  let fboMain = null, fboA = null, fboB = null, fboC = null, fboD = null;
  let skyFbo = null, skyOrg = [0,0], skySize = [1,1], skyDirty = true, frameNo = 0;
  let timerExt = null, pendingQ = null, gpuMs = 0;

  /* ---------- GLSL communs ---------- */
  const NOISE = `
float hash11(float p){ p = fract(p*.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float hash31(vec3 p3){ p3 = fract(p3*.1031); p3 += dot(p3, p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
vec3 hash33(vec3 p3){ p3 = fract(p3*vec3(.1031,.1030,.0973)); p3 += dot(p3, p3.yxz+33.33); return fract((p3.xxy+p3.yxx)*p3.zyx); }
float vnoise2(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y);
}
float vnoise3(vec3 p){
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  float a=hash31(i), b=hash31(i+vec3(1,0,0)), c=hash31(i+vec3(0,1,0)), d=hash31(i+vec3(1,1,0));
  float e=hash31(i+vec3(0,0,1)), g=hash31(i+vec3(1,0,1)), h=hash31(i+vec3(0,1,1)), k=hash31(i+vec3(1,1,1));
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h,k,f.x),f.y), f.z);
}
float fbm2(vec2 p){
  float s=0., a=.5;
  for(int i=0;i<3;i++){ s+=a*vnoise2(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; }
  return s;
}
float fbm3(vec3 p){
  float s=0., a=.5;
  for(int i=0;i<6;i++){ s+=a*vnoise3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; }
  return s;
}
vec3 blackbody(float K){
  float t = clamp(K, 1000., 40000.)/100.;
  vec3 c;
  c.r = t<=66. ? 1. : clamp(1.292936186*pow(t-60.,-0.1332047592),0.,1.);
  c.g = t<=66. ? clamp(0.3900815788*log(t)-0.6318414438,0.,1.) : clamp(1.129890861*pow(t-60.,-0.0755148492),0.,1.);
  c.b = t>=66. ? 1. : (t<=19. ? 0. : clamp(0.5432067891*log(t-10.)-1.19625408914,0.,1.));
  return c;
}
`;

  const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*.5+.5; gl_Position = vec4(aPos,0.,1.); }`;

  /* ---------- cuisson de la nébuleuse (equirectangulaire) ---------- */
  const FRAG_SKY = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 oCol;
${NOISE}
void main(){
  float lon = (vUv.x-.5)*6.2831853;
  float lat = (vUv.y-.5)*3.1415927;
  vec3 d = vec3(cos(lat)*sin(lon), sin(lat), -cos(lat)*cos(lon));

  /* Voie lactée : grand cercle incliné, bande de poussière + lueur stellaire */
  vec3 axis = normalize(vec3(.30,.86,.40));
  float band = dot(d, axis);
  float w = exp(-band*band*26.);
  float patch_ = fbm3(d*3.2+4.0);
  float fine = fbm3(d*14.0+9.0);
  float lanes = fbm3(d*4.0+21.0);
  float glow = w*(0.35+0.9*patch_)*(1.0-0.28*lanes);
  vec3 mw = mix(vec3(.62,.46,.34), vec3(.55,.66,.95), patch_)*glow*0.085;
  mw += vec3(.95,.85,.75)*w*fine*fine*fine*0.16;                      /* grain d'étoiles non résolues */

  /* Nuages colorés lointains, très discrets */
  float n1 = fbm3(d*1.5+vec3(3.1,1.2,7.7));
  float n2 = fbm3(d*2.6+n1*1.6+vec3(11.7,4.4,2.1));
  float n3 = fbm3(d*1.1+vec3(40.,3.,9.));
  vec3 neb = vec3(.07,.16,.42)*pow(smoothstep(.38,.9,n1),2.0)
           + vec3(.40,.09,.30)*pow(smoothstep(.45,.95,n2),2.2)
           + vec3(.40,.20,.07)*pow(smoothstep(.5,.95,n3),2.4)*0.8;
  neb *= 0.21;

  /* galaxies lointaines : petites taches elliptiques, bulbe doré et disque bleuté */
  vec3 gal = vec3(0.);
  for(int k=0;k<2;k++){
    float sc = k==0 ? 6.5 : 11.;
    vec3 q = d*sc + float(k)*17.3;
    vec3 id = floor(q), f = fract(q);
    vec3 h = hash33(id+5.1);
    if(h.x < .085){
      vec3 c = .25+.5*hash33(id+2.7);
      vec3 v = f-c;
      vec3 ax = normalize(hash33(id+9.4)-.5);
      float along = dot(v,ax);
      float sz = (k==0 ? .055 : .035)*(.6+.8*h.y);
      float e2 = dot(v,v) + 5.5*h.z*along*along;
      float disk = exp(-e2/(sz*sz)*1.4);
      float bulge = exp(-dot(v,v)/(sz*sz)*9.);
      gal += vec3(.55,.68,1.)*disk*.10 + vec3(1.,.82,.55)*bulge*.30;
    }
  }

  vec3 col = mw + neb + gal + vec3(.0012,.0015,.0032);
  oCol = vec4(col,1.);
}`;


  /* ---------- bibliothèque du ciel (partagée par la cuisson d'écran et le repli direct) ---------- */
  const SKYLIB = `
vec3 starLayer(vec3 d, float sc, float seed, float prob, float px, float gain, float halo){
  vec3 q = d*sc; vec3 id = floor(q); vec3 f = fract(q);
  vec3 h = hash33(id+seed);
  if(h.x > prob) return vec3(0.);
  vec3 pos = .2+.6*hash33(id+seed+7.3);
  float dist = length(f-pos);
  float mag = hash31(id+seed+3.7);
  float r = max(px*.85, .9*uPxCss)*sc/uFocal*(.6+.9*mag);
  float core = smoothstep(r, 0., dist);
  float g = core*core;
  g += halo*exp(-dist*dist/(r*r*5.+1e-6))*.06;
  vec3 c = blackbody(mix(3000., 13000., hash31(id*1.7+seed)));
  c = mix(c, vec3(1.), .35);
  float tw = .88+.12*sin(uTime*(1.2+3.*h.y)+6.28*h.z);
  float bright = .30 + 3.2*mag*mag*mag;
  return c*g*bright*gain*tw;
}
vec3 skyEval(vec3 d){
  vec2 uv = vec2(atan(d.x,-d.z)/6.2831853+.5, asin(clamp(d.y,-1.,1.))/3.1415927+.5);
  vec3 neb = texture(uSky, uv).rgb*uTint;
  neb *= .8 + .45*vnoise3(d*70.);
  vec3 st = starLayer(d,  13., 0.,  .30, 1.5, 3.0, 1.)
          + starLayer(d,  46., 31., .34, 0.95, 1.5, 0.)
          + starLayer(d, 105., 77., .20, 0.80, .9, 0.)
          + starLayer(d, 230., 13., .10, 0.70, .6, 0.);
  return neb + st*uStarGain;
}
`;

  /* ---------- cuisson du ciel à la résolution de l'écran (rafraîchie ~7 Hz pour le scintillement) ---------- */
  const FRAG_SKYBUF = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 oCol;
${NOISE}
uniform vec2 uCss, uSkyOrg, uSkySize;
uniform float uFocal, uTime, uPxCss, uStarGain;
uniform vec3 uTint;
uniform sampler2D uSky;
${SKYLIB}
void main(){
  vec2 pc = uSkyOrg + vec2(vUv.x, 1.-vUv.y)*uSkySize;
  vec3 d = normalize(vec3((pc.x-uCss.x*.5)/uFocal, -(pc.y-uCss.y*.5)/uFocal, -1.));
  oCol = vec4(skyEval(d), 1.);
}`;

  /* ---------- passe principale : lentille, disque, ciel, scène ---------- */
  const FRAG_MAIN = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 oCol;
${NOISE}
uniform vec2  uCss;        /* taille en px CSS */
uniform vec2  uCenter;     /* centre du trou, px CSS, origine en haut à gauche */
uniform vec2  uShake;
uniform float uK;          /* px CSS par rayon de Schwarzschild */
uniform float uFocal;
uniform float uTime, uSpin;
uniform vec2  uDrift;
uniform float uTilt, uRoll;
uniform float uGlow, uTemp, uBeam;
uniform float uHue, uSat;
uniform float uLens, uSceneLens;
uniform float uSceneOn, uSceneGain;
uniform float uStarGain;
uniform float uQuality;
uniform float uInflow, uTwist, uHot;
uniform vec3  uTint;
uniform vec4  uRip[4];
uniform sampler2D uSky, uScene;

const float PI = 3.14159265;
const float RIN = 3.0;
const float ROUT = 12.5;
const float BC = 2.598076;
const float BMAX = 15.5;

float alphaSeries(float b){ float ib = 1./b; return ib*(2.0 + ib*(2.9452 + ib*5.3333)); }

vec3 hueRot(vec3 c, float a){
  vec3 k = vec3(.57735);
  float cs = cos(a), sn = sin(a);
  return c*cs + cross(k,c)*sn + k*dot(k,c)*(1.-cs);
}

uniform sampler2D uSkyBuf;
uniform vec2 uSkyOrg, uSkySize;
uniform float uPxCss;
${SKYLIB}
vec3 skyAt(vec2 pa){
  vec2 uv = (pa-uSkyOrg)/uSkySize;
  if(uv.x>.002 && uv.x<.998 && uv.y>.002 && uv.y<.998) return texture(uSkyBuf, vec2(uv.x, 1.-uv.y)).rgb;
  vec3 d = normalize(vec3((pa.x-uCss.x*.5)/uFocal, -(pa.y-uCss.y*.5)/uFocal, -1.));
  return skyEval(d);
}

/* ---- bruit du disque, advecté en deux phases pour éviter l'enroulement ---- */
float diskNoise(vec2 q, float r){
  float cyc = 18.;
  float om = 2.3*pow(r, -1.5);
  float pa = fract(uSpin/cyc), pb = fract(uSpin/cyc+.5);
  float wa = 1.-abs(2.*pa-1.), wb = 1.-abs(2.*pb-1.);
  float aa = om*pa*cyc, ab = om*pb*cyc;
  vec2 qa = mat2(cos(aa),-sin(aa),sin(aa),cos(aa))*q;
  vec2 qb = mat2(cos(ab),-sin(ab),sin(ab),cos(ab))*q;
  float res = 0.;
  if(wa > .03) res += wa*(fbm2(qa*1.15)*.78 + vnoise2(qa*4.3)*.22);
  if(wb > .03) res += wb*(fbm2(qb*1.15+7.3)*.78 + vnoise2(qb*4.3+3.1)*.22);
  return res/max(wa*step(.03,wa)+wb*step(.03,wb), .03);
}

/* Un point du disque vu par le rayon : renvoie (rgb émis, opacité) */
vec4 diskShade(float r, float uc, float vc, float phic, vec3 bn3, vec3 N, vec3 e1, vec3 e2){
  vec3 ez = vec3(0.,0.,1.);
  float cp = cos(phic), sp = sin(phic);
  vec3 er = cp*ez + sp*bn3;
  vec3 ep = -sp*ez + cp*bn3;
  vec3 P = r*er;
  float f = max(1.-uc, .02);
  float rp = -vc/(uc*uc);
  vec2 nl = normalize(vec2(rp/sqrt(f), r));
  vec3 nback = nl.x*er + nl.y*ep;
  vec3 tdir = normalize(cross(N, er));
  float vel = min(sqrt(.5/max(r-1.,.05)), .78);
  float gam = inversesqrt(1.-vel*vel);
  float dop = 1./(gam*(1.+vel*dot(tdir, nback)));
  float g = sqrt(f)*dop;

  vec2 q = vec2(dot(P,e1), dot(P,e2));
  float n = diskNoise(q, r);

  /* sous l'ISCO, plus d'orbite stable : le gaz plonge en spirale vers l'horizon */
  float plunge = 1.-step(RIN, r);
  float xin = clamp((r-1.)/(RIN-1.), 0., 1.);
  float ang = atan(q.y, q.x);
  float spiral = .5+.5*sin(2.*ang + 7.*log(r) + uSpin*.9 + n*3.);
  float tIn = min(RIN/r, 1.);
  float edgeIn  = mix(smoothstep(RIN-.25, RIN+.45, r), .34*smoothstep(1.1, RIN, r)*(.3+.7*spiral), plunge);
  float edgeOut = 1.-smoothstep(ROUT-4.5, ROUT, r);
  float edge = edgeIn*edgeOut;

  float lanes = .5+.5*sin(r*6.5 + n*7.);
  float dens = .42 + .95*n;
  dens *= .78 + .22*lanes;
  dens = clamp(dens, .12, 1.7);

  /* point chaud en orbite képlérienne près de l'ISCO (sursaut) */
  float omh = 2.3*pow(RIN+1.3, -1.5);
  float ah = -omh*uSpin;
  vec2 hp = (RIN+1.3)*vec2(cos(ah), sin(ah));
  float hot = uHot*exp(-dot(q-hp,q-hp)/.55)*(1.-plunge);

  float Te = uTemp*pow(tIn, .60)*(1.+.25*plunge*(1.-xin))*(1.+.35*hot);
  float Tobs = Te*g;
  vec3 col = blackbody(Tobs);
  float Iem = mix(pow(tIn, 2.1)*(1.+2.3*exp(-(r-RIN)*1.7)), 3.3*pow(xin, 1.5), plunge)*(1.+2.6*hot);
  float lum = Iem*pow(g, uBeam)*dens*uGlow*3.6;
  col = hueRot(col, uHue);
  float l = dot(col, vec3(.299,.587,.114));
  col = mix(vec3(l), col, uSat);
  float opa = clamp(edge*(.55+.5*dens), 0., .96);
  return vec4(col*lum, opa);
}

/* ---- intégration de la géodésique pour un pixel proche du trou ---- */
void traceRay(vec2 bv, out float alpha, out vec3 dcol, out float dtrans, out float rim){
  float b = length(bv);
  dcol = vec3(0.); dtrans = 1.; rim = 0.;
  if(b > BMAX){ alpha = alphaSeries(b); return; }
  vec2 bn = bv/max(b,1e-4);
  vec3 bn3 = vec3(bn, 0.);
  vec2 nlat = vec2(-sin(uRoll), cos(uRoll));
  float si = sin(uTilt), ci = cos(uTilt);
  vec3 N = vec3(si*nlat, ci);
  vec3 e1 = normalize(vec3(nlat.y, -nlat.x, 0.));
  vec3 e2 = cross(N, e1);
  float B2 = si*dot(bn, nlat);
  float phi0 = mod(atan(-ci, B2), PI);

  float aest = (b > 3.6) ? alphaSeries(b) : 5.6;
  float phiEnd = min(3.*PI, PI + aest*1.12 + .28);
  float nsF = floor((b > 7.5 ? 60. : 112.)*uQuality);
  int ns = int(nsF);
  float h = phiEnd/nsF;
  float u = 0., v = 1./b, phi = 0.;
  int cidx = 0; float cphi = phi0;
  float alphaOut = 6.0;
  bool escaped = false;
  for(int s=0; s<112; s++){
    if(s >= ns) break;
    if(dtrans < .03) break;
    float a1 = -u + 1.5*u*u;
    float um = u + .5*h*v;
    float vm = v + .5*h*a1;
    float un = u + h*vm;
    float vn = v + h*(-um + 1.5*um*um);
    float pn = phi + h;
    if(cidx < 3 && pn >= cphi){
      float t = clamp((cphi-phi)/h, 0., 1.);
      float uc = mix(u, un, t);
      float vc = mix(v, vn, t);
      if(uc > 1./(ROUT+1.5) && uc < 1./1.08){
        float r = 1./uc;
        vec4 e = diskShade(r, uc, vc, cphi, bn3, N, e1, e2);
        dcol += dtrans*e.rgb*e.a;
        dtrans *= 1.-e.a;
        if(dtrans < .03){ alphaOut = -1.; break; }
      }
      cidx++; cphi += PI;
    }
    if(un >= 1.){ alphaOut = -1.; break; }
    if(un <= 0. && s > 1){
      float t = u/(u-un);
      alphaOut = phi + t*h - PI;
      escaped = true; break;
    }
    u = un; v = vn; phi = pn;
  }
  alpha = alphaOut;
  if(alphaOut < 0.){ alpha = (b < BC) ? -1. : 6.; }
  if(!escaped && b >= BC){ alpha = 6.; }
  rim = (b >= BC) ? exp(-(b-BC)*5.5) : 0.;
}

/* ---- accrétion de Bondi : gaz interstellaire qui tombe en spirale (q en Rs, plan du ciel) ----
   Advection en deux phases (comme le disque) : le motif tourne à Ω ∝ r^-3/2 et glisse
   vers le centre ; température T ∝ r^-3/4, puis redshift gravitationnel g = √(1-Rs/r)
   qui rougit et éteint (∝ g⁴) tout ce qui approche de l'horizon. */
vec3 inflowGas(vec2 q){
  float r = length(q);
  if(r < 1.05 || r > 34. || uInflow < .01) return vec3(0.);
  float cyc = 7.;
  float t = uTime*(1.+1.6*uInflow);
  float pa = fract(t/cyc), pb = fract(t/cyc+.5);
  float wa = 1.-abs(2.*pa-1.), wb = 1.-abs(2.*pb-1.);
  float om = 9.*pow(max(r,1.5), -1.5);
  float aa = -om*pa*cyc, ab = -om*pb*cyc;   /* même sens de rotation que la matière (couche scène) */
  float sa = exp(.07*pa*cyc*(1.+uInflow)), sb = exp(.07*pb*cyc*(1.+uInflow));
  vec2 qa = mat2(cos(aa),-sin(aa),sin(aa),cos(aa))*q*sa;
  vec2 qb = mat2(cos(ab),-sin(ab),sin(ab),cos(ab))*q*sb;
  float n = wa*fbm2(qa*.3+3.1) + wb*fbm2(qb*.3+11.7);
  float ang = atan(q.y, q.x);
  float arms = .55+.45*sin(2.*ang - 3.2*log(r) - t*.35 + n*4.);
  float dens = smoothstep(.3, .95, n)*arms*arms;
  dens *= smoothstep(30., 8., r)/(.4+r*.14);
  float g = sqrt(max(1.-1./r, 0.));
  float T = 2400.*pow(9./r, .75)*g;
  float I = dens*g*g*g*g*(.6+1.6*uInflow);
  return blackbody(T)*I*.2;
}

void main(){
  vec2 pc = vec2(vUv.x*uCss.x, (1.-vUv.y)*uCss.y) - uShake;
  vec2 p = pc - uCenter;

  /* ondulations (ondes de choc) : déplacent seulement les lectures de ciel/scène */
  vec2 pr = p;
  float dp = length(p)+1e-4;
  vec2 pdir = p/dp;
  for(int i=0;i<4;i++){
    vec4 rp = uRip[i];
    if(rp.w > 0.){
      float x = (dp-rp.x)/rp.y;
      pr -= pdir*(x*exp(-x*x))*rp.z*rp.w;
    }
  }

  vec2 bv = vec2(p.x, -p.y)/uK;
  float b = length(bv);
  float alpha; vec3 dcol; float dtrans; float rim;
  traceRay(bv, alpha, dcol, dtrans, rim);

  float shadowMask = smoothstep(BC-.7/uK*1., BC+.7/uK*1., b);
  float alphaEff = alpha < 0. ? 6. : min(alpha, 6.3);

  /* ciel, tordu par l'entraînement du référentiel (rotation ∝ 1/b², plus forte quand on aspire) */
  vec2 sp = pr - pdir*(uLens*uK*alphaEff);
  float tw = uTwist*min(1., (BC*BC*1.6)/(b*b+.01));
  float ctw = cos(tw), stw = sin(tw);
  sp = vec2(ctw*sp.x - stw*sp.y, stw*sp.x + ctw*sp.y);
  vec3 sky = skyAt(uCenter + sp + uDrift);

  vec3 col = dcol + dtrans*sky*shadowMask;

  /* gaz qui tombe (accrétion de Bondi), vu à travers la lentille */
  if(b < 40.){
    float aG = min(alphaEff, 3.4);
    vec2 pg = pr - pdir*(uSceneLens*uK*aG);
    col += dtrans*inflowGas(vec2(pg.x, -pg.y)/uK)*shadowMask*uGlow;
    /* couronne : lueur X diffuse autour de la région interne */
    col += vec3(.55,.7,1.)*exp(-max(b-BC, 0.)*.55)*.05*uGlow*shadowMask;
  }

  /* anneau de photons : empilement des images d'ordre supérieur */
  if(b >= BC*.98 && b < BMAX){
    float w = exp(-pow((b-BC*1.012)/(.055*BC), 2.));
    vec3 rc = blackbody(uTemp*.95);
    vec2 bn2 = bv/max(b,1e-4);
    float dopp = .45 + .55*clamp(-bn2.x*cos(uRoll) - bn2.y*sin(uRoll) + .35, -.2, 1.35);
    col += rc*w*1.5*uGlow*dopp;
  }

  /* scène 2D déformée */
  if(uSceneOn > .5){
    float aS = min(alphaEff, 3.4);
    vec2 pss = pr - pdir*(uSceneLens*uK*aS);
    vec2 suv = (uCenter + pss)/uCss;
    if(suv.x>0. && suv.x<1. && suv.y>0. && suv.y<1.){
      vec4 sc = texture(uScene, suv);
      float vis = shadowMask;
      col = col*(1.-sc.a*vis) + sc.rgb*vis*uSceneGain;
    }
  }
  oCol = vec4(col, 1.);
}
`;

  /* ---------- bloom : seuil + réduction, flou séparable ---------- */
  const FRAG_BRIGHT = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 oCol;
uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThr;
void main(){
  vec3 c = texture(uTex, vUv+uTexel*vec2(-.5,-.5)).rgb + texture(uTex, vUv+uTexel*vec2(.5,-.5)).rgb
         + texture(uTex, vUv+uTexel*vec2(-.5,.5)).rgb  + texture(uTex, vUv+uTexel*vec2(.5,.5)).rgb;
  c *= .25;
  float l = max(c.r, max(c.g, c.b));
  float k = smoothstep(uThr, uThr+.9, l);
  oCol = vec4(c*k, 1.);
}`;
  const FRAG_DOWN = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 oCol;
uniform sampler2D uTex; uniform vec2 uTexel;
void main(){
  vec3 c = texture(uTex, vUv+uTexel*vec2(-.5,-.5)).rgb + texture(uTex, vUv+uTexel*vec2(.5,-.5)).rgb
         + texture(uTex, vUv+uTexel*vec2(-.5,.5)).rgb  + texture(uTex, vUv+uTexel*vec2(.5,.5)).rgb;
  oCol = vec4(c*.25, 1.);
}`;
  const FRAG_BLUR = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 oCol;
uniform sampler2D uTex; uniform vec2 uDir;
void main(){
  vec3 c = texture(uTex, vUv).rgb*.2270270;
  c += (texture(uTex, vUv+uDir*1.3846153).rgb + texture(uTex, vUv-uDir*1.3846153).rgb)*.3162162;
  c += (texture(uTex, vUv+uDir*3.2307692).rgb + texture(uTex, vUv-uDir*3.2307692).rgb)*.0702702;
  oCol = vec4(c, 1.);
}`;

  /* ---------- composition finale ---------- */
  const FRAG_POST = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 oCol;
uniform sampler2D uMain, uBloomA, uBloomB;
uniform float uTime, uAberr, uBloomK, uExposure, uVignette, uGrain;
uniform float uFlashHurt, uFlashGold, uFreeze, uDanger, uDilate, uFade, uPull;
uniform vec2 uFb, uHole;
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
void main(){
  vec2 c = vUv-.5;
  float r2 = dot(c,c);
  vec2 off = c*(uAberr*(.4+r2*3.));
  vec3 col;
  col.r = texture(uMain, vUv+off).r;
  col.g = texture(uMain, vUv).g;
  col.b = texture(uMain, vUv-off).b;
  /* aspiration : flou radial vers le trou (la lumière semble tirée vers lui) */
  if(uPull > .01){
    vec2 toH = uHole - vUv;
    float w = uPull*smoothstep(.02, .25, length(toH));
    vec3 acc = col;
    for(int i=1;i<6;i++){ acc += texture(uMain, vUv + toH*(float(i)*.0042*w)).rgb; }
    col = mix(col, acc/6., .6*min(w*2., 1.));
  }
  vec3 bl = texture(uBloomA, vUv).rgb*.55 + texture(uBloomB, vUv).rgb*.45;
  col += bl*uBloomK;
  col *= uExposure;

  /* dilatation temporelle : désaturation + teinte froide */
  float l0 = dot(col, vec3(.299,.587,.114));
  col = mix(col, vec3(l0)*vec3(.82,.92,1.08), uDilate*.55);

  col = aces(col);
  col = pow(col, vec3(1./2.2));

  /* vignette */
  float vg = 1. - uVignette*smoothstep(.18,.95,r2*2.2);
  col *= vg;
  /* flashs */
  col += vec3(1.,.14,.28)*uFlashHurt*.30*(.35+smoothstep(.0,.6,r2*2.));
  col += vec3(1.,.82,.4)*uFlashGold*.20;
  col = mix(col, col*vec3(.65,.95,1.25)+vec3(.0,.05,.09), clamp(uFreeze,0.,1.)*.55);
  col += vec3(.95,.05,.12)*uDanger*smoothstep(.12,.55,r2*2.2)*.42;
  /* grain + dither */
  float g = hash21(gl_FragCoord.xy + fract(uTime)*91.7) - .5;
  col += g*uGrain;
  col *= uFade;
  oCol = vec4(col, 1.);
}`;

  /* ---------- utilitaires GL ---------- */
  function compile(type, src){
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
      const log = gl.getShaderInfoLog(s);
      console.error('GOULU shader:', log);
      throw new Error(log);
    }
    return s;
  }
  function program(vs, fs, names){
    const pr = gl.createProgram();
    gl.attachShader(pr, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(pr, 0, 'aPos');
    gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    const u = {};
    for(const n of names) u[n] = gl.getUniformLocation(pr, n);
    return { pr, u };
  }
  function makeTex(w, h, internal, fmt, type, filter){
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, fmt, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function makeFbo(w, h){
    w = Math.max(2, w|0); h = Math.max(2, h|0);
    const tex = hdr ? makeTex(w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR)
                    : makeTex(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }
  function freeFbo(f){ if(!f) return; gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.tex); }
  function drawQuad(){ gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, 3); }

  function bake(){
    const w = 2048, h = 1024;
    texSky = makeTex(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texSky, 0);
    gl.viewport(0, 0, w, h);
    gl.useProgram(P.sky.pr); drawQuad();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
  }

  function init(canvas){
    /* (ré)initialisation complète : après une perte de contexte, les anciens objets GL sont invalides */
    ok = false; fbW = 0; fbH = 0;
    fboMain = fboA = fboB = fboC = fboD = skyFbo = null; skyDirty = true;
    pendingQ = null; gpuMs = 0;
    try{
      gl = canvas.getContext('webgl2', { antialias:false, alpha:false, depth:false, stencil:false, powerPreference:'high-performance', preserveDrawingBuffer:false });
      if(!gl) return false;
      hdr = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
      timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      quadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      P.sky = program(VERT, FRAG_SKY, []);
      P.main = program(VERT, FRAG_MAIN, ['uCss','uCenter','uShake','uK','uFocal','uTime','uSpin','uDrift','uTilt','uRoll','uSkyBuf','uSkyOrg','uSkySize','uPxCss',
        'uGlow','uTemp','uBeam','uHue','uSat','uLens','uSceneLens','uSceneOn','uSceneGain','uStarGain','uQuality','uTint','uRip','uSky','uScene',
        'uInflow','uTwist','uHot']);
      P.skybuf = program(VERT, FRAG_SKYBUF, ['uCss','uSkyOrg','uSkySize','uFocal','uTime','uPxCss','uStarGain','uTint','uSky']);
      P.bright = program(VERT, FRAG_BRIGHT, ['uTex','uTexel','uThr']);
      P.down = program(VERT, FRAG_DOWN, ['uTex','uTexel']);
      P.blur = program(VERT, FRAG_BLUR, ['uTex','uDir']);
      P.post = program(VERT, FRAG_POST, ['uMain','uBloomA','uBloomB','uTime','uAberr','uBloomK','uExposure','uVignette','uGrain',
        'uFlashHurt','uFlashGold','uFreeze','uDanger','uDilate','uFade','uFb','uPull','uHole']);
      bake();
      texScene = makeTex(2, 2, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      ok = true;
      // erreurs de lien/pilote non fatales ?
      const e = gl.getError();
      if(e !== gl.NO_ERROR) console.warn('GOULU GL error après init:', e);
      return true;
    }catch(err){
      console.warn('GOULU: WebGL2 indisponible, rendu de secours', err);
      ok = false; return false;
    }
  }

  function resize(fw, fh){
    fw = Math.max(2, fw|0); fh = Math.max(2, fh|0);
    if(!ok || (fw === fbW && fh === fbH)) return;
    fbW = fw; fbH = fh;
    [fboMain, fboA, fboB, fboC, fboD, skyFbo].forEach(freeFbo);
    skyFbo = null; skyDirty = true;
    fboMain = makeFbo(fw, fh);
    fboA = makeFbo(fw/4, fh/4);   // bloom large niveau 1 (1/4)
    fboB = makeFbo(fw/4, fh/4);
    fboC = makeFbo(fw/8, fh/8);   // niveau 2 (1/8)
    fboD = makeFbo(fw/8, fh/8);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function setUniformsMain(f){
    const u = P.main.u;
    gl.uniform2f(u.uCss, f.cssW, f.cssH);
    gl.uniform2f(u.uCenter, f.cx, f.cy);
    gl.uniform2f(u.uShake, f.shakeX || 0, f.shakeY || 0);
    gl.uniform1f(u.uK, f.k);
    gl.uniform1f(u.uFocal, f.focal);
    gl.uniform1f(u.uTime, f.time);
    gl.uniform1f(u.uSpin, f.spin);
    gl.uniform2f(u.uDrift, f.drift[0], f.drift[1]);
    gl.uniform2f(u.uSkyOrg, skyOrg[0], skyOrg[1]);
    gl.uniform2f(u.uSkySize, skySize[0], skySize[1]);
    gl.uniform1f(u.uPxCss, f.cssW / fbW);
    gl.uniform1f(u.uTilt, f.tilt);
    gl.uniform1f(u.uRoll, f.roll);
    gl.uniform1f(u.uGlow, f.glow);
    gl.uniform1f(u.uTemp, f.temp);
    gl.uniform1f(u.uBeam, f.beam);
    gl.uniform1f(u.uHue, f.hue);
    gl.uniform1f(u.uSat, f.sat);
    gl.uniform1f(u.uLens, f.lens);
    gl.uniform1f(u.uSceneLens, f.sceneLens);
    gl.uniform1f(u.uSceneOn, f.sceneOn ? 1 : 0);
    gl.uniform1f(u.uSceneGain, f.sceneGain);
    gl.uniform1f(u.uStarGain, f.starGain);
    gl.uniform1f(u.uQuality, f.quality);
    gl.uniform1f(u.uInflow, f.inflow || 0);
    gl.uniform1f(u.uTwist, f.twist || 0);
    gl.uniform1f(u.uHot, f.hot || 0);
    gl.uniform3f(u.uTint, f.tint[0], f.tint[1], f.tint[2]);
    const rip = new Float32Array(16);
    for(let i=0;i<4;i++){
      const r = f.ripples[i];
      if(r){ rip[i*4]=r.r; rip[i*4+1]=r.w; rip[i*4+2]=r.s; rip[i*4+3]=r.a; }
    }
    gl.uniform4fv(u.uRip, rip);
  }

  function uploadScene(cv){
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texScene);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  }

  function render(f){
    if(!ok) return;
    resize(f.fbW, f.fbH);
    gl.disable(gl.BLEND);
    let q = null;
    if(timerExt){
      if(pendingQ){
        if(gl.getQueryParameter(pendingQ, gl.QUERY_RESULT_AVAILABLE)){
          const bad = gl.getParameter(timerExt.GPU_DISJOINT_EXT);
          if(!bad){ const ms = gl.getQueryParameter(pendingQ, gl.QUERY_RESULT) / 1e6; gpuMs = gpuMs ? gpuMs + (ms - gpuMs) * 0.2 : ms; }
          gl.deleteQuery(pendingQ); pendingQ = null;
        }
      }
      if(!pendingQ){ q = gl.createQuery(); gl.beginQuery(timerExt.TIME_ELAPSED_EXT, q); }
    }

    /* 0. ciel à la résolution de l'écran (marge pour le décalage de lentille) */
    const m = 0.12;
    skyOrg = [-m * f.cssW, -m * f.cssH];
    skySize = [f.cssW * (1 + 2*m), f.cssH * (1 + 2*m)];
    if(!skyFbo){ skyFbo = makeFbo(fbW * (1 + 2*m), fbH * (1 + 2*m)); skyDirty = true; }
    if(skyDirty || (frameNo++ % 8) === 0){
      skyDirty = false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, skyFbo.fb);
      gl.viewport(0, 0, skyFbo.w, skyFbo.h);
      gl.useProgram(P.skybuf.pr);
      const us = P.skybuf.u;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texSky); gl.uniform1i(us.uSky, 0);
      gl.uniform2f(us.uCss, f.cssW, f.cssH);
      gl.uniform2f(us.uSkyOrg, skyOrg[0], skyOrg[1]);
      gl.uniform2f(us.uSkySize, skySize[0], skySize[1]);
      gl.uniform1f(us.uFocal, f.focal);
      gl.uniform1f(us.uTime, f.time);
      gl.uniform1f(us.uPxCss, f.cssW / fbW);
      gl.uniform1f(us.uStarGain, f.starGain);
      gl.uniform3f(us.uTint, f.tint[0], f.tint[1], f.tint[2]);
      drawQuad();
    }

    /* 1. principale */
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboMain.fb);
    gl.viewport(0, 0, fboMain.w, fboMain.h);
    gl.useProgram(P.main.pr);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texSky);
    gl.uniform1i(P.main.u.uSky, 0);
    if(f.sceneOn && f.sceneCanvas) uploadScene(f.sceneCanvas);
    else { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texScene); }
    gl.uniform1i(P.main.u.uScene, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, skyFbo.tex);
    gl.uniform1i(P.main.u.uSkyBuf, 2);
    setUniformsMain(f);
    drawQuad();

    /* 2. bloom */
    gl.activeTexture(gl.TEXTURE0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboA.fb); gl.viewport(0,0,fboA.w,fboA.h);
    gl.useProgram(P.bright.pr);
    gl.bindTexture(gl.TEXTURE_2D, fboMain.tex); gl.uniform1i(P.bright.u.uTex, 0);
    gl.uniform2f(P.bright.u.uTexel, 1/fboMain.w, 1/fboMain.h);
    gl.uniform1f(P.bright.u.uThr, f.bloomThr);
    drawQuad();
    // flou niveau 1
    gl.useProgram(P.blur.pr); gl.uniform1i(P.blur.u.uTex, 0);
    for(let i=0;i<2;i++){
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboB.fb);
      gl.bindTexture(gl.TEXTURE_2D, fboA.tex);
      gl.uniform2f(P.blur.u.uDir, 1/fboA.w, 0); drawQuad();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboA.fb);
      gl.bindTexture(gl.TEXTURE_2D, fboB.tex);
      gl.uniform2f(P.blur.u.uDir, 0, 1/fboA.h); drawQuad();
    }
    // niveau 2 (1/8)
    gl.useProgram(P.down.pr); gl.uniform1i(P.down.u.uTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboC.fb); gl.viewport(0,0,fboC.w,fboC.h);
    gl.bindTexture(gl.TEXTURE_2D, fboA.tex);
    gl.uniform2f(P.down.u.uTexel, 1/fboA.w, 1/fboA.h); drawQuad();
    gl.useProgram(P.blur.pr); gl.uniform1i(P.blur.u.uTex, 0);
    for(let i=0;i<2;i++){
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboD.fb);
      gl.bindTexture(gl.TEXTURE_2D, fboC.tex);
      gl.uniform2f(P.blur.u.uDir, 1.5/fboC.w, 0); drawQuad();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboC.fb);
      gl.bindTexture(gl.TEXTURE_2D, fboD.tex);
      gl.uniform2f(P.blur.u.uDir, 0, 1.5/fboC.h); drawQuad();
    }

    /* 3. composition */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, fbW, fbH);
    gl.useProgram(P.post.pr);
    const u = P.post.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fboMain.tex); gl.uniform1i(u.uMain, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fboA.tex);    gl.uniform1i(u.uBloomA, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, fboC.tex);    gl.uniform1i(u.uBloomB, 2);
    gl.uniform1f(u.uTime, f.time);
    gl.uniform1f(u.uAberr, f.aberr);
    gl.uniform1f(u.uBloomK, f.bloom);
    gl.uniform1f(u.uExposure, f.exposure);
    gl.uniform1f(u.uVignette, f.vignette);
    gl.uniform1f(u.uGrain, f.grain);
    gl.uniform1f(u.uFlashHurt, f.flashHurt);
    gl.uniform1f(u.uFlashGold, f.flashGold);
    gl.uniform1f(u.uFreeze, f.freeze);
    gl.uniform1f(u.uDanger, f.danger);
    gl.uniform1f(u.uDilate, f.dilate);
    gl.uniform1f(u.uFade, f.fade);
    gl.uniform2f(u.uFb, fbW, fbH);
    gl.uniform1f(u.uPull, f.pull || 0);
    gl.uniform2f(u.uHole, f.holeU || .5, f.holeV || .5);
    drawQuad();
    gl.activeTexture(gl.TEXTURE0);
    if(q){ gl.endQuery(timerExt.TIME_ELAPSED_EXT); pendingQ = q; }
  }

  return { init, render, get ok(){ return ok; }, get hdr(){ return hdr; }, get gpuMs(){ return gpuMs; }, get hasTimer(){ return !!timerExt; } };
})();
