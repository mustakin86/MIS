<template>
  <div class="user-container">
    <!-- Excel Top Ribbon Header -->
    <div class="excel-ribbon">
      <div class="d-flex align-items-center justify-content-between px-3 py-1 bg-excel-green text-white">
        <div class="d-flex align-items-center gap-3">
          <div class="d-flex align-items-center gap-2">
            <div class="excel-icon-box bg-white text-success fw-bold rounded-1 px-1.5 py-0.5 small shadow-sm">X</div>
            <span class="fw-bold fs-6 tracking-wide">Machine_Inventory_Workbook.xlsx - Excel</span>
          </div>
        </div>
        <button @click="openAddModal" class="btn btn-light btn-sm text-success fw-bold px-3 shadow-sm py-1 font-monospace">
          + Insert Machine Row
        </button>
      </div>
    </div>

    <!-- Excel-Style Data Grid Table Container -->
    <div class="card excel-card shadow-sm">
      <div v-if="loading && machines.length === 0" class="text-center py-5 text-muted small font-monospace">
        <div class="spinner-border spinner-border-sm text-success me-2" role="status"></div>
        Reading workbook range from database...
      </div>
      
      <template v-else>
        <!-- Scrollable Table Wrapper -->
        <div class="excel-table-container">
          <table class="table table-bordered excel-table align-middle mb-0">
            <thead>
              <tr>
                <th style="width: 45px;" class="text-center excel-corner-header"></th>
                <th class="excel-col-header"><span class="text-muted fw-normal ms-1">Brand</span></th>
                <th class="excel-col-header"><span class="text-muted fw-normal ms-1">Machine Type</span></th>
                <th class="excel-col-header"><span class="text-muted fw-normal ms-1">RPM</span></th>
                <th class="excel-col-header"><span class="text-muted fw-normal ms-1">SPI</span></th>
                <th class="excel-col-header"><span class="text-muted fw-normal ms-1">Bobine</span></th>
                <th class="excel-col-header"><span class="text-muted fw-normal ms-1">Lopper</span></th>
                <th class="excel-col-header"><span class="text-muted fw-normal ms-1">Remarks</span></th>
                <th style="width: 120px;" class="text-center excel-col-header"><span>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(machine, index) in paginatedMachines" :key="machine.ID || machine.id" class="excel-row">
                <td class="text-center text-secondary excel-row-header fw-bold font-monospace">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td class="fw-semibold text-dark bg-white">{{ machine.Brand || '-' }}</td>
                <td class="text-dark bg-white font-monospace">{{ machine.MachineType || '-' }}</td>
                <td class="text-dark bg-white font-monospace">{{ machine.RPM || '-' }}</td>
                <td class="text-dark bg-white font-monospace">{{ machine.SPI || '-' }}</td>
                <td class="text-dark bg-white font-monospace">{{ machine.Bobine || '-' }}</td>
                <td class="text-dark bg-white font-monospace">{{ machine.Lopper || '-' }}</td>
                <td class="text-secondary font-monospace small bg-white">{{ machine.Remarks || '-' }}</td>
                <td class="text-center bg-white">
                  <button @click="editMachine(machine)" class="btn btn-xs btn-outline-success me-1 py-0 px-2 font-monospace">
                    Edit
                  </button>
                  <button @click="deleteMachine(machine)" class="btn btn-xs btn-outline-danger py-0 px-2 font-monospace">
                    Del
                  </button>
                </td>
              </tr>
              <tr v-if="machines.length === 0">
                <td colspan="9" class="text-center py-4 text-muted small font-monospace bg-white">No machine records found in range.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Spreadsheet Bottom Sheet Status Bar & Pagination -->
        <div class="excel-status-bar card-footer bg-white d-flex justify-content-between align-items-center py-1 px-2 border-top">
          <div class="d-flex align-items-center gap-2"></div>
          <div class="d-flex align-items-center gap-3">
            <span class="text-muted small font-monospace d-none d-sm-inline">
              Viewing rows {{ paginationStart }}–{{ paginationEnd }} of {{ machines.length }}
            </span>
            <div class="btn-group btn-group-sm" role="group">
              <button 
                class="btn btn-outline-secondary px-2 py-0 font-monospace text-dark" 
                :disabled="currentPage === 1" 
                @click="currentPage--"
              >
                ◀ Prev
              </button>
              <button class="btn btn-outline-secondary px-2 py-0 disabled text-dark bg-white font-monospace">
                {{ currentPage }} / {{ totalPages || 1 }}
              </button>
              <button 
                class="btn btn-outline-secondary px-2 py-0 font-monospace text-dark" 
                :disabled="currentPage >= totalPages" 
                @click="currentPage++"
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Machine Modal Popup -->
    <div class="modal fade" :class="{ show: showModal }" :style="{ display: showModal ? 'block' : 'none' }" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-success shadow-lg">
          <div class="modal-header py-2 bg-excel-green text-white">
            <h5 class="modal-title fs-6 fw-bold d-flex align-items-center gap-2">
              <i class="bi bi-table"></i> {{ isEditing ? 'Edit Machine Record' : 'Insert New Machine Row' }}
            </h5>
            <button type="button" class="btn-close btn-close-white btn-sm" @click="closeModal" aria-label="Close"></button>
          </div>
          <div class="modal-body py-3 bg-light">
            <div class="row g-2">
              <div class="col-md-6 mb-2">
                <label class="form-label small fw-bold text-secondary font-monospace">Brand</label>
                <input v-model="form.brand" class="form-control form-control-sm excel-input shadow-none" placeholder="Enter brand..." />
              </div>
              <div class="col-md-6 mb-2">
                <label class="form-label small fw-bold text-secondary font-monospace">Machine Type</label>
                <input v-model="form.machineType" class="form-control form-control-sm excel-input shadow-none" placeholder="Enter machine type..." />
              </div>
              <div class="col-md-3 mb-2">
                <label class="form-label small fw-bold text-secondary font-monospace">RPM</label>
                <input v-model="form.rpm" class="form-control form-control-sm excel-input shadow-none" placeholder="RPM..." />
              </div>
              <div class="col-md-3 mb-2">
                <label class="form-label small fw-bold text-secondary font-monospace">SPI</label>
                <input v-model="form.spi" class="form-control form-control-sm excel-input shadow-none" placeholder="SPI..." />
              </div>
              <div class="col-md-3 mb-2">
                <label class="form-label small fw-bold text-secondary font-monospace">Bobine</label>
                <input v-model="form.bobine" class="form-control form-control-sm excel-input shadow-none" placeholder="Bobine..." />
              </div>
              <div class="col-md-3 mb-2">
                <label class="form-label small fw-bold text-secondary font-monospace">Lopper</label>
                <input v-model="form.lopper" class="form-control form-control-sm excel-input shadow-none" placeholder="Lopper..." />
              </div>
              <div class="col-12 mb-1">
                <label class="form-label small fw-bold text-secondary font-monospace">Remarks</label>
                <input v-model="form.remarks" class="form-control form-control-sm excel-input shadow-none" placeholder="Optional remarks..." />
              </div>
            </div>
          </div>
          <div class="modal-footer py-2 bg-white">
            <button type="button" class="btn btn-outline-secondary btn-sm px-3 font-monospace" @click="closeModal">Cancel</button>
            <button @click="saveMachine" :disabled="loading" class="btn btn-success btn-sm px-4 font-monospace fw-bold">
              {{ loading ? 'Saving...' : (isEditing ? 'Commit Update' : 'Insert Row') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { dbAPI } from '@/services/machine_api'; 

const machines = ref([]);
const loading = ref(false);
const form = ref({
  brand: '',
  machineType: '',
  rpm: '',
  spi: '',
  bobine: '',
  lopper: '',
  remarks: ''
});
const isEditing = ref(false);
const editingId = ref(null);
const showModal = ref(false);

const currentPage = ref(1);
const pageSize = ref(8);

const totalPages = computed(() => Math.ceil(machines.value.length / pageSize.value) || 1);

const paginatedMachines = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return machines.value.slice(start, end);
});

const paginationStart = computed(() => {
  if (machines.value.length === 0) return 0;
  return (currentPage.value - 1) * pageSize.value + 1;
});

const paginationEnd = computed(() => {
  return Math.min(currentPage.value * pageSize.value, machines.value.length);
});

const fetchMachines = async () => {
  loading.value = true;
  try {
    const response = await dbAPI.readRecords('Machines');
    console.log("Raw API Response:", response);
    
    // Explicitly target the 'machine' or 'machines' array from your backend response
    let rawRecords = [];
    if (response) {
      rawRecords = response.machine || response.machines || response.data?.machine || response.data?.machines || [];
    }
    
    const records = Array.isArray(rawRecords) ? rawRecords : [];
    
    machines.value = records.map(item => ({
      ...item,
      ID: item.ID || item.id || item._id || '',
      Brand: item['Brand'] || item.Brand || item.brand || '',
      MachineType: item['MachineType'] || item.machineType || '',
      RPM: item['RPM'] || item.RPM || item.rpm || '',
      SPI: item['SPI'] || item.SPI || item.spi || '',
      Bobine: item['Bobine'] || item.Bobine || item.bobine || '',
      Lopper: item['Lopper'] || item.Lopper || item.lopper || '',
      Remarks: item['Remarks'] || item.Remarks || item.remarks || ''
    }));

  } catch (err) {
    alert('Error loading records: ' + err.message);
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  resetForm();
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  resetForm();
};

const saveMachine = async () => {
  if (!form.value.brand.trim()) {
    alert('Please enter a Brand name.');
    return;
  }
  
  loading.value = true;
  
  try {
    const payload = {
  'Brand': form.value.brand?.trim() || '',
  'MachineType': form.value.machineType?.trim() || '',
  'RPM': Number(form.value.rpm) || 0,
  'SPI': Number(form.value.spi) || 0,
  'Bobine': Number(form.value.bobine) || 0,
  'Lopper': Number(form.value.lopper) || 0,
  'Remarks': form.value.remarks?.trim() || ''
};

    if (isEditing.value) {
      await dbAPI.updateRecord('Machines', editingId.value, payload);
    } else {
      payload['ID'] = 'MCH-' + Date.now().toString().slice(-4);
      payload['Created Date'] = new Date().toISOString().split('T')[0];
      await dbAPI.createRecord('Machines', payload);
    }
    
    closeModal();
    await fetchMachines();
  } catch (err) {
    alert('Error saving record: ' + err.message);
  } finally {
    loading.value = false;
  }
};

const editMachine = (machine) => {
  isEditing.value = true;
  editingId.value = machine.ID || machine.id;
  form.value.brand = machine.Brand || '';
  form.value.machineType = machine.MachineType || '';
  form.value.rpm = machine.RPM || '';
  form.value.spi = machine.SPI || '';
  form.value.bobine = machine.Bobine || '';
  form.value.lopper = machine.Lopper || '';
  form.value.remarks = machine.Remarks || '';
  showModal.value = true;
};

const deleteMachine = async (machine) => {
  const targetId = machine.ID || machine.id;
  const brandName = machine.Brand;
  if (!confirm(`Are you sure you want to delete record for ${brandName}?`)) return;

  loading.value = true;
  try {
    await dbAPI.deleteRecord('Machines', targetId);
    await fetchMachines();
    if (currentPage.value > totalPages.value && currentPage.value > 1) {
      currentPage.value--;
    }
  } catch (err) {
    alert('Error deleting record: ' + err.message);
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.value = {
    brand: '',
    machineType: '',
    rpm: '',
    spi: '',
    bobine: '',
    lopper: '',
    remarks: ''
  };
  isEditing.value = false;
  editingId.value = null;
};

onMounted(() => {
  fetchMachines();
});
</script>

<style scoped>
.user-container {
  padding: 0 !important;
  margin: 0 !important;
  background-color: #f1f3f5;
  width: 100%;
}

.bg-excel-green {
  background-color: #107c41 !important;
}

.excel-ribbon {
  border: 1px solid #c7d2fe;
  background: #ffffff;
  margin-bottom: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.excel-card {
  border-radius: 0 !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
}

.excel-table-container {
  max-height: 375px;
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
  background: #ffffff;
}

.excel-table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.excel-table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.excel-table-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.excel-table {
  font-size: 0.85rem;
  border-color: #d4d4d4 !important;
  margin-bottom: 0 !important;
  border-collapse: separate;
  border-spacing: 0;
  white-space: nowrap;
}

.excel-col-header {
  background-color: #f3f4f6 !important;
  color: #1f2937;
  font-weight: 600;
  font-size: 0.75rem;
  border-color: #c0c0c0 !important;
  border-bottom: 2px solid #107c41 !important;
  padding: 0.35rem 0.5rem !important;
  position: sticky;
  top: 0;
  z-index: 2;
}

.excel-corner-header {
  background-color: #e5e7eb !important;
  border-right: 1px solid #c0c0c0 !important;
  border-bottom: 2px solid #107c41 !important;
}

.excel-row-header {
  background-color: #f3f4f6 !important;
  border-right: 1px solid #c0c0c0 !important;
  border-bottom: 1px solid #e0e0e0 !important;
  font-size: 0.75rem;
  color: #555555 !important;
}

.excel-table td {
  border-color: #e0e0e0 !important;
  border-right: 1px solid #e0e0e0 !important;
  border-bottom: 1px solid #e0e0e0 !important;
  padding: 0.3rem 0.5rem !important;
  vertical-align: middle;
}

.excel-table tbody tr:hover td {
  background-color: #e8f5e9 !important;
}

.excel-input {
  border-color: #107c41;
  font-size: 0.85rem;
  border-radius: 1px;
}
.excel-input:focus {
  border-color: #107c41;
  box-shadow: 0 0 0 0.2rem rgba(16, 124, 65, 0.15) !important;
}

.btn-xs {
  font-size: 0.75rem;
  padding: 0.05rem 0.3rem;
  border-radius: 1px;
}
</style>