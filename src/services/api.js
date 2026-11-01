// src/services/api.js

const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbyee-4i1p3Nb1Quasyv8RRR0pS6GjBdR2GATyuUFeGO6pl08Fn5h0GEsBCnJJBisMjA5w/exec';

export const dbAPI = {
  async readRecords(sheetName = 'Users') {
    // 1. Google Apps Script execution context
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .readRecords(sheetName);
      });
    }

    // 2. Vite local dev server (GET query to prevent CORS redirect blocks)
    try {
      const response = await fetch(`${DEPLOYED_URL}?sheetName=${encodeURIComponent(sheetName)}`, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Server returned unsuccessful response');
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to fetch data from backend');
    }
  },

  async createRecord(sheetName = 'Users', data = {}) {
    // 1. Google Apps Script execution context
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .createRecord(sheetName, data);
      });
    }

    // 2. Vite local dev server (POST text/plain)
    try {
      const response = await fetch(DEPLOYED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'create', sheetName, data }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to create record');
      return result.data;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  }
};