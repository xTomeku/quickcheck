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
                               document.getElementById('bugs-container');

    if (window.supabase && hasDynamicElements) {
        const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        loadAllDynamicContent(supabaseClient);
    }

    // Scroll Reveal Initialization
    initScrollReveal();

    // Inizializzazione Prompt e Guida PWA (iOS / Android / PC)
    initPwaInstallationFlow();

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
    const { data, error } = await _supabase
        .from('legal')
        .select('*')
        .eq('is_visible', true)
        .eq('category', 'Informativa sulla Privacy')
        .order('order_index', { ascending: true });

    if (error || !data || data.length === 0) return;

    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '1.5rem';
    wrapper.style.maxWidth = '800px';
    wrapper.style.margin = '0 auto';
    
    data.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = `card reveal delay-${(index % 6) + 1}`;
        card.style.textAlign = 'left';
        
        card.innerHTML = `
            <h3 style="color: var(--primary-gold); margin-bottom: 0.5rem; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px;">${item.title}</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">${item.description}</p>
        `;
        wrapper.appendChild(card);
    });
    
    container.appendChild(wrapper);
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

async function loadCredits(_supabase) {
    const container = document.getElementById('credits-container');
    const cacheKey = 'qc_cache_credits';
    const cached = localStorage.getItem(cacheKey);

    const renderData = (data) => {
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessun riconoscimento presente.</p>';
            return;
        }

        const grouped = data.reduce((acc, item) => {
            const cat = item.category || 'Generale';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});

        container.innerHTML = '';
        
        for (const category in grouped) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'credit-category';
            
            let contentHtml = `<h2>${category}</h2>`;
            
            if (category.toLowerCase().includes('legale') || category.toLowerCase().includes('note')) {
                grouped[category].forEach(item => {
                    contentHtml += `<p style="color: var(--text-muted); max-width: 600px; margin: 0 auto; text-align: center;">${item.description}</p>`;
                });
            } else {
                contentHtml += `<div class="credits-grid">`;
                grouped[category].forEach((item, index) => {
                    const hasUrl = item.url && item.url.trim() !== '';
                    if (hasUrl) {
                        contentHtml += `
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="card credit-card-link reveal delay-${(index % 6) + 1}">
                                <svg class="credit-link-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                                <h3>${item.title}</h3>
                                <p>${item.description}</p>
                            </a>
                        `;
                    } else {
                        contentHtml += `
                            <div class="card reveal delay-${(index % 6) + 1}">
                                <h3>${item.title}</h3>
                                <p>${item.description}</p>
                            </div>
                        `;
                    }
                });
                contentHtml += `</div>`;
            }
            
            categoryDiv.innerHTML = contentHtml;
            container.appendChild(categoryDiv);
        }
        initScrollReveal();
    };

    if (cached) {
        try { renderData(JSON.parse(cached)); } catch(e) {}
    } else {
        container.innerHTML = `
            <div class="skeleton-wrapper" style="margin-top: 3rem;">
                ${Array(3).fill('<div class="skeleton-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>').join('')}
            </div>
        `;
    }

    const { data, error } = await _supabase
        .from('credits')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });

    if (error) {
        if (!cached) container.innerHTML = `<p style="color: #ff4d4d;">Errore caricamento credits.</p>`;
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

    // Render Latest
    if (latestContainer) {
        const latestChanges = Array.isArray(latest.changes) ? latest.changes : [];
        const changesCount = latestChanges.length;

        latestContainer.innerHTML = `
            <div class="download-hero">
                <a href="${latest.download_url}" class="btn btn-primary btn-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Scarica l'ultima versione (${latest.version})
                </a>
                <p class="platform-subtitle" style="margin-top: 0.5rem; text-align: center;">${latest.details || ''}</p>
            </div>

            <div class="card patch-card latest-card reveal">
                <div class="patch-header no-toggle">
                    <div class="patch-info">
                        <span class="patch-version">${latest.version}</span>
                        <span class="patch-date">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            ${latest.date}
                        </span>
                    </div>
                    <div class="patch-header-right">
                        <span class="patch-count-badge">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            ${changesCount} ${changesCount === 1 ? 'modifica' : 'modifiche'}
                        </span>
                    </div>
                </div>
                <div class="patch-content">
                    <div class="patch-block-list">
                        ${latestChanges.map(change => renderPatchItem(change)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Render Timeline
    if (timelineContainer) {
        timelineContainer.innerHTML = '';
        others.forEach((update, index) => {
            const card = document.createElement('div');
            card.className = 'card patch-card collapsed reveal';
            const updateChanges = Array.isArray(update.changes) ? update.changes : [];
            const changesCount = updateChanges.length;

            card.innerHTML = `
                <div class="patch-header">
                    <div class="patch-info">
                        <span class="patch-version">${update.version}</span>
                        <span class="patch-date">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            ${update.date}
                        </span>
                    </div>
                    <div class="patch-header-right">
                        <span class="patch-count-badge">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            ${changesCount} ${changesCount === 1 ? 'modifica' : 'modifiche'}
                        </span>
                        <span class="patch-toggle-icon">▼</span>
                    </div>
                </div>
                <div class="patch-content">
                    <div class="patch-block-list">
                        ${updateChanges.map(change => renderPatchItem(change)).join('')}
                    </div>
                    <div class="patch-card-actions">
                        <a href="${update.download_url}" class="btn btn-secondary btn-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Scarica ${update.version}
                        </a>
                    </div>
                </div>
            `;
            
            // Accordion click per espandere/collassare la card
            card.querySelector('.patch-header').addEventListener('click', () => {
                card.classList.toggle('collapsed');
            });
            
            timelineContainer.appendChild(card);
        });
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

    if (cleanTitle.length > 0) {
        cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    }

    return { title: cleanTitle, desc, type };
}

/**
 * Renderizza un elemento changelog trasformandolo in un blocco/card moderno
 * dotato di micro-badge iconico, titolo in risalto e descrizione separata.
 */
function renderPatchItem(changeText) {
    const { title, desc, type } = parsePatchChange(changeText);

    let badgeLabel = 'Novità';
    let badgeClass = 'patch-badge-feature';
    let typeClass = 'type-feature';
    // Icona scintilla/sparkle per novità
    let iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;

    if (type === 'fix') {
        badgeLabel = 'Fix';
        badgeClass = 'patch-badge-fix';
        typeClass = 'type-fix';
        // Icona chiave inglese per bugfix
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
    } else if (type === 'improvement') {
        badgeLabel = 'Miglioramento';
        badgeClass = 'patch-badge-improvement';
        typeClass = 'type-improvement';
        // Icona fulmine per miglioramenti e ottimizzazioni
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
    }

    return `
        <div class="patch-block-item ${typeClass}">
            <div class="patch-block-header">
                <span class="patch-badge ${badgeClass}">
                    ${iconSvg}
                    <span>${badgeLabel}</span>
                </span>
                <span class="patch-block-title">${title}</span>
            </div>
            ${desc ? `<p class="patch-block-desc">${desc}</p>` : ''}
        </div>
    `;
}

function formatChange(text) {
    // Funzione legacy mantenuta per retrocompatibilità
    if (text.includes(':')) {
        const parts = text.split(':');
        return `<strong>${parts[0]}:</strong>${parts.slice(1).join(':')}`;
    }
    return text;
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

    // 2. Ultima versione e data (tabella updates): quella segnata "Ultima" nel pannello,
    //    altrimenti la più recente pubblicata
    const versionEl = document.getElementById('stat-version');
    const mostraVersione = (u) => {
        if (!u) return;
        updatedEl.textContent = u.date || '—';
        if (versionEl && u.version) versionEl.textContent = String(u.version).replace(/^v/i, '');
    };
    const cachedUpdates = localStorage.getItem('qc_cache_updates');
    if (cachedUpdates) {
        try {
            const updates = JSON.parse(cachedUpdates);
            if (updates.length > 0) mostraVersione(updates[0]);
        } catch(e) {}
    }
    const { data: updateData } = await _supabase
        .from('updates')
        .select('version, date')
        .eq('is_visible', true)
        .order('is_latest', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);
    if (updateData && updateData.length > 0) {
        mostraVersione(updateData[0]);
        localStorage.setItem('qc_cache_updates', JSON.stringify(updateData));
    }
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

    const cacheKey = 'qc_cache_bugs';
    const cached = localStorage.getItem(cacheKey);

    let allBugs = [];
    let currentFilter = 'all';
    let searchQuery = '';

    const statOpen = document.getElementById('stat-open-bugs');
    const statProgress = document.getElementById('stat-progress-bugs');
    const statResolved = document.getElementById('stat-resolved-bugs');

    const pillAll = document.getElementById('pill-count-all');
    const pillOpen = document.getElementById('pill-count-open');
    const pillProgress = document.getElementById('pill-count-progress');
    const pillResolved = document.getElementById('pill-count-resolved');

    const updateStats = (data) => {
        const openCount = data.filter(b => b.status === 'open').length;
        const progressCount = data.filter(b => b.status === 'in_progress').length;
        const resolvedCount = data.filter(b => b.status === 'resolved').length;

        if (statOpen) statOpen.textContent = openCount;
        if (statProgress) statProgress.textContent = progressCount;
        if (statResolved) statResolved.textContent = resolvedCount;

        if (pillAll) pillAll.textContent = data.length;
        if (pillOpen) pillOpen.textContent = openCount;
        if (pillProgress) pillProgress.textContent = progressCount;
        if (pillResolved) pillResolved.textContent = resolvedCount;
    };

    const formatBugDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    const renderBugs = () => {
        let filtered = allBugs;

        if (currentFilter !== 'all') {
            filtered = filtered.filter(b => b.status === currentFilter);
        }

        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(b => 
                (b.title && b.title.toLowerCase().includes(q)) ||
                (b.description && b.description.toLowerCase().includes(q)) ||
                (b.category && b.category.toLowerCase().includes(q)) ||
                (b.affected_version && b.affected_version.toLowerCase().includes(q)) ||
                (b.fixed_version && b.fixed_version.toLowerCase().includes(q))
            );
        }

        if (filtered.length === 0) {
            let msg = 'Nessun bug corrisponde ai filtri selezionati.';
            if (allBugs.length === 0) {
                msg = 'Tutti i sistemi sono pienamente operativi. Nessuna anomalia aperta o segnalata!';
            }
            container.innerHTML = `
                <div class="bugs-empty reveal">
                    <span class="bugs-empty-icon">${allBugs.length === 0 ? '🎉' : '🔍'}</span>
                    <h3>${allBugs.length === 0 ? 'Nessun bug aperto' : 'Nessun risultato'}</h3>
                    <p>${msg}</p>
                </div>
            `;
            if (toggleAllBtn) toggleAllBtn.style.display = 'none';
            initScrollReveal();
            return;
        }

        const statusLabels = {
            'open': { label: 'Noto / Aperto', icon: '🔴', cls: 'status-open' },
            'in_progress': { label: 'In Risoluzione', icon: '🟡', cls: 'status-in_progress' },
            'resolved': { label: 'Risolto', icon: '🟢', cls: 'status-resolved' }
        };

        const severityLabels = {
            'critical': { label: 'Critica', cls: 'severity-critical' },
            'high': { label: 'Alta', cls: 'severity-high' },
            'medium': { label: 'Media', cls: 'severity-medium' },
            'low': { label: 'Bassa', cls: 'severity-low' }
        };

        const autoExpand = searchQuery.trim() !== '';

        container.innerHTML = filtered.map((b, index) => {
            const st = statusLabels[b.status] || { label: b.status, icon: '⚪', cls: 'status-open' };
            const sv = severityLabels[b.severity] || { label: b.severity || 'Media', cls: 'severity-medium' };
            const dateText = formatBugDate(b.created_at);
            const isExpanded = autoExpand;

            return `
                <article class="bug-card ${st.cls} ${isExpanded ? 'is-expanded' : ''} reveal delay-${(index % 5) + 1}" data-bug-id="${b.id}">
                    <div class="bug-card-header" role="button" tabindex="0" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-controls="bug-collapse-${b.id}">
                        <div class="bug-card-top">
                            <div class="bug-card-badges">
                                <span class="bug-badge ${st.cls}">
                                    <span class="status-dot"></span>
                                    ${st.label}
                                </span>
                                <span class="bug-badge ${sv.cls}">
                                    <span class="badge-prefix-desktop">Gravità </span>${sv.label}
                                </span>
                                ${b.category ? `<span class="bug-badge category-pill">${b.category}</span>` : ''}
                            </div>
                            ${dateText ? `<div class="bug-card-date"><span class="badge-prefix-desktop">Segnalato il </span>${dateText}</div>` : ''}
                        </div>

                        <div class="bug-card-title-row">
                            <h3 class="bug-card-title">${b.title}</h3>
                            <button type="button" class="bug-card-toggle-btn" aria-label="Espandi o comprimi dettagli" tabindex="-1">
                                <svg class="bug-chevron-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                        </div>
                    </div>

                    <div id="bug-collapse-${b.id}" class="bug-card-collapse" role="region">
                        <div class="bug-card-collapse-inner">
                            <p class="bug-card-desc">${b.description}</p>

                            ${b.workaround ? `
                                <div class="bug-workaround-box">
                                    <span class="bug-workaround-icon">💡</span>
                                    <div class="bug-workaround-content">
                                        <strong>Consiglio / Soluzione temporanea per gli utenti</strong>
                                        ${b.workaround}
                                    </div>
                                </div>
                            ` : ''}

                            <div class="bug-card-bottom">
                                <div class="bug-card-meta">
                                    ${b.affected_version ? `<span>Versione interessata: <strong style="color:var(--text-main);">${b.affected_version}</strong></span>` : ''}
                                    ${b.status === 'resolved' && b.fixed_version ? `
                                        <span class="bug-fixed-badge">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            Risolto in ${b.fixed_version}
                                        </span>
                                    ` : ''}
                                </div>
                                <div style="font-size:0.75rem; color:var(--text-muted);">
                                    ID #${b.id}
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        // Attach accordion click & keyboard listeners
        const cardHeaders = container.querySelectorAll('.bug-card-header');
        cardHeaders.forEach(header => {
            const toggle = () => {
                const card = header.closest('.bug-card');
                if (!card) return;
                const wasExpanded = card.classList.contains('is-expanded');
                const nowExpanded = !wasExpanded;
                card.classList.toggle('is-expanded', nowExpanded);
                header.setAttribute('aria-expanded', nowExpanded ? 'true' : 'false');
            };

            header.addEventListener('click', () => {
                toggle();
            });

            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
            });
        });

        initScrollReveal();
    };

    // Filter pill events
    const filterPills = document.querySelectorAll('.bug-filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.dataset.status;
            renderBugs();
        });
    });

    // Search input event
    const searchInput = document.getElementById('bug-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderBugs();
        });
    }

    if (cached) {
        try {
            allBugs = JSON.parse(cached);
            updateStats(allBugs);
            renderBugs();
        } catch(e) {}
    } else {
        container.innerHTML = `
            <div class="skeleton-wrapper" style="flex-direction: column; gap: 1rem;">
                ${Array(3).fill('<div class="skeleton" style="height: 120px; border-radius: 16px; width: 100%;"></div>').join('')}
            </div>
        `;
    }

    try {
        const { data, error } = await _supabase
            .from('bugs')
            .select('*')
            .eq('is_visible', true)
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Tabella bugs non disponibile su Supabase o errore:', error.message);
            if (!cached) {
                container.innerHTML = `
                    <div class="bugs-empty reveal">
                        <span class="bugs-empty-icon">🛡️</span>
                        <h3>Nessun problema segnalato</h3>
                        <p>Tutti i servizi e le funzionalità di QuickCheck sono attualmente operativi al 100%.</p>
                    </div>
                `;
                initScrollReveal();
            }
            return;
        }

        allBugs = data || [];
        updateStats(allBugs);
        const freshString = JSON.stringify(allBugs);
        if (freshString !== cached) {
            localStorage.setItem(cacheKey, freshString);
            renderBugs();
        }
    } catch (err) {
        console.error('Errore durante fetch bugs:', err);
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
function initPwaInstallationFlow() {
    const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
    // Rileva iPhone, iPad, iPod e anche iPadOS su MacIntel con touch abilitato
    const isIos = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);

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

    // Trigger apertura modale da pulsanti dedicati (landing e download page)
    openPwaGuideBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(isIos ? 'ios' : 'android');
        });
    });

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

