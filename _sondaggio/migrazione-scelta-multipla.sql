-- Scelta multipla: una domanda a cui lo studente puo segnare piu risposte.
-- Modifica solo additiva: le domande e le risposte che ci sono gia continuano a funzionare come prima.
-- Da eseguire UNA volta sul database (SQL Editor di Supabase), prima di pubblicare il sito.

-- 1. Nuovo tipo di domanda: scelta multipla (non ammessa nelle Extra, dove le risposte non hanno un autore comune)
alter table public.domande drop constraint domande_tipo_risposta_check;
alter table public.domande add constraint domande_tipo_risposta_check
  check (tipo_risposta = any (array['scala'::text, 'scelta_singola'::text, 'scelta_multipla'::text, 'testo'::text]));
alter table public.domande add constraint scelta_multipla_non_extra
  check (tipo_risposta <> 'scelta_multipla' or categoria <> 'extra');

-- 2. Una risposta per domanda resta la regola, ma la scelta multipla puo avere una riga per ogni opzione scelta
drop index public.risposte_unica;
create unique index risposte_unica on public.risposte
  (compilazione_id, domanda_id, coalesce(insegnamento_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where opzione_id is null;
create unique index risposte_unica_opzione on public.risposte
  (compilazione_id, domanda_id, coalesce(insegnamento_id, '00000000-0000-0000-0000-000000000000'::uuid), opzione_id)
  where opzione_id is not null;

-- 3. Invio: stessi controlli di prima, piu uno che ammette piu opzioni solo nelle domande a scelta multipla
CREATE OR REPLACE FUNCTION public.invia_compilazioni(p_edizione uuid, p_fuori_corso boolean, p_materie jsonb, p_anno smallint DEFAULT NULL::smallint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m jsonb;
  v_mc uuid;
  v_materia uuid;
  v_comp uuid;
  v_saltati uuid[];
  v_mancanti int;
begin
  if p_materie is null or jsonb_typeof(p_materie) <> 'array' or jsonb_array_length(p_materie) = 0 then
    raise exception 'Nessuna materia da inviare';
  end if;
  if (select count(distinct e->>'materia_corso_id') from jsonb_array_elements(p_materie) e)
     <> jsonb_array_length(p_materie) then
    raise exception 'Una materia compare piu volte';
  end if;
  if not p_fuori_corso and p_anno is null then
    raise exception 'Indica il tuo anno oppure fuori corso';
  end if;

  for m in select * from jsonb_array_elements(p_materie) loop
    v_mc := (m->>'materia_corso_id')::uuid;
    select mc.materia_id into v_materia from public.materie_corso mc where mc.id = v_mc;
    if v_materia is null then raise exception 'Materia non valida'; end if;

    if exists (select 1 from jsonb_to_recordset(coalesce(m->'risposte', '[]'::jsonb)) as r(testo text)
               where length(btrim(coalesce(r.testo, ''))) > 1000) then
      raise exception 'Una risposta scritta supera i 1000 caratteri';
    end if;

    insert into public.compilazioni(edizione_id, materia_corso_id, anno_studente, fuori_corso)
      values (p_edizione, v_mc, case when p_fuori_corso then null else p_anno end, p_fuori_corso)
      returning id into v_comp;

    insert into public.blocchi_saltati(compilazione_id, insegnamento_id)
      select v_comp, t.val::uuid
      from jsonb_array_elements_text(coalesce(m->'blocchi_saltati', '[]'::jsonb)) as t(val);

    insert into public.risposte(compilazione_id, domanda_id, insegnamento_id, valore_numero, opzione_id, testo)
      select v_comp, r.domanda_id, r.insegnamento_id, r.valore_numero, r.opzione_id, nullif(btrim(r.testo), '')
      from jsonb_to_recordset(coalesce(m->'risposte', '[]'::jsonb))
        as r(domanda_id uuid, insegnamento_id uuid, valore_numero smallint, opzione_id uuid, testo text)
      where r.valore_numero is not null or r.opzione_id is not null or btrim(coalesce(r.testo, '')) <> '';

    -- Un testo solo nelle domande a risposta scritta, e solo testo in quelle
    if exists (
      select 1 from public.risposte r
      join public.domande d on d.id = r.domanda_id
      where r.compilazione_id = v_comp and ((r.testo is not null) <> (d.tipo_risposta = 'testo'))
    ) then
      raise exception 'Una risposta non corrisponde al tipo della domanda';
    end if;

    -- Piu risposte alla stessa domanda solo se e a scelta multipla
    if exists (
      select 1 from public.risposte r
      join public.domande d on d.id = r.domanda_id
      where r.compilazione_id = v_comp
      group by r.domanda_id, r.insegnamento_id, d.tipo_risposta
      having count(*) > 1 and d.tipo_risposta <> 'scelta_multipla'
    ) then
      raise exception 'Una domanda ammette una sola risposta';
    end if;

    -- Nessuna risposta a una domanda che, secondo le risposte precedenti, non andava mostrata
    if exists (
      select 1 from public.risposte r
      join public.domande d on d.id = r.domanda_id
      where r.compilazione_id = v_comp and d.mostra_se_domanda_id is not null
        and not exists (
          select 1 from public.risposte p
          where p.compilazione_id = v_comp and p.domanda_id = d.mostra_se_domanda_id
            and p.insegnamento_id is not distinct from r.insegnamento_id
            and p.opzione_id = any(d.mostra_se_opzioni))
    ) then
      raise exception 'Una risposta non e prevista in base alle risposte precedenti';
    end if;

    select coalesce(array_agg(t.val::uuid), '{}')
      into v_saltati
      from jsonb_array_elements_text(coalesce(m->'blocchi_saltati', '[]'::jsonb)) as t(val);

    -- Domande obbligatorie applicabili alla materia che non hanno risposta
    select count(*) into v_mancanti
    from (
      select d.id as domanda_id, null::uuid as insegnamento_id
      from public.domande d
      where d.attiva and d.obbligatoria
        and (d.categoria = 'generica'
          or (d.categoria = 'specifica_materia' and exists (
                select 1 from public.collegamenti_domanda c
                where c.domanda_id = d.id and c.materia_id = v_materia)))
        and (d.mostra_se_domanda_id is null or exists (
              select 1 from public.risposte p
              where p.compilazione_id = v_comp and p.domanda_id = d.mostra_se_domanda_id
                and p.insegnamento_id is null and p.opzione_id = any(d.mostra_se_opzioni)))
      union all
      select d.id, i.id
      from public.domande d
      join public.insegnamenti i on i.materia_id = v_materia
      join public.docenti dc on dc.id = i.docente_id and dc.attivo
      where d.attiva and d.obbligatoria
        and not (i.id = any(v_saltati))
        and (d.categoria = 'generica_docente'
          or (d.categoria = 'specifica_docente' and (
                (d.ambito_docente = 'docente' and exists (
                   select 1 from public.collegamenti_domanda c
                   where c.domanda_id = d.id and c.docente_id = i.docente_id))
             or (d.ambito_docente = 'insegnamento' and exists (
                   select 1 from public.collegamenti_domanda c
                   where c.domanda_id = d.id and c.insegnamento_id = i.id)))))
        and (d.mostra_se_domanda_id is null or exists (
              select 1 from public.risposte p
              where p.compilazione_id = v_comp and p.domanda_id = d.mostra_se_domanda_id
                and p.insegnamento_id = i.id and p.opzione_id = any(d.mostra_se_opzioni)))
    ) richieste
    where not exists (
      select 1 from public.risposte r
      where r.compilazione_id = v_comp
        and r.domanda_id = richieste.domanda_id
        and r.insegnamento_id is not distinct from richieste.insegnamento_id
    );
    if v_mancanti > 0 then
      raise exception 'Mancano % risposte obbligatorie', v_mancanti;
    end if;
  end loop;
end
$function$;

-- 4. Statistiche: n conta le persone che hanno risposto, non le singole opzioni scelte
-- (per scale e scelte singole e identico a prima; nella scelta multipla le percentuali possono superare il 100% in somma)
CREATE OR REPLACE FUNCTION public.stat_risposte(p_edizione uuid, p_gruppo text DEFAULT 'domanda'::text, p_corso uuid DEFAULT NULL::uuid, p_anno_corso smallint DEFAULT NULL::smallint, p_anno_studente smallint DEFAULT NULL::smallint, p_fuori_corso boolean DEFAULT NULL::boolean, p_materia uuid DEFAULT NULL::uuid, p_docente uuid DEFAULT NULL::uuid)
 RETURNS TABLE(domanda_id uuid, materia_id uuid, docente_id uuid, n bigint, somma bigint, distribuzione jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with base as (
    select r.domanda_id, mc.materia_id, i.docente_id, r.valore_numero, r.opzione_id,
           r.compilazione_id::text || ':' || coalesce(r.insegnamento_id::text, '') as chi
    from public.risposte r
    join public.compilazioni c on c.id = r.compilazione_id
    join public.materie_corso mc on mc.id = c.materia_corso_id
    left join public.insegnamenti i on i.id = r.insegnamento_id
    where c.edizione_id = p_edizione
      and r.testo is null
      and (p_corso is null or mc.corso_id = p_corso)
      and (p_anno_corso is null or mc.anno = p_anno_corso)
      and (p_anno_studente is null or c.anno_studente = p_anno_studente)
      and (p_fuori_corso is null or c.fuori_corso = p_fuori_corso)
      and (p_materia is null or mc.materia_id = p_materia)
      and (p_docente is null or i.docente_id = p_docente)
  ),
  gruppi as (
    select b.domanda_id,
           case when p_gruppo = 'domanda_materia' then b.materia_id end as materia_id,
           case when p_gruppo = 'domanda_docente' then b.docente_id end as docente_id,
           b.valore_numero, b.opzione_id, count(*) as k
    from base b
    group by 1, 2, 3, 4, 5
  ),
  persone as (
    select b.domanda_id,
           case when p_gruppo = 'domanda_materia' then b.materia_id end as materia_id,
           case when p_gruppo = 'domanda_docente' then b.docente_id end as docente_id,
           count(distinct b.chi) as n
    from base b
    group by 1, 2, 3
  )
  select g.domanda_id, g.materia_id, g.docente_id,
         p.n::bigint,
         coalesce(sum(g.valore_numero * g.k), 0)::bigint,
         jsonb_object_agg(coalesce(g.valore_numero::text, g.opzione_id::text), g.k)
  from gruppi g
  join persone p on p.domanda_id = g.domanda_id
    and p.materia_id is not distinct from g.materia_id
    and p.docente_id is not distinct from g.docente_id
  group by g.domanda_id, g.materia_id, g.docente_id, p.n
$function$;
