import { useState } from 'react'
import { Schede } from '../../../components/ui'
import Corsi from './Corsi'
import Docenti from './Docenti'
import Materie from './Materie'

const SCHEDE = [
  {
    id: 'corsi',
    nome: '1 · Corsi di laurea',
  },
  {
    id: 'materie',
    nome: '2 · Materie',
  },
  {
    id: 'docenti',
    nome: '3 · Docenti',
  },
] as const

type IdScheda = (typeof SCHEDE)[number]['id']

export default function DatiAccademici() {
  const [scheda, setScheda] = useState<IdScheda>('corsi')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dati accademici</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ogni corso ha le sue materie e ogni materia i suoi docenti: è la struttura che gli
          studenti vedono compilando.
        </p>
      </div>

      <Schede schede={SCHEDE} attiva={scheda} onCambia={setScheda} />

      {scheda === 'corsi' && <Corsi />}
      {scheda === 'materie' && <Materie />}
      {scheda === 'docenti' && <Docenti />}
    </div>
  )
}
