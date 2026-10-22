import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Gift, RefreshCw, X } from 'lucide-react'
import { errorMessage } from '../api/client'
import { opsApi, type LicenseChange, type WorkspaceDetail } from '../api/ops'
import { BillingLabel, ErrorState, LoadingState, Notice } from './ui'
import { ROLE_LABEL, SEGMENT_LABEL, TIER_LABEL, date, eventText, limitText, money, shortDate } from '../lib/format'

/** Ficha da empresa (lado direito da lista; embaixo no celular). */
export function CompanyPanel({ id, onClose }: { id: string; onClose: () => void }) {
    const queryClient = useQueryClient()
    const query = useQuery({ queryKey: ['workspace', id], queryFn: () => opsApi.workspace(id) })
    const [notice, setNotice] = useState<{ tone: 'ok' | 'erro'; text: string } | null>(null)

    const refreshLists = (detail: WorkspaceDetail) => {
        queryClient.setQueryData(['workspace', id], detail)
        void queryClient.invalidateQueries({ queryKey: ['workspaces'] })
        void queryClient.invalidateQueries({ queryKey: ['overview'] })
        void queryClient.invalidateQueries({ queryKey: ['people'] })
    }

    const sync = useMutation({
        mutationFn: () => opsApi.syncWorkspace(id),
        onSuccess: (result) => {
            refreshLists(result.detail)
            setNotice({ tone: 'ok', text: result.changed ? 'Atualizado com o que está no Stripe.' : 'Já estava igual ao Stripe.' })
        },
        onError: (error) => setNotice({ tone: 'erro', text: errorMessage(error) })
    })

    const license = useMutation({
        mutationFn: (change: LicenseChange) => opsApi.setLicense(id, change),
        onSuccess: (detail, change) => {
            refreshLists(detail)
            setNotice({ tone: 'ok', text: change.licensePolicy === 'COURTESY' ? 'Cortesia concedida.' : 'Cortesia retirada.' })
        },
        onError: (error) => setNotice({ tone: 'erro', text: errorMessage(error) })
    })

    return (
        <aside aria-label="Ficha da empresa" className="card card--quente flex min-w-0 flex-[2_1_340px] flex-col gap-5 p-6">
            {query.isPending ? (
                <LoadingState label="Abrindo a ficha…" />
            ) : query.isError ? (
                <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
            ) : (
                <Detail
                    ws={query.data}
                    onClose={onClose}
                    notice={notice}
                    clearNotice={() => setNotice(null)}
                    syncing={sync.isPending}
                    onSync={() => sync.mutate()}
                    licenseBusy={license.isPending}
                    onLicense={(change) => license.mutate(change)}
                />
            )}
        </aside>
    )
}

function Detail({
    ws,
    onClose,
    notice,
    clearNotice,
    syncing,
    onSync,
    licenseBusy,
    onLicense
}: {
    ws: WorkspaceDetail
    onClose: () => void
    notice: { tone: 'ok' | 'erro'; text: string } | null
    clearNotice: () => void
    syncing: boolean
    onSync: () => void
    licenseBusy: boolean
    onLicense: (change: LicenseChange) => void
}) {
    const [granting, setGranting] = useState(false)
    const owner = ws.members.find((m) => m.role === 'OWNER')
    const courtesy = ws.licensePolicy === 'COURTESY'
    const paid = !courtesy && ws.planTier !== 'FREE' && (ws.billingStatus === 'ACTIVE' || ws.billingStatus === 'PAST_DUE')
    const pastDue = !courtesy && ws.billingStatus === 'PAST_DUE'

    return (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="rotulo">Ficha da empresa</span>
                    <h2 className="m-0 font-display text-2xl font-semibold text-cream">{ws.name}</h2>
                    <span className="text-[13px] text-muted">
                        {SEGMENT_LABEL[ws.segment] ?? ws.segment}
                        {owner ? ` · dono: ${owner.user.name}` : ''} · desde {date(ws.createdAt)}
                    </span>
                </div>
                <button type="button" aria-label="Fechar ficha" className="btn btn-sm !p-2" onClick={onClose}>
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            {notice && (
                <Notice tone={notice.tone} onClose={clearNotice}>
                    {notice.text}
                </Notice>
            )}

            <div className={`flex flex-col gap-3 rounded-2xl border bg-ink-950/55 p-4 ${pastDue ? 'border-coral/25' : 'border-line/15'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-[13px] text-muted">{courtesy ? 'Cortesia' : 'Assinatura'}</span>
                        <span className="font-display text-xl font-semibold text-cream">
                            {courtesy
                                ? `${TIER_LABEL[ws.entitlements.effectiveTier]} grátis`
                                : paid
                                    ? `${TIER_LABEL[ws.planTier]} · ${money(ws.priceCents)}/mês`
                                    : 'Plano Grátis'}
                        </span>
                    </div>
                    <BillingLabel status={ws.billingStatus} cancelAt={ws.subscriptionCancelAt} courtesy={courtesy} />
                </div>
                {pastDue && <span className="text-[12.5px] text-muted">A última cobrança foi recusada. O Stripe tenta de novo e o plano segue ativo enquanto isso.</span>}
                {courtesy && ws.licensePolicyNote && <span className="text-[12.5px] text-muted">{ws.licensePolicyNote}</span>}
                {courtesy && ws.stripe.subscriptionId && (
                    <span className="text-[12.5px] text-amber-200">Atenção: esta empresa também tem assinatura no Stripe. Cancele lá para não cobrar.</span>
                )}
                <div className="flex flex-wrap gap-2">
                    {ws.stripe.dashboardUrl && (
                        <a className="btn btn-sm" href={ws.stripe.dashboardUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} aria-hidden="true" />
                            Abrir no Stripe
                        </a>
                    )}
                    {ws.stripe.customerId && !courtesy && (
                        <button type="button" className="btn btn-sm" onClick={onSync} disabled={syncing}>
                            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} aria-hidden="true" />
                            {syncing ? 'Conferindo…' : 'Conferir no Stripe'}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
                <Stat value={limitText(ws.usage.proposalsThisMonth, ws.entitlements.proposalsPerMonth)} label="propostas no mês" />
                <Stat value={ws.usage.accepted} label={`aceitas de ${ws.usage.proposalsTotal}`} />
                <Stat value={ws.usage.opens} label="aberturas pelo cliente" />
            </div>

            <div className="flex flex-col gap-2.5">
                <span className="rotulo">
                    Pessoas · {limitText(ws.usage.members, ws.entitlements.members)}
                    {ws.usage.pendingInvites ? ` · ${ws.usage.pendingInvites} convite(s)` : ''}
                </span>
                {ws.members.map((m) => (
                    <div key={m.user.id} className="flex justify-between gap-3 text-[13.5px]">
                        <span className="min-w-0 truncate text-cream" title={m.user.email}>
                            {m.user.name}
                        </span>
                        <span className="flex-none text-muted">
                            {ROLE_LABEL[m.role]} · {m.user.loginMethods.map((l) => (l === 'GOOGLE' ? 'Google' : 'senha')).join(' + ')}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-2.5">
                <span className="rotulo">Histórico</span>
                {ws.events.length === 0 ? (
                    <span className="text-[13px] text-subtle">Nenhum registro ainda.</span>
                ) : (
                    <ol className="m-0 flex list-none flex-col gap-2.5 p-0 text-[13px]">
                        {ws.events.map((event) => (
                            <li key={event.id} className="flex gap-2.5">
                                <span className="w-[52px] flex-none text-subtle">{shortDate(event.createdAt)}</span>
                                <span className="text-text">{eventText(event)}</span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>

            <div className="flex flex-col gap-3 border-t border-line/12 pt-4">
                {courtesy ? (
                    <button
                        type="button"
                        className="btn self-start"
                        disabled={licenseBusy}
                        onClick={() => {
                            if (window.confirm(`Retirar a cortesia de ${ws.name}? A empresa volta ao Grátis (ou ao plano que paga no Stripe).`)) {
                                onLicense({ licensePolicy: 'STANDARD' })
                            }
                        }}
                    >
                        {licenseBusy ? 'Salvando…' : 'Retirar cortesia'}
                    </button>
                ) : granting ? (
                    <CourtesyForm
                        busy={licenseBusy}
                        warnPaid={paid}
                        onCancel={() => setGranting(false)}
                        onSubmit={(change) => {
                            onLicense(change)
                            setGranting(false)
                        }}
                    />
                ) : (
                    <button type="button" className="btn-solid self-start" onClick={() => setGranting(true)}>
                        <Gift size={16} aria-hidden="true" />
                        Conceder cortesia
                    </button>
                )}
            </div>
        </>
    )
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
    return (
        <div className="flex flex-col gap-1 rounded-[14px] bg-white/[0.03] p-3">
            <span className="font-display text-xl font-semibold text-cream">{value}</span>
            <span className="text-[11.5px] text-muted">{label}</span>
        </div>
    )
}

function CourtesyForm({
    busy,
    warnPaid,
    onCancel,
    onSubmit
}: {
    busy: boolean
    warnPaid: boolean
    onCancel: () => void
    onSubmit: (change: LicenseChange) => void
}) {
    const [planTier, setPlanTier] = useState<'PRO' | 'AGENCY'>('PRO')
    const [note, setNote] = useState('')

    function submit(event: FormEvent) {
        event.preventDefault()
        onSubmit({ licensePolicy: 'COURTESY', planTier, note: note.trim() || undefined })
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0">
                <legend className="mb-2 text-[13px] font-medium text-muted">Plano liberado</legend>
                {(['PRO', 'AGENCY'] as const).map((tier) => (
                    <label key={tier} className={`tag cursor-pointer ${planTier === tier ? '' : 'tag--fantasma'}`}>
                        <input type="radio" name="courtesy-tier" value={tier} checked={planTier === tier} onChange={() => setPlanTier(tier)} className="sr-only" />
                        {planTier === tier && <span className="ponto" />}
                        {TIER_LABEL[tier]}
                    </label>
                ))}
            </fieldset>
            <label className="flex flex-col gap-2 text-[13px] font-medium text-muted">
                Motivo (aparece no histórico)
                <input className="campo" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: parceiro de lançamento" />
            </label>
            {warnPaid && <span className="text-[12.5px] text-amber-200">Esta empresa paga pelo Stripe. A cortesia não cancela a cobrança: cancele no Stripe se for o caso.</span>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-solid" disabled={busy}>
                    {busy ? 'Salvando…' : 'Confirmar cortesia'}
                </button>
                <button type="button" className="btn" onClick={onCancel}>
                    Cancelar
                </button>
            </div>
        </form>
    )
}
