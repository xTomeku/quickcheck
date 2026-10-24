# Simulatore semestre filtro · QuickCheck

Simulatore delle prove del semestre filtro di Medicina, pubblicato come sezione del sito di QuickCheck:
**https://xtomeku.github.io/quickcheck/simulatore/**

Per ogni materia 31 domande (21 a risposta multipla + 10 a completamento) in 50 minuti, punteggio +1 / −0,1 / 0,
correzione con spiegazioni e argomenti da ripassare.

È un'app statica in React + Vite + TypeScript: nessun server e nessun costo. Estrazione della prova, timer,
correzione e storico girano nel browser; le domande sono file JSON scaricati quando servono.

## Primo avvio sul computer

```bash
npm install
npm run dev        # http://localhost:5173
```

## Pubblicare sul sito

Il sorgente sta in `sito/_simulatore`, la build che va online in `sito/simulatore`.

```bash
npm run pubblica   # compila e copia la build in ../simulatore
```

Poi commit e push del repository del sito: GitHub Pages aggiorna anche il simulatore.

## Il pannello delle domande

Gira solo in sviluppo: `npm run dev`, poi <http://localhost:5173/admin.html>. Serve Chrome o Edge,
perché usa la File System Access API per aprire `public/domande/` e riscriverne i file.

Il bottone "Apri la cartella domande" chiede la cartella (scegli `public/domande`), poi trovi
l'elenco filtrabile per materia, argomento e stato, l'editor con approva/scarta, l'importazione di
lotti JSON e gli avvisi sui problemi (opzioni ripetute, manca lo spazio "……", argomento inesistente
o di un'altra materia). Quello che salvi finisce subito nei file del progetto: per vederlo online
poi serve `npm run pubblica`.

Il pannello non entra nella build pubblicata.

## Le domande

Stanno in `public/domande/biologia.json`, `chimica.json`, `fisica.json`. Entrano in prova solo quelle con
`"stato": "approvata"` (o senza stato). Per aggiornarle senza ricompilare basta sostituire i file anche
direttamente in `sito/simulatore/domande/`.

```json
{ "domande": [
  { "id": "bio-007", "argomento": "bio.4.2", "tipo": "multipla", "stato": "approvata",
    "testo": "…", "opzioni": ["…", "…", "…", "…", "…"], "corretta": 2, "spiegazione": "…" },
  { "id": "fis-026", "argomento": "fis.5.2", "tipo": "completamento", "stato": "bozza",
    "testo": "Per scaldare … servono …… J.", "accettate": ["83720"],
    "numero": { "valore": 83720, "tolleranza": 0.01 }, "unita": "J", "spiegazione": "…" }
] }
```

- `argomento`: codice di `src/data/argomenti.json` (124 argomenti del syllabus 2026/27 con il loro peso).
- `corretta`: indice nell'array `opzioni`; l'ordine mostrato viene mescolato a ogni prova.
- `accettate`: forme valide per i completamenti (maiuscole, accenti e articolo non contano).
  Con `numero` vale anche ogni valore entro la tolleranza relativa (0 = esatto).
- `gruppo` (facoltativo): domande quasi uguali con lo stesso gruppo non escono nella stessa prova.

## Struttura

```
src/lib/generatore.ts    estrazione pesata per argomento, opzioni mescolate, meno ripetizioni
src/lib/correzione.ts    correzione tollerante e punteggio
src/lib/archivio.ts      prova in corso, storico e domande viste (solo su questo dispositivo)
src/components/          Home, Esame, FoglioRisposte, Risultati, Testata (barra di QuickCheck)
dati/                    analisi di syllabus e prove ufficiali 2025 usata per i pesi
src/admin/               pannello domande, solo in sviluppo (admin.html)
scripts/pubblica.mjs     build + copia nel sito
```

## Limiti noti

Le soluzioni sono nei file JSON pubblici: chi apre gli strumenti sviluppatore può leggerle. Per un simulatore
di allenamento è accettabile.
