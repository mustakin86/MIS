import { DEPLOYED_URL } from '@/config.js';

export const dbAPI = {
  async readRecords(sheetName = 'Machines') {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(res => {
            if (!res) return resolve([]);
            if (Array.isArray(res)) return resolve(res);
            const data = res.machines || res.data || res.items || res.users || res.operations || [];
            resolve(Array.isArray(data) ? data : []);
          })
          .withFailureHandler(reject)
          .readRecords(sheetName);
      });
    }

    const response = await fetch(`${DEPLOYED_URL}?action=read&sheetName=${encodeURIComponent(sheetName)}`, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const result = await response.json();

    if (result.status === 'error') throw new Error(result.error);

    const records = result.machines || result.data || result.items || result.users || result.operations || result;
    return Array.isArray(records) ? records : [];
  },

  async createRecord(sheetName = 'Machines', data = {}) {
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
    if (result.status === 'error') throw new Error(result.error);
    return result.data || result;
  },

  async updateRecord(sheetName = 'Machines', recordId, recordData) {
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
    if (result.status === 'error') throw new Error(result.error);
    return result.data || result;
  },

  async deleteRecord(sheetName = 'Machines', recordId) {
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
    if (result.status === 'error') throw new Error(result.error);
    return result.data || result;
  }
};