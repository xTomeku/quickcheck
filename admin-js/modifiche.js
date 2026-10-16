// Pannello admin - Modifiche all'orario: sezione "Modifiche orario", azioni usate anche dal riquadro
// "Modifiche sospette" della Panoramica (admin-js/panoramica.js) e nomi di corsi e percorsi
// (usati anche da Iscrizioni per corso, admin-js/iscrizioni.js).
// Dati: modifiche_orario e invii_automatici. Permessi e colonna controllata_il:
// _redesign/sql/pannello_modifiche_iscrizioni.sql. Nomi dal portale: Edge Function etichette-corsi.

// =====================================================================
// Nomi dei corsi e dei percorsi (Edge Function etichette-corsi)
// =====================================================================
let _etichetteCorsi = null; // Promise di { LB55R: { nome, tipo, percorsi } } oppure null

// I nomi servono solo a rendere leggibili i codici: se la lettura non riesce si mostrano i codici
// e si riprova alla prossima apertura
function leggiEtichetteCorsi() {
    if (!_etichetteCorsi) {
        _etichetteCorsi = (async () => {
            const { data: { session } } = await _supabase.auth.getSession();
            const token = session ? session.access_token : window.SUPABASE_KEY;
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/etichette-corsi`, {
                headers: { apikey: window.SUPABASE_KEY, Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return (await res.json()).corsi || {};
        })().catch(err => {
            console.warn('Nomi dei corsi non disponibili:', err);
            _etichetteCorsi = null;
            return null;
        });
    }
    return _etichetteCorsi;
}

// Sigle e numeri romani che restano maiuscoli: "ANALISI MATEMATICA I", "(COGNOMI A-L)", "PER LA IOT"
const _MAIUSCOLE = /^(I{1,3}|IV|VI{0,3}|IX|X|IA|ICT|IOT|UE|[A-Z]-[A-Z]|C\.I\.|B\.I\.)$/;

// "INGEGNERIA INFORMATICA" -> "Ingegneria informatica"
function nomeLeggibile(testo) {
    const t = String(testo || '').trim();
    if (!t) return '';
    const parole = t.split(/(\s+)/).map(p => (_MAIUSCOLE.test(p.replace(/^[("'«]+|[)"'»,:;]+$/g, '')) ? p : p.toLowerCase())).join('');
    return parole.charAt(0).toUpperCase() + parole.slice(1);
}

// "031|3" -> { codice: '031', anno: 3 }
function annoPercorso(percorso) {
    const [codice, anno] = String(percorso || '').split('|');
    return { codice: codice || '', anno: Number(anno) || null };
}

// Nome del percorso senza "3 - " e senza i nomi generici ("Percorso comune", "Generico/comune"...)
function nomePercorso(etichette, idCorso, percorso) {
    const testo = etichette && etichette[idCorso] && etichette[idCorso].percorsi && etichette[idCorso].percorsi[percorso];
    if (!testo) return '';
    const nome = String(testo).replace(/^\d+\s*-\s*/, '').trim();
    return /^(percors[oi]\s+)?(comune|generico|generale)(\s*\/\s*(comune|generico))?$/i.test(nome) ? '' : nomeLeggibile(nome);
}

// "Filosofia · 3° anno · Classico" (senza nomi: "LB16 · 3° anno")
function descriviCorso(etichette, idCorso, percorso) {
    if (idCorso === 'TEST') return 'Corso TEST (simulatore)';
    const info = etichette && etichette[idCorso];
    const nome = info ? nomeLeggibile(info.nome) + (/magistrale/i.test(info.tipo || '') ? ' (magistrale)' : '') : idCorso;
    const { anno } = annoPercorso(percorso);
    return [nome, anno ? `${anno}° anno` : '', nomePercorso(etichette, idCorso, percorso)].filter(Boolean).join(' · ');
}

// =====================================================================
// Modifiche: lettura, sospetto, segno "non sospetta", eliminazione
// =====================================================================
const MOD_TIPI = {
    cambio_aula:   { nome: 'Cambio aula',   stato: 'info',  icona: 'meeting_room' },
    cambio_orario: { nome: 'Cambio orario', stato: 'att',   icona: 'schedule' },
    spostamento:   { nome: 'Spostamento',   stato: 'viola', icona: 'event_repeat' },
    annullamento:  { nome: 'Annullamento',  stato: 'ko',    icona: 'event_busy' },
    aggiunta:      { nome: 'Nuova lezione', stato: 'ok',    icona: 'event_available' },
};
const _modTipo = m => MOD_TIPI[m.tipo] || { nome: m.tipo, stato: '', icona: 'event' };

const modificaAttiva = m => new Date(m.scade_il).getTime() > Date.now();
const modificaDiTest = m => m.id_corso === 'TEST';

// Prima e dopo identici, oppure uno "spostamento" che resta nello stesso giorno: i falsi avvisi
// della notte del 7 ottobre 2026 erano così. Gli annullamenti hanno prima e dopo uguali di natura.
function motivoSospetto(m) {
    if (m.tipo === 'annullamento' || !m.prima || !m.dopo) return '';
    const chiave = d => [d.data, d.ora_inizio, d.ora_fine, String(d.aula || '').trim()].join('|');
    if (chiave(m.prima) === chiave(m.dopo)) return 'Prima e dopo sono uguali';
    if (m.tipo === 'spostamento' && m.prima.data === m.dopo.data) return 'Spostamento nello stesso giorno';
    return '';
}
const modificaSospetta = m => !m.controllata_il && !!motivoSospetto(m);

// Tutte le modifiche registrate (la pulizia notturna toglie quelle di lezioni finite da 14 giorni).
// conInvii: aggiunge a ogni modifica l'elenco dei suoi invii { inviato_il, esito }.
async function leggiModificheOrario(conInvii = false) {
    const r = await _supabase.from('modifiche_orario')
        .select('id, tipo, id_corso, anno, percorso, insegnamento, data_lezione, prima, dopo, scade_il, origine, rilevata_il, controllata_il')
        .order('rilevata_il', { ascending: false })
        .order('id', { ascending: false });
    if (r.error) throw r.error;
    const modifiche = r.data || [];
    if (conInvii && modifiche.length) {
        const invii = await _leggiInvii(modifiche.map(m => m.id));
        modifiche.forEach(m => { m.invii = invii.get(m.id) || []; });
    }
    return modifiche;
}

async function _leggiInvii(ids) {
    const r = await _supabase.from('invii_automatici').select('modifica_id, inviato_il, esito')
        .in('modifica_id', ids).order('inviato_il', { ascending: true });
    if (r.error) throw r.error;
    const perModifica = new Map();
    for (const i of r.data || []) {
        if (!perModifica.has(i.modifica_id)) perModifica.set(i.modifica_id, []);
        perModifica.get(i.modifica_id).push(i);
    }
    return perModifica;
}

const _modInviatoOggi = i => new Date(i.inviato_il).toDateString() === new Date().toDateString();

// Scrive controllata_il (data = segnata come non sospetta, null = di nuovo da controllare)
async function _modImpostaControllata(ids, valore) {
    const { data, error } = await _supabase.from('modifiche_orario').update({ controllata_il: valore }).in('id', ids).select('id');
    if (error) throw error;
    // Senza il permesso di modifica Supabase non dà errore ma non cambia nessuna riga
    if (!data || data.length < ids.length) throw new Error('il pannello non ha il permesso di modificare le modifiche (script SQL)');
}

// "Non sospetta": la modifica resta e smette di essere segnalata. Il messaggio permette di annullare.
async function segnaNonSospette(modifiche) {
    const ids = modifiche.map(m => m.id);
    if (!ids.length) return;
    try {
        await _modImpostaControllata(ids, new Date().toISOString());
    } catch (err) {
        showToast('Non salvato: ' + escapeHtml(err.message || String(err)), 'error');
        return;
    }
    _modDopoCambio();
    showToast(ids.length === 1 ? 'Segnata come non sospetta' : `${ids.length} modifiche segnate come non sospette`, 'success', {
        etichetta: 'Annulla',
        fai: async () => {
            try {
                await _modImpostaControllata(ids, null);
                _modDopoCambio();
            } catch (err) {
                showToast('Non annullato: ' + escapeHtml(err.message || String(err)), 'error');
            }
        },
    });
}

// "mar 20/10" da una data YYYY-MM-DD
function _modGiorno(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return `${d.toLocaleDateString('it-IT', { weekday: 'short' })} ${d.getDate()}/${d.getMonth() + 1}`;
}

// "13/10 03:00"
function _modQuando(quando) {
    return new Date(quando).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

// Elimina dopo la conferma. Si cancellano anche gli invii (on delete cascade): il conteggio
// "Push inviate oggi" della Panoramica scende.
async function eliminaModificheOrario(modifiche) {
    const ids = modifiche.map(m => m.id);
    if (!ids.length) return;
    let invii = null;
    try {
        invii = [...(await _leggiInvii(ids)).values()].flat();
    } catch (_) { /* il messaggio resta valido anche senza il numero di invii */ }

    const attive = modifiche.filter(modificaAttiva).length;
    const una = modifiche.length === 1;
    const righe = [una
        ? `${nomeLeggibile(modifiche[0].insegnamento)} · ${_modTipo(modifiche[0]).nome.toLowerCase()} del ${_modGiorno((modifiche[0].dopo || modifiche[0].prima || {}).data)}`
        : [attive ? `${attive} ${attive === 1 ? 'attiva' : 'attive'}` : '', modifiche.length - attive ? `${modifiche.length - attive} ${modifiche.length - attive === 1 ? 'scaduta' : 'scadute'}` : ''].filter(Boolean).join(', '), ''];
    if (attive) {
        righe.push(`• ${una ? 'Non arriva' : 'Non arrivano'} più a chi si iscrive da adesso e ${una ? 'sparisce' : 'spariscono'} dagli avvisi recenti dell'app.`);
        righe.push(`• Chi l'ha già ricevuta non riceve una correzione: se l'avviso era sbagliato, mandane uno da Push e avvisi.`);
    }
    if (invii) {
        const oggi = invii.filter(_modInviatoOggi).length;
        righe.push(invii.length
            ? `• Si cancellano anche ${invii.length === 1 ? "l'invio registrato" : `i ${invii.length} invii registrati`}${oggi ? `: «Push inviate oggi» scende di ${oggi}.` : '.'}`
            : '• Nessun invio registrato.');
    }
    const ok = await customConfirm(righe.join('\n'), {
        title: una ? 'Eliminare la modifica?' : `Eliminare ${modifiche.length} modifiche?`,
        confirmText: una ? 'Elimina' : `Elimina ${modifiche.length}`,
        icon: '🗑️',
    });
    if (!ok) return;

    const { data, error } = await _supabase.from('modifiche_orario').delete().in('id', ids).select('id');
    if (error || !data || !data.length) {
        showToast('Non eliminata: ' + escapeHtml(error ? error.message : 'il pannello non ha il permesso di eliminare (script SQL)'), 'error');
        return;
    }
    _mod.scelte.clear();
    _modDopoCambio();
    showToast(data.length === 1 ? 'Modifica eliminata' : `${data.length} modifiche eliminate`);
}

// Dopo un segno o un'eliminazione: si rileggono la sezione (se già aperta una volta),
// il riquadro della Panoramica e il pallino del menu
function _modDopoCambio() {
    if (_mod.caricata) caricaModifiche();
    caricaSospettePanoramica();
}

// =====================================================================
// Controllo forzato: orario-notte su tutti i percorsi, poi push-automatiche
// (script SQL 12 di QuickCheck). Il giro forzato non sposta quello della notte.
// =====================================================================
async function _modInvoca(funzione, body) {
    const { data, error } = await _supabase.functions.invoke(funzione, { body });
    if (error) {
        let dettaglio = error.message;
        try { dettaglio += ' ' + JSON.stringify(await error.context.json()); } catch (_) { /* nessun corpo */ }
        throw new Error(dettaglio);
    }
    return data;
}

async function controllaAdesso() {
    const ok = await customConfirm([
        "Scarica adesso dal portale l'orario di questa settimana e della prossima per tutti i percorsi seguiti, come il controllo notturno.",
        '',
        '• Ci vogliono alcuni minuti: tieni aperta questa pagina.',
        '• Le modifiche trovate partono subito, anche fuori dalla fascia 7:30-21:00.',
        '• Il controllo di stanotte si fa comunque.',
    ].join('\n'), { title: 'Controllare l\'orario adesso?', confirmText: 'Controlla e invia', icon: '🔄' });
    if (!ok) return;

    const tasto = _modEl('mod-controlla');
    const testo = tasto.innerHTML;
    tasto.disabled = true;
    const dal = new Date().toISOString();
    const tot = { elaborate: 0, modifiche: 0, smentite: 0, errori: 0 };
    try {
        // Ogni chiamata lavora al massimo ~2 minuti: si richiama finché non resta niente
        for (let giro = 0; giro < 20; giro++) {
            tasto.innerHTML = `<span class="admin-ms admin-gira">sync</span>Controllo… ${tot.elaborate} percorsi`;
            const r = await _modInvoca('orario-notte', { forza_dal: dal, limite: 50 });
            for (const k of Object.keys(tot)) tot[k] += r[k] || 0;
            if (!r.da_fare) break;
            if (r.errori >= 3 && r.errori === r.elaborate) throw new Error('il portale non risponde');
        }
        tasto.innerHTML = '<span class="admin-ms admin-gira">sync</span>Invio notifiche…';
        const p = await _modInvoca('push-automatiche', { forza: true });
        const invio = p.saltato ? `notifiche non inviate (${p.saltato})`
            : `${p.inviati || 0} ${p.inviati === 1 ? 'notifica inviata' : 'notifiche inviate'}${p.errori ? `, ${p.errori} non consegnate` : ''}`;
        showToast(`${tot.elaborate} percorsi controllati · ${tot.modifiche} ${tot.modifiche === 1 ? 'modifica nuova' : 'modifiche nuove'}` +
            `${tot.smentite ? ` · ${tot.smentite} smentite` : ''}${tot.errori ? ` · ${tot.errori} in errore` : ''} · ${escapeHtml(invio)}`,
            tot.errori || p.saltato ? 'error' : 'success');
    } catch (err) {
        showToast(`Controllo interrotto dopo ${tot.elaborate} percorsi: ${escapeHtml(err.message || String(err))}`, 'error');
    } finally {
        tasto.disabled = false;
        tasto.innerHTML = testo;
        _modDopoCambio();
    }
}

// =====================================================================
// Sezione "Modifiche orario"
// =====================================================================
const _mod = {
    caricata: false,
    gen: 0,
    dati: [],
    etichette: null,
    filtro: 'tutte',  // attive | scadute | tutte
    tipo: '',
    cerca: '',
    test: false,      // mostra anche il corso TEST del simulatore
    scelte: new Set(),
    aperte: new Set(),
};
const _modEl = id => document.getElementById(id);

async function caricaModifiche() {
    const gen = ++_mod.gen;
    const elenco = _modEl('mod-elenco');
    if (!_mod.caricata && elenco) elenco.innerHTML = '<div class="admin-caricamento">Caricamento delle modifiche…</div>';
    const icona = document.querySelector('#mod-aggiorna .admin-ms');
    icona?.classList.add('admin-gira');
    try {
        const [dati, etichette] = await Promise.all([leggiModificheOrario(true), leggiEtichetteCorsi()]);
        if (gen !== _mod.gen) return;
        _mod.dati = dati;
        _mod.etichette = etichette;
        _mod.caricata = true;
        disegnaModifiche();
    } catch (err) {
        if (gen !== _mod.gen) return;
        console.error('Modifiche orario:', err);
        const permesso = typeof _panNonLeggibile === 'function' && _panNonLeggibile({ error: err });
        if (elenco) {
            elenco.innerHTML = `<div class="admin-errore"><div class="admin-errore-titolo">Modifiche non disponibili</div>${permesso
                ? 'Il pannello non ha il permesso di leggere modifiche_orario: esegui lo script _redesign/sql/pannello_modifiche_iscrizioni.sql.'
                : escapeHtml(err.message || String(err))}</div>`;
        }
    } finally {
        if (gen === _mod.gen) icona?.classList.remove('admin-gira');
    }
}

function _modVisibili() {
    const q = _mod.cerca.trim().toLowerCase();
    return _mod.dati.filter(m => (_mod.test || !modificaDiTest(m))
        && (_mod.filtro === 'tutte' || (_mod.filtro === 'attive') === modificaAttiva(m))
        && (!_mod.tipo || m.tipo === _mod.tipo)
        && (!q || `${m.insegnamento} ${descriviCorso(_mod.etichette, m.id_corso, m.percorso)} ${m.id_corso}`.toLowerCase().includes(q)));
}

// Riga "Prima"/"Dopo": giorno · orario · aula, con in evidenza quello che cambia rispetto all'altra
function _modRiga(etichetta, d, altro, classe) {
    const cambia = diverso => (altro && diverso ? ' class="mod-cambia"' : '');
    return `<span class="mod-et">${etichetta}</span><span class="${classe}">` +
        `<span${cambia(altro && altro.data !== d.data)}>${_modGiorno(d.data)}</span><span class="mod-sep">·</span>` +
        `<span${cambia(altro && (altro.ora_inizio !== d.ora_inizio || altro.ora_fine !== d.ora_fine))}>${escapeHtml(String(d.ora_inizio || ''))}–${escapeHtml(String(d.ora_fine || ''))}</span><span class="mod-sep">·</span>` +
        `<span${cambia(altro && String(altro.aula || '') !== String(d.aula || ''))}>${escapeHtml(String(d.aula || 'aula non indicata'))}</span></span>`;
}

const MOD_ESITI = {
    ok: '<span class="admin-stato ok">Consegnata</span>',
    errore: '<span class="admin-stato ko">Non consegnata</span>',
    rimuovi: '<span class="admin-stato att" title="Il dispositivo non è più iscritto: l\'iscrizione è stata tolta">Iscrizione scaduta</span>',
};

function _modScheda(m) {
    const tipo = _modTipo(m);
    const attiva = modificaAttiva(m);
    const motivo = modificaSospetta(m) ? motivoSospetto(m) : '';
    const invii = m.invii || [];
    const consegnati = invii.filter(i => i.esito === 'ok').length;
    const nonConsegnati = invii.filter(i => i.esito === 'errore' || i.esito === 'rimuovi').length;
    const consegne = !invii.length ? 'Mai inviata' : [
        `${invii.length} ${invii.length === 1 ? 'dispositivo' : 'dispositivi'}`,
        consegnati ? `${consegnati} ${consegnati === 1 ? 'consegnata' : 'consegnate'}` : '',
        nonConsegnati ? `${nonConsegnati} non ${nonConsegnati === 1 ? 'consegnata' : 'consegnate'}` : '',
    ].filter(Boolean).join(' · ');
    const aperta = _mod.aperte.has(m.id);
    const scelta = _mod.scelte.has(m.id);
    const materia = escapeHtml(nomeLeggibile(m.insegnamento));
    const diff = m.prima && m.dopo
        ? _modRiga('Prima', m.prima, m.tipo === 'annullamento' ? null : m.dopo, 'mod-prima') +
          (m.tipo === 'annullamento'
              ? '<span class="mod-et">Dopo</span><span class="mod-dopo"><span class="mod-annullata">Annullata</span></span>'
              : _modRiga('Dopo', m.dopo, m.prima, 'mod-dopo'))
        : (m.dopo ? _modRiga('Dopo', m.dopo, null, 'mod-dopo') : '');
    const dettaglio = !aperta ? '' : `
        <div class="mod-invii">
            ${invii.length ? `<table><thead><tr><th>Inviata a un dispositivo</th><th>Esito</th></tr></thead><tbody>${invii.map(i =>
                `<tr><td>${_modQuando(i.inviato_il)}</td><td>${MOD_ESITI[i.esito] || '<span class="admin-stato" title="Invio precedente al 12 ottobre 2026: allora l\'esito non veniva salvato">Non registrato</span>'}</td></tr>`).join('')}</tbody></table>`
                : '<p>Nessun invio: la lezione era già passata o nessun iscritto la seguiva.</p>'}
            <p>${m.origine === 'giorno' ? 'Trovata dal controllo diurno (occupazione delle aule)' : 'Trovata dal controllo notturno (orario del corso)'} · id ${m.id}${m.controllata_il ? ` · segnata come non sospetta il ${_modQuando(m.controllata_il)}` : ''}</p>
        </div>`;
    return `
        <article class="mod-scheda${attiva ? '' : ' scaduta'}${motivo ? ' sospetta' : ''}${scelta ? ' scelta' : ''}">
            <label class="mod-spunta-scheda" title="Seleziona"><input type="checkbox" data-azione="scegli" data-id="${m.id}" aria-label="Seleziona ${materia}"${scelta ? ' checked' : ''}></label>
            <div class="mod-corpo">
                <div class="mod-testa">
                    <span class="admin-stato ${tipo.stato}"><span class="admin-ms">${tipo.icona}</span>${escapeHtml(tipo.nome)}</span>
                    <span class="mod-materia">${materia}</span>
                    ${attiva ? '<span class="admin-stato ok">Attiva</span>' : '<span class="admin-stato">Scaduta</span>'}
                    ${motivo ? `<span class="admin-stato att" title="${escapeHtml(motivo)}"><span class="admin-ms">help</span>Sospetta</span>` : ''}
                    ${m.controllata_il && motivoSospetto(m) ? `<span class="admin-stato mod-controllata" title="Segnata come non sospetta il ${_modQuando(m.controllata_il)}"><span class="admin-ms">verified</span>Controllata</span>` : ''}
                </div>
                <div class="mod-corso">${escapeHtml(descriviCorso(_mod.etichette, m.id_corso, m.percorso))}<span class="mod-codice">${escapeHtml(String(m.id_corso || ''))}</span></div>
                ${diff ? `<div class="mod-diff">${diff}</div>` : ''}
                <div class="mod-meta">
                    <span><span class="admin-ms">${m.origine === 'giorno' ? 'light_mode' : 'bedtime'}</span>Trovata ${_modQuando(m.rilevata_il)}</span>
                    <span><span class="admin-ms">hourglass_bottom</span>${attiva ? 'Attiva fino al' : 'Scaduta il'} ${_modQuando(m.scade_il)}</span>
                    <span><span class="admin-ms">send</span>${consegne}</span>
                    ${motivo ? `<span class="mod-avviso-riga"><span class="admin-ms">warning</span>${escapeHtml(motivo)}</span>` : ''}
                </div>
                ${dettaglio}
            </div>
            <div class="mod-azioni">
                <button type="button" class="btn btn-secondary btn-sm mod-solo-icona" data-azione="invii" data-id="${m.id}" aria-expanded="${aperta}" title="${aperta ? 'Nascondi gli invii' : 'Mostra gli invii'}"><span class="admin-ms">${aperta ? 'expand_less' : 'expand_more'}</span><span class="mod-solo-telefono">Invii</span></button>
                ${motivo ? `<button type="button" class="btn btn-secondary btn-sm mod-ok" data-azione="non-sospetta" data-id="${m.id}" title="La modifica è giusta: togli la segnalazione"><span class="admin-ms">check</span>Non sospetta</button>` : ''}
                <button type="button" class="btn btn-secondary btn-sm admin-pericolo" data-azione="elimina" data-id="${m.id}"><span class="admin-ms">delete</span>Elimina</button>
            </div>
        </article>`;
}

function disegnaModifiche() {
    const tutte = _mod.dati.filter(m => _mod.test || !modificaDiTest(m));
    const attive = tutte.filter(modificaAttiva).length;
    const sospette = tutte.filter(modificaSospetta);
    const sospetteAttive = sospette.filter(modificaAttiva).length;
    const oggi = _mod.dati.reduce((s, m) => s + (m.invii || []).filter(_modInviatoOggi).length, 0);
    const lista = _modVisibili();
    // Le selezionate che i filtri nascondono non restano selezionate di nascosto
    for (const id of [..._mod.scelte]) if (!lista.some(m => m.id === id)) _mod.scelte.delete(id);
    const scelte = _mod.dati.filter(m => _mod.scelte.has(m.id));
    const scelteSospette = scelte.filter(modificaSospetta).length;

    _modEl('mod-kpi').innerHTML = `
        <div class="mod-k"><div class="mod-k-l"><span class="admin-ms">bolt</span>Attive ora</div><div class="mod-k-v">${attive}</div><div class="mod-k-d">arrivano a chi si iscrive</div></div>
        <div class="mod-k${sospette.length ? ' att' : ''}"><div class="mod-k-l"><span class="admin-ms">help</span>Sospette</div><div class="mod-k-v">${sospette.length}</div><div class="mod-k-d">prima e dopo uguali o stesso giorno</div></div>
        <div class="mod-k"><div class="mod-k-l"><span class="admin-ms">send</span>Avvisi inviati oggi</div><div class="mod-k-v">${oggi}</div><div class="mod-k-d">dispositivi raggiunti</div></div>
        <div class="mod-k"><div class="mod-k-l"><span class="admin-ms">history</span>Registrate</div><div class="mod-k-v">${tutte.length}</div><div class="mod-k-d">fino a 14 giorni dopo la lezione${_mod.test ? '' : ' · senza TEST'}</div></div>`;

    _modEl('mod-avviso').innerHTML = !sospette.length ? '' : `
        <div class="admin-avviso att mod-avviso">
            <span class="admin-ms">warning</span>
            <div class="mod-avviso-testo"><h4>${sospette.length === 1 ? '1 modifica sospetta' : `${sospette.length} modifiche sospette`}</h4>
                <p>${sospetteAttive
                    ? `${sospetteAttive === 1 ? 'Una è ancora attiva e arriva' : `${sospetteAttive} sono ancora attive e arrivano`} a chi si iscrive: controlla se sono giuste, poi segnale come non sospette oppure eliminale.`
                    : 'Sono tutte scadute e nessuno le riceve più: puoi eliminarle o segnarle come non sospette.'}</p></div>
            <button type="button" class="btn btn-secondary btn-sm" data-azione="scegli-sospette">Seleziona le sospette</button>
        </div>`;

    _modEl('mod-filtro').innerHTML = [['attive', 'Attive', attive], ['scadute', 'Scadute', tutte.length - attive], ['tutte', 'Tutte', tutte.length]]
        .map(([v, t, n]) => `<button type="button" data-azione="filtro" data-valore="${v}" class="${_mod.filtro === v ? 'active' : ''}" aria-pressed="${_mod.filtro === v}">${t}<span class="mod-n">${n}</span></button>`).join('');

    _modEl('mod-selezione').innerHTML = !scelte.length ? '' : `
        <div class="mod-selezione">
            <span class="admin-ms">check_box</span><span><strong>${scelte.length}</strong> ${scelte.length === 1 ? 'selezionata' : 'selezionate'}</span>
            <span class="admin-riempi"></span>
            <button type="button" class="btn btn-secondary btn-sm" data-azione="deseleziona">Annulla</button>
            ${scelteSospette ? `<button type="button" class="btn btn-secondary btn-sm mod-ok" data-azione="non-sospette-scelte"><span class="admin-ms">check</span>Non sospett${scelteSospette === 1 ? 'a' : 'e'} (${scelteSospette})</button>` : ''}
            <button type="button" class="btn btn-secondary btn-sm admin-pericolo" data-azione="elimina-scelte"><span class="admin-ms">delete</span>Elimina ${scelte.length}</button>
        </div>`;

    let vuoto = '<div class="admin-vuoto"><span class="admin-vuoto-icona admin-ms">event_available</span>Nessuna modifica con questi filtri.</div>';
    if (!tutte.length) vuoto = '<div class="admin-vuoto"><span class="admin-vuoto-icona admin-ms">event_available</span>Nessuna modifica registrata: i controlli automatici non hanno trovato cambi d\'orario di recente.</div>';
    _modEl('mod-elenco').innerHTML = lista.length ? lista.map(_modScheda).join('') : vuoto;
}

// Un solo gestore per i pulsanti della sezione (il contenuto viene ridisegnato)
(function () {
    const sezione = _modEl('modifiche-section');
    if (!sezione) return;
    const perId = id => _mod.dati.find(m => m.id === Number(id));

    sezione.addEventListener('click', (e) => {
        const el = e.target.closest('[data-azione]');
        if (!el || el.dataset.azione === 'scegli') return;
        const m = el.dataset.id ? perId(el.dataset.id) : null;
        switch (el.dataset.azione) {
            case 'filtro': _mod.filtro = el.dataset.valore; break;
            case 'invii': if (m) { if (_mod.aperte.has(m.id)) _mod.aperte.delete(m.id); else _mod.aperte.add(m.id); } break;
            case 'non-sospetta': if (m) segnaNonSospette([m]); return;
            case 'elimina': if (m) eliminaModificheOrario([m]); return;
            case 'scegli-sospette':
                _mod.filtro = 'tutte';
                _mod.dati.filter(x => (_mod.test || !modificaDiTest(x)) && modificaSospetta(x)).forEach(x => _mod.scelte.add(x.id));
                break;
            case 'deseleziona': _mod.scelte.clear(); break;
            case 'non-sospette-scelte': {
                const scelte = _mod.dati.filter(x => _mod.scelte.has(x.id) && modificaSospetta(x));
                _mod.scelte.clear();
                segnaNonSospette(scelte);
                return;
            }
            case 'elimina-scelte': eliminaModificheOrario(_mod.dati.filter(x => _mod.scelte.has(x.id))); return;
            default: return;
        }
        disegnaModifiche();
    });

    sezione.addEventListener('change', (e) => {
        const el = e.target;
        if (el.dataset.azione === 'scegli') {
            const id = Number(el.dataset.id);
            if (el.checked) _mod.scelte.add(id); else _mod.scelte.delete(id);
        } else if (el.id === 'mod-tipo') _mod.tipo = el.value;
        else if (el.id === 'mod-test') _mod.test = el.checked;
        else return;
        disegnaModifiche();
    });

    _modEl('mod-cerca')?.addEventListener('input', (e) => { _mod.cerca = e.target.value; if (_mod.caricata) disegnaModifiche(); });
    _modEl('mod-aggiorna')?.addEventListener('click', caricaModifiche);
    _modEl('mod-controlla')?.addEventListener('click', controllaAdesso);
})();
