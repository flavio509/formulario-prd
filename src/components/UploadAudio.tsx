'use client'

import { useState, useRef } from 'react'

const TIPOS_ACEITOS = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/m4a', 'audio/aac']
const EXTENSOES     = ['.mp3', '.m4a', '.wav', '.aac']
const MAX_BYTES     = 25 * 1024 * 1024 // 25 MB (≈ 10 min MP3 128kbps com margem)

function tamanhoLegivel(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface Props {
  onSubmit: (arquivo: File) => void
  loading?:  boolean
}

export default function UploadAudio({ onSubmit, loading = false }: Props) {
  const [arquivo,    setArquivo]    = useState<File | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const [erro,       setErro]       = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function validar(f: File): string | null {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    const tipoOk = TIPOS_ACEITOS.includes(f.type) || EXTENSOES.map(e => e.slice(1)).includes(ext)
    if (!tipoOk) return `Formato não aceito. Use MP3, M4A ou WAV.`
    if (f.size > MAX_BYTES) return `Arquivo muito grande (máx 25 MB, ≈ 10 min de áudio).`
    return null
  }

  function handleArquivo(f: File) {
    const err = validar(f)
    if (err) { setErro(err); setArquivo(null); return }
    setErro('')
    setArquivo(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setArrastando(false)
    const f = e.dataTransfer.files[0]
    if (f) handleArquivo(f)
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">

      {/* Zona de drop */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
        onDragLeave={() => setArrastando(false)}
        onClick={() => !arquivo && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed transition-all ${
          arquivo
            ? 'border-zinc-700 bg-zinc-900/40 cursor-default'
            : arrastando
              ? 'border-blue-500 bg-blue-500/5 cursor-copy'
              : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/60 cursor-pointer'
        }`}
      >
        {arquivo ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-4xl">🎙️</span>
            <p className="text-sm font-semibold text-zinc-200">{arquivo.name}</p>
            <p className="text-xs text-zinc-500">{tamanhoLegivel(arquivo.size)}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setArquivo(null) }}
              className="mt-1 text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              Trocar arquivo
            </button>
          </div>
        ) : (
          <>
            <span className="text-4xl">{arrastando ? '🎙️' : '🎵'}</span>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-200">
                {arrastando ? 'Solte o áudio aqui' : 'Arraste o áudio ou clique para selecionar'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                MP3, M4A ou WAV · até 10 minutos de áudio
              </p>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={EXTENSOES.join(',')}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleArquivo(f) }}
        />
      </div>

      {/* Erro */}
      {erro && (
        <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 px-3 py-2 rounded-lg">
          ⚠️ {erro}
        </p>
      )}

      {/* Dicas */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-600 leading-relaxed">
          💡 Pode ser qualquer gravação: reunião com sócios, briefing de voz, nota de voz,
          conversa com cliente. O sistema transcreve e extrai o que é relevante para o projeto.
        </p>
        <p className="text-xs text-zinc-600">
          🔒 O áudio é deletado automaticamente após a transcrição.
        </p>
      </div>

      {/* Aviso de duração */}
      {arquivo && (
        <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-xs text-yellow-400 leading-relaxed">
          ⏱ A transcrição pode levar 30–60 segundos dependendo do tamanho do arquivo.
          Não feche a aba enquanto processa.
        </div>
      )}

      {/* Botão */}
      <button
        type="button"
        onClick={() => arquivo && onSubmit(arquivo)}
        disabled={!arquivo || loading}
        className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin text-base">⏳</span>
            Transcrevendo e analisando...
          </>
        ) : (
          'Transcrever e analisar →'
        )}
      </button>
    </div>
  )
}
