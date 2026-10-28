-- EventProfit : schéma Supabase (PostgreSQL) avec isolation par entreprise
-- MODE D'EMPLOI (débutant) :
-- 1. Créez un compte gratuit sur supabase.com, puis un projet (région proche, ex. Europe).
-- 2. Menu "SQL Editor" > collez TOUT ce fichier > Run.
-- 3. Menu "Project Settings > API" : copiez l'URL du projet et la clé "anon public".
-- 4. Dans votre application React, placez-les dans un fichier .env :
--      VITE_SUPABASE_URL=...      VITE_SUPABASE_ANON_KEY=...
--    NE mettez JAMAIS la clé "service_role" dans le code de l'application.
-- 5. Déploiement : Vercel ou Netlify (formule gratuite), en ajoutant les 2 variables ci-dessus.
-- Statut : ce schéma n'a PAS encore été exécuté ni testé sur un vrai projet Supabase.

create table companies (
  id uuid primary key default gen_random_uuid(),
  nom text not null, tel text, adresse text, logo_url text,
  devise text not null default 'FC',
  plan text not null default 'decouverte',        -- decouverte | professionnel | entreprise
  plan_statut text not null default 'essai',      -- essai | actif | suspendu | annule (activé à la main par l'admin)
  created_at timestamptz default now()
);

create table memberships (
  company_id uuid references companies on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null check (role in ('proprietaire','administrateur','collaborateur')),
  primary key (company_id, user_id)
);

create table platform_admins (user_id uuid primary key references auth.users);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  nom text not null, type text check (type in ('client','fournisseur')),
  tel text, email text, adresse text, notes text
);

create table events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  nom text not null, type text, contact_id uuid references contacts,
  date date, lieu text, participants int, budget numeric(14,2) default 0,
  contrat numeric(14,2) default 0,
  statut text not null default 'preparation'
    check (statut in ('preparation','confirme','en_cours','termine','annule')),
  archive boolean default false, notes text
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  event_id uuid not null references events on delete cascade,
  date date, montant numeric(14,2) not null check (montant >= 0),
  mode text, statut text not null default 'recu' check (statut in ('recu','en_attente')), reference text
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  event_id uuid not null references events on delete cascade,
  libelle text not null, categorie text, montant_prevu numeric(14,2) default 0,
  montant_reel numeric(14,2) default 0, date date, fournisseur_id uuid references contacts,
  statut text not null default 'prevue' check (statut in ('prevue','engagee','payee','annulee'))
);

create table audit_log (
  id bigserial primary key, company_id uuid, user_id uuid default auth.uid(),
  action text, created_at timestamptz default now()
);

-- Fonctions d'appartenance (évitent les boucles de règles)
create function is_member(c uuid) returns boolean language sql security definer stable as
$$ select exists(select 1 from memberships where company_id=c and user_id=auth.uid()) $$;
create function is_manager(c uuid) returns boolean language sql security definer stable as
$$ select exists(select 1 from memberships where company_id=c and user_id=auth.uid()
   and role in ('proprietaire','administrateur')) $$;

-- Sécurité ligne par ligne (RLS) : chaque entreprise ne voit que ses données
alter table companies enable row level security;
alter table memberships enable row level security;
alter table platform_admins enable row level security;
alter table contacts enable row level security;
alter table events enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table audit_log enable row level security;

create policy co_read on companies for select using (is_member(id));
create policy co_upd on companies for update using (is_manager(id));
-- Le plan et le statut d'abonnement ne doivent être modifiés que par l'admin plateforme (service_role / fonction serveur)
create policy mb_read on memberships for select using (is_member(company_id));
create policy mb_manage on memberships for all using (is_manager(company_id)) with check (is_manager(company_id));

create policy ct_all on contacts for all using (is_member(company_id)) with check (is_member(company_id));
create policy ev_all on events for all using (is_member(company_id)) with check (is_member(company_id));
create policy pay_all on payments for all using (is_member(company_id)) with check (is_member(company_id));
create policy exp_all on expenses for all using (is_member(company_id)) with check (is_member(company_id));
create policy au_read on audit_log for select using (is_manager(company_id));
create policy au_ins on audit_log for insert with check (is_member(company_id));

-- Création d'entreprise à l'inscription : le créateur devient propriétaire
create function create_company(p_nom text) returns uuid language plpgsql security definer as $$
declare c uuid;
begin
  insert into companies(nom) values (p_nom) returning id into c;
  insert into memberships values (c, auth.uid(), 'proprietaire');
  return c;
end $$;

-- Pour vous (administrateur de la plateforme), après votre propre inscription :
--   insert into platform_admins values ('<votre-user-id>');
-- Les écrans d'admin doivent appeler des fonctions serveur vérifiant platform_admins.
-- L'admin ne peut jamais lire les mots de passe : Supabase Auth ne les stocke que hachés.
