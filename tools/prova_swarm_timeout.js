// tools/prova_swarm_timeout.js — il browser muore, lo sciame non deve morire con lui.
//
// Il difetto che questo test difende: `invia()` aspettava la risposta del
// browser senza tetto di tempo. Se Chrome spariva — per esempio perché qualcuno
// chiudeva i processi — la promessa non si risolveva mai e la corsa restava
// ferma per ore senza scrivere una riga. Misurato: quattro ore di silenzio.
//
// Qui si apre un browser vero, lo si chiude e si controlla che il comando
// successivo fallisca subito invece di restare appeso.

const path = require('path');
const { apriNavigatore } = require(path.join(__dirname, 'swarm', 'navigatore.js'));
const { avviaServerDiProva, fermaServerDiProva } = require(path.join(__dirname, 'swarm', 'serverProva.js'));

const risultati = [];
function verifica(nome, condizione, dettaglio) {
    risultati.push(!!condizione);
    console.log((condizione ? 'OK       ' : 'FALLITO  ') + nome.padEnd(58) + (dettaglio || ''));
}

async function main() {
    const server = await avviaServerDiProva(8349);
    const nav = await apriNavigatore({ porta: 9788, url: server.url, attesaCaricamentoMs: 3000 });

    try {
        const vivo = await nav.valuta('1 + 1');
        verifica('con il browser vivo il comando risponde', vivo === 2, 'valore ' + vivo);

        const avvio = Date.now();
        // Si chiude il browser come farebbe un processo terminato dall'esterno:
        // socket chiuso e processo ucciso, senza preavviso per chi sta aspettando.
        nav.chiudi();

        let fallito = false;
        let messaggio = '';
        try {
            await nav.valuta('1 + 1');
        } catch (errore) {
            fallito = true;
            messaggio = errore.message;
        }
        const trascorso = (Date.now() - avvio) / 1000;

        verifica('dopo la morte del browser il comando fallisce', fallito, messaggio.slice(0, 60));
        verifica('e fallisce in fretta, non dopo un\'attesa infinita',
            trascorso < 20, trascorso.toFixed(1) + ' secondi');
    } finally {
        try { nav.chiudi(); } catch (errore) { /* già chiuso */ }
        fermaServerDiProva(server);
    }

    const passate = risultati.filter(Boolean).length;
    console.log('\n' + passate + '/' + risultati.length + ' verifiche passate');
    process.exit(passate === risultati.length ? 0 : 1);
}

main().catch((errore) => { console.error('FALLITO:', errore.message); process.exit(1); });
