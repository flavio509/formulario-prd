'use client'

import type { ArquiteturaPRD, RascunhoPRD } from '@/types/prd'

interface Props {
  arquitetura: ArquiteturaPRD
  rascunho:    RascunhoPRD
  onAprovar:   () => void
  onAjustar:   () => void
  loading?:    boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_CORES: Record<number, string> = {
  1: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  2: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  3: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  4: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  5: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  6: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

const COMPLEXIDADE_CORES: Record<string, string> = {
  'Simples':     'text-emerald-400',
  'Média':       'text-yellow-400',
  'Alta':        'text-orange-400',
  'Muito Alta':  'text-rose-400',
}

function alertaCor(alerta: string): string {
  if (alerta.startsWith('💰')) return 'border-orange-500/40 bg-orange-500/8'
  if (alerta.startsWith('🔒')) return 'border-rose-500/40 bg-rose-500/8'
  if (alerta.startsWith('⚠️')) return 'border-yellow-500/40 bg-yellow-500/8'
  return 'border-zinc-700/50 bg-zinc-900/30'
}

function SecaoLista({ titulo, items, vazio }: { titulo: string; items: string[]; vazio?: string }) {
  const lista = Array.isArray(items) ? items.filter(Boolean) : []
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{titulo}</h3>
      {lista.length === 0 ? (
        <p className="text-xs text-zinc-600 italic">{vazio ?? '—'}</p>
      ) : (
        <ul className="space-y-1.5">
          {lista.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-300 leading-snug">
              <span className="text-zinc-600 flex-shrink-0 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SecaoBadges({ titulo, items }: { titulo: string; items: string[] }) {
  const lista = Array.isArray(items) ? items.filter(Boolean) : []
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{titulo}</h3>
      <div className="flex flex-wrap gap-2">
        {lista.length === 0 ? (
          <span className="text-xs text-zinc-600 italic">—</span>
        ) : (
          lista.map((item, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-900/60 text-xs text-zinc-300"
            >
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  )
}

function SecaoMCPs({ mcps }: { mcps: string[] }) {
  const lista = Array.isArray(mcps) ? mcps.filter(Boolean) : []
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">🔌 MCPs necessários</h3>
      {lista.length === 0 ? (
        <p className="text-xs text-zinc-600 italic">Nenhum MCP necessário para este projeto</p>
      ) : (
        <div className="space-y-2">
          {lista.map((mcp, i) => {
            const [nome, cmd] = mcp.includes(' — ') ? mcp.split(' — ') : [mcp, '']
            return (
              <div key={i} className="rounded-lg border border-zinc-700/60 bg-zinc-900/40 px-3 py-2.5">
                <p className="text-sm text-zinc-200 font-medium mb-1">{nome}</p>
                {cmd && (
                  <code className="text-xs text-emerald-400 font-mono bg-zinc-950/60 px-2 py-0.5 rounded block overflow-x-auto">
                    {cmd}
                  </code>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ArquiteturaCard({ arquitetura, rascunho, onAprovar, onAjustar, loading = false }: Props) {
  const tipoCor    = TIPO_CORES[arquitetura.tipo_numero] ?? TIPO_CORES[2]
  const complexCor = COMPLEXIDADE_CORES[arquitetura.complexidade] ?? 'text-zinc-400'

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🏗️</span>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Arquitetura</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">{rascunho.titulo}</h1>
        <p className="text-sm text-zinc-400">
          Decisão arquitetural do Agente Arquiteto. Revise e aprove para gerar o PRD completo.
        </p>
      </div>

      {/* Tipo + Metadados */}
      <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${tipoCor}`}>
            Tipo {arquitetura.tipo_numero} — {arquitetura.tipo_projeto}
          </span>
          <span className={`text-xs font-medium ${complexCor}`}>
            {arquitetura.complexidade}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
          <span><span className="text-zinc-400">Modo:</span> {arquitetura.modo_operacao}</span>
          <span><span className="text-zinc-400">Escala:</span> {arquitetura.escala}</span>
          <span><span className="text-zinc-400">Deploy:</span> {arquitetura.deploy}</span>
        </div>
      </div>

      {/* O que o sistema faz / O que você faz */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <SecaoLista
            titulo="✅ O que o sistema faz"
            items={rascunho.o_que_sistema_faz}
            vazio="Nenhuma tarefa automatizada definida"
          />
        </div>
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <SecaoLista
            titulo="👤 O que você faz"
            items={rascunho.o_que_usuario_faz}
            vazio="Nenhuma tarefa humana definida"
          />
        </div>
      </div>

      {/* Stack */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
        <SecaoBadges titulo="⚙️ Stack técnica" items={arquitetura.stack} />
        {arquitetura.banco_dados && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">
              <span className="text-zinc-400 font-medium">Banco de dados:</span> {arquitetura.banco_dados}
            </span>
          </div>
        )}
      </div>

      {/* IAs + Agente + Smart Routing */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-4">
        <SecaoLista titulo="🤖 IAs recomendadas" items={arquitetura.ias_recomendadas} />
        <div className="pt-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">
            <span className="text-zinc-400 font-medium">Agente:</span> {arquitetura.agente}
            {arquitetura.num_agentes && ` · ${arquitetura.num_agentes}`}
          </p>
          {arquitetura.smart_routing && (
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-400 font-medium">Smart routing:</span> {arquitetura.smart_routing}
            </p>
          )}
        </div>
      </div>

      {/* Skills */}
      {(Array.isArray(arquitetura.skills) && arquitetura.skills.length > 0) && (
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <SecaoLista titulo="🧰 Skills prontas a usar" items={arquitetura.skills} />
        </div>
      )}

      {/* MCPs */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
        <SecaoMCPs mcps={arquitetura.mcps} />
      </div>

      {/* MVP vs V2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <SecaoLista
            titulo="📦 MVP inclui"
            items={arquitetura.mvp_funcionalidades}
            vazio="Funcionalidades não definidas"
          />
        </div>
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <SecaoLista
            titulo="🚀 V2+ inclui"
            items={arquitetura.v2_funcionalidades}
            vazio="Nenhuma evolução planejada"
          />
        </div>
      </div>

      {/* Alertas */}
      {Array.isArray(arquitetura.alertas) && arquitetura.alertas.filter(Boolean).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">⚠️ Alertas importantes</h3>
          {arquitetura.alertas.filter(Boolean).map((alerta, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border text-sm text-zinc-300 leading-relaxed ${alertaCor(alerta)}`}
            >
              {alerta}
            </div>
          ))}
        </div>
      )}

      {/* Aviso */}
      <div className="p-4 rounded-xl border border-zinc-700/50 bg-zinc-900/30 text-sm text-zinc-400 leading-relaxed">
        💡 <strong className="text-zinc-300">Pronto para o PRD.</strong> Ao aprovar, o sistema gera o
        PRD completo com todos os arquivos: CLAUDE.md, PRD.md, PLAN.md, estrutura de pastas e código inicial.
      </div>

      {/* Botões */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end pb-10">
        <button
          type="button"
          onClick={onAjustar}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl font-medium text-sm border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-40"
        >
          ✏️ Quero ajustar
        </button>
        <button
          type="button"
          onClick={onAprovar}
          disabled={loading}
          className="px-8 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <><span className="animate-spin">⏳</span> Gerando PRD...</>
          ) : (
            '✓ Aprovar e gerar PRD →'
          )}
        </button>
      </div>
    </div>
  )
}
