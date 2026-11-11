/* ============================================================================
   portal-supabase.js - login e sincronizacao com o Supabase
   So atua quando a pagina define window.PORTAL_BACKEND. O portal continua a
   trabalhar com o estado em memoria (Portal.S). Cada gravacao compara esse estado
   com o ultimo conhecido e envia para as tabelas esg_ apenas o que mudou.
   As permissoes sao aplicadas na base de dados (002_esg_permissoes.sql).
   ============================================================================ */
(function () {
  'use strict';
  var B = (window.PortalBackend = {});
  var CONFIG_IND = ['ativo', 'empresas', 'reporta', 'unidade_reporte', 'desc_propria', 'subtema_proprio', 'dr_proprio', 'divulgacao_tipo', 'tipo_dado', 'criado_backoffice', 'limiar_proprio', 'resp_emp'];
  var CFG = window.PORTAL_BACKEND || null;
  B.ativo = !!CFG;
  B.configurar = function (c) { CFG = c; B.ativo = true; };

  /* --- Sessao ------------------------------------------------------------ */
  var CHAVE = 'esg_sessao_supabase';
  var sessao = null;
  var lerSessao = function () { try { return JSON.parse(sessionStorage.getItem(CHAVE)); } catch (e) { return null; } };
  var gravarSessao = function (s) {
    sessao = s;
    try { if (s) sessionStorage.setItem(CHAVE, JSON.stringify(s)); else sessionStorage.removeItem(CHAVE); } catch (e) { /* fica so em memoria */ }
  };
  var deToken = function (d) { return { token: d.access_token, renovar: d.refresh_token, expira: Date.now() + d.expires_in * 1000, uid: d.user.id }; };
  var pedirToken = function (tipo, corpo) {
    return fetch(CFG.url + '/auth/v1/token?grant_type=' + tipo, { method: 'POST', headers: { apikey: CFG.chave, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) { var e = new Error(d.msg || d.error_description || 'Authentication failed.'); e.codigo = d.error_code || ''; throw e; } return d; }); });
  };
  var tokenValido = function () {
    if (!sessao) return Promise.resolve(null);
    if (sessao.expira - Date.now() > 60000) return Promise.resolve(sessao.token);
    return pedirToken('refresh_token', { refresh_token: sessao.renovar }).then(function (d) { gravarSessao(deToken(d)); return sessao.token; });
  };
  B.entrar = function (conta, senha) {
    var email = conta.indexOf('@') > -1 ? conta : conta + '@' + (CFG.dominio || '');
    return pedirToken('password', { email: email, password: senha }).then(function (d) { gravarSessao(deToken(d)); });
  };
  B.sair = function () {
    var s = sessao;
    gravarSessao(null);
    snapshot = {};
    if (s) fetch(CFG.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: CFG.chave, Authorization: 'Bearer ' + s.token } }).catch(function () { /* a sessao local ja terminou */ });
  };
  B.temSessao = function () { return !!sessao; };

  /* --- REST -------------------------------------------------------------- */
  var pedir = function (caminho, op) {
    return tokenValido().then(function (t) {
      var h = Object.assign({ apikey: CFG.chave, Authorization: 'Bearer ' + (t || CFG.chave), 'Content-Type': 'application/json' }, (op && op.headers) || {});
      var chamar = function () { return fetch(CFG.url + '/rest/v1/' + caminho, Object.assign({}, op, { headers: h })); };
      /* Uma falha de rede repete-se uma vez, exceto nos inserts: nos registos de auditoria podia duplicar a linha */
      var metodo = (op && op.method) || 'GET';
      return chamar().catch(function (x) {
        if (metodo === 'POST') throw x;
        return new Promise(function (ok) { setTimeout(ok, 500); }).then(chamar);
      }).then(function (r) {
        if (r.ok) return r.status === 204 ? null : r.text().then(function (x) { return x ? JSON.parse(x) : null; });
        return r.json().catch(function () { return {}; }).then(function (d) { throw new Error(d.message || 'Error ' + r.status); });
      });
    });
  };
  var lerTabela = function (t, ordem) {
    var todas = [], passo = 1000;
    var pagina = function (de) {
      return pedir(t + '?select=*' + (ordem ? '&order=' + ordem : '') + '&limit=' + passo + '&offset=' + de).then(function (l) {
        todas = todas.concat(l);
        return l.length === passo ? pagina(de + passo) : todas;
      });
    };
    return pagina(0);
  };

  /* --- Mapa entre o estado e as tabelas ---------------------------------- */
  /* Ordem de escrita: primeiro as tabelas de que as outras dependem.
     pk: colunas da chave. So acrescentar: tabelas de registo, nunca se alteram. */
  var TABELAS = [
    { t: 'esg_ciclos', pk: ['ano'] }, { t: 'esg_utilizadores', pk: ['login'] }, { t: 'esg_indicadores', pk: ['id'] }, { t: 'esg_workflow_base', pk: ['ordem'] },
    { t: 'esg_entidades', pk: ['id'] }, { t: 'esg_departamentos', pk: ['id'] }, { t: 'esg_janelas', pk: ['id'] }, { t: 'esg_materialidade', pk: ['norma'] }, { t: 'esg_areas', pk: ['codigo'] }, { t: 'esg_marca', pk: ['id'] },
    { t: 'esg_periodos', pk: ['id'] }, { t: 'esg_relatorios', pk: ['id'] }, { t: 'esg_tipos_dados', pk: ['id'] }, { t: 'esg_metas', pk: ['indicador_id'] }, { t: 'esg_amostra', pk: ['ano', 'indicador_id'] }, { t: 'esg_documentos', pk: ['id'] }, { t: 'esg_milestones', pk: ['id'] },
    { t: 'esg_milestone_indicadores', pk: ['milestone_id', 'indicador_id'] }, { t: 'esg_passos_workflow', pk: ['id'] }, { t: 'esg_valores', pk: ['indicador_id', 'ano', 'periodo'] },
    { t: 'esg_valor_versoes', so: true }, { t: 'esg_evidencias', pk: ['id'] }, { t: 'esg_pedidos_externos', pk: ['id'] }, { t: 'esg_pedidos_auditor', pk: ['id'] },
    { t: 'esg_atribuicao', pk: ['indicador_id'] }, { t: 'esg_regras_entrada', pk: ['entidade_id', 'indicador_id'] }, { t: 'esg_fatores', pk: ['id'] }, { t: 'esg_ligacoes', pk: ['id'] },
    { t: 'esg_kpi_master', pk: ['indicador_id'] }, { t: 'esg_definicoes', pk: ['indicador_id'] }, { t: 'esg_saidas', so: true }, { t: 'esg_dp_decisoes', pk: ['datapoint_id'] }, { t: 'esg_glossario_empresa', pk: ['termo_n'] },
    { t: 'esg_report_valores', pk: ['linha_id'] }, { t: 'esg_report_documento', pk: ['id'] }, { t: 'esg_fontes_puxadas', pk: ['milestone_id'] },
    { t: 'esg_comentarios', so: true }, { t: 'esg_eventos', so: true }, { t: 'esg_registo_config', so: true }, { t: 'esg_selos', so: true }
  ];
  var nulo = function (v) { return v === '' || v === undefined ? null : v; };
  var unidadesDe = function (u) { return u.unidades && u.unidades.length ? u.unidades : u.unidade ? [u.unidade] : []; };

  /* Do estado para linhas: { tabela: { chave: linha } } */
  var linhas = (B.linhas = function (S) {
    var o = {};
    TABELAS.forEach(function (d) { o[d.t] = {}; });
    var por = function (t, chave, l) { o[t][chave] = l; };

    (S.ciclo.fechados || []).forEach(function (a) { por('esg_ciclos', a, { ano: a, estado: 'fechado' }); });
    por('esg_ciclos', S.ciclo.ano, { ano: S.ciclo.ano, estado: 'aberto', data_abertura: S.ciclo.data_abertura, limiar_padrao: S.ciclo.limiar_padrao === undefined ? null : S.ciclo.limiar_padrao });
    S.users.forEach(function (u) { por('esg_utilizadores', u.login, { login: u.login, nome: u.nome, perfil: u.perfil, unidade: nulo(unidadesDe(u)[0]), unidades: unidadesDe(u) }); });
    var esrs = function (id) { return window.Portal && window.Portal.esrsDe ? window.Portal.esrsDe(id) : { rel: 'especifico', dps: [] }; };
    S.cat.forEach(function (c) {
      var k = esrs(c.id);
      por('esg_indicadores', c.id, { id: c.id, nome: c.nome, unidade_medida: c.unidade_medida, tema: c.tema, quadro: c.quadro, unidade_negocio: c.unidade_negocio, tipo: c.tipo, formula: nulo(c.formula), periodicidade: c.periodicidade, momentos: c.momentos || null, perimetro: c.perimetro, limiar_variacao_pct: c.limiar_variacao_pct, evidencia_obrigatoria: !!c.evidencia_obrigatoria, regras_coerencia: c.regras_coerencia || [], esrs: nulo(c.esrs), esrs_requisito: nulo(c.esrs_requisito), gri: nulo(c.gri), utilizado_por: c.utilizado_por || [], novo_esrs: !!c.novo_esrs, casas_decimais: c.casas_decimais, valor_base_anterior: c.ano_anterior === undefined ? null : c.ano_anterior, descricao: nulo(k.desc), subtema: nulo(k.sub), agregacao: nulo(k.agreg), esrs_ligacao: k.rel, esrs_datapoints: k.dps || [], esrs_nota: nulo(k.nota), config: CONFIG_IND.reduce(function (o, f) { if (c[f] !== undefined) o[f] = c[f]; return o; }, {}) });
    });
    S.wfbase.forEach(function (p, i) { por('esg_workflow_base', i + 1, { ordem: i + 1, nome: p.nome, tipo: p.tipo, responsavel: p.responsavel }); });
    S.ent.forEach(function (x) { por('esg_entidades', x.id, { id: x.id, nome: x.nome, perimetro_grupo: !!x.perimetro_grupo, perimetro_maioritario: !!x.perimetro_maioritario, pais: nulo(x.pais), detencao: x.detencao === undefined ? null : x.detencao, metodo: nulo(x.metodo), instalacoes: x.instalacoes === undefined ? null : x.instalacoes, nace: nulo(x.nace), nipc: nulo(x.nipc), moeda: nulo(x.moeda) }); });
    S.deps.forEach(function (x) { por('esg_departamentos', x.id, { id: x.id, nome: x.nome, empresas: x.empresas || [] }); });
    S.janelas.forEach(function (j, i) { por('esg_janelas', i + 1, { id: i + 1, nome: j.nome, tema: j.tema, meses: j.meses, dia_inicio: j.dia_inicio, dia_fim: j.dia_fim }); });
    S.mat.forEach(function (x) { por('esg_materialidade', x.norma, { norma: x.norma, tema: x.tema, avaliacao: x.avaliacao, justificacao: nulo(x.justificacao) }); });
    S.areas.forEach(function (a) { por('esg_areas', a.codigo, { codigo: a.codigo, nome: a.nome, uso: nulo(a.uso) }); });
    var c = S.marca.cores;
    por('esg_marca', 'true', { id: true, nome: S.marca.nome, subtitulo: nulo(S.marca.subtitulo), logotipo: S.marca.logotipo || '', cor_primary: c.primary, cor_secondary: c.secondary, cor_accent: c.accent, cor_bg: c.bg, cor_text: c.text });
    S.metas.forEach(function (x) { por('esg_metas', x.indicador_id, { indicador_id: x.indicador_id, nome: x.nome, valor_meta: x.valor_meta, ano_meta: x.ano_meta, sentido: x.sentido, unidade: x.unidade }); });
    S.amostra.forEach(function (id) { por('esg_amostra', S.ciclo.ano + '|' + id, { ano: S.ciclo.ano, indicador_id: id }); });
    S.docs.forEach(function (x) { por('esg_documentos', x.id, { id: x.id, tipo: x.tipo, fornecedor: x.fornecedor, periodo: x.periodo, instalacao: x.instalacao, entidade: nulo(x.entidade), consumo: x.consumo, valor_sem_iva: x.valor_sem_iva, iva: x.iva, percentagem_renovavel: x.percentagem_renovavel, centro_custo: nulo(x.centro_custo), leitura_telemetria: x.leitura_telemetria, estado: x.estado }); });

    (S.periodos || []).forEach(function (x) { por('esg_periodos', x.id, { id: x.id, nome: x.nome, tipo: x.tipo, ano: x.ano, t: x.t || 0, ini: x.ini, fim: x.fim, fecho: x.fecho }); });
    (S.relatorios || []).forEach(function (x) { por('esg_relatorios', x.id, { id: x.id, sigla: x.sigla, nome: x.nome, entidade: x.entidade, periodo: x.periodo, data: x.data, base: nulo(x.base) }); });
    (S.tipos || []).forEach(function (x) { por('esg_tipos_dados', x.id, { id: x.id, nome: x.nome, motivo: nulo(x.motivo), formatos: x.formatos || [], prefixo: x.prefixo, unidade: x.unidade, colunas: x.colunas && x.colunas.length ? x.colunas : null, granularidade: x.granularidade || 'mensal', obrigatorio: x.obrigatorio !== false, instrucoes: nulo(x.instrucoes), ativo: x.ativo !== false, versao: x.versao || 1, alterado_em: x.alterado_em || null, alterado_por: nulo(x.alterado_por) }); });
    S.ms.forEach(function (m) {
      por('esg_milestones', m.id, { id: m.id, nome: m.nome, ano: m.ano, empresa: m.empresa, departamentos: m.departamentos || [], atribuido_a: m.atribuido_a || null, ficheiros_pedidos: m.ficheiros_pedidos || [], unidade: m.unidade, periodicidade: m.periodicidade, prazo: m.prazo, passo_atual: m.passo_atual, devolvida: !!m.devolvida, workflow_ajustado: !!m.workflow_ajustado, documentos_gerais: m.documentos_gerais || [], periodo: m.periodo || null, consolida: !!m.consolida, tipos: m.tipos || null, folhas: m.folhas || {} });
      m.indicadores.forEach(function (id, i) { por('esg_milestone_indicadores', m.id + '|' + id, { milestone_id: m.id, indicador_id: id, ordem: i }); });
      m.passos.forEach(function (p, i) { por('esg_passos_workflow', p.id, { id: p.id, milestone_id: m.id, ordem: i, nome: p.nome, tipo: p.tipo, responsavel: p.responsavel, concluido_em: p.concluido_em || null, concluido_por: p.concluido_por || null }); });
      m.comentarios.forEach(function (x, i) { por('esg_comentarios', m.id + '|' + i, { milestone_id: m.id, autor: x.autor, texto: x.texto, em: x.em, sistema: !!x.sistema, passo: x.passo || null, indicador_id: x.indicador || null }); });
      m.eventos.forEach(function (x, i) { por('esg_eventos', m.id + '|' + i, { milestone_id: m.id, texto: x.texto, em: x.em, por: x.por, wf: x.wf || null, passo: x.passo || null }); });
    });
    Object.keys(S.items).forEach(function (k) {
      var it = S.items[k], ano = parseInt(it.ano, 10), per = typeof it.ano === 'string' ? it.ano : '';
      por('esg_valores', it.id + '|' + it.ano, { indicador_id: it.id, ano: ano, periodo: per, milestone_id: it.milestone_id, valor: it.valor, rascunho: nulo(it.rascunho), qualidade: it.qualidade, metodo_estimativa: nulo(it.metodo), justificacao: nulo(it.justificacao), reexpresso: !!it.reexpresso, entidade: it.entidade || 'Consolidado', fonte: nulo(it.fonte) });
      it.versoes.forEach(function (v, i) { por('esg_valor_versoes', it.id + '|' + it.ano + '|' + i, { indicador_id: it.id, ano: ano, periodo: per, valor: v.valor, em: v.em, por: v.por, origem: v.origem, motivo: nulo(v.motivo) }); });
      it.evidencias.forEach(function (x) { por('esg_evidencias', x.id, { id: x.id, ficheiro: x.ficheiro, indicador_id: it.id, ano: ano, periodo: per, milestone_id: it.milestone_id, carregado_por: x.por, carregado_em: x.em }); });
    });
    S.ext.forEach(function (x) { por('esg_pedidos_externos', x.id, { id: x.id, indicador_id: x.indicador_id, milestone_id: x.milestone_id, entidade_externa: x.entidade_externa, descricao: x.descricao, prazo: x.prazo, estado: x.estado, valor: x.valor, evidencia: nulo(x.evidencia), respondido_em: x.respondido_em || null }); });
    Object.keys(S.atrib || {}).forEach(function (id) { var a = S.atrib[id]; por('esg_atribuicao', id, { indicador_id: id, submete: nulo(a.submete), reve: nulo(a.reve), valida: nulo(a.valida) }); });
    Object.keys(S.regrasEnt || {}).forEach(function (ent) { Object.keys(S.regrasEnt[ent]).forEach(function (id) { var r = S.regrasEnt[ent][id]; por('esg_regras_entrada', ent + '|' + id, { entidade_id: ent, indicador_id: id, multi: !!r.multi, por: nulo(r.por), agreg: r.agreg || 'soma' }); }); });
    (S.fatores || []).forEach(function (f) { por('esg_fatores', f.id, { id: f.id, nome: f.nome, unidade: nulo(f.unidade), fator: f.fator, unidade_fator: nulo(f.unidade_fator), versao: f.versao, qtd: f.qtd, origem: nulo(f.origem), historico: f.historico || [] }); });
    (S.apis || []).forEach(function (a) { por('esg_ligacoes', a.id, { id: a.id, nome: a.nome, ambito: nulo(a.ambito), frequencia: nulo(a.frequencia), estado: a.estado || 'pendente' }); });
    Object.keys(S.kpim || {}).forEach(function (id) { var r = S.kpim[id]; por('esg_kpi_master', id, { indicador_id: id, recolha: nulo(r.recolha), disponivel: r.disponivel || '', fonte: nulo(r.fonte), controlos: r.controlos || '', controlo_txt: nulo(r.controlo_txt), divulga: r.divulga || '', motivo: nulo(r.motivo) }); });
    Object.keys(S.defs || {}).forEach(function (id) { var r = S.defs[id]; por('esg_definicoes', id, { indicador_id: id, inclui: r.inclui || '', exclui: nulo(r.exclui), fonte: nulo(r.fonte), dono: nulo(r.dono), alteracoes: r.alteracoes || [], versao: r.versao || 1, alterado_em: r.em || null, alterado_por: nulo(r.por) }); });
    (S.saidas || []).forEach(function (g) { por('esg_saidas', g.id, { id: g.id, relatorio_id: g.rel, versao: g.versao, formato: g.formato, ficheiro: g.ficheiro, final: !!g.final, gerado_em: g.em, gerado_por: g.por, aprovados: g.ok, total: g.total }); });
    Object.keys(S.dpdec || {}).forEach(function (id) { var r = S.dpdec[id]; por('esg_dp_decisoes', id, { datapoint_id: id, divulga: r.divulga || '', motivo: nulo(r.motivo) }); });
    Object.keys(S.gloss || {}).forEach(function (n) { por('esg_glossario_empresa', n, { termo_n: Number(n), definicao: S.gloss[n] }); });
    Object.keys(S.rq || {}).forEach(function (k) { var r = S.rq[k]; por('esg_report_valores', k, { linha_id: k, ant: r.ant === undefined ? null : r.ant, val: r.val === undefined ? null : r.val }); });
    if (S.doc) por('esg_report_documento', 'true', { id: true, titulo: S.doc.titulo, blocos: S.doc.blocos || [] });
    Object.keys(S.puxados || {}).forEach(function (id) { var x = S.puxados[id]; if (x && x.em) por('esg_fontes_puxadas', id, { milestone_id: id, em: x.em, por: x.por, vals: x.vals || {}, registos: x.registos || 0 }); });
    (S.evg || []).forEach(function (x, i) { por('esg_registo_config', i, { texto: x.texto, em: x.em, por: x.por, tipo: nulo(x.tipo) }); });
    (S.selos || []).forEach(function (s, i) { por('esg_selos', s.k, { ordem: i + 1, chave: s.k, hash: s.h }); });
    S.aud.forEach(function (a) { por('esg_pedidos_auditor', a.id, { id: a.id, indicador_id: a.indicador_id, texto: a.texto, por: a.por, em: a.em, estado: a.estado, resposta_texto: a.resposta ? a.resposta.texto : null, resposta_por: a.resposta ? a.resposta.por : null, resposta_em: a.resposta ? a.resposta.em : null }); });
    return o;
  });

  /* Das tabelas para o estado */
  var hidratar = function (S, d, login) {
    var aberto = d.esg_ciclos.filter(function (c) { return c.estado === 'aberto'; })[0] || d.esg_ciclos[d.esg_ciclos.length - 1] || { ano: new Date().getFullYear(), data_abertura: null };
    S.ciclo = { ano: aberto.ano, estado: 'aberto', data_abertura: aberto.data_abertura, limiar_padrao: aberto.limiar_padrao === null || aberto.limiar_padrao === undefined ? undefined : Number(aberto.limiar_padrao), fechados: d.esg_ciclos.filter(function (c) { return c.estado === 'fechado'; }).map(function (c) { return c.ano; }) };
    S.users = d.esg_utilizadores.map(function (u) { var l = u.unidades && u.unidades.length ? u.unidades : u.unidade ? [u.unidade] : []; return { login: u.login, nome: u.nome, perfil: u.perfil, unidades: l, unidade: l[0] || '' }; });
    S.cat = d.esg_indicadores.map(function (c) {
      var o = Object.assign({}, c);
      o.ano_anterior = c.valor_base_anterior; delete o.valor_base_anterior;
      o.esrs = c.esrs || ''; o.esrs_requisito = c.esrs_requisito || ''; o.gri = c.gri || '';
      /* Campos geridos em Backoffice, Indicators (empresas, estado, departamento que reporta e textos proprios) */
      var cfg = c.config || {}; delete o.config; CONFIG_IND.forEach(function (f) { if (cfg[f] !== undefined) o[f] = cfg[f]; });
      return o;
    });
    S.wfbase = d.esg_workflow_base.map(function (p) { return { nome: p.nome, tipo: p.tipo, responsavel: p.responsavel }; });
    S.ent = d.esg_entidades.map(function (x) { return { id: x.id, nome: x.nome, perimetro_grupo: x.perimetro_grupo, perimetro_maioritario: x.perimetro_maioritario, pais: x.pais || '', detencao: x.detencao === null ? 100 : Number(x.detencao), metodo: x.metodo || 'integral', instalacoes: x.instalacoes || 0, nace: x.nace || '', nipc: x.nipc || '', moeda: x.moeda || 'EUR' }; });
    S.deps = d.esg_departamentos.map(function (x) { return { id: x.id, nome: x.nome, empresas: x.empresas || [] }; });
    S.janelas = d.esg_janelas.map(function (j) { return { nome: j.nome, tema: j.tema, meses: j.meses, dia_inicio: j.dia_inicio, dia_fim: j.dia_fim }; });
    S.mat = d.esg_materialidade.map(function (x) { return { norma: x.norma, tema: x.tema, avaliacao: x.avaliacao, justificacao: x.justificacao || '' }; });
    S.areas = d.esg_areas.map(function (a) { return { codigo: a.codigo, nome: a.nome, uso: a.uso || '' }; });
    S.marca = marcaDe(d.esg_marca[0]);
    S.metas = d.esg_metas.map(function (x) { return { indicador_id: x.indicador_id, nome: x.nome, valor_meta: x.valor_meta, ano_meta: x.ano_meta, sentido: x.sentido, unidade: x.unidade }; });
    S.amostra = d.esg_amostra.filter(function (a) { return a.ano === S.ciclo.ano; }).map(function (a) { return a.indicador_id; });
    S.docs = d.esg_documentos.map(function (x) { var o = Object.assign({}, x); o.entidade = x.entidade || ''; o.centro_custo = x.centro_custo || ''; return o; });

    S.periodos = (d.esg_periodos || []).map(function (x) { return { id: x.id, nome: x.nome, tipo: x.tipo, ano: x.ano, t: x.t, ini: x.ini, fim: x.fim, fecho: x.fecho }; });
    S.relatorios = (d.esg_relatorios || []).map(function (x) { return { id: x.id, sigla: x.sigla, nome: x.nome, entidade: x.entidade, periodo: x.periodo, data: x.data, base: x.base || '' }; });
    S.tipos = (d.esg_tipos_dados || []).map(function (x) { var o = Object.assign({}, x); o.motivo = x.motivo || ''; o.instrucoes = x.instrucoes || ''; return o; });
    var doMs = function (l, id) { return l.filter(function (x) { return x.milestone_id === id; }); };
    S.ms = d.esg_milestones.map(function (m) {
      return {
        id: m.id, nome: m.nome, ano: m.ano, empresa: m.empresa, departamentos: m.departamentos || [], atribuido_a: m.atribuido_a || null, ficheiros_pedidos: m.ficheiros_pedidos || [], unidade: m.unidade, periodicidade: m.periodicidade, prazo: m.prazo, passo_atual: m.passo_atual, devolvida: m.devolvida, workflow_ajustado: m.workflow_ajustado, documentos_gerais: m.documentos_gerais || [],
        indicadores: doMs(d.esg_milestone_indicadores, m.id).map(function (x) { return x.indicador_id; }),
        passos: doMs(d.esg_passos_workflow, m.id).map(function (p) { return { id: p.id, nome: p.nome, tipo: p.tipo, responsavel: p.responsavel, concluido_em: p.concluido_em, concluido_por: p.concluido_por }; }),
        comentarios: doMs(d.esg_comentarios, m.id).map(function (x) { var o = { autor: x.autor, texto: x.texto, em: x.em }; if (x.sistema) o.sistema = true; if (x.passo) o.passo = x.passo; if (x.indicador_id) o.indicador = x.indicador_id; return o; }),
        eventos: doMs(d.esg_eventos, m.id).map(function (x) { var o = { texto: x.texto, em: x.em, por: x.por }; if (x.wf) { o.wf = x.wf; o.passo = x.passo || ''; } return o; })
      };
    });
    /* Campos acrescentados no 007 */
    d.esg_milestones.forEach(function (r) {
      var m = S.ms.filter(function (x) { return x.id === r.id; })[0];
      if (!m) return;
      m.periodo = r.periodo || r.ano + '-A'; m.consolida = !!r.consolida; m.folhas = r.folhas || {};
      if (r.tipos) m.tipos = r.tipos;
    });
    S.items = {};
    d.esg_valores.forEach(function (v) {
      var per = v.periodo || '', doItem = function (x) { return x.indicador_id === v.indicador_id && x.ano === v.ano && (x.periodo || '') === per; };
      S.items[(per || v.ano) + ':' + v.indicador_id] = {
        id: v.indicador_id, ano: per || v.ano, milestone_id: v.milestone_id, valor: v.valor, rascunho: v.rascunho, qualidade: v.qualidade, metodo: v.metodo_estimativa || '', justificacao: v.justificacao || '', reexpresso: v.reexpresso, entidade: v.entidade, fonte: v.fonte || '',
        versoes: d.esg_valor_versoes.filter(doItem).map(function (x) { return { valor: x.valor, em: x.em, por: x.por, origem: x.origem, motivo: x.motivo || '' }; }),
        evidencias: d.esg_evidencias.filter(doItem).map(function (x) { return { id: x.id, ficheiro: x.ficheiro, por: x.carregado_por, em: x.carregado_em }; })
      };
    });
    S.ext = d.esg_pedidos_externos.map(function (x) { var o = Object.assign({}, x); o.evidencia = x.evidencia || ''; return o; });
    S.atrib = {}; d.esg_atribuicao.forEach(function (a) { S.atrib[a.indicador_id] = { submete: a.submete || '', reve: a.reve || '', valida: a.valida || '' }; });
    S.regrasEnt = {}; d.esg_regras_entrada.forEach(function (r) { (S.regrasEnt[r.entidade_id] = S.regrasEnt[r.entidade_id] || {})[r.indicador_id] = { multi: r.multi, por: r.por || '', agreg: r.agreg }; });
    S.fatores = d.esg_fatores.map(function (f) { return { id: f.id, nome: f.nome, unidade: f.unidade || '', fator: Number(f.fator), unidade_fator: f.unidade_fator || '', versao: f.versao, qtd: f.qtd === null ? null : Number(f.qtd), origem: f.origem || '', historico: f.historico || [] }; });
    S.apis = d.esg_ligacoes.map(function (a) { return { id: a.id, nome: a.nome, ambito: a.ambito || '', frequencia: a.frequencia || '', estado: a.estado }; });
    S.kpim = {}; d.esg_kpi_master.forEach(function (r) { var o = Object.assign({}, r); delete o.indicador_id; S.kpim[r.indicador_id] = o; });
    S.defs = {}; (d.esg_definicoes || []).forEach(function (r) { S.defs[r.indicador_id] = { inclui: r.inclui, exclui: r.exclui || '', fonte: r.fonte || '', dono: r.dono || '', alteracoes: r.alteracoes || [], versao: r.versao, em: r.alterado_em, por: r.alterado_por || '' }; });
    S.saidas = (d.esg_saidas || []).map(function (g) { return { id: g.id, rel: g.relatorio_id, versao: g.versao, formato: g.formato, ficheiro: g.ficheiro, final: g.final, em: g.gerado_em, por: g.gerado_por, ok: g.aprovados, total: g.total }; }).sort(function (a, b) { return a.em < b.em ? -1 : 1; });
    S.dpdec = {}; d.esg_dp_decisoes.forEach(function (r) { S.dpdec[r.datapoint_id] = { divulga: r.divulga || '', motivo: r.motivo || '' }; });
    S.gloss = {}; d.esg_glossario_empresa.forEach(function (r) { S.gloss[r.termo_n] = r.definicao; });
    S.rq = {}; d.esg_report_valores.forEach(function (r) { S.rq[r.linha_id] = { ant: r.ant === null ? null : Number(r.ant), val: r.val === null ? null : Number(r.val) }; });
    S.doc = d.esg_report_documento[0] ? { titulo: d.esg_report_documento[0].titulo, blocos: d.esg_report_documento[0].blocos || [] } : null;
    S.puxados = {}; d.esg_fontes_puxadas.forEach(function (r) { S.puxados[r.milestone_id] = { em: r.em, por: r.por, vals: r.vals || {}, registos: r.registos }; });
    S.evg = d.esg_registo_config.map(function (x) { return { texto: x.texto, em: x.em, por: x.por, tipo: x.tipo || 'Change' }; });
    S.selos = d.esg_selos.map(function (s) { return { k: s.chave, h: s.hash }; });
    if (window.Portal && window.Portal.garantirEsrs) window.Portal.garantirEsrs();
    S.aud = d.esg_pedidos_auditor.map(function (a) { return { id: a.id, indicador_id: a.indicador_id, texto: a.texto, por: a.por, em: a.em, estado: a.estado, resposta: a.resposta_texto ? { texto: a.resposta_texto, por: a.resposta_por, em: a.resposta_em } : null }; });
    return login;
  };
  var marcaDe = function (l) {
    return l ? { nome: l.nome, subtitulo: l.subtitulo || '', logotipo: l.logotipo || '', cores: { primary: l.cor_primary, secondary: l.cor_secondary, accent: l.cor_accent, bg: l.cor_bg, text: l.cor_text } } : null;
  };

  /* --- Carregar ---------------------------------------------------------- */
  var ORDEM = { esg_periodos: 'ini', esg_relatorios: 'data', esg_tipos_dados: 'id', esg_entidades: 'nome', esg_departamentos: 'nome', esg_ciclos: 'ano', esg_janelas: 'id', esg_workflow_base: 'ordem', esg_milestones: 'id', esg_milestone_indicadores: 'milestone_id,ordem', esg_passos_workflow: 'milestone_id,ordem', esg_valor_versoes: 'id', esg_comentarios: 'id', esg_eventos: 'id', esg_indicadores: 'id', esg_utilizadores: 'login', esg_documentos: 'id.desc', esg_pedidos_auditor: 'em', esg_evidencias: 'carregado_em', esg_registo_config: 'id', esg_selos: 'ordem', esg_regras_entrada: 'entidade_id,indicador_id' };
  var snapshot = {};
  B.carregarMarca = function () {
    return pedir('esg_marca?select=*').then(function (l) { return marcaDe(l[0]); }).catch(function () { return null; });
  };
  /* Devolve o login do perfil da conta, ou null se a conta nao tiver perfil */
  B.carregar = function (S) {
    var nomes = TABELAS.map(function (d) { return d.t; });
    return Promise.all(nomes.map(function (t) { return lerTabela(t, ORDEM[t]); })).then(function (r) {
      var d = {};
      nomes.forEach(function (t, i) { d[t] = r[i]; });
      var eu = d.esg_utilizadores.filter(function (u) { return u.auth_user_id === sessao.uid; })[0];
      if (!eu) return null;
      hidratar(S, d);
      snapshot = linhas(S);
      return eu.login;
    });
  };

  /* --- Gravar: so o que mudou, por ordem, um pedido de cada vez ---------- */
  var filtro = function (d, l) { return d.pk.map(function (c) { return c + '=eq.' + encodeURIComponent(l[c]); }).join('&'); };
  var mudancas = function (antes, depois) {
    var acoes = { apagar: [], inserir: [], alterar: [] };
    TABELAS.forEach(function (d) {
      var a = antes[d.t] || {}, n = depois[d.t], novos = [];
      Object.keys(n).forEach(function (k) {
        if (!a[k]) { novos.push(n[k]); return; }
        if (d.so) return;
        var dif = {};
        Object.keys(n[k]).forEach(function (c) { if (JSON.stringify(n[k][c]) !== JSON.stringify(a[k][c])) dif[c] = n[k][c]; });
        if (Object.keys(dif).length) acoes.alterar.push({ d: d, chave: n[k], dif: dif });
      });
      if (novos.length) acoes.inserir.push({ d: d, linhas: novos });
      if (!d.so) Object.keys(a).forEach(function (k) { if (!n[k]) acoes.apagar.unshift({ d: d, chave: a[k] }); });
    });
    return acoes;
  };
  /* Os inserts agrupam-se pelas mesmas colunas: o PostgREST exige a mesma forma em cada lote */
  var inserirLote = function (d, lote, juntar) {
    var q = juntar && d.pk ? '?on_conflict=' + d.pk.join(',') : '';
    var pref = juntar ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal';
    var porForma = {};
    lote.forEach(function (l) { var f = Object.keys(l).join(); (porForma[f] = porForma[f] || []).push(l); });
    return Object.keys(porForma).reduce(function (p, f) {
      return p.then(function () { return pedir(d.t + q, { method: 'POST', headers: { Prefer: pref }, body: JSON.stringify(porForma[f]) }); });
    }, Promise.resolve());
  };
  /* Com RLS, uma alteracao recusada responde com sucesso e zero linhas: tem de contar como erro */
  var confirmar = function (r) { if (!r || !r.length) throw new Error('No permission for this change.'); };
  var aplicar = function (a) {
    var p = Promise.resolve();
    a.apagar.forEach(function (x) { p = p.then(function () { return pedir(x.d.t + '?' + filtro(x.d, x.chave), { method: 'DELETE', headers: { Prefer: 'return=representation' } }).then(confirmar); }); });
    /* Inserir e alterar seguem a ordem das tabelas, para respeitar as dependencias */
    TABELAS.forEach(function (d) {
      a.inserir.filter(function (x) { return x.d === d; }).forEach(function (x) { p = p.then(function () { return inserirLote(d, x.linhas); }); });
      a.alterar.filter(function (x) { return x.d === d; }).forEach(function (x) { p = p.then(function () { return pedir(d.t + '?' + filtro(d, x.chave), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(x.dif) }).then(confirmar); }); });
    });
    return p;
  };
  var fila = Promise.resolve();
  B.aoFalhar = null;
  B.sincronizar = function (S) {
    if (!sessao) return fila;
    var novo = linhas(S), a = mudancas(snapshot, novo);
    snapshot = novo;
    if (!a.apagar.length && !a.inserir.length && !a.alterar.length) return fila;
    fila = fila.then(function () { return aplicar(a); }).catch(function (e) { if (B.aoFalhar) return B.aoFalhar(e); });
    return fila;
  };
  B.fila = function () { return fila; };

  /* Carregamento inicial: envia o estado completo e junta com a configuracao que ja la esta */
  B.enviarTudo = function (S) {
    var todas = linhas(S);
    return TABELAS.reduce(function (p, d) {
      var l = Object.keys(todas[d.t]).map(function (k) { return todas[d.t][k]; });
      return l.length ? p.then(function () { return inserirLote(d, l, true); }) : p;
    }, Promise.resolve());
  };

  sessao = CFG ? lerSessao() : null;
})();
