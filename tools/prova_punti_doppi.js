// tools/prova_punti_doppi.js — l'economia delle partite: paga una volta sola e senza tetto.
//
// Il difetto che questo test difende, misurato prima della correzione: in ranked
// il vincitore prendeva 300 punti invece di 150 e il perdente 120 invece di 60,
// cioè il premio della tabella pagato due volte.
//
// Perché succedeva: l'incontro reale è ASIMMETRICO. L'host apre una partita
// ranked indicando l'avversario; l'ospite entra nella stanza con il codice e il
// suo client apre una partita online senza sapere contro chi. Il server
// accreditava l'avversario a ogni conclusione, quindi l'ospite veniva pagato una
// volta dall'host e una volta da sé.
//
// Il legame fra le due metà è il CODICE DELLA STANZA. Qui si provano i due ordini
// possibili (host prima, ospite prima), il tetto che non deve esistere e la
// rivincita che invece deve restare pagata.

const path = require('path');
const { avviaServerDiProva, fermaServerDiProva } = require(path.join(__dirname, 'swarm', 'serverProva.js'));

const RADICE = path.join(__dirname, '..');
const tabella = JSON.parse(require('fs').readFileSync(path.join(RADICE, 'dati', 'regole.json'), 'utf8')).punti;

const risultati = [];
function verifica(nome, condizione, dettaglio) {
    risultati.push(!!condizione);
    console.log((condizione ? 'OK       ' : 'FALLITO  ') + nome.padEnd(60) + (dettaglio || ''));
}

async function chiama(base, percorso, corpo, token) {
    const intestazioni = { 'Content-Type': 'application/json' };
    if (token) intestazioni.Authorization = 'Bearer ' + token;
    // il server di prova restituisce l'URL con la barra finale
    const risposta = await fetch(base.replace(/\/$/, '') + percorso, {
        method: corpo === undefined ? 'GET' : 'POST',
        headers: intestazioni,
        body: corpo === undefined ? undefined : JSON.stringify(corpo)
    });
    let dati = null;
    try { dati = await risposta.json(); } catch (errore) { dati = null; }
    return { stato: risposta.status, dati: dati };
}

async function creaGiocatore(base, nome) {
    // Il gioco accetta nickname fino a 16 caratteri: il nome va accorciato,
    // altrimenti la registrazione risponde 400 e il test muore senza spiegazioni.
    const casuale = Math.random().toString(36).slice(2, 7);
    const corto = nome.slice(0, 10) + casuale;
    const esito = await chiama(base, '/api/iscrizione', { nick: corto, password: 'password' + casuale });
    if (!esito.dati || !esito.dati.giocatore) {
        throw new Error('registrazione rifiutata per «' + corto + '»: ' + esito.stato +
            ' ' + (esito.dati && esito.dati.messaggio));
    }
    return { nick: esito.dati.giocatore.nick, token: esito.dati.token };
}

async function puntiDi(base, chi) {
    const profilo = await chiama(base, '/api/profilo', undefined, chi.token);
    return profilo.dati.punti;
}

async function eloDi(base, chi) {
    const profilo = await chiama(base, '/api/profilo', undefined, chi.token);
    return profilo.dati.elo;
}

function codiceNuovo() {
    const lettere = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let codice = '';
    for (let i = 0; i < 4; i++) codice += lettere[Math.floor(Math.random() * lettere.length)];
    return codice;
}

/** L'host apre la partita ranked indicando l'avversario e il codice stanza. */
async function apreHost(base, host, ospite, codice) {
    const esito = await chiama(base, '/api/partita/avvia',
        { modo: 'ranked', avversario: ospite.nick, codice: codice }, host.token);
    return esito.dati.partitaId;
}

/** L'ospite apre la propria partita online con il codice della stanza. */
async function apreOspite(base, ospite, codice) {
    const esito = await chiama(base, '/api/partita/avvia',
        { modo: 'online', codice: codice }, ospite.token);
    return esito.dati.partitaId;
}

async function giocaIncontro(base, primo, secondo, esitoPrimo) {
    const esitoSecondo = esitoPrimo === 'vittoria' ? 'sconfitta' : esitoPrimo === 'sconfitta' ? 'vittoria' : 'pareggio';

    const avvioPrimo = await chiama(base, '/api/partita/avvia',
        { modo: 'ranked', avversario: secondo.nick }, primo.token);
    const avvioSecondo = await chiama(base, '/api/partita/avvia',
        { modo: 'ranked', avversario: primo.nick }, secondo.token);

    const chiusuraPrimo = await chiama(base, '/api/partita/concludi',
        { partitaId: avvioPrimo.dati.partitaId, esito: esitoPrimo }, primo.token);
    const chiusuraSecondo = await chiama(base, '/api/partita/concludi',
        { partitaId: avvioSecondo.dati.partitaId, esito: esitoSecondo }, secondo.token);

    return { chiusuraPrimo: chiusuraPrimo, chiusuraSecondo: chiusuraSecondo };
}

async function main() {
    console.log('tabella punti:', JSON.stringify(tabella));
    console.log('');

    const server = await avviaServerDiProva(8327);
    const base = server.url;

    try {
        // ==========================================
        // 1. un incontro paga una volta sola
        // ==========================================
        const host = await creaGiocatore(base, 'HostPrimo');
        const ospite = await creaGiocatore(base, 'OspiteDopo');
        const hostPrima = await puntiDi(base, host);
        const ospitePrima = await puntiDi(base, ospite);
        const eloHostPrima = await eloDi(base, host);
        const eloOspitePrima = await eloDi(base, ospite);
        const codiceUno = codiceNuovo();

        const partitaHost = await apreHost(base, host, ospite, codiceUno);
        const partitaOspite = await apreOspite(base, ospite, codiceUno);

        await chiama(base, '/api/partita/concludi',
            { partitaId: partitaHost, esito: 'vittoria' }, host.token);
        const hostDopo = await puntiDi(base, host);
        const ospiteDopoHost = await puntiDi(base, ospite);

        verifica('l\'host prende il premio della tabella, una volta',
            hostDopo - hostPrima === tabella.rankedVinta,
            '+' + (hostDopo - hostPrima) + ' invece di +' + tabella.rankedVinta);
        verifica('l\'ospite viene pagato dalla conclusione dell\'host',
            ospiteDopoHost - ospitePrima === tabella.rankedPersa,
            '+' + (ospiteDopoHost - ospitePrima));

        const chiusaOspite = await chiama(base, '/api/partita/concludi',
            { partitaId: partitaOspite, esito: 'sconfitta' }, ospite.token);
        const ospiteDopo = await puntiDi(base, ospite);

        verifica('la conclusione dell\'ospite non paga una seconda volta',
            ospiteDopo === ospiteDopoHost,
            '+' + (ospiteDopo - ospiteDopoHost) + ' punti extra');
        verifica('la seconda conclusione risponde senza errore',
            chiusaOspite.stato === 200, 'stato ' + chiusaOspite.stato);
        verifica('l\'ospite prende in tutto il premio una volta sola',
            ospiteDopo - ospitePrima === tabella.rankedPersa,
            '+' + (ospiteDopo - ospitePrima) + ' totale');

        const eloHostDopo = await eloDi(base, host);
        const eloOspiteDopo = await eloDi(base, ospite);
        verifica('l\'ELO si muove una volta sola e resta a somma costante',
            (eloHostDopo - eloHostPrima) + (eloOspiteDopo - eloOspitePrima) === 0,
            eloHostPrima + '/' + eloOspitePrima + ' → ' + eloHostDopo + '/' + eloOspiteDopo);

        // ==========================================
        // 2. ospite conclude per primo (ordine inverso)
        // ==========================================
        const host2 = await creaGiocatore(base, 'HostDopo');
        const ospite2 = await creaGiocatore(base, 'OspitePrimo');
        const host2Prima = await puntiDi(base, host2);
        const ospite2Prima = await puntiDi(base, ospite2);
        const codiceDue = codiceNuovo();

        const partitaHost2 = await apreHost(base, host2, ospite2, codiceDue);
        const partitaOspite2 = await apreOspite(base, ospite2, codiceDue);

        await chiama(base, '/api/partita/concludi',
            { partitaId: partitaOspite2, esito: 'sconfitta' }, ospite2.token);
        const ospite2Dopo = await puntiDi(base, ospite2);

        await chiama(base, '/api/partita/concludi',
            { partitaId: partitaHost2, esito: 'vittoria' }, host2.token);
        const host2Dopo = await puntiDi(base, host2);
        const ospite2Finale = await puntiDi(base, ospite2);

        verifica('anche con l\'ordine inverso l\'host prende il suo premio',
            host2Dopo - host2Prima === tabella.rankedVinta, '+' + (host2Dopo - host2Prima));
        verifica('l\'ospite che ha già concluso non viene pagato una seconda volta',
            ospite2Dopo - ospite2Prima === tabella.rankedPersa &&
            ospite2Finale === ospite2Dopo,
            '+' + (ospite2Dopo - ospite2Prima) + ' poi +' + (ospite2Finale - ospite2Dopo));

        // ==========================================
        // 3. nessun tetto giornaliero
        // ==========================================
        const terzo = await creaGiocatore(base, 'SenzaTetto');
        const quarto = await creaGiocatore(base, 'Avversario');
        const partenza = await puntiDi(base, terzo);

        let pagate = 0;
        const giri = 20;
        for (let giro = 0; giro < giri; giro++) {
            const prima = await puntiDi(base, terzo);
            // esiti alternati: vittoria, sconfitta, pareggio, così si provano tutti i premi
            const esito = giro % 3 === 0 ? 'vittoria' : giro % 3 === 1 ? 'sconfitta' : 'pareggio';
            const atteso = esito === 'vittoria' ? tabella.rankedVinta
                : esito === 'sconfitta' ? tabella.rankedPersa : tabella.rankedPari;

            const codice = codiceNuovo();
            const mia = await apreHost(base, terzo, quarto, codice);
            await apreOspite(base, quarto, codice);
            await chiama(base, '/api/partita/concludi', { partitaId: mia, esito: esito }, terzo.token);

            const dopo = await puntiDi(base, terzo);
            if (dopo - prima === atteso) pagate += 1;
        }

        verifica(giri + ' partite di fila pagano tutte (nessun tetto)', pagate === giri,
            pagate + '/' + giri + ' pagate');

        const guadagnato = (await puntiDi(base, terzo)) - partenza;
        verifica('il totale guadagnato è la somma dei premi',
            guadagnato > 0, guadagnato + ' punti in ' + giri + ' partite');

        // ==========================================
        // 4. la rivincita resta pagata
        // ==========================================
        const quinto = await creaGiocatore(base, 'Rivincita');
        const sesto = await creaGiocatore(base, 'Sfidante');
        const primaRivincita = await puntiDi(base, quinto);

        for (const giro of [1, 2]) {
            const codice = codiceNuovo();
            const mia = await apreHost(base, quinto, sesto, codice);
            await apreOspite(base, sesto, codice);
            await chiama(base, '/api/partita/concludi', { partitaId: mia, esito: 'vittoria' }, quinto.token);
        }
        const dopoRivincita = await puntiDi(base, quinto);
        verifica('due partite di fila fra gli stessi due pagano entrambe',
            dopoRivincita - primaRivincita === tabella.rankedVinta * 2,
            '+' + (dopoRivincita - primaRivincita) + ' in due partite');
    } finally {
        fermaServerDiProva(server);
    }

    const passate = risultati.filter(Boolean).length;
    console.log('\n' + passate + '/' + risultati.length + ' verifiche passate');
    process.exit(passate === risultati.length ? 0 : 1);
}

main().catch((errore) => { console.error('FALLITO:', errore.message); process.exit(1); });
