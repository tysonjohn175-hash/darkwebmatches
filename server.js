import express from 'express'
import path from 'path'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// ------------------------------
// 1. Environment Variables
// ------------------------------
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ------------------------------
// 2. Serve Static Frontend (dist)
// ------------------------------
app.use(express.static(path.join(__dirname, 'dist')))

// ------------------------------
// 3. Paystack Webhook Endpoint
// ------------------------------
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature']
    if (!signature) {
      return res.status(401).send('Unauthorized')
    }

    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
      .update(req.body)
      .digest('hex')

    if (hash !== signature) {
      return res.status(401).send('Invalid signature')
    }

    const payload = JSON.parse(req.body)
    if (payload.event !== 'charge.success') {
      return res.status(200).send('Ignored')
    }

    const data = payload.data
    const reference = data.reference
    const amount = data.amount / 100
    const customerEmail = data.customer.email

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', customerEmail)
      .single()

    if (userError || !user) {
      console.error('User not found:', customerEmail)
      return res.status(404).send('User not found')
    }

    // Fetch current balance
    const { data: current, error: fetchError } = await supabase
      .from('balances')
      .select('available')
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('Fetch balance error:', fetchError)
      return res.status(500).send('Balance fetch failed')
    }

    const newAvailable = (current?.available || 0) + amount

    // Update balance
    const { error: balanceError } = await supabase
      .from('balances')
      .update({ available: newAvailable })
      .eq('user_id', user.id)

    if (balanceError) {
      console.error('Balance update error:', balanceError)
      return res.status(500).send('Balance update failed')
    }

    // Log transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount,
      description: `Deposit via Paystack (${reference})`,
      status: 'completed',
      reference,
    })

    res.status(200).json({ message: 'Webhook processed' })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).send('Internal server error')
  }
})

// ------------------------------
// 4. Fallback for SPA (React Router)
// ------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// ------------------------------
// 5. Start Server
// ------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})