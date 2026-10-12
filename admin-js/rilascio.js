// Pannello admin - Rilascio: versioni e patch note (tabella updates), schermata Novità (novita_app).

// Updates DOM
const updatesList = document.getElementById('updates-list');
const addUpdateBtn = document.getElementById('add-update-btn');
const updateModal = document.getElementById('update-modal');
const updateForm = document.getElementById('update-form');
const closeModal = document.getElementById('close-modal');

// Fetch Updates
async function fetchUpdates() {
    updatesList.innerHTML = '<p class="admin-caricamento">Caricamento...</p>';
    
    let { data, error } = await _supabase
        .from('updates')
        .select('*');

    if (error) {
        updatesList.innerHTML = `<p class="admin-errore">Errore: ${error.message}</p>`;
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
        updatesList.innerHTML = '<p class="admin-vuoto">Nessun aggiornamento trovato.</p>';
        return;
    }

    data.forEach(update => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
            <div class="update-item-info">
                <h3>
                    ${update.version} 
                    ${update.is_latest ? '<span class="badge-latest">ULTIMA</span>' : ''}
                    ${!update.is_visible ? '<span class="badge-draft">BOZZA</span>' : ''}
                </h3>
                <p>${update.date} • ${update.details || 'Nessun dettaglio'}</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm edit-btn" data-id="${update.id}">Modifica</button>
                <button class="btn btn-secondary btn-sm admin-pericolo delete-btn" data-id="${update.id}">Elimina</button>
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

    // Niente riordino: le versioni si ordinano da sole (prima le pubblicate, poi per numero di versione)
    // e la tabella updates non ha la colonna order_index
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
        row.classList.add('uscita');
        setTimeout(() => row.remove(), 180);
    });
    return row;
}

/**
 * Aggiorna il colore del bordo e del testo della select per riflettere il colore del badge scelto.
 */
function updateSelectBadgeStyle(select) {
    select.classList.toggle('tipo-fix', select.value === 'fix');
    select.classList.toggle('tipo-improvement', select.value === 'improvement');
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
            ghostClass: 'sortable-ghost',
            onEnd: () => segnaModifiche('versioni')
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
    segnaModifiche('versioni');
});

// Modifiche non salvate nella finestra della versione (campi, tipo e testo delle note, note rimosse)
['input', 'change'].forEach(tipo => updateForm.addEventListener(tipo, () => segnaModifiche('versioni')));
document.getElementById('v-changes-list').addEventListener('click', (e) => {
    if (e.target.closest('.btn-remove-note')) segnaModifiche('versioni');
});

// CRUD Operations
addUpdateBtn.addEventListener('click', () => {
    updateForm.reset();
    document.getElementById('update-id').value = '';
    document.getElementById('modal-title').textContent = 'Nuovo Aggiornamento';
    populatePatchNotes([]);
    azzeraModifiche('versioni');
    updateModal.classList.remove('hidden');
});

// Annulla: le modifiche si scartano di proposito
closeModal.addEventListener('click', () => {
    updateModal.classList.add('hidden');
    azzeraModifiche('versioni');
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
    azzeraModifiche('versioni');
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
        azzeraModifiche('versioni');
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
        stato.innerHTML = `<span class="admin-errore">Errore: ${escapeHtml(error.message)}. Lo script SQL 11 &egrave; stato applicato?</span>`;
        return;
    }
    document.getElementById('nov-versioni').innerHTML = (data || []).map(r => `<option value="${escapeHtml(r.versione)}">`).join('');
    stato.innerHTML = data && data.length
        ? 'Versioni salvate: ' + data.map(r => `<strong class="${r.attiva ? 'admin-oro' : 'admin-testo-sub'}">${escapeHtml(r.versione)}</strong>${r.attiva ? '' : ' (spenta)'}`).join(' &middot; ')
        : 'Nessuna versione salvata.';
    // Al primo ingresso apre la versione più recente
    if (!_novVersione() && data && data.length) {
        document.getElementById('nov-versione').value = data[0].versione;
        caricaNovita({ avviso: false });
    } else if (!_novVersione()) {
        renderNovita();
    } else if (_novDaRicaricare) {
        // Usciti senza salvare: si riparte da quello che è salvato
        caricaNovita({ avviso: false });
    }
}

// avviso = messaggio "Novità … caricate": solo quando si preme "Carica", non nei caricamenti automatici
async function caricaNovita({ avviso = true } = {}) {
    const versione = _novVersione();
    if (!versione) return;
    const { data, error } = await _supabase.from('novita_app').select('*').eq('versione', versione).maybeSingle();
    if (error) { showToast('Errore: ' + error.message, 'error'); return; }
    if (data) {
        _novSchede = (Array.isArray(data.schede) ? data.schede : []).map(s => ({ ..._novNuovaScheda(s.tipo === 'riepilogo' ? 'riepilogo' : 'principale'), ...s }));
        document.getElementById('nov-attiva').checked = !!data.attiva;
        if (avviso) showToast(`Novità ${versione} caricate`);
    } else {
        _novSchede = [];
        document.getElementById('nov-attiva').checked = true;
        if (avviso) showToast(`Nessuna novità per la ${versione}: parti da zero`);
    }
    _novPagina = 0;
    _novDaRicaricare = false;
    azzeraModifiche('novita');
    renderNovita();
}

function renderNovita() {
    const box = document.getElementById('nov-schede');
    if (!box) return;
    if (!_novSchede.length) {
        box.innerHTML = '<p class="admin-vuoto">Nessuna scheda. Aggiungi una pagina o una voce del riepilogo.</p>';
    } else {
        const opzioni = (sel) => NOVITA_ICONE.map(n => `<option value="${n}" ${n === sel ? 'selected' : ''}>${n}</option>`).join('');
        box.innerHTML = _novSchede.map((s, i) => {
            const riep = s.tipo === 'riepilogo';
            const campo = (k, etichetta, area) => area
                ? `<div class="form-group"><label>${etichetta}</label><textarea class="form-control" rows="2" data-i="${i}" data-k="${k}">${escapeHtml(s[k] || '')}</textarea></div>`
                : `<div class="form-group"><label>${etichetta}</label><input type="text" class="form-control" data-i="${i}" data-k="${k}" value="${escapeHtml(Array.isArray(s[k]) ? s[k].join(', ') : (s[k] || ''))}"></div>`;
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
            const etichette = (t(s, 'etichette') || []).slice(0, 3);
            corpo = `<div class="illu"><span class="nov-ms">${escapeHtml(s.icona)}</span>${etichette.map((e, i) => `<div class="chip pos-${i}">${escapeHtml(e)}</div>`).join('')}</div>
                <div class="tit">${escapeHtml(t(s, 'titolo') || '(titolo)')}</div>
                ${t(s, 'testo') ? `<div class="txt">${escapeHtml(t(s, 'testo'))}</div>` : ''}`;
        } else {
            corpo = `<div class="riep"><div class="riep-tit">${inglese ? 'And also…' : 'E inoltre…'}</div>${p.voci.map(v => `<div class="r"><div class="ic"><span class="nov-ms">${escapeHtml(v.icona)}</span></div><div><b>${escapeHtml(t(v, 'titolo') || '(titolo)')}</b>${t(v, 'testo') ? `<small>${escapeHtml(t(v, 'testo'))}</small>` : ''}</div></div>`).join('')}</div>`;
        }
    }
    box.innerHTML = `<div class="nov-tel">
        <div class="top"><span class="ver">${inglese ? 'NEW IN' : 'NOVITÀ'} ${versione}</span><span class="salta${ultima ? ' nascosto' : ''}">${inglese ? 'Skip' : 'Salta'}</span></div>
        <div class="pag">${corpo}</div>
        ${pagine.length > 1 ? `<div class="dots">${pagine.map((_, i) => `<i class="${i === _novPagina ? 'on' : ''}" data-pagina="${i}"></i>`).join('')}</div>` : '<div class="dots-vuoto"></div>'}
        <div class="btn-nov" id="nov-btn-anteprima">${ultima ? (inglese ? 'Get started' : 'Inizia') : `${inglese ? 'Next' : 'Avanti'}<span class="nov-ms">arrow_forward</span>`}</div>
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
// Modifiche non salvate: campi e icone delle schede, "Attiva", schede aggiunte, spostate o eliminate
// (la versione scritta e la lingua dell'anteprima non contano)
['input', 'change'].forEach(tipo => document.getElementById('nov-schede')?.addEventListener(tipo, () => segnaModifiche('novita')));
document.getElementById('nov-schede')?.addEventListener('click', (e) => {
    if (e.target.closest('button[data-azione]')) segnaModifiche('novita');
});
document.getElementById('nov-attiva')?.addEventListener('change', () => segnaModifiche('novita'));
['nov-aggiungi-pagina', 'nov-aggiungi-voce'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', () => segnaModifiche('novita')));

// "Carica" sostituisce le schede nell'editor: prima chiede, se ci sono modifiche non salvate
async function caricaNovitaChiedendo() {
    if (_modificheNonSalvate.has('novita') && !(await customConfirm(`Caricare le novità della ${_novVersione()}? Le modifiche non salvate andranno perse.`, {
        title: 'Modifiche non salvate', confirmText: 'Carica', cancelText: 'Resta qui', icon: '✏️'
    }))) return;
    caricaNovita();
}
document.getElementById('nov-carica')?.addEventListener('click', caricaNovitaChiedendo);
document.getElementById('nov-versione')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); caricaNovitaChiedendo(); }
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
        azzeraModifiche('novita');
        caricaElencoNovita();
        aggiornaStatoPanoramica();
    }
});

document.getElementById('nov-elimina')?.addEventListener('click', async () => {
    const versione = _novVersione();
    if (!versione) return;
    if (!(await customConfirm(`Eliminare le novità della ${versione}?`, { title: 'Elimina novità' }))) return;
    const { error } = await _supabase.from('novita_app').delete().eq('versione', versione);
    if (error) {
        showToast('Errore: ' + error.message, 'error');
    } else {
        showToast(`Novità ${versione} eliminate`);
        _novSchede = [];
        azzeraModifiche('novita');
        renderNovita();
        caricaElencoNovita();
        aggiornaStatoPanoramica();
    }
});
