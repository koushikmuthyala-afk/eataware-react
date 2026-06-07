import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProducts() {
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [count, setCount]         = useState(0)

  useEffect(() => {
    async function load() {
      try {
        // Get exact count (fast, no data transfer)
        const { count: totalCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published')
        setCount(totalCount || 0)

        // Fetch product data in pages (Supabase max per request is 1000)
        let allData = []
        let page = 0
        while (true) {
          const { data, error } = await supabase
            .from('products')
            .select('slug,name,brand,grade,category,impact,ings')
            .eq('status', 'published')
            .order('name')
            .range(page * 1000, (page + 1) * 1000 - 1)
          if (error) throw error
          if (!data || data.length === 0) break
          allData = allData.concat(data)
          page++
          if (data.length < 1000) break
        }
        setProducts(allData)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { products, loading, error, count }
}
