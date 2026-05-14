'use client'

import { useState, useRef, useCallback } from 'react'

const TIPOS_ACEITOS = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']
const EXTENSOES     = ['.pdf', '.docx', '.txt', '.md']
const MAX_ARQUIVOS  = 3
const MAX_BYTES     = 10 * 1024 * 1024 // 10 MB

function iconeArquivo(tipo: string) {
  if (tipo === 'application/pdf') return '📄'
  if (tipo.includes('word'))       return '📝'
  return '📃'
}

function tamanhoLegivel(bytes: number) {
  if (bytes < 1024)          return `${bytes} B`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface Props {
  onSubmit: (arquivos: File[]) => void
  loading?:  boolean
}

export default function UploadDocumentos({ onSubmit, loading = false }: Props) {
  const [arquivos,  setArquivos]  = useState<File[]>([])
  const [arrastando, setArrastando] = useState(false)
  const [erros,     setErros]     = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const validar = useCallback((novos: File[]): { validos: File[]; erros: string[] } => {
    const erros: string[] = []
    const validos: File[] = []

    for (const f of novos) {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      const tipoOk = TIPOS_ACEITOS.includes(f.type) || ['pdf', 'docx', 'txt', 'md'].includes(ext)
      if (!tipoOk) {
        erros.push(`"${f.name}" — formato não aceito (use PDF, DOCX, TXT ou MD)`)
        continue
      }
      if (f.size > MAX_BYTES) {
        erros.push(`"${f.name}" — arquivo muito grande (máx 10 MB)`)
        continue
      }
      validos.push(f)
    }
    return { validos, erros }
  }, [])

  const adicionarArquivos = useCallback((lista: FileList | File[]) => {
    const novos = Array.from(lista)
    const { validos, erros: errosNovos } = validar(novos)
    setErros(errosNovos)

    setArquivos((prev) => {
      const combinados = [...prev, ...validos]
      if (combinados.length > MAX_ARQUIVOS) {
        setErros((e) => [...e, `Máximo de ${MAX_ARQUIVOS} arquivos. Os últimos foram ignorados.`])
        return combinados.slice(0, MAX_ARQUIVOS)
      }
      return combinados
    })
  }, [validar])

  function remover(index: number) {
    setArquivos((prev) => prev.filter((_, i) => i !== index))
    setErros([])
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setArrastando(false)
    if (e.dataTransfer.files.length) adicionarArquivos(e.dataTransfer.files)
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">

      {/* Zona de drop */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
        onDragLeave={() => setArrastando(false)}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
          arrastando
            ? 'border-indigo-500 bg-indigo-500/5'
            : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/60'
        }`}
      >
        <span className="text-4xl">{arrastando ? '📂' : '📁'}</span>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-200">
            {arrastando ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            PDF, DOCX, TXT ou MD · até 10 MB por arquivo · máx {MAX_ARQUIVOS} arquivos
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={EXTENSOES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && adicionarArquivos(e.target.files)}
        />
      </div>

      {/* Erros */}
      {erros.length > 0 && (
        <div className="space-y-1">
          {erros.map((e, i) => (
            <p key={i} className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 px-3 py-2 rounded-lg">
              ⚠️ {e}
            </p>
          ))}
        </div>
      )}

      {/* Lista de arquivos selecionados */}
      {arquivos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            {arquivos.length} de {MAX_ARQUIVOS} arquivos selecionados
          </p>
          {arquivos.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900/60"
            >
              <span className="text-xl flex-shrink-0">{iconeArquivo(f.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{f.name}</p>
                <p className="text-xs text-zinc-500">{tamanhoLegivel(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => remover(i)}
                className="text-zinc-600 hover:text-red-400 transition-colors text-sm px-1 flex-shrink-0"
                title="Remover"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dica */}
      {arquivos.length === 0 && (
        <p className="text-xs text-zinc-600 text-center leading-relaxed">
          Pode ser qualquer coisa: briefing, anotações, transcrição de reunião,
          plano de negócio, material de curso, planilha exportada como texto.
        </p>
      )}

      {/* Botão */}
      <button
        type="button"
        onClick={() => onSubmit(arquivos)}
        disabled={arquivos.length === 0 || loading}
        className="w-full py-3 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin text-base">⏳</span>
            Analisando documentos...
          </>
        ) : (
          `Analisar ${arquivos.length > 0 ? arquivos.length : ''} documento${arquivos.length !== 1 ? 's' : ''} →`
        )}
      </button>
    </div>
  )
}
