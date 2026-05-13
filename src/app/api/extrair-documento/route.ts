import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'
import type { FormularioState, RascunhoPRD } from '@/types/prd'

export const maxDuration = 60

// ─── Prompt compartilhado ──────────────────────────────────────────────────────

const SISTEMA = 'Você é um especialista em análise de negócios e arquitetura de sistemas. Responda sempre com JSON válido, sem markdown.'

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
  "notas_adicionais": "Observações importantes: restrições técnicas, alertas, contexto adicional relevante"
}`

// ─── Modo formulário ──────────────────────────────────────────────────────────

function promptFormulario(dados: FormularioState): string {
  return `Você é um especialista em análise de negócios e arquitetura de sistemas.
O usuário preencheu um formulário descrevendo seu negócio e o sistema que quer construir.
Analise as respostas e extraia um rascunho estruturado do projeto.

RESPOSTAS DO FORMULÁRIO:
${JSON.stringify(dados, null, 2)}

Use linguagem clara, em português do Brasil, sem jargão técnico desnecessário.
Responda APENAS com JSON válido, sem texto antes ou depois, sem markdown code blocks.

${SCHEMA_JSON}`
}

// ─── Modo documentos ──────────────────────────────────────────────────────────

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }

async function processarArquivos(arquivos: File[]): Promise<ContentBlock[]> {
  const blocos: ContentBlock[] = []

  for (const arquivo of arquivos) {
    const buffer = Buffer.from(await arquivo.arrayBuffer())
    const ext    = arquivo.name.split('.').pop()?.toLowerCase() ?? ''

    if (arquivo.type === 'application/pdf' || ext === 'pdf') {
      // PDF — Claude suporte nativo via base64
      blocos.push({
        type:   'document',
        source: {
          type:       'base64',
          media_type: 'application/pdf',
          data:       buffer.toString('base64'),
        },
      })
    } else if (arquivo.type.includes('wordprocessingml') || ext === 'docx') {
      // DOCX — extrai texto com mammoth (import dinâmico para não quebrar o bundle)
      try {
        const mammoth = await import('mammoth')
        const result  = await mammoth.extractRawText({ buffer })
        blocos.push({ type: 'text', text: `[Arquivo: ${arquivo.name}]\n${result.value}` })
      } catch {
        blocos.push({ type: 'text', text: `[Arquivo: ${arquivo.name} — não foi possível extrair o texto]` })
      }
    } else {
      // TXT / MD — lê como UTF-8
      blocos.push({ type: 'text', text: `[Arquivo: ${arquivo.name}]\n${buffer.toString('utf-8')}` })
    }
  }

  return blocos
}

function promptDocumentos(nomeArquivos: string[]): string {
  return `Você é um especialista em análise de negócios.
O usuário enviou ${nomeArquivos.length} documento(s): ${nomeArquivos.join(', ')}.
Leia todo o conteúdo, cruze as informações e extraia um rascunho estruturado do projeto descrito.

Use linguagem clara, em português do Brasil, sem jargão técnico desnecessário.
Se os documentos não descrevem claramente um projeto, infira o máximo possível e indique nas notas adicionais o que está incerto.
Responda APENAS com JSON válido, sem texto antes ou depois, sem markdown code blocks.

${SCHEMA_JSON}`
}

// ─── Extração de JSON da resposta ─────────────────────────────────────────────

function extrairJSON(texto: string): RascunhoPRD {
  const cleaned = texto
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  return JSON.parse(cleaned) as RascunhoPRD
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''
  const client      = getAnthropicClient()

  try {
    // ── Modo documentos (multipart) ────────────────────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const form     = await req.formData()
      const arquivos = form.getAll('arquivos') as File[]

      if (!arquivos.length) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
      }

      const blocos  = await processarArquivos(arquivos)
      const nomes   = arquivos.map((f) => f.name)
      const prompt  = promptDocumentos(nomes)

      const message = await client.messages.create({
        model:      'claude-sonnet-4-5',
        max_tokens: 2048,
        system:     SISTEMA,
        messages: [{
          role:    'user',
          content: [...blocos, { type: 'text', text: prompt }],
        }],
      })

      const texto = message.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')

      return NextResponse.json(extrairJSON(texto))
    }

    // ── Modo formulário (JSON) ─────────────────────────────────────────────────
    const body = await req.json()
    const { dados } = body as { tipo: string; dados: FormularioState }

    if (!dados) {
      return NextResponse.json({ error: 'Dados não informados' }, { status: 400 })
    }

    const message = await client.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 2048,
      system:     SISTEMA,
      messages: [{ role: 'user', content: promptFormulario(dados) }],
    })

    const texto = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    return NextResponse.json(extrairJSON(texto))

  } catch (err: unknown) {
    console.error('[extrair-documento]', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
