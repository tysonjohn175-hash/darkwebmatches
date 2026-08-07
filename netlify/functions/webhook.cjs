// netlify/functions/webhook.cjs
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')

// Get environment variables (set in Netlify dashboard)
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // Verify Paystack signature
  const signature = event.headers['x-paystack-signature']
  if (!signature) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
    .update(event.body)
    .digest('hex')

  if (hash !== signature) {
    return { statusCode: 401, body: 'Invalid signature' }
  }

  // Parse the payload
  const payload = JSON.parse(event.body)
  if (payload.event !== 'charge.success') {
    return { statusCode: 200, body: 'Ignored' }
  }

  const data = payload.data
  const reference = data.reference
  const amount = data.amount / 100 // kobo → GHS
  const customerEmail = data.customer.email

  // Find user by email
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', customerEmail)
    .single()

  if (userError || !user) {
    console.error('User not found:', customerEmail)
    return { statusCode: 404, body: 'User not found' }
  }

  // Get current balance
  const { data: current, error: fetchError } = await supabase
    .from('balances')
    .select('available')
    .eq('user_id', user.id)
    .single()

  if (fetchError) {
    console.error('Fetch balance error:', fetchError)
    return { statusCode: 500, body: 'Balance fetch failed' }
  }

  const newAvailable = (current?.available || 0) + amount

  // Update balance
  const { error: balanceError } = await supabase
    .from('balances')
    .update({ available: newAvailable })
    .eq('user_id', user.id)

  if (balanceError) {
    console.error('Balance update error:', balanceError)
    return { statusCode: 500, body: 'Balance update failed' }
  }

  // Log transaction
  await supabase.from('transactions').insert({
    user_id: user.id,
    type: 'deposit',
    amount: amount,
    description: `Deposit via Paystack (${reference})`,
    status: 'completed',
    reference,
  })

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Webhook processed' })
  }
}