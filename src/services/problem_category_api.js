const SCRIPT_URL =
  import.meta.env.VITE_NPT_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbyqnKxDs0-FSJj-xYdjqHzFJjPchNn50KjDdTermu1EQ9zCMfD7g34IC6abdMzkHjk3/exec';

export const dbAPI = {
  // Fetch existing records for the specified sheet tab
  async getRecords(sheetKey) {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=${encodeURIComponent(sheetKey)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while fetching records`);
      }
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch records');
    } catch (error) {
      console.error('Error fetching records from Google Sheets:', error);
      throw error;
    }
  },

  async getProblemCategories() {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getProblemCategories`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while fetching problem categories`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch problem categories');
      }
      return result.categories || [];
    } catch (error) {
      console.error('Error fetching problem categories:', error);
      throw error;
    }
  },

  // Save (Create, Update, or Delete) record data with sheet context
  async saveRecord(sheetKey, recordData, actionType = 'create') {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Bypasses Apps Script CORS restrictions
        body: JSON.stringify({
          sheet: sheetKey,
          action: actionType, // 'create', 'update', or 'delete'
          payload: recordData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while executing ${actionType}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute action');
      }
      return result;
    } catch (error) {
      console.error('Error sending data to Google Sheets:', error);
      throw error;
    }
  }
};