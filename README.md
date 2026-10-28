# Contratto Ca'Thalia

Modulo per compilare il contratto di locazione per singolo evento di Ca'Thalia e scaricarlo in PDF (contratto + allegati A, B e C).

Il sito è `index.html`: il PDF viene creato nel telefono o nel computer di chi lo usa, nessun dato dei clienti viene inviato da nessuna parte. Bozza e contratti salvati restano nella memoria del browser.

## Modificare il testo del contratto

Il testo è in `sorgente/engine.js` (funzioni `contratto`, `allegatoA`, `allegatoC`), il modulo in `sorgente/app.js` e `sorgente/app.template.html`. `sorgente/build.py` rigenera `index.html` (richiede `pdf-lib@1.17.1` e `@pdf-lib/fontkit@1.1.1` in `node_modules`, e le immagini in `../assets`).

Dati: comuni ISTAT via comuni-json, codici catastali storici ed esteri via CodiceFiscaleJS, font della firma Mr Dafoe (SIL Open Font License).
