/* Gera 007_esg_dados_demonstracao.sql: os dados de demonstracao completos da plataforma (milestones por trimestre,
   periodos, entregas externas, tipos de dados, valores, eventos), a partir do proprio codigo.
   Limpa primeiro os dados de demonstracao (como repor-demonstracao.sql) e mantem utilizadores, contas, empresas,
   materialidade, areas, marca e datapoints ESRS. Usar apenas com dados de demonstracao.
   Uso: node gerar-007-dados.js (na pasta supabase). Depois correr o SQL no editor do Supabase. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const web = path.join(__dirname, '..', 'web-files');
const guardado = {};
const armazem = { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = v; }, removeItem: (k) => { delete guardado[k]; } };
const ctx = { console, URL, Intl, TextEncoder, TextDecoder, Math, sessionStorage: armazem, localStorage: armazem, document: { addEventListener() {}, documentElement: { style: { setProperty() {} } } } };
ctx.window = ctx;
vm.createContext(ctx);
['portal-catalogo.js', 'portal-esrs.js', 'portal-supabase.js', 'portal-nucleo.js', 'portal-controlo.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(web, f), 'utf8'), ctx, { filename: f }));
vm.runInContext("Portal.ext = { Blocos: {}, A: {}, C: {}, U: {}, e: String, chip: String, opt: String, campo: String, toast: function () {}, R: function () {}, u: function () { return null; } };", ctx);
vm.runInContext(fs.readFileSync(path.join(web, 'portal-quadros.js'), 'utf8'), ctx, { filename: 'portal-quadros.js' });

const S = ctx.Portal.dadosDemonstracao();
const L = ctx.PortalBackend.linhas(S);
const lista = (t) => Object.keys(L[t] || {}).map((k) => L[t][k]);
const json = (x) => { const s = JSON.stringify(x); if (s.includes('$j$')) throw new Error('JSON com $j$'); return '$j$' + s + '$j$'; };
/* Literais SQL compactos: valores em tuplos, sem repetir os nomes das colunas */
const JSONB = ['ficheiros_pedidos', 'documentos_gerais', 'folhas', 'vals', 'historico', 'blocos', 'esrs_datapoints'];
const lit = (v, col) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v) && JSONB.indexOf(col) < 0 && v.every((x) => typeof x === 'number')) return "'{" + v.join(',') + "}'";
  if (Array.isArray(v) && JSONB.indexOf(col) < 0 && v.every((x) => typeof x === 'string')) return "'" + JSON.stringify(v).replace(/^\[/, '{').replace(/\]$/, '}').replace(/'/g, "''") + "'";
  if (typeof v === 'object') return "'" + JSON.stringify(v).replace(/'/g, "''") + "'";
  return "'" + String(v).replace(/'/g, "''") + "'";
};
const inserir = (t, linhas, pk) => {
  const grupos = {};
  linhas.forEach((l) => { const f = Object.keys(l).join(); (grupos[f] = grupos[f] || []).push(l); });
  return Object.keys(grupos).map((f) => {
    const cols = f.split(','), ls = grupos[f];
    const conflito = pk ? `\non conflict (${pk.join(', ')}) do update set ${cols.filter((c) => pk.indexOf(c) < 0).map((c) => c + ' = excluded.' + c).join(', ') || pk[0] + ' = excluded.' + pk[0]}` : '';
    return `insert into public.${t} (${cols.join(', ')}) values\n${ls.map((l) => '(' + cols.map((c) => lit(l[c], c)).join(',') + ')').join(',\n')}${conflito};\n`;
  }).join('');
};
/* Ordem das tabelas e chaves, como no portal-supabase.js; utilizadores, empresas, indicadores e referencias ESRS ficam como estao */
const ORDEM = [
  ['esg_ciclos', ['ano']], ['esg_workflow_base', ['ordem']], ['esg_departamentos', ['id']], ['esg_janelas', ['id']],
  ['esg_periodos', ['id']], ['esg_relatorios', ['id']], ['esg_tipos_dados', ['id']], ['esg_metas', ['indicador_id']], ['esg_amostra', ['ano', 'indicador_id']], ['esg_documentos', ['id']],
  ['esg_milestones', ['id']], ['esg_milestone_indicadores', ['milestone_id', 'indicador_id']], ['esg_passos_workflow', ['id']], ['esg_valores', ['indicador_id', 'ano', 'periodo']],
  ['esg_valor_versoes', null], ['esg_evidencias', ['id']], ['esg_pedidos_externos', ['id']], ['esg_pedidos_auditor', ['id']], ['esg_comentarios', null], ['esg_eventos', null]
];
let sql = `-- Dados de demonstracao completos: correr depois de 007_esg_periodos_tipos.sql.
-- Gerado por gerar-007-dados.js a partir do codigo da plataforma. Apaga e volta a carregar os dados de demonstracao.
-- Mantem utilizadores, contas, empresas, materialidade, areas, marca e datapoints ESRS. Nunca usar com dados reais.
begin;
truncate public.esg_valor_versoes, public.esg_eventos, public.esg_comentarios, public.esg_evidencias, public.esg_pedidos_externos,
  public.esg_pedidos_auditor, public.esg_valores, public.esg_passos_workflow, public.esg_milestone_indicadores, public.esg_fontes_puxadas,
  public.esg_milestones, public.esg_amostra, public.esg_metas, public.esg_documentos, public.esg_relatorios, public.esg_periodos, public.esg_tipos_dados,
  public.esg_janelas, public.esg_workflow_base restart identity cascade;

`;
const partes = [];
ORDEM.forEach(([t, pk]) => { const l = lista(t); if (l.length) partes.push({ t, n: l.length, sql: '-- ' + t + ' (' + l.length + ')\n' + inserir(t, l, pk) + '\n' }); });
sql += partes.map((p) => p.sql).join('') + 'commit;\n';
fs.writeFileSync(path.join(__dirname, '007_esg_dados_demonstracao.sql'), sql, 'utf8');
console.log(partes.map((p) => p.t + ': ' + p.n).join(', '));
console.log((sql.length / 1024).toFixed(0) + ' KB');
