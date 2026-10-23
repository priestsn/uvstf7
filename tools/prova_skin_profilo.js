// tools/prova_skin_profilo.js — i due difetti trovati giocando devono restare chiusi.
//
// 1. la skin comprata spariva dal client dopo un ricaricamento
// 2. l'amico non si poteva sfidare direttamente (la richiesta più votata)
//
// Qui si controlla il CONTRATTO nel codice del client: è una guardia di
// regressione, non una prova di comportamento. La prova di comportamento la fa
// lo sciame (`--vite`): se la skin non si indossa più, il giocatore lo segnala
// come anomalia `skin-non-addosso` e il rapporto la mette in cima.
//
// Nota su una strada che NON funziona: caricare js/Skins.js e js/Account.js in un
// contesto `vm` non serve a provare il comportamento. Verificato: le funzioni
// dichiarate nel secondo file non risultano nel contesto (typeof aplicaProfilo
// vale undefined) nemmeno concatenando le sorgenti. Non riprenderla.

const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
const risultati = [];

function verifica(nome, condizione, dettaglio) {
    risultati.push(!!condizione);
    console.log((condizione ? 'OK       ' : 'FALLITO  ') + nome.padEnd(58) + (dettaglio || ''));
}

const account = fs.readFileSync(path.join(RADICE, 'js', 'Account.js'), 'utf8');
const amici = fs.readFileSync(path.join(RADICE, 'js', 'Amici.js'), 'utf8');

// ==========================================
// 1. le skin entrano nello stato dell'account
// ==========================================

verifica('statoAccount dichiara il campo skins',
    /skins:\s*\[\]/.test(account));

verifica('applicaProfilo copia le skin che arrivano dal server',
    /statoAccount\.skins\s*=\s*profilo\.skins/.test(account));

verifica("uscendo dall'account le skin vengono azzerate",
    /statoAccount\.lottatori\s*=\s*\[\];\s*\r?\n\s*statoAccount\.skins\s*=\s*\[\]/.test(account));

verifica("il negozio non è più l'unico posto che riempie le skin",
    (account.match(/statoAccount\.skins\s*=/g) || []).length >= 2);

// ==========================================
// 2. la sfida a un amico è raggiungibile
// ==========================================

verifica('esiste la funzione sfidaAmico', /function sfidaAmico\s*\(/.test(amici));
verifica('esiste la funzione entraNellaStanzaDi', /function entraNellaStanzaDi\s*\(/.test(amici));

verifica('SFIDA crea la stanza riusando il gioco online',
    /function sfidaAmico[\s\S]{0,700}creaStanzaOnline\s*\(/.test(amici));

verifica('ENTRA apre il campo per il codice',
    /function entraNellaStanzaDi[\s\S]{0,700}apriIngressoOnline\s*\(/.test(amici));

verifica('ogni amico ha il pulsante SFIDA', /testo:\s*'SFIDA'/.test(amici));
verifica('ogni amico ha il pulsante ENTRA', /testo:\s*'ENTRA'/.test(amici));

// ==========================================
// 3. l'economia regge il negozio
// ==========================================

const regole = JSON.parse(fs.readFileSync(path.join(RADICE, 'dati', 'regole.json'), 'utf8'));
const negozio = JSON.parse(fs.readFileSync(path.join(RADICE, 'dati', 'negozio.json'), 'utf8')).voci;
const pagati = negozio.filter((v) => v.prezzo > 0).map((v) => v.prezzo);
const minimo = Math.min.apply(null, pagati);

// quante partite servono, vincendo una su due, per il primo acquisto
const mediaVittoria = regole.punti.rankedVinta / 2 + regole.punti.rankedPersa / 2;
const partitePerPrimoAcquisto = Math.ceil((minimo - 500) / mediaVittoria);

// Sette vittorie secche devono bastare per il primo acquisto: è il metro con
// cui si misura se il negozio è raggiungibile, non un numero buttato lì.
verifica('la voce più economica costa al massimo sette vittorie',
    minimo <= regole.punti.rankedVinta * 7, 'minimo ' + minimo + ', vittoria ' + regole.punti.rankedVinta);
verifica('il primo acquisto arriva entro 10 partite vincendone una su due',
    partitePerPrimoAcquisto <= 10, partitePerPrimoAcquisto + ' partite');
verifica('perdere non è inutile: la sconfitta paga almeno un terzo della vittoria',
    regole.punti.rankedPersa * 3 >= regole.punti.rankedVinta,
    regole.punti.rankedPersa + ' contro ' + regole.punti.rankedVinta);
verifica('il pareggio sta fra vittoria e sconfitta',
    regole.punti.rankedPari > regole.punti.rankedPersa && regole.punti.rankedPari < regole.punti.rankedVinta);

const passate = risultati.filter(Boolean).length;
console.log('\n' + passate + '/' + risultati.length + ' verifiche passate');
process.exit(passate === risultati.length ? 0 : 1);
