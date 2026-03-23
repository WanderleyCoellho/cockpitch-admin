import { useEffect, useMemo, useState } from 'react'

type ReceiptStatus = 'SUBMITTED' | 'ANALYZED' | 'NEEDS_HUMAN_REVIEW' | 'APPROVED' | 'REJECTED'
type ReceiptRisk = 'LOW' | 'MEDIUM' | 'HIGH'
type PlanTier = 'FREE' | 'STARTER' | 'PRO' | 'AGENCY'
type BillingStatus = 'INACTIVE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'
type LicensePolicy = 'STANDARD' | 'COURTESY'

type ReceiptItem = {
    id: string
    fileUrl: string
    originalFilename: string
    mimeType: string
    status: ReceiptStatus
    riskLevel: ReceiptRisk
    analysisSummary: string | null
    detectedAmount: string | null
    detectedTransferDate: string | null
    payerName: string | null
    recipientName: string | null
    reviewerName: string | null
    reviewedAt: string | null
    createdAt: string
    updatedAt: string
    user: {
        id: string
        email: string
        name: string
        planTier: PlanTier
        billingStatus: BillingStatus
        licensePolicy: LicensePolicy
    }
}

type Summary = {
    totalUsers: number
    byPlan: Record<string, number>
    byBillingStatus: Record<string, number>
    byLicensePolicy: Record<string, number>
    generatedAt: string
}

type UserItem = {
    id: string
    email: string
    name: string
    planTier: PlanTier
    billingStatus: BillingStatus
    licensePolicy: LicensePolicy
    createdAt: string
    updatedAt: string
}

type OpsLoginResponse = {
    token?: string
    admin: {
        email: string
        role: 'OPS_ADMIN'
    }
}

const API_BASE = '/api'

function fmtDate(value?: string | null) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('pt-BR')
}

export function App() {
    const [opsEmail, setOpsEmail] = useState(localStorage.getItem('ops_admin_email') || '')
    const [opsPassword, setOpsPassword] = useState('')
    const [opsToken, setOpsToken] = useState('')
    const [opsAdminEmail, setOpsAdminEmail] = useState(localStorage.getItem('ops_admin_profile_email') || '')
    const [opsSessionActive, setOpsSessionActive] = useState(false)

    const [summary, setSummary] = useState<Summary | null>(null)
    const [users, setUsers] = useState<UserItem[]>([])
    const [receipts, setReceipts] = useState<ReceiptItem[]>([])
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const [analysisStatus, setAnalysisStatus] = useState<'ANALYZED' | 'NEEDS_HUMAN_REVIEW'>('NEEDS_HUMAN_REVIEW')
    const [analysisRisk, setAnalysisRisk] = useState<ReceiptRisk>('MEDIUM')
    const [analysisSummary, setAnalysisSummary] = useState('')
    const [analysisAmount, setAnalysisAmount] = useState('')
    const [analysisDate, setAnalysisDate] = useState('')
    const [analysisPayer, setAnalysisPayer] = useState('')
    const [analysisRecipient, setAnalysisRecipient] = useState('')

    const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
    const [reviewerName, setReviewerName] = useState(localStorage.getItem('ops_reviewer_name') || 'Operacao')
    const [reviewerNotes, setReviewerNotes] = useState('')

    const [licensePlanTier, setLicensePlanTier] = useState<PlanTier>('PRO')
    const [licenseBillingStatus, setLicenseBillingStatus] = useState<BillingStatus>('ACTIVE')
    const [licensePolicy, setLicensePolicy] = useState<LicensePolicy>('STANDARD')
    const [licensePolicyNote, setLicensePolicyNote] = useState('')

    const selectedReceipt = useMemo(
        () => receipts.find((item) => item.id === selectedReceiptId) || null,
        [receipts, selectedReceiptId]
    )

    const hasAuth = !!opsSessionActive || !!opsToken

    async function request<T>(path: string, init?: RequestInit, options?: { skipAuth?: boolean }): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...((init?.headers as Record<string, string> | undefined) || {})
        }

        if (!options?.skipAuth) {
            if (opsToken) {
                headers.Authorization = `Bearer ${opsToken}`
            } else if (!opsSessionActive) {
                throw new Error('Faca login admin para continuar')
            }
        }

        const response = await fetch(`${API_BASE}${path}`, {
            ...init,
            headers,
            credentials: 'include'
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(text || `Erro HTTP ${response.status}`)
        }

        return response.json() as Promise<T>
    }

    async function loginOpsAdmin() {
        if (!opsEmail.trim() || !opsPassword.trim()) {
            setError('Informe email e senha do admin operacional')
            return
        }

        setBusy(true)
        setError('')
        setMessage('')

        try {
            const result = await request<OpsLoginResponse>(
                '/ops-auth/login',
                {
                    method: 'POST',
                    body: JSON.stringify({ email: opsEmail.trim(), password: opsPassword })
                },
                { skipAuth: true }
            )

            setOpsToken(result.token || '')
            setOpsSessionActive(true)
            setOpsAdminEmail(result.admin.email)
            setOpsPassword('')

            localStorage.setItem('ops_admin_email', opsEmail.trim())
            localStorage.setItem('ops_admin_profile_email', result.admin.email)

            setMessage('Login operacional realizado com sucesso')
            await loadAll()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Falha no login operacional'
            setError(msg)
        } finally {
            setBusy(false)
        }
    }

    function logoutOpsAdmin() {
        request('/ops-auth/logout', { method: 'POST' }, { skipAuth: true }).catch(() => undefined)
        setOpsToken('')
        setOpsSessionActive(false)
        setOpsAdminEmail('')
        localStorage.removeItem('ops_admin_profile_email')
        setMessage('Sessao operacional encerrada')
        setError('')
    }

    async function checkOpsSession() {
        try {
            const me = await request<{ admin: { email: string } }>('/ops-auth/me', undefined, { skipAuth: true })
            if (me?.admin?.email) {
                setOpsSessionActive(true)
                setOpsAdminEmail(me.admin.email)
                localStorage.setItem('ops_admin_profile_email', me.admin.email)
            }
        } catch {
            setOpsSessionActive(false)
        }
    }

    async function loadAll() {
        setLoading(true)
        setError('')
        setMessage('')

        try {
            const [summaryResp, receiptsResp, usersResp] = await Promise.all([
                request<Summary>('/internal/licensing/summary'),
                request<{ receipts: ReceiptItem[] }>('/internal/licensing/receipts?limit=100'),
                request<{ users: UserItem[] }>('/internal/licensing/users?limit=100')
            ])

            setSummary(summaryResp)
            setReceipts(receiptsResp.receipts || [])
            setUsers(usersResp.users || [])

            if (!selectedReceiptId && receiptsResp.receipts.length > 0) {
                setSelectedReceiptId(receiptsResp.receipts[0].id)
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Falha ao carregar dados operacionais'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    async function runAnalysis() {
        if (!selectedReceipt) return
        if (analysisSummary.trim().length < 10) {
            setError('Resumo da analise deve ter ao menos 10 caracteres')
            return
        }

        setBusy(true)
        setError('')
        setMessage('')

        try {
            await request(`/internal/licensing/receipts/${selectedReceipt.id}/analyze`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status: analysisStatus,
                    riskLevel: analysisRisk,
                    analysisSummary,
                    detectedAmount: analysisAmount || undefined,
                    detectedTransferDate: analysisDate || undefined,
                    payerName: analysisPayer || undefined,
                    recipientName: analysisRecipient || undefined
                })
            })

            setMessage('Pre-analise registrada com sucesso')
            await loadAll()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Falha ao registrar pre-analise'
            setError(msg)
        } finally {
            setBusy(false)
        }
    }

    async function runReview() {
        if (!selectedReceipt) return
        if (!reviewerName.trim()) {
            setError('Informe o nome de quem revisou')
            return
        }

        setBusy(true)
        setError('')
        setMessage('')

        try {
            await request(`/internal/licensing/receipts/${selectedReceipt.id}/review`, {
                method: 'PATCH',
                body: JSON.stringify({
                    decision: reviewDecision,
                    reviewerName,
                    reviewerNotes: reviewerNotes || undefined
                })
            })

            localStorage.setItem('ops_reviewer_name', reviewerName)
            setMessage('Decisao humana registrada com sucesso')
            await loadAll()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Falha ao registrar revisao'
            setError(msg)
        } finally {
            setBusy(false)
        }
    }

    async function approveAndActivate() {
        if (!selectedReceipt) return
        if (!reviewerName.trim()) {
            setError('Informe o nome de quem revisou')
            return
        }

        setBusy(true)
        setError('')
        setMessage('')

        try {
            await request(`/internal/licensing/receipts/${selectedReceipt.id}/approve-and-activate`, {
                method: 'POST',
                body: JSON.stringify({
                    reviewerName,
                    reviewerNotes: reviewerNotes || undefined,
                    planTier: licensePlanTier,
                    billingStatus: licenseBillingStatus,
                    licensePolicy,
                    licensePolicyNote: licensePolicyNote || undefined,
                    notes: 'Aprovacao em um clique via Cockpitch Ops'
                })
            })

            localStorage.setItem('ops_reviewer_name', reviewerName)
            setReviewDecision('APPROVED')
            setMessage('Comprovante aprovado e licenca ativada em um clique')
            await loadAll()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Falha ao aprovar e ativar'
            setError(msg)
        } finally {
            setBusy(false)
        }
    }

    async function applyLicense() {
        if (!selectedReceipt) return

        setBusy(true)
        setError('')
        setMessage('')

        try {
            await request(`/internal/licensing/users/${selectedReceipt.user.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    planTier: licensePlanTier,
                    billingStatus: licenseBillingStatus,
                    licensePolicy,
                    licensePolicyNote: licensePolicyNote || undefined,
                    notes: 'Atualizacao via Cockpitch Ops'
                })
            })

            setMessage('Licenca atualizada com sucesso')
            await loadAll()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Falha ao atualizar licenca'
            setError(msg)
        } finally {
            setBusy(false)
        }
    }

    function saveSettings() {
        localStorage.setItem('ops_admin_email', opsEmail.trim())
        localStorage.removeItem('ops_internal_api_key')
        setMessage('Configuracoes salvas localmente')
        setError('')
    }

    useEffect(() => {
        checkOpsSession().catch(() => undefined)
        if (opsToken) {
            loadAll().catch(() => undefined)
        }
    }, [])

    useEffect(() => {
        if (opsSessionActive || opsToken) {
            loadAll().catch(() => undefined)
        }
    }, [opsSessionActive, opsToken])

    useEffect(() => {
        if (!selectedReceipt) return

        setAnalysisStatus(selectedReceipt.status === 'SUBMITTED' ? 'NEEDS_HUMAN_REVIEW' : 'ANALYZED')
        setAnalysisRisk(selectedReceipt.riskLevel)
        setAnalysisSummary(selectedReceipt.analysisSummary || '')
        setAnalysisAmount(selectedReceipt.detectedAmount || '')
        setAnalysisDate(selectedReceipt.detectedTransferDate || '')
        setAnalysisPayer(selectedReceipt.payerName || '')
        setAnalysisRecipient(selectedReceipt.recipientName || '')

        setLicensePlanTier(selectedReceipt.user.planTier)
        setLicenseBillingStatus(selectedReceipt.user.billingStatus)
        setLicensePolicy(selectedReceipt.user.licensePolicy)
    }, [selectedReceipt])

    return (
        <div className="app-shell">
            <header className="topbar">
                <h1>Cockpitch Ops</h1>
                <p>Painel operacional de licencas e comprovantes</p>
            </header>

            <section className="card settings">
                <h2>Conexao</h2>
                <div className="grid2">
                    <label>
                        Email admin ops
                        <input value={opsEmail} onChange={(e) => setOpsEmail(e.target.value)} />
                    </label>
                    <label>
                        Senha admin ops
                        <input value={opsPassword} onChange={(e) => setOpsPassword(e.target.value)} type="password" />
                    </label>
                </div>
                <div className="actions">
                    <button onClick={saveSettings}>Salvar configuracoes</button>
                    <button onClick={loginOpsAdmin} disabled={busy || !opsEmail || !opsPassword}>Entrar (ops)</button>
                    <button onClick={logoutOpsAdmin} disabled={!hasAuth}>Sair</button>
                    <button onClick={() => loadAll()} disabled={loading || !hasAuth}>Atualizar dados</button>
                </div>
                <p className="auth-status">
                    Modo atual: {opsSessionActive ? `sessao cookie (${opsAdminEmail || 'logado'})` : opsToken ? `token admin (${opsAdminEmail || 'logado'})` : 'sem autenticacao'}
                </p>
            </section>

            {error ? <div className="banner error">{error}</div> : null}
            {message ? <div className="banner ok">{message}</div> : null}

            <section className="card summary">
                <h2>Resumo operacional</h2>
                {!summary ? (
                    <p>{loading ? 'Carregando...' : 'Sem dados carregados'}</p>
                ) : (
                    <div className="summary-grid">
                        <div>
                            <strong>Total de usuarios</strong>
                            <span>{summary.totalUsers}</span>
                        </div>
                        <div>
                            <strong>Por plano</strong>
                            <pre>{JSON.stringify(summary.byPlan, null, 2)}</pre>
                        </div>
                        <div>
                            <strong>Por cobranca</strong>
                            <pre>{JSON.stringify(summary.byBillingStatus, null, 2)}</pre>
                        </div>
                        <div>
                            <strong>Por politica</strong>
                            <pre>{JSON.stringify(summary.byLicensePolicy, null, 2)}</pre>
                        </div>
                    </div>
                )}
            </section>

            <section className="card users">
                <h2>Usuarios cadastrados</h2>
                {users.length === 0 ? (
                    <p>{loading ? 'Carregando...' : 'Nenhum usuario encontrado'}</p>
                ) : (
                    <div className="table-wrap">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Plano</th>
                                    <th>Cobranca</th>
                                    <th>Politica</th>
                                    <th>Criado em</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>{user.planTier}</td>
                                        <td>{user.billingStatus}</td>
                                        <td>{user.licensePolicy}</td>
                                        <td>{fmtDate(user.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="workspace">
                <aside className="card list">
                    <h2>Fila de comprovantes</h2>
                    <div className="list-scroll">
                        {receipts.length === 0 ? <p>Nenhum comprovante encontrado</p> : null}
                        {receipts.map((item) => (
                            <button
                                key={item.id}
                                className={`list-item ${item.id === selectedReceiptId ? 'active' : ''}`}
                                onClick={() => setSelectedReceiptId(item.id)}
                            >
                                <div>
                                    <strong>{item.user.name}</strong>
                                    <span>{item.user.email}</span>
                                </div>
                                <div>
                                    <small>{item.status}</small>
                                    <small>Risco: {item.riskLevel}</small>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="card detail">
                    <h2>Analise e decisao</h2>
                    {!selectedReceipt ? (
                        <p>Selecione um comprovante na lista.</p>
                    ) : (
                        <div className="detail-grid">
                            <section className="panel">
                                <h3>Comprovante</h3>
                                <p><strong>Arquivo:</strong> {selectedReceipt.originalFilename}</p>
                                <p><strong>Status:</strong> {selectedReceipt.status}</p>
                                <p><strong>Criado em:</strong> {fmtDate(selectedReceipt.createdAt)}</p>
                                <p><strong>Revisado em:</strong> {fmtDate(selectedReceipt.reviewedAt)}</p>
                                <div className="preview-box">
                                    {selectedReceipt.mimeType === 'application/pdf' ? (
                                        <iframe title="Preview PDF" src={selectedReceipt.fileUrl} />
                                    ) : (
                                        <img src={selectedReceipt.fileUrl} alt="Comprovante" />
                                    )}
                                </div>
                            </section>

                            <section className="panel">
                                <h3>Pre-analise do agente</h3>
                                <label>
                                    Status
                                    <select value={analysisStatus} onChange={(e) => setAnalysisStatus(e.target.value as 'ANALYZED' | 'NEEDS_HUMAN_REVIEW')}>
                                        <option value="ANALYZED">ANALYZED</option>
                                        <option value="NEEDS_HUMAN_REVIEW">NEEDS_HUMAN_REVIEW</option>
                                    </select>
                                </label>
                                <label>
                                    Risco
                                    <select value={analysisRisk} onChange={(e) => setAnalysisRisk(e.target.value as ReceiptRisk)}>
                                        <option value="LOW">LOW</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HIGH">HIGH</option>
                                    </select>
                                </label>
                                <label>
                                    Resumo
                                    <textarea value={analysisSummary} onChange={(e) => setAnalysisSummary(e.target.value)} rows={4} />
                                </label>
                                <div className="grid2">
                                    <label>
                                        Valor detectado
                                        <input value={analysisAmount} onChange={(e) => setAnalysisAmount(e.target.value)} />
                                    </label>
                                    <label>
                                        Data detectada
                                        <input value={analysisDate} onChange={(e) => setAnalysisDate(e.target.value)} />
                                    </label>
                                    <label>
                                        Pagador
                                        <input value={analysisPayer} onChange={(e) => setAnalysisPayer(e.target.value)} />
                                    </label>
                                    <label>
                                        Favorecido
                                        <input value={analysisRecipient} onChange={(e) => setAnalysisRecipient(e.target.value)} />
                                    </label>
                                </div>
                                <button onClick={runAnalysis} disabled={busy}>Salvar pre-analise</button>
                            </section>

                            <section className="panel">
                                <h3>Decisao humana</h3>
                                <label>
                                    Decisao
                                    <select value={reviewDecision} onChange={(e) => setReviewDecision(e.target.value as 'APPROVED' | 'REJECTED')}>
                                        <option value="APPROVED">APPROVED</option>
                                        <option value="REJECTED">REJECTED</option>
                                    </select>
                                </label>
                                <label>
                                    Responsavel
                                    <input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} />
                                </label>
                                <label>
                                    Observacoes
                                    <textarea value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)} rows={3} />
                                </label>
                                <div className="actions">
                                    <button onClick={runReview} disabled={busy}>Registrar decisao</button>
                                    <button onClick={approveAndActivate} disabled={busy} className="button-success">
                                        Aprovar e ativar
                                    </button>
                                </div>
                            </section>

                            <section className="panel">
                                <h3>Licenca do cliente</h3>
                                <p><strong>Usuario:</strong> {selectedReceipt.user.name} ({selectedReceipt.user.email})</p>
                                <div className="grid2">
                                    <label>
                                        Plano
                                        <select value={licensePlanTier} onChange={(e) => setLicensePlanTier(e.target.value as PlanTier)}>
                                            <option value="FREE">FREE</option>
                                            <option value="STARTER">STARTER</option>
                                            <option value="PRO">PRO</option>
                                            <option value="AGENCY">AGENCY</option>
                                        </select>
                                    </label>
                                    <label>
                                        Cobranca
                                        <select value={licenseBillingStatus} onChange={(e) => setLicenseBillingStatus(e.target.value as BillingStatus)}>
                                            <option value="INACTIVE">INACTIVE</option>
                                            <option value="ACTIVE">ACTIVE</option>
                                            <option value="PAST_DUE">PAST_DUE</option>
                                            <option value="CANCELED">CANCELED</option>
                                        </select>
                                    </label>
                                    <label>
                                        Politica
                                        <select value={licensePolicy} onChange={(e) => setLicensePolicy(e.target.value as LicensePolicy)}>
                                            <option value="STANDARD">STANDARD</option>
                                            <option value="COURTESY">COURTESY</option>
                                        </select>
                                    </label>
                                    <label>
                                        Nota da politica
                                        <input value={licensePolicyNote} onChange={(e) => setLicensePolicyNote(e.target.value)} />
                                    </label>
                                </div>
                                <button onClick={applyLicense} disabled={busy}>Aplicar licenca</button>
                            </section>
                        </div>
                    )}
                </main>
            </section>
        </div>
    )
}
