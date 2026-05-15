import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { quickScore } from '../lib/quickScore'
import { gradeColor, gradeBg, gradeLabel } from '../lib/scoringEngine'

const OFF_STATES = ['idle', 'result', 'error']

export default function CameraScanner({ onFoundInDB, onNotFound, onClose }) {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const detectorRef = useRef(null)
  const scanLoopRef = useRef(null)

  const [state, setState]       = useState('idle')   // idle | starting | scanning | found | notfound | error
  const [camError, setCamError] = useState('')
  const [result, setResult]     = useState(null)     // { type:'db'|'off'|'none', product?, barcode?, ings? }
  const [manualBarcode, setManualBarcode] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  // ── Start camera ─────────────────────────────────────────────
  async function startCamera() {
    setState('starting')
    setCamError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Check BarcodeDetector support
      if ('BarcodeDetector' in window) {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']
        })
        setState('scanning')
        startScanLoop()
      } else {
        // BarcodeDetector not supported — show camera + manual entry
        setState('scanning')
      }
    } catch (err) {
      setCamError(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Allow camera access in your browser settings.'
        : 'Could not start camera: ' + err.message)
      setState('error')
    }
  }

  // ── Scan loop — check for barcodes every 400ms ───────────────
  function startScanLoop() {
    if (scanLoopRef.current) return
    scanLoopRef.current = setInterval(async () => {
      if (!videoRef.current || !detectorRef.current) return
      if (videoRef.current.readyState < 2) return
      try {
        const codes = await detectorRef.current.detect(videoRef.current)
        if (codes.length > 0) {
          stopScanLoop()
          await handleBarcode(codes[0].rawValue)
        }
      } catch (_) {}
    }, 400)
  }

  function stopScanLoop() {
    if (scanLoopRef.current) { clearInterval(scanLoopRef.current); scanLoopRef.current = null }
  }

  function stopCamera() {
    stopScanLoop()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  useEffect(() => () => stopCamera(), [])

  // ── Handle barcode value ─────────────────────────────────────
  async function handleBarcode(code) {
    setLookingUp(true)
    setState('found')

    // 1. Search our Supabase DB first (by barcode field or name similarity)
    const dbProduct = await searchOurDB(code)
    if (dbProduct) {
      setResult({ type: 'db', product: dbProduct, barcode: code })
      setLookingUp(false)
      return
    }

    // 2. Try Open Food Facts as fallback
    try {
      const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const data = await res.json()
      if (data.status === 1 && data.product) {
        const p    = data.product
        const ings = p.ingredients_text_en || p.ingredients_text || ''
        const score = ings ? quickScore(ings) : null
        setResult({
          type: 'off',
          barcode: code,
          name:  p.product_name || 'Unknown Product',
          brand: p.brands || '',
          image: p.image_front_small_url || '',
          ings,
          score,
        })
        setLookingUp(false)
        return
      }
    } catch (_) {}

    // 3. Not found anywhere
    setResult({ type: 'none', barcode: code })
    setLookingUp(false)
  }

  // ── Search our Supabase DB ───────────────────────────────────
  async function searchOurDB(code) {
    // Try barcode field first (if products table has one)
    const { data: byBarcode } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', code)
      .eq('status', 'published')
      .limit(1)
    if (byBarcode?.length) return byBarcode[0]
    return null
  }

  // Search our DB by product name (for manual search)
  async function searchOurDBByName(name) {
    if (!name.trim()) return null
    const { data } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${name.trim()}%`)
      .eq('status', 'published')
      .limit(1)
    return data?.[0] || null
  }

  async function handleManualBarcode() {
    if (!manualBarcode.trim()) return
    stopScanLoop()
    await handleBarcode(manualBarcode.trim())
  }

  function reset() {
    setResult(null)
    setState('scanning')
    setManualBarcode('')
    startScanLoop()
  }

  // ── Render result ─────────────────────────────────────────────
  function renderResult() {
    if (lookingUp) return (
      <div className="flex flex-col items-center py-10 gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
        <div className="text-sm" style={{ color: 'var(--muted)' }}>Looking up product…</div>
      </div>
    )

    if (!result) return null

    // Found in our DB ✅
    if (result.type === 'db') {
      const p = result.product
      return (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✅</span>
            <span className="text-xs font-bold text-green-700">Found in EatAware database</span>
          </div>
          <div className="p-4 rounded-2xl border" style={{ background: gradeBg(p.grade), borderColor: gradeColor(p.grade)+'33' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
                style={{ background: gradeColor(p.grade) }}>{p.grade}</div>
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{p.name}</div>
                <div className="text-xs mt-0.5" style={{ color: gradeColor(p.grade) }}>{gradeLabel(p.grade)}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{p.category}</div>
              </div>
            </div>
            {p.impact && <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{p.impact}</p>}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => onFoundInDB(p)}
              className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'var(--green)' }}>
              View Full Profile →
            </button>
            <button onClick={reset}
              className="px-4 py-2.5 rounded-2xl text-sm font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Scan again
            </button>
          </div>
        </div>
      )
    }

    // Found on Open Food Facts
    if (result.type === 'off') {
      return (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🌍</span>
            <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>Found on Open Food Facts — not in EatAware yet</span>
          </div>
          <div className="p-4 rounded-2xl border mb-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex gap-3">
              {result.image && <img src={result.image} alt="" className="w-14 h-14 object-contain rounded-xl flex-shrink-0" />}
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{result.name}</div>
                {result.brand && <div className="text-xs" style={{ color: 'var(--muted)' }}>{result.brand}</div>}
                {result.score && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                      style={{ background: gradeColor(result.score.grade) }}>{result.score.grade}</div>
                    <span className="text-xs" style={{ color: gradeColor(result.score.grade) }}>
                      Predicted · {result.score.score}/100
                    </span>
                  </div>
                )}
              </div>
            </div>
            {result.ings && (
              <div className="mt-2 text-xs p-2 rounded-xl" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
                {result.ings.substring(0, 150)}{result.ings.length > 150 ? '…' : ''}
              </div>
            )}
          </div>
          <button onClick={() => onNotFound({ name: result.name, brand: result.brand, ings: result.ings })}
            className="w-full py-2.5 rounded-2xl text-sm font-bold text-white mb-2"
            style={{ background: 'var(--green)' }}>
            ➕ Add to EatAware database
          </button>
          <button onClick={reset} className="w-full py-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>
            Scan another product
          </button>
        </div>
      )
    }

    // Not found anywhere
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">🔍</div>
        <div className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Product not found</div>
        <div className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          Barcode <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{result.barcode}</code> not in our database or Open Food Facts.
        </div>
        <button onClick={() => onNotFound({ barcode: result.barcode })}
          className="w-full py-2.5 rounded-2xl text-sm font-bold text-white mb-2"
          style={{ background: 'var(--green)' }}>
          ➕ Submit this product
        </button>
        <button onClick={reset} className="w-full py-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>
          Try another barcode
        </button>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────
  return (
    <div>
      {/* Idle state — prompt to start */}
      {state === 'idle' && (
        <div className="text-center py-6">
          <div className="text-5xl mb-4">📷</div>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Point your camera at a product barcode. We'll check our database first, then Open Food Facts.
          </p>
          <button onClick={startCamera}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white mb-3"
            style={{ background: 'var(--green)' }}>
            Start Camera
          </button>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
            Or enter barcode manually
          </div>
          <div className="flex gap-2">
            <input value={manualBarcode} onChange={e => setManualBarcode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualBarcode()}
              placeholder="e.g. 8901058852336"
              className="flex-1 px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }} />
            <button onClick={handleManualBarcode}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--green)' }}>Go</button>
          </div>
        </div>
      )}

      {/* Starting camera */}
      {state === 'starting' && (
        <div className="flex flex-col items-center py-10 gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
          <div className="text-sm" style={{ color: 'var(--muted)' }}>Starting camera…</div>
        </div>
      )}

      {/* Camera live + scanning */}
      {(state === 'scanning' || state === 'found') && (
        <div>
          {/* Video feed */}
          <div className="relative rounded-2xl overflow-hidden mb-4 bg-black"
            style={{ display: state === 'found' && result ? 'none' : 'block' }}>
            <video ref={videoRef} autoPlay playsInline muted
              className="w-full" style={{ maxHeight: '260px', objectFit: 'cover' }} />
            <canvas ref={canvasRef} className="hidden" />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-32 border-2 border-white rounded-xl opacity-60" />
            </div>
            {detectorRef.current && (
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-full">
                  🔍 Scanning for barcode…
                </span>
              </div>
            )}
            {!detectorRef.current && state === 'scanning' && (
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-full">
                  ⚠️ Auto-detect not supported — enter barcode below
                </span>
              </div>
            )}
          </div>

          {/* Manual barcode input when camera is live */}
          {state === 'scanning' && (
            <div className="flex gap-2 mb-3">
              <input value={manualBarcode} onChange={e => setManualBarcode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualBarcode()}
                placeholder="Enter barcode number manually"
                className="flex-1 px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }} />
              <button onClick={handleManualBarcode}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'var(--green)' }}>Go</button>
            </div>
          )}

          {/* Result */}
          {renderResult()}
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="text-center py-6">
          <div className="text-4xl mb-3">📷</div>
          <div className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>Camera unavailable</div>
          <div className="text-sm mb-4" style={{ color: '#dc2626' }}>{camError}</div>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
            Enter barcode manually instead
          </div>
          <div className="flex gap-2">
            <input value={manualBarcode} onChange={e => setManualBarcode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualBarcode()}
              placeholder="e.g. 8901058852336"
              className="flex-1 px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--green)' }} />
            <button onClick={handleManualBarcode}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--green)' }}>Go</button>
          </div>
        </div>
      )}
    </div>
  )
}
