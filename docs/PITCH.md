# Pitch CrousFlow (2 minutes)

**Hook (10 s)**
"Chaque midi, des milliers d'étudiants font la queue au CROUS. Certains renoncent, d'autres gaspillent. Le système actuel est à bout de souffle."

**Problème (20 s)**
"Cette situation génère des files d'attente interminables, une impossibilité d'anticiper les volumes à produire (donc du gaspillage alimentaire), et pénalise les étudiants déjà touchés par la précarité."

**Solution (30 s)**
"Voici CrousFlow. Une plateforme permettant aux étudiants de réserver leurs repas pour la semaine. La cuisine produit exactement ce qui est réservé, et notre IA Gemini prévoit la demande restante avec une précision redoutable en se basant sur l'historique et les tendances."

**Démo (50 s)**
"Laissez-moi vous montrer :
1. **Le parcours étudiant** : L'étudiant réserve son plat en 3 clics et obtient un ticket QR Code instantané, valide et sécurisé.
2. **Le dashboard cuisine** : Ici, les chefs voient des gros chiffres clairs. L'IA affiche ses prévisions avec un faisceau animé, et la jauge de préparation se remplit en temps réel.
3. **La console robustesse (Chaos)** : Nous testons tout en direct. Je clique sur 'Tout lancer'. 24 scénarios extrêmes sont validés, 24 succès. Le système est blindé."

**Chute (10 s)**
"Zéro file d'attente. Zéro gaspillage. Un outil qu'un CROUS pourrait déployer dès demain."

---

## Questions anticipées

**Q1 : Et si Gemini est en panne ?**
*Réponse* : Nous avons prévu un algorithme de repli statistique (moyenne mobile pondérée). Si Gemini ne répond pas, le système bascule de façon invisible et la cuisine obtient toujours ses prévisions. 

**Q2 : Comment évitez-vous la triche avec les QR Codes ?**
*Réponse* : Chaque QR Code est signé cryptographiquement côté serveur (HMAC). S'il est falsifié, expiré, ou déjà scanné, notre API le rejette immédiatement avec une erreur 400 ou 409.

**Q3 : Pourquoi Prisma et SQLite plutôt que PostgreSQL ?**
*Réponse* : Pour garantir une simplicité de déploiement et d'intégration lors de cette démo. L'architecture est totalement agnostique et nous pouvons migrer sur PostgreSQL en changeant simplement le *provider* Prisma.
