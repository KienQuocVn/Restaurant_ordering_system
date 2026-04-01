export function apiUrl(path: string) {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')
  const browserBaseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:4000`
      : 'http://localhost:4000'
  const baseUrl = envBaseUrl || browserBaseUrl

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'staff' | 'owner'
  restaurant_id?: string
  permissions?: Record<string, boolean>
  created_at: string
}

export interface AuthSession {
  user: AuthUser
  realtimeToken: string
  accessTokenExpiresIn: number
  realtimeTokenExpiresIn: number
}

let authSessionCache: AuthSession | null = null
let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  refreshPromise = fetch(apiUrl('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (response) => {
      if (!response.ok) {
        authSessionCache = null
        return false
      }
      const data = (await response.json()) as { success: boolean } & AuthSession
      authSessionCache = data.success ? data : null
      return Boolean(data.success)
    })
    .catch(() => {
      authSessionCache = null
      return false
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

export async function getSession(forceRefresh = false): Promise<AuthSession | null> {
  if (!forceRefresh && authSessionCache) return authSessionCache

  const response = await fetch(apiUrl('/api/auth/session'), {
    credentials: 'include',
  })

  if (response.ok) {
    const data = (await response.json()) as { success: boolean } & AuthSession
    authSessionCache = data.success ? data : null
    return authSessionCache
  }

  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) return null
    return authSessionCache
  }

  return null
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const session = await getSession()
  return session?.user || null
}

export async function getStoredRealtimeToken(): Promise<string | null> {
  const session = await getSession()
  return session?.realtimeToken || null
}

export function storeAuthSession(session: Partial<AuthSession> & { user: AuthUser }) {
  authSessionCache = {
    user: session.user,
    realtimeToken: session.realtimeToken || authSessionCache?.realtimeToken || '',
    accessTokenExpiresIn:
      session.accessTokenExpiresIn || authSessionCache?.accessTokenExpiresIn || 0,
    realtimeTokenExpiresIn:
      session.realtimeTokenExpiresIn || authSessionCache?.realtimeTokenExpiresIn || 0,
  }
}

export function clearAuthSession() {
  authSessionCache = null
  fetch(apiUrl('/api/auth/signout'), {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {})
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  requiresAuth = false
) {
  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  const execute = () =>
    fetch(apiUrl(path), {
      ...init,
      headers,
      credentials: 'include',
    })

  let response = await execute()

  if (requiresAuth && response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await execute()
    }
  }

  return response
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}
