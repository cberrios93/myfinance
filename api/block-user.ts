import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabaseUrl = process.env.VITE_SUPABASE_URL!
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabaseClient
    .from('user_profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const body = await req.json().catch(() => null)
  const { targetUserId, action, blockReason } = body ?? {}

  if (!targetUserId || !['block', 'unblock'].includes(action)) {
    return new Response(JSON.stringify({ error: 'targetUserId y action requeridos' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }
  if (targetUserId === user.id) {
    return new Response(JSON.stringify({ error: 'No puedes bloquearte a ti mismo' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      status: action === 'block' ? 'blocked' : 'active',
      block_reason: action === 'block' ? (blockReason ?? null) : null,
    })
    .eq('user_id', targetUserId)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
