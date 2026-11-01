<template>
  <div class="user-container">
    <h2>Users Management (Home)</h2>

    <!-- Form Module -->
    <div class="form-group">
      <input v-model="form.name" placeholder="Name" />
      <input v-model="form.email" placeholder="Email" />
      <button @click="addUser" :disabled="loading">
        {{ loading ? 'Saving...' : 'Add User' }}
      </button>
    </div>

    <!-- Data Grid -->
    <div v-if="loading && users.length === 0">Loading records...</div>
    <table v-else>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Created Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(user, index) in users" :key="user.ID || user.id">
    <td>{{ index + 1 }}</td> <!-- Displays 1, 2, 3, etc. -->
    <td>{{ user.Name || user.name }}</td>
    <td>{{ user.Email || user.email }}</td>
    <td>{{ user.Role || 'User' }}</td>
    <td>{{ user['Created Date'] || '-' }}</td>
  </tr>
  <tr v-if="users.length === 0">
    <td colspan="6" style="text-align: center;">No user records found.</td>
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
    // Filter out rows missing both Name and Email
    users.value = (data || []).filter(user => user.Name || user.Email || user.name || user.email);
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    loading.value = false;
  }
};

const addUser = async () => {
  if (!form.value.name.trim() || !form.value.email.trim()) {
    alert('Please enter both Name and Email.');
    return;
  }
  
  loading.value = true;
  
  try {
    await dbAPI.createRecord('Users', { 
      ID: Date.now().toString(),
      Name: form.value.name.trim(), 
      Email: form.value.email.trim(),
      Role: 'User',
      'Created Date': new Date().toLocaleDateString()
    });
    
    form.value = { name: '', email: '' };
    await fetchUsers(); // Refresh updated dataset from sheet
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
.user-container {
  max-width: 800px;
  margin: 20px auto;
  font-family: Arial, sans-serif;
}
table { 
  width: 100%; 
  border-collapse: collapse; 
  margin-top: 15px; 
}
th, td { 
  border: 1px solid #ccc; 
  padding: 8px 12px; 
  text-align: left; 
}
th { 
  background-color: #f4f4f4; 
}
.form-group { 
  margin-bottom: 15px; 
}
.form-group input { 
  margin-right: 8px; 
  padding: 8px; 
  border: 1px solid #ccc;
  border-radius: 4px;
}
button { 
  padding: 8px 16px; 
  cursor: pointer; 
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
}
button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>