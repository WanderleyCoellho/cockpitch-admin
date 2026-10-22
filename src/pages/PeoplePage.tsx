import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { errorMessage } from '../api/client'
import { opsApi, type PeopleFilter } from '../api/ops'
import { Avatar, EmptyState, ErrorState, FilterChips, LoadingState, PageHeader, Pagination, SearchInput, TierName } from '../components/ui'
import { ROLE_LABEL, date, initials } from '../lib/format'

const FILTERS: Array<{ value: PeopleFilter; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'owners', label: 'Donos' },
    { value: 'members', label: 'Convidados' },
    { value: 'google', label: 'Entram com Google' },
    { value: 'password', label: 'Só senha' }
]

const isFilter = (value: string | null): value is PeopleFilter => FILTERS.some((f) => f.value === value)

export function PeoplePage() {
    const [params, setParams] = useSearchParams()
    const filterParam = params.get('filtro')
    const filter: PeopleFilter = isFilter(filterParam) ? filterParam : 'all'
    const q = params.get('q') ?? ''
    const page = Math.max(1, Number(params.get('pagina')) || 1)

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
        queryKey: ['people', filter, q, page],
        queryFn: () => opsApi.people({ filter, q, page }),
        placeholderData: keepPreviousData
    })
    const onSearch = useCallback((value: string) => update({ q: value, pagina: null }), [update])

    return (
        <>
            <PageHeader number="03" label="PESSOAS" title={query.data ? `${query.data.counts.all} pessoas` : 'Pessoas'}>
                <SearchInput value={q} onChange={onSearch} placeholder="Nome ou e-mail" label="Buscar pessoa" />
            </PageHeader>

            <FilterChips
                label="Filtrar pessoas"
                value={filter}
                onChange={(value) => update({ filtro: value === 'all' ? null : value, pagina: null })}
                options={FILTERS.map((f) => ({ ...f, count: query.data?.counts[f.value] }))}
            />

            <div className="card px-3 py-5">
                {query.isPending ? (
                    <LoadingState />
                ) : query.isError ? (
                    <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
                ) : query.data.items.length === 0 ? (
                    <EmptyState>{q ? `Ninguém encontrado para “${q}”.` : 'Ninguém neste filtro.'}</EmptyState>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="tabela">
                                <thead>
                                    <tr>
                                        <th>Pessoa</th>
                                        <th>Entra com</th>
                                        <th>Empresas e papel</th>
                                        <th>Plano em uso</th>
                                        <th>Cadastro</th>
                                        <th>
                                            <span className="sr-only">Ações</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {query.data.items.map((person) => {
                                        const main = person.memberships.find((m) => m.role === 'OWNER') ?? person.memberships[0]
                                        return (
                                            <tr key={person.id}>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar text={initials(person.name)} />
                                                        <div className="flex flex-col gap-[3px]">
                                                            <span className="font-semibold text-cream">{person.name}</span>
                                                            <span className="text-xs text-subtle">{person.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex gap-1.5">
                                                        {person.loginMethods.map((method) => (
                                                            <span key={method} className="tag tag--mini">
                                                                {method === 'GOOGLE' ? 'Google' : 'Senha'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>
                                                    {person.memberships.length === 0 ? (
                                                        <span className="text-subtle">sem empresa</span>
                                                    ) : (
                                                        <div className="flex flex-col gap-[3px]">
                                                            {person.memberships.map((m) => (
                                                                <span key={m.workspaceId}>
                                                                    <span className="text-cream">{m.workspaceName}</span>{' '}
                                                                    <span className="text-subtle">· {ROLE_LABEL[m.role]}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {main ? (
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <TierName tier={main.effectiveTier} courtesy={main.isCourtesy} />
                                                            {main.role !== 'OWNER' && <span className="text-xs text-subtle">(da empresa)</span>}
                                                        </span>
                                                    ) : (
                                                        <span className="text-subtle">—</span>
                                                    )}
                                                </td>
                                                <td className="text-muted">{date(person.createdAt)}</td>
                                                <td>
                                                    {main && (
                                                        <Link to={`/empresas?id=${main.workspaceId}`} className="btn btn-sm">
                                                            Ver empresa
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} onPage={(p) => update({ pagina: String(p) })} />
                    </>
                )}
            </div>
        </>
    )
}
