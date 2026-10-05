-- Empreiteiros: RLS por perfil e por obra + regras de dinheiro no banco (100%, numeração, ordem das colunas).
-- Termina em erro de propósito (RELATORIO): nada fica gravado. Cada linha: ok/FALHA, o que foi tentado, passou ou barrou.
create or replace function pg_temp.tenta(q text, p text, uids jsonb) returns text
language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uids ->> p, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute q;
  reset role;
  return null;
exception when others then
  reset role;
  return sqlerrm;
end $f$;

create or replace function pg_temp.conta(q text, p text, uids jsonb) returns bigint
language plpgsql as $f$
declare n bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uids ->> p, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute q into n;
  reset role;
  return n;
end $f$;

create or replace function pg_temp.linha(descr text, deve boolean, msg text) returns text
language sql as $f$
  select format(E'%s %s: %s%s\n', case when (msg is null) = deve then 'ok   ' else 'FALHA' end, descr,
                case when msg is null then 'passou' else 'barrado' end, coalesce(' (' || msg || ')', ''))
$f$;

do $t$
declare
  r text := ''; v_o bigint; v_o2 bigint; v_c bigint; v_g bigint; v_x bigint;
  i1 bigint; i2 bigint; i3 bigint; uids jsonb := '{}'; uid_ uuid; p text; m text; n bigint;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  papeis text[] := array['Coordenador', 'Planejamento', 'Medição', 'Produção', 'Diretoria', 'Cliente'];
begin
  foreach p in array papeis loop
    uid_ := gen_random_uuid();
    insert into auth.users (id, email) values (uid_, 'emp_' || replace(p, ' ', '_') || '@t.local');
    update public.profiles set role = p where auth_uid = uid_;
    uids := uids || jsonb_build_object(p, uid_);
  end loop;
  insert into public.obras (codigo, nome, cliente, data_inicio, data_fim_contratual, status) values ('EM1', 'm', 'c', '2026-01-01', '2026-12-31', 'Ativa') returning id into v_o;
  insert into public.obras (codigo, nome, cliente, data_inicio, data_fim_contratual, status) values ('EM2', 'm', 'c', '2026-01-01', '2026-12-31', 'Ativa') returning id into v_o2;
  insert into public.obra_membros (obra_id, profile_id) select v_o, id from public.profiles where role in ('Planejamento', 'Medição', 'Produção', 'Cliente');

  -- quem cria contrato
  foreach p in array papeis loop
    m := pg_temp.tenta(format('insert into public.contratos_empreiteiro (obra_id, empreiteiro, descricao) values (%s, %L, %L)', v_o, 'E ' || p, 'serv'), p, uids);
    r := r || pg_temp.linha('criar contrato como ' || p, p in ('Coordenador', 'Planejamento', 'Medição'), m);
  end loop;
  m := pg_temp.tenta(format('insert into public.contratos_empreiteiro (obra_id, empreiteiro, descricao) values (%s, ''x'', ''y'')', v_o2), 'Medição', uids);
  r := r || pg_temp.linha('Medição criar contrato em obra que não é dela', false, m);
  m := pg_temp.tenta(format('insert into public.contratos_empreiteiro (obra_id, empreiteiro, descricao, status) values (%s, ''x'', ''y'', ''enviado'')', v_o), 'Coordenador', uids);
  r := r || pg_temp.linha('Coordenador criar contrato já em Enviado', false, m);

  -- quem enxerga
  r := r || format(E'%s Diretoria vê os contratos da obra: %s\n', case when pg_temp.conta('select count(*) from public.contratos_empreiteiro', 'Diretoria', uids) = 3 then 'ok   ' else 'FALHA' end, pg_temp.conta('select count(*) from public.contratos_empreiteiro', 'Diretoria', uids));
  r := r || format(E'%s Produção não vê nenhum: %s\n', case when pg_temp.conta('select count(*) from public.contratos_empreiteiro', 'Produção', uids) = 0 then 'ok   ' else 'FALHA' end, pg_temp.conta('select count(*) from public.contratos_empreiteiro', 'Produção', uids));
  r := r || format(E'%s Cliente não vê nenhum: %s\n', case when pg_temp.conta('select count(*) from public.contratos_empreiteiro', 'Cliente', uids) = 0 then 'ok   ' else 'FALHA' end, pg_temp.conta('select count(*) from public.contratos_empreiteiro', 'Cliente', uids));
  r := r || format(E'%s Medição (membro da EM1) não vê contrato de outra obra: %s\n', case when pg_temp.conta(format('select count(*) from public.contratos_empreiteiro where obra_id = %s', v_o2), 'Medição', uids) = 0 then 'ok   ' else 'FALHA' end, pg_temp.conta(format('select count(*) from public.contratos_empreiteiro where obra_id = %s', v_o2), 'Medição', uids));

  -- ordem das colunas e ativação (contrato por escopo)
  select id into v_c from public.contratos_empreiteiro where obra_id = v_o and empreiteiro = 'E Coordenador';
  select id into v_x from public.contratos_empreiteiro where obra_id = v_o and empreiteiro = 'E Medição';
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set status = ''ativo'', modo = ''escopo'', valor_total = 100 where id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('pular de Elaboração direto para Ativo', false, m);
  -- sem permissão, o UPDATE não dá erro: simplesmente não acha a linha. O que vale é o status não ter mudado.
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set status = ''enviado'' where id = %s', v_c), 'Produção', uids);
  select case when status = 'elaboracao' then 'não alterou nenhuma linha' end into m from public.contratos_empreiteiro where id = v_c;
  r := r || pg_temp.linha('Produção mover contrato', false, m);
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set status = ''enviado'' where id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('Coordenador Elaboração -> Enviado', true, m);
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set status = ''ativo'' where id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('ativar sem valor cadastrado', false, m);

  -- itens do escopo: placas 200 x 80, juntas 200 x 40, tabica 50 x 120 = 30.000
  m := pg_temp.tenta(format('insert into public.itens_contrato (obra_id, contrato_id, descricao, unidade, quantidade, preco_unitario) values (%s, %s, ''Placas'', ''m2'', 200, 80), (%s, %s, ''Juntas'', ''m2'', 200, 40), (%s, %s, ''Tabica'', ''m'', 50, 120)', v_o, v_c, v_o, v_c, v_o, v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('cadastrar os 3 itens do escopo', true, m);
  m := pg_temp.tenta(format('insert into public.itens_contrato (obra_id, contrato_id, descricao, unidade, quantidade, preco_unitario) values (%s, %s, ''x'', ''kg'', 1, 1)', v_o, v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('unidade fora de m2/m/un/vb', false, m);
  m := pg_temp.tenta(format('insert into public.itens_contrato (obra_id, contrato_id, descricao, unidade, quantidade, preco_unitario) values (%s, %s, ''x'', ''m'', 1, 1)', v_o2, v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('item com obra diferente da do contrato', false, m);
  select id into i1 from public.itens_contrato where contrato_id = v_c and descricao = 'Placas';
  select id into i2 from public.itens_contrato where contrato_id = v_c and descricao = 'Juntas';
  select id into i3 from public.itens_contrato where contrato_id = v_c and descricao = 'Tabica';

  -- o escopo só é conferido na ativação: total errado barra, total certo passa
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set status = ''ativo'', modo = ''escopo'', valor_total = 99999 where id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('ativar escopo com total que não bate com os itens', false, m);
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set status = ''ativo'', modo = ''global'', valor_total = 30000 where id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('ativar como global um contrato que tem itens', false, m);
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set status = ''ativo'', modo = ''escopo'', valor_total = 30000 where id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('ativar com o valor (itens somam R$ 30.000)', true, m);
  m := pg_temp.tenta(format('insert into public.itens_contrato (obra_id, contrato_id, descricao, unidade, quantidade, preco_unitario) values (%s, %s, ''extra'', ''m'', 1, 1)', v_o, v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('acrescentar item em contrato Ativo (direto na API)', false, m);
  m := pg_temp.tenta(format('update public.itens_contrato set quantidade = 1 where id = %s', i1), 'Coordenador', uids);
  r := r || pg_temp.linha('mudar quantidade de item de contrato Ativo', false, m);
  m := pg_temp.tenta(format('update public.itens_contrato set contrato_id = %s where id = %s', v_x, i1), 'Coordenador', uids);
  r := r || pg_temp.linha('mover item de contrato Ativo para outro contrato', false, m);

  -- boletins
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 8000, ''[{"itemId":%s,"quantidade":80},{"itemId":%s,"quantidade":40}]'')', v_o, v_c, hoje, i1, i2), 'Produção', uids);
  r := r || pg_temp.linha('Produção lançar boletim', false, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 8000, ''[{"itemId":%s,"quantidade":80},{"itemId":%s,"quantidade":40}]'')', v_o, v_c, hoje, i1, i2), 'Medição', uids);
  r := r || pg_temp.linha('Medição lança o boletim 1 (80 + 40 = R$ 8.000)', true, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 9999, ''[{"itemId":%s,"quantidade":10}]'')', v_o, v_c, hoje, i1), 'Medição', uids);
  r := r || pg_temp.linha('valor que não bate com as quantidades', false, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 9680, ''[{"itemId":%s,"quantidade":121}]'')', v_o, v_c, hoje, i1), 'Medição', uids);
  r := r || pg_temp.linha('placas passando de 100% (80 + 121 > 200)', false, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 9600, ''[{"itemId":%s,"quantidade":60},{"itemId":%s,"quantidade":60},{"itemId":%s,"quantidade":20}]'')', v_o, v_c, hoje, i1, i2, i3), 'Medição', uids);
  r := r || pg_temp.linha('boletim 2 (o número 1 enviado é ignorado)', true, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 240, ''[{"itemId":%s,"quantidade":1},{"itemId":%s,"quantidade":1}]'')', v_o, v_c, hoje, i3, i3), 'Medição', uids);
  r := r || pg_temp.linha('mesmo item duas vezes no boletim (3 e 3)', false, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 100, ''[{"itemId":%s,"quantidade":1},{"itemId":%s.0,"quantidade":1}]'')', v_o, v_c, hoje, i3, i3), 'Medição', uids);
  r := r || pg_temp.linha('mesmo item duas vezes no boletim (2 e 2.0)', false, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 100, ''[{"itemId":"%s","quantidade":1}]'')', v_o, v_c, hoje, i3), 'Medição', uids);
  r := r || pg_temp.linha('itemId como texto', false, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 100, ''[{"itemId":%s,"quantidade":"abc"}]'')', v_o, v_c, hoje, i3), 'Medição', uids);
  r := r || pg_temp.linha('quantidade que não é número', false, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 100, ''[1,2]'')', v_o, v_c, hoje), 'Medição', uids);
  r := r || pg_temp.linha('linha que não é objeto', false, m);
  select max(numero) into n from public.boletins_empreiteiro where contrato_id = v_c;
  r := r || format(E'%s o banco numerou o boletim: %s\n', case when n = 2 then 'ok   ' else 'FALHA' end, n);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 100, ''[{"itemId":%s,"quantidade":1},{"itemId":%s,"quantidade":1}]'')', v_o, v_c, hoje + 1, i3, i3), 'Medição', uids);
  r := r || pg_temp.linha('data futura / item repetido', false, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 100, ''[{"itemId":%s,"quantidade":0.5}]'')', v_o2, v_c, hoje, i3), 'Coordenador', uids);
  r := r || pg_temp.linha('boletim apontando obra diferente da do contrato', false, m);
  m := pg_temp.tenta(format('update public.boletins_empreiteiro set valor = 1 where contrato_id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('alterar boletim', false, m);
  m := pg_temp.tenta(format('delete from public.boletins_empreiteiro where contrato_id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('apagar boletim', false, m);
  m := pg_temp.tenta(format('delete from public.itens_contrato where contrato_id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('apagar item depois da 1a medição', false, m);
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set valor_total = 1 where id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('mudar o valor depois da 1a medição', false, m);
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set status = ''concluido'' where id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('concluir com 58,7% medido', false, m);
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set status = ''enviado'' where id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('voltar Ativo -> Enviado com medição', false, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 12400, ''[{"itemId":%s,"quantidade":60},{"itemId":%s,"quantidade":100},{"itemId":%s,"quantidade":30}]'')', v_o, v_c, hoje, i1, i2, i3), 'Medição', uids);
  r := r || pg_temp.linha('boletim 3 fecha os 100% (valor exato por acumulado)', true, m);
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set status = ''concluido'' where id = %s', v_c), 'Coordenador', uids);
  r := r || pg_temp.linha('concluir com 100% medido', true, m);

  -- contrato global
  insert into public.contratos_empreiteiro (obra_id, empreiteiro, descricao, status, modo, valor_total) values (v_o, 'Gesso', 'g', 'ativo', 'global', 30000) returning id into v_g;
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor) values (%s, %s, 1, %L, 12000)', v_o, v_g, hoje), 'Medição', uids);
  r := r || pg_temp.linha('global: boletim de R$ 12.000', true, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor) values (%s, %s, 1, %L, 18000.01)', v_o, v_g, hoje), 'Medição', uids);
  r := r || pg_temp.linha('global: R$ 18.000,01 passa do saldo', false, m);
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values (%s, %s, 1, %L, 100, ''[{"itemId":1,"quantidade":1}]'')', v_o, v_g, hoje), 'Medição', uids);
  r := r || pg_temp.linha('global: linha por item não é aceita', false, m);
  m := pg_temp.tenta(format('update public.contratos_empreiteiro set status = ''concluido'' where id = %s', v_g), 'Coordenador', uids);
  r := r || pg_temp.linha('global: concluir com 40%', false, m);
  insert into public.contratos_empreiteiro (obra_id, empreiteiro, descricao) values (v_o, 'Elab', 'e') returning id into v_x;
  m := pg_temp.tenta(format('insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor) values (%s, %s, 1, %L, 10)', v_o, v_x, hoje), 'Coordenador', uids);
  r := r || pg_temp.linha('boletim em contrato que não está Ativo', false, m);

  raise exception E'RELATORIO (% falhas)\n%', (length(r) - length(replace(r, 'FALHA', ''))) / 5, r;
end $t$;
