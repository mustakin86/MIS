<template>
  <div>
    <!-- Show Table List when no item is selected -->
    <SmvList 
      v-if="!selectedItemData" 
      @edit-item="handleEditItem" 
    />

    <!-- Show Operations Library Form in Edit Mode when an item is clicked -->
    <EditSmv 
      v-else 
      :editData="selectedItemData" 
      @cancelEdit="selectedItemData = null"
      @saved="selectedItemData = null"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SmvList from './smv_list.vue';
import EditSmv from './edit_smv.vue';

const selectedItemData = ref(null);

const handleEditItem = (itemRow) => {
  console.log("Parent received edit item data:", itemRow);
  selectedItemData.value = itemRow;
};
</script>