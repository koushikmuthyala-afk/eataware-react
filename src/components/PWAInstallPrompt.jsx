import { useState, useEffect } from 'react'

/**
 * Shows a tasteful "Install App" banner when the browser fires
 * the beforeinstallprompt event (Chrome/Android).
 * iOS users see a manual instruction instead.
 */
export default function PWAInstallPrompt() {
  const [prompt, setPrompt]     = useState(null)   // deferred install event
  const [show, setShow]         = useState(false)
  const [isIOS, setIsIOS]       = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('pwa-dismissed')) return

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    if (ios) {
      // Show iOS instruction after 30s
      const t = setTimeout(() => setShow(true), 30000)
      return () => clearTimeout(t)
    }

    // Android/Chrome: capture the install prompt
    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      setTimeout(() => setShow(true), 5000) // Show after 5s delay
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setShow(false)
    setDismissed(true)
    localStorage.setItem('pwa-dismissed', '1')
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    setShow(false)
    setPrompt(null)
    if (outcome === 'accepted') localStorage.setItem('pwa-installed', '1')
  }

  if (!show || dismissed) return null

  return (
    <div
      className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 rounded-3xl shadow-xl p-4"
      style={{ background: 'var(--ink)', color: '#fff' }}
      role="dialog"
      aria-label="Install EatAware app"
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-full opacity-60 hover:opacity-100"
        aria-label="Dismiss"
        style={{ color: '#fff' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0"
          style={{ background: 'var(--green)' }}>
          🌿
        </div>
        <div>
          <div className="font-bold text-sm">Install EatAware</div>
          <div className="text-xs opacity-70">Works offline · No app store needed</div>
        </div>
      </div>

      {isIOS ? (
        <div className="text-xs opacity-80 leading-relaxed">
          Tap the <strong>Share</strong> button in Safari, then <strong>"Add to Home Screen"</strong> to install.
        </div>
      ) : (
        <button
          onClick={install}
          className="w-full py-2.5 rounded-2xl text-sm font-bold mt-1"
          style={{ background: 'var(--green)', color: '#fff' }}
        >
          Add to Home Screen →
        </button>
      )}
    </div>
  )
}
