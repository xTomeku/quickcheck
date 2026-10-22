import { describe, expect, it } from 'vitest'
import { leggiCartella, scriviFile, type ManicoCartella } from './cartella'
import { leggiImport, perFile, problemi, statoDi, type Bozza } from './modello'

/** Una cartella finta in memoria: il selettore vero è una finestra di sistema, non testabile qui. */
function cartellaFinta(contenuto: Record<string, string>) {
  const disco: Record<string, string> = { ...contenuto }
  const manico = {
    name: 'domande',
    async getFileHandle(nome: string, opzioni?: { create?: boolean }) {
      if (!(nome in disco) && !opzioni?.create) throw new Error('file assente')
      return {
        async getFile() {
          return { text: async () => disco[nome] ?? '' }
        },
        async createWritable() {
          let buffer = ''
          return {
            async write(dati: string) {
              buffer += dati
            },
            async close() {
              disco[nome] = buffer
            },
          }
        },
      }
    },
  }
  return { manico: manico as unknown as ManicoCartella, disco }
}

const multipla = (p: Partial<Bozza> = {}): Bozza => ({
  id: 'bio-900',
  argomento: 'bio.1.1',
  tipo: 'multipla',
  testo: 'Domanda di prova?',
  opzioni: ['a', 'b', 'c', 'd', 'e'],
  corretta: 2,
  ...p,
})

describe('problemi', () => {
  it('non trova niente da ridire su una domanda a posto', () => {
    expect(problemi(multipla(), 'biologia')).toEqual([])
  })

  it('vede le opzioni ripetute e quelle vuote', () => {
    expect(problemi(multipla({ opzioni: ['a', 'A', 'c', 'd', 'e'] }), 'biologia')).toContain('opzioni ripetute')
    expect(problemi(multipla({ opzioni: ['a', '', 'c', 'd', 'e'] }), 'biologia')).toContain('servono 5 opzioni non vuote')
    expect(problemi(multipla({ opzioni: ['a', 'b', 'c', 'd'] }), 'biologia')).toContain('servono 5 opzioni non vuote')
  })

  it('vede la corretta fuori posto e il testo vuoto', () => {
    expect(problemi(multipla({ corretta: 7 }), 'biologia')).toContain('risposta corretta non indicata')
    expect(problemi(multipla({ testo: '  ' }), 'biologia')).toContain('testo vuoto')
  })

  it('vede un argomento inventato o di un’altra materia', () => {
    expect(problemi(multipla({ argomento: 'bio.99.9' }), 'biologia')).toContain('argomento non presente nel syllabus')
    expect(problemi(multipla({ argomento: 'chim.1.1' }), 'biologia')).toContain('argomento di un’altra materia')
  })

  it('nei completamenti pretende lo spazio da completare e una risposta', () => {
    const base: Bozza = { id: 'bio-901', argomento: 'bio.1.1', tipo: 'completamento', testo: 'I monomeri si chiamano ……', accettate: ['nucleotidi'] }
    expect(problemi(base, 'biologia')).toEqual([])
    expect(problemi({ ...base, testo: 'I monomeri si chiamano cosa' }, 'biologia')).toContain(
      'nel testo manca lo spazio da completare (……)',
    )
    expect(problemi({ ...base, accettate: ['  '] }, 'biologia')).toContain('nessuna risposta accettata')
    // un numero da solo basta come risposta
    expect(problemi({ ...base, accettate: [], numero: { valore: 42, tolleranza: 0 } }, 'biologia')).toEqual([])
  })

  it('vuole una parola sola come risposta mostrata, non una frase', () => {
    const base: Bozza = { id: 'bio-904', argomento: 'bio.1.1', tipo: 'completamento', testo: 'Si dice dipendente da ……' }
    expect(problemi({ ...base, accettate: ['contatto'] }, 'biologia')).toEqual([])
    expect(problemi({ ...base, accettate: ['da contatto', 'contatto'] }, 'biologia')).toContain('la risposta è più di una parola')
    // le varianti dopo la prima possono essere lunghe quanto vogliono: servono solo a non bocciare
    // chi scrive per esteso
    expect(problemi({ ...base, accettate: ['contatto', 'contatto diretto fra le cellule'] }, 'biologia')).toEqual([])
    // un numero può avere l'unità accanto senza che sia un problema
    expect(
      problemi({ ...base, accettate: ['9,8 m/s2'], numero: { valore: 9.8, tolleranza: 0.01 } }, 'biologia'),
    ).toEqual([])
  })
})

describe('perFile', () => {
  it('tiene solo i campi del tipo giusto e butta quelli vuoti', () => {
    const d = perFile(multipla({ spiegazione: '  ', gruppo: '', accettate: ['resto di prima'], unita: 'm' }))
    expect(d).toMatchObject({ tipo: 'multipla', corretta: 2 })
    expect(d).not.toHaveProperty('spiegazione')
    expect(d).not.toHaveProperty('gruppo')
    expect(d).not.toHaveProperty('accettate')
    expect(d).not.toHaveProperty('unita')
  })

  it('senza stato una domanda vale come approvata', () => {
    expect(statoDi(multipla())).toBe('approvata')
    expect(perFile(multipla()).stato).toBe('approvata')
    expect(perFile(multipla({ stato: 'bozza' })).stato).toBe('bozza')
  })

  it('ripulisce le risposte accettate dei completamenti', () => {
    const d = perFile({ id: 'bio-902', argomento: 'bio.1.1', tipo: 'completamento', testo: '…… e poi', accettate: [' mitosi ', '', 'cariocinesi'] })
    expect(d).toMatchObject({ accettate: ['mitosi', 'cariocinesi'] })
  })
})

describe('import', () => {
  it('accetta sia un array sia un oggetto con "domande" e ricava la materia dall’argomento', () => {
    const una = { id: 'chim-900', argomento: 'chim.1.1', tipo: 'multipla', testo: 'Prova?', opzioni: ['a', 'b', 'c', 'd', 'e'], corretta: 0 }
    const daArray = leggiImport(JSON.stringify([una]))
    const daOggetto = leggiImport(JSON.stringify({ domande: [una] }))
    expect(daArray.errori).toEqual([])
    expect(daArray.importate).toHaveLength(1)
    expect(daArray.importate[0].materia).toBe('chimica')
    expect(daOggetto.importate).toHaveLength(1)
  })

  it('fa entrare come bozza quello che ha problemi, senza buttarlo', () => {
    const rotta = { id: 'bio-903', argomento: 'bio.1.1', tipo: 'multipla', testo: 'Prova?', opzioni: ['a', 'a', 'c', 'd', 'e'], corretta: 0, stato: 'approvata' }
    const { importate, errori } = leggiImport(JSON.stringify([rotta]))
    expect(importate).toHaveLength(1)
    expect(importate[0].domanda.stato).toBe('bozza')
    expect(errori[0]).toContain('opzioni ripetute')
  })

  it('scarta solo quello di cui non si capisce la materia', () => {
    const { importate, errori } = leggiImport(JSON.stringify([{ id: 'x', argomento: 'boh.1.1', tipo: 'multipla', testo: 'a' }]))
    expect(importate).toEqual([])
    expect(errori).toHaveLength(1)
  })

  it('si lamenta se il JSON non è valido o non è una lista', () => {
    expect(leggiImport('{').errori[0]).toContain('non è un JSON valido')
    expect(leggiImport('{"altro": 1}').errori[0]).toContain('array di domande')
  })
})

describe('lettura e scrittura della cartella', () => {
  const fileBio = JSON.stringify({ materia: 'biologia', nota: 'da tenere', domande: [multipla()] })

  it('legge i file che ci sono e tratta come vuoti quelli che mancano', async () => {
    const { manico } = cartellaFinta({ 'biologia.json': fileBio })
    const archivio = await leggiCartella(manico)
    expect(archivio.biologia.domande).toHaveLength(1)
    expect(archivio.biologia.nota).toBe('da tenere')
    expect(archivio.chimica.domande).toEqual([])
    expect(archivio.fisica.domande).toEqual([])
  })

  it('protesta se un file non è un JSON valido', async () => {
    const { manico } = cartellaFinta({ 'biologia.json': 'non json' })
    await expect(leggiCartella(manico)).rejects.toThrow('non è un JSON valido')
  })

  it('riscrivendo tiene la nota e quello che rileggo è quello che ho scritto', async () => {
    const { manico, disco } = cartellaFinta({ 'biologia.json': fileBio })
    const archivio = await leggiCartella(manico)
    const aggiornata = perFile(multipla({ testo: 'Domanda cambiata?', stato: 'bozza' }))
    await scriviFile(manico, { ...archivio.biologia, domande: [aggiornata] })
    expect(disco['biologia.json']).toContain('da tenere')
    const riletto = await leggiCartella(manico)
    expect(riletto.biologia.domande[0].testo).toBe('Domanda cambiata?')
    expect(riletto.biologia.domande[0].stato).toBe('bozza')
    expect(riletto.biologia.nota).toBe('da tenere')
  })

  it('crea il file di una materia che non ce l’aveva', async () => {
    const { manico, disco } = cartellaFinta({})
    await scriviFile(manico, { materia: 'fisica', domande: [] })
    expect(disco['fisica.json']).toBeDefined()
    expect(JSON.parse(disco['fisica.json'])).toMatchObject({ materia: 'fisica', domande: [] })
  })
})
