import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabaseUrl = process.env.VITE_SUPABASE_URL!
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Verify caller is authenticated and is admin
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userErr } = await supabaseClient.auth.getUser()
  if (userErr || !user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabaseClient
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const body = await req.json().catch(() => null)
  const email = body?.email?.trim()
  if (!email) return new Response(JSON.stringify({ error: 'Email requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  // Use service role to invite
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  // Redirige al app para que el usuario cree su contraseña
  const referer = req.headers.get('referer') ?? req.headers.get('origin') ?? ''
  const siteUrl = referer ? new URL(referer).origin : 'https://fin.cesarberrios.com'

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: siteUrl,
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, email: data.user?.email }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
