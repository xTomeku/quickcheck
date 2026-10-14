// Pannello admin - riquadro "Iscrizioni per corso di studio" in Push e avvisi.
// Conteggi dalla funzione iscrizioni_per_corso() (_redesign/sql/pannello_modifiche_iscrizioni.sql):
// PWA e APK contano le iscrizioni attive, come i contatori in cima alla sezione; le disattivate a parte.
// Nomi di corsi e percorsi da leggiEtichetteCorsi (admin-js/modifiche.js).
// Un corso raccoglie le sue varianti del portale: LB55R (1° e 2° anno) e LB55 (3° anno) sono
// entrambi Ingegneria informatica.

const ISC_MOSTRATI = 10; // corsi visibili prima di "Mostra tutti"

const _isc = {
    gen: 0,
    righe: null,
    etichette: null,
    piattaforma: 'tutte', // tutte | pwa | apk
    ordine: 'numero',     // numero | az
    cerca: '',
    aperti: new Set(),
    tutti: false,
};
const _iscEl = id => document.getElementById(id);

async function caricaIscrizioniCorsi() {
    const gen = ++_isc.gen;
    const elenco = _iscEl('isc-elenco');
    if (!elenco) return;
    if (!_isc.righe) elenco.innerHTML = '<div class="admin-caricamento">Caricamento delle iscrizioni…</div>';
    try {
        const [r, etichette] = await Promise.all([_supabase.rpc('iscrizioni_per_corso'), leggiEtichetteCorsi()]);
        if (gen !== _isc.gen) return;
        if (r.error) throw r.error;
        _isc.righe = r.data || [];
        _isc.etichette = etichette;
        disegnaIscrizioni();
    } catch (err) {
        if (gen !== _isc.gen) return;
        console.error('Iscrizioni per corso:', err);
        const permesso = /permission denied|could not find the function|does not exist/i.test(err.message || '') || ['42501', '42883', 'PGRST202'].includes(err.code);
        elenco.innerHTML = `<div class="admin-errore">${permesso
            ? 'Conteggi non disponibili: esegui lo script _redesign/sql/pannello_modifiche_iscrizioni.sql.'
            : escapeHtml(err.message || String(err))}</div>`;
    }
}

const _iscZero = () => ({ pwa: 0, apk: 0, dis: 0 });
function _iscSomma(a, b) { a.pwa += b.pwa; a.apk += b.apk; a.dis += b.dis; return a; }
const _iscNumero = x => (_isc.piattaforma === 'pwa' ? x.pwa : _isc.piattaforma === 'apk' ? x.apk : x.pwa + x.apk);

// Corsi -> anni -> percorsi, con i totali a ogni livello
function _iscRaggruppa() {
    const et = _isc.etichette;
    const famiglie = new Map();
    const senzaCorso = _iscZero();
    for (const r of _isc.righe) {
        const n = { pwa: Number(r.pwa) || 0, apk: Number(r.apk) || 0, dis: Number(r.disattivate) || 0 };
        if (!r.id_corso) { _iscSomma(senzaCorso, n); continue; }
        const chiave = r.id_corso === 'TEST' ? 'TEST' : r.id_corso.replace(/R$/, '');
        if (!famiglie.has(chiave)) famiglie.set(chiave, { chiave, codici: new Map(), anni: new Map(), tot: _iscZero() });
        const f = famiglie.get(chiave);
        f.codici.set(r.id_corso, (f.codici.get(r.id_corso) || 0) + n.pwa + n.apk + n.dis);
        _iscSomma(f.tot, n);
        const anno = annoPercorso(r.percorso).anno || 0;
        if (!f.anni.has(anno)) f.anni.set(anno, { anno, percorsi: new Map(), tot: _iscZero() });
        const a = f.anni.get(anno);
        _iscSomma(a.tot, n);
        const percorso = nomePercorso(et, r.id_corso, r.percorso);
        _iscSomma(a.percorsi.get(percorso) || (a.percorsi.set(percorso, _iscZero()), a.percorsi.get(percorso)), n);
    }

    const corsi = [...famiglie.values()].map(f => {
        // Nome: quello della variante R (ordinamento in vigore), altrimenti del codice con più iscritti
        const codici = [...f.codici.keys()].sort((a, b) => (b.endsWith('R') - a.endsWith('R')) || f.codici.get(b) - f.codici.get(a));
        const info = et && et[codici[0]];
        const nome = f.chiave === 'TEST' ? 'Corso TEST (simulatore)' : (info ? nomeLeggibile(info.nome) : codici[0]);
        const altri = info ? codici.slice(1).filter(c => et[c] && et[c].nome.toUpperCase() !== info.nome.toUpperCase()) : [];
        return {
            ...f,
            nome,
            sotto: [info && info.tipo, codici.join(' · ')].filter(Boolean).join(' · '),
            nota: altri.map(c => `Comprende anche «${nomeLeggibile(et[c].nome)}» (${c}).`).join(' '),
            anni: [...f.anni.values()].sort((a, b) => (a.anno || 99) - (b.anno || 99)),
        };
    });
    return { corsi, senzaCorso };
}

function _iscDivisione(x) {
    const parti = [];
    if (_isc.piattaforma !== 'apk') parti.push(`<span class="admin-pwa">${x.pwa} PWA</span>`);
    if (_isc.piattaforma !== 'pwa') parti.push(`<span class="admin-apk">${x.apk} APK</span>`);
    if (x.dis) parti.push(`<span title="Iscrizioni con le notifiche spente: non sono comprese nel numero">${x.dis} disattivat${x.dis === 1 ? 'a' : 'e'}</span>`);
    return parti.join(' · ');
}

// Barra lunga in proporzione a [massimo]; con "Tutte" divisa tra PWA e APK
function _iscQuota(x, massimo) {
    const largo = massimo ? (_iscNumero(x) / massimo) * 100 : 0;
    if (_isc.piattaforma !== 'tutte') return `<span class="isc-quota" aria-hidden="true"><i class="${_isc.piattaforma}" style="width:${largo}%"></i></span>`;
    const t = x.pwa + x.apk || 1;
    return `<span class="isc-quota" aria-hidden="true"><i class="pwa" style="width:${(largo * x.pwa) / t}%"></i><i class="apk" style="width:${(largo * x.apk) / t}%"></i></span>`;
}

function _iscAnni(c) {
    const massimo = Math.max(...c.anni.map(a => _iscNumero(a.tot)));
    return c.anni.map(a => {
        const n = _iscNumero(a.tot);
        if (!n && !a.tot.dis) return '';
        const percorsi = [...a.percorsi.entries()].filter(([, x]) => _iscNumero(x) > 0);
        const nominati = percorsi.filter(([nome]) => nome);
        // Un solo percorso con un nome proprio: accanto all'anno; più percorsi: elencati sotto
        const unico = percorsi.length === 1 && nominati.length === 1 ? ` · ${escapeHtml(nominati[0][0])}` : '';
        const elenco = percorsi.length > 1 ? `<div class="isc-percorsi">${percorsi
            .sort((x, y) => _iscNumero(y[1]) - _iscNumero(x[1]))
            .map(([nome, x]) => `<div class="isc-percorso"><span class="isc-t">${escapeHtml(nome || 'Percorso comune')}</span><span class="isc-vuoto"></span><span class="isc-n">${_iscNumero(x)}</span><span></span></div>`).join('')}</div>` : '';
        return `<div class="isc-anno"><span class="isc-t">${a.anno ? `${a.anno}° anno` : 'Anno non indicato'}${unico}<small>${_iscDivisione(a.tot)}</small></span>${_iscQuota(a.tot, massimo)}<span class="isc-n">${n}</span><span></span></div>${elenco}`;
    }).join('');
}

function disegnaIscrizioni() {
    const elenco = _iscEl('isc-elenco');
    if (!elenco || !_isc.righe) return;
    const { corsi, senzaCorso } = _iscRaggruppa();
    const attive = corsi.reduce((s, c) => s + c.tot.pwa + c.tot.apk, 0) + senzaCorso.pwa + senzaCorso.apk;
    const riepilogo = _iscEl('isc-riepilogo');
    if (riepilogo) riepilogo.textContent = `${attive.toLocaleString('it-IT')} attive · ${corsi.length} ${corsi.length === 1 ? 'corso' : 'corsi'}`;

    const q = _isc.cerca.trim().toLowerCase();
    const lista = corsi
        .filter(c => _iscNumero(c.tot) > 0 || (_isc.piattaforma === 'tutte' && c.tot.dis))
        .filter(c => !q || `${c.nome} ${c.sotto}`.toLowerCase().includes(q))
        .sort(_isc.ordine === 'az'
            ? (a, b) => a.nome.localeCompare(b.nome, 'it')
            : (a, b) => _iscNumero(b.tot) - _iscNumero(a.tot) || a.nome.localeCompare(b.nome, 'it'));
    const massimo = Math.max(1, ...lista.map(c => _iscNumero(c.tot)));
    const mostrati = _isc.tutti || q ? lista : lista.slice(0, ISC_MOSTRATI);
    const nascosti = lista.length - mostrati.length;
    const senza = _iscNumero(senzaCorso);

    const righe = mostrati.map(c => {
        const aperto = _isc.aperti.has(c.chiave);
        return `
            <div class="isc-corso${aperto ? ' aperto' : ''}">
                <button type="button" class="isc-testa" data-corso="${escapeHtml(c.chiave)}" aria-expanded="${aperto}">
                    <span class="isc-nome">${escapeHtml(c.nome)}<small>${escapeHtml(c.sotto)}</small></span>
                    ${_iscQuota(c.tot, massimo)}
                    <span class="isc-totale">${_iscNumero(c.tot)}</span>
                    <span class="admin-ms isc-freccia" aria-hidden="true">chevron_right</span>
                </button>
                ${aperto ? `<div class="isc-anni">${_iscAnni(c)}${c.nota ? `<div class="isc-nota"><span class="admin-ms">info</span>${escapeHtml(c.nota)}</div>` : ''}</div>` : ''}
            </div>`;
    }).join('');

    elenco.innerHTML = (righe || '<div class="admin-vuoto">Nessun corso trovato.</div>') +
        (!q && senza ? `<div class="isc-corso isc-senza"><div class="isc-testa"><span class="isc-nome">Senza corso impostato<small>Iscritti con le sole materie preferite</small></span><span class="isc-vuoto"></span><span class="isc-totale">${senza}</span><span></span></div></div>` : '') +
        (nascosti > 0 ? `<button type="button" class="isc-altri" data-isc-tutti="1"><span class="admin-ms">expand_more</span>Mostra tutti i ${lista.length} corsi</button>`
            : (_isc.tutti && !q && lista.length > ISC_MOSTRATI ? '<button type="button" class="isc-altri" data-isc-tutti="0"><span class="admin-ms">expand_less</span>Mostra meno</button>' : ''));
}

(function () {
    const riquadro = _iscEl('isc-riquadro');
    if (!riquadro) return;
    riquadro.addEventListener('click', (e) => {
        const corso = e.target.closest('[data-corso]');
        const piattaforma = e.target.closest('[data-piattaforma]');
        const ordine = e.target.closest('[data-ordine]');
        const tutti = e.target.closest('[data-isc-tutti]');
        if (corso) {
            const k = corso.dataset.corso;
            if (_isc.aperti.has(k)) _isc.aperti.delete(k); else _isc.aperti.add(k);
        } else if (piattaforma || ordine) {
            const gruppo = (piattaforma || ordine).parentElement;
            gruppo.querySelectorAll('button').forEach(b => {
                const attivo = b === (piattaforma || ordine);
                b.classList.toggle('active', attivo);
                b.setAttribute('aria-pressed', String(attivo));
            });
            if (piattaforma) _isc.piattaforma = piattaforma.dataset.piattaforma;
            else _isc.ordine = ordine.dataset.ordine;
        } else if (tutti) {
            _isc.tutti = tutti.dataset.iscTutti === '1';
        } else return;
        disegnaIscrizioni();
    });
    _iscEl('isc-cerca')?.addEventListener('input', (e) => { _isc.cerca = e.target.value; disegnaIscrizioni(); });
})();
