import { Avviso } from '../../../components/ui'
import type { CorsoRif, MateriaCorsoRif, MateriaRif } from './dati'
import { useStatCompilazioni } from './dati'
import type { Filtri } from './filtri'

type Props = {
  filtri: Filtri
  corsi: CorsoRif[]
  materie: MateriaRif[]
  materieCorso: MateriaCorsoRif[]
}

// Quante compilazioni ha ogni materia: serve a capire dove mancano risposte
export default function Riepilogo({ filtri, corsi, materie, materieCorso }: Props) {
  const { righe, errore } = useStatCompilazioni(filtri)

  const nomeMateria = new Map(materie.map((m) => [m.id, m.nome]))
  const nomeCorso = new Map(corsi.map((c) => [c.id, c.nome]))
  const conteggi = new Map((righe ?? []).map((r) => [`${r.materia_id}|${r.corso_id}`, r.n]))

  const elenco = materieCorso
    .filter((mc) => !filtri.corso || mc.corso_id === filtri.corso)
    .filter((mc) => !filtri.annoCorso || mc.anno === Number(filtri.annoCorso))
    .filter((mc) => !filtri.materia || mc.materia_id === filtri.materia)
    .map((mc) => ({
      id: mc.id,
      materia: nomeMateria.get(mc.materia_id) ?? '?',
      corso: nomeCorso.get(mc.corso_id) ?? '?',
      anno: mc.anno,
      n: conteggi.get(`${mc.materia_id}|${mc.corso_id}`) ?? 0,
    }))
    .sort((a, b) => a.corso.localeCompare(b.corso) || a.anno - b.anno || a.materia.localeCompare(b.materia))

  const totale = elenco.reduce((somma, r) => somma + r.n, 0)
  const senzaRisposte = elenco.filter((r) => r.n === 0).length

  return (
    <div className="space-y-4">
      {errore && <Avviso>{errore}</Avviso>}
      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : (
        <>
          <p className="text-sm">
            <strong>{totale}</strong> compilazioni in {elenco.length} materie
            {senzaRisposte > 0 && <> · <strong>{senzaRisposte}</strong> senza nessuna risposta</>}
          </p>
          {elenco.length === 0 ? (
            <Avviso tipo="info">Nessuna materia corrisponde ai filtri.</Avviso>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Corso</th>
                    <th className="px-3 py-2 font-medium">Anno</th>
                    <th className="px-3 py-2 font-medium">Materia</th>
                    <th className="px-3 py-2 text-right font-medium">Compilazioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {elenco.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2">{r.corso}</td>
                      <td className="px-3 py-2">{r.anno}°</td>
                      <td className="px-3 py-2">{r.materia}</td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${r.n === 0 ? 'text-red-700' : ''}`}
                      >
                        {r.n}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
