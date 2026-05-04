document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('toggle');
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburger.classList.remove('toggle');
            });
        });
    }

    // Initialize Supabase only if we are on pages that need it
    const hasDynamicElements = document.getElementById('latest-update-container') || 
                               document.getElementById('timeline-container') || 
                               document.getElementById('hero-download-btn') ||
                               document.getElementById('credits-container') ||
                               document.getElementById('contacts-container');

    if (window.supabase && hasDynamicElements) {
        const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        loadAllDynamicContent(supabaseClient);
    }
});

async function loadAllDynamicContent(_supabase) {
    // Contacts (always present in footer area)
    if (document.getElementById('contacts-container')) {
        loadContacts(_supabase);
    }

    // Page specific
    if (document.getElementById('credits-container')) {
        loadCredits(_supabase);
    } else if (document.getElementById('latest-update-container') || document.getElementById('hero-download-btn')) {
        loadDynamicUpdates(_supabase);
    }

    // Legal Content (only on Home)
    if (document.getElementById('legal-container')) {
        loadLegal(_supabase);
    }
}

async function loadLegal(_supabase) {
    const container = document.getElementById('legal-container');
    // We now use the dedicated 'legal' table
    const { data, error } = await _supabase
        .from('legal')
        .select('*')
        .order('order_index', { ascending: true });

    if (error || !data || data.length === 0) return;

    // Group by category
    const grouped = data.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    container.innerHTML = '';
    
    // Fixed order for legal sections
    const categories = ['Termini di Servizio', 'Informativa sulla Privacy'];
    
    categories.forEach(cat => {
        if (grouped[cat]) {
            const block = document.createElement('div');
            block.className = 'legal-block';
            
            let html = `<h2>${cat}</h2>`;
            grouped[cat].forEach(item => {
                html += `
                    <div class="legal-item">
                        <span class="item-title">${item.title}</span> ${item.description}
                    </div>
                `;
            });
            
            block.innerHTML = html;
            container.appendChild(block);
        }
    });
}

async function loadContacts(_supabase) {
    const container = document.getElementById('contacts-container');
    const { data, error } = await _supabase
        .from('contacts')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Errore Supabase:', error);
        container.innerHTML = '';
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = ''; // Rimuove "Caricamento..." se non ci sono dati
        return;
    }

    container.innerHTML = '';
    data.forEach(item => {
        const card = document.createElement('a');
        card.href = item.url;
        card.className = 'contact-card';
        if (item.url.startsWith('http')) card.target = '_blank';
        
        card.innerHTML = `
            <span class="contact-icon">${item.icon}</span>
            <h3>${item.label}</h3>
            <p>${item.value}</p>
        `;
        container.appendChild(card);
    });
}

async function loadCredits(_supabase) {
    const container = document.getElementById('credits-container');
    const { data, error } = await _supabase
        .from('credits')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        container.innerHTML = `<p style="color: #ff4d4d;">Errore caricamento credits.</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessun riconoscimento presente.</p>';
        return;
    }

    // Group by category
    const grouped = data.reduce((acc, item) => {
        const cat = item.category || 'Generale'; // Default se vuoto
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    container.innerHTML = '';
    
    for (const category in grouped) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'credit-category';
        
        let contentHtml = `<h2>${category}</h2>`;
        
        // Use grid only if not 'Note Legali' or similar (simple heuristic)
        if (category.toLowerCase().includes('legale') || category.toLowerCase().includes('note')) {
            grouped[category].forEach(item => {
                contentHtml += `<p style="color: var(--text-muted); max-width: 600px; margin: 0 auto; text-align: center;">${item.description}</p>`;
            });
        } else {
            contentHtml += `<div class="credits-grid">`;
            grouped[category].forEach(item => {
                contentHtml += `
                    <div class="card">
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
}

async function loadDynamicUpdates(_supabase) {
    const latestContainer = document.getElementById('latest-update-container');
    const timelineContainer = document.getElementById('timeline-container');
    const heroBtn = document.getElementById('hero-download-btn');

    const { data, error } = await _supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching updates:', error);
        if (latestContainer) latestContainer.innerHTML = '<p style="text-align:center; color:red;">Errore nel caricamento dei dati.</p>';
        return;
    }

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

            <div class="card patch-card latest-card">
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
        others.forEach(update => {
            const card = document.createElement('div');
            card.className = 'card patch-card collapsed';
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
}

function formatChange(text) {
    // Basic bolding for "Title:" parts
    if (text.includes(':')) {
        const parts = text.split(':');
        return `<strong>${parts[0]}:</strong>${parts.slice(1).join(':')}`;
    }
    return text;
}
