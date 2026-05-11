import { useState } from 'react'
import SearchBar from '../components/SearchBar'
import ProductCard from '../components/ProductCard'
import ProductDrawer from '../components/ProductDrawer'
import { useProducts } from '../hooks/useProducts'
import { useSearch } from '../hooks/useSearch'

const GRADE_COLORS = { A:'#16a34a', B:'#65a30d', C:'#d97706', D:'#dc2626', E:'#7f1d1d', F:'#1c1917' }

export default function Home() {
  const { products, loading, count } = useProducts()
  const { query, setQuery, gradeFilter, setGradeFilter, results, categories } = useSearch(products)
  const [selected, setSelected] = useState(null)
  const [scannerTab, setScannerTab] = useState(null) // 'type' | 'submit' | null

  const hasSearch = query.trim() || gradeFilter
  const displayProducts = hasSearch ? results : []

  return (
    <div className="min-h-screen pt-16" style={{ background: 'var(--surface)' }}>

      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight" style={{ color: 'var(--ink)' }}>
          Know <em className="not-italic" style={{ color: 'var(--green)' }}>exactly</em> what's<br/>inside your food
        </h1>
        <p className="text-lg mb-10" style={{ color: 'var(--muted)' }}>
          Search any packaged product, understand every ingredient,<br className="hidden md:block"/>
          and discover what it does to your body — A to F graded.
        </p>

        {/* Grade strip */}
        <div className="flex justify-center gap-3 mb-10">
          {Object.entries(GRADE_COLORS).map(([g, col]) => (
            <div key={g} className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg text-white" style={{ background: col }}>{g}</div>
              <div className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                {g==='A'?'Best':g==='F'?'Avoid':''}
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <SearchBar
          query={query}
          setQuery={setQuery}
          gradeFilter={gradeFilter}
          setGradeFilter={setGradeFilter}
          onGradeIngredients={() => setScannerTab('type')}
          onSubmitProduct={() => setScannerTab('submit')}
        />
      </section>

      {/* Results */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        {loading && (
          <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
            Loading {count > 0 ? count : ''} products…
          </div>
        )}

        {!loading && hasSearch && (
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
              {results.length} result{results.length !== 1 ? 's' : ''}
              {query && <> for <strong style={{ color: 'var(--ink)' }}>"{query}"</strong></>}
              {gradeFilter && <> · Grade <strong style={{ color: GRADE_COLORS[gradeFilter] }}>{gradeFilter}</strong></>}
            </div>
            <button onClick={() => { setQuery(''); setGradeFilter('') }} className="text-xs underline" style={{ color: 'var(--muted)' }}>
              Clear
            </button>
          </div>
        )}

        {!loading && hasSearch && results.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <div className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>No products found</div>
            <div className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              Can't find it? Submit the product and we'll grade it within 48 hours.
            </div>
            <button
              onClick={() => setScannerTab('submit')}
              className="px-6 py-3 rounded-full font-semibold text-white text-sm"
              style={{ background: 'var(--green)' }}
            >
              ➕ Submit a product
            </button>
          </div>
        )}

        {!loading && !hasSearch && (
          <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
            <p className="text-sm">{count}+ products graded · Search above to explore</p>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {['Maggi', 'Coca-Cola', 'Amul Butter', 'Saffola Oats'].map(s => (
                <button key={s} onClick={() => setQuery(s)}
                  className="py-3 px-4 rounded-2xl border font-medium hover:border-green-500 hover:text-green-700 transition"
                  style={{ borderColor: 'var(--border)', color: 'var(--ink-soft)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayProducts.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {displayProducts.map(p => (
              <ProductCard key={p.slug} product={p} onClick={setSelected} />
            ))}
          </div>
        )}
      </section>

      {/* Stats strip */}
      <section className="py-6 px-6" style={{ background: 'var(--ink)' }}>
        <div className="max-w-3xl mx-auto flex flex-wrap justify-around gap-6 text-center">
          {[
            { val: `${count}+`, lbl: 'Products rated A-F' },
            { val: '120+',       lbl: 'Ingredients decoded' },
            { val: 'FSSAI',      lbl: 'Referenced data' },
            { val: 'Free',       lbl: 'During beta' },
          ].map(({ val, lbl }) => (
            <div key={lbl}>
              <div className="text-2xl font-black text-white">{val}</div>
              <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Drawer */}
      {selected && <ProductDrawer product={selected} onClose={() => setSelected(null)} />}

      {/* TODO: ScannerModal for scannerTab */}
    </div>
  )
}
