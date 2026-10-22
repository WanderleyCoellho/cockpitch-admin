import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { errorMessage } from '../api/client'
import { opsApi, type PlanTier, type Receipt, type ReceiptRisk, type ReceiptStatus } from '../api/ops'
import { EmptyState, ErrorState, LoadingState, Notice, PageHeader, SectionTitle } from '../components/ui'
import { TIER_LABEL, relative } from '../lib/format'

const STATUS_LABEL: Record<ReceiptStatus, string> = {
    SUBMITTED: 'Enviado',
    ANALYZED: 'Pré-analisado',
    NEEDS_HUMAN_REVIEW: 'Precisa de revisão',
    APPROVED: 'Aprovado',
    REJECTED: 'Recusado'
}
const RISK_LABEL: Record<ReceiptRisk, string> = { LOW: 'baixo', MEDIUM: 'médio', HIGH: 'alto' }
const OPEN: ReceiptStatus[] = ['SUBMITTED', 'ANALYZED', 'NEEDS_HUMAN_REVIEW']

/** Comprovantes PIX (fluxo anterior ao Stripe): pré-análise, decisão e ativação do plano. */
export function ReceiptsPage() {
    const query = useQuery({ queryKey: ['receipts'], queryFn: opsApi.receipts })
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const receipts = query.data?.receipts ?? []
    const selected = receipts.find((r) => r.id === selectedId) ?? receipts.find((r) => OPEN.includes(r.status)) ?? receipts[0] ?? null
    const pending = receipts.filter((r) => OPEN.includes(r.status)).length

    return (
        <>
            <PageHeader number="05" label="COMPROVANTES PIX" title={`${pending} aguardando`} />
            {query.isPending ? (
                <LoadingState />
            ) : query.isError ? (
                <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
            ) : receipts.length === 0 ? (
                <div className="card px-3 py-2">
                    <EmptyState>Nenhum comprovante enviado. Os pagamentos agora passam pelo Stripe.</EmptyState>
                </div>
            ) : (
                <div className="flex flex-wrap items-start gap-4">
                    <div className="card min-w-0 flex-[2_1_320px] px-3 py-5">
                        <table className="tabela">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Situação</th>
                                    <th>Enviado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receipts.map((r) => (
                                    <tr key={r.id} className={`clicavel ${r.id === selected?.id ? 'selecionada' : ''}`} onClick={() => setSelectedId(r.id)}>
                                        <td>
                                            <button
                                                type="button"
                                                className="cursor-pointer border-0 bg-transparent p-0 text-left text-[13.5px] font-semibold text-cream"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedId(r.id)
                                                }}
                                            >
                                                {r.user.name}
                                            </button>
                                            <div className="text-xs text-subtle">{r.user.email}</div>
                                        </td>
                                        <td className={OPEN.includes(r.status) ? 'text-amber-200' : 'text-muted'}>{STATUS_LABEL[r.status]}</td>
                                        <td className="text-muted">{relative(r.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {selected && <ReceiptDetail key={selected.id} receipt={selected} />}
                </div>
            )}
        </>
    )
}

function ReceiptDetail({ receipt }: { receipt: Receipt }) {
    const queryClient = useQueryClient()
    const [notice, setNotice] = useState<{ tone: 'ok' | 'erro'; text: string } | null>(null)
    const [summary, setSummary] = useState(receipt.analysisSummary ?? '')
    const [risk, setRisk] = useState<ReceiptRisk>(receipt.riskLevel)
    const [amount, setAmount] = useState(receipt.detectedAmount ?? '')
    const [payer, setPayer] = useState(receipt.payerName ?? '')
    const [reviewer, setReviewer] = useState('')
    const [notes, setNotes] = useState('')
    const [plan, setPlan] = useState<PlanTier>('PRO')

    // Nome de quem revisa fica só neste navegador (conveniência, não é dado sensível).
    useEffect(() => {
        try {
            setReviewer(localStorage.getItem('ops_reviewer_name') ?? 'Operação')
        } catch {
            setReviewer('Operação')
        }
    }, [])

    const done = (text: string) => {
        setNotice({ tone: 'ok', text })
        try {
            localStorage.setItem('ops_reviewer_name', reviewer)
        } catch {
            /* sem armazenamento local */
        }
        void queryClient.invalidateQueries()
    }
    const fail = (error: unknown) => setNotice({ tone: 'erro', text: errorMessage(error) })

    const analyze = useMutation({
        mutationFn: () =>
            opsApi.analyzeReceipt(receipt.id, {
                status: risk === 'LOW' ? 'ANALYZED' : 'NEEDS_HUMAN_REVIEW',
                riskLevel: risk,
                analysisSummary: summary.trim(),
                detectedAmount: amount.trim() || undefined,
                payerName: payer.trim() || undefined
            }),
        onSuccess: () => done('Pré-análise registrada.'),
        onError: fail
    })
    const reject = useMutation({
        mutationFn: () => opsApi.reviewReceipt(receipt.id, { decision: 'REJECTED', reviewerName: reviewer.trim(), reviewerNotes: notes.trim() || undefined }),
        onSuccess: () => done('Comprovante recusado.'),
        onError: fail
    })
    const approve = useMutation({
        mutationFn: () =>
            opsApi.approveReceipt(receipt.id, {
                reviewerName: reviewer.trim(),
                reviewerNotes: notes.trim() || undefined,
                planTier: plan,
                notes: 'Aprovado pelo painel Ops'
            }),
        onSuccess: () => done(`Aprovado e plano ${TIER_LABEL[plan]} ativado.`),
        onError: fail
    })

    const open = OPEN.includes(receipt.status)
    const busy = analyze.isPending || reject.isPending || approve.isPending

    function submitAnalysis(event: FormEvent) {
        event.preventDefault()
        if (summary.trim().length < 10) return setNotice({ tone: 'erro', text: 'Escreva um resumo com pelo menos 10 caracteres.' })
        analyze.mutate()
    }

    return (
        <aside aria-label="Comprovante" className="card card--quente flex min-w-0 flex-[3_1_420px] flex-col gap-5 p-6">
            <div className="flex flex-col gap-1.5">
                <span className="rotulo">Comprovante · {STATUS_LABEL[receipt.status]}</span>
                <h2 className="m-0 font-display text-2xl font-semibold text-cream">{receipt.user.name}</h2>
                <span className="text-[13px] text-muted">
                    {receipt.user.email} · enviado {relative(receipt.createdAt)}
                </span>
            </div>
            {notice && (
                <Notice tone={notice.tone} onClose={() => setNotice(null)}>
                    {notice.text}
                </Notice>
            )}
            <a className="btn btn-sm self-start" href={opsApi.receiptFileUrl(receipt.id)} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} aria-hidden="true" />
                Abrir arquivo ({receipt.originalFilename})
            </a>

            <form onSubmit={submitAnalysis} className="flex flex-col gap-3">
                <SectionTitle>Pré-análise</SectionTitle>
                <label className="flex flex-col gap-2 text-[13px] font-medium text-muted">
                    Resumo
                    <textarea className="campo min-h-20" value={summary} onChange={(e) => setSummary(e.target.value)} disabled={!open} />
                </label>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                    <label className="flex flex-col gap-2 text-[13px] font-medium text-muted">
                        Risco
                        <select className="campo" value={risk} onChange={(e) => setRisk(e.target.value as ReceiptRisk)} disabled={!open}>
                            {(Object.keys(RISK_LABEL) as ReceiptRisk[]).map((key) => (
                                <option key={key} value={key}>
                                    {RISK_LABEL[key]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-2 text-[13px] font-medium text-muted">
                        Valor
                        <input className="campo" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!open} />
                    </label>
                    <label className="flex flex-col gap-2 text-[13px] font-medium text-muted">
                        Pagador
                        <input className="campo" value={payer} onChange={(e) => setPayer(e.target.value)} disabled={!open} />
                    </label>
                </div>
                {open && (
                    <button type="submit" className="btn self-start" disabled={busy}>
                        Salvar pré-análise
                    </button>
                )}
            </form>

            {open ? (
                <div className="flex flex-col gap-3 border-t border-line/12 pt-4">
                    <SectionTitle>Decisão</SectionTitle>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                        <label className="flex flex-col gap-2 text-[13px] font-medium text-muted">
                            Quem revisou
                            <input className="campo" value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
                        </label>
                        <label className="flex flex-col gap-2 text-[13px] font-medium text-muted">
                            Plano a ativar
                            <select className="campo" value={plan} onChange={(e) => setPlan(e.target.value as PlanTier)}>
                                {(['STARTER', 'PRO', 'AGENCY'] as const).map((tier) => (
                                    <option key={tier} value={tier}>
                                        {TIER_LABEL[tier]}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label className="flex flex-col gap-2 text-[13px] font-medium text-muted">
                        Observação
                        <input className="campo" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn-solid" disabled={busy || reviewer.trim().length < 2} onClick={() => approve.mutate()}>
                            Aprovar e ativar {TIER_LABEL[plan]}
                        </button>
                        <button type="button" className="btn" disabled={busy || reviewer.trim().length < 2} onClick={() => reject.mutate()}>
                            Recusar
                        </button>
                    </div>
                </div>
            ) : (
                <p className="m-0 border-t border-line/12 pt-4 text-[13px] text-muted">
                    {STATUS_LABEL[receipt.status]}
                    {receipt.reviewerName ? ` por ${receipt.reviewerName}` : ''}
                    {receipt.reviewedAt ? ` ${relative(receipt.reviewedAt)}` : ''}.
                </p>
            )}
        </aside>
    )
}
