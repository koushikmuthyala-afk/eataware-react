import { useState } from 'react'
import SearchBar from '../components/SearchBar'
import ProductCard from '../components/ProductCard'
import ProductDrawer from '../components/ProductDrawer'
import ScannerModal from '../components/ScannerModal'
import { useProducts } from '../hooks/useProducts'
import { useSearch } from '../hooks/useSearch'
import { supabase } from '../lib/supabase'

const GRADE_COLORS = { A:'#16a34a', B:'#65a30d', C:'#d97706', D:'#dc2626', E:'#7f1d1d', F:'#1c1917' }

export default function Home({ auth, onSignIn }) {
  const { products, loading, count } = useProducts()
  const { query, setQuery, gradeFilter, setGradeFilter, results } = useSearch(products)
  const [selected, setSelected]     = useState(null)
  const [scannerTab, setScannerTab] = useState(null) // 'barcode'|'grade'|'submit'|null

  const hasSearch     = query.trim() || gradeFilter
  const displayList   = hasSearch ? results : []

  // Log intake when product is opened
  async function openProduct(product) {
    setSelected(product)
    if (auth?.user) {
      await supabase.from('user_intakes').insert([{
        user_id:      auth.user.id,
        product_name: product.name,
        grade:        product.grade,
        slug:         product.slug,
      }]).then(({ error }) => { if (error) console.warn('Intake log:', error.message) })
    }
  }

  return (
    <div className="min-h-screen pt-16" style={{ background: 'var(--surface)' }}>

      {/* Hero */}
      <section className="px-6 py-16 md:py-24 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>
          🇮🇳 India's Ingredient Intelligence Platform · Free during beta
        </div>

        <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight" style={{ color: 'var(--ink)' }}>
          Know <em className="not-italic" style={{ color: 'var(--green)' }}>exactly</em> what's<br/>inside your food
        </h1>
        <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: 'var(--muted)' }}>
          Search any packaged product, understand every ingredient,
          and discover what it does to your body — A–F graded.
        </p>

        {/* Grade showcase */}
        <div className="flex justify-center gap-2 md:gap-3 mb-10">
          {Object.entries(GRADE_COLORS).map(([g, col]) => (
            <div key={g} className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center font-black text-lg md:text-xl text-white shadow-sm"
                style={{ background: col }}>{g}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <SearchBar
          query={query}
          setQuery={setQuery}
          gradeFilter={gradeFilter}
          setGradeFilter={setGradeFilter}
          onGradeIngredients={() => setScannerTab('grade')}
          onSubmitProduct={() => setScannerTab('submit')}
        />
      </section>

      {/* Results */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">

        {loading && (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>
            Loading {count > 0 ? count : ''}+ products…
          </div>
        )}

        {!loading && hasSearch && (
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              {results.length} result{results.length !== 1 ? 's' : ''}
              {query && <> for <strong style={{ color: 'var(--ink)' }}>"{query}"</strong></>}
              {gradeFilter && <> · Grade <strong style={{ color: GRADE_COLORS[gradeFilter] }}>{gradeFilter}</strong></>}
            </div>
            <button onClick={() => { setQuery(''); setGradeFilter('') }}
              className="text-xs underline" style={{ color: 'var(--muted)' }}>
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
            <button onClick={() => setScannerTab('submit')}
              className="px-6 py-3 rounded-full font-semibold text-white text-sm"
              style={{ background: 'var(--green)' }}>
              ➕ Submit a product
            </button>
          </div>
        )}

        {!loading && !hasSearch && (
          <div className="text-center py-8">
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              {count}+ products graded · Search above or try these popular ones
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Maggi','Coca-Cola','Amul Butter','Saffola Oats'].map(s => (
                <button key={s} onClick={() => setQuery(s)}
                  className="py-3 px-4 rounded-2xl border font-medium text-sm hover:border-green-500 hover:text-green-700 transition"
                  style={{ borderColor: 'var(--border)', color: 'var(--ink-soft)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayList.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {displayList.map(p => (
              <ProductCard key={p.slug} product={p} onClick={openProduct} />
            ))}
          </div>
        )}
      </section>

      {/* Stats strip */}
      <section className="py-8 px-6" style={{ background: 'var(--ink)' }}>
        <div className="max-w-3xl mx-auto flex flex-wrap justify-around gap-6 text-center">
          {[
            { val: `${count || '500'}+`, lbl: 'Products rated A–F'       },
            { val: '120+',               lbl: 'Ingredients decoded'       },
            { val: 'FSSAI',              lbl: 'FSSAI-referenced data'     },
            { val: 'Free',               lbl: 'Free to use during beta'   },
          ].map(({ val, lbl }) => (
            <div key={lbl}>
              <div className="text-2xl font-black text-white">{val}</div>
              <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Modals */}
      {selected && (
        <ProductDrawer product={selected} onClose={() => setSelected(null)} />
      )}
      {scannerTab && (
        <ScannerModal
          initialTab={scannerTab}
          onClose={() => setScannerTab(null)}
        />
      )}
    </div>
  )
}
