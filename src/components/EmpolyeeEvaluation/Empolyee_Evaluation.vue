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
                          <input type="text" v-model="formData.targetWorkerId" name="targetWorkerId">
                      </div>
                  </div>
                  <div class="target-row">
                      <div class="target-label">Evaluated Date:-</div>
                      <div class="target-input-cell">
                          <input type="date" v-model="formData.targetDate" name="targetDate">
                      </div>
                  </div>
                  <div class="target-row">
                      <div class="target-label">Employee Name:-</div>
                      <div class="target-input-cell">
                          <input type="text" v-model="formData.targetEmployeeName" name="targetEmployeeName">
                      </div>
                  </div>
                  <div class="target-row">
                      <div class="target-label">Group / Section:-</div>
                      <div class="target-input-cell">
                          <input type="text" v-model="formData.targetGroupSection" name="targetGroupSection">
                      </div>
                  </div>
                  <div class="target-row">
                      <div class="target-label">Designation:-</div>
                      <div class="target-input-cell">
                          <input type="text" v-model="formData.targetDesignation" name="targetDesignation">
                      </div>
                  </div>
              </div>
          </div>
          
          <div class="flex-col">
              <div class="target-grid">
                  <div class="target-row">
                      <div class="target-label">Total Grade Point:-</div>
                      <div class="target-input-cell">
                          <input type="text" v-model="formData.summaryTotalPoint" name="summaryTotalPoint" class="readonly-field" readonly>
                      </div>
                  </div>
                  <div class="target-row">
                      <div class="target-label">Grade Assigned:-</div>
                      <div class="target-input-cell">
                          <input type="text" v-model="formData.summaryGrade" name="summaryGrade" class="readonly-field" readonly>
                      </div>
                  </div>
                   <div class="target-row">
                      <div class="target-label">Average Efficiency:-</div>
                      <div class="target-input-cell">
                          <input type="text" v-model="formData.summaryAvgEfficiency" name="summaryAvgEfficiency" class="readonly-field" readonly>
                      </div>
                  </div>
                  <div class="target-row">
                      <div class="target-label">No of M/C Can Drive:-</div>
                      <div class="target-input-cell">
                          <input type="text" v-model="formData.achiveHourly" name="achiveHourly">
                      </div>
                  </div>
              </div>
          </div>

          <div class="flex-col">
              <div class="target-grid">
                  <div class="target-row">
                      <div class="target-label">Salary As Per Grade:-</div>
                      <div class="target-input-cell">
                          <input type="text" v-model="formData.summarySalary" name="summarySalary" class="readonly-field" readonly>
                      </div>
                  </div>
                  <div class="target-row">
                      <div class="target-label">Proposed Salary:-</div>
                      <div class="target-input-cell">
                          <input type="text" v-model="formData.summaryProposedSalary" name="summaryProposedSalary">
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
                      <th rowspan="2" style="width: 14%;">Operation Name</th>
                      <th rowspan="2" style="width: 7%;">M/C Code</th>
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
                          <select v-model="row.name" :name="`op${index + 1}_name`" @change="handleOperationChange(index)">
                              <option value="">-- Select Operation --</option>
                              <option v-for="op in operationList" :key="op" :value="op">{{ op }}</option>
                          </select>
                      </td>
                      <td><input type="text" v-model="row.code" :name="`op${index + 1}_code`"></td>
                      <td><input type="text" v-model="row.grade" :name="`op${index + 1}_grade`"></td>
                      <td><input type="text" v-model="row.cycle1" :name="`op${index + 1}_cycle1`" @input="calculateRow(index)"></td>
                      <td><input type="text" v-model="row.cycle2" :name="`op${index + 1}_cycle2`" @input="calculateRow(index)"></td>
                      <td><input type="text" v-model="row.cycle3" :name="`op${index + 1}_cycle3`" @input="calculateRow(index)"></td>
                      <td><input type="text" v-model="row.cycle4" :name="`op${index + 1}_cycle4`" @input="calculateRow(index)"></td>
                      <td><input type="text" v-model="row.cycle5" :name="`op${index + 1}_cycle5`" @input="calculateRow(index)"></td>
                      <td><input type="text" v-model="row.avgTime" :name="`op${index + 1}_avgTime`" class="readonly-field" readonly></td>
                      <td><input type="text" v-model="row.cap" :name="`op${index + 1}_cap`" class="readonly-field" readonly></td>
                      <td><input type="text" v-model="row.smv" :name="`op${index + 1}_smv`" class="readonly-field" readonly></td>
                      <td><input type="text" v-model="row.std" :name="`op${index + 1}_std`" @input="calculateRow(index)"></td>
                      <td><input type="text" v-model="row.eff" :name="`op${index + 1}_eff`" class="row-efficiency-input readonly-field" readonly></td>
                      <td><button type="button" class="btn-del-row" @click="deleteRow(index)">X</button></td>
                  </tr>
              </tbody>
          </table>
      </div>

      <div class="target-grid">
          <div class="target-row">
              <div class="target-label">Feedback / Remarks:-</div>
              <div class="target-input-cell">
                  <textarea v-model="formData.feedback" id="feedback" name="feedback" rows="3" style="height: auto; resize: vertical; padding: 4px; text-align: left;"></textarea>
              </div>
          </div>
      </div>

      <button type="submit" class="btn-submit">Submit Evaluation</button>
      <div style="clear: both;"></div>
      <div id="loading" :style="{ display: isLoading ? 'block' : 'none' }">Submitting entry to Google Sheets... Please wait.</div>
    </form>
  </div>
</template>

<script>
export default {
  name: "WorkerSkillEvaluation",
  data() {
    return {
      isLoading: false,
      operationList: [],
      formData: {
        targetWorkerId: "919556",
        targetDate: "2025-03-04",
        targetEmployeeName: "Sharmin",
        targetGroupSection: "",
        targetDesignation: "Jr. Operator (Overlock)",
        summaryTotalPoint: "2.59",
        summaryGrade: "C",
        summaryAvgEfficiency: "",
        achiveHourly: "",
        summarySalary: "13550",
        summaryProposedSalary: "13550",
        feedback: ""
      },
      rows: [
        {
          name: "",
          code: "",
          grade: "",
          cycle1: "",
          cycle2: "",
          cycle3: "",
          cycle4: "",
          cycle5: "",
          avgTime: "",
          cap: "",
          smv: "",
          std: "",
          eff: ""
        }
      ]
    };
  },
  mounted() {
    this.fetchOperations();
  },
  methods: {
    fetchOperations() {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler((response) => {
            this.operationList = (response && response.OpNo) ? response.OpNo : [];
          })
          .withFailureHandler((err) => {
            console.error("Failed to load operations: " + err.message);
          })
          .get_Operation_Dropdown_List();
      } else {
        // Fallback dummy data for standalone testing outside Google Apps Script
        this.operationList = ["Single Needle Lockstitch", "Overlock", "Flatlock"];
      }
    },

    handleOperationChange(index) {
      let currentRow = this.rows[index];
      let selectedOp = currentRow.name;

      if (selectedOp) {
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run
            .withSuccessHandler((details) => {
              if (details) {
                currentRow.code = details.machineCode || "";
                currentRow.grade = details.grade || "";
                currentRow.smv = details.smv || "";
                this.calculateRow(index);
              }
            })
            .withFailureHandler((err) => {
              console.error("Error fetching operation details: " + err.message);
            })
            .getOperationDetails(selectedOp);
        }
      } else {
        currentRow.code = "";
        currentRow.grade = "";
        currentRow.smv = "";
      }

      // Auto-add new row if it's the last row and an operation is chosen
      if (index === this.rows.length - 1 && selectedOp !== "") {
        this.addRow();
      }
    },

    calculateRow(index) {
      let row = this.rows[index];
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
        row.avgTime = avg_Min.toFixed(2);

        let capacity = avg > 0 ? (3600 / avg).toFixed(0) : "";
        row.cap = capacity;

        let smv = parseFloat(row.smv) || 0;
        let std = smv > 0 ? (60 / smv) : 0;
        row.std = std > 0 ? std.toFixed(0) : "";

        let numericCap = parseFloat(capacity) || 0;
        if (std > 0 && numericCap > 0) {
          row.eff = ((numericCap / std) * 100).toFixed(1) + "%";
        } else {
          row.eff = "";
        }
      } else {
        row.avgTime = "";
        row.cap = "";
        row.std = "";
        row.eff = "";
      }

      this.updateAverageEfficiency();
    },

    updateAverageEfficiency() {
      let totalEff = 0;
      let validCount = 0;

      this.rows.forEach(row => {
        let val = parseFloat(row.eff);
        if (!isNaN(val) && val > 0) {
          totalEff += val;
          validCount++;
        }
      });

      let avgEff = validCount > 0 ? (totalEff / validCount).toFixed(2) : "0.00";
      this.formData.summaryAvgEfficiency = avgEff + "%";
    },

    addRow() {
      this.rows.push({
        name: "",
        code: "",
        grade: "",
        cycle1: "",
        cycle2: "",
        cycle3: "",
        cycle4: "",
        cycle5: "",
        avgTime: "",
        cap: "",
        smv: "",
        std: "",
        eff: ""
      });
      this.updateAverageEfficiency();
    },

    deleteRow(index) {
      if (this.rows.length > 1) {
        this.rows.splice(index, 1);
        this.updateAverageEfficiency();
      } else {
        alert("At least one operation row is required.");
      }
    },

    submitForm() {
      this.isLoading = true;

      // Compile formData along with row information
      let payload = { ...this.formData };
      this.rows.forEach((row, i) => {
        let idx = i + 1;
        payload[`op${idx}_name`] = row.name;
        payload[`op${idx}_code`] = row.code;
        payload[`op${idx}_grade`] = row.grade;
        payload[`op${idx}_cycle1`] = row.cycle1;
        payload[`op${idx}_cycle2`] = row.cycle2;
        payload[`op${idx}_cycle3`] = row.cycle3;
        payload[`op${idx}_cycle4`] = row.cycle4;
        payload[`op${idx}_cycle5`] = row.cycle5;
        payload[`op${idx}_avgTime`] = row.avgTime;
        payload[`op${idx}_cap`] = row.cap;
        payload[`op${idx}_smv`] = row.smv;
        payload[`op${idx}_std`] = row.std;
        payload[`op${idx}_eff`] = row.eff;
      });

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler((response) => {
            this.isLoading = false;
            alert('Data successfully saved to Google Sheets!');
          })
          .withFailureHandler((error) => {
            this.isLoading = false;
            alert('Error saving data: ' + error.message);
          })
          .EmployeeEvaluationForm(payload);
      } else {
        setTimeout(() => {
          this.isLoading = false;
          alert('Mock submission successful! Payload built.');
          console.log(payload);
        }, 1000);
      }
    }
  }
};
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

.section-title {
    font-size: 11px;
    font-weight: 700;
    color: #ffffff;
    margin: 8px 0 4px 0;
    background-color: #1f4e78;
    padding: 3px 6px;
    border: 1px solid #103957;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.btn-add-row {
    background-color: #107c41;
    color: white;
    border: none;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: bold;
    cursor: pointer;
    border-radius: 2px;
}

.btn-add-row:hover {
    background-color: #0b5329;
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

.target-input-cell input, .target-input-cell select, .target-input-cell textarea {
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

.target-input-cell input:focus, .target-input-cell select:focus, .target-input-cell textarea:focus {
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

.spreadsheet-table th, .spreadsheet-table td {
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

.spreadsheet-table input[type="text"], .spreadsheet-table select {
    width: 100%;
    padding: 2px;
    border: 1px solid transparent;
    background: transparent;
    text-align: center;
    font-size: 10.5px;
    box-sizing: border-box;
    height: 20px;
}

.spreadsheet-table input[type="text"]:focus, .spreadsheet-table select:focus {
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