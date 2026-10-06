import { NavLink, Outlet } from 'react-router-dom'
import { Activity, Building2, LayoutDashboard, LogOut, Receipt, Users } from 'lucide-react'
import { useSession } from '../auth/session'
import { Avatar, Lockup } from './ui'

const NAV = [
    { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
    { to: '/empresas', label: 'Empresas', icon: Building2 },
    { to: '/pessoas', label: 'Pessoas', icon: Users },
    { to: '/sistema', label: 'Sistema', icon: Activity }
]

/**
 * Moldura do painel. Computador: menu lateral fixo. Celular: barra no topo com o menu
 * rolando de lado, para o conteúdo aparecer logo.
 */
export function Shell() {
    const { state, logout } = useSession()
    const email = state.status === 'authenticated' ? state.email : ''

    const logoutButton = (
        <button type="button" aria-label="Sair" title="Sair" onClick={() => logout()} className="cursor-pointer rounded-lg border-0 bg-transparent p-1.5 text-muted hover:text-cream">
            <LogOut size={17} aria-hidden="true" />
        </button>
    )

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            <aside className="box-border flex flex-col gap-4 border-b border-line/10 bg-ink-950 px-4 py-4 md:sticky md:top-0 md:h-screen md:w-[260px] md:flex-none md:gap-7 md:border-b-0 md:border-r md:px-[18px] md:py-7">
                <div className="flex items-center justify-between px-1.5">
                    <Lockup />
                    <span className="md:hidden">{logoutButton}</span>
                </div>
                <nav aria-label="Seções" className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:overflow-visible md:px-0">
                    {NAV.map(({ to, label, icon: Icon, end }) => (
                        <NavLink key={to} to={to} end={end} className="nav-item flex-none">
                            <Icon size={18} aria-hidden="true" />
                            {label}
                        </NavLink>
                    ))}
                    <span className="mx-3.5 mb-1.5 mt-4 hidden text-[10.5px] font-semibold tracking-[0.24em] text-subtle md:block">OUTROS</span>
                    <NavLink to="/comprovantes" className="nav-item flex-none">
                        <Receipt size={18} aria-hidden="true" />
                        Comprovantes PIX
                    </NavLink>
                </nav>
                <div className="mt-auto hidden items-center gap-2.5 rounded-2xl border border-line/12 bg-white/[0.02] p-3.5 md:flex">
                    <Avatar text="LD" />
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[13px] font-medium text-cream">Operação</span>
                        <span className="truncate text-[11.5px] text-subtle" title={email}>
                            {email}
                        </span>
                    </div>
                    {logoutButton}
                </div>
            </aside>
            <main className="box-border flex min-w-0 flex-1 flex-col gap-7 px-4 pb-12 pt-6 md:px-10 md:pt-8">
                <Outlet />
            </main>
        </div>
    )
}
