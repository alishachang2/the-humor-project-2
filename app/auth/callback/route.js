import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function GET (request) {
    const supabase = await createClient()
    const code = request.nextUrl.searchParams.get('code')
    if (code) {
        await supabase.auth.exchangeCodeForSession(code)
        return NextResponse.redirect(new URL ('/admin', request.url))
    }
}