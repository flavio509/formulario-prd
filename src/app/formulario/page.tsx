'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FormularioGuiado from '@/components/FormularioGuiado'
import type { FormularioState, RascunhoPRD } from '@/types/prd'
import { SESSION_KEYS } from '@/types/prd'

type Estado = 'formulario' | 'carregando' | 'erro'

export default function FormularioPage() {
  const router  = useRouter()
  const [estado, setEstado] = useState<Estado>('formulario')
  const [erro,   setErro]   = useState('')

  async function handleSubmit(data: FormularioState) {
    setEstado('carregando')
    setErro('')

    try {
      const res = await fetch('/api/extrair-documento', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tipo: 'formulario', dados: data }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Erro ${res.status}`)
      }

      const rascunho: RascunhoPRD = await res.json()

      // Persiste no sessionStorage
      sessionStorage.setItem(SESSION_KEYS.FORMULARIO, JSON.stringify(data))
      sessionStorage.setItem(SESSION_KEYS.RASCUNHO,   JSON.stringify(rascunho))
      sessionStorage.setItem(SESSION_KEYS.STATUS,     'formulario-preenchido')

      router.push('/rascunho')
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido')
      setEstado('formulario')
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="max-w-xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-600 mb-8">
          <a href="/" className="hover:text-zinc-400 transition-colors">Início</a>
          <span>›</span>
          <span className="text-zinc-400">Formulário guiado</span>
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-sm text-red-400">
            ⚠️ {erro}
          </div>
        )}

        {/* Estado de carregamento */}
        {estado === 'carregando' ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-pulse">🤖</div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">Analisando suas respostas...</h2>
            <p className="text-sm text-zinc-400">
              O sistema está lendo o contexto e montando o rascunho do projeto.
            </p>
            <p className="text-xs text-zinc-600 mt-2">Isso leva alguns segundos.</p>
          </div>
        ) : (
          <FormularioGuiado onSubmit={handleSubmit} loading={false} />
        )}
      </div>
    </main>
  )
}
