import { messaggioErrore } from './errori'
import { supabase } from './supabase'

export type TipoVoce = 'domanda' | 'corso' | 'materia' | 'docente' | 'edizione'

// Cosa si porta via l'eliminazione, come lo descrive il database: chiave -> [singolare, plurale]
const COSE: Record<string, [string, string]> = {
  risposte: ['risposta', 'risposte'],
  compilazioni: ['compilazione', 'compilazioni'],
  domande_dipendenti: ['domanda che dipende da questa', 'domande che dipendono da questa'],
  materie_collegate: ['collegamento con una materia', 'collegamenti con materie'],
  corsi_collegati: ['collegamento con un corso', 'collegamenti con corsi'],
  docenti_collegati: ['collegamento con un docente', 'collegamenti con docenti'],
}

export type EsitoEliminazione =
  | { esito: 'eliminata' }
  | { esito: 'annullata' }
  | { esito: 'errore'; messaggio: string }

// Elimina definitivamente una voce con tutto ciò che ne dipende (risposte comprese). Prima chiede al
// database cosa verrebbe cancellato, poi chiede conferma a chi sta usando il pannello.
export async function eliminaVoce(
  tipo: TipoVoce,
  id: string,
  nome: string,
): Promise<EsitoEliminazione> {
  const anteprima = await supabase.rpc('elimina_voce', { p_tipo: tipo, p_id: id, p_esegui: false })
  if (anteprima.error) return { esito: 'errore', messaggio: messaggioErrore(anteprima.error) }

  const conteggi = Object.entries((anteprima.data ?? {}) as Record<string, number>)
    .filter(([chiave, n]) => n > 0 && chiave in COSE)
    .map(([chiave, n]) => `${n} ${COSE[chiave][n === 1 ? 0 : 1]}`)

  const conferma = window.confirm(
    `Eliminare definitivamente «${nome}»?\n\n` +
      (conteggi.length > 0
        ? `Verranno cancellati anche: ${conteggi.join(', ')}.`
        : 'Non ci sono dati collegati da cancellare.') +
      "\n\nL'operazione non si può annullare.",
  )
  if (!conferma) return { esito: 'annullata' }

  const { error } = await supabase.rpc('elimina_voce', { p_tipo: tipo, p_id: id, p_esegui: true })
  return error ? { esito: 'errore', messaggio: messaggioErrore(error) } : { esito: 'eliminata' }
}
