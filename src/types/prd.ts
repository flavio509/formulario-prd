// ─── Modo de entrada ──────────────────────────────────────────────────────────
export type ModoEntrada = 'formulario' | 'documento' | 'audio'

// ─── Estado do formulário (9 blocos) ─────────────────────────────────────────
export interface FormularioState {
  // Bloco 1 — O negócio e o problema
  negocio: string
  como_resolve_hoje: string[]
  tempo_por_semana: string
  impacto_falha: string[]
  estagio_atual: string
  dor_principal: string

  // Bloco 2 — O resultado ideal
  parar_de_fazer: string[]
  mudanca_rotina: string[]
  como_receber: string[]
  funcionamento_ideal: string

  // Bloco 3 — Como vai funcionar
  acao_ou_autonomo: string
  precisa_lembrar: string
  tempo_rodando: string
  quantas_pessoas: string
  precisa_tela: string
  redes_sociais: string[]
  obs_funcionamento: string

  // Bloco 4 — O que o sistema vai fazer
  capacidades: string[]
  ferramentas_necessarias: string
  funcionalidade_especifica: string

  // Bloco 5 — Humano vs Sistema
  sempre_humano: string[]
  agir_sem_aprovacao: string
  preparar_para_executar: string

  // Bloco 6 — Limites e restrições
  nao_sem_aprovacao: string[]
  orcamento_mensal: string
  restricoes_tecnicas: string[]

  // Bloco 7 — Usuários e personas
  para_quem: string
  maior_desejo: string[]
  sentimento_problema: string[]
  familiaridade_tech: string
  descricao_usuario: string

  // Bloco 8 — Métricas e metas
  como_medir: string[]
  como_acompanhar: string[]

  // Bloco 9 — Referências e contexto
  sistema_parecido: string
  percepcao: string
  contexto_adicional: string
}

// ─── Rascunho extraído pelo Claude ───────────────────────────────────────────
export interface RascunhoPRD {
  titulo: string
  problema: string
  solucao_proposta: string
  funcionalidades_principais: string[]
  o_que_sistema_faz: string[]
  o_que_usuario_faz: string[]
  restricoes: string[]
  usuarios: string
  metricas_sucesso: string[]
  notas_adicionais: string
}

// ─── Arquitetura definida pelo Agente Arquiteto ───────────────────────────────
export interface ArquiteturaPRD {
  tipo_projeto: string
  tipo_numero: number
  complexidade: string
  modo_operacao: string
  escala: string
  stack: string[]
  banco_dados: string
  agente: string
  num_agentes: string
  ias_recomendadas: string[]
  skills: string[]
  mcps: string[]
  smart_routing: string
  deploy: string
  mvp_funcionalidades: string[]
  v2_funcionalidades: string[]
  alertas: string[]
}

// ─── SessionStorage keys ──────────────────────────────────────────────────────
export const SESSION_KEYS = {
  MODO:         'prd-modo',
  FORMULARIO:   'prd-formulario',
  RASCUNHO:     'prd-rascunho',
  ARQUITETURA:  'prd-arquitetura',
  STATUS:       'prd-status',
} as const

export type PrdStatus =
  | 'formulario-preenchido'
  | 'rascunho-confirmado'
  | 'arquitetura-aprovada'
  | 'gerado'
