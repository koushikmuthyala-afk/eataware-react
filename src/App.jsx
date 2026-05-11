import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useProducts } from './hooks/useProducts'
import Nav from './components/Nav'
import Home from './pages/Home'
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
  return (
    <BrowserRouter>
      <Nav productCount={count} />
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/ingredients" element={<ComingSoon name="Ingredient Decoder" />} />
        <Route path="/products"    element={<ComingSoon name="All Products" />} />
        <Route path="/learn"       element={<ComingSoon name="Learn" />} />
        <Route path="/about"       element={<ComingSoon name="About EatAware" />} />
        <Route path="/admin"       element={<ComingSoon name="Admin Panel" />} />
      </Routes>
    </BrowserRouter>
  )
}
