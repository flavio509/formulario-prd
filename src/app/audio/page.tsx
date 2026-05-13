'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UploadAudio from '@/components/UploadAudio'
import type { RascunhoPRD } from '@/types/prd'
import { SESSION_KEYS } from '@/types/prd'

type Estado = 'upload' | 'carregando' | 'erro'

export default function AudioPage() {
  const router              = useRouter()
  const [estado, setEstado] = useState<Estado>('upload')
  const [erro,   setErro]   = useState('')
  const [etapa,  setEtapa]  = useState<'transcrevendo' | 'analisando'>('transcrevendo')

  async function handleSubmit(arquivo: File) {
    setEstado('carregando')
    setEtapa('transcrevendo')
    setErro('')

    try {
      const form = new FormData()
      form.append('audio', arquivo)

      const res = await fetch('/api/transcrever-audio', {
        method: 'POST',
        body:   form,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Erro ${res.status}`)
      }

      setEtapa('analisando')
      const rascunho: RascunhoPRD = await res.json()

      sessionStorage.setItem(SESSION_KEYS.MODO,      'audio')
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
          <span className="text-zinc-400">Enviar áudio</span>
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-sm text-red-400">
            ⚠️ {erro}
          </div>
        )}

        {estado === 'carregando' ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-pulse">
              {etapa === 'transcrevendo' ? '🎙️' : '🤖'}
            </div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">
              {etapa === 'transcrevendo' ? 'Transcrevendo o áudio...' : 'Analisando a transcrição...'}
            </h2>
            <p className="text-sm text-zinc-400">
              {etapa === 'transcrevendo'
                ? 'Whisper está convertendo o áudio em texto.'
                : 'Extraindo as informações do projeto da transcrição.'}
            </p>
            <p className="text-xs text-zinc-600 mt-2">
              Não feche esta aba. Pode levar até 60 segundos.
            </p>

            {/* Linha de progresso */}
            <div className="mt-8 max-w-xs mx-auto">
              <div className="flex items-center justify-between text-xs text-zinc-600 mb-2">
                <span className={etapa === 'transcrevendo' ? 'text-blue-400' : 'text-zinc-500'}>
                  1. Transcrição
                </span>
                <span className={etapa === 'analisando' ? 'text-blue-400' : 'text-zinc-600'}>
                  2. Análise
                </span>
                <span className="text-zinc-700">3. Rascunho</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                  style={{ width: etapa === 'transcrevendo' ? '40%' : '75%' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-2xl">🎙️</span>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                  Enviar áudio
                </span>
              </div>
              <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                Tem uma gravação sobre o projeto?
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Envie uma gravação de reunião, briefing de voz, ou nota de voz descrevendo
                o que você quer construir. O sistema transcreve e extrai as informações.
              </p>
            </div>

            <UploadAudio onSubmit={handleSubmit} />
          </>
        )}
      </div>
    </main>
  )
}
