/* ============================================================================
   portal-grelha.js - grelha de edicao ao estilo do Excel
   Selecao de celulas, teclado, copiar e colar de/para o Excel, anular e barra de formula.
   A pagina descreve as colunas e as linhas e recebe as alteracoes em aoAplicar.
   ============================================================================ */
(function () {
  'use strict';
  var G = (window.PortalGrelha = {});
  var cfgs = {}, estado = {}, scroll = {}, arrastar = null, instalado = false;
  var e = function (v) { return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var letra = function (i) { var s = ''; i++; while (i > 0) { var r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
  var ST = function (id) { return estado[id] || (estado[id] = { r: 0, c: 0, r2: 0, c2: 0, hist: [] }); };
  var cel = function (cfg, r, c) { var l = cfg.linhas[r], k = cfg.cols[c] && cfg.cols[c].k; return l && k ? l.c[k] || {} : {}; };
  var editavel = function (cfg, r, c) { var col = cfg.cols[c]; return !!col && !!col.edita && !cel(cfg, r, c).so; };
  var bruto = function (x) { return x.bruto !== undefined ? x.bruto : x.t !== undefined ? x.t : ''; };
  var limites = function (s) { return { r1: Math.min(s.r, s.r2), r2: Math.max(s.r, s.r2), c1: Math.min(s.c, s.c2), c2: Math.max(s.c, s.c2) }; };

  /* Devolve o HTML. A selecao sobrevive ao redesenho porque vive no modulo. */
  G.html = function (cfg) {
    cfgs[cfg.id] = cfg;
    var s = ST(cfg.id);
    s.r = Math.min(s.r, Math.max(cfg.linhas.length - 1, 0)); s.r2 = Math.min(s.r2, Math.max(cfg.linhas.length - 1, 0));
    if (!cfg.linhas.length) return '<div class="ps-vazio">' + e(cfg.vazio || 'No data.') + '</div>';
    return '<div class="ps-gr" id="' + e(cfg.id) + '" data-grelha="' + e(cfg.id) + '" tabindex="0" role="grid" aria-label="' + e(cfg.titulo || 'Grid') + '" aria-rowcount="' + (cfg.linhas.length + 1) + '" aria-colcount="' + cfg.cols.length + '">' +
      '<div class="ps-gr-barra"><span class="ps-gr-ref" data-gr-ref></span><span class="ps-gr-fx" aria-hidden="true">fx</span><span class="ps-gr-val" data-gr-val></span></div>' +
      '<div class="ps-gr-tw" data-gr-tw><table class="ps-gr-t"><thead><tr><th class="canto" data-gr-canto aria-label="Select all"></th>' + cfg.cols.map(function (c, i) {
        return '<th scope="col" data-gr-col="' + i + '"' + (c.larg ? ' style="min-width:' + c.larg + 'px"' : '') + (c.edita ? ' class="ed"' : '') + '>' + e(c.t) + '</th>';
      }).join('') + '</tr></thead><tbody>' + cfg.linhas.map(function (l, r) {
        return '<tr><th scope="row" data-gr-lin="' + r + '">' + (r + 1) + '</th>' + cfg.cols.map(function (c, i) {
          var x = l.c[c.k] || {}, cl = [c.dir ? 'dir' : '', c.edita && !x.so ? 'ed' : 'so', x.cls || ''].filter(Boolean).join(' ');
          return '<td role="gridcell" data-r="' + r + '" data-c="' + i + '" class="' + cl + '"' + (x.tip ? ' data-tip="' + e(x.tip) + '"' : '') + '>' + (x.html !== undefined ? x.html : e(x.t)) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="ps-gr-rod"><span data-gr-soma></span><span class="ps-gr-dica">' + e(cfg.dica || '') + '</span></div></div>';
  };

  var raiz = function (id) { return document.getElementById(id); };
  var pintar = function (id) {
    var cfg = cfgs[id], el = raiz(id);
    if (!cfg || !el) return;
    var s = ST(id), b = limites(s);
    el.querySelectorAll('td.sel,td.ativa').forEach(function (td) { td.classList.remove('sel', 'ativa'); });
    el.querySelectorAll('thead th.on,tbody th.on').forEach(function (th) { th.classList.remove('on'); });
    var soma = 0, nums = 0, n = 0;
    for (var r = b.r1; r <= b.r2; r++) for (var c = b.c1; c <= b.c2; c++) {
      var td = el.querySelector('td[data-r="' + r + '"][data-c="' + c + '"]');
      if (td) td.classList.add('sel');
      var v = cel(cfg, r, c), q = bruto(v);
      if (q !== '' && q !== null) n++;
      var num = typeof v.num === 'number' ? v.num : null;
      if (num !== null) { soma += num; nums++; }
    }
    for (var i = b.c1; i <= b.c2; i++) { var h = el.querySelector('th[data-gr-col="' + i + '"]'); if (h) h.classList.add('on'); }
    for (var j = b.r1; j <= b.r2; j++) { var h2 = el.querySelector('th[data-gr-lin="' + j + '"]'); if (h2) h2.classList.add('on'); }
    var at = el.querySelector('td[data-r="' + s.r + '"][data-c="' + s.c + '"]');
    if (at) at.classList.add('ativa');
    var x = cel(cfg, s.r, s.c), ref = el.querySelector('[data-gr-ref]'), val = el.querySelector('[data-gr-val]'), sm = el.querySelector('[data-gr-soma]');
    if (ref) ref.textContent = letra(s.c) + (s.r + 1);
    if (val) { val.textContent = bruto(x) === '' ? (x.tip || '') : String(bruto(x)) + (x.tip ? ', ' + x.tip : ''); val.classList.toggle('err', /err/.test(x.cls || '')); }
    if (sm) sm.textContent = n > 1 ? 'Count: ' + n + (nums > 1 ? ', Sum: ' + window.Portal.fmtNum(soma) + ', Average: ' + window.Portal.fmtNum(soma / nums) : '') : '';
    if (at && at.scrollIntoView) { var tw = el.querySelector('[data-gr-tw]'); if (tw) {
      var a = at.getBoundingClientRect(), t = tw.getBoundingClientRect(), hd = el.querySelector('thead').getBoundingClientRect().height, lat = el.querySelector('tbody th').getBoundingClientRect().width;
      if (a.bottom > t.bottom - 12) tw.scrollTop += a.bottom - t.bottom + 12; else if (a.top < t.top + hd) tw.scrollTop -= t.top + hd - a.top;
      if (a.right > t.right - 12) tw.scrollLeft += a.right - t.right + 12; else if (a.left < t.left + lat) tw.scrollLeft -= t.left + lat - a.left;
    } }
  };
  /* Chamadas pela pagina a volta de cada redesenho: mantem a posicao de scroll e repinta a selecao */
  G.antes = function () { document.querySelectorAll('[data-grelha]').forEach(function (el) { var tw = el.querySelector('[data-gr-tw]'); if (tw) scroll[el.id] = [tw.scrollTop, tw.scrollLeft]; }); };
  G.depois = function () { document.querySelectorAll('[data-grelha]').forEach(function (el) { var tw = el.querySelector('[data-gr-tw]'), p = scroll[el.id]; if (tw && p) { tw.scrollTop = p[0]; tw.scrollLeft = p[1]; } pintar(el.id); }); };

  var focar = function (id) { var el = raiz(id); if (el) el.focus({ preventScroll: true }); };
  var mover = function (id, dr, dc, alargar) {
    var cfg = cfgs[id], s = ST(id), nr = cfg.linhas.length - 1, nc = cfg.cols.length - 1;
    if (alargar) { s.r2 = Math.max(0, Math.min(nr, s.r2 + dr)); s.c2 = Math.max(0, Math.min(nc, s.c2 + dc)); }
    else { s.r = Math.max(0, Math.min(nr, s.r + dr)); s.c = Math.max(0, Math.min(nc, s.c + dc)); s.r2 = s.r; s.c2 = s.c; }
    pintar(id);
  };

  /* --- Aplicar, com historico para anular --------------------------------- */
  var aplicar = function (id, lista, origem, semHist) {
    var cfg = cfgs[id], s = ST(id);
    if (!lista.length) return null;
    var antes = lista.map(function (a) { var l = cfg.linhas.filter(function (x) { return x.id === a.id; })[0]; return { id: a.id, k: a.k, valor: l && l.c[a.k] ? bruto(l.c[a.k]) : '' }; });
    var res = cfg.aoAplicar(lista, origem) || {};
    if (!semHist && !res.semAlteracao) { s.hist.push(antes); if (s.hist.length > 50) s.hist.shift(); }
    return res;
  };

  /* --- Edicao de uma celula ----------------------------------------------- */
  var editor = null;
  var abrir = function (id, inicial, porTeclar) {
    var cfg = cfgs[id], s = ST(id);
    if (!editavel(cfg, s.r, s.c)) { if (cfg.aoRecusar) cfg.aoRecusar(); return; }
    var td = raiz(id).querySelector('td[data-r="' + s.r + '"][data-c="' + s.c + '"]');
    if (!td) return;
    var x = cel(cfg, s.r, s.c), i = document.createElement('input');
    i.id = 'gr-ed'; i.className = 'ps-gr-ed'; i.autocomplete = 'off'; i.setAttribute('aria-label', cfg.cols[s.c].t);
    i.value = inicial !== undefined ? inicial : String(bruto(x));
    td.classList.add('editar'); td.innerHTML = ''; td.appendChild(i);
    editor = { id: id, r: s.r, c: s.c, porTeclar: !!porTeclar };
    i.focus({ preventScroll: true });
    i.setSelectionRange(i.value.length, i.value.length);
  };
  var fechar = function (gravar) {
    if (!editor) return;
    var ed = editor, i = document.getElementById('gr-ed'), cfg = cfgs[ed.id], x = cel(cfg, ed.r, ed.c);
    editor = null;
    var novo = i ? i.value : '';
    if (gravar && String(novo) !== String(bruto(x))) aplicar(ed.id, [{ id: cfg.linhas[ed.r].id, k: cfg.cols[ed.c].k, valor: novo }]);
    else if (i) { var td = i.closest('td'); td.classList.remove('editar'); td.innerHTML = x.html !== undefined ? x.html : e(x.t); }
    focar(ed.id); pintar(ed.id);
  };

  /* --- Copiar e colar ------------------------------------------------------ */
  /* Le o texto do Excel: colunas por tab, linhas por paragrafo, celulas com aspas podem ter paragrafos */
  G.lerTSV = function (txt) {
    var linhas = [], l = [], c = '', asp = false, s = String(txt).replace(/\r\n?/g, '\n');
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (asp) { if (ch === '"') { if (s[i + 1] === '"') { c += '"'; i++; } else asp = false; } else c += ch; }
      else if (ch === '"' && c === '') asp = true;
      else if (ch === '\t') { l.push(c); c = ''; }
      else if (ch === '\n') { l.push(c); linhas.push(l); l = []; c = ''; }
      else c += ch;
    }
    if (c !== '' || l.length) { l.push(c); linhas.push(l); }
    return linhas;
  };
  G.paraTSV = function (cfg, b) {
    var o = [];
    for (var r = b.r1; r <= b.r2; r++) { var l = []; for (var c = b.c1; c <= b.c2; c++) { var v = String(bruto(cel(cfg, r, c))); l.push(/[\t\n"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v); } o.push(l.join('\t')); }
    return o.join('\n');
  };
  var colar = function (id, txt) {
    var cfg = cfgs[id], s = ST(id), b = limites(s), m = G.lerTSV(txt);
    if (!m.length) return;
    if (!cfg.cols.some(function (c) { return c.edita; })) { if (cfg.aoRecusar) cfg.aoRecusar(); return; }
    var plano = cfg.aoColar ? cfg.aoColar(m, { r: s.r, c: s.c }) : null, lista = [], ignorados = [];
    if (plano) { lista = plano.lista; ignorados = plano.ignorados || []; }
    else {
      /* Um so valor numa selecao maior preenche a selecao toda, como no Excel */
      var unico = m.length === 1 && m[0].length === 1, fimR = unico ? b.r2 : b.r1 + m.length - 1, fimC = unico ? b.c2 : b.c1 + Math.max.apply(null, m.map(function (l) { return l.length; })) - 1, soLeit = 0, fora = 0;
      for (var r = b.r1; r <= fimR; r++) for (var c = b.c1; c <= fimC; c++) {
        var v = unico ? m[0][0] : (m[r - b.r1] || [])[c - b.c1];
        if (v === undefined) continue;
        if (r >= cfg.linhas.length || c >= cfg.cols.length) { if (v !== '') fora++; continue; }
        if (!editavel(cfg, r, c)) { if (v !== '' && String(v) !== String(bruto(cel(cfg, r, c)))) soLeit++; continue; }
        lista.push({ id: cfg.linhas[r].id, k: cfg.cols[c].k, valor: v });
      }
      if (soLeit) ignorados.push(soLeit + ' cell(s) fall on read-only columns and were left as they are.');
      if (fora) ignorados.push(fora + ' cell(s) fall outside the grid.');
    }
    var res = aplicar(id, lista, 'colar') || {};
    if (cfg.aoColado) cfg.aoColado({ aplicados: res.aplicados === undefined ? lista.length : res.aplicados, recusados: res.recusados || [], ignorados: ignorados });
    focar(id); pintar(id);
  };
  /* Para os testes e para quem queira colar sem o evento do navegador */
  G.colar = colar;

  var noGrid = function () { var a = document.activeElement; return a && a.closest ? a.closest('[data-grelha]') : null; };
  var instalar = function () {
    if (instalado) return;
    instalado = true;
    document.addEventListener('mousedown', function (ev) {
      var alvo = ev.target, root = alvo.closest && alvo.closest('[data-grelha]');
      if (!root) { if (editor) fechar(true); return; }
      if (alvo.id === 'gr-ed') return;
      var id = root.id, s = ST(id), cfg = cfgs[id], td = alvo.closest('td[data-r]'), ch = alvo.closest('th[data-gr-col]'), lh = alvo.closest('th[data-gr-lin]'), ct = alvo.closest('[data-gr-canto]');
      if (!td && !ch && !lh && !ct) return;
      if (editor) { fechar(true); root = raiz(id); cfg = cfgs[id]; }
      ev.preventDefault();
      if (td) {
        var r = +td.getAttribute('data-r'), c = +td.getAttribute('data-c');
        if (ev.shiftKey) { s.r2 = r; s.c2 = c; } else { s.r = r; s.c = c; s.r2 = r; s.c2 = c; }
        arrastar = id;
      } else if (ch) { var i = +ch.getAttribute('data-gr-col'); s.c = i; s.c2 = i; s.r = 0; s.r2 = cfg.linhas.length - 1; }
      else if (lh) { var j = +lh.getAttribute('data-gr-lin'); s.r = j; s.r2 = j; s.c = 0; s.c2 = cfg.cols.length - 1; }
      else { s.r = 0; s.c = 0; s.r2 = cfg.linhas.length - 1; s.c2 = cfg.cols.length - 1; }
      focar(id); pintar(id);
    });
    document.addEventListener('mouseover', function (ev) {
      if (!arrastar) return;
      var td = ev.target.closest && ev.target.closest('td[data-r]');
      if (!td || !td.closest('#' + arrastar)) return;
      var s = ST(arrastar); s.r2 = +td.getAttribute('data-r'); s.c2 = +td.getAttribute('data-c'); pintar(arrastar);
    });
    document.addEventListener('mouseup', function () { arrastar = null; });
    document.addEventListener('dblclick', function (ev) {
      var td = ev.target.closest && ev.target.closest('td[data-r]');
      if (!td) return;
      var root = td.closest('[data-grelha]');
      if (root) abrir(root.id);
    });
    document.addEventListener('keydown', function (ev) {
      if (editor && ev.target && ev.target.id === 'gr-ed') {
        var ed = editor;
        if (ev.key === 'Enter') { ev.preventDefault(); fechar(true); mover(ed.id, ev.shiftKey ? -1 : 1, 0); }
        else if (ev.key === 'Tab') { ev.preventDefault(); fechar(true); mover(ed.id, 0, ev.shiftKey ? -1 : 1); }
        else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fechar(false); }
        else if (ed.porTeclar && /^Arrow/.test(ev.key)) { ev.preventDefault(); fechar(true); mover(ed.id, ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowUp' ? -1 : 0, ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0); }
        return;
      }
      var root = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-grelha') ? ev.target : null;
      if (!root) return;
      var id = root.id, s = ST(id), cfg = cfgs[id], ctrl = ev.ctrlKey || ev.metaKey, k = ev.key;
      if (k === 'ArrowDown') { ev.preventDefault(); mover(id, 1, 0, ev.shiftKey); }
      else if (k === 'ArrowUp') { ev.preventDefault(); mover(id, -1, 0, ev.shiftKey); }
      else if (k === 'ArrowRight') { ev.preventDefault(); mover(id, 0, 1, ev.shiftKey); }
      else if (k === 'ArrowLeft') { ev.preventDefault(); mover(id, 0, -1, ev.shiftKey); }
      else if (k === 'Tab') { ev.preventDefault(); mover(id, 0, ev.shiftKey ? -1 : 1); }
      else if (k === 'Enter') { ev.preventDefault(); mover(id, ev.shiftKey ? -1 : 1, 0); }
      else if (k === 'F2') { ev.preventDefault(); abrir(id); }
      else if (k === 'Delete' || k === 'Backspace') {
        ev.preventDefault();
        var b = limites(s), l = [];
        for (var r = b.r1; r <= b.r2; r++) for (var c = b.c1; c <= b.c2; c++) if (editavel(cfg, r, c) && bruto(cel(cfg, r, c)) !== '') l.push({ id: cfg.linhas[r].id, k: cfg.cols[c].k, valor: '' });
        aplicar(id, l); focar(id); pintar(id);
      } else if (ctrl && k.toLowerCase() === 'a') { ev.preventDefault(); s.r = 0; s.c = 0; s.r2 = cfg.linhas.length - 1; s.c2 = cfg.cols.length - 1; pintar(id); }
      else if (ctrl && k.toLowerCase() === 'z') {
        ev.preventDefault();
        var h = s.hist.pop();
        if (h) { aplicar(id, h, 'anular', true); focar(id); pintar(id); if (cfg.aoAnular) cfg.aoAnular(h.length); }
      } else if (!ctrl && !ev.altKey && k.length === 1) { ev.preventDefault(); abrir(id, k, true); }
    });
    document.addEventListener('copy', function (ev) {
      var root = noGrid();
      if (!root || editor) return;
      ev.preventDefault();
      ev.clipboardData.setData('text/plain', G.paraTSV(cfgs[root.id], limites(ST(root.id))));
      var cfg = cfgs[root.id]; if (cfg.aoCopiar) cfg.aoCopiar();
    });
    document.addEventListener('paste', function (ev) {
      var root = noGrid();
      if (!root) return;
      var txt = ev.clipboardData ? ev.clipboardData.getData('text/plain') : '';
      /* Dentro do editor, um valor simples entra no campo. Um bloco do Excel vai para a grelha. */
      if (editor && !/[\t\n]/.test(txt.replace(/\r?\n$/, ''))) return;
      ev.preventDefault();
      if (editor) fechar(false);
      colar(root.id, txt);
    });
  };
  G.instalar = instalar;
})();
