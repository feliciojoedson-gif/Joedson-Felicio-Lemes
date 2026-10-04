# Kaefer Rip

Acompanhamento de obras industriais: lista única de frentes ordenada pelo que está parado há mais tempo. Usado pelo coordenador, planejamento, engenharia, produção (diário no celular), cliente e diretoria.
React 19 + Vite, Supabase e Vercel, sem outras bibliotecas. Uma shell só (`src/pages/Shell.jsx`); o menu de cada perfil mora em `src/lib/regras.js` (`MENUS`).
Fonte das decisões: `PLANO-DO-PROJETO.md`, `PRD-FRONTEND.md`, `PRD-BACKEND.md`. Quando mudar de ideia, mude lá primeiro.

## Este app é MULTI-OBRA (vale para todo módulo novo)

A pessoa não toca uma obra só. **Nenhuma tela mostra dado de duas obras juntas**, a menos que seja explicitamente um comparativo entre obras.

- **Toda tabela de lançamento tem `obra_id` obrigatório**, apontando para `obras`. Hoje: `frentes`, `apontamentos`, `fotos`, `medicoes`, `restricoes`. Tabela nova de módulo novo nasce com `obra_id`.
- **Todo módulo novo filtra por `obra_id`.** O filtro mora em `src/lib/dados.js` (`carregarBase` já devolve só a obra atual); a tela nunca recebe nem filtra dado de outra obra.
- O **seletor de obra fica sempre visível no topo** (`Shell.jsx`). Trocar de obra recarrega tudo (`trocarObra` em `DadosContext.jsx`) e remonta a tela. A obra escolhida fica no `localStorage` (uma por pessoa).
- Exceção deliberada: **Administração** lista todas as obras e pessoas, porque é cadastro, não lançamento.
- Na RLS (etapa do banco), a política de cada tabela é por obra via `obra_membros`; `auth.role() = 'authenticated'` aqui é uma obra lendo a outra.

## Onde o código novo vai

Uma pergunta decide: **"isto continuaria verdade se a tela fosse outra?"**

- **Sim → `src/lib/*.js`.** Regra pura (semáforo, planejado, permissões, ordenação). Sem React, sem banco, sem `window`. Roda no Node sem bundler (import com `.js` explícito). É a única camada com teste.
- **Não → `src/screens/*.jsx`.** Layout e estado de interface. A tela **pede a decisão à lib**; não decide.
- `src/lib/dados.js` — **única porta dos dados.** Hoje lê `src/lib/mock.js`; depois o Supabase. Nenhuma tela chama o mock nem o Supabase direto.
- `if` de negócio dentro de tela vai para `lib`, mesmo com três linhas. Constante compartilhada (status, perfis, disciplinas, motivos) tem um dono só: `regras.js`.
- O vocabulário de `regras.js` tem que ser **idêntico** ao CHECK do banco (com acento).

## Régua de verificação

```bash
npm run check
```

Build + lint + testes. **Fecha em zero** — não há linha de base herdada. Aviso novo é seu e é de agora; conserte no mesmo lote.
Nada disso prova que a tela funciona: verde com a tela em branco é rotina. Olhe a tela.
**Todo bug corrigido em `src/lib/` nasce com teste junto** (`tests/*.mjs`), no mesmo lote.

## Antes de subir pro GitHub

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, políticas RLS, migrations ou fluxo de dinheiro (medições) → rodar a revisão de código (`/code-review` no Claude Code, `/review` no Codex) antes de subir. É por caminho, não por julgamento: nesses arquivos o erro não aparece na tela.

## Deploy

Ainda não há. Padrão: a pessoa diz "sobe pro GitHub", o agente sobe com git, e a Vercel publica sozinha. A pessoa não digita comando.

## Armadilhas desta base

- **Hoje não há banco.** O login da `Login.jsx` é um seletor de perfis de teste, e salvar não grava nada (formulários mostram um aviso). Não confunda isso com bug.
- A data "hoje" do mock é fixa (`HOJE` em `mock.js`, 04/10/2026) para os exemplos baterem com o PRD. Troque por `new Date()` na virada para o banco.
- "A medir" = frente `Concluída` sem medição `Enviada`/`Aprovada` (um `Rascunho` não conta como medida).
- Semáforo da obra usa os mesmos limites da frente aplicados ao desvio da obra (-5 e -10); o plano não definia isso.
- O Cliente recebe frentes **sem** responsável, dias sem avanço, impacto nem data de decisão: o recorte está em `dados.js` (no banco, será a RLS/view).

## Higiene de código (vale para toda mudança)

Cada função morta é uma mentira que o próximo leitor precisa desmascarar.

- **Ao remover um recurso, cace a cadeia inteira no mesmo lote:** a função em `lib/dados.js` → a exposição no contexto → os chamadores nas telas → a query.
- **Zero avisos novos de lint.**
- **Código comentado não é backup, o git é.** Comentário explica *por quê*.
- **Antes de apagar, prove que está morto:** grep pelo símbolo no projeto inteiro, e verifique quem chama o *wrapper*, não só a função.
- **Estado que nunca muda ou nunca é lido é lixo.**
- **Limpeza NUNCA toca no banco nem em arquivo de dado.** Tabela ou coluna órfã continua existindo até decisão de quem é dono. Na dúvida, pergunte.
