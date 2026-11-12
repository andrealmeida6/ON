/* ============================================================================
   portal-saidas.js - saidas nos formatos de destino
   Cada entrega externa do ano (ERSAR, APA, Relatorio e Contas, Relatorio de
   Sustentabilidade) tem os indicadores que a alimentam, o estado de cada um e
   o ficheiro no formato de quem o recebe. Cada ficheiro gerado fica registado
   com a versao, quem o gerou e se foi rascunho ou final.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S, X = P.ext;
  var Blocos = X.Blocos, A = X.A, C = X.C, U = X.U, e = X.e, chip = X.chip, cabCartao = X.cabCartao, tabela = X.tabela, toast = X.toast, R = X.R, u = X.u, fmtV = X.fmtV, svg = X.svg, I = X.I;

  var TIPO_X = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', TIPO_W = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  /* Formato e modelo de cada entrega. quadros: usa os quadros e o documento com o desenho da Entidade A */
  var FORMATO = {
    QA: { f: ['xlsx'], modelo: 'Quarterly water quality sheet', destino: 'ERSAR portal' },
    PCQA: { f: ['xlsx'], modelo: 'PCQA annual results sheet', destino: 'ERSAR portal' },
    RQS: { f: ['xlsx'], modelo: 'Service quality indicators sheet', destino: 'ERSAR portal' },
    MIRR: { f: ['xlsx'], modelo: 'Waste register sheet', destino: 'SILiAmb (APA)' },
    GF: { f: ['xlsx'], modelo: 'Fluorinated gases sheet', destino: 'SILiAmb (APA)' },
    RC: { f: ['xlsx', 'docx'], modelo: 'Entidade A indicator tables', destino: 'Financial reporting team', quadros: true },
    RS: { f: ['docx', 'xlsx'], modelo: 'Entidade A report document', destino: 'Communication team', quadros: true }
  };
  var tipoDe = function (rel) { return rel.id.split('-')[0]; };
  var FMT_TXT = { xlsx: 'Excel', docx: 'Word' };

  /* Indicadores dos quadros do relatorio (modelo Entidade A) */
  var idsQuadros = function () {
    var o = [];
    (P.folhasCompletas ? P.folhasCompletas() : []).forEach(function (f) { f.quadros.forEach(function (q) { q.g.forEach(function (g) { g.s.forEach(function (s) { s.r.forEach(function (r) { if (r.k && o.indexOf(r.k) < 0) o.push(r.k); }); }); }); }); });
    return o;
  };
  P.idsQuadros = idsQuadros;
  /* Os indicadores de cada entrega vem dos momentos de report (Backoffice > Reporting moments) */
  P.indicadoresSaida = function (rel) { return P.indicadoresEntrega(rel); };

  /* Valor de um indicador para a entrega: trimestre, ano, ou o ano a partir dos trimestres */
  var linha = function (rel, id) {
    var c = P.cat(id), per = P.periodo(rel.periodo), tri = per && per.tipo === 'trimestre', chave = tri ? per.id : per ? per.ano : S.ciclo.ano;
    var it = S.items[chave + ':' + id] || null, m = it ? P.ms(it.milestone_id) : null, v = it ? it.valor : null, origem = '';
    var ok = !!(m && P.indAprovado(m, id));
    if (!tri && (v === null || v === undefined)) {
      var q = P.anualDosTrimestres({ ano: chave }, id);
      if (q) { v = q.valor; ok = q.aprovados === q.total; origem = 'From ' + q.n + ' of ' + q.total + ' quarters'; m = m || (q.l.filter(function (x) { return x.m; }).slice(-1)[0] || {}).m; }
    }
    var ant = P.valorAnterior(id, chave), est = v === null || v === undefined ? { t: 'Missing', c: 'err' } : ok ? { t: 'Approved', c: 'ok' } : { t: 'Not approved', c: 'warn' };
    var alertas = it && P.validarItem ? P.validarItem(it).alertas : [];
    return { id: id, c: c, v: v === undefined ? null : v, ant: ant === undefined ? null : ant, m: m, it: it, est: est, origem: origem, alertas: alertas, chave: chave };
  };
  P.linhasSaida = function (rel) { return P.indicadoresSaida(rel).map(function (id) { return linha(rel, id); }); };
  P.prontidaoSaida = function (rel) {
    var l = P.linhasSaida(rel), ok = l.filter(function (x) { return x.est.c === 'ok'; }).length, falta = l.filter(function (x) { return x.est.c === 'err'; }).length;
    return { l: l, total: l.length, ok: ok, falta: falta, pct: l.length ? Math.round(ok / l.length * 100) : 0, final: l.length > 0 && ok === l.length };
  };
  var geracoes = function (rel) { return (S.saidas || []).filter(function (g) { return g.rel === rel.id; }); };

  P.semearSaidas = function () {
    S.saidas = [
      { id: 'G1', rel: 'QA-2026-T1', versao: 1, formato: 'xlsx', ficheiro: 'QA-2026-T1_ERSAR_v1.xlsx', final: true, em: '2026-06-12T10:20:00Z', por: P.NOME_ESG, ok: 2, total: 2 },
      { id: 'G2', rel: 'QA-2026-T2', versao: 1, formato: 'xlsx', ficheiro: 'QA-2026-T2_ERSAR_v1.xlsx', final: true, em: '2026-09-08T09:05:00Z', por: P.NOME_ESG, ok: 2, total: 2 },
      { id: 'G3', rel: 'QA-2026-T3', versao: 1, formato: 'xlsx', ficheiro: 'QA-2026-T3_ERSAR_v1_draft.xlsx', final: false, em: '2026-11-04T15:40:00Z', por: P.NOME_ESG, ok: 0, total: 2 }
    ];
  };

  /* --- Ficheiros ------------------------------------------------------------ */
  var ascii = function (t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, ''); };
  var nomeFicheiro = function (rel, versao, final, fmt) { return rel.id + '_' + ascii(rel.entidade) + '_v' + versao + (final ? '' : '_draft') + '.' + fmt; };
  var xlsxEntrega = function (rel, pr, final, versao) {
    var X2 = window.XLSX, wb = X2.utils.book_new(), f = FORMATO[tipoDe(rel)], usr = u();
    var capa = [[rel.nome], [], ['Destination', rel.entidade + ': ' + f.destino], ['Period', P.periodo(rel.periodo) ? P.periodo(rel.periodo).nome : rel.periodo], ['Due date', P.fmtDataAno(rel.data)], ['Legal basis', rel.base || ''],
      ['Status', final ? 'Final: every value approved in the platform' : 'Draft: ' + (pr.total - pr.ok) + ' of ' + pr.total + ' values not approved yet'], ['Version', versao], ['Generated', P.fmtDataHora(new Date().toISOString()) + ' by ' + usr.nome], [],
      ['Before submitting, check that the layout still matches the current form of the destination.']];
    var dados = [['Code', 'Indicator', 'Unit', 'Period', 'Value', 'Previous period', 'Change %', 'Status', 'Data quality', 'Evidence', 'What counts', 'Source']].concat(pr.l.map(function (x) {
      var d = (S.defs || {})[x.id] || {}, vr = x.v !== null && x.ant ? Number(((x.v - x.ant) / Math.abs(x.ant) * 100).toFixed(1)) : '';
      return [x.id, x.c.nome, x.c.unidade_medida, String(x.chave), x.v === null ? '' : x.v, x.ant === null ? '' : x.ant, vr, x.est.t + (x.origem ? ' (' + x.origem + ')' : ''), x.it ? (P.QUALIDADE_TXT[x.it.qualidade] || '') : '', x.it ? x.it.evidencias.map(function (y) { return y.ficheiro; }).join(', ') : '', d.inclui || '', d.fonte || ''];
    }));
    var notas = [['Code', 'Indicator', 'Check']];
    pr.l.forEach(function (x) { if (x.est.c !== 'ok') notas.push([x.id, x.c.nome, x.est.t]); x.alertas.forEach(function (a) { notas.push([x.id, x.c.nome, a]); }); });
    if (notas.length === 1) notas.push(['', '', 'No open checks.']);
    var w1 = X2.utils.aoa_to_sheet(capa); w1['!cols'] = [{ wch: 16 }, { wch: 90 }];
    var w2 = X2.utils.aoa_to_sheet(dados); w2['!cols'] = [{ wch: 7 }, { wch: 44 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 26 }, { wch: 14 }, { wch: 30 }, { wch: 60 }, { wch: 40 }];
    var w3 = X2.utils.aoa_to_sheet(notas); w3['!cols'] = [{ wch: 7 }, { wch: 44 }, { wch: 80 }];
    X2.utils.book_append_sheet(wb, w1, 'Cover'); X2.utils.book_append_sheet(wb, w2, 'Data'); X2.utils.book_append_sheet(wb, w3, 'Checks');
    P.formatarNumerosXLSX(wb);
    return X2.write(wb, { bookType: 'xlsx', type: 'array' });
  };
  P.gerarSaida = function (relId, fmt) {
    var rel = (S.relatorios || []).filter(function (r) { return r.id === relId; })[0], usr = u();
    if (!rel) return { erro: 'Delivery not found.' };
    if (!P.gereTudo(usr)) return { erro: 'Only the sustainability team can generate the files.' };
    var t = tipoDe(rel), f = FORMATO[t], pr = P.prontidaoSaida(rel), versao = geracoes(rel).filter(function (g) { return g.formato === fmt; }).length + 1, nome = nomeFicheiro(rel, versao, pr.final, fmt), bytes;
    if (f.quadros) {
      if (fmt === 'docx') bytes = P.documentoDocx(t === 'RS' ? S.doc : P.docCompleto());
      else bytes = P.quadrosXlsx(P.folhasCompletas());
    } else bytes = xlsxEntrega(rel, pr, pr.final, versao);
    P.descarregar(nome, bytes, fmt === 'docx' ? TIPO_W : TIPO_X);
    (S.saidas || (S.saidas = [])).push({ id: 'G' + Date.now(), rel: rel.id, versao: versao, formato: fmt, ficheiro: nome, final: pr.final, em: new Date().toISOString(), por: usr.nome, ok: pr.ok, total: pr.total });
    if (P.eventoGlobal) P.eventoGlobal('Output generated: ' + nome + (pr.final ? '' : ' (draft, ' + pr.ok + ' of ' + pr.total + ' approved)') + '.', usr.nome, 'Output');
    P.guardar();
    return { nome: nome, final: pr.final };
  };

  /* --- Pagina --------------------------------------------------------------- */
  U.sd = { ent: '' };
  var barra = function (pr) { return '<div class="sd-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pr.pct + '" aria-label="Values approved"><i class="' + (pr.final ? 'ok' : '') + '" style="--x:' + pr.pct + '%"></i></div>'; };
  var cartao = function (rel) {
    var t = tipoDe(rel), f = FORMATO[t] || { f: ['xlsx'], modelo: '', destino: '' }, pr = P.prontidaoSaida(rel), g = geracoes(rel).slice(-1)[0], d = P.diasAte(rel.data), pode = P.gereTudo(u()), per = P.periodo(rel.periodo);
    var prazo = P.fmtDataAno(rel.data) + (d < 0 ? ' (' + Math.abs(d) + ' days ago)' : d === 0 ? ' (today)' : ' (in ' + d + ' days)');
    return '<article class="sd-card' + (d < 0 && !g ? ' late' : '') + '"><header><div><span class="sd-sig">' + e(rel.sigla) + '</span>' + (per ? '<span class="ps-per">' + e(per.nome) + '</span>' : '') + '</div>' + chip(rel.entidade, 'info') + '</header>' +
      '<h3>' + e(rel.nome) + '</h3><dl class="sd-det"><dt>Due</dt><dd>' + e(prazo) + '</dd><dt>Goes to</dt><dd>' + e(f.destino) + '</dd><dt>Template</dt><dd>' + e(f.modelo) + ', ' + f.f.map(function (x) { return FMT_TXT[x]; }).join(' and ') + '</dd></dl>' +
      '<div class="sd-pr"><div class="ps-sp-b"><span><b>' + pr.ok + ' of ' + pr.total + '</b> values approved</span>' + (pr.falta ? '<span class="ps-small sd-falta">' + pr.falta + ' missing</span>' : '') + '</div>' + barra(pr) + '</div>' +
      '<p class="ps-small ps-mut sd-ult">' + (g ? 'Last file: <span class="ps-chip-tip" tabindex="0" data-tip="' + e('Version ' + g.versao + ': this delivery has been generated ' + g.versao + ' time' + (g.versao === 1 ? '' : 's') + '. Each new file gets the next number, so earlier files are never overwritten.') + '">v' + g.versao + '</span>' + (g.final ? '' : ' draft') + ', ' + e(P.fmtDataHora(g.em)) + ' by ' + e(g.por) : 'No file generated yet') + '</p>' +
      '<footer><button type="button" class="ps-btn" data-a="sdVer" data-v="' + e(rel.id) + '">Check the values</button>' + (pode ? f.f.map(function (x, i) { return '<button type="button" class="ps-btn' + (i ? '' : ' pri') + '" data-a="sdGerar" data-v="' + e(rel.id) + '" data-f="' + x + '">' + svg(I.doc, 14) + (pr.final ? '' : 'Draft ') + FMT_TXT[x] + '</button>'; }).join('') : '') + '</footer></article>';
  };
  /* Os outputs vivem na pagina "Outputs & Reporting Timeline": o filtro por destino serve a timeline e os cartoes */
  P.filtroSaidas = function () {
    var ano = S.ciclo.ano, ents = [];
    (S.relatorios || []).forEach(function (r) { var p = P.periodo(r.periodo); if (p && p.ano === ano && ents.indexOf(r.entidade) < 0) ents.push(r.entidade); });
    return '<div class="ps-seg" role="group" aria-label="Filter by destination"><button type="button" class="' + (U.sd.ent ? '' : 'on') + '" data-a="sdEnt" data-v="">All</button>' + ents.map(function (x) { return '<button type="button" class="' + (U.sd.ent === x ? 'on' : '') + '" data-a="sdEnt" data-v="' + e(x) + '">' + e(x) + '</button>'; }).join('') + '</div>';
  };
  P.saidasHtml = function () { return Blocos['saidas'](true); };
  Blocos['saidas'] = function (semFiltro) {
    var ano = S.ciclo.ano, rels = (S.relatorios || []).filter(function (r) { var p = P.periodo(r.periodo); return p && p.ano === ano; }).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    var ents = []; rels.forEach(function (r) { if (ents.indexOf(r.entidade) < 0) ents.push(r.entidade); });
    var vis = rels.filter(function (r) { return !U.sd.ent || r.entidade === U.sd.ent; });
    var prs = rels.map(P.prontidaoSaida), prontas = prs.filter(function (x) { return x.final; }).length, prox = rels.filter(function (r) { return P.diasAte(r.data) >= 0; })[0];
    var kpis = '<div class="ps-kpis"><div class="ps-kpi"><span>Deliveries ' + ano + '</span><b>' + rels.length + '</b></div><div class="ps-kpi"><span>Ready to submit</span><b>' + prontas + '</b></div><div class="ps-kpi"><span>Files generated</span><b>' + (S.saidas || []).length + '</b></div><div class="ps-kpi"><span>Next due</span><b>' + (prox ? e(prox.sigla) + ', ' + e(P.fmtData(prox.data)) : '-') + '</b></div></div>';
    var filtro = '<div class="ps-seg" role="group" aria-label="Filter by destination"><button type="button" class="' + (U.sd.ent ? '' : 'on') + '" data-a="sdEnt" data-v="">All</button>' + ents.map(function (x) { return '<button type="button" class="' + (U.sd.ent === x ? 'on' : '') + '" data-a="sdEnt" data-v="' + e(x) + '">' + e(x) + '</button>'; }).join('') + '</div>';
    return kpis + (semFiltro ? '' : '<div class="ps-sp-b ps-mt">' + filtro + '</div>') + '<div class="sd-grid">' + vis.map(cartao).join('') + '</div>';
  };

  X.Pn.saida = function (a) {
    var rel = (S.relatorios || []).filter(function (r) { return r.id === a.id; })[0];
    if (!rel) return { t: 'Delivery not found', b: '' };
    var t = tipoDe(rel), f = FORMATO[t], pr = P.prontidaoSaida(rel), gs = geracoes(rel).slice().reverse(), pode = P.gereTudo(u());
    var linhas = pr.l.map(function (x) {
      return ['<button type="button" class="ps-btn liga" data-a="ficha" data-v="' + e(x.id) + '">' + e(x.c.nome) + '</button><br><small class="ps-mut">' + e(x.id) + ', ' + e(x.c.unidade_medida) + (x.origem ? ', ' + e(x.origem) : '') + '</small>',
        x.v === null ? '<span class="ps-mut">-</span>' : '<b class="ps-num">' + e(fmtV(x.id, x.v)) + '</b>', x.ant === null ? '<span class="ps-mut">-</span>' : '<span class="ps-num">' + e(fmtV(x.id, x.ant)) + '</span>',
        chip(x.est.t, x.est.c) + (x.alertas.length ? ' ' + chip(x.alertas.length + ' alert' + (x.alertas.length > 1 ? 's' : ''), 'warn') : '')];
    });
    var hist = gs.length ? '<ul class="ps-ev ps-sem-pad">' + gs.map(function (g) { return '<li><b>' + e(g.ficheiro) + '</b> ' + (g.final ? chip('Final', 'ok') : chip('Draft', 'warn')) + '<small>' + P.quemHtml(g.por) + ', ' + e(P.fmtDataHora(g.em)) + ', ' + g.ok + ' of ' + g.total + ' approved</small></li>'; }).join('') + '</ul>' : '<p class="ps-small ps-mut">No file generated yet.</p>';
    return {
      t: rel.nome, s: rel.entidade + ', due ' + P.fmtDataAno(rel.data), largo: true,
      b: (pr.final ? '<div class="ps-aviso ok">Every value is approved. The file goes out as final.</div>' : '<div class="ps-aviso warn">' + (pr.total - pr.ok) + ' of ' + pr.total + ' values are not approved yet. You can generate a draft to check the layout; it is marked as draft in the name and on the cover.</div>') +
        '<dl class="ps-det sd-det-p"><dt>Goes to</dt><dd>' + e(f.destino) + '</dd><dt>Template</dt><dd>' + e(f.modelo) + '</dd><dt>Legal basis</dt><dd>' + e(rel.base || '-') + '</dd></dl>' +
        tabela([{ t: 'Indicator' }, { t: 'Value', dir: 1 }, { t: 'Previous', dir: 1 }, { t: 'Status' }], linhas, 'No indicators feed this delivery.') +
        '<div><h3 class="ps-grupo-t">Files generated</h3>' + hist + '</div>',
      p: '<button type="button" class="ps-btn" data-a="fecharPainel">Close</button>' + (pode ? f.f.map(function (x, i) { return '<button type="button" class="ps-btn' + (i ? '' : ' pri') + '" data-a="sdGerar" data-v="' + e(rel.id) + '" data-f="' + x + '">' + (pr.final ? 'Generate ' : 'Generate draft ') + FMT_TXT[x] + '</button>'; }).join('') : '')
    };
  };
  A.sdEnt = function (d) { U.sd.ent = d.v; R(); };
  A.sdVer = function (d) { X.abrePainel('saida', { id: d.v }); };
  A.sdGerar = function (d) { var r = P.gerarSaida(d.v, d.f); if (r.erro) return toast(r.erro, 'err'); toast(r.nome + (r.final ? ' ready.' : ' ready as draft.'), r.final ? 'ok' : 'warn'); R(); };
})();
