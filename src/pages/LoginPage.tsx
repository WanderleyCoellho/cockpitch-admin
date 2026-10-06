import { useState, type FormEvent } from 'react'
import { ApiError, errorMessage } from '../api/client'
import { useSession } from '../auth/session'
import { Lockup, Notice } from '../components/ui'

export function LoginPage() {
    const { login } = useSession()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    async function submit(event: FormEvent) {
        event.preventDefault()
        if (!email.trim() || !password) {
            setError('Informe e-mail e senha.')
            return
        }
        setBusy(true)
        setError('')
        try {
            await login(email.trim(), password)
        } catch (err) {
            setError(err instanceof ApiError && err.status === 401 ? 'E-mail ou senha incorretos.' : errorMessage(err, 'Não foi possível entrar.'))
            setBusy(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
            <form onSubmit={submit} className="card card--quente flex w-full max-w-[400px] flex-col gap-5 p-8" noValidate>
                <Lockup size="lg" />
                <div className="flex flex-col gap-1.5">
                    <h1 className="m-0 font-display text-[26px] font-semibold text-cream">Painel de operação</h1>
                    <p className="m-0 text-sm text-muted">Acesso restrito à equipe da Lumen Dev Studios.</p>
                </div>
                {error && <Notice tone="erro">{error}</Notice>}
                <label className="flex flex-col gap-2 text-[13px] font-medium text-muted">
                    E-mail
                    <input className="campo" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="flex flex-col gap-2 text-[13px] font-medium text-muted">
                    Senha
                    <input className="campo" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                <button type="submit" className="btn-solid mt-1" disabled={busy}>
                    {busy ? 'Entrando…' : 'Entrar'}
                </button>
            </form>
        </div>
    )
}
