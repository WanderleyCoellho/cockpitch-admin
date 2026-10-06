import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Mail, Receipt } from 'lucide-react'
import { errorMessage } from '../api/client'
import { opsApi, type Overview } from '../api/ops'
import { ErrorState, Kpi, LoadingState, PageHeader, SectionTitle, TierName } from '../components/ui'
import { EMAIL_TEMPLATE_LABEL, SEGMENT_LABEL, TIER_LABEL, money, percent, relative } from '../lib/format'

const PERIODS = [
    { days: 7, label: '7 dias' },
    { days: 30, label: '30 dias' },
    { days: 365, label: '12 meses' }
] as const

export function OverviewPage() {
    const [days, setDays] = useState<number>(30)
    const query = useQuery({ queryKey: ['overview', days], queryFn: () => opsApi.overview(days) })

    return (
        <>
            <PageHeader number="01" label="VISÃO GERAL" title="Como o Lumen Deal está hoje">
                <div role="group" aria-label="Período" className="flex gap-1.5 rounded-full border border-line/12 bg-white/[0.03] p-1">
                    {PERIODS.map((period) => (
                        <button
                            key={period.days}
                            type="button"
                            aria-pressed={days === period.days}
                            onClick={() => setDays(period.days)}
                            className={`tag ${days === period.days ? '' : 'tag--fantasma'}`}
                        >
                            {days === period.days && <span className="ponto" />}
                            {period.label}
                        </button>
                    ))}
                </div>
            </PageHeader>

            {query.isPending ? (
                <LoadingState />
            ) : query.isError ? (
                <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
            ) : (
                <OverviewContent data={query.data} />
            )}
        </>
    )
}

function OverviewContent({ data }: { data: Overview }) {
    const tiers = (['STARTER', 'PRO', 'AGENCY'] as const).map((tier) => ({ tier, ...data.byTier[tier] }))
    const maxMrr = Math.max(1, ...tiers.map((t) => t.mrrCents))
    const funnel = [
        { value: data.funnel.created, label: 'criaram conta' },
        { value: data.funnel.firstProposal, label: 'criaram a 1ª proposta' },
        { value: data.funnel.opened, label: 'tiveram proposta aberta pelo cliente' },
        { value: data.funnel.accepted, label: 'tiveram proposta aceita' },
        { value: data.funnel.paying, label: 'assinam um plano', highlight: true }
    ]
    const period = data.days === 365 ? '12 meses' : `${data.days} dias`
    const hasAttention = data.pastDue.count > 0 || data.attention.failedEmails.count > 0 || data.attention.pendingReceipts.count > 0

    return (
        <>
            <section aria-label="Indicadores" className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
                <Kpi
                    label="RECEITA MENSAL"
                    value={money(data.mrrCents)}
                    hint={<span className="text-amber-400">{data.newSubscriptions} assinatura(s) nova(s) em {period}</span>}
                />
                <Kpi label="ASSINANTES" value={data.subscribers} hint={`de ${data.totalWorkspaces} empresas`} />
                <Kpi label="NOVOS CADASTROS" value={data.newUsers} hint={`${data.newGoogleUsers} com Google · ${period}`} />
                <Kpi
                    label="CANCELAMENTOS"
                    value={data.cancellations}
                    hint={data.cancellations ? `${money(data.canceledMrrCents)} a menos por mês` : `nenhum em ${period}`}
                />
                <Kpi
                    label="PAGAMENTO ATRASADO"
                    value={data.pastDue.count}
                    hot={data.pastDue.count > 0}
                    hint={
                        data.pastDue.count > 0 ? (
                            <Link to="/empresas?filtro=past_due" className="font-semibold text-amber-200">
                                Ver empresas →
                            </Link>
                        ) : (
                            'tudo em dia'
                        )
                    }
                />
            </section>

            <section className="flex flex-wrap gap-4">
                <div className="card flex min-w-0 flex-[3_1_420px] flex-col gap-5 p-6">
                    <SectionTitle aside={<span className="text-[12.5px] text-subtle">assinaturas ativas e atrasadas</span>}>Receita por plano</SectionTitle>
                    <div className="flex flex-col gap-[18px]">
                        {tiers.map((t) => (
                            <div key={t.tier} className="flex flex-col gap-2">
                                <div className="flex flex-wrap justify-between gap-2 text-[13.5px]">
                                    <span className="font-medium text-cream">
                                        {TIER_LABEL[t.tier]} · {money(t.priceCents)}
                                    </span>
                                    <span className="text-muted">
                                        {t.count} {t.count === 1 ? 'empresa' : 'empresas'} · <strong className="text-cream">{money(t.mrrCents)}</strong>
                                    </span>
                                </div>
                                <div className="h-2.5 rounded-full bg-white/5" role="presentation">
                                    <div
                                        className="h-full rounded-full"
                                        style={{ width: `${Math.max(t.mrrCents ? 3 : 0, (t.mrrCents / maxMrr) * 100)}%`, background: 'linear-gradient(90deg,#E09A1F,#FFC85C)' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-line/10 pt-4">
                        <span className="tag">
                            <span className="ponto" />
                            {data.free} no Grátis
                        </span>
                        <span className="tag">
                            <span className="ponto ponto--claro" />
                            {data.courtesy} em cortesia
                        </span>
                        <span className="tag">
                            <span className={`ponto ${data.stripeMode === 'live' ? '' : 'ponto--apagado'}`} />
                            {data.stripeMode === 'live' ? 'Stripe em produção' : data.stripeMode === 'test' ? 'Stripe em modo teste' : 'Stripe sem chave'}
                        </span>
                    </div>
                </div>

                <div className="card flex min-w-0 flex-[2_1_320px] flex-col gap-[18px] p-6">
                    <SectionTitle aside={<span className="text-[12.5px] text-subtle">empresas criadas em {period}</span>}>Do cadastro à assinatura</SectionTitle>
                    <ol className="m-0 flex list-none flex-col gap-3 p-0">
                        {funnel.map((step) => (
                            <li key={step.label} className="flex items-center gap-3.5">
                                <span className={`w-11 font-display text-xl font-bold ${step.highlight ? 'text-amber-500' : 'text-cream'}`}>{step.value}</span>
                                <span className={`flex-1 text-[13.5px] ${step.highlight ? 'font-medium text-cream' : 'text-muted'}`}>{step.label}</span>
                                <span className={`text-[12.5px] ${step.highlight ? 'text-amber-400' : 'text-subtle'}`}>{percent(step.value, data.funnel.created)}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="flex flex-wrap gap-4">
                <div className="card flex min-w-0 flex-[2_1_340px] flex-col gap-3.5 p-6">
                    <SectionTitle>Precisa de atenção</SectionTitle>
                    {!hasAttention && <p className="m-0 text-sm text-muted">Nada pendente agora.</p>}
                    {data.pastDue.count > 0 && (
                        <AttentionItem
                            alert
                            icon={<AlertTriangle size={18} className="text-coral" aria-hidden="true" />}
                            title={`${data.pastDue.count} ${data.pastDue.count === 1 ? 'empresa' : 'empresas'} com pagamento atrasado`}
                            text={data.pastDue.workspaces.map((w) => w.name).join(', ')}
                            to="/empresas?filtro=past_due"
                        />
                    )}
                    {data.attention.failedEmails.count > 0 && (
                        <AttentionItem
                            icon={<Mail size={18} className="text-amber-400" aria-hidden="true" />}
                            title={`${data.attention.failedEmails.count} e-mail(s) não entregue(s)`}
                            text={
                                data.attention.failedEmails.last
                                    ? `${EMAIL_TEMPLATE_LABEL[data.attention.failedEmails.last.template] ?? data.attention.failedEmails.last.template} · ${relative(data.attention.failedEmails.last.createdAt)}`
                                    : ''
                            }
                            to="/sistema"
                        />
                    )}
                    {data.attention.pendingReceipts.count > 0 && (
                        <AttentionItem
                            icon={<Receipt size={18} className="text-amber-400" aria-hidden="true" />}
                            title={`${data.attention.pendingReceipts.count} comprovante(s) PIX aguardando`}
                            text={data.attention.pendingReceipts.oldestAt ? `o mais antigo ${relative(data.attention.pendingReceipts.oldestAt)}` : ''}
                            to="/comprovantes"
                        />
                    )}
                </div>

                <div className="card flex min-w-0 flex-[3_1_460px] flex-col gap-3.5 p-6">
                    <SectionTitle aside={<Link to="/empresas" className="text-[12.5px] font-semibold">Ver todas</Link>}>Últimos cadastros</SectionTitle>
                    <div className="overflow-x-auto">
                        <table className="tabela">
                            <thead>
                                <tr>
                                    <th>Empresa</th>
                                    <th>Segmento</th>
                                    <th>Plano</th>
                                    <th>Entrou</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentWorkspaces.map((ws) => (
                                    <tr key={ws.id}>
                                        <td>
                                            <Link to={`/empresas?id=${ws.id}`} className="font-medium text-cream hover:text-amber-200">
                                                {ws.name}
                                            </Link>
                                        </td>
                                        <td>{SEGMENT_LABEL[ws.segment] ?? ws.segment}</td>
                                        <td>
                                            <TierName tier={ws.effectiveTier} courtesy={ws.isCourtesy} />
                                        </td>
                                        <td className="text-muted">{relative(ws.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </>
    )
}

function AttentionItem({ icon, title, text, to, alert }: { icon: React.ReactNode; title: string; text: string; to: string; alert?: boolean }) {
    return (
        <div className={`flex items-start gap-3 rounded-[14px] border p-3.5 ${alert ? 'border-coral/20 bg-coral/[0.07]' : 'border-line/12 bg-white/[0.025]'}`}>
            <span className="mt-px flex-none">{icon}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[13.5px] font-medium text-cream">{title}</span>
                {text && <span className="text-[12.5px] text-muted">{text}</span>}
            </div>
            <Link to={to} className="text-[12.5px] font-semibold">
                Ver
            </Link>
        </div>
    )
}
