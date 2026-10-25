// ========================================
// La tab dei verdellinesi
// ==========================================
// Una schermata del menu che mostra tutti e nove, uno sotto l'altro, con la
// scheda completa: statistiche, passiva, tattica, attacco a distanza e ultimate.
//
// Perché esiste: passive, tattiche e attacchi a distanza erano nel motore ma
// non c'era nessun posto dove leggerle. Chi sceglieva un personaggio vedeva
// solo vita, danno e velocità.
//
// Si scorre col dito o con la rotella; in tastiera le frecce su/giù spostano di
// una scheda e Esc torna al menu.

const ROSTER = { indice: 0 };

/** Crea un elemento con classe e testo (stesso schema di Classifica.js). */
function rosterCrea(tag, classe, testo) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (testo !== undefined && testo !== null) elemento.textContent = testo;
    return elemento;
}

/** Una riga "ETICHETTA — testo" della scheda. */
function rosterRiga(classe, etichetta, testo) {
    const riga = rosterCrea('div', 'roster-riga ' + classe);
    riga.appendChild(rosterCrea('span', 'roster-etichetta', etichetta));
    riga.appendChild(rosterCrea('span', 'roster-valore', testo));
    return riga;
}

/**
 * Apre la schermata dei verdellinesi e la disegna.
 */
function apriVerdellinesi() {
    cambiaStato(STATI.VERDELLINESI);
    disegnaVerdellinesi();
}

/**
 * Costruisce la schermata: titolo, tutte le schede, il ritorno.
 */
function disegnaVerdellinesi() {
    const contenitore = document.querySelector('#verdellinesi');
    if (!contenitore) return;

    contenitore.innerHTML = '';

    const testata = rosterCrea('div', 'roster-testata');
    testata.appendChild(rosterCrea('div', 'roster-titolo', 'I VERDELLINESI'));
    testata.appendChild(rosterCrea('div', 'roster-sottotitolo',
        'Ognuno ha una passiva, una tattica e un attacco a distanza. Scorri per leggerli tutti.'));
    contenitore.appendChild(testata);

    const elenco = rosterCrea('div', 'roster-elenco');
    VERDELLINESI.forEach((personaggio, indice) => {
        elenco.appendChild(cartaVerdellinese(personaggio, indice));
    });
    contenitore.appendChild(elenco);

    const piede = rosterCrea('div', 'roster-piede');
    const indietro = rosterCrea('button', 'roster-indietro', 'TORNA AL MENU');
    indietro.type = 'button';
    indietro.addEventListener('click', chiudiVerdellinesi);
    piede.appendChild(indietro);
    contenitore.appendChild(piede);
}

/** La scheda di un verdellinese. */
function cartaVerdellinese(personaggio, indice) {
    const stat = personaggio.statistiche;
    const carta = rosterCrea('div', 'roster-carta');
    carta.setAttribute('data-indice', String(indice));

    const testata = rosterCrea('div', 'roster-carta-testata');
    testata.appendChild(rosterCrea('span', 'roster-numero', String(indice + 1).padStart(2, '0')));
    testata.appendChild(rosterCrea('span', 'roster-nome', personaggio.nome));
    testata.appendChild(rosterCrea('span', 'roster-archetipo', personaggio.archetipo || ''));
    carta.appendChild(testata);

    carta.appendChild(rosterRiga('roster-stat', 'STATISTICHE',
        'Vita ' + stat.vita +
        ' · Stamina ' + stat.stamina +
        ' · Danno ' + stat.danno +
        ' · Costo ' + stat.costoStamina +
        ' · Velocità ' + stat.velocita +
        ' · Salto ' + Math.abs(stat.salto)));

    if (personaggio.passiva) {
        carta.appendChild(rosterRiga('roster-passiva', 'PASSIVA · ' + personaggio.passiva.nome,
            personaggio.passiva.descrizione));
    }

    if (personaggio.tattica) {
        carta.appendChild(rosterRiga('roster-tattica',
            'TATTICA · ' + personaggio.tattica.nome + ' (' + personaggio.tattica.costo + ' stamina)',
            personaggio.tattica.descrizione));
    }

    if (personaggio.distanza) {
        carta.appendChild(rosterRiga('roster-distanza',
            'DISTANZA · ' + personaggio.distanza.nome + ' (danno ' + personaggio.distanza.danno + ')',
            personaggio.distanza.nota || ''));
    }

    if (personaggio.ultimate) {
        const ultimate = personaggio.ultimate;
        carta.appendChild(rosterRiga('roster-ultimate',
            'ULTIMATE · ' + ultimate.nome +
            ' (' + (ultimate.tipo === 'proiettile' ? 'a distanza' : 'da mischia') + ', danno ' + ultimate.danno + ')',
            ultimate.descrizione || ''));
    }

    return carta;
}

/** Chiude e torna al menu principale. */
function chiudiVerdellinesi() {
    const contenitore = document.querySelector('#verdellinesi');
    if (contenitore) contenitore.innerHTML = '';
    apriMenu('principale');
}

/** Frecce su/giù: porta in vista la scheda precedente o successiva. */
function scorriVerdellinesi(passo) {
    const carte = document.querySelectorAll('#verdellinesi .roster-carta');
    if (!carte.length) return;

    ROSTER.indice = Math.max(0, Math.min(carte.length - 1, ROSTER.indice + passo));
    const carta = carte[ROSTER.indice];
    if (carta && carta.scrollIntoView) {
        carta.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ROSTER: ROSTER };
}
