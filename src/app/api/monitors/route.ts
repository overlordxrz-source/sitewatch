import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/monitors — create a new monitor
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, url, slug, check_interval, notify_emails, is_active } = body

  if (!name || !url || !slug) {
    return NextResponse.json({ error: 'name, url, and slug are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('monitors')
    .insert({
      user_id: user.id,
      name,
      url,
      slug,
      check_interval: check_interval ?? 5,
      notify_emails: notify_emails ?? [],
      is_active: is_active ?? true,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A monitor with that slug already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// GET /api/monitors — list user's monitors
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('monitors')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
