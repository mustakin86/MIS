<template>
  <div class="m-0 p-0 w-100 overflow-hidden">
    <form @submit.prevent="handleLibraryFormSubmit">
      <!-- SMV LIBRARY CARD -->
      <div class="card border-0 rounded-0 m-0 p-0 shadow-none bg-white w-100">
        <div class="card-header bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center rounded-0">
          <h6 class="m-0 fw-bold text-dark d-flex align-items-center gap-2">
            <i class="bi bi-journal-text text-primary"></i> 
            {{ isEditing ? 'Edit Operations Library' : 'Operations Library' }}
          </h6>
          <div class="d-flex align-items-center gap-2">
            <button v-if="isEditing" type="button" class="btn btn-outline-secondary btn-xs px-2 py-0.5 rounded-0" @click="$emit('cancelEdit')" style="font-size: 0.7rem;">
              ← Back to List
            </button>
            <span class="badge bg-light text-secondary border font-monospace px-2 py-0.5" style="font-size: 0.7rem;">SMV Management Module</span>
          </div>
        </div>

        <div class="card-body bg-white p-2 m-0 w-100">
          <!-- Item & Size Header Controls -->
          <div class="border border-light-subtle p-2 mb-2 bg-light rounded-0">
            <div class="row g-2 align-items-center">
              <div class="col-md-4">
                <label for="uniqueItemSelect" class="form-label text-secondary fw-semibold mb-1" style="font-size: 0.75rem;">Item Name</label>
                <select id="uniqueItemSelect" v-model="form.itemName" class="form-select form-select-xs shadow-none py-1 rounded-0" :disabled="isEditing">
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

          <!-- Data Grid Table Wrapper with 100% Fluid Width -->
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
                    <input 
                      type="text" 
                      class="form-control form-control-xs text-center bg-light font-monospace fw-semibold px-1 py-0 rounded-0" 
                      :value="row.opCode" 
                      readonly 
                    >
                  </td>
                  <td>
                    <select 
                      class="form-select form-select-xs shadow-none px-1 py-0 rounded-0" 
                      v-model="row.machineType"
                      @change="handleMachineTypeChange(index)"
                    >
                      <option value="">-- Select --</option>
                      <option v-for="machine in cachedMachineTypes" :key="machine" :value="machine">
                        {{ machine }}
                      </option>
                    </select>
                  </td>
                  <td><input type="text" class="form-control form-control-xs shadow-none px-1 py-0 rounded-0" v-model="row.machineTools" placeholder="Tools"></td>
                  <td><input type="text" class="form-control form-control-xs shadow-none px-1 py-0 rounded-0" v-model="row.processDesc" placeholder="Operation / Process Name"></td>
                  <td><input type="text" class="form-control form-control-xs shadow-none text-center px-0.5 py-0 rounded-0" v-model="row.operationGrade"></td>
                  <td><input type="text" class="form-control form-control-xs shadow-none text-end px-0.5 py-0 rounded-0" v-model="row.seamLength"></td>
                  <td><input type="text" class="form-control form-control-xs shadow-none text-end px-0.5 py-0 rounded-0" v-model="row.seamFreq"></td>
                  <td><input type="text" class="form-control form-control-xs shadow-none text-end px-0.5 py-0 rounded-0" v-model="row.spi"></td>
                  <td>
                    <input 
                      type="text" 
                      class="form-control form-control-xs text-center bg-light font-monospace px-1 py-0 rounded-0" 
                      v-model="row.skill" 
                      readonly 
                    >
                  </td>
                  <td>
                    <input 
                      type="number" 
                      step="0.001" 
                      min="0" 
                      class="form-control form-control-xs shadow-none text-end font-monospace px-1 py-0 rounded-0" 
                      v-model.number="row.smv"
                      @input="calculateTarget(row)"
                    >
                  </td>
                  <td class="text-center fw-bold font-monospace bg-light text-success py-0" style="font-size: 0.75rem;">
                    {{ row.target100 }}
                  </td>
                  <td class="text-center p-0">
                    <button type="button" class="btn btn-outline-danger btn-xs border-0 px-1 py-0 text-danger rounded-0" @click="removeRow(index)" title="Remove Row">
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Bottom Action Group -->
          <div class="d-flex justify-content-between align-items-center mt-2 px-0">

            <div class="d-flex gap-2">
              <button v-if="isEditing" type="button" class="btn btn-outline-secondary btn-xs px-3 py-1 rounded-0" @click="$emit('cancelEdit')" style="font-size: 0.75rem;">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary btn-xs px-3 py-1 fw-bold rounded-0" id="btn-save-smv" style="font-size: 0.75rem;">
                {{ isEditing ? 'Update Operations' : 'Save Operations' }}
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
  editData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['saved', 'cancelEdit']);

const cachedMachineTypes = ref([]);
const cachedItems = ref([]);
let currentOpCodeNum = 1001;

const form = reactive({
  itemName: '',
  size: ''
});

const operations = ref([]);
const isEditing = ref(false);

onMounted(() => {
  loadSmvItems();
  loadMachineTypes();
  
  if (props.editData) {
    populateEditData(props.editData);
  } else {
    fetchInitialOpCodeAndBuildFirstRow();
  }
});

// Watch for external prop changes if component is reused for different items
watch(() => props.editData, (newVal) => {
  if (newVal) {
    populateEditData(newVal);
  } else {
    resetForm();
  }
});

function populateEditData(data) {
  isEditing.value = true;
  form.itemName = data.itemName || data['Item Name'] || '';
  form.size = data.size || data['Garments Size'] || '';

  if (Array.isArray(data.operations) && data.operations.length > 0) {
    operations.value = data.operations.map(op => {
      const smvVal = parseFloat(op.smv || op.SMV || 0);
      return {
        opCode: op.opCode || op['Op Code'] || getNextOpCode(),
        machineType: op.machineType || op['Machine Type'] || '',
        machineTools: op.machineTools || op['Machine Tools'] || '',
        processDesc: op.processDesc || op['Process Description'] || '',
        operationGrade: op.operationGrade || op['Operation Grade'] || '',
        seamLength: op.seamLength || op['Seam Length'] || '',
        seamFreq: op.seamFreq || op['Seam Freq'] || '',
        spi: op.spi || op.SPI || '',
        skill: op.skill || op.Skill || 'Operator',
        smv: smvVal,
        target100: smvVal > 0 ? Math.round(60 / smvVal) : 0
      };
    });
  } else {
    fetchInitialOpCodeAndBuildFirstRow();
  }
}

// Dedicated parser for Item names matching your console keys
function parseItemData(dataList) {
  if (!Array.isArray(dataList)) return [];
  const extracted = dataList.map(item => {
    if (!item) return '';
    if (Array.isArray(item)) return String(item[0] || '').trim();
    if (typeof item === 'object') {
      const val = item['Item Name'] || item.itemName || item.item_Name || item.Item_Name || item.ItemName || item.name || item.Item || item.item || '';
      return String(val).trim();
    }
    return String(item).trim();
  }).filter(val => val !== '' && val.toLowerCase() !== 'undefined');
  return [...new Set(extracted)];
}

// Dedicated parser for Machine types matching your console keys
function parseMachineData(dataList) {
  if (!Array.isArray(dataList)) return [];
  const extracted = dataList.map(item => {
    if (!item) return '';
    if (Array.isArray(item)) return String(item[1] !== undefined ? item[1] : item[0]).trim();
    if (typeof item === 'object') {
      const val = item['MachineType'] || item.machineType || item.MachineType || '';
      return String(val).trim();
    }
    return String(item).trim();
  }).filter(val => val !== '' && val.toLowerCase() !== 'undefined');
  return [...new Set(extracted)];
}

function getNextOpCode() {
  const code = `OP-${currentOpCodeNum}`;
  currentOpCodeNum++;
  return code;
}

function fetchInitialOpCodeAndBuildFirstRow() {
  if (typeof google !== 'undefined' && google.script?.run) {
    google.script.run
      .withSuccessHandler((nextOpCode) => {
        const match = nextOpCode ? nextOpCode.match(/OP-(\d+)/i) : null;
        currentOpCodeNum = match ? parseInt(match[1], 10) : 1001;
        if (operations.value.length === 0) addLibraryRow();
      })
      .withFailureHandler((err) => {
        console.error("Failed to generate Op Code:", err);
        currentOpCodeNum = 1001;
        if (operations.value.length === 0) addLibraryRow();
      })
      .generateUniqueOpCode();
  } else {
    if (operations.value.length === 0) addLibraryRow();
  }
}

function addLibraryRow() {
  operations.value.push({
    opCode: getNextOpCode(),
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

  if (selectedMachine === 'MANUAL' || selectedMachine === 'HELPER') {
    row.skill = 'Helper';
  } else {
    row.skill = 'Operator';
  }

  if (row.machineType !== '' && index === operations.value.length - 1) {
    addLibraryRow();
  }
}

function calculateTarget(row) {
  const smvVal = parseFloat(row.smv) || 0;
  row.target100 = smvVal > 0 ? Math.round(60 / smvVal) : 0;
}

function removeRow(index) {
  if (operations.value.length > 1) {
    operations.value.splice(index, 1);
  } else {
    operations.value[0].machineType = '';
    operations.value[0].machineTools = '';
    operations.value[0].processDesc = '';
    operations.value[0].operationGrade = '';
    operations.value[0].seamLength = '';
    operations.value[0].seamFreq = '';
    operations.value[0].spi = '';
    operations.value[0].smv = 0;
    operations.value[0].target100 = 0;
  }
}

async function loadSmvItems() {
  try {
    const rawItems = await smvAPI.getItems();
    cachedItems.value = parseItemData(rawItems);
  } catch (err) {
    console.error("Failed to load items:", err);
  }
}

async function loadMachineTypes() {
  try {
    const rawMachines = await smvAPI.getMachines();
    cachedMachineTypes.value = parseMachineData(rawMachines);
  } catch (err) {
    console.error("Failed to load machine types:", err);
  }
}

function resetForm() {
  isEditing.value = false;
  form.itemName = '';
  form.size = '';
  operations.value = [];
  fetchInitialOpCodeAndBuildFirstRow();
}

async function handleLibraryFormSubmit() {
  if (!form.itemName.trim()) {
    alert("Please select an Item Name before saving.");
    document.getElementById('uniqueItemSelect')?.focus();
    return;
  }

  const validOperations = operations.value.filter(op => op.machineType || op.processDesc || op.smv > 0);

  if (validOperations.length === 0) {
    alert("Please enter at least one operation with a Machine Type or Process Description.");
    return;
  }

  const payload = {
    item_Name: form.itemName.trim(),
    size: form.size.trim(),
    operations: validOperations
  };

  try {
    if (isEditing.value) {
      // Call update record API if available, or create/overwrite
      if (typeof smvAPI.updateRecord === 'function') {
        await smvAPI.updateRecord('Operations', payload);
      } else {
        await smvAPI.createRecord('Operations', payload);
      }
      alert("Operations updated successfully!");
      emit('saved');
    } else {
      await smvAPI.createRecord('Operations', payload);
      alert("Operations saved successfully!");
      resetForm();
    }
  } catch (error) {
    alert("Failed to save Operations: " + (error?.message || error));
  }
}
</script>

<style scoped>
.excel-table th {
  font-size: 0.65rem;
  font-weight: 600;
  background-color: #f1f3f5 !important;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
  padding: 4px 2px;
  white-space: nowrap;
}

.excel-table td {
  padding: 0px 0px;
  vertical-align: middle;
}

.form-control-xs, .form-select-xs {
  font-size: 0.72rem;
  border-color: #ced4da;
  border-radius: 0 !important;
}

.form-control-xs:focus, .form-select-xs:focus {
  border-color: #86b7fe;
  box-shadow: none;
}

.btn-xs {
  font-size: 0.7rem;
  padding: 1px 4px;
  border-radius: 0 !important;
}
</style>