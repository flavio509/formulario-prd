import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'
import type { FormularioState, RascunhoPRD } from '@/types/prd'

export const maxDuration = 60

// ─── Prompt de extração ───────────────────────────────────────────────────────

function montarPrompt(dados: FormularioState): string {
  return `Você é um especialista em análise de negócios e arquitetura de sistemas.
O usuário preencheu um formulário descrevendo seu negócio e o sistema que quer construir.
Analise as respostas e extraia um rascunho estruturado do projeto.

RESPOSTAS DO FORMULÁRIO:
${JSON.stringify(dados, null, 2)}

Com base nessas respostas, gere um rascunho estruturado com os seguintes campos.
Use linguagem clara, em português do Brasil, sem jargão técnico desnecessário.

Responda APENAS com JSON válido, sem texto antes ou depois, sem markdown code blocks.

{
  "titulo": "Nome sugestivo para o projeto (3-6 palavras, específico para o negócio)",
  "problema": "Descrição clara do problema em 2-3 parágrafos. Use as palavras do próprio usuário. Seja específico sobre o negócio e o impacto.",
  "solucao_proposta": "O que o sistema vai fazer para resolver o problema. 2-3 parágrafos concretos.",
  "funcionalidades_principais": ["Lista de 5-8 funcionalidades principais, específicas para o negócio descrito"],
  "o_que_sistema_faz": ["Lista do que será automatizado — específico e concreto"],
  "o_que_usuario_faz": ["Lista do que o usuário continua fazendo — específico e concreto"],
  "restricoes": ["O que o sistema NÃO deve fazer, baseado nas respostas sobre limites"],
  "usuarios": "Quem vai usar o sistema e qual dor emocional resolve",
  "metricas_sucesso": ["Como medir se o sistema está funcionando — baseado nas métricas escolhidas"],
  "notas_adicionais": "Observações importantes: restrições técnicas, alertas sobre redes sociais se mencionado, orçamento, qualquer contexto adicional relevante"
}`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tipo, dados } = body as { tipo: string; dados: FormularioState }

    if (!dados) {
      return NextResponse.json({ error: 'Dados não informados' }, { status: 400 })
    }

    const client = getAnthropicClient()

    const message = await client.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 2048,
      system:     'Você é um especialista em análise de negócios. Responda sempre com JSON válido, sem markdown.',
      messages: [
        {
          role:    'user',
          content: montarPrompt(dados),
        },
      ],
    })

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    // Remove possível markdown code block se o modelo ignorar a instrução
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/,    '')
      .trim()

    const rascunho: RascunhoPRD = JSON.parse(cleaned)

    return NextResponse.json(rascunho)
  } catch (err: unknown) {
    console.error('[extrair-documento]', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
