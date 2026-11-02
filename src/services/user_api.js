// src/services/api.js

const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbw_S55LMULdm84N3jSbRyOavrghKDjSRap-Od-wvpHmJJrqzFtzSVekxMi3FpKc8tcU/exec';

export const dbAPI = {
  async readRecords(sheetName = 'Users') {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .readRecords(sheetName);
      });
    }

    try {
      const response = await fetch(`${DEPLOYED_URL}?sheetName=${encodeURIComponent(sheetName)}`, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.error || 'Server returned unsuccessful response');
      
      // Return the full result object so the component can access result.users
      return result;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to fetch data from backend');
    }
  },

  async createRecord(sheetName = 'Users', data = {}) {
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
      if (result.status !== 'success') throw new Error(result.error || 'Failed to create record');
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  },

  async updateRecord(sheetName = 'Users', recordId, recordData) {
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
      if (result.status !== 'success') throw new Error(result.error || 'Failed to update record');
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  },

  async deleteRecord(sheetName = 'Users', recordId) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .deleteRecord(sheetName, recordId);
      });
    }

    try {
      const response = await fetch(DEPLOYED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', sheetName, id: recordId }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.error || 'Failed to delete record');
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  }
};