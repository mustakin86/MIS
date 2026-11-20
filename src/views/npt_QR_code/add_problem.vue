<template>
    <div class="manager-container access-theme">
        <!-- Data Table View -->
        <div class="table-section">
            <div class="table-header-row access-toolbar no-print">
                <div class="access-title-group">
                    <span class="access-table-icon" aria-hidden="true">⊞</span>
                    <h3>Problem Categories &amp; Responsible Departments</h3>
                </div>
                <div class="header-actions">
                    <button type="button" @click="openAddModal" class="btn-access-primary">
                        ＋ Add Problem
                    </button>
                </div>
            </div>

            <div v-if="fetching && tableData.length === 0" class="loading no-print">
                Loading problem records...
            </div>

            <!-- Main Screen Datasheet Table -->
            <div v-else-if="tableData.length > 0" class="access-table-wrapper no-print">
                <table class="access-datasheet-table">
                    <thead>
                        <tr>
                            <th class="access-cell access-selector-th" title="Record Selector"></th>
                            <th class="access-cell row-num">#</th>
                            <th v-for="header in sheetsConfig[currentSheetKey].headers" :key="header"
                                class="access-cell access-col-header">
                                {{ formatHeader(header) }}
                            </th>
                            <th class="access-cell action-col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, index) in tableData" :key="row.ID ?? row.rowIndex ?? index"
                            :class="['access-row', { 'is-selected': selectedRowIndex === index }]"
                            @click="selectRow(index)">
                            <td class="access-cell access-selector-td">
                                <span v-if="selectedRowIndex === index" class="selector-arrow">▶</span>
                            </td>
                            <td class="access-cell row-num">{{ index + 1 }}</td>
                            <td v-for="header in sheetsConfig[currentSheetKey].headers" :key="header"
                                class="access-cell access-data-cell">
                                {{ row[header] ?? '' }}
                            </td>
                            <td class="access-cell action-col" @click.stop>
                                <button type="button" @click="deleteRecord(row)"
                                    :disabled="row.rowIndex == null || deletingRowIndex === row.rowIndex"
                                    class="btn-access-delete">
                                    {{ deletingRowIndex === row.rowIndex ? '…' : 'X' }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else class="no-data no-print">No problem records found.</p>

            <!-- Classic MS Access Bottom Record Navigation Bar -->
            <div v-if="!(fetching && tableData.length === 0)" class="access-nav-bar no-print">
                <div class="access-nav-controls">
                    <button type="button" class="nav-btn" :disabled="tableData.length === 0 || selectedRowIndex <= 0"
                        @click="selectRow(0)" title="First Record">
                        |◀
                    </button>
                    <button type="button" class="nav-btn" :disabled="tableData.length === 0 || selectedRowIndex <= 0"
                        @click="selectRow(selectedRowIndex - 1)" title="Previous Record">
                        ◀
                    </button>
                    <span class="nav-label">
                        Record:
                        <strong>
                            {{ tableData.length > 0 && selectedRowIndex >= 0 ? selectedRowIndex + 1 : 0 }}
                        </strong>
                        of {{ tableData.length }}
                    </span>
                    <button type="button" class="nav-btn"
                        :disabled="tableData.length === 0 || selectedRowIndex >= tableData.length - 1"
                        @click="selectRow(selectedRowIndex + 1)" title="Next Record">
                        ▶
                    </button>
                    <button type="button" class="nav-btn"
                        :disabled="tableData.length === 0 || selectedRowIndex >= tableData.length - 1"
                        @click="selectRow(tableData.length - 1)" title="Last Record">
                        ▶|
                    </button>
                    <button type="button" class="nav-btn nav-new-btn" @click="openAddModal" title="New (Blank) Record">
                        ▶* <span class="nav-new-text">(New)</span>
                    </button>
                </div>
                <div class="access-status-text">
                    {{ syncing ? 'Syncing...' : 'Datasheet View' }}
                </div>
            </div>
        </div>

        <!-- Feedback Alerts -->
        <p v-if="errorMsg" class="error no-print">⚠️ {{ errorMsg }}</p>
        <p v-if="successMsg" class="success no-print">✔ {{ successMsg }}</p>
    </div>

    <!-- Popup Modal for Adding Problems -->
    <Teleport to="body">
        <div v-if="isModalOpen" class="modal-overlay no-print" @click.self="closeAddModal">
            <div class="modal-card access-modal" role="dialog" aria-modal="true"
                aria-labelledby="add-problem-modal-title">
                <div class="modal-header access-modal-header">
                    <div class="access-title-group">
                        <span class="access-table-icon" aria-hidden="true">⊞</span>
                        <h3 id="add-problem-modal-title">Add New Problem Categories</h3>
                    </div>
                    <button type="button" @click="closeAddModal" class="btn-close" aria-label="Close modal">×</button>
                </div>

                <form @submit.prevent="createRecords" class="modal-form">
                    <!-- Responsible Department & Phone Number Fields -->
                    <div class="access-grid-wrapper">
                        <table class="access-sheet-table">
                            <tbody>
                                <tr>
                                    <td class="access-td access-field-label" style="width: 145px;">Responsible Dept</td>
                                    <td class="access-td">
                                        <input v-model="formData.Responsible_Department" type="text"
                                            placeholder="e.g. Maintenance / IT / Quality" required
                                            class="access-cell-input" />
                                    </td>
                                </tr>
                                <tr>
                                    <td class="access-td access-field-label" style="width: 145px;">Phone Number</td>
                                    <td class="access-td">
                                        <input v-model="formData.Phone_Number" type="text"
                                            placeholder="e.g. 01711-000000" required class="access-cell-input" />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Problem Categories Dynamic Table -->
                    <div class="access-grid-wrapper">
                        <table class="access-sheet-table">
                            <thead>
                                <tr>
                                    <th class="access-th access-selector-th"></th>
                                    <th class="access-th row-num-th">#</th>
                                    <th class="access-th">Problem Category</th>
                                    <th class="access-th action-th">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in formData.problems" :key="index" class="access-tr">
                                    <td class="access-td access-selector-td"></td>
                                    <td class="access-td row-num-td">{{ index + 1 }}</td>
                                    <td class="access-td">
                                        <input v-model="item.Problem_Category" type="text"
                                            placeholder="Enter Problem Category (e.g. Hardware Failure)"
                                            @input="checkAutoAddRow(index)" class="access-cell-input" />
                                    </td>
                                    <td class="access-td action-th">
                                        <button type="button" @click="removeProblemRow(index)"
                                            :disabled="formData.problems.length <= 1" class="access-btn-delete"
                                            title="Remove row">
                                            −
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <p v-if="modalErrorMsg" class="error modal-error">⚠️ {{ modalErrorMsg }}</p>

                    <div class="modal-button-row">
                        <button type="button" @click="addProblemRow" class="btn-access-secondary">
                            <span>＋</span> Insert Row
                        </button>
                        <button type="submit" :disabled="loading" class="btn-access-primary">
                            {{ loading ? 'Saving...' : 'Save All Records' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { dbAPI } from '@/services/problem_category_api.js'

const sheetsConfig = {
    ProblemName: {
        label: 'Problem Categories',
        name: 'ProblemCategory',
        headers: ['Problem_Category', 'Responsible_Department', 'Phone_Number']
    }
}

const currentSheetKey = ref('ProblemName')
const tableData = ref([])
const selectedRowIndex = ref(0)
const loading = ref(false)
const fetching = ref(false)
const syncing = ref(false)
const deletingRowIndex = ref(null)
const errorMsg = ref('')
const modalErrorMsg = ref('')
const successMsg = ref('')
const isModalOpen = ref(false)

const formData = reactive({
    Phone_Number: '',
    Responsible_Department: '',
    problems: [{ Problem_Category: '' }]
})

const formatHeader = (header) => header.replace(/_/g, ' ')

const selectRow = (index) => {
    if (index >= 0 && index < tableData.value.length) {
        selectedRowIndex.value = index
    }
}

const resetForm = () => {
    formData.Phone_Number = ''
    formData.Responsible_Department = ''
    formData.problems = [{ Problem_Category: '' }]
    modalErrorMsg.value = ''
}

const openAddModal = () => {
    resetForm()
    errorMsg.value = ''
    successMsg.value = ''
    isModalOpen.value = true
}

const closeAddModal = () => {
    isModalOpen.value = false
    resetForm()
}

const checkAutoAddRow = (index) => {
    const lastIndex = formData.problems.length - 1
    if (index === lastIndex && formData.problems[lastIndex].Problem_Category.trim() !== '') {
        formData.problems.push({ Problem_Category: '' })
    }
}

const addProblemRow = () => {
    formData.problems.push({ Problem_Category: '' })
}

const removeProblemRow = (index) => {
    if (formData.problems.length > 1) {
        formData.problems.splice(index, 1)
    }
}

const fetchData = async ({ silent = false } = {}) => {
    if (silent) {
        syncing.value = true
    } else {
        fetching.value = true
    }
    errorMsg.value = ''

    try {
        const data = await dbAPI.getRecords(currentSheetKey.value)
        tableData.value = Array.isArray(data) ? data : []
        if (tableData.value.length === 0) {
            selectedRowIndex.value = -1
        } else if (selectedRowIndex.value >= tableData.value.length || selectedRowIndex.value < 0) {
            selectedRowIndex.value = 0
        }
    } catch (err) {
        errorMsg.value = 'Failed to load problem records from Google Sheets.'
        console.error(err)
    } finally {
        fetching.value = false
        syncing.value = false
    }
}

const createRecords = async () => {
    loading.value = true
    modalErrorMsg.value = ''
    errorMsg.value = ''
    successMsg.value = ''

    const dept = formData.Responsible_Department.trim()
    if (!dept) {
        modalErrorMsg.value = 'Please fill out the Responsible Department field.'
        loading.value = false
        return
    }

    const phone = formData.Phone_Number.trim()
    if (!phone) {
        modalErrorMsg.value = 'Please fill out the Phone Number field.'
        loading.value = false
        return
    }

    const validCategories = formData.problems
        .map((p) => p.Problem_Category?.trim())
        .filter(Boolean)

    if (validCategories.length === 0) {
        modalErrorMsg.value = 'Please enter at least one problem category.'
        loading.value = false
        return
    }

    try {
        for (const category of validCategories) {
            const payloadToSend = {
                Problem_Category: category,
                Responsible_Department: dept,
                Phone_Number: phone
            }
            await dbAPI.saveRecord(currentSheetKey.value, payloadToSend, 'create')
        }

        successMsg.value = `${validCategories.length} problem record(s) registered successfully!`
        closeAddModal()
        await fetchData({ silent: true })
    } catch (err) {
        modalErrorMsg.value = err.message || 'Network error during registration.'
        console.error(err)
    } finally {
        loading.value = false
    }
}

const deleteRecord = async (row) => {
    if (!row || row.rowIndex == null) {
        errorMsg.value = 'Cannot delete record: missing rowIndex.'
        return
    }
    if (!confirm(`Are you sure you want to delete "${row.Problem_Category || 'this record'}"?`)) return

    deletingRowIndex.value = row.rowIndex
    errorMsg.value = ''
    successMsg.value = ''

    try {
        await dbAPI.saveRecord(
            currentSheetKey.value,
            { rowIndex: row.rowIndex, ID: row.ID },
            'delete'
        )

        // Remove row immediately from reactive table so it doesn't flash or reload
        tableData.value = tableData.value.filter((item) => item.rowIndex !== row.rowIndex)
        if (tableData.value.length === 0) {
            selectedRowIndex.value = -1
        } else if (selectedRowIndex.value >= tableData.value.length) {
            selectedRowIndex.value = tableData.value.length - 1
        }

        successMsg.value = 'Row deleted successfully!'

        // Quietly re-sync rowIndex values from the sheet without hiding the table
        await fetchData({ silent: true })
    } catch (err) {
        errorMsg.value = err.message || 'Network error during deletion.'
        console.error(err)
    } finally {
        deletingRowIndex.value = null
    }
}

onMounted(async () => {
    await fetchData()
})
</script>

<style scoped>
.manager-container.access-theme {
    width: 40%;
    max-width: 890px;
    margin: 0;
    font-family: "Segoe UI", Tahoma, Arial, sans-serif;
    padding: 0;
    border: 1px solid #8c96a4;
    border-radius: 2px;
    background: #ffffff;
    box-sizing: border-box;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.access-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 8px;
    background: linear-gradient(to bottom, #f6f8fa 0%, #e5e9ef 100%);
    border-bottom: 1px solid #9aa5b4;
}

.access-title-group {
    display: flex;
    align-items: center;
    gap: 6px;
}

.access-table-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background-color: #a4373a;
    color: #ffffff;
    font-size: 11px;
    font-weight: bold;
    border-radius: 2px;
}

.access-toolbar h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
}

.header-actions {
    display: flex;
    gap: 6px;
    text-align: center;
}

.btn-access-primary {
    background: linear-gradient(to bottom, #0c36f2 0%, #0b0fde 100%);
    color: #ffffff;
    padding: 2px 10px;
    font-size: 11px;
    height: 22px;
    border-radius: 2px;
    cursor: pointer;
    border: 1px solid #090cb8;
    font-weight: 600;
}

.btn-access-primary:hover:not(:disabled) {
    background: linear-gradient(to bottom, #163ff5 0%, #0c36f2 100%);
}

.btn-access-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-access-secondary {
    background: linear-gradient(to bottom, #ffffff 0%, #e8ecf1 100%);
    color: #1f2937;
    border: 1px solid #8c96a4;
    padding: 2px 9px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 2px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 22px;
}

.btn-access-secondary:hover {
    background: linear-gradient(to bottom, #f4f6f8 0%, #dce2e8 100%);
}

.btn-access-delete {
    background-color: #ffffff;
    color: #a4373a;
    border: 1px solid #c5b6b7;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 2px;
    cursor: pointer;
}

.btn-access-delete:hover:not(:disabled) {
    background-color: #a4373a;
    color: #ffffff;
    border-color: #a4373a;
}

.btn-access-delete:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.access-table-wrapper {
    width: 100%;
    max-height: 800px;
    overflow: auto;
    background-color: #ffffff;
}

.access-datasheet-table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    background-color: #ffffff;
    font-size: 11px;
}

.access-cell {
    border-right: 1px solid #cfd6df;
    border-bottom: 1px solid #cfd6df;
    padding: 2px 6px;
    font-size: 11px;
    color: #111827;
    height: 21px;
    line-height: 17px;
    white-space: nowrap;
}

th.access-cell.access-col-header {
    background: linear-gradient(to bottom, #f8fafc 0%, #e6ebf1 100%);
    color: #1f2937;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 5;
    text-align: left;
    border-bottom: 1px solid #8c96a4;
    padding: 3px 6px;
}

th.access-cell.access-col-header:hover {
    background: linear-gradient(to bottom, #ffffff 0%, #dbe2ea 100%);
}

.access-selector-th,
.access-selector-td {
    width: 20px;
    min-width: 20px;
    max-width: 20px;
    padding: 0;
    text-align: center;
    background: linear-gradient(to right, #eef1f5 0%, #dfe5ec 100%);
    border-right: 1px solid #9aa5b4;
    user-select: none;
}

th.access-selector-th {
    position: sticky;
    top: 0;
    z-index: 6;
    border-bottom: 1px solid #8c96a4;
}

.selector-arrow {
    color: #111827;
    font-size: 9px;
}

.row-num {
    background-color: #f4f6f9;
    color: #4b5563;
    width: 32px;
    text-align: center;
    font-weight: 600;
    border-right: 1px solid #cfd6df;
}

th.row-num {
    background: linear-gradient(to bottom, #f8fafc 0%, #e6ebf1 100%);
    position: sticky;
    top: 0;
    z-index: 5;
    border-bottom: 1px solid #8c96a4;
}

.access-data-cell {
    text-align: left;
}

.action-col {
    width: 66px;
    text-align: center;
}

th.action-col {
    background: linear-gradient(to bottom, #f8fafc 0%, #e6ebf1 100%);
    position: sticky;
    top: 0;
    z-index: 5;
    border-bottom: 1px solid #8c96a4;
    text-align: center;
}

.access-row:hover .access-data-cell {
    background-color: #f3f6fa;
}

.access-row.is-selected .access-data-cell {
    background-color: #dce8f7;
    color: #0f172a;
}

.access-row.is-selected .access-selector-td {
    background: linear-gradient(to right, #e3e8ee 0%, #cdd6e0 100%);
}

.access-nav-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 3px 6px;
    background: linear-gradient(to bottom, #eef1f5 0%, #dde3ea 100%);
    border-top: 1px solid #9aa5b4;
    font-size: 11px;
    color: #374151;
}

.access-nav-controls {
    display: flex;
    align-items: center;
    gap: 3px;
}

.nav-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 2px;
    color: #1f2937;
    font-size: 9px;
    padding: 1px 4px;
    height: 18px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
}

.nav-btn:hover:not(:disabled) {
    background-color: #ffffff;
    border-color: #9aa5b4;
}

.nav-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.nav-label {
    margin: 0 6px;
    font-size: 11px;
    color: #1f2937;
}

.nav-new-text {
    font-size: 10px;
    margin-left: 2px;
}

.access-status-text {
    font-size: 10px;
    color: #4b5563;
    font-weight: 600;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.42);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.access-modal {
    background: #ffffff;
    width: 100%;
    max-width: 520px;
    padding: 0;
    border-radius: 2px;
    border: 1px solid #7d8794;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    box-sizing: border-box;
    font-family: "Segoe UI", Tahoma, Arial, sans-serif;
    overflow: hidden;
}

.access-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    background: linear-gradient(to bottom, #f6f8fa 0%, #e5e9ef 100%);
    border-bottom: 1px solid #9aa5b4;
}

.access-modal-header h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
}

.btn-close {
    background: transparent;
    border: none;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    color: #4b5563;
    padding: 0 2px;
}

.btn-close:hover {
    color: #a4373a;
}

.modal-form {
    padding: 10px;
}

.access-grid-wrapper {
    border: 1px solid #9aa5b4;
    overflow: hidden;
    margin-bottom: 8px;
    background: #ffffff;
}

.access-sheet-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;

}

.access-th {
    background: linear-gradient(to bottom, #f8fafc 0%, #e6ebf1 100%);
    color: #1f2937;
    font-weight: 600;
    padding: 3px 6px;
    text-align: left;
    border-right: 1px solid #cfd6df;
    border-bottom: 1px solid #8c96a4;
}

.row-num-th {
    width: 30px;
    text-align: center;
}

.access-tr {
    background-color: #ffffff;
}

.access-td {
    padding: 0;
    border-right: 1px solid #cfd6df;
    border-bottom: 1px solid #cfd6df;
    height: 22px;
}

.access-field-label {
    background-color: #f4f6f9;
    color: #374151;
    font-weight: 600;
    padding: 0 6px;
    font-size: 11px;
}

.row-num-td {
    background-color: #f4f6f9;
    color: #4b5563;
    text-align: center;
    font-weight: 600;
    font-size: 11px;
    padding: 0 2px;
}

.access-cell-input {
    width: 100%;
    border: none;
    background: transparent;
    padding: 2px 6px;
    font-size: 11px;
    color: #111827;
    height: 22px;
    box-sizing: border-box;
}

.access-cell-input:focus {
    outline: none;
    background-color: #dce8f7;
}

.action-th {
    width: 48px;
    text-align: center;
}

.modal-button-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
}

.access-btn-delete {
    background: transparent;
    color: #a4373a;
    border: 1px solid transparent;
    width: 20px;
    height: 18px;
    font-size: 12px;
    font-weight: bold;
    border-radius: 2px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.access-btn-delete:hover:not(:disabled) {
    background-color: #a4373a;
    color: #ffffff;
}

.access-btn-delete:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.error {
    color: #a4373a;
    font-weight: 600;
    margin: 4px 6px;
    font-size: 11px;
}

.success {
    color: #137333;
    font-weight: 600;
    margin: 4px 6px;
    font-size: 11px;
}

.loading,
.no-data {
    color: #4b5563;
    font-style: italic;
    text-align: center;
    padding: 10px;
    margin: 0;
    font-size: 11px;
}
</style>