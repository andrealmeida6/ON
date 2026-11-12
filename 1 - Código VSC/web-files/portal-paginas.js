/* ============================================================================
   portal-paginas.js - desenha as paginas e liga as acoes
   Cada web page tem <section data-pagina="X"> com blocos <div data-bloco="y">.
   Aqui so se preenchem os blocos, por isso funciona igual com rotas por hash (todas as
   paginas no mesmo ficheiro) e no portal (uma pagina por URL).
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S;
  var MODO = window.PORTAL_MODO || 'portal';
  var e = function (v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  var U = { rota: { pag: '', arg: '', q: {} }, sep: 'dados', msTab: {}, tipoEd: null, lanc: null, msFiltro: { empresa: '', dep: '', estado: 'curso', esrs: true, minhas: false }, msEmpTodas: false, dadosVista: 'form', rqAberto: {}, dzFila: {}, colRel: {}, wfHist: {}, exp: {}, msVista: 'lista', imp: {}, cal: null, consEsrs: false, histInd: 'A03', audFiltro: 'todas', boTab: 'indicadores', painel: null, menu: null, docNova: false, indBusca: '', marca: null, regraBusca: '', logoEstado: '' };

  /* --- Icones ------------------------------------------------------------ */
  var svg = function (d, t) { return '<svg width="' + (t || 16) + '" height="' + (t || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var I = {
    tick: '<path d="M20 6L9 17l-5-5"/>', doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    tarefa: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>', cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    ativ: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>', relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>', voltar: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><path d="M12 3v12"/>',     cima: '<polyline points="18 15 12 9 6 15"/>', baixo: '<polyline points="6 9 12 15 18 9"/>', lixo: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
        tabela: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>', lapis: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', seta: '<path d="M5 12h14M13 6l6 6-6 6"/>'
      };

  /* --- Componentes ------------------------------------------------------- */
  var rota = function (r) {
    if (MODO === 'hash') return '#/' + r;
    var q = r.split('?'), p = q[0].split('/');
    return '/' + p[0].toLowerCase() + '/' + (p[1] || q[1] ? '?' + [p[1] ? 'id=' + p[1] : '', q[1] || ''].filter(Boolean).join('&') : '');
  };
  var tagsDe = function (m) { return '<span class="ps-tags">' + (m.departamentos || []).map(function (d) { return '<span class="ps-tag ps-tag-dep">' + avEquipa() + e(d) + '</span>'; }).join('') + '</span>'; };
  /* Um KPI aprovado (a task concluida, ou aprovado sozinho pela sustentabilidade) ja nao esta atribuido a ninguem */
  var atribKpi = function (m, id) {
    var it = P.item(id, P.chave(m));
    if (P.concluida(m) || (it && it.revisto && P.passoAtual(m) && P.passoAtual(m).tipo === 'recolha')) return '<span class="ps-mut" title="Approved: no one is assigned">-</span>';
    return atribHtml(m);
  };
  P.atribKpiHtml = function (m, id) { return atribKpi(m, id); };
  var atribHtml = function (m) {
    var a = P.atribuido(m);
    if (!a) return '<span class="ps-mut">-</span>';
    return a.tipo === 'pessoa' ? pessHtml(a.nome) : '<span class="ps-tag ps-tag-dep">' + avEquipa() + e(a.nome) + '</span>';
  };
  var rotaEmp = function (nome) { var x = S.ent.filter(function (y) { return y.nome === nome; })[0]; return rota('Milestones' + (x ? '?empresa=' + encodeURIComponent(x.id) : '')); };
  /* A mesma regra em todas as tabelas de milestones: empresa e a quem esta atribuida */
  /* Perimeter e nao Company: o perimetro pode ser uma empresa ou uma unidade de negocio. O periodo tem coluna propria, para ler melhor. */
  var COLS_MS = [{ t: 'Task', info: 'The ring shows the indicators of the task by status; the number is how many are still to report. Hover it for the detail.' }, { t: 'Period' }, { t: 'Perimeter' }, { t: 'Assigned to' }, { t: 'Deadline' }, { t: 'Status' }];
  /* Periodo de reporte e relatorios que a milestone alimenta */
  var tagPer = function (m) { var p = P.periodo(m.periodo); return p ? '<span class="ps-per' + (p.tipo === 'ano' ? ' ano' : '') + '" title="Reporting period ' + e(P.fmtData(p.ini)) + ' to ' + e(P.fmtData(p.fim)) + '">' + e(p.nome) + '</span>' : ''; };
  var tagsRel = function (m, max) {
    var l = P.relatoriosDe(m), mostrar = max ? l.slice(0, max) : l;
    return mostrar.map(function (r) { return '<span class="ps-rel-t" title="' + e(r.nome + ', ' + r.entidade + ', due ' + P.fmtDataAno(r.data)) + '">' + e(r.sigla) + '</span>'; }).join('') + (max && l.length > max ? '<span class="ps-rel-t mais">+' + (l.length - max) + '</span>' : '');
  };
  var tagsMs = function (m, max) { return '<span class="ps-per-l">' + tagPer(m) + tagsRel(m, max) + '</span>'; };
  P.tagPer = tagPer; P.tagsMs = tagsMs;
  /* Estado de cada indicador de uma task, para o donut: aprovado, em aprovacao (submetido), preenchido, por preencher */
  var EST_IND = [['ap', 'Approved', 'ok'], ['sub', 'Submitted, in approval', 'rev'], ['pre', 'Filled in, to submit', 'info'], ['falta', 'To fill in', '']];
  var contaInd = function (m) {
    var n = { ap: 0, sub: 0, pre: 0, falta: 0 }, conc = P.concluida(m), p = P.passoAtual(m), emRec = p && p.tipo === 'recolha';
    m.indicadores.forEach(function (id) {
      var it = P.item(id, P.chave(m)), tem = !!it && (it.valor !== null || !!it.rascunho);
      if (conc || (it && it.revisto)) n.ap++;
      else if (!emRec || (it && it.submetido)) n.sub++;
      else if (tem) n.pre++;
      else n.falta++;
    });
    n.tot = m.indicadores.length;
    return n;
  };
  /* Donut pequeno: um segmento por estado, separados por 2px; o centro diz quantos faltam reportar.
     A cor nunca vai sozinha: o texto ao lado e a tooltip dizem os numeros. */
  var donutInd = function (m, compacto) {
    var n = contaInd(m), R0 = 15, C = 2 * Math.PI * R0, gap = n.tot > 1 ? 2 : 0, acc = 0;
    var porReportar = n.pre + n.falta;
    var segs = EST_IND.map(function (x) {
      var v = n[x[0]]; if (!v) return '';
      var len = C * v / n.tot, d = Math.max(0, len - (v === n.tot ? 0 : gap));
      var sg = '<circle class="dn-s ' + (x[2] || 'vazio') + '" r="' + R0 + '" cx="20" cy="20" stroke-dasharray="' + d.toFixed(2) + ' ' + (C - d).toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '"></circle>';
      acc += len; return sg;
    }).join('');
    var at = P.atribuido(m), quem = P.concluida(m) ? 'Completed' : at ? 'Assigned to ' + at.nome + (at.tipo === 'pessoa' ? '' : ' (whole department)') : '';
    var tip = n.tot + ' indicator' + (n.tot === 1 ? '' : 's') + (quem ? '\n' + quem : '') + '\n\n' + (porReportar ? porReportar + ' still to report' : 'Nothing left to report') + '\n' + EST_IND.map(function (x) { return x[1] + ': ' + n[x[0]]; }).join('\n');
    return '<span class="dn" tabindex="0" data-tip="' + e(tip) + '" aria-label="' + e(EST_IND.map(function (x) { return n[x[0]] + ' ' + x[1].toLowerCase(); }).join(', ')) + '"><svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><g transform="rotate(-90 20 20)">' + segs + '</g><text x="20" y="21" text-anchor="middle" dominant-baseline="middle">' + (porReportar || '✓') + '</text></svg>' + (compacto ? '</span>' :
      '<span class="dn-t"><b>' + (porReportar ? porReportar + ' to report' : n.ap === n.tot ? 'All approved' : 'All reported') + '</b><small>' + n.ap + ' of ' + n.tot + ' approved</small></span></span>');
  };
  P.donutInd = donutInd;
  /* No telemovel a linha vira cartao: titulo e estado em cima, empresa, responsavel e prazo numa linha por baixo */
  /* Prazo em duas linhas (data e, por baixo, quanto falta), para a tabela caber com o donut */
  var prazoDuasLinhas = function (m) { var t = prazoTxt(m), i = t.indexOf(' ('); return i < 0 ? '<span class="ps-nowrap">' + e(t) + '</span>' : '<span class="ps-nowrap">' + e(t.slice(0, i)) + '</span><br><small class="ps-mut ps-nowrap">' + e(t.slice(i + 2, -1)) + '</small>'; };
  var linhaTabMs = function (m) {
    var a = P.atribuido(m);
    var rels = tagsRel(m, 3);
    return { attrs: 'class="ps-tr-ms"', celulas: ['<div class="ms-dn-l">' + donutInd(m, true) + '<div class="ps-ms-cel"><div class="ps-ms-cel-t"><a href="' + rota('Milestone/' + m.id) + '">' + e(m.nome) + '</a><span class="ps-so-mob">' + estChip(m) + '</span></div>' + (rels ? '<span class="ps-per-l">' + rels + '</span>' : '') +
      '<span class="ps-so-mob ps-ms-meta">' + e(P.rotPeriodo(m)) + ', ' + empHtml(m.empresa) + (a ? ', ' + e(a.nome) : '') + ', due ' + e(prazoTxt(m)) + '</span></div></div>', tagPer(m) || '<span class="ps-mut">-</span>', empHtml(m.empresa), atribHtml(m), prazoDuasLinhas(m), estChip(m)] };
  };
  var chip = function (txt, cls) { return '<span class="ps-chip ' + (cls || '') + '">' + e(txt) + '</span>'; };
  /* O estado diz o que a pessoa tem de fazer quando a task esta com ela (To approve, To fill in...);
     o atraso aparece ao lado, sem tapar o que ha para fazer */
  var acaoDe = function (m) { var p = P.passoAtual(m); return !p ? '' : p.tipo === 'recolha' ? (m.devolvida ? 'Returned, to fix' : 'To fill in') : p.tipo === 'parecer' ? 'To give opinion' : p.tipo === 'revisao' ? 'To review' : 'To approve'; };
  var chipAtraso = function (m) { var d = P.diasAte(m.prazo); return !P.concluida(m) && d < 0 ? ' <span class="ps-tip-alvo" tabindex="0" data-tip="' + e('Due ' + P.fmtDataAno(m.prazo) + ', ' + Math.abs(d) + ' day' + (Math.abs(d) === 1 ? '' : 's') + ' ago') + '">' + chip('Overdue', 'err') + '</span>' : ''; };
  var estChip = function (m) {
    var s = P.estadoMs(m), usr = u(), p = P.passoAtual(m);
    if (p && !P.concluida(m) && usr && P.esperaPor(m, usr)) return chip(acaoDe(m), p.tipo === 'recolha' ? (m.devolvida ? 'err' : 'info') : 'rev') + chipAtraso(m);
    if (s.cod === 'atraso') return chip('In collection', 'info') + chipAtraso(m);
    return chip(s.txt, s.cls) + chipAtraso(m);
  };
  /* Iniciais do primeiro e do ultimo nome (Maria Joao Silva Costa da MC) */
  var iniciais = function (n) { var p = String(n).replace(/^Resp\.\s*/, '').split(/\s+/).filter(function (x) { return x.length > 2 || (x && x === x.toUpperCase()); }); return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; };
  var ICO_EQUIPA = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.3c2.4-.4 4.4 1.1 5 4.2"/></svg>';
  /* data-fx-ignorar: os filtros das tabelas leem o nome, nao as iniciais */
  var avPessoa = function (nome) { return '<i class="ps-avp" aria-hidden="true" data-fx-ignorar>' + e(iniciais(nome)) + '</i>'; };
  var avEquipa = function () { return '<i class="ps-avd" aria-hidden="true">' + ICO_EQUIPA + '</i>'; };
  var ICO_EMPRESA = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M2.5 21h19"/><path d="M8 8h3M8 12h3M8 16h3"/></svg>';
  var avEmpresa = function () { return '<i class="ps-ave" aria-hidden="true">' + ICO_EMPRESA + '</i>'; };
  var pessHtml = function (nome) { return '<span class="ps-pess">' + avPessoa(nome) + e(nome) + '</span>'; };
  var depHtml = function (nome) { return nome ? '<span class="ps-dep">' + avEquipa() + e(nome) + '</span>' : '<span class="ps-mut">-</span>'; };
  /* Empresa: sempre com o icone do edificio a esquerda, como as equipas */
  var empHtml = function (nome) { return nome ? '<span class="ps-empr">' + avEmpresa() + e(nome) + '</span>' : '<span class="ps-mut">-</span>'; };
  P.pessHtml = pessHtml; P.depHtml = depHtml; P.empHtml = empHtml;
  var quemHtml = function (nome) {
    if (!nome) return '<span class="ps-mut">-</span>';
    if (/^(System|Automatic|Sistema)$/i.test(nome)) return e(nome);
    var x = (S.users || []).filter(function (y) { return y.nome === nome; })[0];
    return x && x.perfil !== 'esg' && x.perfil !== 'ext' ? pessHtml(nome) : depHtml(nome);
  };
  P.quemHtml = quemHtml;
  var ICO_LAPIS = '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m14 6 4 4"/>';
  var cabCartao = function (t, ico, dir) { return '<div class="ps-card-head"><h2>' + (ico ? '<span class="ps-ic">' + svg(I[ico]) + '</span>' : '') + e(t) + '</h2>' + (dir || '') + '</div>'; };
  var vazio = function (t) { return '<div class="ps-vazio">' + e(t) + '</div>'; };
  var opt = function (val, txt, sel) { return '<option value="' + e(val) + '"' + (String(val) === String(sel) ? ' selected' : '') + '>' + e(txt === undefined ? val : txt) + '</option>'; };
  var campo = function (id, lab, html) { return '<div class="ps-campo"><label class="ps-lab" for="' + e(id) + '">' + e(lab) + '</label>' + html + '</div>'; };
  /* Seletor de ficheiro com botao proprio: o input nativo fica escondido e o nome escolhido aparece ao lado */
  var ficheiroHtml = function (id, aceita) {
    var tipos = String(aceita || '').split(',').filter(Boolean).map(function (x) { return x.replace('.', '').toUpperCase(); }).join(', ');
    return '<label class="ps-fic" for="' + e(id) + '"><input id="' + e(id) + '" class="ps-fic-in" type="file"' + (aceita ? ' accept="' + e(aceita) + '"' : '') + ' data-i="ficNome">' +
      '<span class="ps-fic-btn">' + svg(I.upload) + 'Choose file</span>' +
      '<span class="ps-fic-txt"><span class="ps-fic-nome">No file chosen</span>' + (tipos ? '<span class="ps-fic-tipos">' + e(tipos) + '</span>' : '') + '</span></label>';
  };
  /* "i" com a explicacao: aparece ao passar o rato, ao tocar ou com o teclado */
  var info = function (txt) { return '<button type="button" class="ps-info" data-tip="' + e(txt) + '" aria-label="' + e(txt) + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01"/></svg></button>'; };
  var tabela = function (cols, linhas, vaz) {
    if (!linhas.length) return vazio(vaz || 'Sem dados.');
    return '<div class="ps-tw"><table class="ps-t"><thead><tr>' + cols.map(function (c) { return '<th scope="col"' + (c.dir ? ' class="dir"' : '') + '>' + e(c.t) + (c.info ? info(c.info) : '') + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) {
        var cels = l.celulas || l;
        return '<tr' + (l.attrs ? ' ' + l.attrs : '') + '>' + cels.map(function (h, i) { return '<td' + (i === 0 ? ' class="prim"' : ' data-l="' + e(cols[i].t) + '"' + (cols[i].dir ? ' class="dir ps-num"' : '')) + '>' + h + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  };
  var miniWf = function (m) {
    return '<span class="ps-mini-wf" role="img" aria-label="Step ' + Math.min(m.passo_atual + 1, m.passos.length) + ' of ' + m.passos.length + '">' + m.passos.map(function (p, i) { return '<i class="' + (i < m.passo_atual ? 'ok' : i === m.passo_atual ? 'at' : '') + '" title="' + e(p.nome) + '"></i>'; }).join('') + '</span>';
  };
  var passoTxt = function (m) {
    if (P.concluida(m)) return 'All steps completed';
    var p = P.passoAtual(m);
    return p.nome + ': ' + P.nomeResp(m, p.responsavel);
  };
  var prazoTxt = function (m) {
    if (P.concluida(m)) return P.fmtData(m.prazo);
    var d = P.diasAte(m.prazo);
    return P.fmtData(m.prazo) + (d < 0 ? ' (' + Math.abs(d) + ' days ago)' : d === 0 ? ' (today)' : ' (in ' + d + ' days)');
  };
  var fmtV = function (id, v) { return P.fmtNum(v, P.cat(id).casas_decimais); };
  /* Campos de valor: os indicadores de contagem pedem um numero inteiro (teclado numerico e sem virgula) */
  var numAttr = function (id) { return P.inteiro(P.cat(id)) ? ' inputmode="numeric" data-int="1"' : ' inputmode="decimal"'; };
  /* "i" com a formula dos indicadores calculados, num tooltip com titulo e a formula em letra fixa */
  var infoFormula = function (id, sempre) {
    var c = P.cat(id), f = P.formulaTxt ? P.formulaTxt(id) : '';
    if (!f || f === 'Reported value' || (c.tipo !== 'derivado' && !sempre)) return '';
    var t = c.tipo === 'derivado' ? 'Formula' : 'How it is calculated';
    return '<button type="button" class="ps-info ps-info-f" data-tip="' + e(f) + '" data-tip-t="' + t + '" aria-label="' + e(t + ': ' + f) + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01"/></svg></button>';
  };
  var u = function () { return P.sessao(); };
  var doUtilizador = function (m, usr) { return P.daUnidade(usr) ? P.temUnidade(usr, m.unidade) || m.atribuido_a === usr.login : true; };
  var aviso = function (t, cls) { toast(t, cls); };
  var toastTimer = null;
  var toast = function (t, cls) {
    var el = document.querySelector('[data-toast]');
    if (!el) return;
    el.className = 'ps-toast ' + (cls || '');
    el.textContent = t;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 4600);
  };

  /* --- Marca ------------------------------------------------------------- */
  var nomeMarca = function () { return (S.marca && S.marca.nome) || P.MARCA_BASE.nome; };
  /* Monograma: a sigla entre parenteses, se existir (Record to Report (R2R) da R2R); senao, as iniciais das palavras com maiuscula (ESG Data Hub da EDH) */
  var sigla = function (n) {
    var x = /\(([^)]+)\)/.exec(n || '');
    if (x) return x[1];
    var p = String(n || '').split(/\s+/).filter(function (w) { return /^[A-ZÀ-Ý]/.test(w); });
    return p.length > 1 && p.length <= 4 ? p.map(function (w) { return w[0]; }).join('') : iniciais(n || 'P').toUpperCase();
  };
  var monograma = function () { return '<span class="ps-marca-mono" aria-hidden="true">' + e(sigla(nomeMarca())) + '</span>'; };
  var logoOuMono = function () {
    return S.marca.logotipo ? '<img src="' + e(S.marca.logotipo) + '" alt="' + e(nomeMarca()) + '" data-logo>' : monograma();
  };
  var pintarMarca = function () {
    document.querySelectorAll('[data-marca-c]').forEach(function (el) {
      var t = el.getAttribute('data-marca-c');
      if (t === 'cabecalho') {
        el.innerHTML = logoOuMono() + '<span class="ps-marca-txt">' + e(nomeMarca()) + (S.marca.subtitulo ? '<small>' + e(S.marca.subtitulo) + '</small>' : '') + '</span>';
      } else if (t === 'hero') {
        el.innerHTML = (S.marca.logotipo ? '<span class="ps-logo-chip"><img src="' + e(S.marca.logotipo) + '" alt="" data-logo></span>' : '') + '<h1>' + e(nomeMarca()) + '</h1>';
      } else if (t === 'nome') {
        el.textContent = nomeMarca();
      } else if (t === 'logo-claro') {
        el.innerHTML = S.marca.logotipo ? '<span class="ps-logo-chip"><img src="' + e(S.marca.logotipo) + '" alt="' + e(nomeMarca()) + '" data-logo></span>' : '<b>' + e(nomeMarca()) + '</b>';
      }
    });
  };
  window.PortalAoMudarMarca = function () { if (S.marca) pintarMarca(); };

  /* --- Cabecalho e navegacao --------------------------------------------- */
  var paginasPermitidas = function (usr) {
    if (!usr) return ['Entrada'];
    if (usr.perfil === 'ext') return ['Pedidos'];
    /* Quem contribui so precisa das suas milestones (com a folha) e do chat. O resto e para quem acompanha o reporte. */
    if (P.daUnidade(usr)) return ['Inicio', 'Milestones', 'Milestone', 'Documentos'];
    var base = ['Inicio', 'Milestones', 'Milestone', 'Timeline', 'Consolidado', 'Documentos', 'Evidencias', 'Relatorio', 'Historico', 'Auditoria'];
    if (usr.perfil !== 'auditor') base.push('Dados');
    if (P.gereTudo(usr) || usr.perfil === 'auditor') base.push('Dashboard', 'Aprovacoes', 'Estado', 'Trilho');
    if (P.gereTudo(usr)) base.push('Backoffice');
    return base;
  };
  /* O botao da timeline so aparece a quem tem a pagina */
  var botaoTl = function (t) { return paginasPermitidas(u()).indexOf('Timeline') > -1 ? '<a class="ps-btn peq ps-btn-tl" href="' + rota('Timeline') + '">' + svg(I.cal, 14) + e(t) + '</a>' : ''; };
  var ativaNav = function (pag) { return pag === 'Milestone' ? 'Milestones' : pag; };
  /* Espera por mim: o passo que e meu e tambem o pedido de ajuda que me fizeram */
  var esperaMim = function (m, usr) { return P.esperaPor(m, usr) || (!P.concluida(m) && S.ext.some(function (x) { return x.tipo === 'ajuda' && x.para === usr.login && x.milestone_id === m.id && x.estado === 'pendente'; })); };
  var pendentesDe = function (usr) { return P.msCiclo().filter(function (m) { return esperaMim(m, usr); }); };
  var pintarCabecalho = function () {
    var usr = u(), pag = U.rota.pag;
    document.body.classList.toggle('ps-sem-nav', !usr || pag === 'Entrada');
    document.querySelectorAll('[data-teste-tag]').forEach(function (t) { t.hidden = !P.teste(); });
    var h = document.querySelector('[data-cabecalho]');
    if (!h) return;
    h.hidden = !usr || pag === 'Entrada';
    if (h.hidden) { var bn = document.querySelector('[data-bnav]'); if (bn) bn.hidden = true; return; }
    var per = paginasPermitidas(usr);
    var mc = document.querySelector('[data-nav-marca]');
    if (mc) mc.setAttribute('href', rota(usr.perfil === 'ext' ? 'Pedidos' : 'Inicio'));
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var n = a.getAttribute('data-nav');
      a.hidden = per.indexOf(n) < 0;
      /* O atalho Data > Indicators so fica marcado no separador Indicators do Backoffice */
      var q = a.getAttribute('data-nav-q') || '', tabQ = /^tab=/.test(q) ? q.slice(4) : '';
      a.classList.toggle('on', ativaNav(pag) === n && (!tabQ || (U.boTab || 'indicadores') === tabQ));
      a.setAttribute('href', rota(n + (a.getAttribute('data-nav-q') ? '?' + a.getAttribute('data-nav-q') : '')));
      if (ativaNav(pag) === n) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var nPend = pendentesDe(usr).length;
    document.querySelectorAll('[data-campo="nav-pend"]').forEach(function (el) { el.textContent = nPend || ''; el.hidden = !nPend; });
    var nAprov = pendentesDe(usr).filter(function (m) { return P.passoAtual(m).tipo !== 'recolha'; }).length;
    document.querySelectorAll('[data-campo="nav-aprov"]').forEach(function (el) { el.textContent = nAprov || ''; el.hidden = !nAprov; });
    /* Cada grupo do cabecalho e um menu: esconde-se sem paginas visiveis e fica marcado quando tem a pagina atual */
    document.querySelectorAll('[data-nav-grp]').forEach(function (g) { var ls = [].slice.call(g.querySelectorAll('[data-nav]')); g.hidden = !ls.some(function (a) { return !a.hidden; }); g.classList.toggle('on', ls.some(function (a) { return a.classList.contains('on'); })); });
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.ps-h-drop')) document.activeElement.blur();
    var notifs = P.notificacoes(usr);
    var badge = document.querySelector('[data-campo="sino-n"]');
    if (badge) { badge.textContent = notifs.length; badge.hidden = !notifs.length; }
    var av = document.querySelector('[data-campo="avatar"]');
    if (av) { av.textContent = iniciais(usr.nome); av.title = usr.nome; av.classList.toggle('on', pag === 'Backoffice'); }
    var c = document.querySelector('[data-campo="ciclo"]');
    if (c) c.textContent = S.ciclo.ano;
    var bnav = document.querySelector('[data-bnav]');
    if (bnav) bnav.hidden = usr.perfil === 'ext';
    var menu = document.querySelector('[data-menu]');
    if (menu) {
      menu.hidden = !U.menu;
      if (U.menu === 'notif') {
        menu.innerHTML = '<div class="ps-menu-head"><b>Notifications</b>' + notifs.length + ' open</div><div class="ps-menu-sec">' + (notifs.length ? notifs.map(function (n) {
          return '<a class="ps-menu-it" href="' + rota(n.rota) + '" data-a="fecharMenu"><i class="ps-menu-dot ' + e(n.cls) + '"></i><span>' + e(n.texto) + '<small>' + e(n.sub) + '</small></span></a>';
        }).join('') : vazio('No notifications.')) + '</div>';
      } else if (U.menu === 'conta') {
        var amb = P.online() ? '' : P.teste()
          ? '<button class="ps-menu-it" type="button" data-a="ambienteLimpar">Clear test environment</button><button class="ps-menu-it" type="button" data-a="ambientePrincipal">Back to main environment</button>'
          : '<button class="ps-menu-it" type="button" data-a="ambienteTeste">Open test environment</button>';
        if (usr.perfil === 'admin') amb = '<button class="ps-menu-it" type="button" data-a="marcaAbrir">Brand<small>Logo, name and colours</small></button>' + amb;
        /* A administracao nao tem separador na barra de topo: fica aqui, na area Backoffice do avatar */
        var bo = per.indexOf('Backoffice') > -1 ? [['indicadores', 'Indicators', 'KPIs, owners, companies, Excel and tasks'], ['perimetro', 'Companies and perimeter', 'Group companies, ownership and consolidation'], ['utilizadores', 'Settings', 'Users, periods, workflow and the rest']] : [];
        var boHtml = bo.length ? '<div class="ps-menu-tit">Backoffice</div><div class="ps-menu-sec ps-menu-bo">' + bo.map(function (x) { var on = pag === 'Backoffice' && (x[0] === U.boTab || (x[0] === 'utilizadores' && ['indicadores', 'milestones', 'perimetro'].indexOf(U.boTab) < 0)); return '<a class="ps-menu-it' + (on ? ' on' : '') + '" href="' + rota('Backoffice?tab=' + x[0]) + '" data-a="fecharMenu"' + (on ? ' aria-current="page"' : '') + '>' + e(x[1]) + '<small>' + e(x[2]) + '</small></a>'; }).join('') + '</div>' : '';
        menu.innerHTML = '<div class="ps-menu-head"><b>' + e(usr.nome) + '</b>' + e(P.PERFIS[usr.perfil]) + (P.unidadesDe(usr).length ? ': ' + e(P.unidadesTxt(usr)) : '') + '</div>' + boHtml + '<div class="ps-menu-sec' + (bo.length ? ' ps-menu-sep' : '') + '"><button class="ps-menu-it" type="button" data-a="sair">' + (P.online() ? 'Sign out' : 'Switch profile') + '</button>' + amb + (window.PortalAcesso && window.PortalAcesso.nome() ? '<button class="ps-menu-it" type="button" data-a="acessoSair">Leave the platform<small>Signed in as ' + e(window.PortalAcesso.nome()) + '</small></button>' : '') + '</div>';
      }
    }
  };

  /* --- Entrada ----------------------------------------------------------- */
  var Blocos = {};
  Blocos['entrada-perfis'] = function () {
    if (P.online()) {
      return '<form class="ps-login" data-login>' +
        campo('lg-email', 'Email or username', '<input id="lg-email" class="ps-in" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required>') +
        campo('lg-senha', 'Password', '<input id="lg-senha" class="ps-in" type="password" autocomplete="current-password" required>') +
        (U.loginErro ? '<div class="ps-aviso err" role="alert">' + e(U.loginErro) + '</div>' : '') +
        '<button type="submit" class="ps-btn pri"' + (U.aEntrar ? ' disabled' : '') + '>' + (U.aEntrar ? 'Signing in' : 'Sign in') + '</button></form>';
    }
    var grupos = [['Administration', 'admin'], ['Sustainability', 'esg'], ['Data owners', 'resp'], ['Audit', 'auditor'], ['External entities', 'ext']];
    /* Ao lado de cada pessoa: quantas milestones tem e quantas esperam por ela */
    var resumo = function (x) {
      if (x.perfil === 'ext') return '';
      var minhas = P.msCiclo().filter(function (m) { return doUtilizador(m, x); }).length, esp = pendentesDe(x).length;
      if (!minhas && !esp) return '';
      return '<span class="ps-ent-n">' + (esp ? '<b>' + esp + '</b> waiting' : minhas + ' task' + (minhas === 1 ? '' : 's')) + '</span>';
    };
    return ambienteHtml() + grupos.map(function (g) {
      return '<div class="ps-ent-grp"><h3>' + e(g[0]) + '</h3>' + S.users.filter(function (x) { return x.perfil === g[1]; }).map(function (x) {
        return '<button type="button" class="ps-ent-p" data-a="entrar" data-v="' + e(x.login) + '"><span class="ps-av s" aria-hidden="true">' + e(iniciais(x.nome)) + '</span><span><b>' + e(x.nome) + '</b><small>' + e(P.unidadesTxt(x) || P.PERFIS[x.perfil]) + '</small></span>' + resumo(x) + '</button>';
      }).join('') + '</div>';
    }).join('');
  };
  /* Cartao do ambiente: entrar no ambiente de testes, ou sair dele e limpa-lo */
  var ambienteHtml = function () {
    if (P.teste()) {
      return '<div class="ps-amb on"><div><b>Test environment</b><p>Same people, companies, indicators and settings, with no tasks or values. What you do here never touches the main environment.' + (P.partilha && P.partilha.estado === 'ligado' ? ' It is shared online: everyone who opens this link sees the same and can enter as any profile.' : '') + '</p></div>' +
        '<div class="ps-amb-acts"><button type="button" class="ps-btn peq" data-a="ambienteLimpar">Clear test environment</button><button type="button" class="ps-btn peq pri" data-a="ambientePrincipal">Back to main environment</button></div></div>';
    }
    return '<div class="ps-amb"><div><b>Test environment</b><p>Start from an empty platform: assign tasks and follow each person step by step.</p></div>' +
      '<div class="ps-amb-acts"><button type="button" class="ps-btn peq" data-a="ambienteTeste">Open test environment</button></div></div>';
  };

  /* --- Inicio ------------------------------------------------------------ */
  /* Acoes da Home: juntam-se a A quando A existe (mais abaixo) */
  var AI = {};
  /* Progresso do reporte por KPI, o mesmo do Reporting status. Quem contribui ve so os seus KPIs. */
  var EST_KPI = [['aprovado', 'Approved', 'a'], ['aprovacao', 'In approval', 'v'], ['curso', 'In progress', 'c'], ['falta', 'Missing', 'f'], ['atraso', 'Overdue', 'x']];

  var pintarHero = function () {
    var usr = u(), set = function (k, v) { var el = document.querySelector('[data-campo="' + k + '"]'); if (el) el.textContent = v; };
    var h = new Date().getHours();
    set('hero-ola', (h < 13 ? 'Good morning' : h < 20 ? 'Good afternoon' : 'Good evening') + ', ' + usr.nome);
  };
  Blocos['inicio-estado'] = function () {
    var usr = u(), gestao = P.gereTudo(usr) || usr.perfil === 'auditor';
    if (!gestao) return estadoMinhas(usr);
    var l = P.pontosCiclo(), n = {}, tot = l.length, vePag = paginasPermitidas(usr).indexOf('Estado') > -1;
    EST_KPI.forEach(function (x) { n[x[0]] = 0; });
    l.forEach(function (x) { n[x.s.cod]++; });
    var pct = function (v) { return tot ? (v / tot) * 100 : 0; }, feito = Math.round(pct(n.aprovado)), comValor = l.filter(function (x) { var it = P.item(x.id, P.chave(x.m)); return it && it.valor !== null; }).length;
    var item = function (x) {
      var dentro = '<i class="' + x[2] + '"></i><span>' + e(x[1]) + '</span><b>' + n[x[0]] + '</b>';
      return vePag ? '<button type="button" class="ps-est-i" data-a="iniEstado" data-v="' + x[0] + '">' + dentro + '</button>' : '<span class="ps-est-i">' + dentro + '</span>';
    };
    return '<div class="ps-est-c"><div class="ps-est-t"><div><span class="ps-est-l">Reporting status ' + e(S.ciclo.ano) + '</span><b class="ps-est-v">' + feito + '%<small>approved</small></b></div>' +
      (vePag ? '<button type="button" class="ps-gk-cta" data-a="iniEstado" data-v="todos">Open status →</button>' : '') + '</div>' +
      '<div class="ps-est-bar" role="img" aria-label="' + e(EST_KPI.map(function (x) { return x[1] + ' ' + n[x[0]]; }).join(', ') + ', of ' + tot + ' data points') + '">' + EST_KPI.map(function (x) { return n[x[0]] ? '<i class="' + x[2] + '" style="width:' + pct(n[x[0]]) + '%"></i>' : ''; }).join('') + '</div>' +
      '<div class="ps-est-n">' + EST_KPI.map(item).join('') + '</div><small class="ps-est-s">' + tot + ' data points (indicator per period) in the ' + e(S.ciclo.ano) + ' cycle, ' + comValor + ' with a value</small></div>';
  };
  /* Data owner: so as suas tasks, por estado. Os tres primeiros filtram o cartao Tasks. */
  var EST_MEU = [['falta', 'To fill in', 'f', 'falta'], ['atraso', 'Overdue or returned', 'x', 'atraso'], ['curso', 'Filled in, to submit', 'c', 'preenchido'], ['aprovacao', 'In review', 'v', ''], ['aprovado', 'Approved', 'a', '']];
  var estadoMinhas = function (usr) {
    var l = P.pontosCiclo(function (m) { return doUtilizador(m, usr); }), n = {}, tot = l.length;
    EST_MEU.forEach(function (x) { n[x[0]] = 0; });
    l.forEach(function (x) { n[x.s.cod]++; });
    var abertas = n.falta + n.atraso + n.curso;
    var item = function (x) {
      var dentro = '<i class="' + x[2] + '"></i><span>' + e(x[1]) + '</span><b>' + n[x[0]] + '</b>';
      return x[3] && n[x[0]] ? '<button type="button" class="ps-est-i" data-a="iniMinhas" data-v="' + x[3] + '">' + dentro + '</button>' : '<span class="ps-est-i">' + dentro + '</span>';
    };
    return '<div class="ps-est-c"><div class="ps-est-t"><div><span class="ps-est-l">Your tasks, ' + e(S.ciclo.ano) + '</span><b class="ps-est-v">' + abertas + '<small>' + (abertas === 1 ? 'value to report' : 'values to report') + '</small></b></div>' +
      (abertas ? '<button type="button" class="ps-gk-cta" data-a="iniMinhas" data-v="todos">Go to my tasks →</button>' : '') + '</div>' +
      '<div class="ps-est-bar" role="img" aria-label="' + e(EST_MEU.map(function (x) { return x[1] + ' ' + n[x[0]]; }).join(', ')) + '">' + EST_MEU.map(function (x) { return n[x[0]] ? '<i class="' + x[2] + '" style="width:' + (tot ? n[x[0]] / tot * 100 : 0) + '%"></i>' : ''; }).join('') + '</div>' +
      '<div class="ps-est-n">' + EST_MEU.map(item).join('') + '</div><small class="ps-est-s">' + tot + ' data points of your departments and tasks</small></div>';
  };
  AI.iniMinhas = function (d) {
    U.tarEsc = 'minhas'; U.tarF = { q: '', grupo: '', est: d.v === 'todos' ? 'todos' : d.v }; U.tarTodas = false; R();
    var c = document.querySelector('[data-bloco=inicio-tarefas]'); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  AI.iniEstado = function (d) { U.est = U.est || {}; U.est.norma = ''; U.est.empresa = ''; U.est.dono = ''; U.est.estado = d.v; P.irPara('Estado'); };

  /* My tasks: uma linha por KPI e periodo do que espera por mim. A gestao pode ver tambem o que esta em aberto com toda a gente. */
  /* Estado de um KPI numa task: o que ha para fazer com ele; o atraso vem a parte (atraso: true) */
  var estadoTarefa = function (m, id) {
    var p = P.passoAtual(m), usr = u(), atraso = !P.concluida(m) && P.diasAte(m.prazo) < 0;
    if (!p) return { txt: 'Completed', cls: 'ok' };
    if (p.tipo === 'recolha') {
      if (m.devolvida) return { txt: 'Returned, to fix', cls: 'err', atraso: atraso };
      var it = P.item(id, P.chave(m)), vazio2 = !it || (it.valor === null && !it.rascunho);
      if (it && it.submetido) return { txt: P.etapaInd(m, id) === 'area' ? 'Submitted, with the area head' : it.revisto ? 'Approved' : 'Submitted, with sustainability', cls: it.revisto ? 'ok' : 'rev', atraso: false };
      return vazio2 ? { txt: 'To fill in', cls: '', atraso: atraso } : { txt: 'Filled in, to submit', cls: 'info', atraso: atraso };
    }
    if (usr && P.esperaPor(m, usr)) return { txt: acaoDe(m), cls: 'rev', atraso: atraso };
    var s = P.estadoMs(m);
    return { txt: s.txt, cls: s.cls, atraso: atraso };
  };
  P.chipEstadoTarefa = function (m, st) { return chip(st.txt, st.cls) + (st.atraso ? chipAtraso(m) : ''); };
  var ctaPasso = function (m) { var p = P.passoAtual(m); return !p ? '' : p.tipo === 'recolha' ? 'Fill in' : p.tipo === 'parecer' ? 'Give opinion' : p.tipo === 'aprovacao' || p.tipo === 'area' ? 'Approve' : 'Review'; };
  var abertas = function () { return P.msCiclo().filter(function (m) { return !P.concluida(m) && m.periodicidade !== 'Novos dados ESRS'; }); };
  /* O cartao Tasks (filtros e folha de reporte) esta em portal-tarefas.js */
  AI.tarEsc = function (d) { U.tarEsc = d.v; U.tarTodas = false; R(); };
  AI.tarTodas = function () { U.tarTodas = !U.tarTodas; R(); };
  AI.tarOffline = function () {
    var usr = u(), lista = (P.gereTudo(usr) && U.tarEsc === 'todas' ? abertas() : pendentesDe(usr)).filter(function (m) { return P.podePreencher(m, usr); });
    if (P.abrirOffline) P.abrirOffline(lista.map(function (m) { return m.id; }));
  };
  var classeCal = function (m) { var c = P.estadoMs(m).cod; return c === 'concluida' ? 'ok' : (c === 'atraso' || c === 'devolvida') ? 'err' : (c === 'revisao' || c === 'parecer' || c === 'aprovacao') ? 'rev' : ''; };
  var calendario = function (lista, pref) {
    var hoje = new Date();
    if (!U.cal) U.cal = { ano: hoje.getFullYear(), mes: hoje.getMonth(), dia: hoje.getDate() };
    var a = U.cal.ano, me = U.cal.mes, prim = new Date(a, me, 1), n = new Date(a, me + 1, 0).getDate(), desloc = (prim.getDay() + 6) % 7, iso = function (d) { return a + '-' + String(me + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); };
    var porDia = {};
    lista.forEach(function (m) { (porDia[m.prazo] = porDia[m.prazo] || []).push(m); });
    var cel = '';
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(function (x) { cel += '<div class="ps-cal-sem" aria-hidden="true">' + x + '</div>'; });
    for (var i = 0; i < desloc; i++) cel += '<div></div>';
    for (var d = 1; d <= n; d++) {
      var ms = porDia[iso(d)] || [], cl = ['ps-cal-d'];
      if (iso(d) === P.hojeISO()) cl.push('hoje');
      if (d === U.cal.dia) cl.push('sel');
      cel += '<button type="button" id="' + pref + d + '" class="' + cl.join(' ') + '" data-a="calDia" data-v="' + d + '" aria-label="' + d + ', ' + ms.length + ' deadlines"' + (d === U.cal.dia ? ' aria-pressed="true"' : '') + '>' + d + (ms.length ? '<span class="pts">' + ms.slice(0, 3).map(function (m) { return '<i class="' + classeCal(m) + '"></i>'; }).join('') + '</span>' : '') + '</button>';
    }
    /* O calendario so mostra milestones pelo prazo. As janelas de reporte (Revisao mensal, Recolha mensal...) ficam em Backoffice, Calendar. */
    var ds = U.cal.dia, msDia = porDia[iso(ds)] || [];
    var nomeMes = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(prim);
    return '<aside class="ps-cal ps-fundo-marca" aria-label="Calendar"><div class="ps-cal-h"><h2>Calendar</h2><div class="ps-cal-nav"><button type="button" data-a="calMes" data-v="-1" aria-label="Previous month">‹</button><button type="button" data-a="calHoje">Today</button><button type="button" data-a="calMes" data-v="1" aria-label="Next month">›</button></div></div>' +
      '<div class="ps-cal-mes">' + e(nomeMes) + '</div><div class="ps-cal-g">' + cel + '</div>' +
      '<div class="ps-cal-leg"><span><i></i>In collection</span><span><i class="err"></i>Overdue or returned</span><span><i class="rev"></i>In review</span><span><i class="ok"></i>Completed</span></div>' +
      '<div class="ps-cal-det"><h3>' + e(P.fmtDataAno(iso(ds))) + '</h3>' +
      (msDia.length ? msDia.map(function (m) { return '<a href="' + rota('Milestone/' + m.id) + '">' + e(m.nome) + '</a>'; }).join('') : '<div class="ps-mut">No tasks due on this day.</div>') + '</div></aside>';
  };
  Blocos['inicio-calendario'] = function () { return calendario(P.msCiclo(), 'cal-'); };

  /* --- Timeline dos periodos de reporte ----------------------------------- */
  var timeline = function () {
    var ano = S.ciclo.ano, ini = new Date(ano + '-01-01T12:00:00'), fim = new Date((ano + 1) + '-08-01T12:00:00'), tot = fim - ini;
    var x = function (iso) { return Math.max(0, Math.min(100, ((new Date(iso + 'T12:00:00') - ini) / tot) * 100)); };
    var pers = (S.periodos || []).filter(function (p) { return p.ano === ano; }), rels = (S.relatorios || []).filter(function (r) { return r.periodo.indexOf(String(ano)) === 0 && (!U.sd || !U.sd.ent || r.entidade === U.sd.ent); });
    var hoje = P.hojeISO(), f = U.msFiltro || {};
    var estado = function (p) {
      var l = P.msPeriodo(p.id), conc = l.filter(P.concluida).length, atr = l.filter(function (m) { return P.estadoMs(m).cod === 'atraso'; }).length;
      var cls = l.length && conc === l.length ? 'ok' : hoje > p.fecho ? 'err' : hoje >= p.ini ? 'at' : '';
      return { cls: atr && cls !== 'ok' ? 'err' : cls, txt: !l.length ? 'No tasks' : conc === l.length ? 'Approved' : conc + ' of ' + l.length + ' approved' + (atr ? ', ' + atr + ' overdue' : ''), n: l.length };
    };
    var meses = '';
    for (var k = 0; k < 19; k++) { var d = new Date(ano, k, 1), iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'; meses += '<span style="--x:' + x(iso).toFixed(2) + '">' + e(MESES_C[d.getMonth()]) + (d.getMonth() === 0 ? ' ' + d.getFullYear() : '') + '</span>'; }
    var barra = function (p, rot) {
      var s = estado(p), on = f.periodo === p.id;
      return '<a class="tlr-b ' + s.cls + (on ? ' on' : '') + '" href="' + rota('Milestones?periodo=' + encodeURIComponent(p.id)) + '" style="--x:' + x(p.ini).toFixed(2) + ';--w:' + (x(p.fim) - x(p.ini)).toFixed(2) + '" title="' + e(p.nome + ': data ' + P.fmtData(p.ini) + ' to ' + P.fmtData(p.fim) + ', internal close ' + P.fmtDataAno(p.fecho)) + '"><b>' + e(rot || p.nome) + '</b><small>' + e(s.txt) + '</small></a>' +
        '<span class="tlr-f ' + s.cls + '" style="--x:' + x(p.fecho).toFixed(2) + '" title="' + e('Internal close of ' + p.nome + ': ' + P.fmtDataAno(p.fecho)) + '"><i></i><small>Close ' + e(P.fmtData(p.fecho)) + '</small></span>';
    };
    /* Entregas a menos de 10 dias umas das outras ficam no mesmo marco, para nao se sobreporem */
    var grupos = [];
    rels.slice().sort(function (a, b) { return a.data < b.data ? -1 : 1; }).forEach(function (r) {
      var g = grupos[grupos.length - 1];
      if (g && P.diasAte(r.data) - P.diasAte(g.dt) < 10) g.l.push(r); else grupos.push({ dt: r.data, l: [r] });
    });
    var porData = {};
    grupos.forEach(function (g) { porData[g.dt] = g.l; });
    var marcos = Object.keys(porData).sort().map(function (dt, i) {
      var l = porData[dt], feito = l[l.length - 1].data < hoje;
      return '<span class="tlr-r' + (feito ? ' feito' : '') + (i % 2 ? ' baixo' : '') + '" style="--x:' + x(dt).toFixed(2) + '" title="' + e(l.map(function (r) { return r.nome + ' (' + r.entidade + '), ' + P.fmtDataAno(r.data) + '. ' + r.base; }).join('\n')) + '"><i></i><b>' + e(l.map(function (r) { return r.sigla; }).join(', ')) + '</b><small>' + e(l.length > 1 && l[l.length - 1].data !== dt ? P.fmtData(dt) + '–' + P.fmtData(l[l.length - 1].data) : P.fmtData(dt)) + '</small></span>';
    }).join('');
    var anoP = pers.filter(function (p) { return p.tipo === 'ano'; })[0];
    var lista = rels.slice().sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    /* Telemovel: a mesma informacao na vertical, por ordem de data, com o dia de hoje no sitio certo */
    var itens = pers.map(function (p) { return { d: p.fim, p: p }; }).concat(lista.map(function (r) { return { d: r.data, r: r }; }));
    itens.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : a.p ? -1 : 1; });
    var vert = '', hojePosto = false;
    itens.forEach(function (it) {
      if (!hojePosto && it.d >= hoje) { vert += '<li class="tlv-hoje"><span>Today: ' + e(P.fmtDataAno(hoje)) + '</span></li>'; hojePosto = true; }
      if (it.p) {
        var p = it.p, st = estado(p), l = P.msPeriodo(p.id), conc = l.filter(P.concluida).length, pct = l.length ? Math.round(conc / l.length * 100) : 0;
        vert += '<li class="tlv-p ' + st.cls + '"><a href="' + rota('Milestones?periodo=' + encodeURIComponent(p.id)) + '"><span class="tlv-pt"><b>' + e(p.nome) + '</b><em>' + e(st.cls === 'ok' ? 'Approved' : st.cls === 'err' ? 'Overdue' : st.cls === 'at' ? 'Open' : 'Upcoming') + '</em></span>' +
          '<span class="tlv-pd">Data ' + e(P.fmtData(p.ini)) + ' to ' + e(P.fmtData(p.fim)) + ', close ' + e(P.fmtDataAno(p.fecho)) + '</span>' +
          '<span class="tlv-barra" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span class="tlv-pn">' + e(st.txt) + '</span></a></li>';
      } else {
        var r = it.r, d = P.diasAte(r.data);
        vert += '<li class="tlv-r' + (d < 0 ? ' feito' : '') + '"><i aria-hidden="true"></i><span><b>' + e(r.sigla) + '</b> ' + e(r.nome) + '<small>' + e(r.entidade) + '</small></span><em>' + e(P.fmtData(r.data)) + '<small>' + (d < 0 ? 'done' : 'in ' + d + ' d') + '</small></em></li>';
      }
    });
    if (!hojePosto) vert += '<li class="tlv-hoje"><span>Today: ' + e(P.fmtDataAno(hoje)) + '</span></li>';
    return '<div class="ps-card ps-tlr">' + cabCartao('Reporting timeline ' + ano, 'cal', '<div class="ps-leg"><span><i class="ok"></i>Approved</span><span><i class="at"></i>Open</span><span><i class="err"></i>Overdue</span><span><i></i>Upcoming</span></div>') +
      '<div class="ps-card-body"><div class="tlr-sc" tabindex="0" aria-label="Reporting timeline, scroll sideways"><div class="tlr" role="img" aria-label="' + e(pers.map(function (p) { return p.nome + ', ' + estado(p).txt; }).join('; ')) + '">' +
      '<div class="tlr-m" aria-hidden="true">' + meses + '</div>' +
      '<div class="tlr-l"><span class="tlr-lt">Quarters</span>' + pers.filter(function (p) { return p.tipo === 'trimestre'; }).map(function (p) { return barra(p); }).join('') + '</div>' +
      (anoP ? '<div class="tlr-l"><span class="tlr-lt">Year</span>' + barra(anoP) + '<span class="tlr-cons" style="--x:' + x(anoP.fim).toFixed(2) + ';--w:' + (x(anoP.fecho) - x(anoP.fim)).toFixed(2) + '">Consolidation</span></div>' : '') +
      '<div class="tlr-l rel"><span class="tlr-lt">External</span>' + marcos + '</div>' +
      '<span class="tlr-hoje" style="--x:' + x(hoje).toFixed(2) + '"><small>Today</small></span></div></div>' +
      '<ol class="tlv">' + vert + '</ol>' +
      /* External deliveries saiu: o detalhe de cada entrega esta nos Outputs, logo abaixo */
      '</div></div>';
  };
  /* Indicadores de uma entrega externa: os que tem este tipo de entrega nos Reporting moments, no periodo da entrega */
  var tipoEntrega = function (r) { return String(r.id).split('-')[0]; };
  var indsEntrega = function (r) {
    var k = tipoEntrega(r);
    return S.cat.filter(function (c) { return P.indAtivo ? P.indAtivo(c) : true; }).filter(function (c) { return P.momentosDe(c.id).ent.indexOf(k) > -1; }).map(function (c) {
      var m = P.tarefaInd ? P.tarefaInd(c.id, r.periodo) : null, it = m ? P.item(c.id, P.chave(m)) : null;
      return { c: c, m: m, it: it, s: m ? P.estadoLinha(m, c.id) : { cod: 'nao', txt: 'Not sent', cls: '' } };
    });
  };
  var resumoEntrega = function (r) {
    var l = indsEntrega(r), n = { tot: l.length, ap: 0, valor: 0, nao: 0, l: l };
    l.forEach(function (x) { if (x.s.cod === 'aprovado') n.ap++; if (x.it && x.it.valor !== null) n.valor++; if (x.s.cod === 'nao') n.nao++; });
    return n;
  };
  var pnEntrega = function (a) {
    var r = (S.relatorios || []).filter(function (y) { return y.id === a.id; })[0];
    if (!r) return { t: 'External delivery', b: vazio('Delivery not found.'), p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Close</button>' };
    var n = resumoEntrega(r), d = P.diasAte(r.data), per = P.periodo(r.periodo), cnt = function (cod) { return n.l.filter(function (x) { return x.s.cod === cod; }).length; };
    var k = function (v, t, cls) { return '<div class="ki-impk ' + (cls || '') + '"><b>' + v + '</b><span>' + e(t) + '</span></div>'; };
    var linhas = n.l.sort(function (x, y) { var o = ['atraso', 'nao', 'falta', 'curso', 'aprovacao', 'aprovado']; return o.indexOf(x.s.cod) - o.indexOf(y.s.cod); }).map(function (x) {
      var rp = P.responsavelInd ? P.responsavelInd(x.c.id, x.m ? (S.ent.filter(function (y) { return y.nome === x.m.empresa; })[0] || {}).id : '') : null;
      return [linkFicha(x.c.id, x.c.id + ' ' + x.c.nome) + '<small class="ps-mut ps-blk">' + e(x.c.esrs_requisito || '') + '</small>', x.m ? empHtml(x.m.empresa) : P.empresasInd(x.c).map(function (y) { return empHtml(y.nome); }).join(' '),
        rp ? (rp.tipo === 'pessoa' ? pessHtml(rp.nome) : depHtml(rp.dep)) : '-', x.m ? '<a href="' + rota('Milestone/' + x.m.id) + '" data-a="fecharPainel">' + e(x.m.nome) + '</a><small class="ps-mut ps-blk">due ' + e(P.fmtData(x.m.prazo)) + '</small>' : '<span class="ps-mut">Not sent</span>',
        x.it && x.it.valor !== null ? '<b class="ps-num">' + e(fmtV(x.c.id, x.it.valor)) + '</b> <small class="ps-mut">' + e(x.c.unidade_medida) + '</small>' : '<span class="ps-mut">-</span>', chip(x.s.txt, x.s.cls)];
    });
    return { t: r.sigla + ', ' + r.nome, s: r.entidade + ', due ' + P.fmtDataAno(r.data) + (d < 0 ? ' (done)' : ' (in ' + d + ' days)') + (per ? ', data from ' + per.nome : ''), largo: true, cls: 'alto ki-pan',
      b: '<div class="ps-aviso">' + e(r.base) + '</div>' +
        '<div class="ki-impks ent-ks">' + k(n.tot, 'indicators needed') + k(n.ap, 'approved', 'ok') + k(cnt('aprovacao'), 'in approval', 'info') + k(cnt('curso'), 'filled in, to submit') + k(cnt('falta') + cnt('atraso'), 'missing or overdue', cnt('falta') + cnt('atraso') ? 'err' : '') + k(n.nao, 'task not sent', n.nao ? 'err' : '') + '</div>' +
        tabela([{ t: 'Indicator' }, { t: 'Company' }, { t: 'Responsible' }, { t: 'Task' }, { t: 'Value', dir: 1 }, { t: 'Status' }], linhas, 'No indicator is mapped to this delivery. Map them in Backoffice, Reporting moments.') +
        '<p class="ps-small ps-mut">The indicators come from the deliveries each indicator feeds. ' + (n.nao ? 'Indicators without a task can be sent in Backoffice, Indicators.' : '') + '</p>',
      p: (P.gereTudo(u()) ? '<a class="ps-btn" href="' + rota('Backoffice?tab=indicadores') + '" data-a="fecharPainel">Open Indicators</a>' : '') + '<span class="ps-sp-flex"></span><button type="button" class="ps-btn pri" data-a="fecharPainel">Close</button>' };
  };
  var MESES_C = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  /* Por baixo da timeline: as milestones em curso e o que cada uma ainda tem por reportar */
  U.tlEC = { per: '', falta: true };
  var emCurso = function () {
    var usr = u(), f = U.tlEC, ano = S.ciclo.ano;
    var todas = P.msCiclo().filter(function (m) { return !P.concluida(m) && (P.gereTudo(usr) || usr.perfil === 'auditor' || doUtilizador(m, usr)); });
    var faltaDe = function (m) { return m.indicadores.filter(function (id) { var it = P.item(id, P.chave(m)); return !it || (it.valor === null && !it.rascunho); }); };
    var l = todas.filter(function (m) { return (!f.per || m.periodo === f.per) && (!f.falta || faltaDe(m).length); }).sort(function (a2, b2) { return a2.prazo < b2.prazo ? -1 : a2.prazo > b2.prazo ? 1 : 0; });
    var nFalta = 0; l.forEach(function (m) { nFalta += faltaDe(m).length; });
    var pers = (S.periodos || []).filter(function (p) { return p.ano === ano && todas.some(function (m) { return m.periodo === p.id; }); });
    var filtros = '<div class="ps-filtros">' + campo('tl-per', 'Reporting period', '<select id="tl-per" class="ps-sel" data-c="tlEC" data-id="per">' + opt('', 'All periods', f.per) + pers.map(function (p) { return opt(p.id, p.nome + ' (' + todas.filter(function (m) { return m.periodo === p.id; }).length + ')', f.per); }).join('') + '</select>') +
      '<label class="ps-chk"><input id="tl-falta" type="checkbox" data-c="tlECFalta"' + (f.falta ? ' checked' : '') + '> Only tasks with values still to report</label></div>';
    var linhas = l.map(function (m) {
      var fl = faltaDe(m), tot = m.indicadores.length, feitos = tot - fl.length, pct = tot ? Math.round(feitos / tot * 100) : 0, p = P.passoAtual(m);
      var falta = fl.length ? '<div class="tl-falta"><span class="tl-falta-n">' + fl.length + ' of ' + tot + ' to report</span><span class="tl-falta-l">' + fl.slice(0, 4).map(function (id) { return '<button type="button" class="ps-tag tl-kpi" data-a="ficha" data-v="' + e(id) + '" title="' + e(P.cat(id).nome) + '">' + e(P.cat(id).nome) + '</button>'; }).join('') + (fl.length > 4 ? '<span class="ps-mut ps-small">and ' + (fl.length - 4) + ' more</span>' : '') + '</span></div>'
        : '<span class="ps-mut ps-small">' + (p && p.tipo === 'recolha' ? 'All values in, to submit' : 'All values in, ' + e(p ? p.nome.toLowerCase() : 'done')) + '</span>';
      return ['<a href="' + rota('Milestone/' + m.id) + '"><b>' + e(m.nome) + '</b></a><span class="tl-prog" aria-label="' + feitos + ' of ' + tot + ' reported"><i style="width:' + pct + '%"></i></span>', tagPer(m) || e(P.rotPeriodo(m)), empHtml(m.empresa), atribHtml(m), '<span class="ps-nowrap">' + e(prazoTxt(m)) + '</span>', estChip(m), falta];
    });
    return '<div class="ps-card ps-mt">' + cabCartao('Tasks in progress', 'tarefa', '<span class="ps-small ps-mut">' + l.length + ' task(s), ' + nFalta + ' value(s) still to report</span>') + '<div class="ps-card-body">' + filtros +
      tabela([{ t: 'Task' }, { t: 'Period' }, { t: 'Perimeter' }, { t: 'Assigned to' }, { t: 'Deadline' }, { t: 'Status' }, { t: 'Still to report' }], linhas, f.falta ? 'Every task in progress already has all its values.' : 'No task in progress.') + '</div></div>';
  };
  /* Outputs & Reporting Timeline: o filtro por destino (All, ERSAR, APA, ...) serve a timeline e os outputs */
  Blocos['timeline'] = function () {
    return (P.filtroSaidas ? '<div class="ps-sp-b ps-filtros">' + P.filtroSaidas() + '</div>' : '') + timeline() +
      (P.saidasHtml ? '<h2 class="ps-grupo-t ps-mt-l">Outputs</h2><p class="ps-small ps-mut">Each external delivery: how many values are approved and the files generated.</p>' + P.saidasHtml() : '') + emCurso();
  };

  /* --- Milestones -------------------------------------------------------- */
  /* All Tasks e para quem acompanha todo o reporte (administrador, equipa de sustentabilidade, auditor) */
  var veTodas = function (usr) { return !!usr && (P.gereTudo(usr) || usr.perfil === 'auditor'); };
  var msFiltradas = function () {
    var f = U.msFiltro, usr = u();
    return P.msCiclo().filter(function (m) {
      var c = P.estadoMs(m).cod;
      if (f.empresa && m.empresa !== f.empresa) return false;
      if (f.dep && m.departamentos.indexOf(f.dep) < 0) return false;
      if (f.periodo && m.periodo !== f.periodo) return false;
      /* My Tasks: o que espera por mim (preencher, aprovar, rever), incluindo indicadores submetidos a espera da minha aprovacao */
      if ((f.minhas || !veTodas(usr)) && !esperaMim(m, usr) && !(P.revParaMim && P.revParaMim(usr).some(function (r) { return r.m.id === m.id; }))) return false;
      if (f.estado === 'curso' && c === 'concluida') return false;
      if (f.estado === 'atraso' && c !== 'atraso') return false;
      if (f.estado === 'concluidas' && c !== 'concluida') return false;
      if (!f.esrs && m.periodicidade === 'Novos dados ESRS') return false;
      return true;
    }).sort(function (a, b) {
      /* O que esta em aberto vem primeiro, por prazo. O concluido fica no fim. */
      var ca = P.concluida(a) ? 1 : 0, cb = P.concluida(b) ? 1 : 0;
      return ca - cb || (a.prazo < b.prazo ? -1 : a.prazo > b.prazo ? 1 : 0);
    });
  };
  Blocos['milestones-empresas'] = function () {
    var f = U.msFiltro, ms = P.msCiclo();
    var cartao = function (href, nome, mono, l, on) {
      var conc = l.filter(P.concluida).length, atr = l.filter(function (m) { return P.estadoMs(m).cod === 'atraso'; }).length, pct = l.length ? Math.round((conc / l.length) * 100) : 0;
      return '<a class="ps-emp' + (on ? ' on' : '') + '" href="' + href + '"' + (on ? ' aria-current="true"' : '') + '><span class="ps-emp-mono" aria-hidden="true">' + e(mono) + '</span><span class="ps-emp-txt"><b>' + e(nome) + '</b><small>' + l.length + (l.length === 1 ? ' task' : ' tasks') + (atr ? ', <em>' + atr + ' overdue</em>' : '') + '</small><span class="ps-emp-barra" aria-hidden="true"><i style="width:' + pct + '%"></i></span><small>' + conc + ' of ' + l.length + ' completed</small></span></a>';
    };
    var daEmpresa = function (nome) { return ms.filter(function (m) { return m.empresa === nome; }); };
    var com = S.ent.filter(function (x) { return daEmpresa(x.nome).length; }), sem = S.ent.filter(function (x) { return !daEmpresa(x.nome).length; });
    var vis = com.concat(U.msEmpTodas ? sem : sem.filter(function (x) { return x.nome === f.empresa; }));
    return '<div class="ps-card"><div class="ps-card-head"><h2>Companies</h2>' + (sem.length ? '<button type="button" class="ps-btn liga" data-a="msEmpTodas">' + (U.msEmpTodas ? 'Show only companies with tasks' : 'Show ' + sem.length + ' more with no tasks') + '</button>' : '') + '</div><div class="ps-emps">' +
      cartao(rota('Milestones'), 'All companies', 'All', ms, !f.empresa) +
      vis.map(function (x) { return cartao(rota('Milestones?empresa=' + encodeURIComponent(x.id)), x.nome, iniciais(x.nome), daEmpresa(x.nome), f.empresa === x.nome); }).join('') + '</div></div>';
  };
  Blocos['milestones-calendario'] = function () {
    var f = U.msFiltro;
    return calendario(P.msCiclo().filter(function (m) { return !f.empresa || m.empresa === f.empresa; }), 'calm-');
  };
  var exportarMilestones = function (lista) {
    var linhas = [['Milestone', 'Period', 'Perimeter', 'Assigned to', 'Deadline', 'Status']].concat(lista.map(function (m) { var a = P.atribuido(m); return [m.nome, P.rotPeriodo(m), m.empresa, a ? a.nome : '', m.prazo, P.estadoMs(m).txt]; }));
    var wb = window.XLSX.utils.book_new(), ws = window.XLSX.utils.aoa_to_sheet(linhas);
    ws['!cols'] = [{ wch: 48 }, { wch: 12 }, { wch: 26 }, { wch: 32 }, { wch: 12 }, { wch: 18 }];
    window.XLSX.utils.book_append_sheet(wb, ws, 'Milestones');
    P.formatarNumerosXLSX(wb);
    window.XLSX.writeFile(wb, 'tasks.xlsx');
    toast('Excel file exported.', 'ok');
  };
  Blocos['milestones'] = function () {
    var f = U.msFiltro, lista = msFiltradas(), usrT = u(), todas = veTodas(usrT);
    var abas = todas ? '<div class="ps-mtabs ms-abas" role="tablist" aria-label="Which tasks"><button type="button" role="tab" aria-selected="' + !!f.minhas + '" class="' + (f.minhas ? 'on' : '') + '" data-a="msAba" data-v="minhas">My Tasks</button><button type="button" role="tab" aria-selected="' + !f.minhas + '" class="' + (!f.minhas ? 'on' : '') + '" data-a="msAba" data-v="todas">All Tasks</button></div>' : '';
    var filtros = abas + '<div class="ps-filtros">' + campo('f-per', 'Reporting period', '<select id="f-per" class="ps-sel" data-c="msPerF">' + opt('', 'All', f.periodo) + (S.periodos || []).filter(function (p) { return p.ano === S.ciclo.ano; }).map(function (p) { return opt(p.id, p.nome, f.periodo); }).join('') + '</select>') + campo('f-dep', 'Department', '<select id="f-dep" class="ps-sel" data-c="msDepF">' + opt('', 'All', f.dep) + P.UNIDADES.map(function (x) { return opt(x, x, f.dep); }).join('') + '</select>') +
      campo('f-es', 'Status', '<select id="f-es" class="ps-sel" data-c="msEstado">' + opt('curso', 'Ongoing', f.estado) + opt('atraso', 'Overdue', f.estado) + opt('concluidas', 'Completed', f.estado) + opt('todas', 'All', f.estado) + '</select>') +
      '<label class="ps-chk"><input id="f-esrs" type="checkbox" data-c="msEsrs"' + (f.esrs ? ' checked' : '') + '> Include ESRS track</label></div>';
    var dir = '<div class="ps-sp"><div class="ps-seg" role="group" aria-label="View"><button type="button" class="' + (U.msVista === 'lista' ? 'on' : '') + '" data-a="msVista" data-v="lista">Table</button><button type="button" class="' + (U.msVista === 'board' ? 'on' : '') + '" data-a="msVista" data-v="board">Board</button><button type="button" class="' + (U.msVista === 'kpi' ? 'on' : '') + '" data-a="msVista" data-v="kpi">By KPI</button></div>' + botaoTl('Timeline') + '<button type="button" class="ps-btn peq" data-a="msExcel"' + (lista.length ? '' : ' disabled') + '>Export to Excel</button></div>';
    var cab = cabCartao((f.empresa || 'All companies') + ' (' + lista.length + ')', 'tarefa', dir);
    if (!lista.length) return filtros + '<div class="ps-card">' + cab + vazio('No tasks match these filters.') + '</div>';
    if (U.msVista === 'board') {
      var cols = [['Collection', ['recolha', 'atraso', 'devolvida']], ['Review and opinion', ['revisao', 'parecer']], ['Approval', ['aprovacao']], ['Completed', ['concluida']]];
      return filtros + '<div class="ps-card">' + cab + '<div class="ps-card-body"><div class="ps-board">' + cols.map(function (c) {
        var it = lista.filter(function (m) { return c[1].indexOf(P.estadoMs(m).cod) > -1; });
        return '<div class="ps-board-col"><h3>' + e(c[0]) + '<span class="ps-n">' + it.length + '</span></h3>' + it.map(function (m) {
          return '<a class="ps-board-it" href="' + rota('Milestone/' + m.id) + '"><b>' + e(m.nome) + '</b>' + tagsMs(m, 2) + '<small class="ps-mut">' + empHtml(m.empresa) + '</small><div>' + atribHtml(m) + '</div><div class="ps-sp-b ps-mt">' + estChip(m) + '<span class="ps-mut ps-small">' + e(P.fmtData(m.prazo)) + '</span></div></a>';
        }).join('') + '</div>';
      }).join('') + '</div></div></div>';
    }
    if (U.msVista === 'kpi') {
      /* Por KPI: as mesmas tasks desagregadas, uma linha por indicador, com o estado de cada um */
      var linhasK = [];
      /* Ongoing tira os KPIs ja aprovados; Completed mostra so os aprovados (tambem os aprovados sozinhos em tasks abertas) */
      var listaK = f.estado === 'concluidas' ? P.msCiclo().filter(function (m) { return (!f.empresa || m.empresa === f.empresa) && (!f.periodo || m.periodo === f.periodo); }) : lista;
      listaK.forEach(function (m) { m.indicadores.forEach(function (id) { if (!P.cat(id)) return; var ap = P.indAprovado(m, id); if (f.estado === 'concluidas' ? ap : f.estado === 'todas' || !ap) linhasK.push({ m: m, id: id }); }); });
      return filtros + '<div class="ps-card">' + cabCartao((f.empresa || 'All companies') + ', ' + linhasK.length + ' KPIs in ' + lista.length + ' tasks', 'tarefa', dir) + '<div class="ps-card-body">' +
        tabela([{ t: 'KPI' }, { t: 'Task' }, { t: 'Period' }, { t: 'Perimeter' }, { t: 'Value', dir: 1 }, { t: 'Assigned to' }, { t: 'Deadline' }, { t: 'Status' }], linhasK.map(function (x) {
          var c = P.cat(x.id), it = P.item(x.id, P.chave(x.m)), st = estadoTarefa(x.m, x.id);
          return { attrs: 'class="ps-tr-tar"', celulas: ['<a href="' + rota('Milestone/' + x.m.id + '?ind=' + encodeURIComponent(x.id)) + '"><b>' + e(c.nome) + '</b></a><br><small class="ps-mut">' + e(x.id + ', ' + c.unidade_medida) + '</small>', '<a href="' + rota('Milestone/' + x.m.id) + '">' + e(x.m.nome) + '</a>', tagPer(x.m) || e(P.rotPeriodo(x.m)), empHtml(x.m.empresa), it && it.valor !== null ? '<span class="ps-num">' + e(fmtV(x.id, it.valor)) + '</span>' : '<span class="ps-mut">-</span>', atribKpi(x.m, x.id), '<span class="ps-nowrap">' + e(prazoTxt(x.m)) + '</span>', P.chipEstadoTarefa(x.m, st)] };
        }), 'No KPIs in these tasks.') + '</div></div>';
    }
    return filtros + '<div class="ps-card">' + cab + '<div class="ps-card-body">' + tabela(COLS_MS, lista.map(linhaTabMs)) + '</div></div>';
  };

  /* --- Milestone --------------------------------------------------------- */
  var PERIODO_TXT = { Mensal: 'Monthly', Trimestral: 'Quarterly', Anual: 'Annual', 'Novos dados ESRS': 'New ESRS data' };
  var msAtual = function () { return P.ms(U.rota.arg); };
  var preenchidos = function (m) { return m.indicadores.filter(function (id) { return P.item(id, P.chave(m)).valor !== null; }).length; };
  var usados = function (m) { var o = {}; m.indicadores.forEach(function (id) { P.cat(id).utilizado_por.forEach(function (x) { o[x] = 1; }); }); return Object.keys(o); };
  Blocos['milestone-cabecalho'] = function () {
    var m = msAtual(), d = P.diasAte(m.prazo);
    var ext = S.ext.filter(function (x) { return x.milestone_id === m.id; }).length;
    return '<nav class="ps-mig" aria-label="Breadcrumb"><a href="' + rota('Inicio') + '">Home</a><span>/</span><a href="' + rota('Milestones') + '">Tasks</a><span>/</span>    <a href="' + rotaEmp(m.empresa) + '">' + empHtml(m.empresa) + '</a><span>/</span><b>' + e(m.nome) + '</b></nav>' +
          '<div class="ps-ban"><div class="ps-ban-top"><div><div class="ps-ban-tags"><span class="ps-ban-tag">' + avEmpresa() + e(m.empresa) + '</span><span class="ps-ban-tag forte">' + e(P.rotPeriodo(m)) + '</span><span class="ps-ban-tag">' + e(m.consolida ? 'Annual consolidation' : PERIODO_TXT[m.periodicidade] || m.periodicidade) + '</span>' + (m.periodicidade === 'Novos dados ESRS' ? '<span class="ps-ban-tag">ESRS track</span>' : '') + (m.workflow_ajustado ? '<span class="ps-ban-tag">Adjusted workflow</span>' : '') + '</div>' +
      '<h1>' + e(m.nome) + '</h1><div class="ps-ban-sub">' + (function () { var p = P.periodo(m.periodo); return p ? 'Data from ' + e(P.fmtDataAno(p.ini)) + ' to ' + e(P.fmtDataAno(p.fim)) : 'Reporting year ' + e(m.ano); })() + ', ' + e(m.unidade) + '</div>' + (P.relatoriosDe(m).length ? '<div class="ps-ban-rel"><span>Feeds</span>' + P.relatoriosDe(m).map(function (r) { return '<span class="ps-ban-tag" title="' + e(r.base) + '">' + e(r.sigla + ', ' + r.entidade + ', ' + P.fmtDataAno(r.data)) + '</span>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="ps-ban-dir"><div class="ps-ban-pill"><small>Due</small>' + e(P.fmtDataAno(m.prazo)) + '</div>' + estChip(m) + '</div></div>' +
      '<div class="ps-ban-stats"><div class="ps-ban-stat"><b>' + preenchidos(m) + '/' + m.indicadores.length + '</b><span>Indicators filled in</span></div><div class="ps-ban-stat"><b>' + m.indicadores.filter(function (id) { return P.item(id, P.chave(m)).evidencias.length; }).length + '</b><span>With evidence</span></div><div class="ps-ban-stat"><b>' + ext + '</b><span>Assistance requests</span></div><div class="ps-ban-stat"><b>' + (P.concluida(m) ? '-' : d + 'd') + '</b><span>Until due</span></div></div></div>';
  };
  var quemAtual = function (m) { var a = P.atribuido(m); return !a ? '<span class="ps-mut">-</span>' : a.tipo === 'pessoa' ? pessHtml(a.nome) : depHtml(a.nome); };
  var podeReatribuir = function (m, usr) { var p = P.passoAtual(m); return !!p && !P.concluida(m) && p.tipo === 'recolha' && P.acompanha(m, usr); };
  Blocos['milestone-workflow'] = function () {
    var m = msAtual(), feitos = Math.min(m.passo_atual, m.passos.length), abertoH = !!U.wfHist[m.id];
    /* Submit por indicador: na recolha, os indicadores ja submetidos estao mais a frente. O passo mostra a parte feita
       e o passo seguinte mostra quantos ja chegaram la a espera do resto. */
    var pa = P.passoAtual(m), es = pa && pa.tipo === 'recolha' && !P.concluida(m) && P.estadoSubmissao ? P.estadoSubmissao(m) : null, parte = es && es.total ? es.submetidos / es.total : 0;
    var pct = Math.round(((feitos + parte) / m.passos.length) * 100);
    return '<div class="ps-card ps-mt">' + cabCartao('Task workflow', 'ativ', '<div class="ps-sp"><div class="ps-leg"><span><i class="ok"></i>Completed</span><span><i class="at"></i>Current</span><span><i></i>To do</span></div>' + '<button type="button" class="ps-wfh-btn' + (abertoH ? ' on' : '') + '" data-a="wfHist" aria-expanded="' + abertoH + '" aria-controls="wf-hist" title="' + (abertoH ? 'Hide the timeline' : 'Show the timeline of this workflow') + '"><span class="ps-wfh-ico">' + svg(I.relogio, 18) + '</span><span class="ps-wfh-txt">' + (abertoH ? 'Hide timeline' : 'Timeline') + '</span></button>' + (P.podeAlterarWorkflow(m, u()) ? '<button type="button" class="ps-btn peq" data-a="abrirWf">Change workflow</button>' : '') + '</div>') +
      '<div class="ps-wf-barra ps-mt" role="img" aria-label="' + pct + '% of steps completed"><i style="width:' + pct + '%"></i></div><div class="ps-wf">' + m.passos.map(function (p, i) {
        var c = i < m.passo_atual ? 'ok' : i === m.passo_atual ? (m.devolvida ? 'at dev' : 'at') : '';
        /* Indicadores submetidos antes da task: cada um aparece no passo onde esta (responsavel de area ou sustentabilidade) */
        var primEsg = m.passos.filter(function (q) { return q.responsavel === 'esg'; })[0], cnt = function (et) { return m.indicadores.filter(function (id) { return P.etapaInd(m, id) === et; }).length; };
        /* Cada numero tem uma tooltip com os indicadores */
        var lst = function (f) { return m.indicadores.filter(f); }, nomes = function (ids) { return ids.map(function (id) { return id + ' ' + P.cat(id).nome; }).join('\n'); };
        var etiq = function (ids, txt) { return ids.length ? '<span class="ps-wf-n-i" tabindex="0" data-tip="' + e(nomes(ids)) + '">' + ids.length + ' ' + txt + '</span>' : ''; };
        var lArea = lst(function (id) { return P.etapaInd(m, id) === 'area'; }), lEsg = lst(function (id) { return P.etapaInd(m, id) === 'esg'; }), lRev = lst(function (id) { var it = P.item(id, P.chave(m)); return it && it.submetido && it.revisto; }), lSub = lst(function (id) { return P.indSubmetido(m, id); });
        var parcial = es && es.submetidos && i === m.passo_atual, aqui = !es || !es.submetidos || i <= m.passo_atual ? '' : p.tipo === 'area' ? etiq(lArea, 'to approve') : p === primEsg ? etiq(lEsg, 'to review') : p.tipo === 'publicacao' ? etiq(lRev, 'published') : '', chegam = !!aqui;
        if (parcial) c += ' parcial';
        var anel = parcial ? ' style="--parte:' + Math.round(parte * 100) + '%" title="' + e(es.submetidos + ' of ' + es.total + ' indicators submitted') + '"' : '';
        return '<div class="ps-wf-p ' + c + '"' + (i === m.passo_atual ? ' aria-current="step"' : '') + anel + '><div class="ps-wf-n">' + e(p.nome) + '</div><div class="ps-wf-c">' + (i < m.passo_atual ? svg(I.tick, 18) : m.devolvida && i === m.passo_atual ? svg(I.voltar, 18) : i + 1) + '</div>' +
          (parcial ? '<div class="ps-wf-sub"><span class="ps-wf-n-i" tabindex="0" data-tip="' + e('Submitted:\n' + nomes(lSub) + (es.faltam ? '\n\nStill to submit: ' + es.faltam : '')) + '">' + es.submetidos + ' of ' + es.total + ' submitted</span></div>' : chegam ? '<div class="ps-wf-chega">' + aqui + '</div>' : '') + '<div class="ps-wf-r">' + (p.concluido_em ? '<b>' + e(P.fmtData(p.concluido_em)) + '</b><span class="ps-wf-q">' + quemHtml(p.concluido_por) + '</span>' : i === m.passo_atual ? '<b>Current</b><span class="ps-wf-q">' + quemAtual(m) + (podeReatribuir(m, u()) ? '<button type="button" class="ps-wf-edit" data-a="msAtrAbrir" aria-label="Change who it is assigned to" title="Change who it is assigned to">' + svg(ICO_LAPIS, 14) + '</button>' : '') + '</span>' : '<span class="ps-wf-q">' + quemHtml(P.nomeResp(m, p.responsavel)) + '</span>') + '</div></div>';
      }).join('') + '</div>' + (abertoH ? historicoHtml(m) : '') + '</div>';
  };
  /* Linha do tempo do workflow: para tras (com devolucoes), o passo atual e o que falta, com o tempo entre etapas */
  var historicoHtml = function (m) {
    var h = P.historicoWf(m), ICO = { criada: I.doc, avanco: I.tick, auto: I.ativ, devolucao: I.voltar };
    var NOME = { criada: 'Opened for collection', avanco: '', auto: '', devolucao: 'Returned' };
    var maxD = Math.max.apply(null, h.feito.map(function (x) { return x.dur || 0; }).concat([h.atual && h.atual.dur || 0, 1]));
    var lig = function (dur, cls, txt) { var w = dur ? Math.round(128 + 96 * Math.sqrt(dur / maxD)) : 120; return '<div class="ps-wfh-lig ' + (cls || '') + '" style="--w:' + w + 'px"><span>' + e(txt || P.fmtDur(dur)) + '</span></div>'; };
    var no = function (cls, ico, tit, sub, quando, extra) { return '<div class="ps-wfh-no ' + cls + '"><span class="ps-wfh-c" aria-hidden="true">' + svg(ico, 16) + '</span><b>' + e(tit) + '</b>' + (sub ? '<small>' + e(sub) + '</small>' : '') + (quando ? '<time>' + e(quando) + '</time>' : '') + (extra || '') + '</div>'; };
    var partes = [];
    h.feito.forEach(function (x, i) {
      if (i) partes.push(lig(x.dur, x.wf === 'devolucao' ? 'dev' : x.wf === 'auto' ? 'auto' : ''));
      var tit = x.wf === 'criada' ? NOME.criada : x.wf === 'devolucao' ? 'Returned from ' + x.passo : x.passo || x.texto;
      partes.push(no(x.wf, ICO[x.wf], tit, x.wf === 'criada' ? '' : x.por, P.fmtDataHora(x.em), x.motivo ? '<q>' + e(x.motivo.length > 90 ? x.motivo.slice(0, 88) + '…' : x.motivo) + '</q>' : ''));
    });
    if (h.atual) {
      if (partes.length) partes.push(lig(h.atual.dur, 'agora', P.fmtDur(h.atual.dur) + ' so far'));
      partes.push(no('atual' + (h.atual.devolvida ? ' dev' : ''), I.relogio, h.atual.passo, 'With ' + h.atual.resp, 'Now'));
      h.futuro.forEach(function (f) { partes.push(lig(null, 'fut', '')); partes.push(no('fut', f.auto ? I.ativ : I.tick, f.passo, f.auto ? 'Automatic' : f.resp, '')); });
      var d = P.diasAte(h.prazo);
      partes.push(lig(null, 'fut', '')); partes.push(no('prazo' + (d < 0 ? ' atr' : ''), I.cal, 'Due', d < 0 ? Math.abs(d) + ' days overdue' : d === 0 ? 'Today' : 'in ' + d + ' days', P.fmtDataAno(h.prazo)));
    } else partes.push(lig(null, 'fim', '')), partes.push(no('fim', I.tick, 'Completed', 'All steps done', ''));
    var stats = [['Elapsed', P.fmtDur(h.total) || '-'], ['Steps done', h.feito.filter(function (x) { return x.wf === 'avanco' || x.wf === 'auto'; }).length + ' of ' + m.passos.length], ['Longest step', h.maisLonga ? h.maisLonga.passo + ': ' + P.fmtDur(h.maisLonga.dur) : '-'], ['Returns', String(h.devolucoes)]];
    return '<div class="ps-wfh" id="wf-hist" role="region" aria-label="Workflow timeline"><dl class="ps-wfh-stats">' + stats.map(function (x) { return '<div><dt>' + e(x[0]) + '</dt><dd>' + e(x[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="ps-wfh-sc" tabindex="0" aria-label="Steps, scroll sideways"><div class="ps-wfh-trilho">' + partes.join('') + '</div></div></div>';
  };
  Blocos['milestone-corpo'] = function () {
    var m = msAtual(), usr = u(), decide = P.podeAgir(m, usr) && P.passoAtual(m).tipo !== 'recolha' && !(P.violaSegregacao && P.violaSegregacao(m, usr));
    var nAud = S.aud.filter(function (a) { var x = P.msDoIndicador(a.indicador_id, m.ano); return x && x.id === m.id && a.estado !== 'resolvido'; }).length;
    var nExt = S.ext.filter(function (x) { return x.milestone_id === m.id && x.estado !== 'aplicado'; }).length;
    /* Uma so pagina, pela ordem do trabalho: pedido, fontes e calculos, dados, ficheiros, exploracao, qualidade, terceiros, auditoria e conversa */
    var recolhe = !decide && P.podePreencher(m, usr);
    var secs = [['dados', 'Requested data', 0, cartaoTrimestres(m) + sepRecolha(m) + (decide ? caixaDecisao(m) : '')],
      ['evidencias', 'Evidence and quality', 0, sepEvidencias(m)], ['externos', 'Assistance requests', nExt, sepExternos(m)], ['auditoria', 'Audit', nAud, sepAuditoria(m)], ['conversa', 'Conversation and history', m.comentarios.length, (P.ext.sepConversa ? P.ext.sepConversa(m) : sepConversa(m))]];
    var indice = [['dados', secs[0][1]]].concat(secs.slice(1).map(function (s) { return [s[0], s[1], s[2]]; }));
    var tab = U.msTab[m.id] || 'trabalho', nDados = m.indicadores.filter(function (id) { return P.podeVerIndicador(P.cat(id), usr); }).length;
    var barra = '<div class="ps-mtabs" role="tablist" aria-label="Task views">' + [['trabalho', 'Work', ''], ['dados', 'Data store', nDados]].map(function (t) {
      return '<button type="button" role="tab" id="mtab-' + t[0] + '" aria-selected="' + (tab === t[0]) + '" aria-controls="mpan-' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '" data-a="msTab" data-v="' + t[0] + '">' + e(t[1]) + (t[2] ? ' <span class="ps-n">' + t[2] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
    if (tab === 'dados') return barra + '<div id="mpan-dados" role="tabpanel" aria-labelledby="mtab-dados" class="ps-col">' + sepExplorar(m) + '</div>';
    return barra + '<div id="mpan-trabalho" role="tabpanel" aria-labelledby="mtab-trabalho"><div class="ps-grid-side ps-ms-corrida"><div class="ps-col">' + secs.map(function (s) { return '<section id="sec-' + s[0] + '" class="ps-sec ps-col" aria-label="' + e(s[1]) + '">' + s[3] + '</section>'; }).join('') + barraAcao(m, usr, decide) + '</div>' +
      '<div class="ps-col ps-ms-lado"><nav class="ps-card ps-ms-indice" aria-label="On this page">' + cabCartao('On this page') + '<ul>' + indice.map(function (s) { return '<li><button type="button" class="ps-btn liga" data-a="sep" data-v="' + s[0] + '">' + e(s[1]) + (s[2] ? ' <span class="ps-n">' + s[2] + '</span>' : '') + '</button></li>'; }).join('') + '</ul></nav>' +
      '<button type="button" class="ps-btn ms-matriz-btn" data-a="matrizAbrir">' + svg(I.tabela, 16) + 'Traceability matrix</button>' +
      '<div class="ps-card">' + cabCartao('Details') + '<div class="ps-card-body"><dl class="ps-det"><dt>Company</dt><dd>' + (P.gereTudo(usr) ? '<span class="ps-empr">' + avEmpresa() + '<select id="ms-emp" class="ps-sel" aria-label="Company" data-c="msEmpresa">' + S.ent.map(function (x) { return opt(x.nome, x.nome, m.empresa); }).join('') + '</select></span>' : empHtml(m.empresa)) + '</dd><dt>Departments</dt><dd>' + editorTags(m, usr) + '</dd><dt>Unit</dt><dd>' + e(m.unidade) + '</dd><dt>Current step</dt><dd>' + e(P.concluida(m) ? 'Completed' : P.passoAtual(m).nome) + '</dd><dt>Assigned to</dt><dd>' + editorAtrib(m, usr) + '</dd><dt>Due</dt><dd>' + e(prazoTxt(m)) + '</dd><dt>Indicators</dt><dd>' + m.indicadores.length + '</dd></dl></div></div></div></div></div>';
  };
  /* Barra de acao: fica sempre a vista no fundo do ecra enquanto se trabalha na milestone */
  var barraAcao = function (m, usr, decide) {
    if (decide) {
      var p = P.passoAtual(m), rot = p.tipo === 'parecer' ? 'Give favourable opinion' : p.tipo === 'aprovacao' ? 'Approve and lock' : p.tipo === 'area' ? 'Approve and send to sustainability' : 'Complete review';
      return '<div class="ps-ms-acao" role="region" aria-label="Actions"><span class="ps-small">' + e(p.nome) + '</span><span class="ps-sp"><button type="button" class="ps-btn err" data-a="devolver">Return to the unit</button><button type="button" class="ps-btn pri" data-a="concluirPasso">' + e(rot) + '</button></span></div>';
    }
    if (!P.podePreencher(m, usr)) return '';
    var f = P.faltasSubmissao(m).length, feitos = preenchidos(m), es = P.estadoSubmissao(m);
    var guard = m.guardado ? '<small class="ps-mut">Saved ' + e(P.fmtDataHora(m.guardado.em)) + '</small>' : '';
    return '<div class="ps-ms-acao" role="region" aria-label="Actions"><span class="ps-small" aria-live="polite"><b>' + es.submetidos + ' of ' + es.total + '</b> submitted, ' + feitos + ' with a value' + (f ? '<span class="ps-mut">, ' + f + ' item' + (f === 1 ? '' : 's') + ' still missing</span>' : '<span class="ps-txt-ok">, ready to submit</span>') + '</span>' +
      '<span class="ps-sp">' + guard + '<button type="button" class="ps-btn" data-a="guardarTrab">Save</button>' + (es.prontos.length ? '<button type="button" class="ps-btn" data-a="indSubmeterProntos">Submit ' + es.prontos.length + ' ready</button>' : '') + '<button type="button" id="btn-submeter" class="ps-btn pri" data-a="submeter">Submit task</button></span></div>';
  };
  var editorAtrib = function (m, usr) {
    var p = P.passoAtual(m);
    if (!p || !podeReatribuir(m, usr)) return atribHtml(m);
    return '<span class="ps-det-atr">' + atribHtml(m) + '<button type="button" class="ps-wf-edit" data-a="msAtrAbrir" aria-label="Change who it is assigned to" title="Change who it is assigned to">' + svg(ICO_LAPIS, 14) + '</button></span>';
  };
  var editorTags = function (m, usr) {
    if (!P.acompanha(m, usr) || P.concluida(m)) return tagsDe(m);
    var livres = P.UNIDADES.filter(function (d) { return m.departamentos.indexOf(d) < 0; });
    return '<span class="ps-tags">' + m.departamentos.map(function (d) { return '<span class="ps-tag ps-tag-dep">' + avEquipa() + e(d) + '<button type="button" data-a="msTagDel" data-v="' + e(d) + '" aria-label="Remove ' + e(d) + '">×</button></span>'; }).join('') + '</span>' +
      (livres.length ? '<select id="ms-tag" class="ps-sel ps-mt" aria-label="Add department" data-c="msTagAdd">' + opt('', 'Add department') + livres.map(function (d) { return opt(d); }).join('') + '</select>' : '');
  };
  var celValor = function (m, id) { var it = P.item(id, P.chave(m)); return it.valor === null ? '-' : fmtV(id, it.valor); };
  var linkFicha = function (id, txt) { return '<button type="button" class="ps-btn liga" data-a="ficha" data-v="' + e(id) + '">' + e(txt || P.cat(id).nome) + '</button>'; };
  var marcaAmostra = function (id) { return S.amostra.indexOf(id) > -1 ? ' ' + chip('Sample', 'rev') : ''; };

  /* Requested data na recolha: uma linha simples por indicador, como na grelha. Fontes, definicao, qualidade, evidencia e ajuda abrem-se na seta.
     So a linha com erro abre sozinha. Um alerta (por exemplo depois de Pull data from system) fica no icone da linha, com o texto na tooltip, e a justificacao escreve-se ao abrir a seta. */
  var rqAberto = function (m, id) {
    var k = m.id + ':' + id;
    if (U.rqAberto[k] !== undefined) return U.rqAberto[k];
    var v = P.validarItem(P.item(id, P.chave(m)));
    return !!v.erros.length;
  };
  var ICO_ALERTA = '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>';
  var alertaHtml = function (m, id, v, it) {
    var falta = !String(it.justificacao || '').trim();
    var txt = v.alertas.join(' ') + (falta ? ' Open the row to write the justification.' : ' Justified: ' + String(it.justificacao).trim());
    return '<span class="rq2-al' + (falta ? '' : ' ok') + '" tabindex="0" role="img" aria-label="' + e(v.alertas.length + ' alert(s). ' + txt) + '" data-tip="' + e(txt) + '">' + svg(ICO_ALERTA, 15) + '<b>' + v.alertas.length + '</b></span>';
  };
  var sepRecolha = function (m) {
    /* Um so ecra para todos os perfis: o mesmo layout e os mesmos menus. So muda o que cada pessoa pode editar,
       pelo estado de cada indicador (em recolha com ela e ainda nao submetido). */
    var pode = P.podePreencher(m, u());
    var usr = u(), calcs = P.calculosMilestone ? P.calculosMilestone(m) : [], comFontes = P.camposMilestone ? P.camposMilestone(m).length > 0 : false, vistos = {};
    var todosAbertos = m.indicadores.every(function (id) { return rqAberto(m, id); });
    /* Submeter indicadores um a um: o filtro mostra o que falta submeter, nada se perde de vista */
    var est = P.estadoSubmissao(m), fil = (U.rqSub || {})[m.id] || 'todos';
    var linhas = m.indicadores.filter(function (id) { var sb = P.indSubmetido(m, id); return fil === 'todos' || (fil === 'sub' ? sb : !sb && !P.eOutput(P.cat(id))); }).map(function (id) {
      /* O estado submetido de cada indicador so conta na recolha; depois, o indicador segue o passo da task */
      var emRec = !P.concluida(m) && P.passoAtual(m) && P.passoAtual(m).tipo === 'recolha';
      var c = P.cat(id), it = P.item(id, P.chave(m)), v = P.validarItem(it), ant = P.valorAnterior(id, P.chave(m)), aberto = rqAberto(m, id), sub = emRec && it.submetido, saida = P.eOutput(c);
      var calc = calcs.filter(function (r) { return r.id === id; })[0], emCalc = !!(calc && calc.x && calc.valor !== null && it.daFonte);
      var txtBruto = it.rascunho || (it.valor === null ? '' : String(it.valor).replace('.', ','));
      var cls = v.erros.length ? 'erro' : v.alertas.length ? 'alerta' : '';
      var res = v.erros.length ? chip('Error', 'err') : v.alertas.length ? alertaHtml(m, id, v, it) : it.valor !== null ? chip('Valid', 'ok') : chip('To fill in');
      var ed = pode && !sub && !saida, prontoInd = pode && !sub && !saida && !P.faltasIndicador(m, id).length;
      if (saida) res = it.valor !== null ? chip('Calculated', 'info') : '<span class="ps-tip-alvo" tabindex="0" data-tip="Calculated by the platform from ' + e(P.codigosCalc(c.calc_codigos).join(', ')) + ' once they are submitted.">' + chip('Waiting for inputs') + '</span>';
      else if (sub && (it.revisto || P.podeReverInd(m, id, usr))) res = estadoRevHtml(m, id);
      else if (sub) res = '<span class="rq2-sub">' + chip(P.etapaInd(m, id) === 'area' ? 'With the area head' : 'With sustainability', 'rev') + '<small>' + e(sub.por + ', ' + P.fmtDataHora(sub.em)) + '</small><button type="button" class="ps-btn liga" data-a="indReabrir" data-v="' + e(id) + '">Reopen</button></span>';
      else if (it.devolvidoInd) res = res + '<span class="rev-dev" data-tip="' + e('Returned by ' + it.devolvidoInd.por + ', ' + P.fmtDataHora(it.devolvidoInd.em) + ': ' + it.devolvidoInd.comentario) + '" tabindex="0">' + chip('Returned', 'err') + '</span>';
      else if (prontoInd) res = res + '<button type="button" class="ps-btn peq pri rq2-subm" data-a="indSubmeter" data-v="' + e(id) + '">Submit</button>';
      var pedidos = S.ext.filter(function (x) { return x.indicador_id === id && x.milestone_id === m.id; });
      var recebido = pedidos.filter(function (x) { return x.estado === 'recebido'; })[0], pendente = pedidos.filter(function (x) { return x.estado === 'pendente'; })[0];
      var evTxt = P.evidenciaPrecisa(m, id) ? (it.evidencias.length ? '' : '<span class="rq2-b warn">Evidence required</span>') : '';
      var marcas = (emCalc ? '<span class="rq2-b calc">Calculated</span>' : '') + (P.inteiro(c) ? '<span class="rq2-b">Whole number</span>' : '') + evTxt + (it.evidencias.length ? '<span class="rq2-b">' + it.evidencias.length + ' evidence</span>' : '') +
        (it.qualidade === 'estimado' ? '<span class="rq2-b">Estimated</span>' : '') + (recebido ? '<span class="rq2-b ok">Value received</span>' : pendente ? '<span class="rq2-b">Assistance requested</span>' : '');
      var valor = !ed && !emCalc ? '<span class="rq2-calc ps-num rq2-fixo" title="' + (saida ? 'Calculated from ' + e(c.calc_codigos) : sub && pode ? 'Submitted: reopen it to change' : 'Read only at this step') + '">' + (it.valor === null ? '-' : e(fmtV(id, it.valor))) + '</span>' : emCalc ? '<span class="rq2-calc ps-num ' + cls + '" title="Calculated from the source data">' + e(fmtV(id, it.valor)) + '</span>'
        : '<input id="v-' + e(id) + '" class="ps-in ps-num rq2-in ' + cls + '"' + numAttr(id) + ' autocomplete="off" aria-label="Value ' + e(P.rotPeriodo(m) + ', ' + c.nome) + '" placeholder="-" value="' + e(txtBruto) + '" data-c="valor" data-id="' + e(id) + '"' + (v.erros.length ? ' aria-invalid="true" aria-describedby="err-' + e(id) + '"' : '') + '>';
      var linha = '<div class="rq2-l"><button type="button" class="rq2-seta" data-a="rqAbrir" data-v="' + e(id) + '" aria-expanded="' + aberto + '" aria-controls="rqd-' + e(id) + '" aria-label="' + (aberto ? 'Hide' : 'Show') + ' the details of ' + e(c.nome) + '">' + svg(I.baixo, 16) + '</button>' +
        '<div class="rq2-nome"><span class="rq2-nl"><button type="button" class="rq2-n" data-a="ficha" data-v="' + e(id) + '">' + e(c.nome) + '</button>' + infoFormula(id, emCalc) + '</span><small>' + e(id) + ', ' + e(c.unidade_medida) + marcas + '</small></div>' +
        '<div class="rq2-c rq2-ant"><span class="rq2-k">' + e(P.rotAnterior(P.chave(m))) + '</span><span class="ps-num">' + (ant === null || ant === undefined ? '-' : e(fmtV(id, ant))) + '</span></div>' +
        '<div class="rq2-c rq2-val"><span class="rq2-k">Value ' + e(P.rotPeriodo(m)) + '</span>' + valor + '</div>' +
        '<div class="rq2-c rq2-var"><span class="rq2-k">Change</span><span class="ps-num">' + (v.variacao === null ? '-' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1) + '%') + '</span></div>' +
        '<div class="rq2-c rq2-res">' + res + (P.botaoComentarInd ? P.botaoComentarInd(m, id) : '') + '</div></div>' +
        (v.erros.length ? '<div id="err-' + e(id) + '" class="ps-ind-msg rq2-msg" role="alert">' + e(v.erros[0]) + '</div>' : '');
      /* Indicador aprovado e publicado (sozinho, antes da task): a linha fica fechada, a verde agua */
      if (it.revisto && emRec) cls += ' fechado';
      if (!aberto) return '<div class="rq2-it ' + cls + '" id="ind-' + e(id) + '">' + linha + '</div>';
      /* So as linhas abertas mostram os dados de origem: o primeiro indicador aberto que usa um dado fica com o campo */
      var fontes = P.fontesDoIndicador ? P.fontesDoIndicador(m, id, vistos) : '';
      var esrs = P.esrsDe(id);
      var defin = '<div class="rq2-bl"><h4>Definition</h4>' + (esrs.desc ? '<p class="ps-ind-desc">' + e(esrs.desc) + '</p>' : '') +
        '<p class="ps-small ps-mut">' + (c.tipo === 'derivado' ? 'Derived' : 'Base data') + ', ' + e(c.perimetro) + (esrs.dps.length ? ', ' + e(esrs.dps[0]) : '') + '</p>' +
        (P.formulaTxt ? '<p class="ps-ind-form"><b>Formula:</b> ' + e(P.formulaTxt(id)) + '</p>' : '') +
        (emCalc ? '<p class="rq2-calc-f"><span class="ps-mono">' + e(calc.subst) + '</span> = <b>' + e(fmtV(id, calc.valor)) + '</b><small>Calculated from the source data. Change those values to change it.</small></p>' : calc && calc.x && comFontes ? '<p class="ps-small ps-mut">Fill in the source data and this value is calculated, or type it in the line above.</p>' : '') + '</div>';
      var origem = fontes ? '<div class="rq2-bl"><h4>Source data</h4>' + fontes + '</div>' : '';
      var just = v.alertas.length ? '<div class="ps-ind-just"><ul>' + v.alertas.map(function (a) { return '<li>' + e(a) + '</li>'; }).join('') + '</ul>' + (ed ? '<label class="ps-lab" for="j-' + e(id) + '">Justification (required)</label><textarea id="j-' + e(id) + '" class="ps-ta" data-c="just" data-id="' + e(id) + '">' + e(it.justificacao) + '</textarea>' : '<span class="ps-lab">Justification</span><p class="ps-small">' + (String(it.justificacao || '').trim() ? e(it.justificacao) : '<span class="ps-mut">None given.</span>') + '</p>') + '</div>' : '';
      var notaCarbono = P.eCarbono && P.eCarbono(c) ? '<div class="ps-aviso info ps-small rq2-carb">Enter the emissions you calculated outside the platform. If you can, attach the calculation (Excel or PDF) with <b>Attach evidence</b>, so the reviewers and the auditor can see how it was done.</div>' : '';
      var qual = notaCarbono + '<div class="rq2-ac">' + campo('q-' + id, 'Data quality', '<select id="q-' + e(id) + '" class="ps-sel" data-c="qual" data-id="' + e(id) + '"' + (ed ? '' : ' disabled') + '>' + opt('medido', 'Measured', it.qualidade) + opt('calculado', 'Calculated', it.qualidade) + opt('estimado', 'Estimated', it.qualidade) + '</select>') +
        (it.qualidade === 'estimado' ? campo('m-' + id, 'Estimation method' + (ed ? ' (required)' : ''), '<input id="m-' + e(id) + '" class="ps-in" value="' + e(it.metodo) + '" data-c="metodo" data-id="' + e(id) + '"' + (ed ? '' : ' readonly') + '>') : '') +
        '<div class="ps-sp">' + (ed ? '<button type="button" id="e-' + e(id) + '" class="ps-btn peq" data-a="anexar" data-v="' + e(id) + '">Attach evidence</button>' : '') + (P.evidenciaPrecisa(m, id) ? (it.evidencias.length ? chip('Evidence attached', 'ok') : chip('Evidence required', 'warn')) : (it.evidencias.length ? chip(it.evidencias.length + ' evidence item(s)', 'ok') : '')) +
        (ed && /^(MWh|kWh)$/.test(c.unidade_medida) && P.abrirLeituraFatura ? '<button type="button" class="ps-btn peq" data-a="fatLerInd" data-v="' + e(id) + '">' + svg(I.upload, 14) + 'Read invoice</button>' : '') +
        (ed ? '<button type="button" class="ps-btn peq" data-a="pedirAjuda" data-v="' + e(id) + '">Request assistance</button>' : '') + '</div>' + (it.evidencias.length || (P.extracaoDe && P.extracaoDe(m, id)) ? '<div class="fc-l rq2-ev"><span class="ps-lab">Evidence</span>' + (P.extracaoHtml ? P.extracaoHtml(m, id) : '') + P.fichLista(it.evidencias, m) + '</div>' : '') + '</div>';
      var ajuda = recebido ? '<div class="ps-aviso ok">' + e(recebido.entidade_externa) + ' sent ' + e(fmtV(id, recebido.valor)) + ' ' + e(c.unidade_medida) + (recebido.nota ? ': "' + e(recebido.nota) + '"' : '') + '. <button type="button" class="ps-btn peq" data-a="usarExt" data-v="' + e(recebido.id) + '">Use this value</button></div>'
        : pendente ? '<div class="ps-aviso">Waiting for ' + e(pendente.entidade_externa) + ', due ' + e(P.fmtData(pendente.prazo)) + '.</div>' : '';
      return '<div class="rq2-it on ' + cls + '" id="ind-' + e(id) + '">' + linha + '<div class="rq2-det" id="rqd-' + e(id) + '"><div class="rq2-det-g' + (origem ? '' : ' um') + '">' + defin + origem + '</div>' + just + qual + ajuda + '</div></div>';
    }).join('');
    var acomp = '<div class="rq2-acomp" role="group" aria-label="Submission"><div class="rq2-prog"><b>' + est.submetidos + ' of ' + est.total + ' submitted</b><span class="rq2-barra" aria-hidden="true"><i style="width:' + (est.total ? Math.round(est.submetidos / est.total * 100) : 0) + '%"></i></span><small>' + (P.concluida(m) ? 'Task completed.' : P.passoAtual(m).tipo !== 'recolha' ? 'Task submitted. Now at: ' + e(P.passoAtual(m).nome) + '.' : est.faltam ? est.faltam + ' still to submit' + (pode && est.prontos.length ? ', ' + est.prontos.length + ' ready now' : '') : 'All indicators submitted. Submit the task to send it for review.') + '</small></div>' +
      '<div class="ps-seg" role="group" aria-label="Show">' + [['todos', 'All ' + m.indicadores.length], ['falta', 'To submit ' + est.faltam], ['sub', 'Submitted ' + est.submetidos]].map(function (x) { return '<button type="button" class="' + (fil === x[0] ? 'on' : '') + '" data-a="rqSubFil" data-v="' + x[0] + '">' + e(x[1]) + '</button>'; }).join('') + '</div>' +
      (pode && est.prontos.length ? '<button type="button" class="ps-btn peq pri" data-a="indSubmeterProntos">Submit the ' + est.prontos.length + ' ready</button>' : '') + '</div>';
    var vistaLista = bannerRev(m) + acomp + '<div class="rq2"><div class="rq2-cab"><button type="button" class="ps-btn liga rq2-todos" data-a="rqTodos">' + (todosAbertos ? 'Collapse all' : 'Expand all') + '</button><span>Indicator</span><span class="rq2-dir">' + e(P.rotAnterior(P.chave(m))) + '</span><span class="rq2-dir">Value ' + e(P.rotPeriodo(m)) + '</span><span class="rq2-dir">Change</span><span>Status</span></div>' + (linhas || '<p class="ps-mut ps-small rq2-vazio">' + (fil === 'sub' ? 'Nothing submitted yet.' : 'Nothing left to submit.') + '</p>') + '</div>';
    /* Um so cartao: os valores entram no separador do ecra, os ficheiros no separador de upload */
    var tab = abaRecolha(m), aberta = !P.concluida(m) && pode, fechada = P.concluida(m);
    var porPreencher = m.indicadores.filter(function (id) { return P.item(id, P.chave(m)).valor === null; }).length;
    var fpFalta = P.ficheirosPedidos(m).filter(function (f) { return f.preciso && f.obrigatorio && !f.entregues.length; }).length, fpTotal = P.ficheirosPedidos(m).filter(function (f) { return f.preciso; }).length;
    var importar = aberta ? '<button type="button" class="ps-btn peq" data-a="wzAbrir">' + svg(I.tabela, 14) + 'Import from Excel</button>' : '';
    var pedir = P.gereTudo(usr) && !fechada ? '<button type="button" class="ps-btn peq" data-a="ficPedirAbrir">' + svg(I.upload, 14) + 'Request a file</button>' : '';
    var abas = [['ecra', I.lapis, 'Fill in on screen', porPreencher ? porPreencher + ' of ' + m.indicadores.length + ' to fill in' : 'All ' + m.indicadores.length + ' filled in', porPreencher ? 'warn' : 'ok'],
      ['fic', I.upload, 'Upload files', fpTotal ? (fpFalta ? fpFalta + ' to upload' : 'All delivered') : 'None required, other files welcome', fpFalta ? 'warn' : 'ok']];
    var barraAbas = '<div class="rq-abas" role="tablist" aria-label="How to enter the data">' + abas.map(function (a) {
      return '<button type="button" role="tab" id="rqa-' + a[0] + '" aria-selected="' + (tab === a[0]) + '" aria-controls="rqp-' + a[0] + '" class="rq-aba' + (tab === a[0] ? ' on' : '') + '" data-a="rqAba" data-v="' + a[0] + '"' + (a[0] === 'fic' && aberta ? ' data-dz="' + e(m.id) + '"' : '') + '>' +
        '<span class="rq-aba-ic" aria-hidden="true">' + svg(a[1], 18) + '</span><span class="rq-aba-t"><b>' + a[2] + '</b><small class="' + a[4] + '">' + e(a[3]) + '</small></span></button>';
    }).join('') + '</div>';
    var painelEcra = '<div class="rq-pan" role="tabpanel" id="rqp-ecra" aria-labelledby="rqa-ecra"' + (aberta ? ' data-dzx="' + e(m.id) + '"' : '') + '>' +
      '<div class="rq-barra"><p class="ps-small ps-mut">' + (aberta ? 'Type each value, paste from Excel in the grid, or drop an Excel file here to import it.' : fechada ? 'Task completed. Approved values only change by restatement.' : (P.podeAgir(m, usr) && P.violaSegregacao && P.violaSegregacao(m, usr) ? 'You submitted this task, so you cannot decide on it (segregation of duties). ' + (function () { var l = P.quemDecide(m), pes = l.filter(function (x) { return x.perfil !== 'admin'; }), adm = l.filter(function (x) { return x.perfil === 'admin'; }); return pes.length ? 'It is with ' + e(pes.map(function (x) { return x.nome; }).join(', ')) + '.' : adm.length ? 'Nobody else in ' + e(P.nomeResp(m, P.passoAtual(m).responsavel)) + ' can approve it: the administrator (' + e(adm.map(function (x) { return x.nome; }).join(', ')) + ') has to, or add another person to that team.' : 'Nobody else can approve it yet.'; })() : P.podeAgir(m, usr) ? 'This step is with you (' + e(P.passoAtual(m).nome) + '). Check the values below, then approve or return at the bottom.' : 'Read only for you at this step: ' + e(P.passoAtual(m).nome) + ', with ' + e(P.nomeResp(m, P.passoAtual(m).responsavel)) + '.')) + '</p>' + ferrEcra(m) + '</div>' +
      (U.dadosVista === 'grid' ? corpoGrelha(m) : vistaLista) + (aberta ? '<div class="rq-solta-x" aria-hidden="true">' + svg(I.tabela, 26) + '<b>Drop the Excel to import its values</b><small>You choose what goes where before anything is saved.</small></div>' : '') + '</div>';
    var painelFic = '<div class="rq-pan rq-pan-fic" role="tabpanel" id="rqp-fic" aria-labelledby="rqa-fic"' + (aberta ? ' data-dz="' + e(m.id) + '"' : '') + '>' + cartaoFicheiros(m, true) + '</div>';
    return '<div class="ps-card rq-uni" id="rq-dados">' + cabCartao('Requested data', 'tarefa', '<div class="ps-sp">' + (P.fontesAcoes ? P.fontesAcoes(m) : '') + importar + pedir + '</div>') +
      barraAbas + (tab === 'fic' ? painelFic : painelEcra) + '</div>';
  };
  var abaRecolha = function (m) { return (U.rqAba || {})[m.id] || 'ecra'; };
  var irAba = function (m, aba) { U.rqAba = U.rqAba || {}; U.rqAba[m.id] = aba; };
  /* --- Na milestone do ano: o que ja foi reportado nos trimestres ------------ */
  var cartaoTrimestres = function (m) {
    if (P.trimestral(m)) return '';
    var ids = m.indicadores.filter(function (id) { return P.trimestresDe(m, id).some(function (x) { return x.it; }); });
    if (!ids.length) return '';
    var usr = u(), pode = P.podePreencher(m, usr), prontos = 0;
    var per = (S.periodos || []).filter(function (p) { return p.tipo === 'trimestre' && p.ano === m.ano; });
    var linhas = ids.map(function (id) {
      var c = P.cat(id), r = P.anualDosTrimestres(m, id), it = P.item(id, P.chave(m)), usado = r && it.valor === r.valor;
      if (r && !usado) prontos++;
      return [e(c.nome) + '<br><small class="ps-mut">' + e(id) + ', ' + e(c.unidade_medida) + '</small>'].concat(P.trimestresDe(m, id).map(function (x) {
        return x.valor === null ? '<span class="ps-mut" title="' + e(x.m ? P.estadoMs(x.m).txt : 'Not requested') + '">-</span>' : (x.m ? '<a class="ps-num" href="' + rota('Milestone/' + x.m.id) + '" title="' + e(x.m.nome + ', ' + P.estadoMs(x.m).txt) + '">' : '<span class="ps-num">') + e(fmtV(id, x.valor)) + (x.m ? '</a>' : '</span>') + (x.aprovado ? '' : '<br><small class="ps-mut">' + e(x.m ? P.estadoMs(x.m).txt : '') + '</small>');
      })).concat([e(P.AGREG_TXT[P.agregacao(id)]), r ? '<b class="ps-num">' + e(fmtV(id, r.valor)) + '</b>' + (r.n < r.total ? '<br><small class="ps-tri-parc">' + r.trimestres.join('+') + ' only</small>' : '') : '<span class="ps-mut">-</span>',
        it.valor === null ? '<span class="ps-mut">-</span>' : '<span class="ps-num">' + e(fmtV(id, it.valor)) + '</span>', !r ? '' : usado ? chip('In use', 'ok') : pode ? '<button type="button" class="ps-btn peq" data-a="triUsar" data-v="' + e(id) + '">Use</button>' : '']);
    });
    var faltaT = per.filter(function (p) { return !P.msPeriodo(p.id).filter(function (x) { return x.unidade === m.unidade; }).every(P.concluida); }).map(function (p) { return p.nome; });
    return '<div class="ps-card ps-tri">' + cabCartao('Reported in the quarters', 'cal', pode && prontos ? '<button type="button" class="ps-btn pri peq" data-a="triUsar">Use the quarters (' + prontos + ')</button>' : '') + '<div class="ps-card-body">' +
      '<p class="ps-small ps-mut">The year reuses what ' + e(m.unidade) + ' already reported each quarter. Volumes and hours are summed, headcount and assets take the last quarter, and rates are averaged. Every value links to the quarter it came from.</p>' +
      (faltaT.length ? '<div class="ps-aviso warn">Not yet approved: ' + e(faltaT.join(', ')) + '. Until then, the annual value is year to date.</div>' : '') +
      tabela([{ t: 'Indicator' }].concat(per.map(function (p) { return { t: 'T' + p.t, dir: 1 }; })).concat([{ t: 'Rule' }, { t: 'Year from quarters', dir: 1 }, { t: 'Current', dir: 1 }, { t: '' }]), linhas) + '</div></div>';
  };
  /* --- Ficheiros pedidos ------------------------------------------------------
     So aparecem os que sao mesmo precisos: um ficheiro deixa de ser pedido quando os dados
     chegam do sistema ou sao preenchidos no ecra. Larga-se tudo numa area e escolhe-se a categoria de cada ficheiro. */
  var extDe = function (nome) { return String(nome).split('.').pop().toLowerCase(); };
  var formatosFic = function (f) { return f && f.formatos.length ? f.formatos : ['xlsx', 'pdf']; };
  var semAcentos = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
  var sugerirCat = function (m, nome) {
    var n = semAcentos(nome), l = P.ficheirosPedidos(m).filter(function (f) { return f.preciso; }), aceita = function (f) { return formatosFic(f).indexOf(extDe(nome)) > -1; };
    var x = l.filter(function (f) { return f.prefixo && aceita(f) && n.indexOf(f.prefixo) > -1; })[0] ||
      l.filter(function (f) { return f.indicador && aceita(f) && (new RegExp('(^|[^a-z0-9])' + f.indicador.toLowerCase() + '([^a-z0-9]|$)').test(n) || n.indexOf(semAcentos(P.cat(f.indicador).nome)) > -1); })[0] ||
      l.filter(function (f) { return !f.entregues.length && aceita(f) && !filaDe(m).some(function (q) { return q.cat === f.id; }); })[0];
    return x ? x.id : 'geral';
  };
  var filaDe = function (m) { return U.dzFila[m.id] || (U.dzFila[m.id] = []); };
  var juntarFila = function (m, files) {
    var fila = filaDe(m), fora = [];
    Array.prototype.forEach.call(files || [], function (f, i) {
      if (['xlsx', 'pdf'].indexOf(extDe(f.name)) < 0) return fora.push(f.name);
      fila.push({ k: 'dz' + Date.now() + i, nome: f.name, cat: sugerirCat(m, f.name), file: f });
    });
    if (fora.length) toast('Only Excel (.xlsx) or PDF files: ' + fora.join(', ') + ' left out.', 'err');
    irAba(m, 'fic');
    R();
  };
  var entregarLargados = function (m, pid, files) {
    var usr = u(), ok = [], erros = [];
    Array.prototype.forEach.call(files || [], function (f) {
      if (['xlsx', 'pdf'].indexOf(extDe(f.name)) < 0) return erros.push(f.name + ': only Excel (.xlsx) or PDF.');
      var fid = P.novoFid(), r = P.entregarFicheiro(m, pid, f.name, usr, fid);
      if (r.erro) erros.push(f.name + ': ' + r.erro); else { P.guardarFicheiro(f, fid); ok.push(f.name); }
    });
    if (erros.length) toast((ok.length ? ok.length + ' uploaded. ' : '') + erros.join(' '), 'err'); else if (ok.length) toast(ok.length === 1 ? ok[0] + ' uploaded.' : ok.length + ' files uploaded.', 'ok');
    R();
  };
  /* "Fill in on screen": leva a Requested data e abre os indicadores que o ficheiro cobriria */
  var irParaDados = function (m, pid) {
    var f = P.ficheirosPedidos(m).filter(function (x) { return x.id === pid; })[0], ids = f && f.faltam && f.faltam.length ? f.faltam : m.indicadores;
    U.dadosVista = 'form';
    irAba(m, 'ecra');
    ids.forEach(function (id) { U.rqAberto[m.id + ':' + id] = true; });
    R();
    setTimeout(function () {
      var alvo = document.getElementById('ind-' + ids[0]) || document.getElementById('rq-dados');
      if (!alvo) return;
      alvo.scrollIntoView({ block: 'center' });
      ids.forEach(function (id) { var l = document.getElementById('ind-' + id); if (l) { l.classList.remove('rq2-flash'); void l.offsetWidth; l.classList.add('rq2-flash'); } });
      var inp = document.getElementById('v-' + ids[0]) || alvo.querySelector('input:not([type=hidden]), select');
      if (inp) inp.focus({ preventScroll: true });
    }, 0);
  };
  /* embutido: corpo do separador "Upload files" dentro de Requested data, sempre com a zona para outros ficheiros */
  var cartaoFicheiros = function (m, embutido) {
    var usr = u(), pode = P.podePreencher(m, usr), gere = P.gereTudo(usr) && !P.concluida(m), fics = P.ficheirosPedidos(m);
    var precisos = fics.filter(function (f) { return f.preciso; }), dispensados = fics.filter(function (f) { return !f.preciso; }), fila = pode ? filaDe(m) : [];
    var gerais = (m.documentos_gerais || []).filter(function (d) { return !d.pedido; });
    /* Fora da recolha so aparece quando ha mesmo ficheiros a carregar; o admin pede ficheiros pelo botao "Request a file" */
    if (!embutido && !precisos.length && !fila.length) return '';
    var porEntregar = precisos.filter(function (f) { return f.obrigatorio && !f.entregues.length; }).length;
    var cab = '<span class="ps-sp">' + (precisos.length ? (porEntregar ? chip(porEntregar + ' to upload', 'warn') : chip('All delivered', 'ok')) : '') + '</span>';
    var nomesFaltam = function (f) {
      if (!f.faltam || !f.faltam.length) return '';
      var n = f.faltam.map(function (id) { return P.cat(id).nome; });
      return '<small class="fp-faltam">Without value: ' + e(n.slice(0, 3).join(', ')) + (n.length > 3 ? ' and ' + (n.length - 3) + ' more' : '') + '</small>';
    };
    var solta = pode && !P.concluida(m);
    var lista = precisos.length ? '<ul class="fp-l">' + precisos.map(function (f) {
      var ent = f.entregues, ok = ent.length > 0;
      var subir = solta ? '<button type="button" class="ps-btn peq" data-a="ficEntregar" data-v="' + e(f.id) + '">' + svg(I.upload, 14) + (ok ? 'Add file' : 'Upload') + '</button>' : '';
      var acoes = (P.folhaAcoes ? P.folhaAcoes(m, f, pode) : '') + subir + (gere && f.proprio ? '<button type="button" class="ps-btn peq err" data-a="ficRetirar" data-v="' + e(f.id) + '">Remove</button>' : '');
      return '<li class="fp-it' + (ok ? ' ok' : '') + '" id="fp-' + e(f.id) + '" tabindex="-1"' + (solta ? ' data-dzf="' + e(f.id) + '" data-dz="' + e(m.id) + '"' : '') + '><span class="fp-ic" aria-hidden="true">' + svg(ok ? I.tick : I.doc, 16) + '</span>' +
        '<div class="fp-txt"><b>' + e(f.nome) + '</b>' + (f.obrigatorio ? '' : ' <span class="ps-mut ps-small">(optional)</span>') +
        '<small>' + e(f.porque) + '</small>' + nomesFaltam(f) +
        (ok ? '<small class="fp-ent">' + ent.map(function (x) { return P.fichHtml(x, x.origem === 'grid' ? ' (filled in on the platform)' : '', m); }).join('') + '</small>' : '') + '</div>' +
        '<span class="fp-fmt">' + e(formatosFic(f).join(', ').toUpperCase()) + '</span>' +
        '<span class="ps-sp fp-ac">' + (ok ? chip('Delivered', 'ok') : f.obrigatorio ? chip('Missing', 'warn') : chip('Optional')) + acoes + '</span>' +
        (solta ? '<span class="fp-solta" aria-hidden="true">' + svg(I.upload, 18) + 'Drop to upload as ' + e(f.nome) + '</span>' : '') + '</li>';
    }).join('') + '</ul>' : '';
    var opcoes = function (x) { return precisos.map(function (f) { return opt(f.id, f.nome, x.cat); }).join('') + opt('geral', 'Other supporting document', x.cat); };
    var dica = solta && precisos.length && !embutido ? '<p class="ps-small ps-mut fp-dica">' + svg(I.upload, 14) + 'Drag each file onto its row, or use Upload. Several files at once? Drop them anywhere on this card and choose the category of each one.</p>' : '';
    var filaHtml = fila.length ? '<div class="fp-fila" aria-label="Files to upload"><h4>To upload (' + fila.length + ')</h4>' + fila.map(function (x) {
      var alvo = precisos.filter(function (f) { return f.id === x.cat; })[0], mau = formatosFic(alvo).indexOf(extDe(x.nome)) < 0;
      return '<div class="fp-fi' + (mau ? ' erro' : '') + '"><span class="fp-ic" aria-hidden="true">' + svg(I.doc, 16) + '</span><span class="fp-fn" title="' + e(x.nome) + '">' + e(x.nome) + (mau ? '<small>This category accepts ' + e(formatosFic(alvo).join(', ').toUpperCase()) + ' only.</small>' : '') + '</span>' +
        '<label class="ps-sr" for="dzc-' + e(x.k) + '">Category of ' + e(x.nome) + '</label><select id="dzc-' + e(x.k) + '" class="ps-sel fp-cat" data-c="dzCat" data-id="' + e(x.k) + '">' + opcoes(x) + '</select>' +
        '<button type="button" class="fp-tirar" data-a="dzTirar" data-v="' + e(x.k) + '" aria-label="Remove ' + e(x.nome) + '">×</button></div>';
    }).join('') + '<div class="fp-fila-p"><button type="button" class="ps-btn" data-a="dzLimpar">Clear</button><button type="button" class="ps-btn pri" data-a="dzEnviar">Upload ' + fila.length + ' file' + (fila.length === 1 ? '' : 's') + '</button></div></div>' : '';
    var disp = dispensados.length ? '<details class="fp-disp"><summary>' + dispensados.length + ' file' + (dispensados.length === 1 ? '' : 's') + ' not needed</summary><ul>' + dispensados.map(function (f) { return '<li><b>' + e(f.nome) + '</b> ' + e(f.porque) + '</li>'; }).join('') + '</ul></details>' : '';
    var outros = gerais.length ? '<p class="ps-small ps-mut fp-outros">Other documents: ' + gerais.map(function (d) { return P.fichHtml(d, '', m); }).join('') + '</p>' : '';
    if (embutido) {
      var titulo = precisos.length ? '<div class="fp-tit"><h3>Requested files</h3>' + cab + '</div>' +
        (solta ? '<p class="ps-small ps-mut fp-dica">' + svg(I.upload, 14) + 'Drag each file onto its row, or use Upload.</p>' : '') : '<p class="fp-zero">' + svg(I.tick, 16) + 'No file is required for this task. The data goes in on screen.</p>';
      var zona = solta ? '<div class="fp-outra" data-dz="' + e(m.id) + '"><span class="fp-outra-ic" aria-hidden="true">' + svg(I.upload, 22) + '</span><span class="fp-outra-t"><b>Other files</b><small>Drop any other supporting document here, for example a signed declaration or an invoice. Excel or PDF.</small></span>' +
        '<button type="button" class="ps-btn" data-a="fpOutros">Choose files</button></div>' : '';
      return '<div class="fp-emb">' + titulo + lista + zona + filaHtml + outros + disp + '</div>';
    }
    return '<div class="ps-card fp-card"' + (solta ? ' data-dz="' + e(m.id) + '"' : '') + '>' + cabCartao('Requested files', 'doc', cab) + '<div class="ps-card-body">' +
      '<p class="fp-regra">' + svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01"/>', 16) + '<span>Data goes in under <b>Requested data</b>: it comes from the system or is typed in on screen. Only the files below are needed: data the system could not provide, evidence for values typed in, and files the team asked for. A data file stops being needed once its indicators have a value.</span></p>' +
      lista + dica + filaHtml + outros + disp + '</div></div>';
  };
  var ferrDados = function (m) {
    var pode = P.podePreencher(m, u()), vs = [['form', pode ? 'List' : 'Table'], ['grid', 'Grid']], at = U.dadosVista === 'grid' ? 'grid' : 'form';
    var pedir = P.gereTudo(u()) && !P.concluida(m) ? '<button type="button" class="ps-btn peq" data-a="ficPedirAbrir">' + svg(I.upload, 14) + 'Request a file</button>' : '';
    return '<div class="ps-sp">' + pedir + '<div class="ps-seg" role="group" aria-label="View">' + vs.map(function (v) { return '<button type="button" class="' + (at === v[0] ? 'on' : '') + '" data-a="dadosVista" data-v="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div><button type="button" class="ps-btn peq" data-a="dadosExcel">Export to Excel</button></div>';
  };
  var ferrEcra = function (m) {
    var at = U.dadosVista === 'grid' ? 'grid' : 'form';
    return '<div class="ps-sp"><div class="ps-seg" role="group" aria-label="View">' + [['form', 'List'], ['grid', 'Grid']].map(function (v) { return '<button type="button" class="' + (at === v[0] ? 'on' : '') + '" data-a="dadosVista" data-v="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div><button type="button" class="ps-btn peq" data-a="dadosExcel">Export to Excel</button></div>';
  };

  /* --- Grelha de dados ---------------------------------------------------- */
  var bruNum = function (v) { return v === null || v === undefined ? '' : String(v).replace('.', ','); };
  var cfgDados = function (m) {
    var pode = P.podePreencher(m, u());
    return {
      id: 'gr-' + m.id, titulo: 'Requested data', vazio: 'No data requested.',
      dica: pode ? 'Copy from Excel and paste here with Ctrl+V. Double-click or type to edit. Ctrl+Z undoes.' : 'Read only. Select cells and copy them to Excel with Ctrl+C.',
      cols: [{ k: 'id', t: 'ID' }, { k: 'nome', t: 'Indicator', larg: 280 }, { k: 'un', t: 'Unit' }, { k: 'ant', t: P.rotAnterior(P.chave(m)), dir: 1 }, { k: 'valor', t: P.rotPeriodo(m) + ' value', dir: 1, edita: pode, noFicheiro: 1, larg: 110 }, { k: 'var', t: 'Change %', dir: 1 }, { k: 'qual', t: 'Data quality', edita: pode, noFicheiro: 1, larg: 110, lista: ['Measured', 'Calculated', 'Estimated'] }, { k: 'metodo', t: 'Estimation method', edita: pode, noFicheiro: 1, larg: 170 }, { k: 'just', t: 'Justification', edita: pode, noFicheiro: 1, larg: 220 }, { k: 'evid', t: 'Evidence', larg: 130 }, { k: 'res', t: 'Validation', larg: 130 }],
      linhas: m.indicadores.map(function (id) {
        var c = P.cat(id), it = P.item(id, P.chave(m)), v = P.validarItem(it), ant = P.valorAnterior(id, P.chave(m)), tem = it.valor !== null, msg = v.erros.concat(v.alertas).join(' ');
        var evid = it.evidencias.map(function (x) { return x.ficheiro; }).join(', ');
        return { id: id, c: {
          id: { t: id }, nome: { t: c.nome }, un: { t: c.unidade_medida },
          ant: { t: ant === null || ant === undefined ? '' : fmtV(id, ant), bruto: bruNum(ant), num: typeof ant === 'number' ? ant : null },
          valor: { t: it.rascunho || (tem ? fmtV(id, it.valor) : ''), bruto: it.rascunho || bruNum(it.valor), num: it.valor, cls: v.erros.length ? 'err' : v.alertas.length ? 'alerta' : !tem && pode ? 'falta' : '', tip: msg },
          'var': { t: v.variacao === null ? '' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1), bruto: v.variacao === null ? '' : bruNum(Math.round(v.variacao * 10) / 10), num: v.variacao === null ? null : Math.round(v.variacao * 10) / 10 },
          qual: { t: P.QUALIDADE_TXT[it.qualidade] }, metodo: { t: it.metodo || '', cls: it.qualidade === 'estimado' && !String(it.metodo || '').trim() ? 'falta' : '' },
          just: { t: it.justificacao || '', cls: v.alertas.length && !String(it.justificacao || '').trim() ? 'falta' : '', tip: v.alertas.length && !String(it.justificacao || '').trim() ? 'A justification is required because of the alert.' : '' },
          evid: { t: evid, cls: P.evidenciaPrecisa(m, id) && !evid ? 'falta' : '', tip: P.evidenciaPrecisa(m, id) && !evid ? 'Required evidence missing. Upload it in Requested files.' : '' },
          res: { t: v.erros.length ? 'Error' : v.alertas.length ? 'Alert' : tem ? 'Valid' : 'To fill in', html: v.erros.length ? chip('Error', 'err') : v.alertas.length ? chip(v.alertas.length + ' alert(s)', 'warn') : tem ? chip('Valid', 'ok') : chip('To fill in'), tip: msg }
        } };
      }),
      aoAplicar: function (lista, origem) { return aplicarDados(m, lista, origem); },
      aoColar: function (mat) { return planoColagem(m, mat); },
      aoColado: function (rel) {
        U.colRel[m.id] = rel;
        toast(rel.aplicados + ' cell(s) updated from your copy.' + (rel.recusados.length + rel.ignorados.length ? ' See the notes under the grid.' : ''), rel.aplicados ? 'ok' : 'err');
        R();
      },
      aoRecusar: function () { toast('This task is read only for you right now.', 'err'); },
      aoAnular: function (n) { toast(n + ' cell(s) restored.', 'ok'); }
    };
  };
  var corpoGrelha = function (m) {
    var rel = U.colRel[m.id], notas = rel ? rel.recusados.concat(rel.ignorados) : [];
    var cfg = cfgDados(m);
    return '<div class="ps-card-body">' + window.PortalGrelha.html(cfg) + (notas.length ? '<div class="ps-aviso warn ps-mt" role="status"><div class="ps-sp-b"><b>Not applied from your copy</b><button type="button" class="ps-btn liga" data-a="colRelFechar">Dismiss</button></div><ul class="ps-notas">' + notas.slice(0, 15).map(function (n) { return '<li>' + e(n) + '</li>'; }).join('') + '</ul>' + (notas.length > 15 ? '<small>And ' + (notas.length - 15) + ' more.</small>' : '') + '</div>' : '') + '</div>';
  };
  var aplicarDados = function (m, lista, origem) {
    var usr = u(), n = 0, rec = [];
    if (!P.podePreencher(m, usr)) return { aplicados: 0, recusados: ['This task is read only for you right now.'], semAlteracao: true };
    lista.forEach(function (a) {
      var c = P.cat(a.id), it = P.item(a.id, P.chave(m));
      if (it && it.submetido) { rec.push(c.nome + ' is submitted. Reopen it to change it.'); return; }
      if (a.k === 'valor') {
        var s = P.limparColado(a.valor), num = s === '' ? null : P.lerNumero(s);
        if (s === '' ? (it.valor === null && !it.rascunho) : num === null ? it.rascunho === s : (num === it.valor && !it.rascunho)) return;
        P.gravarValor(m, a.id, s, usr, origem === 'colar' && num !== null ? 'paste from Excel' : undefined);
        n++;
        if (s !== '' && num === null) rec.push(c.nome + ': "' + s + '" is not a number. It stays marked in the grid.');
      } else if (a.k === 'qual') {
        if (!String(a.valor).trim()) return;
        var q = P.lerQualidade(a.valor);
        if (!q) { rec.push(c.nome + ': quality "' + a.valor + '" not recognised. Use Measured, Calculated or Estimated.'); return; }
        if (it.qualidade !== q) { it.qualidade = q; if (q !== 'estimado') it.metodo = ''; n++; }
      } else if (a.k === 'metodo' || a.k === 'just') {
        var campo2 = a.k === 'metodo' ? 'metodo' : 'justificacao', t = String(a.valor);
        if (a.k === 'metodo' && it.qualidade !== 'estimado' && t.trim()) { rec.push(c.nome + ': an estimation method only applies to Estimated data.'); return; }
        if (String(it[campo2] || '') !== t) { it[campo2] = t; n++; }
      }
    });
    if (n) { if (origem === 'colar') P.evento(m, n + ' cells updated by paste from Excel.', usr.nome); P.guardar(); }
    R();
    return { aplicados: n, recusados: rec, semAlteracao: !n };
  };
  /* Colar "assume bem": procura cabecalhos e indicadores no que veio, para nao depender da ordem do Excel */
  var norm = function (s) { return String(s === null || s === undefined ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\s]+/g, ' ').trim(); };
  var planoColagem = function (m, mat) {
    var ano = String(m.ano), ALIAS = { id: ['id', 'indicator id', 'indicador id', 'codigo', 'code', 'ref'], nome: ['indicator', 'indicador', 'nome', 'name', 'indicator name', 'designacao'], un: ['unit', 'unidade', 'unidade de medida', 'unit of measure', 'un'], valor: ['value', 'valor', ano, ano + ' value', 'valor ' + ano, 'value ' + ano, norm(P.rotPeriodo(m)), norm(P.rotPeriodo(m)) + ' value'], qual: ['data quality', 'quality', 'qualidade', 'qualidade dos dados'], metodo: ['estimation method', 'method', 'metodo', 'metodo de estimativa'], just: ['justification', 'justificacao', 'justificativa'] };
    var porId = {}, porNome = {};
    S.cat.forEach(function (c) { porId[norm(c.id)] = c; porNome[norm(c.nome)] = c; });
    var achar = function (txt) { var k = norm(txt); return porId[k] || porNome[k] || null; };
    var mapa = {}, cab = mat[0] || [];
    cab.forEach(function (t, i) { var k = norm(t); Object.keys(ALIAS).forEach(function (a) { if (ALIAS[a].indexOf(k) > -1 && mapa[a] === undefined) mapa[a] = i; }); });
    var comCab = (mapa.id !== undefined || mapa.nome !== undefined) && (mapa.valor !== undefined || mapa.just !== undefined || mapa.qual !== undefined);
    var dados = comCab ? mat.slice(1) : mat, base = comCab ? 2 : 1;
    if (!comCab) {
      /* Sem cabecalho: a primeira coluna tem de identificar os indicadores, e o valor e a primeira coluna com numeros */
      var cheias = dados.filter(function (l) { return String(l[0] || '').trim(); });
      if (!cheias.length || !dados[0] || dados[0].length < 2 || cheias.filter(function (l) { return achar(l[0]); }).length * 2 < cheias.length) return null;
      mapa = { id: 0 };
      for (var ci = 1; ci < dados[0].length && mapa.valor === undefined; ci++) {
        var cels = dados.map(function (l) { return P.limparColado(l[ci]); }).filter(Boolean);
        if (cels.length && cels.filter(function (x) { return P.lerNumero(x) !== null; }).length * 2 >= cels.length) mapa.valor = ci;
        else if (cels.length && dados.some(function (l) { var c0 = achar(l[0]); return c0 && norm(l[ci]) === norm(c0.unidade_medida); })) mapa.un = ci;
        else if (cels.length && dados.some(function (l) { var c0 = achar(l[0]); return c0 && norm(l[ci]) === norm(c0.nome); })) mapa.nome = ci;
      }
      if (mapa.valor === undefined) return null;
    }
    var lista = [], ign = [], colId = mapa.id !== undefined ? mapa.id : mapa.nome;
    dados.forEach(function (l, ix) {
      if (!l.some(function (x) { return String(x).trim(); })) return;
      var ref = 'Row ' + (ix + base), c = achar(l[colId]) || (mapa.nome !== undefined ? achar(l[mapa.nome]) : null);
      if (!c) { ign.push(ref + ': "' + l[colId] + '" is not an indicator.'); return; }
      if (m.indicadores.indexOf(c.id) < 0) { ign.push(ref + ': ' + c.nome + ' is not part of this task.'); return; }
      if (mapa.un !== undefined && String(l[mapa.un] || '').trim() && norm(l[mapa.un]) !== norm(c.unidade_medida)) { ign.push(ref + ': ' + c.nome + ' must be in ' + c.unidade_medida + ', not ' + l[mapa.un] + '.'); return; }
      ['valor', 'qual', 'metodo', 'just'].forEach(function (k) { if (mapa[k] !== undefined && l[mapa[k]] !== undefined) lista.push({ id: c.id, k: k, valor: l[mapa[k]] }); });
    });
    return { lista: lista, ignorados: ign };
  };
  var exportarGrelha = function (cfg, ficheiro, folha, extra) {
    var cols = cfg.cols.filter(function (c) { return !c.semExport; });
    var linhas = [cols.map(function (c) { return c.t; })].concat(cfg.linhas.map(function (l) {
      return cols.map(function (c) { var x = l.c[c.k] || {}; return typeof x.num === 'number' ? x.num : x.t === undefined ? '' : x.t; });
    }));
    /* Layout da plataforma (portal-excel.js): so as colunas editaveis ficam desbloqueadas.
       noFicheiro: a coluna e de preenchimento e fica aberta no ficheiro, mesmo para quem so exporta; o import volta a validar as permissoes. */
    var folhas = [{ nome: folha, titulo: cfg.titulo || folha, sub: cfg.subExcel || '', cols: cols.map(function (c) { return { t: c.t, larg: c.larg, edita: !!(c.edita || c.noFicheiro), dir: c.dir, lista: c.lista }; }), linhas: linhas.slice(1) }];
    if (extra) folhas.push({ nome: extra.nome, titulo: extra.nome, cols: extra.linhas[0].map(function (t) { return { t: t, larg: 150 }; }), linhas: extra.linhas.slice(1) });
    P.livroExcel(ficheiro, folhas);
    return linhas;
  };
  P.exportarGrelha = exportarGrelha;
  P.cfgDados = function (m) { return cfgDados(m); };
  var folhaFicheiros = function (m) {
    return { nome: 'Requested files', linhas: [['File', 'Why it is requested', 'Format', 'Required', 'Delivered']].concat(P.ficheirosPedidos(m).map(function (f) { return [f.nome, f.motivo || '', f.formatos.join(', '), f.obrigatorio ? 'Yes' : 'No', f.entregues.map(function (x) { return x.ficheiro; }).join(', ')]; })) };
  };

  /* --- Explorador de dados (cilindro) ------------------------------------- */
  var estadoExp = function (m) {
    /* Por pessoa: quem troca de perfil nao herda camadas nem dados a que nao tem acesso */
    var chave = m.id + ':' + u().login;
    if (U.exp[chave]) return U.exp[chave];
    var usr = u(), vis = m.indicadores.filter(function (id) { return P.podeVerIndicador(P.cat(id), usr); });
    var primeiro = vis.length ? P.cat(vis[0]).tema : m.indicadores.length ? P.cat(m.indicadores[0]).tema : Object.keys(P.TEMAS)[0];
    return (U.exp[chave] = { dom: primeiro, sel: vis.slice(), q: '' });
  };
  var idsDominio = function (tema) { var usr = u(); return S.cat.filter(function (c) { return c.tema === tema && P.podeVerIndicador(c, usr); }).map(function (c) { return c.id; }); };
  var cilindro = function (doms, ativo) {
    var H = 52, ry = 15, x0 = 12, x1 = 252, rx = (x1 - x0) / 2, cx = (x0 + x1) / 2, alt = ry * 2 + doms.length * H + 8;
    var banda = function (d, i) {
      var y = ry + 2 + i * H, on = d.tema === ativo, fechado = !d.ok.length, q = Math.max(55, 100 - i * 11);
      var cor = fechado ? '#B6C0CE' : on ? 'var(--accent)' : 'color-mix(in srgb,var(--primary) ' + q + '%,var(--secondary))';
      var lado = 'M' + x0 + ' ' + y + ' A' + rx + ' ' + ry + ' 0 0 0 ' + x1 + ' ' + y + ' L' + x1 + ' ' + (y + H) + ' A' + rx + ' ' + ry + ' 0 0 1 ' + x0 + ' ' + (y + H) + ' Z';
      return '<g class="ps-cil-b' + (on ? ' on' : '') + (fechado ? ' fechado' : '') + '"' + (fechado ? '' : ' data-a="expDom" data-v="' + e(d.tema) + '"') + ' style="--f:' + cor + '"><path class="lado" d="' + lado + '"/><path d="' + lado + '" fill="url(#ps-cil-luz)"/><ellipse class="topo" cx="' + cx + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '"/>' +
        '<text x="' + cx + '" y="' + (y + ry + H / 2 - 2) + '" text-anchor="middle">' + e(d.tema) + '</text><text class="det" x="' + cx + '" y="' + (y + ry + H / 2 + 12) + '" text-anchor="middle">' + (fechado ? 'No access' : d.ok.length + ' of ' + d.todos.length + ' available') + '</text></g>';
    };
    var gs = '';
    for (var i = doms.length - 1; i >= 0; i--) gs += banda(doms[i], i);
    return '<svg class="ps-cil" viewBox="0 0 280 ' + alt + '" role="img" aria-label="Data store with ' + doms.length + ' data domains"><defs><linearGradient id="ps-cil-luz" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".22" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient></defs>' + gs + '</svg>';
  };
  var ultimoPonto = function (id) { var pts = serieDe(id); return pts.length ? pts[pts.length - 1] : null; };
  var faisca = function (pts) {
    var l = pts.slice(-10);
    if (l.length < 2) return '<span class="ps-mut">-</span>';
    var vs = l.map(function (p) { return p.v; }), mi = Math.min.apply(null, vs), ma = Math.max.apply(null, vs), W = 84, Hh = 22, xy = l.map(function (p, i) { return [(i / (l.length - 1)) * (W - 6) + 3, ma === mi ? Hh / 2 : Hh - 3 - ((p.v - mi) / (ma - mi)) * (Hh - 6)]; });
    var u2 = xy[xy.length - 1];
    return '<svg class="ps-faisca" width="' + W + '" height="' + Hh + '" viewBox="0 0 ' + W + ' ' + Hh + '" aria-hidden="true"><polyline points="' + xy.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/><circle cx="' + u2[0].toFixed(1) + '" cy="' + u2[1].toFixed(1) + '" r="2.8"/></svg>';
  };
  var cfgRelatorio = function (m) {
    var x = estadoExp(m), usr = u(), ids = x.sel.filter(function (id) { return P.podeVerIndicador(P.cat(id), usr); }), series = {}, anos = {};
    ids.forEach(function (id) { series[id] = serieDe(id); series[id].forEach(function (p) { anos[p.ano] = 1; }); });
    var lAnos = Object.keys(anos).map(Number).sort().slice(-4);
    return {
      id: 'gr-rel-' + m.id, titulo: 'Your report', vazio: 'Select data points to build your report.', dica: 'Read only. Select cells and copy them to Excel with Ctrl+C, or export the whole report.',
      cols: [{ k: 'id', t: 'ID' }, { k: 'nome', t: 'Indicator', larg: 260 }, { k: 'emp', t: 'Company', larg: 130 }, { k: 'atr', t: 'Assigned to', larg: 150 }, { k: 'un', t: 'Unit' }].concat(lAnos.map(function (a) { return { k: 'a' + a, t: String(a), dir: 1, larg: 84 }; })).concat([{ k: 'var', t: 'Change %', dir: 1 }, { k: 'tend', t: 'Trend', larg: 100, semExport: true }, { k: 'est', t: 'Status', larg: 120 }]),
      linhas: ids.map(function (id) {
        var c = P.cat(id), mx = P.msDoIndicador(id), est = mx ? P.estadoIndicador(mx, id) : { txt: 'To collect', cls: '' }, a = mx ? P.atribuido(mx) : null, pts = series[id], o = { id: { t: id }, nome: { t: c.nome }, emp: { t: mx ? mx.empresa : '' }, atr: { t: a ? a.nome : '' }, un: { t: c.unidade_medida } };
        lAnos.forEach(function (an) { var pt = pts.filter(function (p) { return p.ano === an; }).pop(); o['a' + an] = pt ? { t: fmtV(id, pt.v), bruto: bruNum(pt.v), num: pt.v, cls: pt.nota === 'pending approval' ? 'pend' : '', tip: pt.nota === 'pending approval' ? 'Pending approval' : '' } : { t: '' }; });
        var fim = pts[pts.length - 1], ant2 = pts[pts.length - 2], va = fim && ant2 && ant2.v ? Math.round(((fim.v - ant2.v) / Math.abs(ant2.v)) * 1000) / 10 : null;
        o['var'] = { t: va === null ? '' : (va > 0 ? '+' : '') + P.fmtNum(va, 1), bruto: bruNum(va), num: va };
        o.tend = { t: '', html: faisca(pts) };
        o.est = { t: est.txt, html: chip(est.txt, est.cls) };
        return { id: id, c: o };
      })
    };
  };
  var sepExplorar = function (m) {
    /* So as camadas do cilindro que a milestone usa, e dentro delas so os indicadores dela */
    var usr = u(), x = estadoExp(m), daMs = m.indicadores.map(P.cat).filter(Boolean);
    var doms = Object.keys(P.TEMAS).filter(function (t) { return daMs.some(function (c) { return c.tema === t; }); }).map(function (t) { var todos = daMs.filter(function (c) { return c.tema === t; }); return { tema: t, todos: todos, ok: todos.filter(function (c) { return P.podeVerIndicador(c, usr); }) }; });
    var totOk = doms.reduce(function (s, d) { return s + d.ok.length; }, 0), totT = doms.reduce(function (s, d) { return s + d.todos.length; }, 0), dom = doms.filter(function (d) { return d.tema === x.dom; })[0] || doms[0];
    var q = norm(x.q), lista = dom.ok.filter(function (c) { return !q || norm(c.id + ' ' + c.nome).indexOf(q) > -1; });
    var perfil = P.PERFIS[usr.perfil] + (P.unidadesDe(usr).length ? ', ' + P.unidadesTxt(usr) : '');
    var cfg = cfgRelatorio(m);
    return '<div class="ps-card"><div class="ps-exp"><div class="ps-exp-esq"><h2>Data store</h2><p class="ps-mut ps-small">The ' + doms.length + ' layer' + (doms.length === 1 ? '' : 's') + ' this task feeds. Pick one to browse it.</p>' + cilindro(doms, dom.tema) + '<div class="ps-exp-acesso"><b>' + totOk + ' of ' + totT + '</b> data points of this task open to you<br><span class="ps-mut">' + e(perfil) + '</span></div></div>' +
      '<div class="ps-exp-dir"><div class="ps-sp-b"><div><h2>' + e(dom.tema) + '</h2><p class="ps-mut ps-small">' + dom.ok.length + ' data points available' + (dom.todos.length > dom.ok.length ? ', ' + (dom.todos.length - dom.ok.length) + ' outside your access' : '') + '</p></div><div class="ps-sp"><button type="button" class="ps-btn peq" data-a="expTodos">Select all</button><button type="button" class="ps-btn peq" data-a="expLimpar">Clear report</button></div></div>' +
      '<div class="ps-mt">' + campo('exp-q', 'Search this layer', '<input id="exp-q" class="ps-in" value="' + e(x.q) + '" data-c="expBusca" autocomplete="off">') + '</div>' +
      (lista.length ? '<ul class="ps-exp-lista">' + lista.map(function (c) {
        var pt = ultimoPonto(c.id), mx = P.msDoIndicador(c.id), est = mx ? P.estadoIndicador(mx, c.id) : { txt: 'To collect', cls: '' };
        return '<li><label><input id="exp-' + e(c.id) + '" type="checkbox" data-c="expSel" data-id="' + e(c.id) + '"' + (x.sel.indexOf(c.id) > -1 ? ' checked' : '') + '><span class="ps-mono">' + e(c.id) + '</span><span class="n">' + e(c.nome) + '</span><span class="v ps-num">' + (pt ? e(fmtV(c.id, pt.v)) + ' <small>' + e(c.unidade_medida) + ', ' + pt.ano + '</small>' : '<small>No value yet</small>') + '</span>' + chip(est.txt, est.cls) + '</label></li>';
      }).join('') + '</ul>' : vazio(dom.ok.length ? 'Nothing matches your search.' : 'You have no access to this layer.')) + '</div></div></div>' +
      '<div class="ps-card">' + cabCartao('Your report (' + cfg.linhas.length + ')', 'ativ', '<button type="button" class="ps-btn peq pri" data-a="expExcel"' + (cfg.linhas.length ? '' : ' disabled') + '>Export to Excel</button>') + '<div class="ps-card-body">' + window.PortalGrelha.html(cfg) + '</div></div>';
  };
  /* Quem decide um passo (area ou sustentabilidade) ve o mesmo ecra de quem preencheu; por baixo, o comentario para devolver */
  var caixaDecisao = function (m) {
    var p = P.passoAtual(m);
    return '<div class="ps-card ps-mt" id="rev-caixa">' + cabCartao(p.nome, 'tarefa') + '<div class="ps-card-body">' + campo('rev-com', 'Comment (required to return)', '<textarea id="rev-com" class="ps-ta" placeholder="What needs to change, if you return it"></textarea>') + '<p class="ps-small ps-mut">Approve or return with the buttons at the bottom of the screen.</p></div></div>';
  };
  var sepRevisao = function (m) {
    var p = P.passoAtual(m), rot = p.tipo === 'parecer' ? 'Give favourable opinion' : p.tipo === 'aprovacao' ? 'Approve and lock' : p.tipo === 'area' ? 'Approve and send to sustainability' : 'Complete review';
    return '<div class="ps-card">' + cabCartao(p.nome, 'tarefa', ferrDados(m)) + '<div class="ps-card-body">' + (P.fontesHtml ? P.fontesHtml(m) : '') + (U.dadosVista === 'grid' ? corpoGrelha(m) : tabela([{ t: 'Indicator' }, { t: 'Value', dir: 1 }, { t: String(m.ano - 1), dir: 1 }, { t: 'Change', dir: 1 }, { t: 'Alerts and justification' }, { t: 'Quality' }], m.indicadores.map(function (id) {
      var it = P.item(id, P.chave(m)), v = P.validarItem(it), ant = P.valorAnterior(id, P.chave(m));
      return [linkFicha(id) + infoFormula(id, true) + (P.botaoComentarInd ? ' ' + P.botaoComentarInd(m, id) : ''), celValor(m, id) + ' ' + e(P.cat(id).unidade_medida), ant === null || ant === undefined ? '-' : fmtV(id, ant), v.variacao === null ? '-' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1) + '%', v.alertas.length ? '<span class="ps-small">' + e(v.alertas.join(' ')) + '<br><b>Justification:</b> ' + e(it.justificacao || '-') + '</span>' : chip('No alerts', 'ok'), e(P.QUALIDADE_TXT[it.qualidade])];
    }))) + '<div class="ps-mt">' + campo('rev-com', 'Comment (required to return)', '<textarea id="rev-com" class="ps-ta"></textarea>') + '</div></div></div>';
  };
  /* --- Revisao por indicador (equipa de sustentabilidade) ------------------------------------ */
  var paraMimRever = function (m) { var usr = u(); return P.indParaRever(m).filter(function (id) { return P.podeReverInd(m, id, usr); }); };
  var bannerRev = function (m) {
    var l = paraMimRever(m);
    if (!l.length) return '';
    return '<div class="ps-aviso info rev-banner" role="status"><div><b>' + l.length + ' indicator' + (l.length === 1 ? '' : 's') + ' submitted and waiting for your ' + (P.etapaInd(m, l[0]) === 'area' ? 'approval as area head' : 'review') + '</b><small>' + e(l.map(function (id) { return P.cat(id).nome; }).slice(0, 4).join(', ') + (l.length > 4 ? '…' : '')) + '. Approve them now so they move on, without waiting for the rest of the task.</small></div><button type="button" class="ps-btn pri peq" data-a="revProximo">Review next →</button></div>';
  };
  /* Estado de revisao de um indicador: a aprovar (com os botoes), aprovado, ou devolvido */
  var estadoRevHtml = function (m, id) {
    var it = P.item(id, P.chave(m)), usr = u();
    if (!it) return '';
    if (it.revisto) return '<span class="rq2-sub">' + chip('Approved and published', 'ok') + '<small>' + e(it.revisto.por + ', ' + P.fmtDataHora(it.revisto.em) + '. Closed') + '</small></span>';
    var et = P.etapaInd(m, id);
    if (P.podeReverInd(m, id, usr)) return '<span class="rev-acoes">' + chip(et === 'area' ? 'Submitted, to approve' : 'Area approved, to review', 'rev') + '<small>' + e(it.submetido.por + ', ' + P.fmtDataHora(it.submetido.em)) + '</small><span class="ps-sp"><button type="button" class="ps-btn peq pri" data-a="revAprovar" data-v="' + e(id) + '">Approve</button><button type="button" class="ps-btn peq" data-a="revDevolver" data-v="' + e(id) + '">Return</button></span></span>';
    if (it.submetido && !P.concluida(m) && P.passoAtual(m).tipo === 'recolha') return '<span class="rq2-sub">' + chip(et === 'area' ? 'With the area head' : 'With sustainability', 'rev') + '<small>' + e(it.submetido.por + ', ' + P.fmtDataHora(it.submetido.em)) + '</small></span>';
    return '';
  };
  var sepLeitura = function (m) {
    var msg = P.concluida(m) ? 'Task completed. Approved values only change by restatement.' : 'The current step is with ' + P.nomeResp(m, P.passoAtual(m).responsavel) + '. You can view the values.';
    return '<div class="ps-card">' + cabCartao('Requested data', 'doc', ferrDados(m)) + '<div class="ps-card-body">' + bannerRev(m) + '<div class="ps-aviso">' + e(msg) + '</div>' + (P.fontesHtml ? P.fontesHtml(m) : '') + (U.dadosVista === 'grid' ? corpoGrelha(m) : tabela([{ t: 'Indicator' }, { t: 'Value', dir: 1 }, { t: String(m.ano - 1), dir: 1 }, { t: 'Status' }, { t: 'Quality' }], m.indicadores.map(function (id) {
      var est = P.estadoIndicador(m, id), it = P.item(id, P.chave(m)), ant = P.valorAnterior(id, P.chave(m)), rv = estadoRevHtml(m, id);
      return { attrs: 'id="ind-' + e(id) + '" class="rq2-it' + (P.podeReverInd(m, id, u()) ? ' rev-pend' : '') + '"', celulas: [linkFicha(id) + infoFormula(id, true) + (P.botaoComentarInd ? ' ' + P.botaoComentarInd(m, id) : '') + marcaAmostra(id) + (it.reexpresso ? ' ' + chip('Restated', 'warn') : ''), celValor(m, id) + ' ' + e(P.cat(id).unidade_medida), ant === null || ant === undefined ? '-' : fmtV(id, ant), rv || chip(est.txt, est.cls), e(P.QUALIDADE_TXT[it.qualidade])] };
    }))) + '</div></div>';
  };
  var sepEvidencias = function (m) {
    var obrig = m.indicadores.filter(function (id) { return P.evidenciaPrecisa(m, id); }), comEv = obrig.filter(function (id) { return P.item(id, P.chave(m)).evidencias.length; }).length, usr = u();
    return '<div class="ps-card">' + cabCartao('Evidence and quality', 'doc', chip(comEv + ' of ' + obrig.length + ' required evidence items attached', comEv === obrig.length ? 'ok' : 'warn')) + '<div class="ps-card-body">' +
      tabela([{ t: 'Indicator' }, { t: 'Quality' }, { t: 'Method' }, { t: 'Evidence' }], m.indicadores.map(function (id) {
        var it = P.item(id, P.chave(m)), c = P.cat(id);
        return [linkFicha(id), e(P.QUALIDADE_TXT[it.qualidade]), e(it.metodo || '-'), (it.evidencias.length || (P.extracaoDe && P.extracaoDe(m, id)) ? '<span class="fc-l">' + (P.extracaoHtml ? P.extracaoHtml(m, id) : '') + P.fichLista(it.evidencias, m) + '</span>' : P.evidenciaPrecisa(m, id) ? chip('Required, missing', 'warn') : c.evidencia_obrigatoria ? chip('Not needed, from the system', 'ok') : '-')];
      })) + '<h3 class="ps-grupo-t">General task documents</h3>' + (m.documentos_gerais.length ? '<ul class="ps-list">' + m.documentos_gerais.map(function (d) { return '<li class="ps-row"><span class="ps-row-ico">' + svg(I.doc, 18) + '</span><span class="ps-row-txt"><b>' + P.fichHtml({ ficheiro: d.ficheiro, fid: d.fid, id: d.id, em: d.em }, '', m) + '</b><span>Uploaded by ' + quemHtml(d.por) + '<span class="ps-q-sep">, </span>' + e(P.fmtDataHora(d.em)) + '</span></span></li>'; }).join('') + '</ul>' : '<p class="ps-mut ps-small">No general documents yet.</p>') +
      (P.acompanha(m, usr) ? '<button type="button" class="ps-btn ps-mt" data-a="anexarGeral">Attach general document</button>' : '') + '</div></div>';
  };
  var sepExternos = function (m) {
    var usr = u(), l = S.ext.filter(function (x) { return x.milestone_id === m.id; });
    var pode = P.acompanha(m, usr) && !P.concluida(m);
    var EST = { pendente: ['Pending', 'warn'], recebido: ['Received', 'info'], aplicado: ['Applied', 'ok'] };
    /* Pedidos de ajuda que sao para mim: respondo aqui mesmo, com o valor e uma nota */
    var meus = l.filter(function (x) { return x.tipo === 'ajuda' && x.para === usr.login && x.estado === 'pendente'; });
    var form = meus.map(function (x) {
      var c = P.cat(x.indicador_id);
      return '<div class="ps-aj-resp"><p><b>' + e(x.pedido_por) + '</b> asked for your help with <b>' + e(c.nome) + '</b>, due ' + e(P.fmtData(x.prazo)) + '.</p><blockquote>' + e(x.descricao) + '</blockquote>' +
        '<div class="ps-form">' + campo('ajv-' + x.id, 'Value (' + c.unidade_medida + ')', '<input id="ajv-' + e(x.id) + '" class="ps-in ps-num"' + numAttr(x.indicador_id) + ' autocomplete="off">') + campo('ajn-' + x.id, 'Note (optional)', '<input id="ajn-' + e(x.id) + '" class="ps-in" placeholder="Where the value comes from">') + '</div>' +
        '<button type="button" class="ps-btn pri peq ps-mt" data-a="ajResponder" data-v="' + e(x.id) + '">Send value</button></div>';
    }).join('');
    return '<div class="ps-card">' + cabCartao('Assistance requests', 'doc', pode ? '<button type="button" class="ps-btn peq" data-a="pedirAjuda">Request assistance</button>' : '') + '<div class="ps-card-body">' + form + tabela([{ t: 'Indicator' }, { t: 'Asked to' }, { t: 'Message' }, { t: 'Due' }, { t: 'Value' }, { t: 'Status' }], l.map(function (x) {
      var acao = x.estado === 'recebido' && P.podePreencher(m, usr) ? ' <button type="button" class="ps-btn peq" data-a="usarExt" data-v="' + e(x.id) + '">Use this value</button>' : '';
      return [e(P.cat(x.indicador_id).nome), x.tipo === 'ajuda' ? pessHtml(x.entidade_externa) + (x.pedido_por ? '<br><small class="ps-mut">Asked by ' + e(x.pedido_por) + '</small>' : '') : depHtml(x.entidade_externa), e(x.descricao) + (x.nota ? '<br><small class="ps-mut">Reply: ' + e(x.nota) + '</small>' : ''), e(P.fmtData(x.prazo)), x.valor === null ? '-' : e(fmtV(x.indicador_id, x.valor)), chip(EST[x.estado][0], EST[x.estado][1]) + acao];
    }), 'No assistance requested on this task yet.') + '</div></div>';
  };
  var cartaoPedidos = function (lista) {
    var usr = u();
    return lista.map(function (a) {
      var est = a.estado === 'aberto' ? chip('Open', 'warn') : a.estado === 'respondido' ? chip('Answered', 'info') : chip('Resolved', 'ok');
      var pode = a.estado === 'aberto' && P.podeResponderAuditor(a, usr);
      return '<div class="ps-ind"><div class="ps-sp-b"><b>' + e(P.cat(a.indicador_id).nome) + '</b>' + est + '</div><p class="ps-mt">' + e(a.texto) + '</p><small class="ps-mut">' + quemHtml(a.por) + '<span class="ps-q-sep">, </span>' + e(P.fmtDataHora(a.em)) + '</small>' +
        (a.resposta ? '<div class="ps-aviso ps-mt"><b>Answer from ' + e(a.resposta.por) + ':</b> ' + e(a.resposta.texto) + '</div>' : '') +
        (pode ? '<div class="ps-mt">' + campo('ra-' + a.id, 'Answer', '<textarea id="ra-' + e(a.id) + '" class="ps-ta"></textarea>') + '<button type="button" class="ps-btn pri ps-mt" data-a="responderAud" data-v="' + e(a.id) + '">Answer</button></div>' : '') +
        (a.estado === 'respondido' && (usr.perfil === 'auditor' || usr.perfil === 'admin') ? '<button type="button" class="ps-btn ps-mt" data-a="resolverAud" data-v="' + e(a.id) + '">Mark as resolved</button>' : '') + '</div>';
    }).join('');
  };
  /* Matriz de rastreabilidade da task: abre num pop-up a partir do botao do painel da direita */
  var matrizHtml = function (m) {
    return tabela([{ t: 'Indicator' }, { t: 'Value', dir: 1 }, { t: 'ESRS' }, { t: 'GRI' }, { t: 'Submitted by' }, { t: 'Approved by' }, { t: 'Evidence' }], P.rastreabilidade(m).map(function (r) {
      return [linkFicha(r.indicador_id) + marcaAmostra(r.indicador_id), r.valor === null ? '-' : e(fmtV(r.indicador_id, r.valor)), e(r.esrs), e(r.gri), e(r.submetido_por || '-'), e(r.aprovado_por || '-'), e(r.evidencias || '-')];
    }));
  };
  var sepAuditoria = function (m) {
    var ped = S.aud.filter(function (a) { var x = P.msDoIndicador(a.indicador_id, m.ano); return x && x.id === m.id; });
    return '<div class="ps-card">' + cabCartao('Requests on this task', 'ativ') + (ped.length ? cartaoPedidos(ped) : vazio('No auditor requests on this task.')) + '</div>';
  };
  var sepConversa = function (m) {
    var usr = u();
    var msgs = m.comentarios.map(function (c) { var eu = c.autor === usr.nome; return '<div class="ps-msg ' + (eu ? 'eu' : '') + (c.sistema ? ' sis' : '') + '"><small>' + quemHtml(c.autor) + '<span class="ps-q-sep">, </span>' + e(P.fmtDataHora(c.em)) + '</small><p>' + e(c.texto) + '</p></div>'; }).join('');
    var evs = m.eventos.slice().reverse().map(function (x) { return '<li>' + e(x.texto) + '<small>' + quemHtml(x.por) + '<span class="ps-q-sep">, </span>' + e(P.fmtDataHora(x.em)) + '</small></li>'; }).join('');
    return '<div class="ps-card">' + cabCartao('Conversation', 'ativ') + '<div class="ps-chat">' + (msgs || '<div class="ps-mut ps-small">No comments yet.</div>') + '</div>' + '<div class="ps-card-body ps-sp"><div class="ps-campo ps-cresce"><label class="ps-sr" for="chat-txt">Comment</label><input id="chat-txt" class="ps-in" placeholder="Write a comment"></div><button type="button" class="ps-btn pri" data-a="comentar">Send</button></div></div>' +
      '<div class="ps-card">' + cabCartao('History', 'cal') + '<ul class="ps-ev">' + evs + '</ul></div>';
  };

  /* --- Consolidado ------------------------------------------------------- */
  var CORES_V = { a: 'var(--v-aprov)', r: 'var(--v-rev)', p: 'var(--v-pre)', f: 'var(--v-falta)' };
  var LEG_V = '<div class="ps-vleg"><span style="--c:var(--v-aprov)"><i></i>Approved</span><span style="--c:var(--v-rev)"><i></i>Reported, in review</span><span style="--c:var(--v-pre)"><i></i>In progress</span><span style="--c:var(--v-falta)"><i></i>To report</span></div>';
  var situacao = function (lista) {
    var n = { a: 0, r: 0, p: 0, f: 0, t: lista.length };
    lista.forEach(function (c) {
      var m = P.msDoIndicador(c.id);
      if (!m) { n.f++; return; }
      var it = P.item(c.id, P.chave(m));
      if (P.concluida(m)) n.a++;
      else if (P.passoAtual(m).tipo !== 'recolha') n.r++;
      else if (it.valor !== null) n.p++;
      else n.f++;
    });
    return n;
  };
  var barra = function (titulo, n) {
    var seg = [['a', 'Approved'], ['r', 'Reported, in review'], ['p', 'In progress'], ['f', 'To report']].filter(function (s) { return n[s[0]] > 0; });
    return '<div class="ps-bar"><div class="ps-bar-t">' + e(titulo) + '<span>' + n.a + ' of ' + n.t + ' approved</span></div><div class="ps-bar-g" role="img" aria-label="' + e(titulo + ': ' + n.a + ' approved, ' + n.r + ' in review, ' + n.p + ' in progress, ' + n.f + ' to report') + '">' + seg.map(function (s) {
      return '<i style="flex:' + n[s[0]] + ' 1 0;--c:' + CORES_V[s[0]] + '" data-tip="' + e(s[1] + ': ' + n[s[0]]) + '"></i>';
    }).join('') + '</div></div>';
  };
  /* By area: por departamento, os pontos de dados das suas tasks. Vive na pagina Reporting status. */
  P.porAreaHtml = function (filtro) {
    var pts = P.pontosCiclo(function (m) { return !filtro || filtro(m); });
    var html = P.UNIDADES.map(function (un) {
      var l = pts.filter(function (x) { return x.m.unidade === un; });
      if (!l.length) return '';
      var mss = []; l.forEach(function (x) { if (mss.indexOf(x.m) < 0) mss.push(x.m); });
      var ap = l.filter(function (x) { return x.s.cod === 'aprovado'; }).length, atr = l.some(function (x) { return x.s.cod === 'atraso'; }), rep2 = l.filter(function (x) { return x.s.cod === 'aprovacao' || x.s.cod === 'curso'; }).length;
      var est = ap === l.length ? chip('All approved', 'ok') : atr ? chip('Overdue', 'err') : ap + rep2 === l.length ? chip('All reported', 'rev') : chip('In progress', 'info');
      return '<details class="ps-card ps-mt" id="area-' + e(un.replace(/\W/g, '')) + '"><summary class="ps-card-head ps-sp-b ps-sumario"><b>' + depHtml(un) + '</b><span class="ps-sp">' + est + '<span class="ps-mut ps-small">' + ap + ' of ' + l.length + ' data points approved, ' + mss.length + ' tasks</span></span></summary><div class="ps-card-body">' +
        tabela([{ t: 'Indicator' }, { t: 'Period' }, { t: 'Perimeter' }, { t: 'Value', dir: 1 }, { t: 'Status' }], l.map(function (x) {
          var it = P.item(x.id, P.chave(x.m));
          return [linkFicha(x.id), tagPer(x.m) || e(P.rotPeriodo(x.m)), empHtml(x.m.empresa), it && it.valor !== null ? e(fmtV(x.id, it.valor) + ' ' + x.c.unidade_medida) : '-', chip(x.s.txt, x.s.cls)];
        })) + '</div></details>';
    }).join('');
    return html ? '<h2 class="ps-grupo-t ps-mt-l">By area</h2><p class="ps-small ps-mut">Each department, with the data points (indicator per period) of its tasks. Open one to see them.</p>' + html : '';
  };
  var QUADRO_TXT = { Desempenho: 'Performance', Ambientais: 'Environmental', Sociais: 'Social', Governance: 'Governance', ESRS: 'ESRS' };
  var catVisivel = function (incl) { return S.cat.filter(function (c) { return incl || !c.novo_esrs; }); };
  Blocos['consolidado'] = function () {
    var incl = U.consEsrs, cat = catVisivel(incl), tot = situacao(cat), ms = P.msCiclo().filter(function (m) { return incl || m.periodicidade !== 'Novos dados ESRS'; });
    var conc = ms.filter(P.concluida).length, qual = { medido: 0, calculado: 0, estimado: 0 };
    cat.forEach(function (c) { var it = P.item(c.id); if (it && it.valor !== null) qual[it.qualidade]++; });
    var totQ = qual.medido + qual.calculado + qual.estimado;
    var metas = S.metas.map(function (x) {
      var m = P.msDoIndicador(x.indicador_id), it = P.item(x.indicador_id), v = m && P.concluida(m) ? it.valor : null, base = P.valorAnterior(x.indicador_id, S.ciclo.ano), pct;
      if (x.sentido === 'subir') pct = v === null ? 0 : Math.min(100, (v / x.valor_meta) * 100);
      else pct = v === null || base === null || !base ? 0 : Math.max(0, Math.min(100, (1 - v / base) * 100));
      return '<div class="ps-meta"><div class="ps-meta-t">' + e(x.nome) + '<span>Target: ' + e(P.fmtNum(x.valor_meta, 0)) + ' ' + e(x.unidade) + ' in ' + x.ano_meta + ', Current: ' + (v === null ? 'pending approval' : e(fmtV(x.indicador_id, v))) + '</span></div><div class="ps-meta-b"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
    return '<div class="ps-filtros"><label class="ps-chk"><input id="cons-esrs" type="checkbox" data-c="consEsrs"' + (incl ? ' checked' : '') + '> Include ESRS track</label></div>' +
      '<div class="ps-kpis"><div class="ps-kpi"><span>Indicators reported by areas</span><b>' + (tot.a + tot.r) + '</b><small>of ' + tot.t + '</small></div><div class="ps-kpi"><span>Approved and consolidated</span><b>' + tot.a + '</b><small>' + Math.round((tot.a / Math.max(tot.t, 1)) * 100) + '% of the report</small></div><div class="ps-kpi"><span>Completed tasks</span><b>' + conc + '</b><small>of ' + ms.length + '</small></div></div>' +
      '<div class="ps-grid2 ps-mt"><div class="ps-card">' + cabCartao('Targets and trajectory', 'ativ') + '<div class="ps-card-body">' + metas + '</div></div><div class="ps-card">' + cabCartao('Data quality', 'tarefa') + '<div class="ps-card-body"><div class="ps-kpis"><div class="ps-kpi"><span>Measured</span><b>' + qual.medido + '</b></div><div class="ps-kpi"><span>Calculated</span><b>' + qual.calculado + '</b></div><div class="ps-kpi"><span>Estimated</span><b>' + qual.estimado + '</b></div></div><p class="ps-mut ps-small ps-mt">' + totQ + ' indicators with a value.</p></div></div></div>';
  };

  /* --- Documentos -------------------------------------------------------- */
  var TIPO_DOC = { eletricidade: 'Electricity', 'água': 'Water', 'combustível': 'Fuel' };
  var difTel = function (d) { return d.leitura_telemetria ? ((d.consumo - d.leitura_telemetria) / d.leitura_telemetria) * 100 : null; };
  var unidadeDoc = function (t) { return t === 'eletricidade' ? 'kWh' : t === 'água' ? 'm³' : 'litres'; };
  Blocos['documentos'] = function () {
    var linhas = S.docs.map(function (d) {
      var dif = difTel(d), fora = dif !== null && Math.abs(dif) > 5;
      return [e(d.fornecedor) + '<br><small class="ps-mut">' + e(TIPO_DOC[d.tipo] || d.tipo) + ', ' + e(d.periodo) + '</small>', e(d.instalacao) + '<br><small class="ps-mut">' + e(d.entidade) + '</small>', e(P.fmtNum(d.consumo, 0)) + ' ' + unidadeDoc(d.tipo), e(P.fmtNum(d.valor_sem_iva, 2)) + ' €', dif === null ? '-' : (fora ? chip((dif > 0 ? '+' : '') + P.fmtNum(dif, 1) + '%', 'err') : chip((dif > 0 ? '+' : '') + P.fmtNum(dif, 1) + '%', 'ok')),
        d.estado === 'distribuída' ? chip('Distributed', 'ok') : (fora ? chip('Validate with supplier', 'err') : '<button type="button" class="ps-btn peq" data-a="distribuir" data-v="' + e(d.id) + '">Confirm and distribute</button>')];
    });
    var alerta = S.docs.filter(function (d) { var x = difTel(d); return x !== null && Math.abs(x) > 5 && d.estado !== 'distribuída'; });
    var dist = S.docs.filter(function (d) { return d.estado === 'distribuída'; });
    var soma = function (f) { return dist.reduce(function (a, d) { return a + (Number(d[f]) || 0); }, 0); };
    return (alerta.length ? '<div class="ps-aviso err" role="alert">' + alerta.length + ' invoice(s) more than 5% off telemetry. They go to Finance to validate with the supplier before payment.</div>' : '') +
      '<div class="ps-card">' + cabCartao('Invoice inbox', 'doc', '<button type="button" class="ps-btn pri peq" data-a="docNova">Upload invoice</button>') + (U.docNova ? formFatura() : '') + '<div class="ps-card-body">' + tabela([{ t: 'Invoice' }, { t: 'Site' }, { t: 'Consumption', dir: 1 }, { t: 'Excl. VAT', dir: 1 }, { t: 'Against telemetry' }, { t: 'Status' }], linhas) + '</div></div>' +
      '<h2 class="ps-grupo-t ps-mt-l">One document, three destinations</h2><div class="ps-grid3"><div class="ps-card">' + cabCartao('Sustainability') + '<div class="ps-card-body ps-small">Consumption and renewable percentage.<div class="ps-mt"><b class="ps-num">' + dist.length + '</b> invoices distributed</div></div></div><div class="ps-card">' + cabCartao('Accounting') + '<div class="ps-card-body ps-small">Amount, VAT and cost centre.<div class="ps-mt"><b class="ps-num">' + e(P.fmtNum(soma('valor_sem_iva'), 2)) + ' €</b> excl. VAT, <b class="ps-num">' + e(P.fmtNum(soma('iva'), 2)) + ' €</b> VAT</div></div></div><div class="ps-card">' + cabCartao('Operations') + '<div class="ps-card-body ps-small">Consumption by site.<div class="ps-mt">' + (dist.map(function (d) { return e(d.instalacao); }).join(', ') || '-') + '</div></div></div></div>' +
      '<p class="ps-mut ps-small ps-mt">Fields are confirmed by whoever uploads the invoice.</p>';
  };
  var formFatura = function () {
    var f = function (id, lab, tipo, extra) { return campo('nf-' + id, lab, '<input id="nf-' + id + '" class="ps-in" type="' + (tipo || 'text') + '"' + (extra || '') + '>'); };
    return '<div class="ps-card-body ps-sep-baixo"><div class="ps-form">' + campo('nf-tipo', 'Type', '<select id="nf-tipo" class="ps-sel">' + opt('eletricidade', 'Electricity') + opt('água', 'Water') + opt('combustível', 'Fuel') + '</select>') +
      f('fornecedor', 'Supplier') + f('periodo', 'Period') + f('instalacao', 'Site') + campo('nf-entidade', 'Company', '<select id="nf-entidade" class="ps-sel">' + S.ent.map(function (x) { return opt(x.nome); }).join('') + '</select>') +
      f('consumo', 'Consumption (kWh, m³ or litres)', 'text', ' inputmode="decimal"') + f('valor', 'Amount excl. VAT (€)', 'text', ' inputmode="decimal"') + f('iva', 'VAT (€)', 'text', ' inputmode="decimal"') + f('renov', '% renewable', 'text', ' inputmode="decimal"') + f('cc', 'Cost centre') + f('tele', 'Telemetry reading', 'text', ' inputmode="decimal"') +
      '</div><div class="ps-sp ps-mt"><button type="button" class="ps-btn pri" data-a="docGuardar">Save invoice</button><button type="button" class="ps-btn" data-a="docNova">Cancel</button></div></div>';
  };

  /* --- Relatorio --------------------------------------------------------- */
  Blocos['relatorio'] = function () {
    var ano = S.ciclo.ano, nomes = { Desempenho: 'Performance (group perimeter)', Ambientais: 'Environmental (majority companies)', Sociais: 'Social (majority companies)', Governance: 'Governance (majority companies)', ESRS: 'ESRS track' };
    return '<div class="ps-sp ps-nao-imprimir ps-filtros"><button type="button" class="ps-btn pri" data-a="relExcel">Export to Excel</button><button type="button" class="ps-btn" data-a="imprimir">Print or save as PDF</button></div>' +
      '<div class="ps-so-imprimir ps-sp-b ps-rel-topo"><span data-marca-c="logo-claro"></span><b>Report ' + ano + '</b></div>' +
      P.QUADROS.map(function (q) {
        /* Consolidado: uma coluna por empresa e o total; uma empresa: so o que ela reporta */
        var emp = (U.rep || {}).emp || '', cons = !emp, ents = S.ent;
        var cols = [{ t: 'Indicator' }, { t: 'Unit' }].concat(cons ? ents.map(function (x) { return { t: x.nome, dir: 1 }; }).concat([{ t: 'Consolidated ' + ano, dir: 1, info: 'Volumes are added by consolidation method (full and parent at 100%, proportional by ownership, equity method left out). Percentages and ratios are a weighted average.' }]) : [{ t: emp + ' ' + ano, dir: 1 }]).concat([{ t: String(ano - 1), dir: 1 }, { t: 'Status' }]);
        return '<div class="ps-card ps-mt">' + cabCartao(nomes[q], 'doc') + '<div class="ps-card-body">' + tabela(cols, S.cat.filter(function (c) { return c.quadro === q; }).map(function (c) {
          var m = P.msDoIndicador(c.id, ano), apr = m && P.concluida(m), it = P.item(c.id, ano), est = m ? P.estadoIndicador(m, c.id) : { txt: 'To collect', cls: '' }, ant = P.anteriorVista(c.id, ano, emp), r = P.valorVista(c.id, ano, emp);
          var fmt = function (v) { return v === null || v === undefined ? '-' : e(fmtV(c.id, v)); }, pend = it && it.valor !== null && !apr;
          var val = function (v) { return apr ? fmt(v) : '-'; };
          var celsV = cons ? ents.map(function (x) { return val(r.partes[x.nome]); }).concat(['<b data-tip="' + e(r.metodo === 'calculo' ? (r.semInputs ? 'Not all inputs are consolidated yet, so the calculation cannot be redone: ' + r.formula : 'Recalculated with the consolidated inputs: ' + r.formula) : r.metodo === 'media' ? 'Weighted average of the companies' : r.metodo === 'soma' ? 'Sum of the companies by consolidation method' : '') + '">' + val(r.valor) + '</b>']) : [val(r.valor)];
          return [e(c.nome) + (it && it.reexpresso ? ' ' + chip('Restated', 'warn') : ''), e(c.unidade_medida)].concat(celsV).concat([fmt(ant), chip(est.txt, est.cls)]);
        })) + '</div></div>';
      }).join('');
  };

  /* --- Historico --------------------------------------------------------- */
  /* Serie ilustrativa 2011 a 2024, so para demonstracao: a especificacao nao traz os valores */
  var SERIES = {
    A03: [24.6, 23.91, 23.11, 22.65, 22.07, 21.38, 20.81, 20.12, 19.54, 19.08, 18.62, 18.16, 17.7, 17.36],
    A01: [49.44, 49.92, 50.28, 50.52, 51, 51.36, 51.6, 51.96, 52.32, 52.56, 52.8, 53.04, 53.4, 53.62]
  };
  var serieDe = function (id) {
    var pts = [], c = P.cat(id);
    if (SERIES[id]) SERIES[id].forEach(function (v, i) { pts.push({ ano: 2011 + i, v: v, nota: 'historical' }); });
    if (c.ano_anterior !== null && c.ano_anterior !== undefined) pts.push({ ano: 2025, v: c.ano_anterior, nota: 'prior year' });
    Object.keys(S.items).forEach(function (k) {
      var it = S.items[k];
      if (it.id !== id || it.valor === null || typeof it.ano !== 'number') return;
      var m = P.ms(it.milestone_id);
      pts.push({ ano: it.ano, v: it.valor, nota: m && P.concluida(m) ? 'approved' : 'pending approval', corrente: true });
    });
    return pts.sort(function (a, b) { return a.ano - b.ano; });
  };
  var graficoLinha = function (pts, unid, casas) {
    /* A largura acompanha o ecra, para o texto nao encolher no telemovel */
    var movel = window.innerWidth < 820, W = movel ? 400 : 1100, H = movel ? 240 : 320, L = 48, R = 14, T = 14, B = 28;
    var vs = pts.map(function (p) { return p.v; }), min = Math.min.apply(null, vs), max = Math.max.apply(null, vs), pad = (max - min) * 0.15 || Math.abs(max) * 0.1 || 1;
    var lo = Math.max(min - pad, min >= 0 ? 0 : -Infinity), hi = max + pad;
    var x = function (i) { return pts.length < 2 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (pts.length - 1); }, y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var grelha = [0, 1, 2, 3].map(function (i) { var v = lo + ((hi - lo) * i) / 3; return '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"></line><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + e(P.fmtNum(v, casas > 1 ? 1 : casas)) + '</text>'; }).join('');
    var firme = pts.filter(function (p) { return p.nota !== 'pending approval'; }), d = firme.map(function (p) { var i = pts.indexOf(p); return (x(i)).toFixed(1) + ',' + y(p.v).toFixed(1); }).join(' ');
    var passo = movel ? Math.max(1, Math.ceil(pts.length / 5)) : pts.length > 12 ? 2 : 1;
    var marcas = pts.map(function (p, i) {
      var larg = pts.length > 1 ? (W - L - R) / (pts.length - 1) : 80;
      return '<g class="pt"><line class="x" x1="' + x(i) + '" x2="' + x(i) + '" y1="' + T + '" y2="' + (H - B) + '"></line><circle class="p ' + (p.corrente ? 'at' : '') + '" cx="' + x(i) + '" cy="' + y(p.v) + '" r="5"></circle>' + (i % passo === 0 || i === pts.length - 1 ? '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + p.ano + '</text>' : '') +
        '<rect class="h" x="' + (x(i) - larg / 2) + '" y="' + T + '" width="' + larg + '" height="' + (H - T - B) + '" data-tip="' + e(p.ano + ': ' + P.fmtNum(p.v, casas) + ' ' + unid + ' (' + p.nota + ')') + '"></rect></g>';
    }).join('');
    return '<svg class="ps-lin" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Annual series in ' + e(unid) + '">' + grelha + (firme.length > 1 ? '<polyline class="l" points="' + d + '"></polyline>' : '') + marcas + '</svg>';
  };
  /* Por topic: todos os indicadores do topic numa tabela, um ano por coluna, com a tendencia */
  var histTopic = function (tema) {
    var temas = tema ? [tema] : Object.keys(P.TEMAS).filter(function (t) { return S.cat.some(function (c) { return c.tema === t; }); });
    var anos = [];
    S.cat.forEach(function (c) { if (temas.indexOf(c.tema) < 0) return; serieDe(c.id).forEach(function (p) { if (anos.indexOf(p.ano) < 0) anos.push(p.ano); }); });
    anos = anos.sort().slice(-6);
    return temas.map(function (t) {
      var inds = S.cat.filter(function (c) { return c.tema === t; });
      if (!inds.length) return '';
      return '<div class="ps-card ps-mt">' + cabCartao(t + ' (' + inds.length + ')', 'ativ') + '<div class="ps-card-body">' + tabela([{ t: 'Indicator' }, { t: 'Unit' }].concat(anos.map(function (a) { return { t: String(a), dir: 1 }; })).concat([{ t: 'Trend' }]), inds.map(function (c) {
        var pts = serieDe(c.id);
        return ['<button type="button" class="ps-btn liga" data-a="histVer" data-v="' + e(c.id) + '">' + e(c.nome) + '</button> <span class="ps-mut ps-small">' + e(c.id) + '</span>', e(c.unidade_medida)].concat(anos.map(function (a) {
          var x = pts.filter(function (p) { return p.ano === a; }).slice(-1)[0];
          return x ? '<span' + (x.nota === 'pending approval' ? ' class="ps-mut" data-tip="Pending approval"' : '') + '>' + e(P.fmtNum(x.v, c.casas_decimais)) + '</span>' : '<span class="ps-mut">-</span>';
        })).concat([faisca(pts)]);
      }), 'No indicators in this topic.') + '</div></div>';
    }).join('');
  };
  Blocos['historico'] = function () {
    var tema = U.histTema || '', vista = U.histVista || 'ind', lista = S.cat.filter(function (x) { return !tema || x.tema === tema; });
    if (!lista.some(function (x) { return x.id === U.histInd; }) && lista.length) U.histInd = lista[0].id;
    var id = U.histInd, c = P.cat(id), pts = serieDe(id);
    var temas = Object.keys(P.TEMAS).filter(function (t) { return S.cat.some(function (x) { return x.tema === t; }); });
    var topo = '<div class="ps-filtros">' + campo('h-tema', 'Topic', '<select id="h-tema" class="ps-sel" data-c="histTema">' + opt('', 'All topics', tema) + temas.map(function (t) { return opt(t, t, tema); }).join('') + '</select>') +
      '<div class="ps-seg" role="group" aria-label="Show"><button type="button" class="' + (vista === 'ind' ? 'on' : '') + '" data-a="histVista" data-v="ind">One indicator</button><button type="button" class="' + (vista === 'tema' ? 'on' : '') + '" data-a="histVista" data-v="tema">Whole topic</button></div>' +
      (vista === 'ind' ? campo('h-ind', 'Indicator', '<select id="h-ind" class="ps-sel" data-pesq data-c="histInd">' + lista.map(function (x) { return opt(x.id, x.nome + ' (' + x.unidade_medida + ')', id); }).join('') + '</select>') : '') +
      '<button type="button" class="ps-btn" data-a="histJson">Export approved values as JSON</button></div>';
    if (vista === 'tema') return topo + histTopic(tema);
    if (!c) return topo + vazio('No indicators in this topic.');
    return topo +
      '<div class="ps-card">' + cabCartao(c.nome, 'ativ', '<span class="ps-mut ps-small">' + e(c.unidade_medida) + '</span>') + '<div class="ps-card-body">' + (pts.length ? graficoLinha(pts, c.unidade_medida, c.casas_decimais) : vazio('No values for this indicator yet.')) +
      '<div class="ps-mt-l">' + tabela([{ t: 'Year' }, { t: 'Value', dir: 1 }, { t: 'Source' }], pts.slice().reverse().map(function (p) { return [String(p.ano), e(P.fmtNum(p.v, c.casas_decimais)), e(p.nota)]; })) + '</div></div></div>';
  };

  /* --- Auditoria --------------------------------------------------------- */
  Blocos['auditoria'] = function () {
    var usr = u(), ms = P.msCiclo(), apr = P.aprovados(), comEv = apr.filter(function (a) { return P.item(a.id).evidencias.length; }).length;
    var est = apr.filter(function (a) { return P.item(a.id).qualidade === 'estimado'; }).length, reex = apr.filter(function (a) { return P.item(a.id).reexpresso; }).length, abertos = S.aud.filter(function (a) { return a.estado !== 'resolvido'; });
    var pedidosDe = function (m) { return abertos.filter(function (a) { var x = P.msDoIndicador(a.indicador_id); return x && x.id === m.id; }).length; };
    var naAmostra = function (m) { return m.indicadores.some(function (id) { return S.amostra.indexOf(id) > -1; }); };
    var f = U.audFiltro, lista = ms.filter(function (m) { return f === 'concluidas' ? P.concluida(m) : f === 'abertos' ? pedidosDe(m) > 0 : f === 'amostra' ? naAmostra(m) : true; });
    var podeAmostra = usr.perfil === 'auditor' || usr.perfil === 'admin';
    return '<div class="ps-kpis"><div class="ps-kpi"><span>Approved with evidence</span><b>' + (apr.length ? Math.round((comEv / apr.length) * 100) : 0) + '%</b><small>' + comEv + ' of ' + apr.length + '</small></div><div class="ps-kpi"><span>Estimated values</span><b>' + est + '</b></div><div class="ps-kpi"><span>Restated values</span><b>' + reex + '</b></div><div class="ps-kpi"><span>Open requests</span><b>' + abertos.length + '</b></div></div>' +
      '<div class="ps-sp ps-mt">' + (podeAmostra ? '<button type="button" class="ps-btn pri" data-a="amostra">Select a sample of 5</button>' : '') + '<button type="button" class="ps-btn" data-a="dataRoom">Export data room (Excel)</button>' + (usr.perfil === 'auditor' || usr.perfil === 'admin' ? '<button type="button" class="ps-btn" data-a="novoPedAud">New information request</button>' : '') + '</div>' +
      (S.amostra.length ? '<div class="ps-card ps-mt">' + cabCartao('Sample', 'tarefa') + '<ul class="ps-list">' + S.amostra.map(function (id) { var m = P.msDoIndicador(id); return '<li class="ps-row"><span class="ps-row-txt">' + linkFicha(id) + '<span>' + e(m ? m.nome : '') + '</span></span></li>'; }).join('') + '</ul></div>' : '') +
      '<div class="ps-card ps-mt">' + cabCartao('Tasks', 'doc', '<div class="ps-seg" role="group" aria-label="Filter">' + [['todas', 'All'], ['concluidas', 'Completed'], ['abertos', 'With open requests'], ['amostra', 'In the sample']].map(function (x) { return '<button type="button" class="' + (f === x[0] ? 'on' : '') + '" data-a="audFiltro" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>') + '<div class="ps-card-body">' + tabela([{ t: 'Task' }, { t: 'Company' }, { t: 'Assigned to' }, { t: 'Status' }, { t: 'Approved', dir: 1 }, { t: 'Required evidence', dir: 1 }, { t: 'Estimated', dir: 1 }, { t: 'Restated', dir: 1 }, { t: 'Open requests', dir: 1 }], lista.map(function (m) {
        var ob = m.indicadores.filter(function (id) { return P.evidenciaPrecisa(m, id); }), okEv = ob.filter(function (id) { return P.item(id, P.chave(m)).evidencias.length; }).length;
        return ['<a href="' + rota('Milestone/' + m.id + '?sep=auditoria') + '">' + e(m.nome) + '</a>', empHtml(m.empresa), atribHtml(m), estChip(m), P.concluida(m) ? m.indicadores.length + '/' + m.indicadores.length : '0/' + m.indicadores.length, okEv + '/' + ob.length, m.indicadores.filter(function (id) { return P.item(id, P.chave(m)).qualidade === 'estimado'; }).length, m.indicadores.filter(function (id) { return P.item(id, P.chave(m)).reexpresso; }).length, pedidosDe(m)];
      }), 'No tasks match this filter.') + '</div></div>' +
      '<div class="ps-card ps-mt">' + cabCartao('Information requests', 'ativ') + (S.aud.length ? cartaoPedidos(S.aud) : vazio('No requests yet.')) + '</div>';
  };

  /* --- Pedidos de dados (entidade externa) ------------------------------- */
  Blocos['pedidos'] = function () {
    var usr = u(), meus = S.ext.filter(function (x) { return x.entidade_externa === usr.nome; }), grupos = {};
    meus.forEach(function (x) { (grupos[x.milestone_id] = grupos[x.milestone_id] || []).push(x); });
    var ids = Object.keys(grupos);
    if (!ids.length) return '<div class="ps-card">' + vazio('There are no requests for your organisation.') + '</div>';
    return ids.map(function (mid) {
      var m = P.ms(mid);
      return '<div class="ps-card ps-mt">' + cabCartao(m ? m.nome : mid, 'doc') + grupos[mid].map(function (x) {
        var c = P.cat(x.indicador_id), aberto = x.estado === 'pendente';
        return '<div class="ps-ind"><div class="ps-sp-b"><b>' + e(c.nome) + ' (' + e(c.unidade_medida) + ')</b>' + (aberto ? chip('Due ' + P.fmtData(x.prazo), 'warn') : chip('Sent', 'ok')) + '</div><p class="ps-mt">' + e(x.descricao) + '</p>' +
          (aberto ? '<div class="ps-form ps-mt">' + campo('xv-' + x.id, 'Value', '<input id="xv-' + e(x.id) + '" class="ps-in"' + numAttr(x.indicador_id) + '>') + campo('xe-' + x.id, 'Supporting document (.xlsx, or .pdf for invoices)', ficheiroHtml('xe-' + x.id, P.ACEITA_SUPORTE)) + '</div><button type="button" class="ps-btn pri ps-mt" data-a="enviarExt" data-v="' + e(x.id) + '">Send</button>' :
            '<p class="ps-mut ps-small ps-mt">Value sent: ' + e(fmtV(x.indicador_id, x.valor)) + (x.evidencia ? ', ' + e(x.evidencia) : '') + ', ' + e(P.fmtDataHora(x.respondido_em)) + '</p>') + '</div>';
      }).join('') + '</div>';
    }).join('');
  };

  /* --- Backoffice -------------------------------------------------------- */
  /* Backoffice por grupos. Indicators e a pagina unica dos KPIs (portal-indicadores.js): caracteristicas, responsaveis, empresas, Excel e envio de tasks.
     KPI assignment e Companies and perimeter deixaram de ser paginas e vivem aqui. */
  var BO_GRUPOS = [
    ['Indicators', [['indicadores', 'Indicators'], ['milestones', 'Tasks sent']]],
    ['Organisation', [['perimetro', 'Companies and perimeter'], ['utilizadores', 'Users and profiles'], ['externas', 'External entities']]],
    ['Reporting set-up', [['periodos', 'Reporting periods'], ['momentos', 'Reporting moments'], ['calculos', 'Calculations'], ['wfbase', 'Base workflow'], ['calendario', 'Calendar'], ['materialidade', 'Materiality and frameworks']]],
    ['Platform', [['areas', 'Data consumer areas'], ['ligacoes', 'Connections'], ['dados', 'Data and storage']]]
  ];
  var BO = []; BO_GRUPOS.forEach(function (g) { g[1].forEach(function (t) { BO.push(t); }); });
  var B = {};
  Blocos['backoffice'] = function () {
    if (!B[U.boTab] || !BO.some(function (t) { return t[0] === U.boTab; })) U.boTab = 'indicadores';
    var nav = BO_GRUPOS.map(function (g) { return '<div class="ps-bo-grp"><span class="ps-bo-gt">' + e(g[0]) + '</span>' + g[1].map(function (t) { return '<button type="button" class="ps-bo-tab ' + (U.boTab === t[0] ? 'on' : '') + '" data-a="boTab" data-v="' + t[0] + '"' + (U.boTab === t[0] ? ' aria-current="true"' : '') + '>' + e(t[1]) + '</button>'; }).join('') + '</div>'; }).join('');
    return '<div class="ps-bo' + (U.boTab === 'indicadores' ? ' ps-bo-largo' : '') + '"><nav class="ps-bo-tabs" aria-label="Backoffice sections">' + nav + '</nav><div class="ps-col">' + B[U.boTab]() + '</div></div>';
  };
  var MAT_TXT = { material: 'Material', 'não material': 'Not material', 'por avaliar': 'To assess' };
  B.materialidade = function () {
    var cob = S.mat.map(function (x) {
      var cs = S.cat.filter(function (c) { return c.esrs === x.norma; }), apr = cs.filter(function (c) { var m = P.msDoIndicador(c.id); return m && P.concluida(m); }).length;
      return [ '<button type="button" class="ps-btn liga mat-t" data-a="matVer" data-v="' + e(x.norma) + '" title="See the indicators of ' + e(x.norma + ' ' + x.tema) + '"><b>' + e(x.norma) + '</b> ' + e(x.tema) + '</button>', '<select id="mat-' + x.norma + '" class="ps-sel" aria-label="Assessment of ' + e(x.norma) + '" data-c="matAval" data-id="' + x.norma + '">' + ['material', 'não material', 'por avaliar'].map(function (o) { return opt(o, MAT_TXT[o], x.avaliacao); }).join('') + '</select>', '<input id="matj-' + x.norma + '" class="ps-in" aria-label="Justification of ' + e(x.norma) + '" value="' + e(x.justificacao) + '" data-c="matJust" data-id="' + x.norma + '">', '<button type="button" class="ps-btn liga" data-a="matVer" data-v="' + e(x.norma) + '">' + cs.length + ' indicator' + (cs.length === 1 ? '' : 's') + '</button>, ' + apr + ' approved' + (x.avaliacao === 'material' && !cs.length ? ' ' + chip('No indicators', 'err') : '')];
    });
    var ref = S.cat.map(function (c) { var m = P.msDoIndicador(c.id), est = m ? P.estadoIndicador(m, c.id) : { txt: '-', cls: '' }; return [e(c.nome), e(m ? m.id : '-'), e(c.esrs_requisito), e(c.gri), e(c.utilizado_por.filter(function (x) { return x !== 'REL'; }).join(', ') || '-'), chip(est.txt, est.cls)]; });
    return '<div class="ps-card">' + cabCartao('Materiality', 'tarefa') + '<div class="ps-card-body">' + tabela([{ t: 'Topic' }, { t: 'Assessment' }, { t: 'Justification' }, { t: 'Coverage' }], cob) + '<p class="ps-small ps-mut ps-mt">Click a topic to see the indicators that feed it.</p>' + '<p class="ps-mut ps-small ps-mt">The mapping uses the 2023 ESRS numbering and must be reviewed once the delegated act for the simplified ESRS is published.</p></div></div>' +
      '<div class="ps-card">' + cabCartao('One data point, several frameworks', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Indicator' }, { t: 'Task' }, { t: 'ESRS' }, { t: 'GRI' }, { t: 'Other users' }, { t: 'Status' }], ref) + '</div></div>';
  };
  /* Indicadores de um topico de materialidade (norma ESRS) */
  var pnMatInd = function (a) {
    var x = S.mat.filter(function (y) { return y.norma === a.norma; })[0], cs = S.cat.filter(function (c) { return c.esrs === a.norma; });
    var linhas = cs.map(function (c) {
      var m = P.msDoIndicador(c.id), est = m ? P.estadoIndicador(m, c.id) : { txt: 'No task', cls: '' }, r = P.responsavelInd ? P.responsavelInd(c.id) : null;
      return [linkFicha(c.id, c.id + ' ' + c.nome) + '<small class="ps-mut ps-blk">' + e((c.esrs_requisito || '') + (P.esrsDe(c.id).dps.length ? ', ' + P.esrsDe(c.id).dps.length + ' ESRS datapoint(s)' : '')) + '</small>',
        P.empresasInd(c).map(function (y) { return empHtml(y.nome); }).join(' '), r ? (r.tipo === 'pessoa' ? pessHtml(r.nome) : depHtml(r.dep)) : depHtml(P.donoIndicador(c.id)), e(PERIODO_TXT[c.periodicidade] || c.periodicidade), chip(est.txt, est.cls)];
    });
    return { t: x ? x.norma + ' ' + x.tema : a.norma, s: (x ? MAT_TXT[x.avaliacao] : '') + ', ' + cs.length + ' indicator(s)', largo: true,
      b: (x && x.justificacao ? '<div class="ps-aviso">' + e(x.justificacao) + '</div>' : '') + tabela([{ t: 'Indicator' }, { t: 'Companies' }, { t: 'Responsible' }, { t: 'Frequency' }, { t: 'Status' }], linhas, 'No indicator is mapped to this topic yet. Map one in Backoffice, Indicators (ESRS standard).'),
      p: '<a class="ps-btn" href="' + rota('Backoffice?tab=indicadores') + '" data-a="fecharPainel">Open Indicators</a><span class="ps-sp-flex"></span><button type="button" class="ps-btn pri" data-a="fecharPainel">Close</button>' };
  };
  /* Utilizadores: so pessoas. O papel vem do perfil e os departamentos sao tags (uma pessoa pode ter varios).
     As entidades externas nao entram aqui: estao em External entities. O login gera-se a partir do nome. */
  var PERFIS_PESSOA = ['resp', 'revisor', 'esg', 'auditor', 'admin'];
  var PERFIL_AJUDA = { admin: 'Manages everything, including the Backoffice', esg: 'Data approver: approves the reporting at the end (sustainability team) and manages the Backoffice', resp: 'Data provider (focal point): fills in and submits the data of their departments', revisor: 'Data reviewer (superior): approves what their departments submit, before the sustainability team. Becomes the area head of their departments', auditor: 'Reads everything and asks for evidence; changes nothing' };
  var tagsUnidades = function (x, pref) {
    var l = P.unidadesDe(x), livres = P.UNIDADES.filter(function (d) { return l.indexOf(d) < 0; }), id = pref + x.login.replace(/[^a-zA-Z0-9_-]/g, '_');
    return '<div class="us-tags">' + l.map(function (d) { return '<span class="us-tag">' + avEquipa() + e(d) + '<button type="button" class="us-tag-x" data-a="userUnTirar" data-v="' + e(x.login + '|' + d) + '" aria-label="Remove ' + e(d) + ' from ' + e(x.nome) + '">×</button></span>'; }).join('') +
      (livres.length ? '<label class="ps-sr" for="' + id + '">Add a department to ' + e(x.nome) + '</label><select id="' + id + '" class="ps-sel us-add" data-c="userUnJuntar" data-id="' + e(x.login) + '">' + opt('', l.length ? '+ Add' : '+ Add department', '') + livres.map(function (d) { return opt(d, d, ''); }).join('') + '</select>' : '') + '</div>';
  };
  /* Departamentos de uma pessoa numa empresa (so os que existem nessa empresa) */
  var X0 = { empHtml: function (n) { return empHtml(n); } };
  var tagsUnidadesEmp = function (x, y) {
    var l = P.unidadesDe(x, y.nome), existem = P.depsDaEmpresa ? P.depsDaEmpresa(y.nome) : P.UNIDADES, livres = existem.filter(function (d) { return l.indexOf(d) < 0; }), id = 'uue-' + (x.login + '-' + y.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    return '<div class="us-tags">' + l.map(function (d) { return '<span class="us-tag">' + avEquipa() + e(d) + '<button type="button" class="us-tag-x" data-a="userUnTirarEmp" data-v="' + e(x.login + '|' + y.id + '|' + d) + '" aria-label="Remove ' + e(d) + ' from ' + e(x.nome) + ' in ' + e(y.nome) + '">×</button></span>'; }).join('') +
      (livres.length ? '<label class="ps-sr" for="' + id + '">Add a department to ' + e(x.nome) + ' in ' + e(y.nome) + '</label><select id="' + id + '" class="ps-sel us-add" data-c="userUnJuntarEmp" data-id="' + e(x.login + '|' + y.id) + '">' + opt('', l.length ? '+ Add' : '+ Add department', '') + livres.map(function (d) { return opt(d, d, ''); }).join('') + '</select>' : '') + '</div>';
  };
  /* Empresas de uma pessoa: um chip por empresa; todas marcadas quando a pessoa trabalha em todas */
  var tagsEmpresas = function (x, pref) {
    var on = P.empresasUser(x).map(function (y) { return y.id; });
    return '<div class="ps-dt-chips" role="group" aria-label="Companies of ' + e(x.nome) + '">' + S.ent.map(function (y) { var ck = on.indexOf(y.id) > -1; return '<label class="ps-dt-chip' + (ck ? ' on' : '') + '"><input type="checkbox" id="' + pref + e(x.login) + '-' + e(y.id) + '" data-c="userEmp" data-id="' + e(x.login + '|' + y.id) + '"' + (ck ? ' checked' : '') + '>' + e(y.nome) + '</label>'; }).join('') + '</div>';
  };
  /* Nome do grupo: a empresa-mae do perimetro, ou o nome da plataforma */
  var nomeGrupo = function () { var mae = (S.ent || []).filter(function (x) { return x.metodo === 'mae'; })[0]; return mae ? mae.nome + ' group' : ((S.marca && S.marca.nome) || 'Group'); };
  var chefeDe = function (x) { return P.chefiasDe(x).map(function (c) { return c.dep + (S.ent.length > 1 ? ' (' + c.empresa + ')' : ''); }); };
  /* Data reviewer: passa a ser area head dos seus departamentos */
  var chefeDosDeps = function (x) {
    var l = [];
    /* Por empresa: o data reviewer fica responsavel do seu departamento em cada empresa onde trabalha e onde o departamento existe */
    (S.deps || []).forEach(function (d) {
      if (!P.temUnidade(x, d.nome)) return;
      (P.empresasDoDep ? P.empresasDoDep(d) : S.ent).forEach(function (y) {
        if (!P.userNaEmpresa(x, y.nome) || !P.temUnidade(x, d.nome, y.nome)) return;
        d.chefes = d.chefes || {};
        var atual = d.chefes[y.id] || d.chefe;
        if (atual === x.login && d.chefes[y.id]) return;
        var antes = atual ? (P.user(atual) || {}).nome : 'nobody';
        d.chefes[y.id] = x.login; l.push(d.nome + ' (' + y.nome + ')');
        if (atual !== x.login) P.eventoGlobal('Department ' + d.nome + ', ' + y.nome + ': area head changed from ' + antes + ' to ' + x.nome + ' (data reviewer).', u().nome, 'Change');
      });
    });
    return l;
  };
  B.utilizadores = function () {
    var q = norm(U.userBusca || ''), fe = U.userEmpF || '', pessoas2 = S.users.filter(function (x) { return x.perfil !== 'ext'; });
    /* Pelos niveis do Reporting Perimeter: grupo, empresa, departamento, pessoa */
    var primEmp = function (x) { var l2 = P.empresasUser(x); return l2.length === S.ent.length ? '' : l2.map(function (y) { return y.nome; }).sort()[0]; };
    /* Uma linha por pessoa e empresa: uma pessoa que trabalha em duas empresas aparece em duas linhas */
    var l = [];
    pessoas2.forEach(function (x) { P.empresasUser(x).forEach(function (y) { if (fe && y.id !== fe) return; l.push({ x: x, y: y }); }); });
    l = l.filter(function (r) { return !q || norm(r.x.nome + ' ' + P.PERFIS[r.x.perfil] + ' ' + P.unidadesDe(r.x, r.y.nome).join(' ') + ' ' + r.y.nome).indexOf(q) > -1; })
      .sort(function (a, b) { return a.y.nome.localeCompare(b.y.nome) || (P.unidadesDe(a.x, a.y.nome)[0] || '~').localeCompare(P.unidadesDe(b.x, b.y.nome)[0] || '~') || a.x.nome.localeCompare(b.x.nome); });
    var grupo = nomeGrupo();
    var n = function (k) { return pessoas2.filter(function (x) { return x.perfil === k; }).length; };
    var nu = U.userNovo || (U.userNovo = { nome: '', perfil: 'resp', unidades: [], empresas: [] });
    if (!nu.empresas) nu.empresas = [];
    var novo = '<div class="us-novo"><h3>New user</h3><div class="us-novo-g">' + campo('nu-nome', 'Full name', '<input id="nu-nome" class="ps-in" autocomplete="off" placeholder="First and last name" value="' + e(nu.nome) + '" data-c="userNovoC" data-f="nome">') +
      campo('nu-perfil', 'Profile', '<select id="nu-perfil" class="ps-sel" data-c="userNovoC" data-f="perfil">' + PERFIS_PESSOA.map(function (k) { return opt(k, P.PERFIS[k], nu.perfil); }).join('') + '</select>') +
      '<div class="ps-campo"><span class="ps-lab">Departments</span>' + tagsUnidades({ login: '__novo', nome: 'the new user', unidades: nu.unidades }, 'nu-un-') + '</div>' +
      '<div class="ps-campo"><span class="ps-lab">Companies</span>' + tagsEmpresas({ login: '__novo', nome: 'the new user', empresas: nu.empresas }, 'nu-em-') + '</div>' +
      '<button type="button" class="ps-btn pri" data-a="userNovo">Add user</button></div><small class="ps-mut">' + e(PERFIL_AJUDA[nu.perfil]) + '. The sign-in name is created from the full name.</small></div>';
    return '<div class="ps-card">' + cabCartao('Users and profiles', 'tarefa', '<span class="ps-sp"><span class="ps-small ps-mut">' + PERFIS_PESSOA.map(function (k) { return n(k) + ' ' + P.PERFIS[k].toLowerCase(); }).join(' · ') + '</span><button type="button" class="ps-btn peq" data-a="depsAbrir">Manage departments</button></span>') + '<div class="ps-card-body">' + novo +
      '<div class="ps-filtros ps-mt">' + campo('us-q', 'Search', '<input id="us-q" class="ps-in" placeholder="Name, profile or department" value="' + e(U.userBusca || '') + '" data-c="userBusca">') +
        campo('us-emp', 'Company', '<select id="us-emp" class="ps-sel" data-c="userEmpF">' + opt('', 'All companies', fe) + S.ent.map(function (y) { return opt(y.id, y.nome, fe); }).join('') + '</select>') + '</div>' +
      tabela([{ t: 'Group' }, { t: 'Company', info: 'One row per person and company. Someone who works in two companies has two rows, each with the business units they are responsible for there.' }, { t: 'Business unit / Department', info: 'The departments of the person in this company. A data reviewer is the area head of them in this company.' }, { t: 'Name', info: 'Click to rename. The name is kept in the history and the approvals.' }, { t: 'Profile', info: 'Data provider (focal point): fills in and submits. Data reviewer (superior): approves what the department submits. Data approver (sustainability team): approves at the end and manages the Backoffice. Auditor: reads everything and changes nothing. Administrator: everything.' }, { t: 'Actions' }], l.map(function (r) {
        var x = r.x, y = r.y, eu = u() && u().login === x.login, outras = S.ent.filter(function (z) { return !P.userNaEmpresa(x, z.nome) || (x.empresas || []).length === 0 && false; }).filter(function (z) { return P.empresasUser(x).every(function (w) { return w.id !== z.id; }); });
        var ch = P.chefiasDe(x).filter(function (c) { return c.empresa === y.nome; }).map(function (c) { return c.dep; });
        var nEmp = P.empresasUser(x).length;
        return ['<span class="ps-small">' + e(grupo) + '</span>',
          X0.empHtml(y.nome) + (outras.length ? '<label class="ps-sr" for="ua-' + e(x.login + y.id) + '">Add ' + e(x.nome) + ' to another company</label><select id="ua-' + e(x.login + y.id) + '" class="ps-sel us-add" data-c="userEmpAdd" data-id="' + e(x.login) + '"><option value="">+ Company</option>' + outras.map(function (z) { return opt(z.id, z.nome, ''); }).join('') + '</select>' : ''),
          tagsUnidadesEmp(x, y),
          '<input id="un-' + e(x.login + '-' + y.id) + '" class="ps-in us-nome" aria-label="Name of ' + e(x.nome) + '" value="' + e(x.nome) + '" data-c="userNome" data-id="' + e(x.login) + '">' + (eu ? ' <span class="ps-chip info">You</span>' : '') + (ch.length ? '<small class="ps-mut ps-blk">Area head of ' + e(ch.join(', ')) + '</small>' : ''),
          '<select id="up-' + e(x.login + '-' + y.id) + '" class="ps-sel" aria-label="Profile of ' + e(x.nome) + '" data-c="userPerfil" data-id="' + e(x.login) + '"' + (eu ? ' disabled title="You cannot change your own profile"' : '') + '>' + PERFIS_PESSOA.map(function (k) { return opt(k, P.PERFIS[k], x.perfil); }).join('') + '</select>',
          eu ? '<span class="ps-mut ps-small">-</span>' : nEmp > 1 ? '<button type="button" class="ps-btn peq" data-a="userEmpTirar" data-v="' + e(x.login + '|' + y.id) + '" title="Remove ' + e(x.nome) + ' from ' + e(y.nome) + ' only">Remove from ' + e(y.nome) + '</button>' : '<button type="button" class="ps-btn peq err" data-a="userApagar" data-v="' + e(x.login) + '">Remove</button>'];
      }), 'No user matches the search.') + '<p class="ps-small ps-mut ps-mt">External entities (suppliers and partners that answer data requests) are managed in External entities.</p></div></div>';
  };
  B.externas = function () {
    return '<div class="ps-card">' + cabCartao('External entities: requests and status', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Entity' }, { t: 'Indicator' }, { t: 'Task' }, { t: 'Company' }, { t: 'Due' }, { t: 'Status' }], S.ext.map(function (x) {
      var cl = { pendente: 'warn', recebido: 'info', aplicado: 'ok' }[x.estado], mx = P.ms(x.milestone_id);
      return [x.tipo === 'ajuda' ? pessHtml(x.entidade_externa) : e(x.entidade_externa), e(P.cat(x.indicador_id).nome), '<a href="' + rota('Milestone/' + x.milestone_id + '?sep=externos') + '">' + e(mx ? mx.nome : x.milestone_id) + '</a>', mx ? empHtml(mx.empresa) : '-', e(P.fmtData(x.prazo)), chip({ pendente: 'Pending', recebido: 'Received', aplicado: 'Applied' }[x.estado], cl)];
    }), 'No requests yet.') + '</div></div>';
  };
  B.wfbase = function () {
    return '<div class="ps-card">' + cabCartao('Base workflow', 'ativ', '<button type="button" class="ps-btn peq" data-a="abrirWfBase">Change base workflow</button>') + '<div class="ps-card-body">' + tabela([{ t: 'Step' }, { t: 'Type' }, { t: 'Owner' }], S.wfbase.map(function (p, i) { return [(i + 1) + '. ' + e(p.nome), e(P.TIPOS_PASSO[p.tipo]), e(P.nomeResp(null, p.responsavel))]; })) + '<p class="ps-mut ps-small ps-mt">Applies to new tasks. When saving, you can also apply it to those not yet started and not adjusted.</p></div></div>';
  };
  /* A pagina dos indicadores esta em portal-indicadores.js; aqui fica a lista das tasks (milestones) ja enviadas */
  B.indicadores = function () { return vazio('The indicators page did not load.'); };
  /* Calculations (formulas e fatores de emissao) e configuracao: vive no Backoffice, so para quem o gere */
  B.calculos = function () { return '<div class="ps-card"><div class="ps-card-body"><h2 class="ki-h2">Calculations</h2><p class="ps-mut ps-small">Configured formulas and a versioned emission factor library. The values of the indicators that use them are calculated from here.</p></div></div>' + (Blocos['calculos'] ? Blocos['calculos']() : ''); };
  B.perimetro = function () { return Blocos['perimetro'] ? Blocos['perimetro']() : ''; };
  /* Tasks sent: por task (com o donut do estado dos indicadores) ou por indicador; apagar uma task enviada */
  U.boMs = { vista: 'kpi', q: '' };
  B.milestones = function () {
    var f = U.boMs, q = norm(f.q || ''), todas = P.msCiclo().filter(function (m) { return !q || norm(m.nome + ' ' + m.empresa + ' ' + m.unidade + ' ' + (P.atribuido(m) ? P.atribuido(m).nome : '') + ' ' + m.indicadores.join(' ')).indexOf(q) > -1; });
    /* Por agora so a vista By indicator (a vista By task fica no codigo, escondida) */
    f.vista = 'kpi';
    var seg = '';
    var busca = '<div class="ps-filtros">' + campo('bo-ms-q', 'Search', '<input id="bo-ms-q" class="ps-in" type="search" placeholder="Task, company, department, person or KPI" value="' + e(f.q || '') + '" data-c="boMsQ">') + '</div>';
    if (f.vista === 'kpi') {
      var lk = []; todas.forEach(function (m) { m.indicadores.forEach(function (id) { if (P.cat(id)) lk.push({ m: m, id: id }); }); });
      var ico = function (d) { return svg(d, 15); }, LIXO = '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/>', TIRAR = '<path d="M5 12h14"/><circle cx="12" cy="12" r="9"/>';
      return '<div class="ps-card">' + cabCartao('Indicators sent (' + lk.length + ' in ' + todas.length + ' tasks)', 'tarefa', seg) + '<div class="ps-card-body">' + busca + tabela([{ t: 'Indicator' }, { t: 'Task' }, { t: 'Company' }, { t: 'Assigned to' }, { t: 'Value', dir: 1 }, { t: 'Due' }, { t: 'Status' }, { t: '' }], lk.map(function (x) {
        var c = P.cat(x.id), it = P.item(x.id, P.chave(x.m)), st = estadoTarefa(x.m, x.id);
        var fechado = P.concluida(x.m) || P.indAprovado(x.m, x.id);
        var acoes = fechado ? '<span class="ps-mut ps-small" title="Approved: it stays in the history">-</span>' : '<span class="ms-acoes"><button type="button" class="ms-del" data-a="boIndTirar" data-v="' + e(x.m.id + '|' + x.id) + '" aria-label="Remove ' + e(x.id) + ' from ' + e(x.m.nome) + '" data-tip="Remove this indicator from the task (it can be sent again)">' + ico(TIRAR) + '</button><button type="button" class="ms-del" data-a="boMsApagar" data-v="' + e(x.m.id) + '" aria-label="Delete the task ' + e(x.m.nome) + '" data-tip="Delete the whole task (' + x.m.indicadores.length + ' indicators)">' + ico(LIXO) + '</button></span>';
        return ['<a href="' + rota('Milestone/' + x.m.id + '?ind=' + encodeURIComponent(x.id)) + '"><b>' + e(c.nome) + '</b></a><small class="ps-mut ps-blk">' + e(x.id + ', ' + c.unidade_medida) + '</small>', '<a href="' + rota('Milestone/' + x.m.id) + '">' + e(x.m.nome) + '</a>', empHtml(x.m.empresa), atribKpi(x.m, x.id), it && it.valor !== null ? '<span class="ps-num">' + e(fmtV(x.id, it.valor)) + '</span>' : '<span class="ps-mut">-</span>', '<span class="ps-nowrap">' + e(P.fmtData(x.m.prazo)) + '</span>', P.chipEstadoTarefa(x.m, st), acoes];
      }), 'No indicators sent.') + '</div></div>';
    }
    return '<div class="ps-card">' + cabCartao('Tasks (' + todas.length + ')', 'tarefa', seg) + '<div class="ps-card-body">' + busca + tabela([{ t: 'Task', info: 'The ring shows the indicators of the task by status; the number is how many are still to report.' }, { t: 'Company' }, { t: 'Assigned to' }, { t: 'Indicators', dir: 1 }, { t: 'Due' }, { t: 'Status' }, { t: '', sr: 'Actions' }], todas.map(function (m) {
      var linha = (function () {
        return ['<a href="' + rota('Milestone/' + m.id) + '">' + e(m.nome) + '</a>', '<select id="bo-emp-' + e(m.id) + '" class="ps-sel" aria-label="Company of ' + e(m.nome) + '" data-c="msEmpresa" data-id="' + e(m.id) + '">' + S.ent.map(function (x) { return opt(x.nome, x.nome, m.empresa); }).join('') + '</select>', P.concluida(m) || P.passoAtual(m).tipo !== 'recolha' ? atribHtml(m) : '<select id="bo-atr-' + e(m.id) + '" class="ps-sel" aria-label="Assigned to, ' + e(m.nome) + '" data-c="msAtrib" data-id="' + e(m.id) + '">' + opt('', m.unidade + ' (department)', m.atribuido_a || '') + P.atribuiveis(m).map(function (x) { return opt(x.login, x.nome, m.atribuido_a || ''); }).join('') + '</select>', m.indicadores.length, '<input id="pz-' + e(m.id) + '" class="ps-in" type="date" aria-label="Due date of ' + e(m.nome) + '" value="' + e(m.prazo) + '" data-c="msPrazo" data-id="' + e(m.id) + '">', estChip(m)];
      })();
      linha[0] = '<div class="ms-dn-l">' + donutInd(m, true) + '<div>' + linha[0] + '</div></div>';
      var temDados = m.indicadores.some(function (id) { var it = P.item(id, P.chave(m)); return it && (it.valor !== null || it.evidencias.length); });
      linha.push(P.concluida(m) ? '<span class="ps-mut ps-small" title="Completed tasks stay in the history">-</span>' : '<button type="button" class="ms-del" data-a="boMsApagar" data-v="' + e(m.id) + '" aria-label="Delete ' + e(m.nome) + '" data-tip="Delete this task' + (temDados ? ' (it already has values or files)' : '') + '">' + svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/>', 16) + '</button>');
      return linha;
    })) + '</div></div>';
  };
  var MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  B.calendario = function () {
    return '<div class="ps-card">' + cabCartao('Reporting windows', 'cal', '<button type="button" class="ps-btn peq" data-a="janNova">New window</button>') + '<div class="ps-card-body">' + tabela([{ t: 'Window' }, { t: 'Topic' }, { t: 'Months' }, { t: 'First day' }, { t: 'Last day' }, { t: 'Actions' }], S.janelas.map(function (j, i) {
      return ['<input id="jn-' + i + '" class="ps-in" aria-label="Window name" value="' + e(j.nome) + '" data-c="janNome" data-id="' + i + '">', '<select id="jt-' + i + '" class="ps-sel" aria-label="Topic" data-c="janTema" data-id="' + i + '">' + Object.keys(P.TEMAS).map(function (t) { return opt(t, t, j.tema); }).join('') + '</select>', '<input id="jm-' + i + '" class="ps-in" aria-label="Months, 1 to 12, comma separated" value="' + e(j.meses.join(', ')) + '" data-c="janMeses" data-id="' + i + '"><small class="ps-mut">' + (j.meses.length === 12 ? 'All' : j.meses.map(function (x) { return MESES[x - 1]; }).join(', ')) + '</small>', '<input id="ji-' + i + '" class="ps-in" type="number" min="1" max="31" aria-label="First day" value="' + j.dia_inicio + '" data-c="janIni" data-id="' + i + '">', '<input id="jf-' + i + '" class="ps-in" type="number" min="1" max="31" aria-label="Last day" value="' + j.dia_fim + '" data-c="janFim" data-id="' + i + '">', '<button type="button" class="ps-btn peq err" data-a="janApagar" data-v="' + i + '">Remove</button>'];
    }), 'No windows yet.') + '<p class="ps-mut ps-small ps-mt">Windows set when data is collected. Each task due date sets when it is delivered.</p></div></div>';
  };
  /* --- Tipos de dados ------------------------------------------------------ */
  var GRAN_TXT = { mensal: 'Monthly', trimestral: 'Quarterly', anual: 'Annual' };
  B.tipos = function () {
    var f = U.tiposF || { un: '', q: '', arq: false }, q = norm(f.q || '');
    var l = (S.tipos || []).filter(function (t) { return (!f.un || t.unidade === f.un) && (f.arq ? !t.ativo : t.ativo) && (!q || norm(t.nome + ' ' + t.motivo + ' ' + t.unidade).indexOf(q) > -1); });
    var linhas = l.map(function (t) {
      var usos = P.usosTipo(t.id), abertas = usos.filter(function (m) { return !P.concluida(m); }).length, nc = t.colunas && t.colunas.length;
      return ['<button type="button" class="ps-btn liga ps-dt-nome" data-a="tipoEditar" data-v="' + e(t.id) + '">' + e(t.nome) + '</button><small class="ps-mut ps-dt-mot">' + e(t.motivo || '') + '</small>', e(t.unidade),
        '<span class="ps-dt-fmt">' + t.formatos.map(function (x) { return '<span>' + e(x) + '</span>'; }).join('') + '</span>', e(GRAN_TXT[t.granularidade] || 'Monthly'),
        nc ? '<b>' + nc + '</b> fixed' : '<span class="ps-mut">From the indicators</span>', abertas + ' open, ' + usos.length + ' total', 'v' + t.versao + '<br><small class="ps-mut">' + e(P.fmtData(t.alterado_em)) + '</small>'];
    });
    return '<div class="ps-card">' + cabCartao('Data types', 'doc', '<button type="button" class="ps-btn pri peq" data-a="tipoNovo">New data type</button>') + '<div class="ps-card-body">' +
      '<p class="ps-mut ps-small">What each department is asked to deliver: the file, the accepted formats, the columns and their granularity. A data type is used by every task of its department; changes apply to open tasks and are versioned. Columns map to the source databases, so contributors can pull them instead of typing.</p>' +
      '<div class="ps-filtros ps-mt">' + campo('dt-un', 'Department', '<select id="dt-un" class="ps-sel" data-c="tiposUn">' + opt('', 'All', f.un) + P.UNIDADES.map(function (d) { return opt(d, d, f.un); }).join('') + '</select>') +
      campo('dt-q', 'Search', '<input id="dt-q" class="ps-in" value="' + e(f.q || '') + '" data-c="tiposQ" autocomplete="off">') +
      '<label class="ps-chk ps-dt-arq"><input id="dt-arq" type="checkbox" data-c="tiposArq"' + (f.arq ? ' checked' : '') + '> Show archived</label></div>' +
      tabela([{ t: 'Data type' }, { t: 'Department' }, { t: 'Formats' }, { t: 'Rows' }, { t: 'Columns' }, { t: 'Tasks' }, { t: 'Version' }], linhas, f.arq ? 'No archived data types.' : 'No data types match.') + '</div></div>';
  };
  /* Rascunho do editor: so grava ao carregar em Save */
  var rascunhoTipo = function (id) {
    var t = id ? P.tipo(id) : null;
    return t ? JSON.parse(JSON.stringify(t)) : { id: '', nome: '', motivo: '', formatos: ['xlsx'], unidade: (U.tiposF && U.tiposF.un) || P.UNIDADES[0], colunas: null, granularidade: 'mensal', obrigatorio: true, instrucoes: '', ativo: true, versao: 0 };
  };
  var pnTipo = function () {
    var t = U.tipoEd;
    if (!t) return { t: 'Data type', b: '' };
    var CAMPOS = P.CAMPOS_FONTE || {}, DBS = P.BASES_DADOS || {}, fixas = t.colunas || [];
    var usos = t.id ? P.usosTipo(t.id) : S.ms.filter(function (m) { return m.unidade === t.unidade && !m.tipos; });
    var abertas = usos.filter(function (m) { return !P.concluida(m); });
    /* Campos por base de dados, com os que os indicadores do departamento usam marcados */
    var usados = {};
    S.ms.filter(function (m) { return m.unidade === t.unidade; }).forEach(function (m) { (P.camposMilestone ? P.camposMilestone(m) : []).forEach(function (k) { usados[k] = 1; }); });
    var porDb = {};
    Object.keys(CAMPOS).forEach(function (k) { (porDb[CAMPOS[k].db] = porDb[CAMPOS[k].db] || []).push(k); });
    var ordemDb = Object.keys(porDb).sort(function (a, b) { var ua = porDb[a].some(function (k) { return usados[k]; }), ub = porDb[b].some(function (k) { return usados[k]; }); return ua === ub ? 0 : ua ? -1 : 1; });
    var auto = !fixas.length, sugeridas = Object.keys(usados);
    var cols = '<fieldset class="ps-dt-cols"><legend>Columns</legend><div class="ps-seg" role="radiogroup" aria-label="How columns are chosen"><button type="button" role="radio" aria-checked="' + auto + '" class="' + (auto ? 'on' : '') + '" data-a="tipoColModo" data-v="auto">From the indicators</button><button type="button" role="radio" aria-checked="' + !auto + '" class="' + (!auto ? 'on' : '') + '" data-a="tipoColModo" data-v="fixas">Fixed list</button></div>' +
      (auto ? '<p class="ps-small ps-mut ps-mt">Each task gets the columns its own indicators need' + (sugeridas.length ? ', today ' + sugeridas.length + ' for ' + e(t.unidade) : '') + '. Choose a fixed list when the file must always have the same layout.</p>' :
        '<p class="ps-small ps-mut ps-mt">' + fixas.length + ' column(s). Fields marked <span class="ps-dt-uso">used</span> feed an indicator of ' + e(t.unidade) + '.</p>' +
        ordemDb.map(function (db) {
          return '<div class="ps-dt-db"><h4>' + svg(I.base || I.doc, 14) + e(DBS[db] || db) + '</h4><ul>' + porDb[db].map(function (k) {
            var c = CAMPOS[k], on = fixas.indexOf(k) > -1;
            return '<li><label class="ps-chk"><input id="dtc-' + e(k) + '" type="checkbox" data-c="tipoCol" data-id="' + e(k) + '"' + (on ? ' checked' : '') + '><span><b>' + e(c.rot) + '</b><small class="ps-mono">' + e(k) + ', ' + e(c.tab) + ', ' + e(c.agreg) + '</small></span>' + (usados[k] ? '<span class="ps-dt-uso">used</span>' : '') + '</label></li>';
          }).join('') + '</ul></div>';
        }).join('')) + '</fieldset>';
    var aviso = t.id && abertas.length ? '<div class="ps-aviso warn">Saving updates ' + abertas.length + ' open task(s): ' + e(abertas.slice(0, 4).map(function (m) { return m.nome; }).join(', ')) + (abertas.length > 4 ? '…' : '') + '. Data already delivered keeps the version it was delivered with.</div>' : '';
    var prev = '<div class="ps-dt-prev"><span class="ps-mut ps-small">Preview of the sheet contributors get</span><div class="ps-tw"><table class="ps-t ps-dt-prev-t"><thead><tr><th>Period</th>' + (auto ? sugeridas.slice(0, 4) : fixas.slice(0, 4)).map(function (k) { return '<th>' + e(CAMPOS[k] ? CAMPOS[k].rot : k) + '</th>'; }).join('') + ((auto ? sugeridas : fixas).length > 4 ? '<th>…</th>' : '') + '<th>Source reference</th></tr></thead><tbody>' +
      (t.granularidade === 'anual' ? ['Ano 2026'] : t.granularidade === 'trimestral' ? ['T1 2026', 'T2 2026', '…'] : ['Jan 2026', 'Feb 2026', '…']).map(function (r) { return '<tr><td>' + r + '</td>' + (auto ? sugeridas.slice(0, 4) : fixas.slice(0, 4)).map(function () { return '<td></td>'; }).join('') + ((auto ? sugeridas : fixas).length > 4 ? '<td></td>' : '') + '<td></td></tr>'; }).join('') + '</tbody></table></div></div>';
    return {
      t: t.id ? 'Edit data type' : 'New data type', s: t.id ? 'Version ' + t.versao + ', used by ' + usos.length + ' task(s)' : 'Define once, used by every task of the department', largo: true,
      b: '<div class="ps-form2">' + campo('dt-nome', 'Name', '<input id="dt-nome" class="ps-in" value="' + e(t.nome) + '" data-c="tipoCampo" data-id="nome" placeholder="e.g. Faturas de eletricidade do período">') +
        campo('dt-unid', 'Department that delivers it', '<select id="dt-unid" class="ps-sel" data-c="tipoCampo" data-id="unidade">' + P.UNIDADES.map(function (d) { return opt(d, d, t.unidade); }).join('') + '</select>') + '</div>' +
        campo('dt-mot', 'Why it is requested', '<input id="dt-mot" class="ps-in" value="' + e(t.motivo) + '" data-c="tipoCampo" data-id="motivo" placeholder="Shown to the contributor next to the request">') +
        '<div class="ps-form2"><fieldset class="ps-dt-fs"><legend>Accepted formats</legend><div class="ps-dt-chips">' + P.FORMATOS.map(function (x) { var on = t.formatos.indexOf(x) > -1; return '<label class="ps-dt-chip' + (on ? ' on' : '') + '"><input type="checkbox" data-c="tipoFmt" data-id="' + x + '"' + (on ? ' checked' : '') + '>' + x + '</label>'; }).join('') + '</div></fieldset>' +
        '<fieldset class="ps-dt-fs"><legend>Rows of the sheet</legend><div class="ps-seg" role="radiogroup" aria-label="Rows of the sheet">' + Object.keys(GRAN_TXT).map(function (g) { return '<button type="button" role="radio" aria-checked="' + (t.granularidade === g) + '" class="' + (t.granularidade === g ? 'on' : '') + '" data-a="tipoGran" data-v="' + g + '">' + GRAN_TXT[g] + '</button>'; }).join('') + '</div></fieldset></div>' +
        '<label class="ps-chk"><input id="dt-obr" type="checkbox" data-c="tipoObr"' + (t.obrigatorio !== false ? ' checked' : '') + '> Required to submit the task</label>' +
        campo('dt-ins', 'Instructions for the contributor', '<textarea id="dt-ins" class="ps-ta" rows="2" data-c="tipoCampo" data-id="instrucoes" placeholder="Where to export it from, what period, who to ask">' + e(t.instrucoes || '') + '</textarea>') +
        cols + prev + aviso,
      p: (t.id ? '<button type="button" class="ps-btn liga" data-a="tipoArquivar">' + (t.ativo ? 'Archive' : 'Restore') + '</button>' : '') + '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="tipoGuardar">' + (t.id ? 'Save version ' + (t.versao + 1) : 'Create data type') + '</button>'
    };
  };

  /* --- Lancar milestones -------------------------------------------------- */
  /* A empresa escolhida no topo da pagina Indicators passa para o lancamento */
  var empLanc = function (L) { var x = U.ind && U.ind.emp ? S.ent.filter(function (y) { return y.id === U.ind.emp; })[0] : null; if (x) L.empresa = x.nome; };
  var lancEstado = function () {
    if (!U.lanc) {
      /* Comeca no primeiro periodo com departamentos planeados ainda por lancar */
      var prox = (S.periodos || []).filter(function (p) { return p.ano === S.ciclo.ano && P.UNIDADES.some(function (un) { return !P.msExistente(un, p.id) && P.indicadoresSugeridos(un, p.id).length; }); })[0];
      U.lanc = { periodos: prox ? [prox.id] : [], unidades: [], empresa: (S.ent[0] && S.ent[0].nome) || '', prazo: 'fecho', data: '', indicadores: {}, tipos: {}, atrib: {}, aberto: '' };
    }
    return U.lanc;
  };
  B.lancar = function () {
    var ano = S.ciclo.ano, pers = (S.periodos || []).filter(function (p) { return p.ano === ano; }), uns = P.UNIDADES;
    /* Mapa de cobertura: departamento x periodo, com o estado de cada milestone */
    /* Com uma empresa escolhida no topo da pagina Indicators, cada celula mostra a task dessa empresa */
    var empF = U.ind && U.ind.emp ? (S.ent.filter(function (x) { return x.id === U.ind.emp; })[0] || null) : null;
    var cel = function (un, p) {
      var l = S.ms.filter(function (x) { return x.unidade === un && x.periodo === p.id; }), m = empF ? l.filter(function (x) { return x.empresa === empF.nome; }).sort(function (a, b) { return (a.consolida ? 1 : 0) - (b.consolida ? 1 : 0); })[0] : P.msExistente(un, p.id) || l[0];
      if (!m && empF && l.length) return '<span class="ps-cob nada" title="' + e(l[0].nome + ' belongs to ' + l[0].empresa) + '">In ' + e(l[0].empresa) + '</span>';
      if (m) { var st = P.estadoMs(m); return '<a class="ps-cob ' + (P.concluida(m) ? 'ok' : st.cls) + '" href="' + rota('Milestone/' + m.id) + '" title="' + e(m.nome + ', ' + st.txt) + '">' + e(P.concluida(m) ? 'Done' : st.txt) + '</a>'; }
      var sug = P.indicadoresSugeridos(un, p.id).length;
      return sug ? '<button type="button" class="ps-cob vazio" data-a="lancCel" data-v="' + e(un + '|' + p.id) + '" title="Assign task: ' + e(un + ': ' + p.nome) + '">+ Assign task<small>' + sug + ' indicators</small></button>' : '<span class="ps-cob nada" title="No indicators planned">-</span>';
    };
    var faltam = 0;
    uns.forEach(function (un) { pers.forEach(function (p) { if (!P.msExistente(un, p.id) && P.indicadoresSugeridos(un, p.id).length) faltam++; }); });
    var porLancar = function (p) { return uns.filter(function (un) { return !P.msExistente(un, p.id) && P.indicadoresSugeridos(un, p.id).length; }).length; };
    return '<div class="ps-card">' + cabCartao('By department and period', 'cal') + '<div class="ps-card-body">' +
      '<p class="ps-mut ps-small">Each cell is a department in a reporting period, with the status of its task. Open cells show how many indicators the plan expects: click one to send it, or use the button of a period to send every department at once. Indicators come from Reporting moments and can be adjusted before sending.</p>' +
      '<div class="ps-kpis ps-mt"><div class="ps-kpi"><span>Tasks ' + ano + (empF ? ', ' + e(empF.nome) : '') + '</span><b>' + P.msCiclo().filter(function (m) { return !empF || m.empresa === empF.nome; }).length + '</b></div><div class="ps-kpi"><span>Planned, not assigned</span><b>' + faltam + '</b></div></div>' +
      '<div class="ps-cob-sc ps-mt" tabindex="0" aria-label="Coverage by department and period"><table class="ps-cob-t"><thead><tr><th scope="col">Department</th>' + pers.map(function (p) { var n = porLancar(p); return '<th scope="col">' + e(p.nome) + '<small>close ' + e(P.fmtData(p.fecho)) + '</small>' + (n ? '<button type="button" class="ps-btn pri peq ps-cob-lanc" data-a="lancPeriodo" data-v="' + e(p.id) + '">Assign tasks ' + e(p.nome) + '<small>' + n + ' department' + (n === 1 ? '' : 's') + '</small></button>' : '<span class="ps-cob-tudo">All assigned</span>') + '</th>'; }).join('') + '</tr></thead><tbody>' +
      uns.map(function (un) { return '<tr><th scope="row">' + depHtml(un) + '</th>' + pers.map(function (p) { return '<td>' + cel(un, p) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div></div>';
  };
  var pnLancar = function () {
    var L = lancEstado(), ano = S.ciclo.ano, pers = (S.periodos || []).filter(function (p) { return p.ano === ano; });
    var plano = [], novas = 0, existem = 0;
    L.unidades.forEach(function (un) { L.periodos.forEach(function (pid) { var p = P.periodo(pid), ex = P.msExistente(un, pid), inds = L.indicadores[un] || P.indicadoresSugeridos(un, pid); plano.push({ un: un, p: p, ex: ex, n: inds.length }); if (ex) existem++; else if (inds.length) novas++; }); });
    L.atrib = L.atrib || {};
    var idDe = function (dataC, v) { var h = 0, s = String(v); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return 'lc-' + dataC + '-' + (h >>> 0).toString(36); };
    var chk = function (cls, dataC, v, on, txt, sub, ico) { return '<label class="ps-dt-chip ' + cls + (on ? ' on' : '') + '"><input type="checkbox" id="' + idDe(dataC, v) + '" data-c="' + dataC + '" data-id="' + e(v) + '"' + (on ? ' checked' : '') + '>' + (ico || '') + e(txt) + (sub ? '<small>' + e(sub) + '</small>' : '') + '</label>'; };
    var pessoasUn = function (un) { return S.users.filter(function (x) { return x.perfil === 'resp' && P.temUnidade(x, un); }); };
    var quem = function (un) { var x = L.atrib[un] && P.user(L.atrib[un]); return x ? pessHtml(x.nome) : depHtml(un); };
    var porUn = L.unidades.map(function (un, iu) {
      var aberto = L.aberto === un, inds = L.indicadores[un] || null, sug = {}, tiposUn = (S.tipos || []).filter(function (t) { return t.ativo && t.unidade === un; }), tSel = L.tipos[un] || tiposUn.map(function (t) { return t.id; });
      L.periodos.forEach(function (pid) { P.indicadoresSugeridos(un, pid).forEach(function (id) { sug[id] = 1; }); });
      /* Os sugeridos pelo plano e os que se acrescentam aqui da lista de indicadores */
      var extra = (L.extra && L.extra[un]) || [], lista = Object.keys(sug).concat(extra.filter(function (id) { return !sug[id]; })), sel = inds || Object.keys(sug);
      var porTema = {}; S.cat.forEach(function (c) { if (lista.indexOf(c.id) > -1 || c.ativo === false) return; (porTema[c.tema || 'Other'] = porTema[c.tema || 'Other'] || []).push(c); });
      var juntar = '<div class="ps-lc-add"><label class="ps-lab" for="lc-add-' + iu + '">Add an indicator from the indicator list</label><select id="lc-add-' + iu + '" class="ps-sel" data-c="lancAdd" data-id="' + e(un) + '"><option value="">Choose an indicator…</option>' +
        Object.keys(porTema).map(function (t) { return '<optgroup label="' + e(t) + '">' + porTema[t].map(function (c) { return '<option value="' + e(c.id) + '">' + e(c.id + '  ' + c.nome + (P.donoIndicador(c.id) && P.donoIndicador(c.id) !== un ? ' (' + P.donoIndicador(c.id) + ')' : '')) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select></div>';
      var at = L.atrib[un] || '', ops = [{ v: '', ico: avEquipa(), t: un, s: 'Whole department' }].concat(pessoasUn(un).map(function (x) { return { v: x.login, ico: avPessoa(x.nome), t: x.nome, s: 'Data owner' }; }));
      var escolha = '<div class="ps-atr-l"><span class="ps-lab">Assigned to</span><div class="ps-atr-esc" role="radiogroup" aria-label="Assigned to, ' + e(un) + '">' + ops.map(function (o, i) { return '<label class="ps-atr-op' + (at === o.v ? ' on' : '') + '"><input type="radio" id="lc-at-' + iu + '-' + i + '" name="lc-at-' + iu + '" data-c="lancAtrib" data-id="' + e(un) + '" value="' + e(o.v) + '"' + (at === o.v ? ' checked' : '') + '>' + o.ico + '<span>' + e(o.t) + '<small>' + e(o.s) + '</small></span></label>'; }).join('') + '</div></div>';
      return '<li class="ps-lc-un' + (aberto ? ' aberto' : '') + '"><button type="button" class="ps-lc-un-h" data-a="lancUn" data-v="' + e(un) + '" aria-expanded="' + aberto + '">' + depHtml(un) + '<span>' + sel.length + ' indicators</span>' + svg(I.chev || '<path d="m6 9 6 6 6-6"/>', 14) + '</button>' + escolha +
        (aberto ? '<div class="ps-lc-un-b"><h4>Indicators</h4><div class="ps-dt-chips">' + (lista.length ? lista.map(function (id) { return chk('ind' + (sug[id] ? '' : ' extra'), 'lancInd', un + '|' + id, sel.indexOf(id) > -1, id, P.cat(id).nome + (sug[id] ? '' : ' (added)')); }).join('') : '<span class="ps-mut ps-small">The plan has no indicators for this department in the chosen periods. Add them from the list below.</span>') + '</div>' + juntar + '</div>' : '') + '</li>';
    }).join('');
    return {
      t: 'Assign tasks', s: 'One task per department and period, with the base workflow', largo: true, cls: 'alto',
      b: '<ol class="ps-lc">' +
        '<li><h3><span>1</span>Reporting periods</h3><div class="ps-dt-chips">' + pers.map(function (p) { var n = P.msPeriodo(p.id).length; return chk('', 'lancPer', p.id, L.periodos.indexOf(p.id) > -1, p.nome, n ? n + ' assigned' : 'Close ' + P.fmtData(p.fecho)); }).join('') + '</div></li>' +
        '<li><h3><span>2</span>Departments</h3><div class="ps-sp-b"><span class="ps-small ps-mut">' + L.unidades.length + ' selected</span><span class="ps-sp"><button type="button" class="ps-btn liga" data-a="lancTodos">Select all with a plan</button><button type="button" class="ps-btn liga" data-a="lancNenhum">Clear</button></span></div><div class="ps-dt-chips">' + P.UNIDADES.map(function (un) { return chk('ps-dt-chip-dep', 'lancUnSel', un, L.unidades.indexOf(un) > -1, un, '', avEquipa()); }).join('') + '</div></li>' +
        '<li><h3><span>3</span>Who it is assigned to and what is asked</h3>' + (L.unidades.length ? '<ul class="ps-lc-uns">' + porUn + '</ul>' : '<p class="ps-mut ps-small">Choose departments to see their indicators.</p>') + '</li>' +
        '<li><h3><span>4</span>Company and due date</h3><div class="ps-form2">' + campo('lc-emp', 'Company', '<select id="lc-emp" class="ps-sel" data-c="lancEmp">' + S.ent.map(function (x) { return opt(x.nome, x.nome, L.empresa); }).join('') + '</select>') +
        campo('lc-prazo', 'Due date', '<select id="lc-prazo" class="ps-sel" data-c="lancPrazo">' + opt('fecho', 'Internal close of each period', L.prazo) + opt('data', 'A specific date', L.prazo) + '</select>') + '</div>' +
        (L.prazo === 'data' ? campo('lc-data', 'Date', '<input id="lc-data" type="date" class="ps-in" value="' + e(L.data) + '" data-c="lancData">') : '') + '</li></ol>' +
        '<div class="ps-lc-res" aria-live="polite"><b>' + novas + ' task(s) will be created</b>' + (existem ? '<span>' + existem + ' already exist and will be skipped</span>' : '') +
        (plano.length ? '<ul>' + plano.slice(0, 12).map(function (x) { return '<li class="' + (x.ex ? 'ex' : !x.n ? 'nada' : '') + '"><span class="ps-lc-res-t">' + e(x.un + ': ' + x.p.nome) + '<small>' + (x.ex ? 'exists' : x.n ? x.n + ' indicators' : 'no indicators') + '</small></span>' + (x.ex || !x.n ? '' : quem(x.un)) + '</li>'; }).join('') + (plano.length > 12 ? '<li>…</li>' : '') + '</ul>' : '') + '</div>',
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="lancConfirmar"' + (novas ? '' : ' disabled') + '>Assign ' + novas + ' task(s)</button>'
    };
  };
  /* Momentos de report: que indicadores entram em cada periodo e em cada entrega externa */
  /* Empresas de um indicador: a que reporta tem de estar entre elas */
  var mudarEmpresasInd = function (c, ids) {
    var antes = P.empresasInd(c).map(function (x) { return x.nome; }).join(', ');
    c.empresas = S.ent.filter(function (x) { return ids.indexOf(x.id) > -1; }).map(function (x) { return x.id; });
    var rep = P.reportaInd(c); if (!rep || c.empresas.indexOf(rep.id) < 0) c.reporta = c.empresas[0];
    P.eventoGlobal('Indicator ' + c.id + ' ' + c.nome + ': Companies covered from ' + antes + ' to ' + P.empresasInd(c).map(function (x) { return x.nome; }).join(', ') + '.', u().nome, 'Change');
    P.guardar();
  };
  /* Reporting moments: em que periodos (T1 a T4, Year) entra cada indicador, e para que empresas (tags editaveis) */
  var empTags = function (c) {
    var l = P.empresasInd(c), ids = l.map(function (x) { return x.id; }), livres = S.ent.filter(function (x) { return ids.indexOf(x.id) < 0; });
    return '<div class="us-tags">' + l.map(function (x) { return '<span class="us-tag">' + avEmpresa() + e(x.nome) + (l.length > 1 ? '<button type="button" class="us-tag-x" data-a="momEmpTirar" data-v="' + e(c.id + '|' + x.id) + '" aria-label="Remove ' + e(x.nome) + ' from ' + e(c.nome) + '">×</button>' : '') + '</span>'; }).join('') +
      (livres.length ? '<label class="ps-sr" for="moe-' + e(c.id) + '">Add a company to ' + e(c.nome) + '</label><select id="moe-' + e(c.id) + '" class="ps-sel us-add" data-c="momEmpJuntar" data-id="' + e(c.id) + '">' + opt('', '+ Add', '') + livres.map(function (x) { return opt(x.id, x.nome, ''); }).join('') + '</select>' : '') + '</div>';
  };
  B.momentos = function () {
    var q = norm(U.momBusca || ''), fe = U.momEmp || '', l = S.cat.filter(function (c) { return (!q || norm(c.id + ' ' + c.nome + ' ' + P.donoIndicador(c.id)).indexOf(q) > -1) && (!fe || P.empresasInd(c).some(function (x) { return x.id === fe; })); });
    var tot = {};
    S.cat.forEach(function (c) { P.momentosDe(c.id).per.forEach(function (k) { tot[k] = (tot[k] || 0) + 1; }); });
    var cx = function (c, k, on, rot) { return '<label class="ps-chk ps-mom-c"><input id="mo-' + e(c.id + '-' + k) + '" type="checkbox" data-c="momento" data-id="' + e(c.id + '|per|' + k) + '"' + (on ? ' checked' : '') + '><span class="ps-sr">' + e(rot + ', ' + c.id) + '</span></label>'; };
    var linhas = l.map(function (c) {
      var mo = P.momentosDe(c.id);
      return [linkFicha(c.id, c.id + ' ' + c.nome) + (mo.proprio ? '<small class="ps-mom-prop" data-fx-ignorar>Custom <button type="button" class="ps-btn liga" data-a="momRepor" data-v="' + e(c.id) + '">Reset</button></small>' : ''), empTags(c), depHtml(P.donoIndicador(c.id)), e(PERIODO_TXT[c.periodicidade] || c.periodicidade)]
        .concat(P.MOMENTOS_PER.map(function (x) { return cx(c, x[0], mo.per.indexOf(x[0]) > -1, x[1]); }));
    });
    return '<div class="ps-card">' + cabCartao('Reporting moments', 'cal') + '<div class="ps-card-body">' +
      '<p class="ps-mut ps-small">Which indicators go into each reporting period, and for which companies. Periods start from the frequency of the indicator; ticking a box here overrides that for the indicator. Sending tasks and the tags of each task follow this table. Tasks already sent keep their indicators.</p>' +
      '<div class="ps-mom-tot ps-mt">' + P.MOMENTOS_PER.map(function (x) { return '<span><b>' + (tot[x[0]] || 0) + '</b>' + e(x[1]) + '</span>'; }).join('') + '</div>' +
      '<div class="ps-filtros ps-mt">' + campo('mom-busca', 'Search', '<input id="mom-busca" class="ps-in" value="' + e(U.momBusca || '') + '" data-c="momBusca" autocomplete="off">') +
      campo('mom-emp', 'Company', '<select id="mom-emp" class="ps-sel" data-c="momEmpF">' + opt('', 'All companies', fe) + S.ent.map(function (x) { return opt(x.id, x.nome, fe); }).join('') + '</select>') + '</div>' +
      '<div class="ps-mt ps-mom">' + tabela([{ t: 'Indicator' }, { t: 'Companies', info: 'The companies the indicator is reported for: Entidade A, Entidade B or both. With more than one, the value is entered per company and combined. Remove with ×, add with + Add.' }, { t: 'Department' }, { t: 'Frequency' }].concat(P.MOMENTOS_PER.map(function (x) { return { t: x[1] }; })), linhas, 'No indicators found.') + '</div></div></div>';
  };
  B.periodos = function () {
    var ano = S.ciclo.ano;
    return '<div class="ps-card">' + cabCartao('Reporting periods', 'cal') + '<div class="ps-card-body">' + tabela([{ t: 'Period' }, { t: 'Data from' }, { t: 'Data to' }, { t: 'Internal close' }, { t: 'Tasks', dir: 1 }], (S.periodos || []).filter(function (p) { return p.ano === ano; }).map(function (p) {
      return [e(p.nome), e(P.fmtDataAno(p.ini)), e(P.fmtDataAno(p.fim)), '<input id="pf-' + e(p.id) + '" class="ps-in" type="date" aria-label="Internal close of ' + e(p.nome) + '" value="' + e(p.fecho) + '" data-c="perFecho" data-id="' + e(p.id) + '">', String(P.msPeriodo(p.id).length)];
    })) + '<h3 class="ps-grupo-t">External deliveries</h3>' + tabela([{ t: 'Delivery' }, { t: 'Entity' }, { t: 'Period' }, { t: 'Due' }, { t: 'Legal basis' }], (S.relatorios || []).filter(function (r) { return r.periodo.indexOf(String(ano)) === 0; }).map(function (r) {
      return ['<b>' + e(r.sigla) + '</b> ' + e(r.nome), e(r.entidade), e((P.periodo(r.periodo) || {}).nome || r.periodo), '<input id="rd-' + e(r.id) + '" class="ps-in" type="date" aria-label="Due date of ' + e(r.nome) + '" value="' + e(r.data) + '" data-c="relData" data-id="' + e(r.id) + '">', '<span class="ps-small">' + e(r.base) + '</span>'];
    })) + '<p class="ps-mut ps-small ps-mt">Quarterly tasks belong to a quarter; annual ones to the year, which reuses the quarters. The legal bases are a starting point to confirm with the legal team.</p></div></div>';
  };
  B.regras = function () {
    var q = U.regraBusca.toLowerCase(), l = S.cat.filter(function (c) { return !q || (c.nome + ' ' + c.id).toLowerCase().indexOf(q) > -1; });
    return '<div class="ps-card">' + cabCartao('Validation rules: threshold by indicator', 'tarefa') + '<div class="ps-card-body">' + campo('reg-busca', 'Search', '<input id="reg-busca" class="ps-in" value="' + e(U.regraBusca) + '" data-c="regraBusca">') + '<div class="ps-mt">' + tabela([{ t: 'Indicator' }, { t: 'Threshold (%)' }, { t: 'Consistency rules' }], l.map(function (c) {
      return [e(c.id + ' ' + c.nome), '<input id="lim-' + e(c.id) + '" class="ps-in ps-num" type="number" min="0" aria-label="Threshold of ' + e(c.nome) + '" value="' + P.limiarDe(c) + '" data-c="limiar" data-id="' + e(c.id) + '">', c.regras_coerencia.length ? '<span class="ps-small">' + e(c.regras_coerencia.join(' ')) + '</span>' : '-'];
    }), 'No indicators found.') + '</div></div></div>';
  };
  var ROT_COR = { primary: 'Primary', secondary: 'Secondary', accent: 'Accent', bg: 'Background', text: 'Text' };
  B.marca = function () {
    if (!U.marca) U.marca = JSON.parse(JSON.stringify(S.marca));
    var m = U.marca, cores = m.cores, avisos = [];
    if (P.contraste(cores.primary, '#FFFFFF') < 4.5) avisos.push('The primary colour has low contrast with white text on buttons and the hero.');
    if (P.contraste(cores.text, cores.bg) < 4.5) avisos.push('The text colour has low contrast with the background.');
    var prev = m.logotipo ? '<img src="' + e(m.logotipo) + '" alt="Logo preview" data-logo-prev>' : 'No logo: the platform shows the name.';
    return '<div class="ps-card">' + cabCartao('Logo', 'doc') + '<div class="ps-card-body"><div class="ps-form">' + campo('mc-logo', 'Web link to the logo image', '<input id="mc-logo" class="ps-in" type="url" inputmode="url" placeholder="https://example.com/logo.png" value="' + e(m.logotipo) + '" data-c="mcLogo">') + '<div><span class="ps-lab">Preview</span><div class="ps-logo-prev" data-campo="logo-prev">' + prev + '</div></div></div><p class="ps-mut ps-small ps-mt" id="logo-estado" role="status">' + e(U.logoEstado || 'Once saved, this logo appears across the whole platform.') + '</p></div></div>' +
      '<div class="ps-card">' + cabCartao('Name', 'tarefa') + '<div class="ps-card-body"><div class="ps-form">' + campo('mc-nome', 'Platform name', '<input id="mc-nome" class="ps-in" value="' + e(m.nome) + '" data-c="mcNome">') + campo('mc-sub', 'Subtitle', '<input id="mc-sub" class="ps-in" value="' + e(m.subtitulo) + '" data-c="mcSub">') + '</div></div></div>' +
      '<div class="ps-card">' + cabCartao('Colours', 'ativ') + '<div class="ps-card-body"><div class="ps-cores">' + Object.keys(ROT_COR).map(function (k) { return '<div><label class="ps-lab" for="cor-t-' + k + '">' + ROT_COR[k] + '</label><div class="ps-cor"><input id="cor-' + k + '" type="color" aria-label="Choose colour ' + ROT_COR[k] + '" value="' + e(cores[k]) + '" data-i="mcCor" data-id="' + k + '"><input id="cor-t-' + k + '" class="ps-in" maxlength="7" value="' + e(cores[k]) + '" data-c="mcCorT" data-id="' + k + '"></div></div>'; }).join('') + '</div>' +
      avisos.map(function (a) { return '<div class="ps-aviso warn ps-mt">' + e(a) + '</div>'; }).join('') +
      '<h3 class="ps-grupo-t">Suggested palettes</h3><div class="ps-pal">' + P.PALETAS.map(function (p, i) { return '<button type="button" data-a="mcPaleta" data-v="' + i + '"><span>' + ['primary', 'secondary', 'accent'].map(function (k) { return '<i style="--c:' + p.cores[k] + '"></i>'; }).join('') + '</span>' + e(p.nome) + '</button>'; }).join('') + '</div>' +
      '<h3 class="ps-grupo-t">Preview</h3><div class="ps-pre-marca"><div class="ps-pre-top">' + (m.logotipo ? '<img src="' + e(m.logotipo) + '" alt="" class="ps-logo-mini" data-logo-mini>' : '<span class="ps-marca-mono" aria-hidden="true">' + e(sigla(m.nome)) + '</span>') + '<span class="ps-marca-txt">' + e(m.nome) + '<small>' + e(m.subtitulo) + '</small></span></div><div class="ps-pre-hero ps-fundo-marca"><b>' + e(m.nome) + '</b></div><div class="ps-pre-b"><span class="ps-btn pri">Primary button</span><span class="ps-btn">Secondary</span>' + chip('In collection', 'info') + chip('Approved', 'ok') + '</div></div></div>' +
      '<div class="ps-sticky ps-mt"><button type="button" class="ps-btn pri" data-a="mcGuardar">Save brand</button></div></div>' +
      '<div class="ps-card">' + cabCartao('Brand copy', 'doc') + '<div class="ps-card-body ps-sp"><button type="button" class="ps-btn" data-a="mcExportar">Export</button><button type="button" class="ps-btn" data-a="mcImportar">Import</button><button type="button" class="ps-btn err" data-a="mcRepor">Reset</button></div></div>';
  };
  B.areas = function () {
    return '<div class="ps-card">' + cabCartao('Data consumer areas', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Code' }, { t: 'Area' }, { t: 'What it uses it for' }, { t: 'Indicators', dir: 1 }], S.areas.map(function (a, i) {
      return ['<span class="ps-mono">' + e(a.codigo) + '</span>', '<input id="an-' + i + '" class="ps-in" aria-label="Area" value="' + e(a.nome) + '" data-c="areaNome" data-id="' + i + '">', '<input id="au-' + i + '" class="ps-in" aria-label="What it uses it for" value="' + e(a.uso) + '" data-c="areaUso" data-id="' + i + '">', S.cat.filter(function (c) { return c.utilizado_por.indexOf(a.codigo) > -1; }).length];
    })) + '</div></div>';
  };
  B.entidades = function () {
    return '<div class="ps-card">' + cabCartao('Companies', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Company' }, { t: 'Group perimeter' }, { t: 'Majority perimeter' }, { t: 'Tasks', dir: 1 }, { t: 'Actions' }], S.ent.map(function (x, i) {
      return ['<input id="en-' + i + '" class="ps-in" aria-label="Company name" value="' + e(x.nome) + '" data-c="entNome" data-id="' + i + '">', '<label class="ps-chk"><input id="eg-' + i + '" type="checkbox" data-c="entGrupo" data-id="' + i + '"' + (x.perimetro_grupo ? ' checked' : '') + '> Yes</label>', '<label class="ps-chk"><input id="em-' + i + '" type="checkbox" data-c="entMaior" data-id="' + i + '"' + (x.perimetro_maioritario ? ' checked' : '') + '> Yes</label>', S.ms.filter(function (m) { return m.empresa === x.nome; }).length, '<button type="button" class="ps-btn peq err" data-a="entApagar" data-v="' + i + '">Remove</button>'];
    })) + '<h3 class="ps-grupo-t">New company</h3><div class="ps-sp">' + '<input id="ent-novo" class="ps-in ps-cresce" aria-label="New company name" placeholder="Company name">' + '<button type="button" class="ps-btn pri" data-a="entNova">Add company</button></div></div></div>';
  };
  /* Departamentos por empresa: cada departamento existe em todas as empresas ou so em algumas. O filtro mostra os de uma empresa. */
  U.depF = U.depF || { emp: '' };
  var tagsEmpresasDep = function (d, i) {
    var l = d.empresas || [], livres = S.ent.filter(function (x) { return l.indexOf(x.id) < 0; });
    var tags = l.length ? S.ent.filter(function (x) { return l.indexOf(x.id) > -1; }).map(function (x) { return '<span class="us-tag">' + avEmpresa() + e(x.nome) + '<button type="button" class="us-tag-x" data-a="depEmpTirar" data-v="' + i + '|' + e(x.id) + '" aria-label="Remove ' + e(x.nome) + ' from ' + e(d.nome) + '">×</button></span>'; }).join('') : '<span class="dp-todas">All companies</span>';
    return '<div class="us-tags">' + tags + (livres.length && l.length !== S.ent.length ? '<label class="ps-sr" for="dpe-' + i + '">Add a company to ' + e(d.nome) + '</label><select id="dpe-' + i + '" class="ps-sel us-add" data-c="depEmpJuntar" data-id="' + i + '">' + opt('', l.length ? '+ Add' : 'Only some…', '') + livres.map(function (x) { return opt(x.id, x.nome, ''); }).join('') + '</select>' : '') + '</div>';
  };
  B.departamentos = function () {
    var f = U.depF, x = f.emp ? S.ent.filter(function (y) { return y.id === f.emp; })[0] : null;
    var dica = 'How many people, indicators and tasks use this department: people who have it as one of their departments, indicators it reports, and tasks it owns, is tagged on or has a workflow step for. A department in use cannot be removed. Rename it instead: everything that uses it follows the new name.';
    var lista = S.deps.map(function (d, i) { return { d: d, i: i }; }).filter(function (o) { return !x || !o.d.empresas || !o.d.empresas.length || o.d.empresas.indexOf(x.id) > -1; });
    var novo = '<div class="us-novo"><h3>New department</h3><div class="ps-sp"><input id="dep-novo" class="ps-in ps-cresce" aria-label="New department name" placeholder="Department name">' +
      '<label class="ps-sr" for="dep-novo-emp">Companies of the new department</label><select id="dep-novo-emp" class="ps-sel dp-novo-emp">' + opt('', 'In all companies', x ? x.id : '') + S.ent.map(function (y) { return opt(y.id, 'Only in ' + y.nome, x ? x.id : ''); }).join('') + '</select>' +
      '<button type="button" class="ps-btn pri" data-a="depNova">Add department</button></div></div>';
    var filtro = '<div class="ps-filtros ps-mt"><div class="ps-campo"><label class="ps-lab" for="dep-f-emp">Company</label><select id="dep-f-emp" class="ps-sel" data-c="depFEmp">' + opt('', 'All companies', f.emp) + S.ent.map(function (y) { return opt(y.id, y.nome + ' (' + P.depsDaEmpresa(y).length + ')', f.emp); }).join('') + '</select></div>' +
      '<p class="ps-small ps-mut dp-nota">' + (x ? lista.length + ' department(s) in ' + e(x.nome) + ', including those shared by all companies.' : 'A department can exist in every company or only in some. People, indicators and tasks then use the departments of their company.') + '</p></div>';
    return '<div class="ps-card">' + cabCartao('Departments', 'doc') + '<div class="ps-card-body">' + novo + filtro +
      '<div class="ps-mt">' + tabela([{ t: 'Department' }, { t: 'Companies', info: 'The companies where the department exists. "All companies" means it exists in every company of the group.' }, { t: 'Area head by company', info: 'In each company, the person who approves what the department submits, before the sustainability team. A data reviewer becomes it automatically. When the area head submits, this step passes automatically.' }, { t: 'In use', dir: 1, info: dica }, { t: 'Actions' }], lista.map(function (o) {
        var d = o.d, i = o.i, u2 = P.usosDepartamentoDet(d.nome), tot = u2.pessoas + u2.indicadores + u2.milestones, txt = u2.pessoas + ' people, ' + u2.indicadores + ' indicators, ' + u2.milestones + ' tasks';
        var gente = S.users.filter(function (x2) { return x2.perfil !== 'ext' && x2.perfil !== 'auditor' && (P.temUnidade(x2, d.nome) || x2.login === d.chefe); });
        /* Um responsavel por empresa onde o departamento existe */
        var chefeSel = '<div class="dp-chefes">' + (P.empresasDoDep ? P.empresasDoDep(d) : S.ent).map(function (y) {
          var atual = (d.chefes && d.chefes[y.id] !== undefined ? d.chefes[y.id] : d.chefe) || '', gy = gente.filter(function (x2) { return P.userNaEmpresa(x2, y.nome) || x2.login === atual; });
          return '<label class="dp-ch"><small>' + e(y.nome) + '</small><select id="dp-ch-' + i + '-' + e(y.id) + '" class="ps-sel" data-pesq aria-label="Area head of ' + e(d.nome) + ' in ' + e(y.nome) + '" data-c="depChefeEmp" data-id="' + i + '|' + e(y.id) + '">' + opt('', 'No area head', atual) + gy.map(function (x2) { return opt(x2.login, x2.nome, atual); }).join('') + '</select></label>';
        }).join('') + '</div>';
        return ['<input id="dp-' + i + '" class="ps-in" aria-label="Department name" value="' + e(d.nome) + '" data-c="depNome" data-id="' + i + '">', tagsEmpresasDep(d, i), chefeSel, tot ? '<span class="dp-uso" tabindex="0" data-tip="' + e(txt) + '">' + tot + '</span>' : '<span class="ps-mut">0</span>',
          tot ? '<button type="button" class="ps-btn peq" disabled title="In use: ' + e(txt) + '">Remove</button>' : '<button type="button" class="ps-btn peq err" data-a="depApagar" data-v="' + i + '">Remove</button>'];
      }), 'No department in this company yet.') + '</div><p class="ps-mut ps-small ps-mt">Departments are the tags on tasks and people, and the groups that report indicators. Renaming one updates them all.</p></div></div>';
  };
  /* Connections to other systems: estado das ligacoes, nova ligacao e o contrato da API (vinha do Data entry) */
  B.ligacoes = function () { return P.ligacoesHtml ? P.ligacoesHtml() : vazio('The connections did not load.'); };
  B.dados = function () {
    return '<div class="ps-card">' + cabCartao('Data and storage', 'doc') + '<div class="ps-card-body"><div class="ps-sp"><button type="button" class="ps-btn" data-a="dadosExportar">Export all data</button>' + (P.online() ? '' : '<button type="button" class="ps-btn" data-a="dadosImportar">Import data</button><button type="button" class="ps-btn err" data-a="dadosRepor">Reset data</button>') + '</div></div></div>';
  };

  /* --- Paineis laterais -------------------------------------------------- */
  var abrePainel = function (tipo, args) { U.painel = { tipo: tipo, args: args || {} }; U.painelFoco = true; R(); };
  var fechaPainel = function () { if (U.painel && U.painel.tipo === 'marca' && U.marca) { U.marca = null; U.logoEstado = ''; P.aplicarMarca(); } U.painel = null; R(); };
  var Pn = {};
  Pn.indTirar = function (a) {
    var m = P.ms(a.ms), c = P.cat(a.id), it = m ? P.item(a.id, P.chave(m)) : null;
    if (!m || !c) return { t: 'Remove indicator', b: '<div class="ps-aviso">It is no longer in the task.</div>', p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Close</button>' };
    var tem = it && it.valor !== null, fic = it ? it.evidencias.length : 0, so = m.indicadores.length === 1;
    return { t: 'Remove ' + a.id + ' from the task?', s: m.nome, cls: 'conf',
      b: '<div class="ps-conf"><div><p><b>' + e(c.nome) + '</b> leaves <b>' + e(m.nome) + '</b> (' + e(m.empresa) + ', ' + e(P.rotPeriodo(m)) + ').' + (so ? ' It is the only indicator, so the task is deleted.' : '') + '</p>' +
        (tem || fic ? '<div class="ps-aviso warn">It already has ' + (tem ? 'a value' : '') + (tem && fic ? ' and ' : '') + (fic ? fic + ' file(s)' : '') + ' in this task. They are deleted with it.</div>' : '') +
        '<p class="ps-small ps-mut">You can send it again from Indicators. It stays in the audit trail.</p></div></div>',
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn err" data-a="boIndTirarSim" data-v="' + e(m.id + '|' + a.id) + '">' + (so ? 'Remove and delete the task' : 'Remove the indicator') + '</button>' };
  };
  Pn.deps = function () { return { t: 'Departments', s: 'The departments of each company and their area head', largo: true, cls: 'alto', b: B.departamentos(), p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Close</button>' }; };
  Pn.msApagar = function (a) {
    var m = P.ms(a.id);
    if (!m) return { t: 'Delete task', b: '<div class="ps-aviso">This task no longer exists.</div>', p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Close</button>' };
    var com = m.indicadores.filter(function (id) { var it = P.item(id, P.chave(m)); return it && it.valor !== null; }).length, fic = m.indicadores.reduce(function (n, id) { var it = P.item(id, P.chave(m)); return n + (it ? it.evidencias.length : 0); }, 0) + (m.documentos_gerais || []).length;
    return { t: 'Delete this task?', s: m.nome, cls: 'conf',
      b: '<div class="ps-conf"><div><p><b>' + e(m.nome) + '</b> (' + e(m.empresa) + ', ' + e(P.rotPeriodo(m)) + ') will be removed for everyone, with its ' + m.indicadores.length + ' indicator(s).</p>' +
        (com || fic ? '<div class="ps-aviso warn">It already has ' + (com ? com + ' value(s)' : '') + (com && fic ? ' and ' : '') + (fic ? fic + ' file(s)' : '') + '. They are deleted with the task.</div>' : '') +
        '<p class="ps-small ps-mut">The indicators can be sent again from Indicators. The deletion stays in the audit trail, with who deleted it and when.</p></div></div>',
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn err" data-a="boMsApagarSim" data-v="' + e(m.id) + '">Delete the task</button>' };
  };
  Pn.matriz = function () { var m = msAtual(); return { t: 'Traceability matrix', s: m.nome + ': each indicator with its value, ESRS and GRI references, who submitted and approved it, and the evidence', largo: true, b: matrizHtml(m), p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Close</button>' }; };
  Pn.devInd = function (a) {
    var c = P.cat(a.id), m = msAtual(), it = P.item(a.id, P.chave(m));
    return { t: 'Return ' + c.nome, s: 'It goes back to ' + (P.atribuido(m) ? P.atribuido(m).nome : 'the unit') + ' to change, the rest of the task is not affected',
      b: '<p class="ps-small">Value submitted: <b>' + (it.valor === null ? '-' : e(fmtV(a.id, it.valor) + ' ' + c.unidade_medida)) + '</b>, by ' + e(it.submetido ? it.submetido.por : '-') + '.</p>' + campo('dev-ind-com', 'What needs to change (required)', '<textarea id="dev-ind-com" class="ps-ta" rows="4"></textarea>'),
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn err" data-a="revDevConfirmar" data-v="' + e(a.id) + '">Return the indicator</button>' };
  };
  Pn.entrega = function (a) { return pnEntrega(a); };
  Pn.matInd = function (a) { return pnMatInd(a); };
  Pn.tipo = pnTipo; Pn.lancar = pnLancar;
  /* Mudar a quem esta atribuida: fica no historico da milestone */
  Pn.atribuir = function () {
    var m = msAtual(), atual = m.atribuido_a || '', sel = U.atrSel === undefined ? atual : U.atrSel;
    var resp = P.atribuiveis(m), q = norm(U.atrBusca || '');
    var sug = [{ v: '', ico: avEquipa(), t: m.unidade, s: 'Whole department' }].concat(resp.map(function (x) { return { v: x.login, ico: avPessoa(x.nome), t: x.nome, s: 'Data owner, ' + x.unidade }; }));
    var todos = S.users.filter(function (x) { return x.perfil !== 'ext' && x.perfil !== 'auditor' && resp.indexOf(x) < 0; });
    var achados = todos.filter(function (x) { return !q || norm(x.nome + ' ' + P.unidadesTxt(x) + ' ' + x.login).indexOf(q) > -1; });
    /* Se a pessoa escolhida nao aparece com a pesquisa, continua a vista no topo */
    var escolhido = todos.filter(function (x) { return x.login === sel; })[0];
    if (escolhido && achados.indexOf(escolhido) < 0) achados.unshift(escolhido);
    var op = function (o, i) { return '<label class="ps-atr-op' + (sel === o.v ? ' on' : '') + '"><input type="radio" id="atr-' + i + '" name="atr-sel" data-c="atrMsSel" value="' + e(o.v) + '"' + (sel === o.v ? ' checked' : '') + '>' + o.ico + '<span>' + e(o.t) + '<small>' + e(o.s) + '</small></span>' + (o.v === atual ? '<em>Current</em>' : '') + '</label>'; };
    return { t: 'Assigned to', s: m.nome + ': ' + P.passoAtual(m).nome, cls: 'alto',
      b: '<p class="ps-small ps-mut">Who fills in this task. Anyone in ' + e(m.unidade) + ' can still act on it, and so can the person it is assigned to, even from another department. The change is recorded in the history of the task.</p>' +
        '<h4 class="ps-atr-t">Team and data owner</h4><div class="ps-atr-esc ps-atr-col" role="radiogroup" aria-label="Team and data owner">' + sug.map(op).join('') + '</div>' +
        '<h4 class="ps-atr-t">Anyone else in the company</h4>' + campo('atr-busca', 'Search by name or department', '<input id="atr-busca" type="search" class="ps-in" autocomplete="off" value="' + e(U.atrBusca || '') + '" data-c="atrBusca" data-i="atrBuscaLive">') +
        '<div class="ps-atr-esc ps-atr-col ps-mt" role="radiogroup" aria-label="Anyone else in the company">' + (achados.length ? achados.map(function (x, i) { return op({ v: x.login, ico: avPessoa(x.nome), t: x.nome, s: x.unidade || P.PERFIS[x.perfil] }, 'o' + i); }).join('') : '<p class="ps-small ps-mut">No one matches.</p>') + '</div>',
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="msAtrGuardar"' + (sel === atual ? ' disabled' : '') + '>Save</button>' };
  };
  /* Marca: abre-se no menu do avatar do administrador. Fechar sem gravar desfaz a pre-visualizacao. */
  Pn.marca = function () { return { t: 'Brand', s: 'Logo, name and colours of the platform', largo: true, b: B.marca().replace(/<div class="ps-sticky ps-mt">[\s\S]*?<\/div>/, ''), p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="mcGuardar">Save brand</button>' }; };
  Pn.ficha = function (a) {
    var id = a.id, c = P.cat(id), m = P.msDoIndicador(id), it = P.item(id), usr = u();
    if (!m || !it) return { t: c.nome, b: vazio('This indicator has no task in this cycle.') };
    var v = P.validarItem(it), ant = P.valorAnterior(id, P.chave(m)), est = P.estadoIndicador(m, id);
    var refs = (S.mat.filter(function (x) { return x.norma === c.esrs; })[0] || {}).avaliacao;
    var b = '<div class="ps-sp">' + chip(est.txt, est.cls) + marcaAmostra(id) + (it.reexpresso ? chip('Restated', 'warn') : '') + '</div><div class="ps-kpis"><div class="ps-kpi"><span>' + (m.ano - 1) + '</span><b>' + (ant === null || ant === undefined ? '-' : e(fmtV(id, ant))) + '</b></div><div class="ps-kpi"><span>' + m.ano + '</span><b>' + (it.valor === null ? '-' : e(fmtV(id, it.valor))) + '</b></div><div class="ps-kpi"><span>Change</span><b>' + (v.variacao === null ? '-' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1) + '%') + '</b></div></div>' +
      (v.alertas.length ? '<div class="ps-aviso warn">' + v.alertas.map(e).join('<br>') + '</div>' : '') + (it.justificacao ? '<div><span class="ps-lab">Justification</span>' + e(it.justificacao) + '</div>' : '') +
      '<p class="ps-ficha-desc">' + e(P.esrsDe(id).desc) + '</p>' +
      '<dl class="ps-det"><dt>Year and unit</dt><dd>' + m.ano + ', ' + e(c.unidade_medida) + '</dd><dt>Task</dt><dd>' + e(m.nome) + '</dd><dt>Type</dt><dd>' + (c.tipo === 'derivado' ? 'Derived' : 'Base data') + '</dd>' + (c.formula ? '<dt>Formula</dt><dd>' + e(c.formula) + '</dd>' : '') + '<dt>Threshold</dt><dd>' + P.limiarDe(c) + '%</dd><dt>Users</dt><dd>' + e(c.utilizado_por.join(', ')) + '</dd><dt>Quality</dt><dd>' + e(P.QUALIDADE_TXT[it.qualidade]) + (it.metodo ? ', ' + e(it.metodo) : '') + '</dd><dt>Evidence</dt><dd>' + (it.evidencias.map(function (x) { return e(x.ficheiro); }).join(', ') || '-') + '</dd><dt>ESRS datapoint</dt><dd>' + (P.esrsDe(id).dps.length ? '<span class="ps-mono">' + e(P.esrsDe(id).dps.join(', ')) + '</span>' : 'Entity-specific') + '</dd><dt>Frameworks</dt><dd>ESRS ' + e(c.esrs_requisito) + (refs ? ' (' + e(MAT_TXT[refs] || refs) + ')' : '') + ', GRI ' + e(c.gri) + '</dd></dl>' +
      '<div><h3 class="ps-grupo-t">Value history</h3>' + (it.versoes.length ? '<ul class="ps-ev ps-sem-pad">' + it.versoes.slice().reverse().map(function (x) { return '<li><b class="ps-num">' + e(fmtV(id, x.valor)) + '</b>, ' + e(x.origem) + (x.motivo ? '. Reason: ' + e(x.motivo) : '') + '<small>' + quemHtml(x.por) + '<span class="ps-q-sep">, </span>' + e(P.fmtDataHora(x.em)) + '</small></li>'; }).join('') + '</ul>' : '<p class="ps-mut ps-small">No values yet.</p>') + '</div>';
    if (P.concluida(m) && P.podeReexpressar(usr)) b += '<div class="ps-card ps-card-body"><h3 class="ps-grupo-t ps-sem-topo">Restate approved value</h3><div class="ps-form">' + campo('rx-val', 'New value', '<input id="rx-val" class="ps-in"' + numAttr(id) + '>') + campo('rx-mot', 'Reason (required)', '<input id="rx-mot" class="ps-in">') + '</div><button type="button" class="ps-btn pri ps-mt" data-a="reexpressar" data-v="' + e(id) + '">Restate value</button></div>';
    if (usr.perfil === 'auditor' || usr.perfil === 'admin') b += '<div class="ps-card ps-card-body"><h3 class="ps-grupo-t ps-sem-topo">Auditor information request</h3>' + campo('pa-txt', 'What you need to know', '<textarea id="pa-txt" class="ps-ta"></textarea>') + '<button type="button" class="ps-btn ps-mt" data-a="pedidoAud" data-v="' + e(id) + '">Send request</button></div>';
    return { t: c.nome, s: c.id, b: b, p: '<a class="ps-btn" href="' + rota('Milestone/' + m.id) + '" data-a="fecharPainel" data-nao-impedir="1">Open the task</a>' };
  };
  Pn.tecnica = function (a) {
    var m = msAtual(), sec = a.sec || 'schema', b = '<div class="ps-seg" role="group" aria-label="Tabs">' + [['schema', 'File schema'], ['json', 'JSON Schema'], ['tpl', 'Templates'], ['api', 'API and integrations']].map(function (s) { return '<button type="button" class="' + (sec === s[0] ? 'on' : '') + '" data-a="tecSec" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>';
    if (sec === 'schema') {
      var D = [['milestone_id', 'string', 'Yes', 'Must be ' + m.id + '.'], ['indicator_id', 'string', 'Yes', 'Only this task\'s indicators: ' + m.indicadores.join(', ') + '.'], ['indicator_name', 'string', 'No', 'For human reading only. It is ignored.'], ['entity', 'string', 'No', 'Defaults to Consolidado.'], ['period', 'string', 'Yes', 'Must be ' + m.ano + '.'], ['value', 'number', 'Yes', 'Accepts a decimal comma or point.'], ['unit', 'string', 'Yes', 'Same as the indicator unit.'], ['justification', 'string', 'No', 'Required when there are alerts.'], ['source_system', 'string', 'No', 'Source system of the data.'], ['evidence_ref', 'string', 'No', 'Required for indicators with required evidence.'], ['data_quality', 'string', 'No', 'measured, calculated or estimated.'], ['estimation_method', 'string', 'No', 'Required when data_quality is estimated.']];
      b += tabela([{ t: 'Field' }, { t: 'Type' }, { t: 'Required' }, { t: 'Rule' }], D.map(function (x) { return ['<span class="ps-mono">' + x[0] + '</span>', x[1], x[2], e(x[3])]; }));
    } else if (sec === 'json') {
      b += '<div class="ps-sp"><button type="button" class="ps-btn peq" data-a="schemaCopiar">Copy</button><button type="button" class="ps-btn peq" data-a="schemaDesc">Download</button></div><pre class="ps-pre" tabindex="0">' + e(JSON.stringify(P.jsonSchema(m), null, 2)) + '</pre>';
    } else if (sec === 'tpl') {
      b += '<p>Templates for this task, with the indicators and year already in place.</p><div class="ps-sp"><button type="button" class="ps-btn pri" data-a="tplExcel">Excel template</button></div>';
    } else {
      var ex = { milestone_id: m.id, submitted_by: 'svc-integration@example.com', source_system: 'financial-system', records: [{ indicator_id: m.indicadores[0], entity: 'Consolidado', period: String(m.ano), value: 10, unit: P.cat(m.indicadores[0]).unidade_medida, data_quality: 'measured' }] };
      b += '<div class="ps-aviso warn">Planned integration contract.</div><dl class="ps-det"><dt>Get the schema</dt><dd class="ps-mono">GET /api/v1/milestones/' + e(m.id) + '/schema</dd><dt>Send values</dt><dd class="ps-mono">POST /api/v1/milestones/' + e(m.id) + '/submissions</dd><dt>Webhook</dt><dd class="ps-mono">task.step_completed</dd></dl><pre class="ps-pre" tabindex="0">' + e(JSON.stringify(ex, null, 2)) + '</pre>';
    }
    return { t: 'Technical view', s: m.nome, b: b, largo: true };
  };
  /* Pedir ajuda: qualquer pessoa da empresa pode ser chamada a colaborar num indicador, com uma mensagem para ela */
  var msgAjuda = function (m, id, login) {
    var c = P.cat(id), x = login ? P.user(login) : null;
    return 'Hi' + (x ? ' ' + x.nome.split(' ')[0] : '') + ', could you help me with "' + c.nome + '" (' + c.unidade_medida + ') for ' + m.nome + ', ' + P.rotPeriodo(m) + '? Please add the value in the task and attach any supporting document you have.';
  };
  Pn.pedirAjuda = function () {
    var m = msAtual(), usr = u(), a = U.ajuda, q = norm(a.q || '');
    var todos = S.users.filter(function (x) { return x.perfil !== 'ext' && x.perfil !== 'auditor' && x.login !== usr.login; })
      .sort(function (x, y) { return (P.temUnidade(x, m.unidade) ? 0 : 1) - (P.temUnidade(y, m.unidade) ? 0 : 1) || x.nome.localeCompare(y.nome); });
    var achados = todos.filter(function (x) { return !q || norm(x.nome + ' ' + P.unidadesTxt(x) + ' ' + x.login).indexOf(q) > -1; });
    var escolhido = todos.filter(function (x) { return x.login === a.sel; })[0];
    if (escolhido && achados.indexOf(escolhido) < 0) achados.unshift(escolhido);
    var op = function (x, i) { return '<label class="ps-atr-op' + (a.sel === x.login ? ' on' : '') + '"><input type="radio" id="aj-p' + i + '" name="aj-sel" data-c="ajSel" value="' + e(x.login) + '"' + (a.sel === x.login ? ' checked' : '') + '>' + avPessoa(x.nome) + '<span>' + e(x.nome) + '<small>' + e((x.unidade || P.PERFIS[x.perfil]) + (x.unidade === m.unidade ? ', same department' : '')) + '</small></span></label>'; };
    return { t: 'Request assistance', s: m.nome, cls: 'alto',
      b: '<p class="ps-small ps-mut">Ask anyone in the company to help with an indicator. They get your message, can open this task and add the value, and you decide whether to use it.</p>' +
        campo('aj-ind', 'Indicator', '<select id="aj-ind" class="ps-sel" data-c="ajInd">' + m.indicadores.map(function (id) { return opt(id, P.cat(id).nome, a.ind); }).join('') + '</select>') +
        '<h4 class="ps-atr-t">Who you are asking</h4>' + campo('aj-busca', 'Search by name or department', '<input id="aj-busca" type="search" class="ps-in" autocomplete="off" value="' + e(a.q || '') + '" data-i="ajBuscaLive">') +
        '<div class="ps-atr-esc ps-atr-col ps-mt ps-aj-pess" role="radiogroup" aria-label="Who you are asking">' + (achados.length ? achados.map(op).join('') : '<p class="ps-small ps-mut">No one matches.</p>') + '</div>' +
        '<div class="ps-form ps-mt">' + campo('aj-msg', 'Message' + (escolhido ? ' to ' + escolhido.nome : ''), '<textarea id="aj-msg" class="ps-ta" data-i="ajMsgLive">' + e(a.msg) + '</textarea>') +
        campo('aj-prazo', 'Due date', '<input id="aj-prazo" class="ps-in" type="date" value="' + e(a.prazo) + '" data-c="ajPrazo">') + '</div>',
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="ajEnviar"' + (a.sel ? '' : ' disabled') + '>Send request' + (escolhido ? ' to ' + e(escolhido.nome.split(' ')[0]) : '') + '</button>' };
  };
  Pn.pedirFicheiro = function () {
    var m = msAtual();
    return { t: 'Request a file', s: m.nome,
      b: '<p class="ps-small ps-mut">Ask for a file that is not covered by the system or the screen, for example a signed declaration. It appears under Requested files at the top of the task until it is delivered.</p>' +
        '<div class="ps-form">' + campo('fp-nome', 'Name of the requested file', '<input id="fp-nome" class="ps-in">') + '<label class="ps-chk"><input id="fp-obr" type="checkbox" checked> Required</label></div>',
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="ficPedir">Add to the request</button>' };
  };
  /* --- Importar Excel: assistente em quatro passos ---------------------------
     Le o Excel no browser, deixa escolher a folha e as colunas, liga cada indicador a uma linha e so grava no fim. */
  var WZ_PASSOS = ['Choose the file', 'Pick the columns', 'Match the indicators', 'Review and fill in'];
  var wzNovo = function (m) { return { ms: m.id, passo: 1, nome: '', folhas: [], f: 0, cab: -1, colId: -1, colVal: -1, papel: 'id', mapa: {}, incl: {}, guardar: true, aLer: false, erro: '' }; };
  var wzEsc = function (s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  var wzLetra = function (i) { var s = ''; i++; while (i) { var r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
  var wzNum = function (v) { if (typeof v === 'number') return isFinite(v) ? Math.round(v * 1e10) / 1e10 : null; var s = P.limparColado(v); return s === '' ? null : P.lerNumero(s); };
  var wzCel = function (v) { return v === undefined || v === null ? '' : typeof v === 'number' ? P.fmtNum(v, Math.min(2, (String(v).split('.')[1] || '').length)) : String(v); };
  var wzFolha = function (w) { return w.folhas[w.f] || { nome: '', mat: [] }; };
  var wzNCols = function (w) { return Math.min(20, wzFolha(w).mat.reduce(function (a, l) { return Math.max(a, l.length); }, 0)); };
  var wzLinhas = function (w) { return wzFolha(w).mat.map(function (l, i) { return { i: i, l: l }; }).slice(w.cab + 1).filter(function (x) { return x.l.some(function (c) { return String(c).trim(); }); }); };
  /* Os calculados a partir das fontes nao se importam: o valor vem das fontes */
  var wzIds = function (m) {
    var calcs = P.calculosMilestone ? P.calculosMilestone(m) : [];
    return m.indicadores.filter(function (id) { var it = P.item(id, P.chave(m)), c = calcs.filter(function (r) { return r.id === id; })[0]; return !(c && c.x && c.valor !== null && it.daFonte); });
  };
  /* Reconhece o indicador pelo ID ou pelo nome, mesmo dentro de um texto maior ("A01 - Employees") */
  var wzAchar = function (txt, ids) {
    var k = norm(txt);
    if (!k || k.length > 160) return null;
    var x = ids.filter(function (id) { return norm(id) === k || norm(P.cat(id).nome) === k; })[0];
    if (x) return x;
    x = ids.filter(function (id) { return new RegExp('(^|[^a-z0-9])' + wzEsc(norm(id)) + '([^a-z0-9]|$)').test(k); })[0];
    if (x) return x;
    return ids.filter(function (id) { var n = norm(P.cat(id).nome); return n.length > 5 && (k.indexOf(n) > -1 || (k.length > 8 && n.indexOf(k) > -1)); })[0] || null;
  };
  var wzValor = function (w, id) { var r = w.mapa[id]; if (r === undefined || w.colVal < 0) return undefined; return (wzFolha(w).mat[r] || [])[w.colVal]; };
  var wzCheck = function (w, m, id) {
    var bruto = wzValor(w, id), c = P.cat(id);
    if (w.mapa[id] === undefined) return { ok: false, txt: 'Not in the file', cls: '' };
    if (bruto === undefined || String(bruto).trim() === '') return { ok: false, txt: 'Empty cell', cls: 'warn' };
    var n = wzNum(bruto);
    if (n === null) return { ok: false, txt: 'Not a number', cls: 'err' };
    if (P.inteiro(c) && Math.round(n) !== n) return { ok: false, n: n, txt: 'Must be a whole number', cls: 'err' };
    var v = P.validar(c, n, P.chave(m));
    if (v.erros.length) return { ok: false, n: n, txt: v.erros[0], cls: 'err' };
    return { ok: true, n: n, alerta: v.alertas[0] || '', cls: v.alertas.length ? 'warn' : 'ok', txt: v.alertas.length ? 'Check' : 'Ready' };
  };
  var wzMapear = function (w, m) {
    var ids = wzIds(m);
    w.mapa = {}; w.incl = {};
    if (w.colId < 0) return;
    /* Se a coluna escolhida nao tiver o indicador, procura-o nos outros textos da linha */
    wzLinhas(w).forEach(function (x) {
      var id = wzAchar(x.l[w.colId], ids);
      if (!id) x.l.forEach(function (cel, i) { if (!id && i !== w.colVal && typeof cel === 'string' && wzNum(cel) === null) id = wzAchar(cel, ids); });
      if (id && w.mapa[id] === undefined) w.mapa[id] = x.i;
    });
    ids.forEach(function (id) { w.incl[id] = wzCheck(w, m, id).ok; });
  };
  var wzColunas = function (w, m) {
    var ids = wzIds(m), linhas = wzLinhas(w), nc = wzNCols(w), cab = w.cab > -1 ? wzFolha(w).mat[w.cab] : [], hits = [], nums = [], c;
    for (c = 0; c < nc; c++) {
      hits[c] = linhas.filter(function (x) { return wzAchar(x.l[c], ids); }).length;
      var cheias = linhas.filter(function (x) { return String(x.l[c] === undefined ? '' : x.l[c]).trim(); });
      nums[c] = cheias.length ? cheias.filter(function (x) { return wzNum(x.l[c]) !== null; }).length / cheias.length : 0;
    }
    w.colId = -1;
    hits.forEach(function (h, i) { if (h && (w.colId < 0 || h > hits[w.colId])) w.colId = i; });
    /* O valor: a coluna com o ano do periodo ou "Value" no cabecalho, depois a primeira coluna com numeros a direita */
    /* Nunca as colunas de outros periodos (ano anterior, prior value), variacoes, limiares ou metas */
    var anoCab = function (k) { var y = k.match(/(^|\D)(19|20)\d{2}(?!\d)/g); return y ? y.map(function (t) { return +t.replace(/\D/g, ''); }) : []; };
    var excluida = function (h) {
      var k = norm(h); if (!k) return false;
      if (anoCab(k).some(function (y) { return y !== m.ano; })) return true;
      return /(prior|previous|anterior|last year|ano passado|change|variation|variacao|var %|threshold|limiar|target|meta|baseline|budget|orcamento)/.test(k);
    };
    var rotP = norm(P.rotPeriodo(m));
    var pontos = function (h) { var k = norm(h); if (!k || excluida(h)) return 0; return (rotP && k.indexOf(rotP) > -1 ? 3 : 0) + (k.indexOf(String(m.ano)) > -1 ? 2 : 0) + (/(^|\s)(value|valor)(\s|$)/.test(k) ? 1 : 0); };
    var vazia = function (ci) { return !linhas.some(function (x) { return String(x.l[ci] === undefined ? '' : x.l[ci]).trim(); }); };
    w.colVal = -1;
    var melhor = 0;
    /* Pelo cabecalho, mesmo que a coluna ainda esteja vazia */
    for (c = 0; c < nc; c++) if (c !== w.colId && (nums[c] >= 0.5 || vazia(c)) && pontos(cab[c]) > melhor) { melhor = pontos(cab[c]); w.colVal = c; }
    /* Sem cabecalho que ajude: a primeira coluna com numeros a direita, sem as colunas excluidas */
    for (c = w.colId + 1; c < nc && w.colVal < 0; c++) if (nums[c] >= 0.5 && !excluida(cab[c])) w.colVal = c;
    for (c = 0; c < nc && w.colVal < 0; c++) if (c !== w.colId && nums[c] >= 0.5 && !excluida(cab[c])) w.colVal = c;
    w.papel = w.colId < 0 ? 'id' : 'val';
    wzMapear(w, m);
  };
  var wzDetetar = function (w, m) {
    var mat = wzFolha(w).mat, ids = wzIds(m);
    w.cab = -1;
    for (var r = 0; r < Math.min(10, mat.length); r++) {
      if (mat[r].some(function (c) { return wzAchar(c, ids); })) break;
      /* Cabecalho: textos, e os anos (2025, 2026) tambem contam, mesmo escritos como numero */
      var txt = mat[r].filter(function (c) { return typeof c === 'string' && c.trim() && wzNum(c) === null; }).length;
      var anos = mat[r].filter(function (c) { return /^(19|20)\d{2}$/.test(String(c).trim()); }).length;
      if (txt >= 2 || (txt >= 1 && anos >= 1)) { w.cab = r; break; }
    }
    wzColunas(w, m);
  };
  var wzLer = function (file) {
    var w = U.wiz, m = P.ms(w.ms);
    w.file = file;
    if (['xlsx', 'xls', 'csv'].indexOf(extDe(file.name)) < 0) { w.erro = file.name + ' is not an Excel file. Use .xlsx, .xls or .csv.'; return R(); }
    if (!window.XLSX) { w.erro = 'The Excel library did not load.'; return R(); }
    w.erro = ''; w.aLer = true; R();
    var r = new FileReader();
    r.onerror = function () { w.aLer = false; w.erro = 'The file could not be read.'; R(); };
    r.onload = function () {
      try {
        var wb = window.XLSX.read(new Uint8Array(r.result), { type: 'array' });
        w.folhas = wb.SheetNames.map(function (n) { return { nome: n, mat: window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true, blankrows: true }).slice(0, 500) }; }).filter(function (f) { return f.mat.length; });
        w.aLer = false;
        if (!w.folhas.length) { w.erro = 'The file has no data.'; return R(); }
        w.nome = file.name;
        /* Abre na folha onde se reconhecem mais indicadores */
        var ids = wzIds(m), max = -1;
        w.folhas.forEach(function (f, i) { var n = f.mat.filter(function (l) { return l.some(function (c) { return wzAchar(c, ids); }); }).length; if (n > max) { max = n; w.f = i; } });
        wzDetetar(w, m);
        w.passo = 2;
        R();
      } catch (x) { w.aLer = false; w.erro = 'The file could not be read: ' + x.message; R(); }
    };
    r.readAsArrayBuffer(file);
  };
  var wzAbrir = function (m, file) { U.wiz = wzNovo(m); abrePainel('importar'); if (file) wzLer(file); };
  Pn.importar = function () {
    var w = U.wiz, m = P.ms(w.ms), ids = wzIds(m), b = '', p = '';
    var passos = '<ol class="wz-passos">' + WZ_PASSOS.map(function (t, i) {
      var n = i + 1;
      return '<li class="' + (n < w.passo ? 'feito' : n === w.passo ? 'on' : '') + '"' + (n === w.passo ? ' aria-current="step"' : '') + '><span class="wz-n">' + (n < w.passo ? svg(I.tick, 13) : n) + '</span><span class="wz-pt">' + t + '</span></li>';
    }).join('') + '</ol>';
    var voltar = '<button type="button" class="ps-btn" data-a="wzPasso" data-v="' + (w.passo - 1) + '">Back</button><span class="ps-sp-flex"></span>';
    if (w.passo === 1) {
      b = '<div class="wz-drop' + (w.aLer ? ' aler' : '') + '" data-dzx="' + e(m.id) + '"><span class="wz-drop-ic" aria-hidden="true">' + svg(I.tabela, 30) + '</span>' +
        '<b>' + (w.aLer ? 'Reading the file...' : 'Drop your Excel file here') + '</b><span class="ps-small ps-mut">or</span><button type="button" class="ps-btn pri" data-a="wzEscolher">' + svg(I.upload, 14) + 'Choose a file</button>' +
        '<small>XLSX, XLS or CSV. Any layout with one row per indicator works.</small></div>' + (w.erro ? '<div class="ps-aviso err" role="alert">' + e(w.erro) + '</div>' : '') +
        '<ol class="wz-como">' + [[I.tabela, 'Pick the columns', 'Show where the indicators and the values are.'], [I.seta, 'Match the indicators', 'They are matched for you. Fix any that are wrong.'], [I.tick, 'Review and fill in', 'Nothing is saved until you confirm.']].map(function (x) {
          return '<li><span aria-hidden="true">' + svg(x[0], 18) + '</span><b>' + x[1] + '</b><small>' + x[2] + '</small></li>';
        }).join('') + '</ol>' +
        '<p class="ps-small ps-mut wz-tpl">No file yet? <button type="button" class="ps-btn liga" data-a="tplExcel">Download a template with these indicators</button></p>';
      p = '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button>';
    } else if (w.passo === 2) {
      var f = wzFolha(w), mat = f.mat, nc = wzNCols(w), cols = [], achadas = Object.keys(w.mapa).length, porLinha = {};
      for (var c = 0; c < nc; c++) cols.push(c);
      Object.keys(w.mapa).forEach(function (id) { porLinha[w.mapa[id]] = id; });
      var nomeCol = function (i) { var h = w.cab > -1 ? String(mat[w.cab][i] === undefined ? '' : mat[w.cab][i]).trim() : ''; return 'Column ' + wzLetra(i) + (h ? ', ' + h : ''); };
      var clsCol = function (i) { return i === w.colId ? 'wz-cid' : i === w.colVal ? 'wz-cval' : ''; };
      var papelTxt = w.papel === 'id' ? 'indicator' : 'value';
      var folhas = w.folhas.length > 1 ? '<div class="wz-folhas"><span class="ps-lab">Sheet</span><div class="ps-seg" role="group" aria-label="Sheet">' + w.folhas.map(function (x, i) { return '<button type="button" class="' + (i === w.f ? 'on' : '') + '" data-a="wzFolha" data-v="' + i + '">' + e(x.nome) + '</button>'; }).join('') + '</div></div>' : '';
      var papeis = '<div class="wz-papeis">' + [['id', 1, 'Column with the indicators', 'Names or IDs, for example ' + P.cat(m.indicadores[0]).nome, w.colId], ['val', 2, 'Column with the values', 'The ' + P.rotPeriodo(m) + ' figures', w.colVal]].map(function (x) {
        return '<button type="button" class="wz-papel wz-p-' + x[0] + (w.papel === x[0] ? ' on' : '') + (x[4] > -1 ? ' feito' : '') + '" data-a="wzPapel" data-v="' + x[0] + '" aria-pressed="' + (w.papel === x[0]) + '"><span class="wz-n">' + (x[4] > -1 ? svg(I.tick, 13) : x[1]) + '</span><span class="wz-pt"><b>' + x[2] + '</b><small>' + e(x[4] > -1 ? nomeCol(x[4]) : x[3]) + '</small></span></button>';
      }).join('') + '</div>';
      var th = '<tr><th class="wz-rn" scope="col"><span class="ps-sr">Row</span></th>' + cols.map(function (i) {
        return '<th scope="col" class="' + clsCol(i) + '"><button type="button" class="wz-colb" data-a="wzCol" data-v="' + i + '" aria-label="Use column ' + wzLetra(i) + ' as the ' + papelTxt + ' column">' + wzLetra(i) + (i === w.colId ? '<em>Indicators</em>' : i === w.colVal ? '<em>Values</em>' : '') + '</button></th>';
      }).join('') + '</tr>';
      var corpo = mat.slice(0, 15).map(function (l, r) {
        var ok = porLinha[r] !== undefined;
        return '<tr class="' + (r === w.cab ? 'wz-hd' : ok ? 'wz-ok' : '') + '"><th scope="row" class="wz-rn">' + (ok ? svg(I.tick, 11) : '') + (r + 1) + '</th>' + cols.map(function (i) {
          return '<td class="' + clsCol(i) + (typeof l[i] === 'number' ? ' ps-num' : '') + '" data-a="wzCol" data-v="' + i + '">' + e(wzCel(l[i])) + '</td>';
        }).join('') + '</tr>';
      }).join('');
      b = folhas + papeis +
        '<div class="wz-prev-cab"><p class="wz-dica">' + svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01"/>', 15) + '<span>Click any column to use it as the <b>' + papelTxt + '</b> column.</span></p>' +
        '<label class="wz-cab" for="wz-cab">Headings in <select id="wz-cab" class="ps-sel" data-c="wzCab">' + opt('-1', 'No headings', String(w.cab)) + mat.slice(0, 10).map(function (l, i) { return opt(String(i), 'Row ' + (i + 1), String(w.cab)); }).join('') + '</select></label></div>' +
        '<div class="wz-prev" tabindex="0" role="region" aria-label="Preview of the sheet ' + e(f.nome) + '"><table class="wz-t"><thead>' + th + '</thead><tbody>' + corpo + '</tbody></table></div>' +
        '<p class="wz-res ' + (achadas ? 'ok' : 'warn') + '">' + svg(achadas ? I.tick : '<circle cx="12" cy="12" r="9.5"/><path d="M12 8v5M12 16.5v.01"/>', 15) + (w.colId < 0 ? 'Choose the column with the indicators.' : achadas + ' of ' + ids.length + ' indicators recognised in this sheet' + (w.colVal < 0 ? '. Now choose the column with the values.' : '.')) + (mat.length > 15 ? ' <span class="ps-mut">Preview of the first 15 of ' + mat.length + ' rows.</span>' : '') + '</p>';
      p = voltar + '<button type="button" class="ps-btn pri" data-a="wzPasso" data-v="3"' + (w.colId > -1 && w.colVal > -1 ? '' : ' disabled') + '>Next: match the indicators</button>';
    } else if (w.passo === 3) {
      var linhas = wzLinhas(w), feitas = ids.filter(function (id) { return w.mapa[id] !== undefined; }).length, sel = ids.filter(function (id) { return w.incl[id]; }).length;
      var opcoes = function (id) {
        return '<option value="-1">Not in the file</option>' + linhas.map(function (x) {
          var t = String(x.l[w.colId] === undefined ? '' : x.l[w.colId]).trim() || String(x.l.filter(function (cel, i) { return i !== w.colVal && typeof cel === 'string' && cel.trim(); })[0] || '(empty)').trim(), v = x.l[w.colVal];
          return '<option value="' + x.i + '"' + (w.mapa[id] === x.i ? ' selected' : '') + '>Row ' + (x.i + 1) + ': ' + e(t.slice(0, 48)) + (String(v === undefined ? '' : v).trim() !== '' ? ' (' + e(wzCel(v)) + ')' : '') + '</option>';
        }).join('');
      };
      var lista = ids.map(function (id) {
        var c = P.cat(id), ch = wzCheck(w, m, id);
        return '<div class="wz-m' + (w.incl[id] ? ' on' : '') + (w.mapa[id] === undefined ? ' fora' : '') + '"><input type="checkbox" class="wz-chk" id="wzi-' + e(id) + '" data-c="wzIncl" data-id="' + e(id) + '"' + (w.incl[id] ? ' checked' : '') + (ch.ok ? '' : ' disabled') + '>' +
          '<label class="wz-mi" for="wzi-' + e(id) + '"><b>' + e(c.nome) + '</b><small>' + e(id) + ', ' + e(c.unidade_medida) + (P.inteiro(c) ? ', whole number' : '') + '</small></label>' +
          '<span class="wz-seta" aria-hidden="true">' + svg(I.seta, 16) + '</span>' +
          '<select class="ps-sel wz-sel" data-c="wzLinha" data-id="' + e(id) + '" aria-label="Row of the file for ' + e(c.nome) + '">' + opcoes(id) + '</select>' +
          '<div class="wz-mv"><b class="ps-num">' + (ch.ok ? e(fmtV(id, ch.n)) : w.mapa[id] !== undefined && String(wzValor(w, id) === undefined ? '' : wzValor(w, id)).trim() !== '' ? e(wzCel(wzValor(w, id))) : '-') + '</b><span class="wz-st ' + ch.cls + '"' + (ch.alerta ? ' data-tip="' + e(ch.alerta) + '" tabindex="0"' : '') + '>' + e(ch.txt) + '</span></div></div>';
      }).join('');
      var fora = m.indicadores.length - ids.length;
      b = '<div class="wz-prog"><div class="ps-sp-b"><span><b>' + feitas + ' of ' + ids.length + '</b> indicators matched to ' + e(w.nome) + '</span><span class="ps-sp"><button type="button" class="ps-btn liga" data-a="wzTodos">Select all ready</button><button type="button" class="ps-btn liga" data-a="wzNenhum">Clear</button></span></div>' +
        '<progress class="wz-pr" max="' + ids.length + '" value="' + feitas + '" aria-label="Indicators matched"></progress></div>' +
        '<div class="wz-ml">' + lista + '</div>' + (fora ? '<p class="ps-small ps-mut">' + fora + ' indicator' + (fora === 1 ? ' is' : 's are') + ' calculated from the source data and ' + (fora === 1 ? 'is' : 'are') + ' not imported.</p>' : '');
      p = voltar + '<button type="button" class="ps-btn pri" data-a="wzPasso" data-v="4"' + (sel ? '' : ' disabled') + '>Next: review ' + sel + ' value' + (sel === 1 ? '' : 's') + '</button>';
    } else {
      var esc = ids.filter(function (id) { return w.incl[id] && wzCheck(w, m, id).ok; }), novos = 0, subst = 0, iguais = 0, alertas = 0;
      var tab = tabela([{ t: 'Indicator' }, { t: 'Now', dir: 1 }, { t: 'From the file', dir: 1 }, { t: '' }], esc.map(function (id) {
        var c = P.cat(id), it = P.item(id, P.chave(m)), ch = wzCheck(w, m, id), atual = it.valor;
        if (atual === null) novos++; else if (atual === ch.n) iguais++; else subst++;
        if (ch.alerta) alertas++;
        return [e(c.nome) + '<br><small class="ps-mut">' + e(id) + ', ' + e(c.unidade_medida) + '</small>', atual === null ? '<span class="ps-mut">Empty</span>' : '<span class="ps-num' + (atual !== ch.n ? ' wz-velho' : '') + '">' + e(fmtV(id, atual)) + '</span>',
          '<b class="ps-num">' + e(fmtV(id, ch.n)) + '</b>', atual === null ? chip('New', 'ok') : atual === ch.n ? chip('Same') : chip('Replaces', 'warn')];
      }));
      b = '<div class="wz-kpis"><div class="wz-k ok"><b>' + novos + '</b><span>New values</span></div><div class="wz-k warn"><b>' + subst + '</b><span>Values replaced</span></div><div class="wz-k"><b>' + iguais + '</b><span>Unchanged</span></div></div>' +
        (alertas ? '<div class="ps-aviso warn">' + alertas + ' value' + (alertas === 1 ? ' differs' : 's differ') + ' a lot from last year. After importing, add a justification on screen.</div>' : '') + tab +
        '<label class="ps-chk wz-guardar"><input type="checkbox" data-c="wzGuardar"' + (w.guardar ? ' checked' : '') + '> Keep ' + e(w.nome) + ' as a supporting document of this task</label>';
      p = voltar + '<button type="button" class="ps-btn pri" data-a="wzAplicar"' + (esc.length ? '' : ' disabled') + '>' + svg(I.tick, 14) + 'Fill in ' + esc.length + ' value' + (esc.length === 1 ? '' : 's') + '</button>';
    }
    return { t: 'Import from Excel', s: m.nome + ', ' + P.rotPeriodo(m), largo: true, cls: 'alto wz', b: passos + '<div class="wz-corpo">' + b + '</div>', p: p };
  };
  Pn.novoPedAud = function () {
    var apr = S.cat;
    return { t: 'New information request', b: campo('na-ind', 'Indicator', '<select id="na-ind" class="ps-sel">' + apr.map(function (c) { return opt(c.id, c.nome); }).join('') + '</select>') + campo('na-txt', 'What you need to know', '<textarea id="na-txt" class="ps-ta"></textarea>'), p: '<button type="button" class="ps-btn pri" data-a="naCriar">Send request</button>' };
  };
  var respOpts = function (sel) {
    return [opt('unidade', 'Task unit', sel), opt('chefe', 'Area head of the task unit', sel), opt('esg', 'Sustainability team', sel), opt('admin', 'Administrator', sel)].concat(P.UNIDADES.map(function (x) { return opt('area:' + x, x, sel); })).join('');
  };
  Pn.wf = function (a) {
    var base = a.base, m = base ? null : msAtual(), d = U.wfDraft, atual = m ? m.passo_atual : -1;
    var linhas = d.map(function (p, i) {
      var feito = i < atual, ehAtual = i === atual, auto = p.responsavel === 'sistema', fixo = i === 0 || feito || ehAtual;
      var nome = feito ? '<b>' + e(p.nome) + '</b>' : '<input id="wfn-' + i + '" class="ps-in" aria-label="Name of step ' + (i + 1) + '" value="' + e(p.nome) + '" data-c="wfNome" data-id="' + i + '">';
      var tipo = fixo || auto ? '<span class="ps-small ps-mut">' + e(P.TIPOS_PASSO[p.tipo]) + '</span>' : '<select id="wft-' + i + '" class="ps-sel" aria-label="Type of step ' + (i + 1) + '" data-c="wfTipo" data-id="' + i + '">' + ['area', 'revisao', 'parecer', 'aprovacao'].map(function (t) { return opt(t, P.TIPOS_PASSO[t], p.tipo); }).join('') + '</select>';
      var resp = feito ? '<span class="ps-small ps-mut">' + e(P.nomeResp(m, p.responsavel)) + '</span>' : auto ? '<span class="ps-small ps-mut">Automatic</span>' : '<select id="wfr-' + i + '" class="ps-sel" aria-label="Owner of step ' + (i + 1) + '" data-c="wfResp" data-id="' + i + '">' + respOpts(p.responsavel) + '</select>';
      var mov = !fixo && p.tipo !== 'publicacao';
      var ultimaMov = i + 1 < d.length && d[i + 1].tipo !== 'publicacao';
      var primeiraMov = i - 1 > Math.max(atual, 0);
      return '<div class="ps-wfe ' + (feito ? 'bloq' : '') + '"><span class="ps-wfe-n">' + (feito ? svg(I.tick, 14) : i + 1) + '</span><div class="ps-wfe-c">' + nome + tipo + resp + '</div><div class="ps-wfe-a">' + (mov ? '<button type="button" id="wfc-' + i + '" data-a="wfMover" data-v="' + i + '" data-d="-1" aria-label="Move up"' + (primeiraMov ? '' : ' disabled') + '>' + svg(I.cima, 14) + '</button><button type="button" id="wfb-' + i + '" data-a="wfMover" data-v="' + i + '" data-d="1" aria-label="Move down"' + (ultimaMov ? '' : ' disabled') + '>' + svg(I.baixo, 14) + '</button>' : '') + (fixo ? '' : '<button type="button" id="wfx-' + i + '" data-a="wfRemover" data-v="' + i + '" aria-label="Remove">' + svg(I.lixo, 14) + '</button>') + '</div></div>';
    }).join('');
    return { t: base ? 'Change base workflow' : 'Change workflow', s: base ? 'Applies to new tasks.' : m.nome,
      b: (m ? '<div class="ps-aviso">Completed steps are locked. On the current step, only the name and owner can change.</div>' : '') + '<div class="ps-col">' + linhas + '</div><div class="ps-sp"><button type="button" class="ps-btn" data-a="wfAdd">Add step</button>' + (m ? '<button type="button" class="ps-btn" data-a="wfRepor">Reset from the base workflow</button>' : '') + '</div>' + (base ? '<label class="ps-chk"><input id="wf-aplica" type="checkbox"> Also apply to tasks not yet started and not adjusted</label>' : ''),
      p: '<button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="wfGuardar">Save workflow</button>', largo: true };
  };
  var pintarPainel = function () {
    var h = document.querySelector('[data-painel]');
    if (!h) return;
    if (!U.painel) { h.innerHTML = ''; h.hidden = true; document.body.style.overflow = ''; return; }
    var r = Pn[U.painel.tipo](U.painel.args);
    h.hidden = false;
    document.body.style.overflow = 'hidden';
    var pan = h.querySelector('.ps-pan'), mesmo = !!pan && h.getAttribute('data-painel-tipo') === U.painel.tipo;
    var cls = 'ps-pan' + (r.largo ? ' largo' : '') + (r.cls ? ' ' + r.cls : '');
    var cab = '<div><h2 id="pan-t" tabindex="-1">' + e(r.t) + '</h2>' + (r.s ? '<div class="ps-mut ps-small">' + e(r.s) + '</div>' : '') + '</div><button type="button" class="ps-x" data-a="fecharPainel" aria-label="Close">×</button>';
    if (mesmo) {
      if (pan.className !== cls) pan.className = cls;
      var hd = pan.querySelector('.ps-pan-h'); if (hd && hd.innerHTML !== cab) hd.innerHTML = cab;
      var cb = pan.querySelector('.ps-pan-b'), sy = cb.scrollTop, abertos = [].map.call(cb.querySelectorAll('details[open]'), function (d) { return d.id; });
      cb.innerHTML = r.b;
      abertos.forEach(function (i) { var d = i && document.getElementById(i); if (d) d.open = true; });
      cb.scrollTop = sy;
      var pe = pan.querySelector('.ps-pan-p');
      if (r.p) { if (!pe) { pe = document.createElement('div'); pe.className = 'ps-pan-p'; pan.appendChild(pe); } if (pe.innerHTML !== r.p) pe.innerHTML = r.p; } else if (pe) pe.remove();
    } else {
      h.setAttribute('data-painel-tipo', U.painel.tipo);
      h.innerHTML = '<div class="ps-pan-f" data-a="fecharPainel"></div><div class="' + cls + '" role="dialog" aria-modal="true" aria-labelledby="pan-t"><div class="ps-pan-h">' + cab + '</div><div class="ps-pan-b">' + r.b + '</div>' + (r.p ? '<div class="ps-pan-p">' + r.p + '</div>' : '') + '</div>';
    }
    if (U.painelFoco) { U.painelFoco = false; var t = document.getElementById('pan-t'); if (t) t.focus(); }
  };

  /* --- Render e rotas ---------------------------------------------------- */
  var lerRota = function () {
    var pag, arg = '', q = {};
    if (MODO === 'hash') {
      var h = (location.hash || '').replace(/^#\/?/, ''), pq = h.split('?'), seg = pq[0].split('/');
      pag = seg[0]; arg = seg[1] || '';
      new URLSearchParams(pq[1] || '').forEach(function (v, k) { q[k] = v; });
    } else {
      var sec = document.querySelector('[data-pagina]');
      pag = sec ? sec.getAttribute('data-pagina') : '';
      new URLSearchParams(location.search).forEach(function (v, k) { q[k] = v; });
      arg = q.id || '';
    }
    if (!P.online() && q.perfil && P.user(q.perfil)) P.entrar(q.perfil);
    /* KPI assignment e Companies and perimeter passaram a separadores do Backoffice: os links antigos continuam a funcionar */
    if (pag === 'Saidas') pag = 'Timeline';
    if (pag === 'Evidencias') pag = 'Documentos';
    if (pag === 'Atribuicao') { pag = 'Backoffice'; q.tab = 'indicadores'; }
    if (pag === 'Perimetro') { pag = 'Backoffice'; q.tab = 'perimetro'; }
    if (pag === 'Calculos') { pag = 'Backoffice'; q.tab = 'calculos'; }
    /* KPI master saiu: o que la estava vive no painel de cada indicador (Backoffice, Indicators) */
    if (pag === 'Kpis') { pag = 'Backoffice'; q.tab = 'indicadores'; }
    var usr = u(), per = paginasPermitidas(usr);
    if (per.indexOf(pag) < 0 || (pag === 'Milestone' && !P.ms(arg))) pag = usr ? (usr.perfil === 'ext' ? 'Pedidos' : pag === 'Milestone' ? 'Milestones' : 'Inicio') : 'Entrada';
    return { pag: pag, arg: arg, q: q };
  };
  var R = function () {
    var ativo = document.activeElement, idF = ativo && ativo.id, ini = null, fim = null;
    try { ini = ativo.selectionStart; fim = ativo.selectionEnd; } catch (x) { /* nem todos os campos tem selecao */ }
    var sy = window.scrollY;
    var pag = U.rota.pag;
    if (window.PortalGrelha) window.PortalGrelha.antes();
    document.querySelectorAll('[data-pagina]').forEach(function (s) { s.hidden = s.getAttribute('data-pagina') !== pag; });
    pintarCabecalho();
    pintarMarca();
    if (pag === 'Inicio') pintarHero();
    /* Aberta pelo separador My tasks, a pagina mostra o que espera por mim */
    if (pag === 'Milestones') {
      var tt = document.querySelector('[data-campo="ms-titulo"]'), ts = document.querySelector('[data-campo="ms-sub"]');
      var todasT = veTodas(u());
      if (tt) tt.textContent = 'Tasks';
      if (ts) ts.textContent = U.msFiltro.minhas || !todasT ? 'My Tasks: what is waiting on you to fill in, review or approve.' : 'All Tasks: every open task, to follow the whole reporting.';
    }
    var sec = document.querySelector('[data-pagina="' + pag + '"]');
    if (sec) sec.querySelectorAll('[data-bloco]').forEach(function (b) {
      var f = Blocos[b.getAttribute('data-bloco')];
      if (!f) return;
      var abertos = [].map.call(b.querySelectorAll('details[open]'), function (d) { return d.id; });
      b.innerHTML = f();
      abertos.forEach(function (i) { var d = document.getElementById(i); if (d) d.open = true; });
    });
    pintarMarca();
    pintarPainel();
    if (P.pintarChat) P.pintarChat();
    if (window.PortalGrelha) window.PortalGrelha.depois();
    if (window.PortalFiltros) window.PortalFiltros.aplicar();
    /* No telemovel a timeline abre centrada no dia de hoje */
    document.querySelectorAll('.tlr-sc').forEach(function (sc) { var h = sc.querySelector('.tlr-hoje'); if (h && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = Math.max(0, h.offsetLeft - sc.clientWidth / 2); });
    if (!U.painelFoco && idF && document.getElementById(idF) && ativo !== document.getElementById(idF)) {
      var n = document.getElementById(idF);
      n.focus({ preventScroll: true });
      try { if (ini !== null) n.setSelectionRange(ini, fim); } catch (x2) { /* tipo de campo sem selecao */ }
    }
    window.scrollTo(0, sy);
  };
  /* Desce ate a linha do indicador (abaixo do cabecalho da pagina e do da lista), realca-a e poe o cursor no valor */
  var irParaIndicador = function (id) {
    var el = document.getElementById('ind-' + id) || document.getElementById('sec-dados');
    if (!el) return;
    var h = document.querySelector('.ps-h'), cab = document.querySelector('.rq2-cab');
    var topo = el.getBoundingClientRect().top + window.scrollY - (h ? h.getBoundingClientRect().height : 0) - (cab ? cab.getBoundingClientRect().height : 0) - 12;
    window.scrollTo({ top: Math.max(0, topo), behavior: 'auto' });
    el.classList.add('ps-alvo'); setTimeout(function () { el.classList.remove('ps-alvo'); }, 2600);
    var inp = document.getElementById('v-' + id); if (inp && !inp.disabled) { try { inp.focus({ preventScroll: true }); } catch (x) { inp.focus(); } }
  };
  var navegar = function () {
    var ant = U.rota.pag + '/' + U.rota.arg;
    U.rota = lerRota();
    var novo = U.rota.pag + '/' + U.rota.arg;
    U.msFiltro.minhas = U.rota.pag === 'Milestones' && !!U.rota.q.minhas;
    if (U.rota.pag === 'Milestones' && U.rota.q.periodo !== undefined) U.msFiltro.periodo = U.rota.q.periodo;
    var empRota = U.rota.pag === 'Milestones' && U.rota.q.empresa ? S.ent.filter(function (x) { return x.id === U.rota.q.empresa; })[0] : null;
    U.msFiltro.empresa = empRota ? empRota.nome : '';
    if (U.rota.pag === 'Backoffice' && U.rota.q.tab) U.boTab = U.rota.q.tab;
    /* Departments passou para um pop-up dentro de Users and profiles */
    if (U.boTab === 'departamentos') { U.boTab = 'utilizadores'; }
    /* Launch by department passou a ser a vista By department da pagina Indicators */
    if (U.boTab === 'lancar') { U.boTab = 'indicadores'; if (U.ind) U.ind.vista = 'dep'; }
    if (U.rota.q.sep) U.sep = U.rota.q.sep;
    else if (ant !== novo) U.sep = 'dados';
    /* Vindo de um KPI (Home, Tasks): abre a task no separador Work, lista, com esse indicador aberto */
    var indAlvo = U.rota.pag === 'Milestone' && U.rota.q.ind ? U.rota.q.ind : '', msAlvo = indAlvo ? P.ms(U.rota.arg) : null;
    if (msAlvo && msAlvo.indicadores.indexOf(indAlvo) > -1) {
      U.msTab[msAlvo.id] = 'trabalho'; U.dadosVista = 'form'; irAba(msAlvo, 'ecra');
      U.rqSub = U.rqSub || {}; U.rqSub[msAlvo.id] = 'todos'; U.rqAberto[msAlvo.id + ':' + indAlvo] = true;
    } else indAlvo = '';
    U.menu = null; U.painel = null;
    var hd = document.querySelector('[data-cabecalho]');
    if (hd) hd.classList.remove('open');
    if (U.marca) { U.marca = null; U.logoEstado = ''; P.aplicarMarca(); }
    R();
    if (ant !== novo) window.scrollTo(0, 0);
    if (U.rota.q.sep) { var alvoSec = document.getElementById('sec-' + U.rota.q.sep); if (alvoSec) alvoSec.scrollIntoView({ block: 'start' }); }
    if (indAlvo) irParaIndicador(indAlvo);
    else if (U.rota.pag === 'Milestone' && ant !== novo && !U.rota.q.sep) {
      var mRev = P.ms(U.rota.arg), lRev = mRev ? paraMimRever(mRev) : [];
      if (lRev.length) { U.rqAberto[mRev.id + ':' + lRev[0]] = true; R(); irParaIndicador(lRev[0]); }
    }
    var alvo = U.rota.pag;
    if (MODO === 'hash' && !location.hash && alvo !== 'Entrada') location.replace('#/' + alvo);
  };
  P.irPara = function (r) { if (MODO === 'hash') { if (location.hash === '#/' + r) navegar(); else location.hash = '/' + r; } else location.href = rota(r); };
  P.render = R;
  P.ui = U;

  /* --- Ficheiros --------------------------------------------------------- */
  /* Sem indicacao, e um documento de suporte: Excel ou PDF (faturas). Os dados entram so em .xlsx. */
  var escolherFicheiro = function (aceita, cb) {
    aceita = aceita || P.ACEITA_SUPORTE;
    var i = document.createElement('input');
    i.type = 'file'; i.accept = aceita; i.hidden = true;
    document.body.appendChild(i);
    i.addEventListener('change', function () {
      var f = i.files[0]; i.remove();
      if (!f) return;
      var ext = '.' + String(f.name).split('.').pop().toLowerCase();
      if (aceita.split(',').indexOf(ext) < 0) return toast(aceita === P.ACEITA_DADOS ? 'Only Excel files (.xlsx) are accepted here.' : 'Use an Excel file (.xlsx), or a PDF for invoices.', 'err');
      cb(f);
    });
    i.click();
  };
  var lerJSON = function (file, cb) { var r = new FileReader(); r.onload = function () { try { cb(JSON.parse(r.result)); } catch (x) { toast('The file is not valid JSON.', 'err'); } }; r.readAsText(file); };

  /* --- Acoes (clique) ---------------------------------------------------- */
  var res = function (r, okMsg) { if (r.erro) { toast(r.erro, 'err'); return false; } if (okMsg) toast(okMsg, 'ok'); R(); return true; };
  var val = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
  var A = {
    entrar: function (d) { P.entrar(d.v); var usr = P.user(d.v); P.irPara(usr.perfil === 'ext' ? 'Pedidos' : 'Inicio'); },
    msAtrAbrir: function () { U.atrSel = undefined; U.atrBusca = ''; abrePainel('atribuir', {}); },
    msAtrGuardar: function () { var m = msAtual(), v = U.atrSel === undefined ? (m.atribuido_a || '') : U.atrSel; U.painel = null; U.atrSel = undefined; res(P.atribuir(m, v, u()), 'Assignment saved. It is in the history of the task.'); },
    matVer: function (d) { abrePainel('matInd', { norma: d.v }); },
    entVer: function (d) { abrePainel('entrega', { id: d.v }); },
    momEmpTirar: function (d) { var p2 = d.v.split('|'), c = P.cat(p2[0]), ids = P.empresasInd(c).map(function (x) { return x.id; }).filter(function (k) { return k !== p2[1]; }); if (!ids.length) return toast('An indicator needs at least one company.', 'err'); mudarEmpresasInd(c, ids); R(); },
    momRepor: function (d) { res(P.reporMomentos(d.v, u()), 'Back to the default for ' + d.v + '.'); },
    marcaAbrir: function () { U.menu = null; U.marca = null; U.logoEstado = ''; abrePainel('marca'); },
    ambienteTeste: function () { P.sair(); P.mudarAmbiente(true); },
    ambientePrincipal: function () { P.sair(); P.mudarAmbiente(false); },
    ambienteLimpar: function () { if (!window.confirm('Clear the test environment? Every task, value and comment created here will be removed' + (P.partilha && P.partilha.estado === 'ligado' ? ', for everyone who uses it' : '') + '.')) return; P.reporDemonstracao(); U.menu = null; U.imp = {}; U.cal = null; toast('Test environment cleared.', 'ok'); P.irPara('Inicio'); },
    sair: function () { P.sair(); if (P.online()) { window.PortalBackend.sair(); P.estadoVazio(); } U.menu = null; U.cal = null; P.irPara('Entrada'); },
    menuNotif: function () { U.menu = U.menu === 'notif' ? null : 'notif'; R(); },
    menuConta: function () { U.menu = U.menu === 'conta' ? null : 'conta'; R(); },
    fecharMenu: function () { U.menu = null; },
    toggleNav: function () { var h = document.querySelector('[data-cabecalho]'); h.classList.toggle('open'); },
    maisNav: function () { var h = document.querySelector('[data-cabecalho]'); h.classList.toggle('open'); window.scrollTo(0, 0); },
    calDia: function (d) { U.cal.dia = +d.v; R(); },
    calMes: function (d) { var n = U.cal.mes + (+d.v), dt = new Date(U.cal.ano, n, 1); U.cal = { ano: dt.getFullYear(), mes: dt.getMonth(), dia: 1 }; R(); },
    calHoje: function () { U.cal = null; R(); },
    msVista: function (d) { U.msVista = d.v; R(); },
    boMsVista: function (d) { U.boMs.vista = d.v; R(); },
    boIndTirar: function (d) { var x = d.v.split('|'); abrePainel('indTirar', { ms: x[0], id: x[1] }); },
    boIndTirarSim: function (d) { var x = d.v.split('|'), r = P.tirarIndTask(x[0], x[1], u()); if (r.erro) return toast(r.erro, 'err'); U.painel = null; toast(r.taskApagada ? 'Task ' + r.nome + ' deleted (it had only ' + x[1] + ').' : x[1] + ' removed from the task. You can send it again from Indicators.', 'ok'); R(); },
    userUnTirarEmp: function (d) {
      var p2 = d.v.split('|'), x = P.user(p2[0]), y = S.ent.filter(function (z) { return z.id === p2[1]; })[0];
      if (!x || !y) return;
      var l = P.unidadesDe(x, y.nome).filter(function (k) { return k !== p2[2]; });
      if (P.daUnidade(x) && !l.length) return toast('A ' + P.PERFIS[x.perfil] + ' needs at least one department in ' + y.nome + '. Remove them from ' + y.nome + ' instead.', 'err');
      P.definirUnidadesEmp(x, y.nome, l);
      P.eventoGlobal(x.nome + ' is no longer in ' + p2[2] + ' (' + y.nome + ').', u().nome); P.guardar(); R();
    },
    userEmpTirar: function (d) {
      var p2 = d.v.split('|'), x = P.user(p2[0]), y = S.ent.filter(function (z) { return z.id === p2[1]; })[0];
      if (!x || !y) return;
      var on = P.empresasUser(x).map(function (z) { return z.id; }).filter(function (k) { return k !== y.id; });
      if (!on.length) return toast('A person needs at least one company.', 'err');
      x.empresas = on;
      if (x.unidadesEmp) { delete x.unidadesEmp[y.id]; P.definirUnidadesEmp(x, S.ent.filter(function (z) { return z.id === on[0]; })[0].nome, P.unidadesDe(x, S.ent.filter(function (z) { return z.id === on[0]; })[0].nome)); }
      (S.deps || []).forEach(function (dp) { if (dp.chefes && dp.chefes[y.id] === x.login) dp.chefes[y.id] = ''; });
      P.eventoGlobal(x.nome + ' removed from ' + y.nome + '.', u().nome, 'Change'); P.guardar(); toast(x.nome + ' removed from ' + y.nome + '.', 'ok'); R();
    },
    depsAbrir: function () { abrePainel('deps', {}); },
    boMsApagar: function (d) { abrePainel('msApagar', { id: d.v }); },
    boMsApagarSim: function (d) { var r = P.apagarTask(d.v, u()); if (r.erro) return toast(r.erro, 'err'); U.painel = null; toast(r.nome + ' deleted.', 'ok'); R(); },
    msAba: function (d) { U.msFiltro.minhas = d.v === 'minhas'; R(); },
    msEmpTodas: function () { U.msEmpTodas = !U.msEmpTodas; R(); },
    msExcel: function () { exportarMilestones(msFiltradas()); },
    dadosVista: function (d) { U.dadosVista = d.v; R(); },
    rqAbrir: function (d) { var m = msAtual(); U.rqAberto[m.id + ':' + d.v] = !rqAberto(m, d.v); R(); },
    rqTodos: function () { var m = msAtual(), abrir = !m.indicadores.every(function (id) { return rqAberto(m, id); }); m.indicadores.forEach(function (id) { U.rqAberto[m.id + ':' + id] = abrir; }); R(); },
    dadosExcel: function () { var m = msAtual(); exportarGrelha(cfgDados(m), 'data-request-' + m.id + '-' + m.ano + '.xlsx', 'Data', folhaFicheiros(m)); toast('Excel file exported.', 'ok'); },
    triUsar: function (d) { var r = P.usarTrimestres(msAtual(), u(), d.v ? [d.v] : null); if (r.erro) return toast(r.erro, 'err'); toast(r.n + ' annual value(s) calculated from the quarters' + (r.parciais ? ', ' + r.parciais + ' still year to date.' : '.'), 'ok'); R(); },
    wfHist: function () { var m = msAtual(); U.wfHist[m.id] = !U.wfHist[m.id]; R(); },
    tipoNovo: function () { U.tipoEd = rascunhoTipo(null); abrePainel('tipo', {}); },
    tipoEditar: function (d) { U.tipoEd = rascunhoTipo(d.v); abrePainel('tipo', { id: d.v }); },
    tipoGran: function (d) { U.tipoEd.granularidade = d.v; R(); },
    tipoColModo: function (d) {
      var t = U.tipoEd;
      if (d.v === 'auto') t.colunas = null;
      else if (!t.colunas || !t.colunas.length) { var us = {}; S.ms.filter(function (m) { return m.unidade === t.unidade; }).forEach(function (m) { P.camposMilestone(m).forEach(function (k) { us[k] = 1; }); }); t.colunas = Object.keys(us); }
      R();
    },
    tipoGuardar: function () { var r = P.guardarTipo(U.tipoEd, u()); if (r.erro) return toast(r.erro, 'err'); toast(r.novo ? 'Data type created.' : 'Saved as version ' + r.tipo.versao + '.', 'ok'); fechaPainel(); },
    tipoArquivar: function () { var t = U.tipoEd, r = P.arquivarTipo(t.id, !t.ativo, u()); if (r.erro) return toast(r.erro, 'err'); toast(t.ativo ? 'Archived. It is no longer requested in open tasks.' : 'Restored.', 'ok'); fechaPainel(); },
    lancAbrir: function () { lancEstado(); abrePainel('lancar', {}); },
    /* Um periodo inteiro: todos os departamentos que ainda tem o que lancar nesse periodo */
    lancPeriodo: function (d) { U.lanc = null; var L = lancEstado(); L.periodos = [d.v]; L.unidades = P.UNIDADES.filter(function (un) { return !P.msExistente(un, d.v) && P.indicadoresSugeridos(un, d.v).length; }); L.aberto = ''; empLanc(L); abrePainel('lancar', {}); },
    lancCel: function (d) { var x = d.v.split('|'); U.lanc = null; var L = lancEstado(); L.periodos = [x[1]]; L.unidades = [x[0]]; L.aberto = x[0]; empLanc(L); abrePainel('lancar', {}); },
    lancUn: function (d) { var L = lancEstado(); L.aberto = L.aberto === d.v ? '' : d.v; R(); },
    lancTodos: function () { var L = lancEstado(); L.unidades = P.UNIDADES.filter(function (un) { return L.periodos.some(function (pid) { return P.indicadoresSugeridos(un, pid).length; }); }); R(); },
    lancNenhum: function () { var L = lancEstado(); L.unidades = []; R(); },
    lancConfirmar: function () {
      var L = lancEstado(), r = P.lancarMilestones({ periodos: L.periodos, unidades: L.unidades, empresa: L.empresa, prazo: L.prazo === 'data' ? L.data : 'fecho', indicadores: L.indicadores, tipos: L.tipos, atribuido: L.atrib }, u());
      if (r.erro) return toast(r.erro, 'err');
      toast(r.criadas.length + ' task(s) assigned' + (r.ignoradas.length ? ', ' + r.ignoradas.length + ' skipped' : '') + '.', r.criadas.length ? 'ok' : 'err');
      U.lanc = null; fechaPainel();
    },
    colRelFechar: function () { delete U.colRel[msAtual().id]; R(); },
    irFalta: function (d) {
      if (d.campo !== 'fic' && d.campo !== 'evi') U.dadosVista = 'form';
      irAba(msAtual(), d.campo === 'fic' || d.campo === 'evi' ? 'fic' : 'ecra');
      if (d.campo === 'just' || d.campo === 'met') U.rqAberto[msAtual().id + ':' + d.id] = true;
      R();
      var el = document.getElementById({ val: 'v-', just: 'j-', met: 'm-', evi: 'fp-ev:', fic: 'fp-' }[d.campo] + d.id);
      if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); }
    },
    ficEntregar: function (d) { var m = msAtual(), pf = P.ficheirosPedidos(m).filter(function (x) { return x.id === d.v; })[0]; escolherFicheiro(pf && pf.tipo ? P.ACEITA_DADOS : P.ACEITA_SUPORTE, function (f) { var r = P.entregarFicheiro(m, d.v, f.name, u()); if (r.erro) return toast(r.erro, 'err'); toast('File delivered.', 'ok'); R(); }); },
    ficPedirAbrir: function () { abrePainel('pedirFicheiro'); },
    ficPedir: function () { var c = document.getElementById('fp-obr'); var r = P.pedirFicheiro(msAtual(), val('fp-nome'), c && c.checked, u()); if (r.erro) return toast(r.erro, 'err'); U.painel = null; res(r, 'File added to the request.'); },
    ficRetirar: function (d) { res(P.retirarPedidoFicheiro(msAtual(), d.v, u()), 'File removed from the request.'); },
    ficIrDados: function (d) { irParaDados(msAtual(), d.v); },
    rqAba: function (d) { irAba(msAtual(), d.v); R(); },
    fpOutros: function () {
      var m = msAtual(), i = document.createElement('input');
      i.type = 'file'; i.multiple = true; i.accept = '.xlsx,.pdf'; i.hidden = true;
      document.body.appendChild(i);
      i.addEventListener('change', function () { var fs = i.files; i.remove(); if (fs && fs.length) juntarFila(m, fs); });
      i.click();
    },
    wzAbrir: function () { wzAbrir(msAtual()); },
    wzEscolher: function () { escolherFicheiro('.xlsx,.xls,.csv', wzLer); },
    wzPasso: function (d) { var w = U.wiz, n = +d.v; if (n < 1) return; w.passo = n; R(); },
    wzFolha: function (d) { var w = U.wiz; w.f = +d.v; wzDetetar(w, P.ms(w.ms)); R(); },
    wzPapel: function (d) { U.wiz.papel = d.v; R(); },
    wzCol: function (d) {
      var w = U.wiz, c = +d.v;
      if (w.papel === 'id') { w.colId = c; if (w.colVal === c) w.colVal = -1; if (w.colVal < 0) w.papel = 'val'; } else { w.colVal = c; if (w.colId === c) { w.colId = -1; w.papel = 'id'; } }
      wzMapear(w, P.ms(w.ms)); R();
    },
    wzTodos: function () { var w = U.wiz, m = P.ms(w.ms); wzIds(m).forEach(function (id) { w.incl[id] = wzCheck(w, m, id).ok; }); R(); },
    wzNenhum: function () { U.wiz.incl = {}; R(); },
    wzAplicar: function () {
      var w = U.wiz, m = P.ms(w.ms), usr = u();
      if (!P.podePreencher(m, usr)) return toast('This task is not with you right now.', 'err');
      var ids = wzIds(m).filter(function (id) { return w.incl[id] && wzCheck(w, m, id).ok; });
      ids.forEach(function (id) { P.gravarValor(m, id, String(wzCheck(w, m, id).n), usr, 'import from Excel'); });
      P.evento(m, ids.length + ' value' + (ids.length === 1 ? '' : 's') + ' imported from ' + w.nome + '.', usr.nome);
      if (w.guardar) m.documentos_gerais.push({ ficheiro: w.nome, por: usr.nome, em: new Date().toISOString(), fid: P.guardarFicheiro(w.file) });
      P.guardar();
      U.wiz = null; U.painel = null; U.dadosVista = 'form'; irAba(m, 'ecra');
      toast(ids.length + ' value' + (ids.length === 1 ? '' : 's') + ' filled in from ' + w.nome + '.', 'ok');
      R();
      setTimeout(function () {
        var l0 = ids.length && document.getElementById('ind-' + ids[0]);
        if (l0) l0.scrollIntoView({ block: 'center' });
        ids.forEach(function (id) { var l = document.getElementById('ind-' + id); if (l) { l.classList.remove('rq2-flash'); void l.offsetWidth; l.classList.add('rq2-flash'); } });
      }, 0);
    },
    dzTirar: function (d) { var m = msAtual(); U.dzFila[m.id] = filaDe(m).filter(function (x) { return x.k !== d.v; }); R(); },
    dzLimpar: function () { U.dzFila[msAtual().id] = []; R(); },
    dzEnviar: function () {
      var m = msAtual(), usr = u(), ok = 0, erros = [], fica = [];
      if (!P.podePreencher(m, usr)) return toast('This task is not with you right now.', 'err');
      filaDe(m).forEach(function (x) {
        if (x.cat === 'geral') { m.documentos_gerais.push({ ficheiro: x.nome, por: usr.nome, em: new Date().toISOString(), fid: P.guardarFicheiro(x.file) }); P.evento(m, 'Supporting document uploaded: ' + x.nome + '.', usr.nome); ok++; return; }
        var fid = P.novoFid(), r = P.entregarFicheiro(m, x.cat, x.nome, usr, fid);
        if (r.erro) { erros.push(x.nome + ': ' + r.erro); fica.push(x); } else { P.guardarFicheiro(x.file, fid); ok++; }
      });
      U.dzFila[m.id] = fica;
      P.guardar();
      if (erros.length) toast((ok ? ok + ' uploaded. ' : '') + erros.join(' '), 'err'); else toast(ok + ' file' + (ok === 1 ? '' : 's') + ' uploaded.', 'ok');
      R();
    },
    expDom: function (d) { estadoExp(msAtual()).dom = d.v; R(); },
    expTodos: function () { var x = estadoExp(msAtual()); idsDominio(x.dom).forEach(function (id) { if (x.sel.indexOf(id) < 0) x.sel.push(id); }); R(); },
    expLimpar: function () { estadoExp(msAtual()).sel = []; R(); },
    expExcel: function () { var m = msAtual(); exportarGrelha(cfgRelatorio(m), 'report-' + m.id + '-' + m.ano + '.xlsx', 'Report'); toast('Report exported to Excel.', 'ok'); },
    msTagDel: function (d) { var m = msAtual(); m.departamentos = m.departamentos.filter(function (x) { return x !== d.v; }); P.evento(m, 'Department tag removed: ' + d.v + '.', u().nome); P.guardar(); R(); },
    msTab: function (d) { U.msTab[msAtual().id] = d.v; R(); window.scrollTo(0, Math.min(window.scrollY, (document.querySelector('.ps-mtabs') || { offsetTop: 0 }).offsetTop - 80)); },
    sep: function (d) { U.sep = d.v; var s = document.getElementById('sec-' + d.v); if (s) setTimeout(function () { s.scrollIntoView({ block: 'start' }); }, 0); },
    ficha: function (d) { abrePainel('ficha', { id: d.v }); },
    fecharPainel: function () { fechaPainel(); },
    abrirTecnica: function (d) { abrePainel('tecnica', { sec: d.v || 'schema' }); },
    tecSec: function (d) { U.painel.args.sec = d.v; R(); },
    schemaCopiar: function () { var t = JSON.stringify(P.jsonSchema(msAtual()), null, 2); if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('JSON Schema copied.', 'ok'); }, function () { toast('Could not copy. Use Download.', 'err'); }); else toast('Could not copy. Use Download.', 'err'); },
    schemaDesc: function () { var m = msAtual(); P.descarregar('schema-' + m.id + '.json', JSON.stringify(P.jsonSchema(m), null, 2), 'application/json'); },
    tplExcel: function () { P.templateExcel(msAtual()); },
    tplCsv: function () { P.templateCSV(msAtual()); },
    anexar: function (d) { var m = msAtual(), it = P.item(d.v, P.chave(m)); escolherFicheiro('', function (f) { P.anexar(it, f.name, u(), P.guardarFicheiro(f)); P.evento(m, 'Evidence attached to ' + P.cat(d.v).nome + ': ' + f.name + '.', u().nome); P.guardar(); toast('Evidence attached.', 'ok'); R(); }); },
    anexarGeral: function () { var m = msAtual(), usr = u(); escolherFicheiro('', function (f) { m.documentos_gerais.push({ ficheiro: f.name, por: usr.nome, em: new Date().toISOString(), fid: P.guardarFicheiro(f) }); P.evento(m, 'General document attached: ' + f.name + '.', usr.nome); P.guardar(); toast('Document attached.', 'ok'); R(); }); },
    revAprovar: function (d) {
      var m = msAtual(), r = P.aprovarIndicador(m, d.v, u());
      if (r.erro) return toast(r.erro, 'err');
      var resto = paraMimRever(m);
      toast(P.cat(d.v).nome + ' approved.' + (resto.length ? ' ' + resto.length + ' more to review.' : ' Nothing else to review here.'), 'ok'); R();
      if (resto.length) irParaIndicador(resto[0]);
    },
    matrizAbrir: function () { abrePainel('matriz', {}); },
    fatLerInd: function (d) { var m = msAtual(); escolherFicheiro('.pdf,.png,.jpg,.jpeg,.webp', function (f) { P.abrirLeituraFatura(f, { ms: m.id, ind: d.v }); }); },
    revDevolver: function (d) { abrePainel('devInd', { id: d.v }); },
    revDevConfirmar: function (d) {
      var m = msAtual(), el = document.getElementById('dev-ind-com'), r = P.devolverIndicador(m, d.v, u(), el ? el.value : '');
      if (r.erro) { toast(r.erro, 'err'); if (el) el.focus(); return; }
      U.painel = null; toast(P.cat(d.v).nome + ' returned to ' + (P.atribuido(m) ? P.atribuido(m).nome : 'the unit') + '.', 'ok'); R();
      var resto = paraMimRever(m); if (resto.length) irParaIndicador(resto[0]);
    },
    revProximo: function () { var l = paraMimRever(msAtual()); if (l.length) { U.rqAberto[msAtual().id + ':' + l[0]] = true; R(); irParaIndicador(l[0]); } },
    indSubmeter: function (d) { var m = msAtual(), r = P.submeterIndicadores(m, [d.v], u()); if (r.erro) return toast(r.erro, 'err'); if (r.recusados.length) return toast(r.recusados[0], 'err'); toast(d.v + ' submitted. ' + P.estadoSubmissao(m).faltam + ' still to submit.', 'ok'); R(); },
    indSubmeterProntos: function () { var m = msAtual(), es = P.estadoSubmissao(m), r = P.submeterIndicadores(m, es.prontos, u()); if (r.erro) return toast(r.erro, 'err'); toast(r.feitos.length + ' indicator(s) submitted. ' + P.estadoSubmissao(m).faltam + ' still to submit.', 'ok'); R(); },
    indReabrir: function (d) { var r = P.reabrirIndicador(msAtual(), d.v, u()); if (r.erro) return toast(r.erro, 'err'); toast(d.v + ' reopened. Submit it again when it is ready.', 'ok'); R(); },
    rqSubFil: function (d) { U.rqSub = U.rqSub || {}; U.rqSub[msAtual().id] = d.v; R(); },
    guardarTrab: function () { var ae = document.activeElement; if (ae && ae.blur) ae.blur(); P.guardarTrabalho(msAtual(), u()); toast('Work saved. Nothing was submitted.', 'ok'); R(); },
    histVista: function (d) { U.histVista = d.v; R(); },
    histVer: function (d) { U.histInd = d.v; U.histVista = 'ind'; R(); window.scrollTo(0, 0); },
    submeter: function () {
      var m = msAtual(), r = P.submeter(m, u());
      if (r.erro) return toast(r.erro, 'err');
      if (r.faltas) {
        toast(r.faltas.length === 1 ? r.faltas[0].msg : r.faltas.length + ' items missing. ' + r.faltas[0].msg, 'err');
        var f = r.faltas[0];
        if (f.campo !== 'fic') { U.dadosVista = 'form'; irAba(m, 'ecra'); if (f.campo !== 'val') U.rqAberto[m.id + ':' + f.id] = true; R(); } else { irAba(m, 'fic'); R(); }
        var el = document.getElementById({ val: 'v-', just: 'j-', met: 'm-', evi: 'e-', fic: 'fp-' }[f.campo] + f.id);
        if (el) el.focus();
        return;
      }
      toast('Task submitted.', 'ok'); R();
    },
    concluirPasso: function () { var m = msAtual(), t = P.passoAtual(m).tipo, r = P.concluirPasso(m, u(), val('rev-com')); res(r, t === 'parecer' ? 'Opinion given.' : t === 'aprovacao' ? 'Values approved and locked.' : 'Review completed.'); },
    devolver: function () { var r = P.devolver(msAtual(), u(), val('rev-com')); if (r.erro) { toast(r.erro, 'err'); var c = document.getElementById('rev-com'); if (c) c.focus(); return; } U.sep = 'dados'; toast('Task returned to the unit.', 'ok'); R(); },
    comentar: function () { var t = val('chat-txt').trim(), m = msAtual(); if (!t) return toast('Write a comment.', 'err'); m.comentarios.push({ autor: u().nome, texto: t, em: new Date().toISOString() }); P.guardar(); R(); },
    pedirAjuda: function (d) { var m = msAtual(), id = d.v || m.indicadores[0]; U.ajuda = { ind: id, sel: '', q: '', msg: msgAjuda(m, id, ''), editada: false, prazo: P.diasDe(7) }; abrePainel('pedirAjuda'); },
    ajEnviar: function () {
      var a = U.ajuda, r = P.pedirAjuda(msAtual(), a.ind, a.sel, a.msg, a.prazo, u());
      if (r.erro) return toast(r.erro, 'err');
      U.ajuda = null; U.painel = null; toast('Request sent to ' + r.nome + ', with your message.', 'ok'); R();
    },
    ajResponder: function (d) { var x = S.ext.filter(function (y) { return y.id === d.v; })[0]; res(P.responderAjuda(x, val('ajv-' + d.v), val('ajn-' + d.v), u()), 'Value sent. Whoever asked can now use it.'); },
    usarExt: function (d) { var x = S.ext.filter(function (y) { return y.id === d.v; })[0]; res(P.usarExterno(x, u()), 'Value applied to the indicator.'); },
    enviarExt: function (d) { var x = S.ext.filter(function (y) { return y.id === d.v; })[0], fi = document.getElementById('xe-' + d.v), nome = fi && fi.files[0] ? fi.files[0].name : ''; res(P.responderExterno(x, val('xv-' + d.v), nome, u()), 'Value sent.'); },
    reexpressar: function (d) { var r = P.reexpressar(P.msDoIndicador(d.v), d.v, val('rx-val'), val('rx-mot'), u()); res(r, 'Value restated.'); },
    pedidoAud: function (d) { res(P.criarPedidoAuditor(d.v, val('pa-txt'), u()), 'Request sent to the unit.'); },
    novoPedAud: function () { abrePainel('novoPedAud'); },
    naCriar: function () { var r = P.criarPedidoAuditor(val('na-ind'), val('na-txt'), u()); if (r.erro) return toast(r.erro, 'err'); U.painel = null; toast('Request sent to the unit.', 'ok'); R(); },
    responderAud: function (d) { var a = S.aud.filter(function (x) { return x.id === d.v; })[0]; res(P.responderAuditor(a, val('ra-' + d.v), u()), 'Answer sent to the auditor.'); },
    resolverAud: function (d) { var a = S.aud.filter(function (x) { return x.id === d.v; })[0]; res(P.resolverAuditor(a, u()), 'Request resolved.'); },
    amostra: function () { res(P.sortearAmostra(u()), 'Sample of 5 indicators selected.'); },
    dataRoom: function () { P.exportarDataRoom(); toast('Data room exported.', 'ok'); },
    audFiltro: function (d) { U.audFiltro = d.v; R(); },
    relExcel: function () { P.exportarRelatorio(); },
    imprimir: function () { window.print(); },
    histJson: function () { P.descarregar('valores-aprovados.json', JSON.stringify(P.valoresAprovados(), null, 2), 'application/json'); },
    docNova: function () { U.docNova = !U.docNova; R(); },
    docGuardar: function () {
      var cons = P.lerNumero(val('nf-consumo')), v = P.lerNumero(val('nf-valor')), iva = P.lerNumero(val('nf-iva'));
      if (!val('nf-fornecedor').trim() || !val('nf-periodo').trim() || !val('nf-instalacao').trim() || cons === null || v === null || iva === null) return toast('Fill in supplier, period, site, consumption, amount and VAT.', 'err');
      S.docs.unshift({ id: 'D' + Date.now(), tipo: val('nf-tipo'), fornecedor: val('nf-fornecedor').trim(), periodo: val('nf-periodo').trim(), instalacao: val('nf-instalacao').trim(), entidade: val('nf-entidade'), consumo: cons, valor_sem_iva: v, iva: iva, percentagem_renovavel: P.lerNumero(val('nf-renov')), centro_custo: val('nf-cc').trim(), leitura_telemetria: P.lerNumero(val('nf-tele')), estado: 'em conferência' });
      U.docNova = false; P.guardar(); toast('Invoice saved for checking.', 'ok'); R();
    },
    distribuir: function (d) { var x = S.docs.filter(function (y) { return y.id === d.v; })[0]; x.estado = 'distribuída'; P.guardar(); toast('Invoice distributed.', 'ok'); R(); },
    boTab: function (d) { if (U.marca) { U.marca = null; U.logoEstado = ''; P.aplicarMarca(); } U.boTab = d.v; R(); },
    abrirCiclo: function () { if (!window.confirm('Open the ' + (S.ciclo.ano + 1) + ' cycle? The current cycle will be closed.')) return; var r = P.abrirCiclo(u()); if (res(r, 'Cycle ' + r.ano + ' opened with ' + r.criadas + ' tasks.')) { U.cal = null; } },
    userNovo: function () {
      var nu = U.userNovo || {}, n = String(nu.nome || '').trim().replace(/\s+/g, ' ');
      if (n.split(' ').length < 2) { toast('Write the first and last name.', 'err'); var f = document.getElementById('nu-nome'); if (f) f.focus(); return; }
      if (S.users.some(function (x) { return norm(x.nome) === norm(n); })) return toast('There is already a user called ' + n + '.', 'err');
      if (P.daUnidade(nu) && !nu.unidades.length) return toast('Add at least one department to a ' + P.PERFIS[nu.perfil] + '.', 'err');
      var x = { login: P.loginDe(n), nome: n, perfil: nu.perfil }; P.definirUnidades(x, nu.unidades); if (nu.empresas && nu.empresas.length && nu.empresas.length < S.ent.length) x.empresas = nu.empresas.slice(); S.users.push(x);
      P.eventoGlobal('User added: ' + n + ', ' + P.PERFIS[x.perfil] + (x.unidades.length ? ', ' + x.unidades.join(', ') : '') + '.', u().nome, 'Creation');
      U.userNovo = null; P.guardar(); toast(n + ' added.', 'ok'); R();
    },
    userUnTirar: function (d) {
      var p = d.v.split('|'), x = p[0] === '__novo' ? U.userNovo : P.user(p[0]);
      if (!x) return;
      if (p[0] === '__novo') { x.unidades = x.unidades.filter(function (k) { return k !== p[1]; }); return R(); }
      if (P.daUnidade(x) && P.unidadesDe(x).length === 1) return toast('A ' + P.PERFIS[x.perfil] + ' needs at least one department.', 'err');
      P.definirUnidades(x, P.unidadesDe(x).filter(function (k) { return k !== p[1]; }));
      P.eventoGlobal(x.nome + ' is no longer in ' + p[1] + '.', u().nome); P.guardar(); R();
    },
    userApagar: function (d) {
      var x = P.user(d.v);
      if (!x) return;
      var usos = Object.keys(S.atrib || {}).filter(function (k) { var a = S.atrib[k]; return a.submete === x.login || a.reve === x.login || a.valida === x.login; }).length + S.ms.filter(function (m) { return m.atribuido_a === x.login && !P.concluida(m); }).length;
      if (usos) return toast(x.nome + ' is responsible for ' + usos + ' indicator(s) or open task(s). Change that in Backoffice, Indicators first.', 'err');
      if (!window.confirm('Remove ' + x.nome + '? The history keeps their name.')) return;
      S.users.splice(S.users.indexOf(x), 1);
      P.eventoGlobal('User removed: ' + x.nome + '.', u().nome); P.guardar(); toast(x.nome + ' removed.', 'ok'); R();
    },
    abrirWf: function () { U.wfDraft = JSON.parse(JSON.stringify(msAtual().passos)); abrePainel('wf', {}); },
    abrirWfBase: function () { U.wfDraft = JSON.parse(JSON.stringify(S.wfbase)); abrePainel('wf', { base: true }); },
    wfAdd: function () { var d = U.wfDraft, pub = -1; d.forEach(function (p, i) { if (p.tipo === 'publicacao') pub = i; }); d.splice(pub > -1 ? pub : d.length, 0, P.passoNovo('parecer')); R(); },
    wfRemover: function (d) { U.wfDraft.splice(+d.v, 1); R(); },
    wfMover: function (d, el) { var i = +d.v, j = i + (+el.getAttribute('data-d')), l = U.wfDraft, t = l[i]; l[i] = l[j]; l[j] = t; R(); },
    wfRepor: function () { U.wfDraft = P.repostoDoBase(msAtual()); R(); },
    wfGuardar: function () {
      if (U.painel.args.base) {
        var ap = document.getElementById('wf-aplica'), r = P.guardarWorkflowBase(U.wfDraft, ap && ap.checked);
        if (r.erro) return toast(r.erro, 'err');
        U.painel = null; toast('Base workflow saved' + (r.aplicadas ? ' and applied to ' + r.aplicadas + ' tasks.' : '.'), 'ok'); return R();
      }
      var q = P.guardarWorkflow(msAtual(), U.wfDraft, u());
      if (q.erro) return toast(q.erro, 'err');
      U.painel = null; toast('Workflow saved.', 'ok'); R();
    },
    janNova: function () { S.janelas.push({ nome: 'Nova janela', tema: 'Governance', meses: [1], dia_inicio: 1, dia_fim: 10 }); P.guardar(); R(); },
    janApagar: function (d) { S.janelas.splice(+d.v, 1); P.guardar(); R(); },
    entNova: function () { res(P.criarEmpresa(val('ent-novo').trim()), 'Company added.'); },
    entApagar: function (d) { res(P.apagarEmpresa(S.ent[+d.v]), 'Company removed.'); },
    depNova: function () { var em = val('dep-novo-emp'); res(P.criarDepartamento(val('dep-novo').trim(), em ? [em] : []), 'Department added.'); },
    depEmpTirar: function (d) { var p2 = d.v.split('|'), dep = S.deps[+p2[0]]; dep.empresas = (dep.empresas || []).filter(function (k) { return k !== p2[1]; }); P.eventoGlobal('Department ' + dep.nome + ': companies set to ' + (dep.empresas.length ? P.empresasDoDep(dep).map(function (x) { return x.nome; }).join(', ') : 'all') + '.', u().nome); P.guardar(); R(); },
    depApagar: function (d) { res(P.apagarDepartamento(S.deps[+d.v]), 'Department removed.'); },
    mcPaleta: function (d) { U.marca.cores = JSON.parse(JSON.stringify(P.PALETAS[+d.v].cores)); P.aplicarMarca(Object.assign({}, U.marca)); R(); },
    mcGuardar: function () {
      var r = P.guardarMarca(JSON.parse(JSON.stringify(U.marca)));
      if (r.erro) return toast(r.erro, 'err');
      U.marca = null; U.logoEstado = ''; U.painel = null;
      toast('Brand saved. It now applies across the platform.', 'ok'); R();
    },
    mcExportar: function () { P.descarregar('marca.json', JSON.stringify(S.marca, null, 2), 'application/json'); },
    mcImportar: function () { escolherFicheiro('.json', function (f) { lerJSON(f, function (o) { var e2 = P.validarMarca(o); if (e2) return toast(e2, 'err'); U.marca = { nome: String(o.nome || P.MARCA_BASE.nome), subtitulo: String(o.subtitulo || ''), logotipo: String(o.logotipo || ''), cores: o.cores }; P.aplicarMarca(U.marca); toast('Brand imported. Check it and save.', 'ok'); R(); }); }); },
    mcRepor: function () { U.marca = JSON.parse(JSON.stringify(P.MARCA_BASE)); U.logoEstado = ''; P.aplicarMarca(U.marca); toast('Original values restored. Check them and save.'); R(); },
    dadosExportar: function () { P.descarregar('portal-dados.json', JSON.stringify(P.exportarTudo(), null, 2), 'application/json'); },
    dadosImportar: function () { if (P.online()) return toast('Data lives in the database and is not replaced from a file.', 'err'); escolherFicheiro('.json', function (f) { lerJSON(f, function (o) { var er = P.importarTudo(o); if (er) return toast(er, 'err'); toast('Data imported.', 'ok'); U.marca = null; R(); }); }); },
    dadosRepor: function () { if (P.online()) return toast('Data is not reset from the browser.', 'err'); if (!window.confirm('Reset the data? All changes made in this browser will be lost.')) return; P.reporDemonstracao(); P.aplicarMarca(); U.marca = null; U.imp = {}; toast('Data reset.', 'ok'); R(); }
  };
  Object.keys(AI).forEach(function (k) { A[k] = AI[k]; });

  /* --- Campos (mudanca) -------------------------------------------------- */
  var mudouMarca = function () { P.aplicarMarca(U.marca); agendar(); };
  var C = {
    valor: function (el) { var m = msAtual(); if (P.indSubmetido(m, el.dataset.id)) { toast('Submitted. Reopen it to change it.', 'err'); return R(); } P.gravarValor(m, el.dataset.id, el.value, u()); },
    dzCat: function (el) { var x = filaDe(msAtual()).filter(function (y) { return y.k === el.dataset.id; })[0]; if (x) x.cat = el.value; },
    wzCab: function (el) { var w = U.wiz; w.cab = +el.value; wzMapear(w, P.ms(w.ms)); },
    wzLinha: function (el) { var w = U.wiz, m = P.ms(w.ms), id = el.dataset.id, r = +el.value; if (r < 0) delete w.mapa[id]; else w.mapa[id] = r; w.incl[id] = wzCheck(w, m, id).ok; },
    wzIncl: function (el) { U.wiz.incl[el.dataset.id] = el.checked; },
    wzGuardar: function (el) { U.wiz.guardar = el.checked; },
    just: function (el) { if (P.indSubmetido(msAtual(), el.dataset.id)) { toast('Submitted. Reopen it to change it.', 'err'); return R(); } P.item(el.dataset.id, P.chave(msAtual())).justificacao = el.value; P.guardar(); },
    qual: function (el) { if (P.indSubmetido(msAtual(), el.dataset.id)) { toast('Submitted. Reopen it to change it.', 'err'); return R(); } var it = P.item(el.dataset.id, P.chave(msAtual())); it.qualidade = el.value; if (el.value !== 'estimado') it.metodo = ''; P.guardar(); },
    metodo: function (el) { if (P.indSubmetido(msAtual(), el.dataset.id)) { toast('Submitted. Reopen it to change it.', 'err'); return R(); } P.item(el.dataset.id, P.chave(msAtual())).metodo = el.value; P.guardar(); },
    tiposUn: function (el) { U.tiposF = U.tiposF || {}; U.tiposF.un = el.value; },
    tiposQ: function (el) { U.tiposF = U.tiposF || {}; U.tiposF.q = el.value; },
    tiposArq: function (el) { U.tiposF = U.tiposF || {}; U.tiposF.arq = el.checked; },
    tipoCampo: function (el) { U.tipoEd[el.dataset.id] = el.value; },
    tipoObr: function (el) { U.tipoEd.obrigatorio = el.checked; },
    tipoFmt: function (el) { var t = U.tipoEd, f = el.dataset.id; t.formatos = t.formatos.filter(function (x) { return x !== f; }); if (el.checked) t.formatos.push(f); },
    tipoCol: function (el) { var t = U.tipoEd, k = el.dataset.id; t.colunas = (t.colunas || []).filter(function (x) { return x !== k; }); if (el.checked) t.colunas.push(k); },
    lancPer: function (el) { var L = lancEstado(), v = el.dataset.id; L.periodos = L.periodos.filter(function (x) { return x !== v; }); if (el.checked) L.periodos.push(v); L.indicadores = {}; },
    lancUnSel: function (el) { var L = lancEstado(), v = el.dataset.id; L.unidades = L.unidades.filter(function (x) { return x !== v; }); if (el.checked) { L.unidades.push(v); L.aberto = v; } },
    lancTipo: function (el) { var L = lancEstado(), x = el.dataset.id.split('|'), un = x[0]; var cur = L.tipos[un] || (S.tipos || []).filter(function (t) { return t.ativo && t.unidade === un; }).map(function (t) { return t.id; }); cur = cur.filter(function (i) { return i !== x[1]; }); if (el.checked) cur.push(x[1]); L.tipos[un] = cur; },
    lancAdd: function (el) {
      var L = lancEstado(), un = el.dataset.id, id = el.value, sug = {};
      if (!id) return;
      L.periodos.forEach(function (pid) { P.indicadoresSugeridos(un, pid).forEach(function (x) { sug[x] = 1; }); });
      L.extra = L.extra || {}; L.extra[un] = (L.extra[un] || []).concat([id]);
      var cur = L.indicadores[un] || Object.keys(sug); if (cur.indexOf(id) < 0) cur = cur.concat([id]); L.indicadores[un] = cur;
      toast(id + ' added to the task of ' + un + '.', 'ok'); R();
    },
    lancInd: function (el) { var L = lancEstado(), x = el.dataset.id.split('|'), un = x[0], sug = {}; L.periodos.forEach(function (pid) { P.indicadoresSugeridos(un, pid).forEach(function (id) { sug[id] = 1; }); }); var cur = L.indicadores[un] || Object.keys(sug); cur = cur.filter(function (i) { return i !== x[1]; }); if (el.checked) cur.push(x[1]); L.indicadores[un] = cur; },
    lancAtrib: function (el) { var L = lancEstado(); L.atrib = L.atrib || {}; L.atrib[el.dataset.id] = el.value; },
    lancEmp: function (el) { lancEstado().empresa = el.value; },
    lancPrazo: function (el) { lancEstado().prazo = el.value; },
    lancData: function (el) { lancEstado().data = el.value; },
    perFecho: function (el) { var p = P.periodo(el.dataset.id); if (p && el.value) { p.fecho = el.value; P.guardar(); } },
    relData: function (el) { var r = (S.relatorios || []).filter(function (x) { return x.id === el.dataset.id; })[0]; if (r && el.value) { r.data = el.value; P.guardar(); } },
    msDepF: function (el) { U.msFiltro.dep = el.value; },
    msPerF: function (el) { U.msFiltro.periodo = el.value; },
    msMinhas: function (el) { U.msFiltro.minhas = el.checked; },
    msAtrib: function (el) { var m = el.dataset.id ? P.ms(el.dataset.id) : msAtual(), r = P.atribuir(m, el.value, u()); if (r.erro) toast(r.erro, 'err'); },
    expSel: function (el) { var x = estadoExp(msAtual()); if (el.checked) { if (x.sel.indexOf(el.dataset.id) < 0) x.sel.push(el.dataset.id); } else x.sel = x.sel.filter(function (i) { return i !== el.dataset.id; }); },
    expBusca: function (el) { estadoExp(msAtual()).q = el.value; },
    msEmpresa: function (el) { var m = el.dataset.id ? P.ms(el.dataset.id) : msAtual(); m.empresa = el.value; P.evento(m, 'Company changed to ' + el.value + '.', u().nome); P.guardar(); },
    msTagAdd: function (el) { if (!el.value) return; var m = msAtual(); m.departamentos.push(el.value); P.evento(m, 'Department tag added: ' + el.value + '.', u().nome); P.guardar(); },
    msEstado: function (el) { U.msFiltro.estado = el.value; },
    msEsrs: function (el) { U.msFiltro.esrs = el.checked; },
    consEsrs: function (el) { U.consEsrs = el.checked; },
    histInd: function (el) { U.histInd = el.value; R(); },
    histTema: function (el) { U.histTema = el.value; R(); },
    indBusca: function (el) { U.indBusca = el.value; },
    regraBusca: function (el) { U.regraBusca = el.value; },
    momBusca: function (el) { U.momBusca = el.value; },
    atrMsSel: function (el) { U.atrSel = el.value; },
    atrBusca: function (el) { U.atrBusca = el.value; },
    ajInd: function (el) { var a = U.ajuda; a.ind = el.value; if (!a.editada) a.msg = msgAjuda(msAtual(), a.ind, a.sel); },
    ajSel: function (el) { var a = U.ajuda; a.sel = el.value; if (!a.editada) a.msg = msgAjuda(msAtual(), a.ind, a.sel); },
    ajPrazo: function (el) { U.ajuda.prazo = el.value; },
    indFreq: function (el) {
      var r = P.mudarFrequencia(el.dataset.id, el.value, u());
      if (r.erro) return toast(r.erro, 'err');
      toast('Frequency saved. New tasks follow it' + (r.abertas.length ? '; ' + r.abertas.length + ' open task(s) keep it as assigned: ' + r.abertas.slice(0, 3).map(function (m) { return m.nome; }).join(', ') + (r.abertas.length > 3 ? '…' : '') : '') + '.', 'ok');
    },
    momento: function (el) {
      var x = el.dataset.id.split('|'), r = P.definirMomento(x[0], x[1], x[2], el.checked, u());
      if (r.erro) { el.checked = !el.checked; return toast(r.erro, 'err'); }
    },
    evObrig: function (el) { P.cat(el.dataset.id).evidencia_obrigatoria = el.checked; P.guardar(); },
    msPrazo: function (el) { if (el.value) { var m = P.ms(el.dataset.id); m.prazo = el.value; P.evento(m, 'Due date changed to ' + P.fmtData(el.value) + '.', u().nome); P.guardar(); } },
    momEmpF: function (el) { U.momEmp = el.value; },
    momEmpJuntar: function (el) { if (!el.value) return; var c = P.cat(el.dataset.id), ids = P.empresasInd(c).map(function (x) { return x.id; }); ids.push(el.value); mudarEmpresasInd(c, ids); },
    matAval: function (el) { S.mat.filter(function (x) { return x.norma === el.dataset.id; })[0].avaliacao = el.value; P.guardar(); },
    matJust: function (el) { S.mat.filter(function (x) { return x.norma === el.dataset.id; })[0].justificacao = el.value; P.guardar(); },
    userPerfil: function (el) {
      var x = P.user(el.dataset.id), novo = el.value, de = P.PERFIS[x.perfil];
      /* Quem reporta indicadores tem de continuar a poder reportar (data owner ou equipa de sustentabilidade) */
      var reporta = Object.keys(S.atrib || {}).filter(function (k) { return S.atrib[k].submete === x.login; }).length;
      if (reporta && ['resp', 'revisor', 'esg'].indexOf(novo) < 0) { toast(x.nome + ' reports ' + reporta + ' indicator(s). Change that in Backoffice, Indicators first.', 'err'); el.value = x.perfil; return; }
      if (novo === 'revisor' && !P.unidadesDe(x).length) { toast('Add a department first: the data reviewer approves what that department submits.', 'err'); el.value = x.perfil; return; }
      x.perfil = novo; P.eventoGlobal(x.nome + ': profile changed from ' + de + ' to ' + P.PERFIS[novo] + '.', u().nome);
      var chefias = novo === 'revisor' ? chefeDosDeps(x) : [];
      P.guardar(); toast(x.nome + ' is now ' + P.PERFIS[novo] + (chefias.length ? ' and area head of ' + chefias.join(', ') : '') + '.', 'ok'); R();
    },
    /* Responsavel de area de um departamento numa empresa, escolhido no pop-up Manage departments */
    depChefeEmp: function (el) {
      var p = el.dataset.id.split('|'), d = S.deps[+p[0]], y = S.ent.filter(function (z) { return z.id === p[1]; })[0];
      if (!d || !y || !P.gereTudo(u())) return;
      d.chefes = d.chefes || {};
      var antes = (d.chefes[y.id] || d.chefe) ? (P.user(d.chefes[y.id] || d.chefe) || {}).nome : 'nobody';
      if (el.value) d.chefes[y.id] = el.value; else { d.chefes[y.id] = ''; }
      P.eventoGlobal('Department ' + d.nome + ', ' + y.nome + ': area head changed from ' + antes + ' to ' + (el.value ? P.user(el.value).nome : 'nobody') + '.', u().nome, 'Change');
      P.guardar(); toast(d.nome + ', ' + y.nome + ': area head ' + (el.value ? P.user(el.value).nome : 'removed') + '.', 'ok'); R();
    },
    userUnJuntarEmp: function (el) {
      if (!el.value) return;
      var p2 = el.dataset.id.split('|'), x = P.user(p2[0]), y = S.ent.filter(function (z) { return z.id === p2[1]; })[0];
      if (!x || !y) return;
      P.definirUnidadesEmp(x, y.nome, P.unidadesDe(x, y.nome).concat([el.value]));
      if (x.perfil === 'revisor') chefeDosDeps(x);
      P.eventoGlobal(x.nome + ' added to ' + el.value + ' (' + y.nome + ').', u().nome); P.guardar(); R();
    },
    userEmpAdd: function (el) {
      if (!el.value) return;
      var x = P.user(el.dataset.id), y = S.ent.filter(function (z) { return z.id === el.value; })[0];
      if (!x || !y) return;
      var on = P.empresasUser(x).map(function (z) { return z.id; }); on.push(y.id);
      if (!x.unidadesEmp) P.definirUnidadesEmp(x, P.empresasUser(x)[0].nome, P.unidadesDe(x));
      x.empresas = on.length >= S.ent.length ? [] : on;
      x.unidadesEmp[y.id] = [];
      P.eventoGlobal(x.nome + ' added to ' + y.nome + '.', u().nome, 'Change'); P.guardar(); toast(x.nome + ' added to ' + y.nome + '. Add the business units there.', 'ok'); R();
    },
    userNome: function (el) {
      var x = P.user(el.dataset.id), r = x ? P.renomearUser(x, el.value, u().nome) : { erro: 'User not found.' };
      if (r.erro) { toast(r.erro, 'err'); el.value = x ? x.nome : ''; return; }
      if (r.antes) toast(r.antes + ' is now ' + x.nome + '.', 'ok');
      /* O campo ainda esta a perder o foco: redesenha a seguir, para nao mexer no elemento a meio do blur */
      setTimeout(R, 0);
    },
    userUnJuntar: function (el) { if (!el.value) return; if (el.dataset.id === '__novo') { U.userNovo.unidades.push(el.value); return; } var x = P.user(el.dataset.id); setTimeout(function () { if (x && x.perfil === 'revisor') { chefeDosDeps(x); P.guardar(); R(); } }, 0); P.definirUnidades(x, P.unidadesDe(x).concat([el.value])); P.eventoGlobal(x.nome + ' added to ' + el.value + '.', u().nome); P.guardar(); },
    userNovoC: function (el) { U.userNovo[el.dataset.f] = el.value; },
    userBusca: function (el) { U.userBusca = el.value; },
    boMsQ: function (el) { U.boMs.q = el.value; R(); },
    depChefe: function (el) {
      var d = S.deps[+el.dataset.id]; if (!d || !P.gereTudo(u())) return;
      var antes = d.chefe ? (P.user(d.chefe) || {}).nome : 'nobody'; d.chefe = el.value;
      P.eventoGlobal('Department ' + d.nome + ': area head changed from ' + antes + ' to ' + (d.chefe ? P.user(d.chefe).nome : 'nobody') + '.', u().nome, 'Change');
      P.guardar(); toast(d.nome + ': area head ' + (d.chefe ? P.user(d.chefe).nome : 'removed') + '.', 'ok'); R();
    },
    userEmpF: function (el) { U.userEmpF = el.value; R(); },
    userEmp: function (el) {
      var p = el.dataset.id.split('|'), x = p[0] === '__novo' ? U.userNovo : P.user(p[0]);
      if (!x) return;
      var on = P.empresasUser(x).map(function (y) { return y.id; }).filter(function (k) { return k !== p[1]; });
      if (el.checked) on.push(p[1]);
      if (!on.length) { toast('A person needs at least one company.', 'err'); R(); return; }
      x.empresas = on.length === S.ent.length ? [] : on;
      if (p[0] !== '__novo' && x.perfil === 'revisor') chefeDosDeps(x);
      if (p[0] !== '__novo') { P.eventoGlobal('User ' + x.nome + ': companies set to ' + P.empresasUser(x).map(function (y) { return y.nome; }).join(', ') + '.', u().nome, 'Change'); P.guardar(); }
      R();
    },
    tlEC: function (el) { U.tlEC[el.dataset.id] = el.value; },
    tlECFalta: function (el) { U.tlEC.falta = el.checked; },
    limiar: function (el) { var n = Number(el.value), c = P.cat(el.dataset.id); if (el.value !== '' && n >= 0) { c.limiar_variacao_pct = n; c.limiar_proprio = true; P.guardar(); } },
    janNome: function (el) { S.janelas[+el.dataset.id].nome = el.value; P.guardar(); },
    janTema: function (el) { S.janelas[+el.dataset.id].tema = el.value; P.guardar(); },
    janMeses: function (el) { var l = el.value.split(/[,;\s]+/).map(Number).filter(function (x) { return x >= 1 && x <= 12; }); if (l.length) { S.janelas[+el.dataset.id].meses = l; P.guardar(); } else toast('Enter months from 1 to 12.', 'err'); },
    janIni: function (el) { var n = +el.value; if (n >= 1 && n <= 31) { S.janelas[+el.dataset.id].dia_inicio = n; P.guardar(); } },
    janFim: function (el) { var n = +el.value; if (n >= 1 && n <= 31) { S.janelas[+el.dataset.id].dia_fim = n; P.guardar(); } },
    areaNome: function (el) { S.areas[+el.dataset.id].nome = el.value; P.guardar(); },
    areaUso: function (el) { S.areas[+el.dataset.id].uso = el.value; P.guardar(); },
    entNome: function (el) { var r = P.renomearEmpresa(S.ent[+el.dataset.id], el.value.trim()); if (r.erro) toast(r.erro, 'err'); },
    depFEmp: function (el) { U.depF.emp = el.value; },
    depEmpJuntar: function (el) { if (!el.value) return; var dep = S.deps[+el.dataset.id]; dep.empresas = (dep.empresas || []).concat([el.value]); P.eventoGlobal('Department ' + dep.nome + ': companies set to ' + P.empresasDoDep(dep).map(function (x) { return x.nome; }).join(', ') + '.', u().nome); P.guardar(); },
    depNome: function (el) { var r = P.renomearDepartamento(S.deps[+el.dataset.id], el.value.trim()); if (r.erro) toast(r.erro, 'err'); },
    entGrupo: function (el) { S.ent[+el.dataset.id].perimetro_grupo = el.checked; P.guardar(); },
    entMaior: function (el) { S.ent[+el.dataset.id].perimetro_maioritario = el.checked; P.guardar(); },
    wfNome: function (el) { U.wfDraft[+el.dataset.id].nome = el.value; },
    wfResp: function (el) { U.wfDraft[+el.dataset.id].responsavel = el.value; },
    wfTipo: function (el) { var p = U.wfDraft[+el.dataset.id]; p.tipo = el.value; if (el.value === 'area') p.responsavel = 'chefe'; else if (el.value !== 'parecer' && p.responsavel.indexOf('area:') === 0) p.responsavel = 'esg'; },
    mcLogo: function (el) {
      var v = el.value.trim();
      if (!P.urlLogoValida(v)) { U.logoEstado = 'The link must start with http:// or https://.'; return; }
      U.marca.logotipo = v; U.logoEstado = v ? 'Loading the image.' : '';
    },
    mcNome: function (el) { U.marca.nome = el.value; },
    mcSub: function (el) { U.marca.subtitulo = el.value; },
    mcCorT: function (el) { if (/^#[0-9a-fA-F]{6}$/.test(el.value)) { U.marca.cores[el.dataset.id] = el.value; P.aplicarMarca(U.marca); } else toast('Use a colour in #RRGGBB format.', 'err'); }
  };
  var Live = {
    /* Pesquisa de pessoas no pop-up de atribuicao: filtra enquanto se escreve */
    atrBuscaLive: function (el) { U.atrBusca = el.value; R(); },
    ajBuscaLive: function (el) { U.ajuda.q = el.value; R(); },
    ajMsgLive: function (el) { U.ajuda.msg = el.value; U.ajuda.editada = true; },
    ficNome: function (el) {
      var lb = el.closest('.ps-fic'), n = lb && lb.querySelector('.ps-fic-nome'), f = el.files && el.files[0];
      if (!n) return;
      n.textContent = f ? f.name : 'No file chosen';
      lb.classList.toggle('tem', !!f);
    },
    mcCor: function (el) { U.marca.cores[el.dataset.id] = el.value; var t = document.getElementById('cor-t-' + el.dataset.id); if (t) t.value = el.value; mudouMarca(); }
  };

  /* Renderiza depois do clique: se o rato estiver em baixo, o botao tem de sobreviver ate ao click */
  var ptr = false, pend = false, tmr = null;
  var agendar = function () {
    if (ptr) { pend = true; return; }
    clearTimeout(tmr);
    tmr = setTimeout(R, 0);
  };
  var fimPtr = function () { ptr = false; if (pend) { pend = false; clearTimeout(tmr); tmr = setTimeout(R, 60); } };

  /* --- Tooltip ----------------------------------------------------------- */
  var tip = null;
  var mostrarTip = function (ev2) {
    var t = ev2.target.closest && ev2.target.closest('[data-tip]');
    if (!t) { if (tip) tip.hidden = true; return; }
    if (!tip) { tip = document.createElement('div'); tip.className = 'ps-tip'; tip.style.position = 'fixed'; document.body.appendChild(tip); }
    var tit = t.getAttribute('data-tip-t');
    tip.textContent = '';
    if (tit) {
      var h = document.createElement('b'), f = document.createElement('code');
      h.textContent = tit; f.textContent = t.getAttribute('data-tip');
      tip.appendChild(h); tip.appendChild(f);
    } else tip.textContent = t.getAttribute('data-tip');
    tip.classList.toggle('form', !!tit);
    tip.classList.toggle('longo', !!tit || tip.textContent.length > 60 || tip.textContent.indexOf('\n') > -1);
    tip.classList.toggle('linhas', tip.textContent.indexOf('\n') > -1);
    tip.hidden = false;
    var r = t.getBoundingClientRect();
    var meia = tip.classList.contains('longo') ? 160 : 70;
    tip.style.left = Math.max(meia, Math.min(window.innerWidth - meia, r.left + r.width / 2)) + 'px';
    tip.style.top = (t.tagName === 'rect' ? r.top + 24 : r.top - 4) + 'px';
  };

  /* --- Arranque ---------------------------------------------------------- */
  P.iniciar = function () {
    P.carregar();
    P.aplicarMarca();
    if (window.PortalGrelha) window.PortalGrelha.instalar();
    document.addEventListener('click', function (ev2) {
      var t = ev2.target.closest('[data-a]');
      if (U.menu && !ev2.target.closest('[data-menu]') && !(t && /^menu/.test(t.getAttribute('data-a')))) { U.menu = null; R(); }
      if (t) {
        var fn = A[t.getAttribute('data-a')];
        if (t.tagName !== 'A' ) ev2.preventDefault();
        if (fn) fn(t.dataset, t);
      }
    });
    document.addEventListener('change', function (ev2) {
      var t = ev2.target.closest('[data-c]');
      if (t && C[t.getAttribute('data-c')]) { C[t.getAttribute('data-c')](t); agendar(); }
    });
    document.addEventListener('input', function (ev2) {
      var t = ev2.target.closest('[data-i]');
      if (t && Live[t.getAttribute('data-i')]) Live[t.getAttribute('data-i')](t);
    });
    document.addEventListener('pointerdown', function () { ptr = true; }, true);
    document.addEventListener('pointerup', fimPtr, true);
    document.addEventListener('pointercancel', fimPtr, true);
    document.addEventListener('keydown', function (ev2) {
      if (ev2.key === 'Escape') { if (U.painel) fechaPainel(); else if (U.menu) { U.menu = null; R(); } }
      /* Contagens: a virgula e o ponto nao entram, o valor e sempre inteiro */
      if ((ev2.key === ',' || ev2.key === '.') && ev2.target.closest && ev2.target.closest('[data-int]')) { ev2.preventDefault(); toast('Whole numbers only for this indicator.', 'err'); }
    });
    /* Area de ficheiros: largar ficheiros em cima junta-os a lista para escolher a categoria */
    var zonaDe = function (ev2) { return ev2.target.closest && ev2.target.closest('[data-dz],[data-dzx]'); };
    document.addEventListener('dragover', function (ev2) { var z = zonaDe(ev2); if (!z) return; ev2.preventDefault(); ev2.dataTransfer.dropEffect = 'copy'; z.classList.add('sobre'); });
    document.addEventListener('dragleave', function (ev2) { var z = zonaDe(ev2); if (z && !z.contains(ev2.relatedTarget)) z.classList.remove('sobre'); });
    document.addEventListener('drop', function (ev2) {
      var z = zonaDe(ev2);
      if (!z) return;
      ev2.preventDefault(); z.classList.remove('sobre');
      var m = P.ms(z.getAttribute('data-dz') || z.getAttribute('data-dzx')), fs = ev2.dataTransfer.files;
      if (!m) return;
      /* No ecra ou no assistente, um Excel abre a importacao; qualquer outro ficheiro vai para o separador de upload */
      if (z.hasAttribute('data-dzx')) {
        var xl = fs.length === 1 && ['xlsx', 'xls', 'csv'].indexOf(extDe(fs[0].name)) > -1;
        if (xl) return U.wiz && U.painel && U.painel.tipo === 'importar' ? wzLer(fs[0]) : wzAbrir(m, fs[0]);
        if (U.painel && U.painel.tipo === 'importar') { U.wiz.erro = 'Drop one Excel file (.xlsx, .xls or .csv).'; return R(); }
      }
      /* Largado em cima de uma linha: entrega logo nesse pedido, sem escolher categoria */
      if (z.hasAttribute('data-dzf')) return entregarLargados(m, z.getAttribute('data-dzf'), fs);
      juntarFila(m, fs);
    });
    document.addEventListener('mouseover', mostrarTip);
    document.addEventListener('focusin', mostrarTip);
    /* Se o link do logotipo falhar, mostra-se o nome e nunca uma imagem partida */
    document.addEventListener('error', function (ev2) {
      var t = ev2.target;
      if (!t || t.tagName !== 'IMG') return;
      if (t.hasAttribute('data-logo')) {
        var chipLogo = t.closest('.ps-logo-chip');
        if (chipLogo) chipLogo.remove();
        else { var s = document.createElement('span'); s.className = 'ps-marca-mono'; s.setAttribute('aria-hidden', 'true'); s.textContent = sigla(nomeMarca()); t.replaceWith(s); }
      } else if (t.hasAttribute('data-logo-prev')) {
        U.logoEstado = 'The image at this link could not be loaded. Check that the link opens the image directly.';
        var el = document.getElementById('logo-estado'); if (el) el.textContent = U.logoEstado;
        var c = document.querySelector('[data-campo="logo-prev"]'); if (c) c.textContent = 'Image unavailable';
      } else if (t.hasAttribute('data-logo-mini')) { t.remove(); }
    }, true);
    document.addEventListener('load', function (ev2) {
      var t = ev2.target;
      if (t && t.tagName === 'IMG' && t.hasAttribute('data-logo-prev')) {
        U.logoEstado = 'Image loaded. Once saved, this logo appears across the whole platform.';
        var el = document.getElementById('logo-estado'); if (el) el.textContent = U.logoEstado;
      }
    }, true);
    window.addEventListener('hashchange', navegar);
    if (P.online()) return arrancarOnline();
    /* Entrada direta: sem ecra de entrada, abre logo com o perfil indicado. "Trocar de perfil" continua a mostrar a lista. */
    var direto = window.PORTAL_ENTRADA_DIRETA;
    if (direto && !P.sessao() && P.user(direto)) P.entrar(direto);
    navegar();
  };

  /* --- Online: login e dados do Supabase --------------------------------- */
  var arrancarOnline = function () {
    var B = window.PortalBackend;
    var txtPerfis = document.querySelector('.ps-ent-dir > h2');
    if (txtPerfis) txtPerfis.textContent = 'Sign in';
    var notaPerfis = document.querySelector('.ps-ent-dir > p');
    if (notaPerfis) notaPerfis.textContent = 'Use your account details.';
    B.aoFalhar = function (x) {
      toast('Could not save: ' + x.message + ' Showing the data from the database again.', 'err');
      return B.carregar(S).then(function () { P.aplicarMarca(); R(); });
    };
    var aposLogin = function () {
      return B.carregar(S).then(function (login) {
        if (!login) { B.sair(); P.estadoVazio(); throw new Error('This account has no profile yet. Contact the administrator.'); }
        P.entrar(login);
        P.aplicarMarca();
        var usr = P.user(login);
        if ((location.hash || '').replace(/^#\/?/, '')) navegar(); else P.irPara(usr.perfil === 'ext' ? 'Pedidos' : 'Inicio');
      });
    };
    document.addEventListener('submit', function (ev2) {
      if (!ev2.target.matches('[data-login]')) return;
      ev2.preventDefault();
      U.aEntrar = true; U.loginErro = '';
      var email = val('lg-email').trim(), senha = val('lg-senha');
      R();
      B.entrar(email, senha).then(aposLogin).catch(function (x) {
        U.loginErro = x.codigo === 'invalid_credentials' ? 'Incorrect email or password.' : x.message;
      }).then(function () {
        U.aEntrar = false;
        if (!P.sessao()) { R(); var c = document.getElementById('lg-email'); if (c) c.value = email; }
      });
    });
    B.carregarMarca().then(function (mc) { if (mc) { S.marca = mc; P.aplicarMarca(); } if (!B.temSessao()) navegar(); });
    if (B.temSessao()) {
      aposLogin().catch(function (x) { B.sair(); P.sair(); U.loginErro = x.message; navegar(); });
    } else {
      P.sair();
    }
  };
  /* As paginas de controlo (portal-gestao.js) acrescentam-se aqui */
  P.ext = { aplicarDados: function (m, l, o) { return aplicarDados(m, l, o); }, estadoTarefa: estadoTarefa, ctaPasso: ctaPasso, pendentesDe: pendentesDe, abertas: abertas, tagPer: tagPer, bruNum: bruNum, botaoTl: botaoTl, Live: Live, Blocos2: Blocos, B: B, linkFicha: linkFicha, PERIODO_TXT: PERIODO_TXT, fechaPainel: function () { fechaPainel(); }, pessHtml: pessHtml, depHtml: depHtml, empHtml: empHtml, avPessoa: avPessoa, avEquipa: avEquipa, avEmpresa: avEmpresa, msAtual: function () { return msAtual(); }, Pn: Pn, abrePainel: function (t, a) { abrePainel(t, a); }, Blocos: Blocos, A: A, C: C, U: U, e: e, svg: svg, I: I, rota: rota, chip: chip, estChip: estChip, cabCartao: cabCartao, vazio: vazio, opt: opt, campo: campo, ficheiroHtml: ficheiroHtml, numAttr: numAttr, infoFormula: infoFormula, tabela: tabela, toast: toast, R: R, val: val, res: res, escolherFicheiro: escolherFicheiro, atribHtml: atribHtml, iniciais: iniciais, u: u, fmtV: fmtV, prazoTxt: prazoTxt };
  /* Antes de arrancar, o ambiente de testes partilhado traz o estado do Supabase (portal-partilha.js) */
  document.addEventListener('DOMContentLoaded', function () {
    var depois = function () { P.iniciar(); if (P.depoisIniciar) P.depoisIniciar(); };
    (P.antesIniciar ? P.antesIniciar() : Promise.resolve()).then(depois, depois);
  });
})();
