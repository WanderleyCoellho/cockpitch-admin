import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { errorMessage } from '../api/client'
import { opsApi, type SystemStatus } from '../api/ops'
import { ErrorState, LoadingState, Notice, PageHeader, SectionTitle } from '../components/ui'
import { EMAIL_TEMPLATE_LABEL, TIER_LABEL, money, relative } from '../lib/format'

const OUTCOME_LABEL: Record<string, string> = {
    synced: 'aplicado',
    ignored: 'ignorado',
    unknown_customer: 'cliente de fora',
    error: 'falhou'
}

export function SystemPage() {
    const query = useQuery({ queryKey: ['system'], queryFn: opsApi.system, refetchInterval: 60_000 })

    return (
        <>
            <PageHeader number="04" label="SISTEMA" title="Tudo funcionando?">
                <button type="button" className="btn btn-sm" onClick={() => query.refetch()} disabled={query.isFetching}>
                    <RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} aria-hidden="true" />
                    Atualizar
                </button>
            </PageHeader>
            {query.isPending ? (
                <LoadingState />
            ) : query.isError ? (
                <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
            ) : (
                <SystemContent data={query.data} />
            )}
        </>
    )
}

function Health({ ok, warn, title, text }: { ok: boolean; warn?: boolean; title: string; text: string }) {
    return (
        <div className="card flex items-center gap-3.5 px-5 py-[18px]">
            <span className={`ponto !h-2.5 !w-2.5 ${!ok ? 'ponto--alerta' : warn ? 'ponto--apagado' : ''}`} />
            <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-semibold text-cream">
                    {title}
                    <span className="sr-only">{ok ? (warn ? ' — atenção' : ' — ok') : ' — com problema'}</span>
                </span>
                <span className="text-xs text-muted">{text}</span>
            </div>
        </div>
    )
}

function SystemContent({ data }: { data: SystemStatus }) {
    const queryClient = useQueryClient()
    const [notice, setNotice] = useState<{ tone: 'ok' | 'erro'; text: string } | null>(null)

    const retry = useMutation({
        mutationFn: (id: string) => opsApi.retryEmail(id),
        onSuccess: () => {
            setNotice({ tone: 'ok', text: 'E-mail recolocado na fila. Ele sai em instantes.' })
            void queryClient.invalidateQueries({ queryKey: ['system'] })
            void queryClient.invalidateQueries({ queryKey: ['overview'] })
        },
        onError: (error) => setNotice({ tone: 'erro', text: errorMessage(error) })
    })

    const reconcile = useMutation({
        mutationFn: opsApi.reconcile,
        onSuccess: (result) => {
            setNotice({
                tone: 'ok',
                text: `Conferência concluída: ${result.result.total} empresa(s) com Stripe, ${result.result.updated} atualizada(s)${result.result.failed ? `, ${result.result.failed} com erro` : ''}.`
            })
            void queryClient.invalidateQueries()
        },
        onError: (error) => setNotice({ tone: 'erro', text: errorMessage(error) })
    })

    const { api, database, email, stripe } = data
    const stripeModeText = stripe.mode === 'live' ? 'produção' : stripe.mode === 'test' ? 'modo teste' : 'sem chave'

    return (
        <>
            {notice && (
                <Notice tone={notice.tone} onClose={() => setNotice(null)}>
                    {notice.text}
                </Notice>
            )}

            <section aria-label="Saúde" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                <Health ok={api.ok} title="API no ar" text={`${api.commit ? `deploy ${api.commit} · ` : ''}desde ${relative(api.startedAt)} · Node ${api.node}`} />
                <Health
                    ok={database.ok}
                    title="Banco de dados"
                    text={database.ok ? `${database.migrations} migrações aplicadas` : `Sem conexão: ${database.error ?? ''}`}
                />
                <Health
                    ok={email.failed === 0}
                    warn={email.provider === 'console' || !email.jobEnabled}
                    title={email.provider === 'resend' ? 'E-mails (Resend)' : 'E-mails só no log'}
                    text={
                        !email.jobEnabled
                            ? 'envio automático desligado'
                            : email.lastSentAt
                                ? `último envio ${relative(email.lastSentAt)}`
                                : 'nenhum envio ainda'
                    }
                />
                <Health
                    ok={stripe.mode !== 'unconfigured' && stripe.catalog.ok}
                    warn={stripe.mode === 'test'}
                    title={`Stripe · ${stripeModeText}`}
                    text={
                        stripe.catalog.ok
                            ? `${stripe.catalog.items.length} planos no catálogo${stripe.webhook.lastReceivedAt ? ` · último aviso ${relative(stripe.webhook.lastReceivedAt)}` : ''}`
                            : 'Não foi possível consultar o catálogo'
                    }
                />
            </section>

            <div className="flex flex-wrap items-start gap-4">
                <section className="card flex min-w-0 flex-[3_1_520px] flex-col gap-[18px] p-6">
                    <SectionTitle
                        aside={
                            <div className="flex flex-wrap gap-2">
                                <span className="tag">
                                    <span className="ponto" />
                                    Enviados 24 h · {email.sent24h}
                                </span>
                                <span className="tag">Na fila · {email.pending}</span>
                                <span className={`tag ${email.failed ? 'text-coral' : ''}`}>
                                    {email.failed > 0 && <span className="ponto ponto--alerta" />}
                                    Falharam · {email.failed}
                                </span>
                            </div>
                        }
                    >
                        Fila de e-mails
                    </SectionTitle>
                    {email.recent.length === 0 ? (
                        <p className="m-0 text-sm text-muted">Nenhum e-mail enviado ainda.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="tabela !text-[13px]">
                                <thead>
                                    <tr>
                                        <th>Quando</th>
                                        <th>Tipo</th>
                                        <th>Para</th>
                                        <th>Situação</th>
                                        <th>
                                            <span className="sr-only">Ações</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {email.recent.map((row) => (
                                        <tr key={row.id}>
                                            <td className="text-muted">{relative(row.createdAt)}</td>
                                            <td>{EMAIL_TEMPLATE_LABEL[row.template] ?? row.template}</td>
                                            <td className="max-w-[220px] truncate" title={row.to}>
                                                {row.to}
                                            </td>
                                            <td>
                                                {row.status === 'SENT' ? (
                                                    <span className="text-cream">Enviado</span>
                                                ) : row.status === 'FAILED' ? (
                                                    <span className="font-semibold text-coral" title={row.lastError ?? undefined}>
                                                        Falhou ({row.attempts}×)
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">Na fila{row.attempts ? ` · ${row.attempts} tentativa(s)` : ''}</span>
                                                )}
                                            </td>
                                            <td>
                                                {row.status === 'FAILED' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm"
                                                        disabled={retry.isPending && retry.variables === row.id}
                                                        onClick={() => retry.mutate(row.id)}
                                                    >
                                                        Reenviar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="card flex min-w-0 flex-[2_1_340px] flex-col gap-[18px] p-6">
                    <SectionTitle>Pagamentos (Stripe)</SectionTitle>
                    <div className="flex flex-col gap-2.5">
                        <span className="rotulo">Catálogo</span>
                        {stripe.catalog.ok ? (
                            stripe.catalog.items.map((item) => (
                                <div key={item.tier} className="flex justify-between gap-3 text-[13.5px]">
                                    <span className="text-cream">{TIER_LABEL[item.tier]}</span>
                                    <span className="text-muted">{money(item.amountCents)}/mês</span>
                                </div>
                            ))
                        ) : (
                            <span className="text-[13px] text-coral">
                                Não foi possível consultar o Stripe. Confira a chave em Railway.{' '}
                                <span className="text-muted">({stripe.catalog.error})</span>
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col gap-2.5">
                        <span className="rotulo">Últimos avisos do Stripe</span>
                        {stripe.webhook.recent.length === 0 ? (
                            <span className="text-[13px] text-subtle">Nenhum aviso recebido ainda.</span>
                        ) : (
                            stripe.webhook.recent.map((event) => (
                                <div key={event.id} className="flex justify-between gap-2.5 text-[13px]">
                                    <span className="min-w-0 truncate text-text">{event.type}</span>
                                    <span className={`flex-none ${event.outcome === 'error' ? 'text-coral' : 'text-muted'}`} title={event.error ?? undefined}>
                                        {OUTCOME_LABEL[event.outcome] ?? event.outcome} · {relative(event.receivedAt)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="flex flex-col gap-2.5 border-t border-line/12 pt-4">
                        <span className="text-[12.5px] text-muted">
                            {stripe.reconciliation.lastRun
                                ? `Última conferência completa: ${relative(stripe.reconciliation.lastRun.at)} · ${stripe.reconciliation.lastRun.result.total} empresa(s), ${stripe.reconciliation.lastRun.result.updated} atualizada(s).`
                                : `Conferência automática ${stripe.reconciliation.enabled ? 'ligada' : 'desligada'}. Nenhuma conferência desde o último deploy.`}
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                            <button type="button" className="btn-solid" onClick={() => reconcile.mutate()} disabled={reconcile.isPending || stripe.mode === 'unconfigured'}>
                                <RefreshCw size={16} className={reconcile.isPending ? 'animate-spin' : ''} aria-hidden="true" />
                                {reconcile.isPending ? 'Conferindo…' : 'Conferir agora'}
                            </button>
                            <a className="btn" href={stripe.dashboardUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink size={15} aria-hidden="true" />
                                Painel do Stripe
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </>
    )
}
