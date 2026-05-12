import { useState, useEffect, useRef } from 'react'
import { quickScore, RISK_LABELS } from '../lib/quickScore'
import GradeBadge from './GradeBadge'
import { gradeColor, gradeBg, gradeLabel } from '../lib/scoringEngine'
import { supabase } from '../lib/supabase'

const TABS = [
  { id: 'barcode',  label: '📷 Barcode'           },
  { id: 'grade',    label: '✏️ Grade Ingredients'  },
  { id: 'submit',   label: '➕ Submit Product'      },
]

const SAMPLES = [
  { name: 'Maggi 2-Minute Noodles',    ings: 'Refined Wheat Flour (Maida), Palmolein (TBHQ as antioxidant), Salt, Wheat Gluten, Spices (0.5%), Acidity Regulators, Tartrazine (INS 102)' },
  { name: "Lay's Classic Salted",       ings: 'Potatoes, Vegetable Oil (Sunflower), Salt, Sugar, Starch, Acidity Regulator (330), Nature Identical Flavouring Substance (Tomato)' },
  { name: 'Saffola Oats',              ings: 'Rolled Oats (100%)' },
  { name: 'Britannia NutriChoice',     ings: 'Whole Wheat Flour, Sugar, Vegetable Fat, Oats (5%), Honey (2%), Dextrose, Salt, Raising Agents' },
]

export default function ScannerModal({ initialTab = 'grade', onClose }) {
  const [tab, setTab]         = useState(initialTab)
  const [barcode, setBarcode] = useState('')
  const [barcodeResult, setBarcodeResult] = useState(null)
  const [barcodeLoading, setBarcodeLoading] = useState(false)

  const [ingText, setIngText]     = useState('')
  const [ingName, setIngName]     = useState('')
  const [gradeResult, setGradeResult] = useState(null)

  const [subName, setSubName]     = useState('')
  const [subBrand, setSubBrand]   = useState('')
  const [subIngs, setSubIngs]     = useState('')
  const [subEmail, setSubEmail]   = useState('')
  const [subLoading, setSubLoading] = useState(false)
  const [subDone, setSubDone]     = useState(false)
  const [subError, setSubError]   = useState('')
  const [subPreview, setSubPreview] = useState(null)

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Live preview in submit tab
  useEffect(() => {
    if (subIngs.trim().length > 20) {
      setSubPreview(quickScore(subIngs))
    } else {
      setSubPreview(null)
    }
  }, [subIngs])

  // Barcode lookup via Open Food Facts
  async function lookupBarcode() {
    const code = barcode.trim()
    if (!code) return
    setBarcodeLoading(true)
    setBarcodeResult(null)
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const data = await res.json()
      if (data.status === 1 && data.product) {
        const p = data.product
        const ings = p.ingredients_text_en || p.ingredients_text || ''
        setBarcodeResult({
          found: true,
          name: p.product_name || 'Unknown Product',
          brand: p.brands || '',
          ings,
          image: p.image_front_small_url || '',
          score: ings ? quickScore(ings) : null,
        })
      } else {
        setBarcodeResult({ found: false, code })
      }
    } catch {
      setBarcodeResult({ found: false, error: true })
    } finally {
      setBarcodeLoading(false)
    }
  }

  function runGrade() {
    if (!ingText.trim()) return
    setGradeResult(quickScore(ingText))
    // Pre-fill submit tab
    if (ingName) setSubName(ingName)
    setSubIngs(ingText)
  }

  async function submitProduct() {
    if (!subName.trim()) { setSubError('Please enter the product name.'); return }
    if (!subIngs.trim()) { setSubError('Please paste the ingredient list.'); return }
    setSubError('')
    setSubLoading(true)
    const preview = quickScore(subIngs)
    try {
      const { error } = await supabase.from('submissions').insert([{
        product_name:    subName.trim(),
        brand:           subBrand.trim(),
        ingredients:     subIngs.trim(),
        submitter_email: subEmail.trim(),
        predicted_grade: preview.grade,
        predicted_score: preview.score,
        status:          'pending',
      }])
      if (error) throw error
      setSubDone(true)
    } catch (e) {
      setSubError('Submission failed: ' + e.message)
    } finally {
      setSubLoading(false)
    }
  }

  function resetSubmit() {
    setSubName(''); setSubBrand(''); setSubIngs(''); setSubEmail('')
    setSubPreview(null); setSubDone(false); setSubError('')
  }

  // Pre-fill submit from barcode result
  function prefillFromBarcode() {
    if (!barcodeResult?.found) return
    setSubName(barcodeResult.name)
    setSubBrand(barcodeResult.brand)
    setSubIngs(barcodeResult.ings)
    setTab('submit')
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[520px] bg-white z-50 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        role="dialog" aria-modal="true" aria-label="Product scanner"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--ink)' }}>
            {tab === 'barcode' ? '📷 Scan a Barcode' : tab === 'grade' ? '✏️ Grade Ingredients' : '➕ Submit a Product'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-3 text-xs font-semibold transition-colors"
              style={{
                color: tab === t.id ? 'var(--green)' : 'var(--muted)',
                borderBottom: tab === t.id ? '2px solid var(--green)' : '2px solid transparent',
                background: 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── BARCODE TAB ── */}
          {tab === 'barcode' && (
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                Enter a barcode number to look up the product on Open Food Facts.
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && lookupBarcode()}
                  placeholder="e.g. 8901058852336"
                  className="flex-1 px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
                  aria-label="Barcode number"
                />
                <button
                  onClick={lookupBarcode}
                  disabled={barcodeLoading}
                  className="px-5 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--green)' }}
                >
                  {barcodeLoading ? '...' : 'Lookup'}
                </button>
              </div>

              {barcodeResult && (
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                  {barcodeResult.found ? (
                    <>
                      <div className="flex gap-3 mb-3">
                        {barcodeResult.image && (
                          <img src={barcodeResult.image} alt="" className="w-16 h-16 object-contain rounded-xl border" style={{ borderColor: 'var(--border)' }} />
                        )}
                        <div>
                          <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{barcodeResult.name}</div>
                          {barcodeResult.brand && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{barcodeResult.brand}</div>}
                          {barcodeResult.score && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black text-white"
                                style={{ background: gradeColor(barcodeResult.score.grade) }}>
                                {barcodeResult.score.grade}
                              </div>
                              <span className="text-xs" style={{ color: gradeColor(barcodeResult.score.grade) }}>
                                {gradeLabel(barcodeResult.score.grade)} · {barcodeResult.score.score}/100
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {barcodeResult.ings && (
                        <div className="text-xs p-3 rounded-xl mb-3" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
                          <strong>Ingredients:</strong> {barcodeResult.ings.substring(0, 200)}{barcodeResult.ings.length > 200 ? '…' : ''}
                        </div>
                      )}
                      <button
                        onClick={prefillFromBarcode}
                        className="w-full py-2.5 rounded-2xl text-sm font-semibold border"
                        style={{ borderColor: 'var(--green)', color: 'var(--green)' }}
                      >
                        ➕ Submit to EatAware for grading
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-3xl mb-2">🔍</div>
                      <div className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>Barcode not found</div>
                      <div className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                        Not in Open Food Facts. {barcodeResult.error ? 'Check your connection.' : 'Try the Submit tab.'}
                      </div>
                      <button onClick={() => setTab('submit')} className="text-xs font-semibold underline" style={{ color: 'var(--green)' }}>
                        Submit it manually →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── GRADE INGREDIENTS TAB ── */}
          {tab === 'grade' && (
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                Paste the ingredient list from the back of any pack for an instant A–F grade.
              </p>

              {/* Sample chips */}
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Try a sample</div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLES.map(s => (
                    <button
                      key={s.name}
                      onClick={() => { setIngName(s.name); setIngText(s.ings); setGradeResult(null) }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition hover:border-green-600 hover:text-green-700"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    >
                      {s.name.split(' ').slice(0, 2).join(' ')}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
                Product name (optional)
              </label>
              <input
                value={ingName}
                onChange={e => setIngName(e.target.value)}
                placeholder="e.g. Maggi 2-Minute Noodles"
                className="w-full px-4 py-3 rounded-2xl border text-sm mb-3 focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
              />

              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
                Ingredient list *
              </label>
              <textarea
                value={ingText}
                onChange={e => { setIngText(e.target.value); setGradeResult(null) }}
                rows={5}
                placeholder="Refined Wheat Flour (Maida), Palmolein (TBHQ as antioxidant), Salt, Spices..."
                className="w-full px-4 py-3 rounded-2xl border text-sm resize-none mb-4 focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
              />

              <button
                onClick={runGrade}
                disabled={!ingText.trim()}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40 mb-4"
                style={{ background: 'var(--green)' }}
              >
                Analyse Ingredients →
              </button>

              {/* Grade result */}
              {gradeResult && (
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: gradeColor(gradeResult.grade) + '44' }}>
                  {/* Grade header */}
                  <div className="p-4 flex items-center gap-4" style={{ background: gradeBg(gradeResult.grade) }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0"
                      style={{ background: gradeColor(gradeResult.grade) }}>
                      {gradeResult.grade}
                    </div>
                    <div>
                      <div className="font-bold text-base" style={{ color: 'var(--ink)' }}>
                        {ingName || 'Ingredient Analysis'}
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: gradeColor(gradeResult.grade) }}>
                        {gradeLabel(gradeResult.grade)}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        Score: {gradeResult.score} / 100
                      </div>
                    </div>
                  </div>

                  {/* Flags */}
                  {gradeResult.flags.length > 0 ? (
                    <div className="px-4 pb-3 pt-2">
                      {gradeResult.flags.map((f, i) => {
                        const r = RISK_LABELS[f.risk]
                        return (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b text-sm last:border-0"
                            style={{ borderColor: '#f3f4f6' }}>
                            <span style={{ color: r.color }}>{r.emoji} {f.name}</span>
                            <span className="font-bold" style={{ color: f.pts > 0 ? '#16a34a' : '#dc2626' }}>
                              {f.pts > 0 ? '+' : ''}{f.pts}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>
                      No major concerns detected in this ingredient list.
                    </div>
                  )}

                  <div className="px-4 pb-3 pt-1 flex items-center justify-between">
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      Preliminary analysis · Verify with official label
                    </p>
                    <button
                      onClick={() => { setSubName(ingName); setSubIngs(ingText); setTab('submit') }}
                      className="text-xs font-semibold underline flex-shrink-0 ml-3"
                      style={{ color: 'var(--green)' }}
                    >
                      Submit to EatAware →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SUBMIT PRODUCT TAB ── */}
          {tab === 'submit' && (
            <div>
              {subDone ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--green)' }}>Submitted!</h3>
                  <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                    We'll review the label and publish the grade within 48 hours.
                  </p>
                  <button
                    onClick={resetSubmit}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold border"
                    style={{ borderColor: 'var(--green)', color: 'var(--green)' }}
                  >
                    Submit another
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                    Can't find a product? Paste the ingredients from the back of the pack and we'll grade it within 48 hours.
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Product name *</label>
                      <input
                        value={subName}
                        onChange={e => setSubName(e.target.value)}
                        placeholder="e.g. Maggi Noodles"
                        className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                        style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Brand</label>
                      <input
                        value={subBrand}
                        onChange={e => setSubBrand(e.target.value)}
                        placeholder="e.g. Nestlé"
                        className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                        style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
                      />
                    </div>
                  </div>

                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
                    Ingredients (from back of pack) *
                  </label>
                  <textarea
                    value={subIngs}
                    onChange={e => setSubIngs(e.target.value)}
                    rows={4}
                    placeholder="Refined Wheat Flour, Palmolein (TBHQ as antioxidant), Salt, Spices..."
                    className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none mb-3 focus:outline-none focus:ring-2"
                    style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
                  />

                  {/* Live grade preview */}
                  {subPreview && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl mb-3" style={{ background: gradeBg(subPreview.grade) }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black text-white flex-shrink-0"
                        style={{ background: gradeColor(subPreview.grade) }}>
                        {subPreview.grade}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                          Predicted grade: {subPreview.grade} ({subPreview.score}/100)
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                          {subPreview.flags.filter(f => f.risk === 'h').slice(0, 3).map(f => '🔴 ' + f.name).join(' · ') || 'No major concerns detected'}
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
                    Your email (optional)
                  </label>
                  <input
                    type="email"
                    value={subEmail}
                    onChange={e => setSubEmail(e.target.value)}
                    placeholder="Get notified when it's live"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm mb-4 focus:outline-none focus:ring-2"
                    style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }}
                  />

                  {subError && (
                    <div className="text-xs text-red-600 mb-3 px-1">{subError}</div>
                  )}

                  <button
                    onClick={submitProduct}
                    disabled={subLoading}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
                    style={{ background: 'var(--green)' }}
                  >
                    {subLoading ? 'Submitting…' : 'Submit for Review →'}
                  </button>
                  <p className="text-xs text-center mt-2" style={{ color: 'var(--muted)' }}>
                    Reviewed by our team · Published within 48 hours · No spam
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
