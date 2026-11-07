// src/services/api.js

import { DEPLOYED_URL } from '@/config.js';

export const dbAPI = {
  // Read Users (GET: users.index)
  async readRecords(sheetName = 'Users') {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .index(sheetName);
      });
    }

    try {
      const response = await fetch(`${DEPLOYED_URL}?action=users.index&sheetName=${encodeURIComponent(sheetName)}`, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.message || 'Failed to fetch data');
      
      return result.data; // Returns array of users
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to fetch data from backend');
    }
  },

  // Create User (POST: users.store)
  async createRecord(sheetName = 'Users', userData = {}) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .store(sheetName, userData);
      });
    }

    try {
      const response = await fetch(DEPLOYED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'users.store', sheetName, user: userData }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.message || 'Failed to create record');
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  },

  // Update User (POST: users.update)
  async updateRecord(sheetName = 'Users', recordId, recordData = {}) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .update(sheetName, recordData);
      });
    }

    try {
      const response = await fetch(DEPLOYED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'users.update', 
          sheetName,
          user: { ID: recordId, ...recordData } 
        }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.message || 'Failed to update record');
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  },

  // Delete User (POST: users.delete)
  async deleteRecord(sheetName = 'Users', recordId) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .destroy(sheetName, { ID: recordId });
      });
    }

    try {
      const response = await fetch(DEPLOYED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'users.delete', sheetName, ID: recordId }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.message || 'Failed to delete record');
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  }
};