import { Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export function Login() {
  const { session, isAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const redirectTo = window.location.origin

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) toast.error(error.message)
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault()
    // shouldCreateUser: false — the link only works for accounts that already exist.
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo, shouldCreateUser: false } })
    if (error) toast.error(error.message)
    else setSent(true)
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <img src="/favicon.svg" alt="" className="mb-2 size-14" />
          <CardTitle className="text-xl">ElektrUy Admin</CardTitle>
          <CardDescription>Only accounts listed as admins can use this panel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {session && isAdmin === false && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {session.user.email} is not an admin.{' '}
              <button className="underline" onClick={() => supabase.auth.signOut()}>
                Sign out
              </button>
            </div>
          )}
          <Button size="lg" onClick={google}>
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 3.7 14.55 2.7 12 2.7 6.87 2.7 2.7 6.87 2.7 12s4.17 9.3 9.3 9.3c5.37 0 8.93-3.77 8.93-9.09 0-.61-.07-1.08-.16-1.54z" />
            </svg>
            Continue with Google
          </Button>
          <div className="relative text-center text-xs text-muted-foreground">
            <span className="bg-background px-2">or email link (existing accounts)</span>
          </div>
          {sent ? (
            <p className="text-center text-sm">Check your inbox for the sign-in link.</p>
          ) : (
            <form onSubmit={magicLink} className="flex gap-2">
              <Input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" variant="outline" size="icon" aria-label="Send link">
                <Mail />
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
