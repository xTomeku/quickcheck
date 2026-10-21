import { useState } from 'react'
import { MATERIE, NOMI_BREVI, ORDINE_MATERIE } from '../lib/dati'
import type { MateriaId } from '../types'
import { LETTERE } from '../components/Testo'
import { problemi, statoDi, type Bozza, type Stato } from './modello'

interface Props {
  bozza: Bozza
  /** la materia è il file in cui sta la domanda: cambiarla la sposta di file */
  materia: MateriaId
  onChiudi: () => void
  onSalva: (b: Bozza, materia: MateriaId, messaggio: string) => Promise<void>
}

export function Editor({ bozza, materia, onChiudi, onSalva }: Props) {
  const [b, setB] = useState<Bozza>(() => structuredClone(bozza))
  const [dove, setDove] = useState<MateriaId>(materia)
  const [lavoro, setLavoro] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const pr = problemi(b, dove)
  const set = (patch: Partial<Bozza>) => setB((x) => ({ ...x, ...patch }))

  const salvaCon = async (stato: Stato) => {
    if (stato === 'approvata' && pr.length) {
      setErrore(`Prima di approvarla: ${pr.join(', ')}.`)
      return
    }
    setLavoro(true)
    setErrore(null)
    try {
      const messaggio =
        stato === statoDi(bozza)
          ? `Salvata ${b.id}.`
          : stato === 'approvata'
            ? `Approvata ${b.id}.`
            : stato === 'scartata'
              ? `Scartata ${b.id}.`
              : `Salvata ${b.id} come bozza.`
      await onSalva({ ...b, stato }, dove, messaggio)
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setLavoro(false)
    }
  }

  return (
    <div className="admin-modale" role="dialog" aria-modal="true" aria-labelledby="titolo-editor">
      <div className="admin-modale-corpo">
        <h2 id="titolo-editor">{b.id}</h2>
        <div className="admin-campi">
          <label>
            Materia
            <select
              id="ed-materia"
              value={dove}
              onChange={(e) => {
                const m = e.target.value as MateriaId
                setDove(m)
                set({ argomento: MATERIE[m].argomenti[0].id })
              }}
            >
              {ORDINE_MATERIE.map((m) => (
                <option key={m} value={m}>
                  {NOMI_BREVI[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="cresce">
            Argomento
            <select id="ed-argomento" value={b.argomento} onChange={(e) => set({ argomento: e.target.value })}>
              {MATERIE[dove].argomenti.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id.split('.').slice(1).join('.')} {a.titolo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select
              id="ed-tipo"
              value={b.tipo}
              onChange={(e) => {
                const tipo = e.target.value as Bozza['tipo']
                if (tipo === 'multipla') set({ tipo, opzioni: b.opzioni ?? ['', '', '', '', ''], corretta: b.corretta ?? 0 })
                else set({ tipo, accettate: b.accettate ?? [''] })
              }}
            >
              <option value="multipla">Risposta multipla</option>
              <option value="completamento">Completamento</option>
            </select>
          </label>
        </div>

        <label htmlFor="ed-testo">Testo{b.tipo === 'completamento' ? ' (usa …… per lo spazio da completare)' : ''}</label>
        <textarea id="ed-testo" rows={3} value={b.testo} onChange={(e) => set({ testo: e.target.value })} />

        {b.tipo === 'multipla' ? (
          <fieldset className="admin-opzioni">
            <legend>Opzioni: seleziona quella corretta</legend>
            {(b.opzioni ?? ['', '', '', '', '']).map((o, i) => (
              <div key={i} className="admin-opzione">
                <input
                  type="radio"
                  name="corretta"
                  id={`ed-corretta-${i}`}
                  checked={b.corretta === i}
                  onChange={() => set({ corretta: i })}
                  aria-label={`Opzione ${LETTERE[i]} corretta`}
                />
                <label htmlFor={`ed-opzione-${i}`} className="visually-hidden">
                  Opzione {LETTERE[i]}
                </label>
                <span className="lettera">{LETTERE[i]}</span>
                <input
                  id={`ed-opzione-${i}`}
                  type="text"
                  value={o}
                  onChange={(e) => {
                    const op = [...(b.opzioni ?? ['', '', '', '', ''])]
                    op[i] = e.target.value
                    set({ opzioni: op })
                  }}
                />
              </div>
            ))}
          </fieldset>
        ) : (
          <div className="admin-campi">
            <label className="cresce">
              Risposte accettate, una per riga (la prima è quella mostrata in correzione)
              <textarea
                id="ed-accettate"
                rows={3}
                value={(b.accettate ?? []).join('\n')}
                onChange={(e) => set({ accettate: e.target.value.split('\n') })}
              />
            </label>
            <label>
              Valore numerico
              <input
                id="ed-valore"
                type="text"
                inputMode="decimal"
                value={b.numero ? String(b.numero.valore).replace('.', ',') : ''}
                onChange={(e) => {
                  const t = e.target.value.trim().replace(',', '.')
                  if (!t) set({ numero: undefined })
                  else if (!Number.isNaN(Number(t))) set({ numero: { valore: Number(t), tolleranza: b.numero?.tolleranza ?? 0 } })
                }}
              />
            </label>
            <label>
              Tolleranza %
              <input
                id="ed-tolleranza"
                type="number"
                min={0}
                max={10}
                step={0.5}
                disabled={!b.numero}
                value={b.numero ? b.numero.tolleranza * 100 : 0}
                onChange={(e) => b.numero && set({ numero: { ...b.numero, tolleranza: Number(e.target.value) / 100 } })}
              />
            </label>
            <label>
              Unità
              <input id="ed-unita" type="text" value={b.unita ?? ''} onChange={(e) => set({ unita: e.target.value || undefined })} />
            </label>
          </div>
        )}

        <label htmlFor="ed-spiegazione">Spiegazione mostrata in correzione</label>
        <textarea
          id="ed-spiegazione"
          rows={3}
          value={b.spiegazione ?? ''}
          onChange={(e) => set({ spiegazione: e.target.value || undefined })}
        />

        <label htmlFor="ed-gruppo">Gruppo (domande quasi uguali con lo stesso gruppo non escono insieme)</label>
        <input id="ed-gruppo" type="text" value={b.gruppo ?? ''} onChange={(e) => set({ gruppo: e.target.value || undefined })} />

        {pr.length ? <p className="errore">Da sistemare: {pr.join(', ')}.</p> : null}
        {errore ? (
          <p role="alert" className="errore">
            {errore}
          </p>
        ) : null}

        <div className="bottoni">
          <button type="button" className="btn btn-primario" disabled={lavoro} onClick={() => void salvaCon('approvata')}>
            Salva e approva
          </button>
          <button
            type="button"
            className="btn btn-secondario"
            disabled={lavoro}
            onClick={() => void salvaCon(statoDi(b) === 'scartata' ? 'bozza' : statoDi(b))}
          >
            Salva
          </button>
          {statoDi(b) !== 'scartata' ? (
            <button type="button" className="btn btn-testo" disabled={lavoro} onClick={() => void salvaCon('scartata')}>
              Scarta
            </button>
          ) : null}
          <button type="button" className="btn btn-testo" onClick={onChiudi}>
            Chiudi senza salvare
          </button>
        </div>
      </div>
    </div>
  )
}
