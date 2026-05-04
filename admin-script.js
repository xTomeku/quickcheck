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
    'updates-section': document.getElementById('updates-section'),
    'credits-section': document.getElementById('credits-section'),
    'gallery-section': document.getElementById('gallery-section'),
    'contacts-section': document.getElementById('contacts-section'),
    'legal-section': document.getElementById('legal-section')
};

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

// Gallery DOM
const galleryList = document.getElementById('gallery-list');
const addGalleryBtn = document.getElementById('add-gallery-btn');
const galleryModal = document.getElementById('gallery-modal');
const galleryForm = document.getElementById('gallery-form');
const closeGalleryModal = document.getElementById('close-gallery-modal');

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
    fetchUpdates();
    fetchCredits();
    fetchGallery();
    fetchContacts();
    fetchLegal();
}

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        Object.values(sections).forEach(s => s.classList.add('hidden'));
        sections[btn.dataset.tab].classList.remove('hidden');
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

    // Ordinamento semantico delle versioni (dalla più recente alla più vecchia)
    data.sort((a, b) => {
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

    updatesList.innerHTML = '';
    data.forEach(update => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <h3>${update.version} ${update.is_latest ? '<span class="badge-latest">ULTIMA</span>' : ''}</h3>
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

    const payload = { version, date, download_url, details, changes, is_latest };

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
        alert('Errore nel salvataggio: ' + result.error.message);
    } else {
        updateModal.classList.add('hidden');
        fetchUpdates();
    }
});

async function deleteUpdate(id) {
    if (!confirm('Sei sicuro di voler eliminare questo aggiornamento?')) return;
    
    const { error } = await _supabase.from('updates').delete().eq('id', id);
    if (error) {
        alert('Errore nell\'eliminazione: ' + error.message);
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

    creditsList.innerHTML = '';
    if (data.length === 0) {
        creditsList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessuna scheda creata.</p>';
    }

    data.forEach(credit => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <h3>${credit.title} <span style="font-size: 0.8rem; color: var(--primary-gold); margin-left: 10px;">${credit.category}</span></h3>
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
}

function openCreditEditModal(id, data) {
    const credit = data.find(c => c.id === id);
    if (!credit) return;

    document.getElementById('credit-id').value = credit.id;
    document.getElementById('c-category').value = credit.category;
    document.getElementById('c-title').value = credit.title;
    document.getElementById('c-description').value = credit.description;
    document.getElementById('c-order').value = credit.order_index;
    
    document.getElementById('credit-modal-title').textContent = 'Modifica Scheda';
    creditModal.classList.remove('hidden');
}

addCreditBtn.addEventListener('click', () => {
    creditForm.reset();
    document.getElementById('credit-id').value = '';
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
    const order_index = parseInt(document.getElementById('c-order').value) || 0;

    const payload = { category, title, description, order_index };

    let result;
    if (id) {
        result = await _supabase.from('credits').update(payload).eq('id', id);
    } else {
        result = await _supabase.from('credits').insert([payload]);
    }

    if (result.error) {
        alert('Errore: ' + result.error.message);
    } else {
        creditModal.classList.add('hidden');
        fetchCredits();
    }
});

async function deleteCredit(id) {
    if (!confirm('Eliminare questa scheda?')) return;
    const { error } = await _supabase.from('credits').delete().eq('id', id);
    if (error) alert(error.message);
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

    contactsList.innerHTML = '';
    if (data.length === 0) {
        contactsList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessun contatto creato.</p>';
    }

    data.forEach(contact => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <h3>${contact.icon} ${contact.label}</h3>
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

    const payload = { icon, label, value, url, order_index };

    let result;
    if (id) {
        result = await _supabase.from('contacts').update(payload).eq('id', id);
    } else {
        result = await _supabase.from('contacts').insert([payload]);
    }

    if (result.error) {
        alert('Errore: ' + result.error.message);
    } else {
        contactModal.classList.add('hidden');
        fetchContacts();
    }
});

async function deleteContact(id) {
    if (!confirm('Eliminare questo contatto?')) return;
    const { error } = await _supabase.from('contacts').delete().eq('id', id);
    if (error) alert(error.message);
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

    legalList.innerHTML = '';
    if (data.length === 0) {
        legalList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessuna nota legale creata.</p>';
    }

    data.forEach(note => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <h3>${note.title} <span style="font-size: 0.8rem; color: var(--primary-gold); margin-left: 10px;">${note.category}</span></h3>
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
}

function openLegalEditModal(id, data) {
    const note = data.find(l => l.id === id);
    if (!note) return;

    document.getElementById('legal-id').value = note.id;
    document.getElementById('l-category').value = note.category;
    document.getElementById('l-title').value = note.title;
    document.getElementById('l-description').value = note.description;
    document.getElementById('l-order').value = note.order_index;
    
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

    const payload = { category, title, description, order_index };

    let result;
    if (id) {
        result = await _supabase.from('legal').update(payload).eq('id', id);
    } else {
        result = await _supabase.from('legal').insert([payload]);
    }

    if (result.error) {
        alert('Errore: ' + result.error.message);
    } else {
        legalModal.classList.add('hidden');
        fetchLegal();
    }
});

async function deleteLegal(id) {
    if (!confirm('Eliminare questa nota legale?')) return;
    const { error } = await _supabase.from('legal').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchLegal();
}

// Gallery Logic
async function fetchGallery() {
    galleryList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Caricamento galleria...</p>';
    
    const { data, error } = await _supabase
        .from('gallery')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        galleryList.innerHTML = `<p style="color: #ff4d4d;">Errore: ${error.message}</p>`;
        return;
    }

    galleryList.innerHTML = '';
    if (data.length === 0) {
        galleryList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessuna immagine in galleria.</p>';
    }

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'update-item';
        div.innerHTML = `
            <div class="update-item-info" style="display: flex; align-items: center; gap: 15px;">
                <img src="${item.image_url}" style="width: 50px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid var(--glass-border);">
                <div>
                    <h3>${item.title}</h3>
                    <p style="font-size: 0.7rem; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.image_url}</p>
                </div>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm edit-gallery-btn" data-id="${item.id}" style="margin-top:0">Modifica</button>
                <button class="btn btn-secondary btn-sm delete-gallery-btn" data-id="${item.id}" style="margin-top:0; border-color: #ff4d4d; color: #ff4d4d;">Elimina</button>
            </div>
        `;
        galleryList.appendChild(div);
    });

    document.querySelectorAll('.edit-gallery-btn').forEach(btn => {
        btn.addEventListener('click', () => openGalleryEditModal(btn.dataset.id, data));
    });

    document.querySelectorAll('.delete-gallery-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteGallery(btn.dataset.id));
    });
}

function openGalleryEditModal(id, data) {
    const item = data.find(g => g.id == id);
    if (!item) return;

    document.getElementById('gallery-id').value = item.id;
    document.getElementById('g-title').value = item.title;
    document.getElementById('g-url').value = item.image_url;
    document.getElementById('g-order').value = item.order_index;
    
    // Resetta il campo file per evitare di trascinare vecchi upload
    document.getElementById('g-file').value = '';
    
    document.getElementById('gallery-modal-title').textContent = 'Modifica Immagine';
    galleryModal.classList.remove('hidden');
}

addGalleryBtn.addEventListener('click', () => {
    galleryForm.reset();
    document.getElementById('gallery-id').value = '';
    document.getElementById('g-file').value = ''; // Assicuriamoci che sia vuoto
    document.getElementById('gallery-modal-title').textContent = 'Nuova Immagine Galleria';
    galleryModal.classList.remove('hidden');
});

closeGalleryModal.addEventListener('click', () => galleryModal.classList.add('hidden'));

galleryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('gallery-id').value;
    const title = document.getElementById('g-title').value;
    const fileInput = document.getElementById('g-file');
    let image_url = document.getElementById('g-url').value;
    const order_index = parseInt(document.getElementById('g-order').value) || 0;

    // Se c'è un file selezionato, caricalo prima
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error: uploadError } = await _supabase.storage
            .from('gallery')
            .upload(filePath, file);

        if (uploadError) {
            alert('Errore caricamento file: ' + uploadError.message);
            return;
        }

        // Ottieni URL pubblico
        const { data: { publicUrl } } = _supabase.storage
            .from('gallery')
            .getPublicUrl(filePath);
            
        image_url = publicUrl;
    }

    if (!image_url) {
        alert('Inserisci un URL o carica un file');
        return;
    }

    const payload = { title, image_url, order_index };

    let result;
    if (id) {
        result = await _supabase.from('gallery').update(payload).eq('id', id);
    } else {
        result = await _supabase.from('gallery').insert([payload]);
    }

    if (result.error) {
        alert('Errore: ' + result.error.message);
    } else {
        galleryModal.classList.add('hidden');
        fetchGallery();
    }
});

async function deleteGallery(id) {
    if (!confirm('Eliminare questa immagine dalla galleria?')) return;
    const { error } = await _supabase.from('gallery').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchGallery();
}

checkSession();
