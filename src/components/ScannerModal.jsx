import { useState, useEffect } from 'react'
import { quickScore, RISK_LABELS } from '../lib/quickScore'
import { gradeColor, gradeBg, gradeLabel } from '../lib/scoringEngine'
import { supabase } from '../lib/supabase'
import CameraScanner from './CameraScanner'
import OCRScanner from './OCRScanner'

// Extract just the ingredients section from full back-of-pack OCR text.
// Full-pack photos contain nutrition tables, MFG details, addresses — instead of
// rejecting the whole text, find the "INGREDIENTS:" marker and cut at the next
// section header (nutrition/allergen/storage/mfg...). Falls back to full text.
function extractIngredientsSection(text) {
  const t = text || ''
  // Find the ingredients marker (OCR-tolerant: INGREDIENTS / NGREDENTS / 1NGRED1ENTS)
  const startMatch = t.match(/[i1l!|]?[nm]gred[i1l!]*[ea]nts?\s*[:\-.]?/i)
  let section = t
  if (startMatch) {
    section = t.slice(startMatch.index + startMatch[0].length)
  } else {
    // No marker — on Indian packs ingredients usually FOLLOW the nutrition table,
    // so prefer text after the last nutrition row over marketing/manufacturer text.
    const lastRow = [...t.matchAll(/(?:sodium|iron|cholesterol|trans\s*fat)\s*\(?m?g?\)?[^a-zA-Z]{0,20}[\d.]+/gi)].pop()
    if (lastRow) {
      const after = t.slice(lastRow.index + lastRow[0].length)
      if (after.trim().length >= 30) section = after
    }
  }
  // Cut at the first strong terminator that starts a new label section
  const terminators = [
    /nutri(?:tion(?:al)?|ents?)\s*(?:information|facts?|value|table)/i,
    /allergen\s*(?:information|warning|advice|declaration)/i,
    /(?:^|\s)(?:mfg|mfd|pkd|pkg)\s*[:.]?/i,
    /best\s*before/i, /use\s*by/i, /expiry/i,
    /net\s*(?:weight|wt|qty|quantity)/i, /\bmrp\b/i,
    /(?:manufactured|marketed|packed|distributed)\s*(?:by|at|for)/i,
    /storage\s*(?:condition|instruction)/i, /store\s+in\s+a?\s*(?:cool|dry)/i,
    /customer\s*care/i, /fssai/i, /batch\s*no/i,
  ]
  let cutAt = section.length
  for (const re of terminators) {
    const m = section.match(re)
    if (m && m.index < cutAt && m.index > 15) cutAt = m.index
  }
  const extracted = section.slice(0, cutAt).trim()
  // Use extraction only if it looks substantive; otherwise keep original
  return extracted.length >= 15 ? extracted : t
}

// Clean ingredient text: extract ingredients section, then strip residual noise

// Drop OCR junk fragments that would inflate the ingredient count:
// "ESSERE eee RT", "=", "TT", stray single letters, symbol-heavy noise.
function dropJunkFragments(text) {
  return text
    // Bilingual labels: strip Devanagari/Tamil/Telugu/Bengali/Kannada/Gujarati etc.
    // (the grading rules are English — regional script text only adds noise)
    .replace(/[\u0900-\u0DFF]+/g, ' ')
    // Fix words glued together by OCR: "ChiaSeeds" -> "Chia Seeds"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(',')
    .map(f => f.trim())
    .filter(f => {
      if (!f) return false
      // Keep additive codes and percentages even without vowels: "INS 320", "E102", "(40%)"
      if (/ins\s*\d+|^e\s*\d{3}\b|\d+(\.\d+)?\s*%/i.test(f)) return true
      if (f.length < 3) return false
      if (!/[aeiou]/i.test(f)) return false
      const letters = (f.match(/[a-zA-Z]/g) || []).length
      if (letters / f.length < 0.5) return false
      // All-caps gibberish with char runs: "ESSERE eee"
      if (/\b(\w)\1{2,}\b/.test(f) && !/[a-z]{4,}/.test(f.replace(/\b(\w)\1{2,}\b/g, ''))) return false
      return true
    })
    .join(', ')
}

function cleanIngredientText(text) {
  return dropJunkFragments(extractIngredientsSection(text))
    .replace(/(?:energy|carbohydrate|total fat|saturated fat|trans fat|cholesterol|dietary fibre)\s*[\(\-:]?\s*[\d.]+\s*(?:g|mg|kcal|kj|%)[^,]*/gi, '')
    .replace(/(?:per\s*(?:100\s*[gm]l?|serv(?:e|ing)))[^,]*/gi, '')
    .replace(/%\s*(?:rda|dv|daily value)[^,]*/gi, '')
    .replace(/\b\d{8,13}\b/g, '')          // barcodes
    .replace(/[|[\]{}\\_~`]/g, '')          // OCR noise chars
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*[,.:\-]+/, '')
    .trim()
    .slice(0, 1200)                          // cap length instead of rejecting
}

// Check if text is unusable OCR garbage. Runs AFTER extraction, so thresholds
// are lenient — we only block truly unreadable text, not long/full-pack scans.
function isGarbageText(text) {
  if (!text || text.length < 10) return true
  // Very high ratio of non-readable characters = OCR garbage
  const nonReadable = text.replace(/[a-zA-Z0-9,.\-()%\s:;&/'"+*]/g, '').length
  if (nonReadable / text.length > 0.35) return true
  // Nutrition table utterly dominates even after extraction (no real ingredients)
  const nutriWords = (text.match(/energy|carbohydrate|cholesterol|kcal|kj|serving|rda/gi) || []).length
  const totalWords = text.split(/\s+/).length
  if (nutriWords > 8 && nutriWords / totalWords > 0.3) return true
  return false
}

const TABS = [
  { id: 'barcode', label: '📷 Barcode'            },
  { id: 'ocr',     label: '🔬 Scan Pack'           },
  { id: 'grade',   label: '✏️ Grade Text'          },
  { id: 'submit',  label: '➕ Submit'               },
]

const SAMPLES = [
  { name: 'Maggi 2-Minute Noodles',    ings: 'Refined Wheat Flour (Maida), Palmolein (TBHQ as antioxidant), Salt, Wheat Gluten, Spices (0.5%), Acidity Regulators, Tartrazine (INS 102)' },
  { name: "Lay's Classic Salted",       ings: 'Potatoes, Vegetable Oil (Sunflower), Salt, Sugar, Starch, Acidity Regulator (330), Nature Identical Flavouring Substance (Tomato)' },
  { name: 'Saffola Oats',              ings: 'Rolled Oats (100%)' },
  { name: 'Britannia NutriChoice',     ings: 'Whole Wheat Flour, Sugar, Vegetable Fat, Oats (5%), Honey (2%), Dextrose, Salt, Raising Agents' },
]

export default function ScannerModal({ initialTab = 'grade', onClose, onProductFound }) {
  const [tab, setTab]           = useState(initialTab)
  const [ingText, setIngText]   = useState('')
  const [ingName, setIngName]   = useState('')
  const [gradeResult, setGradeResult] = useState(null)
  const [subName, setSubName]   = useState('')
  const [subBrand, setSubBrand] = useState('')
  const [subIngs, setSubIngs]   = useState('')
  const [subEmail, setSubEmail] = useState('')
  const [subLoading, setSubLoading] = useState(false)
  const [subDone, setSubDone]   = useState(false)
  const [subError, setSubError] = useState('')
  const [subPreview, setSubPreview] = useState(null)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (subIngs.trim().length > 20) {
      const cleaned = cleanIngredientText(subIngs)
      if (!isGarbageText(cleaned)) setSubPreview(quickScore(cleaned))
      else setSubPreview(null)
    }
    else setSubPreview(null)
  }, [subIngs])

  // Called when CameraScanner finds product in our DB
  function handleFoundInDB(product) {
    if (onProductFound) { onProductFound(product); onClose() }
  }

  // Called when CameraScanner finds product on OFF or not found at all
  function handleNotFound({ name, brand, ings, barcode }) {
    setSubName(name || '')
    setSubBrand(brand || '')
    setSubIngs(ings || '')
    setTab('submit')
  }

  function runGrade() {
    if (!ingText.trim()) return
    const cleaned = cleanIngredientText(ingText)
    if (isGarbageText(cleaned)) {
      setGradeResult({ grade: '?', score: 0, flags: [{ name: 'Text looks like a nutrition table or garbled OCR — paste only the ingredient list', risk: 'c', pts: 0 }], unrecognized: true })
      return
    }
    setGradeResult(quickScore(cleaned))
    setSubIngs(cleaned)
    if (ingName) setSubName(ingName)
  }

  async function submitProduct() {
    if (!subName.trim()) { setSubError('Please enter the product name.'); return }
    if (!subIngs.trim()) { setSubError('Please paste the ingredient list.'); return }
    // Clean the ingredient text first
    const cleanedIngs = cleanIngredientText(subIngs)
    // Check for garbage/nutrition table text
    if (isGarbageText(cleanedIngs)) {
      setSubError('The text looks like it contains nutritional information, manufacturing details, or unreadable characters instead of an ingredient list. Please paste ONLY the ingredients section (usually starts with "Ingredients:" on the label).')
      return
    }
    // Validate ingredients look real before submitting
    const preview = quickScore(cleanedIngs)
    if (preview.unrecognized) {
      setSubError('No recognizable ingredients found. Please paste the actual ingredient list from the product label.')
      return
    }
    setSubError(''); setSubLoading(true)
    try {
      const payload = {
        product_name:    subName.trim(),
        brand:           subBrand.trim(),
        ingredients:     subIngs.trim(),
        submitter_email: subEmail.trim(),
        predicted_grade: preview.grade,
        predicted_score: preview.score,
        status:          'pending',
      }
      const { data, error } = await supabase.from('submissions').insert([payload]).select()
      if (error) throw error
      setSubDone(true)
    } catch (e) {
      setSubError('Error: ' + (e?.message || e?.code || JSON.stringify(e)))
    } finally {
      setSubLoading(false)
    }
  }

  function resetSubmit() {
    setSubName(''); setSubBrand(''); setSubIngs(''); setSubEmail('')
    setSubPreview(null); setSubDone(false); setSubError('')
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-x-4 top-[4%] bottom-[4%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[520px] bg-white z-50 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        role="dialog" aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--ink)' }}>
            {tab === 'barcode' ? '📷 Scan Barcode' : tab === 'ocr' ? '🔬 Scan Ingredient Label' : tab === 'grade' ? '✏️ Grade Ingredients' : '➕ Submit a Product'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-3 text-xs font-semibold transition-colors"
              style={{
                color: tab === t.id ? 'var(--green)' : 'var(--muted)',
                borderBottom: tab === t.id ? '2px solid var(--green)' : '2px solid transparent',
                background: 'transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── SCAN TAB ── */}
          {tab === 'barcode' && (
            <CameraScanner
              onFoundInDB={handleFoundInDB}
              onNotFound={handleNotFound}
              onClose={onClose}
            />
          )}


          {/* ── OCR SCAN TAB ── */}
          {tab === 'ocr' && (
            <OCRScanner
              onGraded={({ cleanText, result }) => {
                setSubIngs(cleanText)
                setTab('submit')
              }}
              onClose={onClose}
            />
          )}

          {/* ── GRADE INGREDIENTS TAB ── */}
          {tab === 'grade' && (
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                Paste the ingredient list from the back of any pack for an instant A–F grade.
              </p>
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Try a sample</div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLES.map(s => (
                    <button key={s.name}
                      onClick={() => { setIngName(s.name); setIngText(s.ings); setGradeResult(null) }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition hover:border-green-600 hover:text-green-700"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                      {s.name.split(' ').slice(0, 2).join(' ')}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
                Product name (optional)
              </label>
              <input value={ingName} onChange={e => setIngName(e.target.value)}
                placeholder="e.g. Maggi 2-Minute Noodles"
                className="w-full px-4 py-3 rounded-2xl border text-sm mb-3 focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }} />
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
                Ingredient list *
              </label>
              <textarea value={ingText} onChange={e => { setIngText(e.target.value); setGradeResult(null) }}
                rows={5} placeholder="Refined Wheat Flour (Maida), Palmolein (TBHQ as antioxidant), Salt, Spices..."
                className="w-full px-4 py-3 rounded-2xl border text-sm resize-none mb-4 focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }} />
              <button onClick={runGrade} disabled={!ingText.trim()}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40 mb-4"
                style={{ background: 'var(--green)' }}>
                Analyse Ingredients →
              </button>
              {gradeResult && (
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: gradeColor(gradeResult.grade)+'44' }}>
                  <div className="p-4 flex items-center gap-4" style={{ background: gradeBg(gradeResult.grade) }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0"
                      style={{ background: gradeColor(gradeResult.grade) }}>{gradeResult.grade}</div>
                    <div>
                      <div className="font-bold text-base" style={{ color: 'var(--ink)' }}>{ingName || 'Ingredient Analysis'}</div>
                      <div className="text-sm mt-0.5" style={{ color: gradeColor(gradeResult.grade) }}>{gradeLabel(gradeResult.grade)}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Score: {gradeResult.score} / 100</div>
                    </div>
                  </div>
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
                    <div className="px-4 py-3 text-sm" style={{ color: gradeResult.unrecognized ? '#d97706' : 'var(--muted)' }}>
                      {gradeResult.unrecognized
                        ? '⚠️ No recognizable ingredients found. The text may not be a valid ingredient list — please double-check and try again.'
                        : 'No major concerns detected.'}
                    </div>
                  )}
                  <div className="px-4 pb-3 flex items-center justify-between">
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Preliminary · Verify with official label</p>
                    <button onClick={() => { setSubName(ingName); setSubIngs(ingText); setTab('submit') }}
                      className="text-xs font-semibold underline" style={{ color: 'var(--green)' }}>
                      Submit to EatAware →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SUBMIT TAB ── */}
          {tab === 'submit' && (
            <div>
              {subDone ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--green)' }}>Submitted!</h3>
                  <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                    We'll review and publish the grade within 48 hours.
                  </p>
                  <button onClick={resetSubmit}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold border"
                    style={{ borderColor: 'var(--green)', color: 'var(--green)' }}>
                    Submit another
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                    Can't find a product? Paste the ingredients and we'll grade it within 48 hours.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Product name *</label>
                      <input value={subName} onChange={e => setSubName(e.target.value)} placeholder="e.g. Maggi Noodles"
                        className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                        style={{ borderColor: 'var(--border)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Brand</label>
                      <input value={subBrand} onChange={e => setSubBrand(e.target.value)} placeholder="e.g. Nestlé"
                        className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                        style={{ borderColor: 'var(--border)' }} />
                    </div>
                  </div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
                    Ingredients *
                  </label>
                  <textarea value={subIngs} onChange={e => setSubIngs(e.target.value)} rows={4}
                    placeholder="Refined Wheat Flour, Palmolein (TBHQ), Salt, Spices..."
                    className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none mb-3 focus:outline-none"
                    style={{ borderColor: 'var(--border)' }} />
                  {subPreview && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl mb-3"
                      style={{ background: gradeBg(subPreview.grade) }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black text-white flex-shrink-0"
                        style={{ background: gradeColor(subPreview.grade) }}>{subPreview.grade}</div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                          Predicted: {subPreview.grade} ({subPreview.score}/100)
                        </div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>
                          {subPreview.flags.filter(f=>f.risk==='h').slice(0,3).map(f=>'🔴 '+f.name).join(' · ')||'No major concerns'}
                        </div>
                      </div>
                    </div>
                  )}
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
                    Your email (optional)
                  </label>
                  <input type="email" value={subEmail} onChange={e => setSubEmail(e.target.value)}
                    placeholder="Get notified when it's live"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm mb-4 focus:outline-none"
                    style={{ borderColor: 'var(--border)' }} />
                  {subError && <div className="text-xs text-red-600 mb-3">{subError}</div>}
                  <button onClick={submitProduct} disabled={subLoading}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
                    style={{ background: 'var(--green)' }}>
                    {subLoading ? 'Submitting…' : 'Submit for Review →'}
                  </button>
                  <p className="text-xs text-center mt-2" style={{ color: 'var(--muted)' }}>
                    Reviewed by our team · Published within 48 hours
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
