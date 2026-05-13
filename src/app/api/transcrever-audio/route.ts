import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { getOpenAIClient }    from '@/lib/openai'
import { getAnthropicClient } from '@/lib/anthropic'
import { parseFields, toList } from '@/lib/parse-fields'
import type { RascunhoPRD } from '@/types/prd'

export const maxDuration = 60

const TIPOS_ACEITOS = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/webm']

// ─── Prompt do sistema ────────────────────────────────────────────────────────

const SISTEMA = `Você é um especialista em análise de negócios e arquitetura de sistemas.
Responda SOMENTE usando o formato de campos delimitados especificado.
Não use JSON, markdown, blocos de código ou qualquer outra formatação.
Cada campo deve estar entre ===FIELD: nome=== e ===END===.
Para campos de lista: um item por linha, sem marcadores, sem numeração.
Não inclua nenhum texto fora dos delimitadores.`

// ─── Schema de saída (delimitadores) ─────────────────────────────────────────

const SCHEMA_CAMPOS = `Retorne EXATAMENTE nesta estrutura, sem nenhum texto fora dos delimitadores:

===FIELD: titulo===
[Nome sugestivo para o projeto — 3-6 palavras, específico para o negócio]
===END===
===FIELD: problema===
[Descrição do problema em 2-3 parágrafos. Texto livre, pode ter múltiplas linhas.]
===END===
===FIELD: solucao_proposta===
[O SISTEMA DE SOFTWARE que será construído para resolver o problema. Descreva as automações, integrações e funcionalidades do sistema — NÃO transcreva ou resuma a fala. 2-3 parágrafos.]
===END===
===FIELD: funcionalidades_principais===
[lista — uma funcionalidade por linha, sem marcadores]
===END===
===FIELD: o_que_sistema_faz===
[lista — uma tarefa automatizada por linha, sem marcadores]
===END===
===FIELD: o_que_usuario_faz===
[lista — uma tarefa humana por linha, sem marcadores]
===END===
===FIELD: restricoes===
[lista — uma restrição por linha, sem marcadores]
===END===
===FIELD: usuarios===
[OBRIGATÓRIO. Perfil de quem usará o sistema, frequência de uso e principal dor emocional que o sistema resolve. Infira pelo contexto se não estiver explícito. Nunca deixe em branco.]
===END===
===FIELD: metricas_sucesso===
[OBRIGATÓRIO. 3-5 métricas mensuráveis, uma por linha, sem marcadores. Ex: Redução de 50% no tempo de processamento. Gere mesmo que a fala não as cite.]
===END===
===FIELD: notas_adicionais===
[Observações relevantes. Pode ter múltiplas linhas. Inclua: Fonte: áudio transcrito.]
===END===`

// ─── Parser: campos → RascunhoPRD ─────────────────────────────────────────────

function parseCamposRascunho(campos: Record<string, string>): RascunhoPRD {
  return {
    titulo:                    campos.titulo                    ?? '',
    problema:                  campos.problema                  ?? '',
    solucao_proposta:          campos.solucao_proposta          ?? '',
    funcionalidades_principais: toList(campos.funcionalidades_principais ?? ''),
    o_que_sistema_faz:         toList(campos.o_que_sistema_faz  ?? ''),
    o_que_usuario_faz:         toList(campos.o_que_usuario_faz  ?? ''),
    restricoes:                toList(campos.restricoes          ?? ''),
    usuarios:                  campos.usuarios                  ?? '',
    metricas_sucesso:          toList(campos.metricas_sucesso    ?? ''),
    notas_adicionais:          campos.notas_adicionais          ?? '',
  }
}

// ─── Prompt de extração ───────────────────────────────────────────────────────

function promptTranscricao(transcricao: string): string {
  return `Analise a transcrição abaixo e extraia um rascunho estruturado do projeto.
NÃO copie frases verbatim da transcrição — sintetize com suas próprias palavras.
Use linguagem clara em português do Brasil, sem jargão técnico.
Extraia informações concretas mesmo que a fala seja informal ou repetitiva.
Se algo não estiver claro, infira pelo contexto e indique nas notas_adicionais.

ATENÇÃO — campos obrigatórios:
- "solucao_proposta" deve descrever o SISTEMA DE SOFTWARE a ser construído, não resumir a fala.
- "usuarios" é obrigatório — identifique quem usará o sistema; infira pelo contexto se não estiver explícito.
- "metricas_sucesso" é obrigatório — gere 3-5 métricas mensuráveis mesmo que a fala não as cite.

TRANSCRIÇÃO:
${transcricao}

${SCHEMA_CAMPOS}`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let blobUrl: string | null = null

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Envie o áudio como multipart/form-data' }, { status: 400 })
  }

  try {
    const form  = await req.formData()
    const audio = form.get('audio') as File | null

    if (!audio) {
      return NextResponse.json({ error: 'Arquivo de áudio não enviado' }, { status: 400 })
    }

    const ext        = audio.name.split('.').pop()?.toLowerCase() ?? ''
    const tipoValido = TIPOS_ACEITOS.includes(audio.type) ||
      ['mp3', 'm4a', 'wav', 'aac', 'webm'].includes(ext)

    if (!tipoValido) {
      return NextResponse.json(
        { error: `Formato não aceito: ${audio.type || ext}. Use MP3, M4A ou WAV.` },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await audio.arrayBuffer())

    // ── 1. Salva no Vercel Blob (temporário) ──────────────────────────────────
    const blob = await put(`audio-temp/${Date.now()}-${audio.name}`, buffer, {
      access: 'public', contentType: audio.type || 'audio/mpeg',
    })
    blobUrl = blob.url

    // ── 2. Transcreve com Whisper ─────────────────────────────────────────────
    const openai      = getOpenAIClient()
    const transcricao = await openai.audio.transcriptions.create({
      model:    'whisper-1',
      file:     new File([buffer], audio.name, { type: audio.type || 'audio/mpeg' }),
      language: 'pt',
    })

    // ── 3. Deleta do Blob ─────────────────────────────────────────────────────
    await del(blobUrl).catch(() => {})
    blobUrl = null

    if (!transcricao.text?.trim()) {
      return NextResponse.json(
        { error: 'Não foi possível transcrever o áudio. Verifique se o arquivo tem conteúdo de fala.' },
        { status: 422 }
      )
    }

    // ── 4. Claude extrai RascunhoPRD com delimitadores ───────────────────────
    const anthropic = getAnthropicClient()
    const message   = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 2048,
      system:     SISTEMA,
      messages:   [{ role: 'user', content: promptTranscricao(transcricao.text) }],
    })

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    return NextResponse.json(parseCamposRascunho(parseFields(rawText)))

  } catch (err: unknown) {
    if (blobUrl) await del(blobUrl).catch(() => {})
    console.error('[transcrever-audio]', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
