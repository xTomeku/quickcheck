// Pannello admin - Push e avvisi (send-push, avvisi_sistema) e simulatore del portale (portale_test).

// ==========================================
// GESTIONE NOTIFICHE WEB PUSH & AVVISI
// ==========================================

const pushForm = document.getElementById('push-notification-form');
const pushTitleInput = document.getElementById('notif-title');
const pushBodyInput = document.getElementById('notif-body');
const pushChannelSelect = document.getElementById('notif-channel');
const pushUrlInput = document.getElementById('notif-url');
const pushSubmitBtn = document.getElementById('push-submit-btn');
const pushSubmitStatus = document.getElementById('push-submit-status');
const pushSubscribersCount = document.getElementById('push-subscribers-count');
const notificationsHistoryList = document.getElementById('notifications-history-list');
const refreshNotificationsBtn = document.getElementById('refresh-notifications-btn');

const targetTypeRadios = document.querySelectorAll('input[name="notif-target-type"]');
const targetCourseContainer = document.getElementById('target-course-container');
const targetCourseSelect = document.getElementById('notif-target-course');
const courseSearchInput = document.getElementById('notif-target-course-search');
const courseClearBtn = document.getElementById('notif-target-course-clear');
const courseDropdown = document.getElementById('notif-course-dropdown');
const targetValueContainer = document.getElementById('target-value-container');
const targetValueLabel = document.getElementById('target-value-label');
const targetValueInput = document.getElementById('notif-target-value');
const materieDatalist = document.getElementById('materie-datalist');

const scheduleTypeRadios = document.querySelectorAll('input[name="notif-schedule-type"]');
const scheduleDatetimeContainer = document.getElementById('schedule-datetime-container');
const scheduledAtInput = document.getElementById('notif-scheduled-at');

// Cache in memoria dei corsi ed insegnamenti scaricati da UniSalento
let _corsiUniSalento = null;

// Formatta una data locale in formato 'YYYY-MM-DDTHH:mm' compatibile con input datetime-local
function formatLocalDateTime(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
}

// Renderizza gli elementi del menu a tendina personalizzato dei corsi con filtro di ricerca
function renderCourseDropdown(filterText = '') {
    if (!courseDropdown) return;
    const query = filterText.trim().toLowerCase();

    if (!_corsiUniSalento || _corsiUniSalento.length === 0) {
        courseDropdown.innerHTML = `<div class="course-dropdown-empty">Nessun corso disponibile al momento.</div>`;
        return;
    }

    const filtered = _corsiUniSalento.filter(c => {
        if (!query) return true;
        const nomeMatch = c.nome && c.nome.toLowerCase().includes(query);
        const idMatch = c.id && c.id.toLowerCase().includes(query);
        return nomeMatch || idMatch;
    });

    if (filtered.length === 0) {
        courseDropdown.innerHTML = `<div class="course-dropdown-empty">Nessun corso trovato per "<strong>${escapeHtml(query)}</strong>"</div>`;
        return;
    }

    courseDropdown.innerHTML = filtered.map(c => {
        const isSelected = targetCourseSelect && targetCourseSelect.value === c.id;
        return `
            <div class="course-dropdown-item ${isSelected ? 'selected' : ''}" data-id="${c.id}" data-nome="${escapeHtml(c.nome)}">
                <span class="course-dropdown-nome">${escapeHtml(c.nome)}</span>
                <span class="course-badge">${escapeHtml(c.id)}</span>
            </div>
        `;
    }).join('');

    // Listener per la selezione di ogni singolo corso nel dropdown
    courseDropdown.querySelectorAll('.course-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = item.getAttribute('data-id');
            const nome = item.getAttribute('data-nome');
            selezionaCorso(id, nome);
        });
    });
}

// Seleziona un corso, aggiorna l'input di ricerca visibile e la select nativa
function selezionaCorso(id, nome) {
    if (!id) {
        if (targetCourseSelect) targetCourseSelect.value = '';
        if (courseSearchInput) courseSearchInput.value = '';
        if (courseClearBtn) courseClearBtn.classList.add('hidden');
        if (courseDropdown) courseDropdown.classList.add('hidden');
        aggiornaDatalistMaterie('');
        return;
    }

    if (targetCourseSelect) {
        targetCourseSelect.value = id;
        targetCourseSelect.dispatchEvent(new Event('change'));
    }
    if (courseSearchInput) {
        courseSearchInput.value = `${nome} [${id}]`;
    }
    if (courseClearBtn) {
        courseClearBtn.classList.remove('hidden');
    }
    if (courseDropdown) {
        courseDropdown.classList.add('hidden');
    }
    aggiornaDatalistMaterie(id);
}

// Inizializza gli eventi per la ricerca interattiva e digitazione nel campo corsi
function initCourseSearchEvents() {
    if (!courseSearchInput) return;

    // Al click o focus sul campo di ricerca, apri la lista e mostra i corsi filtrati
    courseSearchInput.addEventListener('focus', () => {
        if (!_corsiUniSalento) {
            caricaCorsiUniSalento().then(() => {
                renderCourseDropdown(courseSearchInput.value);
                courseDropdown?.classList.remove('hidden');
            });
        } else {
            renderCourseDropdown(courseSearchInput.value);
            courseDropdown?.classList.remove('hidden');
        }
    });

    courseSearchInput.addEventListener('click', () => {
        if (courseDropdown && courseDropdown.classList.contains('hidden')) {
            renderCourseDropdown(courseSearchInput.value);
            courseDropdown.classList.remove('hidden');
        }
    });

    // Filtra in tempo reale mentre l'utente scrive
    courseSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (courseClearBtn) {
            courseClearBtn.classList.toggle('hidden', !val);
        }
        if (!val) {
            if (targetCourseSelect) targetCourseSelect.value = '';
            aggiornaDatalistMaterie('');
        }
        renderCourseDropdown(val);
        if (courseDropdown) courseDropdown.classList.remove('hidden');
    });

    // Pulsante per cancellare rapidamente la selezione
    if (courseClearBtn) {
        courseClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selezionaCorso('', '');
            courseSearchInput.focus();
            renderCourseDropdown('');
            if (courseDropdown) courseDropdown.classList.remove('hidden');
        });
    }

    // Chiudi il menu se l'utente clicca fuori
    document.addEventListener('click', (e) => {
        if (!targetCourseContainer) return;
        if (!targetCourseContainer.contains(e.target)) {
            if (courseDropdown) courseDropdown.classList.add('hidden');
        }
    });
}
initCourseSearchEvents();

// Scarica l'elenco dei corsi e relativi insegnamenti tramite la Edge Function Supabase (100% CORS-friendly)
async function caricaCorsiUniSalento() {
    if (_corsiUniSalento && _corsiUniSalento.length > 0) {
        renderCourseDropdown(courseSearchInput ? courseSearchInput.value : '');
        return;
    }

    try {
        if (courseSearchInput) {
            courseSearchInput.placeholder = "Caricamento corsi in corso...";
        }
        if (targetCourseSelect) {
            targetCourseSelect.innerHTML = '<option value="">Caricamento corsi in corso...</option>';
        }

        // Recupera il token di sessione autenticata dell'amministratore
        const { data: { session } } = await _supabase.auth.getSession();
        const token = session ? session.access_token : window.SUPABASE_KEY;

        // Chiama la Edge Function che recupera ed elabora i corsi server-side (senza blocchi CORS del browser)
        const endpoint = `${window.SUPABASE_URL}/functions/v1/send-push?action=corsi`;
        const res = await fetch(endpoint, {
            headers: {
                'apikey': window.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.corsi || !Array.isArray(data.corsi)) throw new Error("Dati corsi non validi");

        _corsiUniSalento = data.corsi;

        // Popola la select interna con i corsi ordinati alfabeticamente
        if (targetCourseSelect) {
            targetCourseSelect.innerHTML = '<option value="">-- Seleziona un Corso di Laurea --</option>';
            _corsiUniSalento.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.nome} [${c.id}]`;
                targetCourseSelect.appendChild(opt);
            });
        }

        if (courseSearchInput) {
            courseSearchInput.placeholder = "🔍 Digita per cercare il corso (es: Informatica, Diritto, LB48R)...";
        }

        renderCourseDropdown(courseSearchInput ? courseSearchInput.value : '');
    } catch (err) {
        console.error('Errore caricamento corsi UniSalento:', err);
        if (courseSearchInput) {
            courseSearchInput.placeholder = "Errore nel caricamento corsi. Riprova.";
        }
        if (targetCourseSelect) {
            targetCourseSelect.innerHTML = '<option value="">Errore nel caricamento dei corsi (riprova)</option>';
        }
    }
}

// Aggiorna la lista di suggerimenti delle materie per il corso selezionato
function aggiornaDatalistMaterie(courseId) {
    if (!materieDatalist) return;
    materieDatalist.innerHTML = '';
    if (!courseId || !_corsiUniSalento) return;

    const corso = _corsiUniSalento.find(c => c.id === courseId);
    if (corso && corso.insegnamenti) {
        corso.insegnamenti.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            materieDatalist.appendChild(opt);
        });
    }
}

if (targetCourseSelect) {
    targetCourseSelect.addEventListener('change', () => {
        aggiornaDatalistMaterie(targetCourseSelect.value);
    });
}

// 1. Toggle Selettore Destinatari
targetTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'tutti') {
            if (targetCourseContainer) targetCourseContainer.classList.add('hidden');
            targetValueContainer.classList.add('hidden');
            if (targetCourseSelect) targetCourseSelect.required = false;
            targetValueInput.required = false;
            targetValueInput.value = '';
            selezionaCorso('', '');
        } else if (val === 'corso') {
            if (targetCourseContainer) targetCourseContainer.classList.remove('hidden');
            targetValueContainer.classList.add('hidden');
            if (targetCourseSelect) targetCourseSelect.required = true;
            targetValueInput.required = false;
            targetValueInput.value = '';
            caricaCorsiUniSalento();
        } else if (val === 'materia') {
            if (targetCourseContainer) targetCourseContainer.classList.add('hidden');
            targetValueContainer.classList.remove('hidden');
            if (targetCourseSelect) targetCourseSelect.required = false;
            targetValueLabel.textContent = "Nome della Materia (invia a tutti gli studenti che la seguono, in qualsiasi corso):";
            targetValueInput.placeholder = "Es: Analisi Matematica 1";
            targetValueInput.required = true;
            if (materieDatalist) materieDatalist.innerHTML = '';
            selezionaCorso('', '');
        } else if (val === 'materia_corso') {
            if (targetCourseContainer) targetCourseContainer.classList.remove('hidden');
            targetValueContainer.classList.remove('hidden');
            if (targetCourseSelect) targetCourseSelect.required = true;
            targetValueLabel.textContent = "Nome della Materia per questo Corso (digita o seleziona dal menu):";
            targetValueInput.placeholder = "Es: Analisi Matematica 1";
            targetValueInput.required = true;
            caricaCorsiUniSalento();
            if (targetCourseSelect && targetCourseSelect.value) {
                aggiornaDatalistMaterie(targetCourseSelect.value);
            }
        }
    });
});

// 2. Toggle Selettore Pianificazione (Subito vs Programmata)
scheduleTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'later') {
            scheduleDatetimeContainer.classList.remove('hidden');
            scheduledAtInput.required = true;

            // Calcola orario minimo e default in fuso orario locale
            const now = new Date();
            scheduledAtInput.min = formatLocalDateTime(now);
            if (typeof aggiornaLimitiDate === 'function') setTimeout(aggiornaLimitiDate, 0);

            // Se il campo è vuoto, imposta un default a +15 minuti arrotondato
            if (!scheduledAtInput.value) {
                const defaultDate = new Date(now.getTime() + 15 * 60 * 1000);
                defaultDate.setMinutes(Math.ceil(defaultDate.getMinutes() / 5) * 5);
                scheduledAtInput.value = formatLocalDateTime(defaultDate);
            }

            if (pushSubmitBtn) pushSubmitBtn.textContent = "Programma Notifica";
        } else {
            scheduleDatetimeContainer.classList.add('hidden');
            scheduledAtInput.required = false;
            scheduledAtInput.value = '';
            if (pushSubmitBtn) pushSubmitBtn.textContent = "Invia Notifica Adesso";
        }
    });
});

// Permette l'apertura diretta del calendario cliccando sul campo datetime
if (scheduledAtInput) {
    scheduledAtInput.addEventListener('click', () => {
        if (typeof scheduledAtInput.showPicker === 'function') {
            try {
                scheduledAtInput.showPicker();
            } catch (err) {
                // Fallback trasparente per browser con restrizioni di focus
            }
        }
    });
}

// 2b. Scadenza avviso ("Valido fino a")
const scadeIlInput = document.getElementById('notif-scade-il');

// Orario di riferimento per la scadenza: l'invio programmato (se presente) o adesso
function orarioRiferimentoScadenza() {
    const sched = document.querySelector('input[name="notif-schedule-type"]:checked')?.value;
    if (sched === 'later' && scheduledAtInput && scheduledAtInput.value) {
        const d = new Date(scheduledAtInput.value);
        if (!isNaN(d.getTime()) && d.getTime() > Date.now()) return d;
    }
    return new Date();
}

// Impedisce di selezionare date passate nei selettori (il controllo vero è comunque al submit e sul server)
function aggiornaLimitiDate() {
    const adesso = formatLocalDateTime(new Date());
    if (scheduledAtInput) scheduledAtInput.min = adesso;
    if (scadeIlInput) scadeIlInput.min = formatLocalDateTime(orarioRiferimentoScadenza());
}

if (scadeIlInput) {
    scadeIlInput.addEventListener('focus', aggiornaLimitiDate);
    scadeIlInput.addEventListener('click', () => {
        aggiornaLimitiDate();
        if (typeof scadeIlInput.showPicker === 'function') {
            try { scadeIlInput.showPicker(); } catch (err) { /* browser con restrizioni */ }
        }
    });
}
if (scheduledAtInput) {
    scheduledAtInput.addEventListener('focus', aggiornaLimitiDate);
    scheduledAtInput.addEventListener('change', aggiornaLimitiDate);
}

document.querySelectorAll('.scadenza-rapida').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!scadeIlInput) return;
        const tipo = btn.dataset.scadenza;
        const base = orarioRiferimentoScadenza();
        let d = null;
        if (tipo === '2h') {
            d = new Date(base.getTime() + 2 * 60 * 60 * 1000);
        } else if (tipo === 'giorno') {
            d = new Date(base);
            d.setHours(23, 59, 0, 0);
            // Se manca meno di un'ora alla fine della giornata, passa al giorno dopo
            if (d.getTime() - base.getTime() < 60 * 60 * 1000) d.setDate(d.getDate() + 1);
        } else if (tipo === 'settimana') {
            d = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        scadeIlInput.value = d ? formatLocalDateTime(d) : '';
        aggiornaLimitiDate();
    });
});

function descriviScadenza(iso) {
    if (!iso) return 'istantanea (solo dispositivi raggiungibili al momento dell\'invio)';
    return new Date(iso).toLocaleString();
}

// Chiamata autenticata alla Edge Function send-push con timeout
async function chiamaSendPush(corpo, timeoutMs = 25000) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        const token = session ? session.access_token : window.SUPABASE_KEY;
        const response = await fetch(`${window.SUPABASE_URL}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': window.SUPABASE_KEY
            },
            body: JSON.stringify(corpo),
            signal: abortController.signal
        });
        const testo = await response.text();
        let dati = {};
        try { dati = JSON.parse(testo); } catch (e) { dati = { error: `Risposta non valida dal server (HTTP ${response.status})` }; }
        if (!response.ok) throw new Error(dati.error || `Errore chiamata server (HTTP ${response.status})`);
        return dati;
    } catch (err) {
        if (err.name === 'AbortError') throw new Error('Timeout: il server ha impiegato troppo tempo a rispondere.');
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Ultimo storico caricato (serve al modale di modifica scadenza)
let _avvisiStorico = {};

// 3. Invio Notifica tramite Supabase Edge Function con gestione robusta degli errori e timeout
if (pushForm) {
    pushForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const titolo = pushTitleInput.value.trim();
        const messaggio = pushBodyInput.value.trim();
        const tipoCanale = pushChannelSelect.value;
        const urlAzione = pushUrlInput.value.trim() || '/';

        const targetType = document.querySelector('input[name="notif-target-type"]:checked').value;
        let targetValore = null;

        // Validazione dei campi target con Toast invece di alert nativo
        if (targetType === 'corso') {
            targetValore = targetCourseSelect ? targetCourseSelect.value : null;
            if (!targetValore) {
                showToast('Seleziona un corso di laurea dalla lista o cercalo scrivendo.', 'error');
                courseSearchInput?.focus();
                return;
            }
        } else if (targetType === 'materia') {
            targetValore = targetValueInput.value.trim().toUpperCase();
            if (!targetValore) {
                showToast('Inserisci il nome della materia da raggiungere.', 'error');
                targetValueInput?.focus();
                return;
            }
        } else if (targetType === 'materia_corso') {
            const courseId = targetCourseSelect ? targetCourseSelect.value : null;
            const materiaName = targetValueInput.value.trim().toUpperCase();
            if (!courseId) {
                showToast('Seleziona un corso di laurea dalla lista o cercalo scrivendo.', 'error');
                courseSearchInput?.focus();
                return;
            }
            if (!materiaName) {
                showToast('Inserisci o seleziona il nome della materia per questo corso.', 'error');
                targetValueInput?.focus();
                return;
            }
            targetValore = `${courseId}|${materiaName}`;
        }

        const scheduleType = document.querySelector('input[name="notif-schedule-type"]:checked').value;
        let programmatoPer = null;
        if (scheduleType === 'later') {
            if (!scheduledAtInput.value) {
                showToast('Seleziona una data e ora valide per la pianificazione.', 'error');
                scheduledAtInput?.focus();
                return;
            }
            const parsedDate = new Date(scheduledAtInput.value);
            if (isNaN(parsedDate.getTime())) {
                showToast('Data e ora non valide.', 'error');
                return;
            }
            if (parsedDate.getTime() <= Date.now()) {
                showToast('La data di pianificazione deve essere nel futuro.', 'error');
                return;
            }
            programmatoPer = parsedDate.toISOString();
        }

        let scadeIl = null;
        if (scadeIlInput && scadeIlInput.value) {
            const dataScadenza = new Date(scadeIlInput.value);
            if (isNaN(dataScadenza.getTime())) {
                showToast('Data di scadenza non valida.', 'error');
                scadeIlInput.focus();
                return;
            }
            if (dataScadenza.getTime() <= Date.now()) {
                showToast('La scadenza deve essere nel futuro.', 'error');
                scadeIlInput.focus();
                return;
            }
            if (programmatoPer && dataScadenza.getTime() <= new Date(programmatoPer).getTime()) {
                showToast("La scadenza deve essere successiva all'orario di invio programmato.", 'error');
                scadeIlInput.focus();
                return;
            }
            scadeIl = dataScadenza.toISOString();
        }

        // Costruzione etichetta del corso per la descrizione della notifica
        let courseDisplayName = targetValore;
        if (_corsiUniSalento && targetValore) {
            const idToSearch = targetType === 'materia_corso' ? targetValore.split('|')[0] : targetValore;
            const foundCourse = _corsiUniSalento.find(c => c.id === idToSearch);
            if (foundCourse) courseDisplayName = `${foundCourse.nome} [${foundCourse.id}]`;
        }

        let targetDescrizione = "TUTTI gli studenti registrati";
        if (targetType === 'corso') {
            targetDescrizione = `gli studenti del corso:\n"${courseDisplayName}"`;
        } else if (targetType === 'materia') {
            targetDescrizione = `gli studenti che seguono la materia:\n"${targetValore}"`;
        } else if (targetType === 'materia_corso') {
            const materiaName = targetValueInput.value.trim().toUpperCase();
            targetDescrizione = `gli studenti di "${materiaName}" nel corso:\n"${courseDisplayName}"`;
        }

        const platformType = document.querySelector('input[name="notif-platform"]:checked')?.value || 'tutti';
        let platformDesc = "Tutte le piattaforme (PWA + APK)";
        if (platformType === 'pwa') platformDesc = "Solo Web PWA";
        else if (platformType === 'apk') platformDesc = "Solo APK Android";

        const isLater = scheduleType === 'later';
        const confermaTesto = isLater
            ? `Vuoi programmare questa notifica per il ${new Date(programmatoPer).toLocaleString()} a:\n${targetDescrizione}\n[Piattaforma: ${platformDesc}]\n[Scadenza: ${descriviScadenza(scadeIl)}]?`
            : `Sei sicuro di voler INVIARE SUBITO questa notifica a:\n${targetDescrizione}\n[Piattaforma: ${platformDesc}]\n[Scadenza: ${descriviScadenza(scadeIl)}]?`;

        // Modale di conferma personalizzato (elimina il fastidioso popup nativo del browser)
        const confirmed = await customConfirm(confermaTesto, {
            title: isLater ? 'Pianificazione Notifica' : 'Invio Immediato Notifica',
            confirmText: isLater ? 'Programma Notifica' : 'Invia Subito',
            cancelText: 'Annulla',
            icon: isLater ? '⏰' : '🚀',
            isDanger: false
        });

        if (!confirmed) return;

        // Disabilita pulsante e mostra stato di caricamento dinamico
        pushSubmitBtn.disabled = true;
        pushSubmitBtn.innerHTML = `
            <span class="admin-riga">
                <span class="spinning">⏳</span>
                <span>${isLater ? 'Pianificazione in corso...' : 'Invio in corso...'}</span>
            </span>
        `;
        pushSubmitStatus.textContent = isLater ? "Pianificazione avviso sul server..." : "Invio notifica in corso...";
        pushSubmitStatus.className = 'in-corso';

        // Timeout di sicurezza (25s) tramite AbortController per evitare blocchi infiniti
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 25000);

        try {
            const { data: { session } } = await _supabase.auth.getSession();
            const token = session ? session.access_token : window.SUPABASE_KEY;

            // Invocazione della Edge Function send-push su Supabase
            const endpoint = `${window.SUPABASE_URL}/functions/v1/send-push`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': window.SUPABASE_KEY
                },
                body: JSON.stringify({
                    titolo: titolo,
                    messaggio: messaggio,
                    tipo_canale: tipoCanale,
                    target_tipo: targetType,
                    target_valore: targetValore,
                    target_dettagli: { piattaforma: platformType },
                    url_azione: urlAzione,
                    programmato_per: programmatoPer,
                    scade_il: scadeIl
                }),
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            // Lettura sicura del body (gestisce sia JSON che risposte HTML/errore)
            const responseText = await response.text();
            let resData = {};
            try {
                resData = JSON.parse(responseText);
            } catch (jsonErr) {
                resData = { error: `Risposta non valida dal server (HTTP ${response.status})` };
            }

            if (!response.ok) {
                throw new Error(resData.error || `Errore chiamata server (HTTP ${response.status})`);
            }

            if (resData.programmato) {
                pushSubmitStatus.textContent = "✅ Notifica programmata con successo!";
                pushSubmitStatus.className = 'riuscito';
                showToast("Notifica programmata con successo!", "success");
            } else {
                const inviati = resData.inviati !== undefined ? resData.inviati : 0;
                const invPwa = resData.inviati_pwa !== undefined ? resData.inviati_pwa : null;
                const invApk = resData.inviati_apk !== undefined ? resData.inviati_apk : null;
                let dett = '';
                if (invPwa !== null && invApk !== null) {
                    dett = ` (${invPwa} PWA, ${invApk} APK)`;
                }
                pushSubmitStatus.textContent = `✅ Notifica inviata! Raggiunti: ${inviati} dispositivi${dett}.`;
                pushSubmitStatus.className = 'riuscito';
                showToast(`Notifica inviata a ${inviati} dispositivi${dett}!`, "success");
            }

            // Reset completo del modulo
            pushTitleInput.value = '';
            pushBodyInput.value = '';
            targetValueInput.value = '';
            selezionaCorso('', '');
            if (materieDatalist) materieDatalist.innerHTML = '';
            scheduledAtInput.value = '';
            if (scadeIlInput) scadeIlInput.value = '';

            document.querySelector('input[name="notif-target-type"][value="tutti"]').checked = true;
            document.querySelector('input[name="notif-schedule-type"][value="now"]').checked = true;
            const defPlat = document.querySelector('input[name="notif-platform"][value="tutti"]');
            if (defPlat) defPlat.checked = true;

            if (targetCourseContainer) targetCourseContainer.classList.add('hidden');
            targetValueContainer.classList.add('hidden');
            scheduleDatetimeContainer.classList.add('hidden');

            // Ricarica lo storico notifiche in modo asincrono protetto
            try {
                await fetchNotifications();
            } catch (hErr) {
                console.warn('Errore aggiornamento storico notifiche:', hErr);
            }

            setTimeout(() => {
                pushSubmitStatus.textContent = '';
            }, 6000);

        } catch (err) {
            clearTimeout(timeoutId);
            console.error('Errore invio push:', err);
            if (err.name === 'AbortError') {
                pushSubmitStatus.textContent = "⚠️ Timeout: il server ha impiegato troppo tempo a rispondere. Verifica lo storico.";
                showToast("Timeout: il server ha impiegato troppo tempo a rispondere.", "error");
            } else {
                pushSubmitStatus.textContent = `❌ Errore: ${err.message}`;
                showToast(`Errore: ${err.message}`, "error");
            }
            pushSubmitStatus.className = 'fallito';
        } finally {
            // Ripristino garantito al 100% dello stato del pulsante, prevenendo qualsiasi blocco della pagina
            pushSubmitBtn.disabled = false;
            const currentSched = document.querySelector('input[name="notif-schedule-type"]:checked')?.value;
            pushSubmitBtn.textContent = currentSched === 'later' ? "Programma Notifica" : "Invia Notifica";
        }
    });
}

// 4. Carica Contatore Sottoscrizioni e Storico Avvisi
async function fetchNotifications() {
    if (!notificationsHistoryList) return;

    try {
        // A. Conta dispositivi attivi distinguendo PWA e APK.
        // Usa la funzione RPC conta_iscrizioni_push (supabase/sql/02b): restituisce solo i
        // totali, senza il limite di 1000 righe e senza leggere la tabella delle iscrizioni.
        const { data: conteggi, error: subsErr } = await _supabase.rpc('conta_iscrizioni_push');

        if (subsErr) {
            console.warn('Conteggio iscrizioni push non riuscito:', subsErr.message);
        } else if (conteggi) {
            const riga = Array.isArray(conteggi) ? (conteggi[0] || {}) : conteggi;
            const tot = Number(riga.totale) || 0;
            const apkCount = Number(riga.apk) || 0;
            const pwaCount = Number(riga.pwa) || 0;

            if (pushSubscribersCount) pushSubscribersCount.textContent = tot;
            const pwaElem = document.getElementById('push-pwa-count');
            const apkElem = document.getElementById('push-apk-count');
            if (pwaElem) pwaElem.textContent = pwaCount;
            if (apkElem) apkElem.textContent = apkCount;
        }

        // B. Carica storico avvisi
        const { data: avvisi, error: avvisiErr } = await _supabase
            .from('avvisi_sistema')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(25);

        if (avvisiErr) throw avvisiErr;

        if (!avvisi || avvisi.length === 0) {
            notificationsHistoryList.innerHTML = `
                <div class="admin-vuoto">
                    Nessuna notifica inviata o programmata al momento.
                </div>
            `;
            return;
        }

        _avvisiStorico = {};
        avvisi.forEach(a => { _avvisiStorico[String(a.id)] = a; });

        notificationsHistoryList.innerHTML = avvisi.map(item => {
            const isProgrammato = item.stato === 'programmato';
            const isInviato = item.stato === 'inviato';
            const isAnnullato = item.stato === 'annullato';
            const isScadutoNonInviato = item.stato === 'scaduto';
            const scadenza = item.scade_il ? new Date(item.scade_il) : null;
            const validitaTerminata = isInviato && (!scadenza || scadenza.getTime() <= Date.now());
            const modificabile = isProgrammato || isInviato || isScadutoNonInviato;

            let badgeHtml = '';
            if (isProgrammato) {
                badgeHtml = `<span class="admin-stato att">⏰ Programmato</span>`;
            } else if (isInviato) {
                badgeHtml = `<span class="admin-stato ok">✅ Inviato</span>`;
            } else if (isScadutoNonInviato) {
                badgeHtml = `<span class="admin-stato">⌛ Non inviato (scaduto)</span>`;
            } else if (isAnnullato) {
                badgeHtml = `<span class="admin-stato ko">🚫 Annullato</span>`;
            } else {
                badgeHtml = `<span class="admin-stato info">⏳ ${item.stato}</span>`;
            }

            const plat = item.target_dettagli?.piattaforma;
            let platBadge = '';
            if (plat === 'pwa') {
                platBadge = `<span class="admin-stato web">🌐 Solo PWA</span>`;
            } else if (plat === 'apk') {
                platBadge = `<span class="admin-stato apk">🤖 Solo APK</span>`;
            }

            const dataCreazione = new Date(item.created_at).toLocaleString();
            const dataProgrammata = item.programmato_per ? new Date(item.programmato_per).toLocaleString() : null;

            return `
                <div class="avviso-storico">
                    <div class="avviso-storico-testo">
                        <div class="avviso-storico-etichette">
                            ${badgeHtml}
                            <span class="admin-testo-sub admin-piccolo">${dataCreazione}</span>
                            <span class="admin-stato">Canale: ${item.tipo_canale || 'avvisi'}</span>
                            <span class="admin-stato">Target: ${item.target_tipo || 'tutti'}${item.target_valore ? ' (' + item.target_valore + ')' : ''}</span>
                            ${platBadge}
                            ${validitaTerminata ? `<span class="admin-stato">⌛ Scaduto</span>` : ''}
                        </div>
                        <h4 class="avviso-storico-titolo">${escapeHtml(item.titolo)}</h4>
                        <p class="avviso-storico-messaggio">${escapeHtml(item.messaggio)}</p>
                        ${dataProgrammata ? `<div class="avviso-storico-riga programmato">📅 Programmato per: <strong>${dataProgrammata}</strong></div>` : ''}
                        ${!isAnnullato ? (scadenza
                            ? `<div class="avviso-storico-riga">⌛ Valido fino a: <strong>${scadenza.toLocaleString()}</strong></div>`
                            : `<div class="avviso-storico-riga">⌛ Scadenza istantanea (solo dispositivi raggiungibili all'invio)</div>`) : ''}
                        ${isInviato ? `<div class="avviso-storico-riga">📱 Dispositivi raggiunti (PWA & APK): <strong>${item.conteggio_pwa_inviati || 0}</strong></div>` : ''}
                    </div>
                    <div class="actions">
                        ${modificabile ? `
                            <button onclick="modificaScadenzaAvviso('${item.id}')" class="btn btn-secondary btn-sm" title="Modifica scadenza">
                                ⌛ Modifica scadenza
                            </button>
                        ` : ''}
                        ${isProgrammato ? `
                            <button onclick="annullaAvvisoProgrammato('${item.id}')" class="btn btn-secondary btn-sm admin-pericolo">
                                Annulla Invio
                            </button>
                        ` : ''}
                        <button onclick="eliminaAvviso('${item.id}')" class="btn btn-secondary btn-sm admin-discreto" title="Elimina dallo storico">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Errore caricamento storico notifiche:', e);
        notificationsHistoryList.innerHTML = `<div class="admin-errore">Errore caricamento storico: ${e.message}</div>`;
    }
}

if (refreshNotificationsBtn) {
    refreshNotificationsBtn.addEventListener('click', fetchNotifications);
}

// Funzione globale per annullare un avviso programmato con modale personalizzato
window.annullaAvvisoProgrammato = async function (id) {
    const ok = await customConfirm('Vuoi davvero annullare questo invio programmato? La notifica non verrà spedita agli studenti.', {
        title: 'Annulla Invio Programmato',
        confirmText: 'Annulla Notifica',
        cancelText: 'Chiudi',
        icon: '🚫',
        isDanger: true
    });
    if (!ok) return;

    try {
        const { error } = await _supabase
            .from('avvisi_sistema')
            .update({ stato: 'annullato' })
            .eq('id', id);

        if (error) throw error;
        showToast('Notifica programmata annullata!', 'success');
        fetchNotifications();
    } catch (err) {
        console.error('Errore annullamento:', err);
        showToast(`Errore: ${err.message}`, 'error');
    }
};

// Funzione globale per eliminare un record dallo storico con modale personalizzato
window.eliminaAvviso = async function (id) {
    const ok = await customConfirm('Eliminare definitivamente questo record dallo storico delle notifiche?', {
        title: 'Elimina Record Storico',
        confirmText: 'Elimina Record',
        cancelText: 'Annulla',
        icon: '🗑️',
        isDanger: true
    });
    if (!ok) return;

    try {
        const { error } = await _supabase
            .from('avvisi_sistema')
            .delete()
            .eq('id', id);

        if (error) throw error;
        showToast('Record eliminato dallo storico!', 'success');
        fetchNotifications();
    } catch (err) {
        console.error('Errore eliminazione:', err);
        showToast(`Errore: ${err.message}`, 'error');
    }
};

// Modale per modificare scadenza (e orario di invio, se programmato) di un avviso
window.modificaScadenzaAvviso = function (id) {
    const avviso = _avvisiStorico[String(id)];
    if (!avviso) { showToast('Avviso non trovato: aggiorna lo storico.', 'error'); return; }
    const isProgrammato = avviso.stato === 'programmato';
    const isInviato = avviso.stato === 'inviato';

    const esistente = document.getElementById('modale-scadenza-avviso');
    if (esistente) esistente.remove();

    const adesso = new Date();
    const valoreScadenza = avviso.scade_il && new Date(avviso.scade_il) > adesso ? formatLocalDateTime(new Date(avviso.scade_il)) : '';
    const valoreProgrammato = avviso.programmato_per ? formatLocalDateTime(new Date(avviso.programmato_per)) : '';

    let spiegazione;
    if (isProgrammato) {
        spiegazione = 'Avviso non ancora inviato: puoi cambiare orario di invio e scadenza.';
    } else if (isInviato) {
        spiegazione = 'Prolungando la scadenza, l\'avviso viene reinviato solo ai dispositivi che non ne hanno confermato la ricezione. Lasciando il campo vuoto l\'avviso scade adesso.';
    } else {
        spiegazione = 'L\'avviso non è mai partito perché era già scaduto. Impostando una nuova scadenza viene inviato adesso a tutti i destinatari.';
    }

    const overlay = document.createElement('div');
    overlay.id = 'modale-scadenza-avviso';
    overlay.className = 'modal modale-scadenza';
    overlay.innerHTML = `
        <div class="modal-content stretta">
            <h2 class="con-sottotitolo">⌛ Modifica scadenza</h2>
            <p class="modale-scadenza-avviso"><strong>${escapeHtml(avviso.titolo)}</strong></p>
            <p class="modal-sottotitolo">${spiegazione}</p>
            ${isProgrammato ? `
                <div class="form-group">
                    <label for="mod-programmato">📅 Orario di invio</label>
                    <input type="datetime-local" id="mod-programmato" class="form-control" value="${valoreProgrammato}" min="${formatLocalDateTime(adesso)}">
                </div>
            ` : ''}
            <div class="form-group">
                <label for="mod-scade-il">⌛ Valido fino a</label>
                <input type="datetime-local" id="mod-scade-il" class="form-control" value="${valoreScadenza}" min="${formatLocalDateTime(adesso)}">
                <small class="admin-aiuto">Vuoto = scadenza istantanea.</small>
            </div>
            <div class="admin-azioni-modale">
                <button type="button" id="mod-annulla" class="btn btn-secondary">Chiudi</button>
                <button type="button" id="mod-salva" class="btn btn-primary">Salva</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const chiudi = () => overlay.remove();
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) chiudi(); });
    overlay.querySelector('#mod-annulla').addEventListener('click', chiudi);

    const inputScadenza = overlay.querySelector('#mod-scade-il');
    const inputProgrammato = overlay.querySelector('#mod-programmato');
    [inputScadenza, inputProgrammato].forEach(inp => {
        if (!inp) return;
        inp.addEventListener('click', () => {
            inp.min = formatLocalDateTime(new Date());
            if (typeof inp.showPicker === 'function') { try { inp.showPicker(); } catch (e) { } }
        });
    });

    const btnSalva = overlay.querySelector('#mod-salva');
    btnSalva.addEventListener('click', async () => {
        let programmatoPer = null;
        if (inputProgrammato) {
            if (!inputProgrammato.value) { showToast("Inserisci l'orario di invio.", 'error'); return; }
            const d = new Date(inputProgrammato.value);
            if (isNaN(d.getTime()) || d.getTime() <= Date.now()) {
                showToast("L'orario di invio deve essere nel futuro.", 'error');
                return;
            }
            programmatoPer = d.toISOString();
        }

        let scadeIl = null;
        if (inputScadenza.value) {
            const d = new Date(inputScadenza.value);
            if (isNaN(d.getTime()) || d.getTime() <= Date.now()) {
                showToast('La scadenza deve essere nel futuro.', 'error');
                return;
            }
            if (programmatoPer && d.getTime() <= new Date(programmatoPer).getTime()) {
                showToast("La scadenza deve essere successiva all'orario di invio.", 'error');
                return;
            }
            scadeIl = d.toISOString();
        }

        if (!isProgrammato && !scadeIl) {
            if (!isInviato) { showToast('Imposta una scadenza futura per inviare l\'avviso.', 'error'); return; }
            const ok = await customConfirm("Senza scadenza l'avviso scade adesso: i dispositivi che non l'hanno ancora ricevuto non lo riceveranno più. Continuare?", {
                title: 'Termina validità avviso',
                confirmText: 'Fai scadere ora',
                cancelText: 'Annulla',
                icon: '⌛',
                isDanger: true
            });
            if (!ok) return;
        }

        btnSalva.disabled = true;
        btnSalva.textContent = 'Salvataggio...';
        try {
            const res = await chiamaSendPush({
                azione: 'modifica_scadenza',
                id: avviso.id,
                scade_il: scadeIl,
                programmato_per: programmatoPer
            });
            chiudi();
            if (res.reinviati > 0) {
                const dett = (res.reinviati_pwa !== undefined && res.reinviati_apk !== undefined)
                    ? ` (${res.reinviati_pwa} PWA, ${res.reinviati_apk} APK)` : '';
                showToast(`Scadenza aggiornata. Reinviato a ${res.reinviati} dispositivi${dett}.`, 'success');
            } else {
                showToast('Scadenza aggiornata!', 'success');
            }
            fetchNotifications();
        } catch (err) {
            console.error('Errore modifica scadenza:', err);
            showToast(`Errore: ${err.message}`, 'error');
            btnSalva.disabled = false;
            btnSalva.textContent = 'Salva';
        }
    });
};

// =====================================================================
// Simulatore del portale (script SQL 09): lezioni del corso finto TEST in portale_test.
// Le Edge Functions le leggono al posto del portale; le modifiche vanno solo ai tester.
// =====================================================================
const SIM_AULE = [
    { aula: 'Aula Simulata 1 [Simulatore]', codice: 'SIM - 1' },
    { aula: 'Aula Simulata 2 [Simulatore]', codice: 'SIM - 2' },
    { aula: 'Aula Simulata 3 [Simulatore]', codice: 'SIM - 3' },
];
const SIM_GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

function _simIso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function _simOra(minuti) {
    return `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(2, '0')}`;
}
function _simMinuti(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
}

async function caricaSimulatore() {
    const elenco = document.getElementById('sim-elenco');
    const { data, error } = await _supabase.from('portale_test').select('*')
        .order('data').order('ora_inizio');
    if (error) {
        elenco.innerHTML = `<span class="admin-errore">Errore: ${escapeHtml(error.message)}. Lo script SQL 09 &egrave; stato applicato?</span>`;
        return;
    }
    if (!data.length) {
        elenco.textContent = 'Nessuna lezione: premi "Genera lezioni di prova".';
        return;
    }
    elenco.innerHTML = `<div class="admin-tabella-scorre"><table class="admin-tabella compatta">
        <thead><tr><th>Giorno</th><th>Orario</th><th>Materia</th><th>Aula</th><th>Id</th><th></th></tr></thead>
        <tbody>${data.map(r => {
            const d = new Date(r.data + 'T00:00:00');
            const id = escapeHtml(r.evento_id);
            return `<tr class="${r.annullato ? 'annullata' : ''}">
                <td>${SIM_GIORNI[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}</td>
                <td>${escapeHtml(r.ora_inizio)}-${escapeHtml(r.ora_fine)}</td>
                <td>${escapeHtml(r.insegnamento)}</td>
                <td>${escapeHtml(r.codice_aula || '')}</td>
                <td class="admin-testo-sub sim-id">${id}</td>
                <td class="destra">
                    <button class="btn btn-secondary btn-sm" data-sim="aula" data-id="${id}" title="Aula successiva">Aula</button>
                    <button class="btn btn-secondary btn-sm" data-sim="orario" data-id="${id}" title="Un'ora dopo">+1h</button>
                    <button class="btn btn-secondary btn-sm" data-sim="giorno" data-id="${id}" title="Il giorno dopo">+1g</button>
                    <button class="btn btn-secondary btn-sm" data-sim="annulla" data-id="${id}">${r.annullato ? 'Ripristina' : 'Annulla'}</button>
                    <button class="btn btn-secondary btn-sm" data-sim="rinumera" data-id="${id}" title="Stessa lezione con un nuovo id (come fa a volte il portale)">Nuovo id</button>
                </td></tr>`;
        }).join('')}</tbody></table></div>`;
    elenco.querySelectorAll('[data-sim]').forEach(b => b.addEventListener('click', () =>
        modificaLezioneTest(b.dataset.sim, b.dataset.id, data.find(r => r.evento_id === b.dataset.id))));
}

async function modificaLezioneTest(azione, id, r) {
    if (!r) return;
    let errore = null;
    const ora = new Date().toISOString();
    if (azione === 'rinumera') {
        const nuovo = { ...r, evento_id: `T${Date.now().toString(36)}`, aggiornato_il: ora };
        ({ error: errore } = await _supabase.from('portale_test').insert(nuovo));
        if (!errore) ({ error: errore } = await _supabase.from('portale_test').delete().eq('evento_id', id));
    } else {
        const modifica = { aggiornato_il: ora };
        if (azione === 'aula') {
            const i = SIM_AULE.findIndex(a => a.codice === r.codice_aula);
            const a = SIM_AULE[(i + 1) % SIM_AULE.length];
            modifica.aula = a.aula; modifica.codice_aula = a.codice;
        } else if (azione === 'orario') {
            modifica.ora_inizio = _simOra(Math.min(_simMinuti(r.ora_inizio) + 60, 22 * 60));
            modifica.ora_fine = _simOra(Math.min(_simMinuti(r.ora_fine) + 60, 23 * 60));
        } else if (azione === 'giorno') {
            const d = new Date(r.data + 'T00:00:00'); d.setDate(d.getDate() + 1);
            modifica.data = _simIso(d);
        } else if (azione === 'annulla') {
            modifica.annullato = !r.annullato;
        }
        ({ error: errore } = await _supabase.from('portale_test').update(modifica).eq('evento_id', id));
    }
    if (errore) showToast('Errore: ' + errore.message, 'error');
    caricaSimulatore();
}

document.getElementById('sim-genera')?.addEventListener('click', async () => {
    // Questa settimana e la prossima, dal lunedi' al venerdi': due lezioni al giorno
    const oggi = new Date();
    const lunedi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - ((oggi.getDay() + 6) % 7));
    const righe = [];
    for (let s = 0; s < 2; s++) {
        for (let g = 0; g < 5; g++) {
            const d = new Date(lunedi); d.setDate(lunedi.getDate() + s * 7 + g);
            const iso = _simIso(d);
            righe.push(
                { evento_id: `T${iso.replace(/-/g, '')}a`, data: iso, ora_inizio: '09:00', ora_fine: '11:00',
                  insegnamento: 'ANALISI DI PROVA', docente: 'Docente Simulato', aula: SIM_AULE[0].aula, codice_aula: SIM_AULE[0].codice, annullato: false },
                { evento_id: `T${iso.replace(/-/g, '')}b`, data: iso, ora_inizio: '15:00', ora_fine: '17:00',
                  insegnamento: 'FISICA DI PROVA', docente: 'Docente Simulato', aula: SIM_AULE[1].aula, codice_aula: SIM_AULE[1].codice, annullato: false },
            );
        }
    }
    const { error } = await _supabase.from('portale_test').upsert(righe, { onConflict: 'evento_id' });
    if (error) showToast('Errore: ' + error.message, 'error');
    else showToast(`${righe.length} lezioni di prova pronte`);
    caricaSimulatore();
});

document.getElementById('sim-svuota')?.addEventListener('click', async () => {
    if (!(await customConfirm('Eliminare tutte le lezioni del corso TEST?', { title: 'Svuota il simulatore', confirmText: 'Svuota' }))) return;
    const { error } = await _supabase.from('portale_test').delete().neq('evento_id', '');
    if (error) showToast('Errore: ' + error.message, 'error');
    caricaSimulatore();
});

document.querySelectorAll('[data-sim-funzione]').forEach(b => b.addEventListener('click', async () => {
    const funzione = b.dataset.simFunzione;
    const esito = document.getElementById('sim-esito');
    b.disabled = true;
    esito.classList.remove('hidden');
    esito.textContent = `${funzione}: in corso...`;
    try {
        const { data, error } = await _supabase.functions.invoke(funzione, { body: { solo_test: true } });
        if (error) {
            let dettaglio = error.message;
            try { dettaglio += ' ' + JSON.stringify(await error.context.json()); } catch (_) { /* nessun corpo */ }
            throw new Error(dettaglio);
        }
        esito.textContent = `${funzione}:\n${JSON.stringify(data, null, 2)}`;
    } catch (err) {
        esito.textContent = `${funzione}: errore\n${err.message}`;
    } finally {
        b.disabled = false;
    }
}));
