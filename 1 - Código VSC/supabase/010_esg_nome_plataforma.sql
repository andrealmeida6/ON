-- ESG Data Hub: novo nome da plataforma (pedido do André, 10 de novembro de 2026).
-- So muda a marca que ainda tem um dos nomes antigos; uma marca personalizada fica como esta.
update public.esg_marca set nome = 'ESG Data Hub' where nome in ('Record to Report (R2R)', 'Portal de Sustentabilidade');
