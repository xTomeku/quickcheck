// Pannello admin - Bug e problemi (tabella bugs).

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
                    <div class="admin-vuoto">
                        <p class="admin-vuoto-titolo admin-giallo">⚠️ Tabella 'bugs' non trovata in Supabase</p>
                        <p class="admin-piccolo">Clicca sul pulsante in alto per copiare la query SQL ed eseguirla in Supabase per attivarla in 1 minuto.</p>
                    </div>
                `;
            } else {
                bugsList.innerHTML = `<p class="admin-errore">Errore: ${error.message}</p>`;
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
        bugsList.innerHTML = `<p class="admin-errore">Eccezione: ${err.message}</p>`;
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
            <div class="admin-vuoto">
                <p class="admin-vuoto-icona">${adminAllBugs.length === 0 ? '✨' : '🔍'}</p>
                <p>${adminAllBugs.length === 0 ? 'Nessun bug registrato. Clicca "+ Nuovo Bug" per aggiungere il primo!' : 'Nessun bug trovato con i filtri correnti.'}</p>
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
                <div class="bug-etichette">
                    <span class="bug-badge ${st.cls}">
                        <span class="status-dot"></span>
                        ${st.label}
                    </span>
                    <span class="bug-badge ${sv.cls}">
                        ${sv.label}
                    </span>
                    ${item.category ? `<span class="bug-badge category-pill">${item.category}</span>` : ''}
                    ${item.affected_version ? `<span class="bug-versione">Ver: ${item.affected_version}</span>` : ''}
                    ${item.fixed_version ? `<span class="bug-fixed-badge">✓ Fix: ${item.fixed_version}</span>` : ''}
                    ${!item.is_visible ? '<span class="badge-draft">BOZZA / NASCOSTO</span>' : ''}
                </div>
                <h3 class="bug-titolo">${item.title}</h3>
                <p class="bug-descrizione">${item.description.substring(0, 110)}${item.description.length > 110 ? '...' : ''}</p>
                ${item.workaround ? `<p class="bug-workaround">💡 <em>Workaround: ${item.workaround.substring(0, 90)}${item.workaround.length > 90 ? '...' : ''}</em></p>` : ''}
            </div>
            <div class="actions bug-azioni">
                <div class="actions">
                    <button class="btn btn-secondary btn-sm" onclick="editBug(${item.id})" data-id="${item.id}">Modifica</button>
                    <button class="btn btn-secondary btn-sm admin-pericolo" onclick="deleteBug(${item.id})">Elimina</button>
                </div>
                <div class="bug-stato-rapido">
                    <span class="bug-stato-etichetta">Stato:</span>
                    <button class="btn btn-secondary btn-sm open${item.status === 'open' ? ' attivo' : ''}" title="Imposta come Noto / Aperto" onclick="quickSetBugStatus(${item.id}, 'open')">🔴</button>
                    <button class="btn btn-secondary btn-sm in_progress${item.status === 'in_progress' ? ' attivo' : ''}" title="Imposta come In Lavorazione" onclick="quickSetBugStatus(${item.id}, 'in_progress')">🟡</button>
                    <button class="btn btn-secondary btn-sm resolved${item.status === 'resolved' ? ' attivo' : ''}" title="Imposta come Risolto" onclick="quickSetBugStatus(${item.id}, 'resolved')">🟢</button>
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

        // Se gli appunti non sono disponibili, lo script compare già selezionato nella finestra del pannello
        const copiaAMano = () => customConfirm('Copia manualmente lo script SQL:', {
            title: 'Script SQL della tabella bugs',
            testo: sql,
            icon: '📋',
            confirmText: 'Chiudi',
            isDanger: false,
            soloChiudi: true
        });
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(sql).then(() => {
                showToast('Script SQL copiato negli appunti!');
            }).catch(copiaAMano);
        } else {
            copiaAMano();
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
