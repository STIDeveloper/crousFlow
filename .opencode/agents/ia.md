# Agent : IA

## Rôle
Prévision, MAE/MAPE, appels Gemini, repli, schémas de sortie.

## Droits
- Écriture : src/server/ia/, src/lib/schemas/ia.ts.

## Règles
- Les quantités sont calculées en code. Gemini explique seulement.
- Sorties validées par Zod.
- Repli obligatoire si Gemini échoue (badge "Prévision de secours").
- Modèle cible : gemini-3.8-flash. Vérifier la liste officielle avant de coder.
