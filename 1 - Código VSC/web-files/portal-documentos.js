/* ============================================================================
   portal-documentos.js - Documents: todos os documentos a que a pessoa tem acesso

   Junta as evidencias dos indicadores e os documentos das tasks numa so lista,
   com pesquisa. Cada documento diz a que task e a que KPIs esta afeto.
   Upload por aqui: escolhe-se a task e os indicadores; se for uma fatura,
   pode ler-se (QR code da AT, texto do PDF ou OCR) e os valores entram no
   indicador depois de confirmados (portal-faturas.js).
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal;
  if (!P || !P.ext) return;
  var S = P.S, X = P.ext, e = X.e, chip = X.chip, tabela = X.tabela, toast = X.toast, R = X.R, u = X.u, campo = X.campo, opt = X.opt, U = X.U, rota = X.rota, svg = X.svg, I = X.I, vazio = X.vazio, cabCartao = X.cabCartao, empHtml = X.empHtml;
  var norm = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };

  /* Quem ve uma task: a gestao e o auditor veem tudo; os outros, as tasks dos seus departamentos ou atribuidas a eles */
  var veTask = function (m, usr) {
    if (!usr) return false;
    if (P.gereTudo(usr) || usr.perfil === 'auditor') return true;
    return P.acompanha(m, usr) || P.podeAgir(m, usr) || m.atribuido_a === usr.login || (m.departamentos || []).some(function (d) { return P.temUnidade(usr, d); });
  };
  /* Todos os documentos: o mesmo ficheiro anexado a varios KPIs aparece uma vez, com os KPIs todos */
  P.listaDocumentos = function (usr) {
    var porChave = {}, l = [];
    var junta = function (x, m, ind, tipo) {
      var k = x.fid ? 'f:' + x.fid : (m ? m.id : '-') + ':' + x.ficheiro + ':' + (x.em || '');
      var d = porChave[k];
      if (!d) { d = porChave[k] = { x: x, m: m, kpis: [], tipo: tipo, nome: x.ficheiro, em: x.em || '', por: x.por || '' }; l.push(d); }
      if (ind && d.kpis.indexOf(ind) < 0) d.kpis.push(ind);
      if (x.fatura) d.fatura = x.fatura;
      if (tipo === 'evidencia') d.tipo = 'evidencia';
    };
    P.msCiclo().forEach(function (m) {
      if (!veTask(m, usr)) return;
      m.indicadores.forEach(function (id) { var it = P.item(id, P.chave(m)); ((it && it.evidencias) || []).forEach(function (x) { if (P.podeVerIndicador(P.cat(id), usr)) junta(x, m, id, 'evidencia'); }); });
      (m.documentos_gerais || []).forEach(function (x) { junta(x, m, null, x.pedido ? 'pedido' : 'task'); });
    });
    (S.docs || []).forEach(function (x) { if (x.solto && x.fid) junta(x, null, null, 'solto'); });
    return l.sort(function (a, b) { return String(b.em).localeCompare(String(a.em)); });
  };

  /* SharePoint folder: abre a biblioteca de documentos no SharePoint, para navegar pelas pastas */
  var botaoSP = function () {
    var ICO = svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', 14), url = P.urlPastaSP && P.SP ? P.urlPastaSP(P.SP.biblioteca) : '';
    return url ? '<a class="ps-btn" href="' + e(url) + '" target="_blank" rel="noopener" data-tip="' + e('Open the document library ' + P.SP.biblioteca + ' in SharePoint') + '">' + ICO + 'SharePoint folder</a>'
      : '<button type="button" class="ps-btn" data-a="spSemSite" data-tip="The SharePoint site address is not set yet (Backoffice, Data and storage).">' + ICO + 'SharePoint folder</button>';
  };
  var TIPO_TXT = { evidencia: 'KPI evidence', task: 'Task document', pedido: 'Requested file', solto: 'Not linked yet' };
  U.docs = { q: '', emp: '', tipo: '', per: '', ver: 50 };
  var resumoFatura = function (f) {
    if (!f) return '';
    var c = f.consumo || {}, fo = f.fornecimento || {}, v = f.valores || {};
    return '<span class="dc-fat">' + chip('Invoice read', 'info') + '<small>' + e([f.fornecedor && f.fornecedor.nome, c.energia_ativa_kwh !== null && c.energia_ativa_kwh !== undefined ? P.fmtNum(c.energia_ativa_kwh, 0) + ' kWh' : '', fo.cpe, fo.periodo_inicio ? P.fmtData(fo.periodo_inicio) + '–' + P.fmtData(fo.periodo_fim) : '', v.total_com_iva ? P.fmtNum(v.total_com_iva, 2) + ' €' : ''].filter(Boolean).join(', ')) + '</small></span>';
  };
  X.Blocos['documentos'] = function () {
    var usr = u(), f = U.docs, todos = P.listaDocumentos(usr), q = norm(f.q).split(/\s+/).filter(Boolean);
    var empresas = [], pers = [];
    todos.forEach(function (d) { if (d.m && empresas.indexOf(d.m.empresa) < 0) empresas.push(d.m.empresa); if (d.m && pers.indexOf(d.m.periodo) < 0) pers.push(d.m.periodo); });
    var l = todos.filter(function (d) {
      if (f.emp && (!d.m || d.m.empresa !== f.emp)) return false;
      if (f.tipo && (f.tipo === 'fatura' ? !d.fatura : d.tipo !== f.tipo)) return false;
      if (f.per && (!d.m || d.m.periodo !== f.per)) return false;
      if (!q.length) return true;
      var t = norm([d.nome, d.por, d.m ? d.m.nome + ' ' + d.m.empresa + ' ' + P.rotPeriodo(d.m) + ' ' + d.m.unidade : '', d.kpis.map(function (id) { return id + ' ' + P.cat(id).nome; }).join(' '), d.fatura ? JSON.stringify(d.fatura) : '', TIPO_TXT[d.tipo]].join(' '));
      return q.every(function (w) { return t.indexOf(w) > -1; });
    });
    var nFat = todos.filter(function (d) { return d.fatura; }).length, semKpi = todos.filter(function (d) { return d.tipo !== 'evidencia'; }).length;
    var topo = '<div class="ps-kpis"><div class="ps-kpi"><span>Documents</span><b>' + todos.length + '</b></div><div class="ps-kpi"><span>KPI evidence</span><b>' + (todos.length - semKpi) + '</b></div><div class="ps-kpi"><span>Task documents</span><b>' + semKpi + '</b></div><div class="ps-kpi"><span>Invoices read</span><b>' + nFat + '</b></div></div>';
    var filtros = '<div class="ps-filtros ps-mt">' + campo('dc-q', 'Search', '<input id="dc-q" class="ps-in" type="search" autocomplete="off" placeholder="File, KPI, task, company, supplier, CPE…" value="' + e(f.q) + '" data-i="docsQ">') +
      campo('dc-emp', 'Company', '<select id="dc-emp" class="ps-sel" data-c="docsF" data-id="emp">' + opt('', 'All', f.emp) + empresas.sort().map(function (x) { return opt(x, x, f.emp); }).join('') + '</select>') +
      campo('dc-per', 'Period', '<select id="dc-per" class="ps-sel" data-c="docsF" data-id="per">' + opt('', 'All', f.per) + pers.sort().map(function (x) { var p = P.periodo(x); return opt(x, p ? p.nome : x, f.per); }).join('') + '</select>') +
      campo('dc-tipo', 'Type', '<select id="dc-tipo" class="ps-sel" data-c="docsF" data-id="tipo">' + opt('', 'All', f.tipo) + opt('evidencia', 'KPI evidence', f.tipo) + opt('task', 'Task documents', f.tipo) + opt('pedido', 'Requested files', f.tipo) + opt('fatura', 'Invoices read', f.tipo) + opt('solto', 'Not linked yet', f.tipo) + '</select>') + '</div>';
    var linhas = l.slice(0, f.ver).map(function (d) {
      var kp = d.kpis.length ? d.kpis.map(function (id) { return '<a class="dc-kpi" href="' + rota('Milestone/' + d.m.id + '?ind=' + encodeURIComponent(id)) + '" data-tip="' + e('Open ' + id + ' ' + P.cat(id).nome + ' in the task ' + d.m.nome) + '">' + e(id) + '</a>'; }).join('') + (d.kpis.length === 1 ? '<a class="dc-kpin ps-blk" href="' + rota('Milestone/' + d.m.id + '?ind=' + encodeURIComponent(d.kpis[0])) + '">' + e(P.cat(d.kpis[0]).nome) + '</a>' : '<small class="ps-mut ps-blk">' + d.kpis.length + ' indicators</small>') : '<span class="ps-mut">-</span>';
      /* Ir para onde o ficheiro serviu: o indicador dentro da task (evidencia) ou a task (documento da task) */
      var IR = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 10l5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg>';
      var ir = !d.m ? '' : d.kpis.length ? '<a class="fc-b fc-ir" href="' + rota('Milestone/' + d.m.id + '?ind=' + encodeURIComponent(d.kpis[0])) + '" aria-label="Open the indicator in the task" data-tip="' + e('Open ' + (d.kpis.length === 1 ? d.kpis[0] + ' ' + P.cat(d.kpis[0]).nome : d.kpis.join(', ')) + ' in the task ' + d.m.nome) + '">' + IR + '</a>'
        : '<a class="fc-b fc-ir" href="' + rota('Milestone/' + d.m.id) + '" aria-label="Open the task" data-tip="' + e('Open the task ' + d.m.nome) + '">' + IR + '</a>';
      var sp = d.x.sp || (P.pastaSP ? P.pastaSP(d.m, d.kpis) : ''), spCurto = sp.split('/').slice(-3).join(' / ');
      var spUrl = sp && P.urlPastaSP ? P.urlPastaSP(sp) : '', spTxt = svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', 12) + e('… / ' + spCurto);
      return [P.fichHtml(d.x, ir, d.m, d.kpis) + resumoFatura(d.fatura) + (sp ? (spUrl ? '<a class="dc-sp" href="' + e(spUrl) + '" target="_blank" rel="noopener" data-tip="' + e('Open in SharePoint: ' + P.SP.site + ' / ' + sp) + '">' + spTxt + '</a>' : '<small class="dc-sp" tabindex="0" data-tip="' + e('SharePoint: ' + P.SP.site + ' / ' + sp) + '">' + spTxt + '</small>') : ''), kp, d.m ? (P.tagPer(d.m) || e(P.rotPeriodo(d.m))) : '<span class="ps-mut">-</span>', d.m ? empHtml(d.m.empresa) : '-', e(TIPO_TXT[d.tipo] || d.tipo), '<span class="ps-nowrap">' + e(d.em ? P.fmtData(d.em) : '-') + '</span><small class="ps-mut ps-blk">' + e(d.por || '') + '</small>'];
    });
    return topo + '<div class="ps-card ps-mt">' + cabCartao('All documents you can access (' + l.length + ')', 'doc', '<div class="ps-sp">' + botaoSP() + '<button type="button" class="ps-btn pri" data-a="docsUpload">' + svg(I.upload, 14) + 'Upload document</button></div>') +
      '<div class="ps-card-body">' + filtros + '<div class="ps-mt">' + tabela([{ t: 'Document' }, { t: 'KPIs' }, { t: 'Period' }, { t: 'Company' }, { t: 'Type' }, { t: 'Uploaded' }], linhas, todos.length ? 'No document matches the search.' : 'No documents yet. Upload one, or attach evidence in a task.') + '</div>' +
      (l.length > f.ver ? '<div class="ps-sp ps-mt"><button type="button" class="ps-btn liga" data-a="docsMais">Show ' + Math.min(100, l.length - f.ver) + ' more</button></div>' : '') + '</div></div>';
  };
  var tBusca = null;
  X.Live.docsQ = function (el) { U.docs.q = el.value; U.docs.ver = 50; clearTimeout(tBusca); tBusca = setTimeout(R, 180); };
  X.C.docsF = function (el) { U.docs[el.dataset.id] = el.value; U.docs.ver = 50; R(); };
  X.A.docsMais = function () { U.docs.ver += 100; R(); };
  X.A.spEsqueleto = function () { P.exportarEsqueletoSP(); toast('SharePoint folder structure exported (' + P.esqueletoSP().length + ' folders).', 'ok'); };

  /* --- Upload: ficheiro, task e indicadores; fatura opcional ------------------------------- */
  /* Tasks onde a pessoa pode juntar documentos: as que estao abertas e a que tem acesso para editar */
  var tasksUpload = function (usr) { return P.msCiclo().filter(function (m) { return !P.concluida(m) && (P.podePreencher(m, usr) || P.gereTudo(usr)); }); };
  U.up = null;
  X.A.docsUpload = function () { U.up = { ms: '', inds: [], fatura: false, file: null }; X.abrePainel('docUp', {}); };
  X.Pn.docUp = function () {
    var usr = u(), F = U.up || {}, l = tasksUpload(usr), m = F.ms ? P.ms(F.ms) : null;
    var inds = m ? m.indicadores.filter(function (id) { var it = P.item(id, P.chave(m)); return P.podeVerIndicador(P.cat(id), usr) && !(it && it.revisto); }) : [];
    var b = '<div class="dc-up">' +
      '<div class="ps-campo"><span class="ps-lab">File *</span><div class="ps-sp"><button type="button" class="ps-btn" data-a="docsEscolher">' + svg(I.upload, 14) + (F.file ? 'Change file' : 'Choose a file') + '</button>' + (F.file ? '<b>' + e(F.file.name) + '</b><small class="ps-mut">' + e(Math.round(F.file.size / 1024) + ' KB') + '</small>' : '<small class="ps-mut">PDF, Excel, Word or images</small>') + '</div></div>' +
      campo('up-ms', 'Task', '<select id="up-ms" class="ps-sel" data-pesq data-c="upMs">' + opt('', 'No task yet (link it later)', F.ms) + l.map(function (x) { return opt(x.id, x.nome + ' (' + P.rotPeriodo(x) + ', ' + x.empresa + ')', F.ms); }).join('') + '</select>') +
      (m ? '<div class="ps-campo"><span class="ps-lab">Indicators it supports</span><div class="ps-dt-chips">' + inds.map(function (id) { var on = F.inds.indexOf(id) > -1; return '<label class="ps-dt-chip' + (on ? ' on' : '') + '"><input type="checkbox" id="up-i-' + e(id) + '" data-c="upInd" data-id="' + e(id) + '"' + (on ? ' checked' : '') + '>' + e(id) + '<small>' + e(P.cat(id).nome) + '</small></label>'; }).join('') + '</div><small class="ps-mut">None selected: it is saved as a document of the task.</small></div>' : '') +
      '<label class="ps-chk dc-fatchk"><input id="up-fat" type="checkbox" data-c="upFat"' + (F.fatura ? ' checked' : '') + '><span><b>It is an invoice: read the values</b><small class="ps-mut ps-blk">Reads the values of the invoice. You check them before they go to the indicator.</small></span></label></div>';
    return { t: 'Upload document', s: 'Choose the file, the task and the indicators it supports', largo: true, b: b,
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="docsGuardar"' + (F.file ? '' : ' disabled') + '>' + (F.fatura ? 'Upload and read' : 'Upload') + '</button>' };
  };
  X.A.docsEscolher = function () { X.escolherFicheiro('.pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.zip,.txt', function (f) { U.up.file = f; if (/\.(pdf|png|jpe?g)$/i.test(f.name) && /fatur|invoice|eletric|luz|energia/i.test(f.name)) U.up.fatura = true; R(); }); };
  X.C.upMs = function (el) { U.up.ms = el.value; U.up.inds = []; var m = P.ms(el.value); if (m && U.up.fatura) U.up.inds = m.indicadores.filter(function (id) { return /^(MWh|kWh)$/.test(P.cat(id).unidade_medida) && !P.eOutput(P.cat(id)); }).slice(0, 1); R(); };
  X.C.upInd = function (el) { var l = U.up.inds.filter(function (x) { return x !== el.dataset.id; }); if (el.checked) l.push(el.dataset.id); U.up.inds = l; R(); };
  X.C.upFat = function (el) { U.up.fatura = el.checked; R(); };
  X.A.docsGuardar = function () {
    var F = U.up, usr = u(), m = F.ms ? P.ms(F.ms) : null;
    if (!F.file) return toast('Choose a file first.', 'err');
    /* Fatura: le e confirma no ecra seguinte; os valores e a evidencia so entram la */
    if (F.fatura && /\.(pdf|png|jpe?g|webp)$/i.test(F.file.name)) {
      var file = F.file, pref = { ms: F.ms, ind: F.inds[0] }; U.up = null;
      return P.abrirLeituraFatura(file, pref);
    }
    var fid = P.guardarFicheiro(F.file), nome = F.file.name, quando = new Date().toISOString();
    if (m && F.inds.length) {
      F.inds.forEach(function (id) { P.anexar(P.item(id, P.chave(m)), nome, usr, fid); });
      P.evento(m, 'Document uploaded in Documents and linked to ' + F.inds.join(', ') + ': ' + nome + '.', usr.nome);
    } else if (m) {
      (m.documentos_gerais = m.documentos_gerais || []).push({ ficheiro: nome, por: usr.nome, em: quando, fid: fid, sp: P.pastaSP ? P.pastaSP(m, []) : '' });
      P.evento(m, 'Document uploaded in Documents: ' + nome + '.', usr.nome);
    } else (S.docs = S.docs || []).push({ id: 'dc' + Date.now(), ficheiro: nome, por: usr.nome, em: quando, fid: fid, solto: true, sp: P.pastaSP ? P.pastaSP(null, []) : '' });
    P.guardar(); U.up = null; U.painel = null;
    toast(nome + (m ? ' linked to ' + (F.inds.length ? F.inds.join(', ') : 'the task') : ' saved. Link it to a task when you know which one') + '.', 'ok'); R();
  };
})();
