import { useEffect, useMemo, useState } from 'react'
import { fetchObjectives, fetchKras, createObjective, updateObjective, deleteObjective } from '../lib/api'
import { normalizeTitle, isJunk } from '../lib/duplicates'
import { Spinner, Modal, Confirm, toast, Toasts, Badge, Field } from '../components/ui'

export default function Objectives() {
  const [objs, setObjs] = useState(null)
  const [kras, setKras] = useState([])
  const [kraFilter, setKraFilter] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // {id?, title, kra_id}
  const [deleting, setDeleting] = useState(null)

  async function reload() {
    const [o, k] = await Promise.all([fetchObjectives(), fetchKras()])
    setObjs(o)
    setKras(k)
  }

  useEffect(() => { reload().catch((e) => setError(e.message)) }, [])

  const filtered = useMemo(() => {
    if (!objs) return []
    return objs.filter((o) => {
      if (kraFilter && String(o.kra_id) !== String(kraFilter)) return false
      if (q && !o.title.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [objs, kraFilter, q])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!objs) return <Spinner />

  const normTitles = new Map(objs.map((o) => [normalizeTitle(o.title), o.id]))
  const kraName = (id) => kras.find((k) => k.id === id)?.title || '—'

  async function save(e) {
    e.preventDefault()
    const title = editing.title.trim()
    if (!title || !editing.kra_id) return
    const dup = normTitles.get(normalizeTitle(title))
    if (dup && dup !== editing.id) toast(`Similar objective already exists (id ${dup})`, 'warn')
    try {
      if (editing.id) await updateObjective(editing.id, title, editing.kra_id)
      else await createObjective(title, editing.kra_id)
      toast('Saved')
      setEditing(null)
      await reload()
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  async function doDelete() {
    try {
      await deleteObjective(deleting.id)
      toast('Deleted')
      setDeleting(null)
      await reload()
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  return (
    <div className="stack">
      <header className="row between">
        <div>
          <h1>Objectives</h1>
          <p className="muted">{objs.length} objectives in the pool, grouped under KRAs.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ title: '', kra_id: kras[0]?.id || '' })}>+ New Objective</button>
      </header>

      <div className="row gap filters">
        <input placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={kraFilter} onChange={(e) => setKraFilter(e.target.value)}>
          <option value="">All KRAs</option>
          {kras.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>ID</th><th>Objective</th><th>KRA</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>
                  {o.title}
                  {isJunk(o.title) && <Badge tone="danger">junk</Badge>}
                </td>
                <td>{kraName(o.kra_id)}</td>
                <td className="right">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ id: o.id, title: o.title, kra_id: o.kra_id })}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleting(o)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="4" className="muted center">No objectives match.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? `Edit objective #${editing.id}` : 'New objective'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="stack">
            <Field label="Objective">
              <textarea rows={3} autoFocus value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. 1.1 Technical inputs provided towards developing the division plan…" />
            </Field>
            <Field label="KRA">
              <select value={editing.kra_id} onChange={(e) => setEditing({ ...editing, kra_id: Number(e.target.value) })}>
                {kras.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
              </select>
            </Field>
            <div className="row gap right">
              <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Confirm title={`Delete objective #${deleting.id}?`} message={`"${deleting.title}"`} onConfirm={doDelete} onCancel={() => setDeleting(null)} />
      )}
      <Toasts />
    </div>
  )
}