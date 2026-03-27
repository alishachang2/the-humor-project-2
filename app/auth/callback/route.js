import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const supabase = await createClient()
  const code = request.nextUrl.searchParams.get('code')

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const meta = session.user.user_metadata ?? {}
      const firstName = meta.given_name ?? meta.full_name?.split(' ')[0] ?? ''
      const lastName  = meta.family_name ?? meta.full_name?.split(' ').slice(1).join(' ') ?? ''

      await supabase.from('profiles').upsert({
        id:         session.user.id,
        email:      session.user.email,
        first_name: firstName,
        last_name:  lastName,
      }, { onConflict: 'id' })
    }

    return NextResponse.redirect(new URL('/admin', request.url))
  }
}
