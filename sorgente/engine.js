/* Ca'Thalia — composizione del contratto di locazione per singolo evento.
   Stesso codice per il PDF (pdf-lib) e per l'anteprima (canvas). */
(function (root) {
  'use strict';

  var A4 = [595.2756, 841.8898];
  var LEFT = 70.8, WIDTH = 456.476, BOTTOM = 70.0, CENTRO_PAGINA = 297.6378;
  // larghezze dei glifi Liberation Sans del modello originale (1/1000 em): servono ad andare a capo come ReportLab
  var LIB_R = [["'", 190.918], ["ijl’", 222.168], ["|", 259.7656], [" !,./:;I[\\]ftì", 277.832], ["()-`r“”", 333.0078], ["{}", 333.9844], ["•", 350.0977], ["\"", 354.9805], ["*", 389.1602], ["^", 469.2383], ["Jcksvxyz", 500.0], ["#$0123456789?L_abdeghnopquàèéòù–€", 556.1523], ["+<=>~", 583.9844], ["FTZ", 610.8398], ["&ABEKPSVXYÈÉ", 666.9922], ["CDHNRUw", 722.168], ["", 750.0], ["GOQ", 777.832], ["Mm", 833.0078], ["%", 889.1602], ["W", 943.8477], ["—", 1000.0], ["@", 1015.137]];
  var LIB_B = [["'", 237.793], [" ,./I\\ijlÌ’", 277.832], ["|", 279.7852], ["!()-:;[]`ft", 333.0078], ["*r{}", 389.1602], ["°", 399.9023], ["\"", 474.1211], ["z", 500.0], ["#$0123456789J_aceksvxyà", 556.1523], ["+<=>^~", 583.9844], ["?FLTZbdghnopqu", 610.8398], ["EPSVXY", 666.9922], ["&ABCDHKNRUÀ", 722.168], ["", 750.0], ["GOQw", 777.832], ["M", 833.0078], ["%m", 889.1602], ["W", 943.8477], ["@", 975.0977]];

  var COL = [{ x: 72.04, c: 185.54 }, { x: 299.04, c: 412.54 }];
  var NBSP = ' ';
  var SIG_COLOR = [0.08, 0.15, 0.45];

  var LOCATORE = {
    nome: 'Davide Michielan',
    nascita: 'Venezia (VE) il 14/05/1973',
    cf: 'MCHDVD73E14L407Z',
    residenza: 'Marcon (VE) via Montegrappa n. 29',
    email: 'davidemch@live.it'
  };

  var LOCALI = [
    { k: 'a', t: 'Festa Granda piano terra (primo piano incluso) e scoperto antistante' },
    { k: 'b', t: 'Magazzino lato sud e scoperto antistante' },
    { k: 'c', t: 'Porcilaia lato nord e scoperto di lato e dietro' },
    { k: 'd', t: 'Tettoia' },
    { k: 'e', t: 'Festin piano terra (primo piano incluso)' }
  ];
  var CHIAVI = [
    { k: 'sbarra', t: 'Chiavi sbarra ingresso (1)' },
    { k: 'festin', t: 'Chiavi festin (1)' },
    { k: 'festagranda', t: 'Chiavi festa granda (4)' },
    { k: 'porcilaia', t: 'Chiavi porcilaia (1)' }
  ];

  /* ---------------- numeri e date ---------------- */

  var UNITA = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci',
    'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
  var DECINE = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];

  function sotto100(n) {
    if (n < 20) return UNITA[n];
    var d = Math.floor(n / 10), u = n % 10, s = DECINE[d];
    if (!u) return s;
    if (u === 1 || u === 8) s = s.slice(0, -1);
    return s + UNITA[u];
  }
  function sotto1000(n) {
    var c = Math.floor(n / 100), r = n % 100, s = '';
    if (c) s = c === 1 ? 'cento' : UNITA[c] + 'cento';
    if (r) {
      if (c && (r === 8 || (r >= 80 && r < 90))) s = s.slice(0, -1);
      s += sotto100(r);
    }
    return s;
  }
  function inLettere(n) {
    n = Math.floor(Math.abs(n));
    if (n === 0) return 'zero';
    var mil = Math.floor(n / 1e6), mig = Math.floor((n % 1e6) / 1000), r = n % 1000, s = '';
    if (mil) s += mil === 1 ? 'unmilione' : inLettere(mil) + 'milioni';
    if (mig) s += mig === 1 ? 'mille' : sotto1000(mig) + 'mila';
    if (r) s += sotto1000(r);
    if (s !== 'tre' && /tre$/.test(s)) s = s.slice(0, -3) + 'tré';
    return s;
  }
  function centesimi(x) { return Math.round(Math.abs(x) * 100) % 100; }
  // "trecento/00"
  function euroInLettere(x) {
    var c = centesimi(x);
    return inLettere(Math.round(Math.abs(x) * 100 - c) / 100) + '/' + (c < 10 ? '0' : '') + c;
  }
  function migliaia(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  // "1.250,00"
  function euro(x) {
    var c = centesimi(x), i = Math.round(Math.abs(x) * 100 - c) / 100;
    return migliaia(i) + ',' + (c < 10 ? '0' : '') + c;
  }
  // "30" oppure "30,50"
  function euroBreve(x) {
    var c = centesimi(x), i = Math.round(Math.abs(x) * 100 - c) / 100;
    return migliaia(i) + (c ? ',' + (c < 10 ? '0' : '') + c : '');
  }
  function numero(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
    return isFinite(n) ? Math.round(n * 100) / 100 : null;
  }
  function data(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }
  function giorniTra(a, b) {
    var x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a || ''), y = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b || '');
    if (!x || !y) return null;
    var d = (Date.UTC(+y[1], +y[2] - 1, +y[3]) - Date.UTC(+x[1], +x[2] - 1, +x[3])) / 864e5;
    return Math.round(d);
  }
  function ora(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    return m ? (+m[1]) + ':' + m[2] : (t || '');
  }
  function elenco(nomi) {
    nomi = nomi.filter(Boolean);
    if (nomi.length < 2) return nomi[0] || '';
    return nomi.slice(0, -1).join(', ') + ' e ' + nomi[nomi.length - 1];
  }

  /* Importi derivati: caparra = metà canone, saldo = totale - caparra */
  function calcola(d) {
    var canone = numero(d.canone), pulizie = numero(d.pulizie), risc = numero(d.riscaldamento);
    var totale = canone === null ? null : canone + (pulizie || 0) + (d.riscInSaldo && risc ? risc : 0);
    var caparraAuto = canone === null ? null : Math.round(canone * 50) / 100;
    var caparra = numero(d.caparra);
    if (caparra === null) caparra = caparraAuto;
    var saldo = numero(d.saldo);
    if (saldo === null && totale !== null && caparra !== null) saldo = Math.round((totale - caparra) * 100) / 100;
    var giorni = numero(d.giorni);
    if (giorni === null) {
      var g = giorniTra(d.dal, d.al);
      giorni = g === null ? null : Math.max(1, g);
    }
    return { canone: canone, pulizie: pulizie, risc: risc, totale: totale, caparra: caparra,
      caparraAuto: caparraAuto, saldo: saldo, giorni: giorni };
  }

  /* ---------------- testo ---------------- */

  var WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  function winAnsi(ch) {
    var c = ch.charCodeAt(0);
    return ch.length === 1 && ((c >= 32 && c <= 126) || (c >= 160 && c <= 255) || WINANSI_EXTRA.indexOf(ch) >= 0);
  }
  var SOSTITUTI = { 'ı': 'i', 'ł': 'l', 'Ł': 'L', 'đ': 'd', 'Đ': 'D', '‐': '-',
    '‑': '-', '‒': '-', '−': '-', '′': "'", '″': '"', '´': "'", 'ʼ': '’' };
  // Testo inserito dall'utente → caratteri stampabili con i font standard del PDF
  function pulisci(s) {
    if (s === null || s === undefined) return '';
    s = String(s).normalize('NFC').replace(/\s+/g, ' ').trim();
    var out = '';
    Array.from(s).forEach(function (ch) {
      if (winAnsi(ch)) { out += ch; return; }
      if (SOSTITUTI[ch]) { out += SOSTITUTI[ch]; return; }
      var base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (base && Array.from(base).every(winAnsi)) out += base;
    });
    return out;
  }

  function R(t) { return { t: t }; }
  function B(t) { return { t: t, b: 1 }; }
  function U(t) { return { t: t, b: 1, u: 1 }; }
  // valore in grassetto oppure la riga vuota da compilare a mano
  function V(v, vuoto) { return v ? B(v) : R(vuoto); }

  var BL_DATA = '____/____/________';

  /* ---------------- stili ---------------- */

  function stile(base, extra) {
    var o = {}, k;
    for (k in base) o[k] = base[k];
    for (k in extra) o[k] = extra[k];
    return o;
  }
  var ST = {
    title: { size: 12, lead: 21, align: 'C', sb: 0, sa: 0, bold: 1, centroPagina: 1 },
    sub: { size: 10.6, lead: 13, align: 'C', sb: 12, sa: 6, bold: 1, centroPagina: 1 },
    p: { size: 9.1, lead: 10.6, align: 'J', sb: 3, sa: 3 },
    h: { size: 9.1, lead: 10.6, align: 'L', sb: 9, sa: 3, bold: 1, keepNext: 1 },
    sh: { size: 9.1, lead: 10.6, align: 'L', sb: 5, sa: 2, bold: 1, keepNext: 1 },
    field: { size: 9.1, lead: 10.6, align: 'L', sb: 0.5, sa: 0.5 }
  };
  var STC = { // Allegato C: interlinea più stretta
    title: stile(ST.title, { lead: 17 }),
    sub: stile(ST.sub, { sb: 6 }),
    p: stile(ST.p, { lead: 10.15, sb: 1.5, sa: 1.5 }),
    h: stile(ST.h, { lead: 10.15, sb: 6, sa: 1.5 })
  };

  function P(st, runs, extra) {
    var b = stile(st, extra || {});
    b.k = 'p';
    b.runs = typeof runs === 'string' ? [st.bold ? B(runs) : R(runs)] : runs;
    return b;
  }
  // elenchi: ogni voce è un paragrafo; spaziatura interna `gap`, prima `sb`, dopo `sa`
  function lista(st, voci, o) {
    return voci.map(function (v, i) {
      var b = P(st, v.runs, {
        sb: i === 0 ? o.sb : o.gap, sa: i === voci.length - 1 ? o.sa : 0,
        align: o.align || 'L', indent: o.indent || 0
      });
      if (v.marker) b.marker = v.marker;
      if (v.box !== undefined) b.box = v.box;
      if (v.prefix) b.prefix = v.prefix;
      return b;
    });
  }

  /* ---------------- contenuto ---------------- */

  function etichette(conduttori) {
    var n = conduttori.length;
    var tutteF = n > 0 && conduttori.every(function (c) { return c.sesso === 'F'; });
    if (n <= 1) {
      return {
        intestazione: 'IL CONDUTTORE',
        parte: 'La parte Conduttrice',
        approva: 'la parte Conduttrice approva',
        temporaneo: tutteF ? 'La Conduttrice Temporanea' : 'Il Conduttore Temporaneo'
      };
    }
    return {
      intestazione: 'I CONDUTTORI',
      parte: 'Le parti Conduttrici',
      approva: 'le parti Conduttrici approvano',
      temporaneo: tutteF ? 'Le Conduttrici Temporanee' : 'I Conduttori Temporanei'
    };
  }

  function nomeCompleto(c) { return pulisci([c.nome, c.cognome].filter(Boolean).join(' ')); }

  function normalizza(d) {
    var conduttori = (d.conduttori || []).map(function (c) {
      return {
        nome: pulisci(c.nome), cognome: pulisci(c.cognome), sesso: c.sesso === 'F' ? 'F' : (c.sesso === 'M' ? 'M' : ''),
        nascitaLuogo: pulisci(c.nascitaLuogo), nascitaData: data(c.nascitaData), cf: pulisci(c.cf).toUpperCase().replace(/\s/g, ''),
        telefono: pulisci(c.telefono), comune: pulisci(c.comune), indirizzo: pulisci(c.indirizzo), civico: pulisci(c.civico)
      };
    }).filter(function (c, i) {
      return i === 0 || c.nome || c.cognome || c.cf || c.nascitaLuogo || c.comune;
    });
    if (!conduttori.length) conduttori = [{}];
    return { d: d, conduttori: conduttori, calc: calcola(d) };
  }

  var VIA_RE = /^(via|viale|v\.le|piazza|p\.zza|piazzale|p\.le|corso|c\.so|vicolo|largo|strada|str\.|localit[aà]|loc\.|frazione|fraz\.|contr[aà]|contrada|calle|campo|campiello|borgo|salita|lungo|riva|rio|fondamenta|salizada|ramo|sestiere|galleria|vico|traversa|circonvallazione|stradella|stradone|lungomare|lungargine|quartiere|parco|cannaregio|castello|dorsoduro|giudecca|santa croce|san polo|san marco)\b/i;
  function indirizzo(c) {
    var via = c.indirizzo;
    if (via && !VIA_RE.test(via)) via = 'via ' + via;
    return via;
  }

  // righe dei dati di un conduttore: [etichetta, valore o null, riempitivo]
  function righeConduttore(c) {
    var nascita = (c.nascitaLuogo || c.nascitaData)
      ? (c.nascitaLuogo || '__________________________') + ' il ' + (c.nascitaData || BL_DATA) : null;
    var via = indirizzo(c);
    var res = null;
    if (c.comune || via || c.civico) {
      res = (c.comune || '__________________________') + ', ' + (via || 'via __________________________') +
        ' n. ' + (c.civico || '____');
    }
    return [
      ['Nome e Cognome:', nomeCompleto(c) || null, '______________________________________'],
      ['Nato/a a:', nascita, '__________________________ il ____/____/________'],
      ['Codice Fiscale:', c.cf || null, '____________________________'],
      ['Numero di telefono:', c.telefono || null, '______________________________________'],
      ['Residente in:', res, '__________________________ via __________________________ n. ____']
    ];
  }

  function contratto(N) {
    var d = N.d, k = N.calc, cond = N.conduttori, et = etichette(cond);
    var B_ = [];
    var push = function (x) { if (Array.isArray(x)) B_.push.apply(B_, x); else B_.push(x); };

    push(P(ST.title, 'CONTRATTO DI LOCAZIONE'));
    push(P(ST.title, 'DI UNITÀ IMMOBILIARE PER UN SINGOLO EVENTO'));
    push(P(ST.sub, 'PARTI CONTRAENTI'));
    push(P(ST.p, [R('Oggi, '), V(data(d.dataContratto), BL_DATA), R(' tra i signori:')], { align: 'L' }));
    push(P(ST.h, 'IL LOCATORE', { keepNext: 0 }));
    [['Nome e Cognome:', LOCATORE.nome], ['Nato/a a:', LOCATORE.nascita], ['Codice Fiscale:', LOCATORE.cf],
      ['Residente in:', LOCATORE.residenza], ['e-mail Locatore:', LOCATORE.email]].forEach(function (f) {
      push(P(ST.field, [B(f[0]), R(' ' + f[1])]));
    });
    push(P(ST.p, 'di seguito denominato "LOCATORE TEMPORANEO",', { align: 'L', sb: 3.5 }));
    push(P(ST.p, 'e', { align: 'C' }));
    push(P(ST.h, et.intestazione));
    push({ k: 'parti', conduttori: cond, sb: 3, sa: 0.5 });
    push(P(ST.p, 'di seguito denominati "CONDUTTORE TEMPORANEO",', { align: 'L', sb: 3.5 }));
    push(P(ST.p, 'si conviene e si stipula il seguente', { align: 'C' }));
    push(P(ST.sub, 'CONTRATTO DI LOCAZIONE PER UN SINGOLO EVENTO', { sb: 4 }));
    push(P(ST.h, 'OGGETTO DEL CONTRATTO'));
    push(P(ST.p, 'del complesso immobiliare denominato "Ca’Thalia", sito in Conscio di Casale Sul Sile via Bigone n. 53, composto da terreni e da edifici così sommariamente descritti:'));
    push({ k: 'tabella', sb: 9, sa: 10, rows: [
      ['Complesso:', 'Censito alla sez. C fg. 1 del C.F., A. delle E.:'],
      ['Casa colonica:', 'mapp. 751, sub. 2, cat. A/4, cl. 1, vani 11,5'],
      ['Tettoia/annessi:', 'mapp. 751, sub. 3, cat. D/10']] });
    push(P(ST.p, 'Per miglior descrizione si rimanda alle allegate planimetrie catastali.'));
    push(P(ST.p, "Terreno pertinenziale: censito al fg. 13 del C.T., A. delle E. (mappali 750 e 751), per una superficie complessiva di circa 13.896 mq. Per la descrizione dettagliata delle particelle catastali si rimanda all'allegato elenco catastale."));
    push(P(ST.h, 'PATTUIZIONI CONTRATTUALI'));
    push(P(ST.p, "La locazione temporanea per l'evento è regolata dalle seguenti pattuizioni, che il Conduttore Temporaneo dichiara di aver letto, compreso e di accettare integralmente e senza riserve, manlevando il Locatore da ogni responsabilità diretta ed indiretta verso il Conduttore Temporaneo e verso i terzi, persone fisiche e/o giuridiche:"));

    push(P(ST.h, '1. DURATA E RESTITUZIONE'));
    push(P(ST.p, [R('Il contratto è stipulato per la durata di giorni '), V(k.giorni ? String(k.giorni) : '', '____'),
      R(', con decorrenza dal '), V(data(d.dal), BL_DATA), R(' e scadenza con restituzione dell’immobile il '),
      V(data(d.al), BL_DATA), R(' alle ore '), V(ora(d.ora), '____'),
      R('. Il presente contratto NON sarà rinnovato o rinnovabile se non con la stipula di un nuovo contratto temporaneo per altri nuovi eventi.')]));
    push(P(ST.p, "Il Conduttore si impegna a riconsegnare i locali nello stato medesimo in cui li ha ricevuti, salvo il normale deperimento d'uso, pena il risarcimento del danno. Il Conduttore si impegna fin d'ora ad eseguire, o a far eseguire a proprie spese, tutte le opere di ripristino che verranno ritenute necessarie dal Locatore."));

    push(P(ST.h, '2. CANONE DEI LOCALI CONCESSI IN LOCAZIONE'));
    push(P(ST.p, 'Del complesso immobiliare sopra indicato sono concessi in locazione temporanea ESCLUSIVAMENTE i seguenti locali e spazi (specificati nell’allegato B)'));
    var loc = d.locali || {};
    push(lista(ST.p, LOCALI.map(function (l) {
      return { prefix: l.k + '. ', box: !!loc[l.k], runs: [R(l.t)] };
    }), { sb: 3, gap: 4, sa: 4 }));
    var canone = k.canone !== null
      ? [R('Euro '), B(euro(k.canone) + ' (diconsi Euro ' + euroInLettere(k.canone) + ')')]
      : [R('Euro ____________ (diconsi Euro ________________________)')];
    if (k.pulizie) {
      canone.push(R(' più Euro '), B(euro(k.pulizie) + ' (diconsi Euro ' + euroInLettere(k.pulizie) + ')'),
        R(' per le pulizie finali.'));
    }
    push(P(ST.p, canone, { sb: 6, sbInCima: 6, sa: 9, align: 'L' }));
    var pad = NBSP + NBSP + NBSP + NBSP;
    var risc = k.risc !== null
      ? [U(pad + euroBreve(k.risc) + pad), R(' (diconsi Euro '), U(pad + inLettere(k.risc) + (centesimi(k.risc) ? '/' + String(100 + centesimi(k.risc)).slice(1) : '') + pad), R(')')]
      : [R('________ (diconsi Euro ________________)')];
    push(P(ST.p, [R("Nel canone è compresa la fornitura di energia elettrica e acqua potabile, nei limiti del normale utilizzo dell'immobile. Eventuali spese per il riscaldamento verranno quantificate nella misura di Euro ")].concat(risc)));
    push(P(ST.p, 'Ogni altro locale o area del complesso rimane nella disponibilità esclusiva del Locatore e non potrà essere utilizzato dal Conduttore né dai suoi ospiti.'));
    if (pulisci(d.accordi)) {
      push(P(ST.p, [B('Accordi particolari: '), R(pulisci(d.accordi))]));
    }

    push(P(ST.h, '3. SOPRALLUOGO PRELIMINARE'));
    push(P(ST.p, [R('Nella visita di sopralluogo effettuata il '), V(data(d.sopralluogoData), BL_DATA), R(', sono presenti i signori:')], { align: 'L' }));
    push(P(ST.p, [R('Per il Locatore: '), V(pulisci(d.sopralluogoLocatore), '___________________________________________')], { align: 'L' }));
    var perCond = pulisci(d.sopralluogoConduttore) || elenco(cond.map(nomeCompleto));
    push(P(ST.p, [R('Per il Conduttore: '), V(perCond, '___________________________________________')], { align: 'L' }));

    push(P(ST.h, '4. ACCETTAZIONE DELLO STATO DEI LOCALI'));
    push(P(ST.p, "Sono stati esaminati i locali di cui al punto 2 e i relativi arredi. Il Conduttore dichiara di aver trovato tali locali idonei all'evento organizzato e li accetta nello stato di fatto in cui si trovano, come risultante dall'inventario allegato al presente contratto (Allegato A)."));
    push(P(ST.h, "5. DESTINAZIONE D'USO ED USO ESCLUSIVO"));
    push(P(ST.p, "Il Conduttore, sotto la propria piena responsabilità, dichiara di utilizzare i locali ESCLUSIVAMENTE per organizzare l'evento previsto — FESTA PRIVATA — e ricevere ed ospitare i propri invitati. Il Conduttore provvederà, ove previsto, alla somministrazione di alimenti e bevande, nell'obbligo del rispetto dei limiti di somministrazione di bevande alcoliche, all'intrattenimento musicale e ad eventuali spettacoli dal vivo. È a carico del Conduttore la responsabilità per il pagamento dei diritti SIAE connessi all'intrattenimento musicale o allo spettacolo dal vivo previsto, esonerando il Locatore da ogni responsabilità a riguardo."));
    push(P(ST.h, '6. PERSONALE E RESPONSABILITÀ DI TERZI'));
    push(P(ST.p, 'L’erogazione dei servizi sopra elencati ed il relativo costo sarà a carico integrale del Conduttore che dovrà essere in piena regola con la normativa vigente in materia. Il locatore non sarà responsabile altresì per qualsiasi altro servizio erogato al conduttore da parte di ditte terze. Il Locatore, non svolgendo attività di custodia, declina ogni responsabilità e non risponde, a nessun titolo, per le attività qui svolte, per furti e/o danneggiamenti di oggetti e/o denaro introdotti nel complesso immobiliare oggetto della locazione. Il Conduttore è responsabile di tutti i danni arrecati all’immobile, agli arredi, agli impianti e alle attrezzature durante il periodo di utilizzo, inclusi quelli causati dai partecipanti durante l’evento.'));
    push(P(ST.h, '7. DIRITTO DI RECESSO'));
    push(P(ST.p, 'Il Conduttore può recedere dal contratto in qualsiasi momento con preavviso di almeno 1 (uno) mese dalla data di inizio locazione, da comunicarsi con lettera raccomandata A/R o tramite posta elettronica certificata (PEC). In caso di recesso tardivo o mancata presentazione senza preavviso, il Conduttore autorizza il locatore a trattenere la caparra confirmatoria versata equivalente al 50% (cinquanta per cento) dell’importo convenuto.'));
    push(P(ST.h, '8. NUMERO MASSIMO DI OSPITI'));
    push(P(ST.p, 'I locali oggetto del presente contratto dovranno essere destinati esclusivamente ad eventi riconducibili a festa privata (assimilabile ad uso di civile abitazione), nel rispetto dei seguenti limiti di capienza:'));
    push(lista(ST.p, [
      'Edificio A (di cui al punto 2): numero massimo di 35 (trentacinque) persone;',
      'Edificio B (di cui al punto 2): numero massimo di 90 (novanta) persone;',
      'Edifici A e B congiuntamente: numero massimo di 125 (centoventicinque) persone.'
    ].map(function (t) { return { marker: '•', runs: [R(t)] }; }), { sb: 1, gap: 1, sa: 4, indent: 18 }));
    push(P(ST.p, "Il superamento dei limiti di capienza indicati per ciascun edificio costituisce grave inadempimento e comporta la risoluzione di diritto del contratto, ai sensi dell'art. 1456 c.c."));
    push(P(ST.h, '9. DIVIETO DI SUBLOCAZIONE'));
    push(P(ST.p, 'Il Conduttore non potrà sublocare, cedere o dare in comodato, nemmeno a titolo gratuito e nemmeno in forma parziale, i locali qui concessi. La violazione di tale divieto comporta la risoluzione di diritto del contratto.'));

    push(P(ST.h, '10. MODALITÀ E TERMINI DI PAGAMENTO'));
    var meta = k.caparra !== null && k.caparraAuto !== null && Math.abs(k.caparra - k.caparraAuto) < 0.005;
    var caparra = k.caparra !== null ? [B(euro(k.caparra))].concat(meta || k.canone === null ? [R(' (metà del canone)')] : [])
      : [R('____________,00 (metà del canone)')];
    push(P(ST.p, [R('Il Conduttore si obbliga a corrispondere € ')].concat(caparra,
      [R(' a titolo di caparra confirmatoria alla firma del presente contratto che ne da ampia quietanza.')])));
    push(P(ST.p, [R('Il saldo dell’importo pattuito € '), V(k.saldo !== null ? euro(k.saldo) : '', '____________,00'),
      R(' almeno 15 giorni prima mediante')], { align: 'L' }));
    var altroPag = d.pagamento === 'altro' ? pulisci(d.pagamentoAltro) : '';
    push(lista(ST.p, [
      { box: d.pagamento === 'bonifico', runs: [R('bonifico bancario')] },
      { box: d.pagamento === 'altro', runs: altroPag ? [R('altro '), B(altroPag), R('.')] : [R('altro _______________________________.')] }
    ], { sb: 3, gap: 4, sa: 4 }));
    push(P(ST.p, 'In caso di mancato pagamento entro il termine stabilito, il contratto si dovrà intendere risolto per grave inadempimento e il Locatore sarà libero di locare a terzi. Qualora non fosse possibile locare a terzi, il Conduttore autorizza il locatore a trattenere la caparra confirmatoria a titolo di risarcimento del danno.'));

    push(P(ST.h, '11. CONSEGNA E CUSTODIA DELLE CHIAVI'));
    push(P(ST.p, 'A pagamento effettuato, il Conduttore riceverà in consegna i locali ad ogni effetto, con il ritiro delle chiavi, DI CUI SI IMPEGNA ED OBBLIGA A NON FARE COPIE NÉ A CONSEGNARLE, ANCHE TEMPORANEAMENTE, A TERZI, costituendosi da quel momento custode dei medesimi. Indicare di seguito le chiavi che verranno consegnate:'));
    var ch = d.chiavi || {}, altroCh = pulisci(d.chiaviAltro);
    push(lista(ST.p, CHIAVI.map(function (c) { return { box: !!ch[c.k], runs: [R(c.t)] }; }).concat([
      { box: !!(ch.altro || altroCh), runs: altroCh ? [R('altro '), B(altroCh), R('.')] : [R('altro _______________________________.')] }
    ]), { sb: 3, gap: 4, sa: 4 }));
    push(P(ST.h, '12. DIVIETO DI MODIFICHE'));
    push(P(ST.p, 'Il Conduttore non potrà apportare alcuna modifica, innovazione, miglioria o addizione ai locali consegnati e alla loro destinazione, o agli impianti esistenti, senza il preventivo consenso scritto del Locatore.'));
    push(P(ST.h, '13. ESCLUSIONE DI RESPONSABILITÀ DEL LOCATORE'));
    push(P(ST.p, "Il Conduttore esonera espressamente il Locatore da ogni responsabilità per i danni diretti o indiretti derivanti da possibili attività poste in essere dai terzi aventi materiale disponibilità dell'immobile, che cagionino ad essi danni (spandimento di acqua, fughe di gas, incendi ed ogni altro abuso o trascuratezza della cosa locata). Il Conduttore è altresì responsabile di ogni danno arrecato a persone o cose durante lo svolgimento dell'evento."));
    push(P(ST.h, '14. REGISTRO E NORMATIVA'));
    push(P(ST.p, 'Essendo la durata del contratto inferiore ai 30 giorni, non si provvede alla registrazione dello stesso. La registrazione avverrà solo nel caso di inadempimento di una delle parti, ai sensi della normativa vigente.'));
    push(P(ST.h, '15. ALLEGATI'));
    push(P(ST.p, 'Fanno parte integrante del presente contratto i seguenti allegati:', { align: 'L' }));
    push(lista(ST.p, [
      "— Allegato A: Inventario dei beni e delle dotazioni presenti nell'immobile;",
      '— Allegato B: Planimetrie catastali dei locali concessi in locazione;',
      "— Allegato C: Regolamento per la buona condotta e le buone norme d'uso dell'immobile."
    ].map(function (t) { return { runs: [R(t)] }; }), { sb: 3, gap: 1, sa: 3 }));
    push(P(ST.h, '16. CLAUSOLA RISOLUTIVA ESPRESSA'));
    push(P(ST.p, "Il presente contratto si intende risolto di diritto, ai sensi dell'art. 1456 del Codice Civile, nel caso di violazione dei punti 1, 4, 7, 8, 10, 11 e 12. Il Locatore, in caso di risoluzione per inadempimento del Conduttore, avrà diritto di trattenere la caparra confirmatoria a titolo di penale, fatto salvo il risarcimento del maggior danno."));
    push(P(ST.h, '17. FORO COMPETENTE E LEGGE APPLICABILE'));
    push(P(ST.p, "Per quanto non previsto dal presente contratto, le Parti fanno espresso riferimento alle disposizioni del Codice Civile e comunque alle norme vigenti e agli usi locali. Per ogni eventuale controversia relativa all'interpretazione, esecuzione o risoluzione del presente contratto, è competente in via esclusiva il Foro di Treviso."));
    push(P(ST.h, '18. VIDEOSORVEGLIANZA E TRATTAMENTO DEI DATI PERSONALI'));
    push(lista(ST.p, [
      'Il Conduttore dichiara di essere stato informato che presso l’immobile oggetto del presente contratto è installato un sistema di videosorveglianza composto da telecamere interne ed esterne, installate per finalità di tutela del patrimonio, sicurezza e prevenzione di atti illeciti, ai sensi dell’art. 6, par. 1, lett. f), del Regolamento (UE) 2016/679 (GDPR) e in conformità al Provvedimento generale del Garante per la protezione dei dati personali dell’8 aprile 2010 e successive integrazioni.',
      'Il sistema è gestito dal Locatore, in qualità di Titolare del trattamento dei dati personali ai sensi degli artt. 4, n. 7, e 24 del Regolamento (UE) 2016/679 (GDPR), nonché del D.Lgs. 30 giugno 2003, n. 196, come modificato dal D.Lgs. 10 agosto 2018, n. 101. Il Titolare è contattabile all’indirizzo e-mail davidemch@live.it per qualsiasi richiesta relativa al trattamento dei dati personali.',
      'Le telecamere esterne sono attive al fine di monitorare gli accessi e il perimetro dell’immobile. Le telecamere interne sono disattivate per tutta la durata dell’evento; il Locatore si riserva la facoltà di riattivarle esclusivamente al termine del medesimo, per le finalità di sicurezza di cui al punto 1.',
      'Le telecamere non sono installate in servizi igienici, spogliatoi o altri luoghi destinati alla riservatezza personale, in conformità ai principi di minimizzazione e proporzionalità di cui all’art. 5, par. 1, lett. c), GDPR.',
      'Le immagini sono trattate esclusivamente per le finalità sopra indicate e conservate per un periodo limitato, non superiore a 48 (quarantotto) ore dal momento della registrazione, salvo esigenze di ulteriore conservazione in caso di fatti illeciti accertati o su specifica richiesta dell’Autorità Giudiziaria o di Pubblica Sicurezza. Decorso detto termine, le registrazioni sono automaticamente cancellate in modo irreversibile.',
      'L’accesso alle registrazioni è consentito esclusivamente al Locatore o a soggetti dallo stesso espressamente autorizzati per iscritto, i quali sono vincolati al rispetto della riservatezza e degli obblighi previsti dal GDPR e dal D.Lgs. n. 196/2003.',
      'Il Conduttore si impegna a informare i propri invitati e tutti i partecipanti all’evento circa la presenza del sistema di videosorveglianza, mediante comunicazione preventiva e mediante la presenza di apposita segnaletica informativa affissa in prossimità degli accessi all’immobile, ai sensi dell’art. 13 GDPR e delle Linee Guida 3/2019 dell’EDPB. La mancata informativa agli ospiti rimane a esclusiva responsabilità del Conduttore, che manleva il Locatore da ogni conseguente pretesa risarcitoria. Il Conduttore si impegna altresì a non rimuovere, oscurare o danneggiare la segnaletica informativa affissa dal Locatore, pena il risarcimento del danno.',
      'Con la sottoscrizione del presente contratto, il Conduttore dichiara di aver ricevuto idonea informativa sulla presenza del sistema di videosorveglianza ai sensi dell’art. 13 GDPR. Il Conduttore e ogni altra persona eventualmente ripresa dal sistema hanno diritto di accedere ai propri dati personali, richiederne la rettifica, la cancellazione o la limitazione del trattamento, ovvero di opporsi al medesimo, ai sensi degli artt. 15–21 GDPR, inviando apposita richiesta scritta al Titolare all’indirizzo davidemch@live.it. È altresì garantito il diritto di proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it). Qualsiasi manomissione, danneggiamento o disattivazione non autorizzata del sistema di videosorveglianza da parte del Conduttore o dei suoi ospiti costituisce grave inadempimento contrattuale ai sensi dell’art. 1456 c.c. e obbliga il Conduttore al risarcimento del danno.'
    ].map(function (t, i) { return { marker: (i + 1) + '.', runs: [R(t)] }; }), { sb: 3, gap: 0, sa: 0, indent: 18, align: 'J' }));
    push(P(ST.h, "APPROVAZIONE SPECIFICA AI SENSI DELL'ART. 1341 DEL CODICE CIVILE", { sb: 15, grp: 'firme' }));
    push(P(ST.p, "Ai sensi e per gli effetti dell'art. 1341 del Codice Civile, i contraenti dichiarano espressamente di aver letto con attenzione il presente contratto, che rispecchia la loro precisa e fedele volontà, e di accettare in particolare i seguenti punti: 1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 e 18.", { grp: 'firme' }));
    push({ k: 'firme', tipo: 'contratto', grp: 'firme', sb: 17, sa: 0, letto: 'Letto, approvato e sottoscritto.',
      sinistra: 'La parte Locatrice', destra: et.parte, approva: et.approva, conduttori: cond });
    return B_;
  }

  function allegatoA(N) {
    var d = N.d, et = etichette(N.conduttori), B_ = [];
    var push = function (x) { if (Array.isArray(x)) B_.push.apply(B_, x); else B_.push(x); };
    push(P(ST.title, 'ALLEGATO A'));
    push(P(ST.title, 'INVENTARIO DEI BENI'));
    push(P(ST.sub, 'ELENCO DEGLI ARREDI E DELLE DOTAZIONI DELL’IMMOBILE', { sb: 6, sa: 8 }));
    push(P(ST.p, 'Il presente Inventario costituisce parte integrante del Contratto di Locazione per Singolo Evento (di seguito: “il Contratto”) e disciplina i beni mobili, gli arredi e le dotazioni concessi in uso al Conduttore Temporaneo unitamente all’immobile. Il Conduttore dichiara di aver preso visione dei beni di seguito elencati, di averne verificato la consistenza e lo stato di conservazione in sede di sopralluogo congiunto e di accettarne la responsabilità di custodia per l’intera durata del contratto, ai sensi dell’art. 5 dell’Allegato C — Regolamento d’uso dell’immobile.'));
    var inv = [
      ['h', '1. FESTA GRANDA'],
      ['sh', '1.1 Ingresso', ['mobiletto d’entrata', 'mobiletto bar con tre bottiglie, brocca in peltro e vassoio']],
      ['sh', '1.2 Sala', ['mobile lungo in legno', 'macchina da cucire con abat-jour', 'divanetto rosso con poltrona e cinque cuscini',
        'tavolino in vetro con bordo oro e abat-jour', 'tre poltroncine in similpelle bianche con tavolino (base in ceramica e piano in vetro)',
        'due poltrone beige con tavolino in vetro a bordo in legno e abat-jour', 'banco-bar', 'due sgabelli in similpelle',
        'tre cestelli portaghiaccio', 'tavolo in legno con sei poltroncine lavorate', 'tavoli quadrati con sedie in paglia']],
      ['sh', '1.3 Primo piano', ['appendiabiti', 'divano in velluto blu con bordo oro', 'lampada a terra con paralume corallo',
        'tavolino in vetro con abat-jour', 'due divanetti lisci con gambe in metallo', 'quattro divani in pelle bianca', 'tavolino in vetro',
        'lampada ad arco', 'tavolino in legno con abat-jour', 'baule verde con vaso in vetro rosa e fiori',
        'tavolo rotondo intarsiato con cinque poltroncine in velluto']],
      ['sh', '1.4 Cucina', ['tavolo con sedie', 'macchina del caffè', 'frigorifero', 'congelatore']],
      ['h', '2. FESTÌN'],
      ['sh', '2.1 Piano terra', ['tavolo in legno con dieci sedie', 'due poltroncine in stoffa gialle', 'comodino con abat-jour',
        'tre candelabri di varie altezze', 'un candelabro a tre braccia con tre candele color argento', 'tre candele bianche, di cui una grande']],
      ['sh', '2.2 Primo piano', ['tavolo in legno con otto sedie', 'due divani in pelle rossi', 'un divano bianco', 'portabiti']],
      ['sh', '2.3 Cucina', ['frigorifero']],
      ['sh', '2.4 Portico', ['tre tavolini in alluminio', 'cinque sedie in alluminio', 'due botti', 'tre lanterne']]
    ];
    inv.forEach(function (x) {
      push(P(ST[x[0]], x[1]));
      if (x[2]) push(lista(ST.p, x[2].map(function (t) { return { marker: '•', runs: [R(t)] }; }), { sb: 1, gap: 1, sa: 4, indent: 18 }));
    });
    push(P(ST.h, '3. DICHIARAZIONI E RESPONSABILITÀ'));
    push(P(ST.p, [B('3.1 Presa in consegna.'), R(' con la sottoscrizione del presente Allegato, il Conduttore Temporaneo dichiara di ricevere in uso i beni sopra elencati, di averli visionati in sede di sopralluogo e di averli trovati integri, completi e funzionanti, salvo quanto eventualmente annotato nella sezione “Osservazioni”.')]));
    push(P(ST.p, [B('3.2 Obblighi di custodia.'), R(' il Conduttore si impegna a utilizzare i beni con la diligenza del buon padre di famiglia, ad evitarne ogni uso improprio e a non spostarli al di fuori dell’immobile. Eventuali malfunzionamenti preesistenti devono essere segnalati al Locatore entro 30 minuti dalla consegna delle chiavi.')]));
    push(P(ST.p, [B('3.3 Verifica alla riconsegna.'), R(' all’atto della riconsegna delle chiavi sarà effettuato, un sopralluogo al fine di verificare lo stato e la consistenza dei beni elencati. Eventuali rotture o danneggiamenti saranno addebitati al Conduttore secondo quanto previsto dal Contratto e dal Regolamento d’uso (Allegato C).')]));
    push(P(ST.h, '4. OSSERVAZIONI', { grp: 'oss' }));
    push(P(ST.p, 'Eventuali annotazioni sullo stato dei beni o sulle anomalie riscontrate al momento della consegna:', { align: 'L', grp: 'oss' }));
    push({ k: 'osservazioni', testo: pulisci(d.osservazioni), sb: 0, sa: 0, grp: 'oss' });
    push({ k: 'firme', tipo: 'allegato', sb: 0, sa: 0, letto: 'Letto, compreso ed accettato integralmente.',
      sinistra: 'Il Locatore', destra: et.temporaneo, conduttori: N.conduttori, gapLetto: 23.1 });
    return B_;
  }

  function allegatoC(N) {
    var d = N.d, et = etichette(N.conduttori), B_ = [];
    var push = function (x) { if (Array.isArray(x)) B_.push.apply(B_, x); else B_.push(x); };
    var p = function (lead, testo) { push(P(STC.p, [B(lead), R(' ' + testo)])); };
    push(P(STC.title, 'ALLEGATO C'));
    push(P(STC.title, "REGOLAMENTO D'USO DELL'IMMOBILE"));
    push(P(STC.sub, 'BUONE NORME DI CONDOTTA PER CONDUTTORI E OSPITI', { sa: 8 }));
    push(P(STC.p, 'Il presente Regolamento costituisce parte integrante del Contratto di Locazione per Singolo Evento (di seguito: "il Contratto") e deve essere letto, firmato per accettazione e rispettato integralmente dal Conduttore Temporaneo, il quale è responsabile della sua osservanza da parte di tutti i propri ospiti e del personale da lui incaricato.'));
    push(P(STC.h, '1. SUPERVISIONE DI MINORI E NEO-MAGGIORENNI'));
    p('1.1 Obbligo di presenza di un adulto responsabile.', "Qualora l'evento sia organizzato in occasione della ricorrenza di un minorenne (persona di età inferiore ai 18 anni) o di un neo-maggiorenne (persona che abbia compiuto il diciottesimo anno di età da non più di 12 mesi), oppure qualora la presenza di minorenni costituisca la componente principale o significativa degli ospiti, il Conduttore è tenuto — a pena di risoluzione immediata del contratto — a garantire la presenza continuativa e attiva di almeno un genitore, tutore o altro adulto responsabile (di età non inferiore a 25 anni) per ogni gruppo di minori presenti. Tale figura ha l'obbligo di vigilare sul comportamento dei minori per tutta la durata dell'evento.");
    p('1.2 Dichiarazione preventiva.', "Il Conduttore è tenuto a comunicare al Locatore, con almeno 15 giorni di anticipo rispetto alla data dell'evento il nome del genitore/tutore responsabile presente.");
    p('1.3 Zone di rischio.', "I minorenni non potranno accedere, senza la stretta supervisione di un adulto, ad aree potenzialmente pericolose quali: locali tecnici, depositi, magazzini, aree con macchinari, eventuali specchi d'acqua o piscine.");
    push(P(STC.h, '2. MUSICA, INTRATTENIMENTO E DISTURBO DELLA QUIETE PUBBLICA'));
    p('2.1 Orario e volume della musica.', 'La diffusione di musica e/o lo svolgimento di spettacoli dal vivo sono consentiti fino alle ore 23:00 (ventitré). A partire da tale orario, qualsiasi fonte sonora dovrà essere ridotta a livelli tali a rispettare le ordinanze comunali vigenti in materia di emissioni acustiche.');
    p('2.2 Responsabilità per disturbo della quiete.', "Il Conduttore è l'unico responsabile, ai sensi dell'art. 659 del Codice Penale e delle normative comunali applicabili, per ogni disturbo alla quiete pubblica causato dallo svolgimento dell'evento. Eventuali sanzioni comminate dalle autorità competenti e relative sanzioni saranno a totale carico del Conduttore, con esonero del Locatore da qualsiasi responsabilità.");
    push(P(STC.h, '3. SICUREZZA DEGLI IMPIANTI: GAS, ELETTRICITÀ E ACQUA'));
    p('3.1 Chiusura del gas.', "Al termine dell'evento, il Conduttore è obbligato a verificare che tutte le valvole del gas (fornelli, stufe, boiler, riscaldamento) siano chiuse e che nessun bruciatore sia acceso. Prima di riconsegnare le chiavi, dovrà chiudere il rubinetto generale del gas presente nell'apposito locale tecnico, come indicato nella planimetria consegnata al momento del sopralluogo. La mancata chiusura del gas al termine dell'evento costituisce grave negligenza e comporta la responsabilità del Conduttore per ogni danno conseguente.");
    p('3.2 Spegnimento delle luci e degli impianti elettrici.', "Prima di abbandonare i locali, il Conduttore è tenuto a spegnere tutte le luci, gli apparecchi elettrici e i dispositivi di amplificazione audio/video. È obbligatorio verificare lo spegnimento dei punti luce nei locali secondari (bagni, corridoi, depositi). Il quadro generale dell'energia elettrica dovrà essere lasciato nella posizione indicata dal Locatore al momento della consegna.");
    p("3.3 Chiusura dell'acqua.", "Al termine dell'utilizzo dell'immobile, il Conduttore deve verificare che tutti i rubinetti e le relative valvole di alimentazione idrica siano chiusi.");
    var temp = pulisci(d.temperatura).replace(/\s*°?\s*C?$/i, '');
    push(P(STC.p, [B('3.4 Utilizzo del riscaldamento e del condizionamento.'), R(" L'utilizzo degli impianti di riscaldamento e/o condizionamento è consentito esclusivamente nelle modalità indicate dal Locatore al momento della consegna. Non è consentito modificare le impostazioni degli impianti centralizzati o manomettere i termostati, accordati in via preventiva nel presente contratto per una temperatura prestabilita di: ")]
      .concat(temp ? [B(temp + ' °C')] : [R('____ '), B('°C')], [R(' (gradi Celsius).')])));
    p('3.5 Emergenza e pronto intervento.', 'In caso di perdita di gas, cortocircuito, allagamento o qualsiasi altra situazione di emergenza, il Conduttore è tenuto ad intervenire immediatamente agendo sulle valvole di intercettazione e a contattare senza ritardo il Locatore al numero indicato nel Contratto, nonché i servizi di emergenza competenti (112, 115, 118).');
    push(P(STC.h, '4. PULIZIA, RIMOZIONE DEGLI EFFETTI PERSONALI E RICONSEGNA'));
    p('4.1 Sgombero degli spazi e rimozione degli effetti personali.', "Al termine dell'evento, il Conduttore è tenuto a rimuovere tempestivamente e completamente tutti gli effetti personali, gli arredi temporanei, le attrezzature, i materiali decorativi, le strutture gonfiabili, i gazebo e qualsiasi altro oggetto introdotto nell'immobile o nelle sue pertinenze. Nessun oggetto dovrà essere abbandonato o lasciato nei locali oltre l'orario di riconsegna delle chiavi, pena la trattenuta del deposito cauzionale e l’eventuale costo dello smaltimento di tali materiali.");
    p('4.2 Raccolta dei rifiuti.', "Il Conduttore è tenuto a raccogliere e smaltire tutti i rifiuti prodotti durante l'evento, utilizzando i contenitori messi a disposizione o sacchi propri. Bottiglie, bicchieri, stoviglie monouso, imballaggi, cibo e qualsiasi altro rifiuto devono essere smaltiti prima della riconsegna. Rifiuti speciali o ingombranti devono essere portati via dal Conduttore a proprie spese.");
    p('4.3 Pulizia degli spazi.', "I locali devono essere riconsegnati in condizioni da permettere la pulizia. Pavimenti, superfici, bagni e cucine devono essere lasciati sgombri da cibo, bevande, feci, mozziconi di sigarette e qualsiasi altro residuo. Il Conduttore è responsabile della pulizia sia degli spazi interni che delle aree esterne (giardino, cortile, parcheggio, vialetti) utilizzate durante l'evento.");
    p('4.4 Mozziconi di sigarette.', "È fatto divieto di fumare all'interno dei locali e in prossimità delle finestre aperte. Il fumo è consentito esclusivamente nelle aree esterne designate. I mozziconi di sigarette devono essere smaltiti negli appositi posacenere e non devono essere gettati a terra nel giardino, nei vialetti o sulle superfici lastricate.");
    p('4.5 Danni e anomalie riscontrate.', "Qualsiasi danno accidentale riscontrato durante l'utilizzo dell'immobile (rottura di vetri, danneggiamento di arredi, macchie su superfici ecc.) dovrà essere immediatamente comunicato al Locatore. Non sono ammesse riparazioni improvvisate; ogni intervento dovrà essere concordato preventivamente con il Locatore.");
    push(P(STC.h, "5. INVENTARIO DEI BENI E DOTAZIONI DELL'IMMOBILE"));
    push(P(STC.p, "Al momento della consegna delle chiavi, il Conduttore riceve in uso i beni e le dotazioni elencate nell'Allegato A — Inventario dei beni, allegato al Contratto. Il Conduttore dichiara di aver preso visione di tale elenco, di averlo verificato con il Locatore in sede di sopralluogo e di accettarne la responsabilità di custodia per l'intera durata del contratto."));
    p('5.1 Cura e utilizzo dei beni.', 'I beni inventariati (mobili, elettrodomestici, attrezzature, stoviglie, apparecchi audio/video, ecc.) devono essere utilizzati in modo corretto e con la diligenza del buon padre di famiglia. Eventuali malfunzionamenti preesistenti devono essere segnalati al Locatore entro 30 minuti dalla consegna delle chiavi; malfunzionamenti o danni non segnalati entro tale termine saranno imputati al Conduttore.');
    p('5.2 Verifica alla riconsegna.', "All'atto della riconsegna delle chiavi, il Locatore e il Conduttore effettueranno un sopralluogo congiunto per verificare lo stato dei beni e dell'immobile. In caso di assenza del Conduttore al sopralluogo di riconsegna, il Locatore provvederà alla verifica in modo autonomo e le risultanze avranno piena efficacia probatoria nei confronti del Conduttore.");
    p('5.3 Oggetti dimenticati.', 'Il Locatore non è responsabile della custodia di oggetti dimenticati dopo la riconsegna. Gli oggetti eventualmente rinvenuti saranno conservati per un massimo di 7 giorni, trascorsi i quali potranno essere smaltiti o devoluti in beneficenza senza alcuna responsabilità per il Locatore.');
    push(P(STC.h, '6. NORME GENERALI DI BUONA CONDOTTA'));
    p('6.1 Parcheggio.', 'I veicoli degli ospiti dovranno essere parcheggiati esclusivamente nelle aree designate indicate dal Locatore. È vietato parcheggiare su strade private, su prati o in aree non autorizzate. Il Conduttore è responsabile del rispetto di questa norma da parte dei propri ospiti.');
    p('6.2 Sostanze illecite.', "È assolutamente vietato l'uso, il possesso e la diffusione di sostanze stupefacenti o psicotrope all'interno e nelle pertinenze dell'immobile, ai sensi della normativa vigente. Il Conduttore risponde solidalmente delle violazioni commesse da chiunque acceda all'immobile in forza del presente contratto.");
    p('6.3 Accesso alle aree riservate.', "Il Conduttore e i suoi ospiti non potranno accedere ai locali non compresi nell'oggetto della locazione (locali tecnici, aree agricole, depositi privati del Locatore). Il Locatore ha facoltà di apporre segnalazioni o lucchetti sulle aree non concesse in locazione.");
    p('6.4 Responsabilità per danni a terzi.', "In ogni caso, il conduttore, rimane integralmente responsabile per ogni danno a persone o cose derivante dallo svolgimento dell'evento.");
    push(P(STC.h, '7. DISPOSIZIONI FINALI'));
    p('7.1 Violazioni e sanzioni.', "La violazione di anche una sola delle norme del presente Regolamento costituisce inadempimento contrattuale e potrà comportare, a discrezione del Locatore: (i) la richiesta di immediato ripristino, (ii) la risoluzione di diritto del Contratto con allontanamento immediato del Conduttore e dei suoi ospiti, (iii) il risarcimento dell'eventuale maggior danno.");
    p('7.2 Accettazione.', 'La firma del presente Regolamento da parte del Conduttore equivale a piena e incondizionata accettazione di tutte le disposizioni ivi contenute, nonché delle eventuali istruzioni operative fornite verbalmente o per iscritto dal Locatore al momento del sopralluogo e della consegna delle chiavi.');
    push({ k: 'firme', tipo: 'allegato', sb: 15.5, sa: 0, grp: 'firmeC', letto: 'Letto, compreso ed accettato integralmente.',
      sinistra: 'Il Locatore', destra: et.temporaneo, conduttori: N.conduttori, gapLinee: 30.4 });
    push(P({ size: 7.9, lead: 9.5, align: 'J', sb: 0, sa: 0 }, [B('NOTA BENE'), R(" — Il presente Regolamento è parte integrante del Contratto. Una copia firmata dovrà essere consegnata al Locatore prima della consegna delle chiavi. Il mancato rispetto delle norme qui contenute potrà comportare l'immediata interruzione dell'evento senza diritto al rimborso del canone versato.")], { grp: 'firmeC', dopoFirme: 1 }));
    return B_;
  }

  /* ---------------- impaginazione ---------------- */

  // metr: { w(text, bold, size) larghezza senza crenatura, ws(text, size) per la firma }
  function spezzaRighe(runs, maxW, size, metr) {
    // parole = sequenze di frammenti senza spazi
    var parole = [], cur = [], spazio = metr.w(' ', false, size);
    runs.forEach(function (r) {
      var parti = r.t.split(/( )/);
      parti.forEach(function (s) {
        if (s === ' ') { if (cur.length) parole.push(cur); cur = []; return; }
        if (!s) return;
        cur.push({ t: s, b: !!r.b, u: !!r.u });
      });
    });
    if (cur.length) parole.push(cur);
    var larg = function (p) { return p.reduce(function (a, f) { return a + metr.w(f.t, f.b, size); }, 0); };
    // spezza parole più larghe della riga
    var p2 = [];
    parole.forEach(function (p) {
      if (larg(p) <= maxW) { p2.push(p); return; }
      var acc = [], w = 0;
      p.forEach(function (f) {
        Array.from(f.t).forEach(function (c) {
          var cw = metr.w(c, f.b, size);
          if (w + cw > maxW && acc.length) { p2.push(acc); acc = []; w = 0; }
          var last = acc[acc.length - 1];
          if (last && last.b === f.b && last.u === f.u) last.t += c; else acc.push({ t: c, b: f.b, u: f.u });
          w += cw;
        });
      });
      if (acc.length) p2.push(acc);
    });
    // a capo come ReportLab: la riga sta se gli spazi devono restringersi al massimo del 5%
    var spazioB = metr.wb(' ', false, size);
    var largB = function (p) { return p.reduce(function (a, f) { return a + metr.wb(f.t, f.b, size); }, 0); };
    var righe = [], riga = [], w = 0, wb = 0;
    p2.forEach(function (p) {
      var pw = larg(p), pb = largB(p);
      if (riga.length && wb + spazioB + pb - riga.length * 0.05 * spazioB > maxW + 1e-6) {
        righe.push({ parole: riga, w: w }); riga = []; w = 0; wb = 0;
      }
      w += (riga.length ? spazio : 0) + pw;
      wb += (riga.length ? spazioB : 0) + pb;
      riga.push(p);
    });
    if (riga.length) righe.push({ parole: riga, w: w });
    return { righe: righe, spazio: spazio };
  }

  // trasforma una riga in frammenti posizionati
  function frammentiRiga(riga, x0, size, metr, tw) {
    var out = [], x = x0, spazio = metr.w(' ', false, size);
    riga.parole.forEach(function (p, i) {
      if (i > 0) {
        var prev = out[out.length - 1], primo = p[0];
        // lo spazio va nel frammento precedente se lo stile coincide
        if (prev && prev.b === primo.b && prev.u === primo.u) prev.t += ' ';
        else out.push({ t: ' ', b: primo.b, u: primo.u && prev && prev.u, x: x });
        x += spazio + tw;
      }
      p.forEach(function (f) {
        var prev = out[out.length - 1];
        if (prev && prev.b === f.b && prev.u === f.u && prev.t.slice(-1) === ' ' && i > 0 && f === p[0]) {
          prev.t += f.t;
        } else if (prev && prev.b === f.b && prev.u === f.u && f !== p[0]) {
          prev.t += f.t;
        } else {
          out.push({ t: f.t, b: f.b, u: f.u, x: x });
        }
        x += metr.w(f.t, f.b, size);
      });
    });
    // larghezza reale di ogni frammento (con gli spazi allargati)
    out.forEach(function (f) {
      var n = (f.t.match(/ /g) || []).length;
      f.w = metr.w(f.t, f.b, size) + n * tw;
    });
    return out;
  }

  function Layout(metr, assets) {
    this.metr = metr;
    this.assets = assets || {};
    this.pagine = [];
  }

  Layout.prototype.nuovaPagina = function (sez) {
    var pg = { w: sez.size[0], h: sez.size[1], ops: [], sez: sez.nome };
    this.pagine.push(pg);
    sez.pagine.push(pg);
    this.pg = pg;
    this.y = sez.top;
    this.inCima = true;
    this.prevSa = 0;
    return pg;
  };

  Layout.prototype.testo = function (x, y, size, f, t, extra) {
    var op = { k: 't', x: x, y: y, s: size, f: f, t: t };
    if (extra) for (var k in extra) op[k] = extra[k];
    this.pg.ops.push(op);
  };
  Layout.prototype.linea = function (x1, y1, x2, y2, w) {
    this.pg.ops.push({ k: 'l', x1: x1, y1: y1, x2: x2, y2: y2, w: w || 0.5 });
  };

  // altezza del blocco (per i paragrafi: tutte le righe)
  Layout.prototype.prepara = function (b) {
    var m = this.metr;
    if (b.k === 'p') {
      if (b._r) return b;
      var x0 = LEFT + (b.indent || 0), maxW = WIDTH - (b.indent || 0), pre = 0;
      if (b.prefix) pre += m.w(b.prefix, false, b.size);
      if (b.box !== undefined) pre += 9.4 + m.w(' ', false, b.size);
      var bold = b.bold;
      var runs = b.runs.map(function (r) { return { t: r.t, b: bold ? 1 : r.b, u: r.u }; });
      var s = spezzaRighe(runs, maxW - pre, b.size, m);
      b._r = s.righe; b._x = x0 + pre; b._maxW = maxW - pre;
      b.h = s.righe.length * b.lead;
      return b;
    }
    if (b.k === 'tabella') { b.h = b.rows.length * 12.6; return b; }
    if (b.k === 'parti') return this.preparaParti(b);
    if (b.k === 'osservazioni') return this.preparaOss(b);
    if (b.k === 'firme') return this.preparaFirme(b);
    return b;
  };

  Layout.prototype.disegnaRighe = function (b, da, a, yTop) {
    var m = this.metr, self = this;
    for (var i = da; i < a; i++) {
      var riga = b._r[i], base = yTop - b.size - (i - da) * b.lead;
      var ultima = i === b._r.length - 1, tw = 0, x = b._x;
      var nSpazi = riga.parole.length - 1;
      if (b.align === 'J' && !ultima && nSpazi > 0) tw = (b._maxW - riga.w) / nSpazi;
      if (b.align === 'C') x = (b.centroPagina ? CENTRO_PAGINA : LEFT + WIDTH / 2) - riga.w / 2;
      if (i === 0) {
        if (b.marker) {
          var mk = b.marker === '•' ? { x: LEFT + 6, s: 10 } : { x: LEFT, s: 10 };
          self.testo(mk.x, base, mk.s, 'R', b.marker);
        }
        var px = LEFT + (b.indent || 0);
        if (b.prefix) { self.testo(px, base, b.size, 'R', b.prefix); px += m.w(b.prefix, false, b.size); }
        if (b.box !== undefined) self.pg.ops.push({ k: 'box', x: px, y: base, on: !!b.box });
      }
      frammentiRiga(riga, x, b.size, m, tw).forEach(function (f) {
        if (f.t.trim() || f.u) self.testo(f.x, base, b.size, f.b ? 'B' : 'R', f.t, tw ? { tw: tw } : null);
        if (f.u) self.linea(f.x, base - 1.4, f.x + f.w, base - 1.4, 0.5);
      });
    }
  };

  /* blocco conduttori: 1 = come il modello; 2+ = due colonne come nell'esempio */
  Layout.prototype.preparaParti = function (b) {
    var m = this.metr, n = b.conduttori.length;
    var size = n === 1 ? 9.1 : 8.6, colW = n === 1 ? WIDTH : 241.2, passo = 11.1;
    var schede = b.conduttori.map(function (c) {
      return righeConduttore(c).map(function (r) {
        var lab = r[0] + ' ';
        var val = r[1];
        if (!val) {
          // riempitivo che non sfora la colonna: accorcia in proporzione le linee lunghe
          var spazio = colW - m.w(lab, true, size) - 2, fill = r[2], k = 1;
          while (k > 0.2 && m.w(fill, false, size) > spazio) {
            k -= 0.05;
            fill = r[2].replace(/_{6,}/g, function (u) { return u.slice(0, Math.max(4, Math.round(u.length * k))); });
          }
          val = fill;
        }
        var s = spezzaRighe([{ t: r[0], b: 1 }, { t: ' ' + val }], colW, size, m);
        return s.righe;
      });
    });
    var altezzaScheda = function (sc) { return sc.reduce(function (a, r) { return a + r.length; }, 0) * passo; };
    var file = [];
    if (n === 1) file.push([schede[0]]);
    else for (var i = 0; i < n; i += 2) file.push(schede.slice(i, i + 2));
    b._file = file; b._size = size; b._passo = passo;
    b.h = file.reduce(function (a, f) {
      return a + Math.max.apply(null, f.map(altezzaScheda));
    }, 0) + (file.length - 1) * 6 - (passo - 10.6);
    return b;
  };
  Layout.prototype.disegnaParti = function (b, yTop) {
    var self = this, m = this.metr, y0 = yTop - b._size - (b._size === 9.1 ? 0 : 0.5);
    b._file.forEach(function (fila) {
      var maxRighe = 0;
      fila.forEach(function (sc, col) {
        var x = LEFT + col * 247.2, y = y0, nr = 0;
        sc.forEach(function (righe) {
          righe.forEach(function (riga) {
            frammentiRiga(riga, x, b._size, m, 0).forEach(function (f) {
              if (f.t.trim()) self.testo(f.x, y, b._size, f.b ? 'B' : 'R', f.t);
            });
            y -= b._passo; nr++;
          });
        });
        maxRighe = Math.max(maxRighe, nr);
      });
      y0 -= maxRighe * b._passo + 6;
    });
  };

  Layout.prototype.preparaOss = function (b) {
    var righe = [], m = this.metr;
    if (b.testo) {
      righe = spezzaRighe([{ t: b.testo }], 456.48 - 4, 9.1, m).righe;
    }
    b._righe = righe;
    b._n = Math.max(3, righe.length);
    // dalla linea di base del testo precedente alla prima riga: 19.1; poi 14.6
    b.h = (19.1 - 1.5) + (b._n - 1) * 14.6;
    return b;
  };
  Layout.prototype.disegnaOss = function (b, yTop) {
    var self = this, m = this.metr, y = yTop - (19.1 - 1.5);
    for (var i = 0; i < b._n; i++) {
      if (b._righe[i]) {
        frammentiRiga(b._righe[i], LEFT + 2, 9.1, m, 0).forEach(function (f) {
          self.testo(f.x, y + 2.2, 9.1, 'R', f.t);
        });
      }
      self.linea(LEFT, y, LEFT + 456.48, y, 0.6);
      y -= 14.6;
    }
    b._fine = y + 14.6;
  };

  /* firme: misure riprese dal modello (1 conduttore) e dall'esempio (2 conduttori) */
  Layout.prototype.preparaFirme = function (b) {
    var n = b.conduttori.length;
    var passo = 32;
    var h = 9.1 + 19.6 + 26 + 30 + (n - 1) * passo + 9.5 + 2;
    if (b.tipo === 'contratto') h += 34 + (n === 1 ? 52 : 38) + (n - 1) * 35 + 9.5 + 2;
    b._passo = passo;
    b.h = h;
    return b;
  };
  Layout.prototype.disegnaFirme = function (b, yTop) {
    var self = this, m = this.metr, d = this.dati, cond = b.conduttori;
    var centra = function (t, f, s, cx, y) { self.testo(cx - m.w(t, f === 'B', s) / 2, y, s, f, t); };
    var mezzo = LEFT + WIDTH / 2;
    var y = yTop - 9.1;
    centra(b.letto, 'R', 9.1, mezzo, y);
    y -= 19.6;
    var dt = data(d.dataContratto);
    var luogo = 'Casale Sul Sile, ';
    if (dt) {
      var wl = m.w(luogo, false, 9.1), wd = m.w(dt, true, 9.1), x = mezzo - (wl + wd) / 2;
      self.testo(x, y, 9.1, 'R', luogo);
      self.testo(x + wl, y, 9.1, 'B', dt);
    } else centra('Casale Sul Sile,   ' + BL_DATA, 'R', 9.1, mezzo, y);
    y -= 26;
    centra(b.sinistra, 'B', 9.1, COL[0].c, y);
    centra(b.destra, 'B', 9.1, COL[1].c, y);
    y -= 30;
    var lineaFirma = function (c, yy) { self.linea(c - 75.9, yy - 0.9, c + 75.9, yy - 0.9, 0.5); };
    var didascalia = function (t, c, yy, smax) {
      var s = smax;
      while (s > 6 && m.w(t, false, s) > 226) s -= 0.1;
      centra(t, 'R', Math.round(s * 10) / 10, c, yy);
    };
    lineaFirma(COL[0].c, y);
    if (d.firma && pulisci(d.firmaNome)) {
      var nf = pulisci(d.firmaNome), sz = 20;
      while (sz > 12 && m.ws(nf, sz) > 150) sz -= 0.5;
      self.pg.ops.push({ k: 't', f: 'S', s: sz, t: nf, x: COL[0].c - m.ws(nf, sz) / 2, y: y + 3, col: SIG_COLOR });
    }
    cond.forEach(function (c, i) {
      var yy = y - i * b._passo;
      lineaFirma(COL[1].c, yy);
      var nome = nomeCompleto(c);
      if (nome) didascalia(nome, COL[1].c, yy - 9.5, 7.9);
    });
    y -= (cond.length - 1) * b._passo;
    if (b.tipo === 'contratto') {
      y -= 34;
      self.testo(LEFT, y, 9.1, 'R', "Ai sensi dell'art. 1341 C.C., " + b.approva + ' specificamente i punti indicati:');
      y -= cond.length === 1 ? 52 : 38;
      cond.forEach(function (c, i) {
        var yy = y - i * 35;
        lineaFirma(COL[1].c, yy);
        var nome = nomeCompleto(c);
        didascalia(nome ? '(firma per approvazione specifica – ' + nome + ')' : '(firma per approvazione specifica)', COL[1].c, yy - 9.5, 7.9);
      });
      y -= (cond.length - 1) * 35;
    }
    b._fine = y;
  };

  Layout.prototype.disegnaTabella = function (b, yTop) {
    var self = this, x0 = 72.04, x1 = 526.04, xm = 299.04, h = 12.6, n = b.rows.length;
    var yb = yTop - n * h;
    self.linea(x0, yTop, x1, yTop, 1); self.linea(x0, yb, x1, yb, 1);
    self.linea(x0, yb, x0, yTop, 1); self.linea(x1, yb, x1, yTop, 1); self.linea(xm, yb, xm, yTop, 1);
    b.rows.forEach(function (r, i) {
      var base = yTop - (i + 1) * h + 1.5;
      if (i < n - 1) self.linea(x0, yTop - (i + 1) * h, x1, yTop - (i + 1) * h, 1);
      self.testo(x0 + 6, base, 9.1, 'B', r[0]);
      self.testo(xm + 6, base, 9.1, 'R', r[1]);
    });
  };

  // dispone una sezione (contratto, allegati) su pagine A4
  Layout.prototype.sezione = function (sez, blocchi) {
    var self = this;
    sez.pagine = [];
    this.nuovaPagina(sez);
    blocchi.forEach(function (b) { self.prepara(b); });
    var spazioPrima = function (b) { return self.inCima ? (b.sbInCima || 0) : Math.max(self.prevSa, b.sb || 0); };
    var resta = function () { return self.y - BOTTOM; };

    for (var i = 0; i < blocchi.length; i++) {
      var b = blocchi[i];
      // gruppi da tenere insieme (firme)
      if (b.grp && (i === 0 || blocchi[i - 1].grp !== b.grp)) {
        var hg = 0, j = i, prevSa = self.prevSa, prima = true;
        while (j < blocchi.length && blocchi[j].grp === b.grp) {
          hg += (prima ? spazioPrima(blocchi[j]) : Math.max(prevSa, blocchi[j].sb || 0)) + blocchi[j].h;
          prevSa = blocchi[j].sa || 0; prima = false; j++;
        }
        if (hg > resta() && !self.inCima) self.nuovaPagina(sez);
      }
      // titoli: restano con almeno due righe del blocco successivo
      if (b.keepNext && blocchi[i + 1]) {
        var nx = blocchi[i + 1];
        var hn = nx.k === 'p' ? Math.min(2, nx._r.length) * nx.lead : nx.h;
        var need = spazioPrima(b) + b.h + Math.max(b.sa || 0, nx.sb || 0) + hn;
        if (need > resta() && !self.inCima) self.nuovaPagina(sez);
      }
      var sp = spazioPrima(b);
      if (b.k === 'p') {
        var righe = b._r.length, fatte = 0;
        while (fatte < righe) {
          var disp = Math.floor((resta() - sp + 1e-6) / b.lead);
          var rimaste = righe - fatte;
          var n;
          if (disp >= rimaste) n = rimaste;
          else if (disp >= 2 && rimaste >= 3) n = disp; // niente righe orfane
          else n = 0;
          if (n === 0) {
            if (self.inCima) n = Math.max(1, Math.min(rimaste, disp)); // non dovrebbe succedere
            else { self.nuovaPagina(sez); sp = fatte === 0 ? (b.sbInCima || 0) : 0; continue; }
          }
          var top = self.y - sp;
          self.disegnaRighe(b, fatte, fatte + n, top);
          self.y = top - n * b.lead;
          fatte += n;
          self.inCima = false;
          if (fatte < righe) { self.nuovaPagina(sez); sp = 0; }
        }
      } else {
        if (b.h + sp > resta() && !self.inCima) { self.nuovaPagina(sez); sp = 0; }
        var t = self.y - sp;
        if (b.k === 'tabella') self.disegnaTabella(b, t);
        else if (b.k === 'parti') self.disegnaParti(b, t);
        else if (b.k === 'osservazioni') self.disegnaOss(b, t);
        else if (b.k === 'firme') {
          if (b.gapLetto) t = self.y - b.gapLetto + 9.1; // dalla riga delle osservazioni
          self.disegnaFirme(b, t);
          // la nota bene segue la linea di firma più bassa
          if (b.gapLinee) { self.y = b._fine - b.gapLinee + 7.9; self.inCima = false; self.prevSa = 0; continue; }
          self.y = b._fine - 9.5; self.inCima = false; self.prevSa = 0; continue;
        }
        if (b.k === 'osservazioni') self.y = b._fine;
        else self.y = t - b.h;
        self.inCima = false;
      }
      self.prevSa = b.sa || 0;
      if (b.k === 'osservazioni') self.prevSa = 0;
    }
  };

  function numeraPagine(sez, metr) {
    var n = sez.pagine.length;
    sez.pagine.forEach(function (pg, i) {
      var t = 'Pag. ' + (i + 1) + ' di ' + n;
      pg.ops.push({ k: 't', x: pg.w / 2 - metr.w(t, false, 10) / 2, y: 30, s: 10, f: 'R', t: t });
    });
  }

  /* dati → pagine con le istruzioni di disegno */
  function componi(dati, metr) {
    var N = normalizza(dati);
    var L = new Layout(metr);
    L.dati = dati;
    var sC = { nome: 'contratto', size: A4, top: 779.89 };
    L.sezione(sC, contratto(N));
    numeraPagine(sC, metr);
    var sA = { nome: 'allegatoA', size: A4, top: 779.89 };
    L.sezione(sA, allegatoA(N));
    numeraPagine(sA, metr);
    var sB = { nome: 'allegatoB', size: [A4[1], A4[0]], pagine: [] };
    L.nuovaPagina(sB);
    var pg = L.pg, cx = pg.w / 2;
    [['ALLEGATO B', 545.28], ['PLANIMETRIA DEI LOCALI CONCESSI IN LOCAZIONE', 524.28]].forEach(function (r) {
      pg.ops.push({ k: 't', x: cx - metr.w(r[0], true, 12) / 2, y: r[1], s: 12, f: 'B', t: r[0] });
    });
    pg.ops.push({ k: 'img', id: 'planimetria', x: 116.072, y: 52, w: 609.744, h: 451.272 });
    numeraPagine(sB, metr);
    var sCc = { nome: 'allegatoC', size: A4, top: 795.89 };
    L.sezione(sCc, allegatoC(N));
    numeraPagine(sCc, metr);
    // ordine come nel modello: contratto, A, C, B
    var ord = sC.pagine.concat(sA.pagine, sCc.pagine, sB.pagine);
    return { pagine: ord, n: N };
  }

  /* ---------------- misure dei font ---------------- */

  function tabellaLib(lista) {
    var t = {};
    lista.forEach(function (g) { Array.from(g[0]).forEach(function (c) { t[c] = g[1]; }); });
    t[NBSP] = t[' '];
    return t;
  }
  var LIB = { R: tabellaLib(LIB_R), B: tabellaLib(LIB_B) };

  function misuratore(fontR, fontB, fontS) {
    var cache = { R: {}, B: {} };
    function cw(ch, bold) {
      var c = cache[bold ? 'B' : 'R'];
      if (c[ch] === undefined) c[ch] = (bold ? fontB : fontR).widthOfTextAtSize(ch, 1000);
      return c[ch];
    }
    return {
      // larghezza reale con i font del PDF (senza crenatura, come viene disegnato)
      w: function (t, bold, size) {
        var s = 0;
        for (var i = 0; i < t.length; i++) s += cw(t[i], bold);
        return s * size / 1000;
      },
      // larghezza secondo le metriche del modello, solo per decidere gli a capo
      wb: function (t, bold, size) {
        var s = 0, tab = LIB[bold ? 'B' : 'R'];
        for (var i = 0; i < t.length; i++) s += tab[t[i]] !== undefined ? tab[t[i]] : cw(t[i], bold);
        return s * size / 1000;
      },
      ws: function (t, size) { return fontS ? fontS.widthOfTextAtSize(t, size) : t.length * size * 0.4; }
    };
  }

  /* ---------------- PDF ---------------- */

  async function creaPdf(dati, lib, assets) {
    var PDFLib = lib.PDFLib, fontkit = lib.fontkit;
    var doc = await PDFLib.PDFDocument.create();
    doc.registerFontkit(fontkit);
    var fR = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    var fB = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var fS = await doc.embedFont(assets.firmaFont, { subset: true });
    var img = await doc.embedJpg(assets.planimetria);
    var metr = misuratore(fR, fB, fS);
    var out = componi(dati, metr);
    var nero = PDFLib.rgb(0, 0, 0);
    out.pagine.forEach(function (pg) {
      var page = doc.addPage([pg.w, pg.h]);
      pg.ops.forEach(function (o) {
        if (o.k === 't') {
          var font = o.f === 'B' ? fB : (o.f === 'S' ? fS : fR);
          var col = o.col ? PDFLib.rgb(o.col[0], o.col[1], o.col[2]) : nero;
          if (o.tw) page.pushOperators(PDFLib.setWordSpacing(o.tw));
          page.drawText(o.t, { x: o.x, y: o.y, size: o.s, font: font, color: col });
          if (o.tw) page.pushOperators(PDFLib.setWordSpacing(0));
        } else if (o.k === 'l') {
          page.drawLine({ start: { x: o.x1, y: o.y1 }, end: { x: o.x2, y: o.y2 }, thickness: o.w, color: nero });
        } else if (o.k === 'box') {
          var x = o.x + 0.9, y = o.y - 0.6, s = 6.5;
          page.drawRectangle({ x: x, y: y, width: s, height: s, borderWidth: 0.55, borderColor: nero });
          if (o.on) {
            page.drawLine({ start: { x: x + 1.1, y: y + 1.1 }, end: { x: x + s - 1.1, y: y + s - 1.1 }, thickness: 0.8, color: nero });
            page.drawLine({ start: { x: x + 1.1, y: y + s - 1.1 }, end: { x: x + s - 1.1, y: y + 1.1 }, thickness: 0.8, color: nero });
          }
        } else if (o.k === 'img') {
          page.drawImage(img, { x: o.x, y: o.y, width: o.w, height: o.h });
        }
      });
    });
    doc.setTitle("Contratto di locazione Ca'Thalia con allegati");
    doc.setAuthor('Ca’Thalia');
    doc.setCreator('Compila contratto Ca’Thalia');
    doc.setProducer('Ca’Thalia');
    doc.setLanguage('it-IT');
    return doc.save();
  }

  /* ---------------- anteprima su canvas ---------------- */

  function disegnaCanvas(ctx, pg, scala, assets) {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, pg.w * scala, pg.h * scala);
    ctx.scale(scala, scala);
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    var Y = function (y) { return pg.h - y; };
    pg.ops.forEach(function (o) {
      if (o.k === 't') {
        if (o.f === 'S') {
          ctx.font = o.s + 'px "Mr Dafoe", cursive';
          ctx.fillStyle = 'rgb(20,38,115)';
        } else {
          ctx.font = (o.f === 'B' ? 'bold ' : '') + o.s + 'px Helvetica, Arial, "Liberation Sans", sans-serif';
          ctx.fillStyle = '#000';
        }
        if (o.tw) {
          // parola per parola, per rispettare la giustificazione
          var x = o.x, parti = o.t.split(' ');
          var m = assets.metr;
          parti.forEach(function (p, i) {
            if (p) ctx.fillText(p, x, Y(o.y));
            x += m.w(p, o.f === 'B', o.s) + m.w(' ', false, o.s) + o.tw;
          });
        } else ctx.fillText(o.t, o.x, Y(o.y));
      } else if (o.k === 'l') {
        ctx.lineWidth = o.w;
        ctx.beginPath(); ctx.moveTo(o.x1, Y(o.y1)); ctx.lineTo(o.x2, Y(o.y2)); ctx.stroke();
      } else if (o.k === 'box') {
        var bx = o.x + 0.9, by = o.y - 0.6, s = 6.5;
        ctx.lineWidth = 0.55;
        ctx.strokeRect(bx, Y(by + s), s, s);
        if (o.on) {
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(bx + 1.1, Y(by + 1.1)); ctx.lineTo(bx + s - 1.1, Y(by + s - 1.1));
          ctx.moveTo(bx + 1.1, Y(by + s - 1.1)); ctx.lineTo(bx + s - 1.1, Y(by + 1.1));
          ctx.stroke();
        }
      } else if (o.k === 'img' && assets.immagine) {
        ctx.drawImage(assets.immagine, o.x, Y(o.y + o.h), o.w, o.h);
      }
    });
    ctx.restore();
  }

  var api = {
    componi: componi, creaPdf: creaPdf, disegnaCanvas: disegnaCanvas, misuratore: misuratore,
    calcola: calcola, inLettere: inLettere, euroInLettere: euroInLettere, euro: euro, data: data,
    giorniTra: giorniTra, pulisci: pulisci, etichette: etichette, LOCALI: LOCALI, CHIAVI: CHIAVI, LOCATORE: LOCATORE
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Cathalia = api;
})(typeof window !== 'undefined' ? window : globalThis);
