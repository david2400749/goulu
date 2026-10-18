# GOULU : proposition « vraie physique » (0.22 → 0.25)

Objectif : que GOULU devienne un **simulateur à temps compressé** de la vie d'un trou noir stellaire,
de sa naissance (effondrement d'une étoile massive) jusqu'à sa disparition (évaporation de Hawking),
sans perdre ce qui fait le jeu (deux commandes, parry, rythme).

Principe directeur : **les lois sont vraies, seul le temps est accéléré.**
Les rapports entre les grandeurs (ce qui augmente quand quoi augmente, dans quelle proportion) suivent
la physique réelle. Seules les durées sont compressées, sinon une partie durerait des millions d'années :
à la limite d'Eddington, un trou noir met environ 50 millions d'années pour multiplier sa masse par e (temps de Salpeter).

Chaque concept affiché dans le jeu porte une étiquette d'honnêteté :

| Étiquette | Sens |
|---|---|
| **OBSERVÉ** | mesuré (télescopes, ondes gravitationnelles, neutrinos) |
| **THÉORIE ÉTABLIE** | relativité générale, physique stellaire : prédit et testé indirectement |
| **HYPOTHÈSE** | sérieux mais jamais observé (rayonnement de Hawking, trous noirs primordiaux) |
| **LICENCE DE JEU** | simplification assumée pour que le jeu reste jouable |

---

## 1. État des lieux : ce qui est déjà juste, ce qui est faux

### Déjà très juste (à garder tel quel)

Le rendu (`js/space.js`) est déjà de niveau simulateur : géodésiques de Schwarzschild intégrées par pixel,
ombre de rayon `3√3/2 Rs`, anneau de photons, disque traversé plusieurs fois, Doppler relativiste,
redshift gravitationnel, ISCO à 3 Rs avec zone de plongée, Lense-Thirring, accrétion de Bondi.

### Incohérent avec la physique (à corriger en priorité)

| Aujourd'hui | Problème physique | Correction proposée |
|---|---|---|
| **Paliers** nommés NÉBULEUSE → PROTO-ÉTOILE → NAINE ROUGE → … → NAINE BLANCHE → ÉTOILE À NEUTRONS (`TIER_NAMES`, `js/data.js`) | Ce sont les étapes de la vie d'une **étoile**, et dans le désordre (une naine blanche ne devient pas une étoile à neutrons). Le joueur est déjà un trou noir. | Remplacer par les **vraies phases de la vie d'un trou noir** (section 3). La vie de l'étoile passe dans la cinématique de naissance. |
| **Évaporation de Hawking quand on jeûne** (`cosmos.js`, ligne ~315) | La forme `dM/dt ∝ −1/M²` est juste, mais pour 10 masses solaires la température de Hawking vaut 6×10⁻⁹ K, bien moins que le fond diffus cosmologique (2,7 K) : le trou **absorbe plus qu'il n'émet, il grossit**. Son évaporation prendrait environ 10⁷⁰ ans. Un trou noir ne maigrit jamais parce qu'il « a faim ». | Quand on jeûne, c'est le **disque d'accrétion** qui se vide et s'éteint (temps visqueux) : la luminosité et le multiplicateur baissent, la masse ne baisse pas. Hawking devient le sujet de l'épilogue (section 6). |
| **Limite d'Eddington à masse 1,4** | La limite d'Eddington ne plafonne pas la masse, elle plafonne le **débit d'accrétion** (la luminosité) : `L_Edd ≈ 1,26×10³¹ W par masse solaire`. Plus le trou est gros, plus il a le droit d'avaler vite. | Jauge **Ṁ / Ṁ_Edd** calculée sur la poussière avalée par seconde. Au-delà de 1 : la pression de radiation souffle la poussière, vents et jets. |
| **Stades** GRAINE → AVALEUR → DÉVOREUR → QUASAR (`alive.js`) | Un quasar est un trou noir **supermassif** (10⁶ à 10¹⁰ masses solaires). Un trou noir stellaire qui accrète avec des jets s'appelle un **microquasar** (Cygnus X-1, GRS 1915+105). | Stades réels : NOUVEAU-NÉ → ACCRÉTEUR → BINAIRE X → MICROQUASAR, puis SUPERMASSIF seulement après la fusion avec Sagittarius A*. |
| **Toucher de l'antimatière fait perdre de la masse** (`massHit`) | Tout ce qui tombe dans un trou noir ajoute de la masse, antimatière comprise : l'expérience ALPHA-g (CERN, 2023) a confirmé que l'antimatière tombe comme la matière. | Les **vies deviennent le disque** : l'antimatière s'annihile avec la matière du disque (éclair gamma) et le souffle. La masse du trou, elle, monte toujours un peu. |
| **Rayon de jeu ∝ M^0,35** | Le vrai rayon de Schwarzschild est ∝ M. | **Licence de jeu** gardée (sinon le trou remplit l'écran), mais le HUD affiche la vraie valeur en km. |
| **Fusion avec Sagittarius A\*** présentée comme un duel d'égaux | 10 contre 4,3 millions de masses solaires : c'est une **spirale à rapport de masse extrême (EMRI)**, cible du futur observatoire spatial LISA. | Garder la fin, la renommer correctement, ajouter le signal LISA. Le trou devient « une partie de Sgr A* » : c'est une vraie fin. |

---

## 2. La naissance : cinématique d'ouverture

**Quand** : en entier au premier lancement et depuis un bouton **« Naissance »** du menu ;
en version courte (5 s, passable d'un toucher) au début de chaque partie. La version courte montre
*quelle* naissance a eu lieu, car elle fixe les conditions de départ de la partie (masse, spin, vitesse, environnement).

### Déroulé (valeurs réelles, étoile de 25 masses solaires)

Durées de combustion d'après Woosley, Heger & Weaver (2002), arrondies. Le compteur d'âge défile en échelle logarithmique.

| # | Étape | Ce qu'on voit | Ce qui s'affiche |
|---|---|---|---|
| 1 | **Étoile massive** (supergéante bleue) | grosse étoile bleue qui pulse | « 25 M☉ · fusion de l'hydrogène · ≈ 7 millions d'années » |
| 2 | **Pelure d'oignon** | couches concentriques qui s'allument du centre | « Hélium ≈ 800 000 ans · Carbone ≈ 500 ans · Néon ≈ 1 an · Oxygène ≈ 5 mois · **Silicium ≈ 1 jour** » |
| 3 | **Noyau de fer** | cœur gris, terne, gros comme la Terre, ≈ 1,5 M☉ | « La fusion du fer consomme de l'énergie au lieu d'en produire. Plus rien ne soutient le cœur. » |
| 4 | **Effondrement** | le cœur implose (ralenti extrême) | « Moins d'une seconde · jusqu'à 70 000 km/s (≈ 0,23 c) · photodésintégration · capture électronique » |
| 5 | **Proto-étoile à neutrons, flash de neutrinos** | rebond, onde de choc, éclair blanc | « 10⁵⁸ neutrinos emportent 99 % de l'énergie (≈ 3×10⁴⁶ J) » (OBSERVÉ : SN 1987A, 1987) |
| 6 | **Seuil franchi** | la sphère se contracte encore | « Au-delà d'environ 2,2 à 2,5 M☉ (limite TOV), aucune pression ne résiste. » |
| 7 | **Horizon** | l'ombre apparaît, la lumière se courbe (le shader actuel prend le relais) | « Rs = 2GM/c² = 29,5 km pour 10 M☉ » · bouffée d'ondes gravitationnelles |
| 8 | **Ringdown** | l'horizon « sonne » et se calme en quelques millisecondes | « Il a perdu ses cheveux : il ne reste que masse, spin et charge. » → **le joueur prend la main** |

### Les branches de naissance (tirées au sort, ou choisies une fois débloquées)

Chaque branche est réelle et fixe des paramètres de départ différents : rejouabilité gratuite et pédagogique.

| Naissance | Statut | Départ de partie |
|---|---|---|
| **Supernova avec retombée** : l'explosion échoue en partie, la matière retombe | THÉORIE ÉTABLIE | ≈ 6 M☉, spin moyen, **beaucoup de débris** au début (retombée ∝ t^−5/3), petite vitesse de recul |
| **Supernova ratée (effondrement direct)** : l'étoile disparaît sans exploser | OBSERVÉ (candidats N6946-BH1, M31-2014-DS1, débattus) | ≈ 15 M☉, spin faible, **espace vide et calme**, départ lent mais masse élevée |
| **Collapsar** : étoile en rotation rapide, jets qui percent l'étoile | THÉORIE ÉTABLIE (sursauts gamma longs observés) | spin élevé (a* ≈ 0,9), **jets plus puissants** (ondes moins chères), débris en disque |
| **Fusion de deux étoiles à neutrons** (à débloquer) | OBSERVÉ (GW170817 et sa kilonova, 2017) | ≈ 2,7 M☉ (le plus petit trou noir possible), spin ≈ 0,7, nuage de kilonova (or, platine) |
| **Trou noir primordial** (à débloquer) | HYPOTHÈSE | masse minuscule, très chaud : seule naissance où Hawking compte dès le début (mode spécial) |
| **Graine supermassive** (à débloquer) | HYPOTHÈSE soutenue par JWST (trous noirs très massifs dès 500 millions d'années après le Big Bang) | univers jeune, gaz dense partout, but : devenir un quasar |

---

## 3. Les phases de vie : nouvelle progression (remplace `TIER_NAMES`)

Une phase par palier, dans l'ordre réel. Un **compteur d'âge** affiche l'âge réel du trou noir
(« âge : 3,2 millions d'années ») : il avance lentement en partie et saute à chaque phase.

| Palier | Phase | Physique | Effet de jeu |
|---|---|---|---|
| 1 | **Nouveau-né** | ringdown, horizon qui se stabilise | entrée en douceur, tutoriel |
| 2 | **Retombée** | les débris de l'étoile retombent, débit ∝ t^−5/3 | beaucoup de poussière qui diminue avec le temps |
| 3 | **Vagabond** | le recul de la naissance l'éjecte dans le milieu interstellaire ; accrétion de Bondi, Ṁ ∝ M² ρ | espace clairsemé : chaque poussière compte, grossir accélère tout |
| 4 | **Binaire X** | capture d'une étoile compagne, la matière déborde de son lobe de Roche, un disque se forme (Cygnus X-1, 21 M☉) | un **flux continu** arrive d'un côté de l'écran |
| 5 | **Microquasar** | alternance état dur (couronne, jets) / état mou (disque thermique) | deux états qui changent l'onde (jet étroit ou large) |
| 6 | **Rupture par effet de marée** | une étoile passe trop près, elle est déchiquetée | l'étoile déchirée actuelle devient un vrai moment de phase |
| 7 | **Binaire de trous noirs** | un autre trou noir s'approche, spirale, chirp | nouveau boss « Compagnon » (section 4, fusion) |
| 8 | **Migration** | friction dynamique vers le centre galactique | densité qui monte, antimatière plus nombreuse |
| 9 | **Noyau galactique** | proximité de Sgr A* (4,3 millions de M☉, image EHT 2022) | le ciel se déforme de plus en plus |
| 10 | **Spirale extrême (EMRI)** | chute vers Sgr A*, signal LISA | la fin actuelle, renommée et documentée |

---

## 4. Les lois de la physique comme mécaniques de jeu

C'est le cœur du « simulateur » : chaque mécanique est une loi.

| Loi | Formule | Mécanique | Ce que voit le joueur |
|---|---|---|---|
| **Rayon de Schwarzschild** | Rs = 2GM/c² (2,95 km par M☉) | taille de l'ombre et zone de collision | rayon réel en km dans le HUD |
| **Accrétion de Bondi** | Ṁ = 4πλ G²M²ρ / c_s³ | attraction passive ∝ M² × densité du secteur | grossir rend le trou plus vorace, et pas linéairement |
| **Limite d'Eddington** | L_Edd ≈ 1,26×10³¹ W × (M/M☉) | plafond sur le **débit** d'accrétion ; au-delà, la poussière est soufflée | jauge Ṁ/Ṁ_Edd, vents visibles au-dessus de 1 |
| **Spin (métrique de Kerr)** | 0 ≤ a* ≤ 0,998 (limite de Thorne) | **nouvelle jauge** : avaler de la matière qui tourne dans le bon sens fait monter le spin | l'ISCO rétrécit, le disque se rapproche de l'ombre (le shader a déjà un uniform `uSpin`) |
| **Efficacité radiative** | η = 1 − E_ISCO : 5,7 % (a* = 0) → 32 % (a* = 0,998) | points par poussière ∝ η(a*) | un trou qui tourne vite rapporte jusqu'à 5 fois plus |
| **Accrétion rétrograde** | ISCO à 9 GM/c² au lieu de 6 | la poussière arrivant à contre-sens **freine** le spin | choisir ce qu'on avale |
| **Montée en spin (Bardeen, 1970)** | spin maximal atteint quand la masse a été multipliée par √6 ≈ 2,45 | progression naturelle du spin sur une partie | — |
| **Jets de Blandford-Znajek** | les jets puisent dans l'énergie de rotation ; au plus 29 % de la masse (M − M_irr) | **l'onde coûte du spin, pas des charges arbitraires** | lancer une onde fait baisser le spin ; il faut recharger en avalant |
| **Ergosphère, processus de Penrose** | région entre l'horizon et 2GM/c² à l'équateur | la **fronde** devient un vrai effet : un objet qui frôle l'ergosphère repart avec de l'énergie volée au spin | — |
| **Forces de marée** | rayon de rupture r_t ≈ R*(M/M*)^⅓ ; force à l'horizon ∝ 1/M² | les étoiles sont déchirées plus loin quand le trou grossit ; la spaghettification est **plus violente pour un petit trou** | étirement visuel qui diminue en grossissant |
| **Retombée après rupture** | débit ∝ t^−5/3, environ la moitié de l'étoile reste liée | après une rupture, un flux de poussière qui décroît | — |
| **Théorème de calvitie** | seuls M, a*, Q subsistent | la couleur de ce qu'on avale disparaît à l'horizon | message pédagogique ; Q ignorée car un trou noir réel est neutralisé par le plasma ambiant (étiqueté) |
| **Théorème des aires (Hawking, 1971)** et **entropie de Bekenstein-Hawking** | l'aire de l'horizon ne diminue jamais ; S ∝ A ∝ M² | nouvelle statistique **« Entropie »** qui ne peut que monter : record honnête, non gonflable | OBSERVÉ : confirmé par GW150914 puis nettement par GW250114 (2025) |
| **Ondes gravitationnelles, fusion** | chirp (fréquence qui monte), ≈ 5 % de la masse rayonnée, spin final ≈ 0,7, recul jusqu'à des milliers de km/s | boss **Compagnon** : spirale, fusion, la masse finale est **inférieure** à la somme, l'écran recule (kick) | GW150914 : 36 + 29 → 62 M☉, 3 M☉ partis en ondes |
| **Dilatation du temps** | facteur √(1 − Rs/r) | le ralenti du parry près de l'horizon (déjà présent) est expliqué | — |

---

## 5. Comment le trou noir réagit à ce qu'il absorbe

Ce tableau répond directement à « comment un trou noir se comporte selon l'événement ».
Chaque ligne modifie M (masse), a* (spin) et L (luminosité du disque), et a un rendu visuel.

| Ce qui tombe | Masse | Spin | Luminosité, visuel | Réel |
|---|---|---|---|---|
| **Gaz interstellaire** (poussière dorée) | + faible | + si le gaz tourne dans le même sens | le disque chauffe (T ∝ r^−¾) | OBSERVÉ |
| **Gaz à contre-sens** | + faible | **−** | disque plus large (ISCO plus loin) | THÉORIE ÉTABLIE |
| **Étoile entière** (rupture de marée) | + ≈ la moitié de l'étoile | + ou − selon l'orbite | éclair qui dépasse Eddington pendant des mois, jets possibles | OBSERVÉ (Swift J1644+57, AT2018hyz…) |
| **Étoile à neutrons** | + ≈ 1,4 M☉ | + | **dépend du trou** : petit et rapide → elle est déchirée avant de tomber (kilonova, débris à avaler) ; gros ou lent → avalée d'un coup, sans lumière | OBSERVÉ (GW200105, GW200115 : avalées sans éclat) |
| **Autre trou noir** | + somme − 5 % | ≈ 0,7 après fusion | chirp, ringdown, recul | OBSERVÉ (plus de 200 fusions détectées) |
| **Antimatière** | + (elle a une masse positive) | — | **annihilation avec le disque** : éclair gamma qui le souffle → perte de vie | ALPHA-g 2023 + LICENCE DE JEU pour les ennemis |
| **Lumière** | + (E = mc²) | — | rien de visible | THÉORIE ÉTABLIE |
| **Planète, astéroïde** | + négligeable | — | déchiré bien avant l'horizon | THÉORIE ÉTABLIE |
| **Rien** (jeûne) | **inchangée** | inchangé | le disque se vide et s'éteint, le multiplicateur baisse | THÉORIE ÉTABLIE |

---

## 6. La disparition : épilogue « Le long sommeil »

Débloqué après la fin Sagittarius A* (ou en mode à part). Un défilement d'environ 60 s, échelle de temps logarithmique,
où le joueur peut encore avaler les dernières miettes pendant que l'univers s'éteint.

| Âge de l'univers | Événement | Statut |
|---|---|---|
| 10¹⁴ ans | les dernières étoiles s'éteignent | THÉORIE ÉTABLIE |
| 10¹⁹ à 10²⁰ ans | les galaxies se dispersent ou tombent dans leur trou central | THÉORIE ÉTABLIE |
| > 10³⁴ ans | désintégration éventuelle des protons | HYPOTHÈSE |
| 10⁴⁰ ans | **ère des trous noirs** : il ne reste presque qu'eux | THÉORIE ÉTABLIE |
| quand le fond cosmologique devient plus froid que T_H | le trou commence enfin à perdre plus qu'il ne reçoit | HYPOTHÈSE (Hawking) |
| ≈ 2×10⁶⁷ ans × (M/M☉)³ | évaporation : T_H = 6,2×10⁻⁸ K × (M☉/M) monte à mesure qu'il rétrécit | HYPOTHÈSE |
| dernière seconde | il reste environ 230 tonnes, libérées d'un coup (≈ 2×10²² J) | HYPOTHÈSE |
| après | **personne ne sait** : paradoxe de l'information, reste éventuel | question ouverte |

L'écran se termine sur cette question ouverte. Ce n'est pas un échec du jeu : c'est la frontière actuelle de la physique.

---

## 7. Interface et pédagogie

- **Panneau « Instruments »** (dans le style actuel « instruments de bord »), repliable :
  masse en M☉, spin a*, Rs en km, Ṁ/Ṁ_Edd, température du disque, entropie, âge réel.
- **Archives** (nouvel onglet) : une fiche par phénomène, débloquée la première fois qu'on le vit.
  Chaque fiche contient la loi, la formule, une observation réelle datée (Cygnus X-1 en 1971, SN 1987A, GW150914 en 2015,
  M87* en 2019, Sgr A* en 2022, GW250114 en 2025), l'étiquette d'honnêteté et ce que le jeu simplifie.
  Les fiches remplacent une partie des messages qui saturent l'écran.
- **Voix intérieure** réécrite pour coller aux phases (« Je suis né d'une étoile qui ne pouvait plus se porter. »).
- **Mode Simulation** (nouveau mode) : mêmes lois, moins de licences (pas de vies, le disque est la jauge ;
  pas de mutations ; but : maximiser l'entropie avant la fin). Les modes arcade gardent leurs mutations
  mais adoptent toutes les corrections des sections 1, 3 et 5.

---

## 8. Plan de livraison

| Version | Contenu | Fichiers principaux |
|---|---|---|
| **0.22 · Naissance** (faite) | `js/physics.js` (fonctions pures en unités réelles : Rs, T_H, L_Edd, η(a*), r_ISCO(a*), r_t, durée de vie) ; cinématique de naissance (complète + courte) et ses 3 branches de base ; nouvelles phases (`TIER_NAMES`) et stades ; jeûne = le disque s'éteint, plus d'évaporation ; vies = disque ; panneau Instruments | `physics.js`, nouveau `birth.js`, `data.js`, `cosmos.js`, `alive.js`, `hud.js`, `index.html` |
| **0.23 · Kerr** | spin a*, efficacité radiative, accrétion rétrograde, onde = jet Blandford-Znajek, ergosphère pour la fronde, branchement de `uSpin` sur l'ISCO du shader | `cosmos.js`, `update.js`, `space.js`, `render.js` |
| **0.24 · Absorption et fusion** | matrice d'absorption (section 5), étoile à neutrons conditionnelle, boss Compagnon (fusion, recul, théorème des aires), entropie, EMRI Sgr A* renommée | `cosmos.js`, `endgame.js`, nouveau boss dans `data.js` |
| **0.25 · Archives et fin** | onglet Archives, épilogue « Le long sommeil », naissances à débloquer, mode Simulation | `ui.js`, `endgame.js`, `data.js` |

Tests : `tests/smoke.js` vérifie les constantes de `physics.js` contre les valeurs de référence
(Rs(1 M☉) ≈ 2,95 km, T_H(1 M☉) ≈ 6,2×10⁻⁸ K, η(0) ≈ 5,7 %, r_ISCO(0) = 6 GM/c², r_ISCO(1) = GM/c²)
pour que la physique ne régresse jamais en silence.

Équilibrage : chaque changement de mécanique passe par le robot de simulation déjà utilisé en 0.20 et 0.21
(durée de partie, coups reçus, score médian) avant d'être poussé.

---

## 9. Décisions prises

Validées pour la 0.22 : cinématique complète la première fois puis version courte à chaque partie ; évaporation au jeûne
supprimée ; réalisme maximal réservé au futur mode Simulation. L'onde qui coûte du spin (question 3) sera tranchée en 0.23.
La limite d'Eddington sur le débit, prévue en 0.23, est arrivée dès la 0.22 : sans l'évaporation, la masse ne fait que
monter, et un plafond sur la masse aurait pénalisé chaque partie longue.

### Questions initiales

1. **Cinématique** : complète au premier lancement + version courte à chaque partie (proposé), ou complète à chaque première partie du jour ?
2. **Évaporation au jeûne** : la supprimer (proposé, c'est faux) ou la garder en l'étiquetant LICENCE DE JEU ?
3. **Onde = jet qui coûte du spin** : remplacer les charges actuelles (plus juste, change la sensation de jeu) ou garder les charges et ajouter le spin à côté ?
4. **Mode Simulation à part** (proposé) ou réalisme maximal dans tous les modes ?

---

### Sources principales

- Woosley, Heger & Weaver (2002), *The evolution and explosion of massive stars*, Rev. Mod. Phys. 74.
- Bardeen (1970) ; Novikov & Thorne (1973) ; Thorne (1974) : accrétion et spin des trous noirs de Kerr.
- Blandford & Znajek (1977) : extraction de l'énergie de rotation par les jets.
- Hawking (1971, théorème des aires ; 1974-1975, rayonnement) ; Bekenstein (1973, entropie).
- Rees (1988) : rupture par effet de marée, retombée ∝ t^−5/3.
- Adams & Laughlin (1997), *A dying universe* : ères cosmologiques.
- LIGO-Virgo-KAGRA : GW150914, GW170817, GW200105/GW200115, GW250114.
- Event Horizon Telescope : M87* (2019), Sgr A* (2022).
- ALPHA-g (2023), Nature 621 : chute de l'antihydrogène.
