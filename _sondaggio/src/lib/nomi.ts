// Minuscole, senza accenti e senza punteggiatura, con gli spazi ridotti a uno: per confrontare i nomi
export function normalizza(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

type Persona = { cognome: string; nome: string }

// Due nomi sono lo stesso se hanno le stesse parole, in qualsiasi ordine: «Rossi Mario» e «mario rossi» coincidono
export function chiaveNome(p: Persona): string {
  return normalizza(`${p.cognome} ${p.nome}`).split(' ').sort().join(' ')
}

// Il primo docente già in memoria con lo stesso nome e cognome (si guardano anche i disattivati)
export function trovaUguale<T extends Persona>(elenco: T[], cercato: Persona): T | undefined {
  const chiave = chiaveNome(cercato)
  return chiave === '' ? undefined : elenco.find((d) => chiaveNome(d) === chiave)
}
