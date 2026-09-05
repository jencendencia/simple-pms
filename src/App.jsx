import { useEffect, useState } from 'react'
import { getSession, onAuthChange, logout } from './lib/supabase'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import KRAs from './pages/KRAs.jsx'
import Objectives from './pages/Objectives.jsx'
import Competencies from './pages/Competencies.jsx'
import Templates from './pages/Templates.jsx'
import TemplateDetail from './pages/TemplateDetail.jsx'
import Duplicates from './pages/Duplicates.jsx'
import Improvements from './pages/Improvements.jsx'

function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    const onChange = () => setRoute(window.location.hash.slice(1) || '/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

const NAV = [
  { path: '/', label: 'Dashboard', icon: '▦' },
  { path: '/kras', label: 'KRAs (Domains)', icon: '◧' },
  { path: '/objectives', label: 'Objectives', icon: '☑' },
  { path: '/competencies', label: 'Competencies', icon: '◆' },
  { path: '/templates', label: 'IPCRF/OPCRF Templates', icon: '▤' },
  { path: '/duplicates', label: 'Duplicates', icon: '⇄' },
  { path: '/improvements', label: 'Future Improvements', icon: '✦' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [booted, setBooted] = useState(false)
  const route = useHashRoute()

  useEffect(() => {
    getSession().then((s) => {
      setSession(s)
      setBooted(true)
    })
    const unsub = onAuthChange((s) => setSession(s))
    return unsub
  }, [])

  if (!booted) return <div className="boot">Loading…</div>

  if (!session) return <Login />

  const page =
    route.startsWith('/templates/')
      ? <TemplateDetail id={route.split('/')[2]} />
      : route === '/'
        ? <Dashboard />
        : route === '/kras'
          ? <KRAs />
          : route === '/objectives'
            ? <Objectives />
            : route === '/competencies'
              ? <Competencies />
              : route === '/templates'
                ? <Templates />
                : route === '/duplicates'
                  ? <Duplicates />
                  : route === '/improvements'
                    ? <Improvements />
                    : <Dashboard />

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <div>
            <div className="brand-name">PMS Simplify</div>
            <div className="brand-sub">ePRIME helper</div>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <a key={n.path} href={`#${n.path}`} className={route === n.path || route.startsWith(n.path + '/') ? 'active' : ''}>
              <span className="nav-icon">{n.icon}</span> {n.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">{session.user.email}</div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="content">{page}</main>
    </div>
  )
}