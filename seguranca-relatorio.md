# Relatório de segurança — "O teste do estranho"

**Data do teste:** 05/10/2026 · **Projeto:** `kaefer-rip` (Supabase, São Paulo) · **Script:** `teste-do-estranho.mjs`

## Em uma frase

Um estranho sem login **não consegue ler, inserir, alterar nem apagar nada**. Um usuário comum (Produção) e uma conta pendente foram testados logados: **uma porta aberta foi encontrada (a conta pendente lia o próprio vínculo de obra) e corrigida**; depois da correção a saída ficou **100% sem 🚨**.

## O que foi auditado

- **23 tabelas** e **4 views** (todas com RLS ligada; nenhuma policy "liberada" de desenvolvimento sobrou — a busca por `true`, `anon`, `public` e regras sem condição não achou nada).
- **4 funções** do banco, **2 buckets** de arquivos (`fotos`, `evidencias`), o **cadastro de conta** (Supabase Auth) e a **Edge Function `admin-usuarios`**.
- O visitante sem login (`anon`) tem **zero permissões** em qualquer tabela, view ou função.

## Resultado por intruso

| Intruso | 🔒 fechadas | 🟢 permitidas pelo papel | 🚨 abertas | ❓ inconclusivas |
|---|---|---|---|---|
| Estranho **sem login** (só a chave pública) | 106 | 0 | **0** | 0 |
| Usuário **comum (Produção)**, logado | 165 | 42 | **0** | 0 |
| Conta **pendente**, logada (depois da correção) | 205 | 2 | **0** | 0 |

🟢 = coisas que o papel **deve** poder fazer (a Produção lança diário, cria pendências etc.; o pendente só muda o próprio nome e lê o próprio perfil).

O usuário comum foi testado nestas proibições, **todas 🔒**: apagar qualquer registro, aprovar ou alterar valor de medição, alterar valor de contrato ou preço de item, ler ou alterar o perfil de outras pessoas, mudar o **próprio** papel ou situação, se aprovar, se ligar a outra obra, abrir ou enviar arquivo de outra obra, chamar `rodar_virada` e criar um Coordenador pela função de admin (resposta 403). O pendente: não lê nenhuma tabela de dados e não consegue se aprovar.

O teste logado só mexeu numa **obra de teste** (`ZZAUD`) com dados falsos, para que uma porta aberta nunca atingisse dado real.

## O que estava aberto e foi corrigido

| Achado | Em uma frase | Correção |
|---|---|---|
| 🚨 `obra_membros` lida por conta **pendente** | A regra "cada um lê as próprias linhas" valia também para quem ainda não foi liberado (via só o próprio vínculo de obra, nenhum dado). | `supabase/migrations/20261005060000_pendente_nao_le_membros.sql` — a policy agora exclui o perfil Pendente. Confirmado nos dois papéis. |

Correções de segurança feitas **antes** da auditoria (revisão de código do mesmo dia): foto só abre se o arquivo é da mesma obra da linha; ninguém muda o próprio papel/situação; o autor de um registro não pode ser falsificado; a Produção não reescreve a linha de base do planejamento; o app não fica sem Coordenador ativo (gatilho com lock); pelo navegador só o próprio nome muda em `profiles` e ninguém grava em `obra_membros`.

## Nota de honestidade sobre o próprio teste

A primeira versão do script mostrou 16 "🚨" que eram **falsos alarmes**: o banco recusava o meu pedido de teste por outro motivo (coluna `id` não aceita valor escrito à mão) antes de checar a permissão. O script foi corrigido: agora só diz "porta fechada" quando o banco responde claramente "permissão negada", e usa ❓ para qualquer erro que não prove nada. Uma saída com ❓ não conta como aprovada.

## Advisors do Supabase (traduzidos)

| Aviso | O que significa | Situação |
|---|---|---|
| 4 views `SECURITY DEFINER` (`frentes_cliente`, `medicoes_cliente`, `apontamentos_sem_efetivo`, `perfis_colegas`) | Elas mostram a Clientes e à Engenharia só as colunas permitidas; cada view filtra por perfil e obra dentro dela. | **De propósito.** Confirmado pelo teste: o estranho não lê nenhuma delas. |
| `rodar_virada` e `virada_estado` chamáveis por quem está logado | Funções da virada diária. | **De propósito.** `rodar_virada` recusa quem não é Coordenador ("Só o Coordenador roda…") e `virada_estado` esconde o resultado de Cliente e Pendente. Testado: o comum foi recusado; o estranho nem chega a chamar. |
| Proteção contra senha vazada desligada | O Supabase não consulta a lista pública de senhas que já vazaram. | Recurso do **plano pago (Pro)**. Mitigação: senha mínima de 10 caracteres. |

## Observação sobre os dados de teste

Os usuários de teste e a obra `ZZAUD` foram **apagados do banco às 10:56 UTC por alguém com acesso direto** (a auditoria mostra ação sem usuário do app), antes de a minha limpeza acontecer. Conferido depois: **não sobrou nada de teste** (nenhum usuário, obra, catálogo, modelo ou arquivo `ZZ`). Isso não indica invasão; as tabelas de obras nem têm permissão de apagar pelo app.

## Nova rodada (05/10/2026, depois das migrations `modulos_por_usuario_e_autor` e `autor_nao_muda`)

| Intruso | 🔒 fechadas | 🟢 permitidas pelo papel | 🚨 abertas | ❓ inconclusivas |
|---|---|---|---|---|
| Estranho **sem login** | 106 | 0 | **0** | 0 |
| Usuário **comum (Produção)**, logado | 164 | 42 | **0** | 1 |
| Conta **pendente**, logada | 204 | 2 | **0** | 1 |

O ❓ de cada papel é o mesmo: `boletins_empreiteiro | INSERIR`. O gatilho do banco recusa antes ("só contrato Aprovado/Ativo recebe medição"), então o teste não chega a checar a permissão. É limite do dado de teste (o banco não deixa criar um contrato Ativo por atalho), não furo: a policy `boletins_empreiteiro_criar` só aceita Coordenador, Planejamento e Medição. A obra `ZZAUD`, as contas `zzaud-*` e todos os dados de teste foram **apagados em seguida** (conferido: 0 restos; as 3 obras reais e o Coordenador ativo intactos).

## Pendências

- Só dois papéis têm teste logado (Produção e Pendente). Cliente, Engenharia, Planejamento, Diretoria etc. ainda não: exigem ensinar o script o que cada um pode.
- Proteção contra senha vazada (plano Pro).
- O **teste logado** precisa de uma obra e usuários de teste descartáveis (o script lê `TESTE_PAPEL`, `TESTE_EMAIL`, `TESTE_SENHA` e `TESTE_CTX`, e o contexto de linhas de teste). O teste **sem login** roda sozinho: `node teste-do-estranho.mjs`.

## ⚠️ Lembrete

**Tabela nova no futuro = rodar esta auditoria de novo.** Toda tabela nova precisa de RLS ligada e de policies por papel e obra, e tem que entrar em `tests/schema-snapshot.json` (o script lê a lista de lá). Rode ao menos o teste do estranho (`node teste-do-estranho.mjs`) antes de publicar qualquer mudança no banco.
