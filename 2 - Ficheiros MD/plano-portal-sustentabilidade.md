# Plano do Portal de Sustentabilidade

Estado a 3 de novembro de 2026. A especificação funcional está em `especificacao-portal-sustentabilidade.md`.

## Como ver e alterar

- **Ver:** abrir `3 - Mockups/mockup-final.html` no navegador. Depende dos ficheiros de `1 - Código VSC/web-files/`, por isso a pasta do projeto tem de ir completa.
- **Alterar:** mudar as web pages, os snippets, os templates ou os web files e correr `node gerar-mockup.js` dentro de `1 - Código VSC/`. O mockup é gerado e não se edita à mão, por isso corresponde sempre ao código.

## Decisões

| Tema | Decisão | Motivo |
| --- | --- | --- |
| Tecnologia | Opção A da secção 21 (Power Pages e Dataverse) | O `CLAUDE.md` define Power Pages como destino |
| Layout | Os 3 mockups de referência mandam no desenho; a especificação manda nas funções | Indicação do André |
| Navegação | Cabeçalho numa linha em vez da navegação lateral da secção 14 | Vem do layout. No telemóvel mantém a barra inferior da especificação |
| Bloco de boas-vindas | Hero azul escuro com KPIs em vidro, em vez de um bloco claro | Vem do layout |
| Calendário | Azul, à direita e fixo ao fazer scroll | A forma vem do layout, a posição vem da secção 14.2 |
| Tipografia | Instrument Sans e JetBrains Mono, secção 22.2 | Os mockups usavam uma fonte de marca |
| Conteúdo dos mockups | Empresas, serviços e newsletters ficam de fora | São da outra plataforma. A especificação não os pede |
| Empresas | Sem nomes de empresas. As entidades são fictícias e o sistema de origem de exemplo é "ERP" | Indicação do André |
| Reguladores | ERSAR e APA mantêm-se, pela sigla | Decisão do André. São entidades públicas, não empresas. Os relatórios do setor usam a sigla ERSAR |

| Nome | Record to Report (R2R), em vez de Portal de Sustentabilidade | Indicação do André, 4 de novembro de 2026 |
| Língua | A plataforma (títulos, botões, mensagens, registos automáticos) está em inglês. O que se gere e escreve nas milestones fica em português: nomes de milestones, indicadores, passos, departamentos, empresas, comentários | Indicação do André |
| Home | Sem ciclo e sem data. As próximas entregas têm vista em board e em tabela, e um link para todas as milestones | Indicação do André. O ciclo gere-se no backoffice |
| Pendentes | Deixa de ser separador. O separador Milestones tem o contador e o filtro "Waiting on me" | Indicação do André |
| Empresas | Cada milestone pertence a uma empresa. As empresas são a tabela `esg_entidades`, geridas no backoffice | Indicação do André. Evita duas listas de entidades |
| Departamentos | São as tags das milestones e as unidades de utilizadores e indicadores, geridos no backoffice. Mudar o nome propaga a todos | Indicação do André. Evita duas listas de unidades |

## Marca (backoffice, separador Marca)

- **Logótipo:** um campo para o link web da imagem. Só aceita `http://` e `https://`. Ao guardar, aparece no cabeçalho, na entrada, no hero da página inicial e na impressão do relatório.
- **Se o link falhar:** a plataforma mostra o nome, nunca uma imagem partida. O backoffice avisa na pré-visualização.
- **Fundo azul:** o logótipo fica sobre um fundo branco, porque um logótipo escuro ou com fundo próprio não se veria.
- **Cores:** cinco cores configuráveis. Todos os tons derivados (hero, botões, cartões) calculam-se a partir delas. Os estados (aprovado, alerta, erro) são fixos, para manterem o significado.
- **Contraste:** o backoffice avisa quando a cor principal ou a do texto ficam abaixo de 4,5:1.
- **Por omissão:** paleta azul e nome "Record to Report (R2R)", sem logótipo. O monograma usa a sigla entre parênteses.

## Estrutura

| Peça | Conteúdo |
| --- | --- |
| Web pages (11) | Entrada, Inicio, Milestones, Milestone, Consolidado, Documentos, Relatorio, Historico, Auditoria, Backoffice, Pedidos |
| Web templates (5) | `layout-portal`, `cabecalho`, `navegacao-movel`, `paineis`, `bloco-dinamico` (recebe o parâmetro `id`) |
| Content snippets (11) | Textos de entrada, hero e introdução de cada página |
| `global.css` | CSS único |
| `portal-catalogo.js` | 70 indicadores e 25 milestones, gerados dos anexos A e B |
| `portal-nucleo.js` | Regras: estado, permissões, workflow, validação, importação, exportações, marca |
| `portal-paginas.js` | Desenho das páginas e ações |
| `xlsx.full.min.js` | SheetJS Community Edition 0.18.5, Apache-2.0 |

## GitHub Pages e Supabase

Pedido do André a 3 de novembro de 2026, para o portal funcionar online antes do Power Pages.

- **Pages:** o repositório é público, como o `Platform1`, porque o plano gratuito não permite Pages em repositórios privados. O `.nojekyll` publica os ficheiros tal como estão.
- **Duas versões, geradas por `gerar-mockup.js`:** `index.html` (site `https://andrealmeida6.github.io/ON/`), sem comentários de origem e com a entrada definida por `LOGIN_ONLINE`, e `3 - Mockups/mockup-final.html`, sem palavra-passe e com os dados no navegador. Nenhuma se edita à mão.
- **Supabase:** 23 tabelas `esg_*`, ao lado das tabelas da outra aplicação, sem lhes tocar. `supabase/001_esg_esquema.sql` cria o modelo, `002_esg_permissoes.sql` as permissões, `003_esg_empresas_departamentos.sql` as empresas e os departamentos (aplicado a 05/11/2026), `carregar-demonstracao.js` os dados fictícios e `repor-demonstracao.sql` limpa-os.
- **Login desligado por agora:** decisão do André, confirmada a 05/11/2026. Em `gerar-mockup.js`, `LOGIN_ONLINE = false`: o `index.html` abre logo como administrador, sem ecrã de entrada, e os dados ficam no navegador de cada pessoa. O Supabase está pronto e carregado, mas o site não o usa. Para voltar ao login e ao Supabase, pôr `LOGIN_ONLINE = true` e correr `node gerar-mockup.js`.
- **Login (quando ligado):** Supabase Auth, com o email ou só o nome de utilizador, e palavra-passe. Uma conta só entra se estiver ligada a um perfil, por `esg_utilizadores.auth_user_id`. As 16 contas de demonstração são `<login>@portal-esg.invalid`, e a palavra-passe não fica no repositório.
- **Sincronização:** `portal-supabase.js` compara o estado em memória com o último conhecido e envia só o que mudou. Se uma gravação falhar, avisa e volta a mostrar os dados da base de dados.
- **Aplicado na base de dados:** cada perfil lê e escreve só o que lhe cabe, um responsável só altera valores da sua unidade durante a recolha, só avança o passo que tem consigo, e eventos e versões não se alteram nem se apagam.

### Limitações do modo online

- **Atualização:** os dados de outros utilizadores só aparecem ao recarregar a página. Não há atualização em tempo real.
- **Backoffice, Utilizadores:** adicionar um utilizador cria o perfil, não a conta. A conta e a ligação ainda se criam à parte.
- **Regras só no navegador:** as faltas para submeter (valor, justificação, evidência) e a ordem dos passos para a equipa de sustentabilidade validam-se no navegador.
- **Evidências:** continua a guardar-se só o nome do ficheiro.
- **Entidades:** não se muda o nome de uma entidade que já tenha faturas associadas.

## O que falta para produção

1. **Dados:** o estado vive no `localStorage`. Falta criar as tabelas no Dataverse e trocar a secção "Armazenamento" de `portal-nucleo.js` pela Web API do portal.
2. **Autenticação e autorização:** no mockup entra-se sem palavra-passe e as permissões são aplicadas no navegador. Em produção têm de ser aplicadas no servidor (secção 20).
3. **Metadados:** não há ficheiros `.yml`. Ficam à espera de um `pac pages download` real, como manda o `CLAUDE.md`. Nessa altura os snippets passam para o formato de pastas do `pac`.
4. **Evidências:** só se guarda o nome do ficheiro. Falta o armazenamento de documentos, com hash e antivírus.
5. **Passos automáticos e notificações:** lembretes e notificações ficam dentro da plataforma. O envio por email ou Teams está por decidir.
6. **API e webhooks:** a secção 19 aparece só como contrato na visão técnica.

## Limitações conhecidas do mockup

- **Série histórica de 2011 a 2024:** é ilustrativa, porque a especificação não traz os valores. A página avisa. Falta a série publicada.
- **Valores de demonstração:** são fictícios desde 3 de novembro de 2026, com a mesma ordem de grandeza, incluindo os números citados nas regras de coerência. Só os valores 0 e 100% ficaram iguais. Os commits anteriores a essa data ainda têm os valores originais.
- **Derivados:** entram como valor, com a fórmula à vista. Calculá-los exige os dados base, que ainda não estão no catálogo.
- **Backoffice, Indicadores e milestones:** permite pesquisar, mudar a evidência obrigatória e o prazo. Ainda não cria indicadores nem milestones novos.
- **Novo ciclo:** os prazos usam intervalos fixos por periodicidade. A especificação recomenda gerá-los a partir das janelas de reporting.
- **Segregação de funções:** não está forçada, como a secção 4 prevê para o protótipo.
- **Protótipo original:** o ficheiro referido na especificação não foi entregue. A referência funcional foi o texto da especificação.

## Em aberto

Secção 23 da especificação.
