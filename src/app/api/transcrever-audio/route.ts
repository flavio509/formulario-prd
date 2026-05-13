import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { jsonrepair } from 'jsonrepair'
import { getOpenAIClient }    from '@/lib/openai'
import { getAnthropicClient } from '@/lib/anthropic'
import type { RascunhoPRD } from '@/types/prd'

export const maxDuration = 60

const TIPOS_ACEITOS = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/webm']

// ─── Prompt do sistema (escaping explícito) ───────────────────────────────────

const SISTEMA = `Você é um especialista em análise de negócios e arquitetura de sistemas.
Responda SOMENTE com JSON válido e bem formado, sem markdown, sem texto antes ou depois.
REGRAS CRÍTICAS DE FORMATAÇÃO:
1. Todos os campos de texto devem estar em uma única linha lógica.
2. Para quebras de parágrafo dentro de strings, use a sequência de escape \\n (barra-n).
3. Aspas dentro de strings devem ser escapadas como \\".
4. Nunca inclua caracteres de controle literais dentro de strings JSON.
5. Arrays devem ter vírgula apenas entre elementos — sem vírgula após o último.`

const SCHEMA_JSON = `Retorne exatamente este JSON (sem chaves extras, sem markdown):
{
  "titulo": "Nome sugestivo para o projeto (3-6 palavras, específico para o negócio)",
  "problema": "Descrição em 2-3 parágrafos separados por \\n\\n. Específico ao negócio.",
  "solucao_proposta": "O que o sistema fará. 2-3 parágrafos separados por \\n\\n.",
  "funcionalidades_principais": ["funcionalidade 1", "funcionalidade 2"],
  "o_que_sistema_faz": ["tarefa automatizada 1", "tarefa automatizada 2"],
  "o_que_usuario_faz": ["tarefa humana 1", "tarefa humana 2"],
  "restricoes": ["restricao 1", "restricao 2"],
  "usuarios": "Quem usa e qual dor emocional resolve",
  "metricas_sucesso": ["metrica 1", "metrica 2"],
  "notas_adicionais": "Observações relevantes separadas por \\n se necessário. [Fonte: áudio transcrito]"
}`

function promptTranscricao(transcricao: string): string {
  return `Analise a transcrição abaixo e extraia um rascunho estruturado do projeto.
NÃO copie frases verbatim da transcrição — sintetize com suas próprias palavras.
Use linguagem clara em português do Brasil, sem jargão técnico.
Extraia informações concretas mesmo que a fala seja informal ou repetitiva.
Se algo não estiver claro, infira pelo contexto e indique nas notas_adicionais.

TRANSCRIÇÃO:
${transcricao}

${SCHEMA_JSON}`
}

// ─── Parsing robusto em 3 camadas ─────────────────────────────────────────────

function parseClaudeJSON(texto: string): RascunhoPRD {
  const limpo = texto
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im,     '')
    .replace(/\s*```\s*$/,    '')
    .trim()

  // Camada 1 — parse direto
  try { return JSON.parse(limpo) as RascunhoPRD } catch { /* segue */ }

  // Camada 2 — extrai bloco {...}
  const match = limpo.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) as RascunhoPRD } catch { /* segue */ }
  }

  // Camada 3 — jsonrepair
  const alvo = match?.[0] ?? limpo
  try {
    return JSON.parse(jsonrepair(alvo)) as RascunhoPRD
  } catch (err) {
    throw new Error(
      `Não foi possível parsear a resposta do Claude após 3 tentativas. ` +
      `Erro final: ${err instanceof Error ? err.message : String(err)}`
    )
  }
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
    const openai       = getOpenAIClient()
    const transcricao  = await openai.audio.transcriptions.create({
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

    // ── 4. Claude extrai RascunhoPRD — com parsing robusto ───────────────────
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

    return NextResponse.json(parseClaudeJSON(rawText))

  } catch (err: unknown) {
    if (blobUrl) await del(blobUrl).catch(() => {})
    console.error('[transcrever-audio]', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
