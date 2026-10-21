import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Domanda, MateriaId, Prova, Risultato } from './types'
import { caricaBanca, materiaDi, MATERIE, ORDINE_MATERIE, RINFORZO_RIPASSO, RIPASSO } from './lib/dati'
import { nuovaProva } from './lib/generatore'
import { correggiSezione } from './lib/correzione'
import { argomentiDeboli } from './lib/statistiche'
import { archivio } from './lib/archivio'
import { Home } from './components/Home'
import { Esame } from './components/Esame'
import { Risultati } from './components/Risultati'

type Schermata =
  | { tipo: 'home' }
  | { tipo: 'prova'; prova: Prova }
  | { tipo: 'risultato'; risultato: Risultato; prova: Prova }

// Le prove consegnate vengono tenute insieme al risultato per poterle rivedere dallo storico.
const CHIAVE_PROVE = 'sf.prove-consegnate.v1'
function leggiProve(): Record<string, Prova> {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE_PROVE) ?? '{}') as Record<string, Prova>
  } catch {
    return {}
  }
}
function dimenticaProve(quali: (p: Prova) => boolean) {
  try {
    const tutte = leggiProve()
    for (const id of Object.keys(tutte)) if (quali(tutte[id])) delete tutte[id]
    localStorage.setItem(CHIAVE_PROVE, JSON.stringify(tutte))
  } catch {
    /* archiviazione non disponibile */
  }
}

function salvaProva(p: Prova) {
  try {
    const tutte = leggiProve()
    tutte[p.id] = p
    const ids = Object.keys(tutte).sort((a, b) => tutte[b].creata - tutte[a].creata).slice(0, 40)
    localStorage.setItem(CHIAVE_PROVE, JSON.stringify(Object.fromEntries(ids.map((id) => [id, tutte[id]]))))
  } catch {
    /* archiviazione non disponibile */
  }
}

export default function App() {
  const [schermata, setSchermata] = useState<Schermata>({ tipo: 'home' })
  const [inCorso, setInCorso] = useState<Prova | null>(() => archivio.provaInCorso())
  const [storico, setStorico] = useState<Risultato[]>(() => archivio.storico())
  const [banca, setBanca] = useState<Map<string, Domanda>>(new Map())
  const [caricamento, setCaricamento] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const assicuraBanche = useCallback(async (materie: MateriaId[]) => {
    const banche = await Promise.all(materie.map((m) => caricaBanca(m)))
    const tutte = Object.fromEntries(materie.map((m, i) => [m, banche[i]])) as Record<MateriaId, Domanda[]>
    setBanca((prec) => {
      const m = new Map(prec)
      for (const lista of banche) for (const d of lista) m.set(d.id, d)
      return m
    })
    return tutte
  }, [])

  const avvia = async (materie: MateriaId[], crea: (banche: Record<MateriaId, Domanda[]>) => Prova) => {
    setErrore(null)
    setCaricamento(true)
    try {
      const banche = await assicuraBanche(materie)
      const prova = crea(banche)
      archivio.salvaProvaInCorso(prova)
      setInCorso(prova)
      setSchermata({ tipo: 'prova', prova })
      window.scrollTo({ top: 0 })
    } catch {
      setErrore('Non è stato possibile caricare le domande. Controlla la connessione e riprova.')
    } finally {
      setCaricamento(false)
    }
  }

  const inizia = (materie: MateriaId[]) =>
    avvia(materie, (banche) =>
      nuovaProva(
        materie.length > 1 ? 'completa' : 'materia',
        materie.map((m) => MATERIE[m]),
        banche,
        { viste: archivio.viste() },
      ),
    )

  /**
   * Ripasso: una prova corta sugli argomenti in cui si sbaglia di più. Entrano solo le materie
   * che hanno argomenti deboli, e quegli argomenti escono molto più spesso degli altri.
   */
  const ripassa = () => {
    const deboli = argomentiDeboli(storico)
    const materie = ORDINE_MATERIE.filter((m) => deboli.some((a) => materiaDi(a.argomento) === m))
    if (materie.length === 0) return
    return avvia(materie, (banche) =>
      nuovaProva(
        'ripasso',
        materie.map((m) => MATERIE[m]),
        banche,
        { viste: archivio.viste(), rinforzo: new Map(deboli.map((a) => [a.argomento, RINFORZO_RIPASSO])) },
        RIPASSO,
      ),
    )
  }

  const riprendi = async () => {
    if (!inCorso) return
    setCaricamento(true)
    try {
      await assicuraBanche(inCorso.sezioni.map((s) => s.materia))
      setSchermata({ tipo: 'prova', prova: inCorso })
    } catch {
      setErrore('Non è stato possibile caricare le domande della prova in corso. Riprova tra poco.')
    } finally {
      setCaricamento(false)
    }
  }

  const aggiorna = useCallback((p: Prova) => {
    archivio.salvaProvaInCorso(p)
    setInCorso(p)
    setSchermata({ tipo: 'prova', prova: p })
  }, [])

  const concludi = useCallback(
    (p: Prova) => {
      const risultato: Risultato = {
        id: p.id,
        modalita: p.modalita,
        data: Date.now(),
        sezioni: p.sezioni.map((s) => correggiSezione(s, banca)),
      }
      archivio.aggiungiRisultato(risultato)
      archivio.segnaViste(p.sezioni.flatMap((s) => s.domande.map((q) => q.id)))
      archivio.chiudiProvaInCorso()
      salvaProva(p)
      setInCorso(null)
      setStorico(archivio.storico())
      setSchermata({ tipo: 'risultato', risultato, prova: p })
      window.scrollTo({ top: 0 })
    },
    [banca],
  )

  /** Toglie una prova dallo storico e con lei le risposte tenute per rivederla. */
  const eliminaRisultato = (id: string) => {
    archivio.eliminaRisultato(id)
    dimenticaProve((p) => p.id === id)
    setStorico(archivio.storico())
  }

  const svuotaStorico = () => {
    archivio.svuotaStorico()
    dimenticaProve(() => true)
    setStorico([])
  }

  const apriRisultato = async (r: Risultato) => {
    const p = leggiProve()[r.id]
    if (!p) {
      setErrore('La revisione di questa prova non è più disponibile su questo dispositivo.')
      return
    }
    await assicuraBanche(p.sezioni.map((s) => s.materia))
    setSchermata({ tipo: 'risultato', risultato: r, prova: p })
    window.scrollTo({ top: 0 })
  }

  // il titolo della scheda segue la schermata
  const titolo = useMemo(() => {
    if (schermata.tipo === 'prova') return 'Prova in corso, simulatore semestre filtro'
    if (schermata.tipo === 'risultato') return 'Correzione, simulatore semestre filtro'
    return 'Simulatore semestre filtro'
  }, [schermata.tipo])
  useEffect(() => {
    document.title = titolo
  }, [titolo])

  if (schermata.tipo === 'prova' && schermata.prova.sezioni.every((s) => s.domande.every((q) => banca.has(q.id)))) {
    return (
      <Esame
        prova={schermata.prova}
        banca={banca}
        onCambia={aggiorna}
        onFine={concludi}
        onEsci={() => setSchermata({ tipo: 'home' })}
      />
    )
  }
  if (schermata.tipo === 'risultato') {
    const materie = schermata.risultato.sezioni.map((s) => s.materia)
    return (
      <Risultati
        risultato={schermata.risultato}
        prova={schermata.prova}
        banca={banca}
        onNuova={() => (schermata.risultato.modalita === 'ripasso' ? ripassa() : inizia(materie))}
        onHome={() => setSchermata({ tipo: 'home' })}
      />
    )
  }
  return (
    <Home
      inCorso={inCorso}
      storico={storico}
      caricamento={caricamento}
      errore={errore}
      onInizia={inizia}
      onRiprendi={riprendi}
      onAbbandona={() => {
        archivio.chiudiProvaInCorso()
        setInCorso(null)
      }}
      onApriRisultato={apriRisultato}
      onElimina={eliminaRisultato}
      onSvuota={svuotaStorico}
      onRipassa={ripassa}
    />
  )
}
