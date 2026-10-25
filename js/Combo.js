// ========================================
// La combo universale
// ==========================================
// Una sola combo, uguale per tutti i verdellinesi. Le sei regole dell'autore:
//
//  1. un colpo normale spinge l'avversario FUORI dal raggio: lo scambio
//     finisce lì;
//  2. un colpo su un avversario STUNNATO lo porta leggermente in alto e
//     leggermente in avanti: si resta a contatto, e da lì comincia la combo;
//  3. in aria si fanno fino a TRE attacchi consecutivi;
//  4. il TERZO lo spedisce lontano da chi lo ha colpito;
//  5. dopo, l'unico modo per continuare è un attacco a distanza;
//  6. chi riceve la combo diventa INTANGIBILE per un paio di secondi,
//     lampeggiando bianco.
//
// Perché l'intangibilità parte all'atterraggio e non dal primo colpo: la
// regola 5 e la regola 6, prese alla lettera, si contraddicono — se il
// bersaglio diventasse intangibile subito, il tiro a distanza che dovrebbe
// continuare la combo non potrebbe mai colpirlo. All'atterraggio invece la
// combo è finita davvero, e il tiro è già partito.
//
// Modulo puro: nessun disegno, nessun DOM, nessuno stato globale. Si prova con
// `node tools/prova_combo.js`.

const COMBO = {
    // quanto sale e quanto avanza il colpo che apre la combo
    SOLLEVAMENTO: 60,
    AVANTI: 40,

    // sospensione: il bersaglio resta in aria il tempo di essere colpito
    SOSPENSIONE_FRAMI: 18,
    GRAVITA_SOSPESA: 0.3,

    // colpi in aria e quanto pesano
    COLPI: 3,
    MOLTIPLICATORI: [1, 0.85, 0.7],

    // il terzo colpo spedisce lontano
    SPINTA_TERZO: 320,

    // dopo la combo: intangibile, lampeggiando bianco
    INTANGIBILE_FRAMI: 120,
    LAMPEGGIO: 6,

    // nessuna combo può togliere più di questa quota di vita max
    TETTO_VITA: 0.45,

    // attacco a distanza: il modo per continuare dopo la combo
    DISTANZA: { stamina: 20, ricarica: 90, danno: 12, sospensione: 8 }
};

/** Una combo appena cominciata: primo colpo già a segno. */
function comboInizia() {
    return { colpi: 1, inflitto: 0 };
}

/** Quanto pesa il colpo numero `colpi` (1, 2, 3). */
function comboMoltiplicatore(colpi) {
    const indice = Math.max(1, Math.min(COMBO.COLPI, colpi)) - 1;
    return COMBO.MOLTIPLICATORI[indice];
}

/**
 * Il danno di un colpo di combo, tagliato dal tetto di vita.
 * Torna `{danno, combo}`: la combo aggiornata porta il totale inflitto, così il
 * tetto vale sulla combo intera e non sul singolo colpo.
 */
function comboDanno(dannoBase, combo, vitaMassima) {
    const stato = combo || comboInizia();
    const grezzo = Math.max(1, Math.round(dannoBase * comboMoltiplicatore(stato.colpi)));
    const tetto = Math.max(1, Math.round((vitaMassima || 100) * COMBO.TETTO_VITA));
    const resta = Math.max(0, tetto - (stato.inflitto || 0));
    const danno = Math.min(grezzo, resta);

    return {
        danno: danno,
        combo: { colpi: stato.colpi, inflitto: (stato.inflitto || 0) + danno }
    };
}

/** La combo è arrivata in fondo (tre colpi)? */
function comboChiusa(combo) {
    return !!combo && combo.colpi >= COMBO.COLPI;
}

/** Questo è il colpo che spedisce lontano? */
function comboColpoFinale(combo) {
    return !!combo && combo.colpi >= COMBO.COLPI;
}

/** Si può ancora colpire in aria? */
function comboPuoContinuare(combo) {
    return !!combo && combo.colpi >= 1 && combo.colpi < COMBO.COLPI;
}

/** Il bersaglio è in stato "sospeso", cioè fra un colpo e l'altro? */
function comboSospeso(sospeso) {
    return (sospeso || 0) > 0;
}

/** Durante l'intangibilità i colpi passano senza fare niente. */
function comboIntangibile(timer) {
    return (timer || 0) > 0;
}

/** Lampeggia bianco a tratti: acceso metà del tempo. */
function comboLampeggia(timer) {
    if ((timer || 0) <= 0) return false;
    return (timer % (COMBO.LAMPEGGIO * 2)) < COMBO.LAMPEGGIO;
}

/**
 * Dopo quanti passi l'intangibilità è finita.
 * Serve al disegno e alle prove: un timer negativo non ha senso.
 */
function comboAggiornaTimer(timer) {
    return Math.max(0, (timer || 0) - 1);
}

if (typeof module !== 'undefined' && module.exports) {
    // Nel browser le funzioni sono globali e hanno il prefisso 'combo': un
    // 'lampeggia' o un 'iniziaCombo' nudo si sarebbe scontrato con qualunque
    // altro nome del gioco. Per Node restano con i nomi corti, così le prove
    // leggono bene.
    module.exports = {
        COMBO: COMBO,
        iniziaCombo: comboInizia,
        moltiplicatore: comboMoltiplicatore,
        dannoCombo: comboDanno,
        comboChiusa: comboChiusa,
        eColpoFinale: comboColpoFinale,
        puoContinuare: comboPuoContinuare,
        eSospeso: comboSospeso,
        eIntangibile: comboIntangibile,
        lampeggia: comboLampeggia,
        aggiornaTimer: comboAggiornaTimer
    };
}
