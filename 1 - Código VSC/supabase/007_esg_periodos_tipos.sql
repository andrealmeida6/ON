-- Periodos de reporte, entregas externas, tipos de dados e valores por trimestre.
-- Correr depois do 006. Pode correr-se mais de uma vez.

-- Valores por periodo: o ano continua a ser o ciclo; periodo = '2026-T3' nas milestones trimestrais e '' nas anuais
alter table public.esg_valores add column if not exists periodo text not null default '';
alter table public.esg_valor_versoes add column if not exists periodo text not null default '';
alter table public.esg_evidencias add column if not exists periodo text not null default '';
alter table public.esg_valor_versoes drop constraint if exists esg_valor_versoes_indicador_id_ano_fkey;
alter table public.esg_valor_versoes drop constraint if exists esg_valor_versoes_valor_fkey;
alter table public.esg_valores drop constraint if exists esg_valores_pkey;
alter table public.esg_valores add constraint esg_valores_pkey primary key (indicador_id, ano, periodo);
alter table public.esg_valor_versoes add constraint esg_valor_versoes_valor_fkey foreign key (indicador_id, ano, periodo) references public.esg_valores(indicador_id, ano, periodo);
drop policy if exists esg_versoes_resp on public.esg_valor_versoes;
create policy esg_versoes_resp on public.esg_valor_versoes for insert to authenticated with check (
  por = public.esg_nome() and exists (select 1 from public.esg_valores v where v.indicador_id = esg_valor_versoes.indicador_id and v.ano = esg_valor_versoes.ano and v.periodo = esg_valor_versoes.periodo and public.esg_ms_em_recolha(v.milestone_id))
);

-- Milestones: periodo, consolidacao anual, tipos de dados pedidos e folhas preenchidas na plataforma
alter table public.esg_milestones add column if not exists periodo text;
alter table public.esg_milestones add column if not exists consolida boolean not null default false;
alter table public.esg_milestones add column if not exists tipos text[];
alter table public.esg_milestones add column if not exists folhas jsonb not null default '{}';
-- Eventos do workflow: tipo (criada, avanco, auto, devolucao) e passo, para a linha do tempo
alter table public.esg_eventos add column if not exists wf text;
alter table public.esg_eventos add column if not exists passo text;

create table if not exists public.esg_periodos (
  id text primary key,
  nome text not null,
  tipo text not null check (tipo in ('trimestre', 'ano')),
  ano integer not null,
  t integer not null default 0,
  ini date not null,
  fim date not null,
  fecho date not null
);
create table if not exists public.esg_relatorios (
  id text primary key,
  sigla text not null,
  nome text not null,
  entidade text not null,
  periodo text not null references public.esg_periodos(id),
  data date not null,
  base text
);
create table if not exists public.esg_tipos_dados (
  id text primary key,
  nome text not null,
  motivo text,
  formatos text[] not null default '{}',
  prefixo text not null,
  unidade text not null,
  colunas text[],
  granularidade text not null default 'mensal' check (granularidade in ('mensal', 'trimestral', 'anual')),
  obrigatorio boolean not null default true,
  instrucoes text,
  ativo boolean not null default true,
  versao integer not null default 1,
  alterado_em timestamptz,
  alterado_por text
);

-- Permissoes: internos leem; administrador e equipa de sustentabilidade gerem
do $$
declare t text;
begin
  foreach t in array array['esg_periodos', 'esg_relatorios', 'esg_tipos_dados'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists esg_ler_interno on public.%I', t);
    execute format('create policy esg_ler_interno on public.%I for select to authenticated using (public.esg_interno())', t);
    execute format('drop policy if exists esg_gerir on public.%I', t);
    execute format('create policy esg_gerir on public.%I for all to authenticated using (public.esg_gere()) with check (public.esg_gere())', t);
  end loop;
end $$;

-- Uma milestone por departamento, empresa, periodicidade, periodo e tipo (entrega ou consolidacao)
alter table public.esg_milestones drop constraint if exists esg_milestones_unica;
drop index if exists public.esg_milestones_unica;
create unique index esg_milestones_unica on public.esg_milestones (ano, empresa, unidade, periodicidade, coalesce(periodo, ''), consolida);

-- Comentarios: o passo do workflow em que foram escritos e, se for o caso, o indicador
alter table public.esg_comentarios add column if not exists passo text;
alter table public.esg_comentarios add column if not exists indicador_id text references public.esg_indicadores(id);
