// ========================================
// Gli effetti propri di ogni cutscene
// ==========================================
// Il disegno comune della scena (fondale, camera, barre, cartello) sta in
// index.js. Qui c'è quello che rende la scena SUA e di nessun altro: le radici
// di Ousmane, il mondo che si inclina per Kwame, il nero assoluto di Ayo.
//
// Una funzione per verdellinese, scelta per identificativo. Chi implementa una
// scena nuova aggiunge una voce alla tabella e non tocca il resto.
//
// Il contesto che arriva qui:
//   c           il contesto 2D del canvas
//   larghezza   larghezza del canvas
//   altezza     altezza del canvas
//   suolo       la linea di terra della scena
//   fase        la fase in corso (sipario, gesto, colpo, ritorno)
//   dentroFase  quanti passi sono passati dentro la fase
//   avanzamento 0..1 dentro la fase
//   colore      il colore del personaggio
//   attaccante  il lottatore che ha eseguito la ultimate
//   difensore   il lottatore che l'ha presa
//   xAttaccante, xDifensore  le posizioni in scena

/**
 * Radici che escono dal suolo e si chiudono sul nemico.
 * Il baobab è sotto: nessun'altra scena guarda il pavimento.
 */
function scenaRadiciBaobab(c, k) {
    const quante = Math.round(4 + 8 * k.avanzamento);
    c.save();
    for (let i = 0; i < quante; i++) {
        const base = k.xDifensore + 40 + ((i * 47) % 130) - 60;
        const altezzaRadice = 40 + 110 * k.avanzamento + ((i * 31) % 40);
        const piega = Math.sin(k.avanzamento * Math.PI * 2 + i) * 18;

        c.strokeStyle = 'rgba(24,44,34,0.95)';
        c.lineWidth = 5 + (i % 3);
        c.beginPath();
        c.moveTo(base, k.suolo + 4);
        c.quadraticCurveTo(base + piega, k.suolo - altezzaRadice * 0.6,
            base + piega * 1.8, k.suolo - altezzaRadice);
        c.stroke();

        // la punta chiara: la radice ha un artiglio
        c.strokeStyle = k.colore;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(base + piega * 1.8, k.suolo - altezzaRadice);
        c.lineTo(base + piega * 1.8 + 9, k.suolo - altezzaRadice - 12);
        c.stroke();
    }
    c.restore();
}

/**
 * Il mondo si inclina: non la telecamera, proprio tutto lo scenario.
 * Resta inclinato finché non scatta dritto nella fase del colpo.
 */
function scenaMondoInclinato(c, k) {
    // L'inclinazione del mondo non si fa qui: la applica la camera in index.js,
    // perché la rotazione del canvas vale solo per i disegni successivi e gli
    // sprite sono già stati disegnati. Qui resta il movimento della scena.
    const scatto = (k.fase === 'colpo') ? 1 - Math.min(1, k.avanzamento * 3) : 0;

    c.save();

    // la spirale: particelle che salgono a vite attorno a Kwame
    if (k.fase === 'gesto' || k.fase === 'colpo') {
        for (let i = 0; i < 26; i++) {
            const giro = k.avanzamento * Math.PI * 4 + i * 0.42;
            const raggio = 30 + i * 6;
            const x = k.xAttaccante + 40 + Math.cos(giro) * raggio;
            const y = k.suolo - 60 - i * 5 + Math.sin(giro) * (raggio * 0.35);
            c.fillStyle = k.colore;
            c.globalAlpha = Math.max(0, 1 - i / 28) * 0.75;
            c.fillRect(x, y, 3, 3);
        }
    }

    // lo strattone del mondo che torna dritto
    if (scatto > 0) {
        c.globalAlpha = scatto * 0.35;
        c.fillStyle = '#ffffff';
        c.fillRect(-k.larghezza, -k.altezza, k.larghezza * 3, k.altezza * 3);
    }
    c.restore();
    c.globalAlpha = 1;
}

/**
 * Un secondo di immobilità, poi il ruggito. La potenza è nell'attesa:
 * in un gioco che non sta mai fermo, il fermo è la cosa più forte.
 */
function scenaRuggitoLeone(c, k) {
    // durante il gesto non succede niente di proposito: solo l'aura che pulsa
    if (k.fase === 'gesto') {
        const battito = 0.5 + 0.5 * Math.sin(k.dentroFase * 0.35);
        c.save();
        c.globalAlpha = 0.10 + 0.22 * battito;
        c.strokeStyle = k.colore;
        c.lineWidth = 3;
        for (let anello = 0; anello < 3; anello++) {
            const raggio = 40 + anello * 26 + battito * 10;
            c.beginPath();
            c.ellipse(k.xAttaccante + 30, k.suolo - 70, raggio, raggio * 0.72, 0, 0, Math.PI * 2);
            c.stroke();
        }
        c.restore();
    }

    // il ruggito: onde concentriche e crepe nel fondale
    if (k.fase === 'colpo') {
        c.save();
        for (let onda = 0; onda < 3; onda++) {
            const ritardo = onda * 0.18;
            const progresso = Math.max(0, Math.min(1, k.avanzamento - ritardo));
            if (progresso <= 0) continue;
            const raggio = 40 + progresso * 520;
            c.globalAlpha = (1 - progresso) * 0.55;
            c.strokeStyle = k.colore;
            c.lineWidth = 6 - onda * 1.6;
            c.beginPath();
            c.arc(k.xAttaccante + 30, k.suolo - 80, raggio, 0, Math.PI * 2);
            c.stroke();
        }

        // crepe che partono dal punto d'impatto
        c.globalAlpha = 0.7 * (1 - k.avanzamento * 0.5);
        c.strokeStyle = '#1a2a24';
        c.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
            const angolo = (Math.PI * 2 / 9) * i;
            const lungo = 60 + 90 * k.avanzamento;
            c.beginPath();
            c.moveTo(k.xDifensore + 30, k.suolo - 40);
            c.lineTo(k.xDifensore + 30 + Math.cos(angolo) * lungo,
                k.suolo - 40 + Math.sin(angolo) * lungo * 0.6);
            c.stroke();
        }
        c.restore();
    }
}

/**
 * Tre ombre di Amara che danzano e rientrano in lei.
 * È l'unica ultimate che non fa danno: la scena mostra il vantaggio, non la
 * violenza, e per questo è la più elegante delle nove.
 */
function scenaDanzaFulminea(c, k) {
    if (k.fase !== 'gesto' && k.fase !== 'colpo') return;

    const rientro = (k.fase === 'colpo') ? k.avanzamento : 0;
    const attaccante = k.attaccante;
    if (!attaccante || typeof attaccante.draw !== 'function') return;

    const posizioneVera = { x: attaccante.position.x, y: attaccante.position.y };
    const posa = [
        { dx: -150, dy: 0, alfa: 0.45 },
        { dx: 0, dy: -70, alfa: 0.32 },
        { dx: 150, dy: 0, alfa: 0.45 }
    ];

    for (let i = 0; i < posa.length; i++) {
        const distanza = posa[i];
        const x = k.xAttaccante + distanza.dx * (1 - rientro);
        const y = (k.suolo - attaccante.height) + distanza.dy * (1 - rientro);

        c.save();
        c.globalAlpha = distanza.alfa * (1 - 0.6 * rientro);
        attaccante.position.x = x;
        attaccante.position.y = y;
        attaccante.draw();
        c.restore();
    }

    attaccante.position.x = posizioneVera.x;
    attaccante.position.y = posizioneVera.y;
}

/**
 * Il cerchio dall'alto: il campo visto come una mappa.
 * Per un attimo il picchiaduro sembra un gioco di strategia.
 */
function scenaCerchioAncestrale(c, k) {
    if (k.fase === 'sipario' || k.fase === 'ritorno') return;

    const centroX = k.xDifensore + 30;
    const centroY = k.suolo - 40;
    c.save();
    c.lineWidth = 3;
    c.strokeStyle = k.colore;

    for (let anello = 0; anello < 3; anello++) {
        const progresso = Math.max(0, Math.min(1, k.avanzamento - anello * 0.15));
        if (progresso <= 0) continue;
        const raggio = 30 + progresso * 210;
        c.globalAlpha = (1 - progresso) * 0.7;
        c.beginPath();
        c.ellipse(centroX, centroY, raggio, raggio * 0.34, 0, 0, Math.PI * 2);
        c.stroke();
    }

    // le spire velenose che salgono dal cerchio
    if (k.fase === 'colpo') {
        c.globalAlpha = 0.8;
        for (let i = 0; i < 7; i++) {
            const base = centroX + (i - 3) * 22;
            const altezza = 120 * k.avanzamento;
            c.beginPath();
            c.moveTo(base, centroY);
            c.quadraticCurveTo(base + 18, centroY - altezza * 0.6, base, centroY - altezza);
            c.stroke();
        }
    }
    c.restore();
}

/**
 * Il punto di vista è la freccia: attraversa lo schermo in diagonale.
 * È l'unico movimento di camera "da film" del gioco.
 */
function scenaFrecciaSavana(c, k) {
    if (k.fase !== 'gesto' && k.fase !== 'colpo') return;

    const partenza = { x: k.xAttaccante + 10, y: k.suolo - 90 };
    const arrivo = { x: k.xDifensore + 30, y: k.suolo - 60 };
    const t = (k.fase === 'gesto') ? k.avanzamento : 1;
    const x = partenza.x + (arrivo.x - partenza.x) * t;
    const y = partenza.y + (arrivo.y - partenza.y) * t - Math.sin(t * Math.PI) * 40;

    c.save();
    // la scia
    for (let i = 1; i <= 6; i++) {
        const dietro = Math.max(0, t - i * 0.03);
        const xs = partenza.x + (arrivo.x - partenza.x) * dietro;
        const ys = partenza.y + (arrivo.y - partenza.y) * dietro - Math.sin(dietro * Math.PI) * 40;
        c.globalAlpha = 0.5 * (1 - i / 7);
        c.fillStyle = k.colore;
        c.fillRect(xs - 2, ys - 2, 5, 5);
    }

    // la punta
    c.globalAlpha = 1;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x - 22, y - 8);
    c.lineTo(x + 12, y + 4);
    c.stroke();
    c.restore();

    // il sigillo che brucia sul petto del nemico
    if (k.fase === 'colpo') {
        c.save();
        c.globalAlpha = Math.min(1, k.avanzamento * 2);
        c.strokeStyle = k.colore;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(k.xDifensore + 30, k.suolo - 70, 26, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.moveTo(k.xDifensore + 10, k.suolo - 84);
        c.lineTo(k.xDifensore + 50, k.suolo - 56);
        c.stroke();
        c.restore();
    }
}

/**
 * Il cielo: la prima volta che il gioco lo mostra, e si crepa.
 * Guardare in alto cambia la scala della scena.
 */
function scenaPioggiaDiStelle(c, k) {
    if (k.fase !== 'gesto' && k.fase !== 'colpo') return;

    c.save();
    const quante = (k.fase === 'gesto') ? 18 : 30;
    for (let i = 0; i < quante; i++) {
        const partenza = (i * 97) % k.larghezza;
        const t = (k.fase === 'gesto') ? k.avanzamento : 1;
        const cade = (t * k.altezza * 1.1 + i * 37) % (k.altezza + 120);
        const x = partenza + cade * 0.35;
        const y = cade - 60;
        if (y < 0 || y > k.suolo) continue;

        c.globalAlpha = 0.25 + 0.55 * (y / k.suolo);
        c.strokeStyle = k.colore;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + 14, y - 26);
        c.stroke();
    }

    // le onde di fiamma al suolo, in sequenza
    if (k.fase === 'colpo') {
        for (let onda = 0; onda < 3; onda++) {
            const progresso = Math.max(0, Math.min(1, k.avanzamento * 1.6 - onda * 0.25));
            if (progresso <= 0) continue;
            c.globalAlpha = (1 - progresso) * 0.6;
            c.fillStyle = k.colore;
            c.fillRect(k.xDifensore - 60 - progresso * 120, k.suolo - 6,
                120 + progresso * 240, 8);
        }
    }
    c.restore();
}

/**
 * Il silenzio diventa un'immagine: le silhouette degli antenati,
 * e i comandi del nemico che si spengono uno per uno.
 */
function scenaGiudizioAntenati(c, k) {
    if (k.fase === 'sipario') return;

    c.save();
    const quante = (k.fase === 'gesto') ? Math.round(3 + 12 * k.avanzamento) : 15;
    for (let i = 0; i < quante; i++) {
        const x = (i * 71) % (k.larghezza - 60) + 30;
        const altezza = 90 + ((i * 37) % 50);
        c.globalAlpha = 0.35 + ((i % 3) * 0.1);
        c.fillStyle = '#0a0a12';
        c.beginPath();
        c.ellipse(x, k.suolo - altezza, 14, altezza * 0.55, 0, 0, Math.PI * 2);
        c.fill();
    }

    // l'anello che si chiude sul nemico
    if (k.fase === 'colpo' || k.fase === 'gesto') {
        const chiusura = (k.fase === 'gesto') ? k.avanzamento * 0.7 : 0.7 + 0.3 * k.avanzamento;
        c.globalAlpha = 0.85;
        c.strokeStyle = k.colore;
        c.lineWidth = 4;
        c.beginPath();
        c.ellipse(k.xDifensore + 30, k.suolo - 50, 90 * chiusura, 26 * chiusura, 0, 0, Math.PI * 2);
        c.stroke();
    }

    // i comandi del nemico che si spengono
    if (k.fase === 'colpo' || k.fase === 'ritorno') {
        const spenti = (k.fase === 'ritorno') ? 4 : Math.round(4 * k.avanzamento);
        c.globalAlpha = 0.9;
        for (let i = 0; i < 4; i++) {
            const x = k.larghezza - 150 + i * 30;
            const y = 120;
            c.fillStyle = (i < spenti) ? 'rgba(40,40,40,0.9)' : 'rgba(180,180,180,0.85)';
            c.fillRect(x, y, 22, 22);
            if (i < spenti) {
                c.strokeStyle = '#5a1a1a';
                c.lineWidth = 2;
                c.beginPath();
                c.moveTo(x + 3, y + 3);
                c.lineTo(x + 19, y + 19);
                c.stroke();
            }
        }
    }
    c.restore();
}

/**
 * L'eclissi: un disco scuro attraversa lo schermo, poi sei passi di nero
 * assoluto. È la cosa più coraggiosa che un gioco a schermo pieno possa fare.
 */
function scenaEclissiArcana(c, k) {
    // il disco che attraversa
    if (k.fase === 'gesto' || k.fase === 'colpo') {
        const t = (k.fase === 'gesto') ? k.avanzamento : 1;
        const x = -200 + t * (k.larghezza + 400);
        const y = k.suolo - 160;
        c.save();
        c.fillStyle = '#020203';
        c.beginPath();
        c.arc(x, y, 170, 0, Math.PI * 2);
        c.fill();
        // il solo raggio che resta
        c.globalAlpha = 0.85;
        c.strokeStyle = k.colore;
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(x + 120, y + 90);
        c.lineTo(k.xDifensore + 30, k.suolo - 60);
        c.stroke();
        c.restore();
    }

    // sei passi di nero assoluto
    if (k.fase === 'colpo' && k.dentroFase >= 4 && k.dentroFase <= 10) {
        c.fillStyle = '#000000';
        c.fillRect(0, 0, k.larghezza, k.altezza);
    }

    // la riga viola che resta sul nemico
    if (k.fase === 'ritorno') {
        c.save();
        c.globalAlpha = Math.min(1, k.avanzamento * 2);
        c.strokeStyle = k.colore;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(k.xDifensore - 20, k.suolo - 130);
        c.lineTo(k.xDifensore + 80, k.suolo - 10);
        c.stroke();
        c.restore();
    }
}

// La tabella: identificativo del verdellinese → disegno della sua scena.
const EFFETTI_CUTSCENE = {
    OusmaneDiouf: scenaRadiciBaobab,
    KwameMensah: scenaMondoInclinato,
    ChidiOkonkwo: scenaRuggitoLeone,
    AmaraDiallo: scenaDanzaFulminea,
    TarisaiMoyo: scenaCerchioAncestrale,
    ZuriNkosi: scenaFrecciaSavana,
    BakariTraore: scenaPioggiaDiStelle,
    SekouCamara: scenaGiudizioAntenati,
    AyoAdebayo: scenaEclissiArcana
};

/**
 * Disegna l'effetto proprio della scena, se quel verdellinese ne ha uno.
 * Torna false se non lo ha: chi chiama non deve sapere nulla.
 */
function disegnaEffettoProprioCutscene(c, contesto) {
    const identificativo = contesto.scena && contesto.scena.copione
        ? contesto.scena.copione.verdellinese
        : null;
    const disegno = EFFETTI_CUTSCENE[identificativo];
    if (!disegno) return false;
    disegno(c, contesto);
    return true;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EFFETTI_CUTSCENE: EFFETTI_CUTSCENE,
        disegnaEffettoProprioCutscene: disegnaEffettoProprioCutscene
    };
}
