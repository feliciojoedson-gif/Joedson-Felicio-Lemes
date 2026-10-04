-- Corrige a ordem do semáforo na virada: frente Não iniciada nunca é Vermelha por desvio (igual a regras.js).
create or replace function private.virada_diaria() returns int
language plpgsql security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  f record;
  v_dias int; v_status text; v_desvio numeric; v_plan numeric; v_saude text;
  v_n int := 0;
begin
  perform set_config('app.virada', '1', true);
  for f in select * from public.frentes where not eh_marco loop
    v_dias := f.dias_sem_avanco; v_status := f.status;
    if f.status in ('Em andamento', 'Parada') then
      v_dias := greatest(0, hoje - coalesce(f.ultimo_avanco_em, f.inicio_planejado));
      v_status := case when v_dias >= 3 then 'Parada' else 'Em andamento' end;
    end if;
    v_plan := private.planejado_hoje(f.inicio_planejado, f.fim_planejado, hoje);
    v_desvio := f.percentual_realizado - v_plan;
    v_saude := case
      when v_status = 'Concluída' then 'Verde'
      when v_status = 'Parada' then 'Vermelho'
      when v_status = 'Não iniciada' then case when v_plan > 0 then 'Amarelo' else 'Verde' end
      when v_desvio <= -10 then 'Vermelho'
      when v_desvio <= -5 or (v_dias between 1 and 2 and v_desvio < 0) then 'Amarelo'
      else 'Verde' end;
    if v_dias is distinct from f.dias_sem_avanco or v_status is distinct from f.status or v_saude is distinct from f.saude then
      update public.frentes set dias_sem_avanco = v_dias, status = v_status, saude = v_saude where id = f.id;
      v_n := v_n + 1;
    end if;
  end loop;
  insert into public.auditoria (tabela, registro_id, acao, usuario_id, perfil, campo, valor_novo, justificativa)
  values ('virada_diaria', 0, 'Alterou', private.meu_perfil_id(), private.meu_role(), 'resultado', 'ok',
          format('%s frentes atualizadas em %s', v_n, hoje));
  return v_n;
exception when others then
  -- o bloco inteiro desfaz; o registro da falha é gravado depois, fora do que foi desfeito
  insert into public.auditoria (tabela, registro_id, acao, usuario_id, perfil, campo, valor_novo, justificativa)
  values ('virada_diaria', 0, 'Alterou', private.meu_perfil_id(), private.meu_role(), 'resultado', 'falhou', left(sqlerrm, 500));
  return -1;
end $$;

