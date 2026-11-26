import type { RigaStat } from '../../../lib/statistiche'
import type { VoceClassifica } from './Classifica'
import {
  CATEGORIE_DOCENTE,
  mediaGenerale,
  type CorsoRif,
  type DocenteRif,
  type DomandaRif,
  type InsegnamentoRif,
  type MateriaCorsoRif,
  type MateriaRif,
} from './dati'
import type { Filtri } from './filtri'

// Le classifiche di materie e docenti, calcolate nello stesso modo sullo schermo e nel report

// I legami materia-corso che rientrano nei filtri
function legamiFiltrati(filtri: Filtri, materieCorso: MateriaCorsoRif[], corsi: CorsoRif[]) {
  const corsiDelTipo = new Set(
    corsi.filter((c) => !filtri.tipoCorso || c.tipo === filtri.tipoCorso).map((c) => c.id),
  )
  return materieCorso
    .filter((mc) => corsiDelTipo.has(mc.corso_id))
    .filter((mc) => !filtri.corso || mc.corso_id === filtri.corso)
    .filter((mc) => !filtri.annoCorso || mc.anno === Number(filtri.annoCorso))
}

export function classificaMaterie({
  filtri,
  materie,
  materieCorso,
  corsi,
  domandePerId,
  compilazioni,
  righe,
}: {
  filtri: Filtri
  materie: MateriaRif[]
  materieCorso: MateriaCorsoRif[]
  corsi: CorsoRif[]
  domandePerId: Map<string, DomandaRif>
  compilazioni: { materia_id: string; corso_id: string; n: number }[]
  // Raggruppate per domanda e materia
  righe: RigaStat[]
}) {
  const nomeCorso = new Map(corsi.map((c) => [c.id, c.nome]))
  const conteggi = new Map(compilazioni.map((r) => [`${r.materia_id}|${r.corso_id}`, r.n]))
  const legami = legamiFiltrati(filtri, materieCorso, corsi)

  // Le domande sui docenti hanno la loro classifica: qui contano solo quelle sulla materia
  const righePerMateria = new Map<string, RigaStat[]>()
  for (const r of righe) {
    const categoria = domandePerId.get(r.domanda_id)?.categoria ?? ''
    if (!r.materia_id || CATEGORIE_DOCENTE.includes(categoria)) continue
    righePerMateria.set(r.materia_id, [...(righePerMateria.get(r.materia_id) ?? []), r])
  }

  // Una materia può stare in più corsi: una riga sola, perché le medie sono per materia
  const elenco: VoceClassifica[] = materie.flatMap((m) => {
    const suoi = legami.filter((mc) => mc.materia_id === m.id)
    if (suoi.length === 0) return []
    return [
      {
        id: m.id,
        nome: m.nome,
        dettaglio: suoi
          .map((mc) =>
            filtri.corso ? `${mc.anno}° anno` : `${nomeCorso.get(mc.corso_id) ?? '?'} · ${mc.anno}° anno`,
          )
          .join(', '),
        n: suoi.reduce((somma, mc) => somma + (conteggi.get(`${mc.materia_id}|${mc.corso_id}`) ?? 0), 0),
        media: mediaGenerale(righePerMateria.get(m.id) ?? [], domandePerId),
      },
    ]
  })

  return { elenco, righePerMateria }
}

export function classificaDocenti({
  filtri,
  docenti,
  insegnamenti,
  materie,
  materieCorso,
  corsi,
  domandePerId,
  righe,
}: {
  filtri: Filtri
  docenti: DocenteRif[]
  insegnamenti: InsegnamentoRif[]
  materie: MateriaRif[]
  materieCorso: MateriaCorsoRif[]
  corsi: CorsoRif[]
  domandePerId: Map<string, DomandaRif>
  // Raggruppate per domanda e docente
  righe: RigaStat[]
}): VoceClassifica[] {
  const nomeMateria = new Map(materie.map((m) => [m.id, m.nome]))
  const materiePossibili = new Set(legamiFiltrati(filtri, materieCorso, corsi).map((mc) => mc.materia_id))

  const righePerDocente = new Map<string, RigaStat[]>()
  for (const r of righe) {
    if (r.docente_id) righePerDocente.set(r.docente_id, [...(righePerDocente.get(r.docente_id) ?? []), r])
  }

  return docenti.flatMap((d) => {
    const suoi = insegnamenti.filter((i) => i.docente_id === d.id && materiePossibili.has(i.materia_id))
    if (suoi.length === 0) return []
    const righeDoc = righePerDocente.get(d.id) ?? []
    return [
      {
        id: d.id,
        nome: `${d.cognome} ${d.nome}`,
        dettaglio: suoi.map((i) => nomeMateria.get(i.materia_id) ?? '?').join(', '),
        // Chi ha valutato il docente: le domande possono avere conteggi diversi, vale la più risposta
        n: righeDoc.reduce((massimo, r) => Math.max(massimo, r.n), 0),
        media: mediaGenerale(righeDoc, domandePerId),
      },
    ]
  })
}
