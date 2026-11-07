<template>
  <div class="user-container">
    <!-- Excel Top Ribbon Header -->
    <div class="excel-ribbon">
      <div class="d-flex align-items-center justify-content-between px-3 py-1 text-white">
        <div class="d-flex align-items-center gap-3">
          <div class="d-flex align-items-center gap-2">
            <span class="fw-bold fs-6 tracking-wide">Machine List</span>
          </div>
        </div>
        <button @click="openAddModal" class="btn btn-primary btn-sm text-white fw-bold px-1 shadow-sm py-1 font-monospace">
          + Add Machine
        </button>
      </div>
    </div>

    <!-- Excel-Style Data Grid Table Container -->
    <div class="card excel-card shadow-sm">
      <div v-if="loading && items.length === 0" class="text-center py-5 text-muted small font-monospace">
        <div class="spinner-border spinner-border-sm text-success me-2" role="status"></div>
        Reading workbook range from database...
      </div>
      
      <template v-else>
        <!-- Scrollable Table Wrapper -->
        <div class="excel-table-container">
          <table class="table table-bordered excel-table align-middle mb-0">
            <thead>
              <tr>
                <th style="width: 45px;" class="text-center excel-corner-header">#</th>
                <th class="excel-col-header">Brand</th>
                <th class="excel-col-header">Machine Type</th>
                <th class="excel-col-header">RPM</th>
                <th class="excel-col-header">SPI</th>
                <th class="excel-col-header">Bobine</th>
                <th class="excel-col-header">Lopper</th>
                <th class="excel-col-header">Remarks</th>
                <th style="width: 120px;" class="text-center excel-col-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in paginatedItems" :key="item.rowIndex || index" class="excel-row">
                <td class="text-center text-secondary excel-row-header fw-bold font-monospace">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="fw-semibold text-dark bg-white">{{ item.Brand }}</td>
                <td class="bg-white">{{ item.MachineType }}</td>
                <td class="font-monospace bg-white">{{ item.RPM }}</td>
                <td class="font-monospace bg-white">{{ item.SPI }}</td>
                <td class="font-monospace bg-white">{{ item.Bobine }}</td>
                <td class="font-monospace bg-white">{{ item.Lopper }}</td>
                <td class="text-secondary font-monospace small bg-white">{{ item.Remarks || '-' }}</td>
                <td class="text-center bg-white">
                  <button @click="editItem(item)" class="btn btn-xs btn-outline-success me-1 py-0 px-2 font-monospace">
                    Edit
                  </button>
                  <button @click="deleteItem(item)" class="btn btn-xs btn-outline-danger py-0 px-2 font-monospace">
                    Del
                  </button>
                </td>
              </tr>
              <tr v-if="items.length === 0">
                <td colspan="11" class="text-center py-4 text-muted small font-monospace bg-white">
                  No machine records found in range.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Spreadsheet Bottom Sheet Status Bar -->
        <div class="excel-status-bar card-footer bg-white d-flex justify-content-between align-items-center py-1 px-2 border-top">
          <div class="d-flex align-items-center gap-2"></div>

          <!-- Pagination Controls -->
          <div class="d-flex align-items-center gap-3">
            <span class="text-muted small font-monospace d-none d-sm-inline">
              Viewing rows {{ paginationStart }}–{{ paginationEnd }} of {{ items.length }}
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

    <!-- Machine Modal Popup Form -->
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
              <div class="col-md-4">
                <label class="form-label small fw-bold text-secondary font-monospace">Brand</label>
                <input v-model="form.Brand" class="form-control form-control-sm excel-input shadow-none" placeholder="Brand name" />
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold text-secondary font-monospace">Machine Type</label>
                <input v-model="form.MachineType" class="form-control form-control-sm excel-input shadow-none" placeholder="Type" />
              </div>

              <div class="col-md-3">
                <label class="form-label small fw-bold text-secondary font-monospace">RPM</label>
                <input v-model.number="form.RPM" type="number" class="form-control form-control-sm excel-input shadow-none" placeholder="RPM" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold text-secondary font-monospace">SPI</label>
                <input v-model.number="form.SPI" type="number" class="form-control form-control-sm excel-input shadow-none" placeholder="SPI" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold text-secondary font-monospace">Bobine</label>
                <input v-model.number="form.Bobine" type="number" class="form-control form-control-sm excel-input shadow-none" placeholder="Bobine" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold text-secondary font-monospace">Lopper</label>
                <input v-model.number="form.Lopper" type="number" class="form-control form-control-sm excel-input shadow-none" placeholder="Lopper" />
              </div>

              <div class="col-md-12">
                <label class="form-label small fw-bold text-secondary font-monospace">Remarks</label>
                <input v-model="form.Remarks" class="form-control form-control-sm excel-input shadow-none" placeholder="Optional remarks..." />
              </div>
            </div>
          </div>
          <div class="modal-footer py-2 bg-white">
            <button type="button" class="btn btn-outline-secondary btn-sm px-3 font-monospace" @click="closeModal">Cancel</button>
            <button @click="saveItem" :disabled="loading" class="btn btn-success btn-sm px-4 font-monospace fw-bold">
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
import { dbAPI } from '@/services/machine_api.js'; // Ensure path points to your API file

const items = ref([]);
const loading = ref(false);
const isEditing = ref(false);
const editingRowIndex = ref(null);
const showModal = ref(false);

const currentPage = ref(1);
const pageSize = ref(8);

const getInitialForm = () => ({
  ID: '',
  Brand: '',
  MachineType: '',
  RPM: '',
  SPI: '',
  Bobine: '',
  Lopper: '',
  Remarks: '',
  Created_Date: ''
});

const form = ref(getInitialForm());

const totalPages = computed(() => Math.ceil(items.value.length / pageSize.value));

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return items.value.slice(start, end);
});

const paginationStart = computed(() => {
  if (items.value.length === 0) return 0;
  return (currentPage.value - 1) * pageSize.value + 1;
});

const paginationEnd = computed(() => {
  return Math.min(currentPage.value * pageSize.value, items.value.length);
});

const formatDate = (val) => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleDateString();
  } catch {
    return val;
  }
};

const fetchItems = async () => {
  loading.value = true;
  try {
    const records = await dbAPI.readRecords();
    items.value = Array.isArray(records) ? records : [];
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

const saveItem = async () => {
  if (!form.value.Brand.toString().trim()) {
    alert('Please enter a Brand.');
    return;
  }

  loading.value = true;

  try {
    if (isEditing.value) {
      // Update payload includes target `rowIndex`
      await dbAPI.updateRecord({
        rowIndex: editingRowIndex.value,
        ...form.value
      });
    } else {
      // Create payload adding today's date if empty
      await dbAPI.createRecord({
        ...form.value,
        Created_Date: form.value.Created_Date || new Date().toISOString().split('T')[0]
      });
    }

    closeModal();
    await fetchItems();
  } catch (err) {
    alert('Error saving record: ' + err.message);
  } finally {
    loading.value = false;
  }
};

const editItem = (item) => {
  isEditing.value = true;
  editingRowIndex.value = item.rowIndex;
  form.value = {
    ID: item.ID || '',
    Brand: item.Brand || '',
    MachineType: item.MachineType || '',
    RPM: item.RPM || '',
    SPI: item.SPI || '',
    Bobine: item.Bobine || '',
    Lopper: item.Lopper || '',
    Remarks: item.Remarks || '',
    Created_Date: item.Created_Date || ''
  };
  showModal.value = true;
};

const deleteItem = async (item) => {
  if (!confirm(`Are you sure you want to delete Machine ID ${item.ID || item.Brand}?`)) return;

  loading.value = true;
  try {
    await dbAPI.deleteRecord(item.rowIndex);
    await fetchItems();
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
  form.value = getInitialForm();
  isEditing.value = false;
  editingRowIndex.value = null;
};

onMounted(() => {
  fetchItems();
});
</script>

<style scoped>
/* Container Setup */
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
  max-height: 420px;
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
  background: #ffffff;
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