import { describe, expect, it } from 'vitest'
import { correggiSezione, esito, leggiNumero, normalizza, puntiDa } from './correzione'
import { generaSezione, rngConSeme, estraiPesate } from './generatore'
import { argomentiDeboli, perUnita, quantoPesa } from './statistiche'
import { MATERIE, RINFORZO_RIPASSO, RIPASSO } from './dati'
import bio from '../../public/domande/biologia.json'
import fis from '../../public/domande/fisica.json'
import type { Domanda, Esito, EsitoDomanda, Risultato } from '../types'

const bancaBio = bio.domande as Domanda[]
const bancaFis = fis.domande as Domanda[]
const trova = (b: Domanda[], id: string) => b.find((d) => d.id === id)!

describe('normalizza', () => {
  it('ignora maiuscole, accenti, articolo e punto finale', () => {
    expect(normalizza('  La Capillarità. ')).toBe('capillarita')
    expect(normalizza("L'anafase")).toBe('anafase')
  })
})

describe('leggiNumero', () => {
  it.each([
    ['49050', 49050],
    ['49.050', 49050],
    ['0,02', 0.02],
    ['4,9·10^4', 49000],
    ['4.9x10^4', 49000],
    ['1e5', 100000],
    ['10^5', 100000],
    ['100 000', 100000],
    ['-4', -4],
    ['−4', -4],
    ['+6', 6],
    ['20 m/s', 20],
    ['300 K', 300],
    ['quattro', 4],
    ['meno 4', -4],
    // unità con cifre dentro: in fisica sono la norma
    ['5 m/s^2', 5],
    ['5 m/s2', 5],
    ['9,8 m/s²', 9.8],
    ['1000 kg/m3', 1000],
    ['760 mmHg', 760],
    ['2·10^5 Pa', 200000],
    ['25 °C', 25],
  ])('%s → %d', (input, atteso) => {
    expect(leggiNumero(input)).toBeCloseTo(atteso, 9)
  })
  it('rifiuta testo non numerico', () => {
    expect(leggiNumero('capillarità')).toBeNull()
    expect(leggiNumero('')).toBeNull()
    // una sola unità, senza numero davanti, non è un numero
    expect(leggiNumero('m/s^2')).toBeNull()
    expect(leggiNumero('kg')).toBeNull()
  })
})

describe('esito', () => {
  it('multipla: confronta l\'indice originale', () => {
    // niente id fissi qui: le domande della banca si rivedono e si scartano nel pannello, e un
    // test che ne nomina una si rompe il giorno in cui quella domanda non piace più
    const d = bancaBio.find((q) => q.tipo === 'multipla')!
    expect(esito(d, d.corretta)).toBe('corretta')
    expect(esito(d, (d.corretta + 1) % d.opzioni.length)).toBe('errata')
    expect(esito(d, null)).toBe('omessa')
  })
  it('completamento testuale tollerante', () => {
    const d = trova(bancaBio, 'bio-022')
    expect(esito(d, 'Non senso')).toBe('corretta')
    expect(esito(d, 'missenso')).toBe('errata')
    expect(esito(d, '   ')).toBe('omessa')
  })
  it('completamento numerico con tolleranza', () => {
    const d = trova(bancaFis, 'fis-026') // 83720 J, ±1%
    expect(esito(d, '83 720')).toBe('corretta')
    expect(esito(d, '8,372·10^4 J')).toBe('corretta')
    expect(esito(d, '83000')).toBe('corretta')
    expect(esito(d, '80000')).toBe('errata')
    const k = trova(bancaFis, 'fis-025') // 300 K
    expect(esito(k, '300,15')).toBe('corretta')
  })
})

describe('punteggio', () => {
  it('+1 corretta, −0,1 errata, 0 omessa, arrotondato al decimo', () => {
    expect(puntiDa({ corrette: 25, errate: 4 })).toBe(24.6)
    expect(puntiDa({ corrette: 0, errate: 31 })).toBe(-3.1)
  })
})

describe('generazione', () => {
  it('produce 15 multiple poi 16 completamenti, senza duplicati', () => {
    const s = generaSezione(MATERIE.biologia, bancaBio, { rng: rngConSeme(1) })
    expect(s.domande).toHaveLength(31)
    const tipi = s.domande.map((q) => trova(bancaBio, q.id).tipo)
    expect(tipi.slice(0, 15).every((t) => t === 'multipla')).toBe(true)
    expect(tipi.slice(15).every((t) => t === 'completamento')).toBe(true)
    expect(new Set(s.domande.map((q) => q.id)).size).toBe(31)
    for (const q of s.domande.slice(0, 15)) expect([...q.ordine!].sort()).toEqual([0, 1, 2, 3, 4])
  })

  it('rispetta i pesi e non mette insieme domande dello stesso gruppo', () => {
    const banca: Domanda[] = [
      ...Array.from({ length: 50 }, (_, i) => ({ id: `a${i}`, argomento: 'A', tipo: 'completamento' as const, testo: '', accettate: ['x'] })),
      ...Array.from({ length: 50 }, (_, i) => ({ id: `b${i}`, argomento: 'B', tipo: 'completamento' as const, testo: '', accettate: ['x'] })),
      { id: 'g1', argomento: 'A', tipo: 'completamento', testo: '', accettate: ['x'], gruppo: 'g' },
      { id: 'g2', argomento: 'A', tipo: 'completamento', testo: '', accettate: ['x'], gruppo: 'g' },
    ]
    const pesi = new Map([['A', 0.9], ['B', 0.1]])
    const rng = rngConSeme(7)
    let daA = 0
    for (let k = 0; k < 200; k++) {
      const scelte = estraiPesate(banca, 4, pesi, { rng })
      daA += scelte.filter((d) => d.argomento === 'A').length
      expect(scelte.filter((d) => d.gruppo === 'g').length).toBeLessThanOrEqual(1)
    }
    expect(daA / 800).toBeGreaterThan(0.6)
  })

  it('non fa uscire insieme due quasi duplicati se uno è multipla e l’altro completamento', () => {
    // il difetto stava qui: multiple e completamenti si pescano con due estrazioni separate, e
    // prima ciascuna teneva un elenco di gruppi tutto suo, quindi il gruppo valeva solo dentro un tipo
    const arg = MATERIE.biologia.argomenti[0].id
    const multipla = (id: string, gruppo?: string): Domanda =>
      ({ id, argomento: arg, tipo: 'multipla', testo: '', opzioni: ['a', 'b', 'c', 'd', 'e'], corretta: 0, ...(gruppo ? { gruppo } : {}) })
    const completamento = (id: string, gruppo?: string): Domanda =>
      ({ id, argomento: arg, tipo: 'completamento', testo: '', accettate: ['x'], ...(gruppo ? { gruppo } : {}) })
    const banca: Domanda[] = [
      ...Array.from({ length: 10 }, (_, i) => multipla(`m${i}`)),
      ...Array.from({ length: 10 }, (_, i) => completamento(`c${i}`)),
      multipla('gm', 'g'),
      completamento('gc', 'g'),
    ]
    for (let k = 0; k < 200; k++) {
      const s = generaSezione(MATERIE.biologia, banca, { rng: rngConSeme(k) }, { multipla: 6, completamento: 6 })
      const ids = s.domande.map((q) => q.id)
      expect(ids.includes('gm') && ids.includes('gc')).toBe(false)
    }
  })

  it('una sezione con tutte risposte giuste vale 31 punti', () => {
    const s = generaSezione(MATERIE.biologia, bancaBio, { rng: rngConSeme(3) })
    for (const { id } of s.domande) {
      const d = trova(bancaBio, id)
      s.risposte[id] = d.tipo === 'multipla' ? d.corretta : d.accettate[0]
    }
    const r = correggiSezione(s, new Map(bancaBio.map((d) => [d.id, d])))
    expect(r.corrette).toBe(31)
    expect(r.punti).toBe(31)
  })
})

const esiti = (argomento: string, quante: number, esito: Esito): EsitoDomanda[] =>
  Array.from({ length: quante }, (_, i) => ({ id: `${argomento}${esito}${i}`, argomento, tipo: 'multipla' as const, esito }))

const storicoCon = (...blocchi: EsitoDomanda[][]): Risultato[] => [
  {
    id: 'r1',
    modalita: 'completa',
    data: 0,
    sezioni: [{ materia: 'biologia', punti: 0, corrette: 0, errate: 0, omesse: 0, dettaglio: blocchi.flat() }],
  },
]

describe('argomenti da ripassare', () => {
  it('non lascia vincere i campioni minuscoli', () => {
    // 7 sbagli su 8 è un guaio più solido di 2 su 2, anche se la percentuale è più bassa
    const storico = storicoCon(
      esiti('A', 7, 'errata'),
      esiti('A', 1, 'corretta'),
      esiti('B', 2, 'errata'),
      esiti('C', 20, 'corretta'),
    )
    const deboli = argomentiDeboli(storico)
    expect(deboli.map((a) => a.argomento)).toEqual(['A', 'B'])
  })

  it('conta una non data meno di un errore', () => {
    const storico = storicoCon(
      esiti('D', 2, 'errata'),
      esiti('D', 2, 'corretta'),
      esiti('E', 2, 'omessa'),
      esiti('E', 2, 'corretta'),
      esiti('C', 20, 'corretta'),
    )
    const deboli = argomentiDeboli(storico)
    expect(deboli.map((a) => a.argomento)).toEqual(['D', 'E'])
  })

  it('tiene fuori gli argomenti in cui non si è sbagliato niente', () => {
    expect(argomentiDeboli(storicoCon(esiti('C', 10, 'corretta')))).toEqual([])
    expect(argomentiDeboli([])).toEqual([])
  })
})

describe('ripasso', () => {
  it('fa una sezione corta e insiste sugli argomenti rinforzati', () => {
    const debole = bancaBio.find((d) => d.tipo === 'multipla')!.argomento
    const rng = rngConSeme(5)
    let conRinforzo = 0
    let senza = 0
    for (let k = 0; k < 60; k++) {
      const a = generaSezione(MATERIE.biologia, bancaBio, { rng, rinforzo: new Map([[debole, RINFORZO_RIPASSO]]) }, RIPASSO)
      const b = generaSezione(MATERIE.biologia, bancaBio, { rng }, RIPASSO)
      expect(a.domande).toHaveLength(10)
      expect(b.domande).toHaveLength(10)
      conRinforzo += a.domande.filter((q) => trova(bancaBio, q.id).argomento === debole).length
      senza += b.domande.filter((q) => trova(bancaBio, q.id).argomento === debole).length
    }
    expect(conRinforzo).toBeGreaterThan(senza)
  })
})

describe('per unità del syllabus', () => {
  it('mette insieme gli argomenti della stessa unità e tiene separate le materie', () => {
    const u = perUnita([
      ...esiti('bio.1.1', 2, 'errata'),
      ...esiti('bio.1.2', 1, 'corretta'),
      ...esiti('bio.7.4', 1, 'omessa'),
      ...esiti('chim.1.1', 3, 'errata'),
    ])
    const per = (chiave: string) => u.find((x) => x.chiave === chiave)!
    expect(u).toHaveLength(3)
    // bio.1.1 e bio.1.2 finiscono nella stessa unità
    expect(per('biologia-1')).toMatchObject({ viste: 3, errate: 2, corrette: 1, omesse: 0, materia: 'biologia', numero: 1 })
    expect(per('biologia-7')).toMatchObject({ viste: 1, omesse: 1 })
    // l'unità 1 di chimica è un'altra cosa dall'unità 1 di biologia
    expect(per('chimica-1')).toMatchObject({ viste: 3, errate: 3, materia: 'chimica' })
    expect(per('biologia-1').titolo).not.toBe(per('chimica-1').titolo)
  })

  it('ignora gli argomenti che non sono nel syllabus', () => {
    expect(perUnita(esiti('boh.9.9', 3, 'errata'))).toEqual([])
  })

  it('una non data pesa meno di un errore anche per le unità', () => {
    const [soloErrori] = perUnita(esiti('bio.1.1', 2, 'errata'))
    const [soloOmesse] = perUnita(esiti('bio.1.1', 2, 'omessa'))
    expect(quantoPesa(soloErrori)).toBeGreaterThan(quantoPesa(soloOmesse))
  })
})
