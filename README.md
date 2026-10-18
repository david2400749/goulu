# GOULU — Le trou noir affamé

![GOULU](assets/og-image.jpg)

**[▶ Jouer maintenant](https://david2400749.github.io/goulu/)** · gratuit · sans installation · mobile et ordinateur

Tu es un trou noir. Tu as faim.

Deux commandes séparées :

| | **ASPIRER** (maintenir) | **ONDE** (appuyer) |
|---|---|---|
| Ordinateur | ESPACE, flèche ← ou clic gauche | F, flèche →, Entrée ou clic droit |
| Téléphone | doigt posé n'importe où (repère en bas à gauche) | bouton ONDE en bas à droite |

- **Aspire** la poussière d'étoiles : elle recharge tes ondes.
- Lance l'**onde** pour détruire l'antimatière : **au dernier moment** pour un *parry*,
  **sur le battement** de la musique pour un *pulse*. Tu peux continuer d'aspirer pendant ce temps.
- L'ancien mode à un seul bouton (relâcher = onde) reste disponible dans les options.

Au programme : une campagne narrative en 10 chapitres, un défi du jour identique pour tous avec son classement mondial,
5 modes de jeu, 5 boss qui s'enragent à mi-vie (dont le Pulsar, dont on renvoie le faisceau en rythme, et le Trou Blanc), des mutations à chaque vague (avec une relance par partie),
des skins et un arbre d'évolution permanent. Chaque partie rapporte de l'XP : le trou noir monte de niveau
et gagne des shards, la première partie du jour compte double, et une *seconde chance* (1 shard) peut sauver une belle partie.
Partage ton score : le lien envoyé met tes amis au défi de le battre.

Le trou noir a une **masse** : il grossit en mangeant (attraction et points en hausse) et s'**évapore** s'il jeûne
(évaporation de Hawking, plus rapide pour un petit trou), mais un gros trou est plus facile à toucher.
Arrêter d'aspirer près du trou met la poussière en **orbite** : l'anneau rapporte en continu, annihile l'antimatière
qui le touche et, avalé d'un coup, donne un bonus. Une **étoile** passe parfois : aspirée assez longtemps, les forces
de marée la déchirent et l'éclair pulvérise l'antimatière. Nouvelles menaces : **comète** (annoncée par une ligne),
**étoile à neutrons** (deux ondes), **fronde** (elle se sert de ta gravité). Cinquième boss : **le Trou Blanc**.
En partie infinie, un **palier** par minute (plus dur, plus payant). Quand deux mutations sont au maximum, une carte
**fusion** les combine (7 fusions). Sur le *drop* de la musique, les pulses comptent double.

Le trou noir est vivant : il a faim, il jubile, il souffre, il regarde la menace, crache des jets
polaires sur une Perfect Chain et grandit de *Graine* à *Quasar* au fil de la partie. Tu peux le nommer.

Les options (bouton ⚙ du menu) permettent aussi de réinitialiser sa progression ; la pause permet de recommencer la partie en cours.

Le jeu s'installe comme une application depuis le navigateur (« Ajouter à l'écran d'accueil »).

---

## Développement

**Version actuelle : 0.20.0-dev, en développement.** Numérotation : `0.x.y` tant que le jeu est en
développement (suffixe `-dev` sur la branche de travail), `1.0.0` pour la première version officielle.
La version est définie dans `js/data.js` (`GAME_VERSION`, affichée dans le menu) et dans `package.json` ;
les tests vérifient que les deux sont identiques.

Ouvrir `index.html` dans un navigateur récent (WebGL2 recommandé ; sans WebGL2, un rendu 2D de secours prend le relais).
Test du repli : `index.html?nogl`. L'ancienne adresse `main.html` redirige vers `index.html`.

Publication : GitHub Pages publie automatiquement la branche `main`.

Tests de fumée (navigateur sans écran, lancés aussi par GitHub Actions sur chaque pull request) :

```
npm install
npx playwright install chromium
npm test
```

## Structure

```
index.html         markup (HUD, menus, écrans), balises de partage + ordre de chargement des scripts
main.html          redirection vers index.html (ancienne adresse)
manifest.webmanifest, assets/   icônes, image d'aperçu (partage), installation sur l'écran d'accueil
tests/smoke.js     tests de fumée Playwright (CI)
css/style.css      interface « instruments de bord »
js/
  util.js          dates, PRNG, graine
  data.js          campagne, évolutions, modes, vagues, poussières, anomalies, boss, quêtes, succès, skins
  profile.js       profil et sauvegarde locale (localStorage)
  state.js dom.js  constantes, état de partie, références DOM
  core.js          canvases, caméra (menu → partie), redimensionnement, résolution adaptative
  space.js         moteur WebGL2 (voir ci-dessous)
  render.js        couche scène (entités), overlay (repères), paramètres envoyés au GPU, repli 2D
  hud.js audio.js  HUD, audio synthétisé (SFX, musique générative adaptative, grondement gravitationnel)
  pulsar.js        le Pulsar : boss de rythme (faisceau calé sur le battement, renvoi par l'onde)
  cosmos.js        masse et évaporation, orbites, étoile déchirée, comète / étoile à neutrons / fronde,
                   paliers de la partie infinie, effets des fusions, Trou Blanc, drop de la musique
  alive.js         trou noir vivant : humeurs, regard, jets, stades, voix, nom, accueil
  leaderboard.js   classement mondial du défi du jour (Supabase, actif seulement sur github.io ou avec ?lb)
  meta.js          progression de compte : niveau / XP, bonus du jour, seconde chance, prochain objectif
  entities.js progression.js campaign.js lifecycle.js update.js   logique du jeu
  input.js ui.js boot.js main.js                                    entrées, menus, démarrage, boucle
archive/main.v11.html   version précédente (monolithe), intacte
supabase/daily_leaderboard.sql  schéma et fonctions du classement (copie de la migration appliquée)
docs/GAME_DESIGN.md     analyse de game design : pourquoi jouer, rester, payer ; feuille de route
```

Scripts classiques (pas de modules ES) pour que le jeu s'ouvre aussi en `file://`.

## Rendu

Trois couches : `#gl` (WebGL2) → `#c` (overlay 2D, non déformé) + une couche hors-écran
(poussières, antimatière, boss) que le shader déforme avec la lentille.

`space.js` :
- **Trou noir de Schwarzschild** : chaque pixel proche du trou intègre la géodésique lumineuse
  `u'' + u = 3/2 u²` dans son plan orbital. Ombre de rayon critique `3√3/2 Rs`, anneau de photons,
  disque d'accrétion mince traversé jusqu'à 3 fois (arche au-dessus et sous l'ombre), effet Doppler
  relativiste + redshift gravitationnel, couleur corps noir. Loin du trou : déflexion analytique `2/b + 2,945/b² + 5,33/b³`.
- **Zone de plongée** sous l'ISCO (3 Rs) : le gaz quitte le disque et tombe en spirale vers l'horizon,
  de plus en plus rougi et éteint. **Point chaud** en orbite képlérienne près de l'ISCO (sursauts façon Sgr A*).
- **Entraînement du référentiel** (Lense-Thirring) : le ciel lentillé est tordu autour du trou (∝ 1/b²), davantage quand on aspire.
- **Accrétion de Bondi** : gaz interstellaire qui spirale vers le trou, chauffé (T ∝ r^-3/4) puis rougi
  par le redshift gravitationnel g = √(1 − Rs/r) (intensité ∝ g⁴). Couronne X diffuse autour de la région interne.
- **Ciel** : nébuleuse + Voie lactée + galaxies lointaines cuites en texture, étoiles procédurales (4 couches), le tout
  rendu une fois à la résolution de l'écran puis rafraîchi à ~7 Hz (scintillement).
- **Post** : bloom 2 niveaux, aberration chromatique, tone mapping ACES, vignette, grain.
- **Qualité adaptative** : la résolution GL suit le temps GPU mesuré (`EXT_disjoint_timer_query`).

Le rayon de l'ombre = `bh.r` (rayon de jeu) : ce que tu vois est ce qui te touche. Il grandit avec le multiplicateur.

## Retours de jeu liés à la physique

- Maintenir (aspirer) : l'espace-temps se courbe plus (lentille ×1,55), le disque chauffe et tourne plus vite.
- Onde de choc : ondulation réfractive réelle du ciel, plus anneau de repère.
- Parry / ralenti : désaturation et teinte froide (dilatation du temps).
- Poussières : étirées vers le trou (spaghettification) et chauffées en approchant ; elles rougissent et pâlissent près de l'horizon.
- Matière qui tombe (`render.js`, couche lentillée) : grains en rotation képlérienne (Ω ∝ r^-3/2), chute bien plus rapide quand on
  aspire, puis gel apparent à l'horizon (vitesse ∝ 1 − Rs/r, redshift, extinction) : vu de loin, rien ne franchit jamais l'horizon.
- Aspirer : flou radial vers le trou (la lumière semble tirée vers lui) et torsion du ciel.
- Kick de la musique : le disque pulse.

## Musique

Générative et synthétisée en direct (`audio.js`), synthwave spatiale en la mineur, calée sur le tempo du jeu
(le kick reste le battement du *pulse*). Nappe d'accords désaccordée, basse, arpège en écho ping-pong, mélodie,
batterie, cloches cristallines, grande réverbération, sidechain sur le kick. L'arrangement suit la partie :
menu (calme, sans batterie) → début de partie → multiplicateur ×3 / danger → boss ou ×6 (grille plus sombre au boss).
- Skins : température et teinte du disque (`SKIN_GFX` dans `render.js`).
