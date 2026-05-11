import GradeBadge from './GradeBadge'
import { gradeColor, gradeBg } from '../lib/scoringEngine'

export default function ProductCard({ product, onClick }) {
  const avoidCount = (product.ings || []).filter(i => i.dot === 'dot-avoid').length

  return (
    <button
      onClick={() => onClick(product)}
      className="w-full text-left p-4 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        background: gradeBg(product.grade),
        borderColor: gradeColor(product.grade) + '33',
      }}
      aria-label={`View ${product.name}, Grade ${product.grade}`}
    >
      <div className="flex items-center gap-3">
        <GradeBadge grade={product.grade} size="md" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>
            {product.name}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {product.category || 'General'}
            {avoidCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                {avoidCount} concern{avoidCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
