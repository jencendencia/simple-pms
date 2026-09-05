// Future improvements backlog — persisted locally in the browser.

export const DEFAULT_IMPROVEMENTS = [
  {
    id: 'rubric',
    title: 'Shared rating rubric',
    desc: 'Move the quality/efficiency/timeliness rating texts out of pms_ipcrf_template_objectives into one shared rubric (objective-level or a single table) so a wording change is one edit instead of 300+.',
    status: 'planned',
  },
  {
    id: 'weight-100',
    title: 'Enforce weight = 100 on publish',
    desc: 'Block publishing a template whose objective weights don\'t total exactly 100 (or auto-normalize on save). Currently template #40 sits at 5%.',
    status: 'in-progress',
  },
  {
    id: 'clone',
    title: 'Clone template + school-year field',
    desc: 'One-click "clone last year\'s template" and a school-year attribute, so the annual rebuild is a rename + tweak instead of starting from scratch.',
    status: 'done',
  },
  {
    id: 'bulk',
    title: 'Bulk copy / Excel import',
    desc: '"Copy objectives from another template" and CSV/Excel import for objectives + weights to avoid re-entering ~10 objectives × 18 fields per template.',
    status: 'done',
  },
  {
    id: 'cleanup',
    title: 'Clean the pools',
    desc: 'Archive/remove test rows (Lorem ipsum, Test2/Test3, "Testing (Dev)" templates) and dedupe the doubled KRAs so the pickers are usable.',
    status: 'in-progress',
  },
  {
    id: 'prefill',
    title: 'Pre-fill rubric text',
    desc: 'Default the 15 rating descriptions per objective from a standard template so admins only edit when wording differs.',
    status: 'done',
  },
  {
    id: 'review-side',
    title: 'Build the review/rating flow',
    desc: 'pms_ipcrf currently only stores template + rater + ratee. The actual scoring (quality/efficiency/timeliness ratings, final rating, remarks) is not in the schema yet.',
    status: 'planned',
  },
  {
    id: 'notifications',
    title: 'Notify ratees/raters',
    desc: 'Email/in-app notification when an IPCRF is assigned, submitted, or approved — the tracker module already has a notification pattern to copy.',
    status: 'planned',
  },
]

const KEY = 'pms-simplify-improvements-v1'

export function loadImprovements() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      // merge with defaults in case new items are added later
      const byId = new Map(saved.map((i) => [i.id, i]))
      return DEFAULT_IMPROVEMENTS.map((d) => ({ ...d, ...(byId.get(d.id) || {}) }))
    }
  } catch {
    /* ignore corrupt storage */
  }
  return DEFAULT_IMPROVEMENTS
}

export function saveImprovements(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export const STATUS_LABELS = {
  planned: 'Planned',
  'in-progress': 'In progress',
  done: 'Done',
}