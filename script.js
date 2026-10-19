document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('toggle');
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', !isExpanded);
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburger.classList.remove('toggle');
                hamburger.setAttribute('aria-expanded', 'false');
            });
        });
    }

    const hasDynamicElements = document.getElementById('latest-update-container') || 
                               document.getElementById('timeline-container') || 
                               document.getElementById('hero-download-btn') ||
                               document.getElementById('credits-container') ||
                               document.getElementById('contacts-container') ||
                               document.getElementById('features-grid') ||
                               document.getElementById('privacy-container') ||
                               document.getElementById('faq-container') ||
                               document.getElementById('bugs-container') ||
                               document.getElementById('footer-versione');

    if (window.supabase && hasDynamicElements) {
        const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        loadAllDynamicContent(supabaseClient);
    }

    // Scroll Reveal Initialization
    initScrollReveal();

    // Inizializzazione Prompt e Guida PWA (iOS / Android / PC)
    initPwaInstallationFlow();

    // Pagina Download: scheda del dispositivo in uso
    initSchedeDownload();

    // Back to Top logic
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -20px 0px"
    };

    if (!('IntersectionObserver' in window)) {
        reveals.forEach(el => el.classList.add('active'));
        return;
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: stop observing once revealed
                // observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    reveals.forEach(el => revealObserver.observe(el));
}

async function loadAllDynamicContent(_supabase) {
    // Carichiamo tutto in parallelo ma aspettiamo che finiscano tutti
    const promises = [];

    if (document.getElementById('contacts-container')) {
        promises.push(loadContacts(_supabase));
    }

    if (document.getElementById('credits-container')) {
        promises.push(loadCredits(_supabase));
    } else if (document.getElementById('latest-update-container') || document.getElementById('hero-download-btn')) {
        promises.push(loadDynamicUpdates(_supabase));
    }

    if (document.getElementById('legal-container')) {
        promises.push(loadLegal(_supabase));
    }

    if (document.getElementById('privacy-container')) {
        promises.push(loadPrivacy(_supabase));
    }



    if (document.getElementById('features-grid')) {
        promises.push(loadFeatures(_supabase));
    }

    if (document.getElementById('faq-container')) {
        promises.push(loadFAQ(_supabase));
    }

    if (document.getElementById('bugs-container')) {
        promises.push(loadBugs(_supabase));
    }

    // Stats Bar (uses GitHub API + data already loaded)
    if (document.getElementById('stat-downloads')) {
        promises.push(loadStats(_supabase));
    }

    if (document.getElementById('footer-versione')) {
        promises.push(loadFooterVersion(_supabase));
    }

    await Promise.all(promises);
    
    // Una volta che tutto il contenuto dinamico è nel DOM, inizializziamo le animazioni
    initScrollReveal();
}

async function loadLegal(_supabase) {
    const container = document.getElementById('legal-container');
    const { data, error } = await _supabase
        .from('legal')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });

    if (error || !data || data.length === 0) {
        container.style.display = 'none';
        return;
    }

    const termsData = data.filter(item => item.category === 'Termini di Servizio');

    container.innerHTML = '';
    
    if (termsData.length > 0) {
        container.style.display = 'block';
        const block = document.createElement('div');
        block.className = 'legal-block';
        
        let html = `<h2>Termini di Servizio</h2>`;
        termsData.forEach(item => {
            html += `
                <div class="legal-item reveal">
                    <span class="item-title">${item.title}</span> ${item.description}
                </div>
            `;
        });
        
        block.innerHTML = html;
        container.appendChild(block);
    } else {
        container.style.display = 'none';
    }
}

async function loadPrivacy(_supabase) {
    const container = document.getElementById('privacy-container');
    const apriTutte = document.getElementById('privacy-tutte');
    const { data, error } = await _supabase
        .from('legal')
        .select('*')
        .eq('is_visible', true)
        .eq('category', 'Informativa sulla Privacy')
        .order('order_index', { ascending: true });

    if (error || !data || data.length === 0) {
        container.innerHTML = '<p class="privacy-stato">Non riesco a caricare l&rsquo;informativa adesso: riprova tra qualche minuto.</p>';
        return;
    }

    // Titoli del pannello come "1. RACCOLTA DATI LOCALE E PRIVACY:": numero e due punti tolti, solo l'iniziale maiuscola
    const titolo = (s) => {
        const t = String(s || '').replace(/^\s*\d+[.)]\s*/, '').replace(/[:.\s]+$/, '').toLowerCase();
        return t.charAt(0).toUpperCase() + t.slice(1);
    };
    // Icona della sezione scelta dal titolo; una sezione nuova con un titolo diverso usa il foglio
    const icona = (t) => /raccolta|dati locale/i.test(t) ? 'smartphone' : /servizi esterni|comunicazione/i.test(t) ? 'cloud'
        : /notifiche/i.test(t) ? 'notifications' : /profilazione|ads|pubblicit/i.test(t) ? 'block'
        : /posizione/i.test(t) ? 'location_on' : /autorizzazion|permess/i.test(t) ? 'key'
        : /donazion/i.test(t) ? 'volunteer_activism' : /modifiche/i.test(t) ? 'update'
        : /contatt/i.test(t) ? 'mail' : 'description';

    container.innerHTML = data.map((item, i) => `
        <details class="privacy-voce"${i === 0 ? ' open' : ''}>
            <summary>
                <span class="funzione-ms privacy-icona" aria-hidden="true">${icona(item.title)}</span>
                <h2>${titolo(item.title)}</h2>
                <span class="funzione-ms privacy-piu" aria-hidden="true">add</span>
            </summary>
            <p>${String(item.description || '').replace(/\u200B/g, '').trim()}</p>
        </details>`).join('');

    // "Apri tutte" / "Chiudi tutte", aggiornato anche quando si apre o chiude una voce a mano
    if (apriTutte) {
        const voci = [...container.querySelectorAll('details')];
        const aggiorna = () => { apriTutte.textContent = voci.every(d => d.open) ? 'Chiudi tutte' : 'Apri tutte'; };
        apriTutte.onclick = () => {
            const apri = voci.some(d => !d.open);
            voci.forEach(d => { d.open = apri; });
            aggiorna();
        };
        voci.forEach(d => d.addEventListener('toggle', aggiorna));
        apriTutte.hidden = false;
        aggiorna();
    }

    // Data dell'ultima voce aggiunta o modificata nel pannello
    const ultima = data.map(item => item.updated_at || item.created_at).filter(Boolean).sort().pop();
    const aggiornata = document.getElementById('privacy-aggiornata');
    if (ultima && aggiornata) {
        aggiornata.lastElementChild.textContent = 'Ultimo aggiornamento: ' +
            new Date(ultima).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
        aggiornata.hidden = false;
    }
}

// Icona Material per un contatto: dall'emoji del pannello o, se manca, dal tipo di indirizzo
const EMOJI_CONTATTI = {
    '📧': 'mail', '✉️': 'mail', '📩': 'mail', '💻': 'code', '🐙': 'code', '📢': 'campaign',
    '💬': 'chat', '📱': 'smartphone', '📸': 'photo_camera', '✈️': 'send', '🌐': 'public', '🔗': 'link',
};
function iconaContatto(icona, url) {
    const nome = EMOJI_CONTATTI[String(icona || '').trim()] || (String(url).startsWith('mailto:') ? 'mail' : 'link');
    return `<span class="funzione-ms" aria-hidden="true">${nome}</span>`;
}

async function loadContacts(_supabase) {
    const container = document.getElementById('contacts-container');
    const cacheKey = 'qc_cache_contacts';
    const cached = localStorage.getItem(cacheKey);

    const renderData = (data) => {
        if (!data || data.length === 0) {
            container.innerHTML = '';
            return;
        }
        // Un pulsante per contatto nella fascia "Hai un'idea o un problema?": il primo in oro.
        // Il testo è l'etichetta del pannello, il recapito compare passandoci sopra.
        container.innerHTML = '';
        data.forEach((item, index) => {
            const btn = document.createElement('a');
            btn.href = item.url;
            btn.className = `btn ${index === 0 ? 'btn-primary' : 'btn-secondary'}`;
            btn.title = item.value || '';
            if (item.url.startsWith('http')) {
                btn.target = '_blank';
                btn.rel = 'noopener noreferrer';
            }
            btn.innerHTML = `${iconaContatto(item.icon, item.url)}<span>${item.label}</span>`;
            container.appendChild(btn);
        });
    };

    if (cached) {
        try { renderData(JSON.parse(cached)); } catch(e) {}
    }

    const { data, error } = await _supabase
        .from('contacts')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Errore Supabase:', error);
        // Senza contatti la sezione di aiuto resterebbe vuota: offri comunque una strada
        // Senza contatti dal pannello resta comunque l'email, accanto a "Problemi noti"
        if (!cached) container.innerHTML = '<a class="btn btn-primary" href="mailto:stefano.sciurba@studenti.unisalento.it"><span class="funzione-ms" aria-hidden="true">mail</span><span>Scrivimi una email</span></a>';
        return;
    }

    const freshString = JSON.stringify(data);
    if (freshString !== cached) {
        localStorage.setItem(cacheKey, freshString);
        renderData(data);
    }
}

// Icona del logo di Instagram per i link dei Credits (il font delle icone non ha i loghi)
const SVG_INSTAGRAM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8zm0 8.1a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.1-9.4a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3z"/></svg>';

async function loadCredits(_supabase) {
    const container = document.getElementById('credits-container');
    const cacheKey = 'qc_cache_credits';
    const cached = localStorage.getItem(cacheKey);

    // Testi del pannello: spazi invisibili e spazi ai bordi tolti; categorie con la sola iniziale maiuscola
    const pulito = (s) => String(s || '').replace(/\u200B/g, '').trim();
    const categoria = (c) => {
        const t = pulito(c).toLowerCase() || 'generale';
        return t.charAt(0).toUpperCase() + t.slice(1);
    };
    // Icone scelte dal nome: del ruolo (categoria) e della tecnologia
    const iconaRuolo = (r) => /svilupp/i.test(r) ? 'code' : /distribu|promoz|diffus/i.test(r) ? 'campaign'
        : /design|grafic/i.test(r) ? 'palette' : /test|prov/i.test(r) ? 'bug_report' : 'star';
    const iconaTecnologia = (t) => /flutter/i.test(t) ? 'phone_android' : /dart/i.test(t) ? 'data_object'
        : /html|css|js/i.test(t) ? 'language' : 'code';
    const link = (url) => /instagram\.com/i.test(url) ? `${SVG_INSTAGRAM}Instagram`
        : /github\.com/i.test(url) ? '<span class="funzione-ms" aria-hidden="true">code</span>GitHub'
        : '<span class="funzione-ms" aria-hidden="true">open_in_new</span>Visita il sito';

    const renderData = (data) => {
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="credits-stato">Nessun riconoscimento presente.</p>';
            return;
        }

        const gruppi = [];
        data.forEach(item => {
            const nome = categoria(item.category);
            let g = gruppi.find(x => x.nome === nome);
            if (!g) gruppi.push(g = { nome, voci: [] });
            g.voci.push(item);
        });

        container.innerHTML = gruppi.map(g => {
            if (/tecnolog/i.test(g.nome)) {
                return `
                    <div class="credits-blocco reveal">
                        <span class="sezione-etichetta">Fatto con</span>
                        <div class="credits-tecnologie">
                            ${g.voci.map(v => `<span title="${pulito(v.description).replace(/"/g, '&quot;')}"><span class="funzione-ms" aria-hidden="true">${iconaTecnologia(v.title)}</span>${pulito(v.title)}</span>`).join('')}
                        </div>
                    </div>`;
            }
            if (/legale|note/i.test(g.nome)) {
                return `
                    <div class="credits-blocco reveal">
                        <span class="sezione-etichetta">${g.nome}</span>
                        ${g.voci.map(v => `<p class="credits-descr">${pulito(v.description)}</p>`).join('')}
                    </div>`;
            }
            return `
                <div class="credits-blocco reveal">
                    <span class="credits-ruolo"><span class="funzione-ms" aria-hidden="true">${iconaRuolo(g.nome)}</span>${g.nome}</span>
                    ${g.voci.map(v => {
                        const url = pulito(v.url);
                        return `
                            <div class="credits-persona">
                                ${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="credits-nome">${pulito(v.title)}</a>` : `<span class="credits-nome">${pulito(v.title)}</span>`}
                                ${v.description ? `<p class="credits-descr">${pulito(v.description)}</p>` : ''}
                                ${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="credits-link">${link(url)}</a>` : ''}
                            </div>`;
                    }).join('')}
                </div>`;
        }).join('<div class="separatore" aria-hidden="true"><span></span></div>');
        initScrollReveal();
    };

    if (cached) {
        try { renderData(JSON.parse(cached)); } catch(e) {}
    }

    const { data, error } = await _supabase
        .from('credits')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });

    if (error) {
        if (!cached) container.innerHTML = '<p class="credits-stato">Non riesco a caricare i riconoscimenti: riprova tra qualche minuto.</p>';
        return;
    }

    const freshString = JSON.stringify(data);
    if (freshString !== cached) {
        localStorage.setItem(cacheKey, freshString);
        renderData(data);
    }
}

async function loadDynamicUpdates(_supabase) {
    const latestContainer = document.getElementById('latest-update-container');
    const timelineContainer = document.getElementById('timeline-container');

    let { data, error } = await _supabase
        .from('updates')
        .select('*')
        .eq('is_visible', true);

    if (error) {
        console.error('Error fetching updates:', error);
        if (latestContainer) latestContainer.innerHTML = '<p style="text-align:center; color:red;">Errore nel caricamento dei dati.</p>';
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
        if (latestContainer) latestContainer.innerHTML = '<p style="text-align:center;">Nessun aggiornamento disponibile.</p>';
        if (timelineContainer) timelineContainer.innerHTML = '';
        return;
    }

    const latest = data.find(u => u.is_latest) || data[0];
    const others = data.filter(u => u.id !== latest.id);

    // Update Home Hero Button if exists
    // Aggiorna tutti i link APK della pagina (pulsante hero o link alternativo, in base al dispositivo)
    document.querySelectorAll('[data-apk-link]').forEach(link => {
        link.href = latest.download_url;
    });

    // Salva l'URL globale dell'APK per la modale di installazione
    window.__latestApkUrl = latest.download_url;
    const modalActionBtn = document.getElementById('pwa-modal-action-btn');
    const tabAndroid = document.getElementById('pwa-tab-android');
    if (modalActionBtn && tabAndroid && tabAndroid.classList.contains('active')) {
        modalActionBtn.href = latest.download_url;
    }

    // Pagina Download: versione accanto a "gratis, senza registrazione…" e peso dell'APK
    const lead = document.getElementById('scarica-lead');
    if (lead && latest.version) lead.textContent = `Versione ${latest.version.trim()} · gratis, senza registrazione e senza pubblicità`;
    if (document.getElementById('scarica-peso')) caricaPesoApk();

    // Ultima versione: modifiche divise per tipo
    if (latestContainer) {
        const modifiche = (Array.isArray(latest.changes) ? latest.changes : []).map(parsePatchChange);
        const titolo = document.getElementById('novita-titolo');
        if (titolo) titolo.textContent = `Cosa c'è di nuovo nella ${latest.version.trim()}`;
        const meta = document.getElementById('novita-meta');
        if (meta) {
            document.getElementById('novita-data').textContent = dataLeggibile(latest.date);
            document.getElementById('novita-conta').innerHTML = `<b>${modifiche.length}</b>&nbsp;${modifiche.length === 1 ? 'modifica' : 'modifiche'}`;
            meta.hidden = false;
        }
        latestContainer.innerHTML = modifiche.length
            ? TIPI_MODIFICA.map(tipo => bloccoModifiche(tipo, modifiche.filter(m => m.type === tipo.tipo))).join('')
            : '<p class="scarica-stato">Nessuna modifica descritta per questa versione.</p>';
        latestContainer.querySelectorAll('.novita-altre').forEach(btn => btn.addEventListener('click', () => {
            btn.closest('.novita-blocco').querySelectorAll('.novita-voci li[hidden]').forEach(li => { li.hidden = false; });
            btn.remove();
        }));
    }

    // Versioni precedenti: una riga per versione che si apre con un tocco
    if (timelineContainer) {
        timelineContainer.innerHTML = others.length ? others.map(update => {
            const modifiche = (Array.isArray(update.changes) ? update.changes : []).map(parsePatchChange);
            const versione = update.version.trim();
            return `
                <details>
                    <summary>
                        <span class="storico-numero">${versione}</span>
                        <span class="storico-data">${dataLeggibile(update.date)}</span>
                        <span class="storico-conta">${modifiche.length} ${modifiche.length === 1 ? 'modifica' : 'modifiche'}</span>
                        <span class="funzione-ms" aria-hidden="true">expand_more</span>
                    </summary>
                    <div class="storico-dentro">
                        <ul>${modifiche.map(m => `<li>${m.title && m.desc ? `<b>${m.title}.</b> ${m.desc}` : `<b>${m.title || m.desc}</b>`}</li>`).join('')}</ul>
                        ${update.download_url ? `<a href="${update.download_url}"><span class="funzione-ms" aria-hidden="true">download</span>Scarica l'APK della ${versione}</a>` : ''}
                    </div>
                </details>`;
        }).join('') : '<p class="scarica-stato">Nessuna versione precedente.</p>';
    }
}

// Tipi di modifica nell'ordine in cui compaiono. Nei miglioramenti e nelle correzioni si vedono le prime
// tre voci, le altre dietro "Mostra altre"
const TIPI_MODIFICA = [
    { tipo: 'feature', nome: 'Novità', icona: 'auto_awesome', visibili: Infinity },
    { tipo: 'improvement', nome: 'Miglioramenti', icona: 'trending_up', visibili: 3 },
    { tipo: 'fix', nome: 'Correzioni', icona: 'build', visibili: 3 },
];

function bloccoModifiche({ tipo, nome, icona, visibili }, voci) {
    if (voci.length === 0) return '';
    const nascoste = Math.max(0, voci.length - visibili);
    return `
        <div class="novita-blocco tipo-${tipo}">
            <div class="novita-tipo">
                <span class="funzione-ms" aria-hidden="true">${icona}</span>
                <div><b>${nome}</b><small>${voci.length} ${voci.length === 1 ? 'modifica' : 'modifiche'}</small></div>
            </div>
            <div>
                <ul class="novita-voci">
                    ${voci.map((v, n) => `<li${n >= visibili ? ' hidden' : ''}>${v.title ? `<h3>${v.title}</h3>` : ''}${v.desc ? `<p>${v.desc}</p>` : ''}</li>`).join('')}
                </ul>
                ${nascoste ? `<button type="button" class="novita-altre">Mostra altre ${nascoste}<span class="funzione-ms" aria-hidden="true">expand_more</span></button>` : ''}
            </div>
        </div>`;
}

// Date scritte nel pannello come "09 Marzo 2026": giorno senza zero davanti e mese con la minuscola
function dataLeggibile(data) {
    return String(data || '').trim()
        .replace(/^0(\d)/, '$1')
        .replace(/\b(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\b/g, m => m.toLowerCase());
}

// Peso dell'APK dell'ultima release su GitHub (pagina Download); l'ultimo valore resta in memoria
async function caricaPesoApk() {
    const el = document.getElementById('scarica-peso');
    const mostra = (mb) => { if (mb > 0) el.textContent = ` · ${mb} MB`; };
    mostra(parseInt(localStorage.getItem('qc_cache_apk_mb') || '', 10));
    try {
        const res = await fetch('https://api.github.com/repos/xTomeku/Quick_Check_Unisalento/releases/latest');
        if (!res.ok) return;
        const release = await res.json();
        const apk = (release.assets || []).find(a => /\.apk$/i.test(a.name));
        if (!apk || !apk.size) return;
        const mb = Math.round(apk.size / 1048576);
        localStorage.setItem('qc_cache_apk_mb', String(mb));
        mostra(mb);
    } catch (e) {
        console.warn('Peso APK non disponibile:', e);
    }
}

/**
 * Analizza e categorizza una singola voce di patchnote.
 * Supporta categorie esplicite scelte dall'utente ([novita], [miglioramento], [fix], [feature], [improvement])
 * con fallback sul riconoscimento semantico automatico delle parole chiave.
 */
function parsePatchChange(text) {
    if (!text || typeof text !== 'string') {
        return { title: '', desc: '', type: 'feature' };
    }

    let cleanText = text.trim();
    let explicitType = null;

    // Riconoscimento tag esplicito scelto dall'utente: es. [novita], [novità], [feature], [miglioramento], [improvement], [fix]
    const tagMatch = cleanText.match(/^\[(novit[aà]|feature|miglioramento|improvement|fix)\]\s*/i);
    if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        if (tag === 'fix') {
            explicitType = 'fix';
        } else if (tag === 'miglioramento' || tag === 'improvement') {
            explicitType = 'improvement';
        } else {
            explicitType = 'feature';
        }
        // Rimuove il tag esplicito dalla stringa in modo che non appaia nel titolo
        cleanText = cleanText.substring(tagMatch[0].length).trim();
    }

    let title = '';
    let desc = '';

    // Estrazione Titolo e Descrizione se presente il delimitatore ':'
    if (cleanText.includes(':')) {
        const firstColon = cleanText.indexOf(':');
        title = cleanText.substring(0, firstColon).trim();
        desc = cleanText.substring(firstColon + 1).trim();
    } else {
        title = cleanText.trim();
        desc = '';
    }

    // Se l'utente ha scelto esplicitamente il tipo usiamo quello; altrimenti fallback su parole chiave
    let type = explicitType;
    if (!type) {
        const lower = cleanText.toLowerCase();

        // Riconoscimento categoria con priorità: Fix > Miglioramento > Novità
        const fixKeywords = ['fix', 'risolt', 'corrett', 'bug', 'crash', 'error', 'problem', 'fallit'];
        const improvementKeywords = [
            'ottimizz', 'migliorament', 'migliorat', 'prestazion', 'velocit',
            'performance', 'caching', 'cache', 'alleggerit', 'ridott',
            'stabilit', 'versioning', 'affidabilit', 'refactor', 'rifattorizz'
        ];

        if (fixKeywords.some(kw => lower.includes(kw))) {
            type = 'fix';
        } else if (improvementKeywords.some(kw => lower.includes(kw))) {
            type = 'improvement';
        } else {
            type = 'feature';
        }
    }

    // Pulizia del titolo per evitare ripetizioni grammaticali col badge (es: "Fix Dettagli..." -> "Dettagli...")
    let cleanTitle = title;
    if (/^(fix|bugfix)\s+/i.test(cleanTitle)) {
        cleanTitle = cleanTitle.replace(/^(fix|bugfix)\s+/i, '');
    } else if (/^(miglioramento|ottimizzazione)\s*[:-]\s*/i.test(cleanTitle)) {
        cleanTitle = cleanTitle.replace(/^(miglioramento|ottimizzazione)\s*[:-]\s*/i, '');
    }

    return { title: testoModifica(cleanTitle), desc: testoModifica(desc).replace(/[.\s]+$/, ''), type };
}

// Pulizia dei testi delle modifiche scritti nel pannello: spazi doppi, "IOS", maiuscola iniziale
function testoModifica(testo) {
    const t = String(testo || '').replace(/\s{2,}/g, ' ').replace(/\bIOS\b/g, 'iOS').trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
}

// Icone Material caricate da index.html (parametro icon_names del font): le stesse della griglia delle
// funzionalità nel pannello (ICONE_FUNZIONI_PANNELLO in admin-js/sito.js). Un nome fuori elenco non avrebbe il disegno.
const ICONE_FUNZIONI = new Set([
    'accessible', 'account_balance', 'alarm', 'apartment', 'assignment', 'auto_awesome', 'badge', 'bolt', 'bookmark',
    'build', 'calculate', 'calendar_month', 'calendar_view_day', 'campaign', 'celebration', 'cloud_off', 'computer',
    'contacts', 'dark_mode', 'dashboard_customize', 'directions_bike', 'directions_bus', 'directions_walk',
    'edit_note', 'emoji_events', 'event', 'event_available', 'event_busy', 'explore', 'favorite', 'fitness_center',
    'forum', 'groups', 'help', 'history', 'history_edu', 'info', 'insights', 'ios_share', 'language',
    'local_cafe', 'local_hospital', 'local_library', 'local_parking', 'lock', 'mail', 'map', 'meeting_room',
    'menu_book', 'new_releases', 'newspaper', 'notifications', 'notifications_active', 'palette', 'person',
    'phone_android', 'phonelink_setup', 'place', 'print', 'qr_code', 'quiz', 'restaurant', 'school', 'science',
    'search', 'settings', 'speed', 'star', 'sticky_note_2', 'sync', 'timer', 'today', 'touch_app', 'train',
    'translate', 'tune', 'update', 'verified', 'widgets', 'wifi']);

// Emoji già salvate nella tabella features -> icona Material equivalente
const EMOJI_FUNZIONI = {
    '📅': 'calendar_month', '🗓️': 'calendar_month', '⭐': 'star', '🏫': 'meeting_room', '📇': 'contacts',
    '📖': 'local_library', '📚': 'local_library', '🗺️': 'map', '🗺': 'map', '🍽️': 'restaurant', '🍴': 'restaurant',
    '🚌': 'directions_bus', '🔔': 'notifications_active', '📱': 'widgets', '🔍': 'search', '⚙️': 'settings',
};

// Il campo "icon" può contenere il nome di un'icona Material (es. "restaurant") o un'emoji:
// le emoji conosciute diventano l'icona Material, le altre restano come sono.
function iconaFunzione(valore) {
    const v = String(valore || '').trim();
    const nome = ICONE_FUNZIONI.has(v) ? v : EMOJI_FUNZIONI[v];
    return nome
        ? `<span class="funzione-ms" aria-hidden="true">${nome}</span>`
        : `<span class="funzione-emoji" aria-hidden="true">${v}</span>`;
}

// Icone delle etichette sul riquadro delle funzionalità in evidenza: quelle delle funzionalità più
// alcune solo per le etichette. Anche queste devono essere nel parametro icon_names di index.html.
const ICONE_ETICHETTE = new Set([...ICONE_FUNZIONI, 'schedule', 'wifi_off', 'lunch_dining', 'no_food', 'departure_board',
    'check_circle', 'download']);

// Prima della colonna in_evidenza (vedi _redesign/sql/funzioni_in_evidenza.sql) le righe in evidenza erano
// solo scritte in index.html: con i dati vecchi restano quelle e da "E inoltre" si tolgono queste icone
const FUNZIONI_IN_EVIDENZA = new Set(['calendar_month', 'restaurant', 'map', 'directions_bus']);

// Riga grande con l'illustrazione: icona della funzionalità al centro e fino a due etichette agli angoli,
// alternate a destra e a sinistra come nel contenuto di partenza di index.html
function rigaInEvidenza(item, index) {
    const inversa = index % 2 === 1;
    const posizioni = inversa ? ['alto destra', 'basso sinistra'] : ['alto sinistra', 'basso destra'];
    const v = String(item.icon || '').trim();
    const nome = ICONE_FUNZIONI.has(v) ? v : EMOJI_FUNZIONI[v];
    const iconaGrande = nome
        ? `<span class="funzione-ms visivo-icona">${nome}</span>`
        : `<span class="funzione-emoji visivo-icona">${v}</span>`;
    const etichette = (Array.isArray(item.etichette) ? item.etichette : [])
        .filter(e => e && String(e.testo || '').trim())
        .slice(0, 2)
        .map((e, i) => {
            const icona = ICONE_ETICHETTE.has(e.icona) ? `<span class="funzione-ms">${e.icona}</span>` : '';
            return `<span class="visivo-chip ${posizioni[i]}">${icona}${e.testo}</span>`;
        }).join('');
    const punti = (Array.isArray(item.punti) ? item.punti : []).filter(p => String(p || '').trim());

    const riga = document.createElement('div');
    riga.className = inversa ? 'evidenza inversa' : 'evidenza';
    riga.innerHTML = `
        <div class="visivo reveal" aria-hidden="true">${iconaGrande}${etichette}</div>
        <div class="reveal delay-1">
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            ${punti.length ? `<ul>${punti.map(p => `<li><span class="funzione-ms" aria-hidden="true">check_circle</span>${p}</li>`).join('')}</ul>` : ''}
        </div>
    `;
    return riga;
}

async function loadFeatures(_supabase) {
    const container = document.getElementById('features-grid');
    if (!container) return;
    const evidenza = document.getElementById('funzioni-evidenza');

    const cacheKey = 'qc_cache_features';
    const cached = localStorage.getItem(cacheKey);

    const renderData = (data) => {
        const righe = data || [];
        // La colonna c'è se almeno una riga la riporta (select('*') restituisce tutte le colonne)
        const conColonna = righe.some(item => 'in_evidenza' in item);
        let altre;
        if (conColonna) {
            const inEvidenza = righe.filter(item => item.in_evidenza);
            altre = righe.filter(item => !item.in_evidenza);
            if (evidenza) {
                evidenza.innerHTML = '';
                inEvidenza.forEach((item, index) => evidenza.appendChild(rigaInEvidenza(item, index)));
                evidenza.hidden = inEvidenza.length === 0;
            }
        } else {
            altre = righe.filter(item => {
                const v = String(item.icon || '').trim();
                return !FUNZIONI_IN_EVIDENZA.has(ICONE_FUNZIONI.has(v) ? v : EMOJI_FUNZIONI[v]);
            });
        }

        const etichetta = container.previousElementSibling;
        if (etichetta && etichetta.classList.contains('home-inoltre')) etichetta.hidden = altre.length === 0;
        container.innerHTML = '';
        altre.forEach((item, index) => {
            const voce = document.createElement('div');
            voce.className = `altra reveal delay-${(index % 3) + 1}`;
            voce.innerHTML = `
                ${iconaFunzione(item.icon)}
                <div>
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                </div>
            `;
            container.appendChild(voce);
        });
        initScrollReveal();
    };

    if (cached) {
        try { renderData(JSON.parse(cached)); } catch(e) {}
    }

    const { data, error } = await _supabase
        .from('features')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Errore caricamento features:', error);
        if (!cached) container.innerHTML = '<p class="altre-stato">Non riesco a caricare l&rsquo;elenco delle funzionalità. Ricarica la pagina o riprova tra qualche minuto.</p>';
        return;
    }

    const freshString = JSON.stringify(data);
    if (freshString !== cached) {
        localStorage.setItem(cacheKey, freshString);
        renderData(data);
    }
}

// ===== Stats Bar =====
async function loadStats(_supabase) {
    const downloadsEl = document.getElementById('stat-downloads');
    const updatedEl = document.getElementById('stat-updated');

    // Separatore delle migliaia sempre presente (it-IT non lo mette sotto 10.000: "4554" diventa "4.554")
    const formatCount = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Count-up animation helper
    function animateCounter(el, target) {
        if (target <= 0) { el.textContent = '0'; return; }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.textContent = formatCount(target);
            return;
        }
        const duration = 1500;
        const start = performance.now();
        const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            el.textContent = formatCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    // 1. Downloads from GitHub API (l'API pubblica ha un limite di richieste orarie:
    //    se fallisce si mostra l'ultimo valore salvato, altrimenti si nasconde la statistica)
    const cachedDownloads = parseInt(localStorage.getItem('qc_cache_downloads') || '', 10);
    if (cachedDownloads > 0) downloadsEl.textContent = formatCount(cachedDownloads);
    const hideDownloads = () => {
        if (cachedDownloads > 0) return;
        const item = downloadsEl.closest('.stat-item');
        if (item) item.hidden = true;
        const divider = item && item.nextElementSibling;
        if (divider && divider.classList.contains('stat-divider')) divider.hidden = true;
    };
    try {
        const res = await fetch('https://api.github.com/repos/xTomeku/Quick_Check_Unisalento/releases');
        if (!res.ok) hideDownloads();
        if (res.ok) {
            const releases = await res.json();
            let totalDownloads = 0;
            releases.forEach(release => {
                (release.assets || []).forEach(asset => {
                    totalDownloads += asset.download_count || 0;
                });
            });
            // Peso dell'APK dell'ultima versione accanto ai requisiti, sotto i pulsanti
            const apk = releases[0] && (releases[0].assets || []).find(a => /\.apk$/i.test(a.name));
            const pesoEl = document.getElementById('hero-apk-peso');
            if (apk && apk.size && pesoEl) pesoEl.textContent = ` · ${Math.round(apk.size / 1048576)} MB`;
            downloadsEl.dataset.target = totalDownloads;
            localStorage.setItem('qc_cache_downloads', String(totalDownloads));
            if (totalDownloads !== cachedDownloads) animateCounter(downloadsEl, totalDownloads);
        }
    } catch (e) {
        console.warn('Impossibile caricare stats download da GitHub:', e);
        hideDownloads();
    }

    // 2. Ultima versione e data
    const versionEl = document.getElementById('stat-version');
    const mostraVersione = (u) => {
        if (!u) return;
        updatedEl.textContent = dataLeggibile(u.date) || '—';
        if (versionEl && u.version) versionEl.textContent = String(u.version).replace(/^v/i, '');
    };
    mostraVersione(versioneInCache());
    mostraVersione(await ultimaVersione(_supabase));
}

// Ultima versione (tabella updates): quella segnata "Ultima" nel pannello, altrimenti la più recente
// pubblicata. Una sola richiesta per pagina, condivisa da capsula della home e footer
let richiestaUltimaVersione = null;

function versioneInCache() {
    try {
        const updates = JSON.parse(localStorage.getItem('qc_cache_updates'));
        return Array.isArray(updates) && updates.length > 0 ? updates[0] : null;
    } catch(e) {
        return null;
    }
}

function ultimaVersione(_supabase) {
    if (!richiestaUltimaVersione) {
        richiestaUltimaVersione = _supabase
            .from('updates')
            .select('version, date')
            .eq('is_visible', true)
            .order('is_latest', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .then(({ data }) => {
                if (!data || data.length === 0) return null;
                localStorage.setItem('qc_cache_updates', JSON.stringify(data));
                return data[0];
            }, () => null);
    }
    return richiestaUltimaVersione;
}

// Versione e data nel footer di tutte le pagine; senza dati la capsula resta nascosta
async function loadFooterVersion(_supabase) {
    const capsula = document.getElementById('footer-versione');
    if (!capsula) return;
    const mostra = (u) => {
        if (!u || !u.version) return;
        document.getElementById('footer-versione-numero').textContent = String(u.version).replace(/^v/i, '');
        document.getElementById('footer-versione-data').textContent = u.date ? ` · ${dataLeggibile(u.date)}` : '';
        capsula.hidden = false;
    };
    mostra(versioneInCache());
    mostra(await ultimaVersione(_supabase));
}

// ===== FAQ (Dynamic from Supabase) =====
async function loadFAQ(_supabase) {
    const container = document.getElementById('faq-container');
    if (!container) return;

    const cacheKey = 'qc_cache_faq';
    const cached = localStorage.getItem(cacheKey);

    const renderData = (data) => {
        if (!data || data.length === 0) {
            container.innerHTML = '';
            const section = container.closest('.faq-section');
            if (section) section.style.display = 'none';
            return;
        }

        container.innerHTML = '';
        data.forEach((item, index) => {
            const faqItem = document.createElement('div');
            faqItem.className = `faq-item reveal delay-${(index % 6) + 1}`;
            faqItem.innerHTML = `
                <h3 class="faq-heading">
                    <button type="button" class="faq-question" id="faq-q-${index}" aria-expanded="false" aria-controls="faq-a-${index}">
                        <span class="faq-question-text">${item.question}</span>
                        <span class="faq-toggle" aria-hidden="true">+</span>
                    </button>
                </h3>
                <div class="faq-answer" id="faq-a-${index}" role="region" aria-labelledby="faq-q-${index}">
                    <div class="faq-answer-inner">${item.answer}</div>
                </div>
            `;
            // Accordion: un solo elemento aperto alla volta; l'altezza segue la risposta reale
            const setOpen = (el, open) => {
                const answer = el.querySelector('.faq-answer');
                el.classList.toggle('open', open);
                el.querySelector('.faq-question').setAttribute('aria-expanded', String(open));
                answer.style.maxHeight = open ? answer.scrollHeight + 'px' : '';
            };
            faqItem.querySelector('.faq-question').addEventListener('click', () => {
                const willOpen = !faqItem.classList.contains('open');
                container.querySelectorAll('.faq-item.open').forEach(openItem => {
                    if (openItem !== faqItem) setOpen(openItem, false);
                });
                setOpen(faqItem, willOpen);
            });
            container.appendChild(faqItem);
        });
        initScrollReveal();
    };

    if (cached) {
        try { renderData(JSON.parse(cached)); } catch(e) {}
    } else {
        container.innerHTML = `
            <div class="skeleton-wrapper" style="flex-direction: column; gap: 1rem;">
                ${Array(3).fill('<div class="skeleton" style="height: 56px; border-radius: 12px; width: 100%;"></div>').join('')}
            </div>
        `;
    }

    const { data, error } = await _supabase
        .from('faq')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Errore caricamento FAQ:', error);
        if (!cached) {
            container.innerHTML = '';
            const section = container.closest('.faq-section');
            if (section) section.style.display = 'none';
        }
        return;
    }

    const freshString = JSON.stringify(data);
    if (freshString !== cached) {
        localStorage.setItem(cacheKey, freshString);
        renderData(data);
    }
}

// ===== BUGS TRACKER (Dynamic from Supabase) =====
async function loadBugs(_supabase) {
    const container = document.getElementById('bugs-container');
    if (!container) return;
    const stato = document.getElementById('problemi-stato');

    const cacheKey = 'qc_cache_bugs';
    const cached = localStorage.getItem(cacheKey);

    const GRAVITA = { critical: 'critica', high: 'alta', medium: 'media', low: 'bassa' };
    const GRUPPI = [
        { stato: 'open', nome: 'Aperti', descr: 'Problemi confermati che non sono ancora stati sistemati.' },
        { stato: 'in_progress', nome: 'In risoluzione', descr: 'Ci sto lavorando: la correzione arriva con il prossimo aggiornamento.' },
        { stato: 'resolved', nome: 'Risolti', descr: '' },
    ];
    const data = (d) => d ? new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    // Testi del pannello: spazi invisibili tolti e "ios" scritto giusto (es. categoria "Web App ios")
    const pulito = (s) => String(s || '').replace(/\u200B/g, '').replace(/\bios\b/gi, 'iOS').trim();

    const voce = (b) => {
        const risolto = b.status === 'resolved';
        const gravita = GRAVITA[b.severity] || 'media';
        const quando = risolto
            ? (b.resolved_at ? `<span><span class="funzione-ms problemi-ok" aria-hidden="true">check_circle</span>Risolto il ${data(b.resolved_at)}</span>` : '')
            : `<span><span class="funzione-ms" aria-hidden="true">schedule</span>Segnalato il ${data(b.created_at)}</span>`;
        const consiglio = pulito(b.workaround);
        return `
            <details${risolto ? '' : ' open'}>
                <summary>
                    <h3>${pulito(b.title)}</h3>
                    <div class="problemi-meta">
                        ${quando}
                        ${b.category ? `<span>${pulito(b.category)}</span>` : ''}
                        ${risolto ? '' : `<span class="problemi-gravita gravita-${gravita}">Gravità ${gravita}</span>`}
                    </div>
                    <span class="funzione-ms problemi-freccia" aria-hidden="true">expand_more</span>
                </summary>
                <div class="problemi-dentro">
                    ${b.description ? `<p>${pulito(b.description)}</p>` : ''}
                    ${consiglio && !risolto ? `
                        <div class="problemi-consiglio">
                            <span class="funzione-ms" aria-hidden="true">lightbulb</span>
                            <div><b>Nel frattempo</b><span>${consiglio}</span></div>
                        </div>` : ''}
                    <div class="problemi-versioni">
                        ${b.affected_version ? `<span>Versione interessata <b>${pulito(b.affected_version)}</b></span>` : ''}
                        ${risolto && b.fixed_version ? `<span class="problemi-risolto"><span class="funzione-ms" aria-hidden="true">check</span>Risolto nella ${pulito(b.fixed_version)}</span>` : ''}
                    </div>
                </div>
            </details>`;
    };

    const render = (bugs) => {
        const conta = (s) => bugs.filter(b => b.status === s).length;
        const aperti = conta('open'), inCorso = conta('in_progress'), risolti = conta('resolved');
        const daSistemare = aperti + inCorso;
        const ultima = bugs.map(b => b.resolved_at).filter(Boolean).sort().pop();

        if (stato) {
            stato.classList.toggle('attenzione', daSistemare > 0);
            stato.innerHTML = (daSistemare
                ? `<span class="funzione-ms" aria-hidden="true">construction</span>
                   <div><b>${daSistemare === 1 ? 'Un problema' : `${daSistemare} problemi`} da sistemare</b>
                   <span>Qui sotto trovi cosa succede e, quando c'è, come aggirarlo.</span></div>`
                : `<span class="funzione-ms" aria-hidden="true">verified</span>
                   <div><b>Nessun problema aperto</b>
                   <span>${ultima ? `L'ultima correzione è del ${data(ultima)}.` : 'Tutto funziona come dovrebbe.'}</span></div>`)
                + `<div class="problemi-numeri">
                       <div><strong>${aperti}</strong><small>aperti</small></div>
                       <div><strong>${inCorso}</strong><small>in corso</small></div>
                       <div><strong>${risolti}</strong><small>risolti</small></div>
                   </div>`;
        }

        container.innerHTML = GRUPPI.map(g => {
            const voci = bugs.filter(b => b.status === g.stato);
            if (voci.length === 0) return '';
            return `
                <div class="problemi-gruppo gruppo-${g.stato} reveal">
                    <h2><span class="problemi-pallino" aria-hidden="true"></span>${g.nome}<small>${voci.length}</small></h2>
                    ${g.descr ? `<p class="problemi-descr">${g.descr}</p>` : ''}
                    <div class="problemi-elenco">${voci.map(voce).join('')}</div>
                </div>`;
        }).join('');
        initScrollReveal();
    };

    if (cached) {
        try { render(JSON.parse(cached)); } catch(e) {}
    }

    const { data: bugs, error } = await _supabase
        .from('bugs')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Problemi noti non disponibili:', error.message);
        if (!cached && stato) {
            stato.innerHTML = `<span class="funzione-ms" aria-hidden="true">sync</span>
                <div><b>Elenco non disponibile</b><span>Non riesco a caricarlo adesso: riprova tra qualche minuto.</span></div>`;
        }
        return;
    }

    const fresco = JSON.stringify(bugs || []);
    if (fresco !== cached) {
        localStorage.setItem(cacheKey, fresco);
        render(bugs || []);
    }
}

// ============================================================
// GESTIONE PROMPT & GUIDA DINAMICA INSTALLAZIONE PWA
// ============================================================
/**
 * Rilevamento della piattaforma del visitatore e gestione interattiva dell'installazione PWA.
 * - Su iOS (iPhone/iPad): adatta il pulsante Hero in "Installa su iPhone" e apre la guida passo-passo per Safari.
 * - Su Android / PC: mantiene il download APK nativo e permette di consultare la guida PWA o aprire l'app.
 */
// 'iphone' (anche iPad e iPadOS, che si presenta come MacIntel con il touch), 'android' o 'computer'
function rilevaDispositivo() {
    const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
    if (/iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iphone';
    if (/android/.test(ua)) return 'android';
    return 'computer';
}

// Pagina Download: selettore Android / iPhone e iPad / Computer con un riquadro per ciascuno.
// Parte dal dispositivo in uso, oppure da #android, #iphone o #computer nell'indirizzo
function initSchedeDownload() {
    const schede = [...document.querySelectorAll('[data-scheda]')];
    if (schede.length === 0) return;

    const mostra = (scelta, conFocus) => {
        schede.forEach(scheda => {
            const attiva = scheda.dataset.scheda === scelta;
            scheda.setAttribute('aria-selected', attiva ? 'true' : 'false');
            scheda.tabIndex = attiva ? 0 : -1;
            document.getElementById(scheda.getAttribute('aria-controls')).hidden = !attiva;
            if (attiva && conFocus) scheda.focus();
        });
    };

    schede.forEach((scheda, i) => {
        scheda.addEventListener('click', () => mostra(scheda.dataset.scheda));
        // Frecce sinistra/destra tra le schede, come nei selettori a schede
        scheda.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const vicina = schede[(i + (e.key === 'ArrowRight' ? 1 : schede.length - 1)) % schede.length];
            mostra(vicina.dataset.scheda, true);
        });
    });

    const dallIndirizzo = location.hash.slice(1);
    mostra(schede.some(s => s.dataset.scheda === dallIndirizzo) ? dallIndirizzo : rilevaDispositivo());
}

function initPwaInstallationFlow() {
    const dispositivo = rilevaDispositivo();
    const isIos = dispositivo === 'iphone';
    const isAndroid = dispositivo === 'android';

    // DOM Elements Modale PWA / Installazione
    const modal = document.getElementById('pwa-install-modal');
    const closeBtn = document.getElementById('close-pwa-modal');
    const dismissBtn = document.getElementById('dismiss-pwa-modal');
    const tabIos = document.getElementById('pwa-tab-ios');
    const tabAndroid = document.getElementById('pwa-tab-android');
    const stepsIos = document.getElementById('pwa-steps-ios');
    const stepsAndroid = document.getElementById('pwa-steps-android');
    const actionBtn = document.getElementById('pwa-modal-action-btn');
    const actionIcon = document.getElementById('pwa-action-icon');
    const actionText = document.getElementById('pwa-action-text');

    // DOM Elements Hero & Buttons
    const heroDownloadBtn = document.getElementById('hero-download-btn');
    const heroDownloadText = document.getElementById('hero-download-text');
    const heroDownloadSubtitle = document.getElementById('hero-download-subtitle');
    const heroDownloadIcon = document.getElementById('hero-download-icon');
    const pwaGuideLinkText = document.getElementById('pwa-guide-link-text');
    const openPwaGuideBtns = document.querySelectorAll('#open-pwa-guide-btn, .open-pwa-guide-trigger');

    let lastFocused = null;

    function openModal(defaultTab = 'ios') {
        if (!modal) return;
        lastFocused = document.activeElement;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        // Porta il focus dentro la guida, così tastiera e screen reader ci entrano subito
        // (breve attesa: i figli della modale hanno una transizione che li tiene invisibili per un istante)
        setTimeout(() => closeBtn?.focus(), 60);

        if (defaultTab === 'android') {
            activateTab('android');
        } else {
            activateTab('ios');
        }
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        // Restituisce il focus al pulsante che aveva aperto la guida
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
        lastFocused = null;
    }

    // Switch dinamico dei passaggi e del pulsante di azione primario della modale
    function activateTab(platform) {
        if (platform === 'ios') {
            tabIos?.classList.add('active');
            tabAndroid?.classList.remove('active');
            stepsIos?.classList.remove('hidden');
            stepsAndroid?.classList.add('hidden');

            // Configura il pulsante per la Web App su Safari
            if (actionBtn) {
                actionBtn.href = 'https://quick-check-unisalento.vercel.app/';
                actionBtn.target = '_blank';
                actionBtn.rel = 'noopener noreferrer';
            }
            if (actionIcon) actionIcon.textContent = '🚀';
            if (actionText) actionText.textContent = 'Apri la Web App';
        } else {
            tabAndroid?.classList.add('active');
            tabIos?.classList.remove('active');
            stepsAndroid?.classList.remove('hidden');
            stepsIos?.classList.add('hidden');

            // Configura il pulsante per il download del file APK
            if (actionBtn) {
                const apkLink = document.querySelector('[data-apk-link]');
                const apkUrl = window.__latestApkUrl || (apkLink && apkLink.href.endsWith('.apk') ? apkLink.href : 'download.html');
                actionBtn.href = apkUrl;
                if (apkUrl.endsWith('.apk')) {
                    actionBtn.removeAttribute('target');
                } else {
                    actionBtn.target = '_self';
                }
            }
            if (actionIcon) actionIcon.textContent = '📥';
            if (actionText) actionText.textContent = 'Scarica il file APK';
        }
    }

    // Listener chiusura modale
    closeBtn?.addEventListener('click', closeModal);
    dismissBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (!modal || modal.classList.contains('hidden')) return;
        if (e.key === 'Escape') {
            closeModal();
            return;
        }
        // Tab resta dentro la guida finché è aperta
        if (e.key === 'Tab') {
            const focusables = [...modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
                .filter(el => el.offsetParent !== null);
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // Tab switching nella modale
    tabIos?.addEventListener('click', () => activateTab('ios'));
    tabAndroid?.addEventListener('click', () => activateTab('android'));

    // Trigger apertura modale da pulsanti dedicati (landing e download page). Sulle pagine senza guida
    // il link "Come si installa" del footer porta a download.html#guida, che la apre al caricamento
    if (modal) {
        openPwaGuideBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(isIos ? 'ios' : 'android');
            });
        });
        if (location.hash === '#guida') openModal(isIos ? 'ios' : 'android');
    }

    // Adattamento dell'apertura in base al dispositivo: pulsante principale (oro) e secondario.
    // Android: APK + Web App · iPhone/iPad: guida "Aggiungi a Home" + Web App · PC: Web App + APK.
    // Le icone sono nomi Material (font caricato da index.html).
    const heroAltLink = document.getElementById('hero-alt-link');
    const heroAltText = document.getElementById('hero-alt-text');
    const heroAltIcon = document.getElementById('hero-alt-icon');
    const heroAltSep = document.getElementById('hero-alt-sep');
    const guideBtn = document.getElementById('open-pwa-guide-btn');
    const WEBAPP_URL = 'https://quick-check-unisalento.vercel.app/';

    if (isIos && heroDownloadBtn) {
        // iPhone/iPad: il pulsante principale apre direttamente la guida "Aggiungi a Home"
        heroDownloadBtn.removeAttribute('data-apk-link');
        if (heroDownloadText) heroDownloadText.textContent = 'Aggiungi a Home';
        if (heroDownloadSubtitle) heroDownloadSubtitle.textContent = 'iPhone e iPad · in due tocchi da Safari';
        if (heroDownloadIcon) heroDownloadIcon.textContent = 'add_to_home_screen';
        heroDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('ios');
        });
        // La guida coincide col pulsante principale: resta solo il pulsante della Web App
        if (heroAltText) heroAltText.textContent = 'Apri la Web App';
        guideBtn?.setAttribute('hidden', '');
        heroAltSep?.setAttribute('hidden', '');
    } else if (isAndroid) {
        if (pwaGuideLinkText) pwaGuideLinkText.textContent = 'Prima volta con un APK?';
    } else if (heroDownloadBtn) {
        // PC: la Web App diventa l'azione principale, l'APK passa nel pulsante secondario
        heroDownloadBtn.removeAttribute('data-apk-link');
        heroDownloadBtn.href = WEBAPP_URL;
        if (heroDownloadText) heroDownloadText.textContent = 'Apri la Web App';
        if (heroDownloadSubtitle) heroDownloadSubtitle.textContent = 'Dal browser, senza installare nulla';
        if (heroDownloadIcon) heroDownloadIcon.textContent = 'language';
        if (heroAltLink) {
            if (heroAltText) heroAltText.textContent = "Scarica l'APK per Android";
            if (heroAltIcon) heroAltIcon.textContent = 'download';
            heroAltLink.href = window.__latestApkUrl || 'download.html';
            heroAltLink.setAttribute('data-apk-link', '');
        }
    }
}

