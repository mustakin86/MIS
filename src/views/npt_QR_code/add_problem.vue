<template>
    <div class="manager-container">
        <h2>Multi-Sheet Manager</h2>

        <!-- Sheet Navigation Tabs -->
        <div class="tabs">
            <button v-for="(config, key) in sheetsConfig" :key="key" :class="{ active: currentSheetKey === key }"
                @click="switchSheet(key)">
                {{ config.label }}
            </button>
        </div>

        <!-- Dynamic Form based on active sheet -->
        <form @submit.prevent="createRecord" class="form-container">
            <h3>Add New Entry to {{ sheetsConfig[currentSheetKey].label }}</h3>

            <!-- Fields for ProblemName (ProblemCategory) -->
            <template v-if="currentSheetKey === 'ProblemName'">
                <div class="input-group">
                    <label>Problem Category:</label>
                    <input v-model="formData.Problem_Category" type="text" placeholder="e.g. Hardware Failure"
                        required />
                </div>
            </template>

            <!-- Fields for All_Qr_Code with Section Dropdown -->
            <template v-else-if="currentSheetKey === 'All_Qr_Code'">
                <div class="form-grid">
                    <div class="inputs-column">
                        <div class="input-group">
                            <label>Prefix:</label>
                            <input v-model="formData.Prefix" type="text" placeholder="e.g. ACL" required />
                        </div>
                        <div class="input-group">
                            <label>QR Number:</label>
                            <input v-model="formData.QR_Number" type="text" placeholder="e.g. 10001" required />
                        </div>
                        <div class="input-group">
                            <label>Section:</label>
                            <select v-model="formData.Section" required>
                                <option disabled value="">Select Section</option>
                                <option value="Sewing">Sewing</option>
                                <option value="Cutting">Cutting</option>
                                <option value="Finishing">Finishing</option>
                                <option value="Quality">Quality</option>
                                <option value="Packing">Packing</option>
                            </select>
                        </div>
                    </div>

                    <!-- QR Code Preview Card -->
                    <div class="preview-column">
                        <label>QR Code View</label>
                        <div class="qr-preview-box">
                            <qrcode-vue :value="generatedQRValue" :size="100" level="H" />
                            <span class="preview-text">{{ generatedQRValue || 'Preview' }}</span>
                        </div>
                    </div>
                </div>
            </template>

            <button type="submit" :disabled="loading" class="btn-primary">
                {{ loading ? 'Saving...' : 'Save Record' }}
            </button>
        </form>

        <!-- Feedback Alerts -->
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <p v-if="successMsg" class="success">{{ successMsg }}</p>

        <!-- Data Table View -->
        <div class="table-section">
            <h3>Records in {{ sheetsConfig[currentSheetKey].name }}</h3>
            <div v-if="fetching" class="loading">Loading data...</div>

            <table v-else-if="tableData.length > 0">
                <thead>
                    <tr>
                        <th v-for="header in sheetsConfig[currentSheetKey].headers" :key="header">
                            {{ header }}
                        </th>
                        <th v-if="currentSheetKey === 'All_Qr_Code'">QR View</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in tableData" :key="row.rowIndex">
                        <td v-for="header in sheetsConfig[currentSheetKey].headers" :key="header">
                            {{ row[header] }}
                        </td>

                        <!-- Render actual QR image inside table if tab is All_Qr_Code -->
                        <td v-if="currentSheetKey === 'All_Qr_Code'">
                            <div class="table-qr-cell">
                                <qrcode-vue :value="row.QR_Code || 'N/A'" :size="65" level="H" />
                            </div>
                        </td>

                        <td>
                            <button @click="deleteRecord(row.rowIndex)" class="btn-danger">Delete</button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <p v-else class="no-data">No records found in this sheet.</p>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { dbAPI } from '@/services/npr_qr_code_api.js'

const sheetsConfig = {
    ProblemName: {
        label: "Problem Categories",
        name: "ProblemCategory",
        headers: ['ID', 'Problem_Category']
    },
    All_Qr_Code: {
        label: "QR Codes",
        name: "All_Qr_Code",
        headers: ['ID', 'Prefix', 'QR_Number', 'Section', 'QR_Code']
    }
}

const currentSheetKey = ref('ProblemName')
const tableData = ref([])
const loading = ref(false)
const fetching = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const formData = reactive({
    Problem_Category: '',
    Prefix: '',
    QR_Number: '',
    Section: ''
})

const generatedQRValue = computed(() => {
    if (!formData.Prefix && !formData.QR_Number) return ''
    return `${formData.Prefix || 'PREFIX'}-${formData.QR_Number || '0000'}`
})

const switchSheet = (key) => {
    currentSheetKey.value = key
    errorMsg.value = ''
    successMsg.value = ''
    fetchData()
}

const fetchData = async () => {
    fetching.value = true
    errorMsg.value = ''
    try {
        const data = await dbAPI.getRecords(currentSheetKey.value)
        tableData.value = data
    } catch (err) {
        errorMsg.value = "Network error while loading."
        console.error(err)
    } finally {
        fetching.value = false
    }
}

const createRecord = async () => {
    loading.value = true
    errorMsg.value = ''
    successMsg.value = ''

    const payloadToSend = {}
    if (currentSheetKey.value === 'ProblemName') {
        payloadToSend.Problem_Category = formData.Problem_Category.trim()
    } else if (currentSheetKey.value === 'All_Qr_Code') {
        payloadToSend.Prefix = formData.Prefix.trim()
        payloadToSend.QR_Number = formData.QR_Number.trim()
        payloadToSend.Section = formData.Section.trim()
        payloadToSend.QR_Code = generatedQRValue.value
    }

    try {
        await dbAPI.saveRecord(currentSheetKey.value, payloadToSend, 'create')
        successMsg.value = "Record added successfully!"

        formData.Problem_Category = ''
        formData.Prefix = ''
        formData.QR_Number = ''
        formData.Section = ''

        setTimeout(async () => {
            await fetchData()
        }, 1000)
    } catch (err) {
        errorMsg.value = "Network error during creation."
        console.error(err)
    } finally {
        loading.value = false
    }
}

const deleteRecord = async (rowIndex) => {
    if (!confirm("Are you sure you want to delete this row?")) return
    errorMsg.value = ''
    successMsg.value = ''

    try {
        await dbAPI.saveRecord(currentSheetKey.value, { rowIndex }, 'delete')
        successMsg.value = "Row deleted successfully!"

        setTimeout(async () => {
            await fetchData()
        }, 1000)
    } catch (err) {
        errorMsg.value = "Network error during deletion."
        console.error(err)
    }
}

onMounted(() => {
    fetchData()
})
</script>

<style scoped>
.manager-container {
    max-width: 100%;
    margin: 20px auto;
    font-family: Arial, sans-serif;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background: #fdfdfd;
}

.tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.tabs button {
    padding: 10px 15px;
    border: 1px solid #ccc;
    background: #f1f1f1;
    cursor: pointer;
    border-radius: 4px;
    font-weight: bold;
}

.tabs button.active {
    background: #007bff;
    color: white;
    border-color: #0056b3;
}

.form-container {
    background: #f9f9f9;
    padding: 15px;
    border: 1px solid #e1e1e1;
    border-radius: 6px;
    margin-bottom: 20px;
}

.form-grid {
    display: flex;
    gap: 20px;
}

.inputs-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.preview-column {
    width: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.qr-preview-box {
    width: 100%;
    height: 100%;
    min-height: 120px;
    background: white;
    border: 1px dashed #ccc;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px;
    margin-top: 4px;
}

.preview-text {
    font-size: 10px;
    font-weight: bold;
    margin-top: 5px;
    word-break: break-all;
    text-align: center;
    color: #333;
}

.table-qr-cell {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 4px;
}

.input-group {
    display: flex;
    flex-direction: column;
}

label {
    font-size: 13px;
    font-weight: bold;
    color: #444;
}

input,
select {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-top: 4px;
    font-size: 14px;
    background-color: white;
}

button {
    cursor: pointer;
    border: none;
    border-radius: 4px;
    font-weight: bold;
}

.btn-primary {
    background-color: #28a745;
    color: white;
    padding: 10px 15px;
    margin-top: 15px;
    width: 100%;
}

.btn-primary:disabled {
    background-color: #a3d9b1;
}

.btn-danger {
    background-color: #dc3545;
    color: white;
    padding: 5px 10px;
    font-size: 12px;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    background: white;
}

th,
td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: center;
    vertical-align: middle;
    font-size: 13px;
}

th {
    background-color: #f3f3f3;
}

.error {
    color: #dc3545;
    font-weight: bold;
    margin-top: 10px;
}

.success {
    color: #28a745;
    font-weight: bold;
    margin-top: 10px;
}

.loading,
.no-data {
    color: #666;
    font-style: italic;
    text-align: center;
    padding: 15px;
}
</style>