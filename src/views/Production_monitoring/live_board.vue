<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const BACKEND_URL =
  'https://script.google.com/macros/s/AKfycbz9QfOx3G6ghMSuA9rtjEZLUPL7qJhn8laR2e2hFIzPgFnE7ch4Jb3K9tevP6wiWmcT/exec'

const LINES_PER_UNIT = 8
const NPT_ALERT_THRESHOLD_MIN = 30

const NPT_PROBLEM_TYPES = [
  'MACHINE PROBLEM',
  'RIB SHADE',
  'INPUT DELAY',
  'BUNDLE SHORTAGE',
  'THREAD BREAK',
  'POWER / GAS'
]

const BASE_HOURS = [
  { hour: '08:00 - 09:00', ratio: 0.1125, dhu: 1.6, downtimeMin: 2, problem: 'MACHINE PROBLEM' },
  { hour: '09:00 - 10:00', ratio: 0.125, dhu: 1.4, downtimeMin: 0, problem: null },
  { hour: '10:00 - 11:00', ratio: 0.125, dhu: 1.9, downtimeMin: 3, problem: 'INPUT DELAY' },
  { hour: '11:00 - 12:00', ratio: 0.125, dhu: 1.3, downtimeMin: 0, problem: null },
  { hour: '12:00 - 01:00', ratio: 0.1, dhu: 1.5, downtimeMin: 2, problem: 'RIB SHADE' },
  { hour: '01:00 - 02:00', ratio: 0.125, dhu: 1.4, downtimeMin: 0, problem: null },
  { hour: '02:00 - 03:00', ratio: 0.125, dhu: 1.2, downtimeMin: 0, problem: null },
  { hour: '03:00 - 04:00', ratio: 0.125, dhu: 0.0, downtimeMin: 0, problem: null },
  { hour: '04:00 - 05:00', ratio: 0.0375, dhu: 0.0, downtimeMin: 0, problem: null }
]

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
  return `Unit ${String(unitNum).padStart(2, '0')}`
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

function normalizeNptProblems(rawProblems, downtimeMin, fallbackProblem = 'MACHINE PROBLEM', lineIdx = 0, hourIdx = 0) {
  const cleanMins = Math.max(0, Number(downtimeMin) || 0)
  if (cleanMins === 0) return []

  if (Array.isArray(rawProblems) && rawProblems.length > 0) {
    const cleaned = rawProblems
      .map((item) => ({
        problem: String(item?.problem || fallbackProblem || 'MACHINE PROBLEM').trim().toUpperCase(),
        minutes: Math.max(0, Number(item?.minutes) || 0)
      }))
      .filter((item) => item.minutes > 0)
    if (cleaned.length > 0) return cleaned
  }

  const defaultProb =
    fallbackProblem || NPT_PROBLEM_TYPES[(lineIdx + hourIdx) % NPT_PROBLEM_TYPES.length]
  return [{ problem: String(defaultProb).toUpperCase(), minutes: cleanMins }]
}

function buildHourlyRows(dailyTarget, activeHourIndex = 6, lineIndex = 0) {
  let remaining = dailyTarget
  return BASE_HOURS.map((slot, idx) => {
    const isLast = idx === BASE_HOURS.length - 1
    const target = isLast
      ? Math.max(0, remaining)
      : Math.round(dailyTarget * slot.ratio)
    remaining -= target

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
      hour: slot.hour,
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
  hourlyRows.forEach((r, idx) => {
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
    ; (list || []).forEach((item) => {
      const key = item.problem || 'MACHINE PROBLEM'
      map[key] = (map[key] || 0) + (Number(item.minutes) || 0)
    })
  })
  return Object.entries(map)
    .map(([problem, minutes]) => ({ problem, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

function createLinesData(totalLines = 32) {
  const seedLines = [
    {
      id: 'line-01',
      lineName: 'Line 01',
      unit: 'Unit 01',
      isActive: true,
      poNo: 'PO-44102',
      styleNo: 'STY-7710-WVN',
      itemName: 'Woven Garment',
      modelNo: 'MOD-ALPHA-V2',
      buyer: 'Nordic Apparel',
      smv: 16.0,
      operators: 34,
      helpers: 6,
      dailyTarget: 1400,
      targetEfficiency: 75,
      maxLineGap: 60,
      firstMachineTotal: 1172,
      activeHourIndex: 6,
      hourlyRows: [
        { hour: '08:00 - 09:00', target: 160, actual: 152, qcPass: 150, dhu: 1.6, downtimeMin: 4, nptProblems: [{ problem: 'MACHINE PROBLEM', minutes: 4 }] },
        { hour: '09:00 - 10:00', target: 175, actual: 178, qcPass: 175, dhu: 1.4, downtimeMin: 0, nptProblems: [] },
        { hour: '10:00 - 11:00', target: 175, actual: 169, qcPass: 165, dhu: 2.1, downtimeMin: 3, nptProblems: [{ problem: 'INPUT DELAY', minutes: 3 }] },
        { hour: '11:00 - 12:00', target: 175, actual: 180, qcPass: 178, dhu: 1.2, downtimeMin: 0, nptProblems: [] },
        { hour: '12:00 - 01:00', target: 140, actual: 135, qcPass: 133, dhu: 1.7, downtimeMin: 5, nptProblems: [{ problem: 'RIB SHADE', minutes: 5 }] },
        { hour: '01:00 - 02:00', target: 175, actual: 171, qcPass: 168, dhu: 1.5, downtimeMin: 0, nptProblems: [] },
        { hour: '02:00 - 03:00', target: 175, actual: 143, qcPass: 141, dhu: 1.3, downtimeMin: 0, nptProblems: [] },
        { hour: '03:00 - 04:00', target: 175, actual: 0, qcPass: 0, dhu: 0, downtimeMin: 0, nptProblems: [] },
        { hour: '04:00 - 05:00', target: 50, actual: 0, qcPass: 0, dhu: 0, downtimeMin: 0, nptProblems: [] }
      ]
    },
    {
      id: 'line-02',
      lineName: 'Line 02',
      unit: 'Unit 01',
      isActive: true,
      poNo: 'PO-44119',
      styleNo: 'STY-9021-KNT',
      itemName: 'Knit Garment',
      modelNo: 'MOD-SOLO-V4',
      buyer: 'Kestrel Basics',
      smv: 12.0,
      operators: 32,
      helpers: 5,
      dailyTarget: 1800,
      targetEfficiency: 75,
      maxLineGap: 70,
      firstMachineTotal: 1461,
      activeHourIndex: 6,
      hourlyRows: [
        { hour: '08:00 - 09:00', target: 200, actual: 204, qcPass: 202, dhu: 1.1, downtimeMin: 0, nptProblems: [] },
        { hour: '09:00 - 10:00', target: 225, actual: 218, qcPass: 215, dhu: 1.4, downtimeMin: 2, nptProblems: [{ problem: 'THREAD BREAK', minutes: 2 }] },
        { hour: '10:00 - 11:00', target: 225, actual: 230, qcPass: 228, dhu: 1.0, downtimeMin: 0, nptProblems: [] },
        { hour: '11:00 - 12:00', target: 225, actual: 221, qcPass: 218, dhu: 1.5, downtimeMin: 0, nptProblems: [] },
        { hour: '12:00 - 01:00', target: 180, actual: 176, qcPass: 174, dhu: 1.2, downtimeMin: 3, nptProblems: [{ problem: 'BUNDLE SHORTAGE', minutes: 3 }] },
        { hour: '01:00 - 02:00', target: 225, actual: 228, qcPass: 226, dhu: 0.9, downtimeMin: 0, nptProblems: [] },
        { hour: '02:00 - 03:00', target: 225, actual: 142, qcPass: 140, dhu: 1.1, downtimeMin: 0, nptProblems: [] },
        { hour: '03:00 - 04:00', target: 225, actual: 0, qcPass: 0, dhu: 0, downtimeMin: 0, nptProblems: [] },
        { hour: '04:00 - 05:00', target: 65, actual: 0, qcPass: 0, dhu: 0, downtimeMin: 0, nptProblems: [] }
      ]
    },
    {
      id: 'line-03',
      lineName: 'Line 03',
      unit: 'Unit 01',
      isActive: true,
      poNo: 'PO-44145',
      styleNo: 'STY-5418-PNT',
      itemName: 'Pant',
      modelNo: 'MOD-CORE-V1',
      buyer: 'Harbor & Loom',
      smv: 18.5,
      operators: 38,
      helpers: 7,
      dailyTarget: 1250,
      targetEfficiency: 75,
      maxLineGap: 55,
      firstMachineTotal: 994,
      activeHourIndex: 6,
      hourlyRows: [
        { hour: '08:00 - 09:00', target: 140, actual: 128, qcPass: 124, dhu: 2.9, downtimeMin: 10, nptProblems: [{ problem: 'MACHINE PROBLEM', minutes: 10 }] },
        { hour: '09:00 - 10:00', target: 160, actual: 145, qcPass: 141, dhu: 3.1, downtimeMin: 6, nptProblems: [{ problem: 'INPUT DELAY', minutes: 6 }] },
        { hour: '10:00 - 11:00', target: 160, actual: 152, qcPass: 148, dhu: 2.4, downtimeMin: 4, nptProblems: [{ problem: 'MACHINE PROBLEM', minutes: 4 }] },
        { hour: '11:00 - 12:00', target: 160, actual: 158, qcPass: 155, dhu: 2.0, downtimeMin: 0, nptProblems: [] },
        { hour: '12:00 - 01:00', target: 125, actual: 120, qcPass: 117, dhu: 2.2, downtimeMin: 2, nptProblems: [{ problem: 'RIB SHADE', minutes: 2 }] },
        { hour: '01:00 - 02:00', target: 160, actual: 149, qcPass: 145, dhu: 2.6, downtimeMin: 5, nptProblems: [{ problem: 'POWER / GAS', minutes: 5 }] },
        { hour: '02:00 - 03:00', target: 160, actual: 94, qcPass: 92, dhu: 1.9, downtimeMin: 0, nptProblems: [] },
        { hour: '03:00 - 04:00', target: 160, actual: 0, qcPass: 0, dhu: 0, downtimeMin: 0, nptProblems: [] },
        { hour: '04:00 - 05:00', target: 45, actual: 0, qcPass: 0, dhu: 0, downtimeMin: 0, nptProblems: [] }
      ]
    },
    {
      id: 'line-04',
      lineName: 'Line 04',
      unit: 'Unit 01',
      isActive: true,
      poNo: 'PO-44178',
      styleNo: 'STY-8842-KNT',
      itemName: 'Knit Garment',
      modelNo: 'MOD-PRO-V3',
      buyer: 'Nordic Apparel',
      smv: 14.5,
      operators: 36,
      helpers: 6,
      dailyTarget: 1600,
      targetEfficiency: 75,
      maxLineGap: 60,
      firstMachineTotal: 1114,
      activeHourIndex: 6,
      hourlyRows: [
        { hour: '08:00 - 09:00', target: 180, actual: 165, qcPass: 162, dhu: 2.1, downtimeMin: 5, nptProblems: [{ problem: 'BUNDLE SHORTAGE', minutes: 5 }] },
        { hour: '09:00 - 10:00', target: 200, actual: 192, qcPass: 189, dhu: 1.8, downtimeMin: 0, nptProblems: [] },
        { hour: '10:00 - 11:00', target: 200, actual: 174, qcPass: 168, dhu: 3.4, downtimeMin: 8, nptProblems: [{ problem: 'MACHINE PROBLEM', minutes: 8 }] },
        { hour: '11:00 - 12:00', target: 200, actual: 205, qcPass: 202, dhu: 1.5, downtimeMin: 0, nptProblems: [] },
        { hour: '12:00 - 01:00', target: 160, actual: 148, qcPass: 145, dhu: 2.0, downtimeMin: 4, nptProblems: [{ problem: 'RIB SHADE', minutes: 4 }] },
        { hour: '01:00 - 02:00', target: 200, actual: 188, qcPass: 184, dhu: 1.9, downtimeMin: 2, nptProblems: [{ problem: 'INPUT DELAY', minutes: 2 }] },
        { hour: '02:00 - 03:00', target: 200, actual: 0, qcPass: 0, dhu: 0, downtimeMin: 0, nptProblems: [] },
        { hour: '03:00 - 04:00', target: 200, actual: 0, qcPass: 0, dhu: 0, downtimeMin: 0, nptProblems: [] },
        { hour: '04:00 - 05:00', target: 60, actual: 0, qcPass: 0, dhu: 0, downtimeMin: 0, nptProblems: [] }
      ]
    }
  ]

  for (let i = seedLines.length + 1; i <= totalLines; i++) {
    const padded = String(i).padStart(2, '0')
    const operators = 30 + ((i * 2) % 11)
    const helpers = 4 + (i % 5)
    const smv = Number((11.5 + ((i * 1.1) % 7.5)).toFixed(1))
    const dailyTarget =
      Math.max(1150, Math.round(((operators * 480 * 0.78) / smv) / 50) * 50)
    const activeHourIndex = 6
    const hourlyRows = buildHourlyRows(dailyTarget, activeHourIndex, i - 1)
    const actualSum = hourlyRows.reduce((s, r) => s + r.actual, 0)
    const gapVal = i % 4 === 0 ? 74 : 26 + (i % 32)
    const styleType = STYLE_TYPES[i % STYLE_TYPES.length]
    const styleNo = `STY-${3000 + i * 137}-${styleType}`

    seedLines.push({
      id: `line-${padded}`,
      lineName: `Line ${padded}`,
      unit: getUnitForLineIndex(i - 1),
      isActive: true,
      poNo: `PO-${44200 + i * 19}`,
      styleNo,
      itemName: ITEM_NAMES_BY_TYPE[styleType] || inferItemName(styleNo),
      modelNo: MODELS[i % MODELS.length],
      buyer: BUYERS[i % BUYERS.length],
      smv,
      operators,
      helpers,
      dailyTarget,
      targetEfficiency: 75,
      maxLineGap: 60,
      firstMachineTotal: actualSum + gapVal,
      activeHourIndex,
      hourlyRows
    })
  }

  return seedLines.map((line, idx) => ({
    ...line,
    isActive: line.isActive !== false,
    hourlyRows: normalizeLineRows(line.hourlyRows, idx)
  }))
}

const linesData = ref(createLinesData(32))

// Reactive Device Display State
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

// Popup Modal State (Line Setup)
const isPopupOpen = ref(false)
const popupDraft = ref({
  lineId: 'line-01',
  lineName: 'Line 01',
  unit: 'Unit 01',
  isActive: true,
  poNo: '',
  styleNo: '',
  itemName: 'Woven Garment',
  modelNo: 'MOD-ALPHA-V2',
  smv: 14.0,
  operators: 32,
  helpers: 6,
  dailyTarget: 1400,
  recalcHourlyTargets: false
})

// Step-by-Step QR Entry Popup State
const isQrModalOpen = ref(false)
const selectedQrOption = ref('')
const isProceededToQr = ref(false)
const qrScanInput = ref('')
const scannedQrCode = ref('')
const isQrScanned = ref(false)
const qrScanFeedback = ref('')
const qrScanHistory = ref([])
const qrScannerInputRef = ref(null)

const qrEntryOut = ref({
  lineId: 'line-01',
  hourIndex: 6,
  qty: 15,
  qcPass: 15,
  dhu: 1.2,
  station: ''
})

function notify(msg) {
  toastMessage.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2400)
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
        displayMeta: currentDisplayMeta.value
      })
    })
    const data = await res.json()
    if (!data.ok) {
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
  if (!BACKEND_URL) return
  isSyncingGas.value = true
  try {
    const params = new URLSearchParams({
      action: 'initBoard',
      displayMode: displayMode.value,
      orientation: isPortrait.value ? 'portrait' : 'landscape',
      unit: selectedUnit.value,
      lineId: selectedLineId.value
    })
    const res = await fetch(`${BACKEND_URL}?${params.toString()}`, { method: 'GET' })
    const data = await res.json()
    if (data && data.ok && !data.isEmpty && Array.isArray(data.lines) && data.lines.length > 0) {
      linesData.value = data.lines.map((line, idx) => ({
        ...line,
        isActive: line.isActive !== false,
        hourlyRows: normalizeLineRows(line.hourlyRows, idx)
      }))
      lastUpdated.value = new Date().toLocaleTimeString()
      notify('Synced from Google Apps Script')
    }
  } catch (_) {
    // Keep local seed data if GAS sheet is not yet populated or unreachable
  } finally {
    isSyncingGas.value = false
  }
}

async function manualSyncBoardToGas() {
  isSyncingGas.value = true
  try {
    const res = await sendToGasBackend(
      'syncBoardSnapshot',
      { lines: JSON.parse(JSON.stringify(linesData.value)) },
      { silent: false }
    )
    if (res && res.ok) {
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
  return list
})

const linesInSelectedUnit = computed(() => {
  if (selectedUnit.value === 'ALL') return linesData.value
  return linesData.value.filter(
    (line, idx) => (line.unit || getUnitForLineIndex(idx)) === selectedUnit.value
  )
})

const isAllLines = computed(() => selectedLineId.value === 'ALL')

const currentLine = computed(() => {
  return (
    linesData.value.find((l) => l.id === selectedLineId.value) ||
    linesInSelectedUnit.value[0] ||
    linesData.value[0]
  )
})

const qrTargetLine = computed(() => {
  return linesData.value.find((l) => l.id === qrEntryOut.value.lineId) || linesData.value[0]
})

const activeOptionMeta = computed(() => {
  return QR_OPTIONS.find((opt) => opt.key === selectedQrOption.value) || null
})

function toggleLineActive(lineId, forceState = null) {
  const line = linesData.value.find((l) => l.id === lineId)
  if (!line) return
  line.isActive = typeof forceState === 'boolean' ? forceState : !line.isActive
  lastUpdated.value = new Date().toLocaleTimeString()
  notify(`${line.lineName} ${line.isActive ? 'Activated' : 'Deactivated'}`)
  sendToGasBackend('toggleLineStatus', { id: line.id, isActive: line.isActive }, { silent: true })
}

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

function loadDraftFromLineId(lineId) {
  const idx = linesData.value.findIndex((l) => l.id === lineId)
  const target =
    (idx >= 0 ? linesData.value[idx] : null) ||
    (!isAllLines.value ? currentLine.value : linesData.value[0])
  const resolvedIdx = idx >= 0 ? idx : 0

  popupDraft.value = {
    lineId: target.id,
    lineName: target.lineName,
    unit: target.unit || getUnitForLineIndex(resolvedIdx),
    isActive: target.isActive !== false,
    poNo: target.poNo || '',
    styleNo: target.styleNo || '',
    itemName: target.itemName || inferItemName(target.styleNo),
    modelNo: target.modelNo || 'MOD-ALPHA-V2',
    smv: Number(target.smv) || 14.0,
    operators: Number(target.operators) || 0,
    helpers: Number(target.helpers) || 0,
    dailyTarget: Number(target.dailyTarget) || 1200,
    recalcHourlyTargets: false
  }
}

function openLinePopup(lineId = null) {
  const resolvedId =
    lineId ||
    (!isAllLines.value
      ? currentLine.value.id
      : (linesInSelectedUnit.value[0] || linesData.value[0]).id)
  loadDraftFromLineId(resolvedId)
  isPopupOpen.value = true
}

function closeLinePopup() {
  isPopupOpen.value = false
}

function onPopupLineChange(newLineId) {
  loadDraftFromLineId(newLineId)
}

function saveLinePopup() {
  const lineIdx = linesData.value.findIndex((l) => l.id === popupDraft.value.lineId)
  if (lineIdx < 0) return
  const line = linesData.value[lineIdx]

  const cleanLineName = String(popupDraft.value.lineName || '').trim() || line.lineName
  const cleanUnit = String(popupDraft.value.unit || '').trim() || getUnitForLineIndex(lineIdx)
  const cleanPo = String(popupDraft.value.poNo || '').trim() || line.poNo
  const cleanStyle = String(popupDraft.value.styleNo || '').trim() || line.styleNo
  const cleanItemName =
    String(popupDraft.value.itemName || '').trim() || inferItemName(cleanStyle)
  const cleanModel = String(popupDraft.value.modelNo || '').trim() || line.modelNo
  const cleanSmv = Math.max(0.1, Number(popupDraft.value.smv) || line.smv)
  const cleanOperators = Math.max(0, Math.round(Number(popupDraft.value.operators) || 0))
  const cleanHelpers = Math.max(0, Math.round(Number(popupDraft.value.helpers) || 0))
  const cleanTarget = Math.max(0, Math.round(Number(popupDraft.value.dailyTarget) || 0))

  line.lineName = cleanLineName
  line.unit = cleanUnit
  line.isActive = Boolean(popupDraft.value.isActive)
  line.poNo = cleanPo
  line.styleNo = cleanStyle
  line.itemName = cleanItemName
  line.modelNo = cleanModel
  line.smv = cleanSmv
  line.operators = cleanOperators
  line.helpers = cleanHelpers
  line.dailyTarget = cleanTarget

  if (popupDraft.value.recalcHourlyTargets) {
    let remaining = cleanTarget
    line.hourlyRows.forEach((row, idx) => {
      const slot = BASE_HOURS[idx] || { ratio: 1 / line.hourlyRows.length }
      const isLast = idx === line.hourlyRows.length - 1
      const nextTarget = isLast
        ? Math.max(0, remaining)
        : Math.round(cleanTarget * slot.ratio)
      remaining -= nextTarget
      row.target = nextTarget
    })
  }

  lastUpdated.value = new Date().toLocaleTimeString()
  isPopupOpen.value = false
  notify(`${line.lineName} (${line.isActive ? 'Active' : 'Deactive'}) saved`)
  sendToGasBackend('saveLineSetup', JSON.parse(JSON.stringify(line)))
}

function resetQrFlowState(keepOption = false) {
  if (!keepOption) {
    selectedQrOption.value = ''
    isProceededToQr.value = false
  } else {
    isProceededToQr.value = Boolean(selectedQrOption.value)
  }
  qrScanInput.value = ''
  scannedQrCode.value = ''
  isQrScanned.value = false
  qrScanFeedback.value = ''
  if (keepOption && selectedQrOption.value && isProceededToQr.value) {
    nextTick(() => {
      qrScannerInputRef.value?.focus()
    })
  }
}

function openQrEntryPopup() {
  const defaultLine = !isAllLines.value
    ? currentLine.value
    : linesInSelectedUnit.value[0] || linesData.value[0]

  resetQrFlowState(false)
  qrEntryOut.value = {
    lineId: defaultLine?.id || 'line-01',
    hourIndex: Math.min(Math.max(0, defaultLine?.activeHourIndex ?? 6), 8),
    qty: 15,
    qcPass: 15,
    dhu: 1.2,
    station: ''
  }
  isQrModalOpen.value = true
}

function closeQrEntryPopup() {
  isQrModalOpen.value = false
  resetQrFlowState(false)
}

function onQrOptionDropdownChange(optionKey) {
  selectedQrOption.value = optionKey
  const meta = QR_OPTIONS.find((o) => o.key === optionKey)
  qrEntryOut.value.station = meta?.defaultStation || ''
  isProceededToQr.value = false
  qrScanInput.value = ''
  scannedQrCode.value = ''
  isQrScanned.value = false
  qrScanFeedback.value = optionKey
    ? `Selected "${meta?.label}". Click "Proceed to QR Code" to scan.`
    : ''
}

function proceedToQrCode() {
  if (!selectedQrOption.value) {
    qrScanFeedback.value = 'Please select a QR Code Option first.'
    return
  }
  isProceededToQr.value = true
  isQrScanned.value = false
  qrScanFeedback.value = `Ready to scan QR code for ${activeOptionMeta.value?.label}.`
  nextTick(() => {
    qrScannerInputRef.value?.focus()
  })
}

function parseQrPayload(rawText) {
  const clean = String(rawText || '').trim()
  if (!clean) return null

  const upper = clean.toUpperCase()
  let lineId = null
  let qty = null

  const lineMatch =
    upper.match(/(?:LINE[\s:_-]*|L)(\d{1,2})\b/) ||
    upper.match(/\b0?([1-9]|[12]\d|3[0-2])\b/)
  if (lineMatch) {
    const num = Number(lineMatch[1])
    if (num >= 1 && num <= 32) {
      lineId = `line-${String(num).padStart(2, '0')}`
    }
  }

  const qtyMatch = upper.match(/(?:QTY|PCS|PC|BUNDLE)[\s:_-]*(\d+)/)
  if (qtyMatch) {
    qty = Math.max(1, Number(qtyMatch[1]))
  }

  return { raw: clean, lineId, qty }
}

function confirmQrScan(overrideCode = '') {
  if (!selectedQrOption.value) {
    qrScanFeedback.value = 'Please select a QR Code Option first.'
    return
  }
  if (!isProceededToQr.value) {
    qrScanFeedback.value = 'Click "Proceed to QR Code" first.'
    return
  }

  const rawCode = String(overrideCode || qrScanInput.value || '').trim()
  if (!rawCode) {
    qrScanFeedback.value = 'Scan or enter a QR code first to show Output Entry.'
    return
  }

  const parsed = parseQrPayload(rawCode)
  scannedQrCode.value = parsed?.raw || rawCode

  if (parsed?.lineId) {
    qrEntryOut.value.lineId = parsed.lineId
  }
  if (parsed?.qty) {
    qrEntryOut.value.qty = parsed.qty
    if (selectedQrOption.value === 'QC_PASS') {
      qrEntryOut.value.qcPass = parsed.qty
    } else {
      qrEntryOut.value.qcPass = calcHourQcPass(parsed.qty, qrEntryOut.value.dhu)
    }
  }

  isQrScanned.value = true
  qrScanFeedback.value = `QR scanned: ${scannedQrCode.value}. Enter output and click Save.`
}

function submitQrEntryOut() {
  if (!selectedQrOption.value || !isProceededToQr.value || !isQrScanned.value) return

  const line = linesData.value.find((l) => l.id === qrEntryOut.value.lineId)
  if (!line) return

  const idx = Math.min(
    Math.max(0, Number(qrEntryOut.value.hourIndex) || 0),
    line.hourlyRows.length - 1
  )
  const row = line.hourlyRows[idx]
  const qty = Math.max(1, Math.round(Number(qrEntryOut.value.qty) || 1))
  const nowTime = new Date().toLocaleTimeString()

  let logSummary = ''
  let historyBadge = ''

  if (selectedQrOption.value === 'FIRST_MC') {
    const lineActual = line.hourlyRows.reduce((s, r) => s + r.actual, 0)
    line.firstMachineTotal = Math.max(lineActual, line.firstMachineTotal + qty)
    logSummary = `1st M/C Output Saved: +${qty} pcs on ${line.lineName} (${line.unit})`
    historyBadge = `+${qty} 1st M/C`
  } else if (selectedQrOption.value === 'LAST_MC') {
    row.actual += qty
    const dhuVal = Math.max(0, Number(qrEntryOut.value.dhu) || 0)
    row.dhu = dhuVal
    const qcAdd = Math.min(qty, Math.max(0, Math.round(Number(qrEntryOut.value.qcPass) || 0)))
    row.qcPass = Math.min(row.actual, (Number(row.qcPass) || 0) + qcAdd)
    line.firstMachineTotal = Math.max(
      line.firstMachineTotal,
      line.hourlyRows.reduce((s, r) => s + r.actual, 0)
    )
    logSummary = `Last M/C Output Saved: +${qty} pcs (+${qcAdd} QC Pass) on ${line.lineName} (${row.hour})`
    historyBadge = `+${qty} Out / +${qcAdd} QC`
  } else if (selectedQrOption.value === 'QC_PASS') {
    const qcAdd = Math.max(1, Math.round(Number(qrEntryOut.value.qcPass) || qty))
    const dhuVal = Math.max(0, Number(qrEntryOut.value.dhu) || 0)
    row.dhu = dhuVal
    if (row.actual < (Number(row.qcPass) || 0) + qcAdd) {
      row.actual = (Number(row.qcPass) || 0) + qcAdd
    }
    row.qcPass = Math.min(row.actual, (Number(row.qcPass) || 0) + qcAdd)
    line.firstMachineTotal = Math.max(
      line.firstMachineTotal,
      line.hourlyRows.reduce((s, r) => s + r.actual, 0)
    )
    logSummary = `QC Pass Output Saved: +${qcAdd} pcs on ${line.lineName} (${row.hour})`
    historyBadge = `+${qcAdd} QC Pass`
  }

  lastUpdated.value = nowTime
  qrScanHistory.value.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: nowTime,
    optionLabel: activeOptionMeta.value?.label || selectedQrOption.value,
    lineName: line.lineName,
    qrCode: scannedQrCode.value,
    summary: historyBadge
  })
  if (qrScanHistory.value.length > 6) qrScanHistory.value.pop()

  notify(logSummary)
  sendToGasBackend('saveQrEntry', {
    optionKey: selectedQrOption.value,
    optionLabel: activeOptionMeta.value?.label || selectedQrOption.value,
    qrCode: scannedQrCode.value,
    lineId: line.id,
    lineName: line.lineName,
    unit: line.unit,
    hourIndex: idx,
    hour: row.hour,
    qty,
    qcPass: row.qcPass,
    dhu: row.dhu,
    station: qrEntryOut.value.station,
    updatedLine: JSON.parse(JSON.stringify(line))
  })
  closeQrEntryPopup()
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
  row.qcPass = calcHourQcPass(cleanActual, row.dhu)
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
  } else {
    const probName =
      row.nptProblems?.[0]?.problem ||
      NPT_PROBLEM_TYPES[(rowIndex + 1) % NPT_PROBLEM_TYPES.length]
    row.nptProblems = [{ problem: probName, minutes: cleanMins }]
  }
  lastUpdated.value = new Date().toLocaleTimeString()
  syncHourlyRowToGas(line, rowIndex)
}

function computeLineMetrics(line, index = 0) {
  const isActive = line.isActive !== false
  const activeIdx = line.activeHourIndex
  const totalActual = line.hourlyRows.reduce((sum, r) => sum + (Number(r.actual) || 0), 0)
  const totalQcPass = line.hourlyRows.reduce((sum, r) => {
    const fallback = calcHourQcPass(r.actual, r.dhu)
    const val = typeof r.qcPass === 'number' && !Number.isNaN(r.qcPass) ? r.qcPass : fallback
    return sum + Math.min(Number(r.actual) || 0, Math.max(0, Math.round(val)))
  }, 0)
  const lastToQcVariance = Math.max(0, totalActual - totalQcPass)
  const qcPassRate = totalActual > 0 ? ((totalQcPass / totalActual) * 100).toFixed(1) : '0.0'
  const qcLossRateStr =
    totalActual > 0 ? ((lastToQcVariance / totalActual) * 100).toFixed(1) : '0.0'

  const totalNptMin = isActive
    ? line.hourlyRows.reduce((sum, r) => sum + Math.max(0, Number(r.downtimeMin) || 0), 0)
    : 0
  const nptProblemsSummary = isActive ? aggregateProblemsFromRows(line.hourlyRows) : []
  const nptLossPcs = calcNptLossPcs(totalNptMin, line.smv)

  const elapsedTarget = isActive
    ? line.hourlyRows.slice(0, activeIdx + 1).reduce((sum, r) => sum + r.target, 0)
    : 0
  const netVariance = totalActual - elapsedTarget
  const effectiveDailyTarget = isActive ? line.dailyTarget : 0
  const remainingToLineTarget = Math.max(0, effectiveDailyTarget - totalActual)

  const activeOperators = isActive ? Number(line.operators) || 0 : 0
  const activeHelpers = isActive ? Number(line.helpers) || 0 : 0
  const totalManpower = Math.max(1, activeOperators + activeHelpers)
  const effectiveFirstMachine = Math.max(line.firstMachineTotal, totalActual)
  const machineGap = Math.max(0, effectiveFirstMachine - totalActual)
  const gapMinutes = Math.round(machineGap * line.smv)
  const isGapAlert = isActive && machineGap > line.maxLineGap

  const completionPct = effectiveDailyTarget
    ? Math.min(100, Math.round((totalActual / effectiveDailyTarget) * 100))
    : 0

  const activeHoursCount = activeIdx + 1
  const totalAvailableMins = activeHoursCount * totalManpower * 60
  const totalEarnedMins = totalActual * line.smv
  const nptPctStr =
    isActive && totalAvailableMins
      ? (((totalNptMin * totalManpower) / totalAvailableMins) * 100).toFixed(1)
      : '0.0'
  const efficiency =
    isActive && totalAvailableMins
      ? ((totalEarnedMins / totalAvailableMins) * 100).toFixed(1)
      : '0.0'

  const reported = line.hourlyRows.filter((r) => r.actual > 0)
  const avgDhu = reported.length
    ? (reported.reduce((sum, r) => sum + r.dhu, 0) / reported.length).toFixed(1)
    : '0.0'

  return {
    ...line,
    isActive,
    activeOperators,
    activeHelpers,
    effectiveDailyTarget,
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
    remainingToLineTarget,
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
    earnedMins += l.totalActual * l.smv
    availableMins += (l.activeHourIndex + 1) * l.totalManpower * 60
  })
  const effNum = availableMins ? Number(((earnedMins / availableMins) * 100).toFixed(1)) : 0
  const completionPct = dailyTargetSum
    ? Math.min(100, Math.round((actualSum / dailyTargetSum) * 100))
    : 0
  const targetEffAvg = lineCount
    ? activeUnitLines.reduce((s, l) => s + l.targetEfficiency, 0) / lineCount
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
    targetEfficiency: targetEffAvg
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
  const idx = linesData.value.findIndex((l) => l.id === currentLine.value.id)
  return computeLineMetrics(currentLine.value, idx >= 0 ? idx : 0)
})

const totalOperators = computed(() => {
  if (!isAllLines.value) return currentLineMetrics.value.activeOperators
  return activeScopedMetrics.value.reduce((s, l) => s + l.activeOperators, 0)
})

const totalHelpers = computed(() => {
  if (!isAllLines.value) return currentLineMetrics.value.activeHelpers
  return activeScopedMetrics.value.reduce((s, l) => s + l.activeHelpers, 0)
})

const computedRows = computed(() => {
  const line = currentLine.value
  const manpower = currentLineMetrics.value.totalManpower
  let cumulativeTarget = 0
  let cumulativeActual = 0
  let cumulativeQcPass = 0

  return line.hourlyRows.map((row, idx) => {
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
    const availableMins = manpower * 60
    const earnedMins = cleanActual * line.smv
    const efficiency =
      cleanActual > 0 && availableMins > 0
        ? ((earnedMins / availableMins) * 100).toFixed(1)
        : '0.0'

    let status = 'upcoming'
    if (idx === line.activeHourIndex) {
      status = 'active'
    } else if (cleanActual > 0 || idx < line.activeHourIndex) {
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
  if (!isAllLines.value) return currentLineMetrics.value.totalNptMin
  return activeScopedMetrics.value.reduce((sum, l) => sum + l.totalNptMin, 0)
})

const totalNptLossPcs = computed(() => {
  if (!isAllLines.value) return currentLineMetrics.value.nptLossPcs
  const sum = activeScopedMetrics.value.reduce((acc, l) => acc + (Number(l.nptLossPcs) || 0), 0)
  return Number(sum.toFixed(1))
})

const overallNptProblemsSummary = computed(() => {
  if (!isAllLines.value) return currentLineMetrics.value.nptProblemsSummary
  return mergeProblemSummaries(activeScopedMetrics.value.map((l) => l.nptProblemsSummary))
})

const totalActual = computed(() => {
  if (!isAllLines.value) return currentLineMetrics.value.totalActual
  return scopedLineMetrics.value.reduce((sum, l) => sum + l.totalActual, 0)
})

const totalQcPass = computed(() => {
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
  if (!isAllLines.value) return currentLineMetrics.value.effectiveFirstMachine
  return scopedLineMetrics.value.reduce((sum, l) => sum + l.effectiveFirstMachine, 0)
})

const totalMachineGap = computed(() => {
  if (!isAllLines.value) return currentLineMetrics.value.machineGap
  return scopedLineMetrics.value.reduce((sum, l) => sum + l.machineGap, 0)
})

const totalGapMinutes = computed(() => {
  if (!isAllLines.value) return currentLineMetrics.value.gapMinutes
  return scopedLineMetrics.value.reduce((sum, l) => sum + l.gapMinutes, 0)
})

const totalDailyTarget = computed(() => {
  if (!isAllLines.value) return currentLineMetrics.value.effectiveDailyTarget
  return activeScopedMetrics.value.reduce((sum, l) => sum + l.effectiveDailyTarget, 0)
})

const elapsedTarget = computed(() => {
  if (!isAllLines.value) return currentLineMetrics.value.elapsedTarget
  return activeScopedMetrics.value.reduce((sum, l) => sum + l.elapsedTarget, 0)
})

const netVariance = computed(() => totalActual.value - elapsedTarget.value)

const overallEfficiency = computed(() => {
  if (!isAllLines.value) return currentLineMetrics.value.efficiencyStr
  let earned = 0
  let available = 0
  activeScopedMetrics.value.forEach((l) => {
    earned += l.totalActual * l.smv
    available += (l.activeHourIndex + 1) * l.totalManpower * 60
  })
  return available ? ((earned / available) * 100).toFixed(1) : '0.0'
})

const targetEfficiency = computed(() => {
  if (!isAllLines.value) return currentLine.value.targetEfficiency
  if (!activeScopedMetrics.value.length) return 75
  const avg =
    activeScopedMetrics.value.reduce((sum, l) => sum + l.targetEfficiency, 0) /
    activeScopedMetrics.value.length
  return Math.round(avg)
})

const avgDhu = computed(() => {
  if (!isAllLines.value) return currentLineMetrics.value.avgDhuStr
  const activeLines = activeScopedMetrics.value.filter((l) => l.totalActual > 0)
  if (!activeLines.length) return '0.0'
  return (activeLines.reduce((sum, l) => sum + l.avgDhu, 0) / activeLines.length).toFixed(1)
})

function getActiveScopeTargets() {
  if (!isAllLines.value) {
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
  if (!line) return
  const lineActual = line.hourlyRows.reduce((s, r) => s + r.actual, 0)
  line.firstMachineTotal = Math.max(lineActual, line.firstMachineTotal + qty)
  lastUpdated.value = new Date().toLocaleTimeString()
  notify(`${line.lineName}: +${qty} 1st M/C`)
  sendToGasBackend('saveLineSetup', JSON.parse(JSON.stringify(line)), { silent: true })
}

function addPieces(lineId, hourIndex, qty) {
  const line = linesData.value.find((l) => l.id === lineId)
  if (!line) return
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
  clearInterval(simTimer)
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
    clearInterval(simTimer)
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
    if (isQrModalOpen.value) closeQrEntryPopup()
    if (isPopupOpen.value) closeLinePopup()
  }
}

onMounted(() => {
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
  hydrateFromGasBackend()
})

onUnmounted(() => {
  clearInterval(simTimer)
  clearTimeout(toastTimer)
  clearInterval(clockTimer)
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
            {{ line.lineName }} ({{ line.isActive ? 'Active' : 'Deactive' }})
          </option>
        </select>

        <input v-if="isAllLines" v-model="searchQuery" type="search" aria-label="Search PO, Style, Item, Line or Buyer"
          placeholder="Search PO, Style, Item, Line..." class="search-input" />

        <button v-if="!isAllLines" type="button" class="act-btn"
          :class="currentLine.isActive !== false ? 'act-deactive' : 'act-activate'"
          @click="toggleLineActive(currentLine.id)">
          {{ currentLine.isActive !== false ? 'Deactivate Line' : 'Activate Line' }}
        </button>

        <button v-if="!isAllLines" type="button" class="pill-btn" @click="openLinePopup(currentLine.id)">
          Edit {{ currentLine.lineName }} Setup
        </button>
      </div>

      <div class="header-actions">
        <button type="button" class="btn btn-popup" @click="openLinePopup()">
          + Line / PO / Manpower Popup
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
          <span class="chip">Line Target: {{ totalDailyTarget.toLocaleString() }} pcs</span>
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
              : `${currentLine.lineName} (${currentLine.unit}) — Hourly Production & Setup Board`
          }}
        </h1>

        <p class="board-subtitle">
          <template v-if="isAllLines">
            Active <strong>{{ activeLinesCount }}/{{ scopedLineMetrics.length }}</strong> lines · Target
            <strong>{{ totalDailyTarget.toLocaleString() }} pcs</strong> · NPT
            <strong>{{ totalNptMinutes.toLocaleString() }} min</strong> · QC Pass
            <strong>{{ totalQcPass.toLocaleString() }} pcs</strong> · Updated {{ lastUpdated }}
          </template>
          <template v-else>
            <strong>{{ currentLine.unit }}</strong> · Item <strong>{{ currentLine.itemName }}</strong> · PO
            <strong>{{ currentLine.poNo }}</strong> · Style <strong>{{ currentLine.styleNo }}</strong> · SMV
            <strong>{{ currentLine.smv }}m</strong> · Updated {{ lastUpdated }}
          </template>
        </p>
      </div>

      <div class="header-clock-panel">
        <span class="header-clock-eyebrow">LIVE CLOCK</span>
        <strong class="header-clock-display">{{ liveClock }}</strong>
      </div>
    </header>

    <!-- Line / PO / Manpower Popup Modal -->
    <div v-if="isPopupOpen" class="modal-backdrop" role="dialog" aria-modal="true"
      aria-labelledby="line-setup-popup-title" @click.self="closeLinePopup">
      <div class="modal-card">
        <div class="modal-head">
          <div>
            <span class="modal-badge">UNIT &amp; LINE ENTRY POPUP</span>
            <h2 id="line-setup-popup-title" class="modal-title">
              Unit, Line, Status, PO No, Style, Item Name, SMV &amp; Manpower Entry
            </h2>
          </div>
          <button type="button" class="modal-close-btn" aria-label="Close popup" @click="closeLinePopup">
            ✕
          </button>
        </div>

        <form class="modal-form" @submit.prevent="saveLinePopup">
          <div class="modal-grid-3">
            <label class="field-group">
              <span>Select Line (01–32)</span>
              <select :value="popupDraft.lineId" class="form-select" @change="onPopupLineChange($event.target.value)">
                <option v-for="l in allLineMetrics" :key="l.id" :value="l.id">
                  {{ l.lineName }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>Unit (8 Lines / Unit)</span>
              <select v-model="popupDraft.unit" class="form-select" required>
                <option v-for="u in unitOptions" :key="u" :value="u">
                  {{ u }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>Line Status</span>
              <select v-model="popupDraft.isActive" class="form-select">
                <option :value="true">Active</option>
                <option :value="false">Deactive</option>
              </select>
            </label>
          </div>

          <div class="modal-grid-3">
            <label class="field-group">
              <span>Line Label</span>
              <input v-model="popupDraft.lineName" type="text" class="form-input" placeholder="e.g. Line 01" required />
            </label>

            <label class="field-group">
              <span>PO No</span>
              <input v-model="popupDraft.poNo" type="text" class="form-input" placeholder="e.g. PO-44102" required />
            </label>

            <label class="field-group">
              <span>Style</span>
              <input v-model="popupDraft.styleNo" type="text" class="form-input" placeholder="e.g. STY-7710-WVN"
                required />
            </label>
          </div>

          <div class="modal-grid-2">
            <label class="field-group">
              <span>Item Name</span>
              <input v-model="popupDraft.itemName" type="text" class="form-input"
                placeholder="e.g. Woven Garment, Knit Garment, Pant" required />
            </label>

            <label class="field-group">
              <span>SMV (Minutes)</span>
              <input v-model.number="popupDraft.smv" type="number" min="0.1" step="0.1" class="form-input" required />
            </label>
          </div>

          <div class="modal-grid-3">
            <label class="field-group">
              <span>Operator Count</span>
              <input v-model.number="popupDraft.operators" type="number" min="0" class="form-input" required />
            </label>

            <label class="field-group">
              <span>Helper Count</span>
              <input v-model.number="popupDraft.helpers" type="number" min="0" class="form-input" required />
            </label>

            <label class="field-group">
              <span>Daily Target (pcs)</span>
              <input v-model.number="popupDraft.dailyTarget" type="number" min="0" step="50" class="form-input" />
            </label>
          </div>

          <label class="modal-checkbox">
            <input v-model="popupDraft.recalcHourlyTargets" type="checkbox" />
            <span>Re-distribute hourly targets across shift slots from Daily Target</span>
          </label>

          <div class="modal-summary-bar">
            <span>
              <strong>{{ popupDraft.isActive ? 'Active' : 'Deactive' }}</strong> ·
              <strong>{{ popupDraft.unit }}</strong> · Manpower:
              <strong>{{ (Number(popupDraft.operators) || 0) + (Number(popupDraft.helpers) || 0) }}</strong>
            </span>
            <span>
              Item: <strong>{{ popupDraft.itemName || '—' }}</strong> · PO:
              <strong>{{ popupDraft.poNo || '—' }}</strong>
            </span>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="closeLinePopup">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Line Entry</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Step-by-Step QR Entry Popup Modal -->
    <div v-if="isQrModalOpen" class="modal-backdrop" role="dialog" aria-modal="true"
      aria-labelledby="qr-entry-popup-title" @click.self="closeQrEntryPopup">
      <div class="modal-card qr-modal-card">
        <div class="modal-head">
          <div>
            <span class="modal-badge qr-modal-badge">QR ENTRY POPUP FORM</span>
            <h2 id="qr-entry-popup-title" class="modal-title">
              Option Dropdown → Proceed to QR Code → Scan QR → Output Entry &amp; Save
            </h2>
          </div>
          <button type="button" class="modal-close-btn" aria-label="Close QR popup" @click="closeQrEntryPopup">
            ✕
          </button>
        </div>

        <!-- Step 1: Dropdown for QR Code Option + Proceed Button -->
        <div class="qr-step-block">
          <div class="qr-step-header">
            <span class="step-pill">STEP 1</span>
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

            <button v-if="selectedQrOption && !isProceededToQr" type="button" class="btn btn-primary btn-sm"
              @click="proceedToQrCode">
              Proceed to QR Code →
            </button>
          </div>
        </div>

        <!-- Step 2: Shown After Clicking "Proceed to QR Code" -->
        <div v-if="selectedQrOption && isProceededToQr" class="qr-step-block">
          <div class="qr-step-header">
            <span class="step-pill">STEP 2 · SCAN QR CODE</span>
            <span class="qr-step-title">
              Scan QR for <strong>{{ activeOptionMeta?.label }}</strong>
            </span>
          </div>

          <div class="qr-scan-row">
            <input ref="qrScannerInputRef" v-model="qrScanInput" type="text" class="form-input"
              :placeholder="`Scan ${activeOptionMeta?.label} QR (e.g. QR|L04|BUNDLE-210|QTY-15) & press Enter...`"
              @keydown.enter.prevent="confirmQrScan()" />
            <button type="button" class="btn btn-primary btn-sm" @click="confirmQrScan()">
              Scan QR Code
            </button>
          </div>

          <div class="qr-quick-samples">
            <span class="preset-label">Quick Sample Scan:</span>
            <button type="button" class="preset-chip" @click="confirmQrScan('QR|L04|BUNDLE-210|QTY-15')">
              Scan L04 (15 pcs)
            </button>
            <button type="button" class="preset-chip" @click="confirmQrScan('QR|L02|BUNDLE-118|QTY-20')">
              Scan L02 (20 pcs)
            </button>
          </div>
        </div>

        <div v-if="qrScanFeedback" class="qr-feedback-bar">
          {{ qrScanFeedback }}
        </div>

        <!-- Step 3: Output Entry Field + Save Button Shown After Scanning QR Code -->
        <form v-if="selectedQrOption && isProceededToQr && isQrScanned" class="qr-step-block qr-entry-out-box"
          @submit.prevent="submitQrEntryOut">
          <div class="qr-step-header">
            <span class="step-pill step-pill-out">STEP 3 · OUTPUT ENTRY</span>
            <span class="qr-step-title">
              Scanned QR: <code>{{ scannedQrCode }}</code>
            </span>
          </div>

          <div class="modal-grid-3">
            <label class="field-group">
              <span>Target Line</span>
              <select v-model="qrEntryOut.lineId" class="form-select">
                <option v-for="l in allLineMetrics" :key="l.id" :value="l.id">
                  {{ l.lineName }} ({{ l.unit }})
                </option>
              </select>
            </label>

            <label v-if="selectedQrOption !== 'FIRST_MC'" class="field-group">
              <span>Hour Slot</span>
              <select v-model.number="qrEntryOut.hourIndex" class="form-select">
                <option v-for="(h, idx) in qrTargetLine.hourlyRows" :key="h.hour" :value="idx">
                  {{ h.hour }}
                </option>
              </select>
            </label>

            <label v-if="selectedQrOption === 'FIRST_MC'" class="field-group">
              <span>Output Entry (1st M/C pcs)</span>
              <input v-model.number="qrEntryOut.qty" type="number" min="1" class="form-input" required />
            </label>

            <label v-if="selectedQrOption === 'LAST_MC'" class="field-group">
              <span>Output Entry (Last M/C pcs)</span>
              <input v-model.number="qrEntryOut.qty" type="number" min="1" class="form-input" required @input="
                qrEntryOut.qcPass = Math.min(
                  Number(qrEntryOut.qty) || 0,
                  Number(qrEntryOut.qcPass) || 0
                )
                " />
            </label>

            <label v-if="selectedQrOption === 'QC_PASS'" class="field-group">
              <span>Output Entry (QC Pass pcs)</span>
              <input v-model.number="qrEntryOut.qcPass" type="number" min="1" class="form-input" required />
            </label>

            <label v-if="selectedQrOption === 'LAST_MC'" class="field-group">
              <span>QC Pass (pcs)</span>
              <input v-model.number="qrEntryOut.qcPass" type="number" min="0"
                :max="Math.max(0, Number(qrEntryOut.qty) || 0)" class="form-input" required />
            </label>

            <label v-if="selectedQrOption !== 'FIRST_MC'" class="field-group">
              <span>DHU %</span>
              <input v-model.number="qrEntryOut.dhu" type="number" min="0" max="100" step="0.1" class="form-input" />
            </label>

            <label v-if="selectedQrOption === 'FIRST_MC'" class="field-group">
              <span>Station / Feed Note</span>
              <input v-model="qrEntryOut.station" type="text" class="form-input" />
            </label>
          </div>

          <div class="modal-summary-bar">
            <span>
              Option: <strong>{{ activeOptionMeta?.label }}</strong> · Line:
              <strong>{{ qrTargetLine.lineName }}</strong>
            </span>
            <span v-if="selectedQrOption === 'FIRST_MC'">
              1st M/C After Output:
              <strong>
                {{ (qrTargetLine.firstMachineTotal + (Number(qrEntryOut.qty) || 0)).toLocaleString() }} pcs
              </strong>
            </span>
            <span v-else-if="selectedQrOption === 'LAST_MC'">
              Output: <strong>+{{ Number(qrEntryOut.qty) || 0 }} pcs</strong> · QC Pass:
              <strong>+{{ Number(qrEntryOut.qcPass) || 0 }} pcs</strong>
            </span>
            <span v-else>
              QC Pass Output: <strong>+{{ Number(qrEntryOut.qcPass) || 0 }} pcs</strong>
            </span>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="resetQrFlowState(true)">
              Re-Scan QR
            </button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>

        <div v-if="qrScanHistory.length" class="qr-modal-history">
          <span class="preset-label">Recent Logs:</span>
          <div class="qr-history-pills">
            <span v-for="item in qrScanHistory.slice(0, 3)" :key="item.id" class="history-pill">
              {{ item.optionLabel }} · {{ item.lineName }} {{ item.summary }} ({{ item.time }})
            </span>
          </div>
        </div>
      </div>
    </div>

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
          1st M/C: {{ totalFirstMachine.toLocaleString() }} · {{ totalGapMinutes.toLocaleString() }}m WIP
        </span>
      </div>

      <div class="kpi-box">
        <span class="kpi-title">Line Efficiency</span>
        <div class="kpi-metric" :class="Number(overallEfficiency) >= targetEfficiency ? 'tone-green' : 'tone-amber'">
          {{ overallEfficiency }}%
        </div>
        <span class="kpi-hint">
          Var: {{ netVariance >= 0 ? `+${netVariance.toLocaleString()}` : netVariance.toLocaleString() }} · Target
          {{ targetEfficiency }}%
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
                  <div class="target-val">{{ item.line.effectiveDailyTarget.toLocaleString() }} pcs</div>
                  <div class="muted-sm">Elapsed {{ item.line.elapsedTarget.toLocaleString() }}</div>
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
                      Est. Loss: <strong>{{ formatPcsValue(item.line.nptLossPcs) }} pcs</strong> · {{
                        item.line.nptPctStr }}% NPT
                    </div>
                  </div>
                </td>
                <td class="num-col">{{ item.line.effectiveFirstMachine.toLocaleString() }}</td>
                <td>
                  <div class="progress-meta">
                    <strong>{{ item.line.lastMachineTotal.toLocaleString() }}</strong>
                    <span>/ {{ item.line.dailyTarget.toLocaleString() }} ({{ item.line.completionPct }}%)</span>
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
                    {{ item.line.lastToQcVariance.toLocaleString() }} pcs ({{ item.line.qcLossRateStr }}%)
                  </span>
                </td>
                <td>
                  <span class="gap-badge" :class="item.line.isGapAlert ? 'gap-warn' : 'gap-normal'">
                    {{ item.line.machineGap }} pcs ({{ item.line.gapMinutes.toLocaleString() }}m)
                  </span>
                </td>
                <td>
                  <span class="eff-pill"
                    :class="item.line.efficiency >= item.line.targetEfficiency ? 'eff-ok' : 'eff-warn'">
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
                  <div class="num-col">{{ item.subtotal.operators }} Op / {{ item.subtotal.helpers }} Hlp</div>
                  <div class="muted-sm">Total {{ item.subtotal.totalManpower }}</div>
                </td>
                <td>
                  <div class="target-val">{{ item.subtotal.dailyTarget.toLocaleString() }} pcs</div>
                  <div class="muted-sm">Line Target Sum</div>
                </td>
                <td class="npt-hover-wrap">
                  <span class="gap-badge" :class="item.subtotal.isNptAlert ? 'gap-npt-warn' : 'gap-npt'">
                    {{ item.subtotal.totalNptMin.toLocaleString() }}m ({{ formatPcsValue(item.subtotal.nptLossPcs) }}
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
                      Est. Loss: <strong>{{ formatPcsValue(item.subtotal.nptLossPcs) }} pcs</strong>
                    </div>
                  </div>
                </td>
                <td class="num-col">{{ item.subtotal.effectiveFirstMachine.toLocaleString() }}</td>
                <td>
                  <div class="progress-meta">
                    <strong>{{ item.subtotal.lastMachineTotal.toLocaleString() }}</strong>
                    <span>/ {{ item.subtotal.dailyTarget.toLocaleString() }} ({{ item.subtotal.completionPct }}%)</span>
                  </div>
                  <div class="progress-track">
                    <div class="progress-fill progress-fill-sub" :style="{ width: `${item.subtotal.completionPct}%` }">
                    </div>
                  </div>
                </td>
                <td>
                  <div class="qc-pass-val">{{ item.subtotal.totalQcPass.toLocaleString() }} pcs</div>
                  <div class="muted-sm">{{ item.subtotal.qcPassRateStr }}% pass</div>
                </td>
                <td>
                  <span class="gap-badge" :class="item.subtotal.lastToQcVariance > 0 ? 'gap-qc-var' : 'gap-normal'">
                    {{ item.subtotal.lastToQcVariance.toLocaleString() }} pcs ({{ item.subtotal.qcLossRateStr }}%)
                  </span>
                </td>
                <td>
                  <span class="gap-badge" :class="item.subtotal.isGapAlert ? 'gap-warn' : 'gap-normal'">
                    {{ item.subtotal.machineGap.toLocaleString() }} pcs ({{ item.subtotal.gapMinutes.toLocaleString()
                    }}m)
                  </span>
                </td>
                <td>
                  <span class="eff-pill"
                    :class="item.subtotal.efficiency >= item.subtotal.targetEfficiency ? 'eff-ok' : 'eff-warn'">
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
              <td colspan="15" class="empty-state">
                No lines match your current filter.
                <button type="button" class="act-btn act-inspect" style="margin-left: 8px" @click="
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
    <section v-else class="card-table">
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
        <div class="banner-stat npt-hover-wrap">
          <span class="banner-label">Line Wise NPT:</span>
          <strong class="banner-val tone-red">
            {{ currentLineMetrics.totalNptMin }}m ({{ formatPcsValue(currentLineMetrics.nptLossPcs) }} pcs)
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
            {{ currentLineMetrics.totalQcPass.toLocaleString() }} pcs ({{ currentLineMetrics.qcPassRateStr }}%)
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
            Edit in Popup
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
              <td><strong>{{ row.hour }}</strong></td>
              <td class="num-col">{{ row.target }}</td>
              <td>
                <input v-model.number="currentLine.hourlyRows[row.index].actual" type="number" min="0"
                  class="counter-input" @change="onHourlyActualChange(currentLine, row.index)" />
              </td>
              <td>
                <input v-model.number="currentLine.hourlyRows[row.index].qcPass" type="number" min="0" :max="row.actual"
                  class="counter-input counter-input-qc" @change="onHourlyQcPassChange(currentLine, row.index)" />
              </td>
              <td>
                <input v-model.number="currentLine.hourlyRows[row.index].downtimeMin" type="number" min="0"
                  class="counter-input counter-input-npt" @change="onHourlyDowntimeChange(currentLine, row.index)" />
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
                  <button type="button" class="act-btn" @click="addPieces(currentLine.id, row.index, 5)">+5</button>
                  <button type="button" class="act-btn" @click="addPieces(currentLine.id, row.index, 10)">+10</button>
                  <button type="button" class="act-btn" @click="addPieces(currentLine.id, row.index, -5)">-5</button>
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

.board-shell.mode-compact .top-selector-group>* {
  flex: 1 1 auto;
}

.search-input {
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 9px;
  padding: 7px 12px;
  font-size: clamp(0.76rem, 0.9vw, 0.84rem);
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

/* Popup Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(2, 6, 23, 0.76);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(8px, 2vw, 20px);
}

.modal-card {
  width: 100%;
  max-width: min(560px, 96vw);
  max-height: 90dvh;
  overflow-y: auto;
  background: #131e35;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 16px;
  padding: clamp(14px, 2vw, 22px);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
  color: #f8fafc;
  box-sizing: border-box;
}

.qr-modal-card {
  max-width: min(620px, 96vw);
}

.board-shell.mode-compact .modal-card {
  align-self: flex-end;
  max-height: 88dvh;
  border-radius: 16px 16px 10px 10px;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.modal-badge {
  display: inline-block;
  background: rgba(168, 85, 247, 0.18);
  color: #d8b4fe;
  border: 1px solid rgba(168, 85, 247, 0.35);
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.qr-modal-badge {
  background: rgba(16, 185, 129, 0.18);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.38);
}

.modal-title {
  margin: 6px 0 0;
  font-size: clamp(0.95rem, 1.3vw, 1.1rem);
  font-weight: 700;
}

.modal-close-btn {
  background: #1e293b;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  font-size: 0.85rem;
  cursor: pointer;
}

.modal-close-btn:hover {
  background: #334155;
  color: #fff;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.modal-grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}

.modal-grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.modal-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #cbd5e1;
  cursor: pointer;
}

.modal-summary-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 0.78rem;
  color: #cbd5e1;
}

.modal-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
}

/* Step-by-Step QR Popup Styles */
.qr-step-block {
  margin-top: 12px;
  padding: 12px 14px;
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
  gap: 10px;
  align-items: center;
}

.qr-option-dropdown,
.qr-scan-row .form-input {
  flex: 1 1 200px;
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
  padding: 4px 10px;
  font-size: 0.73rem;
  font-weight: 600;
  cursor: pointer;
}

.preset-chip:hover {
  background: #334155;
}

.qr-feedback-bar {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 9px;
  background: rgba(30, 41, 59, 0.9);
  border-left: 3px solid #38bdf8;
  font-size: 0.78rem;
  color: #e2e8f0;
}

.qr-modal-history {
  margin-top: 12px;
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
  padding: 2px 9px;
  font-size: 0.71rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #94a3b8;
}

.form-input,
.form-select {
  width: 100%;
  background: #09101d;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 7px;
  padding: 7px 9px;
  font-size: clamp(0.78rem, 0.9vw, 0.85rem);
  box-sizing: border-box;
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
  padding: 4px 10px;
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

.board-shell.mode-compact .header-actions>.btn,
.board-shell.mode-compact .filter-controls>.filter-toggle {
  flex: 1 1 calc(50% - 4px);
  text-align: center;
}

.btn {
  border-radius: 10px;
  padding: clamp(6px, 0.7vw, 8px) clamp(10px, 1vw, 14px);
  font-size: clamp(0.74rem, 0.85vw, 0.82rem);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.78rem;
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
  font-size: clamp(0.76rem, 0.85vw, 0.84rem);
  font-weight: 600;
  min-width: clamp(120px, 14vw, 165px);
}

.line-select {
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 9px;
  padding: 7px 12px;
  font-size: clamp(0.76rem, 0.85vw, 0.84rem);
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
  font-size: clamp(0.74rem, 0.85vw, 0.82rem);
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

.board-shell.mode-compact.data-orientation-portrait .kpi-row {
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

/* Hover Popover for NPT Problems & Minutes (Opens Upper) */
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
  background: linear-gradient(90deg,
      rgba(37, 99, 235, 0.18) 0%,
      rgba(30, 41, 59, 0.92) 45%,
      rgba(23, 34, 56, 0.95) 100%);
  border-top: 1px solid rgba(96, 165, 250, 0.32);
  border-bottom: 2px solid rgba(148, 163, 184, 0.24);
}

.unit-subtotal-row:hover {
  background: linear-gradient(90deg,
      rgba(37, 99, 235, 0.24) 0%,
      rgba(30, 41, 59, 0.96) 45%,
      rgba(23, 34, 56, 0.98) 100%);
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
  padding: 5px 8px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}

.act-btn:hover {
  background: #334155;
}

.act-deactive {
  background: rgba(248, 113, 113, 0.16);
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.35);
}

.act-activate {
  background: rgba(74, 222, 128, 0.16);
  color: #86efac;
  border-color: rgba(74, 222, 128, 0.35);
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
</style>