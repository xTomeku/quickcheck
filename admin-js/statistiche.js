// Pannello admin - Statistiche: download da GitHub, accessi (app_accessi), grafico,
// adozione delle versioni, esportazione ed eliminazione dei dati.

// Analytics DOM
const refreshAnalyticsBtn = document.getElementById('refresh-analytics-btn');
const refreshIcon = document.getElementById('refresh-icon');
const analyticsLastSync = document.getElementById('analytics-last-sync');
const kpiTotalDownloads = document.getElementById('kpi-total-downloads');
const kpiTopVersion = document.getElementById('kpi-top-version');
const kpiTopVersionSub = document.getElementById('kpi-top-version-sub');
const kpiLatestVersion = document.getElementById('kpi-latest-version');
const kpiLatestVersionSub = document.getElementById('kpi-latest-version-sub');
const kpiTotalReleases = document.getElementById('kpi-total-releases');
const analyticsVersionsList = document.getElementById('analytics-versions-list');

// Telemetria Utenti Supabase DOM
const kpiUsersToday = document.getElementById('kpi-users-today');
const kpiSubApk = document.getElementById('kpi-sub-apk');
const kpiSubPwa = document.getElementById('kpi-sub-pwa');
const kpiSubWeb = document.getElementById('kpi-sub-web');
const kpiUsersYesterday = document.getElementById('kpi-users-yesterday');
const kpiUsersYesterdaySub = document.getElementById('kpi-users-yesterday-sub');
const kpiUsersAvg7 = document.getElementById('kpi-users-avg7');
const kpiUsersTotal30 = document.getElementById('kpi-users-total30');
const userStatsHistoryList = document.getElementById('user-stats-history-list');
const kpiUsersRangeLabel = document.getElementById('kpi-users-range-label');
// Variabile di stato per l'intervallo di giorni selezionato (predefinito: 30)
let currentStatsRangeDays = 30;

// ===== Analytics / Statistiche Download =====
// L'API di GitHub senza login concede 60 richieste l'ora per connessione (contano anche le pagine
// del sito aperte dallo stesso PC): le release salvate si riusano per 15 minuti e solo il pulsante
// Aggiorna le chiede sempre. Se GitHub non risponde restano quelle salvate.
const STATS_CACHE_MINUTI = 15;

const _oraBreve = (ms) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

async function fetchDownloadStats(isManualRefresh = false) {
    if (!analyticsVersionsList) return;

    if (refreshIcon) refreshIcon.classList.add('spinning');
    if (refreshAnalyticsBtn) refreshAnalyticsBtn.disabled = true;

    // In memoria: { ora, dati } (le versioni precedenti salvavano solo l'elenco delle release)
    const cacheKey = 'qc_cache_admin_stats';
    let cached = null;
    try {
        const salvato = JSON.parse(localStorage.getItem(cacheKey));
        if (Array.isArray(salvato)) cached = { ora: 0, dati: salvato };
        else if (salvato && Array.isArray(salvato.dati)) cached = salvato;
    } catch (e) { /* niente in memoria */ }

    const renderStats = (releases) => {
        let totalDownloads = 0;
        let releaseStats = [];

        releases.forEach(rel => {
            let relDownloads = 0;
            let apkAssets = [];

            (rel.assets || []).forEach(asset => {
                const count = asset.download_count || 0;
                relDownloads += count;
                totalDownloads += count;
                apkAssets.push({
                    name: asset.name,
                    size: asset.size ? (asset.size / (1024 * 1024)).toFixed(1) + ' MB' : null,
                    downloads: count,
                    url: asset.browser_download_url
                });
            });

            releaseStats.push({
                tag: rel.tag_name,
                name: rel.name || rel.tag_name,
                downloads: relDownloads,
                published_at: rel.published_at || rel.created_at,
                html_url: rel.html_url,
                assets: apkAssets,
                is_draft: rel.draft,
                is_prerelease: rel.prerelease
            });
        });

        // Top Version (max downloads)
        let topRel = releaseStats.length > 0
            ? releaseStats.reduce((max, cur) => cur.downloads > max.downloads ? cur : max, releaseStats[0])
            : null;

        // Latest Version (first in list)
        let latestRel = releaseStats.length > 0 ? releaseStats[0] : null;

        // Update KPIs
        if (kpiTotalDownloads) {
            animateValue(kpiTotalDownloads, totalDownloads);
        }
        if (kpiTotalReleases) {
            kpiTotalReleases.textContent = releaseStats.length.toString();
        }
        if (kpiTopVersion && topRel) {
            kpiTopVersion.textContent = topRel.tag;
            const pct = totalDownloads > 0 ? Math.round((topRel.downloads / totalDownloads) * 100) : 0;
            if (kpiTopVersionSub) {
                kpiTopVersionSub.textContent = `${topRel.downloads.toLocaleString('it-IT')} download (${pct}% del tot)`;
            }
        }
        if (kpiLatestVersion && latestRel) {
            kpiLatestVersion.textContent = latestRel.tag;
            if (kpiLatestVersionSub) {
                kpiLatestVersionSub.textContent = `${latestRel.downloads.toLocaleString('it-IT')} download`;
            }
        }

        // Render Breakdown List
        if (releaseStats.length === 0) {
            analyticsVersionsList.innerHTML = '<p class="admin-vuoto">Nessuna release trovata su GitHub.</p>';
            return;
        }

        analyticsVersionsList.innerHTML = '';
        releaseStats.forEach((rel, idx) => {
            const isTop = topRel && rel.tag === topRel.tag && rel.downloads > 0;
            const isLatest = idx === 0;
            const pct = totalDownloads > 0 ? ((rel.downloads / totalDownloads) * 100).toFixed(1) : '0.0';
            
            const dateStr = rel.published_at 
                ? new Date(rel.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Data sconosciuta';

            const assetInfo = rel.assets.map(a => `${a.name}${a.size ? ` (${a.size})` : ''}`).join(', ') || 'Nessun file APK allegato';

            const card = document.createElement('div');
            card.className = 'version-stat-item';
            card.innerHTML = `
                <div class="version-stat-header">
                    <div class="version-stat-title">
                        <span>${rel.tag}</span>
                        ${isLatest ? '<span class="badge-latest">ULTIMA</span>' : ''}
                        ${isTop ? '<span class="admin-stato oro">★ PIÙ SCARICATA</span>' : ''}
                        ${rel.name && rel.name !== rel.tag ? `<span class="version-stat-nome">— ${rel.name}</span>` : ''}
                    </div>
                    <div class="version-stat-count">
                        <span class="version-stat-number">${rel.downloads.toLocaleString('it-IT')}</span>
                        <span class="admin-testo-sub admin-piccolo">download (${pct}%)</span>
                    </div>
                </div>

                <div class="version-stat-meta">
                    <span>📦 ${assetInfo} • 📅 ${dateStr}</span>
                    <a href="${rel.html_url}" target="_blank" rel="noopener noreferrer" class="badge-gh" title="Visualizza release su GitHub">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                        GitHub
                    </a>
                </div>

                <div class="version-progress-container">
                    <div class="version-progress-bar" style="width: 0%;" data-target-width="${pct}%"></div>
                </div>
            `;
            analyticsVersionsList.appendChild(card);
        });

        // Animate progress bars
        setTimeout(() => {
            document.querySelectorAll('.version-progress-bar').forEach(bar => {
                bar.style.width = bar.dataset.targetWidth || '0%';
            });
        }, 50);

        if (analyticsLastSync) {
            const now = new Date();
            analyticsLastSync.textContent = `Aggiornato alle ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        }
    };

    const fermaRotella = () => {
        if (refreshIcon) refreshIcon.classList.remove('spinning');
        if (refreshAnalyticsBtn) refreshAnalyticsBtn.disabled = false;
    };
    const datiDelle = () => {
        if (analyticsLastSync) analyticsLastSync.textContent = cached.ora ? `Dati delle ${_oraBreve(cached.ora)}` : 'Dati salvati in precedenza';
    };

    // Dati salvati: si mostrano subito; se sono recenti non si chiede nulla a GitHub
    if (cached && !isManualRefresh) {
        try {
            renderStats(cached.dati);
            datiDelle();
        } catch (e) { /* si riprova da GitHub */ }
        if (Date.now() - cached.ora < STATS_CACHE_MINUTI * 60000) {
            fermaRotella();
            return;
        }
    }

    try {
        const res = await fetch('https://api.github.com/repos/xTomeku/Quick_Check_Unisalento/releases');
        if (!res.ok) {
            // Limite orario finito: GitHub dice quando si azzera
            const reset = Number(res.headers.get('x-ratelimit-reset'));
            const err = new Error(res.status === 403 || res.status === 429
                ? `GitHub ha raggiunto il limite di richieste orarie${reset ? `, riprova dopo le ${_oraBreve(reset * 1000)}` : ''}`
                : `GitHub API HTTP ${res.status}`);
            throw err;
        }
        const data = await res.json();
        try { localStorage.setItem(cacheKey, JSON.stringify({ ora: Date.now(), dati: data })); } catch (e) { /* storage pieno */ }
        renderStats(data);
        if (isManualRefresh) {
            showToast('Statistiche aggiornate con successo!');
        }
    } catch (err) {
        console.error('Errore fetch GitHub Releases:', err);
        if (!cached) {
            analyticsVersionsList.innerHTML = `
                <div class="admin-errore admin-centro">
                    <p class="admin-spazio-sotto">Impossibile recuperare i dati da GitHub Releases (${escapeHtml(err.message)}).</p>
                    <button class="btn btn-secondary btn-sm" onclick="fetchDownloadStats(true)">Riprova</button>
                </div>
            `;
        } else if (!isManualRefresh) {
            datiDelle(); // restano i dati salvati, già mostrati: niente avviso all'apertura
        } else {
            // L'avviso solo se l'aggiornamento l'ha chiesto l'admin
            renderStats(cached.dati);
            datiDelle();
            showToast(`Statistiche non aggiornate: ${err.message}. Restano i dati${cached.ora ? ` delle ${_oraBreve(cached.ora)}` : ' salvati'}.`, 'error');
        }
    } finally {
        if (refreshIcon) refreshIcon.classList.remove('spinning');
        if (refreshAnalyticsBtn) refreshAnalyticsBtn.disabled = false;
    }
}

function animateValue(el, target) {
    if (!el) return;
    if (target <= 0) { el.textContent = '0'; return; }
    const duration = 800;
    const start = performance.now();
    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString('it-IT');
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

if (refreshAnalyticsBtn) {
    refreshAnalyticsBtn.addEventListener('click', () => {
        fetchDownloadStats(true);
        fetchUserStats();
        fetchVersionRolloutStats();
    });
}

// ===== Telemetria Anonima Utenti QuickCheck (Supabase) =====
// Variabile modalità simulazione dati demo (attiva di default per visualizzare subito l'anteprima)
let isDemoStatsMode = false;

function generateDemoStats() {
    const list = [];
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');

    // Genera 30 giorni di storico realistico con trend, picchi nel fine settimana e oscillazioni
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dataStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const trend = Math.floor((30 - i) * 1.6);

        const apkBase = Math.floor(18 + trend + Math.sin(i * 0.8) * 8 + (isWeekend ? 12 : 0));
        const pwaBase = Math.floor(10 + Math.floor(trend * 0.6) + Math.cos(i * 0.9) * 5 + (isWeekend ? 7 : 0));
        const webBase = Math.floor(7 + Math.floor(trend * 0.4) + (i % 4 === 0 ? 6 : 0));

        const apk = Math.max(3, apkBase);
        const pwa = Math.max(2, pwaBase);
        const web = Math.max(1, webBase);
        const totale = apk + pwa + web;

        list.push({
            data: dataStr,
            utenti_unici_totali: totale,
            utenti_apk: apk,
            utenti_pwa: pwa,
            utenti_web_browser: web
        });
    }
    return list;
}

/**
 * Storico degli utenti unici giorno per giorno (dal più recente), per Statistiche e Panoramica.
 * Interroga prioritariamente la vista aggregata 'v_utenti_unici_giornalieri'.
 * In caso di assenza della vista, esegue il fallback aggregando i record di 'app_accessi'.
 * Lancia l'errore se nessuna delle due fonti è leggibile.
 */
async function leggiStatisticheUtenti(days) {
    // Query alla vista aggregata SQL su Supabase con il limite richiesto
    let { data, error } = await _supabase
        .from('v_utenti_unici_giornalieri')
        .select('*')
        .order('data', { ascending: false })
        .limit(days);

    // Fallback resiliente: se la vista non è ancora presente, aggrega lato client da app_accessi
    if (error) {
        console.warn('v_utenti_unici_giornalieri non raggiungibile, fallback su app_accessi:', error.message);
        const { data: raw, error: rawErr } = await scaricaTutteLeRighe(() => _supabase
            .from('app_accessi')
            .select('uuid_utente, data, piattaforma'));

        if (rawErr) throw rawErr;

        const raggruppati = {};
        (raw || []).forEach(row => {
            const d = row.data;
            if (!raggruppati[d]) {
                raggruppati[d] = {
                    data: d,
                    all: new Set(),
                    apk: new Set(),
                    pwa: new Set(),
                    web: new Set()
                };
            }
            raggruppati[d].all.add(row.uuid_utente);
            if (row.piattaforma === 'android') raggruppati[d].apk.add(row.uuid_utente);
            else if (row.piattaforma === 'pwa') raggruppati[d].pwa.add(row.uuid_utente);
            else raggruppati[d].web.add(row.uuid_utente);
        });

        data = Object.keys(raggruppati).sort().reverse().map(d => ({
            data: d,
            utenti_unici_totali: raggruppati[d].all.size,
            utenti_apk: raggruppati[d].apk.size,
            utenti_pwa: raggruppati[d].pwa.size,
            utenti_web_browser: raggruppati[d].web.size
        }));

        if (days && days < 365) {
            data = data.slice(0, days);
        }
    }

    return data || [];
}

/**
 * Recupera le statistiche di accesso giornaliero da Supabase (o genera dati demo se attiva la simulazione)
 * e le mostra nella sezione Statistiche.
 */
async function fetchUserStats(days = currentStatsRangeDays) {
    if (!userStatsHistoryList) return;

    // Se la modalità demo è attiva, mostra dati simulati realistici
    if (isDemoStatsMode) {
        let demo = generateDemoStats();
        if (days && days < 365) {
            demo = demo.slice(0, days);
        }
        if (kpiUsersRangeLabel) {
            kpiUsersRangeLabel.textContent = days >= 365 ? 'Accessi Totali Storico (Demo)' : `Accessi Ultimi ${days} Giorni (Demo)`;
        }
        renderUserStats(demo);
        return;
    }

    try {
        // Aggiorna l'etichetta del KPI in base ai giorni selezionati
        if (kpiUsersRangeLabel) {
            kpiUsersRangeLabel.textContent = days >= 365 ? 'Accessi Totali Storico' : `Accessi Ultimi ${days} Giorni`;
        }

        renderUserStats(await leggiStatisticheUtenti(days));
    } catch (err) {
        console.error('Errore nel recupero telemetria utenti:', err);
        if (userStatsHistoryList) {
            userStatsHistoryList.innerHTML = `
                <div class="admin-errore admin-centro">
                    <p class="admin-errore-titolo">Impossibile recuperare i dati da Supabase (${err.message})</p>
                    <p class="admin-testo-sub admin-piccolo">Assicurati di aver eseguito lo script SQL per creare la tabella <code>app_accessi</code>.</p>
                </div>
            `;
        }
    }
}

// ============================================================
// GRAFICO TELEMETRIA UTENTI MULTILINEA (CHART.JS)
// ============================================================
let userStatsChart = null;
let chartTogglesInitialized = false;

// Plugin custom: linea verticale bianca di guida (crosshair) all'hover
const verticalCrosshairPlugin = {
    id: 'verticalCrosshair',
    afterDraw: (chart) => {
        if (chart.tooltip && chart.tooltip.opacity > 0 && chart.tooltip.dataPoints && chart.tooltip.dataPoints.length > 0) {
            const ctx = chart.ctx;
            const x = chart.tooltip.dataPoints[0].element.x;
            const topY = chart.scales.y.top;
            const bottomY = chart.scales.y.bottom;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, topY);
            ctx.lineTo(x, bottomY);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.stroke();
            ctx.restore();
        }
    }
};

function formatChartDate(isoDateStr) {
    if (!isoDateStr) return '';
    const parts = isoDateStr.split('-');
    if (parts.length < 3) return isoDateStr;
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function renderUserStatsChart(records) {
    const canvas = document.getElementById('user-stats-chart');
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');

    // Ordine cronologico per l'asse X (dal giorno più vecchio a oggi)
    const chronRecords = [...(records || [])].reverse();

    const labels = chronRecords.map(r => formatChartDate(r.data));
    const dataTotale = chronRecords.map(r => Number(r.utenti_unici_totali) || 0);
    const dataApk = chronRecords.map(r => Number(r.utenti_apk) || 0);
    const dataPwa = chronRecords.map(r => Number(r.utenti_pwa) || 0);
    const dataWeb = chronRecords.map(r => Number(r.utenti_web_browser) || 0);

    const createAreaGrad = (r, g, b) => {
        const grad = ctx.createLinearGradient(0, 0, 0, 300);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
        grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.03)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        return grad;
    };

    const isSinglePoint = chronRecords.length <= 1;

    const datasets = [
        {
            label: 'Totale Unici',
            data: dataTotale,
            borderColor: '#FFD700',
            backgroundColor: createAreaGrad(255, 215, 0),
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: isSinglePoint ? 6 : 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#FFD700',
            pointBorderColor: '#111',
            pointBorderWidth: 2
        },
        {
            label: 'APK Android',
            data: dataApk,
            borderColor: '#22c55e',
            backgroundColor: createAreaGrad(34, 197, 94),
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: isSinglePoint ? 6 : 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#22c55e',
            pointBorderColor: '#111',
            pointBorderWidth: 2
        },
        {
            label: 'PWA Standalone',
            data: dataPwa,
            borderColor: '#a855f7',
            backgroundColor: createAreaGrad(168, 85, 247),
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: isSinglePoint ? 6 : 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#a855f7',
            pointBorderColor: '#111',
            pointBorderWidth: 2
        },
        {
            label: 'Web Browser',
            data: dataWeb,
            borderColor: '#38bdf8',
            backgroundColor: createAreaGrad(56, 189, 248),
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: isSinglePoint ? 6 : 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#38bdf8',
            pointBorderColor: '#111',
            pointBorderWidth: 2
        }
    ];

    if (userStatsChart) {
        userStatsChart.data.labels = labels;
        datasets.forEach((ds, idx) => {
            if (userStatsChart.data.datasets[idx]) {
                userStatsChart.data.datasets[idx].data = ds.data;
                userStatsChart.data.datasets[idx].backgroundColor = ds.backgroundColor;
                userStatsChart.data.datasets[idx].pointRadius = ds.pointRadius;
            } else {
                userStatsChart.data.datasets.push(ds);
            }
        });
        userStatsChart.update();
        return;
    }

    userStatsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        plugins: [verticalCrosshairPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false // Gestito tramite le nostre pillole HTML custom
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(12, 12, 12, 0.94)',
                    titleColor: '#fff',
                    titleFont: { size: 12, weight: '700' },
                    bodyColor: '#e2e8f0',
                    bodyFont: { size: 12 },
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: true,
                    boxWidth: 8,
                    boxHeight: 8,
                    usePointStyle: true,
                    callbacks: {
                        label: (context) => ` ${context.dataset.label}: ${context.parsed.y}`
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.45)',
                        font: { size: 11 },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.45)',
                        font: { size: 11 },
                        precision: 0,
                        autoSkip: true,
                        maxTicksLimit: 6
                    },
                    border: {
                        display: false
                    }
                }
            }
        }
    });

    initChartToggles();
}

function initChartToggles() {
    if (chartTogglesInitialized) return;
    chartTogglesInitialized = true;

    document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!userStatsChart) return;
            const dsIdx = parseInt(btn.dataset.dataset, 10);
            const isVisible = userStatsChart.isDatasetVisible(dsIdx);
            userStatsChart.setDatasetVisibility(dsIdx, !isVisible);
            userStatsChart.update();
            btn.classList.toggle('active', !isVisible);
        });
    });
}

/**
 * Renderizza le card KPI, il grafico e la tabella dello storico accessi giornaliero.
 * Include badge colorati per le piattaforme (APK, PWA, Web) e mini-barra percentuale.
 */
function renderUserStats(records) {
    if (!userStatsHistoryList) return;

    // Aggiorna o crea il grafico interattivo multilinea
    renderUserStatsChart(records);

    // Determinazione date oggi e ieri nel formato YYYY-MM-DD
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const oggiStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    
    const ieriDate = new Date();
    ieriDate.setDate(ieriDate.getDate() - 1);
    const ieriStr = `${ieriDate.getFullYear()}-${pad(ieriDate.getMonth() + 1)}-${pad(ieriDate.getDate())}`;

    // Estrazione dati per oggi e ieri
    const datiOggi = records.find(r => r.data === oggiStr) || { utenti_unici_totali: 0, utenti_apk: 0, utenti_pwa: 0, utenti_web_browser: 0 };
    const datiIeri = records.find(r => r.data === ieriStr) || { utenti_unici_totali: 0, utenti_apk: 0, utenti_pwa: 0, utenti_web_browser: 0 };

    // KPI 1: Utenti unici Oggi con breakdown per piattaforma
    if (kpiUsersToday) animateValue(kpiUsersToday, Number(datiOggi.utenti_unici_totali) || 0);
    if (kpiSubApk) kpiSubApk.textContent = datiOggi.utenti_apk || 0;
    if (kpiSubPwa) kpiSubPwa.textContent = datiOggi.utenti_pwa || 0;
    if (kpiSubWeb) kpiSubWeb.textContent = datiOggi.utenti_web_browser || 0;

    // KPI 2: Ieri con differenziale rispetto a oggi
    const totOggi = Number(datiOggi.utenti_unici_totali) || 0;
    const totIeri = Number(datiIeri.utenti_unici_totali) || 0;
    if (kpiUsersYesterday) animateValue(kpiUsersYesterday, totIeri);
    if (kpiUsersYesterdaySub) {
        if (totIeri > 0) {
            const diff = totOggi - totIeri;
            const sign = diff >= 0 ? '+' : '';
            kpiUsersYesterdaySub.textContent = `Oggi: ${sign}${diff} rispetto a ieri`;
            kpiUsersYesterdaySub.classList.remove('neutro', 'verde', 'rosso');
            kpiUsersYesterdaySub.classList.add(diff >= 0 ? 'verde' : 'rosso');
        } else {
            kpiUsersYesterdaySub.textContent = 'Nessun dato per ieri';
            kpiUsersYesterdaySub.classList.remove('verde', 'rosso');
            kpiUsersYesterdaySub.classList.add('neutro');
        }
    }

    // KPI 3: Media mobile ultimi 7 giorni
    const ultimi7 = records.slice(0, 7);
    const media7 = ultimi7.length > 0 
        ? Math.round(ultimi7.reduce((sum, r) => sum + Number(r.utenti_unici_totali || 0), 0) / ultimi7.length)
        : 0;
    if (kpiUsersAvg7) animateValue(kpiUsersAvg7, media7);

    // KPI 4: Totale accessi registrati negli ultimi 30 giorni
    const tot30 = records.reduce((sum, r) => sum + Number(r.utenti_unici_totali || 0), 0);
    if (kpiUsersTotal30) animateValue(kpiUsersTotal30, tot30);

    if (records.length === 0) {
        userStatsHistoryList.innerHTML = '<p class="admin-vuoto">Nessun dato di accesso registrato finora.</p>';
        return;
    }

    // Costruzione righe tabella storico con badge e progress bar multicolore
    const tableRows = records.map(r => {
        const tot = Number(r.utenti_unici_totali) || 0;
        const apk = Number(r.utenti_apk) || 0;
        const pwa = Number(r.utenti_pwa) || 0;
        const web = Number(r.utenti_web_browser) || 0;

        const apkPct = tot > 0 ? Math.round((apk / tot) * 100) : 0;
        const pwaPct = tot > 0 ? Math.round((pwa / tot) * 100) : 0;
        const webPct = tot > 0 ? Math.max(0, 100 - apkPct - pwaPct) : 0;

        let dataEtichetta = r.data;
        if (r.data === oggiStr) dataEtichetta = 'Oggi (' + r.data + ')';
        else if (r.data === ieriStr) dataEtichetta = 'Ieri (' + r.data + ')';

        return `
            <tr>
                <td class="admin-tabella-data">
                    ${dataEtichetta}
                </td>
                <td class="centro">
                    <span class="admin-tabella-totale">${tot}</span>
                </td>
                <td class="centro">
                    <span class="admin-pill apk">
                        📱 ${apk} <small>(${apkPct}%)</small>
                    </span>
                </td>
                <td class="centro">
                    <span class="admin-pill pwa">
                        📲 ${pwa} <small>(${pwaPct}%)</small>
                    </span>
                </td>
                <td class="centro">
                    <span class="admin-pill web">
                        🌐 ${web} <small>(${webPct}%)</small>
                    </span>
                </td>
                <td>
                    <div class="admin-ripartizione">
                        <div class="apk" style="width: ${apkPct}%;" title="APK: ${apkPct}%"></div>
                        <div class="pwa" style="width: ${pwaPct}%;" title="PWA: ${pwaPct}%"></div>
                        <div class="web" style="width: ${webPct}%;" title="Web: ${webPct}%"></div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    userStatsHistoryList.innerHTML = `
        <table class="admin-tabella">
            <thead>
                <tr>
                    <th>Data</th>
                    <th class="centro">Totale Unici</th>
                    <th class="centro">APK Android</th>
                    <th class="centro">PWA Standalone</th>
                    <th class="centro">Web Browser</th>
                    <th>Ripartizione</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}


// Gestione dei pulsanti del selettore di intervallo temporale (7G, 30G, 90G, Tutto)
document.querySelectorAll('.user-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.days, 10);
        if (!days) return;

        currentStatsRangeDays = days;

        // Segmento scelto (aspetto in admin.css, .admin-segmenti button.active)
        document.querySelectorAll('.user-range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Mostra stato di caricamento nella tabella e aggiorna i dati
        if (userStatsHistoryList) {
            userStatsHistoryList.innerHTML = '<p class="admin-caricamento">Caricamento telemetria...</p>';
        }
        fetchUserStats(currentStatsRangeDays);
    });
});

// Gestione pulsante attivazione/disattivazione Modalità Dati Demo
const toggleDemoStatsBtn = document.getElementById('toggle-demo-stats-btn');
const demoBtnText = document.getElementById('demo-btn-text');

if (toggleDemoStatsBtn) {
    if (isDemoStatsMode) {
        toggleDemoStatsBtn.classList.add('attivo');
        if (demoBtnText) demoBtnText.textContent = 'Disattiva Demo';
    }

    toggleDemoStatsBtn.addEventListener('click', () => {
        isDemoStatsMode = !isDemoStatsMode;
        toggleDemoStatsBtn.classList.toggle('attivo', isDemoStatsMode);

        if (isDemoStatsMode) {
            if (demoBtnText) demoBtnText.textContent = 'Disattiva Demo';
            showToast('Modalità Demo attivata: dati simulati negli ultimi 30 giorni', 'success');
        } else {
            if (demoBtnText) demoBtnText.textContent = 'Simula Dati Demo';
            showToast('Dati reali Supabase ripristinati', 'success');
        }
        fetchUserStats(currentStatsRangeDays);
        fetchVersionRolloutStats();
    });
}

// ============================================================
// GESTIONE ADOZIONE VERSIONI & STATO ROLLOUT (SUPABASE)
// ============================================================
let currentRolloutRangeDays = 1; // 1 = Oggi, 7 = 7G, 30 = 30G
let currentRolloutPlatform = 'all'; // 'all', 'android_apk', 'pwa', 'web'
let rolloutControlsInitialized = false;

// Palette cromatica armonica per le versioni nel grafico segmentato e nelle card
const ROLLOUT_COLOR_PALETTE = [
    { bg: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)', hex: '#34d399', badgeBg: 'rgba(16, 185, 129, 0.15)', badgeColor: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }, // Verde (Corrente)
    { bg: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)', hex: '#fbbf24', badgeBg: 'rgba(245, 158, 11, 0.15)', badgeColor: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' }, // Ambra
    { bg: 'linear-gradient(90deg, #38bdf8 0%, #60a5fa 100%)', hex: '#38bdf8', badgeBg: 'rgba(56, 189, 248, 0.15)', badgeColor: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' }, // Azzurro
    { bg: 'linear-gradient(90deg, #a855f7 0%, #c084fc 100%)', hex: '#c084fc', badgeBg: 'rgba(168, 85, 247, 0.15)', badgeColor: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' }, // Viola
    { bg: 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)', hex: '#94a3b8', badgeBg: 'rgba(100, 116, 139, 0.15)', badgeColor: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' }  // Grigio
];

function semverCompare(vA, vB) {
    const clean = s => (s || '').replace(/^[^\d]*/, '').split('.').map(n => parseInt(n, 10) || 0);
    const aParts = clean(vA);
    const bParts = clean(vB);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const a = aParts[i] || 0;
        const b = bParts[i] || 0;
        if (a !== b) return b - a; // discendente (più recente prima)
    }
    return 0;
}

function generateDemoRolloutData() {
    return [
        {
            version: 'v2.2.0',
            isLatest: true,
            total: 182,
            pct: 74.3,
            apk: 78,
            pwa: 96,
            web: 8
        },
        {
            version: 'v2.1.0',
            isLatest: false,
            total: 48,
            pct: 19.6,
            apk: 44,
            pwa: 4,
            web: 0
        },
        {
            version: 'v2.0.0',
            isLatest: false,
            total: 15,
            pct: 6.1,
            apk: 15,
            pwa: 0,
            web: 0
        }
    ];
}

function initRolloutControls() {
    if (rolloutControlsInitialized) return;
    rolloutControlsInitialized = true;

    // Gestione bottoni intervallo Rollout (Oggi, 7G, 30G)
    document.querySelectorAll('.rollout-range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rollout-range-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentRolloutRangeDays = parseInt(btn.dataset.days, 10);
            fetchVersionRolloutStats();
        });
    });

    // Gestione bottoni filtro piattaforma Rollout (Tutte, APK, PWA)
    document.querySelectorAll('.rollout-plat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rollout-plat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentRolloutPlatform = btn.dataset.plat;
            fetchVersionRolloutStats();
        });
    });
}

/**
 * Recupera i dati di telemetria da 'app_accessi' per calcolare la diffusione delle versioni dell'app.
 */
/**
 * Supabase (PostgREST) restituisce al massimo 1000 righe per richiesta: con migliaia di
 * accessi al giorno una sola query ne perdeva la maggior parte e i conteggi risultavano
 * piu' bassi del reale. Qui si scaricano tutte le pagine da 1000 righe.
 * [creaQuery] deve restituire ogni volta una query NUOVA (con gli stessi filtri).
 */
async function scaricaTutteLeRighe(creaQuery, dimensionePagina = 1000) {
    const righe = [];
    for (let da = 0; ; da += dimensionePagina) {
        const { data, error } = await creaQuery()
            .order('data', { ascending: true })
            .order('uuid_utente', { ascending: true })
            .range(da, da + dimensionePagina - 1);
        if (error) return { data: null, error };
        righe.push(...(data || []));
        if (!data || data.length < dimensionePagina) break;
    }
    return { data: righe, error: null };
}

async function fetchVersionRolloutStats() {
    const listElem = document.getElementById('rollout-versions-breakdown-list');
    if (!listElem) return;

    initRolloutControls();

    // Se in modalità Demo, genera dati simulati realistici
    if (isDemoStatsMode) {
        renderVersionRolloutStats(generateDemoRolloutData(), 245, 137, 100, 8);
        return;
    }

    try {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const oggiStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        // "7G" = oggi e i 6 giorni prima (prima si partiva da oggi - 7: 8 giorni)
        const minDateObj = new Date();
        minDateObj.setDate(minDateObj.getDate() - (currentRolloutRangeDays - 1));
        const minDateStr = `${minDateObj.getFullYear()}-${pad(minDateObj.getMonth() + 1)}-${pad(minDateObj.getDate())}`;
        const periodo = currentRolloutRangeDays === 1 ? { giorno: oggiStr } : { dal: minDateStr };

        const r = await calcolaAdozioneVersioni(periodo, currentRolloutPlatform);
        renderVersionRolloutStats(r.versioni, r.totale, r.apk, r.pwa, r.web);

    } catch (err) {
        console.error('Errore nel recupero adozione versioni:', err);
        listElem.innerHTML = `
            <div class="admin-errore admin-centro">
                <p class="admin-piccolo">Impossibile recuperare i dati delle versioni da Supabase (${err.message})</p>
            </div>
        `;
    }
}

/**
 * Diffusione delle versioni (per Statistiche e Panoramica): ultimo accesso di ogni utente
 * nel periodo, raggruppato per versione, con la più recente in testa (isLatest).
 * periodo = { giorno: 'YYYY-MM-DD' } per un solo giorno, oppure { dal: 'YYYY-MM-DD' } (incluso) fino a oggi.
 * piattaforma = 'all' | 'android_apk' | 'pwa' | 'web' (web = tutto ciò che non è APK né PWA, come nei conteggi).
 * Lancia l'errore se app_accessi non si legge.
 */
async function calcolaAdozioneVersioni(periodo, piattaforma = 'all') {
    // Query su app_accessi per recuperare la versione dei ping (tutte le pagine, vedi scaricaTutteLeRighe)
    const creaQuery = () => {
        const q = _supabase
            .from('app_accessi')
            .select('uuid_utente, data, piattaforma, app_version');
        return periodo.giorno ? q.eq('data', periodo.giorno) : q.gte('data', periodo.dal);
    };

    const { data, error } = await scaricaTutteLeRighe(creaQuery);
    if (error) throw error;

    // Mappiamo ciascun utente univoco al record più recente nel periodo selezionato
    const latestUserAccess = new Map();
    (data || []).forEach(row => {
        const existing = latestUserAccess.get(row.uuid_utente);
        if (!existing || row.data > existing.data) {
            latestUserAccess.set(row.uuid_utente, row);
        }
    });

    // Filtro per piattaforma (se selezionato 'android_apk', 'pwa' o 'web')
    let filteredAccesses = Array.from(latestUserAccess.values());
    const piattaformaDi = a => (a.piattaforma || '').toLowerCase();
    if (piattaforma === 'android_apk') {
        filteredAccesses = filteredAccesses.filter(a => piattaformaDi(a) === 'android');
    } else if (piattaforma === 'pwa') {
        filteredAccesses = filteredAccesses.filter(a => piattaformaDi(a) === 'pwa');
    } else if (piattaforma === 'web') {
        filteredAccesses = filteredAccesses.filter(a => !['android', 'pwa'].includes(piattaformaDi(a)));
    }

    const totalActiveUsers = filteredAccesses.length;
    let totalApk = 0;
    let totalPwa = 0;
    let totalWeb = 0;

    // Raggruppamento per versione
    const versionMap = {};
    filteredAccesses.forEach(a => {
        const plat = (a.piattaforma || '').toLowerCase();
        if (plat === 'android') totalApk++;
        else if (plat === 'pwa') totalPwa++;
        else totalWeb++;

        let ver = a.app_version ? a.app_version.trim() : '< v2.0.0 (Legacy)';
        if (!ver.startsWith('v') && !ver.startsWith('<')) ver = 'v' + ver;

        if (!versionMap[ver]) {
            versionMap[ver] = {
                version: ver,
                total: 0,
                apk: 0,
                pwa: 0,
                web: 0
            };
        }
        versionMap[ver].total++;
        if (plat === 'android') versionMap[ver].apk++;
        else if (plat === 'pwa') versionMap[ver].pwa++;
        else versionMap[ver].web++;
    });

    // Ordinamento semver decrescente (la versione più recente in testa)
    const sorted = Object.values(versionMap).sort((a, b) => {
        if (a.version.startsWith('<')) return 1;
        if (b.version.startsWith('<')) return -1;
        return semverCompare(a.version, b.version);
    });

    // Assegna il flag isLatest alla versione più alta
    if (sorted.length > 0) {
        sorted[0].isLatest = true;
    }

    // Calcolo percentuali
    sorted.forEach(item => {
        item.pct = totalActiveUsers > 0 ? Number(((item.total / totalActiveUsers) * 100).toFixed(1)) : 0;
    });

    return { versioni: sorted, totale: totalActiveUsers, apk: totalApk, pwa: totalPwa, web: totalWeb };
}

/**
 * Renderizza le card KPI di rollout, la barra segmentata e l'elenco versioni
 */
function renderVersionRolloutStats(versionList, totalUsers, totalApk, totalPwa, totalWeb) {
    const kpiRolloutPct = document.getElementById('kpi-rollout-pct');
    const kpiRolloutSub = document.getElementById('kpi-rollout-sub');
    const kpiLatestVer = document.getElementById('kpi-latest-detected-ver');
    const kpiLatestSub = document.getElementById('kpi-latest-detected-sub');
    const kpiPwaAdoption = document.getElementById('kpi-pwa-adoption');
    const kpiPwaSub = document.getElementById('kpi-pwa-adoption-sub');
    const kpiWebAdoption = document.getElementById('kpi-web-adoption');
    const kpiWebSub = document.getElementById('kpi-web-adoption-sub');
    const kpiApkAdoption = document.getElementById('kpi-apk-adoption');
    const kpiApkSub = document.getElementById('kpi-apk-adoption-sub');
    const stackedBar = document.getElementById('rollout-stacked-bar');
    const stackedLegend = document.getElementById('rollout-stacked-legend');
    const breakdownList = document.getElementById('rollout-versions-breakdown-list');
    const lastUpdate = document.getElementById('rollout-last-update-time');

    if (lastUpdate) {
        const now = new Date();
        lastUpdate.textContent = `Aggiornato alle ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }

    if (!versionList || versionList.length === 0 || totalUsers === 0) {
        if (kpiRolloutPct) kpiRolloutPct.textContent = '0%';
        if (kpiRolloutSub) kpiRolloutSub.textContent = 'Nessun utente attivo';
        if (kpiLatestVer) kpiLatestVer.textContent = '—';
        if (kpiPwaAdoption) kpiPwaAdoption.textContent = '0%';
        if (kpiWebAdoption) kpiWebAdoption.textContent = '0%';
        if (kpiApkAdoption) kpiApkAdoption.textContent = '0%';
        if (stackedBar) stackedBar.innerHTML = '';
        if (stackedLegend) stackedLegend.innerHTML = '';
        if (breakdownList) {
            breakdownList.innerHTML = '<p class="admin-vuoto">Nessun dato di accesso registrato per il periodo o piattaforma selezionata.</p>';
        }
        return;
    }

    const latest = versionList.find(v => v.isLatest) || versionList[0];
    const adoptionPct = latest.pct;

    // Aggiornamento KPI Rollout
    if (kpiRolloutPct) {
        kpiRolloutPct.textContent = `${adoptionPct}%`;
        kpiRolloutPct.classList.remove('verde', 'giallo', 'blu');
        kpiRolloutPct.classList.add(adoptionPct >= 70 ? 'verde' : (adoptionPct >= 40 ? 'giallo' : 'blu'));
    }
    if (kpiRolloutSub) {
        kpiRolloutSub.textContent = `${latest.total} su ${totalUsers} studenti attivi`;
    }
    if (kpiLatestVer) {
        kpiLatestVer.textContent = latest.version;
    }
    if (kpiLatestSub) {
        kpiLatestSub.textContent = `${latest.total} utenti unici (${adoptionPct}%)`;
    }

    // Adozione PWA installata e sito nel browser, separate (prima erano sommate in "Web / PWA")
    const pwaLatest = latest.pwa || 0;
    const pwaPct = totalPwa > 0 ? Math.round((pwaLatest / totalPwa) * 100) : 0;
    if (kpiPwaAdoption) kpiPwaAdoption.textContent = `${pwaPct}%`;
    if (kpiPwaSub) kpiPwaSub.textContent = `${pwaLatest} su ${totalPwa} utenti PWA`;

    const webLatest = latest.web || 0;
    const webPct = totalWeb > 0 ? Math.round((webLatest / totalWeb) * 100) : 0;
    if (kpiWebAdoption) kpiWebAdoption.textContent = `${webPct}%`;
    if (kpiWebSub) kpiWebSub.textContent = `${webLatest} su ${totalWeb} utenti Web`;

    // APK Adoption
    const apkTotal = totalApk;
    const apkLatest = latest.apk || 0;
    const apkPct = apkTotal > 0 ? Math.round((apkLatest / apkTotal) * 100) : 0;
    if (kpiApkAdoption) kpiApkAdoption.textContent = `${apkPct}%`;
    if (kpiApkSub) kpiApkSub.textContent = `${apkLatest} su ${apkTotal} utenti APK`;

    // Render Barra Segmentata e Legenda
    if (stackedBar && stackedLegend) {
        stackedBar.innerHTML = '';
        stackedLegend.innerHTML = '';

        versionList.forEach((item, idx) => {
            const color = ROLLOUT_COLOR_PALETTE[idx % ROLLOUT_COLOR_PALETTE.length];
            const seg = document.createElement('div');
            seg.style.width = `${item.pct}%`;
            seg.style.background = color.bg;
            seg.title = `${item.version}: ${item.total} utenti (${item.pct}%)`;
            stackedBar.appendChild(seg);

            const legItem = document.createElement('span');
            legItem.innerHTML = `<span class="admin-pallino" style="background: ${color.hex};"></span> <strong>${item.version}</strong>: ${item.pct}% (${item.total})`;
            stackedLegend.appendChild(legItem);
        });
    }

    // Render Elenco Dettagliato Card Versioni
    if (breakdownList) {
        breakdownList.innerHTML = '';
        versionList.forEach((item, idx) => {
            const color = ROLLOUT_COLOR_PALETTE[idx % ROLLOUT_COLOR_PALETTE.length];
            const card = document.createElement('div');
            card.className = 'rollout-scheda';

            const badgeHtml = item.isLatest
                ? `<span class="admin-stato ok">★ ULTIMA (ROLLOUT)</span>`
                : (idx === 1 
                    ? `<span class="admin-stato att">PRECEDENTE</span>` 
                    : '');

            card.innerHTML = `
                <div class="rollout-scheda-testa">
                    <div class="admin-riga">
                        <span class="rollout-scheda-versione">${item.version}</span>
                        ${badgeHtml}
                    </div>
                    <div class="version-stat-count">
                        <span class="rollout-scheda-numero" style="color: ${color.hex};">${item.total}</span>
                        <span class="admin-testo-sub admin-piccolo">studenti (${item.pct}%)</span>
                    </div>
                </div>

                <div class="rollout-scheda-meta">
                    <div class="rollout-piattaforme">
                        <span class="admin-apk">🤖 APK: <strong>${item.apk}</strong></span>
                        <span class="admin-pwa">📲 PWA: <strong>${item.pwa}</strong></span>
                        <span class="admin-web">🌐 Web: <strong>${item.web}</strong></span>
                    </div>
                    <span>Quota: ${item.pct}%</span>
                </div>

                <div class="version-progress-container sottile">
                    <div class="version-progress-bar" style="width: ${item.pct}%; background: ${color.bg};"></div>
                </div>
            `;
            breakdownList.appendChild(card);
        });
    }
}


// ============================================================
// GESTIONE ESPORTAZIONE ED ELIMINAZIONE TELEMETRIA
// ============================================================

// DOM Modale Esportazione
const exportStatsModal = document.getElementById('export-stats-modal');
const openExportModalBtn = document.getElementById('open-export-modal-btn');
const closeExportModalBtn = document.getElementById('close-export-modal');
const exportStatsForm = document.getElementById('export-stats-form');
const exportRangeType = document.getElementById('export-range-type');
const exportCustomDates = document.getElementById('export-custom-dates');
const exportDateFrom = document.getElementById('export-date-from');
const exportDateTo = document.getElementById('export-date-to');
const exportFormatType = document.getElementById('export-format-type');
const exportConfirmBtn = document.getElementById('export-confirm-btn');

// Apertura / Chiusura Modal Esportazione
if (openExportModalBtn && exportStatsModal) {
    openExportModalBtn.addEventListener('click', () => {
        exportStatsModal.classList.remove('hidden');
    });
}
if (closeExportModalBtn && exportStatsModal) {
    closeExportModalBtn.addEventListener('click', () => {
        exportStatsModal.classList.add('hidden');
    });
}

// Toggle date personalizzate esportazione
if (exportRangeType && exportCustomDates) {
    exportRangeType.addEventListener('change', () => {
        if (exportRangeType.value === 'custom') {
            exportCustomDates.classList.remove('hidden');
        } else {
            exportCustomDates.classList.add('hidden');
        }
    });
}

// Esecuzione Esportazione (CSV o JSON)
if (exportStatsForm) {
    exportStatsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (exportConfirmBtn) exportConfirmBtn.disabled = true;

        try {
            const range = exportRangeType.value;
            const format = exportFormatType.value;

            // Costruiamo la query per recuperare lo storico da Supabase
            let query = _supabase.from('v_utenti_unici_giornalieri').select('*').order('data', { ascending: false });

            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const formatIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

            if (range === 'custom') {
                const from = exportDateFrom.value;
                const to = exportDateTo.value;
                if (!from || !to) {
                    showToast('Seleziona entrambe le date per l\'intervallo', 'error');
                    if (exportConfirmBtn) exportConfirmBtn.disabled = false;
                    return;
                }
                query = query.gte('data', from).lte('data', to);
            } else if (range !== 'all') {
                // "Ultimi 7 giorni" = oggi e i 6 giorni prima
                const days = parseInt(range, 10);
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - (days - 1));
                query = query.gte('data', formatIso(startDate));
            }

            let { data, error } = await query;

            // Fallback su app_accessi se la vista non è presente
            if (error) {
                console.warn('Fallback aggregazione client per export:', error.message);
                const creaRawQuery = () => {
                    let rawQuery = _supabase.from('app_accessi').select('uuid_utente, data, piattaforma');
                    if (range === 'custom') {
                        rawQuery = rawQuery.gte('data', exportDateFrom.value).lte('data', exportDateTo.value);
                    } else if (range !== 'all') {
                        const days = parseInt(range, 10);
                        const startDate = new Date();
                        startDate.setDate(startDate.getDate() - (days - 1));
                        rawQuery = rawQuery.gte('data', formatIso(startDate));
                    }
                    return rawQuery;
                };
                const { data: raw, error: rawErr } = await scaricaTutteLeRighe(creaRawQuery);
                if (rawErr) throw rawErr;

                const grouped = {};
                (raw || []).forEach(row => {
                    const d = row.data;
                    if (!grouped[d]) grouped[d] = { data: d, all: new Set(), apk: new Set(), pwa: new Set(), web: new Set() };
                    grouped[d].all.add(row.uuid_utente);
                    if (row.piattaforma === 'android') grouped[d].apk.add(row.uuid_utente);
                    else if (row.piattaforma === 'pwa') grouped[d].pwa.add(row.uuid_utente);
                    else grouped[d].web.add(row.uuid_utente);
                });
                data = Object.keys(grouped).sort().reverse().map(d => ({
                    data: d,
                    utenti_unici_totali: grouped[d].all.size,
                    utenti_apk: grouped[d].apk.size,
                    utenti_pwa: grouped[d].pwa.size,
                    utenti_web_browser: grouped[d].web.size
                }));
            }

            if (!data || data.length === 0) {
                showToast('Nessun dato trovato per l\'intervallo selezionato', 'error');
                if (exportConfirmBtn) exportConfirmBtn.disabled = false;
                return;
            }

            // Generazione file
            let blob;
            let filename;
            const timestamp = formatIso(new Date());

            if (format === 'json') {
                blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
                filename = `quickcheck_telemetria_${timestamp}.json`;
            } else {
                // Separatore: ';' per Excel (standard locale italiano/europeo) oppure ',' per CSV standard
                const separator = format === 'csv_comma' ? ',' : ';';
                const header = ['Data', 'Utenti Unici Totali', 'APK Android', 'PWA Standalone', 'Web Browser'].join(separator) + '\r\n';
                const rows = data.map(r => [
                    r.data,
                    r.utenti_unici_totali,
                    r.utenti_apk,
                    r.utenti_pwa,
                    r.utenti_web_browser
                ].join(separator)).join('\r\n');

                // \uFEFF (BOM UTF-8) garantisce che Excel riconosca immediatamente il set di caratteri e le colonne
                blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
                filename = `quickcheck_telemetria_${timestamp}.csv`;
            }

            // Trigger download nel browser
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            exportStatsModal.classList.add('hidden');
            showToast('Esportazione completata con successo!', 'success');
        } catch (err) {
            console.error('Errore export:', err);
            showToast(`Errore durante l'esportazione: ${err.message}`, 'error');
        } finally {
            if (exportConfirmBtn) exportConfirmBtn.disabled = false;
        }
    });
}

// DOM Modale Eliminazione
const deleteStatsModal = document.getElementById('delete-stats-modal');
const openDeleteModalBtn = document.getElementById('open-delete-modal-btn');
const closeDeleteModalBtn = document.getElementById('close-delete-modal');
const deleteStatsForm = document.getElementById('delete-stats-form');
const deleteRangeType = document.getElementById('delete-range-type');
const deleteCustomDates = document.getElementById('delete-custom-dates');
const deleteDateFrom = document.getElementById('delete-date-from');
const deleteDateTo = document.getElementById('delete-date-to');
const deleteAllWarning = document.getElementById('delete-all-warning');
const deleteConfirmText = document.getElementById('delete-confirm-text');
const deleteConfirmBtn = document.getElementById('delete-confirm-btn');

// Apertura / Chiusura Modal Eliminazione
if (openDeleteModalBtn && deleteStatsModal) {
    openDeleteModalBtn.addEventListener('click', () => {
        deleteStatsModal.classList.remove('hidden');
    });
}
if (closeDeleteModalBtn && deleteStatsModal) {
    closeDeleteModalBtn.addEventListener('click', () => {
        deleteStatsModal.classList.add('hidden');
    });
}

// Gestione visualizzazione campi dinamici modale eliminazione
if (deleteRangeType) {
    deleteRangeType.addEventListener('change', () => {
        const val = deleteRangeType.value;
        if (val === 'custom') {
            if (deleteCustomDates) deleteCustomDates.classList.remove('hidden');
            if (deleteAllWarning) deleteAllWarning.classList.add('hidden');
        } else if (val === 'all') {
            if (deleteCustomDates) deleteCustomDates.classList.add('hidden');
            if (deleteAllWarning) deleteAllWarning.classList.remove('hidden');
        } else {
            if (deleteCustomDates) deleteCustomDates.classList.add('hidden');
            if (deleteAllWarning) deleteAllWarning.classList.add('hidden');
        }
    });
}

// Esecuzione Eliminazione su Supabase
if (deleteStatsForm) {
    deleteStatsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = deleteRangeType.value;

        // Se è 'all', verifica che l'utente abbia digitato ELIMINA
        if (type === 'all') {
            if (deleteConfirmText.value.trim().toUpperCase() !== 'ELIMINA') {
                showToast('Digita la parola ELIMINA per confermare', 'error');
                return;
            }
        }

        if (deleteConfirmBtn) deleteConfirmBtn.disabled = true;

        try {
            const pad = n => String(n).padStart(2, '0');
            const formatIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            let deleteQuery = _supabase.from('app_accessi').delete();

            if (type === 'older_90') {
                const d = new Date();
                d.setDate(d.getDate() - 90);
                deleteQuery = deleteQuery.lt('data', formatIso(d));
            } else if (type === 'older_30') {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                deleteQuery = deleteQuery.lt('data', formatIso(d));
            } else if (type === 'custom') {
                const from = deleteDateFrom.value;
                const to = deleteDateTo.value;
                if (!from || !to) {
                    showToast('Seleziona entrambe le date per l\'intervallo di eliminazione', 'error');
                    if (deleteConfirmBtn) deleteConfirmBtn.disabled = false;
                    return;
                }
                deleteQuery = deleteQuery.gte('data', from).lte('data', to);
            } else if (type === 'all') {
                // Elimina tutti i record (in Supabase si specifica id != 0)
                deleteQuery = deleteQuery.neq('id', 0);
            }

            const { error } = await deleteQuery;
            if (error) throw error;

            showToast('Dati eliminati con successo!', 'success');
            deleteStatsModal.classList.add('hidden');
            if (deleteConfirmText) deleteConfirmText.value = '';

            // Ricarica la vista e i KPI con l'intervallo attivo
            fetchUserStats(currentStatsRangeDays);
        } catch (err) {
            console.error('Errore durante l\'eliminazione:', err);
            showToast(`Errore: ${err.message}. Verifica la policy DELETE su Supabase.`, 'error');
        } finally {
            if (deleteConfirmBtn) deleteConfirmBtn.disabled = false;
        }
    });
}
