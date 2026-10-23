// tools/swarm/rigenera_richieste.js
// Rigenera bug_reports/RICHIESTE.md dallo storico, senza rigiocare niente.
//
// Serve perché il documento è un PRODOTTO dello storico: se cambiano le regole
// con cui si raggruppa o si ordina, o si corregge la prosa, non ha senso
// rifare tre ore di partite per rileggere lo stesso archivio.
//
// Uso: node tools/swarm/rigenera_richieste.js [cartellaArchivio]

const fs = require('fs');
const path = require('path');
const richieste = require('./richieste.js');

const RADICE = path.join(__dirname, '..', '..');
const cartella = process.argv[2] || path.join(RADICE, 'bug_reports');

const storico = richieste.leggiStorico(cartella);
if (!storico.length) {
    console.log('Nessuna richiesta in ' + richieste.percorsoStorico(cartella));
    process.exit(0);
}

const elenco = richieste.raggruppa(storico);

// numero di corse = cartelle di corsa distinte che compaiono nell'archivio
const corse = new Set();
for (const voce of storico) {
    if (voce.origine && voce.origine.cartella) corse.add(voce.origine.cartella);
}

// Le partite NON si prendono dalle richieste: si contano negli eventi di ogni
// corsa. Ogni partita online produce un "esito-partita" per ciascuno dei due
// giocatori, quindi il numero vero è la metà degli eventi.
let partite = 0;
for (const cartellaCorsa of corse) {
    const percorso = path.join(cartellaCorsa, 'eventi.jsonl');
    if (!fs.existsSync(percorso)) continue;
    const righe = fs.readFileSync(percorso, 'utf8').split('\n').filter(Boolean);
    let esiti = 0;
    for (const riga of righe) {
        try { if (JSON.parse(riga).firma === 'esito-partita') esiti += 1; } catch (errore) { /* riga rotta */ }
    }
    partite += Math.round(esiti / 2);
}

const markdown = richieste.costruisciTriage(elenco, {
    corse: corse.size || 1,
    partite: partite,
    richiesteTotali: storico.length
});

const uscita = path.join(cartella, 'RICHIESTE.md');
fs.writeFileSync(uscita, markdown, 'utf8');

console.log('Rigenerato: ' + uscita);
console.log('Richieste: ' + storico.length + ' · gruppi: ' + elenco.length + ' · corse: ' + corse.size);
console.log('');
for (const gruppo of elenco.slice(0, 10)) {
    console.log('  peso ' + String(gruppo.peso).padStart(4) + '  ' + gruppo.tipo.padEnd(15) +
        gruppo.titolo.slice(0, 62));
}
