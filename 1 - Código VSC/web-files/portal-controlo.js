/* ============================================================================
   portal-controlo.js - regras de controlo, sem desenho
   Perimetro de consolidacao, regras de introducao por empresa, atribuicao de KPIs
   com segregacao de funcoes, fatores de emissao e registo selado com hash.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S;
  var agora = function () { return new Date().toISOString(); };

  /* --- SHA-256 sincrono: o selo do registo calcula-se a cada gravacao --------- */
  var K = [];
  (function () {
    var n = 2, c = 0;
    var primo = function (x) { for (var d = 2; d * d <= x; d++) if (x % d === 0) return false; return true; };
    while (c < 64) { if (primo(n)) { K[c] = Math.floor((Math.pow(n, 1 / 3) % 1) * 4294967296); c++; } n++; }
  })();
  var sha256 = (P.sha256 = function (txt) {
    var bytes = new TextEncoder().encode(txt), l = bytes.length, total = ((l + 9 + 63) >> 6) << 6, b = new Uint8Array(total);
    b.set(bytes); b[l] = 0x80;
    var dv = new DataView(b.buffer);
    dv.setUint32(total - 8, Math.floor((l * 8) / 4294967296)); dv.setUint32(total - 4, (l * 8) >>> 0);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64);
    var rr = function (x, n) { return (x >>> n) | (x << (32 - n)); };
    for (var o = 0; o < total; o += 64) {
      var t;
      for (t = 0; t < 16; t++) w[t] = dv.getUint32(o + t * 4);
      for (t = 16; t < 64; t++) {
        var s0 = rr(w[t - 15], 7) ^ rr(w[t - 15], 18) ^ (w[t - 15] >>> 3), s1 = rr(w[t - 2], 17) ^ rr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      var v = H.slice();
      for (t = 0; t < 64; t++) {
        var t1 = (v[7] + (rr(v[4], 6) ^ rr(v[4], 11) ^ rr(v[4], 25)) + ((v[4] & v[5]) ^ (~v[4] & v[6])) + K[t] + w[t]) | 0;
        var t2 = ((rr(v[0], 2) ^ rr(v[0], 13) ^ rr(v[0], 22)) + ((v[0] & v[1]) ^ (v[0] & v[2]) ^ (v[1] & v[2]))) | 0;
        v[7] = v[6]; v[6] = v[5]; v[5] = v[4]; v[4] = (v[3] + t1) | 0; v[3] = v[2]; v[2] = v[1]; v[1] = v[0]; v[0] = (t1 + t2) | 0;
      }
      for (t = 0; t < 8; t++) H[t] = (H[t] + v[t]) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  });

  /* --- Dados iniciais ---------------------------------------------------------- */
  /* [pais, detencao, metodo, instalacoes, NACE, incluida] */
  var PERIMETRO = {
    'Sede do grupo': ['Portugal', 100, 'mae', 1, '70.10', true], 'Serviços ambientais': ['Portugal', 100, 'integral', 3, '38.11', true], 'Concessão Vale': ['Portugal', 100, 'integral', 4, '36.00', true],
    'Concessão Rio': ['Portugal', 50, 'proporcional', 3, '36.00', true], 'Concessão Litoral Centro': ['Portugal', 100, 'integral', 2, '36.00', true], 'Concessão Planalto': ['Portugal', 100, 'integral', 2, '36.00', true],
    'Laboratório central': ['Portugal', 100, 'integral', 1, '71.20', true], 'Manutenção industrial': ['Portugal', 100, 'integral', 2, '33.20', true], 'Serviços urbanos': ['Portugal', 80, 'integral', 5, '38.11', true],
    'Tratamento de efluentes': ['Portugal', 100, 'integral', 3, '37.00', true], 'Concessão Costa': ['Portugal', 49, 'proporcional', 2, '36.00', true], 'Concessão Norte': ['Portugal', 49, 'proporcional', 2, '36.00', true],
    'Concessão Sul': ['Portugal', 33, 'equivalencia', 1, '36.00', false], 'Concessão Foz': ['Portugal', 49, 'proporcional', 1, '36.00', true], 'Concessão Serra': ['Portugal', 30, 'equivalencia', 1, '36.00', false], 'Agrupamento Algarve': ['Portugal', 49, 'proporcional', 2, '36.00', true]
  };
  P.METODOS = { mae: 'Parent company', integral: 'Full', proporcional: 'Proportional', equivalencia: 'Equity method' };
  P.AGREGACOES = { soma: 'Sum', media: 'Weighted average', ultimo: 'Latest value' };

  /* Liga cada indicador aos datapoints ESRS. O requisito mostrado passa a ser o da lista de 2026. */
  P.esrsDe = function (id) { var D = window.PORTAL_ESRS; return (D && D.kpi[id]) || { rel: 'especifico', dps: [], sub: '', agreg: '', desc: '', nota: '', dr: '' }; };
  P.garantirEsrs = function () {
    if (!S.kpim) S.kpim = {};
    if (!S.dpdec) S.dpdec = {};
    if (!S.gloss) S.gloss = {};
    if (!S.puxados) S.puxados = {};
    (S.cat || []).forEach(function (c) { var k = P.esrsDe(c.id); c.esrs_requisito = k.dr || c.esrs || 'Setorial'; });
    if (P.garantirQuadros) P.garantirQuadros();
  };
  P.semearControlo = function () {
    S.kpim = S.dpdec = S.gloss = S.rq = S.doc = null; S.puxados = {};
    P.garantirEsrs();
    S.ent.forEach(function (x) {
      var d = PERIMETRO[x.nome] || ['Portugal', 100, 'integral', 1, '', true];
      x.pais = d[0]; x.detencao = d[1]; x.metodo = d[2]; x.instalacoes = d[3]; x.nace = d[4]; x.nipc = ''; x.moeda = 'EUR'; x.perimetro_grupo = d[5];
      if (d[1] <= 50) x.perimetro_maioritario = false;
    });
    /* Quem submete, quem reve e quem valida: por omissao a pessoa do departamento, um revisor de outra area e a equipa */
    var resp = S.users.filter(function (x) { return x.perfil === 'resp'; });
    S.atrib = {};
    S.cat.forEach(function (c) {
      var i = -1; resp.forEach(function (x, k) { if (x.unidade === c.unidade_negocio) i = k; });
      S.atrib[c.id] = { submete: i > -1 ? resp[i].login : 'esg', reve: i > -1 ? resp[(i + 1) % resp.length].login : 'financeira', valida: i > -1 ? 'esg' : 'admin' };
    });
    S.regrasEnt = {};
    var multi = { E01: 'Instalação e contador', E04: 'Instalação', W01: 'Veículo ou cartão', A01: 'Sistema de abastecimento', N03: 'Guia de resíduos', R04: 'ETAR' };
    S.ent.forEach(function (x) {
      S.regrasEnt[x.id] = {};
      Object.keys(multi).forEach(function (k) { S.regrasEnt[x.id][k] = { multi: true, por: multi[k], agreg: 'soma' }; });
    });
    /* Fatores ilustrativos: confirmar antes de usar em reporte */
    S.fatores = [
      { id: 'gas', nome: 'Gás natural (caldeiras)', unidade: 'm³', fator: 2.02, unidade_fator: 'kgCO2e/m³', versao: 2026, qtd: 920000, origem: 'Excel', historico: [] },
      { id: 'gasoleo', nome: 'Gasóleo (frota própria)', unidade: 'L', fator: 2.66, unidade_fator: 'kgCO2e/L', versao: 2026, qtd: 420000, origem: 'Faturas', historico: [] },
      { id: 'r410a', nome: 'Fugas de refrigerante R-410A', unidade: 'kg', fator: 2088, unidade_fator: 'GWP', versao: 2026, qtd: 52, origem: 'Manual', historico: [] }
    ];
    /* Ligacoes: ficam configuradas, nenhuma esta a sincronizar */
    S.apis = [
      { id: 'api1', nome: 'Sistema financeiro', ambito: 'Energia e combustíveis', frequencia: 'Daily', estado: 'pendente' },
      { id: 'api2', nome: 'Sistema de RH', ambito: 'Efetivos, formação e rotatividade', frequencia: 'Daily', estado: 'pendente' },
      { id: 'api3', nome: 'Telemetria', ambito: 'Volumes de água e leituras de contador', frequencia: 'Hourly', estado: 'pendente' },
      { id: 'api4', nome: 'Laboratório (LIMS)', ambito: 'Análises de água e cargas das ETAR', frequencia: 'Daily', estado: 'pendente' },
      { id: 'api5', nome: 'Sistema comercial (CRM)', ambito: 'Faturação, clientes e reclamações', frequencia: 'Daily', estado: 'pendente' },
      { id: 'api6', nome: 'Gestão ambiental', ambito: 'Lamas, resíduos, emissões e biodiversidade', frequencia: 'Monthly', estado: 'pendente' }
    ];
    S.evg = [];
    S.selos = [];
    P.selar();
  };

  /* --- Perimetro e consolidacao -------------------------------------------------- */
  P.entidadePorNome = function (nome) { return S.ent.filter(function (x) { return x.nome === nome; })[0] || null; };
  P.pesoConsolidacao = function (x) {
    if (!x || !x.perimetro_grupo) return 0;
    if (x.metodo === 'equivalencia') return 0;
    if (x.metodo === 'proporcional') return (Number(x.detencao) || 0) / 100;
    return 1;
  };
  /* Rácios e percentagens nao se ponderam: so o que se pode somar entra pela percentagem detida */
  var ADITIVAS = ['n.º', 'Mm³', 'MWh', 'kgCO2e', 'tCO2e', 't', 'kg', '€', 'milhares'];
  P.valorConsolidado = function (id, empresa) {
    var c = P.cat(id), it = P.item(id), m = P.msDoIndicador(id);
    if (!c || !it || !m || it.valor === null) return { valor: null, peso: null, m: m };
    if (empresa) return { valor: m.empresa === empresa ? it.valor : null, peso: 1, m: m, fora: m.empresa !== empresa };
    var peso = P.pesoConsolidacao(P.entidadePorNome(m.empresa));
    return ADITIVAS.indexOf(c.unidade_medida) > -1 ? { valor: it.valor * peso, peso: peso, m: m } : { valor: peso ? it.valor : null, peso: peso, m: m, racio: true };
  };
  P.alterarEntidade = function (x, campo, valor, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    if (campo === 'detencao') {
      var n = P.lerNumero(valor);
      if (n === null || n < 0 || n > 100) return { erro: 'Ownership must be between 0 and 100.' };
      valor = n;
    }
    if (campo === 'metodo' && P.METODOS[valor] === undefined) return { erro: 'Unknown consolidation method.' };
    var ant = x[campo];
    if (ant === valor) return { ok: true };
    x[campo] = valor;
    P.eventoGlobal('Perimeter: ' + x.nome + ', ' + campo + ' changed from ' + ant + ' to ' + valor + '.', u.nome, 'Change');
    P.guardar();
    return { ok: true };
  };

  /* --- Regras de introducao por empresa e KPI ------------------------------------ */
  P.regraEnt = function (empresaNome, id) {
    var x = P.entidadePorNome(empresaNome), r = x && S.regrasEnt && S.regrasEnt[x.id] && S.regrasEnt[x.id][id];
    return r || { multi: false, por: '', agreg: 'soma' };
  };
  P.alterarRegraEnt = function (x, id, campo, valor, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    S.regrasEnt[x.id] = S.regrasEnt[x.id] || {};
    var r = S.regrasEnt[x.id][id] || (S.regrasEnt[x.id][id] = { multi: false, por: '', agreg: 'soma' });
    r[campo] = valor;
    P.guardar();
    return { ok: true };
  };
  /* Devolve null se nao houver nenhuma entrada valida */
  P.agregar = function (linhas, regra) {
    var v = linhas.map(function (l) { return { n: P.lerNumero(l.valor), w: P.lerNumero(l.peso) }; }).filter(function (x) { return x.n !== null; });
    if (!v.length) return null;
    if (regra === 'ultimo') return v[v.length - 1].n;
    if (regra === 'media') {
      var sw = v.reduce(function (a, x) { return a + (x.w || 0); }, 0);
      return sw ? v.reduce(function (a, x) { return a + x.n * (x.w || 0); }, 0) / sw : null;
    }
    return v.reduce(function (a, x) { return a + x.n; }, 0);
  };
  P.gravarEntradas = function (m, id, linhas, regra, u) {
    var it = P.item(id, P.chave(m)), total = P.agregar(linhas, regra), c = P.cat(id);
    if (total === null) return { erro: regra === 'media' ? 'Enter at least one value with a weight.' : 'Enter at least one numeric value.' };
    it.entradas = linhas.map(function (l) { return { local: l.local, doc: l.doc, valor: l.valor, peso: l.peso }; });
    var arred = Number(total.toFixed(c.casas_decimais));
    it.rascunho = null;
    if (it.valor !== arred) { it.valor = arred; it.versoes.push({ valor: arred, em: agora(), por: u.nome, origem: 'manual: ' + linhas.length + ' entries', motivo: '' }); }
    P.guardar();
    return { ok: true, total: arred };
  };

  /* --- Atribuicao de KPIs e segregacao de funcoes ---------------------------------- */
  P.conflitoAtrib = function (a) { return !!a && (a.submete === a.reve || a.submete === a.valida); };
  P.conflitosAtrib = function (mapa) { return Object.keys(mapa).filter(function (k) { return P.conflitoAtrib(mapa[k]); }); };
  P.guardarAtrib = function (mapa, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var conf = P.conflitosAtrib(mapa);
    if (conf.length) return { erro: conf.length + ' KPI(s) with the same person submitting and approving: ' + conf.slice(0, 5).join(', ') + '.' };
    var mudou = Object.keys(mapa).filter(function (k) { return JSON.stringify(mapa[k]) !== JSON.stringify(S.atrib[k]); });
    S.atrib = JSON.parse(JSON.stringify(mapa));
    if (mudou.length) P.eventoGlobal('KPI assignment changed for ' + mudou.length + ' KPI(s): ' + mudou.slice(0, 8).join(', ') + '.', u.nome, 'Change');
    P.guardar();
    return { ok: true, mudou: mudou.length };
  };
  P.dono = function (id) { var a = S.atrib && S.atrib[id]; return a ? P.user(a.submete) : null; };
  /* Quem submeteu nao pode decidir sobre o que submeteu */
  P.violaSegregacao = function (m, u) {
    var r = m.passos.filter(function (p) { return p.tipo === 'recolha'; })[0];
    return !!r && !!r.concluido_por && !!u && r.concluido_por === u.nome;
  };

  /* --- Fatores de emissao ----------------------------------------------------------- */
  P.calcularFatores = function () {
    var linhas = S.fatores.map(function (f) { var q = Number(f.qtd) || 0; return { f: f, kg: q * f.fator }; });
    return { linhas: linhas, kg: linhas.reduce(function (a, l) { return a + l.kg; }, 0) };
  };
  P.alterarFator = function (f, bruto, versao, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var n = P.lerNumero(bruto);
    if (n === null || n < 0) return { erro: 'The factor must be a number that is not negative.' };
    if (n === f.fator) return { ok: true };
    f.historico.push({ fator: f.fator, versao: f.versao, ate: agora(), por: u.nome });
    var ant = f.fator;
    f.fator = n; f.versao = versao || f.versao;
    P.eventoGlobal('Emission factor of ' + f.nome + ' changed from ' + ant + ' to ' + n + ' ' + f.unidade_fator + '.', u.nome, 'Calculation');
    P.guardar();
    return { ok: true };
  };
  P.aplicarCalculo = function (u) {
    var m = P.msDoIndicador('E06'), it = P.item('E06');
    if (!m || !P.podePreencher(m, u)) return { erro: 'The Scope 1 milestone is not in collection with you, so the result cannot be written to it.' };
    var kg = Number(P.calcularFatores().kg.toFixed(P.cat('E06').casas_decimais));
    it.valor = kg; it.rascunho = null; it.qualidade = 'calculado';
    it.versoes.push({ valor: kg, em: agora(), por: u.nome, origem: 'calculation: ' + S.fatores.map(function (f) { return f.id + ' ' + f.fator + ' v' + f.versao; }).join(', '), motivo: '' });
    P.evento(m, 'Scope 1 calculated from the factor library: ' + P.fmtNum(kg, 0) + ' kgCO2e.', u.nome);
    P.guardar();
    return { ok: true };
  };

  /* --- Ligacoes -------------------------------------------------------------------- */
  P.novaLigacao = function (nome, ambito, freq, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    if (!String(nome || '').trim() || !String(ambito || '').trim()) return { erro: 'Enter the system and what it provides.' };
    S.apis.push({ id: 'api' + Date.now(), nome: nome.trim(), ambito: ambito.trim(), frequencia: freq, estado: 'pendente' });
    P.eventoGlobal('Connection added: ' + nome.trim() + '.', u.nome, 'Change');
    P.guardar();
    return { ok: true };
  };

  /* --- Registo: tudo o que aconteceu, numa linha de tempo so -------------------------- */
  P.eventoGlobal = function (texto, por, tipo) { S.evg.push({ texto: texto, em: agora(), por: por, tipo: tipo || 'Change' }); };
  var tipoEvento = function (t) {
    if (/^Returned/.test(t)) return 'Return';
    if (/approved|Favourable|Review completed|published/i.test(t)) return 'Approval';
    if (/^Step completed: (Revis|Aprova|Parecer|Publica)/.test(t)) return 'Approval';
    if (/^Step completed: |^Automatic validation|^Milestone submitted|^File delivered|^Evidence attached|^General document|^Auditor|^Indicator in the auditor/.test(t)) return 'Workflow';
    if (/calculated/.test(t)) return 'Calculation';
    if (/restated|changed|Assigned|tag added/i.test(t)) return 'Change';
    return 'Creation';
  };
  var origemVersao = function (o) {
    o = String(o || 'manual');
    if (/^file import|^paste|^grid/i.test(o)) return 'Excel';
    if (/^external/i.test(o)) return 'External';
    if (/^calculation/i.test(o)) return 'Calculation';
    if (/^restatement/i.test(o)) return 'Restatement';
    if (/^api/i.test(o)) return 'API';
    return 'Manual';
  };
  P.origemVersao = origemVersao;
  P.trilho = function () {
    var r = [];
    S.ms.forEach(function (m) {
      m.eventos.forEach(function (x, i) {
        /* O comentario de quem decidiu, no mesmo momento, e o motivo do evento */
        var com = (m.comentarios || []).filter(function (y) { return y.autor === x.por && !y.sistema && Math.abs(new Date(y.em) - new Date(x.em)) < 2000; })[0];
        r.push({ k: m.id + '|e|' + i, em: x.em, por: x.por, tipo: tipoEvento(x.texto), texto: x.texto, m: m, origem: x.por === 'System' ? 'Automatic' : 'Workflow', motivo: com ? com.texto : '' });
      });
      m.indicadores.forEach(function (id) {
        var it = S.items[P.chave(m) + ':' + id];
        if (!it) return;
        it.versoes.forEach(function (v, i) {
          var o = origemVersao(v.origem);
          r.push({ k: P.chave(m) + ':' + id + '|v|' + i, em: v.em, por: v.por, tipo: i ? 'Change' : o === 'Calculation' ? 'Calculation' : 'Creation', ind: id, m: m, antes: i ? it.versoes[i - 1].valor : null, depois: v.valor, origem: o, motivo: v.motivo || '', texto: v.origem || '' });
        });
      });
    });
    (S.evg || []).forEach(function (x, i) { r.push({ k: 'g|' + i, em: x.em, por: x.por, tipo: x.tipo, texto: x.texto, origem: 'Configuration', motivo: '' }); });
    return r;
  };
  /* So o que nao pode mudar entra no selo: mudar o nome de uma empresa nao parte a cadeia */
  var canonico = function (x) { return [x.k, x.em, x.por, x.texto || '', x.antes === undefined ? '' : x.antes, x.depois === undefined ? '' : x.depois, x.motivo || ''].join('\u001f'); };
  P.verificarSelos = function () {
    var mapa = {}, prev = '', quebra = null;
    P.trilho().forEach(function (x) { mapa[x.k] = x; });
    for (var i = 0; i < (S.selos || []).length; i++) {
      var s = S.selos[i], x = mapa[s.k];
      if (!x) { quebra = { k: s.k, motivo: 'The sealed event no longer exists.', pos: i + 1 }; break; }
      var h = sha256(prev + canonico(x));
      if (h !== s.h) { quebra = { k: s.k, motivo: 'The event no longer matches its seal.', pos: i + 1 }; break; }
      prev = h;
    }
    return { ok: !quebra, quebra: quebra, total: (S.selos || []).length };
  };
  /* Sela o que ainda nao tem selo, a seguir ao ultimo. Nao toca nos selos anteriores. */
  P.selar = function () {
    if (!S.selos) return;
    var tem = {}, prev = S.selos.length ? S.selos[S.selos.length - 1].h : '';
    S.selos.forEach(function (s) { tem[s.k] = 1; });
    P.trilho().filter(function (x) { return !tem[x.k]; }).sort(function (a, b) { return a.em < b.em ? -1 : a.em > b.em ? 1 : 0; }).forEach(function (x) {
      prev = sha256(prev + canonico(x));
      S.selos.push({ k: x.k, h: prev });
    });
  };
  P.seloDe = function (k) { var s = (S.selos || []).filter(function (x) { return x.k === k; })[0]; return s ? s.h : ''; };
  P.aoGuardar = function () { P.selar(); };

  /* --- Estado de reporte por KPI ------------------------------------------------------ */
  P.estadoKpi = function (id) {
    var m = P.msDoIndicador(id), it = P.item(id);
    if (!m || !it) return { cod: 'falta', txt: 'Missing', cls: 'warn', m: null };
    if (P.concluida(m)) return { cod: 'aprovado', txt: 'Approved', cls: 'ok', m: m };
    if (P.passoAtual(m).tipo !== 'recolha') return { cod: 'aprovacao', txt: 'In approval', cls: 'rev', m: m };
    if (it.valor === null) return P.diasAte(m.prazo) < 0 ? { cod: 'atraso', txt: 'Overdue', cls: 'err', m: m } : { cod: 'falta', txt: 'Missing', cls: 'warn', m: m };
    return P.diasAte(m.prazo) < 0 ? { cod: 'atraso', txt: 'Overdue', cls: 'err', m: m } : { cod: 'curso', txt: 'In progress', cls: 'info', m: m };
  };
  P.escreverFolhas = function (nome, folhas) {
    var wb = window.XLSX.utils.book_new();
    Object.keys(folhas).forEach(function (n) {
      var ws = folhas[n].length ? window.XLSX.utils.json_to_sheet(folhas[n]) : window.XLSX.utils.aoa_to_sheet([['No data']]);
      window.XLSX.utils.book_append_sheet(wb, ws, n.slice(0, 31));
    });
    window.XLSX.writeFile(wb, nome);
  };
})();
