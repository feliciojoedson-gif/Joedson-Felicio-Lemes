# Banco de dados — resumo em português

Projeto Supabase `kaefer-rip` (`rbqzyxyneuqbeyvjdzom`, São Paulo). Atualizado em 04/10/2026.
Todas as tabelas têm RLS (segurança por linha) **ligada e apertada de verdade**: quem enxerga o quê depende do perfil e da obra (`obra_membros`). Não há política "liberada" provisória.

## Tabelas

| Tabela | O que guarda | Obs. |
|---|---|---|
| `profiles` | Cada pessoa com login: nome, email, perfil (`role`), se está ativa | Conta nova nasce `Pendente`; o Coordenador libera |
| `obras` | Cada obra: código, nome, cliente, contrato, datas, status | Seletor de obra do topo lê daqui |
| `obra_membros` | Quem tem acesso a qual obra | Base da RLS multi-obra |
| `frentes` | Frentes de trabalho de uma obra: disciplina, planejado x realizado, dias sem avanço, status, semáforo | `obra_id`; a "virada" diária atualiza dias/semáforo |
| `apontamentos` | **Diário de Obra**: lançamento do dia por frente (% acumulado, efetivo, motivo se não avançou, equipamentos, observação) | `obra_id`; um por frente por dia; gatilhos calculam "houve avanço" e atualizam a frente |
| `fotos` | **Diário de Obra**: uma linha por foto (caminho do arquivo no bucket privado `fotos`, legenda, visível ao cliente) | `obra_id`; guarda só o caminho; o link assinado (1 h) é gerado na leitura |
| `medicoes` | Medição mensal por frente (quantidade, %, valor, status em duas aprovações) | `obra_id`; ainda sem formulário que grave |
| `restricoes` | Restrições, RFIs, riscos e pleitos | `obra_id`; ainda sem formulário que grave |
| `auditoria` | Histórico de quem mudou o quê e a marca da virada diária | Só leitura para perfis altos |

Views (recortes de leitura): `frentes_cliente`, `medicoes_cliente` (Cliente vê menos colunas), `apontamentos_sem_efetivo` (Engenharia não vê efetivo), `perfis_colegas` (nome e perfil).

## Valores travados por CHECK (iguais a `src/lib/regras.js`)

- `frentes.status`: Não iniciada, Em andamento, Parada, Concluída · `frentes.saude`: Verde, Amarelo, Vermelho
- `apontamentos.motivo_sem_avanco`: Chuva, Falta de material, Falta de liberação, Falta de efetivo, Interferência, Retrabalho, Outro
- `medicoes.status`: Rascunho, Enviada, Aprovada pela Gestão, Aprovada
- `restricoes.tipo` / `criticidade` / `status`, `obras.status`, `frentes.disciplina`: ver `regras.js`

## Regras de data
Colunas de dia são `date` (sem fuso). "Hoje" = `hojeEmBrasilia()`.

## Onde está cada coisa
- Migrations: `supabase/migrations/` · Dados de exemplo: `supabase/seed.sql` (2 obras, 10 frentes; pode rodar de novo sem duplicar)
- Testes de RLS: `supabase/tests/*.sql` · Régua código x banco: `tests/check-schema.mjs` + `tests/schema-snapshot.json` (atualizar junto com toda migration)
- Única porta do app para o banco: `src/lib/dados.js`

## Pendências conhecidas (do banco)
- 4 views `SECURITY DEFINER` (provavelmente de propósito, para recortar colunas; confirmar)
- `rodar_virada` e `virada_estado` chamáveis por qualquer logado (confirmar que `rodar_virada` checa o perfil por dentro)
- Proteção contra senha vazada desligada (painel do Supabase, Auth)
