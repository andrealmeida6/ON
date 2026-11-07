-- Ficha de definicao de cada indicador e registo dos ficheiros gerados para as entregas externas.
-- Correr depois do 007. Pode correr-se mais de uma vez.

create table if not exists public.esg_definicoes (
  indicador_id text primary key references public.esg_indicadores(id),
  inclui text not null,
  exclui text,
  fonte text,
  dono text,
  alteracoes jsonb not null default '[]',
  versao integer not null default 1,
  alterado_em timestamptz,
  alterado_por text
);
create table if not exists public.esg_saidas (
  id text primary key,
  relatorio_id text not null references public.esg_relatorios(id),
  versao integer not null,
  formato text not null check (formato in ('xlsx', 'docx')),
  ficheiro text not null,
  final boolean not null default false,
  gerado_em timestamptz not null default now(),
  gerado_por text not null,
  aprovados integer not null default 0,
  total integer not null default 0
);

-- Internos leem as duas. As definicoes gere-as a equipa de sustentabilidade; o registo dos ficheiros so cresce
alter table public.esg_definicoes enable row level security;
alter table public.esg_saidas enable row level security;
drop policy if exists esg_ler_interno on public.esg_definicoes;
create policy esg_ler_interno on public.esg_definicoes for select to authenticated using (public.esg_interno());
drop policy if exists esg_gerir on public.esg_definicoes;
create policy esg_gerir on public.esg_definicoes for all to authenticated using (public.esg_gere()) with check (public.esg_gere());
drop policy if exists esg_ler_interno on public.esg_saidas;
create policy esg_ler_interno on public.esg_saidas for select to authenticated using (public.esg_interno());
drop policy if exists esg_saidas_gerar on public.esg_saidas;
create policy esg_saidas_gerar on public.esg_saidas for insert to authenticated with check (public.esg_gere() and gerado_por = public.esg_nome());

-- Dados de demonstracao
insert into public.esg_definicoes (indicador_id, inclui, exclui, fonte, dono, alteracoes, versao, alterado_em, alterado_por) values
('A01', 'Água captada e tratada nas ETA próprias e água comprada a sistemas em alta, medida nos contadores de entrada das redes de abastecimento.', 'Água de lavagem de filtros que volta à ETA. Água vendida a outros sistemas.', 'Telemetria dos contadores de entrada e faturas da entidade em alta.', null, '[{"ano": 2026, "txt": "A água comprada a sistemas em alta passa a contar pela leitura do contador da entidade em alta quando não há contador próprio."}]'::jsonb, 2, '2026-02-16T10:00:00Z', 'Equipa de sustentabilidade'),
('A02', 'Volume faturado a clientes finais no período, incluindo os acertos de leituras estimadas.', 'Consumos autorizados não faturados (bombeiros, rega municipal, lavagem de redes). Notas de crédito de períodos anteriores.', 'Sistema comercial, mapa de faturação por período de consumo.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('A03', 'Diferença entre a água entrada no sistema e a água faturada, em percentagem da água entrada. Junta perdas reais, perdas aparentes e consumos autorizados não faturados.', 'Água vendida a outros sistemas.', 'Calculado na plataforma a partir de A01 e A02.', null, '[{"ano": 2026, "txt": "A fórmula passa a usar a água entrada no sistema em vez da água produzida. O valor de 2025 foi recalculado para comparar."}]'::jsonb, 2, '2026-02-16T10:00:00Z', 'Equipa de sustentabilidade'),
('A04', 'Contratos de abastecimento ativos a 31/12, domésticos e não domésticos.', 'Contratos suspensos há mais de 12 meses e contratos só de saneamento.', 'Sistema comercial.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('A07', 'Condutas adutoras e de distribuição em serviço a 31/12.', 'Ramais de ligação e condutas desativadas.', 'Cadastro de redes (SIG).', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('A08', 'Água captada nas origens próprias, superficiais e subterrâneas, medida nos contadores das captações.', 'Água comprada a sistemas em alta.', 'Telemetria das captações e títulos de utilização de recursos hídricos.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('A10', 'Água faturada mais consumos autorizados não faturados, em percentagem da água entrada no sistema.', 'Água vendida a outros sistemas.', 'Calculado na plataforma a partir de A01, A02 e dos consumos autorizados.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('A11', 'Perdas reais por quilómetro de rede e por dia, sobre a extensão das condutas adutoras e de distribuição.', 'Extensão dos ramais de ligação.', 'Calculado na plataforma a partir do balanço hídrico e do cadastro de redes.', null, '[{"ano": 2026, "txt": "A extensão da rede deixa de incluir os ramais de ligação. O valor de 2025 foi recalculado para comparar."}]'::jsonb, 2, '2026-02-16T10:00:00Z', 'Equipa de sustentabilidade'),
('A12', 'Análises microbiológicas do programa de controlo da qualidade da água (PCQA) que cumprem o valor paramétrico, em percentagem das análises realizadas.', 'Análises de controlo operacional fora do PCQA aprovado e repetições feitas depois de um incumprimento.', 'Laboratório (LIMS), resultados validados do PCQA.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('A13', 'Análises físico-químicas do PCQA que cumprem o valor paramétrico, em percentagem das análises realizadas.', 'Análises de controlo operacional fora do PCQA aprovado.', 'Laboratório (LIMS), resultados validados do PCQA.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('R01', 'Volume de saneamento faturado a clientes finais no período.', 'Águas pluviais e efluentes industriais com contrato próprio de rejeição.', 'Sistema comercial.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('R03', 'Coletores de águas residuais domésticas e unitários em serviço a 31/12.', 'Coletores pluviais separativos e ramais de ligação.', 'Cadastro de redes (SIG).', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('R04', 'Volume afluente às ETAR que recebeu tratamento, medido no caudalímetro de entrada.', 'Descargas de emergência e by-pass sem tratamento.', 'Telemetria das ETAR.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('R09', 'Lamas desidratadas saídas das ETAR, em toneladas de matéria seca.', 'Lamas de ETA e areias e gradados.', 'Guias eletrónicas de acompanhamento de resíduos (e-GAR) e análises de matéria seca.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('R10', 'Lamas entregues para uma operação de valorização (códigos R), em percentagem das lamas produzidas.', 'Lamas em armazenamento temporário a 31/12.', 'e-GAR com o código da operação de destino.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('E01', 'Eletricidade faturada de todas as instalações: ETA, ETAR, estações elevatórias e edifícios.', 'Eletricidade produzida e consumida em autoconsumo, que se reporta à parte.', 'Faturas de energia, leituras por local de consumo.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('E05', 'Eletricidade das ETA e captações a dividir pela água produzida.', 'Eletricidade das estações elevatórias de distribuição e dos edifícios.', 'Calculado na plataforma a partir das faturas de energia e da telemetria.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('E06', 'Combustíveis da frota própria, geradores e caldeiras, gases fluorados recarregados e emissões de metano e óxido nitroso do tratamento de águas residuais.', 'Frota em renting com combustível pago pelo colaborador.', 'Faturas de combustível, fichas de intervenção em climatização e fatores de emissão da APA.', null, '[{"ano": 2026, "txt": "Passam a contar as emissões de metano e óxido nitroso do tratamento de águas residuais."}]'::jsonb, 2, '2026-02-16T10:00:00Z', 'Equipa de sustentabilidade'),
('E07', 'Emissões da eletricidade comprada, pelo método baseado no mercado.', 'O método baseado na localização, que fica em nota no relatório.', 'Faturas de energia e garantias de origem do comercializador.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('E09', 'Viaturas elétricas e híbridas plug-in, próprias e em renting, a 31/12, em percentagem da frota.', 'Híbridos sem ligação à rede e máquinas não matriculadas.', 'Gestão de frota e listagem da gestora de renting.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('P01', 'Pessoas com contrato de trabalho, permanente ou a termo, a 31/12.', 'Estagiários, prestadores de serviços e trabalho temporário.', 'Sistema de recursos humanos.', null, '[{"ano": 2026, "txt": "Passa a contar pessoas e não equivalentes a tempo inteiro, como pede a ESRS S1-6."}]'::jsonb, 2, '2026-02-16T10:00:00Z', 'Equipa de sustentabilidade'),
('P04', 'Mulheres no total de pessoas com contrato a 31/12.', 'Estagiários e prestadores de serviços.', 'Sistema de recursos humanos.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('P07', 'Saídas no ano (voluntárias, despedimentos, reformas e fim de contrato) a dividir pela média de colaboradores.', 'Mudanças entre empresas do grupo.', 'Sistema de recursos humanos.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('P14', 'Dias perdidos por acidentes de trabalho por cada mil horas trabalhadas.', 'Acidentes in itinere e dias perdidos por doença profissional.', 'Registo de acidentes da área de segurança e horas trabalhadas do sistema de recursos humanos.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('P16', 'Horas de ausência não prevista a dividir pelas horas de trabalho previstas.', 'Férias, licenças parentais e formação.', 'Sistema de recursos humanos.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('G01', 'Valor faturado por fornecedores no ano, sem IVA.', 'Compras entre empresas do grupo, impostos, salários e rendas de concessão.', 'Sistema financeiro, contas de fornecedores.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('G02', 'Compras a fornecedores com sede em Portugal, em percentagem do valor total das compras.', 'Compras entre empresas do grupo.', 'Sistema financeiro, país do fornecedor.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('N03', 'Resíduos com e-GAR emitidas pelas instalações do grupo, em toneladas.', 'Lamas de ETAR, que se reportam em R09.', 'e-GAR e mapa integrado de registo de resíduos.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('N04', 'Quilos de gases fluorados recarregados em equipamentos de climatização e refrigeração.', 'Gases recuperados e enviados para destruição.', 'Fichas de intervenção dos técnicos certificados.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('N06', 'Reclamações escritas recebidas pelo livro de reclamações, portal, email e balcões.', 'Pedidos de informação e reclamações sobre entidades terceiras.', 'Sistema comercial, módulo de reclamações.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade'),
('C02', 'Net Promoter Score do inquérito anual de satisfação aos clientes domésticos.', 'Respostas incompletas.', 'Inquérito de satisfação feito pela área comercial.', null, '[]'::jsonb, 1, '2026-01-20T10:00:00Z', 'Equipa de sustentabilidade')
on conflict (indicador_id) do nothing;
insert into public.esg_saidas (id, relatorio_id, versao, formato, ficheiro, final, gerado_em, gerado_por, aprovados, total) values
('G1', 'QA-2026-T1', 1, 'xlsx', 'QA-2026-T1_ERSAR_v1.xlsx', true, '2026-06-12T10:20:00Z', 'Equipa de sustentabilidade', 2, 2),
('G2', 'QA-2026-T2', 1, 'xlsx', 'QA-2026-T2_ERSAR_v1.xlsx', true, '2026-09-08T09:05:00Z', 'Equipa de sustentabilidade', 2, 2),
('G3', 'QA-2026-T3', 1, 'xlsx', 'QA-2026-T3_ERSAR_v1_draft.xlsx', false, '2026-11-04T15:40:00Z', 'Equipa de sustentabilidade', 0, 2)
on conflict (id) do nothing;
