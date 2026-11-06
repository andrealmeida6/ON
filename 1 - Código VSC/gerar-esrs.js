/* Gera web-files/portal-esrs.js a partir do Excel de datapoints e de esrs-mapeamento.js.
   Uso: node gerar-esrs.js "<caminho do Excel>"
   O Excel nao fica no repositorio. Depois correr gerar-mockup.js.
   Falha se o mapeamento citar um datapoint ou indicador que nao exista. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const XLSX = require('./web-files/xlsx.full.min.js');
const fonte = process.argv[2];
if (!fonte) throw new Error('Falta o caminho do Excel.');
const wb = XLSX.read(fs.readFileSync(fonte), { type: 'buffer' });
const folha = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false });
/* O glossario cita a consultora como fonte em dois termos: sai a citacao, fica a definicao e a fonte GRI.
   O nome vai em codigos de caracteres para nao aparecer escrito no repositorio. */
const MARCA = String.fromCharCode(75, 80, 77, 71);
const limpa = (t) => String(t || '').replace(/\r/g, '').replace(new RegExp('\\(' + MARCA + ' suggestion based on ', 'gi'), '(Based on ').replace(new RegExp('\\s*\\(' + MARCA + '\\)', 'gi'), '').replace(/​/g, '').replace(/\s*—\s*/g, ', ').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim();
/* Texto de consultora no meio do Excel: nunca passa para a plataforma */
const MARCAS = new RegExp(MARCA, 'i');

/* Datapoints: a tabela comeca na linha 5. Coluna B e a 1 (o indice 0 e a coluna A). */
const dp = folha('Datapoint Mapping');
const dps = [];
const fora = [];
for (let i = 4; i < 364; i++) {
  const l = dp[i] || [];
  const id = limpa(l[2]);
  if (!id) continue; /* linha de titulo de secao, sem ID */
  const x = { id, n: Number(l[1]), norma: limpa(l[3]).replace('ESRS ', ''), tema: limpa(l[4]), dr: limpa(l[7]), par: limpa(l[8]), ar: limpa(l[9]), nome: limpa(l[10]), texto: limpa(l[11]), div: limpa(l[12]), tipo: limpa(l[13]).toLowerCase() };
  if (MARCAS.test(x.nome + x.texto)) fora.push(id);
  dps.push(x);
}
const porId = new Map(dps.map((x) => [x.id, x]));

/* Glossario: termo, definicao, tema e ajuda */
const gl = folha('Definition of terms');
const glossario = [];
for (let i = 7; i < gl.length; i++) {
  const l = gl[i] || [];
  const termo = limpa(l[1]);
  if (!termo || !Number(l[0])) continue;
  const def = limpa(l[2]), ajuda = limpa(l[4]);
  const porPreencher = /^\[to be/i.test(def);
  if (MARCAS.test(termo + def + ajuda)) fora.push('glossario ' + termo);
  glossario.push({ n: Number(l[0]), termo: termo.replace(/\n/g, ' '), def: porPreencher ? '' : def, tema: limpa(l[3]), ajuda: /^\W*$/.test(ajuda) ? '' : ajuda });
}
if (fora.length) throw new Error('Marca no texto, tratar primeiro: ' + fora.join(', '));

/* Mapeamento */
const mapa = require('./esrs-mapeamento.js');
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'web-files', 'portal-catalogo.js'), 'utf8'), ctx);
const cat = ctx.window.PORTAL_CATALOGO, ids = cat.map((c) => c.id);
const erros = [];
ids.filter((i) => !mapa[i]).forEach((i) => erros.push('sem mapeamento: ' + i));
Object.keys(mapa).filter((i) => !ids.includes(i)).forEach((i) => erros.push('nao esta no catalogo: ' + i));
Object.entries(mapa).forEach(([k, m]) => {
  if (!['direto', 'parcial', 'especifico'].includes(m.rel)) erros.push(k + ': rel');
  if (m.rel === 'especifico' ? m.dps.length : !m.dps.length) erros.push(k + ': rel e dps nao batem certo');
  m.dps.forEach((d) => { if (!porId.has(d)) erros.push(k + ': datapoint inexistente ' + d); });
  if (!m.desc || !m.sub || !m.agreg) erros.push(k + ': campos em falta');
});
if (erros.length) throw new Error(erros.join('\n'));
/* O requisito novo do ESRS sai do proprio datapoint */
const kpi = {};
ids.forEach((i) => { const m = mapa[i]; kpi[i] = { rel: m.rel, dps: m.dps, sub: m.sub, agreg: m.agreg, desc: m.desc, nota: m.nota || '', dr: m.dps.length ? porId.get(m.dps[0]).dr : '' }; });

const saida = '/* Gerado por gerar-esrs.js. Nao editar a mao: alterar esrs-mapeamento.js e voltar a gerar.\n   Datapoints ESRS, glossario e ligacao aos indicadores do catalogo. */\nwindow.PORTAL_ESRS = ' + JSON.stringify({ versao: 'Simplified ESRS, July 2026', dps, glossario, kpi }) + ';\n';
fs.writeFileSync(path.join(__dirname, 'web-files', 'portal-esrs.js'), saida, 'utf8');
const rel = (r) => ids.filter((i) => mapa[i].rel === r).length;
const cobertos = new Set(Object.values(mapa).flatMap((m) => m.dps));
console.log(`portal-esrs.js: ${dps.length} datapoints, ${glossario.length} termos, ${ids.length} indicadores (${rel('direto')} diretos, ${rel('parcial')} parciais, ${rel('especifico')} especificos), ${cobertos.size} datapoints cobertos, ${saida.length} caracteres`);
