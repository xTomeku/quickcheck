// Segnala che JavaScript è attivo: solo così gli elementi .reveal partono nascosti
// per l'animazione di comparsa. Senza JS restano visibili.
document.documentElement.classList.add('js');

// Ottimizzazione URL: Rimuove .html dalla barra degli indirizzi
// (tiene ?parametri e #sezione: il pannello admin apre la sezione indicata dopo #)
if (location.pathname.endsWith('.html')) {
    const cleanUrl = location.pathname.substring(0, location.pathname.length - 5);
    window.history.replaceState(null, '', cleanUrl + location.search + location.hash);
}

// Configurazione Globale Supabase
window.SUPABASE_URL = 'https://wcqbkqtsthihtosvnnct.supabase.co';
// Chiave publishable (sb_publishable_...): le chiavi legacy anon smettono di funzionare a fine 2026.
window.SUPABASE_KEY = 'sb_publishable_PnSiqYWAdxr1zH0rR1-5ug_UUjnekc0';
