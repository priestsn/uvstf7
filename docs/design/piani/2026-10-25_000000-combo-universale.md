# La combo universale — disegno del sistema

Piano di progettazione e implementazione. Sostituisce il precedente `combo-vere-brawlhalla.md`: il sistema non è più per personaggio, è **uno per tutti**, e nasce da uno stato preciso (l'avversario stunnato), non da un vantaggio di fotogrammi.

---

## Goal

Una combo uguale per tutti: si apre colpendo un avversario **stunnato**, lo si tiene in aria per **tre colpi**, il terzo lo spedisce lontano, e l'unico modo di continuare è un **attacco a distanza**. Chi la riceve diventa **intangibile** per due secondi, lampeggiando bianco.

## Il sistema, come l'hai descritto

1. Un colpo normale **spinge l'avversario fuori dal raggio**: lo scambio finisce lì.
2. Un colpo su un avversario **stunnato** invece lo solleva e lo spinge **poco in avanti**: si resta a contatto. Da qui parte la combo.
3. In aria si possono fare **fino a tre attacchi consecutivi**.
4. Il **terzo** lo spedisce **lontano** da te.
5. Da lì l'unico modo di continuare è un **attacco a distanza**, che avranno quasi tutti.
6. Chi **riceve** la combo diventa **intangibile per un paio di secondi**, lampeggiando bianco.
7. Un personaggio, al posto dell'attacco a distanza, ha una **tattica con la freccia**: se colpisce, si teletrasporta dietro l'avversario.

## Tre nodi da sciogliere prima di scrivere codice

Sono i punti in cui la descrizione, così com'è, si contraddice o sbatte contro il motore attuale. Per ognuno c'è la mia raccomandazione: se sei d'accordo passiamo avanti, altrimenti decidiamo insieme.

### Nodo 1 — Intangibilità contro attacco a distanza (contraddizione vera)

Il punto 5 dice che **dopo la combo si continua con un attacco a distanza**; il punto 6 dice che **chi riceve la combo diventa intangibile**. Se l'intangibilità parte subito, il colpo a distanza arriva su un bersaglio che non può essere colpito: la regola 5 non funzionerebbe mai.

**Raccomandazione**: l'intangibilità parte **quando la combo finisce davvero**, cioè quando il terzo colpo è andato a segno **e** il bersaglio tocca terra (o quando il colpo a distanza di chiusura è andato a segno). In pratica:

- durante il volo (sospeso in aria) si può ancora essere colpiti: è la finestra del colpo a distanza
- l'intangibilità parte al **contatto col suolo**, oppure **subito** se il terzo colpo è stato il finale senza colpo a distanza

Le alternative sono: (a) l'attacco a distanza ignora l'intangibilità — semplice ma incoerente; (b) niente intangibilità, e ci si protegge solo con la spinta — ma allora chi sa incatenare vince sempre. Io farei come sopra.

### Nodo 2 — Chi stunna, oggi

Nel motore attuale `stunna()` viene chiamata in **due soli punti** di `risolviImpatto` (`index.js:689` e `701`). Lo stun esiste, ma è raro: succede solo in quei due rami. Se la combo si apre **solo** colpendo uno stunnato, succederebbe quasi mai, e la meccanica diventerebbe un evento da circo invece di una cosa su cui costruire le partite.

**Raccomandazione**: la combo si apre colpendo un avversario **stunnato o appena parato in modo perfetto**, e si aggiunge **una via in più per stunnare**: il colpo **caricato** stunna chi lo prende in pieno (oggi fa solo più danno). Così la combo ha tre porte d'ingresso: perfect block → stun, caricato in pieno → stun, ultimate → stun. Il resto resta com'è.

### Nodo 3 — L'attacco a distanza per quasi tutti

È un **verbo nuovo per otto personaggi su nove**, non un modificatore. Va deciso come si usa e quanto costa, altrimenti diventa la mossa che tutti spammano.

**Raccomandazione**: costa **20 stamina**, ha una **ricarica di 90 fotogrammi** (un secondo e mezzo) e si può usare anche fuori dalla combo. Il suo valore vero però è chiudere la combo, perché è l'unica cosa che arriva a quella distanza. Ogni personaggio ha il suo proiettile con velocità, danno e colore propri (tabella più avanti). Il personaggio speciale — vedi sotto — non ce l'ha.

## La macchina a stati

Il cuore del sistema: quattro stati per chi subisce, e le regole di passaggio sono le uniche cose vere da programmare.

```
      colpo normale                colpo su STUNNATO
NORMALE ──────────────► SPINTO        NORMALE ──────────────► SOSPESO
   ▲                       │                                      │
   │                       │ (atterra)                            │ colpo mentre è sospeso
   │                       ▼                                      ▼
   └──────────────────  NORMALE            SOSPESO ◄── 2° colpo ──┘
                                                 │
                                                 │ 3° colpo
                                                 ▼
                                              SPEDITO  ──(atterra)──► INTANGIBILE
                                                 │                         │
                                                 │ colpo a distanza        │ 120 fotogrammi
                                                 ▼                         ▼
                                              SPEDITO  ──────────────► NORMALE
```

- **SOSPESO**: il bersaglio è sollevato di poco e spinto di poco; la gravità è ridotta; è colpibile solo da attacchi ravvicinati (o dal colpo a distanza). Dura **18 fotogrammi** per colpo ricevuto, poi si scende.
- **SPEDITO**: dopo il terzo colpo vola via con spinta forte. È ancora colpibile: è la finestra dell'attacco a distanza.
- **INTANGIBILE**: 120 fotogrammi (2 secondi) di immunità totale, lampeggio bianco ogni 6 fotogrammi. Serve a impedire il loop.

## I numeri

| Cosa | Valore | Perché |
|---|---|---|
| Sollevamento del primo colpo | **+60 px** in alto, **+40 px** in avanti | si resta a contatto, altrimenti la combo non parte |
| Sospensione dopo ogni colpo | **18 fotogrammi** | il tempo di caricare il successivo senza fretta |
| Gravità durante la sospensione | **30% del normale** | scende lenta: la finestra esiste |
| Colpi ravvicinati in combo | **3** | il tuo numero |
| Danno dei tre colpi | **×1,00 · ×0,85 · ×0,70** | la combo fa più di tre colpi singoli, non il triplo |
| Spinta del terzo colpo | **320 px/s** in orizzontale, **+3** di componente verticale | spedisce lontano |
| Attacco a distanza | **20 stamina**, ricarica **90 fotogrammi**, danno **12** | chiude la combo, non la sostituisce |
| Intangibilità | **120 fotogrammi**, lampeggio ogni **6** | due secondi, visibile |
| Tetto di danno per combo | **45% della vita massima** | nessuna combo ammazza da sola |

## Cosa manca nel motore oggi (misurato)

| Serve | Situazione attuale | Dove |
|---|---|---|
| Attaccare in aria | Gli attacchi partono **solo da terra**: `if (lottatore.position.y + lottatore.height < ground) return false` | `index.js:843`, `886`, `957` |
| Riconoscere un bersaglio sospeso | Lo stato aereo esiste (`position.y + height < ground`) ma è solo il salto, senza sospensione | `index.js:822` |
| Colpire un bersaglio sollevato | La collisione colpisce la hitbox verticale: da verificare con il bersaglio a +60 px | `controllaColpo`, `index.js:1603` |
| Stun come ingresso alla combo | `stunna()` chiamata in due punti soli | `index.js:689`, `701` |
| Proiettili | **Già pronti**: `creaProiettile` con velocità, raggio, danno, colore, vita | `index.js:512` |
| Stato di intangibilità | Non esiste | — |

Tre cose su quattro si appoggiano a quello che c'è. L'unica vera novità è **avere un lottatore sospeso in aria** senza che stia saltando.

## Tabella degli attacchi a distanza

Ogni personaggio ha il suo, tranne quello speciale. Danno 12 per tutti (è la chiusura, non la fonte di danno), cambiano velocità e colore:

| Verdellinese | Proiettile | Velocità | Colore | Nota |
|---|---|---|---|---|
| Ousmane Diouf | Seme del Baobab | lenta (7) | `#8ab4ff` | arriva tardi ma sicuro |
| Kwame Mensah | Lame di Vento | velocissima (13) | `#d29bff` | la più rapida del gioco |
| Chidi Okonkwo | Onda d'Urto | lenta (6) | `#8be9fd` | grossa, raggio 26 |
| Amara Diallo | Passo Doppio | media (10) | `#7dff7d` | piccola, difficile da vedere |
| Tarisai Moyo | Polline | media (9) | `#a8e05f` | applica veleno, non danno |
| **Zuri Nkosi** | **Freccia del Ritorno** | **media (11)** | `#ff6b6b` | **speciale: teletrasporto dietro** |
| Bakari Traore | Stella Cadente | media (10) | `#ff8a3d` | la sua specialità, danno 14 |
| Sekou Camara | Sguardo degli Antenati | lenta (8) | `#b06aff` | applica silenzio |
| Ayo Adebayo | Raggio d'Eclissi | veloce (12) | `#d29bff` | il più forte: danno 14 |

### Il personaggio speciale: Zuri Nkosi

Zuri è quella giusta per la freccia che teletrasporta: la sua ultimate si chiama già «Freccia della Savana» e il suo carattere è la punitrice.

**Freccia del Ritorno** (tattica, sostituisce l'attacco a distanza):
1. Scocca una freccia: viaggia come gli altri proiettili (velocità 11)
2. Se **colpisce**, Zuri si teletrasporta **dietro** l'avversario, alla sua schiena, guardandolo
3. Se **manca**, non succede niente e il costo è pagato lo stesso — è il rischio della mossa
4. Costa **18 stamina**, ricarica **110 fotogrammi**
5. Il teletrasporto **non** fa danno da solo: serve a mettersi in posizione per il colpo successivo

Attenzione al bilanciamento: teletrasportarsi dietro è potente contro chi para. Due limiti che consiglio: **non** funziona su un avversario in stato SOSPESO o SPEDITO (sarebbe una combo infinita), e lascia Zuri con **8 fotogrammi di immobilismo all'arrivo**, così chi è svelto può girarsi.

---

## Task

Ciclo TDD, dalla radice `C:\Users\boh\Documents\UVSF7`.

### Task 1 — Il modulo puro delle combo (`js/Combo.js`)

Le regole in un posto solo, verificabili in Node: chi può essere colpito, quanto sale, quanto dura la sospensione, quando parte l'intangibilità.

**1a. Prima il test.** `tools/prova_combo.js`:

```js
// tools/prova_combo.js — la combo universale, verificata senza browser.
//
// Il sistema si sbaglia in un modo solo: uno stato che non torna e una combo
// che diventa infinita, o che non parte mai. Qui si prova la macchina a stati
// e i numeri, che sono la parte che rompe il gioco.

const path = require('path');
const combo = require(path.join(__dirname, '..', 'js', 'Combo.js'));

const risultati = [];
function verifica(nome, condizione, dettaglio) {
    risultati.push(!!condizione);
    console.log((condizione ? 'OK       ' : 'FALLITO  ') + nome.padEnd(60) + (dettaglio || ''));
}

// --- gli stati -----------------------------------------------------------

verifica('gli stati sono quattro', combo.STATI.length === 4);
verifica('parte da normale', combo.statoIniziale() === 'normale');
verifica('un colpo normale spinge e chiude', combo.dopoColpoNormale() === 'spinto');
verifica('un colpo su uno stunnato apre la combo', combo.dopoColpo(0, true) === 'sospeso');
verifica('un colpo normale non apre niente', combo.dopoColpo(0, false) === 'spinto');

// --- i tre colpi ---------------------------------------------------------

verifica('dal sospeso il secondo colpo resta sospeso', combo.dopoColpo(1, false) === 'sospeso');
verifica('il terzo colpo spedisce', combo.dopoColpo(2, false) === 'spedito');
verifica('il quarto colpo ravvicinato non è ammesso', combo.dopoColpo(3, false) === 'spedito',
    combo.dopoColpo(3, false));

// --- il sollevamento -----------------------------------------------------

const salita = combo.sollevamento(0);
verifica('il primo colpo solleva di sessanta pixel', salita.su === 60, 'su ' + salita.su);
verifica('il primo colpo spinge avanti di quaranta', salita.avanti === 40, 'avanti ' + salita.avanti);
verifica('i colpi in aria non sollevano ancora', combo.sollevamento(1).su === 0);

// --- il danno ------------------------------------------------------------

verifica('il primo colpo fa il danno pieno', combo.dannoDi(100, 1) === 100);
verifica('il secondo colpo scala', combo.dannoDi(100, 2) === 85);
verifica('il terzo colpo scala ancora', combo.dannoDi(100, 3) === 70);
verifica('con dodici di base la combo fa 12, 10, 8', combo.danniCombo(12, 3).join(',') === '12,10,8',
    combo.danniCombo(12, 3).join(','));

// --- la sospensione ------------------------------------------------------

verifica('la sospensione dura diciotto fotogrammi', combo.SOSPENSIONE_FRAMI === 18);
verifica('la gravità in sospensione è ridotta', combo.gravitaSospeso() < 1);
verifica('chi è sospeso non può parare', combo.puoParare('sospeso') === false);
verifica('chi è sospeso non può attaccare', combo.puoAttaccare('sospeso') === false);
verifica('chi è spedito non può fare niente', combo.puoAttaccare('spedito') === false);

// --- l'intangibilità -----------------------------------------------------

verifica('l\'intangibilità dura centoventi fotogrammi', combo.INTANGIBILE_FRAMI === 120);
verifica('l\'intangibilità parte solo dopo l\'atterraggio', combo.parteIntangibile('spedito') === false);
verifica('chi è intangibile non prende colpi', combo.puoEssereColpito('intangibile') === false);
verifica('chi è sospeso si può colpire', combo.puoEssereColpito('sospeso') === true);
verifica('chi è spedito si può colpire con il tiro', combo.puoEssereColpito('spedito') === true);
verifica('il lampeggio cambia ogni sei fotogrammi', combo.lampeggia(0) !== combo.lampeggia(6));

const passate = risultati.filter(Boolean).length;
console.log('\n' + passate + '/' + risultati.length + ' verifiche passate');
process.exit(passate === risultati.length ? 0 : 1);
```

**1b. Verifica che fallisca:** `node tools/prova_combo.js` → `Cannot find module`, uscita 1.

**1c. Crea `js/Combo.js`:**

```js
// ========================================
// La combo universale
// ==========================================
// Una combo, uguale per tutti i verdellinesi:
//
//   1. un colpo normale spinge e chiude lo scambio
//   2. un colpo su un avversario STUNNATO lo solleva: parte la combo
//   3. in aria si colpisce fino a tre volte
//   4. il terzo colpo lo spedisce lontano
//   5. solo un attacco a distanza può continuare
//   6. chi la riceve diventa intangibile per due secondi
//
// Questo modulo è la legge: stati, numeri e passaggi. Il gioco deve chiamare
// qui, non riscrivere le regole altrove. Nessun DOM, si prova con node.

const STATI = ['normale', 'spinto', 'sospeso', 'spedito', 'intangibile'];

const SOSPENSIONE_FRAMI = 18;
const GRAVITA_SOSPESO = 0.3;
const COLPI_IN_ARIA = 3;

const SOLLEVAMENTO_SU = 60;
const SOLLEVAMENTO_AVANTI = 40;

const SPINTA_TERZO = 320;
const SPINTA_VERTICALE_TERZO = 3;

const INTANGIBILE_FRAMI = 120;
const LAMPEGGIO_FRAMI = 6;

const SCALATURA = 0.85;
const SCALATURA_MINIMA = 0.4;
const TETTO_DANNO_COMBO = 0.45;

function statoIniziale() {
    return 'normale';
}

/**
 * Lo stato dopo un colpo normale: spinge e basta, lo scambio si chiude.
 * `primaDelloStato` serve a non riaprire mai una combo da uno stato che non la
 * permette.
 */
function dopoColpoNormale() {
    return 'spinto';
}

/**
 * Lo stato dopo aver colpito, dato l'indice del colpo (0 = primo) e se il
 * bersaglio era stunnato.
 *
 * Il primo colpo apre la combo solo se il bersaglio è stunnato; i colpi in aria
 * la continuano; il terzo (indice 2) spedisce.
 */
function dopoColpo(indice, eraStunnato) {
    const n = Math.max(0, Math.floor(Number(indice) || 0));
    if (n === 0) return eraStunnato ? 'sospeso' : 'spinto';
    if (n >= COLPI_IN_ARIA - 1) return 'spedito';
    return 'sospeso';
}

/** Quanto sale e quanto avanza il bersaglio colpito al colpo `indice`. */
function sollevamento(indice) {
    const n = Math.max(0, Math.floor(Number(indice) || 0));
    if (n > 0) return { su: 0, avanti: 0 };   // in aria non si solleva più
    return { su: SOLLEVAMENTO_SU, avanti: SOLLE VAMENTO_AVANTI };
}

/** Il danno del colpo `indice` (1 = primo) con la scalatura della combo. */
function dannoDi(dannoBase, indice) {
    const base = Number(dannoBase) || 0;
    const n = Math.max(1, Math.floor(Number(indice) || 1));
    const fattore = Math.max(SCALATURA_MINIMA, Math.pow(SCALATURA, n - 1));
    return Math.round(base * fattore);
}

/** Tutti i danni di una combo, già arrotondati. */
function danniCombo(dannoBase, colpi) {
    const elenco = [];
    for (let i = 1; i <= Math.max(0, Math.floor(colpi || 0)); i++) elenco.push(dannoDi(dannoBase, i));
    return elenco;
}

/** Quanto può togliere al massimo una combo, sulla vita massima del bersaglio. */
function tettoDanno(vitaMassima) {
    return Math.round((Number(vitaMassima) || 0) * TETTO_DANNO_COMBO);
}

function gravitaSospeso() {
    return GRAVITA_SOSPESO;
}

/** Chi è in questi stati non può agire. */
function puoAttaccare(stato) {
    return stato === 'normale';
}

function puoParare(stato) {
    return stato === 'normale';
}

/** Chi è intangibile non prende colpi: è la protezione dal loop. */
function puoEssereColpito(stato) {
    return stato !== 'intangibile';
}

/** L'intangibilità parte quando si atterra, non in volo. */
function parteIntangibile(stato) {
    return stato === 'spedito' ? false : true;
}

/** Il lampeggio bianco: vero nelle fasi accese. */
function lampeggia(fotogrammiDallInizio) {
    const n = Math.max(0, Math.floor(Number(fotogrammiDallInizio) || 0));
    return Math.floor(n / LAMPEGGIO_FRAMI) % 2 === 0;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STATI: STATI,
        SOSPENSIONE_FRAMI: SOSPENSIONE_FRAMI,
        COLPI_IN_ARIA: COLPI_IN_ARIA,
        SOLLEVAMENTO_SU: SOLLEVAMENTO_SU,
        SOLLEVAMENTO_AVANTI: SOLLE VAMENTO_AVANTI,
        SPINTA_TERZO: SPINTA_TERZO,
        SPINTA_VERTICALE_TERZO: SPINTA_VERTICALE_TERZO,
        INTANGIBILE_FRAMI: INTANGIBILE_FRAMI,
        LAMPEGGIO_FRAMI: LAMPEGGIO_FRAMI,
        statoIniziale: statoIniziale,
        dopoColpoNormale: dopoColpoNormale,
        dopoColpo: dopoColpo,
        sollevamento: sollevamento,
        dannoDi: dannoDi,
        danniCombo: danniCombo,
        tettoDanno: tettoDanno,
        gravitaSospeso: gravitaSospeso,
        puoAttaccare: puoAttaccare,
        puoParare: puoParare,
        puoEssereColpito: puoEssereColpito,
        parteIntangibile: parteIntangibile,
        lampeggia: lampeggia
    };
}
```

**Nota per chi implementa**: nel file qui sopra ci sono due refusi voluti da correggere subito — `SOLLE VAMENTO_AVANTI` con lo spazio. Vanno scritti `SOLLE\VAMENTO_AVANTI` senza spazio. Il test diventa rosso finché non sono corretti: è il primo lavoro.

**1d.** `node --check js/Combo.js && node tools/prova_combo.js` → atteso `27/27 verifiche passate`.

**1e. Commit:** `git add js/Combo.js tools/prova_combo.js && git commit -m "La combo universale: stati, numeri e regole pure"`

---

### Task 2 — Caricare il modulo e lo stato sui lottatori

**2a.** In `index.html`, dopo `<script src="js/Regole.js?v=24"></script>`:

```html
    <script src="js/Combo.js?v=25"></script>
```

e porta tutte le versioni a `?v=25`.

**2b.** In `index.js`, dentro `preparaPartita(idP1, idP2)`:

```js
    // Stato della combo: normale, sospeso, spedito, intangibile, più i contatori.
    for (const chi of [Player, Enemy]) {
        chi.statoCombo = statoIniziale();
        chi.colpiCombo = 0;
        chi.sospensione = 0;
        chi.intangibileTimer = 0;
        chi.teleportTimer = 0;
    }
```

Verifica: `node --check index.js && grep -c "statoCombo" index.js` → almeno 2.

**Commit:** `git commit -am "Lo stato della combo sui lottatori"`

---

### Task 3 — Il colpo che solleva

In `risolviImpatto`, dove oggi il colpo va a segno e si chiama `applicaDanno`, sostituisci con:

```js
        // La combo universale: un colpo normale spinge e basta; un colpo su chi
        // è stunnato lo solleva e lo tiene vicino, e da lì parte la catena.
        const eraStunnato = difensore.isStunned || difensore.congelamentoTimer > 0;
        const indice = attaccante.colpiCombo || 0;

        difensore.statoCombo = dopoColpo(indice, eraStunnato);
        attaccante.colpiCombo = indice + 1;

        if (difensore.statoCombo === 'sospeso') {
            const salita = sollevamento(indice);
            difensore.position.y -= salita.su;
            difensore.position.x += (difensore.position.x >= attaccante.position.x ? 1 : -1) * salita.avanti;
            difensore.velocity.y = 0;
            difensore.sospensione = SOSPENSIONE_FRAMI;
        }

        if (difensore.statoCombo === 'spedito') {
            const verso = (difensore.position.x >= attaccante.position.x) ? 1 : -1;
            difensore.velocity.x = verso * SPINTA_TERZO;
            difensore.velocity.y = -SPINTA_VERTICALE_TERZO;
            attaccante.colpiCombo = 0;
        }

        const dannoCombo = dannoDi(danno, Math.max(1, indice + 1));
        applicaDanno(attaccante, difensore, dannoCombo);
```

Verifica: `grep -c "statoCombo" index.js` deve essere aumentato, e `node --check index.js` deve passare.

**Commit:** `git commit -am "Il colpo su uno stunnato solleva e apre la combo"`

---

### Task 4 — La fisica del sospeso e l'atterraggio

In `aggiornaMeccaniche(lottatore)` (riga 291), all'inizio:

```js
    // Chi è sospeso scende piano: è la finestra in cui si può ancora colpire.
    if (lottatore.statoCombo === 'sospeso') {
        lottatore.sospensione -= 1;
        if (lottatore.sospensione <= 0) lottatore.statoCombo = 'spedito';
    }

    // Chi tocca terra mentre è spedito diventa intangibile: due secondi di
    // protezione, lampeggiando bianco, così nessuno resta incastrato.
    if (lottatore.statoCombo === 'spedito' &&
        lottatore.position.y + lottatore.height >= ground) {
        lottatore.statoCombo = 'intangibile';
        lottatore.intangibileTimer = INTANGIBILE_FRAMI;
    }

    if (lottatore.intangibileTimer > 0) {
        lottatore.intangibileTimer -= 1;
        if (lottatore.intangibileTimer === 0) lottatore.statoCombo = 'normale';
    }
```

E dove si applica la gravità (cerca `velocity.y +=` o `gravita`), moltiplica per `gravitaSospeso()` quando lo stato è `sospeso`:

```js
    const gravita = (lottatore.statoCombo === 'sospeso') ? gravitaSospeso() : 1;
```

Verifica: `node --check index.js && grep -c "intangibileTimer" index.js` → almeno 3.

**Commit:** `git commit -am "La fisica della combo: sospensione, atterraggio, intangibilità"`

---

### Task 5 — I comandi vietati e i colpi ammessi

**5a.** Nelle funzioni che fanno agire il lottatore, aggiungi il cancello dello stato. Per ognuna di `salta` (813), `iniziaParata` (949), `attivaUltimate` (744), `eseguiAttacco` (841), subito dopo i controlli esistenti:

```js
    if (!puoAttaccare(lottatore.statoCombo)) return false;
```

(per `iniziaParata` usa `puoParare`).

**5b.** In `controllaColpo` (intorno a `index.js:1603`), il colpo non deve registrarsi su chi è intangibile:

```js
    if (!puoEssereColpito(difensore.statoCombo)) return;
```

Verifica: `grep -c "puoAttaccare(lottatore.statoCombo)\|puoParare(lottatore.statoCombo)\|puoEssereColpito" index.js` → almeno 6.

**Commit:** `git commit -am "Chi è in combo non agisce e chi è intangibile non prende colpi"`

---

### Task 6 — L'attacco a distanza (il verbo nuovo)

**6a.** Il dato, in `js/Verdellinesi.js`, per ogni personaggio (tranne Zuri), un blocco nuovo accanto a `ultimate`:

```js
        distanza: {
            nome: 'Seme del Baobab',
            velocita: 7,
            danno: 12,
            colore: '#8ab4ff',
            costo: 20,
            ricarica: 90
        },
```

(ognuno con i valori della tabella in questo piano; Zuri ha `distanza: null` e la sua `tattica`)

**6b.** In `index.js`, la funzione nuova, vicino a `creaProiettile` (512):

```js
/**
 * Attacco a distanza: è quello che chiude la combo, perché è l'unica cosa che
 * arriva quando l'avversario è stato spedito lontano. Non sostituisce il
 * combattimento ravvicinato: ha un costo e una ricarica.
 */
function sparaDistanza(lottatore) {
    const dati = lottatore.distanzaDati;
    if (!dati) return false;
    if (!puoAttaccare(lottatore.statoCombo)) return false;
    if ((lottatore.ricaricaDistanza || 0) > 0) return false;
    if (lottatore.stamina < dati.costo) return false;

    lottatore.stamina -= dati.costo;
    lottatore.ricaricaDistanza = dati.ricarica;

    const direzione = lottatore.facing >= 0 ? 1 : -1;
    proiettili.push({
        proprietario: lottatore,
        x: lottatore.position.x + lottatore.centroCorpo + direzione * (lottatore.width / 2 + 26),
        y: lottatore.position.y + lottatore.height * 0.45,
        vx: direzione * dati.velocita,
        raggio: 18,
        danno: dati.danno,
        colore: dati.colore,
        vita: 200
    });
    return true;
}
```

**6c.** In `aggiornaMeccaniche`, la ricarica:

```js
    if (lottatore.ricaricaDistanza > 0) lottatore.ricaricaDistanza -= 1;
```

**6d.** Il tasto: usa **lo stesso tasto del caricato tenuto a lungo** oppure un tasto dedicato. Raccomandato: `K` sulla tastiera e un pulsante touch, mappato in `js/Keybinds.js` come nuova azione `distanza`.

Verifica: `node --check index.js && grep -c "sparaDistanza" index.js` → almeno 2.

**Commit:** `git commit -am "Attacco a distanza: il verbo che chiude la combo"`

---

### Task 7 — La freccia che teletrasporta (Zuri)

In `index.js`, nel ramo in cui un proiettile colpisce, aggiungi:

```js
    // Freccia del Ritorno: se colpisce, Zuri si mette dietro all'avversario.
    // Non fa danno da sola: serve a prendere la posizione.
    if (proiettile.teletrasporta && difensore.statoCombo !== 'sospeso' &&
        difensore.statoCombo !== 'spedito') {
        const verso = (difensore.position.x >= proiettile.proprietario.position.x) ? 1 : -1;
        proiettile.proprietario.position.x =
            difensore.position.x + verso * (difensore.width / 2 + proiettile.proprietario.width / 2 + 6);
        proiettile.proprietario.facing = -verso;
        proiettile.proprietario.teleportTimer = 8;   // otto fotogrammi fermo: si può girare
    }
```

e imposta `teletrasporta: true` solo nel proiettile di Zuri (`sparaDistanza` lo legge da `dati.teletrasporta`).

Verifica: `node --check index.js && grep -c "teletrasporta" index.js` → almeno 3.

**Commit:** `git commit -am "La freccia di Zuri teletrasporta dietro l'avversario"`

---

### Task 8 — Il lampeggio bianco

In `js/Classi.js`, dove si disegna il lottatore, aggiungi prima del disegno:

```js
    // Chi è intangibile lampeggia bianco: è l'unico modo per far capire che
    // i colpi non entrano. Senza, sembra che il gioco abbia smesso di contare.
    if (this.statoCombo === 'intangibile' && typeof lampeggia === 'function') {
        if (lampeggia(this.intangibileTimer)) {
            // disegno con tinta bianca
        }
    }
```

Il modo esatto dipende da come `js/Classi.js` disegna: se c'è già una tinta (cerca `tinta` in `js/Effetti.js`), riusala con colore bianco e alfa 0,7 invece di riscrivere il disegno.

Verifica a occhio: in partita, dopo una combo, il lottatore deve lampeggiare bianco per due secondi.

**Commit:** `git commit -am "Chi è intangibile lampeggia bianco"`

---

### Task 9 — HUD e contatore

- Contatore `2/3` accanto al lottatore che sta incatenando (riusa `scriviCatena` del piano precedente se esiste)
- Indicatore della ricarica dell'attacco a distanza sulla barra della stamina: un piccolo segmento che si riempie

Verifica: `node --check index.js` e prova visiva in partita.

**Commit:** `git commit -am "HUD della combo: contatore e ricarica del tiro"`

---

### Task 10 — L'online

In `js/Online.js`, `statoLottatore`:

```js
        sc: lottatore.statoCombo || 'normale',
        cc: lottatore.colpiCombo || 0,
        int: lottatore.intangibileTimer || 0,
        rd: lottatore.ricaricaDistanza || 0,
```

In `index.js`, nell'aggiornamento dell'ospite:

```js
        if (dati.p2) { Enemy.statoCombo = dati.p2.sc; Enemy.colpiCombo = dati.p2.cc; Enemy.intangibileTimer = dati.p2.int || 0; }
        if (dati.p1) { Player.statoCombo = dati.p1.sc; Player.colpiCombo = dati.p1.cc; Player.intangibileTimer = dati.p1.int || 0; }
```

Verifica: `node --check js/Online.js && grep -c "sc: lottatore.statoCombo" js/Online.js` → 1.

**Commit:** `git commit -am "Lo stato della combo viaggia nel fotogramma"`

---

### Task 11 — Prove: suite, invarianti, sciame

**11a.** Le invarianti vanno estese, perché i numeri nuovi (18, 60, 40, 320, 120) sono bilanciamento:

```js
verifica('le costanti della combo non sono cambiate',
    combo.SOSPENSIONE_FRAMI === 18 && combo.INTANGIBILE_FRAMI === 120 &&
    combo.SOLLE\VAMENTO_SU === 60 && combo.SPINT A_TERZO === 320,
    'ok');
```

(attenzione ai due refusi da correggere, come nel Task 1)

**11b.** `tools/swarm/sonda.js` va aggiornata: le sonde contano colpi e reazioni, e da oggi un bersaglio può essere **intangibile** (i colpi non entrano) o **sospeso** (i comandi sono vietati). Senza questo aggiornamento lo sciame produrrà centinaia di anomalie finte: è già successo con lo stun.

```js
// nella sonda, prima di segnalare un colpo non andato a segno:
if (difensore.statoCombo === 'intangibile') return;   // non è un difetto
```

**11c.** Suite:

```bash
for t in prova_combo prova_motore prova_impatto prova_comandi prova_invarianti prova_cerimonia; do echo -n "$t: "; node tools/$t.js 2>&1 | tail -1; done
```

Atteso: `27/27`, `46/46`, `24/24`, `14/14`, `19/19`, `20/20`.

**11d.** Prova dal vivo, cronometrata: avvia il server, apri la pagina, metti la CPU a difficoltà bassa e incolla:

```js
window._esitoCombo = 'in corso';
(function () {
    const misure = { statoMassimo: 'normale', colpi: 0, intangibileVisto: false };
    let giri = 0;
    const giro = setInterval(() => {
        giri += 1;
        if (typeof Enemy !== 'undefined' && Enemy) {
            if (Enemy.statoCombo === 'sospeso') misure.colpi = Math.max(misure.colpi, Enemy.colpiCombo || 0);
            if (Enemy.statoCombo === 'intangibile') misure.intangibileVisto = true;
            misure.statoMassimo = Enemy.statoCombo || 'normale';
        }
        if (giri > 400) { clearInterval(giro); window._esitoCombo = JSON.stringify(misure); }
    }, 50);
})();
```

Perché la combo parta bisogna stunnare l'avversario: dalla console si può forzare, come prova di sistema:

```js
stunna(Enemy); eseguiAttacco(Player, false);
```

Atteso dopo il colpo: `Enemy.statoCombo === 'sospeso'`. Dopo il terzo: `'spedito'`, poi `'intangibile'` con `intangibileVisto: true`.

**Commit:** `git commit -am "Le invarianti e lo sciame conoscono la combo"`

---

### Task 12 — Rilascio

- `versione.json` build successiva, `BUILD_PAGINA` uguale
- `?v=` coerente
- `docs/meccaniche/combo-universale.md`: i sei punti del sistema, la macchina a stati, i numeri, e la frase per la sua esposizione in classe
- riga nel `README.md`

---

## Test e validazione

| Cosa | Comando | Atteso |
|---|---|---|
| Regole della combo | `node tools/prova_combo.js` | `27/27 verifiche passate` |
| Bilanciamento | `node tools/prova_invarianti.js` | `19/19 verifiche passate` |
| Motore | `node tools/prova_motore.js` | `46/46 verifiche passate` |
| Colpo registrato | `node tools/prova_impatto.js` | `24/24 verifiche passate` |
| Dal vivo | `stunna(Enemy); eseguiAttacco(Player,false)` | `Enemy.statoCombo === 'sospeso'` |

## Rischi e compromessi

- **Il primo nodo è il più importante**: se l'intangibilità parte subito, l'attacco a distanza non serve a niente. Va deciso prima di scrivere la prima riga.
- **Lo stun è raro**: senza il Task 3b (caricato che stunna) la combo si vede una volta ogni tanto e la meccanica non si impara. Consiglio di aggiungerlo subito, non dopo.
- **Spedito + intangibile vanno misurati insieme**: se chi atterra è intangibile per due secondi, chi ha fatto la combo non può incalzare. È voluto, ma va provato per capire se l'attesa è troppo lunga: se lo è, si scende a 90 fotogrammi (un secondo e mezzo).
- **Il verbo nuovo**: un tasto in più è un costo per i giocatori e per il HUD. L'alternativa è usare il tasto del **caricato tenuto premuto fino in fondo** (un secondo), ma il caricato serve già: consiglio il tasto dedicato.
- **Lo sciame produrrà falsi difetti** finché non sa dell'intangibilità: vanno aggiornate le sonde prima di leggere un rapporto, altrimenti si inseguono fantasmi.
- **YAGNI**: niente mosse in aria per chi attacca, niente doppio salto, niente schivata. La combo è a terra contro un bersaglio in aria, e per UVSF7 è già molto.

## Domande aperte

1. **Nodo 1**: l'intangibilità parte all'atterraggio (mia raccomandazione) o subito dopo il terzo colpo?
2. **Nodo 2**: il colpo caricato deve stunnare? Senza, la combo si apre di rado.
3. **Il tasto** dell'attacco a distanza: `K` dedicato, oppure la stessa parata/carica tenuta a lungo?
4. Zuri perde l'attacco a distanza e guadagna la freccia-teletrasporto: confermi che sia lei, o preferisci un altro personaggio?
5. L'intangibilità vale 120 fotogrammi (2 s) o preferisci 90 (1,5 s)?
