import { useState, useMemo } from 'react'
import { useProducts } from '../hooks/useProducts'
import ProductCard from '../components/ProductCard'
import ProductDrawer from '../components/ProductDrawer'
import { gradeColor } from '../lib/scoringEngine'

const GRADES = ['A','B','C','D','E','F']

export default function Products() {
  const { products, loading, count } = useProducts()
  const [selected, setSelected]     = useState(null)
  const [gradeFilter, setGradeFilter] = useState('')
  const [catFilter, setCatFilter]   = useState('')
  const [query, setQuery]           = useState('')
  const [sort, setSort]             = useState('grade') // 'grade'|'name'|'category'

  const categories = useMemo(() =>
    [...new Set(products.map(p => p.category).filter(Boolean))].sort()
  , [products])

  const filtered = useMemo(() => {
    let list = [...products]
    if (query.trim())   list = list.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    if (gradeFilter)    list = list.filter(p => p.grade === gradeFilter)
    if (catFilter)      list = list.filter(p => p.category === catFilter)
    if (sort === 'grade')    list.sort((a,b) => GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade))
    if (sort === 'name')     list.sort((a,b) => a.name.localeCompare(b.name))
    if (sort === 'category') list.sort((a,b) => (a.category||'').localeCompare(b.category||''))
    return list
  }, [products, query, gradeFilter, catFilter, sort])

  const gradeCounts = useMemo(() =>
    products.reduce((acc, p) => { acc[p.grade] = (acc[p.grade]||0)+1; return acc }, {})
  , [products])

  return (
    <div className="min-h-screen pt-16" style={{ background: 'var(--surface)' }}>
      {/* Header */}
      <div className="px-6 py-10 max-w-6xl mx-auto">
        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--ink)' }}>All Products</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          {count} products graded A–F · Click any product to see the full breakdown
        </p>

        {/* Grade summary strip */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {GRADES.map(g => (
            <button
              key={g}
              onClick={() => setGradeFilter(gradeFilter === g ? '' : g)}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all text-sm font-semibold"
              style={{
                background: gradeFilter === g ? gradeColor(g) : '#fff',
                color: gradeFilter === g ? '#fff' : gradeColor(g),
                borderColor: gradeColor(g) + '55',
                opacity: gradeFilter && gradeFilter !== g ? 0.45 : 1,
              }}
            >
              <span className="font-black">{g}</span>
              <span className="text-xs opacity-80">{gradeCounts[g] || 0}</span>
            </button>
          ))}
          {gradeFilter && (
            <button onClick={() => setGradeFilter('')}
              className="px-3 py-2 rounded-2xl border text-xs font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Clear grade
            </button>
          )}
        </div>

        {/* Search + filters row */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
            />
          </div>

          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border text-sm focus:outline-none"
            style={{ borderColor: 'var(--border)', color: catFilter ? 'var(--ink)' : 'var(--muted)' }}
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border text-sm focus:outline-none"
            style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          >
            <option value="grade">Sort: Grade</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="category">Sort: Category</option>
          </select>
        </div>

        {/* Results count */}
        <div className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
          Showing {filtered.length} of {count} products
          {gradeFilter && <span> · Grade <strong style={{ color: gradeColor(gradeFilter) }}>{gradeFilter}</strong></span>}
          {catFilter && <span> · {catFilter}</span>}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-sm" style={{ color: 'var(--muted)' }}>Loading products…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-semibold" style={{ color: 'var(--ink)' }}>No products match</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p => (
              <ProductCard key={p.slug} product={p} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      {selected && <ProductDrawer product={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
