/* =========================================================
   GOULU — physique en unités réelles (0.22)
   ---------------------------------------------------------
   Fonctions pures, sans état de jeu : ce que le HUD, la cinématique de
   naissance et les archives affichent vient d'ici. Les formules sont celles
   des manuels (unités SI, masses en masses solaires M☉, spin a* sans dimension).
   Principe du jeu : les lois sont vraies, seul le temps est accéléré.
   ========================================================= */
const PHY = (() => {
  const G = 6.674e-11, c = 2.998e8, hbar = 1.0546e-34, kB = 1.381e-23;
  const MSUN = 1.989e30, MP = 1.6726e-27, SIGMA_T = 6.652e-29, YEAR = 3.156e7;

  /* Rayon de Schwarzschild Rs = 2GM/c², en km (2,95 km par masse solaire). */
  function rsKm(m){ return 2 * G * m * MSUN / (c * c) / 1000; }
  /* Rayon de l'ombre vue de loin : √27 GM/c² = 3√3/2 Rs (trou sans rotation). */
  function shadowKm(m){ return rsKm(m) * 1.5 * Math.sqrt(3); }
  /* Dernière orbite stable (ISCO) d'un trou de Kerr, en GM/c² (Bardeen, Press & Teukolsky 1972).
     a* > 0 : disque qui tourne dans le même sens que le trou ; a* < 0 : à contre-sens. */
  function iscoRg(a){
    a = Math.max(-1, Math.min(1, a));
    const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a));
    const z2 = Math.sqrt(3 * a * a + z1 * z1);
    return 3 + z2 - Math.sign(a) * Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
  }
  /* Efficacité radiative de l'accrétion : η = 1 − E_ISCO, E_ISCO = √(1 − 2/(3 r_ISCO)).
     5,7 % sans rotation, 32 % à la limite de Thorne (a* = 0,998), 42 % pour a* = 1. */
  function eta(a){ return 1 - Math.sqrt(1 - 2 / (3 * iscoRg(a))); }
  /* Moment cinétique et énergie spécifiques sur l'ISCO (en GM/c et en c²), a* signé comme pour iscoRg. */
  function iscoL(a){ const r = iscoRg(a), sr = Math.sqrt(r); return 2 * (3 * sr - 2 * a) / (Math.sqrt(3) * sr); }
  function iscoE(a){ return Math.sqrt(1 - 2 / (3 * iscoRg(a))); }
  /* Évolution du spin par accrétion (Bardeen 1970) : d(a*) / d(ln M) = ℓ/E − 2a*.
     c ∈ [−1, 1] : cohérence du disque (1 : tout tourne dans le sens du spin, −1 : à contre-sens,
     0 : matière qui tombe sans tourner, ℓ = 0, E = 1 : le spin baisse, comme en accrétion chaotique). */
  function spinRate(a, c){
    const s = c >= 0 ? 1 : -1, ar = a * s;
    return s * Math.abs(c) * iscoL(ar) / (Math.abs(c) * iscoE(ar) + (1 - Math.abs(c))) - 2 * a;
  }
  /* Horizon r₊ = 1 + √(1 − a*²) en GM/c². L'ergosphère (à l'équateur) s'étend jusqu'à 2 GM/c² = Rs. */
  function horizonRg(a){ return 1 + Math.sqrt(1 - Math.min(1, a * a)); }
  /* Masse irréductible (Christodoulou 1970) : ce qu'aucun processus ne peut extraire. */
  function irrK(a){ return Math.sqrt((1 + Math.sqrt(1 - Math.min(1, a * a))) / 2); }
  /* Spin restant quand la masse passe à M en gardant la masse irréductible (énergie de rotation extraite). */
  function spinAfter(mIrr, m){ const q = Math.min(1, mIrr / m), k = 2 * q * q - 1; return Math.sqrt(Math.max(0, 1 - k * k)); }
  /* Part de la masse extractible sous forme d'énergie de rotation : 29,3 % au plus (a* = 1). */
  function rotFrac(a){ return 1 - irrK(a); }
  /* Température de Hawking T = ħc³ / (8πGMk_B) : 6,2×10⁻⁸ K pour une masse solaire. */
  function hawkingK(m){ return hbar * c * c * c / (8 * Math.PI * G * m * MSUN * kB); }
  /* Durée de vie par évaporation (photons seuls) : t = 5120π G²M³ / (ħc⁴), en années. */
  function lifeYears(m){ const M = m * MSUN; return 5120 * Math.PI * G * G * M * M * M / (hbar * c * c * c * c) / YEAR; }
  /* Luminosité d'Eddington L = 4πGMm_p c / σ_T, en watts (1,26×10³¹ W par masse solaire). */
  function eddW(m){ return 4 * Math.PI * G * m * MSUN * MP * c / SIGMA_T; }
  /* Entropie de Bekenstein-Hawking S/k_B = 4πGM² / (ħc) (≈ 10⁷⁷ pour une masse solaire). */
  function entropyKB(m){ const M = m * MSUN; return 4 * Math.PI * G * M * M / (hbar * c); }
  /* Rayon de rupture par effet de marée r_t ≈ R*(M/M*)^⅓, en km. */
  function tidalKm(m, mStar, rStarKm){ return rStarKm * Math.cbrt(m / mStar); }
  /* Temps de Salpeter : à la limite d'Eddington, la masse est multipliée par e en η/(1−η) · σ_T c / (4πG m_p). */
  function salpeterYears(e){ return e / (1 - e) * SIGMA_T * c / (4 * Math.PI * G * MP) / YEAR; }
  /* Température du bord interne du disque (ordre de grandeur, disque mince de Shakura-Sunyaev) :
     ≈ 1,4×10⁷ K pour 10 M☉ à la limite d'Eddington, ∝ M^−¼ λ^¼. */
  function discK(m, lam){ return 1.4e7 * Math.pow(m / 10, -0.25) * Math.pow(Math.max(lam, 1e-4), 0.25); }

  /* ---------- affichage en français ---------- */
  const SUP = { '-':'⁻', '0':'⁰', '1':'¹', '2':'²', '3':'³', '4':'⁴', '5':'⁵', '6':'⁶', '7':'⁷', '8':'⁸', '9':'⁹' };
  function num(x, d){ return x.toFixed(d === undefined ? (x < 10 ? 2 : x < 100 ? 1 : 0) : d).replace('.', ','); }
  /* 2,1×10⁶⁷ ; les nombres ordinaires restent écrits normalement. */
  function sci(x, d){
    if(!(x > 0)) return '0';
    if(x >= 0.01 && x < 1e5) return num(x, d);
    const e = Math.floor(Math.log10(x)), mant = x / Math.pow(10, e);
    const ms = mant.toFixed(d === undefined ? 1 : d).replace('.', ',');
    return (ms === '1,0' || ms === '1' ? '' : ms + '×') + '10' + String(e).split('').map(ch => SUP[ch]).join('');
  }
  /* Âge lisible : « 0,25 s », « 3 h », « 12 jours », « 4 ans », « 3,2 millions d'années ». */
  function age(yr){
    const s = yr * YEAR;
    if(s < 60) return num(s, s < 1 ? 3 : 1) + ' s';
    if(s < 3600) return Math.round(s / 60) + ' min';
    if(s < 86400) return Math.round(s / 3600) + ' h';
    if(yr < 1) return Math.round(s / 86400) + ' jours';
    if(yr < 1e4) return Math.round(yr) + (Math.round(yr) > 1 ? ' ans' : ' an');
    if(yr < 1e6) return Math.round(yr / 1000) + ' 000 ans';
    if(yr < 1e9) return num(yr / 1e6, yr < 1e7 ? 1 : 0) + ' millions d\'années';
    return num(yr / 1e9, 1) + ' milliards d\'années';
  }

  return { G, c, hbar, kB, MSUN, YEAR, rsKm, shadowKm, iscoRg, iscoL, iscoE, spinRate, horizonRg, irrK, spinAfter, rotFrac, eta, hawkingK, lifeYears, eddW, entropyKB, tidalKm, salpeterYears, discK, num, sci, age };
})();
