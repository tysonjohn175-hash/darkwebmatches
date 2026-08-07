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

  // ... (all the existing loadUser, signIn, signUp, signOut, refreshBalance, getAllUsers functions)
  // We'll include them below, but the key change is in adminUpdateUser and adminDeleteUser.

  // Admin: Update user via Netlify Function
  const adminUpdateUser = async (userId, updates) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) throw new Error('Not authenticated')

      // ✅ Changed to Netlify function endpoint
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

      // ✅ Changed to Netlify function endpoint
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

  // ... (other functions like getAllUsers, etc.)

  // Return the context value
  const value = {
    signIn,
    signUp,
    signOut,
    refreshBalance,
    getAllUsers,
    adminUpdateUser,
    adminDeleteUser,
    auth: authService,
    wallet: walletService,
    supabase,
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