'use client'

import { useState } from 'react'
import type { RascunhoPRD } from '@/types/prd'

interface Props {
  rascunho:    RascunhoPRD
  onConfirmar: (atualizado: RascunhoPRD) => void
  loading?:    boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SecaoTexto({
  label, value, onChange, rows = 3,
}: {
  label: string; value: string; onChange: (v: string) => void; rows?: number
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900/60 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/70 resize-none transition-colors leading-relaxed"
      />
    </div>
  )
}

function SecaoLista({
  label, value, onChange,
}: {
  label: string; value: string[]; onChange: (v: string[]) => void
}) {
  function updateItem(index: number, novo: string) {
    const next = [...value]
    next[index] = novo
    onChange(next)
  }

  function addItem() {
    onChange([...value, ''])
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">
        {label}
      </label>
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="mt-3 text-zinc-600 text-xs flex-shrink-0">•</span>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900/60 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/70 transition-colors"
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="mt-2 text-zinc-600 hover:text-red-400 transition-colors text-sm px-1"
              title="Remover"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
      >
        + Adicionar item
      </button>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RevisaoRascunho({ rascunho, onConfirmar, loading = false }: Props) {
  const [data, setData] = useState<RascunhoPRD>(rascunho)

  function set<K extends keyof RascunhoPRD>(field: K, value: RascunhoPRD[K]) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">

      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📝</span>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Rascunho</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">{data.titulo || 'Seu projeto'}</h1>
        <p className="text-sm text-zinc-400">
          Revise o que o sistema entendeu. Corrija o que estiver errado e complemente o que faltou.
          Só então confirme.
        </p>
      </div>

      {/* Título do projeto */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Nome do projeto
        </label>
        <input
          type="text"
          value={data.titulo}
          onChange={(e) => set('titulo', e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900/60 text-base font-semibold text-zinc-100 focus:outline-none focus:border-blue-500/70 transition-colors"
        />
      </div>

      {/* Problema */}
      <SecaoTexto
        label="Problema identificado"
        value={data.problema}
        onChange={(v) => set('problema', v)}
        rows={5}
      />

      {/* Solução */}
      <SecaoTexto
        label="Solução proposta"
        value={data.solucao_proposta}
        onChange={(v) => set('solucao_proposta', v)}
        rows={5}
      />

      {/* Funcionalidades */}
      <SecaoLista
        label="Funcionalidades principais"
        value={data.funcionalidades_principais}
        onChange={(v) => set('funcionalidades_principais', v)}
      />

      {/* Humano vs Sistema */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SecaoLista
          label="✅ O que o sistema faz"
          value={data.o_que_sistema_faz}
          onChange={(v) => set('o_que_sistema_faz', v)}
        />
        <SecaoLista
          label="👤 O que você faz"
          value={data.o_que_usuario_faz}
          onChange={(v) => set('o_que_usuario_faz', v)}
        />
      </div>

      {/* Restrições */}
      <SecaoLista
        label="🚫 Restrições (o que o sistema NÃO faz)"
        value={data.restricoes}
        onChange={(v) => set('restricoes', v)}
      />

      {/* Usuários */}
      <SecaoTexto
        label="Usuários e personas"
        value={data.usuarios}
        onChange={(v) => set('usuarios', v)}
        rows={2}
      />

      {/* Métricas */}
      <SecaoLista
        label="📊 Métricas de sucesso"
        value={data.metricas_sucesso}
        onChange={(v) => set('metricas_sucesso', v)}
      />

      {/* Notas */}
      <SecaoTexto
        label="Notas adicionais"
        value={data.notas_adicionais}
        onChange={(v) => set('notas_adicionais', v)}
        rows={3}
      />

      {/* Aviso */}
      <div className="p-4 rounded-xl border border-zinc-700/50 bg-zinc-900/30 text-sm text-zinc-400 leading-relaxed">
        💡 <strong className="text-zinc-300">Não precisa ser perfeito.</strong> Após confirmar,
        o Agente Arquiteto vai pesquisar a melhor tecnologia e propor a arquitetura. Você poderá
        ajustar antes do PRD ser gerado.
      </div>

      {/* Botão confirmar */}
      <div className="flex justify-end pb-10">
        <button
          type="button"
          onClick={() => onConfirmar(data)}
          disabled={loading || !data.titulo.trim()}
          className="px-8 py-3 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              Processando...
            </>
          ) : (
            '✓ Confirmar rascunho →'
          )}
        </button>
      </div>
    </div>
  )
}
