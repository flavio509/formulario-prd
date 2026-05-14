'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { RascunhoPRD, ArquiteturaPRD } from '@/types/prd'
import { SESSION_KEYS } from '@/types/prd'

type Estado = 'gerando' | 'erro'

type SSEData =
  | { type: 'progress'; percent: number; status: string }
  | { type: 'done'; arquivos: Record<string, string>; titulo: string; parcial: boolean; aviso?: string }
  | { type: 'error'; message: string }

export default function GerarPage() {
  const router = useRouter()

  const [estado,      setEstado]      = useState<Estado>('gerando')
  const [erro,        setErro]        = useState('')
  const [progresso,   setProgresso]   = useState(0)
  const [statusTexto, setStatusTexto] = useState('Iniciando geração...')

  const chamouRef = useRef(false)

  useEffect(() => {
    if (chamouRef.current) return
    chamouRef.current = true

    const rawRascunho    = sessionStorage.getItem(SESSION_KEYS.RASCUNHO)
    const rawArquitetura = sessionStorage.getItem(SESSION_KEYS.ARQUITETURA)

    if (!rawRascunho || !rawArquitetura) {
      setErro('Dados incompletos. Você precisa confirmar o rascunho e aprovar a arquitetura antes de gerar o PRD.')
      setEstado('erro')
      return
    }

    let rascunho: RascunhoPRD
    let arquitetura: ArquiteturaPRD

    try {
      rascunho    = JSON.parse(rawRascunho)    as RascunhoPRD
      arquitetura = JSON.parse(rawArquitetura) as ArquiteturaPRD
    } catch {
      setErro('Erro ao carregar os dados da sessão. Por favor, recomece o fluxo.')
      setEstado('erro')
      return
    }

    async function gerarPRD() {
      // Usa a VPS quando NEXT_PUBLIC_GERAR_PRD_URL estiver definida (produção).
      // Cai para a rota Vercel local como fallback (dev / VPS indisponível).
      const vpsUrl = process.env.NEXT_PUBLIC_GERAR_PRD_URL
      const token  = process.env.NEXT_PUBLIC_GERAR_PRD_TOKEN
      const url    = vpsUrl ? `${vpsUrl}/gerar-prd` : '/api/gerar-prd'

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (vpsUrl && token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body:   JSON.stringify({ rascunho, arquitetura }),
      })

      // Erros HTTP antes do stream (400 de validação, etc.)
      // Body lido UMA só vez como texto para evitar "stream already read"
      if (!res.ok || !res.body) {
        const texto = await res.text()
        let mensagem = `Erro HTTP ${res.status}`
        try { mensagem = (JSON.parse(texto) as { error?: string }).error ?? mensagem } catch {}
        if (mensagem === `Erro HTTP ${res.status}`) mensagem = texto.slice(0, 300) || mensagem
        throw new Error(mensagem)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Lê o stream de SSE progressivamente
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Processa todos os eventos SSE completos (separados por \n\n)
        const eventos = buffer.split('\n\n')
        buffer = eventos.pop() ?? '' // último fragmento ainda incompleto

        for (const evento of eventos) {
          const linha = evento.trim()
          if (!linha.startsWith('data: ')) continue

          let data: SSEData
          try {
            data = JSON.parse(linha.slice(6)) as SSEData
          } catch {
            continue // evento malformado — ignora silenciosamente
          }

          if (data.type === 'progress') {
            setProgresso(data.percent)
            setStatusTexto(data.status)

          } else if (data.type === 'done') {
            setProgresso(100)
            console.log('arquivos recebidos do SSE:', Object.keys(data.arquivos))
            sessionStorage.setItem(SESSION_KEYS.RESULTADO, JSON.stringify({
              arquivos: data.arquivos,
              titulo:   data.titulo,
              parcial:  data.parcial,
              aviso:    data.aviso ?? null,
            }))
            console.log('arquivos no sessionStorage:', Object.keys(JSON.parse(sessionStorage.getItem('prd-resultado') || '{}')))
            sessionStorage.setItem(SESSION_KEYS.STATUS, 'gerado')
            router.push('/resultado')
            return

          } else if (data.type === 'error') {
            throw new Error(data.message)
          }
        }
      }

      // Stream fechado sem evento 'done' — função cortada pelo Vercel antes de concluir
      throw new Error('A geração foi interrompida antes de concluir. Tente novamente.')
    }

    gerarPRD().catch((err: unknown) => {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido ao gerar o PRD.')
      setEstado('erro')
    })
  }, [router])

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">

      {/* Gerando */}
      {estado === 'gerando' && (
        <div className="text-center max-w-sm w-full">
          <div className="text-5xl mb-6">⚙️</div>
          <h1 className="text-xl font-bold text-zinc-100 mb-2">Gerando seu PRD</h1>
          <p className="text-sm text-zinc-500 mb-8">
            O Claude está redigindo os arquivos do projeto em tempo real.
          </p>

          {/* Barra de progresso */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-zinc-500 mb-2">
              <span className="truncate max-w-[210px] text-left">{statusTexto}</span>
              <span className="flex-shrink-0 ml-2 tabular-nums">{progresso}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-zinc-700">Pode levar até 60 segundos...</p>
        </div>
      )}

      {/* Erro */}
      {estado === 'erro' && (
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Erro na geração</h2>
          <p className="text-sm text-zinc-400 mb-6">{erro}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/arquitetura"
              className="inline-block px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-500 transition-colors"
            >
              ← Voltar à arquitetura
            </a>
            <button
              type="button"
              onClick={() => {
                chamouRef.current = false
                setEstado('gerando')
                setErro('')
                setProgresso(0)
                setStatusTexto('Iniciando geração...')
              }}
              className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              ↺ Tentar novamente
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
