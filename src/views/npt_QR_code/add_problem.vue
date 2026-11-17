<template>
    <div class="manager-container">
        <!-- Data Table View -->
        <div class="table-section">
            <div class="table-header-row no-print">
                <h3>Problem Categories & Responsible Departments</h3>
                <div class="header-actions">
                    <button @click="openAddModal" class="btn-primary">＋ Add Problem</button>
                </div>
            </div>
            
            <div v-if="fetching" class="loading no-print">Loading problem records...</div>

            <!-- Main Screen Table -->
            <div v-else-if="tableData.length > 0" class="excel-table-wrapper no-print">
                <table class="screen-only-table">
                    <thead>
                        <tr>
                            <th class="excel-cell row-num">#</th>
                            <th v-for="header in sheetsConfig[currentSheetKey].headers" :key="header" class="excel-cell">
                                {{ header.replace('_', ' ') }}
                            </th>
                            <th class="excel-cell action-col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, index) in tableData" :key="row.rowIndex || index">
                            <td class="excel-cell row-num">{{ index + 1 }}</td>
                            <td v-for="header in sheetsConfig[currentSheetKey].headers" :key="header" class="excel-cell">
                                {{ row[header] }}
                            </td>
                            <td class="excel-cell action-col">
                                <button @click="deleteRecord(row.rowIndex)" class="btn-danger">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else class="no-data no-print">No problem records found.</p>
        </div>

        <!-- Feedback Alerts -->
        <p v-if="errorMsg" class="error no-print">⚠️ {{ errorMsg }}</p>
        <p v-if="successMsg" class="success no-print">✔ {{ successMsg }}</p>
    </div>

    <!-- Popup Modal for Adding Problems -->
    <div v-if="isModalOpen" class="modal-overlay no-print" @click.self="closeAddModal">
        <div class="modal-card">
            <div class="modal-header">
                <h3>Add New Problem Categories</h3>
                <button @click="closeAddModal" class="btn-close">×</button>
            </div>

            <form @submit.prevent="createRecords" class="modal-form">
                <!-- Fixed Responsible Department Field -->
                <div class="excel-grid-wrapper">
                    <table class="excel-sheet-table">
                        <tbody>
                            <tr>
                                <td class="excel-td row-num-td" style="width: 140px;">Responsible Dept :-</td>
                                <td class="excel-td">
                                    <input 
                                        v-model="formData.Responsible_Department" 
                                        type="text" 
                                        placeholder="e.g. Maintenance / IT / Quality" 
                                        required 
                                        class="excel-cell-input" 
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Problem Categories Dynamic Table -->
                <div class="excel-grid-wrapper">
                    <table class="excel-sheet-table">  
                        <tbody>
                            <tr>
                                <th class="excel-th row-num-th">#</th>
                                <th class="excel-th">Problem Category</th>
                                <th class="excel-th action-th">Actions</th>
                            </tr>
                            <tr v-for="(item, index) in formData.problems" :key="index" class="excel-tr">
                                <td class="excel-td row-num-td">{{ index + 1 }}</td>
                                <td class="excel-td">
                                    <input 
                                        v-model="item.Problem_Category" 
                                        type="text" 
                                        placeholder="Enter Problem Category (e.g. Hardware Failure)" 
                                        @input="checkAutoAddRow(index)" 
                                        class="excel-cell-input" 
                                    />
                                </td>
                                <td class="excel-td action-th">
                                    <button type="button" @click="removeProblemRow(index)" class="excel-btn-delete" title="Remove row">−</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="modal-button-row">
                    <button type="button" @click="addProblemRow" class="btn-secondary">
                        <span>＋</span> Insert Row
                    </button>
                    <button type="submit" :disabled="loading" class="btn-primary">
                        {{ loading ? 'Saving...' : 'Save All Records' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { dbAPI } from '@/services/problem_category_api.js'

const sheetsConfig = {
    ProblemName: {
        label: "Problem Categories",
        name: "ProblemCategory",
        // Match exact database keys corresponding to columns B and C
        headers: ['Problem_Category', 'Responsible_Department']
    }
}

const currentSheetKey = ref('ProblemName')
const tableData = ref([])
const loading = ref(false)
const fetching = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const isModalOpen = ref(false)

const formData = reactive({
    Responsible_Department: '',
    problems: [{ Problem_Category: '' }]
})

const openAddModal = () => {
    isModalOpen.value = true
    errorMsg.value = ''
    successMsg.value = ''
}

const closeAddModal = () => {
    isModalOpen.value = false
    formData.Responsible_Department = ''
    formData.problems = [{ Problem_Category: '' }]
}

const checkAutoAddRow = (index) => {
    if (index === formData.problems.length - 1 && formData.problems[index].Problem_Category.trim() !== '') {
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

const fetchData = async () => {
    fetching.value = true
    errorMsg.value = ''
    try {
        const data = await dbAPI.getRecords(currentSheetKey.value)
        console.log("Fetched table records from backend:", data)
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

    // Ensure Responsible Department has a value
    if (!formData.Responsible_Department || formData.Responsible_Department.trim() === '') {
        errorMsg.value = "Please fill out the Responsible Department field."
        loading.value = false
        return
    }

    // Filter out completely blank rows
    const validProblems = formData.problems.filter(p => p.Problem_Category && p.Problem_Category.trim() !== '')
    if (validProblems.length === 0) {
        errorMsg.value = "Please enter at least one problem category."
        loading.value = false
        return
    }

    try {
        for (const item of validProblems) {
            const payloadToSend = {
                Problem_Category: item.Problem_Category.trim(),
                Responsible_Department: formData.Responsible_Department.trim()
            }
            
            console.log("Sending payload item:", payloadToSend)
            await dbAPI.saveRecord(currentSheetKey.value, payloadToSend, 'create')
        }

        successMsg.value = "Problem records registered successfully!"
        closeAddModal()
        await fetchData()
    } catch (err) {
        errorMsg.value = "Network error during registration."
        console.error(err)
    } finally {
        loading.value = false
    }
}

const deleteRecord = async (rowIndex) => {
    if (!confirm("Are you sure you want to delete this record?")) return
    errorMsg.value = ''
    successMsg.value = ''

    try {
        await dbAPI.saveRecord(currentSheetKey.value, { rowIndex }, 'delete')
        successMsg.value = "Row deleted successfully!"
        await fetchData()
    } catch (err) {
        errorMsg.value = "Network error during deletion."
        console.error(err)
    }
}

onMounted(async () => {
    await fetchData()
})
</script>

<style scoped>
.manager-container {
    width: 100%;
    margin: 0;
    font-family: Arial, sans-serif;
    padding: 0;
    border: none;
    border-radius: 0;
    background: #ffffff;
    box-sizing: border-box;
}

.table-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0;
    padding: 4px 6px;
    background: #f8f9fa;
    border-bottom: 1px solid #d0d7de;
}

.table-header-row h3 {
    margin: 0;
    font-size: 13px;
    color: #202124;
}

.header-actions {
    display: flex;
    gap: 0;
    margin: 0;
    padding: 0;
}

.btn-primary {
    background-color: #1a73e8;
    color: white;
    padding: 3px 10px;
    font-size: 11px;
    height: 24px;
    border-radius: 2px;
    cursor: pointer;
    border: none;
    font-weight: bold;
    margin: 0;
}

.btn-danger {
    background-color: #d93025;
    color: white;
    padding: 2px 6px;
    font-size: 10px;
    border-radius: 2px;
    cursor: pointer;
    border: none;
    margin: 0;
}

.excel-table-wrapper {
    width: 100%;
    overflow-x: auto;
    border: 1px solid #d0d7de;
    margin: 0;
    padding: 0;
}

.screen-only-table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    background: white;
    margin: 0;
}

.excel-cell {
    border: 1px solid #d4d4d4;
    padding: 2px 4px;
    text-align: left;
    font-size: 11px;
    color: #000000;
    margin: 0;
    height: 22px;
}

th.excel-cell {
    background-color: #f3f3f3;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 5;
    text-align: center;
    border-bottom: 2px solid #bcbcbc;
}

.row-num {
    background-color: #f3f3f3;
    color: #595959;
    width: 30px;
    text-align: center;
    font-weight: bold;
    border-right: 1px solid #d4d4d4;
}

.action-col {
    width: 60px;
    text-align: center;
}

/* Modal Popup Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    margin: 0;
    padding: 0;
}

.modal-card {
    background: #ffffff;
    width: 100%;
    max-width: 500px;
    padding: 12px;
    border-radius: 4px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
    margin: 0;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0 0 8px 0;
    border-bottom: 1px solid #d4d4d4;
    padding-bottom: 4px;
}

.modal-header h3 {
    margin: 0;
    font-size: 14px;
    color: #202124;
}

.btn-close {
    background: transparent;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #5f6368;
    margin: 0;
    padding: 0;
}

.excel-grid-wrapper {
    border: 1px solid #bcbcbc;
    border-radius: 0;
    overflow: hidden;
    margin: 0 0 8px 0;
    padding: 0;
    background: white;
}

.excel-sheet-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin: 0;
}

.excel-th {
    background-color: #f3f3f3;
    color: #333333;
    font-weight: bold;
    padding: 3px 4px;
    text-align: left;
    border-right: 1px solid #d4d4d4;
    border-bottom: 2px solid #bcbcbc;
    margin: 0;
}

.row-num-th {
    width: 30px;
    text-align: center;
}

.excel-tr {
    background-color: #ffffff;
    margin: 0;
}

.excel-td {
    padding: 0;
    border: 1px solid #d4d4d4;
    margin: 0;
    height: 22px;
}

.row-num-td {
    background-color: #f3f3f3;
    color: #595959;
    text-align: center;
    font-weight: bold;
    font-size: 11px;
    border-right: 1px solid #d4d4d4;
    padding: 0 2px;
}

.excel-cell-input {
    width: 100%;
    border: none;
    background: transparent;
    padding: 2px 4px;
    font-size: 11px;
    color: #000000;
    height: 22px;
    box-sizing: border-box;
    margin: 0;
}

.excel-cell-input:focus {
    outline: 2px solid #1a73e8;
    background-color: #ffffff;
}

.action-th, .action-td {
    width: 45px;
    text-align: center;
}

.modal-button-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 8px 0 0 0;
    padding: 0;
}

.btn-secondary {
    background-color: #f3f3f3;
    color: #1f2937;
    border: 1px solid #a3a3a3;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: bold;
    border-radius: 2px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 2px;
    margin: 0;
    height: 24px;
}

.btn-secondary:hover {
    background-color: #e5e7eb;
}

.excel-btn-delete {
    background-color: transparent;
    color: #d93025;
    border: none;
    width: 20px;
    height: 20px;
    font-size: 12px;
    font-weight: bold;
    border-radius: 2px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
}

.excel-btn-delete:hover {
    background-color: #fee2e2;
}

.error { color: #d93025; font-weight: bold; margin: 4px 0 0 0; padding: 0; font-size: 11px; }
.success { color: #137333; font-weight: bold; margin: 4px 0 0 0; padding: 0; font-size: 11px; }
.loading, .no-data { color: #5f6368; font-style: italic; text-align: center; padding: 8px; margin: 0; font-size: 11px; }
</style>