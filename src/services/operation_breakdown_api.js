const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycby0I4W65bwlSkeB37Jnh7yJZPTxl3JUcACPLJLR91WStMlUtUtAmGv9Oh-q6kki1EXZ-w/exec';

/**
 * Helper function to handle POST requests consistently
 */
export async function dbAPI(payload) {
  const response = await fetch(DEPLOYED_URL, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  const result = await response.json();

  if (result.status === 'error' || result.success === false) {
    throw new Error(result.error || result.message || 'API request failed');
  }

  return result.data || result;
}

export const obAPI = {
  async readRecords(sheetName = 'Header') {
    const response = await fetch(`${DEPLOYED_URL}?action=read&sheetName=${encodeURIComponent(sheetName)}`, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.status === 'error' || result.success === false) {
      throw new Error(result.error || result.message || 'Failed to read records');
    }

    return result.records || result.data || [];
  },

  async createRecord(sheetName = 'Header', data = {}) {
    return await dbAPI({
      action: 'create',
      sheetName,
      data
    });
  },

  async updateRecord(sheetName = 'Header', recordId, recordData) {
    // Handle case where recordId is omitted and passed as an object payload
    if (typeof recordId === 'object' && recordId !== null && !recordData) {
      recordData = recordId;
      // Ensure you have a valid identifier field matching your Google Sheet structure
      recordId = recordData.id || recordData.ID || recordData.Item_Name || recordData.item_Name;

      if (!recordId) {
        throw new Error('Update requires a valid record ID or identifier field.');
      }
    }

    return await dbAPI({
      action: 'update',
      sheetName,
      id: recordId,
      data: recordData
    });
  },

  async deleteRecord(sheetName = 'Header', recordId) {
    if (!recordId) {
      throw new Error('Delete requires a valid record ID.');
    }

    return await dbAPI({
      action: 'delete',
      sheetName,
      id: recordId
    });
  }
};