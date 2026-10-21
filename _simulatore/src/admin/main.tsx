import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles.css'
import Admin from './Admin'

// Pagina di servizio: gira solo con `npm run dev`, non entra nella build pubblicata.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Admin />
  </StrictMode>,
)
