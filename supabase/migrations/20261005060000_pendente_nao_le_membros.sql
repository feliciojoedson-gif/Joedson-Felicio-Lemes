-- Auditoria "teste do estranho": uma conta PENDENTE (ainda não liberada) conseguia ler a própria linha de obra_membros,
-- porque a regra "cada um lê as próprias linhas" não excluía o perfil Pendente. Pendente não lê tabela nenhuma.
drop policy membros_ver on public.obra_membros;
create policy membros_ver on public.obra_membros for select to authenticated
  using (
    private.meu_role() in ('Coordenador', 'Diretoria', 'Administrador')
    or (profile_id = private.meu_perfil_id() and private.meu_role() <> 'Pendente')
  );
