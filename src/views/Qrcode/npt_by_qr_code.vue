<template>
  <div class="dashboard-container">
    <!-- Header Controls -->
    <header class="table-header">
      <h2>Daily NPT Records</h2>
      <div class="actions">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search records..." 
          class="search-input"
        />
        <button class="btn btn-secondary" @click="openScanModal">📷 Scan QR Code</button>
      </div>
    </header>

    <!-- Data Table -->
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th v-for="header in HEADERS" :key="header">
              {{ formatHeader(header) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredRecords.length === 0">
            <td :colspan="HEADERS.length" class="no-data">No records found</td>
          </tr>
          <tr v-for="record in filteredRecords" :key="record.ID">
            <td v-for="header in HEADERS" :key="header">
              <span v-if="header === 'QRcode'" class="badge badge-code">{{ record[header] }}</span>
              <span v-else-if="header === 'Type_of_Problem'" class="badge badge-problem">{{ record[header] }}</span>
              <span v-else-if="header === 'TTL_Time'" class="badge badge-ttl">{{ calculateTTL(record.Start_time, record.End_Time) }}</span>
              <span v-else>{{ record[header] }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile QR Camera Scanner Modal -->
    <div v-if="showScanModal" class="modal-overlay" @click.self="closeScanModal">
      <div class="modal-content scanner-modal">
        <h3>Select Problem & Scan QR</h3>
        <p class="scanner-desc">First, choose the problem type. Once selected, click "Start Scanner" to activate your camera.</p>
        
        <!-- Step 1: Problem Type Selector -->
        <div class="form-group" v-if="!cameraActive">
          <label for="problemSelect">Type of Problem:</label>
          <select id="problemSelect" v-model="selectedProblemType" class="select-input">
            <option value="Sensor Error">Sensor Error</option>
            <option value="Hardware Failure">Hardware Failure</option>
            <option value="Network Latency">Network Latency</option>
            <option value="Mechanical Jam">Mechanical Jam</option>
          </select>
          <button type="button" class="btn btn-primary" style="margin-top: 1rem; width: 100%;" @click="startCamera">
            Proceed to Camera Scan
          </button>
        </div>

        <!-- Step 2: Camera Stream Component (Only starts after clicking Proceed) -->
        <div v-if="cameraActive">
          <p class="active-problem-badge">Active Problem: <strong>{{ selectedProblemType }}</strong></p>
          <div class="camera-container">
            <qrcode-stream camera="auto" @decode="processScan" @detect="onCameraDetect" @error="onCameraError">
              <div v-if="loadingCamera" class="camera-loading">Loading camera...</div>
            </qrcode-stream>
          </div>
          <button type="button" class="btn btn-secondary" style="width: 100%; margin-bottom: 1rem;" @click="cameraActive = false">
            Change Problem Type
          </button>
        </div>

        <p v-if="cameraError" class="error-text">{{ cameraError }}</p>

        <!-- Fallback Manual Input for Testing -->
        <div class="manual-fallback">
          <label for="fallbackCode">Or test/enter manually:</label>
          <div class="fallback-row">
            <input 
              id="fallbackCode"
              v-model="scanFormCode" 
              type="text" 
              placeholder="e.g. QR-99999" 
            />
            <button type="button" class="btn btn-primary" @click="processScan(scanFormCode)">Submit</button>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="closeScanModal">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { QrcodeStream } from 'vue-qrcode-reader';
import { dbAPI } from '@/services/npr_qr_code_api.js';

const HEADERS = ['ID', 'QRcode', 'Type_of_Problem', 'Start_time', 'End_Time', 'TTL_Time', 'Remarks', 'Created_Date'];

const searchQuery = ref('');
const showScanModal = ref(false);
const cameraActive = ref(false);
const loadingCamera = ref(false);
const cameraError = ref('');

const selectedProblemType = ref('Sensor Error');
const scanFormCode = ref('');

const records = ref([]);

onMounted(async () => {
  const fetchedData = await dbAPI.getRecords();
  if (fetchedData && fetchedData.length > 0) {
    records.value = fetchedData.reverse();
  }
});

const formatDeviceTime = (date = new Date()) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)} ${ampm}`;
};

const calculateTTL = (start, end) => {
  if (!start || !end || start === '-' || end === '-') return '-';

  const parse12HourTime = (timeStr) => {
    const parts = timeStr.split(' ');
    if (parts.length < 2) return 0;
    const [time, modifier] = parts;
    let [hours, minutes, seconds] = time.split(':').map(Number);
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
  };

  const startTotalSeconds = parse12HourTime(start);
  const endTotalSeconds = parse12HourTime(end);

  let diffSeconds = endTotalSeconds - startTotalSeconds;
  if (diffSeconds < 0) diffSeconds += 24 * 3600;

  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

// Helper to convert 12-hour AM/PM string back to Date object for 10-minute check
const parseTimeStringToDate = (timeStr, dateStr) => {
  if (!timeStr) return null;
  const parts = timeStr.split(' ');
  if (parts.length < 2) return null;
  const [time, modifier] = parts;
  let [hours, minutes, seconds] = time.split(':').map(Number);
  
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day, hours, minutes, seconds || 0);
  return d;
};

// Global / Background QR Scan Triggered Anywhere (Bypasses modal if within 10 min)
const handleBackgroundScan = async (scannedCode) => {
  const code = scannedCode ? scannedCode.trim() : '';
  if (!code) return;

  const now = new Date();

  // Find if there is an active record for this QR code created less than 10 minutes ago
  const activeRecord = records.value.find(r => {
    if (r.QRcode !== code || (r.End_Time && r.End_Time !== '-' && r.End_Time !== '')) {
      return false;
    }
    const recordStartTime = parseTimeStringToDate(r.Start_time, r.Created_Date);
    if (!recordStartTime) return false;

    const diffMinutes = (now - recordStartTime) / (1000 * 60);
    return diffMinutes <= 1; // Within 10 minutes cooldown threshold
  });

  if (activeRecord) {
    // Directly close the active record and sync to Google Sheets without opening camera/modal
    activeRecord.End_Time = formatDeviceTime(now);
    activeRecord.TTL_Time = calculateTTL(activeRecord.Start_time, activeRecord.End_Time);
    activeRecord.Remarks = 'Auto-closed within 10 min scan';

    try {
      await dbAPI.saveRecord(activeRecord, 'update');
      console.log('QR Code re-scanned within 10 minutes. Automatically saved End Time to Google Sheet.');
    } catch (error) {
      console.error('Failed to update record:', error);
    }
  } else {
    // If not scanned within 10 minutes or no open session exists, open selection modal normally
    showScanModal.value = true;
    cameraActive.value = false;
    scanFormCode.value = code; // Prefill code if needed
  }
};

const openScanModal = () => {
  cameraError.value = '';
  cameraActive.value = false;
  scanFormCode.value = '';
  showScanModal.value = true;
};

const closeScanModal = () => {
  showScanModal.value = false;
  cameraActive.value = false;
  scanFormCode.value = '';
};

const startCamera = () => {
  cameraError.value = '';
  cameraActive.value = true;
};

const onCameraDetect = (detectedCodes) => {
  if (detectedCodes && detectedCodes.length > 0) {
    processScan(detectedCodes[0].rawValue);
  }
};

const onCameraError = (err) => {
  if (err.name === 'NotAllowedError') cameraError.value = 'Camera permission denied.';
  else if (err.name === 'NotFoundError') cameraError.value = 'No camera device found.';
  else cameraError.value = `Camera error: ${err.message}`;
};

const processScan = async (scannedCode) => {
  const code = scannedCode ? scannedCode.trim() : '';
  if (!code) return;

  const now = new Date();

  const activeRecord = records.value.find(
    r => r.QRcode === code && (!r.End_Time || r.End_Time === '-' || r.End_Time === '')
  );

  if (activeRecord) {
    activeRecord.End_Time = formatDeviceTime(now);
    activeRecord.TTL_Time = calculateTTL(activeRecord.Start_time, activeRecord.End_Time);
    activeRecord.Remarks = '';

    try {
      await dbAPI.saveRecord(activeRecord, 'update');
    } catch (error) {
      console.error('Failed to update record:', error);
    }
  } else {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const strictDateStr = `${year}-${month}-${day}`;

    const newEntry = {
      QRcode: code,
      Type_of_Problem: selectedProblemType.value,
      Start_time: formatDeviceTime(now),
      End_Time: '',
      TTL_Time: '-',
      Remarks: 'Scan initiated - awaiting end scan',
      Created_Date: strictDateStr
    };

    try {
      await dbAPI.saveRecord(newEntry, 'create');
      const refreshedData = await dbAPI.getRecords();
      if (refreshedData) {
        records.value = refreshedData.reverse();
      }
    } catch (error) {
      console.error('Failed to create record:', error);
    }
  }

  closeScanModal();
};

const formatHeader = (headerKey) => headerKey.replace(/_/g, ' ');

const filteredRecords = computed(() => {
  if (!searchQuery.value) return records.value;
  const q = searchQuery.value.toLowerCase();
  return records.value.filter(record => 
    Object.values(record).some(val => String(val).toLowerCase().includes(q))
  );
});
</script>

<style scoped>
.dashboard-container {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  max-width: 1150px;
  margin: 2rem auto;
  padding: 1.5rem;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
}

.search-input {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

th, td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

th {
  background-color: #f9fafb;
  color: #374151;
  font-weight: 600;
  text-transform: capitalize;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.badge-code {
  background: #eff6ff;
  color: #1d4ed8;
  font-family: monospace;
}

.badge-problem {
  background: #fef2f2;
  color: #dc2626;
}

.badge-ttl {
  background: #f3f4f6;
  color: #1f2937;
  font-family: monospace;
  font-weight: 600;
}

.no-data {
  text-align: center;
  color: #6b7280;
  padding: 2rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background-color: #2563eb;
  color: #ffffff;
}

.btn-secondary {
  background-color: #e5e7eb;
  color: #374151;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 450px;
  max-width: 90%;
}

.scanner-modal {
  width: 400px;
}

.scanner-desc {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.active-problem-badge {
  font-size: 0.85rem;
  color: #1f2937;
  margin-bottom: 0.5rem;
  background: #f3f4f6;
  padding: 0.4rem;
  border-radius: 4px;
}

.camera-container {
  width: 100%;
  height: 220px;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 1rem;
  position: relative;
}

.camera-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ffffff;
  font-size: 0.9rem;
}

.error-text {
  color: #dc2626;
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

.manual-fallback {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.manual-fallback label {
  font-size: 0.8rem;
  color: #4b5563;
}

.fallback-row {
  display: flex;
  gap: 0.5rem;
}

.fallback-row input {
  flex: 1;
  padding: 0.4rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.form-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  color: #374151;
  font-weight: 500;
}

.form-group input, .select-input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  width: 100%;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>