// tools/swarm/richieste.js
// Accumula le richieste dei giocatori di TUTTE le corse e ne fa un elenco unico,
// ordinato per quanto la gente ci tiene.
//
// Le richieste non vivono nella cartella della singola corsa: quella è la
// memoria di una notte, e una notte non basta per decidere cosa sviluppare.
// Vivono in bug_reports/richieste.jsonl, che cresce a ogni corsa.

const fs = require('fs');
const path = require('path');

const PERCORSO_STORICO = 'richieste.jsonl';
const PERCORSO_TRIAGE = 'RICHIESTE.md';

function percorsoStorico(cartellaBase) {
    return path.join(cartellaBase, PERCORSO_STORICO);
}

/** Aggiunge le richieste di una sessione allo storico condiviso. */
function accumula(cartellaBase, richieste, origine) {
    if (!richieste || !richieste.length) return 0;
    fs.mkdirSync(cartellaBase, { recursive: true });
    const quando = new Date().toISOString();

    // Scrittura SINCRONA di proposito: il triage rilegge lo storico subito dopo,
    // e con uno stream il file non era ancora sul disco (letto vuoto, rapporto
    // vuoto, e sembrava che le richieste non venissero salvate).
    const righe = richieste.map((richiesta) => JSON.stringify(Object.assign({}, richiesta, {
        quando: quando,
        origine: origine || null
    })));
    fs.appendFileSync(percorsoStorico(cartellaBase), righe.join('\n') + '\n', 'utf8');
    return richieste.length;
}

/** Rilegge tutto lo storico. Righe rotte si saltano, non fermano il rapporto. */
function leggiStorico(cartellaBase) {
    const percorso = percorsoStorico(cartellaBase);
    if (!fs.existsSync(percorso)) return [];
    const righe = fs.readFileSync(percorso, 'utf8').split('\n').filter(Boolean);
    const uscite = [];
    for (const riga of righe) {
        try { uscite.push(JSON.parse(riga)); } catch (errore) { /* riga corrotta */ }
    }
    return uscite;
}

/**
 * Raggruppa per chiave (tipo + titolo) e calcola quanto conta.
 *
 * Il punteggio non è il numero di volte che è stata detta: una richiesta detta
 * dieci volte da un solo carattere vale meno di una detta da cinque caratteri
 * diversi. Peso = menzioni × caratteri distinti × priorità massima.
 */
function raggruppa(storico) {
    const gruppi = new Map();

    for (const richiesta of storico) {
        const chiave = richiesta.chiave || (richiesta.tipo + ' ' + richiesta.titolo);
        if (!gruppi.has(chiave)) {
            gruppi.set(chiave, {
                chiave: chiave,
                tipo: richiesta.tipo,
                titolo: richiesta.titolo,
                menzioni: 0,
                caratteri: new Set(),
                nicks: new Set(),
                prioritaMassima: 0,
                primaVolta: richiesta.quando,
                ultimaVolta: richiesta.quando,
                esempi: [],
                fonti: []
            });
        }
        const gruppo = gruppi.get(chiave);
        gruppo.menzioni += 1;
        if (richiesta.carattere) gruppo.caratteri.add(richiesta.carattere);
        if (richiesta.nick) gruppo.nicks.add(richiesta.nick);
        gruppo.prioritaMassima = Math.max(gruppo.prioritaMassima, richiesta.priorita || 1);
        if (richiesta.quando && richiesta.quando > gruppo.ultimaVolta) gruppo.ultimaVolta = richiesta.quando;
        if (richiesta.quando && richiesta.quando < gruppo.primaVolta) gruppo.primaVolta = richiesta.quando;
        if (gruppo.esempi.length < 3 && richiesta.testo && !gruppo.esempi.includes(richiesta.testo)) {
            gruppo.esempi.push(richiesta.testo);
        }
        if (richiesta.fonte && gruppo.fonti.length < 3) {
            gruppo.fonti.push(richiesta.fonte);
        }
    }

    const elenco = Array.from(gruppi.values()).map((gruppo) => {
        const quantiCaratteri = gruppo.caratteri.size;
        return Object.assign({}, gruppo, {
            caratteri: Array.from(gruppo.caratteri),
            nicks: Array.from(gruppo.nicks),
            peso: gruppo.menzioni * Math.max(1, quantiCaratteri) * gruppo.prioritaMassima
        });
    });

    elenco.sort((a, b) => b.peso - a.peso || b.menzioni - a.menzioni);
    return elenco;
}

const NOMI_TIPO = {
    bug: 'Difetti (da correggere)',
    bilanciamento: 'Bilanciamento',
    funzionalita: 'Funzionalità nuove',
    economia: 'Economia e negozio',
    usabilita: 'Usabilità e chiarezza'
};

function dataBreve(iso) {
    if (!iso) return '?';
    return iso.slice(0, 16).replace('T', ' ');
}

/**
 * Costruisce il documento per decidere cosa sviluppare.
 * @param {Array} elenco  risultato di raggruppa()
 * @param {object} extra  {partite, corse, richiesteTotali}
 */
function costruisciTriage(elenco, extra) {
    const opzioni = extra || {};
    const perTipo = {};
    for (const gruppo of elenco) {
        perTipo[gruppo.tipo] = perTipo[gruppo.tipo] || [];
        perTipo[gruppo.tipo].push(gruppo);
    }

    const righe = [];
    righe.push('# Cosa vogliono i giocatori');
    righe.push('');
    righe.push('Raccolte da ' + (opzioni.corse || 0) + ' corse, ' + (opzioni.partite || 0) +
        ' partite, ' + (opzioni.richiesteTotali || 0) + ' richieste.');
    righe.push('Aggiornato: ' + new Date().toLocaleString('it-IT'));
    righe.push('');
    righe.push('Il **peso** è menzioni × caratteri distinti × priorità: una cosa chiesta da');
    righe.push('cinque caratteri diversi conta più di una ripetuta dieci volte dallo stesso.');
    righe.push('');
    righe.push('Nota: i rilievi sul bilanciamento sono la **vista del singolo giocatore** — due');
    righe.push('giocatori della stessa partita possono dire "perdo sempre" e "vinco troppo facile".');
    righe.push('Non si contraddicono: descrivono lo stesso squilibrio dai due lati.');
    righe.push('');

    // ordine dei tipi: prima i difetti, poi quello che vorrebbero
    for (const tipo of ['bug', 'bilanciamento', 'economia', 'usabilita', 'funzionalita']) {
        const gruppo = perTipo[tipo];
        if (!gruppo || !gruppo.length) continue;

        righe.push('## ' + (NOMI_TIPO[tipo] || tipo));
        righe.push('');
        for (const voce of gruppo) {
            const stelle = voce.peso >= 12 ? '***' : voce.peso >= 6 ? '**' : '*';
            righe.push('### ' + stelle + ' ' + voce.titolo);
            righe.push('');
            righe.push('- peso **' + voce.peso + '** · ' + voce.menzioni + ' menzioni · ' +
                voce.caratteri.length + ' caratteri (' + voce.caratteri.join(', ') + ')');
            righe.push('- visto da ' + voce.primaVolta.slice(0, 10) + ' a ' + voce.ultimaVolta.slice(0, 10));
            if (voce.fonti.length) {
                const fonte = voce.fonti[0];
                const pezzi = Object.keys(fonte).map((chiave) => chiave + ': ' + fonte[chiave]);
                righe.push('- fonte: ' + pezzi.join(', '));
            }
            if (voce.esempi.length) {
                righe.push('');
                for (const esempio of voce.esempi) {
                    righe.push('> ' + esempio);
                    righe.push('>');
                }
                // toglie l'ultima riga vuota del blocco citazione
                if (righe[righe.length - 1] === '>') righe.pop();
            }
            righe.push('');
        }
    }

    if (!elenco.length) {
        righe.push('_Nessuna richiesta raccolta: lo sciame non ha ancora giocato con account._');
        righe.push('');
    }

    return righe.join('\n');
}

/** Scrive lo storico e il triage, e torna un riassunto per la console. */
function rilancia(cartellaBase, nuove, origine, opzioni) {
    const quante = accumula(cartellaBase, nuove, origine);
    const storico = leggiStorico(cartellaBase);
    const elenco = raggruppa(storico);

    // Le corse si contano dalle origini presenti nello storico: passarle a mano
    // faceva scrivere "raccolte da 1 corse" anche dopo dieci notti.
    const corse = new Set();
    for (const richiesta of storico) {
        if (richiesta.origine && richiesta.origine.cartella) corse.add(richiesta.origine.cartella);
    }

    const markdown = costruisciTriage(elenco, Object.assign({
        richiesteTotali: storico.length,
        corse: corse.size || 1
    }, opzioni || {}));
    fs.mkdirSync(cartellaBase, { recursive: true });
    fs.writeFileSync(path.join(cartellaBase, PERCORSO_TRIAGE), markdown, 'utf8');
    return { aggiunte: quante, totale: storico.length, gruppi: elenco.length, elenco: elenco };
}

module.exports = {
    accumula,
    leggiStorico,
    raggruppa,
    costruisciTriage,
    rilancia,
    percorsoStorico
};
