// tools/swarm/politica.js
// Le decisioni di un bot: da uno stato di gioco a una o più azioni.
// Puro di proposito: nessun accesso al DOM e casuale iniettabile con seme, così
// una partita si può rigiocare identica per riprodurre un difetto.
//
// Perché non decide Jev: la latenza misurata di Jev è ~0,7 s per chiamata, il
// gioco avanza di 60 passi al secondo. Il pilota è questo file, il giudice è
// giudice.js.

const DISTANZA_ATTACCO = 150;      // px: oltre, un attacco è un colpo a vuoto
const STAMINA_MINIMA_CARICA = 40;  // sotto questa soglia si attacca normale
const FINESTRA_PARATA = 220;       // px: sotto questa distanza conviene parare
const PROBABILITA_SALTO = 0.08;

// Le meccaniche nuove vanno provate, non solo scritte. Senza queste azioni lo
// sciame giocava la build con combo, tattiche e ultimate senza mai usarle:
// misurate zero cutscene e zero combo in una corsa intera.
const PROBABILITA_TATTICA = 0.06;   // ogni decisione: un tiro di dado per la tattica
const PROBABILITA_TIRO = 0.10;      // l'attacco a distanza, quando c'è spazio
const PROBABILITA_CARICA = 0.18;    // il colpo caricato apre la combo: serve provarlo
const DISTANZA_TIRO = 420;          // px: oltre questa distanza conviene il tiro
const SOGLIA_CARICA = 40;           // stamina minima per permettersi una carica

/** Generatore deterministico (mulberry32): stesso seme, stessa partita. */
function casualeConSeme(seme) {
    let stato = (seme || 1) >>> 0;
    return function () {
        stato = (stato + 0x6D2B79F5) >>> 0;
        let t = stato;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * La prossima azione del bot.
 * stato: {stato, gameOver, p1, p2} come esce da sonda.js
 * Ritorna 'attacco' | 'parata' | 'ultimate' | 'salto' | 'sinistra' | 'destra' | null
 */
function prossimaAzione(stato, casuale) {
    const dado = typeof casuale === 'function' ? casuale : Math.random;

    if (!stato || stato.stato !== 'partita' || stato.gameOver) return null;
    if (!stato.p1 || !stato.p2) return null;
    if (stato.p1.stun) return null;              // con lo stun non si comanda
    if (stato.p1.danno) return null;             // mentre incassa, i comandi possono essere ignorati
    if (stato.p1.caricando) return null;         // chi carica non può fare altro

    const distanza = Math.abs(stato.p1.x - stato.p2.x);
    const versoDestra = stato.p2.x > stato.p1.x;

    if (stato.p1.ultimate >= 100 && distanza < FINESTRA_PARATA * 2) return 'ultimate';

    // --- le meccaniche nuove ---
    // Chi è per aria si colpisce: è la continuazione della combo.
    if (stato.p2.inAria && distanza < DISTANZA_ATTACCO * 1.4) return 'attacco';

    // L'avversario stordito è la porta della combo: si attacca subito.
    if (stato.p2.stun && distanza < DISTANZA_ATTACCO) return 'attacco';

    // La tattica costa stamina e ha la sua ricarica: si prova ogni tanto.
    if (!stato.p1.silenzio && !stato.p1.ricaricaTattica && (stato.p1.stamina || 0) > 30 &&
        dado() < PROBABILITA_TATTICA) return 'tattica';

    // Lontano, col tiro si può continuare o aprire: la distanza non è un muro.
    if (distanza > DISTANZA_TIRO && !stato.p1.ricaricaDistanza) return 'distanza';

    if (stato.p1.stamina > SOGLIA_CARICA && !stato.p1.caricando &&
        distanza < DISTANZA_ATTACCO && dado() < PROBABILITA_CARICA) return 'carica';

    if (distanza > DISTANZA_ATTACCO && distanza < DISTANZA_TIRO && !stato.p1.ricaricaDistanza &&
        dado() < PROBABILITA_TIRO) return 'distanza';

    if (stato.p2.attacco && distanza < FINESTRA_PARATA) return 'parata';

    // senza stamina l'attacco non parte: meglio avvicinarsi o parare
    const senzaStamina = (typeof stato.p1.stamina === 'number' && typeof stato.p1.costoStamina === 'number')
        ? stato.p1.stamina < stato.p1.costoStamina : false;

    if (distanza < DISTANZA_ATTACCO && !stato.p1.attacco && !senzaStamina) {
        // la stamina sotto soglia non impedisce l'attacco normale: si attacca punto
        return 'attacco';
    }

    if (distanza > DISTANZA_ATTACCO * 0.8) return versoDestra ? 'destra' : 'sinistra';

    return dado() < PROBABILITA_SALTO ? 'salto' : null;
}

/** Input vario, per provare i comandi senza inseguire il combattimento. */
function azioneCasuale(casuale) {
    const dado = typeof casuale === 'function' ? casuale : Math.random;
    const scelte = ['sinistra', 'destra', 'salto', 'attacco', 'parata', 'attacco', 'attacco'];
    return scelte[Math.floor(dado() * scelte.length)];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        prossimaAzione,
        azioneCasuale,
        casualeConSeme,
        DISTANZA_ATTACCO,
        STAMINA_MINIMA_CARICA,
        FINESTRA_PARATA
    };
}
