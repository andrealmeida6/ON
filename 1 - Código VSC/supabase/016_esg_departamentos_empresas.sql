-- ESG Data Hub: departamentos por empresa (pedido do André, 11 de novembro de 2026).
-- Cada departamento pode existir so em algumas empresas (ids de esg_entidades). Vazio = todas as empresas.
alter table public.esg_departamentos add column if not exists empresas text[] not null default '{}';
