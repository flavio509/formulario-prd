# Sistema 2 — Agente Desenvolvedor de PRD

## O que é
Sistema web que transforma qualquer ideia de negócio em um PRD completo pronto para o Claude Code.
Substitui `formulario-prd.vercel.app`. Repositório: `formulario-prd` no GitHub.

## Stack
- Next.js 15 + Tailwind CSS + TypeScript
- Claude Sonnet API (extração, arquitetura, geração)
- Whisper API (transcrição de áudio — Milestone 2)
- Supabase REST (consulta Sistema 1: IAs/Skills/MCPs — Milestone 3)
- Brave Search API (pesquisa complementar — Milestone 3)
- JSZip client-side (download ZIP — Milestone 4)
- Vercel Blob (upload de áudio temporário — Milestone 2)
- Deploy: Vercel

## Estrutura
```
src/
  app/
    page.tsx                    ← tela inicial (3 modos)
    formulario/page.tsx         ← 9 blocos multi-step
    documento/page.tsx          ← upload arquivos (M2)
    audio/page.tsx              ← upload áudio (M2)
    rascunho/page.tsx           ← revisão e edição do rascunho
    arquitetura/page.tsx        ← revisão arquitetural (M3)
    resultado/page.tsx          ← PRD + download ZIP (M4)
    api/
      extrair-documento/route.ts   ← Claude extrai info do form/docs
      transcrever-audio/route.ts   ← Whisper (M2)
      arquiteto/route.ts           ← Agente Arquiteto (M3)
      gerar-prd/route.ts           ← geração + ZIP (M4)
  components/
    FormularioGuiado.tsx           ← 9 blocos
    UploadDocumentos.tsx           ← M2
    UploadAudio.tsx                ← M2
    RevisaoRascunho.tsx            ← edição do rascunho
    RevisaoArquitetural.tsx        ← M3
    ResultadoPRD.tsx               ← M4
    DownloadZip.tsx                ← M4
  types/prd.ts                     ← todas as interfaces
  lib/
    anthropic.ts                   ← cliente Claude
    supabase.ts                    ← M3
    base-conhecimento.ts           ← Tipos 1-6 para prompt (M3)
```

## Fluxo de dados (sessionStorage)
- `prd-modo`: 'formulario' | 'documento' | 'audio'
- `prd-formulario`: FormularioState JSON
- `prd-rascunho`: RascunhoPRD JSON
- `prd-arquitetura`: ArquiteturaPRD JSON
- `prd-status`: estado atual do fluxo

## Variáveis de ambiente necessárias
```
ANTHROPIC_API_KEY=       (obrigatório)
OPENAI_API_KEY=          (M2 — Whisper)
BRAVE_API_KEY=           (M3 — pesquisa)
SUPABASE_URL=            (M3 — consulta Sistema 1)
SUPABASE_ANON_KEY=       (M3 — consulta Sistema 1)
SISTEMA1_URL=            https://search-ia-base-ias.vercel.app
BLOB_READ_WRITE_TOKEN=   (M2 — upload áudio)
```

## Milestones
- [x] M1: Base + Formulário (9 blocos) + Rascunho
- [ ] M2: Documentos + Áudio
- [ ] M3: Agente Arquiteto
- [ ] M4: Geração + Download ZIP + Deploy

## Padrões do projeto
- Sempre dark theme: bg-zinc-950, bg-zinc-900 para cards, border-zinc-800
- Azul (blue-500/600) para ações primárias
- Sem `console.log` em produção — usar `console.error` apenas em blocos catch
- API routes: sempre retornar `{ error: string }` em erros, com status correto
- sessionStorage como fonte de verdade de estado entre páginas
