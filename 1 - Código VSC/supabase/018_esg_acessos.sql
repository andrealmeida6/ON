-- ESG Data Hub: entrada so com nome de utilizador (pedido do André, 11 de novembro de 2026).
-- O site do GitHub Pages abre com um ecra que pede o utilizador. Sem palavra-passe: se o nome estiver nesta
-- lista e ativo, entra com o nome, o perfil e as empresas daqui. Depois de entrar, qualquer pessoa pode continuar
-- a trocar de perfil pelo avatar ("impersonate").
-- A lista nao se le a partir do navegador: so a funcao esg_acesso_entrar confirma um nome de cada vez.
-- Nao e seguranca forte (quem souber um nome entra), por isso serve so para dados de teste.
create table if not exists public.esg_acessos (
  utilizador text primary key check (utilizador = lower(btrim(utilizador)) and utilizador <> ''),
  nome text not null,
  perfil text not null default 'esg' check (perfil in ('admin','esg','resp','revisor','auditor','ext')),
  unidades text[] not null default '{}',
  empresas text[] not null default '{}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  ultimo_acesso timestamptz
);
alter table public.esg_acessos enable row level security;
-- Sem politicas e sem permissoes: a tabela nao se le nem se altera com a chave publica
revoke all on public.esg_acessos from anon, authenticated;

-- Confirma um nome de utilizador (ou um email: conta so o que vem antes do @) e devolve os dados da pessoa, ou null se nao existir ou estiver inativo
create or replace function public.esg_acesso_entrar(p_utilizador text) returns jsonb
language sql volatile security definer set search_path = '' as $$
  update public.esg_acessos set ultimo_acesso = now()
  where utilizador = split_part(lower(btrim(p_utilizador)), '@', 1) and ativo
  returning jsonb_build_object('login', utilizador, 'nome', nome, 'perfil', perfil, 'unidades', unidades, 'empresas', empresas)
$$;
revoke execute on function public.esg_acesso_entrar(text) from public;
grant execute on function public.esg_acesso_entrar(text) to anon, authenticated;

-- Primeiro utilizador: André Borges, equipa de sustentabilidade, Entidade A e Entidade B
insert into public.esg_acessos (utilizador, nome, perfil, unidades, empresas) values
  ('andreborges', 'André Borges', 'esg', array['I&D, CSR e ESG'], array['Entidade A','Entidade B'])
on conflict (utilizador) do update set nome = excluded.nome, perfil = excluded.perfil, unidades = excluded.unidades, empresas = excluded.empresas, ativo = true;

-- Para acrescentar mais pessoas, repetir o insert acima com outro utilizador.
-- Para tirar o acesso a alguem: update public.esg_acessos set ativo = false where utilizador = '...';
