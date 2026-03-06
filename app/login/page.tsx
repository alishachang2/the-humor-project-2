'use client'
import { createClient } from '@/lib/supabase/client'

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
    
    return (
        <button onClick={handleGoogleLogin}>
            Login with Google </button>        
    )
}

