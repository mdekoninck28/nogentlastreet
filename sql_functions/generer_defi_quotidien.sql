declare
  v_date date;
  v_heure integer;
  v_rue_id bigint;
begin
  -- Récupère la date et l'heure à Paris,
  -- indépendamment du fuseau du serveur.
  v_date := (now() at time zone 'Europe/Paris')::date;

  v_heure := extract(
    hour from (now() at time zone 'Europe/Paris')
  )::integer;

  -- Ne crée pas le défi avant midi, heure de Paris.
  if v_heure < 12 then
    return;
  end if;

  -- Évite de modifier un défi déjà créé pour cette date.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('nogent-la-street-defi')
  );

  if exists (
    select 1
    from public.defis_quotidiens d
    where d.date_defi = v_date
  ) then
    return;
  end if;

  -- Choisit une rue active non utilisée au cours
  -- des 7 jours précédents.
  select r.id
  into v_rue_id
  from public.rues r
  where r.actif = true
    and not exists (
      select 1
      from public.defis_quotidiens d
      where d.rue_id = r.id
        and d.date_defi between v_date - 30 and v_date - 1
    )
  order by random()
  limit 1;

  -- Si aucune rue n'est disponible, choisit
  -- quand même une rue active.
  if v_rue_id is null then
    select r.id
    into v_rue_id
    from public.rues r
    where r.actif = true
    order by random()
    limit 1;
  end if;

  if v_rue_id is null then
    raise exception
      'Aucune rue active disponible dans public.rues.';
  end if;

  insert into public.defis_quotidiens (date_defi, rue_id)
  values (v_date, v_rue_id)
  on conflict (date_defi) do nothing;
end;
