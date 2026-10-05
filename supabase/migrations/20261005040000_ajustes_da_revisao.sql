-- Ajustes da revisão de código (05/10/2026).

-- 1) Foto só abre se o arquivo é DA MESMA OBRA da linha que aponta para ele. Antes, quem gravava um caminho de outra obra
--    numa linha da própria obra lia o arquivo alheio (o caminho é texto que a pessoa escreve).
drop policy fotos_rdo_ler on storage.objects;
drop policy fotos_nf_ler on storage.objects;
drop policy fotos_qualidade_ler on storage.objects;

create policy fotos_rdo_ler on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and exists (
    select 1 from public.rdo_registros r
    where storage.objects.name = any (r.fotos) and (storage.foldername(storage.objects.name))[1] = r.obra_id::text));
create policy fotos_nf_ler on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and exists (
    select 1 from public.pedidos_material p
    where p.recebimento ->> 'fotoNF' = storage.objects.name and (storage.foldername(storage.objects.name))[1] = p.obra_id::text));
create policy fotos_qualidade_ler on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (
    exists (select 1 from public.qualidade_pendencias p
            where storage.objects.name in (p.foto, p.foto_evidencia) and (storage.foldername(storage.objects.name))[1] = p.obra_id::text)
    or exists (select 1 from public.fvs_ncs n
               where n.fotos ? storage.objects.name and (storage.foldername(storage.objects.name))[1] = n.obra_id::text)
    or exists (select 1 from public.gemba_observacoes g
               where g.foto = storage.objects.name and (storage.foldername(storage.objects.name))[1] = g.obra_id::text)));

-- 2) Ninguém muda o PRÓPRIO perfil nem a própria situação de conta (nem o Coordenador): evita o único Coordenador se bloquear
--    e fechar a administração. Manutenção direta no banco (auth.uid() nulo) continua livre.
create or replace function private.profiles_protege() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if private.meu_role() is distinct from 'Coordenador' then
      if new.role is distinct from old.role or new.ativo is distinct from old.ativo
         or new.email is distinct from old.email or new.auth_uid is distinct from old.auth_uid then
        raise exception 'Só o Coordenador altera perfil e situação da conta.';
      end if;
    elsif old.id = private.meu_perfil_id() and (new.role is distinct from old.role or new.ativo is distinct from old.ativo) then
      raise exception 'Você não pode mudar o seu próprio perfil nem bloquear a sua própria conta.';
    end if;
  end if;
  return new;
end $$;

-- 3) A linha de base e o calendário são do Planejamento: Produção marca subtarefas, mas não reescreve a linha de base.
drop policy planejamento_config_criar on public.planejamento_config;
drop policy planejamento_config_editar on public.planejamento_config;
create policy planejamento_config_criar on public.planejamento_config for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento'));
create policy planejamento_config_editar on public.planejamento_config for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento'));

-- 4) Diretoria e Custos e Controle têm Relatórios no menu: leem o Planejamento (só leitura), senão o painel ficava sempre bloqueado.
drop policy atividades_planejamento_ver on public.atividades_planejamento;
drop policy restricoes_planejamento_ver on public.restricoes_planejamento;
drop policy planejamento_config_ver on public.planejamento_config;
create policy atividades_planejamento_ver on public.atividades_planejamento for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção', 'Diretoria', 'Custos e Controle'));
create policy restricoes_planejamento_ver on public.restricoes_planejamento for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção', 'Diretoria', 'Custos e Controle'));
create policy planejamento_config_ver on public.planejamento_config for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção', 'Diretoria', 'Custos e Controle'));

-- 5) O autor de uma linha é quem a criou: created_by não vem do navegador (qualquer valor enviado é trocado pelo usuário logado).
create function private.carimba_autor() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end $$;
create trigger carimba_autor before insert on public.atividades_planejamento for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.restricoes_planejamento for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.planejamento_config for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.materiais_catalogo for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.pedidos_material for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.rdo_registros for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.qualidade_pendencias for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.fvs_modelos for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.fvs_vistorias for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.fvs_ncs for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.gemba_observacoes for each row execute function private.carimba_autor();
