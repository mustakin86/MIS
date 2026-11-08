<template>
  <div class="excel-sheet-wrapper">
    <!-- SHEET TOP BAR / TITLE -->
    <div class="sheet-title-bar px-3 py-2 border-bottom d-flex align-items-center justify-content-between bg-white">
      <div class="d-flex align-items-center gap-2">
        <h6 class="m-0 fw-bold text-dark font-monospace">Operation Breakdown (Edit Mode)</h6>
      </div>
      <span class="text-muted small font-monospace">Status: {{ isEditing ? 'Editing PO: ' + form.poNo : 'Ready'
      }}</span>
    </div>

    <!-- FORM GRID HEADER FIELDS -->
    <div class="excel-form-section p-1 border-bottom">
      <div class="row g-2">
        <div class="col-md-3">
          <div class="excel-field-group">
            <span class="excel-label">Buyer</span>
            <input type="text" class="excel-cell-input" v-model="form.buyer" />
          </div>
          <div class="excel-field-group">
            <span class="excel-label">PO No</span>
            <input type="text" class="excel-cell-input" v-model="form.poNo" />
          </div>
          <div class="excel-field-group">
            <span class="excel-label">Style No</span>
            <input type="text" class="excel-cell-input" v-model="form.styleNo" />
          </div>
          <div class="excel-field-group">
            <span class="excel-label">Order Qty</span>
            <input type="number" class="excel-cell-input" v-model="form.orderQty" min="0" />
          </div>
        </div>

        <div class="col-md-3">
          <div class="excel-field-group">
            <span class="excel-label">Select Item *</span>
            <select class="excel-cell-input" v-model="form.item" :class="{ 'input-error': itemHasError }"
              @change="handleItemChange" ref="itemSelectRef">
              <option value="">-- Select Item --</option>
              <option v-for="itm in itemList" :key="itm" :value="itm">{{ itm }}</option>
            </select>
          </div>
          <div class="excel-field-group">
            <span class="excel-label">Fabric Type</span>
            <select class="excel-cell-input" v-model="form.fabricType">
              <option value="">-- Select Fabric --</option>
              <option value="Single Jersey">Single Jersey</option>
              <option value="Rib">Rib</option>
              <option value="Fleece">Fleece</option>
            </select>
          </div>
          <div class="excel-field-group">
            <span class="excel-label">Item Description</span>
            <input type="text" class="excel-cell-input" v-model="form.itemDesc" />
          </div>
          <div class="excel-field-group">
            <span class="excel-label">Req Op</span>
            <input type="number" class="excel-cell-input" v-model="form.reqOp" min="0" />
          </div>
        </div>

        <div class="col-md-3">
          <div class="excel-field-group">
            <span class="excel-label">Productivity/Hr</span>
            <input type="number" class="excel-cell-input" v-model="form.productivityHr" min="0" />
          </div>
          <div class="excel-field-group">
            <span class="excel-label">CPM</span>
            <input type="number" step="0.001" class="excel-cell-input" v-model="form.cpm" />
          </div>
          <div class="excel-field-group">
            <span class="excel-label">Efficiency</span>
            <input type="text" class="excel-cell-input" v-model="form.efficiency" />
          </div>
          <div class="excel-field-group">
            <span class="excel-label">Total SMV</span>
            <input type="number" step="0.001" class="excel-cell-input excel-readonly font-monospace fw-bold"
              :value="totalSmvFormatted" readonly />
          </div>
        </div>

        <div class="col-md-3 d-flex align-items-center">
          <div
            class="excel-image-placeholder w-100 h-100 d-flex align-items-center justify-content-center text-muted text-center p-2">
            <span class="small font-monospace">📷 [Image Preview Box]</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN EXCEL DATA GRID -->
    <div class="excel-grid-container bg-white">
      <div class="excel-tab-bar px-2 pt-2 bg-light border-bottom d-flex">
        <button type="button" class="excel-tab active">📋 Sewing_Section</button>
      </div>

      <div class="table-responsive excel-table-scroll">
        <table class="table excel-spreadsheet-table mb-0 align-middle">
          <thead>
            <tr class="text-center">
              <th style="width: 40px;" class="excel-header-cell">#</th>
              <th style="width: 100px;" class="excel-header-cell">Op Code</th>
              <th style="width: 150px;" class="excel-header-cell">Machine Type</th>
              <th style="width: 120px;" class="excel-header-cell">Machine Tools</th>
              <th class="excel-header-cell text-start">Process Description</th>
              <th style="width: 90px;" class="excel-header-cell">Seam Length</th>
              <th style="width: 80px;" class="excel-header-cell">Seam Freq</th>
              <th style="width: 95px;" class="excel-header-cell">Skill</th>
              <th style="width: 85px;" class="excel-header-cell">SMV</th>
              <th style="width: 90px;" class="excel-header-cell">Target(100%)</th>
              <th style="width: 45px;" class="excel-header-cell">✕</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in operations" :key="row.id" class="excel-row">
              <td class="text-center excel-cell bg-light font-monospace text-muted small fw-semibold">
                {{ index + 1 }}
              </td>
              <td class="excel-cell p-0">
                <select class="excel-grid-input text-center font-monospace" v-model="row.opCode"
                  @change="onOpCodeChange(row, index)">
                  <option value="">-- Code --</option>
                  <option v-for="op in row.availableOperations" :key="op.OpCode || op.Op_Code || op.opCode"
                    :value="op.OpCode || op.Op_Code || op.opCode">
                    {{ op.OpCode || op.Op_Code || op.opCode }}
                  </option>
                </select>
              </td>
              <td class="excel-cell p-0">
                <input type="text" class="excel-grid-input excel-readonly" v-model="row.machineType" readonly
                  tabindex="-1" />
              </td>
              <td class="excel-cell p-0">
                <input type="text" class="excel-grid-input" v-model="row.machineTools" />
              </td>
              <td class="excel-cell p-0">
                <input type="text" class="excel-grid-input excel-readonly" v-model="row.operation" readonly
                  tabindex="-1" />
              </td>
              <td class="excel-cell p-0">
                <input type="number" step="0.01" min="0" class="excel-grid-input text-end font-monospace"
                  v-model.number="row.seamLength" @input="calculateRowSmv(row, true)" />
              </td>
              <td class="excel-cell p-0">
                <input type="number" step="1" min="0" class="excel-grid-input text-end font-monospace"
                  v-model.number="row.seamFreq" @input="calculateRowSmv(row, true)" />
              </td>
              <td class="excel-cell p-0">
                <input type="text" class="excel-grid-input text-center excel-readonly fw-medium" v-model="row.skill"
                  readonly tabindex="-1" />
              </td>
              <td class="excel-cell p-0">
                <input type="number" step="0.001" min="0"
                  class="excel-grid-input text-end font-monospace fw-bold text-primary" v-model.number="row.smv"
                  @input="calculateRowSmv(row, false)" />
              </td>
              <td class="text-center excel-cell bg-light font-monospace fw-bold text-success">
                {{ row.target100 }}
              </td>
              <td class="text-center excel-cell p-0">
                <button type="button" class="btn btn-link text-danger p-0 w-100 h-100 text-decoration-none fw-bold"
                  @click="removeRow(index)">×</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- BOTTOM SUMMARY -->
      <div class="excel-bottom-panel p-1 bg-light border-top">
        <div class="row g-4">
          <div class="col-md-5">
            <div class="excel-section-title mb-1">SIGNATURE BLOCK</div>
            <table class="table excel-summary-table mb-0">
              <thead>
                <tr>
                  <th style="width: 35%;">Role</th>
                  <th>Signature / Name</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="fw-semibold bg-light">Prepared By</td>
                  <td class="p-0"><input type="text" class="excel-grid-input border-0" v-model="signatures.prepBy"
                      placeholder="Enter name" /></td>
                </tr>
                <tr>
                  <td class="fw-semibold bg-light">Checked By</td>
                  <td class="p-0"><input type="text" class="excel-grid-input border-0" v-model="signatures.checkBy"
                      placeholder="Enter name" /></td>
                </tr>
                <tr>
                  <td class="fw-semibold bg-light">Approved By</td>
                  <td class="p-0"><input type="text" class="excel-grid-input border-0" v-model="signatures.appBy"
                      placeholder="Enter name" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="col-md-3"></div>
          <div class="col-md-4">
            <div class="excel-section-title mb-1">SUMMARY CALCULATIONS</div>
            <table class="table excel-summary-table mb-0 font-monospace">
              <thead>
                <tr>
                  <th>Section</th>
                  <th class="text-end">Total SMV</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="font-sans-serif">Sewing SMV</td>
                  <td class="text-end">{{ totalSewingSmvFormatted }}</td>
                </tr>
                <tr class="fw-bold bg-white">
                  <td class="font-sans-serif text-dark">Grand Total</td>
                  <td class="text-end text-primary">{{ totalSmvFormatted }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER ACTIONS -->
    <div class="excel-footer-bar p-2 bg-white border-top d-flex justify-content-end gap-2">
      <button type="button" class="btn btn-success btn-sm px-4 fw-semibold font-monospace shadow-sm"
        :disabled="isSubmitting" @click="handleSave">
        {{ isSubmitting ? 'SAVING CHANGES...' : '💾 UPDATE RECORD' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { dbAPI as smvAPI } from '@/services/operations_api.js';
import { obAPI } from '@/services/operation_breakdown_api.js';

const route = useRoute();
const isSubmitting = ref(false);
const isEditing = ref(false);
const existingHeaderId = ref(null);

const itemHasError = ref(false);
const itemSelectRef = ref(null);

const itemList = ref([]);
const currentFilteredOps = ref([]);

const form = reactive({
  buyer: '', poNo: '', styleNo: '', orderQty: '',
  item: '', fabricType: '', itemDesc: '', reqOp: '',
  productivityHr: '', cpm: '', efficiency: ''
});

const signatures = reactive({ prepBy: '', checkBy: '', appBy: '' });
const operations = ref([]);

const totalSewingSmv = computed(() => operations.value.reduce((sum, row) => sum + (parseFloat(row.smv) || 0), 0));
const totalSewingSmvFormatted = computed(() => totalSewingSmv.value > 0 ? totalSewingSmv.value.toFixed(3) : '0.000');
const totalSmvFormatted = computed(() => totalSewingSmv.value > 0 ? totalSewingSmv.value.toFixed(3) : '0.000');

function createEmptyRow() {
  return {
    id: Date.now() + Math.random(),
    opCode: '', machineType: '', machineTools: '', operation: '',
    seamLength: '', seamFreq: '', skill: '', smv: '', target100: 0,
    availableOperations: [...currentFilteredOps.value]
  };
}

function addOperationRow() {
  operations.value.push(createEmptyRow());
}

function removeRow(index) {
  if (operations.value.length > 1) operations.value.splice(index, 1);
  else operations.value[0] = createEmptyRow();
}

function resetForm() {
  isEditing.value = false;
  existingHeaderId.value = null;
  Object.keys(form).forEach(key => form[key] = '');
  Object.keys(signatures).forEach(key => signatures[key] = '');
  itemHasError.value = false;
  currentFilteredOps.value = [];
  operations.value = [createEmptyRow()];
}

async function initDropdownData() {
  try {
    const res = await smvAPI.readRecords('Operations');
    const records = res.data || res;
    if (records && records.length) {
      itemList.value = [...new Set(records.map(r => r.Item || r.item || r.Item_Name).filter(Boolean))];
    }
  } catch (err) {
    console.error("Failed to load items:", err);
  }
}

async function handleItemChange() {
  if (!form.item || !form.item.trim()) {
    itemHasError.value = true;
    currentFilteredOps.value = [];
    return;
  }
  itemHasError.value = false;

  try {
    const res = await smvAPI.readRecords('Operations');
    const records = res.data || res;

    currentFilteredOps.value = records.filter(r => {
      const recordItem = r.Item || r.item || r.Item_Name;
      return recordItem && recordItem.toString().trim().toLowerCase() === form.item.trim().toLowerCase();
    });

    operations.value.forEach(row => {
      row.availableOperations = [...currentFilteredOps.value];
    });
  } catch (err) {
    console.error("Error fetching operations:", err);
  }
}

function onOpCodeChange(row, index) {
  const selectedOp = row.availableOperations.find(o => (o.OpCode || o.Op_Code || o.opCode) === row.opCode);
  if (selectedOp) {
    row.machineType = selectedOp.MachineType || selectedOp.Machine_Type || '';
    row.operation = selectedOp.ProcessDescription || selectedOp.Process_Description || '';
    row.machineTools = selectedOp.MachineTools || selectedOp.Machine_Tools || '';
    row.seamLength = selectedOp.Seam_Length || selectedOp.seamLength || 0;
    row.seamFreq = selectedOp.SeamFreq || selectedOp.Seam_Freq || 1;
    row.skill = selectedOp.Skill || 'Operator';
    row.smv = selectedOp.SMV || 0;
    calculateRowSmv(row, false);

    if (index === operations.value.length - 1) addOperationRow();
  }
}

function calculateRowSmv(row, computeFromFormula = true) {
  let smv = computeFromFormula ? (parseFloat(row.seamLength) || 0) * (parseFloat(row.seamFreq) || 0) * (parseFloat(row.perCmSmv) || 0) : (parseFloat(row.smv) || 0);
  row.smv = smv > 0 ? parseFloat(smv.toFixed(3)) : '';
  row.target100 = smv > 0 ? Math.round(60 / smv) : 0;
}

function validateForm() {
  if (!form.item || !form.item.trim()) {
    alert("Please select an Item Name.");
    itemHasError.value = true;
    if (itemSelectRef.value) itemSelectRef.value.focus();
    return false;
  }
  itemHasError.value = false;
  return true;
}

// Fetch existing record data if ?po= query param is present
async function fetchRecordByPO(poQuery) {
  try {
    const headerRes = await obAPI.readRecords('Header');
    const headerRecords = headerRes.data || headerRes;

    if (!Array.isArray(headerRecords)) return;

    const matchedHeader = headerRecords.find(h =>
      String(h.PO_No || h.PO || h.poNo) === String(poQuery)
    );

    if (!matchedHeader) {
      console.warn("No header found for PO:", poQuery);
      return;
    }

    isEditing.value = true;
    // Robustly check multiple naming conventions for HeaderID
    existingHeaderId.value = matchedHeader.HeaderID || matchedHeader.Header_ID || matchedHeader.id || matchedHeader.ID;

    form.buyer = matchedHeader.Buyer || '';
    form.poNo = matchedHeader.PO_No || matchedHeader.PO || '';
    form.styleNo = matchedHeader.Style_No || matchedHeader.Style || '';
    form.orderQty = matchedHeader.Order_Qty || matchedHeader.OrderQty || '';
    form.item = matchedHeader.Item || '';
    form.fabricType = matchedHeader.Fabric_Type || matchedHeader.FabricType || '';
    form.itemDesc = matchedHeader.Item_Desc || matchedHeader.ItemDesc || '';
    form.reqOp = matchedHeader.Req_Op || matchedHeader.ReqOp || '';
    form.productivityHr = matchedHeader.Productivity_Hr || matchedHeader.ProductivityHr || '';
    form.cpm = matchedHeader.CPM || '';
    form.efficiency = matchedHeader.Efficiency || '';

    signatures.prepBy = matchedHeader.Prepared_By || '';
    signatures.checkBy = matchedHeader.Checked_By || '';
    signatures.appBy = matchedHeader.Approved_By || '';

    await handleItemChange();

    const breakdownRes = await obAPI.readRecords('Breakdown');
    const breakdownRecords = breakdownRes.data || breakdownRes;

    if (Array.isArray(breakdownRecords)) {
      const matchedRows = breakdownRecords.filter(b =>
        String(b.HeaderID) === String(existingHeaderId.value) || String(b.PO_No) === String(poQuery)
      );

      if (matchedRows.length > 0) {
        operations.value = matchedRows.map((b, index) => ({
          id: Date.now() + index,
          opCode: b.Op_Code || b.OpCode || '',
          machineType: b.Machine_Type || b.MachineType || '',
          machineTools: b.Machine_Tools || b.MachineTools || '',
          operation: b.Process_Description || b.ProcessDescription || '',
          seamLength: b.Seam_Length || b.SeamLength || '',
          seamFreq: b.Seam_Freq || b.SeamFreq || '',
          skill: b.Skill || 'Operator',
          smv: parseFloat(b.SMV) || '',
          target100: b.Target || 0,
          availableOperations: [...currentFilteredOps.value]
        }));
      }
    }

    if (!operations.value.some(r => !r.opCode)) {
      operations.value.push(createEmptyRow());
    }

  } catch (err) {
    console.error("Failed to load record for editing:", err);
  }
}

async function handleSave() {
  if (!validateForm()) return;
  isSubmitting.value = true;

  // Ensure we have a valid HeaderID
  const headerId = isEditing.value && existingHeaderId.value
    ? existingHeaderId.value
    : 'OB-' + Date.now();

  const timestamp = new Date().toISOString().split('T')[0];

  const headerPayload = {
    HeaderID: headerId,
    id: headerId, // Included for updateRecord helper compatibility
    Buyer: form.buyer,
    PO_No: form.poNo,
    Style_No: form.styleNo,
    Item_Desc: form.itemDesc,
    Item: form.item,
    Fabric_Type: form.fabricType,
    Order_Qty: form.orderQty,
    Req_Op: form.reqOp,
    Productivity_Hr: form.productivityHr,
    CPM: form.cpm,
    Efficiency: form.efficiency,
    Total_SMV: totalSmvFormatted.value,
    Created_Date: timestamp,
    Prepared_By: signatures.prepBy,
    Checked_By: signatures.checkBy,
    Approved_By: signatures.appBy
  };

  const validOperations = operations.value
    .filter(row => row.opCode || row.operation)
    .map((row, index) => ({
      ID: row.ID || `BRK-${Date.now()}-${index + 1}`,
      HeaderID: headerId,
      Op_Code: row.opCode,
      Machine_Type: row.machineType,
      Machine_Tools: row.machineTools,
      Process_Description: row.operation,
      Seam_Length: row.seamLength,
      Seam_Freq: row.seamFreq,
      Skill: row.skill,
      SMV: parseFloat(row.smv) || 0,
      Target: row.target100
    }));

  // Structure payload properly matching backend expectations
  const fullPayload = {
    ...headerPayload,
    breakdownItems: validOperations // Backend expects 'breakdownItems' during updates
  };

  try {
    let response;
    if (isEditing.value) {
      // Explicitly call updateRecord when editing
      response = await obAPI.updateRecord('Header', headerId, fullPayload);
    } else {
      // Call createRecord when creating a brand new item
      response = await obAPI.createRecord('Header', { ...fullPayload, breakdown: validOperations });
    }

    if (response && response.status === 'ERROR') {
      throw new Error(response.message);
    }

    alert("Record successfully saved and updated in Google Sheets!");
  } catch (err) {
    console.error("Save/Update error:", err);
    alert("Failed to save data: " + err.message);
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  await initDropdownData();
  const poQuery = route.query.po;
  if (poQuery) {
    await fetchRecordByPO(poQuery);
  } else {
    resetForm();
  }
});
</script>

<style scoped>
.excel-sheet-wrapper {
  background-color: #f3f3f3;
  border: 1px solid #c0c0c0;
  font-family: 'Segoe UI', Tahoma, sans-serif;
  font-size: 0.8rem;
}

.excel-form-section {
  background-color: #f9f9f9;
}

.excel-field-group {
  display: flex;
  align-items: center;
  margin-bottom: 1px;
  background: #fff;
  border: 1px solid #d4d4d4;
  border-radius: 2px;
}

.excel-label {
  width: 110px;
  background-color: #f1f1f1;
  color: #333;
  font-weight: 600;
  font-size: 0.72rem;
  padding: 3px 6px;
  border-right: 1px solid #d4d4d4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.excel-cell-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 2px 2px;
  font-size: 0.8rem;
  background: transparent;
  width: 100%;
}

.excel-cell-input:focus {
  background-color: #fff;
  box-shadow: inset 0 0 0 1px #107c41;
}

.excel-image-placeholder {
  border: 1px dashed #b0b0b0 !important;
  background-color: #fafafa;
  border-radius: 2px;
}

.excel-tab {
  background: #f8f9fa;
  border: 1px solid #c0c0c0;
  border-bottom: none;
  padding: 4px 14px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #555;
}

.excel-tab.active {
  background: #ffffff;
  color: #107c41;
  border-top: 2px solid #107c41;
}

.excel-spreadsheet-table {
  border-collapse: collapse;
  background-color: #ffffff;
}

.excel-header-cell {
  background-color: #f2f2f2 !important;
  color: #262626;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid #d4d4d4 !important;
  padding: 5px 4px !important;
}

.excel-cell {
  border: 1px solid #d4d4d4 !important;
  padding: 0 !important;
  height: 26px;
  vertical-align: middle;
}

.excel-grid-input {
  width: 100%;
  height: 25px;
  border: none;
  outline: none;
  padding: 0 4px;
  font-size: 0.78rem;
  background: transparent;
}

.excel-table-scroll {
  max-height: 450px;
  overflow-y: auto;
  border-bottom: 1px solid #d4d4d4;
}

.input-error {
  background-color: #f8d7da !important;
}

.excel-readonly {
  background-color: #f3f3f3 !important;
  color: #595959;
}

.excel-bottom-panel {
  background-color: #f4f4f4 !important;
  border-top: 1px solid #c0c0c0 !important;
}

.excel-section-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #595959;
}

.excel-summary-table {
  border: 1px solid #d4d4d4;
  background-color: #ffffff;
}

.excel-summary-table th,
.excel-summary-table td {
  border: 1px solid #d4d4d4;
  padding: 3px 6px;
  font-size: 0.78rem;
}
</style>