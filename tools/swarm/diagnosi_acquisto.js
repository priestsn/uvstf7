// tools/swarm/diagnosi_acquisto.js
// Perché il negozio risponde 404 su una voce che lui stesso ha elencato?
// Si iscrive un account, si legge /api/negozio e si prova a comprare ogni voce:
// 404 = la chiave non trova la voce; 402 = la chiave è giusta ma mancano i punti.

const { avviaServerDiProva, fermaServerDiProva } = require('./serverProva.js');

async function main() {
    const server = await avviaServerDiProva(8311);
    try {
        const base = server.url;
        const casuale = Math.random().toString(36).slice(2, 7);
        const nick = 'DiagAcq' + casuale;
        const password = 'password' + casuale;

        const iscrizione = await fetch(base + 'api/iscrizione', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nick: nick, password: password })
        }).then((r) => r.json());

        const token = iscrizione.token;
        const negozio = await fetch(base + 'api/negozio', {
            headers: { Authorization: 'Bearer ' + token }
        }).then((r) => r.json());

        console.log('punti iniziali:', negozio.punti, '| voci:', negozio.voci.length);
        console.log('');

        for (const voce of negozio.voci) {
            const acquisto = await fetch(base + 'api/negozio/acquisto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ chiave: voce.chiave })
            });
            const corpo = await acquisto.json();
            const tipo = voce.skin ? 'skin' : 'verdellinese';
            console.log(
                String(acquisto.status).padEnd(4) +
                'chiave=' + JSON.stringify(voce.chiave).padEnd(34) +
                ' ' + tipo.padEnd(14) +
                ' prezzo ' + String(voce.prezzo).padStart(5) +
                '  → ' + (corpo.messaggio || 'comprato')
            );
        }
    } finally {
        fermaServerDiProva(server);
    }
}

main().catch((errore) => { console.error('FALLITA:', errore.message); process.exit(1); });
