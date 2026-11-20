<script setup>
import { onMounted, reactive, ref } from 'vue';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

const DEFAULT_SIZE_POOL = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const DEFAULT_COLOR_OPTIONS = [
  'Black',
  'White',
  'Navy',
  'Red',
  'Royal Blue',
  'Olive',
  'Charcoal',
  'Maroon'
];

const colorOptions = ref([...DEFAULT_COLOR_OPTIONS]);
const isSaving = ref(false);
const statusMessage = ref('');
const statusError = ref(false);

onMounted(async () => {
  // Optional: load colors from your backend/library API
  // try {
  //   const res = await fetch('/api/library/colors');
  //   const data = await res.json();
  //   if (Array.isArray(data) && data.length) {
  //     colorOptions.value = data;
  //   }
  // } catch (err) {
  //   console.warn('Using default color list:', err);
  // }
});

const createSizeMap = (sizes) => {
  const map = {};
  sizes.forEach((sz) => {
    map[sz] = 0;
  });
  return map;
};

const createColorDraft = (colorName = '', customColorInput = '') => ({
  id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  colorName,
  customColorInput
});

const poSetup = reactive({
  configured: false,
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  colors: []
});

const modalState = reactive({
  isOpen: false,
  poNo: '',
  isLoadingPo: false,
  totalColorCount: 3,
  selectedSizes: ['S', 'M', 'L', 'XL', 'XXL'],
  customSizeInput: '',
  colorDrafts: [],
  errorMsg: ''
});

const buildStyleColorsFromPo = (existingColors = [], nextSizes = []) => {
  const existingByColor = new Map(existingColors.map((c) => [c.colorName, c]));

  return poSetup.colors.map((colorName, idx) => {
    const prev = existingByColor.get(colorName) || existingColors[idx];
    const sizeQuantities = createSizeMap(nextSizes);

    if (prev && prev.sizes) {
      nextSizes.forEach((sz) => {
        if (prev.sizes[sz] !== undefined) {
          sizeQuantities[sz] = Number(prev.sizes[sz]) || 0;
        }
      });
    }

    return {
      id: prev?.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      colorName,
      sizes: sizeQuantities
    };
  });
};

const createEmptyStyle = () => ({
  id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  styleNo: '',
  colors: poSetup.configured ? buildStyleColorsFromPo([], poSetup.sizes) : []
});

const orderForm = reactive({
  poNo: '',
  styles: [createEmptyStyle()]
});

const syncColorDraftsCount = (count) => {
  const safeCount = Math.max(1, Math.min(50, Number(count) || 1));
  modalState.totalColorCount = safeCount;

  if (modalState.colorDrafts.length < safeCount) {
    const needed = safeCount - modalState.colorDrafts.length;
    for (let i = 0; i < needed; i++) {
      modalState.colorDrafts.push(createColorDraft());
    }
  } else if (modalState.colorDrafts.length > safeCount) {
    modalState.colorDrafts.splice(safeCount);
  }
};

const fetchPoDetailsFromBackend = async (poNo) => {
  // Optional: fetch existing colors & sizes for this PO No from Apps Script / API
  // const url = `${APPS_SCRIPT_URL}?action=getPo&poNo=${encodeURIComponent(poNo)}`;
  // const res = await fetch(url);
  // const data = await res.json();
  // return data?.ok ? data : null;
  return null;
};

const openPoSetupModal = async () => {
  const currentPoNo = orderForm.poNo.trim();
  modalState.poNo = currentPoNo;
  modalState.customSizeInput = '';
  modalState.errorMsg = currentPoNo
    ? ''
    : 'Tip: Enter PO No in the header first so it is linked to this setup.';
  modalState.isLoadingPo = true;
  modalState.isOpen = true;

  try {
    const backendPo = currentPoNo ? await fetchPoDetailsFromBackend(currentPoNo) : null;

    const baseSizes =
      Array.isArray(backendPo?.sizes) && backendPo.sizes.length > 0
        ? [...backendPo.sizes]
        : poSetup.sizes && poSetup.sizes.length > 0
          ? [...poSetup.sizes]
          : ['S', 'M', 'L', 'XL', 'XXL'];

    const sourceColors =
      Array.isArray(backendPo?.colors) && backendPo.colors.length > 0
        ? backendPo.colors
        : poSetup.colors;

    modalState.selectedSizes = baseSizes;

    const targetCount = sourceColors.length > 0 ? sourceColors.length : 3;
    modalState.totalColorCount = targetCount;

    modalState.colorDrafts = Array.from({ length: targetCount }, (_, idx) => {
      const existingColor = sourceColors[idx];
      if (!existingColor) return createColorDraft();
      const isKnown = colorOptions.value.includes(existingColor);
      return isKnown
        ? createColorDraft(existingColor, '')
        : createColorDraft('__CUSTOM__', existingColor);
    });
  } finally {
    modalState.isLoadingPo = false;
  }
};

const closePoSetupModal = () => {
  modalState.isOpen = false;
  modalState.errorMsg = '';
};

const toggleModalSize = (size) => {
  const idx = modalState.selectedSizes.indexOf(size);
  if (idx > -1) {
    modalState.selectedSizes.splice(idx, 1);
  } else {
    modalState.selectedSizes.push(size);
  }
};

const addModalCustomSize = () => {
  const clean = modalState.customSizeInput.trim().toUpperCase();
  if (!clean) return;
  if (!modalState.selectedSizes.includes(clean)) {
    modalState.selectedSizes.push(clean);
  }
  modalState.customSizeInput = '';
};

const isColorTakenByOtherDraft = (colorName, currentDraftId) => {
  return modalState.colorDrafts.some(
    (d) => d.id !== currentDraftId && d.colorName === colorName
  );
};

const handleModalColorChange = (draft) => {
  if (draft.colorName !== '__CUSTOM__') {
    draft.customColorInput = '';
  }
};

const saveModalCustomColor = (draft) => {
  const clean = draft.customColorInput.trim();
  if (!clean) return;
  if (!colorOptions.value.includes(clean)) {
    colorOptions.value.push(clean);
  }
  draft.colorName = clean;
  draft.customColorInput = '';
};

const resolveDraftColor = (draft) => {
  if (draft.colorName === '__CUSTOM__') {
    return draft.customColorInput.trim();
  }
  return draft.colorName.trim();
};

const applyPoSetupOnce = () => {
  if (modalState.selectedSizes.length === 0) {
    modalState.errorMsg = 'Please select or add at least one size.';
    return;
  }

  const resolvedColors = modalState.colorDrafts.map((d) => resolveDraftColor(d));
  if (resolvedColors.some((name) => !name)) {
    modalState.errorMsg = 'Please select or enter a color for every row.';
    return;
  }

  const uniqueColors = new Set(resolvedColors);
  if (uniqueColors.size !== resolvedColors.length) {
    modalState.errorMsg = 'Duplicate colors are not allowed in the same PO setup.';
    return;
  }

  resolvedColors.forEach((name) => {
    if (!colorOptions.value.includes(name)) {
      colorOptions.value.push(name);
    }
  });

  const nextSizes = [...modalState.selectedSizes];
  poSetup.sizes = nextSizes;
  poSetup.colors = resolvedColors;
  poSetup.configured = true;

  orderForm.styles.forEach((style) => {
    style.colors = buildStyleColorsFromPo(style.colors, nextSizes);
  });

  closePoSetupModal();
};

const handleRowColorChange = (changedStyleIndex, changedRowIndex) => {
  const changedRow = orderForm.styles[changedStyleIndex].colors[changedRowIndex];
  const newColor = changedRow.colorName;

  orderForm.styles.forEach((style, sIdx) => {
    if (sIdx !== changedStyleIndex && style.colors[changedRowIndex]) {
      style.colors[changedRowIndex].colorName = newColor;
    }
  });

  poSetup.colors = orderForm.styles[0].colors.map((c) => c.colorName).filter(Boolean);
};

const isColorUsedInOtherRow = (style, currentRowId, option) => {
  return style.colors.some((r) => r.id !== currentRowId && r.colorName === option);
};

const addStyle = () => {
  orderForm.styles.push(createEmptyStyle());
};

const removeStyle = (styleIndex) => {
  if (orderForm.styles.length > 1) {
    orderForm.styles.splice(styleIndex, 1);
  }
};

const getRowTotal = (colorRow) => {
  return poSetup.sizes.reduce((sum, size) => sum + (Number(colorRow.sizes[size]) || 0), 0);
};

const getSizeTotal = (style, size) => {
  return style.colors.reduce((sum, row) => sum + (Number(row.sizes[size]) || 0), 0);
};

const getStyleTotal = (style) => {
  return style.colors.reduce((sum, row) => sum + getRowTotal(row), 0);
};

const getPoGrandTotal = () => {
  return orderForm.styles.reduce((sum, style) => sum + getStyleTotal(style), 0);
};

const submitOrder = async () => {
  statusMessage.value = '';
  statusError.value = false;

  const payload = {
    poNo: orderForm.poNo.trim(),
    sizes: [...poSetup.sizes],
    colors: [...poSetup.colors],
    grandTotal: getPoGrandTotal(),
    styles: orderForm.styles.map((style) => ({
      styleNo: style.styleNo.trim(),
      styleTotal: getStyleTotal(style),
      colors: style.colors.map((row) => ({
        colorName: row.colorName,
        sizes: { ...row.sizes },
        rowTotal: getRowTotal(row)
      }))
    }))
  };

  try {
    isSaving.value = true;

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Failed to save order.');
    }

    statusMessage.value = `Saved PO "${result.poNo}" (${result.rowsInserted} rows).`;
  } catch (err) {
    statusError.value = true;
    statusMessage.value = err.message || 'Error saving order.';
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <form class="excel-sheet-page" @submit.prevent="submitOrder">
    <!-- Top PO Toolbar -->
    <div class="excel-ribbon">
      <div class="ribbon-group">
        <label for="po-no" class="ribbon-label">PO No <span class="req">*</span></label>
        <input
          id="po-no"
          v-model="orderForm.poNo"
          type="text"
          class="excel-box-input"
          placeholder="Enter PO Number"
          required
        />
      </div>

      <div class="ribbon-group">
        <button type="button" class="xl-btn xl-btn-green" @click="openPoSetupModal">
          {{ poSetup.configured ? 'Edit PO Colors & Sizes' : 'Assign PO Colors & Sizes' }}
        </button>

        <button type="button" class="xl-btn" @click="addStyle">
          + Add Style
        </button>

        <div class="xl-sum-pill">
          <span>PO Total:</span>
          <strong>{{ getPoGrandTotal().toLocaleString() }}</strong>
        </div>
      </div>
    </div>

    <!-- Assigned PO Colors & Sizes Bar -->
    <div v-if="poSetup.configured" class="xl-meta-bar">
      <div>
        <span class="xl-meta-key">Colors ({{ poSetup.colors.length }}):</span>
        <span v-for="clr in poSetup.colors" :key="clr" class="xl-tag xl-tag-color">{{ clr }}</span>
      </div>
      <div>
        <span class="xl-meta-key">Sizes ({{ poSetup.sizes.length }}):</span>
        <span v-for="sz in poSetup.sizes" :key="sz" class="xl-tag">{{ sz }}</span>
      </div>
    </div>

    <!-- Style Grids -->
    <div
      v-for="(style, styleIdx) in orderForm.styles"
      :key="style.id"
      class="xl-worksheet"
    >
      <div class="xl-sheet-toolbar">
        <div class="ribbon-group">
          <span class="xl-sheet-tab">Style #{{ styleIdx + 1 }}</span>
          <input
            :id="`style-no-${style.id}`"
            v-model="style.styleNo"
            type="text"
            class="excel-box-input style-no-box"
            placeholder="Enter Style Number"
            required
          />
        </div>

        <div class="ribbon-group">
          <span class="xl-subtotal">
            Style Total: <strong>{{ getStyleTotal(style).toLocaleString() }}</strong>
          </span>
          <button
            v-if="orderForm.styles.length > 1"
            type="button"
            class="xl-btn xl-btn-red"
            @click="removeStyle(styleIdx)"
          >
            Remove
          </button>
        </div>
      </div>

      <div v-if="!poSetup.configured" class="xl-empty-grid">
        <span>Click <strong>Assign PO Colors & Sizes</strong> to configure colors and sizes once for all styles.</span>
      </div>

      <div v-else class="xl-grid-scroll">
        <table class="xl-table">
          <thead>
            <tr class="xl-field-headers">
              <th class="xl-hdr-sl">#</th>
              <th class="xl-hdr-color">COLOR</th>
              <th v-for="size in poSetup.sizes" :key="size" class="xl-hdr-size">
                {{ size }}
              </th>
              <th class="xl-hdr-total">ROW TOTAL</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(colorRow, colorIdx) in style.colors"
              :key="colorRow.id"
              class="xl-data-row"
            >
              <td class="xl-sl-cell">{{ colorIdx + 1 }}</td>

              <td class="xl-color-cell">
                <select
                  v-model="colorRow.colorName"
                  class="xl-cell-select"
                  required
                  @change="handleRowColorChange(styleIdx, colorIdx)"
                >
                  <option value="" disabled>Select Color</option>
                  <option
                    v-for="opt in colorOptions"
                    :key="opt"
                    :value="opt"
                    :disabled="isColorUsedInOtherRow(style, colorRow.id, opt)"
                  >
                    {{ opt }}
                  </option>
                </select>
              </td>

              <td
                v-for="size in poSetup.sizes"
                :key="size"
                class="xl-num-cell"
              >
                <input
                  v-model.number="colorRow.sizes[size]"
                  type="number"
                  min="0"
                  step="1"
                  class="xl-cell-input"
                  @focus="$event.target.select()"
                />
              </td>

              <td class="xl-row-total-cell">
                {{ getRowTotal(colorRow).toLocaleString() }}
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr class="xl-total-row">
              <td colspan="2" class="xl-total-label">SIZE TOTAL</td>
              <td
                v-for="size in poSetup.sizes"
                :key="size"
                class="xl-total-val"
              >
                {{ getSizeTotal(style, size).toLocaleString() }}
              </td>
              <td class="xl-grand-val">
                {{ getStyleTotal(style).toLocaleString() }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Bottom Save Bar -->
    <div class="xl-bottom-bar">
      <div class="xl-bottom-info">
        Styles: <strong>{{ orderForm.styles.length }}</strong> · Grand Total:
        <strong>{{ getPoGrandTotal().toLocaleString() }}</strong>
        <span v-if="statusMessage" :class="statusError ? 'xl-error-inline' : 'xl-success-inline'">
          — {{ statusMessage }}
        </span>
      </div>
      <button type="submit" class="xl-btn xl-btn-green xl-btn-save" :disabled="isSaving">
        {{ isSaving ? 'Saving...' : 'Save Order' }}
      </button>
    </div>

    <!-- Popup Modal: Assign PO Colors & Sizes -->
    <div v-if="modalState.isOpen" class="xl-modal-backdrop" @click.self="closePoSetupModal">
      <div class="xl-modal" role="dialog" aria-modal="true">
        <div class="xl-modal-header">
          <div>
            <h3>
              Assign PO Colors & Sizes
              <span v-if="modalState.poNo">— PO: {{ modalState.poNo }}</span>
            </h3>
            <p v-if="modalState.isLoadingPo">Fetching PO details...</p>
            <p v-else>
              PO No: <strong>{{ modalState.poNo || 'Not entered' }}</strong> · Applied across all styles
            </p>
          </div>
          <button type="button" class="xl-close-btn" @click="closePoSetupModal">×</button>
        </div>

        <div class="xl-modal-body">
          <div class="xl-step">
            <label class="xl-step-title" for="modal-total-colors">1. Total Colors</label>
            <input
              id="modal-total-colors"
              :value="modalState.totalColorCount"
              type="number"
              min="1"
              max="50"
              class="excel-box-input xl-count-box"
              @input="syncColorDraftsCount($event.target.value)"
            />
          </div>

          <div class="xl-step">
            <span class="xl-step-title">2. Select Sizes</span>
            <div class="xl-size-list">
              <button
                v-for="sz in Array.from(new Set([...DEFAULT_SIZE_POOL, ...modalState.selectedSizes]))"
                :key="sz"
                type="button"
                class="xl-size-pill"
                :class="{ active: modalState.selectedSizes.includes(sz) }"
                @click="toggleModalSize(sz)"
              >
                {{ sz }}
              </button>
            </div>

            <div class="xl-custom-size-bar">
              <input
                v-model="modalState.customSizeInput"
                type="text"
                class="excel-box-input"
                placeholder="Add custom size (e.g. 4XL or 32)"
                @keydown.enter.prevent="addModalCustomSize"
              />
              <button type="button" class="xl-btn" @click="addModalCustomSize">+ Add Size</button>
            </div>
          </div>

          <div class="xl-step">
            <span class="xl-step-title">3. Assign Colors ({{ modalState.colorDrafts.length }})</span>
            <div class="xl-draft-rows">
              <div
                v-for="(draft, idx) in modalState.colorDrafts"
                :key="draft.id"
                class="xl-draft-row"
              >
                <span class="xl-draft-no">{{ idx + 1 }}</span>
                <select
                  v-model="draft.colorName"
                  class="excel-box-select"
                  @change="handleModalColorChange(draft)"
                >
                  <option value="" disabled>Select Color</option>
                  <option
                    v-for="opt in colorOptions"
                    :key="opt"
                    :value="opt"
                    :disabled="isColorTakenByOtherDraft(opt, draft.id)"
                  >
                    {{ opt }}
                  </option>
                  <option value="__CUSTOM__">+ Custom Color...</option>
                </select>

                <div v-if="draft.colorName === '__CUSTOM__'" class="xl-custom-color-inline">
                  <input
                    v-model="draft.customColorInput"
                    type="text"
                    class="excel-box-input xl-custom-color-input"
                    placeholder="Color name"
                  />
                  <button
                    type="button"
                    class="xl-btn xl-btn-green"
                    @click="saveModalCustomColor(draft)"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="modalState.errorMsg" class="xl-error">{{ modalState.errorMsg }}</div>
        </div>

        <div class="xl-modal-footer">
          <button type="button" class="xl-btn" @click="closePoSetupModal">Cancel</button>
          <button type="button" class="xl-btn xl-btn-green" @click="applyPoSetupOnce">
            Apply to All Styles
          </button>
        </div>
      </div>
    </div>
  </form>
</template>

<style scoped>
.excel-sheet-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: #e6e9ef;
  color: #111827;
  font-family: Calibri, 'Segoe UI', Arial, sans-serif;
  font-size: 13px;
}

.excel-ribbon,
.xl-meta-bar,
.xl-worksheet,
.xl-bottom-bar {
  background: #ffffff;
  border: 1px solid #b7c0cd;
}

.excel-ribbon {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}

.ribbon-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ribbon-label {
  font-weight: 700;
  color: #1f2937;
}

.req {
  color: #b91c1c;
}

.excel-box-input,
.excel-box-select {
  height: 30px;
  padding: 0 8px;
  border: 1px solid #9ca3af;
  border-radius: 2px;
  background: #ffffff;
  color: #111827;
  font-family: inherit;
  font-size: 13px;
}

.excel-box-input:focus,
.excel-box-select:focus {
  outline: 2px solid #217346;
  outline-offset: -1px;
  border-color: #217346;
}

.style-no-box {
  min-width: 200px;
}

.xl-count-box {
  width: 90px;
}

.xl-sum-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  background: #edf7f1;
  border: 1px solid #217346;
  color: #14532d;
  font-size: 13px;
}

.xl-meta-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 6px 12px;
  background: #f8fafc;
  font-size: 12px;
}

.xl-meta-key {
  font-weight: 700;
  color: #374151;
  margin-right: 6px;
}

.xl-tag {
  display: inline-block;
  padding: 1px 7px;
  margin-right: 4px;
  background: #e5e7eb;
  border: 1px solid #cbd5e1;
  color: #1f2937;
  font-size: 12px;
}

.xl-tag-color {
  background: #e6f4ea;
  border-color: #86efac;
  color: #166534;
  font-weight: 600;
}

.xl-sheet-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: #f3f4f6;
  border-bottom: 1px solid #b7c0cd;
}

.xl-sheet-tab {
  padding: 4px 10px;
  background: #217346;
  color: #ffffff;
  font-weight: 700;
  font-size: 12px;
}

.xl-subtotal {
  font-size: 13px;
  color: #111827;
  margin-right: 4px;
}

.xl-empty-grid {
  padding: 20px;
  text-align: center;
  color: #4b5563;
  background: #fafafa;
}

.xl-grid-scroll {
  width: 100%;
  overflow-x: auto;
}

.xl-table {
  width: 100%;
  border-collapse: collapse;
  background: #ffffff;
}

.xl-field-headers th {
  background: #f2f4f7;
  color: #111827;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid #bfbfbf;
  padding: 6px 8px;
  white-space: nowrap;
  user-select: none;
}

.xl-hdr-sl {
  width: 48px;
  text-align: center;
}

.xl-hdr-color {
  min-width: 160px;
  text-align: left;
}

.xl-hdr-size {
  min-width: 76px;
  text-align: center;
}

.xl-hdr-total {
  min-width: 96px;
  text-align: right;
}

.xl-table td {
  border: 1px solid #d0d7de;
  height: 30px;
  padding: 0;
  vertical-align: middle;
}

.xl-sl-cell {
  background: #f9fafb;
  color: #374151;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
}

.xl-color-cell {
  padding: 0 2px !important;
}

.xl-cell-select {
  width: 100%;
  height: 28px;
  padding: 0 6px;
  border: none;
  background: transparent;
  color: #111827;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.xl-cell-select:focus {
  outline: 2px solid #217346;
  outline-offset: -2px;
  background: #ffffff;
}

.xl-num-cell {
  background: #ffffff;
}

.xl-cell-input {
  width: 100%;
  height: 29px;
  padding: 0 8px;
  border: none;
  background: transparent;
  color: #111827;
  font-family: inherit;
  font-size: 13px;
  text-align: right;
  box-sizing: border-box;
}

.xl-cell-input:focus {
  outline: 2px solid #217346;
  outline-offset: -2px;
  background: #f0fdf4;
}

.xl-row-total-cell {
  padding: 0 10px !important;
  text-align: right;
  font-weight: 700;
  color: #111827;
  background: #f8fafc;
  white-space: nowrap;
}

.xl-total-row td {
  background: #e9edf2;
  border-top: 2px solid #8c959f;
  border-bottom: 1px solid #8c959f;
  font-weight: 700;
  color: #111827;
  height: 30px;
}

.xl-total-label {
  padding: 0 10px !important;
  text-align: right;
  font-size: 12px;
  color: #1f2937;
}

.xl-total-val {
  padding: 0 8px !important;
  text-align: right;
}

.xl-grand-val {
  padding: 0 10px !important;
  text-align: right;
  background: #d8e4dc !important;
  color: #14532d;
}

.xl-bottom-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}

.xl-bottom-info {
  font-size: 13px;
  color: #374151;
}

.xl-success-inline {
  color: #166534;
  font-weight: 700;
  margin-left: 6px;
}

.xl-error-inline {
  color: #b91c1c;
  font-weight: 700;
  margin-left: 6px;
}

.xl-btn {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #9ca3af;
  border-radius: 2px;
  background: #f9fafb;
  color: #111827;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.xl-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.xl-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.xl-btn-green {
  background: #217346;
  border-color: #185634;
  color: #ffffff;
}

.xl-btn-green:hover:not(:disabled) {
  background: #1b5e39;
}

.xl-btn-red {
  background: #fef2f2;
  border-color: #dc2626;
  color: #b91c1c;
}

.xl-btn-red:hover:not(:disabled) {
  background: #fee2e2;
}

.xl-btn-save {
  height: 34px;
  padding: 0 18px;
}

.xl-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1000;
}

.xl-modal {
  width: 100%;
  max-width: 560px;
  max-height: 88vh;
  background: #ffffff;
  border: 2px solid #217346;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.xl-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #217346;
  color: #ffffff;
}

.xl-modal-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.xl-modal-header p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #dcfce7;
}

.xl-close-btn {
  width: 26px;
  height: 26px;
  border: 1px solid #ffffff;
  background: #185634;
  color: #ffffff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.xl-modal-body {
  padding: 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.xl-step {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.xl-step-title {
  font-weight: 700;
  color: #1f2937;
}

.xl-size-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.xl-size-pill {
  padding: 4px 10px;
  border: 1px solid #9ca3af;
  background: #f9fafb;
  color: #1f2937;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.xl-size-pill.active {
  background: #217346;
  border-color: #185634;
  color: #ffffff;
}

.xl-custom-size-bar,
.xl-custom-color-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.xl-draft-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.xl-draft-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #f8fafc;
  border: 1px solid #d0d7de;
}

.xl-draft-no {
  width: 20px;
  text-align: center;
  font-weight: 700;
  color: #4b5563;
}

.excel-box-select {
  flex: 1;
  min-width: 160px;
}

.xl-custom-color-input {
  width: 130px;
}

.xl-error {
  padding: 6px 10px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;
}

.xl-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  background: #f3f4f6;
  border-top: 1px solid #d0d7de;
}
</style>