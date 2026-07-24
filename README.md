# PILOZ-ADMIN

Back-office interne de Piloz, distinct de `PILOZ-APP` et de `PILOZ-SITE`.

## Architecture

- React + TypeScript + Vite pour l’interface privée ;
- Supabase Auth avec MFA TOTP obligatoire ;
- Edge Function `platform-admin-api` comme frontière serveur ;
- fonctions PostgreSQL contrôlées par rôle, AAL2 et réauthentification récente ;
- journal d’audit append-only chaîné ;
- aucune clé `service_role` dans le navigateur ;
- aucune inscription publique et aucun mot de passe administrateur dans Git.

La migration et l’Edge Function partagées restent dans `PILOZ-APP`, source de vérité Supabase :

- `supabase/migrations/202607240053_platform_admin_foundation.sql` ;
- `supabase/functions/platform-admin-api/index.ts`.

## Développement local

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Seules `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont admises dans le frontend. La clé anonyme est publique par conception ; les droits réels restent imposés par le serveur et la RLS.

## Création du premier SA

1. Créer manuellement un utilisateur dans Supabase Auth, avec un mot de passe unique et non partagé.
2. Exécuter la migration `202607240053` et déployer `platform-admin-api` depuis `PILOZ-APP`.
3. Dans un terminal local, définir sans les enregistrer dans un fichier :

```powershell
$env:SUPABASE_URL="https://PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="VALEUR_SECRETE"
$env:ADMIN_USER_ID="UUID_AUTH_EXISTANT"
$env:ADMIN_EMAIL="adresse-du-compte-auth"
$env:ADMIN_FIRST_NAME="Prénom"
$env:ADMIN_LAST_NAME="Nom"
$env:BOOTSTRAP_CONFIRM="PILOZ_PLATFORM_ADMIN"
npm.cmd run bootstrap:admin
```

Le script ne crée aucun mot de passe. À la première connexion, l’administrateur doit obligatoirement enrôler un facteur TOTP avant d’accéder au back-office.

## Publication

Le workflow vérifie toujours le projet mais ne publie que si la variable GitHub `ADMIN_PRODUCTION_ENABLED` vaut `true`. Ne l’activer qu’après :

- migration appliquée ;
- Edge Function déployée ;
- premier SA créé ;
- MFA testé ;
- secrets publics Vite configurés dans GitHub ;
- DNS `admin` configuré comme CNAME vers GitHub Pages.

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) et [docs/SECURITY.md](docs/SECURITY.md).
