import { useState } from 'react'
import { Avviso, Pulsante } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { messaggioErrore } from '../../../lib/errori'
import { daRiga, type Agg } from '../../../lib/statistiche'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'
import type { DomandaRif } from './dati'
import RigaDomanda, { ElencoDomande } from './RigaDomanda'

type Props = { edizione: string; domande: DomandaRif[] }
type RigaTesto = { id: string; domanda_id: string; testo: string | null; nascosta: boolean }

// Domande Extra: raccolte una sola volta per studente, quindi senza i filtri per corso, anno o materia
export default function PerExtra({ edizione, domande }: Props) {
  const { ruolo } = useAuth()
  const puoNascondere = ruolo === 'admin' || ruolo === 'editor'
  const [avviso, setAvviso] = useState<string | null>(null)

  const stat = useElenco(
    async () => (edizione ? await supabase.rpc('stat_extra', { p_edizione: edizione }) : { data: [], error: null }),
    `extra-stat-${edizione}`,
  )
  const testi = useElenco<RigaTesto>(
    async () =>
      edizione
        ? await supabase
            .from('risposte_extra')
            .select('id, domanda_id, testo, nascosta')
            .eq('edizione_id', edizione)
            .not('testo', 'is', null)
            .limit(1000)
        : { data: [], error: null },
    `extra-testi-${edizione}`,
  )

  const extra = domande.filter((d) => d.categoria === 'extra').sort((a, b) => a.ordine - b.ordine)
  const perDomanda = new Map<string, Agg>((stat.righe ?? []).map((r) => [r.domanda_id, daRiga(r)]))

  async function nascondi(id: string, nascosta: boolean) {
    const { error } = await supabase.rpc('nascondi_risposta_extra', { p_id: id, p_nascosta: nascosta })
    setAvviso(error ? messaggioErrore(error) : null)
    testi.ricarica()
  }

  if (stat.righe === null || testi.righe === null) {
    return (
      <div className="space-y-3">
        {(stat.errore || testi.errore) && <Avviso>{stat.errore ?? testi.errore}</Avviso>}
        <p className="text-slate-500">Caricamento…</p>
      </div>
    )
  }

  if (extra.length === 0) {
    return <Avviso tipo="info">Non ci sono domande Extra. Creane una da Domande, scegliendo la categoria Extra.</Avviso>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Le domande Extra si chiedono una sola volta a ogni studente e non riguardano una materia:
        per questo qui si sceglie solo l'edizione.
      </p>
      {avviso && <Avviso>{avviso}</Avviso>}

      {extra.map((d) => {
        if (d.tipo_risposta !== 'testo') {
          return (
            <ElencoDomande key={d.id} domande={[d]}>
              <RigaDomanda domanda={d} agg={perDomanda.get(d.id)} />
            </ElencoDomande>
          )
        }
        const risposte = (testi.righe ?? []).filter((t) => t.domanda_id === d.id)
        const visibili = risposte.filter((t) => !t.nascosta).length
        return (
          <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-medium">{d.testo}</p>
            <p className="mt-1 text-sm text-slate-500">
              {risposte.length === 0
                ? 'Nessuna risposta'
                : `${risposte.length} ${risposte.length === 1 ? 'risposta scritta' : 'risposte scritte'}${
                    visibili < risposte.length ? ` · ${risposte.length - visibili} nascoste` : ''
                  }`}
            </p>
            {risposte.length > 0 && (
              <ul className="mt-3 space-y-2">
                {risposte.map((t) => (
                  <li
                    key={t.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                      t.nascosta ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200'
                    }`}
                  >
                    <p className="min-w-0 flex-1 break-words whitespace-pre-wrap">
                      {t.nascosta && <span className="mr-2 font-semibold">[Nascosta]</span>}
                      {t.testo}
                    </p>
                    {puoNascondere && (
                      <Pulsante onClick={() => nascondi(t.id, !t.nascosta)}>
                        {t.nascosta ? 'Mostra' : 'Nascondi'}
                      </Pulsante>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
