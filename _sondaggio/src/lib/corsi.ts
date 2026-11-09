// I tipi di corso di laurea, nell'ordine in cui si mostrano
export const TIPI_CORSO = [
  { id: 'triennale', nome: 'Triennale', gruppo: 'Corsi triennali', scheda: 'Triennali', durata: 3 },
  { id: 'magistrale', nome: 'Magistrale', gruppo: 'Corsi magistrali', scheda: 'Magistrali', durata: 2 },
  { id: 'ciclo_unico', nome: 'Ciclo unico', gruppo: 'Corsi a ciclo unico', scheda: 'Ciclo unico', durata: 5 },
] as const

// La durata che si propone di solito per un tipo di corso
export function durataDi(tipo: string): number {
  return TIPI_CORSO.find((t) => t.id === tipo)?.durata ?? 3
}

// Divide i corsi per tipo, tenendo solo i gruppi che ne hanno almeno uno
export function perTipo<T extends { tipo: string }>(corsi: T[]) {
  return TIPI_CORSO.map((t) => ({ ...t, corsi: corsi.filter((c) => c.tipo === t.id) })).filter(
    (g) => g.corsi.length > 0,
  )
}
