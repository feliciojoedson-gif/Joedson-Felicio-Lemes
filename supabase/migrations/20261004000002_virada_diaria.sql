-- Virada diária das frentes (06h, horário de Brasília) + aviso de falha + novos status de obra.

-- Status da obra (decisão do dono, 04/10/2026). Nenhuma obra é excluída; encerra mudando o status.
alter table public.obras drop constraint obras_status_check;
alter table public.obras add constraint obras_status_check
  check (status in ('Planejamento', 'Mobilização', 'Execução', 'Encerramento Técnico', 'Encerrada', 'Arquivada'));

-- A virada roda com auth.uid() nulo (cron) ou chamada pelo Coordenador (rodar de novo). Em ambos os casos
-- ela avisa o gatilho pela variável app.virada, que vale só dentro da própria transação.
create or replace function private.frentes_protege() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.fim_planejado_original := new.fim_planejado;
    if auth.uid() is not null then
      new.percentual_realizado := 0; new.ultimo_avanco_em := null; new.dias_sem_avanco := 0;
      new.status := 'Não iniciada'; new.saude := 'Verde';
    end if;
  else
    if new.fim_planejado_original is distinct from old.fim_planejado_original then
      raise exception 'O fim planejado original não muda.';
    end if;
    if auth.uid() is not null and pg_trigger_depth() < 2
       and coalesce(current_setting('app.virada', true), '') <> '1'
       and (new.percentual_realizado, new.ultimo_avanco_em, new.dias_sem_avanco, new.status, new.saude)
           is distinct from
           (old.percentual_realizado, old.ultimo_avanco_em, old.dias_sem_avanco, old.status, old.saude) then
      raise exception 'Avanço, dias sem avanço, status e saúde são calculados pelo sistema.';
    end if;
  end if;
  return new;
end $$;

-- A virada mexe em dias_sem_avanco e saude de todas as frentes todo dia: isso não entra na auditoria
-- (ruído). A execução da virada em si é registrada abaixo.
create or replace function private.auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_ant jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_nov jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_base jsonb := coalesce(v_nov, v_ant);
  v_obra bigint;
  v_reg bigint := (v_base ->> 'id')::bigint;
  v_user bigint := private.meu_perfil_id();
  v_perfil text := private.meu_role();
  k text;
begin
  v_obra := case tg_table_name when 'obras' then v_reg when 'profiles' then null
                 else (v_base ->> 'obra_id')::bigint end;
  if tg_op = 'INSERT' then
    insert into public.auditoria (obra_id, tabela, registro_id, acao, usuario_id, perfil)
    values (v_obra, tg_table_name, v_reg, 'Criou', v_user, v_perfil);
  elsif tg_op = 'DELETE' then
    insert into public.auditoria (obra_id, tabela, registro_id, acao, usuario_id, perfil)
    values (v_obra, tg_table_name, v_reg, 'Apagou', v_user, v_perfil);
  else
    for k in select jsonb_object_keys(v_nov) loop
      if k <> 'created_at'
         and not (tg_table_name = 'frentes' and k in ('dias_sem_avanco', 'saude') and v_user is null)
         and (v_nov -> k) is distinct from (v_ant -> k) then
        insert into public.auditoria (obra_id, tabela, registro_id, acao, usuario_id, perfil, campo, valor_anterior, valor_novo)
        values (v_obra, tg_table_name, v_reg, 'Alterou', v_user, v_perfil, k, v_ant ->> k, v_nov ->> k);
      end if;
    end loop;
  end if;
  return null;
end $$;

-- Planejado de hoje: reta entre início e fim (mesma regra de src/lib/regras.js).
create function private.planejado_hoje(p_ini date, p_fim date, p_hoje date) returns numeric
language sql immutable set search_path = public as $$
  select case
    when p_hoje <= p_ini then 0
    when p_fim <= p_ini or p_hoje >= p_fim then 100
    else (p_hoje - p_ini)::numeric / (p_fim - p_ini) * 100 end
$$;

-- Virada diária: dias sem avanço, Parada (3 dias ou mais) e saúde. Registra o resultado na auditoria.
-- Frente em andamento que nunca avançou conta os dias desde o início planejado.
create function private.virada_diaria() returns int
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
      when v_status = 'Parada' or v_desvio <= -10 then 'Vermelho'
      when v_status = 'Não iniciada' then case when v_plan > 0 then 'Amarelo' else 'Verde' end
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

-- 06h30: se a virada das 06h não deixou registro "ok" hoje, grava que não ocorreu.
create function private.verificar_virada() returns void
language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not exists (select 1 from public.auditoria
                  where tabela = 'virada_diaria' and valor_novo = 'ok'
                    and (created_at at time zone 'America/Sao_Paulo')::date = hoje) then
    insert into public.auditoria (tabela, registro_id, acao, campo, valor_novo, justificativa)
    values ('virada_diaria', 0, 'Alterou', 'resultado', 'nao_executou', format('A virada de %s não rodou', hoje));
  end if;
end $$;

-- API: Coordenador roda de novo; qualquer perfil interno vê o estado (para o aviso no Painel).
create function public.rodar_virada() returns int
language plpgsql security definer set search_path = public as $$
begin
  if private.meu_role() is distinct from 'Coordenador' then
    raise exception 'Só o Coordenador roda a atualização das frentes.';
  end if;
  return private.virada_diaria();
end $$;

create function public.virada_estado() returns table (rodou_hoje boolean, ultimo_resultado text, ultima_execucao timestamptz)
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from public.auditoria a
             where a.tabela = 'virada_diaria' and a.valor_novo = 'ok'
               and (a.created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date),
    (select a.valor_novo from public.auditoria a where a.tabela = 'virada_diaria' order by a.id desc limit 1),
    (select a.created_at from public.auditoria a where a.tabela = 'virada_diaria' order by a.id desc limit 1)
  where private.meu_role() not in ('Cliente', 'Pendente')
$$;

revoke execute on function public.rodar_virada(), public.virada_estado() from public, anon;
grant execute on function public.rodar_virada(), public.virada_estado() to authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- Agenda: 09h00 UTC = 06h00 de Brasília; conferência às 09h30 UTC.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('virada-diaria', '0 9 * * *', $$select private.virada_diaria()$$);
select cron.schedule('virada-conferencia', '30 9 * * *', $$select private.verificar_virada()$$);
