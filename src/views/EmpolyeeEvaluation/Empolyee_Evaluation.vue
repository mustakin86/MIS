<template>
    <div class="form-container">
        <div class="company-title">AHSAN COMPOSITE LIMITED</div>
        <h2>Worker's Skill Evaluation Form</h2>

        <form id="evaluationForm" @submit.prevent="submitForm">

            <!-- Metadata Cards Split Layout -->
            <div class="flex-row">
                <div class="flex-col">
                    <div class="target-grid">
                        <div class="target-row">
                            <div class="target-label">Evaluated ID:-</div>
                            <div class="target-input-cell">
                                <input type="text" v-model="formData.Evaluated_ID" name="Evaluated_ID">
                            </div>
                        </div>
                        <div class="target-row">
                            <div class="target-label">Evaluated Date:-</div>
                            <div class="target-input-cell">
                                <input type="date" v-model="formData.Evaluated_Date" name="Evaluated_Date">
                            </div>
                        </div>
                        <div class="target-row">
                            <div class="target-label">Employee Name:-</div>
                            <div class="target-input-cell">
                                <input type="text" v-model="formData.Employee_Name" name="Employee_Name">
                            </div>
                        </div>
                        <div class="target-row">
                            <div class="target-label">Group / Section:-</div>
                            <div class="target-input-cell">
                                <input type="text" v-model="formData.Group_Section" name="Group_Section">
                            </div>
                        </div>
                        <div class="target-row">
                            <div class="target-label">Designation:-</div>
                            <div class="target-input-cell">
                                <input type="text" v-model="formData.Designation" name="Designation">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex-col">
                    <div class="target-grid">
                        <div class="target-row">
                            <div class="target-label">Total Grade Point:-</div>
                            <div class="target-input-cell">
                                <input type="text" v-model="formData.Total_Grade_Point" name="Total_Grade_Point"
                                    class="readonly-field" readonly>
                            </div>
                        </div>
                        <div class="target-row">
                            <div class="target-label">Grade Assigned:-</div>
                            <div class="target-input-cell">
                                <input type="text" v-model="formData.Grade_Assigned" name="Grade_Assigned"
                                    class="readonly-field" readonly>
                            </div>
                        </div>
                        <div class="target-row">
                            <div class="target-label">Average Efficiency:-</div>
                            <div class="target-input-cell">
                                <input type="text" v-model="formData.Average_Efficiency" name="Average_Efficiency"
                                    class="readonly-field" readonly>
                            </div>
                        </div>
                        <div class="target-row">
                            <div class="target-label">No of M/C Can Drive:-</div>
                            <div class="target-input-cell">
                                <input type="text" v-model="formData.No_of_MC_Can_Drive" name="No_of_MC_Can_Drive">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex-col">
                    <div class="target-grid">
                        <div class="target-row">
                            <div class="target-label">Salary As Per Grade:-</div>
                            <div class="target-input-cell">
                                <input type="text" v-model="formData.Salary_As_Per_Grade" name="Salary_As_Per_Grade"
                                    class="readonly-field" readonly>
                            </div>
                        </div>
                        <div class="target-row">
                            <div class="target-label">Proposed Salary:-</div>
                            <div class="target-input-cell">
                                <input type="text" v-model="formData.Proposed_Salary" name="Proposed_Salary">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="table-responsive">
                <table class="spreadsheet-table" id="skillTable">
                    <thead>
                        <tr>
                            <th rowspan="2" style="width: 5%;">SL No</th>
                            <th rowspan="2" style="width: 14%;">Item</th>
                            <th rowspan="2" style="width: 14%;">Operation Name</th>
                            <th rowspan="2" style="width: 7%;">M/C Type</th>
                            <th rowspan="2" style="width: 7%;">Oper. Grade</th>
                            <th colspan="5" style="width: 25%;">Cycle Time</th>
                            <th rowspan="2" style="width: 8%;">Avg Time(Min)</th>
                            <th rowspan="2" style="width: 8%;">Capacity (pcs/hr)</th>
                            <th rowspan="2" style="width: 7%;">SMV</th>
                            <th rowspan="2" style="width: 8%;">Standard (pcs/hr)</th>
                            <th rowspan="2" style="width: 8%;">Efficiency (%)</th>
                            <th rowspan="2" style="width: 8%;">Action</th>
                        </tr>
                        <tr>
                            <th style="width: 5%;">1</th>
                            <th style="width: 5%;">2</th>
                            <th style="width: 5%;">3</th>
                            <th style="width: 5%;">4</th>
                            <th style="width: 5%;">5</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, index) in rows" :key="index" class="skill-row">
                            <td class="sl-no-cell">{{ index + 1 }}</td>
                            <td>
                                <select v-model="row.Item" :name="`op${index + 1}_item`"
                                    @change="handleItemChange(index)" ref="itemSelectRef">
                                    <option value="">-- Select Item --</option>
                                    <option v-for="it in itemList" :key="it" :value="it">{{ it }}</option>
                                </select>
                            </td>
                            <td>
                                <select v-model="row.Operation_Name" :name="`op${index + 1}_name`"
                                    @change="handleOperationChange(index)">
                                    <option value="">-- Select Operation --</option>
                                    <option v-for="op in row.availableOperations"
                                        :key="op.OpCode || op.ProcessDescription"
                                        :value="op.ProcessDescription || op.Operation_Name">
                                        {{ op.ProcessDescription || op.Operation_Name }}
                                    </option>
                                </select>
                            </td>
                            <td><input type="text" v-model="row.MC_Type" :name="`op${index + 1}_code`"
                                    class="readonly-field" readonly></td>
                            <td><input type="text" v-model="row.Oper_Grade" :name="`op${index + 1}_grade`"
                                    class="readonly-field" readonly></td>
                            <td><input type="text" v-model="row.cycle1" :name="`op${index + 1}_cycle1`"
                                    @input="calculateRow(index)"></td>
                            <td><input type="text" v-model="row.cycle2" :name="`op${index + 1}_cycle2`"
                                    @input="calculateRow(index)"></td>
                            <td><input type="text" v-model="row.cycle3" :name="`op${index + 1}_cycle3`"
                                    @input="calculateRow(index)"></td>
                            <td><input type="text" v-model="row.cycle4" :name="`op${index + 1}_cycle4`"
                                    @input="calculateRow(index)"></td>
                            <td><input type="text" v-model="row.cycle5" :name="`op${index + 1}_cycle5`"
                                    @input="calculateRow(index)"></td>
                            <td><input type="text" v-model="row.Avg_Time_Min" :name="`op${index + 1}_avgTime`"
                                    class="readonly-field" readonly></td>
                            <td><input type="text" v-model="row.Capacity_pcs_hr" :name="`op${index + 1}_cap`"
                                    class="readonly-field" readonly></td>
                            <td><input type="text" v-model="row.SMV" :name="`op${index + 1}_smv`" class="readonly-field"
                                    readonly></td>
                            <td><input type="text" v-model="row.Standard_pcs_hr" :name="`op${index + 1}_std`"
                                    @input="calculateRow(index)"></td>
                            <td><input type="text" v-model="row.Efficiency" :name="`op${index + 1}_eff`"
                                    class="row-efficiency-input readonly-field" readonly></td>
                            <td><button type="button" class="btn-del-row" @click="deleteRow(index)">X</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="target-grid">
                <div class="target-row">
                    <div class="target-label">Feedback / Remarks:-</div>
                    <div class="target-input-cell">
                        <textarea v-model="formData.feedback" id="feedback" name="feedback" rows="3"
                            style="height: auto; resize: vertical; padding: 4px; text-align: left;"></textarea>
                    </div>
                </div>
            </div>

            <button type="submit" class="btn-submit">Submit Evaluation</button>
            <div style="clear: both;"></div>
            <div id="loading" :style="{ display: isLoading ? 'block' : 'none' }">Submitting entry to Google Sheets...
                Please wait.</div>
        </form>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { dbAPI as smvAPI } from '@/services/operations_api.js';

const SHEET_HEADER = "Header";
const SHEET_SKILL = "Skill";

const isLoading = ref(false);
const itemHasError = ref(false);
const itemSelectRef = ref(null);

const itemList = ref([]);
const masterRecords = ref([]); // Store fetched records to map operation properties

const formData = reactive({
    Header_ID: '',
    Evaluated_ID: "919556",
    Payroll_ID: "",
    Evaluated_Date: "2025-03-04",
    Employee_Name: "Sharmin",
    Group_Section: "",
    Designation: "Jr. Operator (Overlock)",
    Total_Grade_Point: "2.59",
    Grade_Assigned: "C",
    Average_Efficiency: "",
    No_of_MC_Can_Drive: "",
    Salary_As_Per_Grade: "13550",
    Proposed_Salary: "13550",
    Efficiency: "",
    Total_SMV: "",
    Created_Date: "",
    feedback: ""
});

const rows = ref([
    {
        ID: '',
        Header_ID: '',
        Evaluated_ID: '',
        Payroll_ID: '',
        Item: '',
        Operation_Name: '',
        MC_Type: '',
        Oper_Grade: '',
        cycle1: '',
        cycle2: '',
        cycle3: '',
        cycle4: '',
        cycle5: '',
        Avg_Time_Min: '',
        Capacity_pcs_hr: '',
        SMV: '',
        Standard_pcs_hr: '',
        Efficiency: '',
        Created_Date: '',
        availableOperations: []
    }
]);

const totalSmvFormatted = computed(() => {
    const total = rows.value.reduce((sum, row) => sum + (parseFloat(row.SMV) || 0), 0);
    return total > 0 ? total.toFixed(3) : '0.000';
});

async function initDropdownData() {
    try {
        const res = await smvAPI.readRecords('Operations');
        const records = res.data || res;
        if (records && records.length) {
            masterRecords.value = records;
            itemList.value = [...new Set(records.map(r => r.Item || r.item || r.Item_Name).filter(Boolean))];
        }
    } catch (err) {
        console.error("Failed to load items:", err);
    }
}

async function handleItemChange(index) {
    const currentRow = rows.value[index];
    const selectedItem = currentRow.Item;

    if (!selectedItem || !selectedItem.trim()) {
        itemHasError.value = true;
        currentRow.availableOperations = [];
        return;
    }
    itemHasError.value = false;

    // Filter operations matching the selected item
    currentRow.availableOperations = masterRecords.value.filter(r => {
        const recordItem = r.Item || r.item || r.Item_Name;
        return recordItem && recordItem.toString().trim().toLowerCase() === selectedItem.trim().toLowerCase();
    });

    currentRow.Operation_Name = '';
    currentRow.MC_Type = '';
    currentRow.Oper_Grade = '';
    currentRow.SMV = '';
    calculateRow(index);
}

function handleOperationChange(index) {
    const currentRow = rows.value[index];
    const selectedOpName = currentRow.Operation_Name;

    if (selectedOpName && currentRow.availableOperations.length > 0) {
        const selectedOp = currentRow.availableOperations.find(o =>
            (o.ProcessDescription || o.Operation_Name) === selectedOpName
        );
        if (selectedOp) {
            currentRow.MC_Type = selectedOp.MachineType || selectedOp.Machine_Type || selectedOp.MC_Type || "";
            currentRow.Oper_Grade = selectedOp.OperationGrade || selectedOp.OperGrade || selectedOp.Grade || "";
            currentRow.SMV = selectedOp.SMV || selectedOp.smv || "";
            calculateRow(index);
        }
    } else {
        currentRow.MC_Type = '';
        currentRow.Oper_Grade = '';
        currentRow.SMV = '';
        calculateRow(index);
    }

    if (index === rows.value.length - 1 && selectedOpName !== "") {
        addRow();
    }
}

function calculateRow(index) {
    let row = rows.value[index];
    let c1 = parseFloat(row.cycle1) || 0;
    let c2 = parseFloat(row.cycle2) || 0;
    let c3 = parseFloat(row.cycle3) || 0;
    let c4 = parseFloat(row.cycle4) || 0;
    let c5 = parseFloat(row.cycle5) || 0;

    let cycles = [c1, c2, c3, c4, c5].filter(val => val > 0);

    if (cycles.length > 0) {
        let sum = cycles.reduce((a, b) => a + b, 0);
        let avg = sum / cycles.length;
        let avg_Min = avg / 60;
        row.Avg_Time_Min = avg_Min.toFixed(2);

        let capacity = avg > 0 ? (3600 / avg).toFixed(0) : "";
        row.Capacity_pcs_hr = capacity;

        let smv = parseFloat(row.SMV) || 0;
        let std = smv > 0 ? (60 / smv) : 0;
        row.Standard_pcs_hr = std > 0 ? std.toFixed(0) : "";

        let numericCap = parseFloat(capacity) || 0;
        if (std > 0 && numericCap > 0) {
            row.Efficiency = ((numericCap / std) * 100).toFixed(1) + "%";
        } else {
            row.Efficiency = "";
        }
    } else {
        row.Avg_Time_Min = "";
        row.Capacity_pcs_hr = "";
        row.Standard_pcs_hr = "";
        row.Efficiency = "";
    }

    updateAverageEfficiency();
}

function updateAverageEfficiency() {
    let totalEff = 0;
    let validCount = 0;

    rows.value.forEach(row => {
        let val = parseFloat(row.Efficiency);
        if (!isNaN(val) && val > 0) {
            totalEff += val;
            validCount++;
        }
    });

    let avgEff = validCount > 0 ? (totalEff / validCount).toFixed(2) : "0.00";
    formData.Average_Efficiency = avgEff + "%";
    formData.Efficiency = avgEff + "%";
}

function addRow() {
    rows.value.push({
        ID: '',
        Header_ID: '',
        Evaluated_ID: '',
        Payroll_ID: '',
        Item: '',
        Operation_Name: '',
        MC_Type: '',
        Oper_Grade: '',
        cycle1: '',
        cycle2: '',
        cycle3: '',
        cycle4: '',
        cycle5: '',
        Avg_Time_Min: '',
        Capacity_pcs_hr: '',
        SMV: '',
        Standard_pcs_hr: '',
        Efficiency: '',
        Created_Date: '',
        availableOperations: []
    });
    updateAverageEfficiency();
}

function deleteRow(index) {
    if (rows.value.length > 1) {
        rows.value.splice(index, 1);
        updateAverageEfficiency();
    } else {
        alert("At least one operation row is required.");
    }
}

async function submitForm() {
    isLoading.value = true;

    const headerId = 'HDR-' + Date.now();
    const timestamp = new Date().toISOString().split('T')[0];

    formData.Header_ID = headerId;
    formData.Total_SMV = totalSmvFormatted.value;
    formData.Created_Date = timestamp;

    const headerPayload = {
        Header_ID: formData.Header_ID,
        Evaluated_ID: formData.Evaluated_ID,
        Payroll_ID: formData.Payroll_ID,
        Evaluated_Date: formData.Evaluated_Date,
        Employee_Name: formData.Employee_Name,
        Group_Section: formData.Group_Section,
        Designation: formData.Designation,
        Total_Grade_Point: formData.Total_Grade_Point,
        Grade_Assigned: formData.Grade_Assigned,
        Average_Efficiency: formData.Average_Efficiency,
        No_of_MC_Can_Drive: formData.No_of_MC_Can_Drive,
        Salary_As_Per_Grade: formData.Salary_As_Per_Grade,
        Proposed_Salary: formData.Proposed_Salary,
        Efficiency: formData.Efficiency,
        Total_SMV: formData.Total_SMV,
        Created_Date: formData.Created_Date
    };

    const validSkillRows = rows.value
        .filter(row => row.Operation_Name)
        .map((row, index) => ({
            ID: `SKL-${Date.now()}-${index + 1}`,
            Header_ID: headerId,
            Evaluated_ID: formData.Evaluated_ID,
            Payroll_ID: formData.Payroll_ID,
            Item: row.Item,
            Operation_Name: row.Operation_Name,
            MC_Type: row.MC_Type,
            Oper_Grade: row.Oper_Grade,
            '1': row.cycle1,
            '2': row.cycle2,
            '3': row.cycle3,
            '4': row.cycle4,
            '5': row.cycle5,
            Avg_Time_Min: row.Avg_Time_Min,
            Capacity_pcs_hr: row.Capacity_pcs_hr,
            SMV: parseFloat(row.SMV) || 0,
            Standard_pcs_hr: row.Standard_pcs_hr,
            Efficiency: row.Efficiency,
            Created_Date: timestamp
        }));

    try {
        if (smvAPI && typeof smvAPI.createRecord === 'function') {
            await Promise.all([
                smvAPI.createRecord(SHEET_HEADER, headerPayload),
                validSkillRows.length > 0 ? smvAPI.createRecord(SHEET_SKILL, validSkillRows) : Promise.resolve()
            ]);
            isLoading.value = false;
            alert('Data successfully saved to Google Sheets!');
        } else {
            setTimeout(() => {
                isLoading.value = false;
                alert('Mock submission successful! Payload built.');
                console.log("Header Payload:", headerPayload);
                console.log("Skill Payload:", validSkillRows);
            }, 1000);
        }
    } catch (error) {
        isLoading.value = false;
        alert('Error saving data: ' + error.message);
    }
}

onMounted(() => {
    initDropdownData();
});
</script>

<style scoped>
/* General Container and Spreadsheet Theme - Ultra Compact */
.form-container {
    max-width: 100%;
    margin: 5px auto;
    background: #ffffff;
    padding: 8px 10px;
    border: 1px solid #bcbcbc;
    border-radius: 2px;
    font-family: Arial, sans-serif;
    color: #000000;
}

.company-title {
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: #1a365d;
    margin-bottom: 2px;
}

.form-container h2 {
    text-align: center;
    font-size: 11px;
    color: #333333;
    margin-top: 0;
    margin-bottom: 8px;
    text-transform: uppercase;
    border-bottom: 1px solid #107c41;
    padding-bottom: 3px;
}

.btn-del-row {
    background-color: #c0392b;
    color: white;
    border: none;
    padding: 2px 5px;
    font-size: 10px;
    cursor: pointer;
    border-radius: 2px;
}

.btn-del-row:hover {
    background-color: #962d22;
}

/* Flex Split Layouts */
.flex-row {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
}

.flex-col {
    flex: 1;
}

/* Excel-Like Grid Layout */
.target-grid {
    display: flex;
    flex-direction: column;
    border: 1px solid #bcbcbc;
    background-color: #ffffff;
    margin-bottom: 6px;
}

.target-row {
    display: flex;
    border-bottom: 1px solid #d9d9d9;
}

.target-row:last-child {
    border-bottom: none;
}

.target-label {
    flex: 1.2;
    background-color: #f2f2f2;
    padding: 6px 5px;
    font-size: 10px;
    font-weight: 700;
    color: #333333;
    border-right: 1px solid #d9d9d9;
    display: flex;
    align-items: center;
}

.target-input-cell {
    flex: 1.3;
    padding: 1px;
    background-color: #ffffff;
    display: flex;
    align-items: center;
}

.target-input-cell input,
.target-input-cell select,
.target-input-cell textarea {
    width: 100%;
    padding: 2px 4px;
    border: 1px solid transparent;
    font-size: 10.5px;
    background-color: #fff;
    box-sizing: border-box;
    text-align: center;
}

.target-input-cell input {
    height: 20px;
}

.target-input-cell input:focus,
.target-input-cell select:focus,
.target-input-cell textarea:focus {
    outline: none;
    border: 1px solid #107c41;
    background-color: #fff;
}

.readonly-field {
    background-color: #f9f9f9 !important;
    color: #333333;
    font-weight: 600;
}

/* Excel-Style Spreadsheet Table */
.table-responsive {
    width: 100%;
    overflow-x: auto;
    margin-bottom: 8px;
    border: 1px solid #bcbcbc;
}

.spreadsheet-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
    background-color: #ffffff;
    table-layout: fixed;
}

.spreadsheet-table th,
.spreadsheet-table td {
    border: 1px solid #d9d9d9;
    padding: 2px 3px;
    text-align: center;
    vertical-align: middle;
    overflow: hidden;
}

.spreadsheet-table th {
    background-color: #f2f2f2;
    color: #000000;
    font-weight: 700;
    font-size: 10px;
    border: 1px solid #bcbcbc;
}

.spreadsheet-table input[type="text"],
.spreadsheet-table select {
    width: 100%;
    padding: 2px;
    border: 1px solid transparent;
    background: transparent;
    text-align: center;
    font-size: 10.5px;
    box-sizing: border-box;
    height: 20px;
}

.spreadsheet-table input[type="text"]:focus,
.spreadsheet-table select:focus {
    border: 1px solid #107c41;
    background: #ffffff;
    outline: none;
}

.sl-no-cell {
    background-color: #f9f9f9;
    font-weight: bold;
    color: #333333;
}

/* Excel-Style Action Button */
.btn-submit {
    display: block;
    width: auto;
    background-color: #0000ff;
    color: white;
    padding: 6px 12px;
    border: none;
    border-radius: 2px;
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 8px;
    float: right;
}

.btn-submit:hover {
    background-color: #0000b3;
}

#loading {
    text-align: center;
    margin-top: 6px;
    font-size: 10.5px;
    font-weight: bold;
    color: #b8860b;
}

@media (max-width: 768px) {
    .flex-row {
        flex-direction: column;
    }
}
</style>