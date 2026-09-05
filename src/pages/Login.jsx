import { useState } from 'react'
import { login } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">✦ PMS Simplify</div>
        <h1>Sign in to the ePRIME helper</h1>
        <p className="muted">
          Use your ePRIME / PRIME-HRM credentials — the same email and password as{' '}
          <code>eprime.kerisoftware.com</code>. Nothing is stored; you sign in straight to
          the ePRIME Supabase project.
        </p>
        <form onSubmit={onSubmit} className="stack">
          <label className="field">
            <span className="field-label">Email</span>
            <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@deped.gov.ph" />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          {error && <div className="alert alert-danger">{error}</div>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  )
}