/* Monta 3 - Mockups/mockup-final.html a partir das web pages, snippets e templates.
   O mockup nao se edita a mao: correr "node gerar-mockup.js" nesta pasta depois de cada alteracao. */
const fs = require('fs'), path = require('path');
const cod = __dirname, raiz = path.dirname(cod);
const ler = (...p) => fs.readFileSync(path.join(cod, ...p), 'utf8');
const relWeb = encodeURI('../' + path.basename(cod) + '/web-files/');
const ORDEM = ['Entrada', 'Inicio', 'Milestones', 'Milestone', 'Timeline', 'Consolidado', 'Estado', 'Dados', 'Aprovacoes', 'Documentos', 'Evidencias', 'Relatorio', 'Historico', 'Auditoria', 'Trilho', 'Backoffice', 'Pedidos'];

const resolver = (html) => html
  .replace(/\{\{\s*snippets\['([^']+)'\]\s*\}\}/g, (_, nome) => {
    const f = ['content-snippets', ...nome.split('/')];
    f[f.length - 1] += '.html';
    return '<!-- snippet: ' + nome + ' -->\n' + resolver(ler(...f));
  })
  .replace(/\{%\s*include\s+'([^']+)'((?:\s+\w+:\s*'[^']*',?)*)\s*%\}/g, (_, nome, params) => {
    let t = ler('web-templates', nome + '.html');
    for (const m of params.matchAll(/(\w+):\s*'([^']*)'/g)) t = t.split('{{ ' + m[1] + ' }}').join(m[2]);
    return '<!-- template: ' + nome + ' -->\n' + resolver(t);
  });

const paginas = ORDEM.map((n) => '<!-- web page: ' + n + ' -->\n' + resolver(ler('web-pages', n, n + '.webpage.copy.html')).replace('data-pagina=', 'hidden data-pagina=')).join('\n');
const naoUsadas = fs.readdirSync(path.join(cod, 'web-pages')).filter((d) => d !== '.gitkeep' && !ORDEM.includes(d));
if (naoUsadas.length) throw new Error('Web pages fora do mockup: ' + naoUsadas.join(', '));

let html = resolver(ler('web-templates', 'layout-portal.html').replace(/\{%\s*block main\s*%\}\{%\s*endblock\s*%\}/, () => paginas));
const montar = (web, config) => '<!-- Gerado por gerar-mockup.js. Nao editar: alterar as web pages, snippets ou templates. -->\n' + html
  .replace(/(href|src)="\/(global\.css|[\w.-]+\.js)"/g, (_, a, f) => a + '="' + web + f + '"')
  .replace('<script src="' + web + 'xlsx.full.min.js"', '<script>' + config + '</script>\n<script src="' + web + 'xlsx.full.min.js"');
/* Ambiente de testes partilhado (portal-partilha.js): mesma base Supabase, tabelas esg_teste_ (015_esg_ambiente_teste.sql) */
const PARTILHA = 'window.PORTAL_PARTILHA = ' + JSON.stringify({ url: 'https://yujhfscnnngaivwwunom.supabase.co', chave: 'sb_publishable_wU6S2mgSbmnTzz4hQMKZ6g_jTj6MMgo' }) + ';';
const MODO_MOCKUP = 'window.PORTAL_MODO = "hash"; ' + PARTILHA;
/* A chave publicavel foi feita para estar no navegador: quem protege os dados e o RLS */
const BACKEND = { url: 'https://yujhfscnnngaivwwunom.supabase.co', chave: 'sb_publishable_wU6S2mgSbmnTzz4hQMKZ6g_jTj6MMgo', dominio: 'portal-esg.invalid' };

/* Mockup: sem palavra-passe e com os dados no navegador */
const mockup = montar(relWeb, MODO_MOCKUP);
fs.writeFileSync(path.join(raiz, fs.readdirSync(raiz).find((n) => n.startsWith('3 - ')), 'mockup-final.html'), mockup, 'utf8');
/* Plataforma online (GitHub Pages). Com LOGIN_ONLINE = true pede utilizador e palavra-passe e guarda os dados no Supabase.
   Por agora esta desligado, por decisao do Andre a 05/11/2026: entra-se logo como administrador e os dados ficam no navegador.
   Sem os comentarios de origem dos blocos, que so servem o mapeamento para Power Pages. */
const LOGIN_ONLINE = false;
const ENTRADA_DIRETA = 'window.PORTAL_ENTRADA_DIRETA = "admin";';
const configOnline = LOGIN_ONLINE ? MODO_MOCKUP + ' window.PORTAL_BACKEND = ' + JSON.stringify(BACKEND) + ';' : MODO_MOCKUP + ' ' + ENTRADA_DIRETA;
fs.writeFileSync(path.join(raiz, 'index.html'), montar(encodeURI(path.basename(cod) + '/web-files/'), configOnline).replace(/<!--[\s\S]*?-->\s*/g, ''), 'utf8');
console.log('mockup-final.html e index.html: ' + ORDEM.length + ' web pages, ' + (mockup.match(/<!-- snippet:/g) || []).length + ' snippets, ' + (mockup.match(/<!-- template:/g) || []).length + ' templates, ' + mockup.length + ' caracteres');
