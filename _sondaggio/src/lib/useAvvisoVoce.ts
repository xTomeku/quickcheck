import { useState } from 'react'

// Il messaggio d'errore di un elenco, insieme alla voce su cui si stava agendo: così si mostra
// sotto quella voce (con <AvvisoVoce>) e non in cima, dove in una pagina lunga non si vede
export function useAvvisoVoce() {
  const [avviso, setAvviso] = useState<{ voce: string; testo: string } | null>(null)
  return {
    // Un testo vuoto o null toglie il messaggio
    segnala: (voce: string, testo: string | null) => setAvviso(testo ? { voce, testo } : null),
    togli: () => setAvviso(null),
    testoDi: (voce: string) => (avviso?.voce === voce ? avviso.testo : null),
  }
}
