// tools/swarm/vita.js
// La vita di un giocatore: si iscrive, fa amicizia, compra, gioca ranked,
// si lamenta e pretende cose.
//
// Le sonde misuravano il motore di gioco. Questo misura il GIOCO COME PRODOTTO:
// le code, gli amici, i punti, il negozio, e quello che un giocatore vorrebbe.
//
// I giocatori parlano fra loro via API (veloce, affidabile) e giocano la partita
// ranked nel browser, perché la partita è un gioco a schermo, non una chiamata.

const path = require('path');

const corridore = require('./corridore.js');
const giocatore = require('./giocatore.js');
const desideri = require('./desideri.js');
const richieste = require('./richieste.js');
const verifiche = require('./verifiche.js');

function attendi(ms) {
    return new Promise((risolvi) => setTimeout(risolvi, ms));
}

// memoria dei difetti già segnalati in questa corsa (per bot + firma)
const giaVisti = new Set();

/**
 * Prepara un giocatore: account, carattere, stato del negozio.
 * Non apre il browser: fino alla partita si può fare tutto via HTTP.
 */
async function prepara(base, cartella, numero) {
    const carattere = giocatore.caratterePerIndice(numero);
    const account = await giocatore.accountPer(base, cartella, numero, carattere);

    let profilo = null;
    try { profilo = await giocatore.profiloDi(base, account.token); } catch (errore) { /* opzionale */ }

    let negozio = null;
    let statoNegozio = null;
    try {
        negozio = await giocatore.negozioDi(base, account.token);
        statoNegozio = giocatore.scegliAcquisto(negozio || {});
    } catch (errore) { /* opzionale */ }

    // Se possiede una skin, la indossa: comprarla e non metterla mai sarebbe
    // una prova a metà. Lo stato "posseduta" arriva dal negozio (`ottenuto`),
    // quindi non serve memoria locale: si legge ogni volta.
    let indossa = null;
    if (negozio && Array.isArray(negozio.voci)) {
        const mie = negozio.voci.filter((voce) => voce.skin && voce.ottenuto);
        if (mie.length) {
            // la più cara che possiede: è quella che vuole sfoggiare
            mie.sort((a, b) => (b.prezzo || 0) - (a.prezzo || 0));
            indossa = { personaggio: mie[0].personaggio, skin: mie[0].skin };
        }
    }

    return {
        numero: numero,
        nick: account.nick,
        token: account.token,
        nuovo: account.nuovo,
        carattere: carattere,
        profilo: profilo,
        negozio: negozio,
        indossa: indossa,
        statoNegozio: statoNegozio,
        partite: 0,
        vinte: 0,
        perse: 0,
        pareggi: 0,
        amici: 0,
        anomalie: []
    };
}

/**
 * Fa conoscere i giocatori fra loro: ognuno cerca gli altri per nome e manda la
 * richiesta; chi la riceve accetta. Metà delle richieste parte, metà accetta:
 * è così che nasce un'amicizia, e serve a provare entrambe le rotte.
 */
async function tesseAmicizie(base, giocatori, scriviEvento) {
    // Con due giocatori basta un legame; con sei serve una rete: ognuno chiede
    // l'amicizia ai due che ha accanto, così nascono catene e non coppie isolate.
    for (let indice = 0; indice < giocatori.length; indice++) {
        const chi = giocatori[indice];
        const quanti = giocatori.length > 2 ? 2 : 1;

        for (let passo = 1; passo <= quanti; passo++) {
            const altro = giocatori[(indice + passo) % giocatori.length];
            if (!altro || altro === chi) continue;
            await chiediUnaAmicizia(base, chi, altro, scriviEvento);
        }
    }

    // secondo passaggio: chi ha ricevuto una richiesta la accetta
    for (const chi of giocatori) {
        for (const altro of giocatori) {
            if (chi === altro) continue;
            try { await giocatore.accettaAmicizia(base, chi.token, altro.nick); } catch (errore) { /* non c'era */ }
        }
    }

    await contaAmici(base, giocatori, scriviEvento);
}

/** Un singolo tentativo di amicizia, con la relazione già letta dalla ricerca. */
async function chiediUnaAmicizia(base, chi, altro, scriviEvento) {
    try {
        const trovati = await giocatore.cercaGiocatore(base, chi.token, altro.nick);
            if (!trovati || !trovati.length) {
                scriviEvento({
                    tipo: 'anomalia', bot: chi.numero, partita: 0, firma: 'amico-non-trovato',
                    gravita: 'fastidiosa',
                    messaggio: 'La ricerca amici non trova «' + altro.nick + '», che esiste ed è iscritto',
                    contesto: null, decimi: 0
                });
                return;
            }

            // La ricerca DICE già che relazione c'è: chiedere l'amicizia a chi è
            // già amico produce un 409 che non è un difetto. Prima lo trattavo
            // come tale e la corsa notturna si riempiva di falsi allarmi.
            const relazione = (trovati.find((voce) => voce.nick === altro.nick) || {}).relazione || 'nessuna';
        if (relazione === 'amico' || relazione === 'richiestaInviata') return;
        if (relazione === 'richiestaRicevuta') {
            await giocatore.accettaAmicizia(base, chi.token, altro.nick);
            return;
        }

        await giocatore.chiediAmicizia(base, chi.token, altro.nick);
    } catch (errore) {
        // 409 = già amici, 404 = sparito: solo il secondo è un difetto
        if (errore.stato === 409) return;
        scriviEvento({
            tipo: 'anomalia', bot: chi.numero, partita: 0, firma: 'richiesta-amicizia-fallita',
            gravita: 'fastidiosa',
            messaggio: 'Richiesta di amicizia verso ' + altro.nick + ' non riuscita: ' + errore.message,
            contesto: null, decimi: 0
        });
    }
}

/** Quanti amici ha ognuno alla fine del giro. */
async function contaAmici(base, giocatori, scriviEvento) {
    for (const chi of giocatori) {
        try {
            const elenco = await giocatore.elencoAmici(base, chi.token);
            const quanti = (elenco.amici || elenco.elenco || []).length;
            chi.amici = quanti;
            scriviEvento({
                tipo: 'nota', bot: chi.numero, partita: 0, firma: 'amicizie',
                gravita: 'nessuna',
                messaggio: 'amici dopo il giro: ' + quanti, contesto: null, decimi: 0
            });
        } catch (errore) { /* niente */ }
    }
}

/**
 * Fa comprare al giocatore quello che può permettersi e lo annota.
 * Comprare è una cosa che i giocatori fanno davvero: se il negozio non regge
 * un acquisto, è un difetto che nessuna sonda sul combattimento troverebbe.
 */
async function faComprare(base, chi, scriviEvento) {
    if (!chi.carattere.spendePunti || !chi.statoNegozio || !chi.statoNegozio.scelta) return;

    const scelta = chi.statoNegozio.scelta;
    try {
        await giocatore.acquistaVoce(base, chi.token, scelta.chiave);
        // se ha comprato una skin, la vuole addosso alla partita dopo
        if (scelta.tipo === 'skin') {
            const pezzi = String(scelta.chiave).split(':');
            chi.indossa = { personaggio: pezzi[0], skin: pezzi[1] || null };
        }
        scriviEvento({
            tipo: 'nota', bot: chi.numero, partita: 0, firma: 'acquisto',
            gravita: 'nessuna',
            messaggio: 'ha comprato «' + scelta.nome + '» (' + scelta.tipo + ') per ' + scelta.costo +
                ' punti, ne aveva ' + chi.statoNegozio.punti,
            contesto: null, decimi: 0
        });
    } catch (errore) {
        scriviEvento({
            tipo: 'anomalia', bot: chi.numero, partita: 0, firma: 'acquisto-fallito',
            gravita: 'grave',
            messaggio: 'Il negozio mostra «' + scelta.nome + '» a ' + scelta.costo + ' punti ma ' +
                chi.statoNegozio.punti + ' non bastano per comprarla: ' + errore.message,
            contesto: null, decimi: 0
        });
    }
}

/**
 * Una partita ranked fra due giocatori preparati.
 * Rimappa i numeri dei bot: dentro la partita sono 1 e 2, fuori restano i loro.
 */
// Difetti che si ripetono a ogni partita ma sono UNA cosa sola: si segnalano una
// volta per bot. Ripeterli dieci volte gonfia il conteggio e fa sembrare che il
// rapporto abbia trovato dieci difetti.
const UNA_VOLTA_PER_BOT = new Set(['skin-non-addosso', 'skin-indossata']);

async function partitaFra(url, primo, secondo, portaBase, cartella, scriviEvento, minutiPartita) {
    const rimappa = (evento) => {
        const numero = evento.bot === 1 ? primo.numero : evento.bot === 2 ? secondo.numero : evento.bot;

        if (UNA_VOLTA_PER_BOT.has(evento.firma)) {
            const chiave = numero + '|' + evento.firma;
            if (giaVisti.has(chiave)) return;
            giaVisti.add(chiave);
        }

        scriviEvento(Object.assign({}, evento, { bot: numero }));
        if (evento.tipo === 'anomalia') {
            const chi = evento.bot === primo.numero ? primo : secondo;
            chi.anomalie.push({ firma: evento.firma, messaggio: evento.messaggio });
        }
    };

    // punti prima della partita: servono per verificare che il gioco accrediti
    // davvero quello che promette. È il ciclo centrale del gioco e nessuno lo
    // controllava.
    const puntiPrima = {};
    for (const chi of [primo, secondo]) {
        try {
            const profilo = await giocatore.profiloDi(url, chi.token);
            puntiPrima[chi.numero] = profilo && typeof profilo.punti === 'number' ? profilo.punti : null;
        } catch (errore) { puntiPrima[chi.numero] = null; }
    }

    const esiti = await corridore.corriOnline({
        url: url,
        minuti: minutiPartita,
        portaCdpBase: portaBase,
        cartella: cartella,
        scriviEvento: rimappa,
        giocatori: 2,
        accountPronti: {
            1: { nick: primo.nick, token: primo.token, indossa: primo.indossa || null },
            2: { nick: secondo.nick, token: secondo.token, indossa: secondo.indossa || null }
        }
    });

    // Ogni bot conta SOLO la propria vista: la vista dell'altro è un'altra fonte,
    // e contarla qui raddoppiava tutto (una partita sola produceva 1 vinta e 1
    // persa per entrambi, cioè quattro esiti per due giocatori).
    for (let indice = 0; indice < esiti.length; indice++) {
        const esito = esiti[indice] || {};
        const chi = indice === 0 ? primo : secondo;

        chi.partite += 1;
        if (!esito.esito) { chi.pareggi += 1; continue; }
        if (esito.esito.vinta) chi.vinte += 1;
        else if (esito.esito.persa) chi.perse += 1;
        else chi.pareggi += 1;

        // --- i punti sono stati accreditati?
        try {
            const profilo = await giocatore.profiloDi(url, chi.token);
            const prima = puntiPrima[chi.numero];
            const dopo = profilo && typeof profilo.punti === 'number' ? profilo.punti : null;
            if (prima !== null && dopo !== null) {
                const delta = dopo - prima;
                const tabella = require('fs').readFileSync(
                    require('path').join(__dirname, '..', '..', 'dati', 'regole.json'), 'utf8');
                const premi = JSON.parse(tabella).punti;
                const legali = [0, premi.rankedVinta, premi.rankedPersa, premi.rankedPari];

                // Il doppio del premio è la firma di una partita accreditata due
                // volte: la propria conclusione più quella dell'avversario.
                const doppio = legali.some((valore) => valore > 0 && delta === valore * 2);

                if (doppio) {
                    scriviEvento({
                        tipo: 'anomalia', bot: chi.numero, partita: chi.partite,
                        firma: 'punti-accreditati-due-volte', gravita: 'grave',
                        messaggio: 'La partita ha pagato ' + delta + ' punti invece di ' +
                            (delta / 2) + ': la tabella dice ' + JSON.stringify(legali.slice(1)),
                        contesto: { prima: prima, dopo: dopo, delta: delta }, decimi: 0
                    });
                } else if (legali.indexOf(delta) === -1) {
                    scriviEvento({
                        tipo: 'anomalia', bot: chi.numero, partita: chi.partite,
                        firma: 'punti-non-accreditati', gravita: 'grave',
                        messaggio: 'Dopo la partita i punti sono passati da ' + prima + ' a ' + dopo +
                            ' (variazione ' + delta + '), che non è un valore previsto dalla tabella',
                        contesto: { prima: prima, dopo: dopo, esito: esito.esito }, decimi: 0
                    });
                } else if (delta === 0) {
                    scriviEvento({
                        tipo: 'nota', bot: chi.numero, partita: chi.partite, firma: 'punti-non-accreditati-tetto',
                        gravita: 'nessuna',
                        messaggio: 'La partita non ha dato punti: probabilmente il tetto giornaliero',
                        contesto: null, decimi: 0
                    });
                }
            }
        } catch (errore) { /* la corsa continua */ }

        scriviEvento({
            tipo: 'nota', bot: chi.numero, partita: chi.partite, firma: 'esito-partita',
            gravita: 'nessuna',
            messaggio: (esito.esito.vinta ? 'vinta' : esito.esito.persa ? 'persa' : 'pareggio') +
                ' con ' + esito.esito.mioVerdellinese + ' (' + esito.esito.vitaMia + ') contro ' +
                esito.esito.suoVerdellinese + ' (' + esito.esito.vitaSua + ')',
            contesto: null, decimi: 0
        });
    }

    return { partite: 1, esiti: esiti };
}

/**
 * La corsa completa: N giocatori che vivono, giocano e pretendono.
 * opzioni: {url, bot, partite, minuti, cartella, scriviEvento, cartellaRichieste}
 */
async function corriVite(opzioni) {
    const scelte = Object.assign({
        url: '', bot: 2, partite: 2, minuti: 6, portaCdpBase: 9700,
        cartella: process.cwd(),
        cartellaRichieste: null,
        cartellaGiocatori: null,
        scriviEvento: function () {}
    }, opzioni || {});

    const avvio = Date.now();
    const giocatori = [];

    // Gli account NON vivono nella cartella della corsa: quella è la memoria di
    // una notte, e un giocatore che si reiscrive ogni volta riparte da zero,
    // perdendo punti, amici e skin comprate. Stanno accanto allo storico delle
    // richieste, così la popolazione di giocatori cresce nel tempo.
    const cartellaGiocatori = scelte.cartellaGiocatori || scelte.cartellaRichieste || scelte.cartella;

    // ---- 1. iscrizione e preparazione
    for (let numero = 1; numero <= scelte.bot; numero++) {
        try {
            const chi = await prepara(scelte.url, cartellaGiocatori, numero);
            giocatori.push(chi);
            scelte.scriviEvento({
                tipo: 'nota', bot: numero, partita: 0, firma: 'giocatore-pronto',
                gravita: 'nessuna',
                messaggio: 'giocatore ' + chi.nick + ' (' + chi.carattere.nome + ')' +
                    (chi.nuovo ? ' appena iscritto' : ' account già esistente') +
                    (chi.statoNegozio ? ', ' + chi.statoNegozio.punti + ' punti, ' +
                        chi.statoNegozio.comprabili + ' voci comprabili' : ''),
                contesto: null, decimi: 0
            });
        } catch (errore) {
            scelte.scriviEvento({
                tipo: 'anomalia', bot: numero, partita: 0, firma: 'iscrizione-fallita',
                gravita: 'grave',
                messaggio: 'Il giocatore ' + numero + ' non è riuscito a iscriversi: ' + errore.message,
                contesto: null, decimi: 0
            });
        }
    }

    if (giocatori.length < 2) {
        return { giocatori: giocatori.length, partite: 0, richieste: 0 };
    }

    // ---- 2. amicizie e acquisti
    await tesseAmicizie(scelte.url, giocatori, scelte.scriviEvento);
    for (const chi of giocatori) await faComprare(scelte.url, chi, scelte.scriviEvento);

    // ---- 2b. quello che un giocatore dà per scontato: errori gestiti e stato coerente
    let contoVerifiche = { errori: 0, invarianti: 0, persistenza: null };
    try {
        contoVerifiche = await verifiche.eseguiTutte({
            url: scelte.url,
            chi: giocatori[0],
            scriviEvento: scelte.scriviEvento,
            conPersistenza: scelte.persistenza !== false
        });
        scelte.scriviEvento({
            tipo: 'nota', bot: 0, partita: 0, firma: 'verifiche-riassunto',
            gravita: 'nessuna',
            messaggio: 'percorsi d\'errore falliti: ' + contoVerifiche.errori +
                ' · invarianti violate: ' + contoVerifiche.invarianti +
                ' · persistenza: ' + (contoVerifiche.persistenza || 'non provata'),
            contesto: null, decimi: 0
        });
    } catch (errore) {
        scelte.scriviEvento({
            tipo: 'anomalia', bot: 0, partita: 0, firma: 'verifiche-non-eseguite',
            gravita: 'fastidiosa',
            messaggio: 'Le verifiche di base non sono partite: ' + errore.message,
            contesto: null, decimi: 0
        });
    }

    // ---- 3. partite ranked fra loro, ruotando gli avversari
    let porta = scelte.portaCdpBase;
    let girone = 0;
    let partiteGiocate = 0;

    while (partiteGiocate < scelte.partite && Date.now() - avvio < scelte.minuti * 60 * 1000) {
        girone += 1;
        // a ogni girone si cambia compagno: con 4 bot, 1-2 poi 1-3 e 2-4
        for (let indice = 0; indice + 1 < giocatori.length; indice += 2) {
            if (partiteGiocate >= scelte.partite) break;
            const primo = giocatori[(indice + girone - 1) % giocatori.length];
            let secondo = giocatori[(indice + 1 + girone - 1) % giocatori.length];
            if (secondo === primo) secondo = giocatori[(indice + 2) % giocatori.length];
            if (secondo === primo) continue;

            porta += 4;
            try {
                await partitaFra(scelte.url, primo, secondo, porta, scelte.cartella, scelte.scriviEvento, 3);
                partiteGiocate += 1;
            } catch (errore) {
                scelte.scriviEvento({
                    tipo: 'anomalia', bot: primo.numero, partita: partiteGiocate + 1,
                    firma: 'partita-ranked-fallita', gravita: 'grave',
                    messaggio: 'La partita fra ' + primo.nick + ' e ' + secondo.nick +
                        ' non si è giocata: ' + errore.message,
                    contesto: null, decimi: 0
                });
            }
            await attendi(1000);
        }
        await attendi(1500);
    }

    // ---- 3b. dopo aver giocato arrivano i punti: si torna al negozio
    for (const chi of giocatori) {
        try {
            const negozio = await giocatore.negozioDi(scelte.url, chi.token);
            chi.statoNegozio = giocatore.scegliAcquisto(negozio || {});
            const profilo = await giocatore.profiloDi(scelte.url, chi.token);
            if (profilo) chi.profilo = profilo;
            scelte.scriviEvento({
                tipo: 'nota', bot: chi.numero, partita: 0, firma: 'bilancio-finale',
                gravita: 'nessuna',
                messaggio: 'dopo le partite: ' + (negozio ? negozio.punti : '?') + ' punti, ' +
                    (chi.statoNegozio ? chi.statoNegozio.comprabili + ' voci comprabili su ' +
                        chi.statoNegozio.totaleVoci : 'negozio non leggibile') +
                    (profilo && profilo.elo ? ', ELO ' + profilo.elo : ''),
                contesto: null, decimi: 0
            });
            await faComprare(scelte.url, chi, scelte.scriviEvento);
        } catch (errore) { /* niente */ }
    }

    // ---- 3c. gli invarianti si ricontrollano a fine corsa: dopo punti, acquisti
    // e partite è il momento in cui uno stato impossibile avrebbe spazio
    for (const chi of giocatori) {
        try { await verifiche.invarianti(scelte.url, chi, scelte.scriviEvento); } catch (errore) { /* niente */ }
    }

    // ---- 4. cosa pretendono
    const cartellaRichieste = scelte.cartellaRichieste || path.dirname(scelte.cartella);
    let generate = [];
    for (const chi of giocatori) {
        const sue = desideri.generaRichieste({
            carattere: chi.carattere,
            nick: chi.nick,
            partite: chi.partite,
            vinte: chi.vinte,
            perse: chi.perse,
            amici: chi.amici,
            negozio: chi.statoNegozio,
            anomalie: chi.anomalie
        });
        generate = generate.concat(sue);
    }

    const esitoRichieste = richieste.rilancia(cartellaRichieste, generate, {
        cartella: scelte.cartella,
        partite: partiteGiocate
    }, {
        corse: 1,
        partite: partiteGiocate
    });

    return {
        giocatori: giocatori.length,
        verifiche: contoVerifiche,
        partite: partiteGiocate,
        richieste: esitoRichieste.aggiunte,
        richiesteTotali: esitoRichieste.totale,
        gruppi: esitoRichieste.gruppi,
        elenco: esitoRichieste.elenco,
        riassuntoGiocatori: giocatori.map((chi) => ({
            nick: chi.nick, carattere: chi.carattere.nome, partite: chi.partite,
            vinte: chi.vinte, perse: chi.perse, amici: chi.amici,
            punti: chi.statoNegozio ? chi.statoNegozio.punti : null
        }))
    };
}

module.exports = { corriVite, prepara, tesseAmicizie, faComprare };
