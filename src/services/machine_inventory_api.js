const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwTfsVaEdhqwQErGSjZuv0ZQxKgVhFEqUL2gjPEkZkt2vZEWAkhvIXXoygXZbkorgSWTA/exec';

export const dbAPI = {
  async getRecords(sheetKey) {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=${sheetKey}`);
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch records');
    } catch (error) {
      console.error('Error fetching records from Google Sheets:', error);
      return [];
    }
  },

  async getNextMachineId(sheetKey = 'Machine_List') {
    try {
      const res = await fetch(`${SCRIPT_URL}?sheet=${sheetKey}&action=getLastMachineId`);
      const result = await res.json();
      if (result.success) {
        return result;
      }
      throw new Error(result.error || 'Failed to fetch next machine ID');
    } catch (error) {
      console.error('Error fetching next machine ID:', error);
      return { success: false, nextMachineId: 'MCH-10001' };
    }
  },

  async saveRecord(sheetKey, recordData) {
    return this._sendRequest(sheetKey, 'create', recordData);
  },

  async updateRecord(sheetKey, recordData) {
    return this._sendRequest(sheetKey, 'update', recordData);
  },

  async deleteRecord(sheetKey, rowIndex) {
    return this._sendRequest(sheetKey, 'delete', { rowIndex });
  },

  async _sendRequest(sheetKey, actionType, recordData) {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          sheet: sheetKey,
          action: actionType,
          payload: recordData
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute action');
      }
      return result;
    } catch (error) {
      console.error(`Error executing ${actionType} on Google Sheets:`, error);
      throw error;
    }
  }
};