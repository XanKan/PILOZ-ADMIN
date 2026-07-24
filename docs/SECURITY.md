# Sécurité

- MFA TOTP obligatoire (`aal2`) pour tous les rôles plateforme.
- Aucune inscription publique.
- Aucune promotion en administrateur depuis le navigateur.
- Bootstrap local avec variables d’environnement et utilisateur Auth préexistant.
- Session fermée après 20 minutes d’inactivité côté interface ; registre serveur touché à chaque appel et expirant après 30 minutes.
- Réauthentification mot de passe + TOTP pour les actions sensibles.
- Permissions indépendantes : super, support, facturation, conformité et lecture seule.
- Requêtes paginées côté serveur et recherche indexée.
- RLS spécifique aux administrateurs plateforme.
- `SECURITY DEFINER` avec `search_path` explicite et contrôle d’identité/permission pour les points d’entrée.
- Audit append-only avec `previous_hash` / `event_hash` SHA-256.
- CSP, `noindex`, `nofollow`, `robots.txt` et absence de sitemap.
- CORS limité à `admin.piloz.fr` et aux ports locaux de développement.
- La clé `service_role` est interdite dans `src`, `public` et le bundle. L’Edge Function ne la lit côté serveur que pour les invitations Auth, suspensions Auth et e-mails de réinitialisation, après contrôle JWT + AAL2 + permission ; elle n’est jamais renvoyée au client.

`robots.txt` n’est pas une mesure d’authentification : toutes les données restent protégées par JWT, MFA, permissions et RLS.
