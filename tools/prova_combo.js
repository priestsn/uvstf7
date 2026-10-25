// tools/prova_combo.js — la combo universale, verificata senza browser.
//
// Una combo si sbaglia in tre modi: fa troppo danno, non finisce mai, oppure
// il bersaglio resta bloccato per sempre. Qui si controllano tutte e tre.
const path = require('path');
const combo = require(path.join(__dirname, '..', 'js', 'Combo.js'));
const C = combo.COMBO;

const risultati = [];
function verifica(nome, condizione, dettaglio) {
    risultati.push(!!condizione);
    console.log((condizione ? 'OK       ' : 'FALLITO  ') + nome.padEnd(58) + (dettaglio || ''));
}

// --- i numeri approvati --------------------------------------------------

verifica('il primo colpo non riduce il danno', combo.moltiplicatore(1) === 1);
verifica('il secondo colpo pesa 0,85', combo.moltiplicatore(2) === 0.85);
verifica('il terzo colpo pesa 0,70', combo.moltiplicatore(3) === 0.7);
verifica('la combo ha tre colpi', C.COLPI === 3);
verifica('il terzo colpo spedisce a 320', C.SPINTA_TERZO === 320);
verifica('l\'intangibilità dura due secondi', C.INTANGIBILE_FRAMI === 120);
verifica('il bersaglio sale di 60', C.SOLLEVAMENTO === 60);
verifica('il bersaglio avanza di 40', C.AVANTI === 40);

// --- la combo cresce e si chiude ----------------------------------------

let stato = combo.iniziaCombo();
verifica('la combo comincia dal primo colpo', stato.colpi === 1);
verifica('al primo colpo si può continuare', combo.puoContinuare(stato) === true);
verifica('al primo colpo non è finita', combo.comboChiusa(stato) === false);

// per il secondo colpo si passa lo stato con colpi = 2: dannoCombo usa
// `colpi` come numero del colpo che si sta applicando
const secondo = combo.dannoCombo(10, { colpi: 2, inflitto: stato.inflitto }, 100);
verifica('il secondo colpo fa 9 su un danno base di 10', secondo.danno === 9, 'fatto ' + secondo.danno);
stato = { colpi: 2, inflitto: secondo.combo.inflitto };

const terzo = combo.dannoCombo(10, { colpi: 3, inflitto: stato.inflitto }, 100);
verifica('il terzo colpo fa 7', terzo.danno === 7, 'fatto ' + terzo.danno);
stato = { colpi: 3, inflitto: terzo.combo.inflitto };
verifica('dopo tre colpi la combo è chiusa', combo.comboChiusa(stato) === true);
verifica('dopo tre colpi non si continua in mischia', combo.puoContinuare(stato) === false);

// --- il tetto di vita ---------------------------------------------------

let s = { colpi: 1, inflitto: 0 };
let inflitto = 0;
for (let i = 0; i < 10; i++) {
    const colpo = combo.dannoCombo(20, { colpi: Math.min(3, i + 1), inflitto: inflitto }, 100);
    inflitto += colpo.danno;
}
verifica('dieci colpi non tolgono più del 45% della vita', inflitto <= 45, 'tolti ' + inflitto);

const tetto = combo.dannoCombo(999, combo.iniziaCombo(), 100);
verifica('un colpo enorme è tagliato dal tetto', tetto.danno === 45, 'fatto ' + tetto.danno);

// --- sospensione e intangibilità ----------------------------------------

verifica('con sospensione zero il bersaglio non è sospeso', combo.eSospeso(0) === false);
verifica('con sospensione attiva il bersaglio è sospeso', combo.eSospeso(5) === true);
verifica('un timer a zero non è intangibile', combo.eIntangibile(0) === false);
verifica('un timer positivo è intangibile', combo.eIntangibile(30) === true);

verifica('il lampeggio si accende e si spegne', combo.lampeggia(1) === true && combo.lampeggia(7) === false,
    'acceso a 1, spento a 7');
verifica('il lampeggio è spento quando l\'intangibilità è finita', combo.lampeggia(0) === false);

verifica('il timer non scende sotto zero', combo.aggiornaTimer(0) === 0);
verifica('il timer scende di uno per passo', combo.aggiornaTimer(10) === 9);

// --- l'attacco a distanza ------------------------------------------------

verifica('l\'attacco a distanza costa 20 di stamina', C.DISTANZA.stamina === 20);
verifica('l\'attacco a distanza ricarica in 90 passi', C.DISTANZA.ricarica === 90);
verifica('l\'attacco a distanza fa 12', C.DISTANZA.danno === 12);

const passate = risultati.filter(Boolean).length;
console.log('\n' + passate + '/' + risultati.length + ' verifiche passate');
process.exit(passate === risultati.length ? 0 : 1);
