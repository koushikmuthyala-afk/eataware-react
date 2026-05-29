#!/usr/bin/env node
/**
 * Generate sitemap.xml from Supabase products
 * Run: SUPABASE_URL=... SUPABASE_KEY=... node scripts/generate-sitemap.mjs
 * Or: npm run sitemap (add to package.json)
 */

const SITE = 'https://eataware.in'

async function main() {
  const url = process.env.VITE_SUPABASE_URL || 'https://tkmrqsnjcudlkiwmcula.supabase.co'
  const key = process.env.VITE_SUPABASE_ANON_KEY || ''

  if (!key) {
    console.error('Set VITE_SUPABASE_ANON_KEY env var')
    process.exit(1)
  }

  // Fetch all products via REST API
  let allProducts = []
  let offset = 0
  const limit = 1000

  while (true) {
    const res = await fetch(
      `${url}/rest/v1/products?select=slug,category&status=eq.published&order=slug&offset=${offset}&limit=${limit}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    const data = await res.json()
    if (!data.length) break
    allProducts = allProducts.concat(data)
    offset += limit
    if (data.length < limit) break
  }

  console.log(`Fetched ${allProducts.length} products`)

  const today = new Date().toISOString().split('T')[0]
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))]

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

  // Static pages
  const staticPages = [
    { url: '/', priority: '1.0', freq: 'daily' },
    { url: '/products', priority: '0.9', freq: 'daily' },
    { url: '/ingredients', priority: '0.8', freq: 'weekly' },
    { url: '/learn', priority: '0.7', freq: 'weekly' },
    { url: '/about', priority: '0.6', freq: 'monthly' },
  ]

  for (const pg of staticPages) {
    xml += `  <url>\n    <loc>${SITE}${pg.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${pg.freq}</changefreq>\n    <priority>${pg.priority}</priority>\n  </url>\n`
  }

  // Category pages
  for (const cat of categories) {
    xml += `  <url>\n    <loc>${SITE}/products?category=${encodeURIComponent(cat)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`
  }

  // Product pages
  for (const p of allProducts) {
    xml += `  <url>\n    <loc>${SITE}/product/${p.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`
  }

  xml += `</urlset>`

  // Write to public/sitemap.xml
  const { writeFileSync } = await import('fs')
  writeFileSync('public/sitemap.xml', xml)
  console.log(`✅ sitemap.xml: ${allProducts.length} products + ${categories.length} categories + ${staticPages.length} static pages`)
}

main().catch(console.error)
