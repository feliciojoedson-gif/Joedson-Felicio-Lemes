-- Revisão de código: o autor (created_by) era carimbado só na CRIAÇÃO; um UPDATE podia trocá-lo (a policy de editar deixa o resto da linha mudar).
-- Agora o gatilho roda também no UPDATE e devolve sempre o autor original. Vale para as 16 tabelas de lançamento.
create or replace function private.carimba_autor() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
  elsif auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end $$;

drop trigger carimba_autor on public.atividades_planejamento;
drop trigger carimba_autor on public.restricoes_planejamento;
drop trigger carimba_autor on public.planejamento_config;
drop trigger carimba_autor on public.materiais_catalogo;
drop trigger carimba_autor on public.pedidos_material;
drop trigger carimba_autor on public.rdo_registros;
drop trigger carimba_autor on public.qualidade_pendencias;
drop trigger carimba_autor on public.fvs_modelos;
drop trigger carimba_autor on public.fvs_vistorias;
drop trigger carimba_autor on public.fvs_ncs;
drop trigger carimba_autor on public.gemba_observacoes;
drop trigger carimba_autor on public.frentes;
drop trigger carimba_autor on public.medicoes;
drop trigger carimba_autor on public.contratos_empreiteiro;
drop trigger carimba_autor on public.itens_contrato;
drop trigger carimba_autor on public.boletins_empreiteiro;

create trigger carimba_autor before insert or update on public.atividades_planejamento for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.restricoes_planejamento for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.planejamento_config for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.materiais_catalogo for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.pedidos_material for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.rdo_registros for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.qualidade_pendencias for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.fvs_modelos for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.fvs_vistorias for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.fvs_ncs for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.gemba_observacoes for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.frentes for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.medicoes for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.contratos_empreiteiro for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.itens_contrato for each row execute function private.carimba_autor();
create trigger carimba_autor before insert or update on public.boletins_empreiteiro for each row execute function private.carimba_autor();
