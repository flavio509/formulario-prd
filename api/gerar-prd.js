export const maxDuration = 60;

const SYSTEM_PROMPT = `Você é um agente especializado em transformar descrições de projeto em PRDs estruturados.

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

  const { texto } = req.body || {};

  if (typeof texto !== 'string' || texto.trim().length < 50) {
    return res.status(400).json({
      ok: false,
      error: 'Texto vazio ou muito curto (mínimo 50 caracteres). Envie um documento com mais conteúdo.',
    });
  }

  const textoLimitado = texto.length > 100000 ? texto.slice(0, 100000) : texto;
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Data de hoje: ${dataHoje}\n\nTexto do documento:\n\n${textoLimitado}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Anthropic API error:', response.status, errorBody);
      return res.status(502).json({
        ok: false,
        error: `A API do Claude respondeu com erro (${response.status}). Tenta novamente em alguns segundos.`,
      });
    }

    const data = await response.json();
    const prd = data?.content?.[0]?.text;

    if (!prd || typeof prd !== 'string') {
      return res.status(502).json({
        ok: false,
        error: 'Resposta inesperada da API do Claude. Tenta novamente.',
      });
    }

    return res.status(200).json({ ok: true, prd });
  } catch (err) {
    console.error('Function error:', err?.message || err);
    return res.status(500).json({
      ok: false,
      error: 'Erro interno ao gerar o PRD. Tenta de novo ou preencha o formulário manualmente.',
    });
  }
}
