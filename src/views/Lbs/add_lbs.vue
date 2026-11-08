<template>
    <div class="excel-container">
        <!-- Header Controls & Form Grid -->
        <div class="excel-grid-form">
            <div class="form-row-grid">

                <!-- Column 1: Order / Style Selections -->
                <div class="form-column-group">
                    <div class="form-group">
                        <label title="Buyer Name">Buyer Name</label>
                        <select v-model="form.buyer" @change="onBuyerChange">
                            <option value="">-- Select buyer --</option>
                            <option v-for="b in options.buyers" :key="b" :value="b">{{ b }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label title="Po No">Po No</label>
                        <select v-model="form.po" @change="onPoChange">
                            <option value="">-- Select Po No --</option>
                            <option v-for="p in options.poNos" :key="p" :value="p">{{ p }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label title="Style/Model No">Style/Model No</label>
                        <select v-model="form.style" @change="onStyleChange">
                            <option value="">-- Select style No --</option>
                            <option v-for="s in options.styles" :key="s" :value="s">{{ s }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label title="Select Item">Select Item</label>
                        <select v-model="form.item" @change="onItemChange">
                            <option value="">-- Select Item --</option>
                            <option v-for="i in options.items" :key="i" :value="i">{{ i }}</option>
                        </select>
                    </div>
                </div>

                <!-- Column 2: Unit, Line & Manpower -->
                <div class="form-column-group">
                    <div class="form-group">
                        <label title="Unit">Unit</label>
                        <select v-model="form.unit" @change="onUnitChange">
                            <option value="">-- Select Unit --</option>
                            <option v-for="u in options.units" :key="u" :value="u">{{ u }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label title="Line">Line</label>
                        <select v-model="form.line">
                            <option value="">-- Select line --</option>
                            <option v-for="l in options.lines" :key="l" :value="l">Line {{ l }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label title="No Of Manpower">No Of Manpower</label>
                        <input type="number" :value="totalManpower" readonly class="readonly-field">
                    </div>
                    <div class="form-group">
                        <label title="OB SMV">OB SMV</label>
                        <input type="number" v-model.number="form.obSmv" readonly class="readonly-field">
                    </div>
                    <div class="form-group">
                        <label title="Cycle Time SMV">Cycle Time SMV</label>
                        <input type="number" :value="totalCtSmv" readonly class="readonly-field">
                    </div>
                </div>

                <!-- Column 3: Targets -->
                <div class="form-column-group">
                    <div class="form-group">
                        <label title="Target on Ob Smv">Target on Ob Smv</label>
                        <input type="number" :value="targetOnObSmv" readonly class="readonly-field">
                    </div>
                    <div class="form-group">
                        <label title="Target on CT Smv">Target on CT Smv</label>
                        <input type="number" :value="targetOnCtSmv" readonly class="readonly-field">
                    </div>
                    <div class="form-group">
                        <label title="Current Target /Hourly">Current Target /Hourly</label>
                        <input type="number" v-model.number="form.currentTarget">
                    </div>
                    <div class="form-group">
                        <label title="Achive/Hourly">Achive/Hourly</label>
                        <input type="number" v-model.number="form.lineAchive">
                    </div>
                </div>

                <!-- Column 4: Observation Metrics -->
                <div class="form-column-group">
                    <div class="form-group">
                        <label title="Ttl Observe">Ttl Observe</label>
                        <input type="number" :value="totalObserve" readonly class="readonly-field">
                    </div>
                    <div class="form-group">
                        <label title="Ttl CC Time(Effictive)">Ttl CC Time(Effictive)</label>
                        <input type="number" v-model.number="form.ttlCcTime">
                    </div>
                    <div class="form-group">
                        <label title="Ttl M/C Count Time">Ttl M/C Count Time</label>
                        <input type="number" v-model.number="form.ttlMcCountTime">
                    </div>
                    <div class="form-group">
                        <label title="Ttl Non M/C Count Time">Ttl Non M/C Count Time</label>
                        <input type="number" v-model.number="form.ttlNonMcCountTime">
                    </div>
                </div>

                <!-- Column 5: Efficiencies -->
                <div class="form-column-group">
                    <div class="form-group">
                        <label title="LBS Target Efficiency">LBS Target Efficiency</label>
                        <input type="text" :value="lbsTargetEfficiency + '%'" readonly class="readonly-field">
                    </div>
                    <div class="form-group">
                        <label title="Line Efficiency">Line Efficiency</label>
                        <input type="number" v-model.number="form.lineEfficiency" readonly class="readonly-field">
                    </div>
                    <div class="form-group">
                        <label title="Worker Performance">Worker Performance</label>
                        <input type="number" v-model.number="form.workerPerformance">
                    </div>
                    <div class="form-group">
                        <label title="Productivity Gap">Productivity Gap</label>
                        <input type="number" v-model.number="form.productivityGap">
                    </div>
                </div>

            </div>
        </div>

        <!-- Navigation Tabs & Group Button -->
        <div class="nav-tabs mt-2">
            <button class="tab-btn" :class="{ active: activeTab === 'sheet' }" @click="switchTab('sheet')">Line
                Balancing Sheet</button>
            <button class="tab-btn" :class="{ active: activeTab === 'graph' }" @click="switchTab('graph')">Line
                Balancing Graph</button>
            <div class="Line_info">
                <span>Line Balance ON</span>
            </div>
            <button v-if="activeTab === 'sheet'" class="btn btn-outline-primary ms-auto btn-sm" @click="addGroupRow">+
                Add Group Operation</button>
        </div>

        <!-- Tab 1: Sheet View -->
        <div v-show="activeTab === 'sheet'" class="lbstab-content" :class="{ active: activeTab === 'sheet' }">
            <div class="table-container">
                <table id="lbsTable" class="table table-bordered">
                    <thead>
                        <tr>
                            <th rowspan="2" style="width: 3%;">SL</th>
                            <th rowspan="2" style="width: 6.5%;">M/C Name</th>
                            <th rowspan="2" style="width: 6.5%;">Op Code</th>
                            <th colspan="3">Manpower</th>
                            <th rowspan="2" style="width: 10.5%;">Operation Description</th>
                            <th rowspan="2" style="width: 8.5%;">Operator Name</th>
                            <th rowspan="2" style="width: 4%;">Cap Share</th>
                            <th colspan="5">Cycle Time (Sec)</th>
                            <th rowspan="2" style="width: 4.5%;">AVG Time</th>
                            <th rowspan="2" style="width: 5%;">Cycle+Allow</th>
                            <th rowspan="2" style="width: 4.5%;">Indiv Acct</th>
                            <th rowspan="2" style="width: 4.5%;">CT SMV</th>
                            <th rowspan="2" style="width: 4.5%;">Indiv Cap</th>
                            <th rowspan="2" style="width: 4.5%;">Ttl Cap</th>
                            <th colspan="3">OB SMV</th>
                            <th colspan="2">Line Efficiency</th>
                            <th rowspan="2" style="width: 3%;">Act</th>
                        </tr>
                        <tr>
                            <th style="width: 3%;">Act</th>
                            <th style="width: 4%;">LBS</th>
                            <th style="width: 4%;">OB</th>
                            <th style="width: 3%;">1</th>
                            <th style="width: 3%;">2</th>
                            <th style="width: 3%;">3</th>
                            <th style="width: 3%;">4</th>
                            <th style="width: 3%;">5</th>
                            <th style="width: 4.5%;">OB SMV</th>
                            <th style="width: 4.5%;">OB Cap</th>
                            <th style="width: 4.5%;">OB Target</th>
                            <th style="width: 3.5%;">Indiv</th>
                            <th style="width: 3.5%;">Avg</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template v-for="(group, groupIdx) in tableGroups" :key="groupIdx">
                            <tr v-for="(row, rowIdx) in group.rows" :key="rowIdx">
                                <td v-if="rowIdx === 0" :rowspan="group.rows.length" class="text-center fw-bold">{{
                                    group.sl }}</td>
                                <td><input type="text" v-model="row.mcName"></td>
                                <td>
                                    <select v-model="row.opNo" @change="onOpCodeChange(row)">
                                        <option value="">-- Select Op No --</option>
                                        <option v-for="op in availableOpNumbers" :key="op" :value="op">{{ op }}</option>
                                    </select>
                                </td>
                                <td v-if="rowIdx === 0" :rowspan="group.rows.length" class="computed-cell text-center">
                                    {{ group.rows.length }}</td>
                                <td v-if="rowIdx === 0" :rowspan="group.rows.length"><input type="text"
                                        v-model="group.lbs" style="width:100%"></td>
                                <td v-if="rowIdx === 0" :rowspan="group.rows.length"><input type="text"
                                        v-model="group.ob" style="width:100%"></td>
                                <td v-if="rowIdx === 0" :rowspan="group.rows.length" class="computed-cell">{{
                                    getGroupOpDesc(group) }}</td>
                                <td>
                                    <select v-model="row.operatorName">
                                        <option>-- Select Operator --</option>
                                        <option>John Doe</option>
                                        <option>Jane Smith</option>
                                        <option>Alan Vance</option>
                                    </select>
                                </td>
                                <td><input type="number" v-model.number="row.capShare" min="0"></td>
                                <td><input type="number" v-model.number="row.ct1"></td>
                                <td><input type="number" v-model.number="row.ct2"></td>
                                <td><input type="number" v-model.number="row.ct3"></td>
                                <td><input type="number" v-model.number="row.ct4"></td>
                                <td><input type="number" v-model.number="row.ct5"></td>
                                <td class="computed-cell">{{ calcAvgTime(row) }}</td>
                                <td class="computed-cell">{{ calcCycleAllow(row) }}</td>
                                <td class="computed-cell">{{ calcIndivAcct(row) }}</td>
                                <td v-if="rowIdx === 0" :rowspan="group.rows.length"
                                    class="computed-cell text-primary fw-bold">{{ calcGroupAvgAcct(group) }}</td>
                                <td class="computed-cell">{{ calcIndivCapacity(row) }}</td>
                                <td v-if="rowIdx === 0" :rowspan="group.rows.length" class="computed-cell fw-bold">{{
                                    calcGroupTtlTarget(group) }}</td>
                                <td><input type="number" v-model.number="row.indivSmv" step="0.01"></td>
                                <td class="computed-cell">{{ calcIndivObCapacity(row) }}</td>
                                <td v-if="rowIdx === 0" :rowspan="group.rows.length" class="computed-cell">{{
                                    calcGroupTtlObTarget(group) }}</td>
                                <td class="computed-cell">{{ calcIndivEff(row) }}</td>
                                <td v-if="rowIdx === 0" :rowspan="group.rows.length" class="computed-cell fw-bold">{{
                                    calcGroupAvgEff(group) }}</td>
                                <td class="text-center">
                                    <button class="btn-action"
                                        :class="rowIdx === group.rows.length - 1 ? 'btn-sub' : 'btn-remove'"
                                        @click="rowIdx === group.rows.length - 1 ? addSubRow(groupIdx) : removeRow(groupIdx, rowIdx)">
                                        {{ rowIdx === group.rows.length - 1 ? '+' : '✕' }}
                                    </button>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>TOTAL</td>
                            <td colspan="2"></td>
                            <td>{{ totalManpower }}</td>
                            <td colspan="3"></td>
                            <td></td>
                            <td></td>
                            <td colspan="5"></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td class="text-primary fw-bold">{{ totalCtSmv }}</td>
                            <td></td>
                            <td class="fw-bold">{{ totalTarget }}</td>
                            <td></td>
                            <td></td>
                            <td>{{ totalObTarget }}</td>
                            <td colspan="2"></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div class="d-flex justify-content-between align-items-center mt-2 p-2 bg-light rounded">
                <div style="font-size: 11.5px;">
                    <strong>Total Manpower:</strong> {{ totalManpower }} |
                    <strong>Group Total Acct:</strong> {{ totalCtSmv }} |
                    <strong>Total Target:</strong> {{ totalTarget }}
                </div>
                <button class="btn btn-outline-primary btn-sm" :disabled="isSaving" @click="commitData">
                    {{ isSaving ? 'SAVING...' : 'Submit' }}
                </button>
            </div>
        </div>

        <!-- Tab 2: Graph View -->
        <div v-show="activeTab === 'graph'" class="lbstab-content" :class="{ active: activeTab === 'graph' }">
            <div class="graph-card">
                <div class="chart-container">
                    <canvas ref="chartCanvas"></canvas>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { dbAPI as obAPI } from '@/services/operation_breakdown_api.js';

import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(ChartDataLabels);

const activeTab = ref('sheet');
const isSaving = ref(false);
const chartCanvas = ref(null);
let chartInstance = null;

const options = reactive({
    buyers: [],
    poNos: [],
    styles: [],
    items: [],
    units: [],
    lines: []
});

const form = reactive({
    buyer: '',
    po: '',
    style: '',
    item: '',
    unit: '',
    line: '',
    obSmv: 0,
    currentTarget: 0,
    lineAchive: 0,
    ttlCcTime: 0,
    ttlMcCountTime: 0,
    ttlNonMcCountTime: 0,
    lineEfficiency: 0,
    workerPerformance: 0,
    productivityGap: 0
});

const availableOpNumbers = ref([]);
const operationsCache = ref([]);

const tableGroups = reactive([
    {
        sl: 1,
        lbs: 'LBS-1',
        ob: 'OB-A',
        rows: [
            { mcName: '', opNo: '', opDesc: '', operatorName: '-- Select Operator --', capShare: 1, ct1: 0, ct2: 0, ct3: 0, ct4: 0, ct5: 0, indivSmv: 0 }
        ]
    }
]);

// --- Computations ---
const calcAvgTime = (row) => {
    const times = [row.ct1, row.ct2, row.ct3, row.ct4, row.ct5].map(Number).filter(n => !isNaN(n) && n > 0);
    return times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2) : "0.00";
};

const calcCycleAllow = (row) => {
    const avg = parseFloat(calcAvgTime(row)) || 0;
    return avg > 0 ? (avg * 1.10).toFixed(2) : "0.00";
};

const calcIndivAcct = (row) => {
    const ca = parseFloat(calcCycleAllow(row)) || 0;
    return ca > 0 ? (ca / 60).toFixed(3) : "0.000";
};

const calcIndivCapacity = (row) => {
    const acct = parseFloat(calcIndivAcct(row)) || 0;
    const share = Number(row.capShare) || 1;
    return acct > 0 ? Math.round((60 / acct) * share) : 0;
};

const calcGroupAvgAcct = (group) => {
    if (!group.rows.length) return "0.000";
    const sum = group.rows.reduce((acc, r) => acc + (parseFloat(calcIndivAcct(r)) || 0), 0);
    return (sum / group.rows.length).toFixed(3);
};

const calcGroupTtlTarget = (group) => {
    return group.rows.reduce((sum, r) => sum + calcIndivCapacity(r), 0);
};

const calcIndivObCapacity = (row) => {
    const smv = Number(row.indivSmv) || 0;
    const share = Number(row.capShare) || 1;
    return smv > 0 ? Math.round((60 / smv) * share) : 0;
};

const calcGroupTtlObTarget = (group) => {
    return group.rows.reduce((sum, r) => sum + calcIndivObCapacity(r), 0);
};

const calcIndivEff = (row) => {
    const acct = parseFloat(calcIndivAcct(row)) || 0;
    const smv = Number(row.indivSmv) || 0;
    return (smv > 0 && acct > 0) ? Math.round((smv / acct) * 100) + '%' : '0%';
};

const calcGroupAvgEff = (group) => {
    if (!group.rows.length) return '0%';
    const sum = group.rows.reduce((acc, r) => {
        const acct = parseFloat(calcIndivAcct(r)) || 0;
        const smv = Number(r.indivSmv) || 0;
        return acc + ((smv > 0 && acct > 0) ? (smv / acct) * 100 : 0);
    }, 0);
    return Math.round(sum / group.rows.length) + '%';
};

const getGroupOpDesc = (group) => {
    return [...new Set(group.rows.map(r => r.opDesc).filter(Boolean))].join(', ');
};

const totalManpower = computed(() => {
    return tableGroups.reduce((acc, g) => acc + g.rows.filter(r => r.operatorName && r.operatorName !== '-- Select Operator --').length, 0);
});

const totalCtSmv = computed(() => {
    const sum = tableGroups.reduce((acc, g) => acc + parseFloat(calcGroupAvgAcct(g)), 0);
    return sum.toFixed(3);
});

const totalTarget = computed(() => {
    return tableGroups.reduce((acc, g) => acc + calcGroupTtlTarget(g), 0);
});

const totalObTarget = computed(() => {
    return tableGroups.reduce((acc, g) => acc + calcGroupTtlObTarget(g), 0);
});

const totalObserve = computed(() => {
    let total = 0;
    tableGroups.forEach(g => g.rows.forEach(r => {
        total += Number(r.ct1 || 0) + Number(r.ct2 || 0) + Number(r.ct3 || 0) + Number(r.ct4 || 0) + Number(r.ct5 || 0);
    }));
    return total;
});

const targetOnObSmv = computed(() => {
    return (totalManpower.value > 0 && form.obSmv > 0) ? Math.round((totalManpower.value * 60) / form.obSmv) : 0;
});

const targetOnCtSmv = computed(() => {
    const ct = parseFloat(totalCtSmv.value) || 0;
    return (totalManpower.value > 0 && ct > 0) ? Math.round((totalManpower.value * 60) / ct) : 0;
});

const lbsTargetEfficiency = computed(() => {
    return targetOnCtSmv.value > 0 ? ((targetOnObSmv.value / targetOnCtSmv.value) * 100).toFixed(2) : 0;
});

// --- Dynamic API Cascading Integration using obAPI ---
const fetchInitialBuyers = async () => {
    try {
        const res = await obAPI.getBuyers();
        options.buyers = Array.isArray(res) ? res : res?.data || res?.buyers || [];
    } catch (err) {
        console.error("Error fetching buyers:", err);
    }
};

const onBuyerChange = async () => {
    form.po = ''; form.style = ''; form.item = '';
    options.poNos = []; options.styles = []; options.items = [];
    availableOpNumbers.value = []; operationsCache.value = [];

    if (!form.buyer) return;

    try {
        const res = await obAPI.getPoNumbers({ buyer: form.buyer });
        options.poNos = Array.isArray(res) ? res : res?.data || res?.poNos || [];
    } catch (err) {
        console.error("Error fetching PO numbers:", err);
    }
};

const onPoChange = async () => {
    form.style = ''; form.item = '';
    options.styles = []; options.items = [];
    availableOpNumbers.value = []; operationsCache.value = [];

    if (!form.buyer || !form.po) return;

    try {
        const res = await obAPI.getStyles({ buyer: form.buyer, po: form.po });
        options.styles = Array.isArray(res) ? res : res?.data || res?.styles || [];
    } catch (err) {
        console.error("Error fetching styles:", err);
    }
};

const onStyleChange = async () => {
    form.item = '';
    options.items = [];
    availableOpNumbers.value = []; operationsCache.value = [];

    if (!form.buyer || !form.po || !form.style) return;

    try {
        const res = await obAPI.getItems({ buyer: form.buyer, po: form.po, style: form.style });
        options.items = Array.isArray(res) ? res : res?.data || res?.items || [];
    } catch (err) {
        console.error("Error fetching items:", err);
    }
};

const onItemChange = async () => {
    if (form.buyer && form.po && form.style && form.item) {
        await fetchOperationsAndSmv();
    }
};

const fetchOperationsAndSmv = async () => {
    try {
        const [opsRes, smvRes] = await Promise.all([
            obAPI.getOperationsBreakdown({ buyer: form.buyer, po: form.po, style: form.style, item: form.item }),
            obAPI.getObTotalSmv({ buyer: form.buyer, po: form.po, style: form.style, item: form.item })
        ]);

        const ops = Array.isArray(opsRes) ? opsRes : opsRes?.data || opsRes?.operations || [];
        operationsCache.value = ops;
        availableOpNumbers.value = [...new Set(ops.map(o => o.opNo || o.op_no || o.opCode))].filter(Boolean);

        form.obSmv = Number(smvRes?.totalSmv || smvRes?.smv || smvRes || 0);
    } catch (err) {
        console.error("Error fetching operations or OB SMV:", err);
    }
};

const onUnitChange = async () => {
    form.line = '';
    if (!form.unit) return;

    try {
        const res = await obAPI.getLinesByUnit({ unit: form.unit });
        options.lines = Array.isArray(res) ? res : res?.data || res?.lines || [];
    } catch (err) {
        console.error("Error fetching lines:", err);
    }
};

// --- Operation selection auto-populate ---
const onOpCodeChange = (row) => {
    const matched = operationsCache.value.find(o => (o.opNo || o.op_no || o.opCode) === row.opNo);
    if (matched) {
        row.opDesc = matched.opDesc || matched.op_desc || matched.name || '';
        row.mcName = matched.mcName || matched.mc_name || matched.machine || '';
        row.indivSmv = Number(matched.smv || matched.indivSmv || 0);
    } else {
        row.opDesc = ''; row.mcName = ''; row.indivSmv = 0;
    }
};

// --- Graph Execution & Render ---
const switchTab = (tab) => {
    activeTab.value = tab;
    if (tab === 'graph') {
        nextTick(() => {
            renderGraph();
            if (chartInstance) {
                chartInstance.resize();
            }
        });
    }
};

const renderGraph = () => {
    if (!chartCanvas.value) return;

    const labels = tableGroups.map(g => `SL ${g.sl}: ${getGroupOpDesc(g) || 'Operation'} (${g.rows.length} MP)`);
    const targetData = tableGroups.map(g => calcGroupTtlTarget(g));
    const smvData = tableGroups.map(g => (parseFloat(calcGroupAvgAcct(g)) * 60).toFixed(1));

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(chartCanvas.value, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Target Output (Pcs/hr)',
                    data: targetData,
                    borderColor: '#0d6efd',
                    backgroundColor: '#0d6efd',
                    borderWidth: 2,
                    tension: 0.2,
                    yAxisID: 'y',
                    datalabels: {
                        align: 'top',
                        anchor: 'end',
                        color: '#0d6efd',
                        font: { weight: 'bold', size: 10 },
                        formatter: (val) => val > 0 ? `${val} pcs` : ''
                    }
                },
                {
                    type: 'bar',
                    label: 'Pitch / Cycle Time (Sec)',
                    data: smvData,
                    backgroundColor: 'rgba(220, 53, 69, 0.45)',
                    borderColor: '#dc3545',
                    borderWidth: 1,
                    yAxisID: 'y1',
                    datalabels: {
                        align: 'center',
                        anchor: 'center',
                        color: '#900',
                        font: { size: 9 },
                        formatter: (val) => val > 0 ? `${val}s` : ''
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 11, weight: '600' } }
                },
                tooltip: {
                    padding: 8,
                    bodyFont: { size: 11 }
                }
            },
            scales: {
                x: {
                    ticks: { font: { size: 10 } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Pcs / Hour', font: { size: 10, weight: 'bold' } },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Cycle Time (Sec)', font: { size: 10, weight: 'bold' } },
                    grid: { drawOnChartArea: false },
                    beginAtZero: true
                }
            }
        }
    });
};

watch(tableGroups, () => {
    if (activeTab.value === 'graph') {
        renderGraph();
    }
}, { deep: true });

onUnmounted(() => {
    if (chartInstance) {
        chartInstance.destroy();
    }
});

// --- Table Handlers ---
const addGroupRow = () => {
    tableGroups.push({
        sl: tableGroups.length + 1,
        lbs: `LBS-${tableGroups.length + 1}`,
        ob: 'OB-A',
        rows: [{ mcName: '', opNo: '', opDesc: '', operatorName: '-- Select Operator --', capShare: 1, ct1: 0, ct2: 0, ct3: 0, ct4: 0, ct5: 0, indivSmv: 0 }]
    });
};

const addSubRow = (groupIdx) => {
    tableGroups[groupIdx].rows.push({ mcName: '', opNo: '', opDesc: '', operatorName: '-- Select Operator --', capShare: 1, ct1: 0, ct2: 0, ct3: 0, ct4: 0, ct5: 0, indivSmv: 0 });
};

const removeRow = (groupIdx, rowIdx) => {
    if (tableGroups[groupIdx].rows.length > 1) {
        tableGroups[groupIdx].rows.splice(rowIdx, 1);
    } else {
        tableGroups.splice(groupIdx, 1);
        tableGroups.forEach((g, idx) => g.sl = idx + 1);
    }
};

const commitData = async () => {
    isSaving.value = true;
    const payload = { ...form, totalManpower: totalManpower.value, totalTarget: totalTarget.value, operations: tableGroups };

    try {
        const res = await obAPI.saveLbsData(payload);
        alert(res?.message || 'Saved successfully!');
    } catch (err) {
        alert('Error saving data: ' + err.message);
    } finally {
        isSaving.value = false;
    }
};

onMounted(() => {
    fetchInitialBuyers();
});
</script>

<style scoped>
.excel-container {
    width: 100%;
    max-width: 100vw;
    padding: 5px 10px;
    box-sizing: border-box;
    overflow-x: hidden;
}

.table-container {
    max-height: 420px;
    overflow-y: auto;
    overflow-x: auto;
    position: relative;
    border: 1px solid #dee2e6;
    width: 100%;
}

#lbsTable thead th {
    position: sticky;
    top: 0;
    background-color: #f2f2f2;
    z-index: 10;
    text-align: center;
    font-weight: 600;
    font-size: 10.5px;
}

.lbstab-content {
    display: none;
}

.lbstab-content.active {
    display: block !important;
}

.nav-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 4px;
    border-bottom: 2px solid #dee2e6;
    align-items: center;
}

.tab-btn {
    padding: 5px 10px;
    border: 1px solid #ced4da;
    border-bottom: none;
    background-color: #f8f9fa;
    cursor: pointer;
    font-weight: 600;
    border-radius: 4px 4px 0 0;
    font-size: 12px;
}

.tab-btn.active {
    background-color: #ffffff;
    border-color: #0d6efd #0d6efd #ffffff #0d6efd;
    color: #0d6efd;
}

.graph-card {
    height: 420px;
    position: relative;
    width: 100%;
    background: #ffffff;
    border: 1px solid #dee2e6;
    padding: 10px;
    box-sizing: border-box;
}

.chart-container {
    position: relative;
    height: 100%;
    width: 100%;
}

.excel-grid-form .form-row-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 8px;
}

.form-column-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.excel-grid-form .form-group {
    display: flex;
    align-items: stretch;
    height: 26px;
}

.excel-grid-form .form-group label {
    font-weight: 600;
    width: 48%;
    font-size: 11px;
    background-color: #f8f9fa;
    padding: 3px 5px;
    border: 1px solid #ced4da;
    border-right: none;
    border-radius: 3px 0 0 3px;
    display: flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.excel-grid-form .form-group select,
.excel-grid-form .form-group input {
    width: 52%;
    height: 26px;
    font-size: 11px;
    padding: 2px 3px;
    border: 1px solid #ced4da;
    border-radius: 0 3px 3px 0;
}

.readonly-field {
    background-color: #f9f9f9;
    color: #6c757d;
}

.Line_info {
    display: flex;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    color: #495057;
    margin-left: 8px;
}

#lbsTable {
    border-collapse: collapse;
    width: 100%;
    table-layout: fixed;
    font-size: 10.5px;
}

#lbsTable th,
#lbsTable td {
    border: 1px solid #c0c0c0 !important;
    padding: 1px !important;
    vertical-align: middle;
    height: 24px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

#lbsTable tbody tr:hover {
    background-color: #f1f3f5;
}

#lbsTable input,
#lbsTable select {
    width: 100%;
    height: 100%;
    border: none !important;
    background: transparent !important;
    padding: 0 2px !important;
    font-size: 10.5px;
    outline: none;
}

#lbsTable input:focus,
#lbsTable select:focus {
    background: #ffffff !important;
    box-shadow: inset 0 0 0 2px #0d6efd !important;
}

.computed-cell {
    background-color: #f9f9f9;
    text-align: center;
    font-weight: 500;
}

.btn-action {
    border: none;
    background: transparent;
    width: 100%;
    height: 100%;
    font-weight: bold;
    line-height: 24px;
}

.btn-remove {
    color: #dc3545;
}

.btn-remove:hover {
    background-color: #dc3545;
    color: #ffffff;
}

.btn-sub {
    color: #0d6efd;
}

.btn-sub:hover {
    background-color: #0d6efd;
    color: #ffffff;
}
</style>