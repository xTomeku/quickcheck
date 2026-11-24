// Appelli ESSE3: stato e avvio manuale della sincronizzazione degli appelli d'esame
// (workflow GitHub `sync_appelli.yml` del repository dell'app, che scrive la tabella
// `appelli` su Supabase). Passa dalla Edge Function `avvia-sync-appelli` di QuickCheck,
// solo per l'admin: il token di GitHub sta nei segreti della funzione, mai qui.

const _app = { caricamento: false };
const _appEl = (id) => document.getElementById(id);

const APP_STATI = {
    queued: 'In coda', in_progress: 'In corso', waiting: 'In attesa', requested: 'Richiesta', pending: 'In attesa',
};
const APP_ESITI = {
    success: 'Riuscita', failure: 'Fallita', cancelled: 'Annullata', skipped: 'Saltata', timed_out: 'Scaduta',
    action_required: 'Serve un intervento', neutral: 'Conclusa', startup_failure: 'Non partita',
};
const APP_EVENTI = { schedule: 'pianificata', workflow_dispatch: 'avviata a mano', push: 'dopo un push' };

// Chiamata alla Edge Function; in caso di errore porta con sé il codice HTTP e il messaggio della funzione
async function _appInvoca(body) {
    const { data, error } = await _supabase.functions.invoke('avvia-sync-appelli', { body });
    if (error) {
        let corpo = null;
        try { corpo = await error.context.json(); } catch (_) { /* nessun corpo */ }
        const errore = new Error(corpo?.error || error.message);
        errore.stato = error.context?.status;
        throw errore;
    }
    return data;
}

function _appAvviso(tono, icona, titolo, testo, link) {
    return `<div class="admin-avviso ${tono}">
        <span class="admin-ms">${icona}</span>
        <div><h4>${escapeHtml(titolo)}</h4><p>${escapeHtml(testo)}</p>
        ${link ? `<a class="btn btn-secondary btn-sm" href="${escapeHtml(link)}" target="_blank" rel="noopener">Apri su GitHub</a>` : ''}</div>
    </div>`;
}

function _appKpi(icona, etichetta, valore, descrizione, attenzione = false) {
    return `<div class="mod-k${attenzione ? ' att' : ''}"><div class="mod-k-l"><span class="admin-ms">${icona}</span>${escapeHtml(etichetta)}</div>` +
        `<div class="mod-k-v">${escapeHtml(valore)}</div><div class="mod-k-d">${escapeHtml(descrizione)}</div></div>`;
}

function _appInCorso(esecuzione) {
    return !!esecuzione && Object.prototype.hasOwnProperty.call(APP_STATI, esecuzione.stato);
}

function _appDisegna(s) {
    const es = s.esecuzione;
    const sinc = s.sincronizzazione || {};
    const oreDallUltima = sinc.ultima ? (Date.now() - new Date(sinc.ultima).getTime()) / 3600000 : null;
    // Il workflow gira ogni 12 ore: oltre 26 ore senza aggiornamenti qualcosa non va
    const vecchia = oreDallUltima === null || oreDallUltima > 26;

    const statoEs = !es ? 'Nessuna' : (_appInCorso(es) ? APP_STATI[es.stato] : (APP_ESITI[es.esito] || es.esito || 'Conclusa'));
    const dettaglioEs = !es ? 'il workflow non è mai partito' :
        [APP_EVENTI[es.evento] || es.evento, es.branch, es.avviata ? _panQuando(es.avviata) : null].filter(Boolean).join(' · ');

    _appEl('app-kpi').innerHTML =
        _appKpi('update', 'Ultima sincronizzazione', sinc.ultima ? _panQuando(sinc.ultima) : 'Mai',
            'turni letti da ESSE3 e scritti su Supabase', vecchia) +
        _appKpi('event_note', 'Turni salvati', sinc.turni == null ? '—' : String(sinc.turni),
            'appelli da oggi a un anno, mostrati dalla PWA', sinc.turni === 0) +
        _appKpi('play_circle', 'Ultima esecuzione', statoEs, dettaglioEs,
            !!es && !_appInCorso(es) && es.esito && es.esito !== 'success');

    let avviso = '';
    if (_appInCorso(es)) {
        avviso = _appAvviso('att', 'sync', 'Sincronizzazione in corso',
            'Il giro dura qualche minuto. Aggiorna questa pagina per vedere quando finisce.', es.url);
    } else if (es && es.esito && es.esito !== 'success') {
        avviso = _appAvviso('ko', 'error', 'L\'ultima esecuzione non è andata a buon fine',
            'Apri il registro su GitHub per vedere l\'errore. Finché non si risolve, la PWA mostra gli appelli dell\'ultima sincronizzazione riuscita.', es.url);
    } else if (vecchia) {
        avviso = _appAvviso('att', 'schedule', 'Dati non aggiornati da più di un giorno',
            'La sincronizzazione pianificata parte solo se il workflow è sul branch principale. Puoi avviarla a mano da qui.', s.actions);
    } else if (sinc.errore) {
        avviso = _appAvviso('ko', 'error', 'Tabella degli appelli non leggibile', sinc.errore);
    }
    _appEl('app-avviso').innerHTML = avviso;
    _appEl('app-link').innerHTML = s.actions
        ? `<a href="${escapeHtml(s.actions)}" target="_blank" rel="noopener">Tutte le esecuzioni su GitHub</a>`
        : '';
    _appEl('app-avvia').disabled = _appInCorso(es);
}

async function caricaAppelli() {
    if (_app.caricamento) return;
    _app.caricamento = true;
    const icona = document.querySelector('#app-aggiorna .admin-ms');
    icona?.classList.add('admin-gira');
    try {
        _appDisegna(await _appInvoca({ azione: 'stato' }));
    } catch (e) {
        _appEl('app-kpi').innerHTML = '';
        _appEl('app-link').innerHTML = '';
        _appEl('app-avviso').innerHTML = _appAvviso('ko', 'error', 'Stato della sincronizzazione non disponibile',
            e.stato === 401 ? 'Accesso negato: serve l\'account admin.' : e.message);
    } finally {
        icona?.classList.remove('admin-gira');
        _app.caricamento = false;
    }
}

async function avviaSyncAppelli() {
    const ok = await customConfirm([
        'Avvia adesso su GitHub la sincronizzazione degli appelli d\'esame da ESSE3, riscaricando le pagine di tutti i turni (aula, note, corsi).',
        '',
        '• Ci vogliono alcuni minuti; puoi chiudere questa pagina.',
        '• Le sincronizzazioni pianificate ogni 12 ore restano come sono.',
        '• Se un giro è già in corso non ne parte un altro.',
    ].join('\n'), { title: 'Riscaricare tutti gli appelli?', confirmText: 'Avvia', icon: '🔄' });
    if (!ok) return;

    const tasto = _appEl('app-avvia');
    const testo = tasto.innerHTML;
    tasto.disabled = true;
    tasto.innerHTML = '<span class="admin-ms admin-gira">sync</span>Avvio…';
    try {
        await _appInvoca({ azione: 'avvia', completo: true });
        showToast('Sincronizzazione avviata: ci vogliono alcuni minuti', 'success');
        // GitHub impiega qualche secondo a elencare il giro appena avviato
        setTimeout(caricaAppelli, 5000);
    } catch (e) {
        showToast(e.stato === 409 ? 'Una sincronizzazione è già in coda o in corso' : `Avvio non riuscito: ${e.message}`, 'error');
        tasto.disabled = false;
    } finally {
        tasto.innerHTML = testo;
    }
}

(function () {
    _appEl('app-aggiorna')?.addEventListener('click', caricaAppelli);
    _appEl('app-avvia')?.addEventListener('click', avviaSyncAppelli);
})();
