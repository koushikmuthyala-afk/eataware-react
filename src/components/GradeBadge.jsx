import { gradeColor, gradeBg, gradeLabel } from '../lib/scoringEngine'

export default function GradeBadge({ grade, size = 'md', showLabel = false }) {
  const sizes = {
    sm:  'w-7 h-7 text-sm rounded-lg',
    md:  'w-10 h-10 text-xl rounded-xl',
    lg:  'w-14 h-14 text-3xl rounded-2xl',
    xl:  'w-20 h-20 text-5xl rounded-3xl',
  }
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizes[size]} flex items-center justify-center font-black text-white flex-shrink-0`}
        style={{ background: gradeColor(grade) }}
        aria-label={`Grade ${grade}`}
      >
        {grade}
      </div>
      {showLabel && (
        <div className="text-sm" style={{ color: gradeColor(grade) }}>
          {gradeLabel(grade)}
        </div>
      )}
    </div>
  )
}
