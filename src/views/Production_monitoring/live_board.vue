<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { dbAPI as Unit_line_API } from '@/services/unit_line_api.js'
import { dbAPI as item_API } from '@/services/item_api.js'
import { dbAPI } from '@/services/live-board/shift_api.js'
import { dbAPI as LineSetting } from '@/services/live-board/line_setting_api.js'

const BACKEND_URL = ''
const LINESETTING_SHEET_NAME = 'LineSetting'
const DEFAULT_FACTORY_NAME = 'AHASAN COMPOSITE LTD'
const UNIT_LINE_SHEET = 'Unit_line_No'
const SHIFT_SHEET_NAME = 'Shift_time'
const SHIFT_STORAGE_KEY = 'mis_live_board_shift_config_v3'
const SHIFT_RULES_STORAGE_KEY = 'mis_live_board_shift_rules_v1'
const LINES_PER_UNIT = 8
const NPT_ALERT_THRESHOLD_MIN = 30
const DEFAULT_FALLBACK_UNITS = ['Unit-1', 'Unit-2', 'Unit-3', 'Unit-4']
const DEFAULT_SHIFT_HOURS = 8
const FIRST_SLOT_OFFSET_MINUTES = 80

const NPT_PROBLEM_TYPES = [
  'MACHINE PROBLEM',
  'RIB SHADE',
  'INPUT DELAY',
  'BUNDLE SHORTAGE',
  'THREAD BREAK',
  'POWER / GAS'
]

const SHIFT_PRESETS = [
  { key: 'DAY', label: 'Shift A (Day)' },
  { key: 'EVENING', label: 'Shift B (Evening)' },
  { key: 'NIGHT', label: 'Shift C (Night)' }
]

const SHIFT_SECTION_OPTIONS = [
  'KNITTING',
  'DYEING',
  'GARMENTS'
]

const DEFAULT_SLOT_TEMPLATES = [
  { ratio: 0.14, dhu: 1.6, downtimeMin: 2, problem: 'MACHINE PROBLEM' },
  { ratio: 0.125, dhu: 1.4, downtimeMin: 0, problem: null },
  { ratio: 0.125, dhu: 1.9, downtimeMin: 3, problem: 'INPUT DELAY' },
  { ratio: 0.125, dhu: 1.3, downtimeMin: 0, problem: null },
  { ratio: 0.11, dhu: 1.5, downtimeMin: 2, problem: 'RIB SHADE' },
  { ratio: 0.125, dhu: 1.4, downtimeMin: 0, problem: null },
  { ratio: 0.125, dhu: 1.2, downtimeMin: 0, problem: null },
  { ratio: 0.125, dhu: 0.0, downtimeMin: 0, problem: null }
]

/**
 * Calculates target pieces for a given slot duration using:
 * Target = (Total Manpower * slotMinutes * (Target Efficiency / 100)) / SMV
 */
function calcSlotTargetFromEfficiency(
  operators = 0,
  helpers = 0,
  smv = 14,
  targetEfficiencyPct = 75,
  slotMinutes = 60
) {
  const manpower = Math.max(0, Number(operators) || 0) + Math.max(0, Number(helpers) || 0)
  const cleanSmv = Math.max(0.1, Number(smv) || 14)
  const effDecimal = Math.max(0, Number(targetEfficiencyPct) || 0) / 100
  const mins = Math.max(0, Number(slotMinutes) || 60)

  const earnedMinutes = manpower * mins * effDecimal
  return Math.round(earnedMinutes / cleanSmv)
}

function getSlotMinutes(slot, fallbackMins = 60) {
  if (typeof slot?.slotMinutes === 'number' && slot.slotMinutes > 0) {
    return slot.slotMinutes
  }
  const startMin = parseFlexibleTimeToMinutes(slot?.hourStartTime, NaN)
  const endMin = parseFlexibleTimeToMinutes(slot?.endTime, NaN)
  if (!Number.isNaN(startMin) && !Number.isNaN(endMin)) {
    let diff = endMin - startMin
    if (diff <= 0) diff += 1440
    if (diff > 0) return diff
  }
  return fallbackMins
}

function getElapsedSlotMinutes(slots = [], activeIdx = 0) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return Math.max(60, (Math.max(0, Number(activeIdx) || 0) + 1) * 60)
  }
  const clampedIdx = Math.min(Math.max(0, Number(activeIdx) || 0), slots.length - 1)
  let totalMins = 0
  for (let i = 0; i <= clampedIdx; i++) {
    totalMins += getSlotMinutes(slots[i], i === 0 ? FIRST_SLOT_OFFSET_MINUTES : 60)
  }
  return Math.max(60, totalMins)
}

function toDateKey(rawDate = new Date()) {
  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    const y = rawDate.getFullYear()
    const m = String(rawDate.getMonth() + 1).padStart(2, '0')
    const d = String(rawDate.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const str = String(rawDate || '').trim()
  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]
  const parsed = new Date(str)
  if (!Number.isNaN(parsed.getTime())) {
    return toDateKey(parsed)
  }
  return toDateKey(new Date())
}

function normKey(val = '') {
  return String(val || '').trim().toUpperCase()
}

function parseFlexibleTimeToMinutes(rawStr, fallbackMinutes = 8 * 60) {
  const clean = String(rawStr ?? '').trim().toUpperCase()
  if (!clean) return fallbackMinutes

  const ampmMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/)
  if (ampmMatch) {
    let hh = Number(ampmMatch[1])
    const mm = Number(ampmMatch[2] || 0)
    const period = ampmMatch[3]
    if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return fallbackMinutes
    if (period === 'PM' && hh !== 12) hh += 12
    if (period === 'AM' && hh === 12) hh = 0
    return hh * 60 + mm
  }

  const h24Match = clean.match(/^(\d{1,2})(?::(\d{2}))?$/)
  if (h24Match) {
    const hh = Number(h24Match[1])
    const mm = Number(h24Match[2] || 0)
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return fallbackMinutes
    return hh * 60 + mm
  }

  return fallbackMinutes
}

function formatMinutesToHHMM(totalMins) {
  const wrapped = (((Math.round(Number(totalMins) || 0) % 1440) + 1440) % 1440)
  const hh = String(Math.floor(wrapped / 60)).padStart(2, '0')
  const mm = String(wrapped % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

function addMinutesToTime(startTime = '08:00', minutesToAdd = 60, fallbackStart = '08:00') {
  const fallbackMin = parseFlexibleTimeToMinutes(fallbackStart, 8 * 60)
  const baseMin = parseFlexibleTimeToMinutes(startTime, fallbackMin)
  return formatMinutesToHHMM(baseMin + Number(minutesToAdd || 0))
}

function calcHourEndTime(hourStartTime = '08:00', stepMinutes = 60) {
  return addMinutesToTime(hourStartTime, stepMinutes)
}

function getConfiguredDurationHours(fallbackHours = DEFAULT_SHIFT_HOURS) {
  const hrs = Number(fallbackHours)
  return Number.isFinite(hrs) && hrs > 0 ? Number(hrs.toFixed(2)) : DEFAULT_SHIFT_HOURS
}

function calcEndTimeFromStart(startTime = '08:00', durationHours = DEFAULT_SHIFT_HOURS) {
  const startMin = parseFlexibleTimeToMinutes(startTime, 8 * 60)
  const durationMins = Math.round(getConfiguredDurationHours(durationHours) * 60)
  return formatMinutesToHHMM(startMin + durationMins)
}

function buildShiftSlotsFromStartPlus80Min(
  startTime = '08:00',
  durationHours = DEFAULT_SHIFT_HOURS,
  shiftName = 'Shift A (Day)',
  baseId = 'SHF-1',
  createdAtIso = new Date().toISOString(),
  customSlots = null,
  shiftStartTimeCol = null,
  submissionDateVal = toDateKey(new Date())
) {
  const cleanShiftStart = formatMinutesToHHMM(
    parseFlexibleTimeToMinutes(shiftStartTimeCol || startTime, 8 * 60)
  )
  const dateKey = toDateKey(submissionDateVal)

  if (Array.isArray(customSlots) && customSlots.length > 0) {
    return customSlots.map((slot, idx) => {
      const rawSection = String(slot.section || slot.hour || '').trim()
      const parts = rawSection.split('-').map((p) => p.trim())
      const slotStart =
        idx === 0
          ? formatMinutesToHHMM(parseFlexibleTimeToMinutes(startTime, 8 * 60))
          : formatMinutesToHHMM(parseFlexibleTimeToMinutes(parts[0] || startTime, 8 * 60))
      const slotEnd =
        parts[1] && parseFlexibleTimeToMinutes(parts[1], NaN) >= 0
          ? formatMinutesToHHMM(parseFlexibleTimeToMinutes(parts[1], 9 * 60))
          : calcHourEndTime(slotStart, 60)
      const sectionLabel = rawSection || `${slotStart} - ${slotEnd}`
      const rawStartLabel = String(slot.Shift_Start_time || cleanShiftStart).trim()
      const computedMins = (() => {
        const sMin = parseFlexibleTimeToMinutes(slotStart, NaN)
        const eMin = parseFlexibleTimeToMinutes(slotEnd, NaN)
        if (!Number.isNaN(sMin) && !Number.isNaN(eMin)) {
          let d = eMin - sMin
          if (d <= 0) d += 1440
          if (d > 0) return d
        }
        return Number(slot.slotMinutes) || (idx === 0 ? FIRST_SLOT_OFFSET_MINUTES : 60)
      })()

      return {
        id: String(slot.id || `${baseId}-${idx + 1}`),
        section: sectionLabel,
        hour: sectionLabel,
        hourStartTime: slotStart,
        endTime: slotEnd,
        slotMinutes: computedMins,
        Shift: String(slot.Shift || shiftName || 'Shift A (Day)'),
        Shift_Start_time: rawStartLabel,
        submissionDate: toDateKey(slot.submissionDate || slot.date || dateKey),
        date: toDateKey(slot.date || slot.submissionDate || dateKey),
        create_at: String(slot.create_at || createdAtIso),
        ratio: Number(slot.ratio) || 1 / customSlots.length,
        dhu: Number(slot.dhu) || 0,
        downtimeMin: Number(slot.downtimeMin) || 0,
        problem: slot.problem ?? null
      }
    })
  }

  const startMin = parseFlexibleTimeToMinutes(startTime, 8 * 60)
  const totalShiftMins = Math.max(60, Math.round(getConfiguredDurationHours(durationHours) * 60))
  const endMin = startMin + totalShiftMins

  const slots = []
  let cursor = startMin
  let idx = 0

  while (cursor < endMin && slots.length < 24) {
    const stepMins =
      idx === 0
        ? Math.min(FIRST_SLOT_OFFSET_MINUTES, endMin - cursor)
        : Math.min(60, endMin - cursor)
    const nextCursor = cursor + stepMins
    const slotStart = formatMinutesToHHMM(cursor)
    const slotEnd = formatMinutesToHHMM(nextCursor)
    const sectionLabel = `${slotStart} - ${slotEnd}`
    const template = DEFAULT_SLOT_TEMPLATES[idx % DEFAULT_SLOT_TEMPLATES.length]
    const ratio = Number((stepMins / totalShiftMins).toFixed(4))

    slots.push({
      id: `${baseId}-${idx + 1}`,
      section: sectionLabel,
      hour: sectionLabel,
      hourStartTime: slotStart,
      endTime: slotEnd,
      slotMinutes: stepMins,
      Shift: shiftName,
      Shift_Start_time: cleanShiftStart,
      submissionDate: dateKey,
      date: dateKey,
      create_at: createdAtIso,
      ratio: ratio > 0 ? ratio : 0.1,
      dhu: template.dhu,
      downtimeMin: template.downtimeMin,
      problem: template.problem
    })

    cursor = nextCursor
    idx += 1
  }

  const ratioSum = slots.reduce((sum, s) => sum + (Number(s.ratio) || 0), 0)
  if (slots.length > 0 && ratioSum > 0) {
    let acc = 0
    slots.forEach((slot, i) => {
      if (i === slots.length - 1) {
        slot.ratio = Number(Math.max(0.01, 1 - acc).toFixed(4))
      } else {
        const norm = Number((slot.ratio / ratioSum).toFixed(4))
        slot.ratio = norm
        acc += norm
      }
    })
  }

  return slots
}

/**
 * Maps a scan/submission timestamp (Date) to the active shift slot index.
 */
function findSlotIndexForScanTime(
  scanDate = new Date(),
  startTime = '08:00',
  slots = []
) {
  if (!Array.isArray(slots) || slots.length <= 1) return 0

  const startMin = parseFlexibleTimeToMinutes(startTime, 8 * 60)
  let scanMin = scanDate.getHours() * 60 + scanDate.getMinutes()
  if (scanMin < startMin) {
    scanMin += 1440
  }

  const elapsed = scanMin - startMin
  if (elapsed < FIRST_SLOT_OFFSET_MINUTES) {
    return 0
  }

  const afterFirst = elapsed - FIRST_SLOT_OFFSET_MINUTES
  const extraIdx = Math.floor(afterFirst / 60) + 1
  return Math.max(0, Math.min(slots.length - 1, extraIdx))
}

const initialId = 'SHF-001'
const initialShift = 'Shift A (Day)'
const initialStart = '08:00'
const initialHours = DEFAULT_SHIFT_HOURS
const initialEnd = calcEndTimeFromStart(initialStart, initialHours)
const initialDate = toDateKey(new Date())
const initialCreatedAt = new Date().toISOString()

const submissionDate = ref(initialDate)
const shiftRules = ref([])
const isSavingShift = ref(false)
const isSavingLineSetting = ref(false)

const shiftConfig = ref({
  id: initialId,
  Shift: initialShift,
  shiftName: initialShift,
  Shift_Start_time: initialStart,
  startTime: initialStart,
  endTime: initialEnd,
  durationHours: initialHours,
  submissionDate: initialDate,
  date: initialDate,
  create_at: initialCreatedAt,
  autoAlignActiveHour: false,
  recalcHourlyTargets: true,
  slots: buildShiftSlotsFromStartPlus80Min(
    initialStart,
    initialHours,
    initialShift,
    initialId,
    initialCreatedAt,
    null,
    initialStart,
    initialDate
  )
})

const BASE_HOURS = computed(() => shiftConfig.value.slots)

const isShiftModalOpen = ref(false)
const shiftDraft = ref({
  id: initialId,
  Shift: initialShift,
  shiftName: initialShift,
  Shift_Start_time: initialStart,
  startTime: initialStart,
  endTime: initialEnd,
  durationHours: initialHours,
  submissionDate: initialDate,
  date: initialDate,
  create_at: initialCreatedAt,
  autoAlignActiveHour: false,
  recalcHourlyTargets: true,
  slots: []
})

function buildRuleSignature(rule) {
  const dKey = toDateKey(rule.submissionDate || rule.date || submissionDate.value)
  const secKey = normKey(rule.section)
  const shfKey = normKey(rule.Shift || rule.shiftName)
  const minVal = parseFlexibleTimeToMinutes(rule.Shift_Start_time || rule.startTime, 8 * 60)
  return `${dKey}|${secKey}|${shfKey}|${minVal}`
}

function resolveMatchingShiftRule({
  date = submissionDate.value,
  section = '',
  shift = shiftConfig.value.Shift,
  startTime = null
} = {}) {
  const dKey = toDateKey(date)
  const secKey = normKey(section)
  const shfKey = normKey(shift)
  const hasExplicitStart =
    startTime !== null && startTime !== undefined && String(startTime).trim() !== ''
  const targetStartMin = hasExplicitStart
    ? parseFlexibleTimeToMinutes(startTime, 8 * 60)
    : null

  const rules = Array.isArray(shiftRules.value) ? shiftRules.value : []
  if (!rules.length) return null

  if (targetStartMin !== null) {
    const exact = rules.find(
      (r) =>
        toDateKey(r.submissionDate || r.date) === dKey &&
        normKey(r.section) === secKey &&
        normKey(r.Shift || r.shiftName) === shfKey &&
        parseFlexibleTimeToMinutes(r.Shift_Start_time || r.startTime, 8 * 60) === targetStartMin
    )
    if (exact) return exact
  }

  const sameDateSecShift = rules.find(
    (r) =>
      toDateKey(r.submissionDate || r.date) === dKey &&
      secKey &&
      normKey(r.section) === secKey &&
      (!shfKey || normKey(r.Shift || r.shiftName) === shfKey)
  )
  if (sameDateSecShift) return sameDateSecShift

  const sameDateSec = rules.find(
    (r) =>
      toDateKey(r.submissionDate || r.date) === dKey &&
      secKey &&
      normKey(r.section) === secKey
  )
  if (sameDateSec) return sameDateSec

  const bySecShift = [...rules]
    .filter(
      (r) =>
        secKey &&
        normKey(r.section) === secKey &&
        (!shfKey || normKey(r.Shift || r.shiftName) === shfKey)
    )
    .sort((a, b) =>
      toDateKey(b.submissionDate || b.date).localeCompare(toDateKey(a.submissionDate || a.date))
    )
  if (bySecShift.length) return bySecShift[0]

  const sameDateShift = rules.find(
    (r) =>
      toDateKey(r.submissionDate || r.date) === dKey &&
      shfKey &&
      normKey(r.Shift || r.shiftName) === shfKey
  )
  if (sameDateShift) return sameDateShift

  const sameDate = rules.find((r) => toDateKey(r.submissionDate || r.date) === dKey)
  return sameDate || rules[0]
}

function getLineShiftContext(line, fallbackDateKey = submissionDate.value) {
  const activeDateKey = toDateKey(
    line?.submissionDate || line?.date || fallbackDateKey || new Date()
  )
  const lineSection = line?.section || line?.unit || ''
  const lineShift = line?.Shift || shiftConfig.value.Shift
  const matchedRule = resolveMatchingShiftRule({
    date: activeDateKey,
    section: lineSection,
    shift: lineShift,
    startTime: line?.Shift_Start_time || null
  })

  const effectiveStartLabel = String(
    matchedRule?.Shift_Start_time ||
      line?.Shift_Start_time ||
      shiftConfig.value.Shift_Start_time ||
      shiftConfig.value.startTime ||
      '08:00'
  ).trim()
  const ruleStartMin = parseFlexibleTimeToMinutes(effectiveStartLabel, 8 * 60)
  const cleanRuleStart = formatMinutesToHHMM(ruleStartMin)
  const ruleHours = getConfiguredDurationHours(
    matchedRule?.durationHours || shiftConfig.value.durationHours
  )
  const ruleSlots = buildShiftSlotsFromStartPlus80Min(
    cleanRuleStart,
    ruleHours,
    matchedRule?.Shift || lineShift,
    matchedRule?.id || shiftConfig.value.id,
    matchedRule?.create_at || shiftConfig.value.create_at,
    null,
    effectiveStartLabel,
    activeDateKey
  )

  return {
    activeDateKey,
    lineSection,
    lineShift,
    matchedRule,
    effectiveStartLabel,
    cleanRuleStart,
    ruleSlots
  }
}

function loadSavedShiftConfig() {
  if (typeof window === 'undefined') return
  try {
    const rawRules = window.localStorage.getItem(SHIFT_RULES_STORAGE_KEY)
    if (rawRules) {
      const parsedRules = JSON.parse(rawRules)
      if (Array.isArray(parsedRules)) {
        shiftRules.value = parsedRules
      }
    }
  } catch (_) {
    // Ignore invalid rules storage
  }

  try {
    const raw = window.localStorage.getItem(SHIFT_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    const rawStart = parsed?.Shift_Start_time ?? parsed?.startTime
    if (parsed && rawStart) {
      const parsedMin = parseFlexibleTimeToMinutes(rawStart, 8 * 60)
      const cleanStart = formatMinutesToHHMM(parsedMin)
      const savedHours = getConfiguredDurationHours(parsed.durationHours)
      const computedEnd = calcEndTimeFromStart(cleanStart, savedHours)
      const cleanShift = String(parsed.Shift || parsed.shiftName || 'Shift A (Day)').trim()
      const cleanId = String(parsed.id || 'SHF-001').trim()
      const dateKey = toDateKey(parsed.submissionDate || parsed.date || new Date())
      const createdAtIso = String(parsed.create_at || new Date().toISOString())

      submissionDate.value = dateKey

      shiftConfig.value = {
        id: cleanId,
        Shift: cleanShift,
        shiftName: cleanShift,
        Shift_Start_time: String(rawStart).trim() || cleanStart,
        startTime: String(rawStart).trim() || cleanStart,
        endTime: computedEnd,
        durationHours: savedHours,
        submissionDate: dateKey,
        date: dateKey,
        create_at: createdAtIso,
        autoAlignActiveHour: Boolean(parsed.autoAlignActiveHour),
        recalcHourlyTargets: parsed.recalcHourlyTargets !== false,
        slots: buildShiftSlotsFromStartPlus80Min(
          cleanStart,
          savedHours,
          cleanShift,
          cleanId,
          createdAtIso,
          Array.isArray(parsed.slots) && parsed.slots.length ? parsed.slots : null,
          String(rawStart).trim() || cleanStart,
          dateKey
        )
      }
    }
  } catch (_) {
    // Ignore invalid storage
  }
}

function persistShiftConfig(cfg) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(cfg))
    window.localStorage.setItem(SHIFT_RULES_STORAGE_KEY, JSON.stringify(shiftRules.value))
  } catch (_) {
    // Ignore storage quota errors
  }
}

function createEmptyShiftRow(
  rowIdx = 0,
  baseId = 'SHF-001',
  shiftName = 'Shift A (Day)',
  startTime = '',
  createdAtIso = new Date().toISOString(),
  dateKey = toDateKey(new Date())
) {
  return {
    id: `${baseId}-${rowIdx + 1}`,
    section: '',
    hour: '',
    Shift: shiftName || 'Shift A (Day)',
    Shift_Start_time: startTime,
    submissionDate: dateKey,
    date: dateKey,
    create_at: createdAtIso
  }
}

function openShiftControlModal() {
  const activeDateKey = toDateKey(
    submissionDate.value || shiftConfig.value.submissionDate || new Date()
  )
  submissionDate.value = activeDateKey

  const cleanStart =
    shiftConfig.value.Shift_Start_time || shiftConfig.value.startTime || '08:00'
  const currentHours = getConfiguredDurationHours(shiftConfig.value.durationHours)
  const computedEnd = calcEndTimeFromStart(cleanStart, currentHours)
  const cleanId = shiftConfig.value.id || 'SHF-001'
  const cleanShift = shiftConfig.value.Shift || shiftConfig.value.shiftName || 'Shift A (Day)'
  const createdAtIso = new Date().toISOString()

  shiftDraft.value = {
    id: cleanId,
    Shift: cleanShift,
    shiftName: cleanShift,
    Shift_Start_time: cleanStart,
    startTime: cleanStart,
    endTime: computedEnd,
    durationHours: currentHours,
    submissionDate: activeDateKey,
    date: activeDateKey,
    create_at: createdAtIso,
    autoAlignActiveHour: Boolean(shiftConfig.value.autoAlignActiveHour),
    recalcHourlyTargets: shiftConfig.value.recalcHourlyTargets !== false,
    slots: [createEmptyShiftRow(0, cleanId, cleanShift, '', createdAtIso, activeDateKey)]
  }
  isShiftModalOpen.value = true
}

function resetShiftDraft() {
  const activeDateKey = toDateKey(submissionDate.value || shiftConfig.value.submissionDate || new Date())
  const cleanStart =
    shiftConfig.value.Shift_Start_time || shiftConfig.value.startTime || '08:00'
  const currentHours = getConfiguredDurationHours(shiftConfig.value.durationHours)
  const computedEnd = calcEndTimeFromStart(cleanStart, currentHours)
  const cleanShift = shiftConfig.value.Shift || shiftConfig.value.shiftName || 'Shift A (Day)'
  const cleanId = shiftConfig.value.id || 'SHF-001'
  const createdAtIso = new Date().toISOString()

  shiftDraft.value = {
    id: cleanId,
    Shift: cleanShift,
    shiftName: cleanShift,
    Shift_Start_time: cleanStart,
    startTime: cleanStart,
    endTime: computedEnd,
    durationHours: currentHours,
    submissionDate: activeDateKey,
    date: activeDateKey,
    create_at: createdAtIso,
    autoAlignActiveHour: Boolean(shiftConfig.value.autoAlignActiveHour),
    recalcHourlyTargets: shiftConfig.value.recalcHourlyTargets !== false,
    slots: [createEmptyShiftRow(0, cleanId, cleanShift, '', createdAtIso, activeDateKey)]
  }
}

function closeShiftControlModal() {
  isShiftModalOpen.value = false
}

function onSlotStartTimeTyping(slot, sIdx, rawVal) {
  if (slot) {
    slot.Shift_Start_time = rawVal
  }
  if (sIdx === 0) {
    shiftDraft.value.Shift_Start_time = rawVal
    shiftDraft.value.startTime = rawVal
  }
}

function onSlotStartTimeChange(slot, sIdx, rawVal) {
  const cleanText = String(rawVal ?? '').trim()
  if (slot) {
    slot.Shift_Start_time = cleanText
  }
  if (sIdx === 0) {
    shiftDraft.value.Shift_Start_time = cleanText
    shiftDraft.value.startTime = cleanText
  }
}

function onShiftSectionChange(sIdx, selectedSection) {
  const slots = shiftDraft.value.slots
  if (!Array.isArray(slots) || !slots[sIdx]) return

  const cleanSection = String(selectedSection || '').trim()
  slots[sIdx].section = cleanSection
  slots[sIdx].hour = cleanSection

  if (cleanSection && sIdx === slots.length - 1) {
    const baseId = shiftDraft.value.id || 'SHF-001'
    const shiftName = slots[sIdx].Shift || shiftDraft.value.Shift || 'Shift A (Day)'
    const dateKey = toDateKey(submissionDate.value || shiftDraft.value.submissionDate)
    slots.push(
      createEmptyShiftRow(
        slots.length,
        baseId,
        shiftName,
        '',
        new Date().toISOString(),
        dateKey
      )
    )
  }
}

function onShiftDropdownChange(sIdx, selectedLabel) {
  const cleanLabel = String(selectedLabel || '').trim() || 'Shift A (Day)'
  if (Array.isArray(shiftDraft.value.slots) && shiftDraft.value.slots[sIdx]) {
    shiftDraft.value.slots[sIdx].Shift = cleanLabel
  }
  if (sIdx === 0) {
    shiftDraft.value.Shift = cleanLabel
    shiftDraft.value.shiftName = cleanLabel
  }
}

function removeShiftSlot(sIdx) {
  const slots = shiftDraft.value.slots
  if (!Array.isArray(slots)) return
  slots.splice(sIdx, 1)
  if (slots.length === 0) {
    const baseId = shiftDraft.value.id || 'SHF-001'
    const shiftName = shiftDraft.value.Shift || 'Shift A (Day)'
    const dateKey = toDateKey(submissionDate.value || shiftDraft.value.submissionDate)
    slots.push(
      createEmptyShiftRow(0, baseId, shiftName, '', new Date().toISOString(), dateKey)
    )
  }
}

function applyShiftConfigToLines(nextConfig, savedDateKey = toDateKey(submissionDate.value)) {
  const maxSlotIdx = Math.max(0, (nextConfig.slots || []).length - 1)
  const refNow = new Date()

  linesData.value.forEach((line, lIdx) => {
    const { matchedRule, effectiveStartLabel, cleanRuleStart, ruleSlots } = getLineShiftContext(
      line,
      savedDateKey
    )

    line.submissionDate = savedDateKey
    if (matchedRule?.Shift) {
      line.Shift = matchedRule.Shift
    } else if (!line.Shift) {
      line.Shift = nextConfig.Shift
    }
    line.Shift_Start_time = effectiveStartLabel

    const existingRows = Array.isArray(line.hourlyRows) ? line.hourlyRows : []
    const existingBySlotLabel = new Map(
      existingRows.map((r) => [String(r.hour || '').trim(), r])
    )

    const baseSlotsForRows = ruleSlots.length ? ruleSlots : nextConfig.slots || []
    let totalEfficiencyTarget = 0

    line.hourlyRows = baseSlotsForRows.map((slot, idx) => {
      const slotLabel = String(slot.section || slot.hour || '').trim()
      const prev = existingBySlotLabel.get(slotLabel) || existingRows[idx]
      const slotMins = getSlotMinutes(slot, idx === 0 ? FIRST_SLOT_OFFSET_MINUTES : 60)

      const computedTarget = calcSlotTargetFromEfficiency(
        line.operators,
        line.helpers,
        line.smv,
        line.targetEfficiency,
        slotMins
      )

      const target =
        nextConfig.recalcHourlyTargets || !prev
          ? computedTarget
          : Number(prev.target) || computedTarget
      totalEfficiencyTarget += target

      const actual = prev ? Math.max(0, Math.round(Number(prev.actual) || 0)) : 0
      const dhu = prev ? Math.max(0, Number(prev.dhu) || 0) : actual > 0 ? slot.dhu : 0
      const qcPass = prev
        ? Math.min(
            actual,
            Math.max(0, Math.round(Number(prev.qcPass) ?? calcHourQcPass(actual, dhu)))
          )
        : calcHourQcPass(actual, dhu)
      const downtimeMin = prev ? Math.max(0, Number(prev.downtimeMin) || 0) : 0
      const nptProblems = prev
        ? normalizeNptProblems(
            prev.nptProblems,
            downtimeMin,
            slot.problem || NPT_PROBLEM_TYPES[(lIdx + idx) % NPT_PROBLEM_TYPES.length],
            lIdx,
            idx
          )
        : []

      return {
        hour: slotLabel,
        target,
        actual,
        qcPass,
        dhu,
        downtimeMin,
        nptProblems
      }
    })

    if (nextConfig.recalcHourlyTargets && totalEfficiencyTarget > 0) {
      line.dailyTarget = totalEfficiencyTarget
    }

    if (matchedRule || nextConfig.autoAlignActiveHour) {
      line.activeHourIndex = findSlotIndexForScanTime(refNow, cleanRuleStart, ruleSlots)
    } else {
      line.activeHourIndex = Math.min(Math.max(0, Number(line.activeHourIndex) || 0), maxSlotIdx)
    }
  })
}

async function createShiftRecords(records = []) {
  if (!Array.isArray(records) || records.length === 0) return []
  isSavingShift.value = true
  try {
    const created = []
    for (const slot of records) {
      const payload = {
        id: slot.id,
        section: slot.section,
        Shift: slot.Shift,
        Shift_Start_time: slot.Shift_Start_time,
        submissionDate: slot.submissionDate,
        date: slot.date,
        create_at: slot.create_at
      }
      const res = await dbAPI.createRecord(SHIFT_SHEET_NAME, payload)
      created.push(res || payload)
    }
    return created
  } finally {
    isSavingShift.value = false
  }
}

async function fetchShiftRulesFromApi({ silent = true } = {}) {
  if (!dbAPI?.readRecords) return shiftRules.value
  try {
    const records = await dbAPI.readRecords(SHIFT_SHEET_NAME)
    const list = Array.isArray(records) ? records : []
    const valid = list.filter(
      (r) => r && (String(r.section || '').trim() || String(r.Shift_Start_time || '').trim())
    )
    if (valid.length > 0) {
      const merged = new Map(shiftRules.value.map((r) => [buildRuleSignature(r), r]))
      valid.forEach((row, idx) => {
        const dateKey = toDateKey(row.submissionDate || row.date || submissionDate.value)
        const normalized = {
          id: String(row.id || row.ID || `SHF-${idx + 1}`),
          section: String(row.section || row.Section || '').trim(),
          hour: String(row.section || row.Section || '').trim(),
          Shift: String(row.Shift || row.shift || 'Shift A (Day)').trim(),
          Shift_Start_time: String(row.Shift_Start_time || '08:00').trim(),
          submissionDate: dateKey,
          date: dateKey,
          create_at: String(row.create_at || new Date().toISOString())
        }
        merged.set(buildRuleSignature(normalized), normalized)
      })
      shiftRules.value = Array.from(merged.values())
      persistShiftConfig(shiftConfig.value)
      if (!silent) {
        notify(`Loaded ${valid.length} shift rule(s) from ${SHIFT_SHEET_NAME}`)
      }
    }
    return shiftRules.value
  } catch (err) {
    if (!silent) {
      notify(`Shift fetch failed: ${err.message}`)
    }
    return shiftRules.value
  }
}

async function saveShiftControl() {
  const savedDateKey = toDateKey(submissionDate.value || shiftDraft.value.submissionDate || new Date())
  submissionDate.value = savedDateKey

  const rawSlots = Array.isArray(shiftDraft.value.slots) ? shiftDraft.value.slots : []
  const filledSlots = rawSlots.filter(
    (slot) =>
      String(slot.section || slot.hour || '').trim() !== '' ||
      String(slot.Shift_Start_time || '').trim() !== ''
  )

  if (filledSlots.length === 0) {
    notify('Please select a section or enter a shift start time before saving')
    return
  }

  const firstSlotStartRaw = String(
    filledSlots[0]?.Shift_Start_time ||
      shiftConfig.value.Shift_Start_time ||
      shiftConfig.value.startTime ||
      '08:00'
  ).trim()

  const parsedMin = parseFlexibleTimeToMinutes(
    firstSlotStartRaw,
    parseFlexibleTimeToMinutes(
      shiftConfig.value.Shift_Start_time || shiftConfig.value.startTime,
      8 * 60
    )
  )
  const cleanStartHHMM = formatMinutesToHHMM(parsedMin)
  const hrs = getConfiguredDurationHours(shiftDraft.value.durationHours)
  const cleanEnd = calcEndTimeFromStart(cleanStartHHMM, hrs)
  const cleanShift =
    String(
      filledSlots[0]?.Shift || shiftDraft.value.Shift || shiftDraft.value.shiftName || ''
    ).trim() || 'Shift A (Day)'
  const recordId =
    String(shiftDraft.value.id || '').trim() || `SHF-${Date.now().toString().slice(-4)}`
  const createdAtIso = shiftDraft.value.create_at || new Date().toISOString()

  const normalizedSlots = filledSlots.map((slot, idx) => {
    const sectionLabel = String(slot.section || slot.hour || '').trim()
    const rawSlotStart = String(slot.Shift_Start_time || firstSlotStartRaw).trim()
    const slotCreated = String(slot.create_at || createdAtIso)
    return {
      ...slot,
      id: String(slot.id || `${recordId}-${idx + 1}`),
      section: sectionLabel,
      hour: sectionLabel,
      Shift: String(slot.Shift || cleanShift),
      Shift_Start_time: rawSlotStart,
      submissionDate: savedDateKey,
      date: savedDateKey,
      create_at: slotCreated
    }
  })

  const nextRuleMap = new Map(shiftRules.value.map((r) => [buildRuleSignature(r), r]))
  normalizedSlots.forEach((slot) => {
    nextRuleMap.set(buildRuleSignature(slot), { ...slot })
  })
  shiftRules.value = Array.from(nextRuleMap.values())

  // Only update global shiftConfig if no specific section was targeted or it matches default board flow
  const hasSpecificSection = normalizedSlots.some((s) => Boolean(s.section))
  const nextSlots = buildShiftSlotsFromStartPlus80Min(
    cleanStartHHMM,
    hrs,
    cleanShift,
    recordId,
    createdAtIso,
    null,
    firstSlotStartRaw,
    savedDateKey
  )

  const nextConfig = hasSpecificSection
    ? {
        ...shiftConfig.value,
        submissionDate: savedDateKey,
        date: savedDateKey
      }
    : {
        ...shiftConfig.value,
        id: recordId,
        Shift: cleanShift,
        shiftName: cleanShift,
        Shift_Start_time: firstSlotStartRaw,
        startTime: firstSlotStartRaw,
        endTime: cleanEnd,
        durationHours: hrs,
        submissionDate: savedDateKey,
        date: savedDateKey,
        create_at: createdAtIso,
        autoAlignActiveHour: Boolean(shiftDraft.value.autoAlignActiveHour),
        recalcHourlyTargets: Boolean(shiftDraft.value.recalcHourlyTargets),
        slots: nextSlots
      }

  shiftConfig.value = nextConfig
  persistShiftConfig(nextConfig)
  applyShiftConfigToLines(nextConfig, savedDateKey)

  try {
    await createShiftRecords(normalizedSlots)
    resetShiftDraft()
    isShiftModalOpen.value = false
    lastUpdated.value = new Date().toLocaleTimeString()
    notify(
      `Created ${normalizedSlots.length} shift record(s) in ${SHIFT_SHEET_NAME} (${savedDateKey})`
    )
  } catch (err) {
    notify(`Saved locally · Sheet error: ${err.message}`)
  }
}

const BUYERS = [
  'Nordic Apparel',
  'Kestrel Basics',
  'Harbor & Loom',
  'Alder & Co.',
  'Northsea Knitwear'
]

const STYLE_TYPES = ['KNT', 'WVN', 'PNT', 'JKT', 'TSH']
const ITEM_NAMES_BY_TYPE = {
  KNT: 'Knit Garment',
  WVN: 'Woven Garment',
  PNT: 'Pant',
  JKT: 'Jacket',
  TSH: 'T-Shirt'
}
const MODELS = ['MOD-ALPHA-V2', 'MOD-SOLO-V4', 'MOD-CORE-V1', 'MOD-PRO-V3', 'MOD-LITE-V2']

const QR_OPTIONS = [
  {
    key: 'FIRST_MC',
    label: '1st M/C',
    badge: 'LINE FEED',
    defaultStation: '1st M/C - Feed / Collar'
  },
  {
    key: 'LAST_MC',
    label: 'Last M/C',
    badge: 'LINE OUTPUT',
    defaultStation: 'Last M/C - Hem / End'
  },
  {
    key: 'QC_PASS',
    label: 'QC Pass',
    badge: 'QUALITY PASS',
    defaultStation: 'Endline QC Pass Check'
  }
]

function getUnitForLineIndex(index, linesPerUnit = LINES_PER_UNIT) {
  const unitNum = Math.floor(Math.max(0, index) / linesPerUnit) + 1
  return `Unit-${unitNum}`
}

function inferItemName(styleNo = '') {
  const upper = String(styleNo).toUpperCase()
  const matchedKey = STYLE_TYPES.find((code) => upper.endsWith(`-${code}`) || upper.includes(code))
  return matchedKey ? ITEM_NAMES_BY_TYPE[matchedKey] : 'Apparel Item'
}

function calcHourQcPass(actual, dhu) {
  const cleanActual = Math.max(0, Math.round(Number(actual) || 0))
  if (cleanActual === 0) return 0
  const cleanDhu = Math.max(0, Number(dhu) || 0)
  const defects = Math.min(cleanActual, Math.round((cleanActual * cleanDhu) / 100))
  return Math.max(0, cleanActual - defects)
}

function calcNptLossPcs(totalNptMin, smv) {
  const mins = Math.max(0, Number(totalNptMin) || 0)
  if (mins <= 0) return 0
  const safeSmv = Math.max(0.1, Number(smv) || 1)
  const rawLoss = mins / safeSmv
  if (rawLoss > 0 && rawLoss < 0.5) {
    return Number(rawLoss.toFixed(1))
  }
  return Math.round(rawLoss)
}

function formatPcsValue(val) {
  const num = Number(val) || 0
  if (Number.isInteger(num)) return num.toLocaleString()
  return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function normalizeNptProblems(
  rawProblems,
  downtimeMin,
  fallbackProblem = 'MACHINE PROBLEM',
  lineIdx = 0,
  hourIdx = 0
) {
  const cleanMins = Math.max(0, Number(downtimeMin) || 0)
  if (cleanMins === 0) return []

  if (Array.isArray(rawProblems) && rawProblems.length > 0) {
    const cleaned = rawProblems
      .map((item) => ({
        problem: String(item?.problem || fallbackProblem || 'MACHINE PROBLEM')
          .trim()
          .toUpperCase(),
        minutes: Math.max(0, Number(item?.minutes) || 0)
      }))
      .filter((item) => item.minutes > 0)
    if (cleaned.length > 0) return cleaned
  }

  const defaultProb =
    fallbackProblem || NPT_PROBLEM_TYPES[(lineIdx + hourIdx) % NPT_PROBLEM_TYPES.length]
  return [{ problem: String(defaultProb).toUpperCase(), minutes: cleanMins }]
}

function buildHourlyRows(
  dailyTarget,
  activeHourIndex = 6,
  lineIndex = 0,
  lineConfig = {}
) {
  const slots = BASE_HOURS.value
  const hasEfficiencyInputs =
    lineConfig &&
    (lineConfig.smv !== undefined ||
      lineConfig.targetEfficiency !== undefined ||
      lineConfig.operators !== undefined ||
      lineConfig.helpers !== undefined)

  return slots.map((slot, idx) => {
    const slotMins = getSlotMinutes(slot, idx === 0 ? FIRST_SLOT_OFFSET_MINUTES : 60)
    const target = hasEfficiencyInputs
      ? calcSlotTargetFromEfficiency(
          lineConfig.operators ?? 32,
          lineConfig.helpers ?? 6,
          lineConfig.smv ?? 14.0,
          lineConfig.targetEfficiency ?? 75,
          slotMins
        )
      : Math.round((Number(dailyTarget) || 0) * (Number(slot.ratio) || 1 / slots.length))

    let actual = 0
    if (idx < activeHourIndex) {
      const factor = idx % 3 === 0 ? 0.95 : idx % 2 === 0 ? 0.99 : 1.03
      actual = Math.round(target * factor)
    } else if (idx === activeHourIndex) {
      actual = Math.round(target * 0.68)
    }

    const hasOutput = actual > 0
    const dhu = hasOutput ? slot.dhu : 0
    const extraMin = hasOutput && lineIndex > 3 && idx % 2 === 1 ? (lineIndex % 3) + 1 : 0
    const downtimeMin = hasOutput ? slot.downtimeMin + extraMin : 0
    const probName =
      slot.problem || NPT_PROBLEM_TYPES[(lineIndex + idx) % NPT_PROBLEM_TYPES.length]

    return {
      hour: slot.section || slot.hour,
      target,
      actual,
      qcPass: calcHourQcPass(actual, dhu),
      dhu,
      downtimeMin,
      nptProblems: normalizeNptProblems([], downtimeMin, probName, lineIndex, idx)
    }
  })
}

function normalizeLineRows(rawRows, lineIndex = 0) {
  return (rawRows || []).map((r, idx) => {
    const fallbackQc = calcHourQcPass(r.actual, r.dhu)
    const qcPass =
      typeof r.qcPass === 'number' && !Number.isNaN(r.qcPass)
        ? Math.min(Math.max(0, Math.round(r.actual || 0)), Math.max(0, Math.round(r.qcPass)))
        : fallbackQc
    const cleanDowntime = Math.max(0, Number(r.downtimeMin) || 0)
    const nptProblems = normalizeNptProblems(
      r.nptProblems,
      cleanDowntime,
      r.nptProblem || NPT_PROBLEM_TYPES[(lineIndex + idx) % NPT_PROBLEM_TYPES.length],
      lineIndex,
      idx
    )
    return {
      ...r,
      qcPass,
      downtimeMin: cleanDowntime,
      nptProblems
    }
  })
}

function aggregateProblemsFromRows(hourlyRows) {
  const map = {}
  ;(hourlyRows || []).forEach((r, idx) => {
    const mins = Math.max(0, Number(r.downtimeMin) || 0)
    if (mins <= 0) return
    const items = normalizeNptProblems(
      r.nptProblems,
      mins,
      NPT_PROBLEM_TYPES[idx % NPT_PROBLEM_TYPES.length],
      0,
      idx
    )
    items.forEach((entry) => {
      const key = entry.problem || 'MACHINE PROBLEM'
      map[key] = (map[key] || 0) + (Number(entry.minutes) || 0)
    })
  })
  return Object.entries(map)
    .map(([problem, minutes]) => ({ problem, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

function mergeProblemSummaries(summaries) {
  const map = {}
  summaries.forEach((list) => {
    ;(list || []).forEach((item) => {
      const key = item.problem || 'MACHINE PROBLEM'
      map[key] = (map[key] || 0) + (Number(item.minutes) || 0)
    })
  })
  return Object.entries(map)
    .map(([problem, minutes]) => ({ problem, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

const linesData = ref([])
const itemOptions = ref(Object.values(ITEM_NAMES_BY_TYPE))

function buildDefaultFallbackLines(totalLines = 33) {
  return Array.from({ length: totalLines }, (_, idx) => {
    const num = idx + 1
    const smv = 14.0
    const operators = 32
    const helpers = 6
    const targetEfficiency = 75
    const hourlyRows = buildHourlyRows(0, 6, idx, {
      smv,
      operators,
      helpers,
      targetEfficiency
    })
    const computedDailyTarget = hourlyRows.reduce((s, r) => s + (Number(r.target) || 0), 0)

    return {
      id: `line-${num}`,
      lineName: `Line-${num}`,
      unit: getUnitForLineIndex(idx),
      section: '',
      Shift: shiftConfig.value.Shift,
      Shift_Start_time: shiftConfig.value.Shift_Start_time,
      submissionDate: submissionDate.value,
      isActive: true,
      poNo: '',
      styleNo: '',
      itemName: itemOptions.value[0] || 'Apparel Item',
      modelNo: MODELS[idx % MODELS.length],
      buyer: BUYERS[idx % BUYERS.length],
      smv,
      operators,
      helpers,
      dailyTarget: computedDailyTarget || 1400,
      targetEfficiency,
      maxLineGap: 60,
      firstMachineTotal: 0,
      activeHourIndex: 6,
      hourlyRows
    }
  })
}

const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1440)
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 900)

const displayMode = computed(() => {
  const w = viewportWidth.value
  if (w < 640) return 'compact'
  if (w < 1024) return 'tablet'
  if (w < 1536) return 'desktop'
  return 'ultrawide'
})

const isPortrait = computed(() => viewportHeight.value > viewportWidth.value)

const currentDisplayMeta = computed(() => ({
  displayMode: displayMode.value,
  orientation: isPortrait.value ? 'portrait' : 'landscape',
  viewportWidth: viewportWidth.value,
  viewportHeight: viewportHeight.value
}))

function updateViewportSize() {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
}

const selectedUnit = ref('ALL')
const selectedLineId = ref('ALL')
const onlyGapAlerts = ref(false)
const onlyActiveLines = ref(false)
const searchQuery = ref('')
const isLiveSimulating = ref(false)
const isSyncingGas = ref(false)
const toastMessage = ref('')
const lastUpdated = ref(new Date().toLocaleTimeString())
const liveClock = ref(new Date().toLocaleTimeString())
let simTimer = null
let toastTimer = null
let clockTimer = null
let isProcessingQrScan = false
let qrSessionCounter = 0

const isPopupOpen = ref(false)
const excelGridRef = ref(null)
const popupDraft = ref({
  unit: 'Unit-1',
  date: toDateKey(new Date()),
  recalcHourlyTargets: false,
  lines: []
})

const isQrModalOpen = ref(false)
const selectedQrOption = ref('')
const isOutputEntered = ref(false)
const isScanStepVisible = ref(false)
const qrScanInput = ref('')
const scannedQrCode = ref('')
const scannedLineLabel = ref('')
const scannedAtTime = ref('')
const scannedAtIso = ref('')
const isQrScanned = ref(false)
const qrScanFeedback = ref('')
const qrScanHistory = ref([])
const qrScannerInputRef = ref(null)

const isCameraActive = ref(false)
const cameraError = ref('')
let html5QrScanner = null

const qrEntryOut = ref({
  lineId: 'line-1',
  hourIndex: 0,
  qty: null,
  qcPass: null,
  dhu: 1.2,
  station: ''
})

const hasValidOutputEntry = computed(() => {
  if (!selectedQrOption.value) return false
  if (selectedQrOption.value === 'QC_PASS') {
    return Number(qrEntryOut.value.qcPass) > 0
  }
  return Number(qrEntryOut.value.qty) > 0
})

function notify(msg) {
  toastMessage.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2400)
}

async function parseJsonSafely(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch (_) {
    throw new Error(text ? `Invalid JSON response: ${text.slice(0, 120)}` : 'Empty response from server')
  }
}

function normalizeLineIdFromLabel(label, fallbackIdx = 0) {
  const match = String(label || '').match(/(\d+)/)
  if (match) {
    return `line-${Number(match[1])}`
  }
  return `line-${fallbackIdx + 1}`
}

function mapSheetRowToLine(rawRow, fallbackIdx = 0, existingLine = null) {
  const unitName = String(
    rawRow?.Unit ??
      rawRow?.unit ??
      rawRow?.unitName ??
      existingLine?.unit ??
      getUnitForLineIndex(fallbackIdx)
  ).trim()

  const lineLabel = String(
    rawRow?.Line_No ??
      rawRow?.line_no ??
      rawRow?.lineNo ??
      rawRow?.lineName ??
      rawRow?.Line ??
      existingLine?.lineName ??
      `Line-${fallbackIdx + 1}`
  ).trim()

  const id = String(
    rawRow?.id ?? rawRow?.ID ?? existingLine?.id ?? normalizeLineIdFromLabel(lineLabel, fallbackIdx)
  ).trim()

  const styleNo = String(
    rawRow?.styleNo ?? rawRow?.style_no ?? rawRow?.Style_no ?? rawRow?.Style ?? existingLine?.styleNo ?? ''
  ).trim()

  const smv = Number(rawRow?.smv ?? rawRow?.SMV ?? existingLine?.smv ?? 14.0) || 14.0
  const operators =
    Number(rawRow?.operators ?? rawRow?.Operators ?? existingLine?.operators ?? 32) || 0
  const helpers =
    Number(rawRow?.helpers ?? rawRow?.Helpers ?? existingLine?.helpers ?? 6) || 0
  const targetEfficiency =
    Number(
      rawRow?.targetEfficiency ??
        rawRow?.Target_Efficiency ??
        rawRow?.target_efficiency ??
        existingLine?.targetEfficiency ??
        75
    ) || 75

  const activeHourIndex =
    Number(rawRow?.activeHourIndex ?? existingLine?.activeHourIndex ?? 6) || 6

  const hourlyRows =
    Array.isArray(rawRow?.hourlyRows) && rawRow.hourlyRows.length > 0
      ? normalizeLineRows(rawRow.hourlyRows, fallbackIdx)
      : existingLine?.hourlyRows?.length
        ? normalizeLineRows(existingLine.hourlyRows, fallbackIdx)
        : buildHourlyRows(0, activeHourIndex, fallbackIdx, {
            smv,
            operators,
            helpers,
            targetEfficiency
          })

  const computedDailyTarget = hourlyRows.reduce((s, r) => s + (Number(r.target) || 0), 0)
  const dailyTarget =
    Number(
      rawRow?.dailyTarget ??
        rawRow?.Daily_Target ??
        rawRow?.target ??
        existingLine?.dailyTarget ??
        computedDailyTarget
    ) || computedDailyTarget || 1400

  const actualSum = hourlyRows.reduce((s, r) => s + (Number(r.actual) || 0), 0)

  return {
    ...(existingLine || {}),
    id,
    unit: unitName,
    section: String(rawRow?.section ?? rawRow?.Section ?? existingLine?.section ?? '').trim(),
    Shift: String(
      rawRow?.Shift ?? rawRow?.shift ?? existingLine?.Shift ?? shiftConfig.value.Shift
    ).trim(),
    Shift_Start_time: String(
      rawRow?.Shift_Start_time ??
        existingLine?.Shift_Start_time ??
        shiftConfig.value.Shift_Start_time
    ).trim(),
    submissionDate: toDateKey(
      rawRow?.submissionDate ??
        rawRow?.Setup_Date ??
        rawRow?.date ??
        existingLine?.submissionDate ??
        submissionDate.value
    ),
    lineName: lineLabel,
    isActive:
      typeof rawRow?.isActive === 'boolean'
        ? rawRow.isActive
        : rawRow?.Status
          ? String(rawRow.Status).toLowerCase() !== 'deactive'
          : existingLine?.isActive !== false,
    poNo: String(rawRow?.poNo ?? rawRow?.PO_No ?? rawRow?.Po_no ?? existingLine?.poNo ?? '').trim(),
    styleNo,
    itemName: String(
      rawRow?.itemName ??
        rawRow?.Item_name ??
        rawRow?.Item_Name ??
        rawRow?.item ??
        existingLine?.itemName ??
        inferItemName(styleNo)
    ).trim(),
    modelNo: String(
      rawRow?.modelNo ?? rawRow?.Model_No ?? existingLine?.modelNo ?? 'MOD-ALPHA-V2'
    ).trim(),
    buyer: String(
      rawRow?.buyer ??
        rawRow?.Buyer ??
        rawRow?.Factory_Name ??
        existingLine?.buyer ??
        BUYERS[fallbackIdx % BUYERS.length]
    ).trim(),
    smv,
    operators,
    helpers,
    dailyTarget,
    targetEfficiency,
    maxLineGap: Number(rawRow?.maxLineGap ?? existingLine?.maxLineGap ?? 60) || 60,
    firstMachineTotal:
      Number(
        rawRow?.firstMachineTotal ?? existingLine?.firstMachineTotal ?? actualSum + 25
      ) || 0,
    activeHourIndex,
    hourlyRows
  }
}

async function fetchUnitLinesFromApi({ silent = false } = {}) {
  if (!Unit_line_API?.readRecords) return []
  isSyncingGas.value = true
  try {
    const records = await Unit_line_API.readRecords(UNIT_LINE_SHEET)
    const list = Array.isArray(records) ? records : []

    const validRows = list.filter(
      (r) =>
        r &&
        (String(r.Unit || r.unit || '').trim() ||
          String(r.Line_No || r.line_no || r.lineName || r.Line || '').trim())
    )

    if (validRows.length === 0) {
      linesData.value = []
      selectedLineId.value = 'ALL'
      lastUpdated.value = new Date().toLocaleTimeString()
      if (!silent) {
        notify(`${UNIT_LINE_SHEET} is blank — live board is empty`)
      }
      return []
    }

    const byId = new Map(linesData.value.map((l) => [l.id, l]))
    const byLabel = new Map(linesData.value.map((l) => [String(l.lineName).toLowerCase(), l]))

    linesData.value = validRows.map((row, idx) => {
      const candidateLabel = String(
        row.Line_No ?? row.line_no ?? row.lineName ?? row.Line ?? ''
      ).trim()
      const candidateId = String(
        row.id ?? row.ID ?? existingIdOrFallback(byId, byLabel, candidateLabel, idx)
      ).trim()
      const existing = byId.get(candidateId) || byLabel.get(candidateLabel.toLowerCase()) || null
      return mapSheetRowToLine(row, idx, existing)
    })

    lastUpdated.value = new Date().toLocaleTimeString()
    if (!silent) {
      notify(`Loaded ${linesData.value.length} Unit & Line rows from ${UNIT_LINE_SHEET}`)
    }
    return linesData.value
  } catch (err) {
    if (!silent) {
      notify(`Unit/Line fetch failed: ${err.message}`)
    }
    return []
  } finally {
    isSyncingGas.value = false
  }
}

function existingIdOrFallback(byId, byLabel, candidateLabel, idx) {
  const existing = byId.get(candidateLabel) || byLabel.get(candidateLabel.toLowerCase())
  return existing?.id || normalizeLineIdFromLabel(candidateLabel, idx)
}

function extractItemNameFromRow(row) {
  if (!row || typeof row !== 'object') return ''
  return String(
    row.Item_name ??
      row.Item_Name ??
      row.itemName ??
      row.item_name ??
      row.Item ??
      row.item ??
      row.Name ??
      row.name ??
      ''
  ).trim()
}

async function fetchItemsFromApi({ silent = true } = {}) {
  const reader = item_API?.readRecords || item_API?.getRecords
  if (typeof reader !== 'function') return itemOptions.value

  try {
    const records = await reader.call(item_API)
    const list = Array.isArray(records)
      ? records
      : Array.isArray(records?.items)
        ? records.items
        : Array.isArray(records?.data)
          ? records.data
          : []
    if (!list.length) return itemOptions.value

    const seen = new Set()
    const fetchedNames = []

    list.forEach((row) => {
      const name = typeof row === 'string' ? row.trim() : extractItemNameFromRow(row)
      if (!name) return
      const key = name.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        fetchedNames.push(name)
      }
    })

    if (fetchedNames.length > 0) {
      itemOptions.value = fetchedNames

      linesData.value.forEach((line, idx) => {
        if (!line.itemName || line.itemName === 'Apparel Item') {
          const matched =
            fetchedNames.find((n) =>
              String(line.styleNo || '').toUpperCase().includes(n.toUpperCase())
            ) || fetchedNames[idx % fetchedNames.length]
          if (matched) line.itemName = matched
        }
      })

      if (!silent) {
        notify(`Loaded ${fetchedNames.length} items from Item API`)
      }
    }

    return itemOptions.value
  } catch (err) {
    if (!silent) {
      notify(`Item fetch failed: ${err.message}`)
    }
    return itemOptions.value
  }
}

async function postLineSettingBulkSave({
  unit,
  date,
  factoryName = DEFAULT_FACTORY_NAME,
  recalcHourlyTargets = false,
  lines = []
}) {
  if (BACKEND_URL) {
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'bulkSave',
        sheet: LINESETTING_SHEET_NAME,
        unit,
        date,
        factoryName,
        recalcHourlyTargets,
        lines
      })
    })
    const data = await parseJsonSafely(res)
    if (data.success === false || data.ok === false) {
      throw new Error(data.error || 'bulkSave failed')
    }
    return data
  }

  const creator =
    LineSetting?.bulkSave ||
    LineSetting?.createRecord ||
    LineSetting?.addRecord ||
    LineSetting?.insertRecord
  if (typeof creator === 'function') {
    return await creator.call(LineSetting, LINESETTING_SHEET_NAME, {
      action: 'bulkSave',
      unit,
      date,
      factoryName,
      recalcHourlyTargets,
      lines
    })
  }

  return null
}

async function sendToGasBackend(action, payload, { silent = false } = {}) {
  if (!BACKEND_URL) return null
  try {
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action,
        payload,
        submissionDate: submissionDate.value,
        shiftConfig: shiftConfig.value,
        shiftRules: shiftRules.value,
        displayMeta: currentDisplayMeta.value
      })
    })
    const data = await parseJsonSafely(res)
    if (data.ok === false || data.success === false) {
      throw new Error(data.error || `Action ${action} failed`)
    }
    return data
  } catch (err) {
    if (!silent) {
      notify(`Saved locally · GAS sync error: ${err.message}`)
    }
    return null
  }
}

async function hydrateFromGasBackend() {
  await Promise.all([
    fetchUnitLinesFromApi({ silent: false }),
    fetchItemsFromApi({ silent: true }),
    fetchShiftRulesFromApi({ silent: true })
  ])
  applyShiftConfigToLines(shiftConfig.value, submissionDate.value)
}

async function manualSyncBoardToGas() {
  isSyncingGas.value = true
  try {
    const res = await sendToGasBackend(
      'syncBoardSnapshot',
      {
        submissionDate: submissionDate.value,
        shiftConfig: JSON.parse(JSON.stringify(shiftConfig.value)),
        shiftRules: JSON.parse(JSON.stringify(shiftRules.value)),
        lines: JSON.parse(JSON.stringify(linesData.value))
      },
      { silent: false }
    )
    if (res && (res.ok || res.success)) {
      lastUpdated.value = new Date().toLocaleTimeString()
      notify(`Synced ${res.syncedLinesCount ?? linesData.value.length} lines to Sheet`)
    }
  } finally {
    isSyncingGas.value = false
  }
}

const unitOptions = computed(() => {
  const seen = new Set()
  const list = []
  linesData.value.forEach((line, idx) => {
    const u = line.unit || getUnitForLineIndex(idx)
    if (!seen.has(u)) {
      seen.add(u)
      list.push(u)
    }
  })
  return list.length > 0 ? list : DEFAULT_FALLBACK_UNITS
})

const lineDropdownOptions = computed(() => {
  const source = linesData.value.length > 0 ? linesData.value : buildDefaultFallbackLines(33)
  return source.map((line, idx) => ({
    id: line.id,
    lineName: line.lineName || `Line-${idx + 1}`,
    unit: line.unit || getUnitForLineIndex(idx),
    poNo: line.poNo || '',
    styleNo: line.styleNo || '',
    itemName: line.itemName || itemOptions.value[0] || inferItemName(line.styleNo),
    smv: Number(line.smv) || 14.0,
    operators: Number(line.operators) || 32,
    helpers: Number(line.helpers) || 6,
    dailyTarget: Number(line.dailyTarget) || 1400,
    targetEfficiency: Number(line.targetEfficiency) || 75,
    isActive: line.isActive !== false
  }))
})

const popupUnitLineChoices = computed(() => {
  const activeUnit = popupDraft.value.unit
  return lineDropdownOptions.value.filter((opt) => opt.unit === activeUnit)
})

const linesInSelectedUnit = computed(() => {
  if (selectedUnit.value === 'ALL') return linesData.value
  return linesData.value.filter(
    (line, idx) => (line.unit || getUnitForLineIndex(idx)) === selectedUnit.value
  )
})

const isAllLines = computed(() => selectedLineId.value === 'ALL' || linesData.value.length === 0)

const currentLine = computed(() => {
  return (
    linesData.value.find((l) => l.id === selectedLineId.value) ||
    linesInSelectedUnit.value[0] ||
    linesData.value[0] ||
    null
  )
})

const qrTargetLine = computed(() => {
  return (
    linesData.value.find((l) => l.id === qrEntryOut.value.lineId) ||
    linesData.value[0] || {
      id: '',
      lineName: 'No Line',
      unit: popupDraft.value.unit || 'Unit-1',
      firstMachineTotal: 0,
      hourlyRows: []
    }
  )
})

const activeOptionMeta = computed(() => {
  return QR_OPTIONS.find((opt) => opt.key === selectedQrOption.value) || null
})

function selectUnit(unitName) {
  selectedUnit.value = unitName
  if (selectedLineId.value !== 'ALL') {
    const lineObj = linesData.value.find((l) => l.id === selectedLineId.value)
    if (lineObj && unitName !== 'ALL' && lineObj.unit !== unitName) {
      selectedLineId.value = 'ALL'
    }
  }
}

function onLineSelectChange(newLineId) {
  selectedLineId.value = newLineId
  if (newLineId !== 'ALL') {
    const lineObj = linesData.value.find((l) => l.id === newLineId)
    if (lineObj && selectedUnit.value !== 'ALL' && lineObj.unit !== selectedUnit.value) {
      selectedUnit.value = lineObj.unit
    }
  }
}

function createBlankUnitLineRow(unitName, lineName = '') {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const smv = 14.0
  const operators = 32
  const helpers = 6
  const targetEfficiency = 75
  const initialDailyTarget = BASE_HOURS.value.reduce(
    (sum, slot, idx) =>
      sum +
      calcSlotTargetFromEfficiency(
        operators,
        helpers,
        smv,
        targetEfficiency,
        getSlotMinutes(slot, idx === 0 ? FIRST_SLOT_OFFSET_MINUTES : 60)
      ),
    0
  )

  return {
    rowUid: `xl-row-${suffix}`,
    lineId: '',
    unit: unitName,
    lineName,
    poNo: '',
    styleNo: '',
    itemName: itemOptions.value[0] || 'Apparel Item',
    smv,
    operators,
    helpers,
    targetEfficiency,
    dailyTarget: initialDailyTarget || 1400,
    isNewRow: true
  }
}

function appendEmptyLineRow() {
  popupDraft.value.lines.push(createBlankUnitLineRow(popupDraft.value.unit, ''))
}

function ensureTrailingRowOnAdded(rowIdx) {
  if (rowIdx === popupDraft.value.lines.length - 1) {
    appendEmptyLineRow()
  }
}

function onPopupEfficiencyInputsChange(row) {
  if (!row || !popupDraft.value.recalcHourlyTargets) return
  const slots = BASE_HOURS.value
  const total = slots.reduce(
    (sum, slot, idx) =>
      sum +
      calcSlotTargetFromEfficiency(
        row.operators,
        row.helpers,
        row.smv,
        row.targetEfficiency,
        getSlotMinutes(slot, idx === 0 ? FIRST_SLOT_OFFSET_MINUTES : 60)
      ),
    0
  )
  row.dailyTarget = total
}

function onGridLineDropdownChange(rowIdx, pickedLineId) {
  const row = popupDraft.value.lines[rowIdx]
  if (!row) return

  if (!pickedLineId) {
    row.lineId = ''
    row.lineName = ''
    return
  }

  const matched = popupUnitLineChoices.value.find((opt) => opt.id === pickedLineId)
  if (!matched) return

  row.lineId = matched.id
  row.lineName = matched.lineName
  row.poNo = matched.poNo
  row.styleNo = matched.styleNo
  row.itemName = matched.itemName
  row.smv = matched.smv
  row.operators = matched.operators
  row.helpers = matched.helpers
  row.targetEfficiency = matched.targetEfficiency
  row.dailyTarget = matched.dailyTarget

  ensureTrailingRowOnAdded(rowIdx)
}

function focusGridCell(rowIdx, colIdx) {
  const tableEl = excelGridRef.value
  if (!tableEl) return
  const rows = tableEl.querySelectorAll('tbody tr')
  if (rowIdx < 0) return
  if (rowIdx >= rows.length) {
    appendEmptyLineRow()
    nextTick(() => focusGridCell(rowIdx, colIdx))
    return
  }
  const targetRow = rows[rowIdx]
  const controls = Array.from(targetRow.querySelectorAll('input, select'))
  if (!controls.length) return
  const clampedCol = Math.max(0, Math.min(colIdx, controls.length - 1))
  const el = controls[clampedCol]
  if (el) {
    el.focus()
    if (el.tagName === 'INPUT' && el.type === 'text') {
      el.select()
    }
  }
}

function handleExcelGridKeydown(e, rowIdx, colIdx) {
  const key = e.key
  if (key === 'ArrowDown' || key === 'Enter') {
    if (e.target.tagName === 'SELECT' && key === 'ArrowDown') return
    e.preventDefault()
    if (rowIdx === popupDraft.value.lines.length - 1) {
      appendEmptyLineRow()
    }
    nextTick(() => focusGridCell(rowIdx + 1, colIdx))
  } else if (key === 'ArrowUp') {
    if (e.target.tagName === 'SELECT') return
    e.preventDefault()
    focusGridCell(rowIdx - 1, colIdx)
  } else if (key === 'ArrowRight') {
    const input = e.target
    if (input.tagName === 'INPUT' && input.type === 'text') {
      const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length
      if (!atEnd) return
    }
    e.preventDefault()
    focusGridCell(rowIdx, colIdx + 1)
  } else if (key === 'ArrowLeft') {
    const input = e.target
    if (input.tagName === 'INPUT' && input.type === 'text') {
      const atStart = input.selectionStart === 0 && input.selectionEnd === 0
      if (!atStart) return
    }
    e.preventDefault()
    focusGridCell(rowIdx, colIdx - 1)
  }
}

function getRowItemChoices(row) {
  const list = Array.isArray(itemOptions.value) ? [...itemOptions.value] : []
  const currentVal = String(row?.itemName || '').trim()
  if (currentVal && !list.some((opt) => opt.toLowerCase() === currentVal.toLowerCase())) {
    list.unshift(currentVal)
  }
  return list
}

function buildUnitPopupRows(unitName) {
  return [createBlankUnitLineRow(unitName, '')]
}

function loadPopupForUnit(unitName) {
  const resolvedUnit = unitName || unitOptions.value[0] || 'Unit-1'
  popupDraft.value = {
    unit: resolvedUnit,
    date: submissionDate.value || toDateKey(new Date()),
    recalcHourlyTargets: true,
    lines: buildUnitPopupRows(resolvedUnit)
  }
}

async function openLinePopup(lineId = null) {
  await Promise.all([
    fetchUnitLinesFromApi({ silent: true }),
    fetchItemsFromApi({ silent: true })
  ])

  let initialUnit = selectedUnit.value !== 'ALL' ? selectedUnit.value : null
  if (!initialUnit && lineId) {
    const idx = linesData.value.findIndex((l) => l.id === lineId)
    if (idx >= 0) {
      initialUnit = linesData.value[idx].unit || getUnitForLineIndex(idx)
    }
  }
  if (!initialUnit && !isAllLines.value && currentLine.value) {
    const idx = linesData.value.findIndex((l) => l.id === currentLine.value.id)
    initialUnit = currentLine.value.unit || getUnitForLineIndex(idx >= 0 ? idx : 0)
  }
  if (!initialUnit) {
    initialUnit = unitOptions.value[0] || 'Unit-1'
  }

  loadPopupForUnit(initialUnit)
  isPopupOpen.value = true
}

function closeLinePopup() {
  isPopupOpen.value = false
}

function onPopupUnitChange(newUnit) {
  loadPopupForUnit(newUnit)
}

function isRowPopulated(row) {
  if (!row) return false
  return Boolean(
    String(row.lineId || '').trim() ||
      String(row.lineName || '').trim() ||
      String(row.poNo || '').trim() ||
      String(row.styleNo || '').trim()
  )
}

const popupTotals = computed(() => {
  const rows = (popupDraft.value.lines || []).filter(isRowPopulated)
  const operators = rows.reduce((s, r) => s + (Number(r.operators) || 0), 0)
  const helpers = rows.reduce((s, r) => s + (Number(r.helpers) || 0), 0)
  const dailyTarget = rows.reduce((s, r) => s + (Number(r.dailyTarget) || 0), 0)
  const avgTargetEff = rows.length
    ? (
        rows.reduce((s, r) => s + (Number(r.targetEfficiency) || 75), 0) / rows.length
      ).toFixed(1)
    : '75.0'
  return {
    totalLines: rows.length,
    operators,
    helpers,
    manpower: operators + helpers,
    dailyTarget,
    avgTargetEff
  }
})

async function saveLinePopup() {
  const targetUnit = String(popupDraft.value.unit || '').trim() || 'Unit-1'
  const targetDate = toDateKey(popupDraft.value.date || submissionDate.value)
  submissionDate.value = targetDate

  const populatedRows = popupDraft.value.lines.filter(isRowPopulated)
  if (populatedRows.length === 0) {
    notify('Please enter at least one line row before saving')
    return
  }

  const updatedLines = []
  const slots = BASE_HOURS.value

  populatedRows.forEach((draftRow, rowIdx) => {
    const cleanLineName =
      String(draftRow.lineName || '').trim() || `Line-${rowIdx + 1}`
    const cleanPo = String(draftRow.poNo || '').trim()
    const cleanStyle = String(draftRow.styleNo || '').trim()
    const cleanItemName =
      String(draftRow.itemName || '').trim() || itemOptions.value[0] || inferItemName(cleanStyle)
    const cleanSmv = Math.max(0.1, Number(draftRow.smv) || 14.0)
    const cleanOperators = Math.max(0, Math.round(Number(draftRow.operators) || 0))
    const cleanHelpers = Math.max(0, Math.round(Number(draftRow.helpers) || 0))
    const cleanTargetEff = Math.max(1, Math.min(100, Number(draftRow.targetEfficiency) || 75))
    const effDailySum = slots.reduce(
      (sum, slot, idx) =>
        sum +
        calcSlotTargetFromEfficiency(
          cleanOperators,
          cleanHelpers,
          cleanSmv,
          cleanTargetEff,
          getSlotMinutes(slot, idx === 0 ? FIRST_SLOT_OFFSET_MINUTES : 60)
        ),
      0
    )
    const cleanTarget =
      popupDraft.value.recalcHourlyTargets || !Number(draftRow.dailyTarget)
        ? effDailySum
        : Math.max(0, Math.round(Number(draftRow.dailyTarget) || 0))

    let lineIdx = draftRow.lineId
      ? linesData.value.findIndex((l) => l.id === draftRow.lineId)
      : -1
    if (lineIdx < 0) {
      lineIdx = linesData.value.findIndex(
        (l) => String(l.lineName || '').toLowerCase() === cleanLineName.toLowerCase()
      )
    }

    let line
    if (lineIdx >= 0) {
      line = linesData.value[lineIdx]
    } else {
      const globalIdx = linesData.value.length
      line = {
        id: draftRow.lineId || `line-${globalIdx + 1}`,
        lineName: cleanLineName,
        unit: targetUnit,
        section: '',
        Shift: shiftConfig.value.Shift,
        Shift_Start_time: shiftConfig.value.Shift_Start_time,
        submissionDate: targetDate,
        date: targetDate,
        isActive: true,
        poNo: cleanPo,
        styleNo: cleanStyle,
        itemName: cleanItemName,
        modelNo: MODELS[globalIdx % MODELS.length],
        buyer: BUYERS[globalIdx % BUYERS.length],
        smv: cleanSmv,
        operators: cleanOperators,
        helpers: cleanHelpers,
        targetEfficiency: cleanTargetEff,
        dailyTarget: cleanTarget,
        maxLineGap: 60,
        firstMachineTotal: 0,
        activeHourIndex: Math.min(6, Math.max(0, slots.length - 1)),
        hourlyRows: buildHourlyRows(
          cleanTarget,
          Math.min(6, Math.max(0, slots.length - 1)),
          globalIdx,
          {
            smv: cleanSmv,
            operators: cleanOperators,
            helpers: cleanHelpers,
            targetEfficiency: cleanTargetEff
          }
        )
      }
      linesData.value.push(line)
      lineIdx = linesData.value.length - 1
    }

    line.unit = targetUnit
    line.lineName = cleanLineName
    line.submissionDate = targetDate
    line.date = targetDate
    line.isActive = true
    line.poNo = cleanPo
    line.styleNo = cleanStyle
    line.itemName = cleanItemName
    line.smv = cleanSmv
    line.operators = cleanOperators
    line.helpers = cleanHelpers
    line.targetEfficiency = cleanTargetEff
    line.dailyTarget = cleanTarget

    if (popupDraft.value.recalcHourlyTargets) {
      let sumTargets = 0
      line.hourlyRows.forEach((row, idx) => {
        const slot = slots[idx] || {}
        const slotMins = getSlotMinutes(slot, idx === 0 ? FIRST_SLOT_OFFSET_MINUTES : 60)
        const nextTarget = calcSlotTargetFromEfficiency(
          cleanOperators,
          cleanHelpers,
          cleanSmv,
          cleanTargetEff,
          slotMins
        )
        row.target = nextTarget
        sumTargets += nextTarget
      })
      if (sumTargets > 0) {
        line.dailyTarget = sumTargets
      }
    }

    updatedLines.push(JSON.parse(JSON.stringify(line)))
  })

  lastUpdated.value = new Date().toLocaleTimeString()
  isPopupOpen.value = false
  isSavingLineSetting.value = true

  try {
    const bulkResult = await postLineSettingBulkSave({
      unit: targetUnit,
      date: targetDate,
      factoryName: DEFAULT_FACTORY_NAME,
      recalcHourlyTargets: Boolean(popupDraft.value.recalcHourlyTargets),
      lines: updatedLines
    })
    notify(
      bulkResult?.message ||
        `${targetUnit} (${updatedLines.length} lines · ${targetDate}) saved`
    )
    await sendToGasBackend(
      'syncBoardSnapshot',
      {
        submissionDate: targetDate,
        shiftConfig: JSON.parse(JSON.stringify(shiftConfig.value)),
        shiftRules: JSON.parse(JSON.stringify(shiftRules.value)),
        lines: updatedLines
      },
      { silent: true }
    )
  } catch (err) {
    notify(`Board updated · Sheet save error: ${err.message}`)
  } finally {
    isSavingLineSetting.value = false
  }
}

async function stopQrCamera() {
  isCameraActive.value = false
  if (html5QrScanner) {
    const scannerRef = html5QrScanner
    html5QrScanner = null
    try {
      if (scannerRef.isScanning) {
        await scannerRef.stop()
      }
      await scannerRef.clear()
    } catch (_) {
      // Ignore cleanup errors if already stopped or still starting
    }
  }
}

async function startQrCamera() {
  qrSessionCounter += 1
  const currentSession = qrSessionCounter
  cameraError.value = ''

  if (!isQrModalOpen.value || !isScanStepVisible.value) return
  if (!navigator?.mediaDevices?.getUserMedia) {
    cameraError.value = 'Camera API unavailable. Use HTTPS/localhost or type/scan manually.'
    return
  }

  await stopQrCamera()
  await nextTick()
  if (currentSession !== qrSessionCounter || !isQrModalOpen.value || !isScanStepVisible.value) {
    return
  }

  const boxSize = Math.max(160, Math.min(220, viewportWidth.value - 96))

  try {
    const scanner = new Html5Qrcode('qr-camera-reader')
    html5QrScanner = scanner
    isCameraActive.value = true

    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: boxSize, height: boxSize } },
      async (decodedText) => {
        if (currentSession !== qrSessionCounter) return
        qrScanInput.value = decodedText
        await stopQrCamera()
        await confirmQrScan(decodedText)
      },
      () => {
        // Ignore per-frame scan misses while searching
      }
    )

    if (currentSession !== qrSessionCounter || !isQrModalOpen.value || !isScanStepVisible.value) {
      await stopQrCamera()
    }
  } catch (err) {
    if (currentSession === qrSessionCounter) {
      isCameraActive.value = false
      cameraError.value = `Could not start camera: ${err?.message || 'Permission denied'}`
    }
  }
}

async function resetQrFlowState(keepOption = false) {
  qrSessionCounter += 1
  await stopQrCamera()
  cameraError.value = ''
  isScanStepVisible.value = false
  isOutputEntered.value = false
  qrScanInput.value = ''
  scannedQrCode.value = ''
  scannedLineLabel.value = ''
  scannedAtTime.value = ''
  scannedAtIso.value = ''
  isQrScanned.value = false
  qrScanFeedback.value = ''

  if (!keepOption) {
    selectedQrOption.value = ''
    qrEntryOut.value.qty = null
    qrEntryOut.value.qcPass = null
    qrEntryOut.value.station = ''
  } else if (selectedQrOption.value) {
    const meta = QR_OPTIONS.find((o) => o.key === selectedQrOption.value)
    isOutputEntered.value = true
    qrEntryOut.value.qty = null
    qrEntryOut.value.qcPass = null
    qrEntryOut.value.station = meta?.defaultStation || ''
    qrScanFeedback.value = `Enter ${meta?.label} output quantity, then click "Scan QR →".`
  }
}

async function openQrEntryPopup() {
  const defaultLine = !isAllLines.value
    ? currentLine.value
    : linesInSelectedUnit.value[0] || linesData.value[0]
  const matchedSlotIdx = findSlotIndexForScanTime(
    new Date(),
    shiftConfig.value.Shift_Start_time || shiftConfig.value.startTime,
    BASE_HOURS.value
  )

  await resetQrFlowState(false)
  qrEntryOut.value = {
    lineId: defaultLine?.id || 'line-1',
    hourIndex: matchedSlotIdx,
    qty: null,
    qcPass: null,
    dhu: 1.2,
    station: ''
  }
  isQrModalOpen.value = true
}

async function closeQrEntryPopup() {
  qrSessionCounter += 1
  isQrModalOpen.value = false
  await resetQrFlowState(false)
}

async function onQrOptionDropdownChange(optionKey) {
  qrSessionCounter += 1
  await stopQrCamera()
  cameraError.value = ''
  selectedQrOption.value = optionKey
  isScanStepVisible.value = false
  isQrScanned.value = false
  scannedQrCode.value = ''
  scannedLineLabel.value = ''
  scannedAtTime.value = ''
  scannedAtIso.value = ''
  qrScanInput.value = ''
  qrEntryOut.value.qty = null
  qrEntryOut.value.qcPass = null

  const meta = QR_OPTIONS.find((o) => o.key === optionKey)
  qrEntryOut.value.station = meta?.defaultStation || ''
  isOutputEntered.value = Boolean(optionKey)
  qrScanFeedback.value = optionKey
    ? `Enter ${meta?.label} output quantity, then click "Scan QR →".`
    : ''
}

async function handleOutputEntryChange() {
  if (!selectedQrOption.value) return
  if (!hasValidOutputEntry.value) {
    qrSessionCounter += 1
    isScanStepVisible.value = false
    await stopQrCamera()
  }
}

async function openScanAfterOutput() {
  if (!selectedQrOption.value) {
    qrScanFeedback.value = 'Please select an option first.'
    return
  }
  if (!hasValidOutputEntry.value) {
    qrScanFeedback.value = 'Please enter a valid output quantity (greater than 0) first.'
    return
  }

  isScanStepVisible.value = true
  isQrScanned.value = false
  qrScanFeedback.value = `Output entered. Scan QR code now for ${activeOptionMeta.value?.label}.`
  await nextTick()
  if (!isQrModalOpen.value) return
  if (displayMode.value === 'desktop' || displayMode.value === 'ultrawide') {
    qrScannerInputRef.value?.focus()
  }
  await startQrCamera()
}

function parseQrPayload(rawText) {
  const clean = String(rawText || '').trim()
  if (!clean) return null

  const upper = clean.toUpperCase()
  let lineId = null

  const explicitMatch = upper.match(/(?:\bLINE[\s:_-]*|\bL)(\d+)\b/)
  if (explicitMatch) {
    const num = Number(explicitMatch[1])
    const matchedLine = linesData.value.find((line) => {
      const nameMatch = String(line.lineName || '').toUpperCase().match(/(\d+)/)
      const idMatch = String(line.id || '').toUpperCase().match(/(\d+)/)
      return (nameMatch && Number(nameMatch[1]) === num) || (idMatch && Number(idMatch[1]) === num)
    })
    lineId = matchedLine?.id || `line-${num}`
  }

  return { raw: clean, lineId }
}

async function confirmQrScan(overrideCode = '') {
  if (isProcessingQrScan) return
  if (!selectedQrOption.value) {
    qrScanFeedback.value = 'Please select an option first.'
    return
  }
  if (!hasValidOutputEntry.value) {
    qrScanFeedback.value = 'Enter output quantity before scanning.'
    return
  }

  const rawCode = String(overrideCode || qrScanInput.value || '').trim()
  if (!rawCode) {
    qrScanFeedback.value = 'Scan or enter a QR code first.'
    return
  }

  isProcessingQrScan = true
  try {
    if (isCameraActive.value) {
      await stopQrCamera()
    }

    const scanDate = new Date()
    const scanTimeStr = scanDate.toLocaleTimeString()
    const scanIsoStr = scanDate.toISOString()

    const parsed = parseQrPayload(rawCode)
    scannedQrCode.value = parsed?.raw || rawCode
    scannedAtTime.value = scanTimeStr
    scannedAtIso.value = scanIsoStr
    isQrScanned.value = true

    if (parsed?.lineId) {
      qrEntryOut.value.lineId = parsed.lineId
    }

    const mappedSlotIdx = findSlotIndexForScanTime(
      scanDate,
      shiftConfig.value.Shift_Start_time || shiftConfig.value.startTime,
      BASE_HOURS.value
    )
    qrEntryOut.value.hourIndex = mappedSlotIdx

    const targetLineObj =
      linesData.value.find((l) => l.id === qrEntryOut.value.lineId) || linesData.value[0]
    scannedLineLabel.value = targetLineObj?.lineName || qrEntryOut.value.lineId

    await insertScannedQrRecord(scanTimeStr, scanIsoStr)
    if (isQrModalOpen.value) {
      qrScanInput.value = ''
    }
  } finally {
    isProcessingQrScan = false
  }
}

async function insertScannedQrRecord(scanTimeStr, scanIsoStr) {
  if (!linesData.value.length) {
    qrScanFeedback.value = `Scanned ${scannedQrCode.value} at ${scanTimeStr}, but no lines exist on the board.`
    return
  }

  const line = linesData.value.find((l) => l.id === qrEntryOut.value.lineId) || linesData.value[0]
  if (!line || !Array.isArray(line.hourlyRows) || line.hourlyRows.length === 0) {
    qrScanFeedback.value = `Scanned ${scannedQrCode.value} at ${scanTimeStr}, but no hourly rows were found.`
    return
  }

  const resolvedLineName = line.lineName || scannedLineLabel.value || qrEntryOut.value.lineId
  scannedLineLabel.value = resolvedLineName

  const idx = Math.min(
    Math.max(0, Number(qrEntryOut.value.hourIndex) ?? 0),
    line.hourlyRows.length - 1
  )
  const row = line.hourlyRows[idx]
  const qty = Math.max(1, Math.round(Number(qrEntryOut.value.qty) || 0))
  const qcAdd = Math.max(1, Math.round(Number(qrEntryOut.value.qcPass) || 0))
  const dhuVal = Math.max(0, Number(qrEntryOut.value.dhu) || 0)

  let logSummary = ''
  let historyBadge = ''

  if (selectedQrOption.value === 'FIRST_MC') {
    const lineActual = line.hourlyRows.reduce((s, r) => s + r.actual, 0)
    line.firstMachineTotal = Math.max(lineActual, line.firstMachineTotal + qty)
    logSummary = `1st M/C +${qty} pcs on ${resolvedLineName} (${row.hour}) · Scanned at ${scanTimeStr}`
    historyBadge = `+${qty} 1st M/C`
  } else if (selectedQrOption.value === 'LAST_MC') {
    row.actual += qty
    row.dhu = dhuVal
    const nextQcDelta = calcHourQcPass(qty, dhuVal)
    row.qcPass = Math.min(row.actual, (Number(row.qcPass) || 0) + nextQcDelta)
    line.firstMachineTotal = Math.max(
      line.firstMachineTotal,
      line.hourlyRows.reduce((s, r) => s + r.actual, 0)
    )
    logSummary = `Last M/C +${qty} pcs (+${nextQcDelta} QC) on ${resolvedLineName} (${row.hour}) · Scanned at ${scanTimeStr}`
    historyBadge = `+${qty} Out / +${nextQcDelta} QC`
  } else if (selectedQrOption.value === 'QC_PASS') {
    row.dhu = dhuVal
    const nextQcTotal = (Number(row.qcPass) || 0) + qcAdd
    if (Number(row.actual || 0) < nextQcTotal) {
      row.actual = nextQcTotal
    }
    row.qcPass = nextQcTotal
    line.firstMachineTotal = Math.max(
      line.firstMachineTotal,
      line.hourlyRows.reduce((s, r) => s + r.actual, 0)
    )
    logSummary = `QC Pass +${qcAdd} pcs on ${resolvedLineName} (${row.hour}) · Scanned at ${scanTimeStr}`
    historyBadge = `+${qcAdd} QC Pass`
  }

  lastUpdated.value = scanTimeStr
  qrScanFeedback.value = `Slot ${idx + 1} (${row.hour}) · "${scannedQrCode.value}" · Line: ${resolvedLineName} · Scan Time: ${scanTimeStr} (${historyBadge}).`

  qrScanHistory.value.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: scanTimeStr,
    scannedAt: scanIsoStr,
    optionLabel: activeOptionMeta.value?.label || selectedQrOption.value,
    lineName: resolvedLineName,
    slotLabel: row.hour,
    qrCode: scannedQrCode.value,
    summary: historyBadge
  })
  if (qrScanHistory.value.length > 6) qrScanHistory.value.pop()

  notify(logSummary)

  await sendToGasBackend('saveQrEntry', {
    optionKey: selectedQrOption.value,
    optionLabel: activeOptionMeta.value?.label || selectedQrOption.value,
    qrCode: scannedQrCode.value,
    scannedAt: scanIsoStr,
    scanTime: scanTimeStr,
    lineId: line.id,
    lineName: resolvedLineName,
    unit: line.unit,
    hourIndex: idx,
    hour: row.hour,
    qty: selectedQrOption.value === 'QC_PASS' ? qcAdd : qty,
    qcPass: row.qcPass,
    dhu: row.dhu,
    station: qrEntryOut.value.station,
    updatedLine: JSON.parse(JSON.stringify(line))
  })
}

function syncHourlyRowToGas(line, rowIndex) {
  const row = line?.hourlyRows?.[rowIndex]
  if (!line || !row) return
  sendToGasBackend(
    'updateHourlyRow',
    {
      lineId: line.id,
      lineName: line.lineName,
      unit: line.unit,
      hourIndex: rowIndex,
      ...JSON.parse(JSON.stringify(row))
    },
    { silent: true }
  )
}

function onHourlyActualChange(line, rowIndex) {
  const row = line.hourlyRows[rowIndex]
  if (!row) return
  const cleanActual = Math.max(0, Math.round(Number(row.actual) || 0))
  row.actual = cleanActual
  if (cleanActual === 0) {
    row.qcPass = 0
  } else if ((Number(row.qcPass) || 0) > cleanActual) {
    row.qcPass = cleanActual
  }
  lastUpdated.value = new Date().toLocaleTimeString()
  syncHourlyRowToGas(line, rowIndex)
}

function onHourlyQcPassChange(line, rowIndex) {
  const row = line.hourlyRows[rowIndex]
  if (!row) return
  const cleanActual = Math.max(0, Math.round(Number(row.actual) || 0))
  const cleanQc = Math.min(cleanActual, Math.max(0, Math.round(Number(row.qcPass) || 0)))
  row.qcPass = cleanQc
  lastUpdated.value = new Date().toLocaleTimeString()
  syncHourlyRowToGas(line, rowIndex)
}

function onHourlyDowntimeChange(line, rowIndex) {
  const row = line.hourlyRows[rowIndex]
  if (!row) return
  const cleanMins = Math.max(0, Number(row.downtimeMin) || 0)
  row.downtimeMin = cleanMins

  if (cleanMins === 0) {
    row.nptProblems = []
  } else if (Array.isArray(row.nptProblems) && row.nptProblems.length > 0) {
    const currentSum = row.nptProblems.reduce((s, p) => s + (Number(p.minutes) || 0), 0)
    if (currentSum !== cleanMins) {
      const diff = cleanMins - currentSum
      const lastIdx = row.nptProblems.length - 1
      const updatedLast = Math.max(
        0,
        (Number(row.nptProblems[lastIdx].minutes) || 0) + diff
      )
      if (updatedLast === 0) {
        row.nptProblems = [
          { problem: row.nptProblems[0].problem || 'MACHINE PROBLEM', minutes: cleanMins }
        ]
      } else {
        row.nptProblems[lastIdx].minutes = updatedLast
      }
    }
  } else {
    const probName =
      NPT_PROBLEM_TYPES[(rowIndex + 1) % NPT_PROBLEM_TYPES.length]
    row.nptProblems = [{ problem: probName, minutes: cleanMins }]
  }

  lastUpdated.value = new Date().toLocaleTimeString()
  syncHourlyRowToGas(line, rowIndex)
}

function clampHourlyInput(line, rowIndex, field) {
  const row = line?.hourlyRows?.[rowIndex]
  if (!row) return
  if (field === 'actual') {
    row.actual = Math.max(0, Math.round(Number(row.actual) || 0))
    if ((Number(row.qcPass) || 0) > row.actual) {
      row.qcPass = row.actual
    }
  } else if (field === 'qcPass') {
    const maxQc = Math.max(0, Math.round(Number(row.actual) || 0))
    row.qcPass = Math.min(maxQc, Math.max(0, Math.round(Number(row.qcPass) || 0)))
  } else if (field === 'downtimeMin') {
    row.downtimeMin = Math.max(0, Number(row.downtimeMin) || 0)
  }
}

function computeLineMetrics(line, index = 0) {
  const isActive = line.isActive !== false
  const hourlyRows = Array.isArray(line.hourlyRows) ? line.hourlyRows : []
  const smv = Number(line.smv) || 14.0
  const hourlyRowsTargetSum = hourlyRows.reduce((sum, r) => sum + (Number(r.target) || 0), 0)
  const dailyTarget =
    hourlyRowsTargetSum > 0 ? hourlyRowsTargetSum : Number(line.dailyTarget) || 0

  const {
    activeDateKey,
    lineSection,
    lineShift,
    matchedRule,
    effectiveStartLabel,
    cleanRuleStart,
    ruleSlots
  } = getLineShiftContext(line, submissionDate.value)

  const activeIdx =
    hourlyRows.length === 0
      ? 0
      : matchedRule
        ? Math.min(
            hourlyRows.length - 1,
            findSlotIndexForScanTime(new Date(), cleanRuleStart, ruleSlots)
          )
        : Math.min(
            Math.max(0, Number(line.activeHourIndex) || 0),
            hourlyRows.length - 1
          )

  const totalActual = hourlyRows.reduce((sum, r) => sum + (Number(r.actual) || 0), 0)
  const totalQcPass = hourlyRows.reduce((sum, r) => {
    const fallback = calcHourQcPass(r.actual, r.dhu)
    const val = typeof r.qcPass === 'number' && !Number.isNaN(r.qcPass) ? r.qcPass : fallback
    return sum + Math.min(Number(r.actual) || 0, Math.max(0, Math.round(val)))
  }, 0)
  const lastToQcVariance = Math.max(0, totalActual - totalQcPass)
  const qcPassRate = totalActual > 0 ? ((totalQcPass / totalActual) * 100).toFixed(1) : '0.0'
  const qcLossRateStr =
    totalActual > 0 ? ((lastToQcVariance / totalActual) * 100).toFixed(1) : '0.0'

  const totalNptMin = isActive
    ? hourlyRows.reduce((sum, r) => sum + Math.max(0, Number(r.downtimeMin) || 0), 0)
    : 0
  const nptProblemsSummary = isActive ? aggregateProblemsFromRows(hourlyRows) : []
  const nptLossPcs = calcNptLossPcs(totalNptMin, smv)

  const elapsedTarget = isActive
    ? hourlyRows.slice(0, activeIdx + 1).reduce((sum, r) => sum + (Number(r.target) || 0), 0)
    : 0
  const netVariance = totalActual - elapsedTarget
  const effectiveDailyTarget = isActive ? dailyTarget : 0

  const activeOperators = isActive ? Number(line.operators) || 0 : 0
  const activeHelpers = isActive ? Number(line.helpers) || 0 : 0
  const totalManpower = Math.max(1, activeOperators + activeHelpers)
  const effectiveFirstMachine = Math.max(Number(line.firstMachineTotal) || 0, totalActual)
  const machineGap = Math.max(0, effectiveFirstMachine - totalActual)
  const gapMinutes = Math.round(machineGap * smv)
  const isGapAlert = isActive && machineGap > (Number(line.maxLineGap) || 60)

  const completionPct = effectiveDailyTarget
    ? Math.min(100, Math.round((totalActual / effectiveDailyTarget) * 100))
    : 0

  const slotsForCalc = ruleSlots.length ? ruleSlots : BASE_HOURS.value
  const elapsedSlotMins = getElapsedSlotMinutes(slotsForCalc, activeIdx)
  const totalAvailableMins = elapsedSlotMins * totalManpower
  const totalEarnedMins = totalActual * smv
  const nptPctStr =
    isActive && totalAvailableMins
      ? (((totalNptMin * totalManpower) / totalAvailableMins) * 100).toFixed(1)
      : '0.0'
  const efficiency =
    isActive && totalAvailableMins
      ? ((totalEarnedMins / totalAvailableMins) * 100).toFixed(1)
      : '0.0'

  const reported = hourlyRows.filter((r) => (Number(r.actual) || 0) > 0)
  const avgDhu = reported.length
    ? (reported.reduce((sum, r) => sum + (Number(r.dhu) || 0), 0) / reported.length).toFixed(1)
    : '0.0'

  return {
    ...line,
    smv,
    dailyTarget,
    hourlyRows,
    activeHourIndex: activeIdx,
    effectiveStartTime: effectiveStartLabel,
    effectiveDate: activeDateKey,
    matchedSection: matchedRule?.section || lineSection,
    matchedShift: matchedRule?.Shift || lineShift,
    isActive,
    activeOperators,
    activeHelpers,
    effectiveDailyTarget,
    targetEfficiency: Number(line.targetEfficiency) || 75,
    unit: line.unit || getUnitForLineIndex(index),
    itemName: line.itemName || inferItemName(line.styleNo),
    totalManpower,
    effectiveFirstMachine,
    lastMachineTotal: totalActual,
    totalQcPass,
    lastToQcVariance,
    qcPassRate: Number(qcPassRate),
    qcPassRateStr: qcPassRate,
    qcLossRateStr,
    totalNptMin,
    nptProblemsSummary,
    nptLossPcs,
    nptPctStr,
    isNptAlert: isActive && totalNptMin >= NPT_ALERT_THRESHOLD_MIN,
    machineGap,
    gapMinutes,
    isGapAlert,
    completionPct,
    totalActual,
    elapsedTarget,
    netVariance,
    efficiency: Number(efficiency),
    efficiencyStr: efficiency,
    avgDhu: Number(avgDhu),
    avgDhuStr: avgDhu
  }
}

const allLineMetrics = computed(() => {
  return linesData.value.map((line, idx) => computeLineMetrics(line, idx))
})

const scopedLineMetrics = computed(() => {
  if (selectedUnit.value === 'ALL') return allLineMetrics.value
  return allLineMetrics.value.filter((l) => l.unit === selectedUnit.value)
})

const activeScopedMetrics = computed(() => {
  return scopedLineMetrics.value.filter((l) => l.isActive)
})

const filteredLineSummaryRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return scopedLineMetrics.value.filter((line) => {
    const matchesActive = !onlyActiveLines.value || line.isActive
    const matchesAlert = !onlyGapAlerts.value || line.isGapAlert
    const matchesSearch =
      !q ||
      line.unit.toLowerCase().includes(q) ||
      line.lineName.toLowerCase().includes(q) ||
      (line.section || '').toLowerCase().includes(q) ||
      (line.isActive ? 'active' : 'deactive').includes(q) ||
      (line.poNo || '').toLowerCase().includes(q) ||
      line.styleNo.toLowerCase().includes(q) ||
      (line.itemName || '').toLowerCase().includes(q) ||
      line.modelNo.toLowerCase().includes(q) ||
      line.buyer.toLowerCase().includes(q)
    return matchesActive && matchesAlert && matchesSearch
  })
})

function buildUnitSubtotalRow(unitName, unitLines) {
  const activeUnitLines = unitLines.filter((l) => l.isActive)
  const lineCount = activeUnitLines.length
  const totalOperatorsSum = activeUnitLines.reduce((s, l) => s + l.activeOperators, 0)
  const totalHelpersSum = activeUnitLines.reduce((s, l) => s + l.activeHelpers, 0)
  const totalManpowerSum = activeUnitLines.reduce((s, l) => s + l.totalManpower, 0)
  const firstMachineSum = unitLines.reduce((s, l) => s + l.effectiveFirstMachine, 0)
  const actualSum = unitLines.reduce((s, l) => s + l.lastMachineTotal, 0)
  const qcPassSum = unitLines.reduce((s, l) => s + l.totalQcPass, 0)
  const lastToQcVarianceSum = Math.max(0, actualSum - qcPassSum)
  const qcPassRateStr = actualSum > 0 ? ((qcPassSum / actualSum) * 100).toFixed(1) : '0.0'
  const qcLossRateStr =
    actualSum > 0 ? ((lastToQcVarianceSum / actualSum) * 100).toFixed(1) : '0.0'
  const nptMinSum = activeUnitLines.reduce((s, l) => s + l.totalNptMin, 0)
  const nptLossPcsSum = Number(
    activeUnitLines.reduce((s, l) => s + (Number(l.nptLossPcs) || 0), 0).toFixed(1)
  )
  const nptProblemsSummary = mergeProblemSummaries(
    activeUnitLines.map((l) => l.nptProblemsSummary)
  )
  const dailyTargetSum = activeUnitLines.reduce((s, l) => s + l.effectiveDailyTarget, 0)
  const gapSum = unitLines.reduce((s, l) => s + l.machineGap, 0)
  const gapMinutesSum = unitLines.reduce((s, l) => s + l.gapMinutes, 0)
  const avgSmv = lineCount
    ? (activeUnitLines.reduce((s, l) => s + Number(l.smv || 0), 0) / lineCount).toFixed(1)
    : '0.0'

  let earnedMins = 0
  let availableMins = 0
  activeUnitLines.forEach((l) => {
    const ctx = getLineShiftContext(l, submissionDate.value)
    const elapsedMins = getElapsedSlotMinutes(
      ctx.ruleSlots.length ? ctx.ruleSlots : BASE_HOURS.value,
      l.activeHourIndex
    )
    earnedMins += l.totalActual * l.smv
    availableMins += elapsedMins * l.totalManpower
  })
  const effNum = availableMins ? Number(((earnedMins / availableMins) * 100).toFixed(1)) : 0
  const completionPct = dailyTargetSum
    ? Math.min(100, Math.round((actualSum / dailyTargetSum) * 100))
    : 0
  const targetEffAvg = lineCount
    ? Number(
        (
          activeUnitLines.reduce((s, l) => s + (Number(l.targetEfficiency) || 75), 0) /
          lineCount
        ).toFixed(1)
      )
    : 75

  return {
    rowType: 'subtotal',
    id: `subtotal-${unitName}`,
    unit: unitName,
    lineCount,
    avgSmv,
    operators: totalOperatorsSum,
    helpers: totalHelpersSum,
    totalManpower: totalManpowerSum,
    effectiveFirstMachine: firstMachineSum,
    lastMachineTotal: actualSum,
    totalQcPass: qcPassSum,
    lastToQcVariance: lastToQcVarianceSum,
    qcPassRateStr,
    qcLossRateStr,
    totalNptMin: nptMinSum,
    nptLossPcs: nptLossPcsSum,
    nptProblemsSummary,
    isNptAlert: activeUnitLines.some((l) => l.isNptAlert),
    dailyTarget: dailyTargetSum,
    completionPct,
    machineGap: gapSum,
    gapMinutes: gapMinutesSum,
    isGapAlert: activeUnitLines.some((l) => l.isGapAlert),
    efficiency: effNum,
    efficiencyStr: effNum.toFixed(1),
    targetEfficiency: targetEffAvg,
    targetEfficiencyStr: targetEffAvg.toFixed(1)
  }
}

const groupedTableDisplayRows = computed(() => {
  const rows = filteredLineSummaryRows.value
  if (!rows.length) return []

  const groups = []
  let currentGroup = null

  rows.forEach((line) => {
    if (!currentGroup || currentGroup.unit !== line.unit) {
      currentGroup = {
        unit: line.unit,
        lines: [line]
      }
      groups.push(currentGroup)
    } else {
      currentGroup.lines.push(line)
    }
  })

  const displayItems = []
  groups.forEach((grp) => {
    const unitSpan = grp.lines.length + 1
    grp.lines.forEach((line, idx) => {
      displayItems.push({
        rowType: 'line',
        key: line.id,
        line,
        showMergedUnitCell: idx === 0,
        unitRowspan: unitSpan
      })
    })
    displayItems.push({
      rowType: 'subtotal',
      key: `subtotal-${grp.unit}`,
      subtotal: buildUnitSubtotalRow(grp.unit, grp.lines)
    })
  })

  return displayItems
})

const activeLinesCount = computed(() => activeScopedMetrics.value.length)
const alertLinesCount = computed(() => activeScopedMetrics.value.filter((l) => l.isGapAlert).length)

const currentLineMetrics = computed(() => {
  if (!currentLine.value) return null
  const idx = linesData.value.findIndex((l) => l.id === currentLine.value.id)
  return computeLineMetrics(currentLine.value, idx >= 0 ? idx : 0)
})

const totalOperators = computed(() => {
  if (!currentLineMetrics.value) return 0
  if (!isAllLines.value) return currentLineMetrics.value.activeOperators
  return activeScopedMetrics.value.reduce((s, l) => s + l.activeOperators, 0)
})

const totalHelpers = computed(() => {
  if (!currentLineMetrics.value) return 0
  if (!isAllLines.value) return currentLineMetrics.value.activeHelpers
  return activeScopedMetrics.value.reduce((s, l) => s + l.activeHelpers, 0)
})

const computedRows = computed(() => {
  const line = currentLine.value
  if (!line || !currentLineMetrics.value) return []
  const manpower = currentLineMetrics.value.totalManpower
  const slots = BASE_HOURS.value
  let cumulativeTarget = 0
  let cumulativeActual = 0
  let cumulativeQcPass = 0

  return (line.hourlyRows || []).map((row, idx) => {
    const cleanActual = Math.max(0, Math.round(Number(row.actual) || 0))
    const cleanQcPass = Math.min(
      cleanActual,
      Math.max(0, Math.round(Number(row.qcPass) ?? calcHourQcPass(cleanActual, row.dhu)))
    )
    const cleanDowntime = Math.max(0, Number(row.downtimeMin) || 0)
    const hourLastToQcVariance = Math.max(0, cleanActual - cleanQcPass)

    cumulativeTarget += row.target
    cumulativeActual += cleanActual
    cumulativeQcPass += cleanQcPass

    const hourShareRatio =
      currentLineMetrics.value.totalActual > 0
        ? cleanActual / currentLineMetrics.value.totalActual
        : 0
    const estFirstMachineHour = Math.round(
      currentLineMetrics.value.effectiveFirstMachine * hourShareRatio
    )
    const hourGap = Math.max(0, estFirstMachineHour - cleanActual)

    const variance = cleanActual - row.target
    const slotMins = getSlotMinutes(slots[idx], idx === 0 ? FIRST_SLOT_OFFSET_MINUTES : 60)
    const availableMins = manpower * slotMins
    const earnedMins = cleanActual * line.smv
    const efficiency =
      cleanActual > 0 && availableMins > 0
        ? ((earnedMins / availableMins) * 100).toFixed(1)
        : '0.0'

    let status = 'upcoming'
    if (idx === currentLineMetrics.value.activeHourIndex) {
      status = 'active'
    } else if (cleanActual > 0 || idx < currentLineMetrics.value.activeHourIndex) {
      status = cleanActual >= row.target ? 'on-target' : 'behind'
    }

    return {
      ...row,
      actual: cleanActual,
      qcPass: cleanQcPass,
      downtimeMin: cleanDowntime,
      hourLastToQcVariance,
      index: idx,
      hourGap,
      variance,
      efficiency: Number(efficiency),
      cumulativeTarget,
      cumulativeActual,
      cumulativeQcPass,
      cumulativeVariance: cumulativeActual - cumulativeTarget,
      status
    }
  })
})

const totalNptMinutes = computed(() => {
  if (!currentLineMetrics.value) return 0
  if (!isAllLines.value) return currentLineMetrics.value.totalNptMin
  return activeScopedMetrics.value.reduce((sum, l) => sum + l.totalNptMin, 0)
})

const totalNptLossPcs = computed(() => {
  if (!currentLineMetrics.value) return 0
  if (!isAllLines.value) return currentLineMetrics.value.nptLossPcs
  const sum = activeScopedMetrics.value.reduce((acc, l) => acc + (Number(l.nptLossPcs) || 0), 0)
  return Number(sum.toFixed(1))
})

const overallNptProblemsSummary = computed(() => {
  if (!currentLineMetrics.value) return []
  if (!isAllLines.value) return currentLineMetrics.value.nptProblemsSummary
  return mergeProblemSummaries(activeScopedMetrics.value.map((l) => l.nptProblemsSummary))
})

const totalActual = computed(() => {
  if (!currentLineMetrics.value) return 0
  if (!isAllLines.value) return currentLineMetrics.value.totalActual
  return scopedLineMetrics.value.reduce((sum, l) => sum + l.totalActual, 0)
})

const totalQcPass = computed(() => {
  if (!currentLineMetrics.value) return 0
  if (!isAllLines.value) return currentLineMetrics.value.totalQcPass
  return scopedLineMetrics.value.reduce((sum, l) => sum + l.totalQcPass, 0)
})

const totalLastToQcVariance = computed(() => Math.max(0, totalActual.value - totalQcPass.value))

const overallQcPassRate = computed(() =>
  totalActual.value > 0 ? ((totalQcPass.value / totalActual.value) * 100).toFixed(1) : '0.0'
)

const overallQcVarianceRate = computed(() =>
  totalActual.value > 0
    ? ((totalLastToQcVariance.value / totalActual.value) * 100).toFixed(1)
    : '0.0'
)

const totalFirstMachine = computed(() => {
  if (!currentLineMetrics.value) return 0
  if (!isAllLines.value) return currentLineMetrics.value.effectiveFirstMachine
  return scopedLineMetrics.value.reduce((sum, l) => sum + l.effectiveFirstMachine, 0)
})

const totalMachineGap = computed(() => {
  if (!currentLineMetrics.value) return 0
  if (!isAllLines.value) return currentLineMetrics.value.machineGap
  return scopedLineMetrics.value.reduce((sum, l) => sum + l.machineGap, 0)
})

const totalGapMinutes = computed(() => {
  if (!currentLineMetrics.value) return 0
  if (!isAllLines.value) return currentLineMetrics.value.gapMinutes
  return scopedLineMetrics.value.reduce((sum, l) => sum + l.gapMinutes, 0)
})

const totalDailyTarget = computed(() => {
  if (!currentLineMetrics.value) return 0
  if (!isAllLines.value) return currentLineMetrics.value.effectiveDailyTarget
  return activeScopedMetrics.value.reduce((sum, l) => sum + l.effectiveDailyTarget, 0)
})

const elapsedTarget = computed(() => {
  if (!currentLineMetrics.value) return 0
  if (!isAllLines.value) return currentLineMetrics.value.elapsedTarget
  return activeScopedMetrics.value.reduce((sum, l) => sum + l.elapsedTarget, 0)
})

const netVariance = computed(() => totalActual.value - elapsedTarget.value)

const overallEfficiency = computed(() => {
  if (!currentLineMetrics.value) return '0.0'
  if (!isAllLines.value) return currentLineMetrics.value.efficiencyStr
  let earned = 0
  let available = 0
  activeScopedMetrics.value.forEach((l) => {
    const ctx = getLineShiftContext(l, submissionDate.value)
    const elapsedMins = getElapsedSlotMinutes(
      ctx.ruleSlots.length ? ctx.ruleSlots : BASE_HOURS.value,
      l.activeHourIndex
    )
    earned += l.totalActual * l.smv
    available += elapsedMins * l.totalManpower
  })
  return available ? ((earned / available) * 100).toFixed(1) : '0.0'
})

const targetEfficiency = computed(() => {
  if (!currentLineMetrics.value) return 75
  if (!isAllLines.value) return Number(currentLine.value?.targetEfficiency) || 75
  if (!activeScopedMetrics.value.length) return 75
  const avg =
    activeScopedMetrics.value.reduce((sum, l) => sum + (Number(l.targetEfficiency) || 75), 0) /
    activeScopedMetrics.value.length
  return Math.round(avg)
})

const avgDhu = computed(() => {
  if (!currentLineMetrics.value) return '0.0'
  if (!isAllLines.value) return currentLineMetrics.value.avgDhuStr
  const activeLines = activeScopedMetrics.value.filter((l) => l.totalActual > 0)
  if (!activeLines.length) return '0.0'
  return (activeLines.reduce((sum, l) => sum + l.avgDhu, 0) / activeLines.length).toFixed(1)
})

function getActiveScopeTargets() {
  if (!isAllLines.value && currentLine.value) {
    return currentLine.value.isActive !== false ? [currentLine.value] : []
  }
  if (selectedUnit.value === 'ALL') {
    return linesData.value.filter((l) => l.isActive !== false)
  }
  return linesData.value.filter(
    (l, idx) =>
      (l.unit || getUnitForLineIndex(idx)) === selectedUnit.value && l.isActive !== false
  )
}

function addFirstMachinePieces(lineId, qty) {
  const line = linesData.value.find((l) => l.id === lineId)
  if (!line) {
    notify('No active line found')
    return
  }
  const lineActual = line.hourlyRows.reduce((s, r) => s + r.actual, 0)
  line.firstMachineTotal = Math.max(lineActual, line.firstMachineTotal + qty)
  lastUpdated.value = new Date().toLocaleTimeString()
  notify(`${line.lineName}: +${qty} 1st M/C`)
  sendToGasBackend('saveLineSetup', JSON.parse(JSON.stringify(line)), { silent: true })
}

function addPieces(lineId, hourIndex, qty) {
  const line = linesData.value.find((l) => l.id === lineId)
  if (!line) {
    notify('No active line found')
    return
  }
  const row = line.hourlyRows[hourIndex]
  if (!row) return
  const nextVal = Math.max(0, row.actual + qty)
  const delta = nextVal - row.actual
  row.actual = nextVal

  const qcDelta =
    delta > 0
      ? calcHourQcPass(delta, row.dhu)
      : -Math.min(row.qcPass || 0, Math.abs(delta))
  row.qcPass = Math.min(row.actual, Math.max(0, (Number(row.qcPass) || 0) + qcDelta))

  if (delta > 0) {
    line.firstMachineTotal = Math.max(
      line.firstMachineTotal + Math.max(0, Math.floor(delta * 0.5)),
      line.hourlyRows.reduce((s, r) => s + r.actual, 0)
    )
  }
  lastUpdated.value = new Date().toLocaleTimeString()
  notify(`${line.lineName}: ${qty >= 0 ? `+${qty}` : qty} Last M/C`)
  syncHourlyRowToGas(line, hourIndex)
}

function advanceHour() {
  const targets = getActiveScopeTargets()
  let moved = false
  targets.forEach((line) => {
    if (line.activeHourIndex < line.hourlyRows.length - 1) {
      line.activeHourIndex += 1
      moved = true
    }
  })
  if (moved) {
    lastUpdated.value = new Date().toLocaleTimeString()
    notify('Next hour active')
    sendToGasBackend(
      'syncBoardSnapshot',
      { lines: JSON.parse(JSON.stringify(targets)) },
      { silent: true }
    )
  }
}

function resetShift() {
  isLiveSimulating.value = false
  if (simTimer) {
    clearInterval(simTimer)
    simTimer = null
  }
  const targets = getActiveScopeTargets()
  targets.forEach((line) => {
    line.activeHourIndex = 0
    line.firstMachineTotal = 0
    line.hourlyRows.forEach((r) => {
      r.actual = 0
      r.qcPass = 0
      r.dhu = 0
      r.downtimeMin = 0
      r.nptProblems = []
    })
  })
  lastUpdated.value = new Date().toLocaleTimeString()
  notify('Shift reset')
  sendToGasBackend(
    'syncBoardSnapshot',
    { lines: JSON.parse(JSON.stringify(targets)) },
    { silent: true }
  )
}

function toggleSimulation() {
  isLiveSimulating.value = !isLiveSimulating.value
  if (isLiveSimulating.value) {
    if (simTimer) clearInterval(simTimer)
    notify('Live feed active')
    simTimer = setInterval(() => {
      const targets = getActiveScopeTargets()
      targets.forEach((line, lIdx) => {
        const row = line.hourlyRows[line.activeHourIndex]
        if (!row) return
        const feedBundle = Math.floor(Math.random() * 6) + 4
        const finishBundle = Math.floor(Math.random() * 5) + 2
        const passBundle = calcHourQcPass(finishBundle, row.dhu)
        if (Math.random() < 0.25) {
          const addedMin = 1
          row.downtimeMin = (Number(row.downtimeMin) || 0) + addedMin
          const probName =
            NPT_PROBLEM_TYPES[(lIdx + line.activeHourIndex) % NPT_PROBLEM_TYPES.length]
          const existing = (row.nptProblems || []).find((p) => p.problem === probName)
          if (existing) {
            existing.minutes += addedMin
          } else {
            row.nptProblems = [
              ...(row.nptProblems || []),
              { problem: probName, minutes: addedMin }
            ]
          }
        }
        line.firstMachineTotal += feedBundle
        row.actual += finishBundle
        row.qcPass = Math.min(row.actual, (Number(row.qcPass) || 0) + passBundle)
        if (line.firstMachineTotal < line.hourlyRows.reduce((s, r) => s + r.actual, 0)) {
          line.firstMachineTotal = line.hourlyRows.reduce((s, r) => s + r.actual, 0)
        }
      })
      lastUpdated.value = new Date().toLocaleTimeString()
    }, 1800)
  } else {
    if (simTimer) {
      clearInterval(simTimer)
      simTimer = null
    }
    notify('Live feed paused')
    sendToGasBackend(
      'syncBoardSnapshot',
      { lines: JSON.parse(JSON.stringify(linesData.value)) },
      { silent: true }
    )
  }
}

function handleGlobalKeydown(e) {
  if (e.key === 'Escape') {
    if (isShiftModalOpen.value) closeShiftControlModal()
    if (isQrModalOpen.value) closeQrEntryPopup()
    if (isPopupOpen.value) closeLinePopup()
  }
}

onMounted(async () => {
  loadSavedShiftConfig()
  updateViewportSize()
  const nowStr = new Date().toLocaleTimeString()
  lastUpdated.value = nowStr
  liveClock.value = nowStr
  clockTimer = setInterval(() => {
    liveClock.value = new Date().toLocaleTimeString()
  }, 1000)
  window.addEventListener('resize', updateViewportSize, { passive: true })
  window.addEventListener('orientationchange', updateViewportSize, { passive: true })
  window.addEventListener('keydown', handleGlobalKeydown)
  await hydrateFromGasBackend()
})

onUnmounted(() => {
  qrSessionCounter += 1
  if (isLiveSimulating.value && linesData.value.length > 0) {
    sendToGasBackend(
      'syncBoardSnapshot',
      { lines: JSON.parse(JSON.stringify(linesData.value)) },
      { silent: true }
    )
  }
  stopQrCamera()
  if (simTimer) clearInterval(simTimer)
  if (toastTimer) clearTimeout(toastTimer)
  if (clockTimer) clearInterval(clockTimer)
  window.removeEventListener('resize', updateViewportSize)
  window.removeEventListener('orientationchange', updateViewportSize)
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <div class="board-shell" :class="`mode-${displayMode}`" :data-display-mode="displayMode"
    :data-orientation="isPortrait ? 'portrait' : 'landscape'">
    <transition name="fade">
      <div v-if="toastMessage" class="toast-banner">{{ toastMessage }}</div>
    </transition>

    <!-- Top Selector & Action Bar -->
    <div class="top-selector-bar">
      <div class="top-selector-group">
        <span class="live-badge" :class="{ streaming: isLiveSimulating }">
          <span class="pulse-dot"></span>
          {{ isLiveSimulating ? 'LIVE STREAMING' : 'BOARD READY' }}
        </span>
        <select :value="selectedUnit" aria-label="Select Unit" class="unit-select"
          @change="selectUnit($event.target.value)">
          <option value="ALL">All Units ({{ linesData.length }})</option>
          <option v-for="u in unitOptions" :key="u" :value="u">
            {{ u }}
          </option>
        </select>

        <select :value="selectedLineId" aria-label="Jump directly to a specific line" class="line-select"
          @change="onLineSelectChange($event.target.value)">
          <option value="ALL">
            {{
              selectedUnit === 'ALL'
                ? `All ${linesData.length} Lines (Floor View)`
                : `All Lines in ${selectedUnit} (${scopedLineMetrics.length} Lines)`
            }}
          </option>
          <option v-for="line in scopedLineMetrics" :key="line.id" :value="line.id">
            {{ line.lineName }}
          </option>
        </select>

        <input v-if="isAllLines" v-model="searchQuery" type="search" aria-label="Search PO, Style, Item, Line or Buyer"
          placeholder="Search PO, Style, Item, Line..." class="search-input" />

        <button v-if="!isAllLines && currentLine" type="button" class="pill-btn" @click="openLinePopup(currentLine.id)">
          Edit {{ currentLine.unit }} Lines
        </button>
      </div>

      <div class="header-actions">
        <button type="button" class="btn btn-shift" @click="openShiftControlModal">
          Shift Control
        </button>
        <button type="button" class="btn btn-popup" @click="openLinePopup()">
          + Unit &amp; Lines Popup
        </button>
        <button type="button" class="btn btn-qr" @click="openQrEntryPopup">
          QR Entry Forms
        </button>
        <button type="button" class="btn btn-primary" @click="toggleSimulation">
          {{ isLiveSimulating ? 'Pause Feed' : 'Simulate Live Feed' }}
        </button>
        <button type="button" class="btn btn-soft" @click="advanceHour">Next Hour</button>
        <button type="button" class="btn btn-outline" @click="resetShift">Reset</button>
        <button type="button" class="btn btn-soft" :disabled="isSyncingGas" @click="manualSyncBoardToGas">
          {{ isSyncingGas ? 'Syncing...' : 'Sync to GAS' }}
        </button>
        <div class="filter-controls">
          <button v-if="isAllLines" type="button" class="filter-toggle" :class="{ active: onlyActiveLines }"
            @click="onlyActiveLines = !onlyActiveLines">
            Active Only
          </button>
          <button type="button" class="filter-toggle" :class="{ active: onlyGapAlerts }"
            @click="onlyGapAlerts = !onlyGapAlerts">
            Gap Alerts ({{ alertLinesCount }})
          </button>
        </div>
      </div>
    </div>

    <!-- Board Title & Status Header -->
    <header class="board-header">
      <div class="header-left">
        <div class="status-strip">
          <span class="chip chip-shift">
            Date {{ submissionDate }} · {{ shiftConfig.Shift }} · Start {{ shiftConfig.Shift_Start_time }}
          </span>
          <span class="chip">Line Target: {{ totalDailyTarget.toLocaleString() }} pcs</span>
          <span class="chip">Target Eff: {{ targetEfficiency }}%</span>
          <span class="chip chip-qc">
            QC Pass: {{ totalQcPass.toLocaleString() }} pcs ({{ overallQcPassRate }}%)
          </span>
          <span class="chip chip-qc-var">
            Last → QC Var: {{ totalLastToQcVariance.toLocaleString() }} pcs ({{ overallQcVarianceRate }}%)
          </span>
          <span class="chip chip-npt">
            Line NPT: {{ totalNptMinutes.toLocaleString() }} min ({{ formatPcsValue(totalNptLossPcs) }} pcs)
          </span>
          <span class="chip">Manpower: {{ totalOperators }} Ops · {{ totalHelpers }} Hlp</span>
          <span class="chip chip-accent">1st → Last Gap: {{ totalMachineGap.toLocaleString() }} pcs</span>
        </div>

        <h1 class="board-title">
          {{
            isAllLines
              ? selectedUnit === 'ALL'
                ? `Line-Wise Production Live Board (${linesData.length} Lines · ${LINES_PER_UNIT} Lines/Unit)`
                : `${selectedUnit} — Line-Wise Production Live Board (${scopedLineMetrics.length} Lines)`
              : `${currentLine?.lineName || ''} (${currentLine?.unit || ''}) — Hourly Production & Setup Board`
          }}
        </h1>

        <p class="board-subtitle">
          <template v-if="isAllLines">
            <template v-if="linesData.length === 0">
              Google Sheet (<strong>{{ UNIT_LINE_SHEET }}</strong>) is blank — click
              <strong>+ Unit &amp; Lines Popup</strong> to enter lines · Updated {{ lastUpdated }}
            </template>
            <template v-else>
              Date <strong>{{ submissionDate }}</strong> · <strong>{{ shiftConfig.Shift }}</strong> ({{
                shiftConfig.Shift_Start_time
              }}
              – {{ shiftConfig.endTime }}, +{{ shiftConfig.durationHours }}h) · Active
              <strong>{{ activeLinesCount }}/{{ scopedLineMetrics.length }}</strong> lines · Target Eff
              <strong>{{ targetEfficiency }}%</strong> · Target
              <strong>{{ totalDailyTarget.toLocaleString() }} pcs</strong> · NPT
              <strong>{{ totalNptMinutes.toLocaleString() }} min</strong> · QC Pass
              <strong>{{ totalQcPass.toLocaleString() }} pcs</strong> · Updated {{ lastUpdated }}
            </template>
          </template>
          <template v-else-if="currentLine && currentLineMetrics">
            <strong>{{ currentLine.unit }}</strong> · Date <strong>{{ submissionDate }}</strong> ·
            {{ currentLineMetrics.matchedShift }} (Start:
            <strong>{{ currentLineMetrics.effectiveStartTime }}</strong>) · Item
            <strong>{{ currentLine.itemName }}</strong> · PO
            <strong>{{ currentLine.poNo }}</strong> · Style <strong>{{ currentLine.styleNo }}</strong> · SMV
            <strong>{{ currentLine.smv }}m</strong> · Target Eff
            <strong>{{ currentLineMetrics.targetEfficiency }}%</strong> · Updated {{ lastUpdated }}
          </template>
        </p>
      </div>

      <div class="header-clock-panel">
        <span class="header-clock-eyebrow">LIVE CLOCK</span>
        <strong class="header-clock-display">{{ liveClock }}</strong>
      </div>
    </header>

    <!-- Shift Control Settings Modal -->
    <Teleport to="body">
      <div v-if="isShiftModalOpen" class="modal-backdrop" role="dialog" aria-modal="true"
        aria-labelledby="shift-control-modal-title" @click.self="closeShiftControlModal">
        <div class="modal-card shift-modal-card">
          <div class="modal-head">
            <div>
              <span id="shift-control-modal-title" class="modal-badge shift-modal-badge">
                SHIFT CONTROL
              </span>
            </div>
            <button type="button" class="modal-close-btn" aria-label="Close shift control popup"
              @click="closeShiftControlModal">
              ✕
            </button>
          </div>

          <form class="modal-form" @submit.prevent="saveShiftControl">
            <div class="shift-date-bar">
              <label class="shift-date-label">
                <span>DATE:</span>
                <input v-model="submissionDate" type="date" class="shift-date-input" required />
              </label>
            </div>

            <div class="shift-slots-table-wrap">
              <table class="shift-slots-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>SECTION</th>
                    <th>SHIFT</th>
                    <th>SHIFT_START_TIME</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(slot, sIdx) in shiftDraft.slots" :key="slot._uid || slot.id || sIdx">
                    <td class="xl-row-num">{{ sIdx + 1 }}</td>
                    <td class="xl-cell">
                      <select :value="slot.section" :aria-label="`Select section for row ${sIdx + 1}`"
                        class="xl-select" @change="onShiftSectionChange(sIdx, $event.target.value)">
                        <option value="">-- Select section --</option>
                        <option v-for="sec in SHIFT_SECTION_OPTIONS" :key="sec" :value="sec">
                          {{ sec }}
                        </option>
                      </select>
                    </td>
                    <td class="xl-cell">
                      <select :value="slot.Shift || shiftDraft.Shift" :aria-label="`Shift for row ${sIdx + 1}`"
                        class="xl-select" @change="onShiftDropdownChange(sIdx, $event.target.value)">
                        <option v-for="preset in SHIFT_PRESETS" :key="preset.key" :value="preset.label">
                          {{ preset.label }}
                        </option>
                      </select>
                    </td>
                    <td class="xl-cell">
                      <input :value="slot.Shift_Start_time" type="text" placeholder="e.g. 6 AM or 1PM"
                        :aria-label="`Shift start time for row ${sIdx + 1}`" class="xl-input"
                        @input="onSlotStartTimeTyping(slot, sIdx, $event.target.value)"
                        @change="onSlotStartTimeChange(slot, sIdx, $event.target.value)" />
                    </td>
                    <td class="xl-cell shift-preview-cell">
                      <button type="button" class="btn-icon-remove" aria-label="Remove shift row"
                        @click="removeShiftSlot(sIdx)">
                        ✕
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline" @click="closeShiftControlModal">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSavingShift">
                {{ isSavingShift ? 'Saving...' : 'Save Shift Config' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Single-Unit Header + Excel Grid Table Popup Modal -->
    <Teleport to="body">
      <div v-if="isPopupOpen" class="modal-backdrop" role="dialog" aria-modal="true"
        aria-labelledby="line-setup-popup-title" @click.self="closeLinePopup">
        <div class="modal-card unit-popup-card">
          <div class="modal-head">
            <div>
              <span class="modal-badge">UNIT → LINE ENTRY</span>
              <span id="line-setup-popup-title" class="xl-sheet-tab">
                {{ popupDraft.unit }} · Line Setup Sheet
              </span>
            </div>
            <button type="button" class="modal-close-btn" aria-label="Close popup" @click="closeLinePopup">
              ✕
            </button>
          </div>

          <form class="modal-form" @submit.prevent="saveLinePopup">
            <div class="popup-unit-head-bar">
              <label class="field-group popup-unit-select-wrap">
                <span class="popup-unit-label">Unit:-</span>
                <select :value="popupDraft.unit" class="form-select popup-unit-select"
                  @change="onPopupUnitChange($event.target.value)">
                  <option v-for="u in unitOptions" :key="u" :value="u">
                    {{ u }}
                  </option>
                </select>
              </label>
              <label class="field-group popup-unit-select-wrap">
                <span class="popup-unit-label">Date:-</span>
                <input v-model="popupDraft.date" type="date" class="form-input popup-unit-date" />
              </label>

              <div class="popup-unit-meta">
                <span class="unit-badge unit-badge-sm">{{ popupDraft.unit }}</span>
                <span class="muted-sm">
                  {{ popupUnitLineChoices.length }} Lines in {{ popupDraft.unit }} ·
                  Entered: <strong>{{ popupTotals.totalLines }}</strong> ·
                  Target Eff <strong>{{ popupTotals.avgTargetEff }}%</strong> ·
                  <strong>{{ popupTotals.manpower }}</strong> Manpower ·
                  <strong>{{ popupTotals.dailyTarget.toLocaleString() }}</strong> pcs
                </span>
              </div>
            </div>

            <div class="xl-formula-bar">
              <span class="xl-name-box">fx</span>
              <span class="xl-formula-text">
                =SUM({{ popupDraft.unit }}) · Rows: <strong>{{ popupTotals.totalLines }}</strong> ·
                Avg Eff: <strong>{{ popupTotals.avgTargetEff }}%</strong> ·
                Manpower:
                <strong>{{ popupTotals.operators }} Op + {{ popupTotals.helpers }} Hlp =
                  {{ popupTotals.manpower }}</strong>
                · Target: <strong>{{ popupTotals.dailyTarget.toLocaleString() }} pcs</strong>
              </span>
            </div>

            <div class="excel-sheet-wrap">
              <table ref="excelGridRef" class="excel-sheet-table" role="grid">
                <thead>
                  <tr>
                    <th class="xl-corner-th">#</th>
                    <th>Line ({{ popupDraft.unit }})</th>
                    <th>PO No</th>
                    <th>Style</th>
                    <th>Item</th>
                    <th>SMV</th>
                    <th>Op</th>
                    <th>Hlp</th>
                    <th>Target Eff %</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rIdx) in popupDraft.lines" :key="row.rowUid" class="xl-data-row">
                    <td class="xl-row-num">{{ rIdx + 1 }}</td>
                    <td class="xl-cell">
                      <select :value="row.lineId" aria-label="Select Line under Unit" class="xl-select xl-w-line"
                        @change="onGridLineDropdownChange(rIdx, $event.target.value)"
                        @keydown="handleExcelGridKeydown($event, rIdx, 0)">
                        <option value="">-- Select Line --</option>
                        <option v-for="opt in popupUnitLineChoices" :key="opt.id" :value="opt.id">
                          {{ opt.lineName }}
                        </option>
                      </select>
                    </td>
                    <td class="xl-cell">
                      <input v-model="row.poNo" type="text" class="xl-input xl-w-po" placeholder="PO-44102"
                        @keydown="handleExcelGridKeydown($event, rIdx, 1)" />
                    </td>
                    <td class="xl-cell">
                      <input v-model="row.styleNo" type="text" class="xl-input xl-w-style" placeholder="STY-7710-WVN"
                        @keydown="handleExcelGridKeydown($event, rIdx, 2)" />
                    </td>
                    <td class="xl-cell">
                      <select v-model="row.itemName" aria-label="Item Name" class="xl-select xl-w-item"
                        @keydown="handleExcelGridKeydown($event, rIdx, 3)">
                        <option v-for="item in getRowItemChoices(row)" :key="item" :value="item">
                          {{ item }}
                        </option>
                      </select>
                    </td>
                    <td class="xl-cell">
                      <input v-model.number="row.smv" type="number" inputmode="decimal" min="0.1" step="0.1"
                        class="xl-input xl-num xl-w-smv"
                        @input="onPopupEfficiencyInputsChange(row)"
                        @keydown="handleExcelGridKeydown($event, rIdx, 4)" />
                    </td>
                    <td class="xl-cell">
                      <input v-model.number="row.operators" type="number" inputmode="numeric" min="0" step="1"
                        class="xl-input xl-num xl-w-op"
                        @input="onPopupEfficiencyInputsChange(row)"
                        @keydown="handleExcelGridKeydown($event, rIdx, 5)" />
                    </td>
                    <td class="xl-cell">
                      <input v-model.number="row.helpers" type="number" inputmode="numeric" min="0" step="1"
                        class="xl-input xl-num xl-w-hlp"
                        @input="onPopupEfficiencyInputsChange(row)"
                        @keydown="handleExcelGridKeydown($event, rIdx, 6)" />
                    </td>
                    <td class="xl-cell">
                      <input v-model.number="row.targetEfficiency" type="number" inputmode="decimal" min="0" max="100"
                        step="any" class="xl-input xl-num xl-w-eff"
                        @input="onPopupEfficiencyInputsChange(row)"
                        @keydown="handleExcelGridKeydown($event, rIdx, 7)" />
                    </td>
                    <td class="xl-cell">
                      <input v-model.number="row.dailyTarget" type="number" inputmode="numeric" min="0" step="1"
                        class="xl-input xl-num xl-w-target" @keydown="handleExcelGridKeydown($event, rIdx, 8)" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <label class="modal-checkbox">
              <input v-model="popupDraft.recalcHourlyTargets" type="checkbox"
                @change="popupDraft.lines.forEach((r) => onPopupEfficiencyInputsChange(r))" />
              <span>Calculate hourly slot targets from Manpower × Mins × Target Eff ÷ SMV</span>
            </label>

            <div class="modal-summary-bar">
              <span>
                Unit: <strong>{{ popupDraft.unit }}</strong> · Rows Entered:
                <strong>{{ popupTotals.totalLines }}</strong> · Avg Target Eff:
                <strong>{{ popupTotals.avgTargetEff }}%</strong> · Manpower:
                <strong>{{ popupTotals.operators }} Op / {{ popupTotals.helpers }} Hlp ({{
                  popupTotals.manpower
                }})</strong>
              </span>
              <span>
                Total Target: <strong>{{ popupTotals.dailyTarget.toLocaleString() }} pcs</strong>
              </span>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline" @click="closeLinePopup">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="isSavingLineSetting">
                {{ isSavingLineSetting ? 'Saving...' : `Save ${popupDraft.unit} Lines` }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Step-by-Step QR Entry Popup Modal -->
    <Teleport to="body">
      <div v-if="isQrModalOpen" class="modal-backdrop" role="dialog" aria-modal="true"
        aria-labelledby="qr-entry-popup-title" @click.self="closeQrEntryPopup">
        <div class="modal-card qr-modal-card">
          <div class="modal-head">
            <div>
              <span id="qr-entry-popup-title" class="modal-badge qr-modal-badge">QR ENTRY</span>
              <span class="xl-sheet-tab">
                Slot {{ qrEntryOut.hourIndex + 1 }}: {{ BASE_HOURS[qrEntryOut.hourIndex]?.section ||
                  shiftConfig.Shift_Start_time }}
              </span>
            </div>
            <button type="button" class="modal-close-btn" aria-label="Close QR popup" @click="closeQrEntryPopup">
              ✕
            </button>
          </div>

          <div class="qr-step-block">
            <div class="qr-step-header">
              <span class="qr-step-title">Select QR Code Option</span>
            </div>

            <div class="qr-option-select-row">
              <select :value="selectedQrOption" aria-label="QR Code Option" class="form-select qr-option-dropdown"
                @change="onQrOptionDropdownChange($event.target.value)">
                <option value="">-- Select QR Code Option --</option>
                <option v-for="opt in QR_OPTIONS" :key="opt.key" :value="opt.key">
                  {{ opt.label }} ({{ opt.badge }})
                </option>
              </select>
            </div>
          </div>

          <div v-if="selectedQrOption && isOutputEntered" class="qr-step-block qr-entry-out-box">
            <div class="qr-step-header">
              <span class="step-pill step-pill-out">OUTPUT ENTRY</span>
              <span class="qr-step-title">
                <template v-if="scannedAtTime">
                  · Scan Time: <strong>{{ scannedAtTime }}</strong>
                </template>
              </span>
            </div>

            <div class="qr-single-field-row">
              <label v-if="selectedQrOption === 'FIRST_MC'" class="field-group qr-single-field">
                <span>Output Entry</span>
                <input v-model.number="qrEntryOut.qty" type="number" inputmode="numeric" step="1" min="1"
                  placeholder="Enter 1st M/C pcs" class="form-input" required @input="handleOutputEntryChange" />
              </label>

              <label v-else-if="selectedQrOption === 'LAST_MC'" class="field-group qr-single-field">
                <span>Output Entry (Last M/C pcs)</span>
                <input v-model.number="qrEntryOut.qty" type="number" inputmode="numeric" step="1" min="1"
                  placeholder="Enter Last M/C pcs" class="form-input" required @input="handleOutputEntryChange" />
              </label>

              <label v-else-if="selectedQrOption === 'QC_PASS'" class="field-group qr-single-field">
                <span>Output Entry (QC Pass pcs)</span>
                <input v-model.number="qrEntryOut.qcPass" type="number" inputmode="numeric" step="1" min="1"
                  placeholder="Enter QC Pass pcs" class="form-input" required @input="handleOutputEntryChange" />
              </label>

              <button type="button" class="btn btn-primary btn-sm qr-action-btn" :disabled="!hasValidOutputEntry"
                @click="openScanAfterOutput">
                Scan QR →
              </button>
            </div>
          </div>

          <div v-if="selectedQrOption && isScanStepVisible" class="qr-step-block">
            <div class="qr-step-header">
              <span class="step-pill">STEP 3 · SCAN QR</span>
              <span class="qr-step-title">
                Scan QR for <strong>{{ activeOptionMeta?.label }}</strong>
              </span>
            </div>

            <div class="qr-scan-row">
              <input ref="qrScannerInputRef" v-model="qrScanInput" type="text" class="form-input"
                :placeholder="`Scan ${activeOptionMeta?.label} QR (e.g. QR|L04|BUNDLE-210)`"
                @keydown.enter.prevent="confirmQrScan()" />
              <div class="qr-scan-btn-group">
                <button type="button" class="btn btn-qr btn-sm"
                  @click="isCameraActive ? stopQrCamera() : startQrCamera()">
                  {{ isCameraActive ? 'Stop Camera' : 'Open Camera' }}
                </button>
                <button type="button" class="btn btn-primary btn-sm" :disabled="isProcessingQrScan"
                  @click="confirmQrScan()">
                  Insert Scan
                </button>
              </div>
            </div>

            <div v-if="cameraError" class="qr-feedback-bar">{{ cameraError }}</div>
            <div v-show="isCameraActive" id="qr-camera-reader" class="qr-camera-box"></div>

            <div class="qr-quick-samples">
              <span class="preset-label">Quick Sample Scan:</span>
              <button type="button" class="preset-chip" @click="confirmQrScan('QR|L04|BUNDLE-210')">
                Scan L04
              </button>
              <button type="button" class="preset-chip" @click="confirmQrScan('QR|L02|BUNDLE-118')">
                Scan L02
              </button>
            </div>

            <div v-if="isQrScanned && scannedAtTime" class="modal-summary-bar">
              <span>
                QR: <strong>{{ scannedQrCode }}</strong> · Line:
                <strong>{{ scannedLineLabel || qrTargetLine.lineName }}</strong> · Slot:
                <strong>{{ BASE_HOURS[qrEntryOut.hourIndex]?.section }}</strong>
              </span>
              <span>
                Scan Time: <strong>{{ scannedAtTime }}</strong>
              </span>
            </div>
          </div>

          <div v-if="qrScanFeedback" class="qr-feedback-bar">
            {{ qrScanFeedback }}
          </div>

          <div v-if="qrScanHistory.length" class="qr-modal-history">
            <span class="preset-label">Recent Logs:</span>
            <div class="qr-history-pills">
              <span v-for="item in qrScanHistory.slice(0, 3)" :key="item.id" class="history-pill">
                {{ item.optionLabel }} · {{ item.lineName }} ({{ item.slotLabel }}) {{ item.summary }} · {{ item.time }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- KPI Grid -->
    <section class="kpi-row">
      <div class="kpi-box">
        <span class="kpi-title">Daily Line Target</span>
        <div class="kpi-metric">
          {{ totalDailyTarget.toLocaleString() }}
          <span class="kpi-denom">pcs</span>
        </div>
        <span class="kpi-hint">Elapsed: {{ elapsedTarget.toLocaleString() }} pcs</span>
      </div>

      <div class="kpi-box">
        <span class="kpi-title">Last M/C Output</span>
        <div class="kpi-metric">
          {{ totalActual.toLocaleString() }}
          <span class="kpi-denom">/ {{ totalDailyTarget.toLocaleString() }}</span>
        </div>
        <span class="kpi-hint">
          Rem: {{ Math.max(0, totalDailyTarget - totalActual).toLocaleString() }} pcs
        </span>
      </div>

      <div class="kpi-box kpi-qc">
        <span class="kpi-title">QC Pass</span>
        <div class="kpi-metric tone-green">
          {{ totalQcPass.toLocaleString() }}
          <span class="kpi-denom">pcs</span>
        </div>
        <span class="kpi-hint">Pass Rate: {{ overallQcPassRate }}%</span>
      </div>

      <div class="kpi-box kpi-qc-var">
        <span class="kpi-title">Last → QC Variance</span>
        <div class="kpi-metric" :class="totalLastToQcVariance > 0 ? 'tone-amber' : 'tone-green'">
          {{ totalLastToQcVariance.toLocaleString() }}
          <span class="kpi-denom">pcs</span>
        </div>
        <span class="kpi-hint">{{ overallQcVarianceRate }}% diff (Def/Rej/Hold)</span>
      </div>

      <div class="kpi-box kpi-npt npt-hover-wrap">
        <span class="kpi-title">Line Wise NPT</span>
        <div class="kpi-metric" :class="totalNptMinutes > 0 ? 'tone-red' : 'tone-green'">
          {{ totalNptMinutes.toLocaleString() }}
          <span class="kpi-denom">min</span>
        </div>
        <span class="kpi-hint">Est. Loss: {{ formatPcsValue(totalNptLossPcs) }} pcs · Hover problems</span>

        <div class="npt-popover" role="tooltip">
          <div class="npt-popover-head">
            <span>NPT Problems &amp; Minutes</span>
            <strong>{{ totalNptMinutes.toLocaleString() }} min</strong>
          </div>
          <div v-if="overallNptProblemsSummary.length" class="npt-popover-list">
            <div v-for="prob in overallNptProblemsSummary" :key="prob.problem" class="npt-popover-row">
              <span class="npt-prob-name">{{ prob.problem }}</span>
              <span class="npt-prob-mins">{{ prob.minutes.toLocaleString() }} min</span>
            </div>
          </div>
          <div v-else class="npt-popover-empty">No NPT problems logged.</div>
          <div class="npt-popover-foot">
            Est. Lost Output: <strong>{{ formatPcsValue(totalNptLossPcs) }} pcs</strong>
          </div>
        </div>
      </div>

      <div class="kpi-box kpi-highlight">
        <span class="kpi-title">1st → Last M/C Gap</span>
        <div class="kpi-metric" :class="totalMachineGap > 0 ? 'tone-amber' : 'tone-green'">
          {{ totalMachineGap.toLocaleString() }}
          <span class="kpi-denom">pcs</span>
        </div>
        <span class="kpi-hint">
          1st M/C: {{ totalFirstMachine.toLocaleString() }} · {{ totalGapMinutes.toLocaleString() }}m
          WIP
        </span>
      </div>

      <div class="kpi-box">
        <span class="kpi-title">Line Efficiency</span>
        <div class="kpi-metric" :class="Number(overallEfficiency) >= targetEfficiency ? 'tone-green' : 'tone-amber'">
          {{ overallEfficiency }}%
        </div>
        <span class="kpi-hint">
          Var:
          {{ netVariance >= 0 ? `+${netVariance.toLocaleString()}` : netVariance.toLocaleString() }}
          · Target {{ targetEfficiency }}%
        </span>
      </div>

      <div class="kpi-box">
        <span class="kpi-title">Avg. DHU</span>
        <div class="kpi-metric" :class="Number(avgDhu) > 2.5 ? 'tone-red' : 'tone-green'">
          {{ avgDhu }}%
        </div>
        <span class="kpi-hint">{{ totalOperators }} Ops · {{ totalHelpers }} Hlp</span>
      </div>
    </section>

    <!-- Lines Overview Table with Merged Unit Cells & Unit-Wise Subtotals -->
    <section v-if="isAllLines" class="card-table">
      <div class="table-scroll-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th class="sticky-unit-th">Unit</th>
              <th>Line</th>
              <th>PO No &amp; Style</th>
              <th>Item Name</th>
              <th>SMV</th>
              <th>Op / Helper</th>
              <th>Line Wise Target</th>
              <th>Line Wise NPT</th>
              <th>1st M/C</th>
              <th>Last M/C Progress</th>
              <th>QC Pass</th>
              <th>Last → QC Var</th>
              <th>1st → Last Gap</th>
              <th>Target Eff</th>
              <th>Eff. %</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in groupedTableDisplayRows" :key="item.key">
              <tr v-if="item.rowType === 'line'" :class="{ 'inactive-line-row': !item.line.isActive }">
                <td v-if="item.showMergedUnitCell" :rowspan="item.unitRowspan" class="merged-unit-cell">
                  <div class="merged-unit-sticky">
                    <span class="unit-badge unit-badge-sm">{{ item.line.unit }}</span>
                    <span class="merged-unit-sub">· {{ item.unitRowspan - 1 }}L</span>
                  </div>
                </td>
                <td>
                  <div class="line-name">{{ item.line.lineName }}</div>
                  <div class="muted-sm">{{ item.line.buyer }}</div>
                </td>
                <td>
                  <div class="po-code">{{ item.line.poNo }}</div>
                  <div class="style-code">{{ item.line.styleNo }}</div>
                </td>
                <td>
                  <div class="item-name">{{ item.line.itemName }}</div>
                </td>
                <td class="num-col">{{ item.line.smv }}m</td>
                <td>
                  <div class="num-col">{{ item.line.operators }} Op / {{ item.line.helpers }} Hlp</div>
                  <div class="muted-sm">Total {{ item.line.operators + item.line.helpers }}</div>
                </td>
                <td>
                  <div class="target-val">
                    {{ item.line.effectiveDailyTarget.toLocaleString() }} pcs
                  </div>
                  <div class="muted-sm">
                    Elapsed {{ item.line.elapsedTarget.toLocaleString() }}
                  </div>
                </td>
                <td class="npt-hover-wrap">
                  <span class="gap-badge" :class="item.line.isNptAlert ? 'gap-npt-warn' : 'gap-npt'">
                    {{ item.line.totalNptMin }}m ({{ formatPcsValue(item.line.nptLossPcs) }} pcs)
                  </span>
                  <div class="muted-sm">{{ item.line.nptPctStr }}% NPT</div>

                  <div class="npt-popover" role="tooltip">
                    <div class="npt-popover-head">
                      <span>{{ item.line.lineName }} · NPT Breakdown</span>
                      <strong>{{ item.line.totalNptMin }} min</strong>
                    </div>
                    <div v-if="item.line.nptProblemsSummary.length" class="npt-popover-list">
                      <div v-for="prob in item.line.nptProblemsSummary" :key="prob.problem" class="npt-popover-row">
                        <span class="npt-prob-name">{{ prob.problem }}</span>
                        <span class="npt-prob-mins">{{ prob.minutes }} min</span>
                      </div>
                    </div>
                    <div v-else class="npt-popover-empty">No NPT problems logged.</div>
                    <div class="npt-popover-foot">
                      Est. Loss: <strong>{{ formatPcsValue(item.line.nptLossPcs) }} pcs</strong> ·
                      {{ item.line.nptPctStr }}% NPT
                    </div>
                  </div>
                </td>
                <td class="num-col">{{ item.line.effectiveFirstMachine.toLocaleString() }}</td>
                <td>
                  <div class="progress-meta">
                    <strong>{{ item.line.lastMachineTotal.toLocaleString() }}</strong>
                    <span>/ {{ item.line.dailyTarget.toLocaleString() }} ({{
                      item.line.completionPct
                    }}%)</span>
                  </div>
                  <div class="progress-track">
                    <div class="progress-fill" :style="{ width: `${item.line.completionPct}%` }"></div>
                  </div>
                </td>
                <td>
                  <div class="qc-pass-val">{{ item.line.totalQcPass.toLocaleString() }} pcs</div>
                  <div class="muted-sm">{{ item.line.qcPassRateStr }}% pass</div>
                </td>
                <td>
                  <span class="gap-badge" :class="item.line.lastToQcVariance > 0 ? 'gap-qc-var' : 'gap-normal'">
                    {{ item.line.lastToQcVariance.toLocaleString() }} pcs ({{
                      item.line.qcLossRateStr
                    }}%)
                  </span>
                </td>
                <td>
                  <span class="gap-badge" :class="item.line.isGapAlert ? 'gap-warn' : 'gap-normal'">
                    {{ item.line.machineGap }} pcs ({{ item.line.gapMinutes.toLocaleString() }}m)
                  </span>
                </td>
                <td class="num-col">{{ item.line.targetEfficiency }}%</td>
                <td>
                  <span class="eff-pill" :class="item.line.efficiency >= item.line.targetEfficiency ? 'eff-ok' : 'eff-warn'
                    ">
                    {{ item.line.efficiencyStr }}%
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <button type="button" class="act-btn act-edit" @click="openLinePopup(item.line.id)">
                      Edit
                    </button>
                    <button type="button" class="act-btn act-inspect" @click="selectedLineId = item.line.id">
                      Inspect
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-else class="unit-subtotal-row">
                <td colspan="2">
                  <div class="subtotal-label">{{ item.subtotal.unit }} Subtotal</div>
                  <div class="muted-sm">{{ item.subtotal.lineCount }} Active Lines Rollup</div>
                </td>
                <td>
                  <span class="subtotal-tag">Unit Total</span>
                </td>
                <td class="num-col">Avg {{ item.subtotal.avgSmv }}m</td>
                <td>
                  <div class="num-col">
                    {{ item.subtotal.operators }} Op / {{ item.subtotal.helpers }} Hlp
                  </div>
                  <div class="muted-sm">Total {{ item.subtotal.totalManpower }}</div>
                </td>
                <td>
                  <div class="target-val">{{ item.subtotal.dailyTarget.toLocaleString() }} pcs</div>
                  <div class="muted-sm">Line Target Sum</div>
                </td>
                <td class="npt-hover-wrap">
                  <span class="gap-badge" :class="item.subtotal.isNptAlert ? 'gap-npt-warn' : 'gap-npt'">
                    {{ item.subtotal.totalNptMin.toLocaleString() }}m ({{
                      formatPcsValue(item.subtotal.nptLossPcs)
                    }}
                    pcs)
                  </span>
                  <div class="muted-sm">Unit NPT Sum</div>

                  <div class="npt-popover" role="tooltip">
                    <div class="npt-popover-head">
                      <span>{{ item.subtotal.unit }} · NPT Breakdown</span>
                      <strong>{{ item.subtotal.totalNptMin.toLocaleString() }} min</strong>
                    </div>
                    <div v-if="item.subtotal.nptProblemsSummary.length" class="npt-popover-list">
                      <div v-for="prob in item.subtotal.nptProblemsSummary" :key="prob.problem" class="npt-popover-row">
                        <span class="npt-prob-name">{{ prob.problem }}</span>
                        <span class="npt-prob-mins">{{ prob.minutes }} min</span>
                      </div>
                    </div>
                    <div v-else class="npt-popover-empty">No NPT problems logged.</div>
                    <div class="npt-popover-foot">
                      Est. Loss:
                      <strong>{{ formatPcsValue(item.subtotal.nptLossPcs) }} pcs</strong>
                    </div>
                  </div>
                </td>
                <td class="num-col">
                  {{ item.subtotal.effectiveFirstMachine.toLocaleString() }}
                </td>
                <td>
                  <div class="progress-meta">
                    <strong>{{ item.subtotal.lastMachineTotal.toLocaleString() }}</strong>
                    <span>/ {{ item.subtotal.dailyTarget.toLocaleString() }} ({{
                      item.subtotal.completionPct
                    }}%)</span>
                  </div>
                  <div class="progress-track">
                    <div class="progress-fill progress-fill-sub" :style="{ width: `${item.subtotal.completionPct}%` }">
                    </div>
                  </div>
                </td>
                <td>
                  <div class="qc-pass-val">
                    {{ item.subtotal.totalQcPass.toLocaleString() }} pcs
                  </div>
                  <div class="muted-sm">{{ item.subtotal.qcPassRateStr }}% pass</div>
                </td>
                <td>
                  <span class="gap-badge" :class="item.subtotal.lastToQcVariance > 0 ? 'gap-qc-var' : 'gap-normal'">
                    {{ item.subtotal.lastToQcVariance.toLocaleString() }} pcs ({{
                      item.subtotal.qcLossRateStr
                    }}%)
                  </span>
                </td>
                <td>
                  <span class="gap-badge" :class="item.subtotal.isGapAlert ? 'gap-warn' : 'gap-normal'">
                    {{ item.subtotal.machineGap.toLocaleString() }} pcs ({{
                      item.subtotal.gapMinutes.toLocaleString()
                    }}m)
                  </span>
                </td>
                <td class="num-col">Avg {{ item.subtotal.targetEfficiencyStr }}%</td>
                <td>
                  <span class="eff-pill" :class="item.subtotal.efficiency >= item.subtotal.targetEfficiency
                    ? 'eff-ok'
                    : 'eff-warn'
                    ">
                    {{ item.subtotal.efficiencyStr }}%
                  </span>
                </td>
                <td>
                  <button type="button" class="act-btn act-unit-filter" @click="selectUnit(item.subtotal.unit)">
                    Filter {{ item.subtotal.unit }}
                  </button>
                </td>
              </tr>
            </template>

            <tr v-if="groupedTableDisplayRows.length === 0">
              <td colspan="16" class="empty-state">
                {{
                  linesData.length === 0
                    ? `${UNIT_LINE_SHEET} is blank — no lines on board yet.`
                    : 'No lines match your current filter.'
                }}
                <button v-if="linesData.length > 0" type="button" class="act-btn act-inspect" style="margin-left: 8px"
                  @click="
                    searchQuery = '';
                    onlyGapAlerts = false;
                    onlyActiveLines = false;
                    selectedUnit = 'ALL';
                  ">
                  Clear Filters
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Single Line Hourly Detail View -->
    <section v-else-if="currentLine && currentLineMetrics" class="card-table">
      <div class="single-line-banner">
        <div class="banner-stat">
          <span class="banner-label">Unit:</span>
          <strong class="banner-val">{{ currentLineMetrics.unit }}</strong>
        </div>
        <div class="banner-stat">
          <span class="banner-label">Line Target:</span>
          <strong class="banner-val target-val">
            {{ currentLineMetrics.effectiveDailyTarget.toLocaleString() }} pcs
          </strong>
        </div>
        <div class="banner-stat">
          <span class="banner-label">Target Eff:</span>
          <strong class="banner-val">{{ currentLineMetrics.targetEfficiency }}%</strong>
        </div>
        <div class="banner-stat npt-hover-wrap">
          <span class="banner-label">Line Wise NPT:</span>
          <strong class="banner-val tone-red">
            {{ currentLineMetrics.totalNptMin }}m ({{
              formatPcsValue(currentLineMetrics.nptLossPcs)
            }}
            pcs)
          </strong>

          <div class="npt-popover" role="tooltip">
            <div class="npt-popover-head">
              <span>{{ currentLineMetrics.lineName }} · NPT Breakdown</span>
              <strong>{{ currentLineMetrics.totalNptMin }} min</strong>
            </div>
            <div v-if="currentLineMetrics.nptProblemsSummary.length" class="npt-popover-list">
              <div v-for="prob in currentLineMetrics.nptProblemsSummary" :key="prob.problem" class="npt-popover-row">
                <span class="npt-prob-name">{{ prob.problem }}</span>
                <span class="npt-prob-mins">{{ prob.minutes }} min</span>
              </div>
            </div>
            <div v-else class="npt-popover-empty">No NPT problems logged.</div>
            <div class="npt-popover-foot">
              Est. Loss: <strong>{{ formatPcsValue(currentLineMetrics.nptLossPcs) }} pcs</strong>
            </div>
          </div>
        </div>
        <div class="banner-stat">
          <span class="banner-label">Item Name:</span>
          <strong class="banner-val">{{ currentLineMetrics.itemName }}</strong>
        </div>
        <div class="banner-stat">
          <span class="banner-label">PO No:</span>
          <strong class="banner-val">{{ currentLine.poNo }}</strong>
        </div>
        <div class="banner-stat">
          <span class="banner-label">Style / SMV:</span>
          <strong class="banner-val">{{ currentLine.styleNo }} · {{ currentLine.smv }}m</strong>
        </div>
        <div class="banner-stat">
          <span class="banner-label">QC Pass:</span>
          <strong class="banner-val tone-green">
            {{ currentLineMetrics.totalQcPass.toLocaleString() }} pcs ({{
              currentLineMetrics.qcPassRateStr
            }}%)
          </strong>
        </div>
        <div class="banner-stat">
          <span class="banner-label">1st → Last Gap:</span>
          <strong class="banner-val tone-amber">
            {{ totalMachineGap }} pcs ({{ totalGapMinutes }}m WIP)
          </strong>
        </div>
        <div class="row-actions">
          <button type="button" class="act-btn act-edit" @click="openLinePopup(currentLine.id)">
            Edit {{ currentLineMetrics.unit }}
          </button>
          <button type="button" class="act-btn" @click="addFirstMachinePieces(currentLine.id, 10)">
            +10 1st M/C
          </button>
          <button type="button" class="act-btn act-inspect" @click="selectedLineId = 'ALL'">
            ← All Lines
          </button>
        </div>
      </div>

      <div class="table-scroll-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Hour Slot</th>
              <th>Hour Target</th>
              <th>Actual (Last M/C)</th>
              <th>QC Pass</th>
              <th>NPT (min)</th>
              <th>Last → QC Var</th>
              <th>Est. 1st → Last Gap</th>
              <th>Variance</th>
              <th>Cum. Actual</th>
              <th>Cum. QC Pass</th>
              <th>Eff. %</th>
              <th>DHU %</th>
              <th>Status</th>
              <th>Quick Entry</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in computedRows" :key="row.hour" :class="{ 'active-hour-row': row.status === 'active' }">
              <td>
                <strong>{{ row.hour }}</strong>
              </td>
              <td class="num-col">{{ row.target }}</td>
              <td>
                <input v-model.number="currentLine.hourlyRows[row.index].actual" type="number" inputmode="numeric"
                  step="1" min="0" class="counter-input"
                  @input="clampHourlyInput(currentLine, row.index, 'actual')"
                  @change="onHourlyActualChange(currentLine, row.index)" />
              </td>
              <td>
                <input v-model.number="currentLine.hourlyRows[row.index].qcPass" type="number" inputmode="numeric"
                  step="1" min="0" :max="row.actual" class="counter-input counter-input-qc"
                  @input="clampHourlyInput(currentLine, row.index, 'qcPass')"
                  @change="onHourlyQcPassChange(currentLine, row.index)" />
              </td>
              <td>
                <input v-model.number="currentLine.hourlyRows[row.index].downtimeMin" type="number" inputmode="numeric"
                  step="1" min="0" class="counter-input counter-input-npt"
                  @input="clampHourlyInput(currentLine, row.index, 'downtimeMin')"
                  @change="onHourlyDowntimeChange(currentLine, row.index)" />
              </td>
              <td>
                <span class="gap-badge" :class="row.hourLastToQcVariance > 0 ? 'gap-qc-var' : 'gap-normal'">
                  {{ row.hourLastToQcVariance }} pcs
                </span>
              </td>
              <td>
                <span class="gap-badge gap-normal">{{ row.hourGap }} pcs</span>
              </td>
              <td class="num-col" :class="row.variance >= 0 ? 'tone-green' : 'tone-red'">
                {{ row.variance >= 0 ? `+${row.variance}` : row.variance }}
              </td>
              <td class="num-col">{{ row.cumulativeActual }}</td>
              <td class="num-col tone-green">{{ row.cumulativeQcPass }}</td>
              <td>
                <span class="eff-pill" :class="row.efficiency >= currentLine.targetEfficiency ? 'eff-ok' : 'eff-warn'">
                  {{ row.efficiency }}%
                </span>
              </td>
              <td class="num-col">{{ row.dhu }}%</td>
              <td>
                <span class="status-pill" :class="`st-${row.status}`">
                  {{ row.status.replace('-', ' ') }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button type="button" class="act-btn" @click="addPieces(currentLine.id, row.index, 5)">
                    +5
                  </button>
                  <button type="button" class="act-btn" @click="addPieces(currentLine.id, row.index, 10)">
                    +10
                  </button>
                  <button type="button" class="act-btn" @click="addPieces(currentLine.id, row.index, -5)">
                    -5
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.board-shell {
  position: relative;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(180deg, #0f172a 0%, #111c33 100%);
  color: #f1f5f9;
  padding: clamp(12px, 1.8vw, 22px);
  border-radius: clamp(12px, 1.4vw, 18px);
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: 0 20px 45px rgba(2, 6, 23, 0.45);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  container-type: inline-size;
}

.board-shell.mode-compact {
  padding: 10px;
  border-radius: 12px;
}

.board-shell.mode-ultrawide {
  padding: 24px 28px;
}

.top-selector-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: clamp(8px, 1vw, 14px);
  padding-bottom: clamp(10px, 1.2vw, 14px);
  margin-bottom: clamp(10px, 1.2vw, 14px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.top-selector-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  flex: 1 1 320px;
}

.board-shell.mode-compact .top-selector-group > * {
  flex: 1 1 auto;
}

.search-input {
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 9px;
  padding: 7px 12px;
  font-size: clamp(0.82rem, 0.9vw, 0.86rem);
  min-width: 160px;
  flex: 1 1 180px;
}

.search-input::placeholder {
  color: #64748b;
}

.toast-banner {
  position: sticky;
  top: 8px;
  z-index: 40;
  margin-left: auto;
  width: fit-content;
  max-width: 100%;
  background: #1d4ed8;
  color: #fff;
  padding: 6px 13px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
  margin-bottom: 10px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(2, 6, 23, 0.78);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(8px, 2vw, 20px);
  overscroll-behavior: contain;
}

.modal-card {
  width: 100%;
  max-width: min(560px, 96vw);
  max-height: 92dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  background: #131e35;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 16px;
  padding: clamp(12px, 2vw, 22px);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
  color: #f8fafc;
  box-sizing: border-box;
}

.unit-popup-card {
  max-width: min(1020px, 96vw);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.shift-modal-card {
  max-width: min(860px, 96vw);
}

.qr-modal-card {
  max-width: min(620px, 96vw);
}

@media (max-width: 640px) {
  .modal-backdrop {
    align-items: flex-end;
    padding: 6px;
  }

  .modal-card {
    max-width: 100%;
    max-height: 92dvh;
    border-radius: 16px 16px 12px 12px;
    padding: 12px;
  }
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.modal-badge {
  display: inline-block;
  background: rgba(168, 85, 247, 0.18);
  color: #d8b4fe;
  border: 1px solid rgba(168, 85, 247, 0.35);
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.shift-modal-badge {
  background: rgba(56, 189, 248, 0.18);
  color: #7dd3fc;
  border-color: rgba(56, 189, 248, 0.38);
}

.qr-modal-badge {
  background: rgba(16, 185, 129, 0.18);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.38);
}

.modal-close-btn {
  background: #1e293b;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  font-size: 0.9rem;
  cursor: pointer;
}

.modal-close-btn:hover {
  background: #334155;
  color: #fff;
}

.btn-icon-remove {
  background: rgba(248, 113, 113, 0.16);
  color: #fca5a5;
  border: 1px solid rgba(248, 113, 113, 0.35);
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-icon-remove:hover {
  background: rgba(248, 113, 113, 0.3);
  color: #ffffff;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.unit-popup-card .modal-form {
  flex: 1 1 auto;
  min-height: 0;
}

.shift-date-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.28);
}

.shift-date-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #bae6fd;
}

.shift-date-input {
  background: #09101d;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 7px;
  padding: 5px 9px;
  font-size: 0.8rem;
  font-family: inherit;
}

.shift-slots-table-wrap {
  max-height: 36dvh;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 6px;
  background: #070d18;
}

.shift-slots-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.76rem;
  font-variant-numeric: tabular-nums;
}

.shift-slots-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 6px 8px;
  background: #1b2842;
  color: #e2e8f0;
  font-size: 0.65rem;
  text-transform: uppercase;
  text-align: left;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
}

.shift-preview-cell {
  padding: 0 8px !important;
  color: #93c5fd;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
}

.popup-unit-head-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(129, 140, 248, 0.32);
  flex-shrink: 0;
}

.popup-unit-select-wrap {
  display: inline-flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 8px;
  width: auto;
  flex: 0 0 auto;
  margin: 0;
}

.popup-unit-label {
  white-space: nowrap;
  font-size: 0.84rem;
  font-weight: 700;
  color: #cbd5e1;
}

.popup-unit-select {
  width: auto !important;
  min-width: 110px;
}

.popup-unit-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.modal-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #cbd5e1;
  cursor: pointer;
  flex-shrink: 0;
}

.modal-summary-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 0.78rem;
  color: #cbd5e1;
  flex-shrink: 0;
}

.modal-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
  flex-shrink: 0;
}

.qr-step-block {
  margin-top: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.18);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qr-entry-out-box {
  border-color: rgba(74, 222, 128, 0.36);
  background: rgba(16, 36, 34, 0.65);
}

.qr-single-field-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.qr-single-field {
  flex: 1 1 auto;
  min-width: 0;
}

.qr-action-btn {
  min-height: 38px;
  flex-shrink: 0;
}

.qr-step-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.step-pill {
  background: rgba(56, 189, 248, 0.18);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.step-pill-out {
  background: rgba(74, 222, 128, 0.18);
  color: #86efac;
  border-color: rgba(74, 222, 128, 0.38);
}

.qr-step-title {
  font-size: 0.84rem;
  font-weight: 600;
  color: #e2e8f0;
}

.qr-option-select-row,
.qr-scan-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.qr-option-dropdown,
.qr-scan-row .form-input {
  flex: 1 1 190px;
  min-width: 0;
}

.qr-scan-btn-group {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .qr-single-field-row {
    flex-direction: column;
    align-items: stretch;
  }

  .qr-single-field {
    max-width: 100%;
  }

  .qr-action-btn,
  .qr-scan-btn-group .btn {
    min-height: 42px;
    flex: 1 1 auto;
  }

  .qr-scan-row {
    flex-direction: column;
    align-items: stretch;
  }

  .qr-scan-btn-group {
    width: 100%;
  }
}

.qr-camera-box {
  width: 100%;
  max-width: 360px;
  max-height: 260px;
  margin: 2px auto 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: #09101d;
}

.qr-quick-samples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.preset-label {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
}

.preset-chip {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  padding: 5px 12px;
  min-height: 30px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.preset-chip:hover {
  background: #334155;
}

.qr-feedback-bar {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 9px;
  background: rgba(30, 41, 59, 0.9);
  border-left: 3px solid #38bdf8;
  font-size: 0.78rem;
  color: #e2e8f0;
  word-break: break-word;
}

.qr-modal-history {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.qr-history-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.history-pill {
  background: rgba(15, 23, 42, 0.85);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 0.71rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.76rem;
  font-weight: 600;
  color: #cbd5e1;
}

.form-input,
.form-select {
  width: 100%;
  min-height: 38px;
  background: #09101d;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.88rem;
  box-sizing: border-box;
}

@media (max-width: 640px) {
  .form-input,
  .form-select {
    min-height: 42px;
    font-size: 16px;
  }
}

.board-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: clamp(10px, 1.5vw, 18px);
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.header-left {
  flex: 1 1 300px;
  min-width: 0;
}

.header-clock-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  padding: clamp(8px, 1vw, 12px) clamp(12px, 1.4vw, 18px);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.24), rgba(37, 99, 235, 0.24));
  border: 1px solid rgba(125, 211, 252, 0.6);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);
  min-width: clamp(130px, 14vw, 175px);
}

.board-shell.mode-compact .header-clock-panel {
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.header-clock-eyebrow {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #7dd3fc;
}

.header-clock-display {
  font-size: clamp(1.05rem, 1.4vw, 1.32rem);
  font-weight: 800;
  line-height: 1.2;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}

.status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(56, 189, 248, 0.14);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.28);
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.live-badge.streaming {
  background: rgba(34, 197, 94, 0.16);
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.35);
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.chip {
  background: rgba(30, 41, 59, 0.9);
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.14);
  padding: 4px 9px;
  border-radius: 8px;
  font-size: clamp(0.69rem, 0.8vw, 0.76rem);
  font-weight: 500;
  max-width: 100%;
}

.chip-shift {
  background: rgba(14, 165, 233, 0.16);
  color: #7dd3fc;
  border-color: rgba(56, 189, 248, 0.35);
  font-weight: 600;
}

.chip-qc {
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.3);
  font-weight: 600;
}

.chip-qc-var {
  background: rgba(249, 115, 22, 0.15);
  color: #fdba74;
  border-color: rgba(249, 115, 22, 0.32);
  font-weight: 600;
}

.chip-npt {
  background: rgba(248, 113, 113, 0.15);
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.32);
  font-weight: 600;
}

.chip-accent {
  background: rgba(251, 191, 36, 0.14);
  color: #fde68a;
  border-color: rgba(251, 191, 36, 0.28);
  font-weight: 600;
}

.board-title {
  margin: 0;
  font-size: clamp(1.05rem, 1.6vw, 1.48rem);
  font-weight: 700;
  letter-spacing: -0.015em;
  color: #f8fafc;
  line-height: 1.25;
}

.board-subtitle {
  margin: 4px 0 0;
  font-size: clamp(0.75rem, 0.9vw, 0.86rem);
  color: #94a3b8;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.board-shell.mode-compact .header-actions {
  width: 100%;
}

.board-shell.mode-compact .header-actions > .btn,
.board-shell.mode-compact .filter-controls > .filter-toggle {
  flex: 1 1 calc(50% - 4px);
  min-height: 40px;
  text-align: center;
}

.btn {
  border-radius: 10px;
  padding: clamp(7px, 0.75vw, 9px) clamp(11px, 1vw, 14px);
  font-size: clamp(0.76rem, 0.85vw, 0.83rem);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.btn-shift {
  background: rgba(14, 165, 233, 0.18);
  color: #bae6fd;
  border: 1px solid rgba(56, 189, 248, 0.42);
}

.btn-shift:hover {
  background: rgba(14, 165, 233, 0.28);
}

.btn-popup {
  background: rgba(168, 85, 247, 0.18);
  color: #e9d5ff;
  border: 1px solid rgba(168, 85, 247, 0.4);
}

.btn-popup:hover {
  background: rgba(168, 85, 247, 0.28);
}

.btn-qr {
  background: rgba(16, 185, 129, 0.16);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.btn-qr:hover {
  background: rgba(16, 185, 129, 0.25);
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
  border: 1px solid #60a5fa;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-soft {
  background: #1e293b;
  color: #f1f5f9;
  border: 1px solid rgba(148, 163, 184, 0.22);
}

.btn-soft:hover {
  background: #334155;
}

.btn-outline {
  background: transparent;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.btn-outline:hover {
  background: rgba(30, 41, 59, 0.7);
}

.pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #172238;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.16);
  padding: 7px 12px;
  border-radius: 9px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.unit-select {
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 9px;
  padding: 7px 12px;
  min-height: 36px;
  font-size: clamp(0.78rem, 0.85vw, 0.84rem);
  font-weight: 600;
  min-width: clamp(120px, 14vw, 165px);
}

.line-select {
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 9px;
  padding: 7px 12px;
  min-height: 36px;
  font-size: clamp(0.78rem, 0.85vw, 0.84rem);
  font-weight: 600;
  min-width: clamp(160px, 20vw, 240px);
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.board-shell.mode-compact .filter-controls {
  width: 100%;
}

.filter-toggle {
  background: #172238;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 9px;
  padding: 7px 12px;
  font-size: clamp(0.76rem, 0.85vw, 0.82rem);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.filter-toggle.active {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
  border-color: rgba(245, 158, 11, 0.45);
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: clamp(8px, 1vw, 14px);
  margin-top: 14px;
  margin-bottom: 18px;
}

@media (max-width: 1480px) {
  .kpi-row {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.board-shell.mode-compact[data-orientation='portrait'] .kpi-row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.kpi-box {
  background: rgba(23, 34, 56, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  padding: clamp(10px, 1vw, 14px) clamp(11px, 1.1vw, 16px);
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.kpi-qc {
  border-color: rgba(74, 222, 128, 0.32);
  background: linear-gradient(160deg, rgba(23, 34, 56, 0.95) 0%, rgba(16, 46, 36, 0.55) 100%);
}

.kpi-qc-var {
  border-color: rgba(249, 115, 22, 0.34);
  background: linear-gradient(160deg, rgba(30, 41, 59, 0.95) 0%, rgba(48, 27, 16, 0.55) 100%);
}

.kpi-npt {
  border-color: rgba(248, 113, 113, 0.34);
  background: linear-gradient(160deg, rgba(30, 41, 59, 0.95) 0%, rgba(56, 20, 28, 0.55) 100%);
}

.kpi-highlight {
  border-color: rgba(251, 191, 36, 0.34);
  background: linear-gradient(160deg, rgba(30, 41, 59, 0.95) 0%, rgba(41, 36, 20, 0.55) 100%);
}

.kpi-title {
  font-size: clamp(0.62rem, 0.72vw, 0.72rem);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
  font-weight: 700;
}

.kpi-metric {
  font-size: clamp(1.12rem, 1.45vw, 1.55rem);
  font-weight: 700;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.kpi-denom {
  font-size: clamp(0.7rem, 0.82vw, 0.84rem);
  font-weight: 500;
  color: #94a3b8;
}

.kpi-hint {
  font-size: clamp(0.66rem, 0.76vw, 0.75rem);
  color: #94a3b8;
  line-height: 1.3;
}

.tone-green {
  color: #4ade80;
}

.tone-red {
  color: #f87171;
}

.tone-amber {
  color: #fbbf24;
}

.target-val {
  font-weight: 700;
  color: #93c5fd;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.qc-pass-val {
  font-weight: 700;
  color: #4ade80;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.npt-hover-wrap {
  position: relative;
  cursor: pointer;
  z-index: 2;
}

.npt-hover-wrap:hover {
  z-index: 999;
}

.npt-popover {
  display: none;
  position: absolute;
  bottom: calc(100% + 10px);
  top: auto;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  min-width: 220px;
  max-width: min(310px, 84vw);
  background: #080e1c;
  border: 1px solid rgba(248, 113, 113, 0.58);
  border-radius: 10px;
  padding: 9px 11px;
  box-shadow: 0 -10px 28px rgba(0, 0, 0, 0.85);
  color: #f8fafc;
  text-align: left;
  pointer-events: none;
}

.npt-popover::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: rgba(248, 113, 113, 0.58) transparent transparent transparent;
}

.npt-hover-wrap:hover .npt-popover {
  display: block;
}

.npt-popover-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #fca5a5;
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  white-space: nowrap;
}

.npt-popover-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.npt-popover-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 0.72rem;
  background: rgba(30, 41, 59, 0.85);
  padding: 4px 7px;
  border-radius: 6px;
  white-space: nowrap;
}

.npt-prob-name {
  color: #e2e8f0;
  font-weight: 600;
}

.npt-prob-mins {
  color: #fbbf24;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.npt-popover-empty {
  font-size: 0.72rem;
  color: #94a3b8;
  padding: 4px 0;
}

.npt-popover-foot {
  margin-top: 6px;
  padding-top: 5px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  font-size: 0.7rem;
  color: #cbd5e1;
  white-space: nowrap;
}

.card-table {
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  overflow: visible;
}

.table-scroll-wrap {
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  border-radius: 0 0 14px 14px;
}

.single-line-banner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: clamp(8px, 1.2vw, 14px);
  padding: clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 18px);
  background: rgba(30, 41, 59, 0.72);
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 14px 14px 0 0;
}

.banner-stat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.banner-label {
  font-size: 0.78rem;
  color: #94a3b8;
}

.banner-val {
  font-size: 0.88rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: clamp(0.76rem, 0.85vw, 0.85rem);
}

.data-table th {
  background: rgba(30, 41, 59, 0.98);
  color: #cbd5e1;
  font-size: clamp(0.64rem, 0.72vw, 0.72rem);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: clamp(7px, 0.8vw, 10px) clamp(8px, 0.9vw, 12px);
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.data-table td {
  padding: clamp(7px, 0.75vw, 10px) clamp(8px, 0.9vw, 12px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  vertical-align: middle;
}

.data-table tbody tr:hover {
  background: rgba(30, 41, 59, 0.42);
}

.inactive-line-row {
  opacity: 0.62;
}

.active-hour-row {
  background: rgba(59, 130, 246, 0.12);
}

.merged-unit-cell {
  background: rgba(20, 30, 50, 0.92);
  border-right: 1px solid rgba(148, 163, 184, 0.18);
  vertical-align: top !important;
  width: 78px;
  min-width: 78px;
  max-width: 78px;
  padding: 0 !important;
  margin: 0 !important;
  text-align: center;
}

.merged-unit-sticky {
  position: sticky;
  top: 40px;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0;
  margin: 0;
  white-space: nowrap;
}

.unit-badge {
  display: inline-block;
  background: rgba(99, 102, 241, 0.18);
  color: #c7d2fe;
  border: 1px solid rgba(99, 102, 241, 0.35);
  border-radius: 6px;
  padding: 2px 5px;
  margin: 0;
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.unit-badge-sm {
  font-size: 0.66rem;
  padding: 2px 5px;
  margin: 0;
}

.merged-unit-sub {
  font-size: 0.62rem;
  color: #94a3b8;
  font-weight: 600;
  line-height: 1.2;
  padding: 0;
  margin: 0;
  white-space: nowrap;
}

.unit-subtotal-row {
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.18) 0%,
    rgba(30, 41, 59, 0.92) 45%,
    rgba(23, 34, 56, 0.95) 100%
  );
  border-top: 1px solid rgba(96, 165, 250, 0.32);
  border-bottom: 2px solid rgba(148, 163, 184, 0.24);
}

.unit-subtotal-row:hover {
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.24) 0%,
    rgba(30, 41, 59, 0.96) 45%,
    rgba(23, 34, 56, 0.98) 100%
  );
}

.subtotal-label {
  font-weight: 700;
  color: #93c5fd;
  font-size: 0.85rem;
  white-space: nowrap;
}

.subtotal-tag {
  display: inline-block;
  background: rgba(56, 189, 248, 0.16);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.line-name {
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
}

.po-code {
  font-weight: 700;
  color: #93c5fd;
  font-size: 0.78rem;
  white-space: nowrap;
}

.style-code {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.78rem;
  margin-top: 2px;
  white-space: nowrap;
}

.item-name {
  font-weight: 600;
  color: #f1f5f9;
  font-size: 0.8rem;
  white-space: nowrap;
}

.muted-sm {
  font-size: 0.72rem;
  color: #94a3b8;
  margin-top: 2px;
  white-space: nowrap;
}

.num-col {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.76rem;
  color: #cbd5e1;
  margin-bottom: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.progress-track {
  height: 6px;
  background: #1e293b;
  border-radius: 999px;
  overflow: hidden;
  min-width: 110px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #38bdf8);
  border-radius: 999px;
  transition: width 0.25s ease;
}

.progress-fill-sub {
  background: linear-gradient(90deg, #2563eb, #4ade80);
}

.gap-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.73rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.gap-npt {
  background: rgba(148, 163, 184, 0.16);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.28);
}

.gap-npt-warn {
  background: rgba(248, 113, 113, 0.18);
  color: #fca5a5;
  border: 1px solid rgba(248, 113, 113, 0.38);
}

.gap-qc-var {
  background: rgba(249, 115, 22, 0.16);
  color: #fdba74;
  border: 1px solid rgba(249, 115, 22, 0.34);
}

.gap-warn {
  background: rgba(251, 191, 36, 0.16);
  color: #fcd34d;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.gap-normal {
  background: rgba(56, 189, 248, 0.14);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.eff-pill {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.eff-ok {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.eff-warn {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.status-pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.73rem;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
}

.st-on-target {
  background: rgba(34, 197, 94, 0.18);
  color: #4ade80;
}

.st-behind {
  background: rgba(248, 113, 113, 0.18);
  color: #f87171;
}

.st-active {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.st-upcoming {
  background: #1e293b;
  color: #94a3b8;
}

.counter-input {
  width: 78px;
  min-height: 32px;
  background: #0b1220;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 7px;
  padding: 4px 7px;
  font-size: 0.84rem;
  font-variant-numeric: tabular-nums;
}

.counter-input-qc {
  border-color: rgba(74, 222, 128, 0.35);
  color: #86efac;
}

.counter-input-npt {
  width: 66px;
  border-color: rgba(248, 113, 113, 0.35);
  color: #fca5a5;
}

.row-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 5px;
}

.act-btn {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 7px;
  padding: 6px 9px;
  min-height: 30px;
  font-size: 0.73rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}

.act-btn:hover {
  background: #334155;
}

.act-edit {
  background: rgba(168, 85, 247, 0.18);
  color: #e9d5ff;
  border-color: rgba(168, 85, 247, 0.35);
}

.act-inspect {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.35);
}

.act-unit-filter {
  background: rgba(99, 102, 241, 0.22);
  color: #c7d2fe;
  border-color: rgba(99, 102, 241, 0.42);
}

.empty-state {
  text-align: center;
  padding: 28px 16px !important;
  color: #94a3b8;
  font-size: 0.88rem;
}

.xl-sheet-tab {
  margin-left: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #86efac;
  background: rgba(22, 101, 52, 0.25);
  border: 1px solid rgba(74, 222, 128, 0.35);
  padding: 2px 9px;
  border-radius: 6px;
}

.xl-formula-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0a1220;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 0.75rem;
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.xl-name-box {
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 4px;
  padding: 1px 7px;
  font-size: 0.76rem;
}

.xl-formula-text {
  overflow-x: auto;
  white-space: nowrap;
}

.excel-sheet-wrap {
  width: 100%;
  flex: 1 1 auto;
  min-height: 190px;
  max-height: 46dvh;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(148, 163, 184, 0.42);
  border-radius: 4px;
  background: #070d18;
  scrollbar-gutter: stable;
}

.excel-sheet-table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
  margin: 0;
  padding: 0;
  table-layout: fixed;
  font-size: 0.76rem;
  font-variant-numeric: tabular-nums;
}

.excel-sheet-table thead th {
  position: sticky;
  top: 0;
  z-index: 3;
  margin: 0;
  padding: 6px 6px;
  background: #1b2842;
  color: #e2e8f0;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: left;
  border-right: 1px solid rgba(148, 163, 184, 0.26);
  border-bottom: 1px solid rgba(148, 163, 184, 0.4);
  user-select: none;
}

.excel-sheet-table th:last-child {
  border-right: none;
}

.xl-corner-th {
  width: 36px;
  text-align: center !important;
  background: #111b2e !important;
  color: #64748b !important;
  z-index: 4 !important;
}

.xl-row-num {
  width: 36px;
  margin: 0;
  padding: 0;
  background: #111b2e;
  color: #94a3b8;
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
  border-right: 1px solid rgba(148, 163, 184, 0.28);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  user-select: none;
}

.xl-data-row:nth-child(even) .xl-cell {
  background: #0c1526;
}

.xl-data-row:focus-within .xl-row-num {
  background: #1d4ed8;
  color: #ffffff;
}

.xl-cell {
  margin: 0 !important;
  padding: 0 !important;
  border-right: 1px solid rgba(148, 163, 184, 0.2);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  background: #080f1c;
}

.xl-cell:last-child {
  border-right: none;
}

.xl-input,
.xl-select {
  display: block;
  width: 100%;
  height: 32px;
  margin: 0 !important;
  padding: 0 6px !important;
  border: none !important;
  border-radius: 0 !important;
  background: transparent;
  color: #f8fafc;
  font-size: 0.78rem;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
}

.xl-select option {
  background: #0f172a;
  color: #f8fafc;
}

.xl-input:focus,
.xl-select:focus {
  background: #0f2447;
  box-shadow: inset 0 0 0 2px #38bdf8;
  position: relative;
  z-index: 2;
}

.xl-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.xl-w-line {
  font-weight: 600;
  color: #93c5fd;
}

.xl-w-eff {
  color: #86efac;
  font-weight: 600;
}

.xl-input[type='number']::-webkit-outer-spin-button,
.xl-input[type='number']::-webkit-inner-spin-button,
.counter-input[type='number']::-webkit-outer-spin-button,
.counter-input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.xl-input[type='number'],
.counter-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>