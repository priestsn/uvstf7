// tools/prova_swarm_verifiche.js — le verifiche dello sciame, provate sul gioco vero.
//
// Due parti:
//   1. unità: l'istantanea che si confronta al ricaricamento (ordinamento,
//      valori mancanti) — è la funzione che decide se un dato è stato perso;
//   2. integrazione: si avvia il server di prova e si eseguono davvero i percorsi
//      d'errore e gli invarianti. Se il gioco smettesse di rispondere bene a un
//      nick troppo corto, questo test lo dice.

const path = require('path');

const verifiche = require(path.join(__dirname, 'swarm', 'verifiche.js'));
const { avviaServerDiProva, fermaServerDiProva } = require(path.join(__dirname, 'swarm', 'serverProva.js'));

const risultati = [];
function verifica(nome, condizione, dettaglio) {
    risultati.push(!!condizione);
    console.log((condizione ? 'OK       ' : 'FALLITO  ') + nome.padEnd(58) + (dettaglio || ''));
}

// ==========================================
// 1. l'istantanea
// ==========================================

const istantanea = verifiche.istantanea;

verifica('istantanea di uno stato assente non esplode', istantanea(null) === null);

const a = istantanea({ dentro: true, nick: 'Tizio', punti: 300, elo: 1010, lottatori: ['B', 'A'], skins: ['Y', 'X'] });
verifica('l\'istantanea ordina lottatori e skin',
    a.lottatori.join(',') === 'A,B' && a.skins.join(',') === 'X,Y');
verifica('l\'istantanea dice che si è dentro', a.dentro === true && a.nick === 'Tizio');

const b = istantanea({ dentro: true, nick: 'Tizio', punti: 300, elo: 1010, lottatori: ['A', 'B'], skins: ['X', 'Y'] });
verifica('due stati uguali danno istantanee uguali (ordine dei campi irrilevante)',
    JSON.stringify(a) === JSON.stringify(b));

const c = istantanea({ dentro: true, nick: 'Tizio', punti: 300, elo: 1010, lottatori: ['A', 'B'], skins: [] });
verifica('una skin persa cambia l\'istantanea',
    JSON.stringify(a) !== JSON.stringify(c));

const d = istantanea({ dentro: true, nick: 'Tizio' });
verifica('campi mancanti diventano valori neutri, non undefined',
    d.punti === 0 && Array.isArray(d.lottatori) && Array.isArray(d.skins));

// ==========================================
// 2. sul gioco vero
// ==========================================

async function main() {
    const server = await avviaServerDiProva(8317);
    try {
        const raccolte = [];
        const scriviEvento = (evento) => raccolte.push(evento);

        const esito = await verifiche.percorsiErrore(server.url, scriviEvento, 1);
        verifica('i percorsi d\'errore vengono davvero provati', esito.fatti >= 6, esito.fatti + ' casi');
        verifica('il gioco gestisce tutti i percorsi d\'errore', esito.falliti === 0,
            esito.falliti + ' falliti: ' + raccolte.filter((e) => e.tipo === 'anomalia')
                .map((e) => e.firma + ' (' + e.messaggio.slice(0, 60) + ')').join(' | '));

        // un account vero per gli invarianti
        const casuale = Math.random().toString(36).slice(2, 7);
        const iscrizione = await verifiche.chiama(server.url, '/api/iscrizione',
            { nick: 'Invarianti' + casuale, password: 'password' + casuale });
        const token = iscrizione.dati && iscrizione.dati.token;
        verifica('account di prova creato per gli invarianti', !!token);

        if (token) {
            raccolte.length = 0;
            const appena = await verifiche.invarianti(server.url,
                { numero: 1, nick: 'Invarianti' + casuale, token: token }, scriviEvento);
            verifica('un account nuovo non viola nessun invariante', appena.falliti === 0,
                String(appena.falliti));

            // uno stato impossibile deve essere NOTATO: si forza il profilo a
            // punti negativi scrivendo direttamente nello stato del server
            const fs = require('fs');
            const percorso = path.join(__dirname, '..', 'dati', 'runtime', 'giocatori.json');
            if (fs.existsSync(percorso)) {
                const dati = JSON.parse(fs.readFileSync(percorso, 'utf8'));
                // Lo stato del server tiene i giocatori in una MAPPA per id, non
                // in un elenco: si cerca fra i valori.
                const elenco = Array.isArray(dati) ? dati
                    : Array.isArray(dati.giocatori) ? dati.giocatori
                        : Object.values(dati.giocatori || {});
                const chi = elenco.find((g) => g && g.nick === 'Invarianti' + casuale);
                if (chi) {
                    chi.punti = -50;
                    fs.writeFileSync(percorso, JSON.stringify(dati, null, 2), 'utf8');
                    raccolte.length = 0;
                    const guasto = await verifiche.invarianti(server.url,
                        { numero: 1, nick: chi.nick, token: token }, scriviEvento);
                    verifica('i punti negativi vengono segnalati', guasto.falliti >= 1,
                        raccolte.map((e) => e.firma).join(' '));
                }
            }
        }
    } finally {
        fermaServerDiProva(server);
    }

    const passate = risultati.filter(Boolean).length;
    console.log('\n' + passate + '/' + risultati.length + ' verifiche passate');
    process.exit(passate === risultati.length ? 0 : 1);
}

main().catch((errore) => {
    console.error('FALLITO:', errore.message);
    process.exit(1);
});
