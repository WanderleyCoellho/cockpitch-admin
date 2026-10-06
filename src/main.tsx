import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource/exo-2/300.css'
import '@fontsource/exo-2/600.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import { ApiError } from './api/client'
import { SessionProvider } from './auth/session'
import { App } from './App'
import './styles.css'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Erro de permissão/sessão não adianta repetir.
            retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2
        }
    }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <SessionProvider>
                    <App />
                </SessionProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>
)
