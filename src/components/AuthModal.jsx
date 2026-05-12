import { useState, useEffect } from 'react'

export default function AuthModal({ onClose, auth }) {
  const [tab, setTab]         = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (tab === 'login') {
        const { error } = await auth.signIn(email, password)
        if (error) throw error
        onClose()
      } else {
        const { error } = await auth.signUp(email, password)
        if (error) throw error
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setTab('login')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px] bg-white z-50 rounded-3xl shadow-2xl overflow-hidden"
        role="dialog" aria-modal="true" aria-label="Sign in to EatAware"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="text-3xl mb-2">🌿</div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
            {tab === 'login' ? 'Sign in to EatAware' : 'Create your account'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {tab === 'login' ? 'Track your intake and get personalised grades' : 'Free forever · No credit card required'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex mx-6 mb-5 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {['login','signup'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setSuccess('') }}
              className="flex-1 py-2.5 text-sm font-semibold transition-colors"
              style={{
                background: tab === t ? 'var(--green)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--muted)',
              }}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4">
              {success}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-2xl border text-sm mb-3 focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
          />

          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            minLength={6}
            className="w-full px-4 py-3 rounded-2xl border text-sm mb-5 focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: 'var(--green)' }}
          >
            {loading ? '…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <p className="text-xs text-center mt-3" style={{ color: 'var(--muted)' }}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => setTab(tab === 'login' ? 'signup' : 'login')} className="underline font-semibold" style={{ color: 'var(--green)' }}>
              {tab === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </>
  )
}
