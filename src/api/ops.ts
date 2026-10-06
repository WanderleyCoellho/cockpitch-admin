import { api } from './client'

export type PlanTier = 'FREE' | 'STARTER' | 'PRO' | 'AGENCY'
export type BillingStatus = 'INACTIVE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'
export type LicensePolicy = 'STANDARD' | 'COURTESY'
export type Role = 'OWNER' | 'ADMIN' | 'MEMBER'
export type LoginMethod = 'PASSWORD' | 'GOOGLE'
export type StripeMode = 'live' | 'test' | 'unconfigured'

// ---------- Sessão ----------

export const opsAuth = {
    me: () => api<{ admin: { email: string } }>('/ops-auth/me', { silent401: true }),
    login: (email: string, password: string) =>
        api<{ admin: { email: string } }>('/ops-auth/login', { method: 'POST', body: { email, password }, silent401: true }),
    logout: () => api<unknown>('/ops-auth/logout', { method: 'POST', silent401: true })
}

// ---------- Visão geral ----------

export type Overview = {
    days: number
    generatedAt: string
    stripeMode: StripeMode
    mrrCents: number
    subscribers: number
    totalWorkspaces: number
    free: number
    courtesy: number
    byTier: Record<Exclude<PlanTier, 'FREE'>, { count: number; priceCents: number; mrrCents: number }>
    newSubscriptions: number
    newUsers: number
    newGoogleUsers: number
    cancellations: number
    canceledMrrCents: number
    pastDue: { count: number; workspaces: Array<{ id: string; name: string }> }
    funnel: { created: number; firstProposal: number; opened: number; accepted: number; paying: number }
    attention: {
        failedEmails: { count: number; last: { template: string; attempts: number; createdAt: string } | null }
        pendingReceipts: { count: number; oldestAt: string | null }
    }
    recentWorkspaces: Array<{ id: string; name: string; segment: string; createdAt: string; effectiveTier: PlanTier; isCourtesy: boolean }>
}

// ---------- Empresas ----------

export type WorkspaceFilter = 'all' | 'paying' | 'free' | 'courtesy' | 'past_due'

export type WorkspaceRow = {
    id: string
    name: string
    segment: string
    planTier: PlanTier
    billingStatus: BillingStatus
    licensePolicy: LicensePolicy
    subscriptionCancelAt: string | null
    createdAt: string
    effectiveTier: PlanTier
    isCourtesy: boolean
    owner: { name: string; email: string } | null
    members: number
    memberLimit: number
    proposalsThisMonth: number
    proposalLimit: number
}

export type Paged<T, F extends string> = { total: number; page: number; pageSize: number; counts: Record<F, number>; items: T[] }

export type WorkspaceEventType =
    | 'SUBSCRIBED'
    | 'PLAN_CHANGED'
    | 'PAYMENT_FAILED'
    | 'PAYMENT_RECOVERED'
    | 'CANCEL_SCHEDULED'
    | 'CANCEL_REVERTED'
    | 'CANCELED'
    | 'COURTESY_GRANTED'
    | 'COURTESY_REVOKED'
    | 'LICENSE_CHANGED'

export type WorkspaceEvent = { id: string; type: WorkspaceEventType; detail: Record<string, unknown> | null; createdAt: string }

export type WorkspaceDetail = {
    id: string
    name: string
    slug: string
    segment: string
    planTier: PlanTier
    billingStatus: BillingStatus
    licensePolicy: LicensePolicy
    licensePolicyNote: string | null
    subscriptionCancelAt: string | null
    createdAt: string
    priceCents: number
    entitlements: { effectiveTier: PlanTier; isCourtesy: boolean; members: number; proposalsPerMonth: number; storageGb: number }
    members: Array<{ role: Role; createdAt: string; user: { id: string; name: string; email: string; loginMethods: LoginMethod[] } }>
    usage: { proposalsThisMonth: number; members: number; pendingInvites: number; proposalsTotal: number; accepted: number; opens: number }
    events: WorkspaceEvent[]
    stripe: { mode: StripeMode; customerId: string | null; subscriptionId: string | null; dashboardUrl: string | null }
}

export type LicenseChange = { licensePolicy: 'COURTESY'; planTier: 'PRO' | 'AGENCY'; note?: string } | { licensePolicy: 'STANDARD'; note?: string }

// ---------- Pessoas ----------

export type PeopleFilter = 'all' | 'owners' | 'members' | 'google' | 'password'

export type PersonRow = {
    id: string
    name: string
    email: string
    createdAt: string
    loginMethods: LoginMethod[]
    memberships: Array<{ role: Role; workspaceId: string; workspaceName: string; effectiveTier: PlanTier; isCourtesy: boolean }>
}

// ---------- Sistema ----------

export type EmailRow = {
    id: string
    to: string
    template: string
    status: 'PENDING' | 'SENT' | 'FAILED'
    attempts: number
    lastError: string | null
    createdAt: string
    sentAt: string | null
}

export type SystemStatus = {
    generatedAt: string
    api: { ok: boolean; commit: string | null; startedAt: string; node: string; environment: string }
    database: { ok: boolean; migrations: number; lastMigration: string | null; error?: string }
    email: { provider: 'resend' | 'console'; jobEnabled: boolean; sent24h: number; pending: number; failed: number; lastSentAt: string | null; recent: EmailRow[] }
    stripe: {
        mode: StripeMode
        dashboardUrl: string
        catalog: { ok: boolean; error?: string; items: Array<{ tier: PlanTier; name: string; priceId: string; amountCents: number }> }
        webhook: {
            lastReceivedAt: string | null
            recent: Array<{ id: string; type: string; customerId: string | null; outcome: string; error: string | null; receivedAt: string }>
        }
        reconciliation: {
            enabled: boolean
            cron: string
            payingWorkspaces: number
            lastRun: { at: string; result: { total: number; updated: number; unchanged: number; failed: number; skippedCourtesy: number } } | null
        }
    }
    receipts: { pending: number }
}

// ---------- Comprovantes PIX (fluxo antigo) ----------

export type ReceiptStatus = 'SUBMITTED' | 'ANALYZED' | 'NEEDS_HUMAN_REVIEW' | 'APPROVED' | 'REJECTED'
export type ReceiptRisk = 'LOW' | 'MEDIUM' | 'HIGH'

export type Receipt = {
    id: string
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
    user: { id: string; email: string; name: string; planTier: PlanTier; billingStatus: BillingStatus; licensePolicy: LicensePolicy }
}

const qs = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') search.set(key, String(value))
    const text = search.toString()
    return text ? `?${text}` : ''
}

export const opsApi = {
    overview: (days: number) => api<Overview>(`/internal/ops/overview${qs({ days })}`),
    workspaces: (params: { filter: WorkspaceFilter; q: string; page: number }) =>
        api<Paged<WorkspaceRow, WorkspaceFilter>>(`/internal/ops/workspaces${qs(params)}`),
    workspace: (id: string) => api<WorkspaceDetail>(`/internal/ops/workspaces/${encodeURIComponent(id)}`),
    syncWorkspace: (id: string) =>
        api<{ changed: boolean; detail: WorkspaceDetail }>(`/internal/ops/workspaces/${encodeURIComponent(id)}/sync`, { method: 'POST' }),
    setLicense: (id: string, change: LicenseChange) =>
        api<WorkspaceDetail>(`/internal/ops/workspaces/${encodeURIComponent(id)}/license`, { method: 'PATCH', body: change }),
    people: (params: { filter: PeopleFilter; q: string; page: number }) =>
        api<Paged<PersonRow, PeopleFilter>>(`/internal/ops/people${qs(params)}`),
    system: () => api<SystemStatus>('/internal/ops/system'),
    retryEmail: (id: string) => api<{ queued: boolean }>(`/internal/ops/emails/${encodeURIComponent(id)}/retry`, { method: 'POST' }),
    reconcile: () => api<{ durationMs: number; result: { total: number; updated: number; failed: number } }>('/internal/billing/reconcile', { method: 'POST' }),

    receipts: () => api<{ receipts: Receipt[] }>('/internal/licensing/receipts?limit=100'),
    receiptFileUrl: (id: string) => `/api/internal/licensing/receipts/${encodeURIComponent(id)}/file`,
    analyzeReceipt: (id: string, body: {
        status: 'ANALYZED' | 'NEEDS_HUMAN_REVIEW'
        riskLevel: ReceiptRisk
        analysisSummary: string
        detectedAmount?: string
        detectedTransferDate?: string
        payerName?: string
        recipientName?: string
    }) => api(`/internal/licensing/receipts/${encodeURIComponent(id)}/analyze`, { method: 'PATCH', body }),
    reviewReceipt: (id: string, body: { decision: 'APPROVED' | 'REJECTED'; reviewerName: string; reviewerNotes?: string }) =>
        api(`/internal/licensing/receipts/${encodeURIComponent(id)}/review`, { method: 'PATCH', body }),
    approveReceipt: (id: string, body: { reviewerName: string; reviewerNotes?: string; planTier: PlanTier; notes?: string }) =>
        api(`/internal/licensing/receipts/${encodeURIComponent(id)}/approve-and-activate`, {
            method: 'POST',
            body: { ...body, billingStatus: 'ACTIVE', licensePolicy: 'STANDARD' }
        })
}
