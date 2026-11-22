-- Domande Extra: a ogni risposta si associano il corso e l'anno di chi l'ha scritta (non l'identita).
-- Modifica additiva: le risposte gia raccolte restano com'e (non hanno il corso: non c'e modo di risalirvi, perche
-- le risposte Extra non sono collegate in nessun modo a chi le ha date). Da eseguire una volta nell'SQL Editor di Supabase.

-- 1. Dove si salvano corso, anno e fuori corso (stesse informazioni che hanno gia le compilazioni per materia)
alter table public.risposte_extra
  add column corso_id uuid references public.corsi_di_laurea(id) on delete set null,
  add column anno_studente smallint check (anno_studente between 1 and 6),
  add column fuori_corso boolean;

-- 2. L'invio le registra: stesso controllo di prima, in piu corso e anno dell'invio (v_corso, v_anno, p_fuori_corso)
CREATE OR REPLACE FUNCTION public.invia_compilazioni_verificate(p_hash text, p_edizione uuid, p_fuori_corso boolean, p_materie jsonb, p_anno smallint DEFAULT NULL::smallint, p_extra jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m jsonb;
  v_extra jsonb := coalesce(p_extra, '[]'::jsonb);
  v_fatto boolean;
  v_manc int;
  v_corso uuid;
  v_anno smallint := case when p_fuori_corso then null else p_anno end;
  v_scelta public.scelte_studenti%rowtype;
begin
  if p_hash is null or length(p_hash) < 32 then
    raise exception 'Verifica dello studente mancante';
  end if;
  if p_materie is null or jsonb_typeof(p_materie) <> 'array' or jsonb_array_length(p_materie) = 0 then
    raise exception 'Nessuna materia da inviare';
  end if;
  if jsonb_typeof(v_extra) <> 'array' then
    raise exception 'Risposte extra non valide';
  end if;
  if (select count(distinct e->>'materia_corso_id') from jsonb_array_elements(p_materie) e)
     <> jsonb_array_length(p_materie) then
    raise exception 'Una materia compare piu volte';
  end if;

  -- Tutte le materie di un invio appartengono allo stesso corso
  select min(mc.corso_id::text)::uuid into v_corso
    from jsonb_array_elements(p_materie) e
    join public.materie_corso mc on mc.id = (e->>'materia_corso_id')::uuid;
  if v_corso is null or (select count(distinct mc.corso_id)
                         from jsonb_array_elements(p_materie) e
                         join public.materie_corso mc on mc.id = (e->>'materia_corso_id')::uuid) <> 1 then
    raise exception 'Le materie inviate devono essere di un solo corso';
  end if;

  -- Corso e anno: al primo invio si registrano, poi devono restare quelli
  select * into v_scelta from public.scelte_studenti
    where edizione_id = p_edizione and studente_hash = p_hash;
  if found then
    if v_scelta.corso_id <> v_corso or v_scelta.fuori_corso <> p_fuori_corso
       or v_scelta.anno_studente is distinct from v_anno then
      raise exception 'In questa edizione hai gia inviato risposte con un altro corso o un altro anno: non si possono cambiare.';
    end if;
  else
    insert into public.scelte_studenti(edizione_id, studente_hash, corso_id, anno_studente, fuori_corso)
      values (p_edizione, p_hash, v_corso, v_anno, p_fuori_corso);
  end if;

  for m in select * from jsonb_array_elements(p_materie) loop
    begin
      insert into public.partecipazioni(edizione_id, materia_corso_id, studente_hash)
        values (p_edizione, (m->>'materia_corso_id')::uuid, p_hash);
    exception when unique_violation then
      raise exception 'Hai gia compilato una delle materie scelte. Torna indietro e togli quelle gia inviate.';
    end;
  end loop;

  perform public.invia_compilazioni(p_edizione, p_fuori_corso, p_materie, p_anno);

  v_fatto := exists (select 1 from public.partecipazioni_extra
                     where edizione_id = p_edizione and studente_hash = p_hash);
  if v_fatto then
    if jsonb_array_length(v_extra) > 0 then
      raise exception 'Hai gia risposto alle domande extra.';
    end if;
  elsif jsonb_array_length(v_extra) > 0
     or exists (select 1 from public.domande where attiva and categoria = 'extra' and obbligatoria) then
    if (select count(distinct e->>'domanda_id') from jsonb_array_elements(v_extra) e)
       <> jsonb_array_length(v_extra) then
      raise exception 'Una domanda extra compare piu volte';
    end if;
    if exists (select 1 from jsonb_to_recordset(v_extra)
                 as r(domanda_id uuid, valore_numero smallint, opzione_id uuid, testo text)
               where length(btrim(coalesce(r.testo, ''))) > 1000) then
      raise exception 'Una risposta scritta supera i 1000 caratteri';
    end if;

    -- Nessuna risposta a una domanda Extra che le risposte precedenti non prevedevano
    if exists (select 1 from jsonb_to_recordset(v_extra)
                 as r(domanda_id uuid, valore_numero smallint, opzione_id uuid, testo text)
               join public.domande d on d.id = r.domanda_id
               where not private.condizione_extra_ok(d.mostra_se_domanda_id, d.mostra_se_opzioni, v_extra)) then
      raise exception 'Una risposta extra non e prevista in base alle risposte precedenti';
    end if;

    select count(*) into v_manc
    from public.domande d
    where d.attiva and d.categoria = 'extra' and d.obbligatoria
      and private.condizione_extra_ok(d.mostra_se_domanda_id, d.mostra_se_opzioni, v_extra)
      and not exists (
        select 1 from jsonb_to_recordset(v_extra)
          as r(domanda_id uuid, valore_numero smallint, opzione_id uuid, testo text)
        where r.domanda_id = d.id
          and (r.valore_numero is not null or r.opzione_id is not null or btrim(coalesce(r.testo, '')) <> ''));
    if v_manc > 0 then
      raise exception 'Mancano % risposte obbligatorie nelle domande extra', v_manc;
    end if;

    insert into public.risposte_extra(edizione_id, domanda_id, valore_numero, opzione_id, testo, corso_id, anno_studente, fuori_corso)
      select p_edizione, r.domanda_id, r.valore_numero, r.opzione_id, nullif(btrim(r.testo), ''), v_corso, v_anno, p_fuori_corso
      from jsonb_to_recordset(v_extra)
        as r(domanda_id uuid, valore_numero smallint, opzione_id uuid, testo text)
      where r.valore_numero is not null or r.opzione_id is not null or btrim(coalesce(r.testo, '')) <> '';

    if jsonb_array_length(v_extra) > 0 then
      insert into public.partecipazioni_extra(edizione_id, studente_hash) values (p_edizione, p_hash)
        on conflict do nothing;
    end if;
  end if;
end
$function$;
