// tools/swarm/giocatore.js
// Un giocatore dello sciame: una persona con un carattere, un account, dei punti
// e una memoria di quello che gli dà fastidio.
//
// Differenza rispetto ai bot di prima: prima erano sonde travestite da giocatori
// (premevano tasti e misuravano). Questi sono persone finte: si iscrivono, si
// aggiungono agli amici, comprano, si arrabbiano e chiedono cose.
//
// Nessuna dipendenza esterna: solo fetch (Node 22) e il filesystem.

const fs = require('fs');
const path = require('path');

// ==========================================
// I caratteri
// ==========================================
// Ogni carattere decide COSA gli dà fastidio e COME lo dice. Servono a variare
// le richieste: se tutti i bot lamentassero le stesse cose, il rapporto sarebbe
// una riga sola ripetuta cento volte.

const CARATTERI = [
    {
        nome: 'aggressivo',
        pazienza: 0.35,          // quanto aspetta prima di lamentarsi (bassa = insofferente)
        stileGioco: 'attacco',
        fissaSu: ['colpi che non entrano', 'parata troppo forte', 'ultimate debole'],
        voce: 'secco e diretto, senza giri di parole, qualche parola in maiuscolo',
        spendePunti: true
    },
    {
        nome: 'tecnico',
        pazienza: 0.7,
        stileGioco: 'misto',
        fissaSu: ['frame di recupero', 'hitbox', 'latenza online', 'desync'],
        voce: 'preciso, cita numeri e situazioni concrete, tono da chi studia il gioco',
        spendePunti: false
    },
    {
        nome: 'collezionista',
        pazienza: 0.8,
        stileGioco: 'difesa',
        fissaSu: ['skin troppo care', 'punti che si guadagnano piano', 'negozio che non cambia'],
        voce: 'entusiasta di estetica, si lamenta del prezzo ma compra lo stesso',
        spendePunti: true
    },
    {
        nome: 'casual',
        pazienza: 0.5,
        stileGioco: 'difesa',
        fissaSu: ['non capisco cosa devo fare', 'troppo difficile', 'menu confusionario'],
        voce: 'semplice e un po\' confuso, scrive come parla, frasi corte',
        spendePunti: true
    },
    {
        nome: 'veterano',
        pazienza: 0.4,
        stileGioco: 'attacco',
        fissaSu: ['bilanciamento', 'personaggi forti', 'classifica che non premia'],
        voce: 'uno che gioca da tanto, confronta con altri giochi, pretende di più',
        spendePunti: false
    },
    {
        nome: 'sociale',
        pazienza: 0.9,
        stileGioco: 'misto',
        fissaSu: ['amici', 'chat assente', 'nessuna modalità condivisa'],
        voce: 'gentile, parla di community e di giocare con gli altri',
        spendePunti: true
    }
];

function caratterePerIndice(indice) {
    return CARATTERI[(indice - 1) % CARATTERI.length];
}

// ==========================================
// Chiamate all'API del gioco
// ==========================================

async function api(base, percorso, corpo, token) {
    const intestazioni = { 'Content-Type': 'application/json' };
    if (token) intestazioni.Authorization = 'Bearer ' + token;

    const risposta = await fetch(base.replace(/\/$/, '') + percorso, {
        method: corpo === undefined ? 'GET' : 'POST',
        headers: intestazioni,
        body: corpo === undefined ? undefined : JSON.stringify(corpo)
    });

    const testo = await risposta.text();
    let dati = null;
    try { dati = JSON.parse(testo); } catch (errore) { dati = { testoGrezzo: testo }; }

    if (!risposta.ok) {
        const errore = new Error('API ' + percorso + ' → HTTP ' + risposta.status + ': ' + testo.slice(0, 200));
        errore.stato = risposta.status;
        errore.dati = dati;
        throw errore;
    }
    return dati;
}

// ==========================================
// Account persistenti
// ==========================================
// Se un account esiste già si riusa (accesso), altrimenti si iscrive. Serve
// perché le amicizie e i punti devono accumularsi fra una sessione e l'altra:
// un giocatore che si reiscrive ogni volta riparte da zero e non può comprare.

function percorsoGiocatori(cartella) {
    return path.join(cartella, 'giocatori.json');
}

function leggiGiocatori(cartella) {
    try {
        return JSON.parse(fs.readFileSync(percorsoGiocatori(cartella), 'utf8'));
    } catch (errore) {
        return {};
    }
}

function salvaGiocatori(cartella, dati) {
    fs.mkdirSync(cartella, { recursive: true });
    fs.writeFileSync(percorsoGiocatori(cartella), JSON.stringify(dati, null, 2), 'utf8');
}

/**
 * Restituisce un account utilizzabile per questo carattere.
 * Prova prima l'accesso (account già noto), poi l'iscrizione.
 */
async function accountPer(base, cartella, indice, carattere) {
    const memoria = leggiGiocatori(cartella);
    const chiave = 'bot' + indice;
    const noto = memoria[chiave];

    if (noto && noto.nick && noto.password) {
        try {
            const esito = await api(base, '/api/accesso', { nick: noto.nick, password: noto.password });
            if (esito && esito.token) {
                memoria[chiave] = Object.assign({}, noto, { token: esito.token, ultimoAccesso: new Date().toISOString() });
                salvaGiocatori(cartella, memoria);
                return { nick: noto.nick, token: esito.token, nuovo: false };
            }
        } catch (errore) {
            // account sparito o password cambiata: si riparte con uno nuovo
        }
    }

    const casuale = Math.random().toString(36).slice(2, 7);
    const nick = 'Swarm' + indice + carattere.nome.slice(0, 3).toUpperCase() + casuale;
    const password = 'p' + casuale + Math.random().toString(36).slice(2, 6);

    const esito = await api(base, '/api/iscrizione', { nick: nick, password: password });
    const token = (esito && esito.token) || (esito && esito.dati && esito.dati.token);
    if (!token) throw new Error('iscrizione senza token: ' + JSON.stringify(esito).slice(0, 200));

    memoria[chiave] = { nick: nick, password: password, token: token, carattere: carattere.nome, creato: new Date().toISOString() };
    salvaGiocatori(cartella, memoria);
    return { nick: nick, token: token, nuovo: true };
}

// ==========================================
// Amicizie
// ==========================================

async function cercaGiocatore(base, token, nick) {
    const esito = await api(base, '/api/amici/cerca', { nick: nick }, token);
    return (esito && (esito.risultati || esito.giocatori)) || [];
}

async function chiediAmicizia(base, token, nick) {
    return api(base, '/api/amici/chiedi', { nick: nick }, token);
}

async function accettaAmicizia(base, token, nick) {
    return api(base, '/api/amici/accetta', { nick: nick }, token);
}

async function elencoAmici(base, token) {
    const esito = await api(base, '/api/amici', undefined, token);
    return esito || {};
}

// ==========================================
// Negozio, punti, skin
// ==========================================

async function negozioDi(base, token) {
    return api(base, '/api/negozio', undefined, token);
}

async function acquistaVoce(base, token, chiave) {
    // L'API legge `corpo.chiave` (o `personaggio` per i client vecchi), NON
    // `voce`: con il campo sbagliato arriva 404 "Lottatore non presente nel
    // negozio" anche su una voce che il negozio ha appena elencato.
    return api(base, '/api/negozio/acquisto', { chiave: chiave }, token);
}

/**
 * Compra qualcosa che si può permettere. Sceglie la voce più cara che i punti
 * coprono: è quello che fa un giocatore che vuole sfoggiare, non il più economico.
 */
function scegliAcquisto(negozio) {
    // Forma reale di GET /api/negozio: {punti, voci: [{chiave, personaggio,
    // skin, nome, prezzo, ottenuto, icona}]}. Una voce sola per tutto, con
    // `ottenuto` a dire se è già tua.
    const voci = (negozio.voci || []).map((voce) => ({
        chiave: voce.chiave,
        nome: voce.nome || (voce.personaggio + (voce.skin ? ' — ' + voce.skin : '')),
        costo: voce.prezzo || 0,
        tipo: voce.skin ? 'skin' : 'verdellinese',
        posseduta: !!voce.ottenuto
    }));

    const punti = negozio.punti || 0;
    const comprabili = voci
        .filter((voce) => !voce.posseduta && voce.costo > 0 && voce.costo <= punti)
        .sort((a, b) => b.costo - a.costo);

    return { punti: punti, scelta: comprabili[0] || null, totaleVoci: voci.length, comprabili: comprabili.length };
}

// ==========================================
// Classifica e profilo
// ==========================================

async function profiloDi(base, token) {
    return api(base, '/api/profilo', undefined, token);
}

async function classifica(base) {
    return api(base, '/api/classifica', undefined, null);
}

module.exports = {
    CARATTERI,
    caratterePerIndice,
    api,
    accountPer,
    cercaGiocatore,
    chiediAmicizia,
    accettaAmicizia,
    elencoAmici,
    negozioDi,
    acquistaVoce,
    scegliAcquisto,
    profiloDi,
    classifica,
    leggiGiocatori,
    salvaGiocatori
};
