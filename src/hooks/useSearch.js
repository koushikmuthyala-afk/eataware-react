import { useState, useMemo, useEffect, useRef } from 'react'
import { trackSearch } from '../lib/analytics'

export function useSearch(products) {
  const [query, setQuery]       = useState('')
  const [gradeFilter, setGradeFilter] = useState('')   // 'A'|'B'|'C'|'D'|'E'|'F'|''
  const [catFilter, setCatFilter]     = useState('')
  const trackTimer = useRef(null)

  const results = useMemo(() => {
    if (!products.length) return []
    let filtered = products

    if (query.trim()) {
      const q = query.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.category||'').toLowerCase().includes(q) ||
        (p.ings||[]).some(i => i.name.toLowerCase().includes(q))
      )
    }
    if (gradeFilter) filtered = filtered.filter(p => p.grade === gradeFilter)
    if (catFilter)   filtered = filtered.filter(p => p.category === catFilter)

    return filtered
  }, [products, query, gradeFilter, catFilter])

  // Track search analytics (debounced 1.5s after typing stops)
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) return
    if (trackTimer.current) clearTimeout(trackTimer.current)
    trackTimer.current = setTimeout(() => {
      trackSearch(query, results.length, results[0]?.slug)
    }, 1500)
    return () => { if (trackTimer.current) clearTimeout(trackTimer.current) }
  }, [query, results])

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort()
    return cats
  }, [products])

  return { query, setQuery, gradeFilter, setGradeFilter, catFilter, setCatFilter, results, categories }
}
