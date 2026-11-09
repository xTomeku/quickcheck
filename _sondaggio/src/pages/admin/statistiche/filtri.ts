// '' significa «tutti»; annoStudente può essere '' | '1'..'6' | 'fuori_corso'.
// Materia e docente non sono nella barra dei filtri: li imposta il dettaglio aperto dalla classifica.
export type Filtri = {
  edizione: string
  // Non è un argomento delle funzioni del database: restringe le materie e i corsi mostrati
  tipoCorso: string
  corso: string
  annoCorso: string
  annoStudente: string
  materia: string
  docente: string
}

export const FILTRI_VUOTI: Filtri = {
  edizione: '',
  tipoCorso: '',
  corso: '',
  annoCorso: '',
  annoStudente: '',
  materia: '',
  docente: '',
}

// Argomenti comuni delle funzioni di calcolo nel database (quelli vuoti si omettono)
export function argomenti(f: Filtri) {
  return {
    p_edizione: f.edizione,
    p_corso: f.corso || undefined,
    p_anno_corso: f.annoCorso ? Number(f.annoCorso) : undefined,
    p_anno_studente:
      f.annoStudente && f.annoStudente !== 'fuori_corso' ? Number(f.annoStudente) : undefined,
    p_fuori_corso: f.annoStudente === 'fuori_corso' ? true : undefined,
    p_materia: f.materia || undefined,
    p_docente: f.docente || undefined,
  }
}
