// src/services/operations_api.js

const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbx1Rc0LBPVMS1A6qDnfVUFJPAMziEUA4Jy2RaRLYGnVwJMvTQ5Cz6rb97CtgMBMKCeFkg/exec';

export const dbAPI = {
  async readRecords(sheetName = 'Operations') {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(res => {
            if (!res) return resolve([]);
            if (Array.isArray(res)) return resolve(res);
            const data = res.operations || res.data || res.items || res.machines || res.users || [];
            resolve(Array.isArray(data) ? data : []);
          })
          .withFailureHandler(reject)
          .readRecords(sheetName);
      });
    }

    try {
      const response = await fetch(`${DEPLOYED_URL}?action=read&sheetName=${encodeURIComponent(sheetName)}`, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const result = await response.json();

      if (result.status === 'error' || result.success === false) {
        throw new Error(result.error || result.message || 'Server returned an error');
      }

      const records = result.operations || result.data || result.items || result.machines || result.users || result;
      return Array.isArray(records) ? records : [];
    } catch (err) {
      console.error("Fetch Error details:", err);
      throw err;
    }
  },

  async createRecord(sheetName = 'Operations', data = {}) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(res => resolve(res?.data || res))
          .withFailureHandler(reject)
          .createRecord(sheetName, data);
      });
    }

    const response = await fetch(DEPLOYED_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'create', sheetName, data }),
      redirect: 'follow'
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const result = await response.json();
    if (result.status === 'error' || result.success === false) {
      throw new Error(result.error || result.message || 'Failed to create record');
    }
    return result.data || result;
  },

  async updateRecord(sheetName = 'Operations', recordId, recordData) {
    // If recordId is omitted and passed directly as the payload object, shift arguments
    if (typeof recordId === 'object' && recordId !== null && !recordData) {
      recordData = recordId;
      recordId = recordData.Item_Name || recordData.item_Name || recordData.itemName || 'update';
    }

    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(res => resolve(res?.data || res))
          .withFailureHandler(reject)
          .updateRecord(sheetName, recordId, recordData);
      });
    }

    const response = await fetch(DEPLOYED_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'update', sheetName, id: recordId, data: recordData }),
      redirect: 'follow'
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const result = await response.json();
    if (result.status === 'error' || result.success === false) {
      throw new Error(result.error || result.message || 'Failed to update record');
    }
    return result.data || result;
  },

  async deleteRecord(sheetName = 'Operations', recordId) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(res => resolve(res?.data || res))
          .withFailureHandler(reject)
          .deleteRecord(sheetName, recordId);
      });
    }

    const response = await fetch(DEPLOYED_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', sheetName, id: recordId }),
      redirect: 'follow'
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const result = await response.json();
    if (result.status === 'error' || result.success === false) {
      throw new Error(result.error || result.message || 'Failed to delete record');
    }
    return result.data || result;
  }
};