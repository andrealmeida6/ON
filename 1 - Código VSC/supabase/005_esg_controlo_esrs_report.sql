-- Record to Report (R2R): tabelas das paginas de controlo, do ESRS, do Report e das fontes de dados.
-- Pode correr-se mais de uma vez. Nao apaga dados. Os dados entram com 006_esg_dados_controlo_esrs.sql.
-- Inclui o 004 (Assigned to e ficheiros pedidos), que nunca chegou a ser aplicado.

-- 004: Assigned to e ficheiros pedidos em cada milestone
alter table public.esg_milestones add column if not exists atribuido_a text references public.esg_utilizadores(login) on update cascade on delete set null;
alter table public.esg_milestones add column if not exists ficheiros_pedidos jsonb not null default '[]';

-- Perimetro de consolidacao de cada empresa
alter table public.esg_entidades add column if not exists pais text;
alter table public.esg_entidades add column if not exists detencao numeric check (detencao between 0 and 100);
alter table public.esg_entidades add column if not exists metodo text check (metodo in ('mae','integral','proporcional','equivalencia'));
alter table public.esg_entidades add column if not exists instalacoes integer;
alter table public.esg_entidades add column if not exists nace text;
alter table public.esg_entidades add column if not exists nipc text;
alter table public.esg_entidades add column if not exists moeda text;

-- Indicadores: descricao e ligacao ao ESRS de 2026
alter table public.esg_indicadores add column if not exists descricao text;
alter table public.esg_indicadores add column if not exists subtema text;
alter table public.esg_indicadores add column if not exists agregacao text;
alter table public.esg_indicadores add column if not exists esrs_ligacao text check (esrs_ligacao in ('direto','parcial','especifico'));
alter table public.esg_indicadores add column if not exists esrs_datapoints text[] not null default '{}';
alter table public.esg_indicadores add column if not exists esrs_nota text;

-- Referencia ESRS: datapoints e glossario do modelo de datapoints (Simplified ESRS, julho de 2026)
create table if not exists public.esg_esrs_datapoints (
  id text primary key,
  n integer not null,
  norma text,
  tema text,
  dr text,
  paragrafo text,
  ar text,
  nome text not null,
  texto text,
  divulgacao text,
  tipo_dado text
);
create table if not exists public.esg_esrs_glossario (
  n integer primary key,
  termo text not null,
  definicao text,
  tema text,
  ajuda text
);

-- KPI master: o que a empresa preenche por indicador, por datapoint e no glossario
create table if not exists public.esg_kpi_master (
  indicador_id text primary key references public.esg_indicadores(id) on update cascade on delete cascade,
  recolha text, disponivel text check (disponivel in ('', 'sim', 'nao')), fonte text,
  controlos text check (controlos in ('', 'sim', 'nao')), controlo_txt text,
  divulga text check (divulga in ('', 'sim', 'nao')), motivo text
);
create table if not exists public.esg_dp_decisoes (
  datapoint_id text primary key references public.esg_esrs_datapoints(id) on update cascade on delete cascade,
  divulga text check (divulga in ('', 'sim', 'nao')),
  motivo text
);
create table if not exists public.esg_glossario_empresa (
  termo_n integer primary key references public.esg_esrs_glossario(n) on delete cascade,
  definicao text not null
);

-- Atribuicao de KPIs, com segregacao de funcoes
create table if not exists public.esg_atribuicao (
  indicador_id text primary key references public.esg_indicadores(id) on update cascade on delete cascade,
  submete text references public.esg_utilizadores(login) on update cascade on delete set null,
  reve text references public.esg_utilizadores(login) on update cascade on delete set null,
  valida text references public.esg_utilizadores(login) on update cascade on delete set null,
  check (submete is distinct from reve and submete is distinct from valida)
);

-- Regras de introducao por empresa e KPI
create table if not exists public.esg_regras_entrada (
  entidade_id text not null references public.esg_entidades(id) on update cascade on delete cascade,
  indicador_id text not null references public.esg_indicadores(id) on update cascade on delete cascade,
  multi boolean not null default false,
  por text,
  agreg text not null default 'soma' check (agreg in ('soma','media','ultimo')),
  primary key (entidade_id, indicador_id)
);

-- Biblioteca de fatores de emissao, com as versoes anteriores
create table if not exists public.esg_fatores (
  id text primary key,
  nome text not null,
  unidade text,
  fator numeric not null,
  unidade_fator text,
  versao integer,
  qtd numeric,
  origem text,
  historico jsonb not null default '[]'
);

-- Ligacoes a outros sistemas
create table if not exists public.esg_ligacoes (
  id text primary key,
  nome text not null,
  ambito text,
  frequencia text,
  estado text not null default 'pendente'
);

-- Registo das alteracoes de configuracao e selos SHA-256 do registo: so se acrescentam linhas
create table if not exists public.esg_registo_config (
  id bigint generated always as identity primary key,
  texto text not null,
  em timestamptz not null,
  por text not null,
  tipo text
);
create table if not exists public.esg_selos (
  ordem integer primary key,
  chave text not null unique,
  hash text not null check (hash ~ '^[0-9a-f]{64}$')
);

-- Quadros do Report: valores das linhas sem KPI e o documento montado
create table if not exists public.esg_report_valores (
  linha_id text primary key,
  ant numeric,
  val numeric
);
create table if not exists public.esg_report_documento (
  id boolean primary key default true check (id),
  titulo text not null,
  blocos jsonb not null default '[]'
);

-- Ultima leitura das fontes de dados de cada milestone
create table if not exists public.esg_fontes_puxadas (
  milestone_id text primary key references public.esg_milestones(id) on update cascade on delete cascade,
  em timestamptz not null,
  por text not null,
  vals jsonb not null default '{}',
  registos integer not null default 0
);

-- Permissoes: sem perfil nao se le nada; internos leem tudo; administrador e equipa de sustentabilidade gerem
do $$
declare t text;
begin
  foreach t in array array['esg_esrs_datapoints','esg_esrs_glossario','esg_kpi_master','esg_dp_decisoes','esg_glossario_empresa','esg_atribuicao','esg_regras_entrada','esg_fatores','esg_ligacoes','esg_registo_config','esg_selos','esg_report_valores','esg_report_documento','esg_fontes_puxadas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists esg_ler_interno on public.%I', t);
    execute format('create policy esg_ler_interno on public.%I for select to authenticated using (public.esg_interno())', t);
  end loop;
  foreach t in array array['esg_esrs_datapoints','esg_esrs_glossario','esg_kpi_master','esg_dp_decisoes','esg_glossario_empresa','esg_atribuicao','esg_regras_entrada','esg_fatores','esg_ligacoes','esg_report_valores','esg_report_documento','esg_fontes_puxadas'] loop
    execute format('drop policy if exists esg_gerir on public.%I', t);
    execute format('create policy esg_gerir on public.%I for all to authenticated using (public.esg_gere()) with check (public.esg_gere())', t);
  end loop;
end $$;

-- O registo e os selos nao se alteram nem se apagam, nem pelo administrador
drop policy if exists esg_registo_escrever on public.esg_registo_config;
create policy esg_registo_escrever on public.esg_registo_config for insert to authenticated with check (public.esg_gere() and por = public.esg_nome());
-- Qualquer gravacao sela os eventos novos, por isso todos os perfis internos acrescentam selos
drop policy if exists esg_selos_escrever on public.esg_selos;
create policy esg_selos_escrever on public.esg_selos for insert to authenticated with check (public.esg_interno());

-- Quem tem a milestone em recolha puxa as fontes de dados dela
drop policy if exists esg_fontes_resp_ins on public.esg_fontes_puxadas;
create policy esg_fontes_resp_ins on public.esg_fontes_puxadas for insert to authenticated with check (public.esg_ms_em_recolha(milestone_id) and por = public.esg_nome());
drop policy if exists esg_fontes_resp_upd on public.esg_fontes_puxadas;
create policy esg_fontes_resp_upd on public.esg_fontes_puxadas for update to authenticated using (public.esg_ms_em_recolha(milestone_id)) with check (public.esg_ms_em_recolha(milestone_id) and por = public.esg_nome());

create index if not exists esg_regras_entrada_indicador on public.esg_regras_entrada(indicador_id);
create index if not exists esg_esrs_datapoints_norma on public.esg_esrs_datapoints(norma, n);
