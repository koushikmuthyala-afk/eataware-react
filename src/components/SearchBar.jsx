const GRADES = ['A','B','C','D','E','F']
const GRADE_COLORS = { A:'#16a34a', B:'#65a30d', C:'#d97706', D:'#dc2626', E:'#7f1d1d', F:'#1c1917' }

const QUICK_TAGS = [
  'Maggi', 'Lay\'s', 'Amul', 'Parle', 'Nestlé',
  'Bournvita', 'Kurkure', 'Oats', 'Coca-Cola', 'Britannia'
]

export default function SearchBar({ query, setQuery, gradeFilter, setGradeFilter, onGradeIngredients, onSubmitProduct }) {
  return (
    <div className="bg-white rounded-3xl border p-5 shadow-sm" style={{ borderColor: 'var(--border)' }}>
      {/* Search input */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          id="searchInput"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search any product or ingredient..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 transition"
          style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
          aria-label="Search products and ingredients"
        />
      </div>

      {/* Grade filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {GRADES.map(g => (
          <button
            key={g}
            onClick={() => setGradeFilter(gradeFilter === g ? '' : g)}
            className="w-8 h-8 rounded-lg text-sm font-black text-white transition-all"
            style={{
              background: GRADE_COLORS[g],
              opacity: gradeFilter && gradeFilter !== g ? 0.35 : 1,
              transform: gradeFilter === g ? 'scale(1.15)' : 'scale(1)',
            }}
            aria-label={`Filter by Grade ${g}`}
            aria-pressed={gradeFilter === g}
          >
            {g}
          </button>
        ))}
        {gradeFilter && (
          <button
            onClick={() => setGradeFilter('')}
            className="px-3 h-8 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Quick search tags */}
      <div className="flex gap-2 flex-wrap mb-4">
        {QUICK_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => setQuery(tag)}
            className="px-3 py-1 rounded-full text-xs font-medium border transition hover:border-green-600 hover:text-green-700"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Phase 4 action buttons */}
      <div className="flex gap-2 flex-wrap pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={onGradeIngredients}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition hover:bg-green-50"
          style={{ borderColor: 'var(--green-mid)', color: 'var(--green)' }}
        >
          ✏️ Grade ingredients
        </button>
        <button
          onClick={onSubmitProduct}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition hover:bg-green-50"
          style={{ borderColor: 'var(--green-mid)', color: 'var(--green)' }}
        >
          ➕ Submit a product
        </button>
      </div>
    </div>
  )
}
