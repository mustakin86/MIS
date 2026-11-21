<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const LINES_PER_UNIT = 8

const BASE_HOURS = [
  { hour: '08:00 - 09:00', ratio: 0.1125, dhu: 1.6, downtimeMin: 2 },
  { hour: '09:00 - 10:00', ratio: 0.125,  dhu: 1.4, downtimeMin: 0 },
  { hour: '10:00 - 11:00', ratio: 0.125,  dhu: 1.9, downtimeMin: 3 },
  { hour: '11:00 - 12:00', ratio: 0.125,  dhu: 1.3, downtimeMin: 0 },
  { hour: '12:00 - 01:00', ratio: 0.1,    dhu: 1.5, downtimeMin: 2 },
  { hour: '01:00 - 02:00', ratio: 0.125,  dhu: 1.4, downtimeMin: 0 },
  { hour: '02:00 - 03:00', ratio: 0.125,  dhu: 1.2, downtimeMin: 0 },
  { hour: '03:00 - 04:00', ratio: 0.125,  dhu: 0.0, downtimeMin: 0 },
  { hour: '04:00 - 05:00', ratio: 0.0375, dhu: 0.0, downtimeMin: 0 }
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

function buildHourlyRows(dailyTarget, activeHourIndex = 6) {
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
    return {
      hour: slot.hour,
      target,
      actual,
      qcPass: calcHourQcPass(actual, dhu),
      dhu,
      downtimeMin: hasOutput ? slot.downtimeMin : 0
    }
  })
}

function normalizeLineRows(rawRows) {
  return rawRows.map((r) => {
    const fallbackQc = calcHourQcPass(r.actual, r.dhu)
    const qcPass =
      typeof r.qcPass === 'number' && !Number.isNaN(r.qcPass)
        ? Math.min(Math.max(0, Math.round(r.actual || 0)), Math.max(0, Math.round(r.qcPass)))
        : fallbackQc
    return {
      ...r,
      qcPass
    }
  })
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
        { hour: '08:00 - 09:00', target: 160, actual: 152, qcPass: 150, dhu: 1.6, downtimeMin: 4 },
        { hour: '09:00 - 10:00', target: 175, actual: 178, qcPass: 175, dhu: 1.4, downtimeMin: 0 },
        { hour: '10:00 - 11:00', target: 175, actual: 169, qcPass: 165, dhu: 2.1, downtimeMin: 3 },
        { hour: '11:00 - 12:00', target: 175, actual: 180, qcPass: 178, dhu: 1.2, downtimeMin: 0 },
        { hour: '12:00 - 01:00', target: 140, actual: 135, qcPass: 133, dhu: 1.7, downtimeMin: 5 },
        { hour: '01:00 - 02:00', target: 175, actual: 171, qcPass: 168, dhu: 1.5, downtimeMin: 0 },
        { hour: '02:00 - 03:00', target: 175, actual: 143, qcPass: 141, dhu: 1.3, downtimeMin: 0 },
        { hour: '03:00 - 04:00', target: 175, actual: 0,   qcPass: 0,   dhu: 0,   downtimeMin: 0 },
        { hour: '04:00 - 05:00', target: 50,  actual: 0,   qcPass: 0,   dhu: 0,   downtimeMin: 0 }
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
        { hour: '08:00 - 09:00', target: 200, actual: 204, qcPass: 202, dhu: 1.1, downtimeMin: 0 },
        { hour: '09:00 - 10:00', target: 225, actual: 218, qcPass: 215, dhu: 1.4, downtimeMin: 2 },
        { hour: '10:00 - 11:00', target: 225, actual: 230, qcPass: 228, dhu: 1.0, downtimeMin: 0 },
        { hour: '11:00 - 12:00', target: 225, actual: 221, qcPass: 218, dhu: 1.5, downtimeMin: 0 },
        { hour: '12:00 - 01:00', target: 180, actual: 176, qcPass: 174, dhu: 1.2, downtimeMin: 3 },
        { hour: '01:00 - 02:00', target: 225, actual: 228, qcPass: 226, dhu: 0.9, downtimeMin: 0 },
        { hour: '02:00 - 03:00', target: 225, actual: 142, qcPass: 140, dhu: 1.1, downtimeMin: 0 },
        { hour: '03:00 - 04:00', target: 225, actual: 0,   qcPass: 0,   dhu: 0,   downtimeMin: 0 },
        { hour: '04:00 - 05:00', target: 65,  actual: 0,   qcPass: 0,   dhu: 0,   downtimeMin: 0 }
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
        { hour: '08:00 - 09:00', target: 140, actual: 128, qcPass: 124, dhu: 2.9, downtimeMin: 10 },
        { hour: '09:00 - 10:00', target: 160, actual: 145, qcPass: 141, dhu: 3.1, downtimeMin: 6 },
        { hour: '10:00 - 11:00', target: 160, actual: 152, qcPass: 148, dhu: 2.4, downtimeMin: 4 },
        { hour: '11:00 - 12:00', target: 160, actual: 158, qcPass: 155, dhu: 2.0, downtimeMin: 0 },
        { hour: '12:00 - 01:00', target: 125, actual: 120, qcPass: 117, dhu: 2.2, downtimeMin: 2 },
        { hour: '01:00 - 02:00', target: 160, actual: 149, qcPass: 145, dhu: 2.6, downtimeMin: 5 },
        { hour: '02:00 - 03:00', target: 160, actual: 94,  qcPass: 92,  dhu: 1.9, downtimeMin: 0 },
        { hour: '03:00 - 04:00', target: 160, actual: 0,   qcPass: 0,   dhu: 0,   downtimeMin: 0 },
        { hour: '04:00 - 05:00', target: 45,  actual: 0,   qcPass: 0,   dhu: 0,   downtimeMin: 0 }
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
        { hour: '08:00 - 09:00', target: 180, actual: 165, qcPass: 162, dhu: 2.1, downtimeMin: 5 },
        { hour: '09:00 - 10:00', target: 200, actual: 192, qcPass: 189, dhu: 1.8, downtimeMin: 0 },
        { hour: '10:00 - 11:00', target: 200, actual: 174, qcPass: 168, dhu: 3.4, downtimeMin: 8 },
        { hour: '11:00 - 12:00', target: 200, actual: 205, qcPass: 202, dhu: 1.5, downtimeMin: 0 },
        { hour: '12:00 - 01:00', target: 160, actual: 148, qcPass: 145, dhu: 2.0, downtimeMin: 4 },
        { hour: '01:00 - 02:00', target: 200, actual: 188, qcPass: 184, dhu: 1.9, downtimeMin: 2 },
        { hour: '02:00 - 03:00', target: 200, actual: 0,   qcPass: 0,   dhu: 0,   downtimeMin: 0 },
        { hour: '03:00 - 04:00', target: 200, actual: 0,   qcPass: 0,   dhu: 0,   downtimeMin: 0 },
        { hour: '04:00 - 05:00', target: 60,  actual: 0,   qcPass: 0,   dhu: 0,   downtimeMin: 0 }
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
    const hourlyRows = buildHourlyRows(dailyTarget, activeHourIndex)
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

  return seedLines.map((line) => ({
    ...line,
    isActive: line.isActive !== false,
    hourlyRows: normalizeLineRows(line.hourlyRows)
  }))
}

const linesData = ref(createLinesData(32))

const selectedUnit = ref('ALL')
const selectedLineId = ref('ALL')
const onlyGapAlerts = ref(false)
const onlyActiveLines = ref(true)
const searchQuery = ref('')
const isLiveSimulating = ref(false)
const toastMessage = ref('')
const lastUpdated = ref(new Date().toLocaleTimeString())
const liveClock = ref(new Date().toLocaleTimeString())
let simTimer = null
let toastTimer = null
let clockTimer = null

// Popup Modal State
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

// QR Scanner & Two Dedicated Entry Forms State
const showQrForms = ref(false)
const activeQrForm = ref('FIRST')
const qrScanBuffer = ref('')
const qrStatusNote = ref('Ready for QR scan or manual bundle entry')
const qrScanHistory = ref([])
const firstQrInputRef = ref(null)
const lastQrInputRef = ref(null)

const firstForm = ref({
  lineId: 'line-01',
  qrCode: 'QR|L01|1ST|BUNDLE-104|QTY-15',
  qty: 15,
  operatorOrStation: '1st M/C - Feed / Collar'
})

const lastForm = ref({
  lineId: 'line-01',
  qrCode: 'QR|L01|LAST|BUNDLE-104|QTY-12',
  hourIndex: 6,
  qty: 12,
  qcPass: 12,
  dhu: 1.2,
  operatorOrStation: 'Last M/C - Hem / End'
})

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

const firstFormLine = computed(() => {
  return linesData.value.find((l) => l.id === firstForm.value.lineId) || linesData.value[0]
})

const lastFormLine = computed(() => {
  return linesData.value.find((l) => l.id === lastForm.value.lineId) || linesData.value[0]
})

function notify(msg) {
  toastMessage.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2400)
}

function toggleLineActive(lineId, forceState = null) {
  const line = linesData.value.find((l) => l.id === lineId)
  if (!line) return
  line.isActive = typeof forceState === 'boolean' ? forceState : !line.isActive
  lastUpdated.value = new Date().toLocaleTimeString()
  notify(`${line.lineName} ${line.isActive ? 'Activated' : 'Deactivated'}`)
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
}

function parseQrPayload(rawText) {
  const clean = String(rawText || '').trim()
  if (!clean) return null

  const upper = clean.toUpperCase()
  let lineId = null
  let stage = null
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

  if (upper.includes('FIRST') || upper.includes('1ST') || upper.includes('FEED')) {
    stage = 'FIRST'
  } else if (upper.includes('LAST') || upper.includes('END') || upper.includes('FINISH')) {
    stage = 'LAST'
  }

  const qtyMatch = upper.match(/(?:QTY|PCS|PC|BUNDLE)[\s:_-]*(\d+)/)
  if (qtyMatch) {
    qty = Math.max(1, Number(qtyMatch[1]))
  }

  return { raw: clean, lineId, stage, qty }
}

function focusQrInput(targetStage) {
  activeQrForm.value = targetStage
  showQrForms.value = true
  nextTick(() => {
    if (targetStage === 'FIRST') {
      firstQrInputRef.value?.focus()
    } else {
      lastQrInputRef.value?.focus()
    }
  })
}

function handleUniversalQrScan() {
  const parsed = parseQrPayload(qrScanBuffer.value)
  if (!parsed) {
    qrStatusNote.value = 'Enter or scan a QR code string first.'
    return
  }

  const targetStage = parsed.stage || activeQrForm.value
  const targetLineId =
    parsed.lineId ||
    (targetStage === 'FIRST' ? firstForm.value.lineId : lastForm.value.lineId)

  if (targetStage === 'FIRST') {
    firstForm.value.lineId = targetLineId
    firstForm.value.qrCode = parsed.raw
    if (parsed.qty) firstForm.value.qty = parsed.qty
    submitFirstMachineForm()
  } else {
    lastForm.value.lineId = targetLineId
    lastForm.value.qrCode = parsed.raw
    if (parsed.qty) {
      lastForm.value.qty = parsed.qty
      lastForm.value.qcPass = calcHourQcPass(parsed.qty, lastForm.value.dhu)
    }
    submitLastMachineForm()
  }

  qrScanBuffer.value = ''
}

function applySampleQr(stage, sampleCode) {
  const parsed = parseQrPayload(sampleCode)
  if (stage === 'FIRST') {
    firstForm.value.qrCode = sampleCode
    if (parsed?.lineId) firstForm.value.lineId = parsed.lineId
    if (parsed?.qty) firstForm.value.qty = parsed.qty
    submitFirstMachineForm()
  } else {
    lastForm.value.qrCode = sampleCode
    if (parsed?.lineId) lastForm.value.lineId = parsed.lineId
    if (parsed?.qty) {
      lastForm.value.qty = parsed.qty
      lastForm.value.qcPass = calcHourQcPass(parsed.qty, lastForm.value.dhu)
    }
    submitLastMachineForm()
  }
}

function submitFirstMachineForm() {
  const qty = Math.max(1, Math.round(Number(firstForm.value.qty) || 0))
  const line = linesData.value.find((l) => l.id === firstForm.value.lineId)
  if (!line) return

  const lineActual = line.hourlyRows.reduce((s, r) => s + r.actual, 0)
  line.firstMachineTotal = Math.max(lineActual, line.firstMachineTotal + qty)
  lastUpdated.value = new Date().toLocaleTimeString()

  const newGap = Math.max(0, line.firstMachineTotal - lineActual)
  qrStatusNote.value = `1st M/C logged: +${qty} pcs on ${line.lineName} (${line.unit} · ${line.itemName}) · Gap: ${newGap} pcs`
  qrScanHistory.value.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: lastUpdated.value,
    stage: '1st Machine',
    lineName: line.lineName,
    qrCode: firstForm.value.qrCode || 'QR-1ST',
    qty: `+${qty} pcs`
  })
  if (qrScanHistory.value.length > 6) qrScanHistory.value.pop()
  notify(`${line.lineName} (${line.unit}) 1st M/C: +${qty} pcs`)
}

function submitLastMachineForm() {
  const qty = Math.max(1, Math.round(Number(lastForm.value.qty) || 0))
  const line = linesData.value.find((l) => l.id === lastForm.value.lineId)
  if (!line) return

  const idx = Math.min(
    Math.max(0, Number(lastForm.value.hourIndex) || 0),
    line.hourlyRows.length - 1
  )
  const row = line.hourlyRows[idx]
  row.actual += qty

  const dhuVal = Number(lastForm.value.dhu) >= 0 ? Number(lastForm.value.dhu) : row.dhu
  if (Number(lastForm.value.dhu) >= 0) {
    row.dhu = dhuVal
  }

  const enteredQc = Number(lastForm.value.qcPass)
  const qcAdd =
    !Number.isNaN(enteredQc) && enteredQc >= 0
      ? Math.min(qty, Math.round(enteredQc))
      : calcHourQcPass(qty, dhuVal)
  row.qcPass = Math.min(row.actual, Math.max(0, (Number(row.qcPass) || 0) + qcAdd))

  const newActualTotal = line.hourlyRows.reduce((s, r) => s + r.actual, 0)
  const newQcTotal = line.hourlyRows.reduce((s, r) => s + (r.qcPass || 0), 0)
  const lastToQcVar = Math.max(0, newActualTotal - newQcTotal)
  line.firstMachineTotal = Math.max(line.firstMachineTotal, newActualTotal)
  lastUpdated.value = new Date().toLocaleTimeString()

  const newGap = Math.max(0, line.firstMachineTotal - newActualTotal)
  qrStatusNote.value = `Last M/C: +${qty} pcs (+${qcAdd} QC Pass · Last→QC Var: ${lastToQcVar} pcs) on ${line.lineName} · 1st→Last Gap: ${newGap} pcs`
  qrScanHistory.value.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: lastUpdated.value,
    stage: 'Last Machine',
    lineName: line.lineName,
    qrCode: lastForm.value.qrCode || 'QR-LAST',
    qty: `+${qty} pcs · ${qcAdd} QC`
  })
  if (qrScanHistory.value.length > 6) qrScanHistory.value.pop()
  notify(`${line.lineName} (${line.unit}): +${qty} pcs (${qcAdd} QC Pass)`)
}

function onHourlyActualChange(line, rowIndex) {
  const row = line.hourlyRows[rowIndex]
  if (!row) return
  const cleanActual = Math.max(0, Math.round(Number(row.actual) || 0))
  row.actual = cleanActual
  row.qcPass = calcHourQcPass(cleanActual, row.dhu)
}

function onHourlyQcPassChange(line, rowIndex) {
  const row = line.hourlyRows[rowIndex]
  if (!row) return
  const cleanActual = Math.max(0, Math.round(Number(row.actual) || 0))
  const cleanQc = Math.min(cleanActual, Math.max(0, Math.round(Number(row.qcPass) || 0)))
  row.qcPass = cleanQc
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

const activeLinesCount = computed(() => {
  return activeScopedMetrics.value.length
})

const alertLinesCount = computed(() => {
  return activeScopedMetrics.value.filter((l) => l.isGapAlert).length
})

const totalOperators = computed(() => {
  if (isAllLines.value) {
    return activeScopedMetrics.value.reduce((s, l) => s + l.activeOperators, 0)
  }
  return currentLineMetrics.value.activeOperators
})

const totalHelpers = computed(() => {
  if (isAllLines.value) {
    return activeScopedMetrics.value.reduce((s, l) => s + l.activeHelpers, 0)
  }
  return currentLineMetrics.value.activeHelpers
})

const currentLineMetrics = computed(() => {
  const idx = linesData.value.findIndex((l) => l.id === currentLine.value.id)
  return computeLineMetrics(currentLine.value, idx >= 0 ? idx : 0)
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

const totalActual = computed(() => {
  if (isAllLines.value) {
    return scopedLineMetrics.value.reduce((sum, l) => sum + l.totalActual, 0)
  }
  return currentLineMetrics.value.totalActual
})

const totalQcPass = computed(() => {
  if (isAllLines.value) {
    return scopedLineMetrics.value.reduce((sum, l) => sum + l.totalQcPass, 0)
  }
  return currentLineMetrics.value.totalQcPass
})

const totalLastToQcVariance = computed(() => {
  return Math.max(0, totalActual.value - totalQcPass.value)
})

const overallQcPassRate = computed(() => {
  return totalActual.value > 0
    ? ((totalQcPass.value / totalActual.value) * 100).toFixed(1)
    : '0.0'
})

const overallQcVarianceRate = computed(() => {
  return totalActual.value > 0
    ? ((totalLastToQcVariance.value / totalActual.value) * 100).toFixed(1)
    : '0.0'
})

const totalFirstMachine = computed(() => {
  if (isAllLines.value) {
    return scopedLineMetrics.value.reduce(
      (sum, l) => sum + l.effectiveFirstMachine,
      0
    )
  }
  return currentLineMetrics.value.effectiveFirstMachine
})

const totalMachineGap = computed(() => {
  if (isAllLines.value) {
    return scopedLineMetrics.value.reduce((sum, l) => sum + l.machineGap, 0)
  }
  return currentLineMetrics.value.machineGap
})

const totalGapMinutes = computed(() => {
  if (isAllLines.value) {
    return scopedLineMetrics.value.reduce((sum, l) => sum + l.gapMinutes, 0)
  }
  return currentLineMetrics.value.gapMinutes
})

const totalDailyTarget = computed(() => {
  if (isAllLines.value) {
    return activeScopedMetrics.value.reduce((sum, l) => sum + l.effectiveDailyTarget, 0)
  }
  return currentLineMetrics.value.effectiveDailyTarget
})

const elapsedTarget = computed(() => {
  if (isAllLines.value) {
    return activeScopedMetrics.value.reduce((sum, l) => sum + l.elapsedTarget, 0)
  }
  return currentLineMetrics.value.elapsedTarget
})

const netVariance = computed(() => totalActual.value - elapsedTarget.value)

const overallEfficiency = computed(() => {
  if (isAllLines.value) {
    let earned = 0
    let available = 0
    activeScopedMetrics.value.forEach((l) => {
      earned += l.totalActual * l.smv
      available += (l.activeHourIndex + 1) * l.totalManpower * 60
    })
    return available ? ((earned / available) * 100).toFixed(1) : '0.0'
  }
  return currentLineMetrics.value.efficiencyStr
})

const targetEfficiency = computed(() => {
  if (isAllLines.value) {
    if (!activeScopedMetrics.value.length) return 75
    const avg =
      activeScopedMetrics.value.reduce((sum, l) => sum + l.targetEfficiency, 0) /
      activeScopedMetrics.value.length
    return Math.round(avg)
  }
  return currentLine.value.targetEfficiency
})

const avgDhu = computed(() => {
  if (isAllLines.value) {
    const activeLines = activeScopedMetrics.value.filter((l) => l.totalActual > 0)
    if (!activeLines.length) return '0.0'
    return (
      activeLines.reduce((sum, l) => sum + l.avgDhu, 0) / activeLines.length
    ).toFixed(1)
  }
  return currentLineMetrics.value.avgDhuStr
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
    })
  })
  lastUpdated.value = new Date().toLocaleTimeString()
  notify('Shift reset')
}

function toggleSimulation() {
  isLiveSimulating.value = !isLiveSimulating.value
  if (isLiveSimulating.value) {
    notify('Live feed active')
    simTimer = setInterval(() => {
      const targets = getActiveScopeTargets()
      targets.forEach((line) => {
        const row = line.hourlyRows[line.activeHourIndex]
        if (!row) return
        const feedBundle = Math.floor(Math.random() * 6) + 4
        const finishBundle = Math.floor(Math.random() * 5) + 2
        const passBundle = calcHourQcPass(finishBundle, row.dhu)
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
  }
}

onMounted(() => {
  const nowStr = new Date().toLocaleTimeString()
  lastUpdated.value = nowStr
  liveClock.value = nowStr
  clockTimer = setInterval(() => {
    liveClock.value = new Date().toLocaleTimeString()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(simTimer)
  clearTimeout(toastTimer)
  clearInterval(clockTimer)
})
</script>

<template>
  <div class="board-shell">
    <transition name="fade">
      <div v-if="toastMessage" class="toast-banner">{{ toastMessage }}</div>
    </transition>

    <!-- Top Selector & Action Bar -->
    <div class="top-selector-bar">
      <div class="top-selector-group">
        <select
          :value="selectedUnit"
          aria-label="Select Unit"
          class="unit-select"
          @change="selectUnit($event.target.value)"
        >
          <option value="ALL">All Units ({{ linesData.length }})</option>
          <option v-for="u in unitOptions" :key="u" :value="u">
            {{ u }}
          </option>
        </select>

        <select
          :value="selectedLineId"
          aria-label="Jump directly to a specific line"
          class="line-select"
          @change="onLineSelectChange($event.target.value)"
        >
          <option value="ALL">
            {{
              selectedUnit === 'ALL'
                ? `All ${linesData.length} Lines (Floor View)`
                : `All Lines in ${selectedUnit} (${scopedLineMetrics.length} Lines)`
            }}
          </option>
          <option
            v-for="line in scopedLineMetrics"
            :key="line.id"
            :value="line.id"
          >
            {{ line.lineName }} ({{ line.isActive ? 'Active' : 'Deactive' }})
          </option>
        </select>

        <button
          v-if="!isAllLines"
          type="button"
          class="act-btn"
          :class="currentLine.isActive !== false ? 'act-deactive' : 'act-activate'"
          @click="toggleLineActive(currentLine.id)"
        >
          {{ currentLine.isActive !== false ? 'Deactivate Line' : 'Activate Line' }}
        </button>

        <button
          v-if="!isAllLines"
          type="button"
          class="pill-btn"
          @click="openLinePopup(currentLine.id)"
        >
          Edit {{ currentLine.lineName }} Setup
        </button>
      </div>

      <div class="header-actions">
        <button class="btn btn-popup" @click="openLinePopup()">
          + Line / PO / Manpower Popup
        </button>
        <button class="btn btn-qr" @click="showQrForms = !showQrForms">
          {{ showQrForms ? 'Hide QR Forms' : 'QR Entry Forms' }}
        </button>
        <button class="btn btn-primary" @click="toggleSimulation">
          {{ isLiveSimulating ? 'Pause Feed' : 'Simulate Live Feed' }}
        </button>
        <button class="btn btn-soft" @click="advanceHour">Next Hour</button>
        <button class="btn btn-outline" @click="resetShift">Reset</button>
      </div>
    </div>

    <!-- Board Title & Status Header -->
    <header class="board-header">
      <div class="header-left">
        <div class="status-strip">
          <span class="live-badge" :class="{ streaming: isLiveSimulating }">
            <span class="pulse-dot"></span>
            {{ isLiveSimulating ? 'LIVE STREAMING' : 'BOARD READY' }}
          </span>
          <span class="chip chip-unit">
            {{
              selectedUnit === 'ALL'
                ? `${unitOptions.length} Units (${LINES_PER_UNIT} Lines/Unit)`
                : `${selectedUnit} (${scopedLineMetrics.length} Lines)`
            }}
          </span>
          <span class="chip">
            Active Lines: {{ activeLinesCount }} / {{ scopedLineMetrics.length }}
          </span>
          <span class="chip">
            Line Target: {{ totalDailyTarget.toLocaleString() }} pcs
          </span>
          <span class="chip chip-qc">
            QC Pass: {{ totalQcPass.toLocaleString() }} pcs ({{ overallQcPassRate }}%)
          </span>
          <span class="chip chip-qc-var">
            Last → QC Var: {{ totalLastToQcVariance.toLocaleString() }} pcs ({{ overallQcVarianceRate }}%)
          </span>
          <span class="chip">
            Manpower: {{ totalOperators }} Ops · {{ totalHelpers }} Hlp
          </span>
          <span class="chip chip-accent">
            1st → Last Gap: {{ totalMachineGap.toLocaleString() }} pcs
          </span>
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
            Active <strong>{{ activeLinesCount }}/{{ scopedLineMetrics.length }}</strong> lines · Target <strong>{{ totalDailyTarget.toLocaleString() }} pcs</strong> · QC Pass <strong>{{ totalQcPass.toLocaleString() }} pcs</strong> · Last→QC Var <strong>{{ totalLastToQcVariance.toLocaleString() }} pcs</strong> · Updated {{ lastUpdated }}
          </template>
          <template v-else>
            <strong>{{ currentLine.unit }}</strong> · Item <strong>{{ currentLine.itemName }}</strong> · PO <strong>{{ currentLine.poNo }}</strong> · Style <strong>{{ currentLine.styleNo }}</strong> · SMV <strong>{{ currentLine.smv }}m</strong> · Updated {{ lastUpdated }}
          </template>
        </p>
      </div>

      <div class="header-clock-panel">
        <span class="header-clock-eyebrow">LIVE CLOCK</span>
        <strong class="header-clock-display">{{ liveClock }}</strong>
      </div>
    </header>

    <!-- Popup Modal -->
    <div
      v-if="isPopupOpen"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="line-setup-popup-title"
      @click.self="closeLinePopup"
    >
      <div class="modal-card">
        <div class="modal-head">
          <div>
            <span class="modal-badge">UNIT &amp; LINE ENTRY POPUP</span>
            <h2 id="line-setup-popup-title" class="modal-title">
              Unit, Line, Status, PO No, Style, Item Name, SMV &amp; Manpower Entry
            </h2>
          </div>
          <button
            type="button"
            class="modal-close-btn"
            aria-label="Close popup"
            @click="closeLinePopup"
          >
            ✕
          </button>
        </div>

        <form class="modal-form" @submit.prevent="saveLinePopup">
          <div class="modal-grid-3">
            <label class="field-group">
              <span>Select Line (01–32)</span>
              <select
                :value="popupDraft.lineId"
                class="form-select"
                @change="onPopupLineChange($event.target.value)"
              >
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
              <input
                v-model="popupDraft.lineName"
                type="text"
                class="form-input"
                placeholder="e.g. Line 01"
                required
              />
            </label>

            <label class="field-group">
              <span>PO No</span>
              <input
                v-model="popupDraft.poNo"
                type="text"
                class="form-input"
                placeholder="e.g. PO-44102"
                required
              />
            </label>

            <label class="field-group">
              <span>Style</span>
              <input
                v-model="popupDraft.styleNo"
                type="text"
                class="form-input"
                placeholder="e.g. STY-7710-WVN"
                required
              />
            </label>
          </div>

          <div class="modal-grid-2">
            <label class="field-group">
              <span>Item Name</span>
              <input
                v-model="popupDraft.itemName"
                type="text"
                class="form-input"
                placeholder="e.g. Woven Garment, Knit Garment, Pant"
                required
              />
            </label>

            <label class="field-group">
              <span>SMV (Minutes)</span>
              <input
                v-model.number="popupDraft.smv"
                type="number"
                min="0.1"
                step="0.1"
                class="form-input"
                required
              />
            </label>
          </div>

          <div class="modal-grid-3">
            <label class="field-group">
              <span>Operator Count</span>
              <input
                v-model.number="popupDraft.operators"
                type="number"
                min="0"
                class="form-input"
                required
              />
            </label>

            <label class="field-group">
              <span>Helper Count</span>
              <input
                v-model.number="popupDraft.helpers"
                type="number"
                min="0"
                class="form-input"
                required
              />
            </label>

            <label class="field-group">
              <span>Daily Target (pcs)</span>
              <input
                v-model.number="popupDraft.dailyTarget"
                type="number"
                min="0"
                step="50"
                class="form-input"
              />
            </label>
          </div>

          <label class="modal-checkbox">
            <input v-model="popupDraft.recalcHourlyTargets" type="checkbox" />
            <span>Re-distribute hourly targets across shift slots from Daily Target</span>
          </label>

          <div class="modal-summary-bar">
            <span>
              <strong>{{ popupDraft.isActive ? 'Active' : 'Deactive' }}</strong> · <strong>{{ popupDraft.unit }}</strong> · Manpower:
              <strong>{{ (Number(popupDraft.operators) || 0) + (Number(popupDraft.helpers) || 0) }}</strong>
            </span>
            <span>
              Item: <strong>{{ popupDraft.itemName || '—' }}</strong> · PO: <strong>{{ popupDraft.poNo || '—' }}</strong>
            </span>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="closeLinePopup">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Save Line Entry
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Collapsible First Machine & Last Machine QR Entry Forms -->
    <section v-if="showQrForms" class="qr-section">
      <div class="qr-top-bar">
        <div class="qr-scanner-box">
          <span class="qr-badge">QR SCANNER</span>
          <input
            v-model="qrScanBuffer"
            type="text"
            placeholder="Scan or type QR code (e.g. QR|L04|1ST|QTY-15 or QR|L04|LAST|QTY-10) & press Enter..."
            class="qr-scan-input"
            @keydown.enter.prevent="handleUniversalQrScan"
          />
          <button class="btn btn-primary btn-sm" @click="handleUniversalQrScan">
            Log QR Scan
          </button>
        </div>

        <div class="qr-presets">
          <span class="preset-label">Test QR:</span>
          <button
            class="preset-chip"
            @click="applySampleQr('FIRST', 'QR|L04|1ST|BUNDLE-210|QTY-15')"
          >
            1st M/C · L04 (+15)
          </button>
          <button
            class="preset-chip"
            @click="applySampleQr('LAST', 'QR|L04|LAST|BUNDLE-210|QTY-12')"
          >
            Last M/C · L04 (+12)
          </button>
        </div>
      </div>

      <div class="qr-status-row">
        <span class="qr-status-text">{{ qrStatusNote }}</span>
        <div v-if="qrScanHistory.length" class="qr-history-pills">
          <span
            v-for="item in qrScanHistory.slice(0, 3)"
            :key="item.id"
            class="history-pill"
          >
            {{ item.stage }} · {{ item.lineName }} {{ item.qty }} ({{ item.time }})
          </span>
        </div>
      </div>

      <div class="qr-forms-grid">
        <form class="entry-card entry-card-first" @submit.prevent="submitFirstMachineForm">
          <div class="entry-card-head">
            <div>
              <span class="stage-tag tag-first">1ST MACHINE ENTRY FORM</span>
              <h3>First Machine (Line Feed) QR Log</h3>
            </div>
            <button
              type="button"
              class="mini-focus-btn"
              @click="focusQrInput('FIRST')"
            >
              Focus QR
            </button>
          </div>

          <div class="form-row-2">
            <label class="field-group">
              <span>Target Line</span>
              <select v-model="firstForm.lineId" class="form-select">
                <option v-for="l in allLineMetrics" :key="l.id" :value="l.id">
                  {{ l.lineName }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>Bundle / Pieces (Qty)</span>
              <input
                v-model.number="firstForm.qty"
                type="number"
                min="1"
                class="form-input"
              />
            </label>
          </div>

          <div class="form-row-2">
            <label class="field-group">
              <span>QR Code Payload</span>
              <input
                ref="firstQrInputRef"
                v-model="firstForm.qrCode"
                type="text"
                placeholder="Scan 1st Machine QR..."
                class="form-input"
              />
            </label>

            <label class="field-group">
              <span>Operation / Station</span>
              <input
                v-model="firstForm.operatorOrStation"
                type="text"
                class="form-input"
              />
            </label>
          </div>

          <div class="entry-card-footer">
            <span class="meta-hint">
              Current 1st M/C: <strong>{{ firstFormLine.firstMachineTotal.toLocaleString() }} pcs</strong>
            </span>
            <button type="submit" class="btn btn-first-submit">
              +{{ firstForm.qty }} to 1st Machine
            </button>
          </div>
        </form>

        <form class="entry-card entry-card-last" @submit.prevent="submitLastMachineForm">
          <div class="entry-card-head">
            <div>
              <span class="stage-tag tag-last">LAST MACHINE ENTRY FORM</span>
              <h3>Last Machine (Line Output &amp; QC Pass) Log</h3>
            </div>
            <button
              type="button"
              class="mini-focus-btn"
              @click="focusQrInput('LAST')"
            >
              Focus QR
            </button>
          </div>

          <div class="form-row-3">
            <label class="field-group">
              <span>Target Line</span>
              <select v-model="lastForm.lineId" class="form-select">
                <option v-for="l in allLineMetrics" :key="l.id" :value="l.id">
                  {{ l.lineName }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>Hour Slot</span>
              <select v-model.number="lastForm.hourIndex" class="form-select">
                <option
                  v-for="(h, idx) in lastFormLine.hourlyRows"
                  :key="h.hour"
                  :value="idx"
                >
                  {{ h.hour }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>Pieces (Qty)</span>
              <input
                v-model.number="lastForm.qty"
                type="number"
                min="1"
                class="form-input"
                @input="lastForm.qcPass = Math.min(Number(lastForm.qty) || 0, Number(lastForm.qcPass) || 0)"
              />
            </label>
          </div>

          <div class="form-row-3">
            <label class="field-group">
              <span>QR Code Payload</span>
              <input
                ref="lastQrInputRef"
                v-model="lastForm.qrCode"
                type="text"
                placeholder="Scan Last Machine QR..."
                class="form-input"
              />
            </label>

            <label class="field-group">
              <span>QC Pass (pcs)</span>
              <input
                v-model.number="lastForm.qcPass"
                type="number"
                min="0"
                :max="Math.max(0, Number(lastForm.qty) || 0)"
                class="form-input"
              />
            </label>

            <label class="field-group">
              <span>DHU % (Optional)</span>
              <input
                v-model.number="lastForm.dhu"
                type="number"
                min="0"
                max="100"
                step="0.1"
                class="form-input"
              />
            </label>
          </div>

          <div class="entry-card-footer">
            <span class="meta-hint">
              Last→QC Var on Entry:
              <strong>{{ Math.max(0, (Number(lastForm.qty) || 0) - (Number(lastForm.qcPass) || 0)) }} pcs</strong>
            </span>
            <button type="submit" class="btn btn-last-submit">
              +{{ lastForm.qty }} Output / +{{ lastForm.qcPass }} QC
            </button>
          </div>
        </form>
      </div>
    </section>

    <!-- Table Filter Bar -->
    <div v-if="isAllLines" class="toolbar">
      <div class="toolbar-info">
        <span class="toolbar-count">
          Showing <strong>{{ filteredLineSummaryRows.length }}</strong> of
          <strong>{{ scopedLineMetrics.length }}</strong> lines ({{ activeLinesCount }} active)
        </span>
      </div>

      <div class="filter-controls">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter unit, line, PO, style, item..."
          class="search-input"
        />
        <button
          class="filter-toggle"
          :class="{ active: onlyActiveLines }"
          @click="onlyActiveLines = !onlyActiveLines"
        >
          Active Only ({{ activeLinesCount }})
        </button>
        <button
          class="filter-toggle"
          :class="{ active: onlyGapAlerts }"
          @click="onlyGapAlerts = !onlyGapAlerts"
        >
          Gap Alerts ({{ alertLinesCount }})
        </button>
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
        <span class="kpi-hint">
          Elapsed: {{ elapsedTarget.toLocaleString() }} pcs
        </span>
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
        <span class="kpi-hint">
          Pass Rate: {{ overallQcPassRate }}%
        </span>
      </div>

      <div class="kpi-box kpi-qc-var">
        <span class="kpi-title">Last → QC Variance</span>
        <div class="kpi-metric" :class="totalLastToQcVariance > 0 ? 'tone-amber' : 'tone-green'">
          {{ totalLastToQcVariance.toLocaleString() }}
          <span class="kpi-denom">pcs</span>
        </div>
        <span class="kpi-hint">
          {{ overallQcVarianceRate }}% diff (Def/Rej/Hold)
        </span>
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
          Var: {{ netVariance >= 0 ? `+${netVariance.toLocaleString()}` : netVariance.toLocaleString() }} · Target {{ targetEfficiency }}%
        </span>
      </div>

      <div class="kpi-box">
        <span class="kpi-title">Avg. DHU</span>
        <div class="kpi-metric" :class="Number(avgDhu) > 2.5 ? 'tone-red' : 'tone-green'">
          {{ avgDhu }}%
        </div>
        <span class="kpi-hint">
          {{ totalOperators }} Ops · {{ totalHelpers }} Hlp
        </span>
      </div>
    </section>

    <!-- Lines Overview Table with Merged Unit Cells & Unit-Wise Subtotals -->
    <section v-if="isAllLines" class="card-table">
      <table class="data-table">
        <thead>
          <tr>
            <th class="sticky-unit-th">Unit</th>
            <th>Line</th>
            <th>PO No &amp; Style</th>
            <th>Item Name</th>
            <th>SMV</th>
            <th>Op / Helper</th>
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
              <td
                v-if="item.showMergedUnitCell"
                :rowspan="item.unitRowspan"
                class="merged-unit-cell"
              >
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
                <span class="eff-pill" :class="item.line.efficiency >= item.line.targetEfficiency ? 'eff-ok' : 'eff-warn'">
                  {{ item.line.efficiencyStr }}%
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button
                    type="button"
                    class="act-btn act-edit"
                    @click="openLinePopup(item.line.id)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="act-btn act-inspect"
                    @click="selectedLineId = item.line.id"
                  >
                    Inspect
                  </button>
                </div>
              </td>
            </tr>

            <tr v-else class="unit-subtotal-row">
              <td colspan="3">
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
              <td class="num-col">{{ item.subtotal.effectiveFirstMachine.toLocaleString() }}</td>
              <td>
                <div class="progress-meta">
                  <strong>{{ item.subtotal.lastMachineTotal.toLocaleString() }}</strong>
                  <span>/ {{ item.subtotal.dailyTarget.toLocaleString() }} ({{ item.subtotal.completionPct }}%)</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill progress-fill-sub" :style="{ width: `${item.subtotal.completionPct}%` }"></div>
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
                  {{ item.subtotal.machineGap.toLocaleString() }} pcs ({{ item.subtotal.gapMinutes.toLocaleString() }}m)
                </span>
              </td>
              <td>
                <span class="eff-pill" :class="item.subtotal.efficiency >= item.subtotal.targetEfficiency ? 'eff-ok' : 'eff-warn'">
                  {{ item.subtotal.efficiencyStr }}%
                </span>
              </td>
              <td>
                <button
                  type="button"
                  class="act-btn act-unit-filter"
                  @click="selectUnit(item.subtotal.unit)"
                >
                  Filter {{ item.subtotal.unit }}
                </button>
              </td>
            </tr>
          </template>

          <tr v-if="groupedTableDisplayRows.length === 0">
            <td colspan="13" class="empty-state">
              No lines match your current filter. Try clearing the search or turning off filters.
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Single Line Hourly Detail View -->
    <section v-else class="card-table">
      <div class="single-line-banner">
        <div class="banner-stat">
          <span class="banner-label">Unit:</span>
          <strong class="banner-val">{{ currentLineMetrics.unit }}</strong>
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
          <button
            type="button"
            class="act-btn act-edit"
            @click="openLinePopup(currentLine.id)"
          >
            Edit in Popup
          </button>
          <button
            type="button"
            class="act-btn"
            @click="addFirstMachinePieces(currentLine.id, 10)"
          >
            +10 1st M/C
          </button>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Hour Slot</th>
            <th>Hour Target</th>
            <th>Actual (Last M/C)</th>
            <th>QC Pass</th>
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
          <tr
            v-for="row in computedRows"
            :key="row.hour"
            :class="{ 'active-hour-row': row.status === 'active' }"
          >
            <td><strong>{{ row.hour }}</strong></td>
            <td class="num-col">{{ row.target }}</td>
            <td>
              <input
                v-model.number="currentLine.hourlyRows[row.index].actual"
                type="number"
                min="0"
                class="counter-input"
                @change="onHourlyActualChange(currentLine, row.index)"
              />
            </td>
            <td>
              <input
                v-model.number="currentLine.hourlyRows[row.index].qcPass"
                type="number"
                min="0"
                :max="row.actual"
                class="counter-input counter-input-qc"
                @change="onHourlyQcPassChange(currentLine, row.index)"
              />
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
                <button class="act-btn" @click="addPieces(currentLine.id, row.index, 5)">+5</button>
                <button class="act-btn" @click="addPieces(currentLine.id, row.index, 10)">+10</button>
                <button class="act-btn" @click="addPieces(currentLine.id, row.index, -5)">-5</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.board-shell {
  position: relative;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(180deg, #0f172a 0%, #111c33 100%);
  color: #f1f5f9;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: 0 20px 45px rgba(2, 6, 23, 0.45);
  width: 100%;
  box-sizing: border-box;
}

.top-selector-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.top-selector-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.toast-banner {
  position: sticky;
  top: 8px;
  z-index: 40;
  margin-left: auto;
  width: fit-content;
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
  z-index: 60;
  background: rgba(2, 6, 23, 0.76);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 560px;
  background: #131e35;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
  color: #f8fafc;
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

.modal-title {
  margin: 6px 0 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.modal-close-btn {
  background: #1e293b;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  width: 30px;
  height: 30px;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.modal-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
}

.board-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.header-left {
  flex: 1;
  min-width: 280px;
}

.header-clock-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.24), rgba(37, 99, 235, 0.24));
  border: 1px solid rgba(125, 211, 252, 0.6);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);
  min-width: 155px;
}

.header-clock-eyebrow {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #7dd3fc;
}

.header-clock-display {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.2;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}

.status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
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

/* Highlighted Live Clock Pill */
.clock-hero {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 13px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.28), rgba(59, 130, 246, 0.28));
  border: 1px solid rgba(125, 211, 252, 0.65);
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.32), inset 0 0 8px rgba(186, 230, 253, 0.15);
  color: #f0f9ff;
  white-space: nowrap;
}

.clock-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
}

.clock-label {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #7dd3fc;
}

.clock-time {
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
}

.chip {
  background: rgba(30, 41, 59, 0.9);
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.14);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.74rem;
  font-weight: 500;
  white-space: nowrap;
}

.chip-unit {
  background: rgba(99, 102, 241, 0.18);
  color: #c7d2fe;
  border-color: rgba(99, 102, 241, 0.35);
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

.chip-accent {
  background: rgba(251, 191, 36, 0.14);
  color: #fde68a;
  border-color: rgba(251, 191, 36, 0.28);
  font-weight: 600;
}

.board-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: #f8fafc;
}

.board-subtitle {
  margin: 4px 0 0;
  font-size: 0.84rem;
  color: #94a3b8;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.btn {
  border-radius: 10px;
  padding: 7px 13px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
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

/* QR Forms Section */
.qr-section {
  margin-top: 14px;
  background: rgba(20, 31, 52, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  padding: 14px 16px;
}

.qr-top-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.qr-scanner-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 280px;
}

.qr-badge {
  background: rgba(56, 189, 248, 0.18);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.35);
  padding: 4px 9px;
  border-radius: 7px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.qr-scan-input {
  flex: 1;
  min-width: 220px;
  background: #09101d;
  color: #f8fafc;
  border: 1px solid rgba(96, 165, 250, 0.35);
  border-radius: 8px;
  padding: 7px 11px;
  font-size: 0.82rem;
}

.qr-presets {
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

.qr-status-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.qr-status-text {
  font-size: 0.78rem;
  color: #cbd5e1;
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

.qr-forms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
  margin-top: 12px;
}

.entry-card {
  background: rgba(15, 23, 42, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  padding: 13px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.entry-card-first {
  border-top: 3px solid #38bdf8;
}

.entry-card-last {
  border-top: 3px solid #4ade80;
}

.entry-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.entry-card-head h3 {
  margin: 4px 0 0;
  font-size: 0.96rem;
  font-weight: 700;
  color: #f8fafc;
}

.stage-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.tag-first {
  background: rgba(56, 189, 248, 0.16);
  color: #7dd3fc;
}

.tag-last {
  background: rgba(74, 222, 128, 0.16);
  color: #86efac;
}

.mini-focus-btn {
  background: #1e293b;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.form-row-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.form-row-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
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
  padding: 6px 8px;
  font-size: 0.82rem;
  box-sizing: border-box;
}

.entry-card-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}

.meta-hint {
  font-size: 0.76rem;
  color: #94a3b8;
}

.btn-first-submit {
  background: #0284c7;
  color: #fff;
  border: 1px solid #38bdf8;
  padding: 7px 13px;
  font-size: 0.78rem;
}

.btn-first-submit:hover {
  background: #0369a1;
}

.btn-last-submit {
  background: #16a34a;
  color: #fff;
  border: 1px solid #4ade80;
  padding: 7px 13px;
  font-size: 0.78rem;
}

.btn-last-submit:hover {
  background: #15803d;
}

/* Toolbar & KPIs */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 14px 0;
}

.toolbar-count {
  font-size: 0.8rem;
  color: #94a3b8;
}

.toolbar-count strong {
  color: #e2e8f0;
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
  font-size: 0.82rem;
  font-weight: 600;
  min-width: 155px;
}

.line-select {
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 9px;
  padding: 7px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  min-width: 230px;
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.search-input {
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 9px;
  padding: 7px 12px;
  font-size: 0.82rem;
  min-width: 240px;
}

.search-input::placeholder {
  color: #64748b;
}

.filter-toggle {
  background: #172238;
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 9px;
  padding: 7px 12px;
  font-size: 0.82rem;
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
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

@media (max-width: 1360px) {
  .kpi-row {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 780px) {
  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.kpi-box {
  background: rgba(23, 34, 56, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  padding: 12px 14px;
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

.kpi-highlight {
  border-color: rgba(251, 191, 36, 0.34);
  background: linear-gradient(160deg, rgba(30, 41, 59, 0.95) 0%, rgba(41, 36, 20, 0.55) 100%);
}

.kpi-title {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
  font-weight: 700;
}

.kpi-metric {
  font-size: 1.45rem;
  font-weight: 700;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.kpi-denom {
  font-size: 0.8rem;
  font-weight: 500;
  color: #94a3b8;
}

.kpi-hint {
  font-size: 0.72rem;
  color: #94a3b8;
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

.qc-pass-val {
  font-weight: 700;
  color: #4ade80;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.card-table {
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  overflow-x: auto;
}

.single-line-banner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.72);
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.banner-stat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.banner-label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.banner-val {
  font-size: 0.9rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.data-table th {
  position: sticky;
  top: 0;
  z-index: 5;
  background: rgba(30, 41, 59, 0.98);
  color: #cbd5e1;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px 11px;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.data-table td {
  padding: 9px 11px;
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

/* Horizontal Zero-Margin / Zero-Padding Merged Unit Cell */
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
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.18) 0%, rgba(30, 41, 59, 0.92) 45%, rgba(23, 34, 56, 0.95) 100%);
  border-top: 1px solid rgba(96, 165, 250, 0.32);
  border-bottom: 2px solid rgba(148, 163, 184, 0.24);
}

.unit-subtotal-row:hover {
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.24) 0%, rgba(30, 41, 59, 0.96) 45%, rgba(23, 34, 56, 0.98) 100%);
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