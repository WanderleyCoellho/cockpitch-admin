# Lumen Deal Ops

Painel interno da Lumen Dev Studios para operar o Lumen Deal: visão geral do negócio (receita, assinantes,
funil), empresas (ficha, Stripe, cortesia), pessoas, saúde do sistema (e-mails, Stripe, banco) e
comprovantes PIX (fluxo antigo). Identidade visual do lumendevstudios.com; spec em
`cockpitch-backend/specs/ops-panel.md`.

Stack: React 18 + Vite, React Router, TanStack Query, Tailwind v4 (tokens da marca em `src/styles.css`),
fontes locais via `@fontsource`. Testes: `npm test` (Vitest + Testing Library).

## Modos de execução

### Desenvolvimento (frontend + proxy via Vite)

1. Configure a variável opcional `OPS_BACKEND_URL` (default: `http://localhost:3001`).
2. Execute `npm run dev`.
3. O frontend usa `/api` same-origin e o Vite faz proxy para o backend.

### Produção local (BFF + build estático)

1. Execute `npm run build`.
2. Configure variáveis (opcional):
   - `OPS_BACKEND_URL` (default: `http://localhost:3001`)
   - `OPS_BFF_PORT` (default: `4174`)
3. Execute `npm run start`.
4. Acesse `http://localhost:4174`.

## Segurança

- O frontend não permite configurar URL de backend em runtime.
- Todas as chamadas usam `/api` same-origin.
- Em produção local, o BFF encaminha `/api/*` para o backend, preservando cookies httpOnly.

### Produção (Vercel)

O painel é publicado na Vercel como site estático. O `vercel.json` repassa `/api/*` para a API
no Railway (mesma origem, preservando o cookie httpOnly do Ops), sem precisar do BFF Express.
