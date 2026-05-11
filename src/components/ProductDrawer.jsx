import { useEffect } from 'react'
import ScoreCard from './ScoreCard'
import GradeBadge from './GradeBadge'
import { gradeColor } from '../lib/scoringEngine'

export default function ProductDrawer({ product, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = product ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [product])

  if (!product) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideIn 0.3s cubic-bezier(0.4,0,0.2,1)' }}
        aria-label={`Product details: ${product.name}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <GradeBadge grade={product.grade} size="sm" />
            <div className="min-w-0">
              <h2 className="font-bold text-sm leading-tight truncate" style={{ color: 'var(--ink)' }}>
                {product.name}
              </h2>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>
                {product.category || 'General'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 flex-shrink-0 ml-2"
            aria-label="Close product details"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Impact text */}
          {product.impact && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
              {product.impact}
            </p>
          )}

          {/* Score card */}
          <ScoreCard product={product} />

          {/* WhatsApp share */}
          <a
            href={`https://wa.me/?text=Check%20out%20${encodeURIComponent(product.name)}%20on%20EatAware%20%E2%80%94%20Grade%20${product.grade}%20https%3A%2F%2Feataware.in`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold text-white"
            style={{ background: '#25d366' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share on WhatsApp
          </a>
        </div>
      </aside>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
