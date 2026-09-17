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

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const sections = {
    'analytics-section': document.getElementById('analytics-section'),
    'updates-section': document.getElementById('updates-section'),
    'credits-section': document.getElementById('credits-section'),
    'gallery-section': document.getElementById('gallery-section'),
    'contacts-section': document.getElementById('contacts-section'),
    'legal-section': document.getElementById('legal-section'),
    'features-section': document.getElementById('features-section'),
    'faq-admin-section': document.getElementById('faq-admin-section')
};

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

function customConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm');
        const msgEl = document.getElementById('confirm-message');
        const btnYes = document.getElementById('confirm-yes');
        const btnNo = document.getElementById('confirm-no');
        
        msgEl.textContent = message;
        modal.classList.remove('hidden');
        
        const cleanup = () => {
            modal.classList.add('hidden');
            btnYes.removeEventListener('click', onYes);
            btnNo.removeEventListener('click', onNo);
        };
        
        const onYes = () => { cleanup(); resolve(true); };
        const onNo = () => { cleanup(); resolve(false); };
        
        btnYes.addEventListener('click', onYes);
        btnNo.addEventListener('click', onNo);
    });
}

function initSortable(listElement, tableName) {
    if (!window.Sortable) return;
    
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
    userEmailDisplay.textContent = `Loggato come: ${user.email}`;
    fetchDownloadStats();
    fetchUserStats();
    fetchUpdates();
    fetchCredits();
    fetchContacts();
    fetchLegal();
    fetchFeatures();
    fetchFAQ();
}

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.tab;
        const targetSection = document.getElementById(targetId);

        if (!targetSection) {
            console.error(`Sezione non trovata: ${targetId}`);
            return;
        }

        // Rimuove active da tutti i bottoni
        tabBtns.forEach(b => b.classList.remove('active'));
        // Aggiunge active a quello cliccato
        btn.classList.add('active');
        
        // Nasconde tutte le sezioni che hanno la classe 'section-content' o che sono nel nostro oggetto
        document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
        
        // Mostra la sezione target
        targetSection.classList.remove('hidden');
        if (targetId === 'analytics-section') {
            fetchDownloadStats();
            fetchUserStats();
        }
    });
});

function showLogin() {
    loginSection.classList.remove('hidden');
    adminDashboard.classList.add('hidden');
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

// CRUD Operations
addUpdateBtn.addEventListener('click', () => {
    updateForm.reset();
    document.getElementById('update-id').value = '';
    document.getElementById('modal-title').textContent = 'Nuovo Aggiornamento';
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
    document.getElementById('v-changes').value = update.changes.join('\n');
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
    const changes = document.getElementById('v-changes').value.split('\n').filter(line => line.trim() !== '');
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
    });
}

// ===== Telemetria Anonima Utenti QuickCheck (Supabase) =====
/**
 * Recupera le statistiche di accesso giornaliero da Supabase.
 * Interroga prioritariamente la vista aggregata 'v_utenti_unici_giornalieri'.
 * In caso di assenza della vista, esegue il fallback aggregando i record di 'app_accessi'.
 */
async function fetchUserStats(days = currentStatsRangeDays) {
    if (!userStatsHistoryList) return;

    try {
        // Aggiorna l'etichetta del KPI in base ai giorni selezionati
        if (kpiUsersRangeLabel) {
            kpiUsersRangeLabel.textContent = days >= 365 ? 'Accessi Totali Storico' : `Accessi Ultimi ${days} Giorni`;
        }

        // Query alla vista aggregata SQL su Supabase con il limite richiesto
        let { data, error } = await _supabase
            .from('v_utenti_unici_giornalieri')
            .select('*')
            .order('data', { ascending: false })
            .limit(days);

        // Fallback resiliente: se la vista non è ancora presente, aggrega lato client da app_accessi
        if (error) {
            console.warn('v_utenti_unici_giornalieri non raggiungibile, fallback su app_accessi:', error.message);
            const { data: raw, error: rawErr } = await _supabase
                .from('app_accessi')
                .select('uuid_utente, data, piattaforma');
            
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
        }

        renderUserStats(data || []);
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

/**
 * Renderizza le card KPI e la tabella dello storico accessi giornaliero.
 * Include badge colorati per le piattaforme (APK, PWA, Web) e mini-barra percentuale.
 */
function renderUserStats(records) {
    if (!userStatsHistoryList) return;

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
                let rawQuery = _supabase.from('app_accessi').select('uuid_utente, data, piattaforma');
                if (range === 'custom') {
                    rawQuery = rawQuery.gte('data', exportDateFrom.value).lte('data', exportDateTo.value);
                } else if (range !== 'all') {
                    const days = parseInt(range, 10);
                    const startDate = new Date();
                    startDate.setDate(startDate.getDate() - days);
                    rawQuery = rawQuery.gte('data', formatIso(startDate));
                }
                const { data: raw, error: rawErr } = await rawQuery;
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
                // Formato CSV con intestazione e delimitatore a virgola
                const header = 'Data,Utenti Unici Totali,APK Android,PWA Standalone,Web Browser\r\n';
                const rows = data.map(r => `${r.data},${r.utenti_unici_totali},${r.utenti_apk},${r.utenti_pwa},${r.utenti_web_browser}`).join('\r\n');
                blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
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

checkSession();
