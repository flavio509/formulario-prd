import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { getOpenAIClient }    from '@/lib/openai'
import { getAnthropicClient } from '@/lib/anthropic'
import type { RascunhoPRD } from '@/types/prd'

export const maxDuration = 60

const TIPOS_ACEITOS = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/webm']

const SCHEMA_JSON = `{
  "titulo": "Nome sugestivo para o projeto (3-6 palavras, específico para o negócio)",
  "problema": "Descrição clara do problema em 2-3 parágrafos. Seja específico sobre o negócio e o impacto.",
  "solucao_proposta": "O que o sistema vai fazer para resolver o problema. 2-3 parágrafos concretos.",
  "funcionalidades_principais": ["Lista de 5-8 funcionalidades principais, específicas para o negócio descrito"],
  "o_que_sistema_faz": ["Lista do que será automatizado — específico e concreto"],
  "o_que_usuario_faz": ["Lista do que o usuário continua fazendo — específico e concreto"],
  "restricoes": ["O que o sistema NÃO deve fazer, com base no contexto"],
  "usuarios": "Quem vai usar o sistema e qual dor emocional resolve",
  "metricas_sucesso": ["Como medir se o sistema está funcionando"],
  "notas_adicionais": "Observações importantes: restrições técnicas, alertas, contexto adicional relevante. Inclua [Fonte: áudio transcrito] aqui."
}`

function promptTranscricao(transcricao: string): string {
  return `Você é um especialista em análise de negócios e arquitetura de sistemas.
Abaixo está a transcrição de um áudio onde o usuário descreve seu negócio e o sistema que quer construir.
Analise a transcrição e extraia um rascunho estruturado do projeto.

TRANSCRIÇÃO:
${transcricao}

Use linguagem clara, em português do Brasil, sem jargão técnico desnecessário.
Foque em extrair informações concretas mesmo que a fala seja informal ou repetitiva.
Se algo não estiver claro, use o contexto para inferir e indique nas notas adicionais.
Responda APENAS com JSON válido, sem texto antes ou depois, sem markdown code blocks.

${SCHEMA_JSON}`
}

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

    // Valida tipo
    const ext      = audio.name.split('.').pop()?.toLowerCase() ?? ''
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
      access:      'public',
      contentType: audio.type || 'audio/mpeg',
    })
    blobUrl = blob.url

    // ── 2. Transcreve com Whisper ─────────────────────────────────────────────
    const openai = getOpenAIClient()

    const transcricao = await openai.audio.transcriptions.create({
      model:    'whisper-1',
      file:     new File([buffer], audio.name, { type: audio.type || 'audio/mpeg' }),
      language: 'pt',
    })

    // ── 3. Deleta do Blob ─────────────────────────────────────────────────────
    await del(blobUrl).catch(() => { /* não bloqueia se falhar */ })
    blobUrl = null

    if (!transcricao.text?.trim()) {
      return NextResponse.json(
        { error: 'Não foi possível transcrever o áudio. Verifique se o arquivo tem conteúdo de fala.' },
        { status: 422 }
      )
    }

    // ── 4. Claude extrai RascunhoPRD da transcrição ───────────────────────────
    const anthropic = getAnthropicClient()

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 2048,
      system:     'Você é um especialista em análise de negócios. Responda sempre com JSON válido, sem markdown.',
      messages: [{ role: 'user', content: promptTranscricao(transcricao.text) }],
    })

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    const rascunho: RascunhoPRD = JSON.parse(cleaned)

    return NextResponse.json(rascunho)

  } catch (err: unknown) {
    // Limpa blob se algo deu errado após o upload
    if (blobUrl) {
      await del(blobUrl).catch(() => {})
    }

    console.error('[transcrever-audio]', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
