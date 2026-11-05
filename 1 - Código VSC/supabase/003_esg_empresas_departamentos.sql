-- Record to Report (R2R): cada milestone pertence a uma empresa e tem tags de departamento.
-- As empresas sao a tabela esg_entidades, que ja guardava os perimetros. Ganham um id estavel para o nome poder mudar.

alter table public.esg_entidades add column id text;
update public.esg_entidades set id = nome;
alter table public.esg_entidades alter column id set not null;
alter table public.esg_entidades add constraint esg_entidades_id_key unique (id);

create table public.esg_departamentos (
  id text primary key,
  nome text not null unique
);
alter table public.esg_departamentos enable row level security;
create policy esg_ler_interno on public.esg_departamentos for select to authenticated using (public.esg_interno());
create policy esg_gerir on public.esg_departamentos for all to authenticated using (public.esg_gere()) with check (public.esg_gere());

insert into public.esg_departamentos (id, nome) values
  ('Operações', 'Operações'), ('Qualidade e Laboratório', 'Qualidade e Laboratório'), ('Comercial e Relação com o Cliente', 'Comercial e Relação com o Cliente'),
  ('Ambiente, Saúde e Segurança', 'Ambiente, Saúde e Segurança'), ('Recursos Humanos', 'Recursos Humanos'), ('Financeira', 'Financeira'),
  ('Jurídico e Compliance', 'Jurídico e Compliance'), ('Compras', 'Compras'), ('Frota', 'Frota'), ('Sistemas de Informação', 'Sistemas de Informação'), ('I&D, CSR e ESG', 'I&D, CSR e ESG');

alter table public.esg_milestones add column empresa text references public.esg_entidades(nome) on update cascade;
alter table public.esg_milestones add column departamentos text[] not null default '{}';
update public.esg_milestones set empresa = 'Sede do grupo', departamentos = array[unidade];
alter table public.esg_milestones alter column empresa set not null;
create index esg_milestones_empresa on public.esg_milestones(empresa);

-- A mesma unidade pode entregar a mesma periodicidade em empresas diferentes
alter table public.esg_milestones drop constraint esg_milestones_ano_unidade_periodicidade_key;
alter table public.esg_milestones add constraint esg_milestones_unica unique (ano, empresa, unidade, periodicidade);

-- A plataforma passou a ingles: os registos automaticos dizem System e restatement
drop policy esg_eventos_escrever on public.esg_eventos;
create policy esg_eventos_escrever on public.esg_eventos for insert to authenticated
  with check (por = public.esg_nome() or (public.esg_perfil() = 'resp' and por = 'System'));
alter table public.esg_valor_versoes drop constraint esg_valor_versoes_check;
alter table public.esg_valor_versoes add constraint esg_valor_versoes_check check (origem not in ('reexpressão','restatement') or coalesce(motivo,'') <> '');

update public.esg_marca set nome = 'Record to Report (R2R)', subtitulo = '' where nome = 'Portal de Sustentabilidade';
