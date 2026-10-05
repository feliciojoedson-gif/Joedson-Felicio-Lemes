-- Índices nas chaves estrangeiras que o advisor de performance do Supabase apontou sem índice
-- (apagar ou juntar por essas colunas varria a tabela inteira). Não muda nenhum dado.
create index if not exists apontamentos_autor_id_idx on public.apontamentos (autor_id);
create index if not exists atividades_planejamento_created_by_idx on public.atividades_planejamento (created_by);
create index if not exists auditoria_usuario_id_idx on public.auditoria (usuario_id);
create index if not exists fotos_apontamento_id_idx on public.fotos (apontamento_id);
create index if not exists fotos_autor_id_idx on public.fotos (autor_id);
create index if not exists fvs_modelos_created_by_idx on public.fvs_modelos (created_by);
create index if not exists fvs_ncs_created_by_idx on public.fvs_ncs (created_by);
create index if not exists fvs_ncs_vistoria_id_idx on public.fvs_ncs (vistoria_id);
create index if not exists fvs_vistorias_created_by_idx on public.fvs_vistorias (created_by);
create index if not exists gemba_observacoes_created_by_idx on public.gemba_observacoes (created_by);
create index if not exists itens_contrato_obra_id_idx on public.itens_contrato (obra_id);
create index if not exists materiais_catalogo_created_by_idx on public.materiais_catalogo (created_by);
create index if not exists obras_responsavel_id_idx on public.obras (responsavel_id);
create index if not exists pedidos_material_created_by_idx on public.pedidos_material (created_by);
create index if not exists pedidos_material_material_id_idx on public.pedidos_material (material_id);
create index if not exists planejamento_config_created_by_idx on public.planejamento_config (created_by);
create index if not exists qualidade_pendencias_created_by_idx on public.qualidade_pendencias (created_by);
create index if not exists rdo_registros_created_by_idx on public.rdo_registros (created_by);
create index if not exists restricoes_autor_id_idx on public.restricoes (autor_id);
create index if not exists restricoes_frente_id_idx on public.restricoes (frente_id);
create index if not exists restricoes_responsavel_id_idx on public.restricoes (responsavel_id);
create index if not exists restricoes_planejamento_created_by_idx on public.restricoes_planejamento (created_by);
create index if not exists restricoes_planejamento_atividade_idx on public.restricoes_planejamento (obra_id, atividade_id);
