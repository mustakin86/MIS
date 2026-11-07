// src/services/machine_api.js

const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbwmOZZMNuk5x0or1mPqSMPBhslRsVKF0LKHnzgO2Omfry-uNmLLklYCweSTKtnh2ity/exec';

export const dbAPI = {
  // Read Machines (GET)
  async readRecords(sheetName = 'Machines') {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(res => resolve(res?.data || res))
          .withFailureHandler(reject)
          .index(sheetName);
      });
    }

    try {
      const response = await fetch(`${DEPLOYED_URL}?action=index&sheetName=${encodeURIComponent(sheetName)}`, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }
      return result.data || [];
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to fetch data from backend');
    }
  },

  // Create Machine (POST)
  async createRecord(machineData = {}, sheetName = 'Machines') {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(res => resolve(res?.data || res))
          .withFailureHandler(reject)
          .store(sheetName, machineData);
      });
    }

    try {
      const response = await fetch(DEPLOYED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'create', 
          sheetName, 
          payload: machineData 
        }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create record');
      }
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  },

  // Update Machine (POST)
  async updateRecord(machineData = {}, sheetName = 'Machines') {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(res => resolve(res?.data || res))
          .withFailureHandler(reject)
          .update(sheetName, machineData);
      });
    }

    try {
      const response = await fetch(DEPLOYED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'update', 
          sheetName,
          payload: machineData 
        }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update record');
      }
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  },

  // Delete Machine (POST)
  async deleteRecord(rowIndex, sheetName = 'Machines') {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(res => resolve(res?.data || res))
          .withFailureHandler(reject)
          .destroy(sheetName, { rowIndex: rowIndex });
      });
    }

    try {
      const response = await fetch(DEPLOYED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'delete', 
          sheetName, 
          payload: { rowIndex } 
        }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete record');
      }
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  }
};