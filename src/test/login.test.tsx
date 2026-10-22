import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '../auth/session'
import { App } from '../App'

type Handler = (url: string, init?: RequestInit) => { status: number; body?: unknown }

function mockApi(handler: Handler) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const { status, body } = handler(String(input), init)
        return new Response(body === undefined ? '' : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
}

const overview = {
    days: 30,
    generatedAt: new Date().toISOString(),
    stripeMode: 'test',
    mrrCents: 14800,
    subscribers: 2,
    totalWorkspaces: 5,
    free: 3,
    courtesy: 0,
    byTier: {
        STARTER: { count: 1, priceCents: 4900, mrrCents: 4900 },
        PRO: { count: 1, priceCents: 9900, mrrCents: 9900 },
        AGENCY: { count: 0, priceCents: 24900, mrrCents: 0 }
    },
    newSubscriptions: 1,
    newUsers: 4,
    newGoogleUsers: 2,
    cancellations: 0,
    canceledMrrCents: 0,
    pastDue: { count: 0, workspaces: [] },
    funnel: { created: 4, firstProposal: 2, opened: 1, accepted: 1, paying: 1 },
    attention: { failedEmails: { count: 0, last: null }, pendingReceipts: { count: 0, oldestAt: null } },
    recentWorkspaces: []
}

function renderApp() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <SessionProvider>
                    <App />
                </SessionProvider>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

afterEach(() => vi.unstubAllGlobals())

describe('login do Ops', () => {
    it('sem sessão mostra o login; senha errada mostra o erro da API; certa abre a visão geral', async () => {
        let loggedIn = false
        const fetchMock = mockApi((url, init) => {
            if (url.endsWith('/ops-auth/me')) return loggedIn ? { status: 200, body: { admin: { email: 'ops@lumen.dev' } } } : { status: 401, body: { message: 'Sem sessão' } }
            if (url.endsWith('/ops-auth/login')) {
                const body = JSON.parse(String(init?.body))
                if (body.password !== 'certa') return { status: 401, body: { message: 'Credenciais inválidas' } }
                loggedIn = true
                return { status: 200, body: { admin: { email: body.email } } }
            }
            if (url.includes('/internal/ops/overview')) return { status: 200, body: overview }
            return { status: 404, body: { message: 'não mockado' } }
        })
        const user = userEvent.setup()
        renderApp()

        expect(await screen.findByRole('heading', { name: 'Painel de operação' })).toBeInTheDocument()
        await user.type(screen.getByLabelText('E-mail'), 'ops@lumen.dev')
        await user.type(screen.getByLabelText('Senha'), 'errada')
        await user.click(screen.getByRole('button', { name: 'Entrar' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')

        await user.clear(screen.getByLabelText('Senha'))
        await user.type(screen.getByLabelText('Senha'), 'certa')
        await user.click(screen.getByRole('button', { name: 'Entrar' }))

        expect(await screen.findByRole('heading', { name: 'Como o Lumen Deal está hoje' })).toBeInTheDocument()
        expect(await screen.findByText('RECEITA MENSAL')).toBeInTheDocument()
        expect(screen.getByText('ops@lumen.dev')).toBeInTheDocument()
        // A sessão é cookie: nenhuma chamada manda Authorization.
        for (const [, init] of fetchMock.mock.calls) {
            expect(JSON.stringify(init?.headers ?? {})).not.toContain('Authorization')
            expect(init?.credentials).toBe('include')
        }
    })

    it('sessão que expira no meio do uso volta para o login', async () => {
        mockApi((url) => {
            if (url.endsWith('/ops-auth/me')) return { status: 200, body: { admin: { email: 'ops@lumen.dev' } } }
            return { status: 401, body: { message: 'Invalid ops token' } }
        })
        renderApp()
        expect(await screen.findByRole('heading', { name: 'Painel de operação' })).toBeInTheDocument()
    })
})
