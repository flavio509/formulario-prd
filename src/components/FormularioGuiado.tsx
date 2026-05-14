'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { FormularioState } from '@/types/prd'

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function OpcaoSimples({
  value, selected, onSelect, children,
}: {
  value: string; selected: boolean; onSelect: (v: string) => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
        selected
          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-medium'
          : 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60'
      }`}
    >
      <span className={`inline-block w-3.5 h-3.5 rounded-full border mr-2.5 align-middle transition-colors ${
        selected ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600'
      }`} />
      {children}
    </button>
  )
}

function OpcaoMultipla({
  value, selected, onToggle, children,
}: {
  value: string; selected: boolean; onToggle: (v: string) => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(value)}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
        selected
          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-medium'
          : 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60'
      }`}
    >
      <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded border mr-2.5 align-middle transition-colors flex-shrink-0 ${
        selected ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600'
      }`}>
        {selected && <span className="text-white text-[9px] leading-none">✓</span>}
      </span>
      {children}
    </button>
  )
}

function Pergunta({ children, opcional }: { children: React.ReactNode; opcional?: boolean }) {
  return (
    <div className="mb-1">
      <p className="text-sm font-medium text-zinc-200">
        {children}
        {opcional && <span className="ml-2 text-xs font-normal text-zinc-500">(opcional)</span>}
      </p>
    </div>
  )
}

function Textarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900/60 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/70 resize-none transition-colors"
    />
  )
}

// ─── Estado inicial ───────────────────────────────────────────────────────────

const INITIAL: FormularioState = {
  negocio: '', como_resolve_hoje: [], tempo_por_semana: '', impacto_falha: [],
  estagio_atual: '', dor_principal: '',
  parar_de_fazer: [], mudanca_rotina: [], como_receber: [], funcionamento_ideal: '',
  acao_ou_autonomo: '', precisa_lembrar: '', tempo_rodando: '', quantas_pessoas: '',
  precisa_tela: '', redes_sociais: [], obs_funcionamento: '',
  capacidades: [], ferramentas_necessarias: '', funcionalidade_especifica: '',
  sempre_humano: [], agir_sem_aprovacao: '', preparar_para_executar: '',
  nao_sem_aprovacao: [], orcamento_mensal: '', restricoes_tecnicas: [],
  para_quem: '', maior_desejo: [], sentimento_problema: [], familiaridade_tech: '',
  descricao_usuario: '',
  como_medir: [], como_acompanhar: [],
  sistema_parecido: '', percepcao: '', contexto_adicional: '',
}

// ─── Metadados dos blocos — 8 etapas (Bloco 4 absorvido pelo Bloco 3) ─────────

const BLOCOS = [
  { num: 1, titulo: 'O negócio e o problema',   emoji: '🏢' },
  { num: 2, titulo: 'O resultado ideal',          emoji: '🎯' },
  { num: 3, titulo: 'Como vai funcionar',         emoji: '⚙️' },
  { num: 4, titulo: 'Humano vs Sistema',          emoji: '👤' },
  { num: 5, titulo: 'Limites e restrições',       emoji: '🚫' },
  { num: 6, titulo: 'Usuários e personas',        emoji: '👥' },
  { num: 7, titulo: 'Métricas e metas',           emoji: '📊' },
  { num: 8, titulo: 'Referências e contexto',     emoji: '🔖' },
]
const TOTAL = BLOCOS.length

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  onSubmit: (data: FormularioState) => void
  loading?: boolean
}

export default function FormularioGuiado({ onSubmit, loading = false }: Props) {
  const router            = useRouter()
  const [bloco, setBloco] = useState(1)
  const [data, setData]   = useState<FormularioState>(INITIAL)
  const [key, setKey]     = useState(0)

  const set = useCallback(<K extends keyof FormularioState>(field: K, value: FormularioState[K]) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const toggle = useCallback((field: keyof FormularioState, value: string) => {
    setData((prev) => {
      const arr = prev[field] as string[]
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  }, [])

  function avancar() {
    if (bloco < TOTAL) {
      setBloco((b) => b + 1)
      setKey((k) => k + 1)
    } else {
      onSubmit(data)
    }
  }

  // Item 1: bloco 1 → homepage, outros → passo anterior (sem perder dados)
  function voltar() {
    if (bloco > 1) {
      setBloco((b) => b - 1)
      setKey((k) => k + 1)
    } else {
      router.push('/')
    }
  }

  function podeAvancar(): boolean {
    if (bloco === 1) return data.negocio.trim().length > 0
    return true
  }

  const blocoInfo  = BLOCOS[bloco - 1]
  const progressPct = ((bloco - 1) / TOTAL) * 100

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Progresso */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">
            Etapa {bloco} de {TOTAL}
          </span>
          <span className="text-xs text-zinc-500">{Math.round(progressPct)}% concluído</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Cabeçalho do bloco */}
      <div className="mb-6 fade-slide-in" key={`header-${key}`}>
        <div className="flex items-center gap-2.5 mb-1">
          <span className="text-2xl">{blocoInfo.emoji}</span>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Bloco {blocoInfo.num}
          </span>
        </div>
        <h2 className="text-xl font-bold text-zinc-100">{blocoInfo.titulo}</h2>
      </div>

      {/* Conteúdo do bloco */}
      <div className="fade-slide-in space-y-6" key={`bloco-${key}`}>
        {bloco === 1 && <Bloco1 data={data} set={set} toggle={toggle} />}
        {bloco === 2 && <Bloco2 data={data} set={set} toggle={toggle} />}
        {bloco === 3 && <Bloco3 data={data} set={set} toggle={toggle} />}
        {bloco === 4 && <Bloco4 data={data} set={set} toggle={toggle} />}
        {bloco === 5 && <Bloco5 data={data} set={set} toggle={toggle} />}
        {bloco === 6 && <Bloco6 data={data} set={set} toggle={toggle} />}
        {bloco === 7 && <Bloco7 data={data} set={set} toggle={toggle} />}
        {bloco === 8 && <Bloco8 data={data} set={set} toggle={toggle} />}
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800">
        {/* Item 1: sempre clicável — bloco 1 vai para /, outros voltam um passo */}
        <button
          type="button"
          onClick={voltar}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar
        </button>

        <button
          type="button"
          onClick={avancar}
          disabled={!podeAvancar() || loading}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin text-base">⏳</span>
              Analisando...
            </>
          ) : bloco === TOTAL ? (
            'Gerar rascunho →'
          ) : (
            'Próximo →'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Tipo compartilhado pelos blocos ─────────────────────────────────────────

interface BlocoProps {
  data: FormularioState
  set: <K extends keyof FormularioState>(field: K, value: FormularioState[K]) => void
  toggle: (field: keyof FormularioState, value: string) => void
}

// ─── Bloco 1 — O negócio e o problema ────────────────────────────────────────

function Bloco1({ data, set, toggle }: BlocoProps) {
  return (
    <>
      <div className="space-y-2">
        <Pergunta>Qual é o seu negócio ou projeto?</Pergunta>
        <Textarea
          value={data.negocio}
          onChange={(v) => set('negocio', v)}
          placeholder='Ex: "sou contador e quero organizar meus processos", "quero criar conteúdo no Instagram sem aparecer", "quero comprar imóveis, reformar e vender"'
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Pergunta>Como você resolve esse problema hoje?</Pergunta>
        <div className="space-y-2">
          {[
            'Faço tudo na mão, manualmente',
            'Uso planilhas ou documentos',
            'Uso ferramentas que não se conectam entre si',
            'Dependo de outras pessoas para isso',
            'Não tenho processo definido',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.como_resolve_hoje.includes(op)} onToggle={(v) => toggle('como_resolve_hoje', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>Quanto tempo gasta nisso por semana?</Pergunta>
        <div className="space-y-2">
          {['Menos de 1 hora', 'Entre 1 e 5 horas', 'Entre 5 e 20 horas', 'Mais de 20 horas'].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.tempo_por_semana === op} onSelect={(v) => set('tempo_por_semana', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>O que acontece quando isso falha ou atrasa?</Pergunta>
        <div className="space-y-2">
          {[
            'Perco dinheiro diretamente',
            'Perco clientes ou oportunidades',
            'Minha equipe fica travada',
            'Gera estresse e impacto no negócio',
            'Não sei medir o impacto',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.impacto_falha.includes(op)} onToggle={(v) => toggle('impacto_falha', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>Onde você está hoje nessa jornada?</Pergunta>
        <div className="space-y-2">
          {[
            'Começando do zero — nunca fiz isso antes',
            'Já tentei mas sem consistência',
            'Já tenho processo rodando e quero automatizar',
            'Já estou funcionando e quero escalar',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.estagio_atual === op} onSelect={(v) => set('estagio_atual', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      {/* Item 3: Problema — 3 dicas de reflexão abaixo do campo */}
      <div className="space-y-2">
        <Pergunta opcional>Descreva com suas palavras o que mais te incomoda</Pergunta>
        <Textarea
          value={data.dor_principal}
          onChange={(v) => set('dor_principal', v)}
          placeholder="Pode escrever à vontade, sem precisar ser técnico..."
        />
        <div className="text-xs text-zinc-600 space-y-1 pt-1 leading-relaxed">
          <p className="text-zinc-500 font-medium">💭 Dicas para reflexão:</p>
          <p>• O que você faz manualmente hoje que mais toma seu tempo?</p>
          <p>• Quem é afetado quando dá errado?</p>
          <p>• Quanto custa (em tempo ou dinheiro) quando falha?</p>
        </div>
      </div>
    </>
  )
}

// ─── Bloco 2 — O resultado ideal ─────────────────────────────────────────────
// Item 2: `funcionamento_ideal` removido daqui (agora é Campo A do Bloco 3)

function Bloco2({ data, set, toggle }: BlocoProps) {
  return (
    <>
      <div className="space-y-2">
        <Pergunta>O que você quer parar de fazer manualmente?</Pergunta>
        <div className="space-y-2">
          {[
            'Buscar e organizar informações',
            'Responder perguntas repetitivas',
            'Gerar relatórios e resumos',
            'Agendar e lembrar tarefas',
            'Produzir conteúdo (textos, posts, emails)',
            'Monitorar algo e receber alertas quando mudar',
            'Processar documentos e arquivos',
            'Fazer análises e comparações',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.parar_de_fazer.includes(op)} onToggle={(v) => toggle('parar_de_fazer', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>Quando funcionando, o que muda na sua rotina?</Pergunta>
        <div className="space-y-2">
          {[
            'Sobro tempo para focar no que importa',
            'Minha equipe para de me interromper com perguntas',
            'Paro de perder informações e oportunidades',
            'Tomo decisões mais rápido e com mais segurança',
            'Escalo sem precisar contratar mais pessoas',
            'Reduzo custos operacionais',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.mudanca_rotina.includes(op)} onToggle={(v) => toggle('mudanca_rotina', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>Como quer receber os resultados?</Pergunta>
        <div className="space-y-2">
          {[
            'Receber no Telegram',
            'Receber por email',
            'Acessar num painel ou tela',
            'Acontecer automaticamente sem precisar pedir',
            'Perguntar e receber resposta na hora',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.como_receber.includes(op)} onToggle={(v) => toggle('como_receber', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Bloco 3 — Como vai funcionar ────────────────────────────────────────────
// Item 2: novo bloco consolidado (antigos Blocos 3 e 4)
// — Campo A: "Em uma frase, o que o sistema faz?" (funcionamento_ideal)
// — Campo B: "Liste as ações que o sistema executa sozinho" (funcionalidade_especifica)
// — Perguntas operacionais do antigo Bloco 3 (modo, memória, horário, escala, tela)
// — Ferramentas e redes sociais (do antigo Bloco 4)

function Bloco3({ data, set, toggle }: BlocoProps) {
  const temRedeSocial = data.redes_sociais.some((r) => r !== 'Não')

  return (
    <>
      {/* Campo A */}
      <div className="space-y-2">
        <Pergunta>Em uma frase, o que o sistema faz?</Pergunta>
        <Textarea
          value={data.funcionamento_ideal}
          onChange={(v) => set('funcionamento_ideal', v)}
          placeholder="Ex: Um agente que monitora meu calendário e envia lembretes automáticos"
          rows={2}
        />
      </div>

      {/* Campo B */}
      <div className="space-y-2">
        <Pergunta>Liste as ações que o sistema executa sozinho</Pergunta>
        <Textarea
          value={data.funcionalidade_especifica}
          onChange={(v) => set('funcionalidade_especifica', v)}
          placeholder="Ex: Monitora novos pedidos, envia confirmação por WhatsApp, atualiza planilha"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Pergunta>Você vai pedir para agir ou ele deve agir sozinho?</Pergunta>
        <div className="space-y-2">
          {[
            'Vou pedir e receber a resposta na hora',
            'Quero que aja sozinho em horários definidos',
            'Os dois — quero pedir E que aja sozinho',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.acao_ou_autonomo === op} onSelect={(v) => set('acao_ou_autonomo', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>Precisa lembrar do que foi feito antes?</Pergunta>
        <div className="space-y-2">
          {[
            'Não — cada uso é independente',
            'Sim — precisa lembrar do histórico e preferências',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.precisa_lembrar === op} onSelect={(v) => set('precisa_lembrar', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>O sistema vai rodar quanto tempo?</Pergunta>
        <div className="space-y-2">
          {[
            'Só quando eu usar (minutos por dia)',
            'Algumas horas por dia em horários definidos',
            '24 horas por dia, 7 dias por semana',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.tempo_rodando === op} onSelect={(v) => set('tempo_rodando', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>Vai ter mais de uma pessoa usando?</Pergunta>
        <div className="space-y-2">
          {[
            'Só eu',
            'Eu e minha equipe (até 5 pessoas)',
            'Muitos usuários (clientes, público externo)',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.quantas_pessoas === op} onSelect={(v) => set('quantas_pessoas', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>Precisa de uma tela visual ou mensagem basta?</Pergunta>
        <div className="space-y-2">
          {[
            'Não — conversa por mensagem já basta',
            'Sim — preciso de uma tela ou painel visual',
            'Os dois',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.precisa_tela === op} onSelect={(v) => set('precisa_tela', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta opcional>Tem ferramentas que o sistema PRECISA usar?</Pergunta>
        <Textarea
          value={data.ferramentas_necessarias}
          onChange={(v) => set('ferramentas_necessarias', v)}
          placeholder="Ex: Google Sheets, Notion, WhatsApp, Shopee, sistemas internos..."
        />
      </div>

      <div className="space-y-2">
        <Pergunta>O sistema vai interagir com redes sociais?</Pergunta>
        <div className="space-y-2">
          {['Instagram', 'TikTok', 'YouTube', 'Outras plataformas', 'Não'].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.redes_sociais.includes(op)} onToggle={(v) => toggle('redes_sociais', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
        {temRedeSocial && !data.redes_sociais.includes('Não') && (
          <div className="mt-2 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-xs text-yellow-400 leading-relaxed">
            ⚠️ <strong>Importante:</strong> redes sociais têm restrições de API. Seu sistema vai
            preparar o conteúdo para você publicar — não publicar automaticamente. Isso será
            considerado na arquitetura.
          </div>
        )}
      </div>
    </>
  )
}

// ─── Bloco 4 — Humano vs Sistema (era Bloco 5) ───────────────────────────────

function Bloco4({ data, set, toggle }: BlocoProps) {
  return (
    <>
      <div className="space-y-2">
        <Pergunta>Quais dessas tarefas você SEMPRE quer fazer você mesmo?</Pergunta>
        <div className="space-y-2">
          {[
            'Aprovar antes de qualquer ação importante',
            'Gravar vídeos ou aparecer em público',
            'Editar vídeos ou conteúdo visual',
            'Publicar nas redes sociais',
            'Tomar decisões financeiras',
            'Fazer ligações ou reuniões com clientes',
            'Escrever textos em primeira pessoa',
            'Nenhuma — quero automatizar tudo que for possível',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.sempre_humano.includes(op)} onToggle={(v) => toggle('sempre_humano', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>O sistema pode agir sem sua aprovação em situações rotineiras?</Pergunta>
        <div className="space-y-2">
          {[
            'Não — quero aprovar tudo',
            'Sim — pode agir em tarefas repetitivas e de baixo risco',
            'Sim — pode agir em tudo, só me avise depois',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.agir_sem_aprovacao === op} onSelect={(v) => set('agir_sem_aprovacao', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>O sistema vai preparar conteúdo para você executar?</Pergunta>
        <div className="p-3 rounded-xl border border-zinc-700/50 bg-zinc-900/30 text-xs text-zinc-500 mb-2 leading-relaxed">
          💡 Esta resposta define se o sistema age por você ou prepara para você agir.
        </div>
        <div className="space-y-2">
          {[
            'Sim — ele pesquisa, organiza e entrega pronto para eu fazer',
            'Não — ele executa diretamente',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.preparar_para_executar === op} onSelect={(v) => set('preparar_para_executar', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Bloco 5 — Limites e restrições (era Bloco 6) ────────────────────────────
// Item 3: label "Restrições" → "O que o sistema NUNCA deve fazer sozinho?"

function Bloco5({ data, set, toggle }: BlocoProps) {
  return (
    <>
      <div className="space-y-2">
        <Pergunta>O que o sistema NUNCA deve fazer sozinho?</Pergunta>
        <div className="space-y-2">
          {[
            'Publicar ou postar em redes sociais',
            'Enviar emails ou mensagens para clientes',
            'Fazer compras ou transações financeiras',
            'Acessar contas sem permissão explícita',
            'Deletar ou modificar arquivos importantes',
            'Tomar decisões que afetem clientes',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.nao_sem_aprovacao.includes(op)} onToggle={(v) => toggle('nao_sem_aprovacao', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
        <p className="text-xs text-zinc-600 pt-1">
          Ex: nunca enviar pagamento sem minha aprovação / nunca deletar dados / orçamento máximo R$X/mês
        </p>
      </div>

      <div className="space-y-2">
        <Pergunta>Orçamento mensal para ferramentas de IA:</Pergunta>
        <div className="space-y-2">
          {[
            'R$0 — só ferramentas gratuitas',
            'Até R$200/mês',
            'Até R$500/mês',
            'Sem limite definido',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.orcamento_mensal === op} onSelect={(v) => set('orcamento_mensal', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>Tem restrições técnicas importantes?</Pergunta>
        <div className="space-y-2">
          {[
            'Não tenho servidor (VPS) disponível',
            'Não posso aparecer em câmera ou em público',
            'Tenho menos de 1 hora por dia disponível',
            'Nenhuma restrição',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.restricoes_tecnicas.includes(op)} onToggle={(v) => toggle('restricoes_tecnicas', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Bloco 6 — Usuários e personas (era Bloco 7) ─────────────────────────────
// Item 3: "Personas" → dividido em (A) quem usa e (B) quem recebe resultados

function Bloco6({ data, set, toggle }: BlocoProps) {
  return (
    <>
      {/* Item 3: (A) Quem vai usar o sistema diretamente? */}
      <div className="space-y-2">
        <Pergunta>Quem vai usar o sistema diretamente?</Pergunta>
        <div className="space-y-2">
          {[
            'Para mim mesmo — resolve meu próprio problema',
            'Para meus clientes — pessoas que compram meus serviços',
            'Para minha equipe — funcionários ou parceiros',
            'Para o público geral — qualquer pessoa pode usar',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.para_quem === op} onSelect={(v) => set('para_quem', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>O maior desejo de quem vai usar é:</Pergunta>
        <div className="space-y-2">
          {[
            'Economizar tempo',
            'Economizar dinheiro',
            'Organizar melhor as informações',
            'Vender mais ou atrair mais clientes',
            'Ter mais controle sobre o negócio',
            'Escalar sem aumentar a equipe',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.maior_desejo.includes(op)} onToggle={(v) => toggle('maior_desejo', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>O que sente quando o problema não é resolvido?</Pergunta>
        <div className="space-y-2">
          {[
            'Frustração e estresse',
            'Perda de dinheiro',
            'Sensação de estar perdendo oportunidades',
            'Sobrecarga de trabalho',
            'Falta de controle sobre o negócio',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.sentimento_problema.includes(op)} onToggle={(v) => toggle('sentimento_problema', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta>Quem vai usar tem familiaridade com tecnologia?</Pergunta>
        <div className="space-y-2">
          {[
            'Sim — usam ferramentas digitais no dia a dia',
            'Mais ou menos — usam o básico (WhatsApp, email)',
            'Não — precisam de algo muito simples',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.familiaridade_tech === op} onSelect={(v) => set('familiaridade_tech', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      {/* Item 3: (B) Quem vai receber os resultados */}
      <div className="space-y-2">
        <Pergunta opcional>Quem vai receber os resultados ou comunicações do sistema?</Pergunta>
        <Textarea
          value={data.descricao_usuario}
          onChange={(v) => set('descricao_usuario', v)}
          placeholder="Ex: Meus clientes recebem confirmações por WhatsApp, minha equipe recebe relatórios por email..."
        />
      </div>
    </>
  )
}

// ─── Bloco 7 — Métricas e metas (era Bloco 8) ────────────────────────────────
// Item 3: "Métricas" → "Como você vai saber que deu certo?" + dica

function Bloco7({ data, set, toggle }: BlocoProps) {
  return (
    <>
      <div className="space-y-2">
        <Pergunta>Como você vai saber que deu certo?</Pergunta>
        <div className="space-y-2">
          {[
            'Tempo economizado por semana',
            'Número de tarefas automatizadas',
            'Redução de erros ou retrabalho',
            'Crescimento de vendas ou clientes',
            'Redução de custos operacionais',
            'Crescimento de audiência (seguidores, visualizações)',
            'Não sei — quero que o sistema sugira',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.como_medir.includes(op)} onToggle={(v) => toggle('como_medir', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
        <p className="text-xs text-zinc-600 pt-1">
          Ex: Em 3 meses quero gastar 80% menos tempo com tarefas manuais. Zero esquecimentos por mês.
        </p>
      </div>

      <div className="space-y-2">
        <Pergunta>Como quer acompanhar o progresso?</Pergunta>
        <div className="space-y-2">
          {[
            'Receber relatório no Telegram',
            'Receber relatório por email',
            'Acessar painel visual (dashboard)',
            'Não preciso acompanhar formalmente',
          ].map((op) => (
            <OpcaoMultipla key={op} value={op} selected={data.como_acompanhar.includes(op)} onToggle={(v) => toggle('como_acompanhar', v)}>
              {op}
            </OpcaoMultipla>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Bloco 8 — Referências e contexto (era Bloco 9) ──────────────────────────

function Bloco8({ data, set }: BlocoProps) {
  return (
    <>
      <div className="space-y-2">
        <Pergunta opcional>Já viu algum sistema parecido que te impressionou?</Pergunta>
        <Textarea
          value={data.sistema_parecido}
          onChange={(v) => set('sistema_parecido', v)}
          placeholder="Nome, URL, ou descrição do que te inspirou..."
        />
      </div>

      <div className="space-y-2">
        <Pergunta>Como quer que seu sistema seja percebido?</Pergunta>
        <div className="space-y-2">
          {[
            'Simples e fácil — qualquer pessoa usa sem treinamento',
            'Profissional e confiável — passa segurança e credibilidade',
            'Moderno e inovador — surpreende quem usa',
            'Discreto e eficiente — faz o trabalho sem aparecer',
          ].map((op) => (
            <OpcaoSimples key={op} value={op} selected={data.percepcao === op} onSelect={(v) => set('percepcao', v)}>
              {op}
            </OpcaoSimples>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Pergunta opcional>Algo mais que queira adicionar?</Pergunta>
        <Textarea
          value={data.contexto_adicional}
          onChange={(v) => set('contexto_adicional', v)}
          placeholder="Contexto adicional, restrições específicas, ideias, qualquer coisa relevante..."
          rows={4}
        />
      </div>

      <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-sm text-indigo-300 leading-relaxed">
        🏗️ <strong>Próximo passo:</strong> O Agente Arquiteto vai analisar suas respostas, pesquisar
        as melhores ferramentas e propor a arquitetura ideal para o seu projeto — sem envolver você.
        Você vai revisar e aprovar antes do PRD ser gerado.
      </div>
    </>
  )
}
