import { useState, useMemo } from 'react'
import { INGREDIENTS, CONCERN_LABELS, ORGAN_ICONS } from '../lib/ingredientData'

export default function Ingredients() {
  const [query, setQuery]           = useState('')
  const [concernFilter, setConcernFilter] = useState('')
  const [selected, setSelected]     = useState(null)

  const filtered = useMemo(() => {
    let list = INGREDIENTS
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.aka.some(a => a.toLowerCase().includes(q)) ||
        i.category.toLowerCase().includes(q)
      )
    }
    if (concernFilter) list = list.filter(i => i.concern === concernFilter)
    return list
  }, [query, concernFilter])

  return (
    <div className="min-h-screen pt-16" style={{ background: 'var(--surface)' }}>
      <div className="px-6 py-10 max-w-6xl mx-auto">

        {/* Header */}
        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--ink)' }}>Ingredient Decoder</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          What does every additive actually do to your body? Plain language, FSSAI-referenced.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search TBHQ, tartrazine, palm oil..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
            />
          </div>
          {['high','caution','safe'].map(c => {
            const info = CONCERN_LABELS[c]
            return (
              <button
                key={c}
                onClick={() => setConcernFilter(concernFilter === c ? '' : c)}
                className="px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all"
                style={{
                  background: concernFilter === c ? info.color : info.bg,
                  color: concernFilter === c ? '#fff' : info.color,
                  borderColor: info.color + '44',
                }}
              >
                {info.emoji} {info.label}
              </button>
            )
          })}
        </div>

        <div className="flex gap-6">
          {/* Left: ingredient list */}
          <div className="w-full md:w-72 flex-shrink-0 space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>
                No ingredients found
              </div>
            ) : filtered.map(ing => {
              const info = CONCERN_LABELS[ing.concern]
              return (
                <button
                  key={ing.id}
                  onClick={() => setSelected(ing)}
                  className="w-full text-left p-3 rounded-2xl border transition-all"
                  style={{
                    background: selected?.id === ing.id ? info.bg : '#fff',
                    borderColor: selected?.id === ing.id ? info.color + '66' : 'var(--border)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{info.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                        {ing.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {ing.category}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right: detail panel */}
          <div className="flex-1 min-w-0">
            {!selected ? (
              <div className="text-center py-20 rounded-3xl border" style={{ borderColor: 'var(--border)', background: '#fff' }}>
                <div className="text-5xl mb-4">🔬</div>
                <div className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>Select an ingredient</div>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>
                  Click any ingredient on the left to see the full health profile
                </div>
              </div>
            ) : (() => {
              const info = CONCERN_LABELS[selected.concern]
              return (
                <div className="rounded-3xl border overflow-hidden" style={{ borderColor: info.color + '33', background: '#fff' }}>
                  {/* Header */}
                  <div className="p-6" style={{ background: info.bg }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3"
                          style={{ background: info.color, color: '#fff' }}>
                          {info.emoji} {info.label}
                        </div>
                        <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--ink)' }}>{selected.name}</h2>
                        <div className="text-sm" style={{ color: 'var(--muted)' }}>
                          {selected.category} · {selected.fssai}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                      {selected.summary}
                    </p>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Also known as */}
                    {selected.aka?.length > 0 && (
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Also known as</div>
                        <div className="flex flex-wrap gap-2">
                          {selected.aka.map(a => (
                            <span key={a} className="px-3 py-1 rounded-full text-xs font-medium"
                              style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>{a}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Organ impact */}
                    {selected.organs?.length > 0 && (
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Organs affected</div>
                        <div className="flex gap-3 flex-wrap">
                          {selected.organs.map(o => (
                            <div key={o} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm"
                              style={{ background: '#f9fafb', border: '1px solid var(--border)' }}>
                              <span>{ORGAN_ICONS[o] || '🫀'}</span>
                              <span className="capitalize font-medium" style={{ color: 'var(--ink)' }}>{o}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Effects */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl" style={{ background: '#fef3c7' }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#92400e' }}>
                          ⚡ Immediate effects
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#78350f' }}>
                          {selected.effects.immediate}
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl" style={{ background: '#fee2e2' }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#991b1b' }}>
                          📅 Long-term concern
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#7f1d1d' }}>
                          {selected.effects.longterm}
                        </p>
                      </div>
                    </div>

                    {/* Found in */}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                        Found in
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selected.found_in.map(f => (
                          <span key={f} className="px-3 py-1 rounded-full text-xs border"
                            style={{ borderColor: 'var(--border)', color: 'var(--ink-soft)' }}>{f}</span>
                        ))}
                      </div>
                    </div>

                    {/* Safer alternative */}
                    {selected.safer && (
                      <div className="p-4 rounded-2xl" style={{ background: 'var(--green-pale)', border: '1px solid var(--green-mid)' }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--green)' }}>
                          ✅ Safer alternative
                        </div>
                        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{selected.safer}</p>
                      </div>
                    )}

                    {/* Source */}
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      📚 Source: {selected.source}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
