<template>
  <div class="container my-1">
    <div class="mb-1 row">
      <h2 class="mb-4">SMV LIST</h2>
      <label for="search" class="col-sm-1 col-form-label">Search:</label>
      <div class="col-sm-4">
        <input 
          id="search" 
          type="text" 
          v-model="searchQuery" 
          class="form-control form-control-sm" 
          placeholder="Search items..."
        />
      </div>
    </div>

    <div class="table-responsive border rounded" style="max-height: 350px; overflow-y: auto;">
      <table class="table table-striped table-hover mb-0 align-middle">
        <thead class="table-light sticky-top">
          <tr>
            <th @click="sort('id')" role="button" style="width: 100px;">ID ↕</th>
            <th @click="sort('itemName')" role="button">Item Name ↕</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="row in filteredAndSortedRows" 
            :key="row.id" 
            @click="handleRowClick(row)" 
            role="button" 
            style="cursor: pointer;"
          >
            <td>{{ row.id }}</td>
            <td>{{ row.itemName }}</td>
          </tr>
          <tr v-if="filteredAndSortedRows.length === 0">
            <td colspan="2" class="text-center py-3 text-muted">No matching records found</td>
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
const sortColumn = ref('');
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

const handleRowClick = async (row) => {
  try {
    console.log("Navigating/fetching operations for:", row.itemName);
    
    // Option A: If using Vue Router navigation:
    router.push({ 
      name: 'EditSMV', // Ensure this matches your router/index.js route name
      params: { itemName: row.itemName } 
    });

    // Option B: If you prefer keeping event emission alongside router push:
    const response = await smvAPI.readRecords('Operations'); 
    const rawData = response.items || response.data || response;

    const relativeOperations = [];
    if (Array.isArray(rawData)) {
      rawData.forEach(item => {
        const currentItemName = String(item['Item_Name'] || item['Item Name'] || item.itemName || '').trim();
        if (currentItemName.toLowerCase() === row.itemName.toLowerCase()) {
          relativeOperations.push({
            opCode: item['OpCode'] || item['Op Code'] || item.opCode || `OP-${1001 + relativeOperations.length}`,
            machineType: item['MachineType'] || item['Machine Type'] || item.machineType || '',
            machineTools: item['MachineTools'] || item['Machine Tools'] || item.machineTools || '',
            processDesc: item['ProcessDescription'] || item['Process Description'] || item.processDesc || '',
            operationGrade: item['OperationGrade'] || item['Operation Grade'] || item.operationGrade || '',
            seamLength: item['SeamLength'] || item['Seam Length'] || item.seamLength || '',
            seamFreq: item['SeamFreq'] || item['Seam Freq'] || item.seamFreq || '',
            spi: item['SPI'] || item.spi || '',
            skill: item['Skill'] || item.skill || 'Operator',
            smv: parseFloat(item['SMV'] || item.smv || 0)
          });
        }
      });
    }

    const payload = {
      ...row,
      operations: relativeOperations
    };

    emit('edit-item', payload);

  } catch (error) {
    console.error("Failed to fetch relative data for item:", error);
    emit('edit-item', { ...row, operations: [] });
  }
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
thead.sticky-top {
  position: sticky;
  top: 0;
  z-index: 1;
}
</style>