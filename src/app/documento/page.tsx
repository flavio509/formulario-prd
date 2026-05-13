'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UploadDocumentos from '@/components/UploadDocumentos'
import type { RascunhoPRD } from '@/types/prd'
import { SESSION_KEYS } from '@/types/prd'

type Estado = 'upload' | 'carregando' | 'erro'

export default function DocumentoPage() {
  const router              = useRouter()
  const [estado, setEstado] = useState<Estado>('upload')
  const [erro,   setErro]   = useState('')

  async function handleSubmit(arquivos: File[]) {
    setEstado('carregando')
    setErro('')

    try {
      const form = new FormData()
      form.append('tipo', 'documentos')
      arquivos.forEach((f) => form.append('arquivos', f))

      const res = await fetch('/api/extrair-documento', {
        method: 'POST',
        body:   form,
        // Sem Content-Type — o browser define o boundary do multipart automaticamente
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Erro ${res.status}`)
      }

      const rascunho: RascunhoPRD = await res.json()

      sessionStorage.setItem(SESSION_KEYS.MODO,      'documento')
      sessionStorage.setItem(SESSION_KEYS.RASCUNHO,  JSON.stringify(rascunho))
      sessionStorage.setItem(SESSION_KEYS.STATUS,    'formulario-preenchido')

      router.push('/rascunho')
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido')
      setEstado('upload')
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="max-w-xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-600 mb-8">
          <a href="/" className="hover:text-zinc-400 transition-colors">Início</a>
          <span>›</span>
          <span className="text-zinc-400">Enviar documentos</span>
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-sm text-red-400">
            ⚠️ {erro}
          </div>
        )}

        {estado === 'carregando' ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-pulse">📄</div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">Analisando documentos...</h2>
            <p className="text-sm text-zinc-400">
              O sistema está lendo os arquivos e extraindo as informações do projeto.
            </p>
            <p className="text-xs text-zinc-600 mt-2">Isso pode levar alguns segundos.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-2xl">📄</span>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                  Enviar documentos
                </span>
              </div>
              <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                Quais documentos descrevem seu projeto?
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Envie até 3 arquivos. Pode ser qualquer combinação: briefing, anotações, curso,
                transcrição de reunião, plano de negócio. O sistema cruza as informações e monta
                o rascunho.
              </p>
            </div>

            <UploadDocumentos onSubmit={handleSubmit} />
          </>
        )}
      </div>
    </main>
  )
}
