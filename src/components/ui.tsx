import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Loader2, Search } from 'lucide-react'
import type { BillingStatus, PlanTier } from '../api/ops'
import { BILLING_LABEL, TIER_LABEL, date } from '../lib/format'

/** Lockup da marca: símbolo eclipse + LUMEN / DEAL · OPS (Exo 2). */
export function Lockup({ size = 'md' }: { size?: 'md' | 'lg' }) {
    const lg = size === 'lg'
    return (
        <div className="flex items-center gap-2.5">
            <img src="/lumen-simbolo.svg" alt="" className={lg ? 'h-11 w-11' : 'h-[34px] w-[34px]'} style={{ filter: 'drop-shadow(0 0 8px rgba(245,181,68,.5))' }} />
            <div className="flex flex-col gap-1">
                <span className={`font-logo font-light tracking-[0.4em] text-cream ${lg ? 'text-[19px]' : 'text-[15px]'}`}>LUMEN</span>
                <span className={`font-logo font-semibold tracking-[0.5em] text-amber-500 ${lg ? 'text-[9px]' : 'text-[7.5px]'}`}>DEAL · OPS</span>
            </div>
        </div>
    )
}

export function PageHeader({ number, label, title, children }: { number: string; label: string; title: ReactNode; children?: ReactNode }) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5 text-xs font-semibold tracking-[0.24em] text-label">
                    <span className="font-display text-sm font-bold tracking-normal text-amber-500">{number}</span>
                    {label}
                </div>
                <h1 className="m-0 font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.02em] text-cream md:text-[38px]">{title}</h1>
            </div>
            {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
        </header>
    )
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 font-display text-[19px] font-semibold text-cream">{children}</h2>
            {aside}
        </div>
    )
}

export function Kpi({ label, value, hint, hot = false }: { label: string; value: ReactNode; hint?: ReactNode; hot?: boolean }) {
    return (
        <div className={`card flex flex-col gap-2.5 p-5 ${hot ? 'card--quente' : ''}`}>
            <span className={`text-xs font-semibold tracking-[0.14em] ${hot ? 'text-amber-200' : 'text-label'}`}>{label}</span>
            <span className="font-display text-[32px] font-semibold leading-none text-cream">{value}</span>
            {hint && <span className="text-[12.5px] text-muted">{hint}</span>}
        </div>
    )
}

export function TierName({ tier, courtesy }: { tier: PlanTier; courtesy?: boolean }) {
    if (courtesy) {
        return (
            <span className="tag tag--mini text-amber-200">
                <span className="ponto ponto--claro" />
                Cortesia · {TIER_LABEL[tier]}
            </span>
        )
    }
    if (tier === 'FREE') return <span className="text-muted">Grátis</span>
    return <span>{TIER_LABEL[tier]}</span>
}

/** Situação da cobrança: ponto + texto (nunca só cor). */
export function BillingLabel({ status, cancelAt, courtesy }: { status: BillingStatus; cancelAt?: string | null; courtesy?: boolean }) {
    if (courtesy) return <span className="text-subtle">—</span>
    if (status === 'PAST_DUE') {
        return (
            <span className="inline-flex items-center gap-2 font-semibold text-coral">
                <span className="ponto ponto--alerta" />
                {BILLING_LABEL.PAST_DUE}
            </span>
        )
    }
    if (status === 'ACTIVE' && cancelAt) {
        return (
            <span className="inline-flex items-center gap-2 text-muted">
                <span className="ponto ponto--apagado" />
                Cancela em {date(cancelAt)}
            </span>
        )
    }
    if (status === 'ACTIVE') {
        return (
            <span className="inline-flex items-center gap-2 text-cream">
                <span className="ponto" />
                {BILLING_LABEL.ACTIVE}
            </span>
        )
    }
    if (status === 'CANCELED') return <span className="text-muted">{BILLING_LABEL.CANCELED}</span>
    return <span className="text-subtle">—</span>
}

export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
    // Busca com pequena espera para não consultar a API a cada tecla.
    const [text, setText] = useState(value)
    useEffect(() => setText(value), [value])
    useEffect(() => {
        if (text === value) return
        const timer = window.setTimeout(() => onChange(text.trim()), 300)
        return () => window.clearTimeout(timer)
    }, [text, value, onChange])

    return (
        <label className="flex w-[340px] max-w-full items-center gap-2.5 rounded-full border border-line/20 bg-white/[0.03] px-4 py-[11px] text-subtle focus-within:border-amber-400/60">
            <Search size={16} aria-hidden="true" />
            <input
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                aria-label={label}
                className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-cream outline-none placeholder:text-subtle"
            />
        </label>
    )
}

export function FilterChips<T extends string>({
    options,
    value,
    onChange,
    label
}: {
    options: Array<{ value: T; label: string; count?: number; alert?: boolean }>
    value: T
    onChange: (value: T) => void
    label: string
}) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-2">
            {options.map((option) => {
                const active = option.value === value
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(option.value)}
                        className={`tag ${active ? '' : 'tag--fantasma'} ${option.alert && !active ? 'text-coral' : ''}`}
                    >
                        {active && <span className={`ponto ${option.alert ? 'ponto--alerta' : ''}`} />}
                        {option.label}
                        {option.count !== undefined && ` · ${option.count}`}
                    </button>
                )
            })}
        </div>
    )
}

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
    return (
        <div role="status" className="flex items-center gap-2.5 py-10 text-sm text-muted">
            <Loader2 size={18} className="animate-spin text-amber-500" aria-hidden="true" />
            {label}
        </div>
    )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-coral/25 bg-coral/[0.07] px-4 py-3.5 text-sm text-cream">
            <AlertTriangle size={18} className="text-coral" aria-hidden="true" />
            <span className="flex-1">{message}</span>
            {onRetry && (
                <button type="button" className="btn btn-sm" onClick={onRetry}>
                    Tentar de novo
                </button>
            )}
        </div>
    )
}

export function EmptyState({ children }: { children: ReactNode }) {
    return <p className="m-0 px-3 py-8 text-center text-sm text-muted">{children}</p>
}

export function Notice({ tone, children, onClose }: { tone: 'ok' | 'erro'; children: ReactNode; onClose?: () => void }) {
    return (
        <div
            role={tone === 'erro' ? 'alert' : 'status'}
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-[13px] ${
                tone === 'erro' ? 'border-coral/25 bg-coral/[0.07] text-cream' : 'border-amber-400/25 bg-amber-500/[0.08] text-amber-100'
            }`}
        >
            <span className="flex-1">{children}</span>
            {onClose && (
                <button type="button" onClick={onClose} className="cursor-pointer border-0 bg-transparent text-xs text-muted underline">
                    Fechar
                </button>
            )}
        </div>
    )
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
    const last = Math.max(1, Math.ceil(total / pageSize))
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(total, page * pageSize)
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-1 pt-4 text-[12.5px] text-subtle">
            <span>
                {from}–{to} de {total}
            </span>
            <div className="flex gap-2">
                <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
                    Anterior
                </button>
                <button type="button" className="btn btn-sm" disabled={page >= last} onClick={() => onPage(page + 1)}>
                    Próxima
                </button>
            </div>
        </div>
    )
}

export function Avatar({ text }: { text: string }) {
    return (
        <div
            aria-hidden="true"
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full font-display text-[12.5px] font-semibold text-amber-200"
            style={{ background: 'linear-gradient(180deg,#2C3346,#181D2A)' }}
        >
            {text}
        </div>
    )
}
