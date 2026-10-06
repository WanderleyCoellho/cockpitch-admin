import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { errorMessage } from '../api/client'
import { opsApi, type WorkspaceFilter } from '../api/ops'
import { CompanyPanel } from '../components/CompanyPanel'
import { BillingLabel, EmptyState, ErrorState, FilterChips, LoadingState, PageHeader, Pagination, SearchInput, TierName } from '../components/ui'
import { limitText, monthYear } from '../lib/format'

const FILTERS: Array<{ value: WorkspaceFilter; label: string; alert?: boolean }> = [
    { value: 'all', label: 'Todas' },
    { value: 'paying', label: 'Pagantes' },
    { value: 'free', label: 'Grátis' },
    { value: 'courtesy', label: 'Cortesia' },
    { value: 'past_due', label: 'Pagamento atrasado', alert: true }
]

const isFilter = (value: string | null): value is WorkspaceFilter => FILTERS.some((f) => f.value === value)

export function CompaniesPage() {
    // Filtro, busca, página e empresa aberta ficam na URL (dá para compartilhar o link e voltar).
    const [params, setParams] = useSearchParams()
    const filterParam = params.get('filtro')
    const filter: WorkspaceFilter = isFilter(filterParam) ? filterParam : 'all'
    const q = params.get('q') ?? ''
    const page = Math.max(1, Number(params.get('pagina')) || 1)
    const selectedId = params.get('id')

    const update = useCallback(
        (changes: Record<string, string | null>) => {
            setParams(
                (prev) => {
                    const next = new URLSearchParams(prev)
                    for (const [key, value] of Object.entries(changes)) {
                        if (value === null || value === '') next.delete(key)
                        else next.set(key, value)
                    }
                    return next
                },
                { replace: true }
            )
        },
        [setParams]
    )

    const query = useQuery({
        queryKey: ['workspaces', filter, q, page],
        queryFn: () => opsApi.workspaces({ filter, q, page }),
        placeholderData: keepPreviousData
    })
    const onSearch = useCallback((value: string) => update({ q: value, pagina: null }), [update])
    // Com a ficha aberta, a lista mostra só o essencial (cabe sem rolar de lado).
    const compact = Boolean(selectedId)

    return (
        <>
            <PageHeader number="02" label="EMPRESAS" title={query.data ? `${query.data.counts.all} empresas` : 'Empresas'}>
                <SearchInput value={q} onChange={onSearch} placeholder="Empresa ou e-mail" label="Buscar empresa" />
            </PageHeader>

            <FilterChips
                label="Filtrar empresas"
                value={filter}
                onChange={(value) => update({ filtro: value === 'all' ? null : value, pagina: null })}
                options={FILTERS.map((f) => ({ ...f, count: query.data?.counts[f.value] }))}
            />

            <div className="flex flex-wrap items-start gap-4">
                <div className="card min-w-0 flex-[3_1_520px] px-3 py-5">
                    {query.isPending ? (
                        <LoadingState />
                    ) : query.isError ? (
                        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
                    ) : query.data.items.length === 0 ? (
                        <EmptyState>{q ? `Nenhuma empresa encontrada para “${q}”.` : 'Nenhuma empresa neste filtro.'}</EmptyState>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="tabela">
                                    <thead>
                                        <tr>
                                            <th>Empresa</th>
                                            <th>Plano</th>
                                            <th>Situação</th>
                                            {!compact && <th>Pessoas</th>}
                                            {!compact && <th>Propostas no mês</th>}
                                            <th>Desde</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {query.data.items.map((ws) => (
                                            <tr
                                                key={ws.id}
                                                className={`clicavel ${ws.id === selectedId ? 'selecionada' : ''}`}
                                                onClick={() => update({ id: ws.id })}
                                            >
                                                <td>
                                                    <div className="flex flex-col gap-[3px]">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                update({ id: ws.id })
                                                            }}
                                                            className="cursor-pointer border-0 bg-transparent p-0 text-left text-[13.5px] font-semibold text-cream hover:text-amber-200"
                                                        >
                                                            {ws.name}
                                                        </button>
                                                        <span className="text-xs text-subtle">{ws.owner?.email ?? 'sem dono'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <TierName tier={ws.isCourtesy ? ws.effectiveTier : ws.planTier} courtesy={ws.isCourtesy} />
                                                </td>
                                                <td>
                                                    <BillingLabel status={ws.billingStatus} cancelAt={ws.subscriptionCancelAt} courtesy={ws.isCourtesy} />
                                                </td>
                                                {!compact && <td>{limitText(ws.members, ws.memberLimit)}</td>}
                                                {!compact && <td>{limitText(ws.proposalsThisMonth, ws.proposalLimit)}</td>}
                                                <td className="text-muted">{monthYear(ws.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} onPage={(p) => update({ pagina: String(p) })} />
                        </>
                    )}
                </div>

                {selectedId && <CompanyPanel id={selectedId} onClose={() => update({ id: null })} />}
            </div>
        </>
    )
}
