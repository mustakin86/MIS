<template>
  <div class="container my-1">
    <!-- View Header & Search -->
    <div class="mb-3 row align-items-center">
      <div class="col-md-6 d-flex align-items-center gap-2">
        <!-- Back Button (Shown when viewing PO List) -->
        <button 
          v-if="currentView === 'po'" 
          class="btn btn-outline-secondary btn-sm" 
          @click="resetToBuyers"
        >
          ← Back to Buyers
        </button>
        <h2 class="mb-0">
          {{ currentView === 'buyer' ? 'BUYER LIST' : `PO LIST (${selectedBuyer})` }}
        </h2>
      </div>

      <div class="col-md-6 d-flex justify-content-end align-items-center gap-2">
        <label for="search" class="col-form-label col-form-label-sm mb-0">Search:</label>
        <div style="width: 250px;">
          <input 
            id="search" 
            type="text" 
            v-model="searchQuery" 
            class="form-control form-control-sm" 
            :placeholder="currentView === 'buyer' ? 'Search Buyers...' : 'Search POs...'"
          />
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-responsive border rounded" style="max-height: 400px; overflow-y: auto;">
      <table class="table table-striped table-hover mb-0 align-middle">
        <thead class="table-light sticky-top">
          <!-- STEP 1: Buyer Columns -->
          <tr v-if="currentView === 'buyer'">
            <th @click="sort('id')" role="button" style="width: 100px;">ID ↕</th>
            <th @click="sort('buyer')" role="button">Buyer Name ↕</th>
          </tr>
          <!-- STEP 2: PO Columns -->
          <tr v-else>
            <th @click="sort('id')" role="button" style="width: 100px;">ID ↕</th>
            <th @click="sort('PO_No')" role="button">PO Number ↕</th>
          </tr>
        </thead>
        <tbody>
          <!-- STEP 1: Buyer Rows -->
          <template v-if="currentView === 'buyer'">
            <tr 
              v-for="row in filteredAndSortedRows" 
              :key="row.buyer" 
              @click="handleBuyerClick(row.buyer)" 
              role="button" 
              style="cursor: pointer;"
            >
              <td>{{ row.id }}</td>
              <td class="fw-bold text-primary">{{ row.buyer }}</td>
            </tr>
          </template>

          <!-- STEP 2: PO Rows -->
          <template v-else>
            <tr 
              v-for="row in filteredAndSortedRows" 
              :key="row.id" 
              @click="handlePOClick(row)" 
              role="button" 
              style="cursor: pointer;"
            >
              <td>{{ row.id }}</td>
              <td class="fw-bold text-success">{{ row.PO_No }}</td>
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-if="filteredAndSortedRows.length === 0">
            <td :colspan="currentView === 'buyer' ? 2 : 2" class="text-center py-3 text-muted">
              No matching records found
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
import { obAPI } from '@/services/operation_breakdown_api.js'; 

const router = useRouter();
const emit = defineEmits(['edit-item']);

// Component State
const currentView = ref('buyer'); // 'buyer' | 'po'
const selectedBuyer = ref('');
const rawRecords = ref([]);
const searchQuery = ref('');
const sortColumn = ref('');
const sortDirection = ref('asc');

// Fetch all records from backend on mount
const fetchRecords = async () => {
  try {
    const response = await obAPI.readRecords('sheetHeader'); // or 'Header'
    const data = response.items || response.data || response;
    
    if (Array.isArray(data)) {
      rawRecords.value = data.map((item, index) => ({
        id: item.ID || item.id || item['OB ID'] || index + 1,
        buyer: String(item.Buyer || item['Buyer Name'] || item['BUYER'] || '').trim(),
        PO_No: String(item.PO_No || item['PO No'] || item.PO_No || 'N/A').trim(),
        styleNo: String(item.StyleNo || item['Style No'] || item.styleNo || '').trim(),
        itemDescription: item.ItemDescription || item.itemDescription || '',
        totalSmv: item.TotalSmv || item.totalSmv || 0,
        raw: item
      }));
    }
  } catch (error) {
    console.error("Failed to load records from Google Sheet:", error);
  }
};

onMounted(fetchRecords);

// STEP 1 -> STEP 2: Handle Buyer Selection
const handleBuyerClick = (buyerName) => {
  selectedBuyer.value = buyerName;
  currentView.value = 'po'; // Fixed value match
  searchQuery.value = ''; // Reset search query for PO list
};

// Return to Buyer List
const resetToBuyers = () => {
  currentView.value = 'buyer';
  selectedBuyer.value = '';
  searchQuery.value = '';
};

// STEP 2 -> STEP 3: Handle PO Selection to open Edit Form
const handlePOClick = async (poRow) => {
  try {
    console.log("Opening edit form for PO:", poRow.PO_No, "under Buyer:", poRow.buyer);
    
    // Fetch associated Breakdown rows for this specific record
    let relativeOperations = [];
    try {
      const breakdownRes = await obAPI.readRecords('Breakdown');
      const breakdownData = breakdownRes.items || breakdownRes.data || breakdownRes;

      if (Array.isArray(breakdownData)) {
        relativeOperations = breakdownData.filter(item => 
          String(item.OB_ID || item.obId || item['OB ID']) === String(poRow.id)
        );
      }
    } catch (err) {
      console.warn("Could not fetch child breakdown rows:", err);
    }

    const fullPayload = {
      ...poRow,
      operations: relativeOperations
    };

    // 1. Emit edit payload for inline modal or parent container
    emit('edit-item', fullPayload);

    // 2. Navigate to Edit SMV Form view passing PO query parameter
    router.push({ 
      name: 'EditOB', 
      params: { id: poRow.id },
      query: { po: poRow.PO_No }
    });

  } catch (error) {
    console.error("Failed to open edit form:", error);
  }
};

// Sorting Logic
const sort = (column) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
};

// Filter & Sort Data dynamically to ensure unique Buyers and unique POs
const filteredAndSortedRows = computed(() => {
  let displayRows = [];

  if (currentView.value === 'buyer') {
    // Group by Buyer Name to show unique Buyers
    const uniqueBuyerMap = {};
    rawRecords.value.forEach((rec, idx) => {
      if (rec.buyer && !uniqueBuyerMap[rec.buyer]) {
        uniqueBuyerMap[rec.buyer] = {
          id: idx + 1,
          buyer: rec.buyer
        };
      }
    });
    displayRows = Object.values(uniqueBuyerMap);
  } else {
    // Filter records matching selected buyer AND ensure PO Number is unique
    const buyerRecords = rawRecords.value.filter(rec => rec.buyer === selectedBuyer.value);
    const uniquePoMap = {};
    
    buyerRecords.forEach((rec, idx) => {
      if (rec.PO_No && !uniquePoMap[rec.PO_No]) {
        uniquePoMap[rec.PO_No] = {
          ...rec,
          id: idx + 1
        };
      }
    });
    displayRows = Object.values(uniquePoMap);
  }

  // Apply Search Filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    displayRows = displayRows.filter(row => 
      Object.values(row).some(val => String(val).toLowerCase().includes(query))
    );
  }

  // Apply Column Sort
  if (sortColumn.value) {
    displayRows.sort((a, b) => {
      let modifier = sortDirection.value === 'asc' ? 1 : -1;
      if (a[sortColumn.value] < b[sortColumn.value]) return -1 * modifier;
      if (a[sortColumn.value] > b[sortColumn.value]) return 1 * modifier;
      return 0;
    });
  }

  return displayRows;
});
</script>

<style scoped>
thead.sticky-top {
  position: sticky;
  top: 0;
  z-index: 1;
}
</style>