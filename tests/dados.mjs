// Camada de dados (src/lib/dados.js): isolamento por obra e recortes por perfil.
// É aqui que o app multi-obra se protege; no banco, as mesmas regras viram RLS.
import { carregarBase } from '../src/lib/dados.js'
import * as mock from '../src/lib/mock.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else {
    console.log(`  ✗ ${descricao}`)
    console.log(`     esperado: ${JSON.stringify(esperado)}`)
    console.log(`     veio:     ${JSON.stringify(real)}`)
  }
}

const usuario = (nome) => mock.perfis.find((p) => p.nome === nome)
const base = async (nome, obraId) => (await carregarBase(usuario(nome), obraId)).data
const TABELAS = ['frentes', 'apontamentos', 'fotos', 'medicoes', 'restricoes']

// 1. Nenhum perfil, em nenhuma obra, recebe linha de outra obra
for (const p of mock.perfis.filter((x) => x.role !== 'Pendente')) {
  for (const obra of mock.obras) {
    const b = await base(p.nome, obra.id)
    if (!b.obra) continue
    const misturou = TABELAS.filter((t) => b[t].some((linha) => linha.obra_id !== b.obra.id))
    conferir(`${p.nome} na obra ${obra.codigo}: só linhas da obra atual`, misturou, [])
  }
}

// 2. Obra pedida que a pessoa não enxerga cai numa obra que ela enxerga
conferir('cliente pedindo a obra 1 recebe a obra 2', (await base('Fábio Reis', 1)).obra.id, 2)
conferir('obra inexistente cai na primeira', (await base('Joedson', 999)).obra.id, 1)
conferir('sem pedido, abre a primeira', (await base('Joedson', null)).obra.id, 1)

// 3. Conta pendente não vê nada
const pendente = await base('Rafael Teixeira', 1)
conferir('pendente sem obra e sem dados', [pendente.obra, TABELAS.flatMap((t) => pendente[t]).length], [null, 0])

// 4. Cliente: só os campos permitidos e só fotos liberadas
const cliente = await base('Fábio Reis', 2)
const proibidos = ['responsavel_id', 'dias_sem_avanco', 'impacto_prazo_dias', 'data_limite_decisao', 'status']
conferir('cliente: frente sem campo interno', cliente.frentes.some((f) => proibidos.some((c) => c in f)), false)
conferir('cliente: só fotos liberadas', cliente.fotos.every((f) => f.visivel_cliente), true)
conferir('cliente: sem diário, restrição, medição nem pessoas', [cliente.apontamentos, cliente.restricoes, cliente.medicoes, cliente.perfis].map((x) => x.length), [0, 0, 0, 0])

// 5. Produção
const producao = await base('Carlos Souza', 1)
conferir('produção: sem medição', producao.medicoes.length, 0)
conferir('produção: só o que ela mesma lançou', producao.apontamentos.every((a) => a.autor_id === 4), true)
conferir('produção: só Restrição e RFI', producao.restricoes.every((r) => r.tipo === 'Restrição' || r.tipo === 'RFI'), true)

// 6. Engenharia e Planejamento
const engenharia = await base('Renata Alves', 1)
conferir('engenharia: diário sem efetivo', engenharia.apontamentos.length > 0 && engenharia.apontamentos.every((a) => !('efetivo_qtd' in a)), true)
conferir('engenharia e planejamento: sem medição', [engenharia.medicoes.length, (await base('Paulo Lima', 1)).medicoes.length], [0, 0])
conferir('planejamento: sem Pleito nem Risco', (await base('Paulo Lima', 1)).restricoes.some((r) => r.tipo === 'Pleito potencial' || r.tipo === 'Risco'), false)

// 7. Coordenador e Diretoria
const coord = await base('Joedson', 1)
const dir = await base('Helena Prado', 1)
conferir('coordenador e diretoria veem as 2 obras no seletor', [coord.obras.length, dir.obras.length], [2, 2])
conferir('diretoria vê os 3 tipos de restrição da obra 1', dir.restricoes.map((r) => r.tipo).sort(), ['Pleito potencial', 'Restrição'])
conferir('medição só na obra dela: U12 não tem, T405 tem', [coord.medicoes.length, (await base('Joedson', 2)).medicoes.length], [0, 1])

console.log(`${ok}/${tot} — dados`)
process.exit(ok === tot ? 0 : 1)
