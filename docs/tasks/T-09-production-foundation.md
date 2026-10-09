# Tâche T-09 — Fondation de production

Agent : main  
Priorité : MUST  
Exigences : F-01 à F-16

## Objectif

Orchestrer la remise en conformité fonctionnelle de CrousFlow, en commençant par le parcours de réservation réel et ses invariants de sécurité.

## Découpage

- `backend` + `security` : contrats, réservation, tickets, sessions et protections serveur.
- `data` + `ia` : seed déterministe, agrégats et prévision explicable.
- `qa` + `chaos` : scénarios d'intégration et robustesse vérifiables.
- `frontend` : raccordement de l'interface uniquement après publication des contrats.

## Critères de sortie G2

- Aucun plat ou identifiant factice dans le parcours de réservation.
- Réservation, annulation et ticket respectent les règles configurées.
- Les contrôles de rôle et les opérations atomiques sont vérifiables par tests.
- Les résultats de chaos décrivent des opérations réelles, pas des résultats simulés.

## Handoff

Quand les contrats serveur sont disponibles, ouvrir les tâches écran étudiant, cuisine et administration à l'agent `frontend`, puis demander les revues UI et sécurité.
