'use client'

import { useEffect, useCallback } from 'react'

interface Props {
  titulo:        string
  arquivos:      Record<string, string>
  autoDownload?: boolean
  className?:    string
  label?:        string
}

function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50)
}

export default function DownloadZip({
  titulo,
  arquivos,
  autoDownload = false,
  className,
  label = '⬇️ Baixar ZIP',
}: Props) {
  const baixar = useCallback(async () => {
    // JSZip é importado dinamicamente — só roda no browser, nunca no server
    const JSZip = (await import('jszip')).default
    const zip   = new JSZip()

    for (const [caminho, conteudo] of Object.entries(arquivos)) {
      // Dotfiles (.env.example, .gitignore) ficam ocultos no Finder do macOS —
      // renomeia para nomes visíveis sem perder o conteúdo.
      const nomeZip = caminho === '.env.example' ? 'env.example'
                    : caminho === '.gitignore'   ? 'gitignore.txt'
                    : caminho
      zip.file(nomeZip, conteudo)
    }

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${slugify(titulo)}-prd.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [titulo, arquivos])

  useEffect(() => {
    if (autoDownload) baixar()
  }, [autoDownload, baixar])

  return (
    <button
      type="button"
      onClick={baixar}
      className={
        className ??
        'px-8 py-3 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-2'
      }
    >
      {label}
    </button>
  )
}
