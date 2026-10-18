/* =========================================================
   GOULU — archives (0.25)
   ---------------------------------------------------------
   Une fiche par phénomène, débloquée la première fois qu'on le vit en jeu :
   la loi, une observation réelle datée, ce que le jeu en fait (et ce qu'il
   simplifie), avec une étiquette d'honnêteté. Onglet « Archives » du menu,
   choix de la naissance, épilogue « Le long sommeil ».
   ========================================================= */
const TAGS = { obs:'OBSERVÉ', theo:'THÉORIE ÉTABLIE', hyp:'HYPOTHÈSE', open:'QUESTION OUVERTE' };
const ARCHIVES = [
  { id:'massive_star', tag:'theo', title:'Une étoile massive',
    law:'Au-delà d\'environ 20 masses solaires, une étoile brûle ses combustibles en couches successives, de plus en plus vite : hydrogène ≈ 7 millions d\'années, hélium ≈ 800 000 ans… silicium ≈ 1 jour (pour 25 M☉).',
    obs:'Durées calculées par Woosley, Heger & Weaver (2002) ; supergéantes comme Rigel ou Deneb observées.',
    game:'Cinématique de naissance. Les durées sont celles du modèle publié, arrondies.', hint:'Regarde la naissance complète' },
  { id:'core_collapse', tag:'obs', title:'Effondrement du cœur',
    law:'Le fer ne libère plus d\'énergie en fusionnant : le cœur (≈ 1,5 M☉) s\'effondre en moins d\'une seconde à près de 70 000 km/s. 10⁵⁸ neutrinos emportent 99 % de l\'énergie (≈ 3×10⁴⁶ J).',
    obs:'SN 1987A : une vingtaine de neutrinos captés sur Terre (Kamiokande, IMB, Baksan), quelques heures avant la lumière.',
    game:'Étapes 3 à 5 de la naissance.', hint:'Regarde la naissance complète' },
  { id:'horizon', tag:'theo', title:'L\'horizon des événements',
    law:'Rs = 2GM/c², 2,95 km par masse solaire. Rien de ce qui le franchit ne ressort. L\'ombre vue de loin est plus grande : 3√3/2 Rs ≈ 2,6 Rs, à cause de la courbure de la lumière.',
    obs:'Ombre de M87* (EHT, 2019) puis de Sagittarius A* (EHT, 2022).',
    game:'Le rendu intègre la trajectoire de la lumière pixel par pixel. Licence de jeu : la zone de collision grandit comme M^0,35, pas comme M.', hint:'Joue une partie' },
  { id:'nohair', tag:'theo', title:'Le théorème de calvitie',
    law:'Un trou noir isolé n\'est décrit que par trois nombres : masse, spin, charge. Tout le reste de l\'étoile est effacé ; l\'horizon « sonne » quelques millisecondes (ringdown) puis se fige.',
    obs:'Ringdown mesuré dans les ondes gravitationnelles (GW150914, puis nettement GW250114).',
    game:'La charge est ignorée : un vrai trou noir est neutralisé par le plasma qui l\'entoure.', hint:'Regarde la naissance complète' },
  { id:'fallback', tag:'theo', title:'Supernova avec retombée',
    law:'L\'onde de choc cale : une partie de l\'étoile est expulsée, le reste retombe. Le débit de retombée décroît comme t^−5/3.',
    obs:'Supernovas faibles et trous noirs de 5 à 10 M☉ dans des binaires X de la Voie lactée.',
    game:'Naissance « retombée » : débris en surplus au début ; phase « Retombée » au palier 1.', hint:'Nais d\'une supernova avec retombée' },
  { id:'failed_sn', tag:'obs', title:'Supernova ratée',
    law:'L\'étoile s\'effondre entière sans exploser : elle disparaît simplement du ciel.',
    obs:'Candidats N6946-BH1 (2017) et M31-2014-DS1 (2024), encore débattus.',
    game:'Naissance « supernova ratée » : plus massive, départ calme.', hint:'Nais d\'une supernova ratée' },
  { id:'collapsar', tag:'theo', title:'Collapsar et sursauts gamma',
    law:'Une étoile qui tourne vite forme un disque autour du trou naissant ; deux jets percent l\'étoile à presque la vitesse de la lumière (Woosley, 1993).',
    obs:'Sursauts gamma longs associés à des supernovas (GRB 980425 / SN 1998bw, 1998).',
    game:'Naissance « collapsar » : spin 0,85, charges pleines.', hint:'Nais d\'un collapsar' },
  { id:'gw170817', tag:'obs', title:'Fusion de deux étoiles à neutrons',
    law:'Deux étoiles à neutrons spiralent et fusionnent ; au-delà d\'environ 2,2 à 2,5 M☉, le reste s\'effondre en trou noir. Les éjecta riches en neutrons forgent l\'or et le platine (kilonova).',
    obs:'GW170817 (17 août 2017) : ondes gravitationnelles, sursaut gamma et kilonova AT2017gfo vus ensemble.',
    game:'Naissance à débloquer : le plus petit trou noir, 2,7 M☉.', hint:'Provoque une kilonova' },
  { id:'pbh', tag:'hyp', title:'Trou noir primordial',
    law:'Des trous noirs auraient pu naître juste après le Big Bang, de n\'importe quelle masse. En comptant toutes les particules qu\'ils émettent (Page, 1976), ceux d\'environ 5×10¹¹ kg finiraient de s\'évaporer aujourd\'hui.',
    obs:'Jamais observé. Recherches d\'éclairs gamma d\'évaporation (Fermi, HAWC) : rien pour l\'instant.',
    game:'Naissance à débloquer : la seule où le rayonnement de Hawking compte, il faut manger sans cesse.', hint:'Regarde l\'épilogue' },
  { id:'seed', tag:'hyp', title:'Graine supermassive',
    law:'Un nuage de gaz pourrait s\'effondrer directement en trou noir de 10⁴ à 10⁶ M☉ dans l\'univers jeune.',
    obs:'JWST voit des trous noirs très massifs moins de 500 millions d\'années après le Big Bang (UHZ1, 2023).',
    game:'Naissance à débloquer : 10⁵ M☉, gaz dense partout.', hint:'Tombe dans Sagittarius A*' },
  { id:'disc', tag:'theo', title:'Le disque d\'accrétion',
    law:'La matière perd son moment cinétique par viscosité et spirale vers le trou ; le disque chauffe vers l\'intérieur (T ∝ r^−3/4), jusqu\'à ~10⁷ K pour un trou stellaire : il brille en rayons X.',
    obs:'Spectres thermiques des binaires X (Shakura & Sunyaev, 1973).',
    game:'La jauge « Disque » suit le débit avalé ; si tu jeûnes, il s\'éteint (un trou stellaire ne maigrit pas).', hint:'Remplis ton disque' },
  { id:'eddington', tag:'theo', title:'La limite d\'Eddington',
    law:'Au-delà de L = 1,26×10³¹ W par masse solaire, la pression de la lumière repousse la matière qui tombe : le débit d\'accrétion est plafonné, proportionnellement à la masse.',
    obs:'Sources X ultralumineuses : certaines la dépassent (accrétion super-Eddington, vents).',
    game:'Au-delà, la poussière est soufflée et la masse progresse peu.', hint:'Avale plus vite que la limite' },
  { id:'antimatter', tag:'obs', title:'L\'antimatière tombe aussi',
    law:'L\'antimatière a une masse positive : elle tombe comme la matière. Tout ce qui franchit l\'horizon ajoute de la masse.',
    obs:'ALPHA-g (CERN, 2023) : l\'antihydrogène tombe avec l\'accélération g.',
    game:'Licence de jeu : les ennemis d\'antimatière. Un contact annihile la matière du disque (vie perdue) mais la masse monte.', hint:'Fais-toi toucher par l\'antimatière' },
  { id:'bondi', tag:'theo', title:'L\'accrétion de Bondi',
    law:'Un trou noir isolé capte le gaz ambiant à un débit Ṁ = 4πλ G²M²ρ / c_s³ : deux fois plus massif, quatre fois plus vorace.',
    obs:'Sagittarius A* avale bien moins que la prédiction de Bondi : une partie du gaz est soufflée.',
    game:'Phase « Vagabond » : milieu clairsemé ; les points montent avec la croissance.', hint:'Atteins la phase Vagabond' },
  { id:'xrb', tag:'obs', title:'Binaire X',
    law:'Une étoile compagne trop proche déborde de son lobe de Roche : sa matière forme un disque autour du trou.',
    obs:'Cygnus X-1 (1971), premier trou noir reconnu : 21 M☉ (mesure de 2021).',
    game:'Phase « Binaire X » : un flux continu arrive d\'un côté de l\'écran.', hint:'Atteins la phase Binaire X' },
  { id:'microquasar', tag:'obs', title:'Microquasar',
    law:'Les binaires X alternent état dur (couronne chaude, jets) et état mou (disque thermique brillant).',
    obs:'GRS 1915+105 (1994) : jets apparemment plus rapides que la lumière (effet de projection).',
    game:'Phase « Microquasar » : jets 6 s sur 12.', hint:'Atteins la phase Microquasar' },
  { id:'tde', tag:'obs', title:'Rupture par effet de marée',
    law:'Une étoile qui passe sous le rayon r_t ≈ R*(M/M*)^⅓ est déchirée ; environ la moitié reste liée et retombe (débit ∝ t^−5/3). Près d\'un petit trou, la marée est bien plus violente.',
    obs:'Plus de cent événements, dont ASASSN-14li et AT2018hyz ; jets dans Swift J1644+57 (2011).',
    game:'L\'étoile de passage : aspire-la assez longtemps pour la déchirer.', hint:'Déchire une étoile' },
  { id:'kerr', tag:'theo', title:'Spin de Kerr',
    law:'L\'accrétion fait tourner le trou (Bardeen, 1970) : d(a*)/d(ln M) = ℓ/E − 2a*. L\'orbite stable la plus proche descend de 6 à 1 GM/c² et l\'efficacité du disque monte de 5,7 % à 42 % (32 % à la limite de Thorne, a* = 0,998).',
    obs:'Spins mesurés par la forme de la raie du fer et par les ondes gravitationnelles.',
    game:'Points ×1 → ×1,6 (×5,6 en vrai). Les rayons lumineux du rendu restent ceux d\'un trou sans rotation.', hint:'Atteins un spin de 0,7' },
  { id:'bz', tag:'theo', title:'Jets de Blandford-Znajek',
    law:'Le champ magnétique accroché à l\'horizon extrait l\'énergie de rotation : puissance ∝ a*² Φ². Au plus 29 % de la masse (a* = 1) ; la masse irréductible ne baisse jamais.',
    obs:'Jet de M87 (connu depuis 1918) ; trous noirs qui atteignent un spin d\'équilibre faible quand les jets sont forts (simulations).',
    game:'Chaque onde est un jet qui consomme un peu de rotation ; les charges représentent le flux magnétique.', hint:'Lance une onde avec un spin d\'au moins 0,5' },
  { id:'penrose', tag:'theo', title:'Ergosphère et processus de Penrose',
    law:'Entre l\'horizon et 2 GM/c² à l\'équateur, rien ne peut rester immobile : l\'espace tourne. Un objet qui s\'y divise peut repartir avec plus d\'énergie qu\'à l\'arrivée (Penrose, 1969).',
    obs:'Pas observé directement ; c\'est le principe des jets de Blandford-Znajek.',
    game:'Ellipse pointillée ; la fronde qui la frôle repart ×1,4 et te vole de la rotation.', hint:'Laisse une fronde traverser ton ergosphère' },
  { id:'gw', tag:'obs', title:'Ondes gravitationnelles',
    law:'Deux corps compacts en orbite émettent des ondes au double de la fréquence orbitale ; ils se rapprochent (r ∝ (t_c − t)^¼) et la fréquence monte : le « chirp ».',
    obs:'GW150914 (14 septembre 2015), première détection directe ; plus de 200 fusions depuis.',
    game:'Les rides du ciel autour du Compagnon, des étoiles à neutrons et de Sgr A*.', hint:'Rencontre un objet qui spirale' },
  { id:'nsbh', tag:'obs', title:'Étoile à neutrons contre trou noir',
    law:'Si le trou est petit et tourne vite, l\'étoile est déchirée avant l\'orbite stable la plus proche (disque, kilonova) ; sinon elle est avalée entière, sans lumière (critère de Foucart et al., 2018).',
    obs:'GW200105 et GW200115 (2020) : avalées sans contrepartie lumineuse.',
    game:'L\'annonce donne le spin qu\'il faut pour la déchirer.', hint:'Laisse une étoile à neutrons tomber' },
  { id:'bbh', tag:'obs', title:'Fusion de trous noirs et théorème des aires',
    law:'La masse finale est inférieure à la somme (≈ 5 % partent en ondes), le spin final vient du moment cinétique orbital (≈ 0,69 à masses égales), le trou recule. L\'aire totale des horizons ne diminue jamais (Hawking, 1971).',
    obs:'GW150914 : 36 + 29 → 62 M☉. GW250114 (2025) confirme le théorème des aires avec une grande confiance.',
    game:'Le Compagnon : énergie, spin et recul tirés d\'ajustements de relativité numérique.', hint:'Fusionne avec le Compagnon' },
  { id:'entropy', tag:'theo', title:'Entropie d\'un trou noir',
    law:'S = k_B c³ A / (4Għ) : l\'entropie est proportionnelle à l\'aire de l\'horizon (Bekenstein 1973, Hawking 1974) ; ≈ 10⁷⁷ k_B pour une masse solaire, bien plus que l\'étoile d\'origine.',
    obs:'Conséquence de la théorie ; le théorème des aires qui la soutient est confirmé par les ondes gravitationnelles.',
    game:'Record de partie et de profil : le seul qui ne peut que monter.', hint:'Termine une partie' },
  { id:'emri', tag:'theo', title:'Spirale à rapport de masse extrême',
    law:'Un trou stellaire qui tombe dans un trou supermassif fait des milliers d\'orbites avant la chute : un signal très long et très précis.',
    obs:'Sagittarius A* : 4,3 millions de M☉ (orbites d\'étoiles, Nobel 2020 ; ombre par l\'EHT, 2022). LISA, observatoire spatial prévu, cherchera ces signaux.',
    game:'Palier 10. Licence de jeu : une seule minute au lieu de milliers d\'orbites.', hint:'Atteins le palier 10' },
  { id:'hawking', tag:'hyp', title:'Rayonnement de Hawking',
    law:'Un trou noir rayonne comme un corps noir à T = ħc³/(8πGMk_B) = 6,2×10⁻⁸ K × (M☉/M) et s\'évapore en ≈ 2×10⁶⁷ ans × (M/M☉)³. Plus il est petit, plus il est chaud.',
    obs:'Jamais observé : pour un trou stellaire, il est des milliards de fois plus faible que le fond cosmologique.',
    game:'Absent des parties normales (c\'est la vérité) ; il domine l\'épilogue et la naissance primordiale.', hint:'Regarde l\'épilogue' },
  { id:'future', tag:'theo', title:'Les ères de l\'univers',
    law:'Dernières étoiles vers 10¹⁴ ans, galaxies dispersées vers 10²⁰ ans, ère des trous noirs à partir de 10⁴⁰ ans, jusqu\'à 10¹⁰⁰ ans pour les plus gros (Adams & Laughlin, 1997).',
    obs:'Extrapolations de la physique stellaire et de l\'expansion accélérée mesurée (1998).',
    game:'Épilogue « Le long sommeil ».', hint:'Regarde l\'épilogue' },
  { id:'info', tag:'open', title:'Le paradoxe de l\'information',
    law:'Si le rayonnement de Hawking est purement thermique, l\'information de tout ce qui est tombé est perdue, ce que la mécanique quantique interdit. Reste-t-il quelque chose à la fin ?',
    obs:'Débattu depuis 1976 ; pistes : courbe de Page, îlots, restes. Aucune réponse établie.',
    game:'La dernière question de l\'épilogue.', hint:'Regarde l\'épilogue' }
];

/* ---------- déblocage ---------- */
let archPending = 0, archTimer = null;
function archOwned(id){ return !!(profile.archives && profile.archives[id]); }
function unlockArchive(id){
  if(!ARCHIVES.some(a => a.id === id) || archOwned(id)) return false;
  if(!profile.archives) profile.archives = {};
  profile.archives[id] = Date.now(); saveP();
  archPending++;
  if(!archTimer) archTimer = setTimeout(() => {   // plusieurs fiches d'un coup : un seul message
    archTimer = null;
    try{ showUnlockToast('📖', archPending > 1 ? 'Archives : ' + archPending + ' nouvelles fiches' : 'Archives : ' + ARCHIVES.find(a => a.id === id).title); }catch(e){}
    archPending = 0;
  }, 400);
  return true;
}
function archCount(){ return ARCHIVES.filter(a => archOwned(a.id)).length; }

/* ---------- onglet ---------- */
function epilogueUnlocked(){ return !!(profile.sgrWins || (profile.bestTier || 0) >= 5 || profile.epilogueSeen); }
function renderArchives(){
  const list = $('archList'); if(!list) return;
  $('archCount').textContent = archCount();
  $('archTotal').textContent = ARCHIVES.length;
  renderBirthPicker();
  const ep = $('btnEpilogue2');
  if(ep){
    const ok = epilogueUnlocked();
    ep.disabled = !ok;
    ep.textContent = ok ? 'Le long sommeil · épilogue →' : '🔒 Le long sommeil · atteins le palier 5';
  }
  list.innerHTML = '';
  for(const a of ARCHIVES){
    const own = archOwned(a.id);
    const card = document.createElement('div');
    card.className = 'arc-card' + (own ? '' : ' locked');
    const tag = document.createElement('span'); tag.className = 'arc-tag t-' + a.tag; tag.textContent = own ? TAGS[a.tag] : '???';
    const h = document.createElement('h3'); h.textContent = own ? a.title : 'Fiche verrouillée';
    card.appendChild(tag); card.appendChild(h);
    if(own){
      for(const [cls, txt] of [['arc-law', a.law], ['arc-obs', a.obs], ['arc-game', 'Dans le jeu : ' + a.game]]){
        const p = document.createElement('p'); p.className = cls; p.textContent = txt; card.appendChild(p);
      }
    } else {
      const p = document.createElement('p'); p.className = 'arc-hint'; p.textContent = a.hint; card.appendChild(p);
    }
    list.appendChild(card);
  }
}
/* Choix de la naissance des parties normales (jamais au défi du jour). */
function renderBirthPicker(){
  const box = $('birthPick'); if(!box) return;
  box.innerHTML = '';
  const opts = [{ id:'', name:'Au hasard' }].concat(BIRTHS.filter(birthUnlocked).map(b => ({ id:b.id, name:b.short || b.name.toLowerCase() })));
  for(const o of opts){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mbadge' + ((profile.birthPick || '') === o.id ? ' on' : '');
    b.textContent = o.name;
    b.addEventListener('click', ev => { ev.stopPropagation(); profile.birthPick = o.id || null; saveP(); renderBirthPicker(); });
    box.appendChild(b);
  }
  for(const bl of BIRTHS.filter(x => !birthUnlocked(x))){
    const s = document.createElement('span'); s.className = 'mbadge locked'; s.textContent = '🔒 ' + bl.unlockLabel; box.appendChild(s);
  }
}
