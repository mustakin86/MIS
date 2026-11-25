const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbyMVBKU5prg2ZmkrMjLZzwk9DqoH-AjxzM5-LA-92J1URjFFzjoC9CTM1ZVI7MO9PSeBw/exec';

const DEFAULT_SHEET = 'Shift_time';
const REQUEST_TIMEOUT_MS = 15000;

function hasGasBridge() {
  return typeof google !== 'undefined' && Boolean(google?.script?.run);
}

function callGasFunction(fnName, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler((err) => {
        reject(new Error(err?.message || String(err) || `GAS ${fnName} failed`));
      })[fnName](...args);
  });
}

async function postToWebApp(bodyPayload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(DEPLOYED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(bodyPayload),
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON response from Apps Script (check web app deployment & permissions)');
    }

    if (result?.success === false || (result?.status && result.status !== 'success')) {
      throw new Error(result.error || result.message || 'Apps Script operation failed');
    }

    return result;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const dbAPI = {
  async readRecords(sheetName = DEFAULT_SHEET) {
    if (hasGasBridge()) {
      const res = await callGasFunction('readRecords', sheetName);
      return Array.isArray(res) ? res : (res?.data ?? []);
    }

    const url = `${DEPLOYED_URL}?action=index&sheetName=${encodeURIComponent(sheetName)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON response from Apps Script');
      }

      if (result?.success === false || (result?.status && result.status !== 'success')) {
        throw new Error(result.error || result.message || 'Server returned unsuccessful response');
      }

      return Array.isArray(result) ? result : (result?.data ?? []);
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Read request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
      }
      throw new Error(err.message || 'Failed to fetch data from backend');
    } finally {
      clearTimeout(timer);
    }
  },

  async createRecord(sheetName = DEFAULT_SHEET, data = {}) {
    if (hasGasBridge()) {
      const res = await callGasFunction('createRecord', sheetName, data);
      return res?.data !== undefined ? res.data : res;
    }

    const result = await postToWebApp({ action: 'create', sheetName, data });
    return result?.data !== undefined ? result.data : result;
  },

  async updateRecord(sheetName = DEFAULT_SHEET, recordId, recordData) {
    if (hasGasBridge()) {
      const res = await callGasFunction('updateRecord', sheetName, recordId, recordData);
      return res?.data !== undefined ? res.data : res;
    }

    const result = await postToWebApp({
      action: 'update',
      sheetName,
      id: recordId,
      data: recordData,
    });
    return result?.data !== undefined ? result.data : result;
  },

  async deleteRecord(sheetName = DEFAULT_SHEET, recordId) {
    if (hasGasBridge()) {
      const res = await callGasFunction('deleteRecord', sheetName, recordId);
      return res?.data !== undefined ? res.data : res;
    }

    const id =
      typeof recordId === 'object' && recordId !== null
        ? (recordId.id ?? recordId.ID ?? recordId.rowIndex)
        : recordId;

    const result = await postToWebApp({
      action: 'delete',
      sheetName,
      id,
      payload: typeof recordId === 'object' && recordId !== null ? recordId : { id },
    });
    return result?.data !== undefined ? result.data : result;
  },

  // Backward-compatible aliases
  async getRecords(sheetName = DEFAULT_SHEET) {
    return this.readRecords(sheetName);
  },

  async saveRecord(sheetName = DEFAULT_SHEET, data = {}) {
    return this.createRecord(sheetName, data);
  },
};