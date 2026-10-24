// ========================================
// Le cutscene delle ultimate
// ==========================================
// Una scena per verdellinese, che parte quando la sua ultimate va a segno.
// Le scene sono DATI: un elenco di fasi contate in passi, ognuna con camera,
// effetti e testo. Il motore le esegue e non sa niente di nessuno: aggiungere
// una scena domani significa aggiungere un elemento all'elenco.
//
// Perché i dati e non il codice: l'online deve mostrare la STESSA scena sui due
// client. Con un copione identico e un contatore di passi i due schermi non
// possono divergere — è lo stesso principio della cerimonia di fine partita.
//
// Le fasi sono sempre quattro, nell'ordine: sipario, gesto, colpo, ritorno.
//   sipario  le barre nere entrano, il mondo si desatura
//   gesto    quello che solo quel verdellinese sa fare
//   colpo    fermo immagine, flash, e il nome della ultimate
//   ritorno  le barre escono, la partita riparte
//
// Modulo puro: nessun disegno, nessun DOM. Si prova con node.

const COPIONI = [
    {
        verdellinese: 'OusmaneDiouf',
        testo: 'RADICI DEL BAOBAB',
        colore: '#8ab4ff',
        gesto: 'la telecamera striscia a terra',
        fasi: [
            { nome: 'sipario', passi: 10, camera: 'bassa', tinta: 'polvere' },
            { nome: 'gesto', passi: 46, camera: 'terra-avanti', effetti: ['particelle', 'radici'] },
            { nome: 'colpo', passi: 14, camera: 'primo-piano', effetti: ['onda', 'scossa', 'flash'] },
            { nome: 'ritorno', passi: 16, camera: 'normale', effetti: [] }
        ]
    },
    {
        verdellinese: 'KwameMensah',
        testo: 'VORTICE DI VENTO',
        colore: '#d29bff',
        gesto: 'il mondo si inclina, non la telecamera',
        fasi: [
            { nome: 'sipario', passi: 10, camera: 'inclina', tinta: 'vento' },
            { nome: 'gesto', passi: 44, camera: 'vite', effetti: ['particelle', 'spirale'] },
            { nome: 'colpo', passi: 14, camera: 'scatto', effetti: ['onda', 'scossa', 'flash'] },
            { nome: 'ritorno', passi: 18, camera: 'normale', effetti: [] }
        ]
    },
    {
        verdellinese: 'ChidiOkonkwo',
        testo: 'RUGGITO DEL LEONE',
        colore: '#8be9fd',
        gesto: 'un secondo di immobilità prima del colpo',
        fasi: [
            { nome: 'sipario', passi: 14, camera: 'ferma', tinta: 'gelo' },
            { nome: 'gesto', passi: 40, camera: 'aura', effetti: ['aura'] },
            { nome: 'colpo', passi: 16, camera: 'ampia', effetti: ['onda', 'crepe', 'scossa', 'flash'] },
            { nome: 'ritorno', passi: 18, camera: 'normale', effetti: [] }
        ]
    },
    {
        verdellinese: 'AmaraDiallo',
        testo: 'DANZA FULMINEA',
        colore: '#7dff7d',
        gesto: 'la scena migliora lei, non colpisce l\'altro',
        fasi: [
            { nome: 'sipario', passi: 10, camera: 'orbita-uno', tinta: 'luce' },
            { nome: 'gesto', passi: 50, camera: 'orbita-tre', effetti: ['ombre'] },
            { nome: 'colpo', passi: 12, camera: 'centro', effetti: ['flash', 'onda'] },
            { nome: 'ritorno', passi: 20, camera: 'normale', effetti: ['barra-piena'] }
        ]
    },
    {
        verdellinese: 'TarisaiMoyo',
        testo: 'CERCHIO ANCESTRALE',
        colore: '#7dff7d',
        gesto: 'inquadratura dall\'alto',
        fasi: [
            { nome: 'sipario', passi: 12, camera: 'sale', tinta: 'verde' },
            { nome: 'gesto', passi: 46, camera: 'dall-alto', effetti: ['cerchio'] },
            { nome: 'colpo', passi: 14, camera: 'dall-alto', effetti: ['spire', 'scossa', 'flash'] },
            { nome: 'ritorno', passi: 18, camera: 'normale', effetti: [] }
        ]
    },
    {
        verdellinese: 'ZuriNkosi',
        testo: 'FRECCIA DELLA SAVANA',
        colore: '#ff6b6b',
        gesto: 'il punto di vista è la freccia',
        fasi: [
            { nome: 'sipario', passi: 12, camera: 'arco', tinta: 'fermo' },
            { nome: 'gesto', passi: 44, camera: 'segue-freccia', effetti: ['scia'] },
            { nome: 'colpo', passi: 14, camera: 'impatto', effetti: ['sigillo', 'flash'] },
            { nome: 'ritorno', passi: 18, camera: 'normale', effetti: [] }
        ]
    },
    {
        verdellinese: 'BakariTraore',
        testo: 'PIOGGIA DI STELLE',
        colore: '#ff8a3d',
        gesto: 'il cielo: unica inquadratura verso l\'alto',
        fasi: [
            { nome: 'sipario', passi: 12, camera: 'cielo', tinta: 'arancio' },
            { nome: 'gesto', passi: 46, camera: 'cielo', effetti: ['stelle'] },
            { nome: 'colpo', passi: 16, camera: 'terra', effetti: ['onde-tre', 'scossa', 'flash'] },
            { nome: 'ritorno', passi: 20, camera: 'normale', effetti: ['fiamme'] }
        ]
    },
    {
        verdellinese: 'SekouCamara',
        testo: 'GIUDIZIO DEGLI ANTENATI',
        colore: '#b06aff',
        gesto: 'il silenzio diventa un\'immagine',
        fasi: [
            { nome: 'sipario', passi: 14, camera: 'folla', tinta: 'nero' },
            { nome: 'gesto', passi: 44, camera: 'folla', effetti: ['silhouette'] },
            { nome: 'colpo', passi: 14, camera: 'anello', effetti: ['anello', 'flash'] },
            { nome: 'ritorno', passi: 20, camera: 'normale', effetti: ['comandi-spenti'] }
        ]
    },
    {
        verdellinese: 'AyoAdebayo',
        testo: 'ECLISSI ARCANA',
        colore: '#d29bff',
        gesto: 'lo schermo si spegne',
        fasi: [
            { nome: 'sipario', passi: 14, camera: 'controluce', tinta: 'nero' },
            { nome: 'gesto', passi: 44, camera: 'disco', effetti: ['disco'] },
            { nome: 'colpo', passi: 12, camera: 'raggio', effetti: ['nero-assoluto', 'flash'] },
            { nome: 'ritorno', passi: 22, camera: 'normale', effetti: ['riga-viola'] }
        ]
    }
];

/** Il copione di un verdellinese, o null se non ne ha uno. */
function copioneScenaCutscene(verdellinese) {
    return COPIONI.find(function (copione) {
        return copione.verdellinese === verdellinese;
    }) || null;
}

/** Quanto dura una scena, in passi. */
function durataScenaCutscene(copione) {
    if (!copione || !copione.fasi) return 0;
    return copione.fasi.reduce(function (somma, fase) { return somma + fase.passi; }, 0);
}

/**
 * Avvia la scena di un verdellinese.
 * Se non ha copione la scena non è attiva: il motore lo tratta come "niente
 * cutscene" e applica il colpo normalmente.
 */
function avviaScenaCutscene(verdellinese) {
    const copione = copioneScenaCutscene(verdellinese);
    if (!copione) return { attiva: false, fase: 0, passi: 0, copione: null };
    return { attiva: true, fase: 0, passi: 0, copione: copione };
}

/** Avanza di un passo. Alla fine dei passi la scena si spegne da sola. */
function avanzaScenaCutscene(scena) {
    if (!scena || !scena.attiva || !scena.copione) return scena;

    const fasi = scena.copione.fasi;
    const prossima = Object.assign({}, scena);
    prossima.passi = scena.passi + 1;

    // la fase cambia quando si supera la somma dei passi delle fasi precedenti
    let accumulato = 0;
    let indice = 0;
    for (let i = 0; i < fasi.length; i++) {
        accumulato += fasi[i].passi;
        if (prossima.passi < accumulato) { indice = i; break; }
        indice = i;
    }
    prossima.fase = indice;

    if (prossima.passi >= durataScenaCutscene(scena.copione)) {
        prossima.fase = fasi.length - 1;
        prossima.attiva = false;
    }
    return prossima;
}

/** Il nome della fase in corso: sipario, gesto, colpo, ritorno. */
function faseScenaCutscene(scena) {
    const fase = faseCorrenteScenaCutscene(scena);
    return fase ? fase.nome : null;
}

/** La fase in corso come oggetto: serve al disegno. */
function faseCorrenteScenaCutscene(scena) {
    if (!scena || !scena.copione) return null;
    const fasi = scena.copione.fasi;
    const indice = Math.max(0, Math.min(scena.fase, fasi.length - 1));
    return fasi[indice] || null;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        COPIONI: COPIONI,
        copioneScenaCutscene: copioneScenaCutscene,
        durataScenaCutscene: durataScenaCutscene,
        avviaScenaCutscene: avviaScenaCutscene,
        avanzaScenaCutscene: avanzaScenaCutscene,
        faseScenaCutscene: faseScenaCutscene,
        faseCorrenteScenaCutscene: faseCorrenteScenaCutscene
    };
}
