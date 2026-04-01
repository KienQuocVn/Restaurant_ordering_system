import {
  apiFetch,
  clearAuthSession,
  getSession,
  storeAuthSession,
  type AuthSession,
  type AuthUser,
} from './api'

export type UserRole = 'staff' | 'owner'

export interface User extends AuthUser {}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession()
  return session?.user || null
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  restaurantId?: string,
  restaurantName?: string
) {
  const response = await apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      name,
      role,
      restaurantId: restaurantId || null,
      restaurantName: restaurantName || '',
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Signup failed')
  }

  return data
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const response = await apiFetch('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Signin failed')
  }

  storeAuthSession(data)
  return data
}

export async function signOut() {
  const response = await apiFetch('/api/auth/signout', {
    method: 'POST',
  })
  clearAuthSession()
  return response.ok
}
