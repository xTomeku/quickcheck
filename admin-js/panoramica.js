// Pannello admin - Panoramica (pagina iniziale).

// =====================================================================
// Panoramica (pagina iniziale): quattro numeri, stato dell'app, utenti degli
// ultimi 14 giorni, checklist del prossimo rilascio, modifiche sospette e ultimi bug.
// Ogni blocco si carica per conto suo con uno scheletro; se una lettura fallisce,
// l'errore compare solo nei blocchi che ne hanno bisogno.
// I dati arrivano dalle stesse funzioni delle altre sezioni: leggiStatisticheUtenti,
// calcolaAdozioneVersioni (con scaricaTutteLeRighe), leggiMenuPubblicato.
// Due gruppi: "numeri" (in alto, grafico, bug) e "stato" (riquadri e checklist, che
// accendono anche i pallini gialli del menu e si rileggono dopo i salvataggi).
// =====================================================================

// Ogni aggiornamento ha un numero: i risultati di uno superato da uno più recente si scartano
const _panGenerazione = { numeri: 0, stato: 0, sospette: 0 };
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

// Risposta di Supabase che indica una tabella non leggibile dal pannello (permessi mancanti o
// tabella non ancora creata), da mostrare come "non disponibile" e non come un guasto.
// Le richieste di solo conteggio non hanno corpo: lì conta lo stato HTTP.
function _panNonLeggibile(r) {
    const e = r.error || {};
    return [401, 403, 404].includes(r.status) || ['42501', '42P01', 'PGRST205'].includes(e.code) ||
        /permission denied|could not find the table|does not exist/i.test(e.message || '');
}

/**
 * Push automatiche di oggi: tabelle invii_automatici (una riga per modifica d'orario e
 * dispositivo; esito "ok", "errore" o "rimuovi" solo dopo la modifica a push-automatiche
 * descritta in _redesign/edge_functions_registro.md, prima restava vuoto) e promemoria_inviati
 * (esito "ok", "errore", "rimuovi" o "scaduto"). Senza una policy di lettura per gli utenti
 * autenticati PostgREST risponde "permission denied": in quel caso { disponibile: false }.
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
        conta('invii_automatici', 'modifica_id').eq('esito', 'errore'),
    ]);
    const conErrore = risposte.filter(r => r.error);
    if (conErrore.length) {
        if (conErrore.some(_panNonLeggibile)) return { disponibile: false };
        throw new Error(conErrore.map(r => r.error.message).find(Boolean) || 'lettura non riuscita');
    }
    const [modifiche, promemoria, errori, ultimo, erroriModifiche] = risposte;
    return {
        disponibile: true,
        modifiche: modifiche.count || 0,
        promemoria: promemoria.count || 0,
        erroriPromemoria: errori.count || 0,
        erroriModifiche: erroriModifiche.count || 0,
        ultimo: (ultimo.data || [])[0] || null,
    };
}

/**
 * Ultimo giro delle funzioni automatiche (tabella ultime_esecuzioni, una riga per funzione:
 * orario-notte, orario-controllo, push-automatiche, promemoria). La tabella e la scrittura dalle
 * Edge Functions sono descritte in _redesign/: finché mancano, { disponibile: false }.
 */
async function leggiUltimeEsecuzioni() {
    const r = await _supabase.from('ultime_esecuzioni').select('funzione, ultima_il, esito, durata_ms, dettaglio, ultimo_errore_il, ultimo_errore');
    if (r.error) {
        if (_panNonLeggibile(r)) return { disponibile: false };
        throw new Error(r.error.message || 'lettura non riuscita');
    }
    return { disponibile: true, perFunzione: Object.fromEntries((r.data || []).map(e => [e.funzione, e])) };
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
        esecuzioni: una('esecuzioni', () => leggiUltimeEsecuzioni()),
        fileMappe: una('fileMappe', () => leggiFileMappe()),
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
            // Tre gruppi separati come in Statistiche: PWA installata, sito nel browser, APK
            const pwa = _panPercento(voce.pwa || 0, a.pwa);
            const web = _panPercento(voce.web || 0, a.web);
            const apk = _panPercento(voce.apk || 0, a.apk);
            const fmt = p => (p === null ? '–' : `${p}%`);
            return _panKpiHtml(pct === null ? '—' : `${pct}%`,
                `v${escapeHtml(nome)} · PWA ${fmt(pwa)} · web ${fmt(web)} · APK ${fmt(apk)}`, pct || 0);
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
            // Data del file nel bucket (aggiornato_il cambia con ogni salvataggio di config_app);
            // se il bucket non risponde il riquadro resta valido, solo senza data
            let caricato = '';
            try {
                const file = (await l.fileMappe()).find(f => f.name === c.mappa_path);
                if (file && file.created_at) caricato = `file caricato ${tempoTrascorso(file.created_at)}`;
            } catch (_) { /* senza data */ }
            const dettagli = [c.mappa_bytes ? _kb(c.mappa_bytes) : '', caricato];
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
            // Il riquadro guarda la versione in uso; quella in preparazione è nella checklist
            const recente = _panVersione((_panPiuRecente(versioni) || {}).version);
            const dettagli = testo => ['Versione in uso', testo, recente && recente !== nome ? `la ${escapeHtml(recente)} è nella checklist` : '']
                .filter(Boolean).join(' · ');
            if (!n) return { tono: 'ko', titolo: `Novità ${v} mancanti`, testo: dettagli('chi aggiorna non vede la schermata delle novità'), motivo: `Novità ${nome} mancanti` };
            if (!n.attiva) return { tono: 'ko', titolo: `Novità ${v} spente`, testo: dettagli('vanno attivate dalla sezione Novità'), motivo: `Novità ${nome} spente` };
            if (!schede) return { tono: 'ko', titolo: `Novità ${v} senza schede`, testo: dettagli('aggiungi almeno una pagina'), motivo: `Novità ${nome} senza schede` };
            return { tono: 'ok', titolo: `Novità ${v} attive`, testo: dettagli(`${schede} ${schede === 1 ? 'scheda' : 'schede'}`) };
        },
        push: async () => {
            // Il registro delle esecuzioni è facoltativo: se non si legge, il riquadro usa solo i conteggi
            const [p, es] = await Promise.all([l.push(), l.esecuzioni().catch(() => ({ disponibile: false }))]);
            const giro = es.disponibile && ['push-automatiche', 'promemoria'].map(f => es.perFunzione[f]).find(e => e && e.esito === 'errore');
            const avvisoGiro = giro ? `ultimo giro di ${giro.funzione} non riuscito: ${escapeHtml(giro.ultimo_errore || 'errore')}` : '';
            if (!p.disponibile) {
                if (giro) return { tono: 'att', titolo: 'Push: ultimo giro non riuscito', testo: avvisoGiro, motivo: `Ultimo giro di ${giro.funzione} non riuscito` };
                return { tono: 'neu', icona: 'notifications_off', titolo: 'Push inviate oggi: non disponibile', testo: 'Il pannello non ha il permesso di leggere invii_automatici e promemoria_inviati' };
            }
            const totale = p.modifiche + p.promemoria;
            const nonConsegnati = p.erroriPromemoria + p.erroriModifiche;
            const testo = [
                `${_panNumero(p.modifiche)} per modifiche d'orario · ${_panNumero(p.promemoria)} promemoria`,
                nonConsegnati ? `${_panNumero(nonConsegnati)} ${nonConsegnati === 1 ? 'non consegnata' : 'non consegnate'}` : '',
                avvisoGiro,
            ].filter(Boolean).join(' · ');
            const titolo = totale ? `Push: ${_panNumero(totale)} inviate oggi` : 'Push: nessuna inviata oggi';
            if (giro) return { tono: 'att', titolo, testo, motivo: `Ultimo giro di ${giro.funzione} non riuscito` };
            if (nonConsegnati) return { tono: 'att', titolo, testo, motivo: `${nonConsegnati} notifiche non consegnate oggi` };
            return { tono: totale ? 'ok' : 'neu', titolo, testo };
        },
        orari: async () => {
            // 1. Registro delle esecuzioni (ultime_esecuzioni): ultimo giro vero di notte e di giorno
            const es = await l.esecuzioni().catch(() => ({ disponibile: false }));
            const notte = es.disponibile && es.perFunzione['orario-notte'];
            const giorno = es.disponibile && es.perFunzione['orario-controllo'];
            if (notte || giorno) {
                const descrivi = (e, nome) => (e ? `${nome} ${_panQuando(e.ultima_il)}` : `${nome}: mai`);
                const inErrore = [giorno, notte].find(e => e && e.esito === 'errore');
                if (inErrore) {
                    const quale = inErrore === giorno ? 'diurno' : 'notturno';
                    return { tono: 'ko', titolo: `Controllo ${quale} non riuscito`, testo: `${_panQuando(inErrore.ultima_il)}: ${escapeHtml(inErrore.ultimo_errore || 'errore')}`, motivo: `Ultimo controllo ${quale} degli orari non riuscito` };
                }
                const oreDa = e => (e ? (Date.now() - new Date(e.ultima_il).getTime()) / 36e5 : Infinity);
                // Il notturno gira ogni notte; il diurno solo dal lunedì al venerdì
                if (oreDa(notte) > 36) {
                    return { tono: 'att', titolo: 'Controllo notturno fermo', testo: notte ? `Ultimo giro ${_panQuando(notte.ultima_il)}` : 'Non ha mai girato', motivo: 'Il controllo notturno degli orari non gira da più di 36 ore' };
                }
                if (oreDa(giorno) > 96) {
                    return { tono: 'att', titolo: 'Controllo diurno fermo', testo: giorno ? `Ultimo giro ${_panQuando(giorno.ultima_il)}` : 'Non ha mai girato', motivo: 'Il controllo diurno degli orari non gira da più di 4 giorni' };
                }
                return { tono: 'ok', titolo: 'Controllo orari attivo', testo: `${descrivi(giorno, 'Giorno')} · ${descrivi(notte, 'notte')} · nessun errore` };
            }
            // 2. Senza registro: l'ultimo avviso inviato (invii_automatici), non l'ultima esecuzione
            const p = await l.push();
            if (!p.disponibile) return { tono: 'neu', icona: 'sync_disabled', titolo: 'Controllo orari: non disponibile', testo: 'Il pannello non può leggere ultime_esecuzioni né invii_automatici' };
            if (!p.ultimo) return { tono: 'neu', titolo: 'Controllo orari', testo: 'Nessun avviso di modifica inviato finora' };
            return { tono: 'ok', titolo: 'Controllo orari', testo: `Ultimo avviso di modifica: ${_panQuando(p.ultimo.inviato_il)} (${tempoTrascorso(p.ultimo.inviato_il)})` };
        },
    };
}

// "oggi alle 13:00", "ieri alle 19:05", "ven 9 ott alle 19:00"
function _panQuando(quando) {
    const d = new Date(quando);
    const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const giorni = _panGiorniTra(_isoOggi(d), _isoOggi());
    const giorno = giorni === 0 ? 'oggi' : (giorni === 1 ? 'ieri' : d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }));
    return `${giorno} alle ${ora}`;
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

// --- Modifiche sospette (admin-js/modifiche.js): riquadro a sé, si rilegge anche dopo un segno
// o un'eliminazione fatti qui o nella sezione Modifiche orario ---
const PAN_SOSPETTE_MAX = 4;
let _panSospette = [];

function caricaSospettePanoramica() {
    const gen = ++_panGenerazione.sospette;
    const card = document.getElementById('pan-sospette-card');
    const conta = document.getElementById('pan-sospette-conta');
    const aggiornaTesta = (n, attive) => {
        card?.classList.toggle('pan-allerta', attive > 0);
        if (conta) {
            conta.textContent = String(n);
            conta.classList.toggle('hidden', !n);
        }
        segnalaVoceMenu('modifiche', attive ? `${attive === 1 ? 'Una modifica sospetta è ancora attiva' : `${attive} modifiche sospette sono ancora attive`}: arriva${attive === 1 ? '' : 'no'} a chi si iscrive` : null);
    };
    return _panBlocco(document.getElementById('pan-sospette'), 'sospette', gen,
        `<div class="pan-bug">${_panScheletroRiga()}</div>`.repeat(2), async () => {
            // Prima le attive (arrivano ancora a chi si iscrive), poi le più recenti; il corso TEST no
            const lista = (await leggiModificheOrario()).filter(m => !modificaDiTest(m) && modificaSospetta(m))
                .sort((a, b) => modificaAttiva(b) - modificaAttiva(a));
            const attive = lista.filter(modificaAttiva).length;
            _panSospette = lista;
            const poi = () => aggiornaTesta(lista.length, attive);
            if (!lista.length) return { html: '<div class="pan-vuoto pan-sosp-ok"><span class="admin-ms">check_circle</span>Nessuna modifica sospetta.</div>', poi };
            const righe = lista.slice(0, PAN_SOSPETTE_MAX).map(m => {
                const tipo = MOD_TIPI[m.tipo] || { nome: m.tipo, stato: '' };
                const materia = escapeHtml(nomeLeggibile(m.insegnamento));
                return `<div class="pan-sosp">
                    <span class="pan-sosp-t"><b title="${materia}">${materia}</b><small><span class="pan-tag ${tipo.stato}">${escapeHtml(tipo.nome)}</span> ${_modGiorno((m.dopo || m.prima || {}).data)} · ${modificaAttiva(m) ? '<span class="pan-sosp-attiva">attiva</span>' : 'scaduta'} · ${escapeHtml(motivoSospetto(m))}</small></span>
                    <button type="button" class="btn btn-secondary btn-sm mod-solo-icona mod-ok" data-pan-azione="non-sospetta" data-id="${m.id}" title="Non sospetta" aria-label="Segna ${materia} come non sospetta"><span class="admin-ms">check</span></button>
                    <button type="button" class="btn btn-secondary btn-sm mod-solo-icona admin-pericolo" data-pan-azione="elimina" data-id="${m.id}" title="Elimina" aria-label="Elimina la modifica di ${materia}"><span class="admin-ms">delete</span></button>
                </div>`;
            }).join('');
            const nota = attive
                ? `<div class="pan-sosp-allerta"><span class="admin-ms">warning</span><span>${attive === 1 ? 'Una è ancora attiva e arriva' : `${attive} sono ancora attive e arrivano`} a chi si iscrive.</span></div>`
                : '<p class="pan-sosp-nota">Tutte scadute: nessuno le riceve più.</p>';
            const altre = lista.length > PAN_SOSPETTE_MAX ? `<a class="pan-sosp-altre" href="#modifiche">e altre ${lista.length - PAN_SOSPETTE_MAX} &rsaquo;</a>` : '';
            return { html: nota + righe + altre, poi };
        }, err => {
            aggiornaTesta(0, 0);
            return _panErrore(_panNonLeggibile({ error: err }) ? new Error('esegui lo script _redesign/sql/pannello_modifiche_iscrizioni.sql') : err);
        });
}

document.getElementById('pan-sospette')?.addEventListener('click', (e) => {
    const pulsante = e.target.closest('[data-pan-azione]');
    const m = pulsante && _panSospette.find(x => x.id === Number(pulsante.dataset.id));
    if (!m) return;
    if (pulsante.dataset.panAzione === 'non-sospetta') segnaNonSospette([m]);
    else eliminaModificheOrario([m]);
});

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
    return Promise.all([riquadri, checklist, caricaSospettePanoramica()]);
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
