// Ottimizzazione URL: Rimuove .html dalla barra degli indirizzi
if (location.pathname.endsWith('.html')) {
    const cleanUrl = location.pathname.substring(0, location.pathname.length - 5);
    window.history.replaceState(null, '', cleanUrl);
}

// Configurazione Globale Supabase
window.SUPABASE_URL = 'https://wcqbkqtsthihtosvnnct.supabase.co';
window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWJrcXRzdGhpaHRvc3ZubmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTg4NzgsImV4cCI6MjA5MzAzNDg3OH0.LLO3eCJSujeS0OaFd2JSLBm5c2TbZXD7BBcMmv-Coxc';
