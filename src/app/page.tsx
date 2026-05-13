'use client'

import { useRouter } from 'next/navigation'
import { SESSION_KEYS } from '@/types/prd'

const MODOS = [
  {
    id:          'formulario',
    emoji:       '📋',
    titulo:      'Formulário guiado',
    descricao:   'Responda perguntas simples sobre o seu negócio. O sistema entende o contexto e gera o projeto.',
    tempo:       '5–8 minutos',
    badge:       'Recomendado',
    badgeCls:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
    href:        '/formulario',
  },
  {
    id:          'documento',
    emoji:       '📄',
    titulo:      'Enviar documentos',
    descricao:   'Envie até 3 arquivos (PDF, DOCX, TXT, MD). Pode ser briefing, anotações, transcrição de reunião — qualquer coisa.',
    tempo:       'Upload + revisão',
    badge:       'Em breve',
    badgeCls:    'bg-zinc-700/50 text-zinc-500 border-zinc-700',
    href:        '/documento',
    disabled:    true,
  },
  {
    id:          'audio',
    emoji:       '🎙️',
    titulo:      'Enviar áudio',
    descricao:   'Envie uma gravação de voz, reunião ou briefing. O sistema transcreve e extrai as informações.',
    tempo:       'Até 10 minutos',
    badge:       'Em breve',
    badgeCls:    'bg-zinc-700/50 text-zinc-500 border-zinc-700',
    href:        '/audio',
    disabled:    true,
  },
]

export default function HomePage() {
  const router = useRouter()

  function handleModo(modo: string, href: string) {
    if (typeof window !== 'undefined') {
      // Limpa sessão anterior
      Object.values(SESSION_KEYS).forEach((k) => sessionStorage.removeItem(k))
      sessionStorage.setItem(SESSION_KEYS.MODO, modo)
    }
    router.push(href)
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12 max-w-xl">
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400 font-medium mb-6">
          <span>🤖</span>
          <span>Agente Desenvolvedor de PRD</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 leading-tight mb-4">
          Transforme sua ideia em um<br />
          <span className="text-blue-400">projeto pronto para construir</span>
        </h1>

        <p className="text-zinc-400 text-base leading-relaxed">
          Descreva seu negócio e o problema que quer resolver. O sistema entende o contexto,
          pesquisa a melhor arquitetura e entrega o PRD completo com todos os arquivos.
        </p>

        <p className="text-zinc-600 text-sm mt-3">
          Você não precisa saber nada de tecnologia.
        </p>
      </div>

      {/* Cards dos 3 modos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
        {MODOS.map((modo) => (
          <button
            key={modo.id}
            onClick={() => !modo.disabled && handleModo(modo.id, modo.href)}
            disabled={modo.disabled}
            className={`relative group text-left p-5 rounded-2xl border transition-all duration-200 ${
              modo.disabled
                ? 'border-zinc-800 bg-zinc-900/40 cursor-not-allowed opacity-60'
                : 'border-zinc-800 bg-zinc-900 hover:border-blue-500/50 hover:bg-zinc-800/80 cursor-pointer'
            }`}
          >
            {/* Badge */}
            <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border mb-4 ${modo.badgeCls}`}>
              {modo.badge}
            </span>

            {/* Emoji */}
            <div className="text-3xl mb-3">{modo.emoji}</div>

            {/* Título */}
            <h2 className="text-base font-semibold text-zinc-100 mb-2">{modo.titulo}</h2>

            {/* Descrição */}
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">{modo.descricao}</p>

            {/* Tempo */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span>⏱</span>
              <span>{modo.tempo}</span>
            </div>

            {/* Arrow (active only) */}
            {!modo.disabled && (
              <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">
                →
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-10 text-xs text-zinc-600 text-center">
        Marcas Shop · Sistema 2 — Agente Desenvolvedor de PRD
      </p>
    </main>
  )
}
