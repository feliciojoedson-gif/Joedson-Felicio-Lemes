# Plano do Projeto — Controle de Obras (nome provisório)

> Fonte da verdade deste projeto. Quando mudar de ideia, mude aqui primeiro.
> Última atualização: 04/10/2026
> Rascunho proposto a partir do briefing do coordenador. O que foi chutado pela IA está marcado como **[PROPOSTA]** e precisa de correção. O que depende de fato que só o coordenador sabe está em **[PENDENTE]**.

## Em uma frase

Um sistema de **acompanhamento de obras industriais** que resolve **a consolidação manual de sexta e segunda, e a descoberta tardia de frentes paradas**, para **o coordenador de contratos (e a equipe de planejamento, engenharia, produção, cliente e diretoria)**, fazendo **uma lista única das frentes ordenada pelo que está parado há mais tempo, alimentada pelo diário de obra digital do campo**.

---

# 1. Visão Estratégica

## Os problemas

### Problema 1 — Consolidação manual de sexta e segunda
- **Como acontece hoje:** o coordenador junta informação de WhatsApp (supervisores e líderes), planilhas Excel, relatórios em PDF, cronogramas, fotos de campo e apontamentos de produção, e monta o quadro na mão.
- **Frequência:** toda segunda e toda sexta, de 08h às 11h e de 15h às 18h.
- **Custo:** cerca de 6 horas por dia nesses dois dias, ou seja, **até 12 horas por semana** (conta feita pela IA a partir dos horários informados) `[PENDENTE: confirmar se é o tempo real gasto, não só a janela reservada]`. Meta declarada: reduzir mais de 80%, ou seja, ficar abaixo de 2,5 horas por semana.
- **Último caso:** `[PENDENTE: um exemplo concreto recente, com obra e frente, de algo que só apareceu no consolidado]`

### Problema 2 — Descobrir tarde que uma frente parou
- **Como acontece hoje:** o desvio só aparece no indicador depois de dias ou semanas. Mesmo depois da consolidação, na segunda ainda não se sabe avanço físico real, produtividade da semana, pendências críticas, medição executada e impacto no contrato.
- **Frequência:** toda semana, em várias obras ao mesmo tempo.
- **Custo:** prazo e risco contratual. `[PENDENTE: número ou caso, por exemplo "a última frente parada ficou X dias sem ninguém perceber, e custou Y"]`
- **Último caso:** `[PENDENTE]`

### Problema 3 — Evidência e medição espalhadas
- **Como acontece hoje:** fotos soltas no WhatsApp, PDFs em várias pastas, medição em planilha com conferência manual por disciplina, evidências sem rastreabilidade para pleito.
- **Frequência:** a cada ciclo de medição.
- **Custo:** `[PENDENTE: horas por medição]`
- **Último caso:** `[PENDENTE]`

## A solução

Cada obra tem suas frentes de serviço. O mestre ou supervisor lança o diário do dia no celular: avanço da frente, efetivo, equipamentos, foto e, quando não houve avanço, o motivo. O sistema calcula sozinho há quantos dias cada frente não anda, compara o avanço real com o planejado e pinta a frente de verde, amarelo ou vermelho. O coordenador abre uma única tela de manhã e vê, em ordem, o que está parado, há quanto tempo, quem responde por aquilo e qual impacto está registrado no prazo. Cliente e diretoria enxergam apenas o que o perfil deles permite.

**O que ele NÃO faz (v1):**
- Orçamento, composição de preço e custos (orçado × realizado, EAC, fluxo de caixa). Esse bloco inteiro vai para a v2.
- Visualizador 3D, importação de DWG e simulação construtiva.
- Gestão de andaimes por TAG, localização em planta e medição automática de andaimes. Na v1, andaime é só mais uma disciplina de frente.
- Curva S, linha de balanço, caminho crítico e lookahead. Na v1 o planejado vem de datas de início e fim da frente.
- Importar o cronograma do MS Project ou do Excel. Na v1 as frentes são cadastradas dentro do sistema.
- Ler mensagens do WhatsApp. O diário é lançado direto no sistema.
- Relatório em PDF e atualização do Power BI.
- Aplicativo nativo de celular. O sistema é uma página que abre no navegador do celular.

> Pergunta para você: algum desses você faz questão de ter já na primeira versão?

## Funcionalidades

### Painel (a tela que o coordenador abre todo dia)
- **Abre em:** lista única de frentes, com um resumo por obra no topo.
- **Mostra:** no topo, faixa de alertas com quatro contagens: frentes paradas há 3 dias ou mais, restrições críticas abertas, frentes concluídas ainda não medidas, frentes sem diário hoje. Depois, um cartão por obra com semáforo, avanço real, avanço planejado, desvio em pontos percentuais, medição acumulada (só coordenador e diretoria), próximo marco e a foto mais recente. Embaixo, a lista de frentes com: obra, frente, disciplina, responsável, status, dias sem avanço, desvio, impacto no prazo em dias e data limite de decisão.
- **Ordem e filtro:** a lista vem por dias sem avanço, do maior para o menor, e depois por desvio. Filtros: obra (ou "Todas as obras"), cliente, disciplina, responsável e período do último avanço.
- **Ações:** filtrar, clicar numa faixa de alerta para filtrar a lista por ela, abrir uma frente.
- **Ao clicar num item:** abre o Detalhe da frente.
- **Vazio:** "Nenhuma frente cadastrada nesta obra. Cadastre a primeira em Frentes."
- **Nasce e morre:** é calculado; não se cria nem se apaga.
- **Gráfico (um só na v1):** barras de avanço planejado × real por obra. Responde: "qual obra está mais longe do plano?"

### Frentes
- **Abre em:** lista de frentes da obra escolhida.
- **Mostra:** nome, disciplina, local, responsável, datas planejadas de início e fim, avanço real, avanço planejado de hoje, status, saúde, dias sem avanço, impacto no prazo, data limite de decisão e peso.
- **Ordem e filtro:** igual ao Painel; filtro adicional por status.
- **Ações:** coordenador e planejamento criam e editam; só o coordenador apaga. Marcar uma frente como marco.
- **Ao clicar num item:** abre o Detalhe da frente, com histórico do diário, fotos, restrições ligadas e medições (medições só para coordenador e diretoria).
- **Vazio:** "Nenhuma frente nesta obra ainda."
- **Nasce e morre:** nasce por cadastro do coordenador ou do planejamento; morre apagada (só coordenador) ou ao ficar Concluída.

### Diário de obra
- **Abre em:** formulário do dia para o mestre, com a lista das frentes dele e o que falta lançar hoje.
- **Mostra:** frente, data, avanço acumulado, efetivo, equipamentos, houve avanço, motivo se não houve, observação e fotos.
- **Ordem e filtro:** frentes sem lançamento hoje primeiro.
- **Ações:** lançar, editar o próprio lançamento no mesmo dia, anexar foto.
- **Ao clicar num item:** abre o lançamento.
- **Vazio:** "Nada lançado hoje. Toque em uma frente para lançar."
- **Nasce e morre:** nasce no lançamento do mestre; só o coordenador apaga.

### Medições
- **Abre em:** duas listas: "A medir" (frentes concluídas ou com avanço ainda não medido) e "Histórico de medições".
- **Mostra:** obra, frente, mês de referência, quantidade, unidade, percentual medido, valor medido, status e evidência.
- **Ordem e filtro:** "A medir" por data de conclusão mais antiga; filtros por obra, disciplina, mês e status.
- **Ações:** criar e editar medição, anexar evidência, enviar, aprovar. Só coordenador cria e edita; diretoria só lê.
- **Ao clicar num item:** abre o detalhe da medição com a evidência.
- **Vazio:** "Nenhuma frente a medir agora."
- **Nasce e morre:** nasce do botão Medir em uma frente; morre apagada pelo coordenador.

### Restrições
- **Abre em:** lista de restrições, RFIs, riscos e pleitos potenciais abertos.
- **Mostra:** obra, frente, tipo, título, criticidade, status, responsável, data limite, impacto no prazo em dias.
- **Ordem e filtro:** criticidade e depois data limite; filtros por obra, tipo, status e responsável.
- **Ações:** criar, editar, resolver. Engenharia cria e edita restrição e RFI; coordenador cria e edita tudo, inclusive Risco e Pleito potencial.
- **Ao clicar num item:** abre o detalhe com descrição e histórico.
- **Vazio:** "Nenhuma restrição aberta. Bom sinal."
- **Nasce e morre:** nasce quando alguém registra; fica Resolvida, e só o coordenador apaga.

### Fotos
- **Abre em:** grade de fotos recentes da obra, em linha do tempo.
- **Mostra:** foto, data, frente, autor e legenda.
- **Ordem e filtro:** da mais recente para a mais antiga; filtros por frente e período.
- **Ações:** produção envia pelo diário; coordenador marca quais fotos o cliente pode ver.
- **Ao clicar num item:** abre a foto grande.
- **Vazio:** "Nenhuma foto ainda."
- **Nasce e morre:** nasce no diário; só o coordenador apaga.

### Administração (obras e usuários)
- **Abre em:** duas abas, Obras e Usuários.
- **Mostra:** obras com cliente, número do contrato, datas, responsável e status; usuários com perfil, obras em que atuam e ativo/inativo.
- **Ações:** cadastrar obra, vincular pessoas a obras, liberar conta nova e escolher o perfil. Só coordenador.
- **Vazio:** "Nenhuma obra cadastrada. Cadastre a primeira para começar."

## Como o sistema calcula (propostas para você corrigir)

- **Avanço planejado de hoje de uma frente:** reta entre a data de início e a data de fim planejadas. Antes do início é 0%; depois do fim é 100%.
- **Avanço da obra:** média dos avanços das frentes, ponderada pelo peso de cada frente. Marcos não entram na conta.
- **Desvio:** avanço real menos planejado, em pontos percentuais. Negativo é atraso.
- **Dias sem avanço:** dias corridos desde o último lançamento do diário com avanço.
- **Frente Parada:** em andamento e sem avanço há 3 dias ou mais.
- **Semáforo da frente:** Verde com desvio acima de -5 pontos. Amarelo com desvio de -5 a -10, ou 1 a 2 dias sem avanço, ou não iniciada com planejado maior que zero. Vermelho com desvio de -10 ou pior, ou Parada. `[DESCOBRIR NO USO: os limites de 3 dias, -5 e -10]`
- **Impacto no prazo (dias):** digitado por planejamento ou coordenador na frente. O cálculo automático depende de caminho crítico e fica na v2. `[DESCOBRIR NO USO]`

## Perfis de usuário

- **Coordenador de Contrato:** acompanha todas as obras, decide e mede · primeira tela: Painel.
- **Planejamento:** mantém datas, pesos, responsáveis e marcos das frentes · primeira tela: Painel.
- **Engenharia:** registra restrições e RFIs, consulta frentes · primeira tela: Restrições.
- **Produção:** mestre ou supervisor que lança o diário no canteiro · primeira tela: Diário.
- **Cliente:** acompanha avanço e fotos autorizadas · primeira tela: Painel (versão do cliente).
- **Diretoria:** lê a carteira, os desvios, as medições e os riscos, sem editar · primeira tela: Painel.

### Matriz de permissões **[PROPOSTA — pedir confirmação linha a linha nas que mexem com dinheiro e dado de terceiro]**

| Ação | Coordenador | Planejamento | Engenharia | Produção | Cliente | Diretoria |
|---|---|---|---|---|---|---|
| Ver obras e frentes das obras a que está ligado | sim, todas | sim | sim | sim | só avanço e datas aprovadas | sim, todas |
| Ver valores de medição | sim | não | não | não | não | sim |
| Ver restrições, riscos e pleitos | sim | só restrições e RFIs | só restrições e RFIs | só restrições e RFIs | não | sim |
| Ver efetivo e produtividade interna | sim | sim | não | só o que lançou | não | sim |
| Ver fotos | todas | todas | todas | todas | só as marcadas para o cliente | todas |
| Lançar diário | sim | não | não | sim | não | não |
| Editar frentes (datas, peso, responsável) | sim | sim | não | não | não | não |
| Criar restrição | sim | sim | sim | sim | não | não |
| Criar medição | sim | não | não | não | não | não |
| Apagar qualquer registro | sim | não | não | não | não | não |
| Gerenciar usuários e obras | sim | não | não | não | não | não |

Padrão por trás: quem cria edita o que é seu, e só o coordenador apaga.

**Leitura em voz alta para confirmar:**
1. Pelo que escrevi, **produção não enxerga nenhum valor de medição**. Confirma?
2. **Cliente nunca vê restrição, risco ou pleito**, nem efetivo. Confirma?
3. **Planejamento não vê valor de medição.** Confirma?
4. **Diretoria vê tudo, incluindo valor medido, mas não edita.** Confirma?
5. **Produção vê restrições do tipo Restrição e RFI**, mas não Risco nem Pleito potencial. Confirma?
6. Quem dessa tabela você não confiaria para apagar um registro? (Hoje só o coordenador apaga.)

## Fluxo de cadastro

1. A pessoa se cadastra sozinha com email e senha.
2. Entra sem perfil e não vê dado nenhum.
3. Vê o aviso "Conta aguardando liberação do administrador".
4. O coordenador libera, escolhe o perfil e liga a pessoa às obras em que ela atua.

Cliente só aparece depois de ligado a uma obra: sem essa ligação, não vê nada.

## Ferramentas e custo

| Peça | Para que serve | Custo |
|---|---|---|
| Claude | construir o sistema | a assinatura que você já tem |
| React + Vite | a interface | grátis |
| Supabase | banco, login e arquivos (fotos) | grátis até crescer |
| Vercel | colocar no ar | grátis no início; ver aviso abaixo |
| GitHub | guardar o código | grátis |

**Total por mês:** R$ 0 no início, fora a assinatura do Claude.
**Avisos de custo futuro:** (1) as fotos de várias obras vão encher o armazenamento do plano grátis do Supabase; (2) o plano grátis da Vercel tem restrição de uso comercial, e este sistema é de uma empresa. `[PENDENTE: conferir os termos atuais de cada plano antes de colocar em uso real]`
**O que custaria a alternativa pronta:** pesquisado hoje (04/10/2026), ver Etapa 2: a partir de R$ 269 por mês no Mais Controle, fora R$ 60 por mês em cada um dos dois módulos opcionais (Medição de Contratos e Diário de Obras). Isso soma R$ 389 por mês com os dois módulos, ou R$ 4.668 por ano, para quem quer o conjunto. `[PENDENTE: quanto você paga ou pagaria hoje por algo pronto]`

## Prazo

- **Quer usar de verdade em:** `[PENDENTE]`
- **Horas por semana disponíveis:** `[PENDENTE]`

> Este plano tem 9 telas, 8 tabelas e 2 processos. Passa dos tetos da v1 (6 telas e 7 tabelas). Ver "Cortes possíveis" no fim da Etapa 3.

---

# 2. Insights do Mercado

> Busca feita em 04/10/2026. Preços são os que apareceram nos resultados da busca; confirme no site antes de decidir. Não abri cada site para ler os detalhes dos planos.

## Benchmark

### Mais Controle
- Site: https://maiscontroleerp.com.br/planos/ · Preço: a partir de R$ 269 por mês; módulos opcionais de Medição de Contratos e de Diário de Obras, R$ 60 por mês cada.
- Faz bem: gestão de várias obras, com medição e diário de obra (web e aplicativo) como opcionais.
- Falta: `[PENDENTE: não verificado]`
- Vale copiar: diário e medição como módulos separados.

### VIGHA
- Site: https://www.vighapp.com/planoseprecos/ · Preço: planos a partir de R$ 96 por mês. O plano Enterprise inclui diário de obra (RDO), medição física, relatório fotográfico e área do cliente.
- Faz bem: cobre diário, medição física, fotos e área do cliente no mesmo plano.
- Falta: `[PENDENTE: não verificado, inclusive o preço do plano Enterprise]`
- Vale copiar: a área do cliente com fotos e avanço.

### Procore
- Site: https://www.procore.com/ · Preço: a partir de cerca de US$ 375 por mês, com contrato anual por cotação ligada ao volume de obra, segundo comparativos que apareceram na busca.
- Faz bem: diário, fotos, desenhos, RFIs, cronograma e pendências, para construtoras grandes.
- Falta: `[PENDENTE: não verificado]`
- Vale copiar: RFI e pendência ligados a desenho e a frente.

## Por que ainda vale construir o meu

**[PROPOSTA — escreva com suas palavras]** Sabendo que essas três existem, ainda vale construir o seu porque a tela do dia a dia que você descreveu (lista única de frentes ordenada por dias parados, com impacto no prazo e prazo de decisão) é a razão de existir do sistema, e porque você quer controlar seus próprios dados e perfis (cliente, produção, diretoria) sem mensalidade por obra. `[PENDENTE: você já tentou algum programa pronto? Qual, e por que não deu certo? Era caro, engessado, ninguém da equipe adotou ou travava sem sinal?]`

Se nada disso se sustentar na sua resposta, a conclusão honesta é que ferramenta pronta resolve a maior parte e custa na faixa de R$ 4 mil por ano. Você decide sabendo disso.

## Referências de interface

- **Gosta de:** `[PENDENTE]`
- **Odeia:** `[PENDENTE]`
- **Usa mais em:** **[PROPOSTA]** produção no celular, no canteiro; coordenador e diretoria no computador; cliente nos dois.
- **Cor principal:** **[PROPOSTA]** azul de engenharia `#1F5FA8`. Alternativas: verde de segurança `#1D8A5B`, laranja de canteiro `#E8622A`. Se a empresa tiver cor de marca, vale a da empresa.
- **Tema:** claro (funciona melhor no sol do canteiro).
- **Logo:** sem logo por enquanto. `[PENDENTE: colocar o arquivo na pasta, se houver]`

---

# 3. Arquitetura

## Mapa de telas

```
Login (inclui o aviso "Conta aguardando liberação")
├── Coordenador
│   ├── Painel  →  Detalhe da frente
│   ├── Frentes →  Detalhe da frente
│   ├── Diário
│   ├── Medições
│   ├── Restrições
│   └── Administração (Obras · Usuários)
├── Planejamento:  Painel · Frentes
├── Engenharia:    Restrições · Frentes
├── Produção:      Diário · Frentes · Restrições
├── Cliente:       Painel (versão do cliente) · Fotos
└── Diretoria:     Painel · Medições · Restrições
```

**Navegação:** celular com barra inferior de até 5 itens; computador com menu lateral. O coordenador tem 6 itens no menu lateral e, no celular, "Administração" fica dentro de um item "Mais".

Fotos aparecem também dentro do Detalhe da frente. A tela Fotos separada é a de maior chance de corte.

## Processos automáticos

### Virada diária das frentes
- **Gatilho:** todo dia às 06h00.
- **Passos:** 1. Para cada frente em andamento, calcular os dias sem avanço desde o último diário com avanço. 2. Passar a Parada quem tem 3 dias ou mais. 3. Recalcular o semáforo pelas regras acima.
- **Resultado:** o Painel de manhã já mostra a situação certa; as contagens da faixa de alertas batem com a lista.
- **Se der errado:** o Painel mostra no topo "Atualização das frentes de hoje não rodou" e usa os números do último dia que rodou. `[PENDENTE: quem recebe aviso por fora do sistema, por email ou WhatsApp. Fica para a v2.]`

### Diário que fecha a frente
- **Gatilho:** o mestre salva um lançamento do diário.
- **Passos:** 1. Atualizar o avanço da frente com o acumulado lançado. 2. Se houve avanço, zerar os dias sem avanço e tirar de Parada. 3. Se o acumulado chegou a 100%, passar a frente para Concluída e colocar na lista "A medir".
- **Resultado:** a frente muda de status na hora e o coordenador a vê em Medições.
- **Se der errado:** o lançamento não salva e o mestre vê "Não consegui salvar, tente de novo". Nada fica pela metade.

## Modelagem de dados

### Tabela `profiles`
Para que serve: liga o login à pessoa e guarda o perfil dela. É ela que manda nas permissões.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| auth_uid | uuid | sim | vem do login, único |
| nome | text | sim | |
| email | text | sim | único |
| role | text | sim | `Coordenador`, `Planejamento`, `Engenharia`, `Produção`, `Cliente`, `Diretoria`, `Pendente` |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

### Tabela `obras`
Para que serve: cada contrato, separado dos demais.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| nome | text | sim | |
| cliente | text | sim | |
| numero_contrato | text | não | |
| data_inicio | date | sim | |
| data_fim_contratual | date | sim | |
| status | text | sim | `Em andamento`, `Concluída`, `Suspensa` |
| responsavel_id | int8 | não | liga a `profiles` |
| created_at | timestamptz | sim | |

### Tabela `obra_membros`
Para que serve: diz quem enxerga qual obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | sim | |
| profile_id | int8 | sim | par obra + pessoa é único |
| created_at | timestamptz | sim | |

### Tabela `frentes`
Para que serve: cada frente de serviço de uma obra, com o estado atual.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | sim | |
| nome | text | sim | |
| disciplina | text | sim | `Civil`, `Mecânica`, `Tubulação`, `Elétrica`, `Instrumentação`, `Andaimes`, `Pintura`, `Outra` |
| local | text | não | |
| responsavel_id | int8 | não | liga a `profiles` |
| inicio_planejado | date | sim | |
| fim_planejado | date | sim | |
| fim_planejado_original | date | sim | não muda; mede reprogramação |
| peso | numeric(8,2) | sim | padrão 1 |
| eh_marco | boolean | sim | padrão falso |
| percentual_realizado | numeric(5,2) | sim | padrão 0 |
| ultimo_avanco_em | date | não | |
| dias_sem_avanco | int4 | sim | padrão 0; preenchido pelo processo diário |
| status | text | sim | `Não iniciada`, `Em andamento`, `Parada`, `Concluída` |
| saude | text | sim | `Verde`, `Amarelo`, `Vermelho` |
| impacto_prazo_dias | int4 | não | digitado |
| data_limite_decisao | date | não | |
| created_at | timestamptz | sim | |

Relações: pertence a uma obra; tem vários lançamentos de diário, fotos, restrições e medições.

### Tabela `apontamentos`
Para que serve: o diário de obra, um lançamento por frente por dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | sim | |
| frente_id | int8 | sim | |
| data | date | sim | |
| autor_id | int8 | sim | liga a `profiles` |
| percentual_acumulado | numeric(5,2) | sim | |
| houve_avanco | boolean | sim | calculado: acumulado maior que o anterior |
| motivo_sem_avanco | text | não | `Chuva`, `Falta de material`, `Falta de liberação`, `Falta de efetivo`, `Interferência`, `Retrabalho`, `Outro`; obrigatório se não houve avanço |
| efetivo_qtd | int4 | sim | |
| equipamentos | text | não | |
| observacao | text | não | |
| created_at | timestamptz | sim | |

### Tabela `fotos`
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
| created_at | timestamptz | sim | |

### Tabela `medicoes`
Para que serve: o que foi medido de cada frente em cada mês.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | sim | |
| frente_id | int8 | sim | |
| mes_referencia | date | sim | primeiro dia do mês |
| quantidade | numeric(14,2) | sim | |
| unidade | text | sim | |
| percentual_medido | numeric(5,2) | sim | |
| valor_medido | numeric(14,2) | sim | |
| status | text | sim | `Rascunho`, `Enviada`, `Aprovada` |
| evidencia_url | text | não | link do Storage |
| observacao | text | não | |
| created_at | timestamptz | sim | |

### Tabela `restricoes`
Para que serve: o que está travando ou ameaçando uma frente, incluindo RFI, risco e pleito potencial.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | int8 | sim | chave |
| obra_id | int8 | sim | |
| frente_id | int8 | não | |
| tipo | text | sim | `Restrição`, `RFI`, `Risco`, `Pleito potencial` |
| titulo | text | sim | |
| descricao | text | não | |
| criticidade | text | sim | `Alta`, `Média`, `Baixa` |
| status | text | sim | `Aberta`, `Em tratamento`, `Resolvida` |
| responsavel_id | int8 | não | |
| data_limite | date | não | |
| impacto_prazo_dias | int4 | não | |
| resolvida_em | date | não | |
| created_at | timestamptz | sim | |

### Permissões por tabela

Ver `PRD-BACKEND.md`.

## A pergunta de um ano

Perguntas que o coordenador quer poder fazer, tiradas do briefing: o prazo está protegido? o que está atrasado agora? o que posso medir hoje? onde há risco contratual? qual ação dá mais resultado agora? `[PENDENTE: qual pergunta você vai querer fazer em um ano que não está nesta lista?]`

Dados que passam a ser guardados desde o primeiro dia para responder: histórico do diário (avanço, efetivo e motivo de cada dia, que dá produtividade por disciplina e dias parados por motivo), a data planejada original de cada frente (mede reprogramação), restrições com impacto no prazo e medições por mês.

## Melhorias para a v2

- Custos (orçado × realizado, EAC, fluxo de caixa) — cortado porque o dado de custo exige outra fonte e não afeta a tela do dia a dia.
- Valor total do contrato e percentual medido contra o contrato — cortado para não criar uma 9ª tabela; hoje só existe a medição acumulada em valor.
- Curva S, linha de balanço, caminho crítico e impacto no prazo calculado — cortado porque depende de importar o cronograma.
- Importar cronograma do MS Project — cortado porque dá trabalho e é o que mais pode dar errado.
- Aviso por WhatsApp ou email — cortado porque o teto da v1 é 2 processos.
- Gestão de andaimes por TAG com localização em planta e medição automática — cortado como módulo próprio; hoje é disciplina.
- Visualizador 3D e DWG — cortado por tamanho.
- Fotos com localização (georreferenciadas) — cortado; a foto leva data e autor.
- Correspondências e pleitos completos (hoje só "Pleito potencial" como tipo de restrição).
- Atualização do Power BI e relatório em PDF.

## Cortes possíveis

Resumo da v1: 9 telas, 8 tabelas, 2 processos, 6 perfis. Passa dos tetos de 6 telas e 7 tabelas. Para voltar ao limite:
- **Corte A:** tirar a tela Fotos (as fotos continuam no Detalhe da frente). Fica 8 telas.
- **Corte B:** juntar Restrições dentro do Detalhe da frente e do Painel. Fica 7 telas e 7 tabelas, se `restricoes` virar campo de frente.
- **Corte C:** tirar o perfil Diretoria da v1 (o coordenador mostra o Painel nas reuniões).

Recomendação: Corte A e Corte C, que não mexem na tela do dia a dia.

---

# A conta que vai chegar depois

- `[PENDENTE: quantas obras e quantas pessoas vão usar]` — custo: define o armazenamento de fotos e o plano pago do Supabase e da Vercel.
- `[PENDENTE: conferir termos de uso comercial do plano grátis da Vercel]` — custo: pode exigir plano pago desde o primeiro dia de uso real.
- `[PENDENTE: armazenamento de fotos]` — custo: o plano grátis do Supabase tem limite de armazenamento; fotos de várias obras podem passar dele em poucos meses.
- `[PENDENTE: valor total do contrato por obra]` — custo: sem ele, o painel mostra medição acumulada em valor, mas não percentual medido.
- `[PENDENTE: benchmark incompleto]` — custo: preço do plano Enterprise do VIGHA e o que falta em cada concorrente não foram verificados.
- `[PENDENTE: aviso por fora do sistema quando a virada diária falhar]` — custo: o aviso só aparece dentro do Painel.
- `[PENDENTE: já conversou com mestre, planejamento e cliente que vão usar?]` — custo: se não conversou, é o maior risco do projeto; ninguém lança diário no celular se não quiser.
- `[PENDENTE: prazo para usar e horas por semana]` — custo: sem isso não dá para dizer se 9 telas cabem.

# Decidir depois de usar

- `[DESCOBRIR NO USO: limites do semáforo (3 dias, -5 e -10 pontos)]` — por enquanto ficou: os limites da Etapa 1.
- `[DESCOBRIR NO USO: planejado em linha reta entre início e fim]` — por enquanto ficou: linha reta.
- `[DESCOBRIR NO USO: impacto no prazo digitado à mão]` — por enquanto ficou: campo digitado por planejamento ou coordenador.
- `[DESCOBRIR NO USO: lista de disciplinas]` — por enquanto ficou: Civil, Mecânica, Tubulação, Elétrica, Instrumentação, Andaimes, Pintura, Outra.
- `[DESCOBRIR NO USO: lista de motivos de não avanço]` — por enquanto ficou: Chuva, Falta de material, Falta de liberação, Falta de efetivo, Interferência, Retrabalho, Outro.
- `[DESCOBRIR NO USO: peso igual para todas as frentes]` — por enquanto ficou: peso 1 para todas.
- `[DESCOBRIR NO USO: produção edita o próprio lançamento só no mesmo dia]` — por enquanto ficou: mesmo dia.
