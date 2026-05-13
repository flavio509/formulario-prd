'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import RevisaoRascunho from '@/components/RevisaoRascunho'
import type { RascunhoPRD } from '@/types/prd'
import { SESSION_KEYS } from '@/types/prd'

type Estado = 'carregando' | 'pronto' | 'confirmado' | 'erro'

// Métricas sugeridas automaticamente quando o Claude não retorna nenhuma
const METRICAS_FALLBACK = [
  'Redução do tempo gasto no processo atual (meta: -50%)',
  'Taxa de adoção pelos usuários no primeiro mês (meta: ≥ 80%)',
  'Redução de erros operacionais (meta: -70%)',
]

// Garante que todos os campos tenham tipos seguros,
// independente do que o Claude retornou.
function normalizarRascunho(raw: unknown): RascunhoPRD {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const toStr = (v: unknown): string =>
    typeof v === 'string' ? v : ''

  const toArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(toStr).filter(Boolean)
    if (typeof v === 'string' && v.trim()) return [v]
    return []
  }

  const metricas = toArray(r.metricas_sucesso)

  return {
    titulo:                     toStr(r.titulo),
    problema:                   toStr(r.problema),
    solucao_proposta:           toStr(r.solucao_proposta),
    funcionalidades_principais: toArray(r.funcionalidades_principais),
    o_que_sistema_faz:          toArray(r.o_que_sistema_faz),
    o_que_usuario_faz:          toArray(r.o_que_usuario_faz),
    restricoes:                 toArray(r.restricoes),
    usuarios:                   toStr(r.usuarios),
    metricas_sucesso:           metricas.length > 0 ? metricas : METRICAS_FALLBACK,
    notas_adicionais:           toStr(r.notas_adicionais),
  }
}

export default function RascunhoPage() {
  const router = useRouter()
  const [estado,   setEstado]   = useState<Estado>('carregando')
  const [rascunho, setRascunho] = useState<RascunhoPRD | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEYS.RASCUNHO)
    if (!raw) {
      setEstado('erro')
      return
    }
    try {
      setRascunho(normalizarRascunho(JSON.parse(raw)))
      setEstado('pronto')
    } catch (e) {
      console.error('[rascunho] Falha ao carregar sessionStorage:', e)
      setEstado('erro')
    }
  }, [])

  function handleConfirmar(atualizado: RascunhoPRD) {
    sessionStorage.setItem(SESSION_KEYS.RASCUNHO, JSON.stringify(atualizado))
    sessionStorage.setItem(SESSION_KEYS.STATUS,   'rascunho-confirmado')
    setEstado('confirmado')
    // Milestone 3 — redireciona para /arquitetura
    router.push('/arquitetura')
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10">
      {/* Breadcrumb */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-zinc-600 mb-8">
          <a href="/" className="hover:text-zinc-400 transition-colors">Início</a>
          <span>›</span>
          <a href="/formulario" className="hover:text-zinc-400 transition-colors">Formulário</a>
          <span>›</span>
          <span className="text-zinc-400">Rascunho</span>
        </div>
      </div>

      {/* Carregando */}
      {estado === 'carregando' && (
        <div className="text-center py-20">
          <div className="text-4xl animate-pulse mb-4">📝</div>
          <p className="text-zinc-400">Carregando rascunho...</p>
        </div>
      )}

      {/* Erro */}
      {estado === 'erro' && (
        <div className="max-w-md mx-auto text-center py-20">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Rascunho não encontrado</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Parece que a sessão expirou ou você chegou aqui diretamente.
          </p>
          <a
            href="/formulario"
            className="inline-block px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            ← Voltar ao formulário
          </a>
        </div>
      )}

      {/* Confirmado (transição) */}
      {estado === 'confirmado' && (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">🏗️</div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Rascunho confirmado!</h2>
          <p className="text-sm text-zinc-400">Redirecionando para o Agente Arquiteto...</p>
        </div>
      )}

      {/* Revisão */}
      {estado === 'pronto' && rascunho && (
        <RevisaoRascunho
          rascunho={rascunho}
          onConfirmar={handleConfirmar}
        />
      )}
    </main>
  )
}
