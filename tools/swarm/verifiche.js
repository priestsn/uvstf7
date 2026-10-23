// tools/swarm/verifiche.js
// Le cose che un giocatore dà per scontate e che nessuno prova mai.
//
// Tre famiglie:
//   1. PERCORSI D'ERRORE — cosa succede quando sbagli (nick corto, password
//      sbagliata, punti che non bastano). Un gioco serio risponde con un
//      messaggio chiaro; uno rotto accetta, si pianta o risponde 500.
//   2. INVARIANTI — punti mai negativi, ELO mai sotto il minimo, un acquisto
//      che scala esattamente il prezzo.
//   3. PERSISTENZA — ricarichi la pagina e punti, skin e amici devono essere
//      ancora lì. È la famiglia che ha trovato il difetto vero della skin.
//
// Ogni fallimento diventa un'anomalia con una firma leggibile; ogni controllo
// riuscito resta una nota sola per sessione, non una per controllo.

const { apriNavigatore } = require('./navigatore.js');
const giocatore = require('./giocatore.js');

function attendi(ms) {
    return new Promise((risolvi) => setTimeout(risolvi, ms));
}

/** Chiamata HTTP che non lancia: torna {stato, dati} anche sugli errori. */
async function chiama(base, percorso, corpo, token) {
    try {
        const intestazioni = { 'Content-Type': 'application/json' };
        if (token) intestazioni.Authorization = 'Bearer ' + token;
        const risposta = await fetch(base.replace(/\/$/, '') + percorso, {
            method: corpo === undefined ? 'GET' : 'POST',
            headers: intestazioni,
            body: corpo === undefined ? undefined : JSON.stringify(corpo)
        });
        let dati = null;
        try { dati = await risposta.json(); } catch (errore) { dati = null; }
        return { stato: risposta.status, dati: dati };
    } catch (errore) {
        return { stato: 0, dati: null, errore: errore.message };
    }
}

// ==========================================
// 1. percorsi d'errore
// ==========================================
// Le attese sono quelle che un giocatore percepisce: "mi deve dire che il
// nickname è troppo corto", non "deve rispondere 400 perché lo dice la specifica".

const CASI_ERRORE = [
    {
        nome: 'iscrizione con nickname troppo corto',
        percorso: '/api/iscrizione', corpo: { nick: 'ab', password: 'passwordlunga' },
        attesi: [400, 422], gravita: 'fastidiosa'
    },
    {
        nome: 'iscrizione con password troppo corta',
        percorso: '/api/iscrizione', corpo: { nick: 'NickValido' + Math.floor(Math.random() * 999), password: 'abc' },
        attesi: [400, 422], gravita: 'fastidiosa'
    },
    {
        nome: 'accesso con password sbagliata',
        percorso: '/api/accesso', corpo: { nick: 'NickCheNonEsiste' + Math.floor(Math.random() * 999), password: 'passwordlunga' },
        attesi: [400, 401, 404], gravita: 'grave'
    },
    {
        nome: 'profilo senza token',
        percorso: '/api/profilo', corpo: undefined,
        attesi: [401], gravita: 'grave'
    },
    {
        nome: 'negozio senza token',
        percorso: '/api/negozio', corpo: undefined,
        attesi: [401], gravita: 'grave'
    },
    {
        nome: 'amicizia con se stessi',
        percorso: '/api/amici/chiedi', corpo: { nick: '__stesso__' }, conToken: true,
        attesi: [400], gravita: 'fastidiosa'
    },
    {
        nome: 'amicizia verso un nick inesistente',
        percorso: '/api/amici/chiedi', corpo: { nick: 'NickInesistente' + Math.floor(Math.random() * 99999) },
        conToken: true, attesi: [404], gravita: 'fastidiosa'
    }
];

/**
 * Prova i percorsi d'errore con un account usa e getta.
 * Non tocca i giocatori veri della corsa.
 */
async function percorsiErrore(base, scriviEvento, bot) {
    const casuale = Math.random().toString(36).slice(2, 7);
    const usa = await chiama(base, '/api/iscrizione', { nick: 'Errori' + casuale, password: 'password' + casuale });
    const token = usa.dati && usa.dati.token;
    if (!token) return { fatti: 0, falliti: 0 };

    const falliti = [];
    let fatti = 0;

    for (const caso of CASI_ERRORE) {
        let corpo = caso.corpo;
        // il caso "amicizia con se stessi" ha bisogno del proprio nick
        if (corpo && corpo.nick === '__stesso__') corpo = { nick: usa.dati.giocatore.nick };

        const esito = await chiama(base, caso.percorso, corpo, caso.conToken ? token : null);
        fatti += 1;

        if (caso.attesi.indexOf(esito.stato) === -1) {
            falliti.push({ nome: caso.nome, atteso: caso.attesi.join('/'), ottenuto: esito.stato });
            scriviEvento({
                tipo: 'anomalia', bot: bot, partita: 0,
                firma: 'errore-non-gestito',
                gravita: caso.gravita,
                messaggio: caso.nome + ': atteso HTTP ' + caso.attesi.join('/') +
                    ', ottenuto ' + esito.stato + ' — ' +
                    ((esito.dati && esito.dati.messaggio) || 'nessun messaggio per il giocatore'),
                contesto: { percorso: caso.percorso, corpo: corpo },
                decimi: 0
            });
        }
    }

    // acquisto senza punti e acquisto doppio: due casi che richiedono il negozio
    const negozio = await chiama(base, '/api/negozio', undefined, token);
    if (negozio.stato === 200 && negozio.dati && negozio.dati.voci) {
        const cara = negozio.dati.voci.filter((v) => v.prezzo > 0).sort((a, b) => b.prezzo - a.prezzo)[0];
        if (cara) {
            const senzaPunti = await chiama(base, '/api/negozio/acquisto', { chiave: cara.chiave }, token);
            fatti += 1;
            if (senzaPunti.stato !== 402) {
                falliti.push({ nome: 'acquisto senza punti', atteso: '402', ottenuto: senzaPunti.stato });
                scriviEvento({
                    tipo: 'anomalia', bot: bot, partita: 0, firma: 'acquisto-senza-punti-accettato',
                    gravita: 'grave',
                    messaggio: 'Con ' + negozio.dati.punti + ' punti il server ha risposto ' + senzaPunti.stato +
                        ' all\'acquisto di «' + cara.chiave + '» da ' + cara.prezzo,
                    contesto: { punti: negozio.dati.punti, voce: cara.chiave }, decimi: 0
                });
            }
        }
    }

    // --- ciclo completo di un'amicizia: chiesta, rifiutata, richiesta di nuovo,
    // accettata, rimossa. Le altre rotte non le provava nessuno.
    const secondoNick = 'Amico' + casuale;
    const secondo = await chiama(base, '/api/iscrizione', { nick: secondoNick, password: 'password' + casuale });
    if (secondo.dati && secondo.dati.token) {
        const tokenB = secondo.dati.token;
        fatti += 1;
        await chiama(base, '/api/amici/chiedi', { nick: secondoNick }, token);
        const rifiuto = await chiama(base, '/api/amici/rifiuta', { nick: usa.dati.giocatore.nick }, tokenB);
        if (rifiuto.stato !== 200) {
            falliti.push({ nome: 'rifiuto amicizia', atteso: '200', ottenuto: rifiuto.stato });
            scriviEvento({
                tipo: 'anomalia', bot: bot, partita: 0, firma: 'rifiuto-amicizia-fallito',
                gravita: 'fastidiosa',
                messaggio: 'Rifiutare una richiesta di amicizia risponde ' + rifiuto.stato + ': ' +
                    ((rifiuto.dati && rifiuto.dati.messaggio) || 'nessun messaggio'),
                contesto: null, decimi: 0
            });
        }

        fatti += 1;
        await chiama(base, '/api/amici/chiedi', { nick: secondoNick }, token);
        const accetta = await chiama(base, '/api/amici/accetta', { nick: usa.dati.giocatore.nick }, tokenB);
        const elencoA = await chiama(base, '/api/amici', undefined, token);
        const amiciA = (elencoA.dati && elencoA.dati.amici) || [];
        if (accetta.stato !== 200 || !amiciA.some((amico) => amico.nick === secondoNick)) {
            falliti.push({ nome: 'accettazione amicizia', atteso: 'amico in elenco', ottenuto: amiciA.length + ' amici' });
            scriviEvento({
                tipo: 'anomalia', bot: bot, partita: 0, firma: 'amicizia-non-conclusa',
                gravita: 'grave',
                messaggio: 'Dopo l\'accettazione l\'amico non compare nell\'elenco (risposta ' + accetta.stato + ')',
                contesto: { amici: amiciA }, decimi: 0
            });
        }

        fatti += 1;
        const rimozione = await chiama(base, '/api/amici/rimuovi', { nick: secondoNick }, token);
        const dopoRimozione = await chiama(base, '/api/amici', undefined, token);
        const restati = (dopoRimozione.dati && dopoRimozione.dati.amici) || [];
        if (rimozione.stato !== 200 || restati.some((amico) => amico.nick === secondoNick)) {
            falliti.push({ nome: 'rimozione amico', atteso: 'amico rimosso', ottenuto: restati.length + ' amici' });
            scriviEvento({
                tipo: 'anomalia', bot: bot, partita: 0, firma: 'amico-non-rimosso',
                gravita: 'fastidiosa',
                messaggio: 'La rimozione risponde ' + rimozione.stato + ' ma l\'amico è ancora in elenco',
                contesto: { amici: restati }, decimi: 0
            });
        }
    }

    scriviEvento({
        tipo: 'nota', bot: bot, partita: 0, firma: 'verifiche-errore',
        gravita: 'nessuna',
        messaggio: 'percorsi d\'errore provati: ' + fatti + ', falliti: ' + falliti.length,
        contesto: null, decimi: 0
    });

    return { fatti: fatti, falliti: falliti.length };
}

// ==========================================
// 2. invarianti
// ==========================================

/**
 * Nessun giocatore deve mai trovarsi in uno stato impossibile.
 * Si guarda il profilo reale, non un profilo di prova.
 */
async function invarianti(base, chi, scriviEvento) {
    const profilo = await chiama(base, '/api/profilo', undefined, chi.token);
    if (profilo.stato !== 200 || !profilo.dati) return { falliti: 0 };

    const p = profilo.dati;
    let falliti = 0;

    if (typeof p.punti === 'number' && p.punti < 0) {
        falliti += 1;
        scriviEvento({
            tipo: 'anomalia', bot: chi.numero, partita: 0, firma: 'punti-negativi', gravita: 'grave',
            messaggio: 'Il profilo ha ' + p.punti + ' punti: i punti non possono essere negativi',
            contesto: { punti: p.punti }, decimi: 0
        });
    }

    if (typeof p.elo === 'number' && p.elo < 100) {
        falliti += 1;
        scriviEvento({
            tipo: 'anomalia', bot: chi.numero, partita: 0, firma: 'elo-sotto-il-minimo', gravita: 'grave',
            messaggio: 'ELO ' + p.elo + ', ma il minimo del gioco è 100',
            contesto: { elo: p.elo }, decimi: 0
        });
    }

    const giocate = p.partiteGiocate || 0;
    const vinte = p.vittorie || 0;
    const perse = p.sconfitte || 0;
    if (vinte + perse > giocate) {
        falliti += 1;
        scriviEvento({
            tipo: 'anomalia', bot: chi.numero, partita: 0, firma: 'contatori-incoerenti', gravita: 'fastidiosa',
            messaggio: 'Vittorie (' + vinte + ') + sconfitte (' + perse + ') superano le partite giocate (' + giocate + ')',
            contesto: p, decimi: 0
        });
    }

    return { falliti: falliti };
}

// ==========================================
// 3. persistenza al ricaricamento
// ==========================================
// È la prova che ha trovato il difetto della skin: il server sa una cosa, il
// client ne sa un'altra, e il giocatore perde quello che ha comprato.

function istantanea(statoAccount) {
    if (!statoAccount) return null;
    return {
        dentro: !!statoAccount.dentro,
        nick: statoAccount.nick || null,
        punti: statoAccount.punti || 0,
        elo: statoAccount.elo || 0,
        lottatori: (statoAccount.lottatori || []).slice().sort(),
        skins: (statoAccount.skins || []).slice().sort()
    };
}

async function persistenza(url, chi, scriviEvento) {
    let nav = null;
    try {
        nav = await apriNavigatore({ porta: 9790, url: url, attesaCaricamentoMs: 4000 });
        await nav.valuta("localStorage.setItem('uvsf7-token'," + JSON.stringify(chi.token) + ")");
        await nav.valuta('location.reload()');
        await attendi(4500);

        const leggil = async () => {
            const testo = await nav.valuta('JSON.stringify(typeof statoAccount !== "undefined" && statoAccount ? statoAccount : null)');
            try { return istantanea(JSON.parse(testo || 'null')); } catch (errore) { return null; }
        };

        const prima = await leggil();
        if (!prima || !prima.dentro) {
            scriviEvento({
                tipo: 'anomalia', bot: chi.numero, partita: 0, firma: 'sessione-non-ripresa',
                gravita: 'grave',
                messaggio: 'Dopo il login con un token valido il client non risulta dentro all\'account',
                contesto: null, decimi: 0
            });
            return { esito: 'sessione-non-ripresa' };
        }

        // ricarico davvero: è quello che fa il giocatore quando riapre il gioco
        await nav.valuta('location.reload()');
        await attendi(4500);
        const dopo = await leggil();

        if (!dopo) {
            scriviEvento({
                tipo: 'anomalia', bot: chi.numero, partita: 0, firma: 'stato-perso-al-reload',
                gravita: 'grave', messaggio: 'Dopo il ricaricamento lo stato dell\'account non è più leggibile',
                contesto: null, decimi: 0
            });
            return { esito: 'stato-perso' };
        }

        const campi = ['dentro', 'nick', 'punti', 'elo'];
        for (const campo of campi) {
            if (JSON.stringify(prima[campo]) !== JSON.stringify(dopo[campo])) {
                scriviEvento({
                    tipo: 'anomalia', bot: chi.numero, partita: 0, firma: 'dato-perso-al-reload-' + campo,
                    gravita: 'grave',
                    messaggio: 'Dopo il ricaricamento «' + campo + '» è cambiato: ' +
                        JSON.stringify(prima[campo]) + ' → ' + JSON.stringify(dopo[campo]),
                    contesto: { prima: prima, dopo: dopo }, decimi: 0
                });
            }
        }

        // le skin sono il campo che si era perso: controllo esplicito
        if (prima.skins.length !== dopo.skins.length ||
            prima.skins.join(',') !== dopo.skins.join(',')) {
            scriviEvento({
                tipo: 'anomalia', bot: chi.numero, partita: 0, firma: 'skin-perse-al-reload',
                gravita: 'grave',
                messaggio: 'Le skin possedute cambiano dopo un ricaricamento: ' +
                    JSON.stringify(prima.skins) + ' → ' + JSON.stringify(dopo.skins),
                contesto: { prima: prima.skins, dopo: dopo.skins }, decimi: 0
            });
            return { esito: 'skin-perse', prima: prima, dopo: dopo };
        }

        scriviEvento({
            tipo: 'nota', bot: chi.numero, partita: 0, firma: 'persistenza-ok',
            gravita: 'nessuna',
            messaggio: 'dopo un ricaricamento restano ' + dopo.punti + ' punti, ' +
                dopo.skins.length + ' skin, nick ' + dopo.nick,
            contesto: null, decimi: 0
        });
        return { esito: 'ok', prima: prima, dopo: dopo };
    } catch (errore) {
        scriviEvento({
            tipo: 'anomalia', bot: chi.numero, partita: 0, firma: 'persistenza-non-provata',
            gravita: 'fastidiosa',
            messaggio: 'La prova di persistenza non è riuscita: ' + errore.message,
            contesto: null, decimi: 0
        });
        return { esito: 'errore', errore: errore.message };
    } finally {
        if (nav) nav.chiudi();
    }
}

// ==========================================
// Un giro completo
// ==========================================

/**
 * Esegue tutte le verifiche disponibili e torna il conto.
 * opzioni: {url, chi, scriviEvento, conPersistenza}
 */
async function eseguiTutte(opzioni) {
    const scelte = Object.assign({ url: '', chi: null, scriviEvento: function () {}, conPersistenza: true }, opzioni || {});
    const conto = { errori: 0, invarianti: 0, persistenza: null };

    try {
        const esito = await percorsiErrore(scelte.url, scelte.scriviEvento, scelte.chi ? scelte.chi.numero : 0);
        conto.errori = esito.falliti;
    } catch (errore) { /* la corsa non si ferma per una verifica */ }

    if (scelte.chi) {
        try {
            const esito = await invarianti(scelte.url, scelte.chi, scelte.scriviEvento);
            conto.invarianti = esito.falliti;
        } catch (errore) { /* niente */ }

        if (scelte.conPersistenza) {
            try {
                const esito = await persistenza(scelte.url, scelte.chi, scelte.scriviEvento);
                conto.persistenza = esito.esito;
            } catch (errore) { conto.persistenza = 'errore'; }
        }
    }

    return conto;
}

module.exports = { percorsiErrore, invarianti, persistenza, eseguiTutte, istantanea, chiama, CASI_ERRORE };
