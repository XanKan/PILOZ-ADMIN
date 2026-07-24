# Architecture PILOZ-ADMIN

## Séparation

`PILOZ-ADMIN` est une application indépendante. Elle partage uniquement le projet Supabase de `PILOZ-APP`. Les rôles `platform_admins` sont sans relation avec les rôles `company_members` des entreprises clientes.

Le navigateur réalise l’authentification avec la clé publique anonyme, puis appelle uniquement `platform-admin-api` avec le JWT de l’administrateur. L’API vérifie successivement : origine autorisée, JWT réel, administrateur actif, MFA AAL2, session plateforme non expirée et permission. Les mutations sensibles repassent ensuite par des RPC transactionnelles qui répètent ces contrôles et écrivent l’audit. Les rares opérations Supabase Auth privilégiées utilisent la clé serveur injectée dans l’Edge Function, jamais dans le frontend.

## Source de vérité des abonnements

Les tables existantes `plans` et `subscriptions` restent la source de vérité. `subscription_plan_versions` fige les prix et capacités contractuels. Les abonnements existants sont reliés à la version 1 sans changement de statut, de cycle, d’essai ou d’identifiant externe.

Stripe n’est pas configuré à ce jour. Le champ `provider=manual` et l’état `not_configured` l’indiquent explicitement. Aucun paiement ou revenu encaissé n’est synthétisé.

## Parcours sensible

La modification d’abonnement, la suspension et le mode support demandent mot de passe + TOTP. Le nouveau JWT AAL2 est vérifié côté SQL, le motif est obligatoire, et l’ancienne puis la nouvelle valeur sont enregistrées dans l’audit.

Une session support expire après 30 minutes et est en lecture seule par défaut. Une bannière persistante permet de quitter immédiatement ce mode. Une suspension complète modifie les helpers RLS de l’application cliente afin de bloquer les membres sans supprimer leurs données.

## Fonctions livrées

- entreprises : recherche, pagination, création avec invitation, modification, suspension, réactivation et export administratif ;
- utilisateurs : liste réelle, invitation, rôles, suspension locale, transfert de propriété et réinitialisation d’accès ;
- abonnements : versions contractuelles, cycle, remises, essais, activation manuelle et résiliation programmée ;
- plans : versions immuables et overrides temporaires par entreprise ;
- opérations : facturation réelle ou état non configuré, revenus, support, conformité, RGPD, supervision, notifications et audit ;
- équipe Piloz : bootstrap unique puis invitations réservées au super administrateur.
