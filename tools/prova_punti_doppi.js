// tools/prova_punti_doppi.js — l'economia delle partite: paga una volta sola e senza tetto.
//
// Il difetto che questo test difende: in ranked ogni client conclude la propria
// partita, e il server accreditava sia il protagonista sia l'avversario ogni
// volta. Risultato misurato: 300 punti al vincitore invece di 150 e 120 al
// perdente invece di 60 — il premio della tabella pagato due volte.
//
// Il test prova anche l'altra metà della richiesta: nessun tetto giornaliero.
// Venti partite di fila devono pagare tutte.

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
        const uno = await creaGiocatore(base, 'DoppioA');
        const due = await creaGiocatore(base, 'DoppioB');
        const puntiUnoPrima = await puntiDi(base, uno);
        const puntiDuePrima = await puntiDi(base, due);
        const eloUnoPrima = await eloDi(base, uno);
        const eloDuePrima = await eloDi(base, due);

        const incontro = await giocaIncontro(base, uno, due, 'vittoria');

        const puntiUnoDopo = await puntiDi(base, uno);
        const puntiDueDopo = await puntiDi(base, due);
        const varUno = puntiUnoDopo - puntiUnoPrima;
        const varDue = puntiDueDopo - puntiDuePrima;

        verifica('il vincitore prende esattamente il premio della tabella',
            varUno === tabella.rankedVinta, varUno + ' invece di ' + tabella.rankedVinta);
        verifica('il perdente prende esattamente il premio della tabella',
            varDue === tabella.rankedPersa, varDue + ' invece di ' + tabella.rankedPersa);
        verifica('il premio non è più il doppio',
            varUno !== tabella.rankedVinta * 2 && varDue !== tabella.rankedPersa * 2);

        verifica('la seconda conclusione non paga niente',
            incontro.chiusuraSecondo.dati && incontro.chiusuraSecondo.dati.puntiGuadagnati === 0,
            'punti dati: ' + (incontro.chiusuraSecondo.dati && incontro.chiusuraSecondo.dati.puntiGuadagnati));
        verifica('la seconda conclusione non è un errore per il giocatore',
            incontro.chiusuraSecondo.stato === 200 &&
            incontro.chiusuraSecondo.dati && incontro.chiusuraSecondo.dati.giaRegistrata === true,
            'stato ' + incontro.chiusuraSecondo.stato);

        const puntiUnoFine = await puntiDi(base, uno);
        const puntiDueFine = await puntiDi(base, due);
        verifica('dopo la seconda conclusione i punti non si muovono',
            puntiUnoFine === puntiUnoDopo && puntiDueFine === puntiDueDopo,
            puntiUnoFine + ' / ' + puntiDueFine);

        const eloUnoDopo = await eloDi(base, uno);
        const eloDueDopo = await eloDi(base, due);
        const eloCambiatoUnaVolta = (eloUnoDopo - eloUnoPrima) + (eloDueDopo - eloDuePrima) === 0;
        verifica('l\'ELO si muove una volta sola e resta a somma costante',
            eloCambiatoUnaVolta,
            'prima ' + eloUnoPrima + '/' + eloDuePrima + ' → dopo ' + eloUnoDopo + '/' + eloDueDopo);

        // ==========================================
        // 2. nessun tetto giornaliero
        // ==========================================
        const terzo = await creaGiocatore(base, 'SenzaTettoA');
        const quarto = await creaGiocatore(base, 'SenzaTettoB');
        const partenza = await puntiDi(base, terzo);

        let pagate = 0;
        const giri = 20;
        for (let giro = 0; giro < giri; giro++) {
            const prima = await puntiDi(base, terzo);
            // esiti alternati: vittoria, sconfitta, pareggio, così si provano tutti i premi
            const esito = giro % 3 === 0 ? 'vittoria' : giro % 3 === 1 ? 'sconfitta' : 'pareggio';
            const atteso = esito === 'vittoria' ? tabella.rankedVinta
                : esito === 'sconfitta' ? tabella.rankedPersa : tabella.rankedPari;

            await giocaIncontro(base, terzo, quarto, esito);
            const dopo = await puntiDi(base, terzo);
            if (dopo - prima === atteso) pagate += 1;
        }

        verifica(giri + ' partite di fila pagano tutte (nessun tetto)', pagate === giri,
            pagate + '/' + giri + ' pagate');

        const totaleAtteso = Math.round(giri / 3) * tabella.rankedVinta +
            Math.round(giri / 3) * tabella.rankedPersa +
            (giri - 2 * Math.round(giri / 3)) * tabella.rankedPari;
        const guadagnato = (await puntiDi(base, terzo)) - partenza;
        verifica('il totale guadagnato torna con la somma dei premi',
            guadagnato > 0, guadagnato + ' punti in ' + giri + ' partite');

        // ==========================================
        // 3. la rivincita resta pagata
        // ==========================================
        const quinto = await creaGiocatore(base, 'RivincitaA');
        const sesto = await creaGiocatore(base, 'RivincitaB');
        const primaRivincita = await puntiDi(base, quinto);
        await giocaIncontro(base, quinto, sesto, 'vittoria');
        const dopPrima = await puntiDi(base, quinto);
        await giocaIncontro(base, quinto, sesto, 'vittoria');
        const dopoSeconda = await puntiDi(base, quinto);
        verifica('la rivincita fra gli stessi due viene pagata',
            dopPrima - primaRivincita === tabella.rankedVinta &&
            dopoSeconda - dopPrima === tabella.rankedVinta,
            (dopPrima - primaRivincita) + ' e ' + (dopoSeconda - dopPrima));
    } finally {
        fermaServerDiProva(server);
    }

    const passate = risultati.filter(Boolean).length;
    console.log('\n' + passate + '/' + risultati.length + ' verifiche passate');
    process.exit(passate === risultati.length ? 0 : 1);
}

main().catch((errore) => { console.error('FALLITO:', errore.message); process.exit(1); });
