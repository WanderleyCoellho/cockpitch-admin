import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UNAUTHORIZED_EVENT } from '../api/client'
import { opsAuth } from '../api/ops'

type SessionState = { status: 'checking' } | { status: 'anonymous' } | { status: 'authenticated'; email: string }

type SessionValue = {
    state: SessionState
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

/** Sessão do Ops: cookie httpOnly no servidor; aqui só sabemos se está ativa e de quem é. */
export function SessionProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient()
    const [state, setState] = useState<SessionState>({ status: 'checking' })

    useEffect(() => {
        let active = true
        opsAuth
            .me()
            .then((me) => active && setState({ status: 'authenticated', email: me.admin.email }))
            .catch(() => active && setState({ status: 'anonymous' }))
        return () => {
            active = false
        }
    }, [])

    // Qualquer 401 da API encerra a sessão local e leva ao login.
    useEffect(() => {
        const onUnauthorized = () => {
            queryClient.clear()
            setState({ status: 'anonymous' })
        }
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    }, [queryClient])

    const login = useCallback(async (email: string, password: string) => {
        const result = await opsAuth.login(email, password)
        setState({ status: 'authenticated', email: result.admin.email })
    }, [])

    const logout = useCallback(async () => {
        await opsAuth.logout().catch(() => undefined)
        queryClient.clear()
        setState({ status: 'anonymous' })
    }, [queryClient])

    const value = useMemo(() => ({ state, login, logout }), [state, login, logout])
    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
    const value = useContext(SessionContext)
    if (!value) throw new Error('useSession fora do SessionProvider')
    return value
}
