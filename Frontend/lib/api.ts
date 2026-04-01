export function apiUrl(path: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
    'http://localhost:4000'

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

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem('user')
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('auth_token')
}

export function storeAuthSession(user: AuthUser, token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('user', JSON.stringify(user))
  window.localStorage.setItem('auth_token', token)
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('user')
  window.localStorage.removeItem('auth_token')
}

export async function apiFetch(path: string, init: RequestInit = {}, requiresAuth = false) {
  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (requiresAuth) {
    const token = getStoredToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  return fetch(apiUrl(path), {
    ...init,
    headers,
  })
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}
