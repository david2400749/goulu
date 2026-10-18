-- GOULU — classement du défi du jour (projet Supabase « goulu », région eu-west-3).
-- Migration appliquée le 2026-10-18 sous le nom « daily_leaderboard ». Ce fichier en est la copie
-- de référence : pour recréer la base ailleurs, l'exécuter tel quel dans l'éditeur SQL de Supabase.
--
-- Sécurité : la table n'est accessible qu'au travers de deux fonctions qui valident les données.
-- Aucun accès direct (RLS activé sans politique, droits retirés à anon et authenticated) ;
-- l'identifiant des joueurs n'est jamais renvoyé. Les alertes « SECURITY DEFINER exécutable par
-- anon » du conseiller Supabase sont donc attendues : ces deux fonctions SONT l'API publique.
-- Limite connue : un tricheur déterminé peut envoyer un faux score plausible (≤ 2 000 000) ;
-- seule une vérification serveur de la partie l'empêcherait.

create table public.daily_scores (
  day        text        not null check (day ~ '^\d{8}$'),
  player_id  uuid        not null,
  name       text        not null check (char_length(name) between 1 and 16),
  score      integer     not null check (score > 0 and score <= 2000000),
  updated_at timestamptz not null default now(),
  primary key (day, player_id)
);
create index daily_scores_day_score_idx on public.daily_scores (day, score desc);
alter table public.daily_scores enable row level security;
revoke all on public.daily_scores from anon, authenticated;

-- Envoi d'un score : garde le meilleur score du joueur pour ce jour, renvoie son rang.
create or replace function public.submit_daily_score(p_day text, p_player uuid, p_name text, p_score integer)
returns table (rank integer, total integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]<>]', '', 'g')), 16);
  v_day  date;
begin
  if p_day !~ '^\d{8}$' then raise exception 'jour invalide'; end if;
  v_day := to_date(p_day, 'YYYYMMDD');
  -- le jour est celui du joueur (fuseau local) : on tolère un jour d'écart avec le serveur
  if v_day < current_date - 1 or v_day > current_date + 1 then raise exception 'jour hors délai'; end if;
  if p_player is null then raise exception 'joueur manquant'; end if;
  if p_score is null or p_score <= 0 or p_score > 2000000 then raise exception 'score invalide'; end if;
  if v_name = '' then v_name := 'Trou noir'; end if;

  insert into public.daily_scores as s (day, player_id, name, score)
  values (p_day, p_player, v_name, p_score)
  on conflict (day, player_id) do update
    set score = greatest(s.score, excluded.score),
        name = excluded.name,
        updated_at = now();

  return query
    select (select count(*)::integer + 1 from public.daily_scores o
             where o.day = p_day and o.score > (select m.score from public.daily_scores m where m.day = p_day and m.player_id = p_player)),
           (select count(*)::integer from public.daily_scores t where t.day = p_day);
end;
$$;

-- Lecture du classement d'un jour (noms et scores seulement).
create or replace function public.daily_leaderboard(p_day text, p_limit integer default 10)
returns table (rank integer, name text, score integer, total integer)
language sql
stable
security definer
set search_path = ''
as $$
  select (rank() over (order by s.score desc))::integer, s.name, s.score,
         (select count(*)::integer from public.daily_scores t where t.day = p_day)
  from public.daily_scores s
  where s.day = p_day
  order by s.score desc, s.updated_at asc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

revoke all on function public.submit_daily_score(text, uuid, text, integer) from public;
revoke all on function public.daily_leaderboard(text, integer) from public;
grant execute on function public.submit_daily_score(text, uuid, text, integer) to anon, authenticated;
grant execute on function public.daily_leaderboard(text, integer) to anon, authenticated;
