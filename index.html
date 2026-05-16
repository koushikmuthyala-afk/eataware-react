import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { gradeColor } from '../lib/scoringEngine'
import { quickScore } from '../lib/quickScore'
import { useSEO } from '../hooks/useSEO'

const ADMIN_EMAIL = 'koushik@eataware.in'
const GRADES = ['A','B','C','D','E','F']
const EMPTY = { slug:'', name:'', brand:'', grade:'C', category:'', impact:'', ings:'[]', status:'published', barcode:'' }
const PAGE_SIZE = 50

export default function AdminPanel({ user }) {
  useSEO({ title: 'Admin Panel' })
  const [tab, setTab]               = useState('dashboard')
  const [products, setProducts]     = useState([])
  const [submissions, setSubmissions] = useState([])
  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('published')
  const [editProduct, setEditProduct] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState({ text: '', type: '' })
  const [page, setPage]             = useState(0)

  const isAdmin = user?.email === ADMIN_EMAIL
  const pendingCount = submissions.filter(s => s.status === 'pending').length

  useEffect(() => {
    if (!isAdmin) return
    if (tab === 'dashboard')   loadStats()
    if (tab === 'products')    loadProducts()
    if (tab === 'submissions') loadSubmissions()
  }, [tab, isAdmin, page, gradeFilter, statusFilter])

  async function loadStats() {
    setLoading(true)
    const [
      { count: total },
      { count: published },
      { count: pending },
      { data: recent },
    ] = await Promise.all([
      supabase.from('products').select('*', { count:'exact', head:true }),
      supabase.from('products').select('*', { count:'exact', head:true }).eq('status','published'),
      supabase.from('submissions').select('*', { count:'exact', head:true }).eq('status','pending'),
      supabase.from('submissions').select('product_name,predicted_grade,created_at').eq('status','pending').order('created_at',{ascending:false}).limit(5),
    ])
    const { data: gradeData } = await supabase.from('products').select('grade').eq('status','published')
    const gradeCount = GRADES.reduce((acc, g) => { acc[g] = gradeData?.filter(p=>p.grade===g).length||0; return acc }, {})
    setStats({ total, published, pending, recent: recent||[], gradeCount })
    setLoading(false)
  }

  async function loadProducts() {
    setLoading(true)
    let q = supabase.from('products').select('slug,name,brand,grade,category,status,barcode')
    if (gradeFilter)   q = q.eq('grade', gradeFilter)
    if (statusFilter)  q = q.eq('status', statusFilter)
    if (search.trim()) q = q.ilike('name', `%${search.trim()}%`)
    const { data } = await q.order('name').range(page*PAGE_SIZE, (page+1)*PAGE_SIZE-1)
    setProducts(data || [])
    setLoading(false)
  }

  async function loadSubmissions() {
    setLoading(true)
    const { data } = await supabase.from('submissions').select('*').order('created_at',{ascending:false}).limit(100)
    setSubmissions(data || [])
    setLoading(false)
  }

  async function saveProduct(form) {
    setSaving(true); setMsg({ text:'', type:'' })
    let ings = []
    try { ings = JSON.parse(form.ings || '[]') }
    catch { setMsg({ text:'Invalid ingredients JSON', type:'error' }); setSaving(false); return }

    const payload = {
      slug: form._existing ? form.slug : form.slug.trim().toLowerCase().replace(/\s+/g,'-'),
      name: form.name.trim(), brand: form.brand?.trim()||'',
      grade: form.grade, category: form.category?.trim()||'',
      impact: form.impact?.trim()||'', ings,
      status: form.status||'published',
      barcode: form.barcode?.trim()||null,
    }

    const { error } = form._existing
      ? await supabase.from('products').update(payload).eq('slug', form.slug)
      : await supabase.from('products').insert([payload])

    if (error) setMsg({ text: error.message, type:'error' })
    else { setMsg({ text: form._existing ? 'Product updated!' : 'Product added!', type:'success' }); setEditProduct(null); loadProducts() }
    setSaving(false)
  }

  async function deleteProduct(slug, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('products').delete().eq('slug', slug)
    if (error) setMsg({ text: error.message, type:'error' })
    else { setMsg({ text:'Deleted: '+name, type:'success' }); loadProducts() }
  }

  async function toggleStatus(slug, current) {
    const next = current === 'published' ? 'draft' : 'published'
    await supabase.from('products').update({ status: next }).eq('slug', slug)
    loadProducts()
  }

  async function approveSubmission(sub) {
    const slug = sub.product_name.toLowerCase()
      .replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '')
      + '-' + Date.now().toString(36)
    const scored = quickScore(sub.ingredients || '')
    const ings = scored.flags.map(f => ({
      dot: f.risk==='h' ? 'dot-avoid' : f.risk==='c' ? 'dot-caution' : 'dot-safe',
      name: f.name, desc: '', safe: f.risk==='s'
    }))
    const { error } = await supabase.from('products').insert([{
      slug, name: sub.product_name, brand: sub.brand||'', grade: sub.predicted_grade||'C',
      category:'General', impact:'', ings, status:'published',
    }])
    if (error) { setMsg({ text: error.message, type:'error' }); return }
    await supabase.from('submissions').update({ status:'approved' }).eq('id', sub.id)
    setMsg({ text: `Published: ${sub.product_name}`, type:'success' })
    loadSubmissions()
  }

  async function rejectSubmission(id) {
    await supabase.from('submissions').update({ status:'rejected' }).eq('id', id)
    loadSubmissions()
  }

  async function editFromSubmission(sub) {
    setEditProduct({ ...EMPTY, name: sub.product_name, brand: sub.brand||'', grade: sub.predicted_grade||'C' })
    setTab('products')
  }

  if (!user) return <div className="min-h-screen pt-24 flex items-center justify-center"><div className="text-center"><div className="text-4xl mb-3">&#x1F510;</div><div className="font-bold" style={{ color: 'var(--ink)' }}>Sign in required</div></div></div>
  if (!isAdmin) return <div className="min-h-screen pt-24 flex items-center justify-center"><div className="text-center"><div className="text-4xl mb-3">&#x1F6AB;</div><div className="font-bold" style={{ color: 'var(--ink)' }}>Admin access only</div><div className="text-sm" style={{ color: 'var(--muted)' }}>{user.email}</div></div></div>

  return (
    <div className="min-h-screen pt-16" style={{ background: 'var(--surface)' }}>
      <div className="px-6 py-8 max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--ink)' }}>Admin Panel</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{user.email}</p>
          </div>
          {msg.text && (
            <div className="px-4 py-2 rounded-2xl text-sm font-medium"
              style={{ background: msg.type==='success'?'#f0fdf4':'#fef2f2', color: msg.type==='success'?'#166534':'#dc2626' }}>
              {msg.type==='success'?'\u2705':'\u274c'} {msg.text}
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            ['dashboard', '📊 Dashboard'],
            ['products',  '📦 Products'],
            ['submissions', '📬 Submissions' + (pendingCount>0 ? ' ('+pendingCount+' pending)' : '')],
          ].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setPage(0) }}
              className="px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: tab===id?'var(--green)':'#fff', color: tab===id?'#fff':'var(--muted)', border: '1px solid var(--border)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* DASHBOARD */}
        {tab === 'dashboard' && !loading && stats && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                ['Total Products', stats.total, 'var(--green)'],
                ['Published', stats.published, '#16a34a'],
                ['Pending Reviews', stats.pending, stats.pending>0?'#d97706':'#9ca3af'],
                ['Drafts', (stats.total||0)-(stats.published||0), '#6b7280'],
              ].map(([label, val, color]) => (
                <div key={label} className="bg-white rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-2xl font-black mb-1" style={{ color }}>{val??0}</div>
                  <div className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--ink)' }}>Grade Distribution</h3>
                {GRADES.map(g => {
                  const count = stats.gradeCount[g]||0
                  const pct = stats.published>0 ? Math.round(count/stats.published*100) : 0
                  return (
                    <div key={g} className="flex items-center gap-3 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                        style={{ background: gradeColor(g) }}>{g}</div>
                      <div className="flex-1"><div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: gradeColor(g) }} />
                      </div></div>
                      <div className="text-xs w-16 text-right" style={{ color: 'var(--muted)' }}>{count} ({pct}%)</div>
                    </div>
                  )
                })}
              </div>
              {stats.recent?.length > 0 && (
                <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Pending Submissions</h3>
                    <button onClick={() => setTab('submissions')} className="text-xs underline" style={{ color: 'var(--green)' }}>View all</button>
                  </div>
                  {stats.recent.map((s,i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
                      {s.predicted_grade && <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white" style={{ background: gradeColor(s.predicted_grade) }}>{s.predicted_grade}</div>}
                      <div className="text-sm flex-1 truncate" style={{ color: 'var(--ink)' }}>{s.product_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRODUCTS */}
        {tab === 'products' && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter'&&loadProducts()}
                placeholder="Search products..." className="flex-1 min-w-40 px-4 py-2.5 rounded-2xl border text-sm focus:outline-none"
                style={{ borderColor: 'var(--border)' }} />
              <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(0) }}
                className="px-3 py-2.5 rounded-2xl border text-sm" style={{ borderColor: 'var(--border)' }}>
                <option value="">All grades</option>
                {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
                className="px-3 py-2.5 rounded-2xl border text-sm" style={{ borderColor: 'var(--border)' }}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="">All</option>
              </select>
              <button onClick={loadProducts} className="px-4 py-2.5 rounded-2xl border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Search</button>
              <button onClick={() => setEditProduct({...EMPTY})} className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white" style={{ background: 'var(--green)' }}>+ Add Product</button>
            </div>
            {editProduct && <ProductForm initial={editProduct} onSave={saveProduct} onCancel={() => setEditProduct(null)} saving={saving} />}
            {loading ? <div className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>Loading...</div> : (
              <>
                <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-sm">
                    <thead><tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Grade','Name / Slug','Category','Barcode','Status','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.slug} className="border-b hover:bg-gray-50" style={{ borderColor: '#f3f4f6' }}>
                          <td className="px-4 py-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: gradeColor(p.grade) }}>{p.grade}</div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="font-medium text-sm truncate" style={{ color: 'var(--ink)' }}>{p.name}</div>
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>{p.slug}</div>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{p.category||'—'}</td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--muted)' }}>{p.barcode||'—'}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleStatus(p.slug, p.status)}
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{ background: p.status==='published'?'#f0fdf4':'#fef3c7', color: p.status==='published'?'#166534':'#92400e' }}>
                              {p.status}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={async () => { const {data} = await supabase.from('products').select('*').eq('slug',p.slug).single(); if(data) setEditProduct({...data, ings:JSON.stringify(data.ings||[],null,2), _existing:true}) }}
                                className="text-xs px-2 py-1.5 rounded-lg border font-medium" style={{ borderColor: 'var(--border)', color: 'var(--green)' }}>Edit</button>
                              <button onClick={() => deleteProduct(p.slug, p.name)}
                                className="text-xs px-2 py-1.5 rounded-lg border font-medium" style={{ borderColor: '#fca5a5', color: '#dc2626' }}>Del</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Page {page+1} · {products.length} shown</div>
                  <div className="flex gap-2">
                    <button disabled={page===0} onClick={() => setPage(p=>p-1)} className="px-3 py-1.5 rounded-xl border text-xs disabled:opacity-40" style={{ borderColor: 'var(--border)' }}>&#8592; Prev</button>
                    <button disabled={products.length<PAGE_SIZE} onClick={() => setPage(p=>p+1)} className="px-3 py-1.5 rounded-xl border text-xs disabled:opacity-40" style={{ borderColor: 'var(--border)' }}>Next &#8594;</button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* SUBMISSIONS */}
        {tab === 'submissions' && (
          loading ? (
            <div className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>Loading...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📭</div>
              <div className="font-semibold" style={{ color: 'var(--ink)' }}>No submissions yet</div>
            </div>
          ) :
          <div className="space-y-3">
            {submissions.map(sub => (
              <div key={sub.id} className="bg-white rounded-2xl border p-4"
                style={{ borderColor: sub.status==='pending'?'#fbbf24':'var(--border)' }}>
                <div className="flex items-start gap-3">
                  {sub.predicted_grade && (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white flex-shrink-0"
                      style={{ background: gradeColor(sub.predicted_grade) }}>{sub.predicted_grade}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{sub.product_name}</span>
                      {sub.brand && <span className="text-xs" style={{ color: 'var(--muted)' }}>· {sub.brand}</span>}
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: sub.status==='pending'?'#fef3c7':sub.status==='approved'?'#f0fdf4':'#fef2f2',
                          color: sub.status==='pending'?'#92400e':sub.status==='approved'?'#166534':'#dc2626' }}>{sub.status}</span>
                    </div>
                    {sub.ingredients && <p className="text-xs leading-relaxed mb-1 line-clamp-2" style={{ color: 'var(--muted)' }}>{sub.ingredients}</p>}
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      {sub.submitter_email && <span className="mr-3">&#x1F4E7; {sub.submitter_email}</span>}
                      {new Date(sub.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                    </div>
                  </div>
                  {sub.status === 'pending' && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => approveSubmission(sub)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: 'var(--green)' }}>Publish</button>
                      <button onClick={() => editFromSubmission(sub)} className="px-3 py-1.5 rounded-xl text-xs border font-medium" style={{ borderColor: 'var(--border)', color: 'var(--green)' }}>Edit first</button>
                      <button onClick={() => rejectSubmission(sub.id)} className="px-3 py-1.5 rounded-xl text-xs border font-medium" style={{ borderColor: '#fca5a5', color: '#dc2626' }}>Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProductForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!form._existing && form.name) {
      const slug = form.name.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '')
      set('slug', slug)
    }
  }, [form.name])

  return (
    <div className="bg-white rounded-2xl border p-5 mb-5" style={{ borderColor: 'var(--green-mid)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>
          {form._existing ? `Editing: ${form.name}` : 'Add New Product'}
        </h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        {[['name','Product Name *','Maggi 2-Minute Noodles'],['brand','Brand','Nestle'],['category','Category','Instant Noodles'],
          ['slug','Slug','maggi-2-minute-noodles'],['barcode','Barcode','8901058852336']].map(([k,label,ph]) => (
          <div key={k}>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
            <input value={form[k]||''} onChange={e => set(k,e.target.value)} placeholder={ph}
              disabled={k==='slug'&&form._existing}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
              style={{ borderColor: 'var(--border)', background: k==='slug'&&form._existing?'#f9fafb':'#fff' }} />
          </div>
        ))}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Grade</label>
          <select value={form.grade} onChange={e => set('grade',e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border)' }}>
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Status</label>
          <select value={form.status||'published'} onChange={e => set('status',e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border)' }}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Health Impact</label>
        <textarea value={form.impact||''} onChange={e => set('impact',e.target.value)} rows={2}
          placeholder="Describe health impact..." className="w-full px-3 py-2 rounded-xl border text-sm resize-none" style={{ borderColor: 'var(--border)' }} />
      </div>
      <div className="mb-4">
        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>
          Ingredients JSON
        </label>
        <textarea value={form.ings||'[]'} onChange={e => set('ings',e.target.value)} rows={5}
          className="w-full px-3 py-2 rounded-xl border text-xs font-mono resize-none" style={{ borderColor: 'var(--border)' }} />
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>dot values: dot-avoid · dot-caution · dot-safe</div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(form)} disabled={saving||!form.name?.trim()}
          className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-60" style={{ background: 'var(--green)' }}>
          {saving?'Saving...':form._existing?'Save Changes':'Add Product'}
        </button>
        <button onClick={onCancel} className="px-6 py-2.5 rounded-2xl text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancel</button>
      </div>
    </div>
  )
}
