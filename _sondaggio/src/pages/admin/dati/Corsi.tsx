import { useState, type FormEvent } from 'react'
import PulsanteElimina from '../../../components/PulsanteElimina'
import {
  ANELLO_APERTO,
  Avviso,
  Azioni,
  Campo,
  Input,
  Pulsante,
  Select,
  StatoPill,
  TestataSezione,
  useAlApertura,
} from '../../../components/ui'
import type { Tables } from '../../../lib/database.types'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'
import MaterieCorso from './MaterieCorso'

type Corso = Tables<'corsi_di_laurea'> & { materie_corso: { count: number }[] }

// Cosa sta facendo il modulo aperto
type Modulo = { azione: 'nuovo' } | { azione: 'modifica' | 'duplica'; corso: Corso }

const TIPI: Record<string, string> = {
  triennale: 'Triennale',
  magistrale: 'Magistrale',
  ciclo_unico: 'Ciclo unico',
}

// Il nome dei corsi è unico nel dipartimento: si propone il primo «(copia)» ancora libero
function nomeCopia(nome: string, esistenti: string[]) {
  const occupati = new Set(esistenti)
  let candidato = `${nome} (copia)`
  for (let i = 2; occupati.has(candidato); i++) candidato = `${nome} (copia ${i})`
  return candidato
}

export default function Corsi() {
  const { righe, errore, ricarica } = useElenco<Corso>(
    () => supabase.from('corsi_di_laurea').select('*, materie_corso(count)').order('nome'),
    'corsi',
  )
  const [modulo, setModulo] = useState<Modulo | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [materieAperte, setMaterieAperte] = useState<string | null>(null)

  async function cambiaStato(corso: Corso) {
    const nMaterie = corso.materie_corso[0]?.count ?? 0
    if (corso.attivo && nMaterie > 0) {
      const ok = window.confirm(
        `Il corso ha ${nMaterie} materie collegate. Disattivandolo non sarà più scelto dagli studenti. Continuare?`,
      )
      if (!ok) return
    }
    const { error } = await supabase
      .from('corsi_di_laurea')
      .update({ attivo: !corso.attivo })
      .eq('id', corso.id)
    setAvviso(error ? messaggioErrore(error) : null)
    ricarica()
  }

  return (
    <div className="space-y-4">
      <TestataSezione
        titolo="Corsi di laurea"
        aiuto="Apri «Materie» su un corso per scegliere quali materie ha e in che anno."
      >
        <Pulsante variante="primario" onClick={() => setModulo({ azione: 'nuovo' })}>
          Nuovo corso
        </Pulsante>
      </TestataSezione>

      {avviso && <Avviso>{avviso}</Avviso>}
      {errore && <Avviso>{errore}</Avviso>}

      {modulo && (
        // La chiave rifà il modulo da capo quando si passa a un altro corso o a un'altra azione
        <FormCorso
          key={modulo.azione === 'nuovo' ? 'nuovo' : `${modulo.azione}-${modulo.corso.id}`}
          modulo={modulo}
          nomiEsistenti={(righe ?? []).map((c) => c.nome)}
          onAnnulla={() => setModulo(null)}
          onSalvato={() => {
            setModulo(null)
            setAvviso(null)
            ricarica()
          }}
        />
      )}

      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : righe.length === 0 ? (
        <Avviso tipo="info">Nessun corso inserito. Crea il primo con «Nuovo corso».</Avviso>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {righe.map((c) => (
            <li
              key={c.id}
              className={`flex flex-wrap items-center gap-3 p-4 ${
                materieAperte === c.id ? 'relative z-10 my-2 rounded-xl bg-white shadow-lg ring-2 ring-inchiostro' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p
                    className={`text-[17px] font-bold ${c.attivo ? '' : 'text-slate-400 line-through'}`}
                  >
                    {c.nome}
                  </p>
                  <StatoPill attivo={c.attivo} />
                </div>
                <p className="text-sm text-slate-500">
                  {TIPI[c.tipo] ?? c.tipo} · {c.durata_anni} anni · {c.materie_corso[0]?.count ?? 0}{' '}
                  {c.materie_corso[0]?.count === 1 ? 'materia' : 'materie'}
                </p>
              </div>
              <Azioni>
                <Pulsante
                  variante={materieAperte === c.id ? 'attivo' : 'secondario'}
                  aria-expanded={materieAperte === c.id}
                  onClick={() => setMaterieAperte(materieAperte === c.id ? null : c.id)}
                >
                  {materieAperte === c.id ? 'Chiudi materie' : 'Materie'}
                </Pulsante>
                <Pulsante onClick={() => setModulo({ azione: 'modifica', corso: c })}>Modifica</Pulsante>
                <Pulsante onClick={() => setModulo({ azione: 'duplica', corso: c })}>Duplica</Pulsante>
                <Pulsante variante={c.attivo ? 'pericolo' : 'secondario'} onClick={() => cambiaStato(c)}>
                  {c.attivo ? 'Disattiva' : 'Riattiva'}
                </Pulsante>
                <PulsanteElimina
                  tipo="corso"
                  id={c.id}
                  nome={c.nome}
                  onEliminata={ricarica}
                  onMessaggio={setAvviso}
                />
              </Azioni>
              {materieAperte === c.id && (
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <MaterieCorso corsoFisso={c.id} onCambiato={ricarica} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Crea la copia e le collega le stesse materie, ognuna nello stesso anno. Restituisce un messaggio
// d'errore, oppure null se è andata bene.
async function duplicaCorso(
  origine: Corso,
  valori: { nome: string; tipo: string; durata_anni: number },
): Promise<string | null> {
  const { data: materie, error: errLettura } = await supabase
    .from('materie_corso')
    .select('materia_id, anno')
    .eq('corso_id', origine.id)
  if (errLettura) return messaggioErrore(errLettura)

  // Si controlla prima di creare qualcosa: il database rifiuterebbe comunque quelle materie
  const ultimoAnno = Math.max(0, ...(materie ?? []).map((m) => m.anno))
  if (ultimoAnno > valori.durata_anni) {
    return `Il corso ha materie fino al ${ultimoAnno}° anno: la durata non può essere inferiore.`
  }

  const { data: copia, error: errCorso } = await supabase
    .from('corsi_di_laurea')
    .insert({ ...valori, dipartimento_id: origine.dipartimento_id, attivo: origine.attivo })
    .select('id')
    .single()
  if (errCorso) {
    return errCorso.code === '23505'
      ? 'Esiste già un corso con questo nome: scegline un altro.'
      : messaggioErrore(errCorso)
  }

  if (!materie || materie.length === 0) return null
  const { error: errMaterie } = await supabase
    .from('materie_corso')
    .insert(materie.map((m) => ({ materia_id: m.materia_id, anno: m.anno, corso_id: copia.id })))
  if (!errMaterie) return null

  // Le materie si inseriscono tutte o nessuna: senza, si toglie anche il corso appena creato
  const { error: errPulizia } = await supabase.from('corsi_di_laurea').delete().eq('id', copia.id)
  return errPulizia
    ? `Le materie non sono state copiate e «${valori.nome}» è rimasto senza: eliminalo e riprova.`
    : messaggioErrore(errMaterie)
}

function FormCorso({
  modulo,
  nomiEsistenti,
  onAnnulla,
  onSalvato,
}: {
  modulo: Modulo
  nomiEsistenti: string[]
  onAnnulla: () => void
  onSalvato: () => void
}) {
  const ref = useAlApertura<HTMLFormElement>()
  const corso = modulo.azione === 'nuovo' ? null : modulo.corso
  const [nome, setNome] = useState(() =>
    modulo.azione === 'duplica' ? nomeCopia(modulo.corso.nome, nomiEsistenti) : (corso?.nome ?? ''),
  )
  const [tipo, setTipo] = useState(corso?.tipo ?? 'triennale')
  const [durata, setDurata] = useState(String(corso?.durata_anni ?? 3))
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  const titolo =
    modulo.azione === 'nuovo'
      ? 'Nuovo corso'
      : modulo.azione === 'modifica'
        ? 'Modifica corso'
        : `Duplica «${modulo.corso.nome}»`
  const nMaterie = corso?.materie_corso[0]?.count ?? 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    const valori = { nome: nome.trim(), tipo, durata_anni: Number(durata) }

    let errDb: { code?: string; message: string } | null = null
    if (modulo.azione === 'duplica') {
      const messaggio = await duplicaCorso(modulo.corso, valori)
      setInvio(false)
      if (messaggio) setErrore(messaggio)
      else onSalvato()
      return
    }
    if (corso) {
      const r = await supabase.from('corsi_di_laurea').update(valori).eq('id', corso.id)
      errDb = r.error
    } else {
      // Il sondaggio riguarda un solo dipartimento: i corsi vi sono associati in automatico
      const { data: dip } = await supabase
        .from('dipartimenti')
        .select('id')
        .eq('attivo', true)
        .order('created_at')
        .limit(1)
      if (!dip || dip.length === 0) {
        setErrore('Manca il dipartimento nel database.')
        setInvio(false)
        return
      }
      const r = await supabase
        .from('corsi_di_laurea')
        .insert({ ...valori, dipartimento_id: dip[0].id })
      errDb = r.error
    }

    setInvio(false)
    if (errDb) setErrore(messaggioErrore(errDb))
    else onSalvato()
  }

  return (
    <form
      ref={ref}
      onSubmit={onSubmit}
      className={`space-y-4 rounded-xl border border-slate-300 bg-white p-4 ${ANELLO_APERTO}`}
    >
      <div>
        <h3 className="font-semibold">{titolo}</h3>
        {modulo.azione === 'duplica' && (
          <p className="mt-1 text-sm text-slate-500">
            {nMaterie === 0
              ? 'Il corso non ha materie da copiare.'
              : `La copia avrà le stesse materie (${nMaterie}), ognuna nello stesso anno. Sono le stesse materie, non dei doppioni: docenti e nome restano in comune con il corso originale.`}
          </p>
        )}
      </div>
      <Campo etichetta="Nome">
        <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
      </Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo etichetta="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(TIPI).map(([valore, etichetta]) => (
              <option key={valore} value={valore}>
                {etichetta}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo etichetta="Durata in anni">
          <Input
            type="number"
            min={1}
            max={6}
            required
            value={durata}
            onChange={(e) => setDurata(e.target.value)}
          />
        </Campo>
      </div>
      {errore && <Avviso>{errore}</Avviso>}
      <div className="flex gap-2">
        <Pulsante type="submit" variante="primario" disabled={invio}>
          {invio ? 'Salvataggio…' : modulo.azione === 'duplica' ? 'Crea copia' : 'Salva'}
        </Pulsante>
        <Pulsante variante="testo" onClick={onAnnulla}>
          Annulla
        </Pulsante>
      </div>
    </form>
  )
}
