import { Navigate, Route, Routes } from 'react-router-dom'
import { useSession } from './auth/session'
import { Shell } from './components/Shell'
import { LoadingState } from './components/ui'
import { CompaniesPage } from './pages/CompaniesPage'
import { LoginPage } from './pages/LoginPage'
import { OverviewPage } from './pages/OverviewPage'
import { PeoplePage } from './pages/PeoplePage'
import { ReceiptsPage } from './pages/ReceiptsPage'
import { SystemPage } from './pages/SystemPage'

export function App() {
    const { state } = useSession()

    if (state.status === 'checking') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <LoadingState label="Conferindo sua sessão…" />
            </div>
        )
    }
    if (state.status === 'anonymous') return <LoginPage />

    return (
        <Routes>
            <Route element={<Shell />}>
                <Route index element={<OverviewPage />} />
                <Route path="empresas" element={<CompaniesPage />} />
                <Route path="pessoas" element={<PeoplePage />} />
                <Route path="sistema" element={<SystemPage />} />
                <Route path="comprovantes" element={<ReceiptsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    )
}
