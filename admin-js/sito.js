// Pannello admin - Contenuti del sito: credits, contatti, note legali, funzionalità, FAQ.

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

// FAQ DOM
const faqList = document.getElementById('faq-list');
const addFaqBtn = document.getElementById('add-faq-btn');
const faqModal = document.getElementById('faq-modal');
const faqForm = document.getElementById('faq-form');
const closeFaqModal = document.getElementById('close-faq-modal');

// Credits Logic
async function fetchCredits() {
    creditsList.innerHTML = '<p class="admin-caricamento">Caricamento credits...</p>';
    
    const { data, error } = await _supabase
        .from('credits')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        creditsList.innerHTML = `<p class="admin-errore">Errore: ${error.message}</p>`;
        return;
    }

    // Ordinamento: Visibili prima, poi per ordine
    data.sort((a, b) => {
        if (a.is_visible !== b.is_visible) return a.is_visible ? -1 : 1;
        return (a.order_index || 0) - (b.order_index || 0);
    });

    creditsList.innerHTML = '';
    if (data.length === 0) {
        creditsList.innerHTML = '<p class="admin-vuoto">Nessuna scheda creata.</p>';
    }

    data.forEach(credit => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <div class="drag-handle" title="Trascina per riordinare">⋮⋮</div>
                <h3>
                    ${credit.title} 
                    <span class="update-item-etichetta">${credit.category}</span>
                    ${credit.url ? `<a href="${credit.url}" target="_blank" class="update-item-link" title="${credit.url}">🔗 Link</a>` : ''}
                    ${!credit.is_visible ? '<span class="badge-draft">BOZZA</span>' : ''}
                </h3>
                <p>${credit.description.substring(0, 100)}${credit.description.length > 100 ? '...' : ''}</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm edit-credit-btn" data-id="${credit.id}">Modifica</button>
                <button class="btn btn-secondary btn-sm admin-pericolo delete-credit-btn" data-id="${credit.id}">Elimina</button>
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

    initSortable(creditsList, 'credits', fetchCredits);
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
    contactsList.innerHTML = '<p class="admin-caricamento">Caricamento contatti...</p>';
    
    const { data, error } = await _supabase
        .from('contacts')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        contactsList.innerHTML = `<p class="admin-errore">Errore: ${error.message}</p>`;
        return;
    }

    // Ordinamento: Visibili prima
    data.sort((a, b) => {
        if (a.is_visible !== b.is_visible) return a.is_visible ? -1 : 1;
        return (a.order_index || 0) - (b.order_index || 0);
    });

    contactsList.innerHTML = '';
    if (data.length === 0) {
        contactsList.innerHTML = '<p class="admin-vuoto">Nessun contatto creato.</p>';
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
                <button class="btn btn-secondary btn-sm edit-contact-btn" data-id="${contact.id}">Modifica</button>
                <button class="btn btn-secondary btn-sm admin-pericolo delete-contact-btn" data-id="${contact.id}">Elimina</button>
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

    initSortable(contactsList, 'contacts', fetchContacts);
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
    legalList.innerHTML = '<p class="admin-caricamento">Caricamento note legali...</p>';
    
    const { data, error } = await _supabase
        .from('legal')
        .select('*')
        .order('category', { ascending: false })
        .order('order_index', { ascending: true });

    if (error) {
        legalList.innerHTML = `<p class="admin-errore">Errore: ${error.message}</p>`;
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
        legalList.innerHTML = '<p class="admin-vuoto">Nessuna nota legale creata.</p>';
    }

    data.forEach(note => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <div class="drag-handle" title="Trascina per riordinare">⋮⋮</div>
                <h3>${note.title} <span class="update-item-etichetta">${note.category}</span> ${!note.is_visible ? '<span class="badge-draft">BOZZA</span>' : ''}</h3>
                <p>${note.description.substring(0, 100)}${note.description.length > 100 ? '...' : ''}</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm edit-legal-btn" data-id="${note.id}">Modifica</button>
                <button class="btn btn-secondary btn-sm admin-pericolo delete-legal-btn" data-id="${note.id}">Elimina</button>
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

    initSortable(legalList, 'legal', fetchLegal);
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
    featuresList.innerHTML = '<p class="admin-caricamento">Caricamento funzionalità...</p>';
    
    const { data, error } = await _supabase
        .from('features')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        featuresList.innerHTML = `<p class="admin-errore">Errore: ${error.message}</p>`;
        return;
    }

    // Ordinamento: Visibili prima
    data.sort((a, b) => {
        if (a.is_visible !== b.is_visible) return a.is_visible ? -1 : 1;
        return (a.order_index || 0) - (b.order_index || 0);
    });

    featuresList.innerHTML = '';
    if (data.length === 0) {
        featuresList.innerHTML = '<p class="admin-vuoto">Nessuna funzionalità creata.</p>';
    }

    data.forEach(feature => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <div class="drag-handle" title="Trascina per riordinare">⋮⋮</div>
                <h3>${/^[a-z_]+$/.test(feature.icon || '') ? `<span class="admin-ms">${feature.icon}</span>` : feature.icon} ${feature.title} ${feature.in_evidenza ? '<span class="update-item-etichetta">IN EVIDENZA</span>' : ''} ${!feature.is_visible ? '<span class="badge-draft">BOZZA</span>' : ''}</h3>
                <p>${feature.description}</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm edit-feature-btn" data-id="${feature.id}">Modifica</button>
                <button class="btn btn-secondary btn-sm admin-pericolo delete-feature-btn" data-id="${feature.id}">Elimina</button>
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

    initSortable(featuresList, 'features', fetchFeatures);
}

// Icone selezionabili per le funzionalità del sito, con il nome in italiano.
// Devono essere le stesse di ICONE_FUNZIONI in script.js (il sito carica solo quelle).
const ICONE_FUNZIONI_PANNELLO = [
    ['calendar_month', 'Calendario'], ['calendar_view_day', 'Giornata'], ['dashboard_customize', 'Personalizza'],
    ['notifications_active', 'Notifiche'], ['notifications', 'Campanella'], ['alarm', 'Sveglia'],
    ['event_busy', 'Lezione annullata'], ['campaign', 'Annuncio'], ['map', 'Mappa'], ['place', 'Luogo'],
    ['explore', 'Esplora'], ['directions_bus', 'Autobus'], ['restaurant', 'Mensa'], ['meeting_room', 'Aula'],
    ['school', 'Università'], ['local_library', 'Biblioteca'], ['menu_book', 'Libro'], ['contacts', 'Rubrica'],
    ['search', 'Cerca'], ['star', 'Preferiti'], ['widgets', 'Widget'], ['local_hospital', 'Sanità'],
    ['phonelink_setup', 'Configurazione'], ['ios_share', 'Condividi'], ['settings', 'Impostazioni'],
    ['palette', 'Colori'], ['dark_mode', 'Tema scuro'], ['language', 'Lingua'], ['wifi', 'Wi-Fi'],
    ['speed', 'Velocità'], ['bolt', 'Fulmine'], ['lock', 'Privacy'], ['build', 'Correzioni'],
    ['auto_awesome', 'Novità'], ['new_releases', 'Nuovo'], ['celebration', 'Festa'],
    ['event', 'Evento'], ['today', 'Oggi'], ['event_available', 'Confermata'], ['update', 'Aggiornamento'],
    ['history', 'Cronologia'], ['timer', 'Timer'], ['edit_note', 'Appunti'], ['sticky_note_2', 'Nota'],
    ['assignment', 'Compiti'], ['quiz', 'Quiz'], ['history_edu', 'Esami'],
    ['science', 'Laboratorio'], ['calculate', 'Calcolatrice'], ['insights', 'Andamento'], ['groups', 'Gruppi'],
    ['person', 'Profilo'], ['badge', 'Tessera'], ['account_balance', 'Ateneo'], ['apartment', 'Edificio'],
    ['directions_walk', 'A piedi'], ['directions_bike', 'Bici'], ['train', 'Treno'], ['local_parking', 'Parcheggio'],
    ['local_cafe', 'Bar'], ['fitness_center', 'Palestra'], ['accessible', 'Accessibilità'], ['translate', 'Traduzione'],
    ['computer', 'Computer'], ['phone_android', 'Telefono'], ['print', 'Stampa'], ['mail', 'Email'],
    ['forum', 'Forum'], ['newspaper', 'Notizie'], ['cloud_off', 'Senza rete'], ['sync', 'Sincronizza'],
    ['qr_code', 'QR'], ['touch_app', 'Tocco'], ['favorite', 'Cuore'], ['bookmark', 'Segnalibro'],
    ['tune', 'Filtri'], ['verified', 'Verificato'], ['info', 'Info'], ['help', 'Aiuto'],
    ['emoji_events', 'Trofeo'],
];

const fIcona = document.getElementById('f-icon');
const fIconaGriglia = document.getElementById('f-icon-griglia');
const fIconaEmoji = document.getElementById('f-icon-emoji');

if (fIconaGriglia) {
    fIconaGriglia.innerHTML = ICONE_FUNZIONI_PANNELLO.map(([nome, etichetta]) =>
        `<button type="button" class="icone-scelta" role="radio" aria-checked="false" data-icona="${nome}" title="${etichetta} (${nome})">` +
        `<span class="admin-ms">${nome}</span><small>${etichetta}</small></button>`).join('');
    fIconaGriglia.addEventListener('click', (e) => {
        const b = e.target.closest('.icone-scelta');
        if (!b) return;
        fIcona.value = b.dataset.icona;
        fIconaEmoji.value = '';
        mostraIconaFunzione();
    });
    fIconaEmoji.addEventListener('input', () => {
        fIcona.value = fIconaEmoji.value.trim();
        mostraIconaFunzione();
    });
}

// Allinea griglia e campo emoji al valore di f-icon (all'apertura della finestra e dopo una scelta)
function mostraIconaFunzione() {
    if (!fIconaGriglia) return;
    const valore = fIcona.value.trim();
    const daGriglia = ICONE_FUNZIONI_PANNELLO.some(([nome]) => nome === valore);
    fIconaGriglia.querySelectorAll('.icone-scelta').forEach(b => {
        const scelta = b.dataset.icona === valore;
        b.classList.toggle('scelta', scelta);
        b.setAttribute('aria-checked', scelta ? 'true' : 'false');
    });
    if (!daGriglia && document.activeElement !== fIconaEmoji) fIconaEmoji.value = valore;
    if (daGriglia) fIconaEmoji.value = '';
}

// Icone delle etichette sul riquadro in evidenza. Devono essere in ICONE_ETICHETTE di script.js
// (le stesse del font caricato da index.html)
const ICONE_ETICHETTE_PANNELLO = [
    ['', 'Nessuna icona'], ['schedule', 'Orologio'], ['wifi_off', 'Offline'], ['lunch_dining', 'Panino'],
    ['no_food', 'Allergeni'], ['departure_board', 'Partenze'], ['check_circle', 'Spunta'], ['download', 'Scarica'],
    ...ICONE_FUNZIONI_PANNELLO,
];

const fEvidenza = document.getElementById('f-evidenza');
const fEvidenzaCampi = document.getElementById('f-evidenza-campi');
const fPunti = document.getElementById('f-punti');
const fEtichette = [1, 2].map(n => ({
    icona: document.getElementById(`f-etichetta${n}-icona`),
    testo: document.getElementById(`f-etichetta${n}-testo`),
}));

if (fEvidenza) {
    fEtichette.forEach(({ icona }) => {
        icona.innerHTML = ICONE_ETICHETTE_PANNELLO.map(([nome, etichetta]) =>
            `<option value="${nome}">${etichetta}</option>`).join('');
        icona.addEventListener('change', mostraCampiEvidenza);
    });
    fEvidenza.addEventListener('change', mostraCampiEvidenza);
}

// Mostra i campi solo per le funzionalità in evidenza e aggiorna l'anteprima delle icone delle etichette
function mostraCampiEvidenza() {
    if (!fEvidenza) return;
    fEvidenzaCampi.hidden = !fEvidenza.checked;
    fEtichette.forEach(({ icona }) => {
        icona.previousElementSibling.textContent = icona.value;
    });
}

function compilaCampiEvidenza(feature) {
    if (!fEvidenza) return;
    fEvidenza.checked = !!feature.in_evidenza;
    fPunti.value = (feature.punti || []).join('\n');
    const etichette = Array.isArray(feature.etichette) ? feature.etichette : [];
    fEtichette.forEach(({ icona, testo }, i) => {
        const e = etichette[i] || {};
        icona.value = ICONE_ETICHETTE_PANNELLO.some(([nome]) => nome === e.icona) ? e.icona : '';
        testo.value = e.testo || '';
    });
    mostraCampiEvidenza();
}

// Colonne in_evidenza, punti, etichette (_redesign/sql/funzioni_in_evidenza.sql). Una funzionalità non in
// evidenza tiene punti ed etichette, così rimettendola in evidenza non si riscrivono
function datiEvidenza() {
    return {
        in_evidenza: fEvidenza.checked,
        punti: fPunti.value.split('\n').map(p => p.trim()).filter(Boolean),
        etichette: fEtichette
            .map(({ icona, testo }) => ({ icona: icona.value, testo: testo.value.trim() }))
            .filter(e => e.testo),
    };
}

function openFeatureEditModal(id, data) {
    const feature = data.find(f => f.id === id);
    if (!feature) return;

    document.getElementById('feature-id').value = feature.id;
    document.getElementById('f-icon').value = feature.icon;
    mostraIconaFunzione();
    document.getElementById('f-title').value = feature.title;
    document.getElementById('f-description').value = feature.description;
    document.getElementById('f-order').value = feature.order_index;
    document.getElementById('f-visible').checked = feature.is_visible !== false;
    compilaCampiEvidenza(feature);
    
    document.getElementById('feature-modal-title').textContent = 'Modifica Funzionalità';
    featureModal.classList.remove('hidden');
}

addFeatureBtn.addEventListener('click', () => {
    featureForm.reset();
    document.getElementById('feature-id').value = '';
    // I campi nascosti non si svuotano con reset(): nuova scheda senza icona scelta
    document.getElementById('f-icon').value = '';
    mostraIconaFunzione();
    compilaCampiEvidenza({});
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

    const payload = { icon, title, description, order_index, is_visible, ...datiEvidenza() };

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
    if (error) { faqList.innerHTML = `<p class="admin-errore">Errore: ${error.message}</p>`; return; }
    if (!data || data.length === 0) { faqList.innerHTML = '<p class="admin-vuoto">Nessuna FAQ presente.</p>'; return; }

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
                <button class="btn btn-secondary btn-sm admin-pericolo" onclick="deleteFaq(${item.id})">Elimina</button>
            </div>
        `;
        faqList.appendChild(el);
    });

    initSortable(faqList, 'faq', fetchFAQ);
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
