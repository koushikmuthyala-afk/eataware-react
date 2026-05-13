import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useProducts } from './hooks/useProducts'
import { useAuth } from './hooks/useAuth'
import Nav from './components/Nav'
import Home from './pages/Home'
import Products from './pages/Products'
import Ingredients from './pages/Ingredients'
import AdminPanel from './pages/AdminPanel'
import About from './pages/About'
import Learn from './pages/Learn'
import AuthModal from './components/AuthModal'
import Dashboard from './components/Dashboard'
import './index.css'

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

      <Routes>
        <Route path="/"            element={<Home auth={auth} onSignIn={() => setShowAuth(true)} />} />
        <Route path="/products"    element={<Products />} />
        <Route path="/ingredients" element={<Ingredients />} />
        <Route path="/learn"       element={<Learn />} />
        <Route path="/about"       element={<About />} />
        <Route path="/admin"       element={<AdminPanel user={auth.user} />} />
      </Routes>

      {showAuth && !auth.user && (
        <AuthModal onClose={() => setShowAuth(false)} auth={auth} />
      )}
      {showDashboard && auth.user && (
        <Dashboard user={auth.user} onClose={() => setShowDashboard(false)} onSignOut={handleSignOut} />
      )}
    </BrowserRouter>
  )
}
