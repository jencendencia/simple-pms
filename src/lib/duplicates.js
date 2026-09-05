// Duplicate detection for KRA / Objective / Competency pools.

// Strip numbering prefixes ("1.1 ", "KRA 1 (X): ", "KRA 2."), trailing weight
// annotations ("(85%)", "60%", "30% "), and punctuation/case, to find the
// "essence" of a title.
export function normalizeTitle(title) {
  if (!title) return ''
  let s = String(title)
  s = s.replace(/\(?\d+(\.\d+)*%?\)?\s*$/g, '') // trailing "(85%)", "30%", "1.2"
  s = s.replace(/^KRA\s*\d+[.)]?\s*(\([^)]*\))?\s*[:.-]?\s*/gi, '') // leading "KRA 1 (...):"
  s = s.replace(/^\d+(\.\d+)*[.)]\s*/g, '') // leading "1.1 "
  s = s.replace(/[^a-z0-9]+/gi, ' ')
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Token overlap (Jaccard) between two normalized titles.
export function similarity(a, b) {
  const ta = new Set(normalizeTitle(a).split(' ').filter(Boolean))
  const tb = new Set(normalizeTitle(b).split(' ').filter(Boolean))
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  const union = new Set([...ta, ...tb]).size
  return inter / union
}

/**
 * Group items by exact normalized title, then find near-duplicates
 * (similarity above threshold) among the remaining singletons.
 * Returns [{ canonical, items: [...] }]
 */
export function findDuplicateGroups(items, threshold = 0.72) {
  const groups = new Map() // normalized title -> items
  for (const item of items) {
    const key = normalizeTitle(item.title)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }

  const exact = [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({
      key,
      canonical: list[0],
      items: list,
      kind: 'exact',
    }))

  // Near-duplicates: compare every singleton against every other item.
  const singles = [...groups.entries()]
    .filter(([, list]) => list.length === 1)
    .map(([, list]) => list[0])

  const seen = new Set()
  const near = []
  for (let i = 0; i < singles.length; i++) {
    if (seen.has(singles[i].id)) continue
    const cluster = [singles[i]]
    for (let j = i + 1; j < singles.length; j++) {
      if (seen.has(singles[j].id)) continue
      if (similarity(singles[i].title, singles[j].title) >= threshold) {
        cluster.push(singles[j])
        seen.add(singles[j].id)
      }
    }
    if (cluster.length > 1) {
      seen.add(singles[i].id)
      near.push({
        key: normalizeTitle(singles[i].title),
        canonical: cluster[0],
        items: cluster,
        kind: 'near',
      })
    }
  }

  return [...exact, ...near]
}

// Known junk entries spotted in the live data (test/lorem rows).
export const JUNK_PATTERNS = [/lorem ipsum/i, /^test\d*$/i, /the quick brown fox/i]

export function isJunk(title) {
  return JUNK_PATTERNS.some((re) => re.test(title || ''))
}