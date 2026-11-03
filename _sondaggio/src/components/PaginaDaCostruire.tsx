type Props = {
  titolo: string
  descrizione: string
}

// Segnaposto per le schermate ancora da realizzare
export default function PaginaDaCostruire({ titolo, descrizione }: Props) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
      <h1 className="text-xl font-semibold">{titolo}</h1>
      <p className="mt-2 text-slate-600">{descrizione}</p>
      <p className="mt-4 text-sm text-slate-400">Schermata ancora da realizzare.</p>
    </section>
  )
}
