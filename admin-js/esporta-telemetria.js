// Pannello admin - Esportazione avanzata telemetria (Excel .xlsx nativo e Report HTML/PDF A4).
// Zero dipendenze esterne: il pacchetto OpenXML (.xlsx) viene costruito direttamente nel browser
// tramite Uint8Array/DataView (formato ZIP STORE con CRC-32) nel pieno rispetto di CSP e integrità.

(function () {
    'use strict';

    const GIORNI_IT = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const GIORNI_BREVE = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const MESI_IT = [
        '', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    // Sotto questa soglia il primo giorno dello storico viene considerato di attivazione/test nelle medie
    const SOGLIA_ATTIVAZIONE = 10;

    // -------------------------------------------------------------------------
    // UTILITÀ DI FORMATTAZIONE E PARSING DATE (SENZA SPOSTAMENTI DI FUSO ORARIO)
    // -------------------------------------------------------------------------

    function parseDataIso(isoStr) {
        const m = String(isoStr || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return null;
        return {
            year: parseInt(m[1], 10),
            month: parseInt(m[2], 10),
            day: parseInt(m[3], 10),
            iso: `${m[1]}-${m[2]}-${m[3]}`
        };
    }

    // Restituisce indice giorno della settimana con 0 = Lunedì .. 6 = Domenica
    function weekdayLunDom(d) {
        const utc = new Date(Date.UTC(d.year, d.month - 1, d.day));
        return (utc.getUTCDay() + 6) % 7;
    }

    function fmtDataIt(d) {
        const dd = String(d.day).padStart(2, '0');
        const mm = String(d.month).padStart(2, '0');
        return `${dd}/${mm}/${d.year}`;
    }

    function fmtDataBreve(d) {
        return `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}`;
    }

    function fmtInt(n) {
        return Math.round(Number(n) || 0).toLocaleString('it-IT');
    }

    function fmtDec(n, dec = 1) {
        return (Number(n) || 0).toLocaleString('it-IT', {
            minimumFractionDigits: dec,
            maximumFractionDigits: dec
        });
    }

    function fmtPct(ratio) {
        return `${fmtDec((Number(ratio) || 0) * 100, 1)}%`;
    }

    function escapeXml(val) {
        return String(val ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function escapeHtmlText(val) {
        return String(val ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // -------------------------------------------------------------------------
    // CALCOLO STATISTICHE TELEMETRIA
    // -------------------------------------------------------------------------

    /**
     * Normalizza i record di v_utenti_unici_giornalieri / app_accessi e calcola totali,
     * picco, medie feriali/weekend sui giorni completi, riepilogo mensile e profilo settimanale.
     */
    function calcolaStatisticheTelemetria(records, dataExportIso = null) {
        const puliti = [];
        for (const row of (records || [])) {
            const parsed = parseDataIso(row.data);
            if (!parsed) continue;
            const tot = Math.max(0, Number(row.utenti_unici_totali) || 0);
            const apk = Math.max(0, Number(row.utenti_apk) || 0);
            const pwa = Math.max(0, Number(row.utenti_pwa) || 0);
            const web = Math.max(0, Number(row.utenti_web_browser) || 0);
            const wd = weekdayLunDom(parsed);
            const webPwa = pwa + web;
            puliti.push({
                ...parsed,
                totale: tot,
                apk,
                pwa,
                web,
                webPwa,
                quotaWebPwa: tot > 0 ? webPwa / tot : 0,
                wd,
                giornoIt: GIORNI_IT[wd],
                giornoBreve: GIORNI_BREVE[wd],
                weekend: wd >= 5
            });
        }

        if (puliti.length === 0) {
            throw new Error('Nessun record valido da esportare.');
        }

        // Ordine cronologico crescente per grafici e medie
        puliti.sort((a, b) => a.iso.localeCompare(b.iso));
        const primaIso = puliti[0].iso;
        const ultimaIso = puliti[puliti.length - 1].iso;

        const righe = puliti.map((r) => {
            const attivazione = puliti.length >= 3 && r.iso === primaIso && r.totale < SOGLIA_ATTIVAZIONE;
            // Se esportato oggi, la giornata odierna e' in corso e falserebbe la media al ribasso
            const parziale = puliti.length >= 2 && Boolean(dataExportIso) && r.iso === ultimaIso && r.iso === dataExportIso;
            return {
                ...r,
                attivazione,
                parziale,
                completo: !attivazione && !parziale
            };
        });

        let sommaTot = 0;
        let sommaApk = 0;
        let sommaPwa = 0;
        let sommaWeb = 0;
        let picco = righe[0];

        for (const r of righe) {
            sommaTot += r.totale;
            sommaApk += r.apk;
            sommaPwa += r.pwa;
            sommaWeb += r.web;
            if (r.totale > picco.totale) picco = r;
        }
        const sommaWebPwa = sommaPwa + sommaWeb;

        const completi = righe.filter((r) => r.completo);
        const baseMedie = completi.length > 0 ? completi : righe;
        const feriali = baseMedie.filter((r) => !r.weekend);
        const weekend = baseMedie.filter((r) => r.weekend);

        const mediaGlobale = baseMedie.reduce((s, r) => s + r.totale, 0) / baseMedie.length;
        const mediaFeriali = feriali.length > 0
            ? feriali.reduce((s, r) => s + r.totale, 0) / feriali.length
            : mediaGlobale;
        const mediaFerialiWebPwa = feriali.length > 0
            ? feriali.reduce((s, r) => s + r.webPwa, 0) / feriali.length
            : 0;
        const mediaWeekend = weekend.length > 0
            ? weekend.reduce((s, r) => s + r.totale, 0) / weekend.length
            : 0;

        // Raggruppamento mensile in ordine cronologico
        const mesiMap = new Map();
        for (const r of righe) {
            const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
            if (!mesiMap.has(key)) mesiMap.set(key, []);
            mesiMap.get(key).push(r);
        }

        const mensili = [];
        for (const [, items] of [...mesiMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
            const comp = items.filter((x) => x.completo);
            const compM = comp.length > 0 ? comp : items;
            const ferM = compM.filter((x) => !x.weekend);
            const totM = items.reduce((s, x) => s + x.totale, 0);
            const apkM = items.reduce((s, x) => s + x.apk, 0);
            const pwaM = items.reduce((s, x) => s + x.pwa, 0);
            const webM = items.reduce((s, x) => s + x.web, 0);
            let piccoM = items[0];
            for (const x of items) {
                if (x.totale > piccoM.totale) piccoM = x;
            }
            mensili.push({
                year: items[0].year,
                month: items[0].month,
                etichetta: `${MESI_IT[items[0].month]} ${items[0].year}`,
                giorni: items.length,
                giorniCompleti: compM.length,
                totale: totM,
                apk: apkM,
                pwa: pwaM,
                web: webM,
                webPwa: pwaM + webM,
                quotaWebPwa: totM > 0 ? (pwaM + webM) / totM : 0,
                mediaFeriali: ferM.length > 0 ? ferM.reduce((s, x) => s + x.totale, 0) / ferM.length : 0,
                picco: piccoM
            });
        }

        // Profilo settimanale medio Lunedì -> Domenica sui giorni completi
        const settimanale = [];
        for (let wd = 0; wd < 7; wd++) {
            const gruppo = baseMedie.filter((r) => r.wd === wd);
            const denom = gruppo.length || 1;
            settimanale.push({
                nome: GIORNI_IT[wd],
                breve: GIORNI_BREVE[wd],
                campioni: gruppo.length,
                mediaTot: gruppo.length > 0 ? gruppo.reduce((s, r) => s + r.totale, 0) / denom : 0,
                mediaApk: gruppo.length > 0 ? gruppo.reduce((s, r) => s + r.apk, 0) / denom : 0,
                mediaPwa: gruppo.length > 0 ? gruppo.reduce((s, r) => s + r.pwa, 0) / denom : 0,
                mediaWeb: gruppo.length > 0 ? gruppo.reduce((s, r) => s + r.web, 0) / denom : 0
            });
        }

        const esclusi = righe.filter((r) => !r.completo);

        return {
            righe,
            primaData: righe[0],
            ultimaData: righe[righe.length - 1],
            numGiorni: righe.length,
            numCompleti: completi.length,
            numFeriali: feriali.length,
            numWeekend: weekend.length,
            sommaTot,
            sommaApk,
            sommaPwa,
            sommaWeb,
            sommaWebPwa,
            quotaApk: sommaTot > 0 ? sommaApk / sommaTot : 0,
            quotaPwa: sommaTot > 0 ? sommaPwa / sommaTot : 0,
            quotaWeb: sommaTot > 0 ? sommaWeb / sommaTot : 0,
            quotaWebPwa: sommaTot > 0 ? sommaWebPwa / sommaTot : 0,
            picco,
            mediaGlobale,
            mediaFeriali,
            mediaFerialiWebPwa,
            mediaWeekend,
            mensili,
            settimanale,
            esclusi
        };
    }

    // -------------------------------------------------------------------------
    // REPORT HTML / PDF A4 (SVG VETTORIALI ADATTIVI)
    // -------------------------------------------------------------------------

    function svgAndamentoGiornaliero(stats) {
        const righe = stats.righe;
        const w = 760;
        const h = 222;
        const ml = 44;
        const mr = 14;
        const mt = 28;
        const mb = 34;
        const pw = w - ml - mr;
        const ph = h - mt - mb;

        const picco = stats.picco;
        const yMaxRaw = Math.max(40, picco.totale * 1.1);
        const stepGrid = yMaxRaw > 800 ? 400 : (yMaxRaw > 200 ? 100 : 20);
        const yMax = Math.max(stepGrid * 4, Math.ceil(yMaxRaw / stepGrid) * stepGrid);

        const n = righe.length;
        const step = pw / Math.max(n, 1);
        const barW = Math.min(44, Math.max(4.2, step * 0.72));

        const parts = [
            `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block;overflow:visible" role="img" aria-label="Andamento giornaliero accessi">`
        ];

        for (let k = 0; k <= 4; k++) {
            const val = Math.round((yMax * k) / 4);
            const y = mt + ph - (val / yMax) * ph;
            const col = val === 0 ? '#CBD5E1' : '#E2E8F0';
            const dash = val === 0 ? '' : ' stroke-dasharray="3,3"';
            parts.push(`<line x1="${ml}" y1="${y.toFixed(1)}" x2="${w - mr}" y2="${y.toFixed(1)}" stroke="${col}" stroke-width="1"${dash}/>`);
            parts.push(`<text x="${ml - 7}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#64748B">${fmtInt(val)}</text>`);
        }

        // Fasce tenui sui fine settimana
        for (let i = 0; i < n; i++) {
            if (righe[i].weekend) {
                const x = ml + i * step;
                parts.push(`<rect x="${x.toFixed(1)}" y="${mt}" width="${step.toFixed(1)}" height="${ph}" fill="#F1F5F9" opacity="0.8"/>`);
            }
        }

        // Passo etichette asse X proporzionato al numero di giorni esportati
        const ogniQuanti = n <= 10 ? 1 : (n <= 31 ? Math.ceil(n / 7) : 0);

        for (let i = 0; i < n; i++) {
            const r = righe[i];
            const cx = ml + i * step + step / 2;
            const x = cx - barW / 2;

            const hApk = (r.apk / yMax) * ph;
            const hPwa = (r.pwa / yMax) * ph;
            const hWeb = (r.web / yMax) * ph;

            const yApk = mt + ph - hApk;
            const yPwa = yApk - hPwa;
            const yWeb = yPwa - hWeb;
            const op = (r.parziale || r.attivazione) ? '0.45' : '1';

            if (hApk > 0) parts.push(`<rect x="${x.toFixed(2)}" y="${yApk.toFixed(2)}" width="${barW.toFixed(2)}" height="${hApk.toFixed(2)}" fill="#16A34A" opacity="${op}"/>`);
            if (hPwa > 0) parts.push(`<rect x="${x.toFixed(2)}" y="${yPwa.toFixed(2)}" width="${barW.toFixed(2)}" height="${hPwa.toFixed(2)}" fill="#E5A93B" opacity="${op}"/>`);
            if (hWeb > 0) parts.push(`<rect x="${x.toFixed(2)}" y="${yWeb.toFixed(2)}" width="${barW.toFixed(2)}" height="${hWeb.toFixed(2)}" rx="1.2" fill="#2563EB" opacity="${op}"/>`);

            const mostraTick = ogniQuanti > 0 ? (i % ogniQuanti === 0 || i === n - 1) : (r.wd === 0);
            if (mostraTick) {
                parts.push(`<line x1="${cx.toFixed(1)}" y1="${mt + ph}" x2="${cx.toFixed(1)}" y2="${mt + ph + 4}" stroke="#94A3B8" stroke-width="1"/>`);
                parts.push(`<text x="${cx.toFixed(1)}" y="${mt + ph + 15}" text-anchor="middle" font-size="9" fill="#475569">${fmtDataBreve(r)}</text>`);
            }

            if (r.iso === picco.iso) {
                const badgeW = 98;
                const badgeX = Math.max(ml + badgeW / 2, Math.min(w - mr - badgeW / 2, cx));
                const boxY = Math.max(2, yWeb - 23);
                parts.push(`<circle cx="${cx.toFixed(1)}" cy="${(yWeb - 4).toFixed(1)}" r="2.6" fill="#B45309"/>`);
                parts.push(`<rect x="${(badgeX - badgeW / 2).toFixed(1)}" y="${boxY.toFixed(1)}" width="${badgeW}" height="16" rx="4" fill="#1A1D24"/>`);
                parts.push(`<text x="${badgeX.toFixed(1)}" y="${(boxY + 11).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#FACC15">Picco: ${fmtInt(picco.totale)} (${fmtDataBreve(picco)})</text>`);
            }
        }

        if (stats.mediaFeriali > 0) {
            const yMed = mt + ph - (stats.mediaFeriali / yMax) * ph;
            parts.push(`<line x1="${ml}" y1="${yMed.toFixed(1)}" x2="${w - mr}" y2="${yMed.toFixed(1)}" stroke="#0F172A" stroke-width="1.2" stroke-dasharray="5,4"/>`);
            parts.push(`<rect x="${w - mr - 148}" y="${(yMed - 16).toFixed(1)}" width="146" height="14" rx="3" fill="#FFFFFF" opacity="0.92"/>`);
            parts.push(`<text x="${w - mr - 4}" y="${(yMed - 6).toFixed(1)}" text-anchor="end" font-size="8.5" font-weight="700" fill="#0F172A">Media Lun–Ven: ${fmtInt(stats.mediaFeriali)}/gg</text>`);
        }

        parts.push('</svg>');
        return parts.join('\n');
    }

    function svgCiambellaPiattaforme(stats) {
        const raggio = 52;
        const circ = 2 * Math.PI * raggio;
        const segmenti = [
            ['PWA Standalone', stats.quotaPwa, stats.sommaPwa, '#E5A93B'],
            ['Web Browser', stats.quotaWeb, stats.sommaWeb, '#2563EB'],
            ['APK Android', stats.quotaApk, stats.sommaApk, '#16A34A']
        ];

        let offset = 0;
        const cerchi = segmenti.map(([, quota, , col]) => {
            const lung = quota * circ;
            const el = `<circle cx="72" cy="72" r="${raggio}" fill="none" stroke="${col}" stroke-width="20" stroke-dasharray="${lung.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"/>`;
            offset += lung;
            return el;
        }).join('');

        const legenda = segmenti.map(([nome, quota, val, col]) => `
            <div class="donut-row">
              <span class="dot" style="background:${col}"></span>
              <span class="donut-name">${escapeHtmlText(nome)}</span>
              <span class="donut-val">${fmtInt(val)}</span>
              <span class="donut-pct">${fmtPct(quota)}</span>
            </div>`).join('');

        return `
        <div class="donut-wrap">
          <svg viewBox="0 0 144 144" width="136" height="136" style="flex-shrink:0" role="img" aria-label="Ripartizione piattaforme">
            <g transform="rotate(-90 72 72)">${cerchi}</g>
            <text x="72" y="69" text-anchor="middle" font-size="18" font-weight="800" fill="#1A1D24">${fmtPct(stats.quotaWebPwa)}</text>
            <text x="72" y="83" text-anchor="middle" font-size="8.5" font-weight="600" fill="#64748B">WEB + PWA</text>
          </svg>
          <div class="donut-legend">
            ${legenda}
            <div class="donut-callout">
              <strong>${fmtInt(stats.sommaWebPwa)}</strong> accessi Web/PWA su <strong>${fmtInt(stats.sommaTot)}</strong> totali
            </div>
          </div>
        </div>`;
    }

    function svgProfiloSettimanale(stats) {
        const w = 340;
        const h = 146;
        const ml = 8;
        const mr = 8;
        const mt = 18;
        const mb = 22;
        const pw = w - ml - mr;
        const ph = h - mt - mb;
        const giorni = stats.settimanale;
        const yMax = Math.max(10, ...giorni.map((g) => g.mediaTot)) * 1.15;
        const step = pw / 7;
        const barW = 24;

        const parts = [
            `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block" role="img" aria-label="Media settimanale">`,
            `<line x1="${ml}" y1="${mt + ph}" x2="${w - mr}" y2="${mt + ph}" stroke="#CBD5E1" stroke-width="1"/>`
        ];

        giorni.forEach((g, i) => {
            const cx = ml + i * step + step / 2;
            const x = cx - barW / 2;
            const hApk = (g.mediaApk / yMax) * ph;
            const hPwa = (g.mediaPwa / yMax) * ph;
            const hWeb = (g.mediaWeb / yMax) * ph;
            const yApk = mt + ph - hApk;
            const yPwa = yApk - hPwa;
            const yWeb = yPwa - hWeb;

            if (g.campioni > 0) {
                parts.push(`<rect x="${x.toFixed(1)}" y="${yApk.toFixed(1)}" width="${barW}" height="${hApk.toFixed(1)}" fill="#16A34A"/>`);
                parts.push(`<rect x="${x.toFixed(1)}" y="${yPwa.toFixed(1)}" width="${barW}" height="${hPwa.toFixed(1)}" fill="#E5A93B"/>`);
                parts.push(`<rect x="${x.toFixed(1)}" y="${yWeb.toFixed(1)}" width="${barW}" height="${hWeb.toFixed(1)}" rx="1.5" fill="#2563EB"/>`);
                parts.push(`<text x="${cx.toFixed(1)}" y="${(yWeb - 4).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#1E293B">${fmtInt(g.mediaTot)}</text>`);
            } else {
                parts.push(`<text x="${cx.toFixed(1)}" y="${mt + ph - 5}" text-anchor="middle" font-size="8.5" fill="#94A3B8">—</text>`);
            }
            const colG = i >= 5 ? '#94A3B8' : '#334155';
            parts.push(`<text x="${cx.toFixed(1)}" y="${mt + ph + 14}" text-anchor="middle" font-size="9.5" font-weight="600" fill="${colG}">${g.breve}</text>`);
        });

        parts.push('</svg>');
        return parts.join('\n');
    }

    /**
     * Genera la pagina HTML A4 pronta per stampa / Salva come PDF dal browser.
     */
    function generaReportHtmlTelemetria(records, dataExportIso = null, logoDataUrl = '') {
        const stats = calcolaStatisticheTelemetria(records, dataExportIso);
        const picco = stats.picco;
        const parsedExport = parseDataIso(dataExportIso) || stats.ultimaData;

        const logoHtml = logoDataUrl
            ? `<img src="${escapeXml(logoDataUrl)}" alt="Logo QuickCheck" class="logo"/>`
            : '<div class="logo-fallback">QC</div>';

        const righeMensiliHtml = stats.mensili.map((m) => {
            const pctBar = (m.quotaWebPwa * 100).toFixed(1);
            const ggTxt = m.giorni !== m.giorniCompleti ? `${m.giorni} gg (${m.giorniCompleti} compl.)` : `${m.giorni} gg`;
            return `
            <tr>
              <td><strong>${escapeHtmlText(m.etichetta)}</strong></td>
              <td class="num">${escapeHtmlText(ggTxt)}</td>
              <td class="num"><strong>${fmtInt(m.totale)}</strong></td>
              <td class="num">${m.mediaFeriali > 0 ? fmtInt(m.mediaFeriali) : '—'}</td>
              <td class="num">${fmtInt(m.picco.totale)} <span class="muted">(${fmtDataBreve(m.picco)})</span></td>
              <td class="num">${fmtInt(m.apk)}</td>
              <td class="num">${fmtInt(m.pwa)}</td>
              <td class="num">${fmtInt(m.web)}</td>
              <td class="num">
                <div class="pct-cell">
                  <span><strong>${fmtPct(m.quotaWebPwa)}</strong></span>
                  <span class="mini-track"><span class="mini-fill" style="width:${pctBar}%"></span></span>
                </div>
              </td>
            </tr>`;
        }).join('');

        const righeStoricoHtml = [...stats.righe].reverse().map((r) => {
            const cls = [];
            if (r.iso === picco.iso) cls.push('row-peak');
            else if (r.weekend) cls.push('row-weekend');

            let badge = '';
            if (r.iso === picco.iso) badge = '<span class="tag tag-peak">Picco</span>';
            else if (r.parziale) badge = '<span class="tag tag-warn">Parziale</span>';
            else if (r.attivazione) badge = '<span class="tag tag-warn">Avvio</span>';

            const pApk = r.totale > 0 ? (r.apk / r.totale) * 100 : 0;
            const pPwa = r.totale > 0 ? (r.pwa / r.totale) * 100 : 0;
            const pWeb = r.totale > 0 ? (r.web / r.totale) * 100 : 0;

            return `
            <tr class="${cls.join(' ')}">
              <td><strong>${r.giornoBreve}</strong> ${fmtDataIt(r)} ${badge}</td>
              <td class="num"><strong>${fmtInt(r.totale)}</strong></td>
              <td class="num c-apk">${fmtInt(r.apk)}</td>
              <td class="num c-pwa">${fmtInt(r.pwa)}</td>
              <td class="num c-web">${fmtInt(r.web)}</td>
              <td class="num">${fmtInt(r.webPwa)}</td>
              <td class="num"><strong>${fmtPct(r.quotaWebPwa)}</strong></td>
              <td>
                <div class="stack-bar">
                  <span style="width:${pApk.toFixed(1)}%;background:#16A34A"></span>
                  <span style="width:${pPwa.toFixed(1)}%;background:#E5A93B"></span>
                  <span style="width:${pWeb.toFixed(1)}%;background:#2563EB"></span>
                </div>
              </td>
            </tr>`;
        }).join('');

        const esclusiTxt = stats.esclusi
            .map((r) => `${fmtDataIt(r)} (${r.attivazione ? `avvio: ${r.totale} accesso` : 'giornata parziale al momento export'})`)
            .join(', ');
        const notaEsclusione = esclusiTxt ? ` Le medie giornaliere escludono ${esclusiTxt}.` : '';

        return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>QuickCheck UniSalento — Report Telemetria (${fmtDataIt(stats.primaData)} – ${fmtDataIt(stats.ultimaData)})</title>
<style>
  :root {
    --bg: #F3F5F8; --card: #FFFFFF; --ink: #1A1D24; --muted: #64748B;
    --line: #E2E8F0; --gold: #D4A024; --apk: #16A34A; --pwa: #E5A93B; --web: #2563EB;
  }
  * { box-sizing: border-box; }
  @page { size: A4 portrait; margin: 10mm 11mm; }
  body {
    margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Arial, sans-serif;
    color: var(--ink); background: var(--bg); -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .toolbar {
    position: sticky; top: 0; z-index: 10; background: #1A1D24; color: #fff;
    padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,.15);
  }
  .toolbar span { font-size: 13px; color: #CBD5E1; }
  .toolbar button {
    background: var(--gold); color: #1A1D24; border: none; border-radius: 8px;
    padding: 8px 16px; font-weight: 700; font-size: 13px; cursor: pointer;
  }
  .toolbar button:hover { filter: brightness(1.06); }
  .sheet {
    max-width: 210mm; margin: 18px auto; background: var(--card); padding: 20px 24px;
    border-radius: 12px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08);
  }
  .page-break { break-before: page; page-break-before: always; }
  @media print {
    body { background: #FFFFFF; }
    .toolbar { display: none; }
    .sheet { max-width: none; margin: 0; padding: 0; border-radius: 0; box-shadow: none; }
  }
  .hero {
    display: flex; justify-content: space-between; align-items: center; gap: 14px;
    border-bottom: 2.5px solid var(--gold); padding-bottom: 12px; margin-bottom: 14px;
  }
  .hero-left { display: flex; align-items: center; gap: 12px; }
  .logo { width: 46px; height: 46px; border-radius: 11px; object-fit: cover; }
  .logo-fallback {
    width: 46px; height: 46px; border-radius: 11px; background: #1A1D24; color: var(--gold);
    display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;
  }
  h1 { margin: 0; font-size: 19px; letter-spacing: -0.2px; }
  .subtitle { margin: 2px 0 0; font-size: 11.5px; color: var(--muted); }
  .privacy-pill {
    background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 10.5px;
    font-weight: 700; padding: 6px 10px; border-radius: 999px; white-space: nowrap;
  }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
  .kpi { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; background: #FAFBFC; }
  .kpi.highlight { background: #FFFBEB; border-color: #FDE68A; }
  .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted); }
  .kpi-value { font-size: 22px; font-weight: 800; margin: 3px 0 2px; color: var(--ink); font-variant-numeric: tabular-nums; }
  .kpi-sub { font-size: 10px; color: var(--muted); line-height: 1.3; }
  .box { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; background: #FFFFFF; }
  .box-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
  .box-title { font-size: 12px; font-weight: 800; color: var(--ink); }
  .legend-inline { display: flex; align-items: center; gap: 12px; font-size: 10px; color: var(--muted); }
  .legend-inline span { display: inline-flex; align-items: center; gap: 4px; }
  .dot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; flex-shrink: 0; }
  .two-col { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 10px; margin-bottom: 12px; }
  .donut-wrap { display: flex; align-items: center; gap: 12px; padding-top: 2px; }
  .donut-legend { flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .donut-row { display: grid; grid-template-columns: 10px 1fr auto auto; align-items: center; gap: 6px; font-size: 10.5px; }
  .donut-name { font-weight: 600; }
  .donut-val { font-variant-numeric: tabular-nums; color: var(--muted); }
  .donut-pct { font-weight: 700; font-variant-numeric: tabular-nums; min-width: 40px; text-align: right; }
  .donut-callout {
    margin-top: 4px; padding: 5px 8px; background: #F8FAFC;
    border-left: 3px solid var(--gold); border-radius: 4px; font-size: 10px; color: #334155;
  }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1A1D24; color: #FFFFFF; font-size: 9.5px; font-weight: 700; text-align: left; padding: 5px 7px; }
  th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td { font-size: 10px; padding: 4.5px 7px; border-bottom: 1px solid var(--line); }
  tbody tr:nth-child(even) { background: #F8FAFC; }
  .muted { color: var(--muted); font-size: 9.2px; }
  .pct-cell { display: inline-flex; align-items: center; gap: 6px; }
  .mini-track { width: 44px; height: 6px; background: #E2E8F0; border-radius: 99px; overflow: hidden; display: inline-block; }
  .mini-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--pwa), var(--web)); }
  .note-box {
    background: #F8FAFC; border: 1px solid var(--line); border-left: 4px solid #1A1D24;
    border-radius: 8px; padding: 8px 12px; font-size: 10px; line-height: 1.45; color: #334155;
  }
  .note-box strong { color: var(--ink); }
  .history-head {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 2px solid var(--gold); padding-bottom: 5px; margin-bottom: 6px;
  }
  .history-head h2 { margin: 0; font-size: 14px; }
  .history-table th { padding: 3.5px 6px; font-size: 8.8px; }
  .history-table td { padding: 1.7px 6px; font-size: 8.3px; line-height: 1.15; }
  .history-table tr { break-inside: avoid; }
  .row-peak { background: #FEF3C7 !important; }
  .row-weekend { color: #475569; }
  .c-apk { color: #15803D; } .c-pwa { color: #B45309; } .c-web { color: #1D4ED8; }
  .tag { display: inline-block; font-size: 7.5px; font-weight: 700; padding: 1px 4px; border-radius: 4px; margin-left: 4px; vertical-align: middle; }
  .tag-peak { background: #1A1D24; color: #FACC15; }
  .tag-warn { background: #E2E8F0; color: #334155; }
  .stack-bar { width: 96px; height: 6px; border-radius: 99px; overflow: hidden; display: flex; background: #E2E8F0; margin-left: auto; }
</style>
</head>
<body>
  <div class="toolbar">
    <span><strong>QuickCheck UniSalento</strong> — Anteprima Report A4 (${stats.numGiorni} giorni)</span>
    <button onclick="window.print()">Stampa / Salva come PDF</button>
  </div>
  <div class="sheet">
    <header class="hero">
      <div class="hero-left">
        ${logoHtml}
        <div>
          <h1>QuickCheck UniSalento — Statistiche di Utilizzo</h1>
          <p class="subtitle">Periodo rilevato: <strong>${fmtDataIt(stats.primaData)} – ${fmtDataIt(stats.ultimaData)}</strong> (${stats.numGiorni} giorni) · Esportazione del ${fmtDataIt(parsedExport)}</p>
        </div>
      </div>
      <div class="privacy-pill">Telemetria 100% Anonima · Zero dati personali</div>
    </header>

    <section class="kpi-grid">
      <div class="kpi highlight">
        <div class="kpi-label">Picco Giornaliero</div>
        <div class="kpi-value">${fmtInt(picco.totale)}</div>
        <div class="kpi-sub"><strong>${picco.giornoBreve} ${fmtDataIt(picco)}</strong><br/>${fmtInt(picco.apk)} APK · ${fmtInt(picco.pwa)} PWA · ${fmtInt(picco.web)} Web</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Media Feriale (Lun–Ven)</div>
        <div class="kpi-value">${fmtInt(stats.mediaFeriali)}</div>
        <div class="kpi-sub">utenti unici/giorno (${stats.numFeriali} giorni)<br/>di cui <strong>${fmtInt(stats.mediaFerialiWebPwa)}</strong> da Web/PWA</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Accessi Giornalieri Totali</div>
        <div class="kpi-value">${fmtInt(stats.sommaTot)}</div>
        <div class="kpi-sub">1 conteggio al giorno per dispositivo<br/>Media weekend: ${stats.numWeekend > 0 ? `${fmtInt(stats.mediaWeekend)}/gg` : '—'}</div>
      </div>
      <div class="kpi highlight">
        <div class="kpi-label">Quota Web App &amp; PWA</div>
        <div class="kpi-value">${fmtPct(stats.quotaWebPwa)}</div>
        <div class="kpi-sub">iPhone, iPad, Mac, PC e Android web<br/><strong>${fmtInt(stats.sommaWebPwa)} accessi</strong></div>
      </div>
    </section>

    <section class="box">
      <div class="box-head">
        <span class="box-title">Andamento Giornaliero per Piattaforma (${fmtDataIt(stats.primaData)} – ${fmtDataIt(stats.ultimaData)})</span>
        <div class="legend-inline">
          <span><i class="dot" style="background:var(--apk)"></i> APK Android</span>
          <span><i class="dot" style="background:var(--pwa)"></i> PWA Standalone</span>
          <span><i class="dot" style="background:var(--web)"></i> Web Browser</span>
        </div>
      </div>
      ${svgAndamentoGiornaliero(stats)}
    </section>

    <section class="two-col">
      <div class="box" style="margin-bottom:0">
        <div class="box-head"><span class="box-title">Ripartizione Complessiva Piattaforme</span></div>
        ${svgCiambellaPiattaforme(stats)}
      </div>
      <div class="box" style="margin-bottom:0">
        <div class="box-head"><span class="box-title">Profilo Medio Settimanale (Lun–Dom)</span></div>
        ${svgProfiloSettimanale(stats)}
      </div>
    </section>

    <section class="box" style="margin-top:12px">
      <div class="box-head">
        <span class="box-title">Riepilogo Mensile</span>
        <span class="muted">Medie feriali calcolate su giorni completi Lun–Ven</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Mese</th>
            <th class="num">Giorni</th>
            <th class="num">Accessi Totali</th>
            <th class="num">Media Lun–Ven</th>
            <th class="num">Picco Giorno</th>
            <th class="num">APK Android</th>
            <th class="num">PWA</th>
            <th class="num">Browser</th>
            <th class="num">Quota Web+PWA</th>
          </tr>
        </thead>
        <tbody>${righeMensiliHtml}</tbody>
      </table>
    </section>

    <div class="note-box">
      <strong>Nota metodologica e privacy:</strong> Ogni dispositivo genera localmente un identificativo pseudocasuale (UUID) ed invia al massimo <strong>1 ping al giorno</strong> solo all'apertura dell'interfaccia (esclusi widget e sincronizzazioni in background). Non vengono mai raccolti nomi, matricole, email o corsi di studio.${escapeHtmlText(notaEsclusione)}
    </div>

    <div class="page-break"></div>
    <div class="history-head">
      <h2>Dettaglio Giornaliero Completo (${stats.numGiorni} giorni)</h2>
      <span class="muted">Ordine cronologico inverso · QuickCheck UniSalento</span>
    </div>
    <table class="history-table">
      <thead>
        <tr>
          <th>Data</th>
          <th class="num">Utenti Unici</th>
          <th class="num">APK Android</th>
          <th class="num">PWA Standalone</th>
          <th class="num">Web Browser</th>
          <th class="num">Tot. Web+PWA</th>
          <th class="num">% Web+PWA</th>
          <th class="num">Distribuzione</th>
        </tr>
      </thead>
      <tbody>${righeStoricoHtml}</tbody>
    </table>
  </div>
</body>
</html>`;
    }

    // -------------------------------------------------------------------------
    // MINI-WRITER ZIP (STORE CON CRC-32) + GENERAZIONE EXCEL OPENXML (.XLSX)
    // -------------------------------------------------------------------------

    const CRC_TABLE = (() => {
        const tbl = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            tbl[i] = c >>> 0;
        }
        return tbl;
    })();

    function calcolaCrc32(bytes) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
            crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    /** Impacchetta un elenco di file `{ name, content }` in un archivio ZIP valido (metodo STORE = 0). */
    function creaZipStore(entries) {
        const encoder = new TextEncoder();
        const now = new Date();
        const dosTime = ((now.getHours() & 0x1F) << 11) | ((now.getMinutes() & 0x3F) << 5) | ((now.getSeconds() >> 1) & 0x1F);
        const dosDate = (((Math.max(now.getFullYear(), 1980) - 1980) & 0x7F) << 9) | (((now.getMonth() + 1) & 0x0F) << 5) | (now.getDate() & 0x1F);

        const localChunks = [];
        const centralChunks = [];
        let offset = 0;
        let cdSize = 0;

        for (const entry of entries) {
            const nameBytes = encoder.encode(entry.name);
            const dataBytes = typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
            const crc = calcolaCrc32(dataBytes);
            const size = dataBytes.length;

            // Local file header (30 byte + nome)
            const lfh = new Uint8Array(30 + nameBytes.length);
            const dvL = new DataView(lfh.buffer);
            dvL.setUint32(0, 0x04034B50, true);
            dvL.setUint16(4, 20, true);
            dvL.setUint16(6, 0x0800, true); // Flag UTF-8 per i nomi file
            dvL.setUint16(8, 0, true);      // STORE
            dvL.setUint16(10, dosTime, true);
            dvL.setUint16(12, dosDate, true);
            dvL.setUint32(14, crc, true);
            dvL.setUint32(18, size, true);
            dvL.setUint32(22, size, true);
            dvL.setUint16(26, nameBytes.length, true);
            dvL.setUint16(28, 0, true);
            lfh.set(nameBytes, 30);

            localChunks.push(lfh, dataBytes);

            // Central directory file header (46 byte + nome)
            const cdh = new Uint8Array(46 + nameBytes.length);
            const dvC = new DataView(cdh.buffer);
            dvC.setUint32(0, 0x02014B50, true);
            dvC.setUint16(4, 20, true);
            dvC.setUint16(6, 20, true);
            dvC.setUint16(8, 0x0800, true);
            dvC.setUint16(10, 0, true);
            dvC.setUint16(12, dosTime, true);
            dvC.setUint16(14, dosDate, true);
            dvC.setUint32(16, crc, true);
            dvC.setUint32(20, size, true);
            dvC.setUint32(24, size, true);
            dvC.setUint16(28, nameBytes.length, true);
            dvC.setUint16(30, 0, true);
            dvC.setUint16(32, 0, true);
            dvC.setUint16(34, 0, true);
            dvC.setUint16(36, 0, true);
            dvC.setUint32(38, 0, true);
            dvC.setUint32(42, offset, true);
            cdh.set(nameBytes, 46);

            centralChunks.push(cdh);
            offset += lfh.length + size;
            cdSize += cdh.length;
        }

        // End of central directory record (22 byte)
        const eocd = new Uint8Array(22);
        const dvE = new DataView(eocd.buffer);
        dvE.setUint32(0, 0x06054B50, true);
        dvE.setUint16(4, 0, true);
        dvE.setUint16(6, 0, true);
        dvE.setUint16(8, entries.length, true);
        dvE.setUint16(10, entries.length, true);
        dvE.setUint32(12, cdSize, true);
        dvE.setUint32(16, offset, true);
        dvE.setUint16(20, 0, true);

        const totalSize = offset + cdSize + eocd.length;
        const out = new Uint8Array(totalSize);
        let pos = 0;
        for (const chunk of localChunks) { out.set(chunk, pos); pos += chunk.length; }
        for (const chunk of centralChunks) { out.set(chunk, pos); pos += chunk.length; }
        out.set(eocd, pos);
        return out;
    }

    // Converte una data nel seriale numerico Excel (sistema 1900, base 30/12/1899)
    function excelSerial(d) {
        return Math.round((Date.UTC(d.year, d.month - 1, d.day) - Date.UTC(1899, 11, 30)) / 86400000);
    }

    function colLettera(idx1) {
        let res = '';
        let n = idx1;
        while (n > 0) {
            const rem = (n - 1) % 26;
            res = String.fromCharCode(65 + rem) + res;
            n = Math.floor((n - 1) / 26);
        }
        return res;
    }

    function cellaStr(col, row, testo, stile = 0) {
        return `<c r="${colLettera(col)}${row}" t="inlineStr" s="${stile}"><is><t xml:space="preserve">${escapeXml(testo)}</t></is></c>`;
    }

    function cellaNum(col, row, valore, stile = 0) {
        return `<c r="${colLettera(col)}${row}" s="${stile}"><v>${valore}</v></c>`;
    }

    // OpenXML richiede formule SENZA "=" iniziale e valori precalcolati coerenti per anteprime rapide
    function cellaFormula(col, row, formula, valorePrecalcolato, stile = 0) {
        const pulita = String(formula).replace(/^=+/, '');
        return `<c r="${colLettera(col)}${row}" s="${stile}"><f>${escapeXml(pulita)}</f><v>${valorePrecalcolato}</v></c>`;
    }

    function stylesXml() {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="4">
    <numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
    <numFmt numFmtId="166" formatCode="0.0%"/>
    <numFmt numFmtId="167" formatCode="#,##0.0"/>
  </numFmts>
  <fonts count="8">
    <font><sz val="11"/><color rgb="FF1E293B"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF1E293B"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="15"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><i/><sz val="10"/><color rgb="FF475569"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF166534"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF9A6B00"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF1D4ED8"/><name val="Calibri"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1A1D24"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEEF2F6"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
  </fills>
  <borders count="4">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF334155"/></left>
      <right style="thin"><color rgb="FF334155"/></right>
      <top style="thin"><color rgb="FF1A1D24"/></top>
      <bottom style="medium"><color rgb="FFD4A024"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FF94A3B8"/></top>
      <bottom style="double"><color rgb="FF1E293B"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="28">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="6" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="6" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="165" fontId="6" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="6" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="5" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="165" fontId="1" fillId="5" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="1" fillId="5" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="167" fontId="1" fillId="5" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="165" fontId="6" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="6" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="7" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
    }

    function sheetStoricoXml(stats) {
        const righeOrd = [...stats.righe].reverse();
        const n = righeOrd.length;
        const ultimaDati = 1 + n;
        const piccoIso = stats.picco.iso;

        const colsXml = `<cols>
    <col min="1" max="1" width="14" customWidth="1"/>
    <col min="2" max="2" width="13" customWidth="1"/>
    <col min="3" max="3" width="20" customWidth="1"/>
    <col min="4" max="4" width="15" customWidth="1"/>
    <col min="5" max="5" width="17" customWidth="1"/>
    <col min="6" max="6" width="15" customWidth="1"/>
    <col min="7" max="7" width="17" customWidth="1"/>
    <col min="8" max="8" width="14" customWidth="1"/>
    <col min="9" max="9" width="26" customWidth="1"/>
  </cols>`;

        const headers = [
            'Data', 'Giorno', 'Utenti Unici Totali', 'APK Android', 'PWA Standalone',
            'Web Browser', 'Totale Web + PWA', '% Web + PWA', 'Note'
        ];
        const rowsXml = [
            `<row r="1" ht="26" customHeight="1">${headers.map((h, i) => cellaStr(i + 1, 1, h, 3)).join('')}</row>`
        ];

        righeOrd.forEach((r, idx0) => {
            const rowNum = 2 + idx0;
            const zebra = rowNum % 2 === 1;
            let sD = 5, sT = 7, sN = 9, sP = 11;
            if (r.iso === piccoIso) { sD = 13; sT = 14; sN = 15; sP = 16; }
            else if (zebra) { sD = 6; sT = 8; sN = 10; sP = 12; }

            let nota = '';
            if (r.iso === piccoIso) nota = 'Picco massimo periodo';
            else if (r.parziale) nota = 'Giornata parziale (export)';
            else if (r.attivazione) nota = 'Giorno attivazione telemetria';
            else if (r.weekend) nota = 'Fine settimana';

            const celle = [
                cellaNum(1, rowNum, excelSerial(r), sD),
                cellaStr(2, rowNum, r.giornoIt, sT),
                cellaNum(3, rowNum, r.totale, sN),
                cellaNum(4, rowNum, r.apk, sN),
                cellaNum(5, rowNum, r.pwa, sN),
                cellaNum(6, rowNum, r.web, sN),
                cellaFormula(7, rowNum, `E${rowNum}+F${rowNum}`, r.webPwa, sN),
                cellaFormula(8, rowNum, `IF(C${rowNum}>0,(E${rowNum}+F${rowNum})/C${rowNum},0)`, Number(r.quotaWebPwa.toFixed(6)), sP),
                cellaStr(9, rowNum, nota, sT)
            ];
            rowsXml.push(`<row r="${rowNum}" ht="19" customHeight="1">${celle.join('')}</row>`);
        });

        const rTot = ultimaDati + 1;
        const rMed = ultimaDati + 2;
        rowsXml.push(`<row r="${rTot}" ht="22" customHeight="1">${[
            cellaStr(1, rTot, 'TOTALE PERIODO', 17),
            cellaStr(2, rTot, `${n} giorni`, 17),
            cellaFormula(3, rTot, `SUM(C2:C${ultimaDati})`, stats.sommaTot, 18),
            cellaFormula(4, rTot, `SUM(D2:D${ultimaDati})`, stats.sommaApk, 18),
            cellaFormula(5, rTot, `SUM(E2:E${ultimaDati})`, stats.sommaPwa, 18),
            cellaFormula(6, rTot, `SUM(F2:F${ultimaDati})`, stats.sommaWeb, 18),
            cellaFormula(7, rTot, `SUM(G2:G${ultimaDati})`, stats.sommaWebPwa, 18),
            cellaFormula(8, rTot, `IF(C${rTot}>0,G${rTot}/C${rTot},0)`, Number(stats.quotaWebPwa.toFixed(6)), 19),
            cellaStr(9, rTot, '', 17)
        ].join('')}</row>`);

        rowsXml.push(`<row r="${rMed}" ht="20" customHeight="1">${[
            cellaStr(1, rMed, 'MEDIA GREZZA (tutti i gg)', 17),
            cellaStr(2, rMed, 'tutti i giorni', 17),
            cellaFormula(3, rMed, `AVERAGE(C2:C${ultimaDati})`, Number((stats.sommaTot / n).toFixed(1)), 20),
            cellaFormula(4, rMed, `AVERAGE(D2:D${ultimaDati})`, Number((stats.sommaApk / n).toFixed(1)), 20),
            cellaFormula(5, rMed, `AVERAGE(E2:E${ultimaDati})`, Number((stats.sommaPwa / n).toFixed(1)), 20),
            cellaFormula(6, rMed, `AVERAGE(F2:F${ultimaDati})`, Number((stats.sommaWeb / n).toFixed(1)), 20),
            cellaFormula(7, rMed, `AVERAGE(G2:G${ultimaDati})`, Number((stats.sommaWebPwa / n).toFixed(1)), 20),
            cellaStr(8, rMed, '—', 17),
            cellaStr(9, rMed, 'Medie feriali pulite in Riepilogo', 17)
        ].join('')}</row>`);

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="19"/>
  ${colsXml}
  <sheetData>${rowsXml.join('')}</sheetData>
  <autoFilter ref="A1:I${ultimaDati}"/>
  <pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
    }

    function sheetRiepilogoXml(stats, dataExportIso) {
        const n = stats.numGiorni;
        const ultimaDati = 1 + n;
        const picco = stats.picco;
        const parsedExport = parseDataIso(dataExportIso) || stats.ultimaData;

        const colsXml = `<cols>
    <col min="1" max="1" width="34" customWidth="1"/>
    <col min="2" max="2" width="18" customWidth="1"/>
    <col min="3" max="3" width="18" customWidth="1"/>
    <col min="4" max="4" width="18" customWidth="1"/>
    <col min="5" max="5" width="16" customWidth="1"/>
    <col min="6" max="6" width="16" customWidth="1"/>
    <col min="7" max="7" width="16" customWidth="1"/>
    <col min="8" max="8" width="16" customWidth="1"/>
  </cols>`;

        const rowsXml = [];
        const addRow = (rNum, celle, ht = 20) => {
            rowsXml.push(`<row r="${rNum}" ht="${ht}" customHeight="1">${celle.join('')}</row>`);
        };

        addRow(1, [cellaStr(1, 1, 'QuickCheck UniSalento — Report Telemetria Anonima', 1), ...Array.from({ length: 7 }, (_, i) => cellaStr(i + 2, 1, '', 1))], 30);
        addRow(2, [cellaStr(1, 2, `Periodo: ${fmtDataIt(stats.primaData)} – ${fmtDataIt(stats.ultimaData)} (${n} giorni) | Esportato il ${fmtDataIt(parsedExport)} | Zero dati personali`, 2), ...Array.from({ length: 7 }, (_, i) => cellaStr(i + 2, 2, '', 2))], 21);

        addRow(4, [cellaStr(1, 4, 'INDICATORI PRINCIPALI', 4), cellaStr(2, 4, '', 4), cellaStr(3, 4, '', 4), cellaStr(4, 4, '', 4)], 22);
        addRow(5, [cellaStr(1, 5, 'Metrica', 3), cellaStr(2, 5, 'Valore', 3), cellaStr(3, 5, 'Dettaglio', 3), cellaStr(4, 5, 'Note', 3)], 22);
        addRow(6, [
            cellaStr(1, 6, 'Accessi giornalieri totali nel periodo', 23),
            cellaFormula(2, 6, `SUM('Storico Giornaliero'!C2:C${ultimaDati})`, stats.sommaTot, 10),
            cellaStr(3, 6, `${n} giorni rilevati`, 8),
            cellaStr(4, 6, '1 ping/giorno per dispositivo', 8)
        ]);
        addRow(7, [
            cellaStr(1, 7, 'Picco giornaliero massimo', 14),
            cellaFormula(2, 7, `MAX('Storico Giornaliero'!C2:C${ultimaDati})`, picco.totale, 24),
            cellaStr(3, 7, `${picco.giornoIt} ${fmtDataIt(picco)}`, 14),
            cellaStr(4, 7, `${picco.apk} APK / ${picco.pwa} PWA / ${picco.web} Web`, 14)
        ]);
        addRow(8, [
            cellaStr(1, 8, 'Media giorni feriali (Lun–Ven completi)', 23),
            cellaNum(2, 8, Number(stats.mediaFeriali.toFixed(1)), 21),
            cellaStr(3, 8, `${stats.numFeriali} giorni feriali`, 8),
            cellaStr(4, 8, `di cui ${fmtInt(stats.mediaFerialiWebPwa)}/gg Web+PWA`, 8)
        ]);
        addRow(9, [
            cellaStr(1, 9, 'Media weekend (Sab–Dom completi)', 7),
            cellaNum(2, 9, Number(stats.mediaWeekend.toFixed(1)), 21),
            cellaStr(3, 9, `${stats.numWeekend} giorni festivi`, 7),
            cellaStr(4, 9, 'Esclusi eventuali giorni parziali', 7)
        ]);
        addRow(10, [
            cellaStr(1, 10, 'Quota complessiva Web App + PWA', 14),
            // C18 calcola C15 + C16 nella tabella sottostante delle piattaforme
            cellaFormula(2, 10, 'C18', Number(stats.quotaWebPwa.toFixed(6)), 25),
            cellaStr(3, 10, 'iPhone, browser e Web App', 14),
            cellaStr(4, 10, 'Utenti impattati da Web/PWA', 14)
        ]);

        addRow(12, [cellaStr(1, 12, 'RIPARTIZIONE PER PIATTAFORMA', 4), cellaStr(2, 12, '', 4), cellaStr(3, 12, '', 4)], 22);
        addRow(13, [cellaStr(1, 13, 'Piattaforma', 3), cellaStr(2, 13, 'Accessi Totali', 3), cellaStr(3, 13, 'Quota %', 3)], 22);
        addRow(14, [
            cellaStr(1, 14, 'APK Android (App nativa)', 7),
            cellaFormula(2, 14, `SUM('Storico Giornaliero'!D2:D${ultimaDati})`, stats.sommaApk, 26),
            cellaFormula(3, 14, 'IF($B$17>0,B14/$B$17,0)', Number(stats.quotaApk.toFixed(6)), 11)
        ]);
        addRow(15, [
            cellaStr(1, 15, 'PWA Standalone (App Web installata)', 8),
            cellaFormula(2, 15, `SUM('Storico Giornaliero'!E2:E${ultimaDati})`, stats.sommaPwa, 24),
            cellaFormula(3, 15, 'IF($B$17>0,B15/$B$17,0)', Number(stats.quotaPwa.toFixed(6)), 12)
        ]);
        addRow(16, [
            cellaStr(1, 16, 'Web Browser (Safari / Chrome / Desktop)', 7),
            cellaFormula(2, 16, `SUM('Storico Giornaliero'!F2:F${ultimaDati})`, stats.sommaWeb, 27),
            cellaFormula(3, 16, 'IF($B$17>0,B16/$B$17,0)', Number(stats.quotaWeb.toFixed(6)), 11)
        ]);
        addRow(17, [
            cellaStr(1, 17, 'TOTALE ACCESSI', 17),
            cellaFormula(2, 17, 'SUM(B14:B16)', stats.sommaTot, 18),
            cellaFormula(3, 17, 'SUM(C14:C16)', stats.sommaTot > 0 ? 1 : 0, 19)
        ], 22);
        addRow(18, [
            cellaStr(1, 18, 'TOTALE SOLO WEB APP + PWA', 14),
            cellaFormula(2, 18, 'B15+B16', stats.sommaWebPwa, 24),
            cellaFormula(3, 18, 'C15+C16', Number(stats.quotaWebPwa.toFixed(6)), 16)
        ], 21);

        const rMStart = 20;
        addRow(rMStart, [cellaStr(1, rMStart, 'RIEPILOGO MENSILE', 4), ...Array.from({ length: 7 }, (_, i) => cellaStr(i + 2, rMStart, '', 4))], 22);
        const mHeaders = ['Mese', 'Giorni', 'Accessi Totali', 'Media Lun–Ven', 'Picco Giorno', 'APK Android', 'PWA Standalone', '% Web + PWA'];
        addRow(rMStart + 1, mHeaders.map((h, i) => cellaStr(i + 1, rMStart + 1, h, 3)), 22);

        stats.mensili.forEach((m, idxM) => {
            const rr = rMStart + 2 + idxM;
            const z = idxM % 2 === 1;
            const sTxt = z ? 8 : 7;
            const sNum = z ? 10 : 9;
            const sPct = z ? 12 : 11;
            addRow(rr, [
                cellaStr(1, rr, m.etichetta, sTxt),
                cellaNum(2, rr, m.giorni, sNum),
                cellaNum(3, rr, m.totale, sNum),
                cellaNum(4, rr, Number(m.mediaFeriali.toFixed(1)), 21),
                cellaNum(5, rr, m.picco.totale, sNum),
                cellaNum(6, rr, m.apk, sNum),
                cellaNum(7, rr, m.pwa, sNum),
                cellaNum(8, rr, Number(m.quotaWebPwa.toFixed(6)), sPct)
            ]);
        });

        const esclusiTxt = stats.esclusi
            .map((r) => `${fmtDataIt(r)} (${r.attivazione ? 'avvio' : 'parziale'})`)
            .join(', ');
        const notaXls = 'Nota: telemetria 100% anonima (UUID pseudocasuale generato in locale, max 1 invio/giorno all\'apertura dell\'app).'
            + (esclusiTxt ? ` Le medie escludono ${esclusiTxt}.` : '');

        const rNota = rMStart + 2 + stats.mensili.length + 1;
        addRow(rNota, [cellaStr(1, rNota, notaXls, 22), ...Array.from({ length: 7 }, (_, i) => cellaStr(i + 2, rNota, '', 22))], 28);

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  ${colsXml}
  <sheetData>${rowsXml.join('')}</sheetData>
  <mergeCells count="6">
    <mergeCell ref="A1:H1"/>
    <mergeCell ref="A2:H2"/>
    <mergeCell ref="A4:D4"/>
    <mergeCell ref="A12:C12"/>
    <mergeCell ref="A${rMStart}:H${rMStart}"/>
    <mergeCell ref="A${rNota}:H${rNota}"/>
  </mergeCells>
  <pageMargins left="0.5" right="0.5" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="1"/>
</worksheet>`;
    }

    /** Costruisce l'Uint8Array completo di un file .xlsx OpenXML con 2 fogli. */
    function creaBytesXlsx(records, dataExportIso = null) {
        const stats = calcolaStatisticheTelemetria(records, dataExportIso);

        const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

        const relsRoot = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

        const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Riepilogo" sheetId="1" r:id="rId1"/>
    <sheet name="Storico Giornaliero" sheetId="2" r:id="rId2"/>
  </sheets>
  <calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`;

        const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

        return creaZipStore([
            { name: '[Content_Types].xml', content: contentTypes },
            { name: '_rels/.rels', content: relsRoot },
            { name: 'xl/workbook.xml', content: workbookXml },
            { name: 'xl/_rels/workbook.xml.rels', content: workbookRels },
            { name: 'xl/styles.xml', content: stylesXml() },
            { name: 'xl/worksheets/sheet1.xml', content: sheetRiepilogoXml(stats, dataExportIso) },
            { name: 'xl/worksheets/sheet2.xml', content: sheetStoricoXml(stats) }
        ]);
    }

    function generaXlsxTelemetria(records, dataExportIso = null) {
        const bytes = creaBytesXlsx(records, dataExportIso);
        return new Blob([bytes], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
    }

    /**
     * Prova a leggere il logo del pannello per incorporarlo in base64 nel report HTML standalone.
     * In caso di errore (es. apertura locale file://) ricade sul badge tipografico QC.
     */
    async function caricaLogoDataUrl() {
        for (const percorso of ['assets/logo.png', 'assets/icona.png']) {
            try {
                const res = await fetch(percorso);
                if (!res.ok) continue;
                const blob = await res.blob();
                const dataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
                    reader.onerror = () => resolve('');
                    reader.readAsDataURL(blob);
                });
                if (dataUrl) return dataUrl;
            } catch (e) { /* fallback silenzioso */ }
        }
        return '';
    }

    const api = {
        calcolaStatisticheTelemetria,
        generaXlsxTelemetria,
        generaReportHtmlTelemetria,
        caricaLogoDataUrl,
        _creaBytesXlsx: creaBytesXlsx
    };

    if (typeof window !== 'undefined') {
        window.QuickCheckExportTelemetria = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})();
