'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ArquiteturaCard from '@/components/ArquiteturaCard'
import type { RascunhoPRD, ArquiteturaPRD } from '@/types/prd'
import { SESSION_KEYS } from '@/types/prd'

type Estado = 'processando' | 'pronto' | 'erro'

const PASSOS = [
  { emoji: '🔍', texto: 'Analisando contexto de negócio...' },
  { emoji: '📊', texto: 'Classificando projeto (Tipo 1–6)...' },
  { emoji: '📚', texto: 'Consultando base de conhecimento...' },
  { emoji: '🏗️', texto: 'Definindo arquitetura completa...' },
  { emoji: '⚠️', texto: 'Verificando armadilhas e riscos...' },
]

// Normaliza a resposta do Arquiteto — garante tipos seguros
function normalizarArquitetura(raw: unknown): ArquiteturaPRD {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const toStr = (v: unknown): string =>
    typeof v === 'string' ? v : ''

  const toNum = (v: unknown): number =>
    typeof v === 'number' ? v : 1

  const toArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : '')).filter(Boolean)
    if (typeof v === 'string' && v.trim()) return [v]
    return []
  }

  return {
    tipo_projeto:        toStr(r.tipo_projeto)        || 'Agente Claude Code',
    tipo_numero:         toNum(r.tipo_numero),
    complexidade:        toStr(r.complexidade)        || 'Média',
    modo_operacao:       toStr(r.modo_operacao)       || 'On-demand',
    escala:              toStr(r.escala)              || '—',
    stack:               toArray(r.stack),
    banco_dados:         toStr(r.banco_dados),
    agente:              toStr(r.agente),
    num_agentes:         toStr(r.num_agentes),
    ias_recomendadas:    toArray(r.ias_recomendadas),
    skills:              toArray(r.skills),
    mcps:                toArray(r.mcps),
    smart_routing:       toStr(r.smart_routing),
    deploy:              toStr(r.deploy),
    mvp_funcionalidades: toArray(r.mvp_funcionalidades),
    v2_funcionalidades:  toArray(r.v2_funcionalidades),
    alertas:             toArray(r.alertas),
  }
}

export default function ArquiteturaPage() {
  const router = useRouter()

  const [estado,      setEstado]      = useState<Estado>('processando')
  const [passo,       setPasso]       = useState(0)
  const [arquitetura, setArquitetura] = useState<ArquiteturaPRD | null>(null)
  const [rascunho,    setRascunho]    = useState<RascunhoPRD | null>(null)
  const [erro,        setErro]        = useState('')

  const chamouRef = useRef(false) // evita dupla chamada no StrictMode

  // Animação dos passos — avança a cada 3s durante o processamento
  useEffect(() => {
    if (estado !== 'processando') return
    const id = setInterval(() => {
      setPasso((p) => (p + 1) % PASSOS.length)
    }, 3_000)
    return () => clearInterval(id)
  }, [estado])

  // Carrega rascunho e chama a API do Arquiteto
  useEffect(() => {
    if (chamouRef.current) return
    chamouRef.current = true

    const raw = sessionStorage.getItem(SESSION_KEYS.RASCUNHO)
    if (!raw) {
      setErro('Rascunho não encontrado. Volte e confirme o rascunho antes de continuar.')
      setEstado('erro')
      return
    }

    let rascunhoParsed: RascunhoPRD
    try {
      rascunhoParsed = JSON.parse(raw) as RascunhoPRD
    } catch {
      setErro('Erro ao carregar o rascunho. Por favor, volte e tente novamente.')
      setEstado('erro')
      return
    }

    setRascunho(rascunhoParsed)

    fetch('/api/arquiteto', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rascunho: rascunhoParsed }),
    })
      .then(async (res) => {
        const data = await res.json() as ArquiteturaPRD & { error?: string }
        if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`)
        const normalizada = normalizarArquitetura(data)
        sessionStorage.setItem(SESSION_KEYS.ARQUITETURA, JSON.stringify(normalizada))
        setArquitetura(normalizada)
        setEstado('pronto')
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        setErro(msg)
        setEstado('erro')
      })
  }, [])

  function handleAprovar() {
    sessionStorage.setItem(SESSION_KEYS.STATUS, 'arquitetura-aprovada')
    // Milestone 4 — redireciona para /gerar
    router.push('/gerar')
  }

  function handleAjustar() {
    router.push('/rascunho')
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10">

      {/* Breadcrumb */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-zinc-600 mb-8">
          <a href="/" className="hover:text-zinc-400 transition-colors">Início</a>
          <span>›</span>
          <a href="/rascunho" className="hover:text-zinc-400 transition-colors">Rascunho</a>
          <span>›</span>
          <span className="text-zinc-400">Arquitetura</span>
        </div>
      </div>

      {/* Processando */}
      {estado === 'processando' && (
        <div className="max-w-md mx-auto text-center py-20">
          <div className="text-5xl mb-6 animate-pulse">
            {PASSOS[passo].emoji}
          </div>
          <p className="text-zinc-300 font-medium mb-2">{PASSOS[passo].texto}</p>
          <p className="text-xs text-zinc-600">
            O Agente Arquiteto está analisando seu projeto...
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-8">
            {PASSOS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                  i === passo ? 'bg-indigo-400 scale-125' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Erro */}
      {estado === 'erro' && (
        <div className="max-w-md mx-auto text-center py-20">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Erro no Agente Arquiteto</h2>
          <p className="text-sm text-zinc-400 mb-2">{erro}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <a
              href="/rascunho"
              className="inline-block px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-500 transition-colors"
            >
              ← Voltar ao rascunho
            </a>
            <button
              type="button"
              onClick={() => {
                chamouRef.current = false
                setEstado('processando')
                setErro('')
                setPasso(0)
              }}
              className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
            >
              ↺ Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {estado === 'pronto' && arquitetura && rascunho && (
        <ArquiteturaCard
          arquitetura={arquitetura}
          rascunho={rascunho}
          onAprovar={handleAprovar}
          onAjustar={handleAjustar}
        />
      )}
    </main>
  )
}
