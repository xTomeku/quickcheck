-- Scelta multipla, parte 2: i due controlli del database che ammettevano solo la scelta singola.
-- Da eseguire dopo migrazione-scelta-multipla.sql (SQL Editor di Supabase). Modifica additiva.

-- 1. Una risposta a una domanda a scelta multipla e valida se l'opzione appartiene alla domanda,
--    come per la scelta singola (prima cadeva nel ramo «serve una risposta scritta»)
CREATE OR REPLACE FUNCTION private.valida_risposta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.domande%rowtype; mat uuid; ins_mat uuid; ins_doc uuid; ok boolean;
begin
  select * into d from public.domande where id = new.domanda_id;
  if not found or not d.attiva then raise exception 'Domanda non valida o non attiva'; end if;
  select mc.materia_id into mat
    from public.compilazioni c join public.materie_corso mc on mc.id = c.materia_corso_id
    where c.id = new.compilazione_id;
  if d.categoria in ('generica_docente','specifica_docente') then
    if new.insegnamento_id is null then raise exception 'Per una domanda sul docente serve l''insegnamento'; end if;
    select materia_id, docente_id into ins_mat, ins_doc from public.insegnamenti where id = new.insegnamento_id;
    if ins_mat is distinct from mat then raise exception 'Il docente non appartiene alla materia compilata'; end if;
  elsif new.insegnamento_id is not null then
    raise exception 'Insegnamento non ammesso per questa domanda';
  end if;
  if d.categoria = 'specifica_materia' then
    if not exists (select 1 from public.collegamenti_domanda where domanda_id = d.id and materia_id = mat) then
      raise exception 'Domanda non collegata a questa materia';
    end if;
  elsif d.categoria = 'specifica_docente' then
    if d.ambito_docente = 'docente' then
      ok := exists (select 1 from public.collegamenti_domanda where domanda_id = d.id and docente_id = ins_doc);
    else
      ok := exists (select 1 from public.collegamenti_domanda where domanda_id = d.id and insegnamento_id = new.insegnamento_id);
    end if;
    if not ok then raise exception 'Domanda non collegata a questo docente'; end if;
  end if;
  if d.tipo_risposta = 'scala' then
    if new.valore_numero is null or new.valore_numero < d.scala_min or new.valore_numero > d.scala_max then
      raise exception 'Valore fuori dalla scala';
    end if;
  elsif d.tipo_risposta in ('scelta_singola', 'scelta_multipla') then
    if new.opzione_id is null or not exists (select 1 from public.opzioni_risposta o where o.id = new.opzione_id and o.domanda_id = d.id) then
      raise exception 'Opzione non valida per questa domanda';
    end if;
  elsif new.testo is null then
    raise exception 'Serve una risposta scritta';
  end if;
  return new;
end $function$;

-- 2. Protezione delle domande: la scelta multipla vale come la singola per condizioni e numero di opzioni,
--    e una domanda a scelta singola con risposte gia raccolte puo diventare multipla (le risposte restano valide)
CREATE OR REPLACE FUNCTION private.proteggi_domande()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n int; mn int; mx int; g public.domande%rowtype; cambia_tipo boolean;
begin
  if tg_op = 'UPDATE' then
    -- Cambiare tipo e ammesso solo da scelta singola a scelta multipla
    cambia_tipo := new.tipo_risposta is distinct from old.tipo_risposta
      and not (old.tipo_risposta = 'scelta_singola' and new.tipo_risposta = 'scelta_multipla');
    if (exists (select 1 from public.risposte where domanda_id = old.id)
        or exists (select 1 from public.risposte_extra where domanda_id = old.id))
       and (new.categoria is distinct from old.categoria
         or cambia_tipo
         or new.testo is distinct from old.testo
         or new.scala_min is distinct from old.scala_min
         or new.scala_max is distinct from old.scala_max
         or new.ambito_docente is distinct from old.ambito_docente
         or new.mostra_se_domanda_id is distinct from old.mostra_se_domanda_id
         or new.mostra_se_opzioni is distinct from old.mostra_se_opzioni) then
      raise exception 'Domanda con risposte gia raccolte: disattivala e creane una nuova';
    end if;
    -- Una domanda da cui ne dipendono altre attive non si disattiva e non cambia natura
    if exists (select 1 from public.domande c where c.mostra_se_domanda_id = old.id and c.attiva)
       and (not new.attiva
         or new.categoria is distinct from old.categoria
         or cambia_tipo) then
      raise exception 'Altre domande attive dipendono da questa: disattivale prima';
    end if;
  end if;

  if new.mostra_se_domanda_id is not null then
    if new.categoria not in ('generica','generica_docente','extra') then
      raise exception 'La condizione e ammessa solo nelle domande generiche, generiche sui docenti ed Extra';
    end if;
    select * into g from public.domande where id = new.mostra_se_domanda_id;
    if not found or g.id = new.id then raise exception 'Domanda da cui dipende non valida'; end if;
    if g.categoria <> new.categoria then
      raise exception 'La domanda da cui dipende deve avere la stessa categoria';
    end if;
    if g.tipo_risposta not in ('scelta_singola', 'scelta_multipla') then
      raise exception 'La domanda da cui dipende deve essere a scelta singola o multipla';
    end if;
    if g.mostra_se_domanda_id is not null then
      raise exception 'La domanda da cui dipende non puo dipendere a sua volta da un''altra';
    end if;
    if new.attiva then
      if not g.attiva then
        raise exception 'Attiva prima la domanda da cui dipende';
      end if;
      if exists (select 1 from unnest(new.mostra_se_opzioni) o
                 where not exists (select 1 from public.opzioni_risposta r
                                   where r.id = o and r.domanda_id = g.id)) then
        raise exception 'La condizione usa opzioni che la domanda non ha piu: riscegli le opzioni';
      end if;
    end if;
  end if;

  if new.attiva then
    if new.tipo_risposta in ('scelta_singola', 'scelta_multipla') then
      select count(*) into n from public.opzioni_risposta where domanda_id = new.id;
      mn := private.get_setting_int('opzioni_min', 3);
      mx := private.get_setting_int('opzioni_max', 5);
      if n < mn or n > mx then
        raise exception 'Una domanda a scelta attiva deve avere da % a % opzioni (ora %)', mn, mx, n;
      end if;
    end if;
    if new.categoria in ('specifica_materia','specifica_docente')
       and not exists (select 1 from public.collegamenti_domanda where domanda_id = new.id) then
      raise exception 'Una domanda specifica attiva deve avere almeno un collegamento';
    end if;
  end if;
  return new;
end $function$;
