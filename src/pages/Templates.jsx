import { useEffect, useState } from 'react'
import { fetchTemplates, createTemplate, cloneTemplate, deleteTemplate, fetchPositions } from '../lib/api'
import { Spinner, Modal, Confirm, toast, Toasts, Badge, Field } from '../components/ui'

export default function Templates() {
  const [templates, setTemplates] = useState(null)
  const [positions, setPositions] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [cloning, setCloning] = useState(null) // template being cloned
  const [cloneName, setCloneName] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({ description: '', type: 'IPCRF', positionIds: [] })

  async function reload() {
    const [t, p] = await Promise.all([fetchTemplates(), fetchPositions()])
    setTemplates(t)
    setPositions(p)
  }
  useEffect(() => { reload().catch((e) => setError(e.message)) }, [])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!templates) return <Spinner />

  const weightOf = (t) => Math.round((t.objectives || []).reduce((s, r) => s + (Number(r.weight) || 0), 0) * 100) / 100

  async function onCreate(e) {
    e.preventDefault()
    if (!form.description.trim()) return
    try {
      const t = await createTemplate({ description: form.description.trim(), type: form.type, positionIds: form.positionIds })
      toast(`Template #${t.id} created`)
      setCreating(false)
      await reload()
      window.location.hash = `/templates/${t.id}`
    } catch (err) { toast(err.message, 'err') }
  }

  function openClone(t) {
    setCloning(t)
    const year = new Date().getFullYear() + 1
    setCloneName(`${t.description.replace(/\s*\d{4}(-\d{4})?.*$/, '')} ${year}${t.description.includes('-') ? '' : ''}`.trim() || `${t.description} (clone ${year})`)
  }

  async function doClone() {
    try {
      const t = await cloneTemplate(cloning, cloneName.trim() || `${cloning.description} (clone)`)
      toast(`Cloned → template #${t.id}`)
      setCloning(null)
      await reload()
      window.location.hash = `/templates/${t.id}`
    } catch (err) { toast(err.message, 'err') }
  }

  async function doDelete() {
    try {
      await deleteTemplate(deleting.id)
      toast('Deleted')
      setDeleting(null)
      await reload()
    } catch (err) { toast(err.message, 'err') }
  }

  function togglePosition(id) {
    setForm((f) => ({
      ...f,
      positionIds: f.positionIds.includes(id) ? f.positionIds.filter((x) => x !== id) : [...f.positionIds, id],
    }))
  }

  return (
    <div className="stack">
      <header className="row between">
        <div>
          <h1>IPCRF / OPCRF Templates</h1>
          <p className="muted">The annual rebuild is now a clone. Weight totals are checked live; anything ≠ 100% is flagged.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ description: '', type: 'IPCRF', positionIds: [] }); setCreating(true) }}>+ New Template</button>
      </header>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Description</th><th>Type</th><th>Status</th><th>Objectives</th><th>Weight</th><th>Positions</th><th></th></tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const w = weightOf(t)
              const hasObjs = (t.objectives || []).length > 0
              return (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td><a href={`#/templates/${t.id}`}>{t.description}</a></td>
                  <td><Badge>{t.type}</Badge></td>
                  <td><Badge tone={t.status === 'Disabled' ? 'gray' : 'green'}>{t.status || 'Draft'}</Badge></td>
                  <td>{hasObjs ? t.objectives.length : '—'}</td>
                  <td>
                    {hasObjs ? (
                      <span className={Math.abs(w - 100) > 0.05 ? 'weight-bad' : 'weight-ok'}>{w}%</span>
                    ) : '—'}
                  </td>
                  <td className="muted">{(t.positions || []).map((p) => p.position?.name).filter(Boolean).join(', ') || '—'}</td>
                  <td className="right">
                    <a className="btn btn-ghost btn-sm" href={`#/templates/${t.id}`}>Open</a>
                    <button className="btn btn-ghost btn-sm" onClick={() => openClone(t)}>Clone</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleting(t)}>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal title="New template" onClose={() => setCreating(false)} wide>
          <form onSubmit={onCreate} className="stack">
            <Field label="Description">
              <input autoFocus value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. IPCRF 2026 Teacher I-VII (Proficient Teachers)" />
            </Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option>IPCRF</option>
                <option>OPCRF</option>
              </select>
            </Field>
            <Field label={`Positions (${form.positionIds.length} selected)`}>
              <div className="chip-pick">
                {positions.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`chip ${form.positionIds.includes(p.id) ? 'chip-on' : ''}`}
                    onClick={() => togglePosition(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </Field>
            <div className="row gap right">
              <button type="button" className="btn" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Create</button>
            </div>
          </form>
        </Modal>
      )}

      {cloning && (
        <Modal title={`Clone template #${cloning.id}`} onClose={() => setCloning(null)}>
          <form onSubmit={(e) => { e.preventDefault(); doClone() }} className="stack">
            <p className="muted">
              Copies the description, positions, <strong>{cloning.objectives?.length || 0} objectives</strong> (with weights, targets and rubric text) and <strong>{cloning.competencies?.length || 0} competencies</strong>. The clone starts as a Draft.
            </p>
            <Field label="New description">
              <input autoFocus value={cloneName} onChange={(e) => setCloneName(e.target.value)} />
            </Field>
            <div className="row gap right">
              <button type="button" className="btn" onClick={() => setCloning(null)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Clone</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Confirm
          title={`Delete template #${deleting.id}?`}
          message={`"${deleting.description}" — removes its positions, objectives and competencies links.`}
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
      <Toasts />
    </div>
  )
}