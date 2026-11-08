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

| Nome | Record to Report (R2R), em vez de Portal de Sustentabilidade | Indicação do André, 4 de novembro de 2026 |
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
- **Por omissão:** paleta azul e nome "Record to Report (R2R)", sem logótipo. O monograma usa a sigla entre parênteses.

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
