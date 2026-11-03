import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// HashRouter: GitHub Pages non sa rispondere a indirizzi come /admin, quindi le pagine
// interne stanno dopo il # (…/sondaggio/#/admin) e si possono ricaricare senza errori.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
