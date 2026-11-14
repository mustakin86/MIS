<template>
    <div class="manager-container">

        <form @submit.prevent="createRecord" class="form-container">
            <h3>Add New Machine</h3>

            <div class="row">
                <!-- Column 1 -->
                <div class="col-md-4">
                    <div class="input-group">
                        <label>Machine ID :</label>
                        <input v-model="formData.Machine_ID" type="text" placeholder="e.g. MCH-0104" required />
                    </div>
                    <div class="input-group">
                        <label>Serial Number:</label>
                        <input v-model="formData.Serial_No" type="text" placeholder="e.g. 89451203A" required />
                    </div>
                    <div class="input-group">
                        <label>Machine Type:</label>
                        <select v-model="formData.Machine_Type" required>
                            <option disabled value="">Select Type</option>
                            <option value="Single Needle Lock Stitch">Single Needle Lock Stitch (SNLS)</option>
                            <option value="4-Thread Overlock">4-Thread Overlock (4TOL)</option>
                            <option value="Flatlock">Flatlock</option>
                            <option value="Bar Tack">Bar Tack</option>
                            <option value="Buttonhole">Buttonhole</option>
                            <option value="Button Attaching">Button Attaching</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Short Code (IE):</label>
                        <input v-model="formData.Short_Code" type="text" placeholder="e.g. SNLS" required />
                    </div>
                </div>

                <!-- Column 2 -->
                <div class="col-md-4">
                    <div class="input-group">
                        <label>Brand:</label>
                        <input v-model="formData.Brand" type="text" placeholder="e.g. Juki, Brother, Jack" required />
                    </div>
                    <div class="input-group">
                        <label>Model:</label>
                        <input v-model="formData.Model" type="text" placeholder="e.g. DDL-8700" required />
                    </div>
                    <div class="input-group">
                        <label>Special Feature:</label>
                        <input v-model="formData.Attachment" type="text"
                            placeholder="e.g. Auto Trimmer / Piping Folder" />
                    </div>
                    <div class="input-group">
                        <label>Running Status:</label>
                        <select v-model="formData.Running" required>
                            <option value="Running">Running</option>
                            <option value="Idle">Idle (Available)</option>
                            <option value="Repair">Under Maintenance</option>
                        </select>
                    </div>
                </div>

                <!-- Column 3: QR Code Preview -->
                <div class="col-md-4 preview-col">
                    <div class="preview-column">
                        <div class="qr-preview-box">
                            <qrcode-vue :value="generatedQRValue" :size="130" level="H" />
                            <span class="preview-text">{{ generatedQRValue || 'Scan Target' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <button type="submit" :disabled="loading" class="btn-primary">
                {{ loading ? 'Saving Machine...' : 'Save' }}
            </button>
            <div style="clear: both;"></div>
        </form>

        <!-- Feedback Alerts -->
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <p v-if="successMsg" class="success">{{ successMsg }}</p>

        <!-- Data Table View (Excel Sheet Grid Style without Scrollbar) -->
        <div class="table-section">
            <h3>Machine List</h3>
            <div v-if="fetching" class="loading">Loading machine inventory...</div>

            <div v-else-if="tableData.length > 0" class="excel-table-wrapper">
                <table>
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
                        <tr v-for="(row, index) in tableData" :key="row.rowIndex">
                            <td class="excel-cell row-num">{{ index + 1 }}</td>
                            <td v-for="header in sheetsConfig[currentSheetKey].headers" :key="header"
                                class="excel-cell">
                                {{ row[header] }}
                            </td>

                            <!-- Render actual QR image inside table -->
                            <td class="excel-cell">
                                <div class="table-qr-cell">
                                    <qrcode-vue :value="row.Machine_ID || 'N/A'" :size="90" level="H" />
                                </div>
                            </td>

                            <td class="excel-cell">
                                <button @click="deleteRecord(row.rowIndex)" class="btn-danger">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else class="no-data">No machine records found.</p>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { dbAPI } from '@/services/npr_qr_code_api.js'

const sheetsConfig = {
    Machine_List: {
        label: "Machine List",
        name: "Machine_List",
        headers: ['Machine_ID', 'Brand', 'Serial_No', 'Model', 'BQ Code', 'Machine_Type', 'Short_Code', 'Attachment', 'Running']
    }
}

const currentSheetKey = ref('Machine_List')
const tableData = ref([])
const loading = ref(false)
const fetching = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const formData = reactive({
    Machine_ID: '',
    Serial_No: '',
    Machine_Type: '',
    Short_Code: '',
    Model: '',
    Brand: '',
    Attachment: '',
    Running: 'Running'
})

const generatedQRValue = computed(() => {
    return formData.Machine_ID.trim() || 'MCH-PREVIEW'
})

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

const createRecord = async () => {
    loading.value = true
    errorMsg.value = ''
    successMsg.value = ''

    const payloadToSend = {
        Machine_ID: formData.Machine_ID.trim(),
        Serial_No: formData.Serial_No.trim(),
        'BQ Code': generatedQRValue.value,
        Machine_Type: formData.Machine_Type.trim(),
        Short_Code: formData.Short_Code.trim(),
        Model: formData.Model.trim(),
        Brand: formData.Brand.trim(),
        Attachment: formData.Attachment.trim(),
        Running: formData.Running
    }

    try {
        await dbAPI.saveRecord(currentSheetKey.value, payloadToSend, 'create')
        successMsg.value = "Machine registered successfully!"

        formData.Machine_ID = ''
        formData.Serial_No = ''
        formData.Machine_Type = ''
        formData.Short_Code = ''
        formData.Model = ''
        formData.Brand = ''
        formData.Attachment = ''
        formData.Running = 'Running'

        setTimeout(async () => {
            await fetchData()
        }, 1000)
    } catch (err) {
        errorMsg.value = "Network error during machine registration."
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
    margin: 10px auto;
    font-family: Arial, sans-serif;
    padding: 12px;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    background: #ffffff;
}

.form-container {
    background: #f8f9fa;
    padding: 10px;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    margin-bottom: 15px;
}

.row {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
}

.col-md-4 {
    flex: 1;
    min-width: 240px;
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

.qr-preview-box {
    background: white;
    border: 1px solid #d0d7de;
    border-radius: 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6px;
    margin-top: 2px;
}

.preview-text {
    font-size: 10px;
    font-weight: bold;
    margin-top: 4px;
    word-break: break-all;
    text-align: center;
    color: #333;
}

.table-qr-cell {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1px;
}

.input-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
}

label {
    font-size: 11px;
    font-weight: bold;
    color: #333;
    flex: 0 0 110px;
    text-align: right;
}

input,
select {
    flex: 1;
    padding: 3px 6px;
    border: 1px solid #c0c0c0;
    border-radius: 2px;
    font-size: 12px;
    background-color: white;
    height: 26px;
}

input:focus,
select:focus {
    border-color: #1a73e8;
    outline: none;
    box-shadow: inset 0 0 0 1px #1a73e8;
}

button {
    cursor: pointer;
    border: none;
    border-radius: 2px;
    font-weight: bold;
}

.btn-primary {
    background-color: #1a73e8;
    color: white;
    padding: 6px 12px;
    font-size: 12px;
    height: 30px;
    float: right;
    margin-top: 15px;
    border-radius: 5px;
}

.btn-primary:disabled {
    background-color: #9ac2f4;
}

.btn-danger {
    background-color: #d93025;
    color: white;
    padding: 2px 6px;
    font-size: 10px;
}

/* Removed max-height and overflow scroll constraints to eliminate scrollbar */
.excel-table-wrapper {
    overflow: visible;
    border: 1px solid #d0d7de;
}

table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: white;
}

.excel-cell {
    border-bottom: 1px solid #e0e0e0;
    border-right: 1px solid #e0e0e0;
    padding: 4px 6px;
    text-align: left;
    vertical-align: middle;
    font-size: 11px;
    color: #202124;
    white-space: nowrap;
    background: #ffffff;
}

th.excel-cell {
    background-color: #f1f3f4;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 5;
    text-align: center;
    border-top: 1px solid #e0e0e0;
}

td.excel-cell {
    text-align: center;
}

.row-num {
    background-color: #f8f9fa;
    color: #5f6368;
    width: 35px;
    text-align: center;
    font-weight: bold;
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
</style>