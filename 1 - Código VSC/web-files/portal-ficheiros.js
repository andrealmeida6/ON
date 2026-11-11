/* ============================================================================
   portal-ficheiros.js - ficheiros carregados: guardar, abrir e descarregar
   Cada evidencia ou documento guarda o nome e um fid. O conteudo do ficheiro fica
   no IndexedDB do navegador (aguenta ficheiros grandes), separado por ambiente.
   Em producao, o conteudo vai para o armazenamento de documentos (Supabase Storage
   ou SharePoint) e o fid passa a ser o caminho do ficheiro.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal;
  if (!P) return;
  var esc = function (v) { return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var memoria = {};
  var BD = 'esg-ficheiros', LOJA = 'f';
  var abrirBD = function () {
    return new Promise(function (ok, falha) {
      if (!window.indexedDB) return falha(new Error('no IndexedDB'));
      var r = window.indexedDB.open(BD, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(LOJA); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { falha(r.error); };
    });
  };
  var chave = function (fid) { return (P.prefixo || '') + fid; };
  P.novoFid = function () { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  /* Guarda o conteudo e devolve o fid logo (a escrita no IndexedDB termina em segundo plano) */
  P.guardarFicheiro = function (file, fid) {
    if (!file) return null;
    fid = fid || P.novoFid();
    memoria[fid] = file;
    abrirBD().then(function (db) {
      var t = db.transaction(LOJA, 'readwrite');
      t.objectStore(LOJA).put({ nome: file.name, tipo: file.type || '', tamanho: file.size, blob: file }, chave(fid));
    }).catch(function () { /* sem IndexedDB: fica so nesta sessao */ });
    return fid;
  };
  var lerFicheiro = function (fid) {
    if (memoria[fid]) return Promise.resolve({ blob: memoria[fid], nome: memoria[fid].name, tipo: memoria[fid].type });
    return abrirBD().then(function (db) {
      return new Promise(function (ok) {
        var r = db.transaction(LOJA, 'readonly').objectStore(LOJA).get(chave(fid));
        r.onsuccess = function () { ok(r.result || null); };
        r.onerror = function () { ok(null); };
      });
    }).catch(function () { return null; });
  };
  var TIPOS = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', txt: 'text/plain', csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  var NO_BROWSER = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'txt', 'csv'];
  var ext = function (n) { return String(n || '').split('.').pop().toLowerCase(); };
  var aviso = function (t) { var el = document.querySelector('[data-toast]'); if (!el) return window.alert(t); el.textContent = t; el.className = 'ps-toast err'; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { el.hidden = true; }, 4200); };
  /* Abrir: PDF, imagens e texto abrem num separador novo; o resto descarrega-se */
  P.abrirFicheiro = function (fid, nome, descarregar) {
    return lerFicheiro(fid).then(function (r) {
      if (!r) { aviso('The file ' + nome + ' is not stored in this browser. Files are kept in the browser where they were uploaded.'); return false; }
      var tipo = r.tipo || TIPOS[ext(nome)] || 'application/octet-stream', blob = r.blob.type ? r.blob : new Blob([r.blob], { type: tipo });
      var url = URL.createObjectURL(blob);
      if (!descarregar && NO_BROWSER.indexOf(ext(nome)) > -1) {
        var w = window.open(url, '_blank');
        if (!w) descarregar = true;
      }
      if (descarregar || NO_BROWSER.indexOf(ext(nome)) < 0) {
        var a = document.createElement('a'); a.href = url; a.download = nome || r.nome || 'file';
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      return true;
    });
  };
  P.temConteudo = function (ref) { return !!(ref && ref.fid); };
  /* Nome do ficheiro com Open e Download; sem conteudo guardado, so o nome (ficheiros de demonstracao ou antigos) */
  var ICO_ABRIR = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>';
  var ICO_DESC = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><path d="M12 15V3"/></svg>';
  /* Chave de um ficheiro na milestone (evidencia ou documento), para o remover */
  P.chaveFich = function (ref) { return ref.id || ref.fid || (ref.ficheiro + '|' + ref.em); };
  var ICO_X = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/></svg>';
  /* m: a milestone, para mostrar quem carregou e quando e o botao Remove (so enquanto esta em recolha com a pessoa) */
  P.fichHtml = function (ref, extra, m) {
    var nome = ref && (ref.ficheiro || ref.nome) || '', usr = P.sessao ? P.sessao() : null;
    var meta = ref && ref.por ? '<small class="fc-meta" data-fx-ignorar>' + esc(ref.por) + (ref.em ? ', ' + esc(P.fmtDataHora(ref.em)) : '') + '</small>' : '';
    var rem = m && usr && P.podePreencher(m, usr) && ref.origem !== 'grid' ? '<button type="button" class="fc-b fc-rem" data-a="fichRemover" data-v="' + esc(m.id + '|' + P.chaveFich(ref)) + '" aria-label="Remove ' + esc(nome) + '" title="Remove">' + ICO_X + '</button>' : '';
    if (!P.temConteudo(ref)) return '<span class="fc fc-so"><span title="Only the file name was recorded">' + esc(nome) + '</span>' + (extra || '') + meta + rem + '</span>';
    var d = ' data-fich="' + esc(ref.fid) + '" data-fich-n="' + esc(nome) + '"';
    return '<span class="fc"><button type="button" class="fc-n" data-fich-op="abrir"' + d + ' title="Open ' + esc(nome) + '">' + esc(nome) + '</button>' + (extra || '') +
      '<button type="button" class="fc-b" data-fich-op="abrir"' + d + ' aria-label="Open ' + esc(nome) + '" title="Open">' + ICO_ABRIR + '</button>' +
      '<button type="button" class="fc-b" data-fich-op="desc"' + d + ' aria-label="Download ' + esc(nome) + '" title="Download">' + ICO_DESC + '</button>' + rem + meta + '</span>';
  };
  P.fichLista = function (l, m) { return (l || []).map(function (x) { return P.fichHtml(x, '', m); }).join(''); };
  P.apagarConteudo = function (fid) {
    if (!fid) return;
    delete memoria[fid];
    abrirBD().then(function (db) { db.transaction(LOJA, 'readwrite').objectStore(LOJA).delete(chave(fid)); }).catch(function () { /* nada a apagar */ });
  };
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-fich-op]');
    if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    P.abrirFicheiro(b.getAttribute('data-fich'), b.getAttribute('data-fich-n'), b.getAttribute('data-fich-op') === 'desc');
  }, true);
})();
