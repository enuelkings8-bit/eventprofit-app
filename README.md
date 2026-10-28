# EventProfit 1.2 — guide pas à pas (pour débutant)

Ce projet est **à vous** : le code, la base de données et l'hébergement seront sur des comptes à votre nom.
État honnête : ce code n'a **pas encore été installé, compilé ni testé** (aucun accès réseau lors de sa création). Les premières commandes ci-dessous serviront aussi à le vérifier.

## Ce qui est inclus
Inscription / connexion / déconnexion / mot de passe oublié, création de l'entreprise, événements (création, recherche, statut, suppression avec confirmation), paiements, dépenses, tableau de bord avec alertes, calculs financiers testés (`src/calc.test.ts`), sécurité par entreprise (fichier `supabase.sql`).

## Pas encore inclus
Rapports PDF/CSV, contacts, logo et profil, rôles dans l'interface, abonnements, espace administrateur, pièces justificatives, graphique mensuel. (Le prototype 1.1 a déjà certains rapports et contacts ; ils seront portés ici ensuite.)

## Étape 1 — Vos comptes (tous gratuits au départ)
1. **GitHub** (github.com) : créez un compte avec VOTRE e-mail. Activez la double authentification.
2. **Supabase** (supabase.com) : connectez-vous avec GitHub, créez un projet, notez le mot de passe de base de données.
3. **Vercel** (vercel.com) : connectez-vous avec GitHub.

## Étape 2 — Base de données
Dans Supabase : *SQL Editor* → collez tout `supabase.sql` → *Run*.
Puis *Authentication → URL Configuration* : mettez l'adresse de votre site (voir étape 4) dans « Site URL ».
Puis *Project Settings → API* : copiez « Project URL » et la clé « anon public ». **Jamais** la clé « service_role » dans le code.

## Étape 3 — Tester sur votre ordinateur (Node.js 20+ requis)
```
cp .env.example .env     # puis collez vos 2 valeurs Supabase dans .env
npm install
npm test                 # vérifie les calculs financiers
npm run dev              # ouvre http://localhost:5173
```
Si une commande affiche une erreur, copiez-la-moi : je corrige.

## Étape 4 — Mettre en ligne
1. Créez un dépôt GitHub **privé** « eventprofit » et envoyez-y ce dossier (`git init`, `git add .`, `git commit`, `git push`). Le fichier `.env` est ignoré : vos clés ne partent pas sur GitHub.
2. Vercel → *Add New Project* → choisissez le dépôt → ajoutez les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` → *Deploy*.
3. Plus tard : achetez un nom de domaine à votre nom (ex. eventprofit.cd) et reliez-le dans Vercel.

## Ce qui prouve que vous contrôlez l'application
Le dépôt GitHub (code, historique de chaque modification), le projet Supabase (données et utilisateurs), le projet Vercel (publication) et le domaine, tous à votre nom. Gardez une sauvegarde de la base (Supabase → Database → Backups, ou export régulier).

## Sécurité à retenir
Chaque entreprise ne voit que ses données grâce aux règles RLS de `supabase.sql`. Testez-le avec deux comptes différents avant d'inviter de vrais clients. Les mots de passe sont gérés et hachés par Supabase Auth : personne, vous compris, ne peut les lire.
