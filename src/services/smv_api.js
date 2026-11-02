// Separate deployed URL constants for your respective Google Apps Script projects


const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbwF3VOrJGQUQx8HozZQH6g63pAsnSXWbYw085H0Eq7INj90Vj5Q_K61hlAeTrVsXYHn/exec';


const ITEM_API_URL = 'https://script.google.com/macros/s/AKfycbw_S55LMULdm84N3jSbRyOavrghKDjSRap-Od-wvpHmJJrqzFtzSVekxMi3FpKc8tcU/exec';
const MACHINE_API_URL = 'https://script.google.com/macros/s/AKfycbwF3VOrJGQUQx8HozZQH6g63pAsnSXWbYw085H0Eq7INj90Vj5Q_K61hlAeTrVsXYHn/exec';

export const smvAPI = {
  // Generic read records method with optional custom URL
  async readRecords(sheetName, customUrl = ITEM_API_URL) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .readRecords(sheetName);
      });
    }

    try {
      const response = await fetch(`${customUrl}?sheetName=${encodeURIComponent(sheetName)}`, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const result = await response.json();
      if (result && result.status === 'error') {
        throw new Error(result.error || 'Server returned an error');
      }
      
      return result; 
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to fetch data from backend');
    }
  },

async getItems() {
    const res = await this.readRecords('Items', ITEM_API_URL);
    console.log("Items API Raw Response:", res); // Check browser console F12 to see this
    // Handles array directly, or nested inside items, data, or records
    if (Array.isArray(res)) return res;
    return res?.items || res?.data?.items || res?.records || res?.data || [];
  },

  async getMachines() {
    const res = await this.readRecords('Machines', MACHINE_API_URL);
    console.log("Machines API Raw Response:", res); // Check browser console F12 to see this
    if (Array.isArray(res)) return res;
    return res?.machine || res?.machines || res?.data?.machine || res?.data?.machines || res?.records || res?.data || [];
  },

  // Create record (e.g. saving SMV operations or entries)
  async createRecord(sheetName = 'Operations', data = {}, customUrl = DEPLOYED_URL) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .createRecord(sheetName, data);
      });
    }

    try {
      const response = await fetch(customUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'create', sheetName, data }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (result && result.status === 'error') throw new Error(result.error || 'Failed to create record');
      return result.data || result;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  },

  // Update record
  async updateRecord(sheetName, recordId, recordData, customUrl = DEPLOYED_URL) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .updateRecord(sheetName, recordId, recordData);
      });
    }

    try {
      const response = await fetch(customUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update', sheetName, id: recordId, data: recordData }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (result && result.status === 'error') throw new Error(result.error || 'Failed to update record');
      return result.data || result;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  },

  // Delete record
  async deleteRecord(sheetName, recordId, customUrl = DEPLOYED_URL) {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .deleteRecord(sheetName, recordId);
      });
    }

    try {
      const response = await fetch(customUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', sheetName, id: recordId }),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (result && result.status === 'error') throw new Error(result.error || 'Failed to delete record');
      return result.data || result;
    } catch (err) {
      console.error('Fetch error:', err);
      throw new Error(err.message || 'Failed to communicate with Apps Script');
    }
  }
};