/* Carrega no Supabase os dados de demonstracao do mockup (catalogo, milestones, valores).
   Corre uma vez, com uma conta de administrador. A palavra-passe nunca fica no repositorio:
     $env:ESG_EMAIL = '...'; $env:ESG_SENHA = '...'; node carregar-demonstracao.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const web = path.join(__dirname, '..', 'web-files');
const { ESG_EMAIL, ESG_SENHA } = process.env;
if (!ESG_EMAIL || !ESG_SENHA) throw new Error('Defina ESG_EMAIL e ESG_SENHA.');

const guardado = {};
const armazem = { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = v; }, removeItem: (k) => { delete guardado[k]; } };
const ctx = { console, fetch, URL, Blob: globalThis.Blob, Intl, sessionStorage: armazem, localStorage: armazem, document: { addEventListener() {}, documentElement: { style: { setProperty() {} } } } };
ctx.window = ctx;
vm.createContext(ctx);
['portal-catalogo.js', 'portal-supabase.js', 'portal-nucleo.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(web, f), 'utf8'), ctx, { filename: f }));

const S = ctx.Portal.dadosDemonstracao();
const B = ctx.PortalBackend;
B.configurar({ url: 'https://yujhfscnnngaivwwunom.supabase.co', chave: 'sb_publishable_wU6S2mgSbmnTzz4hQMKZ6g_jTj6MMgo' });
B.entrar(ESG_EMAIL, ESG_SENHA)
  .then(() => B.enviarTudo(S))
  .then(() => {
    const l = B.linhas(S);
    Object.keys(l).forEach((t) => console.log(t + ': ' + Object.keys(l[t]).length));
  })
  .catch((e) => { console.error('FALHOU: ' + e.message); process.exit(1); });
