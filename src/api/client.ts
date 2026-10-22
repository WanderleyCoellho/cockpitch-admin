/**
 * Cliente único da API do Ops. A sessão é um cookie httpOnly (o navegador envia sozinho);
 * o painel nunca lê nem guarda token. 401 avisa a sessão para voltar ao login.
 */
const API_BASE = '/api'

export const UNAUTHORIZED_EVENT = 'ops:unauthorized'

export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly code?: string
    ) {
        super(message)
    }
}

/** Mensagem legível de qualquer erro (para exibir na tela). */
export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente de novo.') {
    if (error instanceof ApiError) return error.message
    if (error instanceof TypeError) return 'Sem conexão com a API. Confira a internet e tente de novo.'
    return fallback
}

type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; silent401?: boolean }

export async function api<T>(path: string, options: Options = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        method: options.method ?? 'GET',
        credentials: 'include',
        headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    })

    const text = await response.text()
    let data: unknown = null
    try {
        data = text ? JSON.parse(text) : null
    } catch {
        data = null
    }

    if (!response.ok) {
        const body = (data ?? {}) as { message?: string; code?: string }
        if (response.status === 401 && !options.silent401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
        const message =
            response.status === 401
                ? 'Sua sessão expirou. Entre de novo.'
                : response.status === 429
                    ? body.message || 'Muitas tentativas. Aguarde um pouco.'
                    : body.message || `Erro ${response.status} na API.`
        throw new ApiError(message, response.status, body.code)
    }
    return data as T
}
