import { useState, type ChangeEvent } from 'react'
import { Avviso, Campo, Pulsante, Select } from '../../../components/ui'
import { creaCsv, leggiTesto, parseCsv } from '../../../lib/csv'
import { TIPI, type Anteprima, type Stato } from './tipi'

const ETICHETTA: Record<Stato, { testo: string; stile: string }> = {
  nuova: { testo: 'Nuova', stile: 'bg-green-100 text-green-800' },
  presente: { testo: 'Già presente', stile: 'bg-slate-200 text-slate-700' },
  errore: { testo: 'Errore', stile: 'bg-red-100 text-red-800' },
}

export default function Import() {
  const [tipoId, setTipoId] = useState(TIPI[0].id)
  const [anteprima, setAnteprima] = useState<Anteprima | null>(null)
  const [nomeFile, setNomeFile] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [esito, setEsito] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  const tipo = TIPI.find((t) => t.id === tipoId) ?? TIPI[0]

  function azzera() {
    setAnteprima(null)
    setNomeFile(null)
    setErrore(null)
    setEsito(null)
  }

  function scaricaModello() {
    const blob = new Blob([creaCsv([tipo.colonne])], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `modello-${tipo.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    azzera()
    setNomeFile(file.name)
    try {
      const tabella = parseCsv(await leggiTesto(file))
      setAnteprima(await tipo.prepara(tabella))
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Non riesco a leggere il file.')
    }
  }

  async function importa() {
    if (!anteprima) return
    setInvio(true)
    const messaggio = await anteprima.esegui()
    setInvio(false)
    if (messaggio) {
      setErrore(`Importazione non riuscita: ${messaggio}`)
      return
    }
    const n = anteprima.righe.filter((r) => r.stato === 'nuova').length
    azzera()
    setEsito(`Importazione completata: ${n} ${n === 1 ? 'riga aggiunta' : 'righe aggiunte'}.`)
  }

  const nuove = anteprima?.righe.filter((r) => r.stato === 'nuova').length ?? 0
  const presenti = anteprima?.righe.filter((r) => r.stato === 'presente').length ?? 0
  const errori = anteprima?.righe.filter((r) => r.stato === 'errore').length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Import da file</h1>
        <p className="mt-1 text-sm text-slate-500">
          Per inserire molti dati in una volta. Prima dell'importazione vedi un'anteprima con gli
          errori riga per riga: non viene salvato nulla finché non confermi. Tutto si può inserire
          anche a mano dalle schede dei dati.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <Campo etichetta="Cosa vuoi importare">
          <Select
            value={tipoId}
            onChange={(e) => {
              setTipoId(e.target.value)
              azzera()
            }}
          >
            {TIPI.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Select>
        </Campo>

        <div className="space-y-2 text-sm text-slate-600">
          <p>
            Colonne del file: <strong>{tipo.colonne.join('; ')}</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {tipo.aiuto.map((riga) => (
              <li key={riga}>{riga}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Pulsante onClick={scaricaModello}>Scarica il modello</Pulsante>
          <label className="cursor-pointer rounded-lg bg-udu px-3 py-2 text-sm font-medium text-white hover:bg-udu-scuro">
            Scegli il file CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} />
          </label>
          {nomeFile && <span className="text-sm text-slate-500">{nomeFile}</span>}
        </div>
      </div>

      {esito && <Avviso tipo="info">{esito}</Avviso>}
      {errore && <Avviso>{errore}</Avviso>}

      {anteprima && (
        <div className="space-y-3">
          <p className="text-sm">
            <strong>{nuove}</strong> nuove · <strong>{presenti}</strong> già presenti (saltate) ·{' '}
            <strong>{errori}</strong> con errori (saltate)
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Riga</th>
                  <th className="px-3 py-2 font-medium">Contenuto</th>
                  <th className="px-3 py-2 font-medium">Esito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {anteprima.righe.map((r) => (
                  <tr key={r.numero}>
                    <td className="px-3 py-2 text-slate-500">{r.numero}</td>
                    <td className="px-3 py-2">{r.descrizione}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ETICHETTA[r.stato].stile}`}
                      >
                        {ETICHETTA[r.stato].testo}
                      </span>
                      {r.messaggio && <span className="ml-2 text-slate-600">{r.messaggio}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Pulsante variante="primario" disabled={nuove === 0 || invio} onClick={importa}>
              {invio ? 'Importazione…' : `Importa ${nuove} ${nuove === 1 ? 'riga' : 'righe'}`}
            </Pulsante>
            <Pulsante onClick={azzera}>Annulla</Pulsante>
          </div>
          {errori > 0 && (
            <p className="text-sm text-slate-500">
              Le righe con errori non vengono importate: correggile nel file e ricaricalo, oppure
              inseriscile a mano.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
