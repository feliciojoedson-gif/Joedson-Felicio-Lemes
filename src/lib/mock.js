// Dados de exemplo (PRD-FRONTEND, "Dados de exemplo"). Formato igual ao das tabelas
// do PRD-BACKEND, para a virada para o Supabase ser só trocar o miolo de dados.js.

export const HOJE = '2026-10-04'

export const perfis = [
  { id: 1, nome: 'Joedson', email: 'joedson@exemplo.com', role: 'Coordenador', ativo: true },
  { id: 2, nome: 'Paulo Lima', email: 'paulo.lima@exemplo.com', role: 'Planejamento', ativo: true },
  { id: 3, nome: 'Renata Alves', email: 'renata.alves@exemplo.com', role: 'Engenharia', ativo: true },
  { id: 4, nome: 'Carlos Souza', email: 'carlos.souza@exemplo.com', role: 'Produção', ativo: true },
  { id: 5, nome: 'Fábio Reis', email: 'fabio.reis@cliente.com.br', role: 'Cliente', ativo: true },
  { id: 6, nome: 'Helena Prado', email: 'helena.prado@exemplo.com', role: 'Diretoria', ativo: true },
  { id: 7, nome: 'Edson Pires', email: 'edson.pires@exemplo.com', role: 'Produção', ativo: true },
  { id: 8, nome: 'Luana Matos', email: 'luana.matos@exemplo.com', role: 'Produção', ativo: true },
  { id: 9, nome: 'Júlio Brandão', email: 'julio.brandao@exemplo.com', role: 'Produção', ativo: true },
  { id: 10, nome: 'Rafael Teixeira', email: 'rafael.teixeira@exemplo.com', role: 'Pendente', ativo: true },
]

export const obras = [
  { id: 1, nome: 'Parada Geral Unidade 12', codigo: 'U12', endereco: 'Rodovia BR-101, km 12 — Zona Industrial (exemplo)', cliente: 'Petroquímica Exemplo', numero_contrato: 'PE-0412', data_inicio: '2026-09-01', data_fim_contratual: '2026-10-30', status: 'Em andamento', responsavel_id: 1 },
  { id: 2, nome: 'Montagem Tanque T-405', codigo: 'T405', endereco: 'Av. do Aço, 800 — Distrito Siderúrgico (exemplo)', cliente: 'Siderúrgica Exemplo', numero_contrato: 'SE-0877', data_inicio: '2026-08-01', data_fim_contratual: '2026-11-30', status: 'Em andamento', responsavel_id: 1 },
]

// Coordenador e Diretoria veem todas as obras sem precisar estar aqui.
export const obraMembros = [
  { obra_id: 1, profile_id: 2 }, { obra_id: 2, profile_id: 2 },
  { obra_id: 1, profile_id: 3 }, { obra_id: 2, profile_id: 3 },
  { obra_id: 1, profile_id: 4 }, { obra_id: 2, profile_id: 4 },
  { obra_id: 2, profile_id: 5 },
  { obra_id: 1, profile_id: 7 }, { obra_id: 2, profile_id: 7 },
  { obra_id: 1, profile_id: 8 }, { obra_id: 2, profile_id: 8 },
  { obra_id: 1, profile_id: 9 }, { obra_id: 2, profile_id: 9 },
]

const frente = (id, obra_id, nome, disciplina, local, responsavel_id, ini, fim, real, ult, dias, status, extra = {}) => ({
  id, obra_id, nome, disciplina, local, responsavel_id,
  inicio_planejado: ini, fim_planejado: fim, fim_planejado_original: fim,
  peso: 1, eh_marco: false, percentual_realizado: real,
  ultimo_avanco_em: ult, dias_sem_avanco: dias, status,
  impacto_prazo_dias: null, data_limite_decisao: null,
  ...extra,
})

export const frentes = [
  frente(1, 1, 'Andaimes forno F-101', 'Andaimes', 'Forno F-101', 7, '2026-09-01', '2026-09-25', 90, '2026-09-29', 5, 'Parada', { impacto_prazo_dias: 4, data_limite_decisao: '2026-10-06' }),
  frente(2, 1, 'Troca do trocador E-210', 'Mecânica', 'Casa de bombas', 8, '2026-09-08', '2026-10-10', 60, '2026-10-01', 3, 'Parada', { impacto_prazo_dias: 7, data_limite_decisao: '2026-10-07' }),
  frente(3, 1, 'Tubulação linha L-340', 'Tubulação', 'Rack 3', 9, '2026-09-15', '2026-10-15', 58, '2026-10-03', 1, 'Em andamento'),
  frente(4, 1, 'Pintura estrutura metálica', 'Pintura', 'Estrutura E-1', 7, '2026-09-22', '2026-10-20', 45, '2026-10-03', 1, 'Em andamento'),
  frente(5, 1, 'Instrumentação painel PC-12', 'Instrumentação', 'Sala elétrica', 8, '2026-09-29', '2026-10-25', 20, '2026-10-03', 1, 'Em andamento'),
  frente(6, 2, 'Fundação e base', 'Civil', 'Base do tanque', 9, '2026-08-01', '2026-09-15', 100, '2026-09-14', null, 'Concluída'),
  frente(7, 2, 'Montagem do fundo', 'Mecânica', 'Tanque T-405', 4, '2026-09-16', '2026-10-20', 40, '2026-09-30', 4, 'Parada', { impacto_prazo_dias: 3 }),
  frente(8, 2, 'Andaimes do casco', 'Andaimes', 'Casco', 7, '2026-10-01', '2026-10-30', 0, null, null, 'Não iniciada'),
  frente(9, 2, 'Marco: liberação do fundo para teste', 'Mecânica', 'Tanque T-405', 1, '2026-10-18', '2026-10-18', 0, null, null, 'Não iniciada', { eh_marco: true }),
  frente(10, 2, 'Iluminação do tanque', 'Elétrica', 'Entorno do tanque', 8, '2026-09-20', '2026-10-10', 70, '2026-10-03', 1, 'Em andamento'),
]

// Diário: gerado a partir do último avanço de cada frente, para o histórico ter conteúdo.
const MOTIVO_DO_EXEMPLO = { 1: 'Falta de liberação', 2: 'Falta de material', 7: 'Chuva' }
const LANCADO_HOJE = [3, 4, 10]

const somaDias = (iso, n) => {
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

function gerarApontamentos() {
  const lista = []
  let id = 1
  const novo = (f, data, extra) =>
    lista.push({
      id: id++, obra_id: f.obra_id, frente_id: f.id, data, autor_id: 4,
      percentual_acumulado: f.percentual_realizado, houve_avanco: false, motivo_sem_avanco: null,
      efetivo_qtd: 8, equipamentos: null, observacao: null, ...extra,
    })
  for (const f of frentes) {
    if (f.eh_marco || !f.ultimo_avanco_em) continue
    novo(f, somaDias(f.ultimo_avanco_em, -1), { percentual_acumulado: Math.max(0, f.percentual_realizado - 6), houve_avanco: true, efetivo_qtd: 6 })
    novo(f, f.ultimo_avanco_em, { houve_avanco: true })
    if (f.status === 'Concluída') continue
    for (let d = somaDias(f.ultimo_avanco_em, 1); d < HOJE; d = somaDias(d, 1)) {
      novo(f, d, { motivo_sem_avanco: MOTIVO_DO_EXEMPLO[f.id] || 'Outro', efetivo_qtd: 4 })
    }
    if (LANCADO_HOJE.includes(f.id)) novo(f, HOJE, { motivo_sem_avanco: 'Outro', efetivo_qtd: 4 })
  }
  return lista
}
export const apontamentos = gerarApontamentos()

// Duas fotos nas frentes 1, 2, 7 e 10; a primeira de cada uma liberada para o cliente.
export const fotos = [1, 2, 7, 10].flatMap((frenteId, i) => {
  const f = frentes.find((x) => x.id === frenteId)
  return [0, 1].map((n) => ({
    id: i * 2 + n + 1, obra_id: f.obra_id, frente_id: f.id, apontamento_id: null,
    url: null, legenda: `${f.nome} — registro ${n + 1}`, visivel_cliente: n === 0,
    autor_id: 4, tirada_em: `${somaDias(HOJE, -(n + 1))}T10:00:00`,
  }))
})

export const medicoes = [
  { id: 1, obra_id: 2, frente_id: 6, mes_referencia: '2026-09-01', quantidade: 1, unidade: 'verba', percentual_medido: 100, valor_medido: 184500, status: 'Rascunho', evidencia_url: null, observacao: null },
]

export const restricoes = [
  { id: 1, obra_id: 1, frente_id: 1, tipo: 'Restrição', titulo: 'Liberação de permissão de trabalho do forno', descricao: null, criticidade: 'Alta', status: 'Aberta', responsavel_id: 1, autor_id: 4, data_limite: '2026-10-06', impacto_prazo_dias: 4, resolvida_em: null },
  { id: 2, obra_id: 2, frente_id: 7, tipo: 'RFI', titulo: 'Revisão do desenho da chapa do fundo', descricao: null, criticidade: 'Média', status: 'Em tratamento', responsavel_id: 3, autor_id: 3, data_limite: '2026-10-10', impacto_prazo_dias: null, resolvida_em: null },
  { id: 3, obra_id: 1, frente_id: null, tipo: 'Pleito potencial', titulo: 'Acesso bloqueado pela operação do cliente', descricao: null, criticidade: 'Alta', status: 'Aberta', responsavel_id: 1, autor_id: 1, data_limite: null, impacto_prazo_dias: null, resolvida_em: null },
]
