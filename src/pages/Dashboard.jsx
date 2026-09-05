import { useEffect, useState } from 'react'
import { fetchKras, fetchObjectives, fetchCompetencies, fetchTemplates, fetchIpcrfCount, setTemplateStatus } from '../lib/api'
import { findDuplicateGroups, isJunk } from '../lib/duplicates'
import { Spinner, StatCard, Badge, toast } from '../components/ui'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    Promise.all([fetchKras(), fetchObjectives(), fetchCompetencies(), fetchTemplates(), fetchIpcrfCount()])
      .then(([kras, objectives, competencies, templates, ipcrfCount]) => {
        if (!live) return
        setData({ kras, objectives, competencies, templates, ipcrfCount })
      })
      .catch((e) => live && setError(e.message))
    return () => { live = false }
  }, [])

  if (error) return <div className="alert alert-danger">Failed to load: {error}</div>
  if (!data) return <Spinner />

  const { kras, objectives, competencies, templates, ipcrfCount } = data

  const weightProblems = templates
    .map((t) => {
      const total = (t.objectives || []).reduce((s, r) => s + (Number(r.weight) || 0), 0)
      return { ...t, totalWeight: Math.round(total * 100) / 100 }
    })
    .filter((t) => t.status !== 'Disabled' && (t.objectives || []).length > 0 && Math.abs(t.totalWeight - 100) > 0.05)

  const junkKras = kras.filter((k) => isJunk(k.title)).length
  const junkObjs = objectives.filter((o) => isJunk(o.title)).length
  const dupKraGroups = findDuplicateGroups(kras).length
  const dupObjGroups = findDuplicateGroups(objectives).length

  const draftCount = templates.filter((t) => t.status === 'Draft' || !t.status).length
  const publishedCount = templates.length - draftCount

  async function onToggle(t) {
    const next = t.status === 'Disabled' ? '1st' : 'Disabled'
    try {
      await setTemplateStatus(t.id, next)
      toast(`Template #${t.id} → ${next}`)
      const updated = await fetchTemplates()
      setData((d) => ({ ...d, templates: updated }))
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  return (
    <div className="stack">
      <header>
        <h1>Dashboard</h1>
        <p className="muted">The state of the PMS module at a glance — and what needs attention.</p>
      </header>

      <div className="grid stats">
        <StatCard label="KRAs (Domains)" value={kras.length} hint={`${dupKraGroups} duplicate group(s)`} tone={dupKraGroups ? 'warn' : 'default'} />
        <StatCard label="Objectives" value={objectives.length} hint={`${dupObjGroups} duplicate group(s)`} tone={dupObjGroups ? 'warn' : 'default'} />
        <StatCard label="Competencies" value={competencies.length} />
        <StatCard label="Templates" value={templates.length} hint={`${publishedCount} active · ${draftCount} draft`} />
        <StatCard label="IPCRF forms issued" value={ipcrfCount} />
        <StatCard label="Junk / test entries" value={junkKras + junkObjs} hint="Lorem ipsum, Test2/3…" tone={junkKras + junkObjs ? 'danger' : 'default'} />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>⚠️ Weight problems</h2>
          <span className="muted">Templates whose objectives don't total 100%</span>
        </div>
        {weightProblems.length === 0 ? (
          <p className="muted">None — all active templates sum to 100%. </p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>#</th><th>Description</th><th>Type</th><th>Status</th><th>Total weight</th></tr>
            </thead>
            <tbody>
              {weightProblems.map((t) => (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td><a href={`#/templates/${t.id}`}>{t.description}</a></td>
                  <td><Badge>{t.type}</Badge></td>
                  <td><Badge tone={t.status === 'Disabled' ? 'gray' : 'green'}>{t.status || 'Draft'}</Badge></td>
                  <td><span className={Math.abs(t.totalWeight - 100) > 0.05 ? 'weight-bad' : 'weight-ok'}>{t.totalWeight}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Quick actions</h2>
        </div>
        <div className="grid actions">
          <a className="action-card" href="#/templates">
            <div className="action-icon">▤</div>
            <div><strong>Open templates</strong><p className="muted">Create, clone, publish</p></div>
          </a>
          <a className="action-card" href="#/duplicates">
            <div className="action-icon">⇄</div>
            <div><strong>Clean duplicates</strong><p className="muted">{dupKraGroups + dupObjGroups} group(s) to review</p></div>
          </a>
          <a className="action-card" href="#/improvements">
            <div className="action-icon">✦</div>
            <div><strong>Future improvements</strong><p className="muted">The simplification backlog</p></div>
          </a>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Recent templates</h2>
          <a href="#/templates" className="btn btn-sm">View all</a>
        </div>
        <table className="table">
          <thead>
            <tr><th>#</th><th>Description</th><th>Type</th><th>Status</th><th>Objectives</th><th></th></tr>
          </thead>
          <tbody>
            {templates.slice(0, 8).map((t) => (
              <tr key={t.id}>
                <td>#{t.id}</td>
                <td><a href={`#/templates/${t.id}`}>{t.description}</a></td>
                <td><Badge>{t.type}</Badge></td>
                <td><Badge tone={t.status === 'Disabled' ? 'gray' : 'green'}>{t.status || 'Draft'}</Badge></td>
                <td>{t.objectives?.length ?? 0}</td>
                <td className="right">
                  <button className="btn btn-ghost btn-sm" onClick={() => onToggle(t)}>
                    {t.status === 'Disabled' ? 'Enable' : 'Disable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}