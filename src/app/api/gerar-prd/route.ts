import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'
import type { RascunhoPRD, ArquiteturaPRD } from '@/types/prd'

export const maxDuration = 60

// ─── Tipos SSE ────────────────────────────────────────────────────────────────

type SSEData =
  | { type: 'progress'; percent: number; status: string }
  | { type: 'done'; arquivos: Record<string, string>; titulo: string; parcial: boolean; aviso?: string }
  | { type: 'error'; message: string }

// ─── Parser de delimitadores ──────────────────────────────────────────────────

function parseArquivos(texto: string): Record<string, string> {
  const arquivos: Record<string, string> = {}
  const regex = /===FILE: ([^\n]+)===\n([\s\S]*?)===END===/g
  let match
  while ((match = regex.exec(texto)) !== null) {
    const nome     = match[1].trim()
    const conteudo = match[2].trim()
    if (nome && conteudo) arquivos[nome] = conteudo
  }
  return arquivos
}

// ─── System prompt (compartilhado por todos os calls) ─────────────────────────

const SISTEMA = `Você é um especialista em documentação técnica de projetos de software.
Sua tarefa: gerar arquivos de documentação completos e prontos para uso imediato no Claude Code.

REGRAS ABSOLUTAS:
1. Use EXATAMENTE este formato de delimitadores, sem exceções:
   ===FILE: nome-do-arquivo===
   [conteúdo do arquivo]
   ===END===
2. Não inclua NENHUM texto fora dos delimitadores (sem introdução, sem conclusão, sem comentários).
3. Cada arquivo deve ser 100% específico ao negócio descrito — NUNCA use conteúdo genérico de template.
   O usuário deve reconhecer o próprio negócio em cada parágrafo.
4. Use markdown limpo e bem formatado.
5. Baseie-se EXCLUSIVAMENTE nas informações fornecidas.

CRÍTICO: Cada arquivo DEVE terminar com ===END=== na própria linha.
NUNCA omita o ===END===. Se estiver próximo do limite de tokens,
encurte o conteúdo mas SEMPRE inclua o ===END=== de cada arquivo.`

// ─── Call 1 — PRD.md ──────────────────────────────────────────────────────────

function buildPromptPRD(rascunho: RascunhoPRD, arquitetura: ArquiteturaPRD): string {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return `RASCUNHO DO PROJETO:
${JSON.stringify(rascunho, null, 2)}

ARQUITETURA APROVADA:
${JSON.stringify(arquitetura, null, 2)}

DATA ATUAL: ${hoje}

Gere APENAS o arquivo abaixo. Deve ser completo, específico ao negócio e pronto para uso.

──────────────────────────────────────────────────────────────────
ARQUIVO 1: PRD.md
Documento completo e profissional. Use esta estrutura exata:

# PRD — [titulo]

> **Versão:** 1.0 · **Data:** ${hoje} · **Tipo:** ${arquitetura.tipo_numero} — ${arquitetura.tipo_projeto} · **Complexidade:** ${arquitetura.complexidade}

---

## 1. Visão do Produto

### 1.1 O Problema
[escreva 2-3 parágrafos específicos sobre o problema do negócio, usando o campo 'problema' do rascunho]

### 1.2 Solução Proposta
[descreva o SISTEMA DE SOFTWARE que será construído, usando 'solucao_proposta']

### 1.3 Usuários e Personas
[descreva as personas, usando o campo 'usuarios']

---

## 2. Requisitos

### 2.1 Funcionalidades Principais
[liste cada funcionalidade de 'funcionalidades_principais' com 1 frase de descrição]

### 2.2 Divisão de Responsabilidades

**O sistema faz (automatizado):**
[liste 'o_que_sistema_faz']

**O usuário faz:**
[liste 'o_que_usuario_faz']

### 2.3 Restrições (o que o sistema NÃO faz)
[liste 'restricoes']

---

## 3. Arquitetura Técnica

### 3.1 Classificação
- **Tipo:** ${arquitetura.tipo_numero} — ${arquitetura.tipo_projeto}
- **Complexidade:** ${arquitetura.complexidade}
- **Modo de operação:** ${arquitetura.modo_operacao}
- **Escala estimada:** ${arquitetura.escala}

### 3.2 Stack
[liste cada tecnologia de 'stack' com 1 frase explicando por que foi escolhida]

### 3.3 Banco de Dados
${arquitetura.banco_dados}

### 3.4 Agente e Modelos
- **Agente:** ${arquitetura.agente}
- **Número de agentes:** ${arquitetura.num_agentes}

**IAs recomendadas:**
[liste 'ias_recomendadas' com papel de cada uma]

**Smart routing:**
${arquitetura.smart_routing}

### 3.5 Skills
[liste 'skills' — se vazio, escreva "Nenhuma skill customizada necessária no MVP"]

### 3.6 MCPs Necessários
[liste cada MCP de 'mcps' com comando de instalação em bloco de código]

### 3.7 Deploy
${arquitetura.deploy}

---

## 4. MVP — Fase 1

### Funcionalidades
[liste 'mvp_funcionalidades']

### Critérios de Aceitação
[para cada funcionalidade do MVP, escreva 2-3 critérios mensuráveis específicos ao negócio]

---

## 5. Roadmap — V2+

[liste 'v2_funcionalidades' com estimativa de esforço: Pequeno / Médio / Grande]

---

## 6. Métricas de Sucesso

[liste cada métrica de 'metricas_sucesso' com: método de medição + meta numérica + período de avaliação]

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
[converta cada alerta de 'alertas' em uma linha da tabela com probabilidade (Alta/Média/Baixa), impacto (Alto/Médio/Baixo) e plano concreto de mitigação]

---

## 8. Próximos Passos

[liste 5-7 ações concretas e imediatas para iniciar o projeto, específicas para Tipo ${arquitetura.tipo_numero}]

Gere o arquivo acima agora, usando os delimitadores ===FILE: === / ===END=== exatamente.

CRÍTICO: O arquivo DEVE terminar com ===END=== na própria linha.
NUNCA omita o ===END===. Se estiver próximo do limite de tokens,
encurte o conteúdo mas SEMPRE inclua o ===END=== no final.`
}

// ─── Call 2 — CLAUDE.md ───────────────────────────────────────────────────────

function buildPromptClaude(rascunho: RascunhoPRD, arquitetura: ArquiteturaPRD): string {
  return `RASCUNHO DO PROJETO:
${JSON.stringify(rascunho, null, 2)}

ARQUITETURA APROVADA:
${JSON.stringify(arquitetura, null, 2)}

Gere APENAS o arquivo abaixo. Deve ser completo, específico ao negócio e pronto para uso.

──────────────────────────────────────────────────────────────────
ARQUIVO 1: CLAUDE.md
Briefing permanente para o Claude Code. Conciso e direto.

# [titulo] — Briefing do Projeto

## Contexto do Negócio
[2 parágrafos específicos: o que é o negócio, qual problema o sistema resolve, quem usa]

## O que é este sistema
[1 parágrafo descrevendo o sistema de software, baseado em 'solucao_proposta']

## Stack
[liste a stack com versões quando conhecidas]

## Como Rodar Localmente
[comandos específicos de setup baseados na stack: ${arquitetura.stack.join(', ')}]

## Estrutura de Pastas (esperada)
[estrutura de diretórios realista para Tipo ${arquitetura.tipo_numero} com a stack definida]

## Variáveis de Ambiente
[liste cada var necessária com descrição de onde obter]

## Regras do Projeto
[5-8 regras específicas do projeto: convenções de código, padrões de commit, o que nunca fazer]

## Comandos Úteis
[lista de comandos do dia a dia específicos para a stack]

Gere o arquivo acima agora, usando os delimitadores ===FILE: === / ===END=== exatamente.

CRÍTICO: O arquivo DEVE terminar com ===END=== na própria linha.
NUNCA omita o ===END===. Se estiver próximo do limite de tokens,
encurte o conteúdo mas SEMPRE inclua o ===END=== no final.`
}

// ─── Call 3 — PLAN.md ─────────────────────────────────────────────────────────

function buildPromptPlan(rascunho: RascunhoPRD, arquitetura: ArquiteturaPRD): string {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const numMilestones = (
    { 'Simples': 2, 'Média': 3, 'Alta': 4, 'Muito Alta': 5 } as Record<string, number>
  )[arquitetura.complexidade] ?? 3

  const ctx = {
    titulo:              rascunho.titulo,
    complexidade:        arquitetura.complexidade,
    tipo_numero:         arquitetura.tipo_numero,
    tipo_projeto:        arquitetura.tipo_projeto,
    mvp_funcionalidades: arquitetura.mvp_funcionalidades,
    v2_funcionalidades:  arquitetura.v2_funcionalidades,
  }

  return `CONTEXTO DO PROJETO:
${JSON.stringify(ctx, null, 2)}

DATA ATUAL: ${hoje}

Gere APENAS o arquivo abaixo. Deve ser completo, específico ao negócio e pronto para uso.

──────────────────────────────────────────────────────────────────
ARQUIVO 1: PLAN.md
Plano de execução em milestones. Complexidade: ${ctx.complexidade} → gere exatamente ${numMilestones} milestones no MVP.

# PLAN — ${ctx.titulo}

> **Iniciado em:** ${hoje} · **Status:** 🔴 Não iniciado

---

## Fase 1 — MVP (estimativa: ${numMilestones * 2}-${numMilestones * 3} semanas)

**Objetivo:** [1 frase específica sobre o que o MVP entrega]

[gere exatamente ${numMilestones} milestones, cada um com:]
### Milestone 1.X — [nome específico]
**Objetivo:** [o que entrega]
**Entregáveis:**
- [ ] [tarefa concreta 1]
- [ ] [tarefa concreta 2]
- [ ] [tarefa concreta 3]
**Critério de conclusão:** [como saber que está pronto]

---

## Fase 2 — V2+ (estimativa: ${numMilestones + 2}-${numMilestones + 4} semanas)

[gere 2-3 milestones baseados em 'v2_funcionalidades']

---

## Definição de Pronto (DoD)
[5 critérios específicos do projeto: testes, deploy, documentação, etc.]

Gere o arquivo acima agora, usando os delimitadores ===FILE: === / ===END=== exatamente.

CRÍTICO: O arquivo DEVE terminar com ===END=== na própria linha.
NUNCA omita o ===END===. Se estiver próximo do limite de tokens,
encurte o conteúdo mas SEMPRE inclua o ===END=== no final.`
}

// ─── Call 4 — .env.example ───────────────────────────────────────────────────

function buildPromptEnv(rascunho: RascunhoPRD, arquitetura: ArquiteturaPRD): string {
  const ctx = {
    titulo:      rascunho.titulo,
    tipo_numero: arquitetura.tipo_numero,
    stack:       arquitetura.stack,
    mcps:        arquitetura.mcps,
    deploy:      arquitetura.deploy,
  }

  return `CONTEXTO DO PROJETO:
${JSON.stringify(ctx, null, 2)}

Gere APENAS o arquivo abaixo. É um arquivo de configuração — não precisa ser longo.

──────────────────────────────────────────────────────────────────
ARQUIVO 1: .env.example
Todas as variáveis necessárias com comentários. NUNCA coloque valores reais.

# ─── ${ctx.titulo} — Variáveis de Ambiente ────────────────────
# Copie este arquivo para .env e preencha com seus valores reais

[liste todas as vars necessárias para: stack=${ctx.stack.join(', ')}, MCPs=${ctx.mcps.join(', ')}, deploy=${ctx.deploy}]
[formato para cada var:]
# Descrição — onde obter (ex: dashboard do serviço)
NOME_DA_VAR=

Gere o arquivo acima agora, usando os delimitadores ===FILE: === / ===END=== exatamente.

CRÍTICO: O arquivo DEVE terminar com ===END=== na própria linha.
NUNCA omita o ===END===.`
}

// ─── Call 5 — .gitignore ──────────────────────────────────────────────────────

function buildPromptGitignore(rascunho: RascunhoPRD, arquitetura: ArquiteturaPRD): string {
  const ctx = {
    titulo: rascunho.titulo,
    stack:  arquitetura.stack,
    deploy: arquitetura.deploy,
  }

  return `CONTEXTO DO PROJETO:
${JSON.stringify(ctx, null, 2)}

Gere APENAS o arquivo abaixo. É um arquivo de configuração curto.

──────────────────────────────────────────────────────────────────
ARQUIVO 1: .gitignore
Baseado na stack: ${ctx.stack.join(', ')}

[gere .gitignore completo para esta stack, incluindo obrigatoriamente: .env, dependências, builds, OS files, logs, arquivos de IDE]

Gere o arquivo acima agora, usando os delimitadores ===FILE: === / ===END=== exatamente.

CRÍTICO: O arquivo DEVE terminar com ===END=== na própria linha.
NUNCA omita o ===END===.`
}

// ─── Call 5 — README.md ───────────────────────────────────────────────────────

function buildPromptReadme(rascunho: RascunhoPRD, arquitetura: ArquiteturaPRD): string {
  const ctx = {
    titulo:                    rascunho.titulo,
    funcionalidades_principais: rascunho.funcionalidades_principais,
    stack:                     arquitetura.stack,
    deploy:                    arquitetura.deploy,
  }

  return `CONTEXTO DO PROJETO:
${JSON.stringify(ctx, null, 2)}

Gere APENAS o arquivo abaixo. Deve ser específico ao negócio e pronto para uso.

──────────────────────────────────────────────────────────────────
ARQUIVO 1: README.md
Apresentação profissional. Específico ao negócio.

# ${ctx.titulo}

> [tagline de 1 frase específica ao negócio — não genérica]

## O que é
[2-3 frases específicas sobre o sistema]

## Funcionalidades
[liste 'funcionalidades_principais' como bullet points]

## Tecnologias
[liste a stack]

## Pré-requisitos
[o que precisa estar instalado para rodar]

## Instalação
\`\`\`bash
[comandos específicos de setup]
\`\`\`

## Configuração
[passos para configurar o .env]

## Como usar
[exemplo de uso concreto e específico ao negócio]

Gere o arquivo acima agora, usando os delimitadores ===FILE: === / ===END=== exatamente.

CRÍTICO: O arquivo DEVE terminar com ===END=== na própria linha.
NUNCA omita o ===END===. Se estiver próximo do limite de tokens,
encurte o conteúdo mas SEMPRE inclua o ===END=== no final.`
}

// ─── Call 6 — COMO_USAR.md ────────────────────────────────────────────────────

function buildPromptComoUsar(rascunho: RascunhoPRD, arquitetura: ArquiteturaPRD): string {
  const ctx = {
    titulo:      rascunho.titulo,
    tipo_numero: arquitetura.tipo_numero,
    tipo_projeto: arquitetura.tipo_projeto,
    stack:       arquitetura.stack,
    alertas:     arquitetura.alertas,
  }

  return `CONTEXTO DO PROJETO:
${JSON.stringify(ctx, null, 2)}

Gere APENAS o arquivo abaixo. Deve ser específico ao negócio e pronto para uso.

──────────────────────────────────────────────────────────────────
ARQUIVO 1: COMO_USAR.md
Guia passo a passo para o Claude Code. Para usuário não-técnico.

# Como Usar no Claude Code — ${ctx.titulo}

> Siga estes passos na ordem. Tempo estimado: 30-60 minutos para o setup inicial.

## Pré-requisitos
- [ ] Claude Code instalado (\`npm install -g @anthropic-ai/claude-code\`)
- [ ] [outros pré-requisitos específicos da stack]

## Passo 1 — Criar o projeto
[instruções e comandos específicos]

## Passo 2 — Configurar variáveis de ambiente
[instruções para preencher o .env baseadas nas vars reais do projeto]

## Passo 3 — Primeira sessão Claude Code
Cole este prompt exato no Claude Code:
\`\`\`
Leia o PRD.md e o PLAN.md deste projeto. Vamos executar o Milestone 1.1.
Confirme que entendeu o contexto antes de começar.
\`\`\`

## Passo 4 — Executar o primeiro milestone
[instruções específicas para o Milestone 1.1 do projeto]

## Dicas importantes
[3-5 dicas específicas para Tipo ${ctx.tipo_numero} — ${ctx.tipo_projeto}]

## O que fazer se algo der errado
[troubleshooting baseado nos alertas: ${ctx.alertas.slice(0, 2).join(' | ')}]

Gere o arquivo acima agora, usando os delimitadores ===FILE: === / ===END=== exatamente.

CRÍTICO: O arquivo DEVE terminar com ===END=== na própria linha.
NUNCA omita o ===END===. Se estiver próximo do limite de tokens,
encurte o conteúdo mas SEMPRE inclua o ===END=== no final.`
}

// ─── Handler principal — streaming SSE ───────────────────────────────────────

export async function POST(req: NextRequest) {
  let rascunho: RascunhoPRD
  let arquitetura: ArquiteturaPRD

  try {
    const body = await req.json() as { rascunho: RascunhoPRD; arquitetura: ArquiteturaPRD }
    rascunho   = body.rascunho
    arquitetura = body.arquitetura
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!rascunho?.titulo || !arquitetura?.tipo_projeto) {
    return NextResponse.json({ error: 'Rascunho ou arquitetura não informados' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: SSEData) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      try {
        const client = getAnthropicClient()

        // Helper: executa um call Anthropic e retorna os arquivos parseados
        const runCall = async (
          prompt: string,
          maxTokens: number,
          label: string,
          pctStart: number,
          pctEnd: number
        ): Promise<Record<string, string>> => {
          let rawText = ''
          let tokens  = 0
          const range = pctEnd - pctStart

          const apiStream = client.messages.stream({
            model:      'claude-sonnet-4-5',
            max_tokens: maxTokens,
            system:     SISTEMA,
            messages:   [{ role: 'user', content: prompt }],
          })

          for await (const event of apiStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              rawText += event.delta.text
              tokens++
              if (tokens % 40 === 0) {
                const pct = Math.min(pctEnd, pctStart + Math.floor((tokens / (maxTokens * 0.6)) * range))
                send({ type: 'progress', percent: pct, status: label })
              }
            }
          }

          console.log(`[gerar-prd] ${label} — length: ${rawText.length} | ===END===: ${rawText.match(/===END===/g)?.length ?? 0}`)

          if (rawText.includes('===FILE:') && !rawText.trimEnd().endsWith('===END===')) {
            console.warn(`[gerar-prd] ${label} cortado — adicionando ===END=== de fallback`)
            rawText += '\n===END==='
          }

          const result = parseArquivos(rawText)
          console.log(`[gerar-prd] ${label} arquivos:`, Object.keys(result))
          return result
        }

        // ── Call 1 — PRD.md ──────────────────────────────────────────────────
        send({ type: 'progress', percent: 5, status: 'Redigindo PRD.md...' })
        const c1 = await runCall(buildPromptPRD(rascunho, arquitetura), 8192, 'Call 1 (PRD.md)', 5, 20)

        if (Object.keys(c1).length === 0) {
          send({ type: 'error', message: 'Não foi possível gerar o PRD.md. Tente novamente.' })
          return
        }

        // ── Call 2 — CLAUDE.md ───────────────────────────────────────────────
        send({ type: 'progress', percent: 20, status: 'Redigindo CLAUDE.md...' })
        let c2: Record<string, string> = {}
        try { c2 = await runCall(buildPromptClaude(rascunho, arquitetura), 4096, 'Call 2 (CLAUDE.md)', 20, 35) }
        catch (e) { console.warn('[gerar-prd] Call 2 falhou:', e instanceof Error ? e.message : e) }

        // ── Call 3 — PLAN.md ─────────────────────────────────────────────────
        send({ type: 'progress', percent: 35, status: 'Redigindo PLAN.md...' })
        let c3: Record<string, string> = {}
        try { c3 = await runCall(buildPromptPlan(rascunho, arquitetura), 4096, 'Call 3 (PLAN.md)', 35, 50) }
        catch (e) { console.warn('[gerar-prd] Call 3 falhou:', e instanceof Error ? e.message : e) }

        // ── Call 4 — .env.example ────────────────────────────────────────────
        send({ type: 'progress', percent: 50, status: 'Gerando .env.example...' })
        let c4: Record<string, string> = {}
        try { c4 = await runCall(buildPromptEnv(rascunho, arquitetura), 2048, 'Call 4 (.env.example)', 50, 60) }
        catch (e) { console.warn('[gerar-prd] Call 4 falhou:', e instanceof Error ? e.message : e) }

        // ── Call 5 — .gitignore ──────────────────────────────────────────────
        send({ type: 'progress', percent: 60, status: 'Gerando .gitignore...' })
        let c5: Record<string, string> = {}
        try { c5 = await runCall(buildPromptGitignore(rascunho, arquitetura), 1024, 'Call 5 (.gitignore)', 60, 68) }
        catch (e) { console.warn('[gerar-prd] Call 5 falhou:', e instanceof Error ? e.message : e) }

        // ── Call 6 — README.md ───────────────────────────────────────────────
        send({ type: 'progress', percent: 68, status: 'Gerando README.md...' })
        let c6: Record<string, string> = {}
        try { c6 = await runCall(buildPromptReadme(rascunho, arquitetura), 2048, 'Call 6 (README.md)', 68, 82) }
        catch (e) { console.warn('[gerar-prd] Call 6 falhou:', e instanceof Error ? e.message : e) }

        // ── Call 7 — COMO_USAR.md ────────────────────────────────────────────
        send({ type: 'progress', percent: 82, status: 'Gerando guia de uso...' })
        let c7: Record<string, string> = {}
        try { c7 = await runCall(buildPromptComoUsar(rascunho, arquitetura), 2048, 'Call 7 (COMO_USAR.md)', 82, 95) }
        catch (e) { console.warn('[gerar-prd] Call 7 falhou:', e instanceof Error ? e.message : e) }

        const arquivos = { ...c1, ...c2, ...c3, ...c4, ...c5, ...c6, ...c7 }
        const total    = Object.keys(arquivos).length
        console.log('[gerar-prd] arquivos finais:', Object.keys(arquivos))
        const parcial  = total < 7

        send({
          type:    'done',
          arquivos,
          titulo:  rascunho.titulo,
          parcial,
          aviso:   parcial
            ? `${total} de 7 arquivos gerados. Alguns não foram incluídos por timeout — regenere ou crie manualmente.`
            : undefined,
        })

      } catch (err) {
        console.error('[gerar-prd]', err)
        send({ type: 'error', message: err instanceof Error ? err.message : 'Erro interno' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
