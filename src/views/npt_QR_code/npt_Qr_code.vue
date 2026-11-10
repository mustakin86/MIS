<template>
    <div
        class="min-h-screen bg-gradient-to-br from-slate-100 via-slate-100/50 to-slate-200/40 font-sans antialiased qr-dashboard">
        <!-- Main Wrapper -->
        <div class="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

            <!-- Header Section / Form & Preview Card Side-by-Side -->
            <header
                class="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 no-print transition-all">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                    <!-- Left Side: Form Inputs (col-span-8) -->
                    <div class="lg:col-span-8 space-y-5">
                        <div class="border-b border-slate-100 pb-4 flex items-center justify-between">
                            <div class="flex items-center gap-2.5">
                                <div
                                    class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                                    ➕</div>
                                <div>
                                    <h3 class="text-sm font-bold text-slate-900 tracking-tight uppercase">Add QR Code
                                        Entry</h3>
                                    <p class="text-[11px] text-slate-400 font-medium">Automatic row insertion into
                                        active database</p>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label
                                    class="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Prefix
                                    / Name</label>
                                <input type="text" v-model="newTable.name"
                                    placeholder="e.g. Production Line 2 - Table A"
                                    class="w-full px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition shadow-2xs" />
                            </div>

                            <div>
                                <label
                                    class="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">QR
                                    Code</label>
                                <input type="text" v-model="newTable.code" placeholder="e.g. PL2-TA"
                                    class="w-full px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition font-mono shadow-2xs" />
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label
                                    class="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Department</label>
                                <select v-model="newTable.department"
                                    class="w-full px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-2xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition cursor-pointer shadow-2xs">
                                    <option value="Production">Production</option>
                                    <option value="Cutting Area">Cutting Area</option>
                                </select>
                            </div>
                        </div>

                        <div class="pt-2">
                            <button @click="handleAddTableSubmit"
                                class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-2">
                                <span>🚀</span> Add QR Code Row
                            </button>
                        </div>
                    </div>

                    <!-- Right Side: Live QR Code Preview Card (col-span-4) -->
                    <div
                        class="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50/90 to-slate-100/50 border border-slate-200/90 rounded-2xl shadow-xs text-center">
                        <div
                            class="w-full flex items-center justify-between text-xs font-bold text-slate-500 mb-4 px-1">
                            <span class="tracking-wider uppercase text-[11px]">Preview Row</span>
                            <span
                                class="text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-semibold shadow-2xs">{{
                                    newTable.line || 'Line 1' }}</span>
                        </div>

                        <div
                            class="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center justify-center my-1 transition-transform hover:scale-102">
                            <QRCodeVue :value="`${newTable.name || 'Prefix'} - ${newTable.code || 'Code'}`" :size="120"
                                level="H" />
                        </div>

                        <div class="mt-3 px-3.5 py-1.5 bg-white border border-slate-200/80 rounded-full shadow-2xs">
                            <span class="text-xs text-slate-700 font-mono font-bold tracking-wide">
                                ID: {{ newTable.name || '---' }} - {{ newTable.code || '---' }}
                            </span>
                        </div>
                    </div>

                </div>
            </header>

            <!-- Search & Filters Toolbar -->
            <div
                class="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 no-print">
                <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <select v-model="selectedDept"
                        class="px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer shadow-2xs">
                        <option value="">All Departments</option>
                        <option value="Production">Production</option>
                        <option value="Cutting Area">Cutting Area</option>
                    </select>

                    <select v-model="selectedLine"
                        class="px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer shadow-2xs">
                        <option value="">All Lines</option>
                        <option value="Line 1">Line 1</option>
                        <option value="Line 2">Line 2</option>
                    </select>
                </div>

                <button @click="handleExportAll"
                    class="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold tracking-wide transition cursor-pointer flex items-center gap-2 shadow-2xs">
                    <span>🖨️</span> Print Sheet
                </button>
            </div>

            <!-- Spreadsheet Data Table Section -->
            <section class="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr
                                class="bg-slate-50/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                                <th class="py-3.5 px-5 border-r border-slate-200 w-16 text-center">#</th>
                                <th class="py-3.5 px-5 border-r border-slate-200">Prefix / Name</th>
                                <th class="py-3.5 px-5 border-r border-slate-200 w-40">QR Code</th>
                                <th class="py-3.5 px-5 border-r border-slate-200 w-36">Department</th>
                                <th class="py-3.5 px-5 border-r border-slate-200 w-32">Line</th>
                                <th class="py-3.5 px-5 border-r border-slate-200 w-36 text-center">QR Thumbnail</th>
                                <th class="py-3.5 px-5 w-24 text-center no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 text-xs text-slate-800">
                            <tr v-for="(item, index) in filteredTables" :key="item.id"
                                class="hover:bg-emerald-50/50 transition-colors group">
                                <td
                                    class="py-3.5 px-5 border-r border-slate-100 text-center font-mono text-slate-400 bg-slate-50/40">
                                    {{ index + 1 }}</td>
                                <td class="py-3.5 px-5 border-r border-slate-100 font-semibold text-slate-900">{{
                                    item.name }}</td>
                                <td
                                    class="py-3.5 px-5 border-r border-slate-100 font-mono text-emerald-800 font-bold bg-slate-50/30">
                                    {{ item.code }}</td>
                                <td class="py-3.5 px-5 border-r border-slate-100 text-slate-600 font-medium">{{
                                    item.department }}</td>
                                <td class="py-3.5 px-5 border-r border-slate-100 text-slate-600 font-medium">{{
                                    item.line }}</td>
                                <td class="py-3.5 px-5 border-r border-slate-100 text-center bg-white">
                                    <div
                                        class="inline-block p-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                                        <QRCodeVue :value="item.code" :size="56" level="H" />
                                    </div>
                                </td>
                                <td class="py-3.5 px-5 text-center no-print">
                                    <button @click="removeItem(item.id)" title="Delete Row"
                                        class="w-8 h-8 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 font-bold inline-flex items-center justify-center transition cursor-pointer">
                                        ✕
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Empty State -->
                <div v-if="filteredTables.length === 0" class="p-20 text-center space-y-2 no-print bg-white">
                    <div class="text-4xl">📭</div>
                    <p class="text-slate-700 font-semibold text-sm">No matching spreadsheet rows found</p>
                    <p class="text-slate-400 text-xs">Try modifying your search or filter values.</p>
                </div>

                <div
                    class="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center font-medium">
                    <span>Ready</span>
                    <span>Grid View Active</span>
                </div>
            </section>

        </div>
    </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import QRCodeVue from 'qrcode.vue';

// Sample initial dataset
const tables = ref([
    { id: '1', department: 'Production', line: 'Line 1', name: 'Production Line 1 - Table A', code: 'PL1-TA' },
    { id: '2', department: 'Production', line: 'Line 1', name: 'Production Line 1 - Table B', code: 'PL1-TB' },
    { id: '3', department: 'Production', line: 'Line 1', name: 'Production Line 1 - Table C', code: 'PL1-TC' },
    { id: '4', department: 'Cutting Area', line: 'Line 2', name: 'Cutting Area - Table C', code: 'CA-TC1' },
    { id: '5', department: 'Cutting Area', line: 'Line 2', name: 'Cutting Area - Table C', code: 'CA-TC2' },
    { id: '6', department: 'Cutting Area', line: 'Line 2', name: 'Cutting Area - Table F', code: 'CA-TF' },
]);

const searchQuery = ref('');
const selectedDept = ref('');
const selectedLine = ref('');

// Live Preview Form State
const newTable = reactive({
    name: '',
    code: '',
    department: 'Production',
    line: 'Line 1'
});

// Computed filtering
const filteredTables = computed(() => {
    return tables.value.filter((table) => {
        const matchesSearch =
            table.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            table.code.toLowerCase().includes(searchQuery.value.toLowerCase());
        const matchesDept = selectedDept.value ? table.department === selectedDept.value : true;
        const matchesLine = selectedLine.value ? table.line === selectedLine.value : true;
        return matchesSearch && matchesDept && matchesLine;
    });
});

// Print handler
const handleExportAll = () => {
    window.print();
};

// Remove spreadsheet row item
const removeItem = (id) => {
    tables.value = tables.value.filter(item => item.id !== id);
};

// Form submission handler
const handleAddTableSubmit = () => {
    if (!newTable.name.trim()) {
        alert('Please enter a table name / prefix.');
        return;
    }

    tables.value.unshift({
        id: Date.now().toString(),
        department: newTable.department,
        line: newTable.line,
        name: newTable.name,
        code: newTable.code || newTable.name
    });

    // Reset input fields
    newTable.name = '';
    newTable.code = '';
};
</script>

<style scoped>
/* Print Styles Optimization for Spreadsheet */
@media print {
    .no-print {
        display: none !important;
    }

    .qr-dashboard {
        background: white !important;
        min-height: auto !important;
        padding: 0 !important;
    }

    table {
        border: 1px solid #000 !important;
        width: 100% !important;
    }

    th,
    td {
        border: 1px solid #cbd5e1 !important;
        padding: 6px 8px !important;
    }
}
</style>