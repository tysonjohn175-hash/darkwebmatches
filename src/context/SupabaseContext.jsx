import { createContext, useContext, useState, useEffect } from 'react'
import supabase, { getSupabaseAdmin } from '../lib/supabase'
import { authService } from '../services/supabase/authService'
import { walletService } from '../services/supabase/walletService'

const SupabaseContext = createContext()

export const SupabaseProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [balance, setBalance] = useState({ available: 0, withdrawable: 0 })

  // Load user on mount
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session?.user) {
        await loadUser(session.user)
      }
      setLoading(false)
    }

    loadUserData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (session?.user) {
        await loadUser(session.user)
      } else {
        setUser(null)
        setBalance({ available: 0, withdrawable: 0 })
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUser = async (authUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error)
      }

      const userData = {
        ...authUser,
        ...(profile || {}),
        currency: profile?.currency || 'GHS',
        country: profile?.country || 'Ghana',
      }
      setUser(userData)

      const balanceData = await walletService.getBalance(authUser.id)
      setBalance(balanceData || { available: 0, withdrawable: 0 })
    } catch (error) {
      console.error('Error loading user:', error)
      setUser({ ...authUser, currency: 'GHS', country: 'Ghana' })
    }
  }

  // Sign in (email or phone)
  const signIn = async (identifier, password) => {
    try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      })

      if (error && error.message?.includes('Invalid login credentials')) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('phone', identifier)
          .maybeSingle()

        if (userError || !userData) {
          return { success: false, error: 'Invalid credentials' }
        }

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: userData.email,
          password,
        })
        if (loginError) return { success: false, error: loginError.message }
        data = loginData
      } else if (error) {
        return { success: false, error: error.message }
      }

      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('active, role')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!userData?.active) {
          await supabase.auth.signOut()
          return { success: false, error: 'Account deactivated. Contact support.' }
        }

        await authService.logActivity(data.user.id, 'login', 'User logged in')
      }

      return { success: true, user: data.user }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: error.message }
    }
  }

  // Sign up
  const signUp = async (name, email, phone, password, country, countryCode, currency) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone, country, countryCode, currency, role: 'user' },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        await authService.logActivity(authData.user.id, 'register', `New user registered from ${country}`)
      }

      return { success: true, user: authData.user }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: error.message }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setBalance({ available: 0, withdrawable: 0 })
      setSession(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Refresh balance
  const refreshBalance = async () => {
    if (user?.id) {
      const balanceData = await walletService.getBalance(user.id)
      setBalance(balanceData || { available: 0, withdrawable: 0 })
    }
  }

  // Direct balance update (optimistic UI)
  const updateBalance = (newBalance) => {
    setBalance(newBalance)
  }

  // Admin: Get all users
  const getAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    } catch (error) {
      console.error('Get all users error:', error)
      return []
    }
  }

  // Admin: Update user via Netlify Function
  const adminUpdateUser = async (userId, updates) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) throw new Error('Not authenticated')

      const response = await fetch('/.netlify/functions/adminActions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'updateUser',
          userId,
          updates,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Update failed')
      }

      const result = await response.json()
      await authService.logActivity(userId, 'admin_update', `Admin updated user: ${JSON.stringify(updates)}`)
      return { success: true, user: result.user }
    } catch (error) {
      console.error('Update user error:', error)
      return { success: false, error: error.message }
    }
  }

  // Admin: Delete user via Netlify Function
  const adminDeleteUser = async (userId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) throw new Error('Not authenticated')

      const response = await fetch('/.netlify/functions/adminActions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'deleteUser',
          userId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Delete failed')
      }

      const result = await response.json()
      await authService.logActivity(userId, 'delete', 'User permanently deleted by admin')
      return { success: true }
    } catch (error) {
      console.error('Delete user error:', error)
      return { success: false, error: error.message }
    }
  }

  // ----- Context Value -----
  const value = {
    // Auth functions
    signIn,
    signUp,
    signOut,
    refreshBalance,
    updateBalance,
    // Admin functions
    getAllUsers,
    adminUpdateUser,
    adminDeleteUser,
    // Services
    auth: authService,
    wallet: walletService,
    supabase,
    // State
    user,
    balance,
    loading,
    session,
  }

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) throw new Error('useSupabase must be used within a SupabaseProvider')
  return context
}