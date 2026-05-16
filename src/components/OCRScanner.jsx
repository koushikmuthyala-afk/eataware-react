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
  return raw
    .replace(/\n+/g, ', ')           // newlines → commas
    .replace(/[|[\]{}\\]/g, '')      // remove OCR noise chars
    .replace(/\s{2,}/g, ' ')        // collapse spaces
    .replace(/,\s*,/g, ',')         // remove double commas
    .replace(/^\s*[Ii]ngredients?\s*[:.]?\s*/i, '') // strip "Ingredients:" prefix
    .replace(/[Cc]ontains?\s*[:.]?\s*/i, '')
    .trim()
}

// Detect if text looks like an ingredient list
function looksLikeIngredients(text) {
  const lower = text.toLowerCase()
  const score = [
    /flour|maida|atta/.test(lower),
    /salt|sugar|sweetener/.test(lower),
    /oil|fat|butter|ghee/.test(lower),
    /ins\s?\d{3}|e\d{3}/.test(lower),
    /preserv|colour|flavou|emulsif/.test(lower),
    /wheat|rice|corn|soy|milk|egg/.test(lower),
    text.includes(','),
    text.split(',').length > 2,
  ].filter(Boolean).length
  return score >= 2
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

  // ── OCR ─────────────────────────────────────────────────────────
  async function runOCR() {
    if (!capturedImage) return
    setState(STATES.processing)
    setProgress(0)

    try {
      const worker = await getTesseract()

      // v7 API — same recognize interface
      const { data } = await worker.recognize(capturedImage)
      const text = data.text || ''
      setRawText(text)

      const cleaned = cleanOCRText(text)
      setCleanText(cleaned)

      if (!cleaned || cleaned.length < 15) {
        setError('Could not read text clearly. Try better lighting, hold steadier, or get closer to the label.')
        setState(STATES.error)
        return
      }

      const scored = quickScore(cleaned)
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
          <button onClick={startCamera}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background: 'var(--green)' }}>
            Start Camera →
          </button>
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
              <button onClick={() => { const s = quickScore(cleanText); setResult(s) }}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: 'var(--green)' }}>
                Re-grade →
              </button>
            </div>
          </details>

          {/* Actions */}
          <button onClick={() => onGraded({ cleanText, result })}
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
              onClick={() => { if (cleanText.trim().length > 10) { setResult(quickScore(cleanText)); setState(STATES.result) } }}
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
