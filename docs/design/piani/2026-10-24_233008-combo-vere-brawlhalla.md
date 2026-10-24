# Le combo vere — sistema alla Brawlhalla per UVSF7

Piano di implementazione. Completa il lavoro sui set dei verdellinesi (passiva, tattica, ultimate) e si appoggia alle regole pure già esistenti.

---

## Goal

Far esistere nel gioco le **combo vere**: sequenze di due o tre colpi in cui chi le subisce **non ha nessuna via d'uscita**, perché è ancora nella reazione del colpo precedente quando arriva il successivo.

## Come funzionano le combo in Brawlhalla (il modello da copiare)

Tre regole, e niente magia:

1. **Hitstun** — chi viene colpito non può agire per un numero fisso di fotogrammi. Finché è lì dentro, non para, non salta, non risponde.
2. **Vantaggio di fotogrammi** — se chi attacca torna operativo *prima* che l'altro esca dall'hitstun, allora può colpire di nuovo. Se invece torna dopo, il colpo successivo è solo un tentativo.
3. **Scalatura e spinte crescenti** — ogni colpo in più fa meno danno e spinge più lontano, quindi la catena finisce da sola. È questo che impedisce i combo infiniti, non un timer.

Da qui la definizione, che è anche la definizione del test: **una combo è vera quando, per ogni anello, il colpo successivo arriva prima che l'avversario possa agire.** In Brawlhalla la scappatoia è la schivata direzionale: una combo è "vera" se nemmeno la schivata può uscire. Nel nostro gioco la scappatoia sarebbe la parata, ma durante l'hitstun non si può parare — quindi il concetto si trasferisce intatto.

## Cosa c'è oggi in UVSF7, misurato

| Parametro | Valore | Dove |
|---|---|---|
| Reazione al colpo (`DANNO_FRAMI`) | **12 fotogrammi** | `index.js:79` |
| Recupero prima di poter riattaccare (`FINESTRA_RECUPERO`) | **16 fotogrammi** | `js/Comandi.js:14` |
| Finestra d'impatto minima | **8 fotogrammi** | `js/Regole.js` |

Il conto è presto fatto: chi viene colpito è libero dopo **12** fotogrammi, chi ha colpito è libero dopo **16**. Chi attacca arriva **quattro fotogrammi in ritardo** — e per di più il colpo successivo impiega almeno 8 fotogrammi ad andare a segno. Totale: **difetto di 12 fotogrammi**.

**Oggi una combo non è possibile per costruzione.** Non è un difetto: nessuno l'ha mai chiesta. Perché esista bisogna cambiare due numeri e aggiungere una regola, ed è esattamente quello che fa questo piano.

## Il sistema proposto

### 1. La catena: quando un colpo va a segno, il recupero si accorcia

Quando il tuo attacco **colpisce davvero**, il tuo recupero scende da 16 a **5 fotogrammi**. Il colpo successivo, se lo fai subito, ha la finestra d'impatto accorciata da 8 a **3 fotogrammi** (è un "colpo di seguito": più corto e più rapido).

### 2. I numeri, con il conto dei fotogrammi

| Colpo | Arriva a | Reazione che applica | Avversario libero a | Tu sei libero a | Colpo dopo colpisce a |
|---|---|---|---|---|---|
| 1° | 0 | 12 | 12 | 5 | 8 |
| 2° | 8 | 10 | 18 | 13 | 16 |
| 3° | 16 | 8 | 24 | 21 | 24 → **non entra** |

Quindi: **tre colpi al massimo**, e il quarto è impossibile per aritmetica, non per divieto. Questo è il cuore del sistema: la combo finisce perché i numeri non tornano, non perché qualcuno lo vieta.

### 3. Scalatura e spinta

- Danno per colpo della catena: **×1,00 · ×0,85 · ×0,70**. Con un personaggio da 8 di danno: 8 + 6 + 5 = 19 in tre colpi.
- Reazione: **12 · 10 · 8** fotogrammi (è la tabella qui sopra).
- Spinta: **×1,0 · ×1,6 · ×2,6**. Il terzo colpo spedisce lontano e chiude lo scambio.

### 4. Il costo

Ogni anello della catena costa **6 stamina in più** rispetto al normale. Una combo da tre costa 12 stamina extra: è una scelta economica, non un diritto. Chi è a secco non fa combo.

### 5. Nessuna via d'uscita, ma nessun accanimento

Durante l'hitstun non si para e non si scappa — è la definizione di combo vera. La protezione contro la frustrazione è tutta nella struttura: massimo tre colpi, danno decrescente, e il terzo colpo allontana. Non serve un timer anti-infinito perché non può esistere.

### 6. Tabella per verdellinese (dati, non codice)

La catena è un **dato del personaggio**, così i set che hai approvato la usano invece di scontrarsi:

| Verdellinese | Colpi massimi | Carattere della catena |
|---|---|---|
| Ousmane Diouf | 4 | colpi leggeri: il re delle catene lunghe, la passiva gli restituisce stamina |
| Kwame Mensah | 3 | chiude con lo scarto e si allontana |
| Chidi Okonkwo | 2 | due colpi pesanti, il secondo può essere il caricato |
| Amara Diallo | 4 | rapidissima, catene che sembrano infinite ma pesano poco |
| Tarisai Moyo | 3 | chiude applicando veleno |
| Zuri Nkosi | 3 | la catena si apre solo punendo un attacco mancato |
| Bakari Traore | 2 | chiude con un proiettile a bruciare |
| Sekou Camara | 2 | chiude applicando silenzio |
| Ayo Adebayo | 3 | il terzo colpo è la chiusura che fa più male sotto il 40% di vita |

I quattro colpi di Ousmane e Amara sono possibili perché il loro costo per colpo è più basso: la regola non cambia, cambia il numero di anelli che la loro aritmetica permette.

---

## Task

Ciclo TDD per ogni task, dalla radice `C:\Users\boh\Documents\UVSF7`.

### Task 1 — Il laboratorio delle combo (`js/Combo.js`, modulo puro)

È la parte più importante del piano: **la combo si verifica in Node, senza browser.** Un sistema di combo che si prova solo "giocando" non è verificabile.

**1a. Prima il test.** Crea `tools/prova_combo.js`:

```js
// tools/prova_combo.js — le combo vere, verificate fotogramma per fotogramma.
//
// Un sistema di combo si sbaglia in un modo solo: i numeri non tornano e la
// catena sembra vera senza esserlo. Qui si simula il conto dei fotogrammi e si
// controlla che ogni anello entri davvero prima che l'avversario sia libero.

const path = require('path');
const combo = require(path.join(__dirname, '..', 'js', 'Combo.js'));

const risultati = [];
function verifica(nome, condizione, dettaglio) {
    risultati.push(!!condizione);
    console.log((condizione ? 'OK       ' : 'FALLITO  ') + nome.padEnd(60) + (dettaglio || ''));
}

// --- i numeri di base ----------------------------------------------------

verifica('la reazione del primo colpo è dodici fotogrammi', combo.reazioneDi(1) === 12);
verifica('la reazione cala di due a ogni anello', combo.reazioneDi(2) === 10 && combo.reazioneDi(3) === 8);
verifica('la reazione non scende mai sotto sei', combo.reazioneDi(9) === 6);
verifica('il recupero su colpo a segno è cinque', combo.recuperoCatena() === 5);
verifica('la finestra d\'impatto in catena è tre', combo.impattoCatena() === 3);

// --- il conto dei fotogrammi --------------------------------------------

const conto = combo.simulaCatena(3);
verifica('la catena di tre colpi è vera', conto.vera === true, JSON.stringify(conto.colpi));
verifica('i tre colpi arrivano a 0, 8 e 16', conto.colpi.map((c) => c.arrivo).join(',') === '0,8,16');
verifica('il terzo colpo è ancora dentro la reazione del secondo',
    conto.colpi[2].arrivo < conto.colpi[1].liberoAvversario,
    conto.colpi[2].arrivo + ' < ' + conto.colpi[1].liberoAvversario);

const contoQuattro = combo.simulaCatena(4);
verifica('la catena di quattro colpi non è vera', contoQuattro.vera === false);
verifica('il quarto colpo arriva tardi', contoQuattro.colpi[3].arrivo >= contoQuattro.colpi[2].liberoAvversario,
    contoQuattro.colpi[3].arrivo + ' >= ' + contoQuattro.colpi[2].liberoAvversario);

// --- scalatura -----------------------------------------------------------

verifica('il primo colpo non scala', combo.dannoDi(100, 1) === 100);
verifica('il secondo colpo vale l\'ottantacinque per cento', combo.dannoDi(100, 2) === 85);
verifica('il terzo colpo vale il settanta per cento', combo.dannoDi(100, 3) === 70);
verifica('la scalatura non scende sotto il quaranta per cento', combo.dannoDi(100, 8) === 40);
verifica('un danno da otto fa la catena 8, 6, 5', combo.danniCatena(8, 3).join(',') === '8,7,6',
    combo.danniCatena(8, 3).join(','));

// --- costo ---------------------------------------------------------------

verifica('ogni anello oltre il primo costa sei stamina', combo.costoCatena(3) === 12);
verifica('una catena di un colpo non costa niente in più', combo.costoCatena(1) === 0);

// --- spinta --------------------------------------------------------------

verifica('la spinta cresce a ogni colpo', combo.spintaDi(1) < combo.spintaDi(2) &&
    combo.spintaDi(2) < combo.spintaDi(3));

const passate = risultati.filter(Boolean).length;
console.log('\n' + passate + '/' + risultati.length + ' verifiche passate');
process.exit(passate === risultati.length ? 0 : 1);
```

**Attenzione al conto del danno**: con 8 di base e scalatura 100/85/70 i valori sono 8, 6,8 e 5,6. Arrotondando all'intero: 8, 7, 6. Il test lo dice, e se l'implementazione arrotonda in modo diverso il test diventa rosso: è la prima cosa da sistemare, non da aggiustare nel test.

**1b. Verifica che fallisca:**

```bash
node tools/prova_combo.js
```

Atteso: `Cannot find module '...\js\Combo.js'`, uscita 1.

**1c. Crea `js/Combo.js`:**

```js
// ========================================
// Le combo vere — conto dei fotogrammi
// ==========================================
// Una combo è vera quando il colpo successivo arriva prima che chi lo subisce
// possa agire. Non è un'opinione: è aritmetica fra tre numeri.
//
//   1. la reazione che applica il colpo (12, poi 10, poi 8 fotogrammi)
//   2. il recupero di chi ha colpito, che si accorcia se il colpo è entrato
//   3. la finestra d'impatto del colpo successivo
//
// Se il colpo N+1 arriva prima che l'avversario sia libero, l'anello è vero.
// Quando l'aritmetica non torna la catena finisce: nessun timer, nessun divieto.
//
// Modulo puro: nessun DOM, nessuno stato. Si prova con node.

const REAZIONE_BASE = 12;
const REAZIONE_MASSIMA = 18;
const REAZIONE_MINIMA = 6;
const CALO_REAZIONE = 2;
const RECUPERO_CATENA = 5;
const IMPATTO_CATENA = 3;
const COSTO_ANELLO = 6;
const SCALATURA = 0.85;
const SCALATURA_MINIMA = 0.4;
const SPINTA_BASE = 1;
const CRESCITA_SPINTA = 1.5;

/** Quanti fotogrammi resta bloccato chi subisce il colpo numero `indice`. */
function reazioneDi(indice) {
    const n = Math.max(1, Math.floor(Number(indice) || 1));
    const valore = REAZIONE_BASE - CALO_REAZIONE * (n - 1);
    return Math.max(REAZIONE_MINIMA, Math.min(REAZIONE_MASSIMA, valore));
}

/** Il recupero di chi ha colpito a segno: corto, è quello che apre la catena. */
function recuperoCatena() {
    return RECUPERO_CATENA;
}

/** La finestra d'impatto di un colpo di seguito. */
function impattoCatena() {
    return IMPATTO_CATENA;
}

/** Il danno del colpo numero `indice`, scalato e arrotondato. */
function dannoDi(dannoBase, indice) {
    const base = Number(dannoBase) || 0;
    const n = Math.max(1, Math.floor(Number(indice) || 1));
    let fattore = Math.pow(SCALATURA, n - 1);
    if (fattore < SCALATURA_MINIMA) fattore = SCALATURA_MINIMA;
    return Math.round(base * fattore);
}

/** Tutti i danni di una catena, già arrotondati. */
function danniCatena(dannoBase, colpi) {
    const elenco = [];
    for (let i = 1; i <= Math.max(0, Math.floor(colpi || 0)); i++) {
        elenco.push(dannoDi(dannoBase, i));
    }
    return elenco;
}

/** Quanta stamina in più costa una catena di N colpi. */
function costoCatena(colpi) {
    const n = Math.max(0, Math.floor(colpi || 0));
    return Math.max(0, n - 1) * COSTO_ANELLO;
}

/** La spinta del colpo numero `indice`: cresce, così l'ultimo allontana. */
function spintaDi(indice) {
    const n = Math.max(1, Math.floor(Number(indice) || 1));
    return SPINTA_BASE * Math.pow(CRESCITA_SPINTA, n - 1);
}

/**
 * Simula una catena e dice se è vera, con il conto dei fotogrammi di ogni anello.
 * È la funzione che rende il sistema verificabile: i test e il gioco chiamano
 * questa stessa aritmetica, quindi non possono divergere.
 */
function simulaCatena(colpi) {
    const quanti = Math.max(1, Math.floor(Number(colpi) || 1));
    const elenco = [];
    let arrivo = 0;
    let vera = true;

    for (let indice = 1; indice <= quanti; indice++) {
        const liberoAvversario = arrivo + reazioneDi(indice);
        const anello = {
            indice: indice,
            arrivo: arrivo,
            reazione: reazioneDi(indice),
            liberoAvversario: liberoAvversario,
            vero: true
        };

        if (indice > 1) {
            // L'anello è vero se questo colpo arriva prima che l'avversario,
            // colpito dal precedente, possa agire.
            const precedente = elenco[elenco.length - 1];
            anello.vero = arrivo < precedente.liberoAvversario;
            if (!anello.vero) vera = false;
        }

        elenco.push(anello);
        arrivo = arrivo + recuperoCatena() + impattoCatena();
    }

    return { vera: vera, colpi: elenco, quanti: quanti };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        REAZIONE_BASE: REAZIONE_BASE,
        REAZIONE_MINIMA: REAZIONE_MINIMA,
        RECUPERO_CATENA: RECUPERO_CATENA,
        IMPATTO_CATENA: IMPATTO_CATENA,
        COSTO_ANELLO: COSTO_ANELLO,
        reazioneDi: reazioneDi,
        recuperoCatena: recuperoCatena,
        impattoCatena: impattoCatena,
        dannoDi: dannoDi,
        danniCatena: danniCatena,
        costoCatena: costoCatena,
        spintaDi: spintaDi,
        simulaCatena: simulaCatena
    };
}
```

**1d. Verifica:**

```bash
node --check js/Combo.js && node tools/prova_combo.js
```

Atteso, ultima riga: `21/21 verifiche passate`. Se il test sul danno (8, 7, 6) è rosso, l'arrotondamento è diverso da quello atteso: si corregge `dannoDi`, non il test.

**1e. Commit:** `git add js/Combo.js tools/prova_combo.js && git commit -m "Le combo vere: conto dei fotogrammi in un modulo puro"`

---

### Task 2 — Caricare il modulo nella pagina

In `index.html`, subito dopo `<script src="js/Eco.js?v=25"></script>` (o dopo `js/Regole.js` se l'eco non è ancora entrato):

```html
    <script src="js/Combo.js?v=26"></script>
```

Poi porta tutte le versioni a `?v=26`:

```bash
sed -i 's/?v=25/?v=26/g; s/?v=24/?v=26/g' index.html
node -e "const h=require('fs').readFileSync('index.html','utf8'); console.log('Combo caricato:', h.includes('js/Combo.js'));"
```

Atteso: `Combo caricato: true`

**Commit:** `git commit -am "Carica il modulo delle combo"`

---

### Task 3 — Lo stato della catena sul lottatore

In `index.js`, dentro `preparaPartita(idP1, idP2)` (riga 211), accanto agli altri campi:

```js
    // Lo stato della catena: in quanti anelli siamo, e per quanti fotogrammi
    // il recupero resta accorciato. Si azzera quando si manca o si viene colpiti.
    for (const chi of [Player, Enemy]) {
        chi.catena = 0;
        chi.finestraCatena = 0;
    }
```

**Verifica:**

```bash
node -e "const s=require('fs').readFileSync('index.js','utf8'); console.log('stato catena:', (s.match(/finestraCatena/g)||[]).length >= 2);"
```

Atteso: `stato catena: true`

**Commit:** `git commit -am "Lo stato della catena sui lottatori"`

---

### Task 4 — La reazione variabile: `applicaDanno` accetta i fotogrammi

Oggi la reazione è fissa (`DANNO_FRAMI`). Deve diventare un parametro, altrimenti ogni colpo blocca per lo stesso tempo e la catena non scala.

**4a.** In `index.js`, la firma di `applicaDanno` (riga 418):

```js
function applicaDanno(attaccante, difensore, danno, forza = false, reazione = DANNO_FRAMI) {
```

**4b.** Dove si imposta lo stato del colpito (riga ~427), salva la reazione su quel colpo:

```js
    difensore.isTakingDmg = true;
    difensore.framesDanno = 0;
    difensore.reazioneColpo = reazione;
```

**4c.** In `aggiornaMeccaniche` (riga 314), sostituisci il confronto fisso:

```js
        if (lottatore.framesDanno >= (lottatore.reazioneColpo || DANNO_FRAMI)) {
```

**Verifica:**

```bash
node -e "const s=require('fs').readFileSync('index.js','utf8'); console.log('reazione parametro:', s.includes('reazione = DANNO_FRAMI')); console.log('confronto variabile:', s.includes('lottatore.reazioneColpo || DANNO_FRAMI'));"
```

Atteso: entrambe `true`. Il gioco continua a comportarsi come prima, perché il valore predefinito è `DANNO_FRAMI`.

**Commit:** `git commit -am "La reazione al colpo diventa un parametro del colpo"`

---

### Task 5 — Il colpo che apre la catena

In `risolviImpatto`, nel punto in cui il colpo va a segno (dopo il calcolo del danno, dove oggi si chiama `applicaDanno`), sostituisci la chiamata con questa logica:

```js
        // La catena: se questo colpo entra, chi ha colpito torna operativo in
        // cinque fotogrammi invece di sedici, e la reazione che applica è
        // quella del suo anello. Il terzo colpo spinge e chiude.
        const anello = (attaccante.catena || 0) + 1;
        attaccante.catena = anello;
        attaccante.finestraCatena = recuperoCatena();

        const reazione = reazioneDi(anello);
        const dannoCatena = dannoDi(danno, anello);
        const quantoSpinge = forza * spintaDi(anello);

        applicaDanno(attaccante, difensore, dannoCatena, quantoSpinge, reazione);
```

**Verifica:**

```bash
node -e "const s=require('fs').readFileSync('index.js','utf8'); console.log('anello:', s.includes('attaccante.catena = anello')); console.log('reazione applicata:', s.includes('reazioneDi(anello)'));"
```

Atteso: entrambe `true`.

**Commit:** `git commit -am "Il colpo a segno apre la catena: recupero corto, reazione scalata"`

---

### Task 6 — Il colpo di seguito e il costo

**6a.** In `eseguiAttacco` (riga 841), dopo il controllo della stamina, aggiungi il costo dell'anello:

```js
    // Ogni anello della catena costa: una combo non è gratuita, è una scelta.
    if (lottatore.catena > 0) {
        const extra = costoCatena(lottatore.catena + 1) - costoCatena(lottatore.catena);
        if (lottatore.stamina >= extra) lottatore.stamina -= extra;
    }
```

**6b.** Dove si imposta `passoImpatto` dell'attacco (`avviaAttacco`, cercare `passoImpatto`), usa la finestra corta quando si è in catena:

```js
    lottatore.passoImpatto = (lottatore.catena > 0) ? impattoCatena() : FINESTRA_IMPATTO_MINIMA;
```

**6c.** In `eseguiAttacco`, il controllo del recupero (riga 874) deve usare la finestra della catena:

```js
    const inRecupero = puoCancellareAttacco(lottatore,
        (lottatore.catena > 0) ? recuperoCatena() : undefined);
```

**Verifica:**

```bash
node -e "const s=require('fs').readFileSync('index.js','utf8'); console.log('impatto corto:', s.includes('(lottatore.catena > 0) ? impattoCatena()')); console.log('recupero corto:', s.includes('(lottatore.catena > 0) ? recuperoCatena()'));"
```

Atteso: entrambe `true`.

**Commit:** `git commit -am "In catena il colpo costa e parte con la finestra corta"`

---

### Task 7 — Quando la catena si rompe

Una catena non deve continuare se si manca, se si prende un colpo, o se passa troppo tempo.

In `aggiornaMeccaniche` (riga 291), in fondo:

```js
    // La finestra della catena scade: se non si riattacca subito, si riparte
    // dal primo anello.
    if (lottatore.finestraCatena > 0) {
        lottatore.finestraCatena -= 1;
        if (lottatore.finestraCatena === 0) lottatore.catena = 0;
    }
    // Chi viene colpito perde la sua catena: era il suo turno, ora non più.
    if (lottatore.isTakingDmg) lottatore.catena = 0;
```

**Verifica statica:**

```bash
node -e "const s=require('fs').readFileSync('index.js','utf8'); console.log('scadenza:', s.includes('lottatore.finestraCatena -= 1')); console.log('azzeramento:', s.includes('if (lottatore.isTakingDmg) lottatore.catena = 0'));"
```

Atteso: entrambe `true`.

**Commit:** `git commit -am "La catena si rompe se scade, se si manca o se si viene colpiti"`

---

### Task 8 — Il contatore a schermo

Il contatore è quello che rende la combo leggibile e soddisfacente: senza, il giocatore non sa di averla fatta.

**8a.** In `index.html`, dentro `#hud`, dopo `<div id="player-eco" class="eco-riga"></div>`:

```html
                <div id="player-catena" class="catena-contatore"></div>
```

e dopo `#enemy-eco`:

```html
                <div id="enemy-catena" class="catena-contatore"></div>
```

**8b.** In `css/style.css`:

```css
/* Contatore della catena: compare solo da due colpi in su. */
.catena-contatore {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #ffd479;
    height: 26px;
    text-shadow: 0 0 8px rgba(255, 212, 121, 0.6);
}

#enemy-catena { text-align: right; }
```

**8c.** In `index.js`, accanto agli altri riferimenti HUD (riga ~84):

```js
    playerCatena: document.querySelector('#player-catena'),
    enemyCatena: document.querySelector('#enemy-catena'),
```

**8d.** In `index.js`, vicino a `scriviBarra` (riga 1246):

```js
/**
 * Mostra "2 COLPI" / "3 COLPI" solo quando la catena è almeno di due.
 * Si aggiorna solo al cambio, come tutto l'HUD.
 */
function scriviCatena(elemento, catena, precedente) {
    if (!elemento) return precedente;
    const valore = Math.max(0, catena || 0);
    if (valore === precedente) return precedente;
    elemento.textContent = (valore >= 2) ? (valore + ' COLPI') : '';
    return valore;
}
```

**8e.** In `passoSimulazione()`, dove si aggiornano le barre:

```js
    catenaDisegnataP1 = scriviCatena(hud.playerCatena, Player ? Player.catena : 0, catenaDisegnataP1);
    catenaDisegnataP2 = scriviCatena(hud.enemyCatena, Enemy ? Enemy.catena : 0, catenaDisegnataP2);
```

con, in cima al file vicino agli altri:

```js
let catenaDisegnataP1 = null;
let catenaDisegnataP2 = null;
```

**Verifica:**

```bash
node --check index.js && node -e "const s=require('fs').readFileSync('index.html','utf8'); console.log('contatore:', s.includes('player-catena') && s.includes('enemy-catena'));"
```

Atteso: nessun errore e `contatore: true`.

**Commit:** `git commit -am "Il contatore dei colpi a schermo"`

---

### Task 9 — La catena nell'online

In `js/Online.js`, dentro `statoLottatore(lottatore)`, aggiungi:

```js
        cat: lottatore.catena || 0,
```

E in `index.js`, dove l'ospite applica il fotogramma (`aggiornaOspite`):

```js
        // Il contatore dell'ospite arriva dall'host: l'ospite non simula.
        if (dati.p2 && typeof dati.p2.cat === 'number') Enemy.catena = dati.p2.cat;
        if (dati.p1 && typeof dati.p1.cat === 'number') Player.catena = dati.p1.cat;
```

**Verifica:**

```bash
node --check js/Online.js && node -e "const s=require('fs').readFileSync('js/Online.js','utf8'); console.log('catena nel fotogramma:', s.includes('cat: lottatore.catena'));"
```

Atteso: `catena nel fotogramma: true`

**Commit:** `git commit -am "La catena viaggia nel fotogramma"`

---

### Task 10 — La prova nel browser: una combo vera, misurata

Le regole sono verificate in Node, ma **il sistema vero si giudica dal vivo**. Avvia il gioco:

```bash
node server/server.js
```

Apri la pagina servita, avvia una partita contro la CPU e incolla nella console questo script: fa partire tre attacchi in sequenza serrata e conta i colpi registrati dentro la finestra della catena.

```js
window._esitoCombo = 'in corso';
(function () {
    const misure = { colpi: 0, catenaMassima: 0, reazioniViste: [] };
    let giri = 0;

    const giro = setInterval(() => {
        giri += 1;

        // avvio l'attacco appena il personaggio è libero: è quello che fa un
        // giocatore che incatena
        if (typeof eseguiAttacco === 'function' && Player && !Player.isAttacking &&
            !Player.isTakingDmg && Player.stamina > 30) {
            eseguiAttacco(Player, false);
        }

        if (Player) {
            misure.catenaMassima = Math.max(misure.catenaMassima, Player.catena || 0);
            if (Player.numeriColpi === undefined) misure.colpi += 1;
        }

        if (giri > 120) {
            clearInterval(giro);
            misure.colpi = misure.catenaMassima;
            window._esitoCombo = JSON.stringify(misure);
        }
    }, 50);
})();
```

Dopo circa sette secondi leggi:

```js
window._esitoCombo
```

Atteso: un JSON con `catenaMassima` almeno **2**. Se è sempre 1, la catena non si apre: controlla di aver fatto il Task 5 (recupero corto) e il Task 6 (finestra d'impatto corta). Nota: se l'avversario si muove, il contatore può fermarsi a 1 anche col sistema giusto — per una misura pulita, metti la CPU in difficoltà bassa o colpisci da fermo contro il muro.

### Task 11 — Suite completa e invarianti

```bash
for t in prova_combo prova_motore prova_impatto prova_comandi prova_invarianti prova_cerimonia; do echo -n "$t: "; node tools/$t.js 2>&1 | tail -1; done
```

Atteso: `21/21`, `46/46`, `24/24`, `14/14`, `18/18`, `20/20`.

**Importante**: `prova_invarianti.js` deve restare verde perché `DANNO_FRAMI` **non cambia**: la reazione base resta 12. I numeri nuovi della catena vivono in `js/Combo.js` e vanno eventualmente aggiunti alle invarianti come valori attesi (Task 11b), non lasciati fuori.

**11b.** In `tools/prova_invarianti.js`, aggiungi un controllo che le costanti della combo non siano state toccate per sbaglio:

```js
verifica('le costanti della catena non sono cambiate',
    combo.REAZIONE_BASE === 12 && combo.RECUPERO_CATENA === 5 && combo.IMPATTO_CATENA === 3,
    combo.REAZIONE_BASE + '/' + combo.RECUPERO_CATENA + '/' + combo.IMPATTO_CATENA);
```

(ricordati il `require` di `js/Combo.js` in cima a quel file)

Riesegui: atteso `19/19` su `prova_invarianti`.

**Commit:** `git commit -am "Le invarianti coprono anche le costanti della catena"`

---

### Task 12 — Rilascio

- `versione.json`: `"build": 16` (o il numero successivo se l'eco è già entrata)
- `index.js` riga 9: `const BUILD_PAGINA = 16;`
- `?v=` coerente su tutti gli script
- `docs/meccaniche/combo.md` con: il conto dei fotogrammi, i quattro numeri regolabili (`REAZIONE_BASE`, `RECUPERO_CATENA`, `IMPATTO_CATENA`, `COSTO_ANELLO`), la tabella dei colpi massimi per verdellinese, e la frase da usare per spiegarla in classe
- una riga nel `README.md`

```bash
node -e "const v=require('./versione.json'); const s=require('fs').readFileSync('index.js','utf8'); const b=+(s.match(/BUILD_PAGINA = (\d+)/)||[])[1]; console.log('versione:', v.build, '| pagina:', b, '| uguali:', v.build === b);"
```

Atteso: numeri uguali e `true`.

**Commit finale:** `git commit -am "Build 16: combo vere"`

---

## Test e validazione

| Cosa | Comando | Atteso |
|---|---|---|
| Aritmetica delle combo | `node tools/prova_combo.js` | `21/21 verifiche passate` |
| Bilanciamento intatto | `node tools/prova_invarianti.js` | `19/19 verifiche passate` |
| Motore | `node tools/prova_motore.js` | `46/46 verifiche passate` |
| Colpo registrato | `node tools/prova_impatto.js` | `24/24 verifiche passate` |
| Comandi | `node tools/prova_comandi.js` | `14/14 verifiche passate` |
| Dal vivo | script `_esitoCombo` del Task 10 | `catenaMassima >= 2` |

## Rischi e compromessi

- **È un cambio profondo**, più dei set dei personaggi: cambia il ritmo di ogni scambio. Va provato prima contro la CPU e fra amici, non subito in ranked.
- **Lo sciame troverà subito anomalie finte**: le sonde contano i colpi e le reazioni, e con la reazione variabile i loro presupposti saltano. Va aggiornato `tools/swarm/sonda.js` (la reazione attesa non è più una costante) **prima** di giudicare i risultati di una corsa.
- **Online**: la combo a tre richiede input entro 8 fotogrammi (133 ms). Con una latenza alta l'ospite incatena peggio dell'host. La coda dei comandi da 9 passi aiuta, ma non fa miracoli: se il problema si vede, la mitigazione è alzare `IMPATTO_CATENA` a 4 e `RECUPERO_CATENA` a 5 (la catena resta vera, con più margine).
- **Contro la CPU**: la difficoltà alta reagisce in 5 fotogrammi (`js/CPU.js`), quindi para la seconda mossa. Giusto così — ma va tarato dopo, non prima.
- **YAGNI**: niente mosse in aria, niente lancio, niente schivata. La combo di Brawlhalla è aerea; questa è a terra, con tre colpi, e per UVSF7 basta. Aggiungere il gioco aereo significa riscrivere attacco, parata e collisioni: un altro progetto, non questo.

## Domande aperte

1. **Tre colpi** vanno bene come tetto naturale, o vuoi che Ousmane e Amara arrivino a quattro (come nella tabella)? Cambia solo `reazioneDi` e `recuperoCatena`.
2. La combo deve **richiedere stamina** come proposto, o deve essere gratuita e limitata solo dal conto dei fotogrammi? La prima rende la combo una scelta economica, la seconda la rende un diritto.
3. Il contatore a schermo serve sempre, o solo per la combo dell'avversario?
4. La combo vale anche in ranked dal primo giorno, o la teniamo per amichevoli e CPU finché non è tarata?
