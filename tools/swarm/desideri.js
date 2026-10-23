// tools/swarm/desideri.js
// Trasforma quello che il giocatore ha VISSUTO in quello che DIRIGE.
//
// Un bug report dice "il pulsante non risponde". Un giocatore pretende cose:
// "la parata è troppo forte, non si può giocare così", "voglio una modalità
// torneo", "ste skin costano troppo per quanti punti danno".
//
// Ogni richiesta porta con sé la FONTE: il fatto misurato da cui nasce. Senza
// fonte è un'opinione e non va sviluppata; con la fonte si può decidere.

// ==========================================
// Fabbriche di richieste per tipo
// ==========================================
// Le frasi sono scritte come le scriverebbe una persona, non un sistema.
// {x} e {y} vengono riempiti col contesto reale.

const FABBRICHE = {
    bilanciamento: [
        '{colpevole} è troppo forte: {dettaglio}. Non è questione di bravura, è che non hai scelta.',
        'Ho giocato {partite} partite e ho perso quasi sempre contro {colpevole}. {dettaglio} Va sistemato.',
        '{dettaglio}. Se una cosa funziona sempre, non è più una scelta: è l\'unica via.',
        'Chiedo un ribilanciamento di {colpevole}. {dettaglio} Così non c\'è partita.'
    ],
    // Le frasi sono costruite in modo che {cosa} non debba mai stare all'inizio
    // né reggere una preposizione: dentro ci finisce un sintagma nominale
    // ("la sfida diretta a un amico"), e "Sarebbe ora di la sfida" non è italiano.
    funzionalita: [
        'Ci vorrebbe {cosa}. Il gioco è bello ma finisce lì: dopo un po\' non c\'è niente di nuovo da fare.',
        'Io ci metterei {cosa}: serve a far tornare la gente, non solo a chi vince sempre.',
        'Una cosa che manca davvero è {cosa}. Non è un capriccio, è quello che tiene insieme una community.',
        'Sarebbe ora di avere {cosa}. Adesso l\'unica cosa da fare è ranked e negozio.'
    ],
    economia: [
        '{dettaglio} I punti si guadagnano lentissimi e le skin costano tantissimo: stoppo di comprare.',
        'Ho {punti} punti e non mi posso permettere quasi niente. {dettaglio} Alza i guadagni o abbassa i prezzi.',
        'Il negozio è caro in modo punitivo. {dettaglio} Così uno smette, non spende di più.'
    ],
    usabilita: [
        '{dettaglio} Uno che apre il gioco per la prima volta non capisce cosa deve fare.',
        '{dettaglio} Serve una guida vera, non un tutorial che salti dopo due secondi.',
        'Secondo me la cosa più fastidiosa è questa: {dettaglio}'
    ],
    bug: [
        '{dettaglio} Non è una svista, si ripete.',
        'A me continua a succedere: {dettaglio}',
        '{dettaglio} Se non lo sistemate la gente smette di fidarsi del gioco.'
    ]
};

// Cose che i giocatori chiedono quando non si lamentano di un difetto.
const RICHIESTE_TIPICHE = [
    'un tutorial vero che spieghi parata e finestre di attacco',
    'una modalità torneo a eliminazione, anche piccola',
    'la possibilità di rivedere la propria ultima partita',
    'un filtro per trovare partite solo contro il proprio livello',
    'la chat rapida durante la partita (due o tre messaggi predefiniti)',
    'una classifica stagionale che si azzera, così chi arriva dopo può giocare',
    'statistiche personali: colpi messi, parate riuscite, ultimate',
    'la possibilità di salvare un replay e condividerlo',
    'un sistema di ricompense giornaliere, anche minimo',
    'la sfida diretta a un amico senza passare dalla coda',
    'più verdellinesi, o almeno uno che giochi in modo diverso dagli altri',
    'una schermata che spieghi cosa fanno i tasti, dentro il gioco'
];

const COLPEVOLI = [
    'la parata', 'l\'ultimate', 'il colpo caricato', 'il salto',
    'la spinta', 'il verdellinese più veloce', 'il personaggio con più vita'
];

// ==========================================
// Generazione
// ==========================================

function scegli(elenco, seme) {
    const indice = Math.floor(Math.abs(Math.sin(seme) * 10000)) % elenco.length;
    return elenco[indice];
}

function normalizza(testo) {
    return String(testo || '')
        .toLowerCase()
        .replace(/[^\wàèéìòùa-z ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Costruisce le richieste di un giocatore a fine sessione.
 *
 * @param {object} sessione  {carattere, nick, partite, vinte, perse, punti,
 *                            amici, anomalie: [{firma, messaggio}], negozio, elo}
 * @returns {Array} elenco di richieste pronte da accumulare
 */
function generaRichieste(sessione) {
    const carattere = sessione.carattere || { nome: 'casual', fissaSu: [], voce: '' };
    const partite = sessione.partite || 0;
    const vinte = sessione.vinte || 0;
    const perse = sessione.perse || 0;
    const anomalie = sessione.anomalie || [];
    const richieste = [];

    let seme = 1;
    const prossimoSeme = () => (seme += 7.3);

    function aggiungi(tipo, titolo, testo, priorita, fonte) {
        richieste.push({
            tipo: tipo,
            titolo: titolo,
            testo: testo,
            priorita: priorita,
            fonte: fonte || null,
            carattere: carattere.nome,
            nick: sessione.nick || '?',
            chiave: normalizza(tipo + ' ' + titolo)
        });
    }

    // ---- 1. dalle anomalie vere: se ha visto un difetto, lo pretende sistemato
    const firmeViste = {};
    for (const anomalia of anomalie) {
        firmeViste[anomalia.firma] = (firmeViste[anomalia.firma] || 0) + 1;
    }
    for (const firma of Object.keys(firmeViste)) {
        const quante = firmeViste[firma];
        const gravita = quante > 2 ? 3 : 2;
        aggiungi('bug',
            'difetto ricorrente: ' + firma,
            scegli(FABBRICHE.bug, prossimoSeme())
                .replace('{dettaglio}', 'Ho visto «' + firma + '» ' + quante +
                    (quante === 1 ? ' volta' : ' volte in una sola sessione') + '.'),
            gravita,
            { tipo: 'anomalia', firma: firma, occorrenze: quante });
    }

    // ---- 2. dalle partite: squilibrio evidente
    if (partite >= 3) {
        const rapporto = vinte / partite;
        if (rapporto <= 0.25) {
            const colpevole = scegli(COLPEVOLI, prossimoSeme());
            aggiungi('bilanciamento',
                'sbilanciamento evidente: ' + Math.round(rapporto * 100) + '% di vittorie',
                scegli(FABBRICHE.bilanciamento, prossimoSeme())
                    .replace('{colpevole}', colpevole)
                    .replace('{partite}', String(partite))
                    .replace('{dettaglio}', 'Su ' + partite + ' partite ne ho vinte ' + vinte + '.'),
                3,
                { tipo: 'esiti', partite: partite, vinte: vinte, perse: perse });
        } else if (rapporto >= 0.85) {
            aggiungi('bilanciamento',
                'vincere troppo facile: ' + Math.round(rapporto * 100) + '%',
                'Con questo verdellinese ho vinto ' + vinte + ' partite su ' + partite +
                '. O è troppo forte lui o gli altri sono troppo deboli: una delle due va decisa.',
                2,
                { tipo: 'esiti', partite: partite, vinte: vinte });
        }
    }

    // ---- 3. economia: punti e prezzi
    const negozio = sessione.negozio || {};
    if (typeof negozio.punti === 'number') {
        const comprabili = negozio.comprabili || 0;
        const totale = negozio.totaleVoci || 0;
        if (comprabili === 0 && totale > 0) {
            aggiungi('economia',
                'punti insufficienti per qualunque voce del negozio',
                scegli(FABBRICHE.economia, prossimoSeme())
                    .replace('{punti}', String(negozio.punti))
                    .replace('{dettaglio}', 'Ho ' + negozio.punti + ' punti e non c\'è niente che possa comprare su ' + totale + ' voci.'),
                2,
                { tipo: 'negozio', punti: negozio.punti, voci: totale, comprabili: 0 });
        }
    }

    // ---- 4. socialità: amicizie che non funzionano o mancano
    if (sessione.amici === 0 && partite > 0) {
        aggiungi('funzionalita',
            'modo semplice per aggiungere chi hai appena sfidato',
            'Dopo una partita non posso aggiungere l\'avversario con un click: devo cercarlo per nome. ' +
            'Mettete un pulsante "aggiungi" alla fine della partita.',
            2,
            { tipo: 'sociale', amici: 0, partite: partite });
    }

    // ---- 5. richieste di funzionalità: le cose che il carattere pretende
    const quanteFunzionalita = partite >= 2 ? 2 : 1;
    const gia = new Set();
    for (let indice = 0; indice < quanteFunzionalita; indice++) {
        let cosa = scegli(RICHIESTE_TIPICHE, prossimoSeme() + indice * 3.1);
        let tentativi = 0;
        while (gia.has(cosa) && tentativi < RICHIESTE_TIPICHE.length) {
            cosa = RICHIESTE_TIPICHE[(RICHIESTE_TIPICHE.indexOf(cosa) + 1) % RICHIESTE_TIPICHE.length];
            tentativi += 1;
        }
        gia.add(cosa);
        aggiungi('funzionalita',
            cosa,
            scegli(FABBRICHE.funzionalita, prossimoSeme()).replace('{cosa}', cosa),
            1,
            { tipo: 'osservazione', partite: partite });
    }

    // ---- 6. usabilità: solo se il carattere è sensibile all'argomento
    if (carattere.nome === 'casual' || carattere.nome === 'sociale') {
        aggiungi('usabilita',
            'prima partita poco chiara',
            scegli(FABBRICHE.usabilita, prossimoSeme())
                .replace('{dettaglio}', 'Non è chiaro quando si può attaccare e quando bisogna parare.'),
            1,
            { tipo: 'osservazione', carattere: carattere.nome });
    }

    return richieste;
}

module.exports = { generaRichieste, RICHIESTE_TIPICHE, normalizza };
