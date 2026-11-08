-- Momentos de report por indicador: em que periodos entra (T1 a T4, A) e que entregas externas alimenta.
-- Vazio (null) quer dizer "por omissao": a frequencia decide os periodos e as regras de cada entrega decidem o resto.
-- Exemplo: {"per": ["T1","T2","T3","T4"], "ent": ["RQS","RS"]}
alter table public.esg_indicadores add column if not exists momentos jsonb;

comment on column public.esg_indicadores.momentos is 'Momentos de report definidos no Backoffice: per (T1..T4, A) e ent (QA, PCQA, RQS, MIRR, GF, RC, RS). Null = por omissao.';
