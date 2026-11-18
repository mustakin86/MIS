<template>
    <div class="manager-container">
        <!-- Data Table View -->
        <div class="table-section">
            <div class="table-header-row no-print">
                <h4>Machine List (Total: {{ tableData.length }})</h4>
                <div class="header-actions">
                    <button @click="openAddModal" class="btn-primary">＋ Add New Machine</button>
                    <button @click="printTable" class="btn-print">🖨️ Print</button>
                </div>
            </div>

            <div v-if="fetching" class="loading no-print">Loading machine inventory...</div>

            <!-- Main Screen Table with Sticky Header & Pagination Support -->
            <div v-else-if="tableData.length > 0" class="excel-table-wrapper no-print">
                <table class="screen-only-table">
                    <thead>
                        <tr>
                            <th class="excel-cell row-num">#</th>
                            <th v-for="header in sheetsConfig[currentSheetKey].headers" :key="header"
                                class="excel-cell">
                                {{ header }}
                            </th>
                            <th class="excel-cell">QR View</th>
                            <th class="excel-cell">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, index) in paginatedTableData" :key="row.rowIndex">
                            <td class="excel-cell row-num">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                            <td v-for="header in sheetsConfig[currentSheetKey].headers" :key="header"
                                class="excel-cell">
                                {{ row[header] }}
                            </td>

                            <td class="excel-cell">
                                <div class="table-qr-cell">
                                    <qrcode-vue
                                        :value="`${row.Factory_Name || 'ACL'} ${row.Machine_ID}`"
                                        :size="80" level="H" />
                                    <span class="qr-code-label">{{ `${row.Factory_Name || 'ACL'} ${row.Machine_ID}` }}</span>
                                </div>
                            </td>

                            <td class="excel-cell">
                                <button @click="updateRecord(row)" class="btn-info">Edit</button>
                                <button @click="deleteRecord(row.rowIndex)" class="btn-danger">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else class="no-data no-print">No machine records found.</p>

            <!-- MS Access Style Pagination Controls Bar -->
            <div v-if="tableData.length > pageSize" class="pagination-bar no-print">
                <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1" class="btn-page"><</button>
                <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
                <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages" class="btn-page">></button>
            </div>
        </div>

        <!-- Feedback Alerts -->
        <p v-if="errorMsg" class="error no-print">⚠️ {{ errorMsg }}</p>
        <p v-if="successMsg" class="success no-print">✔ {{ successMsg }}</p>
    </div>

    <!-- Popup Modal Form for Adding/Editing Machine (Centered) -->
    <div v-if="isModalOpen" class="modal-overlay no-print" @click.self="closeAddModal">
        <div class="modal-card">
            <div class="modal-header">
                <h3>{{ isEditing ? 'Edit Machine Record' : 'Add New Machine' }}</h3>
                <button @click="closeAddModal" class="btn-close">×</button>
            </div>

            <form @submit.prevent="handleSubmit" class="modal-form">
                <div class="modal-form-grid">
                    <!-- Column 1 -->
                    <div class="col-modal">
                        <div class="input-group">
                            <label>Factory Name:</label>
                            <input v-model="formData.Factory_Name" type="text" placeholder="e.g. ACL" required />
                        </div>
                        <div class="input-group">
                            <label>Machine ID:</label>
                            <input v-model="formData.Machine_ID" type="text" placeholder="Auto-generated" readonly
                                required class="readonly-input" />
                        </div>
                        <div class="input-group">
                            <label>Serial Number:</label>
                            <input v-model="formData.Serial_No" type="text" placeholder="e.g. 89451203A" required />
                        </div>
                        <div class="machine-type-card">
                            <div class="spec-table-wrapper">
                                <table class="spec-table">
                                    <thead>
                                        <tr>
                                            <th>No of Needle</th>
                                            <th>No of Thread</th>
                                            <th>Machine Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <input v-model="formData.No_Of_Needle" type="text" placeholder="e.g. 1"
                                                    class="spec-input" />
                                            </td>
                                            <td>
                                                <input v-model="formData.No_Of_Thread" type="text" placeholder="e.g. 2"
                                                    class="spec-input" />
                                            </td>
                                            <td>
                                                <input v-model="formData.Machine_Type" type="text"
                                                    placeholder="e.g. Lockstitch" class="spec-input" />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Column 2 -->
                    <div class="col-modal">
                        <div class="input-group">
                            <label>Brand:</label>
                            <input v-model="formData.Brand" type="text" placeholder="e.g. Juki, Brother, Jack"
                                required />
                        </div>
                        <div class="input-group">
                            <label>Model:</label>
                            <input v-model="formData.Model" type="text" placeholder="e.g. DDL-8700" required />
                        </div>
                        <div class="input-group">
                            <label>Special Feature:</label>
                            <input v-model="formData.Special_Feature" type="text"
                                placeholder="e.g. Auto Trimmer / Piping Folder" />
                        </div>
                        <div class="input-group">
                            <label>Running Status:</label>
                            <select v-model="formData.Status" required>
                                <option value="Running">Running</option>
                                <option value="Idle">Idle (Available)</option>
                                <option value="Repair">Under Maintenance</option>
                            </select>
                        </div>
                    </div>

                    <!-- Column 3: QR Code Preview -->
                    <div class="col-modal preview-col">
                        <div class="preview-column">
                            <label class="preview-label">QR Preview</label>
                            <div class="qr-preview-box">
                                <qrcode-vue :value="generatedQRValue" :size="110" level="H" />
                                <span class="preview-text">{{ generatedQRValue || 'Scan Target' }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="button-row">
                    <button type="button" @click="closeAddModal" class="btn-secondary">Cancel</button>
                    <button type="submit" :disabled="loading" class="btn-primary">
                        {{ loading ? 'Saving...' : (isEditing ? 'Update Machine' : 'Save Machine') }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Dedicated Print-Only Grid Container -->
    <div v-if="tableData.length > 0" class="print-only-grid">
        <div v-for="row in tableData" :key="row.rowIndex" class="print-qr-card">
            <qrcode-vue :value="`${row.Factory_Name || 'ACL'} ${row.Machine_ID}`" :size="120"
                level="H" />
            <span class="print-qr-text">{{ `${row.Factory_Name || 'ACL'} ${row.Machine_ID}` }}</span>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { dbAPI } from '@/services/machine_inventory_api.js'

const sheetsConfig = {
    Machine_List: {
        label: "Machine List",
        name: "Machine_List",
        headers: ['Factory_Name', 'Machine_ID', 'Brand', 'Serial_No', 'Model', 'Machine_Type', 'Special_Feature', 'Status']
    },
}

const currentSheetKey = ref('Machine_List')
const tableData = ref([])
const loading = ref(false)
const fetching = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const isModalOpen = ref(false)
const isEditing = ref(false)
const editingRowIndex = ref(null)

// Pagination state
const currentPage = ref(1)
const pageSize = ref(20)

const totalPages = computed(() => {
    return Math.ceil(tableData.value.length / pageSize.value) || 1
})

const paginatedTableData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return tableData.value.slice(start, end)
})

const changePage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
    }
}

const formData = reactive({
    Factory_Name: 'ACL',
    Machine_ID: '',
    Serial_No: '',
    No_Of_Needle: '',
    No_Of_Thread: '',
    Machine_Type: '',
    Model: '',
    Brand: '',
    Special_Feature: '',
    Status: 'Running'
})

const generatedQRValue = computed(() => {
    const factory = String(formData.Factory_Name || 'ACL').trim()
    const mchId = String(formData.Machine_ID || '').trim()
    if (factory && mchId) {
        return `${factory} ${mchId}`
    }
    return mchId || 'MCH-PREVIEW'
})

const fetchNextId = async () => {
    try {
        const idRes = await dbAPI.getNextMachineId(currentSheetKey.value)
        formData.Machine_ID = idRes.nextMachineId || 'MCH-10001'
    } catch (err) {
        console.error("Error fetching next machine ID:", err)
    }
}

const combinedMachineType = computed(() => {
    const needle = formData.No_Of_Needle ? `${formData.No_Of_Needle}N` : ''
    const thread = formData.No_Of_Thread ? `${formData.No_Of_Thread}T` : ''
    const type = formData.Machine_Type ? formData.Machine_Type : ''

    return [needle, thread, type].filter(Boolean).join('/')
})

const openAddModal = async () => {
    isEditing.value = false
    editingRowIndex.value = null
    formData.Factory_Name = 'ACL'
    formData.Serial_No = ''
    formData.No_Of_Needle = ''
    formData.No_Of_Thread = ''
    formData.Machine_Type = ''
    formData.Model = ''
    formData.Brand = ''
    formData.Special_Feature = ''
    formData.Status = 'Running'

    isModalOpen.value = true
    errorMsg.value = ''
    successMsg.value = ''
    await fetchNextId()
}

const updateRecord = (row) => {
    isEditing.value = true
    editingRowIndex.value = row.rowIndex

    formData.Factory_Name = row.Factory_Name || 'ACL'
    formData.Machine_ID = row.Machine_ID || ''
    formData.Serial_No = row.Serial_No || ''
    formData.Brand = row.Brand || ''
    formData.Model = row.Model || ''
    formData.Special_Feature = row.Special_Feature || ''
    formData.Status = row.Status || 'Running'

    const parts = (row.Machine_Type || '').split('/')
    if (parts.length >= 3) {
        formData.No_Of_Needle = parts[0].replace(/[^0-9]/g, '')
        formData.No_Of_Thread = parts[1].replace(/[^0-9]/g, '')
        formData.Machine_Type = parts.slice(2).join('/').trim()
    } else {
        formData.No_Of_Needle = ''
        formData.No_Of_Thread = ''
        formData.Machine_Type = row.Machine_Type || ''
    }

    isModalOpen.value = true
    errorMsg.value = ''
    successMsg.value = ''
}

const closeAddModal = () => {
    isModalOpen.value = false
    isEditing.value = false
    editingRowIndex.value = null
}

const fetchData = async () => {
    fetching.value = true
    errorMsg.value = ''
    try {
        const data = await dbAPI.getRecords(currentSheetKey.value)
        tableData.value = data
    } catch (err) {
        errorMsg.value = "Network error while loading machines."
        console.error(err)
    } finally {
        fetching.value = false
    }
}

const handleSubmit = async () => {
    loading.value = true
    errorMsg.value = ''
    successMsg.value = ''

    const currentFactory = String(formData.Factory_Name || 'ACL').trim()
    const currentMachineId = String(formData.Machine_ID || '').trim()
    const computedBQ = `${currentFactory} ${currentMachineId}`

    const payloadToSend = {
        Factory_Name: currentFactory,
        Machine_ID: currentMachineId,
        Serial_No: String(formData.Serial_No || '').trim(),
        BQ_Code: computedBQ,
        Machine_Type: String(combinedMachineType.value || '').trim(),
        Model: String(formData.Model || '').trim(),
        Brand: String(formData.Brand || '').trim(),
        Special_Feature: String(formData.Special_Feature || '').trim(),
        Status: String(formData.Status || 'Running')
    }

    try {
        if (isEditing.value && editingRowIndex.value !== null) {
            payloadToSend.rowIndex = editingRowIndex.value
            await dbAPI.saveRecord(currentSheetKey.value, payloadToSend)
            successMsg.value = "Machine updated successfully!"
        } else {
            await dbAPI.saveRecord(currentSheetKey.value, payloadToSend)
            successMsg.value = "Machine registered successfully!"
        }

        closeAddModal()
        await fetchData()
    } catch (err) {
        errorMsg.value = "Network error during machine saving."
        console.error(err)
    } finally {
        loading.value = false
    }
}

const deleteRecord = async (rowIndex) => {
    if (!confirm("Are you sure you want to delete this machine record?")) return
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
    text-transform: uppercase;
}

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
    width: 60%;
    max-width: 850px;
    padding: 20px;
    border-radius: 6px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    box-sizing: border-box;
    max-height: 90vh;
    overflow-y: auto;
    margin: auto;
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

.modal-form-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    gap: 15px;
}

.col-modal {
    flex: 1 1 200px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.preview-col {
    align-items: center;
    justify-content: flex-start;
}

.preview-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.preview-label {
    font-size: 11px;
    font-weight: bold;
    color: #333;
    margin-bottom: 4px;
    text-align: center;
}

.qr-preview-box {
    background: white;
    border: 1px solid #d0d7de;
    border-radius: 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px;
    margin-top: 2px;
    width: 100%;
}

.preview-text {
    font-size: 10px;
    font-weight: bold;
    margin-top: 4px;
    word-break: break-all;
    text-align: center;
    color: #333;
}

.table-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.table-qr-cell {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2px;
}

.qr-code-label {
    font-size: 9px;
    font-weight: bold;
    color: #1a73e8;
    margin-top: 2px;
    white-space: nowrap;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 6px;
}

label {
    font-size: 11px;
    font-weight: bold;
    color: #333;
    text-align: left;
}

input,
select {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #c0c0c0;
    border-radius: 2px;
    font-size: 12px;
    background-color: white;
    height: 30px;
    box-sizing: border-box;
    text-transform: uppercase;
}

.readonly-input {
    background-color: #f1f3f4;
    cursor: not-allowed;
    color: #5f6368;
}

.button-row {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
    border-top: 1px solid #e0e0e0;
    padding-top: 12px;
}

.btn-primary {
    background-color: #1a73e8;
    color: white;
    padding: 6px 12px;
    font-size: 11px;
    height: 28px;
    border-radius: 4px;
    cursor: pointer;
    border: none;
    font-weight: bold;
    margin: 4px;
}

.btn-secondary {
    background-color: #f3f3f3;
    color: #333;
    padding: 6px 16px;
    font-size: 12px;
    height: 32px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid #c0c0c0;
    font-weight: bold;
}

.btn-secondary:hover {
    background-color: #e5e7eb;
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
    padding: 2px 6px;
    font-size: 10px;
    border-radius: 2px;
    cursor: pointer;
    border: none;
}

.btn-info {
    background-color: #e8a31a;
    color: white;
    padding: 2px 6px;
    font-size: 10px;
    border-radius: 2px;
    cursor: pointer;
    border: none;
    margin-right: 4px;
}

/* MS Access Table Sheet Styling */
.excel-table-wrapper {
    width: 100%;
    max-height: 65vh;
    overflow-y: auto;
    overflow-x: auto;
    border: 2px solid #808080;
    margin-top: 8px;
    background: #ffffff;
}

.screen-only-table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    background: #ffffff;
    min-width: 900px;
    font-family: Tahoma, Arial, sans-serif;
}

.excel-cell {
    border: 1px solid #d3d3d3;
    padding: 3px 5px;
    text-align: center; /* Centered cell text alignment */
    font-size: 11px;
    color: #000000;
    height: 20px;
    white-space: nowrap;
}

/* MS Access Gray Gradient Header with Sticky positioning */
th.excel-cell {
    background: linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%);
    color: #000000;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 5;
    border-bottom: 2px solid #a0a0a0;
    border-right: 1px solid #b5b5b5;
    text-align: center; /* Centered header text alignment */
    padding: 4px 6px;
}

/* MS Access Zebra Striping */
.screen-only-table tbody tr:nth-child(even) {
    background-color: #f7f9fb;
}

.screen-only-table tbody tr:hover {
    background-color: #eef4f8;
}

.row-num {
    background-color: #ececec;
    color: #444444;
    width: 30px;
    text-align: center;
    font-weight: normal;
    border-right: 2px solid #b5b5b5;
}

/* MS Access Style Pagination Bar */
.pagination-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    padding: 4px 8px;
    background: #ececec;
    border: 1px solid #a0a0a0;
    border-top: none;
    border-radius: 0;
    float: right;
}

.btn-page {
    background-color: #e1e1e1;
    border: 1px solid #adadad;
    color: #000;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: normal;
    border-radius: 2px;
    cursor: pointer;
}

.btn-page:hover:not(:disabled) {
    background-color: #e5f1fb;
    border-color: #0078d7;
}

.btn-page:disabled {
    opacity: 0.4;
    cursor: default;
}

.page-info {
    font-size: 11px;
    color: #333;
}

.error {
    color: #d93025;
    font-weight: bold;
    margin-top: 6px;
    font-size: 11px;
}

.success {
    color: #137333;
    font-weight: bold;
    margin-top: 6px;
    font-size: 11px;
}

.loading,
.no-data {
    color: #5f6368;
    font-style: italic;
    text-align: center;
    padding: 10px;
    font-size: 11px;
}

.print-only-grid {
    display: none;
}

.machine-type-card {
    background: #ffffff;
    border: 1px solid #c0c0c0;
    border-radius: 2px;
    padding: 6px;
    margin-bottom: 8px;
    box-sizing: border-box;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.spec-table-wrapper {
    width: 100%;
    overflow-x: auto;
    background: #ffffff;
    border: 1px solid #d4d4d4;
}

.spec-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    text-align: center;
}

.spec-table th {
    background-color: #f3f3f3;
    color: #1f1f1f;
    font-size: 10px;
    font-weight: bold;
    padding: 5px 4px;
    border-bottom: 2px solid #d4d4d4;
    border-right: 1px solid #d4d4d4;
}

.spec-table th:last-child {
    border-right: none;
}

.spec-table td {
    padding: 0;
    margin: 0;
    border-bottom: 1px solid #e0e0e0;
    border-right: 1px solid #e0e0e0;
    background-color: #ffffff;
}

.spec-table td:last-child {
    border-right: none;
}

.spec-input {
    width: 100%;
    padding: 5px 6px;
    border: 1px solid transparent;
    background-color: transparent;
    border-radius: 0;
    font-size: 11px;
    text-align: center;
    height: 28px;
    box-sizing: border-box;
    color: #000000;
    font-family: Arial, sans-serif;
    transition: none;
    text-transform: uppercase;
}

.spec-input:focus {
    background-color: #ffffff;
    border: 2px solid #107c41;
    outline: none;
    box-shadow: inset 0 0 0 1px #107c41;
}

.spec-input::placeholder {
    color: #a0a0a0;
    font-style: italic;
}
</style>

<style>
@media print {
    body * {
        visibility: hidden !important;
    }

    .print-only-grid,
    .print-only-grid * {
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
        font-size: 20px;
        font-weight: bold;
        margin-top: 2px;
        text-align: center;
        color: #000;
    }
}
</style>