/** Testo di una domanda: i puntini "……" delle domande a completamento diventano uno spazio da riempire. */
export function Testo({ children }: { children: string }) {
  const parti = children.split(/…{1,2}|\.{4,}/)
  if (parti.length === 1) return <>{children}</>
  return (
    <>
      {parti.map((p, i) => (
        <span key={i}>
          {p}
          {i < parti.length - 1 && <span className="lacuna" aria-label="spazio da completare" />}
        </span>
      ))}
    </>
  )
}

export const LETTERE = ['A', 'B', 'C', 'D', 'E']
