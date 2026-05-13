import { useEffect } from 'react'

/**
 * Updates the document title and meta description for each page.
 * Called in each page component with page-specific values.
 */
export function useSEO({ title, description }) {
  useEffect(() => {
    const base = 'EatAware'
    document.title = title ? `${title} | ${base}` : `${base} — Know What You Eat`

    if (description) {
      let meta = document.querySelector('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
      }
      meta.content = description

      // Also update OG description
      let ogMeta = document.querySelector('meta[property="og:description"]')
      if (ogMeta) ogMeta.content = description
    }
  }, [title, description])
}
