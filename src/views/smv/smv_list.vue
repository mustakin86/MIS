<template>
  <div class="container-fluid m-0 p-0">
    <!-- Header & Search Controls -->
    <div class="row align-items-center m-0 mb-2 p-0">
      <div class="col-auto ps-0">
        <h4 class="fw-bold m-0 p-0 text-secondary">SMV LIST</h4>
      </div>
      <div class="col-md-4 ms-auto pe-0">
        <div class="input-group input-group-sm m-0 p-0">
          <span class="input-group-text bg-white text-muted rounded-0 border-end-0">Search</span>
          <input id="search" type="text" v-model="searchQuery" class="form-control rounded-0" placeholder="Search items..." />
        </div>
      </div>
    </div>

    <!-- Excel-Style Responsive Table Container -->
    <div class="table-responsive m-0 p-0 border shadow-sm bg-white excel-container" style="max-height: 75vh;">
      <table class="table table-bordered table-striped table-hover align-middle m-0 p-0 excel-grid">
        <thead class="table-light text-uppercase text-secondary sticky-top m-0 p-0">
          <tr>
            <th style="width: 50px;" class="text-center bg-light border-end m-0 p-1">SL</th>
            <th class="m-0 p-1">Item Name</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredAndSortedRows.length === 0">
            <td colspan="2" class="text-center text-muted py-4 m-0">No items found</td>
          </tr>
          <tr v-for="(row, index) in filteredAndSortedRows" :key="row.id" @click="handleRowClick(row)" role="button"
            class="excel-row m-0 p-0">
            <td class="text-center text-muted fw-semibold border-end m-0 p-1" style="font-size: 0.75rem;">
              {{ index + 1 }}
            </td>
            <td class="m-0 p-1">
              <!-- Hyperlink styled text input mimicking an active sheet link -->
              <input type="text"
                class="form-control form-control-sm bg-transparent font-monospace fw-semibold rounded-0 border-0 shadow-none excel-link-text"
                v-model="row.itemName" readonly style="cursor: pointer;" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { dbAPI as smvAPI } from '@/services/operations_api.js';

const router = useRouter();
const emit = defineEmits(['edit-item']);

const searchQuery = ref('');
const sortColumn = ref('itemName'); // Default sorted column
const sortDirection = ref('asc');
const rows = ref([]);

const fetchItems = async () => {
  try {
    const response = await smvAPI.readRecords('Operations');
    const rawData = response.items || response.data || response;

    const uniqueItemsMap = {};

    if (Array.isArray(rawData)) {
      rawData.forEach((item, index) => {
        const itemName = String(item['Item_Name'] || item['Item Name'] || item.itemName || item.name || '').trim();
        if (!itemName) return;

        if (!uniqueItemsMap[itemName]) {
          uniqueItemsMap[itemName] = {
            id: item.ID || item.id || index + 1,
            itemName: itemName,
            size: item['Garments_Size'] || item['Garments Size'] || item.size || ''
          };
        }
      });
    }

    rows.value = Object.values(uniqueItemsMap);
  } catch (error) {
    console.error("Failed to load item list from Google Sheet:", error);
  }
};

onMounted(fetchItems);

const handleRowClick = (row) => {
  console.log("Navigating for:", row.itemName);
  router.push({
    name: 'EditSMV',
    params: { itemName: row.itemName }
  });
};

const sort = (column) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
};

const filteredAndSortedRows = computed(() => {
  let result = rows.value.filter(row =>
    Object.values(row).some(val => String(val).toLowerCase().includes(searchQuery.value.toLowerCase()))
  );

  if (sortColumn.value) {
    result.sort((a, b) => {
      let modifier = sortDirection.value === 'asc' ? 1 : -1;
      if (a[sortColumn.value] < b[sortColumn.value]) return -1 * modifier;
      if (a[sortColumn.value] > b[sortColumn.value]) return 1 * modifier;
      return 0;
    });
  }
  return result;
});
</script>

<style scoped>
/* Excel Grid UI Enhancements with 0 Margin & Padding */
.container-fluid, .row, .table, th, td {
  margin: 0 !important;
}

.excel-container {
  overflow-y: auto;
  border-radius: 0px;
}

.excel-grid th,
.excel-grid td {
  border-color: #d0d7de !important;
  vertical-align: middle;
}

.excel-grid thead.sticky-top {
  position: sticky;
  top: 0;
  z-index: 2;
}

/* Hyperlink styling for table cells matching spreadsheet blue links */
.excel-link-text {
  color: #0d6efd !important;
  text-decoration: underline;
  cursor: pointer;
}

.excel-link-text:hover {
  color: #0a58ca !important;
}

.excel-row:hover input {
  background-color: rgba(13, 110, 253, 0.06) !important;
}
</style>