import { supabase } from './supabase'

// Track product search queries
export async function trackSearch(query, resultCount, productSlug) {
  try {
    await supabase.from('search_analytics').insert([{
      query: query.trim().toLowerCase(),
      result_count: resultCount || 0,
      product_slug: productSlug || null,
    }])
  } catch (e) {
    // Silent fail — analytics should never break UX
  }
}

// Track product page views
export async function trackPageView(page, productSlug) {
  try {
    await supabase.from('page_views').insert([{
      page,
      product_slug: productSlug || null,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent || null,
    }])
  } catch (e) {
    // Silent fail
  }
}

// Get top searched terms (admin use)
export async function getTopSearches(days = 7, limit = 20) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data } = await supabase
    .from('search_analytics')
    .select('query')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (!data) return []
  // Count frequency
  const freq = {}
  data.forEach(r => { freq[r.query] = (freq[r.query] || 0) + 1 })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([query, count]) => ({ query, count }))
}

// Get most viewed products (admin use)
export async function getTopProducts(days = 7, limit = 20) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data } = await supabase
    .from('page_views')
    .select('product_slug')
    .not('product_slug', 'is', null)
    .gte('created_at', since)
    .limit(1000)

  if (!data) return []
  const freq = {}
  data.forEach(r => { if (r.product_slug) freq[r.product_slug] = (freq[r.product_slug] || 0) + 1 })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug, count]) => ({ slug, count }))
}
