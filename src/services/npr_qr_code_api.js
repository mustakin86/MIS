const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyx8nt93QvuwFdSUgd6W-rA4S_NbV-EGhulIPqTcO2gVwjqXy_-0MdDqNdiYOMKORoj/exec';

export const dbAPI = {
  // Fetch existing records on load
  async getRecords() {
    try {
      const response = await fetch(SCRIPT_URL);
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

  // Save (Create or Update) record data
  async saveRecord(recordData, actionType = 'create') {
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Required for Google Apps Script web apps
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType, // 'create' or 'update'
          payload: recordData
        })
      });
      console.log(`Successfully sent ${actionType} request to Google Sheets`);
    } catch (error) {
      console.error('Error sending data to Google Sheets:', error);
      throw error;
    }
  }
};