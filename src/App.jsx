import { useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useProducts } from './hooks/useProducts'
import { useAuth } from './hooks/useAuth'
import Nav from './components/Nav'
import AuthModal from './components/AuthModal'
import Dashboard from './components/Dashboard'
import './index.css'

// Lazy-load all pages — each becomes a separate JS chunk
// Home loads eagerly (critical path), rest are deferred
import Home from './pages/Home'
const Products    = lazy(() => import('./pages/Products'))
const Ingredients = lazy(() => import('./pages/Ingredients'))
const Learn       = lazy(() => import('./pages/Learn'))
const About       = lazy(() => import('./pages/About'))
const AdminPanel  = lazy(() => import('./pages/AdminPanel'))

function PageLoader() {
  return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
        <div className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
      </div>
    </div>
  )
}

export default function App() {
  const { count } = useProducts()
  const auth = useAuth()
  const [showAuth, setShowAuth]           = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)

  async function handleSignOut() {
    await auth.signOut()
    setShowDashboard(false)
  }

  return (
    <BrowserRouter>
      <Nav
        productCount={count}
        user={auth.user}
        onSignIn={() => setShowAuth(true)}
        onDashboard={() => setShowDashboard(true)}
      />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"            element={<Home auth={auth} onSignIn={() => setShowAuth(true)} />} />
          <Route path="/products"    element={<Products />} />
          <Route path="/ingredients" element={<Ingredients />} />
          <Route path="/learn"       element={<Learn />} />
          <Route path="/about"       element={<About />} />
          <Route path="/admin"       element={<AdminPanel user={auth.user} authLoading={auth.loading} />} />
        </Routes>
      </Suspense>

      {showAuth && !auth.user && (
        <AuthModal onClose={() => setShowAuth(false)} auth={auth} />
      )}
      {showDashboard && auth.user && (
        <Dashboard user={auth.user} onClose={() => setShowDashboard(false)} onSignOut={handleSignOut} />
      )}
    </BrowserRouter>
  )
}
