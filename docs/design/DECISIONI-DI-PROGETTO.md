# Decisioni di progetto — UVSF7

Registro delle decisioni di design. **Le parole dell'autore sono riportate alla lettera** e non vanno riscritte: sotto ogni citazione c'è la specifica consolidata, che è quella da implementare. Se una delle due parti sembra in disaccordo, vince la citazione.

Ultimo aggiornamento: 25 ottobre 2026.

---

## 1. Le parole dell'autore

> «vorrei nel gioco una meccanica unica e strategica dammi delle idee»

> «piuttosto facciamo un set unico per ogni verdellinese, passiva tattica e ultimate appena ho tempo mi iniziamo a buttare giù idee per ognuno»

> «vanno tutte bene, sono perfette, ultima cosa che manca sarebbe un sistema di combo true come in brawlhalla riusciamo a pianificare anche questo prima di procedere?»

> «é da pensare bene, per ora la mia idea é che ci sia una combo universale per tutti stavo pensando che normalmente il colpo hitta spingendo l'avversario fuori dal proprio range ma se colpisci mentre l'avversario é stunnato lo porti leggermente in alto e lo spinge leggermente in avanti e da li comincia la combo, puoi fare fino a tre attacchi consecutivi mentre é in aria e il terzo lo spinge lontano rispetto a dove ti trovi e l'unico modo per continuare l'attacco dopo é con un attacco ranged che dovranno avere quasi tutti dopo una combo che la riceve deve diventare intangibile per un paio di secondi (lampeggiante bianco)»

> «e al posto dellattacco ranged rispetto a tutti gli altri personaggi un attacco che non fa nessun danno normalmente ma se viene parato stunna»

> «segna tutto quello che ho scritto non voglio venga perso, inoltre per le ulti voglio vengano completamente reimmaginate, vorrei tenerle essenzialmente come sono ora che alcuni le hanno ranged e altri no ma se hittano voglio parta una cutscene unica per ogni verdellinese che sia genuinamente bella da vedere»

---

## 2. Set dei verdellinesi — approvati

Approvati con «vanno tutte bene, sono perfette». Ogni set dice **una cosa sola**: un'identità meccanica. Le tattiche usano **un solo tasto nuovo** per tutti (`TATTICA`): stesso gesto, nove effetti.

### Ousmane Diouf — il picchiatore economico
Vita 100 · stamina 100 · danno 8 (il più basso) · costo stamina 14 (il più economico) · velocità 5.
Ultimate: **Radici del Baobab**, mischia, 20, applica *rallentamento* 240 passi.

- **Passiva — Mani Callose:** ogni colpo normale andato a segno restituisce 3 di stamina. Colpisce piano ma non finisce mai il fiato: è l'unico che può martellare venti secondi di fila.
- **Tattica — Piantarsi** (25 stamina): ti radichi per 40 passi. Non vieni spinto né spostato: serve a non farti portare all'angolo.
- **Ultimate:** resta com'è. Il rallentamento su chi hai appena piantato davanti è già la sua chiusura.

### Kwame Mensah — il vento
Vita 95 · stamina 100 · danno 11 · costo 19 · velocità 5,5 · salto alto.
Ultimate: **Vortice di Vento**, mischia, 18, applica *inversione* 180 passi.

- **Passiva — Passo Leggero:** atterrando non perdi stamina e non hai recupero: saltare non è mai un costo, è un modo di muoversi.
- **Tattica — Scarto** (15 stamina): durante una parata riuscita scivoli indietro di 60 px invece di restare fermo. La parata smette di essere difesa e diventa uscita.
- **Ultimate:** inversione, perfetta così: è l'unico che fa impazzire i comandi dell'altro.

### Chidi Okonkwo — il carro armato
Vita 110 (la più alta) · stamina 100 · danno 14 · costo 24 (il più caro) · velocità 4,6 (il più lento).
Ultimate: **Ruggito del Leone**, mischia, 24, applica *congelamento* 90 passi.

- **Passiva — Pelle Dura:** ignora i colpi che fanno 6 o meno. Tutti i chip damage del gioco gli fanno zero: contro di lui bisogna colpire pesante.
- **Tattica — Ruggito** (30 stamina): un urto che spinge l'avversario indietro di 120 px senza fargli danno. Si libera dall'angolo e ricompra lo spazio.
- **Ultimate:** congelamento 90 passi con 24 di danno, corto ma letale.

### Amara Diallo — la danza
Vita 90 · stamina 100 · danno 9 · costo 17 · velocità 6 (la più veloce) · salto −11,5.
Ultimate: **Danza Fulminea**, **buff**, danno 0, applica *velocità* 300 passi. L'unica che non fa danno.

- **Passiva — Contraccolpo:** ogni colpo che subisce le dà 2 di ultimate. Il dolore è la sua carica: più la picchiano, prima balla.
- **Tattica — In Tempo** (20 stamina): colpire entro 6 passi da una parata riuscita fa il 25% in più. Premia la reazione, non la pianificazione.
- **Ultimate:** velocità per 300 passi. Con la passiva può permettersela due volte per partita.

### Tarisai Moyo — la resistenza
Vita 95 · stamina 105 · danno 11 · costo 21 · velocità 5,2.
Ultimate: **Cerchio Ancestrale**, mischia, 20, applica *veleno* 240 passi.

- **Passiva — Radici Profonde:** la stamina si rigenera un quarto più in fretta. È il personaggio che non si stanca.
- **Tattica — Cerchio** (25 stamina): lascia a terra un cerchio per 120 passi; chi ci entra è rallentato. Riusa il sistema dei proiettili.
- **Ultimate:** veleno 240 passi. Insieme al cerchio, il tempo lavora per lei.

### Zuri Nkosi — la punitrice
Vita 88 · stamina 100 · danno 10 · costo 18 · velocità 5,8 · salto −11,5.
Ultimate: **Freccia della Savana**, mischia, 18, applica *marchio* 300 passi.

- **Passiva — Istinto:** colpire entro 10 passi da un attacco mancato dall'avversario fa il 50% in più. Il suo mestiere è punire il vuoto.
- **Tattica — Freccia Corta** (18 stamina): un proiettile breve che applica il marchio. Prepara l'ultimate senza consumarla.
- **Ultimate:** marchio 300 passi; con la tattica che marchia da lontano diventa la chiusura di una trappola.

### Bakari Traore — l'artiglieria
Vita 85 (la più bassa) · stamina 110 (la più alta) · danno 13 · costo 20 · velocità 4,4 (il più lento).
Ultimate: **Pioggia di Stelle**, **proiettile**, 24, applica *bruciatura* 240 passi.

- **Passiva — Polvere da Sparo:** i proiettili costano il 30% in meno.
- **Tattica — Puntamento** (20 stamina): restando fermo 30 passi, il proiettile successivo è più veloce e più grosso. Rischio evidente, ricompensa evidente.
- **Ultimate:** pioggia di stelle. Se ti avvicini sei morto: tutto il personaggio è la distanza.

### Sekou Camara — lo spegnitore
Vita 95 · stamina 105 · danno 12 · costo 19 · velocità 4,6.
Ultimate: **Giudizio degli Antenati**, **proiettile**, 22, applica *silenzio* 240 passi.

- **Passiva — Voce degli Antenati:** non subisce silenzio né inversione. Nessuno gli spegne le abilità.
- **Tattica — Sentenza** (22 stamina): applica silenzio per 120 passi, ma solo se l'avversario è stordito. Non è una mossa, è una punizione.
- **Ultimate:** silenzio 240 passi.

### Ayo Adebayo — il finale
Vita 88 · stamina 100 · danno 14 (alto) · costo 22 · velocità 5.
Ultimate: **Eclissi Arcana**, **proiettile**, 26 (la più forte del gioco), applica *eclissi* 180 passi.

- **Passiva — Ultimo Raggio:** sotto il 40% di vita i suoi colpi fanno il 15% in più. Non è mai finito.
- **Tattica — Eclissi Minore** (30 stamina): spegne la vista all'avversario per 60 passi.
- **Ultimate:** eclissi 180 passi, la versione grande della sua tattica.

---

## 3. La combo universale

Una sola combo, uguale per tutti i verdellinesi. Sei regole, nell'ordine in cui l'autore le ha dettate:

1. Un colpo normale **spinge l'avversario fuori dal raggio**: lo scambio finisce lì.
2. Un colpo mentre l'avversario è **stunnato** lo porta **leggermente in alto** e lo spinge **leggermente in avanti**: si resta a contatto, e da lì comincia la combo.
3. In aria si possono fare **fino a tre attacchi consecutivi**.
4. Il **terzo** lo spinge **lontano** rispetto a chi lo ha colpito.
5. Dopo, l'unico modo per continuare è un **attacco a distanza**, che dovranno avere **quasi tutti**.
6. Chi **riceve** la combo diventa **intangibile per un paio di secondi**, lampeggiando **bianco**.

### Numeri approvati nel piano

| Cosa | Valore |
|---|---|
| Sollevamento al primo colpo | +60 px in alto, +40 px in avanti |
| Sospensione dopo ogni colpo | 18 fotogrammi, gravità al 30% |
| Colpi ravvicinati | 3 |
| Danno dei colpi | ×1,00 · ×0,85 · ×0,70 |
| Spinta del terzo colpo | 320 px/s orizzontale |
| Intangibilità | 120 fotogrammi, lampeggio ogni 6 |
| Tetto di danno per combo | 45% della vita massima |

### Nodi aperti (decisi a metà)

- **Intangibilità contro attacco a distanza**: la regola 5 e la regola 6 si contraddicono se l'intangibilità parte subito. Proposta in attesa di conferma: **parte all'atterraggio**, così in volo si può ancora essere colpiti dal tiro.
- **Chi stunna**: oggi `stunna()` è chiamata in due soli punti del codice. Proposta in attesa di conferma: aggiungere il **colpo caricato in pieno** come terza porta d'ingresso.

---

## 4. Attacchi a distanza

Danno 12 per tutti (sono la chiusura della combo, non la fonte di danno). Costo 20 stamina, ricarica 90 fotogrammi.

| Verdellinese | Nome | Velocità | Colore | Nota |
|---|---|---|---|---|
| Ousmane Diouf | Seme del Baobab | 7 | `#8ab4ff` | lento ma sicuro |
| Kwame Mensah | Lame di Vento | 13 | `#d29bff` | il più rapido |
| Chidi Okonkwo | Onda d'Urto | 6 | `#8be9fd` | grosso, raggio 26 |
| Amara Diallo | Passo Doppio | 10 | `#7dff7d` | piccolo, difficile da vedere |
| Tarisai Moyo | Polline | 9 | `#a8e05f` | applica veleno |
| **Zuri Nkosi** | **Freccia del Ritorno** | 11 | `#ff6b6b` | **speciale, vedi sotto** |
| Bakari Traore | Stella Cadente | 10 | `#ff8a3d` | danno 14 |
| Sekou Camara | Sguardo degli Antenati | 8 | `#b06aff` | applica silenzio |
| Ayo Adebayo | Raggio d'Eclissi | 12 | `#d29bff` | danno 14 |

### Il personaggio speciale: Zuri Nkosi

Al posto dell'attacco a distanza ha una **tattica**: scocca una freccia (velocità 11) che **non fa nessun danno**; se **viene parata stunna** l'avversario; e se **colpisce** le permette di **teletrasportarsi dietro** di lui.

Costo 18 stamina, ricarica 110 fotogrammi. Limiti proposti per non creare combo infinite: **non** funziona su un avversario in stato *sospeso* o *spedito*, e all'arrivo Zuri resta ferma 8 fotogrammi.

---

## 5. Le ultimate con cutscene

**Decisione:** le ultimate restano **essenzialmente come sono** — alcune a distanza, altre no — ma **quando colpiscono parte una cutscene unica per ogni verdellinese**, che deve essere **genuinamente bella da vedere**.

Il progetto di dettaglio sta in `.hermes/plans/2026-10-25_090000-ulti-cutscene.md`. Qui i punti fermi:

- nove cutscene diverse, una per verdellinese, con un gesto visivo che appartiene solo a quel personaggio
- durata 1,2-2,2 secondi: cinema, non interruzione
- il gioco **non ha audio**: le cutscene sono muto-leggibili e si reggono su camera, colore, movimento e testo
- nessun filmato: tutto procedurale, con gli sprite e gli effetti che già esistono (`js/Effetti.js`)
- le barre nere (letterbox), la desaturazione e il nome della ultimate sono la grammatica comune
- **online**: l'host simula; l'ospite deve vedere la stessa cutscene, quindi il via viaggia nel fotogramma e ogni client esegue lo stesso copione locale

| Verdellinese | Ultimate | Tipo oggi | Il gesto che solo lui ha |
|---|---|---|---|
| Ousmane Diouf | Radici del Baobab | mischia | la telecamera striscia **a terra** |
| Kwame Mensah | Vortice di Vento | mischia | **il mondo si inclina**, non la camera |
| Chidi Okonkwo | Ruggito del Leone | mischia | **un secondo di immobilità** prima del colpo |
| Amara Diallo | Danza Fulminea | buff | la cutscene **migliora lei**, non colpisce l'altro |
| Tarisai Moyo | Cerchio Ancestrale | mischia | **inquadratura dall'alto** |
| Zuri Nkosi | Freccia della Savana | mischia | **il punto di vista è la freccia** |
| Bakari Traore | Pioggia di Stelle | proiettile | **il cielo**: unica inquadratura verso l'alto |
| Sekou Camara | Giudizio degli Antenati | proiettile | il **silenzio** diventa un'immagine |
| Ayo Adebayo | Eclissi Arcana | proiettile | **lo schermo si spegne** |

---

## 6. Cosa è già stato costruito (per non rifarlo)

- La combo universale e le cutscene **non sono ancora implementate**: esistono solo i piani.
- Gli attacchi a distanza **non esistono**; i proiettili sì (`creaProiettile`, `index.js:512`).
- Le passive, le tattiche e il tasto `TATTICA` **non esistono**.
- Le ultimate esistono con i loro effetti, senza cutscene.
- Un precedente utilissimo per le cutscene c'è già: `js/CerimoniaFine.js`, una sequenza a fasi contate in passi, identica su ogni schermo. Le cutscene vanno costruite con lo stesso schema.
