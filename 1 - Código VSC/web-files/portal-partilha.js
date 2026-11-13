/* ============================================================================
   portal-partilha.js - ambiente de testes partilhado no Supabase
   Sem login: continua a escolher-se o perfil ("impersonate"). O estado do ambiente
   de testes (as mesmas partes que o navegador guarda) fica tambem na tabela
   esg_teste_estado, e os ficheiros carregados em esg_teste_ficheiros, para quem
   abrir o mesmo link ver o mesmo. O ambiente principal continua so no navegador.
   Se as tabelas nao existirem ou a rede falhar, funciona como antes (so no navegador).
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, CFG = window.PORTAL_PARTILHA;
  if (!P || !CFG || !CFG.url || !CFG.chave || !P.teste() || P.online()) return;
  var ESTADO = 'esg_teste_estado', FICH = 'esg_teste_ficheiros', MAX = 6000000;
  var H = { apikey: CFG.chave, Authorization: 'Bearer ' + CFG.chave, 'Content-Type': 'application/json' };
  var api = function (caminho, op) {
    op = op || {};
    return fetch(CFG.url + '/rest/v1/' + caminho, { method: op.method || 'GET', headers: Object.assign({}, H, op.headers || {}), body: op.body })
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { var e = new Error('Supabase ' + r.status); e.status = r.status; e.txt = t; throw e; });
        return r.status === 204 ? null : r.text().then(function (t) { return t ? JSON.parse(t) : null; });
      });
  };
  var chaves = function () { var l = Object.keys(P.CHAVES).map(function (n) { return P.CHAVES[n]; }); l.push('esg_versao'); return l; };
  var porChave = function () { var o = {}; Object.keys(P.CHAVES).forEach(function (n) { o[P.CHAVES[n]] = n; }); return o; };
  /* So devolve texto JSON valido: uma parte estragada (por exemplo "undefined") e ignorada em vez de parar o envio de todas */
  var lerLocal = function (k) { try { var v = localStorage.getItem(P.prefixo + k); if (v === null || v === 'undefined') return null; JSON.parse(v); return v; } catch (e) { return null; } };
  var gravarLocal = function (k, v) { try { localStorage.setItem(P.prefixo + k, v); } catch (e) { /* sem armazenamento */ } };
  var enviado = {}, ultimo = '', tEnviar = null, aEnviar = false, ativo = false, pendente = false;
  /* Impressao digital do que ja esta no Supabase, guardada no navegador: ao abrir, uma parte local diferente
     da ultima enviada tem alteracoes por enviar (por exemplo, recarregou-se antes do envio) e nao e substituida */
  var ASSIN = 'esg_partilha_enviado';
  var hash = function (t) { var h = 5381, i = t.length; while (i) h = (h * 33) ^ t.charCodeAt(--i); return (h >>> 0).toString(36) + '.' + t.length; };
  var assin = (function () { try { return JSON.parse(localStorage.getItem(P.prefixo + ASSIN) || '{}') || {}; } catch (e) { return {}; } })();
  var marcarEnviado = function (k, v) { enviado[k] = v; assin[k] = hash(v); try { localStorage.setItem(P.prefixo + ASSIN, JSON.stringify(assin)); } catch (e) { /* sem armazenamento */ } };
  var est = P.partilha = { estado: 'a ligar', erro: '', em: null };

  /* Etiqueta "Test environment" no cabecalho: diz se esta partilhado */
  var mostrar = function () {
    document.querySelectorAll('[data-teste-tag]').forEach(function (t) {
      t.textContent = est.estado === 'ligado' ? 'Test environment, shared' : est.estado === 'erro' ? 'Test environment, not shared' : 'Test environment';
      t.title = est.estado === 'ligado' ? 'Saved online: everyone with this link sees the same.' + (est.em ? ' Last saved ' + P.fmtDataHora(est.em) + '.' : '') : est.estado === 'erro' ? 'Could not reach the shared database (' + est.erro + '). Changes stay in this browser.' : '';
      t.classList.toggle('erro', est.estado === 'erro');
    });
  };
  var maxHora = function (rows) { (rows || []).forEach(function (r) { if (r.atualizado_em && r.atualizado_em > ultimo) ultimo = r.atualizado_em; }); };

  /* Antes de arrancar: traz o estado partilhado para o navegador */
  P.antesIniciar = function () {
    return api(ESTADO + '?select=chave,valor,atualizado_em&order=atualizado_em.asc').then(function (rows) {
      ativo = true; est.estado = 'ligado';
      if (rows && rows.length) {
        rows.forEach(function (r) {
          var v = JSON.stringify(r.valor), loc = lerLocal(r.chave);
          if (loc !== null && loc !== v && assin[r.chave] && hash(loc) !== assin[r.chave]) { enviado[r.chave] = v; pendente = true; return; }
          gravarLocal(r.chave, v); marcarEnviado(r.chave, v);
        });
        maxHora(rows);
      } else est.vazio = true;
    }).catch(function (x) { est.estado = 'erro'; est.erro = x.status === 404 ? 'tables not created yet' : x.message; });
  };

  /* Envia as partes que mudaram, pouco depois de cada gravacao */
  var enviar = function () {
    tEnviar = null;
    if (!ativo || aEnviar) { if (ativo) tEnviar = setTimeout(enviar, 600); return; }
    var usr = P.sessao ? P.sessao() : null, linhas = [];
    chaves().forEach(function (k) { var v = lerLocal(k); if (v === null || enviado[k] === v) return; linhas.push({ chave: k, valor: JSON.parse(v), atualizado_por: usr ? usr.nome : null, _v: v }); });
    if (!linhas.length) return;
    aEnviar = true;
    api(ESTADO + '?on_conflict=chave', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(linhas.map(function (l) { return { chave: l.chave, valor: l.valor, atualizado_por: l.atualizado_por }; })) })
      .then(function (rows) { linhas.forEach(function (l) { marcarEnviado(l.chave, l._v); }); maxHora(rows); est.estado = 'ligado'; est.em = new Date().toISOString(); aEnviar = false; mostrar(); })
      .catch(function (x) { aEnviar = false; est.estado = 'erro'; est.erro = x.message; mostrar(); });
  };
  var agendar = function () { clearTimeout(tEnviar); tEnviar = setTimeout(enviar, 700); };
  var antes = P.aoGuardar;
  P.aoGuardar = function () { if (antes) antes(); agendar(); };

  /* O que os outros gravaram: ao voltar a esta janela e de 15 em 15 segundos */
  var atualizar = function () {
    if (!ativo || aEnviar || tEnviar || document.hidden) return;
    api(ESTADO + '?select=chave,valor,atualizado_em,atualizado_por&atualizado_em=gt.' + encodeURIComponent(ultimo || '1970-01-01T00:00:00Z') + '&order=atualizado_em.asc').then(function (rows) {
      if (!rows || !rows.length || aEnviar || tEnviar) return;
      var mapa = porChave(), mudou = false;
      rows.forEach(function (r) {
        var v = JSON.stringify(r.valor);
        if (enviado[r.chave] === v) return;
        gravarLocal(r.chave, v); marcarEnviado(r.chave, v);
        if (mapa[r.chave]) { P.S[mapa[r.chave]] = r.valor; mudou = true; }
      });
      maxHora(rows);
      if (mudou && P.migrarDados) P.migrarDados();
      if (mudou && P.render) { P.render(); var quem = rows[rows.length - 1].atualizado_por; if (quem && P.ext && P.ext.toast) P.ext.toast('Updated with changes from ' + quem + '.', 'ok'); }
    }).catch(function () { /* tenta outra vez na proxima volta */ });
  };
  setInterval(atualizar, 15000);
  window.addEventListener('focus', atualizar);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) atualizar(); });

  /* Ficheiros carregados: tambem ficam partilhados (ate 6 MB cada) */
  var paraBase64 = function (file) { return new Promise(function (ok, falha) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = function () { falha(r.error); }; r.readAsDataURL(file); }); };
  P.ficheiroRemoto = {
    gravar: function (fid, file) {
      if (!ativo || !file) return;
      if (file.size > MAX) { if (P.ext && P.ext.toast) P.ext.toast(file.name + ' is over 6 MB: it stays only in this browser.', 'err'); return; }
      var usr = P.sessao ? P.sessao() : null;
      paraBase64(file).then(function (b64) {
        return api(FICH + '?on_conflict=fid', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ fid: fid, nome: file.name, tipo: file.type || '', tamanho: file.size, dados: b64, criado_por: usr ? usr.nome : null }) });
      }).catch(function (x) { est.estado = 'erro'; est.erro = x.message; mostrar(); });
    },
    ler: function (fid) {
      if (!ativo) return Promise.resolve(null);
      return api(FICH + '?fid=eq.' + encodeURIComponent(fid) + '&select=nome,tipo,dados').then(function (rows) {
        var r = rows && rows[0];
        if (!r) return null;
        var bin = atob(r.dados), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return { blob: new Blob([u8], { type: r.tipo || 'application/octet-stream' }), nome: r.nome, tipo: r.tipo };
      }).catch(function () { return null; });
    },
    apagar: function (fid) { if (ativo && fid) api(FICH + '?fid=eq.' + encodeURIComponent(fid), { method: 'DELETE' }).catch(function () { /* fica no Supabase */ }); }
  };

  /* Depois de arrancar: se a base partilhada estava vazia, envia o ambiente semeado neste navegador */
  P.depoisIniciar = function () { mostrar(); if (ativo && (est.vazio || pendente)) { est.vazio = false; pendente = false; agendar(); } };
  /* Ao fechar ou recarregar com alteracoes por enviar: envia ja, com keepalive (cada parte ate 60 KB) */
  window.addEventListener('pagehide', function () {
    if (!ativo) return;
    var usr = P.sessao ? P.sessao() : null;
    chaves().forEach(function (k) {
      var v = lerLocal(k);
      if (v === null || enviado[k] === v || v.length > 60000) return;
      try { fetch(CFG.url + '/rest/v1/' + ESTADO + '?on_conflict=chave', { method: 'POST', keepalive: true, headers: Object.assign({}, H, { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify([{ chave: k, valor: JSON.parse(v), atualizado_por: usr ? usr.nome : null }]) }); } catch (e) { /* fica para a proxima abertura */ }
    });
  });
})();
