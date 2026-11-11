-- ESG Data Hub: uma pessoa pode ter varios departamentos (pedido do André, 11 de novembro de 2026).
-- A coluna unidade fica com o primeiro, para compatibilidade; unidades guarda a lista completa (tags).
alter table public.esg_utilizadores add column if not exists unidades text[] not null default '{}';
update public.esg_utilizadores set unidades = array[unidade] where unidade is not null and cardinality(unidades) = 0;

-- Os utilizadores sao pessoas; o papel vem do perfil. Os registos de sistema passam a ter nome de pessoa.
update public.esg_utilizadores set nome = 'Helena Martins' where login = 'admin' and nome = 'Administrador da plataforma';
update public.esg_utilizadores set nome = 'Rita Sousa' where login = 'esg' and nome = 'Equipa de sustentabilidade';
update public.esg_utilizadores set nome = 'Nuno Ferreira' where login = 'auditor' and nome = 'Auditor externo (assurance)';
-- Demonstracao: a responsavel da Frota tambem trata de Compras
update public.esg_utilizadores set unidades = array['Frota','Compras'] where login = 'frota' and unidades = array['Frota'];

-- Permissoes: o responsavel atua em todos os seus departamentos, nao so no primeiro
create or replace function public.esg_unidades() returns text[]
language sql stable security definer set search_path = '' as $$
  select case when cardinality(unidades) > 0 then unidades when unidade is not null then array[unidade] else '{}'::text[] end
  from public.esg_utilizadores where auth_user_id = auth.uid()
$$;
revoke execute on function public.esg_unidades() from public, anon;
grant execute on function public.esg_unidades() to authenticated;

create or replace function public.esg_ms_minha(mid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.esg_perfil() = 'resp' and (
    exists (select 1 from public.esg_milestones m where m.id = mid and m.unidade = any(public.esg_unidades()))
    or exists (select 1 from public.esg_passos_workflow p where p.milestone_id = mid and substr(p.responsavel, 6) = any(public.esg_unidades()) and p.responsavel like 'area:%')
  )
$$;
create or replace function public.esg_ms_em_recolha(mid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.esg_perfil() = 'resp' and exists (
    select 1 from public.esg_milestones m
    join public.esg_passos_workflow p on p.milestone_id = m.id and p.ordem = m.passo_atual
    where m.id = mid and p.tipo = 'recolha'
      and ((p.responsavel = 'unidade' and m.unidade = any(public.esg_unidades())) or (p.responsavel like 'area:%' and substr(p.responsavel, 6) = any(public.esg_unidades())))
  )
$$;
create or replace function public.esg_indicador_meu(ind text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.esg_perfil() = 'resp' and exists (
    select 1 from public.esg_milestone_indicadores i
    join public.esg_milestones m on m.id = i.milestone_id
    where i.indicador_id = ind and m.unidade = any(public.esg_unidades())
  )
$$;
