'use strict'
require('dotenv').config()

const express  = require('express')
const cors     = require('cors')
const Anthropic = require('@anthropic-ai/sdk').default

const app  = express()
const PORT = Number(process.env.PORT) || 3001

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: [
    'https://formulario-prd.vercel.app',
    'http://localhost:3000',  // dev local
  ],
  methods:      ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '1mb' }))

// ─── Auth ─────────────────────────────────────────────────────────────────────

function autenticar(req, res, next) {
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token || token !== process.env.API_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado' })
  }
  next()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseArquivos(texto) {
  const arquivos = {}
  const regex = /===FILE: ([^\n]+)===\n([\s\S]*?)===END===/g
  let match
  while ((match = regex.exec(texto)) !== null) {
    const nome     = match[1].trim()
    const conteudo = match[2].trim()
    if (nome && conteudo) arquivos[nome] = conteudo
  }
  return arquivos
}

// ─── System prompt ────────────────────────────────────────────────────────────

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

function buildPromptPRD(rascunho, arquitetura) {
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

function buildPromptClaude(rascunho, arquitetura) {
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

function buildPromptPlan(rascunho, arquitetura) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const numMilestones = (
    { 'Simples': 2, 'Média': 3, 'Alta': 4, 'Muito Alta': 5 }
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

function buildPromptEnv(rascunho, arquitetura) {
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

function buildPromptGitignore(rascunho, arquitetura) {
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

function buildPromptReadme(rascunho, arquitetura) {
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

function buildPromptComoUsar(rascunho, arquitetura) {
  const ctx = {
    titulo:       rascunho.titulo,
    tipo_numero:  arquitetura.tipo_numero,
    tipo_projeto: arquitetura.tipo_projeto,
    stack:        arquitetura.stack,
    alertas:      arquitetura.alertas,
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

// ─── Rota principal — POST /gerar-prd ────────────────────────────────────────

app.post('/gerar-prd', autenticar, async (req, res) => {
  const { rascunho, arquitetura } = req.body

  if (!rascunho?.titulo || !arquitetura?.tipo_projeto) {
    return res.status(400).json({ error: 'Rascunho ou arquitetura não informados' })
  }

  // Inicia SSE — o cliente começa a receber dados imediatamente
  res.setHeader('Content-Type',      'text/event-stream')
  res.setHeader('Cache-Control',     'no-cache')
  res.setHeader('Connection',        'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (data) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Helper: executa um call Anthropic e retorna os arquivos parseados
    const runCall = async (prompt, maxTokens, label, pctStart, pctEnd) => {
      let rawText = '', tokens = 0
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

      console.log(`[prd-api] ${label} — length: ${rawText.length} | ===END===: ${(rawText.match(/===END===/g) || []).length}`)

      if (rawText.includes('===FILE:') && !rawText.trimEnd().endsWith('===END===')) {
        console.warn(`[prd-api] ${label} cortado — adicionando ===END=== de fallback`)
        rawText += '\n===END==='
      }

      const result = parseArquivos(rawText)
      console.log(`[prd-api] ${label} arquivos:`, Object.keys(result))
      return result
    }

    // ── Call 1 — PRD.md ──────────────────────────────────────────────────────
    send({ type: 'progress', percent: 5, status: 'Redigindo PRD.md...' })
    const c1 = await runCall(buildPromptPRD(rascunho, arquitetura), 8192, 'Call 1 (PRD.md)', 5, 20)

    if (Object.keys(c1).length === 0) {
      send({ type: 'error', message: 'Não foi possível gerar o PRD.md. Tente novamente.' })
      res.end()
      return
    }

    // ── Call 2 — CLAUDE.md ───────────────────────────────────────────────────
    send({ type: 'progress', percent: 20, status: 'Redigindo CLAUDE.md...' })
    let c2 = {}
    try { c2 = await runCall(buildPromptClaude(rascunho, arquitetura), 4096, 'Call 2 (CLAUDE.md)', 20, 35) }
    catch (e) { console.warn('[prd-api] Call 2 falhou:', e.message) }

    // ── Call 3 — PLAN.md ─────────────────────────────────────────────────────
    send({ type: 'progress', percent: 35, status: 'Redigindo PLAN.md...' })
    let c3 = {}
    try { c3 = await runCall(buildPromptPlan(rascunho, arquitetura), 4096, 'Call 3 (PLAN.md)', 35, 50) }
    catch (e) { console.warn('[prd-api] Call 3 falhou:', e.message) }

    // ── Call 4 — .env.example ────────────────────────────────────────────────
    send({ type: 'progress', percent: 50, status: 'Gerando .env.example...' })
    let c4 = {}
    try { c4 = await runCall(buildPromptEnv(rascunho, arquitetura), 2048, 'Call 4 (.env.example)', 50, 60) }
    catch (e) { console.warn('[prd-api] Call 4 falhou:', e.message) }

    // ── Call 5 — .gitignore ──────────────────────────────────────────────────
    send({ type: 'progress', percent: 60, status: 'Gerando .gitignore...' })
    let c5 = {}
    try { c5 = await runCall(buildPromptGitignore(rascunho, arquitetura), 1024, 'Call 5 (.gitignore)', 60, 68) }
    catch (e) { console.warn('[prd-api] Call 5 falhou:', e.message) }

    // ── Call 6 — README.md ───────────────────────────────────────────────────
    send({ type: 'progress', percent: 68, status: 'Gerando README.md...' })
    let c6 = {}
    try { c6 = await runCall(buildPromptReadme(rascunho, arquitetura), 2048, 'Call 6 (README.md)', 68, 82) }
    catch (e) { console.warn('[prd-api] Call 6 falhou:', e.message) }

    // ── Call 7 — COMO_USAR.md ────────────────────────────────────────────────
    send({ type: 'progress', percent: 82, status: 'Gerando guia de uso...' })
    let c7 = {}
    try { c7 = await runCall(buildPromptComoUsar(rascunho, arquitetura), 2048, 'Call 7 (COMO_USAR.md)', 82, 95) }
    catch (e) { console.warn('[prd-api] Call 7 falhou:', e.message) }

    const arquivos = { ...c1, ...c2, ...c3, ...c4, ...c5, ...c6, ...c7 }
    const total    = Object.keys(arquivos).length
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
    console.error('[prd-api]', err.message)
    send({ type: 'error', message: err.message || 'Erro interno' })
  } finally {
    res.end()
  }
})

// ─── Arquiteto: helpers ───────────────────────────────────────────────────────

function parseFields(texto) {
  const campos = {}
  const regex = /===FIELD:\s*([^=\r\n]+?)\s*===\r?\n?([\s\S]*?)===END===/g
  let m
  while ((m = regex.exec(texto)) !== null) {
    campos[m[1].trim()] = m[2].trim()
  }
  if (Object.keys(campos).length === 0) {
    throw new Error('Formato de resposta inválido — zero campos encontrados.')
  }
  return campos
}

function toList(valor) {
  if (!valor) return []
  return valor
    .split(/\r?\n/)
    .map((s) => s.replace(/^[-•*\d]+[.)]\s*/, '').trim())
    .filter(Boolean)
}

function parseCamposArquitetura(campos) {
  return {
    tipo_projeto:         campos.tipo_projeto        ?? '',
    tipo_numero:          parseInt(campos.tipo_numero ?? '3', 10) || 3,
    complexidade:         campos.complexidade         ?? 'Média',
    modo_operacao:        campos.modo_operacao        ?? 'On-demand',
    escala:               campos.escala               ?? '',
    stack:                toList(campos.stack               ?? ''),
    banco_dados:          campos.banco_dados          ?? '',
    agente:               campos.agente               ?? '',
    num_agentes:          campos.num_agentes          ?? '',
    ias_recomendadas:     toList(campos.ias_recomendadas    ?? ''),
    skills:               toList(campos.skills              ?? ''),
    mcps:                 toList(campos.mcps                ?? ''),
    smart_routing:        campos.smart_routing        ?? '',
    deploy:               campos.deploy               ?? '',
    mvp_funcionalidades:  toList(campos.mvp_funcionalidades ?? ''),
    v2_funcionalidades:   toList(campos.v2_funcionalidades  ?? ''),
    alertas:              toList(campos.alertas             ?? ''),
  }
}

async function buscarSupabase(keywords) {
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

  const resultados = []

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
        const data = await res.json()
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

async function buscarBrave(query) {
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

    const data = await res.json()
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

function extrairKeywords(rascunho) {
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

function buildPromptArquiteto(rascunho, supabaseCtx, braveCtx) {
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

// ─── Arquiteto: system prompt + base de conhecimento ─────────────────────────

const BASE_CONHECIMENTO_ARQUITETO = `
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

const SISTEMA_ARQUITETO = `Você é o Agente Arquiteto do Sistema PRD Developer.
Sua tarefa: analisar o rascunho de projeto abaixo e produzir uma decisão arquitetural completa.

FORMATO DE RESPOSTA — OBRIGATÓRIO:
- JAMAIS use JSON. JAMAIS use chaves {}, colchetes [], vírgulas ou dois-pontos como estrutura de dados.
- JAMAIS use markdown, blocos de código, asteriscos ou qualquer outra formatação.
- Use EXCLUSIVAMENTE o formato de campos delimitados: ===FIELD: nome=== ... ===END===
- Para campos de lista: um item por linha, sem marcadores, sem numeração, sem bullets.
- Não inclua NENHUM texto fora dos delimitadores ===FIELD=== e ===END===.
- A resposta deve começar diretamente com ===FIELD: tipo_projeto=== e terminar com ===END===.

Execute internamente as 5 etapas antes de responder:
ETAPA 1: Analise contexto do negócio — setor, tipo de processo, complexidade operacional, volume.
ETAPA 2: Classifique o projeto como Tipo 1-6 usando o BASE_CONHECIMENTO abaixo.
ETAPA 3: Use os resultados de pesquisa fornecidos (IAs/Skills/MCPs da base + Brave Search).
ETAPA 4: Decida toda a arquitetura sem envolver o usuário — stack, banco, agentes, deploy, MCPs, routing.
ETAPA 5: Identifique armadilhas específicas para este projeto (APIs, custos, segurança, LGPD).

${BASE_CONHECIMENTO_ARQUITETO}

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

// ─── Rota — POST /arquiteto ───────────────────────────────────────────────────

app.post('/arquiteto', autenticar, async (req, res) => {
  const { rascunho } = req.body

  if (!rascunho?.titulo) {
    return res.status(400).json({ error: 'Rascunho não informado' })
  }

  try {
    const keywords   = extrairKeywords(rascunho)
    const braveQuery = `${rascunho.titulo} automação software arquitetura`

    const [supabaseResult, braveResult] = await Promise.allSettled([
      buscarSupabase(keywords),
      buscarBrave(braveQuery),
    ])

    const supabaseCtx = supabaseResult.status === 'fulfilled' ? supabaseResult.value : ''
    const braveCtx    = braveResult.status    === 'fulfilled' ? braveResult.value    : ''

    const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const t0      = Date.now()
    console.log('[arquiteto] call start')

    const message = await client.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 4096,
      system:     SISTEMA_ARQUITETO,
      messages:   [{ role: 'user', content: buildPromptArquiteto(rascunho, supabaseCtx, braveCtx) }],
    })

    console.log(`[arquiteto] call ok (${Date.now() - t0}ms)`)

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    console.log('[arquiteto] rawText (500 chars):', rawText.slice(0, 500))

    let campos
    try {
      campos = parseFields(rawText)
    } catch (parseErr) {
      console.error('[arquiteto] parseFields falhou. rawText completo:', rawText)
      return res.status(500).json({ error: parseErr.message || 'Erro ao parsear resposta' })
    }

    console.log('[arquiteto] campos extraídos:', Object.keys(campos))
    return res.json(parseCamposArquitetura(campos))

  } catch (err) {
    console.error('[arquiteto]', err.message)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
})

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()) })
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[prd-api] running on http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) console.warn('[prd-api] AVISO: ANTHROPIC_API_KEY não definida!')
  if (!process.env.API_TOKEN)         console.warn('[prd-api] AVISO: API_TOKEN não definida!')
})
