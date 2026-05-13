'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { RascunhoPRD, ArquiteturaPRD } from '@/types/prd'
import { SESSION_KEYS } from '@/types/prd'

type Estado = 'gerando' | 'erro'

const PASSOS = [
  { emoji: '✍️', texto: 'Redigindo PRD completo...' },
  { emoji: '📋', texto: 'Criando CLAUDE.md e PLAN.md...' },
  { emoji: '⚙️', texto: 'Gerando arquivos de configuração...' },
  { emoji: '📦', texto: 'Preparando pacote final...' },
]

export default function GerarPage() {
  const router = useRouter()

  const [passo, setPasso] = useState(0)
  const [estado, setEstado] = useState<Estado>('gerando')
  const [erro, setErro]     = useState('')

  const chamouRef = useRef(false)

  // Animação de passos
  useEffect(() => {
    if (estado !== 'gerando') return
    const id = setInterval(() => setPasso((p) => (p + 1) % PASSOS.length), 4_000)
    return () => clearInterval(id)
  }, [estado])

  // Chama a API de geração
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

    fetch('/api/gerar-prd', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rascunho, arquitetura }),
    })
      .then(async (res) => {
        // Trata erros HTTP antes de tentar JSON.parse —
        // evita "Unexpected token" quando Vercel retorna HTML/texto em 504/524.
        if (!res.ok) {
          // Lê o body UMA só vez como texto — stream não pode ser consumido duas vezes.
          // Se for JSON estruturado ({ error: "..." }) extrai a mensagem; caso contrário
          // usa o texto bruto (ex: HTML de timeout do Vercel), truncado para exibição.
          const texto = await res.text()
          let mensagem = `Erro HTTP ${res.status}`
          try { mensagem = (JSON.parse(texto) as { error?: string }).error ?? mensagem } catch {}
          if (mensagem === `Erro HTTP ${res.status}`) mensagem = texto.slice(0, 300) || mensagem
          throw new Error(mensagem)
        }

        const data = await res.json() as {
          arquivos?: Record<string, string>
          titulo?:   string
          parcial?:  boolean
          aviso?:    string
          error?:    string
        }
        if (data.error) throw new Error(data.error)
        if (!data.arquivos || Object.keys(data.arquivos).length === 0) {
          throw new Error('Nenhum arquivo foi gerado. Tente novamente.')
        }

        sessionStorage.setItem(SESSION_KEYS.RESULTADO, JSON.stringify({
          arquivos: data.arquivos,
          titulo:   data.titulo ?? rascunho.titulo,
          parcial:  data.parcial ?? false,
          aviso:    data.aviso   ?? null,
        }))
        sessionStorage.setItem(SESSION_KEYS.STATUS, 'gerado')

        router.push('/resultado')
      })
      .catch((err: unknown) => {
        setErro(err instanceof Error ? err.message : 'Erro desconhecido ao gerar o PRD.')
        setEstado('erro')
      })
  }, [router])

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">

      {/* Gerando */}
      {estado === 'gerando' && (
        <div className="text-center max-w-md">
          <div className="text-5xl mb-6 animate-pulse">{PASSOS[passo].emoji}</div>
          <h1 className="text-xl font-bold text-zinc-100 mb-2">Gerando seu PRD</h1>
          <p className="text-zinc-300 font-medium mb-1">{PASSOS[passo].texto}</p>
          <p className="text-xs text-zinc-600 mb-8">
            O Claude está redigindo todos os arquivos do projeto...
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5">
            {PASSOS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                  i === passo ? 'bg-blue-400 scale-125' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>
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
                setPasso(0)
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
