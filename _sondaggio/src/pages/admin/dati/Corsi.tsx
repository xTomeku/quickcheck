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

const TIPI: Record<string, string> = {
  triennale: 'Triennale',
  magistrale: 'Magistrale',
  ciclo_unico: 'Ciclo unico',
}

export default function Corsi() {
  const { righe, errore, ricarica } = useElenco<Corso>(
    () => supabase.from('corsi_di_laurea').select('*, materie_corso(count)').order('nome'),
    'corsi',
  )
  const [modifica, setModifica] = useState<Corso | 'nuovo' | null>(null)
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
        <Pulsante variante="primario" onClick={() => setModifica('nuovo')}>
          Nuovo corso
        </Pulsante>
      </TestataSezione>

      {avviso && <Avviso>{avviso}</Avviso>}
      {errore && <Avviso>{errore}</Avviso>}

      {modifica && (
        <FormCorso
          corso={modifica === 'nuovo' ? null : modifica}
          onAnnulla={() => setModifica(null)}
          onSalvato={() => {
            setModifica(null)
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
                <Pulsante onClick={() => setModifica(c)}>Modifica</Pulsante>
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

function FormCorso({
  corso,
  onAnnulla,
  onSalvato,
}: {
  corso: Corso | null
  onAnnulla: () => void
  onSalvato: () => void
}) {
  const ref = useAlApertura<HTMLFormElement>()
  const [nome, setNome] = useState(corso?.nome ?? '')
  const [tipo, setTipo] = useState(corso?.tipo ?? 'triennale')
  const [durata, setDurata] = useState(String(corso?.durata_anni ?? 3))
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    const valori = { nome: nome.trim(), tipo, durata_anni: Number(durata) }

    let errDb: { code?: string; message: string } | null = null
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
      <h3 className="font-semibold">{corso ? 'Modifica corso' : 'Nuovo corso'}</h3>
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
          {invio ? 'Salvataggio…' : 'Salva'}
        </Pulsante>
        <Pulsante variante="testo" onClick={onAnnulla}>
          Annulla
        </Pulsante>
      </div>
    </form>
  )
}
