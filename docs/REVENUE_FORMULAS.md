# Formules de revenus

Les calculs sont centralisés dans PostgreSQL.

- **MRR** : prix mensuel contractuel d’un abonnement `active` ou `past_due`. Pour un contrat annuel, prix annuel ÷ 12. Les essais, suspensions, résiliations et expirations sont exclus.
- **Remise en pourcentage** : MRR × pourcentage, uniquement jusqu’à la fin configurée.
- **Remise fixe** : valeur fixe convertie en centimes et retranchée du MRR, sans résultat négatif.
- **ARR** : MRR × 12.
- **Encaissements** : somme des paiements Piloz réels au statut `succeeded`, selon `paid_at`.
- **Remboursements** : somme des remboursements réels au statut `succeeded`, selon `refunded_at`.
- **Revenu net** : encaissements − remboursements.

MRR/ARR mesurent le revenu récurrent contractuel. Ils ne sont jamais présentés comme des encaissements bancaires.
