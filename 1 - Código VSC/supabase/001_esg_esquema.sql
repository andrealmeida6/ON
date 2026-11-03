-- Portal de Sustentabilidade: modelo de dados da secao 5 da especificacao.
-- Prefixo esg_ para nao colidir com as outras aplicacoes do mesmo projeto.
-- RLS ligado em todas as tabelas e sem politicas: nada e acessivel com a chave publica
-- ate as politicas serem criadas com o login.

create table public.esg_ciclos (
  ano int primary key check (ano between 2000 and 2100),
  estado text not null default 'aberto' check (estado in ('aberto','fechado')),
  data_abertura date not null default current_date
);

create table public.esg_utilizadores (
  login text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nome text not null,
  perfil text not null check (perfil in ('admin','esg','resp','auditor','ext')),
  unidade text
);

create table public.esg_indicadores (
  id text primary key,
  nome text not null,
  unidade_medida text not null,
  tema text not null,
  quadro text not null check (quadro in ('Desempenho','Ambientais','Sociais','Governance','ESRS')),
  unidade_negocio text not null,
  tipo text not null check (tipo in ('base','derivado')),
  formula text,
  periodicidade text not null,
  perimetro text not null,
  limiar_variacao_pct numeric not null default 15 check (limiar_variacao_pct >= 0),
  evidencia_obrigatoria boolean not null default false,
  regras_coerencia text[] not null default '{}',
  esrs text,
  esrs_requisito text,
  gri text,
  utilizado_por text[] not null default '{}',
  novo_esrs boolean not null default false,
  casas_decimais int not null default 0,
  valor_base_anterior numeric
);

create table public.esg_workflow_base (
  ordem int primary key,
  nome text not null,
  tipo text not null check (tipo in ('recolha','validacao','revisao','parecer','aprovacao','publicacao')),
  responsavel text not null
);

create table public.esg_milestones (
  id text primary key,
  nome text not null,
  ano int not null references public.esg_ciclos(ano),
  unidade text not null,
  periodicidade text not null check (periodicidade in ('Mensal','Trimestral','Anual','Novos dados ESRS')),
  prazo date not null,
  passo_atual int not null default 0 check (passo_atual >= 0),
  devolvida boolean not null default false,
  workflow_ajustado boolean not null default false,
  unique (ano, unidade, periodicidade)
);

create table public.esg_milestone_indicadores (
  milestone_id text not null references public.esg_milestones(id) on delete cascade,
  indicador_id text not null references public.esg_indicadores(id),
  ordem int not null default 0,
  primary key (milestone_id, indicador_id)
);
create index esg_mi_indicador on public.esg_milestone_indicadores(indicador_id);

create table public.esg_passos_workflow (
  id uuid primary key default gen_random_uuid(),
  milestone_id text not null references public.esg_milestones(id) on delete cascade,
  ordem int not null,
  nome text not null,
  tipo text not null check (tipo in ('recolha','validacao','revisao','parecer','aprovacao','publicacao')),
  responsavel text not null,
  concluido_em timestamptz,
  concluido_por text,
  unique (milestone_id, ordem) deferrable initially deferred
);

create table public.esg_valores (
  indicador_id text not null references public.esg_indicadores(id),
  ano int not null references public.esg_ciclos(ano),
  milestone_id text not null references public.esg_milestones(id),
  valor numeric,
  qualidade text not null default 'medido' check (qualidade in ('medido','calculado','estimado')),
  metodo_estimativa text,
  justificacao text,
  reexpresso boolean not null default false,
  entidade text not null default 'Consolidado',
  fonte text,
  primary key (indicador_id, ano),
  check (qualidade <> 'estimado' or valor is null or coalesce(metodo_estimativa,'') <> '')
);
create index esg_valores_milestone on public.esg_valores(milestone_id);

create table public.esg_valor_versoes (
  id bigint generated always as identity primary key,
  indicador_id text not null,
  ano int not null,
  valor numeric not null,
  em timestamptz not null default now(),
  por text not null,
  origem text not null,
  motivo text,
  foreign key (indicador_id, ano) references public.esg_valores(indicador_id, ano),
  check (origem <> 'reexpressão' or coalesce(motivo,'') <> '')
);
create index esg_versoes_valor on public.esg_valor_versoes(indicador_id, ano);

create table public.esg_evidencias (
  id uuid primary key default gen_random_uuid(),
  ficheiro text not null,
  indicador_id text references public.esg_indicadores(id),
  ano int references public.esg_ciclos(ano),
  milestone_id text references public.esg_milestones(id),
  carregado_por text not null,
  carregado_em timestamptz not null default now(),
  hash text,
  check (indicador_id is not null or milestone_id is not null)
);
create index esg_evidencias_indicador on public.esg_evidencias(indicador_id, ano);
create index esg_evidencias_milestone on public.esg_evidencias(milestone_id);

create table public.esg_pedidos_externos (
  id uuid primary key default gen_random_uuid(),
  indicador_id text not null references public.esg_indicadores(id),
  milestone_id text not null references public.esg_milestones(id),
  entidade_externa text not null,
  descricao text not null,
  prazo date not null,
  estado text not null default 'pendente' check (estado in ('pendente','recebido','aplicado')),
  valor numeric,
  evidencia text,
  respondido_em timestamptz
);
create index esg_ext_milestone on public.esg_pedidos_externos(milestone_id);
create index esg_ext_indicador on public.esg_pedidos_externos(indicador_id);

create table public.esg_pedidos_auditor (
  id uuid primary key default gen_random_uuid(),
  indicador_id text not null references public.esg_indicadores(id),
  texto text not null,
  por text not null,
  em timestamptz not null default now(),
  estado text not null default 'aberto' check (estado in ('aberto','respondido','resolvido')),
  resposta_texto text,
  resposta_por text,
  resposta_em timestamptz
);
create index esg_aud_indicador on public.esg_pedidos_auditor(indicador_id);

create table public.esg_comentarios (
  id bigint generated always as identity primary key,
  milestone_id text not null references public.esg_milestones(id) on delete cascade,
  autor text not null,
  texto text not null,
  em timestamptz not null default now()
);
create index esg_comentarios_milestone on public.esg_comentarios(milestone_id);

create table public.esg_eventos (
  id bigint generated always as identity primary key,
  milestone_id text not null references public.esg_milestones(id),
  texto text not null,
  em timestamptz not null default now(),
  por text not null
);
create index esg_eventos_milestone on public.esg_eventos(milestone_id);

create table public.esg_entidades (
  nome text primary key,
  perimetro_grupo boolean not null default true,
  perimetro_maioritario boolean not null default false
);

create table public.esg_janelas (
  id bigint generated always as identity primary key,
  nome text not null,
  tema text not null,
  meses int[] not null,
  dia_inicio int not null check (dia_inicio between 1 and 31),
  dia_fim int not null check (dia_fim between 1 and 31)
);

create table public.esg_documentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('eletricidade','água','combustível')),
  fornecedor text not null,
  periodo text not null,
  instalacao text not null,
  entidade text references public.esg_entidades(nome) on update cascade,
  consumo numeric not null,
  valor_sem_iva numeric not null,
  iva numeric not null,
  percentagem_renovavel numeric,
  centro_custo text,
  leitura_telemetria numeric,
  estado text not null default 'em conferência' check (estado in ('em conferência','distribuída'))
);
create index esg_documentos_entidade on public.esg_documentos(entidade);

create table public.esg_materialidade (
  norma text primary key,
  tema text not null,
  avaliacao text not null default 'por avaliar' check (avaliacao in ('material','não material','por avaliar')),
  justificacao text
);

create table public.esg_metas (
  indicador_id text primary key references public.esg_indicadores(id),
  nome text not null,
  valor_meta numeric not null,
  ano_meta int not null,
  sentido text not null check (sentido in ('subir','descer')),
  unidade text not null
);

create table public.esg_areas (
  codigo text primary key,
  nome text not null,
  uso text
);

create table public.esg_amostra (
  ano int not null references public.esg_ciclos(ano),
  indicador_id text not null references public.esg_indicadores(id),
  primary key (ano, indicador_id)
);
create index esg_amostra_indicador on public.esg_amostra(indicador_id);

-- Uma so linha: a marca da plataforma (logotipo por link web e cinco cores)
create table public.esg_marca (
  id boolean primary key default true check (id),
  nome text not null,
  subtitulo text,
  logotipo text check (logotipo is null or logotipo = '' or logotipo ~* '^https?://'),
  cor_primary text not null check (cor_primary ~ '^#[0-9a-fA-F]{6}$'),
  cor_secondary text not null check (cor_secondary ~ '^#[0-9a-fA-F]{6}$'),
  cor_accent text not null check (cor_accent ~ '^#[0-9a-fA-F]{6}$'),
  cor_bg text not null check (cor_bg ~ '^#[0-9a-fA-F]{6}$'),
  cor_text text not null check (cor_text ~ '^#[0-9a-fA-F]{6}$')
);

-- Secao 20: eventos e versoes de valores nunca se alteram nem se apagam
create function public.esg_bloquear_alteracao() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Registo de auditoria: % não é permitido em %', tg_op, tg_table_name;
end;
$$;
create trigger esg_versoes_imutaveis before update or delete on public.esg_valor_versoes
  for each row execute function public.esg_bloquear_alteracao();
create trigger esg_eventos_imutaveis before update or delete on public.esg_eventos
  for each row execute function public.esg_bloquear_alteracao();
revoke execute on function public.esg_bloquear_alteracao() from public, anon, authenticated;

-- RLS em todas as tabelas esg_
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'esg\_%' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Dados de configuracao iniciais
insert into public.esg_ciclos (ano, estado) values (2025, 'fechado'), (2026, 'aberto');

insert into public.esg_workflow_base (ordem, nome, tipo, responsavel) values
  (1, 'Recolha e submissão dos dados', 'recolha', 'unidade'),
  (2, 'Validação automática', 'validacao', 'sistema'),
  (3, 'Revisão pela equipa de sustentabilidade', 'revisao', 'esg'),
  (4, 'Aprovação final', 'aprovacao', 'esg'),
  (5, 'Publicação nos quadros do relatório', 'publicacao', 'sistema');

insert into public.esg_utilizadores (login, nome, perfil, unidade) values
  ('admin', 'Administrador da plataforma', 'admin', null),
  ('esg', 'Equipa de sustentabilidade', 'esg', 'I&D, CSR e ESG'),
  ('operacoes', 'Resp. Operações', 'resp', 'Operações'),
  ('qualidade', 'Resp. Qualidade e Laboratório', 'resp', 'Qualidade e Laboratório'),
  ('comercial', 'Resp. Comercial e Cliente', 'resp', 'Comercial e Relação com o Cliente'),
  ('ass', 'Resp. Ambiente, Saúde e Segurança', 'resp', 'Ambiente, Saúde e Segurança'),
  ('rh', 'Resp. Recursos Humanos', 'resp', 'Recursos Humanos'),
  ('financeira', 'Resp. Financeira', 'resp', 'Financeira'),
  ('juridico', 'Resp. Jurídico e Compliance', 'resp', 'Jurídico e Compliance'),
  ('compras', 'Resp. Compras (a confirmar)', 'resp', 'Compras'),
  ('frota', 'Resp. Frota (a confirmar)', 'resp', 'Frota'),
  ('si', 'Resp. Sistemas de Informação', 'resp', 'Sistemas de Informação'),
  ('auditor', 'Auditor externo (assurance)', 'auditor', null),
  ('ext-energia', 'Comercializador de eletricidade', 'ext', null),
  ('ext-frota', 'Gestora de frota em renting', 'ext', null),
  ('ext-reagentes', 'Fornecedor de reagentes químicos', 'ext', null);

insert into public.esg_materialidade (norma, tema, avaliacao, justificacao) values
  ('E1', 'Alterações climáticas', 'material', 'Prioridade "Clima" da dupla materialidade.'),
  ('E2', 'Poluição', 'por avaliar', 'Descargas de águas residuais tratadas.'),
  ('E3', 'Água e recursos marinhos', 'material', 'Prioridade "Água".'),
  ('E4', 'Biodiversidade e ecossistemas', 'por avaliar', 'Levantamento de áreas sensíveis em curso.'),
  ('E5', 'Uso de recursos e economia circular', 'por avaliar', 'Valorização de lamas.'),
  ('S1', 'Trabalhadores próprios', 'material', 'Prioridade "Colaboradores".'),
  ('S2', 'Trabalhadores na cadeia de valor', 'por avaliar', null),
  ('S3', 'Comunidades afetadas', 'por avaliar', null),
  ('S4', 'Consumidores e utilizadores finais', 'material', 'Prioridade "Clientes, consumidores e utilizadores finais".'),
  ('G1', 'Conduta empresarial', 'por avaliar', null);

insert into public.esg_entidades (nome, perimetro_grupo, perimetro_maioritario) values
  ('Sede do grupo', true, true), ('Serviços ambientais', true, true), ('Concessão Vale', true, true), ('Concessão Rio', true, true),
  ('Concessão Litoral Centro', true, true), ('Concessão Planalto', true, true), ('Laboratório central', true, true), ('Manutenção industrial', true, true),
  ('Serviços urbanos', true, true), ('Tratamento de efluentes', true, true), ('Concessão Costa', true, false), ('Concessão Norte', true, false),
  ('Concessão Sul', true, false), ('Concessão Foz', true, false), ('Concessão Serra', true, false), ('Agrupamento Algarve', true, false);

insert into public.esg_janelas (nome, tema, meses, dia_inicio, dia_fim) values
  ('Recolha mensal de operação e energia', 'Água e saneamento', '{1,2,3,4,5,6,7,8,9,10,11,12}', 1, 10),
  ('Revisão mensal', 'Governance', '{1,2,3,4,5,6,7,8,9,10,11,12}', 11, 15),
  ('Recolha trimestral de pessoas, segurança e compras', 'Pessoas', '{1,4,7,10}', 1, 20),
  ('Recolha anual de formação, ética, comunidade e NPS', 'Comunidade e cliente', '{1,2}', 1, 28),
  ('Consolidação e revisão final do relatório', 'Energia e clima', '{3,4}', 1, 30);

insert into public.esg_areas (codigo, nome, uso) values
  ('REL', 'Relatório de sustentabilidade', 'Quadros anuais do relatório e futura informação ESRS'),
  ('CONT', 'Contabilidade', 'Custos, acréscimos e centros de custo a partir das mesmas faturas'),
  ('ERSAR', 'ERSAR', 'Indicadores de qualidade de serviço reportados ao regulador'),
  ('APA', 'APA', 'Lamas, descargas e licenças ambientais'),
  ('OPS', 'Operações', 'Eficiência energética e gestão das instalações');

insert into public.esg_marca (nome, subtitulo, logotipo, cor_primary, cor_secondary, cor_accent, cor_bg, cor_text) values
  ('Portal de Sustentabilidade', 'Dados e relatório', '', '#00338D', '#0091DA', '#1E49E2', '#F4F7FC', '#0C233C');
