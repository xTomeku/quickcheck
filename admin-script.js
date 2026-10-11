/* global supabase */
const _supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// Login & Core DOM
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const userEmailDisplay = document.getElementById('user-email-display');

// Updates DOM
const updatesList = document.getElementById('updates-list');
const addUpdateBtn = document.getElementById('add-update-btn');
const updateModal = document.getElementById('update-modal');
const updateForm = document.getElementById('update-form');
const closeModal = document.getElementById('close-modal');

// Menu laterale (navigazione tra le sezioni)
const adminMenuApri = document.getElementById('admin-menu-apri');
const adminVelo = document.getElementById('admin-velo');
const adminBarraTitolo = document.getElementById('admin-barra-titolo');

// Features DOM
const featuresList = document.getElementById('features-list');
const addFeatureBtn = document.getElementById('add-feature-btn');
const featureModal = document.getElementById('feature-modal');
const featureForm = document.getElementById('feature-form');
const closeFeatureModal = document.getElementById('close-feature-modal');

// Legal DOM
const legalList = document.getElementById('legal-list');
const addLegalBtn = document.getElementById('add-legal-btn');
const legalModal = document.getElementById('legal-modal');
const legalForm = document.getElementById('legal-form');
const closeLegalModal = document.getElementById('close-legal-modal');

// Credits DOM
const creditsList = document.getElementById('credits-list');
const addCreditBtn = document.getElementById('add-credit-btn');
const creditModal = document.getElementById('credit-modal');
const creditForm = document.getElementById('credit-form');
const closeCreditModal = document.getElementById('close-credit-modal');

// Contacts DOM
const contactsList = document.getElementById('contacts-list');
const addContactBtn = document.getElementById('add-contact-btn');
const contactModal = document.getElementById('contact-modal');
const contactForm = document.getElementById('contact-form');
const closeContactModal = document.getElementById('close-contact-modal');



// Analytics DOM
const refreshAnalyticsBtn = document.getElementById('refresh-analytics-btn');
const refreshIcon = document.getElementById('refresh-icon');
const analyticsLastSync = document.getElementById('analytics-last-sync');
const kpiTotalDownloads = document.getElementById('kpi-total-downloads');
const kpiTopVersion = document.getElementById('kpi-top-version');
const kpiTopVersionSub = document.getElementById('kpi-top-version-sub');
const kpiLatestVersion = document.getElementById('kpi-latest-version');
const kpiLatestVersionSub = document.getElementById('kpi-latest-version-sub');
const kpiTotalReleases = document.getElementById('kpi-total-releases');
const analyticsVersionsList = document.getElementById('analytics-versions-list');

// Telemetria Utenti Supabase DOM
const kpiUsersToday = document.getElementById('kpi-users-today');
const kpiSubApk = document.getElementById('kpi-sub-apk');
const kpiSubPwa = document.getElementById('kpi-sub-pwa');
const kpiSubWeb = document.getElementById('kpi-sub-web');
const kpiUsersYesterday = document.getElementById('kpi-users-yesterday');
const kpiUsersYesterdaySub = document.getElementById('kpi-users-yesterday-sub');
const kpiUsersAvg7 = document.getElementById('kpi-users-avg7');
const kpiUsersTotal30 = document.getElementById('kpi-users-total30');
const userStatsHistoryList = document.getElementById('user-stats-history-list');
const kpiUsersRangeLabel = document.getElementById('kpi-users-range-label');
// Variabile di stato per l'intervallo di giorni selezionato (predefinito: 30)
let currentStatsRangeDays = 30;

// FAQ DOM
const faqList = document.getElementById('faq-list');
const addFaqBtn = document.getElementById('add-faq-btn');
const faqModal = document.getElementById('faq-modal');
const faqForm = document.getElementById('faq-form');
const closeFaqModal = document.getElementById('close-faq-modal');

// Bugs DOM
const bugsList = document.getElementById('bugs-list');
const addBugBtn = document.getElementById('add-bug-btn');
const bugModal = document.getElementById('bug-modal');
const bugForm = document.getElementById('bug-form');
const closeBugModal = document.getElementById('close-bug-modal');
const adminBugSearch = document.getElementById('admin-bug-search');
const bugsTableMissingAlert = document.getElementById('bugs-table-missing-alert');
const copyBugsSqlBtn = document.getElementById('copy-bugs-sql-btn');
let adminAllBugs = [];
let adminBugFilter = 'all';
let adminBugSearchQuery = '';
// ===== UTILS: Toast, Confirm, Drag&Drop =====
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span style="font-size: 1.2rem;">${type === 'success' ? '✓' : '⚠'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Modale di conferma personalizzato universale (sostituisce i confirm nativi del browser)
function customConfirm(message, options = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const iconEl = document.getElementById('confirm-icon');
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

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (iconEl) iconEl.textContent = icon;
        
        if (btnYes) {
            btnYes.textContent = confirmText;
            if (isDanger) {
                btnYes.style.border = '1px solid #ff4d4d';
                btnYes.style.background = 'rgba(255, 77, 77, 0.15)';
                btnYes.style.color = '#ff4d4d';
                btnYes.style.fontWeight = '600';
            } else {
                btnYes.style.border = 'none';
                btnYes.style.background = 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)';
                btnYes.style.color = '#111';
                btnYes.style.fontWeight = '700';
            }
        }

        if (btnNo) {
            btnNo.textContent = cancelText;
        }

        modal.classList.remove('hidden');

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

function initSortable(listElement, tableName) {
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
            
            // Get all items in new order
            const items = Array.from(listElement.children);
            const updates = items.map((item, index) => {
                const editBtn = item.querySelector('.actions button[data-id], .actions button[onclick^="edit"]');
                let id;
                if (editBtn.dataset.id) id = editBtn.dataset.id;
                else {
                    // Extract ID from onclick="editFunc(ID)"
                    const match = editBtn.getAttribute('onclick').match(/\d+/);
                    id = match ? match[0] : null;
                }
                return { id: parseInt(id), order_index: index };
            }).filter(item => item.id);

            // Send sequential updates to Supabase
            try {
                for (const item of updates) {
                    const { error } = await _supabase.from(tableName)
                        .update({ order_index: item.order_index })
                        .eq('id', item.id);
                    if (error) throw error;
                }
                showToast('Ordine aggiornato con successo');
            } catch (err) {
                showToast('Errore nel salvataggio dell\'ordine', 'error');
                console.error(err);
            }
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
    notifiche:    { id: 'notifications-section', titolo: 'Push e avvisi',         carica: () => { fetchNotifications(); caricaCorsiUniSalento(); } },
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

// Avanti/indietro del browser e voci del menu (sono link #sezione)
window.addEventListener('hashchange', () => {
    if (!adminDashboard.classList.contains('hidden')) apriSezione(sezioneDaIndirizzo());
});

document.querySelectorAll('.admin-voce').forEach(voce => {
    voce.addEventListener('click', (e) => {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // nuova scheda: lascia fare al browser
        // Voce della sezione già aperta: l'indirizzo non cambia, quindi si ricarica qui
        if (location.hash === voce.getAttribute('href')) {
            e.preventDefault();
            apriSezione(voce.dataset.sezione);
        }
    });
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
            loginError.style.display = 'block';
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
    await _supabase.auth.signOut();
    showLogin();
});

// Fetch Updates
async function fetchUpdates() {
    updatesList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Caricamento...</p>';
    
    let { data, error } = await _supabase
        .from('updates')
        .select('*');

    if (error) {
        updatesList.innerHTML = `<p style="color: red;">Errore: ${error.message}</p>`;
        return;
    }

    // Ordinamento: Prima per Visibilità (Pubblicati -> Bozze), poi per Versione
    data.sort((a, b) => {
        // Se uno è visibile e l'altro no, il visibile vince
        if (a.is_visible !== b.is_visible) {
            return a.is_visible ? -1 : 1;
        }

        const parse = (v) => v.replace(/[^0-9.]/g, '').split('.').map(Number);
        const vA = parse(a.version);
        const vB = parse(b.version);
        for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
            const numA = vA[i] || 0;
            const numB = vB[i] || 0;
            if (numA !== numB) return numB - numA;
        }
        return 0;
    });

    if (data.length === 0) {
        updatesList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessun aggiornamento trovato.</p>';
        return;
    }

    data.forEach(update => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <div class="drag-handle" title="Trascina per riordinare">⋮⋮</div>
                <h3>
                    ${update.version} 
                    ${update.is_latest ? '<span class="badge-latest">ULTIMA</span>' : ''}
                    ${!update.is_visible ? '<span class="badge-draft">BOZZA</span>' : ''}
                </h3>
                <p>${update.date} • ${update.details || 'Nessun dettaglio'}</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm edit-btn" data-id="${update.id}" style="margin-top:0">Modifica</button>
                <button class="btn btn-secondary btn-sm delete-btn" data-id="${update.id}" style="margin-top:0; border-color: #ff4d4d; color: #ff4d4d;">Elimina</button>
            </div>
        `;
        updatesList.appendChild(item);
    });

    // Add Listeners
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id, data));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteUpdate(btn.dataset.id));
    });

    initSortable(updatesList, 'updates');
}

// ===== Patch Notes Editor Helpers =====

/**
 * Crea una riga nell'editor delle patch note dell'admin con selettore di badge (Novità, Miglioramento, Fix).
 */
function createPatchNoteRow(value = '') {
    let rawText = typeof value === 'string' ? value.trim() : '';
    let selectedType = 'feature';

    // Riconosce tag espliciti già salvati (es. [novità], [miglioramento], [fix])
    const tagMatch = rawText.match(/^\[(novit[aà]|feature|miglioramento|improvement|fix)\]\s*/i);
    if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        if (tag === 'fix') selectedType = 'fix';
        else if (tag === 'miglioramento' || tag === 'improvement') selectedType = 'improvement';
        else selectedType = 'feature';
        rawText = rawText.substring(tagMatch[0].length).trim();
    } else if (rawText) {
        // Pre-selezione automatica di comodità se la nota non ha ancora un tag esplicito
        const lower = rawText.toLowerCase();
        const fixKeywords = ['fix', 'risolt', 'corrett', 'bug', 'crash', 'error', 'problem', 'fallit'];
        const improvementKeywords = ['ottimizz', 'migliorament', 'migliorat', 'prestazion', 'velocit', 'performance', 'caching', 'cache', 'alleggerit', 'ridott', 'stabilit', 'versioning', 'affidabilit', 'refactor'];
        if (fixKeywords.some(kw => lower.includes(kw))) {
            selectedType = 'fix';
        } else if (improvementKeywords.some(kw => lower.includes(kw))) {
            selectedType = 'improvement';
        }
    }

    const row = document.createElement('div');
    row.className = 'patch-note-row';
    row.innerHTML = `
        <div class="drag-handle" title="Trascina per riordinare">⋮⋮</div>
        <select class="patch-note-type-select" title="Seleziona il badge per questa modifica">
            <option value="feature">✨ Novità</option>
            <option value="improvement">⚡ Miglioramento</option>
            <option value="fix">🛠️ Fix</option>
        </select>
        <input type="text" class="patch-note-input" value="" placeholder="Titolo: Descrizione modifica...">
        <button type="button" class="btn-remove-note" title="Rimuovi">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    `;

    // Assegna il valore e aggiorna lo stile del selettore
    const select = row.querySelector('.patch-note-type-select');
    select.value = selectedType;
    updateSelectBadgeStyle(select);

    select.addEventListener('change', () => {
        updateSelectBadgeStyle(select);
    });

    // Imposta il valore nel campo input evitando iniezioni HTML
    row.querySelector('.patch-note-input').value = rawText;

    row.querySelector('.btn-remove-note').addEventListener('click', () => {
        row.style.animation = 'patchNoteSlideIn 0.2s ease-out reverse';
        setTimeout(() => row.remove(), 180);
    });
    return row;
}

/**
 * Aggiorna il colore del bordo e del testo della select per riflettere il colore del badge scelto.
 */
function updateSelectBadgeStyle(select) {
    if (select.value === 'fix') {
        select.style.borderColor = 'rgba(245, 158, 11, 0.5)';
        select.style.color = '#FBBF24';
        select.style.background = 'rgba(245, 158, 11, 0.1)';
    } else if (select.value === 'improvement') {
        select.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        select.style.color = '#34D399';
        select.style.background = 'rgba(16, 185, 129, 0.1)';
    } else {
        select.style.borderColor = 'rgba(212, 175, 55, 0.5)';
        select.style.color = '#F5D77F';
        select.style.background = 'rgba(212, 175, 55, 0.1)';
    }
}

function populatePatchNotes(changes = []) {
    const list = document.getElementById('v-changes-list');
    list.innerHTML = '';
    if (changes.length === 0) {
        // Add one empty row by default
        list.appendChild(createPatchNoteRow());
    } else {
        changes.forEach(change => list.appendChild(createPatchNoteRow(change)));
    }
    // Init sortable on the list
    if (window.Sortable) {
        new Sortable(list, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost'
        });
    }
}

/**
 * Estrae i valori delle modifiche includendo il tag della categoria selezionata dall'utente [tag] Testo
 */
function getPatchNotesValues() {
    const rows = document.querySelectorAll('#v-changes-list .patch-note-row');
    const values = [];
    rows.forEach(row => {
        const input = row.querySelector('.patch-note-input');
        const select = row.querySelector('.patch-note-type-select');
        const text = input ? input.value.trim() : '';
        if (text) {
            const type = select ? select.value : 'feature';
            values.push(`[${type}] ${text}`);
        }
    });
    return values;
}

// "Add note" button
document.getElementById('add-patch-note-btn').addEventListener('click', () => {
    const list = document.getElementById('v-changes-list');
    const row = createPatchNoteRow();
    list.appendChild(row);
    row.querySelector('.patch-note-input').focus();
});

// CRUD Operations
addUpdateBtn.addEventListener('click', () => {
    updateForm.reset();
    document.getElementById('update-id').value = '';
    document.getElementById('modal-title').textContent = 'Nuovo Aggiornamento';
    populatePatchNotes([]);
    updateModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
    updateModal.classList.add('hidden');
});

function openEditModal(id, data) {
    const update = data.find(u => u.id === id);
    if (!update) return;

    document.getElementById('update-id').value = update.id;
    document.getElementById('v-version').value = update.version;
    document.getElementById('v-date').value = update.date;
    document.getElementById('v-url').value = update.download_url;
    document.getElementById('v-details').value = update.details || '';
    populatePatchNotes(update.changes || []);
    document.getElementById('v-latest').checked = update.is_latest;
    document.getElementById('v-visible').checked = update.is_visible !== false; // default true if undefined
    
    document.getElementById('modal-title').textContent = 'Modifica Aggiornamento';
    updateModal.classList.remove('hidden');
}

updateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('update-id').value;
    const version = document.getElementById('v-version').value;
    const date = document.getElementById('v-date').value;
    const download_url = document.getElementById('v-url').value;
    const details = document.getElementById('v-details').value;
    const changes = getPatchNotesValues();
    const is_latest = document.getElementById('v-latest').checked;
    const is_visible = document.getElementById('v-visible').checked;

    const payload = { version, date, download_url, details, changes, is_latest, is_visible };

    // If this is latest, unset others (simplified logic)
    if (is_latest) {
        await _supabase.from('updates').update({ is_latest: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    }

    let result;
    if (id) {
        result = await _supabase.from('updates').update(payload).eq('id', id);
    } else {
        result = await _supabase.from('updates').insert([payload]);
    }

    if (result.error) {
        showToast('Errore nel salvataggio: ' + result.error.message, 'error');
    } else {
        updateModal.classList.add('hidden');
        fetchUpdates();
        aggiornaStatoPanoramica();
        showToast('Aggiornamento salvato!');
    }
});

async function deleteUpdate(id) {
    if (!(await customConfirm('Sei sicuro di voler eliminare questo aggiornamento?'))) return;
    
    const { error } = await _supabase.from('updates').delete().eq('id', id);
    if (error) {
        showToast('Errore nell\'eliminazione: ' + error.message, 'error');
    } else {
        fetchUpdates();
        aggiornaStatoPanoramica();
    }
}

// Credits Logic
async function fetchCredits() {
    creditsList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Caricamento credits...</p>';
    
    const { data, error } = await _supabase
        .from('credits')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        creditsList.innerHTML = `<p style="color: #ff4d4d;">Errore: ${error.message}</p>`;
        return;
    }

    // Ordinamento: Visibili prima, poi per ordine
    data.sort((a, b) => {
        if (a.is_visible !== b.is_visible) return a.is_visible ? -1 : 1;
        return (a.order_index || 0) - (b.order_index || 0);
    });

    creditsList.innerHTML = '';
    if (data.length === 0) {
        creditsList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessuna scheda creata.</p>';
    }

    data.forEach(credit => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <div class="drag-handle" title="Trascina per riordinare">⋮⋮</div>
                <h3>
                    ${credit.title} 
                    <span style="font-size: 0.8rem; color: var(--primary-gold); margin-left: 10px;">${credit.category}</span>
                    ${credit.url ? `<a href="${credit.url}" target="_blank" style="color: var(--primary-gold); font-size: 0.8rem; margin-left: 8px; text-decoration: none;" title="${credit.url}">🔗 Link</a>` : ''}
                    ${!credit.is_visible ? '<span class="badge-draft">BOZZA</span>' : ''}
                </h3>
                <p>${credit.description.substring(0, 100)}${credit.description.length > 100 ? '...' : ''}</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm edit-credit-btn" data-id="${credit.id}" style="margin-top:0">Modifica</button>
                <button class="btn btn-secondary btn-sm delete-credit-btn" data-id="${credit.id}" style="margin-top:0; border-color: #ff4d4d; color: #ff4d4d;">Elimina</button>
            </div>
        `;
        creditsList.appendChild(item);
    });

    document.querySelectorAll('.edit-credit-btn').forEach(btn => {
        btn.addEventListener('click', () => openCreditEditModal(btn.dataset.id, data));
    });

    document.querySelectorAll('.delete-credit-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteCredit(btn.dataset.id));
    });

    initSortable(creditsList, 'credits');
}

function openCreditEditModal(id, data) {
    const credit = data.find(c => c.id === id);
    if (!credit) return;

    document.getElementById('credit-id').value = credit.id;
    document.getElementById('c-category').value = credit.category;
    document.getElementById('c-title').value = credit.title;
    document.getElementById('c-description').value = credit.description;
    document.getElementById('c-url').value = credit.url || '';
    document.getElementById('c-order').value = credit.order_index;
    document.getElementById('c-visible').checked = credit.is_visible !== false;
    
    document.getElementById('credit-modal-title').textContent = 'Modifica Scheda';
    creditModal.classList.remove('hidden');
}

addCreditBtn.addEventListener('click', () => {
    creditForm.reset();
    document.getElementById('credit-id').value = '';
    document.getElementById('c-url').value = '';
    document.getElementById('credit-modal-title').textContent = 'Nuova Scheda Credit';
    creditModal.classList.remove('hidden');
});

closeCreditModal.addEventListener('click', () => creditModal.classList.add('hidden'));

creditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('credit-id').value;
    const category = document.getElementById('c-category').value;
    const title = document.getElementById('c-title').value;
    const description = document.getElementById('c-description').value;
    const url = document.getElementById('c-url').value.trim() || null;
    const order_index = parseInt(document.getElementById('c-order').value) || 0;
    const is_visible = document.getElementById('c-visible').checked;

    const payload = { category, title, description, order_index, is_visible, url };

    let result;
    if (id) {
        result = await _supabase.from('credits').update(payload).eq('id', id);
    } else {
        result = await _supabase.from('credits').insert([payload]);
    }

    if (result.error) {
        if (result.error.message && result.error.message.includes('url')) {
            showToast('Errore: La colonna "url" non esiste ancora nella tabella "credits" su Supabase. Creala prima di salvare il link!', 'error');
        } else {
            showToast('Errore: ' + result.error.message, 'error');
        }
    } else {
        creditModal.classList.add('hidden');
        fetchCredits();
        showToast('Credito salvato!');
    }
});

async function deleteCredit(id) {
    if (!(await customConfirm('Eliminare questa scheda?'))) return;
    const { error } = await _supabase.from('credits').delete().eq('id', id);
    if (error) showToast(error.message, 'error');
    else fetchCredits();
}

// Contacts Logic
async function fetchContacts() {
    contactsList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Caricamento contatti...</p>';
    
    const { data, error } = await _supabase
        .from('contacts')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        contactsList.innerHTML = `<p style="color: #ff4d4d;">Errore: ${error.message}</p>`;
        return;
    }

    // Ordinamento: Visibili prima
    data.sort((a, b) => {
        if (a.is_visible !== b.is_visible) return a.is_visible ? -1 : 1;
        return (a.order_index || 0) - (b.order_index || 0);
    });

    contactsList.innerHTML = '';
    if (data.length === 0) {
        contactsList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessun contatto creato.</p>';
    }

    data.forEach(contact => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <div class="drag-handle" title="Trascina per riordinare">⋮⋮</div>
                <h3>${contact.icon} ${contact.label} ${!contact.is_visible ? '<span class="badge-draft">BOZZA</span>' : ''}</h3>
                <p>${contact.value}</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm edit-contact-btn" data-id="${contact.id}" style="margin-top:0">Modifica</button>
                <button class="btn btn-secondary btn-sm delete-contact-btn" data-id="${contact.id}" style="margin-top:0; border-color: #ff4d4d; color: #ff4d4d;">Elimina</button>
            </div>
        `;
        contactsList.appendChild(item);
    });

    document.querySelectorAll('.edit-contact-btn').forEach(btn => {
        btn.addEventListener('click', () => openContactEditModal(btn.dataset.id, data));
    });

    document.querySelectorAll('.delete-contact-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteContact(btn.dataset.id));
    });

    initSortable(contactsList, 'contacts');
}

function openContactEditModal(id, data) {
    const contact = data.find(c => c.id === id);
    if (!contact) return;

    document.getElementById('contact-id').value = contact.id;
    document.getElementById('co-icon').value = contact.icon;
    document.getElementById('co-label').value = contact.label;
    document.getElementById('co-value').value = contact.value;
    document.getElementById('co-url').value = contact.url;
    document.getElementById('co-order').value = contact.order_index;
    document.getElementById('co-visible').checked = contact.is_visible !== false;
    
    document.getElementById('contact-modal-title').textContent = 'Modifica Contatto';
    contactModal.classList.remove('hidden');
}

addContactBtn.addEventListener('click', () => {
    contactForm.reset();
    document.getElementById('contact-id').value = '';
    document.getElementById('contact-modal-title').textContent = 'Nuovo Contatto';
    contactModal.classList.remove('hidden');
});

closeContactModal.addEventListener('click', () => contactModal.classList.add('hidden'));

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('contact-id').value;
    const icon = document.getElementById('co-icon').value;
    const label = document.getElementById('co-label').value;
    const value = document.getElementById('co-value').value;
    const url = document.getElementById('co-url').value;
    const order_index = parseInt(document.getElementById('co-order').value) || 0;
    const is_visible = document.getElementById('co-visible').checked;

    const payload = { icon, label, value, url, order_index, is_visible };

    let result;
    if (id) {
        result = await _supabase.from('contacts').update(payload).eq('id', id);
    } else {
        result = await _supabase.from('contacts').insert([payload]);
    }

    if (result.error) {
        showToast('Errore: ' + result.error.message, 'error');
    } else {
        contactModal.classList.add('hidden');
        fetchContacts();
        showToast('Contatto salvato!');
    }
});

async function deleteContact(id) {
    if (!(await customConfirm('Eliminare questo contatto?'))) return;
    const { error } = await _supabase.from('contacts').delete().eq('id', id);
    if (error) showToast(error.message, 'error');
    else fetchContacts();
}

// Legal Logic
async function fetchLegal() {
    legalList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Caricamento note legali...</p>';
    
    const { data, error } = await _supabase
        .from('legal')
        .select('*')
        .order('category', { ascending: false })
        .order('order_index', { ascending: true });

    if (error) {
        legalList.innerHTML = `<p style="color: #ff4d4d;">Errore: ${error.message}</p>`;
        return;
    }

    // Ordinamento: Visibili prima
    data.sort((a, b) => {
        if (a.is_visible !== b.is_visible) return a.is_visible ? -1 : 1;
        // Se entrambi hanno stessa visibilità, ordina per categoria e poi indice
        if (a.category !== b.category) return a.category > b.category ? -1 : 1;
        return (a.order_index || 0) - (b.order_index || 0);
    });

    legalList.innerHTML = '';
    if (data.length === 0) {
        legalList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessuna nota legale creata.</p>';
    }

    data.forEach(note => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <div class="drag-handle" title="Trascina per riordinare">⋮⋮</div>
                <h3>${note.title} <span style="font-size: 0.8rem; color: var(--primary-gold); margin-left: 10px;">${note.category}</span> ${!note.is_visible ? '<span class="badge-draft">BOZZA</span>' : ''}</h3>
                <p>${note.description.substring(0, 100)}${note.description.length > 100 ? '...' : ''}</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm edit-legal-btn" data-id="${note.id}" style="margin-top:0">Modifica</button>
                <button class="btn btn-secondary btn-sm delete-legal-btn" data-id="${note.id}" style="margin-top:0; border-color: #ff4d4d; color: #ff4d4d;">Elimina</button>
            </div>
        `;
        legalList.appendChild(item);
    });

    document.querySelectorAll('.edit-legal-btn').forEach(btn => {
        btn.addEventListener('click', () => openLegalEditModal(btn.dataset.id, data));
    });

    document.querySelectorAll('.delete-legal-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteLegal(btn.dataset.id));
    });

    initSortable(legalList, 'legal');
}

function openLegalEditModal(id, data) {
    const note = data.find(l => l.id === id);
    if (!note) return;

    document.getElementById('legal-id').value = note.id;
    document.getElementById('l-category').value = note.category;
    document.getElementById('l-title').value = note.title;
    document.getElementById('l-description').value = note.description;
    document.getElementById('l-order').value = note.order_index;
    document.getElementById('l-visible').checked = note.is_visible !== false;
    
    document.getElementById('legal-modal-title').textContent = 'Modifica Nota Legale';
    legalModal.classList.remove('hidden');
}

addLegalBtn.addEventListener('click', () => {
    legalForm.reset();
    document.getElementById('legal-id').value = '';
    document.getElementById('legal-modal-title').textContent = 'Nuova Nota Legale';
    legalModal.classList.remove('hidden');
});

closeLegalModal.addEventListener('click', () => legalModal.classList.add('hidden'));

legalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('legal-id').value;
    const category = document.getElementById('l-category').value;
    const title = document.getElementById('l-title').value;
    const description = document.getElementById('l-description').value;
    const order_index = parseInt(document.getElementById('l-order').value) || 0;
    const is_visible = document.getElementById('l-visible').checked;

    const payload = { category, title, description, order_index, is_visible };

    let result;
    if (id) {
        result = await _supabase.from('legal').update(payload).eq('id', id);
    } else {
        result = await _supabase.from('legal').insert([payload]);
    }

    if (result.error) {
        showToast('Errore: ' + result.error.message, 'error');
    } else {
        legalModal.classList.add('hidden');
        fetchLegal();
        showToast('Nota legale salvata!');
    }
});

async function deleteLegal(id) {
    if (!(await customConfirm('Eliminare questa nota legale?'))) return;
    const { error } = await _supabase.from('legal').delete().eq('id', id);
    if (error) showToast(error.message, 'error');
    else fetchLegal();
}


// Features Logic
async function fetchFeatures() {
    featuresList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Caricamento funzionalità...</p>';
    
    const { data, error } = await _supabase
        .from('features')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        featuresList.innerHTML = `<p style="color: #ff4d4d;">Errore: ${error.message}</p>`;
        return;
    }

    // Ordinamento: Visibili prima
    data.sort((a, b) => {
        if (a.is_visible !== b.is_visible) return a.is_visible ? -1 : 1;
        return (a.order_index || 0) - (b.order_index || 0);
    });

    featuresList.innerHTML = '';
    if (data.length === 0) {
        featuresList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessuna funzionalità creata.</p>';
    }

    data.forEach(feature => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <div class="drag-handle" title="Trascina per riordinare">⋮⋮</div>
                <h3>${feature.icon} ${feature.title} ${!feature.is_visible ? '<span class="badge-draft">BOZZA</span>' : ''}</h3>
                <p>${feature.description}</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm edit-feature-btn" data-id="${feature.id}" style="margin-top:0">Modifica</button>
                <button class="btn btn-secondary btn-sm delete-feature-btn" data-id="${feature.id}" style="margin-top:0; border-color: #ff4d4d; color: #ff4d4d;">Elimina</button>
            </div>
        `;
        featuresList.appendChild(item);
    });

    document.querySelectorAll('.edit-feature-btn').forEach(btn => {
        btn.addEventListener('click', () => openFeatureEditModal(btn.dataset.id, data));
    });

    document.querySelectorAll('.delete-feature-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteFeature(btn.dataset.id));
    });

    initSortable(featuresList, 'features');
}

function openFeatureEditModal(id, data) {
    const feature = data.find(f => f.id === id);
    if (!feature) return;

    document.getElementById('feature-id').value = feature.id;
    document.getElementById('f-icon').value = feature.icon;
    document.getElementById('f-title').value = feature.title;
    document.getElementById('f-description').value = feature.description;
    document.getElementById('f-order').value = feature.order_index;
    document.getElementById('f-visible').checked = feature.is_visible !== false;
    
    document.getElementById('feature-modal-title').textContent = 'Modifica Funzionalità';
    featureModal.classList.remove('hidden');
}

addFeatureBtn.addEventListener('click', () => {
    featureForm.reset();
    document.getElementById('feature-id').value = '';
    document.getElementById('feature-modal-title').textContent = 'Nuova Funzionalità';
    featureModal.classList.remove('hidden');
});

closeFeatureModal.addEventListener('click', () => featureModal.classList.add('hidden'));

featureForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('feature-id').value;
    const icon = document.getElementById('f-icon').value;
    const title = document.getElementById('f-title').value;
    const description = document.getElementById('f-description').value;
    const order_index = parseInt(document.getElementById('f-order').value) || 0;
    const is_visible = document.getElementById('f-visible').checked;

    const payload = { icon, title, description, order_index, is_visible };

    let result;
    if (id) {
        result = await _supabase.from('features').update(payload).eq('id', id);
    } else {
        result = await _supabase.from('features').insert([payload]);
    }

    if (result.error) {
        showToast('Errore: ' + result.error.message, 'error');
    } else {
        featureModal.classList.add('hidden');
        fetchFeatures();
        showToast('Funzionalità salvata!');
    }
});

async function deleteFeature(id) {
    if (!(await customConfirm('Eliminare questa funzionalità?'))) return;
    const { error } = await _supabase.from('features').delete().eq('id', id);
    if (error) showToast(error.message, 'error');
    else fetchFeatures();
}

// ===== FAQ CRUD =====
async function fetchFAQ() {
    const { data, error } = await _supabase.from('faq').select('*').order('order_index', { ascending: true });
    if (error) { faqList.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`; return; }
    if (!data || data.length === 0) { faqList.innerHTML = '<p style="color:var(--text-muted);">Nessuna FAQ presente.</p>'; return; }

    faqList.innerHTML = '';
    data.forEach(item => {
        const el = document.createElement('div');
        el.className = 'update-item';
        el.innerHTML = `
            <div class="update-item-info">
                <div class="drag-handle" title="Trascina per riordinare">⋮⋮</div>
                <h3>${item.question} ${!item.is_visible ? '<span class="badge-draft">BOZZA</span>' : ''}</h3>
                <p>${item.answer.substring(0, 80)}${item.answer.length > 80 ? '...' : ''}</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm" onclick="editFaq(${item.id})">Modifica</button>
                <button class="btn btn-secondary btn-sm" onclick="deleteFaq(${item.id})" style="color:#ff4d4d;">Elimina</button>
            </div>
        `;
        faqList.appendChild(el);
    });

    initSortable(faqList, 'faq');
}

addFaqBtn.addEventListener('click', () => {
    document.getElementById('faq-modal-title').textContent = 'Nuova FAQ';
    faqForm.reset();
    document.getElementById('faq-id').value = '';
    document.getElementById('fq-visible').checked = true;
    faqModal.classList.remove('hidden');
});

closeFaqModal.addEventListener('click', () => faqModal.classList.add('hidden'));

async function editFaq(id) {
    const { data, error } = await _supabase.from('faq').select('*').eq('id', id).single();
    if (error || !data) { showToast('Errore nel caricamento', 'error'); return; }

    document.getElementById('faq-modal-title').textContent = 'Modifica FAQ';
    document.getElementById('faq-id').value = data.id;
    document.getElementById('fq-question').value = data.question;
    document.getElementById('fq-answer').value = data.answer;
    document.getElementById('fq-order').value = data.order_index;
    document.getElementById('fq-visible').checked = data.is_visible;
    faqModal.classList.remove('hidden');
}

faqForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('faq-id').value;
    const payload = {
        question: document.getElementById('fq-question').value,
        answer: document.getElementById('fq-answer').value,
        order_index: parseInt(document.getElementById('fq-order').value) || 0,
        is_visible: document.getElementById('fq-visible').checked,
    };

    let error;
    if (id) {
        ({ error } = await _supabase.from('faq').update(payload).eq('id', id));
    } else {
        ({ error } = await _supabase.from('faq').insert([payload]));
    }

    if (error) {
        showToast('Errore: ' + error.message, 'error');
    } else {
        faqModal.classList.add('hidden');
        fetchFAQ();
        showToast('FAQ salvata!');
    }
});

async function deleteFaq(id) {
    if (!(await customConfirm('Eliminare questa FAQ?'))) return;
    const { error } = await _supabase.from('faq').delete().eq('id', id);
    if (error) showToast(error.message, 'error');
    else fetchFAQ();
}

// ===== BUGS CRUD =====
async function fetchBugs() {
    if (!bugsList) return;

    try {
        const { data, error } = await _supabase
            .from('bugs')
            .select('*')
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Errore fetchBugs:', error);
            if (error.code === 'PGRST205' || (error.message && error.message.includes('not find the table'))) {
                if (bugsTableMissingAlert) bugsTableMissingAlert.classList.remove('hidden');
                bugsList.innerHTML = `
                    <div style="text-align: center; padding: 2.5rem; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1);">
                        <p style="font-size: 1.1rem; color: #facc15; margin-bottom: 0.5rem;">⚠️ Tabella 'bugs' non trovata in Supabase</p>
                        <p style="font-size: 0.85rem;">Clicca sul pulsante in alto per copiare la query SQL ed eseguirla in Supabase per attivarla in 1 minuto.</p>
                    </div>
                `;
            } else {
                bugsList.innerHTML = `<p style="color:#ff6b6b; padding:1.5rem;">Errore: ${error.message}</p>`;
            }
            return;
        }

        if (bugsTableMissingAlert) bugsTableMissingAlert.classList.add('hidden');
        adminAllBugs = data || [];
        updateAdminBugKPIs();
        renderAdminBugs();
        initSortable(bugsList, 'bugs');
    } catch (err) {
        console.error('Eccezione in fetchBugs:', err);
        bugsList.innerHTML = `<p style="color:#ff6b6b; padding:1.5rem;">Eccezione: ${err.message}</p>`;
    }
}

function updateAdminBugKPIs() {
    const openCount = adminAllBugs.filter(b => b.status === 'open').length;
    const progressCount = adminAllBugs.filter(b => b.status === 'in_progress').length;
    const resolvedCount = adminAllBugs.filter(b => b.status === 'resolved').length;
    const visibleCount = adminAllBugs.filter(b => b.is_visible).length;

    const elOpen = document.getElementById('kpi-bugs-open');
    const elProg = document.getElementById('kpi-bugs-progress');
    const elRes = document.getElementById('kpi-bugs-resolved');
    const elTot = document.getElementById('kpi-bugs-total');
    const elVis = document.getElementById('kpi-bugs-visible-count');

    if (elOpen) elOpen.textContent = openCount;
    if (elProg) elProg.textContent = progressCount;
    if (elRes) elRes.textContent = resolvedCount;
    if (elTot) elTot.textContent = adminAllBugs.length;
    if (elVis) elVis.textContent = `${visibleCount} visibili pubblicamente`;

    const countAll = document.getElementById('admin-count-all');
    const countOpen = document.getElementById('admin-count-open');
    const countProg = document.getElementById('admin-count-progress');
    const countRes = document.getElementById('admin-count-resolved');

    if (countAll) countAll.textContent = adminAllBugs.length;
    if (countOpen) countOpen.textContent = openCount;
    if (countProg) countProg.textContent = progressCount;
    if (countRes) countRes.textContent = resolvedCount;

    aggiornaBadgeBug(openCount);
}

function renderAdminBugs() {
    if (!bugsList) return;

    let filtered = adminAllBugs;

    if (adminBugFilter !== 'all') {
        filtered = filtered.filter(b => b.status === adminBugFilter);
    }

    if (adminBugSearchQuery.trim() !== '') {
        const q = adminBugSearchQuery.toLowerCase().trim();
        filtered = filtered.filter(b =>
            (b.title && b.title.toLowerCase().includes(q)) ||
            (b.description && b.description.toLowerCase().includes(q)) ||
            (b.category && b.category.toLowerCase().includes(q)) ||
            (b.affected_version && b.affected_version.toLowerCase().includes(q)) ||
            (b.fixed_version && b.fixed_version.toLowerCase().includes(q))
        );
    }

    if (filtered.length === 0) {
        bugsList.innerHTML = `
            <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.08);">
                <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">${adminAllBugs.length === 0 ? '✨' : '🔍'}</p>
                <p style="font-size: 0.95rem;">${adminAllBugs.length === 0 ? 'Nessun bug registrato. Clicca "+ Nuovo Bug" per aggiungere il primo!' : 'Nessun bug trovato con i filtri correnti.'}</p>
            </div>
        `;
        return;
    }

    const statusLabels = {
        'open': { label: 'Noto / Aperto', cls: 'status-open' },
        'in_progress': { label: 'In Risoluzione', cls: 'status-in_progress' },
        'resolved': { label: 'Risolto', cls: 'status-resolved' }
    };

    const severityLabels = {
        'critical': { label: 'Critica', cls: 'severity-critical' },
        'high': { label: 'Alta', cls: 'severity-high' },
        'medium': { label: 'Media', cls: 'severity-medium' },
        'low': { label: 'Bassa', cls: 'severity-low' }
    };

    bugsList.innerHTML = '';
    filtered.forEach(item => {
        const st = statusLabels[item.status] || { label: item.status, cls: 'status-open' };
        const sv = severityLabels[item.severity] || { label: item.severity || 'Media', cls: 'severity-medium' };

        const el = document.createElement('div');
        el.className = 'update-item';
        el.dataset.id = item.id;
        el.innerHTML = `
            <div class="update-item-info">
                <div class="drag-handle" title="Trascina per riordinare">⋮⋮</div>
                <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
                    <span class="bug-badge ${st.cls}">
                        <span class="status-dot"></span>
                        ${st.label}
                    </span>
                    <span class="bug-badge ${sv.cls}">
                        ${sv.label}
                    </span>
                    ${item.category ? `<span class="bug-badge category-pill">${item.category}</span>` : ''}
                    ${item.affected_version ? `<span style="font-size: 0.75rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 2px 7px; border-radius: 6px;">Ver: ${item.affected_version}</span>` : ''}
                    ${item.fixed_version ? `<span class="bug-fixed-badge" style="font-size: 0.72rem; padding: 2px 7px;">✓ Fix: ${item.fixed_version}</span>` : ''}
                    ${!item.is_visible ? '<span class="badge-draft">BOZZA / NASCOSTO</span>' : ''}
                </div>
                <h3 style="margin-bottom: 4px; font-size: 1.05rem;">${item.title}</h3>
                <p style="margin-bottom: 6px; font-size: 0.88rem; color: var(--text-muted);">${item.description.substring(0, 110)}${item.description.length > 110 ? '...' : ''}</p>
                ${item.workaround ? `<p style="font-size: 0.8rem; color: #f3e5ab; margin: 0;">💡 <em>Workaround: ${item.workaround.substring(0, 90)}${item.workaround.length > 90 ? '...' : ''}</em></p>` : ''}
            </div>
            <div class="actions" style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end; justify-content: center;">
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm" onclick="editBug(${item.id})" data-id="${item.id}">Modifica</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteBug(${item.id})" style="color: #ff4d4d;">Elimina</button>
                </div>
                <div style="display: flex; gap: 4px; align-items: center;">
                    <span style="font-size: 0.7rem; color: var(--text-muted); margin-right: 2px;">Stato:</span>
                    <button class="btn btn-secondary btn-sm" style="font-size: 0.7rem; padding: 2px 6px; ${item.status === 'open' ? 'border-color: #ff6b6b; background: rgba(255,107,107,0.15);' : 'opacity: 0.6;'}" title="Imposta come Noto / Aperto" onclick="quickSetBugStatus(${item.id}, 'open')">🔴</button>
                    <button class="btn btn-secondary btn-sm" style="font-size: 0.7rem; padding: 2px 6px; ${item.status === 'in_progress' ? 'border-color: #fbbf24; background: rgba(251,191,36,0.15);' : 'opacity: 0.6;'}" title="Imposta come In Lavorazione" onclick="quickSetBugStatus(${item.id}, 'in_progress')">🟡</button>
                    <button class="btn btn-secondary btn-sm" style="font-size: 0.7rem; padding: 2px 6px; ${item.status === 'resolved' ? 'border-color: #4ade80; background: rgba(74,222,128,0.15);' : 'opacity: 0.6;'}" title="Imposta come Risolto" onclick="quickSetBugStatus(${item.id}, 'resolved')">🟢</button>
                </div>
            </div>
        `;
        bugsList.appendChild(el);
    });
}

// Bug Admin Filters & Search
document.querySelectorAll('.admin-bug-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-bug-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        adminBugFilter = btn.dataset.filter;
        renderAdminBugs();
    });
});

if (adminBugSearch) {
    adminBugSearch.addEventListener('input', (e) => {
        adminBugSearchQuery = e.target.value;
        renderAdminBugs();
    });
}

if (copyBugsSqlBtn) {
    copyBugsSqlBtn.addEventListener('click', () => {
        const sql = `-- QuickCheck Supabase SQL per Bugs:
CREATE TABLE IF NOT EXISTS public.bugs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    severity TEXT NOT NULL DEFAULT 'medium',
    category TEXT DEFAULT 'App Android',
    affected_version TEXT,
    fixed_version TEXT,
    workaround TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lettura bug visibili per tutti" ON public.bugs FOR SELECT USING (is_visible = true OR auth.role() = 'authenticated');
CREATE POLICY "Gestione bug per utenti autenticati" ON public.bugs FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT ON public.bugs TO anon, authenticated;
GRANT ALL ON public.bugs TO authenticated;`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(sql).then(() => {
                showToast('Script SQL copiato negli appunti!');
            }).catch(() => {
                prompt('Copia manualmente lo script SQL:', sql);
            });
        } else {
            prompt('Copia manualmente lo script SQL:', sql);
        }
    });
}

// Modal Form handling
if (addBugBtn) {
    addBugBtn.addEventListener('click', () => {
        document.getElementById('bug-modal-title').textContent = 'Nuovo Bug';
        bugForm.reset();
        document.getElementById('bug-id').value = '';
        document.getElementById('b-status').value = 'open';
        document.getElementById('b-severity').value = 'medium';
        document.getElementById('b-category').value = 'App Android';
        document.getElementById('b-order').value = '0';
        document.getElementById('b-visible').checked = true;
        bugModal.classList.remove('hidden');
    });
}

if (closeBugModal) {
    closeBugModal.addEventListener('click', () => bugModal.classList.add('hidden'));
}

async function editBug(id) {
    const item = adminAllBugs.find(b => b.id == id);
    if (!item) {
        showToast('Bug non trovato in locale', 'error');
        return;
    }

    document.getElementById('bug-modal-title').textContent = 'Modifica Bug';
    document.getElementById('bug-id').value = item.id;
    document.getElementById('b-title').value = item.title || '';
    document.getElementById('b-status').value = item.status || 'open';
    document.getElementById('b-severity').value = item.severity || 'medium';
    document.getElementById('b-category').value = item.category || 'App Android';
    document.getElementById('b-affected-version').value = item.affected_version || '';
    document.getElementById('b-fixed-version').value = item.fixed_version || '';
    document.getElementById('b-description').value = item.description || '';
    document.getElementById('b-workaround').value = item.workaround || '';
    document.getElementById('b-order').value = item.order_index ?? 0;
    document.getElementById('b-visible').checked = item.is_visible !== false;

    bugModal.classList.remove('hidden');
}

if (bugForm) {
    bugForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('bug-id').value;
        const statusVal = document.getElementById('b-status').value;
        
        const payload = {
            title: document.getElementById('b-title').value.trim(),
            status: statusVal,
            severity: document.getElementById('b-severity').value,
            category: document.getElementById('b-category').value.trim() || 'App Android',
            affected_version: document.getElementById('b-affected-version').value.trim() || null,
            fixed_version: document.getElementById('b-fixed-version').value.trim() || null,
            description: document.getElementById('b-description').value.trim(),
            workaround: document.getElementById('b-workaround').value.trim() || null,
            order_index: parseInt(document.getElementById('b-order').value) || 0,
            is_visible: document.getElementById('b-visible').checked,
            resolved_at: statusVal === 'resolved' ? new Date().toISOString() : null
        };

        let error;
        if (id) {
            ({ error } = await _supabase.from('bugs').update(payload).eq('id', id));
        } else {
            ({ error } = await _supabase.from('bugs').insert([payload]));
        }

        if (error) {
            showToast('Errore salvataggio: ' + error.message, 'error');
        } else {
            bugModal.classList.add('hidden');
            fetchBugs();
            showToast(id ? 'Bug aggiornato!' : 'Bug salvato con successo!');
        }
    });
}

async function deleteBug(id) {
    if (!(await customConfirm('Sei sicuro di voler eliminare questa segnalazione bug?'))) return;
    const { error } = await _supabase.from('bugs').delete().eq('id', id);
    if (error) {
        showToast('Errore eliminazione: ' + error.message, 'error');
    } else {
        showToast('Bug eliminato!');
        fetchBugs();
    }
}

async function quickSetBugStatus(id, newStatus) {
    const payload = {
        status: newStatus,
        resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null
    };
    const { error } = await _supabase.from('bugs').update(payload).eq('id', id);
    if (error) {
        showToast('Errore cambio stato: ' + error.message, 'error');
    } else {
        showToast(`Stato aggiornato a ${newStatus === 'resolved' ? 'Risolto' : newStatus === 'in_progress' ? 'In Lavorazione' : 'Aperto'}!`);
        fetchBugs();
    }
}

window.editBug = editBug;
window.deleteBug = deleteBug;
window.quickSetBugStatus = quickSetBugStatus;

// ===== Analytics / Statistiche Download =====
async function fetchDownloadStats(isManualRefresh = false) {
    if (!analyticsVersionsList) return;

    if (refreshIcon) refreshIcon.classList.add('spinning');
    if (refreshAnalyticsBtn) refreshAnalyticsBtn.disabled = true;

    const cacheKey = 'qc_cache_admin_stats';
    const cached = localStorage.getItem(cacheKey);

    const renderStats = (releases) => {
        let totalDownloads = 0;
        let releaseStats = [];

        releases.forEach(rel => {
            let relDownloads = 0;
            let apkAssets = [];

            (rel.assets || []).forEach(asset => {
                const count = asset.download_count || 0;
                relDownloads += count;
                totalDownloads += count;
                apkAssets.push({
                    name: asset.name,
                    size: asset.size ? (asset.size / (1024 * 1024)).toFixed(1) + ' MB' : null,
                    downloads: count,
                    url: asset.browser_download_url
                });
            });

            releaseStats.push({
                tag: rel.tag_name,
                name: rel.name || rel.tag_name,
                downloads: relDownloads,
                published_at: rel.published_at || rel.created_at,
                html_url: rel.html_url,
                assets: apkAssets,
                is_draft: rel.draft,
                is_prerelease: rel.prerelease
            });
        });

        // Top Version (max downloads)
        let topRel = releaseStats.length > 0
            ? releaseStats.reduce((max, cur) => cur.downloads > max.downloads ? cur : max, releaseStats[0])
            : null;

        // Latest Version (first in list)
        let latestRel = releaseStats.length > 0 ? releaseStats[0] : null;

        // Update KPIs
        if (kpiTotalDownloads) {
            animateValue(kpiTotalDownloads, totalDownloads);
        }
        if (kpiTotalReleases) {
            kpiTotalReleases.textContent = releaseStats.length.toString();
        }
        if (kpiTopVersion && topRel) {
            kpiTopVersion.textContent = topRel.tag;
            const pct = totalDownloads > 0 ? Math.round((topRel.downloads / totalDownloads) * 100) : 0;
            if (kpiTopVersionSub) {
                kpiTopVersionSub.textContent = `${topRel.downloads.toLocaleString('it-IT')} download (${pct}% del tot)`;
            }
        }
        if (kpiLatestVersion && latestRel) {
            kpiLatestVersion.textContent = latestRel.tag;
            if (kpiLatestVersionSub) {
                kpiLatestVersionSub.textContent = `${latestRel.downloads.toLocaleString('it-IT')} download`;
            }
        }

        // Render Breakdown List
        if (releaseStats.length === 0) {
            analyticsVersionsList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem 0;">Nessuna release trovata su GitHub.</p>';
            return;
        }

        analyticsVersionsList.innerHTML = '';
        releaseStats.forEach((rel, idx) => {
            const isTop = topRel && rel.tag === topRel.tag && rel.downloads > 0;
            const isLatest = idx === 0;
            const pct = totalDownloads > 0 ? ((rel.downloads / totalDownloads) * 100).toFixed(1) : '0.0';
            
            const dateStr = rel.published_at 
                ? new Date(rel.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Data sconosciuta';

            const assetInfo = rel.assets.map(a => `${a.name}${a.size ? ` (${a.size})` : ''}`).join(', ') || 'Nessun file APK allegato';

            const card = document.createElement('div');
            card.className = 'version-stat-item';
            card.innerHTML = `
                <div class="version-stat-header">
                    <div class="version-stat-title">
                        <span>${rel.tag}</span>
                        ${isLatest ? '<span class="badge-latest">ULTIMA</span>' : ''}
                        ${isTop ? '<span style="background: rgba(212,175,55,0.2); color: var(--primary-gold); border: 1px solid rgba(212,175,55,0.4); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">★ PIÙ SCARICATA</span>' : ''}
                        ${rel.name && rel.name !== rel.tag ? `<span style="font-size: 0.85rem; font-weight: 400; color: var(--text-muted);">— ${rel.name}</span>` : ''}
                    </div>
                    <div class="version-stat-count">
                        <span class="version-stat-number">${rel.downloads.toLocaleString('it-IT')}</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">download (${pct}%)</span>
                    </div>
                </div>

                <div class="version-stat-meta">
                    <span>📦 ${assetInfo} • 📅 ${dateStr}</span>
                    <a href="${rel.html_url}" target="_blank" rel="noopener noreferrer" class="badge-gh" title="Visualizza release su GitHub">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                        GitHub
                    </a>
                </div>

                <div class="version-progress-container">
                    <div class="version-progress-bar" style="width: 0%;" data-target-width="${pct}%"></div>
                </div>
            `;
            analyticsVersionsList.appendChild(card);
        });

        // Animate progress bars
        setTimeout(() => {
            document.querySelectorAll('.version-progress-bar').forEach(bar => {
                bar.style.width = bar.dataset.targetWidth || '0%';
            });
        }, 50);

        if (analyticsLastSync) {
            const now = new Date();
            analyticsLastSync.textContent = `Aggiornato alle ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        }
    };

    // If cached data exists and it's not a forced manual refresh, render it immediately
    if (cached && !isManualRefresh) {
        try {
            renderStats(JSON.parse(cached));
        } catch(e) {}
    }

    try {
        const res = await fetch('https://api.github.com/repos/xTomeku/Quick_Check_Unisalento/releases');
        if (!res.ok) {
            throw new Error(`GitHub API HTTP ${res.status}`);
        }
        const data = await res.json();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        renderStats(data);
        if (isManualRefresh) {
            showToast('Statistiche aggiornate con successo!');
        }
    } catch (err) {
        console.error('Errore fetch GitHub Releases:', err);
        if (!cached) {
            analyticsVersionsList.innerHTML = `
                <div style="text-align: center; padding: 2rem 0;">
                    <p style="color: #ff4d4d; margin-bottom: 1rem;">Impossibile recuperare i dati da GitHub Releases (${err.message}).</p>
                    <button class="btn btn-secondary btn-sm" onclick="fetchDownloadStats(true)">Riprova</button>
                </div>
            `;
        } else {
            showToast('Errore durante l\'aggiornamento delle statistiche', 'error');
        }
    } finally {
        if (refreshIcon) refreshIcon.classList.remove('spinning');
        if (refreshAnalyticsBtn) refreshAnalyticsBtn.disabled = false;
    }
}

function animateValue(el, target) {
    if (!el) return;
    if (target <= 0) { el.textContent = '0'; return; }
    const duration = 800;
    const start = performance.now();
    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString('it-IT');
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

if (refreshAnalyticsBtn) {
    refreshAnalyticsBtn.addEventListener('click', () => {
        fetchDownloadStats(true);
        fetchUserStats();
        fetchVersionRolloutStats();
    });
}

// ===== Telemetria Anonima Utenti QuickCheck (Supabase) =====
// Variabile modalità simulazione dati demo (attiva di default per visualizzare subito l'anteprima)
let isDemoStatsMode = false;

function generateDemoStats() {
    const list = [];
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');

    // Genera 30 giorni di storico realistico con trend, picchi nel fine settimana e oscillazioni
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dataStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const trend = Math.floor((30 - i) * 1.6);

        const apkBase = Math.floor(18 + trend + Math.sin(i * 0.8) * 8 + (isWeekend ? 12 : 0));
        const pwaBase = Math.floor(10 + Math.floor(trend * 0.6) + Math.cos(i * 0.9) * 5 + (isWeekend ? 7 : 0));
        const webBase = Math.floor(7 + Math.floor(trend * 0.4) + (i % 4 === 0 ? 6 : 0));

        const apk = Math.max(3, apkBase);
        const pwa = Math.max(2, pwaBase);
        const web = Math.max(1, webBase);
        const totale = apk + pwa + web;

        list.push({
            data: dataStr,
            utenti_unici_totali: totale,
            utenti_apk: apk,
            utenti_pwa: pwa,
            utenti_web_browser: web
        });
    }
    return list;
}

/**
 * Storico degli utenti unici giorno per giorno (dal più recente), per Statistiche e Panoramica.
 * Interroga prioritariamente la vista aggregata 'v_utenti_unici_giornalieri'.
 * In caso di assenza della vista, esegue il fallback aggregando i record di 'app_accessi'.
 * Lancia l'errore se nessuna delle due fonti è leggibile.
 */
async function leggiStatisticheUtenti(days) {
    // Query alla vista aggregata SQL su Supabase con il limite richiesto
    let { data, error } = await _supabase
        .from('v_utenti_unici_giornalieri')
        .select('*')
        .order('data', { ascending: false })
        .limit(days);

    // Fallback resiliente: se la vista non è ancora presente, aggrega lato client da app_accessi
    if (error) {
        console.warn('v_utenti_unici_giornalieri non raggiungibile, fallback su app_accessi:', error.message);
        const { data: raw, error: rawErr } = await scaricaTutteLeRighe(() => _supabase
            .from('app_accessi')
            .select('uuid_utente, data, piattaforma'));

        if (rawErr) throw rawErr;

        const raggruppati = {};
        (raw || []).forEach(row => {
            const d = row.data;
            if (!raggruppati[d]) {
                raggruppati[d] = {
                    data: d,
                    all: new Set(),
                    apk: new Set(),
                    pwa: new Set(),
                    web: new Set()
                };
            }
            raggruppati[d].all.add(row.uuid_utente);
            if (row.piattaforma === 'android') raggruppati[d].apk.add(row.uuid_utente);
            else if (row.piattaforma === 'pwa') raggruppati[d].pwa.add(row.uuid_utente);
            else raggruppati[d].web.add(row.uuid_utente);
        });

        data = Object.keys(raggruppati).sort().reverse().map(d => ({
            data: d,
            utenti_unici_totali: raggruppati[d].all.size,
            utenti_apk: raggruppati[d].apk.size,
            utenti_pwa: raggruppati[d].pwa.size,
            utenti_web_browser: raggruppati[d].web.size
        }));

        if (days && days < 365) {
            data = data.slice(0, days);
        }
    }

    return data || [];
}

/**
 * Recupera le statistiche di accesso giornaliero da Supabase (o genera dati demo se attiva la simulazione)
 * e le mostra nella sezione Statistiche.
 */
async function fetchUserStats(days = currentStatsRangeDays) {
    if (!userStatsHistoryList) return;

    // Se la modalità demo è attiva, mostra dati simulati realistici
    if (isDemoStatsMode) {
        let demo = generateDemoStats();
        if (days && days < 365) {
            demo = demo.slice(0, days);
        }
        if (kpiUsersRangeLabel) {
            kpiUsersRangeLabel.textContent = days >= 365 ? 'Accessi Totali Storico (Demo)' : `Accessi Ultimi ${days} Giorni (Demo)`;
        }
        renderUserStats(demo);
        return;
    }

    try {
        // Aggiorna l'etichetta del KPI in base ai giorni selezionati
        if (kpiUsersRangeLabel) {
            kpiUsersRangeLabel.textContent = days >= 365 ? 'Accessi Totali Storico' : `Accessi Ultimi ${days} Giorni`;
        }

        renderUserStats(await leggiStatisticheUtenti(days));
    } catch (err) {
        console.error('Errore nel recupero telemetria utenti:', err);
        if (userStatsHistoryList) {
            userStatsHistoryList.innerHTML = `
                <div style="text-align: center; padding: 2rem 0; color: #ff6b6b;">
                    <p style="margin-bottom: 0.5rem; font-weight: 600;">Impossibile recuperare i dati da Supabase (${err.message})</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">Assicurati di aver eseguito lo script SQL per creare la tabella <code>app_accessi</code>.</p>
                </div>
            `;
        }
    }
}

// ============================================================
// GRAFICO TELEMETRIA UTENTI MULTILINEA (CHART.JS)
// ============================================================
let userStatsChart = null;
let chartTogglesInitialized = false;

// Plugin custom: linea verticale bianca di guida (crosshair) all'hover
const verticalCrosshairPlugin = {
    id: 'verticalCrosshair',
    afterDraw: (chart) => {
        if (chart.tooltip && chart.tooltip.opacity > 0 && chart.tooltip.dataPoints && chart.tooltip.dataPoints.length > 0) {
            const ctx = chart.ctx;
            const x = chart.tooltip.dataPoints[0].element.x;
            const topY = chart.scales.y.top;
            const bottomY = chart.scales.y.bottom;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, topY);
            ctx.lineTo(x, bottomY);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.stroke();
            ctx.restore();
        }
    }
};

function formatChartDate(isoDateStr) {
    if (!isoDateStr) return '';
    const parts = isoDateStr.split('-');
    if (parts.length < 3) return isoDateStr;
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function renderUserStatsChart(records) {
    const canvas = document.getElementById('user-stats-chart');
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');

    // Ordine cronologico per l'asse X (dal giorno più vecchio a oggi)
    const chronRecords = [...(records || [])].reverse();

    const labels = chronRecords.map(r => formatChartDate(r.data));
    const dataTotale = chronRecords.map(r => Number(r.utenti_unici_totali) || 0);
    const dataApk = chronRecords.map(r => Number(r.utenti_apk) || 0);
    const dataPwa = chronRecords.map(r => Number(r.utenti_pwa) || 0);
    const dataWeb = chronRecords.map(r => Number(r.utenti_web_browser) || 0);

    const createAreaGrad = (r, g, b) => {
        const grad = ctx.createLinearGradient(0, 0, 0, 300);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
        grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.03)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        return grad;
    };

    const isSinglePoint = chronRecords.length <= 1;

    const datasets = [
        {
            label: 'Totale Unici',
            data: dataTotale,
            borderColor: '#FFD700',
            backgroundColor: createAreaGrad(255, 215, 0),
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: isSinglePoint ? 6 : 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#FFD700',
            pointBorderColor: '#111',
            pointBorderWidth: 2
        },
        {
            label: 'APK Android',
            data: dataApk,
            borderColor: '#22c55e',
            backgroundColor: createAreaGrad(34, 197, 94),
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: isSinglePoint ? 6 : 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#22c55e',
            pointBorderColor: '#111',
            pointBorderWidth: 2
        },
        {
            label: 'PWA Standalone',
            data: dataPwa,
            borderColor: '#a855f7',
            backgroundColor: createAreaGrad(168, 85, 247),
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: isSinglePoint ? 6 : 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#a855f7',
            pointBorderColor: '#111',
            pointBorderWidth: 2
        },
        {
            label: 'Web Browser',
            data: dataWeb,
            borderColor: '#38bdf8',
            backgroundColor: createAreaGrad(56, 189, 248),
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: isSinglePoint ? 6 : 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#38bdf8',
            pointBorderColor: '#111',
            pointBorderWidth: 2
        }
    ];

    if (userStatsChart) {
        userStatsChart.data.labels = labels;
        datasets.forEach((ds, idx) => {
            if (userStatsChart.data.datasets[idx]) {
                userStatsChart.data.datasets[idx].data = ds.data;
                userStatsChart.data.datasets[idx].backgroundColor = ds.backgroundColor;
                userStatsChart.data.datasets[idx].pointRadius = ds.pointRadius;
            } else {
                userStatsChart.data.datasets.push(ds);
            }
        });
        userStatsChart.update();
        return;
    }

    userStatsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        plugins: [verticalCrosshairPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false // Gestito tramite le nostre pillole HTML custom
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(12, 12, 12, 0.94)',
                    titleColor: '#fff',
                    titleFont: { size: 12, weight: '700' },
                    bodyColor: '#e2e8f0',
                    bodyFont: { size: 12 },
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: true,
                    boxWidth: 8,
                    boxHeight: 8,
                    usePointStyle: true,
                    callbacks: {
                        label: (context) => ` ${context.dataset.label}: ${context.parsed.y}`
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.45)',
                        font: { size: 11 },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.45)',
                        font: { size: 11 },
                        precision: 0,
                        autoSkip: true,
                        maxTicksLimit: 6
                    },
                    border: {
                        display: false
                    }
                }
            }
        }
    });

    initChartToggles();
}

function initChartToggles() {
    if (chartTogglesInitialized) return;
    chartTogglesInitialized = true;

    document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!userStatsChart) return;
            const dsIdx = parseInt(btn.dataset.dataset, 10);
            const isVisible = userStatsChart.isDatasetVisible(dsIdx);
            userStatsChart.setDatasetVisibility(dsIdx, !isVisible);
            userStatsChart.update();
            btn.classList.toggle('active', !isVisible);
        });
    });
}

/**
 * Renderizza le card KPI, il grafico e la tabella dello storico accessi giornaliero.
 * Include badge colorati per le piattaforme (APK, PWA, Web) e mini-barra percentuale.
 */
function renderUserStats(records) {
    if (!userStatsHistoryList) return;

    // Aggiorna o crea il grafico interattivo multilinea
    renderUserStatsChart(records);

    // Determinazione date oggi e ieri nel formato YYYY-MM-DD
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const oggiStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    
    const ieriDate = new Date();
    ieriDate.setDate(ieriDate.getDate() - 1);
    const ieriStr = `${ieriDate.getFullYear()}-${pad(ieriDate.getMonth() + 1)}-${pad(ieriDate.getDate())}`;

    // Estrazione dati per oggi e ieri
    const datiOggi = records.find(r => r.data === oggiStr) || { utenti_unici_totali: 0, utenti_apk: 0, utenti_pwa: 0, utenti_web_browser: 0 };
    const datiIeri = records.find(r => r.data === ieriStr) || { utenti_unici_totali: 0, utenti_apk: 0, utenti_pwa: 0, utenti_web_browser: 0 };

    // KPI 1: Utenti unici Oggi con breakdown per piattaforma
    if (kpiUsersToday) animateValue(kpiUsersToday, Number(datiOggi.utenti_unici_totali) || 0);
    if (kpiSubApk) kpiSubApk.textContent = datiOggi.utenti_apk || 0;
    if (kpiSubPwa) kpiSubPwa.textContent = datiOggi.utenti_pwa || 0;
    if (kpiSubWeb) kpiSubWeb.textContent = datiOggi.utenti_web_browser || 0;

    // KPI 2: Ieri con differenziale rispetto a oggi
    const totOggi = Number(datiOggi.utenti_unici_totali) || 0;
    const totIeri = Number(datiIeri.utenti_unici_totali) || 0;
    if (kpiUsersYesterday) animateValue(kpiUsersYesterday, totIeri);
    if (kpiUsersYesterdaySub) {
        if (totIeri > 0) {
            const diff = totOggi - totIeri;
            const sign = diff >= 0 ? '+' : '';
            kpiUsersYesterdaySub.textContent = `Oggi: ${sign}${diff} rispetto a ieri`;
            kpiUsersYesterdaySub.style.color = diff >= 0 ? '#4ade80' : '#f87171';
        } else {
            kpiUsersYesterdaySub.textContent = 'Nessun dato per ieri';
            kpiUsersYesterdaySub.style.color = 'var(--text-muted)';
        }
    }

    // KPI 3: Media mobile ultimi 7 giorni
    const ultimi7 = records.slice(0, 7);
    const media7 = ultimi7.length > 0 
        ? Math.round(ultimi7.reduce((sum, r) => sum + Number(r.utenti_unici_totali || 0), 0) / ultimi7.length)
        : 0;
    if (kpiUsersAvg7) animateValue(kpiUsersAvg7, media7);

    // KPI 4: Totale accessi registrati negli ultimi 30 giorni
    const tot30 = records.reduce((sum, r) => sum + Number(r.utenti_unici_totali || 0), 0);
    if (kpiUsersTotal30) animateValue(kpiUsersTotal30, tot30);

    if (records.length === 0) {
        userStatsHistoryList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem 0;">Nessun dato di accesso registrato finora.</p>';
        return;
    }

    // Costruzione righe tabella storico con badge e progress bar multicolore
    const tableRows = records.map(r => {
        const tot = Number(r.utenti_unici_totali) || 0;
        const apk = Number(r.utenti_apk) || 0;
        const pwa = Number(r.utenti_pwa) || 0;
        const web = Number(r.utenti_web_browser) || 0;

        const apkPct = tot > 0 ? Math.round((apk / tot) * 100) : 0;
        const pwaPct = tot > 0 ? Math.round((pwa / tot) * 100) : 0;
        const webPct = tot > 0 ? Math.max(0, 100 - apkPct - pwaPct) : 0;

        let dataEtichetta = r.data;
        if (r.data === oggiStr) dataEtichetta = 'Oggi (' + r.data + ')';
        else if (r.data === ieriStr) dataEtichetta = 'Ieri (' + r.data + ')';

        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 12px 14px; font-weight: 600; color: #fff; white-space: nowrap;">
                    ${dataEtichetta}
                </td>
                <td style="padding: 12px 14px; text-align: center;">
                    <span style="font-weight: 800; color: var(--primary-gold); font-size: 1.05rem;">${tot}</span>
                </td>
                <td style="padding: 12px 14px; text-align: center;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; background: rgba(34, 197, 94, 0.12); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.25);">
                        📱 ${apk} <small style="opacity: 0.8">(${apkPct}%)</small>
                    </span>
                </td>
                <td style="padding: 12px 14px; text-align: center;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; background: rgba(168, 85, 247, 0.12); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.25);">
                        📲 ${pwa} <small style="opacity: 0.8">(${pwaPct}%)</small>
                    </span>
                </td>
                <td style="padding: 12px 14px; text-align: center;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.25);">
                        🌐 ${web} <small style="opacity: 0.8">(${webPct}%)</small>
                    </span>
                </td>
                <td style="padding: 12px 14px; min-width: 140px;">
                    <div style="display: flex; height: 6px; width: 100%; border-radius: 3px; overflow: hidden; background: rgba(255,255,255,0.05);">
                        <div style="width: ${apkPct}%; background: #22c55e;" title="APK: ${apkPct}%"></div>
                        <div style="width: ${pwaPct}%; background: #a855f7;" title="PWA: ${pwaPct}%"></div>
                        <div style="width: ${webPct}%; background: #38bdf8;" title="Web: ${webPct}%"></div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    userStatsHistoryList.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
            <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); color: var(--text-muted); text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.5px;">
                    <th style="padding: 10px 14px;">Data</th>
                    <th style="padding: 10px 14px; text-align: center;">Totale Unici</th>
                    <th style="padding: 10px 14px; text-align: center;">APK Android</th>
                    <th style="padding: 10px 14px; text-align: center;">PWA Standalone</th>
                    <th style="padding: 10px 14px; text-align: center;">Web Browser</th>
                    <th style="padding: 10px 14px;">Ripartizione</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}


// Gestione dei pulsanti del selettore di intervallo temporale (7G, 30G, 90G, Tutto)
document.querySelectorAll('.user-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.days, 10);
        if (!days) return;

        currentStatsRangeDays = days;

        // Aggiorna lo stile attivo dei bottoni
        document.querySelectorAll('.user-range-btn').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.color = 'var(--text-muted)';
            b.style.fontWeight = '600';
        });

        btn.classList.add('active');
        btn.style.background = 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)';
        btn.style.color = '#111';
        btn.style.fontWeight = '700';

        // Mostra stato di caricamento nella tabella e aggiorna i dati
        if (userStatsHistoryList) {
            userStatsHistoryList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem 0;">Caricamento telemetria...</p>';
        }
        fetchUserStats(currentStatsRangeDays);
    });
});

// Gestione pulsante attivazione/disattivazione Modalità Dati Demo
const toggleDemoStatsBtn = document.getElementById('toggle-demo-stats-btn');
const demoBtnText = document.getElementById('demo-btn-text');

if (toggleDemoStatsBtn) {
    if (isDemoStatsMode) {
        toggleDemoStatsBtn.style.background = 'rgba(168, 85, 247, 0.25)';
        toggleDemoStatsBtn.style.borderColor = '#c084fc';
        if (demoBtnText) demoBtnText.textContent = 'Disattiva Demo';
    }

    toggleDemoStatsBtn.addEventListener('click', () => {
        isDemoStatsMode = !isDemoStatsMode;

        if (isDemoStatsMode) {
            toggleDemoStatsBtn.style.background = 'rgba(168, 85, 247, 0.25)';
            toggleDemoStatsBtn.style.borderColor = '#c084fc';
            if (demoBtnText) demoBtnText.textContent = 'Disattiva Demo';
            showToast('Modalità Demo attivata: dati simulati negli ultimi 30 giorni', 'success');
        } else {
            toggleDemoStatsBtn.style.background = 'rgba(168, 85, 247, 0.08)';
            toggleDemoStatsBtn.style.borderColor = 'rgba(168, 85, 247, 0.35)';
            if (demoBtnText) demoBtnText.textContent = 'Simula Dati Demo';
            showToast('Dati reali Supabase ripristinati', 'success');
        }
        fetchUserStats(currentStatsRangeDays);
        fetchVersionRolloutStats();
    });
}

// ============================================================
// GESTIONE ADOZIONE VERSIONI & STATO ROLLOUT (SUPABASE)
// ============================================================
let currentRolloutRangeDays = 1; // 1 = Oggi, 7 = 7G, 30 = 30G
let currentRolloutPlatform = 'all'; // 'all', 'android_apk', 'web_pwa'
let rolloutControlsInitialized = false;

// Palette cromatica armonica per le versioni nel grafico segmentato e nelle card
const ROLLOUT_COLOR_PALETTE = [
    { bg: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)', hex: '#34d399', badgeBg: 'rgba(16, 185, 129, 0.15)', badgeColor: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }, // Verde (Corrente)
    { bg: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)', hex: '#fbbf24', badgeBg: 'rgba(245, 158, 11, 0.15)', badgeColor: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' }, // Ambra
    { bg: 'linear-gradient(90deg, #38bdf8 0%, #60a5fa 100%)', hex: '#38bdf8', badgeBg: 'rgba(56, 189, 248, 0.15)', badgeColor: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' }, // Azzurro
    { bg: 'linear-gradient(90deg, #a855f7 0%, #c084fc 100%)', hex: '#c084fc', badgeBg: 'rgba(168, 85, 247, 0.15)', badgeColor: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' }, // Viola
    { bg: 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)', hex: '#94a3b8', badgeBg: 'rgba(100, 116, 139, 0.15)', badgeColor: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' }  // Grigio
];

function semverCompare(vA, vB) {
    const clean = s => (s || '').replace(/^[^\d]*/, '').split('.').map(n => parseInt(n, 10) || 0);
    const aParts = clean(vA);
    const bParts = clean(vB);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const a = aParts[i] || 0;
        const b = bParts[i] || 0;
        if (a !== b) return b - a; // discendente (più recente prima)
    }
    return 0;
}

function generateDemoRolloutData() {
    return [
        {
            version: 'v2.2.0',
            isLatest: true,
            total: 182,
            pct: 74.3,
            apk: 78,
            pwa: 96,
            web: 8
        },
        {
            version: 'v2.1.0',
            isLatest: false,
            total: 48,
            pct: 19.6,
            apk: 44,
            pwa: 4,
            web: 0
        },
        {
            version: 'v2.0.0',
            isLatest: false,
            total: 15,
            pct: 6.1,
            apk: 15,
            pwa: 0,
            web: 0
        }
    ];
}

function initRolloutControls() {
    if (rolloutControlsInitialized) return;
    rolloutControlsInitialized = true;

    // Gestione bottoni intervallo Rollout (Oggi, 7G, 30G)
    document.querySelectorAll('.rollout-range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rollout-range-btn').forEach(b => {
                b.style.background = 'transparent';
                b.style.color = 'var(--text-muted)';
                b.style.fontWeight = '600';
                b.classList.remove('active');
            });
            btn.classList.add('active');
            btn.style.background = 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)';
            btn.style.color = '#111';
            btn.style.fontWeight = '700';

            currentRolloutRangeDays = parseInt(btn.dataset.days, 10);
            fetchVersionRolloutStats();
        });
    });

    // Gestione bottoni filtro piattaforma Rollout (Tutte, APK, PWA)
    document.querySelectorAll('.rollout-plat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rollout-plat-btn').forEach(b => {
                b.style.background = 'transparent';
                b.classList.remove('active');
            });
            btn.classList.add('active');
            btn.style.background = 'rgba(255, 255, 255, 0.12)';

            currentRolloutPlatform = btn.dataset.plat;
            fetchVersionRolloutStats();
        });
    });
}

/**
 * Recupera i dati di telemetria da 'app_accessi' per calcolare la diffusione delle versioni dell'app.
 */
/**
 * Supabase (PostgREST) restituisce al massimo 1000 righe per richiesta: con migliaia di
 * accessi al giorno una sola query ne perdeva la maggior parte e i conteggi risultavano
 * piu' bassi del reale. Qui si scaricano tutte le pagine da 1000 righe.
 * [creaQuery] deve restituire ogni volta una query NUOVA (con gli stessi filtri).
 */
async function scaricaTutteLeRighe(creaQuery, dimensionePagina = 1000) {
    const righe = [];
    for (let da = 0; ; da += dimensionePagina) {
        const { data, error } = await creaQuery()
            .order('data', { ascending: true })
            .order('uuid_utente', { ascending: true })
            .range(da, da + dimensionePagina - 1);
        if (error) return { data: null, error };
        righe.push(...(data || []));
        if (!data || data.length < dimensionePagina) break;
    }
    return { data: righe, error: null };
}

async function fetchVersionRolloutStats() {
    const listElem = document.getElementById('rollout-versions-breakdown-list');
    if (!listElem) return;

    initRolloutControls();

    // Se in modalità Demo, genera dati simulati realistici
    if (isDemoStatsMode) {
        renderVersionRolloutStats(generateDemoRolloutData(), 245, 137, 100, 8);
        return;
    }

    try {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const oggiStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        const minDateObj = new Date();
        minDateObj.setDate(minDateObj.getDate() - currentRolloutRangeDays);
        const minDateStr = `${minDateObj.getFullYear()}-${pad(minDateObj.getMonth() + 1)}-${pad(minDateObj.getDate())}`;
        const periodo = currentRolloutRangeDays === 1 ? { giorno: oggiStr } : { dal: minDateStr };

        const r = await calcolaAdozioneVersioni(periodo, currentRolloutPlatform);
        renderVersionRolloutStats(r.versioni, r.totale, r.apk, r.pwa, r.web);

    } catch (err) {
        console.error('Errore nel recupero adozione versioni:', err);
        listElem.innerHTML = `
            <div style="text-align: center; padding: 1.5rem 0; color: #ff6b6b;">
                <p style="font-size: 0.85rem;">Impossibile recuperare i dati delle versioni da Supabase (${err.message})</p>
            </div>
        `;
    }
}

/**
 * Diffusione delle versioni (per Statistiche e Panoramica): ultimo accesso di ogni utente
 * nel periodo, raggruppato per versione, con la più recente in testa (isLatest).
 * periodo = { giorno: 'YYYY-MM-DD' } per un solo giorno, oppure { dal: 'YYYY-MM-DD' } (incluso) fino a oggi.
 * piattaforma = 'all' | 'android_apk' | 'web_pwa'. Lancia l'errore se app_accessi non si legge.
 */
async function calcolaAdozioneVersioni(periodo, piattaforma = 'all') {
    // Query su app_accessi per recuperare la versione dei ping (tutte le pagine, vedi scaricaTutteLeRighe)
    const creaQuery = () => {
        const q = _supabase
            .from('app_accessi')
            .select('uuid_utente, data, piattaforma, app_version');
        return periodo.giorno ? q.eq('data', periodo.giorno) : q.gte('data', periodo.dal);
    };

    const { data, error } = await scaricaTutteLeRighe(creaQuery);
    if (error) throw error;

    // Mappiamo ciascun utente univoco al record più recente nel periodo selezionato
    const latestUserAccess = new Map();
    (data || []).forEach(row => {
        const existing = latestUserAccess.get(row.uuid_utente);
        if (!existing || row.data > existing.data) {
            latestUserAccess.set(row.uuid_utente, row);
        }
    });

    // Filtro per piattaforma (se selezionato 'android_apk' o 'web_pwa')
    let filteredAccesses = Array.from(latestUserAccess.values());
    if (piattaforma === 'android_apk') {
        filteredAccesses = filteredAccesses.filter(a => (a.piattaforma || '').toLowerCase() === 'android');
    } else if (piattaforma === 'web_pwa') {
        filteredAccesses = filteredAccesses.filter(a => {
            const p = (a.piattaforma || '').toLowerCase();
            return p === 'pwa' || p === 'web';
        });
    }

    const totalActiveUsers = filteredAccesses.length;
    let totalApk = 0;
    let totalPwa = 0;
    let totalWeb = 0;

    // Raggruppamento per versione
    const versionMap = {};
    filteredAccesses.forEach(a => {
        const plat = (a.piattaforma || '').toLowerCase();
        if (plat === 'android') totalApk++;
        else if (plat === 'pwa') totalPwa++;
        else totalWeb++;

        let ver = a.app_version ? a.app_version.trim() : '< v2.0.0 (Legacy)';
        if (!ver.startsWith('v') && !ver.startsWith('<')) ver = 'v' + ver;

        if (!versionMap[ver]) {
            versionMap[ver] = {
                version: ver,
                total: 0,
                apk: 0,
                pwa: 0,
                web: 0
            };
        }
        versionMap[ver].total++;
        if (plat === 'android') versionMap[ver].apk++;
        else if (plat === 'pwa') versionMap[ver].pwa++;
        else versionMap[ver].web++;
    });

    // Ordinamento semver decrescente (la versione più recente in testa)
    const sorted = Object.values(versionMap).sort((a, b) => {
        if (a.version.startsWith('<')) return 1;
        if (b.version.startsWith('<')) return -1;
        return semverCompare(a.version, b.version);
    });

    // Assegna il flag isLatest alla versione più alta
    if (sorted.length > 0) {
        sorted[0].isLatest = true;
    }

    // Calcolo percentuali
    sorted.forEach(item => {
        item.pct = totalActiveUsers > 0 ? Number(((item.total / totalActiveUsers) * 100).toFixed(1)) : 0;
    });

    return { versioni: sorted, totale: totalActiveUsers, apk: totalApk, pwa: totalPwa, web: totalWeb };
}

/**
 * Renderizza le card KPI di rollout, la barra segmentata e l'elenco versioni
 */
function renderVersionRolloutStats(versionList, totalUsers, totalApk, totalPwa, totalWeb) {
    const kpiRolloutPct = document.getElementById('kpi-rollout-pct');
    const kpiRolloutSub = document.getElementById('kpi-rollout-sub');
    const kpiLatestVer = document.getElementById('kpi-latest-detected-ver');
    const kpiLatestSub = document.getElementById('kpi-latest-detected-sub');
    const kpiPwaAdoption = document.getElementById('kpi-pwa-adoption');
    const kpiPwaSub = document.getElementById('kpi-pwa-adoption-sub');
    const kpiApkAdoption = document.getElementById('kpi-apk-adoption');
    const kpiApkSub = document.getElementById('kpi-apk-adoption-sub');
    const stackedBar = document.getElementById('rollout-stacked-bar');
    const stackedLegend = document.getElementById('rollout-stacked-legend');
    const breakdownList = document.getElementById('rollout-versions-breakdown-list');
    const lastUpdate = document.getElementById('rollout-last-update-time');

    if (lastUpdate) {
        const now = new Date();
        lastUpdate.textContent = `Aggiornato alle ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }

    if (!versionList || versionList.length === 0 || totalUsers === 0) {
        if (kpiRolloutPct) kpiRolloutPct.textContent = '0%';
        if (kpiRolloutSub) kpiRolloutSub.textContent = 'Nessun utente attivo';
        if (kpiLatestVer) kpiLatestVer.textContent = '—';
        if (kpiPwaAdoption) kpiPwaAdoption.textContent = '0%';
        if (kpiApkAdoption) kpiApkAdoption.textContent = '0%';
        if (stackedBar) stackedBar.innerHTML = '';
        if (stackedLegend) stackedLegend.innerHTML = '';
        if (breakdownList) {
            breakdownList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">Nessun dato di accesso registrato per il periodo o piattaforma selezionata.</p>';
        }
        return;
    }

    const latest = versionList.find(v => v.isLatest) || versionList[0];
    const adoptionPct = latest.pct;

    // Aggiornamento KPI Rollout
    if (kpiRolloutPct) {
        kpiRolloutPct.textContent = `${adoptionPct}%`;
        kpiRolloutPct.style.color = adoptionPct >= 70 ? '#4ade80' : (adoptionPct >= 40 ? '#fbbf24' : '#60a5fa');
    }
    if (kpiRolloutSub) {
        kpiRolloutSub.textContent = `${latest.total} su ${totalUsers} studenti attivi`;
    }
    if (kpiLatestVer) {
        kpiLatestVer.textContent = latest.version;
    }
    if (kpiLatestSub) {
        kpiLatestSub.textContent = `${latest.total} utenti unici (${adoptionPct}%)`;
    }

    // PWA Adoption
    const pwaTotal = totalPwa + totalWeb;
    const pwaLatest = (latest.pwa || 0) + (latest.web || 0);
    const pwaPct = pwaTotal > 0 ? Math.round((pwaLatest / pwaTotal) * 100) : 0;
    if (kpiPwaAdoption) kpiPwaAdoption.textContent = `${pwaPct}%`;
    if (kpiPwaSub) kpiPwaSub.textContent = `${pwaLatest} su ${pwaTotal} utenti Web/PWA`;

    // APK Adoption
    const apkTotal = totalApk;
    const apkLatest = latest.apk || 0;
    const apkPct = apkTotal > 0 ? Math.round((apkLatest / apkTotal) * 100) : 0;
    if (kpiApkAdoption) kpiApkAdoption.textContent = `${apkPct}%`;
    if (kpiApkSub) kpiApkSub.textContent = `${apkLatest} su ${apkTotal} utenti APK`;

    // Render Barra Segmentata e Legenda
    if (stackedBar && stackedLegend) {
        stackedBar.innerHTML = '';
        stackedLegend.innerHTML = '';

        versionList.forEach((item, idx) => {
            const color = ROLLOUT_COLOR_PALETTE[idx % ROLLOUT_COLOR_PALETTE.length];
            const seg = document.createElement('div');
            seg.style.width = `${item.pct}%`;
            seg.style.background = color.bg;
            seg.style.height = '100%';
            seg.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            seg.title = `${item.version}: ${item.total} utenti (${item.pct}%)`;
            stackedBar.appendChild(seg);

            const legItem = document.createElement('span');
            legItem.style.display = 'flex';
            legItem.style.alignItems = 'center';
            legItem.style.gap = '6px';
            legItem.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: ${color.hex};"></span> <strong>${item.version}</strong>: ${item.pct}% (${item.total})`;
            stackedLegend.appendChild(legItem);
        });
    }

    // Render Elenco Dettagliato Card Versioni
    if (breakdownList) {
        breakdownList.innerHTML = '';
        versionList.forEach((item, idx) => {
            const color = ROLLOUT_COLOR_PALETTE[idx % ROLLOUT_COLOR_PALETTE.length];
            const card = document.createElement('div');
            card.style.background = 'rgba(255, 255, 255, 0.02)';
            card.style.border = '1px solid rgba(255, 255, 255, 0.05)';
            card.style.borderRadius = '12px';
            card.style.padding = '1rem 1.2rem';
            card.style.marginBottom = '0.8rem';
            card.style.transition = 'all 0.25s ease';

            const badgeHtml = item.isLatest
                ? `<span style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">★ ULTIMA (ROLLOUT)</span>`
                : (idx === 1 
                    ? `<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 600;">PRECEDENTE</span>` 
                    : '');

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.6rem;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; font-size: 1.05rem; color: white;">${item.version}</span>
                        ${badgeHtml}
                    </div>
                    <div style="display: flex; align-items: baseline; gap: 6px;">
                        <span style="font-size: 1.25rem; font-weight: 800; color: ${color.hex};">${item.total}</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">studenti (${item.pct}%)</span>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; gap: 12px;">
                        <span style="color: #4ade80;">🤖 APK: <strong>${item.apk}</strong></span>
                        <span style="color: #c084fc;">🌐 PWA: <strong>${item.pwa}</strong></span>
                        <span style="color: #38bdf8;">💻 Web: <strong>${item.web}</strong></span>
                    </div>
                    <span>Quota: ${item.pct}%</span>
                </div>

                <div style="height: 6px; width: 100%; background: rgba(255, 255, 255, 0.05); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${item.pct}%; background: ${color.bg}; border-radius: 4px; transition: width 0.8s ease;"></div>
                </div>
            `;
            breakdownList.appendChild(card);
        });
    }
}


// ============================================================
// GESTIONE ESPORTAZIONE ED ELIMINAZIONE TELEMETRIA
// ============================================================

// DOM Modale Esportazione
const exportStatsModal = document.getElementById('export-stats-modal');
const openExportModalBtn = document.getElementById('open-export-modal-btn');
const closeExportModalBtn = document.getElementById('close-export-modal');
const exportStatsForm = document.getElementById('export-stats-form');
const exportRangeType = document.getElementById('export-range-type');
const exportCustomDates = document.getElementById('export-custom-dates');
const exportDateFrom = document.getElementById('export-date-from');
const exportDateTo = document.getElementById('export-date-to');
const exportFormatType = document.getElementById('export-format-type');
const exportConfirmBtn = document.getElementById('export-confirm-btn');

// Apertura / Chiusura Modal Esportazione
if (openExportModalBtn && exportStatsModal) {
    openExportModalBtn.addEventListener('click', () => {
        exportStatsModal.classList.remove('hidden');
    });
}
if (closeExportModalBtn && exportStatsModal) {
    closeExportModalBtn.addEventListener('click', () => {
        exportStatsModal.classList.add('hidden');
    });
}

// Toggle date personalizzate esportazione
if (exportRangeType && exportCustomDates) {
    exportRangeType.addEventListener('change', () => {
        if (exportRangeType.value === 'custom') {
            exportCustomDates.classList.remove('hidden');
        } else {
            exportCustomDates.classList.add('hidden');
        }
    });
}

// Esecuzione Esportazione (CSV o JSON)
if (exportStatsForm) {
    exportStatsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (exportConfirmBtn) exportConfirmBtn.disabled = true;

        try {
            const range = exportRangeType.value;
            const format = exportFormatType.value;

            // Costruiamo la query per recuperare lo storico da Supabase
            let query = _supabase.from('v_utenti_unici_giornalieri').select('*').order('data', { ascending: false });

            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const formatIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

            if (range === 'custom') {
                const from = exportDateFrom.value;
                const to = exportDateTo.value;
                if (!from || !to) {
                    showToast('Seleziona entrambe le date per l\'intervallo', 'error');
                    if (exportConfirmBtn) exportConfirmBtn.disabled = false;
                    return;
                }
                query = query.gte('data', from).lte('data', to);
            } else if (range !== 'all') {
                const days = parseInt(range, 10);
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                query = query.gte('data', formatIso(startDate));
            }

            let { data, error } = await query;

            // Fallback su app_accessi se la vista non è presente
            if (error) {
                console.warn('Fallback aggregazione client per export:', error.message);
                const creaRawQuery = () => {
                    let rawQuery = _supabase.from('app_accessi').select('uuid_utente, data, piattaforma');
                    if (range === 'custom') {
                        rawQuery = rawQuery.gte('data', exportDateFrom.value).lte('data', exportDateTo.value);
                    } else if (range !== 'all') {
                        const days = parseInt(range, 10);
                        const startDate = new Date();
                        startDate.setDate(startDate.getDate() - days);
                        rawQuery = rawQuery.gte('data', formatIso(startDate));
                    }
                    return rawQuery;
                };
                const { data: raw, error: rawErr } = await scaricaTutteLeRighe(creaRawQuery);
                if (rawErr) throw rawErr;

                const grouped = {};
                (raw || []).forEach(row => {
                    const d = row.data;
                    if (!grouped[d]) grouped[d] = { data: d, all: new Set(), apk: new Set(), pwa: new Set(), web: new Set() };
                    grouped[d].all.add(row.uuid_utente);
                    if (row.piattaforma === 'android') grouped[d].apk.add(row.uuid_utente);
                    else if (row.piattaforma === 'pwa') grouped[d].pwa.add(row.uuid_utente);
                    else grouped[d].web.add(row.uuid_utente);
                });
                data = Object.keys(grouped).sort().reverse().map(d => ({
                    data: d,
                    utenti_unici_totali: grouped[d].all.size,
                    utenti_apk: grouped[d].apk.size,
                    utenti_pwa: grouped[d].pwa.size,
                    utenti_web_browser: grouped[d].web.size
                }));
            }

            if (!data || data.length === 0) {
                showToast('Nessun dato trovato per l\'intervallo selezionato', 'error');
                if (exportConfirmBtn) exportConfirmBtn.disabled = false;
                return;
            }

            // Generazione file
            let blob;
            let filename;
            const timestamp = formatIso(new Date());

            if (format === 'json') {
                blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
                filename = `quickcheck_telemetria_${timestamp}.json`;
            } else {
                // Separatore: ';' per Excel (standard locale italiano/europeo) oppure ',' per CSV standard
                const separator = format === 'csv_comma' ? ',' : ';';
                const header = ['Data', 'Utenti Unici Totali', 'APK Android', 'PWA Standalone', 'Web Browser'].join(separator) + '\r\n';
                const rows = data.map(r => [
                    r.data,
                    r.utenti_unici_totali,
                    r.utenti_apk,
                    r.utenti_pwa,
                    r.utenti_web_browser
                ].join(separator)).join('\r\n');

                // \uFEFF (BOM UTF-8) garantisce che Excel riconosca immediatamente il set di caratteri e le colonne
                blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
                filename = `quickcheck_telemetria_${timestamp}.csv`;
            }

            // Trigger download nel browser
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            exportStatsModal.classList.add('hidden');
            showToast('Esportazione completata con successo!', 'success');
        } catch (err) {
            console.error('Errore export:', err);
            showToast(`Errore durante l'esportazione: ${err.message}`, 'error');
        } finally {
            if (exportConfirmBtn) exportConfirmBtn.disabled = false;
        }
    });
}

// DOM Modale Eliminazione
const deleteStatsModal = document.getElementById('delete-stats-modal');
const openDeleteModalBtn = document.getElementById('open-delete-modal-btn');
const closeDeleteModalBtn = document.getElementById('close-delete-modal');
const deleteStatsForm = document.getElementById('delete-stats-form');
const deleteRangeType = document.getElementById('delete-range-type');
const deleteCustomDates = document.getElementById('delete-custom-dates');
const deleteDateFrom = document.getElementById('delete-date-from');
const deleteDateTo = document.getElementById('delete-date-to');
const deleteAllWarning = document.getElementById('delete-all-warning');
const deleteConfirmText = document.getElementById('delete-confirm-text');
const deleteConfirmBtn = document.getElementById('delete-confirm-btn');

// Apertura / Chiusura Modal Eliminazione
if (openDeleteModalBtn && deleteStatsModal) {
    openDeleteModalBtn.addEventListener('click', () => {
        deleteStatsModal.classList.remove('hidden');
    });
}
if (closeDeleteModalBtn && deleteStatsModal) {
    closeDeleteModalBtn.addEventListener('click', () => {
        deleteStatsModal.classList.add('hidden');
    });
}

// Gestione visualizzazione campi dinamici modale eliminazione
if (deleteRangeType) {
    deleteRangeType.addEventListener('change', () => {
        const val = deleteRangeType.value;
        if (val === 'custom') {
            if (deleteCustomDates) deleteCustomDates.classList.remove('hidden');
            if (deleteAllWarning) deleteAllWarning.classList.add('hidden');
        } else if (val === 'all') {
            if (deleteCustomDates) deleteCustomDates.classList.add('hidden');
            if (deleteAllWarning) deleteAllWarning.classList.remove('hidden');
        } else {
            if (deleteCustomDates) deleteCustomDates.classList.add('hidden');
            if (deleteAllWarning) deleteAllWarning.classList.add('hidden');
        }
    });
}

// Esecuzione Eliminazione su Supabase
if (deleteStatsForm) {
    deleteStatsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = deleteRangeType.value;

        // Se è 'all', verifica che l'utente abbia digitato ELIMINA
        if (type === 'all') {
            if (deleteConfirmText.value.trim().toUpperCase() !== 'ELIMINA') {
                showToast('Digita la parola ELIMINA per confermare', 'error');
                return;
            }
        }

        if (deleteConfirmBtn) deleteConfirmBtn.disabled = true;

        try {
            const pad = n => String(n).padStart(2, '0');
            const formatIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            let deleteQuery = _supabase.from('app_accessi').delete();

            if (type === 'older_90') {
                const d = new Date();
                d.setDate(d.getDate() - 90);
                deleteQuery = deleteQuery.lt('data', formatIso(d));
            } else if (type === 'older_30') {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                deleteQuery = deleteQuery.lt('data', formatIso(d));
            } else if (type === 'custom') {
                const from = deleteDateFrom.value;
                const to = deleteDateTo.value;
                if (!from || !to) {
                    showToast('Seleziona entrambe le date per l\'intervallo di eliminazione', 'error');
                    if (deleteConfirmBtn) deleteConfirmBtn.disabled = false;
                    return;
                }
                deleteQuery = deleteQuery.gte('data', from).lte('data', to);
            } else if (type === 'all') {
                // Elimina tutti i record (in Supabase si specifica id != 0)
                deleteQuery = deleteQuery.neq('id', 0);
            }

            const { error } = await deleteQuery;
            if (error) throw error;

            showToast('Dati eliminati con successo!', 'success');
            deleteStatsModal.classList.add('hidden');
            if (deleteConfirmText) deleteConfirmText.value = '';

            // Ricarica la vista e i KPI con l'intervallo attivo
            fetchUserStats(currentStatsRangeDays);
        } catch (err) {
            console.error('Errore durante l\'eliminazione:', err);
            showToast(`Errore: ${err.message}. Verifica la policy DELETE su Supabase.`, 'error');
        } finally {
            if (deleteConfirmBtn) deleteConfirmBtn.disabled = false;
        }
    });
}

// ==========================================
// GESTIONE NOTIFICHE WEB PUSH & AVVISI
// ==========================================

const pushForm = document.getElementById('push-notification-form');
const pushTitleInput = document.getElementById('notif-title');
const pushBodyInput = document.getElementById('notif-body');
const pushChannelSelect = document.getElementById('notif-channel');
const pushUrlInput = document.getElementById('notif-url');
const pushSubmitBtn = document.getElementById('push-submit-btn');
const pushSubmitStatus = document.getElementById('push-submit-status');
const pushSubscribersCount = document.getElementById('push-subscribers-count');
const notificationsHistoryList = document.getElementById('notifications-history-list');
const refreshNotificationsBtn = document.getElementById('refresh-notifications-btn');

const targetTypeRadios = document.querySelectorAll('input[name="notif-target-type"]');
const targetCourseContainer = document.getElementById('target-course-container');
const targetCourseSelect = document.getElementById('notif-target-course');
const courseSearchInput = document.getElementById('notif-target-course-search');
const courseClearBtn = document.getElementById('notif-target-course-clear');
const courseDropdown = document.getElementById('notif-course-dropdown');
const targetValueContainer = document.getElementById('target-value-container');
const targetValueLabel = document.getElementById('target-value-label');
const targetValueInput = document.getElementById('notif-target-value');
const materieDatalist = document.getElementById('materie-datalist');

const scheduleTypeRadios = document.querySelectorAll('input[name="notif-schedule-type"]');
const scheduleDatetimeContainer = document.getElementById('schedule-datetime-container');
const scheduledAtInput = document.getElementById('notif-scheduled-at');

// Cache in memoria dei corsi ed insegnamenti scaricati da UniSalento
let _corsiUniSalento = null;

// Formatta una data locale in formato 'YYYY-MM-DDTHH:mm' compatibile con input datetime-local
function formatLocalDateTime(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
}

// Renderizza gli elementi del menu a tendina personalizzato dei corsi con filtro di ricerca
function renderCourseDropdown(filterText = '') {
    if (!courseDropdown) return;
    const query = filterText.trim().toLowerCase();

    if (!_corsiUniSalento || _corsiUniSalento.length === 0) {
        courseDropdown.innerHTML = `<div class="course-dropdown-empty">Nessun corso disponibile al momento.</div>`;
        return;
    }

    const filtered = _corsiUniSalento.filter(c => {
        if (!query) return true;
        const nomeMatch = c.nome && c.nome.toLowerCase().includes(query);
        const idMatch = c.id && c.id.toLowerCase().includes(query);
        return nomeMatch || idMatch;
    });

    if (filtered.length === 0) {
        courseDropdown.innerHTML = `<div class="course-dropdown-empty">Nessun corso trovato per "<strong>${escapeHtml(query)}</strong>"</div>`;
        return;
    }

    courseDropdown.innerHTML = filtered.map(c => {
        const isSelected = targetCourseSelect && targetCourseSelect.value === c.id;
        return `
            <div class="course-dropdown-item ${isSelected ? 'selected' : ''}" data-id="${c.id}" data-nome="${escapeHtml(c.nome)}">
                <span style="font-weight: 500;">${escapeHtml(c.nome)}</span>
                <span class="course-badge">${escapeHtml(c.id)}</span>
            </div>
        `;
    }).join('');

    // Listener per la selezione di ogni singolo corso nel dropdown
    courseDropdown.querySelectorAll('.course-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = item.getAttribute('data-id');
            const nome = item.getAttribute('data-nome');
            selezionaCorso(id, nome);
        });
    });
}

// Seleziona un corso, aggiorna l'input di ricerca visibile e la select nativa
function selezionaCorso(id, nome) {
    if (!id) {
        if (targetCourseSelect) targetCourseSelect.value = '';
        if (courseSearchInput) courseSearchInput.value = '';
        if (courseClearBtn) courseClearBtn.style.display = 'none';
        if (courseDropdown) courseDropdown.classList.add('hidden');
        aggiornaDatalistMaterie('');
        return;
    }

    if (targetCourseSelect) {
        targetCourseSelect.value = id;
        targetCourseSelect.dispatchEvent(new Event('change'));
    }
    if (courseSearchInput) {
        courseSearchInput.value = `${nome} [${id}]`;
    }
    if (courseClearBtn) {
        courseClearBtn.style.display = 'block';
    }
    if (courseDropdown) {
        courseDropdown.classList.add('hidden');
    }
    aggiornaDatalistMaterie(id);
}

// Inizializza gli eventi per la ricerca interattiva e digitazione nel campo corsi
function initCourseSearchEvents() {
    if (!courseSearchInput) return;

    // Al click o focus sul campo di ricerca, apri la lista e mostra i corsi filtrati
    courseSearchInput.addEventListener('focus', () => {
        if (!_corsiUniSalento) {
            caricaCorsiUniSalento().then(() => {
                renderCourseDropdown(courseSearchInput.value);
                courseDropdown?.classList.remove('hidden');
            });
        } else {
            renderCourseDropdown(courseSearchInput.value);
            courseDropdown?.classList.remove('hidden');
        }
    });

    courseSearchInput.addEventListener('click', () => {
        if (courseDropdown && courseDropdown.classList.contains('hidden')) {
            renderCourseDropdown(courseSearchInput.value);
            courseDropdown.classList.remove('hidden');
        }
    });

    // Filtra in tempo reale mentre l'utente scrive
    courseSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (courseClearBtn) {
            courseClearBtn.style.display = val ? 'block' : 'none';
        }
        if (!val) {
            if (targetCourseSelect) targetCourseSelect.value = '';
            aggiornaDatalistMaterie('');
        }
        renderCourseDropdown(val);
        if (courseDropdown) courseDropdown.classList.remove('hidden');
    });

    // Pulsante per cancellare rapidamente la selezione
    if (courseClearBtn) {
        courseClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selezionaCorso('', '');
            courseSearchInput.focus();
            renderCourseDropdown('');
            if (courseDropdown) courseDropdown.classList.remove('hidden');
        });
    }

    // Chiudi il menu se l'utente clicca fuori
    document.addEventListener('click', (e) => {
        if (!targetCourseContainer) return;
        if (!targetCourseContainer.contains(e.target)) {
            if (courseDropdown) courseDropdown.classList.add('hidden');
        }
    });
}
initCourseSearchEvents();

// Scarica l'elenco dei corsi e relativi insegnamenti tramite la Edge Function Supabase (100% CORS-friendly)
async function caricaCorsiUniSalento() {
    if (_corsiUniSalento && _corsiUniSalento.length > 0) {
        renderCourseDropdown(courseSearchInput ? courseSearchInput.value : '');
        return;
    }

    try {
        if (courseSearchInput) {
            courseSearchInput.placeholder = "Caricamento corsi in corso...";
        }
        if (targetCourseSelect) {
            targetCourseSelect.innerHTML = '<option value="">Caricamento corsi in corso...</option>';
        }

        // Recupera il token di sessione autenticata dell'amministratore
        const { data: { session } } = await _supabase.auth.getSession();
        const token = session ? session.access_token : window.SUPABASE_KEY;

        // Chiama la Edge Function che recupera ed elabora i corsi server-side (senza blocchi CORS del browser)
        const endpoint = `${window.SUPABASE_URL}/functions/v1/send-push?action=corsi`;
        const res = await fetch(endpoint, {
            headers: {
                'apikey': window.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.corsi || !Array.isArray(data.corsi)) throw new Error("Dati corsi non validi");

        _corsiUniSalento = data.corsi;

        // Popola la select interna con i corsi ordinati alfabeticamente
        if (targetCourseSelect) {
            targetCourseSelect.innerHTML = '<option value="">-- Seleziona un Corso di Laurea --</option>';
            _corsiUniSalento.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.nome} [${c.id}]`;
                targetCourseSelect.appendChild(opt);
            });
        }

        if (courseSearchInput) {
            courseSearchInput.placeholder = "🔍 Digita per cercare il corso (es: Informatica, Diritto, LB48R)...";
        }

        renderCourseDropdown(courseSearchInput ? courseSearchInput.value : '');
    } catch (err) {
        console.error('Errore caricamento corsi UniSalento:', err);
        if (courseSearchInput) {
            courseSearchInput.placeholder = "Errore nel caricamento corsi. Riprova.";
        }
        if (targetCourseSelect) {
            targetCourseSelect.innerHTML = '<option value="">Errore nel caricamento dei corsi (riprova)</option>';
        }
    }
}

// Aggiorna la lista di suggerimenti delle materie per il corso selezionato
function aggiornaDatalistMaterie(courseId) {
    if (!materieDatalist) return;
    materieDatalist.innerHTML = '';
    if (!courseId || !_corsiUniSalento) return;

    const corso = _corsiUniSalento.find(c => c.id === courseId);
    if (corso && corso.insegnamenti) {
        corso.insegnamenti.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            materieDatalist.appendChild(opt);
        });
    }
}

if (targetCourseSelect) {
    targetCourseSelect.addEventListener('change', () => {
        aggiornaDatalistMaterie(targetCourseSelect.value);
    });
}

// 1. Toggle Selettore Destinatari
targetTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'tutti') {
            if (targetCourseContainer) targetCourseContainer.classList.add('hidden');
            targetValueContainer.classList.add('hidden');
            if (targetCourseSelect) targetCourseSelect.required = false;
            targetValueInput.required = false;
            targetValueInput.value = '';
            selezionaCorso('', '');
        } else if (val === 'corso') {
            if (targetCourseContainer) targetCourseContainer.classList.remove('hidden');
            targetValueContainer.classList.add('hidden');
            if (targetCourseSelect) targetCourseSelect.required = true;
            targetValueInput.required = false;
            targetValueInput.value = '';
            caricaCorsiUniSalento();
        } else if (val === 'materia') {
            if (targetCourseContainer) targetCourseContainer.classList.add('hidden');
            targetValueContainer.classList.remove('hidden');
            if (targetCourseSelect) targetCourseSelect.required = false;
            targetValueLabel.textContent = "Nome della Materia (invia a tutti gli studenti che la seguono, in qualsiasi corso):";
            targetValueInput.placeholder = "Es: Analisi Matematica 1";
            targetValueInput.required = true;
            if (materieDatalist) materieDatalist.innerHTML = '';
            selezionaCorso('', '');
        } else if (val === 'materia_corso') {
            if (targetCourseContainer) targetCourseContainer.classList.remove('hidden');
            targetValueContainer.classList.remove('hidden');
            if (targetCourseSelect) targetCourseSelect.required = true;
            targetValueLabel.textContent = "Nome della Materia per questo Corso (digita o seleziona dal menu):";
            targetValueInput.placeholder = "Es: Analisi Matematica 1";
            targetValueInput.required = true;
            caricaCorsiUniSalento();
            if (targetCourseSelect && targetCourseSelect.value) {
                aggiornaDatalistMaterie(targetCourseSelect.value);
            }
        }
    });
});

// 2. Toggle Selettore Pianificazione (Subito vs Programmata)
scheduleTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'later') {
            scheduleDatetimeContainer.classList.remove('hidden');
            scheduledAtInput.required = true;

            // Calcola orario minimo e default in fuso orario locale
            const now = new Date();
            scheduledAtInput.min = formatLocalDateTime(now);
            if (typeof aggiornaLimitiDate === 'function') setTimeout(aggiornaLimitiDate, 0);

            // Se il campo è vuoto, imposta un default a +15 minuti arrotondato
            if (!scheduledAtInput.value) {
                const defaultDate = new Date(now.getTime() + 15 * 60 * 1000);
                defaultDate.setMinutes(Math.ceil(defaultDate.getMinutes() / 5) * 5);
                scheduledAtInput.value = formatLocalDateTime(defaultDate);
            }

            if (pushSubmitBtn) pushSubmitBtn.textContent = "Programma Notifica";
        } else {
            scheduleDatetimeContainer.classList.add('hidden');
            scheduledAtInput.required = false;
            scheduledAtInput.value = '';
            if (pushSubmitBtn) pushSubmitBtn.textContent = "Invia Notifica Adesso";
        }
    });
});

// Permette l'apertura diretta del calendario cliccando sul campo datetime
if (scheduledAtInput) {
    scheduledAtInput.addEventListener('click', () => {
        if (typeof scheduledAtInput.showPicker === 'function') {
            try {
                scheduledAtInput.showPicker();
            } catch (err) {
                // Fallback trasparente per browser con restrizioni di focus
            }
        }
    });
}

// 2b. Scadenza avviso ("Valido fino a")
const scadeIlInput = document.getElementById('notif-scade-il');

// Orario di riferimento per la scadenza: l'invio programmato (se presente) o adesso
function orarioRiferimentoScadenza() {
    const sched = document.querySelector('input[name="notif-schedule-type"]:checked')?.value;
    if (sched === 'later' && scheduledAtInput && scheduledAtInput.value) {
        const d = new Date(scheduledAtInput.value);
        if (!isNaN(d.getTime()) && d.getTime() > Date.now()) return d;
    }
    return new Date();
}

// Impedisce di selezionare date passate nei selettori (il controllo vero è comunque al submit e sul server)
function aggiornaLimitiDate() {
    const adesso = formatLocalDateTime(new Date());
    if (scheduledAtInput) scheduledAtInput.min = adesso;
    if (scadeIlInput) scadeIlInput.min = formatLocalDateTime(orarioRiferimentoScadenza());
}

if (scadeIlInput) {
    scadeIlInput.addEventListener('focus', aggiornaLimitiDate);
    scadeIlInput.addEventListener('click', () => {
        aggiornaLimitiDate();
        if (typeof scadeIlInput.showPicker === 'function') {
            try { scadeIlInput.showPicker(); } catch (err) { /* browser con restrizioni */ }
        }
    });
}
if (scheduledAtInput) {
    scheduledAtInput.addEventListener('focus', aggiornaLimitiDate);
    scheduledAtInput.addEventListener('change', aggiornaLimitiDate);
}

document.querySelectorAll('.scadenza-rapida').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!scadeIlInput) return;
        const tipo = btn.dataset.scadenza;
        const base = orarioRiferimentoScadenza();
        let d = null;
        if (tipo === '2h') {
            d = new Date(base.getTime() + 2 * 60 * 60 * 1000);
        } else if (tipo === 'giorno') {
            d = new Date(base);
            d.setHours(23, 59, 0, 0);
            // Se manca meno di un'ora alla fine della giornata, passa al giorno dopo
            if (d.getTime() - base.getTime() < 60 * 60 * 1000) d.setDate(d.getDate() + 1);
        } else if (tipo === 'settimana') {
            d = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        scadeIlInput.value = d ? formatLocalDateTime(d) : '';
        aggiornaLimitiDate();
    });
});

function descriviScadenza(iso) {
    if (!iso) return 'istantanea (solo dispositivi raggiungibili al momento dell\'invio)';
    return new Date(iso).toLocaleString();
}

// Chiamata autenticata alla Edge Function send-push con timeout
async function chiamaSendPush(corpo, timeoutMs = 25000) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        const token = session ? session.access_token : window.SUPABASE_KEY;
        const response = await fetch(`${window.SUPABASE_URL}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': window.SUPABASE_KEY
            },
            body: JSON.stringify(corpo),
            signal: abortController.signal
        });
        const testo = await response.text();
        let dati = {};
        try { dati = JSON.parse(testo); } catch (e) { dati = { error: `Risposta non valida dal server (HTTP ${response.status})` }; }
        if (!response.ok) throw new Error(dati.error || `Errore chiamata server (HTTP ${response.status})`);
        return dati;
    } catch (err) {
        if (err.name === 'AbortError') throw new Error('Timeout: il server ha impiegato troppo tempo a rispondere.');
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Ultimo storico caricato (serve al modale di modifica scadenza)
let _avvisiStorico = {};

// 3. Invio Notifica tramite Supabase Edge Function con gestione robusta degli errori e timeout
if (pushForm) {
    pushForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const titolo = pushTitleInput.value.trim();
        const messaggio = pushBodyInput.value.trim();
        const tipoCanale = pushChannelSelect.value;
        const urlAzione = pushUrlInput.value.trim() || '/';

        const targetType = document.querySelector('input[name="notif-target-type"]:checked').value;
        let targetValore = null;

        // Validazione dei campi target con Toast invece di alert nativo
        if (targetType === 'corso') {
            targetValore = targetCourseSelect ? targetCourseSelect.value : null;
            if (!targetValore) {
                showToast('Seleziona un corso di laurea dalla lista o cercalo scrivendo.', 'error');
                courseSearchInput?.focus();
                return;
            }
        } else if (targetType === 'materia') {
            targetValore = targetValueInput.value.trim().toUpperCase();
            if (!targetValore) {
                showToast('Inserisci il nome della materia da raggiungere.', 'error');
                targetValueInput?.focus();
                return;
            }
        } else if (targetType === 'materia_corso') {
            const courseId = targetCourseSelect ? targetCourseSelect.value : null;
            const materiaName = targetValueInput.value.trim().toUpperCase();
            if (!courseId) {
                showToast('Seleziona un corso di laurea dalla lista o cercalo scrivendo.', 'error');
                courseSearchInput?.focus();
                return;
            }
            if (!materiaName) {
                showToast('Inserisci o seleziona il nome della materia per questo corso.', 'error');
                targetValueInput?.focus();
                return;
            }
            targetValore = `${courseId}|${materiaName}`;
        }

        const scheduleType = document.querySelector('input[name="notif-schedule-type"]:checked').value;
        let programmatoPer = null;
        if (scheduleType === 'later') {
            if (!scheduledAtInput.value) {
                showToast('Seleziona una data e ora valide per la pianificazione.', 'error');
                scheduledAtInput?.focus();
                return;
            }
            const parsedDate = new Date(scheduledAtInput.value);
            if (isNaN(parsedDate.getTime())) {
                showToast('Data e ora non valide.', 'error');
                return;
            }
            if (parsedDate.getTime() <= Date.now()) {
                showToast('La data di pianificazione deve essere nel futuro.', 'error');
                return;
            }
            programmatoPer = parsedDate.toISOString();
        }

        let scadeIl = null;
        if (scadeIlInput && scadeIlInput.value) {
            const dataScadenza = new Date(scadeIlInput.value);
            if (isNaN(dataScadenza.getTime())) {
                showToast('Data di scadenza non valida.', 'error');
                scadeIlInput.focus();
                return;
            }
            if (dataScadenza.getTime() <= Date.now()) {
                showToast('La scadenza deve essere nel futuro.', 'error');
                scadeIlInput.focus();
                return;
            }
            if (programmatoPer && dataScadenza.getTime() <= new Date(programmatoPer).getTime()) {
                showToast("La scadenza deve essere successiva all'orario di invio programmato.", 'error');
                scadeIlInput.focus();
                return;
            }
            scadeIl = dataScadenza.toISOString();
        }

        // Costruzione etichetta del corso per la descrizione della notifica
        let courseDisplayName = targetValore;
        if (_corsiUniSalento && targetValore) {
            const idToSearch = targetType === 'materia_corso' ? targetValore.split('|')[0] : targetValore;
            const foundCourse = _corsiUniSalento.find(c => c.id === idToSearch);
            if (foundCourse) courseDisplayName = `${foundCourse.nome} [${foundCourse.id}]`;
        }

        let targetDescrizione = "TUTTI gli studenti registrati";
        if (targetType === 'corso') {
            targetDescrizione = `gli studenti del corso:\n"${courseDisplayName}"`;
        } else if (targetType === 'materia') {
            targetDescrizione = `gli studenti che seguono la materia:\n"${targetValore}"`;
        } else if (targetType === 'materia_corso') {
            const materiaName = targetValueInput.value.trim().toUpperCase();
            targetDescrizione = `gli studenti di "${materiaName}" nel corso:\n"${courseDisplayName}"`;
        }

        const platformType = document.querySelector('input[name="notif-platform"]:checked')?.value || 'tutti';
        let platformDesc = "Tutte le piattaforme (PWA + APK)";
        if (platformType === 'pwa') platformDesc = "Solo Web PWA";
        else if (platformType === 'apk') platformDesc = "Solo APK Android";

        const isLater = scheduleType === 'later';
        const confermaTesto = isLater
            ? `Vuoi programmare questa notifica per il ${new Date(programmatoPer).toLocaleString()} a:\n${targetDescrizione}\n[Piattaforma: ${platformDesc}]\n[Scadenza: ${descriviScadenza(scadeIl)}]?`
            : `Sei sicuro di voler INVIARE SUBITO questa notifica a:\n${targetDescrizione}\n[Piattaforma: ${platformDesc}]\n[Scadenza: ${descriviScadenza(scadeIl)}]?`;

        // Modale di conferma personalizzato (elimina il fastidioso popup nativo del browser)
        const confirmed = await customConfirm(confermaTesto, {
            title: isLater ? 'Pianificazione Notifica' : 'Invio Immediato Notifica',
            confirmText: isLater ? 'Programma Notifica' : 'Invia Subito',
            cancelText: 'Annulla',
            icon: isLater ? '⏰' : '🚀',
            isDanger: false
        });

        if (!confirmed) return;

        // Disabilita pulsante e mostra stato di caricamento dinamico
        pushSubmitBtn.disabled = true;
        pushSubmitBtn.style.opacity = '0.75';
        pushSubmitBtn.style.cursor = 'not-allowed';
        pushSubmitBtn.innerHTML = `
            <span style="display: inline-flex; align-items: center; gap: 8px;">
                <span class="spinning" style="display: inline-block;">⏳</span>
                <span>${isLater ? 'Pianificazione in corso...' : 'Invio in corso...'}</span>
            </span>
        `;
        pushSubmitStatus.textContent = isLater ? "Pianificazione avviso sul server..." : "Invio notifica in corso...";
        pushSubmitStatus.style.color = "var(--primary-gold)";

        // Timeout di sicurezza (25s) tramite AbortController per evitare blocchi infiniti
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 25000);

        try {
            const { data: { session } } = await _supabase.auth.getSession();
            const token = session ? session.access_token : window.SUPABASE_KEY;

            // Invocazione della Edge Function send-push su Supabase
            const endpoint = `${window.SUPABASE_URL}/functions/v1/send-push`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': window.SUPABASE_KEY
                },
                body: JSON.stringify({
                    titolo: titolo,
                    messaggio: messaggio,
                    tipo_canale: tipoCanale,
                    target_tipo: targetType,
                    target_valore: targetValore,
                    target_dettagli: { piattaforma: platformType },
                    url_azione: urlAzione,
                    programmato_per: programmatoPer,
                    scade_il: scadeIl
                }),
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            // Lettura sicura del body (gestisce sia JSON che risposte HTML/errore)
            const responseText = await response.text();
            let resData = {};
            try {
                resData = JSON.parse(responseText);
            } catch (jsonErr) {
                resData = { error: `Risposta non valida dal server (HTTP ${response.status})` };
            }

            if (!response.ok) {
                throw new Error(resData.error || `Errore chiamata server (HTTP ${response.status})`);
            }

            if (resData.programmato) {
                pushSubmitStatus.textContent = "✅ Notifica programmata con successo!";
                pushSubmitStatus.style.color = "#4ade80";
                showToast("Notifica programmata con successo!", "success");
            } else {
                const inviati = resData.inviati !== undefined ? resData.inviati : 0;
                const invPwa = resData.inviati_pwa !== undefined ? resData.inviati_pwa : null;
                const invApk = resData.inviati_apk !== undefined ? resData.inviati_apk : null;
                let dett = '';
                if (invPwa !== null && invApk !== null) {
                    dett = ` (${invPwa} PWA, ${invApk} APK)`;
                }
                pushSubmitStatus.textContent = `✅ Notifica inviata! Raggiunti: ${inviati} dispositivi${dett}.`;
                pushSubmitStatus.style.color = "#4ade80";
                showToast(`Notifica inviata a ${inviati} dispositivi${dett}!`, "success");
            }

            // Reset completo del modulo
            pushTitleInput.value = '';
            pushBodyInput.value = '';
            targetValueInput.value = '';
            selezionaCorso('', '');
            if (materieDatalist) materieDatalist.innerHTML = '';
            scheduledAtInput.value = '';
            if (scadeIlInput) scadeIlInput.value = '';

            document.querySelector('input[name="notif-target-type"][value="tutti"]').checked = true;
            document.querySelector('input[name="notif-schedule-type"][value="now"]').checked = true;
            const defPlat = document.querySelector('input[name="notif-platform"][value="tutti"]');
            if (defPlat) defPlat.checked = true;

            if (targetCourseContainer) targetCourseContainer.classList.add('hidden');
            targetValueContainer.classList.add('hidden');
            scheduleDatetimeContainer.classList.add('hidden');

            // Ricarica lo storico notifiche in modo asincrono protetto
            try {
                await fetchNotifications();
            } catch (hErr) {
                console.warn('Errore aggiornamento storico notifiche:', hErr);
            }

            setTimeout(() => {
                pushSubmitStatus.textContent = '';
            }, 6000);

        } catch (err) {
            clearTimeout(timeoutId);
            console.error('Errore invio push:', err);
            if (err.name === 'AbortError') {
                pushSubmitStatus.textContent = "⚠️ Timeout: il server ha impiegato troppo tempo a rispondere. Verifica lo storico.";
                showToast("Timeout: il server ha impiegato troppo tempo a rispondere.", "error");
            } else {
                pushSubmitStatus.textContent = `❌ Errore: ${err.message}`;
                showToast(`Errore: ${err.message}`, "error");
            }
            pushSubmitStatus.style.color = "#ef4444";
        } finally {
            // Ripristino garantito al 100% dello stato del pulsante, prevenendo qualsiasi blocco della pagina
            pushSubmitBtn.disabled = false;
            pushSubmitBtn.style.opacity = '1';
            pushSubmitBtn.style.cursor = 'pointer';
            const currentSched = document.querySelector('input[name="notif-schedule-type"]:checked')?.value;
            pushSubmitBtn.textContent = currentSched === 'later' ? "Programma Notifica" : "Invia Notifica";
        }
    });
}

// 4. Carica Contatore Sottoscrizioni e Storico Avvisi
async function fetchNotifications() {
    if (!notificationsHistoryList) return;

    try {
        // A. Conta dispositivi attivi distinguendo PWA e APK.
        // Usa la funzione RPC conta_iscrizioni_push (supabase/sql/02b): restituisce solo i
        // totali, senza il limite di 1000 righe e senza leggere la tabella delle iscrizioni.
        const { data: conteggi, error: subsErr } = await _supabase.rpc('conta_iscrizioni_push');

        if (subsErr) {
            console.warn('Conteggio iscrizioni push non riuscito:', subsErr.message);
        } else if (conteggi) {
            const riga = Array.isArray(conteggi) ? (conteggi[0] || {}) : conteggi;
            const tot = Number(riga.totale) || 0;
            const apkCount = Number(riga.apk) || 0;
            const pwaCount = Number(riga.pwa) || 0;

            if (pushSubscribersCount) pushSubscribersCount.textContent = tot;
            const pwaElem = document.getElementById('push-pwa-count');
            const apkElem = document.getElementById('push-apk-count');
            if (pwaElem) pwaElem.textContent = pwaCount;
            if (apkElem) apkElem.textContent = apkCount;
        }

        // B. Carica storico avvisi
        const { data: avvisi, error: avvisiErr } = await _supabase
            .from('avvisi_sistema')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(25);

        if (avvisiErr) throw avvisiErr;

        if (!avvisi || avvisi.length === 0) {
            notificationsHistoryList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted); background: rgba(0,0,0,0.2); border-radius: 12px;">
                    Nessuna notifica inviata o programmata al momento.
                </div>
            `;
            return;
        }

        _avvisiStorico = {};
        avvisi.forEach(a => { _avvisiStorico[String(a.id)] = a; });

        notificationsHistoryList.innerHTML = avvisi.map(item => {
            const isProgrammato = item.stato === 'programmato';
            const isInviato = item.stato === 'inviato';
            const isAnnullato = item.stato === 'annullato';
            const isScadutoNonInviato = item.stato === 'scaduto';
            const scadenza = item.scade_il ? new Date(item.scade_il) : null;
            const validitaTerminata = isInviato && (!scadenza || scadenza.getTime() <= Date.now());
            const modificabile = isProgrammato || isInviato || isScadutoNonInviato;

            let badgeHtml = '';
            if (isProgrammato) {
                badgeHtml = `<span style="background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">⏰ Programmato</span>`;
            } else if (isInviato) {
                badgeHtml = `<span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">✅ Inviato</span>`;
            } else if (isScadutoNonInviato) {
                badgeHtml = `<span style="background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.4); padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">⌛ Non inviato (scaduto)</span>`;
            } else if (isAnnullato) {
                badgeHtml = `<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">🚫 Annullato</span>`;
            } else {
                badgeHtml = `<span style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">⏳ ${item.stato}</span>`;
            }

            const plat = item.target_dettagli?.piattaforma;
            let platBadge = '';
            if (plat === 'pwa') {
                platBadge = `<span style="font-size: 0.75rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 6px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.3);">🌐 Solo PWA</span>`;
            } else if (plat === 'apk') {
                platBadge = `<span style="font-size: 0.75rem; background: rgba(74, 222, 128, 0.15); color: #4ade80; padding: 2px 6px; border-radius: 6px; border: 1px solid rgba(74, 222, 128, 0.3);">🤖 Solo APK</span>`;
            }

            const dataCreazione = new Date(item.created_at).toLocaleString();
            const dataProgrammata = item.programmato_per ? new Date(item.programmato_per).toLocaleString() : null;

            return `
                <div style="background: rgba(25, 25, 25, 0.7); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 1.2rem; margin-bottom: 0.8rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 250px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.4rem; flex-wrap: wrap;">
                            ${badgeHtml}
                            <span style="font-size: 0.78rem; color: var(--text-muted);">${dataCreazione}</span>
                            <span style="font-size: 0.75rem; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 6px; color: #ddd;">Canale: ${item.tipo_canale || 'avvisi'}</span>
                            <span style="font-size: 0.75rem; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 6px; color: #ddd;">Target: ${item.target_tipo || 'tutti'}${item.target_valore ? ' (' + item.target_valore + ')' : ''}</span>
                            ${platBadge}
                            ${validitaTerminata ? `<span style="font-size: 0.75rem; background: rgba(148, 163, 184, 0.15); color: #cbd5e1; padding: 2px 6px; border-radius: 6px; border: 1px solid rgba(148, 163, 184, 0.3);">⌛ Scaduto</span>` : ''}
                        </div>
                        <h4 style="font-size: 1.05rem; color: white; margin-bottom: 0.3rem;">${escapeHtml(item.titolo)}</h4>
                        <p style="font-size: 0.9rem; color: #bbb; margin-bottom: 0.4rem; white-space: pre-wrap;">${escapeHtml(item.messaggio)}</p>
                        ${dataProgrammata ? `<div style="font-size: 0.8rem; color: #facc15;">📅 Programmato per: <strong>${dataProgrammata}</strong></div>` : ''}
                        ${!isAnnullato ? (scadenza
                            ? `<div style="font-size: 0.8rem; color: var(--text-muted);">⌛ Valido fino a: <strong>${scadenza.toLocaleString()}</strong></div>`
                            : `<div style="font-size: 0.8rem; color: var(--text-muted);">⌛ Scadenza istantanea (solo dispositivi raggiungibili all'invio)</div>`) : ''}
                        ${isInviato ? `<div style="font-size: 0.8rem; color: var(--text-muted);">📱 Dispositivi raggiunti (PWA & APK): <strong>${item.conteggio_pwa_inviati || 0}</strong></div>` : ''}
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        ${modificabile ? `
                            <button onclick="modificaScadenzaAvviso('${item.id}')" class="btn btn-secondary btn-sm" style="cursor: pointer;" title="Modifica scadenza">
                                ⌛ Modifica scadenza
                            </button>
                        ` : ''}
                        ${isProgrammato ? `
                            <button onclick="annullaAvvisoProgrammato('${item.id}')" class="btn btn-secondary btn-sm" style="border-color: rgba(239, 68, 68, 0.4); color: #f87171; cursor: pointer;">
                                Annulla Invio
                            </button>
                        ` : ''}
                        <button onclick="eliminaAvviso('${item.id}')" class="btn btn-secondary btn-sm" style="opacity: 0.7; cursor: pointer;" title="Elimina dallo storico">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Errore caricamento storico notifiche:', e);
        notificationsHistoryList.innerHTML = `<div style="color: #ef4444; padding: 1rem;">Errore caricamento storico: ${e.message}</div>`;
    }
}

if (refreshNotificationsBtn) {
    refreshNotificationsBtn.addEventListener('click', fetchNotifications);
}

// Funzione globale per annullare un avviso programmato con modale personalizzato
window.annullaAvvisoProgrammato = async function (id) {
    const ok = await customConfirm('Vuoi davvero annullare questo invio programmato? La notifica non verrà spedita agli studenti.', {
        title: 'Annulla Invio Programmato',
        confirmText: 'Annulla Notifica',
        cancelText: 'Chiudi',
        icon: '🚫',
        isDanger: true
    });
    if (!ok) return;

    try {
        const { error } = await _supabase
            .from('avvisi_sistema')
            .update({ stato: 'annullato' })
            .eq('id', id);

        if (error) throw error;
        showToast('Notifica programmata annullata!', 'success');
        fetchNotifications();
    } catch (err) {
        console.error('Errore annullamento:', err);
        showToast(`Errore: ${err.message}`, 'error');
    }
};

// Funzione globale per eliminare un record dallo storico con modale personalizzato
window.eliminaAvviso = async function (id) {
    const ok = await customConfirm('Eliminare definitivamente questo record dallo storico delle notifiche?', {
        title: 'Elimina Record Storico',
        confirmText: 'Elimina Record',
        cancelText: 'Annulla',
        icon: '🗑️',
        isDanger: true
    });
    if (!ok) return;

    try {
        const { error } = await _supabase
            .from('avvisi_sistema')
            .delete()
            .eq('id', id);

        if (error) throw error;
        showToast('Record eliminato dallo storico!', 'success');
        fetchNotifications();
    } catch (err) {
        console.error('Errore eliminazione:', err);
        showToast(`Errore: ${err.message}`, 'error');
    }
};

// Modale per modificare scadenza (e orario di invio, se programmato) di un avviso
window.modificaScadenzaAvviso = function (id) {
    const avviso = _avvisiStorico[String(id)];
    if (!avviso) { showToast('Avviso non trovato: aggiorna lo storico.', 'error'); return; }
    const isProgrammato = avviso.stato === 'programmato';
    const isInviato = avviso.stato === 'inviato';

    const esistente = document.getElementById('modale-scadenza-avviso');
    if (esistente) esistente.remove();

    const adesso = new Date();
    const valoreScadenza = avviso.scade_il && new Date(avviso.scade_il) > adesso ? formatLocalDateTime(new Date(avviso.scade_il)) : '';
    const valoreProgrammato = avviso.programmato_per ? formatLocalDateTime(new Date(avviso.programmato_per)) : '';

    let spiegazione;
    if (isProgrammato) {
        spiegazione = 'Avviso non ancora inviato: puoi cambiare orario di invio e scadenza.';
    } else if (isInviato) {
        spiegazione = 'Prolungando la scadenza, l\'avviso viene reinviato solo ai dispositivi che non ne hanno confermato la ricezione. Lasciando il campo vuoto l\'avviso scade adesso.';
    } else {
        spiegazione = 'L\'avviso non è mai partito perché era già scaduto. Impostando una nuova scadenza viene inviato adesso a tutti i destinatari.';
    }

    const overlay = document.createElement('div');
    overlay.id = 'modale-scadenza-avviso';
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 16px;';
    overlay.innerHTML = `
        <div style="background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 1.5rem; width: 100%; max-width: 440px;">
            <h3 style="color: white; margin-bottom: 0.4rem;">⌛ Modifica scadenza</h3>
            <p style="font-size: 0.85rem; color: #bbb; margin-bottom: 0.4rem;"><strong>${escapeHtml(avviso.titolo)}</strong></p>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">${spiegazione}</p>
            ${isProgrammato ? `
                <label for="mod-programmato" style="font-weight: 600; color: white; display: block; margin-bottom: 0.4rem;">📅 Orario di invio</label>
                <input type="datetime-local" id="mod-programmato" class="form-control" style="width: 100%; background: #1e1e1e; margin-bottom: 1rem;" value="${valoreProgrammato}" min="${formatLocalDateTime(adesso)}">
            ` : ''}
            <label for="mod-scade-il" style="font-weight: 600; color: white; display: block; margin-bottom: 0.4rem;">⌛ Valido fino a</label>
            <input type="datetime-local" id="mod-scade-il" class="form-control" style="width: 100%; background: #1e1e1e;" value="${valoreScadenza}" min="${formatLocalDateTime(adesso)}">
            <small style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 6px;">Vuoto = scadenza istantanea.</small>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 1.2rem;">
                <button type="button" id="mod-annulla" class="btn btn-secondary btn-sm" style="cursor: pointer;">Chiudi</button>
                <button type="button" id="mod-salva" class="btn btn-primary btn-sm" style="cursor: pointer;">Salva</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const chiudi = () => overlay.remove();
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) chiudi(); });
    overlay.querySelector('#mod-annulla').addEventListener('click', chiudi);

    const inputScadenza = overlay.querySelector('#mod-scade-il');
    const inputProgrammato = overlay.querySelector('#mod-programmato');
    [inputScadenza, inputProgrammato].forEach(inp => {
        if (!inp) return;
        inp.addEventListener('click', () => {
            inp.min = formatLocalDateTime(new Date());
            if (typeof inp.showPicker === 'function') { try { inp.showPicker(); } catch (e) { } }
        });
    });

    const btnSalva = overlay.querySelector('#mod-salva');
    btnSalva.addEventListener('click', async () => {
        let programmatoPer = null;
        if (inputProgrammato) {
            if (!inputProgrammato.value) { showToast("Inserisci l'orario di invio.", 'error'); return; }
            const d = new Date(inputProgrammato.value);
            if (isNaN(d.getTime()) || d.getTime() <= Date.now()) {
                showToast("L'orario di invio deve essere nel futuro.", 'error');
                return;
            }
            programmatoPer = d.toISOString();
        }

        let scadeIl = null;
        if (inputScadenza.value) {
            const d = new Date(inputScadenza.value);
            if (isNaN(d.getTime()) || d.getTime() <= Date.now()) {
                showToast('La scadenza deve essere nel futuro.', 'error');
                return;
            }
            if (programmatoPer && d.getTime() <= new Date(programmatoPer).getTime()) {
                showToast("La scadenza deve essere successiva all'orario di invio.", 'error');
                return;
            }
            scadeIl = d.toISOString();
        }

        if (!isProgrammato && !scadeIl) {
            if (!isInviato) { showToast('Imposta una scadenza futura per inviare l\'avviso.', 'error'); return; }
            const ok = await customConfirm("Senza scadenza l'avviso scade adesso: i dispositivi che non l'hanno ancora ricevuto non lo riceveranno più. Continuare?", {
                title: 'Termina validità avviso',
                confirmText: 'Fai scadere ora',
                cancelText: 'Annulla',
                icon: '⌛',
                isDanger: true
            });
            if (!ok) return;
        }

        btnSalva.disabled = true;
        btnSalva.textContent = 'Salvataggio...';
        try {
            const res = await chiamaSendPush({
                azione: 'modifica_scadenza',
                id: avviso.id,
                scade_il: scadeIl,
                programmato_per: programmatoPer
            });
            chiudi();
            if (res.reinviati > 0) {
                const dett = (res.reinviati_pwa !== undefined && res.reinviati_apk !== undefined)
                    ? ` (${res.reinviati_pwa} PWA, ${res.reinviati_apk} APK)` : '';
                showToast(`Scadenza aggiornata. Reinviato a ${res.reinviati} dispositivi${dett}.`, 'success');
            } else {
                showToast('Scadenza aggiornata!', 'success');
            }
            fetchNotifications();
        } catch (err) {
            console.error('Errore modifica scadenza:', err);
            showToast(`Errore: ${err.message}`, 'error');
            btnSalva.disabled = false;
            btnSalva.textContent = 'Salva';
        }
    });
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// =====================================================================
// App & Mappe: tabella config_app e bucket "mappe" (script SQL 07)
// - Messaggio all'avvio: letto da APK e PWA (una volta per testo).
// - Mappe: mappe.json viene reso compatto, firmato (SHA-256) e compresso (gzip)
//   nel browser, caricato come mappe_v<N>.json.gz e registrato in config_app.
//   Le app lo scaricano solo quando mappa_version sale.
// =====================================================================
const BUCKET_MAPPE = 'mappe';
let _configApp = null;
let _mappePronte = null;

function _kb(byte) {
    return byte >= 1024 ? `${(byte / 1024).toFixed(1)} KB` : `${byte} B`;
}

function _hex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function _gzip(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function _gunzip(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Legge config_app una volta sola e compila le parti richieste, una per sezione del menu:
// 'messaggio', 'mappe', 'menu'. Senza argomento le compila tutte.
// Aprendo una sezione si aggiorna solo la sua parte: le modifiche non salvate nelle altre restano.
async function fetchConfigApp(parti = ['messaggio', 'mappe', 'menu']) {
    const stato = document.getElementById('cfg-mappe-stato');
    const statoMsg = document.getElementById('cfg-msg-stato');
    const statoMenu = document.getElementById('cfg-menu-stato');
    const { data, error } = await _supabase.from('config_app').select('*').eq('id', 1).single();
    if (error) {
        const avviso = `<span style="color:#f87171;">Errore: ${escapeHtml(error.message)}. Lo script SQL 07 &egrave; stato applicato?</span>`;
        if (parti.includes('messaggio') && statoMsg) {
            statoMsg.innerHTML = avviso;
            statoMsg.classList.remove('hidden');
        }
        if (parti.includes('mappe') && stato) stato.innerHTML = avviso;
        if (parti.includes('menu') && statoMenu) statoMenu.innerHTML = avviso;
        return;
    }
    _configApp = data;

    if (parti.includes('messaggio')) {
        if (statoMsg) statoMsg.classList.add('hidden');
        document.getElementById('cfg-msg-attivo').checked = !!data.messaggio_attivo;
        document.getElementById('cfg-msg-titolo').value = data.titolo_messaggio || '';
        document.getElementById('cfg-msg-testo').value = data.testo_messaggio || '';
        document.getElementById('cfg-msg-vecchi').checked = !!data.solo_vecchi_utenti;
    }

    if (parti.includes('mappe')) {
        const quando = data.aggiornato_il ? new Date(data.aggiornato_il).toLocaleString('it-IT') : '-';
        stato.innerHTML = data.mappa_path
            ? `Versione pubblicata: <strong style="color:var(--primary-gold);">v${data.mappa_version}</strong> &middot; ${escapeHtml(data.mappa_path)} &middot; ${data.mappa_bytes ? _kb(data.mappa_bytes) : '-'} &middot; impronta ${escapeHtml((data.mappa_sha256 || '').slice(0, 12))}&hellip; &middot; aggiornata il ${quando}`
            : `Versione attuale: <strong>v${data.mappa_version}</strong> &middot; nessun file su Supabase (le app usano le mappe incluse o GitHub)`;
        elencaVersioniMappe();
    }

    if (parti.includes('menu')) caricaMenuPubblicato();
}

document.getElementById('config-messaggio-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        messaggio_attivo: document.getElementById('cfg-msg-attivo').checked,
        titolo_messaggio: document.getElementById('cfg-msg-titolo').value.trim() || 'Avviso',
        testo_messaggio: document.getElementById('cfg-msg-testo').value.trim(),
        solo_vecchi_utenti: document.getElementById('cfg-msg-vecchi').checked,
    };
    if (payload.messaggio_attivo && !payload.testo_messaggio) {
        showToast('Scrivi il testo del messaggio prima di attivarlo', 'error');
        return;
    }
    const { error } = await _supabase.from('config_app').update(payload).eq('id', 1);
    if (error) {
        showToast('Errore nel salvataggio: ' + error.message, 'error');
    } else {
        showToast(payload.messaggio_attivo ? 'Messaggio salvato e attivo' : 'Messaggio salvato (spento)');
        fetchConfigApp(['messaggio']);
        aggiornaStatoPanoramica();
    }
});

// Scelta del file: controlli, compressione e anteprima (niente viene caricato qui)
document.getElementById('cfg-mappe-file')?.addEventListener('change', async (e) => {
    const anteprima = document.getElementById('cfg-mappe-anteprima');
    const pulsante = document.getElementById('cfg-mappe-pubblica');
    _mappePronte = null;
    pulsante.disabled = true;
    anteprima.style.display = 'none';
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
        const testo = await file.text();
        let dati;
        try {
            dati = JSON.parse(testo);
        } catch (err) {
            throw new Error('il file non è un JSON valido (' + err.message + ')');
        }
        for (const chiave of ['edifici', 'puntiInteresse', 'lineeBus']) {
            if (!Array.isArray(dati[chiave])) throw new Error(`manca l'elenco "${chiave}"`);
        }
        if (dati.edifici.length === 0) throw new Error('l\'elenco "edifici" è vuoto');

        const compatto = new TextEncoder().encode(JSON.stringify(dati));
        const sha256 = _hex(await crypto.subtle.digest('SHA-256', compatto));
        const gz = await _gzip(compatto);
        const prossima = ((_configApp && _configApp.mappa_version) || 0) + 1;
        _mappePronte = { gz, sha256, versione: prossima };

        anteprima.innerHTML = `
            <div style="font-weight:600; margin-bottom:0.5rem;">Pronto da pubblicare come <span style="color:var(--primary-gold);">v${prossima}</span></div>
            <div>${dati.edifici.length} edifici &middot; ${dati.puntiInteresse.length} punti di interesse &middot; ${dati.lineeBus.length} linee bus</div>
            <div style="color:var(--text-muted); font-size:0.85rem; margin-top:0.4rem;">Originale ${_kb(file.size)} &rarr; compatto ${_kb(compatto.byteLength)} &rarr; compresso <strong>${_kb(gz.byteLength)}</strong> &middot; impronta ${sha256.slice(0, 12)}&hellip;</div>`;
        anteprima.style.display = 'block';
        pulsante.disabled = false;
    } catch (err) {
        anteprima.innerHTML = `<span style="color:#f87171;">File non valido: ${escapeHtml(err.message)}</span>`;
        anteprima.style.display = 'block';
    }
});

async function _registraMappe(versione, path, sha256, byte) {
    return _supabase.from('config_app').update({
        mappa_version: versione,
        mappa_path: path,
        mappa_sha256: sha256,
        mappa_bytes: byte,
    }).eq('id', 1);
}

document.getElementById('cfg-mappe-pubblica')?.addEventListener('click', async () => {
    if (!_mappePronte) return;
    const { gz, sha256, versione } = _mappePronte;
    const path = `mappe_v${versione}.json.gz`;
    if (!confirm(`Pubblicare le mappe come v${versione}? Tutte le app le scaricheranno al prossimo controllo.`)) return;

    const pulsante = document.getElementById('cfg-mappe-pubblica');
    pulsante.disabled = true;
    pulsante.textContent = 'Pubblicazione...';
    try {
        // 1. Caricamento del file: finché config_app non cambia nessuno lo scarica
        const { error: errUpload } = await _supabase.storage.from(BUCKET_MAPPE).upload(
            path,
            new Blob([gz], { type: 'application/gzip' }),
            { upsert: true, contentType: 'application/gzip', cacheControl: '31536000' }
        );
        if (errUpload) throw new Error('caricamento: ' + errUpload.message);

        // 2. Registrazione: da qui le app iniziano a scaricarlo
        const { error: errConfig } = await _registraMappe(versione, path, sha256, gz.byteLength);
        if (errConfig) throw new Error('registrazione: ' + errConfig.message);

        showToast(`Mappe pubblicate come v${versione}`);
        document.getElementById('cfg-mappe-file').value = '';
        document.getElementById('cfg-mappe-anteprima').style.display = 'none';
        _mappePronte = null;
        fetchConfigApp(['mappe']);
        aggiornaStatoPanoramica();
    } catch (err) {
        showToast('Errore nella pubblicazione (' + err.message + '): le app continuano a usare la versione precedente', 'error');
        pulsante.disabled = false;
    } finally {
        pulsante.textContent = 'Pubblica mappe';
    }
});

async function elencaVersioniMappe() {
    const elenco = document.getElementById('cfg-mappe-elenco');
    const { data, error } = await _supabase.storage.from(BUCKET_MAPPE).list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) {
        elenco.innerHTML = `<span style="color:#f87171;">Errore: ${escapeHtml(error.message)}</span>`;
        return;
    }
    const file = (data || []).filter(f => f.name && f.name.startsWith('mappe_') && f.name.endsWith('.json.gz'));
    if (file.length === 0) {
        elenco.textContent = 'Nessun file pubblicato.';
        return;
    }
    elenco.innerHTML = file.map(f => {
        const attuale = _configApp && _configApp.mappa_path === f.name;
        const quando = f.created_at ? new Date(f.created_at).toLocaleString('it-IT') : '';
        const dim = f.metadata && f.metadata.size ? _kb(f.metadata.size) : '';
        return `<div style="display:flex; align-items:center; gap:0.8rem; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="flex:1; color:var(--text-main, inherit);">${escapeHtml(f.name)} <span style="color:var(--text-muted); font-size:0.8rem;">${dim} &middot; ${quando}</span></span>
            ${attuale
                ? '<span style="color:var(--primary-gold); font-size:0.8rem; font-weight:600;">in uso</span>'
                : `<button type="button" class="btn btn-secondary btn-sm" data-ripristina="${escapeHtml(f.name)}">Ripristina</button>`}
        </div>`;
    }).join('');
    elenco.querySelectorAll('[data-ripristina]').forEach(b =>
        b.addEventListener('click', () => ripristinaMappe(b.dataset.ripristina)));
}

// Ripristina un file già caricato: nuova mappa_version (così le app lo riscaricano),
// impronta ricalcolata dal file stesso.
async function ripristinaMappe(nome) {
    const versione = ((_configApp && _configApp.mappa_version) || 0) + 1;
    if (!confirm(`Ripristinare ${nome}? Verrà pubblicato come v${versione}.`)) return;
    try {
        const { data, error } = await _supabase.storage.from(BUCKET_MAPPE).download(nome);
        if (error) throw new Error(error.message);
        const gz = new Uint8Array(await data.arrayBuffer());
        const json = await _gunzip(gz);
        JSON.parse(new TextDecoder().decode(json)); // controllo che sia ancora leggibile
        const sha256 = _hex(await crypto.subtle.digest('SHA-256', json));
        const { error: errConfig } = await _registraMappe(versione, nome, sha256, gz.byteLength);
        if (errConfig) throw new Error(errConfig.message);
        showToast(`${nome} ripristinato come v${versione}`);
        fetchConfigApp(['mappe']);
        aggiornaStatoPanoramica();
    } catch (err) {
        showToast('Errore nel ripristino: ' + err.message, 'error');
    }
}

// ---------------------------------------------------------------------
// Menu' mensa (script SQL 08): JSON da scripts/menu_mensa_pdf.py, date impostate qui,
// pubblicato compresso come menu_mensa_v<N>.json.gz nel bucket "mappe".
// ---------------------------------------------------------------------
let _menuPubblicato = null;   // JSON del menu' attualmente pubblicato
let _menuBozza = null;        // JSON scelto dal file (sostituisce quello pubblicato)

function _isoOggi(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Settimana del ciclo (1..n) e giorno (1 = lunedi') per una data, come nell'app. */
function settimanaMenu(menu, data) {
    const c = new Date(menu.inizio_ciclo + 'T00:00:00');
    const g = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const giorno = ((g.getDay() + 6) % 7) + 1;
    const lunedi = new Date(g); lunedi.setDate(g.getDate() - (giorno - 1));
    const settimane = Math.round((lunedi - c) / (7 * 864e5));
    const n = menu.settimane || 1;
    return { settimana: ((settimane % n) + n) % n + 1, giorno };
}

function _validaMenu(dati) {
    if (!dati || !Array.isArray(dati.menu) || dati.menu.length === 0) throw new Error('manca l\'elenco "menu"');
    if (!dati.settimane) throw new Error('manca il numero di settimane');
    for (const m of dati.menu) {
        if (!m.settimana || !['pranzo', 'cena'].includes(m.pasto) || !Array.isArray(m.giorni) || m.giorni.length !== 7) {
            throw new Error(`pagina non valida (settimana ${m.settimana}, ${m.pasto})`);
        }
    }
}

function _compilaDateMenu(dati) {
    document.getElementById('cfg-menu-titolo').value = dati?.titolo || '';
    document.getElementById('cfg-menu-dal').value = dati?.valido_dal || '';
    document.getElementById('cfg-menu-al').value = dati?.valido_al || '';
    document.getElementById('cfg-menu-ciclo').value = dati?.inizio_ciclo || '';
}

/** Scarica e decomprime il menù indicato da config_app.menu_path (null se non ce n'è uno). Usata anche dalla Panoramica. */
async function leggiMenuPubblicato(config) {
    if (!config || !config.menu_path) return null;
    const { data, error } = await _supabase.storage.from(BUCKET_MAPPE).download(config.menu_path);
    if (error) throw new Error(error.message);
    const json = await _gunzip(new Uint8Array(await data.arrayBuffer()));
    return JSON.parse(new TextDecoder().decode(json));
}

async function caricaMenuPubblicato() {
    const stato = document.getElementById('cfg-menu-stato');
    if (!stato || !_configApp) return;
    _menuPubblicato = null;
    if (!_configApp.menu_path) {
        stato.textContent = 'Nessun menù pubblicato.';
        if (!_menuBozza) _compilaDateMenu(null);
        return;
    }
    try {
        _menuPubblicato = await leggiMenuPubblicato(_configApp);
        stato.innerHTML = `Pubblicato: <strong style="color:var(--primary-gold);">${escapeHtml(_menuPubblicato.titolo || 'Menù')}</strong> &middot; v${_configApp.menu_version} &middot; valido dal ${escapeHtml(_menuPubblicato.valido_dal || '?')} al ${escapeHtml(_menuPubblicato.valido_al || '?')} &middot; ${_menuPubblicato.settimane} settimane, 1&ordf; dal ${escapeHtml(_menuPubblicato.inizio_ciclo || '?')}`;
        if (!_menuBozza) _compilaDateMenu(_menuPubblicato);
    } catch (err) {
        stato.innerHTML = `<span style="color:#f87171;">Impossibile leggere il menù pubblicato: ${escapeHtml(err.message)}</span>`;
    }
}

document.getElementById('cfg-menu-file')?.addEventListener('change', async (e) => {
    const anteprima = document.getElementById('cfg-menu-anteprima');
    _menuBozza = null;
    anteprima.style.display = 'none';
    const file = e.target.files && e.target.files[0];
    if (!file) { _compilaDateMenu(_menuPubblicato); return; }
    try {
        const dati = JSON.parse(await file.text());
        _validaMenu(dati);
        _menuBozza = dati;
        // Date vuote nel file: si tengono quelle del menu' pubblicato
        _compilaDateMenu({
            titolo: dati.titolo || _menuPubblicato?.titolo,
            valido_dal: dati.valido_dal || _menuPubblicato?.valido_dal,
            valido_al: dati.valido_al || _menuPubblicato?.valido_al,
            inizio_ciclo: dati.inizio_ciclo || _menuPubblicato?.inizio_ciclo,
        });
        mostraAnteprimaMenu();
    } catch (err) {
        anteprima.innerHTML = `<span style="color:#f87171;">File non valido: ${escapeHtml(err.message)}</span>`;
        anteprima.style.display = 'block';
    }
});

/** Menu' da pubblicare: il file scelto oppure quello pubblicato, con i campi del form. */
function _menuDaForm() {
    const base = _menuBozza || _menuPubblicato;
    if (!base) throw new Error('scegli prima un file menu_mensa.json');
    const dati = JSON.parse(JSON.stringify(base));
    dati.titolo = document.getElementById('cfg-menu-titolo').value.trim() || dati.titolo || 'Menù';
    dati.valido_dal = document.getElementById('cfg-menu-dal').value;
    dati.valido_al = document.getElementById('cfg-menu-al').value;
    dati.inizio_ciclo = document.getElementById('cfg-menu-ciclo').value;
    if (!dati.valido_dal || !dati.valido_al) throw new Error('imposta il periodo di validità');
    if (dati.valido_al < dati.valido_dal) throw new Error('"valido al" è prima di "valido dal"');
    if (!dati.inizio_ciclo) throw new Error('imposta il lunedì della 1ª settimana');
    if (new Date(dati.inizio_ciclo + 'T00:00:00').getDay() !== 1) throw new Error('la data della 1ª settimana deve essere un lunedì');
    return dati;
}

function mostraAnteprimaMenu() {
    const anteprima = document.getElementById('cfg-menu-anteprima');
    try {
        const dati = _menuDaForm();
        const oggi = new Date();
        const { settimana, giorno } = settimanaMenu(dati, oggi);
        const nomi = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
        const piatti = dati.menu.reduce((t, m) => t + m.giorni.reduce((u, g) => u + ['primi', 'secondi', 'contorni', 'pizza'].reduce((v, c) => v + (g[c] || []).length, 0), 0), 0);
        const inVigore = _isoOggi(oggi) >= dati.valido_dal && _isoOggi(oggi) <= dati.valido_al;
        const elenco = (pasto) => {
            const pagina = dati.menu.find(m => m.settimana === settimana && m.pasto === pasto);
            const g = pagina && pagina.giorni[giorno - 1];
            if (!g) return '<em>non presente</em>';
            return ['primi', 'secondi', 'contorni', 'pizza']
                .filter(c => (g[c] || []).length)
                .map(c => `<div><strong>${c}</strong>: ${g[c].map(p => escapeHtml(p.nome)).join(' · ')}</div>`).join('');
        };
        anteprima.innerHTML = `
            <div style="font-weight:600; margin-bottom:0.4rem;">${escapeHtml(dati.titolo)} &middot; ${dati.settimane} settimane &middot; ${piatti} piatti &middot; ${Object.keys(dati.allergeni || {}).length} allergeni</div>
            <div style="margin-bottom:0.6rem; color:${inVigore ? 'var(--text-muted)' : '#f87171'};">Oggi (${nomi[giorno - 1]}) &egrave; la <strong>settimana ${settimana}</strong>${inVigore ? '' : ' &mdash; ma il menù oggi NON è in vigore'}. Controlla che coincida con il menù esposto in mensa.</div>
            <div style="font-size:0.85rem; margin-bottom:0.5rem;"><span style="color:var(--primary-gold);">Pranzo</span>${elenco('pranzo')}</div>
            <div style="font-size:0.85rem;"><span style="color:var(--primary-gold);">Cena</span>${elenco('cena')}</div>`;
    } catch (err) {
        anteprima.innerHTML = `<span style="color:#f87171;">${escapeHtml(err.message)}</span>`;
    }
    anteprima.style.display = 'block';
}

document.getElementById('cfg-menu-anteprima-btn')?.addEventListener('click', mostraAnteprimaMenu);
['cfg-menu-dal', 'cfg-menu-al', 'cfg-menu-ciclo'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', () => {
        if (_menuBozza || _menuPubblicato) mostraAnteprimaMenu();
    }));

document.getElementById('cfg-menu-pubblica')?.addEventListener('click', async () => {
    let dati;
    try {
        dati = _menuDaForm();
    } catch (err) {
        showToast(err.message, 'error');
        return;
    }
    const versione = ((_configApp && _configApp.menu_version) || 0) + 1;
    const path = `menu_mensa_v${versione}.json.gz`;
    if (!confirm(`Pubblicare "${dati.titolo}" (valido dal ${dati.valido_dal} al ${dati.valido_al}) come v${versione}?`)) return;

    const pulsante = document.getElementById('cfg-menu-pubblica');
    pulsante.disabled = true;
    try {
        const compatto = new TextEncoder().encode(JSON.stringify(dati));
        const sha256 = _hex(await crypto.subtle.digest('SHA-256', compatto));
        const gz = await _gzip(compatto);
        const { error: errUpload } = await _supabase.storage.from(BUCKET_MAPPE).upload(
            path, new Blob([gz], { type: 'application/gzip' }),
            { upsert: true, contentType: 'application/gzip', cacheControl: '31536000' });
        if (errUpload) throw new Error('caricamento: ' + errUpload.message);
        const { error: errConfig } = await _supabase.from('config_app').update({
            menu_version: versione, menu_path: path, menu_sha256: sha256, menu_bytes: gz.byteLength,
        }).eq('id', 1);
        if (errConfig) throw new Error('registrazione: ' + errConfig.message);
        showToast(`Menù pubblicato come v${versione} (${_kb(gz.byteLength)})`);
        _menuBozza = null;
        document.getElementById('cfg-menu-file').value = '';
        document.getElementById('cfg-menu-anteprima').style.display = 'none';
        fetchConfigApp(['menu']);
        aggiornaStatoPanoramica();
    } catch (err) {
        showToast('Errore nella pubblicazione del menù (' + err.message + ')', 'error');
    } finally {
        pulsante.disabled = false;
    }
});

// =====================================================================
// Simulatore del portale (script SQL 09): lezioni del corso finto TEST in portale_test.
// Le Edge Functions le leggono al posto del portale; le modifiche vanno solo ai tester.
// =====================================================================
const SIM_AULE = [
    { aula: 'Aula Simulata 1 [Simulatore]', codice: 'SIM - 1' },
    { aula: 'Aula Simulata 2 [Simulatore]', codice: 'SIM - 2' },
    { aula: 'Aula Simulata 3 [Simulatore]', codice: 'SIM - 3' },
];
const SIM_GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

function _simIso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function _simOra(minuti) {
    return `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(2, '0')}`;
}
function _simMinuti(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
}

async function caricaSimulatore() {
    const elenco = document.getElementById('sim-elenco');
    const { data, error } = await _supabase.from('portale_test').select('*')
        .order('data').order('ora_inizio');
    if (error) {
        elenco.innerHTML = `<span style="color:#f87171;">Errore: ${escapeHtml(error.message)}. Lo script SQL 09 &egrave; stato applicato?</span>`;
        return;
    }
    if (!data.length) {
        elenco.textContent = 'Nessuna lezione: premi "Genera lezioni di prova".';
        return;
    }
    elenco.innerHTML = `<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        <thead><tr style="text-align:left; color:var(--text-muted);"><th>Giorno</th><th>Orario</th><th>Materia</th><th>Aula</th><th>Id</th><th></th></tr></thead>
        <tbody>${data.map(r => {
            const d = new Date(r.data + 'T00:00:00');
            const stile = r.annullato ? 'text-decoration:line-through; opacity:0.6;' : '';
            const id = escapeHtml(r.evento_id);
            return `<tr style="border-top:1px solid rgba(255,255,255,0.06); ${stile}">
                <td style="padding:6px 4px;">${SIM_GIORNI[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}</td>
                <td>${escapeHtml(r.ora_inizio)}-${escapeHtml(r.ora_fine)}</td>
                <td>${escapeHtml(r.insegnamento)}</td>
                <td>${escapeHtml(r.codice_aula || '')}</td>
                <td style="color:var(--text-muted); font-size:0.75rem;">${id}</td>
                <td style="white-space:nowrap; text-align:right;">
                    <button class="btn btn-secondary btn-sm" data-sim="aula" data-id="${id}" title="Aula successiva">Aula</button>
                    <button class="btn btn-secondary btn-sm" data-sim="orario" data-id="${id}" title="Un'ora dopo">+1h</button>
                    <button class="btn btn-secondary btn-sm" data-sim="giorno" data-id="${id}" title="Il giorno dopo">+1g</button>
                    <button class="btn btn-secondary btn-sm" data-sim="annulla" data-id="${id}">${r.annullato ? 'Ripristina' : 'Annulla'}</button>
                    <button class="btn btn-secondary btn-sm" data-sim="rinumera" data-id="${id}" title="Stessa lezione con un nuovo id (come fa a volte il portale)">Nuovo id</button>
                </td></tr>`;
        }).join('')}</tbody></table></div>`;
    elenco.querySelectorAll('[data-sim]').forEach(b => b.addEventListener('click', () =>
        modificaLezioneTest(b.dataset.sim, b.dataset.id, data.find(r => r.evento_id === b.dataset.id))));
}

async function modificaLezioneTest(azione, id, r) {
    if (!r) return;
    let errore = null;
    const ora = new Date().toISOString();
    if (azione === 'rinumera') {
        const nuovo = { ...r, evento_id: `T${Date.now().toString(36)}`, aggiornato_il: ora };
        ({ error: errore } = await _supabase.from('portale_test').insert(nuovo));
        if (!errore) ({ error: errore } = await _supabase.from('portale_test').delete().eq('evento_id', id));
    } else {
        const modifica = { aggiornato_il: ora };
        if (azione === 'aula') {
            const i = SIM_AULE.findIndex(a => a.codice === r.codice_aula);
            const a = SIM_AULE[(i + 1) % SIM_AULE.length];
            modifica.aula = a.aula; modifica.codice_aula = a.codice;
        } else if (azione === 'orario') {
            modifica.ora_inizio = _simOra(Math.min(_simMinuti(r.ora_inizio) + 60, 22 * 60));
            modifica.ora_fine = _simOra(Math.min(_simMinuti(r.ora_fine) + 60, 23 * 60));
        } else if (azione === 'giorno') {
            const d = new Date(r.data + 'T00:00:00'); d.setDate(d.getDate() + 1);
            modifica.data = _simIso(d);
        } else if (azione === 'annulla') {
            modifica.annullato = !r.annullato;
        }
        ({ error: errore } = await _supabase.from('portale_test').update(modifica).eq('evento_id', id));
    }
    if (errore) showToast('Errore: ' + errore.message, 'error');
    caricaSimulatore();
}

document.getElementById('sim-genera')?.addEventListener('click', async () => {
    // Questa settimana e la prossima, dal lunedi' al venerdi': due lezioni al giorno
    const oggi = new Date();
    const lunedi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - ((oggi.getDay() + 6) % 7));
    const righe = [];
    for (let s = 0; s < 2; s++) {
        for (let g = 0; g < 5; g++) {
            const d = new Date(lunedi); d.setDate(lunedi.getDate() + s * 7 + g);
            const iso = _simIso(d);
            righe.push(
                { evento_id: `T${iso.replace(/-/g, '')}a`, data: iso, ora_inizio: '09:00', ora_fine: '11:00',
                  insegnamento: 'ANALISI DI PROVA', docente: 'Docente Simulato', aula: SIM_AULE[0].aula, codice_aula: SIM_AULE[0].codice, annullato: false },
                { evento_id: `T${iso.replace(/-/g, '')}b`, data: iso, ora_inizio: '15:00', ora_fine: '17:00',
                  insegnamento: 'FISICA DI PROVA', docente: 'Docente Simulato', aula: SIM_AULE[1].aula, codice_aula: SIM_AULE[1].codice, annullato: false },
            );
        }
    }
    const { error } = await _supabase.from('portale_test').upsert(righe, { onConflict: 'evento_id' });
    if (error) showToast('Errore: ' + error.message, 'error');
    else showToast(`${righe.length} lezioni di prova pronte`);
    caricaSimulatore();
});

document.getElementById('sim-svuota')?.addEventListener('click', async () => {
    if (!confirm('Eliminare tutte le lezioni del corso TEST?')) return;
    const { error } = await _supabase.from('portale_test').delete().neq('evento_id', '');
    if (error) showToast('Errore: ' + error.message, 'error');
    caricaSimulatore();
});

document.querySelectorAll('[data-sim-funzione]').forEach(b => b.addEventListener('click', async () => {
    const funzione = b.dataset.simFunzione;
    const esito = document.getElementById('sim-esito');
    b.disabled = true;
    esito.style.display = 'block';
    esito.textContent = `${funzione}: in corso...`;
    try {
        const { data, error } = await _supabase.functions.invoke(funzione, { body: { solo_test: true } });
        if (error) {
            let dettaglio = error.message;
            try { dettaglio += ' ' + JSON.stringify(await error.context.json()); } catch (_) { /* nessun corpo */ }
            throw new Error(dettaglio);
        }
        esito.textContent = `${funzione}:\n${JSON.stringify(data, null, 2)}`;
    } catch (err) {
        esito.textContent = `${funzione}: errore\n${err.message}`;
    } finally {
        b.disabled = false;
    }
}));

checkSession();

// =====================================================================
// Schermata Novità (tabella novita_app, script SQL 11)
// Una riga per versione; "schede" è l'array mostrato dall'app: le schede
// "principale" sono una pagina ciascuna, le "riepilogo" vanno nell'ultima.
// =====================================================================
// Stesse chiavi della mappa SchedaNovita.icone nell'app (lib/services/novita_service.dart)
const NOVITA_ICONE = ['restaurant', 'menu_book', 'directions_bus', 'map', 'explore', 'place', 'notifications', 'campaign', 'alarm', 'event_busy', 'calendar_month', 'calendar_view_day', 'dashboard_customize', 'star', 'school', 'meeting_room', 'local_library', 'search', 'contacts', 'local_hospital', 'phonelink_setup', 'ios_share', 'widgets', 'settings', 'palette', 'dark_mode', 'language', 'wifi', 'speed', 'bolt', 'lock', 'build', 'auto_awesome', 'new_releases', 'celebration'];
let _novSchede = [];
let _novPagina = 0;

function _novVersione() {
    return document.getElementById('nov-versione').value.trim().replace(/^v/i, '');
}

function _novNuovaScheda(tipo) {
    return { tipo, icona: tipo === 'riepilogo' ? 'build' : 'auto_awesome', titolo: '', testo: '', titolo_en: '', testo_en: '', etichette: [], etichette_en: [] };
}

function _novPagine() {
    const principali = _novSchede.filter(s => s.tipo !== 'riepilogo');
    const riepilogo = _novSchede.filter(s => s.tipo === 'riepilogo');
    const pagine = principali.map(s => ({ tipo: 'principale', scheda: s }));
    if (riepilogo.length) pagine.push({ tipo: 'riepilogo', voci: riepilogo });
    return pagine;
}

async function caricaElencoNovita() {
    const { data, error } = await _supabase.from('novita_app').select('versione, attiva, aggiornato_il').order('versione', { ascending: false });
    const stato = document.getElementById('nov-stato');
    if (error) {
        stato.innerHTML = `<span style="color:#f87171;">Errore: ${escapeHtml(error.message)}. Lo script SQL 11 &egrave; stato applicato?</span>`;
        return;
    }
    document.getElementById('nov-versioni').innerHTML = (data || []).map(r => `<option value="${escapeHtml(r.versione)}">`).join('');
    stato.innerHTML = data && data.length
        ? 'Versioni salvate: ' + data.map(r => `<strong style="color:${r.attiva ? 'var(--primary-gold)' : 'var(--text-muted)'};">${escapeHtml(r.versione)}</strong>${r.attiva ? '' : ' (spenta)'}`).join(' &middot; ')
        : 'Nessuna versione salvata.';
    // Al primo ingresso apre la versione più recente
    if (!_novVersione() && data && data.length) {
        document.getElementById('nov-versione').value = data[0].versione;
        caricaNovita();
    } else if (!_novVersione()) {
        renderNovita();
    }
}

async function caricaNovita() {
    const versione = _novVersione();
    if (!versione) return;
    const { data, error } = await _supabase.from('novita_app').select('*').eq('versione', versione).maybeSingle();
    if (error) { showToast('Errore: ' + error.message, 'error'); return; }
    if (data) {
        _novSchede = (Array.isArray(data.schede) ? data.schede : []).map(s => ({ ..._novNuovaScheda(s.tipo === 'riepilogo' ? 'riepilogo' : 'principale'), ...s }));
        document.getElementById('nov-attiva').checked = !!data.attiva;
        showToast(`Novità ${versione} caricate`);
    } else {
        _novSchede = [];
        document.getElementById('nov-attiva').checked = true;
        showToast(`Nessuna novità per la ${versione}: parti da zero`);
    }
    _novPagina = 0;
    renderNovita();
}

function renderNovita() {
    const box = document.getElementById('nov-schede');
    if (!box) return;
    if (!_novSchede.length) {
        box.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Nessuna scheda. Aggiungi una pagina o una voce del riepilogo.</p>';
    } else {
        const opzioni = (sel) => NOVITA_ICONE.map(n => `<option value="${n}" ${n === sel ? 'selected' : ''}>${n}</option>`).join('');
        box.innerHTML = _novSchede.map((s, i) => {
            const riep = s.tipo === 'riepilogo';
            const campo = (k, etichetta, area) => area
                ? `<div class="form-group"><label style="font-size:0.8rem;font-weight:600;">${etichetta}</label><textarea class="form-control" rows="2" data-i="${i}" data-k="${k}">${escapeHtml(s[k] || '')}</textarea></div>`
                : `<div class="form-group"><label style="font-size:0.8rem;font-weight:600;">${etichetta}</label><input type="text" class="form-control" data-i="${i}" data-k="${k}" value="${escapeHtml(Array.isArray(s[k]) ? s[k].join(', ') : (s[k] || ''))}"></div>`;
            return `<div class="nov-scheda">
                <div class="nov-scheda-top">
                    <span class="nov-tipo ${riep ? 'riep' : ''}">${riep ? 'Voce riepilogo' : 'Pagina'}</span>
                    <span class="nov-icona-sel"><span class="nov-ms">${escapeHtml(s.icona)}</span><select class="form-control" data-i="${i}" data-k="icona">${opzioni(s.icona)}</select></span>
                    <span class="nov-azioni">
                        <button type="button" title="Su" data-azione="su" data-i="${i}" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
                        <button type="button" title="Gi&ugrave;" data-azione="giu" data-i="${i}" ${i === _novSchede.length - 1 ? 'disabled' : ''}>&darr;</button>
                        <button type="button" title="Elimina" class="del" data-azione="elimina" data-i="${i}">&times;</button>
                    </span>
                </div>
                ${campo('titolo', 'Titolo')}
                ${campo('testo', riep ? 'Sottotitolo' : 'Testo', !riep)}
                ${riep ? '' : campo('etichette', 'Etichette attorno all\'icona (max 3, separate da virgola)')}
                <details>
                    <summary>English${s.titolo_en ? '' : ' (vuoto: usa l\'italiano)'}</summary>
                    ${campo('titolo_en', 'Title')}
                    ${campo('testo_en', riep ? 'Subtitle' : 'Text', !riep)}
                    ${riep ? '' : campo('etichette_en', 'Labels (max 3, comma separated)')}
                </details>
            </div>`;
        }).join('');
    }
    renderAnteprimaNovita();
}

function renderAnteprimaNovita() {
    const box = document.getElementById('nov-anteprima');
    if (!box) return;
    const inglese = document.getElementById('nov-inglese').checked;
    const t = (s, k) => (inglese && (Array.isArray(s[k + '_en']) ? s[k + '_en'].length : s[k + '_en'])) ? s[k + '_en'] : s[k];
    const pagine = _novPagine();
    _novPagina = Math.max(0, Math.min(_novPagina, pagine.length - 1));
    const ultima = _novPagina >= pagine.length - 1;
    const versione = escapeHtml(_novVersione() || '?');
    let corpo;
    if (!pagine.length) {
        corpo = '<div class="vuota">L\'anteprima compare qui.</div>';
    } else {
        const p = pagine[_novPagina];
        if (p.tipo === 'principale') {
            const s = p.scheda;
            const pos = ['top:12px;left:-22px', 'bottom:16px;right:-26px', 'top:76px;right:-30px'];
            const etichette = (t(s, 'etichette') || []).slice(0, 3);
            corpo = `<div class="illu"><span class="nov-ms">${escapeHtml(s.icona)}</span>${etichette.map((e, i) => `<div class="chip" style="${pos[i]}">${escapeHtml(e)}</div>`).join('')}</div>
                <div class="tit">${escapeHtml(t(s, 'titolo') || '(titolo)')}</div>
                ${t(s, 'testo') ? `<div class="txt">${escapeHtml(t(s, 'testo'))}</div>` : ''}`;
        } else {
            corpo = `<div style="margin-bottom:auto;"><div class="riep-tit">${inglese ? 'And also…' : 'E inoltre…'}</div>${p.voci.map(v => `<div class="r"><div class="ic"><span class="nov-ms">${escapeHtml(v.icona)}</span></div><div><b>${escapeHtml(t(v, 'titolo') || '(titolo)')}</b>${t(v, 'testo') ? `<small>${escapeHtml(t(v, 'testo'))}</small>` : ''}</div></div>`).join('')}</div>`;
        }
    }
    box.innerHTML = `<div class="nov-tel">
        <div class="top"><span class="ver">${inglese ? 'NEW IN' : 'NOVITÀ'} ${versione}</span><span class="salta" style="visibility:${ultima ? 'hidden' : 'visible'}">${inglese ? 'Skip' : 'Salta'}</span></div>
        <div class="pag">${corpo}</div>
        ${pagine.length > 1 ? `<div class="dots">${pagine.map((_, i) => `<i class="${i === _novPagina ? 'on' : ''}" data-pagina="${i}"></i>`).join('')}</div>` : '<div style="height:14px"></div>'}
        <div class="btn-nov" id="nov-btn-anteprima">${ultima ? (inglese ? 'Get started' : 'Inizia') : `${inglese ? 'Next' : 'Avanti'}<span class="nov-ms" style="font-size:18px">arrow_forward</span>`}</div>
    </div>`;
}

// Modifica dei campi: aggiorna lo stato e solo l'anteprima (l'editor resta com'è, il cursore non salta)
document.getElementById('nov-schede')?.addEventListener('input', (e) => {
    const el = e.target;
    const i = Number(el.dataset.i), k = el.dataset.k;
    if (!k || !_novSchede[i]) return;
    _novSchede[i][k] = k.startsWith('etichette')
        ? el.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 3)
        : el.value;
    if (k === 'icona') el.parentElement.querySelector('.nov-ms').textContent = el.value;
    // Mostra in anteprima la pagina della scheda che si sta modificando
    const s = _novSchede[i];
    const pagine = _novPagine();
    const idx = s.tipo === 'riepilogo' ? pagine.length - 1 : pagine.findIndex(p => p.scheda === s);
    if (idx >= 0) _novPagina = idx;
    renderAnteprimaNovita();
});
document.getElementById('nov-schede')?.addEventListener('change', (e) => {
    if (e.target.dataset.k === 'icona') e.target.dispatchEvent(new Event('input', { bubbles: true }));
});
document.getElementById('nov-schede')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-azione]');
    if (!b) return;
    const i = Number(b.dataset.i);
    if (b.dataset.azione === 'elimina') {
        _novSchede.splice(i, 1);
    } else {
        const j = b.dataset.azione === 'su' ? i - 1 : i + 1;
        if (j < 0 || j >= _novSchede.length) return;
        [_novSchede[i], _novSchede[j]] = [_novSchede[j], _novSchede[i]];
    }
    renderNovita();
});
document.getElementById('nov-aggiungi-pagina')?.addEventListener('click', () => {
    // Le pagine vanno prima delle voci del riepilogo
    const primoRiep = _novSchede.findIndex(s => s.tipo === 'riepilogo');
    const pos = primoRiep < 0 ? _novSchede.length : primoRiep;
    _novSchede.splice(pos, 0, _novNuovaScheda('principale'));
    _novPagina = _novSchede.filter(s => s.tipo !== 'riepilogo').length - 1;
    renderNovita();
});
document.getElementById('nov-aggiungi-voce')?.addEventListener('click', () => {
    _novSchede.push(_novNuovaScheda('riepilogo'));
    _novPagina = _novPagine().length - 1;
    renderNovita();
});
document.getElementById('nov-carica')?.addEventListener('click', caricaNovita);
document.getElementById('nov-versione')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); caricaNovita(); }
});
document.getElementById('nov-versione')?.addEventListener('input', renderAnteprimaNovita);
document.getElementById('nov-inglese')?.addEventListener('change', renderAnteprimaNovita);
document.getElementById('nov-prec')?.addEventListener('click', () => { _novPagina--; renderAnteprimaNovita(); });
document.getElementById('nov-succ')?.addEventListener('click', () => { _novPagina++; renderAnteprimaNovita(); });
document.getElementById('nov-anteprima')?.addEventListener('click', (e) => {
    if (e.target.dataset.pagina !== undefined) { _novPagina = Number(e.target.dataset.pagina); renderAnteprimaNovita(); }
    else if (e.target.closest('#nov-btn-anteprima')) {
        _novPagina = _novPagina >= _novPagine().length - 1 ? 0 : _novPagina + 1;
        renderAnteprimaNovita();
    }
});

document.getElementById('nov-salva')?.addEventListener('click', async () => {
    const versione = _novVersione();
    if (!/^\d+\.\d+\.\d+$/.test(versione)) {
        showToast('Scrivi la versione nel formato 2.2.0', 'error');
        return;
    }
    const lista = (v) => (Array.isArray(v) ? v : []).map(x => String(x).trim()).filter(Boolean).slice(0, 3);
    const schede = _novSchede.map(s => {
        const pulita = { tipo: s.tipo === 'riepilogo' ? 'riepilogo' : 'principale', icona: s.icona };
        for (const k of ['titolo', 'testo', 'titolo_en', 'testo_en']) {
            const v = (s[k] || '').trim();
            if (v) pulita[k] = v;
        }
        if (pulita.tipo === 'principale') {
            if (lista(s.etichette).length) pulita.etichette = lista(s.etichette);
            if (lista(s.etichette_en).length) pulita.etichette_en = lista(s.etichette_en);
        }
        return pulita;
    });
    if (schede.some(s => !s.titolo)) {
        showToast('Ogni scheda deve avere un titolo', 'error');
        return;
    }
    const attiva = document.getElementById('nov-attiva').checked;
    const { error } = await _supabase.from('novita_app').upsert({ versione, attiva, schede }, { onConflict: 'versione' });
    if (error) {
        showToast('Errore nel salvataggio: ' + error.message, 'error');
    } else {
        showToast(attiva ? `Novità ${versione} salvate e attive` : `Novità ${versione} salvate (spente)`);
        caricaElencoNovita();
        aggiornaStatoPanoramica();
    }
});

document.getElementById('nov-elimina')?.addEventListener('click', async () => {
    const versione = _novVersione();
    if (!versione) return;
    if (!confirm(`Eliminare le novità della ${versione}?`)) return;
    const { error } = await _supabase.from('novita_app').delete().eq('versione', versione);
    if (error) {
        showToast('Errore: ' + error.message, 'error');
    } else {
        showToast(`Novità ${versione} eliminate`);
        _novSchede = [];
        renderNovita();
        caricaElencoNovita();
        aggiornaStatoPanoramica();
    }
});

// =====================================================================
// Panoramica (pagina iniziale): quattro numeri, stato dell'app, utenti degli
// ultimi 14 giorni, checklist del prossimo rilascio e ultimi bug.
// Ogni blocco si carica per conto suo con uno scheletro; se una lettura fallisce,
// l'errore compare solo nei blocchi che ne hanno bisogno.
// I dati arrivano dalle stesse funzioni delle altre sezioni: leggiStatisticheUtenti,
// calcolaAdozioneVersioni (con scaricaTutteLeRighe), leggiMenuPubblicato.
// Due gruppi: "numeri" (in alto, grafico, bug) e "stato" (riquadri e checklist, che
// accendono anche i pallini gialli del menu e si rileggono dopo i salvataggi).
// =====================================================================

// Ogni aggiornamento ha un numero: i risultati di uno superato da uno più recente si scartano
const _panGenerazione = { numeri: 0, stato: 0 };
let _panTimerStato = null;

const PAN_INIZIALI_GIORNI = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

// Riquadri di stato: nome, icona e sezione del menu a cui portano (per i pallini gialli)
const PAN_RIQUADRI = {
    mappe:     { nome: 'Mappe',               icona: 'map',                  sezione: 'mappe' },
    menu:      { nome: 'Menù mensa',          icona: 'restaurant',           sezione: 'menu' },
    messaggio: { nome: "Messaggio all'avvio", icona: 'campaign',             sezione: 'messaggio' },
    novita:    { nome: 'Novità',              icona: 'auto_awesome',         sezione: 'novita' },
    push:      { nome: 'Push inviate oggi',   icona: 'notifications_active', sezione: 'notifiche' },
    orari:     { nome: 'Controllo orari',     icona: 'sync',                 sezione: 'notifiche' },
};

const _panVersione = v => String(v || '').trim().replace(/^v/i, '');
const _panNumero = n => Number(n || 0).toLocaleString('it-IT');
const _panPercento = (parte, totale) => (totale > 0 ? Math.round((parte / totale) * 100) : null);

// Data ISO di oggi spostata di [scarto] giorni
function _panGiorno(scarto) {
    const d = new Date();
    d.setDate(d.getDate() + scarto);
    return _isoOggi(d);
}

// Giorni da una data ISO a un'altra (negativo se b viene prima di a)
function _panGiorniTra(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
}

function _panDataLunga(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
}

// "adesso", "5 minuti fa", "2 ore fa" (meno di 24 ore), poi a giorni di calendario:
// "ieri", "3 giorni fa"; oltre un mese la data
function tempoTrascorso(quando) {
    const d = new Date(quando);
    const minuti = Math.floor((Date.now() - d.getTime()) / 60000);
    if (minuti < 1) return 'adesso';
    if (minuti < 60) return minuti === 1 ? '1 minuto fa' : `${minuti} minuti fa`;
    const ore = Math.floor(minuti / 60);
    if (ore < 24) return ore === 1 ? '1 ora fa' : `${ore} ore fa`;
    const giorni = _panGiorniTra(_isoOggi(d), _isoOggi());
    if (giorni <= 1) return 'ieri';
    if (giorni < 30) return `${giorni} giorni fa`;
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Versione più recente in updates (anche se non ancora segnata come ultima)
function _panPiuRecente(versioni) {
    return [...versioni].sort((a, b) =>
        semverCompare(a.version, b.version) || String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null;
}

/**
 * Push automatiche di oggi: tabelle invii_automatici (una riga per modifica d'orario e
 * dispositivo, scritta prima dell'invio: esito resta vuoto) e promemoria_inviati (esito
 * "ok" o "errore"). Senza una policy di lettura per gli utenti autenticati PostgREST
 * risponde "permission denied": in quel caso { disponibile: false }.
 */
async function leggiPushOggi() {
    const mezzanotte = new Date();
    mezzanotte.setHours(0, 0, 0, 0);
    const da = mezzanotte.toISOString();
    const conta = (tabella, colonna) => _supabase.from(tabella).select(colonna, { count: 'exact', head: true }).gte('inviato_il', da);
    const risposte = await Promise.all([
        conta('invii_automatici', 'modifica_id'),
        conta('promemoria_inviati', 'evento_id'),
        conta('promemoria_inviati', 'evento_id').eq('esito', 'errore'),
        _supabase.from('invii_automatici').select('inviato_il, esito').order('inviato_il', { ascending: false }).limit(1),
    ]);
    const conErrore = risposte.filter(r => r.error);
    if (conErrore.length) {
        // Le richieste di solo conteggio non hanno corpo: il permesso negato si riconosce dallo stato HTTP
        const negato = conErrore.some(r => r.status === 401 || r.status === 403 || r.error.code === '42501' || /permission denied/i.test(r.error.message || ''));
        if (negato) return { disponibile: false };
        throw new Error(conErrore.map(r => r.error.message).find(Boolean) || 'lettura non riuscita');
    }
    const [modifiche, promemoria, errori, ultimo] = risposte;
    return {
        disponibile: true,
        modifiche: modifiche.count || 0,
        promemoria: promemoria.count || 0,
        erroriPromemoria: errori.count || 0,
        ultimo: (ultimo.data || [])[0] || null,
    };
}

// Letture usate da più blocchi: ognuna parte una volta sola per aggiornamento, e solo se serve
function _panLetture() {
    const fatte = {};
    const una = (nome, leggi) => () => (fatte[nome] = fatte[nome] || leggi());
    const righe = async (query) => {
        const { data, error } = await query;
        if (error) throw new Error(error.message || 'lettura non riuscita');
        return data;
    };
    const l = {
        utenti: una('utenti', () => leggiStatisticheUtenti(14)),
        adozione: una('adozione', () => calcolaAdozioneVersioni({ dal: _panGiorno(-6) }, 'all')),
        versioni: una('versioni', () => righe(_supabase.from('updates').select('version, changes, download_url, is_latest, created_at'))),
        config: una('config', () => righe(_supabase.from('config_app').select('*').eq('id', 1).single())),
        novita: una('novita', () => righe(_supabase.from('novita_app').select('versione, attiva, schede'))),
        bug: una('bug', () => righe(_supabase.from('bugs').select('id, title, status, created_at').order('created_at', { ascending: false }))),
        push: una('push', () => leggiPushOggi()),
    };
    l.menu = una('menu', () => l.config().then(c => leggiMenuPubblicato(c)));
    return l;
}

const _panScheletroRiga = (classe = '') => `<span class="pan-sch pan-sch-r ${classe}"></span>`;
const PAN_SCHELETRO_KPI = '<span class="pan-sch pan-sch-v"></span>' + _panScheletroRiga('corta');

function _panErrore(err) {
    const testo = err && err.message ? err.message : String(err);
    return `<div class="pan-errore"><span class="admin-ms">error</span><span>Non disponibile: ${escapeHtml(testo)}</span></div>`;
}

const _panKpiHtml = (valore, dettaglio, barra = null) =>
    `<div class="pan-k-v">${valore}</div><div class="pan-k-d">${dettaglio}</div>` +
    (barra === null ? '' : `<div class="pan-barra"><i style="width:${barra}%"></i></div>`);

/**
 * Carica un blocco: scheletro subito, poi il contenuto oppure l'errore, solo lì.
 * lavoro() restituisce l'HTML, oppure { html, poi } con poi() eseguita dopo averlo scritto.
 */
async function _panBlocco(el, gruppo, gen, scheletro, lavoro, erroreHtml = _panErrore) {
    if (!el) return;
    el.setAttribute('aria-busy', 'true');
    el.innerHTML = scheletro;
    try {
        const r = await lavoro();
        if (gen !== _panGenerazione[gruppo]) return;
        el.innerHTML = typeof r === 'string' ? r : r.html;
        if (r && r.poi) r.poi();
    } catch (err) {
        if (gen !== _panGenerazione[gruppo]) return;
        console.error('Panoramica:', err);
        el.innerHTML = erroreHtml(err);
    } finally {
        if (gen === _panGenerazione[gruppo]) el.removeAttribute('aria-busy');
    }
}

// --- Gruppo "numeri": quattro numeri in alto, grafico dei 14 giorni, ultimi bug ---
function _panCaricaNumeri(l) {
    const gen = ++_panGenerazione.numeri;
    const corpo = id => document.querySelector(`#${id} .pan-k-corpo`);
    const erroreKpi = err => '<div class="pan-k-v">—</div>' + _panErrore(err);

    return Promise.all([
        // 1. Utenti oggi e differenza con ieri
        _panBlocco(corpo('pan-k-oggi'), 'numeri', gen, PAN_SCHELETRO_KPI, async () => {
            const record = await l.utenti();
            const valore = giorno => Number((record.find(r => r.data === giorno) || {}).utenti_unici_totali) || 0;
            const oggi = valore(_panGiorno(0));
            const ieri = valore(_panGiorno(-1));
            let dettaglio = 'nessun dato per ieri';
            if (ieri > 0) {
                const diff = Math.round(((oggi - ieri) / ieri) * 100);
                if (diff > 0) dettaglio = `<span class="pan-su"><span aria-hidden="true">▲</span><span class="admin-sr">più</span> ${diff}%</span> rispetto a ieri`;
                else if (diff < 0) dettaglio = `<span class="pan-giu"><span aria-hidden="true">▼</span><span class="admin-sr">meno</span> ${-diff}%</span> rispetto a ieri`;
                else dettaglio = 'come ieri';
            }
            return _panKpiHtml(_panNumero(oggi), dettaglio);
        }, erroreKpi),

        // 2. Utenti diversi negli ultimi 7 giorni (oggi compreso) e media giornaliera
        _panBlocco(corpo('pan-k-7g'), 'numeri', gen, PAN_SCHELETRO_KPI, async () => {
            const a = await l.adozione();
            let media = 'media non disponibile';
            try {
                const finestra = (await l.utenti()).filter(r => r.data >= _panGiorno(-6));
                if (finestra.length) {
                    const somma = finestra.reduce((s, r) => s + (Number(r.utenti_unici_totali) || 0), 0);
                    media = `media ${_panNumero(Math.round(somma / finestra.length))} al giorno`;
                }
            } catch (_) { /* il numero principale resta valido anche senza la media */ }
            return _panKpiHtml(_panNumero(a.totale), media);
        }, erroreKpi),

        // 3. Utenti degli ultimi 7 giorni sulla versione segnata come ultima in updates
        _panBlocco(corpo('pan-k-versione'), 'numeri', gen, PAN_SCHELETRO_KPI, async () => {
            const [a, versioni] = await Promise.all([l.adozione(), l.versioni()]);
            const ultima = versioni.find(v => v.is_latest);
            if (!ultima) return _panKpiHtml('—', 'nessuna versione segnata come ultima');
            const nome = _panVersione(ultima.version);
            const voce = a.versioni.find(v => _panVersione(v.version) === nome) || { total: 0, apk: 0, pwa: 0, web: 0 };
            const pct = _panPercento(voce.total, a.totale);
            // Come in Statistiche: "PWA" comprende anche il sito aperto nel browser
            const pwa = _panPercento((voce.pwa || 0) + (voce.web || 0), a.pwa + a.web);
            const apk = _panPercento(voce.apk || 0, a.apk);
            const fmt = p => (p === null ? '–' : `${p}%`);
            return _panKpiHtml(pct === null ? '—' : `${pct}%`,
                `v${escapeHtml(nome)} · <span title="PWA e sito nel browser">PWA ${fmt(pwa)}</span> · APK ${fmt(apk)}`, pct || 0);
        }, erroreKpi),

        // 4. Bug aperti, in lavorazione e risolti
        _panBlocco(corpo('pan-k-bug'), 'numeri', gen, PAN_SCHELETRO_KPI, async () => {
            const bug = await l.bug();
            const conta = stato => bug.filter(b => b.status === stato).length;
            return _panKpiHtml(_panNumero(conta('open')), `${_panNumero(conta('in_progress'))} in lavorazione · ${_panNumero(conta('resolved'))} risolti`);
        }, erroreKpi),

        // Grafico: utenti unici al giorno negli ultimi 14 giorni, oggi in oro
        _panBlocco(document.getElementById('pan-grafico'), 'numeri', gen,
            `<div class="pan-barre">${'<i class="pan-sch"></i>'.repeat(14)}</div>`, async () => {
                const perGiorno = new Map((await l.utenti()).map(r => [r.data, Number(r.utenti_unici_totali) || 0]));
                const giorni = Array.from({ length: 14 }, (_, i) => _panGiorno(i - 13));
                const valori = giorni.map(g => perGiorno.get(g) || 0);
                if (!valori.some(Boolean)) return '<div class="pan-vuoto">Nessun accesso registrato negli ultimi 14 giorni.</div>';
                const massimo = Math.max(...valori);
                const barre = giorni.map((g, i) => {
                    const etichetta = new Date(g + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
                    const altezza = Math.max(2, Math.round((valori[i] / massimo) * 100));
                    return `<i class="${i === 13 ? 'oggi' : ''}" style="height:${altezza}%" title="${etichetta}: ${_panNumero(valori[i])} utenti"></i>`;
                }).join('');
                const iniziali = giorni.map((g, i) =>
                    `<span class="${i === 13 ? 'oggi' : ''}">${PAN_INIZIALI_GIORNI[new Date(g + 'T00:00:00').getDay()]}</span>`).join('');
                const descrizione = `Utenti unici al giorno negli ultimi 14 giorni: oggi ${_panNumero(valori[13])}, massimo ${_panNumero(massimo)}`;
                return `<div class="pan-barre" role="img" aria-label="${descrizione}">${barre}</div><div class="pan-giorni" aria-hidden="true">${iniziali}</div>`;
            }),

        // Ultimi 3 bug non risolti, dal più recente
        _panBlocco(document.getElementById('pan-bug'), 'numeri', gen,
            `<div class="pan-bug">${_panScheletroRiga()}</div>`.repeat(3), async () => {
                const aperti = (await l.bug()).filter(b => b.status !== 'resolved').slice(0, 3);
                if (!aperti.length) return '<div class="pan-vuoto">Nessun bug da risolvere.</div>';
                const etichette = { open: ['ap', 'APERTO'], in_progress: ['lav', 'IN CORSO'] };
                return aperti.map(b => {
                    const [classe, testo] = etichette[b.status] || ['ap', String(b.status || '').toUpperCase()];
                    return `<a class="pan-bug" href="#bug"><span class="pan-tag ${classe}">${escapeHtml(testo)}</span><span class="pan-bug-t">${escapeHtml(b.title)}</span><span class="pan-q">${b.created_at ? tempoTrascorso(b.created_at) : ''}</span></a>`;
                }).join('');
            }),
    ]);
}

// --- Gruppo "stato": riquadri dello stato dell'app, checklist e pallini del menu ---

// Contenuto di ogni riquadro: { tono: ok|att|ko|neu, titolo, testo (HTML già sicuro), motivo (per il pallino) }
function _panLavoriStato(l) {
    const oggi = _isoOggi();
    return {
        mappe: async () => {
            const c = await l.config();
            const versione = escapeHtml(String(c.mappa_version ?? '-'));
            if (!(c.mappa_path || '').trim()) return { tono: 'neu', titolo: 'Mappe: nessun file pubblicato', testo: `Le app usano le mappe incluse (v${versione})` };
            const dettagli = [c.mappa_bytes ? _kb(c.mappa_bytes) : '', c.aggiornato_il ? `aggiornata ${tempoTrascorso(c.aggiornato_il)}` : ''];
            return { tono: 'ok', titolo: `Mappe v${versione} pubblicate`, testo: dettagli.filter(Boolean).join(' · ') };
        },
        menu: async () => {
            const m = await l.menu();
            if (!m) return { tono: 'ko', titolo: 'Menù mensa non pubblicato', testo: 'Pubblicalo dalla sezione Menù mensa', motivo: 'Menù mensa non pubblicato' };
            const nome = escapeHtml(m.titolo || 'Menù');
            if (!m.valido_al) return { tono: 'ko', titolo: 'Menù mensa senza data di scadenza', testo: nome, motivo: 'Menù mensa senza date di validità' };
            const fine = _panDataLunga(m.valido_al);
            const restano = _panGiorniTra(oggi, m.valido_al);
            if (restano < 0) return { tono: 'ko', titolo: 'Menù mensa scaduto', testo: `${nome}, valido fino al ${fine}`, motivo: `Menù mensa scaduto il ${fine}` };
            if (m.valido_dal && m.valido_dal > oggi) {
                return { tono: 'att', titolo: `Menù mensa in vigore dal ${_panDataLunga(m.valido_dal)}`, testo: `${nome}, oggi non è ancora valido`, motivo: 'Il menù pubblicato oggi non è ancora in vigore' };
            }
            if (restano <= 7) {
                const quando = restano === 0 ? 'scade oggi' : (restano === 1 ? 'scade domani' : `scade tra ${restano} giorni`);
                return { tono: 'att', titolo: `Menù mensa: ${quando}`, testo: `${nome}, valido fino al ${fine}`, motivo: `Menù mensa: ${quando}` };
            }
            return { tono: 'ok', titolo: `Menù mensa valido fino al ${fine}`, testo: nome };
        },
        messaggio: async () => {
            const c = await l.config();
            const titolo = (c.titolo_messaggio || '').trim();
            if (c.messaggio_attivo) {
                const dettagli = [titolo ? `"${escapeHtml(titolo)}"` : '', c.solo_vecchi_utenti ? "solo a chi usava già l'app" : ''];
                return { tono: 'ok', titolo: "Messaggio all'avvio acceso", testo: dettagli.filter(Boolean).join(' · ') };
            }
            return { tono: 'neu', titolo: "Messaggio all'avvio spento", testo: titolo ? `Ultimo: "${escapeHtml(titolo)}"` : '' };
        },
        novita: async () => {
            const [versioni, novita] = await Promise.all([l.versioni(), l.novita()]);
            const ultima = versioni.find(v => v.is_latest);
            if (!ultima) return { tono: 'neu', titolo: 'Novità: nessuna versione segnata come ultima', testo: 'Si controlla la versione "Ultima" di Versioni e patch note' };
            const nome = _panVersione(ultima.version);
            const n = novita.find(r => _panVersione(r.versione) === nome);
            const schede = n && Array.isArray(n.schede) ? n.schede.length : 0;
            const v = escapeHtml(nome);
            if (!n) return { tono: 'ko', titolo: `Novità ${v} mancanti`, testo: 'Chi aggiorna a questa versione non vede la schermata delle novità', motivo: `Novità ${nome} mancanti` };
            if (!n.attiva) return { tono: 'ko', titolo: `Novità ${v} spente`, testo: 'Vanno attivate dalla sezione Novità', motivo: `Novità ${nome} spente` };
            if (!schede) return { tono: 'ko', titolo: `Novità ${v} senza schede`, testo: 'Aggiungi almeno una pagina', motivo: `Novità ${nome} senza schede` };
            return { tono: 'ok', titolo: `Novità ${v} attive`, testo: `${schede} ${schede === 1 ? 'scheda' : 'schede'}` };
        },
        push: async () => {
            const p = await l.push();
            if (!p.disponibile) {
                return { tono: 'neu', icona: 'notifications_off', titolo: 'Push inviate oggi: non disponibile', testo: 'Il pannello non ha il permesso di leggere invii_automatici e promemoria_inviati' };
            }
            const totale = p.modifiche + p.promemoria;
            const testo = `${_panNumero(p.modifiche)} per modifiche d'orario · ${_panNumero(p.promemoria)} promemoria` +
                (p.erroriPromemoria ? ` · ${_panNumero(p.erroriPromemoria)} non consegnati` : '');
            if (p.erroriPromemoria) {
                return { tono: 'att', titolo: `Push: ${_panNumero(totale)} inviate oggi`, testo, motivo: `${p.erroriPromemoria} promemoria non consegnati oggi` };
            }
            return { tono: totale ? 'ok' : 'neu', titolo: totale ? `Push: ${_panNumero(totale)} inviate oggi` : 'Push: nessuna inviata oggi', testo };
        },
        orari: async () => {
            const p = await l.push();
            if (!p.disponibile) return { tono: 'neu', icona: 'sync_disabled', titolo: 'Controllo orari: non disponibile', testo: 'Serve il permesso di leggere invii_automatici' };
            if (!p.ultimo) return { tono: 'neu', titolo: 'Controllo orari', testo: 'Nessun avviso di modifica inviato finora' };
            const d = new Date(p.ultimo.inviato_il);
            const quando = `${d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })} alle ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
            // invii_automatici registra gli avvisi inviati, non le esecuzioni del controllo
            return { tono: 'ok', titolo: 'Controllo orari', testo: `Ultimo avviso di modifica: ${quando} (${tempoTrascorso(d)})` };
        },
    };
}

// Disegna un riquadro di stato (scheletro, contenuto o errore) e restituisce il risultato
async function _panRiquadro(chiave, gen, lavoro) {
    const el = document.getElementById('pan-s-' + chiave);
    const info = PAN_RIQUADRI[chiave];
    if (!el) return null;
    const disegna = (tono, icona, titolo, testo) => {
        el.className = `pan-s ${tono}`;
        el.innerHTML = `<div class="pan-s-ic"><span class="admin-ms">${icona}</span></div>` +
            `<div class="pan-s-testi"><b>${titolo}</b>${testo ? `<small>${testo}</small>` : ''}</div>`;
    };
    el.className = 'pan-s';
    el.setAttribute('aria-busy', 'true');
    el.innerHTML = `<div class="pan-s-ic pan-sch"></div><div class="pan-s-testi">${_panScheletroRiga()}${_panScheletroRiga('corta')}</div>`;
    try {
        const r = await lavoro();
        if (gen !== _panGenerazione.stato) return null;
        disegna(r.tono, r.icona || info.icona, r.titolo, r.testo);
        return r;
    } catch (err) {
        if (gen !== _panGenerazione.stato) return null;
        console.error(`Panoramica (${info.nome}):`, err);
        disegna('err', 'error', `${info.nome}: errore di lettura`, escapeHtml(err && err.message ? err.message : String(err)));
        return null;
    } finally {
        if (gen === _panGenerazione.stato) el.removeAttribute('aria-busy');
    }
}

// Checklist del rilascio: versione più recente in updates, ogni voce si spunta da sola.
// I link d'azione aprono soltanto la sezione giusta: non modificano nulla.
async function _panChecklist(l) {
    const versione = _panPiuRecente(await l.versioni());
    const titolo = document.getElementById('pan-checklist-titolo');
    if (!versione) {
        return { html: '<div class="pan-vuoto">Nessuna versione in Versioni e patch note.</div>', poi: () => { titolo.textContent = 'Rilascio'; } };
    }
    const nome = _panVersione(versione.version);
    const oggi = _isoOggi();
    const [config, menu, novita] = await Promise.allSettled([l.config(), l.menu(), l.novita()]);
    // Voce con lettura non riuscita: "non verificabile", senza toccare le altre
    const dalla = (risposta, voce) => (risposta.status === 'fulfilled' ? voce(risposta.value) : { ignoto: risposta.reason });
    const note = (Array.isArray(versione.changes) ? versione.changes : []).filter(c => String(c).trim());

    const voci = [
        { fatto: note.length > 0, testo: `Versione ${nome} con patch note`, info: note.length ? `${note.length} ${note.length === 1 ? 'voce' : 'voci'}` : '', azione: 'Aggiungi', sezione: 'versioni' },
        { testo: 'Mappe pubblicate', sezione: 'mappe', azione: 'Pubblica', ...dalla(config, c => ({
            fatto: !!(c.mappa_path || '').trim(),
            testo: (c.mappa_path || '').trim() ? `Mappe pubblicate (v${c.mappa_version})` : 'Mappe pubblicate',
        })) },
        { testo: 'Menù mensa valido oggi', sezione: 'menu', azione: 'Pubblica', ...dalla(menu, m => {
            const valido = !!m && !!m.valido_dal && !!m.valido_al && m.valido_dal <= oggi && oggi <= m.valido_al;
            return { fatto: valido, info: valido ? `fino al ${_panDataLunga(m.valido_al)}` : '' };
        }) },
        { testo: `Novità ${nome} attive`, sezione: 'novita', ...dalla(novita, righe => {
            const n = righe.find(r => _panVersione(r.versione) === nome);
            const schede = n && Array.isArray(n.schede) ? n.schede.length : 0;
            return {
                fatto: !!n && !!n.attiva && schede > 0,
                info: schede ? `${schede} ${schede === 1 ? 'scheda' : 'schede'}` : '',
                azione: !n ? 'Crea' : (!n.attiva ? 'Attiva' : 'Completa'),
            };
        }) },
        { fatto: !!String(versione.download_url || '').trim(), testo: "Link dell'APK inserito", azione: 'Aggiungi', sezione: 'versioni' },
        { fatto: !!versione.is_latest, testo: 'Segnata come "Ultima versione"', azione: 'Segna', sezione: 'versioni' },
    ];

    const fatte = voci.filter(v => v.fatto).length;
    const righe = voci.map(v => {
        const stato = v.ignoto ? 'ignoto' : (v.fatto ? 'fatto' : 'manca');
        const icona = { ignoto: 'help', fatto: 'check_circle', manca: 'radio_button_unchecked' }[stato];
        const lettore = { ignoto: 'Non verificabile: ', fatto: 'Fatto: ', manca: 'Da fare: ' }[stato];
        let destra = '';
        if (v.ignoto) destra = `<span class="pan-info" title="${escapeHtml(v.ignoto.message || String(v.ignoto))}">non verificabile</span>`;
        else if (v.fatto) destra = v.info ? `<span class="pan-info">${escapeHtml(v.info)}</span>` : '';
        else destra = `<span class="pan-azione">${v.azione}</span>`;
        return `<li><a class="${stato}" href="#${v.sezione}"><span class="admin-ms" aria-hidden="true">${icona}</span>` +
            `<span class="pan-check-t"><span class="admin-sr">${lettore}</span>${escapeHtml(v.testo)}</span>${destra}</a></li>`;
    }).join('');

    return {
        html: `<div class="pan-progresso"><span>${fatte} di ${voci.length}</span><div class="pan-barra"><i style="width:${Math.round((fatte / voci.length) * 100)}%"></i></div></div><ul class="pan-check">${righe}</ul>`,
        poi: () => { titolo.textContent = `Rilascio ${nome}`; },
    };
}

function _panCaricaStato(l) {
    const gen = ++_panGenerazione.stato;
    const lavori = _panLavoriStato(l);
    const chiavi = Object.keys(PAN_RIQUADRI);
    const riquadri = Promise.all(chiavi.map(k => _panRiquadro(k, gen, lavori[k]))).then(risultati => {
        if (gen !== _panGenerazione.stato) return;
        // Pallino giallo accanto alla voce del menu per ogni riquadro giallo o rosso
        const problemi = {};
        risultati.forEach((r, i) => {
            const sezione = PAN_RIQUADRI[chiavi[i]].sezione;
            if (r && (r.tono === 'att' || r.tono === 'ko') && !problemi[sezione]) problemi[sezione] = r.motivo || r.titolo;
        });
        new Set(chiavi.map(k => PAN_RIQUADRI[k].sezione)).forEach(sezione => segnalaVoceMenu(sezione, problemi[sezione] || null));
    });
    const checklist = _panBlocco(document.getElementById('pan-checklist'), 'stato', gen,
        `<div class="pan-progresso">${_panScheletroRiga('corta')}</div>` + `<div class="pan-check-sch">${_panScheletroRiga()}</div>`.repeat(6),
        () => _panChecklist(l));
    return Promise.all([riquadri, checklist]);
}

// Ricarica tutta la Panoramica (apertura della sezione e pulsante "Aggiorna")
function caricaPanoramica() {
    const l = _panLetture();
    const pulsante = document.getElementById('pan-aggiorna');
    const icone = ['pan-aggiorna', 'admin-barra-aggiorna'].map(id => document.querySelector(`#${id} .admin-ms`)).filter(Boolean);
    const data = document.getElementById('pan-data');
    const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    const giorno = oggi.charAt(0).toUpperCase() + oggi.slice(1);
    if (data) data.textContent = `${giorno} · aggiornamento in corso…`;
    if (pulsante) pulsante.disabled = true;
    icone.forEach(i => i.classList.add('admin-gira'));

    const numeri = _panCaricaNumeri(l);
    const gen = _panGenerazione.numeri;
    return Promise.all([numeri, _panCaricaStato(l)]).finally(() => {
        if (gen !== _panGenerazione.numeri) return;
        if (pulsante) pulsante.disabled = false;
        icone.forEach(i => i.classList.remove('admin-gira'));
        const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        if (data) data.textContent = `${giorno} · aggiornata alle ${ora}`;
    });
}

// Rilegge solo lo stato dell'app (riquadri, checklist, pallini) dopo un salvataggio in
// un'altra sezione, così i pallini gialli non restano accesi su problemi già risolti.
function aggiornaStatoPanoramica(ritardo = 400) {
    clearTimeout(_panTimerStato);
    _panTimerStato = setTimeout(() => {
        if (!adminDashboard.classList.contains('hidden')) _panCaricaStato(_panLetture());
    }, ritardo);
}

document.getElementById('pan-aggiorna')?.addEventListener('click', caricaPanoramica);
document.getElementById('admin-barra-aggiorna')?.addEventListener('click', caricaPanoramica);

// "Prepara rilascio": porta alla checklist e la mette in evidenza
document.getElementById('pan-prepara')?.addEventListener('click', () => {
    const card = document.getElementById('pan-checklist-card');
    if (!card) return;
    const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'start' });
    card.classList.remove('pan-evidenzia');
    void card.offsetWidth; // riavvia l'animazione se il pulsante viene premuto di nuovo
    card.classList.add('pan-evidenzia');
});
