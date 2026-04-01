import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type UserRole = 'customer' | 'staff' | 'owner'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  restaurant_id?: string
  created_at: string
}

// Hash password with bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Verify password
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Get current user session
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (userError || !userData) return null

    return userData as User
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Sign up user
export async function signUp(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  restaurantId?: string
) {
  try {
    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
      })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    // Create user profile
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      name,
      role,
      restaurant_id: restaurantId,
    })

    if (profileError) throw profileError

    return { success: true, userId: authData.user.id }
  } catch (error) {
    console.error('Sign up error:', error)
    throw error
  }
}

// Sign in user
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (userError) throw userError

    return { success: true, user: userData as User }
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

// Sign out user
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}
