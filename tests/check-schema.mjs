// Régua do banco: compara o código (src/lib/dados.js e regras.js) com a foto do banco em tests/schema-snapshot.json.
// Pega o erro que não aparece na tela: coluna que não existe, tabela errada, status com grafia diferente do CHECK.
// Roda sem internet. Mudou o banco? Atualize o snapshot no mesmo lote.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as regras from '../src/lib/regras.js'
import { COLUNAS_CONTRATO, MODOS, UNIDADES } from '../src/lib/empreiteiros.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const snap = JSON.parse(readFileSync(join(raiz, 'tests/schema-snapshot.json'), 'utf8'))
const dados = readFileSync(join(raiz, 'src/lib/dados.js'), 'utf8')
const colunasDe = { ...snap.tabelas, ...snap.views }
const erros = []

// 1) Toda tabela/view usada em .from('x') existe no banco.
const usadas = [...dados.matchAll(/\.from\('(\w+)'\)/g)].map((m) => m[1])
for (const t of new Set(usadas)) if (!colunasDe[t]) erros.push(`dados.js usa a tabela "${t}", que não existe no banco`)

// 2) Colunas gravadas (insert/update) existem na tabela.
const gravacoes = [
  ['apontamentos', /const dados = \{([\s\S]*?)\n  \}/],
  ['apontamentos', /\.insert\(\{ \.\.\.dados, ([^}]*)\}\)/],
  ['fotos', /from\('fotos'\)\.insert\(\{([\s\S]*?)\}\)/],
  ['contratos_empreiteiro', /from\('contratos_empreiteiro'\)\s*\.insert\(\{([\s\S]*?)\}\)/],
  ['boletins_empreiteiro', /from\('boletins_empreiteiro'\)\s*\.insert\(\{([\s\S]*?)\}\)/],
]
for (const [tabela, re] of gravacoes) {
  const bloco = dados.match(re)
  if (!bloco) { erros.push(`não achei o bloco de gravação de "${tabela}" em dados.js (padrão ${re}); atualize o check-schema`); continue }
  for (const [, col] of bloco[1].matchAll(/(?:^|[\s,{])(\w+):/g)) {
    if (!snap.tabelas[tabela].includes(col)) erros.push(`dados.js grava "${tabela}.${col}", coluna que não existe no banco`)
  }
}

// 3) Vocabulário do app == CHECK do banco, com acento e tudo (senão o salvamento falha em silêncio).
const vocabulario = {
  'obras.status': regras.STATUS_OBRA,
  'frentes.disciplina': regras.DISCIPLINAS,
  'frentes.status': regras.STATUS_FRENTE,
  'apontamentos.motivo_sem_avanco': regras.MOTIVOS,
  'medicoes.status': regras.STATUS_MEDICAO,
  'restricoes.tipo': regras.TIPOS_RESTRICAO,
  'restricoes.criticidade': regras.CRITICIDADES,
  'restricoes.status': regras.STATUS_RESTRICAO,
  'contratos_empreiteiro.status': COLUNAS_CONTRATO.map((c) => c.id),
  'contratos_empreiteiro.modo': Object.keys(MODOS),
  'itens_contrato.unidade': UNIDADES,
}
for (const [chave, lista] of Object.entries(vocabulario)) {
  const banco = snap.checks[chave]
  if (!banco) { erros.push(`snapshot sem CHECK de ${chave}`); continue }
  if (JSON.stringify([...lista].sort()) !== JSON.stringify([...banco].sort())) {
    erros.push(`${chave}: regras.js tem [${lista}] e o CHECK do banco tem [${banco}]`)
  }
}
for (const chave of Object.keys(snap.checks)) {
  if (!vocabulario[chave]) erros.push(`CHECK ${chave} no snapshot não tem constante comparada em regras.js`)
}

// 4) Toda tabela de lançamento tem obra_id (app multi-obra).
for (const t of ['frentes', 'apontamentos', 'fotos', 'medicoes', 'restricoes', 'contratos_empreiteiro', 'itens_contrato', 'boletins_empreiteiro']) {
  if (!snap.tabelas[t].includes('obra_id')) erros.push(`${t} sem obra_id no snapshot`)
}

if (erros.length) {
  console.log('✗ check-schema:\n  ' + erros.join('\n  '))
  process.exit(1)
}
console.log(`✓ check-schema: ${Object.keys(snap.tabelas).length} tabelas, ${Object.keys(snap.views).length} views, ${Object.keys(snap.checks).length} vocabulários conferidos`)
