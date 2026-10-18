# GOULU — analyse de game design (0.14.0-dev)

Ce document répond à trois questions : pourquoi un joueur lance GOULU, pourquoi il y revient,
et pourquoi il accepterait d'y dépenser de l'argent. Il dit ce qui a été corrigé en 0.14
et ce qu'il reste à faire, par ordre de priorité.

---

## 1. Pourquoi on lance GOULU (l'accroche)

| Atout | Pourquoi ça marche |
|---|---|
| **Deux commandes simples** : maintenir pour aspirer, appuyer pour l'onde (un seul bouton en option) | Compréhensible en quelques secondes, jouable au téléphone dans le métro. C'est la simplicité des hits mobiles (Flappy Bird, Helix Jump, Stack). |
| **Le visuel** : un vrai trou noir de Schwarzschild en temps réel | C'est le « wow » de la capture d'écran et du clip. Aucun concurrent hyper-casual n'a ça. C'est l'argument marketing n° 1. |
| **Un fantasme simple** : « tu es un trou noir, tu as faim » | Clair, drôle, mémorisable. Le journal intérieur (« J'ai faim. ») donne une personnalité. |
| **Gratuit, sans installation** | Un lien suffit. Le lien de défi (« Bats-moi : … ») est un vrai moteur viral. |

**Verdict : l'accroche est forte.** Le risque n'est pas qu'on ne lance pas le jeu, c'est qu'on
le quitte au bout de 5 parties.

## 2. Pourquoi on reste (ou pourquoi on partait)

Un joueur reste quand trois boucles tournent en même temps :

1. **La boucle de 60 secondes (la partie)** : tension → maîtrise → récompense immédiate.
   GOULU l'a déjà, et elle est riche : parry, chaînes ×2/×4/×8, Perfect Chain, pulse sur le
   tempo, résonance, chaînes élémentaires, boss.
2. **La boucle de session (« encore une »)** : chaque partie, même ratée, doit faire avancer
   quelque chose.
3. **La boucle de plusieurs jours (« je reviens demain »)** : une raison concrète de revenir.

### Ce qui manquait (avant 0.14)

| Problème | Effet sur le joueur |
|---|---|
| Une partie ratée ne rapportait **rien** (sauf de rares quêtes) | « J'ai perdu 2 minutes. » → il ferme le jeu. C'était le trou n° 1. |
| Shards très rares : 3 par jour maximum + 20 avec la campagne, pour 80 nécessaires dans l'arbre | La progression s'arrêtait après la campagne. |
| **Combo Long** coûtait 5 shards et **ne faisait rien** (bug) | Le joueur paie et rien ne change : perte de confiance. |
| Mort = fin brutale, même après 3 minutes de partie parfaite | Frustration sans issue. |
| Tirage d'anomalies imposé | Un mauvais tirage gâche la partie sans que le joueur y puisse rien. |
| Boss au même rythme du début à la fin | Après 2 rencontres, plus de surprise. |
| La série de jours ne rapportait rien | Rien n'encourageait à revenir le lendemain. |
| Aucun cap visible après la partie | Le joueur ne sait pas quoi viser ensuite. |

### Ce que 0.14 ajoute

| Ajout | Boucle renforcée | Détail |
|---|---|---|
| **Niveau du trou noir** | session | XP à chaque partie : survie, poussières, parry, boss, Perfect Chain, score (plafonné). Chaque niveau donne 1 shard, et 3 shards tous les 5 niveaux. Barre animée en fin de partie, badge « Niv. » dans le menu. |
| **Bonus du jour : XP ×2** sur la première partie | plusieurs jours | Une raison simple de lancer le jeu chaque jour. Bandeau dans l'onglet Jouer. |
| **Seconde chance** | partie / session | Une fois par partie, après 15 s de jeu, contre 1 shard : 2 vies, 3 s d'invincibilité, charges pleines, l'écran est nettoyé. 6 s pour décider. Jamais au défi du jour (classement équitable). |
| **Relance des cartes** | partie | Une relance par partie à l'écran d'anomalie. |
| **Boss enragés** à mi-vie | partie | Consommateur plus agressif, Nuée plus rapide, Œil qui tire 3 projectiles plus souvent. Halo rouge, annonce, son. |
| **Prochain objectif** en fin de partie | session | Le déblocage le plus proche (« Skin Cramoisi · 34 / 50 parry »), ou un rappel quand une évolution est achetable. Point orange sur l'onglet Évolution. |
| **Paliers de série** | plusieurs jours | 3e jour : +1 shard ; tous les 7 jours : +3 shards. |
| **Combo Long réparé** | confiance | La fenêtre de combo s'allonge vraiment de 0,6 s. |

Ordre de grandeur : une partie classique de 60 à 90 s rapporte 150 à 250 XP (le double pour
la première du jour), soit environ un niveau par partie au début, puis un niveau toutes les
2 ou 3 parties vers le niveau 15. L'arbre d'évolution complet coûte 80 shards : environ
40 niveaux en comptant les 20 shards de la campagne, moins avec les quêtes et les séries.

## 3. Pourquoi on paierait

Un joueur paie pour trois raisons, dans cet ordre : **se montrer** (cosmétiques), **gagner du
temps** (accélérer une progression qu'il aime déjà) et **soutenir** un créateur qu'il apprécie.
Il refuse de payer pour gagner contre les autres : c'est ce qui tue la confiance.

### Ce qui est prêt dans le code

- **Une monnaie unique (les shards)** déjà au cœur de tout : évolutions, seconde chance,
  skin Prismatique. C'est exactement l'endroit où brancher une monnaie premium ou une pub
  récompensée, sans rien redessiner.
- **La seconde chance** est le moment de plus forte intention d'achat d'un jeu d'arcade
  (« ma meilleure partie, 1 shard pour continuer ? »). Aujourd'hui elle coûte des shards
  gagnés en jouant ; demain elle peut aussi s'offrir contre une pub regardée.
- **Les skins** changent la température et la teinte du disque d'accrétion rendu en WebGL :
  c'est un cosmétique visible et désirable, parfait pour une boutique.

### Modèle recommandé (ordre de mise en place)

1. **Pub récompensée facultative** (web : AdSense H5 Games / AppLixir ; app : AdMob)
   - « Regarde une pub → seconde chance gratuite » (en plus de l'option shard).
   - « Regarde une pub → double l'XP de cette partie » (une fois par jour).
   - Jamais de pub imposée entre deux parties : on perd plus de joueurs qu'on ne gagne d'argent.
2. **Pack Fondateur** (achat unique, 3 à 5 €) : un skin exclusif animé, +10 shards,
   pas de pub, nom dans les crédits. Le meilleur rapport effort/revenu pour un jeu solo.
3. **Boutique de skins** : 3 à 4 nouveaux disques par saison (thèmes : pulsar, quasar,
   naine blanche, disque « arc-en-ciel »), achetables en shards **ou** en euros.
4. **Passe de saison** (4 à 6 semaines, 3 à 5 €) : une piste gratuite et une piste premium
   alimentées par l'XP déjà en place. Uniquement des cosmétiques, des titres et des shards.

**Règles à ne jamais casser** : rien d'achetable ne doit compter au défi du jour (déjà le
cas : ni évolutions, ni seconde chance) ; le jeu doit rester entièrement jouable gratuitement.

### Contrainte technique importante

Le profil est stocké dans `localStorage` : n'importe qui peut s'ajouter des shards dans la
console. C'est acceptable pour des cosmétiques et un pack de soutien, mais **tout achat
réel doit être validé côté serveur** (Stripe Checkout + petite fonction serverless, ou
achats intégrés Google Play / App Store si le jeu est empaqueté avec Capacitor ou une TWA).

## 4. Feuille de route proposée

| Priorité | Lot | Pourquoi |
|---|---|---|
| 1 | **Mesures** (début / fin de partie, cause de mort, niveau, seconde chance acceptée ou non, rétention J1 / J7) | Sans chiffres, impossible de savoir ce qui retient vraiment. Plausible, Umami ou PostHog suffisent. |
| 2 | ~~**Classement mondial du défi du jour**~~ : **fait en 0.17** (Supabase, `supabase/daily_leaderboard.sql`) | Le défi identique pour tous est déjà prêt ; il lui manque le classement pour devenir un rendez-vous quotidien. |
| 3 | **Pub récompensée** pour la seconde chance et le double XP | Premier revenu, sans gêner personne. |
| 4 | ~~**Nouveau boss**~~ : **fait en 0.15**, le Pulsar (faisceau à renvoyer avec l'onde, sur le battement). Reste : nouvelles anomalies synergiques | La variété des parties est ce qui use le plus vite un roguelite. |
| 5 | **Pack Fondateur + boutique de skins** | Revenu principal, 100 % cosmétique. |
| 6 | **Missions hebdomadaires** et **passe de saison** | Rétention long terme, une fois la base de joueurs mesurée. |
| 7 | **Application** (Capacitor / TWA) pour le Play Store et l'App Store | Visibilité, notifications (« ta série de 6 jours t'attend »), achats intégrés. |

### Équilibrage à surveiller

- **Fait en 0.15** : les multiplicateurs de score des mutations (Faim, Pacte Noir, Fureur,
  Kamikaze) sont plafonnés à ×4 au total, sauf en mode Chaos où la démesure est le principe.
  Les chaînes de parry (Chaîne Libre ×12) restent libres : elles récompensent l'adresse.
- La seconde chance à 1 shard est volontairement bon marché pour être découverte ;
  à ajuster (par exemple 2 shards après le niveau 10) selon les mesures.

## 5. Un trou noir vivant (0.16)

Le joueur s'attache plus facilement à un personnage qu'à un curseur. Depuis la 0.16, le trou noir
exprime son état sans qu'on ait à lire un chiffre :

- **Humeurs** : affamé (disque terne, rotation lente), repu (brûlant, rapide), blessé (vacille,
  vire au rouge), en transe pendant la résonance, cœur qui s'accélère quand la menace approche.
- **Regard et sursaut** : le disque se penche vers la menace la plus proche ; un frôlement le fait tressaillir.
- **Jets polaires** sur une Perfect Chain, au multiplicateur ×9 et à chaque nouveau stade.
- **Stades** dans la partie (Graine → Avaleur → Dévoreur → Quasar), calculés sur ce que fait le
  joueur (poussières, parry, boss), affichés en fin de partie et sur le partage. La zone de
  collision ne change jamais.
- **Voix intérieure** selon le niveau du compte : perdu, puis arrogant, puis mélancolique.
- **Nom** proposé après la première partie, repris dans le menu et le texte de partage.
- **Accueil** selon l'absence (« Tu es revenu. J'avais faim. », « J'ai cru que tu m'avais oublié. »).
- **Menu** : toucher près du trou noir l'attire, il avale le geste.

## 6. Fin de partie et physique jouable (0.20)

Une partie infinie de 3,6 millions de points avait épuisé les 15 mutations (25 niveaux) : l'écran de choix
s'ouvrait vide et bloquait le jeu (corrigé en 0.19.1). Au-delà du correctif, la fin de partie manquait de décisions.

- **Fusions** (7) : deux mutations au maximum se combinent (Supernova, Horizon, Trou de ver, Quasar, Trésor stellaire,
  Singularité nue, Réaction en chaîne). Une fusion disponible est toujours proposée. Quand tout est pris :
  « Évolution complète » (+1 vie, charges pleines, points) au lieu d'un écran.
- **Paliers** : en partie infinie (et dans les modes sans fin), un palier par minute nommé d'après la vie des
  étoiles : antimatière +7 % par palier, points +20 %, musique plus intense. Record de palier gardé au profil.
- **Masse / évaporation de Hawking** : choix risque / récompense permanent. Équilibrage vérifié par simulation :
  maigrir n'affaiblit pas l'attraction (sinon spirale perdante), seule la croissance la renforce.
- **Orbites** : relâcher au bon moment place la poussière en orbite (8 au plus). Récompense l'adresse du relâché ;
  en simulation, le bouclier réduit nettement les coups reçus.
- **Étoile déchirée** (événement de rupture par effet de marée) : la « bombe » gagnée en aspirant longtemps, au
  risque d'aspirer aussi l'antimatière.
- **Menaces** : comète (lecture de la ligne d'avertissement), étoile à neutrons (gestion des charges), fronde
  (aspirer au mauvais moment l'accélère vers toi).
- **Le Trou Blanc** : boss « bras de fer » qui repousse la poussière, crache de l'antimatière et fuit dès qu'on
  relâche ; il faut l'aspirer longtemps, donc s'exposer, pour le frapper.
- **Drop** : la première mesure de chaque phrase musicale (intensité ≥ 2) double les pulses ; l'anneau du kick
  devient rose.

## 7. Garder l'envie à haut niveau (0.21)

Partie suivante : 32,5 millions de points au palier 11, « l'envie de jouer avait disparu ». Diagnostic :
le joueur était intouchable (zone de parry jusqu'à ×4,7 environ, onde ×3), il n'y avait plus de choix (22 mutations),
plus de but (pas de fin), et l'écran était saturé (messages répétés, cercles géants, barre de 22 icônes).

- **Défi** : 8 emplacements de mutation (oublier une mutation reconstruit les effets depuis les réglages du départ),
  rendements décroissants (Force +40/25/15 %, Instinct +50/25 %…), plafonds de portée (parry ×2,4, onde ×2,2).
- **But et fin** : Sagittarius A* au palier 10 (coalescence r ∝ (t_c − t)^¼, ondes gravitationnelles à deux fois
  la fréquence orbitale). En simulation (robot immortel, 4 graines), la partie se termine par la fusion vers 13 min.
- **Choix** : encaisser ou continuer à chaque palier (banque ⌈(n−1)/2⌉ éclats par palier, moitié en cas de mort).
- **Score** : au-delà de ×8, le produit des multiplicateurs est compressé (×1000 → ×34). Le même robot finit vers
  0,5 à 1 million au lieu de dizaines de millions ; affichage court (k, M). Le bonus d'anneau a été réduit.
- **Lisibilité** : 3 messages au plus, « CHAIN ×n » mis à jour au lieu d'empilé, cercles plus discrets quand ils
  grandissent, mutations dans la colonne de gauche, messages sous la barre de boss.
- **Variété** : un événement cosmique par palier, un secteur tous les 2 paliers, limite d'Eddington, contrats.

