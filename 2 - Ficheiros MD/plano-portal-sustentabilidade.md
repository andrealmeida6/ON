# Plano do Portal de Sustentabilidade

Estado a 7 de novembro de 2026. A especificação funcional está em `especificacao-portal-sustentabilidade.md`.

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

| Nome | ESG Data Hub, em vez de Record to Report (R2R) e, antes, Portal de Sustentabilidade | Indicação do André, 10 de novembro de 2026 |
| Língua | A plataforma (títulos, botões, mensagens, registos automáticos) está em inglês. O que se gere e escreve nas milestones fica em português: nomes de milestones, indicadores, passos, departamentos, empresas, comentários | Indicação do André |
| Home | Sem ciclo e sem data. As próximas entregas têm vista em board e em tabela, e um link para todas as milestones | Indicação do André. O ciclo gere-se no backoffice |
| Pendentes | Deixa de ser separador. O separador Milestones tem o contador e o filtro "Waiting on me" | Indicação do André |
| Empresas | Cada milestone pertence a uma empresa. As empresas são a tabela `esg_entidades`, geridas no backoffice | Indicação do André. Evita duas listas de entidades |
| Departamentos | São as tags das milestones e as unidades de utilizadores e indicadores, geridos no backoffice. Mudar o nome propaga a todos | Indicação do André. Evita duas listas de unidades |
| Hero da home | Só a saudação e os KPIs. A frase "You have N milestones waiting" saiu, porque o KPI Waiting on you já o diz | Indicação do André, 7 de novembro de 2026 |

## Marca (backoffice, separador Marca)

- **Logótipo:** um campo para o link web da imagem. Só aceita `http://` e `https://`. Ao guardar, aparece no cabeçalho, na entrada, no hero da página inicial e na impressão do relatório.
- **Se o link falhar:** a plataforma mostra o nome, nunca uma imagem partida. O backoffice avisa na pré-visualização.
- **Fundo azul:** o logótipo fica sobre um fundo branco, porque um logótipo escuro ou com fundo próprio não se veria.
- **Cores:** cinco cores configuráveis. Todos os tons derivados (hero, botões, cartões) calculam-se a partir delas. Os estados (aprovado, alerta, erro) são fixos, para manterem o significado.
- **Contraste:** o backoffice avisa quando a cor principal ou a do texto ficam abaixo de 4,5:1.
- **Por omissão:** paleta azul e nome "ESG Data Hub", sem logótipo. O monograma usa a sigla entre parênteses, se existir; senão, as iniciais das palavras com maiúscula (EDH). Uma marca gravada com um dos nomes antigos passa sozinha ao novo nome, no navegador e na base de dados (`supabase/010_esg_nome_plataforma.sql`). Uma marca personalizada fica como está.

## Estrutura

| Peça | Conteúdo |
| --- | --- |
| Web pages | Entrada, Inicio, Milestones, Milestone, Consolidado, Documentos, Relatorio, Historico, Auditoria, Backoffice, Pedidos |
| Web templates (5) | `layout-portal`, `cabecalho`, `navegacao-movel`, `paineis`, `bloco-dinamico` (recebe o parâmetro `id`) |
| Content snippets (11) | Textos de entrada, hero e introdução de cada página |
| `global.css` | CSS único |
| `portal-catalogo.js` | 70 indicadores e 25 milestones, gerados dos anexos A e B |
| `portal-nucleo.js` | Regras: estado, permissões, workflow, validação, importação, exportações, marca |
| `portal-paginas.js` | Desenho das páginas e ações |
| `portal-folhas.js` | Folha de cada ficheiro pedido: preencher, puxar da base de dados, importar e entregar |
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
- **Data request:** cada milestone diz que dados e que ficheiros são pedidos (o cartão de resumo do topo saiu a 7 de novembro de 2026). Os ficheiros obrigatórios passam a impedir a submissão. Os ficheiros por departamento estão em `FICHEIROS_BASE`, em `portal-nucleo.js`, e são exemplos a confirmar. A equipa pode acrescentar outros em cada milestone.
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

- **Navegação:** cabeçalho no topo com Home e Milestones à vista e cinco menus (Monitoring, Data, Reporting, Control, Administration). A barra lateral saiu a 7 de novembro de 2026, por indicação do André. Abaixo de 1100 px os menus abrem-se em lista e mantém-se a barra inferior.
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

- **Campos dos dados:** cada indicador é uma fórmula sobre campos de seis sistemas (financeiro, RH, telemetria, laboratório, comercial e ambiente). Dentro da milestone só aparece o nome do dado, a unidade, os indicadores que o usam e o valor; os nomes técnicos dos campos, as tabelas de origem, a API e o JSON Schema não aparecem.
- **Puxar, calcular e preencher:** puxar lê os registos de cada campo da milestone, os cálculos mostram a fórmula com os valores e o resultado, e preencher grava os valores com versão e fica no histórico. Só quem pode preencher a milestone o faz.
- **Fórmulas:** aparecem em cada indicador do formulário, da revisão e da leitura. P09, P10 e P13 não tinham fórmula no catálogo e ganharam uma.
- **Limitação:** nenhuma base está ligada. Os registos são de teste, gerados em `portal-fontes.js`, e aparecem como "Test data". O endpoint da API está como planeado.
- **Exemplos alterados:** as quantidades da biblioteca de fatores passaram a dar as emissões de Âmbito 1 do ano anterior (eram 5 vezes menores).

## Preencher os ficheiros pedidos na plataforma

Pedido do André a 7 de novembro de 2026: em cada ficheiro pedido da milestone, colocar os dados diretamente nas colunas necessárias e puxá-los da base de dados no mesmo momento.

- **Onde:** na tabela Requested files, cada pedido tem o botão "Fill in here" ao lado de "Upload". Abre um painel largo com uma folha. Depois de entregue, o botão passa a "Edit data", e quem só lê vê "View data". Um rascunho mostra quantas células já estão preenchidas.
- **Colunas:** uma linha por mês do ano da milestone, uma coluna por campo das fontes de que os indicadores precisam e uma coluna Source reference. Os campos vêm de `P.camposMilestone`, filtrados pelas bases que cada departamento costuma extrair (`BASES_UNIDADE`). Se o filtro não deixar nenhum campo, ficam todos os campos da milestone. "Columns of this request" mostra o campo, a unidade, a origem, a agregação e os indicadores que o usam.
- **Obrigatório:** todos os meses nas somas e nas médias. Nos últimos valores bastam os meses de fim de trimestre. A linha Total aplica a agregação do campo e fica fixa no fundo.
- **Pull from the database:** preenche as células vazias e as que já vinham da base. As que a pessoa editou ficam, e a plataforma diz quantas diferem, com as opções "Use the database values" e "Keep mine". A referência do registo vai para Source reference.
- **Outras entradas:** escrever na célula, colar um bloco do Excel (reconhece os cabeçalhos e os meses, ou cola por posição), importar um `.xlsx`, `.csv` ou `.json`, e descarregar um template com as colunas certas.
- **Origem de cada célula:** azul claro vem da base de dados, branco foi escrito ou colado, amarelo difere da base (a barra de fórmula mostra o valor da base), vermelho é erro (valor negativo, texto, percentagem acima de 100).
- **Deliver data:** só fica ativo sem erros e sem células obrigatórias vazias. Gera o ficheiro do pedido (`<prefixo>-<milestone>-<ano>.xlsx`, com `-v2` nas versões seguintes), guarda os dados com ele em `documentos_gerais`, regista o evento com quantas células vieram da base e quantas foram escritas, envia os totais para os campos das fontes e preenche os indicadores que já se conseguem calcular. O rodapé do painel diz que indicadores vão ser atualizados.
- **Copiar do Excel do computador:** seleciona-se o bloco no Excel, Ctrl+C, clica-se numa célula da folha e Ctrl+V. Com cabeçalhos, as colunas reconhecem-se pelo nome (em qualquer ordem) e as linhas pelo mês (`Jan 2026`, `2026-01`, `1`). Sem cabeçalhos, cola por posição a partir da célula ativa. O que não entra fica listado em "Not applied".
- **Impacto nos indicadores:** por baixo da folha, cada indicador que usa estas colunas mostra a fórmula com os valores, o ano anterior, o valor atual, o valor com esta folha, a variação e a validação do indicador (erro, alerta com o limiar, ou válido). Recalcula a cada célula. Os campos que não estão na folha vêm do último pull da milestone; se faltarem, diz quais. Usa `P.calculosMilestone(m, sobre)`, que aceita valores a sobrepor sem gravar nada.
- **Gravação:** o rascunho grava-se a cada alteração em `m.folhas`. A versão entregue fica também em `documentos_gerais`, que já sincroniza com o Supabase.
- **Limitações:** o rascunho ainda não sincroniza com o Supabase (falta a coluna `folhas` em `esg_milestones`). Os registos puxados continuam a ser de teste e, nas percentagens, são limitados a 100%. O ficheiro entregue guarda o nome e os dados, não gera o `.xlsx` no servidor.

## Períodos de reporte, timeline e reutilização dos trimestres

Pedido do André a 7 de novembro de 2026, com os prazos de uma entidade gestora de água como a Entidade A.

- **Períodos:** T1 a T4 e o Ano, em `S.periodos` (`esg_periods`), editáveis no Backoffice, separador Reporting periods. Cada trimestre tem fecho interno 45 dias depois do fim (15 mai, 14 ago, 13 nov, 12 fev); o ano fecha a 26 de fevereiro.
- **Entregas externas** (`S.relatorios`, `esg_reports`), com a base legal à vista e o prazo editável:

| Entrega | Entidade | Prazo do ano N | Base |
| --- | --- | --- | --- |
| Publicação trimestral da qualidade da água | ERSAR | 60 dias úteis após cada trimestre | DL 152/2017, art. 17.º (sistemas em baixa) |
| Resultados anuais do PCQA | ERSAR | 31 de março de N+1 | DL 152/2017, art. 15.º, n.º 5 |
| Relatório de Qualidade do Serviço | ERSAR | fim de março de N+1 | Regulamento ERSAR n.º 446/2024 |
| MIRR e gases fluorados | APA | 31 de março de N+1 | SILiAmb |
| Relatório e Contas consolidado | Acionistas | 31 de maio de N+1 | CSC, art. 65.º |
| Relatório de Sustentabilidade | Público | 30 de junho de N+1 | Calendário interno |

- **Milestones:** o que é mensal ou trimestral passa a ter uma milestone por trimestre (`M01-T1` a `M01-T4`). Os dados mensais entram na milestone do trimestre, com uma linha por mês na folha do pedido, porque é a prática do mercado: recolha mensal na origem, entrega e aprovação trimestral, e só alguns temas (energia, água, emissões) com mais de uma recolha por trimestre. O que é anual fica no período Ano. Cada departamento com dados trimestrais tem uma "Consolidação anual" (`M26` a `M33`).
- **Valores por período:** as milestones trimestrais guardam os valores em `2026-T3:<indicador>`; as anuais continuam em `2026:<indicador>`, que é o que vai para o relatório. `P.chave(m)` escolhe a chave. Num trimestre, a comparação é com o mesmo trimestre do ano anterior; sem ele, com a quarta parte do ano anterior nas somas.
- **Reutilizar os trimestres:** a milestone anual mostra o cartão "Reported in the quarters" com T1 a T4, a regra (`P.agregacao`: soma para volumes e horas, último trimestre para efetivos e ativos, média para taxas), o valor do ano e o valor atual. "Use the quarters" grava o valor com a origem "from quarters T1, T2, T3". Enquanto faltar um trimestre aprovado, avisa que é year to date. A regra pode ser fixada por indicador no catálogo com `agregacao`.
- **Tags:** cada milestone mostra o período (T3 2026, Ano 2026) e as entregas que alimenta (RS, RQS, PCQA, MIRR, GF, R&C, QA T3), nas tabelas, no board, nas listas da home e no cabeçalho da milestone.
- **Timeline:** página própria, Reporting timeline (web page `Timeline`), no menu Monitoring e nos botões "Reporting timeline" da Home (Upcoming deliveries) e de Milestones. Saiu da Home e de Milestones a 7 de novembro de 2026, por indicação do André. Mostra os trimestres, o ano e a consolidação, os fechos internos, as entregas externas (todas, as passadas a cinzento) e o dia de hoje. Cada período abre a lista de Milestones filtrada (`?periodo=2026-T3`). Até 720 px passa a uma lista vertical por ordem de data, com o dia de hoje no sítio certo.
- **Demonstração:** T1 e T2 aprovados, T3 com os estados de demonstração anteriores, T4 em recolha e consolidações à espera do T4. São 69 milestones.
- **Limitações:** `esg_valores.ano` no Supabase é um ano; os valores trimestrais precisam de uma coluna de período antes de voltar a ligar o login. `supabase/carregar-demonstracao.js` ainda usa os IDs antigos. Os prazos legais são um ponto de partida a confirmar com o jurídico.

## Linha do tempo do workflow na milestone

Pedido do André a 7 de novembro de 2026.

- **Saiu** o cartão "Data request" do topo da milestone (anel de percentagem, os três passos e "See what is missing"). O breadcrumb do workflow já mostra onde está a milestone, porque só avança com tudo entregue; o que falta continua a aparecer ao submeter.
- **Botão Timeline** (relógio) ao lado do workflow. Abre por baixo uma linha do tempo e volta a esconder-se no mesmo botão (`U.wfHist`).
- **O que mostra:** abertura da recolha, cada passo concluído, as validações automáticas e as devoluções (a vermelho, com o comentário), o passo atual (a pulsar, com o tempo decorrido), os passos que faltam e o prazo. Entre cada etapa aparece o tempo que passou, e o comprimento da ligação acompanha esse tempo. Em cima: tempo decorrido, passos feitos, passo mais longo e número de devoluções. No telemóvel fica na vertical.
- **Dados:** `P.historicoWf(m)` lê os eventos da milestone. Os eventos do workflow passaram a guardar `wf` (criada, avanco, auto, devolucao) e `passo`; os antigos reconhecem-se pelo texto. A recolha de um trimestre abre no fim do trimestre e a do ano a 1 de janeiro.

## Tipos de dados, lançamento de milestones e separador Data store

Pedido do André a 7 de novembro de 2026, tendo o Workiva como referência de mercado e corrigindo as críticas mais frequentes que lhe fazem.

**Críticas frequentes ao Workiva e o que o R2R faz diferente**

| Crítica (G2, SoftwareReviews, Dcycle) | No R2R |
| --- | --- |
| Curva de aprendizagem e navegação difícil de início | O contribuidor só vê a sua milestone, com uma folha e um botão para puxar da base de dados. O lançamento é um assistente em quatro passos com pré-visualização |
| "Ease of customization" é a capacidade com pior nota; dependência de consultores para configurar | Tipos de dados e lançamento de milestones no Backoffice, sem código: nome, formatos, colunas, granularidade, instruções |
| "Automatic data collection" é a funcionalidade com pior nota | Cada coluna de um tipo de dados está ligada a um campo de uma base de origem, por isso pode ser puxada em vez de escrita |
| Ligações frágeis entre documentos; mudanças de estrutura partem referências | As colunas usam IDs estáveis dos campos. Ao gravar, o editor diz que milestones abertas vão mudar; o que já foi entregue mantém a versão com que foi entregue |
| Implementação demorou mais do que o previsto | Os tipos de dados vêm pré-carregados por departamento e o mapa de cobertura mostra logo o que falta lançar |

**O que foi feito**

- **Listas de milestones:** o botão de ação (Review, Approve, Fill in) saiu das listas, também no computador. No telemóvel, até 1100 px, cada linha é um cartão com o título e o estado em cima, as tags por baixo e uma linha com empresa, responsável e prazo.
- **Milestone com dois separadores:** Work (tudo o que já existia, numa página com índice) e Data store (o cilindro). O cilindro só mostra as camadas que a milestone alimenta e, dentro delas, só os indicadores dela.
- **Backoffice, Data types** (`S.tipos`, `esg_data_types`): o que cada departamento entrega. Cada tipo tem nome, motivo, departamento, formatos aceites, linhas da folha (mensal, trimestral ou anual), se é obrigatório, instruções e colunas (as que os indicadores da milestone usam, ou uma lista fixa escolhida por base de dados, com os campos usados marcados). Mostra a pré-visualização da folha, as milestones que o usam e grava versões. Pode arquivar-se.
- **Backoffice, Launch milestones:** mapa de cobertura departamento por período, com o estado de cada milestone e as células por lançar ("+ Launch"). O assistente escolhe períodos, departamentos, tipos de dados e indicadores de cada um (pré-preenchidos a partir do plano), empresa e prazo (o fecho do período ou uma data), mostra o que vai ser criado e o que já existe, e lança. Na demonstração, o T4 de Frota e Compras fica por lançar.
- **Folha do pedido:** usa as colunas e a granularidade do tipo de dados; o pull junta os registos de cada linha com a regra do campo. As instruções aparecem no topo da folha.
- **Supabase:** `007_esg_periodos_tipos.sql` (aplicado a 7 de novembro de 2026) cria `esg_periodos`, `esg_relatorios` e `esg_tipos_dados`, acrescenta `periodo` aos valores, versões e evidências (chave `indicador_id, ano, periodo`), e `periodo`, `consolida`, `tipos` e `folhas` às milestones e `wf` e `passo` aos eventos. `portal-supabase.js` sincroniza tudo isto. `gerar-007-dados.js` gera `007_esg_dados_demonstracao.sql`, que apaga e volta a carregar os dados de demonstração.
- **Limitações:** o lançamento usa o workflow base.

## Comentários e chat das milestones

Pedido do André a 7 de novembro de 2026.

- **Comentários na milestone:** a secção Conversation passa a mensagens em bolhas, agrupadas por dia. Cada comentário guarda o passo do workflow em que a milestone estava (`passo`) e aparece com essa tag. Na caixa de escrita escolhe-se se é sobre a milestone toda ou sobre um indicador, e a tag do passo atual mostra-se antes de enviar.
- **Comentários nos indicadores:** cada indicador da milestone (na recolha, na revisão e em leitura) tem um botão de comentários com o número de mensagens. Abre um painel só com a conversa desse indicador.
- **Devoluções, decisões e pedidos do auditor** também ficam com o passo e, no caso do auditor, com o indicador.
- **Chat:** botão flutuante no canto inferior direito, com o número de mensagens por ler. Abre uma janela tipo WhatsApp em que cada conversa é uma milestone: avatar do departamento, última mensagem, hora e mensagens por ler; pesquisa e filtros (All, With messages, Unread, With me). À direita, a conversa com o período e o estado da milestone, um atalho para a abrir, e a caixa de escrita (Enter envia, Shift+Enter muda de linha). No telemóvel ocupa o ecrã inteiro, com a lista e a conversa em separado.
- **Quem vê o quê:** administrador, equipa de sustentabilidade e auditor veem todas as milestones; cada departamento vê as suas e as que têm passos seus; externos não têm chat. As mensagens por ler contam-se por pessoa, neste navegador.
- **Código:** `web-files/portal-chat.js`; contentor `data-chatapp` no template `paineis`.
- **Supabase:** `esg_comentarios` ganhou `passo` e `indicador_id` (no `007_esg_periodos_tipos.sql`). Os dados de demonstração foram carregados a 7 de novembro de 2026: 66 milestones, 214 valores, 337 passos, 232 eventos e 10 comentários.

## Dados técnicos fora da milestone

Dentro da milestone o contribuidor vê apenas o que precisa para preencher e validar:

- **Data and calculations:** nome do dado, unidade, indicadores que o usam e valor puxado, com o detalhe dos registos. Saíram o nome técnico do campo, a base e a tabela de origem, a regra de agregação e o bloco da API com o JSON Schema.
- **Cálculos:** a fórmula aparece em palavras ("Soma da água entrada no sistema"); onde falta um valor aparece "?" em vez do nome do campo.
- **Folha do pedido:** saiu a lista de bases e tabelas; a tabela de colunas mostra só a coluna, como as linhas se somam e os indicadores.
- **ERP:** a plataforma deixou de usar o termo; passa a "Financial system" na interface e "Sistema financeiro" nas integrações.
- **Onde fica o técnico:** o mapeamento dos campos continua no backoffice (Data types), só para quem gere a plataforma.

## Menus por perfil

- **Responsável de departamento:** vê só Home e Milestones, com a folha de cada pedido dentro da milestone e o chat no canto. No telemóvel a barra fica com Home e Milestones; o botão More sai porque não abriria nada de novo. O botão da timeline também deixa de aparecer.
- **Equipa de sustentabilidade e administrador:** veem tudo, incluindo Monitoring, Data, Reporting, Control e Administration.
- **Auditor:** vê Monitoring, Data (sem Data entry), Reporting e Control.

## Ficha de definição por indicador

- **Onde aparece:** na ficha de cada indicador, logo a seguir aos valores. Quem preenche lê-a antes de submeter.
- **Conteúdo:** o que conta, o que não conta, a fonte, o responsável (departamento e pessoa da atribuição), o cálculo e as mudanças face aos anos anteriores.
- **Mudança este ano:** aparece em destaque, com a tag "Changed in 2026".
- **Quem altera:** só a equipa de sustentabilidade e o administrador. Cada gravação sobe a versão, fica no registo de configuração e deixa um aviso nas milestones abertas que têm o indicador.
- **Demonstração:** 31 indicadores com definição; cinco com mudanças em 2026 (A01, A03, A11, E06, P01). Os restantes mostram "To define".
- **Supabase:** tabela `esg_definicoes` (migração 008).

## Saídas nos formatos de destino

- **Página Outputs (Reporting):** um cartão por entrega do ano, com o destino, o prazo, o modelo, os formatos, os valores aprovados e o último ficheiro gerado. Há filtros por entidade.
- **Entregas e formatos:**
  - ERSAR (QA trimestral, PCQA, RQS) e APA (MIRR, gases fluorados): Excel com três folhas (Cover, Data, Checks). A folha Data leva o valor, o período anterior, a variação, o estado, a qualidade, as evidências, o que conta e a fonte.
  - R&C: quadros com o modelo da Entidade A, em Excel e Word.
  - Relatório de Sustentabilidade: documento com o modelo da Entidade A, em Word e Excel.
- **Final ou rascunho:** quando nem todos os valores estão aprovados, o ficheiro sai como rascunho, com "_draft" no nome e na capa.
- **Valores anuais sem consolidação:** vêm dos trimestres, com a indicação de quantos trimestres entraram.
- **Registo:** cada ficheiro gerado fica registado, com a versão, quem o gerou e quantos valores estavam aprovados. Supabase: tabela `esg_saidas`, onde só se acrescenta.
- **Em aberto:** confirmar o desenho com os formulários atuais do portal da ERSAR e do SILiAmb antes da primeira submissão real. Hoje a plataforma gera um desenho próprio, organizado como esses formulários.

## Ambiente de testes

Pedido do André a 8 de novembro de 2026: entrar numa plataforma sem dados, lançar e atribuir milestones de raiz e entrar no perfil de cada pessoa.

- **Como entrar:** menu da conta (avatar), "Open test environment", ou o link com `?ambiente=teste`. Sai-se com "Back to main environment" ou `?ambiente=principal`. A escolha fica guardada no navegador.
- **O que tem:** as mesmas pessoas, empresas, departamentos, indicadores, workflow base, períodos, entregas, tipos de dados, definições e marca. Não tem milestones, valores, comentários, documentos, pedidos externos, saídas nem registo de configuração.
- **Separação:** grava com o prefixo `tst_` no `localStorage` (e a sessão e o chat também), por isso nunca mexe nos dados do ambiente principal. "Clear test environment" volta a pôr o ambiente vazio.
- **Sinal:** tag "Test environment" no cabeçalho e cartão no ecrã de perfis. Nesse ecrã, cada pessoa mostra quantas milestones tem à espera dela.
- **Corrigido pelo caminho:** com só trimestres lançados, a página Overview falhava, porque procurava o valor anual. As vistas anuais passam a contar só os indicadores que já têm milestone anual.
- **Limitação:** vive só no navegador de quem testa; não vai ao Supabase.

## Backoffice mais curto, filtros nas tabelas e datas

Pedido do André a 8 de novembro de 2026.

- **Saíram do Backoffice:** Data types, Reporting cycle e Brand. O que está fechado ou aberto passa a ser dado pelas milestones de cada período, não por um ciclo. Os tipos de dados continuam a existir por baixo, um por departamento, e as folhas dos pedidos continuam a usá-los; deixaram de se editar e de aparecer no lançamento.
- **Marca:** passa ao menu do avatar, só para o administrador ("Brand"), num painel. Cancelar desfaz a pré-visualização; "Save brand" grava.
- **Formatos:** os dados entram só em Excel (`.xlsx`): pedidos de dados, importação, folhas e entrada de dados (`P.ACEITA_DADOS`). PDF só nos documentos de suporte, como faturas (evidências, documentos gerais, contribuições externas: `P.ACEITA_SUPORTE`, `.xlsx,.pdf`). Saiu o template CSV. Os dados já gravados num navegador passam a `xlsx` ao abrir.
- **Filtros tipo Excel:** `web-files/portal-filtros.js`. Todas as tabelas `.ps-t` com 3 ou mais linhas ganham, em cada coluna, um botão que abre ordenação (A a Z, números, datas), pesquisa de valores e caixas com contagem. Por cima da tabela aparecem os filtros ativos, "N of M rows" e "Clear all". Os campos de pesquisa das páginas mantêm-se e somam-se aos filtros. O estado guarda-se por tabela enquanto a página está aberta e sobrevive aos redesenhos. No telemóvel, botão "Filter and sort" e uma folha que sobe do fundo. Excluem-se as colunas sem nome e "Actions"; uma tabela pode excluir-se com a classe `ps-sem-filtro`.
- **Datas:** `P.fmtData` e `P.fmtDataHora` dão sempre `dd/mm/aaaa` (e `dd/mm/aaaa hh:mm`), também no calendário e no chat.
- **Fica por decidir:** os campos de data do navegador (`type="date"`) mostram a data no formato do idioma do navegador, e nomes de indicadores como "a 31/12" são uma referência ao fim do ano, não uma data.

## Frequência, momentos de report e pop-ups

Pedido do André a 8 de novembro de 2026.

- **Frequência:** na tabela Indicators do Backoffice, a coluna Frequency é uma lista (Monthly, Quarterly, Annual). Mensal e trimestral entram nos trimestres; anual entra no Ano. Ao gravar, fica no registo de configuração e a plataforma diz que milestones abertas têm o indicador; essas ficam como foram lançadas.
- **Reporting moments (Backoffice):** matriz indicador por momento: T1 a T4, Year e as entregas QA, PCQA, RQS, MIRR, GF, R&C e RS. Por omissão, os períodos vêm da frequência e as entregas das regras que já existiam (`P.entregasPadrao`). Marcar ou desmarcar uma caixa grava em `c.momentos` e o indicador fica com a tag "Custom" e um "Reset". Um indicador tem sempre pelo menos um período. Por cima, o total de indicadores por momento; tem pesquisa e os filtros tipo Excel.
- **Quem usa a matriz:** o lançamento de milestones (`P.indicadoresSugeridos`, por indicador e pelo departamento do plano ou do catálogo), as tags "Feeds" das milestones (`P.relatoriosDe`) e a página Outputs (`P.indicadoresEntrega`). Na QA trimestral entra o indicador que tem a QA e esse trimestre.
- **Supabase:** `009_esg_momentos_report.sql` acrescenta `momentos` (jsonb) a `esg_indicadores`; a sincronização já a escreve.
- **Pop-ups:** todos os painéis laterais (lançar milestones, ficha do indicador, folhas dos pedidos, marca, tipos, workflow, comentários) abrem ao centro, por cima da página. No telemóvel ocupam o ecrã inteiro. Só mudou o CSS (`[data-painel] .ps-pan`).

## Explicações e lançamento por período

Pedido do André a 8 de novembro de 2026.

- **"i" de informação:** `tabela()` aceita `info` em cada coluna e põe um "i" no cabeçalho, com a explicação ao passar o rato, ao tocar ou com o teclado. Usado em Required evidence: quem preenche tem de anexar um documento de suporte (Excel, ou PDF como uma fatura); a milestone não se submete sem ele, aparece como ficheiro obrigatório e entra no pacote de evidências do auditor.
- **Versões:** "Version N" na definição do indicador e "vN" na última saída gerada têm uma explicação ao passar o rato (quantas vezes foi gravada ou gerada, e que nada se perde).
- **Ordem do Backoffice:** Reporting moments vem antes de Launch milestones, porque decide o que se lança.
- **Lançar um período inteiro:** saiu o botão do topo. Cada período tem, no cabeçalho do mapa, "Launch T1 2026" com o número de departamentos por lançar; abre a pop-up já com esse período e esses departamentos, e basta confirmar. Quando não falta nada, mostra "All launched".

## Pop-up sem piscar, atribuição ao lançar e avatares

Pedido do André a 8 de novembro de 2026.

- **Pop-ups suaves:** `pintarPainel` só redesenha o cabeçalho, o corpo e o rodapé quando o pop-up já está aberto; a animação de abertura não se repete e o scroll mantém-se. O pop-up de lançamento tem altura fixa (`alto`), para não saltar quando a lista encolhe. Os campos têm `id` estável, para o foco ficar onde estava.
- **Atribuição no lançamento:** o passo 3 passa a "Who it is assigned to and what is asked". Cada departamento tem "Assigned to" com o departamento inteiro ou os responsáveis desse departamento. O resumo final mostra a quem fica cada milestone. Ao lançar, a milestone regista "Assigned to ...".
- **Avatares em toda a plataforma:** pessoas com uma bolinha com as iniciais do primeiro e do último nome (`pessHtml`, `avPessoa`); departamentos com o símbolo de uma equipa (`depHtml`, `avEquipa`). Usados nas listas e tabelas de milestones (Assigned to e tags), no lançamento, nos departamentos das tabelas do Backoffice, na lista de utilizadores, no mapa de cobertura e na atribuição de KPIs. Os filtros das tabelas leem o nome e ignoram as iniciais (`data-fx-ignorar`).

## Requested data único, pull com pop-up e atribuição no workflow

Pedido do André a 8 de novembro de 2026.

- **Sem "·":** a plataforma deixou de usar o ponto do meio. ":" entre um grupo e o que lhe pertence (Recursos Humanos: Inês Faria, Operações: T1 2026, passo: responsável); vírgula nas listas; o tempo até ao prazo entre parênteses (12/02/2027 (in 96 days)).
- **Nomes:** `quemHtml` mostra a bolinha com as iniciais nas pessoas, o símbolo de equipa nos departamentos e equipas, e nada em "System". Usado no workflow, no histórico, nos comentários, nos documentos, nas versões, nos ficheiros entregues, nas saídas e no Owner da definição.
- **Requested data:** junta o que eram "Data from the systems", "Calculations" e "Requested data". Em cima, "Source data": cada dado com a unidade, "Used by" (com "i"), o sistema e o seu estado, e o valor editável (marcado "From the system" ou "Typed"). Em baixo, os indicadores: os que se calculam das fontes ficam sombreados, sem campo, com a fórmula e os valores; os outros escrevem-se. Mudar uma fonte recalcula logo (`P.sincronizarCalculados`, com `it.daFonte`).
- **Pull data from the systems:** só fica ativo se algum sistema da milestone estiver ligado; senão aparece desativado com a explicação. Abre um pop-up com a data da última atualização (ou "Live data"), o estado de cada sistema, o que vai ser preenchido (agora e depois) e os indicadores que ficam calculados; "Fill in" aplica. Depois pode-se editar cada valor ou "Clear source data", que esvazia também o que foi calculado, enquanto a milestone está em recolha. Tudo fica no histórico.
- **Ligações:** cada sistema tem estado e frequência (Live, uma vez por hora, por dia, por semana, por mês). Na demonstração: Telemetria em tempo real; sistema financeiro, LIMS e CRM uma vez por dia; RH e gestão ambiental à espera de credenciais. O administrador muda o estado em Connections to other systems.
- **Atribuição no workflow:** por baixo de "Current" aparece quem tem a milestone e um lápis; nos Details também. Abre um pop-up com o departamento e as pessoas; gravar regista "Assigned to ..." no histórico.
- **Barra de ação:** "Submit milestone" (ou devolver e aprovar, na revisão) fica sempre visível no fundo do ecrã, com quantos indicadores têm valor e o que falta.
- **Separadores Work e Data store:** sem barra de deslocamento vertical.

## Atribuir a qualquer pessoa e Requested data numa só lista

Pedido do André a 8 de novembro de 2026.

- **Atribuir:** o pop-up mostra em cima a equipa e o responsável do departamento e, por baixo, "Anyone else in the company", com pesquisa por nome ou departamento que filtra enquanto se escreve. Quem fica com a milestone atribuída pode preenchê-la e vê-a nas suas listas, mesmo sendo de outro departamento (`P.podeAgir`, `doUtilizador`). O departamento continua a poder agir.
- **RH ligado:** o sistema de RH passa a "Connected", sincronizado uma vez por dia. Nos navegadores com dados antigos passa a ligado ao abrir, a não ser que o administrador o tenha mudado.
- **Uma só lista:** em Requested data, cada indicador aparece com os seus dados logo por cima (`P.fontesDoIndicador`): o dado, o sistema e o estado, a unidade e o valor editável. Um dado usado por mais do que um indicador só se edita no primeiro; nos seguintes aparece como referência ("Same value as in A01 above").
- **Vistas:** "Data and indicators" (a lista), "Indicators only" (esconde os dados) e "Grid", que aparece logo no topo do cartão.

## Waiting on you, empresas, Requested data simples, pedidos de ajuda e pull por indicador

Pedido do André a 9 de novembro de 2026.

- **Waiting on you:** o administrador já não vê todas as milestones em que pode agir, só as do passo dele ou as que lhe estão atribuídas (`P.esperaPor`). Vale para a Home, o filtro de Milestones, Approvals ("Waiting on me"), o chat ("With me") e as notificações. Quem recebeu um pedido de ajuda pendente também vê essa milestone (`esperaMim`). Os outros perfis ficam como estavam.
- **Empresas com ícone:** um edifício ao lado do nome da empresa, como o símbolo das equipas (`empHtml`, `avEmpresa`). Aparece nas listas e tabelas de milestones, na timeline, no quadro, no breadcrumb, na etiqueta do banner, nos Details, nas aprovações, nas evidências, no trilho de auditoria, na atribuição de KPIs, no perímetro e nos pedidos.
- **Requested data mais simples:** uma linha por indicador, como na grelha: nome (com ID, unidade e marcas como Calculated ou Evidence required), valor do ano anterior, valor do período, variação, estado e comentários. A seta abre o detalhe: definição e fórmula, dados de origem, alertas e justificação, qualidade, evidência e "Request assistance". As linhas com erro ou alerta abrem sozinhas; "Expand all" abre todas. As vistas passam a List e Grid.
- **Request assistance:** substitui "Ask an external entity". Abre um pop-up com o indicador, a pessoa (qualquer utilizador interno, com pesquisa por nome ou departamento, primeiro os do mesmo departamento), a mensagem (pré-preenchida e editável) e o prazo. Enviar regista o pedido (`P.pedirAjuda`, `tipo: 'ajuda'`), deixa a mensagem no chat da milestone com a menção e cria uma notificação para essa pessoa. Ela responde em "Assistance requests" com o valor e uma nota (`P.responderAjuda`); quem pediu decide se usa o valor ("Use this value").
- **Pull data from system:** novo nome do botão e do pop-up. O pop-up mostra a data da última atualização e, por indicador (fechado por omissão), o valor agora e depois e o que muda. Aberto, mostra os dados usados (agora, da fonte e registos lidos), a fórmula com os valores e os detalhes técnicos de cada dado: objeto de origem, campo, filtros (código de empresa, ano fiscal, períodos), agregação, registos e a consulta. A nomenclatura técnica segue a do ERP de origem (tabelas `ZESG_*`, `BUKRS`, `GJAHR`, `POPER`), mas a plataforma nunca diz qual é o sistema. Pela mesma razão, os dados de origem em Requested data e o histórico deixaram de mostrar o nome do sistema.
- **Limitação:** os campos novos dos pedidos de ajuda (`tipo`, `para`, `pedido_por`, `nota`) ainda não vão para o Supabase; ficam no `localStorage`.

## Botão de upload de documentos

Pedido do André a 9 de novembro de 2026.

- O "Choose File" nativo do browser foi substituído por um seletor próprio (`ficheiroHtml(id, aceita)` em `portal-paginas.js`, disponível também em `P.ext`). O input nativo fica escondido dentro de um `label.ps-fic`. Mostra um botão azul "Choose file" com um ícone de upload, o nome do ficheiro escolhido (ou "No file chosen") e os formatos aceites (por exemplo "XLSX, PDF"). Com um ficheiro escolhido, a caixa passa a verde (`.tem`, via `Live.ficNome`).
- Usa-se no envio de valores das entidades externas (Data requests). Os outros uploads da plataforma (Deliver, Import, Attach, evidências, marca e dados) já abriam o seletor a partir de um botão `ps-btn` e ficam iguais.
- O CSS está na secção 31 de `global.css`. Também estiliza com `::file-selector-button` qualquer `input type=file` nativo que surja no futuro, para manter o mesmo aspeto.

## Requested files no topo, números inteiros e tooltip da fórmula

Pedido do André a 9 de novembro de 2026.

- **Requested files no topo da milestone:** o cartão `cartaoFicheiros(m)` passou para o início de Requested data. Só aparece quando há ficheiros mesmo precisos (ou ficheiros largados à espera de envio), para todos os perfis, admin incluído. Para pedir um ficheiro novo, o admin usa o botão "Request a file" na barra de Requested data, que abre um pop-up (`Pn.pedirFicheiro`) com o nome e "Required". Assim que o pedido é adicionado, o cartão aparece no topo.
- **Quando é preciso um ficheiro** (`P.ficheirosPedidos` põe `preciso`, `porque` e `faltam` em cada ficheiro, em `portal-nucleo.js`):
  - **Ficheiro de dados:** só é preciso enquanto algum dos indicadores que cobre (pelas colunas da folha) não tiver valor. Assim que os dados chegam do sistema ou são preenchidos no ecrã, deixa de ser pedido.
  - **Evidência de um indicador:** decisão do André: só fica dispensada quando o valor veio do sistema (`P.doSistema`: calculado da fonte e sem nenhum dado de origem escrito à mão). Se o valor foi digitado, a evidência continua obrigatória. `P.evidenciaPrecisa(m, id)` aplica esta regra na submissão, na lista, na grelha, em Evidence and quality e na Auditoria.
  - **Ficheiros pedidos à parte** pelo admin: são sempre precisos.
  - O cartão explica a regra num aviso. Os ficheiros que não são precisos ficam num "N files not needed" fechado, cada um com o motivo.
- **Área de drag and drop:** (atualizado mais abaixo, em "Uma só forma de introduzir dados") larga-se vários ficheiros de uma vez. Cada um entra numa fila com um dropdown de categoria: um dos ficheiros pedidos ou "Other supporting document". A categoria é sugerida pelo nome do ficheiro (prefixo do tipo, ID ou nome do indicador; senão o primeiro ainda por entregar). Se o formato não servir para a categoria, a linha fica a vermelho. "Upload N files" entrega tudo e deixa na fila só os que falharem. Estado em `U.dzFila`, ações `dzEscolher`, `dzTirar`, `dzLimpar`, `dzEnviar` e `C.dzCat`.
- **Números inteiros:** `P.inteiro(c)` é verdadeiro para unidades de contagem (n.º, nº, número, number, count) ou quando o catálogo tem `inteiro: true/false`.
  - **Indicadores inteiros:** A06, A09, R02, P02, C01, P01, P05, P17, N06, N07, N08.
  - **Ficam com decimais:** A04 (clientes em milhares), C02 (NPS), P12 (horas), valores em €, toneladas e %.
  - `P.validar` dá o erro "Whole numbers only" em todos os fluxos: ecrã, grelha, importação, pedidos de ajuda, entidades externas, reexpressão e lançamento manual.
  - Os campos inteiros têm `inputmode="numeric"` e `data-int`, que bloqueia a vírgula e o ponto.
  - **Dados de origem:** também são inteiros os de contagem (`P.campoInteiro`), exceto médias como o efetivo médio. Os valores de teste puxados do sistema já vêm inteiros.
  - **Linhas "Number" dos quadros do Report:** também só aceitam inteiros.
- **Sem "ƒ":** o símbolo foi retirado de todo o lado. Nos indicadores calculados aparece um "i" (`infoFormula`) com um tooltip próprio: título "Formula" e a fórmula em letra mono. Ao expandir a linha, a definição continua a mostrar "Formula:".
- **CSS:** secção 32 de `global.css` (`.fp-*`, `.rq2-nl`, `.ps-info-f`, `.ps-tip.form`), com versão para telemóvel.

## Uma só forma de introduzir dados

Pedido do André a 9 de novembro de 2026. Havia demasiadas formas de pôr dados na milestone: escrever em Requested data, puxar do sistema, o cartão Import file (com "Test with a sample file"), a área de drag and drop e a folha "Fill in here". Ficou assim:

- **Valores:** entram só em **Requested data**. Ou vêm do sistema ("Pull data from system") ou são escritos no ecrã, na lista ou na grelha. A grelha aceita colar do Excel. "Request assistance" continua para pedir ajuda a alguém.
- **Ficheiros:** entram só em **Requested files**. É um ficheiro por linha pedida, entregue por "Upload" ou largando o ficheiro em cima da linha (`data-dzf`, `entregarLargados`). Ao arrastar por cima, a linha mostra "Drop to upload as …" (`.fp-solta`). Se se largarem vários ficheiros noutro sítio do cartão, vão para a fila com o dropdown de categoria. A área tracejada grande e "choose files" (`dzEscolher`) saíram.
- **"Fill in here" passou a "Fill in on screen"** (`ficIrDados`, `irParaDados`). Já não abre a folha mensal: vai para Requested data, muda para a vista List e abre e destaca (`.rq2-flash`) os indicadores sem valor que o ficheiro cobriria. O cursor fica no primeiro. Quem só lê continua a ver "View data" nas entregas antigas feitas pela folha.
- **Removido:** o cartão Import file (Import file, Excel template, Test with a sample file), o relatório de importação (`relatorioImport`, `impAplicar`) e `P.importarFicheiroM`. O template Excel continua no painel técnico.
- O aviso do cartão explica a regra: os dados entram em Requested data e só são precisos os ficheiros listados.

### Um só cartão e assistente de importação de Excel

Pedido do André a 9 de novembro de 2026: juntar Requested files e Requested data no mesmo cartão e criar um assistente para importar Excel.

- **Cartão único** (`#rq-dados`, `sepRecolha`) com dois separadores (`abaRecolha`, `irAba`, estado em `U.rqAba`):
  - **Fill in on screen:** lista ou grelha de Requested data, com a contagem "N of M to fill in". Largar um Excel neste painel abre o assistente. Largar outro ficheiro manda-o para a fila de ficheiros e muda de separador.
  - **Upload files:** é `cartaoFicheiros(m, true)`. Mostra as linhas dos ficheiros pedidos (largar em cima entrega) ou "No file is required…". Por baixo fica a zona **Other files** (`.fp-outra`, `fpOutros`), onde se põem outros documentos de suporte.
  - "Fill in on screen" numa linha de ficheiro, os erros ao submeter e a fila de ficheiros mudam sozinhos para o separador certo.
  - Fora da recolha (leitura ou revisão), o cartão de ficheiros continua separado como antes.
- **Import from Excel** (`Pn.importar`, `wzAbrir`) tem 4 passos:
  1. **Choose the file:** zona de largar ou botão. O template Excel está disponível aqui.
  2. **Pick the columns:** escolhe-se a folha e a linha dos cabeçalhos, e clica-se na pré-visualização para dizer qual é a coluna do indicador e qual é a do valor. O assistente deteta tudo sozinho: a folha com mais correspondências, a linha de cabeçalhos, a coluna do indicador por ID ou nome e a coluna do valor pelo ano da milestone, evitando o ano anterior.
  3. **Match the indicators:** cada indicador mostra a linha encontrada (pode-se trocar) e o estado: Ready, Check (alerta), Must be a whole number, Not a number, Empty ou Not in file. Só se incluem os que têm um valor válido. Os indicadores calculados a partir de dados de origem ficam de fora.
  4. **Review and fill in:** mostra os valores novos, os substituídos e os que ficam iguais, os alertas e a opção "Keep file as supporting document". "Fill in N values" grava os valores com origem "import from Excel", regista o evento, muda para o separador do ecrã e destaca as linhas.
- **CSS:** secção 33 de `global.css` (`.rq-aba*`, `.rq-pan*`, `.fp-emb`, `.fp-outra*`, `.wz-*`), com versão para telemóvel.

### Home com Reporting status e My tasks, Excel offline e importação da matriz

Pedido do André a 10 de novembro de 2026, com base em erros encontrados em teste.

- **Home, topo:** os quatro cartões de milestones deram lugar ao progresso do **Reporting status** (bloco `inicio-estado`, dentro do snippet `Inicio/Hero`). A conta é a mesma da página Reporting status, por KPI: Approved, In approval, In progress, Missing e Overdue, com uma barra. Cada número abre a página já filtrada (`iniEstado`). Quem contribui vê só os seus KPIs.
- **My tasks** (bloco `inicio-tarefas`; desde 11 de novembro o título do cartão é só **Tasks**, porque o filtro Mine / Everyone já diz de quem são) substitui "Milestones waiting on you". É uma tabela com uma linha por KPI e período: KPI, Period, Perimeter, Assigned to, Deadline e Status. Usa Perimeter e não Company, porque o perímetro pode ser uma unidade de negócio. A gestão alterna entre Mine e Everyone.
- **Removido:** o cartão Upcoming deliveries (`inicio-entregas`, `entVista`), que repetia a mesma informação.
- **Separador My tasks:** o antigo separador Milestones do cabeçalho e da navegação móvel chama-se agora My tasks e abre `Milestones?minhas=1` (`data-nav-q`). Com esse filtro, o título da página também passa a My tasks. A web page continua a chamar-se Milestones.
- **Tabelas de milestones e KPIs:** o período tem coluna própria, e Company passa a Perimeter e Due a Deadline. Aplica-se a `COLS_MS`, ao Reporting status, a Approvals e à exportação.
- **Data entry, justificação:** a lista de data points juntava o mesmo KPI do trimestre e do ano. O ecrã validava contra uma milestone e o Save value contra outra, e por isso pedia "Write the justification." com o valor dentro do limiar. A escolha passa a ser o par milestone e KPI (`U.de.ms`). O período mostrado é o da milestone e a comparação é feita com o período anterior certo.
- **Excel offline** (`P.folhasOffline`, painel `offline`, separador Excel upload do Data entry): descarrega os KPIs em recolha com a pessoa, no formato do import e já com os valores gravados, para preencher fora da plataforma e carregar de novo. As linhas que não mudaram são ignoradas e não geram versão.
- **Um valor por empresa:** a opção "One row per company" põe no ficheiro uma linha por empresa do perímetro do grupo. Ao importar, as linhas são juntas pela regra do indicador e o valor de cada empresa fica guardado como entrada (`juntarPorEmpresa`). Na entrada manual, o botão "One row per company" faz o mesmo. A entrada com vários valores está disponível em todos os KPIs, com a agregação do indicador quando a empresa não tem regra própria.
- **KPI assignment, importação:** aceitava apenas as colunas exatas do export. Passa a aceitar o export da matriz, o KPI master (Platform KPI, Responsible person e Responsible department) e ficheiros do cliente em .xlsx, .xls ou .csv (`P.lerLivro`, `analisarAtrib`):
  - Encontra sozinha a folha e a linha dos cabeçalhos, mesmo com linhas de título por cima.
  - Identifica o KPI pelo ID, pelo ID ESRS ou pelo nome.
  - Reconhece as pessoas pelo nome, pelo login ou pelo departamento.
  - Só altera os papéis que vêm preenchidos.
  - Mostra na página o que foi usado e as linhas que não foram aplicadas, com o motivo.
- **CSS:** secção 34 de `global.css`.

### Alertas na linha de Requested data, sem abrir a linha

Pedido do André a 10 de novembro de 2026.

- **Antes:** depois de Pull data from system, cada indicador com alerta abria sozinho os detalhes, e o cartão ficava muito comprido.
- **Agora:** as linhas com alerta ficam fechadas. Na coluna Status, o alerta aparece como um ícone com o número de alertas (`alertaHtml`, `.rq2-al`). Ao passar o rato ou o foco por cima do ícone, a tooltip mostra o texto do alerta e diz se falta a justificação.
- **Justificação:** escreve-se ao abrir a seta da linha. Se faltar ao submeter, a linha abre sozinha e o cursor vai para o campo.
- **Erros:** uma linha com erro continua a abrir sozinha (`rqAberto`).
- **CSS:** secção 35 de `global.css`.

### Confirmação do Clear source data

Pedido do André a 10 de novembro de 2026.

- **Antes:** o botão Clear source data usava o `confirm` do browser.
- **Agora:** abre um pop-up próprio (`Pn.limparFontes`, `fdLimparSim`) com o título "Clear source data?". O pop-up pergunta se o utilizador tem a certeza e diz que os dados vão ser apagados:
  - quantos dados de origem há, vindos do sistema ou escritos à mão;
  - quantos valores calculados ficam vazios, com a lista dos indicadores.
- Os valores escritos à mão ficam como estão.
- O botão de confirmação é vermelho ("Yes, clear the data") e Cancel não apaga nada.
- **CSS:** secção 36 de `global.css` (`.ps-conf*`, `.ps-btn.err.cheio`).

### Backoffice no avatar e só duas empresas

Pedido do André a 10 de novembro de 2026.

- **Barra de topo:** deixa de ter o menu Administration. A barra fica com Home, My tasks, Monitoring, Data, Reporting e Control.
- **Avatar:** o menu do avatar tem agora uma área **Backoffice** com Backoffice, KPI assignment e Companies and perimeter. Só aparece a quem tem acesso a essas páginas, ou seja, ao administrador e à equipa de sustentabilidade. Nessas páginas, o avatar fica marcado.
- **Empresas:** os dados de demonstração passam a ter só a **Entidade A** (empresa-mãe) e a **Entidade B** (integral, 100%). As milestones repartem-se entre as duas.
- **Dados guardados no browser:** `VERSAO_DADOS` subiu para 10, por isso os dados de demonstração voltam a ser carregados. Isto apaga o que foi feito no mockup nesse browser, em ambos os ambientes.
- **Supabase:**
  - `011_esg_entidades_a_b.sql` cria as duas empresas e as regras de introdução, passa as milestones e os documentos para a Entidade A e apaga as outras empresas.
  - `007_esg_dados_demonstracao.sql` foi gerado de novo com os nomes novos.
  - Ordem: 010, 011, 007.
- **CSS:** secção 37 de `global.css`.

### Backoffice por grupos e página única dos indicadores

Pedido do André a 10 de novembro de 2026: KPI assignment e Companies and perimeter dentro do Backoffice, e uma única página, simples e prática, para gerir os indicadores, com Excel no layout do ficheiro `TEMPLATE_ESG KPIs (1).xlsx` e envio de tasks.

**Backoffice**

- **Grupos** (`BO_GRUPOS`): Indicators (Indicators, Tasks sent), Organisation (Companies and perimeter, Departments, Users and profiles, External entities), Reporting set-up (Reporting periods, Reporting moments, Launch by department, Base workflow, Calendar, Materiality and frameworks) e Platform (Data consumer areas, Data and storage).
- **Páginas removidas:** as web pages `Atribuicao` e `Perimetro` e os seus snippets. Os links antigos abrem o separador certo do Backoffice (`lerRota`). O separador abre-se por `Backoffice?tab=...`.
- **Companies and perimeter** é agora um separador, que junta o perímetro e a lista de empresas (`B.perimetro`).
- **KPI assignment** deixou de existir como página: quem reporta, revê e valida define-se em cada indicador. Os separadores Validation rules e Companies foram absorvidos (o limiar está no indicador).
- **Avatar:** a área Backoffice tem três atalhos: Indicators, Companies and perimeter e Settings.

**Página Indicators** (`portal-indicadores.js`, `B.indicadores`)

- **Lista:** uma linha por indicador, com o responsável (pessoa ou departamento), a empresa que reporta, as empresas abrangidas e o estado da task no período escolhido. Tem pesquisa, filtros e cinco cartões clicáveis (ativos, sem pessoa, não enviados, tasks abertas, aprovados).
- **Painel do indicador** (`Pn.indEd`): tudo num sítio, por secções: Identification, Responsibility, Companies, Characteristics, ESRS reference, Controls, Availability, Disclosure e histórico de alterações. Serve para editar e para criar.
- **Responsável:** uma pessoa ou o grupo, que é o departamento inteiro (`P.responsavelInd`; grupo quando `S.atrib[id].submete` está vazio). Quem reporta não pode rever nem validar.
- **Empresas:** Companies covered (`c.empresas`, as empresas cujos dados o indicador inclui) e Reporting company (`c.reporta`, a empresa que tem de reportar e recebe a task).
- **Limite do modelo:** cada indicador tem um valor por período. Com várias empresas abrangidas, o valor entra por empresa (Data entry ou Excel offline, "One row per company") e é junto pela agregação do indicador. Não há uma task por empresa para o mesmo indicador.
- **Editar vários** (`Pn.indLote`): departamento, responsável, revisor, validador, empresa que reporta, frequência, limiar, evidência e estado.
- **Enviar tasks** (`Pn.indEnviar`, `P.planoEnvio`, `P.enviarTarefas`): escolhe-se o período e o prazo e vê-se o que vai ser enviado antes de enviar. Há uma task por empresa que reporta e responsável. Junta-se a uma task aberta igual, se existir. Os inativos e os já enviados ficam de fora, com o motivo.
- **Lembretes** (`P.lembrarTarefas`): ficam no histórico da task e nas notificações de quem a tem. Não há envio por email.
- **Indicadores inativos** (`c.ativo`): ficam no histórico, mas não são enviados.
- **Registo:** cada alteração fica no registo de configuração (`P.eventoGlobal`), com o valor anterior e o novo.

**Excel**

- **Exportar** (`exportar`, com a biblioteca ExcelJS em `exceljs.min.js`): segue o modelo. Tem título, faixa de cor por grupo, explicação de cada coluna em amarelo, cabeçalhos, linhas alternadas, colunas de leitura a cinzento, painéis fixos, filtro, listas de valores nas células (folha oculta `Lists`), 60 linhas em branco para indicadores novos e a folha "How to use".
- **Colunas:** as do modelo (KPI Name, KPI Description, ESRS Topic, ESRS DR, IG3 ID, Company Topic, Disclosure Type, Data Type, Unit, Calculation, Reporting Frequency, Data collection frequency, Data Aggregation Type, KPI Scope, Responsible Department, Responsible Person, Available, Source / System, Control Description, Disclosure of KPI, Report Use), mais KPI ID, Status, Decimals, Reviewer, Validator, Companies covered, Reporting company, Change threshold e Evidence required.
- **Importar** (`analisar`, `Pn.indImp`): aceita o ficheiro exportado e o modelo de datapoints. Encontra a folha e a linha dos cabeçalhos, e mostra antes de gravar o que muda (valor antigo e novo), o que é novo, o que fica igual e os erros por linha.
- **Modelo de datapoints ESRS:** as linhas aplicam-se ao indicador que o datapoint alimenta e só mudam o que a empresa preenche. Os datapoints sem indicador ficam de fora, com aviso.

**Ideias tiradas das críticas ao Workiva** (ver a tabela mais abaixo): tudo numa página, com menos cliques; edição em lote; pré-visualização antes de enviar ou importar; estado das tasks à vista; lembretes; ida e volta simples com o Excel; registo de alterações.

**Supabase:** `012_esg_indicadores_config.sql` acrescenta a coluna `config` (jsonb) aos indicadores. Correr depois do 011.

**CSS:** secção 38 de `global.css`.

### Utilizadores com vários departamentos e Departments

Pedido do André a 11 de novembro de 2026.

**Users and profiles**

- **Só pessoas:** a tabela só tem pessoas. O papel vem da coluna Profile: Administrator, Sustainability team, Data owner ou Auditor.
- **Pessoas no lugar dos registos de sistema:** os utilizadores "Administrador da plataforma", "Equipa de sustentabilidade" e "Auditor externo (assurance)" passam a ser Helena Martins, Rita Sousa e Nuno Ferreira, com o mesmo login interno. A 11 de novembro, a pedido do André, o administrador (login `admin`), que é o utilizador com que o site entra por omissão, passou a chamar-se **Service account**. Os dados já gravados no browser mudam sozinhos. O histórico antigo mantém o nome que tinha.
- **Entidades externas:** já não aparecem nesta tabela. Estão em External entities.
- **Sem coluna de login:** o nome de utilizador é gerado a partir do nome completo (`P.loginDe`). O formulário de novo utilizador fica em cima e pede o nome, o perfil e os departamentos. Um data owner precisa de pelo menos um departamento.
- **Departamentos por tags:** cada pessoa pode ter vários (`u.unidades`; `u.unidade` fica igual ao primeiro). Juntam-se com "+ Add" e tiram-se com ×.
- **Permissões:** todas as regras passaram a usar `P.temUnidade`. Quem tem vários departamentos vê, preenche e acompanha as tasks de todos eles: `podeAgir`, `acompanha`, `atribuiveis`, notificações, chat, My tasks, Approvals e o responsável por indicador.
- **Proteções:**
  - Não se muda o próprio perfil.
  - Quem reporta indicadores só pode ser data owner ou equipa de sustentabilidade.
  - Não se remove quem é responsável por indicadores ou por tasks abertas.
- **Registo e dicas:** cada mudança fica no registo de configuração. Os cabeçalhos Profile e Departments têm uma tooltip.
- **Demonstração:** a Ana Duarte tem Frota e Compras (só nos dados novos).

**Departments**

- O formulário New department passou para cima da tabela.
- A coluna **In use** tem uma tooltip que explica o número: pessoas, indicadores e milestones que usam o departamento. Também explica que um departamento em uso não se remove, apenas se muda o nome. Em cada linha, a tooltip do número mostra o detalhe (`P.usosDepartamentoDet`), e o botão Remove fica desativado enquanto o departamento estiver em uso.

**Supabase:** `013_esg_utilizadores_departamentos.sql` acrescenta a coluna `unidades text[]`, muda os nomes de sistema para nomes de pessoas e atualiza as permissões (`esg_unidades()`, `esg_ms_minha`, `esg_ms_em_recolha`, `esg_indicador_meu`). Correr depois do 012.

**CSS:** secção 39 de `global.css`.

### Indicators com a vista por departamento, e Excel sem painéis fixos

Pedido do André a 11 de novembro de 2026.

- **Excel:** o export da lista de indicadores deixa de fixar painéis (sem freeze panes). Os outros exports nunca os tiveram.
- **Launch by department:** deixou de ser um separador do Reporting set-up e passou a ser a vista **By department** da página Indicators. A página alterna entre **By indicator** (a lista) e **By department** (`U.ind.vista`). Os cartões de cima ficam nas duas vistas, por isso tudo se acompanha no mesmo ecrã.
- **O mapa:** departamento × período, com o estado de cada task e os botões para enviar uma célula ou um período inteiro, mantém-se igual (`B.lancar`, painel `lancar`). O título passou a "By department and period".
- **Links antigos:** `Backoffice?tab=lancar` abre esta vista.
- **CSS:** secção 40 de `global.css`.

### Indicators: empresa no topo, pesquisa em tudo, filtros por coluna e Timeline

Pedido do André a 11 de novembro de 2026.

- **Empresa no topo:** "All companies", "Entidade A" e "Entidade B", cada uma com o número de indicadores. Escolher uma empresa mostra só os indicadores que ela tem de reportar (`c.reporta`), e os cartões, a lista e a vista By department passam a contar só essa empresa.
- **Cada empresa em separado:**
  - Por omissão, um indicador abrange só a empresa que o reporta (`P.empresasInd`). Para juntar várias empresas, escolhem-se no painel do indicador.
  - "One row per company", no Data entry e no Excel offline, usa as empresas escolhidas no indicador ou, se não houver, todo o perímetro do grupo (`P.empresasLinhas`).
  - Envio de tasks: a empresa escolhida passa para o painel de lançamento.
- **Pesquisa:** uma barra larga por cima dos filtros procura em todos os campos do indicador, mesmo os que a tabela não mostra: descrição, fórmula, fonte, controlos, tema, ESRS, responsável, empresas e estado da task.
  - Filtra enquanto se escreve (`Live.indBusca`).
  - Todas as palavras têm de aparecer.
  - Quando encontra num campo escondido, a linha mostra o campo e um excerto, com a palavra destacada.
- **Filtros por coluna:** a tabela passou a usar os filtros tipo Excel das outras tabelas (`portal-filtros.js`). O período escolhe-se nos filtros, já não no cabeçalho.
- **Timeline:** é a terceira vista da página (By indicator, By department, Timeline), com a timeline dos períodos e das entregas externas, para se ver onde estamos e o que já foi lançado. A timeline mostra o grupo todo, mesmo com uma empresa escolhida.
- **CSS:** secção 41 de `global.css`.

### Calendário só com milestones

Pedido do André a 11 de novembro de 2026.

- **O problema:** o calendário (Home e Milestones) mostrava as janelas de reporte do Backoffice, Calendar ("Revisão mensal", "Recolha mensal de operação e energia"). Esses dias apareciam destacados e com o nome da janela, mesmo sem nenhuma milestone com prazo. Não era um erro de dados: as janelas eram desenhadas de propósito.
- **Agora:** o calendário só mostra milestones pelo prazo, com os pontos coloridos e a lista do dia. As janelas continuam a existir e a editar-se em Backoffice, Calendar.
- **Código:** removidos `janelasDoDia` e o destaque `.jan` do `calendario`. O estilo `.ps-cal-jan` deixou de ser usado.

### Tasks: filtros e folha de reporte tipo Excel

Pedido do André a 11 de novembro de 2026: filtrar as tasks por indicador e por grupo de indicadores, e abrir um ecrã tipo Excel para reportar tudo, vendo o que já foi reportado e por quem.

- **Módulo:** `portal-tarefas.js` substitui o bloco `inicio-tarefas` de `portal-paginas.js`. As funções partilhadas vêm por `P.ext` (`aplicarDados`, `estadoTarefa`, `pendentesDe`, `abertas`).
- **Filtros no cartão Tasks:**
  - Pesquisa por indicador (nome, ID, ESRS, descrição, milestone, empresa, período). Filtra enquanto se escreve.
  - Grupo de indicadores: por norma ESRS ou por tema da empresa, com contagem.
  - Estado: To report, Overdue, Filled in to submit, In review or approval ou Approved.
  - Os filtros por coluna continuam.
- **Folha de reporte** (`Pn.tarFolha`, botão "Open grid view" (antes "Open as spreadsheet")): todas as tasks filtradas numa grelha (`portal-grelha.js`), com uma linha por KPI e período.
  - **Colunas:** ID, Indicator, Group, Period, Perimeter, Unit, Prior period, Value, Change %, Data quality, Justification, Status, Entered by, Entered on e Deadline.
  - **Edição:** Value, Data quality e Justification editam-se nas linhas em recolha com a pessoa (`P.podePreencher`). As outras linhas são só de leitura. Dá para escrever, colar um bloco do Excel (Ctrl+V) e anular (Ctrl+Z).
  - **Gravação:** a mesma da grelha da milestone, por milestone (`aplicarDados`), com as mesmas validações, alertas e versões.
  - **Quem e quando:** "Entered by" e "Entered on" vêm da última versão do valor. A tooltip mostra o histórico da célula (últimas cinco versões, com quem, quando, o valor e a origem: escrito, colado, importado, do sistema). Os valores inseridos por outra pessoa aparecem destacados.
  - **Resumo:** quantos estão reportados (com barra), quantos a pessoa pode preencher, quantos são só de leitura e quantos foram inseridos por outra pessoa.
  - **Export to Excel** da grelha.
- **Ideia tirada do Workiva:** uma folha única para recolher dados, com o histórico e o autor de cada célula, em vez de abrir formulário a formulário.

**CSS:** secção 42 de `global.css`.

### Report: vista consolidada e por empresa

Pedido do André a 11 de novembro de 2026: ter no Reporting a vista consolidada (soma da Entidade A com a Entidade B) e poder ver só uma das empresas.

**Como se consolida** (`portal-controlo.js`)

- **Valor de cada empresa** (`P.valoresEmpresas`):
  - Se o indicador tiver valores por empresa (One row per company, no Data entry ou no Excel offline), usam-se esses valores.
  - Senão, o valor todo pertence à empresa da milestone que o reporta.
- **Consolidado** (`P.valorVista` sem empresa): segue o método de consolidação de cada empresa em Companies and perimeter, como nas demonstrações financeiras (o ESRS usa o mesmo perímetro):
  - Empresa-mãe e integral contam a 100%.
  - Proporcional conta pela percentagem detida.
  - Equivalência patrimonial fica de fora.
  - Volumes e contagens somam-se (`P.aditivo`).
  - Percentagens e rácios fazem média ponderada pelo peso de cada empresa, porque não se podem somar. O ideal seria recalculá-los a partir do numerador e do denominador, quando esses dados existirem.
- **Ano anterior na vista** (`P.anteriorVista`): usa o valor gravado do ano anterior, se existir. Senão usa o valor de base do grupo, que numa empresa só aparece quando é ela que reporta o indicador.
- `P.valorConsolidado`, usado na Overview, passou a usar esta regra.

**Report**

- No topo há um seletor: **Consolidated** (Σ, com as empresas que contam), **Entidade A** e **Entidade B**, cada uma com o método e a percentagem. Uma frase explica a regra e tem link para o perímetro.
- **Indicator tables e Document builder:** os valores seguem a vista. As linhas sem KPI (valores do grupo escritos à mão) só entram no consolidado.
- **All indicators:** no consolidado tem uma coluna por empresa e a coluna Consolidated, com a tooltip do método. Numa empresa mostra só o valor dela.
- **Exports** (Excel, tabelas e Word): seguem a vista, e o nome do ficheiro diz qual é (`report-2026-entidade-b.xlsx`, `report-tables-2026-consolidated.xlsx`).

**Verificado no mockup:** com 100 na Entidade A e 50 na Entidade B, o consolidado dá 150. Com a Entidade B proporcional a 50%, dá 125. Nas percentagens, 80% e 60% dão 70% (média ponderada).

**CSS:** secção 43 de `global.css`.

### Limiar de variação: 50% por omissão e por indicador

Pedido do André a 11 de novembro de 2026.

- **Por omissão:** uma variação acima de **50%** face ao período anterior levanta um alerta e pede uma justificação (`P.LIMIAR_BASE`, `P.limiarPadrao`, guardado em `S.ciclo.limiar_padrao`).
- **Por indicador:** `c.limiar_proprio` com `c.limiar_variacao_pct`. Todas as regras e todos os textos usam `P.limiarDe(c)`: validação e alertas, Data entry, ficha do indicador, KPI master, template e Excel offline.
- **Os limiares do catálogo de origem** (10%, 15%...) não estão marcados como próprios, por isso passam a usar os 50% por omissão. Um limiar só é próprio quando é definido no Backoffice.
- **Backoffice > Indicators:**
  - **Faixa "Default change threshold":** o valor por omissão, editável, com quantos indicadores têm limiar próprio. O botão **Apply to all indicators** põe o valor por omissão em todos e tira os limiares próprios, depois de confirmação.
  - **Coluna Threshold:** editável indicador a indicador. Mostra o limiar em vigor, a cheio e a negrito quando é próprio ("own threshold") e esbatido quando é o por omissão ("default"). Apagar o valor volta ao limiar por omissão. Os filtros por coluna funcionam nesta coluna.
  - O painel do indicador e o Excel (exportar e importar) usam o mesmo campo.
  - Cada mudança fica no registo de configuração.
- **Supabase:** `014_esg_limiar_padrao.sql` acrescenta `limiar_padrao` ao ciclo (50 no ciclo aberto). `limiar_proprio` vai no `config` do indicador.
- **CSS:** secção 44 de `global.css`.

### Abrir e descarregar os ficheiros carregados

Pedido do André a 11 de novembro de 2026: dentro da milestone, depois de anexar evidências, abri-las ou descarregá-las na plataforma.

- **Antes:** só se guardava o nome do ficheiro.
- **Agora** (`portal-ficheiros.js`):
  - O conteúdo de cada ficheiro carregado fica no IndexedDB do browser, separado por ambiente (`P.guardarFicheiro`, que devolve um `fid`).
  - A evidência ou o documento guarda o nome e o `fid` (`P.anexar(it, nome, u, fid)`, `P.entregarFicheiro(..., fid)`, `documentos_gerais[].fid`).
- **Guardam o conteúdo:** Attach evidence na linha do indicador, Attach evidence no Data entry, Evidence (página), ficheiros pedidos (Upload files, largar em cima da linha e fila de envio), outros documentos e o Excel guardado pelo assistente de importação.
- **Open e Download** (`P.fichHtml`, `P.abrirFicheiro`) aparecem:
  - na linha aberta do indicador ("Attached");
  - em Requested files e Other documents;
  - em Evidence and quality e nos documentos gerais;
  - em Approvals;
  - na página Evidence.
- **Como abre:** PDF, imagens e texto abrem num separador novo. Os outros formatos (Excel, Word) descarregam-se.
- **Ficheiros de demonstração e anteriores a esta mudança:** só têm o nome, que aparece esbatido, sem botões.
- **Limite:** o conteúdo fica no browser onde foi carregado. Em produção vai para o armazenamento de documentos (Supabase Storage ou SharePoint), com hash e antivírus (ponto 4 de "O que falta para produção"), e o `fid` passa a ser o caminho do ficheiro.
- **CSS:** secção 45 de `global.css`.

### Evidência automática quando o dado vem do sistema

Pedido do André a 11 de novembro de 2026: quando o valor vem do sistema, a evidência deve ser o próprio registo da extração, com a query, o timestamp e um pop-up com o que foi aplicado.

- **Registo da extração** (`P.aplicarPuxar` em `portal-fontes.js`): cada aplicação do Pull data from system cria um registo `EXT-<milestone>-<código>` em `S.puxados[m].extracoes`, com os 12 últimos. O registo guarda:
  - timestamp ao segundo e quem extraiu;
  - empresa e período;
  - por cada dado: o sistema e o estado da ligação no momento (Live, ou a data da última atualização), a tabela e a coluna, os filtros (código da empresa, ano, períodos contabilísticos), a agregação, a **query** executada, os registos lidos com as referências de origem e o valor agregado;
  - por cada indicador preenchido: a fórmula, a substituição com os dados extraídos e o resultado;
  - um **hash SHA-256** de tudo, que mostra se o registo foi alterado.
- **Ligação ao indicador:** cada indicador calculado a partir do pull fica com `it.extracao`. A evidência só vale enquanto o valor vier mesmo do sistema (`P.extracaoDe` usa `P.doSistema`). Se alguém escrever à mão um dado de origem, a ligação deixa de contar. Clear source data apaga-a.
- **Pop-up "Applied from the system":** abre logo depois de aplicar o pull. Mostra o ID, quando, quem, os sistemas e o hash, o que foi aplicado em cada indicador e as queries executadas, cada uma com os registos lidos. Botão **Download extract (JSON)**.
- **Botão "System extract":** aparece com a data junto às evidências da linha do indicador, em Evidence and quality e nas Approvals. Abre o mesmo pop-up, filtrado a esse indicador e às suas queries.
- **Evidência obrigatória:** continua dispensada quando o valor vem do sistema. O registo da extração é a evidência para o auditor.
- **CSS:** secção 46 de `global.css`.

### Remover evidências e ver quem as carregou e quando

Pedido do André a 11 de novembro de 2026.

- **Quem e quando:** cada ficheiro carregado mostra ao lado quem o carregou e a data e hora (`P.fichHtml(ref, extra, m)`). Aparece na linha do indicador, em Requested files e Other documents, em Evidence and quality, nos documentos gerais ("Uploaded by"), nas Approvals e na página Evidence (coluna Uploaded by, com a data).
- **Remove:** um botão com o caixote do lixo junto a Open e Download. Só aparece enquanto a milestone está em recolha com a pessoa (`P.podePreencher`). Depois de submetida, já ninguém remove nada, nem nas Approvals.
- **Confirmação** (`Pn.fichRem`): um pop-up mostra o nome do ficheiro, a que indicador pertence, quem o carregou e quando. Avisa se o indicador exige evidência e esta for a última.
- **Registo** (`P.removerFicheiro`): a remoção fica no histórico da milestone, com quem removeu e quando, e quem tinha carregado o ficheiro e em que data. O conteúdo é apagado do armazenamento do browser.
- **CSS:** secção 47 de `global.css`.

### Reporting status por ponto de dados e Home do data owner

Pedido do André a 11 de novembro de 2026: o data owner deve ver no topo da Home só as suas tasks. A gestão mantém a visão do reporte. E os valores não pareciam estar a ser contados.

- **O erro:** o Reporting status contava por indicador (`P.estadoKpi`) e olhava só para a milestone anual e para o valor do ano. Os valores preenchidos nas entregas trimestrais (T1 a T4), guardados por trimestre, não contavam.
- **Exemplo:** no demo havia 117 valores preenchidos e 82 aprovados em 214 pontos de dados, mas o estado mostrava 6 aprovados e 52 em falta.
- **Agora:** conta-se por **ponto de dados**, um indicador num período (`P.estadoLinha`, `P.pontosCiclo` em `portal-controlo.js`). Os estados são Approved, In approval, In progress, Missing e Overdue (inclui Returned).
- **Página Reporting status:** passa a ter uma linha por ponto de dados, com o período na sua coluna. Os cartões, os filtros e o export usam a mesma conta.
- **Home, gestão** (administrador, equipa de sustentabilidade, auditor): "Reporting status" com a percentagem aprovada, a barra e os cinco estados. Indica quantos pontos de dados há e quantos já têm valor.
- **Home, data owner:** "Your tasks" com o que ainda falta reportar e os cartões To fill in, Overdue or returned, Filled in to submit, In review e Approved, só das milestones dos seus departamentos ou atribuídas a ele.
  - Os três primeiros cartões e o botão "Go to my tasks" filtram o cartão Tasks pelo estado (`iniMinhas`).
  - Os números batem certo com a lista (por exemplo, 30 por preencher e 30 linhas).
- `P.estadoKpi` continua a ser usado na visão anual por indicador (Overview, completude por norma).

### Reporting timeline: milestones em curso e o que falta reportar

Pedido do André a 11 de novembro de 2026.

- **Onde:** por baixo da timeline, um cartão **Milestones in progress** (`emCurso`, no bloco `timeline`). Aparece na página Reporting timeline e na vista Timeline de Backoffice > Indicators.
- **O que mostra:** as milestones ainda não concluídas, por prazo, com Period, Perimeter, Assigned to, Deadline e Status. A coluna **Still to report** diz quantos valores faltam ("2 of 6 to report") e lista os indicadores em falta. Cada nome abre a ficha do indicador. Uma barra por baixo do nome da milestone mostra quanto já foi reportado.
- **Filtros:** período de reporte e "Only milestones with values still to report" (ligado por omissão). O cabeçalho diz quantas milestones e quantos valores faltam.
- **Quem vê:** a gestão e o auditor veem todas as milestones. Quem tiver acesso à timeline e não for gestão vê só as milestones dos seus departamentos.
- **CSS:** secção 48 de `global.css`.

### Overview: monitorização por período de reporte

Pedido do André a 11 de novembro de 2026: um ecrã de monitorização como o da imagem que enviou (vista consolidada ou por empresa, cartões, completude por norma ESRS, pendentes de aprovação, origem dos dados), com a completude por grupo de indicadores em cada período de reporte.

- **Onde:** na página que já existia, **Monitoring > Overview** (web page `Consolidado`, bloco `visao` em `portal-gestao.js`). Não foi criada uma página nova.
- **Novo na faixa "Data view":** o seletor **Reporting period** (All periods, T1 a T4, Ano), ao lado de Consolidated / By company. Filtra a completude, os Pending approval e a Source of the data.
- **Completude:**
  - Passa a contar por ponto de dados, um indicador num período (`P.pontosCiclo`), como o Reporting status e a Home. Antes contava por indicador e olhava só para a milestone anual, por isso os trimestres não entravam.
  - A percentagem é a parte com valor, aprovado ou reportado. A barra separa aprovado, reportado e em falta.
  - Pode agrupar-se por **Topic** (tema da empresa, por omissão desde 11 de novembro) ou por **ESRS** (com a materialidade, onde "Not material" continua assinalado).
- **Quadro novo "Completeness by reporting period":** os grupos nas linhas, os períodos nas colunas (com a data de fecho) e as colunas All periods e All groups.
  - Cada célula mostra a percentagem e "com valor / total". As cores são: tudo aprovado, 75% ou mais, 40 a 74%, abaixo de 40%.
  - Clicar numa célula escolhe esse período em cima.
  - O total bate certo com o Reporting status (no demo, 117 de 214).
- **Mantém-se igual:** os quatro cartões de indicadores (valor consolidado do ano), a atividade recente e o resto da página.
- **CSS:** secção 49 de `global.css`.

### Calculations no Backoffice

Pedido do André a 11 de novembro de 2026: as fórmulas e a biblioteca de fatores de emissão são configuração e só devem ser mexidas por quem tem acesso ao Backoffice.

- **Saiu** do menu Reporting: o link Calculations, a web page `Calculos` e o snippet `Calculos/Introducao`. Também saiu da lista de páginas de quem não gere o Backoffice (auditor e outros perfis).
- **Entrou** como separador **Calculations** do Backoffice, no grupo Reporting set-up (`B.calculos`, que usa o mesmo bloco `calculos` de `portal-gestao.js`): Configured formulas, Scope 1 emissions e Emission factor library, sem outras alterações.
- **Links antigos:** `#/Calculos` e `/calculos/` abrem `Backoffice?tab=calculos`. Quem não tem Backoffice vai para a Home.
- **CSS:** secção 50 de `global.css`.

### Ambiente de testes partilhado no Supabase

Pedido do André a 11 de novembro de 2026: manter os acessos como estão (sem login, qualquer pessoa escolhe o perfil e entra como esse utilizador), mas no ambiente de testes o que se faz fica gravado para os colegas com o mesmo link verem o mesmo.

- **Como funciona** (`portal-partilha.js`, carregado depois de `portal-controlo.js`):
  - **Ao abrir** com `?ambiente=teste`, antes de arrancar, traz da tabela `esg_teste_estado` as partes do estado (as mesmas chaves que o browser guarda, `P.CHAVES`) e escreve-as no armazenamento do browser. Na primeira vez, com a tabela vazia, envia o ambiente semeado.
  - **Ao gravar** (`P.aoGuardar`): pouco depois, envia só as partes que mudaram, com quem gravou.
  - **O que os outros fizeram:** chega ao voltar à janela e de 15 em 15 segundos. A página redesenha-se e diz de quem são as alterações.
  - **Ficheiros carregados:** também vão para `esg_teste_ficheiros` (até 6 MB cada). O Open e o Download vão buscá-los lá quando não estão no browser.
  - **Cabeçalho:** a etiqueta diz "Test environment, shared" ou "Test environment, not shared", com o motivo.
  - **Clear test environment:** limpa para toda a gente e avisa disso.
- **O ambiente principal continua só no browser.** As tabelas `esg_` reais e o login não mudam.
- **Base de dados:** `015_esg_ambiente_teste.sql` cria `esg_teste_estado` e `esg_teste_ficheiros`, com RLS aberto a anon (é um ambiente de testes sem login) e a hora sempre do servidor.
  - **Corrido a 11 de novembro de 2026.**
- **Configuração:** `gerar-mockup.js` põe `window.PORTAL_PARTILHA` (URL e chave pública do Supabase) no mockup e no site publicado.
- **Limites:**
  - Se duas pessoas gravarem a mesma parte ao mesmo tempo, fica a última. As partes são grandes (todas as milestones, todos os valores), por isso a última gravação ganha.
  - Quem tem o link pode ler e alterar o ambiente de testes. Não deve ter dados reais nem confidenciais.
- **Aviso do Supabase:** o projeto tem 38 tabelas de outra aplicação (formação, deslocações, inventário, medicina no trabalho) com RLS desligado, expostas a quem tiver a chave pública. Não foram mexidas: é preciso decidir as políticas.
- **Verificado** com um Supabase simulado e dois browsers: a task enviada pelo administrador num browser apareceu no outro, o valor e o ficheiro carregados pelo data owner chegaram ao primeiro, e o ficheiro foi descarregado no outro browser. Sem as tabelas, a plataforma continua a funcionar e a etiqueta diz "not shared".
- **CSS:** secção 51 de `global.css`.

### Entrada só com nome de utilizador

Pedido do André a 11 de novembro de 2026: no site publicado, só entram as pessoas que ele quiser, só com o nome de utilizador, sem palavra-passe. Depois de entrar, qualquer pessoa continua a poder trocar de perfil pelo avatar ("impersonate").

- **Como funciona** (`portal-acesso.js`, carregado em último lugar):
  - Antes de arrancar (e antes do ambiente partilhado), cobre a página com um ecrã que pede o utilizador.
  - O nome é confirmado no Supabase pela função `esg_acesso_entrar`. Também aceita um email: conta só o que vem antes do @ (pedido do André a 11 de novembro de 2026), por isso `andreborges@qualquer.dominio` entra como `andreborges`. Se existir e estiver ativo, entra com o nome, o perfil, os departamentos e as empresas dessa pessoa, que passa a existir na lista de pessoas da plataforma.
  - O acesso fica guardado no browser e volta a ser confirmado em cada visita. Se for retirado, o ecrã volta a pedir o nome. Sem rede, entra com o que estava guardado.
  - **Avatar:** "Switch profile" continua a mostrar a lista de perfis. "Leave the platform" esquece o utilizador e volta ao ecrã de entrada.
- **Só no site publicado:** `gerar-mockup.js` põe `window.PORTAL_ACESSO = true` no `index.html` em vez da entrada direta como administrador. O mockup e o Power Pages não o usam (em Power Pages o login é o do próprio site).
- **Base de dados:** `018_esg_acessos.sql` cria `esg_acessos` (utilizador, nome, perfil, departamentos, empresas, ativo). A tabela não se lê com a chave pública: só a função confirma um nome de cada vez. Corrido a 11 de novembro de 2026.
  - **Utilizadores:** `andreborges` (André Borges), `bmaio` (Beatriz Maio), `pqcruz` (Pedro Cruz) e `martabarroso` (Marta Barroso, acrescentada a 12 de novembro). Todos com perfil de administrador (acesso total, pedido do André a 11 de novembro de 2026), departamento I&D, CSR e ESG, Entidade A e Entidade B. Cada um entra logo na sua conta e pode fazer impersonate.
  - **Acrescentar pessoas:** um `insert` em `esg_acessos`, como o do ficheiro. **Retirar:** `ativo = false`.
- **Limites:** não é segurança forte. Quem souber um nome entra, e os dados do ambiente partilhado continuam acessíveis a quem tiver a chave pública. Serve só para dados de teste.
- **Verificado** em Chrome sem interface, com o Supabase simulado: nome errado recusado, `AndreBorges` entra como André Borges, troca para o auditor, recarregar não volta a pedir o nome, "Leave the platform" volta ao ecrã. Também em ecrã de telemóvel.
- **CSS:** junto de `.ps-login` em `global.css`.

### Backoffice: títulos dos grupos, empresas numa tabela e departamentos por empresa

Pedido do André a 11 de novembro de 2026.

- **Títulos dos grupos** (Indicators, Organisation, Reporting set-up, Platform): a negrito, na cor da marca, com uma barra à esquerda e uma linha a separar os grupos. Os separadores ficam recuados por baixo de cada título.
- **Companies and perimeter:** uma só tabela (`Blocos['perimetro']`), com:
  - as colunas Company (com o NIF e o NACE por baixo), Country, Consolidation (método e percentagem detida), ESRS perimeter, Counts at, Departments, Milestones e Actions;
  - **+ New company** e **Edit** em cada linha (e no nome), que abrem o mesmo painel (`Pn.empEd`) com as secções Company, Consolidation, Departments e "KPIs and data entry rules";
  - **Remove**, só para empresas sem milestones;
  - validação do nome único, da percentagem detida (0 a 100) e das instalações. As alterações ficam no registo.
  - Saíram o detalhe por baixo da tabela e a segunda lista de empresas (`B.entidades`).
- **Departamentos por empresa:**
  - Cada departamento tem `empresas` (ids). Vazio quer dizer todas as empresas (`P.empresasDoDep`, `P.depsDaEmpresa`).
  - No separador Departments há um filtro **Company** (com quantos departamentos cada empresa tem), uma coluna **Companies** com tags (+ Add, ×) e, em New department, a escolha entre todas as empresas ou só uma (por omissão, a do filtro).
  - No painel do indicador, Responsible department mostra os departamentos da empresa que reporta.
  - O painel da empresa mostra os seus departamentos.
- **Supabase:** `016_esg_departamentos_empresas.sql` acrescenta `empresas text[]` a `esg_departamentos`. A sincronização já envia e lê esta coluna.
- **CSS:** secção 52 de `global.css`.

### Milestones passam a Tasks, Reporting moments, Materiality, responsável por empresa e saída do KPI master

Pedidos do André a 11 de novembro de 2026.

- **Milestone → Task em toda a plataforma:** mudam todos os textos que o utilizador vê: títulos, colunas, botões, mensagens, cabeçalhos e snippets. A troca foi feita só dentro das strings de JavaScript (com um tokenizador) e do texto dos HTML.
  - **Não mudam:** os identificadores e rotas (`Milestone/`, `Milestones?`), os nomes das web pages Power Pages (`Milestones`, `Milestone`), as chaves de dados (`milestone_id` no Excel, no JSON e nas tabelas do Supabase) e o histórico já gravado.
- **Reporting moments:**
  - Ficam só as colunas T1, T2, T3, T4 e Year. As entregas externas (QA, PCQA, RQS…) continuam nos dados, para as Outputs e as tags das tasks, mas saem desta tabela.
  - Coluna **Companies** com as tags das empresas de cada indicador (Entidade A, B ou ambas), editáveis com + Add e ×. É preciso pelo menos uma empresa, e a empresa que reporta tem de estar entre elas (`mudarEmpresasInd`).
  - Novo filtro por empresa.
- **Materiality and frameworks:** a coluna "Standard" passa a **Topic**. O nome do tópico e o número de indicadores abrem um painel (`Pn.matInd`) com os indicadores desse tópico: empresas, responsável, frequência e estado.
- **Painel do indicador:** a secção **Companies** fica em cima. Para cada empresa abrangida escolhe-se o **departamento** (os dessa empresa) e a **pessoa ou grupo** responsável, que podem ser diferentes de empresa para empresa (`c.resp_emp`). "Reports it" marca a empresa que recebe a task.
  - O departamento e a pessoa dessa empresa passam a ser os gerais do indicador.
  - `P.responsavelInd(id, empresa)` e o envio de tasks usam o responsável da empresa.
  - Review and validation fica numa secção à parte.
  - Validação: departamento obrigatório em cada empresa, e quem reporta numa empresa não pode rever nem validar.
- **Limite:** cada indicador continua com um valor por período, que a empresa que reporta envia (com valores por empresa, se houver mais de uma). Ainda não há uma task separada para cada empresa: isso exige guardar os valores por empresa em todo o lado.
- **KPI master saiu:** o link, a web page `Kpis` e o snippet foram removidos. `#/Kpis` abre Backoffice > Indicators, onde o painel de cada indicador já tem os mesmos campos (disponibilidade, fonte, controlos, divulgação, ESRS). `portal-master.js` continua carregado, porque guarda as funções de mapeamento ESRS usadas noutros sítios.
- **Supabase:** `resp_emp` vai no `config` do indicador.
- **CSS:** secções 53 e 54 de `global.css`.

### Timeline: entregas externas com os indicadores e o progresso; Reporting timeline no menu Reporting

Pedido do André a 11 de novembro de 2026.

- **External deliveries** (Reporting timeline e vista Timeline de Backoffice > Indicators):
  - Cada cartão mostra a barra e o texto do progresso dos indicadores que a entrega pede ("2 of 12 approved, 2 with a value, 1 not sent").
  - Clicar abre o painel da entrega (`Pn.entrega`), que mostra:
    - a base legal e o prazo;
    - os totais: indicadores precisos, aprovados, em aprovação, preenchidos por submeter, em falta ou em atraso, e sem task enviada;
    - uma tabela com o indicador, a empresa, o responsável, a task (com link e prazo), o valor e o estado. Os que precisam de atenção aparecem primeiro.
- **Que indicadores entram:** os que têm esse tipo de entrega nos Reporting moments do indicador (`P.momentosDe(id).ent`), no período da entrega (`tarefaInd(id, r.periodo)`, `P.estadoLinha`).
- **Menu:** a Reporting timeline saiu de Monitoring e passou para o menu **Reporting**, como primeira entrada.
- **CSS:** secção 55 de `global.css`.

### By area no Reporting status e Overview com uma só leitura de completude

Pedido do André a 11 de novembro de 2026.

- **By area:** saiu da Overview e passou para o fim da página **Reporting status** (`P.porAreaHtml`).
  - Um bloco por departamento, com o estado, os pontos de dados aprovados do total e o número de tasks.
  - Abre-se para ver cada indicador por período, com perímetro, valor e estado.
  - Segue o filtro de empresa da página e conta por ponto de dados, como o resto da plataforma.
- **Overview, Reporting progress:**
  - Saiu o cartão "By topic", que repetia a "Completeness by company topic" de cima.
  - Saiu também o cartão **Source of the data** (pedido do André, 11 de novembro de 2026). A coluna da direita fica só com Pending approval.
  - O "By report table" passou a **Completeness by report table**, com o visual das barras de completude (aprovado, reportado, em falta e a percentagem). Conta por ponto de dados e segue o período e a empresa escolhidos em cima.

### Reporting status com duas vistas e Overview sem o Completeness by report table

Pedido do André a 11 de novembro de 2026.

- **Reporting status:** no topo há um seletor **By data point | By area**.
  - By data point é a lista dos pontos de dados (a vista por omissão).
  - By area mostra os blocos por departamento logo abaixo dos números, com um filtro de empresa ao lado. Antes ficava no fim da página, depois da tabela, e não se via.
- **Overview:** saiu o cartão "Completeness by report table" do fim da página.

### Excel das tasks com layout e proteção, import pela coluna certa, Source data com quem e quando, Assign task

Pedido do André a 11 de novembro de 2026.

- **Excel das tasks** (`web-files/portal-excel.js`, `P.livroExcel`): o export dos Requested data, o template, as folhas de pedido e o relatório da task usam o layout do export dos indicadores.
  - Tem uma faixa com o nome da plataforma, uma linha de explicação, cabeçalhos escuros e linhas alternadas, sem freeze panes.
  - As folhas ficam protegidas sem palavra-passe. Só as colunas de preenchimento ficam desbloqueadas e têm o cabeçalho a verde: valor, qualidade, método e justificação, e no template também entity, source e evidence. A qualidade tem uma lista de valores.
  - O cabeçalho está na linha 3. O import (`P.lerFicheiro` e o assistente) encontra-o sozinho.
- **Import do Excel:** a coluna do valor é escolhida pelo cabeçalho do período da task (por exemplo "T4 2026 value", "2026" ou "value"), mesmo que ainda esteja vazia. Nunca se escolhem colunas de outros anos ("2025", "prior value"), de variação, de limiar ou de meta. Os anos escritos como número também contam como cabeçalho.
- **Source data:** a coluna Source diz como o dado entrou (From the system, Typed ou Imported from Excel), por quem e quando (`S.puxados[ms].quem`).
  - Um indicador que é só um dado de origem e foi escrito diretamente na linha do indicador mostra também esse valor no Source data, com "Typed in A08".
  - Sem valor, a coluna mostra o estado da ligação ao sistema.
- **Assign task:** "Launch" passou a "Assign task(s)" em todos os ecrãs do Backoffice onde se atribuem tasks, e também nas mensagens e no histórico.

### Assign tasks: acrescentar indicadores da lista

Pedido do André a 11 de novembro de 2026.

- No painel **Assign tasks** (passo 3), cada departamento tem agora a lista "Add an indicator from the indicator list".
  - A lista mostra todos os indicadores ativos agrupados por tema. Quando um indicador é de outro departamento, esse departamento aparece entre parênteses.
  - O indicador escolhido entra logo selecionado na task, com o chip a tracejado e a nota "(added)".
  - Não é preciso ir à página Indicators.
- O que se acrescenta aqui vale só para as tasks criadas neste painel. O plano do indicador no Backoffice não muda.

### Dropdowns com pesquisa, Assign to me e utilizadores por empresa

Pedido do André a 11 de novembro de 2026.

- **Dropdowns com pesquisa** (`web-files/portal-pesquisa.js`):
  - Funcionam em qualquer `select.ps-sel` com `data-pesq` ou com 10 ou mais opções.
  - Abrem uma lista com caixa de pesquisa. A pesquisa ignora acentos e também procura no nome do grupo.
  - Usam-se pelo teclado (setas, Enter e Esc). O `select` continua a guardar o valor e dispara o `change`.
  - Os campos Department e Responsible do painel do indicador têm `data-pesq`.
- **Assign to me:** está ao lado de "Responsible" em cada empresa do indicador.
  - Atribui a responsabilidade a quem tem a sessão aberta. Se a empresa ainda não tiver departamento, usa o primeiro departamento dessa pessoa.
  - Quem tem a sessão aberta aparece sempre na lista, como "Me: nome".
- **Utilizadores por empresa:** o Users and profiles tem agora uma coluna Companies, as empresas no formulário New user e um filtro por empresa.
  - Cada pessoa guarda as suas empresas em `user.empresas`. Uma pessoa sem empresas marcadas trabalha em todas. Usam-se `P.empresasUser` e `P.userNaEmpresa`.
  - No painel do indicador, o Responsible de cada empresa só mostra as pessoas dessa empresa.
  - Para produção falta guardar `empresas` na tabela dos utilizadores no Supabase, tal como já acontece com as `unidades`.

### Indicadores Input / Output com cálculo por códigos

Pedido do André a 11 de novembro de 2026.

- **Excel dos indicadores (export e import) e painel do indicador:**
  - A coluna "Base or derived" passou a **Input / Output**. Input é o dado que alguém tem mesmo de colocar. Output é calculado pela plataforma. Os ficheiros antigos com Base ou Derived continuam a ser aceites.
  - Há uma coluna nova, **Calculation (KPI codes)**, com o cálculo escrito com os códigos dos indicadores, por exemplo `A01 + A02` ou `(E01 - E02) / A01 * 100` (`c.calc_codigos`).
  - A antiga "Calculation" passou a **Calculation methodology**, para o texto livre.
- **Validação no import e no painel** (`P.validarCalc`):
  - só são aceites códigos, números, `+ - * / ( )` e espaços;
  - os códigos têm de existir na plataforma ou no próprio ficheiro;
  - um indicador não pode usar o seu próprio código;
  - a expressão tem de ser válida.
  - Quando há um erro, a linha é recusada e o import diz qual é o código que falta.
- **Cálculo** (`P.calcularOutputs`):
  - Um output é calculado assim que todos os seus inputs desse período têm valor e as tasks deles já foram submetidas.
  - Corre em cada submit, depois de um import e quando se grava o indicador. Fica uma versão com a origem "calculated: A01 + A02".
  - Um output pode usar outros outputs.
  - Um output que esteja numa task não é pedido a quem preenche.

### Calculation (KPI codes) preenchida automaticamente

Pedido do André a 11 de novembro de 2026.

- `P.sugerirCalc(id, texto)` (`portal-fontes.js`) gera a Calculation (KPI codes) de um output de duas maneiras:
  1. **Pelo cálculo configurado na plataforma:** cada dado de origem que já é um indicador passa ao seu código. Por exemplo, o A03 fica `(A01 - A02) / A01 * 100`.
  2. **Pela Calculation methodology:** os nomes e os códigos de indicadores que aparecem no texto passam a códigos. Também se convertem `×`, `÷`, `x`, plus/mais, minus/menos, times/vezes e divided by/dividido por. Nos indicadores em % junta-se `* 100`.
  - Só se preenche quando o resultado tem apenas códigos, números e operadores e a expressão é válida. Quando não se consegue, o campo fica vazio para ser preenchido à mão.
- **Onde corre:**
  - o botão **Fill calculations** na página Indicators;
  - "Fill from the methodology" no painel do indicador;
  - o export, que já leva a sugestão na coluna;
  - o import, quando um output chega sem cálculo.
- **Limite atual:** dos 24 outputs, só o A03 se consegue converter. Os outros usam 39 dados de origem que ainda não existem como indicadores de input (por exemplo CQO afluente, colaboradores_total, receitas_eur) ou fatores de emissão. Falta decidir se esses dados passam a ser indicadores de input.

### Cálculo em tags, pesquisa melhor dos inputs, submit por indicador e Save

Pedido do André a 11 de novembro de 2026.

- **Pesquisa do cálculo** (`P.sugerirCalc`): cada dado de um output é procurado por esta ordem:
  1. o dado é exatamente o de um indicador;
  2. o dado é o cálculo inteiro de outro output (o E08 usa o E06);
  3. há um indicador com o mesmo significado e a mesma unidade, mas só quando o vencedor é claro (fica como sugestão a confirmar);
  4. é um fator de emissão da biblioteca (`fator.gas`);
  5. se nada disto der, fica como input em falta (`[Perdas reais]`).
  - Agora os 24 outputs ficam todos com a estrutura completa. Antes era só 1.
- **Linguagem do cálculo** (`P.tokensCalc`, `P.validarCalc`): aceita códigos de KPI, fatores de emissão, `[inputs em falta]`, números e `+ - * / ( )`. Um output com inputs em falta não é calculado.
- **Editor em tags** no painel do indicador:
  - verde: input;
  - azul: output;
  - amarelo tracejado: correspondência sugerida, para confirmar;
  - roxo: fator de emissão;
  - vermelho: input em falta, com o botão **Create input KPI** e o botão **Create all inputs**. O novo input fica com o próximo código livre, a unidade do dado de origem, e o departamento, a frequência e as empresas do output.
  - Para acrescentar um indicador ou fator há uma lista com pesquisa. Há também botões de operadores, um campo de número e o modo "Edit as text".
  - Uma linha de estado diz se o cálculo está completo, se tem inputs em falta ou se tem algum erro.
- **Submit por indicador na task** (`P.submeterIndicadores`, `P.reabrirIndicador`, `P.estadoSubmissao`):
  - Cada indicador completo tem o seu botão **Submit**. Há também o **Submit N ready**.
  - Um indicador submetido fica bloqueado e mostra quem o submeteu e quando. Volta a abrir com **Reopen**.
  - O indicador submetido conta logo para os cálculos dos outputs.
  - No topo da lista há uma barra de progresso ("3 of 10 submitted") e os filtros All, To submit e Submitted.
  - O **Submit task** continua a mandar a task para revisão e marca como submetidos os indicadores que faltavam. Quando a task é devolvida, os indicadores voltam a ficar por submeter.
  - O import e a colagem não alteram indicadores já submetidos.
- **Save:** está sempre na barra de ações da task. Guarda o trabalho sem submeter e mostra quando foi guardado.

### Consolidado dos outputs recalculado, History no menu Data e por topic

Pedido do André a 11 de novembro de 2026.

- **Consolidação dos outputs** (`P.valorVista`, `P.avaliarCalc`):
  - Um indicador de output (com Calculation (KPI codes)) já não soma nem faz média do resultado das empresas. A conta é refeita com os inputs já consolidados.
  - Exemplo do A03 com Entidade A (20%) e Entidade B (50%): dá (ΣA01 − ΣA02) / ΣA01 = 42,5%. A média dava 35%.
  - Em cada empresa, a conta é feita com os inputs dessa empresa. Um output pode usar outro output (E08 = A03 × 2 dá 85).
  - Se faltar algum input consolidado, o output de várias empresas fica vazio, em vez de mostrar um valor errado.
  - O tooltip e a nota do consolidado dizem "Recalculated with the consolidated inputs" e mostram a fórmula.
  - Os períodos já funcionavam assim: o valor do ano é calculado com os inputs do ano.
- **History:** passou do menu Reporting para o menu **Data**.
- **History por topic:** tem um filtro Topic e duas vistas.
  - **One indicator:** o gráfico de um indicador, escolhido numa lista filtrada pelo topic, com pesquisa.
  - **Whole topic:** uma tabela com todos os indicadores do topic, os últimos 6 anos e a tendência. Clicar num indicador abre-o na vista One indicator.

### Outputs & Reporting Timeline

Pedido do André a 11 de novembro de 2026.

- A página Outputs (`Saidas`) foi juntada à Reporting timeline. No menu Reporting chama-se agora **Outputs & Reporting Timeline**.
  - No topo tem o filtro por destino: **All, ERSAR, APA, Acionistas, Público** (`P.filtroSaidas`). O filtro aplica-se à timeline (marcos e entregas externas) e aos outputs.
  - Por baixo da timeline está a secção **Outputs**, com os números e os cartões de cada entrega, para gerar os ficheiros (`P.saidasHtml`). A seguir vêm as Tasks in progress.
- Foram removidos a web page `Saidas`, o snippet `Saidas/Introducao` e o link do menu. A rota antiga `Saidas` passa a abrir a `Timeline`.

### Data entry escondido e Connections no Backoffice

Pedido do André a 11 de novembro de 2026.

- **Data entry** já não aparece no menu Data. O link tem a classe `ps-oculto` (`display:none`, secção 59 do `global.css`), mas o código e a página ficam, por isso continua a abrir pelo URL. Para voltar a mostrá-lo, basta tirar a classe em `web-templates/cabecalho.html`.
  - A entrada manual e o Excel já se fazem na task: lista, grelha, Import from Excel, Submit por indicador e Save. O Excel offline também está em Home → Tasks.
  - Só há uma coisa que fica sem outro sítio: os vários valores por empresa no mesmo KPI ("One row per company"), que só existiam no Data entry.
- **Connections** passou a ser um separador do Backoffice → Platform (`B.ligacoes` usa `P.ligacoesHtml`). Tem o estado de cada ligação, a criação de uma nova ligação e o contrato da API. As mensagens do "Pull data from system" apontam agora para lá.

### Atalho Data → Indicators

Pedido do André a 11 de novembro de 2026.

- O menu Data tem de novo o item **Indicators**. É um atalho que abre o Backoffice no separador Indicators (`data-nav="Backoffice"`, `data-nav-q="tab=indicadores"`).
- Só aparece a quem tem acesso ao Backoffice.
- O atalho só fica marcado no separador Indicators. Nos outros separadores do Backoffice não fica.

### Excel do data room e do audit trail com o layout da plataforma

Pedido do André a 11 de novembro de 2026.

- `P.livroObjetos` (`portal-excel.js`) transforma listas de dados num Excel com o layout da plataforma:
  - uma folha **Contents** no início, com cada folha, o que contém, o número de linhas, quem gerou o ficheiro e quando;
  - uma folha por tema, com a faixa da plataforma e uma descrição;
  - cabeçalhos legíveis ("Indicator ID", "Value history", "Task" em vez de "milestone"), larguras ajustadas ao conteúdo e números alinhados à direita;
  - todas as folhas protegidas, só de leitura.
- Passaram a usar este formato o **Export data room** (Audit), o **audit trail** e o **auditor package**.

### Outputs & Reporting Timeline sem "External deliveries" e cartões iguais

Pedido do André a 11 de novembro de 2026.

- Saiu a lista "External deliveries" de baixo da timeline. O detalhe de cada entrega está nos cartões dos Outputs, no "Check the values".
- Os cartões dos Outputs têm todos a mesma borda. Uma entrega com o prazo passado e sem ficheiro deixa de ter a borda vermelha e passa a mostrar só a data do prazo a vermelho.

### Cabeçalho da lista de indicadores fixo na task

Pedido do André a 11 de novembro de 2026.

- Em Requested data, o cabeçalho da lista (Indicator, Expand all, T4 2025, Value T4 2026, Change, Status) fica preso por baixo do cabeçalho da página enquanto se faz scroll e a lista ainda está no ecrã. Quando a lista acaba, sai com ela.
- É CSS na secção 60 do `global.css`: `position: sticky`, a 69px do topo no desktop e a 61px no telemóvel.

### Workflow da task mostra os indicadores já submetidos

Pedido do André a 11 de novembro de 2026.

- Quando há indicadores submetidos um a um e a task ainda está em recolha, o workflow da task (o "breadcrumb" dos passos) mostra:
  - no passo de recolha, um anel de progresso com a parte submetida e o texto "2 of 10 submitted";
  - na ligação para o passo seguinte, a mesma parte a verde;
  - no passo seguinte, "2 indicators ready here", com a lista dos indicadores no tooltip;
  - na barra de progresso do topo, a mesma fração somada ao passo em curso.
- O CSS está na secção 61 do `global.css`.

### Da Home direto ao indicador dentro da task

Pedido do André a 11 de novembro de 2026.

- Na Home, na tabela Tasks, o link de cada KPI e o botão de ação ("Fill in →") abrem `Milestone/<task>?ind=<KPI>`.
- Ao chegar à task:
  - abre-se o separador Work, na vista de lista, com o filtro All;
  - abre-se o detalhe desse indicador;
  - a página desce até à linha do indicador, logo por baixo dos dois cabeçalhos fixos (`irParaIndicador`);
  - a linha fica realçada durante 2,6 segundos;
  - o cursor fica no campo do valor.
- O CSS do realce está na secção 62 do `global.css`. Quem tem a opção de reduzir movimentos no sistema vê o realce fixo, sem animação.

### Workflow novo: responsável de área e equipa de sustentabilidade, com revisão por indicador

Pedido do André a 11 de novembro de 2026.

- **Workflow de base** (`WF_BASE`):
  1. Recolha e submissão: quem está atribuído preenche e submete.
  2. **Aprovação do responsável de área** (tipo `area`, responsável `chefe`). Passa automaticamente se foi o responsável de área a submeter, se a área não tem responsável, ou se todos os indicadores já foram aprovados por ele um a um.
  3. **Aprovação pela equipa de sustentabilidade**, que aprova ou devolve.
  4. Publicação automática.
  - A validação automática saiu do base. Só entra se alguém a acrescentar ao workflow. As regras de validação continuam a correr ao preencher.
  - As tasks com workflow alterado ficam como estão.
- **Responsável de área:** é um campo novo em Backoffice → Departments (coluna "Area head", com pesquisa).
  - No arranque, cada departamento fica com o primeiro data owner desse departamento.
  - `P.chefeDe` e `P.eChefe` dão o responsável de cada área.
  - O editor do workflow tem o tipo "Area head approval" e o responsável "Area head of the task unit".
- **Revisão por indicador** (`P.etapaInd`, `P.podeReverInd`, `P.aprovarIndicador`, `P.devolverIndicador`, `P.revParaMim`):
  - Um indicador submetido antes da task vai primeiro ao responsável de área e depois à equipa de sustentabilidade.
  - Se quem submete é o responsável de área, a aprovação dele passa automaticamente.
  - Ninguém aprova o que submeteu (segregação de funções). Devolver obriga a um comentário, que fica na conversa da task.
  - **Home → Tasks (Mine):** cada pessoa vê os indicadores à espera dela, com o estado "Submitted, to approve" ou "Area approved, to review" e o botão Review.
  - **Approvals:** no topo há o cartão "Indicators waiting for your approval", com o botão Review → que abre a task já no indicador.
  - **Dentro da task:** um aviso diz quantos indicadores estão à espera e tem o botão "Review next →". Ao entrar na task, a página vai direta ao primeiro indicador por aprovar. Cada linha tem Approve e Return. Depois de aprovar, a página salta para o seguinte.
  - **Workflow da task:** cada passo mostra quantos indicadores estão nele ("1 to approve" no passo da área, "1 approved" no passo da sustentabilidade).
- **Dados gravados:** o base antigo passa ao novo; as tasks no base perdem a validação automática; as que ainda estão na recolha passam aos 4 passos novos; os departamentos ganham o responsável de área.

### Um só ecrã da task para todos os perfis

Pedido do André a 11 de novembro de 2026.

- Quem preenche, o responsável de área, a equipa de sustentabilidade e o auditor veem exatamente o mesmo ecrã da task (`sepRecolha`):
  - os separadores "Fill in on screen" e "Upload files";
  - a barra de submissão com os filtros;
  - a lista com o cabeçalho fixo e o detalhe de cada indicador;
  - a grelha e o export.
- O que muda é só o que cada pessoa pode editar, conforme o estado de cada indicador:
  - **Editável:** só para quem tem a recolha e enquanto o indicador não foi submetido.
  - **Só de leitura:** os valores aparecem como texto, a qualidade e o método ficam bloqueados, a justificação aparece como texto, e não há Attach evidence, Request assistance nem Import.
- A linha por cima da lista diz o que se pode fazer: preencher; "This step is with you…" para quem decide; ou "Read only for you at this step…" com o passo e quem o tem.
- Quem decide o passo vê, por baixo, o cartão do passo com o comentário para devolver (`caixaDecisao`). Os botões Return e Approve ficam na barra de ações.
- A tabela antiga da revisão (`sepRevisao`) e a vista só de leitura (`sepLeitura`) já não são usadas, mas o código ficou.

### O estado diz o que há para fazer; tooltips com os indicadores no workflow

Pedido do André a 11 de novembro de 2026.

- **Estado das tasks e dos KPIs** (`estChip`, `estadoTarefa`, `P.chipEstadoTarefa`):
  - Quando a task está com a pessoa, o estado é a ação dela: **To approve**, To review, To give opinion, To fill in ou Returned, to fix.
  - Se o prazo passou, aparece ao lado um segundo badge **Overdue**, com a data e os dias de atraso na tooltip. Já não substitui o estado.
  - Aplica-se à Home (Tasks), à página Tasks e ao cabeçalho da task.
  - Os KPIs submetidos um a um mostram com quem estão: "Submitted, with the area head", "Submitted, with sustainability" ou "Approved".
  - O botão de ação do passo do responsável de área passou de "Review →" para **Approve →**.
- **Barra de ação:** confirmado que quem tem o passo vê os botões Return e **Approve and send to sustainability** (ou "Approve and lock" no passo da sustentabilidade).
- **Workflow da task:** os números ("2 of 10 submitted", "2 to approve", "1 approved") têm uma tooltip com a lista dos indicadores, um por linha. Também funcionam pelo teclado. As tooltips com mudanças de linha usam a classe `.linhas` (`white-space: pre-line`).

### Tasks: donut dos indicadores e vista By KPI

Pedido do André a 11 de novembro de 2026.

- **Donut por task** (`donutInd`): aparece na coluna Task da página Tasks, ao lado do nome.
  - Cada segmento é um estado dos indicadores: Approved, Submitted (em aprovação), Filled in (por submeter) e To fill in. Os segmentos estão separados por 2px.
  - O número no centro diz quantos indicadores faltam reportar; quando não falta nenhum, aparece ✓.
  - A tooltip mostra o detalhe de cada estado, para a cor nunca ser a única informação.
- **Deadline em duas linhas** (data e, por baixo, quanto falta), para a tabela continuar a caber sem scroll.
- **Vista By KPI:** é a terceira opção do seletor Table, Board, By KPI.
  - As mesmas tasks filtradas, uma linha por KPI, com Task, Period, Perimeter, Value, Assigned to, Deadline e Status.
  - O Status é a ação da pessoa, com o Overdue ao lado.
  - Cada KPI abre a task já nesse indicador.

### Matriz de rastreabilidade em pop-up

Pedido do André a 11 de novembro de 2026.

- A **Traceability matrix** já não ocupa um cartão na secção Audit da task. No painel da direita há um botão **Traceability matrix**, entre "On this page" e "Details", que abre a matriz num pop-up largo (`Pn.matriz`, `matrizHtml`). A secção Audit fica só com "Requests on this task".
- **Correção:** uma task que já saiu da recolha conta todos os indicadores como submetidos ("10 of 10 submitted") e diz em que passo está. Antes dizia "0 of 10 submitted, 10 ready now".

### Correção: tasks com a sustentabilidade apareciam com o responsável de área

Reportado pelo André a 11 de novembro de 2026, no ambiente de testes.

- **Causa:** na lista da task, um indicador marcado como submetido mostrava a etapa da revisão por indicador ("With the area head" ou "With sustainability"), mesmo depois de a task inteira ter avançado. Uma task no passo da sustentabilidade mostrava, por isso, "With the area head" em todas as linhas.
- **Correção:** a etapa por indicador (`P.etapaInd`) e o estado "submitted" de cada linha só contam enquanto a task está na recolha. Depois, cada indicador segue o passo da task.
- **Dados antigos** (`P.migrarDados`): os indicadores submetidos um a um antes de existir o passo do responsável de área (antes de 11/11/2026 12:39 UTC) ficam com esse passo dado como passado, porque já estavam com a sustentabilidade.
  - Estes acertos e os do workflow passaram para `P.migrarDados`. Correm ao carregar e também quando o ambiente de testes partilhado recebe alterações de outras pessoas.

### KPI aprovado deixa de estar atribuído

Pedido do André a 11 de novembro de 2026.

- Um KPI aprovado já não aparece atribuído a ninguém: a coluna "Assigned to" mostra "-" (`atribKpi`, `P.atribKpiHtml`). Conta como aprovado quando a task está concluída ou quando a sustentabilidade aprovou o KPI sozinho, com a task ainda aberta.
- Aplica-se à Home (Tasks) e à vista By KPI da página Tasks. As tasks concluídas já mostravam "-".

### Segregação de funções visível: quem submeteu não vê a task como "To approve"

Reportado pelo André a 11 de novembro de 2026: a Rita Sousa submeteu uma task do seu departamento e depois aparecia-lhe "To approve", mas ao aprovar recebia o erro da segregação.

- A regra mantém-se: quem submete não decide sobre o que submeteu.
- O ecrã passou a respeitá-la. Para quem submeteu:
  - a task não fica "à espera" dela (`P.esperaPor`): nem "To approve", nem na contagem de My tasks;
  - não aparecem os botões de aprovar ou devolver nem a caixa do comentário;
  - a linha da lista explica com quem está a decisão (`P.quemDecide`). Se não houver mais ninguém na equipa, diz que tem de ser o administrador, ou que é preciso acrescentar outra pessoa à equipa.
- O administrador (Service account) continua a poder aprovar.

### Faturas de eletricidade: esquema dos dados e tabelas no Supabase

Pedido do André a 11 de novembro de 2026. Primeiro passo para ler as faturas (texto do PDF ou OCR no browser) e usá-las nos indicadores de energia.

- **Esquema** `web-files/esquema-fatura-energia.json` (JSON Schema). Não existe um modelo público que junte a parte financeira, os consumos e o ESG para faturas portuguesas, por isso o esquema junta três referências:
  - **Financeiro:** EN 16931, a norma europeia da fatura eletrónica, também base do CIUS-PT. Fornecedor e cliente com NIF, número, ATCUD, datas, totais, IVA por taxa e linhas. Cada campo indica o termo da norma (BT-n).
  - **Fornecimento e consumo:** o conteúdo que a ERSE exige nas faturas em Portugal. CPE, nível de tensão, potência contratada, ciclo horário, período de faturação, tipo de leitura, kWh por período horário (ponta, cheias, vazio, super vazio), energia reativa, autoconsumo, e os encargos (energia, potência, redes, IEC, CAV, taxa DGEG).
  - **Rotulagem do fornecedor:** % renovável, mix por fonte, gCO₂/kWh e garantias de origem. É a base do Scope 2 market-based.
  - **ESG:** os valores para os indicadores E01 (MWh), E03 (% renovável) e E07 (Scope 2 location-based e market-based); a repartição dos kWh por período de reporte quando a fatura apanha dois trimestres; e, para cada campo, como foi lido e com que confiança.
- **SQL** `supabase/017_esg_faturas_energia.sql` (ainda não corrido):
  - tabelas `esg_faturas_energia` (uma por fatura e CPE, com o objeto lido completo em `dados_lidos`) e `esg_faturas_linhas`;
  - estados `lida` → `confirmada` → `rejeitada`, com o servidor a registar quem confirma;
  - RLS: quem é interno lê e carrega; a gestão confirma e apaga;
  - a vista `esg_faturas_energia_periodo` soma por empresa e período os kWh, o % renovável ponderado e o Scope 2, só das faturas confirmadas.
  - A sintaxe foi verificada com um parser de PostgreSQL.
- **Próximo passo:** no indicador de eletricidade da task, carregar a fatura → ler (pdf.js para PDF digital, Tesseract.js para digitalizações) → ecrã de confirmação ao lado da fatura → valores para os indicadores e fatura como evidência.

### O nome da task não leva a pessoa

Pedido do André a 11 de novembro de 2026.

- As tasks enviadas a partir de Backoffice → Indicators ("Send task") eram criadas com o nome da pessoa no fim, por exemplo "Entrega T2 2026 de Comercial e Relação com o Cliente, Sofia Reis". Agora o nome fica só com o período e o departamento (`P.enviarTarefas`).
- A pessoa muda quando se reatribui a task ou quando o processo avança, por isso aparece só em "Assigned to" e no workflow.
- As tasks que já existiam perdem o ", Nome" do fim quando os dados são carregados (`P.migrarDados`).

### Indicador aprovado sozinho: publicado, fechado e a verde água

Pedido do André a 11 de novembro de 2026 (exemplo: M25-T2, A02).

- Um indicador aprovado pela equipa de sustentabilidade antes da task fica logo **aprovado e publicado**.
  - `P.indAprovado(m, id)` dá verdadeiro quando a task está concluída ou quando o indicador foi aprovado sozinho (`it.revisto`, com `it.publicado`).
  - Passaram a usar esta regra: o estado dos pontos de dados e dos KPIs (Reporting status, Overview), os quadros do Report, os Outputs, o data room, a lista de aprovados, o valor do ano anterior e a reexpressão.
- **Fechado:**
  - o valor, a qualidade, o método e a justificação ficam bloqueados;
  - "Reopen" deixa de funcionar ("only changes by restatement");
  - os dados de origem por baixo do indicador ficam só de leitura;
  - o recálculo pelos dados de origem já não mexe em indicadores submetidos ou aprovados.
- **Na task:**
  - a linha fica a verde água, com o fundo suave e a borda à esquerda;
  - o estado diz "Approved and published", com quem aprovou e quando;
  - no workflow, o passo Publicação mostra "N published", com os indicadores na tooltip.

### Documents com evidências, upload e leitura de faturas (QR, texto do PDF, OCR)

Pedido do André a 11 de novembro de 2026.

- **Documents** (`web-files/portal-documentos.js`, `P.listaDocumentos`): numa só página, todos os documentos a que a pessoa tem acesso.
  - Junta as evidências dos KPIs, os documentos das tasks, os ficheiros pedidos e os documentos ainda sem task.
  - Um ficheiro anexado a vários KPIs aparece uma vez, com todos os KPIs.
  - Cada documento mostra os KPIs (cada um abre a task nesse indicador), a task, o período, a empresa, o tipo e quem o carregou e quando. Se for uma fatura lida, mostra também o resumo: fornecedor, kWh, CPE, período e total.
  - Tem pesquisa em tudo (nome, KPI, task, empresa, fornecedor, CPE…) e filtros por empresa, período e tipo. O botão "Auditor package (Excel)" continua lá.
  - A página Evidence saiu do menu (classe `ps-oculto`), e a rota antiga abre Documents.
  - Os data owners passaram a ter acesso a Documents, só com as tasks deles.
- **Upload por Documents:**
  - escolhe-se o ficheiro, a task e os indicadores que ele suporta;
  - sem indicadores, fica como documento da task; sem task, fica por ligar;
  - a opção "It is an invoice: read the values" segue para a leitura.
- **Leitura de faturas** (`web-files/portal-faturas.js`): corre toda no browser, por isso funciona no GitHub Pages. As bibliotecas descarregam-se só quando se lê a primeira fatura.
  1. **QR code da AT** (jsQR): NIF do fornecedor e do cliente, data, número, ATCUD, IVA por taxa e total.
  2. **Texto do PDF** (pdf.js 3.11) para PDFs digitais.
  3. **OCR** (Tesseract.js 5, português) para digitalizações e fotografias, tolerante a erros típicos (O/0 no CPE, "kh" em vez de kWh).
  - As regras de leitura de faturas de eletricidade portuguesas apanham: fornecedor, CPE, período de faturação, nível de tensão, potência contratada, tipo de leitura, kWh total e por período horário, % renovável, gCO₂/kWh e totais. Os campos seguem `esquema-fatura-energia.json`.
  - **Ecrã de confirmação:** a primeira página da fatura aparece ao lado dos campos lidos, editáveis e coloridos pela confiança (alta, verificar, baixa, não encontrado).
    - Escolhe-se a task e o indicador de energia; por omissão é a task aberta cujo período apanha a fatura.
    - Quando a fatura apanha dois períodos, só a parte dos dias da task vai para essa task.
    - O valor entra no indicador como uma entrada por CPE, por isso várias faturas do mesmo período somam-se. A fatura fica como evidência, com os dados lidos.
    - Se a task tiver o E03, pode preencher-se também com a % renovável.
    - Há também a opção "Save as document only".
  - Na task, os indicadores de energia (MWh ou kWh) têm o botão **Read invoice** no detalhe.
- **Fatura de teste** (fictícia): `3 - Mockups/exemplos/fatura-eletricidade-teste.pdf` e a mesma em `.png`, para testar o OCR. Tem QR code da AT, dois períodos horários, rotulagem, e cobre 15/09 a 14/10/2026 (apanha o T3 e o T4).
- **Testado:** o PDF e a imagem leem todos os campos certos. Na task M05-T4 (Financeira), 14 dos 30 dias dão 14,467 MWh no E01, com a fatura como evidência, e a fatura encontra-se em Documents pelo CPE.

### Users and profiles pelos níveis do Reporting Perimeter, e os perfis novos

Pedido do André a 11 de novembro de 2026.

- **Tabela:** as colunas são Group | Company | Business unit / Department | Name | Profile | Actions.
  - As linhas estão ordenadas por empresa, departamento e nome.
  - O grupo é a empresa-mãe do perímetro (ou o nome da plataforma).
  - Abaixo do nome aparece "Area head of …" quando a pessoa é responsável de área.
  - A pesquisa procura também na empresa.
- **Perfis** (`P.PERFIS`):
  - **Data provider (focal point)** (`resp`): preenche e submete.
  - **Data reviewer (superior)** (`revisor`, novo): aprova o que o departamento submete. Ao escolher este perfil, a pessoa passa a ser area head dos seus departamentos, por isso o passo "Aprovação do responsável de área" vai para ela. Precisa de pelo menos um departamento e pode também reportar indicadores.
  - **Data approver (sustainability team)** (`esg`): aprova no fim e gere o Backoffice.
  - **Auditor** e **Administrator**.
- `P.daUnidade(u)`: data providers e data reviewers veem e acompanham as tasks dos seus departamentos, com as mesmas páginas. Os pareceres de área também incluem os reviewers.
- No arranque, o area head de cada departamento é o data reviewer desse departamento; se não houver, é o primeiro data provider.

### Tasks: My Tasks e All Tasks, e só aparece o que é mesmo meu

Pedido do André a 11 de novembro de 2026 (exemplo de teste: Marta Lopes via uma task da Entidade B atribuída a Paulo Serra).

- **Causa:** na recolha, qualquer data provider do departamento podia agir na task, mesmo atribuída a outra pessoa ou de outra empresa.
- **Regra nova** (`P.podeAgir`, responsável `unidade`):
  - task atribuída a uma pessoa: só essa pessoa preenche (e o administrador);
  - task atribuída ao departamento: só as pessoas desse departamento que trabalham na empresa da task (Users and profiles → Company).
- **Menu:** "My tasks" passou a **Tasks**, também no menu do telemóvel.
- **Na página há dois separadores:**
  - **My Tasks:** o que espera por mim (preencher, rever, aprovar), incluindo as tasks com indicadores submetidos à espera da minha aprovação.
  - **All Tasks:** todas as tasks, para acompanhar o reporte. Só o administrador, a equipa de sustentabilidade e o auditor o têm; os contribuidores veem só My Tasks.
  - A caixa "Waiting on me" saiu e o subtítulo explica cada separador.

### Overview: Data view com seleção de empresas (pivot)

Pedido do André a 11 de novembro de 2026.

- O "Data view" da Overview tem agora três opções: **Consolidated**, **By company** e **Selection**.
- **Selection:** escolhem-se as empresas, uma a uma, incluindo as que estão fora do perímetro do grupo.
  - Cada empresa conta a 100%: os volumes somam-se e os rácios fazem média.
  - Os indicadores de output refazem a conta com os inputs da seleção (`P.valorVista` aceita uma lista de empresas e chama `vistaSelecao`).
  - Os tiles, a completude, a matriz por período, "Pending approval" e "Recent activity" seguem a seleção (`naVista`).
  - A nota de cada tile diz "Sum of N companies, each at 100%" ou "Average of…".
  - Com uma só empresa, é igual a By company.

### Ficheiros no SharePoint: estrutura de pastas e flows para a migração

Pedido do André a 11 de novembro de 2026. Hoje os ficheiros ficam no browser (IndexedDB) e, no ambiente de testes, no Supabase. Em Power Pages, os binários passam para o SharePoint através de flows. A estrutura fica já definida, para cada ficheiro saber desde o upload para onde vai.

**Onde ficam:** site **ESG Data Hub**, biblioteca de documentos **Reporting** (`P.SP` em `web-files/portal-sharepoint.js`).

```
Reporting/
  2026/
    Entidade A/
      Energia e clima/
        E01 - Consumo de eletricidade/
          T1/  T2/  T3/  T4/            <- evidências e faturas do KPI nesse período
        E03 - Eletricidade de fontes renováveis/
          Ano/
      Água e saneamento/
        A01 - Água entrada no sistema/
          T1/ … T4/
      _Task documents/
        Operações/
          T1/ … T4/  Ano/               <- documentos da task sem KPI (ficheiros pedidos, gerais)
    Entidade B/
      …
    _To classify/                       <- carregados sem task, para ligar depois
```

- **Regras** (`P.pastaSP`, `P.pastaKpiSP`):
  - Ano / Empresa / Tema da empresa / "Código - Nome do KPI" / Período (T1 a T4 ou Ano).
  - Um ficheiro de vários KPIs fica uma vez, na pasta do primeiro. Os outros ficam na coluna de metadados **KPIs**, para se encontrarem por pesquisa e por vistas.
  - Os nomes são limpos dos caracteres que o SharePoint não aceita (`" * : < > ? / \ | # % & { } ~`) e encurtados para não passar o limite de 400 caracteres do caminho.
- **Cada ficheiro guarda o caminho** (`x.sp`) no momento do upload: evidências (`P.anexar`), documentos de task, faturas lidas e documentos por classificar. Assim não muda de sítio se depois se renomear um KPI ou uma empresa.
- **Em Documents**, cada documento mostra a pasta, com o caminho completo na tooltip.
- **Botão "SharePoint folders (Excel)"** em Documents, para a equipa de sustentabilidade e o administrador (`P.esqueletoSP`, `P.exportarEsqueletoSP`):
  - folha *Folders*: todas as pastas do ano (com os dados de demonstração são 292), uma por empresa abrangida, tema, KPI e período (pelos momentos de reporte do KPI), mais as pastas de task por departamento e a de classificar;
  - folha *Metadata columns*: as colunas a criar na biblioteca.
- **Colunas de metadados da biblioteca:** KPIs, Task ID, Company, Reporting period, Document type, Uploaded by, Uploaded in platform, Platform file ID e Invoice data (JSON, com os campos de `esquema-fatura-energia.json`).
  - As pastas são para navegar; as colunas são para filtrar, criar vistas e dar permissões por empresa.

**Flows a criar na migração (Power Automate):**
1. **Criar o esqueleto** (no arranque de cada ciclo e quando se cria um KPI ou uma empresa): lê a lista de pastas (a mesma lógica de `P.esqueletoSP`, a partir das tabelas do Dataverse) e, para cada caminho, usa a ação *Create new folder* do SharePoint. A ação cria a hierarquia toda e não falha se a pasta já existir.
2. **Guardar cada ficheiro carregado** (gatilho: linha criada na tabela de ficheiros/anexos do Dataverse, a partir da evidência, do documento da task ou da fatura):
   1. calcula ou lê o caminho guardado no registo (`sp`);
   2. *Create file* no SharePoint, nessa pasta, com o binário;
   3. preenche as colunas de metadados (*Update file properties*);
   4. grava no registo do Dataverse o link do ficheiro no SharePoint e o ID do item;
   5. opcional: apaga o binário do Dataverse, para poupar armazenamento, e a plataforma passa a abrir o ficheiro pelo link do SharePoint.
3. **Mover quando se reclassifica:** quando um documento de "_To classify" é ligado a uma task ou KPI, *Move file* para a pasta nova e atualiza as colunas.
4. **Permissões:** grupos por empresa (leitura) e a equipa de sustentabilidade (edição). Os auditores ficam só com leitura. As pastas do ano fechado passam a só leitura no fecho do ciclo.

### Dashboard executivo (Monitoring → Dashboard)

Pedido do André a 11 de novembro de 2026, com uma imagem de referência.

- **Página nova `Dashboard`:** web page, snippet `Dashboard/Introducao` e bloco `dashboard` em `web-files/portal-dashboard.js`. É a primeira entrada do menu Monitoring e só a veem o administrador, a equipa de sustentabilidade e o auditor.
- **Filtros:**
  - perímetro: Consolidated, uma empresa ou uma seleção de empresas (cada uma a 100%, como na Overview);
  - período: o ano ou um trimestre.
  - No ano, quando o valor anual ainda não existe, o valor junta os trimestres reportados pela regra de agregação do KPI e fica marcado **YTD**. Num trimestre, a comparação é com o mesmo trimestre do ano anterior.
- **Scorecard ESG global:** até 8 KPIs, por omissão Emissões Scope 1+2 (tCO2e), % renovável, intensidade carbónica, taxa de severidade, mulheres em liderança, rotatividade, formação anticorrupção e completude do reporte.
  - Cada tile mostra o pilar, o valor, a unidade e o nome, e a variação face ao ano anterior (em % ou p.p.).
  - Mostra também o estado em texto: **On target** (meta atingida), **On track**, **Attention** (até 5% no sentido errado), **At risk** e **No data yet**.
  - O sentido "menos é melhor" (emissões, rotatividade, acidentes…) vem das metas ou de uma lista no código.
  - O botão **Choose the KPIs** permite escolher, ordenar e repor os KPIs. A escolha fica guardada no ciclo (`S.ciclo.dashKpis`).
- **Ambiente:** emissões por scope (barras), energia (% renovável deste ano e do anterior, eletricidade, energia primária, lamas valorizadas) e trajetória face às metas.
- **Social:** força de trabalho, mulheres (no total e na liderança, mais a diferença salarial) e saúde e segurança.
- **Governance:** ética e compliance (4 barras), cadeia de fornecimento e clientes.
- As barras têm o valor sempre em texto e uma tooltip. A cor nunca é a única informação.

### Tasks sent: por task ou por indicador, donut e apagar

Pedido do André a 11 de novembro de 2026.

- Backoffice → **Tasks sent** tem duas vistas, **By task** e **By indicator**, e uma pesquisa (task, empresa, departamento, pessoa ou KPI).
  - **By task:** o donut do estado dos indicadores na linha (o mesmo da página Tasks), a empresa, a atribuição, o prazo e o estado.
  - **By indicator:** uma linha por KPI enviado, com a task, a empresa, a pessoa atribuída, o valor, o prazo e o estado. Cada KPI abre a task nesse indicador.
- **Apagar uma task enviada:** o ícone do caixote do lixo pede confirmação (`Pn.msApagar`).
  - O pop-up diz quantos valores e ficheiros a task já tem.
  - `P.apagarTask` apaga a task com os seus valores e ficheiros e deixa o registo no audit trail.
  - As tasks concluídas não se apagam, porque ficam no histórico.
  - Os indicadores podem voltar a ser enviados a partir de Indicators.

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
