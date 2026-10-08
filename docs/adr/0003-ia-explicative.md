# ADR 0003 : IA Explicative

*Note: Le modèle utilisé via le Vercel AI SDK est `gemini-1.5-flash`, le modèle flash le plus récent et stable supporté par l'écosystème actuel.*

## Décision
Le LLM ne calcule AUCUNE quantité (prévision). Il reçoit les chiffres précalculés par le système et produit une explication structurée validée par Zod.

## Justification
- **Pourquoi le LLM ne calcule pas ?** : Les LLM (y compris Gemini) sont non déterministes et mauvais en calcul arithmétique. Leur confier la prévision risque de générer des nombres absurdes.
- **Méthode statistique** : La prévision est une moyenne mobile pondérée sur 12 semaines d'historique, corrigée par les réservations en cours pour le créneau ciblé.
- **Rôle de Gemini** : Gemini synthétise ces chiffres en une explication courte en français, alerte sur le gaspillage, et suggère une action, le tout formaté via un schéma Zod garanti.
- **Repli obligatoire** : Si l'API Gemini échoue (timeout de 5 secondes, erreur réseau), un repli statique ("Prévision de secours") prend le relais sans bloquer l'interface.
