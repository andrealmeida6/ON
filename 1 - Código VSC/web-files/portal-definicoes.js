/* ============================================================================
   portal-definicoes.js - ficha de definicao de cada indicador
   O que conta, o que nao conta, a fonte, o responsavel e as mudancas face ao
   ano anterior. Aparece na ficha do indicador para quem preenche, revê ou
   audita; so a equipa de sustentabilidade e o administrador a alteram.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S, X = P.ext;
  var A = X.A, e = X.e, chip = X.chip, campo = X.campo, opt = X.opt, toast = X.toast, R = X.R, u = X.u;

  /* i: o que conta; x: o que nao conta; f: fonte; m: mudancas por ano */
  var BASE = {
    A01: { i: 'Água captada e tratada nas ETA próprias e água comprada a sistemas em alta, medida nos contadores de entrada das redes de abastecimento.', x: 'Água de lavagem de filtros que volta à ETA. Água vendida a outros sistemas.', f: 'Telemetria dos contadores de entrada e faturas da entidade em alta.', m: { 2026: 'A água comprada a sistemas em alta passa a contar pela leitura do contador da entidade em alta quando não há contador próprio.' } },
    A02: { i: 'Volume faturado a clientes finais no período, incluindo os acertos de leituras estimadas.', x: 'Consumos autorizados não faturados (bombeiros, rega municipal, lavagem de redes). Notas de crédito de períodos anteriores.', f: 'Sistema comercial, mapa de faturação por período de consumo.' },
    A03: { i: 'Diferença entre a água entrada no sistema e a água faturada, em percentagem da água entrada. Junta perdas reais, perdas aparentes e consumos autorizados não faturados.', x: 'Água vendida a outros sistemas.', f: 'Calculado na plataforma a partir de A01 e A02.', m: { 2026: 'A fórmula passa a usar a água entrada no sistema em vez da água produzida. O valor de 2025 foi recalculado para comparar.' } },
    A04: { i: 'Contratos de abastecimento ativos a 31/12, domésticos e não domésticos.', x: 'Contratos suspensos há mais de 12 meses e contratos só de saneamento.', f: 'Sistema comercial.' },
    A07: { i: 'Condutas adutoras e de distribuição em serviço a 31/12.', x: 'Ramais de ligação e condutas desativadas.', f: 'Cadastro de redes (SIG).' },
    A08: { i: 'Água captada nas origens próprias, superficiais e subterrâneas, medida nos contadores das captações.', x: 'Água comprada a sistemas em alta.', f: 'Telemetria das captações e títulos de utilização de recursos hídricos.' },
    A10: { i: 'Água faturada mais consumos autorizados não faturados, em percentagem da água entrada no sistema.', x: 'Água vendida a outros sistemas.', f: 'Calculado na plataforma a partir de A01, A02 e dos consumos autorizados.' },
    A11: { i: 'Perdas reais por quilómetro de rede e por dia, sobre a extensão das condutas adutoras e de distribuição.', x: 'Extensão dos ramais de ligação.', f: 'Calculado na plataforma a partir do balanço hídrico e do cadastro de redes.', m: { 2026: 'A extensão da rede deixa de incluir os ramais de ligação. O valor de 2025 foi recalculado para comparar.' } },
    A12: { i: 'Análises microbiológicas do programa de controlo da qualidade da água (PCQA) que cumprem o valor paramétrico, em percentagem das análises realizadas.', x: 'Análises de controlo operacional fora do PCQA aprovado e repetições feitas depois de um incumprimento.', f: 'Laboratório (LIMS), resultados validados do PCQA.' },
    A13: { i: 'Análises físico-químicas do PCQA que cumprem o valor paramétrico, em percentagem das análises realizadas.', x: 'Análises de controlo operacional fora do PCQA aprovado.', f: 'Laboratório (LIMS), resultados validados do PCQA.' },
    R01: { i: 'Volume de saneamento faturado a clientes finais no período.', x: 'Águas pluviais e efluentes industriais com contrato próprio de rejeição.', f: 'Sistema comercial.' },
    R03: { i: 'Coletores de águas residuais domésticas e unitários em serviço a 31/12.', x: 'Coletores pluviais separativos e ramais de ligação.', f: 'Cadastro de redes (SIG).' },
    R04: { i: 'Volume afluente às ETAR que recebeu tratamento, medido no caudalímetro de entrada.', x: 'Descargas de emergência e by-pass sem tratamento.', f: 'Telemetria das ETAR.' },
    R09: { i: 'Lamas desidratadas saídas das ETAR, em toneladas de matéria seca.', x: 'Lamas de ETA e areias e gradados.', f: 'Guias eletrónicas de acompanhamento de resíduos (e-GAR) e análises de matéria seca.' },
    R10: { i: 'Lamas entregues para uma operação de valorização (códigos R), em percentagem das lamas produzidas.', x: 'Lamas em armazenamento temporário a 31/12.', f: 'e-GAR com o código da operação de destino.' },
    E01: { i: 'Eletricidade faturada de todas as instalações: ETA, ETAR, estações elevatórias e edifícios.', x: 'Eletricidade produzida e consumida em autoconsumo, que se reporta à parte.', f: 'Faturas de energia, leituras por local de consumo.' },
    E05: { i: 'Eletricidade das ETA e captações a dividir pela água produzida.', x: 'Eletricidade das estações elevatórias de distribuição e dos edifícios.', f: 'Calculado na plataforma a partir das faturas de energia e da telemetria.' },
    E06: { i: 'Combustíveis da frota própria, geradores e caldeiras, gases fluorados recarregados e emissões de metano e óxido nitroso do tratamento de águas residuais.', x: 'Frota em renting com combustível pago pelo colaborador.', f: 'Faturas de combustível, fichas de intervenção em climatização e fatores de emissão da APA.', m: { 2026: 'Passam a contar as emissões de metano e óxido nitroso do tratamento de águas residuais.' } },
    E07: { i: 'Emissões da eletricidade comprada, pelo método baseado no mercado.', x: 'O método baseado na localização, que fica em nota no relatório.', f: 'Faturas de energia e garantias de origem do comercializador.' },
    E09: { i: 'Viaturas elétricas e híbridas plug-in, próprias e em renting, a 31/12, em percentagem da frota.', x: 'Híbridos sem ligação à rede e máquinas não matriculadas.', f: 'Gestão de frota e listagem da gestora de renting.' },
    P01: { i: 'Pessoas com contrato de trabalho, permanente ou a termo, a 31/12.', x: 'Estagiários, prestadores de serviços e trabalho temporário.', f: 'Sistema de recursos humanos.', m: { 2026: 'Passa a contar pessoas e não equivalentes a tempo inteiro, como pede a ESRS S1-6.' } },
    P04: { i: 'Mulheres no total de pessoas com contrato a 31/12.', x: 'Estagiários e prestadores de serviços.', f: 'Sistema de recursos humanos.' },
    P07: { i: 'Saídas no ano (voluntárias, despedimentos, reformas e fim de contrato) a dividir pela média de colaboradores.', x: 'Mudanças entre empresas do grupo.', f: 'Sistema de recursos humanos.' },
    P14: { i: 'Dias perdidos por acidentes de trabalho por cada mil horas trabalhadas.', x: 'Acidentes in itinere e dias perdidos por doença profissional.', f: 'Registo de acidentes da área de segurança e horas trabalhadas do sistema de recursos humanos.' },
    P16: { i: 'Horas de ausência não prevista a dividir pelas horas de trabalho previstas.', x: 'Férias, licenças parentais e formação.', f: 'Sistema de recursos humanos.' },
    G01: { i: 'Valor faturado por fornecedores no ano, sem IVA.', x: 'Compras entre empresas do grupo, impostos, salários e rendas de concessão.', f: 'Sistema financeiro, contas de fornecedores.' },
    G02: { i: 'Compras a fornecedores com sede em Portugal, em percentagem do valor total das compras.', x: 'Compras entre empresas do grupo.', f: 'Sistema financeiro, país do fornecedor.' },
    N03: { i: 'Resíduos com e-GAR emitidas pelas instalações do grupo, em toneladas.', x: 'Lamas de ETAR, que se reportam em R09.', f: 'e-GAR e mapa integrado de registo de resíduos.' },
    N04: { i: 'Quilos de gases fluorados recarregados em equipamentos de climatização e refrigeração.', x: 'Gases recuperados e enviados para destruição.', f: 'Fichas de intervenção dos técnicos certificados.' },
    N06: { i: 'Reclamações escritas recebidas pelo livro de reclamações, portal, email e balcões.', x: 'Pedidos de informação e reclamações sobre entidades terceiras.', f: 'Sistema comercial, módulo de reclamações.' },
    C02: { i: 'Net Promoter Score do inquérito anual de satisfação aos clientes domésticos.', x: 'Respostas incompletas.', f: 'Inquérito de satisfação feito pela área comercial.' }
  };

  P.semearDefinicoes = function () {
    S.defs = {};
    Object.keys(BASE).forEach(function (id) {
      var b = BASE[id], alt = Object.keys(b.m || {}).map(function (a) { return { ano: Number(a), txt: b.m[a] }; });
      S.defs[id] = { inclui: b.i, exclui: b.x, fonte: b.f, dono: '', alteracoes: alt, versao: alt.length ? 2 : 1, em: alt.length ? '2026-02-16T10:00:00Z' : '2026-01-20T10:00:00Z', por: 'Equipa de sustentabilidade' };
    });
  };

  var donoDe = function (id) {
    var c = P.cat(id), d = (S.defs || {})[id] || {}, unidade = d.dono || (c && c.unidade_negocio) || '', a = (S.atrib || {})[id], pes = a && a.submete ? P.user(a.submete) : null;
    return { unidade: unidade, pessoa: pes && pes.perfil === 'resp' ? pes.nome : '' };
  };
  /* Estado da ficha: completa, com mudancas este ano, ou por definir */
  P.definicao = function (id) {
    var d = (S.defs || {})[id], ano = S.ciclo.ano;
    if (!d) return { d: null, completa: false, mudou: false };
    return { d: d, completa: !!(d.inclui && d.exclui && d.fonte), mudou: (d.alteracoes || []).some(function (x) { return x.ano === ano; }) };
  };

  var bloco = function (id) {
    var st = P.definicao(id), d = st.d || {}, ano = S.ciclo.ano, dn = donoDe(id), c = P.cat(id), pode = P.gereTudo(u());
    var falta = '<span class="ps-mut">Not defined yet</span>';
    var alt = (d.alteracoes || []).slice().sort(function (a, b) { return b.ano - a.ano; });
    var calc = c.formula ? e(c.formula) : 'Reported value' + (P.trimestral && P.agregacao ? '. Over the year: ' + e(P.AGREG_TXT[P.agregacao(id)].toLowerCase()) + '.' : '');
    return '<section class="ps-def" aria-labelledby="def-t"><div class="ps-sp-b"><h3 id="def-t" class="ps-grupo-t ps-sem-topo">Definition</h3><span class="ps-sp">' +
      (st.mudou ? chip('Changed in ' + ano, 'warn') : '') + (st.d ? chip('Version ' + d.versao, '') : chip('To define', 'err')) +
      (pode ? '<button type="button" class="ps-btn peq" data-a="defEditar" data-v="' + e(id) + '">Edit</button>' : '') + '</span></div>' +
      (st.mudou ? '<div class="ps-aviso warn"><b>What changed in ' + ano + '.</b> ' + e(alt.filter(function (x) { return x.ano === ano; })[0].txt) + '</div>' : '') +
      '<dl class="ps-def-l"><dt>What counts</dt><dd>' + (d.inclui ? e(d.inclui) : falta) + '</dd><dt>What does not count</dt><dd>' + (d.exclui ? e(d.exclui) : falta) + '</dd>' +
      '<dt>Source</dt><dd>' + (d.fonte ? e(d.fonte) : falta) + '</dd><dt>Owner</dt><dd>' + e(dn.unidade || '-') + (dn.pessoa ? ' · ' + e(dn.pessoa) : '') + '</dd>' +
      '<dt>Calculation</dt><dd>' + calc + '</dd>' +
      '<dt>Changes from previous years</dt><dd>' + (alt.length ? '<ul class="ps-def-alt">' + alt.map(function (x) { return '<li><b>' + x.ano + '</b> ' + e(x.txt) + '</li>'; }).join('') + '</ul>' : 'No changes. Same definition as ' + (ano - 1) + '.') + '</dd></dl>' +
      (st.d ? '<p class="ps-small ps-mut">Last changed ' + e(P.fmtDataAno(d.em)) + ' by ' + e(d.por) + '.</p>' : '') + '</section>';
  };
  P.definicaoHtml = bloco;

  /* A ficha do indicador passa a abrir pela definicao, logo a seguir aos valores */
  var fichaBase = X.Pn.ficha;
  X.Pn.ficha = function (a) {
    var r = fichaBase(a), i = r.b.indexOf('<p class="ps-ficha-desc">');
    r.b = i < 0 ? bloco(a.id) + r.b : r.b.slice(0, i) + bloco(a.id) + r.b.slice(i);
    return r;
  };

  X.Pn.defEditar = function (a) {
    var id = a.id, c = P.cat(id), d = (S.defs || {})[id] || {}, ano = S.ciclo.ano, alt = (d.alteracoes || []).filter(function (x) { return x.ano === ano; })[0];
    return {
      t: 'Edit definition', s: id + ' · ' + c.nome,
      b: '<p class="ps-small ps-mut">Everyone who fills in, reviews or audits this indicator reads this. Write it in plain words.</p><div class="ps-form ps-form-1">' +
        campo('df-i', 'What counts', '<textarea id="df-i" class="ps-ta">' + e(d.inclui || '') + '</textarea>') +
        campo('df-x', 'What does not count', '<textarea id="df-x" class="ps-ta">' + e(d.exclui || '') + '</textarea>') +
        campo('df-f', 'Source', '<input id="df-f" class="ps-in" value="' + e(d.fonte || '') + '">') +
        campo('df-d', 'Owner department', '<select id="df-d" class="ps-sel">' + P.UNIDADES.map(function (x) { return opt(x, x, d.dono || c.unidade_negocio); }).join('') + '</select>') +
        campo('df-m', 'What changed in ' + ano + ' (leave empty if nothing)', '<textarea id="df-m" class="ps-ta">' + e(alt ? alt.txt : '') + '</textarea>') + '</div>',
      p: '<button type="button" class="ps-btn" data-a="ficha" data-v="' + e(id) + '">Cancel</button><button type="button" class="ps-btn pri" data-a="defGuardar" data-v="' + e(id) + '">Save definition</button>'
    };
  };
  var val = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
  A.defEditar = function (dd) { X.abrePainel('defEditar', { id: dd.v }); };
  A.defGuardar = function (dd) {
    var id = dd.v, usr = u(), ano = S.ciclo.ano;
    if (!P.gereTudo(usr)) return toast('Only the sustainability team can change definitions.', 'err');
    var d = (S.defs || (S.defs = {}))[id] || { alteracoes: [], versao: 0 };
    var novo = { inclui: val('df-i'), exclui: val('df-x'), fonte: val('df-f'), dono: val('df-d'), m: val('df-m') };
    if (!novo.inclui || !novo.fonte) return toast('Fill in at least what counts and the source.', 'err');
    var alt = (d.alteracoes || []).filter(function (x) { return x.ano !== ano; });
    if (novo.m) alt.push({ ano: ano, txt: novo.m });
    S.defs[id] = { inclui: novo.inclui, exclui: novo.exclui, fonte: novo.fonte, dono: novo.dono === P.cat(id).unidade_negocio ? '' : novo.dono, alteracoes: alt, versao: (d.versao || 0) + 1, em: new Date().toISOString(), por: usr.nome };
    if (P.eventoGlobal) P.eventoGlobal('Definition of ' + id + ' changed to version ' + S.defs[id].versao + '.', usr.nome, 'Definition');
    /* Quem esta a preencher fica a saber pela milestone */
    P.msCiclo().filter(function (m) { return m.indicadores.indexOf(id) > -1 && !P.concluida(m); }).forEach(function (m) { P.evento(m, 'Definition of ' + id + ' changed (version ' + S.defs[id].versao + '). Check it before submitting.', usr.nome); });
    P.guardar(); toast('Definition saved.', 'ok');
    X.abrePainel('ficha', { id: id });
  };
})();
