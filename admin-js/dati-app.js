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
        caricaEditorMappe();
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

// ---------------------------------------------------------------------
// Editor delle mappe: si parte dalla bozza salvata, dal JSON pubblicato o da un file scelto,
// si modificano punti di interesse, aule ed edifici e si pubblica il risultato come nuova versione.
// Nel JSON le coordinate sono [lng, lat] (come il perimetro degli edifici).
// - Punto di interesse: { id, nome, descrizione, tipo, coordinate: [lng, lat] }
// - Aula (in edifici[].aule): { id, nome, roomCode, piano, capienza, coordinata: [lng, lat] | null,
//   coordinate: [coordinata] | [] } più i campi di stato che l'app riempie con l'orario.
// - Edificio: { id, nome, descrizione, codiceSede, centro: {lat, lng}, zoomIniziale, perimetro,
//   piani: [interi], aule, icona }. Qui si modificano tutti i campi tranne id e perimetro.
//
// Bozza: il JSON in modifica si salva nel bucket come bozza_mappe.json.gz insieme alla versione
// da cui parte. config_app non la indica mai, quindi le app non la scaricano: si salva quante volte
// si vuole (anche da più dispositivi) e si pubblica una volta sola. Le modifiche non ancora salvate
// nella bozza restano anche in una copia in questo browser (localStorage), per pagine chiuse o ricaricate.
// ---------------------------------------------------------------------
const BOZZA_MAPPE = 'bozza_mappe.json.gz';
const CHIAVE_COPIA_MAPPE = 'qc_admin_mappe_copia';
let _mappeDati = null;          // JSON in modifica (intero: edifici, puntiInteresse, lineeBus)
let _mappeOrigine = '';         // da dove viene: "v4 pubblicata", "bozza del ..." o il nome del file
let _mappeBase = 0;             // versione pubblicata da cui partono le modifiche
let _bozzaMappe = null;         // { base_version, salvata_il, salvata_da } della bozza su Supabase, o null
let _pubblicati = _indiceMappe(null); // la versione pubblicata, per il riepilogo delle differenze
let _modoEditor = 'poi';        // 'poi' | 'aule' | 'edifici'
let _edificioSel = 0;           // indice in _mappeDati.edifici (modo aule)
let _poiSel = -1;               // indice dell'elemento selezionato nell'elenco del modo attuale
let _poiMappa = null;
let _poiEdifici = null;         // perimetri degli edifici
let _poiStrato = null;          // segnaposto di tutti gli elementi
let _poiMarker = null;          // segnaposto trascinabile dell'elemento selezionato

const COLORI_POI = {
    fermata: '#38bdf8', bar: '#facc15', mensa: '#fb923c', casa: '#c084fc',
    acqua: '#22d3ee', biblioteca: '#4ade80', assorbenti: '#f472b6',
};
const COLORE_AULA = '#D4AF37';
const _colorePoi = (tipo) => COLORI_POI[tipo] || '#9b9b9b';
const _coloreElemento = (el) => _modoEditor === 'poi' ? _colorePoi(el.tipo) : COLORE_AULA;
const _nomePiano = (n) => n === 0 ? 'Piano terra (0)' : `Piano ${n}`;
const _dataBreve = (iso) => new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });

// Campi che l'app sovrascrive con l'orario: per le aule nuove si mettono i valori "sconosciuti"
const AULA_STATO_INIZIALE = {
    stato: 'Sconosciuto', lezioneAttuale: 'Sconosciuta', docente: 'Sconosciuto',
    orario: 'Sconosciuto', coloreStato: 'ff9e9e9e',
};

const _coordValide = (c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]) &&
    Math.abs(c[1]) <= 90 && Math.abs(c[0]) <= 180;

function _validaMappe(dati) {
    for (const chiave of ['edifici', 'puntiInteresse', 'lineeBus']) {
        if (!Array.isArray(dati[chiave])) throw new Error(`manca l'elenco "${chiave}"`);
    }
    if (dati.edifici.length === 0) throw new Error('l\'elenco "edifici" è vuoto');
    const idsEdifici = new Set();
    dati.edifici.forEach((e, i) => {
        const chi = e.nome ? `"${e.nome}"` : `n. ${i + 1}`;
        if (!e.id) throw new Error(`l'edificio ${chi} non ha un id`);
        if (idsEdifici.has(e.id)) throw new Error(`l'id "${e.id}" è usato da più edifici`);
        idsEdifici.add(e.id);
        if (!e.nome) throw new Error(`l'edificio "${e.id}" non ha un nome`);
        if (!Array.isArray(e.piani) || e.piani.length === 0 || !e.piani.every(Number.isInteger)) throw new Error(`l'edificio ${chi} non ha un elenco di piani valido`);
        if (new Set(e.piani).size !== e.piani.length) throw new Error(`l'edificio ${chi} ha piani ripetuti`);
        if (!e.centro || !_coordValide([e.centro.lng, e.centro.lat])) throw new Error(`l'edificio ${chi} ha un centro non valido`);
        if (e.zoomIniziale != null && !Number.isFinite(e.zoomIniziale)) throw new Error(`l'edificio ${chi} ha uno zoom non valido`);
    });
    const ids = new Set();
    dati.puntiInteresse.forEach((p, i) => {
        const chi = p.nome ? `"${p.nome}"` : `n. ${i + 1}`;
        if (!p.id) throw new Error(`il punto ${chi} non ha un id`);
        if (ids.has(p.id)) throw new Error(`l'id "${p.id}" è usato da più punti`);
        ids.add(p.id);
        if (!p.nome) throw new Error(`il punto "${p.id}" non ha un nome`);
        if (!p.tipo) throw new Error(`il punto ${chi} non ha un tipo`);
        if (!_coordValide(p.coordinate)) throw new Error(`il punto ${chi} ha coordinate non valide`);
    });
    dati.edifici.forEach(e => {
        const idsAule = new Set();
        (e.aule || []).forEach((a, i) => {
            const chi = `${a.nome ? `"${a.nome}"` : `n. ${i + 1}`} (${e.nome || e.id})`;
            if (!a.id) throw new Error(`l'aula ${chi} non ha un id`);
            if (idsAule.has(a.id)) throw new Error(`l'id "${a.id}" è usato da più aule di ${e.nome || e.id}`);
            idsAule.add(a.id);
            if (!a.nome) throw new Error(`l'aula "${a.id}" (${e.nome || e.id}) non ha un nome`);
            if (!a.roomCode) throw new Error(`l'aula ${chi} non ha il codice aula`);
            if (!Number.isInteger(a.piano)) throw new Error(`l'aula ${chi} non ha un piano valido`);
            if (!e.piani.includes(a.piano)) throw new Error(`l'aula ${chi} è al piano ${a.piano}, che non è tra i piani dell'edificio`);
            if (!Number.isInteger(a.capienza) || a.capienza < 0) throw new Error(`l'aula ${chi} ha una capienza non valida`);
            if (a.coordinata != null && !_coordValide(a.coordinata)) throw new Error(`l'aula ${chi} ha coordinate non valide`);
        });
    });
}

/** Scarica e decomprime le mappe indicate da config_app.mappa_path (null se non ce ne sono). */
async function leggiMappePubblicate(config) {
    if (!config || !config.mappa_path) return null;
    const { data, error } = await _supabase.storage.from(BUCKET_MAPPE).download(config.mappa_path);
    if (error) throw new Error(error.message);
    const json = await _gunzip(new Uint8Array(await data.arrayBuffer()));
    return JSON.parse(new TextDecoder().decode(json));
}

/** Bozza salvata nel bucket: { base_version, salvata_il, salvata_da, dati } oppure null se non c'è. */
async function leggiBozzaMappe() {
    const { data: elenco, error: errElenco } = await _supabase.storage.from(BUCKET_MAPPE).list('', { search: BOZZA_MAPPE });
    if (errElenco) throw new Error(errElenco.message);
    if (!(elenco || []).some(f => f.name === BOZZA_MAPPE)) return null;
    const { data, error } = await _supabase.storage.from(BUCKET_MAPPE).download(BOZZA_MAPPE);
    if (error) throw new Error(error.message);
    const bozza = JSON.parse(new TextDecoder().decode(await _gunzip(new Uint8Array(await data.arrayBuffer()))));
    if (!bozza || !bozza.dati) throw new Error('la bozza non contiene le mappe');
    return bozza;
}

// ----- Copia in questo browser delle modifiche non ancora salvate nella bozza -----
let _timerCopiaMappe = null;

function _scriviCopiaLocale() {
    clearTimeout(_timerCopiaMappe);
    if (!_mappeDati || !_modificheNonSalvate.has('mappe')) return;
    try {
        localStorage.setItem(CHIAVE_COPIA_MAPPE, JSON.stringify({
            base_version: _mappeBase, origine: _mappeOrigine, ora: new Date().toISOString(), dati: _mappeDati,
        }));
    } catch (_) { /* spazio pieno o storage bloccato: resta solo la pagina aperta */ }
}

function _leggiCopiaLocale() {
    try {
        const copia = JSON.parse(localStorage.getItem(CHIAVE_COPIA_MAPPE));
        return copia && copia.dati ? copia : null;
    } catch (_) {
        return null;
    }
}

/** Usata anche da scartaModifiche (comune.js). */
function cancellaCopiaLocaleMappe() {
    clearTimeout(_timerCopiaMappe);
    try { localStorage.removeItem(CHIAVE_COPIA_MAPPE); } catch (_) { /* niente da fare */ }
}

// La pagina può chiudersi prima che scatti il timer
window.addEventListener('pagehide', _scriviCopiaLocale);

function _usaMappe(dati, base, origine) {
    _mappeDati = dati;
    _mappeBase = base;
    _mappeOrigine = origine;
    _poiSel = -1;
    if (_edificioSel >= dati.edifici.length) _edificioSel = 0;
}

// All'apertura della sezione: con modifiche non salvate si tiene quello che c'è,
// altrimenti si riparte dalla bozza salvata o, se non c'è, dalla versione pubblicata.
// Se in questo browser sono rimaste modifiche non salvate si chiede se recuperarle.
async function caricaEditorMappe() {
    if (_modificheNonSalvate.has('mappe') && _mappeDati) { _disegnaEditorMappe(); return; }
    const versione = (_configApp && _configApp.mappa_version) || 0;
    _mappeDati = null;
    _bozzaMappe = null;
    _mappeBase = versione;
    let pubblicate = null, bozza = null;
    try {
        pubblicate = await leggiMappePubblicate(_configApp);
    } catch (err) {
        showToast('Impossibile leggere le mappe pubblicate: ' + err.message, 'error');
    }
    try {
        bozza = await leggiBozzaMappe();
    } catch (err) {
        showToast('Impossibile leggere la bozza salvata: ' + err.message, 'error');
    }
    _pubblicati = _indiceMappe(pubblicate);
    if (bozza) {
        _bozzaMappe = { base_version: bozza.base_version || 0, salvata_il: bozza.salvata_il, salvata_da: bozza.salvata_da || '' };
        _usaMappe(bozza.dati, _bozzaMappe.base_version, `bozza del ${_dataBreve(bozza.salvata_il)}`);
    } else if (pubblicate) {
        _usaMappe(pubblicate, versione, `v${versione} pubblicata`);
    }
    azzeraModifiche('mappe');

    const copia = _leggiCopiaLocale();
    if (copia && _mappeDati && JSON.stringify(copia.dati) === JSON.stringify(_mappeDati)) {
        cancellaCopiaLocaleMappe();
    } else if (copia) {
        const piuRecente = _bozzaMappe && _bozzaMappe.salvata_il > copia.ora
            ? ` Attenzione: la bozza su Supabase (${_dataBreve(_bozzaMappe.salvata_il)}) è più recente.` : '';
        const recupera = await customConfirm(`In questo browser ci sono modifiche alle mappe non salvate nella bozza (${_dataBreve(copia.ora)}). Recuperarle?${piuRecente}`, {
            title: 'Modifiche non salvate', confirmText: 'Recupera', cancelText: 'Scarta', icon: '🗺️', isDanger: false
        });
        if (recupera) {
            _usaMappe(copia.dati, copia.base_version || versione, copia.origine || 'copia locale');
            segnaModifiche('mappe');
        } else {
            cancellaCopiaLocaleMappe();
        }
    }
    _disegnaEditorMappe();
    _inquadraPoi();
}

function _modificaMappe() {
    segnaModifiche('mappe');
    clearTimeout(_timerCopiaMappe);
    _timerCopiaMappe = setTimeout(_scriviCopiaLocale, 400);
    _aggiornaAnteprimaMappe();
}

/** Punti, aule ed edifici (senza aule) per chiave, con il JSON per il confronto e il nome da mostrare. */
function _indiceMappe(dati) {
    const indice = { punti: new Map(), aule: new Map(), edifici: new Map() };
    if (!dati) return indice;
    dati.puntiInteresse.forEach(p => indice.punti.set(p.id, { json: JSON.stringify(p), nome: p.nome || p.id }));
    dati.edifici.forEach(e => {
        const { aule, ...resto } = e;
        indice.edifici.set(e.id, { json: JSON.stringify(resto), nome: e.nome || e.id });
        (aule || []).forEach(a => indice.aule.set(`${e.id}/${a.id}`, { json: JSON.stringify(a), nome: `${a.nome || a.id} (${e.nome || e.id})` }));
    });
    return indice;
}

// Nomi degli aggiunti, modificati ed eliminati rispetto alla versione pubblicata
function _differenze(attuali, pubblicati) {
    const diff = { aggiunti: [], modificati: [], eliminati: [] };
    attuali.forEach((el, chiave) => {
        const prima = pubblicati.get(chiave);
        if (!prima) diff.aggiunti.push(el.nome);
        else if (prima.json !== el.json) diff.modificati.push(el.nome);
    });
    pubblicati.forEach((el, chiave) => { if (!attuali.has(chiave)) diff.eliminati.push(el.nome); });
    return diff;
}

function _disegnaAvvisoBozza() {
    const avviso = document.getElementById('cfg-mappe-bozza');
    if (!_bozzaMappe) { avviso.classList.add('hidden'); return; }
    const pubblicata = (_configApp && _configApp.mappa_version) || 0;
    const superata = _bozzaMappe.base_version !== pubblicata;
    avviso.innerHTML = `
        <span class="admin-ms">draft</span>
        <div class="admin-riempi">
            <strong>Bozza salvata</strong> il ${escapeHtml(_dataBreve(_bozzaMappe.salvata_il))}${_bozzaMappe.salvata_da ? ` da ${escapeHtml(_bozzaMappe.salvata_da)}` : ''}, partendo dalla v${_bozzaMappe.base_version}. Le app non la vedono finch&eacute; non la pubblichi.
            ${superata ? `<div class="admin-errore">Dopo la bozza &egrave; stata pubblicata la v${pubblicata}: pubblicando la bozza, quello che &egrave; cambiato nella v${pubblicata} e non &egrave; nella bozza andr&agrave; perso.</div>` : ''}
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-azione="scarta-bozza"><span class="admin-ms">delete</span> Scarta bozza</button>`;
    avviso.classList.remove('hidden');
}

function _aggiornaAnteprimaMappe() {
    const anteprima = document.getElementById('cfg-mappe-anteprima');
    const modificato = _modificheNonSalvate.has('mappe') && !!_mappeDati;
    const daPubblicare = !!_mappeDati && (modificato || !!_bozzaMappe);
    document.getElementById('cfg-mappe-pubblica').disabled = !daPubblicare;
    document.getElementById('cfg-mappe-salva-bozza').disabled = !modificato;
    document.getElementById('cfg-mappe-annulla').disabled = !modificato;
    document.getElementById('cfg-mappe-scarica').disabled = !_mappeDati;
    _disegnaAvvisoBozza();
    if (!daPubblicare) { anteprima.classList.add('hidden'); return; }

    const attuali = _indiceMappe(_mappeDati);
    const prossima = ((_configApp && _configApp.mappa_version) || 0) + 1;
    const confronto = _pubblicati.edifici.size > 0;
    const gruppi = [['Punti di interesse', 'punti'], ['Aule', 'aule'], ['Edifici', 'edifici']]
        .map(([titolo, chiave]) => ({ titolo, ..._differenze(attuali[chiave], _pubblicati[chiave]) }))
        .filter(g => g.aggiunti.length + g.modificati.length + g.eliminati.length > 0);
    const nomi = (etichetta, elenco) => elenco.length
        ? `<div><span class="admin-testo-sub">${etichetta}:</span> ${elenco.map(escapeHtml).join(', ')}</div>` : '';
    const dettaglio = gruppi.map(g => `
        <details class="mappe-diff">
            <summary>${g.titolo}: ${g.aggiunti.length} aggiunti &middot; ${g.modificati.length} modificati &middot; ${g.eliminati.length} eliminati</summary>
            ${nomi('Aggiunti', g.aggiunti)}${nomi('Modificati', g.modificati)}${nomi('Eliminati', g.eliminati)}
        </details>`).join('');
    anteprima.innerHTML = `
        <div class="admin-anteprima-titolo">Modifiche da pubblicare come <span class="admin-oro">v${prossima}</span> <span class="admin-testo-sub admin-piccolo">(partendo da ${escapeHtml(_mappeOrigine)})</span></div>
        <div>${attuali.edifici.size} edifici &middot; ${attuali.aule.size} aule &middot; ${attuali.punti.size} punti di interesse &middot; ${_mappeDati.lineeBus.length} linee bus</div>
        <div class="admin-anteprima-nota">${modificato ? 'Ci sono modifiche non ancora salvate nella bozza.' : 'Tutto salvato nella bozza.'}</div>
        ${confronto ? `<div class="admin-anteprima-nota">Rispetto alla versione pubblicata:</div>${dettaglio || '<div class="admin-anteprima-nota">nessuna differenza.</div>'}` : ''}`;
    anteprima.classList.remove('hidden');
}

// ----- Modo attuale: elenco, coordinate e testi -----

function _edificioAttuale() {
    return _mappeDati && _mappeDati.edifici[_edificioSel];
}

/** Elenco che si sta modificando: punti di interesse, aule dell'edificio scelto o edifici. */
function _elementiEditor() {
    if (!_mappeDati) return [];
    if (_modoEditor === 'poi') return _mappeDati.puntiInteresse;
    if (_modoEditor === 'edifici') return _mappeDati.edifici;
    const e = _edificioAttuale();
    if (e && !Array.isArray(e.aule)) e.aule = [];
    return e ? e.aule : [];
}

/** [lng, lat] dell'elemento (per gli edifici il centro), oppure null (aula senza posizione). */
function _coordElemento(el) {
    const c = _modoEditor === 'poi' ? el.coordinate
        : _modoEditor === 'aule' ? el.coordinata
        : el.centro && [el.centro.lng, el.centro.lat];
    return _coordValide(c) ? c : null;
}

function _impostaCoord(el, c) {
    if (_modoEditor === 'poi') {
        el.coordinate = c;
    } else if (_modoEditor === 'edifici') {
        if (c) el.centro = { lat: c[1], lng: c[0] };
    } else {
        el.coordinata = c;
        el.coordinate = c ? [c] : [];
    }
}

function _sottotitoloElemento(el) {
    if (_modoEditor === 'poi') return `${el.tipo || '?'}${el.descrizione ? ' · ' + el.descrizione : ''}`;
    if (_modoEditor === 'edifici') {
        const piani = Array.isArray(el.piani) ? el.piani : [];
        return `${el.codiceSede || 'senza codice sede'} · ${piani.length === 1 ? 'piano' : 'piani'} ${piani.join(', ') || '?'}` +
            ` · ${(el.aule || []).length} aule`;
    }
    return `${el.roomCode || 'senza codice'} · piano ${el.piano ?? '?'}` +
        ` · ${el.capienza ?? '?'} posti${_coordElemento(el) ? '' : ' · non sulla mappa'}`;
}

function _impostaModoEditor(modo) {
    if (modo === _modoEditor) return;
    // Passando dagli edifici alle aule si resta sull'edificio selezionato
    if (_modoEditor === 'edifici' && _poiSel >= 0) _edificioSel = _poiSel;
    _modoEditor = modo;
    _poiSel = -1;
    document.getElementById('poi-cerca').value = '';
    _disegnaEditorMappe();
    _inquadraPoi();
}

document.querySelectorAll('#poi-modo [data-modo]').forEach(b =>
    b.addEventListener('click', () => _impostaModoEditor(b.dataset.modo)));

function _disegnaEditorMappe() {
    document.getElementById('poi-vuoto').classList.toggle('hidden', !!_mappeDati);
    document.getElementById('poi-modo').classList.toggle('hidden', !_mappeDati);
    const editor = document.getElementById('poi-editor');
    editor.classList.toggle('hidden', !_mappeDati);
    _aggiornaAnteprimaMappe();
    if (!_mappeDati) return;

    const aule = _modoEditor === 'aule';
    editor.dataset.modo = _modoEditor;
    document.querySelectorAll('#poi-modo [data-modo]').forEach(b => b.classList.toggle('active', b.dataset.modo === _modoEditor));
    document.getElementById('poi-cerca').placeholder = {
        poi: 'Cerca per nome, descrizione o id', aule: 'Cerca per nome, codice o id', edifici: 'Cerca per nome, codice sede o id',
    }[_modoEditor];
    document.getElementById('poi-aggiungi-testo').textContent = aule ? 'Aggiungi aula' : 'Aggiungi punto';
    document.getElementById('poi-elimina-testo').textContent = aule ? 'Elimina aula' : 'Elimina punto';

    // Tipi esistenti: filtro e suggerimenti del campo Tipo
    const tipi = [...new Set(_mappeDati.puntiInteresse.map(p => p.tipo).filter(Boolean))].sort();
    const filtro = document.getElementById('poi-filtro-tipo');
    const scelto = filtro.value;
    filtro.innerHTML = '<option value="">Tutti i tipi</option>' +
        tipi.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    filtro.value = tipi.includes(scelto) ? scelto : '';
    document.getElementById('poi-tipi').innerHTML = tipi.map(t => `<option value="${escapeHtml(t)}">`).join('');

    // Edifici in ordine di nome (il valore resta l'indice nel JSON)
    document.getElementById('poi-edificio').innerHTML = _mappeDati.edifici
        .map((e, i) => ({ e, i }))
        .sort((x, y) => (x.e.nome || x.e.id).localeCompare(y.e.nome || y.e.id, 'it'))
        .map(({ e, i }) => `<option value="${i}">${escapeHtml(e.nome || e.id)} (${(e.aule || []).length})</option>`).join('');
    document.getElementById('poi-edificio').value = String(_edificioSel);
    // Icone già usate dagli edifici: suggerimenti del campo Icona
    document.getElementById('edificio-icone').innerHTML = [...new Set(_mappeDati.edifici.map(e => e.icona).filter(Boolean))].sort()
        .map(i => `<option value="${escapeHtml(i)}">`).join('');

    _inizializzaMappaPoi();
    _disegnaEdificiPoi();
    _selezionaPoi(_poiSel < _elementiEditor().length ? _poiSel : -1, false);
}

function _inizializzaMappaPoi() {
    if (typeof L === 'undefined') return; // Leaflet non caricato: resta l'elenco
    if (_poiMappa) {
        // La mappa creata con la sezione nascosta va rimisurata
        setTimeout(() => _poiMappa.invalidateSize(), 0);
        return;
    }
    _poiMappa = L.map('poi-mappa');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20, maxNativeZoom: 19, attribution: '&copy; OpenStreetMap',
    }).addTo(_poiMappa);
    _poiEdifici = L.layerGroup().addTo(_poiMappa);
    _poiStrato = L.layerGroup().addTo(_poiMappa);
}

// Perimetri degli edifici come riferimento; nei modi aule ed edifici quello scelto è evidenziato
function _disegnaEdificiPoi() {
    if (!_poiMappa) return;
    _poiEdifici.clearLayers();
    _mappeDati.edifici.forEach((e, i) => {
        if (!Array.isArray(e.perimetro) || e.perimetro.length < 3) return;
        const scelto = (_modoEditor === 'aule' && i === _edificioSel) || (_modoEditor === 'edifici' && i === _poiSel);
        L.polygon(e.perimetro.map(([lng, lat]) => [lat, lng]), {
            color: COLORE_AULA, weight: scelto ? 2.5 : 1, fillOpacity: scelto ? 0.18 : 0.06, interactive: false,
        }).addTo(_poiEdifici);
    });
}

function _poiVisibili() {
    const testo = document.getElementById('poi-cerca').value.trim().toLowerCase();
    const tipo = _modoEditor === 'poi' ? document.getElementById('poi-filtro-tipo').value : '';
    return _elementiEditor()
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => (!tipo || p.tipo === tipo) &&
            (!testo || [p.nome, p.descrizione, p.roomCode, p.codiceSede, p.id].some(v => String(v ?? '').toLowerCase().includes(testo))));
}

function _disegnaPoi() {
    const visibili = _poiVisibili();
    const elenco = document.getElementById('poi-elenco');
    const vuoto = _modoEditor === 'aule' && _elementiEditor().length === 0 ? 'Nessuna aula in questo edificio.' : 'Nessun elemento trovato.';
    elenco.innerHTML = visibili.length ? visibili.map(({ p, i }) => `
        <button type="button" class="poi-riga${i === _poiSel ? ' attiva' : ''}" data-poi="${i}">
            <span class="poi-pallino${_coordElemento(p) ? '' : ' vuoto'}" style="--colore:${_coloreElemento(p)}"></span>
            <span class="admin-riempi">
                <span class="poi-riga-nome">${escapeHtml(p.nome || '(senza nome)')}</span>
                <span class="admin-testo-sub admin-piccolo">${escapeHtml(_sottotitoloElemento(p))}</span>
            </span>
        </button>`).join('')
        : `<div class="admin-testo-sub admin-piccolo poi-elenco-vuoto">${vuoto}</div>`;
    elenco.querySelectorAll('[data-poi]').forEach(b =>
        b.addEventListener('click', () => _selezionaPoi(Number(b.dataset.poi), true)));

    if (!_poiMappa) return;
    _poiStrato.clearLayers();
    visibili.forEach(({ p, i }) => {
        if (i === _poiSel) return; // il selezionato ha il suo segnaposto trascinabile
        const c = _coordElemento(p);
        if (!c) return;
        L.circleMarker([c[1], c[0]], {
            radius: 7, color: '#111', weight: 1.5, fillColor: _coloreElemento(p), fillOpacity: 0.95,
        }).bindTooltip(escapeHtml(p.nome || p.id)).on('click', () => _selezionaPoi(i, false)).addTo(_poiStrato);
    });
}

// Inquadra gli elementi visibili; nel modo aule anche il perimetro dell'edificio
function _inquadraPoi() {
    if (!_poiMappa || !_mappeDati) return;
    const punti = _poiVisibili().map(({ p }) => _coordElemento(p)).filter(Boolean).map(([lng, lat]) => [lat, lng]);
    const e = _modoEditor === 'aule' && _edificioAttuale();
    if (e) {
        (e.perimetro || []).forEach(([lng, lat]) => punti.push([lat, lng]));
        if (e.centro && Number.isFinite(e.centro.lat)) punti.push([e.centro.lat, e.centro.lng]);
    }
    if (punti.length) _poiMappa.fitBounds(punti, { padding: [30, 30], maxZoom: 18 });
    else _poiMappa.setView([40.35, 18.15], 13);
}

function _poiSelezionato() {
    return _mappeDati && _poiSel >= 0 ? _elementiEditor()[_poiSel] || null : null;
}

function _compilaCoordinatePoi(p) {
    const c = _coordElemento(p);
    document.getElementById('poi-lat').value = c ? c[1] : '';
    document.getElementById('poi-lng').value = c ? c[0] : '';
    document.getElementById('poi-lat').classList.remove('poi-errore');
    document.getElementById('poi-lng').classList.remove('poi-errore');
    document.getElementById('aula-posiziona-testo').textContent = c ? 'Togli dalla mappa' : 'Metti sulla mappa';
}

// Segnaposto trascinabile dell'elemento selezionato (se ha una posizione)
function _mettiSegnaposto(p) {
    if (_poiMarker) { _poiMarker.remove(); _poiMarker = null; }
    const c = _coordElemento(p);
    if (!_poiMappa || !c) return;
    _poiMarker = L.marker([c[1], c[0]], {
        draggable: true,
        zIndexOffset: 1000,
        icon: L.divIcon({ className: 'poi-segnaposto', html: `<span style="background:${_coloreElemento(p)}"></span>`, iconSize: [26, 26], iconAnchor: [13, 26] }),
    }).addTo(_poiMappa);
    _poiMarker.on('dragend', () => {
        const pos = _poiMarker.getLatLng();
        _impostaCoord(p, [Number(pos.lng.toFixed(7)), Number(pos.lat.toFixed(7))]);
        _compilaCoordinatePoi(p);
        _modificaMappe();
    });
}

// Seleziona un elemento (-1 = nessuno): compila i campi e mette il segnaposto trascinabile.
// centra = porta la mappa sull'elemento
function _selezionaPoi(indice, centra) {
    _poiSel = indice;
    const p = _poiSelezionato();
    if (!p) _poiSel = -1;
    document.getElementById('poi-form').classList.toggle('hidden', !p);
    _disegnaPoi();
    if (_modoEditor === 'edifici') _disegnaEdificiPoi();
    _mettiSegnaposto(p || {});
    if (!p) return;

    document.getElementById('poi-nome').value = p.nome || '';
    // L'id degli edifici lo usano le aule e l'app: qui non si cambia
    const campoId = document.getElementById('poi-id');
    campoId.value = p.id || '';
    campoId.disabled = _modoEditor === 'edifici';
    document.getElementById('poi-tipo').value = p.tipo || '';
    document.getElementById('poi-descrizione').value = p.descrizione || '';
    document.getElementById('aula-roomcode').value = p.roomCode || '';
    document.getElementById('aula-capienza').value = p.capienza ?? '';
    document.getElementById('aula-capienza').classList.remove('poi-errore');
    if (_modoEditor === 'aule') _compilaPianoAula(p);
    if (_modoEditor === 'edifici') _compilaEdificio(p);
    _compilaCoordinatePoi(p);
    document.querySelector(`.poi-riga[data-poi="${indice}"]`)?.scrollIntoView({ block: 'nearest' });

    const c = _coordElemento(p);
    if (centra && c && _poiMappa) _poiMappa.setView([c[1], c[0]], Math.max(_poiMappa.getZoom(), 17));
}

// Campi di testo dell'elemento selezionato
[['poi-nome', 'nome'], ['poi-tipo', 'tipo'], ['poi-id', 'id'], ['poi-descrizione', 'descrizione'], ['aula-roomcode', 'roomCode'],
    ['edificio-codice', 'codiceSede'], ['edificio-icona', 'icona']].forEach(([idCampo, chiave]) =>
    document.getElementById(idCampo)?.addEventListener('input', (e) => {
        const p = _poiSelezionato();
        if (!p) return;
        p[chiave] = chiave === 'descrizione' ? e.target.value : e.target.value.trim();
        _modificaMappe();
        _disegnaPoi();
        const segno = _poiMarker && _poiMarker.getElement()?.querySelector('span');
        if (chiave === 'tipo' && segno) segno.style.background = _colorePoi(p.tipo);
    }));

// Capienza delle aule: intero non negativo
document.getElementById('aula-capienza')?.addEventListener('input', (e) => {
    const p = _poiSelezionato();
    if (!p) return;
    const testo = e.target.value.trim();
    const n = Number(testo);
    const valido = testo !== '' && Number.isInteger(n) && n >= 0;
    e.target.classList.toggle('poi-errore', !valido);
    if (!valido) return;
    p.capienza = n;
    _modificaMappe();
    _disegnaPoi();
});

// Piano dell'aula: uno dei piani dell'edificio (si aggiungono nel modo Edifici).
// Un piano che non è nell'elenco resta scelto, segnalato, finché non lo si cambia.
function _compilaPianoAula(aula) {
    const ed = _edificioAttuale();
    const piani = ed && Array.isArray(ed.piani) ? ed.piani : [];
    const fuori = Number.isInteger(aula.piano) && !piani.includes(aula.piano);
    const campo = document.getElementById('aula-piano');
    campo.innerHTML = piani.map(n => `<option value="${n}">${escapeHtml(_nomePiano(n))}</option>`).join('') +
        (fuori ? `<option value="${aula.piano}">${escapeHtml(_nomePiano(aula.piano))} (non tra i piani dell'edificio)</option>` : '');
    campo.value = String(aula.piano);
    campo.classList.toggle('poi-errore', fuori);
}

document.getElementById('aula-piano')?.addEventListener('change', (e) => {
    const p = _poiSelezionato();
    if (!p || _modoEditor !== 'aule') return;
    p.piano = Number(e.target.value);
    _compilaPianoAula(p);
    _modificaMappe();
    _disegnaPoi();
});

// ----- Modo edifici: codice sede, icona, zoom e piani -----

function _compilaEdificio(ed) {
    document.getElementById('edificio-codice').value = ed.codiceSede || '';
    document.getElementById('edificio-icona').value = ed.icona || '';
    document.getElementById('edificio-zoom').value = ed.zoomIniziale ?? '';
    document.getElementById('edificio-zoom').classList.remove('poi-errore');
    document.getElementById('edificio-nuovo-piano').value = '';
    document.getElementById('edificio-nuovo-piano').classList.remove('poi-errore');
    _disegnaPianiEdificio(ed);
}

function _disegnaPianiEdificio(ed) {
    const piani = Array.isArray(ed.piani) ? ed.piani : [];
    document.getElementById('edificio-piani').innerHTML = piani.map(n => {
        const aule = (ed.aule || []).filter(a => a.piano === n).length;
        return `<span class="edificio-piano">${escapeHtml(_nomePiano(n))}
            <span class="admin-testo-sub admin-piccolo">${aule} ${aule === 1 ? 'aula' : 'aule'}</span>
            <button type="button" data-piano="${n}" title="Togli ${escapeHtml(_nomePiano(n).toLowerCase())}" aria-label="Togli ${escapeHtml(_nomePiano(n).toLowerCase())}"><span class="admin-ms">close</span></button>
        </span>`;
    }).join('') || '<span class="admin-testo-sub admin-piccolo">Nessun piano</span>';
}

document.getElementById('edificio-zoom')?.addEventListener('input', (e) => {
    const ed = _poiSelezionato();
    if (!ed || _modoEditor !== 'edifici') return;
    const n = Number(e.target.value.trim().replace(',', '.'));
    const valido = e.target.value.trim() !== '' && Number.isFinite(n) && n >= 1 && n <= 22;
    e.target.classList.toggle('poi-errore', !valido);
    if (!valido) return;
    ed.zoomIniziale = n;
    _modificaMappe();
});

// Un piano si toglie solo se non ci sono aule (e ne resta almeno uno)
document.getElementById('edificio-piani')?.addEventListener('click', (e) => {
    const pulsante = e.target.closest('[data-piano]');
    const ed = _poiSelezionato();
    if (!pulsante || !ed || _modoEditor !== 'edifici') return;
    const n = Number(pulsante.dataset.piano);
    const aule = (ed.aule || []).filter(a => a.piano === n);
    if (aule.length) {
        const quante = aule.length === 1 ? 'c\'è 1 aula' : `ci sono ${aule.length} aule`;
        showToast(`Al ${_nomePiano(n).toLowerCase()} ${quante} (${aule.map(a => a.nome || a.id).join(', ')}): spostale su un altro piano prima di toglierlo`, 'error');
        return;
    }
    if (ed.piani.length <= 1) {
        showToast('Un edificio deve avere almeno un piano', 'error');
        return;
    }
    ed.piani = ed.piani.filter(x => x !== n);
    _modificaMappe();
    _disegnaPianiEdificio(ed);
    _disegnaPoi();
});

function _aggiungiPianoEdificio() {
    const ed = _poiSelezionato();
    if (!ed || _modoEditor !== 'edifici') return;
    const campo = document.getElementById('edificio-nuovo-piano');
    const testo = campo.value.trim();
    const n = Number(testo);
    const valido = testo !== '' && Number.isInteger(n);
    campo.classList.toggle('poi-errore', !valido);
    if (!valido) return;
    const piani = Array.isArray(ed.piani) ? ed.piani : [];
    if (piani.includes(n)) {
        showToast(`Il ${_nomePiano(n).toLowerCase()} c'è già`, 'error');
        return;
    }
    ed.piani = [...piani, n].sort((a, b) => a - b);
    campo.value = '';
    _modificaMappe();
    _disegnaPianiEdificio(ed);
    _disegnaPoi();
}

document.getElementById('edificio-aggiungi-piano')?.addEventListener('click', _aggiungiPianoEdificio);
document.getElementById('edificio-nuovo-piano')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    _aggiungiPianoEdificio();
});

// Coordinate scritte a mano. In un campo si può incollare la coppia "lat, lng" copiata da Google Maps.
// Per le aule i due campi vuoti tolgono la posizione.
['poi-lat', 'poi-lng'].forEach(idCampo =>
    document.getElementById(idCampo)?.addEventListener('input', (e) => {
        const p = _poiSelezionato();
        if (!p) return;
        const latEl = document.getElementById('poi-lat');
        const lngEl = document.getElementById('poi-lng');
        const coppia = e.target.value.match(/^\s*(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)\s*$/);
        if (coppia) {
            latEl.value = coppia[1];
            lngEl.value = coppia[2];
        }
        if (_modoEditor === 'aule' && !latEl.value.trim() && !lngEl.value.trim()) {
            _impostaCoord(p, null);
            _compilaCoordinatePoi(p);
            _modificaMappe();
            _selezionaPoi(_poiSel, false);
            return;
        }
        const lat = parseFloat(latEl.value.replace(',', '.'));
        const lng = parseFloat(lngEl.value.replace(',', '.'));
        const valide = _coordValide([lng, lat]);
        latEl.classList.toggle('poi-errore', !valide);
        lngEl.classList.toggle('poi-errore', !valide);
        if (!valide) return;
        const nuova = !_coordElemento(p);
        _impostaCoord(p, [lng, lat]);
        _modificaMappe();
        document.getElementById('aula-posiziona-testo').textContent = 'Togli dalla mappa';
        if (nuova) { _disegnaPoi(); _mettiSegnaposto(p); }
        else if (_poiMarker) _poiMarker.setLatLng([lat, lng]);
        if (_poiMappa) _poiMappa.panTo([lat, lng]);
    }));

document.getElementById('poi-cerca')?.addEventListener('input', () => _disegnaPoi());
document.getElementById('poi-filtro-tipo')?.addEventListener('change', () => { _disegnaPoi(); _inquadraPoi(); });
document.getElementById('poi-edificio')?.addEventListener('change', (e) => {
    _edificioSel = Number(e.target.value);
    _poiSel = -1;
    document.getElementById('poi-cerca').value = '';
    _disegnaEdificiPoi();
    _selezionaPoi(-1, false);
    _inquadraPoi();
});

/** Centro della mappa come [lng, lat] (posizione dei nuovi elementi). */
function _centroMappa() {
    const c = _poiMappa ? _poiMappa.getCenter() : { lat: 40.35, lng: 18.15 };
    return [Number(c.lng.toFixed(7)), Number(c.lat.toFixed(7))];
}

// "Metti sulla mappa" (al centro della vista) / "Togli dalla mappa" per l'aula selezionata
document.getElementById('aula-posiziona')?.addEventListener('click', () => {
    const p = _poiSelezionato();
    if (!p) return;
    _impostaCoord(p, _coordElemento(p) ? null : _centroMappa());
    _modificaMappe();
    _selezionaPoi(_poiSel, false);
});

/** Primo id libero del tipo base_1, base_2... */
function _idLibero(base, elementi) {
    const ids = new Set(elementi.map(el => el.id));
    let n = 1;
    while (ids.has(`${base}_${n}`)) n++;
    return `${base}_${n}`;
}

// Nuovo elemento: il punto va al centro della mappa, l'aula senza posizione (si aggiunge dopo)
document.getElementById('poi-aggiungi')?.addEventListener('click', () => {
    if (!_mappeDati || _modoEditor === 'edifici') return;
    const elementi = _elementiEditor();
    if (_modoEditor === 'poi') {
        elementi.push({
            id: _idLibero('nuovo_punto', elementi),
            nome: 'Nuovo punto',
            descrizione: '',
            tipo: document.getElementById('poi-filtro-tipo').value || 'bar',
            coordinate: _centroMappa(),
        });
    } else {
        const ed = _edificioAttuale();
        if (!ed) return;
        elementi.push({
            id: _idLibero('nuova_aula', elementi),
            nome: 'Nuova aula',
            roomCode: '',
            piano: Array.isArray(ed.piani) && ed.piani.length ? (ed.piani.includes(0) ? 0 : ed.piani[0]) : 0,
            coordinata: null,
            coordinate: [],
            ...AULA_STATO_INIZIALE,
            capienza: 0,
        });
    }
    document.getElementById('poi-cerca').value = '';
    _modificaMappe();
    if (_modoEditor === 'aule') _disegnaEditorMappe(); // aggiorna il conteggio nel menu degli edifici
    _selezionaPoi(elementi.length - 1, false);
    const nome = document.getElementById('poi-nome');
    nome.focus();
    nome.select();
});

document.getElementById('poi-elimina')?.addEventListener('click', async () => {
    const p = _poiSelezionato();
    if (!p || _modoEditor === 'edifici') return;
    const cosa = _modoEditor === 'aule' ? `l'aula "${p.nome || p.id}" di ${_edificioAttuale().nome || _edificioAttuale().id}` : `"${p.nome || p.id}"`;
    if (!(await customConfirm(`Eliminare ${cosa}? Sparirà dalle app solo dopo la pubblicazione.`, {
        title: _modoEditor === 'aule' ? 'Elimina aula' : 'Elimina punto', confirmText: 'Elimina', icon: '📍', isDanger: true
    }))) return;
    _elementiEditor().splice(_poiSel, 1);
    _modificaMappe();
    _poiSel = -1;
    _disegnaEditorMappe();
});

// Scelta di un file: sostituisce tutto il contenuto in modifica (niente viene caricato qui)
document.getElementById('cfg-mappe-file')?.addEventListener('change', async (e) => {
    const anteprima = document.getElementById('cfg-mappe-anteprima');
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
        let dati;
        try {
            dati = JSON.parse(await file.text());
        } catch (err) {
            throw new Error('il file non è un JSON valido (' + err.message + ')');
        }
        _validaMappe(dati);
        _edificioSel = 0;
        _usaMappe(dati, (_configApp && _configApp.mappa_version) || 0, file.name);
        _modificaMappe();
        _disegnaEditorMappe();
        _inquadraPoi();
    } catch (err) {
        anteprima.innerHTML = `<span class="admin-errore">File non valido: ${escapeHtml(err.message)}</span>`;
        anteprima.classList.remove('hidden');
    } finally {
        e.target.value = '';
    }
});

// Copia di sicurezza (o da rimettere nel repository dell'app)
document.getElementById('cfg-mappe-scarica')?.addEventListener('click', () => {
    if (!_mappeDati) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(_mappeDati, null, 2)], { type: 'application/json' }));
    link.download = 'mappe.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

document.getElementById('cfg-mappe-annulla')?.addEventListener('click', async () => {
    const dove = _bozzaMappe ? 'all\'ultima bozza salvata' : 'alla versione pubblicata';
    if (!(await customConfirm(`Scartare le modifiche non salvate e tornare ${dove}?`, {
        title: 'Annulla modifiche', confirmText: 'Scarta', icon: '🗺️', isDanger: true
    }))) return;
    azzeraModifiche('mappe');
    cancellaCopiaLocaleMappe();
    caricaEditorMappe();
});

// Salva bozza: il JSON in modifica va nel bucket, ma config_app non cambia e le app non lo vedono.
// Se un altro admin ha salvato la bozza dopo che è stata aperta qui, si chiede prima di sovrascriverla.
document.getElementById('cfg-mappe-salva-bozza')?.addEventListener('click', async () => {
    if (!_mappeDati) return;
    const pulsante = document.getElementById('cfg-mappe-salva-bozza');
    pulsante.disabled = true;
    try {
        const remota = await leggiBozzaMappe();
        if (remota && remota.salvata_il !== (_bozzaMappe && _bozzaMappe.salvata_il) &&
            !(await customConfirm(`La bozza è stata salvata di nuovo il ${_dataBreve(remota.salvata_il)}${remota.salvata_da ? ` da ${remota.salvata_da}` : ''}, dopo che l'hai aperta. Sovrascriverla con le tue modifiche?`, {
                title: 'Bozza cambiata', confirmText: 'Sovrascrivi', icon: '🗺️', isDanger: true
            }))) {
            pulsante.disabled = false;
            return;
        }
        const bozza = {
            base_version: _mappeBase,
            salvata_il: new Date().toISOString(),
            salvata_da: userEmailDisplay.textContent || '',
            dati: _mappeDati,
        };
        const gz = await _gzip(new TextEncoder().encode(JSON.stringify(bozza)));
        const { error } = await _supabase.storage.from(BUCKET_MAPPE).upload(
            BOZZA_MAPPE,
            new Blob([gz], { type: 'application/gzip' }),
            { upsert: true, contentType: 'application/gzip', cacheControl: '0' }
        );
        if (error) throw new Error(error.message);
        _bozzaMappe = { base_version: bozza.base_version, salvata_il: bozza.salvata_il, salvata_da: bozza.salvata_da };
        _mappeOrigine = `bozza del ${_dataBreve(bozza.salvata_il)}`;
        azzeraModifiche('mappe');
        cancellaCopiaLocaleMappe();
        _aggiornaAnteprimaMappe();
        showToast('Bozza salvata: le app non la vedono finché non pubblichi');
    } catch (err) {
        showToast('Errore nel salvataggio della bozza: ' + err.message, 'error');
        pulsante.disabled = false;
    }
});

document.getElementById('cfg-mappe-bozza')?.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-azione="scarta-bozza"]')) return;
    const nonSalvate = _modificheNonSalvate.has('mappe') ? ' Anche le modifiche non salvate andranno perse.' : '';
    if (!(await customConfirm(`Eliminare la bozza e ripartire dalla versione pubblicata?${nonSalvate}`, {
        title: 'Scarta bozza', confirmText: 'Elimina bozza', icon: '🗺️', isDanger: true
    }))) return;
    const { error } = await _supabase.storage.from(BUCKET_MAPPE).remove([BOZZA_MAPPE]);
    if (error) {
        showToast('Errore nell\'eliminazione della bozza: ' + error.message, 'error');
        return;
    }
    azzeraModifiche('mappe');
    cancellaCopiaLocaleMappe();
    showToast('Bozza eliminata');
    caricaEditorMappe();
});

async function _registraMappe(versione, path, sha256, byte) {
    return _supabase.from('config_app').update({
        mappa_version: versione,
        mappa_path: path,
        mappa_sha256: sha256,
        mappa_bytes: byte,
    }).eq('id', 1);
}

// Pubblicazione: JSON compatto, firmato (SHA-256) e compresso (gzip) nel browser
document.getElementById('cfg-mappe-pubblica')?.addEventListener('click', async () => {
    if (!_mappeDati) return;
    try {
        _validaMappe(_mappeDati);
    } catch (err) {
        showToast('Impossibile pubblicare: ' + err.message, 'error');
        return;
    }
    // Versione pubblicata letta adesso: un altro admin può aver pubblicato dopo l'apertura della pagina
    const { data: config, error: errVersione } = await _supabase.from('config_app').select('mappa_version').eq('id', 1).single();
    if (errVersione) {
        showToast('Impossibile leggere la versione pubblicata: ' + errVersione.message, 'error');
        return;
    }
    const pubblicata = config.mappa_version || 0;
    const versione = pubblicata + 1;
    const path = `mappe_v${versione}.json.gz`;
    const superata = pubblicata !== _mappeBase
        ? ` Attenzione: le modifiche partono dalla v${_mappeBase}, ma intanto è stata pubblicata la v${pubblicata}: quello che è cambiato nella v${pubblicata} e non è qui andrà perso.` : '';
    if (!(await customConfirm(`Pubblicare le mappe come v${versione}? Tutte le app le scaricheranno al prossimo controllo.${superata}`, {
        title: 'Pubblica mappe', confirmText: 'Pubblica', icon: '🗺️', isDanger: !!superata
    }))) return;

    const pulsante = document.getElementById('cfg-mappe-pubblica');
    pulsante.disabled = true;
    pulsante.textContent = 'Pubblicazione...';
    try {
        const compatto = new TextEncoder().encode(JSON.stringify(_mappeDati));
        const sha256 = _hex(await crypto.subtle.digest('SHA-256', compatto));
        const gz = await _gzip(compatto);

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

        // 3. La bozza è stata pubblicata: si elimina (se non c'era, remove non fa nulla)
        const { error: errBozza } = await _supabase.storage.from(BUCKET_MAPPE).remove([BOZZA_MAPPE]);
        showToast(errBozza
            ? `Mappe pubblicate come v${versione}, ma la bozza non è stata eliminata (${errBozza.message}): scartala a mano`
            : `Mappe pubblicate come v${versione} (${_kb(gz.byteLength)})`, errBozza ? 'error' : undefined);
        azzeraModifiche('mappe');
        cancellaCopiaLocaleMappe();
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
