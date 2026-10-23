// tools/prova_swarm_vite.js — i giocatori veri: caratteri, acquisti, richieste.
// Puro: nessuna rete, nessun browser. Si provano le regole che decidono COSA
// chiede un giocatore e COME le richieste si accumulano.

const fs = require('fs');
const os = require('os');
const path = require('path');

const giocatore = require(path.join(__dirname, 'swarm', 'giocatore.js'));
const desideri = require(path.join(__dirname, 'swarm', 'desideri.js'));
const richieste = require(path.join(__dirname, 'swarm', 'richieste.js'));

const risultati = [];
function verifica(nome, condizione, dettaglio) {
    risultati.push(!!condizione);
    console.log((condizione ? 'OK   ' : 'NO   ') + nome + (dettaglio ? '  [' + dettaglio + ']' : ''));
}

// ---------- i caratteri ----------
verifica('ci sono almeno 5 caratteri diversi', giocatore.CARATTERI.length >= 5,
    String(giocatore.CARATTERI.length));

const nomiCaratteri = new Set(giocatore.CARATTERI.map((c) => c.nome));
verifica('i nomi dei caratteri sono tutti diversi', nomiCaratteri.size === giocatore.CARATTERI.length);

verifica('ogni carattere dice a cosa è sensibile',
    giocatore.CARATTERI.every((c) => Array.isArray(c.fissaSu) && c.fissaSu.length > 0));

verifica('ogni carattere ha una voce (come parla)',
    giocatore.CARATTERI.every((c) => typeof c.voce === 'string' && c.voce.length > 10));

verifica('chi ha pazienza bassa si lamenta prima',
    giocatore.CARATTERI.some((c) => c.pazienza <= 0.4) &&
    giocatore.CARATTERI.some((c) => c.pazienza >= 0.8));

verifica('il carattere si sceglie per indice e ruota',
    giocatore.caratterePerIndice(1) !== giocatore.caratterePerIndice(2));

// ---------- gli acquisti, con la forma VERA dell'API ----------
const negozioFinto = {
    punti: 1200,
    voci: [
        { chiave: 'KwameMensah', personaggio: 'KwameMensah', skin: null, nome: null, prezzo: 800, ottenuto: false },
        { chiave: 'AmaraDiallo', personaggio: 'AmaraDiallo', skin: null, nome: null, prezzo: 500, ottenuto: false },
        { chiave: 'ZuriNkosi:Ombrosa', personaggio: 'ZuriNkosi', skin: 'Ombrosa', nome: 'Ombrosa', prezzo: 2000, ottenuto: false },
        { chiave: 'SekouCamara', personaggio: 'SekouCamara', skin: null, nome: null, prezzo: 300, ottenuto: true }
    ]
};

const scelta = giocatore.scegliAcquisto(negozioFinto);
verifica('compra la voce più cara che può permettersi', scelta.scelta && scelta.scelta.chiave === 'KwameMensah',
    scelta.scelta && scelta.scelta.chiave);
verifica('non ricompra quello che ha già', scelta.totaleVoci === 4 && scelta.scelta.chiave !== 'SekouCamara');
verifica('non sceglie roba fuori portata', scelta.scelta.chiave !== 'ZuriNkosi:Ombrosa');
verifica('conta quante voci sono comprabili', scelta.comprabili === 2, String(scelta.comprabili));

const povero = giocatore.scegliAcquisto({ punti: 10, voci: negozioFinto.voci });
verifica('senza punti non compra niente', povero.scelta === null && povero.comprabili === 0);

const vuoto = giocatore.scegliAcquisto({});
verifica('negozio vuoto non fa esplodere niente', vuoto.scelta === null && vuoto.totaleVoci === 0);

// ---------- cosa pretende un giocatore ----------
const sessionePessima = {
    carattere: giocatore.caratterePerIndice(1),
    nick: 'Swarm1AGGabc',
    partite: 6, vinte: 1, perse: 5, amici: 0,
    negozio: { punti: 50, comprabili: 0, totaleVoci: 9 },
    anomalie: [
        { firma: 'colpo-senza-danno', messaggio: 'il colpo non ha fatto danno' },
        { firma: 'colpo-senza-danno', messaggio: 'il colpo non ha fatto danno' },
        { firma: 'colpo-senza-danno', messaggio: 'il colpo non ha fatto danno' }
    ]
};

const suePessime = desideri.generaRichieste(sessionePessima);
const tipiPessimi = new Set(suePessime.map((r) => r.tipo));

verifica('un difetto visto diventa una richiesta di correzione', tipiPessimi.has('bug'));
verifica('tre occorrenze alzano la priorità a 3',
    suePessime.some((r) => r.tipo === 'bug' && r.priorita === 3));
verifica('perdere sempre produce una richiesta di bilanciamento', tipiPessimi.has('bilanciamento'));
verifica('non poter comprare niente produce una richiesta sull\'economia', tipiPessimi.has('economia'));
verifica('chiede sempre almeno una funzionalità nuova', tipiPessimi.has('funzionalita'));
verifica('ogni richiesta porta la fonte del fatto che l\'ha generata',
    suePessime.every((r) => r.fonte !== null));
verifica('ogni richiesta ha una chiave stabile per essere accumulata',
    suePessime.every((r) => typeof r.chiave === 'string' && r.chiave.length > 3));
verifica('il testo è scritto in italiano e non è un codice',
    suePessime.every((r) => r.testo.split(' ').length >= 8));

const sessioneOttima = {
    carattere: giocatore.caratterePerIndice(2),
    nick: 'Swarm2TECdef',
    partite: 6, vinte: 6, perse: 0, amici: 3,
    negozio: { punti: 3000, comprabili: 4, totaleVoci: 9 },
    anomalie: []
};
const sueOttime = desideri.generaRichieste(sessioneOttima);
verifica('chi vince sempre non chiede bug inesistenti',
    !sueOttime.some((r) => r.tipo === 'bug'));
verifica('vincere sempre è comunque un segnale da segnalare',
    sueOttime.some((r) => r.tipo === 'bilanciamento'));
verifica('chi ha amici non chiede il pulsante "aggiungi dopo la partita"',
    !sueOttime.some((r) => r.titolo.indexOf('aggiungere chi hai appena sfidato') !== -1));

// ---------- accumulo e triage ----------
const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'uvsf7-richieste-'));

const giro1 = richieste.rilancia(cartella, suePessime, { corsa: 'prova-1' }, { corse: 1, partite: 6 });
verifica('la prima corsa scrive lo storico', giro1.aggiunte === suePessime.length,
    String(giro1.aggiunte) + ' richieste');
verifica('lo storico è un file JSONL rileggibile',
    richieste.leggiStorico(cartella).length === suePessime.length);

const giro2 = richieste.rilancia(cartella, suePessime, { corsa: 'prova-2' }, { corse: 2, partite: 12 });
verifica('la seconda corsa si aggiunge invece di sovrascrivere',
    giro2.totale === suePessime.length * 2, String(giro2.totale));

const gruppi = richieste.raggruppa(richieste.leggiStorico(cartella));
const gruppoBug = gruppi.find((g) => g.tipo === 'bug');
// Dentro una sessione lo stesso difetto è UNA richiesta (con le occorrenze nel
// testo e nella priorità): qui ci sono 2 sessioni, quindi 2 menzioni.
verifica('lo stesso difetto visto in sessioni diverse si accumula in un gruppo',
    !!gruppoBug && gruppoBug.menzioni === 2, gruppoBug && String(gruppoBug.menzioni));
verifica('il gruppo dice quante volte quel difetto è stato visto in una sessione',
    !!gruppoBug && gruppoBug.esempi[0].indexOf('3 volte') !== -1,
    gruppoBug && gruppoBug.esempi[0]);

verifica('il peso cresce con le menzioni',
    gruppi[0].peso >= gruppi[gruppi.length - 1].peso);

const markdown = fs.readFileSync(path.join(cartella, 'RICHIESTE.md'), 'utf8');
verifica('il documento si apre con il titolo giusto', markdown.indexOf('# Cosa vogliono i giocatori') === 0);
verifica('il documento separa i difetti da quello che vorrebbero',
    markdown.indexOf('## Difetti') !== -1 && markdown.indexOf('## Funzionalità nuove') !== -1);
verifica('il documento cita le parole vere dei giocatori', markdown.indexOf('> ') !== -1);
verifica('il documento dice da quando a quando è stata vista', markdown.indexOf('- visto da ') !== -1);

fs.rmSync(cartella, { recursive: true, force: true });

const passate = risultati.filter(Boolean).length;
console.log('\n' + passate + '/' + risultati.length + ' verifiche passate');
process.exit(passate === risultati.length ? 0 : 1);
