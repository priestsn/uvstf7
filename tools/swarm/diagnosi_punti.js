// tools/swarm/diagnosi_punti.js
// Quanti punti paga davvero una partita ranked fra due account veri?
//
// La tabella dice: vittoria X, sconfitta Y. Ma in una partita ranked i due
// client concludono OGNUNO la propria partita, e il server accredita sia il
// protagonista sia l'avversario: se succede due volte, il premio raddoppia
// senza che nulla lo dica.
//
// Uso: node tools/swarm/diagnosi_punti.js

const path = require('path');
const { avviaServerDiProva, fermaServerDiProva } = require('./serverProva.js');

const RADICE = path.join(__dirname, '..', '..');

async function chiama(base, percorso, corpo, token) {
    const intestazioni = { 'Content-Type': 'application/json' };
    if (token) intestazioni.Authorization = 'Bearer ' + token;
    const risposta = await fetch(base.replace(/\/$/, '') + percorso, {
        method: corpo === undefined ? 'GET' : 'POST',
        headers: intestazioni,
        body: corpo === undefined ? undefined : JSON.stringify(corpo)
    });
    let dati = null;
    try { dati = await risposta.json(); } catch (errore) { dati = null; }
    return { stato: risposta.status, dati: dati };
}

async function main() {
    const tabella = JSON.parse(require('fs').readFileSync(path.join(RADICE, 'dati', 'regole.json'), 'utf8')).punti;
    console.log('tabella:', JSON.stringify(tabella));
    console.log('');

    const server = await avviaServerDiProva(8321);
    try {
        const base = server.url;
        const a = Math.random().toString(36).slice(2, 7);
        const uno = await chiama(base, '/api/iscrizione', { nick: 'PuntiA' + a, password: 'password' + a });
        const due = await chiama(base, '/api/iscrizione', { nick: 'PuntiB' + a, password: 'password' + a });
        const tokenA = uno.dati.token;
        const tokenB = due.dati.token;

        const partenzaA = (await chiama(base, '/api/profilo', undefined, tokenA)).dati.punti;
        const partenzaB = (await chiama(base, '/api/profilo', undefined, tokenB)).dati.punti;
        console.log('punti di partenza:', partenzaA, partenzaB);

        // A apre la partita ranked contro B
        const avvio = await chiama(base, '/api/partita/avvia', { modo: 'ranked', avversario: due.dati.giocatore.nick }, tokenA);
        console.log('avvio ranked di A:', avvio.stato, avvio.dati && avvio.dati.partitaId ? 'id ' + avvio.dati.partitaId.slice(0, 8) : avvio.dati);

        // B apre la SUA partita ranked contro A (è quello che fa il secondo client)
        const avvioB = await chiama(base, '/api/partita/avvia', { modo: 'ranked', avversario: uno.dati.giocatore.nick }, tokenB);
        console.log('avvio ranked di B:', avvioB.stato, avvioB.dati && avvioB.dati.partitaId ? 'id ' + avvioB.dati.partitaId.slice(0, 8) : avvioB.dati);

        // A vince
        const chiusuraA = await chiama(base, '/api/partita/concludi', { partitaId: avvio.dati.partitaId, esito: 'vittoria' }, tokenA);
        console.log('A conclude (vittoria): punti dati', chiusuraA.dati && chiusuraA.dati.puntiGuadagnati);

        // B chiude la sua dichiarandosi sconfitto
        const chiusuraB = await chiama(base, '/api/partita/concludi', { partitaId: avvioB.dati.partitaId, esito: 'sconfitta' }, tokenB);
        console.log('B conclude (sconfitta): punti dati', chiusuraB.dati && chiusuraB.dati.puntiGuadagnati);

        const dopoA = (await chiama(base, '/api/profilo', undefined, tokenA)).dati.punti;
        const dopoB = (await chiama(base, '/api/profilo', undefined, tokenB)).dati.punti;

        console.log('');
        console.log('A:', partenzaA, '→', dopoA, '  variazione', dopoA - partenzaA,
            ' (tabella vittoria: ' + tabella.rankedVinta + ')');
        console.log('B:', partenzaB, '→', dopoB, '  variazione', dopoB - partenzaB,
            ' (tabella sconfitta: ' + tabella.rankedPersa + ')');

        const giustoA = dopoA - partenzaA === tabella.rankedVinta;
        const giustoB = dopoB - partenzaB === tabella.rankedPersa;
        console.log('');
        console.log('una sola partita paga il dovuto? A:', giustoA ? 'sì' : 'NO', '· B:', giustoB ? 'sì' : 'NO');
    } finally {
        fermaServerDiProva(server);
    }
}

main().catch((errore) => { console.error('FALLITA:', errore.message); process.exit(1); });
