-- ESG Data Hub: ambiente de testes partilhado (pedido do André, 11 de novembro de 2026).
-- O ambiente de testes continua sem login (escolhe-se o perfil, "impersonate"), mas o que se faz fica gravado aqui,
-- para os colegas com o mesmo link verem o mesmo. Cada linha e uma parte do estado da plataforma (milestones,
-- valores, indicadores...), como no armazenamento do navegador. Os ficheiros carregados vao em esg_teste_ficheiros.
-- Isolado das tabelas esg_ reais: so serve o ambiente de testes. Nao pôr aqui dados reais nem confidenciais,
-- porque quem tiver o link e a chave publica pode ler e alterar.
create table if not exists public.esg_teste_estado (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);
create table if not exists public.esg_teste_ficheiros (
  fid text primary key,
  nome text not null,
  tipo text,
  tamanho integer check (tamanho is null or tamanho <= 6000000),
  dados text not null,
  criado_em timestamptz not null default now(),
  criado_por text
);
alter table public.esg_teste_estado enable row level security;
alter table public.esg_teste_ficheiros enable row level security;
drop policy if exists esg_teste_estado_tudo on public.esg_teste_estado;
create policy esg_teste_estado_tudo on public.esg_teste_estado for all to anon, authenticated using (true) with check (true);
drop policy if exists esg_teste_ficheiros_tudo on public.esg_teste_ficheiros;
create policy esg_teste_ficheiros_tudo on public.esg_teste_ficheiros for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.esg_teste_estado, public.esg_teste_ficheiros to anon, authenticated;
create index if not exists esg_teste_estado_atualizado on public.esg_teste_estado (atualizado_em);
-- A hora da alteracao e sempre a do servidor, para os navegadores verem por ordem o que os outros gravaram
create or replace function public.esg_teste_hora() returns trigger language plpgsql set search_path = '' as $$
begin new.atualizado_em := now(); return new; end $$;
drop trigger if exists esg_teste_estado_hora on public.esg_teste_estado;
create trigger esg_teste_estado_hora before insert or update on public.esg_teste_estado for each row execute function public.esg_teste_hora();
