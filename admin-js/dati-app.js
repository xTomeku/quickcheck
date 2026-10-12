// Pannello admin - Dati dell'app: messaggio all'avvio, mappe e menù mensa (config_app e bucket "mappe").

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
        const avviso = `<span class="admin-errore">Errore: ${escapeHtml(error.message)}. Lo script SQL 07 &egrave; stato applicato?</span>`;
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
        azzeraModifiche('messaggio');
    }

    if (parti.includes('mappe')) {
        // La data è quella del file nel bucket (la scrive elencaVersioniMappe): aggiornato_il
        // cambia con qualunque salvataggio di config_app, anche del messaggio o del menù
        stato.innerHTML = data.mappa_path
            ? `Versione pubblicata: <strong class="admin-oro">v${data.mappa_version}</strong> &middot; ${escapeHtml(data.mappa_path)} &middot; ${data.mappa_bytes ? _kb(data.mappa_bytes) : '-'} &middot; impronta ${escapeHtml((data.mappa_sha256 || '').slice(0, 12))}&hellip;<span id="cfg-mappe-data"></span>`
            : `Versione attuale: <strong>v${data.mappa_version}</strong> &middot; nessun file su Supabase (le app usano le mappe incluse o GitHub)`;
        elencaVersioniMappe();
    }

    if (parti.includes('menu')) caricaMenuPubblicato();
}

['input', 'change'].forEach(tipo =>
    document.getElementById('config-messaggio-form')?.addEventListener(tipo, () => segnaModifiche('messaggio')));

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
        azzeraModifiche('messaggio');
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
    anteprima.classList.add('hidden');
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
            <div class="admin-anteprima-titolo">Pronto da pubblicare come <span class="admin-oro">v${prossima}</span></div>
            <div>${dati.edifici.length} edifici &middot; ${dati.puntiInteresse.length} punti di interesse &middot; ${dati.lineeBus.length} linee bus</div>
            <div class="admin-anteprima-nota">Originale ${_kb(file.size)} &rarr; compatto ${_kb(compatto.byteLength)} &rarr; compresso <strong>${_kb(gz.byteLength)}</strong> &middot; impronta ${sha256.slice(0, 12)}&hellip;</div>`;
        anteprima.classList.remove('hidden');
        pulsante.disabled = false;
    } catch (err) {
        anteprima.innerHTML = `<span class="admin-errore">File non valido: ${escapeHtml(err.message)}</span>`;
        anteprima.classList.remove('hidden');
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
    if (!(await customConfirm(`Pubblicare le mappe come v${versione}? Tutte le app le scaricheranno al prossimo controllo.`, {
        title: 'Pubblica mappe', confirmText: 'Pubblica', icon: '🗺️', isDanger: false
    }))) return;

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
        document.getElementById('cfg-mappe-anteprima').classList.add('hidden');
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

/** File mappe_v<N>.json.gz del bucket, dal più recente. Usata anche dalla Panoramica. */
async function leggiFileMappe() {
    const { data, error } = await _supabase.storage.from(BUCKET_MAPPE).list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) throw new Error(error.message);
    return (data || []).filter(f => f.name && f.name.startsWith('mappe_') && f.name.endsWith('.json.gz'));
}

async function elencaVersioniMappe() {
    const elenco = document.getElementById('cfg-mappe-elenco');
    let file;
    try {
        file = await leggiFileMappe();
    } catch (err) {
        elenco.innerHTML = `<span class="admin-errore">Errore: ${escapeHtml(err.message)}</span>`;
        return;
    }
    // Data di caricamento del file in uso nella riga "Versione pubblicata" (vedi fetchConfigApp)
    const inUso = file.find(f => _configApp && _configApp.mappa_path === f.name);
    const dataFile = document.getElementById('cfg-mappe-data');
    if (dataFile) dataFile.innerHTML = inUso && inUso.created_at ? ` &middot; file caricato il ${new Date(inUso.created_at).toLocaleString('it-IT')}` : '';
    if (file.length === 0) {
        elenco.textContent = 'Nessun file pubblicato.';
        return;
    }
    elenco.innerHTML = file.map(f => {
        const attuale = _configApp && _configApp.mappa_path === f.name;
        const quando = f.created_at ? new Date(f.created_at).toLocaleString('it-IT') : '';
        const dim = f.metadata && f.metadata.size ? _kb(f.metadata.size) : '';
        return `<div class="admin-elenco-riga">
            <span class="admin-riempi admin-elenco-nome">${escapeHtml(f.name)} <span class="admin-testo-sub admin-piccolo">${dim} &middot; ${quando}</span></span>
            ${attuale
                ? '<span class="admin-stato oro">in uso</span>'
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
    if (!(await customConfirm(`Ripristinare ${nome}? Verrà pubblicato come v${versione}.`, {
        title: 'Ripristina mappe', confirmText: 'Ripristina', icon: '🗺️', isDanger: false
    }))) return;
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
        // Senza un file scelto i campi tornano quelli pubblicati: niente da salvare
        if (!_menuBozza) { _compilaDateMenu(null); azzeraModifiche('menu'); }
        return;
    }
    try {
        _menuPubblicato = await leggiMenuPubblicato(_configApp);
        stato.innerHTML = `Pubblicato: <strong class="admin-oro">${escapeHtml(_menuPubblicato.titolo || 'Menù')}</strong> &middot; v${_configApp.menu_version} &middot; valido dal ${escapeHtml(_menuPubblicato.valido_dal || '?')} al ${escapeHtml(_menuPubblicato.valido_al || '?')} &middot; ${_menuPubblicato.settimane} settimane, 1&ordf; dal ${escapeHtml(_menuPubblicato.inizio_ciclo || '?')}`;
        if (!_menuBozza) { _compilaDateMenu(_menuPubblicato); azzeraModifiche('menu'); }
    } catch (err) {
        stato.innerHTML = `<span class="admin-errore">Impossibile leggere il menù pubblicato: ${escapeHtml(err.message)}</span>`;
    }
}

document.getElementById('cfg-menu-file')?.addEventListener('change', async (e) => {
    const anteprima = document.getElementById('cfg-menu-anteprima');
    _menuBozza = null;
    anteprima.classList.add('hidden');
    const file = e.target.files && e.target.files[0];
    if (!file) { _compilaDateMenu(_menuPubblicato); azzeraModifiche('menu'); return; }
    try {
        const dati = JSON.parse(await file.text());
        _validaMenu(dati);
        _menuBozza = dati;
        segnaModifiche('menu');
        // Date vuote nel file: si tengono quelle del menu' pubblicato
        _compilaDateMenu({
            titolo: dati.titolo || _menuPubblicato?.titolo,
            valido_dal: dati.valido_dal || _menuPubblicato?.valido_dal,
            valido_al: dati.valido_al || _menuPubblicato?.valido_al,
            inizio_ciclo: dati.inizio_ciclo || _menuPubblicato?.inizio_ciclo,
        });
        mostraAnteprimaMenu();
    } catch (err) {
        anteprima.innerHTML = `<span class="admin-errore">File non valido: ${escapeHtml(err.message)}</span>`;
        anteprima.classList.remove('hidden');
    }
});

// Titolo e date cambiati a mano (anche senza file) sono modifiche da pubblicare
['cfg-menu-titolo', 'cfg-menu-dal', 'cfg-menu-al', 'cfg-menu-ciclo'].forEach(id =>
    ['input', 'change'].forEach(tipo => document.getElementById(id)?.addEventListener(tipo, () => segnaModifiche('menu'))));

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
            <div class="admin-anteprima-titolo">${escapeHtml(dati.titolo)} &middot; ${dati.settimane} settimane &middot; ${piatti} piatti &middot; ${Object.keys(dati.allergeni || {}).length} allergeni</div>
            <div class="menu-anteprima-oggi ${inVigore ? 'admin-testo-sub' : 'admin-rosso'}">Oggi (${nomi[giorno - 1]}) &egrave; la <strong>settimana ${settimana}</strong>${inVigore ? '' : ' &mdash; ma il menù oggi NON è in vigore'}. Controlla che coincida con il menù esposto in mensa.</div>
            <div class="menu-anteprima-pasto"><span class="admin-oro">Pranzo</span>${elenco('pranzo')}</div>
            <div class="menu-anteprima-pasto"><span class="admin-oro">Cena</span>${elenco('cena')}</div>`;
    } catch (err) {
        anteprima.innerHTML = `<span class="admin-errore">${escapeHtml(err.message)}</span>`;
    }
    anteprima.classList.remove('hidden');
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
    if (!(await customConfirm(`Pubblicare "${dati.titolo}" (valido dal ${dati.valido_dal} al ${dati.valido_al}) come v${versione}?`, {
        title: 'Pubblica menù', confirmText: 'Pubblica', icon: '🍽️', isDanger: false
    }))) return;

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
        azzeraModifiche('menu');
        document.getElementById('cfg-menu-file').value = '';
        document.getElementById('cfg-menu-anteprima').classList.add('hidden');
        fetchConfigApp(['menu']);
        aggiornaStatoPanoramica();
    } catch (err) {
        showToast('Errore nella pubblicazione del menù (' + err.message + ')', 'error');
    } finally {
        pulsante.disabled = false;
    }
});
