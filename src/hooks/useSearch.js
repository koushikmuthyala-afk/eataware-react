import { useState, useMemo } from 'react'

export function useSearch(products) {
  const [query, setQuery]       = useState('')
  const [gradeFilter, setGradeFilter] = useState('')   // 'A'|'B'|'C'|'D'|'E'|'F'|''
  const [catFilter, setCatFilter]     = useState('')

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

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort()
    return cats
  }, [products])

  return { query, setQuery, gradeFilter, setGradeFilter, catFilter, setCatFilter, results, categories }
}
