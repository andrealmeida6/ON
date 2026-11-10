-- ESG Data Hub: para ja so duas empresas, Entidade A e Entidade B (pedido do André, 10 de novembro de 2026).
-- Correr depois de 010_esg_nome_plataforma.sql e antes de voltar a carregar 007_esg_dados_demonstracao.sql.
-- So para o ambiente de demonstracao: as milestones e os documentos das outras empresas passam para a Entidade A,
-- e as outras empresas sao apagadas (com as suas regras de introducao).
begin;

insert into public.esg_entidades (id, nome, perimetro_grupo, perimetro_maioritario, pais, detencao, metodo, instalacoes, nace, nipc, moeda) values
('Entidade A','Entidade A',true,true,'Portugal',100,'mae',2,'70.10','','EUR'),
('Entidade B','Entidade B',true,true,'Portugal',100,'integral',3,'36.00','','EUR')
on conflict (nome) do update set perimetro_grupo = excluded.perimetro_grupo, perimetro_maioritario = excluded.perimetro_maioritario, pais = excluded.pais,
  detencao = excluded.detencao, metodo = excluded.metodo, instalacoes = excluded.instalacoes, nace = excluded.nace, moeda = excluded.moeda;

update public.esg_milestones set empresa = 'Entidade A' where empresa not in ('Entidade A','Entidade B');
update public.esg_documentos set entidade = 'Entidade A' where entidade is not null and entidade not in ('Entidade A','Entidade B');
delete from public.esg_entidades where nome not in ('Entidade A','Entidade B');

-- Varios valores no mesmo periodo, como nas outras empresas: [indicador, dividido por]
insert into public.esg_regras_entrada (entidade_id, indicador_id, multi, por, agreg)
select e.id, r.ind, true, r.por, 'soma'
from public.esg_entidades e
cross join (values ('E01','Instalação e contador'),('E04','Instalação'),('W01','Veículo ou cartão'),('A01','Sistema de abastecimento'),('N03','Guia de resíduos'),('R04','ETAR')) as r(ind, por)
where exists (select 1 from public.esg_indicadores i where i.id = r.ind)
on conflict do nothing;

commit;
