-- Limpa os dados de demonstracao do portal, para voltarem a ser carregados com carregar-demonstracao.js.
-- So toca em tabelas esg_. Mantem os utilizadores, as contas, as entidades, a materialidade, as areas e a marca.
-- O truncate e a unica forma de limpar o registo de auditoria: por regra, eventos e versoes nao se apagam linha a linha.
-- Usar apenas com dados de demonstracao, nunca com dados reais.
truncate public.esg_valor_versoes, public.esg_eventos, public.esg_comentarios, public.esg_evidencias, public.esg_pedidos_externos,
  public.esg_pedidos_auditor, public.esg_valores, public.esg_passos_workflow, public.esg_milestone_indicadores, public.esg_milestones,
  public.esg_amostra, public.esg_metas, public.esg_documentos, public.esg_indicadores, public.esg_ciclos, public.esg_janelas, public.esg_workflow_base
  restart identity;
