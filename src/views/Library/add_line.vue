<template>
    <div class="manager-container">
        <!-- Data Table View -->
        <div class="table-section">
            <div class="table-header-row no-print">
                <h3>Line List</h3>
                <div class="header-actions">
                    <button @click="openAddModal" class="btn-primary">＋ Add Line</button>
                    <button @click="printTable" class="btn-print">🖨️ Print</button>
                </div>
            </div>
            
            <div v-if="fetching" class="loading no-print">Loading line numbers...</div>

            <!-- Main Screen Table -->
            <div v-else-if="tableData.length > 0" class="excel-table-wrapper no-print">
                <table class="screen-only-table">
                    <thead>
                        <tr>
                            <th class="excel-cell row-num">#</th>
                            <th v-for="header in sheetsConfig[currentSheetKey].headers" :key="header" class="excel-cell">
                                {{ header }}
                            </th>
                            <th class="excel-cell">QR View</th>
                            <th class="excel-cell">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, index) in tableData" :key="row.rowIndex">
                            <td class="excel-cell row-num">{{ index + 1 }}</td>
                            <td v-for="header in sheetsConfig[currentSheetKey].headers" :key="header" class="excel-cell">
                                {{ row[header] }}
                            </td>

                            <td class="excel-cell">
                                <div class="table-qr-cell">
                                    <qrcode-vue :value="row.Line_No || ''" :size="80" level="H" />
                                    <span class="qr-code-label">{{ row.Line_No || '' }}</span>
                                </div>
                            </td>

                            <td class="excel-cell">
                                <button @click="deleteRecord(row.rowIndex)" class="btn-danger">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else class="no-data no-print">No line records found.</p>
        </div>

        <!-- Feedback Alerts -->
        <p v-if="errorMsg" class="error no-print">⚠️ {{ errorMsg }}</p>
        <p v-if="successMsg" class="success no-print">✔ {{ successMsg }}</p>
    </div>

    <!-- Popup Modal for Adding Lines -->
    <div v-if="isModalOpen" class="modal-overlay no-print" @click.self="closeAddModal">
        <div class="modal-card">
            <div class="modal-header">
                <h3>Add New Unit Lines</h3>
                <button @click="closeAddModal" class="btn-close">×</button>
            </div>

            <form @submit.prevent="createRecords" class="modal-form">
                <!-- Fixed Unit Field -->
                <div class="excel-grid-wrapper">
                    <table class="excel-sheet-table">
                        <tbody>
                            <tr>
                                <td class="excel-td row-num-td" style="width: 80px;">Unit :-</td>
                                <td class="excel-td">
                                    <input v-model="formData.Unit" type="text" placeholder="e.g. 1 (saves as Unit-1)" required class="excel-cell-input" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Lines Dynamic Table -->
                <div class="excel-grid-wrapper">
                    <table class="excel-sheet-table">  
                        <tbody>
                            <tr>
                                <th class="excel-th row-num-th">#</th>
                                <th class="excel-th">Line No</th>
                                <th class="excel-th action-th">Actions</th>
                            </tr>
                            <tr v-for="(line, index) in formData.lines" :key="index" class="excel-tr">
                                <td class="excel-td row-num-td">{{ index + 1 }}</td>
                                <td class="excel-td">
                                    <input v-model="line.Line_No" type="text" placeholder="Enter Line No (e.g. 1)" @input="checkAutoAddRow(index)" required class="excel-cell-input" />
                                </td>
                                <td class="excel-td action-td">
                                    <button type="button" @click="removeLineRow(index)" class="excel-btn-delete" title="Remove row">−</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="modal-button-row">
                    <button type="button" @click="addLineRow" class="btn-secondary">
                        <span>＋</span> Insert Row
                    </button>
                    <button type="submit" :disabled="loading" class="btn-primary">
                        {{ loading ? 'Saving...' : 'Save All Records' }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Dedicated Print-Only Grid Container -->
    <div v-if="tableData.length > 0" class="print-only-grid">
        <div v-for="row in tableData" :key="row.rowIndex" class="print-qr-card">
            <qrcode-vue :value="row.Line_No || ''" :size="150" level="H" />
            <span class="print-qr-text">{{ row.Line_No || '' }}</span>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { dbAPI } from '@/services/unit_line_api.js'

const sheetsConfig = {
    Unit_line_No: {
        label: "Unit Line Numbers",
        name: "Unit_line_No",
        headers: [ 'Unit', 'Line_No' ]
    }
}

const currentSheetKey = ref('Unit_line_No')
const tableData = ref([])
const loading = ref(false)
const fetching = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const isModalOpen = ref(false)

const formData = reactive({
    Unit: '',
    Status: 'Running',
    lines: [{ Line_No: '' }]
})

const openAddModal = () => {
    isModalOpen.value = true
    errorMsg.value = ''
    successMsg.value = ''
}

const closeAddModal = () => {
    isModalOpen.value = false
    formData.Unit = ''
    formData.lines = [{ Line_No: '' }]
}

const checkAutoAddRow = (index) => {
    if (index === formData.lines.length - 1 && formData.lines[index].Line_No.trim() !== '') {
        formData.lines.push({ Line_No: '' })
    }
}

const addLineRow = () => {
    formData.lines.push({ Line_No: '' })
}

const removeLineRow = (index) => {
    if (formData.lines.length > 1) {
        formData.lines.splice(index, 1)
    }
}

const fetchData = async () => {
    fetching.value = true
    errorMsg.value = ''
    try {
        const data = await dbAPI.getRecords(currentSheetKey.value)
        tableData.value = data
    } catch (err) {
        errorMsg.value = "Network error while loading records."
        console.error(err)
    } finally {
        fetching.value = false
    }
}

const createRecords = async () => {
    loading.value = true
    errorMsg.value = ''
    successMsg.value = ''

    const validLines = formData.lines.filter(l => l.Line_No.trim() !== '')
    if (validLines.length === 0) {
        errorMsg.value = "Please enter at least one line number."
        loading.value = false
        return
    }

    try {
        for (const line of validLines) {
            const rawUnit = formData.Unit.trim()
            const cleanUnitVal = rawUnit.replace(/^unit\s*[-:]?\s*/i, '')
            const formattedUnit = `Unit-${cleanUnitVal}`

            const rawLineNo = line.Line_No.trim()
            const cleanLineVal = rawLineNo.replace(/^line\s*[-:]?\s*/i, '')
            const formattedLineNo = `Line-${cleanLineVal}`

            const payloadToSend = {
                Unit: formattedUnit,
                Line_No: formattedLineNo,
                Status: formData.Status
            }
            await dbAPI.createRecord(currentSheetKey.value, payloadToSend)
        }

        successMsg.value = "Line records registered successfully!"
        closeAddModal()
        await fetchData()
    } catch (err) {
        errorMsg.value = "Network error during line registration."
        console.error(err)
    } finally {
        loading.value = false
    }
}

const deleteRecord = async (rowIndex) => {
    if (!confirm("Are you sure you want to delete this line record?")) return
    errorMsg.value = ''
    successMsg.value = ''

    try {
        await dbAPI.deleteRecord(currentSheetKey.value, rowIndex)
        successMsg.value = "Row deleted successfully!"
        await fetchData()
    } catch (err) {
        errorMsg.value = "Network error during deletion."
        console.error(err)
    }
}

const printTable = () => {
    window.print()
}

onMounted(async () => {
    await fetchData()
})
</script>

<style scoped>
.manager-container {
    width: 100%;
    max-width: 1400px;
    margin: 10px auto;
    font-family: Arial, sans-serif;
    padding: 12px;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    background: #ffffff;
    box-sizing: border-box;
}

.table-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.header-actions {
    display: flex;
    gap: 8px;
}

.table-qr-cell {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 4px;
}

.qr-code-label {
    font-size: 9px;
    font-weight: bold;
    color: #1a73e8;
    margin-top: 2px;
    white-space: nowrap;
}

.btn-primary {
    background-color: #1a73e8;
    color: white;
    padding: 6px 16px;
    font-size: 12px;
    height: 32px;
    border-radius: 4px;
    cursor: pointer;
    border: none;
    font-weight: bold;
}

.btn-print {
    background-color: #34a853;
    color: white;
    padding: 5px 12px;
    font-size: 11px;
    border-radius: 4px;
    cursor: pointer;
    border: none;
    font-weight: bold;
}

.btn-danger {
    background-color: #d93025;
    color: white;
    padding: 3px 8px;
    font-size: 10px;
    border-radius: 2px;
    cursor: pointer;
    border: none;
}

.excel-table-wrapper {
    width: 100%;
    overflow-x: auto;
    border: 1px solid #d0d7de;
    margin-top: 8px;
}

.screen-only-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: white;
    min-width: 900px;
}

.excel-cell {
    border-bottom: 1px solid #e0e0e0;
    border-right: 1px solid #e0e0e0;
    padding: 6px 8px;
    text-align: center;
    font-size: 11px;
    color: #202124;
}

th.excel-cell {
    background-color: #f1f3f4;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 5;
}

.row-num {
    background-color: #f8f9fa;
    color: #5f6368;
    width: 35px;
    font-weight: bold;
}

/* Modal Popup Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-card {
    background: #ffffff;
    width: 100%;
    max-width: 550px;
    padding: 20px;
    border-radius: 6px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 8px;
}

.modal-header h3 {
    margin: 0;
    font-size: 16px;
    color: #202124;
}

.btn-close {
    background: transparent;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #5f6368;
}

.excel-grid-wrapper {
    border: 1px solid #bcbcbc;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 12px;
    background: white;
}

.excel-sheet-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

.excel-th {
    background-color: #f3f3f3;
    color: #333333;
    font-weight: bold;
    padding: 6px 8px;
    text-align: left;
    border-right: 1px solid #d4d4d4;
    border-bottom: 2px solid #bcbcbc;
}

.row-num-th {
    width: 40px;
    text-align: center;
}

.excel-tr {
    background-color: #ffffff;
}

.excel-td {
    padding: 2px 4px;
    border: 1px solid #e0e0e0;
}

.row-num-td {
    background-color: #f3f3f3;
    color: #595959;
    text-align: center;
    font-weight: bold;
    font-size: 11px;
    border-right: 1px solid #d4d4d4;
}

.excel-cell-input {
    width: 100%;
    border: none;
    background: transparent;
    padding: 6px 8px;
    font-size: 12px;
    color: #000000;
    height: 28px;
    box-sizing: border-box;
}

.excel-cell-input:focus {
    outline: 2px solid #1a73e8;
    background-color: #ffffff;
}

.action-th, .action-td {
    width: 60px;
    text-align: center;
}

.modal-button-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
}

.btn-secondary {
    background-color: #f3f3f3;
    color: #1f2937;
    border: 1px solid #a3a3a3;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: bold;
    border-radius: 2px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
}

.btn-secondary:hover {
    background-color: #e5e7eb;
}

.excel-btn-delete {
    background-color: transparent;
    color: #d93025;
    border: none;
    width: 24px;
    height: 24px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 2px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.excel-btn-delete:hover {
    background-color: #fee2e2;
}

.error { color: #d93025; font-weight: bold; margin-top: 6px; font-size: 11px; }
.success { color: #137333; font-weight: bold; margin-top: 6px; font-size: 11px; }
.loading, .no-data { color: #5f6368; font-style: italic; text-align: center; padding: 10px; font-size: 11px; }

/* Hidden during normal screen viewing */
.print-only-grid {
    display: none;
}
</style>

<!-- Global un-scoped CSS print rule -->
<style>
@media print {
    body * {
        visibility: hidden !important;
    }
    .print-only-grid, .print-only-grid * {
        visibility: visible !important;
    }
    .print-only-grid {
        display: flex !important;
        flex-wrap: wrap;
        gap: 15px;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 2px;
        background: white;
    }
    .print-qr-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 2px dashed #999;
        padding: 2px;
        width: 230px;
        height: 230px;
        page-break-inside: avoid;
    }
    .print-qr-text {
        font-size: 30px;
        font-weight: bold;
        margin-top: 2px;
        text-align: center;
        color: #000;
    }
}
</style>