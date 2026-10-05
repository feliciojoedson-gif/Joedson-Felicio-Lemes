// Regras dos cadastros (src/lib/cadastros.js). Node puro: `node tests/cadastros.mjs`.
import {
  errosFrente, errosLiberacao, errosMedicaoDaFrente, errosObra, errosRestricaoDaObra, lerNumero, passoDaMedicao, PASSOS_RESTRICAO, primeiroDiaDoMes,
} from '../src/lib/cadastros.js'
import { veTodasAsObras } from '../src/lib/regras.js'

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

conferir('número com vírgula', lerNumero('12,5'), 12.5)
conferir('número inválido vira NaN', Number.isNaN(lerNumero('abc')), true)

const frente = { nome: 'Banheiro', disciplina: 'Civil', inicio: '2026-10-01', fim: '2026-10-10', peso: '2', ehMarco: false }
conferir('frente válida', errosFrente(frente), {})
conferir('frente sem nome', Object.keys(errosFrente({ ...frente, nome: '  ' })), ['nome'])
conferir('frente com fim antes do início', Object.keys(errosFrente({ ...frente, fim: '2026-09-30' })), ['fim'])
conferir('frente com peso zero', Object.keys(errosFrente({ ...frente, peso: '0' })), ['peso'])
conferir('frente com disciplina inventada', Object.keys(errosFrente({ ...frente, disciplina: 'Magia' })), ['disciplina'])
conferir('marco precisa de um dia só', Object.keys(errosFrente({ ...frente, ehMarco: true })), ['fim'])
conferir('marco de um dia é válido', errosFrente({ ...frente, ehMarco: true, fim: '2026-10-01' }), {})

const rest = { tipo: 'RFI', titulo: 'Dúvida', criticidade: 'Alta', dataLimite: '', impacto: '' }
conferir('restrição válida', errosRestricaoDaObra(rest), {})
conferir('restrição: tipo que o perfil não vê', Object.keys(errosRestricaoDaObra({ ...rest, tipo: 'Risco' }, ['Restrição', 'RFI'])), ['tipo'])
conferir('restrição: impacto só número', Object.keys(errosRestricaoDaObra({ ...rest, impacto: '2a' })), ['impacto'])
conferir('restrição reabre depois de resolvida', PASSOS_RESTRICAO.Resolvida.map((p) => p.para), ['Aberta'])

conferir('mês vira dia 1', primeiroDiaDoMes('2026-10'), '2026-10-01')
const med = { mes: '2026-10', quantidade: '40', unidade: 'm²', percentual: '50', valor: '1200,50' }
conferir('medição válida', errosMedicaoDaFrente(med), {})
conferir('medição: percentual acima de 100', Object.keys(errosMedicaoDaFrente({ ...med, percentual: '101' })), ['percentual'])
conferir('medição sem unidade', Object.keys(errosMedicaoDaFrente({ ...med, unidade: '' })), ['unidade'])
conferir('medição: valor negativo', Object.keys(errosMedicaoDaFrente({ ...med, valor: '-1' })), ['valor'])

conferir('rascunho: Medição envia', passoDaMedicao('Rascunho', 'Medição')?.para, 'Enviada')
conferir('rascunho: Gestão Contratual não envia', passoDaMedicao('Rascunho', 'Gestão Contratual'), null)
conferir('enviada: só a Gestão aprova primeiro', passoDaMedicao('Enviada', 'Coordenador'), null)
conferir('enviada: Gestão Contratual aprova', passoDaMedicao('Enviada', 'Gestão Contratual')?.para, 'Aprovada pela Gestão')
conferir('aprovação final é do Coordenador', passoDaMedicao('Aprovada pela Gestão', 'Coordenador')?.para, 'Aprovada')
conferir('aprovada não anda mais', passoDaMedicao('Aprovada', 'Coordenador'), null)

const obra = { codigo: 'U13', nome: 'Reforma', cliente: 'Gerdau', inicio: '2026-10-01', fim: '2026-12-01', status: 'Ativa' }
conferir('obra válida', errosObra(obra), {})
conferir('obra: entrega antes do início', Object.keys(errosObra({ ...obra, fim: '2026-09-01' })), ['fim'])
conferir('obra sem código', Object.keys(errosObra({ ...obra, codigo: '' })), ['codigo'])

conferir('liberação: perfil Pendente não vale', Object.keys(errosLiberacao({ role: 'Pendente', obraIds: [1] }, veTodasAsObras)), ['role'])
conferir('liberação: Produção precisa de obra', Object.keys(errosLiberacao({ role: 'Produção', obraIds: [] }, veTodasAsObras)), ['obras'])
conferir('liberação: Coordenador vê todas, sem escolher obra', errosLiberacao({ role: 'Coordenador', obraIds: [] }, veTodasAsObras), {})

console.log(`${ok}/${tot} — cadastros`)
process.exit(ok === tot ? 0 : 1)
