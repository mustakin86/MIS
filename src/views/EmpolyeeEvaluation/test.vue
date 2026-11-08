<template>
    <div class="form-container">
        <div class="company-title">AHSAN COMPOSITE LIMITED</div>
        <h2>Worker's Skill Evaluation Form (RMG Procedure)</h2>

        <form id="evaluationForm" @submit.prevent="submitForm">
            <!-- Operations Skill Spreadsheet Table -->
            <div class="table-responsive">
                <table class="spreadsheet-table" id="skillTable">
                    <thead>
                        <tr>
                            <th rowspan="2" style="width: 4%;">SL No</th>
                            <th rowspan="2" style="width: 12%;">Efficiency Range</th>
                            <th rowspan="2" style="width: 14%;">Grade Point</th>
                            <th rowspan="2" style="width: 7%;">Overall Grade</th>
                            <th rowspan="2" style="width: 6%;">Salary Range</th>
                            <th colspan="5" style="width: 20%;">Govt. Wage Grade</th>
                            <th rowspan="2" style="width: 7%;">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, index) in rows" :key="index" class="skill-row">
                            <td class="sl-no-cell">{{ index + 1 }}</td>
                            <td>
                                <select v-model="row.Item" :name="`op${index + 1}_item`"
                                    @change="handleItemChange(index)">
                                    <option value="">-- Select Item --</option>
                                    <option v-for="it in itemList" :key="it" :value="it">{{ it }}</option>
                                </select>
                            </td>
                            <td>
                                <select v-model="row.Operation_Name" :name="`op${index + 1}_name`"
                                    @change="handleOperationChange(index)">
                                    <option value="">-- Select Operation --</option>
                                    <option v-for="op in row.availableOperations"
                                        :key="op.ProcessDescription || op.Operation_Name"
                                        :value="op.ProcessDescription || op.Operation_Name">
                                        {{ op.ProcessDescription || op.Operation_Name }}
                                    </option>
                                </select>
                            </td>
                            <td><input type="text" v-model="row.MC_Type" :name="`op${index + 1}_code`"
                                    class="readonly-field" readonly></td>
                            <td><input type="text" v-model="row.Oper_Grade" :name="`op${index + 1}_grade`"
                                    class="readonly-field" readonly></td>
                            <td><input type="text" v-model="row.SMV" :name="`op${index + 1}_smv`" class="readonly-field"
                                    readonly></td>
                            <td><input type="text" v-model="row.Standard_pcs_hr" :name="`op${index + 1}_std`"
                                    class="readonly-field" readonly></td>
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
const itemList = ref([]);
const masterRecords = ref([]);

const formData = reactive({
    Header_ID: '',
    Evaluated_ID: "919556",
    Payroll_ID: "",
    Evaluated_Date: new Date().toISOString().split('T')[0],
    Employee_Name: "Sharmin",
    Group_Section: "",
    Designation: "Jr. Operator (Overlock)",
    Total_Grade_Point: "0.00",
    Grade_Assigned: "H",
    Average_Efficiency: "0.00%",
    No_of_MC_Can_Drive: "",
    Salary_As_Per_Grade: "12500",
    Proposed_Salary: "12500",
    Efficiency: "0.00%",
    Total_SMV: "0.000",
    Created_Date: "",
    feedback: ""
});

const rows = ref([
    {
        ID: '',
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
        availableOperations: []
    }
]);

// Weight Factors map based on Procedure Section A
const weightFactors = {
    'P': 1.00,
    'Q': 0.85,
    'R': 0.70,
    'S': 0.65,
    'H-1': 0.55,
    'H-2': 0.50
};

// Table-B Efficiency to Grade Point mapping
function getGradePoint(eff) {
    if (eff < 60.01) return 2.50;
    if (eff <= 70.00) return 2.75;
    if (eff <= 75.00) return 3.00;
    if (eff <= 80.00) return 3.25;
    if (eff <= 85.00) return 3.50;
    if (eff <= 90.00) return 3.75;
    return 4.00; // Above 90.01%
}

// Salary mapping table based on Total Grade Point thresholds
function getGradeAndSalary(totalPoint) {
    if (totalPoint >= 5.00) return { grade: 'A+', salary: '15035 + 1100(If MS/SS)' };
    if (totalPoint >= 4.85) return { grade: 'A', salary: '15035' };
    if (totalPoint >= 4.70) return { grade: 'A-', salary: '14773' };
    if (totalPoint >= 4.35) return { grade: 'B+', salary: '14523' };
    if (totalPoint >= 4.00) return { grade: 'B', salary: '14273' };
    if (totalPoint >= 3.80) return { grade: 'B-', salary: '14050' };
    if (totalPoint >= 3.40) return { grade: 'C+', salary: '13800' };
    if (totalPoint >= 2.50) return { grade: 'C', salary: '13550' };
    return { grade: 'H', salary: '12500' };
}

async function initDropdownData() {
    try {
        const res = await smvAPI.readRecords('Operations');
        const records = res.data || res;
        if (records && records.length) {
            masterRecords.value = records;
            itemList.value = [...new Set(records.map(r => r.Item || r.item || r.Item_Name).filter(Boolean))];
        }
    } catch (err) {
        console.error("Failed to load operations data:", err);
    }
}

function handleItemChange(index) {
    const currentRow = rows.value[index];
    const selectedItem = currentRow.Item;

    if (!selectedItem) {
        currentRow.availableOperations = [];
        return;
    }

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
            let effVal = (numericCap / std) * 100;
            row.Efficiency = effVal.toFixed(1) + "%";
        } else {
            row.Efficiency = "";
        }
    } else {
        row.Avg_Time_Min = "";
        row.Capacity_pcs_hr = "";
        row.Standard_pcs_hr = "";
        row.Efficiency = "";
    }

    updateOverallMetrics();
}

// Implements Section C Skill Determination calculation:
// S = (Ge x WF) of highest skill operation + Sum of (Ge x WF) of other operations / 16
function updateOverallMetrics() {
    let validRows = rows.value.filter(r => {
        let effNum = parseFloat(r.Efficiency) || 0;
        return r.Operation_Name && effNum >= 60.01;
    });

    if (validRows.length === 0) {
        formData.Total_Grade_Point = "0.00";
        formData.Average_Efficiency = "0.00%";
        formData.Efficiency = "0.00%";
        formData.Grade_Assigned = "H";
        formData.Salary_As_Per_Grade = "12500";
        formData.Proposed_Salary = "12500";
        formData.Total_SMV = "0.000";
        return;
    }

    let calculatedItems = validRows.map(r => {
        let eff = parseFloat(r.Efficiency) || 0;
        let ge = getGradePoint(eff);
        let gradeLetter = (r.Oper_Grade || 'P').trim();
        let wf = weightFactors[gradeLetter] || 1.00;
        return {
            score: ge * wf,
            eff: eff,
            smv: parseFloat(r.SMV) || 0
        };
    });

    // Sort descending by score to pick highest skill operation
    calculatedItems.sort((a, b) => b.score - a.score);

    let highestOpScore = calculatedItems[0].score;
    let otherOpsSum = calculatedItems.slice(1).reduce((sum, item) => sum + item.score, 0);

    let totalScoreS = highestOpScore + (otherOpsSum / 16.0);
    totalScoreS = Math.min(totalScoreS, 5.00); // Max 5 point scale

    let avgEff = calculatedItems.reduce((sum, item) => sum + item.eff, 0) / calculatedItems.length;
    let totalSmv = calculatedItems.reduce((sum, item) => sum + item.smv, 0);

    formData.Total_Grade_Point = totalScoreS.toFixed(2);
    formData.Average_Efficiency = avgEff.toFixed(2) + "%";
    formData.Efficiency = formData.Average_Efficiency;
    formData.Total_SMV = totalSmv.toFixed(3);

    const evaluationResult = getGradeAndSalary(totalScoreS);
    formData.Grade_Assigned = evaluationResult.grade;
    formData.Salary_As_Per_Grade = evaluationResult.salary;
    formData.Proposed_Salary = evaluationResult.salary.replace(/[^0-9]/g, ''); // Extract numeric salary default
}

function addRow() {
    rows.value.push({
        ID: '',
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
        availableOperations: []
    });
}

function deleteRow(index) {
    if (rows.value.length > 1) {
        rows.value.splice(index, 1);
        updateOverallMetrics();
    } else {
        alert("At least one operation row is required.");
    }
}

async function submitForm() {
    isLoading.value = true;

    const headerId = 'HDR-' + Date.now();
    const timestamp = new Date().toISOString().split('T')[0];

    formData.Header_ID = headerId;
    formData.Created_Date = timestamp;

    const headerPayload = { ...formData };
    delete headerPayload.feedback; // Keep clean schema payload

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
            alert('Evaluation data successfully saved to Google Sheets!');
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