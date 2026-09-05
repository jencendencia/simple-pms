import { useEffect, useMemo, useState } from 'react'
import {
  fetchTemplate, fetchObjectives, fetchKras, fetchPositions, fetchCompetencies, fetchTemplates,
  updateTemplate, setTemplateStatus, deleteTemplate, cloneTemplate,
  addTemplateObjective, updateTemplateObjective, removeTemplateObjective, normalizeWeights, copyObjectivesFromTemplate,
  addTemplateCompetency, removeTemplateCompetency, setTemplatePositions,
  DEFAULT_RUBRIC,
} from '../lib/api'
import { Spinner, Modal, Confirm, toast, Toasts, Badge, Field } from '../components/ui'

const RUBRIC_FIELDS = [
  ['quality', 'Quality'],
  ['efficiency', 'Efficiency'],
  ['timeliness', 'Timeliness'],
]

export default function TemplateDetail({ id }) {
  const [tpl, setTpl] = useState(null)
  const [objectives, setObjectives] = useState([])
  const [kras, setKras] = useState([])
  const [positions, setPositions] = useState([])
  const [competencies, setCompetencies] = useState([])
  const [templates, setTemplates] = useState([])
  const [error, setError] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [copyOpen, setCopyOpen] = useState(false)
  const [compOpen, setCompOpen] = useState(false)
  const [posOpen, setPosOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [cloneName, setCloneName] = useState('')
  const [busy, setBusy] = useState(false)

  // add-objective form state
  const [pick, setPick] = useState('')
  const [weight, setWeight] = useState('')
  const [target, setTarget] = useState('')
  const [timeline, setTimeline] = useState('')
  const [rubric, setRubric] = useState({ ...DEFAULT_RUBRIC })

  async function reload() {
    const [t, o, k, p, c, all] = await Promise.all([
      fetchTemplate(id), fetchObjectives(), fetchKras(), fetchPositions(), fetchCompetencies(), fetchTemplates(),
    ])
    setTpl(t)
    setObjectives(o)
    setKras(k)
    setPositions(p)
    setCompetencies(c)
    setTemplates(all)
  }

  useEffect(() => { reload().catch((e) => setError(e.message)) }, [id])

  const totalWeight = useMemo(
    () => Math.round((tpl?.objectives || []).reduce((s, r) => s + (Number(r.weight) || 0), 0) * 100) / 100,
    [tpl]
  )

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!tpl) return <Spinner />

  const kraName = (id) => kras.find((k) => k.id === id)?.title || '—'
  const objTitle = (oid) => objectives.find((o) => o.id === oid)?.title || `(objective ${oid})`
  const weightOk = Math.abs(totalWeight - 100) <= 0.05

  async function onPublish(next) {
    try {
      if (next && !weightOk && tpl.objectives.length > 0) {
        toast(`Weight is ${totalWeight}% — fix it before publishing (or use "Normalize").`, 'warn')
        return
      }
      await setTemplateStatus(tpl.id, next)
      toast(next === 'Disabled' ? 'Disabled' : 'Published')
      await reload()
    } catch (e) { toast(e.message, 'err') }
  }

  async function onClone() {
    try {
      const t = await cloneTemplate(tpl, cloneName.trim() || `${tpl.description} (clone)`)
      toast(`Cloned → template #${t.id}`)
      window.location.hash = `/templates/${t.id}`
    } catch (e) { toast(e.message, 'err') }
  }

  async function onDelete() {
    try {
      await deleteTemplate(tpl.id)
      toast('Deleted')
      window.location.hash = '/templates'
    } catch (e) { toast(e.message, 'err') }
  }

  function openAdd() {
    setPick('')
    setWeight('')
    setTarget('')
    setTimeline('')
    setRubric({ ...DEFAULT_RUBRIC })
    setAddOpen(true)
  }

  async function onAdd(e) {
    e.preventDefault()
    if (!pick) return toast('Pick an objective', 'warn')
    try {
      await addTemplateObjective(tpl.id, {
        objective_id: Number(pick),
        target,
        timeline,
        weight: Number(weight) || 0,
        rubric,
      })
      toast('Objective added')
      setAddOpen(false)
      await reload()
    } catch (e) { toast(e.message, 'err') }
  }

  async function onSaveRow(e) {
    e.preventDefault()
    try {
      const { id: rowId, objective_id, target: tg, timeline: tl, weight: w, ...rub } = editRow
      await updateTemplateObjective(rowId, { target: tg, timeline: tl, weight: Number(w) || 0, ...rub })
      toast('Saved')
      setEditRow(null)
      await reload()
    } catch (e) { toast(e.message, 'err') }
  }

  async function onRemoveRow(row) {
    try {
      await removeTemplateObjective(row.id)
      toast('Removed')
      await reload()
    } catch (e) { toast(e.message, 'err') }
  }

  async function onNormalize() {
    try {
      const n = await normalizeWeights(tpl.id, tpl.objectives)
      toast(`Weights normalized (${n} objectives) → 100%`)
      await reload()
    } catch (e) { toast(e.message, 'err') }
  }

  async function onCopy() {
    try {
      const src = templates.find((t) => String(t.id) === String(copyOpen))
      if (!src) return
      await copyObjectivesFromTemplate(tpl.id, src)
      toast(`Copied ${src.objectives?.length || 0} objective(s) from #${src.id}`)
      setCopyOpen(false)
      await reload()
    } catch (e) { toast(e.message, 'err') }
  }

  async function onAddComp(compId) {
    try {
      await addTemplateCompetency(tpl.id, compId)
      toast('Competency added')
      setCompOpen(false)
      await reload()
    } catch (e) { toast(e.message, 'err') }
  }

  async function onRemoveComp(link) {
    try {
      await removeTemplateCompetency(link.id)
      toast('Removed')
      await reload()
    } catch (e) { toast(e.message, 'err') }
  }

  async function onSavePositions(ids) {
    try {
      await setTemplatePositions(tpl.id, ids)
      toast('Positions saved')
      setPosOpen(false)
      await reload()
    } catch (e) { toast(e.message, 'err') }
  }

  const selectedCompIds = new Set((tpl.competencies || []).map((c) => c.competency_id))

  return (
    <div className="stack">
      <div className="row between">
        <a className="muted" href="#/templates">← All templates</a>
        <div className="row gap">
          <button className="btn btn-ghost btn-sm" onClick={() => { setCloneName(`${tpl.description} (clone)`); setCloneOpen(true) }}>Clone</button>
          {tpl.status === 'Disabled'
            ? <button className="btn btn-sm" onClick={() => onPublish(tpl.status === 'Disabled' ? '1st' : tpl.status)}>Enable</button>
            : <button className="btn btn-primary btn-sm" onClick={() => onPublish(tpl.status === 'Draft' || !tpl.status ? '1st' : 'Disabled')}>
                {tpl.status === 'Draft' || !tpl.status ? 'Publish' : 'Disable'}
              </button>}
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>Delete</button>
        </div>
      </div>

      <header>
        <h1>#{tpl.id} {tpl.description}</h1>
        <div className="row gap">
          <Badge>{tpl.type}</Badge>
          <Badge tone={tpl.status === 'Disabled' ? 'gray' : 'green'}>{tpl.status || 'Draft'}</Badge>
        </div>
      </header>

      <section className={`card weight-card ${weightOk ? '' : 'weight-card-bad'}`}>
        <div className="row between">
          <div>
            <div className="stat-label">Total objective weight</div>
            <div className="stat-value">{totalWeight}%</div>
          </div>
          <div className="row gap">
            {!weightOk && <span className="muted">Should total 100%.</span>}
            {tpl.objectives.length > 0 && <button className="btn btn-sm" onClick={onNormalize} disabled={busy}>⟳ Normalize to 100%</button>}
          </div>
        </div>
        <div className="weight-bar">
          <div className="weight-fill" style={{ width: `${Math.min(totalWeight, 100)}%` }} />
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Objectives ({tpl.objectives?.length || 0})</h2>
          <div className="row gap">
            <button className="btn btn-sm" onClick={() => setCopyOpen(true)} disabled={templates.length < 2}>Copy from template…</button>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add objective</button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr><th>Objective</th><th>KRA</th><th>Weight</th><th>Target</th><th>Timeline</th><th>Q/E/T</th><th></th></tr>
          </thead>
          <tbody>
            {(tpl.objectives || []).map((r) => (
              <tr key={r.id}>
                <td>{objTitle(r.objective_id)}</td>
                <td className="muted">{kraName(objectives.find((o) => o.id === r.objective_id)?.kra_id)}</td>
                <td><span className={Math.abs(Number(r.weight) || 0) === 0 ? 'weight-bad' : ''}>{r.weight}%</span></td>
                <td>{r.target || '—'}</td>
                <td>{r.timeline || '—'}</td>
                <td className="muted">{[r.quality, r.efficiency, r.timeliness].map((v) => (v ? '✓' : '✕')).join(' ')}</td>
                <td className="right">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditRow({ ...r })}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => onRemoveRow(r)}>✕</button>
                </td>
              </tr>
            ))}
            {!tpl.objectives?.length && <tr><td colSpan="7" className="muted center">No objectives yet — add one or copy from an existing template.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Competencies ({tpl.competencies?.length || 0})</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setCompOpen(true)}>+ Add competency</button>
        </div>
        {(tpl.competencies || []).map((c) => (
          <div className="row between item-list-row" key={c.id}>
            <span>{c.competency?.title || `(competency ${c.competency_id})`}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onRemoveComp(c)}>✕</button>
          </div>
        ))}
        {!tpl.competencies?.length && <p className="muted">No competencies yet.</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Positions ({tpl.positions?.length || 0})</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setPosOpen(true)}>Edit</button>
        </div>
        <p className="muted">{(tpl.positions || []).map((p) => p.position?.name).filter(Boolean).join(', ') || 'Not set — this template applies to any position.'}</p>
      </section>

      {/* Add objective */}
      {addOpen && (
        <Modal title="Add objective" onClose={() => setAddOpen(false)} wide>
          <form onSubmit={onAdd} className="stack">
            <Field label="Objective (search)">
              <input autoFocus list="obj-options" value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Type to filter…" />
              <datalist id="obj-options">
                {objectives.map((o) => <option key={o.id} value={o.id}>{`#${o.id} — ${o.title}`}</option>)}
              </datalist>
            </Field>
            <div className="grid three">
              <Field label="Weight %"><input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 15" /></Field>
              <Field label="Target"><input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 4 M&E reports" /></Field>
              <Field label="Timeline"><input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. Quarterly" /></Field>
            </div>
            <RubricEditor value={rubric} onChange={setRubric} />
            <div className="row gap right">
              <button type="button" className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Add</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit objective row */}
      {editRow && (
        <Modal title="Edit objective" onClose={() => setEditRow(null)} wide>
          <form onSubmit={onSaveRow} className="stack">
            <p className="muted">{objTitle(editRow.objective_id)}</p>
            <div className="grid three">
              <Field label="Weight %"><input type="number" step="0.01" value={editRow.weight} onChange={(e) => setEditRow({ ...editRow, weight: e.target.value })} /></Field>
              <Field label="Target"><input value={editRow.target || ''} onChange={(e) => setEditRow({ ...editRow, target: e.target.value })} /></Field>
              <Field label="Timeline"><input value={editRow.timeline || ''} onChange={(e) => setEditRow({ ...editRow, timeline: e.target.value })} /></Field>
            </div>
            <RubricEditor value={editRow} onChange={(patch) => setEditRow({ ...editRow, ...patch })} />
            <div className="row gap right">
              <button type="button" className="btn" onClick={() => setEditRow(null)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Copy from another template */}
      {copyOpen && (
        <Modal title="Copy objectives from another template" onClose={() => setCopyOpen(false)}>
          <div className="stack">
            <Field label="Source template">
              <select value={copyOpen} onChange={(e) => setCopyOpen(e.target.value)}>
                <option value="">Choose…</option>
                {templates.filter((t) => String(t.id) !== String(tpl.id)).map((t) => (
                  <option key={t.id} value={t.id}>#{t.id} {t.description} ({t.objectives?.length || 0} objectives)</option>
                ))}
              </select>
            </Field>
            <p className="muted">Copies the objectives with their weights, targets, timelines and rubric text.</p>
            <div className="row gap right">
              <button className="btn" onClick={() => setCopyOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={onCopy} disabled={!copyOpen}>Copy</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add competency */}
      {compOpen && (
        <Modal title="Add competency" onClose={() => setCompOpen(false)}>
          <div className="stack">
            {competencies.filter((c) => !selectedCompIds.has(c.id)).map((c) => (
              <button key={c.id} className="pick-row" onClick={() => onAddComp(c.id)}>
                {c.title} <Badge tone={c.type === 'Core Behavioral' ? 'blue' : 'purple'}>{c.type}</Badge>
              </button>
            ))}
            {competencies.every((c) => selectedCompIds.has(c.id)) && <p className="muted">All competencies are already on this template.</p>}
          </div>
        </Modal>
      )}

      {/* Positions */}
      {posOpen && <PositionsEditor positions={positions} current={tpl.positions || []} onSave={onSavePositions} onClose={() => setPosOpen(false)} />}

      {cloneOpen && (
        <Modal title="Clone this template" onClose={() => setCloneOpen(false)}>
          <form onSubmit={(e) => { e.preventDefault(); onClone() }} className="stack">
            <Field label="New description"><input autoFocus value={cloneName} onChange={(e) => setCloneName(e.target.value)} /></Field>
            <div className="row gap right">
              <button type="button" className="btn" onClick={() => setCloneOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Clone</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Confirm title="Delete this template?" message="Removes its positions, objectives and competencies links." onConfirm={onDelete} onCancel={() => setConfirmDelete(false)} />
      )}
      <Toasts />
    </div>
  )
}

function RubricEditor({ value, onChange }) {
  return (
    <div className="rubric">
      <div className="stat-label">Rating rubric (pre-filled with standard wording)</div>
      {RUBRIC_FIELDS.map(([key, label]) => (
        <div className="rubric-block" key={key}>
          <div className="row between">
            <strong>{label}</strong>
            <label className="check">
              <input
                type="checkbox"
                checked={!!value[key]}
                onChange={(e) => onChange({ [key]: e.target.checked })}
              />
              Rate this
            </label>
          </div>
          <div className="grid five">
            {['outstanding', 'very_satisfactory', 'satisfactory', 'unsatisfactory', 'poor'].map((grade) => (
              <Field key={grade} label={grade.replace('_', ' ')}>
                <input value={value[`${key}_${grade}`] || ''} onChange={(e) => onChange({ [`${key}_${grade}`]: e.target.value })} />
              </Field>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PositionsEditor({ positions, current, onSave, onClose }) {
  const [ids, setIds] = useState(current.map((p) => p.position_id))
  function toggle(id) {
    setIds((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))
  }
  return (
    <Modal title="Edit positions" onClose={onClose} wide>
      <div className="stack">
        <div className="chip-pick">
          {positions.map((p) => (
            <button type="button" key={p.id} className={`chip ${ids.includes(p.id) ? 'chip-on' : ''}`} onClick={() => toggle(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="row gap right">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(ids)}>Save ({ids.length})</button>
        </div>
      </div>
    </Modal>
  )
}