type ErroreDb = { code?: string; message: string }

// Traduce gli errori del database in messaggi comprensibili
export function messaggioErrore(errore: ErroreDb): string {
  switch (errore.code) {
    case '23505':
      return 'Esiste già un elemento uguale.'
    case '23503':
      return 'Non si può completare: ci sono dati collegati (ad esempio risposte già raccolte).'
    case '23514':
      return 'Uno dei valori inseriti non è ammesso.'
    case '42501':
      return 'Il tuo ruolo non può fare questa operazione.'
    case 'P0001':
      // Controlli scritti nel database: i messaggi sono già in italiano
      return errore.message
    default:
      return 'Operazione non riuscita. Riprova.'
  }
}
