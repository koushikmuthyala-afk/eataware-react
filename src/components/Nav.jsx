import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Nav({ productCount }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-b flex items-center px-6 h-16"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <Link to="/" className="font-black text-xl mr-8" style={{ color: 'var(--green)', fontFamily: 'Inter, sans-serif' }}>
        Eat<span style={{ color: 'var(--amber)' }}>Aware</span>
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-6 flex-1">
        <Link to="/ingredients" className="text-sm font-medium hover:text-green-700" style={{ color: 'var(--ink-soft)' }}>Ingredients</Link>
        <Link to="/products"    className="text-sm font-medium hover:text-green-700" style={{ color: 'var(--ink-soft)' }}>Products</Link>
        <Link to="/learn"       className="text-sm font-medium hover:text-green-700" style={{ color: 'var(--ink-soft)' }}>Learn</Link>
        <Link to="/about"       className="text-sm font-medium hover:text-green-700" style={{ color: 'var(--ink-soft)' }}>About</Link>
      </div>

      {/* Right: product count + CTA */}
      <div className="hidden md:flex items-center gap-3 ml-auto">
        {productCount > 0 && (
          <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>
            {productCount}+ products
          </span>
        )}
        <Link
          to="/"
          className="px-4 py-2 rounded-full text-sm font-bold text-white"
          style={{ background: 'var(--green)' }}
        >
          Search a Product
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden ml-auto p-2 rounded-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {mobileOpen
            ? <path d="M18 6L6 18M6 6l12 12"/>
            : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
          }
        </svg>
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b shadow-lg p-4 flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
          {['Ingredients','Products','Learn','About'].map(item => (
            <Link key={item} to={`/${item.toLowerCase()}`} className="text-sm font-medium py-1" style={{ color: 'var(--ink)' }} onClick={() => setMobileOpen(false)}>
              {item}
            </Link>
          ))}
          <Link to="/" className="px-4 py-2 rounded-full text-sm font-bold text-white text-center mt-2" style={{ background: 'var(--green)' }} onClick={() => setMobileOpen(false)}>
            Search a Product
          </Link>
        </div>
      )}
    </nav>
  )
}
