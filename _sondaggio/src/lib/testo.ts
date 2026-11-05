// I nomi dei corsi sono inseriti in maiuscolo: per leggerli meglio si mostrano con la sola iniziale maiuscola.
// Un nome già scritto in modo normale resta com'è.
export function nomeLeggibile(nome: string): string {
  if (nome !== nome.toUpperCase()) return nome
  const minuscolo = nome.toLowerCase()
  return minuscolo.charAt(0).toUpperCase() + minuscolo.slice(1)
}
