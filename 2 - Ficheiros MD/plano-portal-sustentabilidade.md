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

## Pedido de dados, explorador e grelha

Pedido do André a 5 de novembro de 2026.

- **Tabelas de milestones:** as colunas são Milestone, Company, Assigned to, Due e Status, sem Departments nem Workflow. O Assigned to mostra a pessoa escolhida ou a tag de quem tem o passo atual. A atribuição faz-se nos Details da milestone e no Backoffice, e não muda quem pode agir. A Auditoria e o Backoffice seguem a mesma regra e mantêm as colunas próprias. A coluna Department do catálogo de indicadores fica, porque é o dono do indicador.
- **Página Milestones:** cards por empresa à esquerda, calendário à direita. A empresa só se filtra ao entrar no card (`?empresa=`), e o calendário acompanha. Exporta para Excel. Os lembretes foram retirados.
- **Data request:** cada milestone diz que dados e que ficheiros são pedidos e o que falta. Os ficheiros obrigatórios passam a impedir a submissão. Os ficheiros por departamento estão em `FICHEIROS_BASE`, em `portal-nucleo.js`, e são exemplos a confirmar. A equipa pode acrescentar outros em cada milestone.
- **Data explorer:** cilindro com uma camada por tema. `P.podeVerIndicador` define os acessos: admin, equipa e auditor veem tudo, um responsável vê os indicadores do seu departamento e das suas milestones. O relatório vive só na sessão, não fica guardado.
- **Grelha:** `portal-grelha.js`. Colar procura primeiro cabeçalhos e indicadores, por ID ou nome e em qualquer ordem, e só depois cola por posição a partir da célula ativa. Recusa unidades erradas e explica o que não aplicou.
- **Ao voltar a ligar o login:** aplicar `supabase/004_esg_atribuicao_ficheiros.sql` e recarregar os dados, porque os nomes das pessoas mudaram. Esta parte ainda não foi testada online.
- **Limitação:** os ficheiros continuam a guardar-se só pelo nome, não o conteúdo.

## Controlo: perímetro, atribuição, aprovações e registo

Pedido do André a 5 de novembro de 2026, a partir dos 9 ecrãs de `ESG Data Lake.html`. Entrou o que a plataforma não tinha. O nome R2R, o inglês da interface e os dados fictícios ficam. Saíram a marca da consultora, o nome do cliente e os lembretes, por indicação anterior.

| Ecrã recebido | Onde ficou | Nota |
| --- | --- | --- |
| Visão geral | Overview (`Consolidado`) | Consolidado ou por empresa, completude ESRS, origem dos dados e atividade, todos calculados |
| Estado de reporte | Reporting status (`Estado`) | Sem lembretes, e com Company e Assigned to em vez de "entidades reportadas" |
| Entrada de dados | Data entry (`Dados`) | Manual com várias entradas, Excel e contrato de API |
| Workflow de aprovação | Approvals (`Aprovacoes`) | Por milestone, porque o nosso workflow é por milestone. Sem "Rejeitar" |
| Audit trail | Audit trail (`Trilho`) | Cadeia SHA-256 calculada de verdade |
| Calculatória | Calculations (`Calculos`) | Fórmulas do catálogo e cálculo do Âmbito 1. Sem "Nova fórmula" |
| Atribuição de KPIs | KPI assignment (`Atribuicao`) | Bloqueia a mesma pessoa a submeter e a aprovar |
| Evidências | Evidence (`Evidencias`) | O pacote é um índice em Excel, não um ZIP |
| Empresas e perímetro | Companies and perimeter (`Perimetro`) | Detenção, método e regras de introdução por KPI |

- **Navegação:** barra lateral em ecrã largo, como no HTML recebido, porque 15 páginas não cabem no cabeçalho. Abaixo de 1100 px mantém-se o menu no cabeçalho e a barra inferior.
- **Segregação de funções:** passa a ser forçada. Quem submeteu uma milestone não conclui a revisão, o parecer nem a aprovação, mesmo sendo administrador. Pode devolver.
- **Consolidação:** Integral conta a 100%, Proporcional pela detenção, Equivalência patrimonial e empresas excluídas não contam. Percentagens e rácios não se ponderam. Como cada indicador pertence a uma só milestone e a uma só empresa, o consolidado pondera o valor dessa empresa, não soma várias empresas para o mesmo indicador.
- **Atribuição:** define o dono do KPI em Reporting status. Quem pode agir continua a ser quem pertence ao departamento do passo.
- **Registo:** cada gravação sela os eventos novos, encadeados com SHA-256. Detecta alterações e remoções de eventos, versões e configuração selados. Corre no navegador, por isso quem controla o armazenamento pode refazer a cadeia. A imutabilidade real exige o servidor.
- **Exemplos a confirmar:** fatores de emissão, perímetro, detenções, códigos NACE e ligações. As ligações não sincronizam, ficam a aguardar credenciais.
- **Login:** as tabelas novas estão em `supabase/005_esg_controlo_esrs_report.sql` (inclui o 004) e os dados em `006_esg_dados_controlo_esrs.sql`, gerado por `gerar-006-dados.js`. Correm-se no editor do Supabase por esta ordem e nenhum apaga dados. A sincronização (`portal-supabase.js`) já escreve e lê estas tabelas, mas a versão com login não foi testada online com elas. O registo de configuração e os selos só aceitam linhas novas, nem o administrador os altera.
- **Código:** `portal-controlo.js` tem as regras e `portal-gestao.js` as páginas.

## IDs ESRS, KPI master e quadros do Report

Pedidos do André a 5 de novembro de 2026, a partir do modelo de datapoints ESRS em Excel e das páginas 56 a 59 de um relatório de sustentabilidade em PDF. Nada na plataforma cita a consultora, o relatório nem a empresa que o publicou.

**IDs e descrições.** Os 70 indicadores mantêm o ID da plataforma (A01, E06) e ganham a ligação aos datapoints do Excel: 10 diretos, 31 parciais e 29 específicos, sem datapoint. O mapeamento e as descrições em português são uma proposta, em `1 - Código VSC/esrs-mapeamento.js`, a confirmar pela equipa de sustentabilidade. O código ESRS mostrado passa à numeração de 2026 (energia E1-7, emissões E1-8, efetivos S1-5).

**Restante informação do Excel.**

| Coluna do Excel | Onde ficou |
| --- | --- |
| IG3 ID, parágrafo, AR, tipo de dado, texto oficial | KPI master, datapoints |
| Unidade, cálculo, frequência, perímetro, departamento, uso | Já existiam no catálogo, a exportação preenche-as |
| Pessoa responsável | KPI assignment |
| Tópico, subtópico e agregação | Proposta no mapeamento. A agregação do Excel é sempre "End-of-period date", o que não serve para fluxos como a energia |
| Controlos | Gerados das regras da plataforma, com campo para outros |
| Frequência de recolha, disponibilidade, fonte, decisão de divulgar | Por preencher no KPI master |
| Definition of terms | Glossário no KPI master, com 25 termos por definir |

**Quadros do Report.** Natural World, Climate, Social e Societal, com o desenho do relatório no ecrã, em Excel e em Word. As linhas ligadas a um indicador vêm da plataforma; as restantes têm valores fictícios editáveis. O destaque "France data" passou a "National data" e o nome do auditor saiu. O texto das páginas 57 a 63 não foi copiado, por ser próprio da empresa; entra pelos blocos de texto do documento.

**Montagem do documento.** No separador Document builder escolhem-se os quadros, títulos, textos e legenda, muda-se a ordem e exporta-se para Word. O Excel e o Word são escritos em `portal-quadros.js`, porque a biblioteca de folhas não grava formatos.

**Regenerar.** `node gerar-esrs.js "<Excel>"` e depois `node gerar-mockup.js`. O Excel não fica no repositório.

## Milestone numa só página, com fontes de dados e cálculos

Pedido do André a 5 de novembro de 2026. A milestone deixou de ter separadores: as secções seguem a ordem do trabalho (pedido, fontes e cálculos, dados, ficheiros, exploração, evidências, contribuições externas, auditoria e conversa), com um índice ao lado.

- **Campos dos dados:** cada indicador é uma fórmula sobre campos de seis bases (ERP, RH, telemetria, laboratório, comercial e ambiente). A vista técnica com o ficheiro da milestone (milestone_id, indicator_id) saiu; a API e o JSON Schema mostrados são os dos campos.
- **Puxar, calcular e preencher:** puxar lê os registos de cada campo da milestone, os cálculos mostram a fórmula com os valores e o resultado, e preencher grava os valores com versão e fica no histórico. Só quem pode preencher a milestone o faz.
- **Fórmulas:** aparecem em cada indicador do formulário, da revisão e da leitura. P09, P10 e P13 não tinham fórmula no catálogo e ganharam uma.
- **Limitação:** nenhuma base está ligada. Os registos são de teste, gerados em `portal-fontes.js`, e aparecem como "Test data". O endpoint da API está como planeado.
- **Exemplos alterados:** as quantidades da biblioteca de fatores passaram a dar as emissões de Âmbito 1 do ano anterior (eram 5 vezes menores).

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
- **Protótipo original:** o ficheiro referido na especificação não foi entregue. A referência funcional foi o texto da especificação.

## Em aberto

Secção 23 da especificação.
