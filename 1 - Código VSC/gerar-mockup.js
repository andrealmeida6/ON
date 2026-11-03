/* Monta 3 - Mockups/mockup-final.html a partir das web pages, snippets e templates.
   O mockup nao se edita a mao: correr "node gerar-mockup.js" nesta pasta depois de cada alteracao. */
const fs = require('fs'), path = require('path');
const cod = __dirname, raiz = path.dirname(cod);
const ler = (...p) => fs.readFileSync(path.join(cod, ...p), 'utf8');
const relWeb = encodeURI('../' + path.basename(cod) + '/web-files/');
const ORDEM = ['Entrada', 'Inicio', 'Pendentes', 'Milestones', 'Milestone', 'Consolidado', 'Documentos', 'Relatorio', 'Historico', 'Auditoria', 'Backoffice', 'Pedidos'];

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
html = html
  .replace(/(href|src)="\/(global\.css|[\w.-]+\.js)"/g, (_, a, f) => a + '="' + relWeb + f + '"')
  .replace('<script src="' + relWeb + 'xlsx.full.min.js"', '<script>window.PORTAL_MODO = "mockup";</script>\n<script src="' + relWeb + 'xlsx.full.min.js"');
html = '<!-- Gerado por gerar-mockup.js. Nao editar: alterar as web pages, snippets ou templates. -->\n' + html;
const destino = path.join(raiz, fs.readdirSync(raiz).find((n) => n.startsWith('3 - ')), 'mockup-final.html');
fs.writeFileSync(destino, html, 'utf8');
console.log('mockup-final.html: ' + ORDEM.length + ' web pages, ' + (html.match(/<!-- snippet:/g) || []).length + ' snippets, ' + (html.match(/<!-- template:/g) || []).length + ' templates, ' + html.length + ' caracteres');
