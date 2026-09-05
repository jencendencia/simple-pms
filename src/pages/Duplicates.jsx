import { useEffect, useState } from 'react'
import { fetchKras, fetchObjectives, fetchCompetencies, fetchTemplates, mergeKra, mergeObjective, mergeCompetency } from '../lib/api'
import { findDuplicateGroups, isJunk, similarity, normalizeTitle } from '../lib/duplicates'
import { Spinner, Confirm, toast, Toasts, Badge } from '../components/ui'

export default function Duplicates() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [merge, setMerge] = useState(null) // {kind, from, to}
  const [busyId, setBusyId] = useState(null)

  async function reload() {
    const [kras, objectives, competencies, templates] = await Promise.all([
      fetchKras(), fetchObjectives(), fetchCompetencies(), fetchTemplates(),
    ])
    setData({ kras, objectives, competencies, templates })
  }
  useEffect(() => { reload().catch((e) => setError(e.message)) }, [])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!data) return <Spinner />

  const { kras, objectives, competencies, templates } = data

  const kraGroups = findDuplicateGroups(kras)
  const objGroups = findDuplicateGroups(objectives)
  const junkKras = kras.filter((k) => isJunk(k.title))
  const junkObjs = objectives.filter((o) => isJunk(o.title))
  const compGroups = findDuplicateGroups(competencies)

  // how many templates reference a given objective
  const objRefs = new Map()
  for (const t of templates) for (const r of t.objectives || []) objRefs.set(r.objective_id, (objRefs.get(r.objective_id) || 0) + 1)
  const kraObjCounts = objectives.reduce((m, o) => m.set(o.kra_id, (m.get(o.kra_id) || 0) + 1), new Map())

  async function doMerge() {
    setBusyId(`${merge.kind}-${merge.from.id}`)
    try {
      if (merge.kind === 'kra') await mergeKra(merge.from.id, merge.to.id)
      else if (merge.kind === 'objective') await mergeObjective(merge.from.id, merge.to.id)
      else if (merge.kind === 'competency') await mergeCompetency(merge.from.id, merge.to.id)
      toast(`Merged #${merge.from.id} → #${merge.to.id}`)
      setMerge(null)
      await reload()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setBusyId(null)
    }
  }

  function GroupCard({ title, groups, kind }) {
    if (!groups.length) return null
    return (
      <section className="card">
        <div className="card-head">
          <h2>{title} <Badge tone="warn">{groups.length} group(s)</Badge></h2>
        </div>
        {groups.map((g, gi) => (
          <div className="dup-group" key={`${g.key}-${gi}`}>
            <div className="dup-head">
              <span><Badge tone={g.kind === 'exact' ? 'red' : 'purple'}>{g.kind === 'exact' ? 'exact' : 'similar'}</Badge> {normalizeTitle(g.items[0].title) || '?'}</span>
              <span className="muted">{g.items.length} entries</span>
            </div>
            <table className="table">
              <tbody>
                {g.items.map((item) => (
                  <tr key={item.id}>
                    <td className="narrow">#{item.id}</td>
                    <td>
                      {item.title}
                      {kind === 'kra' && <span className="muted"> · {kraObjCounts.get(item.id) || 0} objectives</span>}
                      {kind === 'objective' && objRefs.get(item.id) ? <span className="muted"> · in {objRefs.get(item.id)} template(s)</span> : null}
                    </td>
                    <td className="narrow right">
                      {item.id !== g.canonical.id && (
                        <button className="btn btn-sm" disabled={busyId === `${kind}-${item.id}`} onClick={() => setMerge({ kind, from: item, to: g.canonical })}>
                          Merge into #{g.canonical.id}
                        </button>
                      )}
                      {item.id === g.canonical.id && <Badge tone="green">keep</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>
    )
  }

  return (
    <div className="stack">
      <header>
        <h1>Duplicates</h1>
        <p className="muted">
          Groups of KRAs / objectives / competencies whose titles match exactly or are very similar.
          "Merge" repoints all references (objectives under a KRA, template links) to the kept entry, then deletes the duplicate.
        </p>
      </header>

      {(junkKras.length > 0 || junkObjs.length > 0) && (
        <section className="card card-warn">
          <div className="card-head"><h2>🧹 Junk / test entries</h2></div>
          <p className="muted">
            {junkKras.map((k) => `KRA #${k.id} "${k.title}"`).join(' · ') || 'No junk KRAs.'}
            {junkKras.length && junkObjs.length ? <><br /></> : null}
            {junkObjs.map((o) => `Objective #${o.id} "${o.title.slice(0, 60)}"`).join(' · ') || 'No junk objectives.'}
          </p>
          <p className="muted">Delete these from the KRAs / Objectives pages (they're flagged with a "junk" badge).</p>
        </section>
      )}

      <GroupCard title="Duplicate KRAs (Domains)" groups={kraGroups} kind="kra" />
      <GroupCard title="Duplicate Objectives" groups={objGroups} kind="objective" />
      <GroupCard title="Duplicate Competencies" groups={compGroups} kind="competency" />

      {kraGroups.length + objGroups.length + compGroups.length === 0 && (
        <section className="card"><p className="muted">No duplicates found. 🎉</p></section>
      )}

      {merge && (
        <Confirm
          title={`Merge #${merge.from.id} into #${merge.to.id}?`}
          message={
            merge.kind === 'kra'
              ? `"${merge.from.title}" — its ${kraObjCounts.get(merge.from.id) || 0} objective(s) will move to "${merge.to.title}", then the KRA is deleted.`
              : merge.kind === 'objective'
                ? `"${merge.from.title}" — template links (${objRefs.get(merge.from.id) || 0}) will point to "${merge.to.title}", then the objective is deleted.`
                : `"${merge.from.title}" — template links and items will point to "${merge.to.title}", then the competency is deleted.`
          }
          confirmLabel="Merge & delete"
          onConfirm={doMerge}
          onCancel={() => setMerge(null)}
        />
      )}
      <Toasts />
    </div>
  )
}