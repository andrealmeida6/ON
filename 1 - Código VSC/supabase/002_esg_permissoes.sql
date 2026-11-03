-- Portal de Sustentabilidade: ajustes ao modelo e permissoes por perfil (secao 20).
-- Sem perfil em esg_utilizadores nao se le nem se escreve nada, mesmo com conta criada.
-- So a marca e publica, para a pagina de entrada mostrar o logotipo e as cores.

-- O navegador gera os identificadores, para gravar sem esperar pela resposta
alter table public.esg_passos_workflow alter column id drop default, alter column id type text using id::text;
alter table public.esg_evidencias alter column id drop default, alter column id type text using id::text;
alter table public.esg_pedidos_externos alter column id drop default, alter column id type text using id::text;
alter table public.esg_pedidos_auditor alter column id drop default, alter column id type text using id::text;
alter table public.esg_documentos alter column id drop default, alter column id type text using id::text;
alter table public.esg_janelas alter column id drop identity;

alter table public.esg_valores add column rascunho text;
alter table public.esg_milestones add column documentos_gerais jsonb not null default '[]';
alter table public.esg_comentarios add column sistema boolean not null default false;

-- O metodo de estimativa so e obrigatorio ao submeter: durante o preenchimento pode faltar
alter table public.esg_valores drop constraint esg_valores_check;

-- Quem esta a entrar
create function public.esg_perfil() returns text
language sql stable security definer set search_path = '' as $$
  select perfil from public.esg_utilizadores where auth_user_id = auth.uid()
$$;
create function public.esg_nome() returns text
language sql stable security definer set search_path = '' as $$
  select nome from public.esg_utilizadores where auth_user_id = auth.uid()
$$;
create function public.esg_unidade() returns text
language sql stable security definer set search_path = '' as $$
  select unidade from public.esg_utilizadores where auth_user_id = auth.uid()
$$;
create function public.esg_gere() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(public.esg_perfil() in ('admin','esg'), false)
$$;
create function public.esg_interno() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(public.esg_perfil() in ('admin','esg','resp','auditor'), false)
$$;
-- A milestone e da unidade, ou a unidade tem nela um passo de parecer
create function public.esg_ms_minha(mid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.esg_perfil() = 'resp' and (
    exists (select 1 from public.esg_milestones m where m.id = mid and m.unidade = public.esg_unidade())
    or exists (select 1 from public.esg_passos_workflow p where p.milestone_id = mid and p.responsavel = 'area:' || public.esg_unidade())
  )
$$;
-- Os valores so se alteram na recolha e por quem a tem consigo
create function public.esg_ms_em_recolha(mid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.esg_perfil() = 'resp' and exists (
    select 1 from public.esg_milestones m
    join public.esg_passos_workflow p on p.milestone_id = m.id and p.ordem = m.passo_atual
    where m.id = mid and p.tipo = 'recolha'
      and ((p.responsavel = 'unidade' and m.unidade = public.esg_unidade()) or p.responsavel = 'area:' || public.esg_unidade())
  )
$$;
create function public.esg_indicador_meu(ind text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.esg_perfil() = 'resp' and exists (
    select 1 from public.esg_milestone_indicadores i
    join public.esg_milestones m on m.id = i.milestone_id
    where i.indicador_id = ind and m.unidade = public.esg_unidade()
  )
$$;
revoke execute on function public.esg_perfil(), public.esg_nome(), public.esg_unidade(), public.esg_gere(), public.esg_interno(),
  public.esg_ms_minha(text), public.esg_ms_em_recolha(text), public.esg_indicador_meu(text) from public, anon;
grant execute on function public.esg_perfil(), public.esg_nome(), public.esg_unidade(), public.esg_gere(), public.esg_interno(),
  public.esg_ms_minha(text), public.esg_ms_em_recolha(text), public.esg_indicador_meu(text) to authenticated;

-- Um responsavel so avanca o passo que esta com ele, mais os automaticos que se seguem
create function public.esg_validar_avanco() returns trigger
language plpgsql set search_path = '' as $$
declare
  atual text;
  saltados int;
begin
  if new.passo_atual <= old.passo_atual or public.esg_gere() or auth.uid() is null then return new; end if;
  if public.esg_perfil() = 'resp' then
    select responsavel into atual from public.esg_passos_workflow where milestone_id = old.id and ordem = old.passo_atual;
    select count(*) into saltados from public.esg_passos_workflow
      where milestone_id = old.id and ordem > old.passo_atual and ordem < new.passo_atual and responsavel <> 'sistema';
    if saltados = 0 and ((atual = 'unidade' and old.unidade = public.esg_unidade()) or atual = 'area:' || public.esg_unidade()) then
      return new;
    end if;
  end if;
  raise exception 'Este passo não está consigo.';
end;
$$;
create trigger esg_validar_avanco before update on public.esg_milestones
  for each row execute function public.esg_validar_avanco();
revoke execute on function public.esg_validar_avanco() from public, anon, authenticated;

-- Leitura: todos os perfis internos leem tudo
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'esg\_%' loop
    execute format('create policy esg_ler_interno on public.%I for select to authenticated using (public.esg_interno())', t);
  end loop;
end $$;

-- Gestao: administrador e equipa de sustentabilidade escrevem em tudo
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'esg\_%' loop
    execute format('create policy esg_gerir on public.%I for all to authenticated using (public.esg_gere()) with check (public.esg_gere())', t);
  end loop;
end $$;

-- Marca: publica para leitura
create policy esg_marca_publica on public.esg_marca for select to anon, authenticated using (true);

-- Responsaveis pelos dados
create policy esg_valores_resp_ins on public.esg_valores for insert to authenticated with check (public.esg_ms_em_recolha(milestone_id));
create policy esg_valores_resp_upd on public.esg_valores for update to authenticated using (public.esg_ms_em_recolha(milestone_id)) with check (public.esg_ms_em_recolha(milestone_id));
create policy esg_versoes_resp on public.esg_valor_versoes for insert to authenticated with check (
  por = public.esg_nome() and exists (select 1 from public.esg_valores v where v.indicador_id = esg_valor_versoes.indicador_id and v.ano = esg_valor_versoes.ano and public.esg_ms_em_recolha(v.milestone_id))
);
create policy esg_evidencias_resp on public.esg_evidencias for insert to authenticated with check (public.esg_ms_minha(milestone_id));
create policy esg_ms_resp on public.esg_milestones for update to authenticated using (public.esg_ms_minha(id)) with check (public.esg_ms_minha(id));
create policy esg_passos_resp_ins on public.esg_passos_workflow for insert to authenticated with check (public.esg_ms_minha(milestone_id));
create policy esg_passos_resp_upd on public.esg_passos_workflow for update to authenticated using (public.esg_ms_minha(milestone_id)) with check (public.esg_ms_minha(milestone_id));
create policy esg_passos_resp_del on public.esg_passos_workflow for delete to authenticated using (public.esg_ms_minha(milestone_id));
create policy esg_ext_resp_ins on public.esg_pedidos_externos for insert to authenticated with check (public.esg_ms_minha(milestone_id));
create policy esg_ext_resp_upd on public.esg_pedidos_externos for update to authenticated using (public.esg_ms_minha(milestone_id)) with check (public.esg_ms_minha(milestone_id));
create policy esg_aud_resp on public.esg_pedidos_auditor for update to authenticated using (public.esg_indicador_meu(indicador_id)) with check (public.esg_indicador_meu(indicador_id));
create policy esg_docs_resp_ins on public.esg_documentos for insert to authenticated with check (public.esg_perfil() = 'resp');
create policy esg_docs_resp_upd on public.esg_documentos for update to authenticated using (public.esg_perfil() = 'resp') with check (public.esg_perfil() = 'resp');

-- Comentarios e eventos: so em nome proprio, e os automaticos em nome do sistema
create policy esg_comentarios_escrever on public.esg_comentarios for insert to authenticated with check (public.esg_interno() and autor = public.esg_nome());
create policy esg_eventos_escrever on public.esg_eventos for insert to authenticated with check (por = public.esg_nome() or (public.esg_perfil() = 'resp' and por = 'Sistema'));

-- Auditor
create policy esg_aud_auditor_ins on public.esg_pedidos_auditor for insert to authenticated with check (public.esg_perfil() = 'auditor' and por = public.esg_nome());
create policy esg_aud_auditor_upd on public.esg_pedidos_auditor for update to authenticated using (public.esg_perfil() = 'auditor') with check (public.esg_perfil() = 'auditor');

-- Entidades externas: so veem e respondem aos seus pedidos
create policy esg_ext_ler on public.esg_pedidos_externos for select to authenticated using (public.esg_perfil() = 'ext' and entidade_externa = public.esg_nome());
create policy esg_ext_responder on public.esg_pedidos_externos for update to authenticated
  using (public.esg_perfil() = 'ext' and entidade_externa = public.esg_nome() and estado = 'pendente')
  with check (public.esg_perfil() = 'ext' and entidade_externa = public.esg_nome() and estado = 'recebido');
create policy esg_ext_ciclos on public.esg_ciclos for select to authenticated using (public.esg_perfil() = 'ext');
create policy esg_ext_proprio on public.esg_utilizadores for select to authenticated using (auth_user_id = auth.uid());
create policy esg_ext_indicadores on public.esg_indicadores for select to authenticated using (
  public.esg_perfil() = 'ext' and exists (select 1 from public.esg_pedidos_externos x where x.indicador_id = esg_indicadores.id)
);
create policy esg_ext_milestones on public.esg_milestones for select to authenticated using (
  public.esg_perfil() = 'ext' and exists (select 1 from public.esg_pedidos_externos x where x.milestone_id = esg_milestones.id)
);
