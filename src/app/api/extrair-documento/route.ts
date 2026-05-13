import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'
import { parseFields, toList } from '@/lib/parse-fields'
import type { FormularioState, RascunhoPRD } from '@/types/prd'

export const maxDuration = 60

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
[O SISTEMA DE SOFTWARE que será construído para resolver o problema. Descreva as automações, integrações e funcionalidades do sistema — NÃO resuma o conteúdo do documento. 2-3 parágrafos.]
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
[OBRIGATÓRIO. 3-5 métricas mensuráveis, uma por linha, sem marcadores. Ex: Redução de 50% no tempo de processamento. Gere mesmo que o documento não as cite.]
===END===
===FIELD: notas_adicionais===
[Observações relevantes. Pode ter múltiplas linhas. Deixe em branco se não houver.]
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

// ─── Modo formulário ──────────────────────────────────────────────────────────

function promptFormulario(dados: FormularioState): string {
  return `Analise as respostas do formulário abaixo e extraia um rascunho do projeto.
Use linguagem clara em português do Brasil, sem jargão técnico.

ATENÇÃO — campos obrigatórios:
- "solucao_proposta" deve descrever o SISTEMA DE SOFTWARE a ser construído, não resumir as respostas.
- "usuarios" é obrigatório — identifique quem usará o sistema; infira pelo contexto se não estiver explícito.
- "metricas_sucesso" é obrigatório — gere 3-5 métricas mensuráveis mesmo que as respostas não as citem.

RESPOSTAS:
${JSON.stringify(dados, null, 2)}

${SCHEMA_CAMPOS}`
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
      blocos.push({
        type:   'document',
        source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') },
      })
    } else if (arquivo.type.includes('wordprocessingml') || ext === 'docx') {
      try {
        const mammoth = await import('mammoth')
        const result  = await mammoth.extractRawText({ buffer })
        // Limita o texto extraído para evitar contexto excessivo que confunde o modelo
        const texto   = result.value.slice(0, 12_000)
        blocos.push({ type: 'text', text: `[Arquivo DOCX: ${arquivo.name}]\n${texto}` })
      } catch {
        blocos.push({ type: 'text', text: `[Arquivo: ${arquivo.name} — não foi possível extrair o texto]` })
      }
    } else {
      const texto = buffer.toString('utf-8').slice(0, 12_000)
      blocos.push({ type: 'text', text: `[Arquivo: ${arquivo.name}]\n${texto}` })
    }
  }

  return blocos
}

function promptDocumentos(nomeArquivos: string[]): string {
  return `Leia os ${nomeArquivos.length} documento(s) acima (${nomeArquivos.join(', ')}).
Cruze as informações e extraia um rascunho estruturado do projeto descrito.
NÃO copie trechos verbatim dos documentos — sintetize com suas próprias palavras.
Use linguagem clara em português do Brasil, sem jargão técnico.
Se os documentos não descrevem claramente um projeto, infira e indique nas notas_adicionais o que está incerto.

ATENÇÃO — campos obrigatórios:
- "solucao_proposta" deve descrever o SISTEMA DE SOFTWARE a ser construído para o negócio, não resumir o conteúdo dos documentos.
- "usuarios" é obrigatório — identifique quem usará o sistema; infira pelo contexto se não estiver explícito.
- "metricas_sucesso" é obrigatório — gere 3-5 métricas mensuráveis mesmo que os documentos não as citem.

${SCHEMA_CAMPOS}`
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''
  const client      = getAnthropicClient()

  try {
    // ── Modo documentos (multipart) ───────────────────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const form     = await req.formData()
      const arquivos = form.getAll('arquivos') as File[]

      if (!arquivos.length) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
      }

      const blocos = await processarArquivos(arquivos)
      const nomes  = arquivos.map((f) => f.name)

      const message = await client.messages.create({
        model:      'claude-sonnet-4-5',
        max_tokens: 2048,
        system:     SISTEMA,
        messages: [{
          role:    'user',
          content: [...blocos, { type: 'text', text: promptDocumentos(nomes) }],
        }],
      })

      const rawText = message.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')

      return NextResponse.json(parseCamposRascunho(parseFields(rawText)))
    }

    // ── Modo formulário (JSON) ────────────────────────────────────────────────
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

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    return NextResponse.json(parseCamposRascunho(parseFields(rawText)))

  } catch (err: unknown) {
    console.error('[extrair-documento]', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
