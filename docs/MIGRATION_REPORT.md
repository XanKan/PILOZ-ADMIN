# Rapport de migration abonnement

## Avant

- `plans` : Essentiel, Pro et Business ;
- `subscriptions` : un abonnement par entreprise ;
- essais de 14 jours ;
- aucune intégration Stripe active.

## Après migration 202607240053

- mêmes tables et mêmes lignes comme source de vérité ;
- création additive d’une version 1 pour chaque plan ;
- rattachement des abonnements existants à cette version ;
- copie de leur prix contractuel ;
- conservation des statuts, essais, cycles et identifiants externes ;
- ajout des événements, remises et exceptions fonctionnelles ;
- aucune facturation ou conversion artificielle.

La migration ne supprime aucune table, aucune facture, aucun abonnement et aucune donnée fiscale.
