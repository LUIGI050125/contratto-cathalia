(function () {
  'use strict';
  var E = window.Cathalia;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- memoria del dispositivo ---------- */
  var K_BOZZA = 'cathalia.bozza.v1', K_STORICO = 'cathalia.storico.v1', K_PREF = 'cathalia.preferenze.v1';
  var mem = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  /* ---------- comuni e codice fiscale ---------- */
  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  var COMUNI = { lista: [], codice: {} };
  COMUNI_RAW.split(';').forEach(function (r) {
    var p = r.split('|');
    var o = { c: p[0], n: p[1], p: p[2], attivo: p[3] === '1' };
    o.label = o.p === 'EE' ? o.n : o.n + ' (' + o.p + ')';
    o.key = norm(o.n);
    COMUNI.codice[o.c] = o;
    if (o.attivo) COMUNI.lista.push(o);
  });
  function cercaComuni(q) {
    q = norm(q);
    if (q.length < 2) return [];
    var a = [], b = [];
    for (var i = 0; i < COMUNI.lista.length; i++) {
      var o = COMUNI.lista[i];
      if (o.key.indexOf(q) === 0) a.push(o); else if (b.length < 7 && o.key.indexOf(q) > 0) b.push(o);
    }
    a.sort(function (x, y) { return x.key.length - y.key.length || x.key.localeCompare(y.key); });
    return a.concat(b).slice(0, 7);
  }
  // "casale sul sile" → "Casale sul Sile (TV)" se il nome è proprio quello di un comune
  function completaComune(v) {
    if (!v || /\([A-Z]{2}\)\s*$/.test(v)) return v;
    var k = norm(v), trovati = COMUNI.lista.filter(function (o) { return o.key === k; });
    return trovati.length === 1 ? trovati[0].label : v;
  }

  var MESI = 'ABCDEHLMPRST', OMO = 'LMNPQRSTUV';
  var DISPARI = { 0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21, A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19,
    J: 21, K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23 };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function lettere(s) { return (s || '').toUpperCase().normalize('NFD').replace(/[^A-Z]/g, ''); }
  function codiceCognome(s) {
    var l = lettere(s), c = l.replace(/[AEIOU]/g, ''), v = l.replace(/[^AEIOU]/g, '');
    return (c + v + 'XXX').slice(0, 3);
  }
  function codiceNome(s) {
    var l = lettere(s), c = l.replace(/[AEIOU]/g, ''), v = l.replace(/[^AEIOU]/g, '');
    if (c.length >= 4) return c[0] + c[2] + c[3];
    return (c + v + 'XXX').slice(0, 3);
  }
  function cfPulito(s) { return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function analizzaCF(cf, nome, cognome) {
    cf = cfPulito(cf);
    if (!cf) return null;
    if (cf.length < 16) return { stato: 'corto' };
    if (cf.length > 16 || !/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(cf)) return { stato: 'formato' };
    var s = 0;
    for (var i = 0; i < 15; i++) {
      var ch = cf[i];
      s += i % 2 === 0 ? DISPARI[ch] : (/\d/.test(ch) ? +ch : ch.charCodeAt(0) - 65);
    }
    if (String.fromCharCode(65 + s % 26) !== cf[15]) return { stato: 'controllo' };
    var dec = function (x) { return x.replace(/[LMNPQRSTUV]/g, function (c) { return String(OMO.indexOf(c)); }); };
    var yy = +dec(cf.substr(6, 2)), mm = MESI.indexOf(cf[8]) + 1, dd = +dec(cf.substr(9, 2));
    var sesso = dd > 40 ? 'F' : 'M';
    if (dd > 40) dd -= 40;
    if (dd < 1 || dd > 31) return { stato: 'formato' };
    var anno = 2000 + yy <= new Date().getFullYear() ? 2000 + yy : 1900 + yy;
    var luogo = COMUNI.codice[cf[11] + dec(cf.substr(12, 3))];
    var r = { stato: 'ok', sesso: sesso, data: anno + '-' + pad(mm) + '-' + pad(dd), luogo: luogo ? luogo.label : '' };
    if (cognome && lettere(cognome) && codiceCognome(cognome) !== cf.substr(0, 3)) r.avviso = 'cognome';
    else if (nome && lettere(nome) && codiceNome(nome) !== cf.substr(3, 3)) r.avviso = 'nome';
    return r;
  }

  /* ---------- stato del modulo ---------- */
  function oggi() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function piuGiorni(iso, n) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n));
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function persona() {
    return { nome: '', cognome: '', sesso: '', nascitaLuogo: '', nascitaData: '', cf: '', telefono: '', comune: '', indirizzo: '', civico: '', auto: {} };
  }
  var PREF0 = { pulizie: '110', riscaldamento: '50', ora: '08:00', sopralluogoLocatore: 'Laura Pavan', firmaNome: 'Laura Pavan', firma: true };
  function nuovoStato() {
    var p = Object.assign({}, PREF0, mem.get(K_PREF, {}));
    return {
      id: 'c' + Date.now().toString(36), dataContratto: oggi(), conduttori: [persona()],
      dal: '', al: '', alAuto: true, ora: p.ora,
      locali: { a: false, b: false, c: false, d: false, e: false },
      canone: '', pulizie: p.pulizie, riscaldamento: p.riscaldamento, riscInSaldo: true, riscAuto: true,
      caparra: '', caparraAuto: true, saldo: '', saldoAuto: true,
      pagamento: 'bonifico', pagamentoAltro: '',
      chiavi: { sbarra: true, festin: false, festagranda: false, porcilaia: false }, chiaviAuto: true, chiaviAltro: '',
      sopralluogoData: '', sopralluogoLocatore: p.sopralluogoLocatore, sopralluogoConduttore: '', soprAuto: true,
      temperatura: '', osservazioni: '', accordi: '', firma: p.firma !== false, firmaNome: p.firmaNome
    };
  }
  var S = mem.get(K_BOZZA, null) || nuovoStato();
  if (!S.conduttori || !S.conduttori.length) S.conduttori = [persona()];

  function soldi(v) {
    if (v === null || v === undefined) return '';
    var s = String(v).trim().replace(/\s|€/g, '');
    if (/^\d+\.\d{1,2}$/.test(s)) s = s.replace('.', ',');
    return s;
  }
  function nomeDi(c) { return [c.nome, c.cognome].filter(Boolean).join(' ').trim(); }
  function nomiConduttori() { return S.conduttori.map(nomeDi).filter(Boolean); }
  function elenco(n) { return n.length < 2 ? (n[0] || '') : n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1]; }

  function datiMotore() {
    return {
      dataContratto: S.dataContratto,
      conduttori: S.conduttori.map(function (c) {
        return { nome: c.nome, cognome: c.cognome, sesso: c.sesso, nascitaLuogo: completaComune(c.nascitaLuogo), nascitaData: c.nascitaData,
          cf: cfPulito(c.cf), telefono: c.telefono, comune: completaComune(c.comune), indirizzo: c.indirizzo, civico: c.civico };
      }),
      dal: S.dal, al: S.al, ora: S.ora, locali: S.locali,
      canone: soldi(S.canone), pulizie: soldi(S.pulizie), riscaldamento: soldi(S.riscaldamento), riscInSaldo: S.riscInSaldo,
      caparra: S.caparraAuto ? null : soldi(S.caparra), saldo: S.saldoAuto ? null : soldi(S.saldo),
      pagamento: S.pagamento, pagamentoAltro: S.pagamentoAltro, chiavi: S.chiavi, chiaviAltro: S.chiaviAltro,
      sopralluogoData: S.sopralluogoData, sopralluogoLocatore: S.sopralluogoLocatore,
      sopralluogoConduttore: S.soprAuto ? '' : S.sopralluogoConduttore,
      temperatura: S.temperatura, osservazioni: S.osservazioni, accordi: S.accordi,
      firma: S.firma, firmaNome: S.firmaNome
    };
  }
  function eur(n) { return n === null || n === undefined ? '—' : E.euro(n).replace(/,00$/, '') + ' €'; }

  /* ---------- valori automatici ---------- */
  function aggiornaAutomatici() {
    if (S.alAuto) S.al = S.dal ? piuGiorni(S.dal, 1) : '';
    if (S.riscAuto && S.dal) { var m = +S.dal.slice(5, 7); S.riscInSaldo = m >= 10 || m <= 4; }
    if (S.chiaviAuto) {
      S.chiavi = { sbarra: true, festagranda: !!S.locali.a, festin: !!S.locali.e, porcilaia: !!S.locali.c };
    }
    if (S.soprAuto) S.sopralluogoConduttore = elenco(nomiConduttori());
    var k = E.calcola(datiMotore());
    if (S.caparraAuto) S.caparra = k.caparra === null ? '' : E.euro(k.caparra).replace(/,00$/, '');
    if (S.saldoAuto) S.saldo = k.saldo === null ? '' : E.euro(k.saldo).replace(/,00$/, '');
    return k;
  }

  /* ---------- disegno del modulo ---------- */
  var LOCALI = [
    { k: 'a', n: 'Festa Granda', d: 'Piano terra e primo piano, scoperto davanti', col: 'var(--c-a)' },
    { k: 'b', n: 'Magazzino', d: 'Lato sud, scoperto davanti', col: 'var(--c-b)' },
    { k: 'c', n: 'Porcilaia', d: 'Lato nord, scoperto di lato e dietro', col: 'var(--c-c)' },
    { k: 'd', n: 'Tettoia', d: '', col: 'var(--c-d)' },
    { k: 'e', n: 'Festìn', d: 'Piano terra e primo piano', col: 'var(--c-e)' }
  ];
  var CHIAVI = [
    { k: 'sbarra', n: 'Sbarra ingresso (1)' }, { k: 'festin', n: 'Festìn (1)' },
    { k: 'festagranda', n: 'Festa Granda (4)' }, { k: 'porcilaia', n: 'Porcilaia (1)' }
  ];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function disegnaPersone() {
    var box = $('#persone');
    box.innerHTML = S.conduttori.map(function (c, i) {
      var titolo = S.conduttori.length > 1 ? 'Persona ' + (i + 1) : 'Persona che affitta';
      var f = function (campo, etichetta, extra) {
        extra = extra || {};
        return '<div class="f' + (extra.cls ? ' ' + extra.cls : '') + '"><label for="p' + i + campo + '">' + etichetta + '</label>' +
          '<input type="' + (extra.type || 'text') + '" id="p' + i + campo + '" data-p="' + i + '" data-f="' + campo + '" value="' + esc(c[campo]) + '"' +
          (extra.attr || '') + (c.auto && c.auto[campo] ? ' class="auto"' : '') + '>' + (extra.after || '') + '</div>';
      };
      return '<div class="person" data-i="' + i + '">' +
        '<div class="person-head"><h3>' + titolo + '</h3>' +
        (S.conduttori.length > 1 ? '<button type="button" class="small ghost danger" data-rimuovi="' + i + '">Rimuovi</button>' : '') + '</div>' +
        '<div class="grid">' +
        f('nome', 'Nome', { attr: ' autocapitalize="words"' }) +
        f('cognome', 'Cognome', { attr: ' autocapitalize="words"' }) +
        f('cf', 'Codice fiscale', { cls: 'span2', attr: ' autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="16 lettere e numeri"', after: '<p class="note" id="cfn' + i + '"></p>' }) +
        f('nascitaLuogo', 'Nato/a a', { attr: ' data-ac="1" placeholder="Comune (o Stato estero)"' }) +
        f('nascitaData', 'Data di nascita', { type: 'date' }) +
        '<div class="f"><span class="lbl">Sesso</span><div class="seg" role="group" aria-label="Sesso">' +
        '<button type="button" data-sesso="F" data-p="' + i + '" aria-pressed="' + (c.sesso === 'F') + '">Donna</button>' +
        '<button type="button" data-sesso="M" data-p="' + i + '" aria-pressed="' + (c.sesso === 'M') + '">Uomo</button></div>' +
        '<span class="hint">Serve solo per scrivere "il Conduttore" o "la Conduttrice".</span></div>' +
        f('telefono', 'Telefono (facoltativo)', { type: 'tel', attr: ' inputmode="tel"' }) +
        f('comune', 'Comune di residenza', { attr: ' data-ac="1" placeholder="es. Casale sul Sile"' }) +
        '<div class="grid three span2" style="gap:14px">' +
        f('indirizzo', 'Via / piazza', { attr: ' placeholder="es. via Roma"' }) +
        f('civico', 'Numero civico', { attr: ' inputmode="text"' }) + '</div>' +
        '</div></div>';
    }).join('');
    S.conduttori.forEach(function (c, i) { mostraCF(i); });
    $('#btn-aggiungi').hidden = S.conduttori.length >= 4;
  }

  function mostraCF(i) {
    var c = S.conduttori[i], n = $('#cfn' + i);
    if (!n) return;
    var r = analizzaCF(c.cf, c.nome, c.cognome);
    n.className = 'note';
    if (!r) { n.textContent = ''; return; }
    if (r.stato === 'corto') { n.textContent = 'Mancano ' + (16 - cfPulito(c.cf).length) + ' caratteri.'; n.className = 'note warn'; return; }
    if (r.stato !== 'ok') { n.textContent = 'Il codice fiscale non torna: ricontrolla lettere e numeri.'; n.className = 'note err'; return; }
    var testo = 'Codice fiscale corretto';
    if (r.data) testo += ': ' + (r.sesso === 'F' ? 'nata' : 'nato') + ' il ' + E.data(r.data) + (r.luogo ? ' a ' + r.luogo : '');
    if (r.avviso) {
      n.textContent = 'Il codice è valido ma non corrisponde al ' + r.avviso + ' scritto sopra: controlla di non aver scambiato persona o lettere.';
      n.className = 'note warn';
      return;
    }
    n.textContent = testo + '.';
    n.className = 'note ok';
  }

  // dal codice fiscale ricava data, luogo e sesso (senza toccare ciò che ha scritto lei)
  function applicaCF(i) {
    var c = S.conduttori[i], r = analizzaCF(c.cf, c.nome, c.cognome);
    c.auto = c.auto || {};
    if (!r || r.stato !== 'ok') return;
    var cambia = function (campo, val) {
      if (!val) return;
      if (!c[campo] || c.auto[campo]) {
        c[campo] = val; c.auto[campo] = true;
        var el = $('#p' + i + campo);
        if (el) { el.value = val; el.classList.add('auto'); }
      }
    };
    cambia('nascitaData', r.data);
    cambia('nascitaLuogo', r.luogo);
    if (!c.sesso || c.auto.sesso) {
      c.sesso = r.sesso; c.auto.sesso = true;
      $$('[data-sesso][data-p="' + i + '"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.sesso === c.sesso)); });
    }
  }

  function disegnaLocali() {
    $('#locali').innerHTML = LOCALI.map(function (l) {
      return '<label class="room" style="--dot:' + l.col + '"><input type="checkbox" data-locale="' + l.k + '"' + (S.locali[l.k] ? ' checked' : '') + '>' +
        '<span class="dot" aria-hidden="true"></span><span><b>' + l.k + '. ' + l.n + '</b>' + (l.d ? '<span class="d">' + l.d + '</span>' : '') + '</span></label>';
    }).join('');
  }
  function disegnaChiavi() {
    $('#chiavi').innerHTML = CHIAVI.map(function (c) {
      return '<label class="chip"><input type="checkbox" data-chiave="' + c.k + '"' + (S.chiavi[c.k] ? ' checked' : '') + '> ' + c.n + '</label>';
    }).join('');
  }

  function riempiCampi() {
    $$('[data-k]').forEach(function (el) {
      var k = el.dataset.k, v = S[k];
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.type === 'radio') el.checked = el.value === v;
      else if (document.activeElement !== el) el.value = v == null ? '' : v;
    });
    $('#pagamentoAltro').hidden = S.pagamento !== 'altro';
    ['al', 'caparra', 'saldo', 'sopralluogoConduttore'].forEach(function (k) {
      var auto = { al: S.alAuto, caparra: S.caparraAuto, saldo: S.saldoAuto, sopralluogoConduttore: S.soprAuto }[k];
      $('#' + k).classList.toggle('auto', !!auto && !!S[k]);
    });
  }

  function aggiornaRiepilogo() {
    var k = aggiornaAutomatici();
    riempiCampi();
    var g = k.giorni;
    $('#al-hint').textContent = S.dal && S.al ? 'Durata: ' + (g || 1) + (g === 1 ? ' giorno' : ' giorni') + (S.alAuto ? ' (di solito il giorno dopo)' : '') : '';
    var nota = '';
    if (S.dal && S.al && S.al < S.dal) nota = 'La riconsegna è prima del giorno della festa: controlla le date.';
    else if (S.dal && S.dal < oggi()) nota = 'Il giorno della festa è già passato: controlla l\'anno.';
    else if (k.giorni && k.giorni >= 30) nota = 'Attenzione: il contratto vale solo per meno di 30 giorni.';
    $('#date-note').textContent = nota;
    $('#caparra-hint').innerHTML = S.caparraAuto ? 'Metà del canone.' : 'Modificata a mano. <button type="button" class="link" data-ricalcola="caparra">Ricalcola</button>';
    $('#saldo-hint').innerHTML = S.saldoAuto ? 'Totale meno la caparra.' : 'Modificato a mano. <button type="button" class="link" data-ricalcola="saldo">Ricalcola</button>';
    $('#sopr-hint').innerHTML = S.soprAuto ? 'Preso dai nomi del punto 1.' : '<button type="button" class="link" data-ricalcola="sopr">Usa i nomi del punto 1</button>';
    var righe = [];
    if (k.canone !== null) righe.push(['Canone', eur(k.canone)]);
    if (k.pulizie) righe.push(['Pulizie finali', eur(k.pulizie)]);
    if (S.riscInSaldo && k.risc) righe.push(['Riscaldamento', eur(k.risc)]);
    if (k.totale !== null) righe.push(['Totale', eur(k.totale), 'tot']);
    if (k.caparra !== null) righe.push(['Caparra alla firma', eur(k.caparra)]);
    if (k.saldo !== null) righe.push(['Saldo 15 giorni prima', eur(k.saldo)]);
    if (k.totale !== null && k.caparra !== null && k.saldo !== null && Math.abs(k.caparra + k.saldo - k.totale) > 0.005) {
      righe.push(['Attenzione', 'caparra + saldo = ' + eur(k.caparra + k.saldo) + ', diverso dal totale']);
    }
    $('#sum').innerHTML = righe.map(function (r) {
      return '<div class="row' + (r[2] ? ' ' + r[2] : '') + '"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>';
    }).join('');
    var nomi = nomiConduttori();
    $('#bar-tot').innerHTML = (nomi.length ? '<b>' + esc(elenco(nomi)) + '</b>' : '<b>Nuovo contratto</b>') +
      (k.totale !== null ? '<br>Totale ' + eur(k.totale) + ' · caparra ' + eur(k.caparra) + ' · saldo ' + eur(k.saldo) : '<br>Inserisci il prezzo per vedere i conti');
    salvaBozza();
  }

  var timerBozza;
  function salvaBozza() {
    clearTimeout(timerBozza);
    timerBozza = setTimeout(function () { mem.set(K_BOZZA, S); }, 300);
  }

  function tutto() { disegnaPersone(); disegnaLocali(); disegnaChiavi(); aggiornaRiepilogo(); }

  /* ---------- eventi ---------- */
  var form = $('#form');
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.p !== undefined && el.dataset.f) {
      var i = +el.dataset.p, c = S.conduttori[i], f = el.dataset.f;
      c[f] = el.value;
      if (c.auto) { delete c.auto[f]; el.classList.remove('auto'); }
      if (f === 'cf') {
        var pos = el.selectionStart, up = el.value.toUpperCase();
        if (up !== el.value) { el.value = up; try { el.setSelectionRange(pos, pos); } catch (x) { /* non tutti i campi */ } }
        c.cf = up;
        applicaCF(i);
      }
      if (f === 'cf' || f === 'nome' || f === 'cognome') mostraCF(i);
      if (el.dataset.ac) suggerisci(el);
      aggiornaRiepilogo();
      return;
    }
    if (el.dataset.locale) {
      S.locali[el.dataset.locale] = el.checked;
      aggiornaAutomatici(); disegnaChiavi(); aggiornaRiepilogo();
      return;
    }
    if (el.dataset.chiave) {
      S.chiavi[el.dataset.chiave] = el.checked; S.chiaviAuto = false;
      aggiornaRiepilogo();
      return;
    }
    var k = el.dataset.k;
    if (!k) return;
    if (el.type === 'checkbox') S[k] = el.checked;
    else if (el.type === 'radio') { if (el.checked) S[k] = el.value; }
    else S[k] = el.value;
    if (k === 'al') S.alAuto = !el.value;
    if (k === 'riscInSaldo') S.riscAuto = false;
    if (k === 'caparra') { S.caparraAuto = !el.value; if (S.saldoAuto === true) { /* il saldo segue la caparra */ } }
    if (k === 'saldo') S.saldoAuto = !el.value;
    if (k === 'sopralluogoConduttore') S.soprAuto = false;
    if (k === 'pagamento') $('#pagamentoAltro').hidden = S.pagamento !== 'altro';
    aggiornaRiepilogo();
  });
  form.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.p !== undefined && (el.dataset.f === 'comune' || el.dataset.f === 'nascitaLuogo')) {
      var v = completaComune(el.value);
      if (v !== el.value) { el.value = v; S.conduttori[+el.dataset.p][el.dataset.f] = v; aggiornaRiepilogo(); }
    }
    if (el.dataset.k === 'pagamento' || el.dataset.locale || el.dataset.chiave || el.type === 'checkbox' || el.type === 'date') {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.sesso) {
      var c = S.conduttori[+b.dataset.p];
      c.sesso = b.dataset.sesso; if (c.auto) delete c.auto.sesso;
      $$('[data-sesso][data-p="' + b.dataset.p + '"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      aggiornaRiepilogo();
    } else if (b.dataset.rimuovi !== undefined) {
      S.conduttori.splice(+b.dataset.rimuovi, 1);
      disegnaPersone(); aggiornaRiepilogo();
    } else if (b.dataset.ricalcola) {
      if (b.dataset.ricalcola === 'caparra') S.caparraAuto = true;
      if (b.dataset.ricalcola === 'saldo') S.saldoAuto = true;
      if (b.dataset.ricalcola === 'sopr') S.soprAuto = true;
      aggiornaRiepilogo();
    }
  });
  $('#btn-aggiungi').addEventListener('click', function () {
    S.conduttori.push(persona());
    disegnaPersone(); aggiornaRiepilogo();
    var el = $('#p' + (S.conduttori.length - 1) + 'nome');
    if (el) el.focus();
  });

  /* ---------- suggerimenti dei comuni ---------- */
  var acBox = null, acEl = null, acSel = -1, acRis = [];
  function chiudiAc() { if (acBox) acBox.remove(); acBox = null; acEl = null; acSel = -1; }
  function suggerisci(el) {
    var ris = cercaComuni(el.value);
    if (!ris.length || (ris.length === 1 && ris[0].label === el.value)) { chiudiAc(); return; }
    if (acEl !== el) { chiudiAc(); acEl = el; acBox = document.createElement('div'); acBox.className = 'ac'; acBox.setAttribute('role', 'listbox'); el.parentNode.appendChild(acBox); }
    acRis = ris; acSel = -1;
    acBox.innerHTML = ris.map(function (o, j) { return '<button type="button" role="option" data-j="' + j + '">' + esc(o.label) + '</button>'; }).join('');
  }
  function scegli(j) {
    if (!acEl || !acRis[j]) return;
    var el = acEl, v = acRis[j].label;
    el.value = v;
    S.conduttori[+el.dataset.p][el.dataset.f] = v;
    if (S.conduttori[+el.dataset.p].auto) delete S.conduttori[+el.dataset.p].auto[el.dataset.f];
    chiudiAc();
    aggiornaRiepilogo();
  }
  document.addEventListener('pointerdown', function (e) {
    var o = e.target.closest('.ac button');
    if (o) { e.preventDefault(); scegli(+o.dataset.j); return; }
    if (acBox && !e.target.closest('.ac') && e.target !== acEl) chiudiAc();
  });
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
    if (!acBox || e.target !== acEl) return;
    var bs = $$('button', acBox);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      acSel = (acSel + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length;
      bs.forEach(function (b, j) { b.setAttribute('aria-selected', String(j === acSel)); });
    } else if (e.key === 'Enter') { scegli(acSel >= 0 ? acSel : 0); }
    else if (e.key === 'Escape') chiudiAc();
  });
  form.addEventListener('focusout', function (e) { if (e.target === acEl) setTimeout(function () { if (document.activeElement !== acEl) chiudiAc(); }, 150); });

  /* ---------- PDF ---------- */
  function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  var ASSETS = { firmaFont: b64(ASSET_FIRMA), planimetria: b64(ASSET_PLANIMETRIA) };
  var LIB = function () { return { PDFLib: window.PDFLib, fontkit: window.fontkit }; };
  // dentro Claude il file si salva con la funzione "downloads" della pagina; fuori, con un normale download
  var dentroClaude = !!(window.claude && window.claude.use);
  var DL = null, PERM = null, dlRisposto = false;
  if (dentroClaude) {
    window.claude.use('downloads').then(function (d) { DL = d; dlRisposto = true; }, function () { dlRisposto = true; });
    window.claude.use('permissions').then(function (p) { PERM = p; }, function () {});
  }

  function nomeFile() {
    var cogn = S.conduttori.map(function (c) { return c.cognome || c.nome; }).filter(Boolean)
      .map(function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, ''); }).filter(Boolean);
    var d = E.data(S.dal).replace(/\//g, '-');
    return ['Contratto'].concat(cogn.length ? cogn : ['CaThalia']).concat(d ? [d] : []).join('_') + '.pdf';
  }

  var anteprima = { metr: null, img: null, pronto: null };
  function preparaAnteprima() {
    if (anteprima.pronto) return anteprima.pronto;
    anteprima.pronto = (async function () {
      var L = LIB();
      var doc = await L.PDFLib.PDFDocument.create();
      doc.registerFontkit(L.fontkit);
      var R = await doc.embedFont(L.PDFLib.StandardFonts.Helvetica), B = await doc.embedFont(L.PDFLib.StandardFonts.HelveticaBold);
      var Sf = await doc.embedFont(ASSETS.firmaFont, { subset: true });
      anteprima.metr = E.misuratore(R, B, Sf);
      try {
        var ff = new FontFace('Mr Dafoe', ASSETS.firmaFont.buffer.slice(0));
        await ff.load(); document.fonts.add(ff);
      } catch (e) { /* la firma in anteprima userà un corsivo di sistema */ }
      anteprima.img = await new Promise(function (ok) {
        var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); };
        im.src = 'data:image/jpeg;base64,' + ASSET_PLANIMETRIA;
      });
    })();
    return anteprima.pronto;
  }
  async function disegnaAnteprima() {
    var box = $('#pages');
    try {
      await preparaAnteprima();
      var out = E.componi(datiMotore(), anteprima.metr);
      box.innerHTML = '';
      var nomi = { contratto: 'Contratto', allegatoA: 'Allegato A — Inventario', allegatoC: 'Allegato C — Regolamento', allegatoB: 'Allegato B — Planimetria' };
      var w = Math.min(box.clientWidth || 800, 820), dpr = Math.min(window.devicePixelRatio || 1, 2);
      out.pagine.forEach(function (pg, i) {
        var wrap = document.createElement('div');
        var lab = document.createElement('p'); lab.className = 'lab';
        lab.textContent = 'Pagina ' + (i + 1) + ' di ' + out.pagine.length + ' · ' + nomi[pg.sez];
        var cv = document.createElement('canvas');
        var scala = w / pg.w * dpr;
        cv.width = Math.round(pg.w * scala); cv.height = Math.round(pg.h * scala);
        wrap.appendChild(lab); wrap.appendChild(cv); box.appendChild(wrap);
        E.disegnaCanvas(cv.getContext('2d'), pg, scala, { metr: anteprima.metr, immagine: anteprima.img });
      });
    } catch (e) {
      box.innerHTML = '<p class="note warn">Anteprima non disponibile su questo dispositivo, ma il PDF si può scaricare lo stesso.</p>';
    }
  }

  function controlli() {
    var w = [], k = E.calcola(datiMotore());
    if (!nomiConduttori().length) w.push(['err', 'Manca il nome di chi prende in affitto.']);
    S.conduttori.forEach(function (c, i) {
      var chi = nomeDi(c) || ('persona ' + (i + 1));
      var r = analizzaCF(c.cf, c.nome, c.cognome);
      if (!cfPulito(c.cf)) w.push(['warn', 'Manca il codice fiscale di ' + chi + '.']);
      else if (r && r.stato !== 'ok') w.push(['err', 'Il codice fiscale di ' + chi + ' non è corretto.']);
      else if (r && r.avviso) w.push(['warn', 'Il codice fiscale di ' + chi + ' non corrisponde al ' + r.avviso + '.']);
      if (!c.comune || !c.indirizzo) w.push(['warn', 'Manca la residenza di ' + chi + '.']);
    });
    if (!S.dal) w.push(['err', 'Manca il giorno della festa.']);
    if (!Object.keys(S.locali).some(function (x) { return S.locali[x]; })) w.push(['err', 'Non è segnato nessuno spazio (punto 3).']);
    if (k.canone === null) w.push(['err', 'Manca il prezzo dell\'affitto.']);
    if (S.dal && S.al && S.al < S.dal) w.push(['err', 'La riconsegna è prima della festa.']);
    if (k.totale !== null && k.caparra !== null && k.saldo !== null && Math.abs(k.caparra + k.saldo - k.totale) > 0.005) w.push(['warn', 'Caparra più saldo non fa il totale.']);
    return w;
  }

  function apriControllo() {
    chiudiAc();
    var d = datiMotore(), k = E.calcola(d);
    var w = controlli();
    $('#ov-warn').innerHTML = w.length
      ? '<p class="note ' + (w.some(function (x) { return x[0] === 'err'; }) ? 'err' : 'warn') + '"><b>Da controllare:</b><br>' + w.map(function (x) { return esc(x[1]); }).join('<br>') +
        '<br><span>Puoi scaricare lo stesso: i dati mancanti restano da scrivere a mano.</span></p>'
      : '<p class="note ok">Tutto compilato. Controlla il riepilogo e l\'anteprima, poi scarica.</p>';
    var loc = LOCALI.filter(function (l) { return S.locali[l.k]; }).map(function (l) { return l.n; });
    var ch = CHIAVI.filter(function (c) { return S.chiavi[c.k]; }).map(function (c) { return c.n; });
    if (S.chiaviAltro) ch.push(S.chiaviAltro);
    var lungo = function (iso) {
      if (!iso) return '—';
      var m = iso.split('-'), dt = new Date(Date.UTC(+m[0], +m[1] - 1, +m[2]));
      return dt.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    };
    var conti = [];
    if (k.canone !== null) conti.push('canone ' + eur(k.canone));
    if (k.pulizie) conti.push('pulizie ' + eur(k.pulizie));
    if (S.riscInSaldo && k.risc) conti.push('riscaldamento ' + eur(k.risc));
    var righe = [
      ['Chi affitta', esc(elenco(nomiConduttori()) || '—')],
      ['Festa', esc(lungo(S.dal)) + '<br>riconsegna ' + esc(lungo(S.al)) + (S.ora ? ' alle ' + esc(S.ora.replace(/^0/, '')) : '') + (k.giorni ? ' · ' + k.giorni + (k.giorni === 1 ? ' giorno' : ' giorni') : '')],
      ['Spazi', esc(loc.join(', ') || '—')],
      ['Soldi', esc(conti.join(' + ') || '—') + (k.totale !== null ? ' = <b>' + eur(k.totale) + '</b><br>caparra ' + eur(k.caparra) + ' alla firma, saldo ' + eur(k.saldo) + ' con ' + esc(S.pagamento === 'altro' ? (S.pagamentoAltro || 'altro') : 'bonifico') : '')],
      ['Chiavi', esc(ch.join(', ') || '—')],
      ['Firma', S.firma && S.firmaNome ? 'firmato per il proprietario da ' + esc(S.firmaNome) : 'senza firma (si firma a mano)']
    ];
    $('#ov-recap').innerHTML = righe.map(function (r) { return '<li><b>' + r[0] + '</b><span>' + r[1] + '</span></li>'; }).join('');
    $('#ov-check-file').textContent = 'File: ' + nomeFile() + ' · contratto + allegati A, B, C';
    $('#ov-esito').textContent = ''; $('#ov-esito').className = 'note';
    $('#pages').innerHTML = '<p class="muted">Preparo l\'anteprima…</p>';
    apri('#ov-check');
    preparaPdf();
    setTimeout(disegnaAnteprima, 30);
  }

  function esito(tipo, testo, conBottone) {
    var el = $('#ov-esito');
    el.className = 'note ' + tipo;
    el.textContent = testo;
    if (conBottone) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'small'; b.style.marginTop = '8px'; b.style.display = 'block';
      b.textContent = 'Riattiva il permesso di scaricare';
      b.addEventListener('click', function () {
        PERM.manage().then(function () { esito('warn', 'Fatto. Ora premi di nuovo "Scarica il contratto".'); },
          function () { esito('err', 'Apri il menu ⋯ in alto, poi Permessi, e consenti i download.'); });
      });
      el.appendChild(b);
    }
  }

  var condividiDiretto = !dentroClaude && !!navigator.canShare && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  var ETICHETTA = condividiDiretto ? 'Invia o salva il contratto (PDF)' : 'Scarica il contratto (PDF)';
  $('#btn-scarica').textContent = ETICHETTA;

  // il PDF si prepara mentre lei guarda il riepilogo: così il tocco su "Scarica" salva subito
  var pdfCorrente = null, pdfInCorso = null;
  function preparaPdf() {
    var btn = $('#btn-scarica'), nome = nomeFile();
    pdfCorrente = null;
    btn.disabled = true; btn.textContent = 'Preparo il PDF…';
    var p = pdfInCorso = E.creaPdf(datiMotore(), LIB(), ASSETS).then(function (bytes) {
      if (p !== pdfInCorso) return;
      pdfCorrente = { bytes: bytes, nome: nome };
      btn.disabled = false; btn.textContent = ETICHETTA;
    }, function (e) {
      if (p !== pdfInCorso) return;
      btn.disabled = false; btn.textContent = ETICHETTA;
      esito('err', 'Non riesco a creare il PDF (' + (e && e.message ? e.message : e) + '). Manda uno screenshot di questo messaggio a Luigi.');
    });
  }

  function riuscito(nome, testo) {
    esito('ok', testo || ('Fatto: ' + nome + '. Sul telefono si apre la condivisione (WhatsApp, Mail, Stampa…); sul computer lo trovi nei download.'));
    registraStorico(); ricordaPreferenze();
  }

  function fallito(codice) {
    var finale = function (stato) {
      var negato = stato === 'denied';
      esito('err', (negato
        ? 'Il permesso di scaricare file è stato negato per questa pagina.'
        : 'Il telefono non mi lascia salvare il file.') +
        ' (motivo: ' + codice + (stato ? ', permesso: ' + stato : '') + '). Se non si risolve, manda uno screenshot di questo messaggio a Luigi.',
        negato && PERM);
    };
    if (PERM) PERM.state('downloads').then(finale, function () { finale(''); }); else finale('');
  }

  function salvaInClaude(bytes, nome, tentativo) {
    var data = tentativo === 0 ? new Blob([bytes], { type: 'application/pdf' }) : bytes.slice(0);
    var pr;
    try { pr = DL.save({ filename: nome, data: data }); } catch (e) { pr = Promise.reject(e); }
    pr.then(function () { riuscito(nome); }, function (e) {
      var codice = (e && e.code) || (e && e.message) || String(e);
      if (codice === 'declined') { esito('warn', 'Download annullato. Premi di nuovo quando vuoi.'); return; }
      if (codice === 'rate_limited') { esito('warn', 'C\'è già una richiesta aperta: rispondi a quella, poi riprova.'); return; }
      if (tentativo === 0 && /bad_request|transform_error|unavailable/.test(codice)) { salvaInClaude(bytes, nome, 1); return; }
      fallito(codice);
    });
  }

  function salvaFuoriClaude(bytes, nome) {
    var file = null;
    try { file = new File([bytes], nome, { type: 'application/pdf' }); } catch (e) { /* browser vecchio */ }
    // telefono: apre subito la condivisione (WhatsApp, Mail, Stampa…)
    if (file && condividiDiretto && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: nome }).then(function () { riuscito(nome, 'Fatto. Il contratto è anche in Contratti salvati, se serve rimandarlo.'); }, function (e) {
        if (e && e.name === 'AbortError') esito('warn', 'Condivisione annullata. Premi di nuovo quando vuoi.');
        else scaricaLink(bytes, nome);
      });
      return;
    }
    scaricaLink(bytes, nome);
  }
  function scaricaLink(bytes, nome) {
    var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), a = document.createElement('a');
    a.href = url; a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 60000);
    riuscito(nome, 'Fatto: ' + nome + '. Lo trovi nei download.');
  }

  function scarica() {
    if (!pdfCorrente) return;
    var bytes = pdfCorrente.bytes, nome = pdfCorrente.nome;
    if (!dentroClaude) { salvaFuoriClaude(bytes, nome); return; }
    if (!DL) { fallito(dlRisposto ? 'download non disponibili in questa vista' : 'pagina non ancora pronta, riprova tra qualche secondo'); return; }
    salvaInClaude(bytes, nome, 0);
  }

  /* ---------- contratti salvati ---------- */
  function registraStorico() {
    var st = mem.get(K_STORICO, []).filter(function (x) { return x.id !== S.id; });
    st.unshift({ id: S.id, salvato: new Date().toISOString(), nomi: elenco(nomiConduttori()) || 'Senza nome', dal: S.dal, file: nomeFile(), stato: JSON.parse(JSON.stringify(S)) });
    mem.set(K_STORICO, st.slice(0, 80));
  }
  function ricordaPreferenze() {
    mem.set(K_PREF, { pulizie: S.pulizie, riscaldamento: S.riscaldamento, ora: S.ora, sopralluogoLocatore: S.sopralluogoLocatore, firmaNome: S.firmaNome, firma: S.firma });
  }
  var daEliminare = null;
  function disegnaStorico() {
    var st = mem.get(K_STORICO, []);
    $('#storico').innerHTML = st.length ? st.map(function (x) {
      var conf = daEliminare === x.id;
      return '<div class="item"><div><b>' + esc(x.nomi) + '</b><span>Festa ' + esc(E.data(x.dal) || '—') + ' · scaricato il ' + esc(new Date(x.salvato).toLocaleDateString('it-IT')) + '</span></div>' +
        '<div class="acts">' + (conf
          ? '<button type="button" class="small danger" data-elimina-ok="' + x.id + '">Sì, elimina</button><button type="button" class="small" data-elimina-no="1">No</button>'
          : '<button type="button" class="small primary" data-apri="' + x.id + '">Apri</button><button type="button" class="small" data-duplica="' + x.id + '">Duplica</button><button type="button" class="small ghost danger" data-elimina="' + x.id + '">Elimina</button>') +
        '</div></div>';
    }).join('') : '<p class="muted">Ancora nessun contratto scaricato su questo dispositivo.</p>';
  }
  $('#ov-storico').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var st = mem.get(K_STORICO, []);
    var trova = function (id) { return st.filter(function (x) { return x.id === id; })[0]; };
    if (b.dataset.apri) { var x = trova(b.dataset.apri); if (x) { S = JSON.parse(JSON.stringify(x.stato)); chiudi('#ov-storico'); tutto(); toast('Aperto: ' + x.nomi); } }
    else if (b.dataset.duplica) {
      var y = trova(b.dataset.duplica);
      if (y) {
        S = JSON.parse(JSON.stringify(y.stato));
        S.id = 'c' + Date.now().toString(36); S.dataContratto = oggi(); S.dal = ''; S.al = ''; S.alAuto = true; S.sopralluogoData = '';
        chiudi('#ov-storico'); tutto(); toast('Copia pronta: scegli le nuove date');
        var el = $('#dal'); if (el) el.scrollIntoView({ block: 'center' });
      }
    }
    else if (b.dataset.elimina) { daEliminare = b.dataset.elimina; disegnaStorico(); }
    else if (b.dataset.eliminaNo) { daEliminare = null; disegnaStorico(); }
    else if (b.dataset.eliminaOk) { mem.set(K_STORICO, st.filter(function (x) { return x.id !== b.dataset.eliminaOk; })); daEliminare = null; disegnaStorico(); }
  });

  /* ---------- finestre ---------- */
  var ultimoFocus = null;
  function apri(id) { ultimoFocus = document.activeElement; var o = $(id); o.hidden = false; document.body.style.overflow = 'hidden'; var b = $('button', o); if (b) b.focus(); o.scrollTop = 0; }
  function chiudi(id) { $(id).hidden = true; document.body.style.overflow = ''; if (ultimoFocus && ultimoFocus.focus) ultimoFocus.focus(); }
  $$('.overlay').forEach(function (o) {
    o.addEventListener('click', function (e) { if (e.target === o) chiudi('#' + o.id); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') $$('.overlay').forEach(function (o) { if (!o.hidden) chiudi('#' + o.id); });
  });
  var toastTimer;
  function toast(t) { var el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, 2600); }

  $('#btn-crea').addEventListener('click', apriControllo);
  $('#btn-scarica').addEventListener('click', scarica);
  $('#btn-modifica').addEventListener('click', function () { chiudi('#ov-check'); });
  $('#btn-storico').addEventListener('click', function () { daEliminare = null; disegnaStorico(); apri('#ov-storico'); });
  $('#btn-chiudi-storico').addEventListener('click', function () { chiudi('#ov-storico'); });
  $('#btn-nuovo').addEventListener('click', function () { apri('#ov-nuovo'); });
  $('#btn-nuovo-no').addEventListener('click', function () { chiudi('#ov-nuovo'); });
  $('#btn-nuovo-ok').addEventListener('click', function () {
    S = nuovoStato(); chiudi('#ov-nuovo'); tutto(); window.scrollTo(0, 0); toast('Modulo pronto per un nuovo contratto');
  });

  tutto();
  // prepara font e misure in anticipo, così l'anteprima è rapida
  setTimeout(function () { if (window.PDFLib && window.fontkit) preparaAnteprima().catch(function () {}); }, 800);
  window.__cathalia = { stato: function () { return S; }, analizzaCF: analizzaCF, datiMotore: datiMotore };
})();
