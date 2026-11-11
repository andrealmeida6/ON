/* ==========================================================================
   portal-pesquisa.js - dropdowns com pesquisa

   Um <select class="ps-sel"> com data-pesq, ou com 10 ou mais opcoes, abre
   uma lista com caixa de pesquisa em vez da lista do browser. O <select>
   continua a ser a fonte do valor: ao escolher, muda o valor e dispara o
   evento change, por isso os handlers data-c continuam a funcionar.
   Teclado: setas, Enter para escolher, Esc para fechar. Ignora acentos.
   ========================================================================== */
(function () {
  'use strict';
  var MIN = 10, aberto = null;
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var usa = function (sel) { return sel && sel.tagName === 'SELECT' && sel.classList.contains('ps-sel') && !sel.multiple && !sel.disabled && (sel.hasAttribute('data-pesq') || sel.options.length >= MIN); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var fechar = function (foco) {
    if (!aberto) return;
    var sel = aberto.sel;
    aberto.el.remove(); aberto = null;
    sel.setAttribute('aria-expanded', 'false');
    if (foco && document.body.contains(sel)) sel.focus();
  };
  var escolher = function (v) {
    var sel = aberto.sel;
    fechar(true);
    if (sel.value === v) return;
    sel.value = v;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  };
  var pintar = function () {
    var q = norm(aberto.inp.value).trim(), html = '', grp = null, n = 0;
    aberto.vis = [];
    Array.prototype.forEach.call(aberto.sel.options, function (o) {
      if (o.disabled && !o.value) return;
      var g = o.parentNode.tagName === 'OPTGROUP' ? o.parentNode.label : '';
      if (q && norm(o.text + ' ' + g).indexOf(q) < 0) return;
      if (g !== grp) { grp = g; if (g) html += '<li class="ps-pq-g" role="presentation">' + esc(g) + '</li>'; }
      var i = aberto.vis.length;
      aberto.vis.push(o.value);
      html += '<li id="ps-pq-o' + i + '" role="option" data-i="' + i + '" aria-selected="' + (o.value === aberto.sel.value) + '" class="ps-pq-o' + (i === aberto.at ? ' at' : '') + (o.value === aberto.sel.value ? ' sel' : '') + '">' + esc(o.text) + '</li>';
      n++;
    });
    aberto.lista.innerHTML = n ? html : '<li class="ps-pq-vazio" role="presentation">No results</li>';
    if (aberto.at >= n) aberto.at = n - 1;
    var at = aberto.lista.querySelector('.at');
    aberto.inp.setAttribute('aria-activedescendant', at ? at.id : '');
    if (at) at.scrollIntoView({ block: 'nearest' });
  };
  var abrir = function (sel, txt) {
    fechar(false);
    var r = sel.getBoundingClientRect(), el = document.createElement('div');
    el.className = 'ps-pq';
    var id = 'ps-pq-l' + Date.now();
    el.innerHTML = '<input class="ps-in ps-pq-in" type="text" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="' + id + '" autocomplete="off" placeholder="Search..." aria-label="Search ' + esc(sel.getAttribute('aria-label') || (sel.labels && sel.labels[0] ? sel.labels[0].textContent : 'options')) + '"><ul class="ps-pq-l" role="listbox" id="' + id + '"></ul>';
    var larg = Math.max(r.width, 260), esq = Math.min(r.left, window.innerWidth - larg - 8), baixo = window.innerHeight - r.bottom;
    el.style.left = Math.max(8, esq) + 'px'; el.style.width = larg + 'px';
    if (baixo < 240 && r.top > baixo) { el.style.bottom = (window.innerHeight - r.top + 4) + 'px'; el.classList.add('cima'); } else el.style.top = (r.bottom + 4) + 'px';
    /* Dentro de um <dialog> aberto em modal, a lista tem de ficar no dialog (top layer) para se ver */
    (sel.closest('dialog') || document.body).appendChild(el);
    aberto = { sel: sel, el: el, inp: el.querySelector('input'), lista: el.querySelector('ul'), at: 0, vis: [] };
    var idx = Array.prototype.filter.call(sel.options, function (o) { return !(o.disabled && !o.value); }).map(function (o) { return o.value; }).indexOf(sel.value);
    aberto.at = idx < 0 ? 0 : idx;
    sel.setAttribute('aria-expanded', 'true');
    if (txt) { aberto.inp.value = txt; aberto.at = 0; }
    pintar();
    aberto.inp.focus();
    aberto.inp.addEventListener('input', function () { aberto.at = 0; pintar(); });
    aberto.inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); aberto.at = Math.max(0, Math.min(aberto.vis.length - 1, aberto.at + (ev.key === 'ArrowDown' ? 1 : -1))); pintar(); }
      else if (ev.key === 'Enter') { ev.preventDefault(); if (aberto.vis.length) escolher(aberto.vis[aberto.at]); }
      else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fechar(true); }
      else if (ev.key === 'Tab') fechar(false);
    });
    aberto.lista.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    aberto.lista.addEventListener('click', function (ev) { var li = ev.target.closest('[data-i]'); if (li) escolher(aberto.vis[+li.getAttribute('data-i')]); });
  };

  document.addEventListener('mousedown', function (ev) {
    if (aberto && !aberto.el.contains(ev.target)) { var mesmo = ev.target === aberto.sel; fechar(false); if (mesmo) { ev.preventDefault(); return; } }
    var sel = ev.target.closest && ev.target.closest('select');
    if (ev.button !== 0 || !usa(sel)) return;
    ev.preventDefault();
    sel.focus();
    abrir(sel);
  }, true);
  document.addEventListener('keydown', function (ev) {
    var sel = ev.target;
    if (!usa(sel) || aberto) return;
    if (ev.key === 'Enter' || ev.key === ' ' || (ev.altKey && ev.key === 'ArrowDown') || ev.key === 'F4') { ev.preventDefault(); abrir(sel); }
    else if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault(); abrir(sel, ev.key); }
  }, true);
  var fora = function (ev) { if (aberto && !aberto.el.contains(ev.target)) fechar(false); };
  window.addEventListener('scroll', fora, true);
  window.addEventListener('resize', function () { fechar(false); });
  window.PortalPesquisa = { abrir: abrir, fechar: fechar };
})();
