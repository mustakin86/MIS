// src/services/item_api.js

const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbyv2VCjQg4OyB2a-BhLAeasoaMfccpx3XxgJpiqYBvNjNsuwFH1EifuIqINlPxBdBmo/exec';

export const dbAPI = {
  async readRecords(sheetName = 'Items') {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(res => resolve(res?.data || res))
          .withFailureHandler(reject)
          .readRecords(sheetName);
      });
    }

    try {
      const response = await fetch(`${DEPLOYED_URL}?action=index&sheetName=${encodeURIComponent(sheetName)}`, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const result = await response.json();
      
      if (result.success === false) {
        throw new Error(result.error || 'Server returned unsuccessful response');
      }
      
      // Return result.data directly as an array for consistency
      return result.data || []; 
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to fetch data from backend');
    }
  },

  async createRecord(sheetName = 'Items', data = {}) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .createRecord(sheetName, data);
      });
    }

    try {
      const response = await fetch(DEPLOYED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'create', sheetName, data }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (result.success === false || (result.status && result.status !== 'success')) {
        throw new Error(result.error || result.message || 'Failed to create record');
      }
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  },

  async updateRecord(sheetName = 'Items', recordId, recordData) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .updateRecord(sheetName, recordId, recordData);
      });
    }

    try {
      const response = await fetch(DEPLOYED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update', sheetName, id: recordId, data: recordData }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (result.success === false || (result.status && result.status !== 'success')) {
        throw new Error(result.error || result.message || 'Failed to update record');
      }
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  },

 async deleteRecord(sheetName = 'Items', recordId) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .deleteRecord(sheetName, recordId);
      });
    }

    try {
      // Ensure recordId is cleanly wrapped whether it's passed as a number or object
      const payload = typeof recordId === 'object' ? recordId : { rowIndex: recordId };

      const response = await fetch(DEPLOYED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', sheetName, id: payload.rowIndex || payload.ID, payload }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (result.success === false || (result.status && result.status !== 'success')) {
        throw new Error(result.error || result.message || 'Failed to delete record');
      }
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  },
};