import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { gradeColor, gradeBg } from '../lib/scoringEngine'

const GRADE_ADVICE = {
  A: 'Excellent choices — keep it up!',
  B: 'Good overall — mostly clean eating.',
  C: 'Some concerns — reduce processed foods.',
  D: 'High concern — try healthier alternatives.',
  E: 'Very concerning — frequent consumption is risky.',
  F: 'Avoid these as routine foods.',
}

export default function Dashboard({ user, onClose, onSignOut }) {
  const [intakes, setIntakes]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('history')

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!user) return
    loadIntakes()
  }, [user])

  async function loadIntakes() {
    setLoading(true)
    const { data } = await supabase
      .from('user_intakes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setIntakes(data || [])
    setLoading(false)
  }

  // Grade distribution for My Report
  const gradeCounts = intakes.reduce((acc, item) => {
    acc[item.grade] = (acc[item.grade] || 0) + 1
    return acc
  }, {})
  const totalIntakes = intakes.length
  const dominantGrade = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
        style={{ animation: 'slideIn 0.3s cubic-bezier(0.4,0,0.2,1)' }}
        role="dialog" aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--ink)' }}>My Dashboard</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSignOut}
              className="text-xs px-3 py-1.5 rounded-full border font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              Sign out
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          {[['history', 'History'], ['report', 'My Report']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 py-3 text-xs font-semibold"
              style={{
                color: activeTab === id ? 'var(--green)' : 'var(--muted)',
                borderBottom: activeTab === id ? '2px solid var(--green)' : '2px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
          ) : intakes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <div className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>No history yet</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                Search for a product and open it to start tracking your intake.
              </div>
            </div>
          ) : activeTab === 'history' ? (
            <div className="space-y-2">
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                {totalIntakes} product{totalIntakes !== 1 ? 's' : ''} viewed
              </p>
              {intakes.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-2xl border"
                  style={{ borderColor: 'var(--border)', background: gradeBg(item.grade) }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                    style={{ background: gradeColor(item.grade) }}
                  >
                    {item.grade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{item.product_name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* My Report */
            <div>
              {dominantGrade && (
                <div className="rounded-2xl p-4 mb-5 text-center" style={{ background: gradeBg(dominantGrade) }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                    Your eating pattern
                  </div>
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl font-black text-white mx-auto mb-2"
                    style={{ background: gradeColor(dominantGrade) }}
                  >
                    {dominantGrade}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: gradeColor(dominantGrade) }}>
                    {GRADE_ADVICE[dominantGrade]}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    Based on {totalIntakes} products viewed
                  </div>
                </div>
              )}

              {/* Grade breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
                  Grade breakdown
                </div>
                {['A','B','C','D','E','F'].map(g => {
                  const count = gradeCounts[g] || 0
                  const pct = totalIntakes > 0 ? Math.round(count / totalIntakes * 100) : 0
                  return (
                    <div key={g} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                        style={{ background: gradeColor(g) }}>
                        {g}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: gradeColor(g) }} />
                        </div>
                      </div>
                      <div className="text-xs font-medium w-10 text-right" style={{ color: 'var(--muted)' }}>
                        {count} ({pct}%)
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 p-4 rounded-2xl" style={{ background: 'var(--green-pale)' }}>
                <div className="text-xs font-bold" style={{ color: 'var(--green)' }}>
                  💡 EatAware Tip
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                  Aim for 80% of your diet from Grade A and B products. Even occasional C and D foods are fine — it's the daily patterns that matter.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  )
}
