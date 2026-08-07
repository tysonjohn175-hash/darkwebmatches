// netlify/functions/adminActions.cjs
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { action, userId, updates } = JSON.parse(event.body)

  // Verify the token
  const authHeader = event.headers.authorization
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const token = authHeader.split(' ')[1]
  const regularClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY)
  const { data: { user }, error: userError } = await regularClient.auth.getUser(token)

  if (userError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  // Check if user is admin
  const { data: adminCheck } = await regularClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminCheck?.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
  }

  switch (action) {
    case 'deleteUser': {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await regularClient.from('users').delete().eq('id', userId)
      await regularClient.from('balances').delete().eq('user_id', userId)
      return { statusCode: 200, body: JSON.stringify({ success: true }) }
    }

    case 'updateUser': {
      if (updates.active === false) {
        try {
          await supabaseAdmin.auth.admin.revokeUser(userId)
        } catch (_) {}
      }
      const { data, error } = await regularClient
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
      if (error) throw error
      return { statusCode: 200, body: JSON.stringify({ success: true, user: data?.[0] }) }
    }

    default:
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) }
  }
}