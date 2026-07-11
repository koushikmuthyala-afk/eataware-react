import { useState, useRef, useEffect } from 'react'
import { quickScore, RISK_LABELS } from '../lib/quickScore'
import { gradeColor, gradeBg, gradeLabel } from '../lib/scoringEngine'
import { createWorker } from 'tesseract.js'

// Singleton worker — created once, reused across scans
let tesseractWorker = null

async function getTesseract() {
  if (tesseractWorker) return tesseractWorker
  // Explicit CDN paths required for Vite/PWA — prevents worker script path issues
  tesseractWorker = await createWorker('eng', 1, {
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
    corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0',
    langPath:   'https://tessdata.projectnaptha.com/4.0.0',
    logger:     () => {},
  })
  return tesseractWorker
}

// Clean up raw OCR text to extract usable ingredient list
function cleanOCRText(raw) {
  const flat = (raw || '')
    .replace(/\n+/g, ', ')           // newlines → commas
    .replace(/[|[\]{}\\_~`]/g, '')   // remove OCR noise chars

  // Extract just the ingredients section: find the "INGREDIENTS" marker
  // (OCR-tolerant) and cut at the next section header. Full-pack photos contain
  // nutrition tables + MFG details — extracting beats trying to strip everything.
  // Tolerant of OCR mangling: INGREDIENTS / NGREDENTS / 1NGRED1ENTS / INGREDENTS
  const startMatch = flat.match(/[i1l!|]?[nm]gred[i1l!]*[ea]nts?\s*[:\-.]?/i)
  let section = flat
  if (startMatch) {
    section = flat.slice(startMatch.index + startMatch[0].length)
  } else {
    // No marker found. On Indian packs the ingredient list usually sits BELOW
    // the nutrition table — prefer the text AFTER the last nutrition row
    // instead of the text before it (which is marketing/manufacturer info).
    const lastRow = [...flat.matchAll(/(?:sodium|iron|cholesterol|trans\s*fat)\s*\(?m?g?\)?[^a-zA-Z]{0,20}[\d.]+/gi)].pop()
    if (lastRow) {
      const after = flat.slice(lastRow.index + lastRow[0].length)
      if (after.trim().length >= 30) section = after
    }
  }

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
  const base = extracted.length >= 15 ? extracted : flat

  return base
    // Strip residual per-100g nutrition fragments
    .replace(/(?:energy|carbohydrate|total fat|saturated fat|trans fat|cholesterol|dietary fibre)\s*[\(\-:]?\s*[\d.]+\s*(?:g|mg|kcal|kj|%)[^,]*/gi, '')
    .replace(/(?:per\s*(?:100\s*[gm]l?|serv(?:e|ing)))[^,]*/gi, '')
    .replace(/%\s*(?:rda|dv|daily value)[^,]*/gi, '')
    // Strip barcode-like patterns
    .replace(/\b\d{8,13}\b/g, '')
    // Strip very short fragments (OCR noise)
    .replace(/(?:^|,)\s*[a-zA-Z]{1,2}(?:\s|,|$)/g, ', ')
    // Final cleanup
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*[,.:\-]+/, '')
    .trim()
    .slice(0, 1200)                  // cap length instead of rejecting long scans
}

// Detect if text looks like an ingredient list
function looksLikeIngredients(text) {
  const lower = text.toLowerCase()
  const foodChecks = [
    /flour|maida|atta|besan/.test(lower),
    /\bsalt\b|sugar|sweetener|jaggery/.test(lower),
    /\boil\b|\bfats?\b|butter|ghee|vanaspati|palm|olein/.test(lower),
    /ins\s?\d{3}|\be\d{3}\b/.test(lower),
    /preserv|colour|flavou|emulsif|stabiliz|antioxid/.test(lower),
    /wheat|rice|corn|soy|milk|\beggs?\b|water|starch|\boats?\b/.test(lower),
    /sodium|calcium|potassium|\bacid\b|phosph/.test(lower),
    /spice|masala|turmeric|chilli|cumin|pepper/.test(lower),
    /protein|vitamin|mineral|fibre|fiber/.test(lower),
    /\bnuts?\b|almond|cashew|raisin|\bseeds?\b|cocoa|extract/.test(lower),
    /contain|ingredient|allergen/.test(lower),
  ]
  const foodHits = foodChecks.filter(Boolean).length
  const structural = [
    text.includes(','),
    text.split(',').length > 2,
    /\(\s*\d+(?:\.\d+)?\s*%?\s*\)/.test(text),   // "(40%)" style percentages
    (text.replace(/[a-zA-Z0-9,.\-()%\s:;&/']/g, '').length / text.length) < 0.3,
  ].filter(Boolean).length
  // Must mention at least one real food/additive term — commas alone don't count
  return foodHits >= 1 && (foodHits + structural) >= 3
}

const STATES = {
  idle:        'idle',
  starting:    'starting',
  ready:       'ready',       // camera live, waiting for capture
  capturing:   'capturing',   // freeze frame taken
  processing:  'processing',  // Tesseract running
  result:      'result',      // OCR done, showing grade
  error:       'error',
}

export default function OCRScanner({ onGraded, onClose }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)
  const fileInputRef = useRef(null)
  const nativeCameraRef = useRef(null)   // opens the phone's native camera app (full-res photo)

  const [state, setState]       = useState(STATES.idle)
  const [progress, setProgress] = useState(0)
  const [error, setError]       = useState('')
  const [capturedImage, setCapturedImage] = useState(null) // base64
  const [rawText, setRawText]   = useState('')
  const [cleanText, setCleanText] = useState('')
  const [result, setResult]     = useState(null) // quickScore result
  const [workerReady, setWorkerReady] = useState(false)

  // Preload Tesseract when component mounts
  useEffect(() => {
    getTesseract().then(() => setWorkerReady(true)).catch(() => {})
    return () => stopCamera()
  }, [])

  // Connect stream to video element after ready state renders the video
  useEffect(() => {
    if (state === STATES.ready && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [state])

  // ── Camera ─────────────────────────────────────────────────────
  async function startCamera() {
    setState(STATES.starting)
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        }
      })
      streamRef.current = stream
      setState(STATES.ready)
      // videoRef may not exist yet — useEffect will assign srcObject after render
    } catch (err) {
      setError(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in your browser settings.'
        : 'Could not start camera: ' + err.message)
      setState(STATES.error)
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  // ── Capture frame ───────────────────────────────────────────────
  function captureFrame() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg', 0.95)
    setCapturedImage(imageData)
    stopCamera()
    setState(STATES.capturing)
  }

  // ── Preprocess image for better OCR: resize to optimal + grayscale + contrast ──
  function preprocessImage(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          // Tesseract sweet spot: ~1600-2000px on the longest side.
          // Phone photos are 12MP+ (4032px) — MUST downscale or mobile WASM
          // runs out of memory / takes minutes. Tiny images get upscaled.
          const MAX_DIM = 2000
          const MIN_DIM = 1400
          const longest = Math.max(img.width, img.height)
          let scale = 1
          if (longest > MAX_DIM) scale = MAX_DIM / longest        // downscale big photos
          else if (longest < MIN_DIM) scale = MIN_DIM / longest   // upscale small ones

          const canvas = document.createElement('canvas')
          canvas.width  = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          // Grayscale + measure average brightness
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const d = imgData.data
          let sum = 0
          for (let i = 0; i < d.length; i += 4) {
            const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
            d[i] = d[i + 1] = d[i + 2] = g
            sum += g
          }
          const mean = sum / (d.length / 4)

          // Dark packaging (white text on brown/black — very common on Indian
          // packs): Tesseract needs dark-text-on-light, so INVERT the image.
          if (mean < 115) {
            for (let i = 0; i < d.length; i += 4) {
              const v = 255 - d[i]
              d[i] = d[i + 1] = d[i + 2] = v
            }
          }

          // Contrast stretch
          for (let i = 0; i < d.length; i += 4) {
            const v = Math.min(255, Math.max(0, (d[i] - 128) * 1.25 + 128))
            d[i] = d[i + 1] = d[i + 2] = v
          }
          ctx.putImageData(imgData, 0, 0)
          resolve(canvas.toDataURL('image/jpeg', 0.92))
        } catch (err) {
          // Canvas/memory failure — fall back to the original image
          resolve(dataUrl)
        }
      }
      img.onerror = () => resolve(dataUrl)  // fall back to original on error
      img.src = dataUrl
    })
  }

  // ── OCR ─────────────────────────────────────────────────────────
  async function runOCR() {
    if (!capturedImage) return
    setState(STATES.processing)
    setProgress(0)

    try {
      const worker = await getTesseract()

      // Preprocess for sharper text, then recognize
      const prepped = await preprocessImage(capturedImage)
      const { data } = await worker.recognize(prepped)
      const text = data.text || ''
      setRawText(text)

      const cleaned = cleanOCRText(text)
      setCleanText(cleaned)

      if (!cleaned || cleaned.length < 15) {
        setError('Could not read text clearly. Try better lighting, hold steadier, or get closer to the label.')
        setState(STATES.error)
        return
      }

      // Validate text looks like actual ingredients before grading
      if (!looksLikeIngredients(cleaned)) {
        setError('The scanned text does not look like an ingredient list. Make sure you are capturing the ingredients section on the back of the pack, not the front label or nutritional info table.')
        setState(STATES.error)
        return
      }

      const scored = quickScore(cleaned)

      // If quickScore found zero recognizable terms, warn the user
      if (scored.unrecognized) {
        scored.grade = '?'
        scored.score = 0
        scored.flags = [{ name: 'No recognizable ingredients found', risk: 'c', pts: 0 }]
      }

      setResult(scored)
      setState(STATES.result)

    } catch (err) {
      console.error('OCR error:', err)
      setError('Could not read the image: ' + (err.message || 'unknown error'))
      setState(STATES.error)
    }
  }

  function reset() {
    setCapturedImage(null)
    setRawText('')
    setCleanText('')
    setResult(null)
    setError('')
    setProgress(0)
    setState(STATES.idle)
  }

  function retake() {
    setCapturedImage(null)
    setRawText('')
    setCleanText('')
    setResult(null)
    setError('')
    // Restart camera — useEffect will connect stream to video after state change
    startCamera()
  }

  // ── Gallery upload ─────────────────────────────────────────────
  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCapturedImage(reader.result)
      setState(STATES.capturing)
    }
    reader.readAsDataURL(file)
    // Reset the input that fired (gallery OR native camera) so a repeat capture always triggers onChange
    e.target.value = ''
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div>

      {/* ── IDLE ── */}
      {state === STATES.idle && (
        <div className="text-center py-4">
          <div className="text-5xl mb-3">🔬</div>
          <h3 className="font-bold text-base mb-2" style={{ color: 'var(--ink)' }}>
            Scan Ingredient List
          </h3>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--muted)' }}>
            Point your camera at the <strong>back of the pack</strong> where ingredients are listed.
            We'll read the text and grade it instantly.
          </p>
          {/* Tips */}
          <div className="text-left p-4 rounded-2xl mb-6" style={{ background: 'var(--green-pale)' }}>
            <div className="text-xs font-bold mb-2" style={{ color: 'var(--green)' }}>📸 For best results</div>
            <div className="space-y-1">
              {['Good lighting — near a window or lamp', 'Hold steady, 15–20cm from the pack', 'Capture only the ingredient list section', 'Avoid shadows and glare on the pack'].map(t => (
                <div key={t} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--ink-soft)' }}>
                  <span>·</span><span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => nativeCameraRef.current?.click()}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background: 'var(--green)' }}>
            📸 Take Photo →
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 rounded-2xl text-sm font-semibold border mt-2"
            style={{ borderColor: 'var(--green-mid)', color: 'var(--green)' }}>
            📁 Upload from Gallery
          </button>
          <button onClick={startCamera}
            className="w-full py-2 mt-2 text-xs font-medium"
            style={{ color: 'var(--muted)' }}>
            Use live scanner instead
          </button>
          {/* Native camera: capture="environment" opens the phone camera app and returns a
              full-resolution, autofocused photo — far better OCR than a 1080p video frame */}
          <input ref={nativeCameraRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handleFileUpload} />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={handleFileUpload} />
        </div>
      )}

      {/* ── STARTING ── */}
      {state === STATES.starting && (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
          <div className="text-sm" style={{ color: 'var(--muted)' }}>Starting camera…</div>
        </div>
      )}

      {/* ── CAMERA LIVE ── */}
      {state === STATES.ready && (
        <div>
          <div className="relative rounded-2xl overflow-hidden bg-black mb-4">
            <video ref={videoRef} autoPlay playsInline muted
              className="w-full" style={{ maxHeight: '280px', objectFit: 'cover' }} />

            {/* Overlay guide */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {/* Target box */}
              <div className="border-2 border-white/70 rounded-lg"
                style={{ width: '85%', height: '55%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
              <div className="mt-2 text-white text-xs bg-black/50 px-3 py-1 rounded-full">
                Fit ingredient list inside the box
              </div>
            </div>
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          <button onClick={captureFrame}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ background: 'var(--green)' }}>
            <span className="text-lg">📸</span> Capture Ingredients
          </button>
          <button onClick={() => { stopCamera(); setState(STATES.idle) }}
            className="w-full py-2 mt-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>
            Cancel
          </button>
        </div>
      )}

      {/* ── FRAME CAPTURED ── */}
      {state === STATES.capturing && capturedImage && (
        <div>
          <div className="rounded-2xl overflow-hidden mb-3 border" style={{ borderColor: 'var(--border)' }}>
            <img src={capturedImage} alt="Captured" className="w-full"
              style={{ maxHeight: '220px', objectFit: 'cover' }} />
          </div>
          <p className="text-sm text-center mb-4" style={{ color: 'var(--muted)' }}>
            Looks good? Tap Read to extract the ingredient text.
          </p>
          <div className="flex gap-2">
            <button onClick={runOCR}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'var(--green)' }}>
              🔍 Read Ingredients
            </button>
            <button onClick={retake}
              className="px-4 py-3 rounded-2xl text-sm font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Retake
            </button>
          </div>
        </div>
      )}

      {/* ── OCR PROCESSING ── */}
      {state === STATES.processing && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔬</div>
          <div className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>Reading ingredients…</div>
          <div className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Analysing text from the image
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden mx-4">
            <div className="h-full rounded-full animate-pulse" style={{ width: '70%', background: 'var(--green)' }} />
          </div>
          <div className="text-xs mt-3" style={{ color: 'var(--muted)' }}>This takes 3–8 seconds</div>
        </div>
      )}

      {/* ── RESULT ── */}
      {state === STATES.result && result && (
        <div>
          {/* Grade card */}
          <div className="rounded-2xl border overflow-hidden mb-4"
            style={{ borderColor: gradeColor(result.grade)+'44', background: gradeBg(result.grade) }}>
            <div className="p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0"
                style={{ background: gradeColor(result.grade) }}>
                {result.grade}
              </div>
              <div>
                <div className="font-bold text-base" style={{ color: 'var(--ink)' }}>
                  {gradeLabel(result.grade)}
                </div>
                <div className="text-sm mt-0.5" style={{ color: gradeColor(result.grade) }}>
                  Score: {result.score}/100
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  Based on OCR scan · Verify with official label
                </div>
              </div>
            </div>

            {/* Flags */}
            {result.flags.length > 0 && (
              <div className="px-4 pb-3 pt-1 border-t" style={{ borderColor: gradeColor(result.grade)+'22' }}>
                {result.flags.map((f, i) => {
                  const r = RISK_LABELS[f.risk]
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b text-sm last:border-0"
                      style={{ borderColor: '#f3f4f6' }}>
                      <span style={{ color: r.color }}>{r.emoji} {f.name}</span>
                      <span className="font-bold text-xs" style={{ color: f.pts > 0 ? '#16a34a' : '#dc2626' }}>
                        {f.pts > 0 ? '+' : ''}{f.pts}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {result.flags.length === 0 && (
              <div className="px-4 pb-3 text-sm" style={{ color: 'var(--muted)' }}>
                No major concerns detected.
              </div>
            )}
          </div>

          {/* Extracted text — collapsible */}
          <details className="mb-4 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <summary className="px-4 py-3 text-xs font-bold cursor-pointer select-none"
              style={{ color: 'var(--muted)', listStyle: 'none' }}>
              📄 View extracted ingredient text
            </summary>
            <div className="px-4 pb-4">
              <textarea
                value={cleanText}
                onChange={e => setCleanText(e.target.value)}
                rows={4}
                className="w-full text-xs font-mono p-2 rounded-xl border resize-none mt-1"
                style={{ borderColor: 'var(--border)', color: 'var(--ink-soft)', background: '#f9fafb' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                You can edit the text above to fix any OCR errors, then tap Re-grade.
              </p>
              <button onClick={() => {
                const t = cleanText.trim()
                if (!looksLikeIngredients(t)) {
                  setResult({ grade: '?', score: 0, unrecognized: true, flags: [{ name: 'This text does not look like an ingredient list — edit it or retake the photo closer to the ingredients section', risk: 'c', pts: 0 }] })
                } else setResult(quickScore(t))
              }}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: 'var(--green)' }}>
                Re-grade →
              </button>
            </div>
          </details>

          {/* Actions */}
          <button onClick={() => onGraded({ cleanText: (cleanText && cleanText.trim()) || rawText || '', result })}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white mb-2"
            style={{ background: 'var(--green)' }}>
            ➕ Submit to EatAware Database
          </button>
          <button onClick={reset}
            className="w-full py-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>
            Scan another product
          </button>
        </div>
      )}

      {/* ── ERROR ── */}
      {state === STATES.error && (
        <div className="text-center py-6">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>Couldn't read the text</div>
          <div className="text-sm mb-6 leading-relaxed" style={{ color: '#dc2626' }}>{error}</div>

          {capturedImage && (
            <div className="mb-4 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <img src={capturedImage} alt="Captured" className="w-full"
                style={{ maxHeight: '140px', objectFit: 'cover' }} />
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={retake}
              className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'var(--green)' }}>
              Try Again
            </button>
            <button onClick={reset}
              className="flex-1 py-2.5 rounded-2xl text-sm font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Start Over
            </button>
          </div>

          {/* Manual fallback */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => nativeCameraRef.current?.click()}
              className="w-full py-2.5 rounded-2xl text-sm font-bold text-white mb-2"
              style={{ background: 'var(--green)' }}>
              📸 Retake Photo
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-2xl text-sm font-semibold border mb-3"
              style={{ borderColor: 'var(--green-mid)', color: 'var(--green)' }}>
              📁 Upload from Gallery instead
            </button>
            <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
              Or paste the ingredient list manually:
            </p>
            <textarea
              value={cleanText}
              onChange={e => setCleanText(e.target.value)}
              rows={3}
              placeholder="Refined Wheat Flour (Maida), Palmolein (TBHQ), Salt..."
              className="w-full text-xs p-3 rounded-xl border resize-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <button
              onClick={() => {
                const t = cleanText.trim()
                if (t.length <= 10) return
                if (!looksLikeIngredients(t)) {
                  setResult({ grade: '?', score: 0, unrecognized: true, flags: [{ name: 'This text does not look like an ingredient list — please paste the actual ingredients from the label', risk: 'c', pts: 0 }] })
                } else setResult(quickScore(t))
                setState(STATES.result)
              }}
              disabled={cleanText.trim().length < 10}
              className="w-full mt-2 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: 'var(--green)' }}>
              Grade this text →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
