<template>
  <div class="m-0 p-0 w-100 overflow-hidden">
    <form @submit.prevent="handleLibraryFormSubmit">
      <div class="card border-0 rounded-0 m-0 p-0 shadow-none bg-white w-100">
        <div class="card-header bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center rounded-0">
          <h6 class="m-0 fw-bold text-dark d-flex align-items-center gap-2">
            <i class="bi bi-journal-text text-primary"></i> 
            Edit Operations Library
          </h6>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-outline-secondary btn-xs px-2 py-0.5 rounded-0" @click="$emit('cancelEdit')" style="font-size: 0.7rem;">
              ← Back to List
            </button>
            <span class="badge bg-light text-secondary border font-monospace px-2 py-0.5" style="font-size: 0.7rem;">SMV Management Module</span>
          </div>
        </div>

        <div class="card-body bg-white p-2 m-0 w-100">
          <div class="border border-light-subtle p-2 mb-2 bg-light rounded-0">
            <div class="row g-2 align-items-center">
              <div class="col-md-4">
                <label for="uniqueItemSelect" class="form-label text-secondary fw-semibold mb-1" style="font-size: 0.75rem;">Item Name</label>
                <select id="uniqueItemSelect" v-model="form.itemName" class="form-select form-select-xs shadow-none py-1 rounded-0" disabled>
                  <option value="">-- Select Item --</option>
                  <option v-for="item in cachedItems" :key="item" :value="item">
                    {{ item }}
                  </option>
                </select>
              </div>
              <div class="col-md-2">
                <label for="size" class="form-label text-secondary fw-semibold mb-1" style="font-size: 0.75rem;">Garments Size</label>
                <input type="text" id="size" v-model="form.size" class="form-control form-control-xs shadow-none py-1 rounded-0" placeholder="e.g., S, M, L">
              </div>
            </div>
          </div>

          <!-- Relative Data Grid Table -->
          <div class="table-responsive m-0 p-0 border border-light-subtle w-100">
            <table class="table table-bordered table-hover align-middle m-0 w-100 excel-table">
              <thead class="table-light text-uppercase text-secondary">
                <tr>
                  <th style="width: 30px;" class="text-center">SL</th>
                  <th style="width: 75px;">Op Code</th>
                  <th style="width: 110px;">Machine Type</th>
                  <th style="width: 90px;">Machine Tools</th>
                  <th>Process Description</th>
                  <th style="width: 55px;" class="text-center">Grade</th>
                  <th style="width: 60px;" class="text-end">Seam Len</th>
                  <th style="width: 50px;" class="text-end">Freq</th>
                  <th style="width: 50px;" class="text-end">SPI</th>
                  <th style="width: 70px;" class="text-center">Skill</th>
                  <th style="width: 60px;" class="text-end">SMV</th>
                  <th style="width: 65px;" class="text-center">Target</th>
                  <th style="width: 32px;" class="text-center">Act</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in operations" :key="index">
                  <td class="text-center text-muted fw-bold" style="font-size: 0.7rem;">{{ index + 1 }}</td>
                  <td>
                    <input type="text" class="form-control form-control-xs text-center bg-light font-monospace fw-semibold px-1 py-0 rounded-0" :value="row.opCode" readonly>
                  </td>
                  <td>
                    <select class="form-select form-select-xs shadow-none px-1 py-0 rounded-0" v-model="row.machineType" @change="handleMachineTypeChange(index)">
                      <option value="">-- Select --</option>
                      <option v-for="machine in cachedMachineTypes" :key="machine" :value="machine">{{ machine }}</option>
                    </select>
                  </td>
                  <td><input type="text" class="form-control form-control-xs shadow-none px-1 py-0 rounded-0" v-model="row.machineTools" placeholder="Tools"></td>
                  <td><input type="text" class="form-control form-control-xs shadow-none px-1 py-0 rounded-0" v-model="row.processDesc" placeholder="Operation Name"></td>
                  <td><input type="text" class="form-control form-control-xs shadow-none text-center px-0.5 py-0 rounded-0" v-model="row.operationGrade"></td>
                  <td><input type="text" class="form-control form-control-xs shadow-none text-end px-0.5 py-0 rounded-0" v-model="row.seamLength"></td>
                  <td><input type="text" class="form-control form-control-xs shadow-none text-end px-0.5 py-0 rounded-0" v-model="row.seamFreq"></td>
                  <td><input type="text" class="form-control form-control-xs shadow-none text-end px-0.5 py-0 rounded-0" v-model="row.spi"></td>
                  <td>
                    <input type="text" class="form-control form-control-xs text-center bg-light font-monospace px-1 py-0 rounded-0" v-model="row.skill" readonly>
                  </td>
                  <td>
                    <input type="number" step="0.001" min="0" class="form-control form-control-xs shadow-none text-end font-monospace px-1 py-0 rounded-0" v-model.number="row.smv" @input="calculateTarget(row)">
                  </td>
                  <td class="text-center fw-bold font-monospace bg-light text-success py-0" style="font-size: 0.75rem;">
                    {{ row.target100 }}
                  </td>
                  <td class="text-center p-0">
                    <button type="button" class="btn btn-outline-danger btn-xs border-0 px-1 py-0 text-danger rounded-0" @click="removeRow(index)" title="Remove Row">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="d-flex justify-content-between align-items-center mt-2 px-0">
            <button type="button" class="btn btn-outline-secondary btn-xs px-2 py-1 bg-white rounded-0" @click="addLibraryRow" style="font-size: 0.75rem;">
              + Add Row Manually
            </button>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-outline-secondary btn-xs px-3 py-1 rounded-0" @click="$emit('cancelEdit')" style="font-size: 0.75rem;">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary btn-xs px-3 py-1 fw-bold rounded-0" style="font-size: 0.75rem;">
                Update Operations
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { smvAPI } from '@/services/smv_api';

const props = defineProps({
  editData: { type: Object, default: null }
});

const emit = defineEmits(['saved', 'cancelEdit']);

const cachedMachineTypes = ref([]);
const cachedItems = ref([]);
let currentOpCodeNum = 1001;

const form = reactive({ itemName: '', size: '' });
const operations = ref([]);

onMounted(() => {
  loadSmvItems();
  loadMachineTypes();
  if (props.editData) {
    populateEditData(props.editData);
  }
});

watch(() => props.editData, (newVal) => {
  if (newVal) populateEditData(newVal);
});

function populateEditData(data) {
  console.log("Populating Form with Backend Data:", data);
  
  form.itemName = data.itemName || data['Item Name'] || '';
  form.size = data.size || data['Garments Size'] || '';

  if (form.itemName && !cachedItems.value.includes(form.itemName)) {
    cachedItems.value.push(form.itemName);
  }

  if (Array.isArray(data.operations) && data.operations.length > 0) {
    operations.value = data.operations.map(op => {
      const smvVal = parseFloat(op.smv || op['SMV'] || 0);
      return {
        // Explicitly map using your exact Google Sheet JSON keys
        opCode: op.opCode || op['Op Code'] || `OP-${currentOpCodeNum++}`,
        machineType: op.machineType || op['Machine Type'] || '',
        machineTools: op.machineTools || op['Machine Tools'] || '',
        processDesc: op.processDesc || op['Process Description'] || '',
        operationGrade: op.operationGrade || op['Operation Grade'] || '',
        seamLength: op.seamLength || op['Seam Length'] || '',
        seamFreq: op.seamFreq || op['Seam Freq'] || '',
        spi: op.spi || op['SPI'] || '',
        skill: op.skill || op['Skill'] || 'Operator',
        smv: smvVal,
        target100: smvVal > 0 ? Math.round(60 / smvVal) : 0
      };
    });
  } else {
    addLibraryRow();
  }
}

function parseItemData(dataList) {
  if (!Array.isArray(dataList)) return [];
  return [...new Set(dataList.map(item => typeof item === 'object' ? (item['Item Name'] || item.itemName || item.name || '') : String(item)).filter(Boolean))];
}

function parseMachineData(dataList) {
  if (!Array.isArray(dataList)) return [];
  return [...new Set(dataList.map(item => typeof item === 'object' ? (item['Machine Type'] || item.machineType || '') : String(item)).filter(Boolean))];
}

function addLibraryRow() {
  operations.value.push({
    opCode: `OP-${currentOpCodeNum++}`,
    machineType: '',
    machineTools: '',
    processDesc: '',
    operationGrade: '',
    seamLength: '',
    seamFreq: '',
    spi: '',
    skill: 'Operator',
    smv: 0,
    target100: 0
  });
}

function handleMachineTypeChange(index) {
  const row = operations.value[index];
  if (!row) return;
  const selectedMachine = (row.machineType || '').toUpperCase().trim();
  row.skill = (selectedMachine === 'MANUAL' || selectedMachine === 'HELPER') ? 'Helper' : 'Operator';
  if (row.machineType !== '' && index === operations.value.length - 1) {
    addLibraryRow();
  }
}

function calculateTarget(row) {
  const smvVal = parseFloat(row.smv) || 0;
  row.target100 = smvVal > 0 ? Math.round(60 / smvVal) : 0;
}

function removeRow(index) {
  if (operations.value.length > 1) operations.value.splice(index, 1);
}

async function loadSmvItems() {
  try {
    const items = parseItemData(await smvAPI.getItems());
    cachedItems.value = items;
    if (form.itemName && !cachedItems.value.includes(form.itemName)) {
      cachedItems.value.push(form.itemName);
    }
  } catch (err) { console.error(err); }
}

async function loadMachineTypes() {
  try {
    cachedMachineTypes.value = parseMachineData(await smvAPI.getMachines());
  } catch (err) { console.error(err); }
}

async function handleLibraryFormSubmit() {
  if (!form.itemName.trim()) {
    alert("Item Name is required.");
    return;
  }
  const validOperations = operations.value.filter(op => op.machineType || op.processDesc || op.smv > 0);
  if (validOperations.length === 0) {
    alert("Please enter at least one valid operation.");
    return;
  }

  const payload = { item_Name: form.itemName.trim(), size: form.size.trim(), operations: validOperations };
  try {
    if (typeof smvAPI.updateRecord === 'function') {
      await smvAPI.updateRecord('Operations', payload);
    }
    alert("Operations updated successfully!");
    emit('saved');
  } catch (error) {
    alert("Failed to save: " + (error?.message || error));
  }
}
</script>

<style scoped>
.excel-table th {
  font-size: 0.65rem;
  font-weight: 600;
  background-color: #f1f3f5 !important;
  color: #495057;
  padding: 4px 2px;
}
.excel-table td { padding: 0; vertical-align: middle; }
.form-control-xs, .form-select-xs { font-size: 0.72rem; border-radius: 0 !important; }
.btn-xs { font-size: 0.7rem; padding: 1px 4px; border-radius: 0 !important; }
</style>