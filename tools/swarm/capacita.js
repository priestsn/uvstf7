// tools/swarm/capacita.js — quanti bot regge questa macchina?
// Apre N browser veri, avvia una partita in ognuno e misura i passi al secondo.
// Il numero massimo utilizzabile è l'ultimo che tiene TUTTI i bot vicino a 60:
// oltre, lo sciame misura la contesa di CPU e non il gioco.
//
// Uso: node tools/swarm/capacita.js 12
const { apriNavigatore } = require('./navigatore.js');
const { avviaServerDiProva, fermaServerDiProva } = require('./serverProva.js');

function attendi(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Memoria libera in GB, su Windows e su Linux.
 *
 * Prima si chiamava PowerShell senza guardare il sistema: sulla BC250 (Arch)
 * la misura finale moriva con "powershell: command not found" e sporcava il
 * risultato di una prova che era andata tutta bene.
 */
function memoriaLiberaGB() {
    const { execSync } = require('child_process');
    try {
        if (process.platform === 'win32') {
            return execSync(
                'powershell -NoProfile -Command "$o=Get-CimInstance Win32_OperatingSystem; [math]::Round($o.FreePhysicalMemory/1MB,1)"',
                { encoding: 'utf8' }
            ).trim();
        }
        // Linux: MemAvailable e' il numero onesto (tiene conto della cache)
        const meminfo = require('fs').readFileSync('/proc/meminfo', 'utf8');
        const trovato = meminfo.match(/MemAvailable:\s+(\d+) kB/);
        return trovato ? (Number(trovato[1]) / 1024 / 1024).toFixed(1) : 'n/d';
    } catch (e) {
        return 'n/d';
    }
}

async function main() {
    const quanti = Number(process.argv[2] || 8);
    const server = await avviaServerDiProva(8353);
    const navigatori = [];

    try {
        console.log('apro ' + quanti + ' browser...');
        for (let numero = 1; numero <= quanti; numero++) {
            navigatori.push(await apriNavigatore({
                porta: 9800 + numero, url: server.url, attesaCaricamentoMs: 4000
            }));
        }

        for (const nav of navigatori) {
            await nav.valuta("avviaSelezioneCPU('normale'); confermaScelta(1); confermaScelta(2); 'ok'");
        }
        await attendi(3000);

        const prima = [];
        for (const nav of navigatori) prima.push(await nav.valuta('uvsf7Debug().frame'));
        await attendi(5000);
        const dopo = [];
        for (const nav of navigatori) dopo.push(await nav.valuta('uvsf7Debug().frame'));

        const passi = prima.map((valore, indice) => (dopo[indice] - valore) / 5);
        const minimo = Math.min.apply(null, passi);
        const medio = passi.reduce((s, p) => s + p, 0) / passi.length;

        console.log('passi al secondo per bot:', passi.map((p) => Math.round(p)).join(', '));
        console.log('minimo ' + Math.round(minimo) + ' · medio ' + Math.round(medio));
        console.log(minimo >= 55
            ? 'questa macchina regge ' + quanti + ' bot'
            : 'troppi bot: il minimo è sotto 55, la misura non sarebbe del gioco');

        console.log('memoria libera: ' + memoriaLiberaGB() + ' GB');
    } finally {
        for (const nav of navigatori) nav.chiudi();
        fermaServerDiProva(server);
    }
}

main().catch((e) => { console.error('FALLITO:', e.message); process.exit(1); });
