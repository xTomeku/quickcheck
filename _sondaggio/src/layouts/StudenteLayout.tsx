import { Outlet } from 'react-router-dom'
import BozzaProvider from '../components/BozzaProvider'

export default function StudenteLayout() {
  return (
    <BozzaProvider>
      <div className="flex min-h-screen flex-col">
        <header className="border-b-4 border-udu-giallo bg-udu text-white">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-4">
            <img
              src={`${import.meta.env.BASE_URL}udu-lecce-ingegneria.png`}
              alt="Udu Lecce Ingegneria"
              className="size-12 flex-none rounded-full ring-2 ring-white"
            />
            <div>
              <p className="text-sm font-medium text-white/85">Ingegneria dell'Innovazione</p>
              <p className="text-lg font-extrabold leading-tight">Sondaggio studenti</p>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
          <Outlet />
        </main>
      </div>
    </BozzaProvider>
  )
}
