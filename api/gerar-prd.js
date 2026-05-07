export const maxDuration = 60;

const SYSTEM_PROMPT_IDEIA = `Você é um agente especializado em transformar descrições de projeto em PRDs estruturados.

Receberá um texto extraído de um documento (transcrição de reunião, briefing, anotações, slides, etc.) e deve gerar um PRD em markdown seguindo EXATAMENTE este formato:

# PRD — <NOME DO PROJETO>
> Gerado via Análise de Documento | <DATA DD/MM/AAAA>

---

## 1. Problema identificado
<descrição: 2-4 frases>

---

## 2. Solução proposta
O sistema deve: <itens separados por vírgula>.
Entrega via: <canais de entrega>.
Resultado esperado: <impacto pra quem usa>.

<parágrafo livre opcional explicando a solução em 2-3 frases>

---

## 3. Arquitetura do projeto
**Tipo:** <um dos 6 Tipos descritos abaixo, no formato "Tipo X — Nome">

**Justificativa:** <por que esse Tipo, baseado nos sinais do texto>

---

## 4. Funcionalidades
- <bullet 1>
- <bullet 2>
- ...

---

## 5. Persona e usuários
**Para quem:** <Uso próprio | Clientes externos | Equipe interna | Público geral>
**Desejos:** <itens>
**Dores:** <itens>
**Familiaridade tecnológica:** <Alta | Média (WhatsApp, email) | Baixa — interface muito simples>
**Dispositivos:** <celular | computador | celular e computador>
**Níveis de acesso:** <Único nível | Dois níveis (visualizador e editor) | Três níveis (admin, equipe, cliente)>

<parágrafo livre opcional descrevendo a persona>

---

## 6. Referências e inspirações
**Como deve ser percebido:** <itens — ex.: Simples e fácil de usar; Profissional e confiável; Moderno e inovador; Discreto e eficiente>

<exemplos de apps/sites/produtos que inspiram, se houver>

---

## 7. Stack tecnológica *(gerado automaticamente)*
- <tecnologia 1>
- <tecnologia 2>
- ...

---

## 8. Modelo de IA por tarefa *(gerado automaticamente)*
<descrição em uma linha — ex.: "Conversa → Sonnet | HeartBeats → Haiku | Planejamento → Opus">

---

## 9. Milestones *(gerado automaticamente)*
- Fase 1 — <objetivo + entregas>
- Fase 2 — <objetivo + entregas>
- ...

---

## Instrução para o Claude Code
Leia este PRD e a BASE_CONHECIMENTO.md em ~/Documents/claude/BASE_CONHECIMENTO.md.
Antes de começar:
1. Liste todos os arquivos que vai criar com uma linha descrevendo cada um
2. Aguarde confirmação
3. Só então comece a construir

**Tipo:** <repetir o Tipo decidido na seção 3>

---

REGRAS PARA DECIDIR O TIPO (1-6):
- **Tipo 1 — Skill standalone**: automação de 1 processo específico, sem app/projeto associado, sem persistência. Ex.: gerar relatório a partir de CSV.
- **Tipo 2 — Agente Claude Code simples**: script/app sob demanda, 1 usuário, sem rodar 24/7, sem dados persistentes complexos.
- **Tipo 3 — Claude Code + Skills**: app com múltiplas capacidades especializadas, padrões consistentes, várias skills compartilhadas.
- **Tipo 4 — OpenClaw (agente 24/7)**: age sozinho via Telegram, memória persistente em arquivos, proativo (HeartBeats), 1 dono.
- **Tipo 5 — OpenClaw + Supabase**: Tipo 4 + múltiplos agentes compartilhando dados estruturados (queries SQL), histórico consultável.
- **Tipo 6 — Sistema completo com Mission Control**: Tipo 5 + dashboard executivo visual (Next.js), métricas em tempo real, multi-usuário.

REGRAS GERAIS DE GERAÇÃO:
1. Use APENAS o que está no texto recebido. NÃO invente fatos sobre o projeto.
2. Para campos onde a info NÃO está no texto: escreva exatamente "*não informado*" (com asteriscos).
3. Para Tipo, Stack, Modelo de IA e Milestones: SEMPRE infira (são auto-gerados — use seu julgamento mesmo com info parcial).
4. Para Modelos de IA siga: Haiku → tarefas simples/rotineiras; Sonnet → conversa/conteúdo; Opus → decisões complexas. Em Tipo 4-6, sempre sugira modelo gratuito (Gemini Flash ou Kimi K2.5) como fallback de HeartBeats.
5. Use português brasileiro.
6. RESPOSTA: APENAS o markdown do PRD. Comece direto com "# PRD —". Não escreva "Aqui está o PRD:", não escreva comentários, não escreva nada antes ou depois do PRD.`;

const SYSTEM_PROMPT_IDENTIFICAR = `Você é um analisador de documentos de curso, mentoria, transcrição ou anotações.

Dado o texto abaixo, identifique e retorne EXCLUSIVAMENTE um JSON com este formato:

{
  "tipo_documento": "string — descrição curta do que é o documento (ex: 'Resumo de mentoria de criação de audiência digital', 'Transcrição de aula sobre vendas no Instagram', 'Anotações de curso de copywriting')",
  "objetivo_fundamental": "string — o resultado principal que o método/curso/mentoria promete entregar a quem aplica",
  "passos_principais": ["array de strings, máximo 10, em ordem cronológica do método ensinado"],
  "plataformas_mencionadas": ["array de strings com nomes de plataformas/canais citados (Instagram, YouTube, TikTok, WhatsApp, email, LinkedIn, etc.)"],
  "ferramentas_mencionadas": ["array de strings com ferramentas/softwares citados (CapCut, Notion, ChatGPT, Canva, etc.)"],
  "kpis_mencionados": ["array de strings com critérios/KPIs/métricas citados (ex: 'Taxa de retenção acima de 70%', '3 posts por dia', 'CTR > 5%')"],
  "metas_mencionadas": ["array de strings com metas/objetivos citados (ex: '10k seguidores em 90 dias', '1 post viral por semana')"],
  "insights_principais": ["array de strings, máximo 8, com os ensinamentos/princípios/insights mais importantes do documento"],
  "modalidades_execucao": ["array de strings com formatos/modalidades de execução citados (ex: 'Reels curtos', 'Vídeos longos no YouTube', 'Carrossel', 'Stories diários')"]
}

REGRAS:
1. Use APENAS o que está no texto recebido. NÃO invente.
2. Para arrays sem informação no texto, retorne array vazio [].
3. Para campos string sem informação, retorne string vazia "".
4. Use português brasileiro.
5. NUNCA escreva nada além do JSON. Sem prefixo, sem sufixo, sem markdown, sem code fences. Comece direto com { e termine com }.`;

const SYSTEM_PROMPT_CURSO = `Você é um agente especializado em transformar conteúdo de cursos, mentorias, transcrições ou anotações em PRDs de sistemas de IA que aplicam ativamente esse conhecimento.

Receberá:
1. O texto original do documento
2. Uma identificação estruturada (tipo, objetivo, passos, plataformas, ferramentas, KPIs, metas, insights, modalidades)
3. Possivelmente uma observação de correção do usuário
4. Respostas estruturadas a 18 perguntas que detalham o que o usuário quer

Deve gerar um PRD em markdown seguindo EXATAMENTE este formato:

# PRD — <NOME DO SISTEMA, baseado no objetivo do documento>
> Gerado via Análise de Curso/Mentoria | <DATA DD/MM/AAAA>

---

## 1. Documento de origem
**Tipo:** <tipo_documento da identificação>
**Objetivo fundamental do método:** <objetivo_fundamental>
**Fase atual do usuário:** <resposta P1>
**Maior gargalo hoje:** <resposta P2>

---

## 2. Problema identificado
<2-4 frases conectando o gargalo do usuário ao método ensinado no documento>

---

## 3. Solução proposta
O sistema deve: <listar funcionalidades derivadas das respostas>.
Entrega via: <canais baseados em P17>.
Resultado esperado: <impacto baseado em P1+P16>.

<parágrafo livre 2-3 frases explicando como o sistema aplica o método do documento na rotina do usuário>

---

## 4. Arquitetura do projeto
**Tipo:** <um dos 6 Tipos abaixo>

**Justificativa:** <por que esse Tipo, baseado nas respostas>

REGRAS PARA DECIDIR O TIPO:
- Tipo 1 — Skill standalone: 1 processo, sem persistência
- Tipo 2 — Agente Claude Code simples: sob demanda, 1 usuário
- Tipo 3 — Claude Code + Skills: múltiplas capacidades especializadas
- Tipo 4 — OpenClaw (agente 24/7): autônomo via Telegram, memória persistente, proativo
- Tipo 5 — OpenClaw + Supabase: Tipo 4 + dados estruturados consultáveis
- Tipo 6 — Sistema completo com Mission Control: Tipo 5 + dashboard executivo visual

DICA: se P11 = relatório semanal automático ou P17 inclui dashboard, tende a Tipo 5/6. Se P1 = "Já tenho rotina" e quer automatizar com memória → Tipo 4/5.

---

## 5. Passos do método cobertos pelo sistema
Para cada passo do método (passos_principais), descrever:
- **<Nome do passo>** — modo: <Automatizar | Mostrar opções | Só lembrar, baseado em P12>
  - O que o sistema faz: <ação concreta>
  - O que o usuário faz: <ação humana, se houver>
  - Referência: <"módulo/aula correspondente do documento" — se P13 inclui indicar referência>

---

## 6. Funcionalidades
Listar bullets que combinam:
- O que foi escolhido nas perguntas (P4 plataformas, P8 ferramentas, P9 ganchos, P10 insights, P15 KPIs, P16 metas, P17 alertas)
- O modo de cada passo definido em P12
- O que o sistema NÃO deve fazer (P14) explicitado como "**Não fará:** <lista>"

---

## 7. Persona e usuários
**Para quem:** Uso próprio
**Maior gargalo:** <P2>
**Limitações declaradas:** <P7>
**Familiaridade tecnológica:** <inferir baseado em P1 e ferramentas P8>
**Dispositivos:** <inferir de P17>
**Níveis de acesso:** Único nível (uso próprio)

---

## 8. Stack tecnológica *(gerado automaticamente)*
SEMPRE use o ecossistema Claude Code/OpenClaw/Supabase. NUNCA sugira Python puro, LangChain, ChromaDB, Pinecone, Weaviate, Streamlit ou frameworks de outros ecossistemas.

Stack base obrigatória:
- Claude Code (orquestração local)
- GitHub (versionamento)

Adicione conforme respostas:
- OpenClaw + VPS Hostinger + Tailscale → se Tipo 4-6
- Supabase + PostgreSQL → se Tipo 5-6 ou se precisa histórico consultável
- Next.js + React + Tailwind → se Tipo 6 ou P17 inclui dashboard
- Telegram Bot → se P17 inclui Telegram
- Email MCP → se P17 inclui Email
- Brave Search MCP → se precisa pesquisa de nicho/termos
- Social MCP → se P4 menciona Instagram/YouTube/TikTok/LinkedIn

---

## 9. Modelo de IA por tarefa *(gerado automaticamente)*
SMART ROUTING obrigatório:
- **Gemini** → APENAS transcrição de vídeos (único que faz isso bem hoje)
- **Claude Sonnet** → scripts, ganchos, análise de conteúdo, decisões complexas
- **Claude Haiku** → alertas, tarefas repetitivas, classificação simples
- **Claude + Brave Search** → pesquisa de nichos e termos
- **Gemini Flash ou Kimi K2.5** → fallback gratuito de HeartBeats em Tipo 4-6

Formato: uma linha listando "Tarefa → Modelo | Tarefa → Modelo | ..."

---

## 10. Milestones *(gerado automaticamente)*
Baseado nos passos_principais do método e na fase atual (P1):
- **Fase 1 — <primeiro passo do método>**: configuração inicial e primeira execução
- **Fase 2 — <próximos passos>**: rotina automatizada
- **Fase 3 — Análise**: relatórios e otimização (se P11 = sim)
- **Fase final — Escala**: otimização contínua

---

## 11. Limites do sistema *(o que ele NÃO deve fazer)*
Listar P14 + P14_outro como bullets explícitos.

---

## Instrução para o Claude Code
Leia este PRD e a BASE_CONHECIMENTO.md em ~/Documents/claude/BASE_CONHECIMENTO.md.
Antes de começar:
1. Liste todos os arquivos que vai criar com uma linha descrevendo cada um
2. Aguarde confirmação
3. Só então comece a construir

**Tipo:** <repetir o Tipo decidido na seção 4>

---

REGRAS GERAIS DE GERAÇÃO:
1. Use APENAS o que está no documento de origem e nas respostas. NÃO invente fatos.
2. Para campos sem info: escreva "*não informado*".
3. SEMPRE use o ecossistema Claude Code/OpenClaw/Supabase — NUNCA Python puro, LangChain, ChromaDB.
4. Para cada funcionalidade que dependa do documento, citar "(referência: <módulo/aula relevante do documento>)" se P13 inclui indicar referência.
5. Separar SEMPRE o que o sistema faz automaticamente do que o usuário faz manualmente.
6. Smart routing obrigatório: Gemini só para vídeo, Claude para o resto.
7. Use português brasileiro.
8. RESPOSTA: APENAS o markdown do PRD. Comece direto com "# PRD —". Sem prefixo, sem sufixo.`;

function buildUserMessageCurso({ texto, identificacao, correcao, respostas, dataHoje }) {
  const ident = identificacao || {};
  const r = respostas || {};
  const lines = [];
  lines.push(`Data de hoje: ${dataHoje}`);
  lines.push('');
  lines.push('=== IDENTIFICAÇÃO DO DOCUMENTO ===');
  lines.push(`Tipo: ${ident.tipo_documento || '(não identificado)'}`);
  lines.push(`Objetivo fundamental: ${ident.objetivo_fundamental || '(não identificado)'}`);
  lines.push(`Passos principais: ${(ident.passos_principais || []).join(' | ') || '(nenhum)'}`);
  lines.push(`Plataformas: ${(ident.plataformas_mencionadas || []).join(', ') || '(nenhuma)'}`);
  lines.push(`Ferramentas: ${(ident.ferramentas_mencionadas || []).join(', ') || '(nenhuma)'}`);
  lines.push(`KPIs: ${(ident.kpis_mencionados || []).join(' | ') || '(nenhum)'}`);
  lines.push(`Metas: ${(ident.metas_mencionadas || []).join(' | ') || '(nenhuma)'}`);
  lines.push(`Insights: ${(ident.insights_principais || []).join(' | ') || '(nenhum)'}`);
  lines.push(`Modalidades: ${(ident.modalidades_execucao || []).join(', ') || '(nenhuma)'}`);
  if (correcao && correcao.trim()) {
    lines.push('');
    lines.push('=== CORREÇÃO DO USUÁRIO À IDENTIFICAÇÃO ===');
    lines.push(correcao.trim());
  }
  lines.push('');
  lines.push('=== RESPOSTAS DO USUÁRIO (18 perguntas) ===');
  lines.push(`P1 (fase atual): ${r.p1_fase || '(não respondido)'}`);
  lines.push(`P2 (maior gargalo): ${r.p2_gargalo || '(não respondido)'}`);
  lines.push(`P3 (executou primeiro passo?): ${r.p3_primeiro_passo || '(não respondido)'}`);
  lines.push(`P4 (plataformas escolhidas): ${[...(r.p4_plataformas || []), ...(r.p4_plataformas_outras ? [r.p4_plataformas_outras + ' (livre)'] : [])].join(', ') || '(nenhuma)'}`);
  lines.push(`P5 (configuração das plataformas): ${r.p5_configuracao || '(não respondido)'}`);
  lines.push(`P6 (modalidade priorizada): ${r.p6_modalidade || '(não respondido)'}`);
  lines.push(`P7 (limitações): ${(r.p7_limitacoes || []).join(', ') || '(nenhuma)'}`);
  lines.push(`P8 (ferramentas que já usa): ${[...(r.p8_ferramentas || []), ...(r.p8_ferramentas_outras ? [r.p8_ferramentas_outras + ' (livre)'] : [])].join(', ') || '(nenhuma)'}`);
  lines.push(`P9 (ganchos): ${r.p9_ganchos || '(não respondido)'}`);
  lines.push(`P10 (insights ativos): ${(r.p10_insights || []).join(' | ') || '(nenhum)'}`);
  lines.push(`P11 (análise de padrões): ${r.p11_padroes || '(não respondido)'}`);
  const p12 = r.p12_modos_por_passo || {};
  const p12str = Object.keys(p12).length
    ? Object.keys(p12).map((k) => `  - "${k}" → ${p12[k]}`).join('\n')
    : '  (não respondido)';
  lines.push(`P12 (modo por passo do método):\n${p12str}`);
  lines.push(`P13 (quando tiver dúvida): ${r.p13_duvida || '(não respondido)'}`);
  lines.push(`P14 (NÃO fazer): ${[...(r.p14_nao_fazer || []), ...(r.p14_nao_fazer_outro ? [r.p14_nao_fazer_outro + ' (livre)'] : [])].join(' | ') || '(nenhum)'}`);
  lines.push(`P15 (KPIs): ${r.p15_kpis || '(não respondido)'}${r.p15_kpis_ajuste ? ` — ajuste: ${r.p15_kpis_ajuste}` : ''}`);
  lines.push(`P16 (metas): ${[...(r.p16_metas || []), ...(r.p16_metas_outras ? [r.p16_metas_outras + ' (livre)'] : [])].join(' | ') || '(nenhuma)'}`);
  lines.push(`P17 (alertas/canais): ${r.p17_alertas || '(não respondido)'}`);
  if (r.p18_livre) {
    lines.push(`P18 (campo livre): ${r.p18_livre}`);
  }
  lines.push('');
  lines.push('=== TEXTO ORIGINAL DO DOCUMENTO ===');
  lines.push(texto);
  return lines.join('\n');
}

async function callAnthropic({ apiKey, system, userMessage, maxTokens = 4000 }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Anthropic API error:', response.status, errorBody);
    const err = new Error(`API do Claude respondeu com erro (${response.status}). Tenta novamente em alguns segundos.`);
    err.status = 502;
    throw err;
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (!text || typeof text !== 'string') {
    const err = new Error('Resposta inesperada da API do Claude. Tenta novamente.');
    err.status = 502;
    throw err;
  }
  return text;
}

function parseJsonStrict(raw) {
  // Tenta o parse direto
  try {
    return JSON.parse(raw);
  } catch (_) {}
  // Fallback: extrair primeiro bloco { ... } caso o modelo tenha enrolado
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (_) {}
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método não permitido. Use POST.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: 'Chave da API do Claude não configurada no servidor. Avise o administrador.',
    });
  }

  const body = req.body || {};
  const tipo = body.tipo || 'ideia';
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  try {
    if (tipo === 'ideia') {
      const { texto } = body;
      if (typeof texto !== 'string' || texto.trim().length < 50) {
        return res.status(400).json({
          ok: false,
          error: 'Texto vazio ou muito curto (mínimo 50 caracteres). Envie um documento com mais conteúdo.',
        });
      }
      const textoLimitado = texto.length > 100000 ? texto.slice(0, 100000) : texto;
      const prd = await callAnthropic({
        apiKey,
        system: SYSTEM_PROMPT_IDEIA,
        userMessage: `Data de hoje: ${dataHoje}\n\nTexto do documento:\n\n${textoLimitado}`,
      });
      return res.status(200).json({ ok: true, prd });
    }

    if (tipo === 'identificar') {
      const { texto } = body;
      if (typeof texto !== 'string' || texto.trim().length < 50) {
        return res.status(400).json({
          ok: false,
          error: 'Texto vazio ou muito curto (mínimo 50 caracteres). Envie um documento com mais conteúdo.',
        });
      }
      const textoLimitado = texto.length > 100000 ? texto.slice(0, 100000) : texto;
      const raw = await callAnthropic({
        apiKey,
        system: SYSTEM_PROMPT_IDENTIFICAR,
        userMessage: `Texto do documento:\n\n${textoLimitado}`,
        maxTokens: 2000,
      });
      const ident = parseJsonStrict(raw);
      if (!ident || typeof ident !== 'object') {
        console.error('Falha ao parsear identificação JSON. Raw:', raw.slice(0, 500));
        return res.status(502).json({
          ok: false,
          error: 'A IA não retornou uma identificação válida. Tenta novamente ou pule e preencha manualmente.',
        });
      }
      // Normaliza arrays/strings esperados
      const normArr = (v) => Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : [];
      const normStr = (v) => typeof v === 'string' ? v.trim() : '';
      const identificacao = {
        tipo_documento: normStr(ident.tipo_documento),
        objetivo_fundamental: normStr(ident.objetivo_fundamental),
        passos_principais: normArr(ident.passos_principais).slice(0, 10),
        plataformas_mencionadas: normArr(ident.plataformas_mencionadas),
        ferramentas_mencionadas: normArr(ident.ferramentas_mencionadas),
        kpis_mencionados: normArr(ident.kpis_mencionados),
        metas_mencionadas: normArr(ident.metas_mencionadas),
        insights_principais: normArr(ident.insights_principais).slice(0, 8),
        modalidades_execucao: normArr(ident.modalidades_execucao),
      };
      return res.status(200).json({ ok: true, identificacao });
    }

    if (tipo === 'curso') {
      const { texto, identificacao, correcao, respostas } = body;
      if (typeof texto !== 'string' || texto.trim().length < 50) {
        return res.status(400).json({ ok: false, error: 'Texto original do documento ausente ou muito curto.' });
      }
      if (!identificacao || typeof identificacao !== 'object') {
        return res.status(400).json({ ok: false, error: 'Identificação do documento ausente.' });
      }
      if (!respostas || typeof respostas !== 'object') {
        return res.status(400).json({ ok: false, error: 'Respostas do formulário ausentes.' });
      }
      const textoLimitado = texto.length > 60000 ? texto.slice(0, 60000) : texto;
      const userMessage = buildUserMessageCurso({
        texto: textoLimitado,
        identificacao,
        correcao,
        respostas,
        dataHoje,
      });
      const prd = await callAnthropic({
        apiKey,
        system: SYSTEM_PROMPT_CURSO,
        userMessage,
        maxTokens: 4000,
      });
      return res.status(200).json({ ok: true, prd });
    }

    return res.status(400).json({ ok: false, error: `Tipo desconhecido: "${tipo}". Use "ideia", "identificar" ou "curso".` });
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ ok: false, error: err.message });
    }
    console.error('Function error:', err?.message || err);
    return res.status(500).json({
      ok: false,
      error: 'Erro interno ao processar a requisição. Tente novamente ou preencha o formulário manualmente.',
    });
  }
}
