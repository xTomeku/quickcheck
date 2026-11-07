import { useState } from 'react'
import { Avviso, Campo, Input, Pulsante, Schede, Select } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { SOGLIA_POCHE_RISPOSTE } from '../../../lib/statistiche'
import { useRiferimenti } from './dati'
import type { Contesto } from './esporta'
import { FILTRI_VUOTI, type Filtri } from './filtri'
import PerDocente from './PerDocente'
import PerDomanda from './PerDomanda'
import PerExtra from './PerExtra'
import PerMateria from './PerMateria'

type Scheda = 'materie' | 'docenti' | 'domande' | 'extra'

export default function Statistiche() {
  const { vedeDocenti } = useAuth()
  const rif = useRiferimenti()
  const [scelti, setScelti] = useState<Filtri>(FILTRI_VUOTI)
  const [scheda, setScheda] = useState<Scheda>('materie')
  const [ricerca, setRicerca] = useState('')
  const [altriFiltri, setAltriFiltri] = useState(false)

  // Di default si guarda l'edizione aperta, altrimenti l'ultima creata
  const edizioneDefault = (rif.edizioni.find((e) => e.aperta) ?? rif.edizioni[0])?.id ?? ''
  const filtri: Filtri = { ...scelti, edizione: scelti.edizione || edizioneDefault }

  const corso = rif.corsi.find((c) => c.id === filtri.corso)
  const maxAnni = corso?.durata_anni ?? Math.max(3, ...rif.corsi.map((c) => c.durata_anni))
  const anni = Array.from({ length: maxAnni }, (_, i) => i + 1)

  // Passando a un corso più breve, un anno che lì non esiste torna a «tutti»
  function cambia(modifica: Partial<Filtri>) {
    const nuovi = { ...filtri, ...modifica }
    const durata = rif.corsi.find((c) => c.id === nuovi.corso)?.durata_anni
    if (durata !== undefined) {
      if (Number(nuovi.annoCorso) > durata) nuovi.annoCorso = ''
      if (Number(nuovi.annoStudente) > durata) nuovi.annoStudente = ''
    }
    setScelti(nuovi)
  }

  function azzera() {
    setScelti({ ...FILTRI_VUOTI, edizione: filtri.edizione })
    setAltriFiltri(false)
  }

  function cambiaScheda(nuova: Scheda) {
    setScheda(nuova)
    setRicerca('')
  }

  // Un filtro attivo resta sempre in vista: niente che cambi i numeri senza vedersi
  const mostraAltri = altriFiltri || Boolean(filtri.annoStudente)
  const qualcheFiltro = Boolean(filtri.corso || filtri.annoCorso) || mostraAltri

  const schede: { id: Scheda; nome: string }[] = [
    { id: 'materie', nome: 'Materie' },
    ...(vedeDocenti ? [{ id: 'docenti' as const, nome: 'Docenti' }] : []),
    { id: 'domande', nome: 'Domande' },
    { id: 'extra', nome: 'Extra' },
  ]

  // Con quali dati è stato fatto un file esportato: lo si legge nel foglio «Informazioni»
  const edizione = rif.edizioni.find((e) => e.id === filtri.edizione)
  const contesto: Contesto = [
    ['Edizione', edizione?.nome ?? '?'],
    ['Corso di laurea', corso?.nome ?? 'Tutti i corsi'],
    ['Anno della materia', filtri.annoCorso ? `${filtri.annoCorso}° anno` : 'Tutti gli anni'],
    [
      'Anno dello studente',
      filtri.annoStudente === 'fuori_corso'
        ? 'Fuori corso'
        : filtri.annoStudente
          ? `${filtri.annoStudente}° anno`
          : 'Tutti gli studenti',
    ],
  ]

  const segnapostoRicerca = scheda === 'materie' ? 'Cerca materia' : 'Cerca docente'

  return (
    <div className="space-y-5">
      {rif.errore && <Avviso>{rif.errore}</Avviso>}

      {!rif.pronto ? (
        <>
          <h1 className="text-xl font-semibold">Statistiche</h1>
          <p className="text-slate-500">Caricamento…</p>
        </>
      ) : rif.edizioni.length === 0 ? (
        <>
          <h1 className="text-xl font-semibold">Statistiche</h1>
          <Avviso tipo="info">Non c'è ancora nessuna edizione: creane una dalla sezione Edizioni.</Avviso>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <h1 className="text-xl font-semibold">Statistiche</h1>
              <p className="mt-1 text-sm text-slate-500">
                Sotto le {SOGLIA_POCHE_RISPOSTE} risposte i dati sono poco affidabili e possono rendere
                riconoscibile chi ha risposto: per questo vengono segnalati.
              </p>
            </div>
            <div className="w-full sm:w-64">
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
            </div>
          </div>

          {/* Le domande Extra non dipendono né dal corso né dall'anno: lì questi filtri non si mostrano */}
          {scheda !== 'extra' && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 basis-36 sm:w-56 sm:flex-none">
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
              </div>
              <div className="min-w-0 flex-1 basis-36 sm:w-40 sm:flex-none">
                <Campo etichetta="Anno della materia">
                  <Select value={filtri.annoCorso} onChange={(e) => cambia({ annoCorso: e.target.value })}>
                    <option value="">Tutti gli anni</option>
                    {anni.map((a) => (
                      <option key={a} value={a}>
                        {a}° anno
                      </option>
                    ))}
                  </Select>
                </Campo>
              </div>
              {mostraAltri ? (
                <div className="min-w-0 flex-1 basis-36 sm:w-44 sm:flex-none">
                  <Campo etichetta="Anno dello studente">
                    <Select
                      value={filtri.annoStudente}
                      onChange={(e) => cambia({ annoStudente: e.target.value })}
                    >
                      <option value="">Tutti gli studenti</option>
                      {anni.map((a) => (
                        <option key={a} value={a}>
                          {a}° anno
                        </option>
                      ))}
                      <option value="fuori_corso">Fuori corso</option>
                    </Select>
                  </Campo>
                </div>
              ) : (
                <Pulsante onClick={() => setAltriFiltri(true)}>Altri filtri</Pulsante>
              )}
              {qualcheFiltro && (
                <Pulsante variante="testo" onClick={azzera}>
                  Azzera filtri
                </Pulsante>
              )}
              {(scheda === 'materie' || scheda === 'docenti') && (
                <div className="min-w-0 flex-1 basis-36 sm:ml-auto sm:w-52 sm:flex-none">
                  <Input
                    type="search"
                    value={ricerca}
                    onChange={(e) => setRicerca(e.target.value)}
                    placeholder={segnapostoRicerca}
                    aria-label={segnapostoRicerca}
                  />
                </div>
              )}
            </div>
          )}

          <Schede schede={schede} attiva={scheda} onCambia={cambiaScheda} />

          {scheda === 'materie' && (
            <PerMateria
              filtri={filtri}
              contesto={contesto}
              ricerca={ricerca}
              corsi={rif.corsi}
              materie={rif.materie}
              materieCorso={rif.materieCorso}
              domande={rif.domande}
              docenti={rif.docenti}
              insegnamenti={rif.insegnamenti}
              vedeDocenti={vedeDocenti}
            />
          )}
          {scheda === 'docenti' && vedeDocenti && (
            <PerDocente
              filtri={filtri}
              contesto={contesto}
              ricerca={ricerca}
              domande={rif.domande}
              materie={rif.materie}
              materieCorso={rif.materieCorso}
              docenti={rif.docenti}
              insegnamenti={rif.insegnamenti}
            />
          )}
          {scheda === 'domande' && (
            <PerDomanda
              filtri={filtri}
              contesto={contesto}
              domande={rif.domande}
              materie={rif.materie}
              docenti={rif.docenti}
              vedeDocenti={vedeDocenti}
            />
          )}
          {scheda === 'extra' && <PerExtra edizione={filtri.edizione} domande={rif.domande} />}
        </>
      )}
    </div>
  )
}
