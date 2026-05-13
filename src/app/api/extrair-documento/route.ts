import { NextRequest, NextResponse } from 'next/server'
import { jsonrepair } from 'jsonrepair'
import { getAnthropicClient } from '@/lib/anthropic'
import type { FormularioState, RascunhoPRD } from '@/types/prd'

export const maxDuration = 60

// ─── Prompt do sistema ────────────────────────────────────────────────────────
// Instrução explícita de escaping — resolve o bug de "Unterminated string"
// causado por quebras de linha literais dentro de campos JSON.

const SISTEMA = `Você é um especialista em análise de negócios e arquitetura de sistemas.
Responda SOMENTE com JSON válido e bem formado, sem markdown, sem texto antes ou depois.
REGRAS CRÍTICAS DE FORMATAÇÃO:
1. Todos os campos de texto devem estar em uma única linha lógica.
2. Para quebras de parágrafo dentro de strings, use a sequência de escape \\n (barra-n).
3. Aspas dentro de strings devem ser escapadas como \\".
4. Nunca inclua caracteres de controle literais (tabulações, retornos de carro, etc.) dentro de strings JSON.
5. Arrays devem ter vírgula apenas entre elementos — sem vírgula após o último.`

// ─── Schema de saída (compartilhado) ─────────────────────────────────────────

const SCHEMA_JSON = `Retorne exatamente este JSON (sem chaves extras, sem markdown):
{
  "titulo": "Nome sugestivo para o projeto (3-6 palavras, específico para o negócio)",
  "problema": "Descrição em 2-3 parágrafos separados por \\n\\n. Específico ao negócio.",
  "solucao_proposta": "O SISTEMA DE SOFTWARE que será construído para resolver o problema. Descreva as automações, integrações e funcionalidades do sistema — NÃO resuma o conteúdo do documento. 2-3 parágrafos separados por \\n\\n.",
  "funcionalidades_principais": ["funcionalidade 1", "funcionalidade 2"],
  "o_que_sistema_faz": ["tarefa automatizada 1", "tarefa automatizada 2"],
  "o_que_usuario_faz": ["tarefa humana 1", "tarefa humana 2"],
  "restricoes": ["restricao 1", "restricao 2"],
  "usuarios": "OBRIGATÓRIO. Perfil de quem usará o sistema (ex: gerentes de loja, atendentes), frequência de uso e principal dor emocional que o sistema resolve. Infira pelo contexto se não estiver explícito. Nunca deixe em branco.",
  "metricas_sucesso": ["OBRIGATÓRIO — gere 3-5 métricas mensuráveis mesmo que o documento não as cite. Ex: redução de tempo, taxa de adoção, redução de erros, NPS, ROI."],
  "notas_adicionais": "Observações relevantes separadas por \\n se necessário"
}`

// ─── Parsing robusto em 3 camadas ─────────────────────────────────────────────

function parseClaudeJSON(texto: string): RascunhoPRD {
  // Remove markdown code blocks, se houver
  const limpo = texto
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im,     '')
    .replace(/\s*```\s*$/,    '')
    .trim()

  // Camada 1 — parse direto (fast path, resolve 95% dos casos)
  try {
    return JSON.parse(limpo) as RascunhoPRD
  } catch { /* segue */ }

  // Camada 2 — extrai o bloco {...} e tenta novamente
  // (resolve caso haja texto explicativo em volta do JSON)
  const match = limpo.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      return JSON.parse(match[0]) as RascunhoPRD
    } catch { /* segue */ }
  }

  // Camada 3 — jsonrepair corrige os casos mais comuns:
  //   • newlines literais dentro de strings
  //   • aspas não escapadas
  //   • vírgulas duplas ou ausentes
  //   • chaves/arrays não fechados
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

${SCHEMA_JSON}`
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

      return NextResponse.json(parseClaudeJSON(rawText))
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

    return NextResponse.json(parseClaudeJSON(rawText))

  } catch (err: unknown) {
    console.error('[extrair-documento]', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
