import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { gradeColor } from '../lib/scoringEngine'

const ADMIN_EMAIL = 'koushik@eataware.in'
const GRADES = ['A','B','C','D','E','F']
const EMPTY_PRODUCT = { slug:'', name:'', grade:'C', category:'', impact:'', ings:'[]', status:'published' }

export default function AdminPanel({ user }) {
  const [tab, setTab]           = useState('products')
  const [products, setProducts] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [editProduct, setEditProduct] = useState(null)  // null | {} | product
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!isAdmin) return
    if (tab === 'products') loadProducts()
    if (tab === 'submissions') loadSubmissions()
  }, [tab, isAdmin])

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase
      .from('products').select('slug,name,grade,category,status')
      .order('name').limit(500)
    setProducts(data || [])
    setLoading(false)
  }

  async function loadSubmissions() {
    setLoading(true)
    const { data } = await supabase
      .from('submissions').select('*')
      .order('created_at', { ascending: false }).limit(100)
    setSubmissions(data || [])
    setLoading(false)
  }

  async function saveProduct(form) {
    setSaving(true); setMsg('')
    let ings = []
    try { ings = JSON.parse(form.ings || '[]') } catch { setMsg('❌ Invalid ingredients JSON'); setSaving(false); return }
    const payload = { slug: form.slug, name: form.name, grade: form.grade,
      category: form.category, impact: form.impact, ings, status: form.status || 'published' }

    const isNew = !form._existing
    const { error } = isNew
      ? await supabase.from('products').insert([payload])
      : await supabase.from('products').update(payload).eq('slug', form.slug)

    if (error) { setMsg('❌ ' + error.message) }
    else { setMsg(isNew ? '✅ Product added!' : '✅ Saved!'); setEditProduct(null); loadProducts() }
    setSaving(false)
  }

  async function deleteProduct(slug) {
    if (!confirm(`Delete "${slug}"? This cannot be undone.`)) return
    const { error } = await supabase.from('products').delete().eq('slug', slug)
    if (error) setMsg('❌ ' + error.message)
    else { setMsg('✅ Deleted'); loadProducts() }
  }

  async function updateSubmission(id, status) {
    await supabase.from('submissions').update({ status }).eq('id', id)
    loadSubmissions()
  }

  async function publishSubmission(sub) {
    // Create a product from a submission
    const slug = sub.product_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error } = await supabase.from('products').insert([{
      slug, name: sub.product_name, grade: sub.predicted_grade || 'C',
      category: 'General', impact: '', ings: [], status: 'published',
    }])
    if (!error) {
      await supabase.from('submissions').update({ status: 'approved' }).eq('id', sub.id)
      setMsg('✅ Published as ' + slug)
      loadSubmissions()
    } else setMsg('❌ ' + error.message)
  }

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
  )

  if (!user) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="text-center"><div className="text-4xl mb-3">🔐</div>
        <div className="font-bold mb-2" style={{ color: 'var(--ink)' }}>Sign in required</div>
        <div className="text-sm" style={{ color: 'var(--muted)' }}>Admin access only</div>
      </div>
    </div>
  )

  if (!isAdmin) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="text-center"><div className="text-4xl mb-3">🚫</div>
        <div className="font-bold mb-2" style={{ color: 'var(--ink)' }}>Access denied</div>
        <div className="text-sm" style={{ color: 'var(--muted)' }}>Admin account required</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pt-16" style={{ background: 'var(--surface)' }}>
      <div className="px-6 py-8 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--ink)' }}>Admin Panel</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Signed in as {user.email}</p>
          </div>
          {msg && (
            <div className="px-4 py-2 rounded-2xl text-sm font-medium"
              style={{ background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                color: msg.startsWith('✅') ? '#166534' : '#dc2626' }}>
              {msg}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[['products', `Products (${products.length})`], ['submissions', `Submissions (${submissions.filter(s=>s.status==='pending').length} pending)`]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition"
              style={{ background: tab === id ? 'var(--green)' : '#fff',
                color: tab === id ? '#fff' : 'var(--muted)',
                border: '1px solid var(--border)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── PRODUCTS TAB ── */}
        {tab === 'products' && (
          <>
            <div className="flex gap-3 mb-4">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="flex-1 px-4 py-2.5 rounded-2xl border text-sm focus:outline-none"
                style={{ borderColor: 'var(--border)' }} />
              <button onClick={() => setEditProduct({ ...EMPTY_PRODUCT })}
                className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'var(--green)' }}>
                + Add Product
              </button>
            </div>

            {/* Edit form */}
            {editProduct && (
              <ProductForm
                initial={editProduct}
                onSave={saveProduct}
                onCancel={() => setEditProduct(null)}
                saving={saving}
              />
            )}

            {loading ? (
              <div className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
            ) : (
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Grade','Name','Category','Status','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                          style={{ color: 'var(--muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p, i) => (
                      <tr key={p.slug} className="border-b hover:bg-gray-50"
                        style={{ borderColor: '#f3f4f6' }}>
                        <td className="px-4 py-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                            style={{ background: gradeColor(p.grade) }}>{p.grade}</div>
                        </td>
                        <td className="px-4 py-3 font-medium max-w-xs truncate" style={{ color: 'var(--ink)' }}>
                          {p.name}
                          <div className="text-xs font-normal" style={{ color: 'var(--muted)' }}>{p.slug}</div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{p.category || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ background: p.status === 'published' ? '#f0fdf4' : '#fef3c7',
                              color: p.status === 'published' ? '#166534' : '#92400e' }}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => setEditProduct({ ...p, ings: JSON.stringify(p.ings||[]), _existing: true })}
                              className="text-xs px-3 py-1.5 rounded-xl border font-medium hover:bg-gray-100"
                              style={{ borderColor: 'var(--border)', color: 'var(--green)' }}>Edit</button>
                            <button onClick={() => deleteProduct(p.slug)}
                              className="text-xs px-3 py-1.5 rounded-xl border font-medium hover:bg-red-50"
                              style={{ borderColor: '#fca5a5', color: '#dc2626' }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── SUBMISSIONS TAB ── */}
        {tab === 'submissions' && (
          loading ? (
            <div className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-10"><div className="text-4xl mb-3">📭</div>
              <div className="font-semibold" style={{ color: 'var(--ink)' }}>No submissions yet</div>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => (
                <div key={sub.id} className="bg-white rounded-2xl border p-4"
                  style={{ borderColor: sub.status === 'pending' ? '#fbbf24' : 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{sub.product_name}</span>
                        {sub.brand && <span className="text-xs" style={{ color: 'var(--muted)' }}>· {sub.brand}</span>}
                        {sub.predicted_grade && (
                          <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white"
                            style={{ background: gradeColor(sub.predicted_grade) }}>{sub.predicted_grade}</span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium ml-1"
                          style={{ background: sub.status === 'pending' ? '#fef3c7' : sub.status === 'approved' ? '#f0fdf4' : '#fef2f2',
                            color: sub.status === 'pending' ? '#92400e' : sub.status === 'approved' ? '#166534' : '#dc2626' }}>
                          {sub.status}
                        </span>
                      </div>
                      {sub.ingredients && (
                        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--muted)' }}>
                          {sub.ingredients}
                        </p>
                      )}
                      {sub.submitter_email && (
                        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                          From: {sub.submitter_email}
                        </div>
                      )}
                    </div>
                    {sub.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => publishSubmission(sub)}
                          className="text-xs px-3 py-1.5 rounded-xl font-bold text-white"
                          style={{ background: 'var(--green)' }}>Publish</button>
                        <button onClick={() => updateSubmission(sub.id, 'rejected')}
                          className="text-xs px-3 py-1.5 rounded-xl border font-medium"
                          style={{ borderColor: '#fca5a5', color: '#dc2626' }}>Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function ProductForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="bg-white rounded-2xl border p-5 mb-4" style={{ borderColor: 'var(--green-mid)' }}>
      <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--ink)' }}>
        {form._existing ? `Edit: ${form.name}` : 'Add New Product'}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        {[['slug','Slug (URL key)','maggi-2-minute-noodles'],
          ['name','Product Name','Maggi 2-Minute Noodles'],
          ['category','Category','Instant Noodles']].map(([k, label, ph]) => (
          <div key={k}>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
            <input value={form[k] || ''} onChange={e => set(k, e.target.value)} placeholder={ph} disabled={k==='slug' && form._existing}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
              style={{ borderColor: 'var(--border)', background: k==='slug'&&form._existing ? '#f9fafb' : '#fff' }} />
          </div>
        ))}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Grade</label>
          <select value={form.grade} onChange={e => set('grade', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ borderColor: 'var(--border)' }}>
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Status</label>
          <select value={form.status || 'published'} onChange={e => set('status', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ borderColor: 'var(--border)' }}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Health Impact</label>
        <textarea value={form.impact || ''} onChange={e => set('impact', e.target.value)} rows={2}
          placeholder="Describe health impact in 2-3 sentences..."
          className="w-full px-3 py-2 rounded-xl border text-sm resize-none focus:outline-none"
          style={{ borderColor: 'var(--border)' }} />
      </div>
      <div className="mb-4">
        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>
          Ingredients JSON
        </label>
        <textarea value={form.ings || '[]'} onChange={e => set('ings', e.target.value)} rows={4}
          placeholder='[{"dot":"dot-avoid","name":"TBHQ (INS 319)","desc":"Synthetic antioxidant","safe":false}]'
          className="w-full px-3 py-2 rounded-xl border text-xs font-mono resize-none focus:outline-none"
          style={{ borderColor: 'var(--border)' }} />
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          dot values: dot-avoid · dot-caution · dot-safe
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(form)} disabled={saving}
          className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
          style={{ background: 'var(--green)' }}>
          {saving ? 'Saving…' : form._existing ? 'Save Changes' : 'Add Product'}
        </button>
        <button onClick={onCancel}
          className="px-6 py-2.5 rounded-2xl text-sm font-medium border"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
