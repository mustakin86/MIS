<template>
  <div class="user-container">
    <!-- Excel Top Ribbon Header -->
    <div class="excel-ribbon">
      <div class="d-flex align-items-center justify-content-between px-3 text-black">
        <div class="d-flex align-items-center gap-3">
         <p class="m-0 fw-bold">All User</p>
        </div>
        <button @click="openAddModal" class="btn btn-light btn-sm text-success fw-bold px-3 shadow-sm py-1 font-monospace">
          + Insert Row
        </button>
      </div>
    </div>

    <!-- Excel-Style Data Grid Table Container -->
    <div class="card excel-card shadow-sm">
      <div v-if="loading && users.length === 0" class="text-center py-5 text-muted small font-monospace">
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
                <th class="excel-col-header">
                  <div class="d-flex justify-content-between align-items-center">
                    <span><small class="text-muted fw-normal ms-1">Name</small></span>
                    <i class="bi bi-caret-down-fill text-muted xs-icon"></i>
                  </div>
                </th>
                <th class="excel-col-header">
                  <div class="d-flex justify-content-between align-items-center">
                    <span><small class="text-muted fw-normal ms-1">Email Address</small></span>
                    <i class="bi bi-caret-down-fill text-muted xs-icon"></i>
                  </div>
                </th>
                <th style="width: 110px;" class="excel-col-header">
                  <span><small class="text-muted fw-normal ms-1">Role</small></span>
                </th>
                <th style="width: 120px;" class="text-center excel-col-header">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(user, index) in paginatedUsers" :key="user.ID || user.id" class="excel-row">
                <td class="text-center text-secondary excel-row-header fw-bold font-monospace">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td class="fw-semibold text-dark bg-white">{{ user.Name || user.name }}</td>
                <td class="text-secondary font-monospace small bg-white">{{ user.Email || user.email }}</td>
                <td class="bg-white">
                  <span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-0 font-monospace">{{ user.Role || 'User' }}</span>
                </td>
                <td class="text-center bg-white">
                  <button @click="editUser(user)" class="btn btn-xs btn-outline-success me-1 py-0 px-2 font-monospace">
                    Edit
                  </button>
                  <button @click="deleteUser(user)" class="btn btn-xs btn-outline-danger py-0 px-2 font-monospace">
                    Del
                  </button>
                </td>
              </tr>
              <tr v-if="users.length === 0">
                <td colspan="5" class="text-center py-4 text-muted small font-monospace bg-white">No data records found in range.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Spreadsheet Bottom Sheet Tabs & Status Bar -->
        <div class="excel-status-bar card-footer bg-white d-flex justify-content-between align-items-center py-1 px-2 border-top">
          <div class="d-flex align-items-center gap-2"></div>

          <!-- Pagination Controls -->
          <div class="d-flex align-items-center gap-3">
            <span class="text-muted small font-monospace d-none d-sm-inline">
              Viewing rows {{ paginationStart }}–{{ paginationEnd }} of {{ users.length }}
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

    <!-- User Modal Popup -->
    <div class="modal fade" id="userModal" tabindex="-1" aria-labelledby="userModalLabel" aria-hidden="true" ref="userModalRef">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-success shadow-lg">
          <div class="modal-header py-2 bg-excel-green text-white">
            <h5 class="modal-title fs-6 fw-bold d-flex align-items-center gap-2" id="userModalLabel">
              <i class="bi bi-table"></i> {{ isEditing ? 'Edit Table Row Record' : 'Insert New Spreadsheet Row' }}
            </h5>
            <button type="button" class="btn-close btn-close-white btn-sm" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body py-3 bg-light">
            <div class="mb-3">
              <label class="form-label small fw-bold text-secondary font-monospace">CELL [Column A - Name]</label>
              <input v-model="form.name" class="form-control form-control-sm excel-input shadow-none" placeholder="Enter full name" />
            </div>
            <div class="mb-1">
              <label class="form-label small fw-bold text-secondary font-monospace">CELL [Column B - Email]</label>
              <input v-model="form.email" type="email" class="form-control form-control-sm excel-input shadow-none" placeholder="Enter email address" />
            </div>
          </div>
          <div class="modal-footer py-2 bg-white">
            <button type="button" class="btn btn-outline-secondary btn-sm px-3 font-monospace" data-bs-dismiss="modal">Cancel</button>
            <button @click="saveUser" :disabled="loading" class="btn btn-success btn-sm px-4 font-monospace fw-bold">
              {{ loading ? 'Saving...' : (isEditing ? 'Commit Update' : 'Insert Row') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { dbAPI } from '@/services/user_api'; // Match your actual service file path (e.g. @/services/api or @/services/user_api)
import * as bootstrap from 'bootstrap';

const users = ref([]);
const loading = ref(false);
const form = ref({ name: '', email: '' });
const isEditing = ref(false);
const editingId = ref(null);

const userModalRef = ref(null);
let modalInstance = null;

const currentPage = ref(1);
const pageSize = ref(8);

const totalPages = computed(() => Math.ceil(users.value.length / pageSize.value));

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return users.value.slice(start, end);
});

const paginationStart = computed(() => {
  if (users.value.length === 0) return 0;
  return (currentPage.value - 1) * pageSize.value + 1;
});

const paginationEnd = computed(() => {
  return Math.min(currentPage.value * pageSize.value, users.value.length);
});

const fetchUsers = async () => {
  loading.value = true;
  try {
    const response = await dbAPI.readRecords('Users');
    
    // Extract the users array from the response object
    const records = response.users || response.data || response || [];
    
    users.value = records.filter(user => user.Name || user.Email || user.name || user.email);
  } catch (err) {
    alert('Error loading records: ' + err.message);
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  resetForm();
  if (!modalInstance) {
    modalInstance = new bootstrap.Modal(userModalRef.value);
  }
  modalInstance.show();
};

const saveUser = async () => {
  if (!form.value.name.trim() || !form.value.email.trim()) {
    alert('Please enter both Name and Email.');
    return;
  }
  
  loading.value = true;
  
  try {
    if (isEditing.value) {
      await dbAPI.updateRecord('Users', editingId.value, {
        Name: form.value.name.trim(),
        Email: form.value.email.trim()
      });
    } else {
      await dbAPI.createRecord('Users', { 
        ID: Date.now().toString(),
        Name: form.value.name.trim(), 
        Email: form.value.email.trim(),
        Role: 'User',
        'Created Date': new Date().toISOString().split('T')[0]
      });
    }
    
    if (modalInstance) {
      modalInstance.hide();
    }
    resetForm();
    await fetchUsers();
  } catch (err) {
    alert('Error saving record: ' + err.message);
  } finally {
    loading.value = false;
  }
};

const editUser = (user) => {
  isEditing.value = true;
  editingId.value = user.ID || user.id;
  form.value.name = user.Name || user.name || '';
  form.value.email = user.Email || user.email || '';

  if (!modalInstance) {
    modalInstance = new bootstrap.Modal(userModalRef.value);
  }
  modalInstance.show();
};

const deleteUser = async (user) => {
  const targetId = user.ID || user.id;
  const userName = user.Name || user.name;
  if (!confirm(`Are you sure you want to delete ${userName}?`)) return;

  loading.value = true;
  try {
    await dbAPI.deleteRecord('Users', targetId);
    await fetchUsers();
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
  form.value = { name: '', email: '' };
  isEditing.value = false;
  editingId.value = null;
};

onMounted(() => {
  fetchUsers();
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
  max-height: 375px;
  overflow-y: auto;
  overflow-x: hidden;
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

.excel-table-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.excel-table {
  font-size: 0.85rem;
  border-color: #d4d4d4 !important;
  margin-bottom: 0 !important;
  border-collapse: separate;
  border-spacing: 0;
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

.xs-icon {
  font-size: 0.65rem;
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