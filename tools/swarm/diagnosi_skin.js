// tools/swarm/diagnosi_skin.js
// Perché una skin comprata non risulta addosso?
// Si apre il gioco con il token del giocatore e si guarda, passo per passo, cosa
// dice il client: skins nel profilo, skins possedute, se la skin esiste nel
// catalogo, cosa fa indossaSkin e cosa resta dopo.
//
// Uso: node tools/swarm/diagnosi_skin.js [urlServer] [chiaveBot]

const fs = require('fs');
const path = require('path');
const { apriNavigatore } = require('./navigatore.js');

const RADICE = path.join(__dirname, '..', '..');

async function main() {
    const url = process.argv[2] || 'http://127.0.0.1:8300/';
    const chiave = process.argv[3] || 'bot1';

    const giocatori = JSON.parse(fs.readFileSync(path.join(RADICE, 'bug_reports', 'giocatori.json'), 'utf8'));
    const chi = giocatori[chiave];
    if (!chi) throw new Error('giocatore ' + chiave + ' non trovato in giocatori.json');

    console.log('giocatore:', chi.nick);
    const profilo = await fetch(url + 'api/profilo', { headers: { Authorization: 'Bearer ' + chi.token } }).then((r) => r.json());
    console.log('skins secondo il server:', JSON.stringify(profilo.skins));
    console.log('punti:', profilo.punti);
    console.log('');

    const nav = await apriNavigatore({ porta: 9777, url: url, attesaCaricamentoMs: 4000 });
    try {
        await nav.valuta("localStorage.setItem('uvsf7-token'," + JSON.stringify(chi.token) + ")");
        await nav.valuta('location.reload()');
        await new Promise((r) => setTimeout(r, 4500));

        const stato = await nav.valuta(
            'JSON.stringify({' +
            ' dentro: (typeof statoAccount !== "undefined" && statoAccount) ? !!statoAccount.dentro : null,' +
            ' skinsProfilo: (typeof statoAccount !== "undefined" && statoAccount && statoAccount.skins) || [],' +
            ' possedute: (typeof skinsPossedute === "function") ? skinsPossedute() : "assente",' +
            ' chiaveSkinRaro: (typeof chiaveSkin === "function") ? chiaveSkin("OusmaneDiouf","raro") : "assente",' +
            ' esisteNelCatalogo: (typeof SKINS !== "undefined") ? !!SKINS["raro"] : "SKINS assente",' +
            ' chiaviCatalogo: (typeof SKINS !== "undefined") ? Object.keys(SKINS).slice(0,12) : []' +
            '})');
        console.log('stato del client:', stato.split('","').join('",\n                   "'));

        const prima = await nav.valuta('typeof skinIndossata === "function" ? skinIndossata("OusmaneDiouf") : "assente"');
        const scelto = await nav.valuta('typeof indossaSkin === "function" ? indossaSkin("OusmaneDiouf","raro") : "assente"');
        const dopo = await nav.valuta('typeof skinIndossata === "function" ? skinIndossata("OusmaneDiouf") : "assente"');
        const grezzo = await nav.valuta('localStorage.getItem("uvsf7-skin-indossate") || localStorage.getItem("uvsf7-skins-indossate") || "chiave non trovata"');

        console.log('');
        console.log('skinIndossata prima:', prima);
        console.log('indossaSkin ha restituito:', scelto);
        console.log('skinIndossata dopo:', dopo);
        console.log('memoria locale degli indossi:', grezzo);
    } finally {
        nav.chiudi();
    }
}

main().catch((errore) => { console.error('FALLITA:', errore.message); process.exit(1); });
