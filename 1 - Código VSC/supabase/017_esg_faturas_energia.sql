-- ESG Data Hub: faturas de eletricidade lidas (texto do PDF ou OCR) para os indicadores de energia e Scope 2.
-- Pedido do André, 11 de novembro de 2026. Esquema dos campos: web-files/esquema-fatura-energia.json
--   financeiro: EN 16931 (BT/BG); fornecimento e consumo: conteudo que a ERSE exige nas faturas em Portugal;
--   ESG: dados de atividade do Scope 2 (GHG Protocol), location-based e market-based.
-- Uma fatura pertence a uma empresa e a um CPE (ponto de entrega). Depois de confirmada pelo utilizador,
-- os valores entram nos indicadores (E01, E03, E07) da task do periodo e a fatura fica como evidencia.

create table if not exists public.esg_faturas_energia (
  id uuid primary key default gen_random_uuid(),
  empresa_id text,                                  -- empresa do grupo (pelo NIF do cliente)
  milestone_id text,                                -- task onde os valores entraram
  -- fornecedor e cliente (EN 16931 BG-4, BG-7)
  fornecedor_nome text not null,                    -- BT-27
  fornecedor_nif text,                              -- BT-31
  cliente_nome text,                                -- BT-44
  cliente_nif text,                                 -- BT-48
  numero_cliente text,
  -- fatura (BT-1, BT-2, BT-3, BT-5, BT-9)
  numero text not null,
  atcud text,
  tipo text not null default 'fatura' check (tipo in ('fatura', 'nota_credito', 'acerto', 'estimativa')),
  data_emissao date not null,
  data_vencimento date,
  moeda text not null default 'EUR',
  -- fornecimento (ERSE)
  cpe text not null check (cpe ~ '^PT[0-9]{16}[A-Z]{2}$'),
  morada_local text,
  nivel_tensao text check (nivel_tensao is null or nivel_tensao in ('BTN', 'BTE', 'MT', 'AT', 'MAT')),
  potencia_contratada_kva numeric check (potencia_contratada_kva is null or potencia_contratada_kva >= 0),
  ciclo_horario text check (ciclo_horario is null or ciclo_horario in ('simples', 'bi-horario', 'tri-horario', 'tetra-horario')),
  periodo_inicio date not null,                     -- BT-73
  periodo_fim date not null,                        -- BT-74
  tipo_leitura text check (tipo_leitura is null or tipo_leitura in ('real', 'estimada', 'telecontagem')),
  -- consumo
  energia_ativa_kwh numeric not null check (energia_ativa_kwh >= 0),
  consumo_por_periodo jsonb not null default '[]'::jsonb,   -- [{periodo: 'vazio', kwh: 1234, leitura_anterior, leitura_atual}]
  energia_reativa_kvarh numeric,
  autoconsumo_kwh numeric,
  injecao_rede_kwh numeric,
  -- rotulagem do fornecedor (market-based)
  renovavel_pct numeric check (renovavel_pct is null or (renovavel_pct between 0 and 100)),
  mix_energetico jsonb not null default '[]'::jsonb,        -- [{fonte: 'Hídrica', pct: 31.2}]
  emissoes_gco2_kwh numeric check (emissoes_gco2_kwh is null or emissoes_gco2_kwh >= 0),
  residuos_radioativos_ug_kwh numeric,
  garantias_origem boolean,
  ano_rotulagem integer,
  -- valores (EN 16931 BG-22)
  energia_eur numeric,
  potencia_eur numeric,
  redes_eur numeric,
  iec_eur numeric,
  cav_eur numeric,
  taxa_dgeg_eur numeric,
  total_sem_iva numeric,                            -- BT-109
  iva jsonb not null default '[]'::jsonb,           -- BG-23: [{taxa_pct: 6, base: 40.1, valor: 2.41}, {taxa_pct: 23, ...}]
  total_iva numeric,                                -- BT-110
  total_com_iva numeric not null,                   -- BT-112
  -- ESG (calculado na leitura, confirmado pelo utilizador)
  reparticao_periodos jsonb not null default '[]'::jsonb,   -- [{periodo: '2026-T3', dias: 20, kwh: 812.5}]
  scope2_location_kgco2e numeric,
  scope2_market_kgco2e numeric,
  -- leitura e confirmacao
  metodo_leitura text not null default 'texto_pdf' check (metodo_leitura in ('texto_pdf', 'ocr', 'manual', 'cloud')),
  confianca jsonb not null default '{}'::jsonb,    -- {"consumo.energia_ativa_kwh": 0.97, ...}
  dados_lidos jsonb not null default '{}'::jsonb,  -- o objeto completo do esquema, tal como foi lido
  ficheiro_fid text,                                -- a fatura guardada (evidencia)
  estado text not null default 'lida' check (estado in ('lida', 'confirmada', 'rejeitada')),
  lido_por text not null default public.esg_nome(),
  lido_em timestamptz not null default now(),
  confirmado_por text,
  confirmado_em timestamptz,
  constraint esg_faturas_periodo check (periodo_fim >= periodo_inicio),
  constraint esg_faturas_unica unique (fornecedor_nif, numero)
);

create table if not exists public.esg_faturas_linhas (
  id bigint generated always as identity primary key,
  fatura_id uuid not null references public.esg_faturas_energia (id) on delete cascade,
  ordem integer not null default 0,
  tipo text check (tipo is null or tipo in ('energia', 'potencia', 'redes', 'imposto', 'taxa', 'desconto', 'acerto', 'outro')),
  descricao text not null,                          -- BT-153
  periodo_horario text,
  quantidade numeric,                               -- BT-129
  unidade text,                                     -- BT-130
  preco_unitario numeric,                           -- BT-146
  valor numeric not null,                           -- BT-131
  iva_pct numeric                                   -- BT-152
);

create index if not exists esg_faturas_empresa_periodo on public.esg_faturas_energia (empresa_id, periodo_inicio, periodo_fim);
create index if not exists esg_faturas_cpe on public.esg_faturas_energia (cpe, periodo_inicio);
create index if not exists esg_faturas_ms on public.esg_faturas_energia (milestone_id);
create index if not exists esg_faturas_linhas_fatura on public.esg_faturas_linhas (fatura_id, ordem);

-- Permissoes: quem e interno le; quem e interno carrega e corrige faturas ainda nao confirmadas;
-- confirmar e apagar e da gestao (equipa de sustentabilidade e administrador).
alter table public.esg_faturas_energia enable row level security;
alter table public.esg_faturas_linhas enable row level security;

drop policy if exists esg_faturas_ler on public.esg_faturas_energia;
create policy esg_faturas_ler on public.esg_faturas_energia for select to authenticated using (public.esg_interno());
drop policy if exists esg_faturas_criar on public.esg_faturas_energia;
create policy esg_faturas_criar on public.esg_faturas_energia for insert to authenticated with check (public.esg_interno() and estado = 'lida');
drop policy if exists esg_faturas_corrigir on public.esg_faturas_energia;
create policy esg_faturas_corrigir on public.esg_faturas_energia for update to authenticated
  using (public.esg_gere() or (public.esg_interno() and estado = 'lida'))
  with check (public.esg_gere() or (public.esg_interno() and estado in ('lida', 'confirmada')));
drop policy if exists esg_faturas_apagar on public.esg_faturas_energia;
create policy esg_faturas_apagar on public.esg_faturas_energia for delete to authenticated using (public.esg_gere());

drop policy if exists esg_faturas_linhas_ler on public.esg_faturas_linhas;
create policy esg_faturas_linhas_ler on public.esg_faturas_linhas for select to authenticated using (public.esg_interno());
drop policy if exists esg_faturas_linhas_escrever on public.esg_faturas_linhas;
create policy esg_faturas_linhas_escrever on public.esg_faturas_linhas for all to authenticated
  using (exists (select 1 from public.esg_faturas_energia f where f.id = fatura_id and (public.esg_gere() or (public.esg_interno() and f.estado = 'lida'))))
  with check (exists (select 1 from public.esg_faturas_energia f where f.id = fatura_id and (public.esg_gere() or (public.esg_interno() and f.estado = 'lida'))));

grant select, insert, update, delete on public.esg_faturas_energia, public.esg_faturas_linhas to authenticated;

-- Quem confirma fica registado pelo servidor
create or replace function public.esg_faturas_confirmar() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.estado = 'confirmada' and (old.estado is distinct from 'confirmada') then
    new.confirmado_por := public.esg_nome();
    new.confirmado_em := now();
  end if;
  return new;
end $$;
drop trigger if exists esg_faturas_confirmar on public.esg_faturas_energia;
create trigger esg_faturas_confirmar before update on public.esg_faturas_energia for each row execute function public.esg_faturas_confirmar();

-- Vista para os indicadores: kWh, renovavel ponderado e emissoes por empresa e periodo, so das faturas confirmadas
create or replace view public.esg_faturas_energia_periodo with (security_invoker = true) as
select f.empresa_id,
       r ->> 'periodo' as periodo,
       sum((r ->> 'kwh')::numeric) as kwh,
       sum((r ->> 'kwh')::numeric) / 1000 as mwh,
       case when sum((r ->> 'kwh')::numeric) > 0 and bool_and(f.renovavel_pct is not null)
            then sum((r ->> 'kwh')::numeric * f.renovavel_pct) / sum((r ->> 'kwh')::numeric) end as renovavel_pct,
       sum(f.scope2_market_kgco2e * (r ->> 'kwh')::numeric / nullif(f.energia_ativa_kwh, 0)) as scope2_market_kgco2e,
       count(distinct f.id) as faturas,
       count(distinct f.cpe) as cpes
from public.esg_faturas_energia f
cross join lateral jsonb_array_elements(f.reparticao_periodos) r
where f.estado = 'confirmada'
group by f.empresa_id, r ->> 'periodo';
grant select on public.esg_faturas_energia_periodo to authenticated;
