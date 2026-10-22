import type { BillingStatus, PlanTier, Role, WorkspaceEvent } from '../api/ops'

export const TIER_LABEL: Record<PlanTier, string> = { FREE: 'Grátis', STARTER: 'Essencial', PRO: 'Profissional', AGENCY: 'Equipe' }
export const ROLE_LABEL: Record<Role, string> = { OWNER: 'dono', ADMIN: 'admin', MEMBER: 'membro' }
export const BILLING_LABEL: Record<BillingStatus, string> = { INACTIVE: 'Sem assinatura', ACTIVE: 'Ativa', PAST_DUE: 'Atrasado', CANCELED: 'Cancelada' }

export const SEGMENT_LABEL: Record<string, string> = {
    PHOTO_VIDEO: 'Foto e vídeo',
    EVENTS: 'Eventos',
    AGENCY: 'Agência',
    CONSULTING: 'Consultoria',
    HEALTH_BEAUTY: 'Saúde e beleza',
    CONSTRUCTION: 'Obras e reformas',
    EDUCATION: 'Educação',
    TECH: 'Tecnologia',
    GENERAL: 'Outros'
}

export const EMAIL_TEMPLATE_LABEL: Record<string, string> = {
    proposal_opened: 'Proposta aberta',
    proposal_response: 'Resposta do cliente',
    acceptance_confirmation: 'Confirmação de aceite',
    team_invite: 'Convite para equipe'
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brlCents = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Valor em centavos → "R$ 1.843" (sem centavos quando inteiro). */
export function money(cents: number) {
    return cents % 100 === 0 ? brl.format(cents / 100) : brlCents.format(cents / 100)
}

export function percent(part: number, total: number) {
    if (!total) return '0%'
    return `${Math.round((part / total) * 100)}%`
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' })

export const date = (value: string | Date) => dateFmt.format(new Date(value))
export const shortDate = (value: string | Date) => shortFmt.format(new Date(value))
export const monthYear = (value: string | Date) => monthFmt.format(new Date(value)).replace('.', '')

/** "hoje, 10:42", "ontem", "há 3 dias", depois a data. */
export function relative(value: string | Date, now = new Date()) {
    const at = new Date(value)
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000)
    if (days <= 0) {
        const minutes = Math.round((now.getTime() - at.getTime()) / 60_000)
        if (minutes < 1) return 'agora'
        if (minutes < 60) return `há ${minutes} min`
        return `hoje, ${timeFmt.format(at)}`
    }
    if (days === 1) return 'ontem'
    if (days < 7) return `há ${days} dias`
    return date(at)
}

export function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

export function limitText(used: number, limit: number) {
    return limit < 0 ? `${used}` : `${used} / ${limit}`
}

/** Frase do histórico da empresa. */
export function eventText(event: WorkspaceEvent) {
    const d = (event.detail ?? {}) as Record<string, string | number | undefined>
    const tier = (key: string) => TIER_LABEL[d[key] as PlanTier] ?? String(d[key] ?? '')
    const note = d.note ? ` — ${d.note}` : ''
    switch (event.type) {
        case 'SUBSCRIBED':
            return `Assinou o ${tier('planTier')}`
        case 'PLAN_CHANGED':
            return `Mudou de ${tier('from')} para ${tier('to')}`
        case 'PAYMENT_FAILED':
            return 'Cobrança recusada'
        case 'PAYMENT_RECOVERED':
            return 'Pagamento regularizado'
        case 'CANCEL_SCHEDULED':
            return `Pediu cancelamento (vale até ${d.at ? date(String(d.at)) : 'o fim do período'})`
        case 'CANCEL_REVERTED':
            return 'Desistiu do cancelamento'
        case 'CANCELED':
            return `Assinatura do ${tier('planTier')} encerrada`
        case 'COURTESY_GRANTED':
            return `Cortesia concedida (${tier('planTier')})${note}`
        case 'COURTESY_REVOKED':
            return `Cortesia retirada${note}`
        case 'LICENSE_CHANGED':
            return `Licença ajustada: ${tier('from')} → ${tier('to')}${note}`
    }
}
