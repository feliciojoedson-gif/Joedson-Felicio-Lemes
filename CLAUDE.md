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
- `src/lib/dados.js` — **única porta dos dados** (Supabase, via `src/lib/supabase.js`). Nenhuma tela chama o Supabase direto. `src/lib/mock.js` virou massa de teste de `tests/regras.mjs`: nenhuma tela o importa.
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

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, `src/App.jsx` (sessão), políticas RLS, migrations, Storage ou fluxo de dinheiro (medições) → rodar a revisão de código (`/code-review` no Claude Code, `/review` no Codex) antes de subir. É por caminho, não por julgamento: nesses arquivos o erro não aparece na tela.

## Deploy

No ar em **https://joedson-felicio-lemes.vercel.app** (Vercel, plano Hobby). Repositório: `feliciojoedson-gif/Joedson-Felicio-Lemes`, branch `main`; o nome é o que o projeto já tinha e foi mantido de propósito. Padrão: a pessoa diz "sobe pro GitHub", o agente sobe com git, e a Vercel publica sozinha. A pessoa não digita comando.
Variáveis no painel da Vercel: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (**não** é `ANON_KEY`; o roteiro genérico da skill usa outro nome). Não há conector nem CLI da Vercel nesta máquina: mudança no painel é clique da pessoa.
Cadastro público do Supabase fica **aberto** de propósito (conta nova nasce `Pendente` e o Coordenador libera). Fechar quebraria a liberação.

## Estado atual (fim da sessão de 04/10/2026)

**Pronto e testado pela pessoa no navegador:**
- Diário de obra: lista de frentes, formulário do dia gravando no banco, correção no mesmo dia, até 4 fotos por lançamento (comprimidas no navegador, enviadas ao bucket `fotos`), fotos já enviadas visíveis ao corrigir, foto que falha fica no formulário e "Salvar" tenta de novo.
- Detalhe da frente e tela Fotos mostram a imagem real (link assinado de 1 hora).
- Publicado na Vercel; login abre no link público. `npm run check` fecha em zero (75 testes).

**Pela metade:**
- **Envio automático ao GitHub → Vercel não foi testado.** O primeiro envio depois do deploy é o teste: conferir na aba Deployments da Vercel que um deployment novo apareceu sozinho.
- Etapa 10 da skill (varredura final no link público) **não foi feita**; só se conferiu que a tela de login abre e o JavaScript publicado tem a URL e a chave do Supabase. Login real no link público foi dito "funcionou" pela pessoa, sem varredura completa.
- Foto órfã: se o arquivo sobe e a linha em `fotos` falha, o arquivo fica no bucket (só o Coordenador apaga). Marcado com `ponytail:` em `dados.js`.
- `carregarBase` busca um link assinado por foto, todas de uma vez. Paginar se a obra passar de algumas centenas de fotos.
- Fotos do seed não têm arquivo: aparecem como ícone.
- "Mostrar ao cliente" (Detalhe da frente) e a foto mais recente do cartão da obra (Painel) ainda são só aviso/ícone.
- Coordenador não tem lista dos lançamentos do dia no Diário (o histórico fica no Detalhe da frente). O PRD é ambíguo; decidir.
- Os outros formulários ainda não gravam: frentes, medições, restrições, administração.

**Pendências de ambiente/segurança (não mexidas):**
- Pasta do projeto está dentro do OneDrive com `node_modules` e `.git`: risco de corromper o `.git`. Mover para fora (ex.: `C:\dev`).
- Banco tem a migration `restricao_resolvida_search_path` sem arquivo em `supabase/migrations/` (viola "migration é arquivo").
- Avisos do Supabase: 4 views `SECURITY DEFINER` (`frentes_cliente`, `medicoes_cliente`, `apontamentos_sem_efetivo`, `perfis_colegas`; provavelmente de propósito, confirmar), `rodar_virada` e `virada_estado` chamáveis por qualquer logado (confirmar que `rodar_virada` checa o perfil por dentro), proteção contra senha vazada desligada.
- Arquivos soltos na raiz que não são do app: imagem do WhatsApp, `oficina-ok.txt`, `preview.html`.
- 2FA da conta da Vercel não configurado. Plano grátis da Vercel tem restrição de uso comercial: conferir os termos antes de a equipe usar.

**Próximo passo:** fazer o formulário de **Frentes** gravar de verdade (criar, editar, apagar, pelo `dados.js`, com teste da regra em `lib/` e RLS já existente), porque o Painel só mostra o que existe e hoje as frentes vêm do seed. Faça a mudança, rode `npm run check`, suba pro GitHub e confira na Vercel que o deploy automático aconteceu (isso fecha a pendência acima). Se preferir outro módulo, a ordem sugerida do plano é Frentes → Restrições → Medições → Administração.

## Armadilhas desta base

- **Banco:** projeto Supabase `kaefer-rip` (`rbqzyxyneuqbeyvjdzom`, São Paulo). Chaves em `.env.local` (fora do git; modelo em `.env.example`). Migrations em `supabase/migrations/` e testes de RLS em `supabase/tests/*.sql` (cada um termina em erro `RELATORIO` de propósito, para não gravar nada).
- **Login é real** (email e senha). Conta nova nasce `Pendente`; o primeiro Coordenador é promovido à mão no banco, depois do cadastro. O **Diário grava de verdade** (lançamento e fotos, com os gatilhos do banco). Os demais formulários (frentes, medições, restrições, administração) **ainda não gravam** e mostram um aviso: não confunda isso com bug.
- Quem decide o que cada perfil lê é a **RLS**, não o `dados.js`. Mudou permissão: mude a policy, `regras.js` (menu e botões) e `supabase/tests/rls.sql` no mesmo lote.
- A virada diária roda no banco (`pg_cron`, 09h UTC = 06h de Brasília). Sem registro `ok` na `auditoria` depois das 7h, o Painel avisa.
- Data "hoje" = `hojeEmBrasilia()` (`regras.js`).
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
