import { scoreProduct, gradeColor, gradeBg, gradeLabel } from '../lib/scoringEngine'
import GradeBadge from './GradeBadge'

const DOT_COLORS = { 'dot-safe': '#16a34a', 'dot-caution': '#d97706', 'dot-avoid': '#dc2626' }
const CAT_LABELS = { fat:'Fat', colour:'Colour', additive:'Additive', nutrition:'Nutrition', sugar:'Sugar', positive:'Benefit' }

export default function ScoreCard({ product }) {
  const result = scoreProduct(product)
  const { score, displayedGrade, computedGrade, rules, avoidCount, hardCap } = result

  const penalties = rules.filter(r => r.points < 0)
  const bonuses   = rules.filter(r => r.points > 0)

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: gradeColor(displayedGrade) + '33' }}>
      {/* Header */}
      <div className="p-4 flex items-center gap-4" style={{ background: gradeBg(displayedGrade) }}>
        <GradeBadge grade={displayedGrade} size="lg" />
        <div>
          <div className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
            Grade {displayedGrade}
          </div>
          <div className="text-sm" style={{ color: gradeColor(displayedGrade) }}>
            {gradeLabel(displayedGrade)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Score: {score}/100
            {hardCap && <span className="ml-2 font-medium text-red-600">· {hardCap.split('->')[1]?.trim()}</span>}
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="px-4 py-2" style={{ background: '#f9fafb' }}>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${score}%`, background: gradeColor(displayedGrade) }}
          />
        </div>
      </div>

      {/* Ingredients */}
      {product.ings?.length > 0 && (
        <div className="px-4 pb-2">
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
            Ingredients
          </div>
          {product.ings.map((ing, idx) => (
            <div key={idx} className="flex items-start gap-2 py-1.5 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                style={{ background: DOT_COLORS[ing.dot] || '#888' }}
              />
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{ing.name}</div>
                {ing.desc && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{ing.desc}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Score breakdown */}
      {rules.length > 0 && (
        <div className="px-4 pb-4">
          <div className="text-xs font-bold uppercase tracking-wider mb-2 mt-3" style={{ color: 'var(--muted)' }}>
            Score breakdown
          </div>
          <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted)' }}>
            100 (base)
          </div>
          {penalties.map((r, i) => (
            <div key={i} className="flex justify-between text-xs py-0.5">
              <span style={{ color: '#dc2626' }}>{r.label}</span>
              <span className="font-bold text-red-600">{r.points}</span>
            </div>
          ))}
          {bonuses.map((r, i) => (
            <div key={i} className="flex justify-between text-xs py-0.5">
              <span style={{ color: '#16a34a' }}>{r.label}</span>
              <span className="font-bold text-green-600">+{r.points}</span>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold pt-1 border-t mt-1" style={{ borderColor: '#e5e7eb' }}>
            <span>Final score</span>
            <span>{score}/100</span>
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
            Displayed grade ({displayedGrade}) is set by our team. Score is for reference.
          </div>
        </div>
      )}
    </div>
  )
}
