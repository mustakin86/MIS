<template>
  <div>
    <h2>Users Management (Home)</h2>

    <!-- Form Module -->
    <div class="form-group">
      <input v-model="form.name" placeholder="Name" />
      <input v-model="form.email" placeholder="Email" />
      <button @click="addUser" :disabled="loading">Add User</button>
    </div>

    <!-- Data Grid -->
    <div v-if="loading">Loading records...</div>
    <table v-else>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.ID || user.id">
          <td>{{ user.ID || user.id }}</td>
          <td>{{ user.name }}</td>
          <td>{{ user.email }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { dbAPI } from '@/services/api';

const users = ref([]);
const loading = ref(false);
const form = ref({ name: '', email: '' });

const fetchUsers = async () => {
  loading.value = true;
  try {
    const data = await dbAPI.readRecords('Users');
    // Filter out blank rows
    users.value = (data || []).filter(user => user.name || user.email);
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    loading.value = false;
  }
};

const addUser = async () => {
  if (!form.value.name.trim() || !form.value.email.trim()) return;
  loading.value = true;
  
  try {
    const insertedRecord = await dbAPI.createRecord('Users', { 
      name: form.value.name.trim(), 
      email: form.value.email.trim() 
    });
    
    if (insertedRecord) {
      users.value.push(insertedRecord);
    }
    form.value = { name: '', email: '' };
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
table { width: 100%; border-collapse: collapse; margin-top: 15px; }
th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
th { background-color: #f4f4f4; }
.form-group { margin-bottom: 10px; }
.form-group input { margin-right: 5px; padding: 6px; }
button { padding: 6px 12px; cursor: pointer; }
</style>