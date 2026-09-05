import { useState } from 'react'
import { loadImprovements, saveImprovements, STATUS_LABELS } from '../lib/improvements'
import { Badge, toast, Toasts } from '../components/ui'

const TONE = { planned: 'gray', 'in-progress': 'blue', done: 'green' }

export default function Improvements() {
  const [items, setItems] = useState(loadImprovements)

  function update(id, patch) {
    const next = items.map((i) => (i.id === id ? { ...i, ...patch } : i))
    setItems(next)
    saveImprovements(next)
  }

  function cycle(id) {
    const order = ['planned', 'in-progress', 'done']
    const item = items.find((i) => i.id === id)
    const next = order[(order.indexOf(item.status) + 1) % order.length]
    update(id, { status: next })
    toast(`"${item.title}" → ${STATUS_LABELS[next]}`)
  }

  const counts = items.reduce((m, i) => { m[i.status] = (m[i.status] || 0) + 1; return m }, {})

  return (
    <div className="stack">
      <header className="row between">
        <div>
          <h1>Future Improvements</h1>
          <p className="muted">The simplification backlog for the PMS module. Click the status chip to cycle: planned → in-progress → done.</p>
        </div>
        <div className="row gap">
          <Badge tone="gray">{counts.planned || 0} planned</Badge>
          <Badge tone="blue">{counts['in-progress'] || 0} in progress</Badge>
          <Badge tone="green">{counts.done || 0} done</Badge>
        </div>
      </header>

      <div className="stack">
        {items.map((i) => (
          <section className="card imp-row" key={i.id}>
            <div className="row between">
              <h2>{i.title}</h2>
              <button className="chip status-chip" onClick={() => cycle(i.id)} title="Click to change status">
                {STATUS_LABELS[i.status]}
              </button>
            </div>
            <p className="muted">{i.desc}</p>
            <textarea
              rows={2}
              placeholder="Notes…"
              value={i.notes || ''}
              onChange={(e) => update(i.id, { notes: e.target.value })}
              className="notes"
            />
          </section>
        ))}
      </div>

      <section className="card">
        <p className="muted">
          These come from the audit of the live PMS module. Notes and status are stored in this browser only (localStorage).
        </p>
      </section>
      <Toasts />
    </div>
  )
}