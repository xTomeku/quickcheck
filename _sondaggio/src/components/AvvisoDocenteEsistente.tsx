import type { ReactNode } from 'react'
import { Pulsante } from './ui'

type Props = {
  docente: { cognome: string; nome: string; attivo: boolean }
  // Se manca, non c'è modo di «usare» il docente già presente (ad esempio nella scheda Docenti)
  onUsaEsistente?: () => void
  onAggiungiComunque: () => void
  onAnnulla: () => void
  children?: ReactNode
}

// Avviso con scelta quando un nome appena scritto coincide con un docente già in memoria
export default function AvvisoDocenteEsistente({
  docente,
  onUsaEsistente,
  onAggiungiComunque,
  onAnnulla,
  children,
}: Props) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-lg border border-udu-giallo bg-giallo-velo p-3 text-sm text-grafite"
    >
      <p>
        <strong>
          {docente.cognome} {docente.nome}
        </strong>{' '}
        esiste già in elenco{docente.attivo ? '' : ' (ma è disattivato)'}. Vuoi usare quello presente o
        aggiungerne comunque uno nuovo?
      </p>
      {children}
      <div className="flex flex-wrap gap-2">
        {onUsaEsistente && docente.attivo && (
          <Pulsante variante="primario" onClick={onUsaEsistente}>
            Usa quello già presente
          </Pulsante>
        )}
        <Pulsante onClick={onAggiungiComunque}>Aggiungi comunque come nuovo</Pulsante>
        <Pulsante variante="testo" onClick={onAnnulla}>
          Annulla
        </Pulsante>
      </div>
    </div>
  )
}
