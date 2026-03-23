'use client'
import { createClient } from '@/lib/supabase/client'
import LoginUI from '@/components/LoginUI'

export default function Page(){
    const supabase = createClient()

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`
        }
    })
    }
    
    return <LoginUI onGoogleLogin={handleGoogleLogin} />

}

