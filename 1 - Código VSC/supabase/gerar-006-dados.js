/* Gera 006_esg_dados_controlo_esrs.sql: os dados das tabelas criadas pelo 005, a partir do proprio codigo da plataforma.
   Nao apaga nada: insere ou atualiza pela chave. Nao toca em milestones, valores, eventos nem utilizadores.
   Uso: node gerar-006-dados.js (na pasta supabase). Depois colar o SQL no editor do Supabase. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const web = path.join(__dirname, '..', 'web-files');
const guardado = {};
const armazem = { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = v; }, removeItem: (k) => { delete guardado[k]; } };
const ctx = { console, URL, Intl, TextEncoder, TextDecoder, Math, sessionStorage: armazem, localStorage: armazem, document: { addEventListener() {}, documentElement: { style: { setProperty() {} } } } };
ctx.window = ctx;
vm.createContext(ctx);
['portal-catalogo.js', 'portal-esrs.js', 'portal-supabase.js', 'portal-nucleo.js', 'portal-controlo.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(web, f), 'utf8'), ctx, { filename: f }));
/* Os quadros do Report precisam das ajudas de ecra: bastam esqueletos */
vm.runInContext("Portal.ext = { Blocos: {}, A: {}, C: {}, U: {}, e: String, chip: String, opt: String, campo: String, toast: function () {}, R: function () {}, u: function () { return null; } };", ctx);
vm.runInContext(fs.readFileSync(path.join(web, 'portal-quadros.js'), 'utf8'), ctx, { filename: 'portal-quadros.js' });

const S = ctx.Portal.dadosDemonstracao();
const L = ctx.PortalBackend.linhas(S);
const D = ctx.PORTAL_ESRS;
const lista = (t) => Object.keys(L[t]).map((k) => L[t][k]);
const json = (x) => { const s = JSON.stringify(x); if (s.includes('$j$')) throw new Error('JSON com $j$'); return '$j$' + s + '$j$'; };
const upsert = (t, linhas, pk, onde) => {
  if (!linhas.length) return '';
  const cols = Object.keys(linhas[0]);
  return `insert into public.${t} (${cols.join(', ')})\nselect ${cols.map((c) => 'r.' + c).join(', ')} from json_populate_recordset(null::public.${t}, ${json(linhas)}) r${onde ? '\nwhere ' + onde : ''}\non conflict (${pk.join(', ')}) do update set ${cols.filter((c) => !pk.includes(c)).map((c) => c + ' = excluded.' + c).join(', ') || pk[0] + ' = excluded.' + pk[0]};\n\n`;
};
const atualizar = (t, linhas, pk, cols) => `update public.${t} x set ${cols.map((c) => c + ' = r.' + c).join(', ')}\nfrom json_populate_recordset(null::public.${t}, ${json(linhas.map((l) => { const o = {}; pk.concat(cols).forEach((c) => { o[c] = l[c]; }); return o; }))}) r\nwhere ${pk.map((c) => 'x.' + c + ' = r.' + c).join(' and ')};\n\n`;

let sql = `-- Dados das tabelas do 005: correr depois de 005_esg_controlo_esrs_report.sql.
-- Gerado por gerar-006-dados.js a partir do codigo da plataforma. Pode correr-se mais de uma vez: insere ou atualiza pela chave.
-- Nao toca em milestones, valores, eventos nem utilizadores. Linhas que dependem de uma empresa, utilizador ou indicador que nao existam sao ignoradas.
begin;

`;
sql += '-- Indicadores: codigo ESRS de 2026, descricao e datapoints\n' + atualizar('esg_indicadores', lista('esg_indicadores'), ['id'], ['esrs_requisito', 'descricao', 'subtema', 'agregacao', 'esrs_ligacao', 'esrs_datapoints', 'esrs_nota']);
sql += '-- Empresas: perimetro de consolidacao\n' + atualizar('esg_entidades', lista('esg_entidades'), ['id'], ['perimetro_grupo', 'perimetro_maioritario', 'pais', 'detencao', 'metodo', 'instalacoes', 'nace', 'nipc', 'moeda']);
sql += '-- Datapoints ESRS e glossario\n' + upsert('esg_esrs_datapoints', D.dps.map((d) => ({ id: d.id, n: d.n, norma: d.norma, tema: d.tema, dr: d.dr, paragrafo: d.par, ar: d.ar, nome: d.nome, texto: d.texto, divulgacao: d.div, tipo_dado: d.tipo })), ['id']);
sql += upsert('esg_esrs_glossario', D.glossario.map((g) => ({ n: g.n, termo: g.termo, definicao: g.def || null, tema: g.tema, ajuda: g.ajuda || null })), ['n']);
sql += '-- Atribuicao de KPIs\n' + upsert('esg_atribuicao', lista('esg_atribuicao'), ['indicador_id'], "exists (select 1 from public.esg_indicadores i where i.id = r.indicador_id) and (r.submete is null or exists (select 1 from public.esg_utilizadores u where u.login = r.submete)) and (r.reve is null or exists (select 1 from public.esg_utilizadores u where u.login = r.reve)) and (r.valida is null or exists (select 1 from public.esg_utilizadores u where u.login = r.valida))");
sql += '-- Regras de introducao por empresa\n' + upsert('esg_regras_entrada', lista('esg_regras_entrada'), ['entidade_id', 'indicador_id'], 'exists (select 1 from public.esg_entidades e where e.id = r.entidade_id) and exists (select 1 from public.esg_indicadores i where i.id = r.indicador_id)');
sql += '-- Fatores de emissao e ligacoes\n' + upsert('esg_fatores', lista('esg_fatores'), ['id']) + upsert('esg_ligacoes', lista('esg_ligacoes'), ['id']);
sql += '-- Quadros do Report\n' + upsert('esg_report_valores', lista('esg_report_valores'), ['linha_id']) + upsert('esg_report_documento', lista('esg_report_documento'), ['id']);
sql += 'commit;\n\n-- Confere\nselect (select count(*) from public.esg_indicadores where esrs_ligacao is not null) as indicadores_ligados, (select count(*) from public.esg_esrs_datapoints) as datapoints, (select count(*) from public.esg_esrs_glossario) as termos, (select count(*) from public.esg_atribuicao) as atribuicoes, (select count(*) from public.esg_regras_entrada) as regras, (select count(*) from public.esg_fatores) as fatores, (select count(*) from public.esg_ligacoes) as ligacoes, (select count(*) from public.esg_report_valores) as linhas_report;\n';
fs.writeFileSync(path.join(__dirname, '006_esg_dados_controlo_esrs.sql'), sql, 'utf8');
const n = (t) => Object.keys(L[t] || {}).length;
console.log(`006: ${n('esg_indicadores')} indicadores, ${n('esg_entidades')} empresas, ${D.dps.length} datapoints, ${D.glossario.length} termos, ${n('esg_atribuicao')} atribuicoes, ${n('esg_regras_entrada')} regras, ${n('esg_fatores')} fatores, ${n('esg_ligacoes')} ligacoes, ${n('esg_report_valores')} linhas do Report, ${sql.length} caracteres`);
