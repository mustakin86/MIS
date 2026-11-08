const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbx_XvFLznbRR1CDouPdAKJESE-1eugiqkbr5E1uPdoyWMQLtXeEU-O0ZY5ZbFLQDpKeVQ/exec';

export const obAPI = {
  async readRecords(sheetName = 'Header') {
    const response = await fetch(`${DEPLOYED_URL}?action=read&sheetName=${encodeURIComponent(sheetName)}`, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const result = await response.json();
    return result.records || result.data || [];
  },

  async createRecord(sheetName = 'Header', data = {}) {
    const response = await fetch(DEPLOYED_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'create', sheetName, data }),
      redirect: 'follow'
    });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const result = await response.json();
    if (result.success === false) throw new Error(result.error || 'Failed to create record');
    return result.data || result;
  }
};