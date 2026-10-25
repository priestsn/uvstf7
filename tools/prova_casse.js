// tools/prova_casse.js — le casse del negozio, senza browser.
//
// Una cassa si sbaglia in tre modi: fa uscire un doppione, fa pagare quando non
// c'è più niente da vincere, oppure lascia decidere al client. Qui si
// controllano tutti e tre, più il rispetto delle probabilità dichiarate.
const path = require('path');
const account = require(path.join(__dirname, '..', 'server', 'account.js'));

const risultati = [];
function verifica(nome, condizione, dettaglio) {
    risultati.push(!!condizione);
    console.log((condizione ? 'OK       ' : 'FALLITO  ') + nome.padEnd(56) + (dettaglio || ''));
}

// magazzino finto: tiene tutto in memoria
function magazzinoFinto() {
    const file = {};
    return {
        leggi: (nome) => file[nome] || null,
        scrivi: (nome, dati) => { file[nome] = JSON.parse(JSON.stringify(dati)); },
        file: file
    };
}

function giocatoreFinto(punti) {
    return {
        id: 'prova', nick: 'Prova', punti: punti,
        personaggi: ['OusmaneDiouf', 'KwameMensah', 'ChidiOkonkwo', 'AmaraDiallo', 'TarisaiMoyo', 'ZuriNkosi'],
        skins: []
    };
}

const negozio = account.negozio();
verifica('il negozio dichiara tre casse', (negozio.casse || []).length === 3,
    (negozio.casse || []).length + ' casse');
verifica('le casse hanno id, nome, prezzo e premi',
    (negozio.casse || []).every((c) => c.id && c.nome && typeof c.prezzo === 'number' && Array.isArray(c.premi)));
verifica('le tre rarity sono comune, rara, epica',
    (negozio.casse || []).map((c) => c.id).join(',') === 'comune,rara,epica',
    (negozio.casse || []).map((c) => c.id).join(','));

// --- apertura normale ---
let magazzino = magazzinoFinto();
let giocatore = giocatoreFinto(5000);
let esito = account.apriCassa(magazzino, giocatore, 'comune', () => 0.5);
verifica('la cassa si apre', esito.ok === true, esito.messaggio || '');
verifica('i punti sono scalati del prezzo', giocatore.punti === 5000 - 400, 'punti ' + giocatore.punti);
verifica('è uscito qualcosa con un nome', !!(esito.vinto && esito.vinto.nome), JSON.stringify(esito.vinto));
verifica('quello che esce viene aggiunto al giocatore',
    esito.vinto.tipo === 'skin'
        ? giocatore.skins.length === 1
        : giocatore.personaggi.includes(esito.vinto.personaggio));

// --- nessun doppione ---
magazzino = magazzinoFinto();
giocatore = giocatoreFinto(200000);
const usciti = new Set();
let doppioni = 0;
for (let i = 0; i < 60; i++) {
    const prima = { skins: giocatore.skins.length, personaggi: giocatore.personaggi.length };
    const colpo = account.apriCassa(magazzino, giocatore, 'comune', Math.random);
    if (!colpo.ok) break;
    const chiave = colpo.vinto.tipo === 'skin'
        ? colpo.vinto.personaggio + ':' + colpo.vinto.skin
        : colpo.vinto.personaggio;
    if (usciti.has(chiave)) doppioni += 1;
    usciti.add(chiave);
    if (giocatore.skins.length === prima.skins && giocatore.personaggi.length === prima.personaggi) {
        doppioni += 1;
    }
}
verifica('sessanta aperture non danno mai un doppione', doppioni === 0, doppioni + ' doppioni');
verifica('prima o poi finisce il contenuto', usciti.size > 10, usciti.size + ' premi distinti');

// --- cassa vuota: non si paga ---
magazzino = magazzinoFinto();
giocatore = giocatoreFinto(50000);
giocatore.skins = negozio.voci.filter((v) => v.skin).map((v) => account.chiaveVoce(v));
giocatore.personaggi = negozio.voci.filter((v) => !v.skin).map((v) => v.personaggio);
const primaPunti = giocatore.punti;
esito = account.apriCassa(magazzino, giocatore, 'epica', () => 0.5);
verifica('se possiedi tutto la cassa non si apre', esito.ok === false, esito.messaggio || '');
verifica('e i punti non vengono toccati', giocatore.punti === primaPunti, 'punti ' + giocatore.punti);

// --- punti insufficienti ---
magazzino = magazzinoFinto();
giocatore = giocatoreFinto(100);
esito = account.apriCassa(magazzino, giocatore, 'epica', () => 0.5);
verifica('senza punti la cassa non si apre', esito.ok === false && esito.stato === 402, esito.messaggio || '');
verifica('e i punti restano quelli', giocatore.punti === 100);

// --- cassa inesistente ---
esito = account.apriCassa(magazzino, giocatoreFinto(1000), 'inesistente', () => 0.5);
verifica('una cassa che non esiste risponde 404', esito.ok === false && esito.stato === 404);

// --- i pesi contano: l'epica dà verdellinesi più spesso della comune ---
function contaPersonaggi(idCassa, gettate) {
    const mag = magazzinoFinto();
    let personaggi = 0;
    for (let i = 0; i < gettate; i++) {
        const g = giocatoreFinto(1000000);
        const colpo = account.apriCassa(mag, g, idCassa, Math.random);
        if (colpo.ok && colpo.vinto.tipo === 'personaggio') personaggi += 1;
    }
    return personaggi / gettate;
}
const comune = contaPersonaggi('comune', 200);
const epica = contaPersonaggi('epica', 200);
verifica('la cassa epica dà verdellinesi più della comune', epica > comune,
    'comune ' + Math.round(comune * 100) + '% · epica ' + Math.round(epica * 100) + '%');
verifica('la comune dà un verdellinese in meno di un terzo dei casi', comune < 0.33,
    Math.round(comune * 100) + '%');

const passate = risultati.filter(Boolean).length;
console.log('\n' + passate + '/' + risultati.length + ' verifiche passate');
process.exit(passate === risultati.length ? 0 : 1);
