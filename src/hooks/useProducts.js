import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProducts() {
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('slug,name,grade,category,impact,ings,nutri')
          .eq('status', 'published')
          .limit(2000)
        if (error) throw error
        setProducts(data || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { products, loading, error, count: products.length }
}
