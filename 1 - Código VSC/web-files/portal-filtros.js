/* ============================================================================
   portal-filtros.js - filtros e ordenacao tipo Excel em todas as tabelas
   Cada coluna de uma tabela .ps-t ganha um botao no cabecalho: ordenar, procurar
   e escolher os valores a mostrar. Os campos de pesquisa das paginas continuam;
   estes filtros aplicam-se ao que a tabela ja mostra.
   O estado fica em memoria por tabela (pagina, bloco, posicao e cabecalhos) e
   volta a aplicar-se sempre que a pagina se redesenha.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal;
  if (!P) return;

  var EST = {};          /* chave -> { fora: {col: {valor: 1}}, ord: {c, d} } */
  var pop = null;        /* { chave, col, q } */
  var VAZIO = '(Blanks)';
  var MOVEL = 820;
  var SEM = ['Actions', ''];
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ICO = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>';
  var ICO_C = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3"/></svg>';

  /* --- Valor de uma celula, como a pessoa o le --------------------------- */
  var texto = function (td) {
    if (!td) return '';
    var sel = td.querySelector('select');
    if (sel && sel.selectedIndex > -1) return sel.options[sel.selectedIndex].text.trim();
    var inp = td.querySelector('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=color])');
    if (inp) return inp.type === 'date' ? (inp.value ? P.fmtDataAno(inp.value) : '') : inp.value.trim();
    /* O texto so para leitores de ecra (.ps-sr) e as notas marcadas com data-fx-ignorar nao contam como valor */
    var cl = td.cloneNode(true);
    [].forEach.call(cl.querySelectorAll('.ps-sr,[data-fx-ignorar]'), function (x) { x.remove(); });
    var t = cl.textContent.replace(/\s+/g, ' ').trim();
    var chk = td.querySelector('input[type=checkbox]');
    if (chk && (!t || t === 'Yes')) return chk.checked ? 'Yes' : 'No';
    return t;
  };
  /* Chave de ordenacao: data dd/mm/aaaa, numero (mesmo com unidade a seguir) ou texto */
  var chaveOrd = function (v) {
    var d = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(v);
    if (d) return { t: 'd', v: Number(d[3] + d[2] + d[1]) };
    var n = /^[-+]?[\d\s.,]*\d/.exec(v);
    if (n) { var x = P.lerNumero(n[0]); if (x !== null) return { t: 'n', v: x }; }
    return { t: 's', v: v.toLowerCase() };
  };
  var comparar = function (a, b) {
    if (a === VAZIO || a === '') return b === VAZIO || b === '' ? 0 : 1;
    if (b === VAZIO || b === '') return -1;
    var x = chaveOrd(a), y = chaveOrd(b);
    if (x.t === y.t && x.t !== 's') return x.v - y.v;
    return String(a).localeCompare(String(b), 'pt', { numeric: true, sensitivity: 'base' });
  };
  var tipoColuna = function (vals) {
    var l = vals.filter(function (v) { return v && v !== VAZIO; });
    if (!l.length) return 's';
    if (l.every(function (v) { return chaveOrd(v).t === 'd'; })) return 'd';
    if (l.every(function (v) { return chaveOrd(v).t === 'n'; })) return 'n';
    return 's';
  };
  var ROT_ORD = { s: ['Sort A to Z', 'Sort Z to A'], n: ['Sort smallest to largest', 'Sort largest to smallest'], d: ['Sort oldest to newest', 'Sort newest to oldest'] };

  /* --- Tabelas ------------------------------------------------------------ */
  var elegivel = function (t) { return t.classList.contains('ps-t') && !t.classList.contains('ps-sem-filtro') && !t.classList.contains('ps-dt-prev-t') && !t.classList.contains('ps-t-calc') && t.tHead && t.tBodies[0]; };
  var cabecalhos = function (t) { var r = t.tHead.rows[t.tHead.rows.length - 1]; return r ? [].slice.call(r.cells) : []; };
  var nomeCol = function (th) { var s = th.querySelector('.fx-nome'); return (s ? s.textContent : th.textContent).replace(/\s+/g, ' ').trim(); };
  var linhas = function (t) { return [].slice.call(t.tBodies[0].rows).filter(function (r) { return !r.classList.contains('fx-vazio'); }); };
  var chaveDe = function (t) {
    var pan = t.closest('[data-painel]'), bl = t.closest('[data-bloco]'), pag = t.closest('[data-pagina]');
    var dono = pan ? 'painel:' + (pan.getAttribute('data-painel-tipo') || '') : (pag ? pag.getAttribute('data-pagina') : '') + ':' + (bl ? bl.getAttribute('data-bloco') : '');
    var raiz = pan || bl || pag || document;
    var irmas = [].slice.call(raiz.querySelectorAll('table.ps-t'));
    return dono + '|' + irmas.indexOf(t) + '|' + cabecalhos(t).map(nomeCol).join('·');
  };
  var est = function (k) { return EST[k] || (EST[k] = { fora: {}, ord: null }); };
  var ativos = function (s) { return Object.keys(s.fora).filter(function (c) { return Object.keys(s.fora[c]).length; }); };
  var valorLinha = function (r, c) { var v = texto(r.cells[c]); return v === '' ? VAZIO : v; };
  var passa = function (r, s, exceto) {
    return Object.keys(s.fora).every(function (c) { return +c === exceto || !s.fora[c][valorLinha(r, +c)]; });
  };
  var tabelaPorChave = function (k) { var l = [].slice.call(document.querySelectorAll('table[data-fx]')); for (var i = 0; i < l.length; i++) if (l[i].getAttribute('data-fx') === k) return l[i]; return null; };

  var preparar = function (t) {
    var ths = cabecalhos(t), rs = linhas(t);
    if (!ths.length || rs.length < 3 && !EST[chaveDe(t)]) return;
    var k = chaveDe(t);
    t.setAttribute('data-fx', k);
    rs.forEach(function (r, i) { r.setAttribute('data-fx-i', i); });
    ths.forEach(function (th, c) {
      var nome = nomeCol(th);
      if (SEM.indexOf(nome) > -1) return;
      th.innerHTML = '<span class="fx-th"><span class="fx-nome">' + th.innerHTML + '</span><button type="button" class="fx-b" data-fx-col="' + c + '" aria-haspopup="dialog" aria-label="Filter and sort ' + esc(nome) + '" title="Filter and sort">' + ICO + '</button></span>';
    });
    var barra = document.createElement('div');
    barra.className = 'fx-bar';
    var alvo = t.closest('.ps-tw') || t;
    alvo.parentNode.insertBefore(barra, alvo);
    aplicar(t);
  };

  var aplicar = function (t) {
    var k = t.getAttribute('data-fx'), s = est(k), rs = linhas(t), tb = t.tBodies[0], vis = 0;
    rs.forEach(function (r) { var ok = passa(r, s, -1); r.classList.toggle('fx-off', !ok); if (ok) vis++; });
    var ord = rs.slice();
    if (s.ord) ord.sort(function (a, b) { var x = comparar(valorLinha(a, s.ord.c), valorLinha(b, s.ord.c)); return (s.ord.d ? -x : x) || a.getAttribute('data-fx-i') - b.getAttribute('data-fx-i'); });
    else ord.sort(function (a, b) { return a.getAttribute('data-fx-i') - b.getAttribute('data-fx-i'); });
    ord.forEach(function (r) { tb.appendChild(r); });
    var v0 = tb.querySelector('.fx-vazio');
    if (!vis && rs.length) {
      if (!v0) { v0 = document.createElement('tr'); v0.className = 'fx-vazio'; v0.innerHTML = '<td colspan="' + cabecalhos(t).length + '">No rows match the filters. <button type="button" class="ps-btn liga" data-fx-limpar="1">Clear filters</button></td>'; tb.appendChild(v0); }
    } else if (v0) v0.remove();
    var ths = cabecalhos(t);
    ths.forEach(function (th, c) { var b = th.querySelector('.fx-b'); if (!b) return; var on = !!(s.fora[c] && Object.keys(s.fora[c]).length), so = s.ord && s.ord.c === c; b.classList.toggle('on', on || so); b.innerHTML = on ? ICO : so ? ICO_C : ICO; });
    var barra = (t.closest('.ps-tw') || t).previousElementSibling;
    if (barra && barra.classList.contains('fx-bar')) {
      var cols = ativos(s), chips = cols.map(function (c) { return '<span class="fx-chip">' + esc(nomeCol(ths[c])) + '<button type="button" data-fx-tirar="' + c + '" aria-label="Remove the filter on ' + esc(nomeCol(ths[c])) + '">×</button></span>'; });
      if (s.ord) chips.push('<span class="fx-chip ord">' + esc(nomeCol(ths[s.ord.c])) + (s.ord.d ? ' ↓' : ' ↑') + '<button type="button" data-fx-tirar-ord="1" aria-label="Remove sorting">×</button></span>');
      barra.classList.toggle('on', !!chips.length);
      barra.innerHTML = '<button type="button" class="fx-mob" data-fx-mob="1">' + ICO + 'Filter and sort' + (chips.length ? ' <b>' + chips.length + '</b>' : '') + '</button>' +
        (chips.length ? '<span class="fx-cont">' + vis + ' of ' + rs.length + ' rows</span>' + chips.join('') + '<button type="button" class="ps-btn liga fx-limpar" data-fx-limpar="1">Clear all</button>' : '');
    }
  };

  /* --- Janela do filtro ---------------------------------------------------- */
  var fecharPop = function () { var el = document.querySelector('.fx-pop'); if (el) el.remove(); var fu = document.querySelector('.fx-fundo'); if (fu) fu.remove(); pop = null; };
  var desenharPop = function (foco) {
    var t = pop && tabelaPorChave(pop.chave);
    if (!t) return fecharPop();
    var s = est(pop.chave), ths = cabecalhos(t), el = document.querySelector('.fx-pop');
    if (!el) { el = document.createElement('div'); el.className = 'fx-pop'; el.setAttribute('role', 'dialog'); document.body.appendChild(el); }
    if (pop.col === null) {
      el.setAttribute('aria-label', 'Filter and sort');
      el.innerHTML = '<div class="fx-pop-h"><b>Filter and sort</b><button type="button" class="fx-x" data-fx-fechar="1" aria-label="Close">×</button></div><div class="fx-cols">' +
        ths.map(function (th, c) { if (!th.querySelector('.fx-b')) return ''; var n = s.fora[c] ? Object.keys(s.fora[c]).length : 0; return '<button type="button" data-fx-escolher="' + c + '"><span>' + esc(nomeCol(th)) + '</span>' + (n || (s.ord && s.ord.c === c) ? '<i>' + (n ? n + ' hidden' : 'sorted') + '</i>' : '') + '<span aria-hidden="true">›</span></button>'; }).join('') + '</div>';
    } else {
      var c = pop.col, rs = linhas(t).filter(function (r) { return passa(r, s, c); }), cont = {};
      linhas(t).forEach(function (r) { var v = valorLinha(r, c); if (!(v in cont)) cont[v] = 0; });
      rs.forEach(function (r) { cont[valorLinha(r, c)]++; });
      var vals = Object.keys(cont).sort(comparar), tp = tipoColuna(vals), fora = s.fora[c] || {}, q = (pop.q || '').toLowerCase();
      var mostrar = vals.filter(function (v) { return !q || v.toLowerCase().indexOf(q) > -1; });
      var todos = mostrar.every(function (v) { return !fora[v]; }), algum = mostrar.some(function (v) { return !fora[v]; });
      var ord = s.ord && s.ord.c === c ? (s.ord.d ? 1 : 0) : -1;
      el.setAttribute('aria-label', 'Filter ' + nomeCol(ths[c]));
      el.innerHTML = '<div class="fx-pop-h">' + (window.innerWidth <= MOVEL ? '<button type="button" class="fx-x" data-fx-voltar="1" aria-label="Back">‹</button>' : '') + '<b>' + esc(nomeCol(ths[c])) + '</b><button type="button" class="fx-x" data-fx-fechar="1" aria-label="Close">×</button></div>' +
        '<div class="fx-ord"><button type="button" class="' + (ord === 0 ? 'on' : '') + '" data-fx-ord="0">' + ICO_C + ROT_ORD[tp][0] + '</button><button type="button" class="' + (ord === 1 ? 'on' : '') + '" data-fx-ord="1">' + ICO_C + ROT_ORD[tp][1] + '</button></div>' +
        '<div class="fx-q"><input type="search" class="ps-in" id="fx-q" placeholder="Search values" aria-label="Search values" autocomplete="off" value="' + esc(pop.q || '') + '"></div>' +
        '<div class="fx-l" role="group" aria-label="Values">' +
        (mostrar.length ? '<label class="fx-v fx-todos"><input type="checkbox" data-fx-todos="1"' + (todos ? ' checked' : '') + (!todos && algum ? ' data-meio="1"' : '') + '><span>' + (q ? 'Select all results' : 'Select all') + '</span></label>' +
          mostrar.map(function (v) { return '<label class="fx-v"><input type="checkbox" data-fx-v="' + esc(v) + '"' + (fora[v] ? '' : ' checked') + '><span>' + esc(v) + '</span><i>' + cont[v] + '</i></label>'; }).join('') : '<p class="fx-nada">No values match.</p>') +
        '</div><div class="fx-pop-p"><button type="button" class="ps-btn peq" data-fx-limpar-col="1"' + (Object.keys(fora).length || ord > -1 ? '' : ' disabled') + '>Clear</button><button type="button" class="ps-btn peq pri" data-fx-fechar="1">Done</button></div>';
      var meio = el.querySelector('[data-meio]'); if (meio) meio.indeterminate = true;
    }
    posicionar(el);
    if (foco) { var f = el.querySelector(foco); if (f) { f.focus(); if (f.setSelectionRange) f.setSelectionRange(f.value.length, f.value.length); } }
  };
  var posicionar = function (el) {
    var movel = window.innerWidth <= MOVEL;
    el.classList.toggle('folha', movel);
    if (movel) {
      el.style.left = el.style.top = '';
      if (!document.querySelector('.fx-fundo')) { var fu = document.createElement('div'); fu.className = 'fx-fundo'; fu.setAttribute('data-fx-fechar', '1'); document.body.insertBefore(fu, el); }
      return;
    }
    var t = tabelaPorChave(pop.chave), b = t && pop.col !== null ? cabecalhos(t)[pop.col].querySelector('.fx-b') : null;
    if (!b) return;
    var r = b.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    var x = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8), y = r.bottom + 6;
    if (y + h > window.innerHeight - 8 && r.top - h - 6 > 8) y = r.top - h - 6;
    el.style.left = x + 'px'; el.style.top = Math.max(8, y) + 'px';
  };
  var mudou = function (foco) { var t = tabelaPorChave(pop.chave); if (t) aplicar(t); desenharPop(foco); };

  /* --- Eventos ------------------------------------------------------------- */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-fx-col],[data-fx-mob],[data-fx-limpar],[data-fx-tirar],[data-fx-tirar-ord],[data-fx-fechar],[data-fx-voltar],[data-fx-escolher],[data-fx-ord],[data-fx-limpar-col]');
    var dentro = ev.target.closest('.fx-pop');
    if (!a) { if (pop && !dentro) fecharPop(); return; }
    ev.preventDefault(); ev.stopPropagation();
    var t = a.closest('table[data-fx]') || (a.closest('.fx-bar') && a.closest('.fx-bar').nextElementSibling && (a.closest('.fx-bar').nextElementSibling.matches('table') ? a.closest('.fx-bar').nextElementSibling : a.closest('.fx-bar').nextElementSibling.querySelector('table[data-fx]')));
    if (a.hasAttribute('data-fx-col')) { var c = +a.getAttribute('data-fx-col'), k = t.getAttribute('data-fx'); if (pop && pop.chave === k && pop.col === c) return fecharPop(); fecharPop(); pop = { chave: k, col: c, q: '' }; desenharPop(window.innerWidth > MOVEL ? '#fx-q' : null); return; }
    if (a.hasAttribute('data-fx-mob')) { fecharPop(); pop = { chave: t.getAttribute('data-fx'), col: null, q: '' }; desenharPop(); return; }
    if (a.hasAttribute('data-fx-limpar') && !dentro) { var s0 = est(t.getAttribute('data-fx')); s0.fora = {}; s0.ord = null; aplicar(t); fecharPop(); return; }
    if (a.hasAttribute('data-fx-tirar')) { delete est(t.getAttribute('data-fx')).fora[a.getAttribute('data-fx-tirar')]; aplicar(t); return; }
    if (a.hasAttribute('data-fx-tirar-ord')) { est(t.getAttribute('data-fx')).ord = null; aplicar(t); return; }
    if (a.hasAttribute('data-fx-fechar')) { var b0 = pop && tabelaPorChave(pop.chave); fecharPop(); if (b0 && a.closest('.fx-pop-p')) { /* volta o foco ao botao da coluna */ } return; }
    if (!pop) return;
    var s = est(pop.chave);
    if (a.hasAttribute('data-fx-voltar')) { pop.col = null; pop.q = ''; desenharPop(); return; }
    if (a.hasAttribute('data-fx-escolher')) { pop.col = +a.getAttribute('data-fx-escolher'); pop.q = ''; desenharPop(); return; }
    if (a.hasAttribute('data-fx-ord')) { var d = a.getAttribute('data-fx-ord') === '1'; s.ord = s.ord && s.ord.c === pop.col && s.ord.d === d ? null : { c: pop.col, d: d }; mudou(); return; }
    if (a.hasAttribute('data-fx-limpar-col')) { delete s.fora[pop.col]; if (s.ord && s.ord.c === pop.col) s.ord = null; pop.q = ''; mudou(); return; }
  }, true);
  document.addEventListener('change', function (ev) {
    if (!pop || !ev.target.closest('.fx-pop')) return;
    var el = ev.target, s = est(pop.chave), f = s.fora[pop.col] || (s.fora[pop.col] = {});
    if (el.hasAttribute('data-fx-v')) { var v = el.getAttribute('data-fx-v'); if (el.checked) delete f[v]; else f[v] = 1; }
    else if (el.hasAttribute('data-fx-todos')) {
      var q = (pop.q || '').toLowerCase();
      [].forEach.call(document.querySelectorAll('.fx-pop [data-fx-v]'), function (x) { var v2 = x.getAttribute('data-fx-v'); if (q && v2.toLowerCase().indexOf(q) < 0) return; if (el.checked) delete f[v2]; else f[v2] = 1; });
    } else return;
    if (!Object.keys(f).length) delete s.fora[pop.col];
    mudou();
  });
  document.addEventListener('input', function (ev) { if (pop && ev.target.id === 'fx-q') { pop.q = ev.target.value; desenharPop('#fx-q'); } });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && pop) { var k = pop.chave, c = pop.col; fecharPop(); var t = tabelaPorChave(k); var b = t && c !== null ? cabecalhos(t)[c].querySelector('.fx-b') : null; if (b) b.focus(); } });
  window.addEventListener('resize', function () { if (pop) { var el = document.querySelector('.fx-pop'); if (el) posicionar(el); } });
  window.addEventListener('scroll', function (ev) { if (pop && window.innerWidth > MOVEL && !(ev.target.closest && ev.target.closest('.fx-pop'))) fecharPop(); }, true);

  /* Chamado no fim de cada desenho da pagina */
  window.PortalFiltros = {
    aplicar: function () {
      [].forEach.call(document.querySelectorAll('table.ps-t'), function (t) { if (!t.hasAttribute('data-fx') && elegivel(t)) preparar(t); });
      if (pop) desenharPop();
    },
    estado: EST
  };
})();
