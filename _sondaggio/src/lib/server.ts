// Chiamate alla funzione di verifica su Supabase (verifica-studente): controlla l'accesso Google e
// passa al database solo un'impronta. Il browser non parla mai direttamente con le tabelle delle risposte.

const URL_FUNZIONE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verifica-studente`

export type EsitoServer<T> = { ok: true; dati: T } | { ok: false; stato: number; errore: string }

export async function chiamaServer<T>(
  azione: 'stato' | 'invia',
  idToken: string,
  edizione: string,
  extra: Record<string, unknown> = {},
): Promise<EsitoServer<T>> {
  // Solo in sviluppo, con l'anteprima: nessuna materia già compilata e nessun invio vero
  if (import.meta.env.DEV && idToken === 'anteprima') {
    return azione === 'stato'
      ? { ok: true, dati: { compilate: [], extra_inviate: false } as T }
      : { ok: false, stato: 400, errore: "L'anteprima non invia le risposte." }
  }
  try {
    const risposta = await fetch(URL_FUNZIONE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione, id_token: idToken, edizione, ...extra }),
    })
    const corpo = await risposta.json().catch(() => ({}))
    if (!risposta.ok) {
      return {
        ok: false,
        stato: risposta.status,
        errore: typeof corpo.errore === 'string' ? corpo.errore : 'Qualcosa non ha funzionato. Riprova.',
      }
    }
    return { ok: true, dati: corpo as T }
  } catch {
    return { ok: false, stato: 0, errore: 'Non riesco a collegarmi. Controlla la connessione e riprova.' }
  }
}
