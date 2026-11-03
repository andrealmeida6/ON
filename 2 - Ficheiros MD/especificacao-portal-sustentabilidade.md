# Portal de Dados de Sustentabilidade - Especificação para desenvolvimento

Versão 1.0, 3 de novembro de 2026
Setor de referência: água e saneamento. Ciclo de reporting em curso: 2026.

Cópia do projeto, sem nomes de empresas. As decisões de implementação estão em `plano-portal-sustentabilidade.md`.

## 0. Como usar este documento

Este documento junta tudo o que foi alinhado sobre a plataforma. É acompanhado pelo protótipo `3 - Mockups/mockup-final.html`, que se abre no navegador e simula a plataforma completa.

- O **protótipo é a referência funcional e visual**. Quando este documento e o protótipo divergirem, vale este documento, e a divergência deve ser assinalada.
- No protótipo, os dados ficam no `localStorage` do navegador e não há servidor. Em produção, tudo o que está em `localStorage` passa para uma base de dados (ver secção 21).
- Os valores do protótipo são de demonstração, tirados de um relatório de sustentabilidade público do setor. Os valores do "ano anterior" (2025) são esses valores reutilizados.
- No protótipo, cada perfil entra sem palavra-passe, para facilitar demonstrações. Em produção a autenticação é obrigatória (secção 20).
- Os termos técnicos ficam em inglês (milestone, workflow, backoffice, dashboard, data room, assurance, schema, template). O resto da interface é em português europeu.

## 1. Contexto e objetivo

As empresas que publicam relatório de sustentabilidade recolhem dezenas de indicadores junto de várias áreas internas e de fornecedores, normalmente por email e folhas de cálculo. Os relatórios do setor mostram os sintomas: o mesmo indicador com valores diferentes em páginas diferentes, variações grandes sem explicação e perímetros misturados.

A plataforma **orquestra a recolha**: concentra os pedidos de dados, valida os valores no momento em que entram, encaminha cada entrega por um workflow de revisão e aprovação, e monta os quadros do relatório a partir do que foi aprovado.

Não é um data lake. Mas como cada valor aprovado fica guardado com ano, versão, evidência e aprovador, ao fim de alguns ciclos a plataforma tem uma base histórica limpa e auditada que pode alimentar um data lake.

## 2. Princípios de desenho

1. **A milestone é a unidade de trabalho.** Uma milestone é um momento de entrega de informação, atribuído a uma unidade de negócio, para um ano de reporting, com prazo e um conjunto de indicadores. Tudo o resto (dados, evidências, contributos externos, auditoria, conversa) vive dentro de uma milestone.
2. **Cada milestone tem um workflow.** Parte de um workflow base e pode ser alterado a qualquer momento, sem mexer nos passos já concluídos.
3. **Recolher uma vez, usar várias.** O mesmo dado serve o relatório, a contabilidade, o regulador (ERSAR, APA) e as operações. Uma fatura entra uma vez e alimenta todas as áreas.
4. **Dados base e indicadores derivados.** Sempre que possível recolhem-se dados base e a plataforma calcula os derivados, para o mesmo número não ser escrito duas vezes.
5. **Validação no momento.** Cada valor é validado ao ser escrito ou importado, e não no fim do ciclo.
6. **Tudo auditável.** Cada valor tem histórico de versões, origem, qualidade, evidência, quem submeteu e quem aprovou.
7. **O ano pertence à milestone.** A plataforma corre por ciclos anuais. O ano fica gravado na milestone e em cada valor.
8. **Mobile e acessível.** Quem responde muitas vezes está numa instalação e não à secretária.

## 3. Glossário

| Termo | Significado |
|---|---|
| Ciclo de reporting | O ano para o qual se recolhem dados (por exemplo, 2026). |
| Milestone | Entrega de um conjunto de indicadores por uma unidade, com prazo, ano e workflow próprios. |
| Unidade de negócio | Área interna responsável pela entrega (Operações, Recursos Humanos, Financeira, etc.). |
| Workflow | Sequência de passos de uma milestone (recolha, validação, revisão, parecer, aprovação, publicação). |
| Indicador | Métrica pedida (por exemplo, "Consumo de eletricidade, MWh"). |
| Dado base / derivado | Valor recolhido diretamente / valor calculado a partir de outros por fórmula. |
| Perímetro | Conjunto de entidades a que o valor se refere: grupo, empresas maioritárias, concessões. |
| Limiar | Variação máxima face ao ano anterior a partir da qual é obrigatório justificar. |
| Evidência | Documento que suporta um valor (fatura, extração de sistema, certificado). |
| Contributo externo | Valor pedido a uma entidade fora da empresa (fornecedor, parceiro). |
| Reexpressão | Correção de um valor já aprovado, com motivo, mantendo o valor anterior no histórico. |
| Data room | Exportação para o auditor com rastreabilidade, histórico, pedidos e workflow. |
| Caminho ESRS | Indicadores que o relatório atual não publica, mas que as ESRS pedem. |

## 4. Perfis e permissões

| Perfil | Quem é | O que pode fazer |
|---|---|---|
| Administrador | Equipa que gere a plataforma | Tudo, incluindo backoffice, workflow base e utilizadores. |
| Equipa de sustentabilidade | Direção de I&D, CSR e ESG | Ver todas as milestones; rever, aprovar e devolver; alterar workflows; reexpressar valores; pedir contributos externos; configurar o backoffice. |
| Responsável pelos dados | Uma pessoa ou equipa por unidade de negócio | Preencher e submeter as milestones da sua unidade; dar os pareceres pedidos à sua área; anexar evidências; pedir contributos externos; ajustar o workflow das suas milestones; responder a pedidos do auditor sobre a sua unidade. |
| Auditor | Auditor externo da assurance | Consultar tudo; selecionar amostras; fazer pedidos de informação; dar pedidos por resolvidos; exportar a data room. Não altera valores. |
| Entidade externa | Fornecedor ou parceiro | Ver e responder apenas aos pedidos dirigidos à sua organização. Não vê mais nada da plataforma. |

Regras de acesso:
- Um responsável só age numa milestone quando o passo atual lhe pertence (unidade da milestone ou área a quem foi pedido parecer).
- Os passos automáticos (validação, publicação) não são feitos por pessoas.
- A entidade externa só tem uma página: "Pedidos de dados".
- Recomenda-se segregação de funções em produção: quem submete uma milestone não pode ser quem a aprova (no protótipo isto não está forçado).

Utilizadores de demonstração (um por unidade): ver Anexo E.

## 5. Modelo de dados

Nomes indicativos. Os campos marcados com * são obrigatórios.

### 5.1 CicloReporting
- `ano`* (inteiro, por exemplo 2026), `estado` (aberto, fechado), `data_abertura`.
- Abrir um novo ciclo cria as milestones desse ano a partir do workflow base. O ciclo anterior fica fechado e disponível no histórico.

### 5.2 Milestone
- `id`*, `nome`* (gerado: "Entrega trimestral 2026 de Recursos Humanos"), `ano`*, `unidade`*, `periodicidade`* (Mensal, Trimestral, Anual, Novos dados ESRS), `prazo`*, `indicadores`* (lista), `passos`* (lista ordenada de PassoWorkflow), `passo_atual` (índice), `devolvida` (booleano), `workflow_ajustado` (booleano), `documentos_gerais`, `comentarios`, `eventos` (histórico).
- Regra de criação: uma milestone por combinação **unidade × periodicidade × ano**. Os indicadores do caminho ESRS ficam numa milestone própria por unidade ("Novos dados ESRS").

### 5.3 PassoWorkflow
- `id`*, `nome`*, `tipo`* (ver 6.2), `responsavel`* (unidade da milestone, equipa de sustentabilidade, administrador, uma área específica, ou sistema), `concluido_em`, `concluido_por`.

### 5.4 Indicador (catálogo)
- `id`*, `nome`*, `unidade_medida`*, `tema`* (Água e saneamento, Energia e clima, Pessoas, Governance, Comunidade e cliente), `quadro`* (Desempenho, Ambientais, Sociais, Governance, ESRS), `unidade_negocio`*, `tipo`* (base, derivado), `formula`, `periodicidade`*, `perimetro`*, `limiar_variacao_pct`*, `evidencia_obrigatoria` (booleano), `regras_coerencia` (lista de textos), `esrs`, `esrs_requisito`, `gri`, `utilizado_por` (Relatório, Contabilidade, ERSAR, APA, Operações), `novo_esrs` (booleano), `casas_decimais`.

### 5.5 ValorIndicador (por indicador, por ano)
- `indicador_id`*, `ano`*, `milestone_id`*, `valor`, `estado` (por recolher, em preenchimento, devolvido, em revisão, com alertas, aprovado), `qualidade` (medido, calculado, estimado), `metodo_estimativa`, `justificacao`, `evidencias` (lista), `reexpresso` (booleano), `versoes` (lista de VersaoValor).
- `valor_ano_anterior` vem do ValorIndicador aprovado do ano anterior.

### 5.6 VersaoValor
- `valor`*, `em`*, `por`*, `origem`* (manual, importação de ficheiro X, externo: entidade, reexpressão), `motivo` (obrigatório na reexpressão). Nunca se apaga.

### 5.7 Evidencia
- `id`, `ficheiro`*, `indicador_id` ou `milestone_id`*, `carregado_por`, `carregado_em`, `hash` (recomendado, para integridade).

### 5.8 PedidoExterno
- `id`*, `indicador_id`*, `milestone_id`*, `entidade_externa`*, `descricao`*, `prazo`*, `estado` (pendente, recebido, aplicado), `valor`, `evidencia`, `respondido_em`.

### 5.9 PedidoAuditor
- `id`*, `indicador_id`*, `texto`*, `por`*, `em`*, `estado` (aberto, respondido, resolvido), `resposta` {texto, por, em}.

### 5.10 Outros
- **Comentario**: `milestone_id`, `autor`, `texto`, `em`.
- **Evento** (log da milestone, imutável): `milestone_id`, `texto`, `em`, `por`.
- **Entidade**: `nome`, `perimetro_grupo` (booleano), `perimetro_maioritario` (booleano). Ver Anexo F.
- **JanelaReporting**: `nome`, `tema`, `meses`, `dia_inicio`, `dia_fim`. Ver Anexo G.
- **Documento (fatura)**: `tipo` (eletricidade, água, combustível), `fornecedor`, `periodo`, `instalacao`, `entidade`, `consumo` (kWh, m³ ou litros), `valor_sem_iva`, `iva`, `percentagem_renovavel`, `centro_custo`, `leitura_telemetria`, `estado` (em conferência, distribuída).
- **Materialidade**: por norma ESRS, `avaliacao` (material, não material, por avaliar) e `justificacao`.
- **Meta**: `indicador_id`, `valor_meta`, `ano_meta`, `sentido` (subir, descer).
- **Marca**: `nome`, `subtitulo`, `logotipo`, `cores` (principal, secundária, destaque, fundo, texto).

## 6. Milestones e workflow

### 6.1 Workflow base

| # | Passo | Tipo | Responsável |
|---|---|---|---|
| 1 | Recolha e submissão dos dados | Recolha e submissão | Unidade responsável pela milestone |
| 2 | Validação automática | Validação automática | Automático |
| 3 | Revisão pela equipa de sustentabilidade | Revisão | Equipa de sustentabilidade |
| 4 | Aprovação final | Aprovação | Equipa de sustentabilidade |
| 5 | Publicação nos quadros do relatório | Publicação no relatório | Automático |

### 6.2 Tipos de passo

| Tipo | O que acontece |
|---|---|
| Recolha e submissão | A unidade preenche ou importa os valores e submete. É sempre o primeiro passo. |
| Validação automática | O sistema corre as regras (secção 7) e regista o resultado. Avança sozinho. |
| Revisão | A equipa de sustentabilidade revê valores, alertas e justificações. |
| Parecer de outra área | Uma área específica dá parecer (por exemplo, a Financeira sobre Compras). |
| Aprovação | Aprova e bloqueia os valores. |
| Publicação no relatório | O sistema publica os valores nos quadros. Avança sozinho. |

### 6.3 Ações num passo

- **Submeter milestone** (passo de recolha). Só é possível quando: todos os indicadores têm valor; nenhum valor tem erro; todas as variações acima do limiar estão justificadas; todos os valores estimados têm método; todas as evidências obrigatórias estão anexadas. Se faltar algo, a mensagem diz o quê e leva o cursor ao campo.
- **Concluir revisão / Dar parecer favorável / Aprovar e bloquear**. Comentário opcional.
- **Devolver à unidade**. Comentário obrigatório. A milestone volta ao passo de recolha, todos os passos ficam por fazer, o estado passa a "Devolvida" e, se faltarem menos de 3 dias para o prazo, o prazo passa para daqui a 3 dias.
- Os passos automáticos correm logo a seguir ao passo anterior.
- Cada ação gera um evento no histórico da milestone com o nome de quem a fez.

### 6.4 Alterar o workflow a qualquer momento

Disponível para administrador, equipa de sustentabilidade e responsável da unidade da milestone, enquanto a milestone não estiver concluída.

- Pode acrescentar, remover, reordenar e renomear passos e mudar o responsável.
- Passos concluídos: bloqueados, não mudam.
- Passo atual: só muda o nome e o responsável.
- O primeiro passo é sempre de recolha.
- O workflow tem de ter pelo menos um passo de revisão, parecer ou aprovação.
- Um passo novo é inserido antes da publicação.
- "Repor a partir do workflow base" substitui os passos seguintes ao atual pelos do base.
- Ao guardar, a milestone fica marcada como "Workflow ajustado" e o novo workflow fica registado no histórico.
- O **workflow base** edita-se no backoffice e aplica-se às milestones novas. Opção para o aplicar também às milestones que ainda não começaram e não foram ajustadas.

### 6.5 Estados

Estado da milestone (derivado do passo atual):
- **Em recolha**: passo atual é de recolha e o prazo não passou.
- **Em atraso**: passo atual é de recolha e o prazo passou.
- **Devolvida**: voltou à recolha por devolução.
- **Em revisão / A aguardar parecer / Em aprovação**: conforme o tipo do passo atual.
- **Concluída**: todos os passos feitos.

Estado de cada indicador (derivado da milestone):
- No passo de recolha: "Por recolher" (sem valor), "Em preenchimento" (com valor) ou "Devolvido".
- Depois da recolha: "Em revisão" ou "Com alertas" (se a validação gerou alertas).
- Milestone concluída: "Aprovado".

## 7. Recolha e validação

### 7.1 Entrada manual
- Uma linha por indicador: nome, unidade de medida, tipo, perímetro, valor do ano anterior, campo do valor, variação calculada no momento, resultado da validação.
- Os valores guardam-se automaticamente ao sair do campo. Aceita vírgula ou ponto decimal.
- Quando há alerta, aparece o texto do alerta e o campo de justificação, obrigatório.
- Por baixo de cada linha: qualidade do dado, método de estimativa (só se estimado), anexar evidência, estado da evidência obrigatória, contributo externo recebido (com "Usar este valor") e "Pedir a entidade externa".

### 7.2 Regras de validação

| Regra | Tipo | Comportamento |
|---|---|---|
| Valor não numérico | Erro | Bloqueia. |
| Percentagem fora de 0 a 100 | Erro | Bloqueia. |
| Valor negativo (restantes indicadores) | Erro | Bloqueia. |
| Variação face ao ano anterior acima do limiar do indicador | Alerta | Exige justificação. |
| Regras de coerência do indicador (por exemplo, o mesmo dado noutro quadro com outro valor) | Alerta | Exige justificação. |
| Valor estimado sem método | Bloqueio na submissão | Exige método. |
| Evidência obrigatória em falta | Bloqueio na submissão | Exige anexo. |

O limiar é configurável por indicador no backoffice. Os limiares e as regras de coerência iniciais estão no Anexo A.

## 8. Importação de ficheiros

### 8.1 Formatos
- **Excel (.xlsx)**: lê a folha `dados` ou, se não existir, a primeira folha. Números como número ou como texto com vírgula. O formato .xls antigo é recusado com mensagem a pedir .xlsx.
- **CSV**: separador ponto e vírgula (aceita vírgula), UTF-8.
- **JSON**: lista de registos, ou objeto `{ milestone_id, records: [...] }`.
- No protótipo a leitura de Excel usa a biblioteca SheetJS Community Edition 0.18.5 (licença Apache-2.0), no navegador.

### 8.2 Schema (uma linha por indicador)

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `milestone_id` | string | Sim | Identificador da milestone. Tem de ser igual ao da milestone onde se importa. |
| `indicator_id` | string | Sim | Identificador do indicador. Só são aceites os indicadores desta milestone. |
| `indicator_name` | string | Não | Nome do indicador, apenas para leitura humana. É ignorado na importação. |
| `entity` | string | Não | Entidade a que o valor se refere. Por omissão, Consolidado. |
| `period` | string | Sim | Ano de reporting da milestone, por exemplo 2026. |
| `value` | number | Sim | Valor numérico. Aceita vírgula ou ponto decimal. |
| `unit` | string | Sim | Unidade de medida. Tem de ser igual à do indicador. |
| `justification` | string | Não | Obrigatória quando a validação gera alertas (por exemplo, variação acima do limiar). |
| `source_system` | string | Não | Sistema de origem do dado (ERP, sistema comercial, telemetria, etc.). |
| `evidence_ref` | string | Não | Referência a uma evidência (nome do ficheiro, número de documento). Obrigatória nos indicadores com evidência obrigatória. |
| `data_quality` | string | Não | measured, calculated ou estimated. Por omissão, measured. |
| `estimation_method` | string | Não | Método da estimativa. Obrigatório quando data_quality é estimated. |

### 8.3 Ordem de validação
1. Formato do ficheiro e colunas obrigatórias (colunas desconhecidas são assinaladas e ignoradas).
2. Milestone e indicadores: só os desta milestone, sem repetições.
3. Tipos, ano e unidades: valor numérico, `period` igual ao ano da milestone, unidade igual à do indicador, `data_quality` válido.
4. Intervalos possíveis.
5. Regras de negócio: limiar, coerência, método de estimativa, evidência obrigatória.

### 8.4 Resultado
- Relatório linha a linha: válida, com alerta (com o motivo) ou rejeitada (com o motivo). Totais de válidas, com alertas, com erros e indicadores em falta no ficheiro.
- Botão "Aplicar N linhas válidas": aplica só as válidas e as com alerta. As rejeitadas não entram. Os indicadores em falta ficam para preencher à mão.
- Cada importação gera um evento e uma versão por valor ("importação de ficheiro X").
- Templates descarregáveis por milestone: Excel com duas folhas (`dados`, já com os indicadores e o ano; `instrucoes`, com regras e valores do ano anterior) e CSV.
- Botão de teste com um ficheiro de exemplo que tem erros propositados (unidade errada, ano errado, indicador de outra milestone, valor estimado sem método).

## 9. Contributos externos

- Num indicador ou no separador "Contributos externos" da milestone, quem acompanha a milestone cria um pedido: entidade, descrição do que se pede, prazo.
- A entidade externa entra na sua página "Pedidos de dados", com os pedidos agrupados por milestone, e envia valor e documento de suporte. O valor é validado no momento (intervalos e tipo).
- O valor recebido aparece na milestone com "Usar este valor" (só durante a recolha). Ao usar: o valor e a evidência passam para o indicador, a qualidade fica "Medido", cria-se uma versão "externo: entidade" e o pedido fica "Aplicado".
- Entidades de demonstração e pedidos: Anexo E.

## 10. Evidências e qualidade do dado

- Cada valor tem qualidade: **medido**, **calculado** (por defeito nos derivados) ou **estimado** (exige método).
- Evidências por indicador e documentos gerais por milestone.
- Indicadores com evidência obrigatória: assinalados no Anexo A.
- Separador "Evidências e qualidade" da milestone: tabela com qualidade, método e evidências por indicador, contador de evidências obrigatórias anexadas.

## 11. Histórico de valores e reexpressão

- Todas as alterações de um valor ficam registadas (VersaoValor). Visíveis na ficha do indicador.
- **Reexpressar valor aprovado** (equipa de sustentabilidade e administrador): novo valor e motivo obrigatório. O valor anterior fica no histórico, o indicador fica marcado "Reexpresso" e a correção aparece na auditoria e no histórico da milestone.

## 12. Auditoria (assurance)

Página "Auditoria", organizada por milestone:
- Resumo: % de aprovados com evidência, valores estimados, valores reexpressos, pedidos em aberto.
- Tabela por milestone: estado, aprovados, evidência obrigatória, estimados, reexpressos, pedidos abertos. Filtros: todas, concluídas, com pedidos abertos, na amostra. Clicar abre a milestone no separador Auditoria.
- **Amostra**: seleção aleatória de 5 indicadores aprovados, assinalados em toda a plataforma e registados no histórico das milestones.
- **Pedidos de informação**: o auditor pede sobre um indicador; o pedido vai para a conversa da milestone e para as notificações da unidade; a unidade, a equipa de sustentabilidade ou o administrador respondem; o auditor dá por resolvido.
- **Exportar data room (Excel)**, com as folhas: `rastreabilidade` (indicador, valor, qualidade, método, ESRS, GRI, unidade, milestone, submetido por e em, aprovado por e em, evidências, reexpresso, na amostra), `historico_valores`, `pedidos_auditor`, `workflow` (todos os passos de todas as milestones), `materialidade`.

Separador "Auditoria" de cada milestone: matriz de rastreabilidade dos indicadores dessa milestone e pedidos sobre ela.

## 13. Materialidade e referenciais

Fica no backoffice (é configuração do ciclo):
- Avaliação de cada norma ESRS (E1 a E5, S1 a S4, G1): material, não material ou por avaliar, com justificação. Inicialmente materiais: E1, E3, S1 e S4, correspondentes às quatro prioridades da dupla materialidade (clima, água, colaboradores, clientes).
- Cobertura por norma: número de indicadores, aprovados, e alerta "Sem indicadores" quando uma norma material não tem indicadores.
- Tabela "Um dado, vários referenciais": indicador, milestone, requisito ESRS, código GRI, outros utilizadores (ERSAR, APA, Contabilidade, Operações), estado.
- Nota: o mapeamento usa a numeração das ESRS de 2023. As ESRS simplificadas propostas pelo EFRAG (cerca de 61% menos datapoints) deverão ser adotadas pela Comissão no final de 2026, com aplicação obrigatória a partir do exercício de 2027. O mapeamento tem de ser revisto quando o ato delegado for publicado.

## 14. Mapa de ecrãs

Navegação lateral em dois grupos. No telemóvel, barra inferior com Início, Pendentes, Milestones, Consolidado e Mais.

**Trabalho**: Início, Milestones pendentes, Milestones, Consolidado.
**Informação**: Documentos, Relatório, Histórico, Auditoria, Backoffice (administrador e equipa de sustentabilidade).
**Entidade externa**: apenas Pedidos de dados.

### 14.1 Entrada
- Painel de apresentação à esquerda e lista de perfis agrupados à direita (Administração, Sustentabilidade, Responsáveis pelos dados, Auditoria, Entidades externas).
- Em produção: login com a conta da empresa (secção 20); entidades externas com conta convidada.

### 14.2 Início
- Bloco de boas-vindas claro: ciclo em curso, saudação, frase sobre o que está à espera do utilizador, e quatro números: pendentes consigo, em atraso, em revisão ou aprovação, concluídas.
- "Milestones pendentes consigo" (até 5).
- "Próximas entregas": linha temporal das milestones ainda em recolha, em quatro colunas (em atraso, próximos 7 dias, 8 a 21 dias, mais tarde), com marcação "consigo".
- **Calendário à direita** (fixo ao fazer scroll; passa para baixo no telemóvel): prazos das milestones com cor por estado e janelas de reporting por tema. Ao escolher um dia, mostra as janelas e as milestones com prazo nesse dia. Botão "Enviar lembrete" às milestones em atraso (equipa de sustentabilidade e administrador).
- Na página inicial **não** aparece a percentagem do relatório. Isso fica no Consolidado.

### 14.3 Milestones pendentes
- Para o responsável: "Para preencher e submeter", "Para dar parecer", "Para acompanhar" (milestones da unidade que estão com outras áreas).
- Para a equipa de sustentabilidade: "Para rever e aprovar".

### 14.4 Milestones
- Filtros: unidade de negócio, estado (todas, em curso, em atraso, concluídas), incluir caminho ESRS.
- Vista Lista (agrupada por unidade) e vista Board (colunas Recolha, Revisão e parecer, Aprovação, Concluídas).
- Cada linha: nome, passo atual e responsável, barra de passos do workflow, prazo, estado.

### 14.5 Página da milestone
- Cabeçalho: estado, ano, periodicidade, etiquetas (caminho ESRS, workflow ajustado), nome, ano de reporting, unidade, prazo, indicadores preenchidos, utilizadores do dado, botão "Visão técnica".
- **Workflow**: passos em linha com estado (concluído com data, atual destacado, por fazer), botão "Alterar workflow".
- Separadores:
  - **Dados** (ou Revisão, para quem aprova): importação, entrada e validação (secções 7 e 8); para quem aprova, valores, alertas, justificações, comentário e botões "Devolver à unidade" e "Aprovar".
  - **Evidências e qualidade**.
  - **Contributos externos**.
  - **Auditoria**.
  - **Conversa e histórico**.

### 14.6 Visão técnica (painel lateral largo)
Separadores: Schema do ficheiro, JSON Schema (gerado para a milestone, copiar ou descarregar), Templates (Excel e CSV), API e integrações (secção 19).

### 14.7 Ficha do indicador (painel lateral)
Valor do ano anterior, valor do ano, variação, alertas, justificação, ano, unidade, milestone, tipo, fórmula, limiar, utilizadores, qualidade, evidências, referenciais, histórico de valores, reexpressão (se aprovado e com permissão), "Pedido de informação do auditor", "Abrir a milestone".

### 14.8 Consolidado
- Indicadores reportados pelas áreas, aprovados e consolidados, milestones concluídas.
- Metas e trajetória (Anexo H) e qualidade dos dados (medido, calculado, estimado).
- Por quadro do relatório e por tema: barras com aprovado, reportado em revisão, em preenchimento, por reportar.
- Por área: estado (tudo aprovado, tudo reportado, em curso, com atraso), milestones da área e valores de cada indicador.
- Opção para incluir o caminho ESRS.

### 14.9 Documentos
- Caixa de faturas (eletricidade, água, combustível) e carregamento de nova fatura.
- Campos confirmados pelo utilizador e distribuídos para sustentabilidade (consumo, % renovável), contabilidade (valor, IVA, centro de custo) e operações (consumo por instalação).
- Conferência entre faturado e telemetria: diferença acima de 5% segue para a Financeira validar com o fornecedor antes do pagamento.
- No protótipo, a leitura dos campos da fatura é simulada. A extração automática (OCR ou IA) é uma capacidade a avaliar e não está assumida.

### 14.10 Relatório
- Quadros do relatório: desempenho (perímetro do grupo), ambientais, sociais e governance (perímetro das empresas maioritárias) e caminho ESRS. Colunas ano, ano anterior, estado. Só os valores aprovados aparecem.
- Exportar para Excel (uma folha por quadro, com qualidade, ESRS e GRI) e imprimir ou guardar em PDF.

### 14.11 Histórico
- Série por indicador. Para a água não faturada e a água entrada no sistema há série publicada de 2011 a 2024, seguida do ano anterior e do ciclo em curso.
- Exportar valores aprovados em JSON.

### 14.12 Pedidos de dados (entidade externa)
Pedidos agrupados por milestone, com prazo, descrição, campo de valor, documento de suporte e "Enviar".

### 14.13 Notificações
Sino no topo com contador. Por perfil: milestones devolvidas, em atraso, com prazo nos próximos 5 dias, à espera de decisão, pedidos do auditor em aberto ou respondidos, valores recebidos de entidades externas, pedidos para a entidade externa. Em produção, recomenda-se enviar também por email ou Teams.

### 14.14 Backoffice
Separadores:
1. Ciclo de reporting: ano em curso e abrir novo ciclo.
2. Materialidade e referenciais.
3. Utilizadores e perfis.
4. Entidades externas (pedidos e estado).
5. Workflow base.
6. Indicadores e milestones.
7. Calendário (janelas de reporting).
8. Regras de validação (limiar por indicador).
9. Marca: logótipo, nome, subtítulo, cinco cores com pré-visualização imediata, paletas sugeridas, exportar, importar e repor.
10. Áreas consumidoras do dado.
11. Entidades e perímetros.
12. Dados e armazenamento: exportar e importar todos os dados, repor demonstração (só no protótipo).

## 15. Calendário e janelas de reporting

Janelas iniciais (configuráveis): Anexo G. As janelas definem quando se recolhe; o prazo de cada milestone define quando se entrega. Recomenda-se gerar os prazos das milestones a partir das janelas ao abrir o ciclo.

## 16. Indicadores e milestones iniciais

- Catálogo de 70 indicadores: 62 do relatório atual e 8 do caminho ESRS (Anexo A).
- 25 milestones de demonstração para 2026 (Anexo B).
- Unidades Compras e Frota estão "a confirmar" com o cliente.

## 17. Ciclo de reporting e ano

- O ciclo em curso é 2026. O ano de comparação é o anterior (2025).
- Todos os rótulos de colunas, alertas e textos usam o ano da milestone (por exemplo, "variação face a 2025").
- Os ficheiros importados têm de ter `period` igual ao ano da milestone.

## 18. Exportações

| Onde | Formato | Conteúdo |
|---|---|---|
| Milestone | Excel, CSV | Template de importação |
| Visão técnica | JSON | JSON Schema da milestone |
| Relatório | Excel, PDF | Quadros |
| Auditoria | Excel | Data room |
| Histórico | JSON | Valores aprovados |
| Backoffice | JSON | Marca; cópia completa dos dados |

## 19. API e integrações

Contrato proposto para integrações futuras (Power Automate, Azure Data Factory, Databricks, APIs de fornecedores). É ilustrativo e fica a fechar no desenho técnico.

- `GET /api/v1/milestones/{id}/schema`: devolve o JSON Schema da milestone para o sistema de origem validar antes de enviar.
- `POST /api/v1/milestones/{id}/submissions`: envia valores. Aplica as mesmas validações da importação manual. Resposta `202 Accepted` com o resultado por indicador.
- Webhook `milestone.step_completed` quando um passo termina, para avisar outros sistemas (contabilidade, data lake).

Exemplo de envio:

```json
{
  "milestone_id": "M10",
  "submitted_by": "svc-integracao@empresa.pt",
  "source_system": "ERP",
  "records": [
    { "indicator_id": "P16", "entity": "Consolidado", "period": "2026", "value": 13.84, "unit": "%", "justification": "Mudança de fórmula face ao ano anterior.", "evidence_ref": "DOC-2026-0001", "data_quality": "measured" }
  ]
}
```

Exemplo de resposta:

```json
{
  "submission_id": "sub_m10_0001",
  "status": "accepted_with_warnings",
  "milestone": { "id": "M10", "reporting_year": 2026, "current_step": "Validação automática" },
  "summary": { "received": 1, "valid": 0, "warnings": 1, "errors": 0 },
  "results": [ { "indicator_id": "P16", "status": "warning", "messages": ["Variação de +336,6% face a 2025, acima do limiar de 15%.", "Variação muito acima do histórico. Verificar se a fórmula mudou face ao ano anterior."] } ]
}
```

Exemplo de webhook:

```json
{ "event": "milestone.step_completed", "milestone_id": "M10", "step": { "name": "Revisão pela equipa de sustentabilidade", "completed_by": "Equipa de sustentabilidade" }, "next_step": "Aprovação final", "occurred_at": "2026-11-03T10:00:00Z" }
```

Fontes de dados prováveis (a confirmar com o cliente): ERP (compras, financeiro), sistema comercial (faturação, clientes), telemetria e SCADA (água, energia), sistema de RH, laboratório (qualidade da água e efluentes), cartões de combustível, comercializadores de energia (faturas, garantias de origem).

## 20. Requisitos não funcionais

- **Autenticação**: conta da empresa (por exemplo Microsoft Entra ID), com perfis atribuídos por grupo. Entidades externas como contas convidadas com acesso só aos seus pedidos.
- **Autorização**: aplicada no servidor, não só na interface.
- **Auditabilidade**: eventos, versões de valores e respostas a pedidos nunca se apagam. Recomenda-se hash dos ficheiros de evidência.
- **Bloqueio**: valores aprovados só mudam por reexpressão.
- **Ficheiros**: evidências guardadas em armazenamento de documentos, com tamanho máximo a definir e antivírus.
- **Acessibilidade**: WCAG 2.1 AA (navegação por teclado, foco visível, etiquetas para leitores de ecrã, contraste, respeito por "reduzir movimento").
- **Mobile**: sem scroll horizontal a 390 px de largura; alvos de toque de pelo menos 44 px; campos com letra de 16 px; barra de navegação inferior; ação principal sempre visível no fundo do ecrã.
- **Formatos**: números em pt-PT (vírgula decimal, espaço nos milhares), datas dd/mm, fuso Europe/Lisbon.
- **Escrita da interface**: português europeu, frases curtas, sem travessões, verbos de ação nos botões ("Submeter milestone" gera "Milestone submetida").

## 21. Arquitetura (a decidir)

O protótipo não impõe tecnologia. Duas opções que se ajustam ao contexto:

**Opção A, Power Platform**
- Power Pages (portal para responsáveis, auditor e entidades externas), Dataverse (modelo de dados da secção 5, com segurança por perfil e por unidade de negócio), Power Automate (passos automáticos, lembretes, notificações, webhooks), SharePoint (evidências), Power BI (Consolidado e Histórico, se se quiser).
- Vantagem: autenticação, segurança por linha e auditoria do Dataverse já existem.

**Opção B, aplicação web sobre Azure**
- Front-end web (o protótipo serve de base de componentes), API, Azure SQL ou Databricks (com Unity Catalog para o histórico), Azure Blob Storage para evidências, Entra ID.
- Vantagem: mais controlo sobre a interface e encaixe direto no data lake.

Em ambas: o JSON Schema por milestone e o contrato da secção 19 devem ser a mesma fonte de verdade para importação manual e integrações.

Correspondência com o armazenamento do protótipo:

| Chave no protótipo | Entidade em produção |
|---|---|
| `esg_cycle` | CicloReporting |
| `esg_ms` | Milestone, PassoWorkflow, Comentario, Evento, documentos gerais |
| `esg_items` | Indicador (catálogo) e ValorIndicador, VersaoValor, Evidencia |
| `esg_wfbase` | Workflow base |
| `esg_ext` | PedidoExterno |
| `esg_aud` | PedidoAuditor |
| `esg_mat` | Materialidade |
| `esg_docs` | Documento (fatura) |
| `esg_ent` | Entidade |
| `esg_windows` | JanelaReporting |
| `esg_brand` | Marca |
| `esg_sample` | Amostra do auditor |

## 22. Design

### 22.1 Cores (paleta azul por omissão, tons claros)

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#00338D` | Cor principal: títulos de marca, botões primários, item ativo |
| `--secondary` | `#0091DA` | Azul claro: workflow concluído, destaques |
| `--accent` | `#1E49E2` | Cobalto: gradientes |
| `--bg` | `#F4F7FC` | Fundo da aplicação |
| `--text` | `#0C233C` | Texto |
| `--surface` | `#FFFFFF` | Painéis |
| `--muted` | `#5A6B82` | Texto secundário |
| `--line` | `#DCE3EE` | Linhas |
| `--ok` | `#00805A` | Aprovado, válido |
| `--warn` | `#A86400` | Alerta |
| `--err` | `#BC204B` | Erro, atraso, devolvido |
| `--info` | `#005EB8` | Em recolha (azul médio) |
| `--rev` | `#483698` | Em revisão (violeta) |
| `--esrs` | `#7213EA` | Caminho ESRS |

Temas: Água e saneamento `#0091DA`, Energia e clima `#EAAA00`, Pessoas `#C6007E`, Governance `#483698`, Comunidade e cliente `#00A3A1`.

A marca é configurável no backoffice (secção 14.14): o logótipo entra por link web e as cinco cores aplicam-se a toda a plataforma.

### 22.2 Tipografia e componentes
- Instrument Sans (texto) e JetBrains Mono (só código na visão técnica), com fontes do sistema como alternativa. Em produção pode usar-se a fonte corporativa.
- Painéis brancos com linha fina (1 px) e raio 12 px; sem sombras pesadas.
- Estados como ponto de cor com texto em fundo pastel.
- O workflow é o elemento de destaque: passos ligados por uma barra que se enche à medida que avançam, com o passo atual assinalado.
- Listas em vez de cartões sempre que possível; tabelas que viram cartões no telemóvel.

## 23. Fora de âmbito e decisões em aberto

- Assistência por IA (sugestão de justificações, extração de faturas): fora desta fase.
- Biblioteca de fatores de emissão e cálculo da pegada: fica no projeto de cálculo em Databricks; a plataforma recebe e mostra os valores.
- Etiquetagem XBRL: aguardar taxonomia estável para as ESRS simplificadas.
- Extração automática de faturas: a avaliar.
- A confirmar com o cliente: sistema de RH, registo de acidentes, responsáveis de Compras e Frota, metas, perímetros, utilizadores reais.
- Segregação de funções (quem submete não aprova): recomendada, a decidir.
- Envio de notificações por email ou Teams: recomendado, a decidir.
- Revisão do mapeamento ESRS após publicação do ato delegado das ESRS simplificadas.

## 24. Critérios de aceitação (cenários de teste)

1. **Recolha manual com alerta**: o responsável de Recursos Humanos abre "Entrega trimestral 2026 de Recursos Humanos", preenche "Mulheres no total da força de trabalho" com 17,11. Aparecem dois alertas e a justificação passa a obrigatória. Sem justificação, "Submeter milestone" é recusado com mensagem. Com justificação, a milestone segue para a equipa de sustentabilidade.
2. **Importação de Excel**: o template Excel descarregado, preenchido com um ano errado numa linha, rejeita essa linha ("period deve ser 2026") e aceita as restantes. Só as válidas são aplicadas.
3. **Evidência obrigatória**: numa milestone com "Eletricidade de fontes renováveis", a submissão é recusada enquanto não houver evidência.
4. **Contributo externo**: o comercializador de eletricidade envia 100%; a Financeira usa o valor; o indicador fica com a evidência e uma versão "externo".
5. **Workflow alterado a meio**: a equipa de sustentabilidade acrescenta "Parecer de outra área" numa milestone em revisão; os passos concluídos não mudam; o novo passo entra antes da publicação; o histórico regista a alteração.
6. **Devolução**: a equipa de sustentabilidade devolve sem comentário e é recusado; com comentário, a milestone volta à recolha e o prazo passa a pelo menos 3 dias.
7. **Reexpressão**: um valor aprovado é corrigido com motivo; o valor anterior fica no histórico; o indicador aparece "Reexpresso" na auditoria.
8. **Auditoria**: o auditor seleciona uma amostra de 5, faz um pedido de informação, a unidade responde e o auditor dá por resolvido; a data room exporta as cinco folhas.
9. **Entidade externa**: o fornecedor só vê os seus pedidos e não consegue abrir outra página.
10. **Novo ciclo**: abrir o ciclo de 2027 cria milestones com "2027" no nome e exige `period` 2027 na importação.
11. **Mobile**: em 390 px de largura nenhuma página tem scroll horizontal e a ação principal fica visível.

---

## Anexo A. Catálogo de indicadores

Legenda: Tipo B = dado base, D = derivado. Ev. = evidência obrigatória. Utilizadores: REL relatório, CONT contabilidade, ERSAR, APA, OPS operações.

| ID | Indicador | Unidade | Unidade de negócio | Tipo | Periodicidade | Perímetro | Quadro | ESRS | GRI | Limiar | Ev. | Utilizadores | Valor ano anterior (demo) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A01 | Água entrada no sistema | Mm³ | Operações | B | Mensal | Concessões | Desempenho | E3-4 | 303-3 | 10% |  | REL, ERSAR, OPS | 44,68 |
| A02 | Água faturada | Mm³ | Comercial e Relação com o Cliente | B | Mensal | Grupo | Desempenho | E3 | - | 15% |  | REL, ERSAR, CONT | 58,90 |
| A03 | Água não faturada | % | Operações | D | Mensal | Grupo | Desempenho | E3 | - | 15% |  | REL, ERSAR | 15,10 |
| A04 | Clientes de água de abastecimento | milhares | Comercial e Relação com o Cliente | B | Trimestral | Grupo | Desempenho | Setorial | - | 15% |  | REL, ERSAR | 414 |
| A05 | Volume de água abstraída por cliente | m³/cliente | Operações | D | Anual | Grupo | Desempenho | E3-4 | 303-3 | 15% |  | REL | 132,62 |
| A06 | Estações de tratamento de água (ETA) | n.º | Operações | B | Anual | Grupo | Desempenho | Setorial | - | 15% |  | REL | 10 |
| A07 | Extensão das redes de abastecimento | km | Operações | B | Anual | Grupo | Desempenho | Setorial | - | 15% |  | REL, ERSAR | 6 941,99 |
| A08 | Água potável captada | Mm³ | Operações | B | Mensal | Grupo | Desempenho | E3-4 | 303-3 | 15% |  | REL, APA, ERSAR | 25,83 |
| A09 | Roturas detetadas na pesquisa ativa de fugas | n.º | Operações | B | Mensal | Grupo | Desempenho | Setorial | - | 15% |  | REL, OPS | 1 181 |
| R01 | Água residual faturada | Mm³ | Comercial e Relação com o Cliente | B | Mensal | Grupo | Desempenho | Setorial | 303-4 | 15% |  | REL, ERSAR, CONT | 97,99 |
| R02 | Estações de tratamento de águas residuais (ETAR) | n.º | Operações | B | Anual | Grupo | Desempenho | Setorial | - | 15% |  | REL | 86 |
| R03 | Extensão das redes de drenagem | km | Operações | B | Anual | Grupo | Desempenho | Setorial | - | 15% |  | REL, ERSAR | 2 999,32 |
| R04G | Volume de águas residuais tratadas em ETAR (grupo) | Mm³ | Operações | B | Mensal | Grupo | Desempenho | E3-4 | 303-4 | 20% |  | REL, APA | 87,58 |
| P02 | Colaboradores (grupo) | n.º | Recursos Humanos | B | Trimestral | Grupo | Desempenho | S1-6 | 2-7 | 50% |  | REL | 1 086 |
| C01 | Projetos de sensibilização ambiental | n.º | I&D, CSR e ESG | B | Anual | Grupo | Desempenho | S3 | 413-1 | 15% |  | REL | - |
| C02 | Satisfação dos clientes (NPS) | pontos | Comercial e Relação com o Cliente | B | Anual | Grupo | Desempenho | S4 | - | 15% |  | REL | 52 |
| C03 | Investimento em transformação e inovação digital | € | Financeira | B | Anual | Grupo | Desempenho | Setorial | - | 15% |  | REL, CONT | - |
| A10 | Eficiência da rede de abastecimento | % | Operações | D | Mensal | Maioritárias | Ambientais | E3-4 | 303-3 | 5% |  | REL, ERSAR | 83,99 |
| A11 | Índice Linear de Perdas (ILP) | m³/km/dia | Operações | D | Mensal | Maioritárias | Ambientais | E3-4 | 303-3 | 15% |  | REL, ERSAR | 1,34 |
| A12 | Taxa de conformidade bacteriológica | % | Qualidade e Laboratório | B | Mensal | Maioritárias | Ambientais | Setorial | - | 3% | Sim | REL, ERSAR | 99,71 |
| A13 | Taxa de conformidade físico-química | % | Qualidade e Laboratório | B | Mensal | Maioritárias | Ambientais | Setorial | - | 3% | Sim | REL, ERSAR | 99,63 |
| R04 | Volume de águas residuais tratadas em ETAR | Mm³ | Operações | B | Mensal | Maioritárias | Ambientais | E3-4 | 303-4 | 15% |  | REL, APA | 76,44 |
| R05 | Eficiência do tratamento em CQO | % | Qualidade e Laboratório | D | Mensal | Maioritárias | Ambientais | E2-4 | 303-4 | 5% |  | REL, APA | 91,37 |
| R06 | Eficiência do tratamento em CBO | % | Qualidade e Laboratório | D | Mensal | Maioritárias | Ambientais | E2-4 | 303-4 | 5% |  | REL, APA | 96,38 |
| R07 | Eficiência do tratamento em azoto total | % | Qualidade e Laboratório | D | Mensal | Maioritárias | Ambientais | E2-4 | 303-4 | 15% |  | REL, APA | 54,64 |
| R08 | Eficiência do tratamento em fósforo | % | Qualidade e Laboratório | D | Mensal | Maioritárias | Ambientais | E2-4 | 303-4 | 15% |  | REL, APA | 64,02 |
| R09 | Lamas produzidas nas ETAR | t matéria seca | Operações | B | Mensal | Maioritárias | Ambientais | E5-5 | 306-3 | 15% | Sim | REL, APA | 11 430,95 |
| R10 | Lamas valorizadas | % | Operações | B | Trimestral | Maioritárias | Ambientais | E5-5 | 306-4 | 10% | Sim | REL, APA | 100 |
| R11 | Lamas com destino a espalhamento | % | Operações | B | Trimestral | Maioritárias | Ambientais | E5-5 | 306-5 | 20% | Sim | REL, APA | 95,37 |
| R12 | Lamas com destino a compostagem | % | Operações | B | Trimestral | Maioritárias | Ambientais | E5-5 | 306-4 | 20% | Sim | REL, APA | 4,63 |
| W01 | Combustível por tonelada de resíduos recolhidos | l/t | Frota | D | Mensal | Maioritárias | Ambientais | E1-5 | 302-1 | 15% |  | REL, OPS, CONT | 8 |
| E09 | Frota de veículos verdes | % | Frota | B | Trimestral | Maioritárias | Ambientais | E1-5 | 302-1 | 100% | Sim | REL | 2,55 |
| E04 | Consumo de energia primária | MWh | Ambiente, Saúde e Segurança | B | Mensal | Maioritárias | Ambientais | E1-5 | 302-1 | 15% |  | REL, OPS | 12 949,71 |
| E01 | Consumo de eletricidade | MWh | Financeira | B | Mensal | Maioritárias | Ambientais | E1-5 | 302-1 | 15% | Sim | REL, CONT, OPS | 46 072,10 |
| E03 | Eletricidade de fontes renováveis | % | Financeira | B | Anual | Maioritárias | Ambientais | E1-5 | 302-1 | 15% | Sim | REL | 100 |
| E02 | Eletricidade adquirida por contrato PPA | MWh | Financeira | B | Mensal | Maioritárias | Ambientais | E1-5 | 302-1 | 15% | Sim | REL, CONT | - |
| E05 | Eletricidade por m³ de água produzida | kWh/m³ | Operações | D | Mensal | Maioritárias | Ambientais | E1-5 | 302-3 | 15% |  | REL, OPS, ERSAR | 0,58 |
| E06 | Emissões diretas de GHG (Âmbito 1) | kgCO2e | Ambiente, Saúde e Segurança | D | Anual | Maioritárias | Ambientais | E1-6 | 305-1 | 15% | Sim | REL | 4 044 748,26 |
| E07 | Emissões indiretas de GHG (Âmbito 2) | kgCO2e | Ambiente, Saúde e Segurança | D | Anual | Maioritárias | Ambientais | E1-6 | 305-2 | 15% |  | REL | 0 |
| E08 | Intensidade carbónica (Âmbito 1) | kgCO2e/€ | Ambiente, Saúde e Segurança | D | Anual | Maioritárias | Ambientais | E1-6 | 305-4 | 15% |  | REL | 0,06 |
| P01 | Total da força de trabalho a 31/12 | n.º | Recursos Humanos | B | Trimestral | Maioritárias | Sociais | S1-6 | 2-7 | 80% |  | REL | 610 |
| P03 | Colaboradores com contrato permanente | % | Recursos Humanos | D | Trimestral | Maioritárias | Sociais | S1-6 | 2-7 | 15% |  | REL | 60,49 |
| P04 | Mulheres no total da força de trabalho | % | Recursos Humanos | D | Trimestral | Maioritárias | Sociais | S1-9 | 405-1 | 15% |  | REL | 20,66 |
| P05 | Estagiários | n.º | Recursos Humanos | B | Anual | Maioritárias | Sociais | S1-6 | 2-8 | 15% |  | REL | 0 |
| P06 | Estudantes e estagiários na força de trabalho | % | Recursos Humanos | D | Anual | Maioritárias | Sociais | S1-6 | 2-7 | 500% |  | REL | 0,33 |
| P07 | Taxa de rotatividade | % | Recursos Humanos | D | Trimestral | Maioritárias | Sociais | S1-6 | 401-1 | 15% |  | REL | 25,24 |
| P08 | Mulheres em cargos de liderança | % | Recursos Humanos | D | Anual | Maioritárias | Sociais | S1-9 | 405-1 | 15% |  | REL | 33,30 |
| P09 | Colaboradores com menos de 26 anos | % | Recursos Humanos | D | Anual | Maioritárias | Sociais | S1-9 | 405-1 | 60% |  | REL | 4,59 |
| P10 | Colaboradores com mais de 55 anos | % | Recursos Humanos | D | Anual | Maioritárias | Sociais | S1-9 | 405-1 | 15% |  | REL | 23,61 |
| P11 | Colaboradores com deficiência | % | Recursos Humanos | B | Anual | Maioritárias | Sociais | S1-12 | 405-1 | 40% |  | REL | 0,66 |
| P12 | Horas de formação | horas | Recursos Humanos | B | Anual | Maioritárias | Sociais | S1-13 | 404-1 | 200% |  | REL | 3 184 |
| P13 | Colaboradores com pelo menos uma formação concluída | % | Recursos Humanos | D | Anual | Maioritárias | Sociais | S1-13 | 404-1 | 15% |  | REL | 30,33 |
| P14 | Taxa de severidade dos acidentes de trabalho | % | Ambiente, Saúde e Segurança | D | Trimestral | Maioritárias | Sociais | S1-14 | 403-9 | 15% | Sim | REL | 0,53 |
| P15 | Trabalhadores com formação em segurança | % | Ambiente, Saúde e Segurança | B | Anual | Maioritárias | Sociais | S1-14 | 403-5 | 15% |  | REL | 100 |
| P16 | Taxa de absentismo | % | Recursos Humanos | D | Trimestral | Maioritárias | Sociais | S1-14 | 403-9 | 15% |  | REL | 3,17 |
| P17 | Acidentes de trabalho fatais | n.º | Ambiente, Saúde e Segurança | B | Trimestral | Maioritárias | Sociais | S1-14 | 403-9 | 15% | Sim | REL | - |
| G01 | Valor total das compras | € | Compras | B | Trimestral | Maioritárias | Governance | G1 | 204-1 | 15% | Sim | REL, CONT | 68 664 705,66 |
| G02 | Compras em mercados domésticos | % | Compras | D | Trimestral | Maioritárias | Governance | G1 | 204-1 | 15% |  | REL, CONT | 93,39 |
| G03 | Colaboradores cobertos pelo canal de denúncias | % | Jurídico e Compliance | B | Anual | Maioritárias | Governance | G1-1 | 2-26 | 15% |  | REL | 100 |
| G04 | Colaboradores expostos com formação anticorrupção | % | Jurídico e Compliance | B | Anual | Maioritárias | Governance | G1-3 | 205-2 | 15% | Sim | REL | 92 |
| G05 | Gestores que assinaram a declaração de ética | % | Jurídico e Compliance | B | Anual | Maioritárias | Governance | G1-1 | 2-23 | 15% |  | REL | 100 |
| G06 | Alertas do canal de denúncia com resposta escrita | % | Jurídico e Compliance | B | Anual | Maioritárias | Governance | G1-1 | 2-26 | 15% |  | REL | 100 |
| N01 | Emissões de Âmbito 3 (reagentes, materiais de obra, deslocações) | tCO2e | Compras | B | A definir | Maioritárias | ESRS | E1-6 | 305-3 | 15% |  | REL | - |
| N02 | Consumo de reagentes químicos no tratamento | t | Operações | B | A definir | Maioritárias | ESRS | E5-4 | 301-1 | 15% | Sim | REL, CONT, OPS | - |
| N03 | Resíduos produzidos nas instalações | t | Ambiente, Saúde e Segurança | B | A definir | Maioritárias | ESRS | E5-5 | 306-3 | 15% |  | REL, APA | - |
| N04 | Gases fluorados recarregados em climatização | kg | Ambiente, Saúde e Segurança | B | A definir | Maioritárias | ESRS | E1-6 | 305-1 | 15% |  | REL | - |
| N05 | Diferença salarial entre géneros | % | Recursos Humanos | B | A definir | Maioritárias | ESRS | S1-16 | 405-2 | 15% |  | REL | - |
| N06 | Reclamações de clientes | n.º | Comercial e Relação com o Cliente | B | A definir | Maioritárias | ESRS | S4 | - | 15% |  | REL, ERSAR | - |
| N07 | Incidentes com dados pessoais de clientes | n.º | Sistemas de Informação | B | A definir | Maioritárias | ESRS | S4 | 418-1 | 15% |  | REL | - |
| N08 | Instalações em áreas sensíveis para a biodiversidade | n.º | Ambiente, Saúde e Segurança | B | A definir | Maioritárias | ESRS | E4-5 | 304-1 | 15% |  | REL, APA | - |

Fórmulas dos derivados:

- **A03 Água não faturada**: (Água entrada no sistema - Água faturada) / Água entrada no sistema
- **A05 Volume de água abstraída por cliente**: Água potável captada / N.º de clientes
- **A10 Eficiência da rede de abastecimento**: Água faturada e consumos autorizados / Água entrada no sistema
- **A11 Índice Linear de Perdas (ILP)**: Perdas reais / (extensão da rede × 365)
- **R05 Eficiência do tratamento em CQO**: (CQO afluente - CQO efluente) / CQO afluente
- **R06 Eficiência do tratamento em CBO**: (CBO afluente - CBO efluente) / CBO afluente
- **R07 Eficiência do tratamento em azoto total**: (N afluente - N efluente) / N afluente
- **R08 Eficiência do tratamento em fósforo**: (P afluente - P efluente) / P afluente
- **W01 Combustível por tonelada de resíduos recolhidos**: Litros de combustível da frota de recolha / toneladas recolhidas
- **E05 Eletricidade por m³ de água produzida**: Eletricidade nas ETA e captações / água produzida
- **E06 Emissões diretas de GHG (Âmbito 1)**: Σ combustíveis × fator de emissão + fugas
- **E07 Emissões indiretas de GHG (Âmbito 2)**: Eletricidade × fator de emissão (zero com garantias de origem)
- **E08 Intensidade carbónica (Âmbito 1)**: Emissões de Âmbito 1 / receitas
- **P03 Colaboradores com contrato permanente**: Contratos permanentes / total de colaboradores
- **P04 Mulheres no total da força de trabalho**: Mulheres / total de colaboradores
- **P06 Estudantes e estagiários na força de trabalho**: (Estudantes + estagiários) / total
- **P07 Taxa de rotatividade**: Saídas no período / efetivo médio
- **P08 Mulheres em cargos de liderança**: Mulheres em liderança / total de cargos de liderança
- **P14 Taxa de severidade dos acidentes de trabalho**: Dias perdidos / horas trabalhadas
- **P16 Taxa de absentismo**: Horas de ausência / horas teóricas de trabalho
- **G02 Compras em mercados domésticos**: Compras a fornecedores nacionais / total de compras

Regras de coerência iniciais:

- **R04 Volume de águas residuais tratadas em ETAR**: No quadro de desempenho (perímetro grupo) o valor é 102,59 Mm³. Confirmar que a diferença se explica apenas pelo perímetro.
- **E05 Eletricidade por m³ de água produzida**: Nos destaques do relatório aparece 0,56 kWh/m³. Confirmar perímetro e se inclui só o tratamento.
- **P04 Mulheres no total da força de trabalho**: O texto do relatório refere 33,3% de mulheres. Confirmar se é o total, a liderança, ou outro perímetro.
- **P16 Taxa de absentismo**: Variação muito acima do histórico. Verificar se a fórmula mudou face ao ano anterior.

## Anexo B. Milestones de demonstração (ciclo 2026)

| ID | Milestone | Unidade | Periodicidade | Indicadores | Workflow |
|---|---|---|---|---|---|
| M01 | Entrega mensal 2026 de Operações | Operações | Mensal | A01, A03, A08, A09, R04G, A10, A11, R04, R09, E05 | Base |
| M02 | Entrega mensal 2026 de Qualidade e Laboratório | Qualidade e Laboratório | Mensal | A12, A13, R05, R06, R07, R08 | Ajustado: Recolha e submissão dos dados > Validação automática > Validação técnica pela Direção de Operações > Revisão pela equipa de sustentabilidade > Aprovação final > Publicação nos quadros do relatório |
| M03 | Entrega mensal 2026 de Comercial e Relação com o Cliente | Comercial e Relação com o Cliente | Mensal | A02, R01 | Base |
| M04 | Entrega mensal 2026 de Ambiente, Saúde e Segurança | Ambiente, Saúde e Segurança | Mensal | E04 | Base |
| M05 | Entrega mensal 2026 de Financeira | Financeira | Mensal | E01, E02 | Base |
| M06 | Entrega mensal 2026 de Frota | Frota | Mensal | W01 | Base |
| M07 | Entrega trimestral 2026 de Operações | Operações | Trimestral | R10, R11, R12 | Base |
| M08 | Entrega trimestral 2026 de Comercial e Relação com o Cliente | Comercial e Relação com o Cliente | Trimestral | A04 | Base |
| M09 | Entrega trimestral 2026 de Ambiente, Saúde e Segurança | Ambiente, Saúde e Segurança | Trimestral | P14, P17 | Base |
| M10 | Entrega trimestral 2026 de Recursos Humanos | Recursos Humanos | Trimestral | P02, P01, P03, P04, P07, P16 | Base |
| M11 | Entrega trimestral 2026 de Compras | Compras | Trimestral | G01, G02 | Ajustado: Recolha e submissão dos dados > Validação automática > Revisão pela equipa de sustentabilidade > Parecer da Direção Financeira > Aprovação final > Publicação nos quadros do relatório |
| M12 | Entrega trimestral 2026 de Frota | Frota | Trimestral | E09 | Base |
| M13 | Entrega anual 2026 de Operações | Operações | Anual | A05, A06, A07, R02, R03 | Base |
| M14 | Entrega anual 2026 de Comercial e Relação com o Cliente | Comercial e Relação com o Cliente | Anual | C02 | Base |
| M15 | Entrega anual 2026 de Ambiente, Saúde e Segurança | Ambiente, Saúde e Segurança | Anual | E06, E07, E08, P15 | Base |
| M16 | Entrega anual 2026 de Recursos Humanos | Recursos Humanos | Anual | P05, P06, P08, P09, P10, P11, P12, P13 | Base |
| M17 | Entrega anual 2026 de Financeira | Financeira | Anual | C03, E03 | Base |
| M18 | Entrega anual 2026 de Jurídico e Compliance | Jurídico e Compliance | Anual | G03, G04, G05, G06 | Base |
| M19 | Entrega anual 2026 de I&D, CSR e ESG | I&D, CSR e ESG | Anual | C01 | Base |
| M20 | Novos dados ESRS 2026 de Operações | Operações | ESRS | N02 | Base |
| M21 | Novos dados ESRS 2026 de Comercial e Relação com o Cliente | Comercial e Relação com o Cliente | ESRS | N06 | Base |
| M22 | Novos dados ESRS 2026 de Ambiente, Saúde e Segurança | Ambiente, Saúde e Segurança | ESRS | N03, N04, N08 | Base |
| M23 | Novos dados ESRS 2026 de Recursos Humanos | Recursos Humanos | ESRS | N05 | Base |
| M24 | Novos dados ESRS 2026 de Sistemas de Informação | Sistemas de Informação | ESRS | N07 | Base |
| M25 | Novos dados ESRS 2026 de Compras | Compras | ESRS | N01 | Base |

## Anexo C. Normas ESRS e avaliação inicial

| Norma | Tema | Avaliação inicial | Justificação |
|---|---|---|---|
| E1 | Alterações climáticas | Material | Prioridade "Clima" da dupla materialidade. |
| E2 | Poluição | Por avaliar | Descargas de águas residuais tratadas. |
| E3 | Água e recursos marinhos | Material | Prioridade "Água". |
| E4 | Biodiversidade e ecossistemas | Por avaliar | Levantamento de áreas sensíveis em curso. |
| E5 | Uso de recursos e economia circular | Por avaliar | Valorização de lamas. |
| S1 | Trabalhadores próprios | Material | Prioridade "Colaboradores". |
| S2 | Trabalhadores na cadeia de valor | Por avaliar | - |
| S3 | Comunidades afetadas | Por avaliar | - |
| S4 | Consumidores e utilizadores finais | Material | Prioridade "Clientes, consumidores e utilizadores finais". |
| G1 | Conduta empresarial | Por avaliar | - |

## Anexo D. Áreas consumidoras do dado

| Código | Área | Para que usa |
|---|---|---|
| REL | Relatório de sustentabilidade | Quadros anuais do relatório e futura informação ESRS |
| CONT | Contabilidade | Custos, acréscimos e centros de custo a partir das mesmas faturas |
| ERSAR | ERSAR | Indicadores de qualidade de serviço reportados ao regulador |
| APA | APA | Lamas, descargas e licenças ambientais |
| OPS | Operações | Eficiência energética e gestão das instalações |

## Anexo E. Perfis de demonstração e pedidos externos

| Login | Nome | Perfil | Unidade |
|---|---|---|---|
| `admin` | Administrador da plataforma | Administrador | - |
| `esg` | Equipa de sustentabilidade | Equipa de sustentabilidade | I&D, CSR e ESG |
| `operacoes` | Resp. Operações | Responsável pelos dados | Operações |
| `qualidade` | Resp. Qualidade e Laboratório | Responsável pelos dados | Qualidade e Laboratório |
| `comercial` | Resp. Comercial e Cliente | Responsável pelos dados | Comercial e Relação com o Cliente |
| `ass` | Resp. Ambiente, Saúde e Segurança | Responsável pelos dados | Ambiente, Saúde e Segurança |
| `rh` | Resp. Recursos Humanos | Responsável pelos dados | Recursos Humanos |
| `financeira` | Resp. Financeira | Responsável pelos dados | Financeira |
| `juridico` | Resp. Jurídico e Compliance | Responsável pelos dados | Jurídico e Compliance |
| `compras` | Resp. Compras (a confirmar) | Responsável pelos dados | Compras |
| `frota` | Resp. Frota (a confirmar) | Responsável pelos dados | Frota |
| `si` | Resp. Sistemas de Informação | Responsável pelos dados | Sistemas de Informação |
| `auditor` | Auditor externo (assurance) | Auditor | - |
| `ext-energia` | Comercializador de eletricidade | Entidade externa | - |
| `ext-frota` | Gestora de frota em renting | Entidade externa | - |
| `ext-reagentes` | Fornecedor de reagentes químicos | Entidade externa | - |

Pedidos externos iniciais:

| Entidade | Indicador | Pedido |
|---|---|---|
| Comercializador de eletricidade | Eletricidade de fontes renováveis | Percentagem de eletricidade com garantias de origem renovável no ano. |
| Gestora de frota em renting | Frota de veículos verdes | Percentagem de viaturas elétricas ou híbridas plug-in na frota em renting a 31/12. |
| Fornecedor de reagentes químicos | Consumo de reagentes químicos no tratamento | Toneladas de reagentes fornecidos às ETA e ETAR do perímetro no ano. |

## Anexo F. Entidades e perímetros

| Entidade | Perímetro do grupo | Perímetro maioritário |
|---|---|---|
| Sede do grupo | Sim | Sim |
| Serviços ambientais | Sim | Sim |
| Concessão Vale | Sim | Sim |
| Concessão Rio | Sim | Sim |
| Concessão Litoral Centro | Sim | Sim |
| Concessão Planalto | Sim | Sim |
| Laboratório central | Sim | Sim |
| Manutenção industrial | Sim | Sim |
| Serviços urbanos | Sim | Sim |
| Tratamento de efluentes | Sim | Sim |
| Concessão Costa | Sim | Não |
| Concessão Norte | Sim | Não |
| Concessão Sul | Sim | Não |
| Concessão Foz | Sim | Não |
| Concessão Serra | Sim | Não |
| Agrupamento Algarve | Sim | Não |

## Anexo G. Janelas de reporting iniciais

| Janela | Tema | Meses | Dias |
|---|---|---|---|
| Recolha mensal de operação e energia | Água e saneamento | Todos | 1 a 10 |
| Revisão mensal | Governance | Todos | 11 a 15 |
| Recolha trimestral de pessoas, segurança e compras | Pessoas | Jan, Abr, Jul, Out | 1 a 20 |
| Recolha anual de formação, ética, comunidade e NPS | Comunidade e cliente | Jan, Fev | 1 a 28 |
| Consolidação e revisão final do relatório | Energia e clima | Mar, Abr | 1 a 30 |

## Anexo H. Metas (a confirmar com o cliente)

| Indicador | Meta | Ano | Leitura |
|---|---|---|---|
| Eletricidade de fontes renováveis (E03) | 100% | 2030 | Atingida quando o valor chega à meta |
| Lamas valorizadas, rumo a um modelo circular integral (R10) | 100% | 2030 | Atingida quando o valor chega à meta |
| Emissões diretas de GHG (Âmbito 1), Net Zero (E06) | 0 tCO2e | 2050 | Trajetória linear desde o ano anterior até zero em 2050 |
