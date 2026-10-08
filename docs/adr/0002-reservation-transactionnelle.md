# ADR 0002 : Réservation transactionnelle

## Décision
La réservation d'une place utilise une transaction Prisma avec mise à jour conditionnelle (`UPDATE ... WHERE reservedCount < capacity`).

## Justification
- **Pourquoi pas "lire puis écrire" ?** : Risque de surréservation. Deux étudiants pourraient lire `reservedCount = 10` et `capacity = 11` simultanément, et les deux réserveraient la même place, dépassant la capacité.
- **Le champ `activeKey String? @unique`** : Il garantit l'unicité du triplet `(userId, slotId, menuItemId)` pour les réservations *actives*. Rempli avec `${userId}-${slotId}-${menuItemId}` quand le statut est `PENDING` ou `CONFIRMED`, et `null` pour les autres états, il empêche par base de données un étudiant de réserver deux fois le même plat au même créneau.
- **Test de concurrence** : Le cas C-08 valide cette approche en envoyant 50 requêtes simultanées sur 1 place restante. La base doit garantir exactement 1 succès et 49 refus, sans jamais dépasser la capacité.
