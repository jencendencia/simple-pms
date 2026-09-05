import { useEffect, useState } from 'react'
import { fetchKras, createKra, updateKra, deleteKra, fetchObjectives } from '../lib/api'
import { normalizeTitle, isJunk } from '../lib/duplicates'
import { Spinner, Modal, Confirm, toast, Toasts, Field, Badge } from '../components/ui'

export default function KRAs() {
  const [kras, setKras] = useState(null)
  const [objectives, setObjectives] = useState([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // {id?, title}
  const [deleting, setDeleting] = useState(null)

  async function reload() {
    const [k, o] = await Promise.all([fetchKras(), fetchObjectives()])
    setKras(k)
    setObjectives(o)
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!kras) return <Spinner />

  const titles = new Map(kras.map((k) => [normalizeTitle(k.title), k.id]))
  const counts = objectives.reduce((m, o) => m.set(o.kra_id, (m.get(o.kra_id) || 0) + 1), new Map())

  async function save(e) {
    e.preventDefault()
    const title = editing.title.trim()
    if (!title) return
    const norm = normalizeTitle(title)
    const dup = titles.get(norm)
    if (dup && dup !== editing.id) {
      toast(`Similar KRA already exists (id ${dup}) — possible duplicate`, 'warn')
    }
    try {
      if (editing.id) await updateKra(editing.id, title)
      else await createKra(title)
      toast('Saved')
      setEditing(null)
      await reload()
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  async function doDelete() {
    try {
      await deleteKra(deleting.id)
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
          <h1>KRAs (Domains)</h1>
          <p className="muted">{kras.length} domains in the pool. The "essence" of each title is checked for duplicates on save.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ title: '' })}>+ New KRA</button>
      </header>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>ID</th><th>Title</th><th>Objectives</th><th></th></tr>
          </thead>
          <tbody>
            {kras.map((k) => {
              const flagged = isJunk(k.title)
              return (
                <tr key={k.id}>
                  <td>#{k.id}</td>
                  <td>
                    {k.title}
                    {flagged && <Badge tone="danger">junk</Badge>}
                  </td>
                  <td>{counts.get(k.id) || 0}</td>
                  <td className="right">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ id: k.id, title: k.title })}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleting(k)} disabled={(counts.get(k.id) || 0) > 0} title={counts.get(k.id) ? 'Has objectives — merge it on the Duplicates page first' : ''}>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? `Edit KRA #${editing.id}` : 'New KRA'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="stack">
            <Field label="Title">
              <input autoFocus value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. KRA 1: Content Knowledge and Pedagogy" />
            </Field>
            <div className="row gap right">
              <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Confirm
          title={`Delete KRA #${deleting.id}?`}
          message={`"${deleting.title}"`}
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
      <Toasts />
    </div>
  )
}