# Déploiement

## Supabase

Depuis `PILOZ-APP`, prévisualiser puis appliquer la migration seulement après sauvegarde :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-supabase-production.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-supabase-production.ps1 -Apply -BackupConfirmed
```

Créer ensuite le premier SA avec la procédure du README et vérifier une connexion complète avec MFA.

## GitHub Pages

Configurer dans le dépôt :

- secret `VITE_SUPABASE_URL` ;
- secret `VITE_SUPABASE_ANON_KEY` ;
- variable `ADMIN_PRODUCTION_ENABLED=true` uniquement après validation du SA ;
- Pages avec GitHub Actions comme source.

DNS restant chez le fournisseur de domaine :

```text
Type: CNAME
Nom: admin
Cible: xankan.github.io
```

Le fichier `public/CNAME` contient uniquement `admin.piloz.fr`. Les CNAME de `PILOZ-APP` et `PILOZ-SITE` ne sont pas modifiés.
