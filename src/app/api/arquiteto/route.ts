import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'
import { parseFields, toList } from '@/lib/parse-fields'
import type { RascunhoPRD, ArquiteturaPRD } from '@/types/prd'

export const maxDuration = 60

// ─── BASE_CONHECIMENTO (seções 1, 4 e 6) ──────────────────────────────────────
// Embutida diretamente para evitar leitura de arquivo em runtime no Vercel.

const BASE_CONHECIMENTO = `
## TIPOS DE PROJETO (1-6)

TIPO 1 — Skill standalone
Automação empacotada, ativada por trigger, sem app/projeto associado.
Ex: gerar dashboard a partir de CSV, postar no LinkedIn a partir de URL.
Arquivos: SKILL.md (frontmatter YAML + instruções + exemplos).
Use quando: processo único e repetitivo, sem interface necessária, executa sob demanda.

TIPO 2 — Agente Claude Code (projeto simples)
Sessão Claude Code com contexto persistente para script, automação ou análise.
Arquivos: CLAUDE.md, PRD.md, .gitignore, .claude/settings.json.
Use quando: app pequeno, executa sob demanda, uma tecnologia principal, sem 24/7.

TIPO 3 — Agente Claude Code com múltiplas Skills
Projeto com várias tecnologias que reutiliza padrões via skills especializadas.
Adiciona: .claude/skills/<nome>/SKILL.md, .claude/agents/<nome>.md (sub-agentes opcionais).
Use quando: tarefa repete >3x/semana, múltiplas tecnologias, SaaS ou app mais complexo.

TIPO 4 — Agente OpenClaw (autônomo 24/7)
Agente rodando em VPS, conversa via Telegram, memória persistente, age proativamente.
Arquivos: openclaw.json, SOUL.md, USER.md, AGENTS.md, IDENTITY.md, MEMORY.md.
Use quando: precisa agir sem usuário presente, monitoramento contínuo, notificações proativas.

TIPO 5 — Agente OpenClaw + Supabase
Adiciona banco de dados estruturado para múltiplos agentes ou dados > arquivos .md.
Use quando: múltiplos agentes compartilham dados, logs/métricas consultáveis, Mission Control.

TIPO 6 — Sistema completo com Mission Control
Adiciona app Next.js separado, pm2, Caddy, Tailscale para acesso mobile.
Use quando: operação completa com dashboard executivo, múltiplos operadores, acesso público.

## CHECKLIST DE DECISÃO ARQUITETURAL

Q1 — O que está sendo construído?
- Automação de UM processo repetitivo sem interface → TIPO 1
- Script/análise/app pequeno executado sob demanda → TIPO 2
- App ou SaaS com múltiplas tecnologias → TIPO 3
- Assistente 24/7 autônomo via Telegram → TIPO 4
- Múltiplos agentes compartilhando dados estruturados → TIPO 5
- Operação completa com dashboard executivo → TIPO 6

Q2 — Precisa de Supabase?
SIM: múltiplos agentes leem/escrevem, dados estruturados (tickets/leads/métricas), histórico consultável via SQL.
NÃO: tudo cabe em arquivos .md, 1 agente único, workflow é texto/conversa.

Q3 — Skills vs sub-agentes vs MCPs?
- Processo repete >3x/semana com padrão definido → Skill
- Especializar contexto/persona para tarefa específica → Sub-agente
- Conectar a API externa (Google, Slack, GitHub, Stripe) → MCP

Q4 — Quantos agentes?
Regra Bruno: comece com 1 agente. Multi-agentes APENAS quando paralelismo ou especialização MEDIDA justificar.

Q5 — Smart routing de modelos:
- HeartBeats/cron jobs → Haiku ou Gemini Flash (rodam 10-50x/dia, custo acumula)
- Conversa/dia a dia → Sonnet (melhor custo-benefício geral)
- Planejamento estratégico / revisão crítica → Opus (reservar para decisões importantes)

## ARMADILHAS COMUNS

Restrições de API:
- Instagram e TikTok NÃO permitem postagem automática via API oficial (violação de ToS).
- WhatsApp Business API exige aprovação da Meta, tem custo por mensagem e não é instantâneo.
- LinkedIn limita automação (ToS); raspar dados é proibido.
- YouTube Data API tem cota diária restrita (10.000 unidades/dia no plano gratuito).

Rate limits críticos em produção:
- Anthropic: RPM, TPM e RPD — multi-agentes em paralelo atingem limite rapidamente.
- OpenClaw carrega TODO o workspace a cada mensagem (50k-100k tokens de contexto base).
- Plano Sonnet tem limites menores que Haiku para RPM.

Custos ocultos:
- Opus em cron jobs → custo explosivo; reservar apenas para decisões críticas.
- Heartbeat default com Opus ativo → fatura explode em dias.
- OpenClaw sem smart routing configurado usa o modelo padrão para TUDO.
- Cache Anthropic tem TTL de 5 minutos — prompts longos sem cache = custo duplicado.

Dependências críticas:
- Supabase free tier: 500MB banco, pausa automática após 7 dias sem acesso.
- .env commitado acidentalmente: rotacionar chaves imediatamente (histórico Git mantém).
- Usar Claude Pro (assinatura) com OpenClaw → viola ToS Anthropic, banimento permanente.

Segurança:
- Control UI do OpenClaw exposto na internet sem auth → 63% têm vulnerabilidades ativas.
- Conta Google pessoal conectada ao agente → cascata de acesso a anos de dados.
- Sem allow-list no Telegram → qualquer pessoa pode controlar o agente.
`

// ─── System prompt ────────────────────────────────────────────────────────────

const SISTEMA = `Você é o Agente Arquiteto do Sistema PRD Developer.
Sua tarefa: analisar o rascunho de projeto abaixo e produzir uma decisão arquitetural completa.

Responda SOMENTE usando o formato de campos delimitados especificado.
Não use JSON, markdown, blocos de código ou qualquer outra formatação.
Cada campo deve estar entre ===FIELD: nome=== e ===END===.
Para campos de lista: um item por linha, sem marcadores, sem numeração.
Não inclua nenhum texto fora dos delimitadores.

Execute internamente as 5 etapas antes de responder:
ETAPA 1: Analise contexto do negócio — setor, tipo de processo, complexidade operacional, volume.
ETAPA 2: Classifique o projeto como Tipo 1-6 usando o BASE_CONHECIMENTO abaixo.
ETAPA 3: Use os resultados de pesquisa fornecidos (IAs/Skills/MCPs da base + Brave Search).
ETAPA 4: Decida toda a arquitetura sem envolver o usuário — stack, banco, agentes, deploy, MCPs, routing.
ETAPA 5: Identifique armadilhas específicas para este projeto (APIs, custos, segurança, LGPD).

${BASE_CONHECIMENTO}

SCHEMA DE SAÍDA — retorne EXATAMENTE nesta estrutura, sem nenhum texto fora dos delimitadores:

===FIELD: tipo_projeto===
[Nome do tipo canônico — ex: Agente Claude Code com Skills]
===END===
===FIELD: tipo_numero===
[Apenas o número inteiro: 1, 2, 3, 4, 5 ou 6]
===END===
===FIELD: complexidade===
[Uma das opções: Simples | Média | Alta | Muito Alta]
===END===
===FIELD: modo_operacao===
[Uma das opções: On-demand | Autônomo 24/7 | Híbrido (on-demand + cron)]
===END===
===FIELD: escala===
[Estimativa concreta — ex: 1-3 operadores, ~500 registros/mês]
===END===
===FIELD: stack===
[lista — uma tecnologia por linha]
===END===
===FIELD: banco_dados===
[Decisão e justificativa resumida — ex: Supabase — leads e histórico precisam de SQL | Nenhum — tudo em arquivos .md]
===END===
===FIELD: agente===
[Descrição do agente principal — ex: Claude Code + 2 skills customizadas]
===END===
===FIELD: num_agentes===
[Número e justificativa — ex: 1 agente principal — complexidade não justifica multi-agente ainda]
===END===
===FIELD: ias_recomendadas===
[lista — uma IA por linha com papel específico — ex: Claude Sonnet 4.5 — lógica principal]
===END===
===FIELD: skills===
[lista — uma skill por linha com o que faz especificamente]
===END===
===FIELD: mcps===
[lista — um MCP por linha no formato: Nome MCP — npx comando-de-instalacao@latest]
===END===
===FIELD: smart_routing===
[Haiku para quê | Sonnet para quê | Opus para quê — em uma linha]
===END===
===FIELD: deploy===
[Onde e como — ex: Vercel — frontend Next.js | VPS Hostinger — agente OpenClaw com pm2]
===END===
===FIELD: mvp_funcionalidades===
[lista — uma funcionalidade MVP concreta por linha]
===END===
===FIELD: v2_funcionalidades===
[lista — uma funcionalidade V2 concreta por linha]
===END===
===FIELD: alertas===
[lista — um alerta por linha com prefixo emoji — ex: ⚠️ alerta | 💰 custo oculto | 🔒 restrição]
===END===`

// ─── Parser: campos → ArquiteturaPRD ─────────────────────────────────────────

function parseCamposArquitetura(campos: Record<string, string>): ArquiteturaPRD {
  return {
    tipo_projeto:       campos.tipo_projeto       ?? '',
    tipo_numero:        parseInt(campos.tipo_numero ?? '3', 10) || 3,
    complexidade:       campos.complexidade        ?? 'Média',
    modo_operacao:      campos.modo_operacao       ?? 'On-demand',
    escala:             campos.escala              ?? '',
    stack:              toList(campos.stack              ?? ''),
    banco_dados:        campos.banco_dados         ?? '',
    agente:             campos.agente              ?? '',
    num_agentes:        campos.num_agentes         ?? '',
    ias_recomendadas:   toList(campos.ias_recomendadas   ?? ''),
    skills:             toList(campos.skills             ?? ''),
    mcps:               toList(campos.mcps               ?? ''),
    smart_routing:      campos.smart_routing       ?? '',
    deploy:             campos.deploy              ?? '',
    mvp_funcionalidades: toList(campos.mvp_funcionalidades ?? ''),
    v2_funcionalidades:  toList(campos.v2_funcionalidades  ?? ''),
    alertas:            toList(campos.alertas             ?? ''),
  }
}

// ─── Pesquisa Supabase (resiliente) ──────────────────────────────────────────

async function buscarSupabase(keywords: string[]): Promise<string> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key || !keywords.length) return ''

  const keyword = keywords[0]
  const headers = {
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Content-Type':  'application/json',
  }

  const tabelas = [
    { nome: 'ias',    campos: 'nome,descricao' },
    { nome: 'skills', campos: 'nome,descricao' },
    { nome: 'mcps',   campos: 'nome,descricao' },
  ]

  const resultados: string[] = []

  await Promise.allSettled(
    tabelas.map(async ({ nome, campos }) => {
      try {
        const res = await fetch(
          `${url}/rest/v1/${nome}?select=${campos}` +
          `&or=(nome.ilike.*${encodeURIComponent(keyword)}*,descricao.ilike.*${encodeURIComponent(keyword)}*)` +
          `&limit=5`,
          { headers, signal: AbortSignal.timeout(5_000) }
        )
        if (!res.ok) return
        const data = await res.json() as Record<string, unknown>[]
        if (Array.isArray(data) && data.length > 0) {
          resultados.push(
            `[${nome.toUpperCase()} relevantes para "${keyword}"]\n` +
            data.map((r) => `• ${r.nome}: ${r.descricao ?? ''}`).join('\n')
          )
        }
      } catch { /* tabela inexistente ou timeout — ignora */ }
    })
  )

  return resultados.join('\n\n')
}

// ─── Pesquisa Brave Search ────────────────────────────────────────────────────

async function buscarBrave(query: string): Promise<string> {
  const key = process.env.BRAVE_API_KEY
  if (!key) return ''

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3&text_decorations=false`,
      {
        headers: {
          'X-Subscription-Token': key,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5_000),
      }
    )
    if (!res.ok) return ''

    const data = await res.json() as {
      web?: { results?: Array<{ title: string; description: string }> }
    }
    const results = data.web?.results ?? []
    if (!results.length) return ''

    return (
      '[BRAVE SEARCH — contexto de mercado]\n' +
      results.map((r) => `• ${r.title}: ${r.description}`).join('\n')
    )
  } catch {
    return ''
  }
}

// ─── Extrai keywords do rascunho ──────────────────────────────────────────────

function extrairKeywords(rascunho: RascunhoPRD): string[] {
  const stopwords = new Set([
    'para', 'que', 'com', 'uma', 'este', 'esta', 'pelo', 'pela',
    'como', 'mais', 'seus', 'suas', 'cada', 'todo', 'toda', 'sobre',
    'isso', 'esse', 'essa', 'entre', 'quando', 'onde', 'quem',
  ])
  const texto = `${rascunho.titulo} ${rascunho.problema}`.toLowerCase()
  return [...new Set(
    texto
      .split(/\s+/)
      .map((w) => w.replace(/[^a-záéíóúãõç]/g, ''))
      .filter((w) => w.length > 4 && !stopwords.has(w))
  )].slice(0, 3)
}

// ─── Prompt do usuário ────────────────────────────────────────────────────────

function buildPrompt(rascunho: RascunhoPRD, supabaseCtx: string, braveCtx: string): string {
  const pesquisa = [supabaseCtx, braveCtx].filter(Boolean).join('\n\n')

  return `RASCUNHO DO PROJETO:
${JSON.stringify(rascunho, null, 2)}

${
  pesquisa
    ? `CONTEXTO DE PESQUISA:\n${pesquisa}`
    : 'CONTEXTO DE PESQUISA: Nenhum resultado externo disponível — use o BASE_CONHECIMENTO para decisão completa.'
}

Analise o rascunho acima, execute as 5 etapas e retorne a arquitetura no formato de campos delimitados.`
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { rascunho: RascunhoPRD }
    const { rascunho } = body

    if (!rascunho?.titulo) {
      return NextResponse.json({ error: 'Rascunho não informado' }, { status: 400 })
    }

    const keywords   = extrairKeywords(rascunho)
    const braveQuery = `${rascunho.titulo} automação software arquitetura`

    // Pesquisa externa em paralelo — falhas são silenciosas
    const [supabaseResult, braveResult] = await Promise.allSettled([
      buscarSupabase(keywords),
      buscarBrave(braveQuery),
    ])

    const supabaseCtx = supabaseResult.status === 'fulfilled' ? supabaseResult.value : ''
    const braveCtx    = braveResult.status    === 'fulfilled' ? braveResult.value    : ''

    const anthropic = getAnthropicClient()
    const message   = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 4096,
      system:     SISTEMA,
      messages:   [{ role: 'user', content: buildPrompt(rascunho, supabaseCtx, braveCtx) }],
    })

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    return NextResponse.json(parseCamposArquitetura(parseFields(rawText)))

  } catch (err: unknown) {
    console.error('[arquiteto]', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
