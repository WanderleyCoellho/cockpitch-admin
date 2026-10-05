# Lumen Deal Ops

Painel operacional para triagem de comprovantes e gestão manual de licenças.

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
