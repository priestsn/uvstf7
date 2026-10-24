// tools/prova_cutscene.js — i copioni delle cutscene, verificati senza browser.
//
// Una cutscene si sbaglia in due modi: non copre tutti i verdellinesi, oppure
// dura tanto da sembrare un'interruzione. Qui si controllano entrambe, più la
// regola che rende le scene ripetibili: la stessa ultimate deve dare sempre la
// stessa scena, perché l'online la esegue due volte su due macchine diverse.

const path = require('path');
const cut = require(path.join(__dirname, '..', 'js', 'Cutscene.js'));

const risultati = [];
function verifica(nome, condizione, dettaglio) {
    risultati.push(!!condizione);
    console.log((condizione ? 'OK       ' : 'FALLITO  ') + nome.padEnd(60) + (dettaglio || ''));
}

// --- i nove copioni ------------------------------------------------------

verifica('ci sono nove copioni', cut.COPIONI.length === 9,
    'nove attesi, ' + cut.COPIONI.length + ' trovati');

const nomi = cut.COPIONI.map(function (c) { return c.verdellinese; });
verifica('ogni verdellinese ha il suo', new Set(nomi).size === 9);

verifica('gli identificativi sono quelli del gioco',
    nomi.join(',') === 'OusmaneDiouf,KwameMensah,ChidiOkonkwo,AmaraDiallo,TarisaiMoyo,' +
        'ZuriNkosi,BakariTraore,SekouCamara,AyoAdebayo',
    nomi.join(','));

verifica('ogni copione ha quattro fasi', cut.COPIONI.every(function (c) { return c.fasi.length === 4; }));
verifica('le fasi sono sipario, gesto, colpo, ritorno',
    cut.COPIONI.every(function (c) {
        return c.fasi.map(function (f) { return f.nome; }).join(',') === 'sipario,gesto,colpo,ritorno';
    }));
verifica('ogni copione ha il testo col nome della ultimate',
    cut.COPIONI.every(function (c) { return c.testo && c.testo.length > 5; }));
verifica('ogni copione ha il suo colore',
    cut.COPIONI.every(function (c) { return /^#[0-9a-f]{6}$/i.test(c.colore || ''); }));

// --- durate --------------------------------------------------------------

const durate = cut.COPIONI.map(function (c) { return cut.durataScenaCutscene(c); });
verifica('nessuna scena dura meno di un secondo', Math.min.apply(null, durate) >= 60,
    'minima ' + Math.min.apply(null, durate) + ' passi');
verifica('nessuna scena supera i due secondi e un quinto', Math.max.apply(null, durate) <= 132,
    'massima ' + Math.max.apply(null, durate) + ' passi');
verifica('la durata è la somma delle fasi',
    cut.COPIONI.every(function (c) {
        const somma = c.fasi.reduce(function (s, f) { return s + f.passi; }, 0);
        return somma === cut.durataScenaCutscene(c);
    }));

// --- il gesto unico ------------------------------------------------------

const gesti = cut.COPIONI.map(function (c) { return c.gesto; });
verifica('ogni scena ha un gesto dichiarato',
    gesti.every(function (g) { return typeof g === 'string' && g.length > 10; }));
verifica('i gesti sono tutti diversi', new Set(gesti).size === 9,
    new Set(gesti).size + ' gesti distinti');

// --- l'esecuzione --------------------------------------------------------

let scena = cut.avviaScenaCutscene('OusmaneDiouf');
verifica('la scena parte attiva dalla prima fase', scena.attiva === true && scena.fase === 0);
verifica('la prima fase si chiama sipario', cut.faseScenaCutscene(scena) === 'sipario');

for (let i = 0; i < 30; i++) scena = cut.avanzaScenaCutscene(scena);
verifica('dopo trenta passi si è nel gesto', cut.faseScenaCutscene(scena) === 'gesto',
    cut.faseScenaCutscene(scena));

const copioneAyo = cut.copioneScenaCutscene('AyoAdebayo');
const totale = cut.durataScenaCutscene(copioneAyo);
let lunga = cut.avviaScenaCutscene('AyoAdebayo');
for (let i = 0; i < totale + 40; i++) lunga = cut.avanzaScenaCutscene(lunga);
verifica('la scena finisce da sola', lunga.attiva === false, 'passi ' + lunga.passi);
verifica('l\'ultima fase è il ritorno', cut.faseScenaCutscene(lunga) === 'ritorno');

const uno = cut.avviaScenaCutscene('ChidiOkonkwo');
const due = cut.avviaScenaCutscene('ChidiOkonkwo');
verifica('due scene uguali partono identiche', JSON.stringify(uno) === JSON.stringify(due));

verifica('un verdellinese senza copione non fa partire niente',
    cut.avviaScenaCutscene('PersonaggioInventato').attiva === false);

// --- la fase del colpo arriva e viene una volta sola ---------------------

let c = cut.avviaScenaCutscene('OusmaneDiouf');
let vistiColpo = 0;
let precedente = cut.faseScenaCutscene(c);
for (let i = 0; i < cut.durataScenaCutscene(c.copione) + 5; i++) {
    c = cut.avanzaScenaCutscene(c);
    const attuale = cut.faseScenaCutscene(c);
    if (attuale === 'colpo' && precedente !== 'colpo') vistiColpo += 1;
    precedente = attuale;
}
verifica('la fase del colpo compare una volta sola', vistiColpo === 1, 'vista ' + vistiColpo + ' volte');

const passate = risultati.filter(Boolean).length;
console.log('\n' + passate + '/' + risultati.length + ' verifiche passate');
process.exit(passate === risultati.length ? 0 : 1);
