import { useEffect, useState } from 'react'
import { fetchCompetencies, createCompetency, updateCompetency, deleteCompetency, createCompetencyItem, deleteCompetencyItem } from '../lib/api'
import { Spinner, Modal, Confirm, toast, Toasts, Badge, Field } from '../components/ui'

export default function Competencies() {
  const [comps, setComps] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // {id?, title, type}
  const [deleting, setDeleting] = useState(null)
  const [itemFor, setItemFor] = useState(null) // competency id to add item to
  const [newItem, setNewItem] = useState('')
  const [delItem, setDelItem] = useState(null)

  async function reload() {
    setComps(await fetchCompetencies())
  }
  useEffect(() => { reload().catch((e) => setError(e.message)) }, [])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!comps) return <Spinner />

  async function save(e) {
    e.preventDefault()
    try {
      if (editing.id) await updateCompetency(editing.id, editing.title, editing.type)
      else await createCompetency(editing.title, editing.type)
      toast('Saved')
      setEditing(null)
      await reload()
    } catch (err) { toast(err.message, 'err') }
  }

  async function doDeleteComp() {
    try {
      await deleteCompetency(deleting.id)
      toast('Deleted')
      setDeleting(null)
      await reload()
    } catch (err) { toast(err.message, 'err') }
  }

  async function addItem(e) {
    e.preventDefault()
    if (!newItem.trim()) return
    try {
      await createCompetencyItem(newItem.trim(), itemFor)
      toast('Item added')
      setNewItem('')
      setItemFor(null)
      await reload()
    } catch (err) { toast(err.message, 'err') }
  }

  async function doDelItem() {
    try {
      await deleteCompetencyItem(delItem.id)
      toast('Item deleted')
      setDelItem(null)
      await reload()
    } catch (err) { toast(err.message, 'err') }
  }

  return (
    <div className="stack">
      <header className="row between">
        <div>
          <h1>Competencies</h1>
          <p className="muted">{comps.length} competencies, each with indicators (items).</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ title: '', type: 'Core Behavioral' })}>+ New Competency</button>
      </header>

      {comps.map((c) => (
        <section className="card" key={c.id}>
          <div className="row between">
            <h2>
              {c.title} <Badge tone={c.type === 'Core Behavioral' ? 'blue' : 'purple'}>{c.type}</Badge>
            </h2>
            <div className="row gap">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ id: c.id, title: c.title, type: c.type })}>Edit</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setItemFor(c.id); setNewItem('') }}>+ Item</button>
              <button className="btn btn-danger btn-sm" onClick={() => setDeleting(c)}>Delete</button>
            </div>
          </div>
          <ul className="item-list">
            {(c.compentency_items || []).map((it) => (
              <li key={it.id}>
                <span>{it.title}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setDelItem(it)}>✕</button>
              </li>
            ))}
            {!c.compentency_items?.length && <li className="muted">No items yet.</li>}
          </ul>
        </section>
      ))}

      {editing && (
        <Modal title={editing.id ? `Edit #${editing.id}` : 'New competency'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="stack">
            <Field label="Title"><input autoFocus value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <Field label="Type">
              <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                <option>Core Behavioral</option>
                <option>Staff</option>
              </select>
            </Field>
            <div className="row gap right">
              <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {itemFor && (
        <Modal title="Add indicator item" onClose={() => setItemFor(null)}>
          <form onSubmit={addItem} className="stack">
            <Field label="Item"><input autoFocus value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="e.g. Demonstrates professionalism…" /></Field>
            <div className="row gap right">
              <button type="button" className="btn" onClick={() => setItemFor(null)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Add</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && <Confirm title="Delete competency?" message={`"${deleting.title}" and its items will be removed from templates that use it.`} onConfirm={doDeleteComp} onCancel={() => setDeleting(null)} />}
      {delItem && <Confirm title="Delete item?" message={`"${delItem.title}"`} onConfirm={doDelItem} onCancel={() => setDelItem(null)} />}
      <Toasts />
    </div>
  )
}