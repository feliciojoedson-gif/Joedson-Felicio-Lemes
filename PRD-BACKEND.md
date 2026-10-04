# PRD Backend — Controle de Obras (nome provisório)

> Especificação dos dados e das permissões. Lido na etapa de criar o banco no Supabase.
> O SQL não está aqui: ele é escrito na hora de construir, a partir desta descrição.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.

## Convenções

- Tabelas no plural, em minúsculo, sem acento, com underline: `obra_membros`.
- Colunas em minúsculo com underline: `data_inicio`, `responsavel_id`.
- Toda tabela tem `id` e `created_at`.
- Chave estrangeira termina em `_id`.
- Campo de lista fechada vira CHECK, e o texto tem que ser **idêntico** ao usado na interface (com acento, como aparece na tela).
- Datas como `date` ou `timestamptz`. Dinheiro como `numeric(14,2)`.
- Foto e PDF vão para o Storage; o banco guarda só o link.

---

## Tabela `profiles`

Liga o login à pessoa e guarda o perfil dela. É ela que manda nas permissões.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| auth_uid | uuid | sim | vem do login, único |
| nome | text | sim | |
| email | text | sim | único |
| role | text | sim | CHECK: `Coordenador`, `Planejamento`, `Engenharia`, `Produção`, `Medição`, `Custos e Controle`, `Gestão Contratual`, `Cliente`, `Diretoria`, `Administrador`, `Pendente` |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

Criado automaticamente por um gatilho quando alguém se cadastra, já com o perfil `Pendente`.

---

## Tabela `obras`

Para que serve: cada contrato, separado dos demais.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| codigo | text | sim | sigla curta, única (ex.: `U12`); mostrada no seletor de obra |
| nome | text | sim | |
| endereco | text | não | |
| cliente | text | sim | |
| numero_contrato | text | não | |
| data_inicio | date | sim | |
| data_fim_contratual | date | sim | não pode ser anterior ao início |
| status | text | sim | CHECK: `Planejamento`, `Ativa`, `Suspensa`, `Encerrada`, `Arquivada` |
| responsavel_id | int8 | não | liga a `profiles` |
| created_at | timestamptz | sim | automático |

**Relações:** tem várias frentes e vários membros.
**Índices úteis:** `status`, `cliente`.

---

## Tabela `obra_membros`

Para que serve: diz quem enxerga qual obra. É o que impede de misturar obras e o que limita cliente e produção.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | sim | |
| profile_id | int8 | sim | o par obra + pessoa é único |
| created_at | timestamptz | sim | automático |

**Relações:** pertence a uma obra e a uma pessoa.
**Índices úteis:** `profile_id`, `obra_id`.
**Regra de negócio:** Coordenador e Diretoria enxergam todas as obras sem precisar estar nesta tabela.

---

## Tabela `frentes`

Para que serve: cada frente de serviço de uma obra, com o estado atual.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | sim | |
| nome | text | sim | |
| disciplina | text | sim | CHECK: `Civil`, `Mecânica`, `Tubulação`, `Elétrica`, `Instrumentação`, `Andaimes`, `Pintura`, `Outra` |
| local | text | não | |
| responsavel_id | int8 | não | liga a `profiles` |
| inicio_planejado | date | sim | |
| fim_planejado | date | sim | |
| fim_planejado_original | date | sim | copiado do fim planejado na criação; nunca muda |
| peso | numeric(8,2) | sim | padrão 1; maior que zero |
| eh_marco | boolean | sim | padrão falso |
| percentual_realizado | numeric(5,2) | sim | padrão 0; de 0 a 100 |
| ultimo_avanco_em | date | não | |
| dias_sem_avanco | int4 | sim | padrão 0 |
| status | text | sim | CHECK: `Não iniciada`, `Em andamento`, `Parada`, `Concluída` |
| saude | text | sim | CHECK: `Verde`, `Amarelo`, `Vermelho` |
| impacto_prazo_dias | int4 | não | |
| data_limite_decisao | date | não | |
| created_at | timestamptz | sim | automático |

**Relações:** pertence a uma obra; tem vários apontamentos, fotos, restrições e medições.
**Índices úteis:** `obra_id`, `status`, `dias_sem_avanco`, `disciplina`, `responsavel_id`.
**Regras de negócio:**
- O fim planejado não pode ser anterior ao início planejado.
- Para frente que é marco, o início e o fim planejado são iguais, e o percentual realizado não é usado.
- Só passa para `Concluída` pelo processo "Diário que fecha a frente".

---

## Tabela `apontamentos`

Para que serve: o diário de obra, um lançamento por frente por dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | sim | |
| frente_id | int8 | sim | |
| data | date | sim | a frente não pode ter dois lançamentos na mesma data |
| autor_id | int8 | sim | liga a `profiles` |
| percentual_acumulado | numeric(5,2) | sim | de 0 a 100; não pode ser menor que o último lançamento da frente |
| houve_avanco | boolean | sim | verdadeiro quando o acumulado subiu |
| motivo_sem_avanco | text | não | CHECK: `Chuva`, `Falta de material`, `Falta de liberação`, `Falta de efetivo`, `Interferência`, `Retrabalho`, `Outro`; obrigatório quando `houve_avanco` é falso |
| efetivo_qtd | int4 | sim | zero ou mais |
| equipamentos | text | não | |
| observacao | text | não | |
| created_at | timestamptz | sim | automático |

**Relações:** pertence a uma frente e a uma obra; tem várias fotos.
**Índices úteis:** `frente_id` + `data`, `obra_id` + `data`.
**Regra de negócio:** o `obra_id` do lançamento tem que ser o mesmo da frente.

---

## Tabela `fotos`

Para que serve: evidência fotográfica ligada à frente e ao dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | sim | |
| frente_id | int8 | sim | |
| apontamento_id | int8 | não | |
| url | text | sim | link do Storage |
| legenda | text | não | |
| visivel_cliente | boolean | sim | padrão falso |
| autor_id | int8 | sim | |
| tirada_em | timestamptz | sim | |
| created_at | timestamptz | sim | automático |

**Relações:** pertence a uma frente; opcionalmente a um lançamento do diário.
**Índices úteis:** `frente_id`, `obra_id` + `tirada_em`, `visivel_cliente`.

---

## Tabela `medicoes`

Para que serve: o que foi medido de cada frente em cada mês.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | sim | |
| frente_id | int8 | sim | |
| mes_referencia | date | sim | primeiro dia do mês |
| quantidade | numeric(14,2) | sim | |
| unidade | text | sim | |
| percentual_medido | numeric(5,2) | sim | de 0 a 100 |
| valor_medido | numeric(14,2) | sim | |
| status | text | sim | CHECK: `Rascunho`, `Enviada`, `Aprovada pela Gestão`, `Aprovada` |
| evidencia_url | text | não | link do Storage |
| observacao | text | não | |
| created_at | timestamptz | sim | automático |

**Relações:** pertence a uma frente e a uma obra.
**Índices úteis:** `obra_id` + `mes_referencia`, `frente_id`.
**Regra de negócio:** uma frente tem no máximo uma medição por mês de referência.

---

## Tabela `restricoes`

Para que serve: o que está travando ou ameaçando uma frente, incluindo RFI, risco e pleito potencial.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | sim | |
| frente_id | int8 | não | |
| tipo | text | sim | CHECK: `Restrição`, `RFI`, `Risco`, `Pleito potencial` |
| titulo | text | sim | |
| descricao | text | não | |
| criticidade | text | sim | CHECK: `Alta`, `Média`, `Baixa` |
| status | text | sim | CHECK: `Aberta`, `Em tratamento`, `Resolvida` |
| responsavel_id | int8 | não | |
| autor_id | int8 | sim | quem registrou |
| data_limite | date | não | |
| impacto_prazo_dias | int4 | não | |
| resolvida_em | date | não | preenchida quando o status vira `Resolvida` |
| created_at | timestamptz | sim | automático |

**Relações:** pertence a uma obra; opcionalmente a uma frente.
**Índices úteis:** `obra_id`, `status`, `criticidade`, `tipo`.

---

## Tabela `auditoria`

Para que serve: trilha de quem alterou o quê e quando. Preenchida só por gatilho; ninguém grava, edita nem apaga à mão.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | não | vazio só para mudanças em `profiles` |
| tabela | text | sim | nome da tabela alterada |
| registro_id | int8 | sim | |
| acao | text | sim | CHECK: `Criou`, `Alterou`, `Apagou` |
| usuario_id | int8 | não | liga a `profiles`; vazio nos processos automáticos |
| perfil | text | não | perfil da pessoa no momento |
| campo | text | não | vazio em `Criou` e `Apagou` |
| valor_anterior | text | não | |
| valor_novo | text | não | |
| justificativa | text | não | |
| created_at | timestamptz | sim | automático (data e hora) |

**Gatilhos em:** `obras`, `obra_membros`, `frentes`, `medicoes`, `restricoes`, `profiles` (uma linha por campo alterado). Não audita `apontamentos` e `fotos` na v1: já carregam autor e data.
**Índices úteis:** `obra_id` + `created_at`, `tabela` + `registro_id`.

---

## Permissões

Escrito em português. Vira RLS na hora de construir. Decisões do dono (04/10/2026): **10 perfis desde a v1**; **Cliente não vê valor de medição**; **só o Coordenador apaga** (o perfil `Coordenador` é o mesmo de Gerente de Contrato e Gerente de Filial); **o Coordenador (Gerente de Contrato, Gerente de Filial) cria obras, libera contas, troca perfis e vincula pessoas**; o `Administrador` só lê tudo, para suporte, e não grava nada. Medição **não** aprova a própria medição. A trilha de auditoria entra já na primeira migration.

Regra geral: quem não está em `obra_membros` de uma obra não vê nada dela, exceto `Coordenador`, `Diretoria` e `Administrador`, que veem todas. Perfil `Pendente` e perfil inativo não veem nada.

Perfis: `Coordenador`, `Planejamento`, `Engenharia`, `Produção`, `Medição`, `Custos e Controle`, `Gestão Contratual`, `Cliente`, `Diretoria`, `Administrador`.

Os módulos de Custos, EAC, Curva S, SPI, CPI, EAP, pleitos completos e correspondências **não têm tabela na v1**: EAC, Curva S, SPI e CPI são calculados a partir das tabelas existentes (camada analítica). Os perfis `Custos e Controle` e `Gestão Contratual` existem desde já, mas só enxergam o que está nas 8 tabelas abaixo.

### `profiles`
- **Ver:** cada pessoa vê o próprio registro; Coordenador e Administrador veem todos; os demais perfis veem nome e perfil das pessoas das suas obras (Cliente não vê pessoas internas).
- **Criar:** automático, no cadastro, com perfil `Pendente`.
- **Editar:** só o Coordenador troca perfil e ativo; cada pessoa edita só o próprio nome.
- **Apagar:** ninguém. Pessoa que sai é desativada.
- O primeiro Coordenador é promovido à mão no banco, depois que a pessoa se cadastrar (`UPDATE` único, fora do git; nenhum email pessoal entra em migration).

### `obras`
- **Ver:** Coordenador, Diretoria e Administrador todas; os demais só as obras em que são membros.
- **Criar e editar:** só o Coordenador.
- **Apagar:** ninguém. A obra encerra mudando o status (`Suspensa`, `Encerrada`, `Arquivada`).

### `obra_membros`
- **Ver:** Coordenador, Diretoria e Administrador todos; os demais veem só as próprias linhas.
- **Criar, editar, apagar:** só o Coordenador.

### `frentes`
- **Ver:** Coordenador, Diretoria e Administrador todas; Planejamento, Engenharia, Produção, Medição, Custos e Controle e Gestão Contratual as das suas obras; Cliente as das suas obras, mas só nome, local, disciplina, datas planejadas, percentual realizado e se é marco.
- **Criar e editar:** Coordenador e Planejamento (nome, datas, peso, responsável, marco, impacto e data de decisão). `percentual_realizado`, `ultimo_avanco_em`, `dias_sem_avanco`, `status` e `saude` só mudam pelos processos automáticos.
- **Apagar:** só o Coordenador.

### `apontamentos`
- **Ver:** Coordenador, Diretoria e Administrador todos; Planejamento, Medição e Custos e Controle os das suas obras; Produção só os que ela lançou; Engenharia sem o campo de efetivo; Cliente e Gestão Contratual não veem.
- **Criar:** Coordenador e Produção (nas frentes das suas obras).
- **Editar:** o autor, no mesmo dia; Coordenador sempre.
- **Apagar:** só o Coordenador.

### `fotos`
- **Ver:** todos os perfis internos, nas suas obras (Custos e Controle não); Cliente só as com `visivel_cliente` verdadeiro.
- **Criar:** Coordenador e Produção.
- **Editar:** só o Coordenador (legenda e `visivel_cliente`).
- **Apagar:** só o Coordenador.

### `medicoes`
- **Ver tudo, com valor:** Coordenador, Diretoria, Administrador, e (nas suas obras) Planejamento, Medição, Custos e Controle e Gestão Contratual.
- **Cliente:** só medições `Aprovada` (final), **sem** `valor_medido` (vai por view). Engenharia e Produção não têm acesso.
- **Criar e editar:** Coordenador e Medição, até o status `Enviada`.
- **Aprovação em duas etapas, na ordem:** Medição cria e envia (`Rascunho` → `Enviada`); a **Gestão Contratual** aprova (`Aprovada pela Gestão`); o **Coordenador** dá a aprovação final (`Aprovada`). Ninguém pula etapa e a Medição não aprova a própria; quem aprova só muda o status e a observação. A regra mora num gatilho do banco (`medicoes_protege`). As etapas antes da Medição (Produção → Coordenador Operacional → Engenharia → Planejamento) ficam na v2: não são status.
- **Apagar:** só o Coordenador.

### `restricoes`
- **Ver:** Coordenador, Diretoria, Administrador e Gestão Contratual todos os tipos; Planejamento, Engenharia e Produção os tipos `Restrição` e `RFI`, nas suas obras; Medição, Custos e Controle e Cliente nenhum.
- **Criar:** Coordenador qualquer tipo; Gestão Contratual `Risco` e `Pleito potencial`; Planejamento, Engenharia e Produção só `Restrição` e `RFI`.
- **Editar:** Coordenador todas; Gestão Contratual `Risco` e `Pleito potencial`; Engenharia `Restrição` e `RFI`; Produção e Planejamento só as que criaram.
- **Apagar:** só o Coordenador.

### Administrador, em geral
- Lê todas as tabelas, inclusive `auditoria`. **Não grava** em nenhuma.

### `auditoria`
- **Ver:** Coordenador, Diretoria e Administrador todas; Gestão Contratual as das suas obras. Os demais não veem.
- **Criar:** só por gatilho do banco, em `medicoes`, `restricoes`, `frentes`, `obras`, `obra_membros` e `profiles`. Ninguém insere, edita nem apaga à mão.
- Campos e gatilhos estão na seção da tabela `auditoria`, acima das permissões.

### Storage (fotos e evidências)
- Quem pode ler o arquivo é quem pode ler a linha que aponta para ele. Foto de obra que a pessoa não vê não pode abrir pelo link direto.

---

## Fluxo de cadastro e liberação

1. A pessoa se cadastra sozinha com email e senha.
2. O sistema cria o registro em `profiles` com perfil `Pendente`.
3. Ela entra e vê só o aviso "Conta aguardando liberação do administrador".
4. O Coordenador abre Administração, vê a conta com o selo "Aguardando liberação", escolhe o perfil e liga a pessoa às obras em `obra_membros`.
5. No próximo acesso, a pessoa vê o sistema com as permissões do perfil.

## Processos automáticos

### Virada diária das frentes
- **Gatilho:** todo dia às 06h00.
- **Passos:** 1. Para cada frente `Em andamento`, calcular os dias corridos desde `ultimo_avanco_em` e gravar em `dias_sem_avanco`. 2. Passar para `Parada` as que têm 3 dias ou mais. 3. Recalcular `saude`: `Vermelho` se desvio de -10 pontos ou pior, ou `Parada`; `Amarelo` se desvio entre -5 e -10, ou 1 a 2 dias sem avanço, ou `Não iniciada` com planejado maior que zero; senão `Verde`. O planejado de hoje é a reta entre início e fim planejados.
- **Resultado:** o Painel de manhã mostra os números do dia.
- **Registro:** cada execução grava uma linha em `auditoria` (`tabela` = `virada_diaria`, resultado `ok` ou `falhou`). Às 06h30 uma conferência grava `nao_executou` se não houve `ok` no dia.
- **Se falhar:** grava o erro e a hora; o Painel mostra "A atualização das frentes de hoje não rodou. Os números são de ontem." O Coordenador consegue pedir para rodar de novo, e não há outro aviso por fora do sistema na v1.

### Diário que fecha a frente
- **Gatilho:** inserção de um lançamento em `apontamentos`.
- **Passos:** 1. Gravar o `percentual_acumulado` como `percentual_realizado` da frente. 2. Se o acumulado subiu: `houve_avanco` verdadeiro, `ultimo_avanco_em` recebe a data do lançamento, `dias_sem_avanco` volta a zero e, se a frente estava `Parada` ou `Não iniciada`, passa a `Em andamento`. 3. Se o acumulado chegou a 100: status `Concluída`.
- **Resultado:** a frente muda na hora; a que ficou `Concluída` sem medição entra na lista "A medir" do Coordenador.
- **Se falhar:** o lançamento inteiro não é gravado e o mestre vê "Não consegui salvar. Tente de novo." Nada fica pela metade.

## Arquivos

- Guardados no Storage, em dois buckets privados: `fotos` (até 5 MB, JPEG/PNG/WebP) e `evidencias` (até 10 MB, imagem ou PDF). Caminho: `<obra_id>/<frente_id>/<arquivo>`; o banco guarda esse caminho e a tela abre por link assinado.
- Imagem comprimida no navegador antes de subir (máx. 1200px, qualidade 0.8).
- O banco guarda `url` e, nas fotos, a obra e a frente a que pertencem.

## Critérios de aceite

- [ ] Usuário recém-cadastrado não enxerga nenhum dado até ser liberado.
- [ ] Produção não consegue apagar nada, nem o que é dele, e não lê nenhuma linha de `medicoes`.
- [ ] Cliente lê só frentes das obras em que é membro, e só os campos permitidos.
- [ ] Cliente não lê `apontamentos` nem `restricoes`, e só lê fotos com `visivel_cliente` verdadeiro.
- [ ] Engenharia não lê `medicoes`; Planejamento lê, sem gravar.
- [ ] Planejamento não cria nem edita `apontamentos`, `fotos` e `medicoes`.
- [ ] Diretoria lê tudo e não grava nada.
- [ ] Pessoa de uma obra não lê dado de outra obra.
- [ ] O Coordenador troca o perfil de qualquer usuário; o Administrador não grava nada.
- [ ] Toda alteração em medição, restrição, frente, obra, vínculo e perfil gera linha em `auditoria`, e ninguém edita nem apaga essas linhas.
- [ ] A medição só anda na ordem Rascunho → Enviada → Aprovada pela Gestão → Aprovada, cada passo pelo perfil certo.
- [ ] Cliente não lê `valor_medido`; só vê medições `Aprovada`.
- [ ] Só o Coordenador apaga.
- [ ] Os valores de status, disciplina, tipo e motivo do banco são idênticos aos da interface.
- [ ] Todo campo obrigatório recusa cadastro vazio.
- [ ] Dois lançamentos da mesma frente na mesma data são recusados.
- [ ] Um lançamento sem avanço e sem motivo é recusado.
- [ ] Uma frente chega a 100% e vira `Concluída` e aparece em "A medir".

## A conta que vai chegar depois

- `[PENDENTE: valor total do contrato por obra]` — custo: sem ele não existe percentual medido contra o contrato; seria uma tabela nova de contratos na v2.
- `[PENDENTE: aviso por WhatsApp ou email quando a virada diária falhar]` — custo: na v1 o aviso só aparece dentro do Painel.
- `[PENDENTE: armazenamento de fotos]` — custo: o plano grátis do Supabase tem limite; várias obras com fotos diárias podem passar dele.

## Decidir depois de usar

- `[DESCOBRIR NO USO: a regra de 3 dias para Parada]` — por enquanto: 3 dias corridos.
- `[DESCOBRIR NO USO: planejado em reta entre início e fim]` — por enquanto: reta.
- `[DESCOBRIR NO USO: edição do próprio lançamento só no mesmo dia]` — por enquanto: mesmo dia.
