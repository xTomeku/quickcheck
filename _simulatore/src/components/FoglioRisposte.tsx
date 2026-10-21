import type { Domanda, DomandaInProva, Risposta } from '../types'
import { LETTERE } from './Testo'

interface Props {
  titolo: string
  domande: DomandaInProva[]
  banca: Map<string, Domanda>
  risposte: Record<string, Risposta>
  dubbi?: string[]
  attuale?: number
  onVai?: (indice: number) => void
  /** solo illustrativo (home): niente interazione */
  decorativo?: boolean
}

/** Il modulo risposte, con le stesse due parti del foglio ufficiale: crocette e caselle a completamento. */
export function FoglioRisposte({ titolo, domande, banca, risposte, dubbi = [], attuale, onVai, decorativo }: Props) {
  const date = domande.filter((q) => {
    const r = risposte[q.id]
    return r !== undefined && r !== null && r !== ''
  }).length
  const blocchi = [
    { nome: 'Risposta multipla', righe: domande.map((q, i) => ({ q, i })).filter(({ q }) => banca.get(q.id)?.tipo === 'multipla') },
    { nome: 'Completamento', righe: domande.map((q, i) => ({ q, i })).filter(({ q }) => banca.get(q.id)?.tipo === 'completamento') },
  ].filter((b) => b.righe.length > 0)

  return (
    <section className="foglio" aria-label={decorativo ? undefined : `Foglio risposte, ${titolo}`} aria-hidden={decorativo || undefined}>
      <div className="foglio-testata">
        <span>Modulo risposte, {titolo}</span>
        <span className="conteggio num">
          {date} di {domande.length}
        </span>
      </div>
      {blocchi.map((b) => (
        <div className="foglio-blocco" key={b.nome}>
          <h3>{b.nome}</h3>
          <ol className="foglio-righe">
            {b.righe.map(({ q, i }) => {
              const d = banca.get(q.id)!
              const r = risposte[q.id]
              const contenuto = (
                <>
                  <span className="n num">{i + 1}</span>
                  {d.tipo === 'multipla' ? (
                    <span className="pallini">
                      {LETTERE.map((l, pos) => {
                        const originale = q.ordine ? q.ordine[pos] : pos
                        return (
                          <span key={l} className={`pallino${r === originale ? ' pieno' : ''}`}>
                            <span>{l}</span>
                          </span>
                        )
                      })}
                    </span>
                  ) : (
                    <span className={`casella${typeof r === 'string' && r.trim() ? ' piena' : ''}`}>{typeof r === 'string' ? r : ''}</span>
                  )}
                  <span className="dubbio" aria-label={dubbi.includes(q.id) ? 'segnata come dubbia' : undefined}>
                    {dubbi.includes(q.id) ? '?' : ''}
                  </span>
                </>
              )
              return (
                <li key={q.id}>
                  {decorativo || !onVai ? (
                    <div className="foglio-riga">{contenuto}</div>
                  ) : (
                    <button
                      type="button"
                      className={`foglio-riga${attuale === i ? ' attuale' : ''}`}
                      aria-current={attuale === i ? 'true' : undefined}
                      aria-label={`Domanda ${i + 1}${r !== undefined && r !== null && r !== '' ? ', risposta data' : ', senza risposta'}${dubbi.includes(q.id) ? ', dubbia' : ''}`}
                      onClick={() => onVai(i)}
                    >
                      {contenuto}
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </section>
  )
}
