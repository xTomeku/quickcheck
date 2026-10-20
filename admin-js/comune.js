// Pannello admin - parte comune (caricata per prima, vedi admin.html).
// Client Supabase, elementi del login e del menu, finestra di conferma (customConfirm), toast,
// riordino trascinando, accesso, navigazione tra le sezioni, modifiche non salvate, escapeHtml.

/* global supabase */
const _supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// Login & Core DOM
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const userEmailDisplay = document.getElementById('user-email-display');

// Menu laterale (navigazione tra le sezioni)
const adminMenuApri = document.getElementById('admin-menu-apri');
const adminVelo = document.getElementById('admin-velo');
const adminBarraTitolo = document.getElementById('admin-barra-titolo');

// ===== UTILS: Toast, Confirm, Drag&Drop =====
// azione (facoltativa) = { etichetta, fai }: pulsante nel messaggio (es. "Annulla"), che resta 6 secondi
function showToast(message, type = 'success', azione = null) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icona">${type === 'success' ? '✓' : '⚠'}</span>
        <span>${message}</span>
    `;
    const chiudi = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    };
    if (azione) {
        const pulsante = document.createElement('button');
        pulsante.type = 'button';
        pulsante.className = 'toast-azione';
        pulsante.textContent = azione.etichetta;
        pulsante.addEventListener('click', () => { chiudi(); azione.fai(); }, { once: true });
        toast.appendChild(pulsante);
    }
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3s (6s con un pulsante)
    setTimeout(chiudi, azione ? 6000 : 3000);
}

// Modale di conferma personalizzato universale (sostituisce confirm, alert e prompt del browser).
// Opzioni: title, confirmText, cancelText, icon, isDanger (predefinito true: pulsante rosso),
// testo = testo da copiare mostrato in un riquadro già selezionato (al posto di prompt),
// soloChiudi = un solo pulsante (al posto di alert). Restituisce una Promise: true = confermato.
function customConfirm(message, options = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const iconEl = document.getElementById('confirm-icon');
        const testoEl = document.getElementById('confirm-testo');
        const btnYes = document.getElementById('confirm-yes');
        const btnNo = document.getElementById('confirm-no');

        if (!modal) {
            // Fallback di sicurezza in caso il DOM non sia pronto
            resolve(window.confirm(message));
            return;
        }

        // Opzioni con valori predefiniti intelligenti
        const isDanger = options.isDanger !== undefined ? options.isDanger : true;
        const title = options.title || (isDanger ? 'Richiesta di Conferma' : 'Conferma Operazione');
        const confirmText = options.confirmText || (isDanger ? 'Elimina' : 'Conferma');
        const cancelText = options.cancelText || 'Annulla';
        const icon = options.icon || (isDanger ? '🗑️' : '🚀');
        const conTesto = typeof options.testo === 'string';

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (iconEl) iconEl.textContent = icon;
        if (testoEl) {
            testoEl.value = conTesto ? options.testo : '';
            testoEl.classList.toggle('hidden', !conTesto);
        }

        if (btnYes) {
            btnYes.textContent = confirmText;
            btnYes.classList.toggle('admin-pericolo', isDanger);
        }

        if (btnNo) {
            btnNo.textContent = cancelText;
            btnNo.classList.toggle('hidden', !!options.soloChiudi);
        }

        modal.classList.remove('hidden');
        // Con un testo da copiare lo si seleziona subito; per le operazioni pericolose
        // il fuoco va su Annulla, così Invio non conferma per sbaglio
        if (conTesto && testoEl) { testoEl.focus(); testoEl.select(); }
        else (isDanger && !options.soloChiudi ? btnNo : btnYes)?.focus();

        // Pulizia listener dopo la scelta
        const cleanup = () => {
            modal.classList.add('hidden');
            btnYes?.removeEventListener('click', onYes);
            btnNo?.removeEventListener('click', onNo);
            modal.removeEventListener('click', onBackdrop);
            document.removeEventListener('keydown', onKey);
        };

        const onYes = () => { cleanup(); resolve(true); };
        const onNo = () => { cleanup(); resolve(false); };
        const onBackdrop = (e) => { if (e.target === modal) { cleanup(); resolve(false); } };
        const onKey = (e) => { if (e.key === 'Escape') { cleanup(); resolve(false); } };

        btnYes?.addEventListener('click', onYes);
        btnNo?.addEventListener('click', onNo);
        modal.addEventListener('click', onBackdrop);
        document.addEventListener('keydown', onKey);
    });
}

// Id della riga di un elenco: data-id del pulsante Modifica, oppure l'argomento di onclick="editX(...)".
// Resta una stringa: credits, contatti, note legali e funzionalità hanno id uuid (prima parseInt li
// rendeva NaN o un numero sbagliato e l'ordine non si salvava), FAQ e bug id numerici.
function _idRigaElenco(riga) {
    const btn = riga.querySelector('.actions button[data-id], .actions button[onclick^="edit"]');
    if (!btn) return null;
    if (btn.dataset.id) return btn.dataset.id;
    const m = (btn.getAttribute('onclick') || '').match(/\(\s*['"]?([^'")\s]+)['"]?\s*\)/);
    return m ? m[1] : null;
}

// Riordino trascinando la maniglia ⋮⋮: salva order_index (0, 1, 2...) nell'ordine nuovo.
// ricarica = funzione che rilegge l'elenco: dopo il salvataggio (così il campo "Ordine" delle
// finestre è aggiornato) e dopo un errore (l'elenco torna all'ordine salvato).
function initSortable(listElement, tableName, ricarica) {
    if (!window.Sortable) return;

    // La lista viene ridisegnata a ogni caricamento: una sola istanza alla volta,
    // altrimenti a ogni riapertura della sezione se ne aggiungerebbe un'altra
    const precedente = Sortable.get && Sortable.get(listElement);
    if (precedente) precedente.destroy();

    new Sortable(listElement, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: async function (evt) {
            if (evt.oldIndex === evt.newIndex) return;

            const righe = Array.from(listElement.children)
                .map((riga, index) => ({ id: _idRigaElenco(riga), order_index: index }))
                .filter(r => r.id);
            if (!righe.length) {
                showToast('Ordine non salvato: righe senza id', 'error');
                return;
            }

            try {
                const esiti = await Promise.all(righe.map(r =>
                    _supabase.from(tableName).update({ order_index: r.order_index }).eq('id', r.id)));
                const errore = esiti.find(e => e.error);
                if (errore) throw errore.error;
                showToast('Ordine aggiornato con successo');
            } catch (err) {
                showToast('Errore nel salvataggio dell\'ordine: ' + (err.message || err), 'error');
                console.error(err);
            }
            if (typeof ricarica === 'function') ricarica();
        }
    });
}

// Check Session on Start
async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        showDashboard(session.user);
    } else {
        showLogin();
    }
}

function showDashboard(user) {
    loginSection.classList.add('hidden');
    adminDashboard.classList.remove('hidden');
    document.body.classList.add('admin-dentro');
    userEmailDisplay.textContent = user.email;
    userEmailDisplay.title = `Loggato come: ${user.email}`;
    fetchDownloadStats();
    fetchUserStats();
    fetchVersionRolloutStats();
    fetchUpdates();
    fetchCredits();
    fetchContacts();
    fetchLegal();
    fetchFeatures();
    fetchFAQ();
    fetchBugs();
    fetchNotifications();
    // Apre la sezione scritta nell'indirizzo (admin.html#novita); senza # la Panoramica
    const iniziale = sezioneDaIndirizzo();
    apriSezione(iniziale);
    // I pallini gialli del menu vengono dallo stato dell'app della Panoramica:
    // si legge anche quando all'accesso si apre un'altra sezione
    if (iniziale !== 'panoramica') aggiornaStatoPanoramica(0);
}

// ===== Navigazione: menu laterale e sezione nell'indirizzo =====
// Chiave = nome dopo # nell'indirizzo e data-sezione della voce del menu.
// carica = cosa si ricarica a ogni apertura, come faceva il vecchio gestore delle schede;
// null = dati già caricati all'accesso da showDashboard (e dopo ogni salvataggio).
const SEZIONI_ADMIN = {
    panoramica:   { id: 'panoramica-section',    titolo: 'Panoramica',            carica: () => caricaPanoramica() },
    statistiche:  { id: 'analytics-section',     titolo: 'Statistiche',           carica: () => { fetchDownloadStats(); fetchUserStats(); fetchVersionRolloutStats(); } },
    versioni:     { id: 'updates-section',       titolo: 'Versioni e patch note', carica: null },
    novita:       { id: 'novita-section',        titolo: 'Novità',                carica: () => caricaElencoNovita() },
    messaggio:    { id: 'messaggio-section',     titolo: "Messaggio all'avvio",   carica: () => fetchConfigApp(['messaggio']) },
    mappe:        { id: 'mappe-section',         titolo: 'Mappe',                 carica: () => fetchConfigApp(['mappe']) },
    menu:         { id: 'menu-section',          titolo: 'Menù mensa',            carica: () => fetchConfigApp(['menu']) },
    // Pre-carica anche l'elenco dei corsi per il menu a tendina
    notifiche:    { id: 'notifications-section', titolo: 'Push e avvisi',         carica: () => { fetchNotifications(); caricaCorsiUniSalento(); caricaIscrizioniCorsi(); } },
    modifiche:    { id: 'modifiche-section',     titolo: 'Modifiche orario',      carica: () => caricaModifiche() },
    simulatore:   { id: 'simulatore-section',    titolo: 'Simulatore',            carica: () => caricaSimulatore() },
    bug:          { id: 'bugs-admin-section',    titolo: 'Bug e problemi',        carica: () => fetchBugs() },
    funzionalita: { id: 'features-section',      titolo: 'Funzionalità',          carica: null },
    faq:          { id: 'faq-admin-section',     titolo: 'FAQ',                   carica: null },
    credits:      { id: 'credits-section',       titolo: 'Credits',               carica: null },
    contatti:     { id: 'contacts-section',      titolo: 'Contatti',              carica: null },
    legale:       { id: 'legal-section',         titolo: 'Note legali',           carica: null },
};
const SEZIONE_INIZIALE = 'panoramica';
let sezioneAperta = null;

function sezioneDaIndirizzo() {
    const chiave = location.hash.replace(/^#/, '');
    return Object.prototype.hasOwnProperty.call(SEZIONI_ADMIN, chiave) ? chiave : SEZIONE_INIZIALE;
}

// Mostra una sezione, evidenzia la sua voce e ne carica i dati
function apriSezione(chiave) {
    const sezione = SEZIONI_ADMIN[chiave];
    const elemento = sezione && document.getElementById(sezione.id);
    if (!elemento) {
        console.error(`Sezione non trovata: ${chiave}`);
        return;
    }
    document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
    elemento.classList.remove('hidden');
    document.querySelectorAll('.admin-voce').forEach(v => {
        const attiva = v.dataset.sezione === chiave;
        v.classList.toggle('attiva', attiva);
        if (attiva) v.setAttribute('aria-current', 'page');
        else v.removeAttribute('aria-current');
    });
    if (adminBarraTitolo) adminBarraTitolo.textContent = sezione.titolo;
    document.getElementById('admin-barra-aggiorna')?.classList.toggle('hidden', chiave !== 'panoramica');
    document.title = `${sezione.titolo} · Admin - QuickCheck`;
    if (sezioneAperta !== chiave) window.scrollTo(0, 0);
    sezioneAperta = chiave;
    chiudiMenuMobile();
    if (sezione.carica) sezione.carica();
}

// Avanti/indietro del browser e indirizzo scritto a mano.
// Con modifiche non salvate si torna subito all'indirizzo della sezione aperta finché l'utente non sceglie.
window.addEventListener('hashchange', async () => {
    if (adminDashboard.classList.contains('hidden')) return;
    const chiave = sezioneDaIndirizzo();
    if (chiave !== sezioneAperta && _modificheNonSalvate.has(sezioneAperta)) {
        history.replaceState(null, '', '#' + sezioneAperta);
        if (!(await confermaUscitaSezione())) return;
        history.replaceState(null, '', '#' + chiave);
    }
    apriSezione(chiave);
});

// Link a una sezione (#chiave): voci del menu e riquadri della Panoramica.
// Il cambio di indirizzo lo fa il pannello (pushState, niente hashchange), dopo l'eventuale conferma.
// Il link della sezione già aperta la ricarica.
document.addEventListener('click', async (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || adminDashboard.classList.contains('hidden')) return;
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // nuova scheda: lascia fare al browser
    const chiave = link.getAttribute('href').slice(1);
    if (!Object.prototype.hasOwnProperty.call(SEZIONI_ADMIN, chiave)) return;
    e.preventDefault();
    if (!(await confermaUscitaSezione())) return;
    if (location.hash !== '#' + chiave) history.pushState(null, '', '#' + chiave);
    apriSezione(chiave);
});

// ===== Modifiche non salvate =====
// Novità, versione aperta nella finestra, messaggio all'avvio, mappe e menù: chi cambia sezione,
// ricarica la sezione, esce o chiude la pagina con modifiche non salvate riceve un avviso.
// Il segno si mette quando cambia un campo e si toglie al salvataggio o quando i dati si ricaricano.
const _modificheNonSalvate = new Set(); // chiavi di SEZIONI_ADMIN
let _confermaUscita = null;
let _novDaRicaricare = false;

function segnaModifiche(sezione) { _modificheNonSalvate.add(sezione); }
function azzeraModifiche(sezione) { _modificheNonSalvate.delete(sezione); }

// "Continua senza salvare": le modifiche si scartano davvero, così tornando nella sezione si vede
// quello che è salvato
function scartaModifiche(sezione) {
    azzeraModifiche(sezione);
    if (sezione === 'versioni') updateModal.classList.add('hidden');
    if (sezione === 'menu') {
        _menuBozza = null;
        const file = document.getElementById('cfg-menu-file');
        if (file) file.value = '';
        document.getElementById('cfg-menu-anteprima')?.classList.add('hidden');
    }
    if (sezione === 'novita') _novDaRicaricare = true;
    if (sezione === 'mappe') { // riaprendo la sezione si riparte dalla bozza salvata (o dalla versione pubblicata)
        _mappeDati = null;
        cancellaCopiaLocaleMappe();
    }
}

// true se si può lasciare (o ricaricare) la sezione aperta. Una sola domanda alla volta.
function confermaUscitaSezione() {
    const sezione = sezioneAperta;
    if (!sezione || !_modificheNonSalvate.has(sezione)) return Promise.resolve(true);
    if (!_confermaUscita) {
        _confermaUscita = customConfirm(`Ci sono modifiche non salvate in "${SEZIONI_ADMIN[sezione].titolo}": se continui andranno perse.`, {
            title: 'Modifiche non salvate',
            confirmText: 'Continua senza salvare',
            cancelText: 'Resta qui',
            icon: '✏️'
        }).then(ok => {
            if (ok) scartaModifiche(sezione);
            return ok;
        }).finally(() => { _confermaUscita = null; });
    }
    return _confermaUscita;
}

// Chiusura o ricarica della pagina: il browser mostra il suo avviso
window.addEventListener('beforeunload', (e) => {
    if (!_modificheNonSalvate.size) return;
    e.preventDefault();
    e.returnValue = '';
});

// Menu a scomparsa su telefono (sotto i 900 px, vedi admin.css)
function apriMenuMobile() {
    document.body.classList.add('admin-menu-aperto');
    if (adminMenuApri) adminMenuApri.setAttribute('aria-expanded', 'true');
}

function chiudiMenuMobile() {
    document.body.classList.remove('admin-menu-aperto');
    if (adminMenuApri) adminMenuApri.setAttribute('aria-expanded', 'false');
}

adminMenuApri?.addEventListener('click', apriMenuMobile);
adminVelo?.addEventListener('click', chiudiMenuMobile);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('admin-menu-aperto')) chiudiMenuMobile();
});

// Numero o pallino accanto a una voce del menu (creato alla prima occorrenza)
function _marcatoreVoce(chiave, classe) {
    const voce = document.querySelector(`.admin-voce[data-sezione="${chiave}"]`);
    if (!voce) return null;
    let marcatore = voce.querySelector('.' + classe);
    if (!marcatore) {
        marcatore = document.createElement('span');
        marcatore.className = `${classe} hidden`;
        voce.appendChild(marcatore);
    }
    return marcatore;
}

// Numero rosso accanto a "Bug e problemi": bug con stato "open" (aggiornato da updateAdminBugKPIs)
function aggiornaBadgeBug(aperti) {
    const badge = _marcatoreVoce('bug', 'admin-voce-badge');
    if (!badge) return;
    badge.textContent = aperti > 99 ? '99+' : String(aperti);
    badge.title = aperti === 1 ? '1 bug aperto' : `${aperti} bug aperti`;
    badge.classList.toggle('hidden', !aperti);
}

// Pallino giallo accanto a una voce: problema segnalato nella Panoramica.
// motivo = testo mostrato passandoci sopra; vuoto o null = nessun problema.
function segnalaVoceMenu(chiave, motivo) {
    const punto = _marcatoreVoce(chiave, 'admin-voce-punto');
    if (!punto) return;
    punto.title = motivo || '';
    punto.setAttribute('aria-label', motivo || '');
    punto.classList.toggle('hidden', !motivo);
}

function showLogin() {
    loginSection.classList.remove('hidden');
    adminDashboard.classList.add('hidden');
    document.body.classList.remove('admin-dentro');
    chiudiMenuMobile();
}

// Login Logic
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            loginError.classList.remove('hidden');
            loginError.textContent = "Errore Accesso: " + error.message;
        } else {
            showDashboard(data.user);
        }
    } catch (err) {
        console.error("Errore Inaspettato:", err);
    }
});

// Logout Logic
logoutBtn.addEventListener('click', async () => {
    if (!(await confermaUscitaSezione())) return;
    await _supabase.auth.signOut();
    showLogin();
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
