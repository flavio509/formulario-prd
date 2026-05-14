'use client'

import { useEffect, useState } from 'react'
import DownloadZip from '@/components/DownloadZip'
import { SESSION_KEYS } from '@/types/prd'

interface Resultado {
  arquivos: Record<string, string>
  titulo:   string
  parcial?: boolean
  aviso?:   string | null
}

function formatarTamanho(conteudo: string): string {
  const bytes = new TextEncoder().encode(conteudo).length
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

// Ícone por extensão/nome do arquivo
function iconeArquivo(nome: string): string {
  if (nome.endsWith('.md'))   return '📄'
  if (nome.endsWith('.json')) return '⚙️'
  if (nome.endsWith('.env.example') || nome.includes('.env')) return '🔑'
  if (nome.includes('gitignore')) return '🚫'
  if (nome.includes('openclaw/')) return '🤖'
  return '📝'
}

// Item 5: detecta se o projeto usa OpenClaw (Tipo 4, 5 ou 6)
function detectarTipoUso(arquivos: Record<string, string>): 'openclaw' | 'claude-code' {
  const conteudo = Object.values(arquivos).join('\n')
  if (/openclaw/i.test(conteudo) || /Tipo\s*[456]/i.test(conteudo)) {
    return 'openclaw'
  }
  return 'claude-code'
}

// Agrupa arquivos por categoria para exibição
function agruparArquivos(arquivos: Record<string, string>) {
  const principais: [string, string][] = []
  const openclaw:   [string, string][] = []
  const config:     [string, string][] = []

  for (const [nome, conteudo] of Object.entries(arquivos)) {
    if (nome.startsWith('openclaw/')) {
      openclaw.push([nome, conteudo])
    } else if (nome.startsWith('.') || nome.endsWith('.example')) {
      config.push([nome, conteudo])
    } else {
      principais.push([nome, conteudo])
    }
  }

  return { principais, openclaw, config }
}

export default function ResultadoPage() {
  const [resultado,    setResultado]    = useState<Resultado | null>(null)
  const [arquivoAtivo, setArquivoAtivo] = useState<string>('PRD.md')
  const [erro,         setErro]         = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEYS.RESULTADO)
    if (!raw) {
      setErro('Nenhum resultado encontrado. Por favor, gere o PRD novamente.')
      return
    }
    try {
      setResultado(JSON.parse(raw) as Resultado)
    } catch {
      setErro('Erro ao carregar o resultado. Por favor, gere o PRD novamente.')
    }
  }, [])

  function handleCriarNovo() {
    Object.values(SESSION_KEYS).forEach((k) => sessionStorage.removeItem(k))
    window.location.href = '/'
  }

  if (erro) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Resultado não encontrado</h2>
          <p className="text-sm text-zinc-400 mb-6">{erro}</p>
          <a
            href="/arquitetura"
            className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            ← Voltar à arquitetura
          </a>
        </div>
      </main>
    )
  }

  if (!resultado) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 text-sm animate-pulse">Carregando...</div>
      </main>
    )
  }

  const { arquivos, titulo, parcial, aviso } = resultado
  const { principais, openclaw, config } = agruparArquivos(arquivos)
  const tipoUso = detectarTipoUso(arquivos)
  const totalArquivos = Object.keys(arquivos).length
  const conteudoAtivo = arquivos[arquivoAtivo] ?? ''

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10">

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-zinc-600 mb-8">
          <a href="/" className="hover:text-zinc-400 transition-colors">Início</a>
          <span>›</span>
          <a href="/arquitetura" className="hover:text-zinc-400 transition-colors">Arquitetura</a>
          <span>›</span>
          <span className="text-zinc-400">Resultado</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">

        {/* Banner de geração parcial */}
        {parcial && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
            <span className="text-amber-400 text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-400 mb-0.5">Geração parcial</p>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                {aviso ?? 'PRD.md, CLAUDE.md e PLAN.md foram gerados. Os arquivos de configuração (.env.example, .gitignore, etc.) não foram incluídos por timeout — tente baixar e gerar novamente se precisar deles.'}
              </p>
            </div>
          </div>
        )}

        {/* Cabeçalho de sucesso */}
        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-emerald-400 text-lg">✅</span>
                <span className="text-sm font-semibold text-emerald-400">PRD gerado com sucesso!</span>
              </div>
              <h1 className="text-xl font-bold text-zinc-100">{titulo}</h1>
              <p className="text-xs text-zinc-500 mt-1">
                {totalArquivos} arquivo{totalArquivos !== 1 ? 's' : ''} prontos para download
              </p>
            </div>

            {/* Download principal */}
            <DownloadZip
              titulo={titulo}
              arquivos={arquivos}
              autoDownload={true}
              label="⬇️ Baixar ZIP"
            />
          </div>
        </div>

        {/* Visualizador de arquivos */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">

          {/* Tabs de arquivo */}
          <div className="flex items-center gap-1 p-3 border-b border-zinc-800 overflow-x-auto scrollbar-hide">
            {Object.keys(arquivos).map((nome) => (
              <button
                key={nome}
                type="button"
                onClick={() => setArquivoAtivo(nome)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  arquivoAtivo === nome
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
                }`}
              >
                {iconeArquivo(nome)} {nome.split('/').pop()}
              </button>
            ))}
          </div>

          {/* Conteúdo do arquivo ativo */}
          <div className="relative">
            <div className="absolute top-3 right-3 text-xs text-zinc-600">
              {arquivoAtivo} · {formatarTamanho(conteudoAtivo)}
            </div>
            <pre className="p-5 pt-10 text-xs text-zinc-300 font-mono leading-relaxed overflow-x-auto max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words">
              {conteudoAtivo}
            </pre>
          </div>
        </div>

        {/* Lista de arquivos no ZIP */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">
            📁 Arquivos incluídos no ZIP ({totalArquivos})
          </h2>

          <div className="space-y-4">
            {/* Documentação principal */}
            {principais.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 uppercase tracking-wide mb-2">Documentação</p>
                <div className="space-y-1">
                  {principais.map(([nome, conteudo]) => (
                    <button
                      key={nome}
                      type="button"
                      onClick={() => setArquivoAtivo(nome)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition-colors text-left group"
                    >
                      <span className="flex items-center gap-2 text-sm text-zinc-300 group-hover:text-zinc-100">
                        <span className="text-base">{iconeArquivo(nome)}</span>
                        {nome}
                      </span>
                      <span className="text-xs text-zinc-600">{formatarTamanho(conteudo)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Configuração */}
            {config.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 uppercase tracking-wide mb-2">Configuração</p>
                <div className="space-y-1">
                  {config.map(([nome, conteudo]) => (
                    <button
                      key={nome}
                      type="button"
                      onClick={() => setArquivoAtivo(nome)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition-colors text-left group"
                    >
                      <span className="flex items-center gap-2 text-sm text-zinc-300 group-hover:text-zinc-100">
                        <span className="text-base">{iconeArquivo(nome)}</span>
                        {nome}
                      </span>
                      <span className="text-xs text-zinc-600">{formatarTamanho(conteudo)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* OpenClaw */}
            {openclaw.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 uppercase tracking-wide mb-2">
                  🤖 OpenClaw (agente autônomo)
                </p>
                <div className="space-y-1">
                  {openclaw.map(([nome, conteudo]) => (
                    <button
                      key={nome}
                      type="button"
                      onClick={() => setArquivoAtivo(nome)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition-colors text-left group"
                    >
                      <span className="flex items-center gap-2 text-sm text-zinc-300 group-hover:text-zinc-100">
                        <span className="text-base">{iconeArquivo(nome)}</span>
                        {nome}
                      </span>
                      <span className="text-xs text-zinc-600">{formatarTamanho(conteudo)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Item 5: instrução de uso — detecta Claude Code vs OpenClaw */}
        {tipoUso === 'claude-code' ? (
          <div className="p-4 rounded-xl border border-zinc-700/50 bg-zinc-900/30 text-sm text-zinc-400 leading-relaxed">
            💡 <strong className="text-zinc-300">Como usar:</strong> Extraia o ZIP, abra o terminal na pasta e
            rode <code className="text-blue-400 text-xs bg-zinc-800 px-1.5 py-0.5 rounded">claude</code>.
            Cole o conteúdo do <strong className="text-zinc-300">CLAUDE.md</strong> na primeira mensagem
            e depois execute o <strong className="text-zinc-300">PLAN.md</strong> milestone por milestone.
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 text-sm text-zinc-400 leading-relaxed space-y-2">
            <p>🤖 <strong className="text-zinc-300">Este projeto requer OpenClaw.</strong></p>
            <p>
              Instale primeiro:{' '}
              <code className="text-purple-400 text-xs bg-zinc-800 px-1.5 py-0.5 rounded">npm install -g openclaw</code>
            </p>
            <p>
              Depois:{' '}
              <code className="text-purple-400 text-xs bg-zinc-800 px-1.5 py-0.5 rounded">openclaw init</code>
              {' '}→ cole o conteúdo do{' '}
              <strong className="text-zinc-300">SOUL.md</strong> e{' '}
              <strong className="text-zinc-300">AGENTS.md</strong>
            </p>
            <p>
              Documentação:{' '}
              <a
                href="https://docs.openclaw.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline"
              >
                docs.openclaw.dev
              </a>
            </p>
          </div>
        )}

        {/* Ações finais */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pb-10">
          <button
            type="button"
            onClick={handleCriarNovo}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-medium hover:border-zinc-500 hover:text-zinc-100 transition-colors"
          >
            + Criar novo PRD
          </button>

          <DownloadZip
            titulo={titulo}
            arquivos={arquivos}
            label="⬇️ Baixar ZIP novamente"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
          />
        </div>
      </div>
    </main>
  )
}
