import { supabase } from './supabase'

// ---------------------------------------------------------------- basics

async function q(path) {
  const { data, error } = await path
  if (error) throw new Error(error.message)
  return data
}

export const fetchKras = () => q(supabase.from('pms_kras').select('*').order('title'))
export const fetchObjectives = () => q(supabase.from('pms_objectives').select('*').order('title'))
export const fetchCompetencies = () =>
  q(supabase.from('pms_competencies').select('*, compentency_items:pms_competency_items(*)').order('title'))
export const fetchCompetencyItems = () => q(supabase.from('pms_competency_items').select('*'))
export const fetchPositions = () => q(supabase.from('hrm_positions').select('id, name').order('name'))

export async function fetchTemplates() {
  return q(
    supabase
      .from('pms_ipcrf_templates')
      .select('*, positions:pms_ipcrf_positions(*, position:position_id(id, name)), objectives:pms_ipcrf_template_objectives(*), competencies:pms_ipcrf_template_competencies(*)')
      .order('created_at', { ascending: false })
  )
}

export async function fetchTemplate(id) {
  const rows = await q(
    supabase
      .from('pms_ipcrf_templates')
      .select('*, positions:pms_ipcrf_positions(*, position:position_id(id, name)), objectives:pms_ipcrf_template_objectives(*, objective:objective_id(*)), competencies:pms_ipcrf_template_competencies(*, competency:competency_id(*))')
      .eq('id', id)
  )
  return rows[0] ?? null
}

export async function fetchIpcrfCount() {
  const { count, error } = await supabase.from('pms_ipcrf').select('id', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  return count ?? 0
}

// ---------------------------------------------------------------- KRAs

export const createKra = (title) => q(supabase.from('pms_kras').insert({ title }).select().single())
export const updateKra = (id, title) => q(supabase.from('pms_kras').update({ title }).eq('id', id))
export const deleteKra = (id) => q(supabase.from('pms_kras').delete().eq('id', id))

// ---------------------------------------------------------------- Objectives

export const createObjective = (title, kra_id) =>
  q(supabase.from('pms_objectives').insert({ title, kra_id }).select().single())
export const updateObjective = (id, title, kra_id) =>
  q(supabase.from('pms_objectives').update({ title, kra_id }).eq('id', id))
export const deleteObjective = (id) => q(supabase.from('pms_objectives').delete().eq('id', id))

// ---------------------------------------------------------------- Competencies

export const createCompetency = (title, type) =>
  q(supabase.from('pms_competencies').insert({ title, type }).select().single())
export const updateCompetency = (id, title, type) =>
  q(supabase.from('pms_competencies').update({ title, type }).eq('id', id))
export const deleteCompetency = (id) => q(supabase.from('pms_competencies').delete().eq('id', id))
export const createCompetencyItem = (title, competency_id) =>
  q(supabase.from('pms_competency_items').insert({ title, competency_id }).select().single())
export const deleteCompetencyItem = (id) => q(supabase.from('pms_competency_items').delete().eq('id', id))

// ---------------------------------------------------------------- Templates

export async function createTemplate({ description, type, positionIds }) {
  const tpl = await q(supabase.from('pms_ipcrf_templates').insert({ description, type, status: 'Draft' }).select().single())
  if (positionIds.length) {
    await q(
      supabase
        .from('pms_ipcrf_positions')
        .insert(positionIds.map((position_id) => ({ ipcrf_template_id: tpl.id, position_id })))
    )
  }
  return tpl
}

export const updateTemplate = (id, patch) => q(supabase.from('pms_ipcrf_templates').update(patch).eq('id', id))
export const setTemplateStatus = (id, status) => q(supabase.from('pms_ipcrf_templates').update({ status }).eq('id', id))

export async function deleteTemplate(id) {
  await q(supabase.from('pms_ipcrf_template_objectives').delete().eq('ipcrf_template_id', id))
  await q(supabase.from('pms_ipcrf_template_competencies').delete().eq('ipcrf_template_id', id))
  await q(supabase.from('pms_ipcrf_positions').delete().eq('ipcrf_template_id', id))
  await q(supabase.from('pms_ipcrf_templates').delete().eq('id', id))
}

// Replace the template's positions wholesale (same behavior as the real app).
export async function setTemplatePositions(id, positionIds) {
  await q(supabase.from('pms_ipcrf_positions').delete().eq('ipcrf_template_id', id))
  if (positionIds.length) {
    await q(
      supabase
        .from('pms_ipcrf_positions')
        .insert(positionIds.map((position_id) => ({ ipcrf_template_id: id, position_id })))
    )
  }
}

// ---------------------------------------------------------------- Template objectives

const RUBRIC_COLS = [
  'quality', 'quality_outstanding', 'quality_very_satisfactory', 'quality_satisfactory', 'quality_unsatisfactory', 'quality_poor',
  'efficiency', 'efficiency_outstanding', 'efficiency_very_satisfactory', 'efficiency_satisfactory', 'efficiency_unsatisfactory', 'efficiency_poor',
  'timeliness', 'timeliness_outstanding', 'timeliness_very_satisfactory', 'timeliness_satisfactory', 'timeliness_unsatisfactory', 'timeliness_poor',
]

// Default rubric wording so admins don't have to retype it every time.
export const DEFAULT_RUBRIC = {
  quality: true,
  quality_outstanding: 'Quality is outstanding and exceeds the standard by a wide margin',
  quality_very_satisfactory: 'Quality is very satisfactory and exceeds the standard',
  quality_satisfactory: 'Quality is satisfactory and meets the standard',
  quality_unsatisfactory: 'Quality is below the standard',
  quality_poor: 'Quality is far below the standard',
  efficiency: true,
  efficiency_outstanding: 'Very efficient — output delivered well ahead of time with minimal resources',
  efficiency_very_satisfactory: 'Efficient — output delivered ahead of time with little resource use',
  efficiency_satisfactory: 'Output delivered on time with reasonable resource use',
  efficiency_unsatisfactory: 'Output delivered late or with excess resource use',
  efficiency_poor: 'Output delivered very late or with wasteful resource use',
  timeliness: true,
  timeliness_outstanding: 'Always ahead of schedule',
  timeliness_very_satisfactory: 'Usually ahead of schedule',
  timeliness_satisfactory: 'Delivered on schedule',
  timeliness_unsatisfactory: 'Often late',
  timeliness_poor: 'Almost always late',
}

export async function addTemplateObjective(templateId, { objective_id, target, timeline, weight, rubric }) {
  const row = { ipcrf_template_id: templateId, objective_id, target, timeline, weight, ...rubric }
  return q(supabase.from('pms_ipcrf_template_objectives').insert(row).select().single())
}

export async function updateTemplateObjective(id, patch) {
  return q(supabase.from('pms_ipcrf_template_objectives').update(patch).eq('id', id))
}

export async function removeTemplateObjective(id) {
  return q(supabase.from('pms_ipcrf_template_objectives').delete().eq('id', id))
}

/** Redistribute weights so the template total equals 100, preserving proportions. */
export async function normalizeWeights(templateId, rows) {
  const total = rows.reduce((s, r) => s + (Number(r.weight) || 0), 0)
  if (total <= 0) throw new Error('Total weight is 0 — nothing to normalize.')
  const updates = rows.map((r) =>
    supabase
      .from('pms_ipcrf_template_objectives')
      .update({ weight: Math.round(((Number(r.weight) || 0) / total) * 10000) / 100 })
      .eq('id', r.id)
  )
  const results = await Promise.all(updates)
  const err = results.find((r) => r.error)
  if (err) throw new Error(err.error.message)
  return results.length
}

/** Bulk-copy objectives from another template into this one. */
export async function copyObjectivesFromTemplate(targetTemplateId, sourceTemplate) {
  const src = sourceTemplate.objectives || []
  if (!src.length) throw new Error('That template has no objectives to copy.')
  const rows = src.map((r) => {
    const { id, created_at, ipcrf_template_id, objective_id, target, timeline, weight, ...rubric } = r
    return { ipcrf_template_id: targetTemplateId, objective_id, target, timeline, weight, ...rubric }
  })
  return q(supabase.from('pms_ipcrf_template_objectives').insert(rows))
}

// ---------------------------------------------------------------- Template competencies

export const addTemplateCompetency = (templateId, competency_id) =>
  q(supabase.from('pms_ipcrf_template_competencies').insert({ ipcrf_template_id: templateId, competency_id }).select().single())
export const removeTemplateCompetency = (id) => q(supabase.from('pms_ipcrf_template_competencies').delete().eq('id', id))

// ---------------------------------------------------------------- Clone

/** Duplicate a template (objectives, competencies, positions) with a new description. */
export async function cloneTemplate(source, newDescription) {
  const tpl = await q(
    supabase
      .from('pms_ipcrf_templates')
      .insert({ description: newDescription, type: source.type, status: 'Draft' })
      .select()
      .single()
  )
  const jobs = []
  if (source.positions?.length) {
    jobs.push(
      supabase
        .from('pms_ipcrf_positions')
        .insert(source.positions.map((p) => ({ ipcrf_template_id: tpl.id, position_id: p.position_id })))
    )
  }
  if (source.objectives?.length) {
    jobs.push(
      supabase
        .from('pms_ipcrf_template_objectives')
        .insert(source.objectives.map((r) => {
          const { id, created_at, ipcrf_template_id, ...rest } = r
          return { ...rest, ipcrf_template_id: tpl.id }
        }))
    )
  }
  if (source.competencies?.length) {
    jobs.push(
      supabase
        .from('pms_ipcrf_template_competencies')
        .insert(source.competencies.map((c) => ({ ipcrf_template_id: tpl.id, competency_id: c.competency_id })))
    )
  }
  const results = await Promise.all(jobs)
  const err = results.find((r) => r.error)
  if (err) throw new Error(err.error.message)
  return tpl
}

// ---------------------------------------------------------------- Merging (duplicates page)

/** Repoint everything that references `fromId` to `toId`, then delete the row. */
export async function mergeKra(fromId, toId) {
  await q(supabase.from('pms_objectives').update({ kra_id: toId }).eq('kra_id', fromId))
  await q(supabase.from('pms_kras').delete().eq('id', fromId))
}

export async function mergeObjective(fromId, toId) {
  await q(supabase.from('pms_ipcrf_template_objectives').update({ objective_id: toId }).eq('objective_id', fromId))
  await q(supabase.from('pms_objectives').delete().eq('id', fromId))
}

export async function mergeCompetency(fromId, toId) {
  await q(supabase.from('pms_ipcrf_template_competencies').update({ competency_id: toId }).eq('competency_id', fromId))
  await q(supabase.from('pms_competency_items').update({ competency_id: toId }).eq('competency_id', fromId))
  await q(supabase.from('pms_competencies').delete().eq('id', fromId))
}