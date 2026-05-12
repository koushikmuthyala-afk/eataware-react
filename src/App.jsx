import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useProducts } from './hooks/useProducts'
import { useAuth } from './hooks/useAuth'
import Nav from './components/Nav'
import Home from './pages/Home'
import AuthModal from './components/AuthModal'
import Dashboard from './components/Dashboard'
import './index.css'

const ComingSoon = ({ name }) => (
  <div className="min-h-screen pt-24 flex items-center justify-center">
    <div className="text-center">
      <div className="text-5xl mb-4">🚧</div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>{name}</h2>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>Coming next session</p>
    </div>
  </div>
)

export default function App() {
  const { count } = useProducts()
  const auth = useAuth()
  const [showAuth, setShowAuth]         = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)

  function handleSignIn() { setShowAuth(true) }
  function handleDashboard() { setShowDashboard(true) }
  async function handleSignOut() {
    await auth.signOut()
    setShowDashboard(false)
  }

  return (
    <BrowserRouter>
      <Nav
        productCount={count}
        user={auth.user}
        onSignIn={handleSignIn}
        onDashboard={handleDashboard}
      />

      <Routes>
        <Route path="/"            element={<Home auth={auth} onSignIn={handleSignIn} />} />
        <Route path="/ingredients" element={<ComingSoon name="Ingredient Decoder" />} />
        <Route path="/products"    element={<ComingSoon name="All Products" />} />
        <Route path="/learn"       element={<ComingSoon name="Learn" />} />
        <Route path="/about"       element={<ComingSoon name="About EatAware" />} />
        <Route path="/admin"       element={<ComingSoon name="Admin Panel" />} />
      </Routes>

      {showAuth && !auth.user && (
        <AuthModal onClose={() => setShowAuth(false)} auth={auth} />
      )}

      {showDashboard && auth.user && (
        <Dashboard
          user={auth.user}
          onClose={() => setShowDashboard(false)}
          onSignOut={handleSignOut}
        />
      )}
    </BrowserRouter>
  )
}
