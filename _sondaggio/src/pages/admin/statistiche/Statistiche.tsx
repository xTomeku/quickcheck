import { useState } from 'react'
import { Avviso, Campo, Schede, Select } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { useRiferimenti } from './dati'
import { FILTRI_VUOTI, type Filtri } from './filtri'
import PerDocente from './PerDocente'
import PerDomanda from './PerDomanda'
import PerMateria from './PerMateria'
import Riepilogo from './Riepilogo'

type Scheda = 'riepilogo' | 'domanda' | 'materia' | 'docente'

export default function Statistiche() {
  const { vedeDocenti } = useAuth()
  const rif = useRiferimenti()
  const [scelti, setScelti] = useState<Filtri>(FILTRI_VUOTI)
  const [scheda, setScheda] = useState<Scheda>('riepilogo')

  // Di default si guarda l'edizione aperta, altrimenti l'ultima creata
  const edizioneDefault = (rif.edizioni.find((e) => e.aperta) ?? rif.edizioni[0])?.id ?? ''
  const filtri: Filtri = { ...scelti, edizione: scelti.edizione || edizioneDefault }

  const corso = rif.corsi.find((c) => c.id === filtri.corso)
  const maxAnni = corso?.durata_anni ?? Math.max(3, ...rif.corsi.map((c) => c.durata_anni))
  const anni = Array.from({ length: maxAnni }, (_, i) => i + 1)

  // Le materie e i docenti proposti dipendono dai filtri scelti sopra
  const idMateriePossibili = new Set(
    rif.materieCorso
      .filter((mc) => !filtri.corso || mc.corso_id === filtri.corso)
      .filter((mc) => !filtri.annoCorso || mc.anno === Number(filtri.annoCorso))
      .map((mc) => mc.materia_id),
  )
  const materiePossibili = rif.materie.filter((m) => idMateriePossibili.has(m.id))
  const idDocentiPossibili = new Set(
    rif.insegnamenti
      .filter((i) => (filtri.materia ? i.materia_id === filtri.materia : idMateriePossibili.has(i.materia_id)))
      .map((i) => i.docente_id),
  )
  const docentiPossibili = rif.docenti.filter((d) => idDocentiPossibili.has(d.id))

  // Quando cambia un filtro, quelli che ne dipendono tornano a «tutti» se non hanno più senso
  function cambia(modifica: Partial<Filtri>) {
    const nuovi = { ...filtri, ...modifica }
    const materie = new Set(
      rif.materieCorso
        .filter((mc) => !nuovi.corso || mc.corso_id === nuovi.corso)
        .filter((mc) => !nuovi.annoCorso || mc.anno === Number(nuovi.annoCorso))
        .map((mc) => mc.materia_id),
    )
    if (nuovi.materia && !materie.has(nuovi.materia)) nuovi.materia = ''
    if (nuovi.docente) {
      const ok = rif.insegnamenti.some(
        (i) =>
          i.docente_id === nuovi.docente &&
          (nuovi.materia ? i.materia_id === nuovi.materia : materie.has(i.materia_id)),
      )
      if (!ok) nuovi.docente = ''
    }
    setScelti(nuovi)
  }

  const schede: { id: Scheda; nome: string }[] = [
    { id: 'riepilogo', nome: 'Riepilogo' },
    { id: 'domanda', nome: 'Per domanda' },
    { id: 'materia', nome: 'Per materia' },
    ...(vedeDocenti ? [{ id: 'docente' as const, nome: 'Per docente' }] : []),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Statistiche</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ogni risposta raccolta compare nelle statistiche, anche se è la sola di una materia: con
          poche risposte i dati sono poco affidabili e possono rendere riconoscibile chi ha risposto.
        </p>
      </div>

      {rif.errore && <Avviso>{rif.errore}</Avviso>}

      {!rif.pronto ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : rif.edizioni.length === 0 ? (
        <Avviso tipo="info">Non c'è ancora nessuna edizione: creane una dalla sezione Edizioni.</Avviso>
      ) : (
        <>
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo etichetta="Edizione">
              <Select value={filtri.edizione} onChange={(e) => cambia({ edizione: e.target.value })}>
                {rif.edizioni.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                    {e.aperta ? ' (aperta)' : ''}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Corso di laurea">
              <Select value={filtri.corso} onChange={(e) => cambia({ corso: e.target.value })}>
                <option value="">Tutti i corsi</option>
                {rif.corsi.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Anno del corso">
              <Select value={filtri.annoCorso} onChange={(e) => cambia({ annoCorso: e.target.value })}>
                <option value="">Tutti gli anni</option>
                {anni.map((a) => (
                  <option key={a} value={a}>
                    {a}° anno
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Anno dello studente">
              <Select
                value={filtri.annoStudente}
                onChange={(e) => cambia({ annoStudente: e.target.value })}
              >
                <option value="">Tutti</option>
                {anni.map((a) => (
                  <option key={a} value={a}>
                    {a}° anno
                  </option>
                ))}
                <option value="fuori_corso">Fuori corso</option>
              </Select>
            </Campo>
            <Campo etichetta="Materia">
              <Select value={filtri.materia} onChange={(e) => cambia({ materia: e.target.value })}>
                <option value="">Tutte le materie</option>
                {materiePossibili.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            {vedeDocenti && (
              <Campo etichetta="Docente">
                <Select value={filtri.docente} onChange={(e) => cambia({ docente: e.target.value })}>
                  <option value="">Tutti i docenti</option>
                  {docentiPossibili.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.cognome} {d.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
            )}
          </div>

          <Schede schede={schede} attiva={scheda} onCambia={setScheda} />

          {scheda === 'riepilogo' && (
            <Riepilogo
              filtri={filtri}
              corsi={rif.corsi}
              materie={rif.materie}
              materieCorso={rif.materieCorso}
            />
          )}
          {scheda === 'domanda' && (
            <PerDomanda filtri={filtri} domande={rif.domande} vedeDocenti={vedeDocenti} />
          )}
          {scheda === 'materia' && (
            <PerMateria
              filtri={filtri}
              domande={rif.domande}
              docenti={rif.docenti}
              insegnamenti={rif.insegnamenti}
              vedeDocenti={vedeDocenti}
            />
          )}
          {scheda === 'docente' && vedeDocenti && (
            <PerDocente filtri={filtri} domande={rif.domande} materie={rif.materie} />
          )}
        </>
      )}
    </div>
  )
}
