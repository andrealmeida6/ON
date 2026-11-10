-- ESG Data Hub: campos do indicador geridos em Backoffice > Indicators (pedido do André, 10 de novembro de 2026).
-- Ficam num jsonb para nao multiplicar colunas: ativo, empresas abrangidas, empresa que reporta,
-- departamento que reporta, descricao e sub-tema proprios, DR proprio, tipo de divulgacao e tipo de dado.
alter table public.esg_indicadores add column if not exists config jsonb not null default '{}'::jsonb;
-- Responsavel em grupo: o indicador fica com o departamento inteiro quando submete e nulo (ja era permitido).
