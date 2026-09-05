import { useState } from 'react'

export function Spinner({ label = 'Loading…' }) {
  return <div className="spinner-row"><span className="spinner" /> {label}</div>
}

export function Badge({ children, tone = 'gray' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function StatCard({ label, value, hint, tone }) {
  return (
    <div className={`stat stat-${tone || 'default'}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

export function EmptyState({ children }) {
  return <div className="empty">{children}</div>
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Confirm({ title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="confirm-msg">{message}</p>
      <div className="row gap right">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className={`btn btn-${tone}`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}

let toastQueue = []
const toastSubs = new Set()

export function toast(msg, tone = 'ok') {
  const id = Math.random().toString(36).slice(2)
  toastQueue = [...toastQueue, { id, msg, tone }]
  toastSubs.forEach((fn) => fn(toastQueue))
  setTimeout(() => {
    toastQueue = toastQueue.filter((t) => t.id !== id)
    toastSubs.forEach((fn) => fn(toastQueue))
  }, 4000)
}

export function Toasts() {
  const [items, setItems] = useState([])
  useState(() => {
    toastSubs.add(setItems)
    return () => toastSubs.delete(setItems)
  })
  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>{t.msg}</div>
      ))}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}