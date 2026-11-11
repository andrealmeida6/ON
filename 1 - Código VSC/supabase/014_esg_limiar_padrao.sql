-- ESG Data Hub: limiar de variacao por omissao (pedido do André, 11 de novembro de 2026).
-- Por omissao, uma variacao acima de 50% face ao periodo anterior levanta um alerta. Cada indicador pode ter o seu
-- limiar (config.limiar_proprio = true, com o valor em limiar_variacao_pct); sem ele, usa o limiar por omissao do ciclo.
alter table public.esg_ciclos add column if not exists limiar_padrao numeric check (limiar_padrao >= 0);
update public.esg_ciclos set limiar_padrao = 50 where estado = 'aberto' and limiar_padrao is null;
