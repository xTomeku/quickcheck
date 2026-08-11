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
                               document.getElementById('faq-container');

    if (window.supabase && hasDynamicElements) {
        const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        loadAllDynamicContent(supabaseClient);
    }

    // Scroll Reveal Initialization
    initScrollReveal();

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

async function loadContacts(_supabase) {
    const container = document.getElementById('contacts-container');
    const cacheKey = 'qc_cache_contacts';
    const cached = localStorage.getItem(cacheKey);

    const renderData = (data) => {
        if (!data || data.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = '';
        data.forEach((item, index) => {
            const card = document.createElement('a');
            card.href = item.url;
            card.className = `contact-card reveal delay-${(index % 6) + 1}`;
            if (item.url.startsWith('http')) card.target = '_blank';
            
            card.innerHTML = `
                <span class="contact-icon">${item.icon}</span>
                <h3>${item.label}</h3>
                <p>${item.value}</p>
            `;
            container.appendChild(card);
        });
        initScrollReveal();
    };

    if (cached) {
        try { renderData(JSON.parse(cached)); } catch(e) {}
    } else {
        container.innerHTML = `
            <div class="skeleton-wrapper">
                ${Array(3).fill('<div class="skeleton-card"><div class="skeleton skeleton-icon"></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div></div>').join('')}
            </div>
        `;
    }

    const { data, error } = await _supabase
        .from('contacts')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Errore Supabase:', error);
        if (!cached) container.innerHTML = '';
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
                    contentHtml += `
                        <div class="card reveal delay-${(index % 6) + 1}">
                            <h3>${item.title}</h3>
                            <p>${item.description}</p>
                        </div>
                    `;
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
    const heroBtn = document.getElementById('hero-download-btn');

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
    if (heroBtn) {
        heroBtn.href = latest.download_url;
    }

    // Render Latest
    if (latestContainer) {
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
                        <span class="patch-date">${latest.date}</span>
                    </div>
                </div>
                <div class="patch-content">
                    <ul class="patch-list">
                        ${latest.changes.map(change => `<li>${formatChange(change)}</li>`).join('')}
                    </ul>
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
            card.innerHTML = `
                <div class="patch-header">
                    <div class="patch-info">
                        <span class="patch-version">${update.version}</span>
                        <span class="patch-date">${update.date}</span>
                    </div>
                    <span class="patch-toggle-icon">▼</span>
                </div>
                <div class="patch-content">
                    <ul class="patch-list">
                        ${update.changes.map(change => `<li>${formatChange(change)}</li>`).join('')}
                    </ul>
                    <a href="${update.download_url}" class="btn btn-secondary btn-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Scarica ${update.version}
                    </a>
                </div>
            `;
            
            // Re-add accordion logic for new elements
            card.querySelector('.patch-header').addEventListener('click', () => {
                card.classList.toggle('collapsed');
            });
            
            timelineContainer.appendChild(card);
        });
    }
    
    // Refresh Observer for new elements
    // initScrollReveal(); // Rimosso da qui perché ora è gestito centralmente in loadAllDynamicContent
}

function formatChange(text) {
    // Basic bolding for "Title:" parts
    if (text.includes(':')) {
        const parts = text.split(':');
        return `<strong>${parts[0]}:</strong>${parts.slice(1).join(':')}`;
    }
    return text;
}


async function loadFeatures(_supabase) {
    const container = document.getElementById('features-grid');
    if (!container) return;

    const cacheKey = 'qc_cache_features';
    const cached = localStorage.getItem(cacheKey);

    const renderData = (data) => {
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted);">Nessuna funzionalità configurata.</p>';
            return;
        }

        container.innerHTML = '';
        data.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `card reveal delay-${(index % 6) + 1}`;
            
            card.innerHTML = `
                <div class="card-icon">${item.icon}</div>
                <h3>${item.title}</h3>
                <p>${item.description}</p>
            `;
            container.appendChild(card);
        });
        initScrollReveal();
    };

    if (cached) {
        try { renderData(JSON.parse(cached)); } catch(e) {}
    } else {
        container.innerHTML = `
            <div class="skeleton-wrapper">
                ${Array(3).fill('<div class="skeleton-card"><div class="skeleton skeleton-icon"></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>').join('')}
            </div>
        `;
    }

    const { data, error } = await _supabase
        .from('features')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Errore caricamento features:', error);
        if (!cached) container.innerHTML = '<p style="color: red;">Errore nel caricamento delle funzionalità.</p>';
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

    // Count-up animation helper
    function animateCounter(el, target) {
        if (target <= 0) { el.textContent = '0'; return; }
        const duration = 1500;
        const start = performance.now();
        const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            el.textContent = Math.floor(eased * target).toLocaleString('it-IT');
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    // 1. Downloads from GitHub API
    try {
        const res = await fetch('https://api.github.com/repos/xTomeku/Quick_Check_Unisalento/releases');
        if (res.ok) {
            const releases = await res.json();
            let totalDownloads = 0;
            releases.forEach(release => {
                (release.assets || []).forEach(asset => {
                    totalDownloads += asset.download_count || 0;
                });
            });
            downloadsEl.dataset.target = totalDownloads;
            animateCounter(downloadsEl, totalDownloads);
        }
    } catch (e) {
        console.warn('Impossibile caricare stats download da GitHub:', e);
    }

    // 2. Last update date (from Supabase updates)
    const cachedUpdates = localStorage.getItem('qc_cache_updates');
    if (cachedUpdates) {
        try {
            const updates = JSON.parse(cachedUpdates);
            if (updates.length > 0) updatedEl.textContent = updates[0].date || '—';
        } catch(e) {}
    }
    const { data: updateData } = await _supabase
        .from('updates')
        .select('date')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(1);
    if (updateData && updateData.length > 0) {
        updatedEl.textContent = updateData[0].date;
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
                <div class="faq-question">
                    <h3>${item.question}</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-inner">${item.answer}</div>
                </div>
            `;
            // Accordion toggle
            faqItem.querySelector('.faq-question').addEventListener('click', () => {
                // Close other open items
                container.querySelectorAll('.faq-item.open').forEach(openItem => {
                    if (openItem !== faqItem) openItem.classList.remove('open');
                });
                faqItem.classList.toggle('open');
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
