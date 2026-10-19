# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Studenti UniSalento che scoprono QuickCheck**: arrivano sul sito per capire cos'è e installarla (APK Android o Web App/PWA su iPhone, iPad, PC).
- **Studenti che già la usano**: tornano per aggiornamenti, versioni precedenti, bug noti/risolti, contatti e segnalazioni.

Le due audience hanno pari importanza.

Utente secondario: l'autore (Stefano Sciurba), unico operatore del pannello admin (`admin.html`), che gestisce rilasci, notifiche, iscrizioni, bug, contenuti del sito e statistiche d'uso.

## Product Purpose
QuickCheck è l'app per gli studenti dell'Università del Salento: orari delle lezioni, ricerca aule e rubrica del personale d'Ateneo in un'unica interfaccia. Il sito è la porta d'ingresso (scoperta, download, guida all'installazione) e il punto di supporto (changelog, bug tracker, FAQ, contatti). Successo = studenti che installano e continuano a usare l'app aggiornata.

## Positioning
- Tutto in un posto: orari, aule e rubrica insieme.
- Orario offline e notifiche delle lezioni.
- Fatta da uno studente, progetto indipendente vicino ai bisogni reali.
- Gratis, senza registrazione, pronta in pochi tap.

## Operating Context
- Download APK fuori dal Play Store (via GitHub Releases): l'utente affronta avvisi Android ("file potenzialmente dannoso", "origini sconosciute") che il sito deve accompagnare.
- Web App su `quick-check-unisalento.vercel.app`, installabile su iOS con "Aggiungi a Home".
- Uso prevalente da smartphone.

## Capabilities and Constraints
- Sito statico multipagina (index, download, credits, bugs, privacy, admin) su GitHub Pages; dati dinamici (funzionalità, FAQ, contatti, rilasci, bug, statistiche) caricati da Supabase.
- Pannello admin a operatore singolo: niente gestione ruoli/multiutente.
- Lingua: italiano.

## Brand Commitments
- Nome: QuickCheck. Autore: Stefano Sciurba.
- Deve essere sempre chiaro che è un **progetto studentesco indipendente e non ufficiale**; i diritti sul logo di base appartengono all'Università del Salento.
- Asset: `assets/logo.png`, `assets/icona.png`.

## Evidence on Hand
- Numero download e data ultimo aggiornamento reali (da GitHub/Supabase), changelog in `CHANGELOG.md`, cronologia versioni.
- Nessuna testimonianza, recensione o metrica di terzi: non inventarne.

## Product Principles
1. Installare deve essere facile su qualsiasi dispositivo: ogni ostacolo (avvisi APK, iOS) va spiegato con calma.
2. Onestà: indipendente e non ufficiale, mai presentarsi come prodotto d'Ateneo.
3. Dati reali e aggiornati dal backend, mai numeri o claim inventati.
4. Scoperta e supporto valgono uguale: chi torna trova subito versioni, bug e contatti.
