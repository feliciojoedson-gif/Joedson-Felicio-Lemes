# PRD Frontend — Controle de Obras (nome provisório)

> Especificação da interface. Quem constrói lê este arquivo.
> Nesta fase não existe banco: as telas funcionam com os dados de exemplo do fim deste arquivo.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.

## O que o sistema é

Acompanhamento de obras industriais com uma lista única de frentes ordenada pelo que está parado há mais tempo. Usado principalmente no celular, no canteiro, pela produção; e no computador, no escritório, pelo coordenador e pela diretoria. O cliente usa nos dois.

## Padrão técnico

- React 19 + Vite 6, sem biblioteca de componente pronta.
- Visual a partir de um `index.css` próprio.
- Navegação por estado, sem endereço no navegador.
- Cor principal `#1F5FA8`, tema claro.
- Celular: barra inferior fixa com até 5 itens. Computador: menu lateral à esquerda.
- Etiquetas de semáforo: Verde `#1D8A5B`, Amarelo `#E0A100`, Vermelho `#C62828`, sempre com texto junto da cor ("Parada", "Atenção", "Em dia"), nunca só cor.

## Perfis

- **Coordenador:** entra em Painel. Vê tudo, inclusive valores de medição.
- **Planejamento:** entra em Painel. Vê frentes, efetivo e restrições; edita datas, pesos e responsáveis das frentes. Não vê valor de medição.
- **Engenharia:** entra em Restrições. Vê frentes e restrições; cria restrição e RFI. Não vê valor, nem efetivo.
- **Produção:** entra em Diário. Vê só as frentes das obras a que está ligado; lança diário e fotos. Não vê valor.
- **Cliente:** entra no Painel (versão do cliente). Vê avanço, datas planejadas, marcos e fotos liberadas. Não vê restrição, efetivo, valor nem responsável interno.
- **Diretoria:** entra em Painel. Vê tudo de todas as obras, só leitura.

## Mapa de navegação

```
Login
└── Coordenador:   Painel · Frentes · Diário · Medições · Restrições · Mais (Administração) · Meu perfil
└── Planejamento:  Painel · Frentes · Meu perfil
└── Engenharia:    Restrições · Frentes · Meu perfil
└── Produção:      Diário · Frentes · Restrições · Meu perfil
└── Cliente:       Painel · Fotos · Meu perfil
└── Diretoria:     Painel · Medições · Restrições · Meu perfil
```

No celular o coordenador tem 5 itens na barra (Painel, Frentes, Diário, Medições, Mais). Restrições e Administração ficam dentro de "Mais".

---

## Tela: Login

**Quem acessa:** todos, antes de entrar.

**O que aparece**
Nome do sistema, campo de email, campo de senha, botão Entrar, link Criar conta.

**Ações**
- **Entrar:** valida e leva para a tela inicial do perfil. Quem está com perfil Pendente vê o aviso "Conta aguardando liberação do administrador" no lugar do sistema.
- **Criar conta:** cadastra e mostra o aviso "Conta aguardando liberação do administrador".

**Estado vazio**
Não se aplica.

---

## Tela: Painel

**Quem acessa:** Coordenador, Planejamento, Cliente, Diretoria.
**Chega aqui por:** primeiro item do menu, e ao entrar.

**O que aparece**
De cima para baixo:
1. Seletor de obra ("Todas as obras" ou uma obra) e filtros: cliente, disciplina, responsável, período do último avanço.
2. Faixa de alertas com quatro contagens clicáveis: "Paradas há 3 dias ou mais", "Restrições críticas abertas", "Concluídas e não medidas", "Sem diário hoje". Clicar filtra a lista abaixo.
3. Um cartão por obra: semáforo, avanço real, avanço planejado, desvio em pontos, medição acumulada, próximo marco com data e a foto mais recente.
4. Um gráfico de barras: avanço planejado × real por obra.
5. Lista de frentes, ordenada por dias sem avanço (maior primeiro) e depois por desvio (pior primeiro).

**Campos e informações** (colunas da lista de frentes)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Obra | texto | sim | |
| Frente | texto | sim | |
| Disciplina | etiqueta | sim | |
| Responsável | texto | não | |
| Status | etiqueta | sim | Não iniciada, Em andamento, Parada, Concluída |
| Dias sem avanço | número | sim | "—" se não iniciada |
| Avanço real × planejado | barra e número | sim | desvio em pontos ao lado |
| Impacto no prazo | número de dias | não | |
| Data limite de decisão | data | não | vermelho se já passou |

**Ações**
- **Filtrar:** atualiza a lista e os cartões sem recarregar.
- **Clicar numa contagem de alerta:** aplica o filtro correspondente.
- **Clicar numa frente:** abre o Detalhe da frente.
- **Clicar num cartão de obra:** filtra o Painel por aquela obra.

**Regras por perfil**
- **Coordenador:** vê tudo, inclusive "Medição acumulada" nos cartões.
- **Planejamento:** vê tudo, menos "Medição acumulada".
- **Cliente:** vê só a versão simples. Cartão por obra com semáforo, avanço real × planejado, próximo marco e foto liberada. Lista com Frente, Local, Avanço e Datas planejadas. Sem faixa de alertas, sem responsável, sem impacto no prazo, sem dias sem avanço e sem gráfico.
- **Diretoria:** igual ao coordenador, sem botões de editar.

**Estado vazio**
"Nenhuma frente cadastrada nesta obra. Cadastre a primeira em Frentes." (para o cliente: "Ainda não há frentes para mostrar.")

---

## Tela: Frentes

**Quem acessa:** Coordenador, Planejamento, Engenharia, Produção.
**Chega aqui por:** item "Frentes" do menu.

**O que aparece**
Seletor de obra, filtros (disciplina, responsável, status), botão Nova frente e a lista de frentes da obra com as mesmas colunas do Painel.

**Campos e informações** (formulário de criar e editar frente)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome | texto | sim | |
| Disciplina | lista | sim | Civil, Mecânica, Tubulação, Elétrica, Instrumentação, Andaimes, Pintura, Outra |
| Local | texto | não | |
| Responsável | lista de pessoas | não | |
| Início planejado | data | sim | |
| Fim planejado | data | sim | |
| Peso | número | sim | padrão 1 |
| É marco | caixa de marcar | sim | padrão desmarcada |
| Impacto no prazo (dias) | número | não | |
| Data limite de decisão | data | não | |

**Ações**
- **Nova frente:** abre o formulário. Salvar faz a frente aparecer na lista sem recarregar.
- **Editar:** abre o formulário preenchido. Mudar o fim planejado não altera o fim planejado original.
- **Apagar:** pede confirmação e remove a frente com seus lançamentos.
- **Clicar numa frente:** abre o Detalhe da frente.

**Regras por perfil**
- **Coordenador:** cria, edita, apaga.
- **Planejamento:** cria e edita; não apaga.
- **Engenharia e Produção:** só consultam; não veem botões de criar, editar ou apagar. Produção vê só obras a que está ligada.

**Estado vazio**
"Nenhuma frente nesta obra ainda."

---

## Tela: Detalhe da frente

**Quem acessa:** todos os perfis, conforme as regras abaixo.
**Chega aqui por:** clique numa frente do Painel ou da lista de Frentes.

**O que aparece**
Cabeçalho com nome, obra, disciplina, local, status e semáforo. Abaixo: avanço real × planejado, dias sem avanço, impacto no prazo, data limite de decisão e datas planejadas (com a data original, se mudou). Depois, quatro blocos: Histórico do diário (um item por dia, com avanço, efetivo e motivo), Fotos da frente, Restrições da frente, Medições da frente.

**Ações**
- **Lançar diário:** abre o formulário de Diário já nesta frente (só Produção e Coordenador).
- **Medir:** abre o formulário de medição (só Coordenador).
- **Nova restrição:** abre o formulário de restrição ligado a esta frente.
- **Clicar numa foto:** abre grande.

**Regras por perfil**
- **Cliente:** vê só nome, local, avanço, datas planejadas e fotos liberadas. Não vê diário, efetivo, restrições nem medições.
- **Planejamento:** vê tudo, menos o bloco de Medições.
- **Engenharia:** vê tudo, menos Medições e efetivo do diário.
- **Produção:** vê tudo, menos Medições; no diário vê só os próprios lançamentos.
- **Diretoria:** vê tudo, sem botões de ação.

**Estado vazio**
Cada bloco tem o seu texto: "Nenhum lançamento ainda.", "Nenhuma foto ainda.", "Nenhuma restrição nesta frente.", "Nenhuma medição ainda."

---

## Tela: Diário

**Quem acessa:** Produção, Coordenador. (Diretoria e Planejamento veem o histórico no Detalhe da frente.)
**Chega aqui por:** item "Diário" do menu; é a primeira tela da Produção.

**O que aparece**
Data do dia no topo. Lista das frentes do usuário, com as sem lançamento hoje primeiro e um selo "Falta lançar". Tocar numa frente abre o formulário do dia, em tela cheia no celular, com botões grandes e pouca digitação.

**Campos e informações** (formulário do dia)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Frente | lista | sim | já preenchida ao vir da lista |
| Data | data | sim | hoje por padrão |
| Avanço acumulado (%) | número 0 a 100 | sim | mostra o valor anterior ao lado; não pode ser menor que o anterior |
| Efetivo (pessoas) | número | sim | |
| Equipamentos | texto | não | |
| Houve avanço? | calculado | sim | "Sim" se o acumulado subiu |
| Motivo de não haver avanço | lista | sim, se não houve | Chuva, Falta de material, Falta de liberação, Falta de efetivo, Interferência, Retrabalho, Outro |
| Observação | texto | não | |
| Fotos | imagens | não | comprimidas no navegador antes de enviar |

**Ações**
- **Salvar lançamento:** grava; a frente sai de "Falta lançar" e a tela volta para a lista com a mensagem "Lançado."
- **Editar lançamento:** só o próprio e só no mesmo dia.
- **Adicionar foto:** tira ou escolhe a foto e mostra miniatura.

**Regras por perfil**
- **Produção:** vê só as frentes das obras a que está ligado e só os próprios lançamentos.
- **Coordenador:** vê todos os lançamentos e pode lançar em qualquer frente.

**Estado vazio**
"Nada lançado hoje. Toque em uma frente para lançar."

---

## Tela: Medições

**Quem acessa:** Coordenador (cria e edita), Diretoria (só lê).
**Chega aqui por:** item "Medições" do menu.

**O que aparece**
Seletor de obra e duas abas. "A medir": frentes concluídas ou com avanço ainda não medido, da mais antiga para a mais nova. "Histórico": medições feitas, da mais recente para a mais antiga. Filtros por disciplina e mês.

**Campos e informações** (formulário de medição)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Frente | lista | sim | |
| Mês de referência | mês | sim | |
| Quantidade | número | sim | |
| Unidade | texto | sim | |
| Percentual medido | número 0 a 100 | sim | |
| Valor medido (R$) | dinheiro | sim | |
| Status | lista | sim | Rascunho, Enviada, Aprovada |
| Evidência | arquivo ou foto | não | |
| Observação | texto | não | |

**Ações**
- **Medir:** em "A medir", abre o formulário já com a frente.
- **Salvar:** grava e passa a frente para o histórico.
- **Enviar e Aprovar:** mudam o status.
- **Apagar:** pede confirmação (só Coordenador).

**Regras por perfil**
- **Coordenador:** tudo.
- **Diretoria:** só lê; sem botões.
- Demais perfis não veem esta tela.

**Estado vazio**
"Nenhuma frente a medir agora." e, no histórico, "Nenhuma medição registrada."

---

## Tela: Restrições

**Quem acessa:** Coordenador, Engenharia, Produção (só Restrição e RFI), Diretoria (só leitura).
**Chega aqui por:** item "Restrições" do menu; é a primeira tela da Engenharia.

**O que aparece**
Seletor de obra, filtros (tipo, status, responsável, criticidade), botão Nova restrição e a lista, ordenada por criticidade (Alta primeiro) e depois por data limite.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Obra | lista | sim | |
| Frente | lista | não | |
| Tipo | lista | sim | Restrição, RFI, Risco, Pleito potencial |
| Título | texto | sim | |
| Descrição | texto longo | não | |
| Criticidade | lista | sim | Alta, Média, Baixa |
| Status | lista | sim | Aberta, Em tratamento, Resolvida |
| Responsável | lista de pessoas | não | |
| Data limite | data | não | |
| Impacto no prazo (dias) | número | não | |

**Ações**
- **Nova restrição:** abre o formulário. Salvar faz aparecer na lista.
- **Editar:** muda os campos. Mudar o status para Resolvida grava a data de resolução.
- **Apagar:** só Coordenador, com confirmação.

**Regras por perfil**
- **Coordenador:** vê e edita todos os tipos.
- **Engenharia:** cria e edita Restrição e RFI; não vê Risco nem Pleito potencial.
- **Produção:** cria Restrição e RFI; vê só esses dois tipos; edita só as que criou.
- **Diretoria:** vê todos os tipos, sem botões.
- **Planejamento:** vê Restrição e RFI, e cria Restrição; o acesso é pelo Detalhe da frente (a tela não aparece no menu dele).

**Estado vazio**
"Nenhuma restrição aberta. Bom sinal."

---

## Tela: Fotos

**Quem acessa:** Cliente (item de menu); os demais veem fotos no Detalhe da frente.
**Chega aqui por:** item "Fotos" do menu do cliente.

**O que aparece**
Seletor de obra, filtro por frente e período, e uma grade de fotos da mais recente para a mais antiga. Cada foto mostra data e frente.

**Ações**
- **Tocar na foto:** abre grande, com legenda.

**Regras por perfil**
- **Cliente:** vê só fotos marcadas como liberadas.
- Quem marca a liberação é o Coordenador, no Detalhe da frente ("Mostrar ao cliente" em cada foto).

**Estado vazio**
"Ainda não há fotos liberadas."

---

## Tela: Administração

**Quem acessa:** Coordenador.
**Chega aqui por:** item "Mais" no celular ou "Administração" no menu lateral.

**O que aparece**
Duas abas. **Obras:** lista de obras e botão Nova obra. **Usuários:** lista de pessoas com perfil, obras ligadas e ativo; contas novas aparecem no topo com o selo "Aguardando liberação".

**Campos e informações** (obra)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome | texto | sim | |
| Cliente | texto | sim | |
| Número do contrato | texto | não | |
| Início | data | sim | |
| Fim contratual | data | sim | |
| Status | lista | sim | Em andamento, Concluída, Suspensa |
| Responsável | lista de pessoas | não | |

**Ações**
- **Nova obra:** abre o formulário; salvar faz a obra aparecer no seletor de obra.
- **Liberar conta:** o coordenador escolhe o perfil e as obras da pessoa; a pessoa passa a ver o sistema no próximo acesso.
- **Trocar perfil e desativar:** alteram o acesso na hora.

**Regras por perfil**
- Só o Coordenador acessa.

**Estado vazio**
"Nenhuma obra cadastrada. Cadastre a primeira para começar." e "Nenhuma conta aguardando liberação."

---

## Tela: Meu perfil

**Quem acessa:** todos.

**O que aparece**
Nome, email, perfil (só leitura) e botão Sair.

---

## Textos do sistema

- Botões: Salvar, Cancelar, Nova frente, Nova obra, Nova restrição, Lançar diário, Medir, Enviar, Aprovar, Excluir, Entrar, Sair.
- Confirmação de exclusão: "Excluir este registro? Isso não pode ser desfeito."
- Aviso de conta pendente: "Conta aguardando liberação do administrador."
- Erro genérico: "Não consegui salvar. Tente de novo."
- Aviso de atualização que não rodou (Painel): "A atualização das frentes de hoje não rodou. Os números são de ontem."

## Dados de exemplo

Obra 1: **Parada Geral Unidade 12** (cliente Petroquímica Exemplo, contrato PE-0412, 01/09/2026 a 30/10/2026, Em andamento).
Obra 2: **Montagem Tanque T-405** (cliente Siderúrgica Exemplo, contrato SE-0877, 01/08/2026 a 30/11/2026, Em andamento).

Data de referência dos exemplos: 04/10/2026.

| # | Obra | Frente | Disciplina | Início | Fim | Real | Último avanço | Dias sem avanço | Status | Saúde |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Parada U12 | Andaimes forno F-101 | Andaimes | 01/09 | 25/09 | 90% | 29/09 | 5 | Parada | Vermelho |
| 2 | Parada U12 | Troca do trocador E-210 | Mecânica | 08/09 | 10/10 | 60% | 01/10 | 3 | Parada | Vermelho |
| 3 | Parada U12 | Tubulação linha L-340 | Tubulação | 15/09 | 15/10 | 58% | 03/10 | 1 | Em andamento | Amarelo |
| 4 | Parada U12 | Pintura estrutura metálica | Pintura | 22/09 | 20/10 | 45% | 03/10 | 1 | Em andamento | Verde |
| 5 | Parada U12 | Instrumentação painel PC-12 | Instrumentação | 29/09 | 25/10 | 20% | 03/10 | 1 | Em andamento | Verde |
| 6 | Tanque T-405 | Fundação e base | Civil | 01/08 | 15/09 | 100% | 14/09 | — | Concluída | Verde |
| 7 | Tanque T-405 | Montagem do fundo | Mecânica | 16/09 | 20/10 | 40% | 30/09 | 4 | Parada | Vermelho |
| 8 | Tanque T-405 | Andaimes do casco | Andaimes | 01/10 | 30/10 | 0% | — | — | Não iniciada | Amarelo |
| 9 | Tanque T-405 | Marco: liberação do fundo para teste | Mecânica | 18/10 | 18/10 | — | — | — | Não iniciada | Verde |
| 10 | Tanque T-405 | Iluminação do tanque | Elétrica | 20/09 | 10/10 | 70% | 03/10 | 1 | Em andamento | Verde |

Detalhes extras dos exemplos:
- Frente 1: motivo do último dia sem avanço, "Falta de liberação"; impacto no prazo 4 dias; data limite de decisão 06/10.
- Frente 2: motivo "Falta de material"; impacto 7 dias; data limite 07/10.
- Frente 7: motivo "Chuva"; impacto 3 dias.
- Frente 6: concluída e sem medição, para aparecer em "A medir".
- Restrições de exemplo: (a) Parada U12, frente 1, tipo Restrição, "Liberação de permissão de trabalho do forno", Alta, Aberta; (b) Tanque T-405, frente 7, tipo RFI, "Revisão do desenho da chapa do fundo", Média, Em tratamento; (c) Parada U12, tipo Pleito potencial, "Acesso bloqueado pela operação do cliente", Alta, Aberta.
- Medição de exemplo: Tanque T-405, frente 6, mês 09/2026, 100% medido, valor R$ 184.500,00, status Rascunho (sem evidência ainda).
- Fotos de exemplo: 2 por frente nas frentes 1, 2, 7 e 10, uma delas marcada para o cliente.

Usuários de exemplo, um de cada perfil:
- Marina Costa, Coordenador
- Paulo Lima, Planejamento
- Renata Alves, Engenharia
- Carlos Souza, Produção (ligado às duas obras)
- Fábio Reis, Cliente (ligado à obra Tanque T-405)
- Helena Prado, Diretoria

## Critérios de aceite

- [ ] O sistema abre no Painel para Coordenador, Planejamento, Cliente e Diretoria; em Diário para Produção; em Restrições para Engenharia.
- [ ] O Painel mostra a lista ordenada por dias sem avanço e, no exemplo, a frente 1 aparece antes da frente 7 e da frente 2 (5, 4 e 3 dias).
- [ ] Clicar em "Paradas há 3 dias ou mais" filtra a lista para as frentes 1, 2 e 7.
- [ ] Criar uma frente a faz aparecer na lista sem recarregar a página.
- [ ] Salvar um lançamento do diário com avanço zera os dias sem avanço da frente na tela.
- [ ] Salvar um lançamento sem avanço exige o motivo.
- [ ] Concluir uma frente (100%) a coloca em "A medir".
- [ ] Produção não vê valor de medição em nenhuma tela.
- [ ] Cliente não vê restrições, efetivo, responsável, nem dias sem avanço; vê só fotos liberadas.
- [ ] Diretoria vê tudo e não tem botão de criar, editar ou apagar.
- [ ] A troca do seletor de obra nunca mistura dados de duas obras.
- [ ] Todas as telas funcionam no celular sem rolagem horizontal.
- [ ] Cada lista tem estado vazio com texto próprio.

## A conta que vai chegar depois

- `[PENDENTE: quantas obras e quantas pessoas vão usar]` — custo: define limite de fotos e plano pago.
- `[PENDENTE: já conversou com mestre, planejamento e cliente?]` — custo: maior risco do projeto se a produção não lançar o diário.
- `[PENDENTE: valor total do contrato]` — custo: sem ele, o cartão da obra mostra medição acumulada, mas não percentual medido.
- `[PENDENTE: nome definitivo do sistema, logo e cor da empresa]` — custo: visual provisório.

## Decidir depois de usar

- `[DESCOBRIR NO USO: limites do semáforo]` — por enquanto: 3 dias, -5 e -10 pontos.
- `[DESCOBRIR NO USO: disciplinas e motivos de não avanço]` — por enquanto: as listas deste arquivo.
- `[DESCOBRIR NO USO: um gráfico só no Painel]` — por enquanto: barras de planejado × real por obra.
