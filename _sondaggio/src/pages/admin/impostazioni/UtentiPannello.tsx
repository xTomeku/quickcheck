import { useState, type FormEvent } from 'react'
import { Avviso, Campo, Input, Pulsante, Select } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'

type Utente = {
  user_id: string
  email: string
  ruolo: string
  vede_docenti: boolean
  ultimo_accesso: string | null
}

const RUOLI: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor',
  lettura: 'Sola lettura',
}

export default function UtentiPannello() {
  const { sessione } = useAuth()
  const { righe, errore, ricarica } = useElenco<Utente>(
    () => supabase.rpc('elenco_utenti_pannello'),
    'utenti',
  )
  const [avviso, setAvviso] = useState<string | null>(null)

  async function imposta(email: string, ruolo: string, vedeDocenti: boolean) {
    const { error } = await supabase.rpc('imposta_utente_pannello', {
      p_email: email,
      p_ruolo: ruolo,
      p_vede_docenti: vedeDocenti,
    })
    setAvviso(error ? messaggioErrore(error) : null)
    ricarica()
  }

  async function rimuovi(u: Utente) {
    if (!window.confirm(`Togliere l'accesso al pannello a ${u.email}? L'account resta in Supabase.`)) return
    const { error } = await supabase.rpc('rimuovi_utente_pannello', { p_user_id: u.user_id })
    setAvviso(error ? messaggioErrore(error) : null)
    ricarica()
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-lg font-semibold">Utenti del pannello</h2>
        <p className="mt-1 text-sm text-slate-500">
          Admin: tutto. Editor: dati, domande, import e statistiche. Sola lettura: solo statistiche.
          Le valutazioni dei singoli docenti le vedono gli admin e chi è autorizzato qui sotto.
        </p>
      </div>

      {avviso && <Avviso>{avviso}</Avviso>}
      {errore && <Avviso>{errore}</Avviso>}

      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
          {righe.map((u) => {
            const io = u.user_id === sessione?.user.id
            return (
              <li key={u.user_id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {u.email}
                    {io && (
                      <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                        Tu
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">
                    {u.ultimo_accesso
                      ? `Ultimo accesso: ${new Date(u.ultimo_accesso).toLocaleDateString('it-IT')}`
                      : 'Non ha ancora fatto l’accesso'}
                  </p>
                </div>
                <Select
                  aria-label={`Ruolo di ${u.email}`}
                  className="!w-auto"
                  value={u.ruolo}
                  onChange={(e) => imposta(u.email, e.target.value, u.vede_docenti)}
                >
                  {Object.entries(RUOLI).map(([valore, nome]) => (
                    <option key={valore} value={valore}>
                      {nome}
                    </option>
                  ))}
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    disabled={u.ruolo === 'admin'}
                    checked={u.ruolo === 'admin' || u.vede_docenti}
                    onChange={(e) => imposta(u.email, u.ruolo, e.target.checked)}
                  />
                  Vede i dati dei docenti
                </label>
                <Pulsante
                  variante="pericolo"
                  disabled={io}
                  title={io ? 'Non puoi togliere l’accesso a te stesso' : undefined}
                  onClick={() => rimuovi(u)}
                >
                  Rimuovi
                </Pulsante>
              </li>
            )
          })}
        </ul>
      )}

      <NuovoUtente
        onFatto={() => {
          setAvviso(null)
          ricarica()
        }}
      />
    </section>
  )
}

function NuovoUtente({ onFatto }: { onFatto: () => void }) {
  const [email, setEmail] = useState('')
  const [ruolo, setRuolo] = useState('editor')
  const [vedeDocenti, setVedeDocenti] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    const { error } = await supabase.rpc('imposta_utente_pannello', {
      p_email: email.trim(),
      p_ruolo: ruolo,
      p_vede_docenti: ruolo === 'admin' ? true : vedeDocenti,
    })
    setInvio(false)
    if (error) {
      setErrore(messaggioErrore(error))
      return
    }
    setEmail('')
    onFatto()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl bg-slate-50 p-4">
      <h3 className="font-semibold">Dai accesso a una persona</h3>
      <p className="text-sm text-slate-600">
        L'account va creato prima in Supabase (Authentication, Users, Add user, con «Auto confirm
        user» attivo). Poi qui gli si assegna il ruolo con la stessa email.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Campo etichetta="Email dell'account">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo etichetta="Ruolo">
          <Select value={ruolo} onChange={(e) => setRuolo(e.target.value)}>
            {Object.entries(RUOLI).map(([valore, nome]) => (
              <option key={valore} value={valore}>
                {nome}
              </option>
            ))}
          </Select>
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          disabled={ruolo === 'admin'}
          checked={ruolo === 'admin' || vedeDocenti}
          onChange={(e) => setVedeDocenti(e.target.checked)}
        />
        Può vedere i dati dei docenti
      </label>
      {errore && <Avviso>{errore}</Avviso>}
      <Pulsante type="submit" variante="primario" disabled={invio}>
        {invio ? 'Salvataggio…' : 'Assegna il ruolo'}
      </Pulsante>
    </form>
  )
}
