/* ============================================================================
   portal-folhas.js - preencher um ficheiro pedido diretamente na plataforma
   Cada ficheiro pedido da milestone tem uma folha com as colunas de que os
   indicadores precisam: uma linha por mes, uma coluna por campo das fontes.
   A folha pode ser puxada da base de dados, colada do Excel ou importada de um
   .xlsx, e cada celula guarda a origem. Ao entregar, gera o ficheiro do pedido,
   regista o evento e envia os totais para os calculos e para os indicadores.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S, X = P.ext;
  var A = X.A, U = X.U, e = X.e, chip = X.chip, toast = X.toast, R = X.R, u = X.u;
  var CAMPOS = P.CAMPOS_FONTE, DBS = P.BASES_DADOS;
  var MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var AGREG = { soma: 'Sum', media: 'Average', ultimo: 'Latest value' };
  /* Bases de dados que cada unidade de negocio normalmente extrai para o seu ficheiro */
  var BASES_UNIDADE = {
    'Operações': ['tele'], 'Qualidade e Laboratório': ['lab'], 'Comercial e Relação com o Cliente': ['com'], 'Ambiente, Saúde e Segurança': ['amb'],
    'Recursos Humanos': ['rh'], 'Financeira': ['erp'], 'Jurídico e Compliance': ['rh'], 'Compras': ['erp'], 'Frota': ['erp'],
    'Sistemas de Informação': ['com'], 'I&D, CSR e ESG': ['com']
  };

  /* --- Modelo ---------------------------------------------------------------- */
  var unidade = function (f) { if (f.un) return f.un; var c = P.cat(f.ind); return c ? c.unidade_medida : ''; };
  /* Linhas da folha: meses, trimestres ou o ano, conforme a granularidade do tipo de dados, dentro do periodo da milestone */
  var periodos = function (m, ped) {
    var g = (ped && ped.granularidade) || 'mensal', tri = P.trimestral(m) ? P.periodo(m.periodo).t : 0;
    var l = MESES.map(function (n, i) { return { k: m.ano + '-' + (i < 9 ? '0' : '') + (i + 1), t: n + ' ' + m.ano, i: i, meses: [i] }; });
    if (g === 'trimestral') l = [1, 2, 3, 4].map(function (t) { var i = t * 3 - 1; return { k: m.ano + '-' + (i < 9 ? '0' : '') + (i + 1), t: 'T' + t + ' ' + m.ano, i: i, meses: [i - 2, i - 1, i], agr: 1 }; });
    if (g === 'anual') l = [{ k: m.ano + '-12', t: 'Ano ' + m.ano, i: 11, meses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], agr: 1 }];
    if (tri) l = l.filter(function (p) { return p.meses.some(function (i) { return Math.floor(i / 3) === tri - 1; }); });
    return l;
  };
  /* Meses obrigatorios: todos para somas e medias, o fim de cada trimestre para os ultimos valores */
  var obrigatorio = function (f, i, agr) { return agr || f.agreg !== 'ultimo' ? true : i % 3 === 2; };
  P.colunasFolha = function (m, pedido) {
    if (!pedido || pedido.indicador) return [];
    var ks = P.camposMilestone(m), dbs = pedido.proprio ? null : BASES_UNIDADE[m.unidade], sel;
    /* Colunas fixadas no tipo de dados (Backoffice); sem elas, as que os indicadores da milestone usam */
    if (pedido.colunas && pedido.colunas.length) sel = pedido.colunas.filter(function (k) { return CAMPOS[k]; });
    else {
      sel = dbs ? ks.filter(function (k) { return dbs.indexOf(CAMPOS[k].db) > -1; }) : [];
      if (!sel.length) sel = ks;
    }
    return sel.map(function (k) {
      var f = CAMPOS[k];
      return { k: k, rot: f.rot, un: unidade(f), db: f.db, tab: f.tab, agreg: f.agreg, usa: m.indicadores.filter(function (id) { var x = P.expressaoDe(id); return x && P.camposDaFormula(x).indexOf(k) > -1; }) };
    });
  };
  var folha = function (m, pid) { m.folhas = m.folhas || {}; return m.folhas[pid] || (m.folhas[pid] = { cel: {}, ref: {}, org: {}, db: {} }); };
  var temFolha = function (m, pid) { return !!(m.folhas && m.folhas[pid] && Object.keys(m.folhas[pid].cel).length); };
  var num = function (v) { return v === null || v === undefined ? '' : P.fmtNum(v, Math.abs(v) < 10 ? 3 : 2); };
  var bruNum = function (v) { return v === null || v === undefined ? '' : String(Math.round(v * 10000) / 10000).replace('.', ','); };
  var validar = function (col, v) {
    if (v === null) return '';
    if (v < 0) return 'Negative values are not accepted.';
    if (col.un === '%' && v > 100) return 'A percentage cannot be above 100.';
    return '';
  };
  var total = function (col, valores) {
    var l = valores.filter(function (v) { return v !== null && v !== undefined; });
    if (!l.length) return null;
    if (col.agreg === 'ultimo') return l[l.length - 1];
    var s = l.reduce(function (a, b) { return a + b; }, 0);
    return col.agreg === 'media' ? s / l.length : s;
  };
  /* Estado da folha: celulas preenchidas, em falta, com erro e totais por coluna */
  P.estadoFolha = function (m, pedido) {
    var cols = P.colunasFolha(m, pedido), f = (m.folhas || {})[pedido.id] || { cel: {}, org: {}, db: {} }, pers = periodos(m, pedido);
    var r = { cols: cols, total: 0, cheias: 0, faltam: 0, erros: 0, daBase: 0, editadas: 0, difere: 0, totais: {} };
    cols.forEach(function (c) {
      var vals = pers.map(function (p) {
        var ch = p.k + '|' + c.k, v = f.cel[ch] === undefined ? null : f.cel[ch], req = obrigatorio(c, p.i, p.agr);
        if (req) r.total++;
        if (v !== null) { r.cheias++; if (validar(c, v)) r.erros++; if (f.org[ch] === 'db') r.daBase++; else r.editadas++; if (f.db[ch] !== undefined && f.org[ch] !== 'db' && Math.abs(f.db[ch] - v) > 1e-9) r.difere++; }
        else if (req) r.faltam++;
        return v;
      });
      r.totais[c.k] = total(c, vals);
    });
    r.pronta = cols.length > 0 && !r.faltam && !r.erros;
    return r;
  };

  /* --- Alteracoes -------------------------------------------------------------- */
  var podeEditar = function (m) { return P.podePreencher(m, u()); };
  var gravarCelula = function (m, pid, cols, per, k, bruto, origem) {
    var f = folha(m, pid), ch = per + '|' + k;
    if (k === 'ref') { var t = String(bruto || '').trim(); if ((f.ref[per] || '') === t) return 0; if (t) f.ref[per] = t; else delete f.ref[per]; return 1; }
    var col = cols.filter(function (c) { return c.k === k; })[0];
    if (!col) return 0;
    var s = P.limparColado(bruto), v = s === '' ? null : P.lerNumero(s);
    if (s !== '' && v === null) return -1;
    var antes = f.cel[ch] === undefined ? null : f.cel[ch];
    if (antes === v && (v === null || f.org[ch] === origem)) return 0;
    if (v === null) { delete f.cel[ch]; delete f.org[ch]; } else { f.cel[ch] = v; f.org[ch] = origem; }
    return 1;
  };
  var aplicar = function (m, pid, lista, origem) {
    if (!podeEditar(m)) return { aplicados: 0, recusados: ['This milestone is read only for you right now.'], semAlteracao: true };
    var ped = pedidoDe(m, pid), cols = P.colunasFolha(m, ped), n = 0, rec = [];
    lista.forEach(function (a) {
      var r = gravarCelula(m, pid, cols, a.id, a.k, a.valor, origem === 'colar' ? 'excel' : origem === 'importar' ? 'excel' : 'manual');
      if (r < 0) rec.push(a.id + ', ' + a.k + ': "' + a.valor + '" is not a number.'); else n += r;
    });
    if (n) { folha(m, pid).em = new Date().toISOString(); folha(m, pid).por = u().nome; P.guardar(); }
    R();
    return { aplicados: n, recusados: rec, semAlteracao: !n };
  };
  var pedidoDe = function (m, pid) { return P.ficheirosPedidos(m).filter(function (x) { return x.id === pid; })[0]; };

  /* Puxar da base de dados: preenche as celulas vazias e as que vieram da base. As editadas ficam, salvo se pedir para substituir. */
  P.puxarFolha = function (m, pid, substituir) {
    if (!podeEditar(m)) return { erro: 'You can only pull data while the milestone is in collection with you.' };
    var ped = pedidoDe(m, pid), cols = P.colunasFolha(m, ped), f = folha(m, pid), n = 0, mantidas = 0, regs = 0, bases = {};
    var linhasF = periodos(m, ped);
    cols.forEach(function (c) {
      var reg = P.registosCampo(c.k, m), porMes = {};
      bases[DBS[c.db] + ' (' + c.tab + ')'] = 1;
      reg.forEach(function (x) { var q = /-Q(\d)$/.exec(x.periodo), mes = q ? q[1] * 3 - 1 : parseInt(x.periodo.slice(5), 10) - 1; porMes[mes] = x; });
      /* Cada linha junta os registos dos seus meses com a regra do campo */
      var l = linhasF.map(function (p) {
        var xs = p.meses.filter(function (i) { return porMes[i]; }).map(function (i) { return porMes[i]; });
        if (!xs.length) return null;
        var v = c.agreg === 'ultimo' ? xs[xs.length - 1].valor : xs.reduce(function (a, x) { return a + x.valor; }, 0) / (c.agreg === 'media' ? xs.length : 1);
        regs += xs.length;
        return { per: p.k, valor: Math.round(v * 10000) / 10000, ref: xs[xs.length - 1].ref };
      }).filter(Boolean);
      l.forEach(function (x) {
        var per = x.per, ch = per + '|' + c.k;
        /* Os registos de teste das medias podem passar de 100% no ultimo mes */
        if (c.un === '%') x = { valor: Math.min(x.valor, 100), ref: x.ref };
        f.db[ch] = x.valor;
        var editada = f.cel[ch] !== undefined && f.org[ch] !== 'db';
        if (editada && !substituir) { if (Math.abs(f.cel[ch] - x.valor) > 1e-9) mantidas++; return; }
        if (f.cel[ch] !== x.valor || f.org[ch] !== 'db') { f.cel[ch] = x.valor; f.org[ch] = 'db'; n++; }
        if (!f.ref[per]) f.ref[per] = x.ref;
      });
    });
    f.puxado = { em: new Date().toISOString(), por: u().nome, bases: Object.keys(bases) };
    if (n) { f.em = f.puxado.em; f.por = f.puxado.por; }
    P.evento(m, 'Data pulled into "' + ped.nome + '" from ' + Object.keys(bases).join(', ') + ': ' + n + ' cells, ' + regs + ' records.', u().nome);
    P.guardar();
    return { n: n, mantidas: mantidas, registos: regs, bases: Object.keys(bases) };
  };
  P.limparFolha = function (m, pid) {
    if (!podeEditar(m)) return { erro: 'This milestone is read only for you right now.' };
    if (m.folhas) delete m.folhas[pid];
    P.guardar();
    return { ok: true };
  };
  /* Importar um .xlsx, .csv ou .json: as colunas reconhecem-se pelo cabecalho, as linhas pelo mes */
  var norm = function (s) { return String(s === null || s === undefined ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\s]+/g, ' ').trim(); };
  var mapaCabecalhos = function (m, cols, cab) {
    var mapa = {}, alvo = { periodo: ['period', 'periodo', 'month', 'mes', 'date', 'data'], ref: ['source reference', 'reference', 'record ref', 'record_ref', 'referencia', 'ref'] };
    cols.forEach(function (c) { alvo[c.k] = [norm(c.k), norm(c.rot), norm(c.rot + ' (' + c.un + ')')]; });
    cab.forEach(function (t, i) { var k = norm(t); Object.keys(alvo).forEach(function (a) { if (mapa[a] === undefined && alvo[a].indexOf(k) > -1) mapa[a] = i; }); });
    return mapa;
  };
  var acharPeriodo = function (m, txt, ix, ped) {
    var pers = periodos(m, ped), k = norm(txt);
    if (k === '' || k === undefined) return pers[ix] ? pers[ix].k : null;
    var p = pers.filter(function (x) { return norm(x.k) === k || norm(x.t) === k || norm(x.t.slice(0, 3)) === k || k === String(x.i + 1) || k === m.ano + '-' + (x.i + 1); })[0];
    if (p) return p.k;
    var d = typeof txt === 'number' && txt > 30000 ? new Date(Math.round((txt - 25569) * 864e5)) : null;
    if (d && d.getUTCFullYear() === m.ano) { var pd = pers.filter(function (x) { return x.meses.indexOf(d.getUTCMonth()) > -1; })[0]; if (pd) return pd.k; }
    return null;
  };
  var planoMatriz = function (m, pid, mat, inicio) {
    var ped = pedidoDe(m, pid), cols = P.colunasFolha(m, ped), mapa = mapaCabecalhos(m, cols, mat[0] || []);
    var reconhecidas = Object.keys(mapa).filter(function (k) { return k !== 'periodo'; }).length;
    if (!reconhecidas) return null;
    var lista = [], ign = [];
    mat.slice(1).forEach(function (l, ix) {
      if (!l.some(function (x) { return String(x).trim(); })) return;
      var per = acharPeriodo(m, mapa.periodo !== undefined ? l[mapa.periodo] : '', (inicio || 0) + ix, ped);
      if (!per) { ign.push('Row ' + (ix + 2) + ': "' + l[mapa.periodo] + '" is not a month of ' + m.ano + '.'); return; }
      Object.keys(mapa).forEach(function (k) { if (k !== 'periodo' && l[mapa[k]] !== undefined) lista.push({ id: per, k: k, valor: l[mapa[k]] }); });
    });
    var semCol = (mat[0] || []).filter(function (t, i) { return String(t).trim() && Object.keys(mapa).every(function (k) { return mapa[k] !== i; }); });
    if (semCol.length) ign.push('Columns not part of this request: ' + semCol.join(', ') + '.');
    return { lista: lista, ignorados: ign };
  };
  P.importarFolha = function (m, pid, file) {
    return P.lerFicheiro(file).then(function (r) {
      if (r.erro) return { erro: r.erro };
      if (!r.linhas.length) return { erro: 'The file has no data rows.' };
      var cab = Object.keys(r.linhas[0]), mat = [cab].concat(r.linhas.map(function (l) { return cab.map(function (k) { return l[k]; }); }));
      var plano = planoMatriz(m, pid, mat);
      if (!plano) return { erro: 'No column of the file matches this request. Download the template to see the expected columns.' };
      var res = aplicar(m, pid, plano.lista, 'importar');
      return { aplicados: res.aplicados, recusados: res.recusados, ignorados: plano.ignorados, nome: r.nome };
    });
  };

  /* Entregar: gera o ficheiro do pedido, guarda os dados com ele e envia os totais para os calculos */
  P.entregarFolha = function (m, pid) {
    var usr = u(), ped = pedidoDe(m, pid);
    if (!podeEditar(m)) return { erro: 'This milestone is not with you right now.' };
    var st = P.estadoFolha(m, ped);
    if (!st.pronta) return { erro: st.erros ? st.erros + ' cell(s) with errors. Fix them before delivering.' : st.faltam + ' required cell(s) are still empty.' };
    var f = folha(m, pid), prefixo = (ped.prefixo || norm(ped.nome).replace(/[^a-z0-9]+/g, '-').slice(0, 40)), versao = ped.entregues.filter(function (x) { return x.origem === 'grid'; }).length + 1;
    var nome = prefixo + '-' + m.id.toLowerCase() + '-' + m.ano + (versao > 1 ? '-v' + versao : '') + '.xlsx';
    var r = P.entregarFicheiro(m, pid, nome, usr);
    if (r.erro) return r;
    var doc = m.documentos_gerais[m.documentos_gerais.length - 1];
    doc.origem = 'grid';
    doc.folha = { colunas: st.cols.map(function (c) { return c.k; }), cel: JSON.parse(JSON.stringify(f.cel)), ref: JSON.parse(JSON.stringify(f.ref)), totais: st.totais };
    f.entregue = { em: doc.em, ficheiro: nome };
    /* Os totais entram nos campos das fontes, como se viessem de um pull, e preenchem os indicadores que ja se conseguem calcular */
    S.puxados = S.puxados || {};
    var px = S.puxados[m.id] || (S.puxados[m.id] = { em: doc.em, por: usr.nome, vals: {}, registos: 0 });
    st.cols.forEach(function (c) { if (st.totais[c.k] !== null) px.vals[c.k] = st.totais[c.k]; });
    px.em = doc.em; px.por = usr.nome; px.registos = (px.registos || 0) + st.cheias;
    var usa = [];
    st.cols.forEach(function (c) { c.usa.forEach(function (id) { if (usa.indexOf(id) < 0) usa.push(id); }); });
    var prontos = P.calculosMilestone(m).filter(function (x) { return x.valor !== null && usa.indexOf(x.id) > -1; }).map(function (x) { return x.id; });
    var pr = prontos.length ? P.preencherCalculados(m, usr, prontos) : { n: 0 };
    P.evento(m, 'Data filled in on the platform for "' + ped.nome + '": ' + st.cheias + ' cells (' + st.daBase + ' from the database, ' + st.editadas + ' entered or pasted). ' + (pr.n || 0) + ' indicator(s) updated.', usr.nome);
    P.guardar();
    return { ficheiro: nome, indicadores: pr.n || 0 };
  };
  P.descarregarFolha = function (m, pid, comDados) {
    var ped = pedidoDe(m, pid), cfg = cfgFolha(m, ped, true);
    if (!comDados) cfg.linhas = cfg.linhas.map(function (l) { var c = {}; Object.keys(l.c).forEach(function (k) { c[k] = k === 'periodo' ? l.c[k] : { t: '' }; }); return { id: l.id, c: c }; });
    var defs = { nome: 'Columns', linhas: [['Column', 'Field', 'Unit', 'Source', 'Aggregation', 'Used by']].concat(P.colunasFolha(m, ped).map(function (c) { return [c.rot + ' (' + c.un + ')', c.k, c.un, DBS[c.db] + ' / ' + c.tab, AGREG[c.agreg], c.usa.join(', ')]; })) };
    P.exportarGrelha(cfg, (ped.prefixo || 'pedido') + '-' + m.id.toLowerCase() + '-' + m.ano + (comDados ? '' : '-template') + '.xlsx', 'Data', defs);
  };

  /* --- Grelha ---------------------------------------------------------------- */
  var ORIGEM_TXT = { db: 'From the database', manual: 'Entered by hand', excel: 'From Excel' };
  var cfgFolha = function (m, ped, exportar) {
    var cols = P.colunasFolha(m, ped), f = (m.folhas || {})[ped.id] || { cel: {}, ref: {}, org: {}, db: {} }, pode = podeEditar(m) && !exportar, st = P.estadoFolha(m, ped);
    var gc = [{ k: 'periodo', t: 'Period', larg: 92 }].concat(cols.map(function (c) { return { k: c.k, t: c.rot + ' (' + c.un + ')', dir: 1, edita: pode, larg: 150 }; })).concat([{ k: 'ref', t: 'Source reference', edita: pode, larg: 150 }]);
    var linhas = periodos(m, ped).map(function (p) {
      var c = { periodo: { t: p.t } };
      cols.forEach(function (col) {
        var ch = p.k + '|' + col.k, v = f.cel[ch] === undefined ? null : f.cel[ch], er = validar(col, v), o = f.org[ch], dbv = f.db[ch], req = obrigatorio(col, p.i, p.agr);
        var difere = v !== null && dbv !== undefined && o !== 'db' && Math.abs(dbv - v) > 1e-9;
        var tip = er || (v === null ? (req ? 'Required. ' : 'Optional: only the quarter-end months are needed. ') + AGREG[col.agreg] + ' of ' + col.k + '.' : ORIGEM_TXT[o] + (difere ? '. The database has ' + num(dbv) + '.' : o === 'db' ? ', ' + DBS[col.db] + ' / ' + col.tab + '.' : '.'));
        c[col.k] = { t: num(v), bruto: bruNum(v), num: v, cls: er ? 'err' : difere ? 'alerta' : v === null ? (req && pode ? 'falta' : '') : o === 'db' ? 'fh-db' : 'fh-man', tip: tip };
      });
      c.ref = { t: f.ref[p.k] || '' };
      return { id: p.k, c: c };
    });
    if (!exportar) {
      var tc = { periodo: { t: 'Total', html: '<b>Total</b>' }, ref: { t: '', so: 1 } };
      cols.forEach(function (col) { var v = st.totais[col.k]; tc[col.k] = { t: num(v), bruto: bruNum(v), num: v, so: 1, cls: 'fh-tot', tip: AGREG[col.agreg] + ' of the months. This is the value sent to the calculations.' }; });
      linhas.push({ id: 'total', c: tc });
    }
    return {
      id: 'fh-' + m.id + '-' + ped.id.replace(/[^\w-]/g, '_'), titulo: ped.nome, vazio: 'This request has no data columns.',
      dica: pode ? 'Type, paste a block from Excel (Ctrl+V) or pull from the database. Double-click to edit, Ctrl+Z undoes.' : 'Read only. Select cells and copy them with Ctrl+C.',
      cols: gc, linhas: linhas,
      aoAplicar: function (lista, origem) { return aplicar(m, ped.id, lista.filter(function (a) { return a.id !== 'total'; }), origem); },
      aoColar: function (mat, pos) { return planoMatriz(m, ped.id, mat, pos ? pos.r : 0); },
      aoColado: function (rel) { U.fhRel = { pid: ped.id, notas: rel.recusados.concat(rel.ignorados) }; toast(rel.aplicados + ' cell(s) updated from your copy.', rel.aplicados ? 'ok' : 'err'); R(); },
      aoRecusar: function () { toast(pode ? 'Totals are calculated from the months.' : 'This milestone is read only for you right now.', 'err'); },
      aoAnular: function (n) { toast(n + ' cell(s) restored.', 'ok'); }
    };
  };

  /* --- Impacto nos indicadores, recalculado a cada alteracao da folha --------- */
  P.impactoFolha = function (m, ped) {
    var st = P.estadoFolha(m, ped), usa = [];
    st.cols.forEach(function (c) { c.usa.forEach(function (id) { if (usa.indexOf(id) < 0) usa.push(id); }); });
    return P.calculosMilestone(m, st.totais).filter(function (r) { return usa.indexOf(r.id) > -1; }).map(function (r) {
      var c = P.cat(r.id), it = P.item(r.id, P.chave(m)), ant = P.valorAnterior(r.id, P.chave(m)), v = r.valor === null ? null : P.validar(c, r.valor, P.chave(m));
      return { id: r.id, c: c, r: r, atual: it.valor, ant: ant, novo: r.valor, val: v, falta: r.falta.filter(function (k) { return k.indexOf('fator.') !== 0; }) };
    });
  };
  var impactoHtml = function (m, ped) {
    var l = P.impactoFolha(m, ped);
    if (!l.length) return '';
    var fmt = function (id, v) { return v === null || v === undefined ? '<span class="ps-mut">-</span>' : '<span class="ps-num">' + e(X.fmtV(id, v)) + '</span>'; };
    var linhas = l.map(function (x) {
      var dif = x.novo !== null && x.atual !== null && x.atual !== undefined && Math.abs(x.novo - x.atual) > 1e-9;
      var vari = x.val && x.val.variacao !== null && x.val.variacao !== undefined ? '<span class="fh-var ' + (x.val.alertas.length || x.val.erros.length ? 'warn' : '') + '">' + (x.val.variacao > 0 ? '+' : '') + P.fmtNum(x.val.variacao, 1) + '%</span>' : '<span class="ps-mut">-</span>';
      var check = x.novo === null ? '<span class="ps-small ps-mut">' + (x.falta.length ? 'Needs ' + x.falta.map(function (k) { return e(CAMPOS[k] ? CAMPOS[k].rot : k); }).join(', ') : 'Fill in the sheet') + '</span>' : x.val.erros.length ? chip('Error', 'err') + '<br><small class="ps-mut">' + e(x.val.erros[0]) + '</small>' : x.val.alertas.length ? chip('Alert', 'warn') + '<br><small class="ps-mut">' + e(x.val.alertas[0]) + '</small>' : chip('Valid', 'ok');
      return [e(x.c.nome) + '<br><small class="ps-mut">' + e(x.id) + ' · ' + e(x.c.unidade_medida) + '</small>', '<span class="ps-mono ps-small">' + e(x.r.subst || x.r.x || '') + '</span>', fmt(x.id, x.ant), fmt(x.id, x.atual), '<b class="fh-novo' + (dif ? ' muda' : '') + '">' + fmt(x.id, x.novo) + '</b>', vari, check];
    });
    var prontos = l.filter(function (x) { return x.novo !== null; }).length, alertas = l.filter(function (x) { return x.val && (x.val.alertas.length || x.val.erros.length); }).length;
    return '<section class="fh-imp" aria-labelledby="fh-imp-t"><div class="fh-imp-h"><h3 id="fh-imp-t">Impact on the indicators</h3><span class="ps-small ps-mut" aria-live="polite">' + prontos + ' of ' + l.length + ' calculated with this sheet' + (alertas ? ' · ' + alertas + ' to check' : '') + '. Updates as you type.</span></div>' +
      X.tabela([{ t: 'Indicator' }, { t: 'Formula with these values' }, { t: P.rotAnterior(P.chave(m)), dir: 1 }, { t: 'Current', dir: 1 }, { t: 'With this sheet', dir: 1 }, { t: 'Change vs ' + P.rotAnterior(P.chave(m)), dir: 1 }, { t: 'Check' }], linhas) + '</section>';
  };

  /* --- Painel ------------------------------------------------------------------ */
  X.Pn.folha = function (a) {
    var m = P.ms(a.m), ped = pedidoDe(m, a.pid);
    if (!ped) return { t: 'Request not found', b: '<div class="ps-aviso">This file is no longer requested.</div>' };
    var pode = podeEditar(m), st = P.estadoFolha(m, ped), f = (m.folhas || {})[ped.id] || {}, cfg = cfgFolha(m, ped), pct = st.total ? Math.round(((st.total - st.faltam) / st.total) * 100) : 0;
    var bases = {};
    st.cols.forEach(function (c) { bases[DBS[c.db]] = (bases[DBS[c.db]] || []).concat(c.tab).filter(function (x, i, l) { return l.indexOf(x) === i; }); });
    var rel = U.fhRel && U.fhRel.pid === ped.id ? U.fhRel : null;
    var ferr = pode ? '<div class="fh-ferr" role="toolbar" aria-label="Sheet tools"><button type="button" class="ps-btn pri" data-a="fhPuxar">' + X.svg(X.I.ativ || X.I.doc, 15) + (f.puxado ? 'Pull again from the database' : 'Pull from the database') + '</button>' +
      '<button type="button" class="ps-btn" data-a="fhImportar">Import Excel</button><button type="button" class="ps-btn" data-a="fhModelo">Download template</button>' + (temFolha(m, ped.id) ? '<button type="button" class="ps-btn liga" data-a="fhLimpar">Clear sheet</button>' : '') + '</div>' : '';
    var fontes = '<ul class="fh-fontes">' + Object.keys(bases).map(function (b) { return '<li><b>' + e(b) + '</b><small class="ps-mono">' + bases[b].map(e).join(', ') + '</small>' + chip('Test data', 'info') + '</li>'; }).join('') + '</ul>';
    var resumo = '<div class="fh-resumo"><div class="fh-prog"><div class="fh-prog-t"><b>' + (st.total - st.faltam) + ' of ' + st.total + '</b> required cells filled</div><div class="fh-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Sheet completion"><i style="width:' + pct + '%"></i></div></div>' +
      '<ul class="fh-leg" aria-label="Legend"><li><i class="db"></i>' + st.daBase + ' from the database</li><li><i class="man"></i>' + st.editadas + ' entered or pasted</li>' + (st.difere ? '<li><i class="dif"></i>' + st.difere + ' differ from the database</li>' : '') + (st.erros ? '<li><i class="err"></i>' + st.erros + ' with errors</li>' : '') + '</ul></div>';
    var aviso = rel && rel.notas && rel.notas.length ? '<div class="ps-aviso warn" role="status"><div class="ps-sp-b"><b>Not applied</b><button type="button" class="ps-btn liga" data-a="fhRelFechar">Dismiss</button></div><ul class="ps-notas">' + rel.notas.slice(0, 10).map(function (n) { return '<li>' + e(n) + '</li>'; }).join('') + '</ul></div>' :
      rel && rel.mantidas ? '<div class="ps-aviso warn" role="status"><div class="ps-sp-b"><span>' + rel.mantidas + ' cell(s) you edited differ from the database and were kept.</span><span class="ps-sp"><button type="button" class="ps-btn peq" data-a="fhSubstituir">Use the database values</button><button type="button" class="ps-btn liga" data-a="fhRelFechar">Keep mine</button></span></div></div>' : '';
    var defs = '<details class="fh-defs"><summary>Columns of this request (' + st.cols.length + ')</summary><table class="fh-defs-t"><thead><tr><th>Column</th><th>Source</th><th>Aggregation</th><th>Used by</th></tr></thead><tbody>' + st.cols.map(function (c) {
      return '<tr><td><b>' + e(c.rot) + '</b><br><small class="ps-mono ps-mut">' + e(c.k) + ' · ' + e(c.un) + '</small></td><td>' + e(DBS[c.db]) + '<br><small class="ps-mono ps-mut">' + e(c.tab) + '</small></td><td>' + e(AGREG[c.agreg]) + (c.agreg === 'ultimo' ? '<br><small class="ps-mut">Quarter-end months</small>' : '') + '</td><td>' + c.usa.map(e).join(', ') + '</td></tr>';
    }).join('') + '</tbody></table></details>';
    var entregue = ped.entregues.filter(function (x) { return x.origem === 'grid'; }).slice(-1)[0];
    var estado = entregue ? '<div class="ps-aviso ok" role="status">Delivered as <b>' + e(entregue.ficheiro) + '</b> by ' + e(entregue.por) + ' on ' + e(P.fmtDataHora(entregue.em)) + '.' + (pode ? ' Changes you make now are delivered as a new version.' : '') + '</div>' : '';
    var motivo = !pode ? '' : st.erros ? st.erros + ' cell(s) with errors' : st.faltam ? st.faltam + ' required cell(s) still empty' : 'Ready to deliver';
    var usa = [];
    st.cols.forEach(function (c) { c.usa.forEach(function (id) { if (usa.indexOf(id) < 0) usa.push(id); }); });
    return {
      t: ped.nome, s: m.nome + ' · ' + m.empresa + ' · ' + P.rotPeriodo(m), cls: 'folha',
      b: estado + (ped.instrucoes ? '<div class="ps-aviso info"><b>How to fill it in.</b> ' + e(ped.instrucoes) + '</div>' : '') + '<p class="ps-small ps-mut">' + e(ped.motivo || 'Fill in the columns this milestone needs.') + ' One row per month. Every cell keeps where it came from.</p>' + ferr + fontes + resumo + aviso + window.PortalGrelha.html(cfg) + impactoHtml(m, ped) + defs,
      p: '<span class="fh-motivo ' + (st.pronta ? 'ok' : '') + '" aria-live="polite">' + e(motivo) + (pode && usa.length ? '<small>Delivering updates ' + e(usa.join(', ')) + '</small>' : '') + '</span><button type="button" class="ps-btn" data-a="fecharPainel">' + (pode ? 'Save and close' : 'Close') + '</button>' +
        (pode ? '<button type="button" class="ps-btn pri" data-a="fhEntregar"' + (st.pronta ? '' : ' disabled') + '>' + (entregue ? 'Deliver new version' : 'Deliver data') + '</button>' : '') + (!pode && entregue ? '<button type="button" class="ps-btn" data-a="fhDescarregar">Download Excel</button>' : '')
    };
  };

  /* Botoes e estado na tabela de ficheiros pedidos */
  P.folhaAcoes = function (m, ped, pode) {
    if (ped.indicador || !P.colunasFolha(m, ped).length) return '';
    var st = P.estadoFolha(m, ped), viaGrelha = ped.entregues.some(function (x) { return x.origem === 'grid'; });
    if (pode) return '<button type="button" id="fh-' + e(ped.id) + '" class="ps-btn peq' + (ped.entregues.length ? '' : ' pri') + '" data-a="fhAbrir" data-v="' + e(ped.id) + '">' + (viaGrelha ? 'Edit data' : temFolha(m, ped.id) ? 'Continue filling in' : 'Fill in here') + '</button>';
    return viaGrelha ? '<button type="button" class="ps-btn peq" data-a="fhAbrir" data-v="' + e(ped.id) + '">View data</button>' : '';
  };
  P.folhaEstado = function (m, ped) {
    if (ped.indicador || !temFolha(m, ped.id)) return '';
    var f = m.folhas[ped.id];
    if (f.entregue && f.entregue.em >= (f.em || '')) return '';
    var st = P.estadoFolha(m, ped);
    return '<br><span class="ps-small ps-mut">Draft: ' + (st.total - st.faltam) + ' of ' + st.total + ' cells</span>';
  };

  /* --- Acoes -------------------------------------------------------------------- */
  var mAtual = function () { return X.msAtual(); };
  var pidAtual = function () { return U.painel && U.painel.args.pid; };
  A.fhAbrir = function (d) { U.fhRel = null; X.abrePainel('folha', { m: mAtual().id, pid: d.v }); };
  A.fhPuxar = function () { var m = mAtual(), r = P.puxarFolha(m, pidAtual()); if (r.erro) return toast(r.erro, 'err'); U.fhRel = { pid: pidAtual(), mantidas: r.mantidas }; toast(r.n + ' cell(s) filled from ' + r.bases.length + ' source table(s), ' + r.registos + ' records.', 'ok'); R(); };
  A.fhSubstituir = function () { var m = mAtual(), r = P.puxarFolha(m, pidAtual(), true); if (r.erro) return toast(r.erro, 'err'); U.fhRel = null; toast('Database values applied.', 'ok'); R(); };
  A.fhRelFechar = function () { U.fhRel = null; R(); };
  A.fhLimpar = function () { var r = P.limparFolha(mAtual(), pidAtual()); if (r.erro) return toast(r.erro, 'err'); U.fhRel = null; toast('Sheet cleared.', 'ok'); R(); };
  A.fhModelo = function () { P.descarregarFolha(mAtual(), pidAtual(), false); toast('Template downloaded. Fill it in and import it here.', 'ok'); };
  A.fhDescarregar = function () { P.descarregarFolha(mAtual(), pidAtual(), true); };
  A.fhImportar = function () {
    var m = mAtual(), pid = pidAtual();
    X.escolherFicheiro('.xlsx,.csv,.json', function (file) {
      P.importarFolha(m, pid, file).then(function (r) {
        if (r.erro) return toast(r.erro, 'err');
        U.fhRel = { pid: pid, notas: r.recusados.concat(r.ignorados) };
        toast(r.aplicados + ' cell(s) imported from ' + r.nome + '.', r.aplicados ? 'ok' : 'err');
        R();
      });
    });
  };
  A.fhEntregar = function () {
    var m = mAtual(), r = P.entregarFolha(m, pidAtual());
    if (r.erro) return toast(r.erro, 'err');
    U.painel = null; U.fhRel = null;
    toast('Delivered as ' + r.ficheiro + (r.indicadores ? '. ' + r.indicadores + ' indicator(s) updated.' : '.'), 'ok');
    R();
  };
})();
