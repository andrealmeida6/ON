-- Assigned to e ficheiros pedidos em cada milestone. So e preciso aplicar antes de voltar a ligar o login (LOGIN_ONLINE = true).
alter table public.esg_milestones add column atribuido_a text references public.esg_utilizadores(login) on update cascade on delete set null;
alter table public.esg_milestones add column ficheiros_pedidos jsonb not null default '[]';
