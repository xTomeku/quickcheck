# Sondaggio studenti

Sondaggio degli studenti del Dipartimento di Ingegneria dell'Innovazione (Università del Salento) sui corsi e sui docenti, a cura di Udu Lecce Ingegneria.

- **Area studenti** (`#/`): scelta del corso, delle materie e compilazione anonima.
- **Pannello admin** (`#/admin`): dati accademici, domande, edizioni, statistiche, importazioni, impostazioni e utenti.

Stack: React, TypeScript, Vite, Tailwind e Supabase (database, accessi e regole di sicurezza).

Pubblicato come sottocartella del sito di QuickCheck: <https://xtomeku.github.io/quickcheck/sondaggio/>.
Il sorgente sta in `sito/_sondaggio/`, la build pubblicata in `sito/sondaggio/`.

## Avviare in locale

1. Copia `.env.example` in `.env.local` e inserisci l'indirizzo del progetto Supabase e la chiave **publishable** (Project Settings → API). Non usare mai la chiave secret.
2. Installa e avvia:

```bash
npm install
npm run dev
```

Il sito è su <http://localhost:5173>.

## Pubblicare

Da `_sondaggio/`:

```bash
npm run pubblica
```

Compila e copia la build in `../sondaggio/`. Poi si fa commit e push del sito, e GitHub Pages lo pubblica.
La build contiene l'indirizzo di Supabase e la chiave publishable, che sono pubblici per natura: la protezione dei dati sta nelle regole del database. `.env.local` resta fuori da git.

Su Supabase, in *Authentication → URL Configuration*, il Site URL è l'indirizzo qui sopra.

Prima di aprire un'edizione agli studenti va scelto e realizzato il metodo di verifica: oggi il database non impedisce compilazioni ripetute.
